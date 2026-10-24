"""Second, isolated pass for transient cache errors and unique native bindings."""
from pathlib import Path,PurePosixPath
import collections,concurrent.futures,hashlib,json,sys,time
import stormpt_pipeline as p
from plan_repairs import bindings_index,normalized,plan
ROOT=p.ROOT;ORIGINAL_PRIVATE=p.PRIVATE
class BoundAssets(p.Assets):
 bindings={}
 def fetch(self,path,required=True):
  safe=p.relative(path);key=safe.lower();row=self.meta(safe)
  if row is None and key.endswith('.inx'):
   model=str(PurePosixPath(key).with_suffix('.smd'));matches=self.bindings.get(model,[])
   if len(matches)==1:
    payload=super().fetch(matches[0],required=True)
    actual=normalized(str(PurePosixPath(payload[:64].split(b'\0')[0].decode('ascii').replace('\\','/')).with_suffix('.smd')))
    if actual!=model:raise ValueError('Configuration model reference changed after indexing')
    return payload
  try:return super().fetch(path,required)
  except OSError as error:
   if error.errno!=116:raise
   row=self.meta(safe)
   if row is None:raise
   if row['bytes']>p.CONFIG['maxSourceBytes']:raise ValueError('Source exceeds byte limit')
   raw=p.guest.read(p.CONFIG['primaryRoot']+'/'+row['path'])
   if len(raw)!=row['bytes'] or (row.get('sha256') and hashlib.sha256(raw).hexdigest()!=row['sha256']):raise ValueError('Source changed after catalog')
   return raw
def main():
 task=json.loads((ORIGINAL_PRIVATE/'bindings-task.json').read_text())
 try:bindings=json.loads(p.guest.read('C:/StormPT-2703/BrowserQA/pipeline-bindings.json'))
 except Exception:
  p.poll(task['pid'],time.monotonic()+1800);bindings=json.loads(p.guest.read('C:/StormPT-2703/BrowserQA/pipeline-bindings.json'))
 p.atomic(ORIGINAL_PRIVATE/'bindings.json',bindings)
 while True:
  try:batch=json.loads((ORIGINAL_PRIVATE/'batch-results.json').read_text())
  except (OSError,json.JSONDecodeError):time.sleep(1);continue
  if batch['complete']:break
  time.sleep(5)
 repairs=plan(batch['results'],bindings);eligible={x['source'] for x in repairs if x['category'] in ['transient_cache_retry','unambiguous_native_binding','object_format_variant']}
 catalog=json.loads((ORIGINAL_PRIVATE/'catalog.json').read_text());rows=[r for r in catalog['files'] if r['root']==p.CONFIG['primaryRoot'] and r['path'].replace('\\','/') in eligible]
 BoundAssets.bindings=bindings_index(bindings);p.Assets=BoundAssets;p.PRIVATE=ORIGINAL_PRIVATE/'repair-round-1';p.PRIVATE.mkdir(exist_ok=True)
 version=p.code_version()+'-native-binding-repair-'+hashlib.sha256(Path(__file__).read_bytes()+(ROOT/'pipeline/legacy_normal_compat.py').read_bytes()).hexdigest()[:12];results=[]
 import legacy_normal_compat
 legacy_normal_compat.install()
 runtime=p.PRIVATE/'runtime';runtime.mkdir(exist_ok=True)
 shim="import sys\nfrom pathlib import Path\nsys.path.insert(0,"+repr(str(ROOT/'pipeline'))+")\nimport legacy_normal_compat;legacy_normal_compat.install()\nimport worker;worker.main()\n"
 (runtime/'worker.py').write_text(shim);(runtime/'validate.mjs').write_text((ROOT/'pipeline/validate.mjs').read_text())
 # Keep the validator's original relative node_modules path from its real directory.
 (runtime/'validate.mjs').write_text("import "+repr(str(ROOT/'pipeline/validate.mjs'))+";\n")
 p.HERE=runtime
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  futures=[pool.submit(p.convert_one,row,catalog,version) for row in rows]
  for future in concurrent.futures.as_completed(futures):
   result=future.result();results.append(result);p.atomic(p.PRIVATE/'batch-results.json',{'results':results,'total':len(rows),'complete':len(results)==len(rows),'elapsedSeconds':0})
   print(json.dumps({'repairedDone':len(results),'repairTotal':len(rows),'source':result['source'],'status':result['status']}),flush=True)
 summary={'nativeBindingsIndexed':len(bindings),'eligible':len(rows),'processed':len(results),'counts':dict(collections.Counter(r['status'] for r in results)),'activeInGame':False,'auxiliaryMachinesUsed':False}
 p.atomic(ROOT/'pipeline/repair-results-summary.json',summary)
 if any(r['status']=='validated_candidate' for r in results):p.publish()
 print(json.dumps(summary),flush=True)
if __name__=='__main__':main()
