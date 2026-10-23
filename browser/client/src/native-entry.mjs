import './account-screen.mjs';
import {StormPTAccountTicket} from './account-ticket.mjs';
import {StormPTBrowserSession} from './browser-session.mjs';
const $=id=>document.getElementById(id);
const state={phase:'site-login',characters:[],selected:null};
let session=null,busy=false;
const panel=document.createElement('section');panel.id='nativeCharacters';
panel.setAttribute('aria-live','polite');
$('loggedIn').append(panel);
function status(text){$('accountStatus').textContent=text;}
function updateButton(){
 const signedIn=!$('loggedIn').hidden;
 $('enterGame').disabled=!signedIn||busy;
 $('enterGame').textContent='Carregar personagens';
 if(!signedIn){session?.close();session=null;panel.replaceChildren();state.phase='site-login';}
}
function renderList(list){
 state.characters=list.characters;
 panel.replaceChildren();
 const title=document.createElement('h2');title.textContent='Seus personagens';panel.append(title);
 if(!list.characters.length){
  const message=document.createElement('p');message.textContent='Sua conta ainda não tem personagens.';
  panel.append(message);status('Conta autenticada no servidor StormPT.');return;
 }
 for(const c of list.characters){
  const button=document.createElement('button');button.className='secondary';
  button.textContent=c.name+' · Nível '+c.level;
  button.addEventListener('click',()=>{
   try{session.selectCharacter(c.name);state.selected=c.name;state.phase='loading-character';status('Carregando '+c.name+'…');}
   catch(e){status(e.message);}
  });panel.append(button);
 }
 status('Conta autenticada. Selecione seu personagem.');
}
$('enterGame').addEventListener('click',async()=>{
 if(busy)return;busy=true;updateButton();status('Conectando ao servidor StormPT…');
 session?.close();session=null;
 try{
  const response=await fetch('/Conta.aspx?view=painel',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('Não foi possível verificar sua sessão.');
  const doc=new DOMParser().parseFromString(await response.text(),'text/html');
  const csrf=doc.querySelector('.account-panel input[name="csrf"]')?.value;
  if(!csrf)throw Error('Sua sessão expirou. Entre novamente.');
  const issuer=new StormPTAccountTicket({origin:location.origin,csrf});
  const {account,ticket,gameTicket}=await issuer.issue();
  if(!gameTicket)throw Error('Entrada pelo navegador ainda não liberada.');
  session=new StormPTBrowserSession({expectedAccount:account,allowNativeWebLogin:true,onEvent:e=>{
   if(e.type==='native-gameserver-authorized')state.phase='authenticated-gameserver';
   if(e.type==='character-list'){state.phase='character-list';renderList(e.list);}
   if(e.type==='character-record'){state.phase='character-loaded';status('Personagem '+e.identity.name+' carregado do servidor.');}
   if(e.type==='game-login-denied'){
    state.phase='error';
    const messages={'-3':'Esta conta está bloqueada no servidor.','-4':'Sua conta já está conectada ao servidor.'};
    status(messages[e.code]||'O servidor não autorizou a entrada desta conta.');
   }
   if(e.type==='protocol-error'){state.phase='error';status('Falha no protocolo do servidor.');}
   if(e.type==='transport-closed'&&!['site-login','error'].includes(state.phase)){
    state.phase='disconnected';status('Conexão com o servidor encerrada.');
   }
  }});
  state.phase='connecting';
  await session.connect({url:location.origin.replace(/^https:/,'wss:')+'/game',ticket,gameTicket});
 }catch(e){state.phase='error';status(e.message);}
 finally{busy=false;updateButton();}
});
new MutationObserver(updateButton).observe($('loggedIn'),{attributes:true,attributeFilter:['hidden']});
updateButton();
window.__stormptNativeQA={snapshot:()=>JSON.parse(JSON.stringify(state)),close:()=>session?.close()};
