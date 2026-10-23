# StormPT Web — piloto de autenticação real

**23/10/2026: 40% de conclusão estimada.** O browser já autentica no GameServer real; criação/seleção de personagem e movimento ainda não estão concluídos.

O fluxo público foi validado em Chromium: Conta.aspx real → tickets ASP.NET → WSS → GameServer C++ → lista original de personagens. A conta nova de QA retorna zero personagens. O teste não usa respostas simuladas.

- Prévia: https://stormpt.hoststorm.com.br/jogar-beta/index.html
- Relatório: [login real e validações](builds/STATUS_2026-10-23_NATIVE_LOGIN_REAL.md)
- Progresso: [PROGRESS.json](PROGRESS.json)
- A emissão de tickets permanece restrita à conta piloto; /jogar ainda não foi publicado.

## Código incluído

Transporte WebSocket/TCP e testes, protocolo web explícito, frontend de conta/sessão, handler ASP.NET, verificador Win32 BCrypt e adaptador nativo. As alterações integrais na source proprietária do GameServer estão preservadas na VM do projeto e não são redistribuídas aqui. Não há assets comerciais, bancos, credenciais ou chaves privadas.

O GameServer foi compilado e implantado no caminho original após backup verificado. A fila de login agora usa eventos para evitar perda de sinal; o caminho web usa a mesma AccountDB e políticas de conta. Tabelas ausentes de bloqueio foram criadas de forma aditiva após backup do SecurityDB.

## Testes reproduzíveis do transporte

    cd browser/transport
    npm ci
    npm test

Resultado na infraestrutura do projeto: **54/54** testes do transporte, **17/17** unitários do frontend e **22** verificações criptográficas Win32 da etapa anterior. Chromium público passou sem mocks e sem erros JavaScript.

O GameServer real rejeitou assinatura adulterada, replay e conta QA bloqueada (opcode 65, WParam -3). O estado original da conta de teste foi restaurado.

Os scripts de testes reais dependem do ambiente autorizado e de arquivos privados sob secrets/, que não estão neste repositório. Não use as chaves sintéticas dos testes em produção.
A entrada native-entry.mjs usa módulos de source. Na implantação IIS, os imports são convertidos para arquivos .js da allowlist; account-screen.mjs é publicado como account-client.js.

## Limites do piloto

Não há personagem real no mapa ou movimento comprovado. Rig/animação, colisão, NPCs, combate, inventário, chat, áudio e benchmark RX 550 continuam pendentes. O cliente Windows real ainda precisa de regressão após a atualização.

Antes de ampliar a whitelist: validar personagens não vazios e pertencimento, revogação, IP original atrás do gateway e replay após reinício/rotação de chaves. O cache de replay atual vive na memória do processo.
