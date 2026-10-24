import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const qa=JSON.parse(readFileSync('/work/secrets/web-qa-account.json'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:900,height:600}});
const errors=[],failed=[],phases=[],wsCloses=[];
page.on('websocket',ws=>ws.on('close',()=>wsCloses.push('closed')));
const ticker=setInterval(async()=>{try{const x=await page.evaluate(()=>({phase:window.__stormptNativeQA?.snapshot()?.phase||'unknown',status:document.getElementById('accountStatus')?.textContent?.slice(0,120)}));if(phases.at(-1)?.phase!==x.phase)phases.push(x);}catch{}},1300);
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/jogar-beta/')&&r.status()>=400)failed.push(r.status()+' '+u.pathname)});
const result={ok:false,login:false,world:false,monsterPanelLoaded:false,targetInitiallyNull:false,entitiesFromServer:false,errors,failed};
try{
 const r=await page.goto('https://stormpt.hoststorm.com.br/jogar/',{waitUntil:'load',timeout:45000});
 assert.equal(r.status(),200);
 await page.waitForFunction(()=>window.__stormptAccountQA?.uiReady,null,{timeout:30000});
 await page.fill('#loginUser',qa.account);
 await page.fill('#loginPassword',qa.password);
 await page.click('#loginSubmit');
 await page.waitForFunction(()=>window.__stormptNativeQA?.snapshot()?.phase==='character-list',null,{timeout:40000});
 result.login=true;
 await page.getByRole('button',{name:'StormWebQA1 · Nível 1',exact:true}).click();
 await page.waitForFunction(()=>window.__stormptNativeQA?.snapshot()?.phase==='in-world',null,{timeout:45000});
 result.world=true;
 result.monsterPanelLoaded=await page.locator('.world-monster-target').count()===1;
 result.targetInitiallyNull=(await page.evaluate(()=>window.__stormptNativeQA.snapshot().target))===null;
 result.entitiesFromServer=(await page.evaluate(()=>window.__stormptNativeQA.snapshot().entities?.entities?.length||0))>=0;
 const keyboard=await page.evaluate(async()=>{
  const mod=await import('/jogar-beta/native-target.js?v=20261024-0600');
  const snapshot={observer:42,sequence:1,field:3,entities:[
   {serial:17,kind:2,name:'QA',level:1,life:5,maxLife:10,position:[256,0,0]},
   {serial:18,kind:1,name:'NPC',level:1,life:5,maxLife:10,position:[128,0,0]}
  ]};
  return {hasCycle:typeof mod.cycleMonsterTarget==='function',
   selected:mod.cycleMonsterTarget(snapshot,null,[0,0,0])};
 });
 result.keyboardModule=keyboard;
 assert.deepEqual(keyboard,{hasCycle:true,selected:17});
 await page.locator('#stormptWorld > canvas').focus();
 await page.keyboard.press('t');
 result.targetAfterNoMonster=await page.evaluate(()=>window.__stormptNativeQA.snapshot().target);

 await page.screenshot({path:'/work/builds/staging-0600/public-qa-target-0600.png'});
 result.ok=result.login&&result.world&&result.monsterPanelLoaded&&result.targetInitiallyNull&&result.keyboardModule?.selected===17&&errors.length===0&&failed.length===0;
 console.log(JSON.stringify(result));
 if(!result.ok)process.exitCode=1;
}catch(e){
 result.errors.push(String(e.message).slice(0,350));
 result.phases=phases;result.wsCloses=wsCloses;
 result.phase=await page.evaluate(()=>window.__stormptNativeQA?.snapshot()?.phase||'unknown').catch(()=>null);
 result.status=(await page.locator('#accountStatus').textContent().catch(()=>''))?.slice(0,140);
 console.log(JSON.stringify(result));process.exitCode=1;
}finally{
 clearInterval(ticker);
 writeFileSync('/work/builds/staging-0600/public-qa-target-0600.json',JSON.stringify(result,null,2));
 await browser.close();
}
