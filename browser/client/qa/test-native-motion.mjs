import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeNativeMotion,NativeMotionPlayer} from '../src/native-motion.mjs';
function fixture(){
 const b=new Uint8Array(80+2*2*64*16*4),v=new DataView(b.buffer);
 for(const [o,x]of [[0,0x4e415450],[4,1],[8,64],[12,2]])v.setUint32(o,x,true);
 for(let i=0;i<2;i++){const p=16+i*32;b.set(new TextEncoder().encode(i?'walk':'idle'),p);v.setUint32(p+16,2,true);v.setFloat32(p+20,20,true);v.setInt32(p+24,160,true);v.setInt32(p+28,320,true);}
 for(let o=80;o<b.length;o+=4)v.setFloat32(o,(o-80)%64===0?1:0,true);
 return b;
}
test('native motion decoder bounds private skeleton, clip sizes and matrices',()=>{
 const b=fixture(),m=decodeNativeMotion(b);assert.equal(m.bones,64);assert.equal(m.clips.size,2);
 for(const [offset,value]of [[4,2],[8,65],[12,99],[32,0],[48,99]]){const bad=b.slice();new DataView(bad.buffer).setUint32(offset,value,true);assert.throws(()=>decodeNativeMotion(bad));}
 assert.throws(()=>decodeNativeMotion(b.subarray(0,b.length-4)));
 const bad=b.slice();new DataView(bad.buffer).setFloat32(80,NaN,true);assert.throws(()=>decodeNativeMotion(bad));
 const extra=new Uint8Array(b.length+4);extra.set(b);assert.throws(()=>decodeNativeMotion(extra));
});
function model(){
 const bones=Array.from({length:64},(_,i)=>({isBone:true,name:'PTBone_'+i,matrix:{elements:Array(16).fill(0)}}));
 return {bones,traverse(fn){bones.forEach(fn);fn({isSkinnedMesh:true,visible:true});}};
}
test('motion player changes clip only on confirmed movement and updates original bones',()=>{
 const m=model(),p=new NativeMotionPlayer(decodeNativeMotion(fixture()),[m]);
 p.update(1000);assert.equal(p.stats().clip,'idle');assert.equal(m.bones[0].matrixAutoUpdate,false);
 p.setMoving(true,1100);p.update(1110);assert.equal(p.stats().clip,'walk');assert.equal(m.bones[0].matrixWorldNeedsUpdate,true);
 p.setMoving(false,1200);p.update(1210);assert.equal(p.stats().clip,'idle');assert.equal(p.stats().updates,3);
 assert.throws(()=>new NativeMotionPlayer(decodeNativeMotion(fixture()),[{traverse(){}}]));
});
