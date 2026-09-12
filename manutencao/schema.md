# Schema — Acervo Poético

> Só a forma atual dos dados. Para o porquê de cada escolha, ver `decisoes.md`. Para histórico de implementação, o próprio código é a fonte de verdade — nenhuma "arqueologia" fica registrada aqui de propósito.

## Poema / Prosa — campos compartilhados

Prosa tem paridade quase total com Poema desde que ganhou os mesmos campos (única diferença de escopo: alvo de Elos/Ecos de Prosa pode ser Poema **ou** Prosa; alvo de Elos/Ecos de Poema é só Poema).

### Intratextualidade — Elos / Ecos

O que acontece entre textos do próprio acervo (vínculo por id).

```json
"conceitos": {
  "elos": [{ "id": 123, "poemaId": 456, "relacao": "Reescrita", "direcao": "destino", "texto": "" }],
  "ecos": [{ "id": 789, "poemaId": 111, "tipo": "Personagem em comum", "texto": "" }]
}
```

- **Elos** (bilateral): `relacao` (`RELACOES_ELO` em `utils.js` — Reescrita, Continuidade, Tradução, Variação, Versão, Resposta, Díptico, Outro) + `direcao` (`origem` = texto mais antigo/base, `destino` = texto derivado/mais novo). Rótulo exibido é dinâmico via `rotuloElo()`, não mapa fixo de inverso.
- **Ecos** (sempre unidirecional, mais novo → mais antigo): só `tipo` (`TIPOS_ECO` em `utils.js` — Personagem em comum, Imagem central compartilhada, Aceno a, Outro), sem `direcao`. Chamado "Referências" antes da reorganização que criou o campo `referenciasExternas` abaixo, de mesmo rótulo mas conceito distinto.
- Alvo de Prosa pode ser Poema ou Prosa (`resolverItemVinculado`/`resolverTituloPoemaOuProsa` resolvem checando os dois arrays — ids nunca colidem, contador global único).
- Migração `conceitos.referencias` → `conceitos.ecos` é feita por `migrarReferenciasParaEcos` em `db.js`, idempotente, e roda antes de qualquer coisa tocar em `referenciasExternas`.

### Intertextualidade e Referências

Diálogo com algo externo ao acervo, sem vínculo por id — dois campos irmãos, mesma forma, tipo e texto livres com datalist de sugestões (a partir do que já foi digitado antes, filtrado pelo Tipo escolhido).

```json
"intertextualidade": [
  { "tipo": "Notícia", "texto": "", "link": "https://...", "linkTexto": "G1 Pernambuco", "nota": "" }
],
"referenciasExternas": [
  { "tipo": "Marco histórico", "texto": "", "link": "", "linkTexto": "", "nota": "" }
]
```

- **Intertextualidade**: obra/autoria identificável (`TIPOS_INTERTEXTO_SUGERIDOS` — Livro, Texto, Música, Filme, Série, Vídeo, Fotografia, Pintura, Peça de teatro, Citação, Conversa, Palestra, Mitologia, Conto de fadas, Outro).
- **Referências** (`referenciasExternas` — chave interna distinta da antiga `conceitos.referencias`, deliberadamente, pra não confundir sessão futura relendo o código): fato do mundo sem autoria de obra sendo ecoada (`TIPOS_REFERENCIA_EXTERNA_SUGERIDOS` — Marco histórico, Notícia, Pessoa pública, Astrologia, Outro). Pessoa pública e Astrologia migraram de Intertextualidade pra cá quando o campo nasceu.
- `link` e `nota` são opcionais nos dois. `linkTexto` é o rótulo opcional exibido no `<a>` no lugar da URL crua — sem ele, cai pra mostrar a própria URL (com `break-all` como rede de segurança em todo lugar que renderiza o link, pra URL longa quebrar linha em vez de estourar o layout).
- Exibição/exportação agrupam por tipo (`agruparIntertextualidadePorTipo` em `utils.js`, reaproveitada pelos dois campos): grupo vira linha com vírgula, ou sub-bullet se alguma entrada tiver link/nota/vírgula no texto.

### Pessoas / Autoria / Grupos (cadastros centrais)

```json
// db.pessoas
{ "id": 1, "nome": "Pedro", "grupoIds": [10] }
// db.grupos
{ "id": 10, "nome": "Família", "cor": "rose" }
// db.autores
{ "id": 1, "nome": "Victor Leme", "sobre": "" }
```

No item:

```json
"pessoas": [{ "pessoaId": 1, "papeis": ["Retratado(a)", "Dedicatário(a)"] }],
"autoria": [{ "autorId": 1, "papel": "Autor" }],
"gruposDiretos": [10]
```

- `pessoas`: array de `{pessoaId, papeis}` — `papeis` é array (0+ valores), não hierarquia fixa por item. `PAPEIS_PESSOA` (`utils.js`, única fonte de verdade, já na ordem de hierarquia — ver `decisoes.md`): Retratado(a), Inspiração para, Dedicatário(a), Mencionado(a), Aludido(a), Associado(a) retroativamente.
- `autoria`: single-role por texto (não acumulativo). `AUTORIA_PAPEIS = ['Autor', 'Coautor']`.
- `gruposDiretos`: array simples de `grupoId`, sem papel — grupo referenciado sem citar nenhuma Pessoa dele em particular. Badge na coluna Grupos aparece junto dos grupos-via-pessoa, sem o parêntese de pessoa.

### Épocas

```json
// db.epocas
{ "id": 123, "nome": "Corte de contato", "contextoRelacao": "Pedro e Victor", "notas": "" }
```

No item:

```json
"epocaRetratada": { "epocaId": 123, "inicio": {...}, "fim": {...}, "recorte": "momento", "na": false }
```

`recorte`: `"momento"` | `"repercussão"` | `null`.

### Envios / Reações

```json
"envios": [
  { "pessoa": "Dani", "data": {"dia":12,"mes":5,"ano":2023}, "meio": "WhatsApp", "reacao": "...", "notas": "" }
]
```

`pessoa` e `meio` são texto livre com autocomplete (sem vínculo por id).

### Reconhecimentos

```json
"reconhecimentos": [
  { "premio": "2º Concurso...", "posicao": "1º lugar", "ano": 2026, "texto": "" }
]
```

### Sinalizações (8 categorias, cada uma string por vírgula)

`sinalizacoesTradicao`, `sinalizacoesEstilo`, `sinalizacoesTema`, `sinalizacoesRelacao`, `sinalizacoesSensibilidade`, `sinalizacoesTom`, `sinalizacoesDominioImagetico` (vocabulário/imagética de um domínio de conhecimento que o texto usa como registro — ex.: Astrologia, Mitologia — diferente de Intertextualidade, que é diálogo com um artefato externo específico), `sinalizacoesOutros` (balde temporário pra tags sem categoria própria).

### Status

Valores: `incompleto`, `completo`, `publicado`, `migrado`, `descartado`, `privado`. `INFO_STATUS` (emoji + título) em `render-listas.js`/`exportar-md.js`:

- 🔒 `privado` — nunca teve intenção de publicação, sempre restrito a contexto pessoal/íntimo (diferente de `descartado`).

Status editorial (Inédito/Esgotado/Domínio público/Reeditado) existe só em `db.livros`/`db.coletaneas`, nunca em Poema/Prosa.

### Outros campos simples

- `idioma`: string (padrão `"pt-BR"`), datalist de sugestão (`IDIOMAS_SUGERIDOS` + o que já está salvo).
- `conteudoSensivel`: booleano, derivado (não é mais tag em Sinalizações).

## Livros / Coletâneas / Partes / Seções

Estrutura hierárquica padrão do acervo — sem mudança de schema registrada aqui além do Status editorial (ver acima).

## Aba "Conexões"

Visão computada pura (`render-conexoes.js`) — sem entidade própria, sem `db.relacoes[]`. Varre `db.poemas`/`db.prosas` na hora: Ecos como grafo direcionado (`montarGrafosEcos`, camadas por longest-path layering), Elos como grafo não-direcionado (pares/clusters via BFS), painel de "buracos" (vínculo com só um lado cadastrado). Referências (`referenciasExternas`), sem vínculo por id, não entram no grafo — só no bloco de texto livre (visualização/exportação).

## Aba "Sonoridade"

Ao contrário de Conexões, é entidade própria: `db.escansoes` (uma por poema — `getEscansaoDoPoema(poemaId)` em `db.js`, não é histórico de versões).

```json
// db.escansoes
{
    "id": 123,
    "poemaId": 456,
    "formaPoema": "Soneto Clássico",
    "regularidadeMetrica": "Isométrico",
    "tamanhoVerso": "Decassílabo (10)",
    "esquemaRimasPresenca": "Rimado",
    "esquemaRimasPadrao": "Alternada / Cruzada (ABAB)",
    "origemTradicao": "Medida Nova",
    "registro": "Culto / Erudito",
    "tom": "Épico / Solene",
    "escansaoLinhas": [],
    "rimas": []
}
```

- Os 7 campos de classificação (`formaPoema`, `regularidadeMetrica`, `tamanhoVerso`, `esquemaRimasPresenca`/`esquemaRimasPadrao`, `origemTradicao`, `registro`, `tom`) — opções fechadas em `FORMAS_POEMA`/`REGULARIDADES_METRICAS`/`TAMANHOS_VERSO`/`ESQUEMA_RIMAS_PRESENCA`/`ESQUEMA_RIMAS_PADRAO`/`ORIGENS_TRADICAO_SONORIDADE`/`REGISTROS_SONORIDADE`/`TONS_SONORIDADE` (`utils.js`). Esquema de Rimas é 2 campos irmãos (Presença + Padrão Estrutural), não um objeto aninhado, pro mesmo motivo de `tamanhoVerso` ser separado de `regularidadeMetrica` — facilita coluna dinâmica/busca. `registro` (formalidade da linguagem) e `tom` (atitude/disposição poética) eram um único campo (`tomRegistro`, 3 opções) — separados por serem eixos independentes; `migrarRegistroTomSonoridade` (`db.js`) migra dados antigos, mapeando o valor de `tomRegistro` pra `registro` (best-effort) e deixando `tom` vazio, já que não dá pra inferir tom com segurança a partir do campo composto antigo. Nenhum dos dois entra na Matriz de Validação em cascata (ver abaixo).
- `escansaoLinhas` — grade silábica, implementada (Bloco 2 passos 1-2, `js/editor-sonoridade.js`): uma entrada por linha do texto original do poema, `{ tipo: 'verso', numero, texto, tonicas? }` (texto já com `/` inserido pelo usuário marcando sílabas; `tonicas` é um array de índices de sílaba — base 0, contando a partir de `texto.split('/')` — marcados no Modo Sílaba Tônica, só existe depois do primeiro clique) ou `{ tipo: 'vazia' }` pra linha em branco/quebra de estrofe (sem número, mas ocupa uma linha na grade). Sílabas de um verso = `texto.split('/')`, com hífen ortográfico (ênclise/mesóclise, compostas) apagado de cada segmento — sem peso métrico, mesmo tratamento do espaço; um segmento que sobra vazio só de hífen (ex. `ze/-/me`) vira célula não-real, mesmo caminho de uma barra dupla (`//`). Construída a partir de `poema.texto` na primeira vez (`construirLinhasIniciais`, que também remove `**negrito**`/`_itálico_` — a escansão trabalha o conteúdo fonético, não a marcação), depois preservada como está no item. Editar a divisão silábica de um verso (mais/menos barras) descarta índices de `tonicas` que ficaram fora do novo total de sílabas. O toggle "Modo Sílaba Tônica" é estado de sessão do modal (`modoTonico` em `editor-sonoridade.js`), não salvo — sempre começa desligado ao abrir/trocar de poema.
- `rimas` — mapeamento de pares de rima, implementado (Bloco 2 passo 3 completo, `js/editor-sonoridade.js`): array de `{ id, a: { linha, silabas }, b: { linha, silabas }, acentuacao?, tonalidade?, riqueza? }`, onde `linha` é o índice 0-based em `escansaoLinhas` e `silabas` é um array de índices de sílaba (0-based, mesma base de `tonicas`) — mais de um índice cobre rima rica (mais de uma sílaba por lado). A letra do esquema (A, B, C...) nunca é salva — é sempre recalculada na hora de renderizar a partir dos pares (`calcularLetrasRima`, union-find por verso: versos transitivamente ligados por uma cadeia de pares, ex. 1↔2 e 2↔3, compartilham letra, cobrindo monorrima sem precisar de um conceito de "grupo" separado de par). Gesto de criação: clicar numa sílaba abre o lado A do par, shift-clique estende esse lado (rima rica), clicar em sílaba de outro verso abre o lado B (shift-clique estende do mesmo jeito); nada fecha o par sozinho — exige o botão "Confirmar par" (ou "Cancelar seleção"). Toggle "Modo Rima" é estado de sessão (`modoRima`/`selecaoRima` em `editor-sonoridade.js`), mutuamente exclusivo com Modo Sílaba Tônica — ligar um desliga o outro e descarta seleção de rima em curso. Estilização visual: cada sílaba de um par confirmado ganha contorno (`ring`, nunca background — spec pede explicitamente diferente do fundo da tônica) numa cor por LETRA do esquema, não por par (`PALETA_RIMA`/`corDaLetra`, 8 cores cíclicas, sem azul/roxo/âmbar — reservados pro destaque de seleção em curso e pro fundo da tônica); a coluna "Rima" no fim do verso usa a mesma cor no texto da letra. Seleção em curso tem prioridade visual sobre cor confirmada na mesma célula. Classificação por par (`acentuacao`/`tonalidade`/`riqueza`, opções fechadas em `ACENTUACOES_RIMA`/`TONALIDADES_RIMA`/`RIQUEZAS_RIMA`) e Posição (`Externa`/`Interna`, nunca salva — sempre derivada do par via `calcularPosicaoPar`, mesmo espírito da letra) ficam na seção "Pares de Rima" (`js/forms.js`/`js/editor-sonoridade.js`), lista de cartões abaixo da grade que também concentra remoção (com "Desfazer") e correção/reatribuição de lado.
- `FORMAS_POEMA` ganhou uma 9ª opção além das 8 da spec original: `Poesia Narrativa / Cordel` (entre `Poema em Redondilhas` e `Forma Livre / Indefinida`), a pedido do Victor — era só citada na spec (seção 5) como exceção do aviso de Monorrima Absoluta, sem existir de fato como valor selecionável. Ganhou uma linha PARCIAL na Matriz de Validação (ver abaixo) e uma opção nova em `ESQUEMA_RIMAS_PADRAO` pro padrão de rima mais comum do gênero.
- `ESQUEMA_RIMAS_PADRAO` ganhou `Sextilha Aberta (ABCBDB)` — o padrão de rima mais usado na sextilha de cordel (só os versos pares rimam entre si com o mesmo som; ímpares soltos/brancos dentro da estrofe), a variante "aberta" entre as 5 documentadas (aberta/fechada/solta/corrida/desencontrada). Não é exclusiva de cordel (repente/trova também usam) e não é a única estrofe do gênero (septilha e décima têm padrões próprios, ainda não modelados), por isso não vira trava — só mais uma opção disponível.
- `ESQUEMA_RIMAS_PADRAO` ganhou também `Décima Espinela (ABBAACCDDC)` — estrofe de 10 versos consagrada na tradição de décima/repente/trova/cordel (Vicente Espinel, séc. XVI). Mesmo tratamento da Sextilha Aberta: não é exclusiva de nenhuma forma/estrofe única do gênero, então não vira trava — só mais uma opção disponível.
- `FORMAS_POEMA`: a opção `Lira` foi renomeada pra `Lira Brasileira` (mesma posição na lista) — existem duas tradições distintas chamadas "lira" (a hispano-italiana, heptassílabo+hendecassílabo 7+11, e a ensinada no Brasil, hexassílabo+decassílabo 6+10). Decisão do Victor foi manter uma forma só (não criar a variante 7+11 como opção separada, já que o resto de `FORMAS_POEMA` também não cobre toda variante regional de cada forma), mas deixar explícito no nome que é a variante local. Ver `decisoes.md` pro raciocínio completo.
- `FORMAS_POEMA`: `Poema em Redondilhas` foi removida — não é forma fixa (não define nº de versos/estrofes/rima), é só o nome do VERSO de 5 ou 7 sílabas, já coberto por `tamanhoVerso` (`Redondilha Menor/Maior`), campo independente de `formaPoema`. Sem efeito colateral (sem lógica presa a esse valor, sem uso no acervo). Ver `decisoes.md`.
- `FORMAS_POEMA`: `Quadra / Trova` foi separada em `Trova` e `Quadra Popular` — mesmo nome cobrindo duas tradições com regras diferentes (Trova é rígida: sempre 1 estrofe de 7 sílabas, sempre rimada; Quadra é solta: qualquer nº de sílabas, não precisa ser monostrófica). Ver `decisoes.md`.
- `ESQUEMA_RIMAS_PADRAO` ganhou também `Limerick (AABBA)` e `Quadra / Rima Simples (ABCB)` — padrões nomeados sem equivalente genérico já existente no catálogo (mesmo espírito de Sextilha Aberta/Décima Espinela). O nome do segundo já nasce como "Quadra" (não "Trova") porque decisão do Victor foi tratar `ABCB` como só Quadra, não Trova válida — ver linha da matriz abaixo.
- Matriz de validação/trava em cascata (Bloco 3) — implementada em `calcularOpcoesCascataSonoridade` (`utils.js`), chamada por `aplicarCascataSonoridade` (`forms.js`) a cada troca de `formaPoema`/`regularidadeMetrica`/`esquemaRimasPresenca`. "Trava" nunca autopreenche nem desabilita — sempre FILTRA a lista de opções do select correspondente, que continua editável entre elas (decisão do Victor). `MATRIZ_VALIDACAO_SONORIDADE` (`utils.js`) cobre `Soneto Clássico`, `Haikai`, `Tanka`, `Lira Brasileira`, `Limerick`, `Trova` e (parcialmente) `Poesia Narrativa / Cordel`. `Limerick` trava `regularidadeMetrica` (`Heterométrico`), `tamanhoVerso` (`Redondilha Menor/Pentassílabo (5)`, `Hexassílabo (6)`, `Octossílabo (8)`, `Eneassílabo (9)`), `esquemaRimasPresenca` (exige rima) e `origemTradicao` (`Tradição Importada`). `Trova` trava `regularidadeMetrica` (`Isométrico`), `tamanhoVerso` (`Redondilha Maior/Heptassílabo (7)`), `esquemaRimasPresenca` (exige rima), `esquemaRimasPadrao` (`Alternada/Cruzada (ABAB)`, `Oposta/Interpolada (ABBA)` — não inclui `ABCB`, tratado como só Quadra) e `origemTradicao` (`Medida Velha`). `Quadra Popular` fica de fora por ora — decisão definitiva, não pendência: aceita qualquer nº de sílabas e não precisa ser monostrófica, nada universal o bastante pra travar (ver `decisoes.md`). `Poesia Narrativa / Cordel` trava `regularidadeMetrica` (`Isométrico`), `tamanhoVerso` (`Redondilha Maior / Heptassílabo (7)`), `esquemaRimasPresenca` (`Rimado`) e `origemTradicao` (`Medida Velha`) — os eixos praticamente universais no gênero —, mas deixa `esquemaRimasPadrao` de propósito sem trava, porque "Cordel" abriga várias estrofes (sextilha, septilha, décima) com padrões de rima diferentes entre si; essa ausência de trava nesse eixo é definitiva, não uma decisão pendente. Caso composto "Forma Livre + Versos Livres" (só entra com as duas condições juntas) é uma matriz separada (`MATRIZ_FORMA_LIVRE_VERSOS_LIVRES`, interna a `utils.js`). Três regras adicionais da spec (seção 5) também implementadas: (1) escolher Presença = `Sem Rimas / Livre` com métrica regular por trás corrige pra `Versos Brancos` (`corrigirPresencaRimaSeVersoBranco`), e quando Presença é `Sem Rimas`/`Versos Brancos` o Padrão fica só `Não Aplicável`, dentro da própria função de cascata; (2) tamanho do verso em 5/7 sílabas sugere (nunca sobrescreve) `Medida Velha`, 10/12 sugere `Medida Nova` (`sugerirOrigemTradicaoPorTamanho`, só aplicada se Origem/Tradição ainda estiver vazio); (3) dois avisos não-bloqueantes no submit (`mostrarAviso`, nunca impedem salvar): monorrima absoluta atípica pra forma fixa (`avisoMonorrimaAtipica`, via `FORMAS_SEM_AVISO_MONORRIMA` — formas mapeadas com trava de `esquemaRimasPadrao` já bloqueiam a opção de verdade, então não precisam entrar na lista; `Forma Livre` e `Quadra Popular` nunca acionam por não serem rígidas, e `Poesia Narrativa / Cordel` nunca aciona pelo motivo oposto — nela monorrima é a norma, conforme a própria exceção da spec) e divergência entre sílabas escandidas na grade e `tamanhoVerso` selecionado, só quando `regularidadeMetrica === 'Isométrico'` (`calcularDivergenciaSilabas`, `editor-sonoridade.js`). `registro`/`tom` continuam de fora da cascata (ver acima).
- Tabela da aba usa `DEFINICAO_COLUNAS.sonoridade` (`colunas.js`) pro seletor de colunas — mesmo mecanismo de Poemas/Prosas, mas SEM o cabeçalho ordenável/paginação/seleção em massa deles (`celulas-tabela.js` é hoje específico de `poemas`/`prosas` nesse ponto).
