#!/usr/bin/env python3
"""Parse real SMD smMATERIAL_GROUP serialized by smTexture.cpp:601-708 (32-bit)."""
import json,struct,re
from pathlib import Path
GROUP_SIZE=88
MATERIAL_SIZE=320
STAGE_STRUCT_SIZE=262260
HEADER_SIZE=556
class MaterialFormatError(ValueError):pass
def materials(data):
 if not data.startswith(b'SMD Stage data Ver 0.72'):raise MaterialFormatError('bad magic')
 matcount=struct.unpack_from('<i',data,28)[0]
 first_obj=struct.unpack_from('<i',data,36)[0]
 start=HEADER_SIZE+STAGE_STRUCT_SIZE
 end=first_obj+STAGE_STRUCT_SIZE
 if not (0<matcount<100000 and start+GROUP_SIZE<=end<=len(data)):raise MaterialFormatError('bad bounds')
 group_count=struct.unpack_from('<I',data,start+8)[0]
 if group_count!=matcount:raise MaterialFormatError('material group/header count mismatch')
 offset=start+GROUP_SIZE
 result=[]
 for i in range(matcount):
  if offset+MATERIAL_SIZE>end:raise MaterialFormatError('truncated material')
  inuse,texcount=struct.unpack_from('<II',data,offset)
  animcount=struct.unpack_from('<I',data,offset+304)[0]
  blendtype=struct.unpack_from('<I',data,offset+116)[0]
  twoside=struct.unpack_from('<I',data,offset+124)[0]
  if texcount>8 or animcount>32:raise MaterialFormatError('invalid texture counts')
  offset+=MATERIAL_SIZE
  names=[];animated=[]
  if inuse:
   if offset+4>end:raise MaterialFormatError('truncated strings length')
   n=struct.unpack_from('<i',data,offset)[0];offset+=4
   if n<0 or n>4096 or offset+n>end:raise MaterialFormatError('invalid strings length')
   raw=data[offset:offset+n];offset+=n
   entries=raw.split(b'\0')
   if entries[-1]!=b'' or len(entries)-1!=2*(texcount+animcount):
    raise MaterialFormatError('invalid texture name count')
   def clean(x):
    value=x.decode('cp1252','replace').replace('\\','/').replace('//','/')
    # Preserve only relative game asset paths; never read arbitrary VM files.
    if value.startswith('/') or ':' in value or '..' in value.split('/'):
     raise MaterialFormatError('unsafe texture path')
    return value
   names=[clean(entries[j*2]) for j in range(texcount)]
   animated=[clean(entries[(texcount+j)*2]) for j in range(animcount)]
  result.append({'material':i,'textures':names,'animationTextures':animated,'blendType':blendtype,'twoSided':bool(twoside),'inUse':bool(inuse)})
 if offset!=end:raise MaterialFormatError(f'material section did not align: {offset} vs {end}')
 return result
if __name__=='__main__':
 src=Path('/mnt/user/appdata/stormpt-browser/assets/source/AncientW.smd')
 dest=Path('/mnt/user/appdata/stormpt-browser/assets/converted/AncientW.materials.json')
 result=materials(src.read_bytes())
 dest.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 names=sorted(set(n for r in result for n in r['textures']+r['animationTextures']))
 print(json.dumps({'materials':len(result),'withTextures':sum(bool(r['textures']) for r in result),'uniqueTexturePaths':len(names),'totalTextureReferences':sum(len(r['textures'])+len(r['animationTextures']) for r in result),'firstTen':names[:10]},indent=2))
