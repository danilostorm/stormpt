import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {resolveCharacterBodyGLB} from './character-assets.mjs';
import {ServerPositionStream} from './authoritative-world.mjs';

/**
 * Render-only character presentation. It never creates game account state,
 * sends movement, awards stats or chooses an untrusted model fallback.
 * A future GameServer-authenticated adapter must call beginAuthenticatedWorld,
 * then ingest authoritative ticks. Do NOT wire to clicks/localStorage yet.
 */
export class OriginalCharacterView {
  constructor(world,{loader=new GLTFLoader(),followCamera=true}={}){
    if(!world?.scene || !world?.camera)throw new Error('Actual StormPT scene is required');
    this.world=world;this.loader=loader;
    this.followCamera=followCamera;
    this.positionStream=new ServerPositionStream();
    this.root=null;this.identity=null;this.sessionId=null;
    this.pending=0;this.lastCameraTarget=null;
    this.cameraOffset=new THREE.Vector3(0,5,11);
  }
  async beginAuthenticatedWorld({identity,serverSessionId,position,serverTick=0}){
    const asset=resolveCharacterBodyGLB(identity);
    if(!asset)throw new Error('Original body model not yet converted');
    if(!identity?.name || typeof identity.name!=='string')
      throw new Error('No verified character identity');
    // Render presentation alone cannot authenticate: the caller must be a
    // GameServer-authorized adapter, not a public input or synthetic fixture.
    if(typeof serverSessionId!=='string'||serverSessionId.length<16)
      throw new Error('GameServer-authorized session required');
    const gen=++this.pending;
    const gltf=await this.loader.loadAsync(asset);
    if(gen!==this.pending)return false;
    if(!gltf.scene)throw new Error('Original model has no scene');
    this.clearCharacter();
    this.root=gltf.scene;
    this.root.name='StormPT character: '+identity.name;
    this.identity={...identity};
    this.sessionId=serverSessionId;
    this.positionStream.beginSession({serverSessionId});
    const world=this.positionStream.ingest({serverSessionId,position,serverTick});
    this.root.position.set(...world);
    this.root.traverse(obj=>{
      if(!obj.isMesh)return;
      obj.frustumCulled=true;
      const mat=Array.isArray(obj.material)?obj.material:[obj.material];
      for(const m of mat)if(m?.map)m.map.colorSpace=THREE.SRGBColorSpace;
    });
    this.world.scene.add(this.root);
    return true;
  }
  updateAuthoritativePosition({serverSessionId,serverTick,position}){
    if(!this.root || serverSessionId!==this.sessionId)
      throw new Error('Character position without authorized world session');
    return this.positionStream.ingest({serverSessionId,serverTick,position});
  }
  renderFrame(now=performance.now()){
    if(!this.root)return;
    const location=this.positionStream.sample(now);
    if(!location)return;
    this.root.position.set(...location);
    if(this.followCamera){
      const p=this.root.position;
      const target=new THREE.Vector3(p.x,p.y+2,p.z);
      this.world.camera.position.copy(target).add(this.cameraOffset);
      this.world.camera.lookAt(target);
      this.lastCameraTarget=target;
    }
  }
  clearCharacter(){
    if(this.root)this.world.scene.remove(this.root);
    this.root=null;this.identity=null;this.sessionId=null;this.positionStream.reset();
  }
  dispose(){
    ++this.pending;
    this.clearCharacter();
  }
}
