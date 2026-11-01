# Transtextuality and External References: how to interpret this group

This document doesn't ask for any task — it explains the logic behind the
three fields that make up the "Transtextualidade e Referências
(Externas)" ("Transtextuality and External References") group in the
Poem/Prose modal, so that an AI receiving exported data correctly tells
apart **Intertextualidade** (Intertextuality), **Hipertextualidade**
(Hypertextuality), and **Referências (Externas)** (External References) —
three fields that look similar on the surface, but each has a different
criterion for when it applies.

The names come from the vocabulary of transtextuality theory (the
relations a text holds with other texts) — the group brings together two
categories from that theory (Intertextuality and Hypertextuality) plus a
third, practical field, External References, for anchors in the real
world that aren't, properly speaking, dialogue with a work.

Important: this group is always about the text and the **world outside
the archive** — works, public figures, historical facts. Links to
**other poems within the archive itself** (rewrite, translation,
continuation, diptych, echo...) live in a separate group,
"Intratextualidade (elos e ecos)" ("Intratextuality — links and echoes"),
and are not the subject of this document (see
`intratextualidade-for-ai.md`).

---

## The criterion that separates Intertextuality from Hypertextuality

Both fields follow Genette's theory: what decides is the **nature of the
relation**, not how much of the text is affected. Intertextuality is
**copresence**: the source work appears inside the text (a quotation, an
allusion). Hypertextuality is **derivation**: the text is born from the
transformation or imitation of another work and would not exist as it is
without it.

One-question test: **"if I remove the source work, does the text still
exist as it is?"**

- **Yes, it only loses a layer:** Intertextuality.
- **No, it is derived from it:** Hypertextuality.

In practice, derivation usually applies to the whole text (a translation, a
parody, a homage, a rereading), and copresence to a passage. But the rule is
derivation, not length: a single parodied line inside a poem is still, in
the archive, an Allusion or a distorted Quotation (the `nota` explains the
distortion), and only a whole text that exists by derivation goes into
Hypertextuality.

## Intertextualidade (Intertextuality)

Structure of each entry:

```json
{
    "relacao": "Citação",
    "tipoObra": "Música",
    "obra": "Águas de Março",
    "autores": ["Tom Jobim"],
    "personagens": [],
    "descricao": "canção de 1972 sobre o fim do verão",
    "dataObra": {
        "nivel": "ano",
        "ano": 1972,
        "aC": false,
        "aprox": false,
        "de": 1972,
        "ate": 1972
    },
    "trecho": "É pau, é pedra, é o fim do caminho",
    "traduzido": false,
    "link": "",
    "linkTexto": "",
    "dataAcesso": "",
    "nota": ""
}
```

- **`relacao`** (relation; shown as "Relação"): what the text does with the
  source. Free text with suggestions:
    - **Citação** (quotation): reproduces the source's words.
    - **Menção** (mention): names the work or the author without
      reproducing anything (the poem says "mirrorball", for instance,
      without quoting the lyrics).
    - **Alusão** (allusion): evokes the source without naming it.
    - **Paráfrase** (paraphrase): rewords a passage or idea from the source,
      and the text stands on its own. If the whole text is a rewording, it
      is Hypertextuality (Releitura).
    - **Bricolagem** (bricolage): glues fragments from several sources into
      the same text.

    Empty means "never defined", which is what old entries have until they
    are reclassified. It is not an error: don't infer the relation on your
    own from `obra`.

- **`tipoObra`** (type of work): what the referenced work is, the same
  medium suggestion list in both fields (Book, Text, Song, Film, TV
  Series, Video, Photograph, Painting, Play, Quote, Conversation, Lecture,
  Mythology, Fairy Tale, Other). Free text, not a closed list. It describes
  the artifact, never the relation.
- **`obra`** (work): the work's title, only the title. The quoted passage
  goes in `trecho`, and the explanation of what the work is goes in
  `descricao`.
- **`autores`** (shown as Autor): a **list** of free-text names, one tag per
  author (a song with a guest, a book by several people), with autocomplete
  and no link to the Authors registry. The order is the typed one and works
  as a highlight order, but it is **not** part of the work's identity: "A e
  B" and "B e A" are the same work. An empty list when authorship is diffuse
  or collective (a series, a fairy tale). There is no per-author role
  (performer, producer). Each tag is meant to be one name, but an old tag can
  still hold several ("Toquinho e Vinicius"): the app does not split it on
  its own, so describe what you see instead of splitting it yourself. Old
  backups and packages carry `autor`, a single text, which the app converts
  into one tag on load; if you find `autor` in an old file, read it as a
  list of one name.
- **`personagens`** (characters, screen label: Personagem): a **list** of
  free-text tags with autocomplete, one tag per character, in the order
  typed (the myth of Prometeu cites `["Prometeu", "Zeus"]`). Used when the
  line or the presence belongs to a character and not to the author
  (Medusa, Zeus, Cinderella, a series character). Author and character are
  independent: an entry can have one, both, or neither. Same rules as
  `autores` (no accent or case differences, no repeats). It is free text:
  it has no link with the Personagens registry, which only holds
  characters the author created or reinterpreted. Old backups and
  packages carry `personagem`, a single text, which the app converts into
  one tag on load; if you find `personagem` in an old file, read it as a
  list of one name.
- **`origemObra`** (shown as Origem): an optional **list** of free-text tags
  with autocomplete saying where the work comes from: a place or a culture
  ("Grécia", "Brasil"), never a period (time lives in the work's date) and
  never what the work is (Mythology, Fairy tale and Folklore go in
  `tipoObra`). It exists to place works with no single author, like the myth
  of Prometeu (`tipoObra` Mitologia, `autores` empty, `origemObra`
  `["Grécia"]`). Same comparison rules as `autores` (no accent or case
  differences, no repeats, first spelling wins). The key **only exists when
  filled**: an entry without it has no origin, so do not read an absent key
  as an error. It is **not** part of the work's identity (title plus
  authors), so two entries of the same work can disagree; the Corrigir obra
  dialog warns when they do. Free text, with no link to the Locais registry.
  Valid in Intertextuality and Hypertextuality, not in External References.
- **`descricao`** (description): the appositive that explains what the work
  is, for someone who does not know it ("a 1972 song about the end of
  summer"). It is a property of the work, not of the relation, so the same
  work (same type of work, same work, same author) usually repeats the same
  description across entries, and the app suggests it and, when there is
  only one, fills it in automatically. When the work is a letter or a
  conversation the author named, the description also says what that is.
- **`trecho`** (passage): the original's words as they appear in the
  **source** (not as they ended up in the archive's text). In a Citação the
  two coincide; in an Alusão or Paráfrase the source passage is what
  explains what the text refers to.
- **`traduzido`** (translated; the "Traduzido" checkbox, boolean): the text
  carries the passage translated from the source's language. It applies to
  any relation, which is why it is a checkbox and not a type. Translation of
  a **whole text** is not this field: it goes to Hypertextuality, relation
  "Tradução Adaptada".
- **`link`/`linkTexto`/`nota`**: optional. The `nota` says how the text
  relates to the work.
- **`dataAcesso`**: optional date the `link` was last accessed, ISO
  `"yyyy-mm-dd"` (shown as "acesso em dd/mm/yyyy", the ABNT "Acesso em").
  Only meaningful with a `link`: without one it is dropped. The key is
  absent when empty. Same field in Hipertextualidade, Attachments and the
  text's source (`fonteTexto.dataAcesso`).
- **`dataObra`** and **`dataObraAte`** (work date and "until"): the start and
  the end of the work's date, optional. Not to be confused with
  `dataAcesso`, the date the link was opened. See "Date of the work or of the
  fact" below.

**Old entries.** Before the redesign an entry had only `tipo` and `texto`.
In the migration, `tipo` became `tipoObra` and `texto` became `obra`, copied
as they were, without splitting the content: that is why an old `obra` may
carry title, author and even the quoted line mixed together ("Chico
Buarque, Construção"). If you find that, describe what you see, but don't
assume which part is the title and which is the author. Old packages and
backups that still carry `tipo` and `texto` are converted on import.

**What defines Intertextuality**: the text's dialogue with something
external to the archive, pointing to an **identifiable, nameable** work or
authorship, in copresence with the text (see the criterion above). A single
text can have several entries, of different relations and types of work, at
once. The reference can be light (a passing allusion) and does not require
the text to be transformed.

**Epigraph** is not a relation here. It is paratext (by the place it
occupies in the text) and stays as a Style tag. A text with an epigraph
taken from a work can have both: the Epigraph tag and a Citação entry.

**Citação is not Voz.** A passage from a work or from someone else's speech
brought in from outside (epigraph, song lyric, line from a book) is a
Citação, here in Intertextuality. Who speaks in the scene of the text is
Voz, in the People field (see `pessoas-papeis-for-ai.md`). A conversation
reproduced as a speaking turn of the scene is Voz; treated as a document (a
screenshot, a dated conversation), it is a Citação with type of work
Conversa.

## Hipertextualidade (Hypertextuality)

Structure of each entry:

```json
{
    "tipoObra": "Livro",
    "relacao": "Paródia",
    "hipotexto": "Dom Casmurro",
    "autores": ["Machado de Assis"],
    "descricao": "romance de 1899",
    "dataObra": {
        "nivel": "ano",
        "ano": 1899,
        "aC": false,
        "aprox": false,
        "de": 1899,
        "ate": 1899
    },
    "link": "",
    "linkTexto": "",
    "dataAcesso": "",
    "nota": ""
}
```

- **`tipoObra`** (type of work): the same medium suggestion list as
  Intertextuality, on purpose: it is the same kind of artifact, only now
  pointing to a specific source.
- **`relacao`** (relation): the nature of the derivation, with its own
  suggestions: Rereading, Adapted Translation, Parody, Pastiche, Expansion,
  Rescaling, Homage, Transposition (stored as Releitura, Tradução
  Adaptada, Paródia, Pastiche, Expansão, Redimensionamento, Homenagem,
  Transposição). In Intertextuality `relacao` has the same role (the nature
  of the relation), only with another list.
- **`hipotexto`** (hypotext): the name of the specific source work being
  transformed. It is the equivalent of `obra` in Intertextuality.
- **`autores`** (authors): a list of free-text tags with autocomplete, as in
  Intertextuality.
- **`origemObra`**: the optional list of places or cultures, as in
  Intertextuality.
- **`descricao`** (description): the appositive that explains what the work
  is, shared with Intertextuality when the work is the same.
- **`dataObra`** and **`dataObraAte`**: the date of the source work,
  optional, as in Intertextuality.
- Hypertextuality has no `personagens`, `trecho` or `traduzido`.

**Old entries.** Before, `tipo` played the role of `tipoObra`. The
migration converts it, and `autores`, `descricao` and the dates stay empty.

**What defines Hypertextuality, and how it differs from
Intertextuality**: here the archive's text is the "hypertext", a direct
transformation or derivation of a specific source "hypotext". It isn't
just "dialogues with" or "quotes", it's "derives from" or "transforms".
Practical rule: if the text **reworks, rewrites, or structurally leans on**
a specific source work (a parody, a rereading, an adapted translation, a
homage), that is Hypertextuality; if it's a quotation, mention, allusion or
paraphrase of a passage (without the text itself _being_ a transformation of
the work), that is Intertextuality.

## Referências (Externas) (External References)

Structure of each entry:

```json
{ "tipo": "Marco histórico", "texto": "Enchente de 2011", "link": "", "linkTexto": "", "nota": "" }
```

- **`tipo`** (type): free text with suggestions (Historical landmark,
  News, Public figure, Other).
- **`texto`** (text): the reference itself.
- **`dataObra`** and **`dataObraAte`**: the date of the fact, optional, for
  any `tipo`. Historical landmark: start and end. News: the date and the
  "until". Public figure: birth and death (death stays empty for someone who
  is alive). See the next section.

**What defines External References, and how it differs from
Intertextuality**: something that anchors the text in a shared time or
world — a fact, an event, a public figure — **without any work or
authorship being referenced**. "Public figure" is one of the suggested
types here precisely because, historically, this field grew out of a type
that used to live inside Intertextuality and was split off: citing a
public figure isn't dialogue with a work of theirs, it's a
factual/real-world anchor.

Note that "Public figure" here is **free text**, with no link to the
central people registry (`db.pessoas`) — this is different from a person
formally linked to the text via the `pessoas` field (see the document on
People and Roles). If the person mentioned has a recognizable role in the
text's origin (portrayed, dedicatee, etc.) and is in the central registry,
the correct link is `pessoas`, not an entry here.

**Optional fields for "Public figure" entries.** When `tipo` is "Public
figure", the entry can also carry four optional fields, written only when
filled (a different `tipo` never carries them):

- **`conhecidoComo`** ("Known as"): a list of free-text tags saying what
  the person is or was known as outside the text (Historical figure,
  Singer, Writer, Actor/Actress, Politician, Philosopher, Scientist, Visual
  artist, Athlete, Influencer are the suggestions). A person is often more
  than one thing, and the tag belongs to the entry, so the same person can
  be tagged differently in another text, according to the version of them
  that the text cites.
- **`genero`**: `Mulher` (woman), `Homem` (man) or `Não-binário`
  (non-binary). It records gender identity only, not cis/trans.
- **`orientacao`**: `LGBT`, `Hétero` (straight) or absent.
- **`corRaca`**: `Branca`, `Preta`, `Parda`, `Amarela` or `Indígena` (the
  list used for Authors and People).

**Missing means "not informed", never "no".** An entry without `orientacao`
does not say the person is straight, and one without `genero` or `corRaca`
says nothing about them. Do not infer the missing values and do not count
them as any category. These fields exist so the author can see what kinds
of people he draws references from; the exports carry them next to the
name (the `.json` as keys, the `.md`, PDF, DOCX and the Visualization in parentheses,
the `.csv` in the `referencias_externas_conhecido_como`, `_genero`,
`_orientacao` and `_cor_raca` columns, aligned by position with the entries).

## Date of the work or of the fact (all three fields)

Each Intertextualidade, Hipertextualidade or Referências entry can carry up to
two dates, in the keys `dataObra` (the start) and `dataObraAte` (the end).
Both are optional and the key only exists when there is a date: **absent
means "not informed", never "no date" and never "still alive"**. A Public
figure without `dataObraAte` may be alive or may simply not have been filled
in.

Each end picks **one level at a time** (century, decade, year, month or day)
and carries two marks:

```json
{ "nivel": "seculo", "seculo": 20, "aC": false, "aprox": false, "de": 1901, "ate": 2000 }
{ "nivel": "decada", "decada": 1920, "aC": false, "aprox": false, "de": 1920, "ate": 1929 }
{ "nivel": "ano", "ano": 1922, "aC": false, "aprox": false, "de": 1922, "ate": 1922 }
{ "nivel": "mes", "ano": 1922, "mes": 2, "aC": false, "aprox": false, "de": 1922, "ate": 1922 }
{ "nivel": "dia", "ano": 1922, "mes": 2, "dia": 11, "aC": false, "aprox": false, "de": 1922, "ate": 1922 }
```

- **`nivel`** (level): how precise the author knows the date to be. "20th
  century" only means "in the 20th century": do not invent a year more precise
  than the level.
- **`aC`**: `true` for before Christ (BC). The number of the year, decade or
  century stays positive; the sign lives only in `de` and `ate`.
- **`aprox`**: `true` when the date is approximate ("aprox."). It only marks,
  it does not change the interval.
- **`de`** and **`ate`**: the interval of years the level covers, signed and
  **with no year zero** (1 BC is -1, 1 AD is 1). 20th century = 1901 to 2000;
  the 1920s = 1920 to 1929; year, month and day = the year itself; 5th
  century BC = -500 to -401. The app recomputes both on every read and write.
  To know the work's era, read this interval.

What each end means depends on the type: Work (Inter and Hiper) and News, the
date and the "until"; Historical landmark, start and end; Public figure, birth
and death. The app writes the date as "séc. XX" (20th century), "década de
1920", "1922", "44 a.C.", "02/1922" or "11/02/1922", with "aprox. " in front,
and the pair as "1920 até 1935" ("nasc. 1920, óbito 1977" for a Public
figure).

The date is a property of the **work**, like the `descricao`: the same work
(same name and same authors, ignoring accents, case and order) repeats the
same date across entries, and the app suggests it. It only fills it in on its
own when both ends are empty and there is a single pair of dates for the work;
with two or more, it shows the pairs already used so the author can pick one.
Different dates on the same work are not an error (they can be different
editions), but they are a reason to check.

## Comparison summary

| Field               | Points to                                  | Nature of the link                                              |
| ------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| Intertextuality     | A specific, nameable work/artifact         | Copresence: quotation, mention, allusion, paraphrase, bricolage |
| Hypertextuality     | A specific source hypotext                 | Derivation/transformation of the whole text                     |
| External References | A real-world fact, event, or public figure | Factual anchor, no work/authorship involved                     |

And, outside this group but often confused with it:

| Field                            | Points to                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Links / Echoes (Intratextuality) | Another poem/prose piece in the archive itself                               |
| Imagery Domain (Tags/Etiquetas)  | Vocabulary/repertoire from a field of knowledge, with no specific work cited |

## What this means in practice for an AI reading the data

1. Before classifying an external mention found in the text, ask: is it a
   nameable work/authorship (Intertextuality or Hypertextuality), or a
   fact/public figure from the real world with no authored work involved
   (External References)?
2. If it's a nameable work, apply the test: if the source work were
   removed, would the text still exist as it is? If yes, it is
   Intertextuality (pick the relation: Citação, Menção, Alusão, Paráfrase or
   Bricolagem). If not, because it is derived from it, it is
   Hypertextuality.
3. Don't suggest moving a "Public figure" entry from External References
   into the People field — they are deliberately distinct (one is a
   free-text world anchor; the other is a structured link into the
   central registry) — unless the task explicitly asks to formally
   register that person.
4. Don't confuse this group with Links/Echoes (which are about other
   texts within the archive itself) or with Imagery Domain (which is
   repertoire from a field of knowledge, not a specific work).
5. When reading an Intertextualidade entry, don't mix the fields: `obra` is
   only the title, `autores` and `personagens` (both lists) say whose it is,
   `origemObra` (a list, present only when filled) says what place or
   culture it comes from, `descricao` explains what the work is, `trecho` is the source's words,
   `dataObra` and `dataObraAte` say when the work is from and `relacao` is
   what the text does with it. An empty relation means "never defined"; an
   absent date, "not informed".
6. In exports, the `.md` and the View screen group Intertextuality in two
   levels (relation, then type of work), with entries that have no relation
   in a block at the end; the `.csv` has the reading column
   `intertextualidade` plus one column per field
   (`intertextualidade_relacao`, `_tipo_obra`, `_obra`, `_autor`,
   `_origem`, `_personagem`, `_descricao`, `_trecho`, `_traduzido`, `_data_obra`,
   `_data_obra_ate`, and the Hypertextuality equivalents; External
   References have `referencias_externas_data` and `_data_ate`), with one
   value per entry separated by `|`. In the `_autor` columns, the authors of
   one entry are separated by `; `, and the date columns carry the text of the
   date ("séc. XX", "1922"), one per entry, keeping the empty slot when the
   entry has no date. In the `.md` and the View screen, the date comes after
   the work, after " · ". The `.json` carries the keys as they are: `autores`
   as a list and `dataObra` and `dataObraAte` as the objects above.
7. The Conexões (Connections) tab has a **Fora do acervo** ("outside the
   archive") section that gathers these three fields from every text, as a
   lens (nothing lives there, the data stays in the entries). It downloads a
   report as `.md`, `.csv` or `.pdf` (files `fora-do-acervo*.md`, `.csv` and
   `.pdf`), with the blocks **Obras** (works: each with its authors, type,
   dates, relations with ×n when repeated, description, spellings and texts),
   **Autores** (each author with works and texts), **Origens** (each origin, the
   place or culture from the work's Origem field, with the works, authors and
   texts that carry it; entries without an origin go under "Sem origem
   preenchida", always last), **Hipertextualidade** (which
   work each text derives from), **Referências** (those that appear in two
   texts or more, and those in a single text) and **Avisos de
   quase-duplicatas** (near-duplicate warnings). A work is identified by its
   name plus its authors, ignoring accents, case, punctuation and order. A
   work with more than one date comes out as "Datas diferentes" (different
   dates). A near-duplicate warning is only a hint that two spellings may be
   the same work, not a statement: confirm before treating them as one. A
   "Filtro:" (filter) line at the top of the `.md` says whether the report was
   filtered. The filter of the Obras, Autores and Origens lists accepts
   `campo:valor` (prefixes `texto:`, `obra:`, `autor:`, `origem:`, `tipo:`,
   `relacao:`, `data:` and `pessoal:`), `ou` (or), "exact phrase", `-term` to
   exclude and `campo:*` for a filled-in field (`-origem:*` keeps only what has
   no origin), and the downloaded report uses the same filter. In the Autores
   and Origens lists the filter applies to the works inside each item:
   `-pessoal:*` leaves the origin with only its non-personal works, and the
   item disappears only when none is left (texts, works and counts are
   recomputed); the prefix of the list's own name (`autor:`, `origem:`) and
   `pessoal:algumas` look at the whole item.
