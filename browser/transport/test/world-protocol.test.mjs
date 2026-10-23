import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD,encodeWorldJoin,decodeWorldJoin,encodeMoveIntent,decodeMoveIntent,decodeWorldSnapshot} from '../src/world-protocol.mjs';
test('world join binds actual server serial and cannot carry coordinates',()=>{
 const b=encodeWorldJoin({serial:123});assert.equal(b.length,20);
 assert.deepEqual(decodeWorldJoin(b,{expectedSerial:123}),{serial:123});
 assert.throws(()=>decodeWorldJoin(b,{expectedSerial:456}));
 b[16]=1;assert.throws(()=>decodeWorldJoin(b));
});
test('move request contains direction and sequence only, with canonical reserved bytes',()=>{
 const b=encodeMoveIntent({sequence:1,direction:3});
 assert.equal(b.length,24);assert.deepEqual(decodeMoveIntent(b),{sequence:1,direction:3});
 for(const q of [{sequence:0,direction:1},{sequence:1,direction:9},{sequence:1.2,direction:0}])assert.throws(()=>encodeMoveIntent(q));
 for(const offset of [8,20]){const bad=b.slice();bad[offset]=99;assert.throws(()=>decodeMoveIntent(bad));}
 assert.throws(()=>decodeMoveIntent(b.subarray(0,20)));
});
test('authoritative snapshots reject wrong identity, map, coordinates and malformed acknowledgement',()=>{
 const b=new Uint8Array(80),v=new DataView(b.buffer);
 for(const [offset,value]of [[0,80],[4,WORLD.state],[8,1],[12,123],[16,4],[20,1000],[24,3],[28,-1047*256],[32,205*256],[36,-16973*256]])v.setInt32(offset,value,true);
 b.set(new TextEncoder().encode('WebHero'),48);
 const s=decodeWorldSnapshot(b,{expectedSerial:123,expectedName:'WebHero'});assert.equal(s.sequence,4);assert.equal(s.position[0],-1047*256);
 assert.throws(()=>decodeWorldSnapshot(b,{expectedSerial:12}));assert.throws(()=>decodeWorldSnapshot(b,{expectedName:'OtherHero'}));
 for(const [offset,value]of [[24,47],[28,999999999],[40,4096],[44,3]]){const bad=b.slice();new DataView(bad.buffer).setInt32(offset,value,true);assert.throws(()=>decodeWorldSnapshot(bad));}
});
