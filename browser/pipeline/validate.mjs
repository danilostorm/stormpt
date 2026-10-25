import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const validator=require('../assets/validation/node_modules/gltf-validator');
const result=await validator.validateBytes(new Uint8Array(fs.readFileSync(process.argv[2])),{maxIssues:100});
fs.writeFileSync(process.argv[3],JSON.stringify(result.issues,null,2));
if(result.issues.numErrors)process.exitCode=1;
