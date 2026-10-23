import {WORLD,encodeWorldJoin,encodeMoveIntent,decodeWorldSnapshot} from '../../transport/src/world-protocol.mjs';
import {decodeRecordWorld} from '../../transport/src/record-world.mjs';
import {encodeCharacterCreation,decodeCharacterCreation} from '../../transport/src/character-creation.mjs';
/**
 * Real native GameServer session when explicitly enabled with signed site tickets.
 * Observer mode is retained for protocol QA. Character creation and selection
 * require the actual native character list; GameServer owns all persisted state.
 */
import { CharacterSessionObserver } from '../../transport/src/character-session.mjs';
import {encodeWebLoginPacket,encodeWebCharacterSelection} from '../../transport/src/web-login.mjs';
import { inspectPacket } from '../../transport/src/packets.mjs';

const validAccount = name => typeof name === 'string' &&
  /^[A-Za-z0-9_.-]{1,20}$/.test(name);
const validTicket = token => typeof token === 'string' &&
  token.length >= 24 && token.length <= 1024 &&
  /^[A-Za-z0-9._-]+$/.test(token);

export class StormPTBrowserSession {
  constructor({expectedAccount, onEvent=()=>{}, Socket=globalThis.WebSocket,
    connectTimeoutMs=10_000,allowNativeWebLogin=false}={}) {
    if(!validAccount(expectedAccount)) throw new Error('Trusted account required');
    if(typeof onEvent!=='function' || typeof Socket!=='function')
      throw new TypeError('Event callback and WebSocket implementation required');
    if(!Number.isSafeInteger(connectTimeoutMs) || connectTimeoutMs<100 ||
       connectTimeoutMs>60_000) throw new RangeError('Invalid timeout');
    this.allowNativeWebLogin=allowNativeWebLogin;
    this.nativeLogin=false;
    this.account=expectedAccount;
    this.onEvent=onEvent;
    this.Socket=Socket;
    this.connectTimeoutMs=connectTimeoutMs;
    this.phase='disconnected';
    this.ws=null;
    this.observer=new CharacterSessionObserver({
      expectedAccount, onEvent:event=>this.#onProtocolEvent(event)
    });
  }
  #emit(type,detail={}) { this.onEvent({type,...detail}); }
  #onProtocolEvent(event) {
    // A character list is NOT sufficient evidence of login/authentication.
    // It is a server-origin protocol event, not a browser-issued identity.
    if(this.nativeLogin && event.type==='character-list'){
      this.phase='native-character-list-ready';
      this.#emit('native-gameserver-authorized',{account:this.account});
    }
    if(this.nativeLogin && event.type==='character-record'){
      const world=decodeRecordWorld(event.record,{expectedAccount:this.account,expectedName:event.identity.name});
      this.worldRecord=world;
      this.phase='native-character-record-ready';
      this.#emit('character-world-state',{world});
    }
    this.#emit(event.type,event);
  }
  async connect({url,ticket,gameTicket}={}) {
    if(this.phase!=='disconnected' && this.phase!=='closed')
      throw new Error('Session already connecting/connected');
    const parsed=new URL(url);
    const loopback=['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
    if(parsed.protocol!=='wss:' && !(loopback && parsed.protocol==='ws:'))
      throw new Error('Secure WebSocket required');
    if(!validTicket(ticket)) throw new Error('Server-issued ticket required');
    if(parsed.username || parsed.password || parsed.search || parsed.hash)
      throw new Error('No credentials or ticket in URL');
    if(parsed.pathname!=='/game') throw new Error('Unexpected gateway path');
    const nativePacket=gameTicket===undefined?null:
      encodeWebLoginPacket({gameTicket,expectedAccount:this.account});
    if(nativePacket&&!this.allowNativeWebLogin)throw Error('Native web login is not enabled');
    this.nativeLogin=!!nativePacket;
    this.observer.reset();
    this.phase='connecting';
    const ws=new this.Socket(parsed.toString(),['stormpt-binary-v1','ticket.'+ticket]);
    this.ws=ws;
    ws.binaryType='arraybuffer';
    return new Promise((resolve,reject)=>{
      let settled=false;
      const fail=(err)=>{
        if(!settled) {settled=true;clearTimeout(timer);reject(err);}
      };
      const timer=setTimeout(()=>{
        this.phase='closed';try{ws.close();}catch{}
        fail(new Error('WebSocket connection timeout'));
      },this.connectTimeoutMs);
      ws.addEventListener('open',()=>{
        if(settled)return;
        if(ws.protocol!=='stormpt-binary-v1'){
          this.phase='closed';ws.close();
          fail(new Error('Wrong WebSocket subprotocol'));return;
        }
        settled=true;clearTimeout(timer);
        this.phase='connected-awaiting-server-auth';
        this.#emit('transport-open-not-authenticated');
        if(nativePacket){
          ws.send(nativePacket);
          this.phase='awaiting-native-character-list';
          this.#emit('native-login-sent-not-authenticated');
        }
        resolve();
      });
      ws.addEventListener('message',event=>{
        if(this.phase==='closed')return;
        const data=event.data;
        if(!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)){
          this.#emit('protocol-error',{message:'Non-binary game packet'});
          this.close();return;
        }
        try {
          const bytes=data instanceof Uint8Array ? data : new Uint8Array(data);
          const {opcode}=inspectPacket(bytes);
          if(this.nativeLogin && opcode===65){
            if(bytes.length!==24)throw Error('Malformed GameServer login result');
            const code=new DataView(bytes.buffer,bytes.byteOffset,bytes.length).getInt32(12,true);
            this.#emit('game-login-denied',{code});
            this.close();return;
          }
          if(this.nativeLogin && opcode===11){
            if(this.phase!=='awaiting-native-character-creation')throw Error('Unsolicited creation result');
            const result=decodeCharacterCreation(bytes,{response:true,expectedAccount:this.account,expectedName:this.creatingName});
            this.phase='native-character-creation-finished';
            this.#emit('character-creation-result',result);
            return;
          }
          if(this.nativeLogin && opcode===WORLD.state){
            if(!['awaiting-native-world','native-world-ready'].includes(this.phase))throw Error('Unsolicited world snapshot');
            const world=decodeWorldSnapshot(bytes,{expectedSerial:this.worldRecord.identity.serial,expectedName:this.worldRecord.identity.name});
            if(world.sequence!==this.lastAck+1||world.sequence>this.moveSeq)throw Error('Invalid server acknowledgement sequence');
            this.lastAck=world.sequence;this.worldState=world;this.phase='native-world-ready';
            if(!this.heartbeat)this.heartbeat=setInterval(()=>{
              if(this.phase==='native-world-ready'&&Date.now()-this.lastMoveSent>900)this.sendMove(0);
            },1000);
            this.#emit('world-state',{world});return;
          }
          this.observer.accept(bytes);
        } catch(err) {
          this.#emit('protocol-error',{message:String(err?.message||err)});
          this.close();
        }
      });
      ws.addEventListener('error',()=>{
        if(!settled)fail(new Error('WebSocket failed'));
        this.#emit('transport-error');
      });
      ws.addEventListener('close',()=>{
        clearInterval(this.heartbeat);this.heartbeat=null;
        this.phase='closed';this.ws=null;this.observer.reset();
        if(!settled)fail(new Error('WebSocket closed before connection'));
        this.#emit('transport-closed');
      });
    });
  }
  enterWorld(){
    if(!this.nativeLogin||this.phase!=='native-character-record-ready'||!this.worldRecord)throw Error('Verified native character record required');
    this.moveSeq=0;this.lastAck=-1;this.lastMoveSent=Date.now();this.phase='awaiting-native-world';
    this.ws.send(encodeWorldJoin({serial:this.worldRecord.identity.serial}));
  }
  sendMove(direction){
    if(this.phase!=='native-world-ready')throw Error('Server world confirmation required');
    if(this.moveSeq-this.lastAck>=4)return false;
    const sequence=this.moveSeq+1,packet=encodeMoveIntent({sequence,direction});
    this.ws.send(packet);this.moveSeq=sequence;this.lastMoveSent=Date.now();return sequence;
  }
  createCharacter(name,{job=1}={}) {
    if(!this.nativeLogin || this.phase!=='native-character-list-ready')throw Error('Native account character list required');
    const packet=encodeCharacterCreation({account:this.account,name,job});
    this.creatingName=name;
    this.phase='awaiting-native-character-creation';
    this.ws.send(packet);
    return {requested:name,sent:true};
  }
  selectCharacter(name) {
    if(this.nativeLogin){
      if(this.phase!=='native-character-list-ready')throw Error('Native GameServer character list required');
      this.observer.selectCharacter(name);
      this.ws.send(encodeWebCharacterSelection({characterName:name}));
      this.phase='awaiting-native-character-record';
      return {selected:name,sent:true};
    }
    // Prepares read-only observer for a future server-authorized selection.
    // Does not send opcode 5: browser auth/checksum adaptation is unfinished.
    if(this.phase!=='connected-awaiting-server-auth')
      throw new Error('No active transport');
    this.observer.selectCharacter(name);
    return {selected:name, sent:false, reason:'Game server web authorization not implemented'};
  }
  close() {
    clearInterval(this.heartbeat);this.heartbeat=null;
    const ws=this.ws;this.ws=null;
    this.phase='closed';this.observer.reset();
    if(ws && ws.readyState!==this.Socket.CLOSED) ws.close();
  }
}
