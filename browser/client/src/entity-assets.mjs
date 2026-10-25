const NPC_ASSETS=Object.freeze({
 "char/npc/tn-004/tn-004.ini":Object.freeze({"key":"npc-blacksmith","highNodes":["TN-003H"]}),
 "char/npc/teacher/teacher03.ini":Object.freeze({"key":"npc-mix","highNodes":[]}),
 "char/npc/enzo/enzo.ini":Object.freeze({"key":"npc-enzo","highNodes":[]}),
 "char/npc/tn-012/tn-012.ini":Object.freeze({"key":"npc-craftsman","highNodes":[]}),
 "char/npc/mn-007/mn-007.ini":Object.freeze({"key":"npc-moriph","highNodes":[]}),
 "char/npc/maskedwoman/maskedwoman.ini":Object.freeze({"key":"npc-beauty","highNodes":[]}),
 "char/npc/bcn03/bcn03.ini":Object.freeze({"key":"npc-stones","highNodes":[]}),
 "char/npc/tn-010/tn-010.ini":Object.freeze({"key":"npc-guard","highNodes":[]}),
 "char/npc/bcn05/bcn05.ini":Object.freeze({key:"npc-bcn05",highNodes:[]}),
 "char/npc/cashshop/cash.ini":Object.freeze({key:"npc-cash",highNodes:[]}),
 "char/npc/teacher/teacher02.ini":Object.freeze({key:"npc-teacher2",highNodes:[]}),
 "char/npc/tn-005/tn-005.ini":Object.freeze({key:"npc-tn005",highNodes:[]}),
 "char/npc/stella/stella.inx":Object.freeze({key:"npc-stella",highNodes:[]}),
 "char/monster/d_meca/dmeca.ini":Object.freeze({key:"npc-dmeca",highNodes:[]}),
});
// Exact native model path only; this never creates a monster or permits attacks.
// The same converted original asset is already used by the NPC of this model.
const MONSTER_ASSETS=Object.freeze({
 "char/monster/d_meca/dmeca.ini":NPC_ASSETS["char/monster/d_meca/dmeca.ini"]
});
export function resolveEntityAsset(entity){
 if(typeof entity?.bodyModel!=="string")return null;
 const catalog=entity.kind===1?NPC_ASSETS:entity.kind===2?MONSTER_ASSETS:null;
 if(!catalog)return null;
 const model=entity.bodyModel.replaceAll("\\","/").toLowerCase();
 return Object.prototype.hasOwnProperty.call(catalog,model)?catalog[model]:null;
}
