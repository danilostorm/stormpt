# Private VM development helper. Never reads credentials.
import json,subprocess,base64,time
def q(x):
 r=subprocess.run(['virsh','qemu-agent-command','Windows 11',json.dumps(x)],capture_output=True,text=True,check=True)
 return json.loads(r.stdout)['return']
def read(path):
 h=q({'execute':'guest-file-open','arguments':{'path':path,'mode':'rb'}}); data=b''
 try:
  while True:
   d=q({'execute':'guest-file-read','arguments':{'handle':h,'count':262144}})
   data+=base64.b64decode(d.get('buf-b64',''))
   if d.get('eof') or not d.get('count'): return data
 finally:q({'execute':'guest-file-close','arguments':{'handle':h}})
def write(path,data):
 h=q({'execute':'guest-file-open','arguments':{'path':path,'mode':'wb'}})
 try:
  for i in range(0,len(data),49152):
   b=data[i:i+49152]
   d=q({'execute':'guest-file-write','arguments':{'handle':h,'buf-b64':base64.b64encode(b).decode()}})
   if d['count']!=len(b):raise RuntimeError('Short write')
 finally:q({'execute':'guest-file-close','arguments':{'handle':h}})
def run(ps,wait=True):
 p=q({'execute':'guest-exec','arguments':{'path':r'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe','arg':['-NoProfile','-Command',ps],'capture-output':True}})['pid']
 if not wait:return p
 for i in range(160):
  d=q({'execute':'guest-exec-status','arguments':{'pid':p}})
  if d.get('exited'):
   out=base64.b64decode(d.get('out-data','')).decode('utf-8','replace')
   err=base64.b64decode(d.get('err-data','')).decode('utf-8','replace')
   if d.get('exitcode'):raise RuntimeError(out+err)
   return out+err
  time.sleep(.25)
 raise RuntimeError('Still running '+str(p))
