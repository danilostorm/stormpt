"""Read original SMD Model 0.62 texture material blocks (32-bit)."""
import struct
from model_glb import inspect_model
from materials import GROUP_SIZE,MATERIAL_SIZE,MaterialFormatError

def materials_model(buf):
 p=inspect_model(buf)
 start=p['materialOffset'];end=p['materialEnd']
 if start+GROUP_SIZE>end:raise MaterialFormatError('short material group')
 n=struct.unpack_from('<I',buf,start+8)[0]
 if n!=p['materials']:raise MaterialFormatError('material counts mismatch')
 offset=start+GROUP_SIZE;rows=[]
 for i in range(n):
  if offset+MATERIAL_SIZE>end:raise MaterialFormatError('material truncated')
  inuse,texcount=struct.unpack_from('<II',buf,offset)
  animcount=struct.unpack_from('<I',buf,offset+304)[0]
  blendtype=struct.unpack_from('<I',buf,offset+116)[0]
  twoside=struct.unpack_from('<I',buf,offset+124)[0]
  if texcount>8 or animcount>32:raise MaterialFormatError('too many textures')
  offset+=MATERIAL_SIZE
  textures=[];animated=[]
  if inuse:
   if offset+4>end:raise MaterialFormatError('missing filename bytes')
   length=struct.unpack_from('<i',buf,offset)[0];offset+=4
   if length<0 or length>65536 or offset+length>end:raise MaterialFormatError('filename section too large')
   names=buf[offset:offset+length].split(b'\0');offset+=length
   if names[-1]!=b'' or len(names)!=2*(texcount+animcount)+1:raise MaterialFormatError('filename count incorrect')
   def safe(b):
    value=b.decode('cp1252').replace('\\','/')
    if value.startswith('/') or ':' in value or '..' in value.split('/') or '\0' in value:raise MaterialFormatError('unsafe asset path')
    return value
   textures=[safe(names[2*k]) for k in range(texcount)]
   animated=[safe(names[2*(texcount+k)]) for k in range(animcount)]
  rows.append(dict(material=i,textures=textures,animationTextures=animated,blendType=blendtype,
     twoSided=bool(twoside),inUse=bool(inuse)))
 if offset!=end:raise MaterialFormatError(f'material offset not aligned {offset} vs {end}')
 return rows
