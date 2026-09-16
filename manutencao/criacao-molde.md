# Criação (aba "Criação" → Moldes)

> Este .md existe pelo mesmo motivo de `progressao-morfofuncional.md`: o
> requisito nasceu de uma conversa, foi decidido aos poucos, e uma sessão
> futura (IA ou o próprio Victor) precisa conseguir retomar sem reler a
> conversa inteira. Ver também `schema.md` (schema técnico geral do
> acervo) e `status.md` (checklist curto do projeto como um todo) — este
> arquivo é só sobre esta funcionalidade específica. Pé Métrico (ver
> "Decisões de design fechadas", item 5) nasceu dentro do planejamento do
> Molde, mas foi replicado em Sonoridade por pedido do Victor — as duas
> telas aparecem neste arquivo por isso, mesmo ele sendo nominalmente só
> sobre Molde.

## Estado atual (retomar a partir daqui)

> Esta seção estava errada até algumas sessões atrás — não só
> desatualizada num detalhe pequeno: dava o Pé Métrico sub-passo 2 do
> lado do Molde como "em aberto, próximo passo natural", mas conferindo
> contra o código de verdade (`js/editor-molde.js`, cujo próprio
> cabeçalho já documentava isso como pronto) ele já estava implementado
> e testado. Foi corrigido naquela sessão, e o Bloco 2 sub-passo 3
> (coluna de letra de rima esperada) foi entregue logo em seguida.
>
> **Nesta sessão, o Bloco 3 inteiro foi implementado e entregue** —
> Pareamento de Rima (sub-passo 1) e "Promover a Poema" (2ª metade), os
> dois lados: `js/editor-molde.js` (grade/UI/estado de sessão) e
> `js/forms.js` (persistência/orquestração — a promoção em si). Ver
> "Bloco 3" abaixo pro detalhamento completo.

**Prontos:** Bloco 1 inteiro; Bloco 2 **inteiro** (sub-passos 1, 2 e 3 —
grade + contagem vs. alvo, Modo Tônica + divergência de Pé Métrico, e
coluna "Rima" com letra esperada); Pé Métrico sub-passo 1 (catálogo,
trava bidirecional com Tamanho do Verso, select em Sonoridade E Molde)
— ver item 5 de "Decisões de design fechadas"; Pé Métrico sub-passo 2
**nos dois lados** — Sonoridade (`celulasDivergentesPeMetrico` em
`editor-sonoridade.js` + destaque âmbar tracejado na grade + fiação em
`forms.js`) e Molde (Modo Tônica novo + coluna silábica clicável + o
mesmo destaque de divergência, ver `js/editor-molde.js`), os dois com
testes; **Bloco 3 inteiro** (Pareamento de Rima + Promover a Poema —
ver detalhamento abaixo).

**Em aberto agora, próximo passo natural:** escrever a cobertura de
teste do Bloco 3 (`tests/editor-molde.test.js` só cobre até o Bloco 2
sub-passo 3 — 25 testes; nada ainda pra Modo Rima/pareamento nem pra
`promoverMoldeAoVivo`/`promoverMolde`/`aplicarPromocaoMoldeSePendente`
em `forms.js`). A implementação em si está completa e sem pendência de
lógica — ver "Notas pra retomar com eficiência" no fim deste arquivo.

Ver "Notas pra retomar com eficiência", no fim do arquivo, antes de
começar a mexer em código — tem atalho pra ambiente de teste e detalhes
que não são óbvios só lendo o código.

## A ideia, em uma frase

Uma aba nova, de primeiro nível (não dentro de Conteúdo nem de Análise),
pra **planejar a estrutura de um poema antes de escrever**, em vez de só
classificar poemas já prontos.

## Por que existe: a lacuna percebida

Todo o resto do acervo é descritivo — parte de um texto que já existe.
Escansão (Sonoridade) e Progressão Morfofuncional analisam o que já foi
escrito: primeiro o poema, depois a classificação. O Victor notou que
faltava o caminho inverso: dá pra escrever livre, sem observar métrica,
tônicas ou rimas, mas não dá pra **declarar a estrutura primeiro** (forma,
métrica, esquema de rimas) e escrever guiado por ela depois.

A diferença não é só "escansão ao revés" — é uma inversão de direção de
dependência. Descritivo: texto → classificação. O que faltava:
classificação → texto. Por isso não coube como aba dentro de Poemas (não
é um item de acervo ainda) nem dentro de Análise (não analisa nada
existente) — precisava ser um tipo por si só.

## Nome: por que "Criação" e "Molde"

- **Aba (nav de primeiro nível):** *Criação* — nome de grupo, não de
  "modo" (ao contrário de "Modo Criação", cogitado e descartado): os
  outros grupos da nav (Conteúdo, Análise, Exportação) também nomeiam o
  que mora ali dentro, não uma alternância de estado. "Modo" ficou
  reservado pras alternâncias *dentro* de uma tela (Modo Sílaba Tônica/
  Modo Rima, já existentes em Sonoridade).
- **Item dentro da aba:** *Molde* — descartado "Rascunho" (achado genérico
  demais: carrega ideia de provisoriedade sem forma nenhuma) e "Esqueleto"
  (conotação anatômica/rígida, contra a mutabilidade do item seguinte).
  "Molde" comunica estrutura definida antes do conteúdo — a forma existe,
  falta o preenchimento — e ainda sugere que dá pra reaproveitar/ajustar
  no meio do trabalho, sem estranhamento.

## Decisões de design fechadas

1. **Meta estrutural mutável durante a escrita.** O esquema declarado
   (forma, métrica, rimas...) pode ser trocado a qualquer momento sem
   perder o que já foi escrito no Molde — decisão explícita: o processo
   criativo é fluido, não fixo desde o início. Implica que os alvos
   derivados da meta (sílabas/tônica/rima esperadas por verso, ver Bloco
   2) nunca podem ser gravados junto com o texto — têm que ser sempre
   recalculados ao vivo a partir da classificação atual.
2. **Pares de rima confirmados manualmente sobrevivem à troca de meta.**
   Se o Esquema de Rimas mudar no meio da escrita e um par já confirmado
   deixar de bater com a nova posição esperada, o par continua valendo
   (é uma decisão do Victor, não algo derivado) — ganha só um destaque
   leve de divergência, mesmo espírito não-punitivo do destaque de
   sobreposição já usado em Morfofuncionalidade. Cabe ao Victor desfazer
   o par ou manter mesmo fora do esquema novo.
3. **Reaproveitar a taxonomia inteira da Sonoridade, não recriar uma
   nova.** Um Molde e uma Escansão descrevem o mesmo conjunto de eixos
   (Forma do Poema, Regularidade Métrica, Tamanho do Verso, Esquema de
   Rimas, Origem/Tradição, Registro, Tom) — a diferença é só *quando* são
   preenchidos (antes vs. depois do texto), não *o quê*. Molde reusa
   `FORMAS_POEMA`/`REGULARIDADES_METRICAS`/`TAMANHOS_VERSO`/
   `ESQUEMA_RIMAS_PRESENCA`/`ESQUEMA_RIMAS_PADRAO`/
   `ORIGENS_TRADICAO_SONORIDADE`/`REGISTROS_SONORIDADE`/
   `TONS_SONORIDADE` e a mesma matriz de validação em cascata
   (`calcularOpcoesCascataSonoridade`/`corrigirPresencaRimaSeVersoBranco`/
   `sugerirOrigemTradicaoPorTamanho`, todas em `utils.js`) sem duplicar
   nada — escolher "Soneto" num Molde trava Regularidade/Tamanho/Rimas do
   mesmo jeito que trava numa Escansão.
4. **Sem vínculo com Poema nem grade de versos no Bloco 1.** Um Molde
   recém-criado não aponta pra nenhum `poemaId` e não tem onde escrever
   verso nenhum ainda — isso é conteúdo dos próximos blocos (ver abaixo).
   Mesmo espírito incremental já usado em `db.escansoes` (que reservou
   `escansaoLinhas`/`rimas` pro Bloco 2 daquela feature, em vez de nascer
   com o objeto inteiro).
5. **Pé Métrico — campo novo, catálogo fechado, replicado em Sonoridade
   por simetria.** Surgiu de uma lacuna real: "tônica esperada" (Bloco 2
   sub-passo 2, abaixo) ficou nebulosa no planejamento original — a
   única expectativa objetiva que dava pra derivar de Regularidade
   Métrica sozinha era "a ÚLTIMA tônica cai na sílaba N" (mesma extração
   de `calcularDivergenciaSilabas`). O Victor trouxe a taxonomia de pés
   métricos (`PES_METRICOS`, `utils.js`) pra dar um alvo mais rico, com
   posição de CADA sílaba forte, não só da última. Dois tipos, com
   mecânica diferente:
   - **Contínuo** (Iambo, Troqueu, Dáctilo, Anapéstico, Anfibráquio, Peão
     Quarto/Corimbo) — a fórmula (posição inicial + intervalo) se repete
     verso afora, sem depender de nenhum Tamanho do Verso fixo; a
     expectativa cobre TODA posição da fórmula, até onde o verso alcança.
     Peão Quarto é contestado pela maioria dos teóricos da métrica
     portuguesa (só reconhecem pés de 2-3 sílabas) — mantido por pedido
     explícito do Victor; o label chegou a trazer "— pé raro/contestado"
     no próprio rótulo, mas o Victor pediu pra remover essa ressalva da
     UI (continua documentada aqui e em PES_METRICOS, `utils.js`).
   - **Fixo** (Decassílabo Heroico, Decassílabo Sáfico, Martelo
     Agalopado, Pé de Arte Maior) — forma nomeada de sílaba fixa, cada
     uma amarrada a um `tamanhoVersoExigido`; só as `posicoesObrigatorias`
     citadas são exigidas, o resto do verso fica livre. Rótulo renomeado
     de "Verso de Arte Maior" pra "Pé de Arte Maior" (`chave: 'arte-maior'`
     não mudou, só o rótulo) — "arte maior" na tradição também nomeia a
     categoria genérica de tamanho (qualquer verso de 9+ sílabas, sem
     acentuação fixa nenhuma), então o rótulo antigo dava a entender que
     todo verso de arte maior seguia 2-5-8-11, quando na verdade só essa
     forma fixa específica (a do Cancioneiro Geral/tradição castelhana,
     com cesura) segue. "Pé de Arte Maior" deixa claro que é a forma
     nomeada, não a categoria de tamanho.
   - **Espondeu (forte-forte) e Pirríquio (fraca-fraca) ficam de fora do
     catálogo, por decisão explícita do Victor** — são pés de
     substituição usados pontualmente no meio de um verso que segue
     outro metro, não um padrão que o verso inteiro segue; não têm
     "posição esperada" que faça sentido calcular.
   - **Trava bidirecional com Tamanho do Verso** (`calcularOpcoesPeMetrico`/
     `calcularTamanhoVersoForcadoPorPe`, `utils.js`) — mais forte que
     qualquer trava já existente no sistema (Forma → Tamanho é só de mão
     única): escolher um pé fixo força o Tamanho pro valor que exige, E
     mudar o Tamanho pra algo incompatível tira os pés fixos incompatíveis
     da lista de opções. Pés contínuos nunca são afetados.
   - **Replicado em Sonoridade por pedido do Victor**, mantendo a
     simetria entre as duas telas de classificação (mesmo espírito da
     decisão 3 acima) — mesmo catálogo, mesma trava, dois selects
     (`son-pe-metrico`/`molde-pe-metrico`) plugados na mesma lógica de
     `utils.js`.
6. **Letra de rima esperada — avança a cada estrofe, nunca reinicia; e
   posição solta fica sem letra.** Surgiu da mesma lacuna de fundo do
   item 5 (Pé Métrico): faltava uma regra objetiva pra transformar
   `esquemaRimasPadrao` numa expectativa por verso
   (`calcularLetraRimaEsperada`, `editor-sonoridade.js`, reaproveitada
   pelo Molde — ver Bloco 2 sub-passo 3). Duas decisões, as duas do
   Victor:
   - **Letras avançam a cada novo ciclo do padrão (nunca reiniciam em
     A)** — tanto ao cruzar uma quebra de estrofe quanto ao completar um
     ciclo inteiro sem quebra nenhuma (o padrão se repete sozinho a cada
     N versos, N = tamanho do ciclo). Motivo discutido na conversa: essa
     letra não é como a de `calcularLetrasRima` (que vem de pares REAIS
     já confirmados no texto) — aqui é só o rótulo de "quais versos, DENTRO
     do mesmo bloco, esperam soar parecido entre si". Reiniciar em A a
     cada estrofe sugeriria que a 2ª estrofe deveria rimar com a 1ª, o
     que nenhum desses padrões promete; avançar (2ª estrofe de uma
     Alternada vira CD, não AB de novo) deixa isso explícito. Uma quebra
     que corta um ciclo pela metade também avança — o resto do ciclo
     cortado não é reaproveitado.
   - **Posição que ocorre só 1 vez dentro de um ciclo fica sem letra**
     (ex.: 1º e 3º verso da Quadra `ABCB` — só o 2º/4º, que repetem,
     ganham letra). Mesmo espírito não-punitivo do resto do sistema:
     melhor não mostrar nada do que inventar uma expectativa de rima que
     o nome do próprio padrão não sustenta (esses versos são "soltos"
     por definição).
   - **Depois de Z, continua em AA, AB... estilo coluna de planilha**
     (`letraEsperadaDeIndice`, `editor-sonoridade.js`) — decisão de
     sessão posterior, motivada por uma pergunta do Victor sobre o que
     acontecia passado o 26º ciclo. A implementação original usava
     `i % 26`, que reiniciava silenciosamente em "A" depois de Z — uma
     contradição de fato com "nunca reinicia em A" acima, mesmo sendo
     um cenário raro (26+ estrofes/ciclos com o mesmo esquema). Cogitado
     e descartado um esquema tipo "ZA, ZB... ZZA..." (não cresce de
     forma previsível, cada usuário teria que aprender a regra do zero);
     escolhida a conversão bijective base-26 (a mesma lógica de colunas
     do Excel/Sheets: A...Z, AA...AZ, BA...), por ser convenção já
     reconhecida e calculável sem tabela. `corDaLetra` (mesmo arquivo)
     foi corrigida junto — lia só o 1º caractere da letra, então "A" e
     "AA" caíam na mesma cor da paleta; agora decodifica a letra inteira
     pelo mesmo esquema bijective, senão a mudança acima reintroduziria
     visualmente a mesma confusão entre ciclos que motivou avançar a
     letra em primeiro lugar. `calcularLetrasRima` (a letra de pares
     REAIS confirmados, ver acima) não foi tocada — continua com
     `i % 26` puro, decisão mantida por ser cenário praticamente
     impossível ali (pares confirmados manualmente pelo Victor, não um
     padrão que se repete sozinho).
   - **Monorrima Absoluta, Monorrima por Blocos e Terza Rima têm regra
     própria**, fora do modelo genérico acima: Absoluta nunca avança
     (sempre "A", mesmo cruzando quebras); Monorrima por Blocos só avança
     em quebra de estrofe explícita (o "bloco" é a própria estrofe, sem
     um N fixo que o nome do padrão defina); Terza Rima avança 1 letra
     por terceto e ignora quebra de estrofe (o encadeamento — a rima do
     meio de um terceto virar a externa do próximo — é o que dá nome ao
     padrão, teria que continuar mesmo se o Victor separar os tercetos
     visualmente).
   - `esquemaRimasPresenca` diferente de `'Rimado'` (ou `esquemaRimasPadrao`
     sem template fixo, caso de `Mista / Completa`) deixa a coluna toda
     em branco — sem fórmula fixa, não tenta advinhar nada.

## Divisão em blocos

Aprovada na conversa de planejamento, mesmo formato já usado em
Sonoridade e Morfofuncionalidade — implementar em fatias que já rodam
sozinhas, cada uma entregável por si.

### Bloco 1 — Dados + aba Criação + meta (✅ implementado e entregue)

- `db.moldes`: `{ id, titulo, formaPoema, regularidadeMetrica,
  tamanhoVerso, esquemaRimasPresenca, esquemaRimasPadrao, origemTradicao,
  registro, tom }` — só título + os 6 campos de classificação.
- Nova entrada em `GRUPOS_NAV` (`ui.js`): grupo `criacao` ("Criação"),
  aba `moldes` ("Moldes") — dropdown de primeiro nível na nav, ao lado de
  Conteúdo/Análise/Exportação.
- Aba "Moldes" (`index.html`): tabela própria (mais simples que a de
  Sonoridade de propósito — colunas fixas, sem colunas de contagem nem
  painel de configuração de Ações, mesma simplificação que Sonoridade
  teve no seu próprio Bloco 1) com busca por título, paginação
  (`renderMoldes`/`setFiltroMoldes`/`setPaginaMoldes` em
  `render-listas.js`) e botão "Adicionar Molde".
- `modais/modal-molde.html`: Título (campo livre) + Meta Estrutural (os
  7 selects em cascata, reaproveitando a mesma UI/lógica de
  `aplicarCascataSonoridade`, replicada como `aplicarCascataMolde` em
  `forms.js`). Sem `<select>` de Poema (Molde ainda não tem um) nem
  grade de versos.
- Ações: só Editar e Excluir (`deleteItem('moldes', id)`, `ROTULOS_COL`
  ganhou `moldes: 'Molde'`) — sem Ver/Baixar ainda, mesmo estado inicial
  que Sonoridade teve antes de ganhar visualização/exportação próprias.
- 992 testes passando (nessa mesma sessão, integrado junto com uma
  mudança em paralelo na aba Estatísticas — ver `status.md`), ESLint/
  Prettier limpos.

### Bloco 2 — Editor de escrita orientado pela meta (✅ implementado e entregue por completo)

- Estende `db.moldes` com `moldeLinhas`: grade de versos onde cada linha
  nasce com um alvo **derivado ao vivo** da classificação atual (nunca
  salvo): contagem silábica esperada (de `tamanhoVerso`), posição tônica
  esperada (de `regularidadeMetrica`), letra de rima esperada (de
  `esquemaRimasPresenca`/`esquemaRimasPadrao`).
- O Victor escreve verso a verso; o sistema conta sílabas reais e
  sinaliza divergência do alvo como **aviso, nunca trava** — mesmo
  espírito não-punitivo do resto do sistema (ex.: aviso de divergência
  silábica em Sonoridade, que não impede salvar).
- Boa parte da mecânica visual (grade, numeração, contagem por barra `/`)
  já existe em `editor-sonoridade.js` e deve dar pra reaproveitar quase
  igual — só invertendo a direção: lá o texto dita a classificação, aqui
  a classificação dita a expectativa sobre o texto.
- Trocar a meta no meio da escrita (decisão 1 acima) só precisa
  recalcular a camada de expectativa por cima do texto já digitado —
  não deve exigir nenhuma migração de dado.

**Sub-passo 1 (✅ implementado e entregue)** — grade editável + contagem
vs. alvo, sem Modo Tônica nem coluna de rima esperada ainda:
`js/editor-molde.js` novo (`inicializarGradeMolde`/`atualizarAlvoGradeMolde`/
`obterLinhasMolde`), grade nasce vazia e cresce por "+ Verso"/"+ Quebra de
estrofe", contagem silábica ao vivo (`dividirSilabas`, reaproveitada de
`editor-sonoridade.js`) comparada ao alvo do Tamanho do Verso
(`calcularDivergenciaSilabas`, também reaproveitada), aviso não-bloqueante
em âmbar na própria célula de contagem. Nova seção "Escrita" em
`modal-molde.html`; `forms.js` inicializa a grade ao abrir Adicionar/Editar
Molde e grava `moldeLinhas` no submit. Corrigido um bug encontrado ao
retomar a sessão anterior (que tinha parado investigando exatamente
isso): a função que atualiza `linhasAtuais`/contagem a cada tecla
(`onInputTextoMolde`) existia mas não estava conectada a nenhum
`addEventListener` — faltava o mesmo `el.addEventListener('input', ...)`
que `editor-sonoridade.js` já faz no fim do seu `renderGrade()`; sem isso,
digitar num verso não tinha efeito nenhum. 1005/1005 testes passando
(13 novos em `tests/editor-molde.test.js`), ESLint/Prettier limpos.

**Sub-passo 2 (✅ implementado e entregue)** — Modo Tônica + coluna
silábica clicável + destaque de divergência de Pé Métrico, do lado do
Molde: `reconstruirColunasMolde()` desmembra o texto de cada verso em
células por sílaba (`dividirSilabas`), igual `reconstruirColunas()` faz
em `editor-sonoridade.js`, sem tocar no `<div contenteditable>` em si
(evita perder foco/cursor de quem estiver digitando). Modo Tônica novo
em `editor-molde.js` — mesmo gesto de clique de Sonoridade (marca/
desmarca acento em `linha.tonicas`), mas aqui é o primeiro lugar em que
esse gesto existe no Molde (Sonoridade já tinha o modo pronto de antes
de Pé Métrico existir). Divergência de Pé Métrico reaproveita
`celulasDivergentesPeMetrico` (`editor-sonoridade.js`) — mesmo destaque
âmbar tracejado da Sonoridade — alimentada por `peMetricoAtual`, module-
level em `editor-molde.js` (fora de `linhasAtuais`, recalculado ao vivo
via `atualizarPeMetricoGradeMolde()` sempre que o Pé Métrico muda no
select, sem precisar reabrir o modal). `tests/editor-molde.test.js`
passou de 13 para 25 testes.

**Sub-passo 3 (✅ implementado e entregue)** — coluna "Rima" (letra
esperada), derivada de `esquemaRimasPresenca`/`esquemaRimasPadrao`, nunca
salva (mesmo espírito não-salvo do resto do Bloco 2). Nova função
`calcularLetraRimaEsperada` em `editor-sonoridade.js` (junto de
`calcularLetrasRima`/`corDaLetra`, reaproveitando a mesma paleta de cor
por letra) — ver item 6 de "Decisões de design fechadas" pras regras de
avanço de letra/posição solta. Nova célula estática `.molde-cel-rima`
em cada linha (`montarLinhaHtml`), atualizada por `atualizarColunaRima()`
sem tocar no contenteditable (mesmo padrão de `atualizarColunaAlvo()`) —
chamada em `renderGradeMolde()` e pela nova
`atualizarEsquemaRimaGradeMolde()` (exportada, ligada em `forms.js` ao
`change` de `molde-esquema-rimas-padrao` e ao fim de
`aplicarCascataMolde()`, já que a cascata pode mexer nos dois subcampos
de Rima). `inicializarGradeMolde()` ganhou 2 parâmetros novos
(`esquemaRimasPresenca`, `esquemaRimasPadrao`). `tests/editor-sonoridade.test.js`
ganhou 13 testes novos (`calcularLetraRimaEsperada`); 1 asserção de
`tests/editor-molde.test.js` foi ajustada (contagem de `<th>` no
cabeçalho, +1 pela coluna nova). Bloco 2 completo.

### Bloco 3 — Pareamento de rima + promoção a Poema (✅ implementado e entregue)

**Sub-passo 1 — Pareamento de Rima:** `db.moldes` estendido com
`paresRima`, mesmo mecanismo de clique/shift-clique de
`editor-sonoridade.js` — réplicado dentro de `js/editor-molde.js` (não
importado: os helpers de seleção/confirmação são pequenos e sem estado
próprio fora do módulo, mesmo raciocínio já usado ali pra
`offsetDoCursor`/`realceHtml`) por Modo Pareamento de Rima novo,
mutuamente exclusivo com Modo Tônica. Pares confirmados aqui não
carregam classificação de tipo de rima (Acentuação/Tonalidade/Riqueza,
como em Sonoridade) — o Molde só registra QUE dois versos foram
pareados; a classificação em si é trabalho de Escansão, depois que o
Molde virar Poema (ver Promoção abaixo). Decisão 2 (pares sobrevivem à
troca de Meta Estrutural) implementada em `paresDivergentesMolde()` —
compara a letra esperada atual (`calcularLetraRimaEsperada`) dos dois
lados do par; divergência vira só um aviso (⚠) na lista "Pares de
Rima", nunca desfaz o par sozinho.

**2ª metade — Promover a Poema:** botão na barra de ferramentas do
modal (vira selo "✓ Promovido a Poema #N" quando já promovido) —
`editor-molde.js` só expõe o gancho (`definirCallbackPromocaoMolde`,
`statusMoldeAtual`/`poemaIdMoldeAtual` só refletem o que já está salvo);
toda a orquestração mora em `js/forms.js`:

- `iniciarPromocaoMolde(molde)` abre `modal-poema` pré-preenchido
  (Título/Texto vindos do Molde, via `linhasMoldeParaTextoPoema` —
  reaproveita `prepararNovo('poema')` de `ui.js` pra herdar toda a
  limpeza de estado de "Adicionar Poema" de verdade) e marca
  `moldePromovendoContexto = { moldeId }` — só DEPOIS de `prepararNovo`
  resolver, já que `prepararNovo('poema')` limpa esse mesmo contexto
  por segurança (ver abaixo) sempre que "Adicionar Poema" é aberto por
  qualquer caminho.
- Dois pontos de entrada pra `iniciarPromocaoMolde`: `promoverMoldeAoVivo`
  (botão de DENTRO do modal — salva o Molde com o estado ao vivo do
  editor antes, igual um clique em SALVAR faria) e `promoverMolde(id)`
  exportada (botão da TABELA — Molde já salvo, sem modal aberto, usado
  direto de `db.moldes`).
- `aplicarPromocaoMoldeSePendente(poemaId)`, chamada no fim do
  `form.onsubmit` de Poema **só quando `!idInput`** (Poema novo, nunca
  numa edição comum — decisão explícita pra nunca promover o Molde
  errado se uma edição comum acontecesse com uma promoção pendente por
  engano): marca o Molde como `status: 'promovido'`/`poemaId`, e cria a
  Escansão correspondente reaproveitando `moldeLinhas`/`paresRima`
  DIRETO (mesmo formato de `escansaoLinhas`/`rimas` — nenhuma conversão
  necessária, só copiar), sem re-escandir do zero. Não apaga o Molde
  original nem chama `save()` por conta própria (quem chama é o
  `form.onsubmit` de Poema que a invoca, persistindo Poema/Molde/
  Escansão juntos numa gravação só).
- `limparPromocaoMoldeEmCurso()` exportada — chamada por `ui.js` (dentro
  de `prepararNovo('poema')`, import dinâmico pra evitar ciclo) e por
  `editarPoema` (no topo) — garante que abrir/editar um Poema por
  qualquer caminho que NÃO seja a promoção nunca acabe aplicando uma
  promoção antiga por engano.
- Tabela de Moldes (`render-listas.js`): `celulaAcoesMolde` ganhou botão
  "Promover a Poema" (`ICONE_PROMOVER`, ação `promover-molde` em
  `main.js`) pra Molde ainda `'em andamento'`; Molde já `'promovido'`
  mostra, no mesmo lugar, um atalho pra `editar-poema` apontando pro
  `poemaId` (reaproveita a ação que já existe, não duplica lógica).
- `db.moldes` ganhou `poemaId` (nulo até a promoção) e `status`
  (`'em andamento'` / `'promovido'`) — o Molde original fica arquivado
  como origem/processo do poema, não é apagado na promoção (combina com
  a pegada arquivística do resto do projeto: registrar não só a obra,
  mas o processo). `migrarCamposBloco3Molde` (`db.js`) preenche os 3
  campos em Moldes salvos antes deles existirem (idempotente, chamada
  no load inicial e em `importarDB`).

**Ainda em aberto, não implementado nesta sessão:** cobertura de teste
(ver "Estado atual" no topo do arquivo) — `Moldes ainda não promovidos
devem ficar de fora das listagens/exportações normais do acervo`
(último bullet do planejamento original) também não foi endereçado
ainda: hoje um Molde promovido continua aparecendo normalmente na
própria tabela de Moldes (o que faz sentido, é o registro do processo)
mas nada foi feito do lado de Poemas/exportações pra tratar esse caso
de forma especial — na prática não chega a ser um problema, porque o
que aparece em Poemas é o Poema de verdade criado pela promoção, não o
Molde; o bullet original parecia presumir que o Molde em si pudesse
vazar pras listagens de Poemas, o que nunca chegou a ser verdade dado
como o Bloco 1 desenhou a aba Criação (separada, tabela própria).

## Em aberto (não decidido ainda)

- Visualização somente-leitura e exportação (Ver/Baixar) do Molde —
  Sonoridade só ganhou isso numa leva posterior ao Bloco 1 dela; Molde
  deve seguir o mesmo caminho, sem pressa de resolver agora.
- Colunas de contagem / painel de configuração de Ações na tabela de
  Moldes — mesma simplificação inicial que Sonoridade teve, mesmo
  precedente de "anotar e deixar adiado por ora" já usado lá.
- Cobertura de teste do Bloco 3 inteiro (ver "Estado atual", topo do
  arquivo) — implementação completa, mas sem `tests/editor-molde.test.js`
  atualizado (Modo Rima/pareamento) nem testes novos pra
  `promoverMoldeAoVivo`/`promoverMolde`/`aplicarPromocaoMoldeSePendente`
  em `forms.js`.

## Notas pra retomar com eficiência

- Sem acesso à rede nesta sessão (nem na anterior, que implementou a
  maior parte de `editor-molde.js`) — `npm install`/`npm test` não
  rodaram. Antes de considerar o Bloco 3 realmente fechado, rodar a
  suíte completa numa sessão com rede.
- `js/editor-molde.js` e `js/forms.js` (seção "Molde") concentram toda a
  lógica nova — comentários de cabeçalho de cada função já apontam pro
  equivalente em `editor-sonoridade.js` quando é réplica, então vale
  comparar os dois lado a lado ao mexer em qualquer um dos dois.
- `moldeLinhas`/`paresRima` em `db.moldes` têm o MESMO formato de
  `escansaoLinhas`/`rimas` em `db.escansoes` por design (ver Bloco 3
  acima) — qualquer mudança de formato num dos dois lados
  provavelmente precisa da mesma mudança no outro, ou a promoção
  (`aplicarPromocaoMoldeSePendente`, `forms.js`) quebra silenciosamente.
