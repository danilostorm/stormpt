#pragma once
// Isolated QA gate, NOT linked into GameServer. No damage, EXP or loot.
#include "browser_combat_intent.hpp"
namespace stormpt_web { namespace combat {
struct SessionAttackGate {
 std::uint32_t connection=0,lastSequence=0,lastAttackAt=0;
 bool authenticated=false;
 void BindAuthenticated(std::uint32_t id) {connection=id;lastSequence=0;lastAttackAt=0;authenticated=id!=0;}
 void Revoke(){connection=lastSequence=lastAttackAt=0;authenticated=false;}
};
// Only use current native server state. Serialize per connection.
// NativeRules returns true only after the original server accepts an attack.
template<class NativeRules>
Preflight TryBasicAttack(SessionAttackGate& gate,const void* packet,
 std::size_t length,ActorContext actor,const TargetContext& target,
 std::uint32_t now,NativeRules nativeRules,bool& accepted) {
 accepted=false;
 if(!gate.authenticated||!gate.connection||actor.connection!=gate.connection||
    actor.expectedConnection!=gate.connection)return Preflight::SessionInvalid;
 actor.lastSequence=gate.lastSequence;actor.lastAttackAt=gate.lastAttackAt;
 auto result=CheckBasicAttackIntent(packet,length,actor,target,now);
 if(result!=Preflight::ReadyForNativeCombatRules)return result;
 if(!nativeRules())return result; // rejected native attack does not consume sequence
 AttackWire wire={};std::memcpy(&wire,packet,sizeof(wire));
 gate.lastSequence=wire.sequence;gate.lastAttackAt=now;accepted=true;
 return result;
}
}}
