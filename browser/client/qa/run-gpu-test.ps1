$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$d='C:/StormPTBrowserQA'
$script:seq=0
$script:events=@()
function Cdp($method,$params){
 $script:seq++
 $id=$script:seq
 $json=@{id=$id;method=$method;params=$params}|ConvertTo-Json -Depth 12 -Compress
 $bytes=[Text.Encoding]::UTF8.GetBytes($json)
 $cancel=New-Object Threading.CancellationTokenSource
 $cancel.CancelAfter(240000)
 $null=$ws.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,$cancel.Token).GetAwaiter().GetResult()
 while($true){
  $buf=New-Object byte[] 65536
  $stream=New-Object IO.MemoryStream
  do{
   $msg=$ws.ReceiveAsync([ArraySegment[byte]]::new($buf),$cancel.Token).GetAwaiter().GetResult()
   if($msg.MessageType -eq [Net.WebSockets.WebSocketMessageType]::Close){throw 'Chrome debugging socket closed'}
   $stream.Write($buf,0,$msg.Count)
  }while(!$msg.EndOfMessage)
  $reply=[Text.Encoding]::UTF8.GetString($stream.ToArray())|ConvertFrom-Json
  $stream.Dispose()
  if($reply.id -eq $id){if($reply.error){throw ($reply.error|ConvertTo-Json -Compress)};return $reply.result}
  if($reply.method -eq 'Runtime.exceptionThrown'){$script:events+= $reply.params.exceptionDetails.text}
 }
}
try{
 $target=Invoke-RestMethod -Method Put 'http://127.0.0.1:9227/json/new?about:blank'
 $ws=New-Object Net.WebSockets.ClientWebSocket
 $ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
 $null=Cdp 'Runtime.enable' @{}
 $null=Cdp 'Page.enable' @{}
 $null=Cdp 'Emulation.setDeviceMetricsOverride' @{width=1920;height=1080;deviceScaleFactor=1;mobile=$false}
 $null=Cdp 'Page.navigate' @{url='https://stormpt.hoststorm.com.br/jogar/'}
 Start-Sleep -Seconds 3
 $code=[IO.File]::ReadAllText($d+'/gpu-test.js').Replace('__QA__',[IO.File]::ReadAllText($d+'/qa-account.json'))
 $result=Cdp 'Runtime.evaluate' @{expression=$code;awaitPromise=$true;returnByValue=$true;timeout=220000}
 if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 6 -Compress)}
 $report=$result.result.value
 $report|Add-Member -NotePropertyName cdpErrors -NotePropertyValue @($script:events)
 [IO.File]::WriteAllText($d+'/gpu-result.json',($report|ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
 $summary=[pscustomobject]@{hardwareVerified=$report.hardwareVerified;renderer=$report.idle.renderer;idleFps=$report.idle.fps;idleP95=$report.idle.p95Ms;walkingFps=$report.walking.fps;walkingP95=$report.walking.p95Ms;errors=@($script:events).Count}
 $summary|ConvertTo-Json -Compress
}catch{
 [IO.File]::WriteAllText($d+'/gpu-error.txt',($_|Out-String))
 Write-Error $_
 exit 1
}finally{
 if($ws){$ws.Dispose()}
}
