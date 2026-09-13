# People and Roles: how to interpret this field

This document doesn't ask for any task — it explains the logic behind one
field in the archive, so that an AI receiving exported data (or reading
the code itself) can correctly interpret the `pessoas` (People) field on
Poems and Prose pieces, without inferring things the schema deliberately
leaves unstated.

---

## What the field is

`pessoas` is a list of **links** between the text and people registered in
the archive's central registry (`db.pessoas`, each `{ id, nome,
grupoIds }`). It's not a loose string of names — each entry points to a
person registered exactly once, whose name and groups live only in the
registry, not repeated on every poem.

Structure of each entry:

```json
{ "pessoaId": 7, "papeis": ["Retratado(a)", "Dedicatário(a)"] }
```

- **`pessoaId`**: reference into the central registry. It's "who" the
  person is.
- **`papeis`** ("roles"): an array — zero, one, or several values — from a
  **closed** list of 6 options. It's "how" that person relates to **this**
  specific text.

## The 6 possible roles

- Retratado(a) — Portrayed
- Inspiração para — Inspiration for
- Dedicatário(a) — Dedicatee
- Mencionado(a) — Mentioned
- Aludido(a) — Alluded to
- Associado(a) retroativamente — Retroactively associated

The Portuguese spelling shown in exported data is exact — there are no
accepted synonyms or variants outside this list.

## Multiple roles, and what the order can mean

The same person can accumulate several roles on the same text at once —
this is common, not an exception. A poem of direct address often has the
same person marked as Portrayed, Inspiration for, and Dedicatee all at
the same time.

The order of values in the array reflects the order they were checked in
the editor — and this is deliberate, not an interface side effect: the
system preserves selection order instead of auto-sorting (e.g.,
alphabetically) precisely to leave open the possibility, for whoever is
cataloging, of using that order as a criterion for the **relevance/
importance of that role to that person, in that specific text**. It is
not a fixed hierarchy across categories (the same role can come first on
one poem and later on another), and using the order that way is optional
— whoever catalogs can simply check roles without worrying about
sequence. But when the order IS used this way, it's real data, not
noise.

Because of this, when **commenting on, summarizing, or evaluating**
someone's roles, the expected behavior is: treat the order as a valid
signal of relative relevance (the first role listed tends to be the
strongest for that link, in that text), and when a task calls for that
kind of evaluation, actively suggest an ordering by relevance — don't
treat the roles as an unordered set or assume the order is arbitrary.

## `papeis: []` is a valid value — and it means something

This is the easiest point to get wrong. A person can be linked to the
text with an **empty** roles array. This is not a forgotten field or an
absence of information to ignore: it's the deliberate state of "this
person is tied to this text, but whoever is cataloging hasn't categorized
their role — or decided it doesn't fit the 6 closed options, or prefers
not to specify." The interface shows this as an italic "sem papel" (no
role) label next to the name, never hiding the person.

Practical rules for an AI reading this field:

- **Never invent a role** that isn't in the array, even if the text's
  content seems to suggest an obvious one (e.g., a poem clearly dedicated
  to someone, but without "Dedicatário(a)" checked — this means that
  categorization simply wasn't made, not that the AI should fill it in on
  its own).
- **Never treat `papeis: []` as equivalent to "person not linked"** — the
  person is linked; only the role is left open. Dropping the person from
  an analysis because the array is empty discards real information.
- If a task asks to comment on someone's roles and the array is empty, it
  is valid (and more honest) to say explicitly that the link exists
  without a categorized role, rather than simply skipping the person.

## How this differs from similar-looking fields

- **Authorship** (`autoria`, a separate field): the link for who wrote the
  text, `{ autorId, papel }` — here `papel` is a **single value** (not an
  array) from its own, smaller closed list: `Autor` (Author) or `Coautor`
  (Co-author). It resolves against `db.autores`, a different central
  registry from `db.pessoas` — even when the same real-life person appears
  in both registries, they are distinct records. Authorship does not
  accumulate roles; a person registered as Author cannot also be marked
  Co-author on the same text.
- **Groups** (`grupoIds`, on the Person's registry entry, not on the poem):
  a fixed characteristic of the person — which groups they belong to —
  independent of the text. It doesn't vary poem to poem, unlike `papeis`,
  which is this specific text's link to that person.
- **"Public figure" under External References**: one of the suggested
  types in the `referenciasExternas` field (see the document on the
  Transtextuality and External References group) is free text, with no
  `pessoaId` — used when someone is cited as a real-world reference point
  (e.g., a public figure mentioned in passing), not as a formally
  registered person with a role-link to the text. If the person is in the
  central registry and has a recognizable role, the right place is
  `pessoas`, not `referenciasExternas`.

## Practical summary

When processing or commenting on the `pessoas` field of an exported item:

1. Resolve `pessoaId` against the central registry to get the name (and,
   if relevant, the person's groups).
2. Read `papeis` as a set of cumulative descriptions of the link, in the
   order they appear — that order can (optionally) reflect the relevance
   of each role to that person, in that text; if a task asks for an
   importance assessment, suggest an ordering by relevance instead of
   treating the roles as an unordered set.
3. If `papeis` is empty, don't skip the person or assume a role — report
   the link as it is: present, with no role specified.
4. Don't confuse this with Authorship (single role, different registry)
   or with Groups (a fixed property of the person, not of the text).
