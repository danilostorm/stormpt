# StormPT — retomada e segunda passada automática — 24/10/2026

Acesso Oracle renovado e watcher adicional de limpeza instalado e em execução. A confirmação de remoção dos temporários permanece pendente até o encerramento do lote; nenhuma limpeza é declarada concluída antecipadamente.

O lote distribuído principal continua em execução nos auxiliares. O catálogo primário contém 3.775 SMD. Estado observado nesta atualização: 3412 arquivos processados, 1149 candidatos validados. Os demais possuem motivos de bloqueio registrados. Esses arquivos não são conteúdo ativado no jogo.

Indexadas 549 referências originais de configuração para localizar modelos cujo INX tem outro nome. O plano preserva ambiguidades e não escolhe pelo nome parecido. A configuração lida é novamente conferida contra o caminho original do modelo antes de utilizá-la. Integração real: Monmushroom/mushroom.smd passou usando monmushroom.inx, com zero erros glTF.

A análise do carregador original confirmou dois valores de cabeçalho de objeto, correspondentes ao tratamento das normais. A segunda passada aceita a variante antiga somente numa cópia em memória, mantendo a validação de estrutura original. O exportador já recalcula as normais. A entrada em disco não é modificada e cabeçalhos desconhecidos continuam rejeitados. Integração real: itBI195.smd passou com zero erros glTF. Esse suporte fica isolado da primeira passada e dos trabalhadores já em execução.

Segunda passada preparada em repair_candidates.py, aguardando o encerramento da conversão principal. Seleciona apenas referências nativas únicas, erros transitórios de cache e a variante de normais conhecida. Usa cache separado e até dois processos no AEROCOOL; não volta a instalar auxiliares nem impede sua limpeza. Resultados recuperados terão manifesto de preparação separado. Não refaz candidatos já validados no lote principal, não muda o GameServer e não ativa conteúdo automaticamente.

Verificação: 83 testes de transporte, 31 frontend, sete da automação, cinco de vínculos e três de cabeçalhos passaram (129 ao todo), além das duas integrações com fontes reais. Relatórios e fontes privadas permanecem no AEROCOOL; código próprio e resumos são versionados no GitHub.
