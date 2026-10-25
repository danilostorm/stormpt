#!/usr/bin/env python3
"""Bake original single-bone Physique bind coordinates, never a generated rig.
smOBJ3D::ReformPhysique stores bone-local vertices; WorldForm restores them and
maps Max XYZ to PT XZY. Animation sampling/skinning remains a separate step.
"""
from pathlib import Path
import struct,json,hashlib
from model_glb import inspect_model,export
from texture_model_glb import texture_model
ROOT=Path('/mnt/user/appdata/stormpt-browser/assets')
def bake(model,bones):
 source=(ROOT/'source'/f'{model}.smd').read_bytes()
 data=bytearray(source);info=inspect_model(source);vertices=0
 for obj in info['objects']:
  if not obj['physique']:raise ValueError('Expected original per-vertex Physique')
  for i in range(obj['vertices']):
   start=obj['vertexSkinNames']+i*32
   name=source[start:start+32].split(b'\0')[0].decode('ascii')
   if name not in bones:raise ValueError('Unknown original bone '+name)
   m=bones[name];off=obj['vo']+i*24
   p=struct.unpack_from('<3i',source,off)
   out=[(sum(p[k]*m[k*4+j] for k in range(3))>>8)+m[12+j] for j in range(3)]
   if any(abs(v)>100_000_000 for v in out):raise ValueError('Invalid bound vertex')
   struct.pack_into('<3i',data,off,out[0],out[2],out[1]);vertices+=1
 glb,stats=export(bytes(data))
 n=struct.unpack_from('<I',glb,12)[0];doc=json.loads(glb[20:20+n]);blob=glb[20+n:]
 doc['extras'].update({'bindPoseConverted':True,'boneSource':'m1.smb','originalBoneCount':len(bones),
  'binding':'original single-bone Physique; Max XYZ to PT XZY','animationConverted':False})
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
 out=ROOT/'converted'/f'{model}.bind.glb'
 out.write_bytes(struct.pack('<III',0x46546c67,2,20+len(j)+len(blob))+struct.pack('<II',len(j),0x4e4f534a)+j+blob)
 textures=texture_model(model,geometry_name=model+'.bind')
 return {'model':model,'boundVertices':vertices,'sourceSha256':hashlib.sha256(source).hexdigest(),**stats,'textures':textures}
def main():
 b=(ROOT/'source/m1.smb').read_bytes();info=inspect_model(b)
 bones={}
 for obj in info['objects']:
  name=b[obj['offset']+172:obj['offset']+204].split(b'\0')[0].decode('ascii')
  if name!=obj['name'] or name in bones:raise ValueError('Invalid bone identity')
  bones[name]=struct.unpack_from('<16i',b,obj['offset']+240)
 results=[bake(model,bones) for model in ['tmbB01','tmh-B01']]
 inx=(ROOT/'source/b001.inx').read_bytes()
 if inx[:64].split(b'\0')[0]!=b'char\\tmABCD\\tmbB01.ASE':raise ValueError('Unexpected original body config')
 n=struct.unpack_from('<i',inx,192)[0]
 if not 1<=n<=4:raise ValueError('Invalid original HighModel group')
 high=[inx[196+16*i:212+16*i].split(b'\0')[0].decode('ascii') for i in range(n)]
 manifest={'boneCount':len(bones),'boneSha256':hashlib.sha256(b).hexdigest(),'bodyRecordPath':'char\\tmABCD\\b001.ini',
  'bodySource':'tmbB01.smd','highBodyNodes':high,'highHeadNodes':['TmhhB01'],
  'bodyGLB':'tmbB01.bind.textured.glb','headGLB':'tmh-B01.bind.textured.glb','bindPoseOnly':True,'results':results}
 (ROOT/'validation/fighter-bind-result.json').write_text(json.dumps(manifest,indent=2))
 print(json.dumps({'boneCount':len(bones),'highBodyNodes':high,'boundVertices':sum(x['boundVertices'] for x in results),'bindPoseOnly':True}))
if __name__=='__main__':main()
