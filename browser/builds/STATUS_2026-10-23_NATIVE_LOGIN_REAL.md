# StormPT Web — login real no navegador, 23/10/2026

**Progresso global: 40% / 100% (antes: 32%).**
<progress value="40" max="100">40%</progress>

A estimativa é conservadora e ponderada por funcionalidades. O jogo ainda não é jogável: a conta de QA tem zero personagens, e seleção, entrada no mapa e movimento continuam pendentes.

## Entrega comprovada

Fluxo real, sem backend simulado:

1. Conta de QA criada pelo Conta.aspx existente e autenticada em uma sessão nova.
2. ASP.NET emite dois tickets curtos, com audiências e chaves separadas para gateway e GameServer, usando StormPTPlayer, StormPTCsrf, Origin e POST.
3. Browser abre WSS /game e envia envelope web explícito de 1040 bytes; não envia senha ao gateway, hash de Game.exe ou MAC inventado.
4. GameServer C++ valida HMAC, expiração, replay e conta piloto; a fila real consulta a mesma AccountDB, preservando os bloqueios da conta e a seleção por pertencimento.
5. O servidor retorna a lista original opcode 9, vazia para a conta nova de QA.
6. Chromium na URL pública passou o fluxo completo com zero erros JavaScript e sem interceptação/simulação de respostas.

Prévia: https://stormpt.hoststorm.com.br/jogar-beta/index.html (HTTP 200).
/jogar permanece HTTP 404.
A emissão de tickets está restrita à conta de QA configurada no servidor; outras contas ainda não estão liberadas para jogar pelo browser.

## Implementação e correções

- GameServer completo compilado em Win32/MSVC v143 a partir de uma cópia privada da source.
- Entrada web ligada à fila real de login, sem transformar ticket em senha e mantendo o caminho do cliente Windows.
- Versão/seleção web explícita, separada do checksum do executável Windows.
- Fila de login corrigida para usar sinalização por evento, evitando perda de wake-up no SuspendThread/ResumeThread.
- Consulta nativa usa conexão ODBC independente e não espera o mutex da DLL legada de billing.
- Corrigido o caminho do log de diagnóstico para o diretório StormPT atual; logs web não contêm tickets nem senhas.
- Descobertas tabelas ausentes BannedIP/BannedMac no SecurityDB restaurado. Nenhuma tabela equivalente foi encontrada nos 19 bancos. Criadas de forma aditiva, com índices, após backup com CHECKSUM e RESTORE VERIFYONLY. Dados existentes não foram substituídos.
- Handler ASP.NET implantado com segredos em arquivos fora do webroot e ACLs específicas, proxy confiável e whitelist da conta piloto.
- Gateway persistente stormpt-browser-gateway em Docker, bind apenas em 127.0.0.1:3903, com tickets vinculados a conta/sessão, limite de sessões e prazo passivo de autenticação.
- Proxy público ganhou apenas /BrowserTicket.ashx, /game e allowlist dos novos módulos estáticos.
- Tela existente ganhou carregamento real de personagens e tratamento da recusa de login pelo servidor.
- Corrigida ligação de fetch no cliente de tickets, problema encontrado no teste real de Chromium.
- Source canônica atualizada após os testes, em C:\StormPT-2703\Source\SrcServer\src. O código integral proprietário permanece privado.

## Validações

| Verificação | Resultado |
| --- | --- |
| Transporte Node | 54/54 aprovados |
| Frontend unitário | 17/17 aprovados |
| C++ criptográfico isolado | 22 verificações da etapa anterior |
| Compilação do GameServer completo | Sucesso, sem erros; avisos legados presentes |
| Cadastro e login reais no ASP.NET | Aprovados na conta de QA |
| Ticket ASP.NET → gateway → GameServer | Aprovado |
| Lista original de personagens | Opcode 9 real, zero personagens na conta nova |
| Chromium público HTTPS/WSS | Aprovado, zero erros JS, sem mocks |
| Assinatura adulterada no GameServer real | Rejeitada |
| Ticket válido após tentativa adulterada | Aceito |
| Reutilização do ticket no GameServer real | Rejeitada |
| Conta QA temporariamente bloqueada | Negada com opcode 65/WParam -3 |
| Estado da conta QA após o teste | BlockChk=0, DelChk=0, inuse=0 |
| Porta 1997 após implantação | Escutando |
| /jogar-beta/index.html | HTTP 200 |
| /jogar | HTTP 404 |

Evidências privadas: builds/real-native-login-result.json, builds/real-native-browser-result.json, builds/real-native-security-result.json, builds/real-native-blocked-account.json; client/qa/real-native-login-chromium.png; builds/transport-native-final.tap e builds/frontend-native-final.tap.

Não houve teste de jogo pelo cliente Windows real após a atualização, nem benchmark RX 550 nesta etapa. Os testes Node preservaram os layouts e o caminho de login legado; isso não substitui regressão com Game.exe.

## Implantação e backups

Backup principal na VM: C:\StormPT-2703\Backups\WebAuth-20261023-093733.
Inclui binário anterior, XML da tarefa de inicialização, DataServer, AccountDB.bak verificado, SecurityDB-before-web-compat.bak verificado, beta IIS anterior e arquivos anteriores da source.
Proxy anterior: /mnt/user/appdata/stormpt-web-bridge/default.conf.before-native-pilot-20261023-100702.
Backups de fontes JS e da beta estão em backups/native-wire-* e backups/beta-before-native-*.

SHA-256 do binário implantado: FA2681D49A1F639A46893BB81E9A3501AEC310EDB1C63F2EBC391857153CAB4F.
A tarefa StormPT-2703-Test mantém o usuário original e chama BrowserQA/run-web-server.cmd para fornecer apenas caminhos de chave e conta piloto. O binário usa o caminho original Servidor/Server33.exe, preservando as regras existentes do firewall.
Não foram abertas novas portas no Windows. O gateway TCP local não foi exposto diretamente.
StormPK não foi alterado.

## Próxima etapa concreta

1. Implementar criação/carregamento de um personagem legítimo com os valores iniciais e persistência do jogo original. Não clonar personagem de outra conta nem fabricar registro.
2. Receber seleção opcode 5 e registro opcode 4 reais, validar modelo, campo e coordenadas.
3. Carregar o mapa correto e controlar o personagem com movimento confirmado pelo GameServer.
4. Animações, colisão, NPCs, combate, inventário, chat, áudio e desempenho seguem pendentes.

Antes de ampliar a whitelist: concluir testes de pertencimento com lista não vazia, revogação/estado de sessão, política do IP real atrás do gateway, replay após reinício/rotação de chaves e regressão Windows. A consulta de IP desta etapa usa o peer TCP do gateway; o piloto não foi liberado para todas as contas.
