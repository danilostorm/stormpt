# StormPT Web — 24/10/2026, 21h Brasília — ledger de monstros e diagnóstico do GameServer

## Pré-verificação
- Conferidos GitHub PR #2 (draft, HEAD inicial `c10aa66c4acdcabfa3299bc8cef5976a260d6f8d`), `browser/ROADMAP.md`, `browser/PROGRESS.json` e relatório das 20h.
- AEROCOOL voltou a aceitar SSH; arquivos ROADMAP/PROGRESS/relatório das 20h locais comparados byte a byte com o HEAD GitHub (idênticos).
- Checkout da branch de PR isolado em `builds/staging-2100-native-combat-diagnostics/repo`. O transporte ativo não foi modificado.

## Código novo — apenas staging
- `transport/src/combat-target-ledger.mjs`: ledger read-only de monstros vivos (kind 2) vistos em snapshots nativos de entidades do GameServer. Exige observador, mapa, sequência, linhas válidas, identidade única e vida positiva; rejeita NPCs, jogadores, mortos, mapas/observadores estranhos e snapshots inválidos.
- Troca a lista inteira a cada snapshot validado; expira alvos após 2 segundos; rejeita retrocesso de relógio; evita guardar alvos removidos, obsoletos ou de outra sessão.
- `transport/src/game-login-guard.mjs`: vincula ledger ao registro de personagem autenticado, alimenta-o somente com snapshots validados recebidos do servidor e limpa-o ao fechar a sessão. Método interno read-only `getServerMonster`.
- **Nenhum pacote de ataque é aceito ou enviado**. Dano, alcance, colisão, skills, EXP e loot devem ser determinados pelo GameServer original sob locks. Não utilizar o ledger como autorização para atacar.
- `transport/test/combat-target-ledger.test.mjs`: quatro testes focados, incluindo integração com sessão nativa sintética, campo diferente de Ricarten, snapshot inválido e ataque ainda rejeitado.

## Execução e resultados
- AEROCOOL Node.js 22.18.0, `npm ci --ignore-scripts` em checkout isolado; `node --check` dos módulos: aprovado.
- Testes focados: **4/4**; suíte integral de transporte: **120/120**, 0 falhas, log `builds/staging-2100-native-combat-diagnostics/transport-2100.tap`.
- Testes usam pacotes sintéticos de GameServer. **Não houve monstro real, combate, dano, EXP, loot ou benchmark de FPS.**
- AEROCOOL: rota pública /jogar/ HTTP 200, BrowserAssets.ashx sem sessão HTTP 401.
- Windows 11 original no AEROCOOL: VM `Windows 11` running e QEMU guest agent respondeu; consulta PowerShell read-only não encontrou processo `Server33` nem listener TCP 1997; AEROCOOL→192.168.30.169:1997 expirou, mas IIS HTTP 80 respondeu 200. **GameServer indisponível para teste de combate nesta execução; não foi iniciado/reiniciado**.
- ZIEL: VM IA running, guest agent respondeu, Windows enumerou NVIDIA GeForce GTX 1650 (driver 32.0.16.1088). Nenhum novo teste Chrome/Edge/WebGL2/FPS; não chamar isso de benchmark.
- SUPERFRAME: acesso SSH read-only para estado e ferramentas, sem builds. ORACLE: não utilizado.

## Preservação e publicação
- Apenas código/documentação/testes em staging e GitHub; nenhuma mudança em container ativo, IIS, GameServer, SQL, contas, personagens, StormPK ou outros projetos.
- Destino único de consolidação: `/mnt/user/appdata/stormpt-browser`. Backup com SHA-256 e manifesto local em `backups/20261024-2100-combat-target-ledger`.
- QA fechado; nenhuma mudança em allowlists ou publicação do combate.
- Estado global de paridade desktop: sem percentual auditado.

## Bloqueios e próxima prioridade
1. Diagnosticar com segurança por que o GameServer original não apresenta processo/listener de combate (sem reiniciar às cegas); restaurar somente após confirmação de configuração e impacto.
2. Validar um mapa nativo não-vila e monstro real em sessão QA autorizada; comparar serial/mapa/vida/posição recebidos com o C++.
3. Integrar callback de combate C++ com resolução nativa, locks, dano e transações originais; testar com cliente Windows.
4. Executar benchmark real Chrome/Edge WebGL2 na VM IA GTX 1650.
