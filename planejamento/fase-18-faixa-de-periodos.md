# Fase 18: Faixa de períodos nos eixos de anos

Planejada em 19/10/2026. Depende da Fase 1 (gráficos de anos).

Movido do `plano-central.md` em 20/10/2026, sem reescrever. O painel guarda só a linha da fase.

- **Ideia (Victor, 19/10/2026).** Nos gráficos em que o eixo é o tempo em anos, trazer embaixo, de algum modo, os Períodos Biográficos e Históricos que batem com os anos exibidos: só os anos que aparecem (porque há texto situado ali) dentro do intervalo selecionado. Serve de contexto para ler picos e quedas ("foi a pandemia", "foi tal período da vida do autor").
- **Decidido (F18-D1).** Ligada por um botão, **desligada por padrão**, para não poluir os gráficos de quem não usa.
- **Onde entra.** Os gráficos com anos no eixo: produção por ano (`contarPorAno`), temas e pessoas ao longo do tempo (`agregarTemasPorAno`, `agregarPessoasPorAno`, `unirSeriesPorAno`), todos desenhados por `js/estatisticas-tela-comum.js`. Na entrega 2, conferir no código quais construtores têm de fato eixo de anos. **Fica de fora:** a sazonalidade (o eixo é de meses).
- **O que lê.** `inicio` e `fim` (datas parciais com mês e ano, `null` quando ausentes) de `db.epocas` e `db.periodosHistoricos`, a hierarquia dos históricos (`pertenceA`), a marca `evento` e, nos biográficos, o `autorId`. Nenhum dado novo no acervo: a única coisa guardada é a preferência do botão em `localStorage`, sob o prefixo `arquivoPoetico_est_`, que o inventário já cobre.
- **Regras de desenho (propostas).**
    - Um período aparece como faixa que vai do primeiro ao último ano exibido que ele cobre. Se atravessa um ano sem texto (que não aparece no eixo), a faixa segue contínua com uma marca discreta de corte.
    - Período que não cobre nenhum ano exibido não aparece. Data só com ano vale o ano inteiro. Período sem início fica de fora, e o botão avisa quantos ficaram de fora por falta de data. Período em andamento (sem fim) vai até o último ano exibido.
    - Sobreposição vira linhas, como um Gantt pequeno (encaixe guloso), com limite de linhas e um "+N" além dele.
    - Históricos: só os de topo, com a opção de abrir os filhos. Biográficos: só quando há um autor filtrado, ou agrupados por autor, porque período biográfico pertence a um autor e misturar vira bagunça.
    - O eixo mostra o ano em que o texto foi escrito e a faixa mostra quando o período aconteceu. É contexto, não "textos deste período" (isso é o Período Retratado, outro campo). A ajuda precisa dizer isso.
- **Entregas.**
    1. **Lógica pura e testes:** módulo novo (sugestão `js/faixa-periodos.js`) que, dados os anos exibidos e os cadastros, devolve cada período que cabe, com os anos cobertos, os cortes e a linha. Compartilhado com a Leva 2 da Fase 5.
    2. **Tela, só os históricos de topo:** botão "Mostrar períodos" no gráfico de produção por ano, desligado, com a escolha guardada. Tooltip com nome e datas; clique abre o "Ver" do período.
    3. **Biográficos com a regra do autor** e a opção de abrir os filhos dos históricos.
    4. **Demais gráficos de anos** (temas e pessoas ao longo do tempo) e documentação completa (ajuda, FAQ, `decisoes.md`, `plano-central.md`).
- **Depende** só de existirem os gráficos de anos (Fase 1). Cada entrega fecha sozinha e o app segue funcionando sem as próximas.

## Decisões em aberto

| Código | Pergunta                                                                                                          | Sugestão                                                                                                                                                                    | Bloqueia  |
| ------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| F18-D2 | A faixa é desenhada no próprio canvas do gráfico (plugin do Chart.js) ou como uma faixa em HTML alinhada embaixo? | No canvas: o alinhamento com cada ano é exato (escala do próprio gráfico), o PNG da Fase 3 já sai com a faixa, e é o mesmo caminho do plugin de faixas sombreadas da Fase 5 | entrega 2 |
| F18-D3 | Quais períodos entram por padrão                                                                                  | Históricos de topo; filhos por opção. Biográficos só com autor filtrado (ou agrupados por autor)                                                                            | entrega 3 |
| F18-D4 | Eventos (`evento: true`) entram na faixa?                                                                         | Não por padrão (são recortes curtos e poluem); caixa "Incluir eventos"                                                                                                      | entrega 2 |
| F18-D5 | A escolha do botão fica guardada entre sessões?                                                                   | Sim, como o modo das correntes (`arquivoPoetico_est_...`), mas o padrão de quem nunca ligou segue desligado                                                                 | entrega 2 |
| F18-D6 | Período sem data e período em andamento                                                                           | Sem início fica de fora, com aviso "N períodos sem data"; sem fim vai até o último ano exibido                                                                              | entrega 1 |
| F18-D7 | Quantas linhas de faixa cabem antes do "+N"                                                                       | Quatro, com o "+N" abrindo a lista completa em tooltip                                                                                                                      | entrega 2 |
| F18-D8 | Cobertura da faixa nos filtros do painel de Estatísticas                                                          | A faixa respeita o mesmo recorte do gráfico (anos exibidos após filtros); períodos nunca entram no filtro                                                                   | entrega 2 |

## Decisões tomadas

- **F18-D1:** a faixa é ligada por um botão e vem desligada por padrão (Victor, 19/10/2026), para não poluir os gráficos de quem não usa. Aprovada junto com a ideia, depois de o Claude apontar que períodos se sobrepõem, anos sem texto somem do eixo e período biográfico pertence a um autor.
