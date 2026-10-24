import argparse,concurrent.futures,hashlib,importlib.util,json,tempfile,unittest,io,tarfile
from pathlib import Path
from unittest.mock import patch
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('pipeline',HERE/'stormpt_pipeline.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class PipelineTests(unittest.TestCase):
 def test_asset_references_stay_under_client(self):
  for value in ['../secret','char/../../secret','C:/secret','/secret','\\\\host\\share','a\0b']:
   with self.subTest(value=value),self.assertRaises(ValueError):p.relative(value)
  self.assertEqual(p.relative('Char\\Npc\\Enzo\\enzo.smd'),'Char/Npc/Enzo/enzo.smd')
 def test_unsupported_format_isolated_and_cached(self):
  row=dict(root=p.CONFIG['primaryRoot'],path='example.smd',signature='SMD Model data Ver 2.18',bytes=20,ticks='1',sha256='example',extension='.smd')
  with tempfile.TemporaryDirectory() as temp,patch.object(p,'PRIVATE',Path(temp)):
   result=p.convert_one(row,{'files':[row]},'v1');self.assertEqual(result['status'],'blocked');self.assertIn('Unsupported file format',result['error'])
   with patch.object(p.guest,'read',side_effect=AssertionError('Cached failure must not read guest')):
    self.assertTrue(p.convert_one(row,{'files':[row]},'v1')['cached'])
   self.assertFalse(p.convert_one(row,{'files':[dict(row,ticks='2')]},'v1')['cached'])
 def test_missing_dependency_changes_invalidate_entry(self):
  a=p.Assets({'files':[]});self.assertIsNone(a.meta('char/missing.inx'));self.assertIn('char/missing.inx',a.deps)
 def test_publication_refuses_changed_output(self):
  with tempfile.TemporaryDirectory() as temp,patch.object(p,'PRIVATE',Path(temp)),patch.object(p.guest,'write',side_effect=AssertionError('Must not publish')):
   output=Path(temp)/'model.glb';output.write_bytes(b'changed');p.atomic(Path(temp)/'batch-results.json',{'results':[{'status':'validated_candidate','validationErrors':0,'output':str(output),'outputSha256':hashlib.sha256(b'original').hexdigest(),'source':'example.smd'}]})
   with self.assertRaisesRegex(ValueError,'changed after validation'):p.publish()
 def test_parallel_batch_completes_despite_bad_files(self):
  rows=[dict(root=p.CONFIG['primaryRoot'],path=name,signature='unsupported-format',bytes=20,ticks='1',sha256='example',extension='.smd') for name in ['bad-a.smd','bad-b.smd']]
  with tempfile.TemporaryDirectory() as temp,patch.object(p,'HERE',Path(temp)),patch.object(p,'PRIVATE',Path(temp)/'private'),patch.object(p,'code_version',return_value='test-version'):
   p.PRIVATE.mkdir();p.atomic(p.PRIVATE/'catalog.json',{'files':rows})
   results=p.convert(argparse.Namespace(path=None,limit=None,workers=2,force=False))
   self.assertEqual(len(results),2);self.assertTrue(all(r['status']=='blocked' for r in results))
   self.assertTrue(json.loads((p.PRIVATE/'batch-results.json').read_text())['complete'])
 def test_force_refreshes_input_cache_when_metadata_unchanged(self):
  row=dict(root=p.CONFIG['primaryRoot'],path='asset.bin',bytes=3,ticks='1',sha256=None,extension='.bin',signature='')
  with tempfile.TemporaryDirectory() as temp,patch.object(p,'PRIVATE',Path(temp)):
   with patch.object(p.guest,'read',return_value=b'old') as fetch:
    self.assertEqual(p.Assets({'files':[row]}).fetch('asset.bin'),b'old');self.assertEqual(fetch.call_count,1)
   with patch.object(p.guest,'read',return_value=b'new') as fetch:
    self.assertEqual(p.Assets({'files':[row]}).fetch('asset.bin'),b'old');self.assertEqual(fetch.call_count,0)
    self.assertEqual(p.Assets({'files':[row]},force_read=True).fetch('asset.bin'),b'new');self.assertEqual(fetch.call_count,1)
 def test_remote_archive_cannot_escape_job_directory(self):
  import remote_executor as remote
  with tempfile.TemporaryDirectory() as temporary:
   root=Path(temporary);base=root/'queue';(base/'tasks').mkdir(parents=True);work=root/'work';(work/'source').mkdir(parents=True);(work/'source/input').write_bytes(b'fixture')
   original=remote.save
   def respond(path,state):
    original(path,state)
    if state.get('phase')=='pending':
     result=path.parent/'result.tar.gz'
     with tarfile.open(result,'w:gz') as tar:
      member=tarfile.TarInfo('../escaped');member.size=3;tar.addfile(member,io.BytesIO(b'bad'))
     original(path,{**state,'phase':'returned','worker':'test','resultSha256':hashlib.sha256(result.read_bytes()).hexdigest()})
   with patch.object(remote,'BASE',base),patch.object(remote,'active',return_value=True),patch.object(remote,'save',side_effect=respond):
    with self.assertRaisesRegex(ValueError,'Unsafe returned archive'):remote.execute(work,'static')
   self.assertFalse((root/'escaped').exists())
if __name__=='__main__':unittest.main()
