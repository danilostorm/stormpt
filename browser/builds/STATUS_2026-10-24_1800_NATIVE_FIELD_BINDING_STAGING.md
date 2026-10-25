# StormPT Web — 24/10/2026, 18h (Brasília) — vínculo de campo nativo em staging

## Pré-inspeção
- PR #2 aberto e em draft; HEAD anterior confirmado `2cb940b93c14472204e84dfefc296166a18fea3a`.
- Conferidos no GitHub: `browser/ROADMAP.md`, `browser/PROGRESS.json`, relatórios de 16h e 17h, `browser_world.hpp`, `browser_entities.hpp`, `browser_combat_intent.hpp`, `browser_combat_native_resolver.hpp`, protocolos de mundo/entidades e `GameLoginGuard`.
- AEROCOOL: conector HostStorm SSH falhou internamente em listagem e status; Desktop Commander informou AEROCOOL offline (último contato ~117h antes da consulta). Não foi possível conferir os relatórios locais nem o conteúdo real do diretório principal. **Não presumir que GitHub e AEROCOOL estão sincronizados.**

## Código alterado — somente branch do PR #2
- `transport/src/world-protocol.mjs`: snapshots exigem campo esperado válido, 0–255, default 3 (Ricarten), e rejeitam divergência.
- `transport/src/entity-protocol.mjs`: mesma verificação explícita para snapshots de entidades, antes de processar as linhas.
- `transport/src/game-login-guard.mjs`: vincula campo esperado ao registro nativo autenticado recebido do GameServer; não aceita campo enviado pelo browser. Rejeições de campo não avançam confirmação de movimento nem sequência de entidades.
- Acrescentados casos nos testes `world-protocol.test.mjs`, `entity-protocol.test.mjs` e `native-world-guard.test.mjs`. Não se criou opcode de viagem nem mecanismo de spawn/combate.
- Preservado o padrão campo 3 para não ampliar o piloto. A entrada original `browser_world.hpp` e `RecordMatches` continuam fixando Ricarten; qualquer mapa diferente ainda exige integração nativa real e assets correspondentes.

## Evidências executadas nesta rodada
- Ambiente isolado local: 4/4 testes focados de decodificação passaram (`node --test`), cobrindo Ricarten como padrão, campo 4 somente quando confiável, configuração inválida e frames malformados.
- `node --check` dos dois decodificadores locais passou.
- **Limite da evidência:** testes locais usam cópias focadas dos decodificadores e framing equivalente, não checkout integral da branch. Os três arquivos de teste adicionados ao repositório e a regressão total **ainda não foram executados** no AEROCOOL. Não registrar 109/109 como reexecutados nesta rodada.

## Máquinas e preservação
- AEROCOOL: não acessível; nenhuma escrita, build, backup, checksum ou consolidação no caminho `/mnt/user/appdata/stormpt-browser`.
- ZIEL / VM IA GTX 1650: não acessado nesta rodada; sem teste Chrome/Edge/WebGL2/FPS.
- SUPERFRAME: não acessado; sem trabalho remoto ou limpeza.
- ORACLE: não acessado; sem trabalho remoto ou limpeza.
- GitHub: branch draft do PR #2 atualizado com código e testes. Não houve deploy IIS/Nginx, reinício do GameServer, alteração SQL, contas, personagens, backups ou StormPK.
- Não há backup novo no AEROCOOL nesta rodada. Não houve criação nem remoção de diretórios temporários em servidores remotos.

## Bloqueio e próximo passo
1. Restabelecer acesso ao AEROCOOL, comparar HEAD do PR com checkout e alterações locais antes de sincronizar; não sobrescrever mudanças não publicadas.
2. Executar regressão completa do transporte e novos testes do guard; validar hashes e criar backup verificado no AEROCOOL.
3. Inventariar mapa nativo não-vila com monstros reais e arquivos originais; implementar transição e resolver monstros sob locks originais do GameServer em QA fechado.
4. Só após testes com servidor real considerar dano, morte, EXP, loot e regressão do cliente Windows.

**Estado:** preparação de transporte em staging; não é combate jogável nem progresso percentual auditado de paridade desktop.
