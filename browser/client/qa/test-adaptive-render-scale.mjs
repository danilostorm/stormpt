import test from 'node:test';
import assert from 'node:assert/strict';
import {AdaptiveRenderScale} from '../src/adaptive-render-scale.mjs';
function setup(options={}){
 const applied=[];
 const renderer={ratio:1,getPixelRatio(){return this.ratio},setPixelRatio(r){this.ratio=r;applied.push(r)}};
 const adaptive=new AdaptiveRenderScale({renderer,windowMs:1000,cooldownMs:3000,...options});
 let t=0;
 const advance=(count,dt)=>{
  for(let i=0;i<count;i++){t+=dt;adaptive.recordFrame(t)}
  return t;
 };
 return {adaptive,renderer,applied,advance};
}
test('default is disabled and preserves 1:1 native resolution',()=>{
 const {adaptive,renderer,advance}=setup();
 advance(500,30);
 assert.equal(adaptive.snapshot().scale,1);
 assert.equal(renderer.ratio,1);
});
test('only downscales following two sustained slow sample windows',()=>{
 const {adaptive,renderer,advance}=setup({enabled:true});
 advance(31,34);assert.equal(renderer.ratio,1);
 advance(31,34);
 assert.equal(adaptive.snapshot().scale,0.9);
 assert.equal(renderer.ratio,0.9);
 assert.equal(adaptive.snapshot().resolutionMode,'adaptive');
});
test('quality hysteresis avoids oscillation and clamps to minimum',()=>{
 const {adaptive,advance}=setup({enabled:true});
 advance(1100,38);
 assert.ok(adaptive.snapshot().scale>=0.7);
 assert.ok(adaptive.snapshot().scale<=0.9);
});
test('fast windows can restore native resolution after cooldown',()=>{
 const {adaptive,advance}=setup({enabled:true});
 advance(64,34);
 assert.equal(adaptive.snapshot().scale,0.9);
 advance(500,16);
 assert.equal(adaptive.snapshot().scale,1);
});
test('background tab suspensions never trigger quality changes',()=>{
 const {adaptive,advance}=setup({enabled:true});
 advance(15,34);
 adaptive.recordFrame(60000,{visible:false});
 assert.equal(adaptive.snapshot().scale,1);
});
test('opt-out restores pixel ratio and clears sample history',()=>{
 const {adaptive,renderer,advance}=setup({enabled:true});
 advance(64,34);assert.equal(adaptive.snapshot().scale,0.9);
 adaptive.setEnabled(false);
 assert.equal(renderer.ratio,1);
 assert.equal(adaptive.snapshot().enabled,false);
});
test('invalid clocks, settings and renderer are rejected',()=>{
 assert.throws(()=>new AdaptiveRenderScale(),/Renderer/);
 const {adaptive}=setup({enabled:true});
 assert.throws(()=>adaptive.recordFrame(NaN),/clock/);
 assert.throws(()=>adaptive.setEnabled('yes'),/boolean/);
});
