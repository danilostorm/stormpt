export function radarPoint(observer,position,{radius=1000,size=128}={}){
 if(!Array.isArray(observer)||!Array.isArray(position)||observer.length!==3||position.length!==3||![...observer,...position,radius,size].every(Number.isFinite)||radius<=0||size<16)throw Error('Invalid radar coordinates');
 const x=(position[0]-observer[0])/256,z=(position[2]-observer[2])/256,distance=Math.hypot(x,z);
 return distance>radius?null:{x:size/2+x*(size/2-6)/radius,y:size/2+z*(size/2-6)/radius,distance};
}
export class NativeRadar{
 constructor(container,onSelect=()=>{}){
  this.onSelect=onSelect;
  this.container=document.createElement('aside');this.container.className='world-nearby';
  this.container.innerHTML='<button type="button" aria-expanded="false">Próximos</button><canvas width="128" height="128" aria-label="Radar de entidades próximas"></canvas><ul hidden></ul>';
  container.append(this.container);this.canvas=this.container.querySelector('canvas');this.list=this.container.querySelector('ul');this.button=this.container.querySelector('button');
  this.button.addEventListener('click',()=>{this.list.hidden=!this.list.hidden;this.button.setAttribute('aria-expanded',String(!this.list.hidden));if(this.last)this.update(this.last.entities,this.last.position);});
 }
 update(entities,position){
  this.last={entities,position};const ctx=this.canvas.getContext('2d');ctx.clearRect(0,0,128,128);ctx.fillStyle='#101a26e8';ctx.beginPath();ctx.arc(64,64,62,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#8b6a3b';ctx.stroke();ctx.fillStyle='#c3b18d';ctx.font='11px system-ui';ctx.fillText('N',60,13);
  const colors={1:'#e6bf62',2:'#e57070',3:'#79d3e0'},kinds={1:'NPC',2:'Monstro',3:'Jogador'},rows=[];
  for(const e of entities){const p=radarPoint(position,e.position);if(!p)continue;
   ctx.fillStyle=colors[e.kind];ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();rows.push({entity:e,distance:p.distance});
  }
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(64,64,3,0,Math.PI*2);ctx.fill();
  const label='Próximos ('+rows.length+')';if(this.button.textContent!==label)this.button.textContent=label;
  if(this.list.hidden)return;this.list.replaceChildren();
  rows.sort((a,b)=>a.distance-b.distance);
  for(const {entity:e,distance}of rows){const li=document.createElement('li');if(e.kind===1){const button=document.createElement('button');button.type='button';button.dataset.npcSerial=String(e.serial);button.textContent=e.name+' · '+Math.round(distance);button.addEventListener('click',()=>this.onSelect(e.serial));li.append(button);}else li.textContent=kinds[e.kind]+' · '+e.name+' · '+Math.round(distance);this.list.append(li);}
 }
 dispose(){this.container.remove();}
}
