/**
 * Original StormPT audio in the QA-only Ricarten scene.
 * The two files are served by the existing authenticated, allowlisted
 * BrowserAssets.ashx handler. No autoplay, no cross-origin requests.
 */
const TRACKS=Object.freeze([
  {asset:'ricarten-music',gain:.65},
  {asset:'ricarten-ambient',gain:.30},
]);
export class NativeWorldAudio {
  constructor(container,{AudioCtor=globalThis.Audio}={}){
    if(!container||typeof AudioCtor!=='function')throw new TypeError('Audio panel requires a container and Audio');
    this.disposed=false;this.enabled=false;this.generation=0;this.volume=.45;
    this.container=container;
    this.root=document.createElement('aside');
    this.root.className='world-audio-controls';
    this.root.style.cssText='position:absolute;top:74px;right:18px;z-index:8;padding:9px 11px;background:#121720e8;border:1px solid #8b6a3b;border-radius:6px;color:#f3dfb1;font:12px system-ui;display:flex;flex-direction:column;gap:7px;max-width:220px';
    this.button=document.createElement('button');
    this.button.type='button';this.button.textContent='Ativar som original';
    this.button.setAttribute('aria-pressed','false');
    this.button.style.cssText='cursor:pointer;background:#3d3023;color:#f3dfb1;border:1px solid #a5874b;padding:7px;border-radius:4px';
    const label=document.createElement('label');
    label.textContent='Volume ';
    this.slider=document.createElement('input');
    this.slider.type='range';this.slider.min='0';this.slider.max='100';this.slider.value='45';
    this.slider.setAttribute('aria-label','Volume do jogo');
    label.append(this.slider);
    this.status=document.createElement('span');
    this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');
    this.status.textContent='Desligado até você ativar.';
    this.root.append(this.button,label,this.status);
    container.append(this.root);
    this.tracks=TRACKS.map(track=>{
      const audio=new AudioCtor();
      audio.preload='none';audio.loop=true;
      return {...track,audio};
    });
    this.abort=new AbortController();
    const opts={signal:this.abort.signal};
    this.button.addEventListener('click',()=>void this.toggle(),opts);
    this.slider.addEventListener('input',()=>{
      this.volume=Number(this.slider.value)/100;
      this.#applyVolume();
    },opts);
    document.addEventListener('visibilitychange',()=>{
      if(this.disposed||!this.enabled)return;
      if(document.hidden){this.#pause();this.status.textContent='Pausado em segundo plano.';}
      else void this.#play();
    },opts);
    this.#applyVolume();
  }
  #applyVolume(){
    for(const track of this.tracks)track.audio.volume=Math.max(0,Math.min(1,this.volume*track.gain));
  }
  #pause(){for(const track of this.tracks)track.audio.pause();}
  async #play(){
    if(this.disposed||!this.enabled||document.hidden)return;
    const current=++this.generation;
    this.status.textContent='Carregando áudio original…';
    const outcomes=await Promise.allSettled(this.tracks.map(async track=>{
      if(!track.audio.src)track.audio.src='/BrowserAssets.ashx?asset='+track.asset;
      await track.audio.play();
    }));
    if(this.disposed||!this.enabled||current!==this.generation){this.#pause();return;}
    const success=outcomes.filter(x=>x.status==='fulfilled').length;
    if(success===0){
      this.enabled=false;this.button.textContent='Ativar som original';
      this.button.setAttribute('aria-pressed','false');
      this.#pause();this.status.textContent='Áudio indisponível. Tente novamente.';
    }else{
      this.status.textContent=success===this.tracks.length?'Música e ambiente de Ricarten.':'Áudio parcial: um dos arquivos não carregou.';
    }
  }
  async toggle(){
    if(this.disposed)return;
    this.enabled=!this.enabled;
    this.button.textContent=this.enabled?'Desativar som':'Ativar som original';
    this.button.setAttribute('aria-pressed',String(this.enabled));
    if(this.enabled)await this.#play();
    else{++this.generation;this.#pause();this.status.textContent='Som desativado.';}
  }
  snapshot(){return {enabled:this.enabled,volume:this.volume,disposed:this.disposed,
    playing:this.tracks.filter(x=>!x.audio.paused).length};}
  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.enabled=false;++this.generation;
    this.abort.abort();this.#pause();
    for(const {audio} of this.tracks){audio.removeAttribute('src');audio.load();}
    this.root.remove();
  }
}
