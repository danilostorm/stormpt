# StormPT Web — auditoria do GameServer real e regressão do PR #2
**Data:** 24/10/2026, 22:04 (America/Sao_Paulo)  
**Branch auditada:** `work/stormpt-web-native-auth-20261023`  
**HEAD no início da auditoria:** `fb525f2d8bc1e4fe953189fb109170c61bd0ee06`

## Resultado da regressão isolada

A cópia isolada do PR foi clonada no AEROCOOL. Os testes foram executados novamente depois de tornar reprodutível a instalação das dependências do validador de assets.

| Suíte | Aprovados | Falhas |
|---|---:|---:|
| Transporte Node | 120 | 0 |
| Frontend/cliente | 51 | 0 |
| Pipeline | 7 | 0 |
| Reparação/vinculação | 5 | 0 |
| Compatibilidade do cabeçalho legacy | 3 | 0 |
| **Total** | **186** | **0** |

Barra mensurável da regressão: `██████████ 186/186`.

O primeiro frontend run falhou porque faltava `three` no ambiente isolado. `npm ci` não funcionava nesse pacote porque não havia `package-lock.json`. Foi gerado o lockfile, `npm ci --ignore-scripts --no-audit --no-fund` passou e a suíte final passou 51/51. O lockfile foi consolidado no AEROCOOL e incluído neste PR. A regressão não é um teste de combate real.

O harness `test-real-native-login.mjs` também foi endurecido: rejeita ticket expirado antes de abrir rede, captura apenas status/texto sanitizado do upgrade WebSocket, não grava nomes/seriais de personagens e grava cada execução em arquivo único. Apenas `node --check` foi executado no harness atualizado; ele não foi executado novamente contra o GameServer nesta rodada.

## Rechecagem do serviço real

- `/jogar/`: HTTP 200.
- `/jogar-beta/index.html`: HTTP 200.
- `/BrowserAssets.ashx` sem sessão: HTTP 401.
- `GET /BrowserTicket.ashx`: HTTP 405, compatível com endpoint POST-only.
- A sessão QA foi autenticada no site (GET/login POST/painel HTTP 200). O POST autenticado do emissor `BrowserTicket.ashx` retornou HTTP 200, formato do ticket válido e TTL de 45 segundos. A sessão web de QA foi encerrada por logout ao final.
- O harness local não conseguiu concluir o upgrade WebSocket: `WebSocket_failed`. Nenhuma lista de personagens foi recebida nesse probe e não houve seleção de personagem ou entrada no mundo. A causa do upgrade ainda não foi isolada; esse resultado **não prova, por si só, que a navegação pública inteira esteja quebrada**.
- Os fingerprints SHA-256 dos arquivos de chave do gateway e do GameServer correspondem aos arquivos usados pelo IIS/Windows; divergência de arquivo de chave não explica o erro observado.
- O processo `Server33.exe` estava ativo na VM Windows 11 durante a rechecagem, PID 11672, com início informado pelo Windows às 17:54:05 (fuso da VM). TCP 1997 foi alcançável a partir do AEROCOOL. Isso corrige a observação temporal das 21h, quando o processo/listener não foram encontrados. **Nenhum reinício foi executado por esta auditoria.**
- SHA-256 do executável permaneceu `355970C565149F86EB302B98663ABA3CD7EA07BCD6D253434C5C83C210C4D428`, igual ao valor registrado anteriormente.

## Bloqueio real de combate identificado no código nativo

A inspeção somente leitura de `C:\StormPT-2703\Source\SrcServer\src\Server\OnSever.cpp`, `BrowserAuth\browser_world.hpp` e `browser_entities.hpp` confirmou:

1. A entrada web e o mundo estão integrados ao servidor original, mas o dispatcher web atual trata apenas `kWorldJoin`, `kWorldMove` e `kNpcRequest`.
2. A allowlist de pacotes para a sessão web aceita apenas os opcodes de consulta/registro de usuário e personagem; o comentário nativo proíbe combate por esse perfil. O opcode de intenção de ataque ainda não está ligado ao GameServer.
3. O adaptador de mundo exige `PlayStageNum == 3` e usa `StageArea[3]` fixo (Ricarten). A enumeração de entidades também está presa a `StageArea[3]`; por isso o resolvedor isolado de monstros não equivale a monstros vivos disponíveis no navegador.
4. O campo nativo 4 está definido como `Ruin-4`, estado `FIELD_STATE_RUIN`, com arquivo de spawn `GameServer/Field/ruin-4.ase.spm` presente (394 bytes) e arquivo de pontos `.spp` presente (2400 bytes). É um candidato de QA estático, **não uma confirmação de monstro vivo**. A transição precisa seguir a lógica de gates nativos; não se deve aceitar um número de mapa arbitrário do navegador.
5. Os arquivos de projeto Visual Studio existem, mas `msbuild` e `cl` não foram encontrados no PATH da VM. Não foi produzido nem implantado um binário candidato.

## Máquinas e preservação

- **AEROCOOL:** regressão, staging, leitura de relatórios, consolidação do lockfile e documentação.
- **Windows 11/GameServer:** somente leitura via QEMU guest agent; processo, chaves e código inspecionados. Sem mudanças no executável, SQL ou registros de personagens.
- **SUPERFRAME:** somente verificação de disponibilidade do workspace; nenhuma suíte nova executada ali.
- **ZIEL/VM IA GTX 1650:** nenhum benchmark Chrome/Edge/WebGL2/FPS nesta execução.
- **ORACLE:** não utilizada nesta execução.

O probe fez somente login/logout na conta QA; não selecionou personagem nem entrou no mundo. O resultado QA anterior foi restaurado ao caminho canônico e seu SHA-256 voltou a coincidir com a cópia anterior ao teste. A tentativa falha foi preservada separadamente em artefato privado do AEROCOOL, sem publicar nomes ou tokens.

Não foram alterados GameServer, SQL, contas, personagens, StormPK, IIS/Nginx ativos ou gateway ativo. Não houve implantação de combate. O QA continua restrito.

## Próximo marco crítico

1. Capturar o status HTTP do upgrade com o harness sanitizado e isolar por que um ticket fresco não abre o WebSocket local.
2. Implementar transição de mundo baseada em gates nativos e campo confiável, permitindo validar o campo de combate sem salto arbitrário.
3. Integrar a intenção ao dispatcher nativo somente depois de validar alvo, alcance, cooldown, habilidade, recursos e geração server-side dos dados de ataque; usar o caminho original de dano sem aceitar dano calculado pelo navegador.
4. Localizar um toolchain Windows suportado e compilar um candidato em saída isolada, sem substituir `Server33.exe`.
5. Validar um monstro vivo e depois dano, morte, EXP e loot em QA. Até lá, combate continua desabilitado.

**Estimativa global de paridade desktop: suspensa (`completionEstimatePercent = null`).**
