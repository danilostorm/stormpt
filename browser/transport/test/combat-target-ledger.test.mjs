import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatTargetLedger} from '../src/combat-target-ledger.mjs';
import {GameLoginGuard} from '../src/game-login-guard.mjs';
import {ENTITIES} from '../src/entity-protocol.mjs';
import {encodeBasicAttackIntent} from '../src/combat-intent.mjs';
import {encodeWebLoginPacket,encodeWebCharacterSelection} from '../src/web-login.mjs';
import {WORLD,encodeWorldJoin} from '../src/world-protocol.mjs';

const monster=(serial=88,life=50)=>({serial,kind:2,life,maxLife:100,position:[256,0,512]});
const npc={serial:89,kind:1,life:100,maxLife:100,position:[0,0,0]};
const player={serial:90,kind:3,life:100,maxLife:100,position:[0,0,0]};
const snapshot=(sequence,entities=[monster()],field=4)=>({
  observer:1234,field,sequence,tick:sequence*100,entities,
});

test('ledger accepts only live GameServer monsters and expires without polling',()=>{
  let now=1000;
  const ledger=new CombatTargetLedger({observer:1234,field:4,now:()=>now,ttlMs:1000});
  ledger.accept(snapshot(1,[monster(),npc,player,monster(91,0)]));
  assert.equal(ledger.lookup(88)?.life,50);
  assert.equal(ledger.lookup(89),null);
  assert.equal(ledger.lookup(90),null);
  assert.equal(ledger.lookup(91),null);
  assert.equal(ledger.lookup(1234),null);
  assert.equal(ledger.lookup('88'),null);
  assert(Object.isFrozen(ledger.lookup(88)));
  assert(Object.isFrozen(ledger.lookup(88).position));
  now=2000;assert.equal(ledger.lookup(88)?.serial,88);
  now=2001;assert.equal(ledger.lookup(88),null);
  ledger.accept(snapshot(2,[monster(88,25)]));
  assert.equal(ledger.lookup(88)?.life,25);
  ledger.accept(snapshot(3,[]));
  assert.equal(ledger.lookup(88),null);
  ledger.close();
  assert.equal(ledger.lookup(88),null);
  assert.throws(()=>ledger.accept(snapshot(4)),/closed/);
});

test('ledger rejects replay, foreign map/observer, duplicate serial and invalid rows atomically',()=>{
  let now=100;
  const ledger=new CombatTargetLedger({observer:1234,field:4,now:()=>now});
  ledger.accept(snapshot(1));
  for(const bad of [
    snapshot(1),snapshot(3),snapshot(2,[monster()],3),
    {...snapshot(2),observer:999},
    {...snapshot(2),tick:NaN},
    snapshot(2,[monster(),monster()]),
    snapshot(2,[{...monster(),position:[NaN,0,0]}]),
    snapshot(2,[{...monster(),life:-1}]),
    snapshot(2,[{...monster(),kind:99}]),
    snapshot(2,[{...monster(),serial:1234}]),
  ]) assert.throws(()=>ledger.accept(bad));
  assert.equal(ledger.lookup(88)?.sequence,1);
  ledger.accept(snapshot(2,[monster(92)]));
  assert.equal(ledger.lookup(88),null);
  assert.equal(ledger.lookup(92)?.sequence,2);
  now=0;assert.equal(ledger.lookup(92),null); // backwards clock fails closed
});

test('ledger rejects invalid trusted configuration',()=>{
  for(const observer of [0,-1,'1234'])assert.throws(()=>new CombatTargetLedger({observer,field:4}));
  for(const field of [-1,256,3.5])assert.throws(()=>new CombatTargetLedger({observer:1234,field}));
  for(const ttlMs of [0,10_001,NaN])assert.throws(()=>new CombatTargetLedger({observer:1234,field:4,ttlMs}));
});

const account='Webqatest',sid='a'.repeat(32);
function selected(field=4){
  const claims={aud:'stormpt-gameserver',account,exp:Math.floor(Date.now()/1000)+45,
    nonce:'AAECAwQFBgcICQoLDA0ODw',sid};
  const gameTicket=Buffer.from(JSON.stringify(claims)).toString('base64url')+'.'+'a'.repeat(43);
  const g=new GameLoginGuard({account,sessionBinding:sid,allowNativeWebLogin:true});
  g.onClient(encodeWebLoginPacket({gameTicket,expectedAccount:account}));
  const list=Buffer.alloc(2676);
  list.writeInt32LE(2676,0);list.writeInt32LE(9,4);list.write(account,8);
  list.writeInt32LE(1,32);list.write('WebHero',36);list.write('body.ini',68);
  list.write('head.inf',132);list.writeInt32LE(1,196);list.writeInt32LE(1,200);
  g.onServer(list);g.onClient(encodeWebCharacterSelection({characterName:'WebHero'}));
  const b=Buffer.alloc(1796);
  b.writeInt32LE(1796,0);b.writeInt32LE(4,4);b.write('RC 1.50',8);
  b.write('WebHero',16);b.write('body.ini',48);b.write('head.inf',112);
  b.writeUInt32LE(1234,176);b.writeInt32LE(1,196);b.writeInt32LE(1,200);
  b.writeInt32LE(150,480);b.writeInt32LE(field,484);
  b.writeInt32LE(-1047*256,492);b.writeInt32LE(-16973*256,496);
  b.write(account,748);
  const record=Buffer.alloc(b.length+32);
  record.writeInt32LE(record.length,0);record.writeInt32LE(4,4);
  record.writeInt32LE(b.length,16);b.copy(record,20);
  g.onServer(record);g.onClient(encodeWorldJoin({serial:1234}));
  const world=Buffer.alloc(80);
  for(const[o,v]of [[0,80],[4,WORLD.state],[8,1],[12,1234],[16,0],
    [20,1000],[24,field],[28,-1047*256],[32,205*256],[36,-16973*256]])
    world.writeInt32LE(v,o);
  world.write('WebHero',48);g.onServer(world);
  return g;
}
function entityFrame(sequence,kind=2,field=4,life=50){
  const b=Buffer.alloc(ENTITIES.header+ENTITIES.row);
  for(const[o,v]of [[0,b.length],[4,ENTITIES.opcode],[8,1],[12,1234],
    [16,sequence],[20,sequence*100],[24,field],[28,1]])b.writeUInt32LE(v,o);
  const p=ENTITIES.header;
  for(const[o,v]of [[0,88],[4,kind],[8,0],[12,0],[16,256],[20,0],
    [24,512],[28,life],[32,100],[36,1],[40,0]])b.writeInt32LE(v,p+o);
  b.write('MonsterQA',p+44);b.write('char/monster/d_meca/dmeca.ini',p+76);
  return b;
}
test('authenticated guard learns a live monster only from native server frames; attack stays denied',()=>{
  const g=selected();
  assert.equal(g.getServerMonster(88),null);
  assert.throws(()=>g.onServer(entityFrame(1,2,3)),/identity\/size mismatch/);
  assert.equal(g.getServerMonster(88),null);
  g.onServer(entityFrame(1));
  assert.equal(g.getServerMonster(88)?.field,4);
  assert.equal(g.getServerMonster(88)?.life,50);
  assert.throws(()=>g.onClient(encodeBasicAttackIntent({sequence:1,target:88})),/not implemented/);
  g.onServer(entityFrame(2,1));
  assert.equal(g.getServerMonster(88),null);
  g.onServer(entityFrame(3,2,4,0));
  assert.equal(g.getServerMonster(88),null);
  g.close();assert.equal(g.getServerMonster(88),null);
});
