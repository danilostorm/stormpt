"""Generate bounded, per-run cleanup watchers; never removes unrelated paths."""
from pathlib import Path
import hashlib,json,secrets,uuid
ROOT=Path(__file__).resolve().parents[1]
def make():
 base=ROOT/'pipeline/private/cluster';c=json.loads((base/'config.json').read_text());run=c['run'];short=run.split('-',1)[1];plan=[];acks={}
 for node in ['ziel','superframe','oracle']:
  folder=('/var/tmp/' if node=='oracle' else '/mnt/user/appdata/')+run;watch='/tmp/'+run+'-cleanup-'+node;url='https://stormpt.hoststorm.com.br/_stormpt_batch_'+short if node=='ziel' else c['url'];taskid=uuid.uuid4().hex;lease=secrets.token_hex(16);task=base/'tasks'/taskid;task.mkdir();(task/'state.json').write_text(json.dumps({'phase':'leased','worker':node+'-cleanup','lease':lease}));acks[node]={'id':taskid}
  output=base/'cleanup-provision'/node;output.mkdir(parents=True,exist_ok=True);(output/'curl.cfg').write_text('header = "Authorization: Bearer '+c['token']+'"\n')
  script='''#!/bin/sh
set -eu
watch='''+watch+'''
root='''+folder+'''
run='''+run+'''
url='''+url+'''
while :; do
 if curl --fail --silent --show-error --max-time 20 --config "$watch/curl.cfg" "$url/runtime" -o "$watch/state"; then
  if grep -q "STORMPT_CLUSTER_CLOSED_$run" "$watch/state"; then break; fi
 fi
 sleep 15
done
docker ps -aq --filter label=stormpt.batch="$run" | while read cid; do docker rm -f "$cid" >/dev/null 2>&1 || true; done
sleep 2
docker image rm stormpt-batch:'''+short+''' >/dev/null 2>&1 || true
for attempt in 1 2 3 4 5; do rm -rf -- "$root"; [ ! -e "$root" ] && break; sleep 1; done
workspace=false; containers=false; image=false
[ ! -e "$root" ] && workspace=true
[ -z "$(docker ps -aq --filter label=stormpt.batch="$run")" ] && containers=true
if ! docker image inspect stormpt-batch:'''+short+''' >/dev/null 2>&1; then image=true; fi
printf '{"node":"'''+node+'''","workspaceRemoved":%s,"ownContainersRemoved":%s,"ownImageRemoved":%s}' "$workspace" "$containers" "$image" > "$watch/cleanup.json"
tar -cf "$watch/proof.tar" -C "$watch" cleanup.json
sha=$(sha256sum "$watch/proof.tar" | awk '{print $1}')
curl --fail --silent --show-error --max-time 40 --config "$watch/curl.cfg" --header 'X-Lease: '''+lease+'''\' --header "X-Content-Sha256: $sha" --data-binary "@$watch/proof.tar" "$url/result?worker='''+node+'''-cleanup&task='''+taskid+'''" >/dev/null
rm -rf -- "$watch"
echo AUXILIARY_CLEANUP_PROOF_RETURNED
'''
  (output/'watch.sh').write_text(script);plan.append({'server':node,'remoteRoot':watch,'files':str(output)})
 (base/'cleanup-acks.json').write_text(json.dumps(acks));(base/'cleanup-deployment-plan.json').write_text(json.dumps(plan,indent=2));return plan
if __name__=='__main__':print(json.dumps(make()))
