from pathlib import Path
import sys,datetime,shutil
r=Path('/mnt/user/appdata/stormpt-browser');sys.path.insert(0,str(r/'native-auth'))
from qga_dev import read,write
b=r/'backups'/('inventory-publish-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'));b.mkdir()
for rel in ['transport/src/record-inventory.mjs','client/src/native-inventory.mjs','transport/src/record-world.mjs','client/src/native-world-view.mjs']:
 p=r/rel;name=p.stem+'.js';dest='C:/inetpub/stormpt/jogar-beta/'+name
 if p.stem in ['record-world','native-world-view']:(b/name).write_bytes(read(dest))
 s=p.read_text().replace('../../transport/src/','./').replace('.mjs','.js');write(dest,s.encode());(r/'deploy/jogar-beta'/name).write_text(s)
conf=Path('/mnt/user/appdata/stormpt-web-bridge/default.conf');shutil.copy2(conf,b/'nginx-default.conf');s=conf.read_text();assert 'native-inventory' not in s;s=s.replace('|npc-protocol',r'|native-inventory\.js|record-inventory\.js|npc-protocol');conf.write_text(s)
print('INVENTORY_PUBLISHED_WITH_BACKUP',b)
