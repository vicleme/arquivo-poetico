# Última rodada da suíte (`npm test`)

> Este é o único lugar onde mora a data da última rodada completa da suíte. O Victor roda o `npm test` na máquina dele (cerca de 40 s) e avisa; o Claude não roda a suíte completa. Outros arquivos (`status.md`, `plano-central.md`, `tarefas-fora-de-fase.md`) não devem guardar "falta rodar o `npm test`" nem contagens: apontam para cá.

## Como manter

- Quando o Victor disser que rodou o `npm test`, o Claude atualiza a seção "Última rodada" (data, horário, resultado, contagem se vier) e **esvazia** "Entregas depois da última rodada".
- Toda entrega que mexe em código ou testes acrescenta uma linha em "Entregas depois da última rodada". Entrega só de documentos não precisa.
- O resultado anterior desce para o "Histórico" (mais recente primeiro; guardar umas 10 linhas).
- Se o Victor não informar horário ou contagem, escrever "não informado". Não inventar.

## Última rodada

- **Data:** 01/11/2026
- **Horário:** não informado
- **Resultado:** passou (sem falhas), depois do Baixar .pdf do sorteio
- **Contagem (`# pass` e `# fail`):** 9317 passam, 0 falham (2043 suítes, 0 cancelados, 0 pulados; 112 s)
- **Cobertura:** todas as entregas feitas até esta data, incluindo as que estavam em "Entregas depois da última rodada" (Baixar .md e Baixar .pdf do sorteio, com a extração do desenho do corpo para `js/pdf-corpo-rico.js`; filtro Poema ou prosa; correção do "<" solto; Ajuda legível; Fase 22 e Fase 23 só de documentos)

## Entregas depois da última rodada

(nenhuma)

## Histórico

| Data       | Horário       | Resultado    | Contagem              | Observação                                                         |
| ---------- | ------------- | ------------ | --------------------- | ------------------------------------------------------------------ |
| 31/10/2026 | 14h44         | passou       | 8567 passam, 0 falham | depois da lupa nas colunas Notas públicas e Sorteável              |
| 30/10/2026 | não informado | passou       | não informada         | depois da Fase 2, etapas 0 e 1 e Etapa 2 parte 1                   |
| 29/10/2026 | não informado | passou limpo | não informada         | depois do `npm audit fix --force` e do Mapa de calor das origens   |
| 28/10/2026 | não informado | passou limpo | não informada         | depois de Personagem em lista e Origem da obra, entregas 1 a 3     |
| 27/10/2026 | não informado | passou limpo | não informada         | primeira entrada deste arquivo                                     |
| 24/10/2026 | não informado | passou       | não informada         | depois da Sinopse curta; o teste pulado ("1 skipped") foi removido |
| 16/10/2026 | não informado | passou       | 4116 passam, 0 falham | depois do ajuste de "em andamento" que fechou a Fase 14, etapa 4   |

- 30/10/2026: Valência do Tema, entrega 1 de 3 (`js/temas.js`, `forms.js`, `render-listas.js`, `exportar.js`, `exportar-temas.js`, `importar-aditivo.js`, `modais/modal-tema.html`, `index.html`; testes novos `temas-valencia.test.js` e `temas-valencia-dom.test.js`).
- 30/10/2026: Valência do Tema, entrega 2 de 3 (`js/temas-massa.js`, `js/temas-massa-ui.js`, `js/valencia-seed.js` novos; `db.js`, `main.js`, `render-listas.js`, `index.html`; testes `temas-valencia-massa.test.js` novo e `temas-valencia-dom.test.js` ampliado).
- 30/10/2026: Valência do Tema, seletor de valência no cartão (`render-listas.js`, `temas-massa-ui.js`, `main.js`; testes `temas-dom.test.js` e `temas-valencia-dom.test.js`).
- 30/10/2026: Valência do Tema, entrega 3 de 3, Estatísticas e docs de fechamento (`estatisticas-dados-valencia.js`, `estatisticas-tela-valencia.js` novos; `estatisticas.js`, `estatisticas-dados.js`, `estatisticas-filtros.js`, `main.js`, `index.html`, `faq-conteudo.js`, `como-faco-passos.js`; teste `estatisticas-valencia.test.js`).
- 31/10/2026: Baixar .md da Vitrine de leitura na aba Assuntos (`js/exportar-vitrine.js` novo, `temas-universais-ui.js`, `main.js`, `index.html`; teste novo `exportar-vitrine.test.js`).
- 31/10/2026: "Definir por lista" na aba Temas, valência, assunto ou vitrine (`js/temas-lista.js` novo, `temas-massa-ui.js`, `main.js`, `index.html`, `faq-conteudo.js`, `como-faco-passos.js`; testes novos `temas-lista.test.js` e `temas-lista-dom.test.js`).
- 01/11/2026: Fase 22, busca por prefixo `pegou:` e `incomodou:` (F22-D20): `js/leitura-avaliativa-busca.js` (novo), `js/render-listas.js`, `js/utils.js`, `js/sugestoes-busca-texto.js`, `js/fontes-sugestoes-busca-texto.js`, `tests/leitura-avaliativa-busca.test.js` (novo), `tests/sugestoes-busca-texto.test.js`, `planejamento/fase-22-leitura-avaliativa.md`, `manutencao/status.md`. Rodados 1076 testes direcionados (os de leitura, busca, sugestões, colunas, `campos-preenchiveis`, `utils`, `faq-conteudo`, `central-ajuda`, `wiring-onclick`, `ferramentas-nav`, `tour-passos`), 0 falhas; eslint e prettier limpos.
- 01/11/2026: Fase 22, filtro "Incomodou:" na aba, clique no padrão e nova ordem de "Onde pegou" (F22-D21): `js/leitura-avaliativa.js`, `js/leitura-avaliativa-acoes.js`, `js/leitura-avaliativa-ui.js`, `js/main.js`, `tests/leitura-avaliativa.test.js`, `tests/leitura-avaliativa-acoes.test.js`, `tests/leitura-avaliativa-ui.test.js`, `tests/leitura-avaliativa-busca.test.js`, `planejamento/fase-22-leitura-avaliativa.md`, `manutencao/status.md`. Rodados 1264 testes direcionados (os de leitura, busca, sugestões, saídas, sorteio, `wiring-onclick`, `ferramentas-nav`, `tour-passos`, `campos-preenchiveis`, `colunas`, `utils`, `faq-conteudo`, `central-ajuda`), 0 falhas; eslint e prettier limpos.
- 01/11/2026: Fase 22, opção "Algum" nos filtros "Pegou:" e "Incomodou:" (F22-D22): `js/leitura-avaliativa-acoes.js`, `js/leitura-avaliativa-ui.js`, `tests/leitura-avaliativa-acoes.test.js`, `tests/leitura-avaliativa-ui.test.js`, `planejamento/fase-22-leitura-avaliativa.md`, `manutencao/status.md`. Rodados os testes direcionados (os de leitura, busca, sugestões, saídas, sorteio, `wiring-onclick`, `ferramentas-nav`, `tour-passos`), 0 falhas; eslint e prettier limpos.
- 01/11/2026: Fase 22, "De que maneira te pegou" e pesos Pontual, Marcante e Central (F22-D23): `js/leitura-avaliativa.js`, `js/leitura-avaliativa-ui.js`, `js/leitura-avaliativa-acoes.js`, `js/leitura-avaliativa-busca.js`, `js/leituras-saida.js`, `js/leitura-avaliativa-padrao.js` (reaplicada a `coracoesDoTexto` da F22-D19), `tests/leitura-avaliativa-padrao.test.js`, `tests/leitura-avaliativa.test.js`, `tests/leitura-avaliativa-ui.test.js`, `tests/leitura-avaliativa-busca.test.js`, `tests/leitura-avaliativa-acoes.test.js`, `tests/leituras-saida.test.js`, `planejamento/fase-22-leitura-avaliativa.md`, `manutencao/status.md`. Rodados os testes direcionados de leitura avaliativa e saídas; o `npm test` completo fica por conta do Victor.
- 01/11/2026: sorteio, "Anterior" e "Próximo" (SORT-A): `js/sortear-pagina.js`, `js/faq-conteudo.js`, `tests/sortear-pagina.test.js`, `manutencao/status.md`. Rodados `tests/sortear-pagina.test.js` e os de FAQ e ajuda; o `npm test` completo fica por conta do Victor.
- 01/11/2026: sorteio, histórico "Últimos sorteados" (SORT-B): `js/sorteio.js`, `js/sortear-pagina.js`, `js/faq-conteudo.js`, `tests/sorteio.test.js`, `tests/sortear-pagina.test.js`, `manutencao/status.md`. Rodados `tests/sorteio.test.js`, `tests/sortear-pagina.test.js` e os de FAQ e ajuda; o `npm test` completo fica por conta do Victor.
- 01/11/2026: sorteio, "Anterior" e "Próximo" também ao lado do botão Sortear (SORT-A): `js/sortear-pagina.js`, `js/faq-conteudo.js`, `tests/sortear-pagina.test.js`, `manutencao/status.md`. Rodados `tests/sortear-pagina.test.js` e os de sorteio, FAQ e ajuda; o `npm test` completo fica por conta do Victor.
- 01/11/2026: Leitura avaliativa, olho (Ver) e seta (Baixar .md ou .pdf, só com título e texto) na caixa do texto: `js/leitura-avaliativa-texto.js`, `js/leitura-avaliativa-ui.js`, `js/main.js`, `tests/leitura-avaliativa-texto.test.js`, `manutencao/status.md`. Rodados `tests/leitura-avaliativa-texto.test.js`, `tests/leitura-avaliativa-ui.test.js` e `tests/wiring-onclick.test.js`; o `npm test` completo fica por conta do Victor.
- 01/11/2026: Inspiração pública, entrega 1 de 3 (campo `inspiracaoPublica`, caixa Pública nos modais, salvar e sorteio): `js/comentarios-publicos.js`, `js/paratexto-publico.js`, `js/forms.js`, `modais/modal-poema.html`, `modais/modal-prosa.html`, `tests/inspiracao-publica.test.js`, `manutencao/status.md`. Rodados `tests/inspiracao-publica.test.js`, os de comentários públicos, paratexto, sorteio, `wiring-onclick` e 25 arquivos vizinhos de modais e campos; o `npm test` completo fica por conta do Victor.
- 01/11/2026: Inspiração pública, entrega 2 de 3 (coluna, busca `inspiracaopublica:`, .md, Ver, .csv, Preencher campo e Importar campos): `js/colunas.js`, `js/celulas-tabela.js`, `js/render-listas.js`, `js/utils.js`, `js/sugestoes-busca-texto.js`, `js/exportar-md.js`, `js/visualizar.js`, `js/exportar-csv.js`, `js/campos-preenchiveis.js`, `js/importar-campos-extras.js`, `tests/inspiracao-publica.test.js`, `tests/colunas.test.js`, `tests/sugestoes-busca-texto.test.js`, `manutencao/status.md`. Rodados o teste novo e 111 arquivos vizinhos (colunas, comentários públicos, exportações, busca, sugestões, preenchimento, importação, Ver, sorteio, modais, ajuda e `wiring-onclick`); o `npm test` completo fica por conta do Victor.
- 01/11/2026: Inspiração pública, entrega 3 de 3 (FAQ, docs para IAs, schema e decisões): `js/faq-conteudo.js`, `docs/campos-poema-prosa-for-ai.md`, `docs/campos-poema-prosa-for-ai-pt-br.md`, `docs/importar-campos-for-ai.md`, `docs/importar-campos-for-ai-pt-br.md`, `manutencao/schema.md`, `manutencao/decisoes.md`, `manutencao/status.md`, `tests/inspiracao-publica.test.js`. Rodados o teste novo e os de FAQ, ajuda e comentários públicos; o `npm test` completo fica por conta do Victor.
