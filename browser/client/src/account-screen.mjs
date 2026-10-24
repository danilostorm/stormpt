import {InGameStormPTAccount} from './in-game-account.mjs';
const $=id=>document.getElementById(id);
const api=new InGameStormPTAccount();
function feedback(el,message='',kind='info'){el.textContent=message;el.dataset.kind=kind}
function busy(isBusy){for(const id of ['loginSubmit','signupSubmit','logout'])$(id).disabled=isBusy}
function closeSignup(){$('signupModal').setAttribute('aria-hidden','true');feedback($('signupStatus'),'')}
function loggedIn(account,message){
 $('loggedOut').hidden=true;$('loggedIn').hidden=false;
 $('accountName').textContent=account;
 $('loginPassword').value='';$('signupPassword').value='';$('signupConfirm').value='';
 closeSignup();feedback($('accountStatus'),message||'Conta do site conectada.','success');
}
function loggedOut(message=''){
 $('loggedOut').hidden=false;$('loggedIn').hidden=true;
 $('accountName').textContent='';$('loginPassword').value='';
 feedback($('accountStatus'),message);
}
$('openSignup').addEventListener('click',()=>{
 $('signupModal').setAttribute('aria-hidden','false');
 $('signupUser').value=$('loginUser').value;feedback($('signupStatus'),'');$('signupUser').focus();
});
$('closeSignup').addEventListener('click',closeSignup);
$('cancelSignup').addEventListener('click',closeSignup);
$('signupModal').addEventListener('click',e=>{if(e.target===$('signupModal'))closeSignup()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('signupModal').getAttribute('aria-hidden')==='false')closeSignup()});
$('forgotPassword').addEventListener('click',()=>{
 feedback($('accountStatus'),'A recuperação de senha ainda não está disponível no portal StormPT.','error');
});
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();busy(true);
 feedback($('accountStatus'),'Consultando sua conta no StormPT…');
 const username=$('loginUser').value,password=$('loginPassword').value;
 try{
  const result=await api.submit('login',{username,password});
  if(result.ok){
   try{
    if($('rememberUser').checked)localStorage.setItem('stormpt-web-username',result.account);
    else localStorage.removeItem('stormpt-web-username');
   }catch{}
   loggedIn(result.account,result.message);
  } else feedback($('accountStatus'),result.message,'error');
 }catch(err){feedback($('accountStatus'),err.message,'error')}
 finally{busy(false);$('loginPassword').value=''}
});
$('signupForm').addEventListener('submit',async e=>{
 e.preventDefault();busy(true);feedback($('signupStatus'),'Criando sua conta no StormPT…');
 try{
  const result=await api.submit('cadastro',{
   username:$('signupUser').value,email:$('signupEmail').value,
   password:$('signupPassword').value,confirmPassword:$('signupConfirm').value
  });
  if(result.ok)loggedIn(result.account,result.message);
  else feedback($('signupStatus'),result.message,'error');
 }catch(err){feedback($('signupStatus'),err.message,'error')}
 finally{busy(false);$('signupPassword').value='';$('signupConfirm').value=''}
});
$('logout').addEventListener('click',async()=>{
 busy(true);
 try{await api.logout();loggedOut('Sessão encerrada no site.')}
 catch(err){feedback($('accountStatus'),err.message,'error')}
 finally{busy(false)}
});
try{
 const username=localStorage.getItem('stormpt-web-username');
 if(username&&/^[A-Za-z][A-Za-z0-9_]{3,15}$/.test(username)){
  $('loginUser').value=username;$('rememberUser').checked=true;
 }
}catch{}
// Establish the original ASP.NET session before allowing any form submission.
busy(true);
feedback($('accountStatus'),'Verificando sessão…');
try{
 const state=await api.status();
 if(state.authenticatedToSite)loggedIn(state.account,'Sessão do site reconhecida.');
 else loggedOut();
}catch(err){feedback($('accountStatus'),err.message,'error')}
finally{busy(false)}
window.__stormptAccountQA={
 uiReady:true,
 isAccountConnected:()=>!$('loggedIn').hidden,
 isPlayable:()=>false
};
