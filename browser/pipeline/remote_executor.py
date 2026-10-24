"""Offload prepared conversion tasks; retain local fallback and validate on primary."""
from pathlib import Path
import hashlib,json,shutil,tarfile,time,uuid,threading
BASE=Path(__file__).resolve().parent/'private/cluster';LOCAL=threading.BoundedSemaphore(2)
def save(path,data):
 temp=path.with_suffix('.'+uuid.uuid4().hex+'.tmp');temp.write_text(json.dumps(data));temp.replace(path)
def active():
 if not (BASE/'config.json').exists():return False
 try:
  if not json.loads((BASE/'state.json').read_text())['active']:return False
  return any(time.time()-json.loads(p.read_text())['lastSeen']<15 for p in (BASE/'workers').glob('*.json'))
 except Exception:return False
def execute(work,mode):
 if not active():return False
 taskid=uuid.uuid4().hex;directory=BASE/'tasks'/taskid;directory.mkdir(parents=True);request=work/'remote-request.json';request.write_text(json.dumps({'work':'/job','mode':mode}))
 with tarfile.open(directory/'input.tar.gz','w:gz',compresslevel=1) as tar:
  tar.add(work/'source',arcname='source');tar.add(request,arcname='request.json')
  for name in ['converted','validation']:
   entry=tarfile.TarInfo(name);entry.type=tarfile.DIRTYPE;entry.mode=0o755;tar.addfile(entry)
 save(directory/'state.json',{'phase':'pending','mode':mode,'bytes':(directory/'input.tar.gz').stat().st_size,'at':time.time()})
 deadline=time.monotonic()+600;claimDeadline=time.monotonic()+20
 while time.monotonic()<deadline:
  state=json.loads((directory/'state.json').read_text())
  if state['phase']=='pending' and time.monotonic()>claimDeadline:save(directory/'state.json',{**state,'phase':'cancelled'});return False
  if state['phase']=='returned':
   archive=directory/'result.tar.gz'
   if hashlib.sha256(archive.read_bytes()).hexdigest()!=state['resultSha256']:raise ValueError('Remote transport hash mismatch')
   with tarfile.open(archive) as tar:
    for member in tar:
     path=Path(member.name)
     if path.is_absolute() or '..' in path.parts or member.issym() or member.islnk() or not(member.isfile() or member.isdir()):raise ValueError('Unsafe returned archive')
     if path.parts[0] not in ['converted','conversion.json','validation.json','conversion.log','failure.json']:raise ValueError('Unexpected returned file')
     target=work/path
     if member.isdir():target.mkdir(parents=True,exist_ok=True)
     else:
      target.parent.mkdir(parents=True,exist_ok=True)
      with tar.extractfile(member) as source,target.open('wb') as output:shutil.copyfileobj(source,output)
   if (work/'failure.json').exists():return False
   result=json.loads((work/'conversion.json').read_text());result['output']=str(work/'converted'/Path(result['output']).name);result['worker']=state['worker'];(work/'conversion.json').write_text(json.dumps(result));save(directory/'state.json',{**state,'phase':'copied_to_primary'});return True
  time.sleep(.5)
 state=json.loads((directory/'state.json').read_text());save(directory/'state.json',{**state,'phase':'cancelled'});return False
def close():
 if (BASE/'state.json').exists():save(BASE/'state.json',{'active':False,'closedAt':time.time()})
