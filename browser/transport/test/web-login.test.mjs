import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {encodeWebLoginPacket,decodeWebLoginPacket,encodeWebCharacterSelection,readWebTicket} from '../src/web-login.mjs';
import {GameLoginGuard} from '../src/game-login-guard.mjs';
import {encodeOriginalLoginPacket} from '../src/login-layout.mjs';
const account='Webqatest',sid='1'.repeat(32);
const token=(change={})=>{
 const c={aud:'stormpt-gameserver',account,exp:Math.floor(Date.now()/1000)+45,nonce:'AAECAwQFBgcICQoLDA0ODw',sid,...change};
 const p=Buffer.from(JSON.stringify(c)).toString('base64url');
 return p+'.'+createHmac('sha256','synthetic-native-wire-only-key-12345678').update(p).digest('base64url');
};
test('native envelope has exact C++ layout and contains no Windows checksum or password',()=>{
 const packet=encodeWebLoginPacket({gameTicket:token(),expectedAccount:account,expectedSid:sid});
 assert.equal(packet.byteLength,1040);
 assert.equal(new DataView(packet.buffer).getUint32(8,true),0x31575453);
 assert.equal(decodeWebLoginPacket(packet,{expectedAccount:account,expectedSid:sid}).claims.account,account);
});
test('native login rejects another account or another ASP.NET session',()=>{
 for(const change of [{account:'AnotherUser'},{sid:'2'.repeat(32)}])
  assert.throws(()=>encodeWebLoginPacket({gameTicket:token(change),expectedAccount:account,expectedSid:sid}),/mismatch/);
});
test('native wire rejects wrong magic, padding, truncated packets and wrong audience',()=>{
 const valid=encodeWebLoginPacket({gameTicket:token(),expectedAccount:account});
 const bad=valid.slice();bad[8]^=1;assert.throws(()=>decodeWebLoginPacket(bad));
 const padding=valid.slice();padding[1039]=42;assert.throws(()=>decodeWebLoginPacket(padding),/padding/);
 assert.throws(()=>decodeWebLoginPacket(valid.subarray(0,1000)));
 assert.throws(()=>readWebTicket(token({aud:'stormpt-browser-tcp'})));
});
test('native guard is opt-in and requires verified site session binding',()=>{
 const packet=encodeWebLoginPacket({gameTicket:token(),expectedAccount:account});
 assert.throws(()=>new GameLoginGuard({account,allowNativeWebLogin:true}),/binding/);
 assert.throws(()=>new GameLoginGuard({account}).onClient(packet));
 const guard=new GameLoginGuard({account,allowNativeWebLogin:true,sessionBinding:sid});
 guard.onClient(packet);assert.equal(guard.phase,'awaiting-character-list');
 assert.throws(()=>guard.onClient(packet),/Second/);
});
test('native character selection uses explicit web version, zero Windows checksum and bounded name',()=>{
 const p=encodeWebCharacterSelection({characterName:'WebHero'});
 const v=new DataView(p.buffer);assert.equal(p.length,52);assert.equal(v.getUint32(4,true),5);
 assert.equal(v.getUint32(8,true),0);assert.equal(v.getUint32(12,true),0);assert.equal(v.getUint32(16,true),1);
 assert.throws(()=>encodeWebCharacterSelection({characterName:'x'.repeat(32)}));
});

test('native QA pilot rejects legacy login even for the same bound account',()=>{
 const native=new GameLoginGuard({account,allowNativeWebLogin:true,sessionBinding:sid});
 const legacy=encodeOriginalLoginPacket({account,password:'test-only',clientHash:'a'.repeat(32)});
 assert.throws(()=>native.onClient(legacy),/Legacy desktop login disabled/);
 assert.equal(native.phase,'awaiting-login');
 const supported=new GameLoginGuard({account});
 supported.onClient(legacy);
 assert.equal(supported.phase,'awaiting-character-list');
});
