from pathlib import Path
from qga_dev import read,write,run
root=r'C:\StormPT-2703\BrowserQA\SourceWeb\SrcServer\src'
b=r'C:\StormPT-2703\Backups\WebMotion-20261023'
ps=r"""$ErrorActionPreference='Stop';$b='C:\StormPT-2703\Backups\WebMotion-20261023';
if(Test-Path $b){throw 'Backup already exists; do not overwrite'}
New-Item -ItemType Directory $b | Out-Null
Copy-Item 'C:\StormPT-2703\Servidor\Server33.exe' ($b+'\Server33.exe')
Copy-Item 'C:\StormPT-2703\Servidor\DataServer' ($b+'\DataServer') -Recurse
Copy-Item 'C:\StormPT-2703\BrowserQA\SourceWeb\SrcServer\src\Server\OnSever.cpp' ($b+'\OnSever.cpp')
Copy-Item 'C:\inetpub\stormpt\jogar-beta' ($b+'\IIS-beta') -Recurse
Get-FileHash ($b+'\Server33.exe') | Select-Object Hash | ConvertTo-Json -Compress"""
print(run(ps))
p=root+r'\Server\OnSever.cpp';s=read(p).decode('latin1')
assert 'browser_world.hpp' not in s
anchor='int DisconnectUser(smWINSOCK *lpsmSock);'
assert anchor in s
s=s.replace(anchor,anchor+'\r\nnamespace stormpt_web { inline bool Match(rsPLAYINFO*,bool); inline bool WorldHealthy(rsPLAYINFO*,DWORD); }',1)
s=s.replace('#include "../BrowserAuth/browser_server_adapter.hpp"','#include "../BrowserAuth/browser_server_adapter.hpp"\r\n#include "../BrowserAuth/browser_world.hpp"')
anchor='\tdwTransCode = IPData[1];'
assert s.count(anchor)==1
s=s.replace(anchor,anchor+'''
    if(dwTransCode==stormpt_web::kWorldJoin || dwTransCode==stormpt_web::kWorldMove) {
        if(dwTransSize<8 || dwTransSize>(DWORD)SockInfo->BuffCnt ||
           !stormpt_web::DispatchWorld(lpPlayInfo,SockInfo->Buff,dwTransSize,dwTransCode,dwTime))
            DisconnectUser(lpsmSock);
        goto quit;
    }
'''.replace('\n','\r\n'))
anchor='if(rsServerConfig.ClientFuncCheckMode)\r\n\t\t\t{\r\n\t\t\t\tif(rsPlayInfo[cnt].dwClientFunChk_NextTime'
assert s.count(anchor)==1
s=s.replace(anchor,'''if(rsServerConfig.ClientFuncCheckMode)
            {
                if(stormpt_web::Match(&rsPlayInfo[cnt],true)) {
                    if(!stormpt_web::WorldHealthy(&rsPlayInfo[cnt],dwPlayServTime))
                        DisconnectUser(rsPlayInfo[cnt].lpsmSock);
                }
                else if(rsPlayInfo[cnt].dwClientFunChk_NextTime'''.replace('\n','\r\n'))
write(p,s.encode('latin1'))
header=Path(__file__).with_name('browser_world.hpp').read_bytes()
write(root+r'\BrowserAuth\browser_world.hpp',header)
print('QA world integration patched; production unchanged')
