import {inspectPacket} from './packets.mjs';
export const ENTITIES=Object.freeze({opcode:0x53570004,header:32,row:204,max:32});
function string(bytes,offset,size,{ascii=false}={}){
 const raw=bytes.subarray(offset,offset+size),nul=raw.indexOf(0);
 if(nul<0||raw.subarray(nul).some(c=>c!==0)||raw.subarray(0,nul).some(c=>c<32||c===127||ascii&&c>126))throw Error('Invalid entity string');
 return new TextDecoder(ascii?'utf-8':'windows-1252').decode(raw.subarray(0,nul));
}
function model(s){
 if(s&&(!/^char[\\/][A-Za-z0-9_ .\\/-]+$/i.test(s)||s.includes('..')||s.includes(':')))throw Error('Invalid entity asset reference');
 return s;
}
export function decodeEntitySnapshot(input,{expectedObserver,expectedField=3}={}){
 if(!Number.isInteger(expectedField)||expectedField<0||expectedField>255)throw RangeError('Invalid trusted entity field');
 const b=input instanceof ArrayBuffer?new Uint8Array(input):input,h=inspectPacket(b),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(h.opcode!==ENTITIES.opcode||h.length<ENTITIES.header||v.getUint32(8,true)!==1)throw Error('Invalid entity snapshot');
 const observer=v.getUint32(12,true),sequence=v.getUint32(16,true),tick=v.getUint32(20,true),field=v.getInt32(24,true),count=v.getUint32(28,true);
 if(!observer||!sequence||field!==expectedField||count>ENTITIES.max||h.length!==ENTITIES.header+count*ENTITIES.row||expectedObserver!==undefined&&observer!==expectedObserver)throw Error('Entity snapshot identity/size mismatch');
 const ids=new Set(),entities=[];
 for(let i=0;i<count;i++){
  const p=ENTITIES.header+i*ENTITIES.row,serial=v.getUint32(p,true),kind=v.getUint32(p+4,true),motion=v.getUint32(p+8,true),heading=v.getUint32(p+12,true);
  const position=[16,20,24].map(o=>v.getInt32(p+o,true)),life=v.getInt32(p+28,true),maxLife=v.getInt32(p+32,true),level=v.getInt32(p+36,true),job=v.getInt32(p+40,true);
  const name=string(b,p+44,32),bodyModel=model(string(b,p+76,64,{ascii:true})),faceModel=model(string(b,p+140,64,{ascii:true}));
  if(!serial||serial===observer||ids.has(serial)||![1,2,3].includes(kind)||motion>65535||heading>4095||position.some(x=>Math.abs(x)>25600000)||life<0||maxLife<life||level<0||level>100000||job<0||job>100000||!name)throw Error('Invalid authoritative entity');
  ids.add(serial);entities.push({serial,kind,motion,heading,position,life,maxLife,level,job,name,bodyModel,faceModel});
 }
 return {observer,sequence,tick,field,entities};
}
