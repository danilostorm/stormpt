import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const qa=JSON.parse(readFileSync('/work/secrets/web-qa-account.json'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],assetResponses=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().includes('/BrowserAssets.ashx'))assetResponses.push({asset:new URL(r.url()).searchParams.get('asset'),status:r.status()});});
const snapshot=()=>page.evaluate(()=>window.__stormptNativeQA.snapshot());
async function enter(){
 await page.click('#enterGame');
 await page.waitForFunction(()=>window.__stormptNativeQA.snapshot().phase==='character-list',{timeout:30000});
 await page.getByRole('button',{name:'StormWebQA1 · Nível 1',exact:true}).click();
 await page.waitForFunction(()=>['in-world','error','disconnected'].includes(window.__stormptNativeQA.snapshot().phase),{timeout:120000});
 const s=await snapshot();assert.equal(s.phase,'in-world',JSON.stringify(s));
 return s;
}
try{
 const response=await page.goto(process.env.STORMPT_PUBLIC_PLAY_URL||'https://stormpt.hoststorm.com.br/jogar-beta/index.html',{waitUntil:'networkidle',timeout:45000});assert.equal(response.status(),200);
 const anonymousStatus=await page.evaluate(async()=>{const r=await fetch('/BrowserAssets.ashx?asset=ricarten',{credentials:'omit'});return r.status;});assert.equal(anonymousStatus,401);
 await page.fill('#loginUser',qa.account);await page.fill('#loginPassword',qa.password);await page.click('#loginSubmit');
 await page.waitForFunction(()=>!document.getElementById('loggedIn').hidden,{timeout:30000});
 const invalidAssetStatus=await page.evaluate(async()=>{const r=await fetch('/BrowserAssets.ashx?asset=../secrets/gateway.hmac');return r.status;});assert.equal(invalidAssetStatus,404);
 const initial=await enter();assert.equal(initial.worldLive.field,3);assert.equal(initial.render.characterMeshes,4);
 const canvas=page.locator('#stormptWorld canvas');await canvas.focus();
 await page.keyboard.down('d');await page.waitForTimeout(900);await page.keyboard.up('d');
 await page.waitForTimeout(1800);
 const moved=await snapshot();
 const a=initial.worldLive.position,b=moved.worldLive.position;
 assert.ok(Math.hypot(b[0]-a[0],b[2]-a[2])>0,'Real keyboard movement must receive changed server coordinates');
 assert.ok(moved.movementRequests>0);assert.ok(moved.worldLive.sequence>initial.worldLive.sequence);
 await page.screenshot({path:'/work/client/qa/real-world-movement-chromium.png'});
 // Heartbeats must keep the native profile alive through the Windows memory-check interval.
 await page.waitForTimeout(65000);
 const healthy=await snapshot();assert.equal(healthy.phase,'in-world');assert.ok(healthy.worldLive.sequence>moved.worldLive.sequence);
 await page.getByRole('button',{name:'Sair do mundo',exact:true}).click();await page.waitForTimeout(1800);
 const reconnected=await enter();
 assert.equal(reconnected.world.position.x,b[0]);assert.equal(reconnected.world.position.z,b[2]);
 assert.deepEqual(errors,[]);
 const result={at:new Date().toISOString(),realBrowser:'Chromium WebGL2 SwiftShader',url:page.url(),mockedRoutes:false,
  anonymousAssetsDenied:true,pathTraversalAssetsDenied:true,realKeyboardMovement:true,persistedAcrossReconnect:true,
  heartbeatOver65Seconds:true,initialPosition:a,movedPosition:b,reconnectedPosition:reconnected.worldLive.position,
  render:reconnected.render,assetResponses,errors,pilotOnly:true,fullGameComplete:false};
 writeFileSync('/work/builds/real-world-browser-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 await page.evaluate(()=>window.__stormptNativeQA.close());
}catch(e){
 console.error(JSON.stringify({error:e.message,state:await snapshot().catch(()=>null),errors,assetResponses}));process.exitCode=1;
}finally{await browser.close();}
