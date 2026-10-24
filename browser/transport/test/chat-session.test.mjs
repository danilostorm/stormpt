import test from 'node:test';
import assert from 'node:assert/strict';
import {StormPTBrowserSession} from '../../client/src/browser-session.mjs';
import {encodeChatMessage,CHAT_OPCODE} from '../src/chat-protocol.mjs';
class FakeSocket{
  static CLOSED=3;
  constructor(url,protocols){
    this.url=url;this.protocol='stormpt-binary-v1';this.protocols=protocols;
    this.readyState=1;this.handlers={};this.sent=[];
    queueMicrotask(()=>this.emit('open',{}));
  }
  addEventListener(name,fn){(this.handlers[name]??=[]).push(fn)}
  emit(name,data){for(const fn of this.handlers[name]||[])fn(data)}
  send(bytes){this.sent.push(new Uint8Array(bytes))}
  receive(bytes){this.emit('message',{data:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})}
  close(){this.readyState=3;this.emit('close',{})}
}
const makeClient=async(events=[])=>{
  const client=new StormPTBrowserSession({expectedAccount:'QAtester',Socket:FakeSocket,onEvent:e=>events.push(e)});
  await client.connect({url:'ws://127.0.0.1/game',ticket:'a'.repeat(64)});
  client.nativeLogin=true;client.phase='native-world-ready';
  return client;
};
test('browser chat refuses packets before a confirmed world session',async()=>{
 const client=new StormPTBrowserSession({expectedAccount:'QAtester',Socket:FakeSocket});
 assert.throws(()=>client.sendChat('Olá'),/Entre no mundo/);
 await client.connect({url:'ws://127.0.0.1/game',ticket:'a'.repeat(64)});
 assert.throws(()=>client.sendChat('Olá'),/Entre no mundo/);
 client.close();
});
test('browser chat sends only native opcode 22 with CP1252 and no fake echo',async()=>{
 const events=[],client=await makeClient(events);
 assert.equal(client.sendChat('Olá, Ricarten!'),true);
 assert.equal(client.ws.sent.length,1);
 const packet=client.ws.sent[0];
 assert.equal(new DataView(packet.buffer).getInt32(4,true),CHAT_OPCODE);
 assert.deepEqual(packet,encodeChatMessage('Olá, Ricarten!'));
 assert.equal(events.some(e=>e.type==='chat-message'),false);
 assert.throws(()=>client.sendChat('mensagem 2'),/Aguarde/);
 client.close();
});
test('client rejects slash commands, Unicode emoji and chat before world',async()=>{
 const client=await makeClient();
 for(const invalid of ['/admin','@party','\u202eabc','😀','x'.repeat(71)])
  assert.throws(()=>client.sendChat(invalid));
 assert.equal(client.ws.sent.length,0);
 client.close();
});
test('browser receives server chat as data, not an authenticated username',async()=>{
 const events=[],client=await makeClient(events);
 const message=new Uint8Array(12+4);
 const dv=new DataView(message.buffer);dv.setInt32(0,message.length,true);dv.setInt32(4,CHAT_OPCODE,true);dv.setUint32(8,0x11223344,true);
 message.set([79,105,33,0],12);
 client.ws.receive(message);
 assert.deepEqual(events.find(e=>e.type==='chat-message')?.message,{origin:0x11223344,text:'Oi!'});
 client.close();
});
test('chat before world confirmation is ignored, never displayed as in-world',async()=>{
 const events=[],client=await makeClient(events);
 client.phase='awaiting-native-world';
 const message=new Uint8Array(15);const dv=new DataView(message.buffer);
 dv.setInt32(0,15,true);dv.setInt32(4,CHAT_OPCODE,true);message.set([79,105,0],12);
 client.ws.receive(message);
 assert.equal(events.some(e=>e.type==='chat-message'),false);
 client.close();
});

test('malformed native chat is dropped without disconnecting or spoofing messages',async()=>{
 const events=[],client=await makeClient(events);
 const invalid=new Uint8Array(15),view=new DataView(invalid.buffer);
 view.setInt32(0,invalid.length,true);
 view.setInt32(4,CHAT_OPCODE,true);
 invalid.set([65,0,66],12); // Early NUL and junk.
 client.ws.receive(invalid);
 assert.equal(client.phase,'native-world-ready');
 assert.equal(client.ws.readyState,1);
 assert.equal(events.filter(e=>e.type==='chat-message').length,0);
 assert.deepEqual(events.find(e=>e.type==='chat-dropped'),
  {type:'chat-dropped',reason:'invalid-native-chat'});
 assert.equal(client.sendChat('Continuo no mundo'),true);
 client.close();
});
