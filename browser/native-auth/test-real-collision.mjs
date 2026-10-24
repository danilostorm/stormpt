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
const name='StormWebQA2',states=[];let saved,blockedPosition,blockedCount=0,retreatCount=0,checkpoint=false;
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
    let direction=5,delay=65;
    if(checkpoint){ended=true;clearTimeout(timer);s.end();resolve();return;}
    if(state.status===1&&blockedCount<4){
     if(!blockedPosition)blockedPosition=state.position;
     assert.deepEqual(state.position,blockedPosition,'Blocked retries must not displace character');blockedCount++;
    }
    if(blockedCount>=4){
     direction=1;
     if(retreatCount++>=5){direction=0;delay=1100;checkpoint=true;}
    }
    if(state.sequence>=140&&!blockedPosition)throw Error('No collision encountered along bounded QA path');
    timer=setTimeout(()=>s.write(encodeMoveIntent({sequence:state.sequence+1,direction})),delay);
   }
  }catch(e){fail(e);}
 });
 s.on('connect',()=>s.write(encodeWebLoginPacket({gameTicket:t.gameTicket,expectedAccount:t.account})));
 s.on('data',b=>{try{d.feed(b);}catch(e){fail(e);}});
 s.on('error',fail);s.on('close',()=>{if(!ended)fail(Error('Closed before world confirmation; snapshots='+states.length));});
 s.setTimeout(20000,()=>fail(Error('No world response')));
});
assert.ok(blockedCount>=4,'Original collision engine must refuse repeated blocked steps');
assert.ok(states.some(s=>s.status===0&&s.sequence>states.find(x=>x.status===1).sequence),'Player must be able to retreat after collision');
for(let i=1;i<states.length;i++){
 const a=states[i-1],b=states[i];assert.equal(b.sequence,i);
 assert.ok(Math.hypot(b.position[0]-a.position[0],b.position[2]-a.position[2])/256<=5.01);
}
const result={at:new Date().toISOString(),actualGameServer:true,syntheticServer:false,name,blockedCount,blockedPosition,retreated:true,states,note:'Legitimate QA directional intents only. This proves original terrain collision rejection; exact obstacle classification not established.'};
writeFileSync(new URL('builds/real-native-collision-result.json',root),JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:true,snapshots:states.length,blockedCount,blockedPosition,last:states.at(-1).position}));
