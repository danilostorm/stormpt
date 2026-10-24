import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordAssembler, decodeRecordFragment, RECORD_FRAGMENT_LAYOUT as L } from '../src/record-fragments.mjs';

function record(size) {
  const bytes = new Uint8Array(size);
  const v = new DataView(bytes.buffer);
  v.setInt32(0,size,true);
  v.setInt32(4,L.opcode,true);
  for(let i=8;i<size;i++) bytes[i]=i%251;
  return bytes;
}
function frames(original, {legacySmall = false} = {}) {
  const total = Math.ceil(original.length / L.maxDataBytes);
  return Array.from({length:total},(_,i)=>{
    const payload = original.subarray(i*L.maxDataBytes, (i+1)*L.maxDataBytes);
    const p = new Uint8Array(payload.length+L.overheadBytes);
    const v = new DataView(p.buffer);
    v.setInt32(0,p.length,true);
    v.setInt32(4,L.opcode,true);
    v.setInt32(8,i,true);
    v.setInt32(12,legacySmall ? 0 : total,true);
    v.setInt32(16,payload.length,true);
    p.set(payload,L.headerBytes);
    p.fill(0xFA, L.headerBytes+payload.length); // unused trailing 12 bytes
    return p;
  });
}
test('wire data begins at offset 20 and ignores trailing 12 bytes',()=>{
  const original=record(9100);
  const f=frames(original)[0];
  const d=decodeRecordFragment(f);
  assert.equal(f.length,8192);
  assert.equal(d.dataLength,8160);
  assert.deepEqual(d.data,original.subarray(0,8160));
  assert.equal(f.slice(-12).every(x=>x===0xFA),true);
});
test('real character record reassembles out of order with correct binary content',()=>{
  const original=record(17500);
  const [a,b,c]=frames(original);
  const dec=new RecordAssembler();
  assert.equal(dec.feed(c),null);
  assert.equal(dec.feed(a),null);
  assert.deepEqual(dec.feed(b),original);
});
test('accept exact duplicate while incomplete; reject changed duplicate',()=>{
  const [a,b]=frames(record(9000));
  const dec=new RecordAssembler();
  assert.equal(dec.feed(a),null);
  assert.equal(dec.feed(a),null);
  const altered=a.slice();altered[50]^=1;
  assert.throws(()=>dec.feed(altered),/Conflicting/);
  assert.equal(dec.feed(a),null);
  assert.deepEqual(dec.feed(b),record(9000));
});
test('reject invalid total, index, data size and bad opcode',()=>{
  const original=record(9000);
  const base=frames(original)[0];
  for (const [offset,value] of [[8,99],[12,65],[12,-1],[16,9000],[4,9]]) {
    const p=base.slice();
    new DataView(p.buffer).setInt32(offset,value,true);
    assert.throws(()=>decodeRecordFragment(p));
  }
  assert.throws(()=>decodeRecordFragment(base.subarray(0,base.length-1)),/size mismatch/);
});
test('do not combine fragments from different total counts',()=>{
  const [a,b]=frames(record(9000));
  const dec=new RecordAssembler();
  assert.equal(dec.feed(a),null);
  const altered=b.slice();
  new DataView(altered.buffer).setInt32(12,3,true);
  assert.throws(()=>dec.feed(altered),/total changed|Non-final/);
});
test('expiry clears stale partial transfer',()=>{
  const [a,b]=frames(record(9000));
  const dec=new RecordAssembler({timeoutMs:50});
  assert.equal(dec.feed(a,1000),null);
  assert.equal(dec.feed(b,1100),null);
  assert.deepEqual(dec.feed(a,1110),record(9000));
});
test('reject incorrect embedded record length or opcode',()=>{
  for (const [offset,value] of [[0,9001],[4,5]]) {
    const orig=record(9000);
    new DataView(orig.buffer).setInt32(offset,value,true);
    const [a,b]=frames(orig);
    const dec=new RecordAssembler();
    dec.feed(a);
    assert.throws(()=>dec.feed(b),/record header/);
  }
});
test('legacy source single-fragment Total=0 is accepted safely',()=>{
  const original=record(5000);
  const [frame]=frames(original,{legacySmall:true});
  assert.equal(decodeRecordFragment(frame).total,1);
  assert.deepEqual(new RecordAssembler().feed(frame),original);
});
test('memory cap protects against oversized assembled records',()=>{
  const orig=record(20000);
  const [a,b,c]=frames(orig);
  const dec=new RecordAssembler({maxRecordBytes:18000});
  dec.feed(a);dec.feed(b);
  assert.throws(()=>dec.feed(c),/memory cap/);
});

test('last fragment may contain just one byte (source modulo 8160)',()=>{
  const original=record(8161);
  const [a,b]=frames(original);
  assert.equal(decodeRecordFragment(b).dataLength,1);
  const dec=new RecordAssembler();
  assert.equal(dec.feed(a),null);
  assert.deepEqual(dec.feed(b),original);
});
