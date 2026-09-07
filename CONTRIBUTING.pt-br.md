# Contribuindo

Este é um projeto pessoal, mas segue uma convenção fixa pra mensagens de commit.

## Mensagens de commit

- **Formato:** [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).
- **Idioma:** sempre em inglês, independente do idioma dos comentários no código ou do `README.pt-br.md`.

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé(s) opcional(is)]
```

**Tipos usados neste projeto:**

| Tipo       | Use para                                                          |
| ---------- | ------------------------------------------------------------------ |
| `feat`     | um campo, tela ou capacidade nova pro usuário                     |
| `fix`      | correção de bug                                                    |
| `refactor` | reestruturação interna sem mudança de comportamento                |
| `docs`     | mudanças em `README*.md`, `manutencao/*.md` ou comentários no código |
| `test`     | adicionar/ajustar testes, sem mudar código de produção             |
| `style`    | formatação, espaçamento, correções de Prettier/ESLint              |
| `chore`    | ferramentas, dependências, config, scripts de build                |
| `perf`     | melhorias de performance                                           |

**Breaking changes** (mudanças de schema/formato de dado que exigem migração): adicionar `!` depois do tipo/escopo, ex. `feat(pessoas)!: add sixth PAPEIS_PESSOA value`, e explicar a migração no corpo ou num rodapé `BREAKING CHANGE:`.

**Escopo** (opcional) é a área afetada, ex. `feat(epocas): ...`, `fix(exportar-md): ...`, `refactor(db): ...`.

### Exemplos

```
feat(pessoas): add "Associado(a) retroativamente" role

fix(exportar-md): keep 🔒 privado items under "todos os status" filter

refactor(utils): rename iniciaisPapeisPessoa to 2-letter codes

docs(schema): document elos vs referencias distinction

test(db): cover merge conflict on duplicate Pessoa name
```

> As mensagens de commit em si ficam em inglês (ver acima) — este arquivo só documenta a convenção em português, pra quem ler o projeto por aqui.
