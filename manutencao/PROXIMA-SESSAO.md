# Próxima sessão: Arquivo Poético (estado em 30/09/2026, após Estatísticas de Local e Idioma, colunas, `.md`, `.csv` e Visualização de Local e Idioma, busca de Local e Idioma, Idioma em lista, Locais etapa 3 e a faixa Voltar/Limpar filtro)

Leia este arquivo, depois `manutencao/status.md` (as primeiras entradas: Estatísticas de Local e Idioma, colunas/md/csv/Visualização de Local e Idioma, busca de Local e Idioma, Idioma em lista, Locais etapa 3, faixa Voltar, Locais etapa 2 e etapa 1), `decisoes.md` (última seção, "Local: cadastro hierárquico com vários pais"), `schema.md` (última seção, `db.locais`) e `licoes-de-sessao.md`. O contexto da sessão anterior (Temas e Assuntos) está mais abaixo, sem mudança.

## Local de escrita em massa: pronto (30/09/2026)

Pedido do Victor. Painel **✏️ Preencher campo**, campo **Local de escrita**, em Poemas e Prosas. Detalhes em `status.md` (primeira entrada).

- **Uso:** selecionar os textos, abrir "Preencher campo", escolher o campo, digitar o Local (autocompleta do cadastro; "São Paulo (Estado)" distingue homônimos) e Preencher. Padrão aditivo (só nos vazios); "Sobrescrever" troca o que já tem; "Limpar campo" esvazia.
- **Local novo:** se o nome não existe, a confirmação avisa e o Local só é criado ao confirmar (sem tipo e sem pai; completar na aba Locais).
- **Código:** `js/campos-preenchiveis.js` (tipo `local`, `valorAlvo`) e `js/selecao-massa.js`. Testes: `tests/campos-preenchiveis.test.js` (6) e `tests/selecao-massa-preencher.test.js` (9). Suíte 2339/0.
- **Limite conhecido:** Territorialidade em massa não existe (é lista; precisa de acrescentar x substituir).

Conferir no navegador (pelo Victor): selecionar uns poemas, Preencher campo › Local de escrita, ver o autocompletar com o caminho; preencher com um Local existente e abrir um dos poemas para ver o chip no modal; repetir com um nome novo e ver o aviso "será criado" e o Local na aba Locais; marcar "Sobrescrever" num texto que já tinha outro Local; "Limpar campo"; conferir a coluna "Local de escrita" e a busca `localescrita:` depois; o mesmo em Prosas; o painel no modo escuro e no celular.

## Estatísticas de Local e Idioma: prontas (30/09/2026)

Item 3 da lista de passos de Locais, feito uma vez só para Local e Idioma. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (última seção). Aba nova **Estatísticas › Local e idioma**, com quatro gráficos clicáveis:

- **Locais citados (Territorialidade)** e **Locais de escrita:** seletor de modo ("Citados diretamente" conta só o Local marcado; "Com o que está dentro" soma sublocais, cada texto uma vez por Local) e seletor de tipo (só lista tipos com texto no recorte). Assim saem as cidades citadas, os "locais do Brasil" e "locais de São Paulo (estado)" x "(cidade)". Padrão: direto. Os dois escolhem seu modo e tipo em separado, guardados no navegador, com aviso âmbar do que está ativo.
- **Assuntos por local de escrita:** seletor de Local (ou todos os textos com local de escrita). Escolher Santos inclui o escrito na Ponta da Praia. Usa o Assunto derivado, em qualquer papel.
- **Idiomas:** seletor de papel (Todos, Principal, Secundário). O texto do cartão diz a soma das barras e o total de textos quando a soma passa do total.
- **Clique na barra:** abre Poemas ou Prosas com `territorialidadedireta:` / `territorialidade:` / `localescritadireta:` / `localescrita:` ("Nome (Tipo)"), `assunto:"X" localescrita:"Local"` (sem Local, `localescrita:*`) e `idioma:` / `idiomaprincipal:` / `idiomasecundario:`. Um teste confere, para cada barra dos quatro modos de Local, que a lista aberta tem o mesmo número da barra.
- **Código:** `js/estatisticas-dados-local-idioma.js` e `js/estatisticas-tela-local-idioma.js` (novos), `js/estatisticas-filtros.js`, `js/estatisticas-dados.js` (`textosDasEstatisticas`), `js/locais.js` (`contarTextosPorLocal` e `...Escrita` aceitam `textos`; `consultaBuscaDoLocal`; `rotulosUnicosDeLocais`), `js/ui.js`, `index.html`. Testes: `tests/estatisticas-local-idioma.test.js` (48). Suíte 2323/0, lint e Prettier limpos.
- **Limites conhecidos:** não há gráfico de dialetos (nenhum preenchido no acervo real) nem de Local ao longo do tempo; o gráfico de Assuntos por local não tem seletor de papel do Assunto; Local com mesmo nome e tipo em pais diferentes aparece como "Centro (Bairro, em Santos)" no gráfico, mas a busca por nome e tipo não os separa (a aba Locais separa por id).
- **Bug que os testes pegaram:** `descendentesDoLocal` devolve ids numéricos; comparar com strings fazia o Local escolhido nos Assuntos ignorar os sublocais. Ao comparar ids de Local, sempre `String(...)` nos dois lados.

Conferir no navegador (pelo Victor), porque o Chart.js real, o modo escuro e o celular não foram vistos:

- Menu Estatísticas: aparece "Local e idioma" entre "Temas e pessoas" e "Linguagem"; abrir e ver os quatro gráficos.
- Locais citados: alternar "Citados diretamente" x "Com o que está dentro" e ver os números mudarem (Brasil só aparece com valor alto no segundo). Escolher o tipo "País" no modo agregado e ver só os países; "Cidade" mostra São Paulo (Cidade) e Santos. Ver o aviso âmbar e a legenda do tipo ativo.
- Clicar numa barra: abre a lista de Poemas (ou Prosas, se o filtro de Tipo for Prosas) com a busca preenchida e o mesmo número de textos da barra; usar "Voltar" e ver o gráfico como estava.
- "São Paulo (Cidade)" x "São Paulo (Estado)": os dois aparecem como barras separadas e cada clique abre o seu.
- Locais de escrita: o mesmo teste; escrever em Santos deve contar para Brasil no modo agregado.
- Assuntos por local de escrita: escolher um Local e ver o número de textos no cartão; clicar numa barra e comparar com a lista.
- Idiomas: trocar o papel e ver a barra mudar; com um texto com Inglês secundário (por exemplo "fado reducionista"), `idiomasecundario:` deve achar 3 textos no acervo real; ver o aviso da soma.
- Filtros compartilhados (Autor, Tipo, período, terceiros): mudar e ver os quatro gráficos acompanharem.
- Botão "Ocultar" de cada gráfico, o mínimo de aparições, o modo escuro e o celular (seletores quebrando linha sem estourar a largura).

## Colunas, `.md`, `.csv` e Visualização de Local e Idioma: prontos (30/09/2026)

Passo 2 do plano, feito uma vez só para os dois campos. Detalhes em `status.md` (primeira entrada).

- **Idioma com papel e dialeto** na linha do `.md` (PDF e DOCX herdam), na Visualização (que não mostrava Idioma) e na coluna da tabela: "pt-BR (principal; dialeto: paulistano), Inglês (secundário)". Um Principal sem dialeto sai só com o nome. Um idioma sozinho nunca aparece como Secundário (a regra "ao menos um Principal" o promove).
- **Local:** linha "Local onde foi escrito" no `.md` e na Visualização; a Territorialidade passa a sair com o caminho ("Lapa (São Paulo › São Paulo › Brasil)"). O caminho segue o primeiro pai, então a Estação Lapa mostra Lapa e não o Metrô. Texto só com o espelho de nomes continua saindo pelos nomes.
- **Tabela:** colunas novas "Local de escrita" e "Territorialidade" (selo por Local, caminho na dica), desligadas por padrão, logo depois de Idioma. Quem já tem configuração salva de colunas as vê no fim da lista.
- **CSV:** `idioma_principal`, `idioma_secundario`, `dialetos`, `local_escrita`, `local_escrita_caminho`, `territorialidade_caminho`. `idioma` e `sinal_territorialidade` não mudaram.
- **Código:** `js/utils.js` (`textoIdiomasComPapel`, `sinalizacoesAgrupadas` com 3º parâmetro), `js/locais.js` (`textoLocalComCaminho`, `textoTerritorialidadeComCaminho`, `textoLocalEscrita`, `caminhoCompletoLocal`), `js/exportar-md.js`, `js/visualizar.js`, `js/exportar-csv.js`, `js/colunas.js`, `js/celulas-tabela.js`, `js/render-listas.js` (`celulaIdioma`, `celulaLocalEscrita`, `celulaTerritorialidade`). Testes: `tests/saidas-local-idioma.test.js` (23); `tests/colunas.test.js` ajustado. Suíte 2274/0. A coluna chama "Local de escrita" (pedido do Victor); o campo do modal e as linhas do `.md` e da Visualização seguem "Local onde foi escrito". As colunas Idioma e Movimento/Escola ganharam a lupa no cabeçalho.

Conferir no navegador (pelo Victor): na tabela de Poemas e de Prosas, ligar as colunas "Local de escrita" e "Territorialidade" pelo painel de colunas e ver os selos (cores no modo escuro e quebra de linha no celular); passar o mouse num selo e ver o caminho; ordenar pelas duas colunas; usar a lupa da coluna e ver o prefixo `localescrita:` / `territorialidade:` na busca; ver a coluna Idioma num texto com Secundário e dialeto; abrir "Ver" num texto com Local e idioma e conferir as linhas; exportar `.md` e `.csv` e abrir o `.csv` numa planilha para ver as seis colunas novas.

## Busca de Local e de Idioma: pronta (30/09/2026)

Passo 2 do plano, feito uma vez só para os dois campos. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (última seção).

- **`territorialidade:` é hierárquico.** `territorialidade:Brasil` acha tudo que está dentro do Brasil, por qualquer caminho (a Estação Lapa conta para Lapa, Metrô de São Paulo, São Paulo e Brasil). `territorialidade:"São Paulo (Cidade)"` e `"São Paulo (Estado)"` se distinguem pelo tipo entre parênteses; só `"São Paulo"` pega os dois. Local sem tipo vale "Nome (sem tipo)".
- **Novos prefixos:** `territorialidadedireta:` (só o Local exato), `localescrita:` (hierárquico) e `localescritadireta:`; `idiomaprincipal:`, `idiomasecundario:` e `dialeto:` (casa qualquer dos dialetos e o idioma deles, por exemplo `dialeto:espanhol`). `idioma:` segue achando em qualquer papel.
- **Atalho "Ver textos" do Local** gera um termo só (`territorialidade:"Lapa (Bairro)"`). Um teste confere que, para todos os Locais do fixture, a lista filtrada bate com a contagem de "citam o Local ou sublocais".
- **Código:** `js/locais.js` (`buscaTerritorialidadeDoTexto`, `buscaLocalEscritaDoTexto`, `consultaTerritorialidadeDoLocal`), `js/utils.js` (`CAMPOS_ATRIBUTO`, `PREFIXOS_CANONICOS_POR_CAMPO`, `nomesIdiomasPorPapel`, `dialetosDoItem`), `js/render-listas.js` (`decorarCamposBusca`), legenda do "?" no `index.html`. Testes: `tests/busca-local-idioma.test.js` (22); ajustados `locais`, `locais-dom` e `territorialidade`.
- **Limites conhecidos:** a busca é por substring (a opção "palavra inteira" resolve `Brasil` x "Brasileiro"), e dois Locais com mesmo nome e mesmo tipo em pais diferentes não se distinguem na caixa (a aba Locais os separa por id). A busca geral sem prefixo não olha o Local hierárquico.
- **Victor, no acervo real:** não preencheu dialeto em nenhum texto (segui a minha leitura de que o que há é registro coloquial, não variedade regional) e marcou Inglês como Secundário em "fado reducionista", "disposable thing" e "like daylight". Com isso, `idiomasecundario:ingles` deve achar 3 textos, e `idiomaprincipal:fr` o "colibri (beija-flor - version française)".

Conferir no navegador (pelo Victor): na busca de Poemas, `territorialidade:Brasil` (conta como o total de textos com algum Local); `territorialidade:"São Paulo (Cidade)"` x `"São Paulo (Estado)"`; aba Locais, "Ver textos" de um Local e comparar o número da lista com o da aba; `localescrita:` com um Local que tenha sublocais; `idiomasecundario:ingles` (3 textos) e `idiomaprincipal:pt-BR`; a legenda do "?" com os dois itens novos (Poemas e Prosas).

## Dialetos em lista: pronto (30/09/2026)

Pedido do Victor depois da busca: um texto pode ter mais de um dialeto no mesmo idioma (diálogo entre falantes de regiões diferentes). Detalhes em `decisoes.md` (última seção) e `schema.md`.

- **Dado:** `idiomas: [{ idioma, papel, dialetos: [] }]`. `dialeto` de texto único (dado antigo) vira `dialetos: [dialeto]` em `normalizarIdiomas` e `migrarIdioma`. Idioma repetido soma os dialetos. Nada a converter no acervo real (nenhum dialeto preenchido).
- **Modal:** chips de dialeto com × abaixo de cada idioma e um campo para adicionar (vírgula separa vários, Enter ou sair do campo confirma, foco volta ao campo; o que ficou digitado entra ao salvar). Código: `js/editor.js` (`adicionarDialetoIdiomaTexto`, `removerDialetoIdiomaTexto`, `linhaIdiomaTexto`, `obterIdiomasTexto`), `js/main.js`, `js/utils.js` (`normalizarDialetos`, `normalizarIdiomas`, `dialetosDoItem`, `extrairDialetosUnicos`).
- **Limite assumido:** o dialeto vale para o idioma do texto todo, não para uma fala ou personagem (isso vai nas Notas).
- **Testes:** ampliados `tests/idiomas.test.js`, `tests/regiao-idioma-dom.test.js` e `tests/busca-local-idioma.test.js`. Suíte 2250/0.
- **Conferir no navegador (Victor):** num Poema, em Região e Idioma, adicionar um dialeto ao pt-BR (chip aparece, campo recupera o foco), adicionar um segundo ("paulistano, gaúcho" com vírgula), remover um pelo ×, digitar um sem confirmar e salvar (deve entrar), reabrir o texto e ver os chips; ver as sugestões dos já usados; ver no modo escuro e no celular (chips e campo quebrando linha sem estourar a largura); `dialeto:gaucho` na busca.

## Idioma em lista: passo 1 pronto (30/09/2026)

Decidido com o Victor nesta sessão (detalhes e porquês em `decisoes.md`, última seção; schema em `schema.md`, campo `idiomas`):

- **Região e Idioma vem antes de Datas** nos dois modais (o "onde" antes do "quando", como a ordem dos Cadastros), com a nota "(idioma, local onde foi escrito, territorialidade)" no título. Já aplicado.
- **Mais de um idioma por texto, com papel por idioma** (Principal ou Secundário, não pela posição da lista), então um texto meio a meio pode ter dois Principais. **Ao menos um Principal** quando há idioma: tirar ou rebaixar o único Principal promove o próximo da lista; o único idioma não vira Secundário; texto sem idioma é permitido.
- **Dialeto ligado ao idioma** (texto livre, opcional, com sugestão dos já usados para aquele idioma). **Idioma não vira entidade** (sem aba nova).
- Dado: `idiomas: [{ idioma, papel, dialetos }]` é a fonte da verdade (os dialetos são uma **lista**, ver a seção abaixo); `idioma` (string) continua como **espelho** só com os nomes, Principais primeiro, para busca, coluna e exportações seguirem funcionando. Migração: cada `idioma` antigo vira um Principal sem dialeto. Quem lê usa `idiomasDoItem` (`js/utils.js`).
- Código: `js/utils.js` (`normalizarIdiomas`, `idiomasDoItem`, `espelhoDeIdiomas`, `extrairDialetosUnicos`, `PAPEIS_IDIOMA`), `js/editor.js` (`adicionarIdiomaTexto`, `removerIdiomaTexto`, `definirPapelIdiomaTexto`, `definirDialetoIdiomaTexto`, `obterIdiomasTexto`, `resetIdiomasTexto`, `carregarIdiomasTexto`), `js/forms.js` (`idiomasParaSalvar`), `js/db.js` (`migrarIdioma`), `js/ui.js`, `js/main.js`, os dois modais. Testes: `tests/idiomas.test.js` e `tests/regiao-idioma-dom.test.js`.

**Falta do Idioma:** só os docs `for-ai` completos (a entrada `idiomas` já foi descrita em `campos-poema-prosa-for-ai*.md`). Busca, colunas, exportações e Estatísticas (com o aviso da soma) estão prontas.

Conferir no navegador (pelo Victor): abrir um Poema e ver **Região e Idioma antes de Datas**; ver pt-BR como Principal num texto novo; adicionar "en, es" (vírgula) e ver os dois como Secundário; trocar um para Principal e ver os dois Principais; rebaixar o único Principal e ver o próximo ser promovido; digitar um dialeto, salvar, reabrir e ver que ficou; ver as sugestões de dialeto; remover todos e salvar (texto sem idioma); conferir a coluna Idioma na tabela (espelho) e a busca `idioma:`; ver o grupo no modo escuro e no celular (linha do idioma quebrando sem estourar a largura); abrir um backup antigo real e ver cada idioma virar um Principal.

## Faixa "Voltar / Limpar filtro": pronta

Todo atalho "Ver textos" (Tema, Assunto, Época, Período, Movimento, Autor, Pessoa, Local), o drill-down das Estatísticas e os atalhos Assunto para Tema mostram, na aba de destino, a faixa "Voltar para <aba> · Limpar filtro". Módulo `js/faixa-origem.js`, testes em `tests/faixa-origem.test.js`. Para conferir no navegador: aba Locais, Ver textos de um Local, Voltar (a árvore deve estar como foi deixada); Estatísticas, clicar numa barra, Voltar; editar a caixa de busca à mão e ver a faixa sumir; ver a faixa no modo escuro e no celular (quebra de linha).

## Locais: onde estamos

Projeto do Victor: Territorialidade deixa de ser só etiqueta de Sinalizações e vira campo próprio, alimentado por um cadastro de **Locais** hierárquico. **Etapas 1 (dado, migração, lógica, exportação/importação) e 2 (aba Locais) prontas e testadas; a busca hierárquica também.** Detalhes em `status.md` e `schema.md`. A Territorialidade ainda é editada em Sinalizações; a aba Locais só cadastra e organiza.

Etapa 3 (grupo "Região e Idioma" nos modais, Local onde foi escrito e Territorialidade por id, criar Local direto do modal) **pronta e testada por testes automáticos**; ver `status.md`. Etapas que faltam, na ordem que recomendo (primeiro o mais fácil; as de número 1, 2 e 3 já foram feitas):

1. ~~**Busca**~~ **Pronta** (ver a seção "Busca de Local e de Idioma" acima).
2. ~~**Colunas, `.md`, `.csv`, Visualização**~~ **Prontas**, com o caminho hierárquico, o local de escrita e os idiomas com papel e dialetos (ver a seção acima).
3. ~~**Estatísticas**~~ **Prontas** (ver a seção "Estatísticas de Local e Idioma" acima): citados diretamente x com o que está dentro, filtro por tipo, textos e assuntos por local de escrita, idiomas por papel.
4. **Docs `for-ai`** (o Idioma em lista já está descrito) (`docs/campos-poema-prosa-for-ai*.md`, `docs/etiquetas-sinalizacoes-for-ai*.md`): descrever `territorialidade`, `localEscrita` e `locaisHierarquia` no JSON exportado; e tirar a Territorialidade da lista de Sinalizações do modal.

Decidido pelo Victor: vários pais por Local; "Local onde foi escrito" é um só por texto (para escrita em trânsito, um Local tipo "Viagem" que pertence a uma região). Nada bloqueante em aberto.

Conferência no navegador (pelo Victor). O grupo novo ainda não foi aberto num navegador: abrir um Poema, expandir "Região e Idioma" (agora antes de Datas), ver o Idioma lá dentro, com papel e dialeto (seção do Idioma acima), digitar "Estação Lapa" na Territorialidade e escolher pela lista (o caminho deve aparecer ao lado), digitar um nome novo (chip "(novo)"), definir o Local onde foi escrito, salvar, reabrir e conferir que tudo permanece, e que a aba Locais mostra o Local novo sem tipo. Cancelar um modal com Local novo digitado não deve criar nada. Além disso: abrir o app com o acervo real, ir à aba Locais e ver se cada etiqueta de Territorialidade virou um Local; organizar alguns (tipo e local maior, com dois pais na Estação Lapa); editar um texto pelo modal e conferir que a Territorialidade permanece; exportar JSON e importar em outro navegador.

## Contexto da sessão anterior (Temas e Assuntos)

A fase 3 do Tema está feita e verificada por testes. Nesta sessão entraram, além dos pedidos da rodada anterior (coluna Tema, papel do Assunto herdado com sobrescrita, layout do campo do Tema), estas correções e o seed:

1. **Modal "Temas e Assuntos" mais folgado.** Cada Tema e cada Assunto ocupa duas linhas: o nome em cima e o seletor de papel embaixo. O × do Tema fica ao lado do seletor. O "(fixado)" do Assunto aparece abaixo do seletor, não ao lado.
2. **"Indefinido" no lugar de "Sem papel definido"** na interface (modal, seletores, Estatísticas). O dado gravado continua `''` e a busca continua `temasempapel:`.
3. **Seed de Temas e Assuntos** (`semearTemasEAssuntos`, `js/db.js`): 9 Assuntos e 44 Temas, a partir da lista do Victor, sem os temas pessoais ou de geração, sem o Brasil (é Territorialidade) e sem "Território e ambiente". Roda **só em instalação nova** (nada salvo no navegador). O acervo atual do Victor, com os 74 temas, não muda. Os registros do seed são comuns: ficam junto dos temas que a pessoa criar, podem ser editados ou excluídos, e o que for excluído não volta. "Machismo" está em dois Assuntos de propósito.
4. **Excluir em lote nas abas Temas e Assuntos** (pedido do Victor: começar do zero). Aba Assuntos ganhou **"Excluir todos os assuntos"**: esvazia o cadastro, sem tocar em Temas nem em textos. Aba Temas ganhou **"Excluir temas sem texto"**: remove só os Temas que nenhum texto usa e mantém os em uso (vale para qualquer tema sem uso, não só os do seed). Os dois pedem confirmação dizendo quantos saem e quantos ficam, e o **Desfazer** devolve tudo (notas e lugar nos Assuntos incluídos). Não existe exclusão que tire o Tema dos textos. Código: `js/temas.js` (`temasSemTexto`, `resumoExclusaoTemasSemTexto`, `excluirTemasSemTexto`, `excluirTodosAssuntos`), `js/forms.js`, `js/main.js`, `index.html`.
5. **Busca por papel do Assunto e papel do Assunto nas Estatísticas.** Prefixos `assuntoprincipal:`, `assuntosecundario:` e `assuntoindefinido:` (sinônimo `assuntosempapel:`), sobre o papel efetivo do Assunto no texto (herdado do Tema ou fixado na mão); `assunto:` segue achando em qualquer papel. Nas Estatísticas, seletor "Papel do assunto" acima do gráfico de Assuntos (escolha guardada em chave própria, independente da do Tema); o clique na barra abre a lista com o prefixo do papel escolhido. O papel Indefinido junta Tema indefinido e papel fixado como indefinido (decisão do Victor). Código em `js/utils.js`, `js/render-listas.js`, `js/estatisticas-*.js`, `js/main.js` e `index.html`.
6. **Sugestão de Temas duplicados e Desfazer na mesclagem.** Escolha do Victor: sugerir só pela mesma forma escrita (caixa, acento, hífen, espaço, pontuação e plural palavra a palavra), sem lista de "talvez" por erro de digitação. Aba Temas ganha o painel "Possíveis duplicatas" (some quando não há par): cada par mostra as contagens de textos e os botões "Manter X", "Manter Y" e "Não são iguais". Nada é mesclado sozinho. "Não são iguais" grava `naoIguais` nos dois Temas e o par não volta. `mesclarTemas` agora devolve `desfazer`; a mesclagem de Temas (modal comum e painel) mostra o aviso com Desfazer, e a frase da confirmação diz "Você terá alguns segundos para desfazer". Nome contido em outro ("Luto" e "Luto/Finitude"), erro de digitação e sinônimo ficam de fora de propósito. Código: `js/temas.js` (`formaTema`, `sugerirTemasDuplicados`, `marcarTemasNaoIguais`, `mesclarTemas`), `js/render-listas.js`, `js/forms.js`, `js/main.js`, `index.html`.

## Verificação feita

- `npm test`: **2086 passam, 0 falham**. Testes novos desta rodada: `tests/temas-duplicatas.test.js` (12) e `tests/temas-duplicatas-dom.test.js` (5); `tests/temas-fase3.test.js` ajustado (o retorno de `mesclarTemas` ganhou `desfazer`). Da rodada anterior: `tests/seed-temas-assuntos.test.js`, `tests/seed-temas-assuntos-existente.test.js`, o bloco de duas linhas em `tests/assunto-papel.test.js` `tests/temas-excluir-lote.test.js` (18), `tests/assunto-papel-busca.test.js` (11) e o bloco "Papel do assunto nas Estatísticas" em `tests/estatisticas.test.js` (5).
- `npm run lint`: limpo. `prettier --check .` limpo no projeto inteiro; `biblioteca/*.json` está no `.prettierignore` (são gerados por `scripts/montar-pacote.js`).
- Não abri o app no navegador. `happy-dom` não aplica CSS, então o visual do modal e dos botões novos só o navegador confirma.

## Conferência no navegador (pelo Victor)

- Modal de Poema/Prosa, grupo "Temas e Assuntos": Tema numa linha e o seletor "Indefinido/Principal/Secundário" na de baixo, sem aperto. Nos Assuntos, o "(fixado)" abaixo do seletor.
- Fixar um papel num Assunto, salvar, reabrir: a sobrescrita permanece. Voltar a "Automático" remove.
- Tabela: coluna **Tema** (se a configuração de colunas for antiga, ela entra no fim da lista), coluna **Assunto** com ★/☆, Etiquetas sem o Tema.
- `.md`, `.csv` (`assunto_principal`, `assunto_secundario`), Visualização, e exportar/importar JSON com papel fixado.
- **Seed:** o acervo atual não deve ganhar nenhum tema novo. Para ver o seed, abrir o app em outro navegador (ou perfil anônimo): devem aparecer 9 Assuntos e 44 Temas, e criar um tema novo deve somar aos existentes. Excluir um tema do seed e recarregar: ele não volta.
- **Excluir em lote:** aba Assuntos, botão "Excluir todos os assuntos" (vermelho, ao lado de "Novo Assunto"): confirmação com o total, excluir, conferir que os Temas e os textos continuam iguais (os Temas passam a "sem assunto"), Desfazer devolve todos. Aba Temas, botão "Excluir temas sem texto": confirmação com "N saem, M ficam", conferir que nenhum tema em uso some, Desfazer devolve os temas com as notas. Com nada a excluir, só aparece um aviso. Ver os botões no modo escuro e no celular.
- **Busca por papel do Assunto:** na busca de Poemas ou Prosas, digitar `assuntoprincipal:` (e `assuntosecundario:`, `assuntoindefinido:`) com um assunto e conferir que a lista bate com as estrelas ★/☆ da coluna Assunto; um Assunto com papel fixado num texto deve aparecer no papel fixado, não no herdado. A legenda de busca (o "?") deve listar os três prefixos. **Estatísticas:** aba Temas e pessoas, gráfico de Assuntos, seletor "Papel do assunto" (Todos, Principal, Secundário, Indefinido): trocar o papel, ver o gráfico mudar e o aviso âmbar aparecer, fechar e reabrir o app (a escolha fica), e clicar numa barra com um papel escolhido (a lista aberta deve ter o mesmo número da barra). Ver também no modo escuro e no celular.
- **Duplicatas de Temas:** aba Temas, painel "Possíveis duplicatas" no alto da lista. Criar dois temas que só mudam em hífen ou plural (por exemplo "Auto-acolhimento" e "Autoacolhimento", "Memória" e "Memórias") e ver o par aparecer com as contagens. "Manter X": confirmação com o número de textos e assuntos afetados, mesclar, conferir que os textos ficam com o tema mantido e o papel mais forte, e que o Desfazer devolve tudo (nota, posição na lista, Assuntos). "Não são iguais": o par some, recarregar o app e ver que continua sem voltar, Desfazer traz de volta. "Luto" e "Luto/Finitude" não devem aparecer como par. A mesclagem pelo ícone de mesclar de cada linha também deve mostrar o Desfazer. Ver o painel no modo escuro e no celular (linhas quebrando sem estourar a largura).
- Ainda valem da rodada anterior: mesclar Temas, abrir um backup antigo real (migração), linha-aviso em Assuntos, seletor "Papel do tema" nas Estatísticas, buscas `temaprincipal:` e `tema:`.

## Ao começar a próxima sessão

1. `npm install` ANTES de qualquer teste (o zip não traz `node_modules/`); depois `npm test` e `npm run lint`. Esperado: 2323/0 e lint limpo.
2. Se algo da conferência falhar, o relato do Victor manda: corrigir a partir dele.

## Ideias (não decididas; só se o Victor pedir)

- Aposentar o espelho `sinalizacoesTema`.
- Lista separada de "talvez são iguais" por erro de digitação (distância de edição 1, só em nomes longos), só depois de medir no acervo real do Victor: com tolerância 2, "Machismo" e "Racismo" viram par.
- Desfazer nas outras mesclagens (Pessoa, Grupo, Período, Movimento/Escola), no mesmo padrão de `mesclarTemas`.
- Um assunto "Território e ambiente" no seed (Victor disse que não precisa por ora).

## Decisões do Victor que valem

- Papel de Tema: principal, secundário, "indefinido" (antes "sem papel definido"); nada é inferido. `tema:` acha em qualquer papel.
- Papel do Assunto: herda do Tema por padrão, o usuário pode fixar outro por texto.
- Painel "Temas sem assunto" virou linha-aviso (aprovado). A exportação `.md` de Assuntos mantém a própria seção.
- Seed de Temas e Assuntos só em instalação nova; os temas do seed são comuns, ficam junto dos criados pela pessoa.
- JSONs de `biblioteca/` ficam fora do Prettier (`.prettierignore`): a fonte é o `.md` mais o meta, o script regenera byte a byte e o teste `biblioteca-pacotes-curados` guarda o conteúdo.
- Papel do Assunto: `assuntoprincipal:`, `assuntosecundario:`, `assuntoindefinido:` na busca e seletor "Papel do assunto" nas Estatísticas; Indefinido é um só (Tema indefinido e papel fixado como indefinido valem igual).
- Duplicatas de Temas: sugerir só pela mesma forma escrita, nunca mesclar sozinho, com "Não são iguais" e Desfazer na mesclagem; sem lista de "talvez" por ora.
- Começar do zero: "Excluir todos os assuntos" e "Excluir temas sem texto", sempre com confirmação e Desfazer; nunca uma exclusão que tire o Tema dos textos.
- Busca de Local hierárquica (`territorialidade:`), com `...direta:` para o exato e o tipo entre parênteses para homônimos; busca de Idioma por papel e dialeto.
- Dialeto é lista por idioma (vários dialetos num texto, por exemplo um diálogo entre regiões); vale para o idioma todo, não para uma fala.
- Idioma: lista com papel por idioma (mais de um Principal permitido, ao menos um Principal havendo idioma), dialeto ligado ao idioma, sem entidade; Região e Idioma antes de Datas. Fez-se o Idioma antes de terminar Locais para que busca, colunas, exportações, Estatísticas e docs saiam uma vez só para os dois.
- Estatísticas de Local e Idioma: aba própria, direto x com o que está dentro como seletor (padrão direto) mais filtro por tipo, mesmo corpus filtrado das outras telas, clique na barra abre a busca do mesmo modo; Idiomas por papel com aviso da soma. Dialetos e Local ao longo do tempo ficaram de fora por ora.
- Ele prefere: primeiro o mais fácil, depois o difícil; e a sessão termina entregando `.zip` do projeto + este `.md`, mesmo incompleto.
- Ele não gosta de travessão nos textos escritos por mim nem nos textos da interface.
