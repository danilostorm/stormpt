# StormPT Web — personagem real e Ricarten, 23/10/2026

**Progresso global estimado: 46% / 100% (antes desta continuação: 40%).**
<progress value="46" max="100">46%</progress>

0% ▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱ 100% — **46%**

O marco real desta etapa é criar, persistir, listar e selecionar personagens da conta de QA pelo GameServer original. A beta pública ainda não é jogável: o mapa 3D foi validado em QA privada com uma captura real do registro, sem sessão de movimento.

## O que funciona na beta pública

Fluxo Chromium real em https://stormpt.hoststorm.com.br/jogar-beta/index.html, sem interceptar/simular respostas:

1. Login na conta existente pelo Conta.aspx e emissão dos tickets da sessão ASP.NET.
2. Autenticação no GameServer C++ pela conexão WSS.
3. Criação de um Lutador nível 1 pela própria interface, com nome validado no servidor.
4. Desconexão e novo login; o personagem reaparece na lista original opcode 9.
5. Seleção opcode 5 e recebimento do registro original opcode 4.
6. Decodificação do mapa, X/Z, identidade, vida e contagem de itens do registro autorizado.

Foram criados apenas StormWebQA1 e StormWebQA2, na conta piloto de QA já existente. O primeiro foi criado pelo teste de protocolo real; o segundo pela interface pública. Ambos persistem entre conexões. O Chromium confirmou duas entradas na lista, carregou StormWebQA1 e terminou com zero erros JavaScript.

Dados comprovados de StormWebQA1: Lutador, nível 1, Ricarten/campo 3, X=-1047 e Z=-16973 em unidades do mapa; protocolo usa fixed point /256; vida 79/79, inventário vazio; registro de 1796 bytes. O serial é atribuído pelo GameServer a cada carregamento.

Não foram clonados personagens de outras contas nem usados registros fictícios.

## Implementação nativa e proteção dos dados

- Método InsertWebCharData usa os tipos originais TRANS_RECORD_DATA/sPLAY_USER_DATA, preset inicial de Fighter do HoLogin.cpp, JobDataBase, fórmulas originais de vida/mana/stamina, GetNextExp, ReformCharStatePoint, ReformCharForm e os pontos iniciais do sFIELD.
- O piloto habilita somente Lutador nível 1. Não concede dinheiro, progressão, missões completadas ou itens inventados. Itens iniciais/presentes e demais classes ainda precisam de validação funcional.
- Grava primeiro um registro completo com CREATE_NEW, sem sobrescrever personagem existente. Depois substitui atomicamente a associação da própria conta, com arquivo temporário no mesmo volume e flush. Uma falha conserva arquivos para recuperação; não apaga registros.
- Backup da associação da conta antes da primeira criação web. Limite de cinco personagens; nomes ASCII de 3–16 caracteres, iniciando por letra.
- O caminho do cliente Windows continua separado. O perfil web aceita apenas os pedidos implementados de login, criação e seleção; gravação arbitrária de registros, exclusão e combate pelo protocolo legado ficam negados.
- Corrigidos tamanho e limites de strings no PacketFilter: seleção original 52 bytes, nome no offset 20; criação 76 bytes, conta de 21 bytes e nome no offset 41.
- Gateway vincula criação à conta autenticada, permite um pedido pendente e exige nova conexão/lista após a criação antes de selecionar o personagem novo.
- A interface existente ganhou criação e leitura do registro; não foi criado um sistema de contas paralelo.
- Source testada sincronizada ao caminho canônico C:\StormPT-2703\Source\SrcServer\src. Source integral e binários continuam privados.

A compilação completa Win32/MSVC terminou com exit code 0. O binário implantado é:
66D717B9E42B6F27797E4858AC5A31A1C8898EA7391C0474DD915AAA6371A53D

## Mapa e modelo corretos

O campo inicial real é Ricarten, não AncientW. Conversão privada a partir de village-2.smd:

- 41783 vértices originais, 44226 triângulos, 267 materiais usados.
- 261 texturas originais incorporadas; GLB de 16969768 bytes.
- A textura field/ricarten/tem_wall04.bmp é referenciada pelo mapa, mas não existe no cliente atual. O material é marcado como não resolvido; não foi inventada uma imagem substituta.
- Corrigido o sentido de faces Direct3D clockwise para glTF/WebGL counter-clockwise, preservando correspondência UV. O piso antes desaparecia por backface culling; nova captura confirmou o piso correto.
- A correção está no conversor. Os GLBs antigos de AncientW ainda precisam ser reconvertidos pelo pipeline atualizado.

O registro do Lutador referencia b001.ini. O cliente real resolve b001.inx, cujo modelo é tmbB01.ASE e cujo HighModel contém TAHB01/TBHB01/TLHB01. Cabeça original tmh-B01.inf/SMD, HighModel TmhhB01.

Descoberto e corrigido um limite importante do conversor anterior: os vértices Physique são locais aos ossos, não posições prontas do corpo. A transformação de pose base agora usa os 64 ossos reais de m1.smb, a matriz Tm original por vértice e a conversão de eixos Max XYZ → PT XZY usada em smOBJ3D::WorldForm. Foram reposicionados 924 vértices de corpo/cabeça, sem gerar esqueleto ou animação artificial. A cena usa apenas o LOD alto original: quatro malhas e 722 triângulos visíveis do personagem.

Isso é pose base correta, ainda sem animação/skinning em tempo real.

## Validações desta etapa

| Verificação | Resultado |
| --- | --- |
| Transporte Node, incluindo criação e bounds do registro | 61/61 aprovados |
| Frontend unitário | 17/17 aprovados |
| Compilação completa GameServer Win32 | Exit code 0 |
| ABI compilada com os headers C++ reais | smCHAR_INFO=464; save offset=480; data offset=1796; criação=76; nome=41 |
| ABI do esqueleto compilada | smOBJ3D=2236; NodeName=172; Tm=240 |
| Criação no GameServer e persistência após reconexão | Aprovado, registro real opcode 4 |
| Chromium público: criação, reconexão e seleção | Aprovado; zero erros JS; sem mocks |
| Nova execução pública idempotente | Exit code 0; carregamento real confirmado |
| Nome duplicado | Negado no GameServer real |
| Classe não habilitada | Negada no GameServer real |
| Nome com tentativa de caminho inválido | Negado no GameServer real |
| Seleção de nome ausente da conta | Conexão encerrada; nenhum registro devolvido |
| Khronos: Ricarten, corpo e cabeça | Zero erros e zero avisos nos três GLBs |
| Chromium WebGL2 privado | Ricarten + pose original na posição do registro real; zero erros JS |
| Estado final | TCP 1997 ativo; beta HTTP 200; /jogar HTTP 404 |

A captura gráfica é explicitamente actual-gameserver-record-replay, liveSession=false, movement=false. O X/Z vem do registro capturado. A altura 205.4921875 foi projetada visualmente na malha original; não é uma confirmação de física recebida do GameServer. Foram desenhados 124 draw calls e 30085 triângulos no enquadramento da captura, usando SwiftShader por CPU virtual. Não é benchmark RX 550.

Evidências privadas:
- builds/real-native-character-result.json
- builds/real-character-browser-result.json
- builds/real-character-security-result.json
- builds/native-record-layout.txt
- builds/ricarten-real-record-render.json
- builds/transport-character.tap e builds/frontend-character.tap
- client/qa/real-character-chromium.png
- client/qa/ricarten-real-record-chromium.png
- assets/validation/native-character-assets-result.json e fighter-bind-result.json

## Implantação, recuperação e backups

Backup desta etapa: C:\StormPT-2703\Backups\WebCharacter-20261023, incluindo binário anterior, DataServer, fontes anteriores, cópia canônica anterior e beta IIS anterior. Backups da etapa de autenticação e bancos verificados permanecem preservados.

Proxy anterior: /mnt/user/appdata/stormpt-web-bridge/default.conf.before-character-20261023.

Durante a implantação, a inicialização excedeu a verificação antiga de 35 segundos. O binário anterior foi restaurado e também demorou a abrir a porta. A observação do console mostrou carga de monstros; a VM tinha memória livre e o host apresentava espera elevada de disco. O início completo terminou e a porta voltou. A nova versão foi então instalada e validada. A verificação agora acompanha até dez minutos; nenhum controle de segurança foi desativado para iniciar.

Não há servidor HTTP de desenvolvimento ou container de QA deixado rodando. Serviços persistentes do jogo/gateway continuam ativos. StormPK não foi alterado. Nenhuma conta ou personagem preexistente foi apagado.

## Próximo marco prioritário

1. Ligar a cena de Ricarten à sessão ativa e ao personagem selecionado, mantendo os assets proprietários sob acesso autorizado.
2. Inicializar posição/altura no servidor e implementar intenção de movimento com validação de velocidade, terreno e colisão, seguida de confirmação do servidor. Hoje nenhum movimento é enviado.
3. Persistir e restaurar a posição pela rotina original, validar reconexão e pertencimento entre contas reais.
4. Portar amostragem de animações do m1.smb/INX, skinning, controles e câmera; depois NPCs, monstros, combate, habilidades, inventário, chat e áudio.
5. Validar cliente Windows real, IP original atrás do gateway, revogação de sessão e replay após reinício antes de ampliar a whitelist.
6. Medir RX 550 e publicar /jogar somente quando o personagem estiver realmente controlável.

A whitelist continua restrita à conta piloto; recuperação de senha e os demais sistemas seguem pendentes.
