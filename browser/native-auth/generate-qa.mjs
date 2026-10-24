import {createHmac} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const key='StormPT-QA-ONLY-Not-A-Production-Key-20261023';
const now=1792756800;
const base={aud:'stormpt-gameserver',account:'webqatest',exp:now+45,nonce:'AAECAwQFBgcICQoLDA0ODw',sid:'0123456789abcdef0123456789abcdef'};
const sign=(claims)=>{const p=Buffer.from(typeof claims==='string'?claims:JSON.stringify(claims)).toString('base64url');return p+'.'+createHmac('sha256',key).update(p).digest('base64url');};
const cases=[
['valid',sign(base),now,true],
['expired',sign({...base,exp:now}),now,false],
['too-long-ttl',sign({...base,exp:now+61}),now,false],
['wrong-audience',sign({...base,aud:'stormpt-browser-tcp'}),now,false],
['invalid-account',sign({...base,account:'../admin'}),now,false],
['short-account',sign({...base,account:'abc'}),now,false],
['long-account',sign({...base,account:'a'.repeat(17)}),now,false],
['wrong-sid',sign({...base,sid:'A'.repeat(32)}),now,false],
['wrong-nonce',sign({...base,nonce:'x'.repeat(21)}),now,false],
['duplicate-account',sign(JSON.stringify(base).replace('"exp":','"account":"intruder","exp":')),now,false],
['extra-field',sign({...base,admin:true}),now,false],
['future-time',sign(base),now+46,false],
['negative-time',sign(base),-1,false],
['bad-signature',sign(base).slice(0,-1)+'!',now,false],
['empty','',now,false],
['oversized','x'.repeat(1025),now,false],
['extra-dot',sign(base)+'.x',now,false],
['padded',sign(base)+'=',now,false],
];
const lines=cases.map(([name,t,time,ok])=>'{ TicketVerifier v(key); Claims c; if(v.consume('+JSON.stringify(t)+','+time+',c)!='+(ok?'true':'false')+') {std::cerr<<'+JSON.stringify(name)+'<<" failed\\n";return 1;} if('+(!ok?'true':'false')+'&&!c.account.empty())return 2; ++passed; }');
const cpp='#include "browser_ticket.hpp"\n#include <iostream>\n#include <fstream>\n#include <thread>\n#include <atomic>\nusing namespace stormpt_web;\nint main(){const std::string key='+JSON.stringify(key)+';int passed=0;\n'+lines.join('\n')+
'\n{TicketVerifier v(key);Claims c;if(!v.consume('+JSON.stringify(sign(base))+','+now+',c)||c.account!="webqatest"||v.consume('+JSON.stringify(sign(base))+','+now+',c))return 3;++passed;}\n'+
'{TicketVerifier v("short");Claims c;if(v.consume('+JSON.stringify(sign(base))+','+now+',c))return 4;++passed;}\n'+
'{TicketVerifier v(key);std::atomic<int> accepted{0};std::vector<std::thread> workers;for(int i=0;i<16;i++)workers.emplace_back([&]{Claims c;if(v.consume('+JSON.stringify(sign(base))+','+now+',c))++accepted;});for(auto& t:workers)t.join();if(accepted!=1)return 5;++passed;}\n'+
'{std::ifstream f("csharp-ticket.txt");std::string token;std::getline(f,token);TicketVerifier v(key);Claims c;if(!v.consume(token,1792756800,c)||c.account!="webqatest"){std::cerr<<"C# ticket rejected";return 6;}++passed;}\n'+
'std::cout<<"Native auth: "<<passed<<" checks passed; Node HMAC -> Windows BCrypt, replay and concurrency\\n";return 0;}\n';
writeFileSync(new URL('./ticket_qa.cpp',import.meta.url),cpp);
console.log('Generated '+cases.length+' signed QA vectors (synthetic key only)');
