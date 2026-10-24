/** Explicit native web world protocol. Requests contain intent only, never coordinates. */
import {inspectPacket} from './packets.mjs';
export const WORLD=Object.freeze({join:0x53570003,move:0x53570001,state:0x53570002,version:1});
function uint(n,min=0){if(!Number.isInteger(n)||n<min||n>0xffffffff)throw Error('Invalid unsigned protocol value');return n;}
function bytes(input){return input instanceof Uint8Array?input:input instanceof ArrayBuffer?new Uint8Array(input):null;}
function packet(size,opcode){const b=new Uint8Array(size),v=new DataView(b.buffer);v.setUint32(0,size,true);v.setUint32(4,opcode,true);v.setUint32(8,1,true);return [b,v];}
export function encodeWorldJoin({serial}={}){const [b,v]=packet(20,WORLD.join);v.setUint32(12,uint(serial,1),true);return b;}
export function decodeWorldJoin(input,{expectedSerial}={}){
 const b=bytes(input),h=inspectPacket(b);
 if(h.opcode!==WORLD.join||h.length!==20)throw Error('Invalid native world join');
 const v=new DataView(b.buffer,b.byteOffset,b.length),serial=v.getUint32(12,true);
 if(v.getUint32(8,true)!==1||v.getUint32(16,true)||!serial||expectedSerial!==undefined&&serial!==expectedSerial)throw Error('World join identity/version mismatch');
 return {serial};
}
export function encodeMoveIntent({sequence,direction}={}){
 uint(sequence,1);if(!Number.isInteger(direction)||direction<0||direction>8)throw Error('Invalid movement direction');
 const [b,v]=packet(24,WORLD.move);v.setUint32(12,sequence,true);v.setUint32(16,direction,true);return b;
}
export function decodeMoveIntent(input){
 const b=bytes(input),h=inspectPacket(b);
 if(h.opcode!==WORLD.move||h.length!==24)throw Error('Invalid native move size/opcode');
 const v=new DataView(b.buffer,b.byteOffset,b.length),sequence=v.getUint32(12,true),direction=v.getUint32(16,true);
 if(v.getUint32(8,true)!==1||v.getUint32(20,true)||!sequence||direction>8)throw Error('Invalid move intent');
 return {sequence,direction};
}
export function decodeWorldSnapshot(input,{expectedSerial,expectedName,expectedField=3}={}){
 if(!Number.isInteger(expectedField)||expectedField<0||expectedField>255)throw RangeError('Invalid trusted world field');
 const b=bytes(input),h=inspectPacket(b);
 if(h.opcode!==WORLD.state||h.length!==80)throw Error('Invalid native world snapshot');
 const v=new DataView(b.buffer,b.byteOffset,b.length),serial=v.getUint32(12,true),sequence=v.getUint32(16,true),tick=v.getUint32(20,true);
 const field=v.getInt32(24,true),position=[28,32,36].map(p=>v.getInt32(p,true)),heading=v.getInt32(40,true),status=v.getInt32(44,true);
 const raw=b.subarray(48,80),nul=raw.indexOf(0);
 if(nul<1||raw.subarray(0,nul).some(c=>c<32||c>126)||raw.subarray(nul).some(c=>c!==0))throw Error('Invalid snapshot name');
 const name=new TextDecoder().decode(raw.subarray(0,nul));
 if(v.getUint32(8,true)!==1||!serial||field!==expectedField||position.some(n=>Math.abs(n)>25600000)||
    heading<0||heading>4095||![0,1,2].includes(status))throw Error('Invalid authoritative snapshot values');
 if(expectedSerial!==undefined&&serial!==expectedSerial||expectedName!==undefined&&name!==expectedName)throw Error('World snapshot identity mismatch');
 return {serial,sequence,tick,field,position,heading,status,name};
}
