# Auditoria da instalação nova — 22/10/2026

## Contexto
Instalação limpa a partir dos pacotes de 27/03/2026 em uma VM Windows 11. Nenhum procedimento abaixo significa liberação pública do servidor.

## Verificações bem-sucedidas
- Fonte do servidor recompilada em Release/Win32, zero erros; o manifesto foi ajustado de RequireAdministrator para asInvoker e o novo build voltou a concluir sem erros.
- Fonte do cliente recompilada em Release/Win32, zero erros; Game.exe foi substituído pelo build Game33.exe, com cópia do Game.exe original mantida na VM.
- SQL Server 2022 Express operacional; integração local por autenticação Windows, sem credenciais remotas embutidas na versão recompilada do servidor.
- World Server iniciou em uma conta interativa, conectou às bases e abriu o listener TCP 1997.
- O TCP 1997 respondeu de outro dispositivo na mesma LAN; firewall permitiu somente a sub-rede do laboratório.
- O SQL TCP 1433 não foi exposto externamente à VM.

## Bloqueios de funcionamento completo
1. **18 bases da aplicação estão criadas, mas todas têm zero tabelas e zero procedures**. O World Server carregar não prova funcionamento de cadastro, login, personagens, inventário ou clãs.
2. Os pacotes de cliente/servidor/source não contêm o conjunto completo de scripts de criação dos bancos. Os backups disponíveis em outro ambiente pertencem a estruturas antigas e não foram importados.
3. O arquivo ClanDB_Manual.sql contém SELECTs e exemplos de INSERT, UPDATE e DELETE. Não executar o arquivo inteiro em produção; é um guia manual, não uma migration segura.
4. Rotinas antigas fazem chamadas HTTP a endpoints de clãs, autenticação e sons; o back-end HTTP/IIS não foi instalado nem adaptado na VM nova.
5. Cliente configurado com endpoint local de teste. Exposição pública e testes com usuário real ainda pendentes.
6. Progressão não homologada: configuração de novo jogador indica Level=1, porém ADD=70; ExpManager.ini mostra valores Nv iniciais 11. EXP 25x, DROP 35x, level máximo e itens até 80d exigem revisão funcional antes da abertura.

## Segurança de origem
- A source original continha IPs antigos e uma rotina de cliente que fazia contato direto com SQL externo. A rotina SQL remota do cliente foi neutralizada e o código alterado compilou.
- Os pacotes originais e backups .original-2703 continuam na VM, mas **não devem ser enviados ao GitHub público**: podem conter credenciais antigas e dados proprietários.
- Bloqueios de firewall criados automaticamente para Server33.exe foram desativados somente para esse caminho, substituídos por uma permissão específica de TCP 1997 restrita à LAN.

## Domínio e publicação
- O domínio stormpt.hoststorm.com.br segue inalterado e protegido pelo proxy HTTP/HTTPS do Cloudflare.
- Cloudflare não encaminha o protocolo TCP arbitrário na porta 1997 pelo proxy HTTP padrão. Para cliente de jogo: DNS-only em host próprio ou Cloudflare Spectrum apropriado; manter site via Cloudflare.
- Não mudar o DNS/portas públicas nem desativar o servidor antigo antes de validar login e persistência completos.

## Evidências locais (não incluídas no repositório)
- C:\StormPT-2703\build-server-2.log
- C:\StormPT-2703\build-client-6.log
- C:\StormPT-2703\build-server-integrated-auth.log
- C:\StormPT-2703\build-server-asinvoker.log
- C:\StormPT-2703\Servidor\Server33.exe
- C:\StormPT-2703\Cliente\Game.exe

## Próximos passos necessários
1. Obter esquema SQL específico e compatível com a source de 27/03/2026; validar migrations em banco descartável antes de aplicar nas 18 bases.
2. Implementar esquema de autenticação/conta com testes reais e conferir persistência de personagem e inventário.
3. Recompilar as URLs/endpoints HTTP restantes para back-end próprio; reinstalar IIS e integrar site, painel de usuário e clãs.
4. Homologar exp, drop, progressão, limite de level, itens, mapas e balanceamento.
5. Preparar cliente/distribuição auditada, testes WAN, regras de firewall mínimas, monitoramento e somente então trocar produção.
