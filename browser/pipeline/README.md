# Linha de processamento StormPT

Execute a partir da pasta `stormpt-browser`. Não utiliza API externa de IA.

```sh
# Catálogo completo, conversão retomável, validação, regressão e publicação de preparação:
python3 pipeline/stormpt_pipeline.py run --publish

# Acrescenta compilação Win32 em saída separada (sem instalar/reiniciar GameServer):
python3 pipeline/stormpt_pipeline.py run --native-build --publish
```

O processamento continua após falhas individuais e registra o motivo. Cache compara versão do conversor e metadados de dependências; a saída é conferida por SHA-256 antes de reutilizar/publicar. `--force` reconverte. Fontes são copiadas sem alteração; caches, arquivos do jogo, logs detalhados e catálogos completos permanecem em `pipeline/private/`, excluída do git.

O catálogo enumera os dois clientes configurados; a conversão utiliza somente `primaryRoot`. Não mistura silenciosamente versões dos dois clientes. O índice rápido lê metadados e cabeçalhos; calcula SHA das fontes quando as copia. `catalogFullHash: true` antecipa os hashes de modelos e configurações, com maior custo de leitura. Atualize o catálogo após alterar arquivos de origem; use `--force` se houver mudança preservando tamanho e data.

Os únicos conversores atualmente suportados são Stage 0.72, Model 0.62 estático e primeira pose de modelo com configuração/esqueleto encontrados. Outros formatos, dependências ausentes e validação glTF com erro são classificados como bloqueados. Não se considera um GLB validado equivalente ao renderizador desktop: animação completa, materiais em múltiplas camadas, efeitos e funções de jogo continuam pendentes.

Comandos separados:

```sh
python3 pipeline/stormpt_pipeline.py catalog
python3 pipeline/stormpt_pipeline.py convert --workers 2
python3 pipeline/stormpt_pipeline.py convert --path char/npc --workers 2
python3 pipeline/stormpt_pipeline.py convert --limit 20
python3 pipeline/stormpt_pipeline.py report
python3 pipeline/stormpt_pipeline.py validate
python3 pipeline/stormpt_pipeline.py status
python3 pipeline/stormpt_pipeline.py test
python3 pipeline/stormpt_pipeline.py build
python3 pipeline/stormpt_pipeline.py publish
```

Cada conversor roda em subprocesso isolado com tempo limite. O padrão de dois trabalhadores evita ocupar toda a máquina. A execução completa usa trava para evitar dois lotes concorrentes sobre o mesmo catálogo. Em caso de interrupção, repita o comando; resultados por arquivo são persistidos a cada conclusão.

A publicação copia somente candidatos validados, com nomes derivados do hash, para a pasta privada `BrowserAssets/Batch` no Windows. Confere novamente o SHA da cópia e cria um manifesto imutável de release. Não modifica a lista de assets ativos no IIS, não muda o cliente publicado e não instala um GameServer novo. Ativar mapas/modelos exige integrar os respectivos sistemas e passar pelos testes conectados. Isso evita apresentar conversão geométrica como jogo completo.

Resultados:

- `catalog-summary.json`: contagem total, extensões e formatos encontrados.
- `batch-summary.json` e `BATCH_REPORT.md`: resultados e motivos de bloqueio.
- `test-summary.json`: códigos de saída das regressões.
- `integration-summary.json`: prova com fonte real, cache, reconstrução e publicação de preparação.
- `native-build-summary.json`: hash do binário de compilação, quando solicitado.

`private/batch-results.json` contém o progresso detalhado, mesmo durante a execução. Cada tarefa mantém dependências, logs e relatório glTF próprios em `private/jobs/`. Os testes verificam isolamento de falhas, referências de arquivo, invalidação de cache e recusa de publicação após alteração do artefato. Não há comandos SQL ou mudanças em contas/personagens.

## Processamento distribuído temporário

AEROCOOL coordena a fila e mantém fontes, caches, resultados e relatórios. Ziel oferece dois trabalhadores de 4 CPUs/5 GB cada; Oracle um de 2 CPUs/3 GB; Superframe um de 1 CPU/768 MB, limitado a pacotes pequenos. Há alternativa local com até dois conversores. A VM IA não foi alterada.

`prepare_cluster.py` gera uma execução com identificação única, credencial temporária, arquivo de runtime e plano privado de implantação por servidor. O provisionamento utiliza o conector SSH para copiar somente a pasta gerada e iniciar `bootstrap.sh`. O coordenador e os trabalhadores precisam ser iniciados antes de `start_batch.py`; o provisionamento não sobrescreve uma execução ativa. `prepare_cluster.py` inicia os serviços da principal; o plano privado lista os passos dos auxiliares.

A comunicação usa fila autenticada. O Ziel usa uma rota HTTPS temporária porque o caminho direto não respondeu. Oracle e Superframe usam a rede privada. Nenhuma chave do GameServer, senha de jogador ou banco de dados é distribuída. Cada trabalhador recebe somente os arquivos necessários à tarefa. O AEROCOOL verifica o SHA do retorno e repete a validação glTF antes de aceitar o candidato.

Ao terminar, a fila fecha, os contêineres saem e os bootstraps removem pastas e imagens da execução. `make_cleanup_watchers.py` gera uma segunda verificação por servidor, com limpeza limitada ao identificador desta execução e comprovante devolvido à principal. `finish_cluster.py` sinaliza o encerramento e reúne esses comprovantes. `cleanup_cluster.py` remove a rota temporária e encerra o coordenador. Artefatos e relatórios definitivos continuam no AEROCOOL. Falta de acesso SSH ou de comprovante deve aparecer como pendência de verificação, nunca como limpeza comprovada.

O plano de implantação, os identificadores das tarefas remotas e as credenciais ficam em `private/`. `distributed-summary.json` é um retrato do processamento, não um relatório de jogo concluído.

## Segunda passada de recuperação

`index_bindings.ps1` lê referências de modelo/esqueleto dos INX/INF originais. `plan_repairs.py` agrupa falhas e identifica somente vínculos únicos. `repair_candidates.py` espera a primeira conversão terminar e usa cache separado para reprocessar candidatos selecionados, com dois processos locais e sem reabrir os auxiliares. O suporte à variante antiga de normais é aplicado somente nessa passada, em memória; a estrutura continua passando pelo parser existente. Cabeçalhos desconhecidos e configurações ambíguas não são aceitos automaticamente.

Testes: `test_repair_plan.py` e `test_legacy_normal_compat.py`. As integrações privadas de modelo e item têm resumos próprios. A publicação dos recuperados gera outro manifesto de preparação; o jogo ativo continua exigindo integração e testes conectados.
