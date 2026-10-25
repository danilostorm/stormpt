import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeCharacterCreation,decodeCharacterCreation} from '../src/character-creation.mjs';
test('creation uses original 76-byte ABI and no client-selected stats',()=>{
 const p=encodeCharacterCreation({account:'webqa1023b6388c',name:'StormWebQA'});
 assert.equal(p.length,76);
 assert.deepEqual(decodeCharacterCreation(p),{account:'webqa1023b6388c',name:'StormWebQA',job:1});
 const v=new DataView(p.buffer);assert.equal(v.getUint32(8,true),1);assert.equal(v.getUint32(16,true),1);
});
test('creation refuses traversal, invalid classes and malformed envelopes',()=>{
 for(const name of ['../owner','CON\\path','ab','x'.repeat(17),'1Tester','A B','Abé'])assert.throws(()=>encodeCharacterCreation({account:'tester',name}));
 assert.throws(()=>encodeCharacterCreation({account:'tester',name:'Tester',job:8}));
 const p=encodeCharacterCreation({account:'tester',name:'Tester'});p[40]=65;assert.throws(()=>decodeCharacterCreation(p));
});
test('creation result bound to trusted account and requested name',()=>{
 const p=encodeCharacterCreation({account:'tester',name:'Tester'});new DataView(p.buffer).setInt32(12,1,true);
 assert.equal(decodeCharacterCreation(p,{response:true,expectedAccount:'tester',expectedName:'Tester'}).created,true);
 assert.throws(()=>decodeCharacterCreation(p));
 assert.throws(()=>decodeCharacterCreation(p,{response:true,expectedAccount:'owner'}));
 assert.throws(()=>decodeCharacterCreation(p,{response:true,expectedName:'Owner'}));
});
