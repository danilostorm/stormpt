import net from 'node:net';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {PacketDecoder} from '../transport/src/packets.mjs';
import {encodeWebLoginPacket,encodeWebCharacterSelection} from '../transport/src/web-login.mjs';
import {RecordAssembler} from '../transport/src/record-fragments.mjs';
import {decodeRecordWorld} from '../transport/src/record-world.mjs';
import {WORLD,encodeWorldJoin,encodeMoveIntent,decodeWorldSnapshot} from '../transport/src/world-protocol.mjs';
const root=new URL('../',import.meta.url);
execFileSync('python3',[new URL('native-auth/fetch-real-tickets.py',root).pathname],{env:{...process.env,STORMPT_QA_SITE_BASE:'http://192.168.30.169'},stdio:'pipe'});
const t=JSON.parse(readFileSync(new URL('secrets/real-web-tickets.json',root)));
const name='StormWebQA1',states=[];let saved;
await new Promise((resolve,reject)=>{
 const s=net.createConnection({host:'192.168.30.169',port:1997}),a=new RecordAssembler();let ended=false,timer,record;
 const fail=e=>{if(ended)return;ended=true;clearTimeout(timer);s.destroy();reject(e);};
 const d=new PacketDecoder(p=>{
  try{
   const op=new DataView(p.buffer,p.byteOffset,p.length).getUint32(4,true);
   if(op===9)s.write(encodeWebCharacterSelection({characterName:name}));
   if(op===4){const b=a.feed(p);if(b){record=decodeRecordWorld(b,{expectedAccount:t.account,expectedName:name});saved=record;s.write(encodeWorldJoin({serial:record.identity.serial}));}}
   if(op===65)throw Error('GameServer login denied');
   if(op===WORLD.state){
    const state=decodeWorldSnapshot(p,{expectedSerial:record.identity.serial,expectedName:name});states.push(state);
    if(state.sequence<24)timer=setTimeout(()=>s.write(encodeMoveIntent({sequence:state.sequence+1,direction:state.sequence<12?3:7})),65);
    else if(state.sequence===24)timer=setTimeout(()=>s.write(encodeMoveIntent({sequence:25,direction:0})),1100);
    else{ended=true;clearTimeout(timer);s.end();resolve();}
   }
  }catch(e){fail(e);}
 });
 s.on('connect',()=>s.write(encodeWebLoginPacket({gameTicket:t.gameTicket,expectedAccount:t.account})));
 s.on('data',b=>{try{d.feed(b);}catch(e){fail(e);}});
 s.on('error',fail);s.on('close',()=>{if(!ended)fail(Error('Closed before world confirmation; snapshots='+states.length));});
 s.setTimeout(20000,()=>fail(Error('No world response')));
});
assert.equal(states.length,26);assert.equal(states[0].field,3);
const first=states[0],moved=states.some(s=>s.position[0]!==first.position[0]||s.position[2]!==first.position[2]);
assert.ok(moved,'Actual original collision engine must accept at least one step');
for(let i=1;i<states.length;i++){
 const a=states[i-1],b=states[i],distance=Math.hypot(b.position[0]-a.position[0],b.position[2]-a.position[2])/256;
 assert.ok(distance<=5.01,'No teleport/speed overflow');assert.equal(b.sequence,i);
}
const result={at:new Date().toISOString(),actualGameServer:true,syntheticServer:false,name,record:saved,
 authoritativeMovementConfirmed:true,states,firstPosition:first.position,lastPosition:states.at(-1).position,
 note:'Actual native engine CheckNextMove; checkpoint requested after movement; reconnect still needs separate proof.'};
writeFileSync(new URL('builds/real-native-movement-result.json',root),JSON.stringify(result,null,2));
console.log(JSON.stringify({authoritativeMovementConfirmed:true,snapshots:states.length,first:first.position,last:states.at(-1).position,statuses:[...new Set(states.map(s=>s.status))]}));
