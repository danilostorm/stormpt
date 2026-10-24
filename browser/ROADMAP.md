# StormPT Web — roadmap e critérios de aceitação

Início: 23/10/2026, 00:55, horário de Brasília.

Objetivo: jogar o StormPT REAL em https://stormpt.hoststorm.com.br/jogar sem instalar Game.exe ou launcher, com login, personagens, mapas 3D, animação, áudio e combate ligados ao servidor existente.

## Não negociável
- A página web não será publicada como jogo funcional até que entre no servidor e permita controlar um personagem real.
- Manter intactos o jogo Windows, o SQL e a base de personagens; tudo isolado em /mnt/user/appdata/stormpt-browser.
- Renderer: Three.js/WebGL2; WebGPU opcional depois de medir; WebAssembly apenas quando C++ valer a pena.
- Não divulgar credenciais, certificados privados, backups ou portas TCP.

## A. Infraestrutura e formatos
- [x] Fonte C++ do cliente localizada em C:/StormPT-2703/Source/SrcGame/src (628 arquivos).
- [x] Servidor StormPT original na VM Windows 11: TCP 1997 preservado.
- [x] Protótipo isolado do Pillai na porta 3898 removido.
- [x] Pacotes binários de 8 bytes + conteúdo com limite de 8192 bytes implementados.
- [x] Gateway WebSocket/TCP de desenvolvimento com HMAC e anti-replay; teste conectou ao servidor real.
- [x] LoginPacket real: campos/offsets e opcode identificados e testados, mas login web não executado.
- [x] Cabeçalho de mapa SMD lido diretamente dos assets oficiais, com testes (AncientW).
- [ ] Extrair geometria, UV, materiais e texturas SMD e modelos/rigs do jogo.
- [ ] Pipeline de conversão e cache de assets com transparência, LOD, colisão.

## B. Jogo REAL no navegador
- [x] Login web seguro com ticket vinculado à conta e autorização real do GameServer (piloto QA).
- [x] Lista de personagens, criação de Lutador, seleção e carregamento real (piloto QA).
- [ ] Three.js/WebGL2: cena real, câmera e avatar com malha/texturas/animação.
- [ ] Posições do mundo sincronizadas por pacotes originais.
- [ ] Movimento e colisão reais, NPCs, mobs e jogadores conectados.
- [ ] Combate, skills, inventário, chat, comércio, áudio e interface completa.

## C. Performance / publicação
- [ ] InstancedMesh, culling, LOD, KTX2/Basis com fallback, streaming do mundo.
- [ ] Perfil RX 550, resolução 1080p, frametime/1% lows. Alvo aspiracional 60 FPS sem promessa antecipada.
- [ ] HTTPS, WebSocket autenticado, rate limits, anti-cheat server-authoritative e testes de carga.
- [ ] Publicar /jogar somente depois de login real, personagem persistente e movimentação funcional.

## Execuções até 07:00
Agendadas de hora em hora: 01:00, 02:00, 03:00, 04:00, 05:00, 06:00 e 07:00, 23/10/2026, São Paulo/Brasília. Cada execução deverá fazer progresso técnico verificado e relatar o que realmente funciona. A última fará relatório de resultados, sem fingir jogo completo.

### Execução 01:00 — descoberta confirmada no asset real
- [x] Identificado layout 32-bit exato de smSTAGE3D: **262260 bytes** (campos TexClip eram de outro struct e não pertencem ao stage).
- [x] Lidos dados reais do AncientW.smd na VM Windows 11, sem alterar o arquivo.
- [x] Validado: **65058 vértices, 100661 faces, 184566 links UV, 671 materiais declarados, 129 usados e 35 luzes**.
- [x] Todos os 100661 triângulos passaram nas verificações de índices de vértices, materiais e ponteiros de UV (zero inválidos).
- [x] Metadados gravados em assets/ancientW.stage.validation.json.
- [ ] Conversão de malha completa em GLB e carregamento na GPU ainda não testados no servidor.
- [ ] Login e personagens reais ainda não implementados no navegador.

### Execução 04:00 — pipeline de registros reais integrado (sem login)
- [x] Implementado no AEROCOOL transport/src/record-fragments.mjs a partir de record.h e record.cpp, com 20 bytes de campos + 12 bytes de overhead no pacote; reconstrução até 64 fragmentos de 8160 bytes.
- [x] Corrigido problema de arrays esparsos na remontagem (testes encontraram e preveniram erro), aceito Total=0 no caso legado de pacote único e último fragmento de 1 byte.
- [x] transport/src/record-identity.mjs lê o smCHAR_INFO verdadeiro dentro de TRANS_RECORD_DATA: nome, modelos, serial, classe e nível, sem gravar inventário/SQL.
- [x] transport/src/character-session.mjs associa lista opcode 9 à conta esperada, seleção explícita e registro reconstruído opcode 4 ao nome selecionado; observador somente leitura, sem autenticação inventada.
- [x] Teste de integração com servidor TCP local sintético e gateway WebSocket real, incluindo fragmentação TCP, lista e reconstrução de personagem; não representa login no servidor de produção.
- [x] 29 testes Node aprovados, teste separado de conexão autorizada WS → TCP 192.168.30.169:1997 aprovado.
- [x] /jogar segue HTTP 404, protótipo 3898 continua removido. Nenhuma alteração no servidor/SQL.
- [ ] Pendente crítico: emissão de tickets vinculados a contas autenticadas pelo servidor, pacote de seleção de personagem enviado pelo cliente real, retorno real da lista e registro sem dados de teste.
- [ ] Pendente gráfico: conversão completa e renderização de mapas, modelos, texturas e animações em Three.js/WebGL2.
- [x] Identificado o pedido original de carregamento de personagem em SrcGame/src/netplay.cpp:8800-8817: opcode 5, estrutura smTRANS_CHAR_COMMAND de 52 bytes, nome no offset 20, versão do cliente e checksum nos offsets 16 e 12. Serializer com testes, sem envio ao servidor.
- [ ] Bloqueio de compatibilidade: a versão web não tem Game.exe para gerar dwExeCheckSum; o servidor precisa aceitar um ticket de cliente web validado, sem desabilitar a segurança para o cliente Windows.

## Progresso comprovado às 05:00 de 23/10/2026
- [x] Copiar o mapa AncientW SMD verdadeiro da VM Windows 11 (somente leitura).
- [x] Converter geometria SMD verdadeira em GLB (100.661 triângulos).
- [x] Decodificar 671 registros de materiais do SMD; recuperar 97 texturas originais.
- [x] Produzir GLB texturizado com 65 texturas efetivamente usadas e 129 materiais.
- [x] Validar ambos os GLBs com Khronos glTF Validator (zero erros e zero avisos).
- [ ] Testar renderização em navegador com WebGL2 real.
- [ ] Autenticação web segura, seleção e carregamento de personagem real.
- [ ] Movimentação, combate, inventário, áudio e gameplay completo.

## Progresso confirmado às 06:00 de 23/10/2026

- [x] **Renderização real WebGL2 validada em navegador Chromium**: imagem original `AncientW.textured.glb` carregada via `GLTFLoader`, 129 meshes, 100.661 triângulos e texturas originais, sem erros JavaScript.
- [x] Módulo Three.js `client/src/world-scene.mjs` com resize, câmera, descarte de recursos, contagem de triângulos, telemetria e modo de renderização com um passe para materiais transparentes double-sided.
- [x] Teste de navegador automatizado `client/qa/test-stage-browser.mjs` via Playwright/Chromium com SwiftShader. Após otimização: 129 draw calls e 100.661 triângulos desenhados; 15 FPS após aquecimento **em CPU virtual SwiftShader**, NÃO benchmark RX 550.
- [x] Screenshot real de Chromium salvo em `client/qa/stage-0600-chromium.png` e prévia `stage-0600-preview.jpg`. Nenhuma simulação de personagem ou gameplay.
- [x] Teste local HTTP ligado somente a 127.0.0.1 e encerrado ao final; `/jogar` permanece não publicado.
- [ ] Login real, seleção de personagem real e sincronização com servidor ainda não implementados. **Não chamar de jogo jogável.**

## Encerramento da madrugada — 07:00 de 23/10/2026
- [x] 39 testes Node aprovados; browser-native `Uint8Array/DataView` em protocolo e observador.
- [x] Chromium real importou módulos ES e recebeu lista de personagem sintética por WebSocket, sem `Buffer` e sem enviar pacotes de jogo.
- [x] Autenticação real do jogo localizada no ASP.NET `Conta.aspx` do IIS (sessão `StormPTPlayer` + CSRF `StormPTCsrf`), **diferente do login PHP do site**.
- [x] Rascunho do emissor de tickets ASP.NET compilado em memória (não publicado); gateway com validação de conta/ticket vinculado testado em TCP 1997 sem login.
- [x] `AncientW.textured.glb` renderizado em WebGL2 no Chromium na execução anterior.
- [ ] Login real no navegador, lista de personagens verdadeira e entrada no mundo.
- [ ] Modelos animados, movimentação, NPCs, combate, áudio, inventário.
- [ ] Publicação de `/jogar`: **não autorizada até o cliente ser jogável**.
Relatório: `builds/STATUS_2026-10-23_0700.md`.

## Continuação pelo chat — 07:19–07:35 de 23/10/2026

- [x] Fonte completa após as 07:00 auditada; 39 testes existentes de protocolo ainda passam.
- [x] Leitor do **SMD Model 0.62** construído a partir de `smOBJ3D`/`smPAT3D` originais do cliente, com estrutura serializada de 2236 bytes por objeto, suporte a ponteiros UV relativos e blocos de pesos/bones preservados para futura animação.
- [x] Corpo original `char/tmABCD/MmbA01.smd` lido e convertido: 15 objetos, 2154 faces e 3 materiais. Modelo `Ginkgobear.smd` convertido: 2 objetos e 418 faces.
- [x] Descoberta da ofuscação **BMP/TGA nos próprios arquivos C++** `smTexture.cpp:DecryptBMP/DecryptTGA`; restaurados dois BMPs reais de corpo e um TGA real de monstro, sem alterar os arquivos originais.
- [x] GLBs texturizados produzidos: `assets/converted/MmbA01.textured.glb` e `assets/converted/Ginkgobear.textured.glb`.
- [x] Khronos glTF Validator: **zero erros, zero avisos** nos dois GLBs texturizados.
- [x] Chromium WebGL2 real (SwiftShader por CPU virtual): renderização dos dois modelos originais, 17 meshes com texturas, 19 draw calls, 2990 triângulos, nenhum erro JavaScript. Prova apenas carregamento gráfico, NÃO autenticação ou gameplay.
- [x] `client/src/character-assets.mjs`: whitelist segura para escolher arquivo de corpo vindo do `smCHAR_INFO`; não aceita modelo fictício, entrada com caminhos inseguros ou spawn sem registro autorizado e coordenadas confiáveis. 4 testes novos aprovados.
- [ ] **Bloqueio crítico:** emissão e aceitação de ticket web no GameServer original, seguida da lista/opcode 9 e seleção/record opcode 5/4 reais, sem forjar checksum de Game.exe.
- [ ] Esqueleto/skeletal animation do `.smb`, skinning, posição sincronizada do GameServer, controle, NPCs, monstros, combate, chat e interface.
- [ ] Renderização na RX 550 física e medição de 60 FPS ainda não efetuadas.
- [ ] Sem exposição do `/jogar` como jogo até existir personagem realmente controlável.

## Continuação pelo chat após 07:35 (23/10/2026)
- [x] client/src/authoritative-world.mjs: fixed-point PT/256, ticks monotônicos, vínculo a sessão e interpolação limitada aos estados confirmados.
- [x] client/src/character-view.mjs: asset original e câmera acompanhando coordenadas recebidas; sem manipular servidor.
- [x] Testes unitários: 9 de 9 aprovados.
- [x] Teste WebGL2/Chromium interno: AncientW (129 malhas) + MmbA01 (15 malhas), 107 draw calls visíveis, 85918 triângulos efetivamente desenhados e zero erros JS.
- [x] Cenário QA explicitamente sintético, NÃO representa login ou personagem real autenticado.
- [ ] Emissão de ticket web ASP.NET, aceitação pelo GameServer, escolha de personagem verdadeiro e movimentação real ainda pendentes.
- [ ] A consulta ao login da VM foi bloqueada; nenhuma alteração aos dados da produção.

## 23/10/2026, 08:35–09:00 — login e cadastro dentro do navegador
- [x] Interface de login e registro em modal, usando imagem do próprio mapa AncientW como fundo, sem copiar arte do concorrente.
- [x] Integração JavaScript com o Conta.aspx original (CSRF, sessão same-origin, login, register, logout). Não grava senhas no browser.
- [x] Chromium passou login, cadastro e logout com backend simulado. Nenhuma conta real foi criada.
- [x] Formulários reais existentes confirmados com requests GET sem credenciais nem mutação.
- [x] Prévia HTTPS publicada em https://stormpt.hoststorm.com.br/jogar-beta/index.html pela VM IIS e allowlist de rota no Nginx AEROCOOL.
- [x] Chromium na URL pública carregou interface; somente erro de telemetria Cloudflare, independente do StormPT.
- [ ] Sessão GameServer Web, entrada no mundo, animações, combate, inventário, chat, áudio e otimização ainda não completos.
- [ ] Esqueci senha ainda não implementado no portal; a UI informa isto.

## Retomada Work — autenticação nativa
- [x] Validador C++17/Win32 BCrypt compilado na VM: 22 verificações aprovadas, incluindo C#/Node, replay e concorrência.
- [x] Ticket nativo separado por audiência/chave no rascunho ASP.NET; não implantado.
- [x] Gateway: timeout passivo corrigido com três regressões novas, 49/49 testes aprovados.
- [ ] Integrar ticket à fila real de login e preservar políticas de conta; login/personagem/movimento ainda pendentes.
- Progresso global mantido em 32%. Relatório: builds/STATUS_2026-10-23_WORK_AUTH.md.

## Work — login nativo real no navegador, 23/10/2026
- [x] Conta real criada/autenticada pelo ASP.NET existente.
- [x] Tickets reais e entrada web nativa ligados à fila C++ do GameServer.
- [x] Lista verdadeira opcode 9 recebida; conta nova com zero personagens.
- [x] Chromium público HTTPS/WSS passou sem mocks e sem erros JS.
- [x] Assinatura adulterada, replay e conta bloqueada rejeitados no servidor real.
- [x] Tabelas de segurança ausentes criadas após backup verificado; dados existentes preservados.
- [x] Fonte canônica e serviço atualizados; gateway Docker em localhost com proxy autenticado.
- [ ] Criar/selecionar personagem real e carregar registro, mapa e movimento.
- Estimativa global: 40%. Relatório: builds/STATUS_2026-10-23_NATIVE_LOGIN_REAL.md.

## Work — personagens persistentes e Ricarten, 23/10/2026
- [x] Dois personagens legítimos da conta QA; criação pelo GameServer e pela UI pública.
- [x] Reconexão, lista não vazia, seleção opcode 5 e registro opcode 4 reais no Chromium.
- [x] Servidor rejeita nome duplicado, classe não habilitada, caminho inválido e nome ausente da conta.
- [x] ABI de registro e ossos medida por compilação Win32; 61/61 testes de transporte e 17/17 de frontend.
- [x] Ricarten: 44226 triângulos, 261 texturas; uma imagem ausente no cliente original.
- [x] Pose base do Lutador reposicionada pelos 64 ossos reais; quatro malhas/722 triângulos do LOD alto.
- [x] Winding Direct3D/WebGL corrigido e captura privada do registro real renderizada; três GLBs sem erros/avisos Khronos.
- [ ] Ligar cena à sessão ativa; movimento confirmado pelo servidor, colisão, persistência da posição e animação.
- Progresso global estimado: 46%. Relatório: builds/STATUS_2026-10-23_REAL_CHARACTER_RICARTEN.md.

## Marco verificado — 23/10/2026: caminhada real (57%)

<progress value="57" max="100">57%</progress>

- [x] Sessão ativa em Ricarten, personagem original e câmera pública WebGL2.
- [x] Intenção de direção com confirmação e posição autoritativa do C++ original.
- [x] Altura e CheckNextMove originais, persistência e reconexão real.
- [x] Piloto fechado QA em /jogar, sem liberar outras contas.
- [ ] Teste dedicado de paredes, regressão Windows e segurança para acesso geral.
- [ ] Animação, entidades, combate, inventário, chat e áudio.

Ver builds/STATUS_2026-10-23_REAL_WORLD_MOVEMENT.md; os itens anteriores incompletos que abrangem sistemas adicionais continuam pendentes.

## Marco verificado — 23/10/2026: animação e colisão (60%)

<progress value="60" max="100">60%</progress>

- [x] Lutador: 64 ossos originais, espera/caminhada e skinning GPU no piloto público.
- [x] Comparação com rotinas C++: 46080 componentes, diferença máxima de uma unidade de ponto fixo.
- [x] Colisão real: quatro bloqueios sem deslocamento e recuo autorizado; cobertura de todos os obstáculos pendente.
- [ ] Outras classes/equipamentos, animações de combate, entidades e segurança para abertura geral.

Ver builds/STATUS_2026-10-23_ANIMATED_WALKING.md.

## Atualização — entidades e GPU — 23/10/2026

Progresso global estimado: **64%**. <progress value="64" max="100">64%</progress>

Snapshots nativos somente de leitura, radar real e primeiro NPC original (Ferreiro Gus, pose estática) integrados. GTX 1650 confirmou ~56 FPS em 1080p. Ver relatório builds/STATUS_2026-10-23_ENTITIES_GPU.md para validações e limitações. NPCs animados/interativos, combate, demais sistemas, RX550, regressão Windows e segurança para acesso geral seguem pendentes.

## 24/10/2026 02h — chat nativo no piloto fechado (não concluído)

- [x] PR #2, PROGRESS.json, relatórios e fontes do AEROCOOL reconciliados. Estimativa global suspensa.
- [x] Chat opcode 22: interface, sessão e gateway. Envio CP1252, 70 bytes, rejeição de comandos, limitação de taxa, texto do servidor sem HTML. Pacote de chat inválido não derruba a sessão do mundo.
- [x] 96/96 testes de transporte no AEROCOOL, 38/38 testes unitários selecionados do cliente, Chromium do HUD aprovado; SUPERFRAME 96/96 com fontes idênticas por SHA-256.
- [x] ORACLE: 15/15 testes Python de pipeline em checkout isolado; logs no AEROCOOL com SHA-256.
- [x] Código publicado somente no piloto QA /jogar com seis módulos JS; IIS e AEROCOOL conferidos por SHA-256. SQL, GameServer e StormPK não modificados.
- [x] Chromium público autenticou conta QA, carregou Ricarten, bloqueou comando /admin, transmitiu um pacote nativo opcode 22 e permaneceu no mundo sem erro JS.
- [ ] Recepção do chat ainda não confirmada: zero broadcasts opcode 22 retornaram ao mesmo cliente QA em 12 segundos; testar segundo cliente real e caminho de broadcast nativo.
- [ ] ZIEL: GPU GTX 1650/driver verificados; benchmark anterior 23/10 17:44 (~56 FPS). Nova tentativa Edge headless não produziu DOM, portanto sem novo benchmark válido.
- [ ] Falta equivalência desktop: combate, skills, NPCs transacionais, inventário editável, chat bidirecional, áudio, classes/mapas, testes RX 550, segurança geral e regressão Windows.
- [x] Limpeza pós-consolidação verificada: temporários próprios em SUPERFRAME, ORACLE e probe Edge no ZIEL removidos após hashes e backup no AEROCOOL.

## 24/10/2026 03h — recebimento do chat nativo do GameServer
- [x] Inspeção C++ original confirmou opcode 22 (envio) e opcode 26 (recepção por jogadores próximos), sem eco ao remetente.
- [x] Decodificador seguro de TRANS_CHATMESSAGE (16 bytes de cabeçalho, CP1252, tamanho 32+strlen, NUL/padding) sem divulgar IP ou atribuir identidade falsa.
- [x] 101/101 transporte no AEROCOOL e SUPERFRAME; 38/38 frontend unitário no AEROCOOL; 21/21 unitários do checkout PR no SUPERFRAME; 15/15 pipeline no ORACLE.
- [x] Chromium público QA: login, personagem, Ricarten, envio opcode 22, seis frames reais opcode 26 e uma linha de chat recebida; sem eco próprio ou erros JS.
- [x] Dois módulos JS publicados somente no piloto QA após backup, conferência de SHA-256 e verificação HTTPS.
- [ ] Conversa entre dois jogadores reais ainda não comprovada. Não afirmar chat multiplayer completo.
- [ ] ZIEL: novo benchmark GTX 1650 inconclusivo (Chrome headless sem WebGL2, Edge sem DOM). Sem FPS novo.
- [ ] Combate, skills, inventário transacional, áudio, classes/mapas, regressão Windows e abertura geral continuam pendentes.
- Progresso global continua sem percentual confiável; ver `builds/STATUS_2026-10-24_0300_CHAT_NATIVE_RECEIVE.md`.

## 24/10/2026 04h — música e ambiente ORIGINAIS de Ricarten, QA real
- [x] Inspeção somente leitura do cliente original Windows: BGM Town 1 - Tempskron_Ricarten - When wind comes-o.bgm é RIFF/WAVE PCM estéreo 22.050 Hz, duração 95,99 s. Áudio ambiente tempskron-town.wav tem cabeçalho proprietário JODOLH; convertido para RIFF alterando somente os primeiros oito bytes, PCM original preservado (4,88 s).
- [x] Conversor assets/converter/legacy_audio.py: conversão estrita, sem sobrescrever arquivo diferente; 6/6 testes Python.
- [x] client/src/native-audio.mjs: controle opcional com clique do usuário, música e ambiente originais em loop, volume, desligar, pausa em segundo plano, limpeza ao sair; sem autoplay ou áudio falso.
- [x] BrowserAssets.ashx: duas entradas novas explicitamente permitidas, MIME audio/wav, mesmas verificações de sessão ASP.NET e conta QA, sem servir assets originais publicamente.
- [x] Teste Chromium isolado com dois WAVs originais: sem download antes do clique; reprodução, volume, pausa/reinício, descarte e ausência de erros JS.
- [x] Teste Chromium na URL HTTPS pública com conta QA REAL: login, personagem, Ricarten, duas respostas audio/wav HTTP 200, duas trilhas tocando, sem autoplay, volume e desligamento aprovados, sem erro JS.
- [x] 101/101 transporte, 38/38 frontend unitário e 6/6 conversor no AEROCOOL; SUPERFRAME 101/101 do PR anterior; ORACLE 15/15 pipeline. Logs auxiliares consolidados com SHA-256.
- [x] ZIEL VM IA ativa, GTX 1650 com driver OK, Chrome/Edge presentes e /jogar HTTPS 200; nenhum benchmark novo de FPS.
- [x] GameServer Server33.exe SHA-256 original intacto, piloto fechado e assets de áudio restritos ao QA.
- [ ] Paridade de áudio desktop incompleta: passos, combate, NPCs, efeitos, músicas dos demais mapas e ajustes de mixagem/posição.
- [ ] Chat entre dois jogadores, combate, skills, inventário transacional, mapas/classes, RX 550 e regressão Windows permanecem pendentes.
- Progresso global sem percentual confiável. Relatório: builds/STATUS_2026-10-24_0400_AUDIO_NATIVE.md.

## 24/10/2026 05h — seleção de monstros e HP autoritativo (sem combate)
- [x] Inspecionados PR #2, DESKTOP_PARITY.md, PROGRESS.json e relatório 04h antes de modificar.
- [x] Nova seleção de monstros (kind=2) pelo radar; nome, nível, distância e vida vêm exclusivamente de snapshots do GameServer, sem inventar dados.
- [x] Atualização de HP/distância com snapshots seguintes, limpeza automática quando monstro desaparece; jogador/NPC não são tratados como monstro.
- [x] UI segura por textContent, barra de vida acessível, sem emitir ataques, dano ou comandos ao servidor.
- [x] Testes: 101/101 transporte, 43/43 frontend unitário selecionado, 9/9 pipeline Python, 8/8 radar/alvo, Chromium isolado passou; SUPERFRAME 8/8 com tar SHA-256 idêntico, ORACLE checagem sintática (Node 12 não suporta --test).
- [x] Chromium HTTPS com conta QA REAL carregou personagem e Ricarten, novo painel presente, sem erros JS ou 4xx em módulos. Primeira tentativa desconectou antes do mundo; segunda tentativa passou. Não há monstro vivo em Ricarten QA para testar seleção com GameServer real.
- [x] Publicado somente em /jogar QA; Nginx permitiu apenas native-target.js. Cache externo de 404 antigo exigiu import versionado ?v=20261024-0500.
- [ ] Não é combate: faltam spawn de monstro real na sessão QA, intenção de ataque, validação nativa, dano, morte, loot, EXP e testes de segurança.
- [ ] Nenhum percentual global de paridade com desktop calculado. Consultar DESKTOP_PARITY.md.

## 24/10/2026 06h — seleção por teclado e duplo clique, QA fechado
- [x] T/Shift+T percorrem somente monstros vivos dos snapshots autoritativos; duplo clique preparado para modelos suportados, preservando NPCs.
- [x] 47/47 frontend, 101/101 transporte, 4/4 novos testes, Chromium isolado e QA público com conta real aprovados; sem monstro real para testar seleção ao vivo.
- [x] SUPERFRAME 4/4; ORACLE SHA idêntico e validação estática Python, Node 12 incompatível; ZIEL GTX 1650/HTTP 200 verificados, sem FPS novo.
- [x] Publicação QA com hashes IIS/HTTPS idênticos, backup prévio e GameServer preservado.
- [x] C++ original de dano inspecionado somente leitura; navegador NÃO deve definir dano autoritativo.
- [ ] Ataque, dano, morte, loot e EXP reais ausentes; duplo clique em monstro real não validado.
- Progresso global sem percentual confiável; relatório builds/STATUS_2026-10-24_0600_TARGET_NAVIGATION.md.

## 24/10/2026 07h — E: interação real com NPC e marcador 3D de alvo
- [x] NativeRadar.nearestNpc: somente snapshots autenticados, NPC real, serial/posição/tipo válidos, até 50 unidades, sem inventar NPC.
- [x] Tecla E no NativeWorldView conversa com NPC próximo via solicitação ao GameServer. T/Shift+T, WASD e NPC por duplo clique preservados.
- [x] Marcador circular 3D sobre monstro selecionado, posição exclusivamente do servidor; oculta ao perder alvo, sair do mundo ou morrer; recursos gráficos liberados em dispose. Sem ataque/dano.
- [x] 53/53 testes unitários selecionados, 101/101 transporte, 6/6 SUPERFRAME e 7/7 ORACLE, hashes conferidos.
- [x] Chromium público REAL: login, personagem, Ricarten, caminhada QA até Enzo (159→65→21 unidades), tecla E, resposta NPC status 0, diálogo exibido. Repetição em nova sessão também passou.
- [x] Chromium anônimo: importações dos módulos novos e seleção fixture aprovadas; sem sessão assets 401.
- [x] IIS QA, deploy AEROCOOL e HTTPS com SHA-256 idênticos; Server33.exe intacto e porta 1997 ativa; GitHub PR #2 atualizado.
- [ ] Marcador 3D ainda NÃO testado com monstro real (sem monstro vivo em Ricarten QA); combate não implementado.
- [ ] ZIEL GTX 1650/driver confirmados, sem benchmark novo; RX 550 e regressão Windows pendentes.
- [ ] Combate, skills, inventário transacional, mapas/classes, chat entre dois jogadores, áudio completo e abertura geral pendentes.
- Progresso global SEM PERCENTUAL confiável; ver DESKTOP_PARITY.md.

## 24/10/2026 07h30 — detalhamento de inventário original (piloto QA)
- [x] Inventário de consulta exibe requisitos numéricos do item (nível, força, inteligência, talento, agilidade e vitalidade), valores atuais do personagem e preço registrado, sem afirmar elegibilidade de classe/equipamento.
- [x] Dados vêm do registro nativo decodificado, não são inventados; interface utiliza textContent e não envia mutações ao GameServer.
- [x] Corrigida sobreposição: áudio (z-index 8) interceptava clique em atributos do inventário (z-index 6); inventário agora usa z-index 12.
- [x] 7/7 testes unitários no AEROCOOL e SUPERFRAME; 5/5 checagens estáticas na ORACLE; SHA-256 idêntico. Chromium com fixture aprovou requisitos, preço, proteção HTML e sobreposição.
- [x] Arquivo JS publicado apenas em /jogar-beta, SHA-256 idêntico no AEROCOOL, IIS e HTTPS.
- [ ] Conta QA tem inventário realmente vazio (0 itens), portanto não há validação de item real, equipar/usar/mover/vender.
- [x] Chromium público com conta QA real e GameServer: Ricarten carregado, inventário abriu, Atributos clicável acima do áudio (z-index 12 > 8), fechamento/saída funcionando, sem erros JS. Conta QA possui 0 itens; detalhes de item validados somente por fixture.
- [ ] ZIEL GPU GTX 1650 com driver OK; smoke de WebGL2 headless inconclusivo, sem benchmark FPS novo.
- Progresso global de paridade desktop continua sem percentual confiável.
