# Instruções para escansão e classificação de Sonoridade

Você vai receber um poema (texto colado logo após estas instruções, ou em
anexo). Sua tarefa é analisá-lo e devolver tudo o que eu preciso pra
preencher o registro de **Sonoridade** desse poema no meu sistema: a grade
silábica com as tônicas marcadas, os pares de rima, a classificação de cada
par e os 7 campos gerais de classificação do poema.

Siga os passos na ordem abaixo e devolva a resposta no formato descrito em
"Formato de saída", ao final. Sempre que um campo tiver opções fechadas,
escolha **exatamente uma delas, com a grafia idêntica** à listada aqui — não
invente variações.

---

## Passo 1 — Divisão silábica (escansão métrica, não gramatical)

Para cada verso, divida em sílabas **poéticas**, não gramaticais. As regras
que importam:

- **Sinalefa/elisão entre palavras**: quando uma palavra termina em vogal (ou
  vogal nasal) e a próxima começa em vogal, as duas sílabas se fundem em uma
  só sílaba poética ("que eu" → uma sílaba, "vida e morte" → "vi-da-e-mor-te"
  com "a-e" fundido). Aplique sempre que o encontro vocálico permitir a
  fusão em fala natural.
- **Ditongos e tritongos** contam como uma sílaba só; **hiatos** contam como
  duas — use o critério de pronúncia natural do português, não a regra
  ortográfica de separação silábica escolar.
- **Hífen ortográfico não tem peso métrico** — trate-o como um espaço
  (ex.: "deu-me" escande como "deu" + "me", duas sílabas, não uma unidade
  com hífen preso).
- A contagem poética do verso **para na última sílaba tônica**: se o verso
  termina em palavra oxítona, conta-se até essa última sílaba; se termina em
  paroxítona ou proparoxítona, as sílabas átonas finais ainda entram na
  divisão da grade, mas não contam pra classificar o tamanho do verso (ex.:
  um verso terminado em proparoxítona com 11 sílabas divididas ainda pode
  ser um decassílabo, porque a contagem oficial para na tônica, duas
  sílabas antes do fim).

Represente a divisão de cada verso com **barra (`/`) entre as sílabas**,
sem espaço ao redor da barra. Marque a(s) sílaba(s) tônica(s) de cada verso
em **negrito**.

Exemplo (decassílabo heroico, tônica na 6ª e na 10ª):

```
Bebe/co/mo eu/bebi:/de/bru/ça/-te
```

(sílaba tônica em negrito na sua resposta final — aqui representado sem
formatação por ser só ilustração da divisão)

Se o poema tiver estrofes separadas por linha em branco, preserve essa
separação na sua resposta — ela também existe como uma "linha vazia" na
grade do sistema.

## Passo 2 — Localizar os pares de rima

Percorra o poema e identifique **pares de versos que rimam entre si** pela
sonoridade final (a partir da última sílaba tônica de cada verso — pode
incluir mais de uma sílaba do lado de cada verso quando a rima for rica,
cobrindo mais de uma sílaba sonora). Não se preocupe em calcular a "letra"
do esquema (A, B, C...) nem se a rima é externa/interna — isso o sistema
calcula sozinho a partir dos pares; você só precisa apontar **quais versos
rimam com quais**, e quais sílabas exatas de cada lado formam o som
compartilhado.

Se houver monorrima (vários versos com o mesmo som, tipo AAAA), aponte
todos os pares que formam essa cadeia (1↔2, 2↔3, 3↔4, etc. — não precisa
decidir se isso vira "um grupo só", o sistema une automaticamente).

## Passo 3 — Classificar cada par de rima

Para cada par identificado no Passo 2, classifique nos três eixos abaixo
(escolha uma opção de cada lista para cada par):

**Acentuação** (da palavra que rima):
- Aguda / Oxítona
- Grave / Paroxítona
- Esdrúxula / Proparoxítona

**Tonalidade** (qualidade sonora da rima):
- Soante / Consoante (Perfeita) — vogais e consoantes finais idênticas
- Toante (Assonante) — só as vogais coincidem
- Imperfeita — semelhança parcial, nem perfeita nem puramente assonante

**Riqueza** (relação gramatical entre as palavras que rimam):
- Pobre (mesma classe gramatical)
- Rica (classes gramaticais diferentes)
- Rara (palavra de baixa frequência/pouco usada em rima)
- Preciosa (combinação vocabular incomum, ex. palavra composta/estrangeirismo)

## Passo 4 — Classificação geral do poema (7 campos)

Preencha os 7 campos abaixo com base no poema inteiro. Escolha sempre da
lista fechada correspondente, com a grafia exata.

**1. Forma do Poema** (`formaPoema`) — escolha uma:
Soneto Clássico · Haikai · Tanka · Lira Brasileira · Limerick · Trova ·
Quadra Popular · Poesia Narrativa / Cordel · Forma Livre / Indefinida

**2. Regularidade Métrica** (`regularidadeMetrica`) — escolha uma:
Isométrico (todos os versos com o mesmo nº de sílabas) · Heterométrico
(tamanhos variam de forma regular/padronizada) · Acentual / Polimétrico ·
Versos Livres (sem contagem fixa)

**3. Tamanho do Verso** (`tamanhoVerso`) — escolha uma (baseado na contagem
poética do Passo 1, até a última tônica):
Monossílabo (1) · Dissílabo (2) · Trissílabo (3) · Tetrassílabo (4) ·
Redondilha Menor / Pentassílabo (5) · Hexassílabo (6) · Redondilha Maior /
Heptassílabo (7) · Octossílabo (8) · Eneassílabo (9) · Decassílabo (10) ·
Hendecassílabo (11) · Alexandrino / Dodecassílabo (12) · Bárbaro (>12) ·
Múltiplos Metros (Fixos) · Variável / Sem Metro

Se a Regularidade Métrica for Heterométrica, indique os dois (ou mais)
tamanhos presentes, não só um.

**4. Esquema de Rimas — Presença** (`esquemaRimasPresenca`) — escolha uma:
Rimado · Versos Brancos (Metrificado sem rima) · Sem Rimas / Livre ·
Rimas Ocasionais

**5. Esquema de Rimas — Padrão Estrutural** (`esquemaRimasPadrao`) — só
relevante se Presença = Rimado; escolha uma:
Monorrima Absoluta (AAAA) · Monorrima por Blocos / Continuada (AAAA BBBB
CCCC) · Emparelhada (AABB) · Alternada / Cruzada (ABAB) · Oposta /
Interpolada (ABBA) · Encadeada / Terza Rima (ABA BCB) · Sextilha Aberta
(ABCBDB) · Décima Espinela (ABBAACCDDC) · Limerick (AABBA) · Quadra / Rima
Simples (ABCB) · Mista / Completa · Não Aplicável

**6. Origem/Tradição** (`origemTradicao`) — escolha uma:
Medida Velha (versos de 5/7 sílabas, tradição ibérica antiga) · Medida Nova
(versos de 10/12 sílabas, tradição italiana/renascentista) · Tradição
Importada (formas estrangeiras como Haikai, Tanka, Limerick) ·
Contemporânea / Livre

**7. Registro** (`registro`) — formalidade da linguagem, escolha uma:
Culto / Erudito · Padrão / Neutro · Coloquial / Popular · Misto / Híbrido ·
Neológico / Experimental

**8. Tom** (`tom`) — atitude/disposição do poema, escolha uma:
Lírico / Introspectivo · Melancólico / Elegíaco · Reflexivo / Filosófico ·
Irônico / Sarcástico / Satírico · Dramático / Tenso · Épico / Solene ·
Ufano / Exaltativo

### Combinações que costumam andar juntas (checagem de coerência)

Não são regras rígidas que você precisa travar, mas sirvem pra você
conferir se a combinação faz sentido antes de responder — se o poema não
bater com nenhum desses padrões, é sinal de que a Forma provavelmente é
"Forma Livre / Indefinida":

- **Soneto Clássico** → Isométrico · Decassílabo ou Alexandrino · rimado
  (não "Sem Rimas") · padrão ABBA, ABAB ou Mista · Medida Nova.
- **Haikai / Tanka** → Heterométrico · versos em 5 e 7 sílabas · Sem Rimas ·
  Tradição Importada.
- **Lira Brasileira** → Heterométrico · versos em 6 e 10 sílabas · rimado
  (qualquer padrão) · Medida Nova.
- **Limerick** → Heterométrico · versos entre 5–9 sílabas (grupo
  longo/curto) · rimado · padrão Limerick (AABBA) · Tradição Importada.
- **Trova** → Isométrico · Redondilha Maior (7 sílabas) · rimado · ABAB ou
  ABBA (se for só o 2º/4º verso rimando, isso é Quadra, não Trova) ·
  Medida Velha.
- **Poesia Narrativa / Cordel** → Isométrico · Redondilha Maior (7
  sílabas) · rimado · Medida Velha (o padrão de rima varia bastante
  conforme a estrofe — sextilha, décima etc. — então não precisa forçar
  um só).
- Se a Forma for **Forma Livre / Indefinida** e a Regularidade for
  **Versos Livres**, o Tamanho do Verso é "Variável / Sem Metro", a
  Presença de Rima costuma ser "Sem Rimas / Livre" ou "Rimas Ocasionais", e
  a Origem costuma ser "Contemporânea / Livre".

Duas observações que ajudam a decidir Presença/Padrão de Rima:

- Se a métrica é regular (Isométrico ou Heterométrico com padrão claro) mas
  não há nenhuma rima real, use "Versos Brancos (Metrificado sem rima)" em
  vez de "Sem Rimas / Livre" — este último é mais pra verso livre mesmo.
- Monorrima absoluta (o poema inteiro numa só rima) é incomum fora de
  Cordel/Trova — se aparecer numa forma que não é essas duas, sinalize isso
  na sua resposta como algo pra eu confirmar, em vez de simplesmente
  preencher.

---

## Formato de saída

Devolva sua análise nesta estrutura:

### 1. Grade silábica

Verso a verso, numerado, com `/` entre sílabas e a tônica em **negrito**,
preservando linhas em branco entre estrofes.

### 2. Pares de rima

Lista numerada. Para cada par: quais dois versos (pelo nº), qual trecho
sonoro de cada lado (pode citar a palavra ou só a(s) sílaba(s) rimante(s)),
e a classificação nos 3 eixos (Acentuação / Tonalidade / Riqueza).

### 3. Classificação geral

Tabela ou lista com os 8 campos do Passo 4 e o valor escolhido para cada
um, mais uma frase curta justificando a Forma escolhida (é o campo que mais
depende de leitura interpretativa, os outros decorrem bastante dele).

### 4. Pontos de atenção

Qualquer verso onde a divisão silábica ficou ambígua (ex. duas leituras
métricas possíveis), qualquer rima duvidosa (toante vs. imperfeita, por
exemplo) ou qualquer combinação incomum sinalizada acima — para eu revisar
antes de considerar a escansão fechada e transcrever pro sistema.
