# Fase 1: Estatísticas, reorganização de Temas e Pessoas

Origem: `Ideias_arquivo-poetico.txt` (quatro pedidos do Victor). Estado: **todas as etapas (1a, 1b, 1c-0, 1c, 1d) feitas e testadas; falta só a conferência do Victor no navegador. Todas as decisões desta fase estão respondidas** (01/10/2026 às 00:10); a conversa sobre Etiquetas (F1-D5) virou fase própria, fora desta. Partida: suíte **2339/0**, lint e Prettier limpos. Painel geral: `plano-central.md`.

## Os quatro pedidos, em uma frase cada

1. **Separar a aba** "Temas e pessoas" em "Temas e Assuntos" e "Pessoas e Grupos", com a matriz de relações numa aba própria chamada **Cruzamentos**.
2. **Unir Temas e Assuntos num gráfico só** (como Pessoa e Grupo já são), com a barra empilhada por papel: principal em cor forte, secundário em cor fraca, indefinido pontilhado.
3. **Acrescentar "Por gênero"** ao gráfico de Pessoas (junto de "Por pessoa" e "Por grupo") e um filtro de gênero dentro de "Por pessoa", como já existe o de grupo. O cartão separado de gênero sai.
4. **Soma no fim de cada coluna de tema** da matriz de relações: quantas aparições de pessoas há naquele tema.

## Situação atual (conferida no código em 30/09/2026)

- A aba `#estatisticas-temas-pessoas` (`js/estatisticas-tela-temas-pessoas.js`) tem sete cartões: Temas mais frequentes (hoje só Tema, com "Papel do tema"; o seletor de tipos de etiqueta não aparece mais na tela, embora `toggleTipoEtiqueta` e as funções de dados ainda existam sem uso na interface), Pessoas mais mencionadas (Por pessoa / Por grupo, filtro de Grupo), Gênero das pessoas retratadas, Assuntos (com "Papel do assunto"), Tema ao longo do tempo, Pessoa ao longo do tempo e Relações (matriz).
- Hoje o papel é um **seletor**: só se vê um papel por vez. Nunca os três juntos.
- A matriz tem **pessoas ou grupos nas linhas e temas nas colunas**. A célula é o número de textos que têm a pessoa e o tema ao mesmo tempo.
- Referências à aba antiga: `js/estatisticas.js` (três pontos), `js/ui.js` (`GRUPOS_NAV`), `index.html` (botão e seção). `js/estatisticas-tela-local-idioma.js` importa `seletorOcultos` do módulo da aba antiga, então ele precisa ir para `estatisticas-tela-comum.js` antes da divisão.

## Decisões desta fase

Respondidas pelo Victor em **(01/10/2026 às 00:10)**. Nenhuma decisão desta fase está em aberto.

**F1-D1. Onde fica a matriz de relações. DECIDIDO: aba própria, chamada "Cruzamentos"** (o nome "Relações" soava a relações pessoais). Conferido no código: não colide com nenhuma aba existente. Id da aba: `estatisticas-cruzamentos`. O menu de Estatísticas passa de 5 para 7 itens.

**F1-D2. Seletores de papel. DECIDIDO:** os seletores "Papel do tema" e "Papel do assunto" saem **só do gráfico de barras**; "Papel do tema" fica na linha do tempo e na matriz. A proposta de um botão "Outras etiquetas" **foi recusada**: para o Victor, Temas e Assuntos não são etiquetas comuns, e Tom, Estilo, Domínio Imagético etc. pertencem a outro conceito (Etiquetas ou Sinalizações). **F1-D5, reaberta e fora desta fase:** a conferência no código mostrou que o gráfico de etiquetas por tipo (Tom, Estilo, Domínio Imagético e as demais categorias) já não aparece na tela desde que Temas virou um cartão só (só o código de dados sobrou). Nada disso é afetado pela Fase 1. O resgate, como parte própria, está na **Fase 8** do `plano-central.md`, em conversa.

**F1-D3. Gênero.**

- **DECIDIDO: cis/trans é ligável e desligável.** Às vezes a análise deve considerar a cisgeneridade ou transexualidade, às vezes ignorar de propósito. Vira um botão no gráfico "Por gênero": desligado, as barras agrupam só pelo Gênero; ligado, cada barra combina Gênero e identidade (por exemplo "Mulher, Transgênero"). O mesmo botão vale para o filtro de gênero de "Por pessoa".
- **F1-D6 DECIDIDO: criar os campos na Pessoa.** Só o Autor tem hoje `identidadeCisTrans` (Cisgênero, Transgênero, Não se aplica; vazio = não documentado). A Pessoa ganha o **mesmo campo e a mesma lista**, e também **`corRaca`** (mesma lista fechada do Autor, `CORES_RACA_AUTOR`: Branca, Preta, Parda, Amarela, Indígena; vazio = não documentado). Motivo do cor/raça: poder estudar, por exemplo, se pessoas negras tendem a dedicar textos mais a pessoas brancas ou negras, e o inverso (Autor × Pessoa com papel Dedicatário). Esse cruzamento Autor × Pessoa **não** faz parte da Fase 1: fica como ideia para a aba Cruzamentos depois, quando os campos estiverem preenchidos. Também resolve a dúvida antiga sobre "mulher" e "mulher cis": Gênero fica só como identidade de gênero.
- **Mantidos como sugeridos (o Victor disse que a pergunta estava solta; se quiser mudar, é só falar):** em "Por pessoa" os filtros de gênero e grupo combinam por E; em "Por grupo" o filtro de gênero não se aplica; "Pessoa ao longo do tempo" ganha o filtro depois, com a 1c estável; a barra de gênero não abre lista ao clicar por ora.

**F1-D4. Soma da coluna. DECIDIDO como sugerido:** rodapé com duas linhas, "Aparições de pessoas (soma)" e "Textos com o tema"; a matriz de Grupos mostra só "Textos com o tema" (a soma contaria a mesma pessoa duas vezes por causa do subgrupo). **Total por linha: sim.** Detalhe que a implementação precisa respeitar: a soma das células de uma linha conta pares texto e tema, não textos; por isso a coluna final ganha o rótulo "Total (soma da linha)" e, ao lado, "Textos com a pessoa" (ou "com o grupo"), pelo mesmo motivo do rodapé.

## Etapa 1a. Separar a aba (FEITA em 01/10/2026; suíte 2353/0, aguardando conferência no navegador)

Estrutural, sem mudar nenhum número.

1. Mover `seletorOcultos` de `estatisticas-tela-temas-pessoas.js` para `estatisticas-tela-comum.js` e ajustar o import de `estatisticas-tela-local-idioma.js`.
2. Dividir o módulo em `estatisticas-tela-temas.js` (Temas e Assuntos) e `estatisticas-tela-pessoas.js` (Pessoas e Grupos). Também `estatisticas-tela-cruzamentos.js`.
3. `index.html`: três seções com `est-filtros-compartilhados`, botões no menu, ids em minúsculas e sem acento (`estatisticas-temas-assuntos`, `estatisticas-pessoas-grupos`, `estatisticas-cruzamentos`). `js/ui.js` (`GRUPOS_NAV`) e `js/estatisticas.js` (o despachante) passam a conhecer as novas abas.
4. Quem tinha guardado a aba antiga como última aberta cai na primeira das novas (sem erro). `grep` por `estatisticas-temas-pessoas` em `js/`, `tests/`, `docs/` e `manutencao/`.
5. Cuidado: `tests/wiring-onclick.test.js` confere os `onclick` e os `window.x`, e os testes de Estatísticas leem as seções do `index.html` por id (o mesmo padrão de `tests/estatisticas-local-idioma.test.js`).

Pronto quando: todos os gráficos e a matriz aparecem iguais, cada um na aba nova, filtros compartilhados funcionando nas três, suíte verde. O menu de Estatísticas passa de 5 para 7 itens (aceito pelo Victor); a aba Etiquetas da Fase 8 leva a 8.
Reversão: reverter o zip da etapa; nenhum dado muda.

## Etapa 1b. Temas e Assuntos num gráfico, com papéis empilhados (FEITA em 01/10/2026; suíte 2371/0, aguardando conferência no navegador)

- Um cartão "Temas e Assuntos" com a alternância **Por tema | Por assunto** (mesmo componente de botões do Por pessoa / Por grupo). **Sem "Outras etiquetas"** (F1-D2).
- Os seletores "Papel do tema" e "Papel do assunto" saem **deste gráfico**. "Papel do tema" continua na linha do tempo e na matriz.
- Barras empilhadas: principal em cor forte, secundário em cor fraca, indefinido com preenchimento bem claro e **contorno tracejado** (a leitura não depende só da cor). Legenda clicável do Chart.js liga e desliga cada papel.
- Ordenação padrão pelo **total** da barra (a soma dos três papéis), que é exatamente o número da antiga barra "Todos". Invariante testada: total empilhado = contagem antiga.
- Dados: nova `agregarPorPapel({ base })` em `estatisticas-dados.js`, devolvendo `{ labels, principal, secundario, semPapel }`. **Lê `texto.temas` por id** (`nomesTemasPorPapel`) e `assuntosComPapel`, **nunca o espelho `sinalizacoesTema`**. Isso já alivia a Fase 2.
- Clique no segmento: abre a lista com o prefixo do papel (`temaprincipal:`, `temasecundario:`, `temasempapel:`, `assuntoprincipal:`, `assuntosecundario:`, `assuntoindefinido:`). `bindDrillDownBarra` só entrega o rótulo hoje; precisa entregar também o índice do conjunto de dados.
- Corte por mínimo de aparições e "Ocultar" mantêm as chaves `temas` e `assuntos` (a matriz reaproveita a chave `temas`). O mínimo vale para o total.
- Tooltip: papel, contagem e porcentagem do total de textos, como hoje.
- **Etiquetas por tipo (Tom, Estilo etc.):** fora desta etapa. A 1b não mexe nelas e nada some com ela (o cartão de hoje já mostra só Tema). Ver Fase 8.

Testes: soma dos segmentos = total antigo; para cada segmento de cada papel, a lista aberta tem o mesmo número do segmento (o mesmo teste de consistência que existe para Local); um texto com o mesmo Assunto por dois Temas de papéis diferentes conta uma vez, no papel efetivo.

Pronto quando: suíte verde, os dois seletores de papel saem do gráfico de barras, e o Victor confere no navegador (cores nos modos claro e escuro, tracejado legível, legenda, clique).
Reversão: reverter o zip da etapa; nenhum dado muda.

## Etapa 1c-0. Campos de identidade cis/trans e cor/raça na Pessoa (FEITA em 06/10/2026; suíte 2868/0, aguardando conferência no navegador)

Feito: dois selects no modal da Pessoa (`ps-identidade-cis-trans`, `ps-cor-raca`), gravados e relidos em `forms.js`; `migrarPessoasIdentidade` no carregamento e no `importarDB`; `mesclarPessoas` preenche só o vazio do destino; linha discreta no cartão da Pessoa (só quando preenchido). **Fora, por decisão a confirmar:** exportação por texto e Importação Aditiva, porque o cadastro da Pessoa (nem o `genero`) viaja por esses caminhos hoje; ver `schema.md` e F1-D7 em `decisoes.md`. Teste: `tests/pessoa-identidade-cor-raca.test.js` (14).

Pré-requisito do botão cis/trans do gráfico de gênero (F1-D6, decidido).

- Dois campos novos na Pessoa, **com as mesmas listas fechadas do Autor**: `identidadeCisTrans` (`IDENTIDADES_CIS_TRANS`: Cisgênero, Transgênero, Não se aplica) e `corRaca` (`CORES_RACA_AUTOR`: Branca, Preta, Parda, Amarela, Indígena). Vazio = não documentado, nunca "confirmadamente cisgênero" nem "confirmadamente branca". Preencher só onde a pessoa se declara ou a biografia documenta, como já é regra no Autor.
- Cadeia inteira (licoes-de-sessao): modal da Pessoa (`modais/modal-pessoa.html`, `forms.js` ~470 e ~559), salvar, tabela/coluna e busca de Pessoas se existirem, exportação (`.md`, CSV, JSON), importação (aditiva e backup antigo sem o campo), `schema.md`, `decisoes.md` e os `docs/*-for-ai*.md` que descrevem Pessoa.
- Sem migração: Pessoas existentes ficam com o campo vazio.
- Testes: salvar e reabrir a Pessoa; exportar e importar; backup antigo abre sem erro.

Pronto quando: suíte verde e o Victor consegue preencher os dois campos no modal e vê-los exportados.
Reversão: reverter o zip da etapa; os campos somem e nada mais depende deles.

## Etapa 1c. "Por gênero" em Pessoas (FEITA em 06/10/2026; suíte 2908/0, aguardando conferência no navegador)

Feito: terceiro botão "Por gênero"; botão "Considerar cis/trans" (padrão desligado, guardado); painel "⚧ Gênero" em "Por pessoa" (e o de Identidade quando o botão está ligado); cartão separado de gênero removido (HTML, tela, `agregarPorGeneroPessoa`, testes). Decisões minhas, a confirmar, em `decisoes.md` (F1-D8). Teste: `tests/estatisticas-pessoas-genero.test.js` (24). Texto original do plano abaixo.

- Alternância **Por pessoa | Por grupo | Por gênero**. O cartão separado "Gênero das pessoas retratadas" sai (HTML, bindings, chaves `generos-pessoa`, testes). Preferências antigas guardadas ficam inertes, sem migração.
- **Botão ligável e desligável "Considerar cis/trans"** (F1-D3), padrão desligado. Desligado: barras por Gênero, como hoje. Ligado: barras por Gênero combinado com a identidade; vazios viram "(Identidade não documentada)". Estado guardado entre sessões, como as outras preferências da aba.
- Em "Por pessoa": novo filtro de **Gênero**, ao lado do de Grupo, mesmo padrão (vazio = sem restrição; combinam por E). Valores: o texto literal do campo livre (cada variação é um valor), mais "(Sem gênero definido)". O botão cis/trans acrescenta um filtro de identidade quando ligado.
- Dados: estender `agregarPorPessoa` com `modo: 'genero'`, `generos` e `considerarCisTrans` (reaproveita a lógica de `agregarPorGeneroPessoa`). Contagem continua **por aparição**, igual ao resto da aba. `getModoGraficoPessoas` passa a aceitar `'genero'`; novo par `getGenerosFiltroPessoas` / `definirGenerosFiltroPessoas`.
- Gênero é campo livre ("mulher", "Mulher" são dois valores). Com cis/trans num campo próprio, o "mulher cis" deixa de ser problema de dado. Falta só decidir se o filtro compara sem caixa nem acento (sugestão: sim, para o filtro; a barra continua literal como hoje).

Pronto quando: suíte verde; no navegador, os três modos, o botão cis/trans ligado e desligado, e o filtro se combinando com o de Grupo.
Reversão: reverter o zip da etapa.

## Etapa 1d. Soma no fim da coluna e total por linha na matriz (FEITA em 06/10/2026; suíte 2918/0, aguardando conferência no navegador)

Feito: coluna final "Total (soma da linha)" + "Textos com a pessoa/o grupo/o personagem"; rodapé "Aparições de pessoas/personagens (soma da coluna)" (não existe em Grupos) + "Textos com o tema"; texto de ajuda. Detalhes e escolhas minhas em `decisoes.md` (F1-D9). Teste: `tests/estatisticas-cruzamentos-totais.test.js` (10). Texto original do plano abaixo.

- Rodapé da matriz de Pessoas: linha "Aparições de pessoas (soma da coluna)" e linha "Textos com o tema" (F1-D4). Na matriz de Grupos, só "Textos com o tema".
- **Total por linha** (decidido): coluna final "Total (soma da linha)" e, ao lado, "Textos com a pessoa" (Grupos: só "Textos com o grupo"). A soma da linha conta pares texto e tema, então o texto de ajuda deve dizer isso.
- A soma respeita as colunas escolhidas e o mínimo de aparições. As linhas da matriz são todas as pessoas com coocorrência (sem corte), então a soma é completa.
- Teste: um texto com 3 pessoas e 1 tema dá soma 3 e textos 1; soma da coluna = soma das células; soma da linha = soma das células da linha; a matriz de Grupos com subgrupo não exibe a soma da coluna.
- Estilo: rodapé com borda superior e negrito, legível no modo escuro; o texto de ajuda abaixo da tabela explica a diferença entre as linhas.

Pronto quando: suíte verde e conferência no navegador (matriz larga, rolagem horizontal com o rodapé e a coluna final alinhados).
Reversão: reverter o zip da etapa.

## Ordem e como parar

1a, 1b, 1c-0, 1c, 1d, nesta ordem, **sem exigir sessão única**: cada etapa termina com a suíte verde e o app utilizável. Nenhuma decisão pendente bloqueia a fase: pode começar pela 1a. Depois da Fase 1 vêm a Fase 2 e a 2b (`plano-central.md`); nada aqui depende delas nem as bloqueia.

## Riscos

| Risco                                                                                                                  | Como pegar                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Quebrar quem apontava para a aba antiga                                                                                | `grep estatisticas-temas-pessoas` em tudo; teste que abre cada aba nova |
| Soma dos segmentos diferente da barra antiga                                                                           | teste de invariante da 1b                                               |
| Código novo voltar a ler um espelho (`sinalizacoesTema`; na Fase 2b, também `sinalizacoesTerritorialidade` e `idioma`) | revisar na 1b: tudo por `temas` e papel (importa para a Fase 2)         |
| Barra tracejada ilegível no modo escuro                                                                                | conferência manual na 1b                                                |
| Soma da matriz de Grupos contar pessoa em dobro                                                                        | decisão F1-D4: não exibir ali                                           |
| Campos novos da Pessoa não chegarem a todas as saídas                                                                  | cadeia inteira na 1c-0 (modal, salvar, exportar, importar, docs)        |
