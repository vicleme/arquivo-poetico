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
{ "id": 1, "nome": "Victor Leme", "sobre": "", "souEu": true, "nomesLiterarios": [] }
```

No item:

```json
"pessoas": [{ "pessoaId": 1, "papeis": ["Retratado(a)", "Dedicatário(a)"] }],
"autoria": [{ "autorId": 1, "papel": "Autor", "assinatura": "Ortônimo", "nomeLiterario": "" }],
"gruposDiretos": [10]
```

- `pessoas`: array de `{pessoaId, papeis}` — `papeis` é array (0+ valores), não hierarquia fixa por item. `PAPEIS_PESSOA` (`utils.js`, única fonte de verdade, já na ordem de hierarquia — ver `decisoes.md`): Retratado(a), Inspiração para, Dedicatário(a), Mencionado(a), Aludido(a), Associado(a) retroativamente.
- `autoria`: single-role por texto (não acumulativo). `AUTORIA_PAPEIS = ['Autor', 'Coautor']`. Cada vínculo carrega também `assinatura` (`ASSINATURAS_AUTORIA = ['Ortônimo', 'Heterônimo', 'Pseudônimo']`, `utils.js`, padrão `'Ortônimo'`) e, quando a Assinatura não é Ortônimo, `nomeLiterario` — qual nome literário do Autor foi usado NESTE texto. Substituem o antigo campo único `pseudonimos`/`pseudonimo`, que misturava dois conceitos distintos: Heterônimo é identidade literária com voz/biografia próprias por trás (ex.: Fernando Pessoa → Álvaro de Campos, Ricardo Reis, Alberto Caeiro); Pseudônimo é só um nome diferente de assinatura, sem identidade própria — distinção do Victor, não universal na crítica literária, mas separa os dois casos que a spec original conflava.
- `nomesLiterarios` (Autor, array de `{nome, tipo}`, `tipo` ∈ `TIPOS_NOME_LITERARIO = ['Heterônimo', 'Pseudônimo']`, `utils.js`): cadastro central dos nomes literários daquele Autor, cadastrados no modal do Autor (`criarGrupoDeNomesLiterariosAutor` em `editor.js`, chip com tipo por item, mesma engine de Gênero estendida). `autoria[].nomeLiterario` só é oferecido no select se estiver nessa lista COM o `tipo` batendo com a Assinatura escolhida pro texto (`alterarNomeLiterarioAutoria`/`criarGrupoDeAutoria`, `editor.js`); trocar a Assinatura limpa o nome literário já escolhido (`alterarAssinaturaAutoria`). O vínculo (`autorId`) nunca muda: a Assinatura só troca o nome exibido/exportado daquele texto (`nomeAutoriaExibido`, `utils.js`) — Domínio público, "sou eu" e agregações por Autor continuam resolvendo pelo cadastro central, então um único Autor (Fernando Pessoa) concentra as estatísticas de todos os heterônimos/pseudônimos dele. `paresAutoria` (`utils.js`) normaliza `assinatura`/`nomeLiterario` ausentes (dado ainda não migrado) pra `'Ortônimo'`/`''` na leitura — sem migração de dados de verdade: nenhum Autor do acervo tinha `pseudonimos` cadastrado antes dessa troca (confirmado com o Victor), então não há nome antigo pra recuperar.
- `souEu` (Autor, opcional, boolean): marca o autor como a própria pessoa dona do acervo. Ao adicionar esse autor a um texto com Fonte vazia, o formulário preenche a Fonte com `Obra própria` (`FONTE_OBRA_PROPRIA`). Só na adição manual do chip: reabrir um texto não mexe na Fonte. Não é importado pela Importação Aditiva nem por pacotes da Biblioteca ("sou eu" é do acervo de quem usa, não de quem exporta).
- Dados demográficos do Autor, todos opcionais (`modal-autor.html`, constantes em `utils.js`): `sexo` (`SEXOS_AUTOR = ['Feminino', 'Masculino', 'Intersexo']`, lista fechada — Intersexo entra aqui, não em Gênero, por ser característica física, não identidade), `genero` (texto livre + sugestão `GENEROS_SUGERIDOS`, mesmo raciocínio de `IDIOMAS_SUGERIDOS` — lista real sem teto fechado), `orientacaoSexual` (texto livre + sugestão `ORIENTACOES_SUGERIDAS`, Gay/Lésbica como sugestões separadas de um "Homossexual" genérico), `identidadeCisTrans` (`IDENTIDADES_CIS_TRANS = ['Cisgênero', 'Transgênero', 'Não se aplica']`, lista fechada, campo PRÓPRIO — não basta escrever "Mulher trans" no Gênero: a maioria das pessoas trans se descreve simplesmente como "mulher"/"homem", documentar que alguém é trans normalmente vem de pesquisa biográfica à parte, não de como a pessoa se rotula; ver `decisoes.md`), `corRaca` (`CORES_RACA_AUTOR`, lista fechada nos moldes do IBGE — Branca/Preta/Parda/Amarela/Indígena) e `ocupacoes` (string separada por vírgula, mesmo formato de `genero` da Prosa — o quê mais o Autor trabalhava além de escrever, `criarGrupoDeTags` em `editor.js`). Nenhuma das listas fechadas tem opção "Não informado" própria — o campo vazio já é esse estado (mesmo padrão de Grafia); vazio em `identidadeCisTrans` significa "não documentado", não "confirmadamente Cisgênero". `idadeAutor`/`signoDoZodiaco` (`utils.js`) são DERIVADOS de `nascimento`/`obito`, nunca gravados — mesmo espírito de `calcularAnoDominioPublico`: idade para de contar no Óbito pra quem já faleceu (não continua até hoje), fica aproximada (`aproximada: true`) se faltar dia/mês de qualquer um dos lados; signo sempre precisa de dia+mês, sem aproximação possível (`null` se faltar). `grupoSexualGenero` (`utils.js`) é a classificação agregada Cis-heteronormativo/Queer/Não informado, também DERIVADA (de `sexo`+`genero`+`orientacaoSexual`+`identidadeCisTrans`, nunca um campo próprio) — pensada pras Estatísticas; `sexo`/`genero`/`orientacaoSexual` vazios cai em `'nao-informado'` (nunca presume maioria por dado ausente), mas `identidadeCisTrans` vazio NÃO força isso — só "Transgênero"/"Não se aplica" força `'queer'`; vazio ou "Cisgênero" segue a regra normal de comparar Sexo/Gênero (cis é o padrão não-marcado, raramente documentado à toa).
- Dados sociais do Autor, todos opcionais (`modal-autor.html`, constantes em `utils.js`): `religiao` (texto livre + sugestão `RELIGIOES_SUGERIDAS`, somada ao que já está no acervo — sincretismo é comum, então não é lista fechada), `classeSocial` (`CLASSES_SOCIAIS_AUTOR = ['Escravizado/liberto', 'Livre pobre', 'Artesão/classe média urbana', 'Elite/proprietário de terras']`, lista fechada, sem "Não informado" própria — mesmo padrão de `corRaca`), `neurodivergencias` (string separada por vírgula, `criarGrupoDeTags`, mesmo formato de `ocupacoes`), `condicoesClinicas` (array de `{nome, tipo}`, `tipo` ∈ `DIMENSOES_CONDICAO_CLINICA = ['Física', 'Mental']`, padrão Física — `criarGrupoDeTagsComTipo` em `editor.js`, a mesma fábrica de `nomesLiterarios`; formato legado string "a, b" é aceito ao carregar), `grauAcademico` (`GRAUS_ACADEMICOS_AUTOR`, lista fechada de 9 níveis, de "Sem escolarização formal" a "Pós-doutorado" — mesmo padrão de `corRaca`; valor fora da lista, de quando o campo era texto livre, é preservado ao editar) e `instituicoes` (string separada por vírgula, lista de tags; sugestão vem só do que já foi cadastrado no acervo, `extrairInstituicoesUnicas`). `deficiencias` (array de `{nome, tipo}`, `tipo` ∈ `TIPOS_DEFICIENCIA = ['Física', 'Auditiva', 'Visual', 'Intelectual', 'Mental/psicossocial', 'Múltipla']`, padrão Física — mesma fábrica `criarGrupoDeTagsComTipo`; o `nome` é a deficiência específica, ex. "Cegueira", e o `tipo` a categoria ampla). Neurodivergência, `condicoesClinicas` e `deficiencias` são três campos separados de propósito (variação neurológica / diagnóstico clínico / deficiência); ver `decisoes.md`.
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

### Autoavaliação / Autoclassificação

`autoavaliacao`: string livre (opiniões sobre o texto). `autoclassificacao`: número de 0,5 a 5, passo 0,5 — "quantos corações" a pessoa dá pro próprio texto, campo puramente afetivo/qualitativo, sem pretensão de nota técnica. `0` (ou ausente) é o valor especial "não avaliado", nunca uma nota — a nota mínima de verdade já é 0,5. `autoclassificacaoValida`/`formatarAutoclassificacaoTexto`/`renderCoracoesHtml` (`utils.js`) centralizam validação/formatação ("3,5 corações")/renderização (compartilhada entre o widget clicável do modal e as exibições somente-leitura da tabela e da Visualização). Exportação (`.md`/docx/pdf, que reaproveitam `blocoTexto`) é só texto — "3,5 corações" — sem o emoji de coração, pra não depender de suporte a emoji na geração do PDF.

### Sinalizações (8 categorias, cada uma string por vírgula)

`sinalizacoesTradicao`, `sinalizacoesEstilo`, `sinalizacoesTema`, `sinalizacoesRelacao`, `sinalizacoesSensibilidade`, `sinalizacoesTom`, `sinalizacoesDominioImagetico` (vocabulário/imagética de um domínio de conhecimento que o texto usa como registro — ex.: Astrologia, Mitologia — diferente de Intertextualidade, que é diálogo com um artefato externo específico), `sinalizacoesOutros` (balde temporário pra tags sem categoria própria).

### Status

Valores: `incompleto`, `completo`, `publicado`, `migrado`, `descartado`, `privado`. `INFO_STATUS` (emoji + título) em `render-listas.js`/`exportar-md.js`:

- 🔒 `privado` — nunca teve intenção de publicação, sempre restrito a contexto pessoal/íntimo (diferente de `descartado`).

Status editorial (Inédito/Esgotado/Domínio público/Reeditado) existe só em `db.livros`/`db.coletaneas`, nunca em Poema/Prosa.

### Fonte do texto (`fonteTexto`)

```json
"fonteTexto": { "origem": "Wikisource", "edicao": "Eu e Outras Poesias, 1920", "link": "https://...", "conferido": false, "grafia": "" }
```

- Poema e Prosa. `null` quando tudo vazio, `conferido` desmarcado e `grafia` nunca definida (`''` — ver abaixo; texto próprio). Grupo "Fonte" nos modais (`p-fonte-*`/`pr-fonte-*`), `lerFonteTexto`/`preencherFonteTexto` em `forms.js`. Coluna opcional "Fonte" na tabela de Poemas/Prosas (`DEFINICAO_COLUNAS`, `colunas.js`, chave `fonte`, `default: false`) mostra `origem`, virando link clicável quando `link` estiver preenchido, com `edicao` (se houver) entre parênteses (`celulaFonte`, `celulas-tabela.js`); sem `origem`, célula "—".
- `conferido`: o texto foi comparado com a edição de origem. Fica aqui, não em Sinalizações — é confiabilidade da transcrição, não classificação do conteúdo. Pacotes da Biblioteca nascem com `false`.
- `grafia`: três estados, não dois — `''` (**nunca definida**, campo nunca tocado), `GRAFIA_ATUAL` (`'atual'`, "Atual (padrão)" **escolhida de propósito**) ou uma tradição de grafia antiga nomeada — `GRAFIA_ETIMOLOGICA` (`'etimológica'`) ou `GRAFIA_QUINHENTISTA` (`'quinhentista'`), `utils.js`. A distinção entre os dois primeiros existe porque `''` é o valor de fábrica do `<select>` — indistinguível de "nunca abri esse campo" a nível de DOM — então só um valor não-vazio (`GRAFIA_ATUAL` pra cima) conta como decisão de verdade em `lerFonteTexto`/`definirSubcampoFonte` (`campos-preenchiveis.js`) pra decidir se `fonteTexto` inteiro vira `null`. `ehGrafiaAntiga(grafia)` (`utils.js`) resolve "nem vazio nem Atual" sem listar as tradições por nome, pra novas tradições futuras também acionarem automaticamente o aviso da Sonoridade. Existe porque tem um consumidor real: a Sonoridade divide sílabas por regras atuais, e em grafia antiga ("crystalinas", "thuribulos", ou o português quinhentista de Camões) a contagem e a tônica saem erradas em silêncio — o modal de Sonoridade mostra um aviso (`son-grafia-aviso`, `atualizarAvisoGrafiaSonoridade` em `forms.js`, usa `ehGrafiaAntiga`) quando o poema selecionado tem grafia antiga marcada — não dispara pra "Atual" nem pra "nunca definida". Nome antigo do primeiro valor antigo era `'anterior à reforma'` — renomeado porque "a reforma" no singular escondia que houve mais de uma (1911 PT, 1943 BR, 1971 BR, 1990 Acordo Ortográfico); só a fronteira de 1911/1943 (etimológica → simplificada) muda que letras contam como vogal/dígrafo, que é o que motivou o campo. **Não conta** em "Campos Preenchidos" (não entra em `verificacoesDeCampos`, `exportar-md.js`) e não tem Estatísticas, como o resto do grupo Fonte. Editável em massa via `CAMPOS_PREENCHIVEIS` (chave `fonteGrafia`, tipo `'opcoes'` — ver abaixo). Tem coluna opcional na tabela de Poemas/Prosas (`DEFINICAO_COLUNAS`, `colunas.js`, chave `grafia`, `default: false`) — rótulo curto (ex. "Etimológica", "Atual") com a descrição completa de `OPCOES_GRAFIA` no `title`; só "nunca definida" mostra "—" (`celulaGrafia`, `celulas-tabela.js`). Busca `grafia:` (`_buscaGrafia`, `render-listas.js`) também distingue: `grafia:atual` só bate em textos com "Atual" marcada de propósito, não em todo o acervo nunca tocado.
- Texto do próprio acervo: o Victor preenche `origem` com `Obra própria` (`FONTE_OBRA_PROPRIA`, `utils.js`) — é o que liga o campo na coluna "Campos Preenchidos", onde Fonte conta como UM campo (origem ou edição preenchida). Pra obra própria, "Texto conferido" não aparece na Visualização/`.md` (`ehObraPropria`). Autocompletar de origem/edição: `extrairFontesUnicas` + `atualizarDatalistFonte` (`editor.js`), origem com semente (Obra própria, Wikisource, Portal Domínio Público, Projeto Gutenberg, Biblioteca Nacional Digital).
- **Domínio público não é campo**: `linhasFonteTexto` (`utils.js`) o deriva do `obito` do Autor vinculado em `autoria` (óbito + 71 anos, Lei 9.610/98 art. 41). Só aparece pra Autor com óbito cadastrado. Visualização e `.md` mostram Fonte/Edição/Link/Grafia (só se marcada)/Texto conferido/Domínio público junto da linha de Autoria.
- Pacote da Biblioteca (`biblioteca/<id>.json`): formato da Exportação Geral + `pacote` (`id`, `titulo`, `descricao`, `fonte`, `edicao`, `link`, `ortografia`, `conferido`) + `autores` (`id`, `nome`, `nacionalidade`, `nascimento`, `obito`). Gerado por `scripts/montar-pacote.js`. `pacote.ortografia` continua texto livre pra leitura humana na aba Biblioteca (`ui-biblioteca.js`); `montarItem`/`montarItemDeSelecao` (`pacote-texto.js`) o convertem pro enum de `fonteTexto.grafia` via `normalizarGrafia` (heurística: texto vazio/ausente → `''` nunca definida; "quinhentista"/"século XVI"/"camoniana" → `GRAFIA_QUINHENTISTA`; "anterior"/"original"/"antiga"/"pré-reforma"/"etimológica" → `GRAFIA_ETIMOLOGICA`; qualquer outro texto não-vazio — "atual", "atualizada" incluídos — → `GRAFIA_ATUAL`, já que o pacote disse algo explicitamente sobre a ortografia). `meta.textos[titulo].grafia` sobrescreve por texto, pro caso de pacote com grafias mistas (ex.: parte de um autor colada em grafia original, parte já atualizada pela própria fonte — motivador direto: o pacote Cruz e Sousa, com sonetos em grafias diferentes). Também por texto (`meta.textos[titulo]`): `tipo` (`poema`/`prosa`; `meta.tipo` vale pro pacote todo), `assinatura` + `nomeLiterario` (gravados em `item.autoria[]`; o nome precisa estar em `meta.autor.nomesLiterarios` com o mesmo tipo, senão o pacote não monta), `dataEscrita` (`{ dia?, mes?, ano, exata? }`, também preenche `ano`) e `dataPublicacao`. `autores[]` pode trazer `sexo`, `genero`, `corRaca` (listas fechadas, validadas) e `nomesLiterarios`; a Importação Aditiva os copia pro Autor NOVO (orientação, religião etc. não atravessam) e, num Autor que já existe, só acrescenta o nome literário usado por um texto importado quando falta no cadastro.

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
    "formaPoema": "Soneto Petrarquiano / Camoniano",
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
- `rimas` — mapeamento de pares de rima, implementado (Bloco 2 passo 3 completo, `js/editor-sonoridade.js`): array de `{ id, a: { linha, silabas }, b: { linha, silabas }, acentuacao?, tonalidade?, riqueza? }`, onde `linha` é o índice 0-based em `escansaoLinhas` e `silabas` é um array de índices de sílaba (0-based, mesma base de `tonicas`) — mais de um índice cobre rima rica (mais de uma sílaba por lado). A letra do esquema (A, B, C...) nunca é salva — é sempre recalculada na hora de renderizar a partir dos pares (`calcularLetrasRima`, union-find por verso: versos transitivamente ligados por uma cadeia de pares, ex. 1↔2 e 2↔3, compartilham letra, cobrindo monorrima sem precisar de um conceito de "grupo" separado de par). Gesto de criação: clicar numa sílaba abre o lado A do par, shift-clique estende esse lado (rima rica), clicar em sílaba de outro verso abre o lado B (shift-clique estende do mesmo jeito); nada fecha o par sozinho — exige o botão "Confirmar par" (ou "Cancelar seleção"). Toggle "Modo Rima" é estado de sessão (`modoRima`/`selecaoRima` em `editor-sonoridade.js`), mutuamente exclusivo com Modo Sílaba Tônica — ligar um desliga o outro e descarta seleção de rima em curso. Estilização visual: cada sílaba de um par confirmado ganha contorno (`ring`, nunca background — spec pede explicitamente diferente do fundo da tônica) numa cor por LETRA do esquema, não por par (`PALETA_RIMA`/`corDaLetra`, 8 cores cíclicas, sem azul/roxo/âmbar — reservados pro destaque de seleção em curso e pro fundo da tônica); a coluna "Rima" no fim do verso usa a mesma cor no texto da letra. Seleção em curso tem prioridade visual sobre cor confirmada na mesma célula. Classificação por par (`acentuacao`/`tonalidade`/`riqueza`, opções fechadas em `ACENTUACOES_RIMA`/`TONALIDADES_RIMA`/`RIQUEZAS_RIMA`) e Posição (`Externa`/`Interna`, nunca salva — sempre derivada do par via `calcularPosicaoPar`, mesmo espírito da letra) ficam na seção "Pares de Rima" (`js/forms.js`/`js/editor-sonoridade.js`), lista de cartões abaixo da grade que também concentra remoção (com "Desfazer") e correção/reatribuição de lado. Proximidade (`Vizinha`/`Distante`, mesmo espírito de Posição — nunca salva, sempre derivada via `calcularDistanciaPar`/`calcularProximidadePar`) também fica nesse cartão: distância = diferença entre os `numero` dos dois versos (não a posição bruta em `escansaoLinhas`, que inclui linhas vazias), "Vizinha" até `DISTANCIA_VIZINHO_MAXIMA` (2, `utils.js`) versos de distância. O cabeçalho da lista de "Pares de Rima" (`renderResumoPares`, editor e leitura, mais a mesma lógica replicada nos 3 formatos de exportação — `js/exportar-sonoridade.js`) mostra: uma linha de Proximidade com a contagem final de pares Vizinhos/Distantes e a caracterização do poema como um todo (`calcularClassificacaoSonora`): "Com Rimas mais Próximas"/"Com Rimas mais Distantes", ou "Com Rimas Equilibradas" em caso de empate — sem rótulo se não houver par nenhum; e, logo abaixo, uma linha de contagem por valor pra cada um dos outros 4 eixos (Posição/Acentuação/Tonalidade/Riqueza — `EIXOS_CLASSIFICACAO_PAR`/`calcularTalyPorEixo`, `editor-sonoridade.js`), ex. "Riqueza: 2 Pobres · 1 Rica". Cada linha de eixo some sozinha se nenhum par tiver aquele eixo preenchido (Posição nunca some, é sempre calculada; Acentuação/Tonalidade/Riqueza são opcionais por par). Quando há pares sem aquele eixo classificado, um aviso "(N sem `<Eixo>` definida)" fecha a linha, pra a contagem nunca parecer maior do que realmente é. Ver `decisoes.md` pro porquê do corte de distância (sem base numérica consagrada na teoria da rima, grounded nos esquemas Emparelhada/Alternada/Interpolada já existentes).
- Colunas de contagem na tabela da aba (`CAMPOS_CONTAVEIS_SONORIDADE`, `js/editor-sonoridade.js`) — mesmo mecanismo de Poemas/Prosas (`js/colunas-contagem.js`, ver `README.md`), agora generalizado por um registro por tabela (`registroContavel(tabela)`: `CAMPOS_CONTAVEIS` de `utils.js` pra Poemas/Prosas, `CAMPOS_CONTAVEIS_SONORIDADE` pra Sonoridade) em vez de um único registro fixo. `CAMPOS_CONTAVEIS_SONORIDADE` não conta o tamanho de um array do item (como Poemas/Prosas) — deriva de `rimas`/`escansaoLinhas` do próprio registro, reaproveitando as mesmas funções do resumo em tela (`calcularPosicaoPar`/`calcularProximidadePar`/`calcularDistanciaPar`) pra nunca divergir do que a pessoa vê no modal: Rimas (total), Rimas (por verso, arredondado a 2 casas), Rimas Externas/Internas, Rimas Vizinhas/Distantes, e um campo por valor de Acentuação/Tonalidade/Riqueza (~18 opções ao todo, gerados programaticamente a partir das próprias listas fechadas via `camposContaveisPorValor`, pra uma opção nova nas listas já aparecer sem precisar lembrar de atualizar este registro). Por ter bem mais opções que Poemas/Prosas (~11), cada campo carrega um `grupo` (ausente em `CAMPOS_CONTAVEIS`) que o seletor usa pra agrupar em `<optgroup>` (`renderOpcoesCampoContagem`) em vez de lista achatada. Vive em `editor-sonoridade.js`, não em `utils.js`, porque depende dessas funções — `utils.js` não importa de nenhum outro módulo do projeto. Diferente de Poemas/Prosas, a tabela de Sonoridade não tem cabeçalho ordenável (ver linha abaixo), então o `<th>` da coluna de contagem ali fica só com o seletor de campo + botão remover, sem o botão de ordenar por essa contagem.
- `FORMAS_POEMA` ganhou uma 9ª opção além das 8 da spec original: `Poesia Narrativa / Cordel` (entre `Poema em Redondilhas` e `Forma Livre / Indefinida`), a pedido do Victor — era só citada na spec (seção 5) como exceção do aviso de Monorrima Absoluta, sem existir de fato como valor selecionável. Ganhou uma linha PARCIAL na Matriz de Validação (ver abaixo) e uma opção nova em `ESQUEMA_RIMAS_PADRAO` pro padrão de rima mais comum do gênero.
- `ESQUEMA_RIMAS_PADRAO` ganhou `Sextilha Aberta (ABCBDB)` — o padrão de rima mais usado na sextilha de cordel (só os versos pares rimam entre si com o mesmo som; ímpares soltos/brancos dentro da estrofe), a variante "aberta" entre as 5 documentadas (aberta/fechada/solta/corrida/desencontrada). Não é exclusiva de cordel (repente/trova também usam) e não é a única estrofe do gênero (septilha e décima têm padrões próprios, ainda não modelados), por isso não vira trava — só mais uma opção disponível.
- `ESQUEMA_RIMAS_PADRAO` ganhou também `Décima Espinela (ABBAACCDDC)` — estrofe de 10 versos consagrada na tradição de décima/repente/trova/cordel (Vicente Espinel, séc. XVI). Mesmo tratamento da Sextilha Aberta: não é exclusiva de nenhuma forma/estrofe única do gênero, então não vira trava — só mais uma opção disponível.
- `FORMAS_POEMA`: a opção `Lira` foi renomeada pra `Lira Brasileira` (mesma posição na lista) — existem duas tradições distintas chamadas "lira" (a hispano-italiana, heptassílabo+hendecassílabo 7+11, e a ensinada no Brasil, hexassílabo+decassílabo 6+10). Decisão do Victor foi manter uma forma só (não criar a variante 7+11 como opção separada, já que o resto de `FORMAS_POEMA` também não cobre toda variante regional de cada forma), mas deixar explícito no nome que é a variante local. Ver `decisoes.md` pro raciocínio completo.
- `FORMAS_POEMA`: `Poema em Redondilhas` foi removida — não é forma fixa (não define nº de versos/estrofes/rima), é só o nome do VERSO de 5 ou 7 sílabas, já coberto por `tamanhoVerso` (`Redondilha Menor/Maior`), campo independente de `formaPoema`. Sem efeito colateral (sem lógica presa a esse valor, sem uso no acervo). Ver `decisoes.md`.
- `FORMAS_POEMA`: `Quadra / Trova` foi separada em `Trova` e `Quadra Popular` — mesmo nome cobrindo duas tradições com regras diferentes (Trova é rígida: sempre 1 estrofe de 7 sílabas, sempre rimada; Quadra é solta: qualquer nº de sílabas, não precisa ser monostrófica). Ver `decisoes.md`.
- `ESQUEMA_RIMAS_PADRAO` ganhou também `Limerick (AABBA)` e `Quadra / Rima Simples (ABCB)` — padrões nomeados sem equivalente genérico já existente no catálogo (mesmo espírito de Sextilha Aberta/Décima Espinela). O nome do segundo já nasce como "Quadra" (não "Trova") porque decisão do Victor foi tratar `ABCB` como só Quadra, não Trova válida — ver linha da matriz abaixo.
- Matriz de validação/trava em cascata (Bloco 3) — implementada em `calcularOpcoesCascataSonoridade` (`utils.js`), chamada por `aplicarCascataSonoridade` (`forms.js`) a cada troca de `formaPoema`/`regularidadeMetrica`/`esquemaRimasPresenca`. "Trava" nunca autopreenche nem desabilita — sempre FILTRA a lista de opções do select correspondente, que continua editável entre elas (decisão do Victor). `MATRIZ_VALIDACAO_SONORIDADE` (`utils.js`) cobre `Soneto (Genérico)`, `Soneto Petrarquiano / Camoniano`, `Soneto Shakespeariano`, `Haikai`, `Tanka`, `Lira Brasileira`, `Limerick`, `Trova` e (parcialmente) `Poesia Narrativa / Cordel`. As 3 formas de Soneto travam igual em `regularidadeMetrica` (`Isométrico`), `tamanhoVerso` (`Decassílabo`/`Alexandrino`), `esquemaRimasPresenca` (exige rima) e `origemTradicao` (`Medida Nova`) — só `esquemaRimasPadrao` diverge: Genérico aceita `Oposta/Interpolada (ABBA)`, `Alternada/Cruzada (ABAB)` e `Mista/Completa` (as 2 travas específicas somadas); Petrarquiano/Camoniano só `Oposta/Interpolada (ABBA)` (o octeto, sempre fixo) e `Mista/Completa` (pro sexteto variável); Shakespeariano só `Alternada/Cruzada (ABAB)` (os 3 quartetos) e `Mista/Completa` (pro dístico final, que quebra o ABAB puro). Ver `decisoes.md`. `Limerick` trava `regularidadeMetrica` (`Heterométrico`), `tamanhoVerso` (`Redondilha Menor/Pentassílabo (5)`, `Hexassílabo (6)`, `Octossílabo (8)`, `Eneassílabo (9)`), `esquemaRimasPresenca` (exige rima) e `origemTradicao` (`Tradição Importada`). `Trova` trava `regularidadeMetrica` (`Isométrico`), `tamanhoVerso` (`Redondilha Maior/Heptassílabo (7)`), `esquemaRimasPresenca` (exige rima), `esquemaRimasPadrao` (`Alternada/Cruzada (ABAB)`, `Oposta/Interpolada (ABBA)` — não inclui `ABCB`, tratado como só Quadra) e `origemTradicao` (`Medida Velha`). `Quadra Popular` fica de fora por ora — decisão definitiva, não pendência: aceita qualquer nº de sílabas e não precisa ser monostrófica, nada universal o bastante pra travar (ver `decisoes.md`). `Poesia Narrativa / Cordel` trava `regularidadeMetrica` (`Isométrico`), `tamanhoVerso` (`Redondilha Maior / Heptassílabo (7)`), `esquemaRimasPresenca` (`Rimado`) e `origemTradicao` (`Medida Velha`) — os eixos praticamente universais no gênero —, mas deixa `esquemaRimasPadrao` de propósito sem trava, porque "Cordel" abriga várias estrofes (sextilha, septilha, décima) com padrões de rima diferentes entre si; essa ausência de trava nesse eixo é definitiva, não uma decisão pendente. Caso composto "Forma Livre + Versos Livres" (só entra com as duas condições juntas) é uma matriz separada (`MATRIZ_FORMA_LIVRE_VERSOS_LIVRES`, interna a `utils.js`). Três regras adicionais da spec (seção 5) também implementadas: (1) escolher Presença = `Sem Rimas / Livre` com métrica regular por trás corrige pra `Versos Brancos` (`corrigirPresencaRimaSeVersoBranco`), e quando Presença é `Sem Rimas`/`Versos Brancos` o Padrão fica só `Não Aplicável`, dentro da própria função de cascata; (2) tamanho do verso em 5/7 sílabas sugere (nunca sobrescreve) `Medida Velha`, 10/12 sugere `Medida Nova` (`sugerirOrigemTradicaoPorTamanho`, só aplicada se Origem/Tradição ainda estiver vazio); (3) dois avisos não-bloqueantes no submit (`mostrarAviso`, nunca impedem salvar): monorrima absoluta atípica pra forma fixa (`avisoMonorrimaAtipica`, via `FORMAS_SEM_AVISO_MONORRIMA` — formas mapeadas com trava de `esquemaRimasPadrao` já bloqueiam a opção de verdade, então não precisam entrar na lista; `Forma Livre` e `Quadra Popular` nunca acionam por não serem rígidas, e `Poesia Narrativa / Cordel` nunca aciona pelo motivo oposto — nela monorrima é a norma, conforme a própria exceção da spec) e divergência entre sílabas escandidas na grade e `tamanhoVerso` selecionado, só quando `regularidadeMetrica === 'Isométrico'` (`calcularDivergenciaSilabas`, `editor-sonoridade.js`). `registro`/`tom` continuam de fora da cascata (ver acima).
- Tabela da aba usa `DEFINICAO_COLUNAS.sonoridade` (`colunas.js`) pro seletor de colunas fixas — mesmo mecanismo de Poemas/Prosas, mas SEM o cabeçalho ordenável/paginação/seleção em massa deles (`celulas-tabela.js` é hoje específico de `poemas`/`prosas` nesse ponto; `renderSonoridade`, em `render-listas.js`, monta o cabeçalho e as linhas na mão). Colunas de contagem (ver acima) são a exceção: ganharam suporte próprio dentro de `renderSonoridade` (cabeçalho com seletor de campo, célula com a contagem, filtro numérico via `itemBateFiltrosContagem` na montagem de `filtradas`) — sem herdar ordenação, já que a tabela não tem nenhuma coluna ordenável ainda.

## Exportação .csv (`js/exportar-csv.js`, `js/exportar-autores.js`)

Não é schema de dado, é o mapa cadastro → colunas. Cada coluna declara em `campos` as chaves do registro que consome (`coluna(cabecalho, campos, valor)`); `tests/exportar-csv.test.js` compara essas chaves com o `dados = {...}` de `forms.js` (Poema, Prosa e Autor) e falha se um campo novo do cadastro ficar sem coluna. Campo novo no cadastro = uma `coluna(...)` nova (ou entrada em `CAMPOS_TEXTO_IGNORADOS`, com o porquê).

- Poema/Prosa (`colunasTexto(tipo)`, entrada = `montarRegistro`): 75 colunas. Poema tem `n_versos`/`n_estrofes`, `anotacoes_marginais`, `descricao_visual`; Prosa tem `n_linhas`/`n_paragrafos`, `genero`, `publicado`. Datas em `_ano/_mes/_dia`; Sinalizações uma coluna por categoria de `SINALIZACOES_CATEGORIAS` (`sinal_*`); listas de objetos (elos, ecos, intertextualidade, envios...) uma entrada de texto por objeto, separadas por `" | "`.
- Autor (`COLUNAS_AUTOR`, entrada = `itensDaSelecaoAutores`): 33 colunas, `derivados` no fim.

