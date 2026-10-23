# StormPT Web

**Progresso global estimado: 46% / 100%. Piloto em desenvolvimento, ainda sem movimento jogável.**
<progress value="46" max="100">46%</progress>

0% ▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱ 100% — **46%**

A beta pública integra a conta ASP.NET existente ao GameServer C++ original. Chromium confirmou login, criação de Lutador nível 1, persistência após reconexão, lista real, seleção e registro real do personagem, sem mocks. O acesso nativo permanece limitado à conta de QA.

- [Beta de conta/personagens](https://stormpt.hoststorm.com.br/jogar-beta/index.html)
- [Relatório atual](builds/STATUS_2026-10-23_REAL_CHARACTER_RICARTEN.md)
- [Progresso e critérios](PROGRESS.json)

## Estado comprovado

Tickets de gateway e GameServer têm chaves/audiências separadas e vínculo à sessão ASP.NET. O GameServer decide autorização e persistência. O browser não fornece senha ao gateway, MAC inventado, checksum de Game.exe, atributos, itens ou posição de criação.

Dois personagens de QA persistem na base real. O perfil web aceita os pedidos implementados de login/criação/seleção; gravações arbitrárias de registros, exclusão e combate legado não estão habilitados. Criação inicial suporta somente Lutador. O fluxo Windows foi mantido separado, mas ainda exige regressão com Game.exe real.

Ricarten/campo 3 foi convertido de seus arquivos originais: 44226 triângulos e 261 texturas; uma textura referenciada não existe no cliente. Corpo/cabeça do Lutador usam pose base dos 64 ossos originais e o LOD alto do INX. Chromium WebGL2 privado renderizou uma captura real do registro na posição salva. Isso ainda não é uma sessão ativa de mundo nem movimentação. Animação/skinning em tempo real continuam pendentes.

## Verificação

    cd transport && npm test

61 testes de transporte; 17 testes unitários de frontend. Testes públicos de Chromium e testes negativos de criação/pertencimento rodam contra a infraestrutura real somente com a conta piloto configurada.

O código nativo completo foi compilado Win32 e testado na VM. Os utilitários públicos de ABI e integração dependem dos headers e do ambiente privado do StormPT.

## Próximo marco

Ligar a cena à sessão ativa e implementar movimento com velocidade, altura, terreno, colisões e confirmação pelo servidor, seguido de persistência e reconexão. Depois: animações, NPCs, monstros, combate, habilidades, inventário, chat, áudio e medição RX 550.

A rota /jogar permanece não publicada até existir personagem realmente controlável.

## Preservação

Backups antes de alterar serviços e dados; nenhuma conta/personagem existente apagado, nenhum acesso ao StormPK. Segredos, dados SQL, backups, binários, assets proprietários e a source C++ integral permanecem fora do GitHub público. Os arquivos publicados neste diretório são os módulos de integração, conversores próprios, testes e documentação.
