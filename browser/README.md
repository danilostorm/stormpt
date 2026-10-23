# StormPT Web — autenticação nativa em desenvolvimento

Estado: 23/10/2026. O cliente web ainda não autentica no GameServer e não é jogável.
Este diretório reúne código novo revisado para publicação; não contém source original do jogo, assets, SQL ou segredos.

## Validado na VM Windows 11

- MSVC v143, Win32, C++17 e BCrypt do Windows.
- 22 verificações nativas: HMAC Node/C# → C++, expiração, audiência, formato estrito, replay e concorrência de 16 threads.
- Handler ASP.NET compilado em QA; não implantado no IIS.
- Gateway no AEROCOOL: 49/49 testes após correção de prazo passivo de autenticação.
- Frontend existente: 17/17 testes de unidade.
- /jogar-beta/index.html HTTP 200; /jogar HTTP 404.

## Reproduzir os testes nativos no ambiente existente

No AEROCOOL, a partir de /mnt/user/appdata/stormpt-browser:

    node native-auth/generate-qa.mjs
    python3 native-auth/run-vm-qa.py

O runner copia somente os arquivos de QA para C:\StormPT-2703\BrowserQA\NativeAuth, compila C# e C++ e retorna PID do QEMU guest agent. Consultar guest-exec-status até encerrar; sucesso exige exitcode 0.
Os vetores usam somente uma chave sintética pública de testes. Nunca usar essa chave em produção.

## Contrato e limites

O rascunho ASP.NET mantém StormPTPlayer/StormPTCsrf, Origin e POST. Exige STORMPT_BROWSER_HMAC e STORMPT_GAMESERVER_HMAC distintos. O ticket de transporte tem aud=stormpt-browser-tcp; o nativo tem aud=stormpt-gameserver. Ambos duram 45s.
O verificador aceita apenas JSON canônico na ordem aud/account/exp/nonce/sid, HMAC-SHA256 e base64url canônico, com replay em memória limitado a 10.000 nonces.
É preciso manter uma instância por processo; não criar um verificador por pedido. O cache atual não sobrevive a reinícios.

Falta conectar o verificador a uma entrada web explícita do GameServer, preservar verificações de conta bloqueada/excluída/em uso, manutenção, IP, sessão duplicada e seleção de personagens. Falta o protocolo de entrada web e o vínculo entre autorização, socket e conta.
O rascunho de emissão e os testes isolados não representam login real. Não enviar tokens a logs, URLs ou GitHub.
