# StormPT — chave de assinatura do manifesto — staging

## Estado atual — assinatura aceita pelo launcher v11, 12/11/2026

O primeiro manifesto de 12/11 usava assinatura Base64 de 512 bytes. A implementação v10 do launcher verificava somente os bytes RSA raw, então a validação de feed atribuída ao v10 estava incorreta: essa cadeia ainda não havia passado. A fonte agora tenta tanto a representação raw quanto a Base64 decodificada.

O feed privado ativo foi atualizado para assinatura raw de 384 bytes e manifesto v11. Os verificadores v10 e v11 aceitaram a assinatura, e o v10 de teste completou autoatualização para v11. Hashes atuais, backup, instalações testadas e limites estão documentados em outputs/StormPT-X64-Launcher-Site-Staging-20261112.md. A chave privada continua DPAPI no NEXUS; nenhum segredo foi enviado ao feed ou ao repositório.

## Registro anterior ao teste da v11 — 12/11/2026 (histórico)

As afirmações abaixo descrevem o estado anterior à correção do formato. Consulte o estado v11 no topo para os hashes e a validação atuais.

O usuário informou que a chave nova já existe e pediu para esquecer a VM Ziel. Não fazer outra busca nem sondagem nessa VM. A RSA-3072 de staging já gerada continua sendo a chave atual; ID público `35194eb33fd86b739cb5419ee7d7fb88e5c80e1b8553e1f9b6d3e0a581579608`. A chave privada permanece DPAPI `CurrentUser` no NEXUS, com cópia cifrada local em C: e E:; ela não foi copiada ao SuperFrame, GitHub, Drive ou AEROCOOL.

O feed privado de staging foi atualizado em 12/11. O manifesto novo e assinatura validam com a chave atual, os cinco artefatos requeridos foram conferidos no guest e as rotas privadas responderam 200. Detalhes/hashes e limitações em `outputs/StormPT-X64-Launcher-Site-Staging-20261112.md`. A atualização dos launchers já distribuídos através do feed legado segue sem validação; produção e domínio público continuam intocados.

Data: 11/11/2026 (horário local)

## Resultado histórico de 11/11 (antes do staging de 12/11)

- A busca estática nos diretórios operacionais acessíveis da VM Games AEROCOOL não encontrou chave privada de assinatura do manifesto. A VM Games do Ziel está ligada, mas o QEMU Guest Agent não responde; portanto o disco dela não pôde ser pesquisado e não afirmo que a chave antiga esteja ausente lá.
- Como a chave antiga não estava disponível no ambiente acessível, gerei uma nova chave RSA de 3072 bits para o staging do launcher x64. ID público: `35194eb33fd86b739cb5419ee7d7fb88e5c80e1b8553e1f9b6d3e0a581579608`.
- A chave privada foi gravada cifrada com Windows DPAPI (`CurrentUser`) e ACL restrita ao Administrator do NEXUS em `C:\Users\Administrator\Documents\StormPT-Secrets\ManifestSigner\manifest-signing-private.dpapi`. Uma segunda cópia cifrada, com hash idêntico, está em `E:\StormPT-Secrets\ManifestSigner\manifest-signing-private.dpapi`; ambas têm cópia do script de assinatura e chave pública.
- O script `Sign-StormPTManifest.ps1` assina SHA-256 e confere a assinatura antes de retornar. A verificação local anterior produziu `SELF_CHECK=verified`. As duas cópias do blob cifrado e da chave pública foram comparadas por SHA-256; as ACLs de ambas as pastas permitem acesso somente ao Administrator.
- Atualizei e compilei o launcher de staging. Build x86 concluída com o aviso CS0649 já existente; `launcher.exe` SHA-256 `8AB096528D66D7B45EA81F0BC7E14DE1A496C325F65B51449CA59B81E48D5271`. A rotina do launcher aceita a chave nova e a chave pública anterior; commits `da47b87` e `0a70414` em `staging/stormpt-x64`. A assinatura do manifesto de staging atual verifica com a chave anterior e não com a nova, como esperado nesta fase.

## Estado anterior ao staging de 12/11

O manifesto e a assinatura do feed não foram trocados. O launcher atualizado verifica com a chave nova e a anterior. O feed IIS de staging respondeu 200 em `100.101.156.69:3825` com Host `stormpt.hoststorm.cloud`; seu manifesto atual valida com a chave anterior e não com a nova, como esperado. O domínio público `/client-files/manifest.json` respondeu 404. O feed legado também tem assinatura válida, mas aponta para um helper antigo de 33.280 bytes; uma atualização completa de cliente já distribuído ainda não foi verificada. O branch e o build atual são somente staging.

Não copiei a chave privada para GitHub, Google Drive, AEROCOOL, Ziel ou SuperFrame. Também não alterei produção, Oracle relay, feed público ou endpoint do jogo.

## Recuperação e limitação

O blob DPAPI pode ser usado apenas no NEXUS com o mesmo perfil Windows que o protegeu. A cópia em E: é redundância local, não recuperação após perda do PC/perfil. Para recuperação fora desse perfil será necessário importar uma cópia de recuperação com senha em um cofre controlado pelo usuário; ela não foi criada para evitar uma senha improvisada ou a exposição da chave.

## Próximos passos históricos — substituídos em 12/11

1. Não buscar nem acessar a VM Ziel. A chave de staging atual já foi gerada e usada; ver o checkpoint de 12/11 em `STORMPT-RETOMADA.md`.
2. Validar a cadeia de atualização para launchers antigos somente em staging; ainda não houve prova ponta a ponta.
3. Manter o feed privado de staging até completar validação de instalação limpa, atualização de cliente e abertura do jogo.
4. Continuar a validação do servidor x64 isolado. Server33 x64 permanece parado e não houve login real do candidato x64.

## Arquivos locais

- Segredos protegidos (não versionar): `C:\Users\Administrator\Documents\StormPT-Secrets\ManifestSigner\` e `E:\StormPT-Secrets\ManifestSigner\`.
- Fonte/build staging: `work\stormpt-launcher-staging\launcher\`.
- Relatório e retomada geral: `STORMPT-RETOMADA.md` e `STORMPT-PRODUCAO-X64-RETOMADA.md`.
