# The reading draw: what it reads and how to suggest the fields it uses

This document doesn't ask for any task. It explains how the "Sortear leitura" page (under Ferramentas) chooses and shows a text, so that an AI that receives the texts (or the registry) suggests the fields that page depends on the way the app expects. The field-by-field map is in `campos-poema-prosa-for-ai.md` and the import format is in `importar-campos-for-ai.md`; this document covers the criteria.

---

## What the page does

A reader asks "what do you want to read today?", picks (or not) an invitation from the Vitrine de leitura, an extension and "only the author's favorites", and the page draws **one text** from the author's archive. It reads the archive of the browser it is opened in and writes nothing to it, except the list of recent draws and where the text's card goes.

## Who can be drawn

A text enters the draw only if **all** of this is true:

1. `sorteavel` is `true` (the "Pode ser sorteado para leitura" box). The author marks it by hand. **Never set it on your own**: offer it as a suggestion for the author to review.
2. `status` is not `descartado` or `privado`, even when marked. `incompleto`, `completo`, `publicado` and `migrado` all enter.
3. The text has a body (`texto` not empty).
4. `leituraAutonoma` is not `sequencia` or `conjunto` (see below).

## Translations (Elo de tradução)

A text and its translation are two versions of the same work, so the draw counts them as **one text**: the work has a single chance, never two. Only an Elo whose `relacao` is `Tradução` groups texts (Reescrita, Versão, Variação and the others stay separate texts). The link counts in both directions even when only one side registered the Elo, and a chain (A translated into B, B into C) is one group. The grouping happens after the reader's criteria, among the versions that passed them; when more than one version passes, the draw picks one of them at random. A work is also avoided as a whole when any of its versions was drawn recently.

The page shows, under the title, a box "Este texto tem outra(s) versão(ões) (Elo de tradução)" with a link to each other version ("Tradução de" or "Traduzido para"). Clicking opens that version in place (it counts as read and enters the recent list). Only versions that could be drawn are offered (marked `sorteavel`, status other than `descartado` and `privado`, with a body, reading on their own), and, when the reader excluded sensitive content, none with Conteúdo sensível. The reader can also pick an **idioma de preferência** (kept in the browser; the field only appears when some work has a drawable translation). It never removes a text from the draw: it only decides which version of a work shows up (the one whose Principal language matches, then one with a matching Secundário language, otherwise at random). It reads `idiomas` (see `campos-poema-prosa-for-ai.md`), so **fill in the language of both the original and the translation** for the preference to work. Each link also shows the version's Principal language. **For suggestions:** to have a translation grouped, register an Elo with `relacao` `Tradução` between the two texts; do not mark the translation as drawable unless the author wants it offered as a link.

## Autonomous reading (`leituraAutonoma`)

Says whether the text makes sense when a stranger reads it alone. It is a different question from Elos and Ecos, which only connect texts to each other.

| Value          | Meaning                                                             | In the draw                                                          |
| -------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `""` or absent | reads on its own (the default)                                      | can be drawn                                                         |
| `sequencia`    | only in sequence: depends on the texts that come before or after    | never drawn                                                          |
| `conjunto`     | only as a set: needs the other texts together                       | never drawn                                                          |
| `inicio`       | only as a starting point: it is the first text of a sequence or set | **can be drawn**, shown with the mark "só o começo" next to the type |

`inicio` exists for one case: presenting the beginning of something to a reader, who then knows there is more. Incompleto, Díptico and Resposta do **not** set this field: the author decides case by case, and a text can be a Díptico part and still read alone.

How to suggest it: only when the text, read cold, leaves the reader lost (it answers an unseen text, continues a sentence, depends on a refrain set up elsewhere). Say which texts it depends on. Never fill it just because a text is part of a Livro or a Coletânea: most texts there read alone. When unsure, leave it empty and say why.

## "Em construção"

A text with `status: "incompleto"` is still drawn, and the page shows `em construção` next to the type (`Poema · 14 versos · em construção`) before the text. The author may want readers' opinion on something unfinished, so the draw doesn't hide it.

## Criteria the reader chooses

All optional, combined with AND:

- **Invitation** ("Sobre o que você quer ler?"): the text has some Theme that belongs to that invitation of the Vitrine de leitura (any Theme role). The text stores no invitation, only Themes. See `temas-assuntos-for-ai.md`.
- **Extension**: fixed scale, equal for every archive. Poem is measured in verses, prose in words. Breve: up to 4 verses or 300 words. Curto: 5 to 14 verses or 301 to 1,000 words. Médio: 15 to 40 or 1,001 to 7,500. Longo: 41 to 100 or 7,501 to 17,500. Extenso: above that.
- **Only the author's favorites**: `autoclassificacao` of 4 hearts or more. 0 ("not evaluated") never counts.
- **Only the recognized** ("Só os reconhecidos (com prêmio ou menção)"): the text has at least one entry in `reconhecimentos` with `premio` or `posicao` filled in. Prize and honorable mention live in the same field (e.g. `posicao` "Menção honrosa"); an entry with only a year or a note does not count. Unchecked by default, and not kept between visits. **For suggestions:** fill in `premio` or `posicao` for every recognition, or the text will not count.
- **Text weight**: four checkboxes (Leve, Neutro ou ambivalente, Pesado and Sem valência), none checked by default, combined by OR among themselves and by AND with the other criteria. A text's weight is the author's `valenciaAjuste` when filled in, and otherwise the valence computed from the text's Temas (the same index as the Estatísticas: desagradáveis minus agradáveis, over agradáveis, neutros and desagradáveis; up to -1/3 is light, from +1/3 is heavy; ambivalent Temas stay out of the count). A text **without valence** (no classified Tema and no adjustment) is only drawn when "Sem valência" is one of the checked boxes; with only weight boxes checked it is left out. The text's valence is never stored. When suggesting, classify the valence of the **Temas** (it feeds the weight of many texts at once); suggest `valenciaAjuste` only when the text weighs differently from its Temas. See `campos-poema-prosa-for-ai.md`.
- **Sensitive content**: one checkbox, checked by default ("Incluir textos com conteúdo sensível"). Unchecked, a text with `conteudoSensivel` filled in is not drawn and is not counted; checked, it is drawn with the warning shown before the text. The choice is remembered in the reader's browser. Only the `conteudoSensivel` field (free text) counts as sensitive: a text without it is drawn regardless, so when you suggest a delicate text, suggest filling that field, describing what is there (not quoting the passage).

The page avoids repeating the last draws (half of the possible texts, at most 10), so it never runs out of texts.

## Secrecy of the author's name: three levels

The author's civil name is kept out of the reader's page when **any** of these asks for it. No level frees what another hid:

| Level         | Where                                                       | Field                           | Effect                                                                                                            |
| ------------- | ----------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Author        | Author modal, "Autor sigiloso"                              | `sigiloso` (Author)             | applies to all texts of the author                                                                                |
| Literary name | Author modal, "Anonimizar autor" in each literary name chip | `anonimizar` (in the name item) | applies to texts signed with that name                                                                            |
| Text          | Poem/Prose modal, "Autor em sigilo"                         | `autorEmSigilo` (text)          | applies to that text, and also hides the civil names of its authors in the credits of "Obras citadas e adaptadas" |

The effect is always the same. Text signed with a **literary name** (heteronym or pseudonym): the Authorship line shows only that name, without "pseudônimo de X". Text signed with the **civil name**: the author is left out of the line, and the line disappears if nobody is left. "Sigiloso" is what the Author is; "em sigilo" is what the author is in that text.

The `.md`, `.csv`, `.json` and the "Ver" view belong to the author, so they keep the real name. Only the reader's page applies the secrecy.

How to suggest: never set `sigiloso`, `anonimizar` or `autorEmSigilo` on your own. If a text is signed with a pseudonym and no level is on, you may point out that the reader's page will show "pseudônimo de" followed by the civil name, and ask whether that is intended.

## What the reader sees besides the body

After the text: the author's **Comentários ao leitor** and the **Notas** marked as public; then the **Paratexto** block (Descrição Visual, Anotações Marginais, Anexos, the note about the set of attachments, "Obras citadas e adaptadas" and Reconhecimentos); then the **card** of the text (Localização, Coletâneas, Idioma, Gênero, Status, first publication, Authorship; plus Fonte and Edição when the text is not the author's own work). With `conteudoSensivel`, the warning comes first and the rest waits for "Ler mesmo assim".

**Never shown**: the hyperactivating vocabulary (it quotes the text and would give it away), Elos, Ecos, Referências, Alusão and Menção, Inspiração, Ocultação, private Notas, the writing date, and any Intertextualidade entry marked as personal work. Notes and comments are written for the reader: if you draft them, keep that in mind.

## Quick checklist for suggestions

- Want a text in the draw? Suggest `sorteavel`, never set it.
- Text depends on others? Suggest `leituraAutonoma` with the reason; first text of a sequence is `inicio`.
- Want the text weight to work in the draw? Classify the Temas' valence; suggest `valenciaAjuste` only when the text weighs differently from them.
- Pseudonymous author? Ask about secrecy before assuming either way.
- Use the app's field names and values exactly as written above.
