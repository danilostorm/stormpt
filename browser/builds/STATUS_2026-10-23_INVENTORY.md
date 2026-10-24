# StormPT Web — inventário e atributos — 23/10/2026

Estimativa subjetiva: 66%. Piloto fechado de QA; acesso geral desativado.

Implementado painel de consulta pelo atalho I, duas mochilas, nomes e quantidades reais, detalhes dos itens, ouro, recursos e atributos do personagem. Os dados vêm do registro nativo vinculado à conta. Não há ações de equipar, consumir, descartar ou negociar.

Validação: 83/83 testes de transporte e 29/29 testes frontend. Layout Win32 medido com os headers originais: registro de item 556 bytes, informação 540 bytes. Fixture sintética comprimida pelo C++ comparada byte a byte. Outros 20 itens de três saves existentes tiveram cada registro descomprimido comparado por FNV1a32 com o decoder C++ nativo; todos coincidiram. Os arquivos originais foram apenas lidos. Saves privados e código proprietário não estão incluídos no repositório.

Publicação dos quatro módulos no IIS com backup. Corrigida regra de módulos no nginx e validada configuração. Gateway reiniciado; GameServer não foi alterado nem reiniciado. Teste público sofreu timeout de WebSocket e depois de carregamento; validação pública não concluída: última tentativa terminou em timeout de WebSocket antes da lista de personagens, sem erros JavaScript. A rota interna /game respondeu 401 ao handshake sem credenciais, como esperado; isso não comprova o caminho público autenticado. Os personagens QA possuem inventários vazios, portanto o teste conectado não prova visualização de itens não vazios.

Restam ações autoritativas de itens, combate, chat, áudio, classes e mapas adicionais, compatibilidade e regressão Windows. A nova abertura foi adiada conforme solicitado.
