#pragma once
// Isolated QA preflight, NOT included in the running GameServer.
// ActorContext and TargetContext MUST come from CURRENT native server state,
// never from a browser snapshot. Passing preflight does not apply damage/loot.
#include <cstdint>
#include <cstddef>
#include <cstring>
namespace stormpt_web { namespace combat {
static const std::uint32_t kBasicAttackOpcode=0x53570007u;
struct AttackWire {
 std::uint32_t size,code,version,sequence,target,action,reserved;
};
static_assert(sizeof(AttackWire)==28,"Combat intent ABI must be 28 bytes");
struct ActorContext {
 std::uint32_t serial,connection,expectedConnection,lastSequence,lastAttackAt;
 std::int32_t field,x,y,z,life;
 bool sessionActive,combatAreaAllowed;
};
struct TargetContext {
 std::uint32_t serial,kind,observedAt;
 std::int32_t field,x,y,z,life;
 bool active;
};
enum class Preflight {
 ReadyForNativeCombatRules,Malformed,SessionInvalid,Replay,TargetInvalid,
 NotMonster,TargetDead,WrongField,OutOfRange,StaleTarget,Cooldown
};
inline bool PositionBounded(std::int32_t n) {
 return static_cast<std::int64_t>(n)>=-25600000LL &&
        static_cast<std::int64_t>(n)<=25600000LL;
}
inline Preflight CheckBasicAttackIntent(const void* raw,std::size_t length,
 const ActorContext& actor,const TargetContext& target,std::uint32_t now) {
 if(!raw||length!=sizeof(AttackWire))return Preflight::Malformed;
 AttackWire q={};std::memcpy(&q,raw,sizeof(q));
 if(q.size!=sizeof(q)||q.code!=kBasicAttackOpcode||q.version!=1||
    q.action!=1||q.reserved||!q.sequence||!q.target)return Preflight::Malformed;
 if(!actor.sessionActive||!actor.serial||!actor.connection||
    actor.connection!=actor.expectedConnection||!actor.combatAreaAllowed||
    actor.field<0||actor.field>255||actor.life<=0||
    !PositionBounded(actor.x)||!PositionBounded(actor.y)||!PositionBounded(actor.z))
  return Preflight::SessionInvalid;
 if(actor.lastSequence==0xffffffffu||q.sequence!=actor.lastSequence+1)
  return Preflight::Replay;
 if(!target.active||!target.serial||target.serial!=q.target||
    target.serial==actor.serial||!PositionBounded(target.x)||
    !PositionBounded(target.y)||!PositionBounded(target.z))
  return Preflight::TargetInvalid;
 if(target.kind!=2)return Preflight::NotMonster;
 if(target.life<=0)return Preflight::TargetDead;
 if(target.field!=actor.field)return Preflight::WrongField;
 if(static_cast<std::uint32_t>(now-target.observedAt)>1000u)
  return Preflight::StaleTarget;
 const std::int64_t dx=static_cast<std::int64_t>(actor.x)-target.x;
 const std::int64_t dz=static_cast<std::int64_t>(actor.z)-target.z;
 const std::int64_t dy=static_cast<std::int64_t>(actor.y)-target.y;
 const std::int64_t maxHorizontal=160LL*256; // conservative QA-only melee bound
 if(dx*dx+dz*dz>maxHorizontal*maxHorizontal||
    dy>64LL*256||dy<-(64LL*256))return Preflight::OutOfRange;
 if(actor.lastAttackAt!=0u &&
    static_cast<std::uint32_t>(now-actor.lastAttackAt)<500u)
  return Preflight::Cooldown;
 return Preflight::ReadyForNativeCombatRules;
}
}} // namespace stormpt_web::combat
