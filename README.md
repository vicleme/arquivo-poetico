# Arquivo Poético

🌐 **Language:** **English** (you are here) | [Português](README.pt-br.md)

Local, backend-free app for organizing, editing, and exporting a collection of
poems, prose pieces, books, and anthologies. Everything runs in the browser;
text data is saved to `localStorage` and cover images to `IndexedDB`. The
`.json` files are used for backup and data exchange — the full backup can
embed covers as base64 (the "capas" checkbox next to "Download JSON"), but
selective exports never include images.

---

## Getting started

The app uses ES Modules, so **it won't work by opening `index.html` directly**
from the file system (browser CORS restriction). You need a static local
server:

- **VS Code:** install the [Five Server](https://marketplace.visualstudio.com/items?itemName=yandeu.five-server) or Live Server extension and click "Go Live"
- **Python:** `python -m http.server` in the project folder, then visit `http://localhost:8000`
- **Node:** `npx serve .` in the project folder

No dependencies need to be installed to use the app. Tailwind CSS is loaded via CDN; Chart.js and DOMPurify are vendored locally in `assets/js/`.

### Test suite

For development (not needed just to use the app), install the dependencies and run the suite with Node's built-in test runner:

```
npm install
npm test         # node --test (tests/)
npm run lint     # eslint .
npm run format:check   # prettier --check .
```

---

## Screenshots

### Books

![Books tab](assets/screenshots/livros.png)

### Anthologies

![Anthologies tab](assets/screenshots/coletaneas.png)

### Parts

![Parts tab](assets/screenshots/partes.png)

### Sections

![Sections tab](assets/screenshots/secoes.png)

### Poems

![Poems tab](assets/screenshots/poemas.png)

### Prose

![Prose tab](assets/screenshots/prosas.png)

### Elements

![Elements tab](assets/screenshots/elementos.png)

### Structure

![Structure tab](assets/screenshots/estrutura.png)

### Export

![Export tab](assets/screenshots/exportar.png)

### Statistics

![Statistics tab](assets/screenshots/estatisticas.png)

---

## Folder structure

```
/
├── index.html               → App skeleton: header, nav, tabs and #modais-container
├── filtrar.html              → Separate tool for registering alternative versions
│                                of sensitive texts before exporting to an AI
│                                (see "Alternative Versions" section below)
├── localizar-substituir.html → Separate find-and-replace tool for
│                                Poems/Prose (see "Main features" below)
├── README.md
├── README.pt-br.md
├── CONTRIBUTING.md / CONTRIBUTING.pt-br.md
├── LICENSE
├── package.json / package-lock.json  → Scripts (`npm test`, `npm run lint`,
│                                        `npm run format`) and dev dependencies
│                                        (docx, eslint, happy-dom, jszip,
│                                        prettier — see "Test suite" above)
├── eslint.config.js / .prettierrc.json / .prettierignore
│
├── assets/
│   ├── css/
│   │   └── style.css        → Styles complementing Tailwind (CDN)
│   ├── icons/
│   │   └── favicon.svg, favicon-32.png, favicon-180.png
│   ├── logo/
│   │   └── Logo.png, Logo.ai, Logo (variacoes).png, Logo (com margem).png
│   └── screenshots/         → Screenshots used in the README
│
├── docs/                      → Guides for using external AIs (ChatGPT,
│   │                            Claude, Gemini, etc.), separate from the
│   │                            development decision log (see "manutencao/"
│   │                            below)
│   ├── export-to-ia.md / export-to-ia-pt-br.md
│   │                          → Nested vs. flat export format for use with
│   │                            an AI (see "Main features")
│   └── scansion-for-ai.md / scansion-for-ai-pt-br.md
│                              → Instructs an AI to scan a pasted poem
│                                (syllable grid, stresses, rhyme pairs, and
│                                the 7 classification fields of the
│                                Sonoridade tab), ready to transcribe the
│                                answer back into the system
│
├── manutencao/                → Internal development documentation (not a
│   │                            usage guide — see "docs/" above)
│   ├── status.md              → Short checklist of what's done/open/pending
│   │                            manual testing, per session
│   ├── schema.md               → Breakdown of every field in the data model
│   ├── decisoes.md             → Reasoning behind product/schema decisions
│   └── licoes-de-sessao.md     → Known risks and pitfalls when resuming a
│                                  development session
│
├── js/                       → All app logic (ES Modules)
│   ├── main.js               → Entry point; wires the HTML onclick="" handlers to
│   │                           functions and registers each modal (id, file, init)
│   ├── db.js                 → Central state + persistence (localStorage)
│   ├── capas.js              → Cover image storage via IndexedDB;
│   │                           auto-resizes and compresses on upload
│   ├── modais.js             → Lazy loading of modals via fetch, with caching
│   ├── ui.js                 → Tabs, dropdowns, auto-fill (re-exports
│   │                           toggleModal/garantirModal from modais.js)
│   ├── render.js             → Orchestrator: calls, in order, each tab's
│   │                           renderers on every 'db:saved' event (see the
│   │                           modules below for each one's logic)
│   ├── render-listas.js      → Rendering of Books/Parts/Sections/
│   │                           Poems (+ multi-select)/Prose/Elements/
│   │                           People/Groups/Authors/Eras/Sonoridade
│   ├── render-estrutura.js   → "Structure" tab tree: cascading selection,
│   │                           move ▲▼, move between levels
│   ├── render-conexoes.js    → "Connections" tab: builds the Link (pairs/
│   │                           clusters) and Reference (layered graph)
│   │                           diagrams from db.poemas/db.prosas, plus the
│   │                           "gaps" panel
│   ├── render-lightbox.js    → Loads covers from IndexedDB asynchronously
│   │                           and shows a navigable lightbox
│   ├── autobackup.js         → Automatic snapshots of the collection in
│   │                           IndexedDB (safety net alongside the manual
│   │                           "Download JSON" — doesn't replace it)
│   ├── forms.js              → Submit/edit Book, Part, Section, Poem,
│   │                           Prose, Element, Person, Group, Author, Era
│   │                           (includes the Merge Person/Era flow and the
│   │                           Sonoridade cascading Validation Matrix)
│   ├── editor.js             → Text formatting toolbar + tags/people
│   ├── editor-sonoridade.js  → Sonoridade tab: syllable grid, Stressed
│   │                           Syllable Mode, Rhyme Mode, rhyme pair
│   │                           mapping/classification, and the read-only
│   │                           grid reused by the "View" modal
│   ├── visualizar-sonoridade.js → "View" modal for a scansion (read-only,
│   │                           same grid as editor-sonoridade.js)
│   ├── exportar-sonoridade.js → Exports a scansion as .md/.pdf/.docx/.json
│   │                           — the Syllable Grid renders as a real table
│   │                           in .pdf/.docx (auto landscape for long
│   │                           verses in .pdf), linear text with " / " in
│   │                           .md
│   ├── coletaneas.js         → Anthologies tab logic
│   ├── colunas.js            → Which columns are shown and in what order
│   │                           in the Poems/Prose tables (per-table
│   │                           preference, saved to localStorage)
│   ├── colunas-contagem.js   → Per-column/filter item counts in the tables
│   ├── celulas-tabela.js     → Sortable header, pagination, and bulk
│   │                           selection for the Poems/Prose tables
│   ├── selecao-massa.js      → Bulk-action bar (export selection as
│   │                           JSON/Markdown) in the Poems/Prose listings
│   ├── acoes-coluna.js       → Which buttons show in the Actions column
│   │                           (View, Download, Edit, Delete) and the
│   │                           format used by "Download", per table
│   │                           (Poems/Prose/Sonoridade)
│   ├── busca-campo.js        → Ctrl+F scoped to a single text field,
│   │                           instead of the browser's native Ctrl+F
│   │                           (which searches the whole page)
│   ├── visualizar.js         → Poem/Prose "View" modal: shows the same
│   │                           content as the exported `.md`, rendered on
│   │                           screen
│   ├── theme.js              → Light/dark/automatic theme (reacts to the
│   │                           OS theme changing live)
│   ├── estatisticas.js       → Statistics panel (Chart.js)
│   ├── exportar.js           → Selective export (by attributes) + export
│   │                           of the Poems/Prose listing selection +
│   │                           full nested exports
│   ├── exportar-md.js        → Markdown export generation (used by
│   │                           Selective export, table selection, and
│   │                           nested exports)
│   ├── exportar-pdf.js       → PDF export generation (Actions column and
│   │                           the Poem/Prose View modal)
│   ├── exportar-docx.js      → Word (.docx) export for Poems/Prose and for
│   │                           the Sonoridade scansion itself
│   ├── nesting.js            → Hierarchical nesting logic (used by
│   │                           exportar.js)
│   └── utils.js              → Pure functions with no internal dependencies;
│                               includes the delete-confirmation modal,
│                               ID generation (gerarId), HTML escaping
│                               (escapeHtml), and the Sonoridade tab's
│                               cascading validation constants/matrix
│
├── modais/                    → HTML for each modal, loaded on demand
│   ├── modal-livro.html
│   ├── modal-parte.html
│   ├── modal-secao.html
│   ├── modal-poema.html
│   ├── modal-prosa.html
│   ├── modal-elemento.html
│   ├── modal-col-parte.html
│   ├── modal-col-item.html
│   ├── modal-pessoa.html
│   ├── modal-grupo.html
│   ├── modal-autor.html
│   ├── modal-epoca.html
│   ├── modal-sonoridade.html  → Create/edit a scansion (see
│   │                            editor-sonoridade.js)
│   ├── modal-visualizar-sonoridade.html → "View" modal for a scansion (see
│   │                            visualizar-sonoridade.js)
│   ├── modal-visualizar.html  → Poem/Prose "View" modal (see visualizar.js)
│   └── modal-mesclar.html     → Generic Merge modal (Person/Era)
│
├── scripts/
│   └── normalizar-datas.js    → One-off data maintenance script (dates)
│
├── tests/                     → `node --test` (see "Test suite" above)
│   └── helpers/
│
└── data/                      → Excluded from version control (see .gitignore);
                                  personal backups and exports live here
```

---

## Main features

- **Hierarchical registration**: Books → Parts → Sections, with Poems, Prose,
  and Text Elements (introduction, multimedia, commentary, interlude,
  afterword) able to link to any of these three levels.
- **Anthologies**: a separate tab for curating collections. An Anthology is a
  record in `db.livros` with `tipo: "Coletânea"`; it has Parts (the same
  `db.partes` collection as regular Parts, distinguished by `livroId`) and
  each Part has Items in `db.itensColetanea` (linked via `parteId`), which
  reference existing poems/prose (`refId`/`refTipo`) or hold anthology-only
  text (`textoOverride`). Deleting an anthology cascades to its parts and
  items, without affecting the original texts.
- **Covers**: Books, Parts, and Sections accept a cover image. Images are
  stored in `IndexedDB` and never end up in the backup JSON. The viewing
  lightbox supports navigation between covers with ◀ ▶ and the ← → keys.
- **Partial dates**: "Date Written" and "First Publication Date" accept
  partial day/month/year/hour/minute — fill in only what you know.
- **Rich text editor**: bold, italic, underline, alignment, color, font,
  and size applied inline to the poem text.
- **Central registries** (People, Groups, Authors, Eras tabs): reusable
  records instead of loose text. On each Poem/Prose, a Person can carry one
  or more roles (`PAPEIS_PESSOA`: Depicted, Inspiration for, Dedicated to,
  Mentioned, Alluded to, Retroactively associated) and a Group can be referenced directly (without
  naming a specific Person in it) or via a linked Person. Authorship uses a
  single role per text (Author/Co-author). Renaming a Person or Era to an
  already-existing name doesn't merge the records automatically — the form
  offers **Merge now** (unites the two, moving links over), **Save anyway**
  (keeps them separate), or **Cancel**.
- **Eras**: its own registry (name, relationship context, notes) that a
  Poem/Prose can reference under "Depicted Era", with a start/end (partial
  dates) and a `recorte` — "moment" (just the event) or "aftermath" (its
  later effect).
- **Tags and people**: theme tags and "dedicated to / about whom" as
  reusable labels, with `<datalist>` suggestions.
- **Poem status**: 🟡 Incomplete, ⚪ Complete, 🟢 Published, 🔵 Migrated
  (text moved from one book/section to another), 🔴 Discarded, and 🔒 Private
  (never intended for publication, unlike Discarded).
- **Migration between books** (Poem): "Cut from" and "Released in" fields
  (Book + Part/Section), free text with `<datalist>` suggestions drawn from
  already-registered books/parts/sections — meant for poems with Migrated
  status, but fillable at any time (the source book may no longer exist as
  a record in the archive). Choosing an already-registered Section
  auto-fills the corresponding Book; typing/choosing the Book filters
  Section suggestions to that book only.
- **Links and References** (Poem and Prose): two ways to connect a text to
  another in the collection itself (Prose can point to a Poem or another
  Prose; a Poem can only point to another Poem). **Links** are bilateral —
  a `relacao` (Rewrite, Continuity, Translation, Variation, Version,
  Response, Diptych, Other) with a `direcao` (origem = base text, destino =
  derived text). **References** are unidirectional, always from the newer
  text to the older one — just a `tipo` (Shared character, Shared central
  image, Nod to, Other), with no direction. The **Connections** tab scans
  all Links/References and builds graph diagrams (pairs/clusters for
  Links, layered graphs for References — convergences and branches become
  single nodes with multiple edges, not duplicate nodes) plus a "gaps"
  panel (a link registered on only one side); diagrams can be downloaded
  as PNG.
- **Sendings and Reactions** (Poem and Prose): a record of when and to
  whom a text was sent (person, date, channel, reaction, notes) —
  `pessoa` and `meio` are free text with `<datalist>` suggestions, with no
  central registry required.
- **Recognitions** (Poem and Prose): awards or mentions a text received
  (award name, placement, year, notes).
- **Editorial status for Books/Anthologies**: Unpublished, Out of print,
  Public domain, or Re-edited — a publishing concept for the book as a
  whole, separate from the individual Poem/Prose status.
- **Intertextuality** (Poem): a list of external references (song, book,
  film/series, video, quote...), each with a type + text — a poem can
  reference several different reference types at once. Each item can be
  edited in-place (click ✎ to reopen a saved item before deleting it).
- **Attachments** (Poem): a list of items accompanying the text —
  Illustration, Photo, Lettering, Recited video, Video comments, or Other —
  each with a type + description, and a link (required for video types,
  optional for the rest). A poem can have one or several attachments of
  different types at once, each editable in-place like Intertextuality. A
  free-text field — **Attachment Note** — covers observations about the set
  as a whole (when the attachments relate to each other — theme, style,
  unity — rather than each one individually).
- **Marginal Annotations** (Poem): a list of comments from another "voice"
  written over the text — usually in a cursive font different from the
  poem's — tied to a specific verse or passage. Each item has a reference
  passage + position + font + text; position and font are free text with
  `<datalist>` suggestions (not a closed select), since position can be
  compound (e.g. "below and to the left") and the font, while it tends to
  repeat, can vary. Different from Intertextuality (a dialogue with
  something outside the archive) and from Visual Description (the poem
  itself laid out unusually in space, in the same font as the text).
- **Redaction**: free-text notes field about data redaction.
- **Sensitive Content and Triggering Vocabulary** (Poem): two dedicated
  fields for notes about the text itself. Filling in either one
  automatically flags the poem for review in Alternative Versions
  (`filtrar.html`) — see the dedicated section below.
- **Structure**: navigable tree of an entire book, with multi-select for
  partial export and ▲▼ buttons for inline reordering.
- **Statistics**: overall summary, distribution by year/book/theme/person
  (Chart.js), and most frequent words (with Portuguese stopwords).
- **Selective export**: by type, person, theme, date range, status, and
  specific books/anthologies — plus the option to export everything nested
  (Book → Part → Section → Poem) at once. Each exported item carries all of
  its fields (`notas`, `pessoas`, `sinalizacoes`, `conceitos`, etc.) plus
  the context (Book/Part/Section) already resolved to text, with no need to
  cross-reference IDs. Available both in JSON (working format, re-importable)
  and Markdown (reading format — see the dedicated section below).
- **Export by table selection** (Poems/Prose): check items via the
  listing's own checkboxes and export just those, in JSON or Markdown, from
  the bulk-action bar ("⬇ JSON" / "⬇ MD") — complements Selective Export
  (which filters by attribute) and the Structure tab's point export
  ("Export selected", which filters via the tree but only outputs
  structural JSON, with no resolved context and no Markdown option).
- **Alternative Versions (`filtrar.html`)**: separate tool (reachable from
  the "Tools" group in the app nav) for reviewing poems/prose flagged with
  sensitive tags and registering alternative versions of the text before
  exporting to an AI.
  Accepts either the full backup or the JSON generated by Selective Export.
  Registered versions are saved by title in the browser (its own store,
  separate from the main app's `localStorage`) and are reapplied
  automatically on future uploads.
- **JSON import/export** for a full backup of the collection (text data).
- **Configurable columns** (Poems/Prose): choose which columns show and in
  what order, saved per table in the browser; ID/Title and Actions are
  fixed. Poem table headers are clickable to sort (by structure, date,
  alphabetically, or by status, depending on the column).
- **Configurable Actions column** (Poems/Prose): choose which buttons show
  (View, Download, Edit, Delete) and the format used by "Download" (JSON,
  Markdown, or PDF), saved per table.
- **View** (Poems/Prose): a modal showing the same content as the exported
  `.md`, rendered on screen instead of downloaded.
- **PDF export**: alongside JSON and Markdown, individual items can be
  downloaded as PDF from the Actions column or the View modal.
- **Sonoridade** (Analysis > Sonoridade): metrical scansion of an already
  registered poem, stored as its own record (`db.sonoridades`), linked to
  the poem via `poemaId`.
  - **Syllable Grid**: split each verse into syllables by typing `/`
    between them (an orthographic hyphen doesn't count as a division — same
    weight as a space) and mark the stressed syllable(s) in **Stressed
    Syllable Mode**.
  - **Rhyme Mode**: click a syllable to open one side of the pair
    (shift-click extends it for a rich rhyme), click a syllable in another
    verse to open the other side, then confirm the pair — mutually
    exclusive with Stressed Syllable Mode. The scheme letter (A, B, C...)
    and Position (External/Internal) are never chosen by hand: the system
    derives both from the confirmed pairs.
  - **Rhyme Pairs**: a list below the grid with each pair's classification
    — Stress (Oxytone/Paroxytone/Proparoxytone), Tonality (Perfect/
    Assonant/Imperfect), and Richness (Poor/Rich/Rare/Precious) — plus
    removal with "Undo" and side reassignment without losing the
    classification already made.
  - **Poem classification**: 7 closed-option fields (Poem Form, Metrical
    Regularity, Verse Length, Rhyme Scheme — Presence and Structural
    Pattern —, Origin/Tradition, Register, and Tone). Choosing the Poem
    Form **filters** (never auto-fills or disables) the valid options for
    the other fields for fixed forms with known rules (Classic Sonnet,
    Haiku, Tanka, Brazilian Lira, Limerick, Trova, and, partially,
    Narrative Poetry/Cordel) — the field stays editable among the filtered
    options. Non-blocking warnings flag an atypical monorhyme in a fixed
    form, or a mismatch between the syllable count in the grid and the
    chosen Verse Length, without preventing saving.
  - **View/Download**: same configurable "⚙️ Actions ▾" column as
    Poems/Prose. "View" opens a read-only grid of the scansion; "Download"
    exports as `.md`, `.pdf`, `.docx`, or `.json`. In the latter two, the
    stressed syllable is real bold text and the Syllable Grid renders as a
    **table** aligned by syllable column (same as on screen) — in the
    `.pdf`, the page automatically switches to landscape if the poem has
    verses too long to fit in portrait; in the `.docx`, the whole document
    is born in landscape when needed instead.
  - See `docs/scansion-for-ai.md` for a ready-made guide on asking an AI
    to scan a poem and return the fields already in the right shape to
    fill in here.
- **Find and Replace** (`localizar-substituir.html`): a separate tool
  (reachable from the "Tools" nav group) to search for a text snippet in
  Poems and/or Prose — with case-sensitivity, scoping to Poems, Prose, or
  both, and choosing which text fields to search — it shows the
  before/after occurrences and only applies replacements to confirmed
  items. It doesn't reach nested lists (Links, References,
  Intertextuality, Attachments, Marginal Notes, Authorship, People,
  Sendings, Recognitions).
- **Light/dark/automatic theme**: preference saved in the browser; in
  automatic mode, follows the OS theme and reacts to changes live.
- **Search within a field** (Ctrl+F while a text field is focused):
  searches only within that field, unlike the browser's native Ctrl+F
  (which searches the whole page).

---

## Exported JSON formats

The app generates five distinct JSON formats, each identified by an
`export_format` field:

| `export_format`       | Generated by                               | Structure                                                                                                                                    |
| --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| _(absent)_            | "Download JSON" in the header              | Full backup: `{ livros, partes, secoes, poemas, prosas, ... }`                                                                               |
| `exportacao_seletiva` | Export tab → "Download selective JSON"     | Enriched flat structure: `{ export_format, itens: [...], coletaneas: [...] }` — each item's `contexto` is already resolved                   |
| `selecao`             | Poems/Prose listing → selection → "⬇ JSON" | Flat structure: `{ export_format, itens: [...] }` — same item shape as Selective Export (resolved context), just limited to the checked rows |
| `deep_nesting`        | "Export everything nested"                 | Full tree: `{ export_format, data: [nested books], avulsos, coletaneas }`                                                                    |
| _(single book)_       | "Download this full book"                  | Single book object with the whole nested tree                                                                                                |

---

## Data model

Data lives in two distinct places in the browser:

### localStorage (`arquivoPoetico_v3`)

| Field            | Description                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `livros`         | Books and Anthologies (distinguished by `tipo`). The `capa` field is a reference ID into IndexedDB, not base64.            |
| `partes`         | Parts of Books and Anthologies (distinguished by `livroId`).                                                               |
| `secoes`         | Sections linked to a Book or Part (`paiTipo`/`paiId`).                                                                     |
| `poemas`         | Poems, optionally linked to a Book/Part/Section (`paiTipo`/`paiId`).                                                       |
| `prosas`         | Prose pieces, same structure as Poems.                                                                                     |
| `elementos`      | Text Elements (introduction, multimedia, interlude, afterword...).                                                         |
| `itensColetanea` | Anthology Items: reference an existing Poem/Prose (`refId`/`refTipo`) or carry anthology-exclusive text (`textoOverride`). |
| `coletaneas`     | **Legacy** — not populated by the current tab; kept only for compatibility when importing old backups.                     |

### IndexedDB (`arquivoPoetico_capas`)

Object store `capas`: `{ id: string, blob: Blob }`. IDs are referenced by the
`capa` fields in `livros`, `partes`, and `secoes`. Deleting an item
automatically removes the corresponding cover.

> **Portability**: when copying the `.json` backup to another machine, text
> data always arrives complete. Covers only travel with it if the "capas"
> checkbox was checked when generating the file (embedded as base64);
> otherwise, the `capa` field in the JSON becomes an orphaned ID and the
> image simply doesn't appear.

---

## Alternative Versions (`filtrar.html`)

A separate page (outside the `index.html` SPA, reached via "Alternative
Versions" in the "Tools" nav group) for reviewing texts flagged with sensitive
tags and registering an alternative version of each one before exporting the
collection to an AI. Registered versions (`tituloFiltrado`, `textoFiltrado`,
`nota`) are saved by title in their own `localStorage` store, separate from
the main app's store — they survive new uploads and can be
exported/imported independently ("Export store" / "Import store" buttons).
Each version's internal note is saved only in that store and **never** goes
out in the exported JSON.

### How a text is considered sensitive

A poem/prose piece enters the review list when **any** of the conditions
below is true:

1. It has, among its tags, one of the tags configured in "Filter tags" —
   the list ships with `Sensitive content` as the single default tag (it
   covers Prose, which has neither of the dedicated fields below). It's
   fully editable: add, remove, or even empty it out, and the choice is
   saved in the browser, even to turn the default off;
2. It has the dedicated **Sensitive Content** field filled in (a Poem
   field, see "Main features" above); or
3. It has the dedicated **Triggering Vocabulary** field filled in (a Poem
   field).

Both dedicated fields currently only exist for Poems — Prose relies solely
on the "Filter tags" list.

### Naming distinction

The app uses two different mechanisms that could be confused with each
other:

- **Selective export** (Export tab): filters _which_ items go into the
  JSON, by person, theme, date, status, or book. Doesn't alter any text.
- **Alternative Versions** (`filtrar.html`): replaces the _content_ of
  sensitive texts with clean versions. Doesn't filter which items appear.

### JSON formats accepted on upload

`filtrar.html` recognizes two different file formats:

1. **Full backup** (`exportarJSON()`, "Download JSON" button in the header)
   — `{ livros, partes, secoes, poemas, prosas, ... }`. Texts come with
   `paiTipo`/`paiId`, and the book/part/section name is resolved by
   looking up `db.livros`/`db.partes`/`db.secoes` inside `filtrar.html`
   itself.
2. **Selective export** (Export tab → "Download selective JSON") —
   `{ export_format: 'exportacao_seletiva', itens: [...], coletaneas: [...] }`.
   Each item already comes with a `tipo` (`'poema'` or `'prosa'`) and a
   `contexto: { livro, parte, secao }` field already resolved to text.

`filtrar.html` detects the format by the presence of the `itens` field and
adjusts context reading accordingly.

> **Known limitation**: Anthology items present in the selective export
> (`coletaneas`) don't go through the sensitive-tag scan — the
> `itensColetanea` record doesn't carry its own `sinalizacoes`/`pessoas`
> (those fields belong to the original poem/prose referenced by `refId`). A
> warning is shown on screen when the loaded JSON contains anthologies.

---

## License

The application's source code is MIT-licensed — see [LICENSE](LICENSE). The
literary content under `data/` (poems, prose, and any other original
creative text) is **not** covered by that license and remains all rights
reserved by its author; that folder is also excluded from version control
(see `.gitignore`).

This project vendors two third-party libraries under `assets/js/`, each
distributed with its own license header intact:

- [DOMPurify](https://github.com/cure53/DOMPurify) — Apache License 2.0 / Mozilla Public License 2.0
- [Chart.js](https://www.chartjs.org) — MIT License

Tailwind CSS is loaded via CDN at runtime (MIT License) and is not vendored
in this repository.

## Commit convention

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/),
always in English. See [`CONTRIBUTING.md`](./CONTRIBUTING.md).
