# StormPT Web — 24/10/2026 09h BRT — intenção de ataque QA (pré-validação isolada)
**Não é combate funcional. Nenhum ataque foi enviado ao GameServer. Não houve deploy.**
## Inspeção prévia
GitHub PR #2 (aberto, branch work/stormpt-web-native-auth-20261023, head c1d98923a922916fa729f2c87f31c89f826f00f3), ROADMAP.md, PROGRESS.json, DESKTOP_PARITY.md e auditoria 08h conferidos. O percentual global permanece não mensurado.
## Implementação
- transport/src/combat-intent.mjs: novo pacote QA de 28 bytes, opcode 0x53570007, versão 1, sequência, serial do alvo, ação 1, reservado 0. Não contém poder, dano, coordenadas, cooldowns fornecidos pelo cliente ou recompensa.
- transport/test/combat-intent.test.mjs: seis testes de ABI, limites, versão, truncamento, ação, reserva e offsets de Uint8Array.
- native-auth/browser_combat_intent.hpp: pré-validação C++ isolada e sem efeitos colaterais. A estrutura de contexto DEVE vir da sessão e entidade ATUAL do servidor, nunca do navegador. Verifica sessão, sequência anti-replay, alvo tipo monstro, vida, mapa, alcance horizontal/vertical, atualização recente e intervalo entre ataques. Limites de 160 unidades e 500 ms são parâmetros conservadores PROVISÓRIOS QA, ainda não confirmados com o cliente original.
- native-auth/test-combat-intent.cpp: 27 verificações executadas na ORACLE ARM64 com g++ -std=c++11 -Wall -Wextra -Werror.
**O cabeçalho C++ NÃO foi incluído no GameServer.** Mesmo uma pré-validação aprovada NÃO autoriza dano; ainda faltam regras de classe, equipamento, habilidades, colisão, PvE, cooldown original, RNG e persistência do GameServer.
## Testes e evidências
- AEROCOOL: transporte 107/107 aprovado, incluindo 6 novos. Log em builds/staging-0900-combat/transport-test.log.
- SUPERFRAME (ALIEN.TECH): Node 22, 6/6 testes independentes aprovados, quatro fontes SHA-256 idênticas; logs no staging consolidado.
- ORACLE (npm, ARM64): g++ C++11 compilou com -Werror; 27/27 verificações passaram. Primeira execução falhou por erro de fronteira no teste (idade igual a 1000 ms não é maior que 1000 ms); teste corrigido e executado novamente. Fonte final e manifesto idênticos. Binário ARM64 transferido para AEROCOOL por checksum, não executável em AEROCOOL x86_64 (exec format error esperado).
- ZIEL (Tower): VM IA em estado running e dispositivo PCI atribuído por VFIO. Nenhum teste Windows/Chrome/Edge/WebGL2/FPS nesta execução, pois não houve mudança gráfica.
- HTTPS /jogar/ HTTP 200; /BrowserAssets.ashx sem sessão HTTP 401. A URL responder não demonstra login QA nem combate.
## Segurança e pendências
Nenhuma alteração de GameServer, SQL, contas, personagens, StormPK ou implantação pública. Acesso QA permanece restrito. O contrato é uma preparação, não dano/EXP/loot. Próximo marco: resolver monstro real com GameServer, conferir código original e integrar validação nativa de ataque com testes reais e regressão Windows antes de qualquer deploy.
