# StormPT Web — 24/10/2026 14h — modelo original de monstro, piloto QA

## Alteração real
A interface 3D agora pode usar o GLB original D-Meca já convertido para uma entidade explicitamente marcada como monstro (kind=2) pelo snapshot nativo e cujo bodyModel seja exatamente `char/monster/d_meca/dmeca.ini`. O mesmo modelo já existia para NPC; não houve criação de monstro fictício nem geração de vida/dano/EXP/loot. Outros caminhos e entidades de jogador/NPC permanecem separados. O renderizador já usa `resolveEntityAsset`, portanto não foi necessário alterar o GameServer ou o renderer.

## Verificações
- AEROCOOL: frontend selecionado 17/17; transporte 109/109; `node --check` aprovado.
- glTF Khronos Validator em `assets/converted/dmeca.idle.textured.glb`: 0 erros, 0 avisos, 0 infos, 0 hints. Tentativa inicial de carregar texturas com GLTFLoader em Node falhou porque o ambiente não fornece `self`; o validador correto passou.
- SUPERFRAME: cópias isoladas em diretório temporário exclusivo, 5/5 testes; SHA-256 de `entity-assets.mjs` e `test-entity-assets.mjs` idênticos ao AEROCOOL. Logs retornaram ao principal.
- Chromium QA real via contêiner Playwright no AEROCOOL: login e entrada em Ricarten funcionaram, 14 NPCs renderizados, 0 erros JavaScript, 0 respostas >=400 de módulos do jogo. Não havia monstro real no snapshot; renderização de monstro real NÃO testada. Teste software/headless não equivale a benchmark com GTX 1650.
- ZIEL: VM IA Windows 11 ativa, GPU NVIDIA GeForce GTX 1650 enumerada; tentativa de Edge headless com D3D11/WebGL2 não produziu resultado, saída 1002. GPU/renderização do modelo NÃO comprovadas nesta execução.
- ORACLE: acesso SSH bloqueado por autenticação adicional Tailscale, não utilizada.
- QA HTTPS: `/jogar/` HTTP 200 no teste final (uma consulta intermediária expirou e foi repetida), `/jogar-beta/entity-assets.js` HTTP 200, `BrowserAssets.ashx?asset=npc-dmeca` HTTP 401 sem sessão. SHA-256 de módulo publicado e fonte: `aa42be2b713a889fea60464b37de40837081a7af0a077e381dc11ef7c76df689`.
- Windows GameServer original `C:/StormPT-2703/Servidor/Server33.exe` SHA-256: `355970C565149F86EB302B98663ABA3CD7EA07BCD6D253434C5C83C210C4D428`, idêntico à auditoria 08h. Gateway, SQL, contas, personagens e StormPK não modificados.

## Publicação e limites
Foi alterado somente `client/src/entity-assets.mjs`, seu teste e a cópia de implantação `deploy/jogar-beta/entity-assets.js`; a VM IIS QA recebeu exclusivamente o módulo JS correspondente, após comparação byte a byte com a versão anterior e backup. GitHub PR #2 recebeu os dois arquivos de código/teste com SHA Git blob idêntico ao AEROCOOL. Nenhuma abertura pública do QA.

**Não há monstro real validado na sessão QA**, nem combate, dano, morte, EXP, loot ou animação de monstro demonstrados. A estimativa global de paridade desktop continua suspensa. Próxima prioridade: spawn nativo de monstro QA sob regras originais e teste visual real na VM IA do ZIEL; depois integração segura de ataque no GameServer Windows.

## Evidências locais
`builds/staging-1400-monster-model/`: frontend.log, transport.log, model-validation.log, superframe-test.log, superframe-source-hashes.sha256, qa-smoke-result.json, qa-smoke.png e http-check.log. Backup anterior: `backups/20261024-1400-monster-model-readonly/`.
