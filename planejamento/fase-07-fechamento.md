# Fase 7: Fechamento

Documentação de Movimento/Escola, `status.md` defasado, teste com rede. Sem dependência.

Movido do `plano-central.md` em 20/10/2026, sem reescrever. O painel guarda só a linha da fase.

- Documentar Movimento/Escola em `manutencao/` (`schema.md`, `decisoes.md`, `status.md`): schema, CRUD, coluna, busca, exportação, importação, ordenação.
- Corrigir trechos defasados do `status.md` (por exemplo, diz que Cruz e Sousa "ainda não foi construído", mas o pacote existe).
- Conferir uma possível pendência antiga de lint em `tests/importar-aditivo.test.js` (`no-unreachable`).
- Rodar com rede: `npm install && npm test && npx eslint . && npx prettier --check .`.
