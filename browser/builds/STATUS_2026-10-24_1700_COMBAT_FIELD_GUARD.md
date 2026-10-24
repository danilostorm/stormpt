# StormPT Web — 24/10/2026 17h — guardas nativas para mapa de combate (staging)

## Pré-inspeção
- GitHub PR #2 aberto, HEAD 6a7a6409e70a492c5de4392d5703f76796e0d1e5 antes das mudanças.
- ROADMAP.md, PROGRESS.json, relatório 16h, browser_world.hpp, browser_entities.hpp, resolvers C++ e fonte original OnSever.cpp inspecionados.
- Problema real encontrado: o cliente QA atual força o campo 3 (Ricarten/vila), e os validadores de combate isolados também fixavam campo 3. O GameServer original bloqueia ao menos certas rotas de monstros em campos do tipo vila. Nenhum spawn deve ser fabricado em Ricarten.

## Mudança no código-fonte (NÃO publicada no GameServer)
- browser_combat_intent.hpp: ActorContext exige sinal explícito combatAreaAllowed obtido do estado nativo, não do navegador. Campo de combate deixa de ser fixado em 3; rejeita área não autorizada e valores inválidos.
- browser_combat_native_resolver.hpp: resolução do monstro recebe índice de campo e ponteiro nativo de estágio; ambos precisam corresponder. A quantidade de estágios deve vir do servidor (STAGE_AREA_MAX) para rejeitar índice fora da tabela.
- Resolução do personagem exige campo nativo correspondente à posição do jogador, sessão ativa, identidade original, vida e heartbeat; recusa áreas não habilitadas para combate.
- Três suítes C++ atualizadas para cenários sintéticos de campo 4 e rejeição explícita de vila, campo divergente, limite de tabela, NPC, serial repetido, alvo morto, distância e sessão inválida.
- A fonte do GameServer em produção NÃO foi modificada, compilada ou reiniciada. A escolha de um mapa real e seu estado de combate continuam pendentes.

## Testes verificáveis
- AEROCOOL, contêiner local node:24-bookworm com g++ C++11 e rede desabilitada, limite de CPU/memória: preflight 30/30; gate 35/35; resolver 65/65; resolver também 65/65 com AddressSanitizer e UBSan.
- AEROCOOL: 109/109 testes de transporte Node; 6/6 testes JavaScript de intenção de ataque.
- SUPERFRAME: HTTPS QA 200, asset privado sem sessão 401, módulo JS QA 200.
- ZIEL: VM IA ativa (12 vCPU), GTX 1650 PCI 04:00.0 atribuída via VFIO; nenhum benchmark Chrome/Edge/WebGL2 executado nesta rodada.
- ORACLE: acesso SSH ainda requer autenticação Tailscale; nenhum build/cópia/remoção realizada.

## Limitações e segurança
- Os testes usam fixtures sintéticas de mapa 4; NÃO comprovam que o mapa 4 seja apropriado para combate. Não há monstro real QA, ataque jogável, dano, morte, EXP ou loot. Cliente web continua limitado a Ricarten; mapa não foi trocado.
- Não houve alteração de GameServer, SQL, contas, personagens, StormPK, IIS ou Nginx; piloto QA permanece fechado.
- Percentual global de paridade desktop continua não auditado.
- Próxima etapa: inventariar mapa nativo com estado diferente de FIELD_STATE_VILLAGE, spawn e assets originais; implementar transição validada em QA isolado e somente então ligar o ataque ao GameServer sob regras transacionais originais.
