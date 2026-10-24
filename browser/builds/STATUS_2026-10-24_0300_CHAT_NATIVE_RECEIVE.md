# StormPT Web — execução 03h, 24/10/2026

**Progresso global:** sem percentual defensável de equivalência ao cliente desktop. Piloto QA restrito; NÃO liberar acesso geral. O jogo não está completo.

## Avanço real: recebimento de chat nativo

Auditoria do código C++ original (somente leitura) revelou o motivo de não haver eco do próprio chat no teste anterior:
- Cliente envia `OPCODE_CHATMESSAGE=22`, conforme `Shared/smPacket.h` e `SrcGame/src/netplay.cpp`.
- `SrcServer/src/Server/OnSever.cpp` (rotina de distribuição de dados do jogador, ~12554–12598) retransmite o texto aos **outros jogadores próximos**, não ao remetente, como `OPCODE_WHISPERMESSAGE=26`. O protocolo `TRANS_CHATMESSAGE` usa cabeçalho de 16 bytes, `dwObjectSerial`, texto CP1252 em offset 16 e comprimento original `32+strlen` (15 bytes finais preenchidos com zero).
- O navegador antes interpretava apenas 22. Foi adicionado decodificador de 26 com verificação de comprimento, terminador, padding e controles. Não divulga IP da mensagem nem inventa nome de usuário. Mensagens inválidas são descartadas sem desconectar o mundo. Nenhum eco local falso foi adicionado.
- Arquivos: `transport/src/chat-protocol.mjs`, `client/src/browser-session.mjs` e testes `transport/test/chat-protocol.test.mjs`, `transport/test/chat-session.test.mjs`.
- **Teste real público** com conta QA: login, personagem e Ricarten ativos; 1 pacote de saída opcode 22; **6 pacotes nativos opcode 26 recebidos**, **1 linha de chat apresentada** pelo navegador; comandos bloqueados; sessão permaneceu no mundo; sem erro JS. A própria mensagem enviada não retornou, comportamento compatível com distribuição somente aos outros jogadores. **Ainda não testamos conversa entre duas contas/duas sessões QA autorizadas.**
- **Teste sintético isolado na URL pública** confirmou decodificação de 26, supressão antes da entrada no mundo, rejeição de frame malformado sem desconexão e ausência de eco local; nenhum POST ou conta adicional criada por esse teste.

## Máquinas e testes

1. **AEROCOOL — principal:** código e implantação QA, backup de arquivos anteriores, 101/101 testes de transporte, 38/38 testes unitários selecionados do frontend, Chromium real e sintético. Arquivos `/jogar-beta/browser-session.js` e `chat-protocol.js` atualizados com `File.Replace` atômico na VM Windows 11, após conferir SHA-256 anterior; os dois arquivos publicados por HTTPS respondem 200 com hashes idênticos aos aprovados. GameServer, SQL, contas e StormPK não alterados.
2. **SUPERFRAME — isolado:** checkout temporário do PR #2 (9b6c137), sobreposição dos quatro arquivos aprovados com SHA-256 idêntico; 101/101 testes de transporte e 21/21 testes frontend presentes nesse checkout. Primeira tentativa sem dependência `ws` falhou; `npm install` no checkout isolado resolveu; segunda execução passou. Relatórios recebidos no AEROCOOL e verificados por SHA-256.
3. **ORACLE — isolado:** checkout temporário PR #2 (9b6c137); 15/15 testes Python da pipeline aprovados. Log consolidado no AEROCOOL por SHA-256. Node.js 12 nesta máquina, portanto não utilizado para testes ESM modernos.
4. **ZIEL — VM IA GPU:** VM Windows 11 ativa, GTX 1650 com driver ativo, HTTPS `/jogar/` HTTP 200. **Nova medição de FPS NÃO aprovada:** Chrome headless retornou WebGL2 indisponível e Edge headless não gerou DOM; não afirmar novo FPS. O teste anterior interativo da GTX 1650 permanece a única referência válida.

## Publicação e limites

- URL do piloto: https://stormpt.hoststorm.com.br/jogar/ (restrito).
- Recursos JS atualizados: https://stormpt.hoststorm.com.br/jogar-beta/browser-session.js e https://stormpt.hoststorm.com.br/jogar-beta/chat-protocol.js (200, hashes aprovados).
- O teste anterior esperava o eco da própria mensagem, mas o C++ só a distribui aos outros jogadores próximos. **Canal de entrada nativo já confirmado com frames reais; comunicação entre dois jogadores ainda não demonstrada.**
- Não foram feitas mudanças no GameServer C++, banco SQL, contas, personagens, StormPK, arquivos originais do desktop nem configurações gerais de acesso.
- Backup local de fontes anteriores: `backups/20261024-0300-native-nearby-chat/`; backup do IIS na VM: `C:\StormPT-QA-Backups\20261024-0300\`.
- Relatórios auxiliares consolidados em `builds/`, com origens e hashes documentados no manifesto. Diretórios temporários auxiliares só devem ser limpos após confirmação final de backup e integridade.
- A suíte `node --test test-*.mjs` de todo o frontend NÃO é uma suíte unitária válida: 17 scripts são testes de browser/integração que exigem harness próprio. Os 38 testes unitários selecionados passaram, e Chromium real/sintético foi executado separadamente.

## Próximas prioridades

1. Teste chat entre **duas contas QA** e dois personagens próximos; observar opcode 26 do outro cliente, serial, distância e setor. Não ampliar whitelist nem criar conta sem aprovação.
2. Combate/skills nativos com validação autoritativa, inventário transacional, NPCs e áudio; manter regressão Windows antes de ampliar o piloto.
3. Recuperar teste interativo GTX 1650 e medir RX 550 separadamente; não tomar headless como benchmark da GPU.
4. Manter documentação de paridade com o desktop, conversões e publicação aprovadas exclusivamente no AEROCOOL.
