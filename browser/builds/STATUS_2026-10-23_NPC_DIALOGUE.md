# StormPT Web — conversa com NPC real

Progresso global estimado: **65% / 100%** (antes: 64%).
0% ▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱ 100%

## Resultado
O cliente web consulta NPCs ativos de Ricarten pelo GameServer C++, com sessão e personagem reais. Envia somente sequência e serial do alvo. O servidor valida sessão, conta, personagem, campo, tipo do alvo, alcance horizontal de 160 unidades e altura, além de limitar consultas. A resposta contém nome, primeira fala original carregada e serviços declarados na configuração. Não executa compra, venda, reparo, restauração, aging ou alterações de inventário.

A lista Próximos permite selecionar um NPC. Duplo clique no modelo 3D foi implementado para modelos já convertidos; o caminho comprovado no teste público é a seleção pela lista. A interface usa textContent para dados vindos do servidor. Personagem para ao abrir a conversa, e pode continuar após fechar o painel. A primeira fala foi comprovada no Enzo, o Restaurador de Itens. Outros NPCs sem modelos convertidos continuam na lista/radar.

## Validação
- Build completa Release/Win32 concluída com sucesso; manteve avisos legados.
- 77/77 testes de transporte, incluindo ABI, identidade, texto, sequência, pedido pendente e rejeição antes da entrada no mundo.
- 27/27 testes de frontend.
- TCP real: alvo distante recusado, limite de frequência aplicado, alvo inexistente recusado, ausência de dados de NPC antes do login e resposta original de Enzo quando próximo. O listener legado pode ignorar silenciosamente pacotes antes do login; não se afirma encerramento imediato do socket.
- Chromium na URL pública /jogar/: login, personagem, mundo, fala original, fechamento e confirmações de movimento posteriores; zero erros JavaScript e nenhum mock. Evidências privadas: real-npc-result.json, real-npc-browser-result.json e client/qa/real-npc-dialog.png.
- Caminhada direta até Gus encontrou colisão; não se removeu a colisão nem se teleportou personagem. O teste positivo foi realizado no NPC mais próximo, Enzo.

## Conta e implantação
Botões de formulário começam desabilitados no HTML e são habilitados após inicializar os handlers e verificar a sessão ASP.NET existente. Isso impede envio nativo do formulário antes de o módulo estar pronto e evita competição com a consulta inicial de sessão. Nenhum sistema de conta separado foi criado.

Backup verificado de executável, DataServer e interface antes da troca; backup de nginx antes de ampliar a allowlist exata para npc-protocol.js. Nginx -t passou. Source canônica sincronizada somente após confirmar igualdade com a base anterior. Hash implantado: 81C3E0DCA141541EB199E4352F07C7E1798B0B2CBF140E9AF7B9765DEDBFB2DC. A carga inicial levou vários minutos e foi preservada até abrir a porta, sem reinícios sucessivos. Sem alterações em SQL ou dados de outros jogadores. Somente os personagens QA caminharam e tiveram suas posições salvas pelo servidor.

## Limites
Piloto permanece restrito à conta de QA e Ricarten/Lutador. Ainda faltam transações de NPC, inventário completo, combate, habilidades, chat, áudio, outros mapas/classes/modelos, regressão com cliente Windows e teste RX 550. Abertura nova permanece adiada a pedido do usuário. Percentual é estimativa, não declaração de jogo completo.
