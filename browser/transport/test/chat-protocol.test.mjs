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

// C++ ABI cross-reference: Shared/smPacket.h TRANS_CHATMESSAGE (16-byte
// header) and OnSever.cpp SendPlayDataGroup: size=32+strlen(message).
test('native nearby player chat opcode 26 decodes the real server ABI',async()=>{
 const {NEARBY_CHAT_OPCODE,decodeNearbyChatMessage}=await import('../src/chat-protocol.mjs');
 assert.equal(NEARBY_CHAT_OPCODE,26);
 const text=Uint8Array.from([79,108,0xe1,33]);
 const packet=new Uint8Array(32+text.length);
 const view=new DataView(packet.buffer);
 view.setInt32(0,packet.length,true);
 view.setInt32(4,26,true);
 view.setUint32(8,0xc0a80102,true); // raw IP is never returned
 view.setUint32(12,0x12345678,true);
 packet.set(text,16);
 assert.deepEqual(decodeNearbyChatMessage(packet),
  {serial:0x12345678,text:'Olá!',channel:'nearby'});
 assert.equal(Object.hasOwn(decodeNearbyChatMessage(packet),'origin'),false);
});

test('native nearby chat rejects spoofing, malformed sizes and hidden data',async()=>{
 const {decodeNearbyChatMessage}=await import('../src/chat-protocol.mjs');
 const valid=new Uint8Array(35);
 const dv=new DataView(valid.buffer);
 dv.setInt32(0,valid.length,true);dv.setInt32(4,26,true);
 valid.set([79,105,33,0],16);
 assert.equal(decodeNearbyChatMessage(valid).text,'Oi!');
 const tamper=change=>{const p=valid.slice();change(p,new DataView(p.buffer));return p};
 assert.throws(()=>decodeNearbyChatMessage(tamper(p=>{p[20]=42})),/padding/);
 assert.throws(()=>decodeNearbyChatMessage(tamper(p=>{p[18]=0})),/length/);
 assert.throws(()=>decodeNearbyChatMessage(tamper((p,v)=>v.setInt32(4,22,true))),/length/);
 assert.throws(()=>decodeNearbyChatMessage(tamper(p=>{p[16]=10})),/controls/);
 assert.throws(()=>decodeNearbyChatMessage(tamper((p,v)=>v.setInt32(0,999,true))));
});
