from pathlib import Path
import sys,datetime,shutil
r=Path('/mnt/user/appdata/stormpt-browser');sys.path.insert(0,str(r/'native-auth'))
from qga_dev import read,write
b=r/'backups'/('npc-publish-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'));b.mkdir()
for rel in ['client/src/browser-session.mjs','client/src/native-world-view.mjs','client/src/native-entry.mjs','client/src/native-radar.mjs','transport/src/npc-protocol.mjs']:
 p=r/rel;name=p.stem+'.js';target='C:/inetpub/stormpt/jogar-beta/'+name
 if p.stem!='npc-protocol':(b/name).write_bytes(read(target))
 s=p.read_text().replace('../../transport/src/','./').replace('.mjs','.js').replace('./account-screen.js','./account-client.js');write(target,s.encode());(r/'deploy/jogar-beta'/name).write_text(s)
conf=Path('/mnt/user/appdata/stormpt-web-bridge/default.conf');shutil.copy2(conf,b/'nginx-default.conf');s=conf.read_text();assert 'npc-protocol' not in s;s=s.replace('|opening-background',r'|npc-protocol\\.js|opening-background');conf.write_text(s)
print('NPC_UI_PUBLISHED_BACKUP',b)
