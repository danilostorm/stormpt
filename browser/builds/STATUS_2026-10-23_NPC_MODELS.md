# StormPT Web — modelos originais de NPCs de Ricarten

23/10/2026. O objetivo de conclusão é a equivalência funcional com o desktop, documentada em DESKTOP_PARITY.md. A estimativa antiga de 66% foi preservada como histórico e retirada da medição global.

Adicionados 13 modelos originais texturizados ao ferreiro já suportado: Teacher03, Enzo, TN-012, MN-007, maskedwoman, Bcn03, TN-010, Bcn05, cash, Teacher02, TN-005, Stella e dmeca. Registro de caminhos explícitos respeita o tipo enviado pelo servidor; o modelo dmeca é usado aqui por um NPC real, sem substituir monstros. Nomes, posição e orientação continuam vindos dos snapshots nativos.

Conversor lê a primeira pose idle e a seleção de malhas de alta definição do INX. Stella usa o esqueleto mStella declarado na configuração; início de animação zero é aceito conforme a condição de decodificação nativa. A seleção é preservada em extras glTF para evitar falhas quando o loader renomeia objetos duplicados. Mesh auxiliar sem faces foi mantida como nó sem geometria, evitando um mesh glTF inválido.

Validação: 13 arquivos glTF com zero erros e zero avisos. Comparação de 11.552 componentes contra o avaliador C++ original: diferença máxima de 1 unidade de ponto fixo; 11 dos modelos tiveram diferença zero. Os 31 testes frontend passaram. O GameServer não precisou ser alterado ou reiniciado. Publicação no IIS com backup e entrega autenticada. Modelos, texturas, fixtures privadas e código C++ proprietário não são publicados no GitHub.

Duas referências observadas ainda não são renderizadas: TN-017 depende de textura JPEG com cabeçalho não suportado, e battleportal usa SMD 2.18, enquanto o conversor atual lê 0.62. Os arquivos adicionais foram localizados no cliente fornecido pelo proprietário. Não foram substituídos por modelos genéricos.

As poses são estáticas: animação e serviços transacionais dos NPCs continuam pendentes. Isso não conclui o mundo, as lojas ou o jogo. Teste público final passou às 23:13 BRT: login e seleção automática reais, 14 modelos originais carregados de 16 NPCs observados, cada posição conferida com o snapshot, todos com geometria e textura, zero erros de carregamento e zero erros JavaScript. Inventário, segunda mochila, movimentação e botão para reconectar após sair também passaram. O screenshot foi inspecionado e mostra NPCs na cena. Desempenho na RX 550 e animação desses NPCs continuam pendentes.
