import test from 'node:test';import assert from 'node:assert/strict';import {resolveEntityAsset} from '../src/entity-assets.mjs';
test('only the exact supported original NPC path resolves',()=>{assert.equal(resolveEntityAsset({kind:1,bodyModel:'Char\\Npc\\TN-004\\TN-004.ini'}).key,'npc-blacksmith');assert.equal(resolveEntityAsset({kind:1,bodyModel:'CHAR/NPC/TN-004/TN-004.INI'}).key,'npc-blacksmith');});
test('unsupported entities never receive replacement models',()=>{for(const e of [null,{kind:2,bodyModel:'char/npc/tn-004/tn-004.ini'},{kind:3,bodyModel:'char/npc/tn-004/tn-004.ini'},{kind:1,bodyModel:'char/npc/unknown.ini'},{kind:1,bodyModel:'char/npc/../tn-004/tn-004.ini'},{kind:1,bodyModel:'/char/npc/tn-004/tn-004.ini'}])assert.equal(resolveEntityAsset(e),null);});

test("all converted Ricarten NPCs use exact original paths",()=>{
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"Char/Npc/tn-004/tn-004.ini"}).key,"npc-blacksmith");
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"Char/Npc/teacher/teacher03.ini"}).key,"npc-mix");
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"Char/Npc/enzo/enzo.ini"}).key,"npc-enzo");
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"Char/Npc/tn-012/tn-012.ini"}).key,"npc-craftsman");
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"Char/Npc/mn-007/mn-007.ini"}).key,"npc-moriph");
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"Char/Npc/maskedwoman/maskedwoman.ini"}).key,"npc-beauty");
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"Char/Npc/bcn03/bcn03.ini"}).key,"npc-stones");
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"Char/Npc/tn-010/tn-010.ini"}).key,"npc-guard");
});

test("additional original Ricarten NPC models resolve without replacing monsters",()=>{
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"char/npc/bcn05/bcn05.ini"}).key,"npc-bcn05");
 assert.equal(resolveEntityAsset({kind:2,bodyModel:"char/npc/bcn05/bcn05.ini"}),null);
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"char/npc/cashshop/cash.ini"}).key,"npc-cash");
 assert.equal(resolveEntityAsset({kind:2,bodyModel:"char/npc/cashshop/cash.ini"}),null);
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"char/npc/teacher/teacher02.ini"}).key,"npc-teacher2");
 assert.equal(resolveEntityAsset({kind:2,bodyModel:"char/npc/teacher/teacher02.ini"}),null);
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"char/npc/tn-005/tn-005.ini"}).key,"npc-tn005");
 assert.equal(resolveEntityAsset({kind:2,bodyModel:"char/npc/tn-005/tn-005.ini"}),null);
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"char/npc/stella/stella.inx"}).key,"npc-stella");
 assert.equal(resolveEntityAsset({kind:2,bodyModel:"char/npc/stella/stella.inx"}),null);
 assert.equal(resolveEntityAsset({kind:1,bodyModel:"char/monster/d_meca/dmeca.ini"}).key,"npc-dmeca");
 assert.equal(resolveEntityAsset({kind:2,bodyModel:"char/monster/d_meca/dmeca.ini"}).key,"npc-dmeca");
});

test("monster uses original model only for exact server-confirmed type and path",()=>{
 assert.equal(resolveEntityAsset({kind:2,bodyModel:"CHAR/MONSTER/D_MECA/DMECA.INI"}).key,"npc-dmeca");
 for(const e of [
  {kind:2,bodyModel:"char/npc/enzo/enzo.ini"},
  {kind:2,bodyModel:"char/monster/d_meca/../d_meca/dmeca.ini"},
  {kind:2,bodyModel:"/char/monster/d_meca/dmeca.ini"},
  {kind:2,bodyModel:"char/monster/d_meca/dmeca.inx"},
  {kind:3,bodyModel:"char/monster/d_meca/dmeca.ini"},
  {kind:2,bodyModel:null}
 ])assert.equal(resolveEntityAsset(e),null);
});
