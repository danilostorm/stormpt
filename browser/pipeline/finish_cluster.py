"""Signal auxiliary cleanup and collect proof archives back on the primary."""
from pathlib import Path
import hashlib,json,tarfile,time
root=Path(__file__).resolve().parents[1];base=root/'pipeline/private/cluster';config=json.loads((base/'config.json').read_text());acks=json.loads((base/'cleanup-acks.json').read_text())
while json.loads((base/'state.json').read_text())['active']:time.sleep(3)
(base/'runtime.tar.gz').write_bytes(('STORMPT_CLUSTER_CLOSED_'+config['run']).encode())
end=time.monotonic()+75;proofs={}
while time.monotonic()<end:
 for node,task in acks.items():
  if node in proofs:continue
  directory=base/'tasks'/task['id'];state=json.loads((directory/'state.json').read_text())
  if state['phase']!='returned':continue
  archive=directory/'result.tar.gz'
  if hashlib.sha256(archive.read_bytes()).hexdigest()!=state['resultSha256']:continue
  with tarfile.open(archive) as tar:
   member=tar.getmember('cleanup.json')
   if not member.isfile() or member.size>4096:raise ValueError('Invalid cleanup proof')
   proof=json.load(tar.extractfile(member))
  proofs[node]=proof
 if len(proofs)==len(acks):break
 time.sleep(2)
summary={'run':config['run'],'nodes':proofs,'allAuxiliaryWorkspacesVerifiedRemoved':len(proofs)==len(acks) and all(p.get('workspaceRemoved') and p.get('ownContainersRemoved') and p.get('ownImageRemoved') for p in proofs.values()),'primaryRetained':True}
(root/'pipeline/cluster-node-cleanup-summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary),flush=True)
