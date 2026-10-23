# StormPT Web — caminhada animada e colisão real
Data: 23/10/2026. Progresso global estimado: **60% / 100%** (antes: 57%).
<progress value="60" max="100">60%</progress>

## Resultado
O Lutador real agora usa skinning na GPU com os 64 ossos originais e ciclos de espera/caminhada convertidos de m1.smb e M1Bip.inx. A troca de animação depende dos deslocamentos confirmados pelo GameServer, e não somente da tecla pressionada.

Publicado no piloto fechado: https://stormpt.hoststorm.com.br/jogar/
Acesso continua limitado à conta QA. Não representa liberação geral nem jogo completo.

## Implementação
- Conversor próprio lê hierarquia, canais, intervalos e Physique de um osso por vértice dos arquivos originais. Não cria rig ou animação substitutos.
- Espera: intervalo original 160–8160, 29 amostras; caminhada: 55200–59680, 16 amostras. As 45 poses incluem os 64 ossos. Matrizes quantizadas conforme WorldForm e interpoladas na apresentação.
- Arquivo de poses: 184400 bytes. Corpo e cabeça com skinning: 227772 e 144168 bytes. Texturas originais permanecem embutidas.
- WebGL2/Three.js executa a deformação na GPU; browser interpola as matrizes dos ossos. Não foi necessário adicionar WebAssembly para esse trabalho.
- A posição do jogador continua autoritativa no C++ original. Animação não altera velocidade, terreno, registro ou autenticação.
- Novos assets têm allowlist e exigem a sessão ASP.NET e a conta piloto, como os anteriores.

## Testes executados
1. Oracle Win32 compilado com as rotinas matemáticas e de animação da source original, em ferramenta privada isolada. Comparação de 46080 componentes: 46076 idênticos; quatro diferiram uma unidade de ponto fixo (1/256 de componente da matriz). Nenhuma diferença maior. Não é promessa de equivalência de todos os movimentos/classes.
2. Khronos glTF Validator: zero erros e zero avisos nos dois modelos. Há mensagens informativas de accessors antigos não utilizados.
3. Chromium privado WebGL2: quatro malhas com skinning, 570 vértices visíveis deformados entre duas poses de caminhada, dimensões plausíveis e nenhum erro JavaScript. Captura inspecionada.
4. 19/19 testes de frontend, incluindo limites do decoder, formato, truncamento, valores inválidos, identidade dos ossos e troca de ciclo.
5. Chromium público sem mocks em /jogar: login real, seleção real, Ricarten, espera → caminhada com matrizes alteradas → espera; movimento confirmado, heartbeat superior a 65 segundos e reconexão na posição persistida. Zero erros JavaScript.
6. Teste TCP real com StormWebQA2: 91 snapshots. O terreno original recusou quatro pedidos consecutivos sem deslocar o personagem, depois aceitou o recuo. Todas as sequências foram confirmadas e cada passo ficou no limite de 5,01 unidades. Pedidos eram apenas direções legítimas; não houve teleporte ou edição de coordenadas.
7. Assets animados sem sessão retornaram HTTP 401. Os testes públicos mantiveram a negativa de caminho inválido com HTTP 404.

A prova de colisão confirma bloqueio pelo motor original, sem classificar precisamente o obstáculo como parede. Não foram testadas todas as paredes, bordas e rampas.

## Evidências privadas
- assets/validation/fighter-motion-result.json
- assets/validation/fighter-motion-native-comparison.json
- assets/validation/fighter-skin-spec.json
- assets/validation/fighter-skin-browser.json
- builds/frontend-animation.tap
- builds/real-world-browser-result.json
- builds/real-native-collision-result.json
- client/qa/real-world-animated-walking.png

## Preservação
Backup antes da publicação: C:/StormPT-2703/Backups/WebAnimation-20261023, com beta e handler anteriores. Configuração nginx anterior preservada no AEROCOOL. Não houve reinício nem substituição do GameServer nesta etapa: somente a ferramenta isolada de comparação foi compilada.
SQL e personagens existentes não foram apagados ou editados. Somente personagens de QA foram movimentados. StormPK não foi acessado. Binários, source integral, oracle gerado, poses e assets proprietários não serão publicados no GitHub.

## O que falta
- Segurança para abertura geral: IP original autenticado através do gateway, revogação/rotação, reinício e regressão com Game.exe.
- Outras classes, equipamentos, mapas, transições, animações de combate e refinamento da orientação/controle.
- Replicação de jogadores, monstros e NPCs; combate, habilidades, inventário, chat, comércio e áudio.
- Recuperação de senha integrada ao serviço existente.
- Testes de terreno mais amplos e medição em RX 550 e outros navegadores. O Chromium automatizado usa SwiftShader, não mede a placa do usuário.
O percentual é estimativa ponderada do escopo completo; animação do Lutador não significa conclusão da conversão de todos os personagens.
