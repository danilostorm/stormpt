import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCharacterList, CHARACTER_LIST_LAYOUT as L } from '../src/character-list.mjs';

function fixture({account='test_account', count=1, name='Arqueira', level=80}={}) {
  const b=Buffer.alloc(L.FULL_PACKET_BYTES);
  b.writeInt32LE(b.length,0); b.writeInt32LE(L.OPCODE,4);
  b.write(account,8,'latin1');b.writeInt32LE(count,L.COUNT_OFFSET);
  for(let i=0;i<Math.max(0,Math.min(11,count));i++){
    const o=L.CHARACTER_OFFSET+i*L.CHARACTER_BYTES;
    b.write(i? 'Personagem'+i : name,o,'latin1');
    b.write('char\\model.smd',o+32,'latin1');
    b.write('char\\face.smd',o+96,'latin1');
    b.writeUInt32LE(3,o+160);
    b.writeInt32LE(level,o+164);
    b.writeUInt32LE(1,o+168);
    b.writeUInt32LE(100,o+172);
    b.writeInt32LE(5,o+176);
    b.writeInt32LE(2560,o+180);
    b.writeInt32LE(-1024,o+184);
  }
  return b;
}
test('exact 32-bit Win32 source layout, character list and coordinates',()=>{
  const p=fixture();
  const x=decodeCharacterList(p,{expectedAccount:'test_account'});
  assert.equal(x.count,1);
  assert.deepEqual(x.characters[0],{
    name:'Arqueira', bodyModel:'char\\model.smd',faceModel:'char\\face.smd',
    job:3,level:80,brood:1,armorCode:100,startField:5,positionX:2560,positionZ:-1024
  });
  assert.equal(L.CHARACTER_OFFSET+L.CHARACTER_BYTES*11,L.FULL_PACKET_BYTES);
});
test('zero characters is a valid authenticated-account response',()=>{
  assert.deepEqual(decodeCharacterList(fixture({count:0})).characters,[]);
});
test('source supports 11 slots even though legacy UI displays 10',()=>{
  assert.equal(decodeCharacterList(fixture({count:11})).characters.length,11);
});
test('reject account mismatch instead of displaying another user',()=>{
  assert.throws(()=>decodeCharacterList(fixture(),{expectedAccount:'other'}),/account mismatch/);
});
test('reject malicious count and truncated data',()=>{
  assert.throws(()=>decodeCharacterList(fixture({count:12})),/count/);
  assert.throws(()=>decodeCharacterList(fixture({count:-1})),/count/);
  const b=fixture({count:2}).subarray(0,L.CHARACTER_OFFSET+L.CHARACTER_BYTES);
  b.writeInt32LE(b.length,0);
  assert.throws(()=>decodeCharacterList(b),/Truncated character/);
});
test('reject invalid opcode, missing terminators, duplicate names and bad levels',()=>{
  const p=fixture();p.writeInt32LE(8,4);
  assert.throws(()=>decodeCharacterList(p),/Not a character-list/);
  const q=fixture();q.fill(65,8,29);
  assert.throws(()=>decodeCharacterList(q),/Unterminated/);
  const d=fixture({count:2,name:'Personagem1'});
  assert.throws(()=>decodeCharacterList(d),/duplicate/);
  const l=fixture({level:-5});
  assert.throws(()=>decodeCharacterList(l),/level/);
});
