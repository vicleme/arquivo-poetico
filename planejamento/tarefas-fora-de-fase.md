# Tarefas combinadas fora de fase

Criado em 24/10/2026, para nada sumir do horizonte entre sessões. Cada tarefa tem número (T1, T2...), ordem de execução, o que o Victor decidiu e o que falta. A ordem geral está na seção "Fila de trabalho" do `plano-central.md`; aqui mora o detalhe de cada uma. Quando uma tarefa fecha, o detalhe do que foi feito vai para `status.md` e `decisoes.md`, e a tarefa sai daqui (ou fica marcada como feita até a próxima arrumação).

> **Leitura rápida (27/10/2026): T1 a T14 estão todas feitas (a T14, ligações Tema × Pessoa, fechou em 27/10/2026)** (a T8 nunca existiu; a Fase 21 também está concluída). O texto de cada tarefa abaixo é o **pedido original e as decisões**, preservados como histórico: frases como "Hoje é um formulário corrido" descrevem o estado de antes da tarefa, não o de agora. O que ainda falta de cada uma é só **conferir no navegador** (roteiros no `status.md`). Em aberto de verdade: o filtro por data da obra na busca de Poemas e Prosas (candidato listado no "Próximo passo" do `status.md`).

## T0. Conferir o que já foi entregue (do lado do Victor)

- ~~Aplicar o zip da Sinopse curta~~ (feito e testado por ele em 24/10/2026; `npm test` passou).
- O "1 skipped" do `npm test` era um teste que dependia de `data/arquivo_poetico_backup_2026-10-08.json`, que não existe mais: removido em 24/10/2026 (`tests/periodos-historicos-multiplos.test.js`), no mesmo molde do que já tinha sido feito com o teste de backup antigo dos Períodos Biográficos.
- Conferir no navegador os roteiros do `status.md`, sobretudo a aba Livros inteira, o `.docx` no Word e as sugestões das buscas (entrega 1 não tem tela).
- Confirmar F19-D15 e F19-D16 (aplicadas como o plano sugeria), manter o `fase-19-livros.md` por causa da Fase 19b, e dar um olhar nos rótulos cortados pelo prettier no `fase-19-livros.md` e no `plano-central.md` (em 27/10/2026 a linha de separação da tabela "Fases ativas" do `plano-central.md` estava faltando e foi recolocada).

## T1. Modal Editar Livro em seis grupos recolhíveis (decidido em 23/10/2026, FEITA em 24/10/2026, falta conferir no navegador)

Hoje é um formulário corrido com cerca de 35 campos. Usar o mesmo padrão dos modais de Poema e Prosa (`campo-grupo`). Só os grupos 1 e 2 começam abertos.

1. **Identificação** (aberto): título, sequência, tipo, fase, sigla oficial e sigla pessoal.
2. **Autoria e créditos** (aberto): Autoria, Equipe e créditos, Uso de IA.
3. **Apresentação do livro** (antes "Textos do livro", renomeado em 24/10/2026 para não se confundir com os poemas e prosas): Sinopse curta, Sinopse, Versos de Abertura (ao lado da Contracapa), Contracapa, Orelha 1 e Orelha 2.
4. **Capa**: envio da imagem, link da imagem, descrição da capa e frase da capa.
5. **Publicação**: data de primeira publicação, data da última edição, Situação editorial (com Desde quando e nota), ISBNs e lojas.
6. **Arquivos e registros**: PDF, Epub, código de barras, ficha catalográfica, certificado e carta de exclusividade.

Cuidados: não perder a ordem dos ids que o salvar lê (`forms.js`), rodar os testes que leem o modal (`tests/*livro*`, `wiring-onclick`), e conferir o rastreador de alterações (o "Alterações não salvas" do fechar).

Sinopse curta (feita): contador de caracteres que só informa, sem travar; aparece no Ver, nas saídas `.json`, `.md`, `.csv`, `.pdf`, `.docx` e, desde 24/10/2026, no card (3 linhas no máximo).

## T2. "Coletâneas:" no Ver e nas exportações de Poema e Prosa (FEITA em 24/10/2026, 2 entregas, falta conferir as exportações no navegador)

Hoje o modal de edição mostra em que Coletâneas o texto está (`renderColetaneasInfo`), mas o Ver e as exportações não. Levar para: Ver, `.md`, `.csv`, `.json`, `.pdf` e `.docx`. Fonte: `itensColetanea`, ligando o texto por `refId`. Formato sugerido: títulos das Coletâneas, na ordem do acervo. Não depende da Fase 21. Quando a Fase 21 andar, passa a ler da lista de aparições.

**Como ficou:** `js/coletaneas-do-texto.js` (`titulosDeColetaneasDoTexto`) é a fonte única. Só os títulos, sem a Parte, separados por vírgula no Ver e no `.md` (e portanto no `.pdf` e `.docx`, que reaproveitam o `.md`); no `.json` é `contexto.coletaneas` (lista; a Importação Aditiva já descarta `contexto`); no `.csv` é a coluna `coletaneas` (separador " | "), depois de `livros_vinculados`. Linha e coluna ficam vazias quando o texto não está em Coletânea. Na Fase 21, trocar só o corpo dessa função.

## T3. Estrutura em árvore no Baixar de Livros e Baixar na aba Coletâneas (decidido em 24/10/2026; FEITA em 24/10/2026, em quatro entregas: lógica pura, a tela, `.pdf` e `.docx`, e docs; falta conferir no navegador e no Word)

- Só os **títulos** em árvore (Partes, Seções, Elementos, Poemas e Prosas, e os vinculados), sem o texto dos poemas e prosas.
- No Baixar da aba Livros (e no Ver e no card): caixa "Incluir estrutura", desligada na primeira vez para não mudar o que já existe; **a escolha fica lembrada** (decidido em 24/10/2026, vale para o Baixar de Livros e o da aba Coletâneas). Hoje o registro do livro só leva a contagem (`estrutura`).
- Botão Baixar na aba Coletâneas, com a mesma opção e o mesmo gerador (`montarArvoreDoLivro` já trata Coletânea).
- Formatos: `.md` (lista aninhada), `.json` (aninhado), `.csv` (dois arquivos num `.zip`: o largo de sempre e o `-estrutura.csv`, uma linha por nó com nível e caminho; decidido em 24/10/2026), `.pdf` e `.docx` (lista com recuo).
- Planejar em entregas: lógica pura e testes, depois tela, depois `.pdf` e `.docx`, depois docs.

## T4. Correção do `escola:` (decidido em 23/10/2026, opção A; FEITA em 24/10/2026, falta conferir no navegador)

A busca de Poemas e Prosas trata `movimento:` e `escola:` como sinônimos, sem olhar o campo Programa da corrente (Escola, Movimento, Vanguarda, Grupo/Círculo, Tendência, Não se aplica). Os painéis de ajuda dizem o mesmo.

- Criar `corrente:` como prefixo neutro, com o comportamento de hoje do `movimento:` (acha a corrente pelo nome, qualquer Programa).
- `movimento:` passa a achar só correntes com Programa Movimento, e `escola:` só as com Programa Escola, com a herança do pai incluída (subcorrentes herdam o Programa).
- `movimentodireto:` e `escoladireta:` seguem o mesmo critério; entra `correntedireta:`.
- Custo aceito: `movimento:Parnasianismo` deixa de achar, porque o Parnasianismo é Escola.
- Atualizar: os painéis de ajuda do `index.html` (três lugares), docs `for-ai`, FAQ, Como faço e testes. A tabela de descrições de `js/sugestoes-busca-texto.js` tem um teste que falha se faltar ou sobrar prefixo, então `corrente:` e `correntedireta:` ganham descrição lá.
- Vem ANTES das sugestões (T5), para a caixinha nascer com os prefixos finais.

## T5. Sugestões ao digitar nas buscas de Poemas e Prosas (FEITA em 24/10/2026, entregas 1 a 3)

Entrega 1 (lógica pura, `js/sugestoes-busca-texto.js`, 31 testes) feita em 23/10/2026; entrega 2 (adaptador e caixinha) e entrega 3 (documentação) feitas em 24/10/2026, e o Victor conferiu no navegador. Detalhe e escolhas em `decisoes.md` (seção "T5"). Decisões do Victor (23/10/2026):

- O `*` só é oferecido onde há valores para sugerir (nunca leva a uma busca vazia); `dataescrita:` e `datapublicacao:` sempre oferecem o `*`.
- `pessoa:` sugeria só os nomes, sem `@papel`; depois da T6, `pessoa:Nome@` oferece os papéis da pessoa. `papel:` sugere os papéis em uso.
- Os apelidos aparecem depois dos prefixos canônicos. **Mudança por causa da T4:** depois da correção, `escola:` e `movimento:` deixam de ser apelidos e viram prefixos de verdade; a nota "o mesmo que movimento:" some, e `escola:` e `escoladireta:` entram na caixinha normalmente.
- Entrega 2: adaptador que monta a tabela de fontes a partir do acervo (etiquetas, temas, pessoas, livros, idiomas e o resto) e a caixinha sob a busca de Poemas e de Prosas, no molde de `ui-sugestoes-busca-livros.js`. `genero` fica oculto em Poemas (`opcoes.prefixosOcultos`).
- Entrega 3: documentação (`decisoes.md`, FAQ se couber) e uma linha no painel de ajuda da busca.

## T6. `pessoa:Nome@Papel` na busca de Poemas e Prosas (FEITA em 24/10/2026, entregas 1 e 2; falta conferir no navegador)

Feito: entrega 1 (a busca por vínculo) e entrega 2 (forma feminina do papel, `@papel` na caixinha de sugestões, painel "?" e `decisoes.md`). Pedido original, para memória:

Hoje a busca guarda nomes de pessoas de um lado e papéis de outro, então `pessoa:Pedro papel:Dedicatário(a)` acha o texto mesmo que Pedro só seja Mencionado e outra pessoa seja a Dedicatária. O Victor quer o vínculo exato na busca escrita, como em Livros (`autor:Maria@Tradutor`), com `-` para excluir e `ou`. Encaixa no trabalho de revisar papéis de pessoas. Esforço médio: a busca precisa guardar os pares pessoa e papel. Depois, a caixinha passa a sugerir `@papel`. Os dois seletores da aba continuam existindo.

## T7. Texto apontando para nada depois de excluir Livro, Parte ou Seção (decidido e FEITA em 24/10/2026, F21-D10; falta conferir no navegador)

Bug de hoje, achado no levantamento da Fase 21 e confirmado com o `db` real: excluir Livro, Parte ou Seção não mexia em `paiTipo`, `paiId` nem `livrosIds` dos textos. A coluna Estrutura mostrava "Avulso", mas o filtro "Avulsos" não listava o texto.

- Feito: o texto cujo Destino aponta direto para o item excluído perde `paiTipo`, `paiId` e `sequencia` (vira avulso de verdade), e o Livro excluído sai de `livrosIds`. O texto nunca é excluído.
- Aviso na confirmação ("2 textos ficarão avulsos e o livro sairá dos vínculos de 1 texto"); o Desfazer devolve Destino, `sequencia` e o id no mesmo índice de `livrosIds`. Vale para exclusão única e em massa.
- Só o vínculo direto muda. Texto numa Seção cuja Parte foi excluída continua na Seção, que existe. Não precisa fechar buraco de numeração: a fila de onde o texto saiu era a do próprio item excluído.
- **Fora desta tarefa, para o Victor decidir:** excluir um Livro comum ou uma Parte também deixa **Partes, Seções e Elementos** apontando para um pai que não existe (só a Coletânea cascateia). Mesmo defeito, em outras entidades; hoje aparece como pai "---" nas abas deles. Quem quiser, vira T8.
- Limpeza das referências já penduradas nos dados existentes: não feita (a exclusão corrige daqui para a frente). Se houver textos antigos nessa situação, o caminho é abri-los no modal e escolher o Destino, ou uma ação única de limpeza (a decidir).

## T9. Intertextualidade, Hipertextualidade e Referências na aba Conexões (combinada em 24/10/2026, depois da T5; FEITA em 25 e 26/10/2026, 13 entregas, falta conferir no navegador)

**Situação (26/10/2026):** fechada. Seção "Fora do acervo", Corrigir obra e autor, Modo revisão, autoria em lista, data da obra, relatório em `.md`, `.csv` e `.pdf`, a aba "Datas das obras" nas Estatísticas (a "aba nas Estatísticas" da entrega 4 do plano original, feita como entrega 9 do plano de 13) e a documentação única (entrega 13) estão prontas; o detalhe de cada entrega está em `status.md` (Fechado) e os porquês em `decisoes.md` ("T9, Fora do acervo ..."). **Em aberto:** conferir no navegador. O filtro por data da obra na busca de Poemas e Prosas (`dataobra:`, `datareferencia:`, `distanciaobra:`, `distanciareferencia:`), que faltava para as barras de Datas das obras abrirem a lista de textos, foi feito em 27/10/2026 (ver `decisoes.md`, "T9, filtro por data da obra"). O texto abaixo é o plano original e fica como histórico.

Ideia do Victor: agora que Intertextualidade, Hipertextualidade e Referências estão estruturadas (Relação, Tipo de obra, Obra, Autor, Descrição), mostrá-las também na aba Conexões, como já é feito com Elos e Ecos.

**Decisões dele (24/10/2026):**

- **Aba única.** Intra e Transtextualidade ficam na mesma aba Conexões, em duas seções separadas (recolhíveis ou com seletor no topo): "Dentro do acervo" (Elos e Ecos, como hoje) e "Fora do acervo" (Inter, Hiper e Referências). Motivo: a barra de download, a seleção, o relatório e a ajuda são compartilhados; e os dados têm forma diferente (Elos e Ecos ligam texto a texto por id, as outras apontam para fora do acervo, sem id), então não entram no mesmo grafo. Se a seção de fora crescer demais, separar depois é barato, porque a lógica fica em módulo próprio.
- **Divisão com as Estatísticas:** Conexões mostra os itens e as relações (a lente de leitura, com título que abre o Ver); Estatísticas conta e compara (gráfico, filtros compartilhados, clique que abre a lista). Hoje as Estatísticas não têm nada de Inter, Hiper nem Referências.

**O que a seção "Fora do acervo" mostra (proposta do Claude, a confirmar com o Victor na entrega 2):**

1. Por obra e por autor: quem aparece em mais textos, com a lista dos textos e a relação de cada um (o equivalente da convergência nos Ecos).
2. Hipertextualidade: de qual obra cada texto deriva (o hipotexto).
3. Referências recorrentes: o mesmo Marco Histórico, Notícia ou Pessoa Pública em vários textos.
4. Aviso de quase-duplicatas (grafias diferentes da mesma obra), no papel dos Buracos.
5. Relatório `.md`, `.png` e `.pdf` estendido.

**Identidade da obra:** nome da obra mais autor, sem acento nem caixa, o mesmo critério que a Descrição já usa para repetir. Prosa entra junto, com o tipo marcado em cada item (a confirmar).

**Estatísticas (depois, opcional):** distribuição por relação, por tipo de obra e por tipo de referência; fontes mais citadas (barras com clique que abre a lista); evolução por ano de escrita; cruzamentos com Pessoa, Tema e Corrente; completude do campo. Reaproveita o cálculo de obra e autor das Conexões.

**Ordem em entregas:**

1. Lógica pura e testes (índice por obra e autor, hipotexto, referências recorrentes, quase-duplicatas), sem tela.
2. Seção "Fora do acervo" na aba Conexões.
3. Relatório `.md`, `.png` e `.pdf` estendido, mais ajuda, FAQ e docs `for-ai`.
4. Aba nas Estatísticas (separada; decidir depois de usar a aba Conexões por um tempo).

**Extras pedidos pelo Victor (25/10/2026), depois da entrega 2:** (a) filtro das listas de Obras e Autores e referências de um texto só numa seção recolhida e fechada (FEITO); (b) correção dos dados na própria seção: "Corrigir obra", "Corrigir autor" e "Manter esta" (junta as quase-duplicatas), em todos os textos, com backup forçado antes, confirmação com a contagem e Desfazer (FEITO, `js/corrigir-fora-do-acervo.js` e `js/corrigir-fora-do-acervo-ui.js`); (c) "Modo revisão", tabela editável com uma linha por entrada, dentro da seção, com todas as colunas editáveis e o seletor de colunas das abas de textos (entregas 1 e 2 FEITAS: lógica e tela; falta a documentação, junto com a entrega 3). Descartada pelo Victor: fila de "dados no campo errado" (padrões como ", de Fulano" na Obra), por ser coisa só dele e datada depois da limpeza.

**Autoria em lista, Data da obra e relatório do Fora do acervo (decididos em 25/10/2026; plano de 13 entregas, a entrega 1 está feita):**

Decisões do Victor:

- **Autoria em lista (Inter e Hiper):** o autor de uma obra vira lista de tags de texto livre, com autocompletar. A ordem digitada é guardada (feat. tem ordem de destaque), mas a identidade da obra não depende dela. Acervo antigo: cada autor atual vira uma tag só, sem divisão automática de nomes. Sem papel por autor (intérprete, produtor) por ora.
- **Data da obra ou do fato:** campo de início e "até" opcionais em todos os tipos (Obra e Notícia: data e "até"; Marco histórico: início e fim; Pessoa pública: nascimento e óbito, óbito vazio para quem está viva). Um nível por vez: século, década, ano, mês ou dia, com "aprox." e "a.C."; por baixo se guarda o intervalo de anos que o nível cobre. Segue o critério da Descrição: repete por obra e autor, sugere e só preenche sozinha se estiver vazia, e entra no "Corrigir obra".
- **Relatório do Fora do acervo:** `.md`, `.csv` e `.pdf` (sem `.png`), com os mesmos escopos do relatório de Conexões, já com as datas e os autores em lista.

Por que a autoria vem antes da data e do relatório: identidade da obra, listas de Autores, Corrigir obra e autor, Modo revisão e sugestões leem o autor; fazer a data e o relatório antes obrigaria a refazê-los.

**Ordem das entregas (a 2 da primeira versão do plano era grande demais e foi dividida em 2, 3 e 4; a tentativa de fazê-la inteira não chegou a ser entregue e recomeça do zip da entrega 1):**

1. Autoria em lista, lógica, leitores e testes, sem tela (FEITA em 25/10/2026, `autoria-lista-1-logica.zip`).
2. Autoria, campo de tags e modais: componente único de tags de autor (autocompletar pelos autores já usados), modais de Poema e Prosa, `js/editor.js` (entradas que copiam `entrada.autor`), e a ligação da migração ao `db.js`. Ficam juntos de propósito: ligar a migração sem o modal apagaria o autor ao editar. `migrarEntradaIntertextualidade` e `migrarEntradaHipertextualidade` passam a pôr `autores: []`.
3. Autoria, "Corrigir obra" (campo de tags) e "Corrigir autor"; correção do "Manter esta", que tratava "A, B e C" como um autor só.
4. Autoria, Modo revisão: célula de autor com tags, filtro "Autor parece ter mais de um nome" na tela, edição pendente comparada por valor e não por referência (com listas, o redesenho a descartaria); conferir que a seção Fora do acervo mostra a lista.
5. Data, lógica e testes: o campo, o intervalo de anos, "aprox." e "a.C.", sugestão por obra e autor, "Corrigir obra". Sem tela.
6. Data, telas dos modais de Intertextualidade, Hipertextualidade e Referências (rótulo muda por tipo).
7. Data, "Corrigir obra" e coluna no Modo revisão.
8. Autoria e data nas saídas: Ver, `.md`, `.csv` e `.json`.
9. Autoria e data nas Estatísticas: textos por século e década, distância entre a obra e o texto (Pessoa pública pelo nascimento).
10. Relatório do Fora do acervo, lógica e `.md` / `.csv`, sem tela.
11. Relatório em `.pdf` (antes, ver o que já existe de `.pdf` no app para reaproveitar).
12. Relatório, o botão na seção, junto do de Conexões e respeitando o filtro e a ordem escolhidos.
13. Documentação única de tudo isso, que é a entrega 3 da T9: ajuda, FAQ, `decisoes.md`, `schema.md`, docs `for-ai`, READMEs e plano.

**Regras de trabalho para as entregas 2 a 13 (proposta do Claude, a confirmar):** uma entrega por tema, com zip só dos arquivos que mudaram; se uma entrega passar de umas duas telas ou de cerca de 15 arquivos, dividir antes de começar; `status.md` reescrito ao fim de cada uma; `npm test` completo fica com o Victor.

**Achados da tentativa anterior da entrega 2, a refazer:** (a) "Manter esta" lia "A, B e C" como um autor só; (b) o Modo revisão comparava listas por referência, então uma edição pendente de autor sumia num redesenho; (c) o campo de tags precisa de um componente único, usado pelos modais, pelo "Corrigir obra" e pelo Modo revisão.

## T10. Central de Ajuda: grupos no "Como eu faço para..." e caixa de busca (combinada em 24/10/2026)

A lista de tarefas tinha 17 itens, todos soltos, e cresce a cada fase. As Perguntas frequentes já eram agrupadas (`CATEGORIAS_FAQ`).

**Decisões do Victor (24/10/2026):** fazer o agrupamento por rótulo e a busca; grupos recolhíveis ficam de fora por ora (cada tarefa já é recolhível, e um segundo nível esconde mais do que ajuda), e voltam a ser considerados se a lista passar de uns 30 itens.

**Ordem em entregas:**

1. Grupos no "Como eu faço para..." (FEITA em 24/10/2026, falta conferir no navegador): chave `grupo` em cada tarefa, `GRUPOS_COMO_FACO` e `tarefasPorGrupo()` em `js/como-faco-passos.js`, rótulo de grupo na tela (`js/central-ajuda.js`), testes de que toda tarefa tem grupo válido e nenhum grupo fica vazio. Grupos de partida: Registrar e importar textos; Etiquetas e clusters; Sonoridade e Molde; Conexões e relatórios; Livros; Backup e acervo.
2. Busca, lógica pura e testes, sem tela (FEITA em 24/10/2026, `js/busca-ajuda.js`): recebe o texto e devolve as tarefas e perguntas que casam (título e descrição das tarefas, pergunta e resposta das FAQ; sem acento nem caixa; cada palavra é um termo E). Não olha o texto dos passos do mini-tour.
3. Caixa de busca no topo da Central (FEITA em 24/10/2026, falta conferir no navegador; ganhou aspas para frase exata, só isso).
4. Vocabulário (FEITA em 24/10/2026, a pedido do Victor, falta conferir no navegador e revisar as palavras): `palavras` em cada tarefa e pergunta, palavras de enchimento ignoradas e resultado parcial quando nenhum item tem todos os termos. A caixa de busca (entrega 3) segue como está: filtra ao digitar, os itens que casam vêm abertos, grupo ou categoria vazio some, mensagem quando nada casa, Esc limpa. Fecha com `decisoes.md`, `status.md` e plano (ou uma entrega 4 só de docs, se preferir).

## T11. Fora de escopo na estrutura do livro (combinada em 24/10/2026, FECHADA em 25/10/2026, falta conferir a 4b no navegador)

Detalhe das decisões em `decisoes.md` (parágrafo \"Fora de escopo na estrutura do livro\"). Textos descartados e migrados passam a aparecer numa seção \"Fora de escopo\" do livro, dizendo onde estariam originalmente, sem duplicar na árvore.

**Entregas:** 1. posição de origem em \"Cortado de\" (FEITA e conferida pelo Victor em 24/10/2026); 2. lógica pura de `js/fora-de-escopo.js` e `semDescartados` (FEITA em 24/10/2026); 3a. \"agora em\" pelo lugar real, descartado fora da posição sugerida e texto do aviso de livros fora do cadastro (FEITA em 25/10/2026, sem tela); 3a-2. descartado guarda a origem em \"Cortado de\" e sai da fila, rótulo \"era a nº N na época\" (FEITA em 25/10/2026, só o modal muda de tela); 3b. seção na aba Estrutura e no Ver do livro, selos \"veio de\" nos migrados da árvore e aviso na tela (FEITA em 25/10/2026, falta conferir no navegador); 4a. saídas (`.json`, `.md`, `.csv`, `.pdf`, `.docx`) com a opção `incluirForaDeEscopo`, desligada por padrão, sem caixa na tela (FEITA em 25/10/2026); 4b. caixa "Incluir Fora de escopo" no Ver e na barra da aba Livros (o card usa a escolha lembrada; a aba Coletâneas não tem), habilitada só com a estrutura marcada, e docs (`decisoes.md`, `schema.md`, FAQ, `docs/livro-for-ai`, `plano-central.md`) (FEITA em 25/10/2026, falta conferir no navegador).

## T12. Aviso ao renomear livro ou seção citados em "Cortado de" e "Lançado em" (feita em 25/10/2026, pela T13)

Pedido: renomear um livro ou uma seção não atualizava esses textos, e o migrado deixava de casar com o livro de origem sem aviso. **Resolvido para Livro pela T13**: com o `livroId`, renomear o livro atualiza o espelho do título em todos os textos na hora, então não há mais o que avisar. **Parte e Seção:** não entram (o `secao` é foto de um lugar que pode ter sido apagado ou repetido); fica como está, e o aviso ao renomear só nasce se o Victor sentir falta (detalhe em `decisoes.md`, "Livro por id").

## T13. Gravar também o id de livro em "Cortado de" e "Lançado em" (FECHADA em 25/10/2026, 3 entregas)

`cortadoDe` e `lancadoEm` ganham `livroId` quando o livro está no cadastro, e o `livro` vira o espelho do título atual; livro nunca cadastrado segue como texto livre. **Entregas:** 1. lógica, migração e Fora de escopo por id (`js/origem-livro.js`); 2. o modal grava o `livroId` e salvar o Livro com título novo propaga o nome; 3. documentação (`schema.md`, `decisoes.md`, READMEs, guias `for-ai`), junto com a da trava do destino e a do `›`. Falta conferir no navegador (roteiro no `status.md`).

## T14. Ligações Tema × Pessoa por texto, na aba Cruzamentos (combinada em 21/10/2026; FECHADA em 27/10/2026, 3 entregas)

Registrada aqui em 27/10/2026: até então o plano só existia no `status.md` (entrada de 21/10/2026, "Cruzamentos, ligações Tema × Pessoa por texto, entrega 1 de 3"), e por isso saiu do radar.

**Problema:** num texto com vários Temas e várias Pessoas, o Tema muitas vezes remete só a uma delas. A matriz Temas × Pessoas conta o Tema para todas, e isso "suja" os Cruzamentos. Os controles que já existem (select "Pessoa", checkbox "Só textos em que ela é a única pessoa" e o botão de inverter linhas e colunas, de 21/10/2026) aliviam, mas não resolvem.

**Decisões do Victor (21/10/2026):** a análise mora na aba Cruzamentos, não nos modais de Poema e Prosa (acha demais para lá). Texto ainda não analisado conta como hoje (o Tema liga a todas as Pessoas do texto), e a opção de deixar esses de fora entra nos Cruzamentos, na entrega 3.

**Entregas:**

1. **Dado, lógica pura, mesclagem, backup e testes. FEITA** (21/10/2026). `js/ligacoes-tema-pessoa.js` (sem DOM e sem imports); campo `ligacoesTemaPessoa` no Poema e na Prosa, `{ temaIds, pessoaIds, desligados: [{ temaId, pessoaId }] }`, ausente = "não analisado". Ligado em `db.js`, `exportar.js`, `forms.js` e `importar-aditivo.js`.
2. **Tela de análise na aba Cruzamentos. FEITA** (27/10/2026, falta conferir no navegador; `js/ligacoes-tema-pessoa-tela.js`, detalhes em `decisoes.md`). Fila "textos com 2 ou mais pessoas, ainda não analisados", progresso "n de N", um texto por vez, Temas nas linhas e Pessoas nas colunas, tudo marcado e só se desmarca o que não se liga, Anterior e Próximo.
3. **Cruzamentos usando as ligações, e documentação. FEITA** (27/10/2026, falta conferir no navegador). A matriz (Pessoas e Grupos) só conta o par não desligado; select "Textos não analisados" (contar ou deixar de fora); o checkbox "só ela" ficou (decisão a confirmar); `schema.md`, `decisoes.md` e este plano atualizados. Detalhes em `decisoes.md`.

**Antes de começar a 2:** o campo Pessoas precisa estar confiável nos textos, porque a fila só pega textos com 2 ou mais pessoas. Dois apoios já prontos: o papel Voz e o interruptor "Contar o próprio autor como pessoa" (21/10/2026), e o critério de Mencionado(a) × Aludido(a) fechado em 27/10/2026 (`decisoes.md`). Falta o Victor revisar os papéis nos textos (a análise de Voz e Retratado de 27/10/2026 listou o que conferir).

## Fase 21

Concluída em 27/10/2026 (etapas 21-0 a 21-5). Resumo em `plano-concluido.md`; decisões em `decisoes.md` ("Fase 21") e dado em `schema.md` ("Onde o texto aparece").

## T15. Aba Conexões: blocos recolhíveis, listagem por Origem e busca por campo (combinada em 29/10/2026, concluída em 29/10/2026)

Pedido do Victor: (1) na busca de Fora do acervo (fora do Modo revisão), filtrar por campo e trazer sugestões, como no Modo revisão; (2) além das listagens por Obras e por Autores, uma por Origem; (3) os subtítulos (inclusive Hipertextualidade e Referências recorrentes) recolhíveis, porque só crescem. **Decisão dele:** o estado de aberto e fechado fica guardado de vez. **Entregas, a mais fácil primeiro:** 1 blocos recolhíveis (FEITA em 29/10/2026: `js/blocos-recolhiveis.js`, contagem no título, Expandir tudo e Recolher tudo, busca ativa abre Obras e Autores); 2 listagem por Origem (FEITA em 29/10/2026: `agruparOrigens`, bloco "Origens", botão `abrir-lista-origem`, escopo "Só Origens" no relatório; plano original: a contagem já existe em `agregarTextosPorOrigem`; cada origem com textos, obras e autores, "Desconhecida" no fim, clique abrindo a lista `origem:`, entrando também no relatório baixado e na ordenação; vira o sexto bloco recolhível, com chave nova em `BLOCOS_CONEXOES`); 3 busca por campo com sugestões (FEITA em 29/10/2026: `js/busca-campos-conexoes.js`, filtro `campo:valor` nas três listas e no relatório baixado, sugestões pelo núcleo compartilhado `js/sugestoes-busca-campos.js`; no mesmo dia, as obras do cartão da origem e do autor viraram chips; plano original, campos sugeridos: `origem:`, `autor:`, `tipo:`, `relacao:`, `texto:`, `data:`, `pessoal:`; reaproveitar o interpretador e as sugestões do Modo revisão; o relatório baixado hoje usa só o texto simples, `consulta`, e precisa receber a busca por campo; na prática ele já chamava os mesmos filtros, então bastou mudar os filtros).

## T16. Rótulo "Cruzamentos (Temas)" e regra de onde moram os cruzamentos (combinada em 01/11/2026; FEITA em 01/11/2026, falta conferir no navegador)

Surgiu do cruzamento das leituras com as etiquetas (F22-D27): o Victor perguntou o que a aba Cruzamentos é, de fato, no plano, e se o nome e a aba se justificam. Os porquês e os caminhos descartados estão em `decisoes.md` ("Onde moram os cruzamentos nas Estatísticas"); aqui só o que fazer.

**Decidido (Victor, 01/11/2026):** a matriz continua em aba própria; o rótulo vira **"Cruzamentos (Temas)"**; a regra é que a aba guarda as matrizes com Tema na linha, e os demais cruzamentos moram na tela da entidade a que seus eixos pertencem.

**Entrega única, pequena (só o que aparece).** Levantado no código em 01/11/2026 (busca por "Cruzamentos" fora de testes e planejamento):

1. `index.html`: o rótulo do botão do menu de Estatísticas (`btn-estatisticas-cruzamentos`, por volta da linha 549), o `<h2>` da seção (por volta da 6853) e o subtítulo, que passa a dizer que a aba guarda os cruzamentos com Tema na linha; o `aria-label` do download (por volta da 6876) pode dizer "matriz de Cruzamentos (Temas)"; e a frase do subtítulo de Personagens que manda "use a aba Cruzamentos" (por volta da 6924).
2. `README.md` (linha 497) e `README.pt-br.md` (linha 502), onde a lista de Estatísticas cita a aba.
3. Id da aba, funções (`renderCruzamentos`, `baixarCruzamentos`) e nomes de arquivo não mudam. Os títulos das exportações ("Cruzamentos: Temas × pessoas") já dizem Tema e ficam.
4. Testes: conferir só se algum lê o rótulo do botão; a busca não achou nenhum que leia.

**Feito (01/11/2026).** O rótulo passou a "Cruzamentos (Temas)" em: o menu de Estatísticas, que nasce de `GRUPOS_NAV` em `js/ui.js` (**ponto que o levantamento acima não trazia**); o botão `btn-estatisticas-cruzamentos` e o `<h2>` em `index.html`, com o subtítulo ganhando a frase "Esta aba guarda os cruzamentos com Tema na linha."; o `aria-label` do download; a frase do subtítulo de Personagens; os dois READMEs; e, além do combinado, os dois `docs/personagens-for-ai` (a frase "Em Cruzamentos" passou a "Em Cruzamentos (Temas)"), para o guia das IAs usar o nome que aparece na tela. Comentários de código que dizem "aba Cruzamentos" não mudaram, porque não aparecem para ninguém. Teste novo em `tests/estatisticas-abas-temas-pessoas.test.js` (menu, botão, título e subtítulo; o id e a seção não mudam). Nenhum outro teste lia o rótulo.

**Ainda por decidir:** Esfera × pessoa (Fase 6, "se couber"), quando a Fase 6 chegar. Autor × Pessoa (F1-D6) e os cruzamentos de Pessoa pública (`referencias-pessoa-publica.md`) ficam em Pessoas e Grupos.

## Itens antigos que continuam abertos (fora desta fila curta)

Não foram reconferidos nesta arrumação e não perderam o lugar: estão no `plano-central.md` ("Pendências soltas" e a tabela de fases) e no `status.md`. Entre eles, as Estatísticas de Pessoa pública (entrega 5, adiada de propósito) e a Fase 19b (filiações do Autor).
