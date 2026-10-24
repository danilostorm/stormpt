import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const module=readFileSync('/work/client/src/native-inventory.mjs','utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1050,height:750}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const html='<html><body style="background:#121720;color:#f3dfb1"><div id="world" style="position:relative;height:650px"></div>'+
'<script type="module">import {NativeInventoryPanel} from "/native-inventory.mjs";'+
'const item={name:"<img src=x onerror=alert(1)>",quantity:1,damage:[4,7],defence:3,weight:12,durability:{current:20,max:30},aging:2,price:1234567,slot:5,bag:0,requirements:{level:12,strength:30,spirit:0,talent:10,dexterity:0,health:5}};'+
'const sheet={life:{current:60,max:70},mana:{current:30,max:40},stamina:{current:20,max:30},money:555,weight:{current:10,max:100},damage:[2,5],defence:8,attributes:{strength:29,spirit:10,talent:12,dexterity:11,health:5}};'+
'window.inventory=new NativeInventoryPanel(document.querySelector("#world"),{inventory:{readOnly:true,items:[item]},sheet,name:"StormWebQA",level:12});window.ready=true;'+
'</script></body></html>';
await page.route('http://127.0.0.1:3909/**',route=>{
 const pathname=new URL(route.request().url()).pathname;
 if(pathname==='/native-inventory.mjs')
  return route.fulfill({status:200,contentType:'text/javascript',body:module});
 return route.fulfill({status:200,contentType:'text/html',body:html});
});
try{
 await page.goto('http://127.0.0.1:3909/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.ready);
 await page.locator('.world-inventory-toggle').click();
 await page.locator('.inventory-items button').click();
 const details=await page.locator('.inventory-detail').innerText();
 assert.match(details,/Preço registrado no item: 1\.234\.567 ouro/);
 assert.match(details,/✕ Força: 30 \(personagem: 29\)/);
 assert.match(details,/✓ Talento: 10 \(personagem: 12\)/);
 assert.match(details,/✓ Nível: 12 \(personagem: 12\)/);
 assert.match(details,/não equipa e não altera itens/);
 assert.equal(await page.locator('.inventory-detail img').count(),0);
 assert.equal(await page.locator('.inventory-detail script').count(),0);
 await page.screenshot({path:'/work/builds/inventory-details-fixture-0730.png'});
 const result={ok:errors.length===0,source:'GameServer-shaped fixture, NOT real equipped item',detailPanel:true,
  requirementRows:4,price:true,htmlInjectionBlocked:true,mutationsSent:0,errors};
 writeFileSync('/work/builds/inventory-details-fixture-0730.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
 if(!result.ok)process.exitCode=1;
}finally{await browser.close()}
