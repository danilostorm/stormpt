/**
 * QA safety regression against a local synthetic TCP GameServer fixture.
 * No credentials, live GameServer or damage logic are used in this test.
 * A future combat implementation must replace this explicit denial only
 * after native authorization and server-authoritative combat are tested.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createGateway} from '../src/gateway.mjs';
import {PacketDecoder} from '../src/packets.mjs';
import {issueBoundTicket} from '../src/bound-auth.mjs';
import {encodeWebLoginPacket} from '../src/web-login.mjs';
import {encodeBasicAttackIntent} from '../src/combat-intent.mjs';

const account='Webqatest';
const secret='qa-combat-closed-gateway-fixture-secret-20261024';
function characterList(){
  const b=Buffer.alloc(2676);
  b.writeInt32LE(b.length,0);b.writeInt32LE(9,4);
  b.write(account,8);b.writeInt32LE(0,32);
  return b;
}
function fakeGameTicket(sid){
  const claims={aud:'stormpt-gameserver',account,
    exp:Math.floor(Date.now()/1000)+45,
    nonce:'AAECAwQFBgcICQoLDA0ODw',sid};
  return Buffer.from(JSON.stringify(claims)).toString('base64url')+'.'+'a'.repeat(43);
}
async function setup(t){
  const received=[];
  const tcp=net.createServer(sock=>{
    const decoder=new PacketDecoder(packet=>{
      received.push(Buffer.from(packet));
      if(packet.readUInt32LE(4)===8)sock.write(characterList());
    });
    sock.on('data',data=>decoder.feed(data));
  });
  tcp.listen(0,'127.0.0.1');await once(tcp,'listening');
  const gateway=createGateway({secret,requireBoundTicket:true,
    allowNativeWebLogin:true,listenHost:'127.0.0.1',listenPort:0,
    gameHost:'127.0.0.1',gamePort:tcp.address().port});
  await gateway.start();
  t.after(async()=>{
    await gateway.stop();
    await new Promise(resolve=>tcp.close(resolve));
  });
  const ticket=issueBoundTicket({secret,account,sessionId:'synthetic-qa-session'});
  const sid=JSON.parse(Buffer.from(ticket.split('.')[0],'base64url')).sid;
  const ws=new WebSocket('ws://127.0.0.1:'+gateway.server.address().port+'/game',
    ['stormpt-binary-v1','ticket.'+ticket],
    {origin:'https://stormpt.hoststorm.com.br'});
  t.after(()=>ws.terminate());
  await once(ws,'open');
  return {ws,gateway,received,sid};
}
async function expectClosed(ws){
  const closed=once(ws,'close');
  await Promise.race([closed,new Promise((_,reject)=>setTimeout(
    ()=>reject(Error('Combat packet did not close QA connection')),2000))]);
}
test('native QA refuses attack before GameServer login and forwards zero bytes',async t=>{
  const {ws,gateway,received}=await setup(t);
  const closing=expectClosed(ws);
  ws.send(encodeBasicAttackIntent({sequence:1,target:99}));
  await closing;
  assert.equal(received.length,0);
  assert.equal(gateway.sessions.size,0);
});
test('native QA refuses attack after synthetic account list; TCP sees only login',async t=>{
  const {ws,gateway,received,sid}=await setup(t);
  const list=once(ws,'message');
  ws.send(encodeWebLoginPacket({gameTicket:fakeGameTicket(sid),
    expectedAccount:account,expectedSid:sid}));
  const [reply]=await Promise.race([list,new Promise((_,reject)=>setTimeout(
    ()=>reject(Error('Synthetic character list not received')),2000))]);
  assert.equal(reply.readUInt32LE(4),9);
  assert.equal([...gateway.sessions][0].guard.phase,
    'character-list-received-not-authenticated');
  const closing=expectClosed(ws);
  ws.send(encodeBasicAttackIntent({sequence:1,target:99}));
  await closing;
  assert.equal(received.length,1);
  assert.equal(received[0].readUInt32LE(4),8);
  assert.equal(gateway.sessions.size,0);
});
