# Preparação da migração StormPT

O cliente e o servidor principal da próxima edição são AMD64. O launcher continua
Win32 e inicia o jogo AMD64. A DLL de autenticação atual roda em processo auxiliar
Win32 separado.

## Launcher

Compile com `launcher/build.cmd`. O launcher verifica o manifesto RSA do portal,
retoma downloads e confere o SHA-256 antes da instalação. A instalação usa a pasta
do executável do launcher. O pacote do jogo contém `Game.exe` na raiz.

Validação local com `--selftest-classic-assets`, `--selftest-layout`,
`--selftest-cleanup` e `--selftest-deleted-patch-files`. Valide também a instalação
em uma pasta vazia, a migração de um cliente antigo, a atualização do launcher
antigo e a entrada no mapa antes de publicar o novo feed.

## Publicação

O feed assinado, os pacotes do jogo e o acesso do painel são validados no ambiente
de homologação. O novo servidor precisa receber contas, personagens, armazéns e
transações da produção no momento da troca. Os pacotes privados ficam no
armazenamento operacional. O portal público oferece o download do launcher.
