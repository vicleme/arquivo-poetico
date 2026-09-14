# Morfofuncionalidade: como interpretar os campos desse registro

Este documento não pede nenhuma tarefa — explica os campos do registro de
**Morfofuncionalidade** (`db.estruturasTextuais`, exibido na UI como
"Progressão Morfofuncional") para quem for ler dados já exportados, sem
prompt de análise nem passo a passo de como derivar cada valor do zero.

---

## O que é o registro

Cada poema tem no máximo **um** registro de Morfofuncionalidade — não é
histórico de versões; cadastrar de novo substitui o anterior (mesmo
espírito de `db.escansoes`, ver `sonoridade-for-ai.md`). Ele tem duas
listas independentes:

1. `unidades` — seções do texto que têm forma e função.
2. `eventos` — movimentos argumentativos/dramáticos pontuais, sem forma
   própria.

Existe ainda uma coleção separada, `db.templatesEstrutura`, com
combinações de classificação reaproveitáveis (ver seção 4).

## Unidade ≠ Evento — a distinção central do registro

As duas listas não são duas formas de cadastrar a mesma coisa — são
categorias diferentes, cada uma com seus próprios campos, sem herança
entre elas:

- **Unidade** (`unidades`) — uma seção do texto com forma **e** função.
  Ex.: os dois quartetos de um soneto (forma: Quartetos) que juntos
  apresentam um problema (função: Proposição).
- **Evento** (`eventos`) — um movimento pontual, sem forma própria. Ex.:
  a Volta do soneto — o ponto de virada não tem estrofe dedicada nem é
  em si uma Proposição ou Resolução; é outra categoria de coisa.

Ao ler dados exportados, um item em `unidades` sempre tem
`unidadeEstrofica`/`unidadeDiscursiva`; um item em `eventos` sempre tem
`progressaoDialetica`. Não existe um item com os três campos ao mesmo
tempo, nem um campo que sirva pros dois tipos.

## 1. `unidades` — seções com forma e função

```json
{
  "id": 1757856000000,
  "unidadeEstrofica": "Quartetos",
  "unidadeDiscursiva": "Proposição",
  "posicao": { "estrofes": [1, 2], "versos": "todos" }
}
```

- **Unidade Estrófica** (`unidadeEstrofica`) — a forma da seção (ex.:
  Oitava, Sexteto, Quartetos, Tercetos, Dístico).
- **Unidade Discursiva** (`unidadeDiscursiva`) — a função argumentativa
  da mesma seção (ex.: Proposição, Resolução).
- Os dois são **texto livre com sugestão** (datalist), não lista
  fechada — ao contrário dos campos de Sonoridade, a nomenclatura varia
  muito por forma poética (soneto usa Oitava/Sexteto, outras formas usam
  outros nomes), então não há um vocabulário universal fechado pra
  travar aqui.
- Qualquer um dos dois pode estar vazio (uma Unidade só com forma, ou só
  com função, é válida) — só os dois vazios ao mesmo tempo é que a UI
  recusa criar.
- `id` é um número (`gerarId()`, baseado em timestamp) — só serve pra
  identificar o item dentro das listas do registro; não carrega
  significado.

## 2. `eventos` — movimentos pontuais, sem forma própria

```json
{
  "id": 1757856000001,
  "progressaoDialetica": "Volta",
  "posicao": { "estrofes": [4], "versos": [1] }
}
```

- **Progressão Dialética** (`progressaoDialetica`) — o movimento em si
  (ex.: Tensão, Volta, Síntese). Mesmo padrão de texto livre com
  sugestão das Unidades — não é lista fechada.
- Sem `unidadeEstrofica`/`unidadeDiscursiva`: um Evento nunca tem forma
  própria — se tivesse, seria uma Unidade.

## 3. `posicao` — onde cada item acontece no texto

Mesmo formato em Unidade e Evento:

```json
{ "estrofes": [1, 2], "versos": "todos" }
{ "estrofes": [4], "versos": [1] }
{ "estrofes": [], "versos": "todos" }
```

- `estrofes` é um array de números de estrofe (**1-based**), derivados
  automaticamente do texto do poema — quebra de linha em branco separa
  estrofes, nunca é digitado pela pessoa.
- `versos`, quando é um array, traz números de verso **1-based**,
  numerados de forma contínua ao longo do poema inteiro (não reinicia a
  cada estrofe) — não é índice dentro da estrofe.
- `versos: "todos"` (string, não array) significa "a estrofe inteira",
  e é o único valor possível quando `estrofes.length > 1`: seleção fina
  de verso só é válida com exatamente **uma** estrofe marcada (apontar
  versos específicos dentro de mais de uma estrofe fica ambíguo, então
  a UI trava em "todos" nesse caso).
- `estrofes: []` (vazio) é o estado **"não posicionado"** — o estado
  inicial de qualquer item novo ou instanciado a partir de um Template
  (que salva só a classificação, nunca a posição). Não é erro nem dado
  incompleto por acidente; é um passo esperado do fluxo (classificar
  primeiro, posicionar depois, com calma).

### O que NÃO é armazenado (sempre derivado na leitura)

- **Resumo textual da posição** (ex. "Estrofe 4, verso 1", "Estrofes 1,
  2, todos os versos", "Não posicionado") — nunca salvo; derivado de
  `posicao` a cada leitura (é o mesmo texto que aparece nos cartões da
  UI e nos formatos de exportação — `resumoPosicao()` em
  `estrutura-textual.js`).
- **Sobreposição (overlap)** entre dois itens — se compartilham ao menos
  uma célula (estrofe, verso), de qualquer combinação (Unidade×Unidade,
  Evento×Evento, Unidade×Evento). Não é uma flag salva no item; é
  recalculada a cada leitura a partir das duas posições. Sobreposição é
  **esperada, não é erro** — o sistema não julga se é "típico" ou
  "atípico" pra alguma tradição literária (isso é leitura de quem usa o
  sistema, não é computável a partir de posição); ele só sinaliza
  visualmente que os itens se cruzam, de forma neutra.
- **Ordem de exibição** dos cartões — as listas de Unidades e de Eventos
  são cada uma ordenada pela posição no texto (quem aparece primeiro no
  poema aparece primeiro na lista), com os "não posicionados" agrupados
  ao final. A ordem no JSON exportado **não** necessariamente reflete
  essa ordem de leitura — se a tarefa depende de "o que vem primeiro no
  poema", reordene por `posicao` (`ordenarPorPosicao()`) em vez de
  assumir a ordem do array.

## 4. `db.templatesEstrutura` — combinações reaproveitáveis

Coleção **separada** de `db.estruturasTextuais`, sem `poemaId` — não
pertence a nenhum poema específico:

```json
{
  "id": 1,
  "nome": "Soneto",
  "embutido": true,
  "unidades": [
    { "unidadeEstrofica": "Quartetos", "unidadeDiscursiva": "Proposição" },
    { "unidadeEstrofica": "Tercetos", "unidadeDiscursiva": "Resolução" }
  ],
  "eventos": [
    { "progressaoDialetica": "Tensão" },
    { "progressaoDialetica": "Volta" },
    { "progressaoDialetica": "Síntese" }
  ]
}
```

- Um Template guarda só a **classificação** das Unidades/Eventos (os
  mesmos campos de texto livre descritos acima) — nunca `id` nem
  `posicao`. Aplicar um Template instancia itens novos, sempre "não
  posicionados", prontos pra alguém marcar a posição de cada um no
  poema específico.
- `embutido: true` marca um Template de fábrica (hoje só "Soneto") —
  só duplicável pela UI, não editável direto, pra não estragar o
  original.

## Terminologia: nomes de UI × nomes de código (e uma ambiguidade a evitar)

- Nome de exibição no menu: **Morfofuncionalidade**. Título da página:
  **Progressão Morfofuncional**. Nomes de código (`estruturasTextuais`,
  `templatesEstrutura`, `unidadeEstrofica` etc.) não foram renomeados
  pra bater com isso — mesmo padrão já existente entre a aba
  "Sonoridade" (nome de exibição) e a coleção `db.escansoes` (nome de
  código).
- **Cuidado com um nome parecido, mas sem relação**: o dropdown de
  Análise também tem um botão chamado **"Estrutura"**, que não tem
  nada a ver com este registro — é a hierarquia bibliográfica
  Livro → Partes → Seções do acervo. "Estrutura Textual" foi inclusive
  o nome de trabalho descartado deste recurso, justamente pra evitar
  essa colisão. Ao ler qualquer menção a "Estrutura" em contexto de UI
  ou de documentação interna, confirme se é sobre este registro
  (Morfofuncionalidade, um poema por vez) ou sobre a hierarquia do
  acervo (Livro/Parte/Seção) antes de interpretar.

## Resumo para uso prático

1. `unidades` e `eventos` são listas separadas, com campos próprios —
   nunca misture `unidadeEstrofica`/`unidadeDiscursiva` (Unidade) com
   `progressaoDialetica` (Evento) num mesmo item.
2. Os três campos de classificação são texto livre (sem lista fechada
   pra validar contra) — qualquer valor é possível, os vistos no
   `TEMPLATES_ESTRUTURA_EMBUTIDOS`/nas sugestões padrão (Oitava,
   Sexteto, Quartetos, Tercetos, Dístico / Proposição, Resolução /
   Tensão, Volta, Síntese) são só ponto de partida, não um enum.
3. `posicao.estrofes` vazio = "não posicionado" — estado válido e
   esperado, não dado faltando por engano.
4. Resumo de posição e sobreposição entre itens nunca vêm prontos no
   JSON — recalcule a partir de `posicao` se a tarefa precisar deles.
5. Não confunda este registro com o botão "Estrutura" (hierarquia
   Livro/Parte/Seção) nem com Sonoridade (métrica) ou Conexões
   (vínculos entre textos) — Morfofuncionalidade é só sobre a
   arquitetura argumentativa/formal de dentro de um poema.
