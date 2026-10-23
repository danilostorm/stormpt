#pragma once
// Included after the native authentication adapter and original server declarations.
#include <map>
#include <mutex>
#include <cstdint>
#include <cstring>
namespace stormpt_web {
constexpr DWORD kWorldJoin=0x53570003, kWorldMove=0x53570001, kWorldState=0x53570002;
struct WorldJoinRequest {DWORD size,code,version,serial,reserved;};
struct WorldMoveRequest {DWORD size,code,version,sequence,direction,reserved;};
struct WorldSnapshot {
 DWORD size,code,version,serial,sequence,tick; int field,x,y,z,heading,status; char name[32];
};
static_assert(sizeof(WorldJoinRequest)==20 && sizeof(WorldMoveRequest)==24 && sizeof(WorldSnapshot)==80,"Native world ABI");
struct NativeWorld {
 DWORD connection,serial,sequence,lastStep,lastInput,lastSave; int heading; std::string account,name;
};
static std::map<rsPLAYINFO*,NativeWorld> worlds;
static std::mutex worldMutex;
inline bool WorldHealthy(rsPLAYINFO* p,DWORD now) {
 if(!Match(p,true)) return false;
 std::lock_guard<std::mutex> lock(worldMutex);
 auto it=worlds.find(p);
 // Before world entry the native transport still has its account/selection timeout.
 if(it==worlds.end() || it->second.connection!=p->dwConnectCount)
  return (int32_t)(now-p->dwLastRecvTime)<15000;
 const auto& w=it->second;
 return w.serial==p->dwObjectSerial && w.name==p->getName() &&
  w.account==p->getAccount() && (int32_t)(now-w.lastInput)<5000;
}
inline bool SendWorld(rsPLAYINFO* p,const NativeWorld& w,DWORD now,int status) {
 WorldSnapshot s={};
 s.size=sizeof(s);s.code=kWorldState;s.version=1;s.serial=w.serial;
 s.sequence=w.sequence;s.tick=now;s.field=(int)p->Position.Area;
 s.x=p->Position.x;s.y=p->Position.y;s.z=p->Position.z;s.heading=w.heading;s.status=status;
 strcpy_s(s.name,w.name.c_str());
 return p->lpsmSock->Send((char*)&s,sizeof(s),TRUE)!=0;
}
inline bool RecordMatches(rsPLAYINFO* p,TRANS_RECORD_DATA*& r) {
 if(!p->lpRecordDataBuff || p->CharLoadingCount!=1 || p->getName().empty())return false;
 r=(TRANS_RECORD_DATA*)p->lpRecordDataBuff;
 return r->size>=(int)offsetof(TRANS_RECORD_DATA,Data) && r->size<=srRECORD_MEMORY_SIZE &&
  r->code==OpCode::OPCODE_RECORDDATA &&
  memchr(r->smCharInfo.szName,0,sizeof(r->smCharInfo.szName)) &&
  p->getName()==r->smCharInfo.szName &&
  memchr(r->GameSaveInfo.szMasterID,0,sizeof(r->GameSaveInfo.szMasterID)) &&
  p->getAccount()==r->GameSaveInfo.szMasterID &&
  r->GameSaveInfo.PlayStageNum==3 && r->smCharInfo.dwObjectSerial==p->dwObjectSerial;
}
inline bool DispatchWorld(rsPLAYINFO* p,const char* bytes,DWORD size,DWORD code,DWORD now) {
 if(!Match(p,true) || !StageArea || !StageArea[3].lpStage || !StageArea[3].lpStage->Head ||
    p->dwTime_Disconnect || p->dwHopeDisconnectTime) return false;
 TRANS_RECORD_DATA* r=nullptr;
 if(!RecordMatches(p,r)) return false;
 std::lock_guard<std::mutex> lock(worldMutex);
 if(code==kWorldJoin) {
  if(size!=sizeof(WorldJoinRequest))return false;
  WorldJoinRequest q;memcpy(&q,bytes,sizeof(q));
  if(q.size!=size||q.version!=1||q.reserved||!q.serial||q.serial!=p->dwObjectSerial)return false;
  auto old=worlds.find(p);
  if(old!=worlds.end()&&old->second.connection==p->dwConnectCount)return false;
  const int x=r->GameSaveInfo.PosX,z=r->GameSaveInfo.PosZ;
  if(abs(x)>256*100000 || abs(z)>256*100000)return false;
  const int y=StageArea[3].lpStage->GetHeight(x,z);
  if(y==CLIP_OUT || y<=-200*fONE || abs(y)>10000*fONE)return false;
  memcpy(&p->smCharInfo,&r->smCharInfo,sizeof(smCHAR_INFO));
  p->Position.Area=3;p->Position.x=x;p->Position.y=y;p->Position.z=z;
  worlds[p]={p->dwConnectCount,p->dwObjectSerial,0,now,now,now,0,p->getAccount(),p->getName()};
  return SendWorld(p,worlds[p],now,0);
 }
 if(code!=kWorldMove||size!=sizeof(WorldMoveRequest))return false;
 WorldMoveRequest q;memcpy(&q,bytes,sizeof(q));
 auto it=worlds.find(p);if(it==worlds.end())return false;
 auto& w=it->second;
 if(w.connection!=p->dwConnectCount || w.serial!=p->dwObjectSerial || w.account!=p->getAccount() ||
    w.name!=p->getName() || q.size!=size || q.version!=1 || q.reserved || q.direction>8 ||
    w.sequence==0xffffffff || q.sequence!=w.sequence+1 || now-w.lastInput>5000)return false;
 w.sequence=q.sequence;w.lastInput=now;
 const DWORD elapsed=now-w.lastStep;
 int status=0;
 if(q.direction && elapsed>=40) {
  // Clock is server-owned. No accumulated lag credit, client coordinates or speed.
  const int ms=(int)min(elapsed,(DWORD)100);
  const int distance=(50*fONE*ms)/1000;
  POINT3D start={p->Position.x,p->Position.y,p->Position.z};
  POINT3D angle={0,(int)((q.direction-1)*512),0},next=start;
  const bool moved=StageArea[3].lpStage->CheckNextMove(&start,&angle,&next,distance,16*fONE,48*fONE,0)>0;
  const int64_t dx=(int64_t)next.x-start.x,dz=(int64_t)next.z-start.z;
  if(moved && dx*dx+dz*dz<=(int64_t)(distance+2)*(distance+2) &&
     abs(next.y-start.y)<=20*fONE) {
   p->Position.x=next.x;p->Position.y=next.y;p->Position.z=next.z;w.heading=angle.y;
   r->GameSaveInfo.PosX=next.x;r->GameSaveInfo.PosZ=next.z;
   r->GameSaveInfo.SaveTime=(int)tServerTime;
  }else status=1; // Original terrain/collision rejected this step.
  w.lastStep=now;
 } else if(q.direction) status=2; // Too soon: acknowledge without displacement.
 else w.lastStep=now;
 // A stop/heartbeat checkpoints only the authoritative record; disconnect also saves it.
 if(!q.direction && now-w.lastSave>=1000) {
  if(!rsRecordMemoryBuffToFile(p,p->getName().c_str(),p->lpRecordDataBuff))return false;
  w.lastSave=now;
 }
 return SendWorld(p,w,now,status);
}
}
