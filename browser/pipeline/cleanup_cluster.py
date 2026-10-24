"""Remove this run's temporary queue route after batch workers have exited."""
from pathlib import Path
import json,os,re,signal,subprocess,time
root=Path(__file__).resolve().parents[1];base=root/'pipeline/private/cluster';config=json.loads((base/'config.json').read_text());short=config['run'].split('-',1)[1]
while json.loads((base/'state.json').read_text())['active']:time.sleep(5)
# Workers receive HTTP 410 and their host bootstrap traps remove owned resources.
time.sleep(90)
p=Path('/mnt/user/appdata/stormpt-web-bridge/default.conf');before=p.read_text();pattern=r'    # BEGIN STORMPT TEMP BATCH '+re.escape(short)+r'\n.*?    # END STORMPT TEMP BATCH '+re.escape(short)+r'\n';after,count=re.subn(pattern,'',before,flags=re.S)
if count:
 p.write_text(after)
 try:
  subprocess.run(['docker','exec','stormpt-web-bridge','nginx','-t'],check=True)
  subprocess.run(['docker','exec','stormpt-web-bridge','nginx','-s','reload'],check=True)
 except Exception:p.write_text(before);raise
pidfile=base/'server.pid';stopped=False
if pidfile.exists():
 pid=int(pidfile.read_text());cmd=Path('/proc')/str(pid)/'cmdline'
 if cmd.exists() and b'pipeline/cluster_server.py' in cmd.read_bytes():os.kill(pid,signal.SIGTERM);stopped=True
summary={'run':config['run'],'queueRouteRemoved':count==1 or 'STORMPT TEMP BATCH '+short not in after,'queueStopped':stopped,'auxiliaryCleanup':'host bootstrap traps; verify job completion markers','primaryRetained':True}
(root/'pipeline/cluster-cleanup-summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary),flush=True)
