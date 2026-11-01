# Transtextualidade e Referências (Externas): como interpretar esse grupo

Este documento não pede nenhuma tarefa — explica a lógica dos três campos
que compõem o grupo "Transtextualidade e Referências (Externas)" no modal
de Poema/Prosa, para que uma IA que receba dados exportados distinga
corretamente **Intertextualidade**, **Hipertextualidade** e **Referências
(Externas)** — três campos parecidos na superfície, mas com critérios
diferentes de quando cada um se aplica.

Os nomes vêm do vocabulário da teoria da Transtextualidade (relações que
um texto mantém com outros textos) — o grupo reúne duas categorias dessa
teoria (Intertextualidade e Hipertextualidade) mais um terceiro campo
prático, Referências Externas, para âncoras no mundo real que não são,
propriamente, diálogo com uma obra.

Importante: este grupo é sempre sobre o texto e o **mundo fora do
acervo** — obras, pessoas públicas, fatos históricos. Vínculos com
**outros poemas do próprio acervo** (reescrita, tradução, continuação,
díptico, eco...) ficam num grupo separado, "Intratextualidade (elos e
ecos)", e não são o assunto deste documento (ver
`intratextualidade-for-ai-pt-br.md`).

---

## O critério que separa Intertextualidade de Hipertextualidade

Os dois campos seguem a teoria de Genette: o que decide é a **natureza da
relação**, não o tamanho do trecho afetado. Intertextualidade é
**copresença**: a obra de origem aparece dentro do texto (uma citação, uma
alusão). Hipertextualidade é **derivação**: o texto nasce da transformação
ou da imitação de outra obra e não existiria como é sem ela.

Teste de uma pergunta: **"se eu tirar a obra de origem, o texto ainda
existe como é?"**

- **Sim, perde só uma camada:** é Intertextualidade.
- **Não, ele é derivado dela:** é Hipertextualidade.

Na prática, a derivação costuma valer para o texto inteiro (uma tradução,
uma paródia, uma homenagem, uma releitura), e a copresença para um trecho.
Mas a regra é a derivação, não a extensão: um verso parodiado dentro de um
poema continua sendo, no acervo, uma Alusão ou uma Citação deformada (a
`nota` explica a deformação), e só o texto inteiro que existe por derivação
vai para Hipertextualidade.

## Intertextualidade

Estrutura de cada entrada:

```json
{
    "relacao": "Citação",
    "tipoObra": "Música",
    "obra": "Águas de Março",
    "autores": ["Tom Jobim"],
    "personagens": [],
    "descricao": "canção de 1972 sobre o fim do verão",
    "dataObra": {
        "nivel": "ano",
        "ano": 1972,
        "aC": false,
        "aprox": false,
        "de": 1972,
        "ate": 1972
    },
    "trecho": "É pau, é pedra, é o fim do caminho",
    "traduzido": false,
    "link": "",
    "linkTexto": "",
    "dataAcesso": "",
    "nota": ""
}
```

- **`relacao`** (rótulo na tela: Relação): o que o texto faz com a fonte.
  Texto livre com sugestões:
    - **Citação**: reproduz as palavras da fonte.
    - **Menção**: nomeia a obra ou o autor, sem reproduzir nada (o poema
      diz "mirrorball", por exemplo, sem citar a letra).
    - **Alusão**: evoca a fonte sem nomeá-la.
    - **Paráfrase**: reformula uma passagem ou ideia da fonte com outras
      palavras, e o texto se sustenta sozinho. Se o texto inteiro for uma
      reformulação, é Hipertextualidade (Releitura).
    - **Bricolagem**: cola fragmentos de várias fontes no mesmo texto.

    Vazio significa "nunca definido", e é o que têm as entradas antigas até
    serem reclassificadas. Não é um erro: não infira a relação sozinho a
    partir de `obra`.

- **`tipoObra`** (Tipo de obra): o que é a obra referenciada, a mesma
  lista de sugestões de mídia nos dois campos (Livro, Texto, Música,
  Filme, Série, Vídeo, Fotografia, Pintura, Peça de teatro, Citação,
  Conversa, Palestra, Mitologia, Conto de fadas, Outro). Texto livre, não
  uma lista fechada. Descreve o artefato, nunca a relação.
- **`obra`**: o título da obra, só o título. A frase citada vai em
  `trecho`, e a explicação do que a obra é vai em `descricao`.
- **`autores`** (rótulo na tela: Autor): **lista** de nomes em texto livre,
  uma etiqueta por autor (uma música com participação, um livro de várias
  pessoas), com autocompletar e sem vínculo com o cadastro de Autores. A
  ordem é a digitada e serve de destaque, mas **não** entra na identidade da
  obra: "A e B" e "B e A" são a mesma obra. Lista vazia quando a autoria é
  difusa ou coletiva (uma série, um conto de fadas). Não há papel por autor
  (intérprete, produtor). Cada etiqueta é um nome só, mas uma etiqueta antiga
  pode ainda conter vários ("Toquinho e Vinicius"): o app não divide sozinho,
  então descreva o que vê em vez de dividir por conta própria. Backups e
  pacotes antigos trazem `autor`, um texto só, que o app converte em uma
  etiqueta ao carregar; se encontrar `autor` num arquivo antigo, leia-o como
  uma lista de um nome.
- **`personagens`** (rótulo na tela: Personagem): **lista** de etiquetas de
  texto livre com autocompletar, uma por personagem, na ordem digitada (o
  mito de Prometeu cita `["Prometeu", "Zeus"]`). Serve quando a fala ou a
  presença é de um personagem e não do autor (Medusa, Zeus, Cinderela, uma
  personagem de série). Autor e personagem são independentes: uma entrada
  pode ter um, os dois ou nenhum. Mesmas regras de `autores` (sem diferença
  de acento ou caixa, sem repetidos). É texto livre: não tem ligação com o
  cadastro Personagens, que só guarda quem o autor criou ou reinterpretou.
  Backups e pacotes antigos trazem `personagem`, um texto só, que o app
  converte em uma etiqueta ao carregar; se encontrar `personagem` num
  arquivo antigo, leia-o como uma lista de um nome.
- **`origemObra`** (rótulo na tela: Origem): **lista** opcional de etiquetas
  de texto livre, com autocompletar, que diz de onde a obra vem: um lugar ou
  uma cultura ("Grécia", "Brasil"), nunca uma época (o tempo mora na data da
  obra) e nunca o que a obra é (Mitologia, Conto de fadas e Folclore vão em
  `tipoObra`). Serve para situar obras sem autor único, como o mito de
  Prometeu (`tipoObra` Mitologia, `autores` vazio, `origemObra`
  `["Grécia"]`). Mesmas regras de comparação de `autores` (sem diferença de
  acento ou caixa, sem repetidos, vale a primeira grafia). A chave **só
  existe quando preenchida**: entrada sem ela não tem origem, então não leia
  a chave ausente como erro. Ela **não** entra na identidade da obra (título
  mais autores), por isso duas entradas da mesma obra podem discordar; o
  diálogo Corrigir obra avisa quando discordam. Texto livre, sem ligação com
  o cadastro de Locais. Vale em Intertextualidade e Hipertextualidade, não
  em Referências externas.
- **`descricao`**: o aposto que explica que obra é, para quem não a
  conhece ("canção de 1972 sobre o fim do verão"). É uma propriedade da
  obra, não da relação, então a mesma obra (mesmo tipo de obra, mesma
  obra, mesmo autor) costuma repetir a mesma descrição em várias entradas, e
  o app a sugere e, havendo uma só, a preenche sozinho. Quando a obra é uma
  carta ou conversa que o autor batizou, a descrição também diz o que
  aquilo é.
- **`trecho`**: as palavras do original, como aparecem na **fonte** (não
  como ficaram no texto do acervo). Em Citação os dois coincidem; em Alusão
  e Paráfrase o trecho da fonte é o que explica a que o texto se refere.
- **`traduzido`** (check "Traduzido", boolean): o texto traz o trecho
  traduzido do idioma da fonte. Vale para qualquer relação, por isso é um
  check e não um tipo. Tradução de **texto inteiro** não é este campo: vai
  para Hipertextualidade, relação "Tradução Adaptada".
- **`link`/`linkTexto`/`nota`**: opcionais. A `nota` diz como o texto se
  relaciona com a obra.
- **`dataAcesso`**: data opcional em que o `link` foi acessado, em ISO
  `"aaaa-mm-dd"` (aparece como "acesso em dd/mm/aaaa", o "Acesso em:" da
  ABNT). Só faz sentido com `link`: sem ele é descartada. A chave não existe
  quando vazia. Mesmo campo em Hipertextualidade, Anexos e na Fonte do texto
  (`fonteTexto.dataAcesso`).
- **`dataObra`** e **`dataObraAte`** (Data da obra e "Até"): o começo e o fim
  da data da obra, opcionais. Não confundir com `dataAcesso`, que é a data em
  que o link foi aberto. Veja "Data da obra ou do fato", mais abaixo.

**Entradas antigas.** Antes da remodelagem a entrada tinha só `tipo` e
`texto`. Na migração, `tipo` virou `tipoObra` e `texto` virou `obra`,
copiados como estavam, sem separar o conteúdo: por isso uma `obra` antiga
pode trazer título, autor e até a frase citada misturados ("Chico Buarque,
Construção"). Se encontrar isso, descreva o que vê, mas não presuma qual
parte é título e qual é autor. Pacotes e backups antigos que ainda trazem
`tipo` e `texto` são convertidos na importação.

**O que caracteriza Intertextualidade**: diálogo do texto com algo
externo ao arquivo, apontando para uma obra ou autoria **identificável e
nomeável**, em copresença com o texto (ver o critério acima). Um texto pode
ter várias entradas, de relações e tipos de obra diferentes, ao mesmo tempo.
A referência pode ser leve (uma alusão pontual) e não exige transformação
do texto.

**Epígrafe** não é uma relação aqui. É paratexto (pelo lugar que ocupa no
texto) e fica como etiqueta de Estilo. Um texto com epígrafe tirada de uma
obra pode ter as duas coisas: a etiqueta Epígrafe e uma entrada de
Citação.

**Citação não é Voz.** Trecho de obra ou de fala alheia trazido de fora
(epígrafe, letra de música, frase de livro) é Citação, aqui em
Intertextualidade. Quem fala na cena do texto é Voz, no campo Pessoas (ver
`pessoas-papeis-for-ai-pt-br.md`). Uma conversa reproduzida como turno de fala
da cena é Voz; tratada como documento (um print, uma conversa com data), é
Citação do tipo de obra Conversa.

## Hipertextualidade

Estrutura de cada entrada:

```json
{
    "tipoObra": "Livro",
    "relacao": "Paródia",
    "hipotexto": "Dom Casmurro",
    "autores": ["Machado de Assis"],
    "descricao": "romance de 1899",
    "dataObra": {
        "nivel": "ano",
        "ano": 1899,
        "aC": false,
        "aprox": false,
        "de": 1899,
        "ate": 1899
    },
    "link": "",
    "linkTexto": "",
    "dataAcesso": "",
    "nota": ""
}
```

- **`tipoObra`** (Tipo de obra): a mesma lista de sugestões de mídia da
  Intertextualidade, de propósito: é o mesmo tipo de artefato, só que aqui
  apontando para uma origem específica.
- **`relacao`**: a natureza da derivação, com sugestões próprias:
  Releitura, Tradução Adaptada, Paródia, Pastiche, Expansão,
  Redimensionamento, Homenagem, Transposição. Na Intertextualidade a
  `relacao` tem o mesmo papel (a natureza da relação), só com outra lista.
- **`hipotexto`**: o nome da obra de origem específica sendo transformada.
  É o equivalente de `obra` na Intertextualidade.
- **`autores`**: lista de etiquetas de texto livre com autocompletar, como na
  Intertextualidade.
- **`origemObra`**: a mesma lista opcional de lugares ou culturas da
  Intertextualidade.
- **`descricao`**: o aposto que explica que obra é, compartilhado com a
  Intertextualidade quando a obra é a mesma.
- **`dataObra`** e **`dataObraAte`**: a data da obra de origem, opcionais,
  como na Intertextualidade.
- Hipertextualidade tem `origemObra` (a mesma lista opcional), mas não tem `personagens`, `trecho` nem `traduzido`.

**Entradas antigas.** Antes, `tipo` fazia o papel de `tipoObra`. A migração
o converte, e `autores`, `descricao` e as datas ficam vazios.

**O que caracteriza Hipertextualidade, e a diferença para
Intertextualidade**: aqui o texto do acervo é o "hipertexto", uma
transformação ou derivação direta de um "hipotexto" de origem específico.
Não é só "conversa com" ou "cita", é "deriva de" ou "transforma". Regra
prática: se o texto **retrabalha, reescreve ou se apoia estruturalmente**
numa obra de origem específica (uma paródia, uma releitura, uma tradução
adaptada, uma homenagem), isso é Hipertextualidade; se é uma citação,
menção, alusão ou paráfrase de uma passagem (sem que o texto _seja_, em si,
uma transformação da obra), isso é Intertextualidade.

## Referências (Externas)

Estrutura de cada entrada:

```json
{ "tipo": "Marco histórico", "texto": "Enchente de 2011", "link": "", "linkTexto": "", "nota": "" }
```

- **`tipo`**: texto livre com sugestões (Marco histórico, Notícia, Pessoa
  pública, Outro).
- **`texto`**: a referência em si.
- **`dataObra`** e **`dataObraAte`**: a data do fato, opcionais, em qualquer
  `tipo`. Marco histórico: início e fim. Notícia: a data e o "até". Pessoa
  pública: nascimento e óbito (o óbito fica vazio para quem está viva).
  Veja a seção seguinte.

**O que caracteriza Referências (Externas), e a diferença para
Intertextualidade**: algo que ancora o texto num tempo ou mundo comum —
um fato, um evento, uma pessoa pública — **sem que haja uma obra ou
autoria sendo referenciada**. "Pessoa pública" é um tipo sugerido aqui
justamente porque, historicamente, esse campo nasceu de um tipo que
existia dentro de Intertextualidade e foi separado: citar uma pessoa
pública não é diálogo com uma obra dela, é uma âncora factual/de mundo.

Note que "Pessoa pública" aqui é **texto livre**, sem vínculo com o
cadastro central de pessoas (`db.pessoas`) — é diferente de uma pessoa
formalmente vinculada ao texto no campo `pessoas` (ver o documento sobre
Pessoas e Papéis). Se a pessoa mencionada tem um papel reconhecível na
gênese do texto (retratada, dedicatária, etc.) e está no cadastro
central, o vínculo correto é `pessoas`, não uma entrada aqui.

**Campos opcionais das entradas de "Pessoa pública".** Quando o `tipo` é
"Pessoa pública", a entrada pode levar também quatro campos opcionais,
gravados só quando preenchidos (outro `tipo` nunca os leva):

- **`conhecidoComo`**: lista de tags de texto livre que dizem o que a pessoa
  é ou foi conhecida como fora do texto (as sugestões são Figura histórica,
  Cantor(a), Escritor(a), Ator/Atriz, Político(a), Filósofo(a), Cientista,
  Artista visual, Atleta e Influenciador(a)). Uma pessoa costuma ser mais de
  uma coisa, e a tag pertence à entrada, então a mesma pessoa pode ter tags
  diferentes em outro texto, conforme a versão dela que o texto cita.
- **`genero`**: `Mulher`, `Homem` ou `Não-binário`. Registra só a identidade
  de gênero, não cis/trans.
- **`orientacao`**: `LGBT`, `Hétero` ou ausente.
- **`corRaca`**: `Branca`, `Preta`, `Parda`, `Amarela` ou `Indígena` (a lista
  de Autores e Pessoas).

**Ausente quer dizer "não informado", nunca "não é".** Uma entrada sem
`orientacao` não diz que a pessoa é hétero, e sem `genero` ou `corRaca` não
diz nada sobre ela. Não infira os valores ausentes nem os conte como
categoria. Os campos existem para o autor ver de que tipos de pessoa tira
suas referências; as exportações os levam junto do nome (o `.json` como
chaves, o `.md`, o PDF, o DOCX e a Visualização entre parênteses, o `.csv` nas colunas
`referencias_externas_conhecido_como`, `_genero`, `_orientacao` e
`_cor_raca`, alinhadas por posição às entradas).

## Data da obra ou do fato (os três campos)

Cada entrada de Intertextualidade, Hipertextualidade e Referências pode levar
até duas datas, nas chaves `dataObra` (o começo) e `dataObraAte` (o fim). As
duas são opcionais e a chave só existe quando há data: **ausente quer dizer
"não informada", nunca "sem data" nem "ainda vivo"**. Uma Pessoa pública sem
`dataObraAte` pode estar viva ou pode só não ter sido preenchida.

Cada ponta escolhe **um nível por vez** (século, década, ano, mês ou dia) e
leva duas marcas:

```json
{ "nivel": "seculo", "seculo": 20, "aC": false, "aprox": false, "de": 1901, "ate": 2000 }
{ "nivel": "decada", "decada": 1920, "aC": false, "aprox": false, "de": 1920, "ate": 1929 }
{ "nivel": "ano", "ano": 1922, "aC": false, "aprox": false, "de": 1922, "ate": 1922 }
{ "nivel": "mes", "ano": 1922, "mes": 2, "aC": false, "aprox": false, "de": 1922, "ate": 1922 }
{ "nivel": "dia", "ano": 1922, "mes": 2, "dia": 11, "aC": false, "aprox": false, "de": 1922, "ate": 1922 }
```

- **`nivel`**: o grau de precisão que o autor sabe. "séc. XX" quer dizer só
  "no século XX": não invente um ano mais preciso do que o nível.
- **`aC`**: `true` para antes de Cristo. O número do ano, da década e do século
  fica positivo; o sinal vai só em `de` e `ate`.
- **`aprox`**: `true` quando a data é aproximada ("aprox."). Só marca, não
  muda o intervalo.
- **`de`** e **`ate`**: o intervalo de anos que o nível cobre, com sinal e
  **sem ano zero** (1 a.C. é -1, 1 d.C. é 1). Séc. XX = 1901 a 2000; década
  de 1920 = 1920 a 1929; ano, mês e dia = o próprio ano; séc. V a.C. = -500 a
  -401. O app recalcula os dois a cada leitura e gravação. Para saber a época
  da obra, leia esse intervalo.

O que cada ponta quer dizer depende do tipo: Obra (Inter e Hiper) e Notícia, a
data e o "até"; Marco histórico, início e fim; Pessoa pública, nascimento e
óbito. O app escreve a data como "séc. XX", "década de 1920", "1922", "44 a.C.",
"02/1922" ou "11/02/1922", com "aprox. " na frente, e o par como "1920 até
1935" ("nasc. 1920, óbito 1977" para Pessoa pública).

A data é uma propriedade da **obra**, como a `descricao`: a mesma obra (mesmo
nome e mesmos autores, sem acento, caixa nem ordem) repete a mesma data em
várias entradas, e o app a sugere. Ele só a preenche sozinho quando as duas
pontas estão vazias e existe um único par de datas para a obra; com dois ou
mais, mostra os pares já usados para o autor escolher. Datas diferentes na
mesma obra não são um erro (podem ser edições diferentes), mas são um motivo
para conferir.

## Resumo comparativo

| Campo                  | Aponta para                             | Natureza do vínculo                                        |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Intertextualidade      | Uma obra/artefato específico e nomeável | Copresença: citação, menção, alusão, paráfrase, bricolagem |
| Hipertextualidade      | Um hipotexto de origem específico       | Derivação/transformação do texto inteiro                   |
| Referências (Externas) | Um fato, evento ou pessoa do mundo real | Âncora factual, sem obra/autoria envolvida                 |

E, fora deste grupo, mas frequentemente confundidos com ele:

| Campo                           | Aponta para                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Elos / Ecos (Intratextualidade) | Outro poema/prosa do próprio acervo                                            |
| Domínio Imagético (Etiquetas)   | Vocabulário/repertório de uma área de conhecimento, sem obra específica citada |

## O que isso significa na prática para uma IA lendo os dados

1. Antes de classificar uma menção externa encontrada no texto, pergunte:
   é uma obra/autoria nomeável (Intertextualidade ou Hipertextualidade) ou
   um fato/pessoa do mundo sem autoria de obra envolvida (Referências)?
2. Se for obra nomeável, aplique o teste: se a obra de origem saísse, o
   texto ainda existiria como é? Se sim, é Intertextualidade (escolha a
   relação: Citação, Menção, Alusão, Paráfrase ou Bricolagem). Se não, por
   ser derivado dela, é Hipertextualidade.
3. Não sugira mover uma entrada de "Pessoa pública" em Referências para o
   campo Pessoas — são coisas propositalmente distintas (uma é âncora de
   mundo em texto livre; a outra é vínculo estruturado com o cadastro
   central) — a menos que a tarefa peça explicitamente para cadastrar
   aquela pessoa formalmente.
4. Não confunda este grupo com Elos/Ecos (que são sobre outros textos do
   próprio acervo) nem com Domínio Imagético (que é repertório de uma
   área do conhecimento, não uma obra específica).
5. Ao ler uma entrada de Intertextualidade, não misture os campos: `obra`
   é só o título, `autores` e `personagens` (as duas, listas) dizem de quem,
   `origemObra` (lista, presente só quando preenchida) diz de que lugar ou
   cultura vem, `descricao` explica que obra é, `trecho` são as palavras da fonte,
   `dataObra` e `dataObraAte` dizem de quando é a obra e `relacao` é o que o
   texto faz com ela. Relação vazia quer dizer "nunca definido"; data ausente,
   "não informada".
6. Nas exportações, o `.md` e a tela Ver agrupam a Intertextualidade em dois
   níveis (relação, depois tipo de obra), com as entradas sem relação num
   bloco no fim; o `.csv` traz a coluna de leitura `intertextualidade` e uma
   coluna por campo (`intertextualidade_relacao`, `_tipo_obra`, `_obra`,
   `_autor`, `_origem`, `_personagem`, `_descricao`, `_trecho`, `_traduzido`,
   `_data_obra`, `_data_obra_ate`, e as equivalentes de Hipertextualidade; as
   Referências têm `referencias_externas_data` e `_data_ate`), com um valor
   por entrada separado por `|`. Na coluna `_autor`, os autores de uma mesma
   entrada vêm separados por `; `, e as colunas de data trazem o texto da data
   ("séc. XX", "1922"), um por entrada, com o lugar vazio mantido quando a
   entrada não tem data. No `.md` e no Ver, a data vem depois da obra, depois
   de " · ". O `.json` traz as chaves como estão: `autores` como lista e
   `dataObra` e `dataObraAte` como os objetos acima.
7. A aba Conexões tem uma seção **Fora do acervo** que reúne esses três campos
   de todos os textos, como uma lente (nada mora ali, o dado continua nas
   entradas). Ela baixa um relatório em `.md`, `.csv` ou `.pdf` (arquivos
   `fora-do-acervo*.md`, `.csv` e `.pdf`), com os blocos **Obras** (cada obra
   com os autores, o tipo, as datas, as relações com ×n quando se repetem, a
   descrição, as grafias e os textos), **Autores** (cada autor com as obras e os
   textos), **Origens** (cada origem, o lugar ou a cultura do campo Origem da
   obra, com as obras, os autores e os textos que a trazem; entrada sem origem
   fica em "Sem origem preenchida", sempre no fim), **Hipertextualidade** (de qual obra cada texto deriva),
   **Referências** (as que aparecem em dois textos ou mais, e as de um texto só)
   e **Avisos de quase-duplicatas**. A obra é identificada pelo nome mais os
   autores, sem acento, caixa, pontuação nem ordem. Obra com mais de uma data
   sai como "Datas diferentes". Um aviso de quase-duplicata é só uma dica de
   que duas grafias talvez sejam a mesma obra, não uma afirmação: confirme
   antes de tratá-las como uma. Uma linha "Filtro:" no começo do `.md` diz se o
   relatório estava filtrado. O filtro das listas de Obras, Autores e Origens
   aceita `campo:valor` (prefixos `texto:`, `obra:`, `autor:`, `origem:`,
   `tipo:`, `relacao:`, `data:` e `pessoal:`), `ou`, "frase exata", `-termo`
   para excluir e `campo:*` para campo preenchido (`-origem:*` deixa só o que
   está sem origem), e o relatório baixado usa o mesmo filtro. Em Autores e
   Origens o filtro vale para as obras dentro de cada item: `-pessoal:*` deixa
   a origem só com as obras não pessoais e o item só some quando não sobra
   nenhuma (os textos, as obras e as contagens são refeitos); o prefixo do
   nome da própria lista (`autor:`, `origem:`) e `pessoal:algumas` olham o
   item inteiro.
