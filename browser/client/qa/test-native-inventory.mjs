import test from 'node:test';import assert from 'node:assert/strict';import {itemSummary} from '../src/native-inventory.mjs';
test('item summary preserves original names and real stack quantities',()=>{assert.equal(itemSummary({name:'Poção',quantity:5}),'Poção × 5');assert.equal(itemSummary({name:'Machado',quantity:1}),'Machado');assert.equal(itemSummary({name:'<img onerror=alert(1)>',quantity:1}),'<img onerror=alert(1)>');});
test('item summary rejects invalid stacks instead of inventing inventory quantities',()=>{for(const quantity of [0,-1,NaN,1.5])assert.throws(()=>itemSummary({name:'Item',quantity}));});

import {itemRequirementRows,itemRecordedPrice} from '../src/native-inventory.mjs';
const baseRequirements={level:12,strength:30,spirit:0,talent:10,dexterity:0,health:5};
const sheet={attributes:{strength:29,spirit:10,talent:12,dexterity:11,health:5}};
test('inventory requirements show original numeric values without claiming equip eligibility',()=>{
 const rows=itemRequirementRows({requirements:baseRequirements},sheet,12);
 assert.deepEqual(rows.map(x=>[x.key,x.required,x.actual,x.meets]),[
  ['level',12,12,true],['strength',30,29,false],
  ['talent',10,12,true],['health',5,5,true]
 ]);
 assert.equal(rows.some(x=>x.key==='spirit'),false);
});
test('inventory requirement evaluation does not mutate original records',()=>{
 const item={requirements:{...baseRequirements}},before=JSON.stringify({item,sheet});
 itemRequirementRows(item,sheet,15);
 assert.equal(JSON.stringify({item,sheet}),before);
});
test('inventory requirements reject malformed or impossible values',()=>{
 for(const value of [-1,1.2,NaN,Infinity,100001]){
  assert.throws(()=>itemRequirementRows({requirements:{...baseRequirements,level:value}},sheet,12));
 }
 assert.throws(()=>itemRequirementRows({requirements:baseRequirements},sheet,-1));
 assert.throws(()=>itemRequirementRows({requirements:baseRequirements},{attributes:{...sheet.attributes,strength:Infinity}},12));
});
test('inventory recorded price is server data, not a made-up sell value',()=>{
 assert.equal(itemRecordedPrice({price:0}),'0');
 assert.equal(itemRecordedPrice({price:1234567}),'1.234.567');
 for(const price of [-1,1.2,Infinity,NaN])assert.throws(()=>itemRecordedPrice({price}));
});
test('inventory requirement output is immutable and excludes zero requirements',()=>{
 const rows=itemRequirementRows({requirements:baseRequirements},sheet,12);
 assert.equal(Object.isFrozen(rows[0]),true);
 assert.equal(rows.length,4);
});
