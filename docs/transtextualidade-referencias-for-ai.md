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
and are not the subject of this document.

---

## Intertextualidade (Intertextuality)

Structure of each entry:

```json
{ "tipo": "Música", "texto": "\"Águas de Março\", Tom Jobim", "link": "", "linkTexto": "", "nota": "" }
```

- **`tipo`** (type): free text with suggestions (Book, Text, Song, Film,
  TV Series, Video, Photograph, Painting, Play, Quote, Conversation,
  Lecture, Mythology, Fairy Tale, Other) — it's the type of medium/artifact
  referenced, not a closed list.
- **`texto`** (text): the reference itself (the work's name, the quoted
  passage, etc.).
- **`link`/`linkTexto`/`nota`**: optional, supplementary.

**What defines Intertextuality**: the text's dialogue with something
external to the archive, pointing to an **identifiable, nameable** work
or authorship. A single text can have several entries, of different
types, at once — it's not a single link. The reference can be light (a
quote, a passing allusion) — it doesn't require the text to structurally
transform the source.

## Hipertextualidade (Hypertextuality)

Structure of each entry:

```json
{ "tipo": "Livro", "relacao": "Paródia", "hipotexto": "Dom Casmurro", "link": "", "linkTexto": "", "nota": "" }
```

- **`tipo`** (type): the same medium-type suggestion list as
  Intertextuality (reused on purpose — it's the same kind of artifact,
  book, song, etc., just now pointing to a specific source).
- **`relacao`** (relation): the nature of the dialogue itself, with its
  own suggestions — Rereading, Adapted Translation, Parody, Pastiche,
  Expansion, Rescaling, Homage, Transposition.
- **`hipotexto`** (hypotext): the name of the specific source work being
  transformed.

**What defines Hypertextuality, and how it differs from
Intertextuality**: here the archive's text is the "hypertext" — a direct
transformation or derivation of a specific source "hypotext." It's a
stronger, more structural relationship than Intertextuality: it isn't just
"dialogues with" or "quotes," it's "derives from"/"transforms." Practical
rule: if the text **reworks, rewrites, or structurally leans on** a
specific source work (a parody, a rereading, an adapted translation), that
is Hypertextuality; if it's a quote, mention, or looser dialogue with a
work (without the text itself *being* a transformation of it), that is
Intertextuality.

## Referências (Externas) (External References)

Structure of each entry:

```json
{ "tipo": "Marco histórico", "texto": "Enchente de 2011", "link": "", "linkTexto": "", "nota": "" }
```

- **`tipo`** (type): free text with suggestions (Historical landmark,
  News, Public figure, Other).
- **`texto`** (text): the reference itself.

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

## Comparison summary

| Field                  | Points to                              | Nature of the link                        |
| ------------------------ | ---------------------------------------- | -------------------------------------------- |
| Intertextuality           | A specific, nameable work/artifact       | Dialogue, quote, allusion — can be light   |
| Hypertextuality            | A specific source hypotext                | Direct structural derivation/transformation |
| External References       | A real-world fact, event, or public figure | Factual anchor, no work/authorship involved |

And, outside this group but often confused with it:

| Field                                        | Points to                             |
| ---------------------------------------------- | ---------------------------------------- |
| Links / Echoes (Intratextuality)                | Another poem/prose piece in the archive itself |
| Imagery Domain (Tags/Sinalizações)              | Vocabulary/repertoire from a field of knowledge, with no specific work cited |

## What this means in practice for an AI reading the data

1. Before classifying an external mention found in the text, ask: is it a
   nameable work/authorship (Intertextuality or Hypertextuality), or a
   fact/public figure from the real world with no authored work involved
   (External References)?
2. If it's a nameable work, ask whether the text structurally
   **derives from/transforms** that work (Hypertextuality) or merely
   **dialogues with/quotes** it without being a transformation of it
   (Intertextuality).
3. Don't suggest moving a "Public figure" entry from External References
   into the People field — they are deliberately distinct (one is a
   free-text world anchor; the other is a structured link into the
   central registry) — unless the task explicitly asks to formally
   register that person.
4. Don't confuse this group with Links/Echoes (which are about other
   texts within the archive itself) or with Imagery Domain (which is
   repertoire from a field of knowledge, not a specific work).
