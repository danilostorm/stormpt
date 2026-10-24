import net from 'node:net';
import {readFileSync,writeFileSync} from 'node:fs';
import {encodeWebLoginPacket} from '../transport/src/web-login.mjs';
import {PacketDecoder} from '../transport/src/packets.mjs';
const root=new URL('../',import.meta.url);
const tickets=JSON.parse(readFileSync(new URL('secrets/real-web-tickets.json',root)));
async function exchange(gameTicket){
 return new Promise((resolve,reject)=>{
  const s=net.createConnection({host:'192.168.30.169',port:1997});
  const result={characterList:false,opcodes:[],statuses:[]};let settled=false;
  const finish=()=>{if(settled)return;settled=true;s.destroy();resolve(result);};
  const d=new PacketDecoder(p=>{
   const v=new DataView(p.buffer,p.byteOffset,p.length),op=v.getUint32(4,true);
   result.opcodes.push(op);
   if(op===65&&p.length>=16)result.statuses.push(v.getInt32(12,true));
   if(op===9){result.characterList=true;finish();}

  });
  s.on('connect',()=>s.write(encodeWebLoginPacket({gameTicket,expectedAccount:tickets.account})));
  s.on('data',b=>{try{d.feed(b);}catch(e){s.destroy();reject(e);}});
  s.on('close',finish);s.on('error',e=>{if(!settled){settled=true;reject(e);}});
  s.setTimeout(5000,finish);
 });
}
const mode=process.argv[2]||'crypto';
if(mode==='blocked'){
 const r=await exchange(tickets.gameTicket);
 if(r.characterList||!r.statuses.includes(-3)){console.error(JSON.stringify({blockedResult:r}));throw Error('Blocked account was not explicitly rejected with status -3');}
 writeFileSync(new URL('builds/real-native-blocked-account.json',root),JSON.stringify({blockedAccountDenied:true,...r},null,2));
 console.log('REAL_BLOCKED_ACCOUNT_DENIED',JSON.stringify(r));
}else{
 const dot=tickets.gameTicket.indexOf('.');
 const tampered=tickets.gameTicket.slice(0,dot+1)+(tickets.gameTicket[dot+1]==='A'?'B':'A')+tickets.gameTicket.slice(dot+2);
 const bad=await exchange(tampered);if(bad.characterList)throw Error('Tampered signature accepted');
 const good=await exchange(tickets.gameTicket);if(!good.characterList){console.error(JSON.stringify({bad,good}));throw Error('Fresh valid ticket was not accepted');}
 const replay=await exchange(tickets.gameTicket);if(replay.characterList)throw Error('Replayed ticket accepted');
 const result={realGameServer:true,tamperedSignatureDenied:true,validTicketAccepted:true,replayDenied:true,bad,good,replay};
 writeFileSync(new URL('builds/real-native-security-result.json',root),JSON.stringify(result,null,2));
 console.log('REAL_NATIVE_SECURITY_CHECKS_PASSED',JSON.stringify({tamperedSignatureDenied:true,validTicketAccepted:true,replayDenied:true}));
}
