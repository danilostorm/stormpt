import {readWebTicket} from './web-login.js';
/**
 * Browser-side request to the REAL StormPT ASP.NET account session.
 * A ticket is a transport credential, NOT proof of GameServer login.
 *
 * /BrowserTicket.ashx remains STAGED, not publicly installed.
 * The issuer must verify HttpOnly session, account and CSRF server-side.
 */
export class StormPTAccountTicket {
  constructor({csrf,origin,fetcher=fetch}={}){
    const url=new URL(origin);
    if(url.protocol!=='https:' || url.pathname!=='/' || url.search || url.hash)
      throw new TypeError('A secure account origin is required');
    if(typeof csrf!=='string' || csrf.length<24 || csrf.length>512)
      throw new Error('Trusted account CSRF is required');
    if(typeof fetcher!=='function')throw new TypeError('Fetch implementation required');
    this.origin=url.origin;
    this.csrf=csrf;
    this.fetcher=fetcher.bind(globalThis);
  }
  async issue({signal}={}){
    const response=await this.fetcher(this.origin+'/BrowserTicket.ashx',{
      method:'POST',
      mode:'same-origin',
      credentials:'same-origin',
      cache:'no-store',
      redirect:'error',
      headers:{'Accept':'application/json','X-StormPT-Csrf':this.csrf},
      signal
    });
    if(!response.ok)throw new Error(response.status===403?'Esta conta ainda não está autorizada para o acesso antecipado.':response.status===401?'Sua sessão expirou. Saia da conta e entre novamente.':'Não foi possível conectar ao StormPT. Tente novamente.');
    if(response.redirected || new URL(response.url).origin!==this.origin)
      throw new Error('Unexpected issuer response origin');
    if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      throw new Error('Issuer must return JSON');
    const body=await response.json();
    if(typeof body?.account!=='string' ||
       !/^[A-Za-z][A-Za-z0-9_]{3,15}$/.test(body.account) ||
       typeof body.ticket!=='string' ||
       !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(body.ticket) ||
       body.ticket.length>1024 ||
       !Number.isInteger(body.expiresIn) || body.expiresIn<1 || body.expiresIn>60)
      throw new Error('Malformed account-bound ticket');
    const result={account:body.account,ticket:body.ticket,expiresIn:body.expiresIn};
    if(body.gameTicket!==undefined){
      const game=readWebTicket(body.gameTicket);
      const transport=readWebTicket(body.ticket,{audience:'stormpt-browser-tcp'});
      if(game.account!==body.account||transport.account!==body.account||game.sid!==transport.sid)
        throw Error('Account ticket binding mismatch');
      result.gameTicket=body.gameTicket;
    }
    return result;
  }
}
