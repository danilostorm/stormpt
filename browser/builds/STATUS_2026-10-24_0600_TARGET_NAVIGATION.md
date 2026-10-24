# StormPT Web — 24/10/2026 06h — navegação por alvos e auditoria de combate

**Progresso global:** sem percentual mensurável de paridade desktop (DESKTOP_PARITY.md). **Não é combate funcional.** Piloto permanece fechado.

## Implementado no piloto QA
- client/src/native-target.mjs: cycleMonsterTarget percorre somente monstros vivos dos snapshots autenticados do GameServer, ordenados por distância e serial. Ignora NPCs, jogadores, monstros mortos, dados inválidos e alvos fora do raio. Nenhum pacote de ataque.
- client/src/native-world-view.mjs: tecla T seleciona o próximo monstro; Shift+T retorna ao anterior, com canvas focado. Duplo clique em modelo de monstro suportado seleciona o alvo; duplo clique em NPC mantém a conversa. Modelos de monstros não suportados continuam selecionáveis pelo radar ou tecla T.
- Dois módulos JS publicados no IIS do piloto QA após comparação de baseline, backup e SHA-256; arquivos públicos idênticos aos aprovados.

## Testes
- AEROCOOL: 47/47 testes frontend selecionados, 101/101 transporte, 4/4 novos testes de ciclo, Chromium isolado de teclado sem erro JS nem POST.
- A primeira tentativa de regressão falhou por import incorreto no teste novo; o código foi revertido, o import corrigido e as suítes finais passaram.
- Chromium HTTPS público autenticou conta QA, entrou em Ricarten, carregou módulo novo e executou seleção por função com fixture no próprio domínio. Sem monstros vivos na sessão, T não selecionou alvos falsos. Zero erros JS e falhas HTTP de módulos. Duplo clique em monstro real não testado.
- SUPERFRAME: pacote SHA-256 ab3b31433cca75af9a36dcbbc9d71fb3052751ebc6a40e29406fa0163f651f53, 4/4 testes Node.
- ORACLE: mesmo pacote SHA-256 confirmado, integração estática Python aprovada; Node 12 não analisa optional chaining. Sem testes Node modernos na ORACLE.
- ZIEL: VM IA ativa, GTX 1650 driver 32.0.16.1088 OK, Chrome/Edge instalados, QA HTTPS 200; sem novo benchmark FPS.
- GameServer TCP 1997 acessível; /jogar/ HTTP 200; piloto QA restrito.

## Auditoria somente leitura do combate original
- C++ Windows: dm_SendTransDamage prepara TRANS_ATTACKDATA2 com coordenadas, Power e OpCode::OPCODE_ATTACK_DAMAGE. O trecho QuickSendTransAttack inspecionado contém retorno antecipado; não comprova envio funcional.
- Não enviar dano arbitrário do navegador. Antes do combate, mapear ABI e implementar/verificar intenção de ataque validada no GameServer: alcance, frequência, equipamento, classe, habilidade, resistência, anti-replay e respostas de HP/morte/EXP/loot.
- Nenhum ataque, monstro, dano, item ou EXP criado nesta execução.

## Preservação
- AEROCOOL único destino definitivo; backup prévio em backups/20261024-0600-target-navigation/ e IIS em C:\StormPT-QA-Backups\20261024-0600-target-navigation.
- Temporários de SUPERFRAME e ORACLE só serão removidos após consolidação com checksum e backup verificados.
- StormPK, SQL, contas, personagens, GameServer e outros projetos não modificados.

## Próximos passos
1. Validar monstro real em sessão QA segura sem alterações persistentes.
2. Implementar ataque/dano server-authoritative com testes negativos e regressão desktop.
3. Inventário transacional, habilidades, efeitos, mapas/classes, chat dois jogadores, áudio, RX 550 e segurança geral.
