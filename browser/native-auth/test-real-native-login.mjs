import {readFileSync,writeFileSync} from 'node:fs';
import {WebSocket} from '../transport/node_modules/ws/wrapper.mjs';
import {createGateway} from '../transport/src/gateway.mjs';
import {StormPTBrowserSession} from '../client/src/browser-session.mjs';

const root=new URL('../',import.meta.url);
const tickets=JSON.parse(readFileSync(new URL('secrets/real-web-tickets.json',root)));
const tokenParts=typeof tickets.ticket==='string'?tickets.ticket.split('.'): [];
let claims=null;
try { if(tokenParts.length===2) claims=JSON.parse(Buffer.from(tokenParts[0],'base64url').toString('utf8')); } catch {}
const now=Math.floor(Date.now()/1000);
const ticketExpiresIn=Number.isSafeInteger(claims?.exp)?claims.exp-now:null;
const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=new URL('builds/real-native-login-result-'+timestamp+'.json',root);
const result={at:new Date().toISOString(),realGameServer:'192.168.30.169:1997',accountBound:typeof tickets.account==='string',tokensOmitted:true,characterNamesOmitted:true,characterSerialsOmitted:true,ticketExpiresInSeconds:ticketExpiresIn};
let stage='preflight',gateway,session,timeout,wsUpgradeStatus=null,wsUpgradeStatusText=null;
class TestSocket extends WebSocket {
  constructor(url,protocols){
    super(url,protocols,{origin:'https://stormpt.hoststorm.com.br'});
    this.on('unexpected-response',(req,res)=>{
      wsUpgradeStatus=res.statusCode;
      wsUpgradeStatusText=String(res.statusMessage||'').replace(/[^A-Za-z0-9 _-]/g,'').slice(0,80);
      res.resume();
    });
  }
}
try {
  if(!claims||claims.aud!=='stormpt-browser-tcp'||!Number.isSafeInteger(claims.exp)||claims.exp<=now||claims.exp>now+60||ticketExpiresIn===null)
    throw Error('ticket-expired-or-invalid');
  const secret=readFileSync(new URL('secrets/gateway.hmac',root),'utf8').trim();
  gateway=createGateway({secret,requireBoundTicket:true,allowNativeWebLogin:true,listenPort:0});
  await gateway.start();
  const events=[];
  let resolveList,rejectList;
  const done=new Promise((resolve,reject)=>{resolveList=resolve;rejectList=reject;});
  done.catch(()=>{});
  timeout=setTimeout(()=>rejectList(Error('character-list-timeout')),15000);
  session=new StormPTBrowserSession({expectedAccount:tickets.account,Socket:TestSocket,allowNativeWebLogin:true,onEvent:e=>{
    events.push({type:e.type});
    if(e.type==='character-list')resolveList(e.list);
    if(e.type==='protocol-error'||e.type==='transport-error')rejectList(Error(e.type));
  }});
  stage='websocket-upgrade';
  await session.connect({url:'ws://127.0.0.1:'+gateway.server.address().port+'/game',ticket:tickets.ticket,gameTicket:tickets.gameTicket});
  stage='native-character-list';
  const list=await done;
  result.success=true;
  result.nativeGameServerAuthorized=true;
  result.characterListReceived=true;
  result.characterCount=Array.isArray(list.characters)?list.characters.length:0;
  result.eventTypes=events.map(e=>e.type);
} catch(e) {
  result.success=false;
  result.failureStage=stage;
  result.failureCode=String(e?.message||'unknown').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,80);
} finally {
  if(timeout)clearTimeout(timeout);
  result.wsUpgradeStatus=wsUpgradeStatus;
  result.wsUpgradeStatusText=wsUpgradeStatusText;
  try{session?.close();}catch{}
  if(gateway){try{await gateway.stop();}catch{}}
  result.finishedAt=new Date().toISOString();
  writeFileSync(output,JSON.stringify(result,null,2),{mode:0o600});
  console.log(JSON.stringify({...result,resultFile:output.pathname}));
}
if(!result.success)process.exitCode=1;
