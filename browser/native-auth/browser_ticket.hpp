#pragma once
// Native browser ticket verification. No password/checksum substitution.
// Only a dedicated GameServer entry point may call this; legacy login is unchanged.
#include <windows.h>
#include <bcrypt.h>
#include <cstdint>
#include <string>
#include <vector>
#include <regex>
#include <map>
#include <mutex>
#pragma comment(lib, "bcrypt.lib")
namespace stormpt_web {
inline std::string encode64(const std::string& in) {
    static const char* table="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    std::string out; unsigned int value=0; int bits=-6;
    for (unsigned char c:in) {value=(value<<8)|c; bits+=8;
        while(bits>=0){out+=table[(value>>bits)&63];bits-=6;}}
    if(bits>-6)out+=table[((value<<8)>>(bits+8))&63];
    return out;
}
inline bool decode64(const std::string& in,std::string& out) {
    if(in.empty()||in.size()%4==1)return false;
    const std::string table="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    unsigned int value=0; int bits=-8; out.clear();
    for(char c:in){auto n=table.find(c);if(n==std::string::npos)return false;
        value=(value<<6)|static_cast<unsigned int>(n);bits+=6;
        if(bits>=0){out+=static_cast<char>((value>>bits)&255);bits-=8;}}
    return encode64(out)==in;
}
inline bool hmac256(const std::string& key,const std::string& data,std::string& out){
    BCRYPT_ALG_HANDLE alg=nullptr; BCRYPT_HASH_HANDLE hash=nullptr;
    bool ok=false; DWORD size=0,got=0;
    if(BCryptOpenAlgorithmProvider(&alg,BCRYPT_SHA256_ALGORITHM,nullptr,BCRYPT_ALG_HANDLE_HMAC_FLAG)<0)return false;
    if(BCryptGetProperty(alg,BCRYPT_OBJECT_LENGTH,reinterpret_cast<PUCHAR>(&size),sizeof(size),&got,0)>=0){
        std::vector<unsigned char> object(size); unsigned char digest[32]={0};
        if(BCryptCreateHash(alg,&hash,object.data(),size,
            reinterpret_cast<PUCHAR>(const_cast<char*>(key.data())),static_cast<ULONG>(key.size()),0)>=0){
            if(BCryptHashData(hash,reinterpret_cast<PUCHAR>(const_cast<char*>(data.data())),
                static_cast<ULONG>(data.size()),0)>=0 && BCryptFinishHash(hash,digest,32,0)>=0){
                out.assign(reinterpret_cast<char*>(digest),32);ok=true;
            }
            BCryptDestroyHash(hash);
        }
        SecureZeroMemory(object.data(),object.size());
        SecureZeroMemory(digest,sizeof(digest));
    }
    BCryptCloseAlgorithmProvider(alg,0);return ok;
}
struct Claims {std::string account,sid; std::int64_t expires=0;};
class TicketVerifier {
    std::string secret_;
    std::map<std::string,std::int64_t> used_;
    std::mutex mutex_;
public:
    explicit TicketVerifier(const std::string& secret):secret_(secret){}
    ~TicketVerifier(){if(!secret_.empty())SecureZeroMemory(&secret_[0],secret_.size());}
    // Exact canonical JSON contract, deliberately no permissive JSON parsing.
    // Gateway and GameServer must use distinct audience/key pairs.
    bool consume(const std::string& token,std::int64_t now,Claims& result){
        result=Claims{};
        if(secret_.size()<32||token.size()>1024||now<0)return false;
        const auto dot=token.find('.');
        if(dot==std::string::npos||token.find('.',dot+1)!=std::string::npos)return false;
        const auto payload=token.substr(0,dot);
        std::string received,expected,json;
        if(!decode64(token.substr(dot+1),received)||received.size()!=32||
           !hmac256(secret_,payload,expected))return false;
        unsigned int diff=0;
        for(size_t i=0;i<32;++i)diff|=static_cast<unsigned char>(received[i]^expected[i]);
        if(diff||!decode64(payload,json))return false;
        static const std::regex pattern(
            R"ticket(^\{"aud":"stormpt-gameserver","account":"([A-Za-z][A-Za-z0-9_]{3,15})","exp":([0-9]{1,11}),"nonce":"([A-Za-z0-9_-]{22})","sid":"([0-9a-f]{32})"\}$)ticket");
        std::smatch match;
        if(!std::regex_match(json,match,pattern))return false;
        std::int64_t exp=0;
        try{exp=std::stoll(match[2].str());}catch(...){return false;}
        if(exp<=now||exp-now>60)return false;
        std::string nonceBytes;
        if(!decode64(match[3].str(),nonceBytes)||nonceBytes.size()!=16)return false;
        std::lock_guard<std::mutex> lock(mutex_);
        for(auto it=used_.begin();it!=used_.end();){
            if(it->second<=now)it=used_.erase(it);else ++it;
        }
        const auto nonce=match[3].str();
        if(used_.size()>=10000||used_.count(nonce))return false;
        used_.emplace(nonce,exp);
        result.account=match[1].str();result.sid=match[4].str();result.expires=exp;
        return true;
    }
};
}
