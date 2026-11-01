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

- **Etiquetas** (formerly "Sinalizações"; keys `sinalizacoesTradicao`,
  `sinalizacoesEstilo`, `sinalizacoesTerritorialidade`,
  `sinalizacoesRelacao`, `sinalizacoesSensibilidade`, `sinalizacoesTom`,
  `sinalizacoesDominioImagetico`, `sinalizacoesOutros`) — 8 tag fields, each a
  different category (Theme is no longer one of them: it lives in `temas`). The 7 that are real tags store ids from the
  `db.etiquetas` registry (in text `.json` exports they come out as a list of
  names). One of them,
  `sinalizacoesTerritorialidade`, is a derived mirror and is no longer
  typed in the tag group. See `etiquetas-for-ai.md`.
- **Temas** (`temas`: list of `{ temaId, papel, nome }` in exports) — the
  text's themes by id, with `papel` `principal`, `secundario`, or empty
  (no role defined). The old `sinalizacoesTema` field no longer
  exists: read and write only `temas`.
- **Subject role** (`assuntosPapel`: list of `{ assuntoId, papel, nome }` in
  exports) — overrides only. A Subject inherits the role of the text's Themes;
  an entry exists when the person pinned a different role for that Subject in
  that text. With no entry, follow the Themes' role.
- **Subject exceptions** (`assuntosExcluidos`: list of `{ assuntoId, nome }` in
  exports) — Subjects the person removed from this one text ("does not apply to
  this text"), even though one of its Themes belongs to them. A Theme can sit
  in several Subjects, but a given text may fit only one. The Subject stays in
  the registry and the Theme stays in the text; only this text stops counting
  under that Subject. Treat a Subject listed here as absent from the text.
- **Transtextualidade e Referências** ("Transtextuality and References" —
  `intertextualidade`, `hipertextualidade`, `referenciasExternas`) —
  dialogue with works and facts external to the archive. See
  `transtextualidade-referencias-for-ai.md`.
- **Intratextualidade** (`conceitos.elos`, `conceitos.ecos`): links to
  other texts in the archive itself. See `intratextualidade-for-ai.md`
  for the Elo vs. Eco criterion and how to choose Relation, Direction,
  and Type.
- **Pessoas** ("People" — `pessoas`, and how it differs from `autoria`
  and `gruposDiretos`) — links to registered people and the roles they
  play in the text. See `pessoas-papeis-for-ai.md`.
- **Personagens** ("Characters" — `personagens`) — links to registered
  Characters (what the author created or reinterpreted), with roles,
  centrality and relation tags for the text. Not the same as Pessoas or
  References. See `personagens-for-ai.md`.
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
- **`idiomas`** ("languages"): list of `{ idioma, papel, dialetos }`
  ("language", "role", "dialects"). `papel` is `"principal"` or
  `"secundario"` (primary or secondary) and belongs to each language, so a
  text that is half in one language and half in another has two primary
  ones. If the list is not empty, at least one entry is primary. `dialetos`
  is an optional list of free-text varieties of that language (for example
  `["rioplatense"]`; more than one when the text mixes varieties, such as a
  dialogue between speakers from different regions). An empty list means the text has no language set.
- **`idioma`**: derived mirror of `idiomas`, a string with only the language
  names (primary ones first, comma-separated). Do not edit it on its own;
  `idiomas` is the source of truth.
- **`jargaoGiria`** ("jargon and slang"): list of free-text strings, set on the
  text itself and not inside `idiomas`, because a dialect belongs to one language
  while internet slang or corporate jargon does not. Fill it only when the text
  speaks WITH the vocabulary of a community or medium, literally: internet slang,
  youth slang, corporate jargon, fandom language. The app suggests four seeds
  (`"Gíria de internet"`, `"Gíria juvenil"`, `"Jargão corporativo"`,
  `"Linguagem de fandom"`) but never saves them on its own, and any other label is
  fine. Test question: does the text speak WITH these words, or AS IF it were that
  field? The second case is `Domínio Imagético` (an Etiqueta), not this field. It
  is also not: the general formality of the language (the Registro select in
  Sonoridade, where plain spoken marks such as "pra" or "tô" belong); citing
  memes, streaming services or apps (that is a Tema or a Referência: talking ABOUT
  something); or a dialect (it belongs to one language). Optional and sparse: an
  empty list is the normal case, so leave it empty when in doubt. Repeated labels
  (ignoring case and accents) are merged. A `.json` for "Importar campos" can fill
  it in bulk (see `importar-campos-for-ai.md`).

## Places: where the text was written and what it cites

Places come from a hierarchical registry, `db.locais`
(`{ id, nome, tipo, pertenceA, notas }`). `tipo` is free text with
suggestions (País, Estado, Região, Cidade, Bairro, Logradouro, Edificação,
Estação, Rede ou sistema, Corpo d'água) and may be empty. `pertenceA` is a
**list of parent ids**: a place can sit inside more than one (Estação Lapa
is inside both the Lapa neighborhood and the Metrô de São Paulo network).
The first parent is the main one and defines the canonical path; the others
only count when aggregating. A name alone does not identify a place: São
Paulo (Cidade) and São Paulo (Estado) are two records, so always read
`nome` together with `tipo`.

In an exported Poem or Prose record these fields are replaced by readable
objects, because ids mean nothing in another archive:

- **`territorialidade`** ("territoriality"): list of
  `{ localId, nome, tipo }`, the places the text **cites**, exactly as the
  person marked them. Ancestors are never stored here: if the text marks
  Lapa, Brasil is not in this list.
- **`localEscrita`** ("place of writing"): one `{ localId, nome, tipo }` or
  `null`, where the text was **written**. Only one per text (for writing in
  transit there is a place of type "Viagem" that belongs to a region).
  `null` means unset, not "nowhere".
- **`locaisHierarquia`** ("place hierarchy"): list of
  `{ localId, nome, tipo, pertenceA }` with every place above (cited and
  place of writing) **plus all their ancestors**. `pertenceA` lists parent
  `localId`s in the same list, main parent first. Use it to resolve
  "inside Brazil" questions; do not infer the hierarchy from names.

How to read them:

- **Cited directly vs. including what is inside.** "Cited directly" counts
  only the places marked on the text. "Including what is inside" counts a
  place plus every descendant, each text once per place, so a text that
  cites Santos and Lapa counts once for Brasil, and the sum of bars can
  exceed the number of texts. Say which one you used.
- **Place of writing is not what the text cites.** A poem written in Santos
  about Lisbon has `localEscrita` Santos and `territorialidade` Lisbon.
- **Territorialidade is not Tema.** Tema is the broad subject; a place
  named in the text goes in `territorialidade`. See
  `etiquetas-for-ai.md`.
- **`sinalizacoesTerritorialidade`** is a derived mirror: place names only,
  without type or hierarchy. Do not edit it and do not use it to tell
  same-named places apart; use `territorialidade`.
- An old export without `locaisHierarquia` only has the mirror names.

## Where the text lives (hierarchy and collections)

- **`aparicoes`** ("appearances"): the source of truth for where the text
  appears. A list of `{ livroId, parteId, secaoId, sequencia }`, one per
  place (Livro, Parte or Seção, with its position in that place's queue).
  `sequencia` is `null` when the text only "consta" (is listed) in the
  Livro, with no position. The same text can appear in several Livros, each
  with its own position. Coletâneas are not in this list: they stay in the
  Coletâneas' items. The list travels in the full backup `.json`; the text
  exports (selective, flat, `.csv`, `.md`) carry the mirror below plus
  `contexto.aparece_em`.
- **`paiTipo`** / **`paiId`** / **`sequencia`** / **`livrosIds`**: the older
  format, kept as a **mirror** of `aparicoes` for older screens. `paiTipo`/
  `paiId` point to the first appearance that has a place (Livro, Parte or
  Seção), `sequencia` is its position, and `livrosIds` lists the other
  Livros. The mirror cannot say everything the list says (for example a
  second appearance with a position), so in a conflict trust `aparicoes`.
- **Main appearance**: the one in the Livro with the oldest publication
  date (a tie, or no date, keeps the first in the list). It is only used to
  sort and label: the Poemas/Prosas tables are sorted by Livro, Parte,
  Seção and position of the main appearance, one row per text, with the
  others in the tooltip.
- **`contexto.coletaneas`** ("context.collections", exports only, never
  edited): list of the titles of the Coletâneas (Collections) that carry
  the text, in archive order, each one once. It comes from the
  Coletâneas' items, not from `livrosIds`. In `.csv` it is the
  `coletaneas` column (titles separated by " | "); in `.md`, `.pdf` and
  `.docx`, the "Coletâneas" line right after "Localização". The Additive
  Import ignores this field.
- **`contexto.aparece_em`** ("context.appears_in", exports only, never
  edited): one entry per appearance, `{ livro, parte, secao, posicao,
coletanea, principal }` (titles already resolved; `posicao` is `null` for
  "consta" only; `principal` marks the main one). `contexto.livro`, `parte`
  and `secao` are still only the first place (the mirror). In `.csv` it is
  the `aparece_em` column (appearances separated by " | ", empty with only
  one); in `.md`, `.pdf` and `.docx` and in the Ver, the "Aparece em" line,
  only for texts in two or more Livros. The Additive Import ignores it.

## Dates, periods, movement and inspiration

- **`dataEscrita`** ("date written") / **`dataPublicacao`** ("first
  publication date"): partial dates (day/month/year, any part can be
  missing), with an `exata` ("exact") flag on `dataEscrita` (precise vs.
  approximate date). The system refuses to save if `dataPublicacao` is
  earlier than `dataEscrita`.
- **`ano`** ("year"): a copy of `dataEscrita.ano`, kept only for
  compatibility with older sorting/stats/export code — don't edit it
  directly, it's derived from `dataEscrita`. Older texts that only had
  `ano` get `dataEscrita: { ano, exata: false }` on load
  (`migrarAnoParaDataEscrita`).
- **`epocaRetratada`** ("depicted era"): the time span the text depicts
  (not when it was written) — `{ periodos, inicio, fim, na }`. `periodos`
  is a list (0 to N) of `{ epocaId, recorte }`, each pointing to the
  central registry `db.epocas`; a text may depict several biographical
  periods. `recorte` ("cut/scope") is per period: `"momento"` (moment) |
  `"repercussão"` (aftermath) | `null` (e.g. "Corte de contato" as a
  moment and "Luto" with its aftermath in the same text). `inicio`, `fim`
  and `na` describe the whole text. Older files with `epocaId`/`recorte`
  directly on the object are still accepted. `na: true`
  is a deliberate third state — "marked as Not Applicable", different
  from "not yet categorized" (the whole field is `null`). Don't confuse
  the two: a text with no `epocaRetratada` hasn't been assessed; a text
  with `na: true` has been assessed and the answer was "doesn't apply".
  In the UI and exports the label is **Período Biográfico Retratado**
  (Depicted Biographical Period; the internal name `epocas`/
  `epocaRetratada` is kept for compatibility): it is a period of the
  person's own life (e.g. a phase of a relationship), not a historical
  moment.
- **`periodosHistoricosIds`** (**Período Histórico Retratado**, Depicted
  Historical Period): the historical (non-personal) moments the text
  depicts (e.g. military dictatorship, Covid-19 pandemic). An array of
  ids (0 to N) pointing to the central registry `db.periodosHistoricos`,
  with no main period and no meaningful order (unlike `pertenceA` in the
  registry itself). A text about the pandemic under the Bolsonaro
  government lists both "Governo Bolsonaro" and "Pandemia de covid-19",
  which is an independent top-level period. It coexists with
  `epocaRetratada` (both can be filled at once). Empty array = not
  informed. Replaces the former single `periodoHistoricoId`: old backups
  and old exports are migrated/accepted (`null` becomes `[]`, a value
  becomes `[value]`).
- **`movimentosEscolasIds`** (**Corrente literária**, Literary current (formerly Movimento/Escola)): an
  array of ids (0 to N) from the central registry `db.movimentosEscolas`
  (e.g. Romanticism, Symbolism, Modernism). A text may fit none or more
  than one. The same list also holds the divisions of a current (a current
  with a parent, such as a phase, generation, vertent or regional variant,
  e.g. "Romanticism in Brazil"). The app shows them apart ("Corrente
  literária" for the parentless ones, "Divisões" for the others), but
  nothing separate is stored: a division is derived from the registry
  entry having a parent (`paiId`). In the `.md` export they are two lines
  (`Corrente literária` and `Divisões`); in the `.csv`, `movimentos_escolas`
  and `movimentos_escolas_caminho` carry all of them, and
  `divisoes_corrente` and `divisoes_corrente_caminho` carry only the
  divisions.
- **`contextoHistorico`** (label **Inspiração**, Inspiration): free text
  about what inspired the text (a specific trigger or circumstance). The
  internal name is legacy; the content is NOT historical context, it is
  inspiration. Don't confuse it with `periodosHistoricosIds`.

## Intratextuality — Elos (Links) and Ecos (Echoes)

Links to other texts in the archive itself, by id (`conceitos.elos`,
`conceitos.ecos`). See `intratextualidade-for-ai.md` for how to choose
between Elo and Eco and fill in each one:

- **Elos** ("Links", bilateral): `{ id, relacao, direcao, texto }`, where
  `id` is the **target text's** id (there is no `poemaId`). `relacao`
  ("relation") comes from a closed list (Reescrita — Rewrite, Continuidade
  — Continuation, Tradução — Translation, Variação — Variation, Versão —
  Version, Resposta — Response, Díptico — Diptych, Outro — Other).
  `direcao` ("direction") is `"origem"` (the older/base text) or
  `"destino"` (the derived/newer text).
- **Ecos** ("Echoes", always one-directional, newer → older): `{ id, tipo,
texto, ancoras? }`, no `direcao`, where `id` is the target text's id.
  `tipo` comes from a closed list (Personagem em comum — Shared character,
  Pessoa em comum — Shared person, Imagem central compartilhada — Shared
  central image, Aceno a — Nod to, Outro — Other).
- **`ancoras`** ("anchors", optional, Eco only): a list of `{ especie, id
}`, who sustains the link. `especie` is `"personagem"` or `"pessoa"`, and
  the `tipo` decides which is valid: "Personagem em comum" only accepts
  character anchors, "Pessoa em comum" only person anchors, and the other
  types have no anchor. In the export each anchor also carries `nome`,
  because the id doesn't hold in another archive. An Eco without `ancoras`
  is valid (the link exists, the author just didn't record who sustains
  it). **The same Character or Person being present in two texts does not
  create an Eco**: the anchor only documents the reason for an Eco the
  author already decided to create. If a link is later removed from one of
  the texts, the anchor stays on the Eco with a warning, so check both
  texts before stating the figure is still in both.
- **`alvoTitulo`** ("target title"): in the export, each Elo and Eco also
  carries the target text's title, because the `id` only holds in the
  source archive. To identify the target in an exported file, use
  `alvoTitulo`, not `id`. If `alvoTitulo` is missing, the target wasn't
  found or the file is old.

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
- **`sorteavel`** ("drawable"): boolean, whether the author allows this
  text to be picked by the reading draw ("what do you want to read
  today?"). Off by default; absent means `false`. The author marks it by
  hand, so never set it to `true` on your own suggestion: offer it as a
  suggestion for them to review.
- **`leituraAutonoma`** ("autonomous reading"): string, whether the text reads
  on its own. `""` or absent is the default (reads on its own);
  `"sequencia"` (only in sequence), `"conjunto"` (only as a set) and
  `"inicio"` (only as a starting point: the first text of a sequence or set).
  It is not a link to Elos or Ecos, and Incompleto, Díptico and Resposta do
  not set it. In the reading draw, `"sequencia"` and `"conjunto"` are never
  drawn; `"inicio"` is drawn, marked "só o começo". The author decides, so
  never set it on your own: offer it as a suggestion for them to review.
  Details in `sorteio-for-ai.md`.
- **`valenciaAjuste`** ("valence adjustment"): string, the author's own
  judgement of how heavy the text is, used instead of the value derived from
  the text's Temas. `""` or absent follows the Temas (the default); `"leve"`
  (lighter), `"neutro"` (neutral or ambivalent) and `"pesado"` (heavier). The
  text's valence itself is never stored: it is computed from the Temas'
  valence (same index as the Estatísticas) unless this field is set. The
  author decides, so never set it on your own: offer it as a suggestion for
  them to review, saying why the text weighs differently from its Temas.
- **`autorEmSigilo`** ("author in secrecy"): boolean, whether the author
  wants their name kept out of the public screens (today: the reading draw
  page) for this text. Off by default; absent means `false`. The author
  decides, so never set it to `true` on your own: offer it as a suggestion
  for them to review.
- **`notasPublicas`** ("public notes"): boolean, whether the author marks
  `notas` as publishable (the "Public" checkbox under Notes). Notes may
  hold private material, so only the marked ones can be shown to readers
  (today: the reading draw page). Off by default; absent means `false`.
  The author decides, so never set it to `true` on your own: offer it as a
  suggestion for them to review.
- **`comentariosPublicos`** ("comments to the reader", shown as "Comentários
  ao leitor"): free text written for people who read the work; shown to
  readers whenever filled in. Unlike `notas`, write it with a reader in
  mind. It is not the `<!-- -->` comment of the text editor, which stays
  invisible in every output.
- **`status`**: closed list — `incompleto` (incomplete), `completo`
  (complete), `publicado` (published), `migrado` (migrated),
  `descartado` (discarded), `privado` (private). `privado` differs from
  `descartado`: it never had any intention of publication (always
  restricted to personal/intimate context), it's not something that was
  discarded later.
- **`pendencia`** ("pending item"): free text flagging an open item about
  the text — its presence (non-empty) is what lights up the visual
  indicator (🟠) in the table, same spirit as `conteudoSensivel` below.

## Text source

- **`fonteTexto`**: object `{ origem, edicao, link, dataAcesso, conferido, grafia }`
  (or `null`) — where the text came from when it is not the author's own
  work (third-party edition, transcription). `dataAcesso` (optional, ISO `yyyy-mm-dd`) is when `link` was accessed; it is only kept with a link and the key is absent when empty. `conferido` is a boolean:
  the text was checked against the source edition. `grafia` is `''`
  (current spelling, default), `'etimológica'` (etymological spelling —
  ph/th/y, doubled consonants — e.g. Cruz e Sousa, Augusto dos Anjos) or
  `'quinhentista'` (16th-century Portuguese — e.g. Camões) — it lets the
  Sonoridade (scansion) tool warn instead of silently miscounting
  syllables/stress on old-spelling text; it does not
  count toward "Fields Filled" and has no column or Statistics entry.
  Public-domain status is **not** a field: it is derived from the death
  year of the Author linked in `autoria`.

## Sensitive content and trigger vocabulary

- **`conteudoSensivel`** ("sensitive content"): a free paragraph
  describing sensitive content in the text. Its presence (non-empty) is
  what triggers the "Conteúdo sensível" badge in the interface — there's
  no separately stored boolean flag; it's always derived from the
  string. Different from `sinalizacoesSensibilidade` (loose, categorizable
  tags, e.g. "Linguagem obscena" — see
  `etiquetas-for-ai.md`): this field is the descriptive
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
  `{ livro, secao }` — where the text left from / where it landed. The app
  adds `livroId` (the book's registry id, when the book exists there); **do
  not fill `livroId`**, the app writes it, and `livro` should be the book's
  title. `secao` is `"Part / Section"`, shown on screen as
  `Book › Part › Section`.
  `cortadoDe` also takes an optional `posicao` (the number the text had
  there back then, a snapshot that is never recalculated). It applies to
  `migrado` and `descartado`; for a discarded text it is filled in when
  the text is discarded, and `sequencia` becomes `null`.
- **`justificativaMigracao`** ("migration justification"): free text
  justifying the migration.
- **`descarte`** ("discard"): free text — the reason for discarding,
  when applicable (`status: "descartado"`).

## Summary for practical use

1. If the task involves Etiquetas, Transtextualidade/Referências,
   Pessoas/Papéis, Personagens, or Sonoridade, use the dedicated doc — this file only
   summarizes those groups enough for you to know they exist.
2. Don't confuse `conceitos.ecos` (link between archive texts,
   Intratextuality) with Sonoridade's `es.ecos` (sound echoes) — same
   name, different fields, different docs.
3. `aparicoes` is where the text **appears** (one or more Livros, each with
   its own position); `paiTipo`/`paiId`/`livrosIds` are only its mirror.
   Prefer `contexto.aparece_em` in exports.
4. A missing `epocaRetratada` (`null`) ≠ `epocaRetratada.na === true` —
   the former is "not assessed", the latter is "assessed as not
   applicable".
5. `descricaoVisual` only exists on Poem — don't expect it (or its
   absence to mean anything) on a Prose record.
