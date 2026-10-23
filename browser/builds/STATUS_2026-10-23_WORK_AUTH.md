# StormPT Web — retomada no Work em 23/10/2026

Progresso global conservador: **32% / 100%**.
<progress value="32" max="100">32%</progress>

O marco não foi aumentado: ainda não há login real do navegador no GameServer, lista autenticada de personagens ou movimento sincronizado.

## Implementado e testado

- Leitura integral da transferência; ROADMAP.md, PROGRESS.json e todos os relatórios de 04:00–09:00 revisados.
- Acesso HOSTSTORM SSH ao AEROCOOL e QEMU guest agent à VM Windows 11 confirmado.
- Inspecionados handlePlayerLoginOpcode, rsLogAccount, PushLogAccount, LogAccountThreadProc, StormPTWebsiteLogin e seleção de personagem na source real.
- Novo native-auth/browser_ticket.hpp: C++17/Win32, HMAC-SHA256 usando Windows BCrypt, base64url canônico, JSON de contrato estrito, prazo de até 60s, cache de nonces limitado a 10.000 e mutex contra consumo simultâneo.
- Audiência nativa stormpt-gameserver distinta de stormpt-browser-tcp.
- Rascunho ASP.NET atualizado para gameTicket com STORMPT_GAMESERVER_HMAC independente de STORMPT_BROWSER_HMAC. Segredos ausentes/iguais falham fechados. Mantida sessão StormPTPlayer, CSRF, POST e Origin. **Não implantado no IIS.**
- Testes reproduzíveis native-auth/generate-qa.mjs, NativeIssuerQA.cs e run-vm-qa.py. Compilação real MSVC v143 Win32 e C# .NET Framework na VM, sem substituir Server33.exe.
- Correção concreta do gateway existente: prazo de autenticação também cobre espera pelo primeiro login, com timer que fecha conexões silenciosas sem depender de novo tráfego. Timer removido no encerramento.
- Backups dos arquivos alterados em backups/auth-work-* e backups/gateway-deadline-*.
- Código novo de autenticação e patch do gateway publicados em branch work/stormpt-web-native-auth-20261023; sem publicar source original C++, assets comerciais, SQL ou segredos.

## Testes executados

| Teste | Resultado | Limite |
| --- | --- | --- |
| Transporte Node | 49/49 | Servidores de QA locais; não login real |
| Frontend unitário | 17/17 | Não autentica conta real |
| Validador nativo | 22 verificações aprovadas; exitcode 0 | Chave e conta sintéticas |
| Node HMAC → BCrypt | Aprovado | Compatibilidade criptográfica |
| C# do handler → BCrypt | Aprovado | Helpers do handler compilado; não fluxo HTTP de sessão |
| Consumo concorrente em 16 threads | Exatamente um ticket aceito | Instância única do verificador |
| Ticket expirado/audiência incorreta/adulterado/replay | Rejeitados | Sem GameServer de produção |
| /jogar-beta/index.html | HTTP 200 | Interface apenas |
| /jogar | HTTP 404 | Não publicado |

A compilação QA em /W4 emitiu C4127 por condição constante no código gerado de teste; sem erro de compilação. Não houve benchmark RX 550 ou novo teste visual de browser nesta execução.
Log do transporte: builds/transport-work-20261023.tap.
Arquivos da QA Windows: C:\StormPT-2703\BrowserQA\NativeAuth.

## Integração ainda pendente

O verificador ainda não está ligado a uma entrada nativa web do GameServer. O gateway continua exigindo LoginPacket Windows de 400 bytes. Não enviar token como senha nem inventar hash/MAC/checksum.
O caminho atual de autenticação passa pela fila de login e por StormPTWebsiteLogin no DllServer.cpp. A integração deve manter conta bloqueada/excluída/em uso, manutenção, IP, sessão duplicada, pertencimento do personagem e autorização dos comandos seguintes.
É necessário definir o pacote de login web, ligá-lo ao verificador e à fila sem reutilizar o caminho legado de senha como substituto de ticket. A seleção opcode 5 também precisa de uma política web explícita para versão/checksum.
Criar uma única instância do TicketVerifier por processo e carregar segredo protegido. O cache de replay desta etapa é somente em memória e precisa de política de reinício/rotação antes da implantação.
Depois: autenticar uma conta legítima de QA, receber opcode 9 real, selecionar personagem e remontar opcode 4 real, conectar posição e movimento ao renderer.

## Preservação

Nenhuma alteração nos bancos, contas, personagens, serviço GameServer em execução, IIS publicado ou proxy de produção. StormPK não foi alterado. Não há tarefa autônoma/background de desenvolvimento iniciada por esta execução.
