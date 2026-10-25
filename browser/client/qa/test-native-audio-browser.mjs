import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:3907';
const root='/work/assets/private-audio/';
const files={
 'ricarten-music':readFileSync(root+'ricarten-original-music.wav'),
 'ricarten-ambient':readFileSync(root+'ricarten-original-ambient.wav')
};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:960,height:640}});
const errors=[],assets=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/BrowserAssets.ashx?asset=*',async route=>{
 const asset=new URL(route.request().url()).searchParams.get('asset');
 assets.push(asset);
 const body=files[asset];
 await route.fulfill(body?{status:200,contentType:'audio/wav',body}:{status:404,body:'missing'});
});
try{
 await page.goto(origin+'/private-test/audio-qa.html',{waitUntil:'networkidle',timeout:25000});
 await page.waitForFunction(()=>!!window.__audioQA);
 assert.deepEqual(assets,[],'audio must not preload before a gesture');
 assert.equal(await page.locator('button').getAttribute('aria-pressed'),'false');
 await page.locator('button').click();
 await page.waitForFunction(()=>window.__audioQA.snapshot().playing===2,null,{timeout:15000});
 assert.equal(await page.locator('button').getAttribute('aria-pressed'),'true');
 assert.equal(assets.length,2);
 await page.locator('input[type=range]').fill('25');
 assert.equal(await page.evaluate(()=>window.__audioQA.snapshot().volume),.25);
 await page.locator('button').click();
 await page.waitForFunction(()=>window.__audioQA.snapshot().playing===0);
 assert.equal(await page.locator('button').getAttribute('aria-pressed'),'false');
 await page.locator('button').click();
 await page.waitForFunction(()=>window.__audioQA.snapshot().playing===2);
 await page.evaluate(()=>window.__audioQA.dispose());
 assert.equal(await page.evaluate(()=>window.__audioQA.snapshot().disposed),true);
 assert.equal(await page.evaluate(()=>window.__audioQA.snapshot().playing),0);
 assert.equal(await page.locator('.world-audio-controls').count(),0);
 assert.deepEqual(errors,[]);
 const result={ok:true,realOriginalWavPlayed:true,tracks:2,noAutoplay:true,volume:true,mute:true,restart:true,dispose:true,jsErrors:errors};
 writeFileSync('/work/client/qa/audio-qa-0400.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await browser.close()}
