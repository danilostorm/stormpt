#!/usr/bin/env python3
"""Resumable StormPT asset pipeline; no SQL access and no GameServer restarts."""
from pathlib import Path,PurePosixPath
import argparse,base64,concurrent.futures,datetime,fcntl,hashlib,json,os,subprocess,sys,time,uuid,threading
ROOT=Path(__file__).resolve().parents[1];HERE=ROOT/'pipeline';PRIVATE=HERE/'private';PRIVATE.mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT/'native-auth'));sys.path.insert(0,str(ROOT/'assets/converter'))
import qga_dev as guest
CONFIG=json.loads((HERE/'config.json').read_text());LOCK=threading.Lock()
def atomic(path,value):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_name(path.name+'.'+uuid.uuid4().hex+'.tmp');temp.write_text(json.dumps(value,ensure_ascii=False,indent=2));temp.replace(path)
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def relative(value):
 value=value.replace('\\','/');p=PurePosixPath(value)
 if p.is_absolute() or ':' in value or '..' in p.parts or not value or '\0' in value:raise ValueError('Unsafe asset reference')
 return str(p)
def code_version():
 paths=sorted((ROOT/'assets/converter').glob('*.py'))+[HERE/'worker.py',HERE/'stormpt_pipeline.py',HERE/'validate.mjs']
 return hashlib.sha256(b''.join(p.name.encode()+p.read_bytes() for p in paths)).hexdigest()
def poll(pid,deadline):
 while time.monotonic()<deadline:
  state=guest.q({'execute':'guest-exec-status','arguments':{'pid':pid}})
  if state.get('exited'):
   if state.get('exitcode'):raise RuntimeError(base64.b64decode(state.get('err-data','')).decode(errors='replace'))
   return state
  time.sleep(2)
 raise TimeoutError('Guest task still running; PID recorded for resume')
def catalog():
 config='C:/StormPT-2703/BrowserQA/pipeline-config.json';output='C:/StormPT-2703/BrowserQA/pipeline-catalog.json'
 guest.write(config,(HERE/'config.json').read_bytes());script=(HERE/'catalog.ps1').read_text().split('\n',1)[1]
 pid=guest.run("$ConfigPath='"+config+"';$OutputPath='"+output+"';\n"+script,wait=False)
 atomic(PRIVATE/'catalog-task.json',{'pid':pid,'output':output});poll(pid,time.monotonic()+1800)
 data=json.loads(guest.read(output));atomic(PRIVATE/'catalog.json',data);summarize_catalog(data);return data
def collect_catalog():
 task=json.loads((PRIVATE/'catalog-task.json').read_text());poll(task['pid'],time.monotonic()+1800);data=json.loads(guest.read(task['output']));atomic(PRIVATE/'catalog.json',data);summarize_catalog(data);return data
def summarize_catalog(data):
 from collections import Counter
 summary={'createdAt':data['createdAt'],'files':len(data['files']),'bytes':sum(x['bytes'] for x in data['files']),'extensions':dict(Counter(x['extension'] for x in data['files'])),'formats':dict(Counter(x['signature'] for x in data['files'] if x['signature'])),'roots':{r:sum(x['root']==r for x in data['files']) for r in CONFIG['catalogRoots']}}
 atomic(HERE/'catalog-summary.json',summary);print(json.dumps(summary),flush=True)
class Assets:
 def __init__(self,data,force_read=False):
  with LOCK:
   if '_lookup' not in data:data['_lookup']={(x['root'].lower(),relative(x['path']).lower()):x for x in data['files']}
  self.index=data['_lookup'];self.primary=CONFIG['primaryRoot'];self.deps={};self.force_read=force_read
 def meta(self,path):
  path=relative(path);row=self.index.get((self.primary.lower(),path.lower()));self.deps[path.lower()]=row
  return row
 def fetch(self,path,required=True):
  row=self.meta(path)
  if row is None:
   if required:raise FileNotFoundError('Client dependency absent: '+path)
   return None
  if row['bytes']>CONFIG['maxSourceBytes']:raise ValueError('Source exceeds configured byte limit: '+path)
  key=hashlib.sha256(json.dumps(row,sort_keys=True).encode()).hexdigest();cache=PRIVATE/'input-cache'/key
  if self.force_read or not cache.exists():
   payload=guest.read(self.primary+'/'+row['path']);expected=row.get('sha256')
   if len(payload)!=row['bytes'] or (expected and hashlib.sha256(payload).hexdigest()!=expected):raise ValueError('Source changed after catalog: '+path)
   cache.parent.mkdir(exist_ok=True);temp=cache.with_name(key+'.'+uuid.uuid4().hex);temp.write_bytes(payload);temp.replace(cache)
  return cache.read_bytes()
def convert_one(row,index,version,force=False):
 asset=Assets(index,force_read=force);source=relative(row['path']);jobid=hashlib.sha256((row['root'].lower()+'/'+source.lower()).encode()).hexdigest()[:24];work=PRIVATE/'jobs'/jobid;resultpath=work/'result.json';work.mkdir(parents=True,exist_ok=True)
 if resultpath.exists() and not force:
  prior=json.loads(resultpath.read_text())
  if prior.get('converterVersion')==version and all(asset.index.get((asset.primary.lower(),p))==v for p,v in prior.get('dependencies',{}).items()):
   output=Path(prior.get('output','/nonexistent'))
   if prior['status']!='validated_candidate' or (output.is_file() and digest(output)==prior.get('outputSha256')):
    prior['cached']=True;return prior
 result={'id':jobid,'source':source,'sourceSha256':row.get('sha256'),'converterVersion':version,'cached':False,'status':'blocked','gameplayReady':False}
 try:
  signature=row['signature'];mode='stage' if signature=='SMD Stage data Ver 0.72' else 'model' if signature=='SMD Model data Ver 0.62' else None
  asset.meta(source)
  if mode is None:raise ValueError('Unsupported file format: '+repr(signature))
  for part in ['source','source/textures','converted','validation']:(work/part).mkdir(parents=True,exist_ok=True)
  raw=asset.fetch(source);result['sourceSha256']=hashlib.sha256(raw).hexdigest();(work/'source/asset.smd').write_bytes(raw)
  if mode=='stage':
   from materials import materials
   rows=materials(raw)
  else:
   from model_glb import inspect_model
   from model_materials import materials_model
   info=inspect_model(raw);rows=materials_model(raw)
   if any(o['physique'] for o in info['objects']):
    configPath=str(PurePosixPath(source).with_suffix('.inx'));cfg=asset.fetch(configPath);(work/'source/asset.inx').write_bytes(cfg)
    bonePath=relative(cfg[64:128].split(b'\0')[0].decode('ascii'));bonePath=str(PurePosixPath(bonePath).with_suffix('.smb'));bone=asset.fetch(bonePath);(work/'source'/PurePosixPath(bonePath).name).write_bytes(bone);mode='idle'
   else:mode='static'
  for material in rows:
   for texture in material['textures'][:1]:
    payload=asset.fetch(texture,required=False)
    if payload is not None:
     dest=work/'source/textures'/relative(texture);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(payload)
  request=work/'request.json';atomic(request,{'work':str(work),'mode':mode})
  import remote_executor
  remote=False
  if (PRIVATE/'cluster/config.json').exists():remote=remote_executor.execute(work,mode)
  if not remote:
   with remote_executor.LOCAL, (work/'conversion.log').open('w') as log:
    subprocess.run([sys.executable,str(HERE/'worker.py'),str(request)],stdout=log,stderr=log,check=True,timeout=CONFIG['jobTimeoutSeconds'])
  converted=json.loads((work/'conversion.json').read_text());output=Path(converted['output'])
  subprocess.run(['node',str(HERE/'validate.mjs'),str(output),str(work/'validation.json')],check=True,timeout=CONFIG['validationTimeoutSeconds'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  validation=json.loads((work/'validation.json').read_text());result.update(converted,status='validated_candidate',outputSha256=digest(output),outputBytes=output.stat().st_size,validationErrors=validation['numErrors'],validationWarnings=validation['numWarnings'])
 except Exception as error:
  result['error']=type(error).__name__+': '+str(error)
  if (work/'conversion.log').exists():result['logTail']=(work/'conversion.log').read_text(errors='replace')[-1800:]
 result['dependencies']=asset.deps;result['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();atomic(resultpath,result);return result
def convert(args):
 if args.limit is not None and args.limit<1:raise ValueError('Limit must be positive')
 data=json.loads((PRIVATE/'catalog.json').read_text());rows=[x for x in data['files'] if x['root'].lower()==CONFIG['primaryRoot'].lower() and x['extension']=='.smd']
 if args.path:rows=[x for x in rows if args.path.lower() in relative(x['path']).lower()]
 rows.sort(key=lambda r:(r['bytes'],r['path'].lower()))
 if args.limit:rows=rows[:args.limit]
 version=code_version();results=[];started=time.time();workers=args.workers or CONFIG['workers']
 if not 1<=workers<=8:raise ValueError('Workers must be between 1 and 8')
 with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
  futures={pool.submit(convert_one,row,data,version,args.force):row for row in rows}
  for future in concurrent.futures.as_completed(futures):
   try:result=future.result()
   except Exception as e:result={'source':futures[future]['path'],'status':'worker_failure','error':repr(e)}
   results.append(result);atomic(PRIVATE/'batch-results.json',{'results':results,'total':len(rows),'elapsedSeconds':round(time.time()-started,1),'complete':len(results)==len(rows)})
   print(json.dumps({'done':len(results),'total':len(rows),'source':result['source'],'status':result['status'],'cached':result.get('cached',False)}),flush=True)
 report()
 if (PRIVATE/'cluster/config.json').exists():
  import remote_executor
  remote_executor.close()
 return results
def report():
 from collections import Counter
 data=json.loads((PRIVATE/'batch-results.json').read_text());rows=data['results'];counts=dict(Counter(r['status'] for r in rows));errors=Counter(r.get('error','').split(':',1)[0] for r in rows if r['status']!='validated_candidate')
 summary={'complete':data['complete'],'processed':len(rows),'total':data['total'],'counts':counts,'cached':sum(r.get('cached',False) for r in rows),'elapsedSeconds':data['elapsedSeconds'],'failureClasses':dict(errors),'gameplayReady':False}
 atomic(HERE/'batch-summary.json',summary)
 lines=['# StormPT — lote de conversão','',json.dumps(summary,ensure_ascii=False),'','Arquivos validados são candidatos de arte: não implementam combate, lojas ou integração de mapas. Nenhum candidato é ativado automaticamente no jogo.','','| Arquivo | Resultado | Motivo / observação |','|---|---|---|']
 for row in sorted(rows,key=lambda x:x['source']):
  message=row.get('error','; '.join(row.get('notes',[]))).replace('|','/').replace('\n',' ')
  lines.append('| '+row['source'].replace('|','/')+' | '+row['status']+' | '+message+' |')
 (HERE/'BATCH_REPORT.md').write_text('\n'.join(lines)+'\n');print(json.dumps(summary),flush=True)
def validate():
 path=PRIVATE/'batch-results.json';batch=json.loads(path.read_text())
 for row in batch['results']:
  if row['status']!='validated_candidate':continue
  output=Path(row['output'])
  try:
   if digest(output)!=row['outputSha256']:raise ValueError('Output changed; reconvert before publishing')
   reportPath=output.parent.parent/'validation.json'
   subprocess.run(['node',str(HERE/'validate.mjs'),str(output),str(reportPath)],check=True,timeout=CONFIG['validationTimeoutSeconds'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   issues=json.loads(reportPath.read_text());row['validationErrors']=issues['numErrors'];row['validationWarnings']=issues['numWarnings']
  except Exception as error:row['status']='blocked';row['error']=type(error).__name__+': '+str(error)
 atomic(path,batch);report()
def publish():
 data=json.loads((PRIVATE/'batch-results.json').read_text());release=[]
 for row in data['results']:
  if row['status']!='validated_candidate' or row.get('validationErrors')!=0:continue
  path=Path(row['output'])
  if digest(path)!=row['outputSha256']:raise ValueError('Output changed after validation: '+row['source'])
  release.append({'source':row['source'],'id':'batch-'+row['outputSha256'][:24],'sha256':row['outputSha256'],'bytes':path.stat().st_size,'path':str(path)})
 if not release:raise RuntimeError('No validated assets to publish')
 destination=CONFIG['guestReleaseRoot'];guest.run("New-Item -ItemType Directory -Force '"+destination+"' | Out-Null")
 for row in release:
  remote=destination+'/'+row['id']+'.glb'
  try:alreadyPresent=hashlib.sha256(guest.read(remote)).hexdigest()==row['sha256']
  except Exception:alreadyPresent=False
  if not alreadyPresent:
   guest.write(remote,Path(row['path']).read_bytes())
   if hashlib.sha256(guest.read(remote)).hexdigest()!=row['sha256']:raise ValueError('Guest copy hash mismatch')
 releaseId=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8];manifest={'release':releaseId,'activeInGame':False,'assets':[{k:v for k,v in r.items() if k!='path'} for r in release]}
 guest.write(destination+'/release-'+releaseId+'.json',json.dumps(manifest,indent=2).encode());atomic(PRIVATE/('release-'+releaseId+'.json'),manifest)
 print(json.dumps({'publishedValidatedCandidates':len(release),'activeInGame':False,'release':releaseId}),flush=True)
def tests():
 results=[]
 for i,command in enumerate(CONFIG['testCommands']):
  with (PRIVATE/f'tests-{i}.log').open('w') as log:p=subprocess.run(command,cwd=ROOT,stdout=log,stderr=log,timeout=180)
  results.append({'command':command,'exitCode':p.returncode})
 atomic(HERE/'test-summary.json',results)
 if any(r['exitCode'] for r in results):raise RuntimeError('Regression check failed; inspect private test logs')
 print('REGRESSION_CHECKS_PASSED',flush=True)
def build_native():
 script=(HERE/'build-native.ps1').read_text()
 pid=guest.run(script,wait=False);atomic(PRIVATE/'native-build-task.json',{'pid':pid});poll(pid,time.monotonic()+1800)
 result=json.loads(guest.read('C:/StormPT-2703/BrowserQA/pipeline-native-build.json'));atomic(HERE/'native-build-summary.json',result);print(json.dumps(result),flush=True)
def status():
 value={}
 for name in ['catalog-summary.json','batch-summary.json','test-summary.json','integration-summary.json']:
  path=HERE/name
  if path.exists():value[name]=json.loads(path.read_text())
 path=PRIVATE/'batch-results.json'
 if path.exists():
  batch=json.loads(path.read_text());value['liveBatch']={'complete':batch['complete'],'processed':len(batch['results']),'total':batch['total']}
 path=PRIVATE/'catalog-task.json'
 if path.exists():
  task=json.loads(path.read_text())
  try:
   state=guest.q({'execute':'guest-exec-status','arguments':{'pid':task['pid']}});value['catalogTask']={'pid':task['pid'],'exited':state.get('exited',False),'exitCode':state.get('exitcode')}
  except Exception:value['catalogTask']={'pid':task['pid'],'status':'check catalog output'}
  try:
   progress=json.loads(guest.read(task['output']+'.progress.json'))
   if progress.get('pid')==task['pid']:value['catalogProgress']=progress
  except Exception:pass
 print(json.dumps(value,ensure_ascii=False,indent=2))
def main():
 parser=argparse.ArgumentParser();parser.add_argument('command',choices=['catalog','collect-catalog','convert','report','validate','publish','test','build','status','run']);parser.add_argument('--path');parser.add_argument('--limit',type=int);parser.add_argument('--workers',type=int);parser.add_argument('--force',action='store_true');parser.add_argument('--publish',action='store_true');parser.add_argument('--native-build',action='store_true');parser.add_argument('--wait-lock',action='store_true');args=parser.parse_args()
 if args.command=='status':status();return
 with (PRIVATE/'pipeline.lock').open('w') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX if args.wait_lock else fcntl.LOCK_EX|fcntl.LOCK_NB)
  if args.command=='catalog':catalog()
  elif args.command=='collect-catalog':collect_catalog()
  elif args.command=='convert':convert(args)
  elif args.command=='report':report()
  elif args.command=='publish':publish()
  elif args.command=='validate':validate()
  elif args.command=='test':tests()
  elif args.command=='build':build_native()
  else:
   catalog();convert(args);tests()
   if args.native_build:build_native()
   if args.publish:publish()
if __name__=='__main__':main()
