# StormPT Web — 24/10/2026 10h — gate isolado de sessão para combate

## Escopo
Novo gate C++ somente para testes: vincula intenção de ataque a conexão nativa autenticada, rejeita sessão inválida, replay e cooldown, e só registra sequência/cooldown depois de confirmação positiva das regras nativas. Rejeição pelo callback nativo não consome sequência. Nenhuma alteração no GameServer original, banco SQL ou personagens. Não existe ataque real implementado.

## Evidências
- GitHub PR #2 examinado: head f1111308bdd8c700ab52e9d394122267afab7152 no início da execução.
- AEROCOOL: 107/107 testes de transporte aprovados; g++ ausente no host.
- ORACLE ARM64: compilação g++ -std=c++11 -Wall -Wextra -pedantic e 22/22 checagens aprovadas.
- SUPERFRAME: SHA-256 das três fontes idêntico; g++ indisponível, portanto nenhum teste C++ compilado.
- ZIEL: Unraid acessível, VM IA ligada; sem teste gráfico nem FPS nesta execução (GPU pertence à VM).
- AEROCOOL único destino final, arquivos aprovados e logs reunidos.
- Nenhuma publicação QA ou abertura de acesso nesta execução.

## Bloqueios e próximos passos
Integrar gate apenas após resolver monstro REAL no estado nativo da sessão QA e verificar regras originais de ataque, alcance, dano, morte, EXP e loot. Testar conexão/retorno de erro/replay com cliente Windows e navegador antes de habilitar. Não há percentual global auditado.
