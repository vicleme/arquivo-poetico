# Themes and Subjects: how to read them and how to choose them

This document doesn't ask for any task. It explains the logic of Themes (Temas) and Subjects (Assuntos) in the archive, so that an AI that receives the texts (or the registry) chooses and writes these fields the way the app expects. The format of the file that imports all of this is in `importar-campos-for-ai.md`; this document covers the criteria, not the format.

---

## The three pieces

Before any rule, what each word means in this app:

- **Theme (Tema)**: what the text is about, at a broad and reusable level ("Saudade", "Luto/Finitude", "Pressão estética"). It lives in the Themes registry and is what the text actually stores.
- **Subject (Assunto)**: a grouping of Themes ("Tempo, memória e perda" gathers Saudade, Despedida, Memória and others). The text does **not store** a Subject: it is **derived** from the text's Themes. If a text has the Theme "Saudade" and "Saudade" belongs to the Subject "Tempo, memória e perda", the text gets that Subject without anyone saving anything.
- **Role (papel)**: the weight a Theme (or a Subject) has in that text. The values are `principal`, `secundario` and undefined (empty).

## How the pieces connect

- A Theme can be in **several Subjects** (N:N). In the factory registry, "Machismo" is in "Corpo, gênero e sexualidade" and in "Discriminação" on purpose.
- The Subject lists its Themes; the Theme doesn't need to know which Subjects it is in.
- **A Subject is never created by an import.** Only what is already in the registry exists.
- **A new Theme is created** when the name doesn't exist, but it is born **without a Subject**. Until someone links that Theme to a Subject, it produces no Subject anywhere. The link is made in the Themes tab, in the text's modal, or through the `ligacoes` list of the import file (which applies to every text with the Theme).

## Roles

**Theme role** (`principal`, `secundario`, undefined):

- `principal`: what the text is, at its core. `secundario`: it appears and matters, but it isn't the axis. Undefined: the Theme is present and nobody has decided its weight.
- With no `papel` in the file, a new Theme enters as undefined and a Theme the text already has **keeps** the role it had.

**Subject role** is inherited from the Theme, with the person in control:

- By default the Subject follows the role of the text's Themes that belong to it. With several Themes in the same Subject, the **strongest** role wins (principal, then secondary, then undefined).
- The person can fix a different role for a Subject in that text (for example, a principal Theme with a secondary Subject). In the import file this is the `papel` of the `assuntos` item.
- `automatico` returns the Subject to following the Theme. `indefinido` fixes the Subject with no role, on purpose. `nao-se-aplica` removes the Subject **from that text**, even if one of its Themes belongs to the Subject: use it when a Theme is in two Subjects but the text fits only one.
- When in doubt, **don't fix a Subject role**: leave `automatico` (or omit the `assuntos` field) and the Subject follows the Themes.

## What a Theme is and what it isn't

- **It isn't a place.** A place the text cites is Territoriality ("Brasil", "Santos"). "Brasil" as a nation or identity, treated as an idea, can be a Theme; the river, city or neighbourhood that appears in the text can't.
- **It isn't a person or a character.** Whoever appears in the text goes under People or Characters.
- **It isn't a tag (etiqueta).** Tags describe **how** the text is made or where it comes from (Tradition, Style, Tone, Imagery Domain and others). A Theme is what the text is **about**. "Astrologia" as vocabulary used is an Imagery Domain; "destino" or "determinismo", if the text discusses it, is a Theme. "Irônico" is a Tone, never a Theme.
- **It isn't a summary.** A Theme isn't a sentence about the text. It's a short label that other texts could also have, because the field's value lies in grouping, counting and comparing.

## How to name

- Write the name the way the registry already does: first letter capitalised, the rest lowercase ("Resiliência emocional", "Pressão estética"). For two concepts that go together, a slash with no spaces ("Luto/Finitude", "Desigualdade social/Pobreza").
- **A comma can't exist in a Theme name** (it is the internal separator). Use a slash or rephrase.
- Comparison ignores case and accents: "saudade" and "Saudade" are the same Theme.
- **Reuse what exists.** The app only recognises equality by case and accent. A plural ("Memória" and "Memórias"), a hyphen, a synonym ("Efemeridade" and "Transitoriedade") and spelling variants become **duplicate Themes**, which later have to be merged by hand.
- "Luto" and "Luto/Finitude" are not duplicates: one is the general, the other the specific. Even so, don't create the specific one if the registry already has one that works.

## How to choose a text's Themes

Default guidance. The person can calibrate it, usually with a sample of texts analysed together, and whatever they decide there outranks this.

1. Read the whole text before choosing. A Theme comes from what the text does, not from a word that appears in it.
2. Look first in the vocabulary that came with the file (or in the Subjects export). Only propose a new Theme if **none** of the existing ones works, and say why.
3. Few Themes per text. A text with ten Themes has no Theme. Mark `principal` only on what holds the text up and `secundario` on what is important but lateral; the rest, undefined or left out.
4. For an ambiguous text, choose fewer. An empty field is a valid state, and a guessed Theme contaminates counts and Statistics.
5. Don't use the author's context to invent a Theme the text doesn't have. Biography helps to understand, not to fill in.
6. Poems and prose follow the same criteria. A long prose piece may have more than one axis, and the rule of few Themes still applies.

## How to choose Subjects

- Only Subjects that **already exist** and that have **some Theme of the text** among theirs. Usually it is enough to choose the right Themes: the Subjects appear on their own.
- Use the file's `assuntos` field only for what changes the default: fixing a role different from the inherited one, or `nao-se-aplica` in a text where a shared Theme doesn't fit that Subject.
- A new Theme you propose **has no Subject yet**. Link it to an existing Subject through the `ligacoes` list of the same file (`{ "tema": "Name", "assunto": "Name" }`). Then it already counts in the `assuntos` field of the file's texts and in any other text that has the Theme. If no existing Subject fits, say so separately instead of inventing one: the import doesn't create Subjects.

## Two different tasks

1. **Classify texts** (fill in Themes and Subjects of texts that already exist): deliver the "Importar campos" `.json`, using the names from the vocabulary.
2. **Organise loose Themes** (group into Subjects the Themes that don't belong to any yet): the Subjects tab has the **Baixar .md** button, which exports each Subject with its Themes (and the count of texts for each) and the "Temas sem assunto" section. The Themes tab has its own **Baixar .md**, with each Theme, its text count, the Subjects it belongs to and its note, split into "Temas com assunto" and "Temas sem assunto". With that file, the useful answer is a `.json` with only `ligacoes` (and `textos` empty), which the import reads and shows in the preview. A Theme that fits no existing Subject stays out, listed separately.

In either task, nothing is saved before the person sees the preview, and the import takes a safety snapshot and can be undone.

## Frequent pitfalls

- Mixing Territoriality with Theme (a cited place turned into a Theme).
- Mixing a tag with a Theme (Tone, Style or Imagery Domain turned into a Theme).
- Duplicating through spelling variants, plurals or synonyms.
- Marking `principal` on everything. Without contrast the role loses its meaning.
- Putting in `assuntos` a Subject that doesn't exist, or that none of the text's Themes reaches: it goes to the report and stays out.
- Creating a new Theme and using it in `assuntos` without linking it in `ligacoes`: the Theme doesn't belong to any Subject yet, and the Subject goes to the report.
- Putting in `ligacoes` a Subject that doesn't exist: the import doesn't create Subjects, and the link stays out.
- A comma inside a Theme name.
