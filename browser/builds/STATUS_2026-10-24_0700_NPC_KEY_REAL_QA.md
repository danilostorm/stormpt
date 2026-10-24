# StormPT Web — 24/10/2026 07h — NPC real pela tecla E e marcador de monstro

Progresso global: sem percentual de equivalência desktop. Não é jogo completo nem combate.

## Mudança real publicada em piloto QA
- NativeRadar.nearestNpc: seleciona NPC próximo a até 50 unidades a partir de snapshots autenticados do GameServer, validando tipo, serial e posição.
- NativeWorldView: tecla E interage com NPC por protocolo nativo; resposta real vem do GameServer C++, sem simulação.
- Marcador circular 3D do monstro selecionado, posicionado por snapshots do GameServer, invisível para alvo inválido/morto; geometria e material descartados ao sair. Sem ataque/dano/spawn.
- Fontes definitivas no AEROCOOL; módulos publicados no IIS QA em C:/inetpub/stormpt/jogar-beta.

## Testes
- AEROCOOL: 53/53 unitários selecionados frontend e 101/101 transporte.
- SUPERFRAME: 6/6 testes independentes de NPC com Node 22, SHA-256 idêntico ao AEROCOOL.
- ORACLE: 7/7 verificações estáticas; Node 12 incompatível com suíte moderna, hashes idênticos.
- ZIEL: VM IA online, GTX 1650 driver 32.0.16.1088 status OK; sem novo benchmark FPS.
- Chromium público sem simulação: login real, personagem QA real, Ricarten, 16 NPCs recebidos. Movimento autorizado pelo GameServer até Enzo (159,36 -> 65,03 -> 21,78 unidades), tecla E, resposta nativa status=0 serial=8215, diálogo exibido. Repetição em nova sessão passou. Zero erros JS.
- Chromium anônimo: importação dos dois módulos publicados e seleção de NPC com fixture, sem erro de import/HTTP.
- Não havia monstro vivo na sessão QA para validar o marcador 3D com entidade real. Marcador não é combate.
- Algumas tentativas iniciais de login sofreram desconexão/timeout e uma falha de rede transitória; testes finais passaram. Execução direta de testes Playwright no host sem dependências gráficas falhou, por isso Chromium rodou em contêiner.
- HTTPS /jogar/ = 200, módulos JS = 200 com hashes conferidos; asset ricarten sem sessão = 401.
- Server33.exe SHA256 355970C565149F86EB302B98663ABA3CD7EA07BCD6D253434C5C83C210C4D428; TCP 1997 LISTEN.

## Preservação
- AEROCOOL único destino definitivo; backup anterior IIS em C:/StormPT-QA-Backups/20261024-0700-npc-interact-target-marker; backup de fontes e deploy no AEROCOOL.
- SUPERFRAME/ORACLE: somente /tmp/stormpt-qa-20261024-0700; limpar apenas após validação do backup.
- ZIEL usado para inspeção somente leitura da GPU; sem benchmark novo.
- SQL, StormPK, Server33.exe e outros projetos não alterados; movimentação apenas do personagem QA.
- Ainda faltam monstro real, combate server-authoritative, inventário transacional, skills, chat dois jogadores, áudio completo, mapas/classes, regressão Windows e RX 550.
- GitHub PR #2: https://github.com/danilostorm/stormpt/pull/2
