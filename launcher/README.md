# StormPT Launcher — Windows Forms / .NET Framework

Código-fonte do launcher desktop do StormPT, em **C# com Windows Forms**. O launcher permanece 32-bit para compatibilidade com o Windows e inicia o cliente de jogo **x64**.

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
- Em uma pasta sem cliente, baixa e instala o pacote-base completo. Em uma instalação existente, verifica a versão e aplica a atualização assinada disponível.
- Download em segmentos com retomada, verificação de patches e conexão com o servidor público.
- Instala o cliente na mesma pasta do launcher. Coloque o launcher em uma pasta gravável pelo usuário, como `C:\Games\StormPT`; evite `Program Files` se não for executar com permissões de administrador.
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

- Site: https://stormpt.hoststorm.cloud/download
- Binário: https://stormpt.hoststorm.cloud/releases/launcher.exe

Este diretório contém apenas o **launcher cliente**, não o código-fonte do servidor nem chaves privadas.

