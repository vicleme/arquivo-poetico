# Intratextuality (Elos and Ecos): how to interpret and fill in this group

This document doesn't ask for any task. It explains the logic behind the
two fields of the "Intratextualidade (elos e ecos)" ("Intratextuality:
links and echoes") group in the Poem/Prose modal, so that an AI receiving
exported data (or helping to fill in the group) tells **Elos** (Links)
apart from **Ecos** (Echoes), picks the right **Relação** (Relation) and
**Direção** (Direction), and doesn't confuse this group with its
neighbors.

Intratextuality is always about the text and **other texts in the
archive itself**, linked by id. What happens with the **world outside the
archive** (works, public figures, facts) lives in the
"Transtextualidade e Referências (Externas)" group, described in
`transtextualidade-referencias-for-ai.md`.

Both fields are used the same way (pick the target text, pick a type,
optional note), but they measure different things:

- **Elo**: a **structural, bilateral** relation. One text derives from the
  other, answers it, replaces it, or continues it. The pair exists as a
  pair.
- **Eco**: a **looser, unidirectional** link. One text reverberates
  another (a figure, an image, a nod), without either being a derivation
  of the other.

---

## Elos (Links)

Structure of each entry:

```json
{ "id": 456, "relacao": "Reescrita", "direcao": "destino", "texto": "" }
```

- **`id`**: the id of the **target text** (the other side of the pair).
  There is no `poemaId`. For a Poem, the target is always a Poem; for a
  Prose, the target can be a Poem or a Prose.
- **`relacao`** (relation): closed list. Reescrita (Rewrite),
  Continuidade (Continuation), Tradução (Translation), Variação
  (Variation), Versão (Version), Resposta (Reply), Díptico (Diptych),
  Outro (Other).
- **`direcao`** (direction): the role of **this text** (the one whose
  record holds the Elo) in the pair.
    - `"origem"` (origin): this text is the older one, the base.
    - `"destino"` (destination): this text is the derived, newer one.
- **`texto`** (text): optional note about the Elo.

The direction never describes the target, it describes the text storing
the Elo. The human-readable label is derived from the combination, not
stored:

| Relation (`relacao`) | This text is `origem` | This text is `destino` |
| -------------------- | --------------------- | ---------------------- |
| Reescrita            | Reescrito em          | Reescrita de           |
| Continuidade         | Continuado em         | Continuação de         |
| Tradução             | Traduzido para        | Tradução de            |
| Variação             | Variado em            | Variação de            |
| Versão               | Versão anterior de    | Versão oficial de      |
| Resposta             | Respondido em         | Resposta a             |
| Díptico              | Díptico com           | Díptico com            |
| Outro                | Outro                 | Outro                  |

(Labels in Portuguese, as the app shows them: "Rewritten in" / "Rewrite
of", "Continued in" / "Continuation of", "Translated into" /
"Translation of", "Varied in" / "Variation of", "Earlier version of" /
"Official version of", "Answered in" / "Reply to", "Diptych with".)

Díptico and Outro have no real direction (the pair is symmetric or
undefined), so the label is the same on both sides.

### How to choose the Relation

| Situation                                                                             | Relation     | Direction of the text you are filling in                               |
| ------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| I redid the poem from scratch or nearly so, and the new one takes the old one's place | Reescrita    | `origem` on the old one, `destino` on the new one                      |
| The second text follows the story or gesture of the first                             | Continuidade | `origem` on the first, `destino` on the second                         |
| One text is the other carried into another language (both in the archive)             | Tradução     | `origem` on the original, `destino` on the translation                 |
| Same matrix, deliberate changes, neither replaces the other                           | Variação     | `origem` on the base, `destino` on the variant                         |
| Two states of the same text, one discarded or superseded and one adopted              | Versão       | `origem` on the earlier, `destino` on the official                     |
| One text answers, rebuts, or directly converses with the other                        | Resposta     | `origem` on the one answered, `destino` on the one that answers        |
| Two texts conceived as a pair, read together, neither clearly coming first            | Díptico      | no real direction                                                      |
| There is a structural link, but none of the above describes it                        | Outro        | `origem`/`destino` if there is an order; explain in the note (`texto`) |

Criterion for choosing between Reescrita, Variação and Versão: in a
**Reescrita**, the new text is the one that counts from now on and the
old one is the starting point; in a **Variação**, both keep existing side
by side as alternatives; in a **Versão**, both are states of the same
text (one superseded, one official), and what matters is which one was
adopted.

### Elo vs. Hipertextualidade

The question is where the source lives. If the source text **is in the
archive**, the relation is an Elo (Reescrita, Tradução...). If the source
is a work **outside the archive** (a book, a song, someone else's poem),
the relation is Hipertextualidade (Releitura, Tradução Adaptada,
Paródia...), in the neighboring group. The names look alike on purpose,
but the fields don't substitute for each other: my translation of
someone else's poem that is **not** in the archive goes in
Hipertextualidade; the translation of a poem of mine that is in the
archive goes in an Elo.

### Recording the Elo on one side only

The Elo is bilateral when read, but it is stored **on one side at a
time**. If text A has an Elo to B and B has none to A, the app
**computes** the missing side and shows it in B's modal ("Referenciado
por (calculado, sem elo cadastrado de volta)", "Referenced by (computed,
no link registered back)"), with the label inverted (`direcaoInversa`).
Nothing is stored in B because of that. The Conexões tab lists an Elo
that has only one side as a "buraco" (gap). It is a cataloging to-do, not
a data error.

---

## Ecos (Echoes)

Structure of each entry:

```json
{
    "id": 111,
    "tipo": "Personagem em comum",
    "texto": "",
    "ancoras": [{ "especie": "personagem", "id": 10 }]
}
```

- **`id`**: the id of the **target text**, as in the Elo.
- **`tipo`** (type): closed list. Personagem em comum (Shared character),
  Pessoa em comum (Shared person), Imagem central compartilhada (Shared
  central image), Aceno a (Nod to), Outro (Other).
- **`texto`** (text): optional note.
- **`ancoras`** (anchors, optional): who sustains the link. Only exists in
  the two types that accept it. See below.
- **No `direcao`.** The Eco is always unidirectional, and the archive's
  convention is **newer to older**: the Eco is stored on the newer text
  and the `id` points to the older one. There is no "reverse" Eco.

### How to choose the Type

| Situation                                                                                    | Type                         |
| -------------------------------------------------------------------------------------------- | ---------------------------- |
| The same Character sustains the link between the two texts                                   | Personagem em comum          |
| The same Person (portrayed, dedicatee...) sustains the link                                  | Pessoa em comum              |
| A central image or motif recurs in both, with no pair relation between the texts             | Imagem central compartilhada |
| The newer text makes a brief gesture toward the older one, with no reciprocity or derivation | Aceno a                      |
| There is reverberation, but none of the types above describes it                             | Outro (explain in the note)  |

### Anchors

- They exist only in two types, and the type decides the kind:
  **Personagem em comum** accepts `"personagem"` anchors, **Pessoa em
  comum** accepts `"pessoa"` anchors. The other types have no anchor.
- When the anchor is chosen in the modal, the figure must be linked to
  **both** texts. If the link is removed from one of the texts later, the
  anchor stays in the Eco with a warning, so check both texts before
  asserting that the figure is still in both.
- An Eco without `ancoras` is valid: the link exists, the author just
  didn't record who sustains it.
- On export, each anchor also carries `nome` (name), because the id only
  holds in the source archive.

### Shared presence doesn't create an Eco

Two texts that cite the same Character or the same Person do **not**
therefore have an Eco between them. The Eco is a deliberate reading by
the author. The anchor only documents the reason for an Eco the author already
decided to create. The app offers, on demand, a suggestion of missing
Ecos, but it is only a cataloging aid: the Eco exists only after the
author creates it.

---

## Elo or Eco?

Ask, in this order:

1. Does one text **derive from the other, answer it, replace it, or
   continue it**, or do the two form a pair? Then it's an **Elo**.
2. Is what exists a **motif, a figure, or a gesture** that reverberates
   from one text into the other, without either being a derivation of
   the other? Then it's an **Eco**.
3. Is the source text **outside the archive**? Then it isn't
   Intratextuality: it's Intertextualidade, Hipertextualidade, or
   Referências.

The same pair of texts can, in principle, have an Elo and an Eco at the
same time (a rewrite that also retakes an image, say), but each field
answers a different question. Don't duplicate the same information in
both.

## Comparative summary

| Field | Points to                   | Nature of the link                           | Direction                             |
| ----- | --------------------------- | -------------------------------------------- | ------------------------------------- |
| Elo   | Another text in the archive | Structural: derivation, reply, version, pair | `origem`/`destino` (this text's role) |
| Eco   | Another text in the archive | Loose: figure, image, nod                    | Always newer to older, no field       |

And, outside this group but often confused with it:

| Field                                 | Points to                                                             |
| ------------------------------------- | --------------------------------------------------------------------- |
| Hipertextualidade (Transtextuality)   | A source work **outside** the archive that the text transforms        |
| Intertextualidade (Transtextuality)   | A work or authorship **outside** the archive the text converses with  |
| `pessoas` / `personagens`             | Central registries; the Eco only uses them as anchors                 |
| Domínio Imagético and other Etiquetas | Vocabulary or repertoire, without linking two specific texts          |
| `es.ecos` (Sonoridade)                | **Sound** echoes (near-rhymes) inside a poem; unrelated to this field |

## What this means in practice for an AI reading the data

1. Identify the target of an Elo or Eco by `alvoTitulo`, not by `id`. The
   `id` only holds in the source archive. If `alvoTitulo` is missing, the
   target wasn't found or the file is old.
2. Read an Elo's `direcao` as the role of **the text that contains it**.
   To get the target's role, invert it (`origem` becomes `destino` and
   vice versa).
3. Don't infer an Elo or Eco from similarity of theme, vocabulary, or
   Character. The absence of an Elo or Eco means "the author didn't
   record it", not "it doesn't exist", and it is not an invitation to
   create one.
4. An Elo with only one side is normal. Don't treat it as an
   inconsistency or suggest "fixing" it by storing the inverse, unless
   the task asks for that.
5. Don't suggest swapping an Elo for an Eco (or the reverse) just because
   the labels sound alike. Use the criterion in the "Elo or Eco?"
   section.
6. Don't confuse `conceitos.ecos` (this field, a link between texts) with
   `es.ecos` of the Sonoridade record (sound echoes). Same name,
   different fields. If the `ecos` key appears inside `escansoes`, it's
   the sound one; if it appears inside `conceitos`, it's this one.
7. Don't confuse this group with Hipertextualidade. Tradução, Reescrita,
   and Resposta show up on both sides of the vocabulary, but here the
   source text is in the archive and there it is outside it.
8. If a Person or Character appears in `ancoras`, that documents the
   reason for the Eco. It isn't the text's structured link to the figure
   (that lives in `pessoas` and `personagens`).
