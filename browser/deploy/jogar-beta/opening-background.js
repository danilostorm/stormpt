import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const canvas=document.createElement('canvas');canvas.id='openingBackground';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
const toggle=document.createElement('button');toggle.id='openingToggle';toggle.type='button';toggle.textContent='Pausar fundo';toggle.setAttribute('aria-pressed','false');document.body.append(toggle);
// Explicit site preference: start animated; the pause button remains available.
let paused=false,renderer,scene,camera,root,route,raf,last=0,time=0,disposed=false;
const probe={ready:false,frames:0,animated:false,source:'original-opening-stage-and-camera',error:null};
window.__stormptOpeningQA=probe;
const loading=document.getElementById('openingLoading'),bar=document.getElementById('openingProgress');
let loadingTimer;
function finishLoading(){clearTimeout(loadingTimer);if(loading){loading.hidden=true;loading.setAttribute('aria-busy','false');}probe.loadingFinished=true;}
function progress(event){if(bar&&event.lengthComputable&&event.total>0)bar.value=Math.min(95,Math.round(event.loaded/event.total*95));}
// Slow or unavailable graphics must never prevent access to account forms.
loadingTimer=setTimeout(finishLoading,12000);

function size(){if(!renderer)return;renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight),false);camera.aspect=innerWidth/Math.max(1,innerHeight);camera.updateProjectionMatrix();}
function sample(keys,frame,angle=false){let i=0;while(i<keys.length-2&&keys[i+1][0]<=frame)i++;const a=keys[i],b=keys[i+1],t=Math.max(0,Math.min(1,(frame-a[0])/(b[0]-a[0])));return a.slice(1).map((v,k)=>{let d=b[k+1]-v;if(angle)d=((d+2048)%4096+4096)%4096-2048;return v+d*t;});}
const target=new THREE.Vector3();
function draw(now){
 if(disposed)return;
 const elapsed=last?Math.min(100,now-last):0;last=now;
 if(!paused&&!document.hidden)time+=elapsed;
 const frame=(70320+time*3.5)%route.lastFrame,p=sample(route.positions,frame),a=sample(route.angles,frame,true),yaw=a[1]*Math.PI/2048,pitch=a[0]*Math.PI/2048;
 camera.position.set(...p);target.set(p[0]-Math.sin(yaw)*100,p[1]-Math.sin(pitch)*100,p[2]+Math.cos(yaw)*100);camera.lookAt(target);
 if(now-(probe.lastRender||0)>=(paused?1000:1000/30)&&!document.hidden){renderer.render(scene,camera);probe.frames++;probe.lastRender=now;}
 probe.position=p;probe.animated=!paused&&!document.hidden;raf=requestAnimationFrame(draw);
}
function dispose(){
 if(disposed)return;disposed=true;cancelAnimationFrame(raf);probe.animated=false;
 if(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){ms.add(m);if(m.map)ts.add(m.map);}});gs.forEach(o=>o.dispose());ms.forEach(o=>o.dispose());ts.forEach(o=>o.dispose());}
 renderer?.dispose();renderer?.forceContextLoss();finishLoading();canvas.remove();toggle.remove();window.removeEventListener('resize',size);
}
function label(){toggle.textContent=paused?'Animar fundo':'Pausar fundo';toggle.setAttribute('aria-pressed',String(paused));}
toggle.addEventListener('click',()=>{paused=!paused;label();});
label();
document.getElementById('enterGame').addEventListener('click',dispose,{capture:true,once:true});
window.addEventListener('pagehide',dispose,{once:true});
window.addEventListener('resize',size);
document.addEventListener('visibilitychange',()=>{last=0;});
async function start(){
 try{
  const [g,r]=await Promise.all([new GLTFLoader().loadAsync('/jogar-beta/opening.glb',progress),fetch('/jogar-beta/opening-camera.json').then(r=>{if(!r.ok)throw Error('Camera unavailable');return r.json();})]);
  root=g.scene;if(disposed){disposeLoaded(root);return;}route=r;
  renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,.85));renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x879bb0);scene.fog=new THREE.Fog(0x879bb0,2200,5500);
  camera=new THREE.PerspectiveCamera(62,1,1,7000);scene.add(root);
  root.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=true;if(o.material?.userData?.missingOriginalTexture)o.visible=false;});
  scene.add(new THREE.HemisphereLight(0xffffff,0x646674,2));const sun=new THREE.DirectionalLight(0xffe5c2,1.1);sun.position.set(500,900,-400);scene.add(sun);size();probe.ready=true;probe.triangles=40487;draw(performance.now());if(bar)bar.value=100;requestAnimationFrame(finishLoading);
 }catch(e){probe.error='Opening unavailable';finishLoading();canvas.remove();toggle.remove();}
}
function disposeLoaded(root){root.traverse(o=>{o.geometry?.dispose();const m=o.material;if(m&&!Array.isArray(m)){m.map?.dispose();m.dispose();}});}
start();
