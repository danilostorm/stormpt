#include "browser_combat_session_gate.hpp"
#include <iostream>
#include <stdexcept>
#include <string>
using namespace stormpt_web::combat;
static int n=0;
#define CHECK(x) do {++n;if(!(x))throw std::runtime_error("check failed "+std::to_string(__LINE__));} while(0)
int main(){try{
 SessionAttackGate gate;
 AttackWire w={28,kBasicAttackOpcode,1,1,99,1,0};
 ActorContext a={11,7,7,0,0,4,0,0,0,100,true,true};
 TargetContext t={99,2,950,4,100*256,0,0,20,true};
 bool accepted=false;int calls=0;
 auto run=[&](std::uint32_t now,bool ok){return TryBasicAttack(gate,&w,sizeof(w),a,t,now,[&](){++calls;return ok;},accepted);};
 CHECK(run(1000,true)==Preflight::SessionInvalid);
 CHECK(calls==0&&!accepted);
 gate.BindAuthenticated(7);
 CHECK(gate.authenticated&&gate.connection==7);
 CHECK(run(1000,false)==Preflight::ReadyForNativeCombatRules);
 CHECK(!accepted&&calls==1&&gate.lastSequence==0&&gate.lastAttackAt==0);
 CHECK(run(1000,true)==Preflight::ReadyForNativeCombatRules);
 CHECK(accepted&&calls==2&&gate.lastSequence==1&&gate.lastAttackAt==1000);
 CHECK(run(1001,true)==Preflight::Replay);
 CHECK(calls==2&&!accepted);
 w.sequence=2;CHECK(run(1100,true)==Preflight::Cooldown);
 CHECK(calls==2&&!accepted);
 t.life=0;CHECK(run(1600,true)==Preflight::TargetDead);
 CHECK(calls==2&&gate.lastSequence==1);t.life=20;t.observedAt=1550;
 a.connection=8;CHECK(run(1600,true)==Preflight::SessionInvalid);
 CHECK(calls==2);a.connection=7;
 CHECK(run(1600,true)==Preflight::ReadyForNativeCombatRules);
 CHECK(accepted&&calls==3&&gate.lastSequence==2&&gate.lastAttackAt==1600);
 gate.Revoke();CHECK(!gate.authenticated&&gate.connection==0);
 CHECK(run(2200,true)==Preflight::SessionInvalid&&calls==3);
 gate.BindAuthenticated(9);a.connection=9;a.expectedConnection=9;
 w.sequence=1;t.observedAt=2150;
 CHECK(run(2200,true)==Preflight::ReadyForNativeCombatRules);
 CHECK(accepted&&gate.lastSequence==1&&calls==4);
 gate.Revoke();CHECK(gate.lastSequence==0&&gate.lastAttackAt==0);
 // Reentrancy cannot run native rules twice on the same connection.
 gate.BindAuthenticated(7);a.connection=7;a.expectedConnection=7;
 w.sequence=1;t.observedAt=2250;
 int nestedCalls=0;
 CHECK(TryBasicAttack(gate,&w,sizeof(w),a,t,2300,[&](){
  bool innerAccepted=true;
  const auto nested=TryBasicAttack(gate,&w,sizeof(w),a,t,2300,
    [&](){++nestedCalls;return true;},innerAccepted);
  CHECK(nested==Preflight::SessionInvalid);
  CHECK(!innerAccepted&&nestedCalls==0);
  return false;
 },accepted)==Preflight::ReadyForNativeCombatRules);
 CHECK(!accepted&&!gate.inFlight&&gate.lastSequence==0);
 // Revoke inside callback must not revive or advance a stale session.
 t.observedAt=2350;
 CHECK(TryBasicAttack(gate,&w,sizeof(w),a,t,2400,[&](){
  gate.Revoke();return true;
 },accepted)==Preflight::SessionInvalid);
 CHECK(!accepted&&!gate.authenticated&&gate.lastSequence==0);
 // Rebinding to the SAME connection still invalidates the old generation.
 gate.BindAuthenticated(7);t.observedAt=2450;
 const auto oldGeneration=gate.generation;
 CHECK(TryBasicAttack(gate,&w,sizeof(w),a,t,2500,[&](){
  gate.BindAuthenticated(7);return true;
 },accepted)==Preflight::SessionInvalid);
 CHECK(!accepted&&gate.generation>oldGeneration&&gate.lastSequence==0);
 // Exceptions leave the gate reusable, without consuming the sequence.
 t.observedAt=2550;
 try {
  TryBasicAttack(gate,&w,sizeof(w),a,t,2600,[&]()->bool{
   throw std::runtime_error("native callback failed");
  },accepted);
  CHECK(false);
 }catch(const std::runtime_error& e){CHECK(std::string(e.what())=="native callback failed");}
 CHECK(!accepted&&!gate.inFlight&&gate.lastSequence==0);
 CHECK(TryBasicAttack(gate,&w,sizeof(w),a,t,2600,[&](){
  return true;
 },accepted)==Preflight::ReadyForNativeCombatRules);
 CHECK(accepted&&gate.lastSequence==1&&gate.lastAttackAt==2600);
 gate.Revoke();CHECK(!gate.inFlight&&!gate.authenticated);
 std::cout<<"combat-session-gate-checks="<<n<<" passed\n";
 return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<"\n";return 1;}}
