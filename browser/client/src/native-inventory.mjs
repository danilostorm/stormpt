const number=n=>new Intl.NumberFormat('pt-BR').format(n);
export function itemSummary(item){if(!item||typeof item.name!=='string'||!Number.isInteger(item.quantity)||item.quantity<1)throw Error('Invalid inventory presentation');return item.name+(item.quantity>1?' × '+number(item.quantity):'');}
/**
 * Numeric requirements taken from the original GameServer saved character
 * record. This does NOT certify class restrictions or permission to equip.
 */
export function itemRequirementRows(item,sheet,level){
 const requirements=item?.requirements,attrs=sheet?.attributes;
 if(!requirements||!attrs||!Number.isSafeInteger(level)||level<0)
  throw Error('Invalid item requirement record');
 const definitions=[
  ['level','Nível',level],
  ['strength','Força',attrs.strength],
  ['spirit','Inteligência',attrs.spirit],
  ['talent','Talento',attrs.talent],
  ['dexterity','Agilidade',attrs.dexterity],
  ['health','Vitalidade',attrs.health]
 ];
 return definitions.filter(([key,,actual])=>{
  const required=requirements[key];
  if(!Number.isSafeInteger(required)||required<0||required>100000||
     !Number.isSafeInteger(actual)||actual<0||actual>1000000)
   throw Error('Invalid item requirement values');
  return required>0;
 }).map(([key,label,actual])=>Object.freeze({
  key,label,required:requirements[key],actual,meets:actual>=requirements[key]
 }));
}
export function itemRecordedPrice(item){
 if(!Number.isSafeInteger(item?.price)||item.price<0||item.price>2147483647)
  throw Error('Invalid original item price');
 return number(item.price);
}
export class NativeInventoryPanel{
 constructor(container,{inventory,sheet,name,level,onOpen=()=>{},onClose=()=>{}}){
  if(!inventory?.readOnly||!sheet)throw Error('Inventário do servidor indisponível.');this.inventory=inventory;this.sheet=sheet;this.onOpen=onOpen;this.onClose=onClose;this.bag=0;this.level=level;
  this.button=document.createElement('button');this.button.type='button';this.button.className='world-inventory-toggle';this.button.textContent='Inventário · I';this.button.setAttribute('aria-expanded','false');this.button.style.cssText='position:absolute;right:18px;bottom:174px;padding:10px 16px;background:#171e29;color:#f3dfb1;border:1px solid #a5874b;border-radius:5px;cursor:pointer';
  this.panel=document.createElement('aside');this.panel.className='world-inventory';this.panel.hidden=true;this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-label','Inventário do personagem');this.panel.style.cssText='position:absolute;right:18px;top:18px;width:min(360px,calc(100vw - 36px));max-height:calc(100vh - 36px);overflow:auto;box-sizing:border-box;padding:18px;background:#121720f7;border:1px solid #b29355;border-radius:8px;z-index:6';
  this.panel.innerHTML='<button type="button" class="inventory-close" style="float:right" aria-label="Fechar inventário">×</button><h2 style="margin:0 0 8px">Inventário</h2><p class="inventory-identity"></p><p class="inventory-resources"></p><p class="inventory-money"></p><details><summary>Atributos</summary><dl class="inventory-attributes"></dl></details><nav class="inventory-bags" aria-label="Mochilas" style="display:flex;gap:6px;margin:16px 0"></nav><ul class="inventory-items" style="list-style:none;padding:0"></ul><section class="inventory-detail" hidden style="border-top:1px solid #8b6a3b;padding-top:12px"></section><small style="color:#c3b18d">Consulta de itens e atributos</small>';
  container.append(this.button,this.panel);this.button.addEventListener('click',()=>this.toggle());this.panel.querySelector('.inventory-close').addEventListener('click',()=>this.close());this.panel.addEventListener('keydown',e=>{if(e.code==='Escape'||e.code==='KeyI'&&!e.repeat){e.preventDefault();this.close();}});
  this.panel.querySelector('.inventory-identity').textContent=name+' · Nível '+level;
  this.panel.querySelector('.inventory-resources').textContent='Vida '+sheet.life.current+'/'+sheet.life.max+' · Mana '+sheet.mana.current+'/'+sheet.mana.max+' · Fôlego '+sheet.stamina.current+'/'+sheet.stamina.max;
  this.panel.querySelector('.inventory-money').textContent='Ouro: '+number(sheet.money)+' · Peso: '+sheet.weight.current+'/'+sheet.weight.max;
  const labels={strength:'Força',spirit:'Inteligência',talent:'Talento',dexterity:'Agilidade',health:'Vitalidade'};const dl=this.panel.querySelector('dl');for(const [key,label]of Object.entries(labels)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=number(sheet.attributes[key]);dl.append(dt,dd);}const attack=document.createElement('p');attack.textContent='Dano '+sheet.damage.join('–')+' · Defesa '+number(sheet.defence);dl.after(attack);
  for(const [bag,label]of [[0,'Mochila I'],[1,'Mochila II'],[2,'Selecionado']]){if(bag===2&&!inventory.items.some(i=>i.bag===2))continue;const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.bag=String(bag);b.addEventListener('click',()=>{this.bag=bag;this.render();});this.panel.querySelector('nav').append(b);}
  this.render();
 }
 render(){const list=this.panel.querySelector('ul');list.replaceChildren();this.panel.querySelector('.inventory-detail').hidden=true;for(const b of this.panel.querySelectorAll('[data-bag]'))b.setAttribute('aria-pressed',String(Number(b.dataset.bag)===this.bag));const items=this.inventory.items.filter(i=>i.bag===this.bag);if(!items.length){const li=document.createElement('li');li.textContent='Esta mochila está vazia.';list.append(li);}for(const item of items){const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=itemSummary(item);b.style.cssText='width:100%;text-align:left;padding:9px;margin:3px 0;background:#222c39;color:#f3dfb1;border:1px solid #615237;border-radius:4px';b.addEventListener('click',()=>this.details(item));li.append(b);list.append(li);}}
 details(item){
  const box=this.panel.querySelector('.inventory-detail');box.replaceChildren();
  const title=document.createElement('strong'),line=document.createElement('p'),
    price=document.createElement('p'),heading=document.createElement('strong'),
    requirements=document.createElement('ul'),note=document.createElement('small');
  title.textContent=itemSummary(item);
  line.textContent='Dano '+item.damage.join('–')+' · Defesa '+number(item.defence)+
    ' · Peso '+number(item.weight)+' · Durabilidade '+
    item.durability.current+'/'+item.durability.max+
    (item.aging>0?' · Aging +'+item.aging:'');
  price.textContent='Preço registrado no item: '+itemRecordedPrice(item)+
    ' ouro · Slot '+item.slot;
  heading.textContent='Requisitos registrados no item';
  requirements.style.cssText='list-style:none;padding:0;margin:6px 0 12px';
  const rows=itemRequirementRows(item,this.sheet,this.level);
  if(!rows.length){
   const li=document.createElement('li');li.textContent='Nenhum requisito numérico informado.';
   requirements.append(li);
  }
  for(const row of rows){
   const li=document.createElement('li');
   li.textContent=(row.meets?'✓ ':'✕ ')+row.label+': '+number(row.required)+
     ' (personagem: '+number(row.actual)+')';
   li.style.color=row.meets?'#b5dbac':'#f2b8a8';
   requirements.append(li);
  }
  note.textContent='Consulta do registro original. Não verifica restrições de classe, não equipa e não altera itens.';
  box.append(title,line,price,heading,requirements,note);box.hidden=false;
 }
 toggle(){if(this.panel.hidden){this.onOpen();this.panel.hidden=false;this.button.setAttribute('aria-expanded','true');this.panel.querySelector('.inventory-close').focus();}else this.close();}
 close(){this.panel.hidden=true;this.button.setAttribute('aria-expanded','false');this.button.focus();this.onClose();}
 dispose(){this.panel.remove();this.button.remove();}
}
