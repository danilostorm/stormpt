"""Accept the native legacy-normal flag without changing source vertices or files.
Original smOBJ3D loader uses the same serialized vertex layout for both headers;
the flag selects the normal transform. This exporter recomputes mesh normals.
"""
import struct,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'assets/converter'))
def normalized_headers(source):
 if len(source)<556 or source[:24]!=b'SMD Model data Ver 0.62\0':return source
 count=struct.unpack_from('<i',source,24)[0]
 if not 1<=count<=128 or 556+count*40>len(source):return source
 result=None
 for i in range(count):
  offset=struct.unpack_from('<i',source,556+i*40+36)[0]
  if offset<0 or offset+4>len(source):return source
  if struct.unpack_from('<I',source,offset)[0]==0x41424344:
   if result is None:result=bytearray(source)
   struct.pack_into('<I',result,offset,0xc1424344)
 return bytes(result) if result is not None else source
def install():
 import model_glb
 original=getattr(model_glb,'_legacy_original_inspect',model_glb.inspect_model)
 model_glb._legacy_original_inspect=original
 def inspect(data):return original(normalized_headers(data))
 model_glb.inspect_model=inspect
 for name in ['model_materials','animated_model_glb']:
  module=sys.modules.get(name)
  if module is not None:module.inspect_model=inspect
