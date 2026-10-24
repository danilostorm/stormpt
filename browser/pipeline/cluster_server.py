"""Temporary authenticated LAN/Tailscale work queue. Stores all results on AEROCOOL."""
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
import hashlib,hmac,json,shutil,threading,time,uuid,urllib.parse
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'pipeline/private/cluster';CONFIG=json.loads((BASE/'config.json').read_text());LOCK=threading.Lock()
def save(path,value):
 temp=path.with_suffix('.'+uuid.uuid4().hex+'.tmp');temp.write_text(json.dumps(value));temp.replace(path)
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def authenticated(self):return hmac.compare_digest(self.headers.get('Authorization',''),'Bearer '+CONFIG['token'])
 def reply(self,status,data=None):
  raw=json.dumps(data).encode() if data is not None else b'';self.send_response(status);self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def do_GET(self):
  if not self.authenticated():return self.reply(403)
  parsed=urllib.parse.urlparse(self.path);query=urllib.parse.parse_qs(parsed.query);worker=query.get('worker',[''])[0]
  if parsed.path=='/runtime':
   path=BASE/'runtime.tar.gz';self.send_response(200);self.send_header('Content-Length',str(path.stat().st_size));self.end_headers()
   with path.open('rb') as f:shutil.copyfileobj(f,self.wfile)
   return
  if parsed.path!='/lease' or worker not in CONFIG['workers']:return self.reply(404)
  save(BASE/'workers'/(worker+'.json'),{'worker':worker,'lastSeen':time.time()})
  state=json.loads((BASE/'state.json').read_text())
  if not state['active']:return self.reply(410)
  with LOCK:
   for directory in sorted((BASE/'tasks').iterdir()):
    meta=directory/'state.json'
    if not meta.exists():continue
    task=json.loads(meta.read_text())
    if task['phase']!='pending':continue
    if worker.startswith('superframe') and (task['mode']=='stage' or task['bytes']>8*1024*1024):continue
    lease=uuid.uuid4().hex;task.update(phase='leased',worker=worker,lease=lease,leasedAt=time.time());save(meta,task);path=directory/'input.tar.gz'
    self.send_response(200);self.send_header('X-Task-Id',directory.name);self.send_header('X-Lease',lease);self.send_header('Content-Length',str(path.stat().st_size));self.end_headers()
    with path.open('rb') as f:shutil.copyfileobj(f,self.wfile)
    return
  return self.reply(204)
 def do_POST(self):
  if not self.authenticated():return self.reply(403)
  parsed=urllib.parse.urlparse(self.path);query=urllib.parse.parse_qs(parsed.query);taskid=query.get('task',[''])[0];worker=query.get('worker',[''])[0]
  if parsed.path!='/result' or len(taskid)!=32 or any(c not in '0123456789abcdef' for c in taskid):return self.reply(404)
  directory=BASE/'tasks'/taskid;meta=directory/'state.json'
  with LOCK:
   if not meta.exists():return self.reply(404)
   state=json.loads(meta.read_text())
   if state['phase']!='leased' or state.get('worker')!=worker or not hmac.compare_digest(state.get('lease',''),self.headers.get('X-Lease','')):return self.reply(409)
  length=int(self.headers.get('Content-Length','0'))
  if length<1 or length>512*1024*1024:return self.reply(413)
  temp=directory/'result.upload';remaining=length;sha=hashlib.sha256()
  with temp.open('wb') as output:
   while remaining:
    payload=self.rfile.read(min(1024*1024,remaining))
    if not payload:return self.reply(400)
    output.write(payload);sha.update(payload);remaining-=len(payload)
  if not hmac.compare_digest(sha.hexdigest(),self.headers.get('X-Content-Sha256','')):temp.unlink();return self.reply(400)
  with LOCK:
   current=json.loads(meta.read_text())
   if current['phase']!='leased':temp.unlink();return self.reply(409)
   temp.replace(directory/'result.tar.gz');current.update(phase='returned',resultSha256=sha.hexdigest(),returnedAt=time.time());save(meta,current)
  return self.reply(200,{'storedOnPrimary':True})
if __name__=='__main__':
 for part in ['tasks','workers']:(BASE/part).mkdir(exist_ok=True)
 tailnet=ThreadingHTTPServer(('100.99.136.79',3939),Handler);threading.Thread(target=tailnet.serve_forever,daemon=True).start()
 server=ThreadingHTTPServer(('192.168.30.10',3939),Handler);print('TEMPORARY_CLUSTER_QUEUE_READY',flush=True);server.serve_forever()
