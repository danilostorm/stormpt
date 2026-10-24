import * as THREE from 'three';
import {NativeEntityView} from './native-entity-view.js';
import {NativeRadar} from './native-radar.js';
import {FrameMetrics} from './frame-metrics.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {decodeNativeMotion,NativeMotionPlayer} from './native-motion.js';
import {StormPTWorldScene} from './world-scene.js';
/** Presentation of confirmed native snapshots only; no local movement simulation. */
export class NativeWorldView {
 constructor({record,initial,onDirection,onExit,onReady,onError,onNpc}){
  if(record.field!==3||record.identity.bodyModel!=='char\\tmABCD\\b001.ini'||record.identity.faceModel!=='char\\tmABCD\\tmh-b01.inf')throw Error('Modelo ou mapa ainda não disponível.');
  this.record=record;this.latest=initial;this.onDirection=onDirection;this.onExit=onExit;this.onError=onError;
  this.metrics=new FrameMetrics();this.cameraTarget=new THREE.Vector3();this.from=new THREE.Vector3();this.to=new THREE.Vector3();this.hasTarget=false;this.keys=new Set();this.yaw=.58;this.distance=110;this.pitch=.58;this.disposed=false;
  this.container=document.createElement('section');this.container.id='stormptWorld';
  this.container.innerHTML='<style>#stormptWorld{position:fixed;inset:0;z-index:100;background:#111822;color:#f3dfb1;font:14px system-ui}#stormptWorld > canvas{width:100%;height:100%;display:block;outline:0;touch-action:none}.world-hud{position:absolute;top:18px;left:18px;background:#121720e8;border:1px solid #8b6a3b;padding:12px 18px;border-radius:8px;pointer-events:none}.world-hud strong{display:block;font-size:18px}.world-hud small{color:#c3b18d}.world-exit{position:absolute;right:18px;top:18px;padding:10px 18px;cursor:pointer}.world-help{position:absolute;bottom:18px;left:18px;padding:8px 12px;background:#121720ce;border-radius:6px;pointer-events:none}.world-controls{position:absolute;right:18px;bottom:18px;display:grid;grid-template-columns:repeat(3,42px);gap:4px}.world-nearby{position:absolute;left:18px;bottom:72px}.world-nearby button{display:block;width:128px;background:#121720e8;color:#ecdab1;border:1px solid #8b6a3b;padding:5px;cursor:pointer}.world-nearby canvas{display:block;width:128px;height:128px}.world-nearby ul{position:absolute;left:138px;bottom:0;margin:0;padding:10px 18px;min-width:180px;max-height:180px;overflow:auto;background:#121720e8;list-style:none;font-size:12px}.world-controls button{height:42px;touch-action:none;user-select:none}</style><canvas tabindex="0" aria-label="StormPT em Ricarten"></canvas><aside class="world-hud"><strong></strong><span></span><br><small>Ricarten</small></aside><button class="world-exit" type="button">Sair do mundo</button><div class="world-help">WASD / setas · Arraste para girar · Roda para aproximar</div><div class="world-controls"><span></span><button data-key="ArrowUp">▲</button><span></span><button data-key="ArrowLeft">◀</button><button data-key="ArrowDown">▼</button><button data-key="ArrowRight">▶</button></div>';
  document.body.append(this.container);this.canvas=this.container.querySelector('canvas');
  this.onNpc=onNpc;this.radar=new NativeRadar(this.container,serial=>this.talkTo(serial));this.radar.update([],initial.position);
  this.container.querySelector('strong').textContent=record.identity.name+' · Nível '+record.identity.level;
  this.container.querySelector('.world-hud span').textContent='Vida '+record.life.current+' / '+record.life.max;
  this.container.querySelector('.world-exit').addEventListener('click',()=>onExit());
  this.npcPanel=document.createElement('aside');this.npcPanel.className='world-npc-dialog';this.npcPanel.hidden=true;this.npcPanel.setAttribute('role','dialog');this.npcPanel.setAttribute('aria-label','Conversa com NPC');this.npcPanel.style.cssText='position:absolute;top:25%;left:50%;transform:translateX(-50%);width:min(360px,85vw);padding:18px;background:#121720f5;border:1px solid #b29355;border-radius:8px;z-index:5';this.npcPanel.innerHTML='<h2></h2><p style="white-space:pre-line"></p><small></small><br><button type="button">Fechar</button>';this.container.append(this.npcPanel);this.npcPanel.querySelector('button').addEventListener('click',()=>{this.npcPanel.hidden=true;this.canvas.focus();});
  this.abort=new AbortController();const opts={signal:this.abort.signal};
  this.canvas.addEventListener('keydown',e=>{if(this.isKey(e.code)){e.preventDefault();this.keys.add(e.code);}},opts);
  this.canvas.addEventListener('keyup',e=>{if(this.isKey(e.code)){e.preventDefault();this.keys.delete(e.code);this.direction();}},opts);
  this.canvas.addEventListener('blur',()=>{this.keys.clear();this.direction();},opts);
  window.addEventListener('blur',()=>{this.keys.clear();this.direction();},opts);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.keys.clear();this.direction();}},opts);
  this.canvas.addEventListener('contextmenu',e=>e.preventDefault(),opts);
  this.canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId);this.canvas.focus();},opts);
  this.canvas.addEventListener('pointermove',e=>{if(!this.drag)return;this.yaw-=(e.clientX-this.drag.x)*.008;this.pitch=Math.max(.2,Math.min(1.2,this.pitch+(e.clientY-this.drag.y)*.005));this.drag={x:e.clientX,y:e.clientY};},opts);
  this.canvas.addEventListener('pointerup',()=>{this.drag=null;},opts);
  this.canvas.addEventListener('dblclick',e=>{if(!this.world||!this.entityView)return;const rect=this.canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.world.camera);const entries=[...this.entityView.instances.values()];const hit=ray.intersectObjects(entries.filter(i=>i.entity.kind===1).map(i=>i.root),true)[0];if(hit){let o=hit.object;while(o){const entry=entries.find(i=>i.root===o);if(entry){this.talkTo(entry.entity.serial);break;}o=o.parent;}}},opts);
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.max(45,Math.min(220,this.distance+e.deltaY*.08));},{...opts,passive:false});
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.keys.clear();onError(Error('A conexão gráfica foi interrompida. Recarregue o jogo.'));},opts);
  for(const b of this.container.querySelectorAll('[data-key]')){
   b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.keys.add(b.dataset.key);},opts);
   for(const event of ['pointerup','pointercancel'])b.addEventListener(event,()=>{this.keys.delete(b.dataset.key);this.direction();},opts);
  }
  this.ready=this.load(onReady);
 }
 talkTo(serial){
  this.keys.clear();this.direction();this.npcPanel.hidden=false;this.npcPanel.querySelector('h2').textContent='Conversando…';this.npcPanel.querySelector('p').textContent='';this.npcPanel.querySelector('small').textContent='';this.npcPanel.querySelector('button').focus();
  try{this.onNpc(serial);}catch(e){this.npcPanel.querySelector('p').textContent=e.message;}
 }
 applyNpc(reply){
  this.npcPanel.hidden=false;this.npcPanel.querySelector('h2').textContent=reply.name||'Conversa';
  this.npcPanel.querySelector('p').textContent=reply.status===0?reply.message:({1:'Este NPC não está disponível.',2:'Aproxime-se do NPC para conversar.',3:'Este NPC não tem uma fala disponível.',4:'Aguarde um instante para conversar novamente.'}[reply.status]);
  const services=['Loja','Habilidades','Armazém','Mixagem','Aging'].filter((_,i)=>reply.services&(1<<i));this.npcPanel.querySelector('small').textContent=services.length?'Serviços: '+services.join(' · '):'';
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
  if(this.entities)this.radar.update(this.entities.entities,s.position);
  if(this.root){this.from.copy(this.root.position);this.to.set(s.position[0]/256,s.position[1]/256,s.position[2]/256);this.hasTarget=true;this.received=performance.now();}
 }
 applyEntities(snapshot){
  if(snapshot.observer!==this.record.identity.serial||snapshot.field!==3)throw Error('Entity snapshot belongs to another world');
  this.entities=snapshot;this.entityView?.apply(snapshot);this.radar.update(snapshot.entities,this.latest.position);
 }
 async load(onReady){
  try{
   this.world=new StormPTWorldScene(this.canvas,{pixelRatioLimit:1,antialias:false});
   this.entityView=new NativeEntityView(this.world.scene);if(this.entities)this.entityView.apply(this.entities);
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
    this.metrics.record(now);
    if(this.hasTarget)this.root.position.lerpVectors(this.from,this.to,Math.min(1,Math.max(0,(now-this.received)/80)));
    this.motion.update(now);
    this.root.rotation.y=this.latest.heading*Math.PI*2/4096;
    const target=this.cameraTarget.copy(this.root.position);target.y+=22;
    const horizontal=Math.cos(this.pitch)*this.distance;
    this.world.camera.position.set(target.x+Math.sin(this.yaw)*horizontal,target.y+Math.sin(this.pitch)*this.distance,target.z+Math.cos(this.yaw)*horizontal);
    this.world.camera.lookAt(target);this.world.renderer.render(this.world.scene,this.world.camera);
    this.raf=requestAnimationFrame(frame);
   };
   this.raf=requestAnimationFrame(frame);this.timer=setInterval(()=>this.direction(),50);this.canvas.focus();
   onReady({stageMeshes:stage.meshes,stageTriangles:stage.geometryTriangles,characterMeshes:meshes,animated:true,bones:motion.bones});
  }catch(e){if(!this.disposed)this.onError(e);}
 }
 resetPerformance(){this.metrics.reset();}
 performanceProbe(){
  const r=this.world?.renderer;if(!r)return null;
  const gl=r.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  return {...this.metrics.snapshot(),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),width:r.domElement.width,height:r.domElement.height,pixelRatio:r.getPixelRatio(),calls:r.info.render.calls,triangles:r.info.render.triangles,geometries:r.info.memory.geometries,textures:r.info.memory.textures,programs:r.info.programs?.length};
 }
 entityProbe(){return this.entityView?.stats()||null;}
 animationProbe(){return this.motion?.probe()||null;}
 dispose(){
  if(this.disposed)return;this.disposed=true;clearInterval(this.timer);cancelAnimationFrame(this.raf);this.abort.abort();
  if(this.root){this.world?.scene.remove(this.root);this.world?.disposeStage(this.root);}
  this.entityView?.dispose();this.radar?.dispose();this.world?.dispose();this.container.remove();
 }
}
