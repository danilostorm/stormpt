from pathlib import Path
from qga_dev import write
r=Path('/mnt/user/appdata/stormpt-browser')
sources=['client/src/'+n+'.mjs' for n in ['native-entry','browser-session','account-ticket','native-world-view','world-scene']]
sources+=['transport/src/'+n+'.mjs' for n in ['packets','web-login','character-session','character-list','record-fragments','record-identity','character-creation','record-world','world-protocol']]
for src in sources:
 p=r/src;name=p.stem+'.js'
 s=p.read_text().replace('../../transport/src/','./').replace('.mjs','.js').replace('./account-screen.js','./account-client.js')
 (r/'deploy/jogar-beta'/name).write_text(s)
 write('C:\\inetpub\\stormpt\\jogar-beta\\'+name,s.encode())
write(r'C:\inetpub\stormpt\jogar-beta\index.html',(r/'deploy/jogar-beta/index.html').read_bytes())
print('Live-world beta deployed',len(sources)+1)
