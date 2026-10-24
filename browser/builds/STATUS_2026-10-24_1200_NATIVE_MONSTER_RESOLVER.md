# StormPT Web — 24/10/2026 12h — resolução nativa de alvo e personagem (QA isolado)

## Pré-inspeção
PR #2 aberto em draft, HEAD 88ec127529fda3dd13349351799c5121a956dbd7 no início da execução. ROADMAP.md, PROGRESS.json e relatório 11h lidos no AEROCOOL antes das alterações. Percentual global permanece não auditado.

## Avanço real
Criado \`native-auth/browser_combat_native_resolver.hpp\` e \`native-auth/test-combat-native-resolver.cpp\`. O resolvedor lê estado de personagem e monstro do próprio GameServer, em vez de confiar nas coordenadas, vida ou dano enviados pelo navegador. A busca por monstro exige serial único ativo em chrAutoPlayer, estado original smCHAR_STATE_ENEMY, ponteiro da área nativa exata, vida positiva e coordenadas válidas; colisões de serial são rejeitadas. O personagem exige sessão verificada pelo chamador, conta e nome correspondentes ao NativeWorld, conexão atual, personagem vivo, Ricarten, posição válida e heartbeat recente.

O teste liga o pacote de intenção existente ao resolvedor e ao gate isolado com callback que recusa ataque, sem causar dano ou recompensas. Nenhum hook no GameServer ativo foi alterado.

## Verificações
- ORACLE ARM64: C++11 -Wall -Wextra -Werror -pedantic; 56/56 checagens release e as mesmas 56/56 com AddressSanitizer/UBSan. O primeiro teste teve uma incompatibilidade C++11 em lambda e uma expectativa incorreta de timeout; corrigidos no staging antes da aprovação.
- AEROCOOL: 107/107 testes de transporte. Fonte, testes e binários recebidos da ORACLE com SHA-256 idêntico. HTTPS /jogar/ HTTP 200; BrowserAssets.ashx sem sessão HTTP 401.
- SUPERFRAME: 6/6 testes independentes do contrato JS de intenção de ataque, hashes registrados. Sem compilação C++ nesta máquina.
- ZIEL: VM IA Windows 11 observada ligada no virsh; GTX 1650 listada no PCI. Sem teste real Chrome/Edge/WebGL2/FPS nesta execução porque não houve mudança gráfica.

## Descobertas e bloqueios
- A fonte original pesquisada em research/OnSever-current.cpp despacha OPCODE_ATTACK_DAMAGE para rsRecvAttackData com TRANS_ATTACKDATA2; não reutilizar campos de dano definidos pelo cliente. Integrar somente após confirmar o caminho autoritativo original e a exclusão transacional de sessão e entidade.
- A consulta de monstros reais em Ricarten QA ainda não foi validada; nenhuma entidade viva foi criada ou alterada.
- Falta integrar o resolvedor ao GameServer Windows sob locks nativos, validar monstro vivo, ataques, dano, morte, EXP, loot e regressão com cliente desktop.
- Piloto QA permanece fechado; não houve publicação do código novo no site nem alteração de SQL, GameServer ou StormPK.
- Binários de teste ARM64 são auxiliares e não são binários de produção Windows.

## Artefatos
native-auth/browser_combat_native_resolver.hpp
native-auth/test-combat-native-resolver.cpp
builds/staging-1200-native-resolver/native-resolver-release
builds/staging-1200-native-resolver/native-resolver-sanitized
builds/staging-1200-native-resolver/oracle-validation.log
builds/staging-1200-native-resolver/superframe-validation.log
builds/staging-1200-native-resolver/transport-regression.log

Nenhuma porcentagem global de equivalência desktop foi calculada.
