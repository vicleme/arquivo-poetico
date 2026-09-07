# Contributing

This is a personal project, but it follows a fixed convention for commit messages.

## Commit messages

- **Format:** [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
- **Language:** always English, regardless of the language of the code comments or of `README.pt-br.md`.

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types used in this project:**

| Type       | Use for                                                        |
| ---------- | --------------------------------------------------------------- |
| `feat`     | a new field, screen, or user-facing capability                  |
| `fix`      | a bug fix                                                        |
| `refactor` | internal restructuring with no behavior change                  |
| `docs`     | changes to `README*.md`, `manutencao/*.md`, or code comments    |
| `test`     | adding or adjusting tests, no production code change             |
| `style`    | formatting, whitespace, Prettier/ESLint fixes                   |
| `chore`    | tooling, dependencies, config, build scripts                    |
| `perf`     | performance improvements                                        |

**Breaking changes** (schema/data format changes that require migration): add `!` after the type/scope, e.g. `feat(pessoas)!: add sixth PAPEIS_PESSOA value`, and explain the migration in the body or a `BREAKING CHANGE:` footer.

**Scope** (optional) is the affected area, e.g. `feat(epocas): ...`, `fix(exportar-md): ...`, `refactor(db): ...`.

### Examples

```
feat(pessoas): add "Associado(a) retroativamente" role

fix(exportar-md): keep 🔒 privado items under "todos os status" filter

refactor(utils): rename iniciaisPapeisPessoa to 2-letter codes

docs(schema): document elos vs referencias distinction

test(db): cover merge conflict on duplicate Pessoa name
```
