# StormPT Web — 24/10/2026 11h — gate de combate isolado, reforço de segurança

## Escopo e resultado
Foi corrigida uma falha de reentrância e troca de sessão durante a execução síncrona do callback nativo no gate C++ isolado. O estado agora usa geração de sessão e flag inFlight, rejeita ataques aninhados, invalida callback após revogação/rebind (inclusive ao mesmo ID) e libera o gate após exceção. Nenhum dano, EXP ou loot é calculado pelo navegador.

## Evidências verificadas
- AEROCOOL: 107/107 testes Node de transporte aprovados; fonte e testes novos conferidos por SHA-256.
- ORACLE ARM64: 35/35 verificações C++ com g++ -std=c++11 -Wall -Wextra -Werror -pedantic; build com ASan/UBSan e execução release passaram. Binário de teste ARM64 SHA-256 814b166caf316b05a0a53ff293a51e43ad79de29c5a56d57c52c8909e167d5e6.
- ZIEL: VM IA Windows 11 observada em execução pelo virsh; não foi feito benchmark GPU.
- SUPERFRAME: SSH acessível; HTTPS /jogar/ HTTP 200; compilador C++ indisponível. Caminho alternativo de asset testado retornou HTTP 404 e não é evidência de autorização.
- Arquivos aprovados e logs consolidados no AEROCOOL. Backup anterior à promoção, manifesto e arquivo tar.gz verificados.

## Limites
- Gate continua NÃO integrado ao GameServer; nenhuma alteração no executável, SQL, contas ou personagens.
- Callback real precisa ser síncrono, sob exclusão da sessão e regras nativas transacionais. Revogação posterior a efeitos colaterais não pode desfazer dano; integração exige desenho próprio e teste desktop.
- Monstro real QA, ataque, dano, morte, loot, EXP, habilidades e inventário transacional pendentes.
- Progresso global não mensurado; piloto QA restrito.

## Fontes
native-auth/browser_combat_session_gate.hpp
native-auth/test-combat-session-gate.cpp
builds/staging-1100-combat-gate-hardening/oracle-validation.log
