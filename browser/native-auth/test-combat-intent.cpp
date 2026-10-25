#include "browser_combat_intent.hpp"
#include <iostream>
#include <stdexcept>
#include <string>
using namespace stormpt_web::combat;
static int checks=0;
#define CHECK(x) do {++checks;if(!(x))throw std::runtime_error("combat preflight check failed at line " + std::to_string(__LINE__));} while(0)
int main(){
 try {
 AttackWire w={28,kBasicAttackOpcode,1,1,99,1,0};
 ActorContext a={11,7,7,0,0,4,0,0,0,100,true,true};
 TargetContext t={99,2,950,4,100*256,0,0,20,true};
 const auto evaluate=[&](){return CheckBasicAttackIntent(&w,sizeof(w),a,t,1000);};
 CHECK(evaluate()==Preflight::ReadyForNativeCombatRules);
 CHECK(CheckBasicAttackIntent(nullptr,sizeof(w),a,t,1000)==Preflight::Malformed);
 CHECK(CheckBasicAttackIntent(&w,sizeof(w)-1,a,t,1000)==Preflight::Malformed);
 w.code=0;CHECK(evaluate()==Preflight::Malformed);w.code=kBasicAttackOpcode;
 w.version=2;CHECK(evaluate()==Preflight::Malformed);w.version=1;
 w.reserved=1;CHECK(evaluate()==Preflight::Malformed);w.reserved=0;
 w.action=2;CHECK(evaluate()==Preflight::Malformed);w.action=1;
 w.target=0;CHECK(evaluate()==Preflight::Malformed);w.target=99;
 w.sequence=0;CHECK(evaluate()==Preflight::Malformed);w.sequence=1;
 a.sessionActive=false;CHECK(evaluate()==Preflight::SessionInvalid);a.sessionActive=true;
 a.expectedConnection=8;CHECK(evaluate()==Preflight::SessionInvalid);a.expectedConnection=7;
 a.life=0;CHECK(evaluate()==Preflight::SessionInvalid);a.life=100;
 a.combatAreaAllowed=false;CHECK(evaluate()==Preflight::SessionInvalid);a.combatAreaAllowed=true;
 a.field=3;t.field=3;a.combatAreaAllowed=false;CHECK(evaluate()==Preflight::SessionInvalid);
 a.field=4;t.field=4;a.combatAreaAllowed=true;
 a.field=-1;CHECK(evaluate()==Preflight::SessionInvalid);a.field=4;
 a.field=256;CHECK(evaluate()==Preflight::SessionInvalid);a.field=4;
 a.lastSequence=1;CHECK(evaluate()==Preflight::Replay);a.lastSequence=0;
 a.lastSequence=0xffffffffu;CHECK(evaluate()==Preflight::Replay);a.lastSequence=0;
 t.active=false;CHECK(evaluate()==Preflight::TargetInvalid);t.active=true;
 t.serial=11;CHECK(evaluate()==Preflight::TargetInvalid);t.serial=99;
 t.kind=3;CHECK(evaluate()==Preflight::NotMonster);t.kind=2;
 t.life=0;CHECK(evaluate()==Preflight::TargetDead);t.life=20;
 t.field=3;CHECK(evaluate()==Preflight::WrongField);t.field=4;
 t.observedAt=0;CHECK(CheckBasicAttackIntent(&w,sizeof(w),a,t,1001)==Preflight::StaleTarget);t.observedAt=950;
 t.x=161*256;CHECK(evaluate()==Preflight::OutOfRange);t.x=100*256;
 t.y=65*256;CHECK(evaluate()==Preflight::OutOfRange);t.y=0;
 a.lastAttackAt=900;CHECK(evaluate()==Preflight::Cooldown);a.lastAttackAt=0;
 a.x=30000000;CHECK(evaluate()==Preflight::SessionInvalid);a.x=0;
 t.x=30000000;CHECK(evaluate()==Preflight::TargetInvalid);t.x=100*256;
 CHECK(evaluate()==Preflight::ReadyForNativeCombatRules);
 std::cout<<"combat-preflight-checks="<<checks<<" passed\n";return 0;
 }catch(const std::exception& e){std::cerr<<e.what()<<"\n";return 1;}
}
