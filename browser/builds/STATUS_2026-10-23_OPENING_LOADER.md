# StormPT — abertura automática e carregamento

Progresso global estimado: 64% / 100%.
0% 🟩🟩🟩🟩🟩🟩🟨⬜⬜⬜ 100%

Publicado em /jogar/ e /jogar-beta/: tela de carregamento com progresso de download do cenário; liberação após primeira renderização; animação automática, mantendo preferência de movimento reduzido e botão de pausa. Timeout de 12 segundos libera formulários se o carregamento não concluir; não representa garantia de carregamento rápido. Usa a abertura original já convertida, não os pacotes XPK do cliente novo.

Chromium público: cenário pronto, loader oculto e progresso 100%, câmera em movimento, pausa estável, cadastro e login acessíveis, zero erros JavaScript. Evidência: opening-browser-result.json. Ajustado teste para DOMContentLoaded, pois conexões pendentes impediam networkidle apesar de a cena estar pronta.

GameServer TCP 1997 respondeu. IIS após reinício estava servindo Default Web Site com StormPT parado. Configuração salva em StormPT-BeforeSiteRestore-20261023-Loader; Default Web Site parado e sem início automático; StormPT iniciado e com início automático. HTTP público 200. Backups da interface em backups/opening-loader-*. Sem alteração de binário ou banco nesta etapa.
