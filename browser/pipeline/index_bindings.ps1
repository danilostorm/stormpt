$ErrorActionPreference='Stop'
$root='C:/StormPT-2703/Cliente'
$rows=New-Object 'System.Collections.Generic.List[object]'
foreach($path in [IO.Directory]::EnumerateFiles($root,'*',[IO.SearchOption]::AllDirectories)){
 $ext=[IO.Path]::GetExtension($path).ToLowerInvariant()
 if($ext -notin @('.inx','.inf')){continue}
 $stream=[IO.File]::Open($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
 try{$bytes=New-Object byte[] 128;$count=$stream.Read($bytes,0,128)}finally{$stream.Dispose()}
 if($count -lt 128){continue}
 $model=[Text.Encoding]::ASCII.GetString($bytes,0,64).Split([char]0)[0].Replace('\','/')
 $bones=[Text.Encoding]::ASCII.GetString($bytes,64,64).Split([char]0)[0].Replace('\','/')
 if($model -notmatch '\.(ase|smd)$' -or $bones -notmatch '\.(ase|smb)$'){continue}
 $relative=$path.Substring(([IO.Path]::GetFullPath($root)).Length+1).Replace('\','/')
 $rows.Add(@{config=$relative;model=$model;bones=$bones})
}
[IO.File]::WriteAllText('C:/StormPT-2703/BrowserQA/pipeline-bindings.json',($rows|ConvertTo-Json -Depth 4 -Compress),(New-Object Text.UTF8Encoding($false)))
Write-Output ('CONFIGURATION_BINDINGS='+$rows.Count)
