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
  #account;
  #state='awaiting-login';
  #names=new Set();
  #selectedName=null;
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
  }
  get phase(){return this.#state}
  get boundAccount(){return this.#account}
  get characterNames(){return [...this.#names]}
  get selectedCharacter(){return this.#selectedName}
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
    if(opcode!==9)return;
    if(this.#state!=='awaiting-character-list')
      throw Error('Unsolicited or repeated character list');
    const result=decodeCharacterList(packet,{expectedAccount:this.#account});
    this.#names=new Set(result.characters.map(c=>c.name));
    this.#state='character-list-received-not-authenticated';
    // Receiving a list is NOT treated as login success.
  }
  close(){
    this.#state='closed';
    this.#names.clear();
    this.#selectedName=null;
  }
}
