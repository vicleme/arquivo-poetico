# Fase 2: Aposentar o espelho `sinalizacoesTema`

> **Atualização (01/10/2026 às 00:10): D1 a D4 decididas pelo Victor.** D1 = (a), tirar o Tema do Localizar e Substituir (renomear fica na aba Temas, que preserva o papel). D2 = como sugerido (adicionar em massa entra com papel Indefinido; remover tira só aquele Tema). D3 = como sugerido; o Victor confirmou que nada fora do app lê o JSON, então `sinalizacoesTema` pode sair do JSON exportado. D4 = fica com o Claude: `nomesTemasDoTexto(item, temasCadastro)`. A suíte de partida agora é **2339/0**: onde esta página citar 2324 (nota de 30/09) ou 2086 (texto original), leia 2339. A Fase 8 (aba Etiquetas) usa só os 7 tipos que não são Tema nem Territorialidade, então não cria leitor novo do espelho `sinalizacoesTema`.
>
> **Nota (01/10/2026, revisão dos espelhos): sequência com a Fase 2b.** O escopo desta fase não muda. Territorialidade (`sinalizacoesTerritorialidade`) e Idioma (`idioma`) têm espelhos do mesmo tipo, mas ficam para a Fase 2b (`plano-central.md`), que vem depois desta.
>
> - **Única mudança aqui, de assinatura:** na Etapa 1, `valorDaCategoria` recebe `cadastros = { temas }` (um objeto), e `sinalizacoesCombinadas` (Etapa 2) recebe o mesmo objeto, em vez de `temasCadastro` solto. `nomesTemasDoTexto(item, temasCadastro)` (D4) não muda. Assim a 2b acrescenta `locais` ao objeto sem tocar nos chamadores.
> - **Onde a leitura genérica ler `territorialidade`**, o ramo continua lendo o espelho até a 2b trocá-lo dentro de `valorDaCategoria`.
> - **Não juntar** a Etapa 5 daqui e a 2b-4 na mesma sessão: as duas apagam campo e o Desfazer não cobre.

> **Nota de 30/09/2026 (acrescentada ao mover o arquivo para `planejamento/`; o texto abaixo, a partir de "Aposentar o espelho...", é o original, sem alteração).**
>
> - O arquivo se chamava `aposentar-espelho-sinalizacoes-tema.md`. Painel geral: `plano-central.md`.
> - **A base mudou:** a suíte hoje é **2324/0** (o plano abaixo fala em 2086) e os números de linha andaram. A Etapa 0 deve ser refeita com a base atual e os `grep` de verdade.
> - **Interação com a Fase 1** (`fase-01-estatisticas-temas-pessoas.md`): a etapa 1b cria `agregarPorPapel`, que lê `temas` por id e não o espelho. Se a Fase 1 vier antes, o leitor de `estatisticas-dados.js` (~667) da tabela de inventário já terá saído. `temasDoTexto` local (matriz e Tema ao longo do tempo) e `agregarPorTema` (~516) continuam lendo o espelho até a Etapa 2. **Regra:** nenhum código novo da Fase 1 deve ler `sinalizacoesTema`.
> - **IDs no plano central:** as quatro decisões D1 a D4 abaixo aparecem lá como F2-D1 a F2-D4, com as sugestões já dadas aqui.
> - Esta fase é invisível para quem usa o app: limpeza interna. Vale fazer depois da Fase 1, que dá resultado visível, e antes de qualquer fase que ainda crie leitores novos de Tema.

---

# Aposentar o espelho `sinalizacoesTema`: plano em etapas

Documento de planejamento do Arquivo Poético. Nada aqui foi implementado. Estado de partida: `npm test` com **2086 passando, 0 falhando**, lint e `prettier --check .` limpos, depois da sugestão de Temas duplicados (30/09/2026).

## Como usar este documento

- Cada etapa termina com a suíte verde e o app utilizável. **Dá para parar depois de qualquer etapa.**
- Leia primeiro "Situação atual" e "Decisões". As quatro decisões já foram tomadas (01/10/2026); a seção abaixo as mantém como registro.
- Regra de trabalho (de `licoes-de-sessao.md`): conferir contra o código de verdade, não contra este texto. Os números de linha abaixo são do zip de 30/09/2026 e podem ter andado.
- `npm install` antes de qualquer teste (o zip não traz `node_modules/`).

## Situação atual

- O texto (Poema/Prosa) guarda `temas: [{ temaId, papel }]`, a **fonte da verdade**, e `sinalizacoesTema`, uma string derivada com os nomes separados por vírgula, na ordem principal, secundário, indefinido (`espelhoDeTemas`, `utils.js`).
- `reconciliarTemasDoTexto` (`temas.js`, roda em `sincronizarTemas`: load, `importarDB` e **a cada `save()`, para todos os textos**) mantém os dois coerentes. Quando divergem, **o espelho vence**. Foi uma escolha deliberada (`decisoes.md`, "Tema por id nos textos, fase 2") para não quebrar quem escreve só o espelho.
- O espelho existe porque `Tema` é uma das 9 categorias de Sinalizações e quase tudo no app lê as categorias por um mapa genérico de categoria para nome de campo (`SINALIZACOES_CATEGORIAS`, `CAMPOS_ATRIBUTO`, em `utils.js`).

### O que a aposentadoria ganha

- Um dado em um lugar só, sem a regra "o espelho vence".
- `save()` deixa de reconciliar todos os textos a cada gravação.
- Acaba um defeito conhecido: **hoje, Localizar e Substituir no campo Tema perde o papel**. Ele troca o texto do espelho, a reconciliação vê divergência, refaz os `temas` pelo nome e o Tema com nome novo entra com papel indefinido (o antigo fica no cadastro sem texto).

### O que não ganha

Nada muda para quem usa o app no dia a dia. É limpeza interna. Por isso o plano é conservador. Os espelhos de Territorialidade e de Idioma são do mesmo tipo, mas ficam fora: são a Fase 2b.

## Inventário (o que lê e o que escreve)

`js/` tem 32 ocorrências diretas, mas o alcance real é maior por causa do mapa genérico. `tests/` tem 145 ocorrências em 21 arquivos.

### Leitores

| Onde                                                             | O que faz                                                                 | Etapa    |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| `utils.js` `temasDoTexto` (~3008)                                | lê o espelho e devolve lista de nomes                                     | 1        |
| `estatisticas-dados.js` (~667, `temasDoTexto` com papel "todos") | idem, para Estatísticas                                                   | 1        |
| `editor.js` (~4064)                                              | fallback de Temas do modal quando o texto não tem `temas`                 | 1        |
| `utils.js` `sinalizacoesCombinadas` (~2948)                      | junta os 9 campos; usado em busca geral, ordenação, filtros de exportação | 2        |
| `utils.js` `CAMPOS_ATRIBUTO.tema` (~2504) e mapa inverso (~2603) | prefixo de busca `tema:`                                                  | 2        |
| `render-listas.js` (~1196, ~1278, ~1788)                         | campos decorados de busca e ordenação                                     | 2        |
| `celulas-tabela.js` (~154)                                       | badges de Etiquetas por categoria                                         | 2        |
| `exportar-csv.js` (~352)                                         | coluna `sinal_tema`                                                       | 2        |
| `exportar-frequentes.js` (~408)                                  | lista de frequentes por categoria                                         | 2        |
| `estatisticas-dados.js` (~516)                                   | gráficos por tipo de etiqueta                                             | 2        |
| `exportar.js` (~203, ~207)                                       | filtros de exportação por Tema                                            | 2        |
| `editor.js` (~3365) `extrairSinalizacoesUnicas(todos, campo)`    | sugestões (datalists) de cada categoria                                   | 2        |
| `exportar-md.js`, `visualizar.js` via `sinalizacoesAgrupadas`    | já recebem `db.temas` e leem `temas` quando existe                        | conferir |

### Escritores

| Onde                                                                            | O que faz                                                           | Etapa          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------- |
| `temas.js` `renomearTema` (~283)                                                | reescreve o nome no espelho de cada texto                           | 3              |
| `temas.js` `mesclarTemas` e seu `desfazer` (~346, ~355, ~405)                   | refaz o espelho dos textos afetados                                 | 3              |
| `temas.js` `reconciliarTemasDoTexto` (~200)                                     | deriva o espelho e, em divergência, deixa o espelho vencer          | 4 e 5          |
| `selecao-massa.js` `adicionarValorEmCampo` e `removerValorDeCampo` (~201, ~212) | edição em massa acrescenta ou tira o nome na string                 | 3              |
| `localizar-substituir.html` (~482, ~498, ~776)                                  | substitui texto direto em `item[campoKey]`, sem passar por `temas`  | 3 (decisão D1) |
| `forms.js` `temasParaSalvar` (~294 a ~308)                                      | devolve `{ temas, sinalizacoesTema, assuntosPapel }` ao salvar      | 3              |
| `importar-aditivo.js` (~495 a ~503)                                             | importação aditiva grava `temas` e o espelho                        | 3              |
| `pacote-texto.js` (~176)                                                        | texto novo de pacote da biblioteca nasce com `sinalizacoesTema: ''` | 3              |
| `db.js` `migrarSinalizacoes` (~1030, ~1048)                                     | migração antiga da tag solta "Brasil" para o espelho                | manter         |

### Dados que carregam o campo antigo (não regenerar)

- `biblioteca/*.json`: os 10 pacotes trazem `sinalizacoesTema`. São gerados por `scripts/montar-pacote.js` e guardados por `tests/biblioteca-pacotes-curados.test.js`. A importação precisa continuar entendendo o formato.
- Backups JSON antigos do próprio acervo.
- `docs/campos-poema-prosa-for-ai*.md` (2) e `docs/etiquetas-sinalizacoes-for-ai*.md` (2) citam o campo.
- `index.html` (~1837, ~2552): `<option value="sinalizacoesTema">` nos seletores de categoria da edição em massa. `localizar-substituir.html` lista o campo duas vezes.

## Decisões (todas tomadas em 01/10/2026 às 00:10)

**D1. Localizar e Substituir no campo Tema.**

- **DECIDIDO (a).** **Tirar o Tema da lista** do Localizar e Substituir. Renomear um Tema é função da aba Temas, que já propaga a todos os textos e preserva o papel. Recomendação: é a mais simples e corrige o defeito acima.
- (b) Manter e fazer o substituir agir nos nomes do cadastro. Mais código, e o caso de nome que passa a colidir com outro Tema precisaria de regra (mesclar? recusar?).

**D2. Edição em massa, adicionar e remover Tema.** DECIDIDO como sugerido: adicionar entra com papel **Indefinido** (mesmo padrão de Pessoas, que entra sem papéis); remover tira o Tema do texto, comparando por `chaveTema`. Se o Tema não existe no cadastro, `garantirTema` o cria.

**D3. Saídas depois da aposentadoria.** DECIDIDO como sugerido (nada fora do app lê o JSON): o CSV continua com `sinal_tema` (as colunas são contrato para quem monta dataset), agora **derivado**; o JSON exportado deixa de trazer `sinalizacoesTema` e fica só com `temas` (que já leva o `nome`); as importações continuam lendo o campo antigo.

**D4. Assinatura da função de leitura.** DECIDIDO, fica com o Claude: `nomesTemasDoTexto(item, temasCadastro)`, com o cadastro como parâmetro, no mesmo padrão dos Assuntos (a fase 3 do Tema fez o mesmo: `utils.js` não importa `db`).

## Etapa 0. Preparação e rede de segurança

Objetivo: poder provar que "nada mudou" nas etapas 1 a 4.

1. `npm install`, `npm test`, `npm run lint`. Esperado: 2086/0 e lint limpo.
2. Exportar um **backup JSON do acervo real** (o de 74 temas) e guardar fora do projeto. Em cada etapa, abrir esse backup num navegador limpo e comparar.
3. Escrever `tests/temas-espelho-paridade.test.js`, um teste de caracterização com um `db` que cubra: Temas com os três papéis misturados; texto só com espelho (sem `temas`); Tema com acento e caixa diferentes; Tema órfão; texto sem nenhum Tema; nome repetido em caixa diferente. Ele afirma, para o estado **atual**, o resultado de cada saída: nomes na ordem principal, secundário, indefinido; `_buscaTema`; badges; linha do CSV; linha do `.md`; contagem nas Estatísticas.
4. Esse teste é o critério de pronto das etapas 1 a 4 e **só é editado na etapa 5**.

Pronto quando: teste novo verde contra o código atual, sem nenhuma alteração em `js/`.

## Etapa 1. Uma função única de leitura (sem mudar comportamento)

Objetivo: concentrar a leitura dos Temas de um texto em um lugar.

1. Em `utils.js`, criar `nomesTemasDoTexto(item, temasCadastro)`: se o texto tem `temas`, resolve os nomes pelo cadastro na ordem principal, secundário, indefinido; se não tem (dado ainda não migrado), cai no espelho.
2. Criar `valorDaCategoria(item, categoria, cadastros = {})`, com `cadastros = { temas: db.temas }` (um objeto, para a Fase 2b acrescentar `locais`): para `tema` devolve `nomesTemasDoTexto(item, cadastros.temas).join(', ')`; para as outras 8 categorias lê `item[SINALIZACOES_CATEGORIAS[categoria]]` como hoje (inclusive `territorialidade`, até a Fase 2b).
3. Trocar os três leitores diretos da tabela acima (`temasDoTexto` em `utils.js`, `estatisticas-dados.js`, fallback do `editor.js`).
4. **O campo continua gravado e a reconciliação fica intacta.**

Pronto quando: paridade verde, suíte 2086/0 (mais os testes novos da função), lint e prettier limpos.
Reversão: apagar as funções novas; nenhum dado mudou.

## Etapa 2. Os leitores genéricos passam pela função (ainda sem mudar o dado)

Objetivo: nenhum código lê `item.sinalizacoesTema` de forma genérica. Um leitor por vez, rodando a paridade a cada troca.

1. `sinalizacoesCombinadas(item)` ganha o 2º parâmetro `cadastros` (o mesmo objeto) e usa `valorDaCategoria` para `tema`. Atualizar os chamadores: `render-listas.js` (~1196, ~1788), `exportar-md.js` (~257), `exportar.js` (~203, ~207).
2. `CAMPOS_ATRIBUTO.tema` passa a apontar para um campo decorado `_buscaTema`, calculado em `decorarCamposBusca` (`render-listas.js`, ao lado de `_buscaTemaPrincipal`, `_buscaTemaSecundario`, `_buscaTemaSemPapel`). Atualizar o mapa inverso (~2603) e `PREFIXOS_CANONICOS_POR_CAMPO`.
3. `celulas-tabela.js` (~154), `exportar-csv.js` (~352), `exportar-frequentes.js` (~408) e `estatisticas-dados.js` (~516): trocar `item[campo]` por `valorDaCategoria`.
4. `editor.js` (~3365): as sugestões de Tema passam a vir de `db.temas` (nomes do cadastro), não de `extrairSinalizacoesUnicas` sobre o espelho.
5. `grep -n "SINALIZACOES_CATEGORIAS" js/*.js` e conferir os 7 módulos (`celulas-tabela`, `estatisticas-dados`, `estatisticas-filtros`, `exportar-csv`, `exportar-frequentes`, `selecao-massa`, `utils`) um a um. `selecao-massa.js` só usa o mapa para achar o slug do datalist; fica para a etapa 3.

Cuidado: `tests/sinalizacoes-consistencia.test.js` e `tests/wiring-onclick.test.js` leem o source como texto. Mudanças de nome de campo podem acioná-los.

Pronto quando: `grep "sinalizacoesTema" js/` só acha escritores, migrações, o mapa `SINALIZACOES_CATEGORIAS` e comentários; paridade e suíte verdes.
Reversão: reverter o zip da etapa; o dado continua compatível.

## Etapa 3. Os escritores passam a escrever em `temas`

Objetivo: ninguém mais depende de "o espelho vence".

Regra desta etapa: o espelho **ainda é gravado**, mas só por uma função (`sincronizarEspelhoDoTexto`, a chamada a `espelhoDeTemas` que já existe), sempre **depois** de mexer em `temas`.

- **3a. Renomear e mesclar** (`temas.js`): `renomearTema` já mantém `temas` intacto; deixar de reescrever o espelho por troca de string e chamar `sincronizarEspelhoDoTexto`. `mesclarTemas` e o `desfazer` que entrou com a sugestão de duplicatas guardam e restauram o espelho: manter o retrato, mas refazer o espelho pela função, não por cópia de string.
- **3b. Edição em massa** (`selecao-massa.js`): quando a categoria é Tema, `aplicarSinalEmMassa` e `removerSinalEmMassa` chamam novas `adicionarTemaAoTexto(dbRef, item, nome, papel = '')` e `removerTemaDoTexto(dbRef, item, nome)` em `temas.js` (D2). O `SLUG_POR_CAMPO_SINAL` continua funcionando enquanto o valor do `<option>` for o mesmo.
- **3c. Localizar e Substituir**: conforme D1. Com (a), tirar as duas entradas `sinalizacoesTema` das listas (~482 e ~498).
- **3d. Importação aditiva** (`importar-aditivo.js` ~495): JSON sem `temas` (formato antigo) deve virar `temas` na hora, com `temasDeEspelhoAntigo(dbRef, texto)` (papel indefinido), em vez de esperar a reconciliação. `pacote-texto.js` (~176): texto novo nasce com `temas: []`.
- **3e. Salvar do modal** (`forms.js` `temasParaSalvar`): continua entregando `temas`; o espelho vem de `sincronizarEspelhoDoTexto` no salvar.

Pronto quando: nenhum código escreve `sinalizacoesTema` fora de `sincronizarEspelhoDoTexto`; teste novo de edição em massa (adicionar cria Tema com papel indefinido, remover preserva os demais); paridade e suíte verdes.
Reversão: reverter o zip da etapa; o espelho continua gravado.

## Etapa 4. Migração única e leitura do formato antigo isolada

Objetivo: o formato antigo passa a ser tratado em um lugar só, na entrada de dados.

1. Criar `migrarEspelhoParaTemas(dbRef)` em `temas.js`: texto **sem** `temas` e com espelho não vazio ganha `temas` (via `garantirTema`, papel indefinido). Chamar no load e no `importarDB`, ao lado de `sincronizarTemas`. Como `localizar-substituir.html` importa `js/db.js`, herda a migração.
2. Simplificar `reconciliarTemasDoTexto`: remover o ramo "o espelho vence". Passa a só validar ids (descartar id inexistente, sem repetição) e derivar o espelho.
3. Reescrever, com a nova expectativa, os cenários de divergência de `tests/temas-por-id.test.js` (o que era "o espelho vence" vira "os `temas` mandam"). Registrar a mudança de regra em `decisoes.md`.
4. Testar com o backup antigo real e com um pacote da biblioteca importado.

Pronto quando: `sincronizarTemas` é idempotente com o espelho ainda gravado; backup antigo abre com os Temas certos; suíte verde.
Reversão: reverter o zip da etapa. Ainda compatível, porque o espelho continua no dado.

## Etapa 5. Parar de gravar e apagar o campo (ponto sem volta fácil)

**Antes de começar: exportar um backup JSON do acervo real e guardar.** O Desfazer não cobre esta etapa.

1. Remover `sincronizarEspelhoDoTexto` e a derivação do espelho no `save()`. Um passo idempotente (na mesma função da etapa 4) apaga `sinalizacoesTema` de todo texto que já tem `temas`.
2. `SINALIZACOES_CATEGORIAS`: manter a chave `tema` (ordem, cor e testes de consistência dependem dela), mas como **categoria virtual**, sem campo de dado. Ajustar `tests/sinalizacoes-consistencia.test.js` para tratá-la como o `ocultoNoModal` já é tratado. Conferir cada `Object.entries(SINALIZACOES_CATEGORIAS)` que sobrou. A `territorialidade` continua com campo de dado até a Fase 2b, então o tratamento de categoria virtual deve nascer genérico (uma marca por categoria), e não um `if` só para `tema`.
3. Exportações (D3): `sinal_tema` do CSV continua, derivado; o JSON exportado deixa de trazer `sinalizacoesTema` (`montarRegistro`, `exportar.js` ~290, faz `...item`; conferir que o campo sumiu).
4. `index.html` (~1837, ~2552): o `<option value="sinalizacoesTema">` da edição em massa passa a um valor próprio (por exemplo `temas`), tratado em `selecao-massa.js`.
5. Editar o teste de paridade só nesta etapa: tirar as afirmações sobre o campo, mantendo todas sobre as saídas.

Pronto quando: `grep "sinalizacoesTema" js/` só acha a migração que apaga o campo, a leitura do formato antigo nos importadores e comentários; a suíte passa; abrir o backup antigo real em navegador limpo mostra os mesmos Temas, papéis e Assuntos de antes.
Reversão: só restaurando o backup.

## Etapa 6. Limpeza e documentação

1. `schema.md`: reescrever a seção "Tema no texto (Poema/Prosa)" e a de reconciliação (sem espelho).
2. `decisoes.md`: nova seção "Aposentar o espelho `sinalizacoesTema`", com D1 a D4 e o que mudou na regra de reconciliação. `status.md` e `PROXIMA-SESSAO.md`: uma entrada cada, e tirar "Aposentar o espelho" das ideias.
3. `docs/campos-poema-prosa-for-ai*.md` (2) e `docs/etiquetas-sinalizacoes-for-ai*.md` (2): trocar as menções ao campo.
4. Comentários que citam o espelho: `db.js` (~735), `editor.js` (~493, ~560, ~4002), `forms.js` (~294), `utils.js` (~2994, ~3028), cabeçalho de `temas.js`.
5. Código sem uso: `espelhoDeTemas`, `temasDoTexto` de `utils.js` (se nada mais chamar), `extrairSinalizacoesUnicas` com o campo Tema.
6. Testes: 145 ocorrências em 21 arquivos. Fixtures que montam `sinalizacoesTema: 'A, B'` como entrada continuam funcionando se passarem por `sincronizarTemas` (etapa 4). As que não passam trocam por um helper `textoComTemas(['A', 'B'])` em `tests/helpers/`. Fazer por arquivo, rodando a suíte a cada um.
7. `npm test`, `npm run lint`, `prettier --check .`.

## Riscos e como pegar

| Risco                                                                          | Como pegar                                                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Ordem dos nomes mudar nas saídas (a regra é principal, secundário, indefinido) | teste de paridade da etapa 0                                                                                           |
| Backup antigo com só o espelho                                                 | fixture na etapa 4 e o backup real em navegador limpo                                                                  |
| Pacotes da biblioteca (10 JSON com o campo antigo)                             | não regenerar; `biblioteca-pacotes-curados` guarda o conteúdo; importar um pacote e conferir os Temas                  |
| Comparação de nomes: sempre por `chaveTema` (sem caixa nem acento)             | manter nas funções novas; um caso de teste com acento                                                                  |
| `localizar-substituir.html` é uma página separada (importa `js/db.js`)         | abrir a página depois das etapas 3 e 5                                                                                 |
| Vírgula no nome do Tema                                                        | `limparNomeTema` proíbe por causa do separador. **Manter a proibição**: o CSV e o `.md` ainda usam vírgula para listar |
| Testes que leem o source como texto quebrarem por renomeações                  | rodar a suíte inteira a cada etapa, não só o arquivo mexido                                                            |

## Conferência no navegador (a cada etapa)

- Etapas 1 a 3: tabela de Poemas e Prosas (coluna Tema, Etiquetas, Assunto); busca `tema:`, `temaprincipal:`, `temasecundario:`, `temasempapel:`; Estatísticas (gráfico de Temas nos quatro papéis); `.md`, `.csv` e Visualização de um texto com os três papéis; edição em massa adicionando e removendo Tema; renomear e mesclar Tema na aba Temas, com Desfazer.
- Etapa 4: abrir o backup antigo real; importar um pacote da biblioteca; Importação Aditiva de um JSON exportado antes da mudança.
- Etapa 5: tudo acima em navegador limpo, mais o app depois de recarregar (o campo antigo não pode reaparecer no armazenamento).

## Ordem sugerida de sessões

1. Etapas 0 e 1 (rede de segurança e função única).
2. Etapa 2 (leitores).
3. Etapa 3 (escritores) e D1 a D4 decididas.
4. Etapa 4.
5. Etapa 5 (com backup) e etapa 6.
6. Fase 2b (ver `plano-central.md`), em sessões próprias, nunca na mesma sessão da Etapa 5.

Cada sessão termina, como de costume, entregando o `.zip` do projeto e o `PROXIMA-SESSAO.md`, mesmo que incompleta.
