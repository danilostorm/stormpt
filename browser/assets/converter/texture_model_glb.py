#!/usr/bin/env python3
"""Embed the REAL model textures after smTexture.cpp de-obfuscation into glTF."""
from pathlib import Path
import json,struct,sys
from model_materials import materials_model
from pt_texture_codec import to_png
ROOT=Path('/mnt/user/appdata/stormpt-browser/assets')
def texture_model(modelname,geometry_name=None):
 geometry_name=geometry_name or modelname
 original=ROOT/'source'/f'{modelname}.smd'
 geometry=ROOT/'converted'/f'{geometry_name}.glb'
 result=ROOT/'converted'/f'{geometry_name}.textured.glb'
 data=geometry.read_bytes()
 if struct.unpack_from('<II',data)!=(0x46546c67,2):raise ValueError('Not glb')
 jlen,jtyp=struct.unpack_from('<II',data,12)
 if jtyp!=0x4e4f534a:raise ValueError('Bad JSON chunk')
 doc=json.loads(data[20:20+jlen])
 off=20+jlen
 blen,btyp=struct.unpack_from('<II',data,off)
 if btyp!=0x004e4942:raise ValueError('Bad binary chunk')
 buf=bytearray(data[off+8:off+8+blen])
 materials=materials_model(original.read_bytes())
 doc['images']=[];doc['textures']=[];doc['samplers']=[{
  'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497
 }]
 cached={}
 for m in doc['materials']:
  index=m['extras']['originalMaterialIndex']
  row=materials[index]
  m['doubleSided']=row['twoSided']
  m['extras']['originalTexturePaths']=row['textures']
  m['extras']['originalBlendType']=row['blendType']
  if not row['textures']:continue
  name=row['textures'][0]
  if name not in cached:
   path=(ROOT/'source/textures'/name).resolve()
   if not path.is_relative_to((ROOT/'source/textures').resolve()):
    raise ValueError('Unsafe texture file reference')
   if not path.is_file():raise FileNotFoundError(str(path))
   image,stats=to_png(path)
   off=len(buf);buf.extend(image)
   while len(buf)%4:buf.append(0)
   view=len(doc['bufferViews'])
   doc['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(image)})
   img=len(doc['images'])
   doc['images'].append({'bufferView':view,'mimeType':'image/png','name':name})
   tex=len(doc['textures'])
   doc['textures'].append({'sampler':0,'source':img})
   cached[name]=(tex,stats['mode']=='RGBA')
  tex,alpha=cached[name]
  m['pbrMetallicRoughness']['baseColorTexture']={'index':tex}
  if alpha:m['alphaMode']='BLEND'
 doc['extras']['texturesConverted']=len(cached)
 doc['buffers'][0]['byteLength']=len(buf)
 doc['asset']['generator']='StormPT real SMD Model 0.62 + smTexture.cpp restored texture'
 j=json.dumps(doc,separators=(',',':')).encode()
 j+=b' '*(-len(j)%4)
 total=12+8+len(j)+8+len(buf)
 result.write_bytes(struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(buf),0x004e4942)+buf)
 return {'model':modelname,'bytes':total,'objects':len(doc['nodes']),'triangles':doc['extras']['originalFaces'],
  'embeddedTextures':len(cached),'materials':len(doc['materials']),'rigConverted':False}
if __name__=='__main__':
 for name in sys.argv[1:]:print(json.dumps(texture_model(name),ensure_ascii=False))
