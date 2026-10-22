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

## Portal e launcher (outubro de 2026)

O novo [site StormPT](https://stormpt.hoststorm.com.br) está no IIS da VM Windows 11 com identidade renovada, rankings e apenas download do launcher. Consulte [o relatório de implantação](docs/PORTAL-LAUNCHER-2026-10-22.md).

O launcher assinado e seu código-fonte estão em `launcher/`; o portal ASP.NET está em `web/`. O pacote do jogo é servido separadamente pelo próprio site, não pelo GitHub.

**Estado:** site online; cliente instalável pelo launcher, mas **jogo público não homologado** (IP do Game.exe ainda é local e o encaminhamento TCP de produção não foi configurado). Cadastro, login, personagens e progressão aguardam testes completos.

## Atualização da implantação — 22/10/2026

- Portal principal publicado em `https://stormpt.hoststorm.com.br` com o novo visual PHP enviado pelo proprietário.
- AEROCOOL: PHP 8.4-FPM + Nginx em Docker, contêineres `stormpt-php-fpm` e `stormpt-php-nginx`; origem do proxy na porta 3825.
- O cadastro, login e painel continuam no IIS/ASP.NET da VM Windows 11, em `/Conta.aspx`, usando `AccountDB` local. Os links de cadastro e painel do portal PHP encaminham para esse sistema.
- Rankings servidos por uma API restrita à LAN e com consultas de leitura ao SQL do jogo; acesso público à API bloqueado no proxy.
- Launcher clássico atualizado distribuído como `/releases/launcher.exe`; o pacote do cliente continua sob `/client-files/` com manifesto RSA e SHA-256.
- Backup do site ASP.NET anterior no Windows: `C:\StormPT-2703\Backups\Site-ASPNET-before-PHP-20261022`.
- Backup do proxy anterior no AEROCOOL: `/mnt/user/appdata/stormpt-web-bridge/default.conf.backup-before-PHP-20261022-174805`.
- Source do portal PHP em `/mnt/user/appdata/stormpt-php-staging/site`, do launcher clássico no Windows em `C:\StormPT-2703\LauncherClassic\Launcher`.
- **A publicação da source integral do jogo e das novas versões no GitHub público está pendente de aprovação final e revisão de segredos/licenças.** O repositório `danilostorm/stormpt` é público, portanto não publicar bases SQL, segredos, chaves RSA privadas ou fontes não revisadas.
- A abertura pública do **servidor de jogo TCP** segue pendente; a publicação do **site** não significa liberação do login externo do Game.exe.
