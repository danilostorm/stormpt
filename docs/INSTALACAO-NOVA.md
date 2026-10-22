# StormPT — instalação limpa
Referência: 22 de outubro de 2026.
## Confirmado
- Os três pacotes de 27/03/2026 foram extraídos e verificados.
- Visual Studio Build Tools 2022 e ATL instalados; projetos adaptados.
- SQL Server 2022 Express instalado e conectado localmente.
- Server33 e Game33 recompilados em Release/Win32 com 0 erros.
- Rotina de SQL remoto do cliente foi neutralizada; antigos IPs foram substituídos para testes locais.
## Pendências
- Montar esquemas completos do SQL para contas, personagens e demais bases; os pacotes não trazem backup completo.
- Auditar endpoints e credenciais residuais, definir conta de serviço de menor privilégio.
- Testar inicialização do servidor, login, criação de personagem, persistência e mapas.
- Validar conexão externa antes de trocar o domínio em produção.
## Segurança
O repositório é público. Não subir source sem verificar direitos e segredos. Não versionar dados de usuários, senhas ou backups SQL.
IP local é apenas para testes de laboratório; clientes externos exigem endpoint público testado.
