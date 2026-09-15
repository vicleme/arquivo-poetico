# Instructions for scanning and classifying Sonoridade (poem sound analysis)

You'll receive a poem (pasted right after these instructions, or attached).
Your task is to analyze it and give me everything I need to fill in the
**Sonoridade** (sound/prosody) record for this poem in my system: the
syllable grid with stresses marked, the rhyme pairs, the classification of
each pair, and the 7 general classification fields for the poem.

Follow the steps below in order and return your answer in the structure
described in "Output format", at the end. Whenever a field has a closed set
of options, pick **exactly one, with the exact wording** listed here — don't
invent variations.

> This document is a task request (asking for an analysis from scratch).
> To interpret an already-filled/exported Sonoridade record — what each
> field means, what's derived and never stored, and the name collision
> between this `ecos` and Poem/Prose's Intratextuality `ecos` — see
> `sonoridade-for-ai.md`, complementary to this one.

Note: this system's data model and field names are in Portuguese (the poems
themselves are also in Portuguese). Keep your syllable division, stress
marks, and field values in Portuguese/matching the original text, but feel
free to write your explanations and reasoning in English if that's more
natural for you — just make sure the actual values you pick match the
Portuguese option lists below exactly.

---

## Step 1 — Syllable division (metrical scansion, not grammatical)

For each verse, split it into **poetic** syllables, not grammatical ones.
The rules that matter:

- **Synalepha/elision between words**: when a word ends in a vowel (or
  nasal vowel) and the next one starts with a vowel, the two syllables
  merge into a single poetic syllable ("que eu" → one syllable, "vida e
  morte" → "vi-da-e-mor-te" with "a-e" merged). Apply this whenever the
  vowel meeting allows the merge in natural speech.
- **Diphthongs and triphthongs** count as a single syllable; **hiatuses**
  count as two — use the criterion of natural pronunciation, not the
  school-grammar syllabification rule.
- **An orthographic hyphen carries no metrical weight** — treat it like a
  space (e.g. "deu-me" scans as "deu" + "me", two syllables, not one unit
  glued by the hyphen).
- The poetic count of a verse **stops at the last stressed syllable**: if
  the verse ends on an oxytone word, count up to that last syllable; if it
  ends on a paroxytone or proparoxytone word, the trailing unstressed
  syllables still get their own cell in the grid, but they don't count
  toward classifying the verse length (e.g. a verse whose syllable split
  yields 11 units but ends on a proparoxytone word can still be a
  decasyllable, because the official count stops at the stress, two
  syllables before the end).

Mark the division of each verse with a **slash (`/`) between syllables**, no
space around the slash. Mark the stressed syllable(s) of each verse in
**bold**.

Example (decasyllable, stress on the 6th and 10th syllable):

```
Bebe/co/mo eu/bebi:/de/bru/ça/-te
```

(the stressed syllable would be bold in your actual answer — shown here
unformatted since this is just an illustration of the division)

If the poem has stanzas separated by a blank line, preserve that separation
in your answer — it also exists as an "empty line" in the system's grid.

## Step 2 — Locate the rhyme pairs

Go through the poem and identify **pairs of verses that rhyme with each
other** based on the final sound (starting from the last stressed syllable
of each verse — this can include more than one syllable on each side when
the rhyme is rich, covering more than one shared sound). Don't worry about
computing the scheme "letter" (A, B, C...) or how close/far apart the two
verses are — the system calculates all of that on its own from the pairs;
you only need to point out **which verses rhyme with which**, and exactly
which syllables on each side form the shared sound.

Internal rhyme (both sides of the pair fall on the same verse) belongs
here too, with no separate rule: it follows the exact same strict criteria
as this step and Step 4, nothing loosened. If the sound match fails that
strict test, it doesn't count as internal rhyme — it becomes an echo
candidate for Step 3 instead.

If there's a monorhyme (several verses sharing the same sound, like AAAA),
list all the pairs that form that chain (1↔2, 2↔3, 3↔4, etc. — no need to
decide whether this counts as "one group", the system merges them
automatically).

## Step 3 — Locate sound echoes (quasi-rhymes)

Separately from Step 2, look for **sound echoes** (`ecos sonoros`): pairs
of stressed syllables whose sound is similar but fails at least one of the
strict tests from Step 2/Step 4 (e.g. same stressed vowel but different
nasalization, same vowel skeleton but different final consonant, same
stressed diphthong but different stress pattern). This is especially
relevant in free verse, where the poem may deliberately avoid full rhyme
while still working with repeated/similar sounds.

To avoid logging coincidences with no real relevance to the experience of
reading or reciting the poem, a pair only counts as an echo if it meets
**both criteria below at the same time**:

1. **Structural position** — the echoing syllables must be stressed, and
   fall in a position analogous to a real rhyme: at the end of the verse
   (mirroring external rhyme — the most common case) or on a stressed
   syllable in the middle of the verse echoing with the end of that same
   verse or of a nearby verse (mirroring internal rhyme, just without
   passing the strict test). Never flag an echo between loose unstressed
   syllables, or between sounds in the middle of words unrelated to the
   verse ending, even if the vowel matches.
2. **Proximity** — the two verses need to be in the same stanza, or in
   adjacent stanzas at most. Beyond that range, even a technically exact
   sound match isn't perceived as an echo while reading — it becomes
   statistical coincidence. If something like that shows up (sonically
   precise but too far apart), flag it in the "Points to double-check"
   section instead of the echoes array.

Point out **which verses form each echo pair** and exactly which
syllable(s) on each side create the shared sound — same level of detail as
the rhyme pairs in Step 2. For each echo pair, also suggest a **type**
label describing the sound device at play. This is a **free-text field**,
not a closed list, but prefer one of these common labels when it fits
before inventing a new one:

Assonância · Aliteração · Consonância · Paronomásia · Homeoteleuto

If no pair in the poem meets both criteria at once, return an empty list —
most poems won't have any echoes under this standard, and that's fine.

## Step 4 — Classify each rhyme pair

For each pair identified in Step 2, classify it along the three axes below
(pick one option from each list per pair):

**Stress** (of the rhyming word):
- Aguda / Oxítona (oxytone — stressed on the last syllable)
- Grave / Paroxítona (paroxytone — stressed on the second-to-last syllable)
- Esdrúxula / Proparoxítona (proparoxytone — stressed on the
  third-to-last syllable)

**Tonality** (sound quality of the rhyme):
- Soante / Consoante (Perfeita) — identical vowels and final consonants
- Toante (Assonante) — only the vowels match
- Imperfeita — partial resemblance, neither perfect nor purely assonant

**Richness** (grammatical relationship between the rhyming words):
- Pobre (mesma classe gramatical) — same part of speech
- Rica (classes gramaticais diferentes) — different parts of speech
- Rara (palavra com poucas opções de rima) — word with few rhyming
  options
- Preciosa (combinação vocabular incomum) — unusual word combination
- Idêntica (repetição de palavra) — identical/repeated word
- Homônima (repetição de grafia/som) — homonym (same spelling/sound,
  different meaning)

## Step 5 — General classification of the poem (7 fields)

Fill in the 7 fields below based on the whole poem. Always pick from the
matching closed list, with the exact wording (in Portuguese).

**1. Poem Form** (`formaPoema`) — pick one:
Soneto (Genérico) (Generic Sonnet, use when you can't tell/it doesn't
matter which tradition) · Soneto Petrarquiano / Camoniano (octave ABBA
ABBA + variable sestet) · Soneto Shakespeariano (3 ABAB quatrains + a
closing couplet) · Haikai (Haiku) · Tanka · Lira Brasileira (Brazilian
Lira) · Limerick · Trova · Quadra Popular (Popular Quatrain) · Poesia
Narrativa / Cordel (Narrative Poetry / Cordel) · Forma Livre / Indefinida
(Free / Undefined Form)

**2. Metrical Regularity** (`regularidadeMetrica`) — pick one:
Isométrico (all verses with the same syllable count) · Heterométrico
(lengths vary in a regular/patterned way) · Acentual / Polimétrico ·
Versos Livres (no fixed count)

**3. Verse Length** (`tamanhoVerso`) — pick one (based on the poetic count
from Step 1, up to the last stress):
Monossílabo (1) · Dissílabo (2) · Trissílabo (3) · Tetrassílabo (4) ·
Redondilha Menor / Pentassílabo (5) · Hexassílabo (6) · Redondilha Maior /
Heptassílabo (7) · Octossílabo (8) · Eneassílabo (9) · Decassílabo (10) ·
Hendecassílabo (11) · Alexandrino / Dodecassílabo (12) · Bárbaro (>12) ·
Múltiplos Metros (Fixos) · Variável / Sem Metro

If Metrical Regularity is Heterométrico, list the two (or more) lengths
present, not just one.

**4. Rhyme Scheme — Presence** (`esquemaRimasPresenca`) — pick one:
Rimado (Rhymed) · Versos Brancos (Metrificado sem rima) (Blank verse,
metered but unrhymed) · Sem Rimas / Livre (No rhyme / Free) · Rimas
Ocasionais (Occasional rhymes)

**5. Rhyme Scheme — Structural Pattern** (`esquemaRimasPadrao`) — only
relevant if Presence = Rimado; pick one:
Monorrima Absoluta (AAAA) · Monorrima por Blocos / Continuada (AAAA BBBB
CCCC) · Emparelhada (AABB) · Alternada / Cruzada (ABAB) · Oposta /
Interpolada (ABBA) · Encadeada / Terza Rima (ABA BCB) · Sextilha Aberta
(ABCBDB) · Décima Espinela (ABBAACCDDC) · Limerick (AABBA) · Quadra / Rima
Simples (ABCB) · Mista / Completa · Não Aplicável

**6. Origin/Tradition** (`origemTradicao`) — pick one:
Medida Velha (5/7-syllable verses, old Iberian tradition) · Medida Nova
(10/12-syllable verses, Italian/Renaissance tradition) · Tradição
Importada (imported forms like Haiku, Tanka, Limerick) · Contemporânea /
Livre

**7. Register** (`registro`) — formality of the language, pick one:
Culto / Erudito · Padrão / Neutro · Coloquial / Popular · Misto / Híbrido ·
Neológico / Experimental

**8. Tone** (`tom`) — the poem's mood/stance, pick one:
Lírico / Introspectivo · Melancólico / Elegíaco · Reflexivo / Filosófico ·
Irônico / Sarcástico / Satírico · Dramático / Tenso · Épico / Solene ·
Ufano / Exaltativo

### Combinations that usually go together (coherence check)

These aren't rigid rules you need to enforce, but use them to sanity-check
your answer before submitting it — if the poem doesn't match any of these
patterns, that's a sign the Form is probably "Forma Livre / Indefinida":

- **Soneto (Genérico)** → Isométrico · Decassílabo or Alexandrino · rhymed
  (not "Sem Rimas") · ABBA, ABAB, or Mista pattern · Medida Nova.
- **Soneto Petrarquiano / Camoniano** → same metre/rhyme presence as
  above, but pattern is ABBA (the octave) or Mista (octave ABBA + a
  differently-rhymed sestet) — never ABAB alone.
- **Soneto Shakespeariano** → same metre/rhyme presence, but pattern is
  ABAB (the three quatrains) or Mista (quatrains ABAB + a couplet that
  breaks the pattern) — never ABBA alone.
- **Haikai / Tanka** → Heterométrico · verses of 5 and 7 syllables · Sem
  Rimas · Tradição Importada.
- **Lira Brasileira** → Heterométrico · verses of 6 and 10 syllables ·
  rhymed (any pattern) · Medida Nova.
- **Limerick** → Heterométrico · verses between 5–9 syllables (long/short
  group) · rhymed · Limerick (AABBA) pattern · Tradição Importada.
- **Trova** → Isométrico · Redondilha Maior (7 syllables) · rhymed · ABAB
  or ABBA (if it's only the 2nd/4th verse rhyming, that's a Quadra, not a
  Trova) · Medida Velha.
- **Poesia Narrativa / Cordel** → Isométrico · Redondilha Maior (7
  syllables) · rhymed · Medida Velha (the rhyme pattern varies a lot by
  stanza type — sextilha, décima, etc. — so don't force a single one).
- If the Form is **Forma Livre / Indefinida** and the Regularity is
  **Versos Livres**, Verse Length is "Variável / Sem Metro", Rhyme
  Presence is usually "Sem Rimas / Livre" or "Rimas Ocasionais", and Origin
  is usually "Contemporânea / Livre".

Two notes that help decide Rhyme Presence/Pattern:

- If the meter is regular (Isométrico or Heterométrico with a clear
  pattern) but there's no real rhyme, use "Versos Brancos (Metrificado sem
  rima)" instead of "Sem Rimas / Livre" — the latter is more for genuine
  free verse.
- Absolute monorhyme (the whole poem in a single rhyme) is uncommon outside
  of Cordel/Trova — if it shows up in a form other than those two, flag it
  in your answer as something for me to confirm, rather than just filling
  it in.

---

## Output format

By default, return your analysis in the **text** format below (sections 1
to 5) — that's what lets me review it and check things with you before
transcribing it into the system. Only produce the **JSON** version (see
"JSON format — on request", further below) when I explicitly ask for it —
for example, after reviewing the text analysis, I say something like "now
give me this as JSON so I can import it." Don't jump straight to JSON on
your own.

### 1. Syllable grid

Verse by verse, numbered, with `/` between syllables and the stress in
**bold**, preserving blank lines between stanzas.

### 2. Rhyme pairs

Numbered list. For each pair: which two verses (by number), the rhyming
snippet on each side (you can cite the word or just the rhyming
syllable(s)), and the classification along the 3 axes (Stress / Tonality /
Richness).

### 3. Sound echoes

Numbered list. For each echo pair: which two verses (by number), the
echoing snippet on each side, and the suggested `tipo` label (from the
Step 3 list, or a custom one if none fits). Omit this section (or say
"none found") if the poem has no echoes.

### 4. General classification

A table or list with the 8 fields from Step 5 and the value chosen for
each, plus a short sentence justifying the Form chosen (it's the field that
depends most on interpretive reading — the others mostly follow from it).

### 5. Points to double-check

Any verse where the syllable division was ambiguous (e.g. two possible
metrical readings), any doubtful rhyme (assonant vs. imperfect, for
instance), or any unusual combination flagged above — for me to review
before considering the scansion final and transcribing it into the system.

---

## JSON format — on request

Only produce this version if I explicitly ask for it, after we've already
aligned on the text analysis above. When I do ask, generate the JSON from
the same analysis you already did (don't re-read the poem from scratch)
and return just the code block, ready for me to save as `.json` and upload
straight into the "Importar JSON" button in the Sonoridade tab.

Note: the field names and values below stay in Portuguese even in this
English document — that's the exact shape my system's import expects, not
a translation choice.

Exact structure the system expects:

```json
{
  "poemaTitulo": "Exact poem title",
  "formaPoema": "Forma Livre / Indefinida",
  "regularidadeMetrica": "Versos Livres",
  "tamanhoVerso": "Variável / Sem Metro",
  "esquemaRimasPresenca": "Rimas Ocasionais",
  "origemTradicao": "Contemporânea / Livre",
  "registro": "Coloquial / Popular",
  "tom": "Lírico / Introspectivo",
  "escansaoLinhas": [
    { "tipo": "verso", "texto": "Be/be/co/mo eu/be/bi:/de/bru/ça-te", "tonicas": [1, 5, 8] },
    { "tipo": "verso", "texto": "..." },
    { "tipo": "vazia" }
  ],
  "rimas": [
    {
      "a": { "linha": 0, "silabas": [8] },
      "b": { "linha": 1, "silabas": [8] },
      "acentuacao": "Grave / Paroxítona",
      "tonalidade": "Soante / Consoante (Perfeita)",
      "riqueza": "Pobre (mesma classe gramatical)"
    }
  ],
  "ecos": [
    {
      "a": { "linha": 2, "silabas": [3] },
      "b": { "linha": 4, "silabas": [2] },
      "tipo": "Assonância"
    }
  ]
}
```

JSON-specific rules — nothing here can be invented or approximated:

- **`poemaId`**: never include this field. It's my database's internal id,
  which you have no way of knowing — leave it out and the system resolves
  the poem via `poemaTitulo` instead.
- **`poemaTitulo`**: required, with the title **exactly matching** the one
  registered in my system (that's why I paste the title along with the
  poem's text) — that's how the import finds the right poem.
- **The 8 classification fields** (`formaPoema`, `regularidadeMetrica`,
  `tamanhoVerso`, `esquemaRimasPresenca`, `esquemaRimasPadrao`,
  `origemTradicao`, `registro`, `tom`): exact same wording as the Step 5
  lists. If a field doesn't apply (e.g. `esquemaRimasPadrao` when Presence
  isn't "Rimado"), you can simply omit the key.
- **`escansaoLinhas`**: one item per line of the poem, in order, including
  the blank lines between stanzas as `{ "tipo": "vazia" }` (no `texto` or
  `tonicas`). For each verse: `"tipo": "verso"`, `texto` with the same
  syllable division from Step 1 (syllables separated by `/`, no space
  around it — an orthographic hyphen can stay inside the syllable or show
  up as an isolated empty slot between slashes, either way, the system
  ignores the hyphen in its calculation), and `tonicas` as an array of
  **0-based indices**, counting the slash-separated positions left to
  right (an isolated hyphen slot between slashes counts as an index, but
  should never appear in `tonicas`). Don't include `numero` — the system
  renumbers on its own.
- **`rimas`**: one object per pair identified in Step 2, with `a` and `b`
  pointing to the left/right side of the pair. Each side is
  `{ "linha": X, "silabas": [...] }`, where **`linha` is the 0-based index
  of the verse's position within the `escansaoLinhas` array** — counting
  blank lines toward that position too, since they occupy a slot in the
  array — and `silabas` is the list of indices (same 0-based scheme as
  `tonicas`) of the syllables on that side that form the shared sound (more
  than one index when the rhyme is rich enough to cover more than one
  syllable). `acentuacao`, `tonalidade`, and `riqueza` follow the exact
  wording from Step 4.
- **`ecos`**: same shape as `rimas` (`a`/`b` sides, same 0-based
  `linha`/`silabas` scheme), one object per echo pair identified in
  Step 3 — but instead of `acentuacao`/`tonalidade`/`riqueza`, each
  object takes a single **`tipo`** key with a free-text string (prefer
  one of the Step 3 suggestions — Assonância, Aliteração, Consonância,
  Paronomásia, Homeoteleuto — but any non-empty string is accepted).
  Omit `tipo` only if you genuinely can't characterize the echo. If the
  poem has no echoes, omit the `ecos` key entirely (or use an empty
  array).

If anything was ambiguous or uncertain during the text analysis, resolve it
with me before I ask for the JSON — the JSON format has no room to flag
doubt the way the "Points to double-check" section does.
