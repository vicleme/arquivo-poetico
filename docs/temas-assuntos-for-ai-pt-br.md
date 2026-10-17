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

## Como nomear

- Escreva o nome como o cadastro já escreve: primeira letra maiúscula, resto em minúsculas ("Resiliência emocional", "Pressão estética"). Para dois conceitos que andam juntos, uma barra, sem espaços ("Luto/Finitude", "Desigualdade social/Pobreza").
- **Vírgula não pode existir em nome de Tema** (é o separador interno). Use barra ou reformule.
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
2. **Organizar Temas soltos** (agrupar em Assuntos os Temas que ainda não pertencem a nenhum): a aba Assuntos tem o botão **Baixar .md**, que exporta cada Assunto com seus Temas (e a contagem de textos de cada um) e a seção "Temas sem assunto". Com esse arquivo, a resposta útil é um `.json` só com `ligacoes` (e `textos` vazio), que a importação lê e mostra na prévia. Um Tema que não cabe em nenhum Assunto existente fica de fora, listado à parte.

Em qualquer das duas, nada é gravado sem a pessoa ver a prévia, e a importação tira um snapshot de segurança e permite desfazer.

## Armadilhas frequentes

- Misturar Territorialidade com Tema (lugar citado virar Tema).
- Misturar Etiqueta com Tema (Tom, Estilo ou Domínio Imagético virando Tema).
- Duplicar por variação de grafia, plural ou sinônimo.
- Marcar `principal` em tudo. Sem contraste, o papel perde o sentido.
- Pôr no campo `assuntos` um Assunto que não existe, ou que nenhum Tema do texto alcança: vai para o relatório e fica de fora.
- Criar um Tema novo e usá-lo em `assuntos` sem ligá-lo em `ligacoes`: o Tema ainda não pertence a Assunto algum, e o Assunto vai para o relatório.
- Pôr em `ligacoes` um Assunto que não existe: a importação não cria Assunto, e a ligação fica de fora.
- Vírgula dentro do nome de um Tema.
