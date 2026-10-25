import unittest,tempfile,hashlib
from pathlib import Path
from unittest.mock import patch
from repair_candidates import BoundAssets
import stormpt_pipeline as p
from plan_repairs import plan,bindings_index
class RepairPlanTests(unittest.TestCase):
 def test_configuration_uses_original_reference_not_similar_name(self):
  rows=[{'model':'CHAR\\NPC\\Example\\body.ASE','config':'Char/Npc/Example/config.inx','bones':'Char/Npc/Example/rig.ASE'}]
  results=[{'source':'char/npc/example/body.smd','status':'blocked','error':'FileNotFoundError: Client dependency absent: char/npc/example/body.inx'}]
  self.assertEqual(plan(results,rows)[0]['category'],'unambiguous_native_binding')
  self.assertEqual(plan(results,rows)[0]['nativeConfigurations'],['char/npc/example/config.inx'])
 def test_ambiguity_is_preserved_instead_of_guessing(self):
  rows=[{'model':'char/body.ASE','config':name,'bones':'char/rig.ASE'} for name in ['char/one.inx','char/two.inx']]
  result={'source':'char/body.smd','status':'blocked','error':'FileNotFoundError: Client dependency absent: char/body.inx'}
  self.assertEqual(plan([result],rows)[0]['category'],'ambiguous_native_binding')
 def test_valid_assets_are_not_queued_again_and_paths_stay_safe(self):
  self.assertEqual(plan([{'status':'validated_candidate'}],[]),[])
  self.assertEqual(dict(bindings_index([{'model':'../outside.ASE','config':'char/a.inx','bones':'char/b.ASE'}])),{})
 def test_transient_io_errors_are_separate_from_format_work(self):
  row={'source':'char/a.smd','status':'blocked','error':'OSError: [Errno 116] Stale file handle'}
  self.assertEqual(plan([row],[])[0]['category'],'transient_cache_retry')
 def test_binding_payload_must_confirm_the_same_original_model(self):
  for model,valid in [('char/body.ASE',True),('char/other.ASE',False)]:
   payload=model.encode().ljust(64,b'\0')+b'char/rig.ASE'.ljust(64,b'\0')
   row={'root':p.CONFIG['primaryRoot'],'path':'char/config.inx','bytes':len(payload),'ticks':'1','sha256':hashlib.sha256(payload).hexdigest()}
   with tempfile.TemporaryDirectory() as temp,patch.object(p,'PRIVATE',Path(temp)),patch.object(p.guest,'read',return_value=payload),patch.object(BoundAssets,'bindings',{'char/body.smd':['char/config.inx']}):
    asset=BoundAssets({'files':[row]})
    if valid:
     self.assertEqual(asset.fetch('char/body.inx'),payload);self.assertIn('char/config.inx',asset.deps)
    else:
     with self.assertRaisesRegex(ValueError,'reference changed'):asset.fetch('char/body.inx')
if __name__=='__main__':unittest.main()
