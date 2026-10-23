import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { PacketDecoder, inspectPacket, MAX_PACKET_BYTES } from '../src/packets.mjs';
import { issueToken, verifyToken } from '../src/auth.mjs';
import { createGateway } from '../src/gateway.mjs';

const secret = 'test-only-secret-please-never-deploy-this-key-' + 'x'.repeat(42);
function packet(op, bytes = '') {
  const b=Buffer.from(bytes);
  const d=Buffer.alloc(8+b.length);
  d.writeInt32LE(d.length,0); d.writeInt32LE(op,4); b.copy(d,8);
  return d;
}
test('real StormPT 8-byte packet layout and little-endian opcode', () => {
  const p=packet(0x1234, 'game');
  assert.deepEqual(inspectPacket(p),{length:12,opcode:0x1234});
  assert.equal(p.readInt32LE(0),12);
  assert.throws(()=>inspectPacket(Buffer.from('bad')),/header/i);
  assert.throws(()=>inspectPacket(Buffer.alloc(MAX_PACKET_BYTES+1)), /size|mismatch/i);
});
test('TCP data fragmentation + multiple packet coalescence', () => {
  const actual=[], dec=new PacketDecoder(p=>actual.push(p));
  const b=Buffer.concat([packet(2,'hello'),packet(3,'world')]);
  dec.feed(b.subarray(0,3)); assert.equal(actual.length,0);
  dec.feed(b.subarray(3,15)); assert.equal(actual.length,1);
  dec.feed(b.subarray(15)); assert.equal(actual.length,2);
  assert.equal(actual[0].readInt32LE(4),2);
  assert.equal(actual[1].subarray(8).toString(),'world');
});
test('invalid packet lengths are denied', () => {
  for (const size of [0,4,-1,MAX_PACKET_BYTES+1,2147483647]) {
    const dec=new PacketDecoder(()=>{});
    const b=Buffer.alloc(8);b.writeInt32LE(size,0);
    assert.throws(()=>dec.feed(b),/size/);
  }
});
test('HMAC token rejects forgery, expires, cannot be replayed', () => {
  const now=Date.now(), nonceCache=new Map();
  const t=issueToken({secret,now,expiresInSeconds:35});
  assert.equal(verifyToken(t,secret,nonceCache,now),true);
  assert.equal(verifyToken(t,secret,nonceCache,now),false);
  assert.equal(verifyToken(t+'a',secret,new Map(),now),false);
  assert.equal(verifyToken(t,secret,new Map(),now+36_000),false);
});
test('authenticated WS transports original StormPT framed bytes unmodified', async t=>{
  const tcpServer=net.createServer(conn=>{
    const decoder=new PacketDecoder(p=>conn.write(p));
    conn.on('data',b=>decoder.feed(b));
  });
  tcpServer.listen(0,'127.0.0.1');await once(tcpServer,'listening');
  const port=tcpServer.address().port;
  const gateway=createGateway({secret,listenHost:'127.0.0.1',listenPort:0,gameHost:'127.0.0.1',gamePort:port});
  await gateway.start();
  t.after(async()=>{await gateway.stop();await new Promise(r=>tcpServer.close(r));});
  const wsUrl='ws://127.0.0.1:'+gateway.server.address().port+'/game';
  const bad=new WebSocket(wsUrl,['stormpt-binary-v1'],{origin:'https://stormpt.hoststorm.com.br'});
  await assert.rejects(once(bad,'open'),/Unexpected server response: 401/);
  bad.on('error',()=>{});bad.terminate();
  const token=issueToken({secret});
  const ws=new WebSocket(wsUrl,['stormpt-binary-v1','ticket.'+token],{origin:'https://stormpt.hoststorm.com.br'});
  await once(ws,'open');
  t.after(()=>ws.terminate());
  const reply=once(ws,'message');
  const sent=packet(0x5a5a,'real-protocol-binary');
  ws.send(sent);
  const [bytes,isBinary]=await reply;
  assert.equal(isBinary,true);
  assert.equal(Buffer.compare(bytes,sent),0);
  assert.equal(gateway.sessions.size,1);
  ws.close();
  await once(ws,'close');
});
