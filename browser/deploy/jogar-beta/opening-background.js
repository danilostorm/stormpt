// Lightweight animated backdrop while the original opening conversion is revised.
const style=document.createElement('style');style.textContent=`
body{background:#090d14!important}
#openingBackground{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:radial-gradient(ellipse at 25% 55%,#263040 0,transparent 62%),linear-gradient(140deg,#090d14,#121b28 60%,#090d14)}
#openingBackground:before,#openingBackground:after{content:"";position:absolute;inset:-25%;background:radial-gradient(ellipse at 30% 60%,#9e754322,transparent 45%);animation:stormptGlow 20s ease-in-out infinite alternate}
#openingBackground:after{animation-delay:-10s;transform:rotate(160deg)}
@keyframes stormptGlow{from{transform:translate(-3%,-2%)}to{transform:translate(5%,3%)}}
#openingBackground[data-paused]::before,#openingBackground[data-paused]::after{animation-play-state:paused}
#openingToggle{position:fixed;left:20px;bottom:18px;z-index:2;background:#101620b8;color:#d7c5a3;border:1px solid #78603b;padding:8px 12px;cursor:pointer;font:12px Georgia,serif}
`;document.head.append(style);
const backdrop=document.createElement('div');backdrop.id='openingBackground';backdrop.setAttribute('aria-hidden','true');document.body.prepend(backdrop);
const toggle=document.createElement('button');toggle.id='openingToggle';toggle.type='button';toggle.textContent='Pausar fundo';toggle.setAttribute('aria-pressed','false');document.body.append(toggle);
const probe={ready:true,animated:true,source:'temporary-animated-backdrop',loadingFinished:true};window.__stormptOpeningQA=probe;
toggle.addEventListener('click',()=>{const paused=!backdrop.hasAttribute('data-paused');backdrop.toggleAttribute('data-paused',paused);probe.animated=!paused;toggle.textContent=paused?'Animar fundo':'Pausar fundo';toggle.setAttribute('aria-pressed',String(paused));});
const loading=document.getElementById('openingLoading');if(loading){loading.hidden=true;loading.setAttribute('aria-busy','false');}const bar=document.getElementById('openingProgress');if(bar)bar.value=100;
function dispose(){probe.animated=false;backdrop.remove();toggle.remove();}
document.getElementById('enterGame').addEventListener('click',dispose,{capture:true,once:true});window.addEventListener('pagehide',dispose,{once:true});
