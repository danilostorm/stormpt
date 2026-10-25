#pragma once
namespace stormpt_web {
constexpr DWORD kNpcRequest=0x53570005,kNpcReply=0x53570006;
struct NpcRequest{DWORD size,code,version,sequence,target;};
struct NpcReply{DWORD size,code,version,observer,sequence,target,status,services;char name[32],message[256];};
static_assert(sizeof(NpcRequest)==20&&sizeof(NpcReply)==320,"NPC wire ABI");
// Called under worldMutex after session and authoritative character checks.
inline bool DispatchNpc(rsPLAYINFO* p,NativeWorld& w,const char* bytes,DWORD size,DWORD now){
 if(size!=sizeof(NpcRequest))return false;
 NpcRequest q;memcpy(&q,bytes,sizeof(q));
 if(q.size!=size||q.code!=kNpcRequest||q.version!=1||!q.target||w.npcSequence==0xffffffff||q.sequence!=w.npcSequence+1)return false;
 w.npcSequence=q.sequence;
 NpcReply reply={};reply.size=sizeof(reply);reply.code=kNpcReply;reply.version=1;reply.observer=w.serial;reply.sequence=q.sequence;reply.target=q.target;reply.status=1;
 if(w.lastNpc&&(DWORD)(now-w.lastNpc)<500)reply.status=4;
 else{
  w.lastNpc=now;
  for(int i=0;i<AUTOPLAYER_MAX;i++){
   auto& c=chrAutoPlayer[i];
   if(!c.Flag||c.dwObjectSerial!=q.target||c.lpExt1!=(void*)&StageArea[3]||c.smCharInfo.State!=smCHAR_STATE_NPC)continue;
   const int64_t dx=((int64_t)c.pX-p->Position.x)/256,dz=((int64_t)c.pZ-p->Position.z)/256;
   if(dx*dx+dz*dz>160*160||abs(c.pY-p->Position.y)>96*fONE){reply.status=2;break;}
   if(!memchr(c.smCharInfo.szName,0,sizeof(c.smCharInfo.szName)))return false;
   strcpy_s(reply.name,c.smCharInfo.szName);
   const auto& info=c.smMonsterInfo;
   reply.services=(info.SellAttackItemCount||info.SellDefenceItemCount||info.SellEtcItemCount?1:0)|(info.SkillMaster?2:0)|(info.WareHouseMaster?4:0)|(info.ItemMix?8:0)|(info.ItemAging?16:0);
   const char* text=nullptr;
   if(info.NpcMsgCount>0&&info.NpcMsgCount<=NPC_MESSAGE_MAX)text=info.lpNpcMessage[0];
   if(!text&&c.szChatMessage[0])text=c.szChatMessage;
   reply.status=3;
   if(text){const size_t n=strnlen_s(text,256);if(n>0&&n<256){memcpy(reply.message,text,n);reply.status=0;}}
   break;
  }
 }
 return p->lpsmSock->Send((char*)&reply,sizeof(reply),TRUE)!=0;
}
}
