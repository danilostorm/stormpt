#pragma once
// Read-only visibility snapshots from the original active server entities.
#include <vector>
#include <algorithm>
#include <set>
namespace stormpt_web {
constexpr DWORD kWorldEntities=0x53570004;
struct EntityRow{
 DWORD serial,kind,motion,heading;int x,y,z,life,maxLife,level,job;
 char name[32],model[64],head[64];
};
struct EntityHeader{DWORD size,code,version,observer,sequence,tick;int field;DWORD count;};
static_assert(sizeof(EntityRow)==204&&sizeof(EntityHeader)==32,"Entity wire ABI");
struct EntityCandidate{int64_t distance;EntityRow row;};
inline bool EntityIdentity(EntityRow& e,const smCHAR_INFO& info){
 if(!memchr(info.szName,0,sizeof(info.szName))||!info.szName[0]||
    !memchr(info.szModelName,0,sizeof(info.szModelName))||
    info.Level<0||info.Level>100000||info.Life[0]<0||info.Life[1]<info.Life[0])return false;
 strcpy_s(e.name,info.szName);strcpy_s(e.model,info.szModelName);
 e.life=info.Life[0];e.maxLife=info.Life[1];e.level=info.Level;e.job=info.JOB_CODE;
 return true;
}
inline bool SendEntities(rsPLAYINFO* p,NativeWorld& w,DWORD now,bool force=false){
 if(!force&&(DWORD)(now-w.lastEntities)<500)return true;
 if(w.entitySequence==0xffffffff)return false;
 std::vector<EntityCandidate> candidates;std::set<DWORD> seen;
 auto add=[&](EntityRow& e){
  if(!e.serial||e.serial==w.serial||seen.count(e.serial)||abs(e.x)>25600000||
     abs(e.y)>25600000||abs(e.z)>25600000)return;
  int64_t dx=((int64_t)e.x-p->Position.x)/256,dz=((int64_t)e.z-p->Position.z)/256;
  const int64_t distance=dx*dx+dz*dz;
  if(distance>1000*1000||abs(e.y-p->Position.y)>600*fONE)return;
  seen.insert(e.serial);candidates.push_back({distance,e});
 };
 for(int i=0;i<AUTOPLAYER_MAX;i++){
  const auto& c=chrAutoPlayer[i];
  if(!c.Flag||c.lpExt1!=(void*)&StageArea[3]||!c.dwObjectSerial)continue;
  EntityRow e={};e.serial=c.dwObjectSerial;e.kind=c.smCharInfo.State==smCHAR_STATE_NPC?1:2;
  e.motion=c.MotionInfo?c.MotionInfo->State:0;e.heading=c.Angle.y&4095;
  e.x=c.pX;e.y=c.pY;e.z=c.pZ;
  if(EntityIdentity(e,c.smCharInfo)&&c.Flag&&c.dwObjectSerial==e.serial)add(e);
 }
 for(int i=0;i<CONNECTMAX;i++){
  auto& other=rsPlayInfo[i];
  if(&other==p||!other.lpsmSock||other.Position.Area!=3||other.getName().empty()||
     !other.dwObjectSerial||other.CharLoadingCount!=1||other.dwTime_Disconnect)continue;
  EntityRow e={};e.serial=other.dwObjectSerial;e.kind=3;
  e.x=other.Position.x;e.y=other.Position.y;e.z=other.Position.z;
  if(!EntityIdentity(e,other.smCharInfo))continue;
  if(memchr(other.smCharInfo.szModelName2,0,sizeof(other.smCharInfo.szModelName2)))
   strcpy_s(e.head,other.smCharInfo.szModelName2);
  add(e);
 }
 std::sort(candidates.begin(),candidates.end(),[](const EntityCandidate&a,const EntityCandidate&b){
  return a.distance!=b.distance?a.distance<b.distance:a.row.serial<b.row.serial;
 });
 const DWORD count=(DWORD)min((size_t)32,candidates.size());
 EntityHeader h={sizeof(h)+count*sizeof(EntityRow),kWorldEntities,1,w.serial,++w.entitySequence,now,3,count};
 std::vector<char> packet(h.size);memcpy(packet.data(),&h,sizeof(h));
 for(DWORD i=0;i<count;i++)memcpy(packet.data()+sizeof(h)+i*sizeof(EntityRow),&candidates[i].row,sizeof(EntityRow));
 w.lastEntities=now;
 return p->lpsmSock->Send(packet.data(),h.size,TRUE)!=0;
}
}
