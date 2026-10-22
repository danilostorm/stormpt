# StormPT — instalação limpa
Referência: 22 de outubro de 2026.
## Confirmado
- Os três pacotes de 27/03/2026 foram extraídos e verificados.
- Visual Studio Build Tools 2022 e ATL instalados; projetos adaptados.
- SQL Server 2022 Express instalado e conectado localmente.
- Server33 e Game33 recompilados em Release/Win32 com 0 erros.
- Rotina de SQL remoto do cliente foi neutralizada; antigos IPs foram substituídos para testes locais.
## Pendências
- **Concluído:** restaurar os bancos completos de `C:\StormPT-2703\sql.rar` (19 bancos, 308 tabelas). Falta auditar dados de teste e testar fluxos de conta e personagens.
- Auditar endpoints e credenciais residuais, definir conta de serviço de menor privilégio.
- **Inicialização testada:** World Server inicia com SQL importado e escuta TCP 1997; faltam testes de login, criação de personagem, persistência e mapas.
- Validar conexão externa antes de trocar o domínio em produção.
## Segurança
O repositório é público. Não subir source sem verificar direitos e segredos. Não versionar dados de usuários, senhas ou backups SQL.
IP local é apenas para testes de laboratório; clientes externos exigem endpoint público testado.

## SQL importado do pacote original

- Fonte: `C:\StormPT-2703\sql.rar` (39 arquivos MDF/LDF).
- Extraído em `C:\StormPT-2703\SQL-IMPORT\sql` e anexado à instância `SQLEXPRESS`; 19 bancos online e 308 tabelas.
- Todos os 19 bancos passaram `DBCC CHECKDB` com `PHYSICAL_ONLY` e `NO_INFOMSGS`.
- 18 backups de bancos vazios guardados na pasta de backup SQL `StormPT-2703-Empty-PreImport` antes da troca.
- `PristonDB_log.ldf` é arquivo órfão, não anexado.
- O pacote possui contas/clãs de exemplo; manter fora de produção até higienizar dados de teste.
