# StormPT Web — acesso do proprietário e seleção automática

23/10/2026 — progresso estimado mantido em 66%.

O proprietário entrou no site, mas o emissor de tickets recusava sua conta (403) porque o piloto aceitava apenas QA. Emissor IIS e adaptador nativo agora consultam contas explicitamente listadas em arquivo privado, uma por linha. A conta QA foi mantida e o proprietário acrescentado. Nenhum acesso geral foi aberto; tickets assinados, vínculo conta/sessão, CSRF e origem continuam obrigatórios. O adaptador mantém a conta QA legada da variável de ambiente. O arquivo privado não é publicado.

A interface conecta automaticamente ao GameServer após o login ou restauração de sessão e mostra a seleção real de personagens. O botão manual fica como tentativa após falha e é ocultado na seleção. Mensagens de autorização foram traduzidas.

O cenário 3D incompleto da abertura foi substituído temporariamente por fundo leve animado em CSS, com pausa; o trabalho da abertura original foi preservado em backup. Nenhuma nova abertura convertida é alegada. Teste anônimo público passou: fundo animado, pausa, formulários e zero erros JavaScript. 83 testes de transporte e 29 de frontend passaram.

Win32 compilou com sucesso. Binário instalado com backup, sem clientes conectados; tarefa pausada durante troca e reativada. SHA256 355970C565149F86EB302B98663ABA3CD7EA07BCD6D253434C5C83C210C4D428. Cópia canônica do adaptador sincronizada. Servidor em inicialização; verificação de acesso real e seleção automática pendente nesta versão do relatório.

Validação após inicialização: diagnóstico operacional com ticket assinado para o proprietário recebeu a lista real de personagens; conta não listada não recebeu lista. Isso verifica autorização nativa, sem testar a senha do proprietário. Seis verificações nativas da lista passaram. Chromium recebeu automaticamente a lista QA, sem clicar em Carregar personagens. A tentativa inicial de entrar no mundo identificou que BrowserAssets.ashx também comparava a lista inteira; o handler foi corrigido para usar as mesmas entradas explícitas e está em novo teste.

Resultado final às 22:56 BRT: Chromium público passou com login QA real, seleção automática sem clique extra, entrada em Ricarten, inventário, mochila II, movimentação e botão para reconectar após sair. Zero erros JavaScript. Fundo pesado não foi carregado nem precisou ser pausado manualmente. A autorização nativa do proprietário foi comprovada separadamente por diagnóstico assinado; sua senha não foi acessada nem alterada.
