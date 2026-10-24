import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterTarget} from '../src/native-target.mjs';
const monster=(extra={})=>({serial:812,kind:2,name:'Monstro QA',level:12,life:65,maxLife:100,position:[25600,0,0],...extra});
const snap=(entities=[monster()])=>({observer:42,sequence:14,tick:27,field:3,entities});
test('only native monster snapshots yield a target; health and distance are server values',()=>{
 const t=monsterTarget(snap(),812,[0,0,0]);
 assert.equal(t.serial,812);assert.equal(t.distance,100);
 assert.equal(t.healthPercent,65);assert.equal(t.life,65);assert.equal(t.maxLife,100);
 assert.equal(t.source,'gameserver-entity-snapshot');
 assert.ok(Object.isFrozen(t));
});
test('players and NPCs are never targetable through monster selector',()=>{
 for(const kind of [1,3])assert.equal(monsterTarget(snap([monster({kind})]),812,[0,0,0]),null);
});
test('nonexistent, stale and invalid monsters do not display fabricated data',()=>{
 assert.equal(monsterTarget(snap([]),812,[0,0,0]),null);
 assert.equal(monsterTarget(snap(),811,[0,0,0]),null);
 for(const bad of [{life:-1},{life:101},{maxLife:-1},{name:''},{level:-1},{position:[NaN,0,0]}])
  assert.equal(monsterTarget(snap([monster(bad)]),812,[0,0,0]),null);
 assert.equal(monsterTarget(snap(),812,[NaN,0,0]),null);
});
test('zero maximum health is explicitly unknown rather than 0%',()=>{
 const t=monsterTarget(snap([monster({life:0,maxLife:0})]),812,[0,0,0]);
 assert.equal(t.healthPercent,null);
});
test('health ratio clamps to server bounds; distances remain fixed-point',()=>{
 const t=monsterTarget(snap([monster({life:0,position:[0,0,-512]})]),812,[0,0,0]);
 assert.equal(t.healthPercent,0);assert.equal(t.distance,2);
});
