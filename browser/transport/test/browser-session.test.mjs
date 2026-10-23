import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket, WebSocketServer } from 'ws';
import { once } from 'node:events';
import { StormPTBrowserSession } from '../../client/src/browser-session.mjs';

const token='ticket.'+'a'.repeat(64);
const p=(opcode,body)=>{
  const buf=Buffer.alloc(8+body.length);
  buf.writeInt32LE(buf.length,0);buf.writeInt32LE(opcode,4);
  body.copy(buf,8);return buf;
};
const list=(account='testaccount')=>{
 const body=Buffer.alloc(36-8+240);
 body.write(account,0,'ascii');
 body.writeInt32LE(1,24);
 body.write('Heroi',28,'ascii');
 body.write('model.ini',28+32,'ascii');
 body.write('face.ini',28+96,'ascii');
 body.writeUInt32LE(1,28+160);
 body.writeInt32LE(20,28+164);
 return p(9,body);
};
test('browser modules work without a Node Buffer polyfill', async()=>{
 const sample=new Uint8Array(list());
 const saved=globalThis.Buffer;
 try{
   globalThis.Buffer=undefined;
   const {decodeCharacterList}=await import('../src/character-list.mjs');
   const {encodeGetRecordRequest}=await import('../src/get-record-request.mjs');
   const decoded=decodeCharacterList(sample);
   assert.equal(decoded.account,'testaccount');
   assert.equal(decoded.characters[0].name,'Heroi');
   assert.equal(decoded.characters[0].level,20);
   const req=encodeGetRecordRequest({
     characterName:'Heroi',authorizedClientChecksum:1234,authorizedClientVersion:1058
   });
   assert.equal(req instanceof Uint8Array,true);
   assert.equal(new DataView(req.buffer).getInt32(4,true),5);
 }finally{globalThis.Buffer=saved;}
});
test('no connection without trusted account, token, or TLS on public hosts',async()=>{
 assert.throws(()=>new StormPTBrowserSession({expectedAccount:'',Socket:WebSocket}));
 const client=new StormPTBrowserSession({expectedAccount:'testaccount',Socket:WebSocket});
 await assert.rejects(client.connect({url:'ws://example.com/game',ticket:'x'.repeat(50)}),/Secure/);
 await assert.rejects(client.connect({url:'wss://example.com/game',ticket:''}),/ticket/);
 assert.throws(()=>client.selectCharacter('Heroi'),/active/);
});
test('browser WebSocket decodes server-origin character list and does not send game commands',async t=>{
 const wss=new WebSocketServer({host:'127.0.0.1',port:0,handleProtocols:()=> 'stormpt-binary-v1'});
 await once(wss,'listening');
 const messages=[];
 wss.on('connection',sock=>{
   sock.on('message',d=>messages.push(d));
   sock.send(list());
 });
 t.after(()=>new Promise(resolve=>wss.close(resolve)));
 const events=[];
 const client=new StormPTBrowserSession({expectedAccount:'testaccount',Socket:WebSocket,onEvent:e=>events.push(e)});
 t.after(()=>client.close());
 await client.connect({url:'ws://127.0.0.1:'+wss.address().port+'/game',ticket:token});
 for(let i=0;i<25&&!events.some(e=>e.type==='character-list');i++)
   await new Promise(r=>setTimeout(r,10));
 const e=events.find(e=>e.type==='character-list');
 assert.equal(e.list.account,'testaccount');
 assert.equal(e.list.characters[0].name,'Heroi');
 assert.equal(events.some(e=>e.type==='authenticated'),false);
 assert.equal(client.selectCharacter('Heroi').sent,false);
 await new Promise(r=>setTimeout(r,20));
 assert.equal(messages.length,0);
 client.close();
});
test('wrong account in real opcode 9 fails closed, not accepted as login',async t=>{
 const wss=new WebSocketServer({host:'127.0.0.1',port:0,handleProtocols:()=> 'stormpt-binary-v1'});
 await once(wss,'listening');
 wss.on('connection',sock=>sock.send(list('differentaccount')));
 t.after(()=>new Promise(resolve=>wss.close(resolve)));
 const events=[];
 const client=new StormPTBrowserSession({expectedAccount:'testaccount',Socket:WebSocket,onEvent:e=>events.push(e)});
 await client.connect({url:'ws://127.0.0.1:'+wss.address().port+'/game',ticket:token});
 for(let i=0;i<25&&!events.some(e=>e.type==='protocol-error');i++)
   await new Promise(r=>setTimeout(r,10));
 assert.ok(events.some(e=>e.type==='protocol-error'));
 assert.ok(!events.some(e=>e.type==='character-list'));
 assert.equal(client.phase,'closed');
});
