import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {resolveEntityAsset} from './entity-assets.js';
/** Original supported assets only. Unconverted entities remain on the live radar. */
export class NativeEntityView{
 constructor(scene){this.scene=scene;this.loader=new GLTFLoader();this.assets=new Map();this.instances=new Map();this.snapshot=null;this.errors=[];this.disposed=false;}
 load(asset){
  if(this.assets.has(asset.key))return;
  const slot={template:null};this.assets.set(asset.key,slot);
  this.loader.loadAsync('/BrowserAssets.ashx?asset='+asset.key).then(gltf=>{
   for(const node of gltf.scene.children)node.visible=asset.highNodes.includes(node.name);
   let meshes=0;gltf.scene.traverse(o=>{if(o.isMesh&&o.visible&&o.parent.visible)meshes++;});
   if(!meshes){this.disposeAsset(gltf.scene);throw Error('Original NPC mesh missing');}
   if(this.disposed){this.disposeAsset(gltf.scene);return;}
   slot.template=gltf.scene;this.refresh();
  }).catch(()=>{if(!this.disposed)this.errors.push('Original NPC asset unavailable');});
 }
 apply(snapshot){this.snapshot=snapshot;this.refresh();}
 refresh(){
  if(this.disposed||!this.snapshot)return;
  const visible=new Set();
  for(const entity of this.snapshot.entities){
   const asset=resolveEntityAsset(entity);if(!asset)continue;
   visible.add(entity.serial);this.load(asset);
   const template=this.assets.get(asset.key)?.template;if(!template)continue;
   let instance=this.instances.get(entity.serial);
   if(instance&&instance.asset!==asset.key){this.scene.remove(instance.root);this.instances.delete(entity.serial);instance=null;}
   if(!instance){instance={root:template.clone(true),asset:asset.key,entity};this.instances.set(entity.serial,instance);this.scene.add(instance.root);}
   instance.entity=entity;instance.root.position.set(entity.position[0]/256,entity.position[1]/256,entity.position[2]/256);instance.root.rotation.y=entity.heading*Math.PI*2/4096;
  }
  for(const [serial,instance]of this.instances)if(!visible.has(serial)){this.scene.remove(instance.root);this.instances.delete(serial);}
 }
 stats(){return {rendered:this.instances.size,unsupported:this.snapshot?this.snapshot.entities.filter(e=>!resolveEntityAsset(e)).length:0,errors:this.errors.slice(),
  models:[...this.instances].map(([serial,i])=>{let triangles=0,meshes=0,texturedMeshes=0;i.root.traverseVisible(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(o.material.map)texturedMeshes++;}});return {serial,name:i.entity.name,asset:i.asset,position:i.root.position.toArray(),triangles,meshes,texturedMeshes,pose:'original-first-idle-frame',animated:false};})};}
 disposeAsset(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);if(m.map)textures.add(m.map);}});textures.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());geometries.forEach(x=>x.dispose());}
 dispose(){if(this.disposed)return;this.disposed=true;for(const i of this.instances.values())this.scene.remove(i.root);this.instances.clear();for(const slot of this.assets.values())if(slot.template)this.disposeAsset(slot.template);this.assets.clear();}
}
