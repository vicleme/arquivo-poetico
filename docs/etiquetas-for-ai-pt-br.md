# Etiquetas: como interpretar esse campo

Este documento não pede nenhuma tarefa — explica a lógica das etiquetas do
acervo (chamadas "Etiquetas" na interface; antes, "Sinalizações", nome que ainda
aparece nas chaves dos campos, como `sinalizacoesEstilo`), para que uma IA que receba
dados exportados leia as tags pela categoria certa, sem misturar o que
cada uma quer dizer.

**Tema e Territorialidade não fazem mais parte das etiquetas.** Cada um tem
campo próprio (`temas`; `territorialidade` e `localEscrita`), descritos em
`campos-poema-prosa-for-ai-pt-br.md`. Ver "O que saiu das etiquetas", abaixo.

---

## O que o campo é (e o que não é)

Não existe um campo único de "etiquetas". "Etiquetas" é o nome do
**grupo**, mas por trás dele há **7 campos independentes**, um por
categoria, cada um uma lista de etiquetas do **cadastro de Etiquetas**
(`db.etiquetas`, cada registro `{ id, nome, categoria, notas }`). O
cadastro não é uma lista fechada de opções pré-definidas: quem cataloga
digita a etiqueta que quiser e ela entra no cadastro se ainda não existe,
com autocompletar sugerindo o que já foi usado na mesma categoria, pra evitar
variantes da mesma ideia. O mesmo nome pode existir em duas categorias (com
sentidos diferentes), mas dentro de uma categoria o nome é único, sem
considerar caixa nem acento.

Cada um desses 7 campos é, de fato, uma **lista** — aceita quantas
etiquetas fizerem sentido para o texto, não um valor único por categoria.
Isso importa para uma decisão recorrente: quando o texto carrega duas
coisas percebidas ao mesmo tempo (duas tradições, dois recursos de
estilo, duas sensações de Tom), o padrão é registrar cada uma como uma etiqueta própria
na lista — não fundir as duas num rótulo composto. Só vale fundir num
único rótulo quando a combinação é, ela mesma, uma sensação ou ideia
indivisível, que não é a soma das partes — em Tom, por exemplo, "Muito
meloso" não é "romântico" + "intenso" acontecendo em paralelo, é uma
textura de leitura própria, então funciona como uma etiqueta só. Fora esse
caso (ex.: um poema que é ao mesmo tempo melancólico _e_, num outro
trecho, esperançoso — duas sensações reais, mas distintas, não uma coisa
só), etiquetas separadas mantêm a lista mais útil para filtrar e cruzar
dados depois.

Os 7 campos:

| Campo (chave)                  | Rótulo            |
| ------------------------------ | ----------------- |
| `sinalizacoesTradicao`         | Tradição          |
| `sinalizacoesEstilo`           | Estilo            |
| `sinalizacoesRelacao`          | Relação           |
| `sinalizacoesSensibilidade`    | Sensibilidade     |
| `sinalizacoesTom`              | Tom               |
| `sinalizacoesDominioImagetico` | Domínio Imagético |
| `sinalizacoesOutros`           | Outros            |

Uma exportação "flat" combina tudo numa string única (`sinalizacoesCombinadas`)
para busca geral e estatísticas simples — mas essa versão combinada **perde
a categoria** de cada tag (e ainda pode arrastar os espelhos de Tema e
Territorialidade, que não são etiquetas; ver abaixo). Sempre que a tarefa
depender de saber a que categoria uma etiqueta pertence (ex.: "quais são os
tons mais comuns" vs. "quais são os recursos de estilo mais comuns"), use os
7 campos separados, não a string combinada.

## O que saiu das etiquetas: Tema e Territorialidade

Tema e Territorialidade já foram categorias de etiqueta. Hoje são **campos
próprios**, com cadastro e estrutura que uma etiqueta de texto livre não tem.
Não os procure entre as etiquetas e não proponha etiquetas desse tipo:

- **Tema** → `temas`: lista de `{ temaId, papel, nome }`, com `papel`
  `principal`, `secundario` ou vazio, ligada ao cadastro de Temas (que por sua
  vez se agrupam em Assuntos). É o assunto central do texto. Ao nomear ou
  revisar temas, vale o critério já adotado no acervo: nomear a **causa
  concreta**, não o efeito emocional — "Crise existencial cíclica" é mais vago
  do que o evento ou a situação que gera essa sensação. Um país só entra como
  Tema quando a própria nação é o assunto central (sua identidade, seu rumo, o
  que ela é), como num texto sobre o Brasil como país. Um período brasileiro,
  uma esfera social no Brasil ou um problema que acontece lá não bastam: esses
  usam Período Histórico Retratado, ou o Tema específico (ex.: Polarização,
  Corrupção sistêmica), junto com Territorialidade.
- **Territorialidade** → `territorialidade`: lista de lugares **presentes**
  no texto, seja por citação, seja por tratar deles (país, cidade, bairro,
  rio), ligada ao cadastro hierárquico de Locais. O lugar onde o texto foi
  **escrito** é outro campo, `localEscrita`, e a hierarquia exportada está em
  `locaisHierarquia`. Um poema que cita "Copacabana" ou "rio Amazonas", ou que
  trata do Brasil sem nomeá-lo (ex.: "esse país"), usa Territorialidade. Tema e
  Territorialidade são independentes e podem coexistir: um texto sobre o Brasil
  como nação tem Tema "Brasil" **e** Territorialidade Brasil, enquanto um texto
  sobre uma esfera social no Brasil tem só Territorialidade (mais o Tema
  específico). Também não é Domínio Imagético, que é vocabulário tomado de um
  campo de conhecimento, não um lugar.

`sinalizacoesTema` e `sinalizacoesTerritorialidade` ainda podem aparecer nos
dados exportados, mas só como **espelhos derivados** desses campos (nomes
separados por vírgula, sem papel, sem tipo e sem hierarquia). Não são
etiquetas, não se editam e não devem ser lidos como tal: use `temas` e
`territorialidade`. Uma exportação antiga, anterior aos campos próprios, pode
ter só o espelho.

## Como as etiquetas aparecem nos dados exportados

O texto guarda **ids** do cadastro, e o id só vale dentro do acervo que o
criou. Por isso cada saída traz a etiqueta de um jeito:

- **Backup completo (`.json` do banco inteiro):** cada campo é uma lista de
  ids, e o cadastro vem junto em `etiquetas` (com `nome`, `categoria` e
  `notas` de cada uma). Resolva o id por esse cadastro.
- **Exportações de textos (`itens`: seleção, exportação seletiva, tudo flat,
  baixar um texto):** cada um dos 7 campos é uma lista de **nomes**, pronta
  para ler. O cadastro não vai nesses arquivos, então a `nota` da etiqueta
  não está lá.
- **JSON aninhado (tudo aninhado e filtrado completo):** os campos trazem ids
  e a raiz do arquivo traz `etiquetas`, o cadastro para decifrá-los.
- **Arquivos antigos**, anteriores ao cadastro, podem trazer o campo como
  texto separado por vírgula. Leia cada pedaço como o nome de uma etiqueta.

Nunca invente ou presuma um id: se a tarefa pede uma etiqueta nova, proponha
o **nome** e a categoria. O app cria o registro no cadastro ao importar ou
salvar.

## Tag clusters: agrupamentos de etiquetas, que não ficam nos textos

Um **tag cluster** é um agrupamento de etiquetas de uma categoria, montado à mão (por exemplo, um cluster "Saúde" com as etiquetas de Domínio Imagético Medicina, Enfermagem e Oftalmologia). Existe para ler as Estatísticas por grupo em vez de por etiqueta. Classifica a **etiqueta em si**, não o uso dela no texto.

- **Não fica nos textos.** Nenhum campo de texto carrega cluster, e os modais não mostram. Não deduza cluster a partir de um texto nem grave um cluster num texto.
- **Onde mora.** O cadastro `tagClusters = [{ id, nome, categoria, notas, paiId? }]`, e cada etiqueta de `etiquetas` pode ter `clusterId`. A etiqueta está em **um cluster só, ou em nenhum** (o campo guarda um id apenas).
- **Subclusters (um nível só).** Um cluster com `paiId` é **subcluster** do cluster que esse id aponta, sempre da mesma categoria; subcluster não tem subcluster. O `clusterId` da etiqueta aponta para o lugar mais específico (o subcluster), e ela pertence ao pai por consequência; também pode ficar direto no pai. O nome é único entre irmãos: cluster de topo não repete outro de topo, subcluster não repete nome de topo nem de irmão, mas dois pais podem ter, cada um, um subcluster com o mesmo nome (por exemplo "Outros"). Nome nunca leva `>`.
- **Só da mesma categoria.** O cluster pertence a uma categoria e só aceita etiquetas dela. Seis categorias aceitam cluster: `dominioImagetico`, `tom`, `tradicao`, `estilo`, `relacao` e `sensibilidade`. `outros` não.
- **Onde aparece nos dados exportados.** O backup completo leva `tagClusters` e `clusterId`. As exportações de texto (`itens`) não levam cluster. A aba Tag clusters também importa clusters de um texto colado, uma linha `Cluster: etiqueta, etiqueta` por cluster, ou `Pai > Subcluster: etiqueta, etiqueta` para um subcluster (o pai é criado se faltar; um nível só) (categoria pelo seletor ou por um título `## Tom`; nunca cria etiqueta, e o relatório lista as que não achou). O cadastro tem download próprio, `tag-clusters.md`, na aba Tag clusters: uma seção por categoria, cada cluster de topo como `###` com as etiquetas dele e a contagem de textos, os subclusters aninhados embaixo como `####`, mais as etiquetas que ainda não têm cluster. A posição e o nível do título dizem quem está dentro de quem. O mesmo download sai também em `.png` e `.pdf` (o visual da aba; o `.pdf` é sempre claro, em páginas A4, e o texto dele não é selecionável), para o cadastro inteiro, para o que a tela mostra (busca e categoria) ou só para os cartões marcados em Selecionar; o nome do arquivo ganha `-filtrado` ou `-selecao` e uma linha no topo diz qual é o recorte.
- **Contagem.** O texto conta uma vez por cluster, mesmo com duas etiquetas do mesmo cluster. O pai conta a união dos textos dele e dos subclusters (cada texto uma vez, sem somar). Como um texto tem várias etiquetas, a soma dos clusters pode passar do total de textos.
- **Se pedirem para agrupar etiquetas.** Proponha os clusters pelo **nome** e pela categoria, e liste quais **nomes** de etiqueta entram em cada um. Só use subcluster quando o cluster tiver uns 6 a 8 etiquetas ou mais que se dividam em grupos de nome natural; nunca crie subcluster com uma etiqueta só nem passe de um nível. Nunca invente id. Cada etiqueta em um cluster só, sem misturar categorias, e deixe de fora a que não couber em vez de forçar.

## O que cada categoria significa

- **Tradição**: formas ou escolas poéticas herdadas de uma tradição — ex.:
  soneto, haicai, cordel. É sobre a forma vinda de fora, não sobre um
  recurso inventado pelo próprio texto (isso é Estilo).
- **Estilo**: um recurso formal ou estilístico específico do texto —
  jogos tipográficos, recursos de construção de verso, figuras de
  linguagem nomeadas de forma própria pelo acervo (ex.: "Rotação
  tipográfica" para um trecho que só lê de cabeça para baixo,
  "Paronomásia por espaçamento" para um espaço que isola uma raiz comum
  entre duas palavras). Tende a nomear a técnica, não o efeito.
- **Relação**: nomeia uma relação ou vínculo específico retratado no
  texto — pode ser o nome de uma dinâmica entre duas pessoas específicas
  (o acervo já usa etiquetas desse tipo, cunhadas pelo autor para nomear
  um par de pessoas e sua relação). Diferente de Pessoas+Papéis (que liga
  o texto a uma pessoa cadastrada com um papel fechado, ver o outro
  documento) — Relação é uma etiqueta livre sobre a natureza do vínculo em
  si, não um vínculo estruturado com `pessoaId`.
- **Sensibilidade**: tags soltas sobre conteúdo sensível de tipo
  categorizável (ex.: "Linguagem obscena"). Cuidado: isso é **diferente**
  do campo `conteudoSensivel`, que é um parágrafo descritivo à parte sobre
  conteúdo sensível — "Conteúdo sensível" deixou de ser uma tag dentro
  desta categoria e passou a ser **derivado** da simples presença (não
  vazia) desse outro campo. Não espere ver uma tag literal "Conteúdo
  sensível" dentro de Sensibilidade nos dados atuais do acervo.
- **Tom**: o registro emocional ou atitude percebida no texto (ex.: "Muito
  meloso"). Isso é um juízo/tom de leitura, não um recurso formal (isso
  seria Estilo) nem um tipo de conteúdo sensível.
- **Domínio Imagético** _(rótulo completo: "Domínio Imagético
  (repertório)")_: vocabulário ou imagética que o texto toma emprestado de
  um domínio de conhecimento inteiro — ex.: "Astrologia", quando o poema
  usa termos como Vênus/Trânsitos como registro geral, sem citar uma obra
  específica. A distinção importante é com **Intertextualidade** (ver o
  documento sobre o grupo Transtextualidade e Referências): Domínio
  Imagético é repertório/vocabulário emprestado de uma área de
  conhecimento; Intertextualidade é diálogo com **um artefato externo
  específico e nomeável** (uma música, um livro específico). Um poema que
  cita astrologia de forma genérica usa Domínio Imagético; um poema que
  cita um relatório astrológico específico e identificável usaria
  Intertextualidade.
- **Outros**: balde temporário para tags migradas que ainda não ganharam
  categoria própria no schema (hoje, por exemplo, reconhecimentos e
  variações/traduções que devem migrar futuramente para campos
  estruturados de Elos e Reconhecimentos). Não é uma 9ª categoria de
  sentido definitivo — é visibilidade temporária até essas tags virarem
  campos próprios. Ao interpretar, não presuma que tags aqui compartilham
  algum sentido comum entre si além de "ainda não tem lugar certo".

## Aprendizados de caso de uso/Convenções de acervo

Esta seção registra como o acervo costuma decidir em casos limite, a partir
da catalogação de textos reais. São convenções observadas, não regras
fechadas: podem ser revistas conforme novos textos forem catalogados, e uma
etiqueta que fuja delas continua sendo válida.

- **Paralelismo, Anáfora e Paralelismo antitético.** São etiquetas
  diferentes e podem aparecer juntas. "Paralelismo" é a repetição de um mesmo
  molde sintático entre versos ou estrofes; "Anáfora" é a repetição das
  mesmas palavras na abertura de versos ou estrofes; "Paralelismo antitético"
  só vale quando os membros paralelos se opõem entre si. Se o que se repete é
  o molde e o contraste não é o princípio que o organiza, a etiqueta é
  "Paralelismo" simples, sem qualificadores como "sintático" ou "estrutural".
- **Polissemia, Homonímia e Paronomásia.** "Polissemia" só vale quando uma
  palavra ativa dois sentidos relacionados ao mesmo tempo e o poema precisa
  dos dois (ex.: "globo" como mundo e como globo ocular). Não é a
  ambiguidade comum de qualquer palavra. Difere de "Homonímia" (sentidos sem
  relação entre si, como "nós" pronome e "nós" laço) e de "Paronomásia"
  (palavras de som parecido e sentidos diferentes).
- **Domínio Imagético: a especialidade, quando o vocabulário é todo dela.**
  Quando o texto toma emprestado o vocabulário de uma especialidade
  específica (ex.: o olho e a visão, "Oftalmologia"; gestação e parto,
  "Obstetrícia"), usa-se a especialidade, e não a área mais ampla
  ("Medicina/Enfermagem"), que fica para o vocabulário médico em geral. Antes
  de criar uma etiqueta nova, reaproveita-se uma existente quando ela já
  descreve bem o domínio.
- **Sensibilidade: conteúdo explícito e categorizável.** A categoria é
  reservada a conteúdo sensível retratado de forma explícita e que se encaixa
  num tipo (ex.: "Linguagem obscena", "Violência sexual"). Mencionar de
  passagem um assunto pesado, como depressão ou abuso, não gera etiqueta
  aqui; quando esse assunto é central no texto, ele é matéria de Tema. A
  categoria continua distinta do campo `conteudoSensivel`.
- **Tradição: confessional como padrão; social quando a crítica é o eixo.**
  "Poesia confessional" é a etiqueta usual para texto que nasce de
  experiência vivida, mesmo sem um eu lírico explícito ou um episódio
  narrado. "Poesia social" fica para textos em que a crítica social é o eixo
  (desigualdade, polarização, machismo, entre outros); uma única oração
  crítica dentro de um poema de outro assunto não basta.
- **Estilo: figuras e recursos, não categorias gramaticais.** O vocabulário
  de Estilo nomeia figuras de linguagem e recursos formais ou gráficos
  (ex.: "Anáfora", "Paronomásia", "Oxímoro", "Fusão lexical por diacrítico").
  Traços gramaticais, como o modo verbal ou o tipo de oração subordinada, não
  viram etiqueta de Estilo; quando relevantes, costumam já estar cobertos por
  um recurso maior, como o Paralelismo.

## O que isso significa na prática para uma IA lendo os dados

1. Sempre leia a tag junto da categoria (campo) em que ela está — o mesmo
   texto de etiqueta pode, em tese, aparecer em categorias diferentes com
   sentidos diferentes; a categoria é o que resolve a ambiguidade.
2. Não trate a lista de tags de uma categoria como fechada/enumerada — são
   valores livres, então uma tag "estranha" ou não vista antes não é erro,
   é só uma etiqueta nova.
3. Ao sugerir novas etiquetas, prefira reaproveitar uma já usada na mesma
   categoria (evitar variantes da mesma ideia) e nomear a causa concreta
   em vez do efeito emocional, seguindo o critério já adotado no acervo
   para Temas.
4. Não confunda Sensibilidade (tag categorizável) com o campo derivado de
   "conteúdo sensível" (presença de um parágrafo em `conteudoSensivel`) —
   são coisas diferentes que não devem ser somadas nem tratadas como
   sinônimos.
5. Cada campo é uma lista (múltiplos valores por texto): via de regra,
   registre aspectos ou sensações distintas como etiquetas separadas na
   mesma lista. Só proponha uma etiqueta composta/fundida quando a
   combinação for, ela mesma, uma ideia indivisível que não se reduz à
   soma das partes — quando em dúvida, prefira separar.
