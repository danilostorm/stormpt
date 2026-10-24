$ErrorActionPreference='Stop'
$live=@(Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -in @(1997,10007)})
if($live.Count -gt 0){throw 'Active clients; deployment aborted'}
$b='C:/StormPT-2703/Backups/WebNpc-'+(Get-Date -Format yyyyMMdd-HHmmss)
New-Item -ItemType Directory $b | Out-Null
Copy-Item C:/StormPT-2703/Servidor/Server33.exe ($b+'/Server33.exe')
Copy-Item C:/StormPT-2703/Servidor/DataServer ($b+'/DataServer') -Recurse
Copy-Item C:/inetpub/stormpt/jogar-beta ($b+'/IIS-beta') -Recurse
$before=(Get-FileHash C:/StormPT-2703/Servidor/Server33.exe).Hash
if((Get-FileHash ($b+'/Server33.exe')).Hash -ne $before){throw 'Backup hash mismatch'}
Set-Content C:/StormPT-2703/BrowserQA/npc-backup-path.txt $b
$live=@(Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -in @(1997,10007)})
if($live.Count -gt 0){throw 'Client connected during backup; deployment aborted'}
try{
 Stop-ScheduledTask -TaskName StormPT-2703-Test
 Get-Process Server33 -ErrorAction SilentlyContinue | Stop-Process -Force
 Start-Sleep -Seconds 2
 Copy-Item C:/StormPT-2703/BrowserQA/BuildNext/Server33.exe C:/StormPT-2703/Servidor/Server33.exe -Force
 if((Get-FileHash C:/StormPT-2703/Servidor/Server33.exe).Hash -ne (Get-FileHash C:/StormPT-2703/BrowserQA/BuildNext/Server33.exe).Hash){throw 'Installed hash mismatch'}
}catch{Copy-Item ($b+'/Server33.exe') C:/StormPT-2703/Servidor/Server33.exe -Force;throw}finally{Start-ScheduledTask -TaskName StormPT-2703-Test}
Write-Output 'NPC_BUILD_INSTALLED_WITH_VERIFIED_BACKUP'
Get-FileHash C:/StormPT-2703/Servidor/Server33.exe | Select Hash | ConvertTo-Json -Compress
