# Poems and Prose: field-by-field guide

This document doesn't ask for any task — it's the complete map of fields
that exist on a Poem or Prose record, so an AI receiving exported data (or
a person reading the schema) knows what each field is without opening the
code. Fields with their own ambiguous or easily-confused rules have a
dedicated document — here they're only summarized, with a link to the
right doc. Everything else (most of it) is documented directly here,
because it's self-explanatory enough not to need a document of its own.

---

## Poem vs. Prose: what differs

The schema for the two is nearly identical — the same field list below
applies to both, with two known exceptions:

- **Elos/Ecos target** (Intratextualidade — intratextual links, see
  below): on a Prose piece, it can point to another Poem **or** another
  Prose piece; on a Poem, only to another Poem.
- **`descricaoVisual`**: exclusive to Poem — Prose doesn't have it.

Besides that, the two share the same structure, and the rest of this
document applies to both without distinction.

## Fields with their own document (only summarized here)

These groups have specific interpretation rules — categories that look
alike but aren't the same thing, special cases, derived fields. Check the
dedicated doc whenever the task actually depends on getting that
distinction right.

- **Sinalizações** ("Signalings" — `sinalizacoesTradicao`,
  `sinalizacoesEstilo`, `sinalizacoesTema`, `sinalizacoesRelacao`,
  `sinalizacoesSensibilidade`, `sinalizacoesTom`,
  `sinalizacoesDominioImagetico`, `sinalizacoesOutros`) — 8 free-text tag
  fields, each a different category. See
  `etiquetas-sinalizacoes-for-ai.md`.
- **Transtextualidade e Referências** ("Transtextuality and References" —
  `intertextualidade`, `hipertextualidade`, `referenciasExternas`) —
  dialogue with works and facts external to the archive. See
  `transtextualidade-referencias-for-ai.md`.
- **Pessoas** ("People" — `pessoas`, and how it differs from `autoria`
  and `gruposDiretos`) — links to registered people and the roles they
  play in the text. See `pessoas-papeis-for-ai.md`.
- **Sonoridade** ("Sonority"/prosody) — not a Poem/Prose field, it's a
  separate tab/entity (`db.escansoes`, one record per poem). See
  `sonoridade-for-ai.md` to interpret already-filled data, or
  `scansion-for-ai.md` to ask an AI to analyze a poem from scratch.

## Identification and content

- **`titulo`** ("title"): the text's title.
- **`texto`** ("text"): the content itself — poem or prose —, with inline
  HTML markup allowed (bold, italics, underline, strikethrough, font
  color, background color on a snippet or a full-width band, `<!-- -->`
  comments invisible in the reading view/exports but visible in the raw
  `.md`).
- **`idioma`** ("language"): free-text string with autocomplete
  suggestions, defaults to `"pt-BR"`.

## Where the text lives (hierarchy and collections)

- **`paiTipo`** / **`paiId`** ("parent type"/"parent id"): polymorphic
  position link — which Livro (Book), Parte (Part), Seção (Section) (or
  directly under another Elemento) the text sits under in the archive's
  tree. It's structural position — one single place.
- **`sequencia`** ("sequence"): manual ordering of the text within its
  parent, for when ordering isn't purely chronological.
- **`livrosIds`**: different from `paiTipo`/`paiId` — these are the
  Livros/Coletâneas (Books/Collections) where this text is **listed**
  (it can be listed in more than one), without changing where it
  structurally lives in the tree.

## Dates and depicted era

- **`dataEscrita`** ("date written") / **`dataPublicacao`** ("first
  publication date"): partial dates (day/month/year, any part can be
  missing), with an `exata` ("exact") flag on `dataEscrita` (precise vs.
  approximate date). The system refuses to save if `dataPublicacao` is
  earlier than `dataEscrita`.
- **`ano`** ("year"): a copy of `dataEscrita.ano`, kept only for
  compatibility with older sorting/stats/export code — don't edit it
  directly, it's derived from `dataEscrita`.
- **`epocaRetratada`** ("depicted era"): the time span the text depicts
  (not when it was written) — `{ epocaId, inicio, fim, recorte, na }`.
  Points to the central registry `db.epocas`. `recorte` ("cut/scope") is
  `"momento"` (moment) | `"repercussão"` (aftermath) | `null`. `na: true`
  is a deliberate third state — "marked as Not Applicable", different
  from "not yet categorized" (the whole field is `null`). Don't confuse
  the two: a text with no `epocaRetratada` hasn't been assessed; a text
  with `na: true` has been assessed and the answer was "doesn't apply".

## Intratextuality — Elos (Links) and Ecos (Echoes)

Links to other texts in the archive itself, by id (`conceitos.elos`,
`conceitos.ecos`):

- **Elos** ("Links", bilateral): `{ id, poemaId, relacao, direcao,
  texto }`. `relacao` ("relation") comes from a closed list (Reescrita —
  Rewrite, Continuidade — Continuation, Tradução — Translation, Variação
  — Variation, Versão — Version, Resposta — Response, Díptico — Diptych,
  Outro — Other). `direcao` ("direction") is `"origem"` (the older/base
  text) or `"destino"` (the derived/newer text).
- **Ecos** ("Echoes", always one-directional, newer → older): just
  `{ id, poemaId, tipo, texto }`, no `direcao`. `tipo` comes from a
  closed list (Personagem em comum — Shared character, Imagem central
  compartilhada — Shared central image, Aceno a — Nod to, Outro — Other).

**Watch out for a name collision**: this `ecos` (`conceitos.ecos`, a link
between archive texts) has no relation to `es.ecos` in the Sonoridade
record (a poem's sound echoes/near-rhymes). Same name, completely
different fields — see `sonoridade-for-ai.md` for more on this collision.

## People, authorship, and groups (overview)

Three similar-looking fields, detailed in `pessoas-papeis-for-ai.md`:

- **`pessoas`** ("people"): links to registered people + roles
  (Retratado(a) — Depicted, Dedicatário(a) — Dedicatee, etc.) — the field
  with the most nuance, has its own doc.
- **`autoria`** ("authorship"): who wrote the text — `{ autorId,
  papel }`, `papel` ("role") is a single value (not an array) from
  `Autor`/`Coautor` (Author/Co-author). Resolves against `db.autores`, a
  central registry separate from `db.pessoas`.
- **`gruposDiretos`** ("direct groups"): an array of `grupoId` — a group
  referenced without pointing to any specific Pessoa in it.

## Notes, self-assessment, and status

- **`notas`** ("notes"): free notes field about the text.
- **`autoavaliacao`** ("self-assessment"): free text — the author's
  opinion of their own text.
- **`autoclassificacao`** ("self-rating"): number from 0.5 to 5 (0.5
  steps) — "hearts" the author gives their own text, purely affective,
  no claim to technical scoring. `0`/absent is the special "not rated"
  state (it's not the minimum score — the real minimum is 0.5).
- **`status`**: closed list — `incompleto` (incomplete), `completo`
  (complete), `publicado` (published), `migrado` (migrated),
  `descartado` (discarded), `privado` (private). `privado` differs from
  `descartado`: it never had any intention of publication (always
  restricted to personal/intimate context), it's not something that was
  discarded later.
- **`pendencia`** ("pending item"): free text flagging an open item about
  the text — its presence (non-empty) is what lights up the visual
  indicator (🟠) in the table, same spirit as `conteudoSensivel` below.

## Sensitive content and trigger vocabulary

- **`conteudoSensivel`** ("sensitive content"): a free paragraph
  describing sensitive content in the text. Its presence (non-empty) is
  what triggers the "Conteúdo sensível" badge in the interface — there's
  no separately stored boolean flag; it's always derived from the
  string. Different from `sinalizacoesSensibilidade` (loose, categorizable
  tags, e.g. "Linguagem obscena" — see
  `etiquetas-sinalizacoes-for-ai.md`): this field is the descriptive
  paragraph, that one is a short tag.
- **`vocabularioHiperacionante`** ("hyper-triggering vocabulary"): free
  text — a note about vocabulary in the text that may be especially
  triggering for readers.
- **`ocultacao`** ("concealment"): free text — a note about some form of
  concealment applied to the text (what, and why).

## Sendings, recognitions, and attachments

- **`envios`** ("sendings"): a list of `{ pessoa, data, meio, reacao,
  notas }` — who the text was sent to, when, through which channel, and
  the reaction recorded. `pessoa` and `meio` ("channel") are free text
  with autocomplete (no id link to `db.pessoas`).
- **`reconhecimentos`** ("recognitions"): a list of `{ premio, posicao,
  ano, texto }` — awards/recognitions the text received.
- **`anexos`** ("attachments", formerly `ilustracoes`): a list of
  attachments for the text, with **`anexosNotaGeral`** as a free note
  covering the whole set (not one specific attachment).
- **`anotacoesMarginais`** ("marginal annotations"): a list of
  annotations tied to specific points in the text (distinct from
  `notas`, which is general, not pinpointed).

## `descricaoVisual` (Poem only)

Free text — a visual description associated with the poem. The only
field in this list that doesn't exist on Prose (see "Poem vs. Prose"
above).

## Migration between Books/Sections

A trio used when a text moves within the editorial structure (it's "cut"
from one Book/Section and "launched" in another), or discarded in that
process:

- **`cortadoDe`** ("cut from") / **`lancadoEm`** ("launched in"):
  `{ livro, secao }` — where the text left from / where it landed.
- **`justificativaMigracao`** ("migration justification"): free text
  justifying the migration.
- **`descarte`** ("discard"): free text — the reason for discarding,
  when applicable (`status: "descartado"`).

## Summary for practical use

1. If the task involves Sinalizações, Transtextualidade/Referências,
   Pessoas/Papéis, or Sonoridade, use the dedicated doc — this file only
   summarizes those groups enough for you to know they exist.
2. Don't confuse `conceitos.ecos` (link between archive texts,
   Intratextuality) with Sonoridade's `es.ecos` (sound echoes) — same
   name, different fields, different docs.
3. `paiTipo`/`paiId` is where the text **lives** in the tree;
   `livrosIds` is where it **appears listed** — not the same thing.
4. A missing `epocaRetratada` (`null`) ≠ `epocaRetratada.na === true` —
   the former is "not assessed", the latter is "assessed as not
   applicable".
5. `descricaoVisual` only exists on Poem — don't expect it (or its
   absence to mean anything) on a Prose record.
