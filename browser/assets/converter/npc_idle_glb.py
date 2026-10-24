#!/usr/bin/env python3
"""Sample original NPC Physique at first configured native idle frame.
Requires privately supplied SMD/SMB/INX and textures; never modifies originals.
"""
from pathlib import Path
import struct,json,hashlib
from animated_model_glb import bones,pose
from model_glb import inspect_model,export
from texture_model_glb import texture_model
ROOT=Path('/mnt/user/appdata/stormpt-browser/assets')
def idle_range(config,smb):
 for i in range(min(512,(len(config)-396)//172)):
  state,k,a,k2,e=struct.unpack_from('<5I',config,396+i*172)
  if state!=64:continue
  start=((a&255)<<24)|(a&0xff0000)|((k&0xff0000)>>8)|(k&255)
  end=((k2&0xff0000)<<8)|((k2&255)<<16)|((e&0xff0000)>>8)|(e&255)
  key1=(k&0xff000000)|((k&0xff00)<<8)|(a&0xff00)|((a&0xff000000)>>24)
  key2=((e&0xff00)<<16)|((e&0xff000000)>>8)|(k2&0xff00)|((k2&0xff000000)>>24)
  if ((k or a) and (k2 or e) and key1!=key2) or end<=start:raise ValueError('Invalid native idle frame encoding')
  offset=struct.unpack_from('<i',smb,44)[0]
  return start*160+offset,end*160+offset
 raise ValueError('Original idle animation not found')
def convert(stem):
 source=(ROOT/'source'/f'{stem}.smd').read_bytes();config=(ROOT/'source'/f'{stem}.inx').read_bytes()
 motionPath=config[64:128].split(b'\0')[0].decode('ascii').replace('\\','/');boneStem=Path(motionPath).stem
 smb,bs=bones(boneStem+'.smb',allow_trailing=True);start,end=idle_range(config,smb)
 count=struct.unpack_from('<i',config,192)[0]
 if not 0<=count<=4:raise ValueError('Invalid high mesh count')
 names=[config[196+i*16:212+i*16].split(b'\0')[0].decode('ascii') for i in range(count)]
 matrices={b['name']:[int(v*256) for v in q] for b,q in zip(bs,pose(bs,start,end))}
 data=bytearray(source);info=inspect_model(source);vertices=0
 for obj in info['objects']:
  if not obj['physique']:raise ValueError('Unskinned original NPC object')
  for i in range(obj['vertices']):
   off=obj['vo']+i*24;p=struct.unpack_from('<3i',source,off);name=source[obj['vertexSkinNames']+i*32:obj['vertexSkinNames']+(i+1)*32].split(b'\0')[0].decode('ascii');m=matrices[name]
   out=[(sum(p[k]*m[k*4+j] for k in range(3))>>8)+m[12+j] for j in range(3)]
   struct.pack_into('<3i',data,off,out[0],out[2],out[1]);vertices+=1
 glb,stats=export(bytes(data));(ROOT/'converted'/f'{stem}.idle.glb').write_bytes(glb)
 texture=texture_model(stem,geometry_name=stem+'.idle')
 # Encode selection by node index: GLTFLoader may rename duplicate object names.
 dest=ROOT/'converted'/f'{stem}.idle.textured.glb';raw=dest.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);binchunk=raw[20+n:]
 meshMap={};meshes=[]
 for i,mesh in enumerate(doc['meshes']):
  if mesh.get('primitives'):meshMap[i]=len(meshes);meshes.append(mesh)
 for node in doc['nodes']:
  if 'mesh' in node:
   if node['mesh'] in meshMap:node['mesh']=meshMap[node['mesh']]
   else:del node['mesh']
 doc['meshes']=meshes
 selected=[]
 for node in doc['nodes']:
  visible=not names or node.get('name') in names;node.setdefault('extras',{})['nativeNpcVisible']=visible
  if visible:selected.append(node.get('name'))
 if not selected:raise ValueError('Native high mesh selection empty')
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*(-len(j)%4);dest.write_bytes(struct.pack('<III',0x46546c67,2,20+len(j)+len(binchunk))+struct.pack('<II',len(j),0x4e4f534a)+j+binchunk)
 result=dict(stem=stem,boneStem=boneStem,sourceSha256=hashlib.sha256(source).hexdigest(),bones=len(bs),vertices=vertices,idleStart=start,idleEnd=end,highNodes=names,selectedNodes=selected,animated=False,texture=texture)
 (ROOT/'validation'/f'{stem}-idle-result.json').write_text(json.dumps(result,indent=2));return result
if __name__=='__main__':
 import sys
 for name in sys.argv[1:]:
  try:print(json.dumps(convert(name)),flush=True)
  except Exception as e:print(json.dumps({'stem':name,'error':str(e)}),flush=True);raise
