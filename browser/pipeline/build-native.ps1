$ErrorActionPreference='Stop'
$compiler='C:/Program1/MSBuild/Current/Bin/MSBuild.exe'
$project='C:/StormPT-2703/BrowserQA/SourceWeb/SrcServer/src/priston.vcxproj'
if(!(Test-Path $compiler) -or !(Test-Path $project)){throw 'Native build prerequisites missing'}
& $compiler $project /t:Build '/p:Configuration=Release;Platform=Win32;OutDir=C:\StormPT-2703\BrowserQA\BuildPipeline\;IntDir=C:\StormPT-2703\BrowserQA\ObjPipeline\;SolutionDir=C:\StormPT-2703\BrowserQA\SourceWeb\SrcServer\' /m:2 /v:minimal *> C:/StormPT-2703/BrowserQA/pipeline-native-build.log
if($LASTEXITCODE){throw 'Native build failed; inspect private build log'}
$binary='C:/StormPT-2703/BrowserQA/BuildPipeline/Server33.exe'
$result=[ordered]@{compiled=$true;deployed=$false;sha256=(Get-FileHash $binary).Hash;bytes=(Get-Item $binary).Length;at=[DateTime]::UtcNow.ToString('o')}
[IO.File]::WriteAllText('C:/StormPT-2703/BrowserQA/pipeline-native-build.json',($result|ConvertTo-Json -Compress))
