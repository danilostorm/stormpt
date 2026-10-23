/**
 * Read-only protocol observer for one ALREADY-AUTHENTICATED game session.
 * No credentials or login bypass. Caller must prove its expectedAccount
 * using a trusted server-side authentication mechanism not yet implemented.
 */
import { inspectPacket } from './packets.mjs';
import { decodeCharacterList } from './character-list.mjs';
import { RecordAssembler } from './record-fragments.mjs';
import { decodeRecordIdentity } from './record-identity.mjs';

export class CharacterSessionObserver {
  constructor({expectedAccount, onEvent=()=>{}}) {
    if (typeof expectedAccount !== 'string' || expectedAccount.length < 1 ||
        expectedAccount.length > 20 || typeof onEvent !== 'function')
      throw new Error('Expected trusted account and callback');
    this.expectedAccount=expectedAccount;
    this.onEvent=onEvent;
    this.reset();
  }
  reset() {
    this.characterList=null;
    this.selectedName=null;
    this.recordAssembler=new RecordAssembler();
    this.phase='waiting-for-character-list';
  }
  selectCharacter(name) {
    if (this.phase!=='character-list-ready' || !this.characterList)
      throw new Error('Character list not received');
    if (typeof name !== 'string' ||
        !this.characterList.characters.some(x=>x.name===name))
      throw new Error('Character not in authenticated account');
    this.selectedName=name;
    this.recordAssembler.reset();
    this.phase='waiting-for-character-record';
    this.onEvent({type:'selection-requested',name});
    // No game command is sent: the original client selection packet
    // still needs to be identified and implemented safely.
  }
  accept(packet) {
    const buf = packet instanceof Uint8Array ? packet :
      packet instanceof ArrayBuffer ? new Uint8Array(packet) : null;
    if (!buf) throw new TypeError('Expected binary packet');
    const {opcode}=inspectPacket(buf);
    if (opcode===9) {
      const list=decodeCharacterList(buf,{expectedAccount:this.expectedAccount});
      this.characterList=list;
      this.selectedName=null;
      this.recordAssembler.reset();
      this.phase='character-list-ready';
      this.onEvent({type:'character-list',list});
      return 'character-list';
    }
    if (opcode===4) {
      if (this.phase!=='waiting-for-character-record') return 'ignored-record';
      const bytes=this.recordAssembler.feed(buf);
      if (!bytes) return 'partial-record';
      const identity=decodeRecordIdentity(bytes);
      if (identity.name!==this.selectedName) {
        this.phase='character-list-ready';
        this.selectedName=null;
        throw new Error('Character record does not match selected character');
      }
      this.phase='character-record-ready';
      this.onEvent({type:'character-record',identity,record:bytes});
      return 'character-record';
    }
    return 'unhandled';
  }
}
