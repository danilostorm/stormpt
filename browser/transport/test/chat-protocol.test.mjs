import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAT_OPCODE,MAX_CHAT_BYTES,encodeChatMessage,decodeChatMessage,ChatSendThrottle} from '../src/chat-protocol.mjs';
function serverChat(text,origin=0){
 const raw=new TextEncoder().encode(text);
 const buf=new Uint8Array(13+raw.length);
 const view=new DataView(buf.buffer);
 view.setInt32(0,buf.length,true);
 view.setInt32(4,CHAT_OPCODE,true);
 view.setUint32(8,origin,true);buf.set(raw,12);return buf;
}
test('wire-compatible StormPT global chat uses opcode 22, size, CP1252 and null',()=>{
 const b=encodeChatMessage('Olá, Priston!');
 const dv=new DataView(b.buffer);
 assert.equal(dv.getInt32(0,true),b.length);
 assert.equal(dv.getInt32(4,true),22);
 assert.equal(b[8],79);
 assert.equal(b[10],0xe1);
 assert.equal(b.at(-1),0);
});
test('outbound chat byte length never exceeds original disconnect threshold',()=>{
 assert.equal(encodeChatMessage('x'.repeat(MAX_CHAT_BYTES)).length,79);
 assert.throws(()=>encodeChatMessage('x'.repeat(71)),/70 bytes/);
 assert.throws(()=>encodeChatMessage('😀'),/incompatível/);
});
test('native console commands, party syntax, newlines and bidi spoofing are denied',()=>{
 for(const str of ['/get-item','~global','@party','`admin','oi\ncomando','\u202ehidden','\u0000bad'])
  assert.throws(()=>encodeChatMessage(str));
});
test('original server chat broadcast decodes CP1252 and dwIP without spoofed identity',()=>{
 const payload=new Uint8Array([0x4f,0x6c,0xe1,0x20,0x6d,0x75,0x6e,0x64,0x6f]);
 const p=new Uint8Array(13+payload.length);
 new DataView(p.buffer).setInt32(0,p.length,true);
 new DataView(p.buffer).setInt32(4,22,true);
 new DataView(p.buffer).setUint32(8,256,true);
 p.set(payload,12);
 assert.deepEqual(decodeChatMessage(p),{origin:256,text:'Olá mundo'});
});
test('bad chat broadcasts with malformed NUL, junk, and length rejected',()=>{
 const p=serverChat('hello');
 assert.equal(decodeChatMessage(p).text,'hello');
 for(const bad of [p.subarray(0,-1),new Uint8Array(12),Uint8Array.from(p)]){
  if(bad.length===p.length)bad[13]=0;
  else if(bad.length===p.length-1){}
  else bad[0]=0;
  assert.throws(()=>decodeChatMessage(bad));
 }
});
test('simple sliding send interval, no spam while in-world',()=>{
 let time=1000;const gate=new ChatSendThrottle({now:()=>time,minIntervalMs:2000});
 assert.equal(gate.allow(),true);time=2999;assert.equal(gate.allow(),false);
 time=3000;assert.equal(gate.allow(),true);gate.reset();assert.equal(gate.allow(),true);
});
test('gateway-level binary validation blocks commands and malformed frames',async()=>{
 const {validateClientChatFrame}=await import('../src/chat-protocol.mjs');
 assert.equal(validateClientChatFrame(encodeChatMessage('Olá!')),'Olá!');
 const packet=encodeChatMessage('good');
 packet[8]=47; // An untrusted JS client could bypass the form.
 assert.throws(()=>validateClientChatFrame(packet),/Comandos/);
});
