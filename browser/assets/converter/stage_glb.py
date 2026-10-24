#!/usr/bin/env python3
"""Convert original StormPT SMD Stage 0.72 to glTF GLB, preserving geometry and UVs.
Original layout: SrcGame/src/smLib3d/smStage3d.{h,cpp}, smType.h.
No generated map data or account access. Textures are not yet converted.
"""
from collections import defaultdict
from array import array
from pathlib import Path
import struct,json,math,sys,argparse
HDR,STAGE,VERT,FACE,TEX=556,262260,28,28,32
def unpack(fmt,b,o):return struct.unpack_from(fmt,b,o)
def parse(data):
 if len(data)<HDR+STAGE or not data.startswith(b'SMD Stage data Ver 0.72'):
  raise ValueError('not SMD Stage 0.72')
 materials,material_start,obj=unpack('<3i',data,28)
 if material_start!=HDR or materials<1 or materials>100000:raise ValueError('bad materials')
 nv,nf,nt,nl=unpack('<4i',data,HDR+262196)
 if min(nv,nf,nt,nl)<0 or max(nv,nf)>3_000_000 or nt>12_000_000:raise ValueError('bad counts')
 ov=obj+STAGE; of=ov+nv*VERT;ot=of+nf*FACE
 if ov<HDR+STAGE or ot+nt*TEX>len(data):raise ValueError('truncated SMD')
 oldtex=unpack('<I',data,HDR+262176)[0]
 return dict(materials=materials,nv=nv,nf=nf,nt=nt,nl=nl,ov=ov,of=of,ot=ot,oldtex=oldtex)
def geometry(data,scale=1/256):
 p=parse(data)
 groups=defaultdict(lambda:dict(positions=[],uv=[],normals=[],colors=[],indices=[],lookup={}))
 for faceid in range(p['nf']):
  off=p['of']+faceid*FACE
  a,b,c,material=unpack('<4H',data,off+8)
  # Original Direct3D clockwise faces -> glTF/WebGL counter-clockwise.
  b,c=c,b
  texptr=unpack('<I',data,off+16)[0]
  if max(a,b,c)>=p['nv'] or material>=p['materials']:raise ValueError('invalid face index')
  if texptr:
   delta=texptr-p['oldtex']
   if delta<0 or delta%TEX or delta//TEX>=p['nt']:raise ValueError('invalid tex link')
   u0,u1,u2,v0,v1,v2=unpack('<6f',data,p['ot']+delta)
   if not all(math.isfinite(x) and abs(x)<1e6 for x in (u0,u1,u2,v0,v1,v2)):raise ValueError('bad UV')
   uv=((u0,v0),(u2,v2),(u1,v1))
  else:uv=((0,0),)*3
  g=groups[material];tri=[]
  for idx,(u,v) in zip((a,b,c),uv):
   key=(idx,u,v)
   if key not in g['lookup']:
    vi=len(g['positions'])//3
    g['lookup'][key]=vi
    x,y,z=unpack('<3i',data,p['ov']+idx*VERT+8)
    rgba=unpack('<4h',data,p['ov']+idx*VERT+20)
    g['positions'].extend((x*scale,y*scale,z*scale))
    g['uv'].extend((u,1-v))
    g['colors'].extend(max(0,min(255,q)) for q in rgba)
    g['normals'].extend((0,0,0))
   tri.append(g['lookup'][key])
  g['indices'].extend(tri)
  q=g['positions'];i,j,k=tri
  v1=[q[3*j+t]-q[3*i+t] for t in range(3)]
  v2=[q[3*k+t]-q[3*i+t] for t in range(3)]
  nx=v1[1]*v2[2]-v1[2]*v2[1]
  ny=v1[2]*v2[0]-v1[0]*v2[2]
  nz=v1[0]*v2[1]-v1[1]*v2[0]
  for t in tri:
   g['normals'][3*t]+=nx;g['normals'][3*t+1]+=ny;g['normals'][3*t+2]+=nz
 for g in groups.values():
  n=g['normals']
  for i in range(0,len(n),3):
   m=math.hypot(n[i],n[i+1],n[i+2])
   if m>1e-15:n[i]/=m;n[i+1]/=m;n[i+2]/=m
   else:n[i:i+3]=[0,1,0]
  del g['lookup']
 return p,groups
def glb(data):
 p,groups=geometry(data)
 doc={'asset':{'version':'2.0','generator':'StormPT real SMD Stage 0.72'},'scene':0,
      'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':'StormPT AncientW genuine stage geometry'}],
      'meshes':[{'primitives':[]}],'buffers':[{'byteLength':0}],'bufferViews':[],
      'accessors':[],'materials':[],'extras':{'originalFaces':p['nf'],'originalMaterials':p['materials'],'texturesConverted':False}}
 blob=bytearray()
 def acc(values,typ,component,target,normalized=False,bounds=False):
  width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[typ]
  fmt={5126:'f',5125:'I',5121:'B'}[component]
  arr=array(fmt,values)
  if sys.byteorder!='little' and component!=5121:arr.byteswap()
  off=len(blob);raw=arr.tobytes();blob.extend(raw)
  while len(blob)%4:blob.append(0)
  view=len(doc['bufferViews'])
  doc['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(raw),'target':target})
  a={'bufferView':view,'componentType':component,'count':len(values)//width,'type':typ}
  if normalized:a['normalized']=True
  if bounds and values:
   a['min']=[min(values[k::width]) for k in range(width)]
   a['max']=[max(values[k::width]) for k in range(width)]
  aid=len(doc['accessors']);doc['accessors'].append(a);return aid
 for mat,g in sorted(groups.items()):
  pos=acc(g['positions'],'VEC3',5126,34962,bounds=True)
  norm=acc(g['normals'],'VEC3',5126,34962)
  uv=acc(g['uv'],'VEC2',5126,34962)
  col=acc(g['colors'],'VEC4',5121,34962,normalized=True)
  idx=acc(g['indices'],'SCALAR',5125,34963)
  mid=len(doc['materials'])
  doc['materials'].append({'name':f'Original material {mat}; texture pending',
    'doubleSided':True,'pbrMetallicRoughness':{'metallicFactor':0,'roughnessFactor':1},
    'extras':{'originalMaterialIndex':mat}})
  doc['meshes'][0]['primitives'].append({'attributes':{'POSITION':pos,'NORMAL':norm,'TEXCOORD_0':uv,'COLOR_0':col},
     'indices':idx,'material':mid,'mode':4})
 doc['buffers'][0]['byteLength']=len(blob)
 js=json.dumps(doc,separators=(',',':')).encode()
 js+=b' '*(-len(js)%4)
 total=12+8+len(js)+8+len(blob)
 out=struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob
 return bytes(out),dict(sourceBytes=len(data),glbBytes=len(out),originalVertices=p['nv'],originalFaces=p['nf'],materialsWithFaces=len(groups),triangles=sum(len(g['indices'])//3 for g in groups.values()),texturesConverted=0)
if __name__=='__main__':
 ap=argparse.ArgumentParser()
 ap.add_argument('source',type=Path);ap.add_argument('output',type=Path);ap.add_argument('--inspect',action='store_true')
 a=ap.parse_args()
 data=a.source.read_bytes()
 if a.inspect:print(json.dumps(parse(data),indent=2))
 else:
  out,stats=glb(data);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_bytes(out);print(json.dumps(stats,indent=2))
