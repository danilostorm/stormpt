from pathlib import Path
import sys,datetime,json
r=Path('/mnt/user/appdata/stormpt-browser');sys.path.insert(0,str(r/'native-auth'));import qga_dev as g
b=r/'backups'/('npc-model-publish-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'));b.mkdir();names=[('npc-mix','Teacher03'),('npc-enzo','enzo'),('npc-craftsman','TN-012'),('npc-moriph','MN-007'),('npc-beauty','maskedwoman'),('npc-stones','Bcn03'),('npc-guard','TN-010'),('npc-bcn05','Bcn05'),('npc-cash','cash'),('npc-teacher2','Teacher02'),('npc-tn005','TN-005'),('npc-stella','STELLA'),('npc-dmeca','dmeca')]
p='C:/inetpub/stormpt/BrowserAssets.ashx';old=g.read(p);(b/'BrowserAssets.ashx').write_bytes(old);s=old.decode();anchor='   default:Fail(c,404);return;';assert anchor in s
for key,stem in names:
 filename=stem+'.idle.textured.glb';g.write('C:/StormPT-2703/BrowserAssets/'+filename,(r/'assets/converted'/filename).read_bytes())
 if 'case "'+key+'"' not in s:s=s.replace(anchor,'   case "'+key+'":filename="'+filename+'";break;\n'+anchor)
g.write(p,s.encode());(r/'native-auth/BrowserAssets.ashx').write_text(s)
for name in ['entity-assets','native-entity-view']:
 p='C:/inetpub/stormpt/jogar-beta/'+name+'.js';(b/(name+'.js')).write_bytes(g.read(p));s=(r/'client/src'/(name+'.mjs')).read_text().replace('.mjs','.js');g.write(p,s.encode());(r/'deploy/jogar-beta'/(name+'.js')).write_text(s)
print('ORIGINAL_NPC_MODELS_PUBLISHED',len(names),'BACKUP',b)
