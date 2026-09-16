# Sonoridade: como interpretar os campos desse registro

Este documento não pede nenhuma tarefa — explica os campos do registro de
**Sonoridade** (`db.escansoes`) para quem for ler dados já exportados, sem
prompt de análise nem passo a passo de como derivar cada valor do zero.
Se o que você quer é pedir pra uma IA analisar um poema e preencher esses
campos, use `scansion-for-ai.md` — os dois são complementares.

---

## O que é o registro

Cada poema tem no máximo **um** registro de Sonoridade — não é histórico
de versões; reescandir substitui o anterior. Ele tem três partes:

1. Os **8 campos de classificação geral** do poema inteiro.
2. `escansaoLinhas` — a grade silábica, verso a verso.
3. `rimas` e `ecos` — os pares sonoros identificados na grade.

## 1. Os 8 campos de classificação geral

Um valor de lista fechada por campo, para o poema inteiro:

- **Forma do Poema** (`formaPoema`) — a forma/estrofe reconhecida (Soneto
  Clássico, Haikai, Tanka, Lira Brasileira, Limerick, Trova, Quadra
  Popular, Poesia Narrativa / Cordel) ou "Forma Livre / Indefinida" quando
  não se encaixa em nenhuma.
- **Regularidade Métrica** (`regularidadeMetrica`) — Isométrico (todos os
  versos com o mesmo nº de sílabas), Heterométrico (tamanhos variam de
  forma padronizada), Acentual/Polimétrico ou Versos Livres.
- **Tamanho do Verso** (`tamanhoVerso`) — nº de sílabas poéticas contadas
  até a última tônica (Monossílabo a Bárbaro, >12), ou "Múltiplos Metros
  (Fixos)"/"Variável / Sem Metro". Com Regularidade Heterométrica, o
  poema pode ter mais de um tamanho registrado ao mesmo tempo.
- **Esquema de Rimas — Presença** (`esquemaRimasPresenca`) — se o poema
  rima: Rimado, Versos Brancos (metrificado sem rima), Sem Rimas / Livre,
  ou Rimas Ocasionais.
- **Esquema de Rimas — Padrão Estrutural** (`esquemaRimasPadrao`) — só
  relevante quando Presença = Rimado (ex.: Emparelhada AABB, Alternada
  ABAB, Limerick AABBA...); vazio ou "Não Aplicável" nos demais casos.
- **Origem/Tradição** (`origemTradicao`) — Medida Velha (versos de 5/7
  sílabas), Medida Nova (10/12 sílabas), Tradição Importada (formas
  estrangeiras) ou Contemporânea / Livre.
- **Registro** (`registro`) — formalidade da linguagem, de Culto/Erudito
  a Neológico/Experimental.
- **Tom** (`tom`) — atitude/disposição do poema, de Lírico/Introspectivo
  a Ufano/Exaltativo.

**Dado legado**: `registro` e `tom` eram um único campo (`tomRegistro`)
até serem separados por serem eixos independentes. Um registro migrado de
antes dessa separação pode ter `registro` preenchido e `tom` vazio — não
é campo esquecido, é dado antigo que nunca foi reclassificado nesse eixo
específico.

## 2. `escansaoLinhas` — a grade silábica

Um item por linha do texto original do poema, na ordem em que aparecem:

```json
{ "tipo": "verso", "numero": 1, "texto": "Be/be/co/mo eu/be/bi:/de/bru/ça-te", "tonicas": [1, 5, 8] }
{ "tipo": "vazia" }
```

- `tipo: "vazia"` marca quebra de estrofe (linha em branco) — ocupa uma
  posição na grade, sem `texto` nem `tonicas`.
- `texto` traz a divisão silábica com `/` entre sílabas (hífen ortográfico
  não tem peso métrico, tratado como espaço). Se o verso original já tem
  uma barra como recurso gráfico (ex.: "pós-p/a/r/t/i/d/a"), escape com
  `\/` — essa barra não conta como divisão, e o caractere `/` volta a
  aparecer normalmente dentro da sílaba depois de lido.
- `tonicas` é um array de índices **base 0**, contando as sílabas
  resultantes da divisão (barra escapada não separa sílaba) da esquerda
  pra direita — as posições marcadas como tônicas daquele verso.
- Editar a divisão silábica de um verso depois de marcar tônicas descarta
  qualquer índice de `tonicas` que fique fora do novo total de sílabas.

## 3. `rimas` — pares de rima

```json
{ "a": { "linha": 0, "silabas": [8] }, "b": { "linha": 1, "silabas": [8] },
  "acentuacao": "Grave / Paroxítona",
  "tonalidade": "Soante / Consoante (Perfeita)",
  "riqueza": "Pobre (mesma classe gramatical)" }
```

- `linha` é o índice (base 0) da posição do verso dentro do array
  `escansaoLinhas`, **contando também as linhas vazias** — não é o
  `numero` do verso.
- `silabas` são os índices (mesma base de `tonicas`) das sílabas daquele
  lado que formam o som compartilhado; mais de um índice cobre rima rica.
- **Acentuação**: Aguda/Oxítona, Grave/Paroxítona ou
  Esdrúxula/Proparoxítona — da palavra que rima.
- **Tonalidade**: Soante/Consoante (Perfeita — vogais e consoantes finais
  idênticas), Toante (Assonante — só as vogais coincidem) ou Imperfeita
  (semelhança parcial, nem uma coisa nem outra).
- **Riqueza**: Pobre (mesma classe gramatical), Rica (classes
  gramaticais diferentes), Rara (palavra com poucas opções de rima),
  Preciosa (combinação vocabular incomum), Idêntica (repetição de
  palavra) ou Homônima (repetição de grafia/som).

Os três eixos são opcionais por par — nem todo par tem Acentuação,
Tonalidade e Riqueza preenchidos ao mesmo tempo.

### O que NÃO é armazenado (sempre derivado na leitura)

- **Letra do esquema** (A, B, C...) — nunca salva; recalculada a partir
  dos pares por união transitiva (versos ligados por uma cadeia de pares
  compartilham a mesma letra — isso já cobre monorrima, sem precisar de
  um conceito de "grupo" separado).
- **Posição** (Externa/Interna) — se os dois lados do par caem em versos
  diferentes (Externa) ou no mesmo verso (Interna); sempre derivada do
  próprio par, nunca um campo salvo.
- **Proximidade** (Vizinha/Distante) — derivada da diferença entre os
  `numero` dos dois versos do par (não a posição bruta em
  `escansaoLinhas`, que inclui linhas vazias): até 2 versos de distância
  conta como "Vizinha"; acima disso, "Distante".

Se a tarefa pedir pra contar ou agrupar pares por qualquer um desses três
eixos, eles precisam ser recalculados a partir de `rimas` — não existe
chave no JSON pra ler isso direto.

## 4. `ecos` — ecos sonoros (quase-rimas)

Mesmo formato de `rimas` (`a`/`b`, mesmo esquema `linha` + `silabas`),
mas em vez dos três eixos de classificação, cada item tem um único campo
de **texto livre**, `tipo` (ex.: Assonância, Aliteração, Consonância,
Paronomásia, Homeoteleuto — ou qualquer rótulo não listado, se nenhum
desses encaixar).

**Atenção a um nome ambíguo**: este `ecos` (dentro do registro de
Sonoridade, `es.ecos`) não tem nenhuma relação com `conceitos.ecos` de
Poema/Prosa (Intratextualidade — vínculo entre textos do próprio acervo,
tipo "Personagem em comum" ou "Aceno a"; ver
`campos-poema-prosa-for-ai.md`). São dois campos completamente
diferentes que só coincidem no nome — um é sobre som (quase-rima dentro
de um poema), o outro é sobre vínculo entre textos distintos do acervo.
Ao ler dados exportados, confirme sempre de qual dos dois registros
(`escansoes` ou `conceitos` de um Poema/Prosa) a chave `ecos` está vindo
antes de interpretar o valor.

## Resumo para uso prático

1. Leia os 8 campos de classificação geral como retrato do poema inteiro
   — eles não variam por verso.
2. Pra contar ou agrupar pares de rima por Posição ou Proximidade, derive
   a partir de `rimas` (usando `linha`/o `numero` do verso) — não existe
   campo salvo pra nenhum dos dois.
3. Não confunda `es.ecos` (ecos sonoros, Sonoridade) com `conceitos.ecos`
   de Poema/Prosa (Intratextualidade) — nomes iguais, campos diferentes,
   docs diferentes.
4. `tom` vazio com `registro` preenchido é dado legado (o campo nasceu
   separado de `tomRegistro` depois), não erro de preenchimento.
