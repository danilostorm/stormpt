/**
 * Minimal original-server chat HUD for the closed StormPT Web QA pilot.
 * All messages are server-origin; no client-side fake echo or HTML injection.
 * This UI does not implement slash/GM/party commands or invent player identity.
 */
export class NativeChatPanel {
  constructor(container,{onSend,onOpen=()=>{},onClose=()=>{}}={}){
    if(!container||typeof onSend!=='function'||typeof onOpen!=='function'||typeof onClose!=='function')
      throw new TypeError('Chat requires a container and callbacks');
    this.onSend=onSend;this.onOpen=onOpen;this.onClose=onClose;
    this.button=document.createElement('button');
    this.button.type='button';this.button.className='world-chat-toggle';
    this.button.textContent='Chat · Enter';this.button.setAttribute('aria-expanded','false');
    this.button.style.cssText='position:absolute;left:18px;bottom:186px;padding:10px 14px;background:#171e29;color:#f3dfb1;border:1px solid #a5874b;border-radius:5px;cursor:pointer;z-index:7';
    this.panel=document.createElement('section');this.panel.className='world-chat-panel';
    this.panel.hidden=true;this.panel.setAttribute('role','dialog');
    this.panel.setAttribute('aria-label','Chat do mundo StormPT');
    this.panel.style.cssText='position:absolute;left:18px;bottom:234px;width:min(380px,calc(100vw - 36px));max-height:min(420px,70vh);background:#121720f7;color:#f3dfb1;border:1px solid #b29355;border-radius:8px;padding:12px;z-index:7;box-sizing:border-box';
    this.panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><strong>Chat do mundo</strong><button type="button" class="chat-close" aria-label="Fechar chat">×</button></div><ol class="chat-lines" aria-live="polite" aria-relevant="additions" style="height:180px;overflow:auto;list-style:none;padding:8px;margin:8px 0;border:1px solid #645234;background:#0d1219"></ol><form class="chat-form" autocomplete="off" style="display:flex;gap:5px"><input class="chat-input" type="text" maxlength="70" aria-label="Mensagem para o chat" placeholder="Mensagem (até 70 bytes)" style="min-width:0;flex:1;background:#0d1219;color:#f3dfb1;border:1px solid #8b6a3b;padding:8px"><button type="submit" style="background:#c7a56b;color:#17141a;border:0;padding:8px">Enviar</button></form><p class="chat-status" role="status" style="min-height:1em;margin:6px 0 0;color:#d9c7a6;font:12px sans-serif"></p><small style="color:#b6a785">Somente chat público. Comandos não disponíveis.</small>';
    container.append(this.button,this.panel);
    this.input=this.panel.querySelector('.chat-input');
    this.lines=this.panel.querySelector('.chat-lines');
    this.status=this.panel.querySelector('.chat-status');
    this.button.addEventListener('click',()=>this.toggle());
    this.panel.querySelector('.chat-close').addEventListener('click',()=>this.close());
    this.panel.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();this.close();}
    });
    this.panel.querySelector('.chat-form').addEventListener('submit',event=>{
      event.preventDefault();
      const value=this.input.value;
      try{
        this.onSend(value);
        this.input.value='';
        this.status.textContent='Enviado ao servidor. Aguardando mensagem do mundo.';
      }catch(error){
        this.status.textContent=String(error?.message||'Não foi possível enviar a mensagem.');
      }
    });
  }
  receive(message){
    if(!message||typeof message.text!=='string'||!message.text.trim()||message.text.length>255)
      throw new TypeError('Mensagem do servidor inválida');
    const row=document.createElement('li');
    row.textContent=message.text;
    row.style.cssText='padding:4px 0;overflow-wrap:anywhere;border-bottom:1px solid #ffffff12';
    this.lines.append(row);
    while(this.lines.children.length>40)this.lines.firstElementChild.remove();
    this.lines.scrollTop=this.lines.scrollHeight;
    this.status.textContent='';
  }
  open(){
    if(!this.panel.hidden)return;
    this.onOpen();this.panel.hidden=false;
    this.button.setAttribute('aria-expanded','true');
    this.input.focus();
  }
  close(){
    if(this.panel.hidden)return;
    this.panel.hidden=true;this.button.setAttribute('aria-expanded','false');
    this.onClose();
  }
  toggle(){this.panel.hidden?this.open():this.close()}
  dispose(){this.panel.remove();this.button.remove()}
}
