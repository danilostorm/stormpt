import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {GameLoginGuard} from '../src/game-login-guard.mjs';
import {createGateway} from '../src/gateway.mjs';
import {issueBoundTicket} from '../src/bound-auth.mjs';
import {encodeOriginalLoginPacket} from '../src/login-layout.mjs';
const account='Webqatest',secret='synthetic-test-only-deadline-key-20261023';
test('pre-login expires without a client login packet',()=>{
 let now=1000; const g=new GameLoginGuard({account,now:()=>now,loginTimeoutMs:1000});
 now=2001;assert.throws(()=>g.checkDeadline(),/Timed out/);assert.equal(g.phase,'closed');
});
for(const sendLogin of [false,true])test('passive deadline closes '+(sendLogin?'silent GameServer':'idle browser')+' and releases session',async t=>{
 const sockets=new Set();
 const tcp=net.createServer(sock=>{sockets.add(sock);sock.on('data',()=>{});sock.on('close',()=>sockets.delete(sock));});
 tcp.listen(0,'127.0.0.1');await once(tcp,'listening');
 const gateway=createGateway({secret,requireBoundTicket:true,listenPort:0,
   gameHost:'127.0.0.1',gamePort:tcp.address().port,loginTimeoutMs:1000});
 await gateway.start();
 t.after(async()=>{await gateway.stop();for(const sock of sockets)sock.destroy();await new Promise(r=>tcp.close(r));});
 const token=issueBoundTicket({secret,account,sessionId:'qa-deadline-session'});
 const ws=new WebSocket('ws://127.0.0.1:'+gateway.server.address().port+'/game',
   ['stormpt-binary-v1','ticket.'+token],{origin:'https://stormpt.hoststorm.com.br'});
 t.after(()=>ws.terminate());await once(ws,'open');
 let timeout;
 try{
   const closed=once(ws,'close');
   if(sendLogin)ws.send(encodeOriginalLoginPacket({account,password:'qa-only',clientHash:'a'.repeat(32)}));
   await Promise.race([closed,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Passive auth timeout not enforced')),4000);})]);
   assert.equal(gateway.sessions.size,0);
 }finally{clearTimeout(timeout);}
});
