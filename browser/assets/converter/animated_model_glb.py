#!/usr/bin/env python3
"""Convert original single-bone Physique and sampled SMB animation to glTF skin.
No generated skeleton or motion. Private source assets are required.
"""
from pathlib import Path
import struct,json,math,bisect,hashlib
from model_glb import inspect_model
ROOT=Path('/mnt/user/appdata/stormpt-browser/assets')
def unpack(fmt,b,o):return struct.unpack_from('<'+fmt,b,o)
def multiply(a,b):return [sum(a[r*4+k]*b[k*4+c] for k in range(4)) for r in range(4) for c in range(4)]
def identity():return [1.0 if i%5==0 else 0.0 for i in range(16)]
def quaternion(q):
 x,y,z,w=q
 return [1-2*(y*y+z*z),2*(x*y-w*z),2*(x*z+w*y),0,
 2*(x*y+w*z),1-2*(x*x+z*z),2*(y*z-w*x),0,
 2*(x*z-w*y),2*(y*z+w*x),1-2*(x*x+y*y),0,0,0,0,1]
def text(b,o,n=32):return b[o:o+n].split(b'\0')[0].decode('ascii')
def bones():
 b=(ROOT/'source/m1.smb').read_bytes();info=inspect_model(b);out=[]
 for obj in info['objects']:
  o=obj['offset'];nr,np,ns=unpack('3i',b,o+684);p=obj['to']+obj['texLinks']*32
  rot=[unpack('i4f',b,p+i*20) for i in range(nr)];p+=nr*20
  pos=[unpack('i3f',b,p+i*16) for i in range(np)];p+=np*16
  scale=[unpack('4i',b,p+i*16) for i in range(ns)];p+=ns*16
  prev=[list(unpack('16f',b,p+i*64)) for i in range(nr)];p+=nr*64
  assert p==o+obj['length']
  out.append(dict(name=obj['name'],parent=text(b,o+204),tm=unpack('16i',b,o+240),
   inv=unpack('16i',b,o+304),rotate=unpack('16i',b,o+432),position=unpack('3i',b,o+656),
   rot=rot,pos=pos,scale=scale,prev=prev,frames=unpack('i',b,o+2232)[0],
   ranges=[[unpack('4i',b,o+off+i*16) for i in range(unpack('i',b,o+2232)[0])] for off in [696,1208,1720]]))
 names={v['name']:i for i,v in enumerate(out)}
 for i,v in enumerate(out):v['parentIndex']=names.get(v['parent'],-1);assert v['parentIndex']!=i
 return b,out
def segment(keys,start,frame):
 assert 0<=start<len(keys)-1
 frames=[k[0] for k in keys]
 i=bisect.bisect_right(frames,frame,lo=start)-1
 assert start<=i<len(keys)-1 and keys[i][0]<=frame<keys[i+1][0],(start,i,len(keys),frame,keys[start][:1],keys[max(0,min(i,len(keys)-1))][:1])
 return i,(frame-keys[i][0])/(keys[i+1][0]-keys[i][0])
def pose(bs,frame,end):
 result={}
 def evaluate(i):
  if i in result:return result[i]
  v=bs[i];parent=v['parentIndex'];starts=[]
  for ranges in v['ranges']:
   starts.append(next((p for s,e,p,n in ranges if n>0 and s<=frame<e),-1))
  animated=(not v['frames'] and any(v[k] for k in ['rot','pos','scale'])) or (v['frames'] and (starts[0]>=0 or starts[1]>=0 or starts[2]>0))
  if animated:
   q=[x/256 for x in v['rotate']]
   if v['rot'] and (starts[0]>=0 if v['frames'] else v['rot'][-1][0]>frame):
    start=starts[0] if v['frames'] else 0
    k,a=segment(v['rot'],start,max(frame,v['rot'][start][0]))
    if v['rot'][start][0]>frame:q=identity()
    elif v['rot'][k+1][0]>end:q=v['prev'][k][:]
    else:q=multiply(v['prev'][k],quaternion([x*math.sin(math.pi*.5*a) for x in v['rot'][k+1][1:]]))
   if v['scale'] and (starts[2]>=0 if v['frames'] else v['scale'][-1][0]>frame):
    k,a=segment(v['scale'],starts[2] if v['frames'] else 0,frame);sc=identity()
    alpha=int(a*256)
    for j in range(3):sc[j*5]=(v['scale'][k][j+1]+((v['scale'][k+1][j+1]-v['scale'][k][j+1])*alpha>>8))/256
    q=multiply(q,sc)
   q[12:15]=[x/256 for x in v['position']]
   if v['pos'] and (starts[1]>=0 if v['frames'] else v['pos'][-1][0]>frame):
    start=starts[1] if v['frames'] else 0
    if v['pos'][start][0]>frame:q[12:15]=[0,0,0]
    else:
     k,a=segment(v['pos'],start,frame)
     q[12:15]=[v['pos'][k][j]+(v['pos'][k+1][j]-v['pos'][k][j])*a for j in range(1,4)]
  elif parent>=0:
   fixed=[sum((v['tm'][r*4+k]*bs[parent]['inv'][k*4+c])>>8 for k in range(4)) for r in range(4) for c in range(4)]
   q=[x/256 for x in fixed]
  else:q=[x/256 for x in v['tm']]
  if parent>=0:q=multiply(q,evaluate(parent))
  assert all(math.isfinite(x) and abs(x)<100000 for x in q)
  result[i]=q;return q
 return [evaluate(i) for i in range(len(bs))]
def clips(smb):
 b=(ROOT/'source/M1Bip.inx').read_bytes();out=[]
 for name,idx,state in [('idle',10,0x40),('walk',16,0x50)]:
  o=396+idx*172;s,k,a,k2,e=unpack('5I',b,o);assert s==state
  start=((a&255)<<24)|(a&0xff0000)|((k&0xff0000)>>8)|(k&255)
  end=((k2&0xff0000)<<8)|((k2&255)<<16)|((e&0xff0000)>>8)|(e&255)
  key1=(k&0xff000000)|((k&0xff00)<<8)|(a&0xff00)|((a&0xff000000)>>24)
  key2=((e&0xff00)<<16)|((e&0xff000000)>>8)|(k2&0xff00)|((k2&0xff000000)>>24)
  assert key1==key2
  motion=unpack('i',b,o+168)[0];offset=unpack('i',smb,44+(motion-1)*16)[0]
  start=start*160+offset;end=end*160+offset
  assert start<end
  out.append(dict(name=name,index=idx,start=start,end=end,ticksPerSecond=5600))
 return out
def pt_matrix(q):
 # Original row-vector Max XYZ -> PT XZY; glTF stores column-major transpose.
 order=[0,2,1,3]
 return [q[order[r]*4+order[c]] for r in range(4) for c in range(4)]
def save_glb(path,doc,raw):
 raw+=b'\0'*(-len(raw)%4);doc['buffers'][0]['byteLength']=len(raw)
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(raw))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(raw),0x004e4942)+raw)
def skin_model(model,bs):
 source=(ROOT/'source'/f'{model}.smd').read_bytes();info=inspect_model(source)
 glb=(ROOT/'converted'/f'{model}.bind.textured.glb').read_bytes();jl=unpack('I',glb,12)[0];doc=json.loads(glb[20:20+jl]);raw=bytearray(glb[28+jl:])
 names={b['name']:i for i,b in enumerate(bs)}
 def attr(values,kind,fmt,ctype):
  while len(raw)%4:raw.append(0)
  off=len(raw);raw.extend(struct.pack('<'+str(len(values))+fmt,*values));view=len(doc['bufferViews']);doc['bufferViews'].append(dict(buffer=0,byteOffset=off,byteLength=len(raw)-off,target=34962))
  dim={'VEC3':3,'VEC4':4,'MAT4':16}[kind];a=dict(bufferView=view,componentType=ctype,count=len(values)//dim,type=kind)
  if kind=='VEC3':a.update(min=[min(values[j::dim]) for j in range(dim)],max=[max(values[j::dim]) for j in range(dim)])
  doc['accessors'].append(a);return len(doc['accessors'])-1
 for obj in info['objects']:
  groups={}
  for f in range(obj['faces']):
   off=obj['fo']+f*36;a,b,c,mat=unpack('4H',source,off);ptr=unpack('I',source,off+32)[0]
   uv=unpack('6f',source,obj['to']+ptr-obj['oldtex']) if ptr else (0,)*6
   g=groups.setdefault(mat,{})
   for vi,u,v in zip((a,b,c),uv[:3],uv[3:]):g.setdefault((vi,u,v),vi)
  for primitive,(mat,lookup) in zip(doc['meshes'][obj['objectIndex']]['primitives'],sorted(groups.items())):
   assert doc['materials'][primitive['material']]['extras']['originalMaterialIndex']==mat
   verts=list(lookup.values());assert len(verts)==doc['accessors'][primitive['attributes']['POSITION']]['count']
   local=[];joints=[];weights=[];normals=[]
   old=doc['accessors'][primitive['attributes']['NORMAL']];view=doc['bufferViews'][old['bufferView']];noff=view.get('byteOffset',0)+old.get('byteOffset',0)
   for n,vi in enumerate(verts):
    p=unpack('3i',source,obj['vo']+vi*24);bone=names[text(source,obj['vertexSkinNames']+vi*32)]
    local.extend([p[0]/256,p[2]/256,p[1]/256]);joints.extend([bone,0,0,0]);weights.extend([1,0,0,0])
    normal=unpack('3f',raw,noff+n*12);inv=pt_matrix([x/256 for x in bs[bone]['inv']])
    transformed=[sum(normal[k]*inv[k*4+j] for k in range(3)) for j in range(3)];length=math.hypot(*transformed)
    normals.extend([v/length for v in transformed] if length else [0,1,0])
   primitive['attributes'].update(POSITION=attr(local,'VEC3','f',5126),NORMAL=attr(normals,'VEC3','f',5126),JOINTS_0=attr(joints,'VEC4','B',5121),WEIGHTS_0=attr(weights,'VEC4','f',5126))
  doc['nodes'][obj['objectIndex']]['skin']=0
 base=len(doc['nodes']);jointnodes=[]
 for i,b in enumerate(bs):
  jointnodes.append(base+i);doc['nodes'].append(dict(name='PTBone_'+str(i),matrix=pt_matrix([x/256 for x in b['tm']])))
 # Flat world-space bones: the original hierarchy is already evaluated offline.
 skeletonRoot=len(doc['nodes']);doc['nodes'].append(dict(name='PTSkeleton',children=jointnodes));doc['scenes'][0]['nodes'].append(skeletonRoot)
 a=attr(identity()*len(bs),'MAT4','f',5126)
 doc['bufferViews'][doc['accessors'][a]['bufferView']].pop('target')
 doc['skins']=[dict(joints=jointnodes,skeleton=skeletonRoot,inverseBindMatrices=a,name='Original Physique')]
 doc['extras'].update(skinningConverted=True,animationConverted=True,bindPoseOnly=False,originalSingleBonePhysique=True,boneSource='m1.smb',boneCount=len(bs))
 out=ROOT/'converted'/f'{model}.skinned.textured.glb';save_glb(out,doc,raw)
 return dict(model=model,bytes=out.stat().st_size,bones=len(bs))
def main():
 smb,bs=bones();cs=clips(smb);payload=bytearray(struct.pack('<4I',0x4e415450,1,len(bs),len(cs)))
 fps=20;tables=[]
 for clip in cs:
  count=math.ceil((clip['end']-clip['start'])/clip['ticksPerSecond']*fps)
  duration=(clip['end']-clip['start'])/clip['ticksPerSecond']
  payload.extend(struct.pack('<16sIfii',clip['name'].encode(),count,count/duration,clip['start'],clip['end']))
  tables.append((clip,count))
 for clip,count in tables:
  for i in range(count):
   frame=clip['start']+int(i*(clip['end']-clip['start'])/count)
   for q in pose(bs,frame,clip['end']):
    # Native WorldForm quantizes the animation matrix to 8-bit fixed point.
    q=[math.trunc(v*256)/256 for v in q]
    payload.extend(struct.pack('<16f',*pt_matrix(q)))
 path=ROOT/'converted/fighter-motion.ptan';path.write_bytes(payload)
 results=[skin_model(m,bs) for m in ['tmbB01','tmh-B01']]
 result=dict(bones=len(bs),clips=[dict(**c,samples=n) for c,n in tables],animationBytes=len(payload),models=results,sourceSha256=hashlib.sha256(smb).hexdigest())
 (ROOT/'validation/fighter-motion-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
if __name__=='__main__':main()
