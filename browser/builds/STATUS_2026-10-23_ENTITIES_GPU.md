# StormPT Web — entidades reais e teste de GPU — 23/10/2026

Progresso estimado: **64% de 100%** (anterior: 60%). Estimativa subjetiva para o jogo completo.

<progress value="64" max="100">64%</progress>

## Entregue
- GameServer Win32 compilado e instalado com snapshots somente de leitura das entidades originais do campo 3. Até 32 entidades próximas, com serial, tipo, nome, modelo, posição, direção, movimento e vida originais; limite de distância e frequência.
- Gateway e browser validam versão, tamanho, mapa, observador, sequência própria e referências de modelo. O browser não pode emitir snapshots de entidades.
- Teste TCP real recebeu 8 NPCs de Ricarten. Radar e lista mostram os dados reais. Nenhuma entidade é inventada.
- Ferreiro Gus usa seu modelo e 4 texturas originais, na posição e direção do servidor. 1.069 triângulos na malha principal. Pose inicial de espera estática; loja, diálogo e animação do NPC ainda não implementados. Outros modelos permanecem apenas no radar.
- Telemetria local de tempo de quadro e câmera sem novas alocações de vetores a cada quadro. Não se atribui ganho de FPS a essa alteração sem comparação controlada.
- Fontes canônicas sincronizadas com backup; binário instalado e BuildNext têm SHA-256 CC652D9A79A65EFC88E6C3907E2FFB578C22DC96BA8AC485F2B492E46CC3E757.

## Validação
- 72/72 testes de transporte e 28/28 testes de frontend.
- Primeiro quadro do Ferreiro comparado ao cálculo C++ original: 832 componentes, diferença máxima zero. glTF: zero erros e zero avisos.
- GTX 1650 real na VM IA do Ziel, Chrome/ANGLE D3D11, 1920×1080, URL pública, conta/personagem reais, sem mocks: 30 segundos parado, 56,30 FPS e p95 19 ms; caminhada de 6 segundos, 56,88 FPS e p95 18 ms. Sete entidades próximas e um NPC 3D no snapshot final. Nenhum erro de script, CDP ou modelo. Não é medição da RX 550 nem do jogo completo.
- Evidências privadas: builds/real-entities-result.json, builds/gtx1650-real-browser-result.json, assets/validation/blacksmith-native-comparison.json e blacksmith-spec.json.
- Regressão pública com snapshots de entidades antes da inclusão da malha do NPC passou login, caminhada, heartbeat superior a 65 segundos e persistência/reconexão.
- Com o NPC, a suíte SwiftShader a 1280×800 apresentou desconexões; uma execução completou a sessão longa e falhou na recarga gráfica da reconexão. Sem rejeição registrada pelo validador do gateway. Carga gráfica atrasando heartbeats é hipótese, não causa comprovada. A nova suíte completa a 640×400 passou: login, NPC original com 1.069 triângulos e 4 malhas texturizadas, posição igual à do servidor, caminhada animada, parada ao perder foco, heartbeat superior a 65 segundos e persistência/reconexão; zero erros de script. Evidência: builds/real-world-browser-result.json. Reduzir a resolução é uma condição do teste, não uma correção definitiva para a desconexão em carga gráfica alta.

## Operação e preservação
Primeira inicialização do novo binário falhou antes de abrir TCP 1997. A versão conhecida foi restaurada, as conexões ODBC foram verificadas em modo somente leitura sob o usuário original e um diagnóstico mínimo de SQLDriverConnect foi acrescentado, sem imprimir credenciais ou mensagem completa do driver. Os 18 bancos existentes conectaram com a autenticação integrada já utilizada. A nova compilação iniciou e passou os testes nativos e públicos descritos. Não foram alterados credenciais, esquema, contas ou registros SQL; SQL não foi reiniciado. A porta 1997 está em escuta.

Backups WebEntities-20261023 e WebEntitiesCanonical-20261023 preservados. O navegador de QA da IA usa perfil separado; não houve troca de driver ou configuração global da VM. A tarefa temporária de diagnóstico SQL foi removida. StormPK não foi alterado. Assets e source proprietário integral continuam privados; somente integração própria, conversores, testes e documentação podem ir ao GitHub.

## Ainda falta
Acesso geral permanece desabilitado e sujeito à whitelist QA. Pendentes: segurança/revogação de sessão para outras contas, regressão Game.exe, diagnóstico definitivo das pausas em renderização por software, mais classes/equipamentos e NPCs animados, interação com NPCs, monstros/combate, habilidades, inventário, chat, áudio, recuperação de senha e medição RX 550. A interface continua usando o cadastro e a autenticação existentes.

Piloto: https://stormpt.hoststorm.com.br/jogar/
