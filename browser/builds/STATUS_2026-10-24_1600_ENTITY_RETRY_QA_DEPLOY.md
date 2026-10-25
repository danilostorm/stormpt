# StormPT Web — 24/10/2026 16h — retry de modelos publicado no QA

## Alteração real
- Publicados em conjunto `native-entity-view.js` e `entity-asset-retry.js` no IIS Windows do StormPT, exclusivamente em `/jogar-beta/`, após cópia de rollback do arquivo antigo e conferência SHA-256 dos temporários no Windows.
- O bridge Nginx no AEROCOOL recebeu somente o novo arquivo `entity-asset-retry.js` na allowlist explícita de módulos; `nginx -t` passou antes e depois de reload, sem ampliar o restante das rotas.
- Correção da execução anterior: falhas transitórias de download de modelos originais agora tentam novamente apenas em snapshots subsequentes (1/2/4/8/16/30s, uma requisição em voo). Nenhuma entidade sintética, dano ou ataque novo.
- Fonte, staging, IIS e HTTPS (com query de cache nova) têm SHA-256 iguais: renderer `8315af0afd56d75adb51fe50d03ad9d90a6064bc472f70a236383dd302bf7e6e`; helper `202f260d6cb8fb98c633038e8bbae82151466966553d2fd2c390d4bb99cb0ff9`.
- O arquivo anterior do renderer (SHA-256 `47a2d9bd68f36b550ffa8f3ffae8d8a6b1393dc3f57f565f3d4203202a406986`) foi salvo no AEROCOOL e no Windows para rollback.

## Testes
- AEROCOOL: 14/14 testes selecionados de frontend/Three/retry e 109/109 testes de transporte, todos aprovados.
- Chromium anônimo HTTPS: imports reais de `native-world-view.js`, `native-radar.js` e `entity-asset-retry.js`, sem erros JS ou respostas 4xx de módulos; teste de fixture aprovado.
- Chromium QA com conta real: primeira tentativa falhou por timeout WebSocket na autenticação (sem erro JS); segunda tentativa passou sem reiniciar serviços: login, personagem, Ricarten, 14 modelos originais de NPC, inventário vazio de consulta, movimento e saída. Erros JS: zero.
- **Teste de recuperação HTTPS/QA real:** no Chromium, uma requisição autêntica ao modelo original do NPC Enzo foi abortada intencionalmente no navegador (falha de rede controlada, sem alterar GameServer ou dados). O próximo snapshot disparou a segunda requisição, que passou; os 14 NPCs voltaram a ser renderizados, erro transitório removido e zero erros JavaScript. Resultado: 2 tentativas, 1 falha injetada e 1 recuperação. Primeira tentativa deste teste falhou ainda na navegação pública (ERR_SOCKET_NOT_CONNECTED, antes do login); repetição passou.
- HTTPS: `/jogar/` 200; ambos módulos 200 e hash exato; `BrowserAssets.ashx?asset=npc-dmeca` sem sessão 401; acesso a web.config 403.
- Teste WebSocket de diagnóstico com Origin correto e HTTP/1.1: rota local e pública rejeitam sem sessão (401). O timeout da primeira tentativa de login merece observação; a repetição passou.

## Máquinas
- AEROCOOL: fontes, Node/Chromium Docker, bridge Nginx, scripts de deploy, logs, backups e consolidação.
- AEROCOOL / VM Windows 11 do StormPT: IIS QA atualizado por QEMU guest-agent; backup anterior salvo fora da pasta pública.
- ZIEL / VM IA Windows 11: GTX 1650 detectada com driver 32.0.16.1088 (OK), Chrome e Edge presentes, sessão console ativa; **não houve benchmark novo nem validação WebGL2 acelerada**.
- SUPERFRAME: SSH e HTTPS QA 200; nenhum novo build nem cópia.
- ORACLE: SSH bloqueado por verificação adicional Tailscale; nenhum processamento ou limpeza.

## Segurança e pendências
- GameServer, SQL, contas, personagens e StormPK não foram alterados intencionalmente; nenhum restart do GameServer ou gateway.
- Piloto QA continua fechado, assets autenticados.
- Pendente: monstro real em mapa QA apropriado, integração segura do ataque C++ ao GameServer, dano, morte, EXP, loot, habilidades, inventário transacional, regressão cliente Windows e benchmark GTX 1650 com browser acelerado.
- GameServer original verificado novamente no Windows: SHA-256 `355970C565149F86EB302B98663ABA3CD7EA07BCD6D253434C5C83C210C4D428`, processo ativo e porta 1997 escutando.
- SUPERFRAME conferiu independentemente os dois SHA-256 públicos e asset privado 401.
- Sem percentual global auditado. Esta execução publica e valida a correção de renderização, NÃO habilita combate.

## Consolidação
- Arquivo de evidências aprovado no AEROCOOL: `backups/20261024-1600-entity-retry-deploy/approved-entity-retry-1600.tar.gz` (34 entradas, 34 hashes conferidos).
- Rollback: cópia do renderer IIS anterior no AEROCOOL e em `C:\StormPT-2703\BrowserQA\Backups\20261024-1600-entity-retry` na VM Windows; cópia da configuração Nginx anterior no AEROCOOL.
- Nenhum diretório temporário criado em ZIEL, SUPERFRAME ou ORACLE nesta execução; nenhuma limpeza remota necessária.
