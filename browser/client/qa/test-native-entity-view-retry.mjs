import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from '../../assets/validation/node_modules/three/build/three.module.js';
const root=resolve(import.meta.dirname,'../src');
const source=readFileSync(resolve(root,'native-entity-view.mjs'),'utf8')
 .replace("from 'three/addons/loaders/GLTFLoader.js'","from '"+pathToFileURL(resolve('assets/validation/node_modules/three/examples/jsm/loaders/GLTFLoader.js')).href+"'")
 .replace("from './entity-assets.mjs'","from '"+pathToFileURL(resolve(root,'entity-assets.mjs')).href+"'")
 .replace("from './entity-asset-retry.mjs'","from '"+pathToFileURL(resolve(root,'entity-asset-retry.mjs')).href+"'");
const {NativeEntityView}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const wait=()=>new Promise(resolve=>setTimeout(resolve,25));
function fixture(){
 const scene=new Group(),view=new NativeEntityView(scene);
 const entity={serial:99,kind:2,bodyModel:'char/monster/d_meca/dmeca.ini',name:'D-Meca',position:[256,0,512],heading:0};
 const snapshot={entities:[entity]};
 return {scene,view,snapshot};
}
function model(){
 const scene=new Group(),node=new Group();node.name='D-Meca';node.userData.nativeNpcVisible=true;
 node.add(new Mesh(new BoxGeometry(1,1,1),new MeshBasicMaterial()));
 scene.add(node);return {scene};
}
test('failed original monster load retries on later server snapshot and recovers visual instance',async()=>{
 const {scene,view,snapshot}=fixture();
 let attempts=0;
 view.loader.loadAsync=async()=>{attempts++;if(attempts===1)throw Error('transient asset failure');return model();};
 view.apply(snapshot);await wait();
 assert.equal(attempts,1);assert.equal(view.stats().rendered,0);
 assert.equal(view.errors.length,1);
 view.apply(snapshot);await wait();assert.equal(attempts,1,'no immediate retry storm');
 await new Promise(resolve=>setTimeout(resolve,1100));
 view.apply(snapshot);await wait();
 assert.equal(attempts,2);assert.equal(view.stats().rendered,1);
 assert.equal(scene.children.length,1);
 assert.equal(view.errors.length,0,'transient error clears on successful recovery');
 assert.deepEqual(scene.children[0].position.toArray(),[1,0,2]);
 view.dispose();assert.equal(scene.children.length,0);
});
test('no model request after entity view disposed',async()=>{
 const {view,snapshot}=fixture();
 let attempts=0;
 view.loader.loadAsync=async()=>{attempts++;return model();};
 view.dispose();view.apply(snapshot);await wait();
 assert.equal(attempts,0);
});
test('concurrent snapshots do not duplicate loads and late completion after dispose is discarded',async()=>{
 const {scene,view,snapshot}=fixture();
 let resolveLoad,attempts=0;
 view.loader.loadAsync=()=>{attempts++;return new Promise(resolve=>{resolveLoad=resolve;});};
 view.apply(snapshot);view.apply(snapshot);await wait();
 assert.equal(attempts,1);
 view.dispose();resolveLoad(model());await wait();
 assert.equal(scene.children.length,0);
 assert.equal(view.stats().rendered,0);
});
