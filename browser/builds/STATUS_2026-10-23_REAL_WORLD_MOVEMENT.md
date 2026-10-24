# StormPT Web — primeiro piloto de caminhada real
Data: 23/10/2026. Progresso global estimado: **57% / 100%**.
<progress value="57" max="100">57%</progress>

## Resultado e escopo
Login ASP.NET existente → ticket seguro → GameServer C++ original → lista e registro reais → Ricarten WebGL2 → movimento confirmado pelo servidor → reconexão na posição salva. Piloto fechado à conta de QA; não é liberação geral nem jogo completo.

O teste da nova rota detectou redirecionamento com porta interna; corrigido para HTTPS público antes da repetição final.

Publicação: https://stormpt.hoststorm.com.br/jogar e beta existente. Conta, cadastro e sessão continuam no sistema existente; recuperação de senha ainda pendente. A restrição QA permanece no emissor, servidor e handler de assets.

## Implementação
- Novo protocolo web restrito envia direção e sequência, nunca coordenadas. GameServer determina velocidade, altura e posição usando o terreno original e CheckNextMove.
- Validação de conta, personagem selecionado, registro original, serial, conexão, tamanho, versão, sequência e frequência. Confirmações vinculadas à identidade; gateway limita comandos pendentes.
- O perfil web possui verificação própria de vínculo e heartbeat. As verificações específicas do executável Windows permanecem no fluxo Windows; nenhuma desativação global.
- Posição atualiza rsPLAYINFO e o registro autorizado original. Checkpoint e desconexão usam persistência existente; nenhum sistema de personagens paralelo.
- Three.js/WebGL2 renderiza Ricarten e Lutador originais a partir da sessão ativa. WASD/setas, controles de toque, câmera por arraste/zoom e interpolação apenas entre posições confirmadas.
- Assets proprietários ficam fora do webroot, servidos por allowlist com sessão ASP.NET e whitelist QA; nenhuma cópia no GitHub.
- Corpo/cabeça usam pose base original. Caminhada animada e skinning em tempo real ainda não estão implementados.

## Evidência
- 67/67 testes de transporte, incluindo protocolo e guarda de mundo: registro próprio, serial, sequência, confirmação e backpressure.
- 17/17 testes unitários de frontend.
- Teste TCP real: 26 snapshots, passos em duas direções, limite observado de 5,01 unidades por passo, altura do terreno calculada no servidor.
- Seis testes negativos reais passaram: anônimo, sem registro, serial errado, direção inválida, replay e rajada de comandos. A rajada recebeu status de limite sem crédito adicional de movimento.
- Chromium público, sem mocks: login real, seleção, três assets autenticados HTTP 200, 267 malhas/44226 triângulos do mapa e quatro malhas do personagem, movimento pelo teclado, heartbeat superior a 65 segundos e reconexão persistida.
- Assets sem sessão: HTTP 401. Chave com tentativa de caminho inválido: HTTP 404. Nenhum erro JavaScript no fluxo.
- Compilação Release Win32 concluída. Binário instalado SHA-256: 3E557B1BB350856CA2B82B89ED53970712EBCB8C4A22C2DCC605891B0DEC712F.
- Evidências privadas: real-native-movement-result.json, real-world-security-result.json, real-world-browser-result.json e captura Chromium em client/qa.
- Navegador automatizado usa SwiftShader. Isso não mede RX 550. A rotina de colisão original foi integrada; ainda falta uma prova dedicada de colisão contra paredes.

## Preservação e retorno
Backup prévio: C:/StormPT-2703/Backups/WebMotion-20261023, com binário anterior, DataServer, fonte e beta. Fonte canônica anterior também salva nesse backup. Configurações nginx anteriores preservadas no servidor. Instalação aborta se houver clientes TCP ativos e usa o caminho/tarefa original do StormPT.
Nenhuma conta ou personagem existente apagado. Somente o personagem QA foi movimentado. SQL e StormPK não alterados nesta etapa. Source integral, dados, binários, segredos e assets não publicados.
A fonte canônica e a cópia de compilação foram sincronizadas.

## O que falta
1. Segurança para abertura geral: IP original autenticado através do gateway, revogação/rotação e reinício, regressão Game.exe real e cobertura de outras contas/classes/mapas.
2. Animação/skinning, orientação e controle refinados, colisões e transições de mapas com testes dedicados.
3. Replicação de outros jogadores, monstros e NPCs, combate, habilidades, inventário, chat, comércio e áudio.
4. Recuperação de senha integrada ao serviço existente.
5. Culling, LOD, texturas e carregamento progressivo, medição em hardware RX 550 e outros navegadores reais.
Percentual é estimativa ponderada do escopo completo; a primeira caminhada validada não equivale à conclusão dos demais sistemas.
