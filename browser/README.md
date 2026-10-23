# StormPT Web

**Progresso global estimado: 60% / 100%. Piloto fechado com caminhada animada e colisão real.**

<progress value="60" max="100">60%</progress>

O Chromium público confirmou login no ASP.NET existente, personagem e registro reais, entrada em Ricarten 3D, movimento pelo teclado confirmado pelo GameServer e reconexão na posição salva. Acesso ainda restrito à conta de QA; não é liberação geral nem jogo completo.

- [Piloto fechado](https://stormpt.hoststorm.com.br/jogar)
- [Relatório e testes](builds/STATUS_2026-10-23_ANIMATED_WALKING.md)
- [Progresso ponderado](PROGRESS.json)

## Implementação
GameServer C++ determina posição, velocidade e altura com terreno e CheckNextMove originais. O browser envia direção e sequência; nunca coordenadas. Persistência usa o registro existente. Gateway vincula identidade e confirmações, com limite de comandos pendentes. O perfil Windows mantém suas verificações específicas.

Three.js/WebGL2 carrega mapa, corpo e cabeça originais por handler autenticado fora do webroot. WASD/setas, toque, câmera e interpolação de estados confirmados. Lutador usa os 64 ossos originais e skinning GPU, com ciclos de espera/caminhada ligados aos deslocamentos confirmados. Outras classes, equipamentos e animações de combate pendem.

Tickets de gateway e GameServer têm chaves/audiências separadas e vínculo à sessão ASP.NET. Conta, cadastro e login usam o sistema existente; recuperação de senha ainda pendente.

## Validação
67 testes de transporte e 19 de frontend passaram. Testes reais TCP e Chromium confirmaram movimento, heartbeat superior a 65 segundos e persistência. Seis negativas de mundo passaram, incluindo replay e limite de frequência. Assets anônimos retornam 401; caminhos inválidos, 404.

Compilação Win32 instalada e fonte canônica sincronizada. Teste Chromium usa SwiftShader; desempenho na RX 550 não foi medido. Teste real confirmou quatro recusas de deslocamento no mesmo ponto e recuo permitido pelo motor original; cobertura completa de paredes/rampas e regressão com Game.exe pendem.

## Trabalho restante
Segurança para outras contas e mapas, animações restantes, entidades reais, combate, habilidades, inventário, chat, áudio, recuperação de senha e otimização em hardware real.

## Preservação
Backups anteriores às alterações. SQL, contas, personagens e StormPK preservados. Segredos, binários, backups, assets proprietários e source integral não entram no GitHub público. Este diretório publica somente integração própria, conversores, testes e documentação.
