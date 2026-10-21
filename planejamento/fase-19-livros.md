# Fase 19: Livros (Estrutura no Ver, filtros, autoria, uso de IA, Colaboradores e download)

Plano da Fase 19 e da Fase 19b. Criado em 20/10/2026, a partir da conversa do Victor sobre o que fazer depois do modal Ver do Livro. O painel (`plano-central.md`) guarda só a linha da fase; o detalhe mora aqui. Cada etapa fecha sozinha: o app continua funcionando sem as próximas, os testes direcionados passam e sai um zip só com o que mudou (regra "Tarefas grandes" do `CLAUDE.md`).

## Ponto de partida

O modal **Ver do Livro** foi entregue em 20/10/2026, em três entregas (modal e navegação, olho no Editar livro, documentação). Detalhe em `manutencao/status.md` (entrada de 20/10/2026) e em `manutencao/decisoes.md` (seção "Ver do Livro", escolhas (a) a (i) a confirmar). Pendem de confirmação do Victor, entre elas: o Ver do livro não tem "Baixar" no rodapé (a etapa 7 resolve), só links http e https viram link clicável e a aba Coletâneas não ganhou botão Ver.

Esta fase só acrescenta coisas em cima disso. Nada do que já foi entregue precisa ser refeito.

## Regras que valem para todas as etapas

- Todo campo novo passa pelos **sete elos** do `CLAUDE.md`: dado, migração, lógica do editor, modal, salvar (`forms.js`), busca e coluna, exportação (`.md`, `.csv`, `.json`, Visualização), mais os docs `for-ai`. Ao mudar ou criar um campo, procurar o nome em todo `js/`.
- Backup antigo sem o campo novo abre sem erro, e a Importação Aditiva casa por nome e remapeia ids.
- Estado desconhecido nunca vira afirmação: um livro antigo fica "Não informado", não "Não usou", como já é a situação editorial.
- Sem travessão em texto de interface, exportação, ajuda e documentação.
- Botão com `onclick` inline exige `window.x` (rodar `tests/wiring-onclick.test.js`).

## Etapas

| Etapa | O que entrega                                                                   | Depende de                      | Tamanho |
| ----- | ------------------------------------------------------------------------------- | ------------------------------- | ------- |
| 1     | Confirmação ao fechar o Editar livro com alteração, e Estrutura no Ver          | nada (Ver do Livro já pronto)   | médio   |
| 2     | Cada título da Estrutura abre o Ver do texto                                    | etapa 1                         | pequeno |
| 3     | Filtros da aba Livros                                                           | nada (melhor antes do download) | médio   |
| 4     | Autoria do livro, com papéis                                                    | nada                            | grande  |
| 5     | Uso de IA                                                                       | nada (independente de tudo)     | médio   |
| 6     | Colaboradores: cadastro novo, com aba, e papéis de produção com escopo          | nada (melhor depois da 4)       | grande  |
| 7     | Download na aba e no Ver, em `.json`, `.md` e `.csv`                            | 3, 4, 5 e 6 (sai já com tudo)   | médio   |
| 8     | Download em `.pdf` e `.docx`                                                    | etapa 7                         | médio   |
| 9     | Documentação completa (FAQ, guia `for-ai`, READMEs, `decisoes.md`, `schema.md`) | etapas anteriores               | pequeno |

A ordem é a combinada na conversa. Autoria, IA e Colaboradores vêm antes do download para os arquivos já saírem completos; os filtros vêm antes para "baixar filtrados" fazer sentido. As etapas 4 e 5 podem trocar de lugar sem prejuízo.

### Etapa 1: confirmação ao fechar o Editar livro e Estrutura no Ver

- **Confirmação.** Hoje Poema e Prosa pedem confirmação ao fechar o formulário com alteração e o Livro não, o que é inconsistência e não decisão. O livro tem muito texto longo (Sinopse, Orelhas, Contracapa). O rastreador (`rastreadorLivro`, em `forms.js`) já existe: falta registrá-lo no fechamento do modal em `main.js`, com teste. Cuidar da interação com o olho do Editar ("Salvar antes de ver?") e com a volta ao Ver depois de fechar.
- **Estrutura no Ver.** Seção **recolhível no fim do Ver**, que abre fechada (livro grande tem muita coisa). Dentro dela, Partes, Seções e textos, cada nível também recolhível, com "Expandir tudo" e "Recolher tudo". Usa a mesma ordenação da aba Estrutura, para as duas nunca divergirem (função única). Coletânea mostra Partes e itens. Texto ligado ao livro só por `livrosIds` (sem posição) aparece num grupo à parte no fim, "Vinculados, sem posição", para não fingir uma posição que não existe. No Editar não entra, porque a aba Estrutura já faz esse papel.
- **Teste.** Contagem de itens por nível igual à do rodapé atual do Ver, ordem igual à da aba Estrutura, estado recolhido ao abrir e ao navegar para outro livro.

### Etapa 2: cada título abre o Ver do texto

- Cada título de texto da Estrutura abre o Ver daquele texto. Aceito pelo Victor, que disse que não precisa ser a primeira coisa; por isso é etapa própria e pode ser adiada sem prejuízo.
- **Ponto de atenção.** Empilha modal. Decidir ao começar como o Ver do texto volta para o Ver do livro (fechar, voltar ao livro e reabrir na mesma posição da Estrutura). O molde existe: os links de Elos e Ecos já abrem o Ver, e o Editar do livro já "volta ao Ver" ao fechar.

### Etapa 3: filtros da aba Livros

- Começa com **busca** (título, sigla, ISBN) e filtros de **tipo**, **fase** e **situação editorial**. Depois somam-se "tem capa", "tem ISBN" e "tem loja". Autor, pessoa da equipe e uso de IA entram nas etapas 4, 5 e 6, junto de cada campo.
- **Cuidado com a navegação do Ver.** O Ver do Livro tira a lista de `getListaVisivelLivros` e a congela na abertura. Com filtro, a navegação "n de N" passa a seguir a lista filtrada, e é isso que se espera. Conferir com teste. Hoje a escolha (b) de `decisoes.md` diz que a aba Livros não tem busca nem filtro; atualizar ao fechar a etapa.
- É a base de "baixar filtrados" da etapa 7.

### Etapa 4: autoria do livro, com papéis

- **Campo próprio, não derivado dos textos.** Quem assina a capa é propriedade do livro, não do que ele contém: um livro que só tem o prefácio de alguém não é "do" prefaciador, e numa coletânea a lista de autores dos textos não diz quem organizou.
- **Ligado a Autores** (`db.autores`). Cada autor do livro tem **um ou mais papéis**, da lista fechada: Autor, Coautor, Organizador, Tradutor, Prefaciador, Posfaciador. Cada campo aceita "Outro", com texto livre. A ordem dos papéis dentro de cada pessoa é preservada (pode servir de importância), como nos textos. Papéis incluídos **desde o começo** (decidido pelo Victor), porque acrescentar depois obrigaria a migrar dados.
- **No Ver** aparece também "Autores dos textos deste livro", derivado e somente leitura, para o caso da coletânea ficar visível sem decidir nada pelo livro.
- **Cadeia.** Dado e migração (livro antigo nasce sem autoria), modal de Livro, salvar, busca e filtro por autor (como já existe em Poemas), colunas, exportação, Importação Aditiva, aviso ao excluir um Autor dizendo em quantos livros ele sai (como já acontece com os textos), docs. A forma exata do campo é decidida ao começar, conferindo `manutencao/schema.md` e o molde de pessoas com papéis nos textos.
- O Ilustrador **não** entra aqui (ver etapa 6).

### Etapa 5: uso de IA

- **Estado** (seletor): Não informado (**padrão**), Não usou, Usou. O padrão é "Não informado" e não "Não usou", para livro antigo não afirmar o que nunca foi registrado.
- **Lista de usos**, só quando o estado for "Usou". Cada item, **nesta ordem, com o "Como foi usada" por último** (pedido do Victor: ao fim, independente da ordem dos demais):
    1. **Onde foi usada**, com sugestões: Capa, Ilustração, Texto, Revisão, Tradução, Diagramação, Outro.
    2. **Ferramenta**, texto livre com sugestão dos nomes já usados (o produto: ChatGPT, Gemini, Claude, Copilot, Midjourney, DALL·E, Adobe Firefly, Canva, ou, para quem roda local, o programa: ComfyUI, Ollama).
    3. **Modelo e versão**, opcional, texto livre com sugestão (a "raiz": GPT-4o, Gemini 2.5, Claude Sonnet, Stable Diffusion XL, Flux, ou o arquivo do modelo local). Fica em campo separado da ferramenta, porque o mesmo produto troca de modelo com o tempo e o mesmo modelo aparece em produtos diferentes. Quem só sabe "ChatGPT" deixa em branco sem prejuízo.
    4. **Descrição** livre.
    5. **Data aproximada**, opcional, em data parcial (só o ano, ou mês e ano), porque o modelo muda rápido.
    6. **Como foi usada**, seletor opcional: Gerou do zero, Editou ou refinou algo meu, Sugeriu ideias, Corrigiu ou revisou, Traduziu.
- **Uma nota geral livre** para o livro.
- **Fora de propósito:** a empresa do modelo (dá para deduzir da ferramenta e criaria dado redundante), o texto do prompt (grande e raramente útil; se importar numa obra, cabe na descrição) e o campo "Local ou nuvem" (pode entrar depois, se fizer falta).
- **Quando o uso for num texto específico**, a sugestão é poder apontar para ele pelo cadastro de textos (campo opcional do item; confirmar ao começar, ver F19-D12).
- Aparece no Ver, entra nos filtros da aba ("usou IA") e sai nos downloads.

### Etapa 6: Colaboradores

- **Cadastro novo e próprio**, com aba, separado de `db.pessoas` e de `db.autores`. Motivo: `db.pessoas` guarda quem aparece na vida do Victor (de quem fala, a quem dedica) e `db.autores` guarda quem escreve; capista e revisor ali sujariam os dois cadastros e as Estatísticas de cada um. Nome decidido pelo Victor: **Colaboradores**.
- **No cadastro:** nome, papéis habituais (opcional), site ou contato. **Sem dados demográficos**, que não fazem sentido aqui. Exclusão com aviso de em quantos livros a pessoa sai, busca e Importação Aditiva, como nos outros cadastros. Dá para ver "tudo o que fulano fez".
- **Em cada livro**, a lista "Equipe e créditos" aponta para esse cadastro, com o **papel de cada pessoa naquele livro**, da lista fechada: Capista, Ilustrador, Diagramador, Revisor, Preparador de texto, Editor, Fotógrafo. Cada campo aceita "Outro", com texto livre. A mesma pessoa pode ter vários papéis e estar em vários livros. A mesma pessoa pode estar em Autoria e em Colaboradores (por exemplo, o Victor como Autor e Capista do próprio livro), cada uma com o seu papel.
- **Regra que decide o campo:** quem produz o **conteúdo** da obra vai em Autoria; quem produz o **objeto livro** vai em Colaboradores.
- **Escopo opcional**, em **todos** os papéis de Colaboradores: texto livre com sugestão automática, como a "posição" das Anotações Marginais. Sugestões: Capa, Miolo, Capa e miolo, Capitulares, Encarte (o revisor pode ser "de texto" ou "de provas", o fotógrafo "da capa"). Não há termo consolidado em português que separe o ilustrador que produz do que faz parte do conteúdo: usa-se "ilustrador" nos dois casos e o que muda é **o que foi ilustrado**. Por isso há **um papel só, "Ilustrador"**, com o escopo dizendo capa ou miolo.
- **Ilustração como parte da obra:** se o Victor faz texto e ilustração como uma coisa só, entra em Autoria como Autor e o livro fica sem Ilustrador em Colaboradores. Se outra pessoa ilustra um texto dele, ela entra em Colaboradores como Ilustrador.
- **Aceito pelo Victor:** o escopo em texto livre não filtra com precisão ("todos os livros com ilustração de capa"). A busca por texto resolve, e a variedade real é pequena.
- Filtros novos na aba Livros: pessoa da equipe e papel.
- **Vínculo opcional** entre um colaborador e um Autor ou uma Pessoa, caso um dia faça falta: ver F19-D13.
- É a maior entrega depois da Autoria: cadastro novo, aba, modal, exclusão, busca, importação, exportação, docs. Dividir em duas (lógica e cadastro; depois ligação ao livro) se passar de uns cinco arquivos por zip.

### Etapa 7: download em `.json`, `.md` e `.csv`

- **Só as informações do livro, sem o conteúdo dos textos.** Isso o distingue da exportação da aba Estrutura.
- **Na aba Livros**, no mesmo padrão das outras abas: seletor de formato mais Baixar, com escopo **Todos**, **Filtrados** ou **Selecionados** (caixinhas nos cards). **No Ver do Livro**, um Baixar para o livro aberto no rodapé.
- A capa sai só como "tem capa", sem a imagem. Lojas e links saem como lista. Saem também Autoria, Equipe e créditos e Uso de IA, já com os campos das etapas 4 a 6.
- Reaproveitar o que a aba Tag clusters e as Conexões já fizeram (escopo, seleção, formato guardado) em vez de reinventar.

### Etapa 8: download em `.pdf` e `.docx`

- Os mesmos escopos e os mesmos dados da etapa 7. A base dos geradores de `.pdf` e `.docx` de texto já existe e é reaproveitada, mas é trabalho a mais, por isso fica numa entrega separada.
- Se algum dos dois passar de uns cinco arquivos, divide-se em duas entregas.

### Etapa 9: documentação completa

- FAQ (perguntas novas sobre Estrutura no Ver, filtros, autoria, uso de IA, Colaboradores e baixar livro), tarefas novas no Como faço, guia `for-ai` do livro (critério, não formato), os quatro README, `manutencao/decisoes.md` e `manutencao/schema.md`, e `plano-concluido.md` (a Fase 19 vira linha lá).
- Durante as etapas 1 a 8, só o "Estado atual" do `status.md` é reescrito (regra de duas camadas do `CLAUDE.md`).

## Decisões tomadas (conversa de 20/10/2026)

Código, decisão e origem. "Aprovada com o plano" quer dizer que o Claude propôs e o Victor aceitou o plano em etapas sem objetar.

| Código  | Decisão                                                                                                                                                   | Origem                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| F19-D1  | Fechar o Editar livro com alteração passa a pedir confirmação, como Poema e Prosa                                                                         | Aprovada com o plano   |
| F19-D2  | Estrutura no Ver: seção recolhível no fim, fechada ao abrir, com níveis recolhíveis e a mesma ordenação da aba Estrutura                                  | Aprovada com o plano   |
| F19-D3  | Cada título da Estrutura abre o Ver do texto, em etapa própria e adiável                                                                                  | Victor                 |
| F19-D4  | Filtros da aba Livros antes do download; começam por busca, tipo, fase e situação editorial                                                               | Aprovada com o plano   |
| F19-D5  | Autoria é campo próprio do livro, ligado a Autores, com papéis desde o começo (Autor, Coautor, Organizador, Tradutor, Prefaciador, Posfaciador, Outro)    | Victor                 |
| F19-D6  | Colaboradores é um cadastro novo, separado de Pessoas e de Autores; nome escolhido pelo Victor                                                            | Victor                 |
| F19-D7  | Regra de fronteira: conteúdo da obra em Autoria, objeto livro em Colaboradores. Ilustrador fica em Colaboradores                                          | Victor ("faz sentido") |
| F19-D8  | Escopo opcional em todos os papéis de Colaboradores, texto livre com sugestão; um papel só de Ilustrador. Não filtrar com precisão é aceito               | Victor                 |
| F19-D9  | Uso de IA estruturado: estado (padrão "Não informado"), lista de usos com ferramenta e modelo e versão em campos separados, e "Como foi usada" por último | Victor                 |
| F19-D10 | Download só com as informações do livro, na aba (Todos, Filtrados, Selecionados) e no Ver; `.json`, `.md`, `.csv` primeiro, `.pdf` e `.docx` depois       | Victor                 |
| F19-D11 | Limite de 10 fases ativas no painel; fase concluída sai do painel para `plano-concluido.md`; esta fase tem arquivo próprio                                | Victor, 20/10/2026     |

## Decisões em aberto (sugestão ao lado; nenhuma bloqueia a etapa 1)

| Código  | Pergunta                                                                         | Sugestão                                                                                                         | Bloqueia |
| ------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| F19-D12 | O item de Uso de IA pode apontar para um texto específico do acervo?             | Sim, como campo opcional do item (um texto só); se o texto for excluído, o item fica e o vínculo some, com aviso | etapa 5  |
| F19-D13 | Ligar um Colaborador a um Autor ou a uma Pessoa, quando for a mesma pessoa?      | Deixar fora da primeira versão; abrir depois como vínculo opcional, sem fundir os cadastros                      | etapa 6  |
| F19-D14 | Excluir um Autor ou um Colaborador usado em livros: aviso ou bloqueio?           | Aviso com a contagem de livros e Desfazer, como nos textos                                                       | 4 e 6    |
| F19-D15 | Na etapa 2, como o Ver do texto devolve ao Ver do livro?                         | Fechar o Ver do texto reabre o Ver do livro na mesma lista e com a Estrutura no mesmo estado                     | etapa 2  |
| F19-D16 | Papéis em Autoria e Colaboradores: lista fixa no código ou editável pelo Victor? | Fixa agora, com "Outro" livre. Se um papel novo se repetir, vira item da lista numa revisão                      | 4 e 6    |

## Fase 19b: filiações do Autor (por exemplo, a Academia Brasileira de Letras)

- **Origem.** Pergunta do Victor, em 20/10/2026: o cadastro de Autor tem campo para dizer se ele pertence ou pertenceu à Academia Brasileira de Letras? Não tem. Os campos mais próximos não encaixam: **Instituições frequentadas** é de formação, **Prêmios** tem nome e ano mas ser imortal não é prêmio, e **Círculo literário** serve para grupos e coletivos e perderia o que é específico da ABL.
- **Proposta (o Victor achou que "fez sentido").** Um campo de **filiações**: academias, sociedades e associações, como **lista repetível** no molde de Prêmios, com **nome** e, opcionalmente, **cadeira**, **ano de ingresso** e **ano de saída**. A cadeira é o dado que importa na ABL, e o período permite dizer "pertenceu" sem apagar o vínculo. Sugestão automática dos nomes já usados.
- **Cadeia inteira** (dado, migração, modal de Autor, salvar, busca e coluna, exportação, importação aditiva, docs `for-ai`), com a regra "só preencher onde a biografia documenta".
- **Fase própria, depois do que foi combinado.** Segundo a conversa, não bloqueia nem depende dos livros. Mesma convenção de número da Fase 2b.
- **Cuidado com a Estatística de Autores (Fase 6).** Filiação é dado novo para os cruzamentos; registrar lá quando a Fase 6 começar.

## Resumo que estava no painel (movido do `plano-central.md` em 20/10/2026, sem reescrever)

- **Origem.** Conversa do Victor de 20/10/2026, depois do modal Ver do Livro. Nove etapas, cada uma fechando sozinha com zip: (1) confirmação ao fechar o Editar livro e Estrutura recolhível no Ver; (2) cada título da Estrutura abre o Ver do texto; (3) filtros da aba Livros; (4) Autoria do livro, com papéis; (5) Uso de IA; (6) Colaboradores, cadastro novo de produção; (7) download em `.json`, `.md` e `.csv`, na aba e no Ver; (8) download em `.pdf` e `.docx`; (9) documentação completa.
- **Decisões do Victor.** Autoria é campo próprio (não derivada dos textos), com papéis desde o começo. Quem faz o objeto livro (capista, diagramador, revisor, ilustrador, preparador, editor, fotógrafo) vai num **cadastro novo chamado Colaboradores**, separado de Pessoas e de Autores. Uso de IA estruturado, com "Como foi usada" no fim de cada item. Download só com as informações do livro, sem o conteúdo dos textos.
- **Decisões em aberto:** F19-D12 a F19-D16, no arquivo da fase, nenhuma bloqueia a etapa 1.

### Fase 19b (resumo do painel)

- Campo repetível de filiações (academias, sociedades, associações) no cadastro de Autor, com nome e, opcionalmente, cadeira, ano de ingresso e ano de saída, no molde de Prêmios. Nasceu da pergunta sobre a Academia Brasileira de Letras. Detalhe no `fase-19-livros.md`.
