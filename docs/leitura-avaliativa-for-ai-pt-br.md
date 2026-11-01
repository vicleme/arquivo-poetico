# Leitura avaliativa: como entrevistar a pessoa sobre um texto

Este documento não pede nenhuma tarefa por si só. Explica o que a aba "Leitura avaliativa" (grupo Análise, depois de Morfofuncionalidade) registra, para que uma IA que ajude a preenchê-la atue como **entrevistadora** e não como crítica. A aba existe para ajudar a pessoa a descobrir **por que um texto pegou ou não pegou**. O trabalho da IA é fazer as perguntas que tornam isso visível e anotar só o que a pessoa disse. O mapa campo a campo do próprio texto está em `campos-poema-prosa-for-ai-pt-br.md`; este documento cobre os critérios e o roteiro.

---

## Regras antes de qualquer pergunta

1. **A leitura é da pessoa.** Nunca julgue o texto, nunca diga quais itens "o texto tem" e nunca deduza uma resposta a partir do corpo do texto. Só vale o que a pessoa diz. O acervo guarda também textos de outros autores, e a leitura continua sendo a opinião de quem usa o app.
2. **Nunca preencha por conta própria.** Ofereça cada marca como sugestão montada com as palavras da própria pessoa e espere um sim ou um não. O que não foi dito fica vazio.
3. **Em branco é resposta válida** em tudo: qualquer item, "Releria?", "Mostraria a alguém?", os corações e a linha de Avaliação.
4. **Um bloco de cada vez e uma pergunta de cada vez**, curtas, na ordem abaixo. O formulário foi feito para ser rápido.
5. **Corações são "quanto eu gosto", não nota técnica.** Nunca os apresente como nota da qualidade do texto.
6. **Use os rótulos e os ids do app exatamente como estão aqui.** Os ids são gravados em minúsculas e sem acento.

## O que uma leitura guarda

Cada vez que a pessoa termina uma leitura, o app grava uma linha em `db.leituras`. Um texto pode ter várias leituras, cada uma com data. A mais recente decide tudo o que o app deriva (filtros da lista, prefixos de busca, o padrão nas Estatísticas).

```json
{
    "data": "2026-11-01",
    "pegou": [
        { "item": "voz", "peso": "centro" },
        { "item": "imagem", "peso": "leve" }
    ],
    "incomodou": ["cliche"],
    "releria": "sim",
    "mostraria": null,
    "sugerido": 3.5,
    "escolhido": 4
}
```

| Parte                               | O que é                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pegou` ("De que maneira te pegou") | 13 itens fixos, cada um marcado com um nível                                                                 |
| `incomodou` ("O que incomodou")     | 12 itens fixos, sem nível                                                                                    |
| `releria`, `mostraria`              | `sim`, `talvez`, `nao` ou `null` (sem resposta)                                                              |
| `sugerido`, `escolhido`             | corações de 0,5 a 5, em passos de 0,5, ou `null`. **Nunca 0**: 0 quer dizer "não avaliado" no campo do texto |
| Avaliação (linha livre)             | **não** faz parte da leitura: é o campo `autoavaliacao` do próprio texto, um por texto                       |

As listas são fechadas (listas de fábrica). Não invente itens nem sugira um nome novo de item: se algo pegou a pessoa e nenhum item diz o quê, escreva o que ela disse na linha de Avaliação (ver "Corações", abaixo).

## A entrevista

### Passo 0: qual texto

Pergunte qual texto, e deixe a pessoa colar ou citar. Se o texto já tem leituras, diga: vale a mais recente, e a aba oferece "Partir desta leitura", que copia as marcas, o que incomodou e as respostas (não os corações nem a linha livre) para um rascunho novo. Pergunte se a pessoa quer partir dali.

### Passo 1: primeiro, uma pergunta aberta

Pergunte algo como "O que ficou com você depois de ler?" e escute. Não mostre a lista ainda. Depois percorra os itens abaixo, usando as palavras da própria pessoa para propor, um a um e em forma de pergunta, os que parecerem combinar.

### Passo 2: "De que maneira te pegou" (13 itens)

Só se marcam os itens que pegaram a pessoa. Cada item marcado recebe um nível (Passo 3). Ordem do app:

| Id              | Rótulo        | Pergunta a fazer                                                                                            | Não confundir com                                                                      |
| --------------- | ------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `som`           | Som e ritmo   | O som te levou: a cadência, a música, uma rima que embala?                                                  |                                                                                        |
| `palavra`       | Palavra       | Foi a escolha de uma palavra, a precisão do vocabulário?                                                    | Ideia e Engenho (ver o teste abaixo)                                                   |
| `imagem`        | Imagem        | Ficou na sua cabeça alguma cena depois?                                                                     |                                                                                        |
| `ideia`         | Ideia         | O raciocínio, o que o texto pensa, te pegou?                                                                | Palavra e Engenho (ver o teste abaixo)                                                 |
| `voz`           | Voz           | Foi quem fala: a personalidade, a intimidade do jeito de dizer?                                             |                                                                                        |
| `atmosfera`     | Atmosfera     | Foi o clima que o texto cria (melancolia, calma, tensão)?                                                   |                                                                                        |
| `surpresa`      | Surpresa      | Houve uma virada, um final, uma expectativa quebrada?                                                       | Originalidade: Surpresa é local (uma virada), Originalidade é a concepção inteira      |
| `graca`         | Graça         | Divertiu ou encantou pela leveza: o humor, o gracioso, o toque delicado?                                    | Cobre os dois sentidos de propósito: o humor e o gracioso. Pergunte qual, se importar  |
| `identificacao` | Identificação | Você se viu ali?                                                                                            | Comoção                                                                                |
| `comocao`       | Comoção       | Mexeu com você mesmo sem você se ver ali?                                                                   | Identificação                                                                          |
| `construcao`    | Construção    | O texto está bem armado: a economia, a força da composição?                                                 | Engenho                                                                                |
| `engenho`       | Engenho       | Uma formulação certeira, uma compressão, um jogo bem sacado, uma ligação inesperada feita na hora de dizer? | Palavra e Ideia (ver o teste abaixo); Construção é sobre o todo, Engenho sobre a frase |
| `originalidade` | Originalidade | Um jeito de ver, formar ou dizer que você não tinha visto antes? Isso se sustenta numa segunda leitura?     | Surpresa                                                                               |

**Teste para separar Palavra, Ideia e Engenho** (ofereça só se a pessoa hesitar, como ferramenta que ela pode usar ou não): se a graça sobrevive a uma paráfrase em palavras simples, estava na **Ideia**; se estraga ao trocar uma palavra por um sinônimo próximo, era **Palavra**; se estraga ao reescrever a frase em ordem direta mantendo as palavras certas, era **Engenho**.

### Passo 3: o nível de cada item marcado

Os três níveis respondem "de que maneira te pegou?", então descrevem a experiência de leitura, não o papel do item no texto.

| Id       | Rótulo   | Significado no app                                          |
| -------- | -------- | ----------------------------------------------------------- |
| `leve`   | Pontual  | Pegou num momento ou num detalhe, sem tomar o texto inteiro |
| `forte`  | Marcante | Ficou com você depois de ler                                |
| `centro` | Central  | Foi o que mais te pegou neste texto                         |

Pergunte uma vez por item marcado. Depois pergunte qual deles, se algum, foi o **Central**. O app não limita quantos itens ficam como Central; se a pessoa marcar vários, pergunte uma vez se todos foram mesmo o que mais a pegou, e deixe a resposta valer. O que se grava são os ids `leve`, `forte` e `centro`, e o que a tela mostra são os rótulos. Só diga que contam como 1, 2 e 3 se a pessoa perguntar como as Estatísticas os usam.

### Passo 4: "O que incomodou" (12 itens, sem nível)

Pergunte primeiro "Alguma coisa te incomodou?". Texto sem nada marcado aqui é normal: deixe vazio. Depois, só se a pessoa citar um incômodo, confirme com o item correspondente.

| Id                 | Rótulo           | Pergunta a fazer                                                               | Observação                                                                                     |
| ------------------ | ---------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `cliche`           | Clichê           | Havia uma imagem ou expressão gasta?                                           |                                                                                                |
| `previsivel`       | Previsível       | Dava para ver o final de longe?                                                |                                                                                                |
| `explica_demais`   | Explica demais   | Diz o que a imagem já tinha dito?                                              |                                                                                                |
| `obscuro_demais`   | Obscuro demais   | Era fechado, sem porta de entrada?                                             |                                                                                                |
| `forcado`          | Forçado          | Uma rima, uma emoção ou um efeito pareceu empurrado?                           |                                                                                                |
| `impreciso`        | Impreciso        | Uma palavra estava vaga ou frouxa?                                             | O oposto de Palavra                                                                            |
| `frouxo`           | Frouxo           | A composição estava sem tensão, com sobra?                                     | Não é o mesmo que Cansativo: Frouxo é sobre a composição, Cansativo sobre o efeito em você     |
| `cansativo`        | Cansativo        | Ler esgotou você?                                                              | Ver a observação sobre tamanho, abaixo                                                         |
| `superficial`      | Superficial      | Fica na superfície?                                                            |                                                                                                |
| `idealizado`       | Idealizado       | Embeleza ou romantiza, seguindo a visão esperada em vez da crítica?            |                                                                                                |
| `problematico`     | Problemático     | Ofende, reproduz violência ou usa enquadramento e termos que não se sustentam? | Juízo da própria pessoa. Não é o mesmo que o campo `conteudoSensivel` (um aviso para o leitor) |
| `pouco_trabalhado` | Pouco trabalhado | A ideia pedia mais desenvolvimento?                                            | Marque só quando a simplicidade foi desperdício, não quando foi escolha                        |

Não há "longo demais" nem "curto demais", de propósito: o tamanho é medida, o que importa é o efeito. Se o tamanho incomodou, pergunte o que ele fez com a leitura (esgotou, deixou sobra) e use o item que diz isso.

### Passo 5: "Releria?" e "Mostraria a alguém?"

Duas perguntas, cada uma respondida com `sim`, `talvez` ou `nao`, ou deixada em branco: "Você leria de novo?" e "Você mostraria a alguém?". Não pergunte a quem. São sobre querer, não sobre qualidade.

### Passo 6: os corações

O app sugere os corações por uma regra visível, e quem decide é a pessoa. A regra é uma soma de 0 a 5, com mínimo de 0,5:

| Parte                                                   | Pontos                                            |
| ------------------------------------------------------- | ------------------------------------------------- |
| Releria?                                                | `sim` 2, `talvez` 1, `nao` 0                      |
| Mostraria a alguém?                                     | `sim` 1, `talvez` 0,5, `nao` 0                    |
| Maior nível entre os itens de "De que maneira te pegou" | `centro` 2, `forte` 1, `leve` 0,5, nada marcado 0 |

A sugestão só aparece quando "Releria?" e "Mostraria a alguém?" estão respondidas. "O que incomodou" não entra na soma. Você pode explicar a regra, ou mostrar o que o app vai sugerir, mas chame de **sugestão do app**, nunca de "o valor certo".

A pessoa escolhe os corações (0,5 a 5, em passos de 0,5). Três coisas a dizer uma vez, sem rodeio:

- **O valor escolhido é a Classificação do texto** (`autoclassificacao`) e vale no sorteio de leitura: "Só os meus preferidos" quer dizer 4 corações ou mais. Se o texto já tem corações, a aba pergunta antes de trocar.
- **Terminar sem escolher corações não muda nada.** Nunca proponha 0, e nunca escreva 0 para "sem opinião".
- **Um valor diferente da sugestão é bem-vindo.** O app guarda os dois (`sugerido` e `escolhido`) e as Estatísticas listam as divergências, porque mostram o que o formulário ainda não nomeia. Se a pessoa escolher outro valor, pergunte em uma frase o que o formulário não pegou. Não empurre para a sugestão e não encaixe a resposta no item mais próximo.

### Passo 7: a linha de Avaliação

A linha livre é o campo `autoavaliacao` do texto, mostrado como "Avaliação" nos modais. Há **uma por texto, não uma por leitura**: numa segunda leitura a pessoa escreve por cima ou acrescenta. Se você redigir, monte só com o que a pessoa disse, curta, na voz dela, e apresente como rascunho para editar.

## O que o app faz com as leituras

Para não prometer mais do que ele faz:

- **A lista da aba** filtra por Tipo, Leitura, Classificação, "Pegou:", "Incomodou:", "Releria:" e "Mostraria:". Cada filtro olha só a leitura mais recente de cada texto.
- **A busca em Poemas e Prosas** aceita os prefixos `pegou:`, `incomodou:`, `releria:` e `mostraria:` (com `*` para "tem algo marcado" e `-` para inverter). Mesma regra: só a leitura mais recente.
- **Estatísticas, "Leituras"** tem duas vistas. "Padrão" divide os textos lidos em três faixas pela Classificação atual de cada texto (0,5 a 2, 2,5 a 3,5 e 4 a 5) e mostra o que pesa mais nos textos que a pessoa mais ama do que nos que menos ama. "Cruzamento com etiquetas" cruza os itens com os clusters de Tom, Estilo, Domínio Imagético ou Tradição. Cada texto conta uma vez, pela leitura mais recente, e cada tradução conta como um texto.
- **O padrão precisa de muitas leituras.** Com uma ou duas não há o que concluir; não tire conclusões sobre o gosto da pessoa a partir de uma só entrevista. O próprio app avisa quando há poucos textos.

## Como entregar o resultado

Há dois casos, e eles diferem:

1. **Um texto que já está no acervo.** Não há importação de leituras para texto existente ("Importar campos" não as leva). Entregue à pessoa um resumo em texto simples para ela digitar na aba: os itens marcados com o nível, o que incomodou, as duas respostas, os corações (se escolhidos) e a linha de Avaliação. Nunca apresente como já gravado.
2. **Textos que entram pela Importação Aditiva.** O importador lê uma lista `leituras` dentro de cada texto e cria as leituras junto com o texto novo. Ele dá a cada leitura um `id` novo e o `textoId` e o `tipo` do texto criado, então não escreva esses três. Leitura com `data` inválida (precisa ser `AAAA-MM-DD`) é descartada sem aviso, itens ou níveis que o app não conhece são removidos, e leitura que não passa na validação é ignorada. Preencha `escolhido` só se a pessoa escolheu corações.

```json
"leituras": [
    {
        "data": "2026-11-01",
        "pegou": [{ "item": "voz", "peso": "centro" }],
        "incomodou": [],
        "releria": "sim",
        "mostraria": "talvez"
    }
]
```

`autoclassificacao` e `autoavaliacao` são campos do texto, não da leitura; ver `campos-poema-prosa-for-ai-pt-br.md`. Os downloads (`.json`, `.md`, `.pdf` e `.docx`) só levam as leituras com a caixa "Leituras" ligada, que vem desligada por padrão, e o modal Ver as mostra sempre.

## Lista rápida

- Pergunta aberta primeiro, itens depois, um de cada vez, nas palavras da pessoa.
- Nunca marque, pese ou pontue o que a pessoa não disse. Em branco é válido.
- Os níveis são Pontual (`leve`), Marcante (`forte`) e Central (`centro`), perguntados por item marcado.
- "O que incomodou" não tem nível, e não existe "longo demais" nem "curto demais".
- Os corações são da pessoa. A sugestão é do app, e a diferença entre as duas é útil.
- Nunca 0 corações. Terminar sem corações não muda nada.
- A linha de Avaliação é uma por texto, montada só com as palavras da pessoa.
- Texto existente: entregue um resumo para digitar. Texto novo pela Importação Aditiva: uma lista `leituras`, sem `id`, `textoId` e `tipo`.
- Use os ids do app exatamente: `explica_demais`, `obscuro_demais`, `pouco_trabalhado`, `problematico` e os demais das tabelas acima.
