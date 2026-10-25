import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterSessionObserver } from '../src/character-session.mjs';
import { decodeRecordIdentity } from '../src/record-identity.mjs';
import { RECORD_FRAGMENT_LAYOUT as L } from '../src/record-fragments.mjs';
import { CHARACTER_LIST_LAYOUT as C } from '../src/character-list.mjs';
function characters(account='teste') {
  const b=Buffer.alloc(C.FULL_PACKET_BYTES);
  b.writeInt32LE(b.length,0);b.writeInt32LE(9,4);
  b.write(account,8,'latin1');b.writeInt32LE(1,C.COUNT_OFFSET);
  b.write('Heroi',C.CHARACTER_OFFSET,'latin1');
  b.write('hero.smd',C.CHARACTER_OFFSET+32,'latin1');
  b.write('face.smd',C.CHARACTER_OFFSET+96,'latin1');
  b.writeInt32LE(85,C.CHARACTER_OFFSET+164);
  return b;
}
function record(name='Heroi',length=9000) {
  const b=Buffer.alloc(length);
  b.writeInt32LE(length,0);b.writeInt32LE(4,4);
  b.write(name,16,'latin1');
  b.write('hero.smd',48,'latin1');
  b.write('face.smd',112,'latin1');
  b.writeUInt32LE(123456,176);
  b.writeUInt32LE(3,196);
  b.writeInt32LE(85,200);
  return b;
}
function fragments(data) {
  const count=Math.ceil(data.length/L.maxDataBytes);
  return Array.from({length:count},(_,i)=>{
    const bytes=data.subarray(i*L.maxDataBytes,(i+1)*L.maxDataBytes);
    const b=Buffer.alloc(bytes.length+32);
    b.writeInt32LE(b.length,0);b.writeInt32LE(4,4);
    b.writeInt32LE(i,8);b.writeInt32LE(count,12);b.writeInt32LE(bytes.length,16);
    bytes.copy(b,20);
    return b;
  });
}
test('decode true Win32 smCHAR_INFO field offsets in record body',()=>{
  const i=decodeRecordIdentity(record());
  assert.deepEqual(i,{name:'Heroi',bodyModel:'hero.smd',faceModel:'face.smd',serial:123456,job:3,level:85});
});
test('read-only session: list -> explicit selection -> fragments -> verified identity',()=>{
  const events=[];
  const s=new CharacterSessionObserver({expectedAccount:'teste',onEvent:e=>events.push(e)});
  assert.equal(s.accept(characters()),'character-list');
  assert.equal(s.phase,'character-list-ready');
  s.selectCharacter('Heroi');
  const [a,b]=fragments(record());
  assert.equal(s.accept(b),'partial-record');
  assert.equal(s.accept(a),'character-record');
  assert.equal(s.phase,'character-record-ready');
  assert.equal(events.at(-1).identity.name,'Heroi');
  assert.equal(events.at(-1).record.length,9000);
});
test('reject list belonging to another account and non-owned character',()=>{
  const s=new CharacterSessionObserver({expectedAccount:'teste'});
  assert.throws(()=>s.accept(characters('outro')),/account mismatch/);
  s.accept(characters());
  assert.throws(()=>s.selectCharacter('OutroHeroi'),/not in authenticated/);
});
test('ignore record until selected and do not claim logged-in state',()=>{
  const s=new CharacterSessionObserver({expectedAccount:'teste'});
  assert.equal(s.accept(fragments(record())[0]),'ignored-record');
  assert.equal(s.phase,'waiting-for-character-list');
  s.accept(characters());
  assert.equal(s.phase,'character-list-ready');
  assert.equal(s.accept(fragments(record())[0]),'ignored-record');
});
test('reject character record swapped after selection',()=>{
  const s=new CharacterSessionObserver({expectedAccount:'teste'});
  s.accept(characters());s.selectCharacter('Heroi');
  const [a,b]=fragments(record('Intruso'));
  s.accept(a);
  assert.throws(()=>s.accept(b),/does not match selected/);
  assert.equal(s.phase,'character-list-ready');
});
