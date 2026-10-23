import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeGetRecordRequest, GET_RECORD_REQUEST_LAYOUT as L } from '../src/get-record-request.mjs';

test('exact original smTRANS_CHAR_COMMAND layout and opcode 5',()=>{
 const b=Buffer.from(encodeGetRecordRequest({
   characterName:'Heroi',
   authorizedClientChecksum:0x12345678,
   authorizedClientVersion:1058,
 }));
 assert.equal(b.length,52);
 assert.equal(b.readInt32LE(0),52);
 assert.equal(b.readInt32LE(4),5);
 assert.equal(b.readInt32LE(8),0);
 assert.equal(b.readUInt32LE(12),0x12345678);
 assert.equal(b.readInt32LE(16),1058);
 assert.equal(b.subarray(20,26).toString('ascii'),'Heroi\0');
 assert.equal(b.subarray(26).every(v=>v===0),true);
 assert.equal(L.NAME_BYTES,32);
});
test('reject request without trusted checksum/version and malformed name',()=>{
 const good={characterName:'Heroi',authorizedClientChecksum:0,authorizedClientVersion:1058};
 assert.throws(()=>encodeGetRecordRequest({characterName:'Heroi'}),/checksum/);
 assert.throws(()=>encodeGetRecordRequest({...good,authorizedClientVersion:0}),/version/);
 assert.throws(()=>encodeGetRecordRequest({...good,characterName:'x'.repeat(32)}),/name/);
 assert.throws(()=>encodeGetRecordRequest({...good,characterName:'H\0eroi'}),/name/);
});
