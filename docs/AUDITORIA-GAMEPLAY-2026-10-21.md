# Auditoria inicial StormPT — cliente 1.08, Progressão e Recursos

Verificado em 21/10/2026 com **Source-Original.rar** enviado pelo proprietário (4.196 entradas no arquivo, 1.693 fontes C/C++ e arquivos de projeto extraídos para análise). A presença de uma classe ou arquivo **não comprova** funcionamento no executável em produção. Não alterar bancos ou gamefiles sem backup e ambiente de testes.

## Implementação atual / evidências

| Recurso anunciado | Evidência observada | Conclusão |
|---|---|---|
| Level inicial 1 | `SrcServer/src/Server/SrcServer/OnSever.cpp:1395`: default `nStartUserLevel=1`; `StartUser_PresentItem_Init` consulta a tabela SQL `Level`; porém `NewStartLevel()` (linha ~19099) fixa `Level=80` | **Inconsistente na source.** Patch 0001 preparado para usar o nível da configuração SQL, com fallback para 1. Banco deve ser validado e conter 1 antes do build |
| Level máximo 300 | Código usa `CHAR_LEVEL_MAX`, mas não foi confirmado o limite efetivo compilado e regras de EXP | **Não verificado.** Achada vulnerabilidade de índice: `Multiplicador[151]`, lido usando nível do personagem sem checar limites. Patch defensivo preparado |
| EXP 25x / DROP 35x | `OnSever.cpp` multiplica EXP com `eventoxp`, `Multiplicador[level]` e bônus/eventos; `srGetTotalExp` contém cálculo de 25 **por cento**, não multiplicador 25x | **Não confirmado** o 25x/35x. Exige auditoria de configuração SQL, eventoxp, tabelas/drop engine e simulações |
| Mapas até Abismo | Lista de mapas no servidor contém `Abismo do Mar` com ID 51 | Evidência de nome de mapa na source; assets/spawn/teleporte ainda não homologados |
| Itens até 80D | Tipos de itens e drops existem em código e GameFiles, mas teto 80D não foi demonstrado | **Não verificado** |
| Aging até +30 / falha depois +10 | `SrcServer/src/Server/sinbaram/sinTrade.h` e `SrcGame/src/Game/sinbaram/sinTrade.h` contêm `#define MAX_AGING 18` | **Diverge** do anúncio (+30). Chance de falha a partir +10 não validada |
| Montarias (17) | `CMountHandler.cpp`, chamadas em `character.cpp`, lista enviada em `Montarias.txt` com 17 itens BI275…BI291 | Código e catálogo fornecido existem; funcionamento e 17 models in-game precisam de teste |
| Caravanas (5) | `SrcGame/src/Game/Caravana/`, `SaveCaravan2` no servidor | Estrutura presente; quantidade cinco e persistência não homologadas |
| Skins 5 linhas | `SrcServer/src/cSkinChanger.cpp` | Módulo presente; quantidade de linhas/itens não comprovada |
| Relíquias | `SrcServer/src/cRelicHandler.cpp` | Código presente; banco/UI/obtenção ainda não testados |
| HellsGate e novo boss | `SrcServer/src/CHellsGateHandler.cpp` com boss/estágio e consulta SQL | Implementação parcial presente; '23 mobs por dia' não verificado |
| Quiz SQL | `SrcServer/src/Server/Eventos/Questions.cpp` contém envio de perguntas ao chat | Código presente; premiação, agenda, dados SQL não validados |
| Invasão | `EventoInvasao` aparece em `OnSever.cpp`; `svrEventSpawn.h` | Código presente; parametrização duração/mobs/horário não confirmada |
| PvP e equipes | `cBattleArenaHandler.cpp` e rankings | Módulos presentes; Azul/Vermelho e bônus não homologados |
| Boss roleta, novos alvos, elevação de itens | Classes de eventos/sorteios e itens | Apenas sinais indiretos; testar gameplay e tabelas antes de prometer |
| Quest diária/única/repetitiva | `sinQuest.cpp` inclui DailyQuest; fluxos comentados em parte do cliente | **Parcial / não homologado** |
| Visual, HUD, anti-aliasing, sombra, vídeo login, janela/mapa móveis | Há componentes Engine/UI e shaders/efeitos | Não é possível confirmar só pelo nome; exige executar cliente 1.08 |
| Loja, créditos, troca de classe/nick, bônus, Castle domingo 16h, SOD, ping, chat item | Handlers e sistemas legados diversos; schema do banco não acessível nesta auditoria | **Pendente de verificação**, não marcar como ativo |

## Cliente e publicação TCP

- `SrcGame/src/Game/fileread.cpp:2733-2735` possui **três IPs fixos 131.196.196.18**. Novo endpoint público deve existir e responder TCP antes de alterar esses três IPs e **recompilar o cliente**. Não basta mudar o `Server.exe` nem usar Tailscale como exit node.
- Porta TCP de origem indicada em ambos projetos: `SrcServer/src/Server/smwsock.h` e `SrcGame/src/Game/smwsock.h` como **10006**. Confirmar no executável e encaminhar Oracle TCP à VM Tailscale; manter separado das portas do StormPK.
- VM STORM PT apresenta `Server.exe` em execução, mas sem listener TCP 10006 confirmado. `SQL.ini` apontava para instância `PRIME\\WDPT`; alterada com backup para `PRIME\\SQLEXPRESS`, porém o login SQL do jogo (`sa`) falhou. **O login externo continua não homologado**.
- `UserDB` ainda não pode ser lido pela conta de serviço da VM; não há inventário verificado de usuários.

## Site IIS

- Site `stormpt.hoststorm.com.br` via Cloudflare/Tailscale.
- CSS principal `/KLVN/Site/css/style.css` e CSS do painel `/KLVN/Painel/css/KLVN.css` retornam HTTP 200 após correção das regras de static assets. JS e imagens do painel também foram testados com HTTP 200; áreas administrativas antigas continuam em HTTP 403.
- Site ainda depende de PHP 5.3; revisão de segurança antes de abrir mais funcionalidades.
- Backup anterior em `C:\\StormPT-Operations\\Backup-before-publication`.

## Próximos passos e critérios para o perfil 'Priston 2005'

1. Validar acesso SQL seguro e fazer backup; consultar `Level`, valores de EXP/drop e tabelas de itens/mapas/monstros, somente leitura.
2. Aplicar e compilar o patch `patches/0001-start-level-from-sql-and-exp-bounds.patch`, depois configurar a tabela `Level` para 1 e testar a criação de personagem *novo*. Não alterar níveis de personagens existentes em massa.
3. Medir EXP/drop, equipamento por faixa e spawn em cada mapa; reduzir progressão e catálogo a uma temporada 80D mantendo módulos modernos opcionais. Level máximo 300 e itens somente 80D exigem curva de EXP e stats testada, não simples configuração isolada.
4. Corrigir startup do Game Server, abrir porta 10006 por relay TCP na Oracle, validar login remoto, recompilar cliente com destino final.
5. Testar interface, NPCs, armas, montarias, sistema de aging, loja, Castle, SOD, HellsGate e quests. Atualizar a matriz para `testado` somente depois de demonstrado.

**Importante:** o patch de nível foi preparado, ainda **não compilado/aplicado em produção**. O código da source está no arquivo original preservado. Este relatório não autoriza publicar backups, credenciais ou dados de jogador em repositório público.
