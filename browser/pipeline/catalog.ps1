param([string]$ConfigPath,[string]$OutputPath)
$ErrorActionPreference='Stop'
$config=[IO.File]::ReadAllText($ConfigPath)|ConvertFrom-Json
$rows=New-Object 'System.Collections.Generic.List[object]'
$progressPath=$OutputPath+'.progress.json'
$sha=[Security.Cryptography.SHA256]::Create()
try {
 foreach($root in $config.catalogRoots){
  if(!(Test-Path -LiteralPath $root)){throw "Client root missing: $root"}
  $absolute=[IO.Path]::GetFullPath($root).TrimEnd('\')
  foreach($path in [IO.Directory]::EnumerateFiles($absolute,'*',[IO.SearchOption]::AllDirectories)){
   $info=New-Object IO.FileInfo($path);$ext=$info.Extension.ToLowerInvariant();$signature='';$hash=$null
   if($ext -eq '.smd' -or ($config.catalogFullHash -and $ext -in @('.smb','.inx','.inf'))){
    $stream=[IO.File]::Open($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
    try {
     if($ext -eq '.smd'){$prefix=New-Object byte[] 24;$n=$stream.Read($prefix,0,24);$signature=[Text.Encoding]::ASCII.GetString($prefix,0,$n).Trim([char]0);$stream.Position=0}
     if($config.catalogFullHash){$hash=([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}
    }finally{$stream.Dispose()}
   }
   $rows.Add([ordered]@{root=$root;path=$path.Substring($absolute.Length+1).Replace('\','/');bytes=$info.Length;ticks=$info.LastWriteTimeUtc.Ticks.ToString();extension=$ext;signature=$signature;sha256=$hash})
   if(($rows.Count % 250) -eq 0){[IO.File]::WriteAllText($progressPath,(@{pid=$PID;files=$rows.Count;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json -Compress))}
  }
 }
 $doc=[ordered]@{schema=1;createdAt=[DateTime]::UtcNow.ToString('o');files=$rows}
 [IO.File]::WriteAllText($OutputPath,($doc|ConvertTo-Json -Depth 5 -Compress),(New-Object Text.UTF8Encoding($false)))
 Write-Output ('CATALOG_FILES='+$rows.Count)
}finally{$sha.Dispose()}
