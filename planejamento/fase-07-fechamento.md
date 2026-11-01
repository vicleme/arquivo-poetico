# Fase 7: Fechamento

Documentação de Movimento/Escola, `status.md` defasado, teste com rede. Sem dependência.

Movido do `plano-central.md` em 20/10/2026, sem reescrever. O painel guarda só a linha da fase.

**Estado conferido em 27/10/2026: itens 1 a 3 já feitos, só falta o 4.** (1) Movimento/Escola está documentado em `schema.md` e `decisoes.md`. (2) O `status.md` não diz mais que o pacote de Cruz e Sousa "ainda não foi construído" (o pacote existe em `biblioteca/`). (3) O `eslint` não aponta mais `no-unreachable` em `tests/importar-aditivo.test.js`. (4) Rodar com rede: `eslint .` e `prettier --check .` rodaram em 27/10/2026 e ficaram limpos (depois de corrigir as pendências da T9); o `npm test` completo fica por conta do Victor. Quando isso estiver limpo, a fase vira linha em `plano-concluido.md`. A lista abaixo é o pedido original, não o que falta.

- Documentar Movimento/Escola em `manutencao/` (`schema.md`, `decisoes.md`, `status.md`): schema, CRUD, coluna, busca, exportação, importação, ordenação.
- Corrigir trechos defasados do `status.md` (por exemplo, diz que Cruz e Sousa "ainda não foi construído", mas o pacote existe).
- Conferir uma possível pendência antiga de lint em `tests/importar-aditivo.test.js` (`no-unreachable`).
- Rodar com rede: `npm install && npm test && npx eslint . && npx prettier --check .`.
