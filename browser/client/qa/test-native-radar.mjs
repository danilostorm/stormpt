import test from 'node:test';import assert from 'node:assert/strict';import {radarPoint} from '../src/native-radar.mjs';
test('radar uses actual PT fixed point and world north',()=>{assert.deepEqual(radarPoint([0,0,0],[0,0,0]),{x:64,y:64,distance:0});assert.deepEqual(radarPoint([0,0,0],[256000,0,0]),{x:122,y:64,distance:1000});assert.equal(radarPoint([0,0,0],[0,0,-256000]).y,6);});
test('radar excludes entities outside its original-world radius',()=>{assert.equal(radarPoint([0,0,0],[256001,0,0]),null);assert.equal(radarPoint([0,0,0],[256000,0,256000]),null);});
test('radar rejects nonfinite or malformed coordinate inputs',()=>{for(const p of [[NaN,0,0],[1,2],null])assert.throws(()=>radarPoint([0,0,0],p));assert.throws(()=>radarPoint([0,0,0],[0,0,0],{radius:0}));});
