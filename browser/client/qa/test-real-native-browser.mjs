import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
const qa=JSON.parse(readFileSync('/work/secrets/web-qa-account.json'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 const response=await page.goto('https://stormpt.hoststorm.com.br/jogar-beta/index.html',{waitUntil:'networkidle',timeout:45000});
 if(response.status()!==200)throw Error('Public beta returned HTTP '+response.status());
 await page.waitForFunction(()=>window.__stormptAccountQA?.uiReady,{timeout:15000});
 await page.fill('#loginUser',qa.account);await page.fill('#loginPassword',qa.password);
 await page.click('#loginSubmit');
 await page.waitForFunction(()=>!document.getElementById('loggedIn').hidden,{timeout:20000});
 await page.click('#enterGame');
 await page.waitForFunction(()=>window.__stormptNativeQA?.snapshot().phase==='character-list',{timeout:25000});
 const state=await page.evaluate(()=>window.__stormptNativeQA.snapshot());
 await page.screenshot({path:'/work/client/qa/real-native-login-chromium.png',fullPage:true});
 const result={at:new Date().toISOString(),httpStatus:response.status(),realBrowser:'Chromium',
  mockedRoutes:false,state,errors,nativeLoginConfirmed:true,playable:false};
 writeFileSync('/work/builds/real-native-browser-result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({result:'REAL_CHROMIUM_NATIVE_LOGIN_CONFIRMED',phase:state.phase,characterCount:state.characters.length,errors}));
 await page.evaluate(()=>window.__stormptNativeQA.close());
} catch(e){
 const state=await page.evaluate(()=>({status:document.getElementById('accountStatus')?.textContent,native:window.__stormptNativeQA?.snapshot()})).catch(()=>({}));
 console.error(JSON.stringify({error:e.message,state,errors}));process.exitCode=1;
}finally{await browser.close();}
