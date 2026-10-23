import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {WebSocket} from '../transport/node_modules/ws/wrapper.mjs';
import {createGateway} from '../transport/src/gateway.mjs';
import {StormPTBrowserSession} from '../client/src/browser-session.mjs';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),name='StormWebQA1';
class TestSocket extends WebSocket {constructor(url,protocols){super(url,protocols,{origin:'https://stormpt.hoststorm.com.br'});}}
function tickets(){
 execFileSync('python3',[new URL('native-auth/fetch-real-tickets.py',root).pathname],{env:{...process.env,STORMPT_QA_SITE_BASE:'http://192.168.30.169'},stdio:'pipe'});
 return JSON.parse(readFileSync(new URL('secrets/real-web-tickets.json',root)));
}
const secret=readFileSync(new URL('secrets/gateway.hmac',root),'utf8').trim();
async function connection(mode){
 const t=tickets();
 assert.match(t.account,/^webqa1023[0-9a-f]{6}$/);
 const gateway=createGateway({secret,requireBoundTicket:true,allowNativeWebLogin:true,listenPort:0});
 await gateway.start();let session,timer;
 try{
  const done=new Promise((resolve,reject)=>{
   timer=setTimeout(()=>reject(Error('Actual GameServer '+mode+' timeout')),30000);
   session=new StormPTBrowserSession({expectedAccount:t.account,Socket:TestSocket,allowNativeWebLogin:true,onEvent:e=>{
    try{
     if(e.type==='character-list'){
      const existing=e.list.characters.find(c=>c.name===name);
      if(mode==='create'){
       if(existing)resolve({created:false,alreadyExists:true,list:e.list});
       else session.createCharacter(name);
      }else{
       assert.ok(existing,'Created character must survive disconnect and relogin');
       assert.equal(existing.level,1);assert.equal(existing.job,1);
       session.selectCharacter(name);
      }
     }
     if(e.type==='character-creation-result'){
      assert.equal(e.created,true,'Native server must persist new character');
      resolve({created:true,name:e.name});
     }
     if(e.type==='character-record'){
      assert.equal(e.identity.name,name);assert.equal(e.identity.level,1);assert.equal(e.identity.job,1);
      assert.ok(e.identity.serial>0);
      writeFileSync(new URL('builds/qa-character-record.bin',root),e.record);
      resolve({identity:e.identity,recordBytes:e.record.length,realRecordReceived:true});
     }
     if(['protocol-error','transport-error','game-login-denied'].includes(e.type))reject(Error(e.message||e.type+':'+e.code));
    }catch(err){reject(err);}
   }});
  });done.catch(()=>{});
  await session.connect({url:'ws://127.0.0.1:'+gateway.server.address().port+'/game',ticket:t.ticket,gameTicket:t.gameTicket});
  return await done;
 }finally{clearTimeout(timer);session?.close();await gateway.stop();}
}
const creation=await connection('create');
await new Promise(r=>setTimeout(r,2500));
const loaded=await connection('load');
const result={at:new Date().toISOString(),actualGameServer:'192.168.30.169:1997',creation,loaded,
 mockedServer:false,persistedAcrossReconnect:true,playable:false};
writeFileSync(new URL('builds/real-native-character-result.json',root),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
