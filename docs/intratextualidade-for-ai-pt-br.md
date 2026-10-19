# Intratextualidade (Elos e Ecos): como interpretar e preencher esse grupo

Este documento não pede nenhuma tarefa. Explica a lógica dos dois campos
do grupo "Intratextualidade (elos e ecos)" no modal de Poema/Prosa, para
que uma IA que receba dados exportados (ou que ajude a preencher o grupo)
distinga **Elos** de **Ecos**, escolha a **Relação** e a **Direção** certas
e não confunda esse grupo com os vizinhos.

Intratextualidade é sempre sobre o texto e **outros textos do próprio
acervo**, ligados por id. O que acontece com o **mundo fora do acervo**
(obras, pessoas públicas, fatos) fica no grupo "Transtextualidade e
Referências (Externas)", descrito em
`transtextualidade-referencias-for-ai-pt-br.md`.

Os dois campos têm a mesma forma de uso (escolher o texto-alvo, escolher
um tipo, nota opcional), mas medem coisas diferentes:

- **Elo**: relação **estrutural e bilateral**. Um dos textos deriva do
  outro, responde a ele, o substitui ou o continua. O par existe como par.
- **Eco**: ligação **mais solta e unidirecional**. Um texto reverbera
  outro (uma figura, uma imagem, um aceno), sem que um seja derivação do
  outro.

---

## Elos

Estrutura de cada entrada:

```json
{ "id": 456, "relacao": "Reescrita", "direcao": "destino", "texto": "" }
```

- **`id`**: o do **texto-alvo** (o outro lado do par). Não existe
  `poemaId`. Num texto de Poema, o alvo é sempre um Poema; num texto de
  Prosa, o alvo pode ser Poema ou Prosa.
- **`relacao`**: lista fechada. Reescrita, Continuidade, Tradução,
  Variação, Versão, Resposta, Díptico, Outro.
- **`direcao`**: o papel **deste texto** (aquele em cujo registro o Elo
  está gravado) no par.
    - `"origem"`: este texto é o mais antigo, a base.
    - `"destino"`: este texto é o derivado, o mais novo.
- **`texto`**: nota opcional sobre o Elo.

A direção nunca descreve o alvo, descreve quem está gravando. O rótulo
legível é derivado da combinação, não gravado:

| Relação      | Este texto é `origem` | Este texto é `destino` |
| ------------ | --------------------- | ---------------------- |
| Reescrita    | Reescrito em          | Reescrita de           |
| Continuidade | Continuado em         | Continuação de         |
| Tradução     | Traduzido para        | Tradução de            |
| Variação     | Variado em            | Variação de            |
| Versão       | Versão anterior de    | Versão oficial de      |
| Resposta     | Respondido em         | Resposta a             |
| Díptico      | Díptico com           | Díptico com            |
| Outro        | Outro                 | Outro                  |

Díptico e Outro não têm direção real (o par é simétrico ou indefinido),
então o rótulo é o mesmo dos dois lados.

### Como escolher a Relação

| Situação                                                                 | Relação      | Direção do texto que você está preenchendo                     |
| ------------------------------------------------------------------------ | ------------ | -------------------------------------------------------------- |
| Refiz o poema do zero ou quase, e o novo ocupa o lugar do velho          | Reescrita    | `origem` no velho, `destino` no novo                           |
| O segundo texto segue a história ou o gesto do primeiro                  | Continuidade | `origem` no primeiro, `destino` no segundo                     |
| Um texto é a passagem do outro para outro idioma (ambos no acervo)       | Tradução     | `origem` no original, `destino` na tradução                    |
| Mesma matriz, com mudanças deliberadas, sem que uma substitua a outra    | Variação     | `origem` na base, `destino` na variante                        |
| Dois estados do mesmo texto, um descartado ou superado e outro adotado   | Versão       | `origem` no anterior, `destino` no oficial                     |
| Um texto responde, rebate ou dialoga diretamente com o outro             | Resposta     | `origem` no que foi respondido, `destino` no que responde      |
| Dois textos pensados como par, lidos juntos, sem um vir claramente antes | Díptico      | sem direção real                                               |
| Existe vínculo estrutural, mas nenhuma das relações acima descreve       | Outro        | `origem`/`destino` se houver ordem; explique na nota (`texto`) |

Critério para decidir entre Reescrita, Variação e Versão: em **Reescrita**,
o novo texto é o que vale daqui em diante e o velho é o ponto de partida;
em **Variação**, os dois seguem existindo lado a lado como alternativas;
em **Versão**, os dois são estados do mesmo texto (um superado, outro
oficial), e o importante é qual deles foi adotado.

### Elo vs. Hipertextualidade

A pergunta é onde mora a origem. Se o texto-fonte **está no acervo**, a
relação é Elo (Reescrita, Tradução...). Se a fonte é uma obra **fora do
acervo** (um livro, uma música, um poema de outra pessoa), a relação é
Hipertextualidade (Releitura, Tradução Adaptada, Paródia...), no grupo
vizinho. Os nomes se parecem de propósito, mas os campos não se
substituem: uma tradução minha de um poema alheio que **não** está no
acervo vai em Hipertextualidade; a tradução de um poema meu que está no
acervo vai em Elo.

### Registrar o Elo em um lado só

O Elo é bilateral na leitura, mas gravado **em um lado por vez**. Se o
texto A tem um Elo para B e B não tem nenhum para A, o app **calcula** o
lado que falta e o mostra no modal de B ("Referenciado por (calculado,
sem elo cadastrado de volta)"), com o rótulo invertido (`direcaoInversa`).
Nada é gravado em B por causa disso. A aba Conexões lista como "buraco"
o Elo que só tem um lado. É pendência de catalogação, não erro de dado.

---

## Ecos

Estrutura de cada entrada:

```json
{
    "id": 111,
    "tipo": "Personagem em comum",
    "texto": "",
    "ancoras": [{ "especie": "personagem", "id": 10 }]
}
```

- **`id`**: o do **texto-alvo**, como no Elo.
- **`tipo`**: lista fechada. Personagem em comum, Pessoa em comum, Imagem
  central compartilhada, Aceno a, Outro.
- **`texto`**: nota opcional.
- **`ancoras`** (opcional): quem sustenta a ligação. Só existe nos dois
  tipos que a aceitam. Ver abaixo.
- **Sem `direcao`.** O Eco é sempre unidirecional, e a convenção do
  acervo é do **mais novo para o mais antigo**: o Eco é gravado no texto
  mais novo e o `id` aponta para o mais antigo. Não existe Eco "de volta".

### Como escolher o Tipo

| Situação                                                                                   | Tipo                         |
| ------------------------------------------------------------------------------------------ | ---------------------------- |
| O mesmo Personagem sustenta a ligação entre os dois textos                                 | Personagem em comum          |
| A mesma Pessoa (retratada, dedicatária...) sustenta a ligação                              | Pessoa em comum              |
| Uma imagem ou motivo central reaparece nos dois, sem relação de par entre os textos        | Imagem central compartilhada |
| O texto novo faz um gesto breve em direção ao antigo, sem exigir reciprocidade nem derivar | Aceno a                      |
| Há reverberação, mas nenhum dos tipos acima descreve                                       | Outro (explique na nota)     |

### Âncoras

- Só existem em dois tipos, e o tipo decide a espécie: **Personagem em
  comum** aceita âncoras de `"personagem"`, **Pessoa em comum** aceita
  âncoras de `"pessoa"`. Os outros tipos não têm âncora.
- Ao escolher a âncora no modal, a figura precisa estar vinculada aos
  **dois** textos. Se o vínculo sair de um dos textos depois, a âncora
  continua no Eco com um aviso, então confira nos dois textos antes de
  afirmar que a figura ainda está nos dois.
- Eco sem `ancoras` é válido: a ligação existe, o autor só não registrou
  quem a sustenta.
- Na exportação, cada âncora leva também `nome`, porque o id só vale no
  acervo de origem.

### Presença em comum não cria Eco

Dois textos que citam o mesmo Personagem ou a mesma Pessoa **não** têm,
por isso, um Eco entre eles. O Eco é leitura deliberada do autor. A
âncora só documenta o motivo de um Eco que ele já decidiu criar. O app
oferece, sob demanda, uma sugestão de Ecos faltantes, mas é só ajuda de
catalogação: o Eco só existe depois que o autor o cria.

---

## Elo ou Eco?

Pergunte, nesta ordem:

1. Um dos textos **deriva do outro, responde a ele, o substitui ou o
   continua**, ou os dois formam um par? Então é **Elo**.
2. O que existe é um **motivo, uma figura ou um gesto** que reverbera de
   um texto no outro, sem que um seja derivação do outro? Então é **Eco**.
3. O texto-fonte está **fora do acervo**? Então não é Intratextualidade:
   é Intertextualidade, Hipertextualidade ou Referências.

Um mesmo par de textos pode, em tese, ter um Elo e um Eco ao mesmo tempo
(uma reescrita que também retoma uma imagem, por exemplo), mas cada campo
responde a uma pergunta diferente. Não duplique a mesma informação nos dois.

## Resumo comparativo

| Campo | Aponta para           | Natureza do vínculo                          | Direção                                      |
| ----- | --------------------- | -------------------------------------------- | -------------------------------------------- |
| Elo   | Outro texto do acervo | Estrutural: derivação, resposta, versão, par | `origem`/`destino` (papel deste texto)       |
| Eco   | Outro texto do acervo | Solta: figura, imagem, aceno                 | Sempre mais novo para mais antigo, sem campo |

E, fora deste grupo, mas frequentemente confundidos com ele:

| Campo                                 | Aponta para                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Hipertextualidade (Transtextualidade) | Obra de origem **fora** do acervo que o texto transforma                     |
| Intertextualidade (Transtextualidade) | Obra ou autoria **fora** do acervo com que o texto dialoga                   |
| `pessoas` / `personagens`             | Cadastros centrais; o Eco só os usa como âncora                              |
| Domínio Imagético e outras Etiquetas  | Vocabulário ou repertório, sem ligar dois textos específicos                 |
| `es.ecos` (Sonoridade)                | Ecos **sonoros** (quase-rimas) dentro de um poema; nada a ver com este campo |

## O que isso significa na prática para uma IA lendo os dados

1. Identifique o alvo de um Elo ou Eco por `alvoTitulo`, não por `id`. O
   `id` só vale no acervo de origem. Se `alvoTitulo` faltar, o alvo não
   foi encontrado ou o arquivo é antigo.
2. Leia a `direcao` de um Elo como o papel **do texto que o contém**. Para
   saber o papel do alvo, inverta (`origem` vira `destino` e vice-versa).
3. Não infira Elo nem Eco por semelhança de tema, vocabulário ou
   Personagem. Ausência de Elo ou Eco significa "o autor não registrou",
   não "não existe", e não é um convite para criá-lo.
4. Um Elo com um lado só é normal. Não o trate como inconsistência nem
   sugira "corrigir" gravando o inverso, a menos que a tarefa peça.
5. Não sugira trocar Elo por Eco (ou o contrário) só porque os rótulos
   soam parecidos. Use o critério da seção "Elo ou Eco?".
6. Não confunda `conceitos.ecos` (este campo, vínculo entre textos) com
   `es.ecos` do registro de Sonoridade (ecos sonoros). Mesmo nome, campos
   diferentes. Se a chave `ecos` aparece dentro de `escansoes`, é o
   sonoro; se aparece dentro de `conceitos`, é este.
7. Não confunda este grupo com Hipertextualidade. Tradução, Reescrita e
   Resposta aparecem nos dois lados do vocabulário, mas aqui o texto-fonte
   está no acervo e lá está fora dele.
8. Se uma Pessoa ou Personagem aparece em `ancoras`, isso documenta o
   motivo do Eco. Não é o vínculo estruturado do texto com a figura (esse
   mora em `pessoas` e `personagens`).
