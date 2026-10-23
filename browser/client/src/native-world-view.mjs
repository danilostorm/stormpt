import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {decodeNativeMotion,NativeMotionPlayer} from './native-motion.mjs';
import {StormPTWorldScene} from './world-scene.mjs';
/** Presentation of confirmed native snapshots only; no local movement simulation. */
export class NativeWorldView {
 constructor({record,initial,onDirection,onExit,onReady,onError}){
  if(record.field!==3||record.identity.bodyModel!=='char\\tmABCD\\b001.ini'||record.identity.faceModel!=='char\\tmABCD\\tmh-b01.inf')throw Error('Modelo ou mapa ainda não disponível.');
  this.record=record;this.latest=initial;this.onDirection=onDirection;this.onExit=onExit;this.onError=onError;
  this.keys=new Set();this.yaw=.58;this.distance=110;this.pitch=.58;this.disposed=false;
  this.container=document.createElement('section');this.container.id='stormptWorld';
  this.container.innerHTML='<style>#stormptWorld{position:fixed;inset:0;z-index:100;background:#111822;color:#f3dfb1;font:14px system-ui}#stormptWorld canvas{width:100%;height:100%;display:block;outline:0;touch-action:none}.world-hud{position:absolute;top:18px;left:18px;background:#121720e8;border:1px solid #8b6a3b;padding:12px 18px;border-radius:8px;pointer-events:none}.world-hud strong{display:block;font-size:18px}.world-hud small{color:#c3b18d}.world-exit{position:absolute;right:18px;top:18px;padding:10px 18px;cursor:pointer}.world-help{position:absolute;bottom:18px;left:18px;padding:8px 12px;background:#121720ce;border-radius:6px;pointer-events:none}.world-controls{position:absolute;right:18px;bottom:18px;display:grid;grid-template-columns:repeat(3,42px);gap:4px}.world-controls button{height:42px;touch-action:none;user-select:none}</style><canvas tabindex="0" aria-label="StormPT em Ricarten"></canvas><aside class="world-hud"><strong></strong><span></span><br><small>Ricarten</small></aside><button class="world-exit" type="button">Sair do mundo</button><div class="world-help">WASD / setas · Arraste para girar · Roda para aproximar</div><div class="world-controls"><span></span><button data-key="ArrowUp">▲</button><span></span><button data-key="ArrowLeft">◀</button><button data-key="ArrowDown">▼</button><button data-key="ArrowRight">▶</button></div>';
  document.body.append(this.container);this.canvas=this.container.querySelector('canvas');
  this.container.querySelector('strong').textContent=record.identity.name+' · Nível '+record.identity.level;
  this.container.querySelector('.world-hud span').textContent='Vida '+record.life.current+' / '+record.life.max;
  this.container.querySelector('.world-exit').addEventListener('click',()=>onExit());
  this.abort=new AbortController();const opts={signal:this.abort.signal};
  this.canvas.addEventListener('keydown',e=>{if(this.isKey(e.code)){e.preventDefault();this.keys.add(e.code);}},opts);
  this.canvas.addEventListener('keyup',e=>{if(this.isKey(e.code)){e.preventDefault();this.keys.delete(e.code);this.direction();}},opts);
  window.addEventListener('blur',()=>{this.keys.clear();this.direction();},opts);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.keys.clear();this.direction();}},opts);
  this.canvas.addEventListener('contextmenu',e=>e.preventDefault(),opts);
  this.canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId);this.canvas.focus();},opts);
  this.canvas.addEventListener('pointermove',e=>{if(!this.drag)return;this.yaw-=(e.clientX-this.drag.x)*.008;this.pitch=Math.max(.2,Math.min(1.2,this.pitch+(e.clientY-this.drag.y)*.005));this.drag={x:e.clientX,y:e.clientY};},opts);
  this.canvas.addEventListener('pointerup',()=>{this.drag=null;},opts);
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.max(45,Math.min(220,this.distance+e.deltaY*.08));},{...opts,passive:false});
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.keys.clear();onError(Error('A conexão gráfica foi interrompida. Recarregue o jogo.'));},opts);
  for(const b of this.container.querySelectorAll('[data-key]')){
   b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.keys.add(b.dataset.key);},opts);
   for(const event of ['pointerup','pointercancel'])b.addEventListener(event,()=>{this.keys.delete(b.dataset.key);this.direction();},opts);
  }
  this.ready=this.load(onReady);
 }
 isKey(k){return ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k);}
 direction(){
  if(!this.root||this.disposed)return;
  let dx=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0);
  let dz=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0);
  const direction=dx||dz?((Math.round(Math.atan2(dx,dz)/(Math.PI/4))+8)%8)+1:0;
  if(direction||this.lastDirection){try{this.onDirection(direction);}catch(e){this.onError(e);}}
  this.lastDirection=direction;
 }
 applySnapshot(s){
  if(s.serial!==this.record.identity.serial||s.name!==this.record.identity.name||s.field!==3)throw Error('Estado de outro personagem.');
  if(this.motion){const moved=s.status===0&&(s.position[0]!==this.latest.position[0]||s.position[2]!==this.latest.position[2]);this.motion.setMoving(moved,performance.now());}
  this.latest=s;
  if(this.root){this.from=this.root.position.clone();this.to=new THREE.Vector3(...s.position.map(v=>v/256));this.received=performance.now();}
 }
 async load(onReady){
  try{
   this.world=new StormPTWorldScene(this.canvas,{pixelRatioLimit:1,antialias:false});
   const stage=await this.world.loadStage('/BrowserAssets.ashx?asset=ricarten',{signal:this.abort.signal});
   const loader=new GLTFLoader();
   const motionResponse=await fetch('/BrowserAssets.ashx?asset=fighter-motion',{credentials:'same-origin',cache:'no-store',signal:this.abort.signal});
   if(!motionResponse.ok)throw Error('Animação original indisponível.');
   const motion=decodeNativeMotion(await motionResponse.arrayBuffer());
   const models=await Promise.all([loader.loadAsync('/BrowserAssets.ashx?asset=fighter-body-animated'),loader.loadAsync('/BrowserAssets.ashx?asset=fighter-head-animated')]);
   if(this.disposed)return;
   this.root=new THREE.Group();let meshes=0;
   for(let i=0;i<models.length;++i){
    const allowed=new Set(i===0?['TAHB01','TBHB01','TLHB01']:['TmhhB01']);
    models[i].scene.traverse(o=>{if(o.isMesh){o.visible=allowed.has(o.name);if(o.visible)meshes++;}});
    this.root.add(models[i].scene);
   }
   if(meshes!==4)throw Error('Modelo original incompleto.');
   this.motion=new NativeMotionPlayer(motion,models.map(m=>m.scene));
   this.root.position.set(...this.latest.position.map(v=>v/256));this.world.scene.add(this.root);this.applySnapshot(this.latest);
   this.world.camera.near=.2;this.world.camera.far=5000;this.world.camera.updateProjectionMatrix();
   const frame=now=>{
    if(this.disposed)return;
    if(this.to)this.root.position.lerpVectors(this.from,this.to,Math.min(1,Math.max(0,(now-this.received)/80)));
    this.motion.update(now);
    this.root.rotation.y=this.latest.heading*Math.PI*2/4096;
    const target=this.root.position.clone().add(new THREE.Vector3(0,22,0));
    const horizontal=Math.cos(this.pitch)*this.distance;
    this.world.camera.position.set(target.x+Math.sin(this.yaw)*horizontal,target.y+Math.sin(this.pitch)*this.distance,target.z+Math.cos(this.yaw)*horizontal);
    this.world.camera.lookAt(target);this.world.renderer.render(this.world.scene,this.world.camera);
    this.raf=requestAnimationFrame(frame);
   };
   this.raf=requestAnimationFrame(frame);this.timer=setInterval(()=>this.direction(),50);this.canvas.focus();
   onReady({stageMeshes:stage.meshes,stageTriangles:stage.geometryTriangles,characterMeshes:meshes,animated:true,bones:motion.bones});
  }catch(e){if(!this.disposed)this.onError(e);}
 }
 animationProbe(){return this.motion?.probe()||null;}
 dispose(){
  if(this.disposed)return;this.disposed=true;clearInterval(this.timer);cancelAnimationFrame(this.raf);this.abort.abort();
  if(this.root){this.world?.scene.remove(this.root);this.world?.disposeStage(this.root);}
  this.world?.dispose();this.container.remove();
 }
}
