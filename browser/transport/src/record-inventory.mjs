/** Read-only Win32 save projection. Caller binds the original record to its authenticated account. */
export const INVENTORY_LAYOUT=Object.freeze({dataOffset:1796,itemSize:556,infoOffset:16,infoSize:540,slots:100});
export function decodeItemBlock(input,offset=0){
 if(!(input instanceof Uint8Array)||!Number.isInteger(offset)||offset<0||offset+4>input.length)throw Error('Truncated inventory block');
 const v=new DataView(input.buffer,input.byteOffset,input.byteLength),size=v.getUint32(offset,true);
 if(size<5||size>1116||offset+size>input.length)throw Error('Invalid compressed inventory size');
 const out=new Uint8Array(556);let src=offset+4,dst=0;const end=offset+size;
 while(src<end){const token=input[src++],n=token&127;if(!n||dst+n>out.length)throw Error('Inventory expansion overflow');if(!(token&128)){if(src+n>end)throw Error('Truncated inventory literal');out.set(input.subarray(src,src+n),dst);src+=n;}dst+=n;}
 if(src!==end||dst!==out.length)throw Error('Incomplete inventory expansion');return {bytes:out,packedBytes:size};
}
function name(b,offset,length){const raw=b.subarray(offset,offset+length),n=raw.indexOf(0);if(n<1||raw.subarray(0,n).some(x=>x<32||x===127))throw Error('Invalid inventory item name');return new TextDecoder('windows-1252').decode(raw.subarray(0,n));}
export function decodeInventoryItem(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length!==556)throw Error('Wrong native inventory ABI');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),i=16;
 const slot=v.getInt32(0,true),x=v.getInt32(4,true),y=v.getInt32(8,true),position=v.getInt32(12,true),code=v.getUint32(i+24,true),head=v.getUint32(i+4,true),checksum=v.getUint32(i+16,true);
 if(slot<0||slot>=100||Math.abs(x)>10000||Math.abs(y)>10000||position< -1||position>64||!code)throw Error('Invalid inventory item identity/location');
 const potion=[0x04010000,0x04020000,0x04030000].includes((code&0xffff0000)>>>0),count=v.getInt32(i+72,true),weight=v.getInt32(i+60,true),price=v.getInt32(i+64,true),damage=[v.getInt16(i+100,true),v.getInt16(i+102,true)],defence=v.getInt32(i+124,true);
 const requirements=Object.fromEntries(['level','strength','spirit','talent','dexterity','health'].map((k,n)=>[k,v.getInt32(i+168+n*4,true)]));
 if(weight<0||price<0||count<0||count>10000000||damage.some(n=>n<0)||defence<0||Object.values(requirements).some(n=>n<0||n>100000))throw Error('Invalid inventory item values');
 return {slot,x,y,position,code,name:name(bytes,i+28,32),quantity:potion?count:1,potion,weight,price,damage,defence,requirements,durability:{current:v.getInt16(i+20,true),max:v.getInt16(i+22,true)},aging:v.getInt16(i+476,true),_identity:code+':'+head+':'+checksum};
}
export function decodeRecordInventory(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<1796)throw Error('Incomplete inventory record');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),throwCount=v.getInt32(1780,true),count=v.getInt32(1784,true),subStart=v.getInt32(1788,true),size=v.getInt32(1792,true);
 if(throwCount<0||throwCount>64||count<0||count>200||subStart<0||subStart>count||size<0||1796+size!==bytes.length)throw Error('Invalid inventory record bounds');
 const removed=new Set();for(let n=0;n<throwCount;n++){const p=1012+n*12;removed.add(v.getUint32(p,true)+':'+v.getUint32(p+4,true)+':'+v.getUint32(p+8,true));}
 const seen=new Set(),locations=new Set(),items=[];let p=1796,discarded=0;
 for(let n=0;n<count;n++){const block=decodeItemBlock(bytes,p);p+=block.packedBytes;const item=decodeInventoryItem(block.bytes),key=item._identity;delete item._identity;
  if(removed.has(key)||item.potion&&item.quantity===0||!item.potion&&seen.has(key)){discarded++;continue;}
  const bag=item.position===-1?2:n<subStart?0:1,location=bag+':'+item.slot;if(locations.has(location))throw Error('Duplicate inventory slot');locations.add(location);if(!item.potion)seen.add(key);items.push({...item,bag});
 }
 if(p!==bytes.length)throw Error('Trailing inventory payload');return {items,savedCount:count,discarded,readOnly:true,source:'gameserver-saved-record'};
}
export function decodeCharacterSheet(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<1796)throw Error('Incomplete character sheet');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),pair=p=>({current:v.getInt16(p,true),max:v.getInt16(p+2,true)}),savedMoney=v.getInt32(500,true),money=savedMoney>0?savedMoney-1:v.getInt32(340,true);
 const attributes=Object.fromEntries(['strength','spirit','talent','dexterity','health'].map((k,n)=>[k,v.getInt32(204+n*4,true)])),life=pair(308),mana=pair(312),stamina=pair(316),weight=pair(272),damage=[v.getInt32(232,true),v.getInt32(236,true)],defence=v.getInt32(252,true);
 if(money<0||Object.values(attributes).some(n=>n<0||n>1000000)||[life,mana,stamina,weight].some(q=>q.current<0||q.max<0)||damage.some(n=>n<0)||defence<0)throw Error('Invalid character sheet values');
 return {attributes,life,mana,stamina,weight,money,damage,defence,source:'gameserver-saved-record'};
}
