# StormPT — linha de processamento em lote

23/10/2026. Implementada em pipeline/stormpt_pipeline.py, sem API de IA externa.

Um comando executa catálogo, conversão em paralelo, validação glTF, regressão e publicação de preparação: `python3 pipeline/stormpt_pipeline.py run --publish`. Há fases separadas, filtros, limite de trabalhadores, retomada e reprocessamento forçado. `--native-build` acrescenta compilação Win32 em diretório separado; esse comando foi preparado, mas a compilação nativa não foi executada neste lote e não instala nem reinicia o GameServer.

O catálogo cobre os dois diretórios de cliente configurados; os conversores utilizam somente o cliente primário e não misturam silenciosamente suas versões. A primeira indexação lê metadados e cabeçalhos SMD; SHA das fontes é calculado na cópia. Hash antecipado de modelos/configurações é opcional. Metadados preservados artificialmente exigem `--force`, conforme README.

Cada arquivo tem tarefa isolada, cache por dependências/versão, tempo limite e resultado persistido. Um arquivo incompatível não interrompe os demais. GLBs com erros não são publicados. A publicação copia somente candidatos validados para BrowserAssets/Batch, verifica SHA da cópia e cria manifesto com identificação única. Esses candidatos não são ativados automaticamente no jogo. Converter arquivos não implementa combate, habilidades, economia ou equivalência desktop.

Verificações concluídas: 83 testes de transporte, 31 frontend e sete testes da automação. Integração real com arquivos privados de Enzo passou: conversão, zero erros glTF, cache reutilizado, saída corrompida reconstruída e hash de preparação conferido no Windows. Testes também cobrem lote paralelo com arquivos inválidos, referências fora do diretório e recusa de publicação após alteração do artefato.

Execução completa iniciada no servidor em tarefa persistente. O catálogo excedeu 7 mil entradas durante esta verificação e continua em andamento. Depois dele, o executor aguarda a trava, roda regressões, converte todos os SMD primários com dois trabalhadores, gera relatório e publica os candidatos validados na área de preparação. Estado por `python3 pipeline/stormpt_pipeline.py status`. Detalhes em pipeline/private; resumo e relatório do lote são atualizados conforme cada tarefa termina. O total final e os resultados de conversão em massa ainda não foram declarados concluídos.

Catálogos completos, modelos, texturas, caches e logs privados são excluídos do git. O jogo publicado e os personagens não foram alterados por essa execução.


## Distribuição autorizada pelo proprietário

Catálogo final: 64.049 arquivos, 15.973.344.765 bytes, sendo 32.017 arquivos no cliente principal e 32.032 no cliente adicional. O lote primário contém 3.775 SMD. Ziel, Oracle e Superframe têm trabalhadores ativos; cada um já devolveu candidatos aceitos. A primeira integração distribuída explícita usou Ziel, voltou ao AEROCOOL e teve zero erros glTF. O lote segue em tarefa persistente, com seis tarefas concorrentes e limite local de dois processos.

A principal preserva todos os resultados. Os auxiliares têm somente pastas, contêineres e imagens temporários identificados pela execução. Há encerramento automático e remoção da rota de fila. Ziel e Superframe receberam uma verificação adicional com comprovante de limpeza; a implantação dessa verificação na Oracle encontrou exigência de nova autenticação do Tailscale para conexões SSH. O trabalhador Oracle já iniciado continua funcionando e seu bootstrap já possui limpeza no encerramento. A confirmação adicional de limpeza da Oracle permanece pendente de renovar o acesso. Nenhuma limpeza é declarada concluída antes do fim do lote.

GitHub é usado para versionar código próprio; modelos, texturas, credenciais e catálogos completos não são publicados. A VM IA não foi modificada. A conversão em massa produz candidatos, não implementa automaticamente os sistemas de jogo listados em DESKTOP_PARITY.md.
