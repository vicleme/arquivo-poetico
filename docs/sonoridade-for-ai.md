# Sonoridade: how to interpret this record's fields

This document doesn't ask for any task — it explains the fields of the
**Sonoridade** ("Sonority"/prosody) record (`db.escansoes`) for anyone
reading already-exported data, with no analysis prompt or step-by-step for
deriving each value from scratch. If what you want is to ask an AI to
analyze a poem and fill these fields in, use `scansion-for-ai.md` — the
two are complementary.

---

## What the record is

Each poem has at most **one** Sonoridade record — it's not version
history; re-scanning replaces the previous one. It has three parts:

1. The **8 general classification fields** for the whole poem.
2. `escansaoLinhas` ("scansion lines") — the syllable grid, verse by
   verse.
3. `rimas` ("rhymes") and `ecos` ("echoes") — the sound pairs identified
   in the grid.

## 1. The 8 general classification fields

One closed-list value per field, for the whole poem:

- **Forma do Poema** ("Poem Form", `formaPoema`) — the recognized
  form/stanza (Soneto (Genérico) — Generic Sonnet, Soneto Petrarquiano /
  Camoniano, Soneto Shakespeariano, Haikai, Tanka, Lira Brasileira —
  Brazilian Lira, Limerick, Trova, Quadra Popular — Popular Quatrain,
  Poesia Narrativa / Cordel — Narrative Poetry/Cordel) or "Forma Livre /
  Indefinida" (Free/Undefined Form) when it fits none of them.
- **Regularidade Métrica** ("Metrical Regularity",
  `regularidadeMetrica`) — Isométrico (all verses with the same syllable
  count), Heterométrico (lengths vary in a patterned way),
  Acentual/Polimétrico, or Versos Livres (free verse).
- **Tamanho do Verso** ("Verse Length", `tamanhoVerso`) — poetic syllable
  count up to the last stress (Monossílabo/monosyllable through
  Bárbaro/>12), or "Múltiplos Metros (Fixos)"/"Variável / Sem Metro". With
  Heterométrica regularity, the poem can have more than one length
  recorded at once.
- **Esquema de Rimas — Presença** ("Rhyme Scheme — Presence",
  `esquemaRimasPresenca`) — whether the poem rhymes: Rimado (Rhymed),
  Versos Brancos (metered but unrhymed), Sem Rimas / Livre (unrhymed/free),
  or Rimas Ocasionais (occasional rhymes).
- **Esquema de Rimas — Padrão Estrutural** ("Rhyme Scheme — Structural
  Pattern", `esquemaRimasPadrao`) — only relevant when Presença = Rimado
  (e.g. Emparelhada AABB, Alternada ABAB, Limerick AABBA...); empty or
  "Não Aplicável" (Not Applicable) otherwise.
- **Origem/Tradição** ("Origin/Tradition", `origemTradicao`) — Medida
  Velha (5/7-syllable verses), Medida Nova (10/12-syllable verses),
  Tradição Importada (imported foreign forms), or Contemporânea / Livre
  (Contemporary/Free).
- **Registro** ("Register", `registro`) — formality of the language, from
  Culto/Erudito (Learned/Erudite) to Neológico/Experimental.
- **Tom** ("Tone", `tom`) — the poem's mood/disposition, from
  Lírico/Introspectivo (Lyrical/Introspective) to Ufano/Exaltativo
  (Proud/Exalting).

**Legacy data note**: `registro` and `tom` used to be a single field
(`tomRegistro`) before being split, since they're independent axes. A
record migrated from before that split may have `registro` filled in and
`tom` empty — that's not a forgotten field, it's old data that was never
reclassified along that specific axis.

## 2. `escansaoLinhas` — the syllable grid

One item per line of the poem's original text, in order:

```json
{ "tipo": "verso", "numero": 1, "texto": "Be/be/co/mo eu/be/bi:/de/bru/ça-te", "tonicas": [1, 5, 8] }
{ "tipo": "vazia" }
```

- `tipo: "vazia"` ("empty") marks a stanza break (blank line) — it
  occupies a slot in the grid, with no `texto` or `tonicas`.
- `texto` ("text") holds the syllable division with `/` between
  syllables (an orthographic hyphen carries no metrical weight, treated
  like a space). If the original verse already has a slash as a graphic
  device (e.g. "pós-p/a/r/t/i/d/a"), escape it as `\/` — it won't count
  as a division, and the plain `/` character is restored inside the
  syllable once read back.
- `tonicas` ("stresses") is an array of **0-based** indices, counting the
  syllables from the division (an escaped slash doesn't split) left to
  right — the positions marked as stressed in that verse.
- Editing a verse's syllable division after marking stresses discards any
  `tonicas` index that falls outside the new syllable count.

## 3. `rimas` — rhyme pairs

```json
{ "a": { "linha": 0, "silabas": [8] }, "b": { "linha": 1, "silabas": [8] },
  "acentuacao": "Grave / Paroxítona",
  "tonalidade": "Soante / Consoante (Perfeita)",
  "riqueza": "Pobre (mesma classe gramatical)" }
```

- `linha` ("line") is the 0-based index of the verse's position within
  the `escansaoLinhas` array, **counting blank lines too** — it is not
  the verse's `numero`.
- `silabas` ("syllables") are the indices (same 0-base as `tonicas`) of
  the syllables on that side that form the shared sound; more than one
  index covers a rich rhyme.
- **Acentuação** ("Stress"): Aguda/Oxítona (oxytone), Grave/Paroxítona
  (paroxytone), or Esdrúxula/Proparoxítona (proparoxytone) — of the
  rhyming word.
- **Tonalidade** ("Tonality"): Soante/Consoante (Perfeita — identical
  vowels and final consonants), Toante (Assonante — only the vowels
  match), or Imperfeita (partial match, neither of the above).
- **Riqueza** ("Richness"): Pobre (same part of speech), Rica (different
  parts of speech), Rara (word with few rhyming options), Preciosa
  (unusual word combination), Idêntica (repeated word), or Homônima
  (homonym — same spelling/sound, different meaning).

All three axes are optional per pair — not every pair has Acentuação,
Tonalidade, and Riqueza filled in at once.

### What is NOT stored (always derived on read)

- **Scheme letter** (A, B, C...) — never saved; recalculated from the
  pairs via transitive union (verses linked by a chain of pairs share the
  same letter — this already covers monorhyme, with no separate "group"
  concept needed).
- **Posição** ("Position", Externa/Interna — External/Internal) —
  whether the pair's two sides fall on different verses (External) or the
  same verse (Internal); always derived from the pair itself, never a
  stored field.
- **Proximidade** ("Proximity", Vizinha/Distante — Neighboring/Distant) —
  derived from the difference between the two verses' `numero` (not the
  raw position in `escansaoLinhas`, which includes blank lines): up to 2
  verses apart counts as "Vizinha"; beyond that, "Distante".

If a task asks you to count or group pairs along any of these three axes,
they need to be recomputed from `rimas` — there's no JSON key to read
them directly.

## 4. `ecos` — sound echoes (near-rhymes)

Same shape as `rimas` (`a`/`b`, same `linha` + `silabas` scheme), but
instead of the three classification axes, each item has a single
**free-text** field, `tipo` ("type") (e.g. Assonância, Aliteração,
Consonância, Paronomásia, Homeoteleuto — or any other label if none of
those fits).

**Watch out for a name collision**: this `ecos` (inside the Sonoridade
record, `es.ecos`) has no relation to Poem/Prose's `conceitos.ecos`
(Intratextuality — a link between texts in the archive itself, e.g.
"Personagem em comum"/Shared character or "Aceno a"/Nod to; see
`campos-poema-prosa-for-ai.md`). These are two completely different
fields that just happen to share a name — one is about sound (a
near-rhyme within one poem), the other is about a link between distinct
texts in the archive. When reading exported data, always check which of
the two records (`escansoes`, or a Poem/Prose's `conceitos`) the `ecos`
key is coming from before interpreting the value.

## Summary for practical use

1. Read the 8 general classification fields as a portrait of the whole
   poem — they don't vary line by line.
2. To count or group rhyme pairs by Posição or Proximidade, derive them
   from `rimas` (using `linha`/the verse's `numero`) — there's no stored
   field for either.
3. Don't confuse `es.ecos` (sound echoes, Sonoridade) with Poem/Prose's
   `conceitos.ecos` (Intratextuality) — same name, different fields,
   different docs.
4. An empty `tom` with `registro` filled in is legacy data (the field was
   split off from `tomRegistro` later), not a data-entry mistake.
