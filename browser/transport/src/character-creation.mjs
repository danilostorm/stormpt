/** Original smTRANS_CHAR_COMMAND2 Win32 ABI (smPacket.h), native creation profile v1.
 * Only the original level-1 Fighter preset is enabled for the current pilot.
 * Stats, assets, inventory, field and ownership are decided by the GameServer.
 */
import {inspectPacket} from './packets.mjs';
export const CHARACTER_CREATION=Object.freeze({opcode:11,size:76,accountOffset:20,accountLength:21,nameOffset:41,nameLength:32,version:1});
const encoder=new TextEncoder();
function validate(account,name,job){
 if(typeof account!=='string'||!/^[A-Za-z][A-Za-z0-9_]{3,15}$/.test(account))throw Error('Trusted account required');
 if(typeof name!=='string'||!/^[A-Za-z][A-Za-z0-9]{2,15}$/.test(name))throw Error('Name requires 3–16 letters/digits, starting with a letter');
 if(job!==1)throw Error('Only original Fighter preset is enabled');
}
function read(bytes,offset,length){
 const raw=bytes.subarray(offset,offset+length),n=raw.indexOf(0);
 if(n<1||raw.subarray(0,n).some(x=>x<32||x>126)||raw.subarray(n).some(x=>x!==0))throw Error('Invalid creation string');
 return new TextDecoder().decode(raw.subarray(0,n));
}
export function encodeCharacterCreation({account,name,job=1}={}){
 validate(account,name,job);
 const p=new Uint8Array(76),v=new DataView(p.buffer);
 v.setUint32(0,76,true);v.setUint32(4,11,true);v.setInt32(8,job,true);v.setUint32(16,1,true);
 p.set(encoder.encode(account),20);p.set(encoder.encode(name),41);
 return p;
}
export function decodeCharacterCreation(packet,{response=false,expectedAccount,expectedName}={}){
 const {opcode,length}=inspectPacket(packet);
 if(opcode!==11||length!==76)throw Error('Invalid original creation packet');
 const v=new DataView(packet.buffer,packet.byteOffset,packet.byteLength);
 const account=read(packet,20,21),name=read(packet,41,32),job=v.getInt32(8,true),result=v.getInt32(12,true);
 validate(account,name,job);
 if(v.getUint32(16,true)!==1||packet.subarray(73).some(x=>x!==0))throw Error('Invalid native creation version/padding');
 if(response?![0,1].includes(result):result!==0)throw Error('Invalid creation result');
 if(expectedAccount!==undefined&&account!==expectedAccount)throw Error('Creation account mismatch');
 if(expectedName!==undefined&&name!==expectedName)throw Error('Creation name mismatch');
 return {account,name,job,...(response?{created:result===1}:{})};
}
