# Portal e Launcher StormPT — publicação de 22/10/2026

## Portal
- Endereço público: https://stormpt.hoststorm.com.br
- Origem IIS: VM Windows 11, `C:\inetpub\stormpt` (192.168.30.169, porta 80).
- App Pool: `StormPTSite` em ASP.NET 4.8, com permissão SQL de **somente leitura** para `rPTDB`, `ServerDB` e `ClanDB`.
- Arquivos-fonte deste repositório: `web/Default.aspx`, `web/web.config` e `web/assets/`.
- Rankings disponíveis: nível, PvP, Bellatra Solo e clãs, consultados ao vivo no SQL e cacheados por 45 segundos.
- Novidades, características planejadas e CTA exclusivo para baixar o launcher.
- O estado do jogo na página é informativo. A porta 1997 está aberta somente na LAN; login e gameplay público ainda não estão homologados.

## Caminho de entrada e reversão
- O domínio Cloudflare mantém seu registro existente; o proxy Nginx do AEROCOOL no IP 192.168.30.10:3821 encaminha agora o site para `192.168.30.169:80`.
- O antigo destino era `100.118.138.65:80`. Sua configuração foi preservada em `/mnt/user/appdata/stormpt-web-bridge/default.conf.backup-old-site-20261022-153451`.
- Para reverter, restaurar a configuração anterior, validar `nginx -t` e recarregar o container `stormpt-web-bridge`.
- Não restaurar o proxy antigo nem apagar o site anterior automaticamente sem necessidade.

## Launcher
- Arquivo de download **único exibido no site**: `/releases/StormPTLauncher.exe`.
- Source: `launcher/StormPTLauncher.cs`; compilação WinForms .NET Framework 4.x, adaptada do launcher StormPK, sem reaproveitar identidade, URLs ou chave RSA de StormPK.
- Versão dos conteúdos: pacote `StormPT-Cliente-Completo-v2.zip`, cerca de 1,96 GB. O ZIP é consumido pelo launcher, sem link direto no site.
- Manifesto: `/client-files/manifest.json` e assinatura `/client-files/manifest.sig`; chave pública no repositório `launcher/manifest-public.pem`.
- A **chave RSA privada não está no repositório nem na VM web**: permanece protegida no AEROCOOL, em `/mnt/user/appdata/stormpt-launcher/private/`.
- O arquivo `game.ini` de distribuição foi higienizado (campo de última conta limpo) e capturas de teste removidas do ZIP v2.
- Confirmados com o executável: `--verify-manifest`, `--verify-range`, `--selftest-stormpt-base`, `--selftest-layout` e `--selftest-graphics`, todos com código 0.

## Não confundir com lançamento concluído
- O cliente Game.exe foi recompilado, mas ainda aponta para 192.168.30.169 e **não permite jogabilidade fora da LAN**.
- O verificador de conectividade do launcher usa `game.stormpt.hoststorm.com.br:1997`, destino público que ainda precisa ser provisionado e homologado.
- Cadastro, login, criação de personagem, persistência, contas de exemplo e serviços HTTP de clãs/painéis exigem testes/higienização adicionais.
- As taxas EXP 25x, DROP 35x, nível máximo 300 e itens 80D mostradas como planejadas no portal ainda dependem de validação em jogo.
- Não expor SQL TCP 1433 à internet. Não publicar ZIP do servidor, MDF/LDF, senhas ou sources do jogo sem revisão.

## Testes de publicação
- HTTPS do domínio externo retorna HTTP 200 e página nova.
- Download do executável público retorna HTTP 200.
- O zip v2 e manifesto podem ser recuperados pelo proxy; Range público testado com HTTP 206 e conteúdo parcial.
- Primeiro pedido de Range sobre arquivo grande pelo Cloudflare pode ocasionalmente responder com HTTP 200; pedidos subsequentes responderam HTTP 206. É necessário realizar teste completo de instalação/retomada num PC de jogador antes de abertura definitiva.
