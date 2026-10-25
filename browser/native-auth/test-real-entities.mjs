import net from 'node:net';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {readFileSync,writeFileSync} from 'node:fs';
import {PacketDecoder} from '../transport/src/packets.mjs';
import {encodeWebLoginPacket,encodeWebCharacterSelection} from '../transport/src/web-login.mjs';
import {RecordAssembler} from '../transport/src/record-fragments.mjs';import {decodeRecordWorld} from '../transport/src/record-world.mjs';
import {WORLD,encodeWorldJoin,encodeMoveIntent} from '../transport/src/world-protocol.mjs';import {ENTITIES,decodeEntitySnapshot} from '../transport/src/entity-protocol.mjs';
const root=new URL('../',import.meta.url);
execFileSync('python3',[new URL('native-auth/fetch-real-tickets.py',root).pathname],{env:{...process.env,STORMPT_QA_SITE_BASE:'http://192.168.30.169'},stdio:'pipe'});
const t=JSON.parse(readFileSync(new URL('secrets/real-web-tickets.json',root))),name='StormWebQA1',snapshots=[];
await new Promise((resolve,reject)=>{
 const socket=net.createConnection({host:'192.168.30.169',port:1997}),assembler=new RecordAssembler();let record,seq=0,timer,done=false;
 const finish=e=>{if(done)return;done=true;clearInterval(timer);socket.end();e?reject(e):resolve();};
 const decoder=new PacketDecoder(bytes=>{try{
 const op=new DataView(bytes.buffer,bytes.byteOffset,bytes.length).getUint32(4,true);
 if(op===9)socket.write(encodeWebCharacterSelection({characterName:name}));
 if(op===4){const r=assembler.feed(bytes);if(r){record=decodeRecordWorld(r,{expectedAccount:t.account,expectedName:name});socket.write(encodeWorldJoin({serial:record.identity.serial}));}}
 if(op===WORLD.state&&!timer)timer=setInterval(()=>socket.write(encodeMoveIntent({sequence:++seq,direction:0})),1000);
 if(op===ENTITIES.opcode){const s=decodeEntitySnapshot(bytes,{expectedObserver:record.identity.serial});assert.equal(s.sequence,snapshots.length+1);snapshots.push(s);if(snapshots.length===3)finish();}
 if(op===65)throw Error('Real server login denied');
 }catch(e){finish(e);}});
 socket.on('connect',()=>socket.write(encodeWebLoginPacket({gameTicket:t.gameTicket,expectedAccount:t.account})));
 socket.on('data',b=>{try{decoder.feed(b);}catch(e){finish(e);}});socket.on('error',finish);socket.on('close',()=>{if(!done)finish(Error('Entity stream closed'));});socket.setTimeout(15000,()=>finish(Error('Entity snapshot timeout')));
 setTimeout(()=>{if(!done)finish(Error('Entity protocol not delivered'));},18000).unref();
});
assert.ok(snapshots.some(s=>s.entities.some(e=>e.kind===1)),'Actual NPC required');
const result={at:new Date().toISOString(),actualGameServer:true,mocked:false,readOnly:true,snapshots};
writeFileSync(new URL('builds/real-entities-result.json',root),JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:true,snapshots:snapshots.length,count:snapshots[0].entities.length,entities:snapshots[0].entities.map(e=>({name:e.name,kind:e.kind,bodyModel:e.bodyModel}))}));
