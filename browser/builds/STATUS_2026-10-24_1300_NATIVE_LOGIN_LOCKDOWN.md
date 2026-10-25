# StormPT Web — 24/10/2026 13h — correção real no gateway QA

## Descoberta e alteração implantada
A auditoria do código original C++ e do transporte Node encontrou um desvio de autorização: com STORMPT_ALLOW_NATIVE_WEB_LOGIN=true, o GameLoginGuard ainda aceitava um login desktop legado de 400 bytes. Depois desse caminho, os pacotes legados não recebiam a mesma lista restrita de opcodes aplicada ao login web nativo. O GameServer original processa OPCODE_POSITION com valores de HP recebidos do cliente e também possui caminho de dano legado. A correção evita a possibilidade de usar o ticket QA nativo para entrar nesse modo legado.

Agora, quando allowNativeWebLogin=true, o gateway recusa o login desktop legado e exige o envelope web vinculado à sessão ASP.NET. Quando allowNativeWebLogin=false, o comportamento original de login desktop continua inalterado. Não foram alterados SQL, personagens, binários C++, regras de combate ou serviços de outros projetos.

## Testes e publicação
- AEROCOOL: 109/109 testes de transporte aprovados após instalação; 11/11 testes focados no staging; teste de integração WebSocket/TCP confirma que login legado rejeitado não chega ao TCP original (zero bytes).
- Configuração do contêiner stormpt-browser-gateway: STORMPT_ALLOW_NATIVE_WEB_LOGIN=true, volume /mnt/user/appdata/stormpt-browser/transport montado em /app. Gateway reiniciado isoladamente depois de verificar ausência de conexões ativas. Contêiner voltou a running.
- Chromium público QA REAL após reinício: autenticação, personagem, entrada em Ricarten, abertura de chat, comando administrativo bloqueado, pacote de chat nativo enviado e permanência no mundo; sem erros JavaScript. Resultado ok=true. A mensagem própria não retornou; esse teste NÃO comprova conversa entre duas contas.
- SUPERFRAME: checkout independente do PR #2 no commit b4bc01d4cf5b8105f191033cb71b0bba308df28c, 109/109 testes de transporte aprovados, três hashes SHA-256 idênticos ao AEROCOOL. Logs retornados e consolidados.
- ZIEL: Unraid acessível, VM IA Windows 11 ativa, GTX 1650 PCI reconhecida. Sem benchmark gráfico novo porque não houve alteração de renderização.
- ORACLE: SSH indisponível nesta execução por exigência de nova autenticação Tailscale; não utilizada nem houve limpeza remota.
- URL QA /jogar/ HTTP 200; BrowserAssets.ashx?asset=ricarten sem sessão HTTP 401; porta GameServer 1997 TCP acessível. Sem teste Windows desktop nesta execução.

## Limitações
- O modo legado do gateway quando allowNativeWebLogin=false não foi modificado; não expor esse modo em piloto web nativo.
- O GameServer original ainda recebe campos de estado do cliente desktop em alguns opcodes. Para combate web, jamais aceitar dano, HP, EXP, loot ou posição fornecidos pelo navegador; somente regras transacionais autoritativas sob locks.
- Não há monstro real QA confirmado, ataque web implantado, dano, morte, EXP ou loot. Progresso global sem percentual auditado.
- Não foi executado novo benchmark na GTX 1650; qualquer medição futura de GPU deve ocorrer na VM IA do ZIEL.
- Piloto permanece restrito às contas QA.

## Artefatos e integridade
Arquivos aprovados: transport/src/game-login-guard.mjs, transport/test/web-login.test.mjs, transport/test/bound-auth.test.mjs, ROADMAP.md, PROGRESS.json e este relatório. Logs e hashes em builds/staging-1300-native-login-lockdown. Backup pré-alteração em backups/20261024-1300-native-login-lockdown. GitHub PR #2 atualizado nos três arquivos de código/teste, hashes git blob iguais aos do AEROCOOL.
