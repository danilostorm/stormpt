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
