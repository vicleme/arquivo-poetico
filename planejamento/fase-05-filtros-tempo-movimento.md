# Fase 5: filtros de tempo e movimento

Filtros de tempo e movimento, faixas e matriz Temas × Movimento. Depende das Fases 1 e 4b.

Movido do `plano-central.md` em 20/10/2026, sem reescrever. O painel guarda só a linha da fase.

- **Leva 1:** filtros de Movimento/Escola e Período Histórico no painel compartilhado, num só ponto (`textoEntraNoFiltroEstatisticas`, `js/estatisticas-filtros.js`). Leituras 1 (escrito durante o período) e 3 (autor pertence ao movimento).
- **Leva 2:** faixas sombreadas no gráfico ao longo do tempo (plugin pequeno do Chart.js, feito à mão) e a matriz **Temas × Movimento/Período**, que mora na aba de matrizes ("Cruzamentos"). Relacionada: a **Fase 18** desenha a faixa de períodos embaixo do eixo de anos; o cálculo de quais períodos cobrem quais anos é um módulo só, compartilhado entre as duas.
- O rótulo da tela deve dizer "no acervo", porque descreve o acervo e não a época.
- Os textos do Victor são sempre "Literatura Contemporânea" (decisão dele, 01/10/2026); não há o que diferenciar neles. O movimento só varia nos textos que vêm da Biblioteca ou de fora do acervo, então a matriz depende de a Fase 4b trazer Movimento/Escola e Período Histórico preenchidos nesses pacotes. A comparação útil é acervo próprio (contemporâneo) contra os movimentos dos autores importados.

## Decisões em aberto

| Código | Pergunta                                        | Sugestão                                          | Bloqueia |
| ------ | ----------------------------------------------- | ------------------------------------------------- | -------- |
| F5-D1  | Qual leitura de tempo primeiro                  | 1 e 3                                             | Fase 5   |
| F5-D2  | Filtros globais ou só em um grupo de abas       | Globais, pela arquitetura                         | Fase 5   |
| F5-D3  | Escolher um ou vários movimentos ao mesmo tempo | em aberto                                         | Fase 5   |
| F5-D4  | Matriz Temas × Movimento na primeira leva       | Não: duas levas (filtros, depois faixas e matriz) | Fase 5   |
