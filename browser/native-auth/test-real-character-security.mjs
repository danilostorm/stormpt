import net from 'node:net';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {PacketDecoder} from '../transport/src/packets.mjs';
import {encodeWebLoginPacket,encodeWebCharacterSelection} from '../transport/src/web-login.mjs';
import {encodeCharacterCreation} from '../transport/src/character-creation.mjs';
const root=new URL('../',import.meta.url);
execFileSync('python3',[new URL('native-auth/fetch-real-tickets.py',root).pathname],{env:{...process.env,STORMPT_QA_SITE_BASE:'http://192.168.30.169'},stdio:'pipe'});
const t=JSON.parse(readFileSync(new URL('secrets/real-web-tickets.json',root)));
assert.match(t.account,/^webqa1023[0-9a-f]{6}$/);
const duplicate=encodeCharacterCreation({account:t.account,name:'StormWebQA1'});
const wrongClass=encodeCharacterCreation({account:t.account,name:'WebDeniedClass'});new DataView(wrongClass.buffer).setInt32(8,8,true);
const traversal=encodeCharacterCreation({account:t.account,name:'WebDeniedPath'});traversal.fill(0,41,73);traversal.set(new TextEncoder().encode('../WebDenied'),41);
const cases=[{name:'duplicate-name',packet:duplicate},{name:'unsupported-class',packet:wrongClass},{name:'path-traversal',packet:traversal}];
const result={at:new Date().toISOString(),realGameServer:true,rejections:[],foreignRecordReceived:false,ownershipDisconnected:false};
await new Promise((resolve,reject)=>{
 const s=net.createConnection({host:'192.168.30.169',port:1997});let stage=-1,done=false;
 const fail=e=>{if(done)return;done=true;s.destroy();reject(e);};
 const sendNext=()=>{
  ++stage;
  if(stage<cases.length)s.write(cases[stage].packet);
  else s.write(encodeWebCharacterSelection({characterName:'NotOwnedWebQA'}));
 };
 const d=new PacketDecoder(p=>{
  const v=new DataView(p.buffer,p.byteOffset,p.length),op=v.getUint32(4,true);
  if(op===9){assert.equal(stage,-1);sendNext();}
  if(op===11){assert.ok(stage>=0&&stage<cases.length);assert.equal(v.getInt32(12,true),0,cases[stage].name+' must be rejected');result.rejections.push(cases[stage].name);sendNext();}
  if(op===4){result.foreignRecordReceived=true;fail(Error('Unauthorized record returned'));}
 });
 s.on('connect',()=>s.write(encodeWebLoginPacket({gameTicket:t.gameTicket,expectedAccount:t.account})));
 s.on('data',b=>{try{d.feed(b);}catch(e){fail(e);}});
 s.on('error',fail);
 s.on('close',()=>{
  if(done)return;done=true;
  try{assert.equal(result.rejections.length,3);assert.equal(stage,3);result.ownershipDisconnected=true;resolve();}catch(e){reject(e);}
 });
 s.setTimeout(10000,()=>fail(Error('Security exchange timed out; no false rejection proof')));
});
writeFileSync(new URL('builds/real-character-security-result.json',root),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
