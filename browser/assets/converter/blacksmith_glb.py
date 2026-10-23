#!/usr/bin/env python3
"""Original Ferreiro Gus model, sampled at its original first idle frame."""
from pathlib import Path
import struct,json,hashlib
from animated_model_glb import bones,pose
from model_glb import inspect_model,export
from texture_model_glb import texture_model
ROOT=Path('/mnt/user/appdata/stormpt-browser/assets')
def main():
 source=(ROOT/'source/TN-004.smd').read_bytes();smb,bs=bones('TN-004.smb',allow_trailing=True)
 config=(ROOT/'source/TN-004.inx').read_bytes();state,k,a,k2,e=struct.unpack_from('<5I',config,396+10*172);assert state==64
 start=((a&255)<<24)|(a&0xff0000)|((k&0xff0000)>>8)|(k&255)
 end=((k2&0xff0000)<<8)|((k2&255)<<16)|((e&0xff0000)>>8)|(e&255)
 key1=(k&0xff000000)|((k&0xff00)<<8)|(a&0xff00)|((a&0xff000000)>>24)
 key2=((e&0xff00)<<16)|((e&0xff000000)>>8)|(k2&0xff00)|((k2&0xff000000)>>24)
 assert key1==key2
 offset=struct.unpack_from('<i',smb,44)[0];start=start*160+offset;end=end*160+offset
 matrices={b['name']:[int(v*256) for v in q] for b,q in zip(bs,pose(bs,start,end))}
 data=bytearray(source);info=inspect_model(source);vertices=0
 for obj in info['objects']:
  assert obj['physique']
  for i in range(obj['vertices']):
   off=obj['vo']+i*24;p=struct.unpack_from('<3i',source,off);name=source[obj['vertexSkinNames']+i*32:obj['vertexSkinNames']+(i+1)*32].split(b'\0')[0].decode('ascii');m=matrices[name]
   out=[(sum(p[k]*m[k*4+j] for k in range(3))>>8)+m[12+j] for j in range(3)]
   struct.pack_into('<3i',data,off,out[0],out[2],out[1]);vertices+=1
 glb,stats=export(bytes(data));(ROOT/'converted/TN-004.idle.glb').write_bytes(glb)
 texture=texture_model('TN-004',geometry_name='TN-004.idle')
 n=struct.unpack_from('<i',smb,24)[0];length,off=struct.unpack_from('<ii',smb,556+(n-1)*40+32)
 result=dict(sourceSha256=hashlib.sha256(source).hexdigest(),bones=len(bs),vertices=vertices,originalIdleFrame=start,originalIdleEnd=end,highNode='TN-003H',highFaces=info['objects'][0]['faces'],ignoredSkeletonTrailingBytes=len(smb)-off-length,animated=False,texture=texture)
 (ROOT/'validation/blacksmith-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
if __name__=='__main__':main()
