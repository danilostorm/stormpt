import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import validator from 'gltf-validator';
const base='/mnt/user/appdata/stormpt-browser/assets';
const results=[];
for(const model of ['tmbB01','tmh-B01']){
 const r=await validator.validateBytes(new Uint8Array(readFileSync(base+'/converted/'+model+'.skinned.textured.glb')),{maxIssues:100});
 results.push({model,errors:r.issues.numErrors,warnings:r.issues.numWarnings,infos:r.issues.numInfos});
 assert.equal(r.issues.numErrors,0);assert.equal(r.issues.numWarnings,0);
}
writeFileSync(base+'/validation/fighter-skin-spec.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
