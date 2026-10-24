import test from 'node:test';
import assert from 'node:assert/strict';
import {cycleMonsterTarget} from '../src/native-target.mjs';
const e=(serial,kind=2,life=50,x=serial*256)=>({serial,kind,life,maxLife:100,name:'Monstro'+serial,level:1,position:[x,0,0]});
const s=(entities)=>({observer:99,sequence:1,field:3,entities});
test('T selects closest authoritative living monster',()=>{
 assert.equal(cycleMonsterTarget(s([e(10),e(3),e(4,1),e(1,2,0)]),null,[0,0,0]),3);
});
test('T cycles stable order, Shift+T reverses and wraps',()=>{
 const snapshot=s([e(5),e(2),e(7)]);
 assert.equal(cycleMonsterTarget(snapshot,2,[0,0,0]),5);
 assert.equal(cycleMonsterTarget(snapshot,7,[0,0,0]),2);
 assert.equal(cycleMonsterTarget(snapshot,2,[0,0,0],{reverse:true}),7);
 assert.equal(cycleMonsterTarget(snapshot,null,[0,0,0],{reverse:true}),7);
});
test('no NPCs, players, dead, out of range, or invalid monster data',()=>{
 const snapshot=s([e(1,1),e(2,3),e(3,2,0),e(4,2,50,3000000),e(5,2,50,NaN)]);
 assert.equal(cycleMonsterTarget(snapshot,null,[0,0,0]),null);
 assert.equal(cycleMonsterTarget(null,null,[0,0,0]),null);
 assert.equal(cycleMonsterTarget(s([e(3)]),null,[NaN,0,0]),null);
});
test('equal-distance tie breaks by serial; no packet mutation',()=>{
 const snapshot=s([e(4,2,50,256),e(3,2,50,-256)]);
 const original=JSON.stringify(snapshot);
 assert.equal(cycleMonsterTarget(snapshot,null,[0,0,0]),3);
 assert.equal(JSON.stringify(snapshot),original);
});
