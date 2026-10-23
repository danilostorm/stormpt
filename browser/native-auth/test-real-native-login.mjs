import {readFileSync,writeFileSync} from 'node:fs';
import {WebSocket} from '../transport/node_modules/ws/wrapper.mjs';
import {createGateway} from '../transport/src/gateway.mjs';
import {StormPTBrowserSession} from '../client/src/browser-session.mjs';
class TestSocket extends WebSocket {constructor(url,protocols){super(url,protocols,{origin:'https://stormpt.hoststorm.com.br'});}}
const root=new URL('../',import.meta.url);
const tickets=JSON.parse(readFileSync(new URL('secrets/real-web-tickets.json',root)));
const secret=readFileSync(new URL('secrets/gateway.hmac',root),'utf8').trim();
const gateway=createGateway({secret,requireBoundTicket:true,allowNativeWebLogin:true,listenPort:0});
await gateway.start();
let session,timeout;
const events=[];
try{
 const done=new Promise((resolve,reject)=>{
  timeout=setTimeout(()=>reject(Error('Real GameServer did not return character list within 15s')),15000);
  session=new StormPTBrowserSession({expectedAccount:tickets.account,Socket:TestSocket,allowNativeWebLogin:true,
   onEvent:e=>{
    events.push({type:e.type});
    if(e.type==='character-list')resolve(e.list);
    if(e.type==='protocol-error'||e.type==='transport-error')reject(Error(e.message||e.type));
   }});
 });
 done.catch(()=>{});
 await session.connect({url:'ws://127.0.0.1:'+gateway.server.address().port+'/game',ticket:tickets.ticket,gameTicket:tickets.gameTicket});
 const list=await done;
 const result={at:new Date().toISOString(),account:tickets.account,
  actualGameServer:'192.168.30.169:1997',nativeGameServerAuthorized:true,
  characterCount:list.characters.length,characters:list.characters,events,
  note:'Real ASP.NET account + real issuer + actual native C++ GameServer; no fixture server.'};
 writeFileSync(new URL('builds/real-native-login-result.json',root),JSON.stringify(result,null,2));
 console.log(JSON.stringify({result:'REAL_NATIVE_GAMESERVER_LOGIN_CONFIRMED',account:result.account,characterCount:result.characterCount,events}));
}finally{
 console.log(JSON.stringify({observedEvents:events}));
 clearTimeout(timeout);session?.close();await gateway.stop();
}
