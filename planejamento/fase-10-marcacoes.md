# Fase 10: Marcações

Marcar trechos dentro do texto com categorias próprias e contá-las nas Estatísticas. Sem dependência (a parte de Estatísticas, depois da Fase 1; melhor depois da Fase 14).

Movido do `plano-central.md` em 20/10/2026, sem reescrever. O painel guarda só a linha da fase.

- **Ideia (Victor, 01/10/2026).** Poder criar **categorias de marcação** e, num texto, selecionar um trecho e marcá-lo com uma categoria. É o jeito manual e personalizável de rastrear o que a contagem de palavras não alcança (autorreferência, conceitos, qualquer coisa que não se acha por palavra). Nome decidido: **Marcações**.
- **Diferença para Etiquetas/Sinalizações.** Etiqueta descreve o **texto inteiro** (Tom, Estilo, Tradição); Marcação descreve um **trecho dentro dele**. A interface deve deixar isso claro.
- **Dado proposto (a confirmar ao começar).** Cadastro `db.categoriasMarcacao` (id, nome, cor, descrição) e coleção `db.marcacoes` (id, texto, categoria, trecho citado, início, fim, nota opcional, indicador de órfã). Sem categorias de fábrica.
- **Etapas.** **10a** cadastro de categorias (CRUD, busca, exportação, importação). **10b** marcar o trecho no texto: selecionar, "Marcar", escolher a categoria, nota opcional; lista das marcações do texto e destaque colorido na Visualização. **10c** reancoragem: depois de editar o texto, reencontrar cada trecho; as que não forem achadas ficam como "órfãs" numa lista de revisão, nunca apagadas em silêncio; avisar nos pontos que reescrevem o Texto (Localizar e Substituir, Versões Alternativas, edição em massa). **10d** exportação (.md, CSV, JSON) e Importação Aditiva (remapear id do texto e da categoria; nome da categoria viaja junto, como as outras referências); backup antigo sem o campo abre sem erro. **10e** Estatísticas: marcações por categoria, ao longo do tempo e por tipo de texto, com clique abrindo a lista de trechos; opcional, cruzar com a Fase 9 (palavras mais usadas dentro de uma categoria).
- **Risco principal.** Marcação ancorada em trecho de texto editável: toda rotina que altera o campo Texto passa a ter um efeito colateral. Por isso a 10c é etapa própria e não fica para depois.
- Cadeia inteira a conferir em cada etapa (dado, modal, salvar, exportar, importar, docs `for-ai`), como em `licoes-de-sessao.md`. Cria `fase-10-marcacoes.md` ao começar.

## Decisões em aberto

| Código | Pergunta                               | Sugestão                                                                                                                                                                   | Bloqueia  |
| ------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| F10-D1 | Como a marcação se ancora no texto     | Trecho citado mais posição aproximada. Só posição quebra a cada edição; só trecho confunde repetições. Se o trecho não for achado, a marcação vira órfã e vai para revisão | etapa 10b |
| F10-D2 | Sobreposição e categorias por marcação | Marcações podem se sobrepor; cada marcação tem uma categoria, e o mesmo trecho pode ser marcado de novo com outra                                                          | etapa 10b |
| F10-D3 | Categorias de fábrica                  | Nenhuma: cadastro começa vazio (como Pessoas e Grupos) e o Victor cria, por exemplo, "Autorreferência"                                                                     | etapa 10a |
