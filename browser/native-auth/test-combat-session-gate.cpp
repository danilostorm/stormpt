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
 ActorContext a={11,7,7,0,0,3,0,0,0,100,true};
 TargetContext t={99,2,950,3,100*256,0,0,20,true};
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
 std::cout<<"combat-session-gate-checks="<<n<<" passed\n";
 return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<"\n";return 1;}}
