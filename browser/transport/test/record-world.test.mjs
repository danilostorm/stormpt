import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeRecordWorld} from '../src/record-world.mjs';
function record(){
 const b=Buffer.alloc(1796);b.writeInt32LE(1796);b.writeInt32LE(4,4);b.write('RC 1.50',8);
 b.write('WebHero',16);b.write('char\\tmABCD\\b001.ini',48);b.write('char\\tmABCD\\tmh-b01.inf',112);
 b.writeUInt32LE(1234,176);b.writeInt32LE(1,196);b.writeInt32LE(1,200);
 b.writeUInt32LE(150,480);b.writeInt32LE(3,484);b.writeInt32LE(-1047*256,492);b.writeInt32LE(-16973*256,496);
 b.write('Webqatest',748);return b;
}
test('reads original saved field and fixed point without fabricating height or live tick',()=>{
 const s=decodeRecordWorld(record(),{expectedAccount:'Webqatest',expectedName:'WebHero'});
 assert.equal(s.field,3);assert.equal(s.position.x,-1047*256);assert.equal(s.position.z,-16973*256);
 assert.equal(s.position.y,undefined);assert.equal(s.serverTick,undefined);assert.equal(s.itemCount,0);
});
test('record spawn refuses wrong ownership, wrong version and corrupt item bounds',()=>{
 assert.throws(()=>decodeRecordWorld(record(),{expectedAccount:'OtherUser'}),/account mismatch/);
 assert.throws(()=>decodeRecordWorld(record(),{expectedAccount:'Webqatest',expectedName:'OtherChar'}),/character mismatch/);
 for(const [offset,value] of [[480,149],[484,256],[1780,65],[1784,201],[1788,1],[1792,1]]){
  const b=record();b.writeInt32LE(value,offset);
  assert.throws(()=>decodeRecordWorld(b,{expectedAccount:'Webqatest'}));
 }
});
