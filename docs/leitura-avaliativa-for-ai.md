# Leitura avaliativa: how to interview the person about a text

This document doesn't ask for any task by itself. It explains what the "Leitura avaliativa" tab (Analysis group, after Morfofuncionalidade) records, so that an AI helping to fill it in works as an **interviewer** and not as a critic. The tab exists to help the person find out **why a text got to them, or didn't**. The AI's job is to ask the questions that make that visible and to write down only what the person said. The field-by-field map of the text itself is in `campos-poema-prosa-for-ai.md`; this document covers the criteria and the script.

---

## Rules before any question

1. **The reading belongs to the person.** Never judge the text, never say which items "the text has", and never infer an answer from the body of the text. Only what the person says counts. The archive holds texts by other authors too, and the reading is still the opinion of the person using the app.
2. **Never fill in on your own.** Offer each mark as a suggestion built from the person's own words, and wait for a yes or a no. What was not said stays empty.
3. **Blank is a valid answer** for every part: any item, "Releria?", "Mostraria a alguém?", the hearts and the Avaliação line.
4. **One block at a time and one question at a time**, short, in the order below. The form is meant to be quick.
5. **Hearts are "how much I like it", not a technical grade.** Never present them as a score of the text's quality.
6. **Use the app's labels and ids exactly as written here.** Ids are stored in lowercase, without accents.

## What a reading holds

Each time the person finishes a reading, the app stores one row in `db.leituras`. A text can have several readings, each with a date. The latest one decides everything the app derives (list filters, search prefixes, the pattern in the Estatísticas).

```json
{
    "data": "2026-11-01",
    "pegou": [
        { "item": "voz", "peso": "centro" },
        { "item": "imagem", "peso": "leve" }
    ],
    "incomodou": ["cliche"],
    "releria": "sim",
    "mostraria": null,
    "sugerido": 3.5,
    "escolhido": 4
}
```

| Part                                | What it is                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pegou` ("De que maneira te pegou") | 13 fixed items, each marked with one level                                                                |
| `incomodou` ("O que incomodou")     | 12 fixed items, no level                                                                                  |
| `releria`, `mostraria`              | `sim`, `talvez`, `nao` or `null` (no answer)                                                              |
| `sugerido`, `escolhido`             | hearts from 0.5 to 5 in steps of 0.5, or `null`. **Never 0**: 0 means "not evaluated" in the text's field |
| Avaliação (free line)               | **not** part of the reading: it is the text's own `autoavaliacao` field, one per text                     |

The lists are closed (factory lists). Do not invent items, and do not suggest a new item name: if something got the person and no item names it, write what they said in the Avaliação line (see "Hearts" below).

## The interview

### Step 0: which text

Ask which text, and let the person paste it or name it. If the text already has readings, say so: the latest counts, and the tab offers "Partir desta leitura", which copies the marks, the bothered items and the answers (not the hearts and not the free line) into a new draft. Ask whether the person wants to start from there.

### Step 1: an open question first

Ask something like "What stayed with you after reading?" and listen. Do not show the list yet. Then go through the items below, using the person's own words to propose the ones that seem to match, one at a time, as questions.

### Step 2: "De que maneira te pegou" (13 items)

Only the items that got the person are marked. Each marked item gets one level (see Step 3). Order as in the app:

| Id              | Label         | Question to ask                                                                                    | Do not confuse with                                                                       |
| --------------- | ------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `som`           | Som e ritmo   | Did the sound carry you: the cadence, the music, a rhyme that rocked?                              |                                                                                           |
| `palavra`       | Palavra       | Was it a word choice, the exact word, the precision of the vocabulary?                             | Ideia and Engenho (see the test below)                                                    |
| `imagem`        | Imagem        | Is there a scene that stayed in your head afterwards?                                              |                                                                                           |
| `ideia`         | Ideia         | Did the reasoning, what the text thinks, get you?                                                  | Palavra and Engenho (see the test below)                                                  |
| `voz`           | Voz           | Was it who is speaking: the personality, the intimacy of the voice?                                |                                                                                           |
| `atmosfera`     | Atmosfera     | Was it the mood the text creates (melancholy, calm, tension)?                                      |                                                                                           |
| `surpresa`      | Surpresa      | Was there a turn, an ending, an expectation broken?                                                | Originalidade: Surpresa is local (a turn), Originalidade is the whole conception          |
| `graca`         | Graça         | Did it amuse or charm you by lightness: humor, the graceful, a delicate touch?                     | Covers both senses on purpose: humor and the graceful. Ask which, if it matters           |
| `identificacao` | Identificação | Did you see yourself there?                                                                        | Comoção                                                                                   |
| `comocao`       | Comoção       | Did it move you even though you did not see yourself in it?                                        | Identificação                                                                             |
| `construcao`    | Construção    | Is the text well put together: the economy, the strength of the composition?                       | Engenho                                                                                   |
| `engenho`       | Engenho       | A precise formulation, a compression, a well-played trick, an unexpected link made while saying?   | Palavra and Ideia (see the test below); Construção is about the whole, Engenho the phrase |
| `originalidade` | Originalidade | A way of seeing, shaping or saying that you had not seen before? Does it survive a second reading? | Surpresa                                                                                  |

**Test to separate Palavra, Ideia and Engenho** (offer it only if the person hesitates, and as a tool they may use or not): if the charm survives a paraphrase in plain words, it was in the **Ideia**; if it breaks when one word is swapped for a close synonym, it was **Palavra**; if it breaks when the sentence is rewritten in direct order with the right words kept, it was **Engenho**.

### Step 3: the level of each marked item

The three levels answer "in what way did it get you?", so they describe the reading experience, not the item's role in the text.

| Id       | Label    | Meaning in the app                                             |
| -------- | -------- | -------------------------------------------------------------- |
| `leve`   | Pontual  | Got you in a moment or a detail, without taking the whole text |
| `forte`  | Marcante | Stayed with you after reading                                  |
| `centro` | Central  | It was what got you most in this text                          |

Ask once per marked item. Then ask which one, if any, was the **Central** one. The app does not limit how many items are Central; if the person marks several, ask once whether they are all really what got them most, and let the answer stand. The ids `leve`, `forte` and `centro` are what is stored, and the labels are what the screen shows. Count them as 1, 2 and 3 only if the person asks how the Estatísticas use them.

### Step 4: "O que incomodou" (12 items, no level)

Ask "Did anything bother you?" first. A text with nothing marked here is normal: leave it empty. Then, only if the person mentions a bother, confirm with the matching item.

| Id                 | Label            | Question to ask                                                                       | Note                                                                                            |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `cliche`           | Clichê           | Was there an image or expression that felt worn out?                                  |                                                                                                 |
| `previsivel`       | Previsível       | Could you see the ending from far away?                                               |                                                                                                 |
| `explica_demais`   | Explica demais   | Does it say what the image had already said?                                          |                                                                                                 |
| `obscuro_demais`   | Obscuro demais   | Was it closed, with no way in?                                                        |                                                                                                 |
| `forcado`          | Forçado          | Did a rhyme, an emotion or an effect feel pushed?                                     |                                                                                                 |
| `impreciso`        | Impreciso        | Was a word vague or loose?                                                            | The opposite of Palavra                                                                         |
| `frouxo`           | Frouxo           | Was the composition without tension, with slack?                                      | Not the same as Cansativo: Frouxo is about the composition, Cansativo about the effect on you   |
| `cansativo`        | Cansativo        | Did reading it wear you out?                                                          | See the note on length below                                                                    |
| `superficial`      | Superficial      | Does it stay on the surface?                                                          |                                                                                                 |
| `idealizado`       | Idealizado       | Does it beautify or romanticize, following the expected view instead of the critique? |                                                                                                 |
| `problematico`     | Problemático     | Does it offend, reproduce violence, or use framing and terms that do not hold up?     | The person's own judgment. Not the same as the `conteudoSensivel` field (a warning for readers) |
| `pouco_trabalhado` | Pouco trabalhado | Did the idea ask for more development?                                                | Mark only when the simplicity was a waste, not when it was a choice                             |

There is no "too long" and no "too short" on purpose: length is a measure, what matters is the effect. If length bothered the person, ask what it did to the reading (it wore them out, it left slack) and use the item that names that.

### Step 5: "Releria?" and "Mostraria a alguém?"

Two questions, each answered `sim`, `talvez` or `nao`, or left blank: "Would you read it again?" and "Would you show it to someone?". Do not ask to whom. They are about wanting, not about quality.

### Step 6: the hearts

The app suggests hearts with a visible rule, and the person decides. The rule is a sum from 0 to 5, with a minimum of 0.5:

| Part                                  | Points                                              |
| ------------------------------------- | --------------------------------------------------- |
| Releria?                              | `sim` 2, `talvez` 1, `nao` 0                        |
| Mostraria a alguém?                   | `sim` 1, `talvez` 0.5, `nao` 0                      |
| Highest level among the "pegou" items | `centro` 2, `forte` 1, `leve` 0.5, nothing marked 0 |

The suggestion only appears when both "Releria?" and "Mostraria a alguém?" are answered. "O que incomodou" does not enter the sum. You may explain this rule, or show what the app will suggest, but call it **the app's suggestion**, never "the right value".

The person picks the hearts (0.5 to 5, steps of 0.5). Three things to say once, plainly:

- **The chosen value is the text's Classificação** (`autoclassificacao`) and counts in the reading draw: "Só os meus preferidos" means 4 hearts or more. If the text already has hearts, the tab asks before replacing them.
- **Finishing without choosing hearts changes nothing.** Never propose 0, and never write 0 for "no opinion".
- **A different value from the suggestion is welcome.** The app keeps both (`sugerido` and `escolhido`) and the Estatísticas list the divergences, because they show what the form does not name yet. If the person picks something else, ask in one sentence what the form missed. Do not push them toward the suggestion, and do not squeeze their answer into the nearest item.

### Step 7: the Avaliação line

The free line is the text's `autoavaliacao` field, shown as "Avaliação" in the modals. There is **one per text, not one per reading**: in a second reading the person writes over it or adds to it. If you draft it, build it only from what the person said, short, in their voice, and present it as a draft to edit.

## What the app does with the readings

So you do not promise more than it does:

- **The tab's list** filters by Tipo, Leitura, Classificação, "Pegou:", "Incomodou:", "Releria:" and "Mostraria:". Each filter looks only at the latest reading of each text.
- **Search in Poemas and Prosas** accepts the prefixes `pegou:`, `incomodou:`, `releria:` and `mostraria:` (with `*` for "has something" and `-` to invert). Same rule: latest reading only.
- **Estatísticas, "Leituras"** has two views. "Padrão" splits the read texts into three bands by the text's current Classificação (0.5 to 2, 2.5 to 3.5 and 4 to 5) and shows what weighs more in the texts the person loves than in the ones they love least. "Cruzamento com etiquetas" crosses the items with the clusters of Tom, Estilo, Domínio Imagético or Tradição. Each text counts once, by its latest reading, and each translation counts as its own text.
- **The pattern needs many readings.** With one or two readings there is nothing to conclude; do not draw conclusions about the person's taste from a single interview. The app itself warns when there are few texts.

## Delivering the result

There are two cases, and they differ:

1. **A text that is already in the archive.** There is no import for readings of existing texts ("Importar campos" does not carry them). Give the person a plain summary to enter in the tab: the marked items with their level, the bothered items, the two answers, the hearts (if chosen) and the Avaliação line. Never present it as already saved.
2. **Texts being brought in through the Importação Aditiva.** The importer reads a `leituras` list inside each text item and creates the readings together with the new text. It gives each reading a new `id` and the `textoId` and `tipo` of the created text, so do not write those. A reading with an invalid `data` (it must be `AAAA-MM-DD`) is dropped without a warning, items or levels the app does not know are removed, and a reading that cannot be validated is ignored. Fill `escolhido` only if the person chose hearts.

```json
"leituras": [
    {
        "data": "2026-11-01",
        "pegou": [{ "item": "voz", "peso": "centro" }],
        "incomodou": [],
        "releria": "sim",
        "mostraria": "talvez"
    }
]
```

`autoclassificacao` and `autoavaliacao` are fields of the text, not of the reading; see `campos-poema-prosa-for-ai.md`. The downloads (`.json`, `.md`, `.pdf` and `.docx`) carry the readings only when the "Leituras" box is checked, which is off by default, and the "Ver" view always shows them.

## Quick checklist

- Open question first, items after, one at a time, in the person's words.
- Never mark, weigh or score anything the person did not say. Blank is valid.
- Levels are Pontual (`leve`), Marcante (`forte`) and Central (`centro`), asked per marked item.
- "O que incomodou" has no level, and there is no "too long" or "too short".
- The hearts are the person's. The suggestion is the app's, and a difference between the two is useful.
- Never 0 hearts. Finishing without hearts changes nothing.
- The Avaliação line is one per text, built only from the person's words.
- Existing texts: give a summary to type in. New texts through the Importação Aditiva: a `leituras` list, without `id`, `textoId` and `tipo`.
- Use the app's ids exactly: `explica_demais`, `obscuro_demais`, `pouco_trabalhado`, `problematico`, and the others in the tables above.
