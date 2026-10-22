# StormPT — nova instalação 27/03/2026

Repositório reiniciado para a nova infraestrutura StormPT. O projeto anterior foi removido da árvore da branch principal; o histórico Git anterior foi preservado para recuperação.

## Estado confirmado (22/10/2026)

| Área | Status |
| --- | --- |
| Windows 11 e SQL Server 2022 Express | Instalados |
| Server33.exe recompilado (Win32 Release) | 0 erros; inicia e abre TCP 1997 na LAN |
| Game33.exe recompilado (Win32 Release) | 0 erros; copiado como Game.exe |
| Banco SQL | 18 bases criadas, **sem tabelas** |
| Login/contas/personagens | Bloqueado por falta de esquema SQL |
| Clãs, web e painéis | Dependências HTTP e schema pendentes |
| Domínio stormpt.hoststorm.com.br | Mantido sem alteração de DNS |

**Ainda não está pronto para jogadores.** O teste positivo de conexão TCP não valida o fluxo de login.

Veja [auditoria detalhada](docs/AUDITORIA-2026-10-22.md) e [plano de instalação](docs/INSTALACAO-NOVA.md).

Segurança: o repositório é **público**. Não enviar backups, credenciais, arquivos pessoais ou source sem auditoria e autorização de redistribuição.
