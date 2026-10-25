"""Generate one temporary cluster run. Deploy generated private folders via SSH connector."""
from pathlib import Path
import argparse,json,secrets,tarfile,uuid,shutil,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[1]
NODES=[{'server':'ziel','workers':['ziel-1','ziel-2'],'cpus':'4','memory':'5g','parent':'/mnt/user/appdata'}, {'server':'superframe','workers':['superframe-1'],'cpus':'1','memory':'768m','parent':'/mnt/user/appdata'}, {'server':'oracle','workers':['oracle-1'],'cpus':'2','memory':'3g','parent':'/var/tmp'}]
def runtime(base):
 with tarfile.open(base/'runtime.tar.gz','w:gz',compresslevel=1) as tar:
  tar.add(ROOT/'pipeline/Dockerfile.worker',arcname='Dockerfile')
  for path in (ROOT/'assets/converter').glob('*.py'):tar.add(path,arcname='app/assets/converter/'+path.name)
  for name in ['worker.py','remote_worker.py','validate.mjs']:tar.add(ROOT/'pipeline'/name,arcname='app/pipeline/'+name)
  tar.add(ROOT/'assets/validation/node_modules/gltf-validator',arcname='app/assets/validation/node_modules/gltf-validator')
def bootstrap(config,node,folder,url):
 run=config['run'];image='stormpt-batch:'+run.split('-',1)[1]
 script='''#!/bin/sh
set -eu
root='''+folder+'''
image='''+image+'''
base_present=0
docker image inspect python:3.11-slim-bookworm >/dev/null 2>&1 && base_present=1
cleanup(){
 docker ps -aq --filter label=stormpt.batch='''+run+''' | while read cid; do docker rm -f "$cid" >/dev/null 2>&1 || true; done
 docker image rm "$image" >/dev/null 2>&1 || true
 if [ "$base_present" = 0 ]; then docker image rm python:3.11-slim-bookworm >/dev/null 2>&1 || true; fi
 if [ -f "$root/.stormpt-owned" ] && [ "$(cat "$root/.stormpt-owned")" = "'''+run+'''" ]; then
  for attempt in 1 2 3; do rm -rf -- "$root"; [ ! -e "$root" ] && break; sleep 1; done
 fi
 if [ ! -e "$root" ]; then echo STORMPT_TEMP_WORKSPACE_CLEANED; else echo STORMPT_TEMP_CLEANUP_FAILED; fi
}
trap cleanup EXIT
mkdir -p "$root/runtime"
curl --fail --silent --show-error --config "$root/curl.cfg" "'''+url+'''/runtime" -o "$root/runtime.tar.gz"
tar -xzf "$root/runtime.tar.gz" -C "$root/runtime"
DOCKER_BUILDKIT=0 docker build --force-rm --label stormpt.batch='''+run+''' -t "$image" "$root/runtime"
'''
 for name in node['workers']:script+='docker run --rm --name '+run+'-'+name+' --label stormpt.batch='+run+' --cpus '+node['cpus']+' --memory '+node['memory']+' --mount type=bind,src="'+folder+'/'+name+'",dst=/work "$image" &\n'
 return script+'wait\n'
def prepare():
 base=ROOT/'pipeline/private/cluster'
 if (base/'state.json').exists():
  if json.loads((base/'state.json').read_text()).get('active'):raise RuntimeError('Existing cluster is active; do not replace its queue')
  if (base/'server.pid').exists():
   process=Path('/proc')/(base/'server.pid').read_text().strip()/'cmdline'
   if process.exists() and b'cluster_server.py' in process.read_bytes():raise RuntimeError('Previous cluster is still cleaning up')
  archive=ROOT/'pipeline/private/cluster-archive'/uuid.uuid4().hex;archive.parent.mkdir(parents=True,exist_ok=True);shutil.move(str(base),str(archive))
 base.mkdir(parents=True,exist_ok=True)
 run='stormpt-'+uuid.uuid4().hex[:12];short=run.split('-',1)[1];config={'run':run,'token':secrets.token_urlsafe(32),'workers':[w for n in NODES for w in n['workers']],'url':'http://192.168.30.10:3939'}
 (base/'config.json').write_text(json.dumps(config));(base/'config.json').chmod(0o600);(base/'state.json').write_text(json.dumps({'active':True}))
 for name in ['tasks','workers']:(base/name).mkdir(exist_ok=True)
 runtime(base);plan=[]
 for node in NODES:
  url='https://stormpt.hoststorm.com.br/_stormpt_batch_'+short if node['server']=='ziel' else config['url'];folder=node['parent']+'/'+run;output=base/'provision'/node['server'];output.mkdir(parents=True,exist_ok=True)
  (output/'.stormpt-owned').write_text(run+'\n');(output/'curl.cfg').write_text('header = "Authorization: Bearer '+config['token']+'"\n');(output/'bootstrap.sh').write_text(bootstrap(config,node,folder,url))
  for worker in node['workers']:
   target=output/worker;target.mkdir(exist_ok=True);(target/'worker-config.json').write_text(json.dumps({'worker':worker,'url':url,'token':config['token']}))
  plan.append({'server':node['server'],'localPrivateFiles':str(output),'remoteOwnedFolder':folder,'startCommand':'sh '+folder+'/bootstrap.sh'})
 (base/'deployment-plan.json').write_text(json.dumps(plan,indent=2))
 conf=Path('/mnt/user/appdata/stormpt-web-bridge/default.conf');previous=conf.read_text()
 if 'BEGIN STORMPT TEMP BATCH' in previous:raise RuntimeError('Previous temporary route has not been cleaned')
 block='    # BEGIN STORMPT TEMP BATCH '+short+'\n    location ^~ /_stormpt_batch_'+short+'/ {\n        proxy_pass http://192.168.30.10:3939/;\n        proxy_http_version 1.1;\n        proxy_buffering off;\n        client_max_body_size 512m;\n        proxy_read_timeout 650s;\n        add_header Cache-Control no-store always;\n    }\n    # END STORMPT TEMP BATCH '+short+'\n'
 (base/'nginx-before.conf').write_text(previous);conf.write_text(previous.replace('    server_tokens off;','    server_tokens off;\n'+block))
 try:
  subprocess.run(['docker','exec','stormpt-web-bridge','nginx','-t'],check=True)
  subprocess.run(['docker','exec','stormpt-web-bridge','nginx','-s','reload'],check=True)
 except Exception:conf.write_text(previous);raise
 with (base/'coordinator.log').open('w') as log:
  server=subprocess.Popen([sys.executable,'-u',str(ROOT/'pipeline/cluster_server.py')],cwd=ROOT,stdout=log,stderr=log,start_new_session=True)
 (base/'server.pid').write_text(str(server.pid));time.sleep(.5)
 if server.poll() is not None:raise RuntimeError('Coordinator failed to start; inspect private log')
 with (base/'cleanup.log').open('w') as log:subprocess.Popen([sys.executable,'-u',str(ROOT/'pipeline/cleanup_cluster.py')],cwd=ROOT,stdout=log,stderr=log,start_new_session=True)
 print(json.dumps({'run':run,'plan':str(base/'deployment-plan.json'),'nodes':len(plan)}))
if __name__=='__main__':prepare()
