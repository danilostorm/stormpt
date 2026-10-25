import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const qa=JSON.parse(readFileSync('/work/secrets/web-qa-account.json'));
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--use-gl=angle','--use-angle=swiftshader',
 '--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({viewport:{width:640,height:400}});
const errors=[],audioRequests=[],phases=[],wsCloses=[];
page.on('websocket',ws=>ws.on('close',event=>wsCloses.push(event)));
const ticker=setInterval(async()=>{try{const x=await page.evaluate(()=>({phase:window.__stormptNativeQA?.snapshot()?.phase||'unknown',status:document.getElementById('accountStatus')?.textContent?.slice(0,90)}));if(phases.at(-1)?.phase!==x.phase)phases.push(x)}catch{}},1700);
page.on('pageerror',e=>errors.push(e.message));
page.on('response',resp=>{
 const url=new URL(resp.url());
 const asset=url.searchParams.get('asset');
 if(asset==='ricarten-music'||asset==='ricarten-ambient')
  audioRequests.push({asset,status:resp.status(),mime:resp.headers()['content-type']});
});
const result={ok:false,authenticated:false,worldReady:false,
 noAutoplay:false,protectedAudioFetched:false,playing:false,muted:false,
 assetResponses:[],errors:[]};
try{
 const response=await page.goto('https://stormpt.hoststorm.com.br/jogar/',{waitUntil:'load',timeout:60000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('openingLoading')?.hidden===true,null,{timeout:30000});
 await page.waitForFunction(()=>window.__stormptAccountQA?.uiReady,null,{timeout:45000});
 await page.fill('#loginUser',qa.account);
 await page.fill('#loginPassword',qa.password);
 await page.click('#loginSubmit');
 await page.waitForFunction(()=>window.__stormptNativeQA?.snapshot().phase==='character-list',null,{timeout:40000});
 result.authenticated=true;
 await page.getByRole('button',{name:'StormWebQA1 · Nível 1',exact:true}).click();
 await page.waitForFunction(()=>window.__stormptNativeQA?.snapshot().phase==='in-world',null,{timeout:45000});
 result.worldReady=true;
 result.noAutoplay=audioRequests.length===0&&
   (await page.evaluate(()=>window.__stormptNativeQA.snapshot().audio.playing))===0;
 await page.locator('.world-audio-controls button').click();
 await page.waitForFunction(()=>window.__stormptNativeQA.snapshot().audio?.playing===2,null,{timeout:20000});
 result.playing=true;
 for(let i=0;i<30&&audioRequests.length<2;i++)await page.waitForTimeout(100);
 result.assetResponses=audioRequests;
 result.protectedAudioFetched=audioRequests.length===2&&audioRequests.every(x=>x.status===200&&x.mime?.startsWith('audio/wav'));
 await page.locator('.world-audio-controls input[type=range]').fill('20');
 assert.equal(await page.evaluate(()=>window.__stormptNativeQA.snapshot().audio.volume),.2);
 await page.locator('.world-audio-controls button').click();
 await page.waitForFunction(()=>window.__stormptNativeQA.snapshot().audio?.playing===0);
 result.muted=true;
 result.errors=errors;result.phases=phases;result.wsCloses=wsCloses;
 result.ok=result.authenticated&&result.worldReady&&result.noAutoplay&&result.protectedAudioFetched&&result.playing&&result.muted&&errors.length===0;
 await page.screenshot({path:'/work/builds/staging-0400/qa-audio-public-0400.png'});
 console.log(JSON.stringify(result));
 if(!result.ok)process.exitCode=1;
}catch(e){
 result.errors.push(String(e.message).slice(0,270));
 result.phases=phases;result.wsCloses=wsCloses;
 result.failurePhase=await page.evaluate(()=>window.__stormptNativeQA?.snapshot()?.phase||'unknown').catch(()=>null);
 result.failureStatus=(await page.locator('#accountStatus').textContent().catch(()=>''))?.slice(0,180);
 console.log(JSON.stringify(result));
 process.exitCode=1;
}finally{
 clearInterval(ticker);
 writeFileSync('/work/builds/staging-0400/qa-audio-public-0400.json',JSON.stringify(result,null,2));
 await browser.close();
}
