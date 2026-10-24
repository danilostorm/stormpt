/** Proposed QA-only basic attack wire contract. NOT connected to the live GameServer.
 * The browser supplies only target identity and sequence; native server combat
 * rules must independently resolve the target and determine damage.
 */
import {inspectPacket} from './packets.mjs';
export const COMBAT_INTENT=Object.freeze({opcode:0x53570007,version:1,size:28,basicAttack:1});
function validId(n){return Number.isInteger(n)&&n>0&&n<=0xffffffff;}
function bytes(input){return input instanceof Uint8Array?input:input instanceof ArrayBuffer?new Uint8Array(input):null;}
export function encodeBasicAttackIntent({sequence,target}={}){
 if(!validId(sequence)||!validId(target))throw Error('Invalid basic attack intent');
 const b=new Uint8Array(COMBAT_INTENT.size),v=new DataView(b.buffer);
 [COMBAT_INTENT.size,COMBAT_INTENT.opcode,COMBAT_INTENT.version,sequence,target,COMBAT_INTENT.basicAttack,0]
  .forEach((n,i)=>v.setUint32(i*4,n,true));
 return b;
}
export function decodeBasicAttackIntent(input){
 const b=bytes(input);if(!b)throw TypeError('Expected Uint8Array or ArrayBuffer');
 const h=inspectPacket(b);
 if(h.opcode!==COMBAT_INTENT.opcode||h.length!==COMBAT_INTENT.size)throw Error('Invalid combat packet');
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 const version=v.getUint32(8,true),sequence=v.getUint32(12,true),target=v.getUint32(16,true);
 const action=v.getUint32(20,true),reserved=v.getUint32(24,true);
 if(version!==COMBAT_INTENT.version||!validId(sequence)||!validId(target)||
    action!==COMBAT_INTENT.basicAttack||reserved!==0)throw Error('Invalid combat intent');
 return {sequence,target};
}
