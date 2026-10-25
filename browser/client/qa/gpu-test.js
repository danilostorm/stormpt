(async()=>{
 const qa=__QA__;
 const wait=async(f,ms=30000)=>{const start=performance.now();while(!f()){if(performance.now()-start>ms)throw Error('GPU QA wait timed out');await new Promise(r=>setTimeout(r,100));}};
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 await wait(()=>window.__stormptNativeQA&&document.getElementById('loginForm'));
 const errors=[];window.addEventListener('error',e=>errors.push(e.message));
 if(document.getElementById('loggedIn').hidden){
 document.getElementById('loginUser').value=qa.account;
 document.getElementById('loginPassword').value=qa.password;
 document.getElementById('loginForm').requestSubmit();
 await wait(()=>!document.getElementById('loggedIn').hidden);
 }
 document.getElementById('enterGame').click();
 await wait(()=>window.__stormptNativeQA.snapshot().phase==='character-list');
 const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='StormWebQA1 · Nível 1');
 if(!button)throw Error('Real QA character absent');button.click();
 await wait(()=>['in-world','error','disconnected'].includes(window.__stormptNativeQA.snapshot().phase),120000);
 if(window.__stormptNativeQA.snapshot().phase!=='in-world')throw Error('Real world entry failed: '+document.getElementById('accountStatus').textContent);
 await wait(()=>window.__stormptNativeQA.snapshot().entityModels?.rendered>=1);
 await delay(5000);
 const api=window.__stormptNativeQA,renderer=api.performance();
 if(!/GTX 1650/i.test(renderer.renderer)||/SwiftShader|software|Microsoft Basic/i.test(renderer.renderer))throw Error('Hardware GPU not confirmed: '+renderer.renderer);
 if(renderer.width!==1920||renderer.height!==1080)throw Error('1080p drawing buffer required');
 api.resetPerformance();await delay(30000);const idle=api.performance();
 const canvas=document.querySelector('#stormptWorld canvas');canvas.focus();
 const before=api.snapshot().worldLive.position;
 api.resetPerformance();canvas.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyA',bubbles:true}));
 await delay(6000);canvas.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyA',bubbles:true}));
 await delay(200);const walking=api.performance(),after=api.snapshot().worldLive.position;
 if(Math.hypot(after[0]-before[0],after[2]-before[2])<=0)throw Error('No authoritative movement in GPU test');
 api.resetPerformance();await delay(6000);const stopped=api.performance();
 const s=api.snapshot();
 if(s.phase!=='in-world'||!s.render.animated||s.animation.clip!=='idle'||errors.length)throw Error('GPU session validation failed');
 const result={at:new Date().toISOString(),url:location.href,realSite:true,mocked:false,hardwareVerified:true,gpu:'GTX 1650',browser:navigator.userAgent,idle,walking,stopped,movementConfirmed:true,liveEntities:s.entities.entities.length,renderedNpcs:s.entityModels.rendered,entityErrors:s.entityModels.errors,before,after,errors,pilotOnly:true,rx550Tested:false};
 api.close();return result;
})()