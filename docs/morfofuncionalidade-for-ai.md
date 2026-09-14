# Morfofuncionalidade: how to interpret this record's fields

This document doesn't ask for any task — it explains the fields of the
**Morfofuncionalidade** ("Morphofunctionality") record
(`db.estruturasTextuais`, shown in the UI as "Progressão Morfofuncional" —
"Morphofunctional Progression") for anyone reading already-exported data,
with no analysis prompt or step-by-step for deriving each value from
scratch.

---

## What the record is

Each poem has at most **one** Morfofuncionalidade record — it's not
version history; re-cataloging replaces the previous one (same spirit as
`db.escansoes`, see `sonoridade-for-ai.md`). It has two independent
lists:

1. `unidades` ("units") — sections of the text that have both form and
   function.
2. `eventos` ("events") — one-off argumentative/dramatic movements, with
   no form of their own.

There's also a separate collection, `db.templatesEstrutura`
("structure templates"), holding reusable classification combos (see
section 4).

## Unidade ≠ Evento — the record's central distinction

The two lists aren't two ways of recording the same thing — they're
different categories, each with its own fields, with no inheritance
between them:

- **Unidade** ("Unit", `unidades`) — a section of the text with both
  form **and** function. E.g. a sonnet's two quatrains (form: Quartetos
  — Quatrains) that together present a problem (function: Proposição —
  Proposition).
- **Evento** ("Event", `eventos`) — a one-off movement, with no form of
  its own. E.g. a sonnet's Volta (turn/volta) — the turning point has no
  stanza of its own, nor is it itself a Proposição or Resolução; it's a
  different category of thing.

When reading exported data, an item in `unidades` always has
`unidadeEstrofica`/`unidadeDiscursiva`, and may also have `nome`; an item
in `eventos` always has `progressaoDialetica`, and never has `nome`. No
item has fields from both types at once.

## 1. `unidades` — sections with form and function

```json
{
  "id": 1757856000000,
  "nome": "Presença e ausência",
  "unidadeEstrofica": "Quartetos",
  "unidadeDiscursiva": "Proposição",
  "posicao": { "estrofes": [1, 2], "versos": "todos" }
}
```

- **Nome** ("Name", `nome`) — an optional free-text label for this
  Unidade, naming the "layer" or role that the Unidade
  Estrófica/Discursiva pair plays in this specific poem (e.g. "Presença
  e ausência" — "Presence and absence", "Corpo de aprendizados" — "Body
  of learnings"). Plain free text, with no datalist suggestions (unlike
  the two fields below). It's purely descriptive: an Evento never has a
  `nome`, and a Template extracted from a Unidade (section 4) never
  carries its `nome` over — only the reusable Estrófica/Discursiva
  classification is, since the name is specific to this poem, not a
  reusable category.
- **Unidade Estrófica** ("Stanzaic Unit", `unidadeEstrofica`) — the
  section's form (e.g. Oitava — Octave, Sexteto — Sestet, Quartetos —
  Quatrains, Tercetos — Tercets, Dístico — Couplet).
- **Unidade Discursiva** ("Discursive Unit", `unidadeDiscursiva`) — the
  same section's argumentative function (e.g. Proposição — Proposition,
  Resolução — Resolution).
- `unidadeEstrofica`/`unidadeDiscursiva` are **free text with
  suggestions** (datalist), not a closed list — unlike Sonoridade's
  fields, terminology varies a lot by poetic form (a sonnet uses
  Oitava/Sexteto, other forms use other names), so there is no closed
  universal vocabulary to lock this to.
- Any of the three fields (`nome`, `unidadeEstrofica`,
  `unidadeDiscursiva`) can be empty on its own — a Unidade with only a
  name, only a form, only a function, or any combination of the three,
  is valid. Only all three being empty at once is rejected by the UI
  when creating an item.
- `id` is a number (`gerarId()`, timestamp-based) — it only identifies
  the item within the record's lists; it carries no other meaning.
- When a display label is needed (UI cards, exports), it's derived, not
  stored: `nome` and the Estrófica/Discursiva pair are combined as
  "`nome` — `unidadeEstrofica` · `unidadeDiscursiva`" when both are
  present, or whichever side is present falls back alone, or "Sem
  classificação" ("No classification") if all three are empty
  (`rotuloItem()` in `exportar-estrutura-textual.js`, reused by the
  modal's card and by `visualizar-estrutura-textual.js`).

## 2. `eventos` — one-off movements, with no form of their own

```json
{
  "id": 1757856000001,
  "progressaoDialetica": "Volta",
  "posicao": { "estrofes": [4], "versos": [1] }
}
```

- **Progressão Dialética** ("Dialectical Progression",
  `progressaoDialetica`) — the movement itself (e.g. Tensão — Tension,
  Volta — Turn, Síntese — Synthesis). Same free-text-with-suggestions
  pattern as Unidades — not a closed list.
- No `unidadeEstrofica`/`unidadeDiscursiva`: an Evento never has a form
  of its own — if it did, it would be a Unidade instead.

## 3. `posicao` — where each item happens in the text

Same shape for Unidade and Evento:

```json
{ "estrofes": [1, 2], "versos": "todos" }
{ "estrofes": [4], "versos": [1] }
{ "estrofes": [], "versos": "todos" }
```

- `estrofes` ("stanzas") is an array of **1-based** stanza numbers,
  derived automatically from the poem's text — a blank line separates
  stanzas; it's never typed in by hand.
- `versos` ("verses"), when it's an array, holds **1-based** verse
  numbers, numbered continuously across the whole poem (it doesn't reset
  per stanza) — it is not an index within the stanza.
- `versos: "todos"` ("all", a string, not an array) means "the whole
  stanza", and is the only possible value when `estrofes.length > 1`:
  fine-grained verse selection is only valid with exactly **one** stanza
  marked (pointing at specific verses across more than one stanza would
  be ambiguous, so the UI locks to "todos" in that case).
- `estrofes: []` (empty) is the **"unpositioned"** state — the initial
  state of any new item, or one instantiated from a Template (which only
  saves the classification, never the position). This isn't an error or
  accidentally incomplete data; it's an expected step of the intended
  flow (classify first, position later, at your own pace).

### What is NOT stored (always derived on read)

- **Text summary of the position** (e.g. "Estrofe 4, verso 1" — "Stanza
  4, verse 1"; "Estrofes 1, 2, todos os versos" — "Stanzas 1, 2, all
  verses"; "Não posicionado" — "Unpositioned") — never saved; derived
  from `posicao` on every read (it's the same text shown on the UI's
  cards and in the export formats — `resumoPosicao()` in
  `estrutura-textual.js`).
- **Overlap** between two items — whether they share at least one cell
  (stanza, verse), for any combination (Unidade×Unidade, Evento×Evento,
  Unidade×Evento). It's not a flag stored on the item; it's recomputed
  on every read from the two positions. Overlap is **expected, not an
  error** — the system doesn't judge whether it's "typical" or
  "atypical" for some literary tradition (that's a reading made by
  whoever uses the system, not something computable from position
  alone); it only flags visually, neutrally, that the items cross.
- **Display order** of the cards — the Unidades list and the Eventos
  list are each sorted by position in the text (whatever comes first in
  the poem is listed first), with "unpositioned" items grouped at the
  end. The order in the exported JSON does **not** necessarily reflect
  this reading order — if a task depends on "what comes first in the
  poem", re-sort by `posicao` (`ordenarPorPosicao()`) rather than
  assuming the array's order.

## 4. `db.templatesEstrutura` — reusable combos

A collection **separate** from `db.estruturasTextuais`, with no
`poemaId` — it doesn't belong to any specific poem:

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

- A Template only stores the **classification** of its Unidades/Eventos
  — `unidadeEstrofica`/`unidadeDiscursiva` for Unidades,
  `progressaoDialetica` for Eventos — never `id`, `posicao`, nor a
  Unidade's `nome` (see section 1: the name is specific to the poem it
  came from, not a reusable category, so `extrairClassificacaoParaTemplate()`
  drops it when building a Template). Applying a Template instantiates
  new items, always "unpositioned" and with an empty `nome`, ready for
  someone to mark each one's position — and optionally name — on the
  specific poem.
- `embutido: true` ("built-in") marks a factory Template (today, only
  "Soneto") — only duplicable through the UI, not directly editable, so
  the original stays intact.

## Terminology: UI names vs. code names (and a similarly-named trap)

- Display name in the menu: **Morfofuncionalidade**. Page title:
  **Progressão Morfofuncional**. Code names (`estruturasTextuais`,
  `templatesEstrutura`, `unidadeEstrofica`, etc.) were not renamed to
  match — same pattern already in place between the "Sonoridade" tab
  (display name) and the `db.escansoes` collection (code name).
- **Watch out for a similarly-named, unrelated feature**: the Análise
  dropdown also has a button called **"Estrutura"** ("Structure"), which
  has nothing to do with this record — it's the archive's bibliographic
  hierarchy, Book → Parts → Sections. "Estrutura Textual" ("Textual
  Structure") was in fact this feature's discarded working name,
  specifically to avoid this collision. When you see "Estrutura"
  mentioned in the UI or in internal documentation, confirm whether it's
  about this record (Morfofuncionalidade, one poem at a time) or about
  the archive's hierarchy (Book/Part/Section) before interpreting it.

## Summary for practical use

1. `unidades` and `eventos` are separate lists with their own fields —
   never mix `nome`/`unidadeEstrofica`/`unidadeDiscursiva` (Unidade) with
   `progressaoDialetica` (Evento) on the same item; `nome` only ever
   appears on a Unidade.
2. `unidadeEstrofica`, `unidadeDiscursiva`, and `progressaoDialetica` are
   free text (no closed list to validate against) — any value is
   possible; the ones seen in `TEMPLATES_ESTRUTURA_EMBUTIDOS`/the default
   suggestions (Oitava, Sexteto, Quartetos, Tercetos, Dístico /
   Proposição, Resolução / Tensão, Volta, Síntese) are just a starting
   point, not an enum. `nome` is also free text, but it's a per-poem
   label, not a classification — it's never suggested via datalist and
   never carried into `db.templatesEstrutura`.
3. An empty `posicao.estrofes` means "unpositioned" — a valid, expected
   state, not accidentally missing data.
4. The position summary and the overlap between items never come
   ready-made in the JSON — recompute them from `posicao` if the task
   needs them. The same goes for a Unidade's display label (`nome`
   combined with the Estrófica/Discursiva pair) — recompute it with
   `rotuloItem()` rather than assuming the JSON carries a ready label.
5. Don't confuse this record with the "Estrutura" button (Book/Part/
   Section hierarchy), nor with Sonoridade (meter) or Conexões
   (cross-text links) — Morfofuncionalidade is only about the
   argumentative/formal architecture inside a single poem.
