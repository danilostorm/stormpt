#pragma once
// Pilot adapter for the real GameServer. Enabled only for an explicit QA account.
#include "browser_ticket.hpp"
#include <fstream>
#include <memory>
#include <map>
#include <mutex>
#include <cstring>
#include <ctime>
#include <ctime>
#include <ctime>
#include <ctime>
namespace stormpt_web {
constexpr unsigned int kMagic=0x31575453; // STW1, explicit web envelope
constexpr unsigned int kVersion=1;
struct LoginEnvelope {
    unsigned int size,code,magic,version;
    char ticket[1024];
};
static_assert(sizeof(LoginEnvelope)==1040,"Web login layout mismatch");
struct ServerSession { DWORD connection; std::string account,sid; bool active; };
static std::map<rsPLAYINFO*,ServerSession> sessions;
static std::mutex sessionsMutex;
inline std::string Environment(const char* name){
    char value[512]={0}; DWORD n=GetEnvironmentVariableA(name,value,sizeof(value));
    return n>0&&n<sizeof(value)?std::string(value,n):std::string();
}
inline bool PilotAccountAllowed(const std::string& account){
    if(account.empty())return false;
    const auto legacy=Environment("STORMPT_WEB_QA_ACCOUNT");
    if(!legacy.empty()&&account==legacy)return true;
    std::ifstream file("C:/StormPT-2703/BrowserSecrets/qa-account.txt");
    std::string line;
    while(std::getline(file,line)){
        if(!line.empty()&&line.back()=='\r')line.pop_back();
        if(!line.empty()&&line==account)return true;
    }
    return false;
}
inline TicketVerifier* Verifier(){
    static std::unique_ptr<TicketVerifier> verifier=[](){
        const auto path=Environment("STORMPT_GAMESERVER_KEY_PATH");
        if(path.empty())return std::unique_ptr<TicketVerifier>();
        std::ifstream f(path,std::ios::binary);
        std::string key; std::getline(f,key);
        if(!key.empty()&&key.back()=='\r')key.pop_back();
        if(!f||key.size()<32||key.size()>256)return std::unique_ptr<TicketVerifier>();
        auto result=std::unique_ptr<TicketVerifier>(new TicketVerifier(key));
        SecureZeroMemory(&key[0],key.size());return result;
    }();
    return verifier.get();
}
inline bool Match(rsPLAYINFO* player, bool requireActive){
    if(!player||!player->lpsmSock)return false;
    std::lock_guard<std::mutex> lock(sessionsMutex);
    auto it=sessions.find(player);
    return it!=sessions.end()&&it->second.connection==player->dwConnectCount&&
        it->second.account==player->getAccount()&&(!requireActive||it->second.active);
}
inline bool Activate(rsPLAYINFO* player){
    if(!player||!player->lpsmSock)return false;
    std::lock_guard<std::mutex> lock(sessionsMutex);
    auto it=sessions.find(player);
    if(it==sessions.end()||it->second.connection!=player->dwConnectCount||
       it->second.account!=player->getAccount())return false;
    it->second.active=true;return true;
}
inline void Forget(rsPLAYINFO* player){
    std::lock_guard<std::mutex> lock(sessionsMutex);sessions.erase(player);
}
inline bool Authorize(rsPLAYINFO* player,const char* data,size_t size,Claims& claims){
    if(!player||!player->lpsmSock||!player->getAccount().empty()||
       size!=sizeof(LoginEnvelope))return false;
    LoginEnvelope envelope;std::memcpy(&envelope,data,sizeof(envelope));
    if(envelope.size!=sizeof(envelope)||envelope.code!=8||
       envelope.magic!=kMagic||envelope.version!=kVersion)return false;
    auto end=static_cast<const char*>(std::memchr(envelope.ticket,0,sizeof(envelope.ticket)));
    if(!end||end==envelope.ticket)return false;
    // Zero padding prevents hidden payloads and ambiguous wire representations.
    for(auto p=end;p<envelope.ticket+sizeof(envelope.ticket);++p)if(*p)return false;
    auto verifier=Verifier();
    if(!verifier||!verifier->consume(std::string(envelope.ticket,static_cast<size_t>(end-envelope.ticket)),
        static_cast<std::int64_t>(std::time(nullptr)),claims))return false;
    if(!PilotAccountAllowed(claims.account))return false;
    std::lock_guard<std::mutex> lock(sessionsMutex);
    sessions[player]={player->dwConnectCount,claims.account,claims.sid,false};
    return true;
}
}
