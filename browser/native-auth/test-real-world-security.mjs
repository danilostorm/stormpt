import net from 'node:net';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {PacketDecoder} from '../transport/src/packets.mjs';
import {encodeWebLoginPacket,encodeWebCharacterSelection} from '../transport/src/web-login.mjs';
import {RecordAssembler} from '../transport/src/record-fragments.mjs';
import {decodeRecordIdentity} from '../transport/src/record-identity.mjs';
import {WORLD,encodeWorldJoin,encodeMoveIntent,decodeWorldSnapshot} from '../transport/src/world-protocol.mjs';
const root=new URL('../',import.meta.url),name='StormWebQA1';
function tickets(){
 execFileSync('python3',[new URL('native-auth/fetch-real-tickets.py',root).pathname],{env:{...process.env,STORMPT_QA_SITE_BASE:'http://192.168.30.169'},stdio:'pipe'});
 return JSON.parse(readFileSync(new URL('secrets/real-web-tickets.json',root)));
}
async function probe(mode){
 const t=mode==='anonymous'?null:tickets(),states=[];let serial=0;
 await new Promise((resolve,reject)=>{
  const s=net.createConnection({host:'192.168.30.169',port:1997}),a=new RecordAssembler();let finished=false;
  const fail=e=>{if(finished)return;finished=true;s.destroy();reject(e);};
  const d=new PacketDecoder(p=>{
   try{
    const op=new DataView(p.buffer,p.byteOffset,p.length).getUint32(4,true);
    if(op===9){
     if(mode==='no-record')s.write(encodeWorldJoin({serial:123}));
     else s.write(encodeWebCharacterSelection({characterName:name}));
    }
    if(op===4){const r=a.feed(p);if(r){serial=decodeRecordIdentity(r).serial;s.write(encodeWorldJoin({serial:serial+(mode==='wrong-serial'?1:0)}));}}
    if(op===WORLD.state){
     const state=decodeWorldSnapshot(p,{expectedSerial:serial,expectedName:name});states.push(state);
     if(mode==='bad-direction'){const q=encodeMoveIntent({sequence:1,direction:1});new DataView(q.buffer).setUint32(16,9,true);s.write(q);}
     if(mode==='replay'){s.write(encodeMoveIntent({sequence:1,direction:0}));}
     if(mode==='burst'){
      if(state.sequence===0)for(let i=1;i<=6;i++)s.write(encodeMoveIntent({sequence:i,direction:3}));
      if(state.sequence===6){finished=true;s.end();resolve();}
     }
    }
   }catch(e){fail(e);}
  });
  s.on('connect',()=>s.write(mode==='anonymous'?encodeWorldJoin({serial:123}):encodeWebLoginPacket({gameTicket:t.gameTicket,expectedAccount:t.account})));
  s.on('data',b=>{try{d.feed(b);}catch(e){fail(e);}});
  s.on('error',fail);s.setTimeout(10000,()=>fail(Error(mode+' timeout; no false denial proof')));
  s.on('close',()=>{
   if(finished)return;finished=true;
   try{
    assert.notEqual(mode,'burst','Burst should be acknowledged safely');
    assert.equal(states.length,mode==='replay'?2:mode==='bad-direction'?1:0,mode);
    resolve();
   }catch(e){reject(e);}
  });
 });
 if(mode==='burst'){
  assert.equal(states.length,7);assert.ok(states.some(s=>s.status===2));
  const a=states[0],b=states.at(-1),distance=Math.hypot(b.position[0]-a.position[0],b.position[2]-a.position[2])/256;
  const delta=(b.tick-a.tick)>>>0;
  assert.ok(distance<=50*(delta+100)/1000+.02,'Burst must not create movement credit');
 }
 return {mode,passed:true,snapshots:states.length,rateLimited:states.some(s=>s.status===2)};
}
const results=[];
for(const mode of ['anonymous','no-record','wrong-serial','bad-direction','replay','burst']){
 results.push(await probe(mode));await new Promise(r=>setTimeout(r,1000));
}
writeFileSync(new URL('builds/real-world-security-result.json',root),JSON.stringify({at:new Date().toISOString(),actualGameServer:true,results},null,2));
console.log(JSON.stringify(results));
