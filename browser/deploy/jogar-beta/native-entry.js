import './account-client.js';
import {StormPTAccountTicket} from './account-ticket.js';
import {StormPTBrowserSession} from './browser-session.js';
const $=id=>document.getElementById(id);
const state={phase:'site-login',characters:[],selected:null};
let session=null,busy=false,worldView=null,worldLoading=false,automaticAccount=null;
function clearWorld(){worldView?.dispose();worldView=null;worldLoading=false;state.entities=null;}
async function presentWorld(first){
 worldLoading=true;state.phase="loading-world";status("Carregando Ricarten…");
 const active=session;
 try{
  const {NativeWorldView}=await import("./native-world-view.js");
  if(session!==active||active.phase!=="native-world-ready")return;
  worldView=new NativeWorldView({record:state.world,initial:active.worldState||first,
   onDirection:direction=>{if(session===active&&active.phase==="native-world-ready"){const n=active.sendMove(direction);if(n)state.movementRequests=(state.movementRequests||0)+1;}},
   onNpc:target=>active.requestNpc(target),
   onExit:()=>{clearWorld();active.close();status("Você saiu do mundo. Carregue os personagens para entrar novamente.");},
   onReady:details=>{if(session===active){state.render=details;state.phase="in-world";status("Conectado em Ricarten.");}},
   onError:e=>{clearWorld();active.close();state.phase="error";status(e.message);}
  });
  if(active.entityState)worldView.applyEntities(active.entityState);
 }catch(e){worldLoading=false;state.phase="error";status(e.message);active.close();}
}

const panel=document.createElement('section');panel.id='nativeCharacters';
panel.setAttribute('aria-live','polite');
$('loggedIn').insertBefore(panel,$('logout'));
panel.setAttribute('aria-label','Personagens da conta');
function status(text){$('accountStatus').textContent=text;}
function updateButton(){
 const signedIn=!$('loggedIn').hidden;
 $('enterGame').disabled=!signedIn||busy;
 $('enterGame').textContent=busy?'Conectando…':'Tentar novamente';
 $('enterGame').hidden=state.phase==='character-list';
 const account=$('accountName').textContent.trim();
 if(signedIn&&account&&automaticAccount!==account){
  automaticAccount=account;queueMicrotask(()=>{if(!$('loggedIn').hidden&&!busy)$('enterGame').click();});
 }
 if(!signedIn){automaticAccount=null;clearWorld();session?.close();session=null;panel.replaceChildren();state.phase='site-login';}
}
function renderList(list){
 state.characters=list.characters;
 $('loggedIn').querySelector('h1').textContent='SELECIONE SEU PERSONAGEM';
 $('enterGame').hidden=true;
 panel.replaceChildren();
 const intro=$('loggedIn').querySelector('p.small');if(intro)intro.hidden=true;
 if(!list.characters.length){
  const message=document.createElement('p');message.textContent='Sua conta ainda não tem personagens.';
  panel.append(message);status('Conta autenticada no servidor StormPT.');
 }
 for(const c of list.characters){
  const button=document.createElement('button');button.className='secondary';
  button.textContent=c.name+' · Nível '+c.level;
  button.addEventListener('click',()=>{
   try{session.selectCharacter(c.name);state.selected=c.name;state.phase='loading-character';status('Carregando '+c.name+'…');}
   catch(e){status(e.message);}
  });panel.append(button);
 }
 if(list.characters.length<5){
  const form=document.createElement('form');form.id='createCharacterForm';
  const label=document.createElement('label');label.textContent='Novo personagem · Lutador nível 1';
  const input=document.createElement('input');input.id='newCharacterName';input.name='characterName';
  input.required=true;input.minLength=3;input.maxLength=16;input.pattern='[A-Za-z][A-Za-z0-9]{2,15}';
  input.placeholder='Nome do personagem';input.autocomplete='off';label.append(input);
  const create=document.createElement('button');create.type='submit';create.textContent='Criar personagem';
  form.append(label,create);panel.append(form);
  form.addEventListener('submit',event=>{
   event.preventDefault();
   if(!form.reportValidity())return;
   try{session.createCharacter(input.value);create.disabled=true;input.disabled=true;state.phase='creating-character';status('Criando personagem no servidor…');}
   catch(e){status(e.message);}
  });
 }
 status(list.characters.length?'Conta autenticada. Selecione seu personagem.':'Conta autenticada. Crie seu primeiro personagem.');

}
$('enterGame').addEventListener('click',async()=>{
 if(busy)return;busy=true;updateButton();status('Conectando ao servidor StormPT…');
 clearWorld();session?.close();session=null;
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
   if(e.type==='character-creation-result'){
    state.phase=e.created?'character-created':'character-creation-denied';
    status(e.created?'Personagem criado e salvo. Clique em Carregar personagens para atualizar.':'O servidor recusou a criação. Verifique o nome e tente carregar novamente.');
    session.close();
   }
   if(e.type==='character-world-state'){state.world=e.world;}
   if(e.type==='character-record'){state.characterLoaded=true;state.phase='joining-world';status('Entrando em Ricarten…');session.enterWorld();}
   if(e.type==='npc-reply'){state.npcReply=e.reply;worldView?.applyNpc(e.reply);}
   if(e.type==='world-entities'){state.entities=e.snapshot;if(worldView)worldView.applyEntities(e.snapshot);}
   if(e.type==='world-state'){
    state.worldLive=e.world;state.serverAcknowledgements=(state.serverAcknowledgements||0)+1;
    if(worldView)worldView.applySnapshot(e.world);
    else if(!worldLoading)void presentWorld(e.world);
   }
   if(e.type==='game-login-denied'){
    state.phase='error';
    const messages={'-3':'Esta conta está bloqueada no servidor.','-4':'Sua conta já está conectada ao servidor.'};
    status(messages[e.code]||'O servidor não autorizou a entrada desta conta.');
   }
   if(e.type==='protocol-error'){state.phase='error';status('Falha no protocolo do servidor.');}
   if(e.type==='transport-closed')clearWorld();
   if(e.type==='transport-closed'&&!['site-login','error','character-created','character-creation-denied'].includes(state.phase)){
    state.phase='disconnected';status('Conexão com o servidor encerrada.');updateButton();
   }
  }});
  state.phase='connecting';
  await session.connect({url:location.origin.replace(/^https:/,'wss:')+'/game',ticket,gameTicket});
 }catch(e){state.phase='error';status(e.message);}
 finally{busy=false;updateButton();}
});
new MutationObserver(updateButton).observe($('loggedIn'),{attributes:true,attributeFilter:['hidden']});
updateButton();
window.__stormptNativeQA={snapshot:()=>JSON.parse(JSON.stringify({...state,animation:worldView?.animationProbe(),entityModels:worldView?.entityProbe()})),performance:()=>worldView?.performanceProbe(),resetPerformance:()=>worldView?.resetPerformance(),close:()=>session?.close()};
