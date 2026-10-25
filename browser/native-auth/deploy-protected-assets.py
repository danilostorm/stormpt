from pathlib import Path
from qga_dev import write,run
r=Path('/mnt/user/appdata/stormpt-browser')
print(run(r"""$ErrorActionPreference='Stop';$d='C:\StormPT-2703\BrowserAssets';New-Item -ItemType Directory -Force $d | Out-Null; & icacls $d /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' 'IIS AppPool\StormPTSite:(OI)(CI)RX' | Out-Null; if($LASTEXITCODE -ne 0){throw 'Asset ACL failed'};New-Item -ItemType Directory -Force 'C:\inetpub\stormpt\jogar-beta\vendor' | Out-Null"""))
for name in ['Ricarten.textured.glb','tmbB01.bind.textured.glb','tmh-B01.bind.textured.glb']:
 data=(r/'assets/converted'/name).read_bytes()
 write('C:\\StormPT-2703\\BrowserAssets\\'+name,data);print('Protected asset copied',name,len(data),flush=True)
base=r/'assets/validation/node_modules/three'
for source,name in [('build/three.module.js','three.module.js'),('build/three.core.js','three.core.js'),('examples/jsm/loaders/GLTFLoader.js','GLTFLoader.js'),('examples/jsm/utils/BufferGeometryUtils.js','BufferGeometryUtils.js'),('LICENSE','three-LICENSE.txt')]:
 data=(base/source).read_bytes()
 if name=='GLTFLoader.js':data=data.replace(b'../utils/BufferGeometryUtils.js',b'./BufferGeometryUtils.js')
 write('C:\\inetpub\\stormpt\\jogar-beta\\vendor\\'+name,data)
write(r'C:\inetpub\stormpt\BrowserAssets.ashx',(r/'native-auth/BrowserAssets.ashx').read_bytes())
print('Protected assets and open-source renderer dependencies deployed.')
