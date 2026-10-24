# StormPT Web — execução 04h, 24/10/2026 — áudio original

**Escopo:** piloto QA fechado. Progresso global não estimado; 100% do cliente desktop NÃO foi alcançado.

## Entrega verificável
- Música original de Ricarten extraída da VM Windows 11 (somente leitura): Town 1 - Tempskron_Ricarten - When wind comes-o.bgm, RIFF/WAVE PCM estéreo, 22050 Hz, 95,99 segundos, 4.233.056 bytes, SHA-256 20245bcba2b361fcf34c0d8ebf4efd778055dc02e96db59305b462b5f846db47.
- Ambiente original tempskron-town.wav: o arquivo original usa cabeçalho proprietário JODOLH; reconstrução somente dos primeiros 8 bytes para RIFF PCM, 22050 Hz, 4,88 segundos, 215.124 bytes, SHA-256 convertido a1cbca6059e5645c372dfaabbe7cac89009a04905c26cb345db8a9c209bde621.
- Assets originais e WAVs convertidos são privados em assets/private-audio/, ignorados pelo Git; cópias aprovadas somente em C:\StormPT-2703\BrowserAssets na VM do AEROCOOL.
- Novo client/src/native-audio.mjs integrado à cena original Ricarten. Botão Ativar som original, volume e desativação; duas faixas em loop, pausa ao ocultar aba, liberação de recursos ao sair. **Nenhum autoplay:** carregamento apenas após gesto explícito.
- BrowserAssets.ashx ganhou somente as chaves ricarten-music e ricarten-ambient e MIME audio/wav; preserva validação de sessão ASP.NET e whitelist QA. Visitante anônimo recebeu HTTP 401; os WAVs não são publicados como arquivos estáticos.
- Piloto HTTPS: https://stormpt.hoststorm.com.br/jogar/ ; JS estático servido por https://stormpt.hoststorm.com.br/jogar-beta/native-audio.js.

## Testes
- AEROCOOL: 101/101 transporte, 38/38 frontend unitário, 6/6 conversor Python. Chromium isolado reproduziu os dois WAVs reais sem autoplay, com volume, desativação, reativação e limpeza; zero erros JS.
- Chromium na URL HTTPS pública **com conta QA real**: autenticou, selecionou personagem, entrou em Ricarten, confirmou ausência de download automático, carregou ambas as faixas com HTTP 200 / audio/wav, reproduziu ambas, alterou volume e desativou; zero erros JS, WebSocket não fechou durante o teste final. Evidência builds/staging-0400/qa-audio-public-0400.json.
- Houve uma falha de publicação temporária por import relativo incorreto em native-entry.js; corrigida com backup e File.Replace atômico. Chromium anônimo depois confirmou accountQA=true, nativeQA=true, zero falhas de rede. Houve também uma tentativa de entrada QA encerrada antes do mundo carregar; a tentativa final passou. **Não ocultar estes incidentes**.
- SUPERFRAME: checkout isolado do PR #2 SHA 41fe564, 101/101 testes de transporte; log SHA-256 74ea0af5fcac6558bf2952918ebd34ca4caee29abf41722d268bdb162559b41d.
- ORACLE: checkout isolado do mesmo PR, 15/15 testes Python de pipeline; log SHA-256 91ff4314d30f1f6d0700d76f364a3334e7f8018f4968a04d147448f4a9fb30fc. Ambos os logs estão consolidados no AEROCOOL e hashes conferidos.
- ZIEL: VM IA Windows 11 ativa, GTX 1650 e driver 32.0.16.1088 com status OK, Chrome e Edge instalados, HTTPS /jogar/ 200. **Sem FPS novo medido**.
- Server33.exe da VM AEROCOOL mantém SHA-256 355970C565149F86EB302B98663ABA3CD7EA07BCD6D253434C5C83C210C4D428, idêntico ao anterior. Nenhuma alteração em SQL, contas, personagens, GameServer ou StormPK.

## Backups, produção e pendências
- Backups locais: backups/20261024-0400-original-audio/ e backup de IIS C:\StormPT-QA-Backups\20261024-0400\.
- Backup Nginx: /mnt/user/appdata/stormpt-web-bridge/default.conf.before-audio-20261024-0400; nginx -t aprovado e apenas native-audio.js adicionado à allowlist estática.
- Todos os arquivos aprovados e áudio original permanecem exclusivamente no AEROCOOL. Diretórios temporários das máquinas auxiliares só podem ser limpos após conferência do backup final e SHA-256.
- **Ainda falta:** chat entre dois jogadores, combate e monstros, habilidades, inventário transacional, serviços NPC, passos/efeitos, demais músicas/mapas/classes, regressão Windows e RX 550, segurança para abertura geral. O áudio de Ricarten não significa paridade de áudio desktop.
