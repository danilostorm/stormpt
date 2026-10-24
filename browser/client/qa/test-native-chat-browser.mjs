import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:900,height:700}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3906/private-test/chat-ui-test.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.qaReady===true);
 await page.getByText('Chat · Enter').click();
 assert.equal(await page.locator('.world-chat-panel').isVisible(),true);
 await page.locator('.chat-input').fill('Olá, mundo');
 await page.locator('.chat-form button').click();
 assert.deepEqual(await page.evaluate(()=>window.sent),['Olá, mundo']);
 assert.equal(await page.locator('.chat-input').inputValue(),'');
 await page.evaluate(()=>window.chatPanel.receive({origin:0,text:'<img src=x onerror=alert(1)> & Olá'}));
 assert.equal(await page.locator('.chat-lines img').count(),0);
 assert.equal(await page.locator('.chat-lines li').innerText(),'<img src=x onerror=alert(1)> & Olá');
 await page.evaluate(()=>{for(let i=0;i<45;i++)window.chatPanel.receive({origin:0,text:'msg '+i})});
 assert.equal(await page.locator('.chat-lines li').count(),40);
 await page.locator('.chat-input').fill('/admin');
 await page.locator('.chat-form button').click();
 assert.match(await page.locator('.chat-status').innerText(),/bloqueados/);
 assert.deepEqual(await page.evaluate(()=>window.sent),['Olá, mundo']);
 await page.locator('.chat-input').press('Escape');
 assert.equal(await page.locator('.world-chat-panel').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({ok:true,ui:true,serverOnlyLog:true,htmlEscaping:true,historyCap:40,commandRejection:true,keyboardClose:true,errors}));
}finally{await browser.close()}
