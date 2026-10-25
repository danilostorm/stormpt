import {readFileSync,writeFileSync} from 'node:fs';
import validator from 'gltf-validator';
const root='/mnt/user/appdata/stormpt-browser/assets/converted/';
const results=[];
for(const name of ['Ricarten.textured.glb','tmbB01.bind.textured.glb','tmh-B01.bind.textured.glb']){
 const report=await validator.validateBytes(new Uint8Array(readFileSync(root+name)),{maxIssues:50,uri:name});
 const {numErrors,numWarnings,numInfos}=report.issues;
 results.push({name,numErrors,numWarnings,numInfos});
 writeFileSync(root+name+'.validation.json',JSON.stringify(report,null,2));
 if(numErrors||numWarnings)process.exitCode=1;
}
writeFileSync('/mnt/user/appdata/stormpt-browser/assets/validation/native-character-assets-result.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
