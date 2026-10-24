#pragma once
// QA-only, read-only native state resolvers for the isolated combat intent.
// This file is NOT linked into the running GameServer. Call only while the
// original server owns its world/session locks. No damage or reward mutation.
#include "browser_combat_intent.hpp"
#include <cstddef>
#include <cstdint>
#include <string>

namespace stormpt_web { namespace combat {

// Require a live, uniquely identified original enemy in the exact native stage.
// The client cannot supply position, life, state, stage or observation time.
template<class AutoPlayer, std::size_t N>
bool ResolveNativeMonster(const AutoPlayer (&units)[N], std::uint32_t serial,
                          const void* nativeStage, int enemyState,
                          std::uint32_t serverNow, TargetContext& out) {
 out=TargetContext{};
 if(!serial||!nativeStage||N==0)return false;
 const AutoPlayer* candidate=nullptr;
 for(const auto& c:units) {
  if(!c.Flag||c.dwObjectSerial!=serial)continue;
  // Serial collision is ambiguous even across stages: fail closed.
  if(candidate)return false;
  candidate=&c;
 }
 if(!candidate||candidate->lpExt1!=nativeStage||
    candidate->smCharInfo.State!=enemyState||
    candidate->smCharInfo.Life[0]<=0||
    candidate->smCharInfo.Life[1]<candidate->smCharInfo.Life[0]||
    candidate->smCharInfo.Life[1]<=0||
    !PositionBounded(candidate->pX)||
    !PositionBounded(candidate->pY)||
    !PositionBounded(candidate->pZ))return false;
 out={serial,2u,serverNow,3,candidate->pX,candidate->pY,candidate->pZ,
      candidate->smCharInfo.Life[0],true};
 return true;
}

// Construct actor only from the authenticated original player + active world.
// A caller MUST additionally hold the world/session locks and call Match(p,true).
template<class Player, class World>
bool ResolveNativeActor(Player& p,const World& w,bool sessionVerified,
                        std::uint32_t serverNow,ActorContext& out) {
 out=ActorContext{};
 if(!sessionVerified||!p.lpsmSock||p.dwTime_Disconnect||
    p.dwHopeDisconnectTime||p.CharLoadingCount!=1||
    !p.dwObjectSerial||!p.dwConnectCount||
    p.dwObjectSerial!=w.serial||p.dwConnectCount!=w.connection||
    p.getAccount()!=w.account||p.getName()!=w.name||
    p.Position.Area!=3||p.smCharInfo.Life[0]<=0||
    p.smCharInfo.Life[1]<p.smCharInfo.Life[0]||
    p.smCharInfo.Life[1]<=0||
    static_cast<std::int32_t>(serverNow-w.lastInput)<0||
    static_cast<std::int32_t>(serverNow-w.lastInput)>=5000||
    !PositionBounded(p.Position.x)||!PositionBounded(p.Position.y)||
    !PositionBounded(p.Position.z))return false;
 out={p.dwObjectSerial,p.dwConnectCount,w.connection,0u,0u,
      p.Position.Area,p.Position.x,p.Position.y,p.Position.z,
      p.smCharInfo.Life[0],true};
 return true;
}
}} // namespace stormpt_web::combat
