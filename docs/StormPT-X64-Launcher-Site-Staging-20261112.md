# StormPT x64, launcher e site — checkpoint de staging

## Validação atual — launcher v11 no staging privado, 12/11/2026

- Reproduzi o erro do v10: o launcher esperava os bytes RSA raw, mas o manifesto existente era acompanhado por assinatura Base64. Corrigi VerifyManifestSignature para aceitar ambos os formatos e NativeBuildVersion passou a 11. Commits 6b3627b (código) e aaddddc (documentação) enviados ao branch staging/stormpt-x64 no GitHub; os pushes atualizam somente a branch de staging.
- Atualizei somente o feed privado no IIS da VM StormPT do SuperFrame, C:/StormPTSiteStaging/20261111/public (binding 100.101.156.69:3825 com Host stormpt.hoststorm.cloud). Backup do estado anterior fora da raiz pública: C:/StormPTSiteStaging/20261111/backup-feed-20261112-v3.
- Manifesto ativo: 1.015 bytes, SHA-256 f9f3ca2e76427e4da05383376172dab09989b6ef02ba5a9eb15a9e8342134613. Assinatura RSA raw: 384 bytes, SHA-256 d695bb989791a7eb156de4b9147b66a3e4b72d037393781291a242acb2d5914f. Launcher de staging v11: 355.328 bytes, SHA-256 75f796cbdb700f007e927487b6b457c11c47c4e61af014f3b350a32e3874ce3b.
- Pacote base referenciado: 2.251.973.075 bytes, SHA-256 b64287314a52f2ca3e377c1a174871b3705ae942028a482fa9814d01d7a82a2e. Patch de Game.exe: 8.748.658 bytes, SHA-256 c0bbb4a98bb20654aecb530020ec9cc5363c03502295d8921f9625fe18bf5198. Game.exe final: 8.748.544 bytes, SHA-256 74782f10b7c9752e9bbcbfb41bd46c584e5c4be3b3f38edf5ccfa874be84bbf4.
- Testei os verificadores v10 e v11 contra o manifesto ativo; ambos aceitaram a assinatura raw. O v10 validou o pacote de patch de 8.748.658 bytes; o v11 validou HTTP Range bytes 0-1023/2251973075 no pacote base.
- Executei v10 em uma instalação de teste isolada. Ele aceitou o manifesto, atualizou-se automaticamente para o executável v11 esperado e reiniciou sem iniciar Game.exe. A instalação permaneceu com PatchVersion=1 e Game.exe SHA-256 74782f10b7c9752e9bbcbfb41bd46c584e5c4be3b3f38edf5ccfa874be84bbf4.
- A instalação limpa e a aplicação incremental do patch também passaram na cópia temporária local: base de 2.251.973.075 bytes, 32.720 arquivos extraídos, patch aplicado e estado final em PatchVersion=1. O executável do jogo não foi iniciado.
- A prova de bootstrap cobre somente o v10 de staging que já continha a chave pública nova. Launchers anteriores a essa versão e o feed legado distribuído aos jogadores ainda não foram testados; não assumir compatibilidade retroativa.
- Do NEXUS, manifesto, assinatura e launcher baixaram do binding IIS correto com HTTP 200 e os hashes acima. A primeira verificação pós-ativação falhou somente porque usava 127.0.0.1, endereço que não corresponde ao binding explícito da VM. Corrigi o script de instalação para usar 100.101.156.69 e confirmei em seguida os três downloads e hashes pelo IIS. A cópia corrigida do script está em work/release-x64-20261111/install-staging-feed-v11.ps1.
- A fonte v11 está no branch de staging. Este relatório, os dois documentos de retomada e o relatório de assinatura foram espelhados no Google Drive e no Disco 3 do AEROCOOL; hashes dos quatro arquivos conferidos. Nenhum arquivo foi publicado na rota pública, produção x86, Oracle/relay ou admin; o servidor x64 de jogo não foi homologado. O ambiente web continua restrito ao LAB.
- O processo auxiliar foi encerrado, a porta local 18785 não está ouvindo e a entrada temporária de hosts foi removida; o hash de hosts voltou ao backup original. A pasta D:/StormPT-Launcher-Install-Test-20261112 permanece, sem processos ativos, porque a revisão automática bloqueou a exclusão recursiva. Um pequeno arquivo __pycache__/serve-staging-transfer-v11.cpython-313.pyc também não pôde ser removido pela revisão automática.

## Histórico — estado do feed v10 antes da correção

O registro abaixo foi escrito antes de localizar a incompatibilidade de assinatura e está superado nas partes sobre validação de assinatura, atualização do launcher e instalação/patch. Consulte a seção de validação v11 no início; os limites do servidor, da produção e do feed público continuam válidos.

- O usuário confirmou a chave nova e pediu para esquecer a VM Ziel. Não houve acesso nem busca na VM Ziel. A chave de staging permanece protegida por DPAPI no NEXUS; ID público `35194eb33fd86b739cb5419ee7d7fb88e5c80e1b8553e1f9b6d3e0a581579608`.
- O IIS de staging na VM StormPT do SuperFrame foi atualizado somente em `C:\StormPTSiteStaging\20261111\public`, porta 3825, binding `stormpt.hoststorm.cloud`. Os arquivos anteriores de manifesto e assinatura foram guardados em `C:\StormPTSiteStaging\20261111\backup-feed-20261112-v2`, fora do conteúdo servido.
- O manifesto novo foi verificado com a chave pública nova no NEXUS e no guest. Manifesto: 1.012 bytes, SHA-256 `75e8b3602cc42fddaff8eca7db8b164848d1c509cd961ea834b0791c05ebacd7`. Assinatura Base64: 512 bytes, SHA-256 `5fedb58fd0d75d56e5452987c75a6be5cd272ad693d1cfbe9ba2bbacbe809135`.
- O pacote base referenciado é `StormPT-Client-x64-20261111.zip`, 2.251.973.075 bytes, SHA-256 `b64287314a52f2ca3e377c1a174871b3705ae942028a482fa9814d01d7a82a2e`. Foi confirmado no destino com o hash declarado.
- Patch `StormPT-Game-x64-Patch-20261112.zip` (somente `Game.exe`): 8.748.658 bytes, SHA-256 `c0bbb4a98bb20654aecb530020ec9cc5363c03502295d8921f9625fe18bf5198`. O executável dentro tem 8.748.544 bytes e SHA-256 `74782f10b7c9752e9bbcbfb41bd46c584e5c4be3b3f38edf5ccfa874be84bbf4`.
- Launcher v10: 354.816 bytes, SHA-256 `a7b9048f8acd264a18fc77ec15e01169119c09ae0535b291c6c39f1c9ad2f055`. O `NativeBuildVersion` foi atualizado a 10 e já foi compilado. Source enviada para `staging/stormpt-x64`, commit `3c678b6`.
- O guest conferiu os hashes de base, patch, launcher, manifesto e assinatura. A assinatura foi validada antes e depois da troca. HTTP HEAD com Host `stormpt.hoststorm.cloud` retornou 200 para manifesto, assinatura, pacote base, patch e launcher, pelas rotas da porta privada 3825.
- Um GET real pela porta de staging baixou manifesto, assinatura, patch (8,7 MB) e launcher e comparou cada corpo aos hashes esperados; todos passaram. Os temporários de verificação foram removidos. Reproduzir com `work/release-x64-20261111/verify-staging-http-20261112.ps1`.
- O serviço temporário de transferência do NEXUS foi encerrado; não há listener local na porta 18784. Logs de acesso estão em `work/release-x64-20261111/staging-transfer-v2.log`. Rascunho gerado incorretamente durante a preparação foi removido depois de validar seus hashes e conteúdo.

## Limites registrados no checkpoint v10 (histórico; conferir validação v11 acima)

Isso é somente feed de staging isolado; a rota pública, site/admin, Oracle/relay, servidor público e produção x86 não foram alterados. Ainda não foi testada instalação limpa a partir do launcher, atualização iniciada por launcher antigo, execução do `Game.exe` novo nem login real no servidor x64. O feed legado e a atualização de launchers já distribuídos continuam pendentes; não prometer atualização automática para jogadores até validar o caminho de bootstrap.

Para retomar, confira a conectividade da VM SuperFrame e o binding de staging em 3825. Use o pacote base e o v10 assinados, mantendo as chaves privadas apenas no NEXUS. A fonte do launcher está no worktree `work/stormpt-launcher-staging`, branch `staging/stormpt-x64`, commit `3c678b6`. O manifesto é produzido por `work/release-x64-20261111/prepare-staging-feed-20261112.ps1`; transferência e ativação estão reproduzidas pelos scripts `download-staging-candidate-v2.ps1` e `activate-staging-feed-20261112.ps1`. Não reabrir nem buscar a VM Ziel.

Espelho operacional AEROCOOL Disk 3: `/mnt/disk3/StormPT-Operations/X64-Staging-20261112/`.

## Registro histórico anterior ao staging atual de 12/11/2026

Data do registro original: 11/11/2026 (horário local; 12/11 UTC).

### Estado inicial da chave — 11/11/2026 (histórico)

- Na verificação de 11/11, a chave privada anterior não foi encontrada nos diretórios operacionais acessíveis da VM Games AEROCOOL.
- Chave RSA-3072 nova gerada para staging, ID público `35194eb33fd86b739cb5419ee7d7fb88e5c80e1b8553e1f9b6d3e0a581579608`. A privada está cifrada por DPAPI `CurrentUser`, somente no NEXUS (`C:\Users\Administrator\Documents\StormPT-Secrets\ManifestSigner`) e numa cópia local idêntica no Disco E: (`E:\StormPT-Secrets\ManifestSigner`). ACL restrita ao Administrator. O autoteste de assinatura/validação passou.
- Launcher x86 recompilado, SHA-256 `8AB096528D66D7B45EA81F0BC7E14DE1A496C325F65B51449CA59B81E48D5271`. O verificador aceita a chave pública nova e a anterior. Commits de staging: `da47b87` (chave), `0a70414` (fallback), `4e239ae` (documentação).
- Em 11/11, o feed ainda não havia sido alterado e a transição de launchers existentes não estava validada. Esse estado foi substituído pela ativação privada de 12/11 descrita no início deste documento. Nenhum segredo foi enviado a GitHub, Drive ou AEROCOOL.

### Verificação anterior à ativação — 11/11/2026 (histórico)

- O launcher staging suporta assinaturas RSA feitas pela chave pública nova e pela chave pública anterior durante a migração. Build x86 compilado: SHA-256 `8AB096528D66D7B45EA81F0BC7E14DE1A496C325F65B51449CA59B81E48D5271`; compatibilidade em commit `0a70414`, documentação em `4e239ae`.
- A chave anterior não foi encontrada nos diretórios acessíveis da VM Games do AEROCOOL.
- Naquela data, o manifesto existente validava apenas com a chave anterior; essa observação precede e não descreve o manifesto novo assinado e instalado no staging em 12/11.
- A assinatura do feed legado no GitHub é válida, mas só autoriza um helper antigo de 33.280 bytes. Não confirmei uma atualização completa do launcher já instalado. Feed, site público, relay Oracle e produção permaneceram inalterados.
### Build candidata registrada em 11/11

- Recompilei a candidata x64 de produção em `E:\StormPT-x64-Production-Candidate-20261111`, explicitando `StormPTLaboratory=false`. A configuração anterior ativava o endereço do LAB por padrão quando a propriedade não era informada.
- O `Game.exe` resultante é AMD64, 8.748.544 bytes, SHA-256 `74782F10B7C9752E9BBCBFB41BD46C584E5C4BE3B3F38EDF5CCFA874BE84BBF4`. A inspeção estática encontrou o endereço público do Oracle `163.176.128.81`, não encontrou o endereço do LAB `100.99.136.79`, nem os marcadores da rotina antiga de consulta/conexão direta ao banco. A função dormente foi removida da cópia candidata e o original ficou em backup.
- Criei `StormPT-Client-x64-Candidato-20261112.zip`, 2.257.602.414 bytes, SHA-256 `E97C6601649D2CF1515C75D1FEFB888C09073E2F35DC52626DA2110713E80CEB`. Extraí `Game.exe` do ZIP e confirmei que o SHA-256 interno corresponde exatamente ao executável compilado. O ZIP anterior continua preservado.
- Atualizei `E:\StormPT\Game.exe` para essa mesma build. O executável anterior foi preservado em `E:\StormPT\backups\Game.exe.pre-production-ip-clean-20261112.bak`. Atualizei `client-x64-manifest.json`, que é apenas um registro local de staging; ele não é o manifesto assinado que o launcher aceita.
- Mantive intacto o snapshot de source de 11/11 e criei uma cópia sincronizada em `C:\StormPT-Source-Backup\StormPT-x64-Production-Candidate-20261112`, com as 1.507 entradas/42.265.558 bytes de Source e deps, manifesto de hashes e as mesmas duas correções da build. `winmain.cpp` SHA-256 `0ACF66C057919527919E93740B967E7A00319B48FC5C673FD53DC623F5E039E3`; `priston.vcxproj` SHA-256 `27D021AB403F90CA14551668DE5A83398503EBB5A6550CADF1C6FC2E0F372FB0`.
- Compilei o launcher Windows Forms como processo x86, 352.768 bytes, versão `1.2.0.0`, SHA-256 `8AB096528D66D7B45EA81F0BC7E14DE1A496C325F65B51449CA59B81E48D5271`. Ele continua apto a iniciar um `Game.exe` x64 e inclui instalação limpa e atualização do cliente. O teste de conexão usa TCP 1997. Nesta revisão, a verificação de manifesto aceita a chave pública nova e a anterior.
- O branch GitHub `staging/stormpt-x64` contém a fonte atualizada: commits de chave `da47b875e159cfbf908c304dae473b027263834b` e documentação `4d7a493`. Não inclui a chave privada.

### Endereços e roteamento no registro de 11/11

- O IP público do Oracle, `163.176.128.81`, permanece como endpoint dos clientes e do launcher. Não precisa ser trocado apenas porque o host de jogo mudou.
- O relay do Oracle ainda encaminha para o servidor x86 antigo no AEROCOOL (`100.99.136.79:1997`). Só depois do servidor x64 iniciar e passar login, entrada no mapa, salvamento e reconexão é que o destino interno do relay poderá ser trocado para a VM StormPT no SuperFrame (`100.101.156.69:1997`, LAN `192.168.30.208`). Essa alteração ainda não foi feita.
- `stormpt.hoststorm.cloud` continua servindo o domínio atual. A cópia IIS de staging no Windows Server do SuperFrame está isolada na porta 3825 e não recebeu a rota pública. O domínio administrativo ainda redireciona para o host antigo; a API administrativa não respondeu e o código/configuração e banco do painel não foram encontrados na VM, Drive ou repositório analisados.

### Pendências registradas em 11/11 — reavaliar com o checkpoint atual

- O Server33 x64 não está em execução e não escuta na porta 1997 da VM. O SQL Express contém bases de ensaio; os dados reais de produção não foram migrados. Não existe teste de login real com o `Game.exe` reconstruído.
- Em 11/11, o feed ainda não usava a chave nova. Em 12/11, o feed privado de staging foi atualizado e validado; consulte a seção inicial para hashes e verificações atuais. A migração de launchers antigos pelo feed legado continua sem validação ponta a ponta.
- A chave privada nova permanece em armazenamento DPAPI local no NEXUS; não foi enviada para nenhum servidor. A chave anterior não é necessária para o feed de staging atual.
- O Google Drive da pasta `X64-Candidato-20261111` ainda tem o launcher v9 antigo; não enviei um cliente ou manifesto que não possa ser verificado. O novo relatório e os dois documentos de retomada já foram espelhados no Drive, em `StormPT-x64-Staging-20261112`, e no Disco 3 do AEROCOOL.
- O site público e `/admin` ainda não foram movidos. Falta recuperar o código-fonte e a base do admin/API, configurar o serviço no host novo e verificar autenticação/autorização antes de alterar a rota.
- Busca no repositório `danilostorm/stormpt` e no Drive não encontrou arquivos/código do painel administrativo; a busca de código no branch atual também não retornou implementação de admin/API. Não foi criada uma substituição improvisada sem o contrato e a base reais.
- Produção x86 no AEROCOOL e o destino atual do relay continuam intactos. Nenhum corte público ocorreu.

### Plano histórico de retomada — não é autorização para mudança pública

1. Iniciar Server33 x64 na VM com os bancos reais restaurados e a configuração local do SQL conferida, mantendo firewall fechado para ingress público.
2. Validar o cliente x64 corrigido contra esse servidor em acesso controlado; confirmar login, mapa, save e reconexão.
3. Não acessar a VM Ziel. Validar instalação limpa e atualização iniciada por launcher antigo somente no staging privado antes de qualquer mudança pública.
4. O feed privado já foi atualizado em 12/11. A próxima validação é completar instalação limpa e atualização de cliente existente pelo launcher, somente no staging.
5. Recuperar/instalar o portal e admin/API na VM com o banco correto e só então revisar a rota pública do site.
6. Com janela de manutenção e checks aprovados, alterar somente o destino interno do relay Oracle para `100.101.156.69:1997`; manter o endpoint público `163.176.128.81` estável. Desativar o x86 apenas depois de validar o x64 e ter rollback disponível.

## Artefatos principais

- Source candidata: `E:\StormPT-x64-Production-Candidate-20261111\Source`
- Cliente instalado para staging: `E:\StormPT`
- Novo pacote completo: `E:\StormPT-x64-Production-Candidate-20261111\StormPT-Client-x64-Candidato-20261112.zip`
- Launcher fonte: `work\stormpt-launcher-staging\launcher\StormPTLauncher.cs`
- Snapshot original de source no host Windows StormPT: `C:\StormPT-Source-Backup\StormPT-x64-Production-Candidate-20261111`
- Source sincronizada para esta build: `C:\StormPT-Source-Backup\StormPT-x64-Production-Candidate-20261112`
- Relatório da instalação inicial da VM: `outputs/StormPT-SuperFrame-X64-Install-20261111.md`

