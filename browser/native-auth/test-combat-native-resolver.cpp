#include "browser_combat_native_resolver.hpp"
#include "browser_combat_session_gate.hpp"
#include <iostream>
#include <stdexcept>
#include <string>
using namespace stormpt_web::combat;
static int checks=0;
#define CHECK(x) do {++checks;if(!(x))throw std::runtime_error("failed line "+std::to_string(__LINE__));} while(0)
struct CharInfo {int State=2;int Life[2]={25,25};};
struct Unit {bool Flag=false;std::uint32_t dwObjectSerial=0;const void* lpExt1=nullptr;
 CharInfo smCharInfo;int pX=0,pY=0,pZ=0;};
struct NativePosition {int Area=3,x=0,y=0,z=0;};
struct Player {void* lpsmSock=(void*)1;std::uint32_t dwObjectSerial=11,dwConnectCount=7;
 std::uint32_t dwTime_Disconnect=0,dwHopeDisconnectTime=0;int CharLoadingCount=1;
 NativePosition Position;CharInfo smCharInfo;
 std::string account="qa",name="Fighter";
 std::string getAccount(){return account;}std::string getName(){return name;}
};
struct World {std::uint32_t serial=11,connection=7,lastInput=950;
 std::string account="qa",name="Fighter";};
int main(){try{
 int stage3=3,stage4=4;
 Unit units[3];units[0].Flag=true;units[0].dwObjectSerial=99;
 units[0].lpExt1=&stage3;units[0].pX=100*256;
 TargetContext t={};
 auto resolve=[&](){return ResolveNativeMonster(units,99,&stage3,2,1000,t);};
 CHECK(resolve());CHECK(t.active&&t.serial==99&&t.kind==2);
 CHECK(t.field==3&&t.observedAt==1000&&t.x==100*256&&t.life==25);
 CHECK(!ResolveNativeMonster(units,0,&stage3,2,1000,t));
 CHECK(!t.active);
 CHECK(!ResolveNativeMonster(units,99,nullptr,2,1000,t));
 CHECK(!ResolveNativeMonster(units,100,&stage3,2,1000,t));
 units[0].smCharInfo.State=1;CHECK(!resolve()); // NPC
 units[0].smCharInfo.State=3;CHECK(!resolve()); // player
 units[0].smCharInfo.State=2;CHECK(resolve());
 units[0].lpExt1=&stage4;CHECK(!resolve());units[0].lpExt1=&stage3;
 units[0].Flag=false;CHECK(!resolve());units[0].Flag=true;
 units[0].smCharInfo.Life[0]=0;CHECK(!resolve());
 units[0].smCharInfo.Life[0]=-1;CHECK(!resolve());
 units[0].smCharInfo.Life[0]=26;CHECK(!resolve());
 units[0].smCharInfo.Life[0]=25;
 units[0].smCharInfo.Life[1]=0;CHECK(!resolve());
 units[0].smCharInfo.Life[1]=25;
 units[0].pX=25600001;CHECK(!resolve());units[0].pX=100*256;
 units[0].pY=-25600001;CHECK(!resolve());units[0].pY=0;
 units[0].pZ=25600001;CHECK(!resolve());units[0].pZ=0;
 units[1]=units[0];CHECK(!resolve()); // duplicate same stage
 units[1].lpExt1=&stage4;CHECK(!resolve()); // duplicate across stages
 units[1].Flag=false;CHECK(resolve());
 units[1].Flag=true;units[1].dwObjectSerial=100;CHECK(resolve());
 Player p;World w;ActorContext a={};
 auto actor=[&](bool ok){return ResolveNativeActor(p,w,ok,1000,a);};
 CHECK(actor(true));CHECK(a.sessionActive&&a.serial==11&&a.connection==7);
 CHECK(a.field==3&&a.life==25&&a.x==0);
 CHECK(!actor(false));CHECK(!a.sessionActive);
 p.lpsmSock=nullptr;CHECK(!actor(true));p.lpsmSock=(void*)1;
 p.dwConnectCount=8;CHECK(!actor(true));p.dwConnectCount=7;
 p.dwObjectSerial=12;CHECK(!actor(true));p.dwObjectSerial=11;
 p.account="intruder";CHECK(!actor(true));p.account="qa";
 p.name="Other";CHECK(!actor(true));p.name="Fighter";
 p.dwTime_Disconnect=1;CHECK(!actor(true));p.dwTime_Disconnect=0;
 p.dwHopeDisconnectTime=1;CHECK(!actor(true));p.dwHopeDisconnectTime=0;
 p.CharLoadingCount=0;CHECK(!actor(true));p.CharLoadingCount=1;
 p.Position.Area=4;CHECK(!actor(true));p.Position.Area=3;
 p.smCharInfo.Life[0]=0;CHECK(!actor(true));p.smCharInfo.Life[0]=25;
 p.smCharInfo.Life[1]=24;CHECK(!actor(true));p.smCharInfo.Life[1]=25;
 w.lastInput=0;CHECK(!ResolveNativeActor(p,w,true,6000,a));w.lastInput=950;
 w.lastInput=1001;CHECK(!actor(true));w.lastInput=950;
 p.Position.x=25600001;CHECK(!actor(true));p.Position.x=0;
 p.Position.y=-25600001;CHECK(!actor(true));p.Position.y=0;
 p.Position.z=25600001;CHECK(!actor(true));p.Position.z=0;
 w.account="other";CHECK(!actor(true));w.account="qa";
 w.name="Other";CHECK(!actor(true));w.name="Fighter";
 w.serial=12;CHECK(!actor(true));w.serial=11;
 w.connection=8;CHECK(!actor(true));w.connection=7;
 CHECK(actor(true));CHECK(resolve());
 // Cross the wire-to-native boundary without simulating damage.
 AttackWire q={28,kBasicAttackOpcode,1,1,99,1,0};
 SessionAttackGate gate;gate.BindAuthenticated(7);
 bool accepted=true;int callbackCalls=0;
 auto result=TryBasicAttack(gate,&q,sizeof(q),a,t,1000,[&](){
   ++callbackCalls;return false; // native combat not implemented
 },accepted);
 CHECK(result==Preflight::ReadyForNativeCombatRules);
 CHECK(!accepted&&callbackCalls==1&&gate.lastSequence==0);
 q.target=100; // forged target cannot be resolved as 99
 CHECK(TryBasicAttack(gate,&q,sizeof(q),a,t,1000,[&](){
   ++callbackCalls;return true;
 },accepted)==Preflight::TargetInvalid);
 CHECK(!accepted&&callbackCalls==1);
 q.target=99;
 units[0].smCharInfo.State=1;CHECK(!resolve()); // NPC cannot enter gate
 CHECK(!t.active);
 std::cout<<"native-resolver-checks="<<checks<<" passed\n";
 return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<"\n";return 1;}}
