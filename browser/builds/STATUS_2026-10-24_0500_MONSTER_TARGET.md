# StormPT Web — execução 05h, 24/10/2026 — alvo de monstro (somente leitura)

**Estado:** funcionalidade nova de alvo de monstro no piloto fechado QA, sem ataques nem simulação de dano. Percentual global não calculado: DESKTOP_PARITY.md continua como critério. PR #2 consultado no início: head 43bff7a1772a2fb50c28a3906453ba86f0e9ba69.

## Desenvolvimento
- client/src/native-target.mjs: seleciona apenas kind=2 vindo de decodeEntitySnapshot/GameServer; mostra nome, nível, distância em unidades PT, HP atual/máximo, e barra de vida. Zero HP máximo é tratado como desconhecido, não inventado.
- client/src/native-radar.mjs: monstro selecionável no radar; NPCs continuam com conversa nativa; jogadores não são alvos de monstro.
- client/src/native-world-view.mjs: conecta painel ao mundo e aos snapshots autoritativos, atualiza distância com movimento real e remove alvo quando o monstro desaparece.
- client/src/native-entry.mjs: inclui estado de alvo na instrumentação QA. Nenhum pacote novo de ataque foi criado; nenhuma alteração em SQL, GameServer, personagens, contas ou StormPK.
- client/qa/test-native-target.mjs e test-native-target-browser.mjs: regras de integridade, HP, alvo ausente, tipo errado, texto HTML hostil, ausência de POST/ataque, limpeza e interface.

## Validações
- AEROCOOL: transporte 101/101; frontend unitário selecionado 43/43; radar/alvo 8/8; pipeline Python 9/9; Chromium isolado de seleção/atualização/despawn/XSS aprovado.
- Primeira tentativa de suíte frontend misturou 3 scripts Playwright que não rodam diretamente no host sem dependências gráficas; 43 testes unitários separados passaram e Chromium foi executado no container correto. Não ocultar a primeira falha.
- Chromium público com conta QA REAL: primeira tentativa fez login, mas a conexão encerrou antes do mundo carregar; segunda tentativa entrou em Ricarten, carregou novo painel (oculto sem alvo), zero erros JS e zero falhas HTTP de módulos. Não há evidência de seleção de um monstro real no GameServer; apenas snapshots simulados em teste isolado.
- SUPERFRAME: 8/8 testes Node independentes, tar SHA-256 a9851fdb191e87001db47d9ceea3b21bda34c8a3691faf754ed469fd9315686f.
- ORACLE: tar idêntico, 2 arquivos .mjs passaram node --check; Node 12 não suporta node --test (tentativa falhou e foi registrada), portanto sem 8/8 no Oracle.
- ZIEL: VM IA em execução, GTX 1650 driver 32.0.16.1088 com status OK e HTTPS /jogar HTTP 200 a partir da VM; sem novo benchmark WebGL2/FPS.
- Publicação IIS com backup e substituição atômica de 3 módulos existentes, mais módulo novo; Nginx nginx -t e reload aprovados. Import do novo módulo usa query ?v=20261024-0500 para contornar cache de 404 externo. /jogar/ responde HTTP 200; GameServer TCP 1997 aberto.
- Backups: backups/20261024-0500-monster-target/, IIS C:\StormPT-QA-Backups\20261024-0500-monster-target, Nginx default.conf.before-monster-target-20261024-0500.
- Não ampliar acesso além do piloto QA. Não alegar combate jogável ou paridade desktop.

## Próximo passo
Validar monstro real em mapa QA seguro sem modificar dados persistentes, implementar intenção de ataque e resposta autoritativa com ABI nativa e testes negativos, depois dano, morte, loot e EXP. Validar regressão desktop antes de abrir ao público.
