#pragma once
// Isolated QA gate, NOT linked into GameServer. No damage, EXP or loot.
#include "browser_combat_intent.hpp"
namespace stormpt_web { namespace combat {
struct SessionAttackGate {
 std::uint32_t connection=0,lastSequence=0,lastAttackAt=0;
 std::uint64_t generation=0;
 bool authenticated=false,inFlight=false;
 // Generation invalidates in-flight callbacks on logout/rebind, even to same connection.
 void BindAuthenticated(std::uint32_t id) {
  ++generation;connection=id;lastSequence=0;lastAttackAt=0;
  authenticated=id!=0;inFlight=false;
 }
 void Revoke(){
  ++generation;connection=lastSequence=lastAttackAt=0;
  authenticated=false;inFlight=false;
 }
};
// Only use current native server state. Serialize per connection on the native
// server event thread. This is NOT a thread synchronization primitive.
// NativeRules must run synchronously under the original server's authoritative
// session/entity lock. Never allow browser-controlled damage or rewards.
// Revocation during a callback invalidates acceptance but cannot undo native
// side effects; live integration requires transactional original server rules.
template<class NativeRules>
Preflight TryBasicAttack(SessionAttackGate& gate,const void* packet,
 std::size_t length,ActorContext actor,const TargetContext& target,
 std::uint32_t now,NativeRules nativeRules,bool& accepted) {
 accepted=false;
 if(gate.inFlight||!gate.authenticated||!gate.connection||actor.connection!=gate.connection||
    actor.expectedConnection!=gate.connection)return Preflight::SessionInvalid;
 actor.lastSequence=gate.lastSequence;actor.lastAttackAt=gate.lastAttackAt;
 auto result=CheckBasicAttackIntent(packet,length,actor,target,now);
 if(result!=Preflight::ReadyForNativeCombatRules)return result;
 const std::uint64_t generation=gate.generation;
 gate.inFlight=true;
 bool nativeAccepted=false;
 try { nativeAccepted=nativeRules(); }
 catch(...) {
  if(gate.generation==generation)gate.inFlight=false;
  throw;
 }
 // A callback may revoke/rebind the session; do not commit an old attack.
 if(gate.generation!=generation||!gate.authenticated||
    gate.connection!=actor.connection)return Preflight::SessionInvalid;
 gate.inFlight=false;
 if(!nativeAccepted)return result; // rejected native attack does not consume sequence
 AttackWire wire={};std::memcpy(&wire,packet,sizeof(wire));
 gate.lastSequence=wire.sequence;gate.lastAttackAt=now;accepted=true;
 return result;
}
}}
