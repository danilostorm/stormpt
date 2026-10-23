import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeCharacterCreation} from '../src/character-creation.mjs';
import {GameLoginGuard} from '../src/game-login-guard.mjs';
import {encodeWebLoginPacket,encodeWebCharacterSelection} from '../src/web-login.mjs';
const account='Webqatest',sid='a'.repeat(32);
function native(){
 const claims={aud:'stormpt-gameserver',account,exp:Math.floor(Date.now()/1000)+45,nonce:'AAECAwQFBgcICQoLDA0ODw',sid};
 const gameTicket=Buffer.from(JSON.stringify(claims)).toString('base64url')+'.'+'a'.repeat(43);
 const g=new GameLoginGuard({account,sessionBinding:sid,allowNativeWebLogin:true});
 g.onClient(encodeWebLoginPacket({gameTicket,expectedAccount:account}));
 const list=Buffer.alloc(2676);list.writeInt32LE(2676);list.writeInt32LE(9,4);list.write(account,8);
 g.onServer(list);return g;
}
test('native creation bound to same account and exactly one outstanding request',()=>{
 const g=native(),request=encodeCharacterCreation({account,name:'WebHero'});
 assert.throws(()=>g.onClient(encodeCharacterCreation({account:'OtherUser',name:'WebHero'})),/mismatch/);
 g.onClient(request);assert.equal(g.phase,'awaiting-character-creation');
 assert.throws(()=>g.onClient(request),/requires/);
 assert.throws(()=>g.onClient(encodeWebCharacterSelection({characterName:'WebHero'})),/pending/);
 const response=request.slice();new DataView(response.buffer).setInt32(12,1,true);
 g.onServer(response);assert.equal(g.phase,'creation-finished-reconnect-required');
 assert.throws(()=>g.onClient(encodeWebCharacterSelection({characterName:'WebHero'})),/pending/);
});
test('native pilot refuses client record writes, character deletion and unsolicited creation',()=>{
 const g=native();
 for(const opcode of [4,10,12,50,0x48580000]){
  const p=Buffer.alloc(24);p.writeInt32LE(24);p.writeUInt32LE(opcode,4);
  assert.throws(()=>g.onClient(p),/not implemented/);
 }
 assert.throws(()=>g.onServer(encodeCharacterCreation({account,name:'WebHero'})),/Unsolicited/);
});
