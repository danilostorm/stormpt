/**
 * Deterministic original-wire-format fixture; NO real GameServer login.
 * Verifies that the gateway correctly sequences account-specific characters
 * before allowing selection. Client password/checksum are fictional test data.
 */
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
const secret='fixture-only-please-never-use-in-prod-'+'n'.repeat(40);
function characterList(){
 const p=Buffer.alloc(2676);
 p.writeInt32LE(2676,0);p.writeInt32LE(9,4);
 p.write(account,8,'ascii');p.writeInt32LE(2,32);
 for(const [i,name] of ['HeroTest','OtherChar'].entries()){
  const offset=36+240*i;
  p.write(name,offset,'ascii');p.write('MmbA01.smd',offset+32,'ascii');
  p.write('MmhA01.smd',offset+96,'ascii');
  p.writeInt32LE(1,offset+164);p.writeInt32LE(1,offset+176);
 }
 return p;
}
const login=encodeOriginalLoginPacket({
 account,password:'fictional',clientHash:'b'.repeat(32)
});
function selection(name){
 return encodeGetRecordRequest({
  characterName:name,authorizedClientChecksum:123,authorizedClientVersion:100
 });
}
test('gateway passes selected character only after original-format server list (QA fixture)',async t=>{
 let clientLogin=false,selectedCharacter=false;
 const mockGame=net.createServer(sock=>{
  sock.on('data',chunk=>{
   if(!clientLogin){
    assert.equal(chunk.readInt32LE(4),8);
    clientLogin=true;
    const list=characterList();
    // Simulate TCP packet fragmentation as in a real game connection.
    sock.write(list.subarray(0,173));
    queueMicrotask(()=>sock.write(list.subarray(173)));
    return;
   }
   if(chunk.readInt32LE(4)===5){
    selectedCharacter=true;
   }
  });
 });
 mockGame.listen(0,'127.0.0.1');await once(mockGame,'listening');
 const gw=createGateway({
  secret,requireBoundTicket:true,
  listenHost:'127.0.0.1',listenPort:0,
  gameHost:'127.0.0.1',gamePort:mockGame.address().port
 });
 await gw.start();
 t.after(async()=>{await gw.stop();await new Promise(resolve=>mockGame.close(resolve));});
 const ticket=issueBoundTicket({secret,account,sessionId:'mock-only-browser-session'});
 const ws=new WebSocket('ws://127.0.0.1:'+gw.server.address().port+'/game',
  ['stormpt-binary-v1','ticket.'+ticket],{origin:'https://stormpt.hoststorm.com.br'});
 await once(ws,'open');
 t.after(()=>ws.terminate());
 const packetFromServer=once(ws,'message');
 ws.send(login);
 const [list]=await Promise.race([
  packetFromServer,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error('No character list')),1500))
 ]);
 assert.equal(list.length,2676);
 assert.equal(list.readInt32LE(4),9);
 assert.equal([...gw.sessions][0].guard.phase,'character-list-received-not-authenticated');
 assert.deepEqual([...gw.sessions][0].guard.characterNames,['HeroTest','OtherChar']);
 ws.send(selection('HeroTest'));
 await new Promise(resolve=>setTimeout(resolve,80));
 assert.equal(selectedCharacter,true);
 assert.equal([...gw.sessions][0].guard.selectedCharacter,'HeroTest');
 ws.close();await once(ws,'close');
});
