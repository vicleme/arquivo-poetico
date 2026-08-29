# Exportação para IA: Aninhado vs. Flat

O app oferece dois formatos de exportação pensados para uso com IAs (ChatGPT, Claude, Gemini etc.). Escolher o formato certo faz diferença no resultado.

---

## Formato Aninhado

Gerado pelo botão **"Exportar tudo aninhado (para IA)"** na aba Exportação.

A estrutura do arquivo espelha a hierarquia real do acervo: cada Livro contém suas Partes, cada Parte contém suas Seções, cada Seção contém seus Poemas e Prosas — uns dentro dos outros. Coletâneas vêm resolvidas (com o conteúdo real de cada item inline, não só referências por ID).

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

Gerado pelo botão **"Baixar JSON filtrado"** na aba Exportação, pela seleção da listagem de Poemas/Prosas ("⬇ JSON" na barra de ações em massa), ou pelo botão **"Exportar selecionados"** na aba Estrutura (esse último numa estrutura própria, sem contexto resolvido — ver seção específica abaixo).

A estrutura é uma lista plana de itens. Cada registro é autossuficiente: traz o texto, o contexto já resolvido como texto legível (nome do Livro, da Parte, da Seção), sinalizações, pessoas, datas. Não há aninhamento — é um array de objetos independentes.

**Use quando a tarefa é processar os itens individualmente:**

- Escrever um comentário crítico sobre cada poema
- Sugerir ou corrigir tags/sinalizações de cada texto
- Traduzir ou adaptar poema a poema
- Classificar textos por tema, tom ou período
- Alimentar um pipeline externo que espera registros tabulares

Nesse caso o aninhamento seria contraproducente: para chegar a um poema específico a IA precisaria "descer" vários níveis da árvore, consumindo contexto sem agregar nada. O flat entrega cada item já explicado por si mesmo.

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

## Resumo rápido

| Situação                                                                                    | Formato recomendado              |
| ------------------------------------------------------------------------------------------- | -------------------------------- |
| Analisar estrutura, arco, progressão de um livro                                            | Aninhado (tudo)                  |
| Processar textos um a um (comentar, traduzir, classificar)                                  | Flat filtrado                    |
| Escolher itens pontuais navegando a árvore                                                  | Flat via aba Estrutura           |
| Escolher itens pontuais na listagem de Poemas/Prosas, com contexto resolvido ou em Markdown | Flat via listagem (JSON ou MD)   |
| Acervo grande que não cabe no contexto do modelo                                            | Flat filtrado por livro/tema/ano |
