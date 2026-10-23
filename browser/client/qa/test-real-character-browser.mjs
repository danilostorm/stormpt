import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const qa=JSON.parse(readFileSync('/work/secrets/web-qa-account.json'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 const response=await page.goto('https://stormpt.hoststorm.com.br/jogar-beta/index.html',{waitUntil:'networkidle',timeout:45000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.__stormptAccountQA?.uiReady,{timeout:15000});
 await page.fill('#loginUser',qa.account);await page.fill('#loginPassword',qa.password);await page.click('#loginSubmit');
 await page.waitForFunction(()=>!document.getElementById('loggedIn').hidden,{timeout:20000});
 await page.click('#enterGame');
 await page.waitForFunction(()=>window.__stormptNativeQA?.snapshot().phase==='character-list',{timeout:25000});
 const before=await page.evaluate(()=>window.__stormptNativeQA.snapshot());
 let createdThroughUI=false;
 if(!before.characters.some(c=>c.name==='StormWebQA2')){
  await page.fill('#newCharacterName','StormWebQA2');
  await page.locator('#createCharacterForm button').click();
  await page.waitForFunction(()=>window.__stormptNativeQA.snapshot().phase==='character-created',{timeout:20000});
  createdThroughUI=true;
  await page.waitForTimeout(2500);
  await page.click('#enterGame');
  await page.waitForFunction(()=>window.__stormptNativeQA.snapshot().phase==='character-list',{timeout:25000});
 }
 await page.getByRole('button',{name:'StormWebQA1 · Nível 1',exact:true}).click();
 await page.waitForFunction(()=>window.__stormptNativeQA.snapshot().phase==='character-loaded',{timeout:25000});
 const state=await page.evaluate(()=>window.__stormptNativeQA.snapshot());
 assert.equal(state.world.identity.name,'StormWebQA1');assert.equal(state.world.field,3);
 assert.equal(state.world.masterAccount,qa.account);assert.equal(state.world.itemCount,0);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'/work/client/qa/real-character-chromium.png',fullPage:true});
 const result={at:new Date().toISOString(),httpStatus:response.status(),realBrowser:'Chromium',mockedRoutes:false,
  createdThroughUI,state,errors,realNativeCharacterLoaded:true,playable:false};
 writeFileSync('/work/builds/real-character-browser-result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({result:'REAL_CHROMIUM_CHARACTER_LOADED',createdThroughUI,name:state.world.identity.name,
  characterCount:state.characters.length,field:state.world.field,position:state.world.position,errors}));
 await page.evaluate(()=>window.__stormptNativeQA.close());
}catch(e){
 const state=await page.evaluate(()=>({status:document.getElementById('accountStatus')?.textContent,native:window.__stormptNativeQA?.snapshot()})).catch(()=>({}));
 console.error(JSON.stringify({error:e.message,state,errors}));process.exitCode=1;
}finally{await browser.close();}
