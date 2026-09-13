# Tags (Sinalizações): how to interpret this field

This document doesn't ask for any task — it explains the logic behind the
archive's tags (called "Sinalizações" — Flags/Signalings — in the
interface), so that an AI receiving exported data reads each tag under the
right category, without mixing up what each one means.

---

## What the field is (and isn't)

There is no single "tags" field. "Sinalizações" is the name of the
**group**, but behind it there are **8 independent fields**, one per
category, each a list of tags in **free text** (not a closed list of
pre-defined options — whoever catalogs types the tag they want, with
autocomplete suggesting whatever has already been used in that same
category, to avoid variants of the same idea).

Each of these 8 fields is, in fact, a **list** — it accepts as many tags
as make sense for the text, not a single value per category. This matters
for a recurring decision: when a text carries two things perceived at
once (two traditions, two themes, two Tone impressions), the default is
to record each as its own tag in the list — not merge the two into one
composite label. It's only worth merging into a single label when the
combination is itself an indivisible feeling or idea, one that isn't the
sum of its parts — in Tone, for example, "Very saccharine" isn't
"romantic" + "intense" happening in parallel, it's a reading texture of
its own, so it works as a single tag. Outside that case (e.g., a poem
that is melancholic *and*, in a different passage, hopeful — two real but
distinct impressions, not one single thing), separate tags keep the list
more useful for filtering and cross-referencing later.

The 8 fields, in the order they appear in the editor:

| Field (key)                    | Label              |
| ------------------------------- | ------------------- |
| `sinalizacoesTradicao`          | Tradição (Tradition) |
| `sinalizacoesEstilo`            | Estilo (Style)        |
| `sinalizacoesTema`              | Tema (Theme)           |
| `sinalizacoesRelacao`           | Relação (Relation)    |
| `sinalizacoesSensibilidade`     | Sensibilidade (Sensitivity) |
| `sinalizacoesTom`               | Tom (Tone)             |
| `sinalizacoesDominioImagetico`  | Domínio Imagético (Imagery Domain) |
| `sinalizacoesOutros`            | Outros (Other)          |

A "flat" export combines everything into a single string
(`sinalizacoesCombinadas`) for general search and simple statistics — but
that combined version **loses each tag's category**. Whenever a task
depends on knowing which category a tag belongs to (e.g., "what are the
most common themes" vs. "what are the most common style devices"), use
the 8 separate fields, not the combined string.

## What each category means

- **Tradição (Tradition)**: poetic forms or schools inherited from a
  tradition — e.g., sonnet, haiku, cordel (Brazilian narrative
  verse-ballad). It's about form coming from outside, not a device the
  text itself invents (that's Style).
- **Estilo (Style)**: a specific formal or stylistic device of the text —
  typographic play, verse-construction techniques, figures of speech
  named in the archive's own terms (e.g., "Rotação tipográfica"
  /"Typographic rotation" for a passage that only reads right-side-up
  when read upside down, "Paronomásia por espaçamento" /"Paronomasia by
  spacing" for a space that isolates a shared root between two words). It
  tends to name the technique, not the effect.
- **Tema (Theme)**: the central subject or content of the text (e.g.,
  "Brazil"). When reviewing tag consistency, the criterion already adopted
  in the archive is to name the **concrete cause**, not the emotional
  effect — a tag like "Cyclical existential crisis" is vaguer than naming
  the concrete event or situation that produces that feeling.
- **Relação (Relation)**: names a specific relationship or bond portrayed
  in the text — it can be the name of a dynamic between two specific
  people (the archive already uses tags of this kind, coined by the
  author to name a pair of people and their relationship). This is
  different from People + Roles (which links the text to a registered
  person with a closed-list role, see the other document) — Relation is a
  free-text tag about the nature of the bond itself, not a structured link
  with a `pessoaId`.
- **Sensibilidade (Sensitivity)**: loose tags about categorizable
  sensitive content (e.g., "Obscene language"). Careful: this is
  **different** from the `conteudoSensivel` field, which is a separate
  descriptive paragraph about sensitive content — "Sensitive content" is
  no longer a tag inside this category; it's now **derived** from the
  mere presence (non-empty) of that other field. Don't expect to see a
  literal "Conteúdo sensível" tag inside Sensitivity in current archive
  data.
- **Tom (Tone)**: the emotional register or attitude perceived in the
  text (e.g., "Very saccharine"). This is a reading judgment/tone, not a
  formal device (that would be Style) nor a type of sensitive content.
- **Domínio Imagético (Imagery Domain)** *(full label: "Domínio Imagético
  (repertório)" — "Imagery Domain (repertoire)")*: vocabulary or imagery
  the text borrows from an entire knowledge domain — e.g., "Astrology,"
  when the poem uses terms like Venus/Transits as a general register,
  without citing one specific work. The important distinction is with
  **Intertextuality** (see the document on the Transtextuality and
  External References group): Imagery Domain is repertoire/vocabulary
  borrowed from a field of knowledge; Intertextuality is dialogue with
  **one specific, nameable external artifact** (a particular song, a
  particular book). A poem that cites astrology in a generic way uses
  Imagery Domain; a poem that cites a specific, identifiable astrological
  report would use Intertextuality instead.
- **Outros (Other)**: a temporary bucket for migrated tags that haven't
  earned their own category in the schema yet (today, for example,
  recognitions and translations/variations, which are expected to migrate
  later into structured Links and Recognitions fields). It is not a 9th
  category with a settled meaning of its own — it's temporary visibility
  until those tags become proper fields. When interpreting it, don't
  assume tags here share any common meaning beyond "doesn't have a proper
  place yet."

## What this means in practice for an AI reading the data

1. Always read a tag together with the category (field) it's in — the
   same tag text could, in principle, appear in different categories with
   different meanings; the category is what resolves the ambiguity.
2. Don't treat a category's tag list as closed/enumerated — the values are
   free text, so an unfamiliar or unseen-before tag isn't an error, it's
   just a new tag.
3. When suggesting new tags, prefer reusing one already used in the same
   category (avoid variants of the same idea), and name the concrete
   cause rather than the emotional effect, following the criterion already
   adopted in the archive for Theme.
4. Don't confuse Sensitivity (a categorizable tag) with the derived
   "sensitive content" flag (presence of a paragraph in
   `conteudoSensivel`) — they are different things that shouldn't be
   merged or treated as synonyms.
5. Each field is a list (multiple values per text): as a rule, record
   distinct aspects or impressions as separate tags in the same list.
   Only propose a composite/merged tag when the combination is itself an
   indivisible idea that doesn't reduce to the sum of its parts — when in
   doubt, prefer keeping them separate.
