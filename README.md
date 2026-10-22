# StormPT

Projeto de manutenção e publicação do servidor Priston Tale StormPT (cliente 1.08), separado do StormPK.

## Situação de implantação

- **Site:** https://stormpt.hoststorm.com.br — IIS no Windows, protegido por Cloudflare Tunnel e proxy reverso através de Tailscale.
- **Ambiente original:** VM Windows `STORM PT` (`PRIME`), fonte do site IIS em `C:\inetpub\wwwroot`, executável do servidor em `C:\PTServer\Server.exe`.
- **Cliente:** `Cliente 1.08.zip` preservado na VM. Distribuição pública ainda não cadastrada no repositório.
- **Jogo externo:** ainda não homologado. Configuração original usava IPs antigos; login TCP e encaminhamento pela Oracle pendentes.

## Segurança e versões

O site legado usa PHP 5.3 e contém painéis de administração e arquivos de configuração sensíveis. Não publique `.env`, senhas SQL, chaves, logs, dados reais de contas/personagens, dumps SQL, backup completo do IIS ou binários sem análise prévia. Diretórios de administração e configuração são bloqueados na frente pública; não confundir com modernização do código PHP.

A source original fornecida em `Source-Original.rar` precisa de revisão de credenciais e licença antes de ser enviada a um repositório **público**. A cópia de produção deve permanecer no servidor com backup. Este repositório será usado para receber código-fonte auditado, scripts de implantação sem segredos, documentação e mudanças incrementais.

## Pendências prioritárias

1. Corrigir autenticação SQL do `Server.exe` e validar porta TCP de jogo.
2. Identificar IP/porta em `SrcGame/src/Game/fileread.cpp`, compilar cliente Win32 com testes, sem publicar acesso incorreto.
3. Publicar o transporte TCP de jogo via Oracle ou outra ponte compatível com o cliente e testar autenticação remota.
4. Migrar o código-fonte e site sanitizados ao GitHub sem expor dados sensíveis.
5. Atualizar o link de download do site com build verificado e rastreável.

Não alterar nada do StormPK durante esta migração.
