@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (
  echo ERRO: compilador C# do .NET Framework 4.x nao encontrado.
  echo Instale o .NET Framework Developer Pack / Build Tools no Windows.
  exit /b 1
)
"%CSC%" /nologo /target:winexe /optimize+ /platform:x86 /out:"%~dp0launcher.exe" /win32icon:"%~dp0assets\Icon1.ico" ^
 /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll ^
 /reference:System.Windows.Forms.dll /reference:System.Web.Extensions.dll ^
 /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll ^
 /resource:"%~dp0assets\fundo.bmp",StormPT.Hud.fundo.bmp ^
 /resource:"%~dp0assets\registrar.bmp",StormPT.Hud.registrar.bmp ^
 /resource:"%~dp0assets\configuracoes.bmp",StormPT.Hud.configuracoes.bmp ^
 /resource:"%~dp0assets\sair.bmp",StormPT.Hud.sair.bmp ^
 /resource:"%~dp0assets\start1.bmp",StormPT.Hud.start1.bmp ^
 /resource:"%~dp0assets\start2.bmp",StormPT.Hud.start2.bmp ^
 /resource:"%~dp0assets\start3.bmp",StormPT.Hud.start3.bmp ^
 /resource:"%~dp0assets\start4.bmp",StormPT.Hud.start4.bmp ^
 /resource:"%~dp0assets\start5.bmp",StormPT.Hud.start5.bmp ^
 /resource:"%~dp0assets\start_mouse_em_cima.bmp",StormPT.Hud.start_mouse_em_cima.bmp ^
 "%~dp0StormPTLauncher.cs"
if errorlevel 1 (
  echo ERRO: compilacao falhou.
  exit /b 1
)
echo Compilacao concluida: "%~dp0launcher.exe"
exit /b 0
