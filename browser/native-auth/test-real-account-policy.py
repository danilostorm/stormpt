import subprocess,json,base64,time,os
from pathlib import Path
r=Path('/mnt/user/appdata/stormpt-browser')
env=dict(os.environ,STORMPT_QA_SITE_BASE='http://192.168.30.169')
subprocess.run(['python3',str(r/'native-auth/fetch-real-tickets.py')],env=env,check=True)
def ps(code):
 q={'execute':'guest-exec','arguments':{'path':r'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe','arg':['-NoProfile','-Command',code],'capture-output':True}}
 p=subprocess.run(['virsh','qemu-agent-command','Windows 11',json.dumps(q)],capture_output=True,text=True,check=True)
 pid=json.loads(p.stdout)['return']['pid']
 for i in range(100):
  out=subprocess.run(['virsh','qemu-agent-command','Windows 11',json.dumps({'execute':'guest-exec-status','arguments':{'pid':pid}})],capture_output=True,text=True,check=True)
  d=json.loads(out.stdout)['return']
  if d.get('exited'):
   for key in ['out-data','err-data']:
    if key in d:print(base64.b64decode(d[key]).decode('utf-8','replace'))
   if d.get('exitcode')!=0:raise RuntimeError('QA account flag operation failed')
   return
  time.sleep(.1)
 raise RuntimeError('QA account flag operation timed out')
prefix=r"""$ErrorActionPreference='Stop';$u=[IO.File]::ReadAllText('C:\StormPT-2703\BrowserSecrets\qa-account.txt').Trim();if($u -notmatch '^webqa1023[0-9a-f]{6}$'){throw 'Only the isolated QA account may be changed'};$c=New-Object Data.SqlClient.SqlConnection 'Server=.\SQLEXPRESS;Database=AccountDB;Integrated Security=True;Encrypt=False';$c.Open();try{$cmd=$c.CreateCommand();[void]$cmd.Parameters.Add('@u',[Data.SqlDbType]::VarChar,32);$cmd.Parameters['@u'].Value=$u;"""
block=prefix+r"""$cmd.CommandText="UPDATE dbo.AllGameUser SET BlockChk='1' WHERE userid=@u AND BlockChk='0';SELECT @@ROWCOUNT";$n=$cmd.ExecuteScalar();if($n -ne 1){throw 'QA account must initially be unblocked'};Write-Output 'QA_ACCOUNT_TEMPORARILY_BLOCKED'}finally{$c.Close()}"""
restore=prefix+r"""$cmd.CommandText="UPDATE dbo.AllGameUser SET BlockChk='0' WHERE userid=@u AND BlockChk='1';SELECT BlockChk FROM dbo.AllGameUser WHERE userid=@u";$v=$cmd.ExecuteScalar();if([string]$v -ne '0'){throw 'QA account flag restoration failed'};Write-Output 'QA_ACCOUNT_ORIGINAL_FLAG_RESTORED_0'}finally{$c.Close()}"""
try:
 ps(block)
 subprocess.run(['node',str(r/'native-auth/test-real-security.mjs'),'blocked'],check=True)
finally:ps(restore)
