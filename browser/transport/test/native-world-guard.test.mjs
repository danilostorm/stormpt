import test from 'node:test';
import assert from 'node:assert/strict';
import {GameLoginGuard} from '../src/game-login-guard.mjs';
import {encodeWebLoginPacket,encodeWebCharacterSelection} from '../src/web-login.mjs';
import {WORLD,encodeWorldJoin,encodeMoveIntent} from '../src/world-protocol.mjs';
const account='Webqatest',sid='a'.repeat(32);
function selected(){
 const claims={aud:'stormpt-gameserver',account,exp:Math.floor(Date.now()/1000)+45,nonce:'AAECAwQFBgcICQoLDA0ODw',sid};
 const gameTicket=Buffer.from(JSON.stringify(claims)).toString('base64url')+'.'+'a'.repeat(43);
 const g=new GameLoginGuard({account,sessionBinding:sid,allowNativeWebLogin:true});
 g.onClient(encodeWebLoginPacket({gameTicket,expectedAccount:account}));
 const list=Buffer.alloc(2676);list.writeInt32LE(2676);list.writeInt32LE(9,4);list.write(account,8);list.writeInt32LE(1,32);list.write('WebHero',36);list.write('body.ini',68);list.write('head.inf',132);list.writeInt32LE(1,196);list.writeInt32LE(1,200);
 g.onServer(list);g.onClient(encodeWebCharacterSelection({characterName:'WebHero'}));return g;
}
function record(owner=account){
 const b=Buffer.alloc(1796);b.writeInt32LE(1796);b.writeInt32LE(4,4);b.write('RC 1.50',8);b.write('WebHero',16);b.write('body.ini',48);b.write('head.inf',112);b.writeUInt32LE(1234,176);b.writeInt32LE(1,196);b.writeInt32LE(1,200);b.writeInt32LE(150,480);b.writeInt32LE(3,484);b.writeInt32LE(-1047*256,492);b.writeInt32LE(-16973*256,496);b.write(owner,748);
 const frame=Buffer.alloc(b.length+32);frame.writeInt32LE(frame.length);frame.writeInt32LE(4,4);frame.writeInt32LE(b.length,16);b.copy(frame,20);return frame;
}
function state(seq=0){
 const b=Buffer.alloc(80);for(const [o,v] of [[0,80],[4,WORLD.state],[8,1],[12,1234],[16,seq],[20,1000],[24,3],[28,-1047*256],[32,205*256],[36,-16973*256]])b.writeInt32LE(v,o);b.write('WebHero',48);return b;
}
function active(){const g=selected();g.onServer(record());g.onClient(encodeWorldJoin({serial:1234}));g.onServer(state());return g;}
test('world requires own complete record and matching server identity',()=>{
 const g=selected();assert.throws(()=>g.onClient(encodeWorldJoin({serial:1234})),/record/);
 assert.throws(()=>g.onServer(record('OtherUser')),/account mismatch/);
 const h=selected();h.onServer(record());assert.throws(()=>h.onClient(encodeWorldJoin({serial:99})));
 h.onClient(encodeWorldJoin({serial:1234}));assert.throws(()=>h.onClient(encodeMoveIntent({sequence:1,direction:3})),/confirmation/);
});
test('world rejects repeated, skipped and unrequested movement acknowledgements',()=>{
 const g=active();assert.throws(()=>g.onServer(state()),/acknowledgement/);
 assert.throws(()=>g.onClient(encodeMoveIntent({sequence:2,direction:3})),/sequence/);
 g.onClient(encodeMoveIntent({sequence:1,direction:3}));
 assert.throws(()=>g.onClient(encodeMoveIntent({sequence:1,direction:3})),/sequence/);
 assert.throws(()=>g.onServer(state(2)),/acknowledgement/);g.onServer(state(1));
 assert.equal(g.phase,'native-world-active');
});
test('world backpressure allows four intents and resumes only on server acknowledgement',()=>{
 const g=active();for(let sequence=1;sequence<=4;sequence++)g.onClient(encodeMoveIntent({sequence,direction:3}));
 assert.throws(()=>g.onClient(encodeMoveIntent({sequence:5,direction:3})),/backpressure/);
 g.onServer(state(1));g.onClient(encodeMoveIntent({sequence:5,direction:3}));
 g.close();assert.throws(()=>g.onClient(encodeMoveIntent({sequence:6,direction:3})),/closed/);
});
