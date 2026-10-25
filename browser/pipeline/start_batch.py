"""Wait for the current inventory, then process all primary-client SMD files."""
from pathlib import Path
import subprocess,sys,time,json
root=Path(__file__).resolve().parents[1];private=root/'pipeline/private';deadline=time.monotonic()+1800
while not (private/'catalog.json').exists():
 if time.monotonic()>deadline:raise TimeoutError('Catalog not available within 30 minutes')
 time.sleep(3)
command=[sys.executable,str(root/'pipeline/stormpt_pipeline.py'),'--wait-lock']
try:
 subprocess.run(command+['test'],cwd=root,check=True)
 subprocess.run(command+['convert','--workers','6'],cwd=root,check=True)
 subprocess.run(command+['report'],cwd=root,check=True)
 subprocess.run(command+['publish'],cwd=root,check=True)
 print('FULL_PRIMARY_CLIENT_BATCH_FINISHED',flush=True)
finally:
 sys.path.insert(0,str(root/'pipeline'))
 import remote_executor
 remote_executor.close()
