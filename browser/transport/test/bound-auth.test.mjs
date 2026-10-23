import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {createHmac} from 'node:crypto';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {issueBoundTicket,consumeBoundTicket} from '../src/bound-auth.mjs';
import {createGateway} from '../src/gateway.mjs';
import {encodeOriginalLoginPacket} from '../src/login-layout.mjs';
const secret='test-only-key-please-do-not-use-in-prod-'+'x'.repeat(45);
const createTicket=()=>issueBoundTicket({secret,account:'TestUser',sessionId:'test-aspnet-session-001'});
test('account-bound ticket validates account and is one-time, short-lived',()=>{
 const now=Date.now();
 const t=issueBoundTicket({secret,account:'TestUser',sessionId:'test-aspnet-session-001',now});
 const cache=new Map();
 assert.equal(consumeBoundTicket({token:t,secret,usedNonces:cache,now}).account,'TestUser');
 assert.equal(consumeBoundTicket({token:t,secret,usedNonces:cache,now}),null);
 assert.equal(consumeBoundTicket({token:t+'x',secret,usedNonces:new Map(),now}),null);
 assert.equal(consumeBoundTicket({token:t,secret,usedNonces:new Map(),now:now+50_000}),null);
 assert.throws(()=>issueBoundTicket({secret,account:'Wrong User',sessionId:'123456789'}));
});
test('bound gateway rejects unbound tickets, accepts account-matched original login packet',async t=>{
 const tcp=net.createServer(sock=>sock.on('data',data=>sock.write(data)));
 tcp.listen(0,'127.0.0.1');await once(tcp,'listening');
 const gateway=createGateway({
  secret,requireBoundTicket:true,listenHost:'127.0.0.1',listenPort:0,
  gameHost:'127.0.0.1',gamePort:tcp.address().port
 });
 await gateway.start();
 t.after(async()=>{await gateway.stop();await new Promise(r=>tcp.close(r));});
 const url='ws://127.0.0.1:'+gateway.server.address().port+'/game';
 const bad=new WebSocket(url,['stormpt-binary-v1','ticket.'+'a'.repeat(60)],
  {origin:'https://stormpt.hoststorm.com.br'});
 await assert.rejects(once(bad,'open'),/401/);
 bad.on('error',()=>{});bad.terminate();
 const ws=new WebSocket(url,['stormpt-binary-v1','ticket.'+createTicket()],
  {origin:'https://stormpt.hoststorm.com.br'});
 await once(ws,'open');t.after(()=>ws.terminate());
 assert.equal([...gateway.sessions][0].boundAccount,'TestUser');
 const reply=once(ws,'message');
 const sent=encodeOriginalLoginPacket({
  account:'TestUser',password:'test-only',
  clientHash:'a'.repeat(32)
 });
 ws.send(sent);
 const [recv]=await reply;
 assert.equal(Buffer.compare(recv,sent),0);
 ws.close();await once(ws,'close');
});
test('bound gateway closes socket for a login packet with another account',async t=>{
 const tcp=net.createServer(sock=>sock.on('data',()=>{}));
 tcp.listen(0,'127.0.0.1');await once(tcp,'listening');
 const gateway=createGateway({
  secret,requireBoundTicket:true,listenHost:'127.0.0.1',listenPort:0,
  gameHost:'127.0.0.1',gamePort:tcp.address().port
 });
 await gateway.start();
 t.after(async()=>{await gateway.stop();await new Promise(r=>tcp.close(r));});
 const ws=new WebSocket('ws://127.0.0.1:'+gateway.server.address().port+'/game',
  ['stormpt-binary-v1','ticket.'+createTicket()],
  {origin:'https://stormpt.hoststorm.com.br'});
 await once(ws,'open');
 const close=once(ws,'close');
 ws.send(encodeOriginalLoginPacket({account:'OtherUser',password:'test-only',clientHash:'a'.repeat(32)}));
 await Promise.race([close,new Promise((_,reject)=>setTimeout(()=>reject(new Error('No account-mismatch close')),2000))]);
 assert.equal(gateway.sessions.size,0);
});
test('C# ASP.NET ticket JSON/HMAC wire shape is accepted by Node verifier',()=>{
 const b64=s=>Buffer.from(s).toString('base64url');
 const hmac=s=>createHmac('sha256',secret).update(s).digest('base64url');
 const sid=createHmac('sha256',secret).update('test-aspnet-session-001')
   .digest('hex').slice(0,32);
 const payload=JSON.stringify({
  aud:'stormpt-browser-tcp',account:'TestUser',
  exp:Math.floor(Date.now()/1000)+45,
  nonce:b64(Buffer.alloc(16,0x41)),sid
 });
 const encoded=b64(payload);
 const ticket=encoded+'.'+hmac(encoded);
 assert.equal(consumeBoundTicket({token:ticket,secret,usedNonces:new Map()}).account,'TestUser');
});
