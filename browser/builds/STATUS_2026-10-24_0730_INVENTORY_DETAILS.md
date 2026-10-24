# StormPT Web — 24/10/2026 07h30–07h43 — inventário original e correção de sobreposição

Progresso global: sem percentual confiável de equivalência com o desktop. Piloto QA fechado; não é jogo completo.

## Implementação
- client/src/native-inventory.mjs: painel de detalhes mostra requisitos numéricos originais (nível, força, inteligência, talento, agilidade, vitalidade), valores atuais do personagem e preço registrado do item; não simula equipar, vender ou validação de classe.
- Validação estrita de inteiros/limites, UI exclusivamente com textContent, proteção contra HTML malicioso.
- Correção real de UX: controle de áudio (z-index 8) interceptava clique em Atributos do inventário (z-index 6). Inventário agora z-index 12; a primeira execução de regressão revelou o problema.
- Nenhuma escrita SQL, mudança de item, alteração de GameServer ou nova conta.

## Testes
- AEROCOOL: 7/7 testes unitários específicos de inventário, 27/27 suíte selecionada de módulos de cliente, 101/101 transporte.
- Chromium isolado com fixture de item: preço, requisitos, texto malicioso inerte, sobreposição e ausência de mutações aprovados. Fixture NÃO é item real.
- Chromium HTTPS público com conta QA verdadeira: login, personagem, Ricarten, inventário, atributos clicáveis, painel acima do áudio, saída; nenhum erro JavaScript. builds/inventory-public-layer-0730.json = passed true. O inventário real da conta QA está vazio (0 itens); portanto não se afirma teste de item real.
- SUPERFRAME: 7/7 unitários Node 22 e SHA-256 idêntico ao AEROCOOL.
- ORACLE: 5/5 checagens estáticas Python e SHA-256 idêntico; Node 12 incompatível com a suíte moderna.
- ZIEL: VM IA ativa, GTX 1650 driver 32.0.16.1088 OK. Smoke headless WebGL2 sem DOM, INCONCLUSIVO. Sem FPS novo.
- Suíte indiscriminada node --test client/qa/test-*.mjs falhou em scripts de integração que exigem navegador, credenciais ou ambiente específico; não contabilizada como regressão aprovada. A suíte curada de módulos e o navegador real passaram.

## Publicação e integridade
- Somente C:/inetpub/stormpt/jogar-beta/native-inventory.js atualizado no IIS; Nginx e GameServer não alterados.
- SHA-256 fonte, staging AEROCOOL, IIS e HTTPS: d02498ef23d279ede5fe25f708adc228a34192e9f9f66ea0dd1d947033af2508.
- Backup IIS anterior e pré-correção no Windows: C:/StormPT-QA-Backups/20261024-0730-inventory-details.
- Backup de fontes anteriores no AEROCOOL: backups/20261024-0730-inventory-details.
- URLs verificadas: https://stormpt.hoststorm.com.br/jogar/ (HTTP 200, piloto QA); https://stormpt.hoststorm.com.br/jogar-beta/native-inventory.js (HTTP 200, SHA correto); asset de mapa sem autenticação HTTP 401.
- GitHub PR #2 recebeu código e testes; roadmap e progresso preservam conclusão global nula.

## Próximos bloqueios
- Não há item real no inventário da conta QA para validar detalhes contra GameServer em produção.
- Combate/monstros reais, skills, transações de inventário, chat entre dois jogadores, mais mapas/classes, áudio completo, GPU RX 550 e regressão desktop ainda pendentes.
- Benchmark GPU real no ZIEL requer execução no contexto gráfico interativo com WebGL2 efetivamente acelerado.
