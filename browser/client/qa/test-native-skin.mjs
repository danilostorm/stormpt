import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root='/work',routes=new Map([
 ['/motion.mjs',root+'/client/src/native-motion.mjs'],
 ['/body.glb',root+'/assets/converted/tmbB01.skinned.textured.glb'],
 ['/head.glb',root+'/assets/converted/tmh-B01.skinned.textured.glb'],
 ['/motion.ptan',root+'/assets/converted/fighter-motion.ptan']]);
const html=`<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {decodeNativeMotion,NativeMotionPlayer} from '/motion.mjs';
try{
const models=await Promise.all(['/body.glb','/head.glb'].map(x=>new GLTFLoader().loadAsync(x)));
let meshes=[];for(let i=0;i<2;i++)models[i].scene.traverse(o=>{if(o.isMesh){o.visible=(i===0?['TAHB01','TBHB01','TLHB01']:['TmhhB01']).includes(o.name);if(o.visible)meshes.push(o);}});
if(meshes.some(m=>!m.isSkinnedMesh))throw Error('Missing skin');
const motion=decodeNativeMotion(await(await fetch('/motion.ptan')).arrayBuffer());
const player=new NativeMotionPlayer(motion,models.map(m=>m.scene));
const scene=new THREE.Scene();models.forEach(m=>scene.add(m.scene));
const sample=(now)=>{player.update(now);scene.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());let points=[];for(const m of meshes)for(let i=0;i<m.geometry.attributes.position.count;i++){const v=new THREE.Vector3();m.getVertexPosition(i,v);points.push(v.toArray());}return points;};
const a=sample(1000);player.setMoving(true,1100);const b=sample(1300),c=sample(1500);
const box=new THREE.Box3().setFromPoints(b.map(v=>new THREE.Vector3(...v)));
const moved=b.reduce((n,v,i)=>n+(Math.hypot(...v.map((x,j)=>x-c[i][j]))>.01?1:0),0);
const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(800,700);document.body.style.margin='0';document.body.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x333333,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(30,60,50);scene.add(light);
const camera=new THREE.PerspectiveCamera(45,800/700,.1,500);camera.position.set(55,40,75);camera.lookAt(0,20,0);renderer.render(scene,camera);
window.result={ok:true,meshes:meshes.length,vertices:b.length,movedVertices:moved,bounds:{min:box.min.toArray(),max:box.max.toArray()},stats:player.stats(),webgl2:renderer.capabilities.isWebGL2};
}catch(e){window.result={ok:false,error:String(e)};}
</script>`;
const server=createServer((req,res)=>{try{
 if(req.url==='/'){res.setHeader('content-type','text/html');res.end(html);return;}
 let path=routes.get(req.url);
 if(!path&&req.url.startsWith('/three/')&&!req.url.includes('..'))path=root+'/assets/validation/node_modules/three/'+req.url.slice(7);
 if(!path){res.writeHead(404);res.end();return;}
 res.setHeader('content-type',path.endsWith('.js')||path.endsWith('.mjs')?'text/javascript':'application/octet-stream');res.end(readFileSync(path));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(3905,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3905/');await page.waitForFunction(()=>window.result,undefined,{timeout:60000});
 const result=await page.evaluate(()=>window.result);assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.meshes,4);assert.ok(result.movedVertices>100);assert.ok(result.bounds.max[1]-result.bounds.min[1]>20);assert.ok(result.bounds.max[1]-result.bounds.min[1]<70);
 assert.deepEqual(errors,[]);await page.screenshot({path:root+'/client/qa/skinned-fighter-private.png'});
 writeFileSync(root+'/assets/validation/fighter-skin-browser.json',JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
