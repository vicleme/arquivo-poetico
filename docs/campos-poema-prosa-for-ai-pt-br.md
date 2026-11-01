# Poemas e Prosas: guia de todos os campos

Este documento não pede nenhuma tarefa — é o mapa completo dos campos que
existem num registro de Poema ou Prosa, para que uma IA que receba dados
exportados (ou uma pessoa lendo o schema) saiba o que cada campo é, sem
precisar abrir o código. Campos com regra própria ambígua ou fácil de
confundir têm documento dedicado — aqui eles só aparecem resumidos, com
link pro doc certo. O resto (a maioria) é documentado aqui mesmo, porque é
autoexplicativo o bastante pra não precisar de um doc só seu.

---

## Poema vs. Prosa: o que muda

O schema dos dois é quase idêntico — a mesma lista de campos abaixo vale
pra ambos, com duas exceções conhecidas:

- **Alvo de Elos/Ecos** (Intratextualidade, ver abaixo): numa Prosa, pode
  apontar pra outro Poema **ou** outra Prosa; num Poema, só pra outro
  Poema.
- **`descricaoVisual`**: campo exclusivo de Poema — Prosa não tem.

Fora isso, os dois compartilham a mesma estrutura, e o resto deste
documento vale pros dois sem distinção.

## Campos com documento próprio (só resumidos aqui)

Estes grupos têm regras específicas de interpretação — categorias que se
parecem mas não são a mesma coisa, casos especiais, campos derivados.
Consulte o doc dedicado sempre que a tarefa realmente depender de acertar
essa distinção.

- **Etiquetas** (antes "Sinalizações"; chaves `sinalizacoesTradicao`, `sinalizacoesEstilo`,
  `sinalizacoesTerritorialidade`,
  `sinalizacoesRelacao`, `sinalizacoesSensibilidade`,
  `sinalizacoesTom`, `sinalizacoesDominioImagetico`,
  `sinalizacoesOutros`) — 8 campos de etiquetas, cada um uma categoria
  diferente (o Tema não é mais um deles: vive em `temas`). Os 7 que são etiquetas de verdade guardam ids do cadastro
  `db.etiquetas` (nos `.json` de textos saem como lista de nomes). Um deles,
  `sinalizacoesTerritorialidade`, é espelho derivado e não se digita
  mais no grupo de etiquetas. Ver `etiquetas-for-ai.md`.
- **Temas** (`temas`: lista de `{ temaId, papel, nome }`, na exportação) —
  os temas do texto por id, com `papel` `principal`, `secundario` ou vazio
  (sem papel definido). O campo antigo `sinalizacoesTema` não
  existe mais: leia e escreva só `temas`.
- **Papel do Assunto** (`assuntosPapel`: lista de `{ assuntoId, papel, nome }`,
  na exportação) — só as sobrescritas. O Assunto herda o papel dos Temas do
  texto; a entrada existe quando a pessoa fixou outro papel para aquele Assunto
  no texto. Sem entrada, siga o papel dos Temas.
- **Exceções de Assunto** (`assuntosExcluidos`: lista de `{ assuntoId, nome }`,
  na exportação) — Assuntos que a pessoa tirou deste texto ("não se aplica a
  este texto"), mesmo que um dos Temas dele pertença a eles. Um Tema pode estar
  em vários Assuntos, mas um texto específico pode caber só em um. O Assunto
  continua no cadastro e o Tema continua no texto; só este texto deixa de contar
  naquele Assunto. Trate o Assunto listado aqui como ausente do texto.
- **Transtextualidade e Referências** (`intertextualidade`,
  `hipertextualidade`, `referenciasExternas`) — diálogo com obras e fatos
  externos ao acervo. Ver `transtextualidade-referencias-for-ai.md`.
- **Intratextualidade** (`conceitos.elos`, `conceitos.ecos`) — vínculos com
  outros textos do próprio acervo. Ver `intratextualidade-for-ai-pt-br.md`
  para o critério de Elo contra Eco e a escolha de Relação, Direção e Tipo.
- **Pessoas** (`pessoas`, e como isso se diferencia de `autoria` e
  `gruposDiretos`) — vínculo com pessoas cadastradas e os papéis que elas
  exercem no texto. Ver `pessoas-papeis-for-ai.md`.
- **Personagens** (`personagens`) — vínculo com Personagens cadastrados (o
  que o autor criou ou reinterpretou), com papéis, centralidade e tags de
  relação com o texto. Não se confunde com Pessoas nem com Referências.
  Ver `personagens-for-ai.md`.
- **Sonoridade** — não é um campo de Poema/Prosa, é uma aba/entidade à
  parte (`db.escansoes`, um registro por poema). Ver `sonoridade-for-ai.md`
  pra interpretar dados já preenchidos, ou `scansion-for-ai.md` pra pedir
  a uma IA que analise um poema do zero.

## Identificação e conteúdo

- **`titulo`**: título do texto.
- **`texto`**: o conteúdo em si — poema ou prosa —, com marcação HTML
  inline permitida (negrito, itálico, sublinhado, tachado, cor de fonte,
  cor de fundo em trecho ou em faixa de largura total, comentários
  `<!-- -->` invisíveis na Visualização/exportação mas visíveis no `.md`
  bruto).
- **`idiomas`**: lista de `{ idioma, papel, dialetos }`. `papel` é
  `"principal"` ou `"secundario"` e vale para cada idioma, então um texto
  meio a meio tem dois Principais. Se a lista não está vazia, ao menos um
  item é Principal. `dialetos` é uma lista, opcional, de variedades do idioma em texto
  livre (por exemplo `["rioplatense"]`; mais de uma quando o texto mistura
  variedades, como um diálogo entre falantes de regiões diferentes). Lista vazia significa texto sem
  idioma definido.
- **`idioma`**: espelho derivado de `idiomas`, uma string só com os nomes
  (Principais primeiro, separados por vírgula). Não se edita sozinho; a
  fonte da verdade é `idiomas`.
- **`jargaoGiria`**: lista de textos livres, no nível do texto e não dentro de
  `idiomas`, porque dialeto pertence a uma língua e gíria de internet ou jargão
  corporativo não. Só se preenche quando o texto fala COM o vocabulário de uma
  comunidade ou meio, de forma literal: gíria de internet, gíria juvenil, jargão
  corporativo, linguagem de fandom. O app sugere quatro sementes (`"Gíria de
internet"`, `"Gíria juvenil"`, `"Jargão corporativo"`, `"Linguagem de fandom"`),
  mas nunca grava nenhuma sozinho, e qualquer outro rótulo vale. Pergunta-teste: o
  texto fala COM essas palavras ou fala COMO SE fosse esse campo do saber? No
  segundo caso é `Domínio Imagético` (uma Etiqueta), não este campo. Também não é
  este campo: a formalidade geral da língua (o select Registro, em Sonoridade, onde
  ficam marcas de oralidade comum como "pra" e "tô"); citar memes, streamings ou
  aplicativos (isso é Tema ou Referência: falar DE algo); nem dialeto (pertence a
  uma língua). Opcional e esparso: lista vazia é o caso normal, então na dúvida
  deixe vazio. Rótulos repetidos (sem diferenciar caixa nem acento) são juntados. Um
  `.json` da "Importar campos" pode preenchê-lo em lote (ver
  `importar-campos-for-ai-pt-br.md`).

## Lugares: onde o texto foi escrito e o que ele cita

Os lugares vêm de um cadastro hierárquico, `db.locais`
(`{ id, nome, tipo, pertenceA, notas }`). `tipo` é texto livre com
sugestões (País, Estado, Região, Cidade, Bairro, Logradouro, Edificação,
Estação, Rede ou sistema, Corpo d'água) e pode ficar vazio. `pertenceA` é
uma **lista de ids de pais**: um lugar pode estar dentro de mais de um (a
Estação Lapa está no bairro Lapa e na rede Metrô de São Paulo). O primeiro
pai é o principal e define o caminho canônico; os outros só entram nas
agregações. O nome sozinho não identifica o lugar: São Paulo (Cidade) e São
Paulo (Estado) são dois registros, então leia sempre `nome` junto de `tipo`.

Num registro exportado de Poema ou Prosa, estes campos são trocados por
objetos legíveis, porque o id não vale em outro acervo:

- **`territorialidade`**: lista de `{ localId, nome, tipo }`, os lugares que
  o texto **cita**, exatamente como a pessoa marcou. Os ancestrais nunca
  ficam aqui: se o texto marca Lapa, o Brasil não está nesta lista.
- **`localEscrita`**: um `{ localId, nome, tipo }` ou `null`, onde o texto
  foi **escrito**. Só um por texto (para escrita em trânsito existe um
  lugar do tipo "Viagem" que pertence a uma região). `null` significa não
  informado, não "lugar nenhum".
- **`locaisHierarquia`**: lista de `{ localId, nome, tipo, pertenceA }` com
  cada lugar acima (citados e local de escrita) **mais todos os seus
  ancestrais**. `pertenceA` lista os `localId` dos pais na mesma lista,
  pai principal primeiro. Use para responder "dentro do Brasil"; não
  deduza a hierarquia pelos nomes.

Como ler:

- **Citado diretamente x com o que está dentro.** "Citado diretamente"
  conta só os lugares marcados no texto. "Com o que está dentro" conta o
  lugar mais todos os descendentes, cada texto uma vez por lugar: um texto
  que cita Santos e Lapa conta uma vez para o Brasil, e a soma das barras
  pode passar do número de textos. Diga qual dos dois você usou.
- **Local de escrita não é o que o texto cita.** Um poema escrito em
  Santos sobre Lisboa tem `localEscrita` Santos e `territorialidade` Lisboa.
- **Territorialidade não é Tema.** Tema é o assunto amplo; um lugar citado
  no texto vai em `territorialidade`. Ver `etiquetas-for-ai.md`.
- **`sinalizacoesTerritorialidade`** é um espelho derivado: só os nomes,
  sem tipo nem hierarquia. Não o edite nem o use para distinguir lugares
  de mesmo nome; use `territorialidade`.
- Uma exportação antiga, sem `locaisHierarquia`, só tem os nomes do espelho.

## Onde o texto mora (hierarquia e coletâneas)

- **`aparicoes`**: a verdade sobre onde o texto aparece. Lista de
  `{ livroId, parteId, secaoId, sequencia }`, uma por lugar (Livro, Parte ou
  Seção, com a posição na fila daquele lugar). `sequencia` é `null` quando o
  texto só "consta" no Livro, sem posição. O mesmo texto pode aparecer em
  vários Livros, cada um com a sua posição. As Coletâneas não entram nessa
  lista: ficam nos itens das Coletâneas. A lista viaja no `.json` de backup
  completo; as exportações de texto (seletiva, flat, `.csv`, `.md`) levam o
  espelho abaixo e o `contexto.aparece_em`.
- **`paiTipo` / `paiId` / `sequencia` / `livrosIds`**: o formato antigo,
  mantido como **espelho** de `aparicoes` para as telas mais velhas.
  `paiTipo`/`paiId` apontam para a primeira aparição que tem lugar (Livro,
  Parte ou Seção), `sequencia` é a posição dela e `livrosIds` lista os outros
  Livros. O espelho não diz tudo o que a lista diz (por exemplo, uma segunda
  aparição com posição): em caso de conflito, vale `aparicoes`.
- **Aparição principal**: a do Livro de publicação mais antiga (empate, ou
  sem data, fica a primeira da lista). Só serve para ordenar e rotular: as
  tabelas de Poemas e Prosas ordenam por Livro, Parte, Seção e posição da
  aparição principal, uma linha por texto, com as outras no tooltip.
- **`contexto.coletaneas`** (só nas exportações, nunca editado): lista com os
  títulos das Coletâneas que trazem o texto, na ordem do acervo, cada uma
  uma vez só. Vem dos itens das Coletâneas, não de `livrosIds`. No `.csv` é a
  coluna `coletaneas` (títulos separados por " | "); no `.md`, `.pdf` e `.docx`,
  a linha "Coletâneas" logo depois de "Localização". A Importação Aditiva
  ignora esse campo.
- **`contexto.aparece_em`** (só nas exportações, nunca editado): uma entrada
  por aparição, `{ livro, parte, secao, posicao, coletanea, principal }`
  (títulos já resolvidos; `posicao` é `null` quando só consta; `principal`
  marca a principal). `contexto.livro`, `parte` e `secao` seguem sendo só o
  primeiro lugar (o espelho). No `.csv` é a coluna `aparece_em` (aparições
  separadas por " | ", vazia com uma só); no `.md`, `.pdf` e `.docx` e no Ver,
  a linha "Aparece em", só para texto em dois ou mais Livros. A Importação
  Aditiva ignora esse campo.

## Datas, períodos, movimento e inspiração

- **`dataEscrita`** / **`dataPublicacao`**: datas parciais (dia/mês/ano,
  qualquer parte pode faltar), com uma flag `exata` em `dataEscrita`
  (data precisa vs. aproximada). O sistema recusa salvar se
  `dataPublicacao` for anterior a `dataEscrita`.
- **`ano`**: cópia de `dataEscrita.ano`, mantida só por compatibilidade
  com ordenação/estatísticas/exportação antigas — não edite direto, é
  derivado de `dataEscrita`. Texto antigo que só tinha `ano` ganha
  `dataEscrita: { ano, exata: false }` na carga (`migrarAnoParaDataEscrita`).
- **`epocaRetratada`**: intervalo de tempo que o texto retrata (não é
  quando foi escrito) — `{ periodos, inicio, fim, na }`. `periodos` é uma
  lista (0 a N) de `{ epocaId, recorte }`, cada item apontando pro cadastro
  central `db.epocas`; um texto pode retratar vários períodos biográficos.
  `recorte` é por período: `"momento"` | `"repercussão"` | `null` (ex.:
  "Corte de contato" como momento e "Luto" com repercussão no mesmo texto).
  `inicio`, `fim` e `na` valem para o texto inteiro. Arquivos antigos, com
  `epocaId`/`recorte` direto no objeto, ainda são aceitos. `na: true` é um terceiro estado deliberado —
  "marcado como Não Aplicável", diferente de "ainda não categorizado"
  (campo inteiro `null`). Não confunda os dois: um texto sem
  `epocaRetratada` não foi avaliado; um texto com `na: true` foi avaliado
  e a resposta foi "não se aplica". Na interface e nas exportações o
  rótulo é **Período Biográfico Retratado** (o nome interno `epocas`/
  `epocaRetratada` foi mantido por compatibilidade): é o período da vida
  da pessoa (ex.: uma fase de um relacionamento), não o momento histórico.
- **`periodosHistoricosIds`**: **Período Histórico Retratado**: os momentos
  históricos (não pessoais) que o texto retrata (ex.: Ditadura Militar,
  Pandemia de Covid-19). Array de ids (0 a N) que apontam pro cadastro
  central `db.periodosHistoricos`, sem período principal e sem ordem que
  signifique algo (diferente do `pertenceA` do próprio cadastro). Um texto
  sobre a pandemia no governo Bolsonaro lista "Governo Bolsonaro" e
  "Pandemia de covid-19", que é um período de topo, independente.
  Coexiste com `epocaRetratada`, os dois podem estar preenchidos ao mesmo
  tempo. Vazio (`[]`) = não informado. Substitui o antigo
  `periodoHistoricoId` (id único): backups e exportações antigos são
  migrados/aceitos (`null` vira `[]`, um valor vira `[valor]`).
- **`movimentosEscolasIds`**: **Corrente literária** (antes Movimento/Escola) — array de ids (0 a N)
  do cadastro central `db.movimentosEscolas` (ex.: Romantismo, Simbolismo,
  Modernismo). Um texto pode não se encaixar em nenhum ou caber em mais
  de um. A mesma lista guarda também as divisões de uma corrente (corrente
  com pai: fase, geração, vertente ou variante regional, como "Romantismo
  no Brasil"). O app as mostra separadas ("Corrente literária" para as sem
  pai, "Divisões" para as demais), mas nada separado é gravado: divisão é
  derivada de o registro do cadastro ter pai (`paiId`). No `.md` são duas
  linhas (`Corrente literária` e `Divisões`); no `.csv`, `movimentos_escolas`
  e `movimentos_escolas_caminho` trazem todas, e `divisoes_corrente` e
  `divisoes_corrente_caminho` trazem só as divisões.
- **`contextoHistorico`**: rótulo **Inspiração** — texto livre sobre o que
  inspirou o texto (um gatilho pontual, uma circunstância específica). O
  nome interno é legado (`contextoHistorico`); o conteúdo NÃO é contexto
  histórico, é inspiração. Não confunda com `periodosHistoricosIds`.

## Intratextualidade — Elos e Ecos

Vínculos com outros textos do próprio acervo, por id (`conceitos.elos`,
`conceitos.ecos`). Ver `intratextualidade-for-ai-pt-br.md` para escolher
entre Elo e Eco e preencher cada um:

- **Elos** (bilateral): `{ id, relacao, direcao, texto }`, em que `id` é o
  do **texto-alvo** (não existe `poemaId`). `relacao` vem de uma lista
  fechada (Reescrita, Continuidade, Tradução, Variação, Versão, Resposta,
  Díptico, Outro). `direcao` é `"origem"` (texto mais antigo/base) ou
  `"destino"` (texto derivado/mais novo).
- **Ecos** (sempre unidirecional, do mais novo pro mais antigo): `{ id,
tipo, texto, ancoras? }`, sem `direcao`, em que `id` é o do texto-alvo.
  `tipo` vem de lista fechada (Personagem em comum, Pessoa em comum,
  Imagem central compartilhada, Aceno a, Outro).
- **`ancoras`** (opcional, só em Eco): lista de `{ especie, id }`, quem
  sustenta a ligação. `especie` é `"personagem"` ou `"pessoa"`, e o `tipo`
  decide qual vale: "Personagem em comum" só aceita âncoras de personagem,
  "Pessoa em comum" só de pessoa, e os outros tipos não têm âncora. Na
  exportação cada âncora leva também `nome`, porque o id não vale em outro
  acervo. Um Eco sem `ancoras` é válido (a ligação existe, o autor só não
  registrou quem a sustenta). **Presença do mesmo Personagem ou da mesma
  Pessoa em dois textos não cria Eco**: a âncora só documenta o motivo de
  um Eco que o autor já decidiu criar. Se um vínculo sai de um dos textos
  depois, a âncora continua no Eco com um aviso, então confira nos dois
  textos antes de afirmar que a figura ainda está nos dois.
- **`alvoTitulo`**: na exportação, cada Elo e Eco leva também o título do
  texto-alvo, porque o `id` só vale no acervo de origem. Para identificar o
  alvo num arquivo exportado, use `alvoTitulo`, não `id`. Se `alvoTitulo`
  faltar, o alvo não foi encontrado ou o arquivo é antigo.

**Atenção a um nome ambíguo**: este `ecos` (`conceitos.ecos`, vínculo
entre textos do acervo) não tem nenhuma relação com `es.ecos` do registro
de Sonoridade (ecos sonoros/quase-rimas de um poema). Mesmo nome, campos
completamente diferentes — ver `sonoridade-for-ai.md` pra mais detalhe
sobre essa colisão.

## Pessoas, autoria e grupos (visão geral)

Três campos parecidos, detalhados em `pessoas-papeis-for-ai.md`:

- **`pessoas`**: vínculo com pessoas cadastradas + papéis (Retratado(a),
  Dedicatário(a) etc.) — o campo com mais nuance, tem doc próprio.
- **`autoria`**: quem escreveu o texto — `{ autorId, papel }`, `papel`
  único (não array) entre `Autor`/`Coautor`. Resolve contra `db.autores`,
  cadastro central diferente de `db.pessoas`.
- **`gruposDiretos`**: array de `grupoId` — grupo citado sem apontar pra
  nenhuma Pessoa específica dele.

## Notas, avaliação e status

- **`notas`**: campo de notas livres sobre o texto.
- **`autoavaliacao`**: texto livre — opinião sobre o próprio texto.
- **`autoclassificacao`**: número de 0,5 a 5 (passo 0,5) — "corações" que
  o autor dá ao próprio texto, puramente afetivo, sem pretensão de nota
  técnica. `0`/ausente é o estado especial "não avaliado" (não é a nota
  mínima — a nota mínima de verdade é 0,5).
- **`sorteavel`**: booleano, se o autor permite que este texto seja
  escolhido no sorteio de leitura ("sobre o que você quer ler hoje?").
  Desligado por padrão; ausente vale `false`. O autor marca à mão, então
  nunca ponha `true` por conta própria: ofereça como sugestão para ele
  revisar.
- **`leituraAutonoma`**: texto, se o texto se lê sozinho. `""` ou ausente é o
  padrão (lê-se sozinho); `"sequencia"` (só em sequência), `"conjunto"` (só
  em conjunto) e `"inicio"` (só como início: o primeiro texto de uma
  sequência ou conjunto). Não é ligação com Elos ou Ecos, e Incompleto,
  Díptico e Resposta não o definem. No sorteio de leitura, `"sequencia"` e
  `"conjunto"` nunca saem; `"inicio"` sai, com a marca "só o começo". Quem
  decide é o autor: nunca ponha por conta própria, ofereça como sugestão para
  ele revisar. Detalhes em `sorteio-for-ai-pt-br.md`.
- **`valenciaAjuste`**: texto, o juízo do próprio autor sobre o peso do texto,
  usado no lugar do valor derivado dos Temas. `""` ou ausente segue os Temas
  (o padrão); `"leve"` (mais leve), `"neutro"` (neutro ou ambivalente) e
  `"pesado"` (mais pesado). A valência do texto em si nunca é guardada: é
  calculada a partir da valência dos Temas (o mesmo índice das Estatísticas),
  a não ser que este campo esteja preenchido. Quem decide é o autor: nunca
  ponha por conta própria, ofereça como sugestão para ele revisar, dizendo por
  que o texto pesa diferente dos Temas.
- **`autorEmSigilo`**: booleano, se o autor quer o nome dele fora das telas
  públicas (hoje: a página do sorteio de leitura) neste texto. Desligado por
  padrão; ausente vale `false`. Quem decide é o autor: nunca ponha `true` por
  conta própria, ofereça como sugestão para ele revisar.
- **`notasPublicas`**: booleano, se o autor marca as `notas` como publicáveis
  (a caixa "Pública" sob as Notas). As Notas podem guardar coisa privada, então
  só as marcadas podem aparecer para leitores (hoje: a página do sorteio de
  leitura). Desligado por padrão; ausente vale `false`. Quem decide é o autor:
  nunca ponha `true` por conta própria, ofereça como sugestão para ele revisar.
- **`comentariosPublicos`** ("Comentários ao leitor" na interface): texto livre
  escrito para quem lê a obra; aparece para o leitor sempre que preenchido. Ao
  contrário de `notas`, escreva pensando em quem lê. Não é o comentário
  `<!-- -->` do editor de texto, que segue invisível em todas as saídas.
- **`status`**: lista fechada — `incompleto`, `completo`, `publicado`,
  `migrado`, `descartado`, `privado`. `privado` é diferente de
  `descartado`: nunca teve intenção de publicação (sempre restrito a
  contexto pessoal/íntimo), não é algo que foi descartado depois.
- **`pendencia`**: texto livre marcando uma pendência aberta sobre o
  texto — presença de texto (não vazio) é o que liga o indicador visual
  (🟠) na tabela, mesmo espírito de `conteudoSensivel` (ver abaixo).

## Fonte do texto

- **`fonteTexto`**: objeto `{ origem, edicao, link, dataAcesso, conferido, grafia }`
  (ou `null`) — de onde veio o texto quando não é obra própria (edição de
  terceiros, transcrição). `dataAcesso` (opcional, ISO `aaaa-mm-dd`) é quando o `link` foi acessado; só fica com link e a chave não existe quando vazia. `conferido` é booleano: o texto foi comparado
  com a edição de origem. `grafia` é `''` (atual, padrão), `'etimológica'`
  (ph/th/y/dobradas — ex.: Cruz e Sousa, Augusto dos Anjos) ou
  `'quinhentista'` (português do séc. XVI — ex.: Camões) — existe pra a
  Sonoridade avisar em vez de errar a contagem/tônica em texto de grafia
  antiga; não conta em
  "Campos Preenchidos" e não tem coluna nem Estatísticas. A situação de
  domínio público **não** é um campo: é derivada do ano de óbito do Autor
  vinculado em `autoria`.

## Conteúdo sensível e vocabulário de alerta

- **`conteudoSensivel`**: parágrafo livre descrevendo conteúdo sensível do
  texto. A presença (não vazia) desse campo é o que aciona o badge
  "Conteúdo sensível" na interface — não existe uma flag booleana salva à
  parte; é sempre derivado da string. Diferente de
  `sinalizacoesSensibilidade` (tags soltas e categorizáveis, ex.
  "Linguagem obscena" — ver `etiquetas-for-ai.md`): este
  campo é o parágrafo descritivo, aquele é etiqueta curta.
- **`vocabularioHiperacionante`**: texto livre — nota sobre vocabulário do
  texto que pode ser especialmente gatilho/acionador pra quem lê.
- **`ocultacao`**: texto livre — nota sobre alguma forma de ocultação
  aplicada ao texto (o quê e por quê).

## Envios, reconhecimentos e anexos

- **`envios`**: lista de `{ pessoa, data, meio, reacao, notas }` — a quem
  o texto foi enviado, quando, por qual meio, e a reação registrada.
  `pessoa` e `meio` são texto livre com autocomplete (sem vínculo por id
  com `db.pessoas`).
- **`reconhecimentos`**: lista de `{ premio, posicao, ano, texto }` —
  prêmios/reconhecimentos recebidos pelo texto.
- **`anexos`** (antigo `ilustracoes`): lista de anexos do texto, com
  **`anexosNotaGeral`** como nota livre cobrindo o conjunto todo (não um
  anexo específico).
- **`anotacoesMarginais`**: lista de anotações associadas a pontos
  específicos do texto (distinto de `notas`, que é geral, não pontual).

## `descricaoVisual` (só em Poema)

Texto livre — descrição visual associada ao poema. Único campo desta
lista que não existe em Prosa (ver seção "Poema vs. Prosa" acima).

## Migração entre Livros/Seções

Trio usado quando um texto muda de lugar na estrutura editorial (é
"cortado" de um Livro/Seção e "lançado" em outro), ou é descartado nesse
processo:

- **`cortadoDe`** / **`lancadoEm`**: `{ livro, secao }` — de onde o texto
  saiu / onde entrou. O app acrescenta `livroId` (id do livro no cadastro,
  quando o livro existe lá); **não preencha `livroId`**, ele é gravado pelo
  app, e o `livro` deve ser o título do livro. `secao` é `"Parte / Seção"`,
  e na tela vira `Livro › Parte › Seção`. `cortadoDe` aceita também `posicao` (o número que o
  texto tinha lá na época, uma foto que nunca é recalculada) e vale para
  `migrado` e `descartado`; no descartado é preenchido ao descartar, e a
  `sequencia` vira `null`.
- **`justificativaMigracao`**: texto livre justificando a migração.
- **`descarte`**: texto livre — motivo do descarte, quando aplicável
  (`status: "descartado"`).

## Resumo para uso prático

1. Se a tarefa envolve Etiquetas, Transtextualidade/Referências,
   Pessoas/Papéis, Personagens ou Sonoridade, use o doc dedicado — este arquivo só
   resume esses grupos o suficiente pra você saber que existem.
2. Não confunda `conceitos.ecos` (vínculo entre textos, Intratextualidade)
   com `es.ecos` de Sonoridade (ecos sonoros) — nomes iguais, campos
   diferentes, docs diferentes.
3. `aparicoes` é onde o texto **aparece** (um ou mais Livros, cada um com a
   sua posição); `paiTipo`/`paiId`/`livrosIds` são só o espelho dela. Nas
   exportações, prefira `contexto.aparece_em`.
4. `epocaRetratada` ausente (`null`) ≠ `epocaRetratada.na === true` — o
   primeiro é "não avaliado", o segundo é "avaliado como não aplicável".
5. `descricaoVisual` só existe em Poema — não espere encontrá-lo (nem
   sinta falta dele) num registro de Prosa.
