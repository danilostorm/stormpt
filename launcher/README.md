# StormPT Launcher Clássico — C# / .NET Framework

Código-fonte do **launcher clássico do StormPT 1.2.0**, migrado do Python/Tkinter para **C# com Windows Forms**, com base no atualizador original do StormPK.

O programa compilado é um **único arquivo `launcher.exe`**, sem instalação de Python e sem pasta `_internal`. As imagens originais do launcher estão incorporadas como recursos do executável.

## Arquivos

- `StormPTLauncher.cs` — tela clássica (480 × 400), botões animados, configurações gráficas, instalação, atualização, verificação de arquivos e abertura do jogo.
- `assets/` — fundos, estados dos botões e ícone usados na compilação.
- `build.cmd` — compilação usando o compilador C# do **.NET Framework 4.x** no Windows.
- `LICENSE-NOTICE.txt` — informações sobre a arte do jogo.

## Compilar

Em um Windows com **.NET Framework 4.x** e o compilador `csc.exe` instalado:

1. Extraia os arquivos mantendo a pasta `assets`.
2. Execute `build.cmd` (normalmente sem permissão de administrador).
3. O resultado aparece em `launcher.exe` ao lado do código.

Não use PyInstaller, empacotadores ou UPX. O launcher é Windows Forms nativo do .NET Framework.

## Recursos do launcher

- Interface clássica 480 × 400 com botões animados **Começar**, **Registrar**, **Configurações** e **Sair**.
- Clique com botão direito para acessar funções adicionais (verificação, instalação, pasta do jogo).
- Instalador e atualizador com manifesto `/client-files/manifest.json` assinado por RSA e arquivos verificados por SHA-256.
- Download em segmentos com retomada, verificação de patches e conexão com servidor público.
- Instalação em `%LOCALAPPDATA%\StormPT` por padrão.
- Atualização automática do próprio launcher conforme manifesto.
- Manutenção das preferências gráficas do jogador.
- Sem `wscript.exe`, VBScript ou pasta `_internal`.

### Segurança

O código contém somente a **chave pública de verificação** do manifesto; **a chave privada de assinatura não faz parte desta publicação**. Não inclua suas credenciais, senha de banco de dados, chaves privadas, configurações internas ou conteúdo do servidor no repositório.

O `launcher.exe` **não é assinado por um certificado Authenticode de editor**. Uma compilação .NET pequena pode reduzir detecções heurísticas, mas não garante ausência de falsos positivos. Não desative o antivírus para executá-lo; submeta detecções à Microsoft para análise.

## Testes sem abrir a interface

```powershell
.\launcher.exe --selftest-classic-assets
.\launcher.exe --selftest-classic-window
.\launcher.exe --selftest-stormpt-base
.\launcher.exe --selftest-graphics
.\launcher.exe --selftest-layout
.\launcher.exe --verify-manifest
.\launcher.exe --verify-patch
.\launcher.exe --verify-range
```

Alguns testes acessam a internet e necessitam que o site oficial esteja acessível.

## Downloads oficiais

- Site: https://stormpt.hoststorm.com.br/download
- Binário: https://stormpt.hoststorm.com.br/releases/launcher.exe

Este diretório contém apenas o **launcher cliente**, não o código-fonte do servidor nem chaves privadas.
