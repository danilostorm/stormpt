#!/usr/bin/env python3
"""Read genuine StormPT 'SMD Model data Ver 0.62' static mesh and export GLB.
Source: smOBJ3D, smPAT3D, smVERTEX, smFACE, smTEXLINK 32-bit layout.
Does not invent characters: pose/animation rig still require faithful smPAT3D port.
"""
import struct,json,math,sys
from pathlib import Path
from array import array
from collections import defaultdict
from stage_glb import glb as glb_common
import stage_glb as stage

HEADER_SIZE=556
OBJECT_INFO_SIZE=40
OBJECT_STRUCT_SIZE=2236
VERTEX_SIZE=24
FACE_SIZE=36
TEX_SIZE=32
MAX_TOTAL_FACES=1_000_000
def rd(fmt,b,p):return struct.unpack_from(fmt,b,p)

def inspect_model(data):
 if len(data)<HEADER_SIZE or data[:24]!=b'SMD Model data Ver 0.62\0':
  raise ValueError('Not the original 0.62 SMD model format')
 nobj,nmat,matpos,objpos,_=rd('<5i',data,24)
 if not 1<=nobj<=128 or not 0<=nmat<=8000:
  raise ValueError('Impossible model counts')
 if matpos!=HEADER_SIZE+nobj*OBJECT_INFO_SIZE or not matpos<=objpos<len(data):
  raise ValueError('Invalid model header offsets')
 infos=[]
 prev=objpos;total_faces=0;used=set()
 for k in range(nobj):
  item=HEADER_SIZE+k*40
  name=data[item:item+32].split(b'\0')[0].decode('cp1252','replace')
  length,offset=rd('<ii',data,item+32)
  if length<OBJECT_STRUCT_SIZE or offset!=prev or offset+length>len(data):
   raise ValueError('Bad object offsets')
  if rd('<I',data,offset)[0]!=0xc1424344:raise ValueError('Invalid original OBJ magic')
  nv,nf,nt=rd('<3i',data,offset+84)
  has_phys=bool(rd('<I',data,offset+16)[0])
  if min(nv,nf,nt)<0 or max(nv,nf,nt)>MAX_TOTAL_FACES:
   raise ValueError('Invalid OBJ counts')
  vo=offset+OBJECT_STRUCT_SIZE
  fo=vo+nv*VERTEX_SIZE
  to=fo+nf*FACE_SIZE
  aend=to+nt*TEX_SIZE
  pend=offset+length
  skinbytes=nv*32 if has_phys else 0
  animationbytes=pend-aend-skinbytes
  if animationbytes<0:raise ValueError('Short OBJ records')
  # Original pointers are not valid in this process; translate relative to old TexLink.
  oldtex=rd('<I',data,offset+12)[0]
  if not oldtex and nf:raise ValueError('Missing original texture base')
  used.update([name]);total_faces+=nf
  prev=offset+length
  infos.append(dict(name=name,objectIndex=k,offset=offset,length=length,
    vertices=nv,faces=nf,texLinks=nt,vo=vo,fo=fo,to=to,oldtex=oldtex,
    physique=has_phys,animationBytes=animationbytes,vertexSkinNames=aend+animationbytes))
 if prev!=len(data):raise ValueError('Unknown trailing model bytes')
 if total_faces>MAX_TOTAL_FACES:raise ValueError('Face count too high')
 return {'objects':infos,'materials':nmat,'materialOffset':matpos,'materialEnd':objpos,'totalFaces':total_faces}

def geometry(data):
 info=inspect_model(data)
 result=defaultdict(lambda:dict(positions=[],uv=[],normals=[],colors=[],indices=[],lookup={}))
 for obj in info['objects']:
  nvert=obj['vertices'];vo=obj['vo'];fo=obj['fo'];to=obj['to'];nt=obj['texLinks']
  for f in range(obj['faces']):
   off=fo+f*FACE_SIZE
   a,b,c,mat=rd('<4H',data,off)
   if mat>=info['materials'] or max(a,b,c)>=nvert:raise ValueError('Invalid material/vertex')
   ptr=rd('<I',data,off+32)[0]
   if ptr:
    delta=ptr-obj['oldtex']
    if delta<0 or delta%TEX_SIZE or delta//TEX_SIZE>=nt:raise ValueError('Bad TexLink pointer')
    values=rd('<6f',data,to+delta)
    if not all(math.isfinite(q) and abs(q)<10000 for q in values):raise ValueError('Bad UV floats')
    uv=tuple(zip(values[:3],values[3:]))
   else:uv=((0,0),)*3
   g=result[(obj['objectIndex'],mat)];tri=[]
   for vert,(u,v) in zip((a,b,c),uv):
    key=(vert,u,v)
    if key not in g['lookup']:
     ni=len(g['positions'])//3;g['lookup'][key]=ni
     xyz=rd('<3i',data,vo+vert*VERTEX_SIZE)
     g['positions'].extend(q/256 for q in xyz)
     g['uv'].extend((u,1-v))
     g['normals'].extend((0,0,0))
     g['colors'].extend((255,255,255,255))
    tri.append(g['lookup'][key])
   g['indices'].extend(tri)
   v0,v1,v2=(g['positions'][3*t:3*t+3] for t in tri)
   xa,ya,za=(v1[i]-v0[i] for i in range(3))
   xb,yb,zb=(v2[i]-v0[i] for i in range(3))
   nx,ny,nz=ya*zb-za*yb,za*xb-xa*zb,xa*yb-ya*xb
   for t in tri:
    for j,value in enumerate((nx,ny,nz)):g['normals'][3*t+j]+=value
 for g in result.values():
  n=g['normals']
  for i in range(0,len(n),3):
   length=math.hypot(*n[i:i+3])
   n[i:i+3]=([v/length for v in n[i:i+3]] if length>1e-15 else [0,1,0])
  del g['lookup']
 assert sum(len(g['indices'])//3 for g in result.values())==info['totalFaces']
 return info,result

def export(data):
 info,groups=geometry(data)
 doc={'asset':{'version':'2.0','generator':'StormPT real SMD Model 0.62'},'scene':0,
 'scenes':[{'nodes':list(range(len(info['objects'])))}],
 'nodes':[], 'meshes':[], 'materials':[], 'buffers':[{'byteLength':0}],
 'bufferViews':[],'accessors':[],
 'extras':{'sourceModelVersion':'0.62','originalFaces':info['totalFaces'],
           'originalObjectNames':[o['name'] for o in info['objects']], 'skinningConverted':False}}
 for obj in info['objects']:
  doc['nodes'].append({'mesh':obj['objectIndex'],'name':obj['name']})
  doc['meshes'].append({'primitives':[],'name':obj['name']})
 raw=bytearray()
 def accessor(values,kind,ctype,target,normalized=False,bounds=False):
  stride={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[kind]
  letters={5126:'f',5125:'I',5121:'B'}
  arr=array(letters[ctype],values)
  if sys.byteorder!='little' and ctype!=5121:arr.byteswap()
  offset=len(raw);chunk=arr.tobytes();raw.extend(chunk)
  while len(raw)%4:raw.append(0)
  view=len(doc['bufferViews'])
  doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(chunk),'target':target})
  desc={'bufferView':view,'componentType':ctype,'count':len(values)//stride,'type':kind}
  if normalized:desc['normalized']=True
  if bounds and values:
   desc['min']=[min(values[j::stride]) for j in range(stride)]
   desc['max']=[max(values[j::stride]) for j in range(stride)]
  k=len(doc['accessors']);doc['accessors'].append(desc);return k
 for (idx,mat),g in sorted(groups.items()):
  mi=len(doc['materials'])
  doc['materials'].append({'name':f'Original material {mat}', 'doubleSided':True,
   'pbrMetallicRoughness':{'metallicFactor':0,'roughnessFactor':1},
   'extras':{'originalMaterialIndex':mat,'originalObjectIndex':idx}})
  attrs={'POSITION':accessor(g['positions'],'VEC3',5126,34962,bounds=True),
    'NORMAL':accessor(g['normals'],'VEC3',5126,34962),
    'TEXCOORD_0':accessor(g['uv'],'VEC2',5126,34962),
    'COLOR_0':accessor(g['colors'],'VEC4',5121,34962,normalized=True)}
  indices=accessor(g['indices'],'SCALAR',5125,34963)
  doc['meshes'][idx]['primitives'].append({'attributes':attrs,'indices':indices,'material':mi,'mode':4})
 doc['buffers'][0]['byteLength']=len(raw)
 js=json.dumps(doc,separators=(',',':')).encode()
 js+=b' '*(-len(js)%4)
 total=12+8+len(js)+8+len(raw)
 buffer=struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(raw),0x004e4942)+raw
 return buffer,dict(objects=len(info['objects']),materials=info['materials'],
   faces=info['totalFaces'],meshPrimitives=len(groups),animationConverted=False,
   skinningConverted=False,objectNames=[x['name'] for x in info['objects']])
if __name__=='__main__':
 import argparse
 ap=argparse.ArgumentParser()
 ap.add_argument('source',type=Path)
 ap.add_argument('output',type=Path)
 a=ap.parse_args()
 buf,stats=export(a.source.read_bytes())
 a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_bytes(buf)
 print(json.dumps(stats,indent=2))
