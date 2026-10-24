import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestNpc} from '../src/native-radar.mjs';
const npc=(serial,x=0,z=0,kind=1)=>({serial,kind,position:[x,0,z]});
const s=(...entities)=>({observer:22,sequence:1,field:3,entities});
test('E finds the closest real NPC and ignores monsters and players',()=>{
 assert.equal(nearestNpc(s(npc(5,5*256),npc(8,2*256),npc(9,1*256,0,2),npc(10,0,0,3)),[0,0,0]),8);
});
test('E only uses authorized snapshot and never creates synthetic NPC',()=>{
 assert.equal(nearestNpc(s(),[0,0,0]),null);
 assert.equal(nearestNpc(null,[0,0,0]),null);
 assert.equal(nearestNpc({entities:'bad'},[0,0,0]),null);
});
test('E does not select NPCs outside configured radius',()=>{
 assert.equal(nearestNpc(s(npc(5,51*256)),[0,0,0]),null);
 assert.equal(nearestNpc(s(npc(5,49*256)),[0,0,0]),5);
});
test('E handles malformed positions, NaN and invalid serial safely',()=>{
 assert.equal(nearestNpc(s(npc(0),npc(5,NaN),npc(6,0,0,2)),[0,0,0]),null);
 assert.equal(nearestNpc(s(npc(1)),[Infinity,0,0]),null);
 assert.equal(nearestNpc(s(npc(1)),[0,0,0],{maxDistance:-1}),null);
});
test('E breaks equal distance ties by stable serial and does not mutate server data',()=>{
 const snap=s(npc(10,-256),npc(7,256));
 const original=JSON.stringify(snap);
 assert.equal(nearestNpc(snap,[0,0,0]),7);
 assert.equal(JSON.stringify(snap),original);
});
test('E rejects hostile oversized range instead of bypassing proximity',()=>{
 assert.equal(nearestNpc(s(npc(10,900*256)),[0,0,0],{maxDistance:1001}),null);
});
