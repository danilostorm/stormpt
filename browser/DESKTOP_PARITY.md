# Critério de conclusão — StormPT Web e cliente desktop

O objetivo é reproduzir no navegador as funcionalidades do cliente desktop deste StormPT, usando o mesmo servidor, contas, personagens e progresso. A referência é a versão desktop efetivamente utilizada pelo proprietário. Uma caminhada de QA em Ricarten não satisfaz esse objetivo.

O percentual antigo de 66% era uma estimativa subjetiva de uma divisão técnica que dava muito peso à infraestrutura. Ele não mede equivalência com o desktop e foi retirado da estimativa global. Nenhum novo percentual será calculado até inventariar a referência desktop e atribuir critérios verificáveis às funções. Os registros antigos permanecem como histórico.

| Área | Estado comprovado | Critério para concluir |
|---|---|---|
| Conta e entrada | Login real, criação/seleção, autorização e reconexão no piloto | Fluxos do desktop e site integrados, erros e sessões validados; acesso ampliado somente após testes |
| Classes e aparência | Lutador QA, corpo/cabeça e animações básicas | Todas as classes habilitadas no desktop, rostos/cabelos, armaduras, armas e aparências corretas |
| Mundo | Ricarten parcialmente convertido | Todos os mapas habilitados no desktop, transições, objetos, efeitos, colisões e iluminação conferidos |
| NPCs | Diálogo nativo; 14 tipos de modelo suportados em Ricarten (poses estáticas; dois tipos observados pendentes) | Todos os modelos, animações, seleção e serviços correspondentes ao desktop |
| Combate e monstros | Pendente | Spawn, movimento, ataque, dano, defesa, morte, respawn e sincronização autoritativos |
| Habilidades e progressão | Pendente | Aprender/usar habilidades, efeitos, custos, cooldowns, EXP, níveis e pontos iguais ao servidor |
| Itens | Consulta de inventário/atributos | Equipar, mover, consumir, coletar, descartar, guardar e restaurar; quantidades, requisitos e persistência validados |
| Economia e serviços | Pendente | Lojas, venda/compra, warehouse, troca, mix/aging, reparos e serviços habilitados no desktop |
| Missões e sistemas sociais | Pendente | Quests, grupo, amigos, clãs e eventos habilitados no desktop |
| Comunicação e som | Pendente | Canais de chat, mensagens e sons/músicas equivalentes às funções do desktop |
| Interface | Painéis provisórios | Seleção/criação, HUD, inventário, habilidades, mapas e opções completos e utilizáveis |
| Publicação e qualidade | Piloto fechado, verificações parciais | Compatibilidade de navegadores, GPU do proprietário, recuperação de conexão, segurança e regressão desktop |

Cada conclusão precisa de teste conectado ao GameServer e conferência com o desktop. Testes de protocolo, arquivos e modelos isolados são evidências auxiliares e não substituem o teste jogável. Limitações conhecidas continuam como pendências e não são chamadas de 100%.
