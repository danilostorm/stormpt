import {NPC,decodeNpcRequest,decodeNpcReply} from './npc-protocol.mjs';
import {ENTITIES,decodeEntitySnapshot} from './entity-protocol.mjs';
import {WORLD,decodeWorldJoin,decodeMoveIntent,decodeWorldSnapshot} from './world-protocol.mjs';
import {RecordAssembler} from './record-fragments.mjs';
import {decodeRecordWorld} from './record-world.mjs';
import {decodeCharacterCreation} from './character-creation.mjs';
/**
 * State-sensitive frame guard for an account-bound StormPT websocket.
 * Layouts are from the original 32-bit Windows C++ client:
 *  smPacket.h: opcode 8 (LoginPacket, 400 bytes), opcode 9 (TRANS_USERCHAR_INFO),
 *  opcode 5 (smTRANS_CHAR_COMMAND selection, 52 bytes).
 *
 * IMPORTANT: this guard is NOT GameServer authentication! It denies accidental
 * cross-account spoofing and unsequenced selection. The original GameServer
 * remains authoritative for account passwords, session, checksum and gameplay.
 * Never synthesize a successful login or fabricate a character list.
 */
import {decodeWebLoginPacket,WEB_LOGIN} from './web-login.mjs';
import {inspectPacket} from './packets.mjs';
import {decodeCharacterList} from './character-list.mjs';
import {CHAT_OPCODE,validateClientChatFrame,ChatSendThrottle} from './chat-protocol.mjs';
import {CombatTargetLedger} from './combat-target-ledger.mjs';

const LOGIN_SIZE=400;
const SELECT_SIZE=52;
function cstrAscii(packet,offset,length){
  const bytes=packet.subarray(offset,offset+length);
  if(bytes.length!==length)throw new RangeError('Truncated string');
  const nul=bytes.indexOf(0);
  if(nul<0)throw new RangeError('Unterminated string');
  const text=bytes.subarray(0,nul);
  if(text.some(c=>c<32||c>126))throw new RangeError('Invalid ASCII');
  return Buffer.from(text).toString('ascii');
}
function cstrName(packet,offset,length){
  const bytes=packet.subarray(offset,offset+length);
  if(bytes.length!==length)throw new RangeError('Truncated character name');
  const nul=bytes.indexOf(0);
  if(nul<=0)throw new RangeError('Invalid character name');
  const text=bytes.subarray(0,nul);
  if(text.some(c=>c<32||c===127))throw new RangeError('Invalid character name');
  return new TextDecoder('windows-1252').decode(text);
}
export class GameLoginGuard {
  #npcSequence=0;#npcPending=null;
  #chatThrottle;
  #account;
  #state='awaiting-login';
  #names=new Set();
  #selectedName=null;
  #creatingName=null;
  #recordAssembler=new RecordAssembler();
  #serial=0;
  #combatTargets=null;
  #worldField=3; // Overwritten only by the authenticated native character record.
  #sentSequence=0;
  #ackSequence=-1;
  #entitySequence=0;
  #now;
  #loginAt=0;
  #nativeEnabled=false;
  #sid;
  #nativeLogin=false;
  #loginTimeoutMs;
  constructor({account,now=()=>Date.now(),loginTimeoutMs=15000,allowNativeWebLogin=false,sessionBinding}={}){
    if(typeof account!=='string'||!/^[A-Za-z][A-Za-z0-9_]{3,15}$/.test(account))
      throw new TypeError('Trusted site account required');
    if(typeof now!=='function'||!Number.isInteger(loginTimeoutMs)||
       loginTimeoutMs<1000||loginTimeoutMs>60000)throw new RangeError('Invalid timeout');
    if(allowNativeWebLogin && !/^[0-9a-f]{32}$/.test(sessionBinding))throw Error('Native login requires site session binding');
    this.#nativeEnabled=allowNativeWebLogin;
    this.#sid=sessionBinding;
    this.#account=account;
    this.#now=now;
    this.#loginTimeoutMs=loginTimeoutMs;
    this.#loginAt=this.#now();
    this.#chatThrottle=new ChatSendThrottle({now:this.#now});
  }
  get phase(){return this.#state}
  get boundAccount(){return this.#account}
  get characterNames(){return [...this.#names]}
  get selectedCharacter(){return this.#selectedName}
  // Read-only internal inspection; no browser packet or attack authorization.
  getServerMonster(serial){
    return this.#state==='native-world-active' ? this.#combatTargets?.lookup(serial) ?? null : null;
  }
  checkDeadline(){
    if(this.#state==='closed')throw Error('Transport already closed');
    if((this.#state==='awaiting-login'||this.#state==='awaiting-character-list') &&
       this.#now()-this.#loginAt>this.#loginTimeoutMs){
      this.close();
      throw Error('Timed out waiting for GameServer account response');
    }
  }
  onClient(packet){
    this.checkDeadline();
    const {opcode,length}=inspectPacket(packet);
    if(this.#state==='awaiting-login'){
      if(this.#nativeEnabled && opcode===8 && length===WEB_LOGIN.size){
        decodeWebLoginPacket(packet,{expectedAccount:this.#account,expectedSid:this.#sid});
        this.#nativeLogin=true;
        this.#state='awaiting-character-list';
        this.#loginAt=this.#now();
        return;
      }
      // Native QA sessions MUST NOT fall back to the desktop login path:
      // the legacy branch allows arbitrary post-login native opcodes.
      // A signed browser ticket is not authorization to use that protocol.
      if(this.#nativeEnabled)
        throw Error('Legacy desktop login disabled for native browser pilot');
      if(opcode!==8||length!==LOGIN_SIZE)
        throw Error('Original GameServer login must be first');
      if(cstrAscii(packet,8,21)!==this.#account)
        throw Error('Account mismatch in original login');
      // No password, checksum or MAC processing by the proxy. GameServer checks.
      this.#state='awaiting-character-list';
      this.#loginAt=this.#now();
      return;
    }
    if(opcode===8)throw Error('Second account login is forbidden');
    if(this.#state==='awaiting-character-list')
      throw Error('Game packet before character list received');
    if(this.#nativeLogin && opcode===11){
      if(this.#state!=='character-list-received-not-authenticated')throw Error('Creation requires account character list');
      const request=decodeCharacterCreation(packet,{expectedAccount:this.#account});
      this.#creatingName=request.name;
      this.#state='awaiting-character-creation';
      return;
    }
    if(this.#nativeLogin && opcode===WORLD.join){
      if(this.#state!=='native-record-received')throw Error('Real selected record required before world join');
      decodeWorldJoin(packet,{expectedSerial:this.#serial});
      this.#state='awaiting-native-world';return;
    }
    if(this.#nativeLogin && opcode===WORLD.move){
      if(this.#state!=='native-world-active')throw Error('World confirmation required before movement');
      const q=decodeMoveIntent(packet);
      if(q.sequence!==this.#sentSequence+1||this.#sentSequence-this.#ackSequence>=4)throw Error('Movement sequence/backpressure violation');
      this.#sentSequence=q.sequence;return;
    }
    if(this.#nativeLogin && opcode===NPC.request){
      if(this.#state!=='native-world-active'||this.#npcPending)throw Error('NPC interaction requires active world without pending request');
      const q=decodeNpcRequest(packet);if(q.sequence!==this.#npcSequence+1)throw Error('Invalid NPC request sequence');
      this.#npcSequence=q.sequence;this.#npcPending=q;return;
    }
    if(this.#nativeLogin && opcode===CHAT_OPCODE){
      if(this.#state!=='native-world-active')throw Error('Chat requires a confirmed GameServer world session');
      validateClientChatFrame(packet);
      if(!this.#chatThrottle.allow())throw Error('Chat rate limit');
      return;
    }
    if(this.#nativeLogin && ![5].includes(opcode))throw Error('Native packet is not implemented');
    if(this.#nativeLogin && opcode===5 && this.#state!=='character-list-received-not-authenticated')throw Error('Selection already sent or creation pending');
    if(opcode===5){
      if(length!==SELECT_SIZE)throw Error('Invalid character selection size');
      if(this.#nativeLogin){
        const v=new DataView(packet.buffer,packet.byteOffset,packet.byteLength);
        if(v.getUint32(8,true)!==0||v.getUint32(12,true)!==0||v.getUint32(16,true)!==WEB_LOGIN.version)
          throw Error('Invalid native character selection protocol');
      }
      const name=cstrName(packet,20,32);
      if(!this.#names.has(name))throw Error('Character not in account character list');
      this.#selectedName=name;
      this.#state='character-selected-awaiting-record';
    }
    // Any other original game packet still requires GameServer validation.
  }
  onServer(packet){
    this.checkDeadline();
    const {opcode}=inspectPacket(packet);
    if(this.#nativeLogin && opcode===4){
      if(this.#state!=='character-selected-awaiting-record')throw Error('Unsolicited native record');
      const record=this.#recordAssembler.feed(packet);
      if(record){
        const decoded=decodeRecordWorld(record,{expectedAccount:this.#account,expectedName:this.#selectedName});
        this.#serial=decoded.identity.serial;this.#worldField=decoded.field;
        this.#combatTargets=new CombatTargetLedger({observer:this.#serial,field:this.#worldField,now:this.#now});
        this.#state='native-record-received';
      }
      return;
    }
    if(this.#nativeLogin && opcode===ENTITIES.opcode){
      if(this.#state!=='native-world-active')throw Error('World confirmation required before entities');
      const snapshot=decodeEntitySnapshot(packet,{expectedObserver:this.#serial,expectedField:this.#worldField});
      if(snapshot.sequence!==this.#entitySequence+1)throw Error('Invalid entity sequence');
      this.#combatTargets.accept(snapshot);
      this.#entitySequence=snapshot.sequence;return;
    }
    if(this.#nativeLogin && opcode===NPC.reply){
      if(this.#state!=='native-world-active'||!this.#npcPending)throw Error('Unsolicited NPC reply');
      decodeNpcReply(packet,{expectedObserver:this.#serial,expectedSequence:this.#npcPending.sequence,expectedTarget:this.#npcPending.target});
      this.#npcPending=null;return;
    }
    if(this.#nativeLogin && opcode===WORLD.state){
      if(!['awaiting-native-world','native-world-active'].includes(this.#state))throw Error('Unsolicited world confirmation');
      const result=decodeWorldSnapshot(packet,{expectedSerial:this.#serial,expectedName:this.#selectedName,expectedField:this.#worldField});
      if(result.sequence!==this.#ackSequence+1||result.sequence>this.#sentSequence)throw Error('Unexpected movement acknowledgement');
      this.#ackSequence=result.sequence;this.#state='native-world-active';return;
    }
    if(this.#nativeLogin && opcode===11){
      if(this.#state!=='awaiting-character-creation')throw Error('Unsolicited creation result');
      decodeCharacterCreation(packet,{response:true,expectedAccount:this.#account,expectedName:this.#creatingName});
      this.#state='creation-finished-reconnect-required';
      return;
    }
    if(opcode!==9)return;
    if(this.#state!=='awaiting-character-list')
      throw Error('Unsolicited or repeated character list');
    const result=decodeCharacterList(packet,{expectedAccount:this.#account});
    this.#names=new Set(result.characters.map(c=>c.name));
    this.#state='character-list-received-not-authenticated';
    // Receiving a list is NOT treated as login success.
  }
  close(){
    this.#combatTargets?.close();
    this.#combatTargets=null;
    this.#state='closed';
    this.#names.clear();
    this.#selectedName=null;
  }
}
