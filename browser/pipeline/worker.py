"""Isolated converter process. Proprietary inputs and outputs stay outside git."""
from pathlib import Path
import json,sys,struct,contextlib
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'assets/converter'))
def main():
 request=json.loads(Path(sys.argv[1]).read_text());work=Path(request['work'])
 import stage_glb,model_glb,texture_model_glb,texturize_stage,npc_idle_glb,animated_model_glb
 for module in [texture_model_glb,texturize_stage,npc_idle_glb,animated_model_glb]:module.ROOT=work
 source=(work/'source/asset.smd').read_bytes();mode=request['mode'];notes=[]
 with contextlib.redirect_stdout(sys.stderr):
  if mode=='stage':
   payload,stats=stage_glb.glb(source);(work/'converted/asset.glb').write_bytes(payload)
   stats=texturize_stage.texturize('asset');output=work/'converted/asset.textured.glb'
   if stats['missing']:raise FileNotFoundError('Required stage textures missing: '+repr(stats['missing']))
   notes=['Diffuse geometry candidate; multilayer materials, lighting, effects and map transitions require integration.']
  elif mode=='idle':
   stats=npc_idle_glb.convert('asset');output=work/'converted/asset.idle.textured.glb'
   notes=['First native idle pose only; animation clips and gameplay services are not implemented by conversion.']
  elif mode=='static':
   payload,stats=model_glb.export(source);(work/'converted/asset.glb').write_bytes(payload)
   stats=texture_model_glb.texture_model('asset');output=work/'converted/asset.textured.glb'
   notes=['Static geometry candidate; desktop transform/render comparison still required.']
  else:raise ValueError('Unknown conversion mode')
 # Remove empty original helper mesh declarations, retaining their scene nodes.
 raw=output.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);binary=raw[20+length:]
 mapping={};meshes=[]
 for i,mesh in enumerate(doc.get('meshes',[])):
  if mesh.get('primitives'):mapping[i]=len(meshes);meshes.append(mesh)
 for node in doc.get('nodes',[]):
  if 'mesh' in node:
   if node['mesh'] in mapping:node['mesh']=mapping[node['mesh']]
   else:del node['mesh']
 doc['meshes']=meshes
 encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*(-len(encoded)%4)
 output.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary)
 result={'output':str(output),'mode':mode,'notes':notes,'conversion':stats}
 (work/'conversion.json').write_text(json.dumps(result,indent=2))
if __name__=='__main__':main()
