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
computing the scheme "letter" (A, B, C...) or whether the rhyme is
external/internal — the system calculates that on its own from the pairs;
you only need to point out **which verses rhyme with which**, and exactly
which syllables on each side form the shared sound.

If there's a monorhyme (several verses sharing the same sound, like AAAA),
list all the pairs that form that chain (1↔2, 2↔3, 3↔4, etc. — no need to
decide whether this counts as "one group", the system merges them
automatically).

## Step 3 — Classify each rhyme pair

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
- Rara (palavra de baixa frequência/pouco usada em rima) — rare/uncommon
  word in rhyme
- Preciosa (combinação vocabular incomum, ex. palavra composta/
  estrangeirismo) — unusual word combination, e.g. compound word or
  loanword

## Step 4 — General classification of the poem (7 fields)

Fill in the 7 fields below based on the whole poem. Always pick from the
matching closed list, with the exact wording (in Portuguese).

**1. Poem Form** (`formaPoema`) — pick one:
Soneto Clássico (Classic Sonnet) · Haikai (Haiku) · Tanka · Lira Brasileira
(Brazilian Lira) · Limerick · Trova · Quadra Popular (Popular Quatrain) ·
Poesia Narrativa / Cordel (Narrative Poetry / Cordel) · Forma Livre /
Indefinida (Free / Undefined Form)

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

- **Soneto Clássico** → Isométrico · Decassílabo or Alexandrino · rhymed
  (not "Sem Rimas") · ABBA, ABAB, or Mista pattern · Medida Nova.
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

Return your analysis in this structure:

### 1. Syllable grid

Verse by verse, numbered, with `/` between syllables and the stress in
**bold**, preserving blank lines between stanzas.

### 2. Rhyme pairs

Numbered list. For each pair: which two verses (by number), the rhyming
snippet on each side (you can cite the word or just the rhyming
syllable(s)), and the classification along the 3 axes (Stress / Tonality /
Richness).

### 3. General classification

A table or list with the 8 fields from Step 4 and the value chosen for
each, plus a short sentence justifying the Form chosen (it's the field that
depends most on interpretive reading — the others mostly follow from it).

### 4. Points to double-check

Any verse where the syllable division was ambiguous (e.g. two possible
metrical readings), any doubtful rhyme (assonant vs. imperfect, for
instance), or any unusual combination flagged above — for me to review
before considering the scansion final and transcribing it into the system.
