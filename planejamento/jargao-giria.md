# Plano: campo "Jargão e gíria" (grupo Idioma)

Pedido fora de fase, aberto em 18/10/2026. Este arquivo é o plano vivo da tarefa: decisões, forma do dado, entregas e o que falta. O resumo curto fica no "Estado atual" de `manutencao/status.md`, que aponta para cá.

## Como retomar em um chat novo

1. Mandar o zip do projeto atualizado e este arquivo.
2. Pedir ao Claude para ler o `CLAUDE.md` da raiz, depois só a seção "Estado atual" do `manutencao/status.md`, depois este plano e `manutencao/licoes-de-sessao.md` (a tarefa mexe na cadeia de um campo).
3. Conferir o código do zip contra o "Estado atual" antes de continuar, sem refazer o que já foi entregue.
4. Seguir a próxima entrega pendente da lista abaixo.

Texto sugerido para abrir o chat: "Vamos continuar o campo Jargão e gíria. Leia o CLAUDE.md, o Estado atual do status.md e planejamento/jargao-giria.md, e siga a próxima entrega pendente."

## O que é o campo e por que existe

Registra quando o texto **fala com** o vocabulário de uma comunidade ou meio, de forma literal: gíria de internet, gíria juvenil, jargão corporativo, linguagem de fandom. A ideia nasceu de "Gen Z", que mistura "demasiado" e "desbravados" com "cringe", "vibe" e "meter o louco".

O que ele **não** é, e por quê:

- **Não é Registro da Sonoridade.** O select Registro (aba Sonoridade, `REGISTROS_SONORIDADE` em `js/utils.js`) mede a formalidade geral da língua, com um valor por poema: Culto/Erudito, Padrão/Neutro, Coloquial/Popular, Misto/Híbrido, Neológico/Experimental. Fica como está. Marcas de oralidade comum ("pra", "tô", "nossa") são desse select, não deste campo.
- **Não é Domínio Imagético.** Domínio Imagético é o campo do saber usado como metáfora (o amor descrito como julgamento). Aqui é o vocabulário usado literalmente. Pergunta-teste: o texto fala **com** essas palavras ou fala **como se fosse** esse campo? Se for a segunda, é Domínio Imagético.
- **Não é Tema nem Referência.** Citar memes, streamings ou apps (como em "Canteiro de Íris" e "Ciberamor") é falar **de** algo, não **com** o vocabulário.
- **Não é Dialeto.** Dialeto pertence a uma língua (o carioca é do pt-BR). Gíria de internet não pertence a uma língua só: "cringe" é palavra inglesa dentro de texto em pt-BR.

## Decisões tomadas (todas do Victor, 18/10/2026)

- **D1.** Campo novo no grupo Idioma, não etiqueta. Motivo: o universo é o mesmo de Idioma e Dialeto, e as etiquetas são diversas entre si.
- **D2.** Campo irmão no nível do texto, **fora de `idiomas[]`**. Motivo: dialeto é por idioma, gíria e jargão não.
- **D3.** Nome na interface: **"Jargão e gíria"**. Evita colisão com Registro (Sonoridade), com "Vocabulário" (termo do modelo de importação de campos) e com Domínio Imagético. "Léxico especializado" foi descartado por sugerir área de conhecimento, o que invade o Domínio Imagético.
- **D4.** Sementes, só como sugestão (nunca gravadas sozinhas): Gíria de internet, Gíria juvenil, Jargão corporativo, Linguagem de fandom. "Gíria juvenil" entrou porque "Vulgarize!" usa gíria de balada ("dar PT", "pegação", "vaza"), que não é gíria de internet.
- **D5.** Cadeia inteira, em entregas pequenas, uma por vez (regra "Tarefas grandes" do `CLAUDE.md`).
- **D6.** Opcional e esparso, como o Dialeto. Em uma varredura por palavras-chave nos 289 poemas e 21 prosas, só "Gen Z" e "Vulgarize!" mostraram uso claro. A varredura não leu o acervo inteiro, então pode haver mais.

## Forma do dado

`jargaoGiria: string[]` em cada Poema e Prosa. Lista de textos livres, sem idioma associado, sem ordem obrigatória. Repetidos são juntados sem diferenciar caixa nem acento, mantendo a primeira grafia. Texto sem o campo lê como `[]`.

- `JARGAO_GIRIA_SEMENTES`, `normalizarJargaoGiria`, `jargaoGiriaDoItem`, `extrairJargaoGiriaUnicos` em `js/utils.js` (perto de `extrairDialetosUnicos`).
- `migrarJargaoGiria` em `js/db.js`: roda no carregamento e no `importarDB`, idempotente, não toca nos campos de idioma.
- Prefixo de busca previsto: `jargao:` (sem acento, como `dialeto:`).

## Textos reais como referência

| Texto | Jargão e gíria | Observação |
|---|---|---|
| "Gen Z" (poema 188) | Gíria de internet | "cringe", "vibe", "trends", "Ok, Boomer", "redpills". No select Registro seria Misto/Híbrido. |
| "Vulgarize!" (poema 53) | Gíria juvenil | "recalcados", "dar PT", "pegação", "vaza", mais "haters". |

Não entram (usar como casos negativos em exemplos e testes): "Canteiro de Íris" e "Ciberamor" (falam de tecnologia, vocabulário comum), "A validação que eu buscava" ("bater metas" só como contraste). Um bloco de poemas tardios com muita oralidade ("16º-17º", "A meu ex rancoroso", "Dança das sombras", "tento corrigir", "O mais amargo", "deserto mundano") é matéria do select Registro, não deste campo.

## Entregas

Estado em 18/10/2026: **as 6 entregas estão prontas.** A 6ª (importação de campos por `.json`) foi decidida pelo Victor depois da 5ª.

### Entrega 1: dado, normalização e migração (pronta)

`js/utils.js`, `js/db.js`, `tests/jargao-giria.test.js` (12 testes).

### Entrega 2: modal e salvar (pronta)

- `js/editor.js`: bloco "Jargão e gíria" dentro de `criarGrupoRegiaoHTML`, logo abaixo de Idioma, ids `${prefixo}-jargao-giria-input`, `-container`, `-sugestoes` e `-json` (campo oculto que avisa o rastreador de alterações). Funções `adicionarJargaoGiriaTexto`, `removerJargaoGiriaTexto`, `obterJargaoGiriaTexto` (inclui o valor digitado e não confirmado), `resetJargaoGiriaTexto`, `carregarJargaoGiriaTexto`. Enter e o botão devolvem o foco ao campo; sair do campo (`onchange`) confirma sem puxar o foco.
- `js/forms.js`: `jargaoGiriaParaSalvar`, entrando em `dados` por espalhamento nos dois salvamentos, mais reset e carga de Poema e Prosa.
- `js/ui.js`: reset ao abrir texto novo. `js/main.js`: `window.adicionarJargaoGiriaTexto` e `window.removerJargaoGiriaTexto`.
- `tests/jargao-giria-modal-dom.test.js` (12 testes).

### Entrega 3: coluna e busca por prefixo (pronta)

- `js/utils.js`: entrada em `CAMPOS_ATRIBUTO` **e** em `PREFIXOS_CANONICOS_POR_CAMPO` (`jargao:` apontando para `_buscaJargaoGiria`), mais o mapa `_buscaJargaoGiria` para `jargao`, no mesmo ponto onde `dialeto: '_buscaDialeto'` já vive. Lição registrada: já houve prefixo que existia na UI e nunca funcionou por faltar uma das duas entradas.
- `js/render-listas.js`: `_buscaJargaoGiria: jargaoGiriaDoItem(item).join(', ')` ao lado de `_buscaDialeto` (em `decorarCamposBusca`), e a célula da coluna.
- `js/colunas.js`: nova coluna em `DEFINICAO_COLUNAS`, na posição que espelha o modal (logo depois de Idioma), desligada por padrão; ligar a lupa de busca por coluna (`COLUNA_CAMPO_BUSCA`).
- `index.html`: documentar o prefixo `jargao:` nos **dois** painéis de ajuda de busca (os que hoje citam `dialeto:`).
- Testes direcionados: `busca-local-idioma`, `colunas`, `colunas-contagem` e o novo teste de busca do campo.
- Feito em 18/10/2026: tudo acima, mais a ordenação (`COMPARADORES_ORDENACAO`, em `js/render-listas.js`). Teste novo `tests/jargao-giria-busca-coluna.test.js` (10) e `tests/colunas.test.js` ajustado (a ordem de fábrica ganhou `jargaoGiria` depois de `idioma`).

### Entrega 4: exportação e Visualização (pronta)

- `.md`: `js/exportar-md.js`, uma linha "Jargão e gíria" logo depois de "Idioma" (mesmo `linhaMeta`, só quando houver valor).
- `.csv`: `js/exportar-csv.js`, coluna `jargao_giria` logo depois de `dialetos`. **Obrigatória nesta entrega:** o teste-guarda `tests/exportar-csv.test.js` só enxerga chaves escritas direto em `dados` e o campo entra por espalhamento, então ele não cobra a coluna sozinho.
- `.json` (`montarRegistro` em `js/exportar.js`): conferir se o campo viaja (provável pelo espalhamento do item, mas confirmar no código).
- Visualização: `js/visualizar.js`, `linhaMetaHtml` depois de Idioma.
- Testes direcionados: `exportar-csv`, `exportar-md`, `visualizar` (nomes a conferir em `tests/`).
- Feito em 18/10/2026: tudo acima. `.json` confirmado sem mudança de código (espalhamento do item). PDF e DOCX herdam a linha do `.md` por `itemParaMarkdownPartes`. Teste novo `tests/jargao-giria-saidas.test.js` (9), que cobra a coluna do `.csv` explicitamente.

### Entrega 5: importação, guias e documentação (pronta)

- Importação Aditiva (`js/importar-aditivo.js`) e importação de campos (`js/importar-campos.js`, `js/importar-campos-extras.js`): conferir como `idiomas` e `dialetos` atravessam e decidir se `jargaoGiria` entra. O dado novo deve atravessar intacto em pacote de texto e backup.
- Guias para IA: `docs/campos-poema-prosa-for-ai.md` e `-pt-br.md` (campo novo no bloco de idioma, com a pergunta-teste "fala **com** ou fala **de**" e o limite com Domínio Imagético e Registro). Ver se `docs/importar-campos-for-ai*.md` precisa de menção.
- `manutencao/schema.md` (perto da linha de `idiomas`), `manutencao/decisoes.md` (porquês D1 a D6) e o "Estado atual" final do `status.md`.
- Procurar `dialetos`/`jargaoGiria` em todo `js/` ao fechar, não só nos arquivos lembrados (regra de `licoes-de-sessao.md`).
- Feito em 18/10/2026: a Importação Aditiva (`{ ...itemOrigem }`) e o backup levam a lista intacta (teste em `tests/jargao-giria-importacao.test.js`); o pacote de texto só deixa passar título, texto, tipo, idioma e fonte, então o campo fica de fora, como os dialetos; a importação de campos por `.json` não foi mexida (Idioma também fica de fora dela). Guias `campos-poema-prosa-for-ai` (EN e PT) com a pergunta-teste "fala COM ou fala DE" e o limite com Domínio Imagético, Registro, Tema e Dialeto; `schema.md` e `decisoes.md` (seção "Jargão e gíria"). Busca final em todo `js/`: os arquivos que tratam `dialetos` tratam `jargaoGiria` também.

### Entrega 6: importação de campos por `.json` (pronta)

Decisão do Victor em 18/10/2026: a importação de campos aceita `jargaoGiria`, por ser mais prático para classificar o acervo em lote.

- `js/importar-campos-extras.js`: `lerJargaoGiria` (lista ou texto separado por vírgula; chaves `jargaoGiria`, `jargao_giria`, `jargão e gíria`, `jargao e giria`, `jargao`) e `aplicarJargaoGiria` (só soma, sem cadastro; marca como novo o termo que não é semente nem já está em nenhum texto). `js/importar-campos.js`: relatório, resumo (`vinculosJargaoGiria`) e `cadastroNovo.jargaoGiria`.
- `js/ui-importar-campos.js`: frase "jargão ou gíria somado", linha "+ Jargão e gíria" por texto e a lista de termos novos. `js/modelo-importar-campos.js`: explicação em `como_usar`, exemplo, `sugestoes_jargao_giria` e, com vocabulário, os termos já usados. Textos do modal, do cartão da aba Importação, do FAQ e do Como faço.
- Guias `importar-campos-for-ai` (EN e PT) com a regra "fala COM ou fala DE" e "na dúvida, deixe de fora"; ponteiro em `campos-poema-prosa-for-ai` (EN e PT).
- Testes: `tests/importar-campos-jargao-giria.test.js` (15) e um caso em `tests/importar-campos-dom.test.js`.

## Fora do escopo por enquanto

- **Idioma e dialetos** continuam fora da importação de campos.
- Edição em massa dos campos de texto (Poemas e Prosas): o campo entraria como chips, como os demais. Não foi pedido.
- Localizar e Substituir e Estatísticas (por exemplo, um gráfico de jargão e gíria na aba Local e idioma). Sem pedido.
- Classificar o acervo existente: preencher o campo nos textos reais ("Gen Z", "Vulgarize!") é trabalho manual do Victor ou uma rodada de classificação em lote, depois da entrega 5.

## Regras de trabalho que valem aqui (do `CLAUDE.md`)

- Não rodar `npm test` completo. O Victor roda (cerca de 40 s) e manda `# pass` e `# fail`. O Claude roda só os testes das entregas e dos vizinhos, mais eslint e prettier nos arquivos tocados, e avisa se algum demorar.
- O zip do projeto não traz `node_modules/`: `npm install` antes de rodar eslint, prettier ou teste.
- Zip só com os arquivos que mudaram, dizendo o que foi rodado e o que ficou por conta do Victor. Arquivo apagado vai em lista à parte.
- Sem travessão em texto de interface, exportação, ajuda, documentação e respostas. Nomes de arquivo novos em minúsculas e sem acento.
- Botão com `onclick` inline exige `window.x`; rodar `tests/wiring-onclick.test.js`.
- Ao fim de cada entrega, reescrever só o "Estado atual" do `status.md`. `decisoes.md`, `schema.md` e este plano completo ficam para a última entrega.

## O que o Victor ainda precisa conferir

- Rodar `npm test` completo depois das entregas 1 e 2.
- No navegador: o bloco "Jargão e gíria" nos modais de Poema e Prosa, em tema claro e escuro (chips, sugestões, Enter, botão, remover, salvar e reabrir o texto).
