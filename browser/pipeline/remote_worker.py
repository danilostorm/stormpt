"""Temporary container worker; sends outputs back before deleting its job copy."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,tarfile,time,urllib.request,urllib.error,uuid
config=json.loads(Path('/work/worker-config.json').read_text());ROOT=Path('/work/tasks');ROOT.mkdir(exist_ok=True)
class Response:
 def __init__(self,status,headers,path,directory):self.status=status;self.headers=headers;self.file=path.open('rb');self.directory=directory
 def read(self,*args):return self.file.read(*args)
 def close(self):self.file.close();shutil.rmtree(self.directory)
 def __enter__(self):return self
 def __exit__(self,*args):self.close()
def request(path,data=None,headers=None):
 from email.parser import Parser
 directory=Path('/work/http')/uuid.uuid4().hex;directory.mkdir(parents=True)
 auth=directory/'auth.cfg';auth.write_text('header = "Authorization: Bearer '+config['token']+'"\n');auth.chmod(0o600)
 body=directory/'body';header=directory/'headers';cmd=['curl','--silent','--show-error','--max-time','600','--config',str(auth),'--dump-header',str(header),'--output',str(body),'--write-out','%{http_code}',config['url']+path]
 for key,value in (headers or {}).items():cmd+=['--header',key+': '+value]
 if data is not None:
  payload=directory/'upload';payload.write_bytes(data);cmd+=['--data-binary','@'+str(payload)]
 result=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=650)
 if result.returncode:shutil.rmtree(directory);raise RuntimeError('Worker network request failed')
 status=int(result.stdout);parsed=Parser().parsestr('\n'.join(line for line in header.read_text().splitlines() if ':' in line))
 if status>=400:
  shutil.rmtree(directory);raise urllib.error.HTTPError(path,status,'HTTP request rejected',parsed,None)
 return Response(status,parsed,body,directory)
def extract(archive,destination):
 with tarfile.open(archive) as tar:
  for member in tar:
   path=Path(member.name)
   if path.is_absolute() or '..' in path.parts or member.issym() or member.islnk() or not(member.isfile() or member.isdir()):raise ValueError('Unsafe task archive')
   target=destination/path
   if member.isdir():target.mkdir(parents=True,exist_ok=True)
   else:
    target.parent.mkdir(parents=True,exist_ok=True)
    with tar.extractfile(member) as source,target.open('wb') as output:shutil.copyfileobj(source,output)
while True:
 try:response=request('/lease?worker='+config['worker'])
 except urllib.error.HTTPError as error:
  if error.code==410:break
  raise
 if response.status==204:response.close();time.sleep(2);continue
 taskid=response.headers['X-Task-Id'];lease=response.headers['X-Lease'];directory=ROOT/taskid;directory.mkdir();archive=directory/'input.tar.gz'
 with response,archive.open('wb') as output:shutil.copyfileobj(response,output)
 job=directory/'job';job.mkdir();extract(archive,job);requestPath=job/'request.json';data=json.loads(requestPath.read_text());data['work']=str(job);requestPath.write_text(json.dumps(data))
 try:
  with (job/'conversion.log').open('w') as log:subprocess.run(['python','/app/pipeline/worker.py',str(requestPath)],stdout=log,stderr=log,check=True,timeout=240)
  result=json.loads((job/'conversion.json').read_text());subprocess.run(['node','/app/pipeline/validate.mjs',result['output'],str(job/'validation.json')],check=True,timeout=90)
 except Exception as error:(job/'failure.json').write_text(json.dumps({'error':type(error).__name__+': '+str(error)}))
 output=directory/'result.tar.gz'
 with tarfile.open(output,'w:gz',compresslevel=1) as tar:
  for name in ['converted','conversion.json','validation.json','conversion.log','failure.json']:
   path=job/name
   if path.exists():tar.add(path,arcname=name)
 payload=output.read_bytes()
 try:
  with request('/result?worker='+config['worker']+'&task='+taskid,payload,{'X-Lease':lease,'X-Content-Sha256':hashlib.sha256(payload).hexdigest()}) as result:result.read()
  print(json.dumps({'worker':config['worker'],'task':taskid,'returnedToPrimary':True}),flush=True)
 finally:shutil.rmtree(directory)
print('WORKER_FINISHED_ALL_COPIES_RETURNED',flush=True)
