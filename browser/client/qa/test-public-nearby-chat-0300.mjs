import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:940,height:660}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let result={ok:false,publicModule:false,decodedNativeNearby:false,noFakeEcho:false,
 malformedRejectedWithoutDisconnect:false,serverChatBeforeWorldIgnored:false,errors:[]};
try{
 const response=await page.goto('https://stormpt.hoststorm.com.br/jogar-beta/index.html',{waitUntil:'domcontentloaded',timeout:40000});
 assert.equal(response.status(),200);
 const test=await page.evaluate(async()=>{
  const {StormPTBrowserSession}=await import('/jogar-beta/browser-session.js');
  class FakeSocket{
   constructor(){this.protocol='stormpt-binary-v1';this.readyState=1;this.handlers={};this.sent=[];queueMicrotask(()=>this.emit('open',{}));}
   addEventListener(k,cb){(this.handlers[k]??=[]).push(cb)}
   emit(k,e){for(const cb of this.handlers[k]??[])cb(e)}
   send(b){this.sent.push(new Uint8Array(b))}
   receive(b){this.emit('message',{data:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)})}
   close(){this.readyState=3;this.emit('close',{})}
  }
  const events=[],s=new StormPTBrowserSession({expectedAccount:'QAtester',Socket:FakeSocket,onEvent:e=>events.push(e)});
  await s.connect({url:'wss://stormpt.hoststorm.com.br/game',ticket:'a'.repeat(64)});
  s.nativeLogin=true;s.phase='native-world-ready';
  const make=(text,corrupt=false)=>{
   const raw=new TextEncoder().encode(text),b=new Uint8Array(32+raw.length),v=new DataView(b.buffer);
   v.setInt32(0,b.length,true);v.setInt32(4,26,true);v.setUint32(8,0xC0A80102,true);
   v.setUint32(12,9001,true);b.set(raw,16);
   if(corrupt)b[b.length-1]=12;
   return b;
  };
  s.ws.receive(make('Outro jogador'));
  const decoded=events.find(e=>e.type==='chat-message')?.message;
  const noEcho=events.filter(e=>e.type==='chat-message').length===1;
  s.ws.receive(make('Invalido',true));
  const dropped=events.some(e=>e.type==='chat-dropped')&&s.phase==='native-world-ready';
  s.phase='awaiting-native-world';s.ws.receive(make('Nao deve aparecer'));
  const beforeWorldIgnored=events.filter(e=>e.type==='chat-message').length===1;
  s.close();
  return {decoded,noEcho,dropped,beforeWorldIgnored};
 });
 assert.deepEqual(test.decoded,{serial:9001,text:'Outro jogador',channel:'nearby'});
 assert.equal(test.noEcho,true);assert.equal(test.dropped,true);assert.equal(test.beforeWorldIgnored,true);
 result={ok:errors.length===0,publicModule:true,decodedNativeNearby:true,
  noFakeEcho:true,malformedRejectedWithoutDisconnect:true,serverChatBeforeWorldIgnored:true,errors};
 console.log(JSON.stringify(result));
 if(!result.ok)process.exitCode=1;
}catch(e){result.errors.push(String(e.message));console.log(JSON.stringify(result));process.exitCode=1}
finally{writeFileSync('/work/builds/public-nearby-chat-0300.json',JSON.stringify(result,null,2));await browser.close()}
