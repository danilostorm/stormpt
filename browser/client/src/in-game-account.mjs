/**
 * StormPT Web embedded account UI API for the EXISTING ASP.NET website.
 *
 * No alternate registration database and no new password storage.
 * Uses the real Conta.aspx CSRF/session protected registration/login forms.
 * GameServer authorization remains separate and is NOT inferred from site login.
 */
const SUPPORTED_ACTIONS=Object.freeze({
 login:{view:'login',action:'login'},
 cadastro:{view:'cadastro',action:'register'},
 painel:{view:'painel',action:null},
});
function validateOrigin(siteOrigin,locationOrigin){
 const remote=new URL(siteOrigin);
 const local=new URL(locationOrigin);
 if(remote.origin!==local.origin || remote.pathname!=='/' ||
    remote.search || remote.hash || remote.username || remote.password)
   throw new Error('Account API must use same-origin site session');
 if(remote.protocol!=='https:' && !(remote.protocol==='http:' &&
    ['localhost','127.0.0.1','[::1]'].includes(remote.hostname)))
   throw new Error('HTTPS required for account credentials');
 return remote.origin;
}
function parseForm(text,view){
 if(typeof text!=='string' || text.length>500000)
   throw new Error('Account page response invalid');
 const doc=new DOMParser().parseFromString(text,'text/html');
 if(doc.querySelector('parsererror'))throw new Error('Account response parse failed');
 const panel=doc.querySelector('.account-panel');
 if(!panel)throw new Error('Official StormPT account form unavailable');
 const error=panel.querySelector('.alert.error')?.textContent.trim()||'';
 const success=panel.querySelector('.alert.success')?.textContent.trim()||'';
 const logged=panel.querySelector('form input[name="action"][value="logout"]');
 if(logged){
  const profile=panel.querySelector('.profile-line strong')?.textContent.trim()||'';
  if(!/^[A-Za-z][A-Za-z0-9_]{3,15}$/.test(profile))
    throw new Error('Malformed authenticated account response');
  return {authenticatedToSite:true,account:profile,error:'',message:success};
 }
 const expected=SUPPORTED_ACTIONS[view];
 if(!expected)throw new Error('Unknown official form');
 const form=panel.querySelector('form');
 const token=form?.querySelector('input[name="csrf"]')?.value;
 const action=form?.querySelector('input[name="action"]')?.value;
 if(!token || token.length<24 || token.length>512 || action!==expected.action)
   throw new Error('Official account form CSRF/action missing');
 return {authenticatedToSite:false,account:null,csrf:token,error,message:success};
}
function validateInputs(kind,inputs){
 const name=String(inputs?.username||'').trim();
 const password=inputs?.password;
 if(!/^[A-Za-z][A-Za-z0-9_]{3,15}$/.test(name))throw new Error('Nome de usuário: 4 a 16 letras ou números, começando com letra.');
 if(typeof password!=='string' || password.length<1 || password.length>50)
   throw new Error('Informe sua senha.');
 if(kind==='cadastro'){
  if(password.length<8 || password.length>24 || !/^[\x21-\x7e]+$/.test(password))
    throw new Error('A senha deve ter de 8 a 24 caracteres permitidos.');
  const confirm=inputs.confirmPassword;
  if(confirm!==password)throw new Error('As senhas não coincidem.');
  const email=String(inputs.email||'').trim().toLowerCase();
  if(email.length>160 || !/^[^\s@]{1,60}@[^\s@]{1,95}\.[A-Za-z]{2,12}$/.test(email))
    throw new Error('Informe um endereço de e-mail válido.');
  return {usuario:name,senha:password,confirmar:confirm,email,website:''};
 }
 return {usuario:name,senha:password};
}
export class InGameStormPTAccount {
 constructor({origin=location.origin,fetcher=fetch,locationOrigin=location.origin}={}){
  this.origin=validateOrigin(origin,locationOrigin);
  if(typeof fetcher!=='function')throw new Error('Fetch implementation required');
  this.fetcher=fetcher.bind(globalThis);
 }
 async #fetchPage(view,{body,signal}={}){
  const url=this.origin+'/Conta.aspx?view='+encodeURIComponent(view);
  const options={
   method:body?'POST':'GET',
   credentials:'same-origin',
   mode:'same-origin',
   cache:'no-store',
   redirect:'error',
   referrerPolicy:'same-origin',
   headers:body?{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'text/html'}:{'Accept':'text/html'},
   signal
  };
  if(body)options.body=body.toString();
  const response=await this.fetcher(url,options);
  if(!response.ok || response.redirected || new URL(response.url).origin!==this.origin)
    throw new Error('Falha ao comunicar com o cadastro oficial do StormPT.');
  const contentType=response.headers.get('content-type')||'';
  if(!/^text\/html\b/i.test(contentType))throw new Error('Resposta inesperada do cadastro.');
  return parseForm(await response.text(),view);
 }
 async status({signal}={}){
  return this.#fetchPage('login',{signal});
 }
 async submit(kind,inputs,{signal}={}){
  if(kind!=='login' && kind!=='cadastro')throw new Error('Ação de conta inválida');
  const values=validateInputs(kind,inputs);
  const current=await this.#fetchPage(kind,{signal});
  if(current.authenticatedToSite)
    return {ok:true,account:current.account,gameAuthorized:false,message:'Conta do site já conectada.'};
  const payload=new URLSearchParams({csrf:current.csrf,action:SUPPORTED_ACTIONS[kind].action,...values});
  const result=await this.#fetchPage(kind,{body:payload,signal});
  if(!result.authenticatedToSite){
   return {ok:false,account:null,gameAuthorized:false,
     message:result.error||'O servidor não confirmou a operação. Confira seus dados.'};
  }
  if(result.account.toLowerCase()!==values.usuario.toLowerCase())
    throw new Error('A conta retornada não corresponde à solicitada.');
  return {ok:true,account:result.account,gameAuthorized:false,
    message:kind==='cadastro'?'Sua conta StormPT foi criada.': 'Você entrou na sua conta StormPT.'};
 }
 async logout({signal}={}){
  const current=await this.#fetchPage('painel',{signal});
  if(!current.authenticatedToSite)return {ok:true};
  const html=await this.#rawLogoutCSRF({signal});
  if(!html.csrf)throw new Error('Sessão oficial indisponível');
  const result=await this.#fetchPage('login',{
   body:new URLSearchParams({csrf:html.csrf,action:'logout'}),signal
  });
  if(result.authenticatedToSite)throw new Error('O servidor não encerrou a sessão.');
  return {ok:true};
 }
 async #rawLogoutCSRF({signal}={}){
  const url=this.origin+'/Conta.aspx?view=painel';
  const response=await this.fetcher(url,{
   method:'GET',credentials:'same-origin',mode:'same-origin',cache:'no-store',
   redirect:'error',headers:{Accept:'text/html'},signal
  });
  if(!response.ok || new URL(response.url).origin!==this.origin)
    throw new Error('Não foi possível verificar a sessão.');
  const html=await response.text();
  const doc=new DOMParser().parseFromString(html,'text/html');
  const csrf=doc.querySelector('.account-panel form input[name="action"][value="logout"]')
   ?.closest('form')?.querySelector('input[name="csrf"]')?.value;
  return {csrf};
 }
}
