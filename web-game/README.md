# StormPT Web — protótipo técnico de Pillai

Este protótipo cria uma visualização **WebGL 2** da geometria original do mapa Pillai, a partir do próprio arquivo `SMD Stage data Ver 0.72` do cliente StormPT.

**Estado:** geometria 3D original funcionando em um visualizador WebGL. Não é um cliente do MMORPG; texturas originais, personagem, autenticação, rede, colisão e multiplayer permanecem pendentes.

## Desenvolvimento local

Requer Python 3.10+ e um navegador com WebGL 2 e `DecompressionStream('gzip')`.

1. Crie `private/` e copie ali o arquivo **de sua própria instalação licenciada**: `Field/forever-fall/pilai.smd` como `private/pilai.smd`.
2. Execute `python3 convert_map.py`.
3. Execute `python3 -m http.server 3898 --bind 127.0.0.1 --directory site`.
4. Abra `http://127.0.0.1:3898/`.

Comandos de uso: arrastar = orbitar; roda = zoom; WASD = mover foco; Q/E = altura.

O conversor usa o layout do cliente Win32 do StormPT: cabeçalho de 556 bytes, `smSTAGE3D` de 262260 bytes, estruturas `smSTAGE_VERTEX` e `smSTAGE_FACE` de 28 bytes. Valida assinatura, contagens e índices de vértices. O arquivo compactado no diretório site contém triângulos reindexados como `xyz float32 + rgba8`, stride de 16 bytes.

**Não publique recursos do jogo**: arquivos `.smd`, texturas, modelos, bancos de dados ou fontes proprietários. O repositório deve manter apenas o código do visualizador/conversor. O protótipo foi implantado inicialmente em host de laboratório, sem proxy público ou alterações ao serviço StormPT existente.

## Próximas etapas

- Reconstruir mapa com materiais, UV e texturas originais, respeitando o direito de distribuição.
- Carregar personagem com rig/animações e física básica.
- Mapear protocolo de jogo WinSock e criar ponte WSS ⇄ TCP segura, com autenticação no lado servidor.
- Validar login, personagem persistente, posicionamento e movimentação **em ambiente separado**.
- Adicionar HUD/inventário/missões/monstros/habilidades e ampliar as regiões.
