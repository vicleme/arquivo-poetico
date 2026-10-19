# Tags (Etiquetas): how to interpret this field

This document doesn't ask for any task — it explains the logic behind the
archive's tags (called "Etiquetas" in the interface; formerly "Sinalizações", a name that
still appears in the field keys, such as `sinalizacoesEstilo`), so that an AI receiving exported data reads each tag under the
right category, without mixing up what each one means.

**Tema (Theme) and Territorialidade (Territoriality) are no longer part of the
tags.** Each now has its own field (`temas`; `territorialidade` and
`localEscrita`), described in `campos-poema-prosa-for-ai.md`. See "What left
the tags" below.

---

## What the field is (and isn't)

There is no single "tags" field. "Etiquetas" is the name of the
**group**, but behind it there are **7 independent fields**, one per
category, each a list of tags from the **Etiquetas registry**
(`db.etiquetas`, each record `{ id, nome, categoria, notas }`). The registry
is not a closed list of pre-defined options: whoever catalogs types the tag
they want and it enters the registry if it doesn't exist yet, with
autocomplete suggesting whatever has already been used in that same category,
to avoid variants of the same idea. The same name may exist in two categories
(with different meanings), but within one category a name is unique,
ignoring case and accents.

Each of these 7 fields is, in fact, a **list** — it accepts as many tags
as make sense for the text, not a single value per category. This matters
for a recurring decision: when a text carries two things perceived at
once (two traditions, two style devices, two Tone impressions), the default is
to record each as its own tag in the list — not merge the two into one
composite label. It's only worth merging into a single label when the
combination is itself an indivisible feeling or idea, one that isn't the
sum of its parts — in Tone, for example, "Very saccharine" isn't
"romantic" + "intense" happening in parallel, it's a reading texture of
its own, so it works as a single tag. Outside that case (e.g., a poem
that is melancholic _and_, in a different passage, hopeful — two real but
distinct impressions, not one single thing), separate tags keep the list
more useful for filtering and cross-referencing later.

The 7 fields:

| Field (key)                    | Label                              |
| ------------------------------ | ---------------------------------- |
| `sinalizacoesTradicao`         | Tradição (Tradition)               |
| `sinalizacoesEstilo`           | Estilo (Style)                     |
| `sinalizacoesRelacao`          | Relação (Relation)                 |
| `sinalizacoesSensibilidade`    | Sensibilidade (Sensitivity)        |
| `sinalizacoesTom`              | Tom (Tone)                         |
| `sinalizacoesDominioImagetico` | Domínio Imagético (Imagery Domain) |
| `sinalizacoesOutros`           | Outros (Other)                     |

A "flat" export combines everything into a single string
(`sinalizacoesCombinadas`) for general search and simple statistics — but
that combined version **loses each tag's category** (and may still carry the
mirrors of Tema and Territorialidade, which are not tags; see below).
Whenever a task depends on knowing which category a tag belongs to (e.g.,
"what are the most common tones" vs. "what are the most common style
devices"), use the 7 separate fields, not the combined string.

## What left the tags: Tema and Territorialidade

Tema (Theme) and Territorialidade (Territoriality) used to be tag
categories. They are now **fields of their own**, with a registry and a
structure that a free-text tag doesn't have. Don't look for them among the
tags, and don't propose tags of those kinds:

- **Tema (Theme)** → `temas`: a list of `{ temaId, papel, nome }`, where
  `papel` is `principal`, `secundario` or empty, linked to the Themes
  registry (which in turn are grouped into Assuntos, Subjects). It is the
  central subject of the text. When naming or reviewing themes, the
  criterion already adopted in the archive applies: name the **concrete
  cause**, not the emotional effect — "Cyclical existential crisis" is
  vaguer than the event or situation that produces that feeling. A country
  only becomes a Theme when the nation itself is the central subject (its
  identity, its direction, what it is), as in a text about Brazil as a
  country. A Brazilian historical period, a social sphere within Brazil, or a
  problem that happens there is not enough: those use Período Histórico
  Retratado (Portrayed Historical Period), or the specific Theme (e.g.,
  Polarization, Systemic corruption), together with Territorialidade.
- **Territorialidade (Territoriality)** → `territorialidade`: a list of the
  places **present** in the text, whether by naming them or by dealing with
  them (a country, a city, a neighborhood, a river), linked to the
  hierarchical Places registry. The place where the text was **written** is a
  separate field, `localEscrita`, and the exported hierarchy is in
  `locaisHierarquia`. A poem that names "Copacabana" or "the Amazon River", or
  that deals with Brazil without naming it (e.g., "this country"), uses
  Territorialidade. Tema and Territorialidade are independent and can
  coexist: a text about Brazil as a nation has Tema "Brazil" **and**
  Territorialidade Brazil, while a text about a social sphere within Brazil
  has only Territorialidade (plus the specific Theme). Also different from
  Domínio Imagético, which is vocabulary borrowed from a knowledge domain,
  not a place.

`sinalizacoesTema` and `sinalizacoesTerritorialidade` may still show up in
exported data, but only as **derived mirrors** of those fields
(comma-separated names, with no role, type or hierarchy). They are not tags,
are not edited, and shouldn't be read as tags: use `temas` and
`territorialidade`. An older export, from before the dedicated fields, may
have only the mirror.

## How tags appear in exported data

The text stores **ids** from the registry, and an id only means something
inside the archive that created it. So each output carries the tag in a
different way:

- **Full backup (the whole-database `.json`):** each field is a list of ids,
  and the registry comes along as `etiquetas` (with each tag's `nome`,
  `categoria` and `notas`). Resolve the id through that registry.
- **Text exports (`itens`: selection, selective export, flat, download one
  text):** each of the 7 fields is a list of **names**, ready to read. The
  registry is not in these files, so a tag's note is not there.
- **Nested JSON (nested everything and filtered full):** the fields carry ids
  and the file root carries `etiquetas`, the registry to decode them.
- **Older files**, from before the registry, may carry the field as
  comma-separated text. Read each piece as one tag name.

Never invent or assume an id: if the task asks for a new tag, propose its
**name** and category. The app creates the registry record on import or save.

## Tag clusters: groupings of tags, not stored in the texts

A **tag cluster** is a hand-made grouping of tags of one category (for example, a cluster "Health" holding the Domínio Imagético tags Medicina, Enfermagem and Oftalmologia). It exists to read statistics by group instead of by tag. It classifies the **tag itself**, not how a text uses it.

- **Not in the texts.** No text field carries a cluster, and the modals do not show one. Do not infer a cluster from a text, and do not write one into a text.
- **Where it lives.** The registry `tagClusters = [{ id, nome, categoria, notas, paiId? }]`, and each tag in `etiquetas` may carry `clusterId`. A tag is in **one cluster or none** (the field holds a single id).
- **Subclusters (one level only).** A cluster with `paiId` is a **subcluster** of the cluster that id points to, always in the same category; a subcluster cannot have subclusters. A tag's `clusterId` points to the most specific place (the subcluster), and the tag belongs to the parent by consequence; it may also sit directly in the parent. Names must be unique among siblings: top-level clusters do not repeat each other, a subcluster repeats neither a top-level name nor a sibling, but two parents may each have a subcluster with the same name (for example "Outros"). A name never contains `>`.
- **Same category only.** A cluster belongs to one category and accepts only tags of that category. Six categories accept clusters: `dominioImagetico`, `tom`, `tradicao`, `estilo`, `relacao` and `sensibilidade`. `outros` does not.
- **Where it appears in exported data.** The full backup carries `tagClusters` and `clusterId`. Text exports (`itens`) do not carry clusters. The Tag clusters tab can also import clusters from pasted text, one `Cluster: tag, tag` line per cluster, or `Parent > Subcluster: tag, tag` for a subcluster (the parent is created if missing; one level only) (category from a selector or a `## Tom` heading; it never creates tags, and the report lists the ones not found). The cadastro has its own download, `tag-clusters.md`, from the Tag clusters tab: one section per category, each top-level cluster as `###` with its own tags and text counts, its subclusters nested under it as `####`, plus the tags that have no cluster yet. Position and heading level tell who is inside whom.
- **Counts.** A text counts once per cluster, even with two tags of the same cluster. A parent counts the union of its own texts and its subclusters' (each text once, never summed). Because a text has several tags, the sum of clusters can exceed the number of texts.
- **When asked to group tags.** Propose clusters by **name** and category, and list which tag **names** go in each. Use a subcluster only when a cluster has roughly 6 to 8 or more tags that split into groups you can name naturally; never make a subcluster with a single tag, and never go past one level. Never invent an id. Keep each tag in one cluster only, never mix categories in a cluster, and leave out a tag that does not fit instead of forcing it.

## What each category means

- **Tradição (Tradition)**: poetic forms or schools inherited from a
  tradition — e.g., sonnet, haiku, cordel (Brazilian narrative
  verse-ballad). It's about form coming from outside, not a device the
  text itself invents (that's Style).
- **Estilo (Style)**: a specific formal or stylistic device of the text —
  typographic play, verse-construction techniques, figures of speech
  named in the archive's own terms (e.g., "Rotação tipográfica"
  /"Typographic rotation" for a passage that only reads right-side-up
  when read upside down, "Paronomásia por espaçamento" /"Paronomasia by
  spacing" for a space that isolates a shared root between two words). It
  tends to name the technique, not the effect.
- **Relação (Relation)**: names a specific relationship or bond portrayed
  in the text — it can be the name of a dynamic between two specific
  people (the archive already uses tags of this kind, coined by the
  author to name a pair of people and their relationship). This is
  different from People + Roles (which links the text to a registered
  person with a closed-list role, see the other document) — Relation is a
  free-text tag about the nature of the bond itself, not a structured link
  with a `pessoaId`.
- **Sensibilidade (Sensitivity)**: loose tags about categorizable
  sensitive content (e.g., "Obscene language"). Careful: this is
  **different** from the `conteudoSensivel` field, which is a separate
  descriptive paragraph about sensitive content — "Sensitive content" is
  no longer a tag inside this category; it's now **derived** from the
  mere presence (non-empty) of that other field. Don't expect to see a
  literal "Conteúdo sensível" tag inside Sensitivity in current archive
  data.
- **Tom (Tone)**: the emotional register or attitude perceived in the
  text (e.g., "Very saccharine"). This is a reading judgment/tone, not a
  formal device (that would be Style) nor a type of sensitive content.
- **Domínio Imagético (Imagery Domain)** _(full label: "Domínio Imagético
  (repertório)" — "Imagery Domain (repertoire)")_: vocabulary or imagery
  the text borrows from an entire knowledge domain — e.g., "Astrology,"
  when the poem uses terms like Venus/Transits as a general register,
  without citing one specific work. The important distinction is with
  **Intertextuality** (see the document on the Transtextuality and
  External References group): Imagery Domain is repertoire/vocabulary
  borrowed from a field of knowledge; Intertextuality is dialogue with
  **one specific, nameable external artifact** (a particular song, a
  particular book). A poem that cites astrology in a generic way uses
  Imagery Domain; a poem that cites a specific, identifiable astrological
  report would use Intertextuality instead.
- **Outros (Other)**: a temporary bucket for migrated tags that haven't
  earned their own category in the schema yet (today, for example,
  recognitions and translations/variations, which are expected to migrate
  later into structured Links and Recognitions fields). It is not a 9th
  category with a settled meaning of its own — it's temporary visibility
  until those tags become proper fields. When interpreting it, don't
  assume tags here share any common meaning beyond "doesn't have a proper
  place yet."

## Use-case learnings / Archive conventions

This section records how the archive tends to decide borderline cases, based
on the cataloguing of real texts. These are observed conventions, not closed
rules: they may be revised as new texts are catalogued, and a tag that
departs from them is still valid.

- **Paralelismo (Parallelism), Anáfora (Anaphora) and Paralelismo antitético
  (Antithetical parallelism).** These are different tags and can appear
  together. "Paralelismo" is the repetition of the same syntactic pattern
  across lines or stanzas; "Anáfora" is the repetition of the same words at
  the opening of lines or stanzas; "Paralelismo antitético" only applies when
  the parallel members oppose one another. If what repeats is the pattern and
  contrast is not the principle organizing it, the tag is plain
  "Paralelismo," without qualifiers such as "syntactic" or "structural."
- **Polissemia (Polysemy), Homonímia (Homonymy) and Paronomásia
  (Paronomasia).** "Polissemia" only applies when a single word activates two
  related meanings at once and the poem needs both (e.g., "globo" as both
  world and eyeball). It is not the ordinary ambiguity of any word. It
  differs from "Homonímia" (unrelated meanings, such as "nós" the pronoun and
  "nós" the knots) and from "Paronomásia" (similar-sounding words with
  different meanings).
- **Domínio Imagético (Imagery Domain): the specialty, when the vocabulary
  belongs entirely to it.** When a text borrows the vocabulary of a specific
  specialty (e.g., the eye and vision, "Oftalmologia" / Ophthalmology;
  pregnancy and childbirth, "Obstetrícia" / Obstetrics), the specialty is
  used rather than the broader field ("Medicina/Enfermagem" / Medicine and
  Nursing), which is kept for general medical vocabulary. Before creating a
  new tag, an existing one is reused when it already describes the domain
  well.
- **Sensibilidade (Sensitivity): explicit, categorizable content.** The
  category is reserved for sensitive content that is explicitly portrayed and
  fits a type (e.g., "Linguagem obscena" / Obscene language, "Violência
  sexual" / Sexual violence). Mentioning a heavy subject in passing, such as
  depression or abuse, does not generate a tag here; when that subject is
  central to the text, it is a matter for Tema. The category remains distinct
  from the `conteudoSensivel` field.
- **Tradição (Tradition): confessional as the default; social when critique
  is the axis.** "Poesia confessional" (Confessional poetry) is the usual tag
  for a text born of lived experience, even without an explicit lyric "I" or
  a narrated episode. "Poesia social" (Social poetry) is for texts in which
  social critique is the axis (inequality, polarization, sexism, among
  others); a single critical clause inside a poem about something else is
  not enough.
- **Estilo (Style): figures and devices, not grammatical categories.** The
  Style vocabulary names figures of speech and formal or graphic devices
  (e.g., "Anáfora", "Paronomásia", "Oxímoro" / Oxymoron, "Fusão lexical por
  diacrítico" / Lexical fusion by diacritic). Grammatical traits, such as
  verb mood or the type of subordinate clause, don't become Style tags; when
  relevant, they are usually already covered by a larger device, such as
  Paralelismo.

## What this means in practice for an AI reading the data

1. Always read a tag together with the category (field) it's in — the
   same tag text could, in principle, appear in different categories with
   different meanings; the category is what resolves the ambiguity.
2. Don't treat a category's tag list as closed/enumerated — the values are
   free text, so an unfamiliar or unseen-before tag isn't an error, it's
   just a new tag.
3. When suggesting new tags, prefer reusing one already used in the same
   category (avoid variants of the same idea), and name the concrete
   cause rather than the emotional effect, following the criterion already
   adopted in the archive for Themes.
4. Don't confuse Sensitivity (a categorizable tag) with the derived
   "sensitive content" flag (presence of a paragraph in
   `conteudoSensivel`) — they are different things that shouldn't be
   merged or treated as synonyms.
5. Each field is a list (multiple values per text): as a rule, record
   distinct aspects or impressions as separate tags in the same list.
   Only propose a composite/merged tag when the combination is itself an
   indivisible idea that doesn't reduce to the sum of its parts — when in
   doubt, prefer keeping them separate.
