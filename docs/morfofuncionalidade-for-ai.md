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
`unidadeEstrofica`/`unidadeDiscursiva`; an item in `eventos` always has
`progressaoDialetica`. There's no item with all three fields at once, and
no field shared by both types.

## 1. `unidades` — sections with form and function

```json
{
  "id": 1757856000000,
  "unidadeEstrofica": "Quartetos",
  "unidadeDiscursiva": "Proposição",
  "posicao": { "estrofes": [1, 2], "versos": "todos" }
}
```

- **Unidade Estrófica** ("Stanzaic Unit", `unidadeEstrofica`) — the
  section's form (e.g. Oitava — Octave, Sexteto — Sestet, Quartetos —
  Quatrains, Tercetos — Tercets, Dístico — Couplet).
- **Unidade Discursiva** ("Discursive Unit", `unidadeDiscursiva`) — the
  same section's argumentative function (e.g. Proposição — Proposition,
  Resolução — Resolution).
- Both are **free text with suggestions** (datalist), not a closed list
  — unlike Sonoridade's fields, terminology varies a lot by poetic form
  (a sonnet uses Oitava/Sexteto, other forms use other names), so there
  is no closed universal vocabulary to lock this to.
- Either field can be empty (a Unidade with only a form, or only a
  function, is valid) — only both being empty at once is rejected by
  the UI when creating an item.
- `id` is a number (`gerarId()`, timestamp-based) — it only identifies
  the item within the record's lists; it carries no other meaning.

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
  (the same free-text fields described above) — never `id` nor
  `posicao`. Applying a Template instantiates new items, always
  "unpositioned", ready for someone to mark each one's position on the
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
   never mix `unidadeEstrofica`/`unidadeDiscursiva` (Unidade) with
   `progressaoDialetica` (Evento) on the same item.
2. The three classification fields are free text (no closed list to
   validate against) — any value is possible; the ones seen in
   `TEMPLATES_ESTRUTURA_EMBUTIDOS`/the default suggestions (Oitava,
   Sexteto, Quartetos, Tercetos, Dístico / Proposição, Resolução /
   Tensão, Volta, Síntese) are just a starting point, not an enum.
3. An empty `posicao.estrofes` means "unpositioned" — a valid, expected
   state, not accidentally missing data.
4. The position summary and the overlap between items never come
   ready-made in the JSON — recompute them from `posicao` if the task
   needs them.
5. Don't confuse this record with the "Estrutura" button (Book/Part/
   Section hierarchy), nor with Sonoridade (meter) or Conexões
   (cross-text links) — Morfofuncionalidade is only about the
   argumentative/formal architecture inside a single poem.
