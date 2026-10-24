/**
 * Optional render-scale policy for StormPT Web.
 * Disabled until the player explicitly enables auto quality.
 * Never changes gameplay, camera, geometry, textures, server packets or state.
 * A drop below native resolution is reported in the HUD; never labelled
 * "graphics at maximum". Meant for GPU comparison on GTX 1650 and RX 550.
 */
export class AdaptiveRenderScale {
  constructor({renderer,enabled=false,now=()=>performance.now(),
    minScale=0.70,maxScale=1,windowMs=4000,cooldownMs=12000}={}){
    if(!renderer || typeof renderer.setPixelRatio!=='function' ||
       typeof renderer.getPixelRatio!=='function')throw new TypeError('Renderer required');
    if(typeof now!=='function'||typeof enabled!=='boolean'||
       !Number.isFinite(minScale)||!Number.isFinite(maxScale)||
       minScale<0.5||maxScale>2||minScale>maxScale||
       !Number.isInteger(windowMs)||windowMs<1000||
       !Number.isInteger(cooldownMs)||cooldownMs<windowMs)
      throw new RangeError('Invalid render scale settings');
    this.renderer=renderer;this.now=now;
    this.minScale=minScale;this.maxScale=maxScale;
    this.windowMs=windowMs;this.cooldownMs=cooldownMs;
    this.baseRatio=renderer.getPixelRatio();
    this.scale=1;this.enabled=enabled;this.started=null;
    this.lastFrame=null;this.frames=[];this.slowStreak=0;this.fastStreak=0;
    this.lastChange=-Infinity;this.lastDecision=null;
    this.onChange=null;
  }
  setEnabled(value){
    if(typeof value!=='boolean')throw new TypeError('Expected boolean');
    this.enabled=value;
    this.frames=[];this.started=null;this.lastFrame=null;
    this.slowStreak=0;this.fastStreak=0;
    if(!value)this.#apply(1);
  }
  #apply(scale){
    const next=Math.max(this.minScale,Math.min(this.maxScale,Math.round(scale*100)/100));
    if(this.scale===next)return false;
    this.scale=next;
    this.renderer.setPixelRatio(this.baseRatio*next);
    // Renderer keeps the DOM/CSS size; setPixelRatio only changes drawing buffer.
    this.onChange?.(this.snapshot());
    return true;
  }
  recordFrame(time=this.now(),{visible=true}={}){
    if(!Number.isFinite(time))throw new RangeError('Invalid frame clock');
    if(!this.enabled || !visible) {
      this.lastFrame=null;this.started=null;this.frames=[];
      this.slowStreak=0;this.fastStreak=0;
      return this.snapshot();
    }
    if(this.lastFrame!==null){
      const dt=time-this.lastFrame;
      if(dt<=0)return this.snapshot();
      // Ignore document suspend/resume and tab background intervals.
      if(dt>500){this.frames=[];this.started=time;this.lastFrame=time;return this.snapshot()}
      this.frames.push(dt);
    }
    if(this.started===null)this.started=time;
    this.lastFrame=time;
    if(time-this.started<this.windowMs)return this.snapshot();
    if(this.frames.length<8){this.#clearWindow(time);return this.snapshot()}
    const values=[...this.frames].sort((a,b)=>a-b);
    const duration=this.frames.reduce((a,b)=>a+b,0);
    const fps=duration>0?this.frames.length*1000/duration:0;
    const p95=values[Math.ceil(values.length*0.95)-1];
    const slow=fps<51||p95>23;
    const fast=fps>=57&&p95<18;
    this.lastDecision={fps,p95,slow,fast};
    if(slow){this.slowStreak++;this.fastStreak=0}
    else if(fast){this.fastStreak++;this.slowStreak=0}
    else {this.slowStreak=0;this.fastStreak=0}
    const cooled=time-this.lastChange>=this.cooldownMs;
    if(cooled && this.slowStreak>=2 && this.scale>this.minScale){
      if(this.#apply(this.scale-0.1))this.lastChange=time;
      this.slowStreak=0;this.fastStreak=0;
    }else if(cooled&&this.fastStreak>=3&&this.scale<this.maxScale){
      if(this.#apply(this.scale+0.1))this.lastChange=time;
      this.slowStreak=0;this.fastStreak=0;
    }
    this.#clearWindow(time);
    return this.snapshot();
  }
  #clearWindow(time){this.frames=[];this.started=time}
  snapshot(){
    return {enabled:this.enabled,scale:this.scale,pixelRatio:this.baseRatio*this.scale,
      resolutionMode:this.scale===1?'native':'adaptive',
      lastDecision:this.lastDecision};
  }
}
