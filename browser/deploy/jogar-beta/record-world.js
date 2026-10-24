import {decodeRecordInventory,decodeCharacterSheet} from './record-inventory.js';
/** Read-only map/spawn data from actual Win32 TRANS_RECORD_DATA.
 * Layout measured by record-layout.cpp compiled against the private game headers.
 * A saved position is initial server record state; it is not a movement acknowledgement.
 */
import {decodeRecordIdentity} from './record-identity.js';
export const RECORD_WORLD_LAYOUT=Object.freeze({charInfoSize:464,saveOffset:480,dataOffset:1796,saveSize:532});
function cstr(b,start,size){
 const raw=b.subarray(start,start+size),n=raw.indexOf(0);
 if(n<1||raw.subarray(0,n).some(x=>x<32||x>126))throw Error('Invalid record account');
 return new TextDecoder().decode(raw.subarray(0,n));
}
export function decodeRecordWorld(bytes,{expectedAccount,expectedName}={}){
 if(!(bytes instanceof Uint8Array)||bytes.length<1796)throw Error('Incomplete original record');
 const identity=decodeRecordIdentity(bytes),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
 if(expectedName!==undefined&&identity.name!==expectedName)throw Error('Record character mismatch');
 const header=new TextDecoder().decode(bytes.subarray(8,16));
 if(header!=='RC 1.50\u0000'||v.getUint32(480,true)!==150)throw Error('Unsupported original save version');
 const masterAccount=cstr(bytes,748,21);
 if(typeof expectedAccount!=='string'||masterAccount!==expectedAccount)throw Error('Record account mismatch');
 const field=v.getInt32(484,true),x=v.getInt32(492,true),z=v.getInt32(496,true);
 if(field<0||field>=256||Math.abs(x)>512_000_000||Math.abs(z)>512_000_000)throw Error('Invalid saved field/position');
 const throwCount=v.getInt32(1780,true),itemCount=v.getInt32(1784,true),itemSubStart=v.getInt32(1788,true),dataSize=v.getInt32(1792,true);
 if(throwCount<0||throwCount>64||itemCount<0||itemCount>200||itemSubStart<0||itemSubStart>itemCount||
    dataSize<0||1796+dataSize!==bytes.length)throw Error('Invalid record item bounds');
 return {identity,field,position:{x,z},coordinateScale:256,source:'gameserver-saved-record',masterAccount,
  life:{current:v.getInt16(308,true),max:v.getInt16(310,true)},itemCount,inventory:decodeRecordInventory(bytes),sheet:decodeCharacterSheet(bytes)};
}
