# Fase 22: Leitura avaliativa (aba em Análise)

Planejada em 31/10/2026, só planejamento, a partir de conversa com o Victor. Não depende de outra fase: reaproveita os campos `autoclassificacao` (corações) e `autoavaliacao` (texto), que já existem. A linha da fase mora no `plano-central.md`.

- **Ideia (Victor, 31/10/2026).** Descobrir o que o atrai ou o faz gostar de um texto, para ter um método próprio de análise subjetiva. Começou como "critérios para ganho de estrelas" e mudou de rumo: critério presume que já se sabe o que vale, e aqui a pergunta é justamente essa. Os corações seguem como o juízo afetivo ("quanto eu gosto"); a aba ajuda a entender o porquê.
- **O que é.** Uma aba no grupo Análise, com o texto de um lado e um formulário do outro, todo por seleção. O formulário traz o que pegou (com peso), o que incomodou, se releria e se mostraria a alguém, mais uma linha livre. No fim, a tela sugere corações e quem decide é o autor. Com as leituras acumuladas, as Estatísticas mostram o padrão: o que costuma pegar forte nos textos de mais corações.
- **Por que não estrelas por critérios.** A decisão antiga (`decisoes.md`, "`autoclassificacao` (corações)") escolheu corações justamente para fugir da pretensão de nota técnica. Estrelas por critérios seriam essa nota técnica. Além disso, o sorteio de leitura usa a Classificação (4 corações ou mais é "preferido do autor"): trocar o sentido do campo mudaria o sorteio sem decisão.
- **Ponto de partida dos dados.** O backup de 30/10/2026 tem 291 poemas e 21 prosas, nenhum com corações. O padrão só aparece depois de algumas leituras; a aba é também o jeito de começar a classificar.

## O que o formulário traz

- **Onde pegou (10 itens, cada um com peso).** Só os que pegaram são marcados, e cada marcado recebe um peso: **leve**, **forte** ou **centro** (o que sustenta o texto). Três níveis grossos de propósito, para o formulário ser rápido.
    1. **Som e ritmo:** a cadência, a música, a rima que embala.
    2. **Palavra:** a escolha do vocabulário, a precisão.
    3. **Imagem:** a cena que fica na cabeça depois.
    4. **Ideia:** o raciocínio, o que o texto pensa.
    5. **Voz:** o jeito de quem fala, a personalidade, a intimidade.
    6. **Atmosfera:** o clima que o texto cria (melancolia, calma, tensão).
    7. **Surpresa:** a virada, o final, a quebra de expectativa.
    8. **Identificação:** "me vi ali".
    9. **Construção:** o texto bem armado, a economia, a força da composição.
    10. **Engenho:** a formulação certeira, a compressão, o jogo bem sacado, a ligação inesperada feita na hora de dizer.
- **O que incomodou (9 itens, sem peso).** **Clichê** (imagem ou expressão gasta), **Previsível** (o final se vê de longe), **Explica demais** (diz o que a imagem já disse), **Obscuro demais** (fechado, sem porta de entrada), **Forçado** (rima, emoção ou efeito empurrados), **Impreciso** (palavra vaga ou frouxa, o oposto de Palavra), **Frouxo** (composição sem tensão, com sobra), **Cansativo** (esgota ler) e **Superficial** (fica na superfície). Não há "longo demais" nem "curto demais": o tamanho é medida, o que importa é o efeito.
- **Releria? Mostraria a alguém?** Cada uma com sim, talvez ou não.
- **Avaliação (linha livre).** É o campo `autoavaliacao` do texto, lido e gravado no mesmo lugar, sem cópia: dá para editar na aba e no modal. Como o campo é único por texto, a linha **não** é por leitura: numa segunda leitura, a pessoa escreve por cima ou acrescenta.
- **Classificação (corações).** Ao terminar, a tela mostra a sugestão com o motivo em uma frase, e a pessoa aceita ou escolhe outro valor. O valor escolhido grava no `autoclassificacao` do texto. Se o texto já tem corações, a tela pergunta antes de trocar. Terminar uma leitura sem escolher corações nunca grava 0 por cima de um valor existente.
- **Como separar Palavra, Ideia e Engenho** (testes que o Victor pode usar ao preencher): se a graça sobrevive a uma paráfrase em palavras simples, estava na Ideia; se estraga ao trocar uma palavra por um sinônimo próximo, era Palavra; se estraga ao reescrever a frase em ordem direta mantendo as palavras certas, era Engenho.

## Nomes

| Hoje                            | Passa a se chamar                    | Onde                                                                    |
| ------------------------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| Autoavaliação (grupo do modal)  | Avaliação pessoal                    | Modais de Poema e Prosa; no Ver, o grupo "Avaliação do autor" também    |
| Autoavaliação (campo de texto)  | Avaliação                            | Modais, colunas, `.md`, Visualizar, docs                                |
| Autoclassificação (corações)    | Classificação                        | Colunas, tabela, modais, edição em massa, saídas, docs                  |
| (novo)                          | Leitura avaliativa                   | Aba no grupo Análise (sugestão: depois de Morfofuncionalidade)          |

**Só muda o que aparece na tela.** As chaves `autoavaliacao` e `autoclassificacao` e os prefixos de busca (`autoclassificacao:`, `coracoes:`) ficam como estão, sem migração. O que é voltado ao leitor não muda: na página do sorteio, "Só os preferidos do autor" continua, porque ali "autor" é como o leitor vê quem organiza o acervo. O acervo tem textos de terceiros e os corações valem para eles; por isso "autor" não é o termo, e "organizador" já é um papel em Livros e Coletâneas, daí "pessoal".

## Entregas

Cada entrega fecha sozinha e o app segue funcionando sem as próximas. A ordem vai do mais fácil ao mais difícil.

0. **Renomear o que aparece na tela.** Só rótulos, na tabela acima. Levantar no código antes: "Autoavaliação" aparece em uns doze pontos de tela (`colunas.js`, `exportar-md.js`, `visualizar.js` e os dois modais); "Autoclassificação" aparece em mais lugares, e a contagem inclui nomes de função, que não mudam. Quatro arquivos de teste citam os nomes e acompanham. Sem dado novo. Vem primeiro para a aba já nascer com os nomes certos.
1. **Lógica pura e testes.** Módulo novo sem DOM (sugestão: `js/leitura-avaliativa.js`) com as duas listas (ids estáveis, em minúsculas e sem acento), os três pesos, a validação de uma leitura e a regra da sugestão de corações (F22-D9). Se a F22-D10 for aceita, `db.leituras` entra em `db.js` com `getLeiturasDoTexto`, e `if (!db.leituras) db.leituras = []` na carga, como `escansoes`.
2. **A aba e a ligação.** "Leitura avaliativa" em Análise (botão em `index.html`, `abrirAba`, `main.js`), texto e formulário lado a lado, a linha livre ligada à Avaliação do texto, a sugestão de corações e a gravação na Classificação. Seguir o desenho de Sonoridade e Morfofuncionalidade. Rodar `tests/wiring-onclick.test.js`.
3. **A cadeia do dado novo** (se houver `db.leituras`). Excluir um texto leva as leituras junto; Mesclar; backup e restauração; Importação Aditiva; Esvaziar acervo; `.json`, `.md`, `.csv` e a Visualização. É a conferência dos sete elos do `CLAUDE.md`.
4. **Estatísticas do padrão.** O que pegou, ponderado pelo peso, por faixa de Classificação; e as **divergências**, os textos em que o valor escolhido difere do sugerido, porque mostram o que o formulário ainda não nomeia. Só faz sentido com leituras acumuladas. Depois, cruzar com as etiquetas da Fase 20 (Tom, Estilo, Domínio Imagético, Tradição): "quando me pega pelo tom, quais tons são?".
5. **Documentação.** Ajuda e FAQ, `schema.md`, `decisoes.md`, READMEs e o par `docs/leitura-avaliativa-for-ai.md` e `-pt-br.md` (F22-D14). Na última entrega, arquivar a fase em `plano-concluido.md`.

## Pontos de atenção

- **O sorteio lê a Classificação.** Gravar corações pela aba muda quem é "preferido do autor" no sorteio. A tela deve deixar claro que o valor escolhido é o do texto.
- **0 é "não avaliado"**, nunca nota (decisão antiga dos corações). A aba respeita isso: sem escolha, não grava.
- **Avaliação é campo único por texto**, as leituras são várias. Ver o item da linha livre acima.
- **Sugestão e círculo vicioso.** Se os corações saírem de uma fórmula sobre as respostas, o padrão das Estatísticas fica em parte combinado de antemão. A regra deve ser simples e visível, e a divergência entre sugerido e escolhido deve ser guardada.
- **Dado novo mexe em muitos elos.** Antes de qualquer migração ou campo novo, ler `manutencao/licoes-de-sessao.md`.

## Decisões em aberto

| Código  | Pergunta                                                                                | Sugestão                                                                                                                                                                                                                               | Bloqueia  |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| F22-D9  | Regra da sugestão de corações                                                           | Simples e visível, mostrando o motivo em uma frase. O Claude propõe na entrega 1 (por exemplo, a partir de Releria, Mostraria e do maior peso) e o Victor avalia antes de ligar. Guardar o sugerido ao lado do escolhido              | entrega 1 |
| F22-D10 | Onde guardar as leituras: tabela própria `db.leituras` (com `textoId` e tipo) ou lista no texto | Tabela própria, como `db.escansoes`: o histórico fica fora dos modais de Poema e Prosa, que já são grandes, e as Estatísticas leem uma lista só. Custo: a cascata de exclusão, Mesclar e importação (entrega 3)                          | entrega 1 |
| F22-D11 | Itens próprios nas duas listas                                                          | Começar com as listas de fábrica, fechadas, porque peso e Estatísticas dependem de itens estáveis. Itens próprios do Victor entram depois, guardados por nome, se o uso mostrar que faltam                                              | entrega 2 |
| F22-D12 | Quantos "centro" por leitura                                                            | Sem limite no começo; olhar no uso. Se "centro" virar sinônimo de "forte", limitar a um                                                                                                                                                | entrega 2 |
| F22-D13 | Onde ficam as Estatísticas do padrão                                                    | Um bloco na própria aba "Leitura avaliativa" primeiro; só se crescer, vira aba em Estatísticas                                                                                                                                         | entrega 4 |
| F22-D14 | Formato do doc `for-ai`                                                                 | Roteiro de perguntas para a IA entrevistar o autor perdido, e não uma lista de critérios para ela aplicar. A IA nunca preenche sozinha: oferece como sugestão para o autor revisar, como nos outros campos. Última entrega              | entrega 5 |

## Decisões tomadas

- **F22-D1:** não criar estrelas por critérios. Os corações seguem como o juízo afetivo, e a aba ajuda a entender o porquê (Victor, 31/10/2026).
- **F22-D2:** aba nova no grupo Análise, com o texto e o formulário lado a lado, tudo por seleção (Victor, 31/10/2026).
- **F22-D3:** o formulário tem Onde pegou, O que incomodou, Releria?, Mostraria a alguém? e a linha livre, ligada ao campo `autoavaliacao` do texto, sem cópia (Victor, 31/10/2026).
- **F22-D4:** "onde pegou" com 10 itens, incluindo Palavra (escolha do vocabulário, precisão) e Engenho (inteligência ao redigir), a pedido do Victor, que valoriza precisão linguística, inteligência ao redigir e força da composição. "O que incomodou" com 9 itens, com Cansativo e Superficial no lugar de "longo demais" (31/10/2026).
- **F22-D5:** peso em três níveis, leve, forte e centro, só em "onde pegou" (31/10/2026).
- **F22-D6:** a tela sugere corações e o autor decide; o escolhido grava na Classificação do texto (31/10/2026).
- **F22-D7:** várias leituras por texto, com data; a tela mostra só a última no começo (31/10/2026).
- **F22-D8:** nomes: grupo "Avaliação pessoal", campo "Avaliação", rótulo "Classificação" e aba "Leitura avaliativa". Só o que aparece muda; chaves e prefixos ficam (Victor aceitou as sugestões do Claude, 31/10/2026).

## Escolhas do Claude a confirmar

- (a) O nome "Leitura avaliativa" e a posição da aba, depois de Morfofuncionalidade.
- (b) Os rótulos curtos e as descrições dos itens das duas listas, tirados da conversa; ajustar ao ver na tela.
- (c) "Releria?" e "Mostraria a alguém?" com três respostas (sim, talvez, não), sem a pergunta "para quem".
- (d) O no-op de corações: terminar uma leitura sem escolher não grava nada.

## Do lado do Victor

Nada com código por enquanto. Quando a entrega 2 existir: preencher algumas leituras de textos que ama e de textos que não ama, e dizer se faltou algum item (o sinal é "pegou, mas nenhum desses diz o quê") e se Frouxo e Cansativo se confundem.
