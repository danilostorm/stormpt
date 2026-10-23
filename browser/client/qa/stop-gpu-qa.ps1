$ErrorActionPreference='Stop'
$task=Get-ScheduledTask StormPTBrowserGPUQA -ErrorAction SilentlyContinue
if($task){Stop-ScheduledTask StormPTBrowserGPUQA -ErrorAction SilentlyContinue}
Get-CimInstance Win32_Process -Filter "name='chrome.exe'"|Where-Object {$_.CommandLine -like '*--user-data-dir=C:/StormPTBrowserQA/chrome-profile*'}|ForEach-Object {Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue}
if($task){Unregister-ScheduledTask StormPTBrowserGPUQA -Confirm:$false}
Remove-Item -LiteralPath 'C:/StormPTBrowserQA/qa-account.json' -Force -ErrorAction SilentlyContinue
foreach($path in @('C:/StormPTBrowserQA/chrome-profile','C:/StormPTBrowserQA/node-v22.18.0-win-x64','C:/StormPTBrowserQA/node-v22.18.0-win-x64.zip')){
 if(Test-Path -LiteralPath $path){Remove-Item -LiteralPath $path -Recurse -Force}
}
Write-Output 'Isolated QA browser stopped; QA credential copy removed'
