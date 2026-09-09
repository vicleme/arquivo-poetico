# Status atual — Acervo Poético

> Checklist curto. Schema atual: `schema.md`. Porquês: `decisoes.md`. Riscos de retomada: `licoes-de-sessao.md`.

## Fechado

- Os 10 itens do plano original de reestruturação de schema.
- Cadastro central de Pessoas/Grupos/Autores.
- Épocas como cadastro próprio.
- Mesclar Pessoas / Mesclar Épocas (com checagem de nome duplicado ao salvar).
- Grupos — referência direta (`gruposDiretos`).
- Status "Privado" (🔒).
- Reorganização "Elos, Referências e Intertextualidade" → "Intratextualidade" (Elos + Ecos) e "Intertextualidade e Referências" (Intertextualidade + Referências novo, campo `referenciasExternas`). Ver `decisoes.md` e `schema.md`.

## Em aberto

Nenhum item de schema pendente no momento.

## Pendências de teste manual (sem cobertura automatizada — padrão do projeto pra motores de DOM/formulário)

- Fluxo dos dois botões de direção de Elo.
- Autocomplete de Época, select de recorte, aba de gestão de Épocas.
- Os grupos novos do modal de Prosa (Época, Livros, Elo, Eco, Referência, Anexos, Status/Pendências).
- Hover/clique dos dropdowns do menu de navegação, dropdown mobile, botão de baixar PNG (Conexões) nos dois temas.
- Criar Grupo novo inline no campo de referência direta; excluir Grupo referenciado diretamente e conferir o "Desfazer"; selecionar "🔒 Privado" e conferir badge/coluna/exportação.
- Bloco novo de Referências (Poema e Prosa): adicionar/editar/cancelar/remover entrada, filtro de sugestão de texto por tipo, exportação/visualização agrupada por tipo.

## Suíte

`npm test`: 513/518 passando neste ambiente de retomada (sem `node_modules`, sem acesso à rede pra instalar). As 5 falhas são só `tests/exportar-seletiva-pdf.test.js`, `tests/render-conexoes.test.js`, `tests/render-dom.test.js`, `tests/sinalizacoes-consistencia.test.js` e `tests/editor.test.js` quebrando na importação de `happy-dom` (dependência não instalada) — não é regressão de código; com `node_modules` presente (ambiente normal), a expectativa é 518/518. ESLint/Prettier não rodados nesta retomada pela mesma razão (dependências ausentes).
