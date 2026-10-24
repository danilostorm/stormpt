import test from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_INTENT,encodeBasicAttackIntent,decodeBasicAttackIntent} from '../src/combat-intent.mjs';
const canonical=()=>encodeBasicAttackIntent({sequence:7,target:12345});
test('basic attack carries only sequence and target; no client damage or coordinates',()=>{
 const b=canonical(),v=new DataView(b.buffer);
 assert.equal(b.length,28);assert.equal(v.getUint32(4,true),COMBAT_INTENT.opcode);
 assert.deepEqual(decodeBasicAttackIntent(b),{sequence:7,target:12345});
 assert.deepEqual(decodeBasicAttackIntent(b.buffer),{sequence:7,target:12345});
 assert.deepEqual([...new Uint32Array(b.buffer)],[28,COMBAT_INTENT.opcode,1,7,12345,1,0]);
});
test('rejects invalid sequence and target before packet creation',()=>{
 for(const n of [undefined,null,0,-1,1.5,NaN,Infinity,2**32,'5']){
  assert.throws(()=>encodeBasicAttackIntent({sequence:n,target:1}));
  assert.throws(()=>encodeBasicAttackIntent({sequence:1,target:n}));
 }
});
test('rejects tampered header, version, action, reserved and zero identities',()=>{
 for(const [offset,value] of [[0,27],[4,0],[8,2],[12,0],[16,0],[20,2],[24,1]]){
  const b=canonical();new DataView(b.buffer).setUint32(offset,value,true);
  assert.throws(()=>decodeBasicAttackIntent(b));
 }
});
test('rejects truncation, extra bytes and wrong input types',()=>{
 const b=canonical();
 assert.throws(()=>decodeBasicAttackIntent(b.subarray(0,27)));
 assert.throws(()=>decodeBasicAttackIntent(new Uint8Array([...b,0])));
 for(const x of [null,{},'packet',123])assert.throws(()=>decodeBasicAttackIntent(x));
});
test('handles nonzero typed-array offsets without reading unrelated bytes',()=>{
 const b=canonical(),container=new Uint8Array(44);
 container.fill(255);container.set(b,8);
 assert.deepEqual(decodeBasicAttackIntent(container.subarray(8,36)),{sequence:7,target:12345});
 assert.throws(()=>decodeBasicAttackIntent(container));
});
test('never accepts action variants or trailing payloads',()=>{
 const b=canonical();new DataView(b.buffer).setUint32(20,0,true);
 assert.throws(()=>decodeBasicAttackIntent(b));
 const c=canonical();new DataView(c.buffer).setUint32(24,0xffffffff,true);
 assert.throws(()=>decodeBasicAttackIntent(c));
});
