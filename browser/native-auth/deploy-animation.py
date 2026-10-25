from pathlib import Path
import sys,json,struct
from qga_dev import write,run
b=Path('/mnt/user/appdata/stormpt-browser')
print(run("$ErrorActionPreference='Stop';$b='C:/StormPT-2703/Backups/WebAnimation-20261023';if(Test-Path $b){throw 'Backup exists; refusing overwrite'};New-Item -ItemType Directory $b | Out-Null;Copy-Item 'C:/inetpub/stormpt/jogar-beta' ($b+'/IIS-beta') -Recurse;Copy-Item 'C:/inetpub/stormpt/BrowserAssets.ashx' ($b+'/BrowserAssets.ashx');Write-Output 'ANIMATION_BACKUP_READY'"))
for name in ['tmbB01.skinned.textured.glb','tmh-B01.skinned.textured.glb','fighter-motion.ptan']:
 write('C:/StormPT-2703/BrowserAssets/'+name,(b/'assets/converted'/name).read_bytes())
p=b/'native-auth/BrowserAssets.ashx';s=p.read_text().replace('   default:Fail(c,404);return;','   case "fighter-body-animated":filename="tmbB01.skinned.textured.glb";break;\n   case "fighter-head-animated":filename="tmh-B01.skinned.textured.glb";break;\n   case "fighter-motion":filename="fighter-motion.ptan";break;\n   default:Fail(c,404);return;')
s=s.replace('c.Response.ContentType="model/gltf-binary";','c.Response.ContentType=filename.EndsWith(".ptan",StringComparison.Ordinal)?"application/octet-stream":"model/gltf-binary";')
p.write_text(s);write('C:/inetpub/stormpt/BrowserAssets.ashx',s.encode())
conf=Path('/mnt/user/appdata/stormpt-web-bridge/default.conf');backup=conf.with_name('default.conf.before-animation-20261023')
if not backup.exists():backup.write_bytes(conf.read_bytes())
s=conf.read_text();s=s.replace('world\\-scene\\.js)$','world\\-scene\\.js|native\\-motion\\.js)$');conf.write_text(s)
print('Protected animated assets and allowlisted handler installed')
