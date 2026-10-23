/** Bounded decoder for private matrices sampled from the original SMB clips. */
export function decodeNativeMotion(input){
 const bytes=input instanceof ArrayBuffer?new Uint8Array(input):input;
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<80||bytes.byteLength>2*1024*1024)throw Error('Invalid motion size');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(v.getUint32(0,true)!==0x4e415450||v.getUint32(4,true)!==1)throw Error('Invalid motion format');
 const bones=v.getUint32(8,true),count=v.getUint32(12,true);
 if(bones!==64||count!==2)throw Error('Unsupported original skeleton');
 const clips=new Map();let offset=16+count*32;
 for(let i=0;i<count;i++){
  const p=16+i*32,name=new TextDecoder().decode(bytes.subarray(p,p+16)).replace(/\0.*$/,'');
  const frames=v.getUint32(p+16,true),fps=v.getFloat32(p+20,true),start=v.getInt32(p+24,true),end=v.getInt32(p+28,true);
  if(!['idle','walk'].includes(name)||clips.has(name)||frames<2||frames>240||!Number.isFinite(fps)||fps<1||fps>60||start<0||end<=start)throw Error('Invalid original motion clip');
  const length=frames*bones*16;if(offset+length*4>bytes.byteLength)throw Error('Truncated motion');
  const matrices=new Float32Array(length);
  for(let j=0;j<length;j++){const x=v.getFloat32(offset+j*4,true);if(!Number.isFinite(x)||Math.abs(x)>100000)throw Error('Invalid motion matrix');matrices[j]=x;}
  clips.set(name,{name,frames,fps,start,end,matrices});offset+=length*4;
 }
 if(offset!==bytes.byteLength||!clips.has('idle')||!clips.has('walk'))throw Error('Invalid motion payload');
 return {bones,clips};
}
export class NativeMotionPlayer{
 constructor(motion,models){
  this.motion=motion;this.groups=[];this.clip='idle';this.started=0;this.updates=0;
  for(const model of models){
   const bones=Array(motion.bones);let meshes=0;
   model.traverse(o=>{if(o.isBone&&/^PTBone_\d+$/.test(o.name)){const i=Number(o.name.slice(7));if(i>=motion.bones||bones[i])throw Error('Invalid original bone identity');bones[i]=o;o.matrixAutoUpdate=false;}
    if(o.isSkinnedMesh&&o.visible)meshes++;});
   if(bones.filter(Boolean).length!==motion.bones||meshes<1)throw Error('Original animated model incomplete');
   this.groups.push(bones);
  }
 }
 setMoving(moving,now){const name=moving?'walk':'idle';if(name!==this.clip){this.clip=name;this.started=now;}}
 update(now){
  const c=this.motion.clips.get(this.clip);if(!this.started)this.started=now;
  const sample=Math.max(0,(now-this.started)/1000*c.fps)%c.frames,a=Math.floor(sample),b=(a+1)%c.frames,t=sample-a;
  for(let i=0;i<this.motion.bones;i++)for(const bones of this.groups){
   const m=bones[i].matrix.elements,pa=(a*this.motion.bones+i)*16,pb=(b*this.motion.bones+i)*16;
   for(let j=0;j<16;j++)m[j]=c.matrices[pa+j]+(c.matrices[pb+j]-c.matrices[pa+j])*t;
   bones[i].matrixWorldNeedsUpdate=true;
  }
  this.updates++;
 }
 stats(){return {clip:this.clip,bones:this.motion.bones,models:this.groups.length,updates:this.updates};}
 probe(){return {...this.stats(),matrix:this.groups[0][Math.min(18,this.motion.bones-1)].matrix.elements.slice()};}
}
