/**
 * Read-only monster targeting from authoritative GameServer entity snapshots.
 * Selecting a monster NEVER sends an attack or modifies server state.
 * Health and distance are presented only when present in the native snapshot.
 */
export function monsterTarget(snapshot, serial, observerPosition) {
  if (!snapshot || !Array.isArray(snapshot.entities) ||
      !Number.isInteger(serial) || serial <= 0 ||
      !Array.isArray(observerPosition) || observerPosition.length !== 3 ||
      !observerPosition.every(Number.isFinite)) return null;
  const entity=snapshot.entities.find(e=>e.serial===serial&&e.kind===2);
  if (!entity || !Array.isArray(entity.position) || entity.position.length!==3 ||
      !entity.position.every(Number.isFinite) ||
      !Number.isInteger(entity.life) || !Number.isInteger(entity.maxLife) ||
      entity.life<0 || entity.maxLife<entity.life ||
      typeof entity.name!=='string' || !entity.name ||
      !Number.isInteger(entity.level) || entity.level<0) return null;
  const distance=Math.hypot((entity.position[0]-observerPosition[0])/256,
    (entity.position[2]-observerPosition[2])/256);
  if (!Number.isFinite(distance)) return null;
  return Object.freeze({
    serial:entity.serial,name:entity.name,level:entity.level,
    life:entity.life,maxLife:entity.maxLife,distance,
    healthPercent:entity.maxLife>0?Math.max(0,Math.min(100,entity.life/entity.maxLife*100)):null,
    source:'gameserver-entity-snapshot',sequence:snapshot.sequence
  });
}
export class NativeTargetPanel {
  constructor(container,{onClose=()=>{}}={}) {
    this.onClose=onClose;this.serial=null;this.snapshotData=null;
    this.root=document.createElement('aside');
    this.root.className='world-monster-target';
    this.root.hidden=true;
    this.root.setAttribute('aria-label','Alvo monstro confirmado pelo servidor');
    this.root.style.cssText='position:absolute;top:100px;left:18px;min-width:230px;max-width:min(330px,calc(100vw - 36px));padding:12px 14px;background:#121720ef;border:1px solid #a5874b;border-radius:7px;z-index:6;color:#f3dfb1;font:13px system-ui';
    const header=document.createElement('div');
    header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px';
    this.title=document.createElement('strong');
    this.closeButton=document.createElement('button');
    this.closeButton.type='button';this.closeButton.textContent='×';
    this.closeButton.setAttribute('aria-label','Desmarcar monstro');
    this.closeButton.style.cssText='cursor:pointer;background:transparent;color:inherit;border:0;font-size:21px';
    header.append(this.title,this.closeButton);
    this.info=document.createElement('p');
    this.info.style.cssText='margin:6px 0;font-size:12px';
    this.health=document.createElement('div');
    this.health.setAttribute('role','progressbar');
    this.health.setAttribute('aria-label','Vida confirmada do monstro');
    this.health.style.cssText='height:10px;background:#302527;border:1px solid #7d5e4c;border-radius:5px;overflow:hidden';
    this.fill=document.createElement('div');
    this.fill.style.cssText='height:100%;width:0;background:#bb5d4c;transition:width 120ms linear';
    this.health.append(this.fill);
    this.note=document.createElement('small');
    this.note.textContent='Alvo somente para consulta. Ataque ainda indisponível.';
    this.note.style.cssText='display:block;margin-top:8px;color:#c4b49a';
    this.root.append(header,this.info,this.health,this.note);
    container.append(this.root);
    this.closeButton.addEventListener('click',()=>this.clear(true));
  }
  select(snapshot,serial,position){
    const data=monsterTarget(snapshot,serial,position);
    if(!data)return false;
    this.serial=serial;this.render(data);return true;
  }
  update(snapshot,position){
    if(this.serial===null)return;
    const data=monsterTarget(snapshot,this.serial,position);
    if(!data){this.clear();return;}
    this.render(data);
  }
  render(data){
    this.snapshotData=data;
    this.root.hidden=false;
    this.title.textContent=data.name+' · Nível '+data.level;
    this.info.textContent='Distância: '+Math.round(data.distance)+' · Vida: '+
      (data.maxLife>0?data.life+' / '+data.maxLife:'não informada');
    this.health.hidden=data.healthPercent===null;
    if(data.healthPercent!==null){
      this.health.setAttribute('aria-valuemin','0');
      this.health.setAttribute('aria-valuemax',String(data.maxLife));
      this.health.setAttribute('aria-valuenow',String(data.life));
      this.fill.style.width=data.healthPercent.toFixed(2)+'%';
    } else this.health.removeAttribute('aria-valuenow');
  }
  clear(notify=false){
    this.serial=null;this.snapshotData=null;this.root.hidden=true;
    if(notify)this.onClose();
  }
  probe(){return this.snapshotData?{...this.snapshotData}:null;}
  dispose(){this.clear();this.root.remove();}
}
