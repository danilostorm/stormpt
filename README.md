# StormPT — nova instalação 27/03/2026

Repositório reiniciado para a nova infraestrutura StormPT. O projeto anterior foi removido da árvore da branch principal; o histórico Git anterior foi preservado para recuperação.

## Estado confirmado (22/10/2026)

| Área | Status |
| --- | --- |
| Windows 11 e SQL Server 2022 Express | Instalados |
| Server33.exe recompilado (Win32 Release) | 0 erros; inicia e abre TCP 1997 na LAN |
| Game33.exe recompilado (Win32 Release) | 0 erros; copiado como Game.exe |
| Banco SQL | **19 bancos do sql.rar importados**, 308 tabelas, verificacao fisica aprovada |
| Login/contas/personagens | Esquemas restaurados; cadastro, autenticação e persistência aguardam testes |
| Clãs, web e painéis | Esquema SQL importado; serviços HTTP e testes funcionais pendentes |
| Domínio stormpt.hoststorm.com.br | Mantido sem alteração de DNS |

**Ainda não está pronto para jogadores.** O teste positivo de conexão TCP não valida o fluxo de login.

Veja [auditoria detalhada](docs/AUDITORIA-2026-10-22.md) e [plano de instalação](docs/INSTALACAO-NOVA.md).

Segurança: o repositório é **público**. Não enviar backups, credenciais, arquivos pessoais ou source sem auditoria e autorização de redistribuição.

## Atualização SQL (22/10/2026)

O arquivo `C:\StormPT-2703\sql.rar` foi identificado na VM e validado com 7-Zip. Os 19 bancos de dados com arquivos MDF/LDF foram anexados ao SQL Server 2022 Express, totalizando 308 tabelas. Todos os 19 passaram em `DBCC CHECKDB ... WITH PHYSICAL_ONLY`. Um arquivo isolado `PristonDB_log.ldf` não possui MDF correspondente e não foi anexado.

Foram criados e verificados backups dos 18 bancos vazios antes da substituição. Os dados legados de teste que acompanham o RAR **não devem ser liberados a público sem auditoria e higienização**. World Server voltou a iniciar e escuta TCP 1997 na LAN. Não houve alteração de domínio nem disponibilização pública.
