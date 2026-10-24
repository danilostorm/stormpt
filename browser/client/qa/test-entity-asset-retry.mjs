import test from 'node:test';
import assert from 'node:assert/strict';
import {assetRetryDelayMs,shouldAttemptAssetLoad} from '../src/entity-asset-retry.mjs';
test('retries start after 1s and back off with 30s cap',()=>{
 assert.deepEqual([1,2,3,4,5,6,7,20].map(assetRetryDelayMs),[1000,2000,4000,8000,16000,30000,30000,30000]);
});
test('invalid failure counts are rejected',()=>{
 for(const n of [0,-1,1.5,NaN,Infinity])assert.throws(()=>assetRetryDelayMs(n));
});
test('initial asset load permitted once',()=>{
 const s={template:null,pending:false,nextAttemptAt:0};
 assert.equal(shouldAttemptAssetLoad(s,0),true);
 s.pending=true;assert.equal(shouldAttemptAssetLoad(s,0),false);
});
test('successful cached template never reloads',()=>{
 const s={template:{},pending:false,nextAttemptAt:0};
 assert.equal(shouldAttemptAssetLoad(s,50000),false);
});
test('failure waits until next authoritative snapshot after backoff',()=>{
 const s={template:null,pending:false,nextAttemptAt:5000};
 assert.equal(shouldAttemptAssetLoad(s,4999),false);
 assert.equal(shouldAttemptAssetLoad(s,5000),true);
});
test('invalid retry clock or slot is rejected',()=>{
 assert.throws(()=>shouldAttemptAssetLoad(null,0));
 assert.throws(()=>shouldAttemptAssetLoad({template:null,pending:false,nextAttemptAt:0},NaN));
});
