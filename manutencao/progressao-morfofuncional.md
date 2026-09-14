# Progressão Morfofuncional (menu "Morfofuncionalidade")

> Baseado na conversa de referência "Estrutura textual para análise poética"
> (exportada de claude.ai em 13/09/2026). Este .md existe porque o requisito
> é complexo, foi decidido aos poucos ao longo de várias trocas, e uma
> sessão futura (IA ou o próprio Victor) precisa conseguir retomar sem
> reler a conversa inteira. Ver também `schema.md` (schema técnico geral
> do acervo) e `status.md` (checklist curto do projeto como um todo) —
> este arquivo é só sobre esta funcionalidade específica.

## A ideia, em uma frase

Uma quarta aba de Análise (ao lado de Escansão/Sonoridade, Conexões e
Estrutura do Livro), pra cadastrar **onde e como um poema se organiza
internamente** — não a métrica (isso é Sonoridade) nem os vínculos com
outros textos (isso é Conexões), mas a arquitetura argumentativa/formal
de dentro de um poema só: que tipo de texto espera certas seções (ex.:
soneto → oitava/sexteto, proposição/resolução) e onde, no texto real,
cada coisa acontece.

## Por que existe: o exemplo motivador (soneto)

O soneto tem uma expectativa estrutural conhecida: dois quartetos que
apresentam um problema (proposição) e um terceto/dístico final que
resolve (resolução) — e, no meio disso, um ponto de virada chamado
**Volta** (termo real da crítica literária, não inventado). O Victor
queria conseguir marcar isso num poema cadastrado, e também marcar
Templates reaproveitáveis pra estruturas que se repetem (soneto sendo o
primeiro caso, mas não o único).

## A virada conceitual do meio da conversa: Unidade ≠ Evento

A primeira ideia (uma entidade só, "Divisão", com 3 campos opcionais:
unidade estrófica, unidade discursiva, progressão dialética) não
sobreviveu ao primeiro exemplo real. O Victor notou, ao aplicar o
modelo no soneto: a Volta não tem estrofe própria nem é uma proposição
ou resolução — ela é outra categoria de coisa, no mesmo grupo de Tensão
e Síntese.

Daí a separação que ficou definitiva:

- **Unidade** — uma seção do texto que tem forma e função.
  Campos: `unidadeEstrofica` (Oitava, Sexteto, Quartetos...) +
  `unidadeDiscursiva` (Proposição, Resolução...).
- **Evento** — um movimento argumentativo/dramático pontual, sem forma
  própria. Campo: `progressaoDialetica` (Tensão, Volta, Síntese...).

Nenhuma das duas herda campo da outra. As duas têm cadastro **separado**
desde o início (não um formulário genérico que pergunta "isso é Unidade
ou Evento?") — mas a **leitura/exportação pode ser unificada** (uma
visão combinada por posição no texto, o que já é o espírito de
Sonoridade juntando grade silábica e rimas em resumos).

## Decisões de design fechadas (por item)

1. **Campos livres com sugestão, não lista fechada.** Ao contrário de
   Sonoridade (vocabulário universal de métrica), a nomenclatura de
   Estrutura Textual varia muito por forma — soneto usa Oitava/Sexteto,
   outras formas usam outros nomes. Os três campos
   (`unidadeEstrofica`/`unidadeDiscursiva`/`progressaoDialetica`) são
   texto livre com datalist de sugestões (mesmo padrão do campo Tipo de
   Intertextualidade), não select fechado.
2. **Posição (estrofe/verso) é sempre derivada automaticamente do texto
   do poema, nunca digitada.** Reaproveita a mesma lógica que
   `construirLinhasIniciais` (`editor-sonoridade.js`) já usa: quebra de
   linha em branco = nova estrofe, cada linha = verso. O usuário clica
   pra marcar posição, não digita número de estrofe/verso.
3. **Seleção fina de verso só faz sentido com uma única estrofe
   marcada.** Se uma Unidade/Evento aponta pra mais de uma estrofe (ex.:
   "Quartetos e Tercetos"), apontar versos específicos dentro dela fica
   ambíguo — então com 2+ estrofes marcadas, a seleção de verso trava em
   "todos". Com exatamente uma estrofe marcada, os versos dela ficam
   clicáveis individualmente (com atalho "todos").
4. **Sobreposição é esperada, não é erro.** Unidades e Eventos convivem
   livremente sobrepostos (ex.: "Resolução" cobrindo o terceto inteiro,
   "Volta" sendo só o primeiro verso dele, por cima). Isso vale pra
   **qualquer combinação** — Unidade×Unidade, Evento×Evento, Evento
   dentro de uma Unidade sem tocar fronteira nenhuma — não só o caso
   canônico de Evento cruzando a borda entre duas Unidades. O sistema
   não tenta julgar o que é "típico" ou "atípico" na tradição literária
   (isso é leitura do Victor, não é computável a partir de posição);
   ele só sinaliza que os itens se cruzam, com um destaque visual leve
   e neutro — nunca como aviso/erro, nunca diferenciado por tipo de
   combinação.
5. **Posição é sempre opcional, em Unidade e em Evento.** Não é caso de
   borda — é literalmente o estado inicial de qualquer item recém-criado
   por um Template (que salva só a classificação, nunca a posição).
   Bloquear o salvamento sem posição mataria o fluxo em duas etapas que
   o Victor quer (classificar tudo primeiro, localizar no texto depois,
   com calma). Itens sem posição ficam num estado "não posicionado" —
   visível, agrupado numa sublista separada, não escondido.
6. **Ordenação dos cartões: pela posição no texto, não por ordem de
   criação.** Quem aparece primeiro no poema aparece primeiro na lista
   (Unidades e Eventos cada um na sua lista). Itens "não posicionados"
   ficam numa sublista à parte, **depois** dos já posicionados (não
   antes) — a lista principal é organizada pelo texto, não por pendência.
7. **Overlap não pede feedback no momento de salvar.** Editar a posição
   de um item e ele passar a se sobrepor com outro existente não dispara
   nenhum aviso na hora — só reflete depois, visualmente, na lista.
8. **Templates.** Salvam só a classificação (`unidadeEstrofica`/
   `unidadeDiscursiva` das Unidades, `progressaoDialetica` dos Eventos),
   nunca a posição — aplicar um Template instancia os itens
   "não posicionados", prontos pro Victor ir clicando a posição de cada
   um no poema específico. Templates de fábrica (Soneto é o primeiro)
   vêm com `embutido: true` — só duplicáveis, não editáveis direto, pra
   não estragar o original.

## Terminologia final (evoluiu bastante ao longo da conversa)

O nome de trabalho "Estrutura Textual" foi descartado — "Estrutura" já é
o nome do botão existente no mesmo dropdown Análise (que significa
"Estrutura do Livro", hierarquia Livro→Partes→Seções — conceito
bibliográfico, nada a ver com isto aqui). Manter os dois lado a lado no
menu criaria ambiguidade toda vez que alguém dissesse "abre a aba
Estrutura".

Depois de descartar várias alternativas (Arquitetura Textual, Composição,
Organização Textual, Anatomia do Poema, Formofuncionalidade,
Formovimento, Forma e Progressão, Dialética Textual), o nome fechado
tem **dois níveis**, no mesmo espírito de "Sonoridade" (menu) → "Adicionar
Escansão" (botão, mais específico):

- **Menu (dropdown Análise):** *Morfofuncionalidade*
- **`<h2>` da página (mais completo que o menu — um degrau além do
  padrão de Sonoridade, decisão consciente do Victor):** *Progressão
  Morfofuncional*
- **Botão de ação:** *Adicionar Progressão*

Curiosidade registrada na conversa (o Victor perguntou, Claude
pesquisou): "Volta" é termo real e consagrado da crítica de soneto;
"Proposição"/"Resolução" é leitura recorrente mas sem nome único
universal; "Tensão"/"Síntese" é vocabulário crítico comum, às vezes
emprestado da tríade hegeliana. Não existe, até onde a pesquisa
encontrou, um framework com nome próprio que junte exatamente esses dois
eixos (Unidades separadas de Eventos, sobrepostos) do jeito que o Victor
modelou — a arquitetura de análise em si é síntese dele, montada com
peças reais da tradição. "Morfofuncional" foi escolhido em vez de
"Formofuncional" por já existir como termo real (anatomia/fisiologia,
relação forma-função de um órgão) e por "morfo-"/"morfologia" já ter
trânsito natural em teoria literária/linguística (ex.: Propp).

**Nota de desacoplamento:** os nomes de código (`estruturasTextuais`,
`templatesEstrutura`, `unidadeEstrofica` etc.) NÃO foram renomeados pra
bater com "Morfofuncionalidade"/"Progressão Morfofuncional" — mesmo
padrão já existente entre a aba "Sonoridade" (nome de exibição) e a
coleção `db.escansoes` (nome de código). O nome bonito é só de UI.

## Modelo de dados (schema)

```js
// db.estruturasTextuais — no máximo um registro por poema (mesmo
// espírito de db.escansoes), ver getEstruturaDoPoema em db.js
{
  id: 1,
  poemaId: 456,
  unidades: [
    {
      id: 'u1', // gerarId()
      unidadeEstrofica: 'Quartetos',      // texto livre, datalist
      unidadeDiscursiva: 'Proposição',    // texto livre, datalist
      posicao: { estrofes: [1, 2], versos: 'todos' }, // ou { estrofes: [], versos: 'todos' } = não posicionado
    },
  ],
  eventos: [
    {
      id: 'e1',
      progressaoDialetica: 'Volta',       // texto livre, datalist
      posicao: { estrofes: [4], versos: [1] }, // seleção fina só com 1 estrofe
    },
  ],
}

// db.templatesEstrutura — templates reaproveitáveis, sem posição
{
  id: 1,
  nome: 'Soneto',
  embutido: true, // true = de fábrica, só duplicável, não editável direto
  unidades: [
    { unidadeEstrofica: 'Quartetos', unidadeDiscursiva: 'Proposição' },
    { unidadeEstrofica: 'Tercetos', unidadeDiscursiva: 'Resolução' },
  ],
  eventos: [
    { progressaoDialetica: 'Tensão' },
    { progressaoDialetica: 'Volta' },
    { progressaoDialetica: 'Síntese' },
  ],
}
```

Regra de posição: `posicao.estrofes` vazio (ou ausente) = item "não
posicionado". Com `estrofes.length > 1`, `versos` é sempre `'todos'`
(seleção fina de verso só é válida com exatamente uma estrofe marcada
— ver item 3 acima).

## Desenho do modal (planejado, ainda não construído)

Mesmo esqueleto de `modal-sonoridade.html` (seção "Poema" reaproveitada
como está), com:

- **Seção Templates** — seletor (embutidos primeiro, depois os do
  usuário) + "Aplicar" (cria Unidades/Eventos não posicionados) +
  "Salvar como Template" (pega as Unidades/Eventos atuais, só a
  classificação, pede um nome).
- **Seção Unidades** — lista de cartões (mesmo espírito visual dos
  cartões de "Pares de Rima" da Sonoridade), cada um com
  `unidadeEstrofica` + `unidadeDiscursiva` + posição (ou destaque
  "não posicionado ainda"). "Nova Unidade" abre formulário inline (dois
  campos de texto com datalist + o seletor de posição compartilhado).
- **Seção Eventos** — mesmo padrão, só com `progressaoDialetica`.
- **Seletor de posição** (compartilhado pelas duas seções) — mostra o
  texto do poema já quebrado em estrofes/versos (derivado
  automaticamente), cada estrofe com checkbox; com exatamente uma
  estrofe marcada, os versos dela ficam clicáveis individualmente (com
  atalho "todos"); com duas ou mais, o seletor de verso trava em "todos".
- Overlap: destaque visual leve e neutro (borda/ícone discreto) nos
  cartões cuja posição se cruza com a de outro item, qualquer combinação.

## Etapas planejadas

1. **Modelo de dados** — `db.estruturasTextuais` + `db.templatesEstrutura`
   (com o template "Soneto" de fábrica), migrações, `getEstruturaDoPoema`.
2. **Lógica pura** (`js/estrutura-textual.js`) — derivar estrofes/versos
   do texto do poema, checar se um item está posicionado, checar
   sobreposição entre dois itens, ordenar por posição (com
   "não posicionados" ao final), aplicar Template, extrair classificação
   atual pra salvar como Template novo.
3. **Modal + tabela** — `modais/modal-morfofuncionalidade.html`, wiring em
   `index.html`/`ui.js`/`main.js`/`forms.js`/`render-listas.js`.
4. **Testes** da lógica pura (`tests/estrutura-textual.test.js`) e rodada
   completa da suíte.
5. *(Fora do escopo desta primeira leva, não descartado: exportação
   md/pdf/docx dedicada, como Sonoridade tem; visão combinada
   Unidades+Eventos numa "linha do tempo" só, mencionada na conversa como
   ideia de leitura unificada mas não desenhada em detalhe ainda.)*

## O que já foi feito

- `js/db.js`:
  - `db.estruturasTextuais` e `db.templatesEstrutura` adicionados ao
    estado inicial, com comentários documentando as regras acima.
  - Guards de migração (`if (!db.estruturasTextuais) ...`) pra bancos
    carregados sem esses campos.
  - `TEMPLATES_ESTRUTURA_EMBUTIDOS` (template "Soneto") +
    `migrarTemplatesEstruturaEmbutidos()` — reseeda sem duplicar, chamada
    tanto no boot do módulo quanto em `importarDB` (restauração de
    backup).
  - `db.estruturasTextuais`/`db.templatesEstrutura` incluídos em
    `importarDB` (import de backup JSON).
  - `getEstruturaDoPoema(poemaId)`.
  - `ROTULOS_COL.estruturasTextuais`/`ROTULOS_COL.templatesEstrutura` +
    `tituloEstruturaTextual()` (resolve pelo poema vinculado, mesmo
    padrão de `tituloEscansao`) — `deleteItem` funciona com a nova
    coleção via o caminho genérico (sem cascata própria, `data-action="excluir-item" data-tipo="estruturasTextuais"`).
- `js/estrutura-textual.js` — módulo novo inteiro, escrito nesta sessão
  ou na anterior (ver diff do zip pra confirmar de qual):
  - `construirEstrofesDoTexto`, `itemPosicionado`, `overlapEntre`,
    `detectarSobrepostos`, `ordenarPorPosicao`,
    `instanciarTemplateEstrutura`/`extrairClassificacaoParaTemplate`,
    `resumoPosicao` — lógica pura, testada.
  - Estado de edição do modal (`unidadesAtuais`/`eventosAtuais`,
    `inicializarEstruturaTextual`, `obterUnidadesAtuais`/
    `obterEventosAtuais`, `adicionarUnidade`/`adicionarEvento`,
    `removerUnidade`/`removerEvento`, `aplicarTemplateNoEstado`,
    `toggleEstrofeItem`/`toggleVersoItem`/`setVersosTodosItem`) +
    renderização dos cartões e do seletor de posição
    (`renderTudo`/`montarCartaoHtml`/`montarSeletorPosicaoHtml`).
- `tests/estrutura-textual.test.js` — 26 testes, todos passando
  (`node --test tests/estrutura-textual.test.js`).
- `index.html` — botão "Morfofuncionalidade" no dropdown Análise
  (`onclick="abrirAba('morfofuncionalidade')"`) + `<section
  id="morfofuncionalidade">` com busca por título do poema e a tabela
  (thead ID/Título · Unidades · Eventos · Ações, `tbody
  id="lista-estrutura-textual"`).
- `js/ui.js` — entrada `{ id: 'morfofuncionalidade', rotulo:
  'Morfofuncionalidade' }` em `GRUPOS_NAV` (grupo `analise`), entre
  Sonoridade e Estatísticas — sem isso o menu mobile e o destaque do
  grupo ativo na nav desktop não reconheciam a aba.
- `js/render-listas.js` — `renderEstruturaTextual()` +
  `setFiltroEstruturaTextual()`, no padrão simplificado do Bloco 1
  original de Sonoridade (sem seletor de colunas nem painel de ações):
  busca só por título do poema, ordena por título, célula de Unidades/
  Eventos mostra os itens já classificados separados por vírgula
  (`unidadeEstrofica · unidadeDiscursiva` / `progressaoDialetica`),
  Ações com editar (`data-action="editar-estrutura-textual"`) e
  excluir (`data-action="excluir-item" data-tipo="estruturasTextuais"`,
  reaproveitando o caminho genérico). Plugado em `renderLists()`
  (`render.js`).
- `modais/modal-morfofuncionalidade.html` — criado, esqueleto de
  `modal-sonoridade.html` reaproveitado (header com botões
  salvar/fechar, `<details class="campo-grupo">` por seção): Poema
  (select + aviso de substituição, mesmo padrão de Sonoridade),
  Templates (select + Aplicar + "Salvar como Template"), Unidades e
  Eventos (campo(s) livre(s) com datalist + botão "+", container onde
  `estrutura-textual.js` renderiza os cartões).
- `js/forms.js` — todas as funções de ponte: `popularSelectPoemasEstrutura`,
  `popularSelectTemplatesEstrutura`, `atualizarDatalistsEstruturaTextual`
  (datalist parte da semente do Soneto + cresce com valores já usados no
  acervo, mesmo espírito simplificado de `atualizarDatalistIntertexto`
  em `editor.js`, sem filtro por tipo dependente),
  `atualizarAvisoPoemaEstrutura`, `carregarEstrofesDoPoemaEstrutura`
  (troca de poema recalcula estrofes mas preserva classificação já
  digitada na sessão do modal), `prepararNovaEstruturaTextual`,
  `editarEstruturaTextual`, `aplicarTemplateEstruturaTextual`,
  `adicionarUnidadeEstruturaTextual`/`adicionarEventoEstruturaTextual`,
  `salvarComoTemplateEstruturaTextual`, `initFormEstruturaTextual`
  (`form.onsubmit` substitui o registro existente do poema, mesmo
  padrão de `initFormSonoridade`).
- `js/main.js` — import de tudo acima + de
  `toggleEstrofeItem`/`toggleVersoItem`/`setVersosTodosItem`/
  `removerUnidade`/`removerEvento` (direto de `estrutura-textual.js`);
  `registrarModal('modal-morfofuncionalidade', 'modal-morfofuncionalidade.html', initFormEstruturaTextual)`;
  entrada em `ACOES_LISTA` (`'editar-estrutura-textual'`); bindings em
  `window` — `prepararNovaEstruturaTextual`,
  `setFiltroEstruturaTextual` (debounced, mesmo padrão de
  `setFiltroSonoridade`), `aplicarTemplateEstruturaTextual`,
  `adicionarUnidadeEstruturaTextual`/`adicionarEventoEstruturaTextual`,
  `salvarComoTemplateEstruturaTextual`, e o mapeamento direto
  `toggleEstrofeEstrutura`/`toggleVersoEstrutura`/
  `setVersosTodosEstrutura`/`removerUnidadeEstrutura`/
  `removerEventoEstrutura` → funções de `estrutura-textual.js` (sem
  wrapper, assinatura já bate com o que o HTML gerado chama).

## Segunda leva (retomada após o teste manual do Victor)

Depois do teste manual (ver "O que falta" original, primeiro item),
Victor trouxe 3 pontos, os dois primeiros de escopo novo — ver
`conversa-referencia.md` (exportado de outra sessão) pra a pergunta
literal e as respostas:

1. **Overlap sem sinalização explícita** — o destaque (só um anel de
   cor na borda do cartão) mudava de cor mas não dizia o que aconteceu
   pra quem não conhece o sistema. **Corrigido pelo próprio Victor**
   em `js/estrutura-textual.js` (`montarCartaoHtml`): o anel trocou de
   âmbar pra cinza/slate (pra não parecer aviso/erro — item 4 do .md,
   overlap é esperado, não julgado) e ganhou um selo textual "⚭
   sobreposto" ao lado do resumo de posição, com `title` explicando a
   regra. Sem teste automatizado novo (é só HTML gerado, cobertura
   já existente de `detectarSobrepostos` continua valendo).
2. **Ver/Baixar em Morfofuncionalidade, igual Sonoridade** — resposta
   do Victor: sim, os dois. Implementado nesta sessão:
   - `js/exportar-estrutura-textual.js` (novo) — mesmos 4 formatos de
     `exportar-sonoridade.js` (.md/.pdf/.docx/.json), dispatcher
     `exportarEstruturaTextual(id, formato)`; `rotuloItem` exportado
     pra ser reaproveitado pela visualização (item abaixo), evitando
     duplicar o critério de título de Unidade/Evento.
   - `js/visualizar-estrutura-textual.js` (novo) — modal somente-
     leitura (`abrirVisualizacaoEstruturaTextual`/
     `baixarDoModalVisualizacaoEstruturaTextual`), espelhando
     `visualizar-sonoridade.js`: lista Unidades e Eventos (ordenados
     por `ordenarPorPosicao`) com rótulo + `resumoPosicao`, sem os
     controles de edição/posição do modal principal.
   - `modais/modal-visualizar-estrutura-textual.html` (novo) —
     esqueleto de `modal-visualizar-sonoridade.html`.
   - `js/main.js` — imports, `registrarModal('modal-visualizar-estrutura-textual', ...)`,
     entradas `ver-estrutura-textual`/`baixar-estrutura-textual` em
     `ACOES_LISTA`, binding `window.baixarDoModalVisualizacaoEstruturaTextual`.
3. **Menu de colunas/ações (⚙️), como em Sonoridade** — resposta do
   Victor: Ações sim ("com certeza, vale"), Colunas não ("acho que é
   tranquilo não trazer" — tabela continua com as 4 colunas sempre
   fixas). Implementado nesta sessão, reaproveitando o módulo genérico
   `acoes-coluna.js` (já compartilhado por Poemas/Prosas/Sonoridade)
   com a chave de tabela `'estrutura-textual'`:
   - `js/render-listas.js` — `celulaAcoesEstruturaTextual` reescrita no
     padrão de `celulaAcoesSonoridade` (só os botões ativos no painel,
     ordem Ver/Baixar/Editar/Excluir); `renderEstruturaTextual` chama
     `atualizarPainelAcoes('estrutura-textual', 'painel-acoes-estrutura-textual')`;
     listener de `acoes-coluna:alteradas` pra tabela `'estrutura-textual'`.
   - `index.html` — botão "Ações ▾" + popover
     `painel-acoes-estrutura-textual` na seção `#morfofuncionalidade`
     (mesmo lugar/estilo do de Sonoridade), sem o popover de Colunas.
   - Nenhuma mudança em `acoes-coluna.js` — os 4 formatos de Baixar e
     o painel já eram genéricos por `tabela`, só precisou de uma nova
     chave.

## O que falta

- Testar manualmente no navegador todo o fluxo desta segunda leva: os
  botões Ver/Baixar da coluna Ações, os 4 formatos de download (modal
  de visualização e coluna), o painel "⚙️ Ações ▾" (toggle de botões +
  formato do Baixar + Restaurar padrão) na aba Morfofuncionalidade.
- Rodar a suíte completa (`npm test`) — só `estrutura-textual.test.js`
  foi confirmado (26/26, sem regressão da mudança de cor/selo do
  overlap); `exportar-estrutura-textual.js`/`visualizar-estrutura-textual.js`
  ainda não têm teste automatizado (não existe precedente direto pra
  `exportar-sonoridade.js`/`visualizar-sonoridade.js` na suíte hoje).
- *(Ainda fora do escopo, não descartado: visão combinada
  Unidades+Eventos numa "linha do tempo" só.)*

