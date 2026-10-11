# Characters: how to interpret this field

This document doesn't ask for any task. It explains the logic behind the
`personagens` (Characters) field on Poems and Prose pieces and behind the
Character registry, so that an AI receiving exported data (or reading the
code itself) can interpret the field without inferring things the schema
deliberately leaves unstated.

---

## What a Character is

A Character is something **the author created or reinterpreted**. It is not
the same as two similar things:

- **Person** (`pessoas`): someone who exists or existed for real. See
  `pessoas-papeis-for-ai.md`.
- **Reference** (`intertextualidade`, `referenciasExternas`): someone who
  already exists outside the work (a public, religious or mythical figure).
  See `transtextualidade-referencias-for-ai.md`.

The same name can exist in all three registries without being the same
record. Don't merge them because the names look alike.

## The registry (`db.personagens`)

Each Character is registered exactly once, as `{ id, nome, origem, notas,
genero, orientacao, corRaca, nascimento, obito, caracteristicas,
participacoes }`. In the exported data of a Poem or Prose piece the registry
does not come as a separate list: each link on the text carries `nome`,
`origem` and the registry data (see "What travels in the export").

- **`origem`** ("origin"): `Criado` (Created), `Reinterpretado`
  (Reinterpreted) or empty. Empty means "not defined". Don't deduce the
  origin from the name (a famous name doesn't make a Character
  `Reinterpretado`).
- **A repeated name is allowed.** Two Characters from different works can
  share a name. In searches and Statistics the comparison is by name,
  ignoring case and accents, so those two count together. If the task
  depends on telling them apart, look at `origem` and `participacoes`.
- **`genero`, `orientacao`** (gender, orientation): free text with
  suggestions. **`corRaca`** (color/race): a closed list (the same one as
  the Author registry). **Empty means not defined, and nothing is
  inferred.** Don't fill in gender, orientation or color/race from the
  name, the text or the context.
- **`nascimento`, `obito`** (birth, death): a partial date `{ dia, mes, ano
}`, with any part possibly missing, or `null`. The year is **internal to
  the fiction**: it serves the Character's age inside the work, never for
  comparing with the real writing date. Age is not exported (it is computed
  on screen, only against a reference year).
- **`caracteristicas`** (characteristics): what belongs to the Character
  itself, not to the relation with a text. Seven tag groups
  (`personalidade`, `valoresCrencas`, `desejos`, `medos`, `tracosFisicos`,
  `arquetipos`, `backstory`) plus `backstoryNota` (free text about the
  past). Tags are plain and untyped so the vocabulary is shared and
  comparable. An empty list means "not filled in yet", not "the Character
  has none".

The purpose of these characteristics and of the identity fields is to
compare, in the future, how the gender of the writer changes the view of
gender in the writing. That is why they belong to the Character and are
kept apart from the relation with the text.

## The link on the text (`personagens`)

`personagens` is a list of links, **one per Character** on each text:

```json
{
    "personagemId": 4,
    "nome": "Capitu",
    "origem": "Reinterpretado",
    "papeis": ["Voz", "Aparição"],
    "centralidade": "protagonista",
    "papelNarrativo": ["narradora"],
    "funcaoTematica": ["ciúme"],
    "arco": [],
    "tropes": []
}
```

(Besides the registry fields described above, which also come on the
link.)

### `papeis` ("roles"): a closed list, and the order is NOT relevance

A list of zero, one or several values from a closed list of 5, in the order
they appear here:

- **Voz** (Voice), **Interlocutor** (Interlocutor) and **Aparição**
  (Appearance): roles of effective presence in the text. The schema doesn't
  define each one beyond its label, so read them by name and don't add
  details the author didn't record.
- **Menção** (Mention): the Character is named in the text.
- **Alusão** (Allusion): the Character is evoked without being named. It is
  kept apart from Menção on purpose, as in `pessoas`.

The same Character can hold several roles on the same text (for example,
Aparição and Interlocutor).

**Careful, this differs from the `pessoas` field.** In `pessoas`, the order
of the roles can reflect relevance, because it preserves the order the
person ticked them. In `personagens`, the system **always reorders** the
roles into the fixed order above (Voz, Interlocutor, Aparição, Menção,
Alusão), whatever sequence they were marked in. So:

- The order of `papeis` **carries no relevance information**. Don't say
  "Voz comes first, so it's the strongest role".
- Don't suggest reordering the roles by relevance: the system wouldn't
  keep it. If the task asks for an assessment of weight, use `centralidade`
  and the relation tags.

`papeis: []` is valid and means the Character is linked to the text but
their role hasn't been defined yet. Don't treat it as "not linked" and
don't invent a role.

### `centralidade` ("centrality"): `protagonista`, `secundario` or empty

A single value per link. Empty (`""`) has **two meanings**, and `papeis` is
what tells them apart:

- **Undefined**: the link has no role yet, or has at least one effective
  presence role (Voz, Interlocutor, Aparição), and the centrality hasn't
  been filled in.
- **Not applicable**: the link only has Menção and/or Alusão. Someone who is
  only mentioned or alluded to is neither protagonist nor secondary, and
  the field is always empty. In Statistics this shows as "Só
  Menção/Alusão" (Mention/Allusion only).

Before saying "centrality not filled in", check `papeis`. If it is only
Menção and/or Alusão, there is nothing to fill in.

### Relation tags with the text

`papelNarrativo` (narrative role), `funcaoTematica` (thematic function),
`arco` (arc) and `tropes` are tag lists about **the Character's relation to
this text**: antagonist, mentor, confidant, the arc they follow, the trope
they embody, the function they serve in the theme. Centrality is only a
simple scale (protagonist or secondary); `papelNarrativo` covers the rest.
An empty list means "not filled in".

### A characteristic belongs to the Character, a relation to the text or the book

This is the easiest distinction to get wrong:

| What it describes                          | Where it lives                                            |
| ------------------------------------------ | --------------------------------------------------------- |
| What the Character is like (fears, traits) | `caracteristicas`, in the registry                        |
| How they act in this text                  | `papeis`, `centralidade` and the 4 tags, on the text link |
| How they act in this book                  | `participacoes`, in the registry                          |

Don't attribute to a Character, as a fixed characteristic, something that
only sits in the relation tags of one text (a Character can be
"antagonist" in one poem and "confidant" in another).

## Participation by book (`participacoes`)

A list, in the Character's registry, of `{ livroId, papelNarrativo,
funcaoTematica, arco, tropes }`, one per Book or Anthology. It is the same
relation sheet as the text one, only at the book level. A participation
with all four lists empty means "takes part in this book, no analysis
yet".

Because a book id doesn't hold in another archive, in the export each
participation carries `livroTitulo` (book title) in place of `livroId`.
And because the participation belongs to the Character, **it repeats on
every text that cites that Character**: the same list shows up identical on
each link. When aggregating, deduplicate by Character instead of counting
the same participation several times.

## What travels in the export

- Each link carries `nome` and `origem` next to `personagemId`, because the
  id doesn't hold in another archive. **Identify the Character by `nome`,
  not by `personagemId`.** In the Additive Import the Character is matched
  by name (ignoring case and accents) and created if missing.
- The link also carries `genero`, `orientacao`, `corRaca`, `nascimento`,
  `obito`, `caracteristicas` and `participacoes`.
- For a Character that already existed in the destination archive, the
  import **only fills in what was empty**. What was already defined is
  never replaced.
- A Character only travels together with a text that cites it. A Character
  with no text doesn't appear in an export of texts.
- Old JSON, without the `personagens` key, is the same as an empty list.

In the `.md` and in the Visualization, the group appears on a single line,
for example: `Capitu (Voz, Aparição; protagonista; papel narrativo:
narradora), Bento (Interlocutor), Escobar`. Inside the parentheses come, in
this order, the roles, the centrality and the relation tags. A bare name,
with no parentheses, means a link with nothing filled in.

In the `.csv` there is a `personagens` column (all names) and eight derived
columns: `personagem_voz`, `personagem_interlocutor`, `personagem_aparicao`,
`personagem_mencao`, `personagem_alusao` (who holds that role),
`personagem_protagonista`, `personagem_secundario` and
`personagem_sem_centralidade` (who falls in that centrality band).
`personagem_sem_centralidade` is only the **undefined** case: someone with
only Menção/Alusão is not in it.

## Characters and Ecos (Echoes)

**Presence in two texts does not create an Eco.** An Eco is a deliberate
reading by the author, and is never inferred. If two texts share a
Character and have no Eco between them, it means the author hasn't
recorded that link (or hasn't assessed it yet), not that it doesn't exist
and not that you should create it.

A Character can **anchor** an Eco: an Eco of type `Personagem em comum`
(Shared character) can list, in `ancoras`, `{ especie: "personagem", id,
nome }`, who sustains the link. See `campos-poema-prosa-for-ai.md`
(Intratextuality section) for the full format. The app offers, on demand, a
**suggestion** of missing Ecos starting from a Character or Person; it is
only a cataloguing aid, and the Eco exists only after the author creates
it.

## Statistics

The Statistics › Personagens tab starts from the filtered corpus (not the
whole archive), with these counting rules:

- The unit is the **text**. A text counts once in each bar it qualifies
  for, so **the sum of the bars can exceed the total number of texts**.
- The Character is identified by name, as in search. Two registry entries
  with the same name become a single bar.
- For Ecos, an Eco with two anchors counts once for each anchor, so the sum
  by anchor can exceed the total number of Ecos. "Personagem em comum"
  without an anchor is a separate group.
- In Cruzamentos (Cross-tabs), "Temas × personagens" uses the Theme role
  chosen on the tab, and the Character counts in **any** role.

## Quick summary for practical use

When processing or commenting on the `personagens` field of an exported
item:

1. Identify the Character by `nome` (the id only holds in the source
   archive) and read an empty `origem` as "not defined".
2. Treat empty identity, dates and characteristics as "not defined", with
   no filling in by inference.
3. Read `papeis` as a closed list in a fixed order. The order does **not**
   indicate relevance (unlike `pessoas`). `papeis: []` is a link with no
   role defined, not the absence of a link.
4. For an empty `centralidade`, look at `papeis`: only Menção/Alusão is
   "not applicable"; anything else is "undefined".
5. Keep apart characteristic (the Character's), relation to the text (tags
   on the link) and relation to the book (`participacoes`, repeated on each
   link).
6. Never create an Eco from a shared Character, and don't confuse
   Character with Person or with Reference.
