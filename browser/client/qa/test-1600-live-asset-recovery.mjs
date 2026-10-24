import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const qa=JSON.parse(readFileSync('/work/secrets/web-qa-account.json'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage','--disable-http2']});
const page=await browser.newPage({viewport:{width:720,height:480}});
const jsErrors=[];let attempts=0,failedOnce=false;
page.on('pageerror',e=>jsErrors.push(e.message));
const resultPath='/work/builds/staging-1600-entity-retry-deploy/live-asset-recovery-result.json';
try{
 await page.route(/\/BrowserAssets\.ashx\?asset=npc-enzo(?:&|$)/,async route=>{
  attempts++;
  if(!failedOnce){failedOnce=true;await route.abort('failed');}
  else await route.continue();
 });
 let response;let navigationFailures=[];for(let i=0;i<3;i++){try{response=await page.goto('https://stormpt.hoststorm.com.br/jogar/',{waitUntil:'load',timeout:60000});break;}catch(e){navigationFailures.push(e.message.split('\n')[0]);await page.waitForTimeout(1000*(i+1));}}
 assert.ok(response,'public QA page must load: '+navigationFailures.join(' | '));assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('openingLoading')?.hidden===true,undefined,{timeout:25000});
 await page.waitForFunction(()=>window.__stormptAccountQA?.uiReady,undefined,{timeout:60000});
 await page.fill('#loginUser',qa.account);
 await page.fill('#loginPassword',qa.password);
 await page.click('#loginSubmit');
 await page.waitForFunction(()=>!document.getElementById('loggedIn').hidden,undefined,{timeout:35000});
 await page.waitForFunction(()=>window.__stormptNativeQA.snapshot().phase==='character-list',undefined,{timeout:35000});
 await page.getByRole('button',{name:'StormWebQA1 · Nível 1',exact:true}).click();
 await page.waitForFunction(()=>window.__stormptNativeQA.snapshot().phase==='in-world',undefined,{timeout:120000});
 await page.waitForFunction(()=>window.__stormptNativeQA.snapshot().entityModels?.models.some(m=>m.asset==='npc-enzo')&&window.__stormptNativeQA.snapshot().entityModels?.rendered>=14,undefined,{timeout:75000});
 const snapshot=await page.evaluate(()=>window.__stormptNativeQA.snapshot());
 assert.equal(failedOnce,true,'first Enzo request must be aborted');
 assert.ok(attempts>=2,'model must retry after network failure');
 assert.equal(snapshot.entityModels.errors.length,0,'transient asset error must be cleared');
 assert.equal(snapshot.entityModels.rendered,14,'original NPCs should recover');
 assert.deepEqual(jsErrors,[]);
 await page.locator('.world-exit').click();
 const result={ok:true,realAccount:true,realGameServer:true,networkFailureInjected:true,model:'npc-enzo',attempts,recovered:true,npcModels:snapshot.entityModels.rendered,jsErrors,at:new Date().toISOString()};
 writeFileSync(resultPath,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}catch(e){
 const result={ok:false,error:e.message,attempts,failedOnce,jsErrors,phase:await page.evaluate(()=>window.__stormptNativeQA?.snapshot()?.phase).catch(()=>null)};
 writeFileSync(resultPath,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));process.exitCode=1;
}finally{await browser.close();}
