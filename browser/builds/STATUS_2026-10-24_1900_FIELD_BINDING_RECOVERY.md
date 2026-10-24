# StormPT Web — 24/10/2026, 19h (Brasília) — reconciliação via SMB, testes e staging

## Estado prévio confirmado
- GitHub `danilostorm/stormpt`, PR #2 aberto e draft, HEAD inicial `3a64d28acec24a16a8b0fbf1dfbd25c446f80dcd`.
- Lidos `browser/ROADMAP.md`, `browser/PROGRESS.json` e relatório das 18h no GitHub.
- AEROCOOL: SSH TCP/22 recusado; Desktop Commander offline. Acesso alternativo **somente aos arquivos** do AEROCOOL via SMB a partir do SUPERFRAME (192.168.30.10/appdata), sem shell no AEROCOOL. Lidos `ROADMAP.md`, `PROGRESS.json` e relatórios locais das 16h e 17h. Local raiz ainda estava na revisão de 17h; diferenças para o GitHub das 18h foram identificadas antes de qualquer gravação.

## Desenvolvimento e testes reais desta execução
- Obtido checkout raso do HEAD do PR #2 em diretório temporário isolado do SUPERFRAME, Node v22.18.0.
- `npm ci --ignore-scripts` instalou a dependência `ws` do lockfile. A primeira tentativa da suíte integral sem dependências tinha 7 falhas de importação; **não foi considerada regressão de código**. Após a instalação, a suíte passou **112/112**.
- Acrescentados dois testes ao guard nativo: (1) campo 4 vindo de registro original sintético é mantido em confirmação de mundo, movimento e entidades; snapshots de campo 3 são rejeitados sem consumir sequências; (2) registro com campo -1 ou 256 é rejeitado antes da ativação. Nova execução integral **114/114 aprovada**; teste focal do guard **9/9**.
- Os testes usam registros e frames sintéticos e NÃO provam transição real de mapa, monstro vivo ou combate.

## Consolidação segura no AEROCOOL
- Os seis arquivos candidatos (três módulos e três testes) foram colocados somente em `builds/staging-1900-native-field-binding/transport/{src,test}` por SMB, **sem substituir** os módulos ativos do gateway e sem implantar no IIS.
- Backup com cópia dos seis arquivos anteriores do AEROCOOL, seis candidatos, `ROADMAP.md` e `PROGRESS.json` anteriores, relatório local das 17h e log de testes:
  `backups/20261024-1900-native-field-binding/approved-native-field-binding-1900.tar.gz`.
- SHA-256 do backup: `e50fa16694e8912311cb6306f558eda3c14772fcb046fcca14cea6bbfac15259`.
- Backup baixado novamente do AEROCOOL via SMB, SHA-256 idêntico, extraído e verificado com manifesto **16/16**; seis candidatos staged também baixados e comparados byte a byte **6/6**.
- Temporários desta execução no SUPERFRAME foram mantidos até a confirmação da integridade; nenhum arquivo existente foi apagado ou sobrescrito no AEROCOOL.

## Disponibilidade pública e bloqueios
- Em consultas sem autenticação do SUPERFRAME, `https://stormpt.hoststorm.com.br/` respondeu HTTP 200, mas `/jogar/` e `/jogar-beta/index.html` responderam **HTTP 502**. Testes diretos HTTP para `192.168.30.169:80` não conectaram. Isso é um indício de indisponibilidade do backend da prévia, não prova isolada da causa; **nenhuma reinicialização ou alteração de infraestrutura foi executada**.
- AEROCOOL: usado como destino e fonte de arquivos via SMB, **não como executor de testes**. SUPERFRAME: checkout, Node, testes, cópias e verificação. ZIEL: SSH consultado para rota, sem Chrome/Edge/WebGL2/FPS. ORACLE: SSH bloqueado por verificação adicional do Tailscale. Windows 11/GameServer: não acessados nem alterados.
- Não houve modificação de GameServer, SQL, contas, personagens, backups anteriores, StormPK ou outros projetos; piloto QA não foi ampliado.

## Pendências
1. Investigar HTTP 502 e restaurar acesso de manutenção ao AEROCOOL sem reiniciar serviços às cegas.
2. Após revisão de integridade e regressão no próprio AEROCOOL, decidir ativação coordenada dos três módulos e testes; não fazer deploy a partir de staging sem confirmação.
3. Selecionar mapa nativo não-vila, localizar monstro vivo real e comprovar transição, renderização e combate pelo GameServer, com regressão do cliente Windows.
4. Medir WebGL2/FPS em Chrome/Edge acelerados pela GTX 1650 na VM IA do ZIEL.

**Paridade global com o cliente desktop: sem percentual auditado. Combate nativo ainda não funcional.**
