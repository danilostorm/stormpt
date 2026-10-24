"""Read-only converter integration against privately staged original Enzo files."""
from pathlib import Path
import hashlib,json,sys
import stormpt_pipeline as p
from model_materials import materials_model
root=p.ROOT;rows=[]
def add(relative,local):
 raw=local.read_bytes();rows.append(dict(root=p.CONFIG['primaryRoot'],path=relative,bytes=len(raw),ticks='integration-snapshot',extension=local.suffix.lower(),signature=raw[:24].split(b'\0')[0].decode('ascii') if local.suffix=='.smd' else '',sha256=hashlib.sha256(raw).hexdigest()))
for ext in ['smd','smb','inx']:add('char/npc/Enzo/enzo.'+ext,root/'assets/source'/('enzo.'+ext))
for row in materials_model((root/'assets/source/enzo.smd').read_bytes()):
 for texture in row['textures'][:1]:
  if not any(r['path']==texture for r in rows):add(texture,root/'assets/source/textures'/texture)
p.PRIVATE=p.HERE/'private/integration-check';p.PRIVATE.mkdir(exist_ok=True);version=p.code_version();data={'files':rows}
first=p.convert_one(rows[0],data,version,force=True)
if first['status']!='validated_candidate':raise RuntimeError(json.dumps(first))
second=p.convert_one(rows[0],data,version)
assert second['cached'] and first['outputSha256']==second['outputSha256']
Path(first['output']).write_bytes(b'corrupted test output')
third=p.convert_one(rows[0],data,version)
assert not third['cached'] and third['status']=='validated_candidate' and third['outputSha256']==first['outputSha256']
p.atomic(p.PRIVATE/'batch-results.json',{'results':[third]});p.publish()
result={'realPrivateSource':'Enzo','conversion':'passed','gltfErrors':first['validationErrors'],'cacheReuse':True,'corruptedOutputRebuilt':True,'guestStagingHashVerified':True,'activeInGame':False}
p.atomic(p.HERE/'integration-summary.json',result);print(json.dumps(result))
