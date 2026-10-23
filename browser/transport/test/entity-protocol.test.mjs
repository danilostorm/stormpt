import test from 'node:test';import assert from 'node:assert/strict';import {ENTITIES,decodeEntitySnapshot} from '../src/entity-protocol.mjs';
function packet(count=1){
 const b=Buffer.alloc(32+count*204);for(const[o,v]of [[0,b.length],[4,ENTITIES.opcode],[8,1],[12,1234],[16,1],[20,1000],[24,3],[28,count]])b.writeUInt32LE(v,o);
 for(let i=0;i<count;i++){const p=32+i*204;for(const[o,v]of [[0,42+i],[4,1],[8,64],[12,2048],[16,-1047*256],[20,205*256],[24,-16973*256],[28,100],[32,100],[36,1],[40,0]])b.writeInt32LE(v,p+o);b.write('Ferreiro',p+44);b.write('char\\npc\\metal.ini',p+76);}return b;
}
test('entity snapshots carry actual bounded positions and original model references',()=>{const r=decodeEntitySnapshot(packet(),{expectedObserver:1234});assert.equal(r.entities[0].name,'Ferreiro');assert.equal(r.entities[0].kind,1);assert.equal(r.entities[0].position[0],-1047*256);assert.equal(decodeEntitySnapshot(packet(0)).entities.length,0);assert.equal(decodeEntitySnapshot(packet(32)).entities.length,32);});
test('entity identity, length, duplicates and client asset paths fail closed',()=>{
 assert.throws(()=>decodeEntitySnapshot(packet(),{expectedObserver:99}));
 for(const[o,v]of [[8,2],[12,0],[16,0],[24,4],[28,33],[32,1234],[36,8],[44,4096],[60,-1],[64,50],[68,100001],[72,-1]]){const b=packet();b.writeInt32LE(v,o);assert.throws(()=>decodeEntitySnapshot(b));}
 const duplicate=packet(2);duplicate.writeUInt32LE(42,236);assert.throws(()=>decodeEntitySnapshot(duplicate));
 const path=packet();path.fill(0,108,172);path.write('char/../secret.ini',108);assert.throws(()=>decodeEntitySnapshot(path));
 assert.throws(()=>decodeEntitySnapshot(packet().subarray(0,200)));
});
test('entity names preserve original Windows-1252 accents without HTML decoding',()=>{const b=packet();b.fill(0,76,108);b.write('Com\xe9rcio <NPC>',76,'latin1');const r=decodeEntitySnapshot(b);assert.equal(r.entities[0].name,'Comércio <NPC>');b[107]=1;assert.throws(()=>decodeEntitySnapshot(b));});
