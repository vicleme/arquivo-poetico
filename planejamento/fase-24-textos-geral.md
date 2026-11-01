# Fase 24: aba Textos (Geral)

Planejada em 01/11/2026 (decisões D1 a D7 fechadas no mesmo dia), só planejamento, a partir de conversa com o Victor sobre o clique nos gráficos de Temas e Assuntos das Estatísticas. O app não mudou.

- **Ideia (Victor, 01/11/2026).** Uma aba **Textos (Geral)** com Poemas e Prosas juntos, para ser o destino de qualquer busca que cruza os dois tipos. A primeira razão veio do clique no gráfico: com o tipo em "Poemas e prosas", o clique abre sempre Poemas, mesmo que o tema esteja nas prosas.
- **Regra de destino que passa a valer quando a aba existir.** O clique (e qualquer atalho das Estatísticas) abre: **só poema no recorte, a aba Poemas; só prosa, a aba Prosas; os dois, a aba Textos.**
- **O que fica para depois da aba.** A correção do clique nos gráficos de Estatísticas (levar à lista os filtros da barra: ano, autor, corpus e tipo) só entra depois que a aba existir. Está na etapa 24-6.

## Estado de hoje (conferido no código em 01/11/2026)

- Poemas e Prosas são duas abas e duas listas (`renderPoemas` e `renderProsas`, em `js/render-listas.js`, que tem mais de 7 mil linhas), cada uma com busca, colunas, filtros, paginação, barra de seleção, edição em massa, "Preencher campo", exportações e Ver.
- A ação em massa já é uma função só parametrizada por `tabela` (`js/selecao-massa.js`, concluída antes; Gênero em massa é só de Prosa). O resto da lista ainda é par: `setFiltroPoemas`/`setFiltroProsas`, `getOpcoesBuscaPoemas`/`getOpcoesBuscaProsas`, e assim por diante, com cerca de 60 desvios `tabela === 'prosas'` espalhados em `js/`.
- Já existem destinos que tratam os dois tipos juntos: o sorteio, a Leitura avaliativa, o Download Abrangente e as Estatísticas. Nenhuma lista de edição faz isso.
- O destino do clique é `navegarParaLista` e `tipoDestino()` (`js/estatisticas-tela-comum.js`): hoje, `prosas` abre Prosas e qualquer outro tipo abre Poemas. Há 18 chamadas de `navegarParaLista`.
- A **Fase 14** (Núcleo de texto compartilhado, em módulos por `tabela`) e a **Fase 15** (Músicas, terceiro tipo de texto) estão no painel e tocam o mesmo código. A aba Textos não pode nascer presa a dois tipos.

## Decisão de desenho (fechada, Victor, 01/11/2026): a Textos é uma aba a mais, não substitui nada

**Poemas e Prosas continuam existindo como abas separadas, cada uma com suas colunas, seus campos, sua edição em massa e suas exportações.** A **Textos (Geral)** é uma aba adicional, só de leitura e busca, que reúne os dois tipos numa lista. Esta fase **não** integra nem remove as abas de Poemas e Prosas, e nenhuma etapa deve ser lida como um passo nessa direção.

- **O que a Textos faz.** Uma tabela com os dois tipos, uma coluna "Tipo", busca e filtros comuns, colunas comuns, seleção e as exportações que já tratam os dois tipos. Clicar numa linha abre o Ver (e o Editar) do tipo certo.
- **O que fica fora.** Edição em massa de campos que só existem em um tipo (Gênero), colunas exclusivas de um tipo e "Novo texto". Quem precisa dessas coisas vai à aba do tipo, com os mesmos filtros levados junto.
- **Por que separadas.** Poema e Prosa têm campos próprios (escansão, Forma e Sonoridade de um lado, Gênero do outro); uma lista única esconderia esses campos ou ficaria com colunas vazias. A duplicação de código entre os dois tipos é assunto da Fase 14, que a resolve por dentro, sem mudar as abas.
- **Fora do escopo.** Integrar de vez as duas abas (uma só lista de edição para todos os tipos) é outra ideia, não planejada. Se um dia o Victor quiser, vira fase própria, depois da Fase 14.

## Etapas (cada uma fecha sozinha: app funcionando, testes direcionados, zip)

1. **24-0, levantamento (sem código novo).** Inventariar, em `render-listas.js` e arredores, o que a lista de Poemas e Prosas faz e o que é comum aos dois tipos: colunas, busca (prefixos), filtros, ordenação, paginação, seleção, ações da coluna Ações, exportações e o Ver. Resultado: tabela "comum, só de poema, só de prosa" no arquivo da fase. Decide o recorte da A.
2. **24-1, lógica pura e testes.** Módulo sem DOM que junta os dois acervos numa lista única (`{ tipo, item }`), aplica a mesma busca e os mesmos filtros e devolve a página. Reaproveita o parser de busca atual, sem copiá-lo. Define a regra de destino (`destinoDosTextos(recorte)`: `poemas`, `prosas` ou `textos`).
3. **24-2, a aba e a lista.** `index.html`, contagem, colunas comuns com "Tipo", busca com sugestões, paginação, ordenação. Entra no menu do grupo Conteúdo. Sem edição em massa ainda.
4. **24-3, seleção e saídas.** Seleção (inclui "Selecionar estes N"), e Baixar `.json`, `.md`, `.csv`, `.pdf` e `.docx` da seleção, reaproveitando os exportadores existentes (que já recebem itens de qualquer tipo; conferir). Edição em massa só do que é comum (pessoa, etiqueta, Preencher campo dos campos comuns).
5. **24-4, ligações.** A regra de destino ligada em `navegarParaLista` e em `abrirPorAtalho`, para qualquer atalho que hoje escolhe o tipo. Teste de que o destino segue a regra nos três casos.
6. **24-5, documentação.** FAQ, Central de Ajuda, `docs/` `for-ai` (par pt-br e en), tour se houver, e `decisoes.md`.
7. **24-6, correção do clique nas Estatísticas (a que o Victor deixou para depois).** Levar à lista os filtros da barra (ano, autor, corpus e tipo) e mostrá-los no aviso "Filtrando por ...", e o clique nos rótulos e o controle "Por tema" por assunto (ver "Ideia do clique", abaixo). Só depois da 24-4.

Ordem entre as outras fases: a Fase 24 não depende da Fase 14 e pode vir antes dela, porque não toca o formulário.

## Ideia do clique nos gráficos de Temas e Assuntos (para a 24-6)

Vem da mesma conversa e ficou anotada aqui para não se perder; ainda não decidida em detalhe.

- **Segmentos da barra:** continuam levando à busca por papel (`temaprincipal:`, `temasecundario:`, `temasempapel:`; `assuntoprincipal:` etc.).
- **Rótulos do eixo X:** sempre buscam **sem distinção de papel** (`tema:` no modo Por tema, `assunto:` no modo Por assunto). Mesmo comportamento nos dois modos, sem tecla modificadora.
- **Assunto para temas (ideia do Victor):** no modo Por assunto, um controle "Por tema" **acima de cada barra** (dentro ou logo acima da área do gráfico) abre os temas daquele assunto no modo Por tema, só com eles. Assunto tem cerca de 10 barras, então cabe; no celular precisa ser conferido.
- **Como fazer:** o gráfico já aceita clique no rótulo do eixo (`bindDrillDownBarra`, parâmetro `aoClicarRotulo`). O controle acima da barra pede um plugin do Chart.js (desenhar o botão e testar o clique) ou botões HTML sobrepostos posicionados pela posição de cada barra. Levar em conta a acessibilidade (hoje o gráfico é só canvas).
- **Mais a conferir:** o aviso "Filtrando por ..." precisa listar tudo o que foi aplicado.

## Decisões (D1 a D7 todas fechadas em 01/11/2026)

- **F24-D1: lista ou editor? FECHADA (Victor, 01/11/2026).** A aba Textos é só lista, com leitura e busca, e Poemas e Prosas seguem como abas separadas. Integrar as abas não faz parte desta fase.
- **F24-D2 FECHADA (Victor, 01/11/2026): nome.** O Victor disse "Textos (Geral)". Decidido: menu e título "Textos (Geral)", como "Cruzamentos (Temas)"; o texto de apoio explica que reúne Poemas e Prosas.
- **F24-D3 FECHADA (Victor, 01/11/2026): onde entra no menu.** Decidido: grupo **Conteúdo**, antes de Poemas e Prosas.
- **F24-D4 FECHADA (Victor, 01/11/2026): ao abrir pelo clique, os filtros da aba vêm de onde?** Decidido: do recorte da Estatística (filtros da barra + o prefixo clicado), nunca de uma busca guardada da aba Textos, para o destino ser previsível. Limpar volta ao estado anterior da aba.
- **F24-D5 FECHADA (Victor, 01/11/2026): "Novo texto" na aba Textos.** Decidido: não (precisa escolher o tipo; fica nas abas de cada tipo).
- **F24-D6 FECHADA (Victor, 01/11/2026): Música (Fase 15).** Decidido: a lista única já nasce aceitando N tipos (`tipo` como chave), mesmo com só dois hoje.
- **F24-D7 FECHADA (Victor, 01/11/2026): colunas.** Decidido: só as comuns aos dois tipos, mais "Tipo"; o resto, na aba do tipo.

## Riscos e limites

- **Duplicação.** Sem cuidado, a A vira um terceiro lugar a manter (colunas, busca, exportação). Por isso a 24-1 reaproveita o que existe e a 24-0 mede o que é comum antes de qualquer código.
- **Cadeia de campo.** Campo novo, daqui para frente, passa a ter mais um lugar a considerar (a coluna na aba Textos). Registrar em `licoes-de-sessao.md` se a regra "campo comum aparece na Textos" virar parte da cadeia de sete elos.
- **Desempenho.** Mais de mil textos num `render` só: usar a mesma paginação (a lista já pagina).
- **Não resolve** o que só existe num tipo; o botão "Ir para Poemas/Prosas com estes filtros" é a ponte.

## Do lado do Victor

- Dizer se quer começar pela 24-0 (levantamento no código, sem código novo).
