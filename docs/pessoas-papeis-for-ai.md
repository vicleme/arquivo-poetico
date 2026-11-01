# People and Roles: how to interpret this field

This document doesn't ask for any task — it explains the logic behind one
field in the archive, so that an AI receiving exported data (or reading
the code itself) can correctly interpret the `pessoas` (People) field on
Poems and Prose pieces, without inferring things the schema deliberately
leaves unstated.

---

## What the field is

`pessoas` is a list of **links** between the text and people registered in
the archive's central registry (`db.pessoas`, each `{ id, nome,
grupoIds }`). It's not a loose string of names — each entry points to a
person registered exactly once, whose name and groups live only in the
registry, not repeated on every poem.

Structure of each entry:

```json
{ "pessoaId": 7, "papeis": ["Retratado(a)", "Dedicatário(a)"], "nota": "Optional." }
```

- **`pessoaId`**: reference into the central registry. It's "who" the
  person is.
- **`papeis`** ("roles"): an array, with zero, one, or several values, taken
  from the archive's list of roles (the 9 factory roles are right below). It's
  "how" that person relates to **this** specific text.
- **`nota`** ("note", optional): free text where the cataloger explains the
  chosen roles, for example why no role fit. It is a human explanation, not a
  role: it plays no part in the relevance reading, and the key is absent when
  there is no note. When present, read it together with the roles, since it may
  qualify or justify the choice.

## The 9 factory roles

- Retratado(a) - Portrayed
- Inspiração para - Inspiration for
- Dedicatário(a) - Dedicatee
- Mencionado(a) - Mentioned
- Aludido(a) - Alluded to
- Associado(a) retroativamente - Retroactively associated
- Voz - Voice
- Alocutário(a) - Addressee (the "you" the text speaks to)
- Relacionado(a) - Related (nothing else fit)

The Portuguese spelling shown in exported data is exact: there are no
accepted synonyms or variants. Whoever catalogs may add roles of their own to
the archive. If a value outside this list appears, treat it as an archive
role, read it by its name and do not reclassify it into one of the nine.

**Voz** answers "who speaks in this text?". It is the real person who
enunciates in the scene of the text: the author, or someone whose speech the
text stages and who is heard there as a speaker (a lived dialogue, a reply, a
message treated as a speaking turn, that is, each one's turn to speak). It
may or may not be the author. A passage from a work or from someone else's
speech brought in from outside, as support, comment or echo (epigraph, song
lyric, line from a book), is not Voz: it is a **Citação** (quotation), and
lives in Intertextualidade (see `transtextualidade-referencias-for-ai.md`).
Quotation marks and italics do not decide on their own, function does. Test:
if the passage were removed, would the text lose a speaker (Voz) or only a
support (Citação)? Rule of thumb: Voz is who speaks in the text; Citação is
what the text brings in from outside. In Alocutário(a) the person is heard
without answering; in Voz they speak. Do not confuse it with the Character
role Voz (`personagens`), which is the speech of someone invented, in a
separate registry and list. Three questions decide each text:

- **Is the speaker the real person themselves?** Then it is Voz in `pessoas`.
  This covers first person, impersonal poems and fables narrated by the
  author, who is the author narrating, with no invented figure. Irony does
  not change the role: the author imitating someone else's discourse is still
  the author speaking.
- **Is the speaker an invented figure?** Then the place is `personagens`, and
  the author does not get Voz.
- **Does the speech belong to the scene or is it brought in from outside?**
  If it is a turn (a speaking turn) of the scene, Voz belongs to whoever
  speaks, and the author does not get it for that. If it is brought in from
  outside as support, comment or echo, it is not Voz: it is Citação, in
  Intertextualidade. Faithful translation of someone else's text: Voz
  belongs to the other person (the whole text is their speech), and the
  author does not get it. An adaptation that truly rewrites is up to whoever
  catalogs.

Gray area: someone's message reproduced in the text. If it enters as a speaking
turn of the scene, it is that person's Voz. If it is treated as a document (a
screenshot, a dated conversation), it is a Citação of type Conversa in
Intertextualidade. Both can coexist if the text does both.

The first person alone does not decide, and the author only gets Voz when
registered as a Person. Voz only makes the person selectable for linking
themes to whoever appears in the text; it links nothing by itself.

## What each role means

The roles describe the link between the person and the text, not a judgment
about the person: a hostile or ironic portrait is still Retratado(a)
(Portrayed). These definitions exist to read precisely what whoever catalogs
has checked. They do not authorize an AI to add roles that are not in the
array. The roles answer three questions: is the person in the text
(Retratado(a), Mencionado(a), Aludido(a))? Did the text originate tied to them
(Inspiração para, Associado(a) retroativamente)? Does the text speak to them,
or do they speak in it (Dedicatário(a), Alocutário(a), Voz)?

- **Retratado(a) (Portrayed):** the person is a figure in the text: they
  appear in a scene, with actions, traits or a described relationship, without
  the poem speaking directly to them. It is the baseline for anyone who is in
  the poem, whatever the form. Two tests help. The characterization test: does
  the text say something about the person beyond naming them? The removal
  test: if the person were taken out, would the text lose a referent it
  develops (a stanza, an image, a movement) and not just a word? Having the
  name written is irrelevant to being Retratado(a).
- **Inspiração para (Inspiration for):** the person, the relationship with
  them, or something lived with them gave rise to the text, without the text
  having to portray them. It covers both the muse and the occasion (the poem
  was born of what happened with them). It does not imply presence in the text
  and can come alone. It does not coexist with Associado(a) retroativamente:
  the text was born tied to the person or was tied to them later.
- **Dedicatário(a) (Dedicatee):** the text has the form of a dedication to this
  person: the title, the text or the structure offer it to them, or address
  them explicitly (apostrophe, request, reply, accusation, forgiveness). It
  holds by intent and is independent of whether the text was sent or shown
  (that is recorded in Envios e Reações). It is independent of being portrayed.
- **Mencionado(a) (Mentioned):** the person is designated in the text, in
  passing, without being its object: by name, nickname or a kinship or
  relationship term ("my father," "my mother," "my ex"). The criterion is that
  the text designates them, not that they have a proper name. It does not
  coexist with Aludido(a): if the text designates them, alluding adds nothing.
- **Aludido(a) (Alluded to):** the text points to the person without
  designating them (by a pronoun with no antecedent, a metaphorical epithet,
  an image or a circumstance), so that someone who knows them recognizes them.
  It is the equivalent of Mencionado(a) when no designation appears, or it was
  hidden. If the trait becomes sustained characterization, the role becomes
  Retratado(a). It does not coexist with Mencionado(a).
- **Associado(a) retroativamente (Retroactively associated):** the text was
  not born tied to the person: the link was made later, by affinity, rereading
  or curation. It only holds if there is evidence that the association came
  after the writing. If the text today "seems to portray" someone but was not
  written that way, this is the role, not Retratado(a). It does not coexist
  with Inspiração para.
- **Voz (Voice):** who speaks in the text: the real person who enunciates in the scene, not what is brought in from outside as a Citação (full definition
  above).
- **Alocutário(a) (Addressee):** the text speaks to this person in the second
  person, even if it is not a dedication and even if they do not answer: they
  are the poem's "you". Using "you" only to name the figure is not enough; the
  text has to address them. Almost every Dedicatário(a) is also
  Alocutário(a), but not the reverse.
- **Relacionado(a) (Related):** the person is tied to the text, but whoever
  catalogs looked at the other roles and none fit without forcing it. It is
  exclusive: it does not coexist with any other role. It is a cataloging
  declaration, not a weak role, and it does not enter the reading by order of
  relevance. The reason, when informative, goes in Notes.

### Edge cases

- **Mention with a passing adjective** ("my mother, always tired"): an
  isolated characterization stays in Mencionado(a) or Aludido(a). If it
  repeats or organizes an image or stanza, it is Retratado(a).
- **Kinship or relationship term** ("my father," "my mother," "my husband"):
  it designates the person, so it is Mencionado(a), even without a proper name.
  It only counts when the term points to a specific person: "every man has a
  mother" is generic and is not a link. A loose pronoun ("they") or an image
  with no designation is Aludido(a).
- **An unnamed "you," with the whole poem turned toward the person:**
  Alocutário(a), and also Dedicatário(a) if the text has the form of a
  dedication or a reply. Retratado(a) only if they are also a figure in a
  scene. The identification comes from the registry, not from the text.
- **Person as metaphor** (she is "the sea"): Retratado(a) if the figure is
  developed and the identification is secure. If it is only a nod,
  Aludido(a).
- **Person who only inspired the text:** just Inspiração para.
- **Person whose speech appears in italics or quotation marks:** function
  decides, not the mark. If it is a turn (a speaking turn) of the scene, Voz.
  If it is brought in from outside as support or echo (lyric, epigraph, line
  from a book), it is a Citação in Intertextualidade, and the person only
  enters `pessoas` through another role they really have. It adds
  Retratado(a) only if they are also characterized.
- **Impersonal, third-person or allegorical poem written by the author:**
  the author's Voz, because the words are theirs. First person is not required.
- **Translation or adaptation of someone else's lyrics:** Voz belongs to whoever
  is the "I" of the original; the author only gets it if they truly rewrote.
- **Self-portrait:** Retratado(a) if the author is registered as a Person and
  the text characterizes them. Being in the first person is not enough.
- **Poem addressed to a "you," with the "I" on stage:** if the "I" acts,
  feels or relates to the "you" in a described way (welcomes, thanks,
  promises, distrusts), the author is Retratado(a), in addition to Voz. An
  "I" that only enunciates or gives an opinion stays only Voz.
- **Created or reinterpreted figure:** not a Person, goes to `personagens`.
- **Genuine doubt about which role fits:** Relacionado(a) is the declared way
  out (whoever catalogs looked and none fit). That is better than forcing a
  role.

## Roles that do not coexist

Some combinations are contradictory and the system does not accept them in the
same link. When a role is checked, the conflicting one drops out.

- **Mencionado(a) and Aludido(a):** they answer the same question, whether the
  text designates the person (by name, nickname or a kinship or relationship
  term). If it does, Mencionado(a) holds.
- **Inspiração para and Associado(a) retroativamente:** the text was born tied
  to the person or was tied to them later.
- **Relacionado(a)** does not coexist with any other role.

Retratado(a) coexists with Mencionado(a) and with Aludido(a). Dedicatário(a),
Alocutário(a) and Voz coexist with the others. Older data may hold a
conflicting pair; read it as it is, without correcting it.

## Multiple roles, and order as relevance

The same person can accumulate several roles on the same text at once, and
this is common, not an exception. A poem of direct address often has the
same person marked as Portrayed, Inspiration for, and Dedicatee all at the
same time.

**The order of values in the array indicates relevance: the first role is
the most relevant for that link, in that text, and the last is the least.**
The order is the sequence in which the roles were checked in the editor, and
the system preserves it instead of auto-sorting (for example, alphabetically)
precisely so that it carries this information. It is real data, not noise.

Relevance holds per text and per person. It is not a fixed hierarchy across
categories (the same role can come first on one poem and later on another),
and the order only compares roles of the same person on the same text,
never people against each other. With a single role, there is nothing to
compare.

Because of this, when **commenting on, summarizing, or evaluating**
someone's roles, the expected behavior is to treat the first role listed as
the strongest for that link and, when a task calls for that kind of
evaluation, to actively suggest an ordering by relevance. The suggestion
stays in the answer: the AI does not reorder or change the array on its own.
Whoever catalogs should check the roles already in order of relevance.

## `papeis: []` is a valid value, and Relacionado(a) is something else

This is the easiest point to get wrong. There are two different states:

- **`papeis: []`:** the person is tied to the text and the role has not been
  categorized yet. It is not a forgotten field or an absence of information to
  ignore. The interface shows it as an italic "sem papel" (no role) label next
  to the name, never hiding the person.
- **`papeis: ["Relacionado(a)"]`:** whoever catalogs looked at the other roles
  and none fit. It is a decision, not a pending item. It always comes alone.

Practical rules for an AI reading this field:

- **Never invent a role** that isn't in the array, even if the text's
  content seems to suggest an obvious one (e.g., a poem clearly dedicated
  to someone, but without "Dedicatário(a)" checked: this means that
  categorization simply wasn't made, not that the AI should fill it in on
  its own).
- **Never treat `papeis: []` as equivalent to "person not linked":** the
  person is linked; only the role is left open. Dropping the person from
  an analysis because the array is empty discards real information.
- **Do not swap one state for the other.** Empty is pending; Relacionado(a)
  is "none fit". Do not fill an empty array with Relacionado(a).
- If a task asks to comment on someone's roles and the array is empty, it
  is valid (and more honest) to say explicitly that the link exists
  without a categorized role, rather than simply skipping the person.

## The role legend in exported files

When the exported texts carry Person roles, the file includes a **legend** of the roles that appear in them: name, nickname (the abbreviation the archive shows in the chip and column), description and coexistence rules. Use it to read a role name as the archive means it, not as the word is usually understood.

- In `.json` (selection, selective export, flat all and templates) the legend is the `legenda_papeis_pessoa` key, right after `export_format`. Each entry is `{ nome, apelido, descricao }`, plus `exclusivo: true` (does not coexist with any other role) or `nao_convive_com: [names]`.
- In `.md` it is the "Legenda dos papéis de Pessoa" section near the top, one line per role.
- Only roles used by the texts in the file are listed. With no roles there is no legend. The "🏷️ Infos de papel" box (on by default; one for downloading several texts and one for downloading a single text) turns the legend off; each person's roles stay in the texts, just without the explanation.
- The legend describes the source archive. If a legend description differs from what this document says about a factory role, the legend wins for that file.

In the Additive Import, a role that the new texts use and the destination archive lacks is registered with the nickname and description from the legend (with no coexistence rule, like roles added by hand). A role the destination already has is left unchanged.

## How this differs from similar-looking fields

- **Authorship** (`autoria`, a separate field): the link for who wrote the
  text, `{ autorId, papel }` — here `papel` is a **single value** (not an
  array) from its own, smaller closed list: `Autor` (Author) or `Coautor`
  (Co-author). It resolves against `db.autores`, a different central
  registry from `db.pessoas` — even when the same real-life person appears
  in both registries, they are distinct records. Authorship does not
  accumulate roles; a person registered as Author cannot also be marked
  Co-author on the same text.
- **Groups** (`grupoIds`, on the Person's registry entry, not on the poem):
  a fixed characteristic of the person — which groups they belong to —
  independent of the text. It doesn't vary poem to poem, unlike `papeis`,
  which is this specific text's link to that person.
- **Characters** (`personagens`, a separate field): who the author
  **created or reinterpreted**, in a separate registry (`db.personagens`),
  with roles from their own registry (factory: Voz, Interlocutor, Aparição,
  Menção, Alusão). Mind the difference in ordering: in `pessoas` the order
  of the roles indicates relevance; in `personagens` the system always
  reorders the roles into the registry order, so it indicates **nothing**. See
  `personagens-for-ai.md`.
- **"Public figure" under External References**: one of the suggested
  types in the `referenciasExternas` field (see the document on the
  Transtextuality and External References group) is free text, with no
  `pessoaId` — used when someone is cited as a real-world reference point
  (e.g., a public figure mentioned in passing), not as a formally
  registered person with a role-link to the text. If the person is in the
  central registry and has a recognizable role, the right place is
  `pessoas`, not `referenciasExternas`.

## Practical summary

When processing or commenting on the `pessoas` field of an exported item:

1. Resolve `pessoaId` against the central registry to get the name (and,
   if relevant, the person's groups).
2. Read `papeis` as a set of cumulative descriptions of the link, in the
   order they appear: the order indicates relevance, and the first role is
   the most relevant for that person, in that text. If a task asks for an
   importance assessment, start from that order and, where appropriate,
   suggest a better ordering. The criterion for each role is in "What each
   role means", and the pairs that do not coexist are in "Roles that do not
   coexist".
3. If `papeis` is empty, don't skip the person or assume a role: report
   the link as it is, present and with no categorized role. If it is
   Relacionado(a), report that whoever catalogs looked and no role fit, and
   leave it out of the reading by relevance.
4. Don't confuse this with Authorship (single role, different registry)
   or with Groups (a fixed property of the person, not of the text).

5. Each `pessoas` entry in an exported JSON may also carry the registry
   profile: `genero` (free text), `identidadeCisTrans` (`Cisgênero`,
   `Transgênero` or `Não se aplica`) and `corRaca` (the Author's closed
   list). **Empty means "not documented"**, never "cisgender" or "white":
   do not infer these from the name, the role or the poem's context, and do
   not use them to characterize the text unless the task asks. These fields
   do not appear in the `.md`, the `.csv` or the Visualização.
