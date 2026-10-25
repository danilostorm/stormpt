# StormPT Web

**Progresso global estimado: 64% / 100%. Piloto fechado com caminhada animada, entidades reais e primeiro NPC original.**

<progress value="64" max="100">64%</progress>

O Chromium público confirmou login no ASP.NET existente, personagem e registro reais, entrada em Ricarten 3D, movimento pelo teclado confirmado pelo GameServer e reconexão na posição salva. Acesso ainda restrito à conta de QA; não é liberação geral nem jogo completo.

- [Piloto fechado](https://stormpt.hoststorm.com.br/jogar)
- [Relatório e testes](builds/STATUS_2026-10-23_ENTITIES_GPU.md)
- [Progresso ponderado](PROGRESS.json)

## Implementação
GameServer C++ determina posição, velocidade e altura com terreno e CheckNextMove originais. O browser envia direção e sequência; nunca coordenadas. Persistência usa o registro existente. Gateway vincula identidade e confirmações, com limite de comandos pendentes. O perfil Windows mantém suas verificações específicas.

Three.js/WebGL2 carrega mapa, corpo e cabeça originais por handler autenticado fora do webroot. WASD/setas, toque, câmera e interpolação de estados confirmados. Lutador usa os 64 ossos originais e skinning GPU, com ciclos de espera/caminhada ligados aos deslocamentos confirmados. Outras classes, equipamentos e animações de combate pendem.

Tickets de gateway e GameServer têm chaves/audiências separadas e vínculo à sessão ASP.NET. Conta, cadastro e login usam o sistema existente; recuperação de senha ainda pendente.

## Validação
72 testes de transporte e 28 de frontend passaram. Testes reais TCP e Chromium confirmaram movimento, heartbeat superior a 65 segundos e persistência. Seis negativas de mundo passaram, incluindo replay e limite de frequência. Assets anônimos retornam 401; caminhos inválidos, 404.

Compilação Win32 instalada e fonte canônica sincronizada. GTX 1650 real, Chrome D3D11 a 1920×1080: 56,30 FPS parado e 56,88 FPS caminhando; p95 19/18 ms, sem erros. RX 550 não medida. A suíte SwiftShader apresentou desconexão durante recarga gráfica; investigação registrada no relatório. Teste real confirmou quatro recusas de deslocamento no mesmo ponto e recuo permitido pelo motor original; cobertura completa de paredes/rampas e regressão com Game.exe pendem.

Snapshots nativos alimentam um radar de NPCs próximos. Ferreiro Gus usa modelo e texturas originais, com pose inicial estática validada contra o C++; loja e diálogo pendentes. Outros modelos ainda não convertidos ficam somente no radar.

## Trabalho restante
Segurança para outras contas e mapas, animações restantes, mais entidades e interações, combate, habilidades, inventário, chat, áudio, recuperação de senha e otimização e mais testes de hardware.

## Preservação
Backups anteriores às alterações. SQL, contas, personagens e StormPK preservados. Segredos, binários, backups, assets proprietários e source integral não entram no GitHub público. Este diretório publica somente integração própria, conversores, testes e documentação.
