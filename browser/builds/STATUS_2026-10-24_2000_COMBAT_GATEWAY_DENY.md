# StormPT Web — 24/10/2026, 20h (Brasília) — bloqueio de combate nativo no gateway

## Pré-verificação
- GitHub PR #2 aberto em draft; HEAD inicial 4e0f43b1b1a3a3bd55f7d2e844ce2d931edc2622.
- Lidos browser/ROADMAP.md, browser/PROGRESS.json, relatório GitHub das 19h; AEROCOOL ROADMAP.md, PROGRESS.json e relatórios locais 17h/19h via SMB.
- AEROCOOL SSH 22 recusado e Desktop Commander offline. SMB anônimo acessível somente como arquivos a partir do SUPERFRAME.

## Trabalho e testes verificáveis
- Adicionado browser/transport/test/native-combat-closed-gateway.test.mjs com TCP mock e WebSocket real em 127.0.0.1, sem acesso ao GameServer original.
- Caso 1: intenção de ataque antes do login QA fecha WebSocket, gateway libera sessão, zero bytes enviados ao TCP mock.
- Caso 2: após ticket sintético vinculado à sessão e lista original de personagens sintética, intenção de ataque fecha WebSocket; TCP mock recebe somente pacote de login, zero pacotes de ataque.
- Teste focal: 2/2; suíte completa de transporte com Node 22: 116/116, falhas 0.
- Testes sintéticos demonstram proteção do gateway atual; NÃO demonstram ataque, monstro real, dano, EXP, loot nem segurança do GameServer em produção.
- Fonte C++ original consultada em cópia read-only do AEROCOOL: rotina de spawn por cristal bloqueia FIELD_STATE_VILLAGE. Não foi escolhido mapa de combate nem invocado monstro.

## Disponibilidade
- Em consulta não autenticada no SUPERFRAME, /jogar/ e /jogar-beta/index.html voltaram de HTTP 502 (19h) para HTTP 200 (20h); /BrowserAssets.ashx sem sessão respondeu HTTP 401.
- 192.168.30.169:80 alcançável pelo SUPERFRAME, mas :1997 não alcançável. Não há evidência suficiente para concluir se o GameServer está parado ou filtrado; login real NÃO foi testado.
- Nenhum serviço reiniciado, nenhuma alteração de Nginx, IIS, SQL, contas, personagens, StormPK, GameServer ou política QA.

## Máquinas efetivamente utilizadas
- AEROCOOL: arquivos e backups via SMB (sem execução de testes no host).
- SUPERFRAME: checkout isolado, Node 22, regressão 116/116, diagnóstico HTTP/TCP, leitura de código original e consolidação SMB.
- ZIEL: consulta à VM IA Windows 11 (estado running e QEMU agent); sem benchmark gráfico.
- ORACLE: acesso de status tentou autenticação adicional Tailscale; sem tarefas executadas.
- VM Windows 11/GameServer original: não acessada nem modificada.

## Consolidação
- Destino único AEROCOOL: /mnt/user/appdata/stormpt-browser.
- Teste novo, logs, relatórios, versões anterior e posterior de ROADMAP/PROGRESS e fontes de suporte no backup approved-native-combat-gateway-2000.tar.gz, com SHA-256 no arquivo backup.sha256.
- Staging não altera módulos ativos do gateway nem executável Windows; rollout permanece bloqueado.

## Bloqueios e próximos passos
1. Verificar GameServer e caminho TCP 1997 a partir de host autorizado; não reiniciar sem diagnóstico.
2. Recuperar execução no AEROCOOL, validar mapa não-vila, identificar monstro real e transição sob autorização nativa.
3. Integrar callback de combate com locks e regras originais C++, dano/EXP/loot somente do servidor; regressão com cliente Windows.
4. Medir WebGL2/FPS em Chrome/Edge acelerado na GTX 1650 do ZIEL.

**Paridade desktop: sem percentual auditado. Combate real ainda não funcional.**
