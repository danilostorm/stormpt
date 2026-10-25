#!/usr/bin/env python3
"""Embed original stage textures without inventing replacements for missing files."""
from pathlib import Path
import json,struct,sys,re
from materials import materials
from pt_texture_codec import to_png
ROOT=Path('/mnt/user/appdata/stormpt-browser/assets')
def texturize(name):
 if not re.fullmatch('[A-Za-z0-9_-]+',name):raise ValueError('Unsafe asset name')
 data=(ROOT/'converted'/f'{name}.glb').read_bytes()
 jlen=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+jlen])
 off=20+jlen;blen=struct.unpack_from('<I',data,off)[0]
 blob=bytearray(data[off+8:off+8+blen]);mats=materials((ROOT/'source'/('village-2.smd' if name=='Ricarten' else name+'.smd')).read_bytes())
 doc['samplers']=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]
 doc['images']=[];doc['textures']=[];cache={};missing=[]
 for mat in doc['materials']:
  row=mats[mat['extras']['originalMaterialIndex']]
  mat['doubleSided']=row['twoSided'];mat['extras']['originalTexturePaths']=row['textures']
  mat['extras']['originalBlendType']=row['blendType']
  if not row['textures']:continue
  path=row['textures'][0];source=ROOT/'source/textures'/path
  if not source.resolve().is_relative_to((ROOT/'source/textures').resolve()):raise ValueError('Unsafe texture path')
  if not source.is_file():
   mat['extras']['missingOriginalTexture']=path;missing.append(path);continue
  if path not in cache:
   payload,stats=to_png(source);vid=len(doc['bufferViews']);offset=len(blob)
   blob.extend(payload)
   while len(blob)%4:blob.append(0)
   doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(payload)})
   idx=len(doc['images']);doc['images'].append({'bufferView':vid,'mimeType':'image/png','name':path})
   doc['textures'].append({'sampler':0,'source':idx});cache[path]=(idx,stats['mode']=='RGBA')
  idx,alpha=cache[path];mat['pbrMetallicRoughness']['baseColorTexture']={'index':idx}
  if alpha:mat['alphaMode']='BLEND'
 doc['nodes'][0]['name']='StormPT '+name+' original stage'
 doc['asset']['generator']='StormPT original SMD stage + original decoded textures'
 doc['extras'].update({'texturesConverted':len(cache),'missingOriginalTextures':sorted(set(missing)),'mapName':name,
  'note':'Diffuse only; multilayer, animated materials and lighting pending.'})
 doc['buffers'][0]['byteLength']=len(blob)
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
 total=28+len(j)+len(blob)
 out=ROOT/'converted'/f'{name}.textured.glb'
 out.write_bytes(struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(blob),0x004e4942)+blob)
 result={'output':str(out),'bytes':total,'materials':len(doc['materials']),'textures':len(cache),'missing':sorted(set(missing))}
 (ROOT/'validation'/f'{name}.texture-result.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result))
if __name__=='__main__':texturize(sys.argv[1])
