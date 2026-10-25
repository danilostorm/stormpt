# StormPT Web — 24/10/2026 15h — recuperação de modelos originais após falhas transitórias

## Implementação real (somente fonte/staging)
- Corrigida falha no NativeEntityView: um único erro ao baixar GLB original deixava o slot de NPC/monstro permanentemente vazio durante toda a sessão, pois a presença no Map bloqueava novas tentativas.
- Novo entity-asset-retry.mjs aplica backoff 1/2/4/8/16/30 segundos, limitado a 30s, com apenas uma requisição em voo por modelo. Repetição depende de snapshots autoritativos; não há polling extra nem modelos falsos.
- Recuperação restaura a instância 3D com posição do snapshot, limpa o erro transitório e mantém descarte de recursos ao sair, inclusive se download terminar após dispose().
- Preparados os dois módulos JS correspondentes em deploy/jogar-beta, **não publicados no IIS**; publicar ambos juntos somente após smoke de navegador/QA e backup remoto.

## Testes e máquinas
- AEROCOOL: Node 22, 11/11 testes frontend selecionados, 3/3 testes de integração do NativeEntityView com Three real e loader de rede controlado, 109/109 transporte. Testes cobrem falha inicial, backoff, recuperação, ausência de download duplicado, dispose durante download e ausência de reentrada.
- SUPERFRAME: Node 22, 6/6 testes independentes do algoritmo; SHA-256 de fonte e teste iguais ao AEROCOOL.
- ZIEL: VM IA Windows 11 (IA) em execução, QEMU guest-agent responde e sessão interativa presente; nenhuma medição nova de GPU/Chrome/Edge/WebGL2 nesta execução. Teste headless não substitui GTX 1650 real.
- ORACLE: SSH bloqueado por verificação adicional Tailscale; nenhum build executado.
- QA HTTPS somente leitura: /jogar/ HTTP 200; BrowserAssets.ashx?asset=npc-dmeca sem sessão HTTP 401.
- Nenhuma alteração em GameServer, SQL, contas, personagens, StormPK ou IIS. Piloto QA permanece fechado.

## Bloqueios reais e próximos passos
- Não existe monstro real observado em Ricarten QA, portanto não houve teste de modelo de monstro vivo ou combate. O código original mostra que ao menos a rota OpenEnemyMonsterFromCristal rejeita FIELD_STATE_VILLAGE; não utilizar spawn artificial no mapa público.
- Prioridade: preparar área QA apropriada, validar monstro real e animação na VM IA GTX 1650, conectar combate server-authoritative sob regras nativas e testar com cliente Windows.
- A melhoria desta execução é resiliência de renderização, NÃO combate; nenhum percentual global foi calculado.
- A implantação do renderer e do helper foi intencionalmente adiada: ambos devem ser publicados juntos após validação do ambiente IIS, evitando import quebrado.
