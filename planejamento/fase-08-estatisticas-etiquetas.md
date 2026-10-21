# Fase 8: Estatísticas de Etiquetas (Sinalizações)

Gráfico por tipo e por cluster (com subclusters). Depende das Fases 1, 16 e 17 (prontas).

Movido do `plano-central.md` em 20/10/2026, sem reescrever. O painel guarda só a linha da fase.

- O gráfico por tipo de etiqueta sumiu da tela quando Temas virou um cartão só. Sobraram `agregarPorTema(tipos)`, `getTiposEtiquetaSelecionados`, `toggleTipoEtiqueta` e a persistência `tiposEtiqueta`, sem interface.
- **Decidido (01/10/2026):**
    - Visão **por tipo de etiqueta**, como antes: gráfico de barras com **uma caixa de seleção por tipo**, que liga e desliga os tipos no mesmo gráfico.
    - **Aba própria**, chamada **Etiquetas** (a tabela já usa esse nome; o modal diz Sinalizações, mas "Etiquetas" é o mais simples). O menu de Estatísticas vai a 8 itens com a Fase 1.
    - **Sete tipos entram:** Tradição, Estilo, Relação, Sensibilidade, Tom, Domínio Imagético e Outros. **Tema e Territorialidade ficam de fora**, porque viraram campos próprios (Tema com cadastro e papéis; Territorialidade puxa do cadastro de Locais, com a aba Local e idioma).
- **Reaproveitar:** a cor por tipo (`CORES_TIPOS_ETIQUETA`) e a lógica de seleção já existem. Sem Tema e Territorialidade, a lista de tipos do gráfico (`TIPOS_ETIQUETA`, hoje as 9 categorias) precisa de um recorte explícito para os 7.
- **A conferir ao começar:** `agregarPorTema(tipos)` lê o espelho `sinalizacoesTerritorialidade` e `sinalizacoesTema`; os 7 tipos restantes são campos de texto simples, então nem a Fase 2 nem a 2b os afetam. Se a Etapa 2 da Fase 2 já tiver passado, a leitura passa por `valorDaCategoria`. Em qualquer ordem, o recorte dos 7 tipos precisa ser explícito: `TIPOS_ETIQUETA` vem de `Object.keys(SINALIZACOES_CATEGORIAS)`, e `tema` e `territorialidade` continuam sendo chaves desse mapa mesmo depois de virarem categorias virtuais. Cria `fase-08-estatisticas-etiquetas.md` ao começar.

- **Subclusters na visão por cluster (decidido em 18/10/2026, F8-D2).** O Victor quer as três formas, não uma só: (1) **só clusters de topo**, cada pai como uma barra com a união dos textos (cada texto uma vez, sem somar); (2) **pai e subclusters como barras separadas**, o subcluster com recuo ou cor própria; (3) **clicar no pai abre os subclusters** dele. A forma 1 e a 2 viram um seletor de nível ("só topo" / "incluir subclusters"), e a 3 vale dentro de "só topo". Detalhes visuais (recuo, cor, onde fica o seletor) ficam para a etapa de tela da Fase 8. Dado já pronto em `js/tag-clusters.js` (`contarTextosPorCluster` já dá a contagem do pai pela união; `subclustersDoCluster` lista os filhos).

- **Etiquetas nunca usadas (F20-D3, 20/10/2026).** Quando a Fase 20 criar o catálogo de fábrica, esta aba ganha o painel "usei N de M" por categoria e a lista das etiquetas sem texto por cluster, seguindo os filtros do painel.

## Decisões em aberto

| Código | Pergunta                                                                             | Sugestão                                                                                                                                                                                                                                                      | Bloqueia |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F8-D1  | Renomear o grupo Sinalizações para Etiquetas na interface? (o Victor está em dúvida) | Sim, só o rótulo (menu, modal, ajuda, docs); as chaves internas `sinalizacoes...` ficam, sem mexer em schema, exportação nem backups antigos. Combina com a aba Etiquetas da Fase 8 e separa de Marcações (etiqueta é do texto todo, marcação é de um trecho) | nada     |
| F8-D2  | Como mostrar subclusters no gráfico por cluster                                      | As três: só topo, topo mais subclusters em barras separadas e clique no pai abrindo os filhos (seletor de nível)                                                                                                                                              |          |
