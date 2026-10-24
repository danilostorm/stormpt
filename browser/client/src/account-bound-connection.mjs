import {StormPTAccountTicket} from './account-ticket.mjs';
import {StormPTBrowserSession} from './browser-session.mjs';

/**
 * Browser start sequence. Uses ONLY the identity returned by the actual
 * ASP.NET account session to create the packet observer and WebSocket.
 *
 * IMPORTANT: A transport-open event is not an authenticated GAME session.
 * The real GameServer must still authorize character loading independently.
 */
export class StormPTAccountBoundConnection {
  constructor({siteOrigin='https://stormpt.hoststorm.com.br',csrf,onEvent=()=>{},
    ticketClient,createSession,nativeLogin=false}={}){
    const target=new URL(siteOrigin);
    if(target.protocol!=='https:' || target.pathname!=='/' || target.search ||
       target.hash || target.username || target.password)
      throw new Error('HTTPS account origin required');
    this.nativeLogin=nativeLogin;
    this.siteOrigin=target.origin;
    this.ticketClient=ticketClient??new StormPTAccountTicket({origin:target.origin,csrf});
    this.createSession=createSession??(opts=>new StormPTBrowserSession(opts));
    this.onEvent=onEvent;
    this.state='idle';
    this.session=null;
    this.account=null;
  }
  async connect({signal}={}){
    if(this.state!=='idle'&&this.state!=='closed')
      throw new Error('Connection already active');
    this.state='requesting-site-ticket';
    try {
      const {account,ticket,gameTicket}=await this.ticketClient.issue({signal});
      if(this.nativeLogin&&!gameTicket)throw Error('Native GameServer ticket missing');
      if(signal?.aborted)throw new Error('Login attempt cancelled');
      const session=this.createSession({expectedAccount:account,onEvent:this.onEvent,allowNativeWebLogin:this.nativeLogin});
      this.session=session;
      this.account=account;
      this.state='transport-opening';
      const url=this.siteOrigin.replace(/^https:/,'wss:')+'/game';
      await session.connect(this.nativeLogin?{url,ticket,gameTicket}:{url,ticket});
      this.state='awaiting-gameserver-authorization';
      return {
        account,
        state:this.state,
        authenticatedToGame:false,
      };
    } catch(err){
      this.state='closed';
      try { this.session?.close(); } catch {}
      this.session=null;this.account=null;
      throw err;
    }
  }
  close(){
    try{this.session?.close();}finally{
      this.session=null;this.account=null;this.state='closed';
    }
  }
}
