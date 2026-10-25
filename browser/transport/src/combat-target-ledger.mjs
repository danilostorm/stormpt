/**
 * Read-only, fail-closed ledger of living monsters seen in native GameServer
 * entity snapshots. This NEVER authorizes or emits an attack. The future
 * Windows combat handler must independently resolve the serial, ownership,
 * map, range, life and native damage/loot rules under the server's locks.
 *
 * Snapshots may contain only part of the visible world. Replacing the ledger
 * on each snapshot deliberately favors false negatives over stale targets.
 */
const validSerial = n => Number.isInteger(n) && n > 0 && n <= 0xffffffff;
const validField = n => Number.isInteger(n) && n >= 0 && n <= 255;
export class CombatTargetLedger {
  #observer;
  #field;
  #now;
  #ttlMs;
  #sequence = 0;
  #targets = new Map();
  #closed = false;

  constructor({observer,field,now=()=>Date.now(),ttlMs=2000}={}) {
    if (!validSerial(observer) || !validField(field) ||
        typeof now !== 'function' || !Number.isInteger(ttlMs) ||
        ttlMs < 100 || ttlMs > 10_000)
      throw new RangeError('Invalid trusted combat ledger configuration');
    this.#observer=observer;
    this.#field=field;
    this.#now=now;
    this.#ttlMs=ttlMs;
  }

  accept(snapshot) {
    if (this.#closed) throw Error('Combat ledger closed');
    if (!snapshot || snapshot.observer!==this.#observer ||
        snapshot.field!==this.#field || !Number.isInteger(snapshot.sequence) ||
        !Number.isInteger(snapshot.tick) || snapshot.tick<0 || snapshot.tick>0xffffffff ||
        snapshot.sequence!==this.#sequence+1 || !Array.isArray(snapshot.entities) ||
        snapshot.entities.length>32)
      throw Error('Untrusted or out-of-sequence GameServer monster snapshot');

    const next = new Map();
    const seen = new Set();
    const at=this.#now();
    if (!Number.isFinite(at)) throw Error('Invalid monotonic observation time');
    for (const e of snapshot.entities) {
      if (!e || !validSerial(e.serial) || e.serial===this.#observer ||
          seen.has(e.serial) || ![1,2,3].includes(e.kind) ||
          !Number.isInteger(e.life) || !Number.isInteger(e.maxLife) ||
          e.life<0 || e.maxLife<e.life ||
          !Array.isArray(e.position) || e.position.length!==3 ||
          e.position.some(n=>!Number.isInteger(n) || Math.abs(n)>25_600_000))
        throw Error('Invalid GameServer entity in combat ledger');
      seen.add(e.serial);
      if (e.kind!==2 || e.life===0) continue;
      next.set(e.serial,Object.freeze({
        serial:e.serial, field:this.#field, life:e.life,maxLife:e.maxLife,
        position:Object.freeze([...e.position]), sequence:snapshot.sequence,
        tick:snapshot.tick, observedAt:at,
      }));
    }
    // Commit atomically only after every row has passed validation.
    this.#targets=next;
    this.#sequence=snapshot.sequence;
  }

  lookup(serial) {
    if (this.#closed || !validSerial(serial)) return null;
    const target=this.#targets.get(serial);
    if (!target) return null;
    const age=this.#now()-target.observedAt;
    return Number.isFinite(age) && age>=0 && age<=this.#ttlMs ? target : null;
  }

  close() {
    this.#closed=true;
    this.#targets.clear();
  }
}
