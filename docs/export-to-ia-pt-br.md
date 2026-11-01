# Exportação para IA: Aninhado vs. Flat

O app oferece dois formatos de exportação pensados para uso com IAs (ChatGPT, Claude, Gemini etc.). Escolher o formato certo faz diferença no resultado.

---

## Formato Aninhado

Gerado pelo botão **"Exportar Aninhado"** no cabeçalho da página, ao lado de "Baixar JSON". Ele não tem filtro: leva sempre o acervo inteiro.

A estrutura do arquivo espelha a hierarquia real do acervo: cada Livro contém suas Partes, cada Parte contém suas Seções, cada Seção contém seus Poemas e Prosas — uns dentro dos outros. Coletâneas vêm resolvidas (com o conteúdo real de cada item inline, não só referências por ID).

Um Poema ou uma Prosa que aparece em mais de um livro (ou em mais de um lugar) sai uma vez em cada lugar, com a posição que tem ali. Como a árvore já diz onde cada cópia está, essas cópias não trazem a lista `aparece_em`. O texto que só "consta" em um livro (está ligado ao livro, sem Parte, Seção nem posição) não está na árvore: ele sai à parte, nas chaves `conteudo_poemas_vinculados` e `conteudo_prosas_vinculadas` do livro. Por isso, para contar textos neste arquivo, conte por `id`, não pelas vezes que um título aparece.

**Use quando a tarefa envolve o acervo como um todo ou as relações entre partes:**

- Analisar o arco temático de um livro
- Identificar padrões entre seções ou entre livros
- Gerar um índice comentado ou uma sinopse estruturada
- Pedir à IA que entenda a progressão interna de uma obra
- Comparar a fase de um livro com a de outro

A vantagem aqui é que a hierarquia está explícita na forma do dado — a IA não precisa inferir que determinado poema pertence a determinada seção; isso já está visível na estrutura do JSON. Menos inferência significa menos chance de erro e menos tokens gastos em deduções que o arquivo poderia fazer por conta própria.

**Limitação:** o arquivo com o acervo inteiro pode ser grande. Verifique se ele cabe no limite de contexto do modelo que você está usando antes de enviar.

---

## Formato Flat (filtrado)

Gerado pelo botão **"Baixar JSON seletivo"** na aba Exportação, pela seleção da listagem de Poemas/Prosas ("⬇ JSON" na barra de ações em massa), ou pelo botão **"Exportar selecionados"** na aba Estrutura (esse último numa estrutura própria, sem contexto resolvido — ver seção específica abaixo).

A estrutura é uma lista plana de itens. Cada registro é autossuficiente: traz o texto, o contexto já resolvido como texto legível (nome do Livro, da Parte, da Seção), etiquetas, pessoas, datas. Não há aninhamento — é um array de objetos independentes.

O `contexto` de cada registro traz `livro`, `parte` e `secao` só do Destino do texto (a primeira aparição que tem lugar). Quando o texto aparece em mais de um lugar, `contexto.aparece_em` lista todos, cada um como `{ livro, parte, secao, posicao, coletanea, principal }`: `posicao` fica vazia quando o texto só "consta" no livro, `coletanea` é verdadeiro quando o lugar é uma Coletânea e `principal` marca a aparição principal (a do livro de publicação mais antiga), que nem sempre é o Destino. No `.csv` isso é a coluna `aparece_em`, com os lugares separados por `" | "` (vazia quando há um lugar só). No `.md`, no `.pdf` e no `.docx`, a linha "Aparece em" só aparece quando o texto tem duas ou mais aparições em livros comuns.

**Use quando a tarefa é processar os itens individualmente:**

- Escrever um comentário crítico sobre cada poema
- Sugerir ou corrigir tags/etiquetas de cada texto
- Traduzir ou adaptar poema a poema
- Classificar textos por tema, tom ou período
- Alimentar um pipeline externo que espera registros tabulares

Nesse caso o aninhamento seria contraproducente: para chegar a um poema específico a IA precisaria "descer" vários níveis da árvore, consumindo contexto sem agregar nada. O flat entrega cada item já explicado por si mesmo.

**Acervo inteiro, em flat:** a mesma aba tem os botões **"Baixar tudo - JSON flat"**, **"Baixar tudo - .md"**, **"Baixar tudo - .pdf"** e **"Baixar tudo - .docx"**, que levam o acervo todo nesse modelo flat, sem filtro nenhum para configurar.

**Vantagem extra:** os filtros da aba Exportação (por pessoa, tema, ano, status, livro) permitem mandar só o recorte relevante — o que é especialmente útil quando o acervo inteiro não cabe no contexto do modelo.

---

## Exportação pontual pela árvore

Na aba **Estrutura**, é possível marcar itens individuais diretamente na árvore do livro (checkboxes em cada linha) e exportar só eles via **"Exportar selecionados"**. O resultado é um JSON estrutural (livros/partes/secoes/poemas/prosas/elementos como coleções separadas) com exatamente os itens marcados — sem contexto resolvido nem opção de Markdown.

Use quando você quer escolher poemas ou seções específicos sem precisar descrever um filtro por atributo — por exemplo, "quero esses três poemas e aquela seção inteira, mas não o resto do livro".

---

## Exportação pontual pela listagem de Poemas/Prosas

Nas abas **Poemas** e **Prosas**, marcar itens pelas caixas de seleção da tabela e usar **"⬇ JSON"** ou **"⬇ MD"** na barra de ações em massa exporta só os itens marcados — na mesma estrutura flat da Exportação seletiva (`{ export_format: 'selecao', itens: [...] }`), com o contexto (Livro/Parte/Seção) já resolvido, e disponível também em Markdown. Diferente da exportação pontual pela árvore (que só gera JSON estrutural, sem contexto resolvido): aqui cada item já vem autoexplicativo, do mesmo jeito que na Exportação seletiva.

Use quando os itens que você quer não formam um filtro fácil de descrever (ex.: "esses 4 poemas específicos, escritos em anos diferentes, sem tema em comum") e você já está navegando a listagem mesmo — ou quando quer o resultado em Markdown, que a exportação pela árvore não oferece.

---

## Linhas comuns no topo das exportações com vários textos

Nos downloads em `.md`, `.pdf` e `.docx` com mais de um texto, uma linha de metadado (`- **Rótulo:** valor`) que todos os textos têm com exatamente o mesmo valor sai uma vez só, sob **"Comum a todos os textos"**, perto do topo, e deixa de aparecer em cada texto. Os rótulos considerados são Autoria, Fonte, Edição, Link da fonte, Grafia, Texto conferido, Domínio público, Corrente literária e Idioma. A regra é estrita, por rótulo: se um texto não tem a linha, ou tem outro valor, ela continua em cada texto. Assim, ao ler um texto, uma dessas linhas que não aparece nele está no bloco comum ou estava vazia.

A caixa **"Agrupar no topo"** (em "Opções de download", no painel Ações da coluna e no modal de Visualização; ligada por padrão, guardada no navegador) desliga isso. O `.json` e o `.csv` nunca mudam, e o download de um texto só sempre traz todas as linhas.

---

## Legenda dos papéis de Pessoa

Os `.json` de seleção, exportação seletiva, tudo flat e templates, e o `.md` de vários textos, trazem a legenda dos papéis de Pessoa usados nos textos exportados (chave `legenda_papeis_pessoa` no `.json`, seção "Legenda dos papéis de Pessoa" no `.md`). Detalhes em `pessoas-papeis-for-ai-pt-br.md`. O `.csv` não leva a legenda. A caixa **"Infos de papel"** escolhe se o arquivo sai com ou sem ela. São duas escolhas independentes, ambas ligadas por padrão e guardadas no navegador: uma para baixar vários textos ("Opções de download" da barra de seleção e aba Exportação) e outra para o Baixar de um texto só (painel Ações da coluna e modal de Visualização).

---

## Resumo rápido

| Situação                                                                                    | Formato recomendado              |
| ------------------------------------------------------------------------------------------- | -------------------------------- |
| Analisar estrutura, arco, progressão de um livro                                            | Aninhado (tudo)                  |
| Processar textos um a um (comentar, traduzir, classificar)                                  | Flat filtrado                    |
| Escolher itens pontuais navegando a árvore                                                  | Flat via aba Estrutura           |
| Escolher itens pontuais na listagem de Poemas/Prosas, com contexto resolvido ou em Markdown | Flat via listagem (JSON ou MD)   |
| Acervo grande que não cabe no contexto do modelo                                            | Flat filtrado por livro/tema/ano |
