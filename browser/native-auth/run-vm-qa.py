import json,subprocess,base64
from pathlib import Path
root=Path('/mnt/user/appdata/stormpt-browser/native-auth')
handler='\n'.join(x for x in (root.parent/'research/browser-ticket-draft.ashx').read_text().splitlines() if not x.startswith('<%@'))
(root/'StormPTBrowserTicket.cs').write_text(handler)
bat='@echo off\r\ncall C:\\Program\\VC\\Auxiliary\\Build\\vcvars32.bat >nul\r\nif errorlevel 1 exit /b 1\r\ncd /d C:\\StormPT-2703\\BrowserQA\\NativeAuth\r\nC:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe /nologo /r:System.Web.dll /out:NativeIssuerQA.exe StormPTBrowserTicket.cs NativeIssuerQA.cs\r\nif errorlevel 1 exit /b 1\r\nNativeIssuerQA.exe\r\nif errorlevel 1 exit /b 1\r\ncl /nologo /std:c++17 /EHsc /W4 ticket_qa.cpp /Fe:ticket_qa.exe\r\nif errorlevel 1 exit /b 1\r\nticket_qa.exe\r\n'
(root/'run-qa.cmd').write_text(bat)
ps="$d='C:\\StormPT-2703\\BrowserQA\\NativeAuth'; New-Item -ItemType Directory -Force $d | Out-Null; "
for name in ['browser_ticket.hpp','ticket_qa.cpp','run-qa.cmd','StormPTBrowserTicket.cs','NativeIssuerQA.cs']:
 b=base64.b64encode((root/name).read_bytes()).decode()
 ps+="[IO.File]::WriteAllBytes($d+'\\"+name+"',[Convert]::FromBase64String('"+b+"')); "
ps+="& cmd.exe /c ($d+'\\run-qa.cmd'); exit $LASTEXITCODE"
q={"execute":"guest-exec","arguments":{"path":"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe","arg":["-NoProfile","-Command",ps],"capture-output":True}}
r=subprocess.run(['virsh','qemu-agent-command','Windows 11',json.dumps(q)],capture_output=True,text=True)
print(r.stdout,r.stderr)
