# Status atual — Acervo Poético

> Checklist curto. Schema atual: `schema.md`. Porquês: `decisoes.md`. Riscos de retomada: `licoes-de-sessao.md`.

## Fechado

- Os 10 itens do plano original de reestruturação de schema.
- Cadastro central de Pessoas/Grupos/Autores.
- Épocas como cadastro próprio.
- Mesclar Pessoas / Mesclar Épocas (com checagem de nome duplicado ao salvar).
- Grupos — referência direta (`gruposDiretos`).
- Status "Privado" (🔒).

## Em aberto

Nenhum item de schema pendente no momento.

## Pendências de teste manual (sem cobertura automatizada — padrão do projeto pra motores de DOM/formulário)

- Fluxo dos dois botões de direção de Elo.
- Autocomplete de Época, select de recorte, aba de gestão de Épocas.
- Os grupos novos do modal de Prosa (Época, Livros, Elo, Referência, Anexos, Status/Pendências).
- Hover/clique dos dropdowns do menu de navegação, dropdown mobile, botão de baixar PNG (Conexões) nos dois temas.
- Criar Grupo novo inline no campo de referência direta; excluir Grupo referenciado diretamente e conferir o "Desfazer"; selecionar "🔒 Privado" e conferir badge/coluna/exportação.

## Suíte

`npm test`: 530/530 passando. ESLint: 1 erro pré-existente e sem relação em `exportar-pdf.js` (`no-control-regex`, linha do regex de emoji). Prettier: limpo.
