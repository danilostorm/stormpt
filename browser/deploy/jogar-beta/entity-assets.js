export function resolveEntityAsset(entity){
 if(entity?.kind!==1||typeof entity.bodyModel!=='string')return null;
 const model=entity.bodyModel.replaceAll('\\','/').toLowerCase();
 if(model==='char/npc/tn-004/tn-004.ini')return {key:'npc-blacksmith',highNodes:['TN-003H']};
 return null;
}
