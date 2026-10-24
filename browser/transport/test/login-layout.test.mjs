import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeOriginalLoginPacket, LOGIN_PACKET_LAYOUT as L } from '../src/login-layout.mjs';
import { inspectPacket } from '../src/packets.mjs';
test('original login packet matches real C++ source layout',()=>{
 const b=encodeOriginalLoginPacket({
  account:'testuser',
  password:'a-test-password',
  clientHash:'a'.repeat(32),
 });
 assert.equal(b.length,400);
 assert.deepEqual(inspectPacket(b),{length:400,opcode:8});
 assert.equal(b.subarray(8,16).toString(),'testuser');
 assert.equal(b.subarray(29,44).toString(),'a-test-password');
 assert.equal(b.subarray(61,93).toString(),'a'.repeat(32));
 assert.equal(b.subarray(94).every(x=>x===0),true);
 assert.equal(Object.values(L).filter(x=>typeof x==='number').length,8);
});
test('no accidental missing fields or malformed Windows-legacy strings',()=>{
 const params={account:'abc',password:'p',clientHash:'a'.repeat(32)};
 assert.throws(()=>encodeOriginalLoginPacket({...params, account:'x'.repeat(21)}));
 assert.throws(()=>encodeOriginalLoginPacket({...params, password:''}));
 assert.throws(()=>encodeOriginalLoginPacket({...params, clientHash:''}));
 assert.throws(()=>encodeOriginalLoginPacket({...params, account:'test\0name'}));
});
