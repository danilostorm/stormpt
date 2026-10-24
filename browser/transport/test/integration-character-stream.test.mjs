import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createGateway } from '../src/gateway.mjs';
import { issueToken } from '../src/auth.mjs';
import { CharacterSessionObserver } from '../src/character-session.mjs';
import { CHARACTER_LIST_LAYOUT as C } from '../src/character-list.mjs';
import { RECORD_FRAGMENT_LAYOUT as R } from '../src/record-fragments.mjs';

function makeList() {
  const b=Buffer.alloc(C.FULL_PACKET_BYTES);
  b.writeInt32LE(b.length,0);b.writeInt32LE(9,4);
  b.write('teste',8);b.writeInt32LE(1,C.COUNT_OFFSET);
  b.write('Heroi',C.CHARACTER_OFFSET);
  b.write('hero.smd',C.CHARACTER_OFFSET+32);
  b.write('face.smd',C.CHARACTER_OFFSET+96);
  b.writeInt32LE(85,C.CHARACTER_OFFSET+164);
  return b;
}
function makeRecord() {
  const b=Buffer.alloc(9000);
  b.writeInt32LE(b.length,0);b.writeInt32LE(4,4);
  b.write('Heroi',16);b.write('hero.smd',48);b.write('face.smd',112);
  b.writeUInt32LE(1000,176);b.writeUInt32LE(3,196);b.writeInt32LE(85,200);
  return b;
}
function fragments(b) {
  const total=Math.ceil(b.length/R.maxDataBytes);
  return Array.from({length:total},(_,i)=>{
    const data=b.subarray(i*R.maxDataBytes,(i+1)*R.maxDataBytes);
    const p=Buffer.alloc(data.length+32);
    p.writeInt32LE(p.length,0);p.writeInt32LE(4,4);
    p.writeInt32LE(i,8);p.writeInt32LE(total,12);
    p.writeInt32LE(data.length,16);data.copy(p,20);
    return p;
  });
}
test('synthetic TCP frames cross real WS gateway and reach read-only character observer', async t=>{
  // Local fixture, NOT a successful StormPT production login.
  const backend=net.createServer(socket=>{
    socket.once('data',()=>{
      const [a,b]=fragments(makeRecord());
      // Force fragmentation and coalescence at the TCP boundary.
      const list=makeList();
      socket.write(list.subarray(0,12));
      socket.write(Buffer.concat([list.subarray(12),a]));
      socket.write(b);
    });
  });
  backend.listen(0,'127.0.0.1');
  await once(backend,'listening');
  const secret='synthetic-test-secret-'.padEnd(70,'X');
  const gateway=createGateway({
    listenHost:'127.0.0.1',listenPort:0,gameHost:'127.0.0.1',
    gamePort:backend.address().port,secret
  });
  await gateway.start();
  t.after(async()=>{
    await gateway.stop();
    await new Promise(resolve=>backend.close(resolve));
  });
  const token=issueToken({secret});
  const ws=new WebSocket('ws://127.0.0.1:'+gateway.server.address().port+'/game',
    ['stormpt-binary-v1','ticket.'+token],
    {origin:'https://stormpt.hoststorm.com.br'});
  t.after(()=>ws.terminate());
  const received=[];
  const observer=new CharacterSessionObserver({
    expectedAccount:'teste',
    onEvent: event=>{
      received.push(event.type);
      if(event.type==='character-list') observer.selectCharacter('Heroi');
    }
  });
  const completed=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Timed out waiting for record')),3000);
    ws.on('message',bytes=>{
      try {
        const type=observer.accept(bytes);
        if(type==='character-record'){clearTimeout(timer);resolve();}
      } catch(error){clearTimeout(timer);reject(error);}
    });
    ws.on('error',error=>{clearTimeout(timer);reject(error);});
  });
  await once(ws,'open');
  const ping=Buffer.alloc(8);ping.writeInt32LE(8,0);ping.writeInt32LE(3,4);
  ws.send(ping);
  await completed;
  assert.deepEqual(received,['character-list','selection-requested','character-record']);
  assert.equal(observer.phase,'character-record-ready');
  ws.close();await once(ws,'close');
});
