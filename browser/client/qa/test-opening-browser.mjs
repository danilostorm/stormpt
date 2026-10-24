import {chromium} from 'playwright';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:640,height:400},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 const response=await page.goto('https://stormpt.hoststorm.com.br/jogar/',{waitUntil:'domcontentloaded',timeout:60000});assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.__stormptOpeningQA?.ready,undefined,{timeout:90000});
 await page.waitForTimeout(1500);const a=await page.evaluate(()=>({...window.__stormptOpeningQA}));await page.waitForTimeout(1600);const b=await page.evaluate(()=>({...window.__stormptOpeningQA}));
 assert.equal(await page.locator('#openingLoading').isHidden(),true);assert.equal(await page.locator('#openingProgress').getAttribute('value'),'100');assert.equal(b.animated,true);assert.equal(await page.locator('#openingToggle').textContent(),'Pausar fundo');assert.ok(b.frames>a.frames);assert.notDeepEqual(b.position,a.position);assert.equal(b.error,null);
 await page.screenshot({path:'/work/client/qa/opening-public.png'});
 await page.click('#openingToggle');await page.waitForTimeout(300);const stopped=await page.evaluate(()=>window.__stormptOpeningQA.position);await page.waitForTimeout(1200);assert.deepEqual(await page.evaluate(()=>window.__stormptOpeningQA.position),stopped);
 await page.click('#openSignup');await page.locator('#signupModal[aria-hidden="false"]').waitFor();await page.click('#closeSignup');
 assert.equal(await page.locator('#loginUser').isVisible(),true);assert.deepEqual(errors,[]);
 const result={at:new Date().toISOString(),url:page.url(),anonymous:true,originalStage:true,nativeCameraPath:true,cameraMoves:true,pauseWorks:true,formsAccessible:true,triangles:b.triangles,errors};
 writeFileSync('/work/builds/opening-browser-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){console.error(JSON.stringify({error:e.message,probe:await page.evaluate(()=>window.__stormptOpeningQA).catch(()=>null),errors}));process.exitCode=1;}finally{await browser.close();}
