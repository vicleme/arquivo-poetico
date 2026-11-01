# Book: how to interpret authorship, credits, AI use and the book export

This document doesn't ask for any task. It explains the logic behind the
fields of a Book (and Anthology: both live in `db.livros`) so that an AI
receiving exported data, or reading the code, can interpret them without
inferring things the schema deliberately leaves unstated. It covers criteria,
not file formats: for the exact shape of each field see `manutencao/schema.md`.

---

## The one rule that separates the fields

Whoever produces the **content** of the work is in **Authorship**
(`autoriaLivro`, exported as `autoria_livro`). Whoever produces the **book as
an object** is in **Team and credits** (`equipeLivro`, exported as
`equipe_livro`). The same person can be in both, each with its own role: for
example, Author and Cover designer of their own book.

- **Authorship** links to the Authors registry (`db.autores`). Each link has one
  or more roles: Author, Co-author, Organizer, Translator, Preface writer,
  Afterword writer, or a free-text "Outro". The order of the roles is
  preserved and may indicate importance.
- **Authorship is not derived from the texts.** A book that only contains
  someone's preface is not "by" that person, and in an anthology the list of
  the texts' authors does not say who organized it. The archive's View shows
  "Authors of this book's texts" separately; it is derived and read-only. Do
  not merge the two lists.
- **Team and credits** links to the Collaborators registry
  (`db.colaboradores`), which is separate from Authors and from People on
  purpose. Roles: Capista (cover designer), Ilustrador (illustrator),
  Diagramador (layout), Revisor (proofreader), Preparador de texto (copy
  editor), Editor, Fotógrafo (photographer), or free text. Each role may carry
  a free-text **scope** (Capa, Miolo, Capa e miolo, Capitulares, Encarte,
  or whatever was typed). There is a single Illustrator role; the scope says
  whether it was the cover or the inside.
- If the cataloger makes text and illustration as one work, the illustration
  is in Authorship and there is no Illustrator in the team. If someone else
  illustrates the text, that person is in the team as Illustrator.

## "Nothing recorded" is never "none"

A key that is absent means the archive has no record, not that the answer is
no. Never write "no author", "no team" or "did not use AI" from a missing key.

- `autoria_livro` and `equipe_livro` only exist with at least one link. An old
  book without them has simply not been catalogued.
- `uso_ia` (AI use) has `estado`: `usou` (used), `nao-usou` (did not use) or
  empty, which is "Não informado" (not informed) and is the **default**. Only
  `nao-usou` is an affirmation, and it is the cataloger's own. A book whose
  `uso_ia` is absent or has an empty `estado` must be read as "unknown".
- A Role listed in `papeisHabituais` of a collaborator is only a reminder of
  what that person usually does. The role that counts is the one in the book's
  `equipe_livro`.

## Reading AI use

When `estado` is `usou`, `usos` lists each use. In each item:

- `onde` (where: cover, illustration, text, revision, translation, layout...),
  `ferramenta` (the product, such as ChatGPT or Midjourney) and `modelo` (model
  and version) are separate on purpose: the same product changes models over
  time and the same model appears in different products. Do not infer one from
  the other, and `modelo` may be empty.
- `data` is partial (year, or year and month): it marks roughly when, not an
  exact day.
- `como` says how the AI contributed, from "Gerou do zero" (generated from
  scratch), "Gerou quase pronto" (generated almost finished, the author only
  touched it up), "Gerou uma base" (generated a base to work on), "Editou ou
  refinou algo meu" (edited or refined something of the author's, the opposite
  direction), "Sugeriu ideias", "Corrigiu ou revisou" and "Traduziu". Read this
  as authorship weight: the first three mean the AI produced material; the
  fourth means the base was the author's.
- `texto`, when present, is `{ tipo, titulo }` and says that **that specific
  poem or prose** was made with AI. Without it, the use belongs to the book as
  a whole.
- `nota` is a general free-text note and may exist with no `estado`.

## What the book export contains, and what it never does

The book download (`.json`, `.csv`, `.md`, `.pdf`, `.docx`) carries information
**about the book**, never the content of its poems and prose (that is the
Structure tab's export).

- Fields that store ids are replaced by derived keys in snake_case:
  `tem_capa` (has a cover; the image itself only goes into `.pdf` and `.docx`),
  `autoria_livro` and `equipe_livro` (by name, with roles and scopes, with no
  contact and no ids), `uso_ia` (with the text's title in place of its id) and
  `estrutura` (counts of parts, sections, poems, prose, elements and unpublished
  items).
- Sinopse curta (short synopsis), Sinopse (synopsis), Orelhas (flaps), Contracapa (back cover), the opening
  verses, the cover description and the cover phrase belong to the book, so
  they are exported. The text of poems and prose is not.
- With the "Include structure" option (off the first time, and the choice is
  remembered), the record also carries `estrutura_arvore`: the structure of the
  book with **titles only** (parts, sections, elements, poems and prose, nested
  as in the Structure tab), plus `vinculados` (texts linked to the book without
  a position in the structure). In `.csv` it comes as a second file,
  `-estrutura.csv` (one row per node, with `nivel`, `tipo`, `titulo`, `caminho`),
  and the two go together in a `.zip`. A Collection (Coletânea) can be
  downloaded from its own tab, with the same option.
- With the "Include Fora de escopo" (out of scope) option (also off the first
  time and remembered; it only works together with the structure),
  `estrutura_arvore` gains `fora_de_escopo: { migrados, descartados }`. Each
  entry is `{ tipo, titulo, status, detalhe, origem, destino? }`, with no id and
  no text: `origem` is `{ caminho, posicao }` (where the text was in the book)
  and `destino` (migrated only) is `{ livro, secao, posicao }`. Without the
  option, a discarded text does not appear anywhere in the structure (not in the
  tree, not in `vinculados`, not in the `estrutura` counts). In `.md` it becomes
  the "Fora de escopo:" block; in `-estrutura.csv`, the `fora_de_escopo` and
  `detalhe` columns; in `.pdf` and `.docx`, the same section as an indented
  list. A Collection has no Fora de escopo.
- The cover's "image link" is only text. A link that cannot be downloaded
  (login, CORS) is never embedded.
- A `.pdf` or `.docx` shows the cover beside the short fields and the rest in
  full width. This is layout, not meaning: field order follows the same model
  as the other formats.

## Searching books

The Books tab search accepts prefixes: `autor:` (Authorship), `papel:` (role in
Authorship), `equipe:` (Team), `papelequipe:` (role in the team), `-` to
exclude and `*` for "has any" (`-equipe:*` is books with no team). `@` binds a
person to a role **in the same book**: `autor:Maria@Tradutor` is Maria as
translator, not Maria as author of a book someone else translated. Names match
by fragment, roles by whole word. When reading a user's question about "who
illustrated X", look at `equipe_livro`, not at `autoria_livro`.
