import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3904/character-capture.html',{waitUntil:'domcontentloaded',timeout:15000});
 await page.waitForFunction(()=>window.__stormptRecordReplay!==undefined,{timeout:90000});
 const result=await page.evaluate(()=>window.__stormptRecordReplay);
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.source,'actual-gameserver-record-replay');
 assert.equal(result.stageTriangles,44226);assert.equal(result.stageMeshes,267);
 assert.equal(result.visibleCharacterMeshes,4);assert.equal(result.texturedCharacterMeshes,4);
 assert.equal(result.originalBoneCount,64);assert.equal(result.field,3);assert.equal(result.liveSession,false);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'/work/client/qa/ricarten-real-record-chromium.png'});
 writeFileSync('/work/builds/ricarten-real-record-render.json',JSON.stringify({result,errors,renderer:'Chromium WebGL2 SwiftShader, CPU virtual; no RX550 benchmark'},null,2));
 console.log(JSON.stringify({result,errors}));
}finally{await browser.close();}
