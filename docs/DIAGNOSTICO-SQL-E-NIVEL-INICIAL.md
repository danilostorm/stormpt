# StormPT — Diagnóstico da source original (22/10/2026)

## Achados confirmados na source fornecida

**Bancos SQL:** `SrcServer/src/Server/Database/SQLConnection.cpp` lê um objeto de configuração, mas usa valores de servidor e autenticação compilados no executável ao criar a connection string. `SrcServer/src/Database.cpp` mantém outra conexão com valores compilados. `SrcServer/src/Server/SrcServer/gameSQL.cpp` possui fallback com credenciais embutidas e registra informações confidenciais em log. Além disso, uma rotina abre a conexão ODBC sem conferir o status de retorno e pode reportar inicialização concluída mesmo quando a conexão falhou. As mensagens observadas no servidor incluem `SQLSTATE 08S01`.

**Ação:** substituir esses caminhos por leitura de `Server\\Config\\SQL.ini`, verificar `SQL_SUCCEEDED(SQLDriverConnectA(...))`, evitar logging de credenciais e só publicar DLLs após compilar, testar conexão e verificar rollback. Os segredos antigos precisam ser rotacionados; não publicar a source original sem sanitização.

**Nível inicial:** `SrcServer/src/Server/SrcServer/OnSever.cpp` começa com `nStartUserLevel = 1`, mas carrega esse valor de uma tabela SQL `Level` e chama `NewStartLevel` durante a criação; essa função ainda define `int Level = 80`. Portanto é preciso neutralizar o boost e revisar a tabela SQL para garantir que novos personagens nasçam no nível 1. Não alterar personagens atuais automaticamente.

**Rede do cliente:** `SrcGame/src/Game/fileread.cpp` codifica um IP antigo; ambos os projetos definem `TCP_SERVPORT = 10006`. Não trocar por IP Oracle antes de validar DNS/entrada TCP 10006, encaminhamento até a VM e login ponta a ponta. Site HTTPS e transporte TCP do jogo são independentes.

## Limites e produção

O trabalho de análise e preparação de correção ainda **não** constitui build Windows nem patch instalado. A VM StormPT foi vista ligada; o `Server.exe` não estava em execução no último diagnóstico. O stdout temporário de aproximadamente 29 GB foi esvaziado após preservar amostra do erro (sem tocar SQL ou arquivos históricos). Não declarar jogo online até validar processo, TCP e login remoto.

O objetivo de balanceamento clássico — EXP, drops, itens 80D, mapas e NPCs — exige inventariar as tabelas e GameFiles reais, não apenas presumir valores com base numa lista de recursos.
