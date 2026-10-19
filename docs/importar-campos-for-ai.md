# Import fields from .json: how to build the file

This document explains the file read by the "Importar campos" (Import fields) tool, in the Import tab, so that an AI can build it after analysing the archive's texts. It doesn't ask for any task on its own. For the criteria on choosing Themes and Subjects, see `temas-assuntos-for-ai.md`.

---

## What the import does

Each item of `textos` points to **one Poem or Prose piece that already exists** and adds fields to it. The import **never creates a text** and **never removes anything** from a text. The app shows a preview before writing, takes a safety snapshot, and lets the user undo.

Two template files can be downloaded in the modal: the plain template (explanation and example) and the template **with the archive's vocabulary** (tags by category, themes, subjects with their themes, places with their path, non-hidden people, and the jargon and slang labels already in use). If the vocabulary came along, **use exactly those names**: a spelling variant creates a new, duplicate record.

## Shape of the file

```json
{
    "formato": "arquivo-poetico-campos",
    "versao": 1,
    "textos": [
        {
            "id": 1776750689996,
            "titulo": "Olhar Lírico",
            "tipo": "poema",
            "etiquetas": { "Tom": ["Esperançoso"], "Estilo": ["Metapoesia"] },
            "temas": [{ "tema": "Resiliência emocional", "papel": "principal" }],
            "assuntos": [{ "assunto": "Vida emocional", "papel": "automatico" }],
            "territorialidade": ["Brasil", "Santos"],
            "localEscrita": "Santos",
            "pessoas": [{ "pessoa": "A person's name", "papeis": ["Dedicatário(a)"] }],
            "jargaoGiria": ["Gíria de internet"],
            "pendencia": "revisar métrica",
            "fonte": { "origem": "Obra própria", "conferido": true }
        }
    ],
    "ligacoes": [{ "tema": "Efemeridade", "assunto": "Tempo, memória e perda" }]
}
```

Keep the Portuguese keys and values exactly as shown. Only the `textos` and `ligacoes` lists are read; keys such as `como_usar`, `valores_aceitos`, `exemplos`, `exemplos_ligacoes` and `vocabulario` that come with the template are explanation and can be deleted.

## How the text is found

- By `id` (safest, it comes in the `.json` export) or by `titulo` (case and accent insensitive). `tipo` (`poema` or `prosa`) is only needed when the same title exists in both.
- A title that matches more than one text, an `id` that doesn't match the title, and a text that doesn't exist are **never guessed**: they go to the report and are left out.

## List fields (always add)

- **`etiquetas`** (tags): an object keyed by category (Tradição, Estilo, Relação, Sensibilidade, Tom, Domínio Imagético, Outros), each with a list of names. A tag that doesn't exist in the category is created.
- **`temas`** (themes): list of `{ "tema", "papel" }`, or just the name. Role: `principal`, `secundario` or `indefinido`. Without `papel`, a new theme enters undefined and a theme the text already has keeps its role. A new theme is created.
- **`assuntos`** (subjects): list of `{ "assunto", "papel" }`. The subject **must exist**, and some theme of the text must belong to it (a subject is derived from themes). Role: `automatico` (follows the theme and restores a subject that had been removed), `principal`, `secundario`, `indefinido` (pins without a role) and `nao-se-aplica` (removes the subject from this text). A subject is never created.
- **`territorialidade`**: list of places the **text cites** (country, city, neighbourhood, river). A new place is created without a type and without a parent; the hierarchy is organised later in the Places tab. For a homonym (São Paulo city and state), write the label with the type, such as "São Paulo (Cidade)".
- **`pessoas`** (people): list of `{ "pessoa", "papeis" }`. `papeis` accepts the six values of the closed list (Retratado(a), Inspiração para, Dedicatário(a), Mencionado(a), Aludido(a), Associado(a) retroativamente), with or without the "(a)". A person the text already has only gains the missing roles. A new person is created, without a group. **A role outside the list leaves that person out** (it goes to the report). An empty roles list is valid ("unspecified").

- **`jargaoGiria`** (jargon and slang, from the Language group): list of free-text labels. Fill it only when the text speaks **WITH** the vocabulary of a community or medium, literally: internet slang, youth slang, corporate jargon, fandom language. Test question: does the text speak WITH these words, or only talk ABOUT memes, apps or technology, or use a field of knowledge as a metaphor? In the last two cases it is **not** this field (it is a Theme, a Reference or Domínio Imagético), and the general formality of the language ("pra", "tô") belongs to the Registro select, not here. It adds to what the text has, ignoring case and accents. There is **no registry**: the label goes into the text exactly as written, so the report marks as _new_ any label that is not one of the four seeds (`Gíria de internet`, `Gíria juvenil`, `Jargão corporativo`, `Linguagem de fandom`) and is not already used in another text; check its spelling before applying. Reuse the labels from the vocabulary whenever one fits. Optional and sparse: **leave it out when in doubt**, since most texts have none.

## Theme to Subject links (`ligacoes`)

A list at the top of the file, outside `textos`: each item is `{ "tema": "Name", "assunto": "Name" }`, or `{ "tema": "Name", "assuntos": ["Name", "Name"] }` to link one Theme to several Subjects. It says which Subject a Theme belongs to.

- A link belongs **to the Theme**, not to a text: it applies to every text that has that Theme, those in the file and the others.
- The Subject **must exist** (it is never created) and a link only adds: nothing is removed from a Subject.
- Links run **before** the texts. So a new Theme brought by a text in the file can already be used in `assuntos` in the same file, as long as the file links it.
- A Theme that doesn't exist in the registry is only created if some matched text in the file brings it. A link whose Theme exists nowhere goes to the report and is left out.
- The file may have **only `ligacoes`** (with `textos` empty or absent): that is the way to organise Themes that don't have a Subject yet.
- A link that already exists is ignored and shows in the report as "already existed".

## Single-value fields (fill only what is empty)

- **`localEscrita`**: one place, where the text was **written** (different from `territorialidade`, which is what the text cites).
- **`pendencia`**: free text.
- **`fonte`**: `{ "origem", "edicao", "link", "dataAcesso", "conferido", "grafia" }`, or a plain string, which counts as `origem`. `dataAcesso` is the date `link` was accessed: `"yyyy-mm-dd"` or `"dd/mm/yyyy"`; an impossible date goes to the report, and it is only kept when the text has a link (in the file or already there). `grafia` accepts `atual`, `etimológica` and `quinhentista`. `conferido` only counts as `true` (it never unchecks).

These fields are only written when the text has no value yet. To replace an existing value, the user turns on "Substituir campos simples" in the modal; otherwise the report lists what was kept. **An empty value in the file never clears anything.**

## What the AI should not infer

- Don't invent a person's role or a place: if the text isn't clear, leave the field out. "People" are links to real people (portrayed, dedicated, mentioned), not characters.
- Don't record a writing place without grounds in the text or the biography; the field means "where it was written", and empty is a valid state.
- Don't fill `jargaoGiria` because a text mentions slang, memes or tech: it records the vocabulary the text itself uses. Don't invent labels when a seed or a vocabulary label fits.
- Don't create a subject: use only the ones the vocabulary lists, in `assuntos` and in `ligacoes` alike.
- Don't repeat one text in two entries; merge everything into one.
