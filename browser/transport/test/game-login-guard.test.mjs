import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {GameLoginGuard} from '../src/game-login-guard.mjs';
import {createGateway} from '../src/gateway.mjs';
import {issueBoundTicket} from '../src/bound-auth.mjs';
import {encodeOriginalLoginPacket} from '../src/login-layout.mjs';
import {encodeGetRecordRequest} from '../src/get-record-request.mjs';

const account='TestUser';
const secret='test-only-guard-binary-key-'+ 'q'.repeat(50);
const login=name=>encodeOriginalLoginPacket({
 account:name,password:'not-a-real-password',clientHash:'a'.repeat(32)
});
function listPacket(name=account,characters=['PlayChar']){
  const bytes=Buffer.alloc(2676);
  bytes.writeInt32LE(bytes.length,0);
  bytes.writeInt32LE(9,4);
  bytes.write(name,8,'ascii');
  bytes.writeInt32LE(characters.length,32);
  for(let i=0;i<characters.length;i++){
    const p=36+240*i;
    bytes.write(characters[i],p,'ascii');
    bytes.write('MmbA01.smd',p+32,'ascii');
    bytes.write('MmhA01.smd',p+96,'ascii');
    bytes.writeUInt32LE(1,p+160);
    bytes.writeInt32LE(1,p+164);
    bytes.writeInt32LE(1,p+176);
  }
  return bytes;
}
const selection=name=>encodeGetRecordRequest({
  characterName:name,authorizedClientChecksum:1,authorizedClientVersion:1
});

test('prelogin cannot forward game/character-selection commands',()=>{
 const g=new GameLoginGuard({account});
 assert.throws(()=>g.onClient(selection('PlayChar')),/login must be first/);
 assert.equal(g.phase,'awaiting-login');
});
test('login must be original 400 bytes and bound to same website account',()=>{
 const g=new GameLoginGuard({account});
 assert.throws(()=>g.onClient(login('AnotherUser')),/Account mismatch/);
 g.onClient(login(account));
 assert.equal(g.phase,'awaiting-character-list');
 assert.throws(()=>g.onClient(login(account)),/Second account login/);
 assert.throws(()=>g.onClient(selection('PlayChar')),/before character list/);
});
test('server character names bound to account and protected from spoofing',()=>{
 const g=new GameLoginGuard({account});
 g.onClient(login(account));
 assert.throws(()=>g.onServer(listPacket('AnotherUser')),/account mismatch/);
 assert.equal(g.phase,'awaiting-character-list');
 g.onServer(listPacket(account,['PlayChar','AnotherChar']));
 assert.equal(g.phase,'character-list-received-not-authenticated');
 assert.deepEqual(g.characterNames,['PlayChar','AnotherChar']);
 assert.throws(()=>g.onClient(selection('NotMine')),/not in account/);
 g.onClient(selection('PlayChar'));
 assert.equal(g.selectedCharacter,'PlayChar');
 assert.equal(g.phase,'character-selected-awaiting-record');
 assert.throws(()=>g.onServer(listPacket(account)),/repeated character list/);
});
test('timeout closes transport instead of hanging during account authorization',()=>{
 let now=1_000;
 const g=new GameLoginGuard({account,now:()=>now,loginTimeoutMs:1000});
 g.onClient(login(account));
 now=3_000;
 assert.throws(()=>g.onServer(listPacket()),/Timed out/);
 assert.equal(g.phase,'closed');
});
test('no forged server list allowed without first client login',()=>{
 const g=new GameLoginGuard({account});
 assert.throws(()=>g.onServer(listPacket()),/Unsolicited/);
});
test('bound gateway denies unauthenticated protocol and closes without forwarding TCP bytes',async t=>{
 let bytesReceived=0;
 const tcp=net.createServer(sock=>{sock.on('data',data=>{bytesReceived+=data.length;});});
 tcp.listen(0,'127.0.0.1');await once(tcp,'listening');
 const g=createGateway({secret,requireBoundTicket:true,
  listenHost:'127.0.0.1',listenPort:0,gameHost:'127.0.0.1',gamePort:tcp.address().port});
 await g.start();
 t.after(async()=>{await g.stop();await new Promise(resolve=>tcp.close(resolve));});
 const tok=issueBoundTicket({secret,account,sessionId:'guard-test-session'});
 const ws=new WebSocket('ws://127.0.0.1:'+g.server.address().port+'/game',
   ['stormpt-binary-v1','ticket.'+tok],{origin:'https://stormpt.hoststorm.com.br'});
 await once(ws,'open');
 const closed=once(ws,'close');
 ws.send(selection('PlayChar'));
 await Promise.race([closed,new Promise((_,rej)=>setTimeout(()=>rej(Error('Socket was not closed')),2000))]);
 assert.equal(bytesReceived,0);
 assert.equal(g.sessions.size,0);
});
