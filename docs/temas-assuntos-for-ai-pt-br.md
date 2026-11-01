# Temas e Assuntos: como interpretar e como escolher

Este documento não pede nenhuma tarefa. Explica a lógica de Temas e Assuntos do acervo, para que uma IA que receba os textos (ou o cadastro) escolha e escreva esses campos do jeito que o app espera. O formato do arquivo que importa tudo isso está em `importar-campos-for-ai-pt-br.md`; aqui está o critério, não o formato.

---

## As três peças

Antes de qualquer regra, o que cada palavra quer dizer neste app:

- **Tema**: aquilo de que o texto trata, num nível amplo e reaproveitável ("Saudade", "Luto/Finitude", "Pressão estética"). Vive no cadastro de Temas e é o que o texto realmente guarda.
- **Assunto**: um agrupador de Temas ("Tempo, memória e perda" reúne Saudade, Despedida, Memória e outros). O texto **não guarda** Assunto: ele é **derivado** dos Temas do texto. Se um texto tem o Tema "Saudade" e "Saudade" pertence ao Assunto "Tempo, memória e perda", o texto passa a ter esse Assunto sem ninguém gravar nada.
- **Papel**: o peso que um Tema (ou um Assunto) tem naquele texto. Os valores são `principal`, `secundario` e indefinido (vazio).

## Como as peças se ligam

- Um Tema pode estar em **vários Assuntos** (N:N). No cadastro de fábrica, "Machismo" está em "Corpo, gênero e sexualidade" e em "Discriminação" de propósito.
- O Assunto lista seus Temas; o Tema não precisa saber em quais Assuntos está.
- **Assunto nunca é criado por importação.** Só existe o que já está no cadastro.
- **Tema novo é criado** quando o nome não existe, mas nasce **sem Assunto**. Enquanto ninguém ligar esse Tema a um Assunto, ele não gera Assunto em lugar nenhum. A ligação se faz na aba Temas, no modal do texto ou pela lista `ligacoes` do arquivo de importação (que vale para todos os textos com o Tema).

## Papéis

**Papel do Tema** (`principal`, `secundario`, indefinido):

- `principal`: o que o texto é, no fundo. `secundario`: aparece e importa, mas não é o eixo. Indefinido: o Tema está presente e ninguém decidiu o peso.
- Sem `papel` no arquivo, um Tema novo entra como indefinido e um Tema que o texto já tem **mantém** o papel que tinha.

**Papel do Assunto** herda do Tema, com controle da pessoa:

- Por padrão o Assunto segue o papel dos Temas do texto que pertencem a ele. Com vários Temas no mesmo Assunto, vale o papel **mais forte** (principal, depois secundário, depois indefinido).
- A pessoa pode fixar outro papel para um Assunto naquele texto (por exemplo, Tema principal com Assunto secundário). No arquivo de importação isso é o `papel` do item de `assuntos`.
- `automatico` devolve o Assunto a seguir o Tema. `indefinido` fixa o Assunto sem papel de propósito. `nao-se-aplica` tira o Assunto **daquele texto**, mesmo que um Tema dele pertença ao Assunto: serve quando um Tema está em dois Assuntos, mas o texto cabe só em um.
- Na dúvida, **não fixe papel de Assunto**: deixe `automatico` (ou omita o campo `assuntos`) e o Assunto segue os Temas.

## O que é Tema e o que não é

- **Não é lugar.** Um lugar citado é Territorialidade ("Brasil", "Santos"). "Brasil" como nação ou identidade, tratada como ideia, pode ser Tema; o rio, a cidade ou o bairro que aparecem no texto não.
- **Não é pessoa nem personagem.** Quem aparece no texto vai em Pessoas ou Personagens.
- **Não é etiqueta.** Etiquetas descrevem **como** o texto é feito ou de onde vem (Tradição, Estilo, Tom, Domínio Imagético e outras). Tema é **do que** ele trata. "Astrologia" como vocabulário usado é Domínio Imagético; "destino" ou "determinismo", se o texto discute isso, é Tema. "Irônico" é Tom, nunca Tema.
- **Não é resumo.** Tema não é uma frase sobre o texto. É um rótulo curto que outros textos também poderiam ter, porque o valor do campo está em agrupar, contar e comparar.

## Valência do Tema

Cada Tema do cadastro pode ter uma **valência**: o quanto o assunto dele é agradável ou desagradável. É um campo do **cadastro de Temas**, não do texto: vale igual para todo texto que tem o Tema. Os valores são `agradavel`, `neutro`, `desagradavel` e `ambivalente`; sem valência quer dizer "ainda não classificado".

- **Descreve o afeto do tema, não um juízo moral.** Luto e violência são desagradáveis; amizade é agradável. Luto é desagradável sem ser "ruim", e um poema de denúncia sobre violência continua tratando de um tema desagradável.
- **Ambivalente** é o que pesa e alivia ao mesmo tempo (saudade, amor, memória, desejo). Não use Neutro para isso: Neutro é o que de fato não pesa nem alivia (cotidiano, paisagem).
- A valência **não diz como o texto trata** o tema (isso é Tom, uma etiqueta). "Amizade" num poema de traição segue agradável no cadastro.
- Ao sugerir valência para vários Temas, trate como **sugestão para a pessoa revisar**, nunca como dado pronto. Na dúvida entre dois valores, prefira Ambivalente a forçar Agradável ou Desagradável, e deixe sem valência o Tema que você não conhece.
- **Formato para entregar valências à pessoa.** Quando ela pedir valência para vários Temas, devolva uma lista de blocos `Valência: Tema; Tema`, um bloco por valência, com os nomes exatamente como o cadastro os escreve, para ela colar em "Definir por lista" (campo Valência) na aba Temas. Exemplo: `Desagradável: Luto; Violência simbólica` e, na linha de baixo, `Agradável: Cotidiano; Amizade`. Os cabeçalhos aceitos são Agradável, Neutro, Desagradável e Ambivalente (com ou sem acento e maiúscula), e `Sem valência:` limpa a valência. Coloque cada Tema em **um bloco só**: um Tema em duas valências é conflito e o app o deixa de fora. O app **nunca cria Tema**: um nome que não está no cadastro vai para o relatório e nada é gravado para ele. Um Tema com vírgula no nome ("Amor, perda") vale como foi escrito, sem vírgula sobrando no fim.
- **Lista por assunto ou por vitrine.** O mesmo bloco "Definir por lista" tem o campo Assunto e o campo Vitrine. Para ligar Temas a Assuntos, devolva blocos `Nome do assunto: Tema; Tema` (um bloco por assunto, com os nomes exatamente como o cadastro os escreve); para a vitrine, `Nome do convite: Tema; Tema`. Nesses dois campos a lista **só acrescenta**: o Tema entra no assunto ou no convite sem sair de nenhum outro, e o mesmo Tema pode aparecer em mais de um bloco. O app não cria Tema, assunto nem convite: o que não existe vai para o relatório.
- Os arquivos de **Importar campos** não trazem valência: ela se define na aba Temas (um a um, em massa, por lista ou pelo botão "Aplicar valências sugeridas"). O JSON de exportação a leva em cada tema do texto e a Importação Aditiva só preenche a valência de um Tema que ainda não tem uma.

## Vitrine de leitura e o sorteio de leitura

A **Vitrine de leitura** é o conjunto de **convites** para quem lê; cada convite (por exemplo "Quando o amor acaba") reúne vários Temas do cadastro. Antes se chamava "tema universal", e a chave do dado continua `temasUniversais`. Existe só para o sorteio de leitura (a página "Sortear leitura", em Ferramentas).

- **Não é Assunto nem é campo do texto.** O Assunto organiza o cadastro e não tem limite; o convite pertence à vitrine, são no máximo 12, e o texto nunca o guarda: o texto continua tendo só Temas, e o universal os alcança pelos Temas que reúne. Um Tema pode estar em mais de um universal.
- Um convite é só um nome e uma lista de Temas **que já existem no cadastro**. Nunca invente um Tema para encaixar num convite.
- Ao sugerir convites ou os Temas de cada um, trate como **sugestão para a pessoa revisar**. Prefira nomes de convite curtos e em linguagem de leitor, não de catálogo.
- Quem decide quais textos podem ser sorteados é o autor, pela marca `sorteavel` do texto (ver `campos-poema-prosa-for-ai`). Nunca marque por conta própria.
- Na aba **Temas**, cada cartão tem o seletor "Adicionar à vitrine…" (só com os convites que ainda não reúnem o Tema) e um selo por convite em que o Tema já está; o filtro **Só sem vitrine** (só aparece quando existe algum convite) lista os Temas que nenhum convite reúne, com a mesma triagem do "Só sem assunto", e a edição em massa tem "Adicionar à vitrine". Tudo isso só acrescenta Temas a convites existentes, nunca cria convite nem Tema.
- Arquivos de **Importar campos** e a Importação Aditiva não trazem convites: eles se montam no bloco "Vitrine de leitura" da aba Assuntos. O JSON de backup os leva (`temasUniversais`).

## Como nomear

- Escreva o nome como o cadastro já escreve: primeira letra maiúscula, resto em minúsculas ("Resiliência emocional", "Pressão estética"). Para dois conceitos que andam juntos, uma barra, sem espaços ("Luto/Finitude", "Desigualdade social/Pobreza").
- **A vírgula é aceita no nome de um Tema, mas prefira barra ou reformule.** O nome vale como foi escrito: "Amor, perda" é um Tema só, nunca dois. Os únicos caracteres que um nome não pode ter são `;` e `|`, que o app troca por espaço porque são os separadores: o `;` separa vários Temas na digitação (e nos filtros de Tema da aba Exportação), e o `|` separa os Temas na coluna `sinal_tema` do `.csv`. No `.md` e na Visualização do texto os Temas vêm separados por vírgula, e por ponto e vírgula quando algum deles tem vírgula no nome, então uma vírgula no nome deixa essas linhas mais difíceis de ler. No JSON, `temas` é uma lista, e nada fica ambíguo.
- A comparação ignora caixa e acento: "saudade" e "Saudade" são o mesmo Tema.
- **Reaproveite o que existe.** O app só reconhece igualdade por caixa e acento. Plural ("Memória" e "Memórias"), hífen, sinônimo ("Efemeridade" e "Transitoriedade") e variação de grafia viram **Temas duplicados**, que depois precisam ser mesclados à mão.
- "Luto" e "Luto/Finitude" não são duplicata: um é o geral e o outro o específico. Mesmo assim, não crie o específico se o cadastro já tem um que serve.

## Como escolher os Temas de um texto

Orientação padrão. A pessoa pode calibrar, normalmente com uma amostra de textos analisados juntos, e o que ela decidir ali vale mais do que isto.

1. Leia o texto inteiro antes de escolher. Tema vem do que o texto faz, não de uma palavra que aparece nele.
2. Procure primeiro no vocabulário que veio com o arquivo (ou na exportação de Assuntos). Só proponha Tema novo se **nenhum** existente serve, e diga por quê.
3. Poucos Temas por texto. Um texto com dez Temas não tem Tema nenhum. Marque `principal` só no que sustenta o texto e `secundario` no que é importante mas lateral; o resto, indefinido ou fora.
4. Em texto ambíguo, escolha menos. Campo vazio é um estado válido, e Tema chutado contamina contagens e Estatísticas.
5. Não use o contexto do autor para inventar tema que o texto não tem. Biografia ajuda a entender, não a preencher.
6. Poema e prosa seguem o mesmo critério. Prosa longa pode ter mais de um eixo, e ainda assim vale a regra de poucos Temas.

## Como escolher os Assuntos

- Só entram Assuntos que **já existem** e que têm **algum Tema do texto** entre os seus. Em geral basta escolher os Temas certos: os Assuntos aparecem sozinhos.
- Use o campo `assuntos` do arquivo só para o que muda o padrão: fixar um papel diferente do herdado, ou `nao-se-aplica` num texto em que um Tema compartilhado não cabe naquele Assunto.
- Tema novo que você propõe **não tem Assunto ainda**. Ligue-o a um Assunto que já existe pela lista `ligacoes` do mesmo arquivo (`{ "tema": "Nome", "assunto": "Nome" }`). Assim ele já vale no campo `assuntos` dos textos do arquivo e nos outros textos que ele tiver. Se nenhum Assunto existente serve, diga isso à parte, em vez de inventar um: a importação não cria Assunto.

## Duas tarefas diferentes

1. **Classificar textos** (preencher Temas e Assuntos de textos que já existem): entregar o `.json` de "Importar campos", com os nomes do vocabulário.
2. **Organizar Temas soltos** (agrupar em Assuntos os Temas que ainda não pertencem a nenhum): a aba Assuntos tem o botão **Baixar .md**, que exporta cada Assunto com seus Temas (e a contagem de textos de cada um) e a seção "Temas sem assunto". A aba Temas tem o seu próprio **Baixar .md**, com cada Tema, a contagem de textos, a valência (quando classificada), os Assuntos a que pertence, os convites da Vitrine de leitura em que está ("Vitrine:") e a nota, separados em "Temas com assunto" e "Temas sem assunto", e termina com a seção "Vitrine de leitura" (cada convite e os Temas que reúne), quando existe algum convite. O bloco "Vitrine de leitura" da aba Assuntos tem o seu próprio **Baixar .md** (`vitrine.md`): cada convite com os Temas que reúne e, no fim, "Temas fora da vitrine", os mais usados primeiro, com a contagem de textos de cada Tema; serve para pedir a uma IA em que convite cada Tema solto caberia. Com esse arquivo, a resposta útil é um `.json` só com `ligacoes` (e `textos` vazio), que a importação lê e mostra na prévia. Um Tema que não cabe em nenhum Assunto existente fica de fora, listado à parte.

Em qualquer das duas, nada é gravado sem a pessoa ver a prévia, e a importação tira um snapshot de segurança e permite desfazer.

## Armadilhas frequentes

- Misturar Territorialidade com Tema (lugar citado virar Tema).
- Misturar Etiqueta com Tema (Tom, Estilo ou Domínio Imagético virando Tema).
- Duplicar por variação de grafia, plural ou sinônimo.
- Marcar `principal` em tudo. Sem contraste, o papel perde o sentido.
- Pôr no campo `assuntos` um Assunto que não existe, ou que nenhum Tema do texto alcança: vai para o relatório e fica de fora.
- Criar um Tema novo e usá-lo em `assuntos` sem ligá-lo em `ligacoes`: o Tema ainda não pertence a Assunto algum, e o Assunto vai para o relatório.
- Pôr em `ligacoes` um Assunto que não existe: a importação não cria Assunto, e a ligação fica de fora.
- `;` ou `|` dentro do nome de um Tema (o app troca por espaço), ou vírgula onde uma barra ou uma reformulação resolveria.
