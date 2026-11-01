# Livro: como interpretar autoria, créditos, uso de IA e a exportação

Este documento não pede nenhuma tarefa. Ele explica a lógica dos campos de um
Livro (e de uma Coletânea: os dois moram em `db.livros`), para que uma IA que
receba dados exportados, ou leia o código, os interprete sem inferir o que o
schema deliberadamente não afirma. Trata de critério, não de formato de
arquivo: a forma exata de cada campo está em `manutencao/schema.md`.

---

## A regra que separa os campos

Quem produz o **conteúdo** da obra está em **Autoria** (`autoriaLivro`,
exportado como `autoria_livro`). Quem produz o **livro como objeto** está em
**Equipe e créditos** (`equipeLivro`, exportado como `equipe_livro`). A mesma
pessoa pode estar nos dois, cada um com o seu papel: por exemplo, Autor e
Capista do próprio livro.

- **Autoria** liga ao cadastro de Autores (`db.autores`). Cada vínculo tem um ou
  mais papéis: Autor, Coautor, Organizador, Tradutor, Prefaciador, Posfaciador
  ou "Outro" em texto livre. A ordem dos papéis é preservada e pode indicar
  importância.
- **A Autoria não é derivada dos textos.** Um livro que só traz o prefácio de
  alguém não é "de" essa pessoa, e numa coletânea a lista de autores dos textos
  não diz quem organizou. O Ver do acervo mostra "Autores dos textos deste
  livro" à parte; ela é derivada e só de leitura. Não una as duas listas.
- **Equipe e créditos** liga ao cadastro de Colaboradores (`db.colaboradores`),
  separado de Autores e de Pessoas de propósito. Papéis: Capista, Ilustrador,
  Diagramador, Revisor, Preparador de texto, Editor, Fotógrafo ou texto livre.
  Cada papel pode ter um **escopo** em texto livre (Capa, Miolo, Capa e miolo,
  Capitulares, Encarte ou o que foi digitado). Há um papel só de Ilustrador; o
  escopo diz se foi a capa ou o miolo.
- Se quem cataloga faz texto e ilustração como uma obra só, a ilustração entra
  em Autoria e o livro fica sem Ilustrador na equipe. Se outra pessoa ilustra o
  texto, ela entra na equipe como Ilustrador.

## "Nada registrado" nunca é "nenhum"

Chave ausente quer dizer que o acervo não tem registro, não que a resposta é
não. Nunca escreva "sem autor", "sem equipe" ou "não usou IA" a partir de uma
chave que falta.

- `autoria_livro` e `equipe_livro` só existem com pelo menos um vínculo. Um
  livro antigo sem eles apenas não foi catalogado.
- `uso_ia` tem `estado`: `usou`, `nao-usou` ou vazio, que é "Não informado" e é o
  **padrão**. Só `nao-usou` é uma afirmação, e é de quem cataloga. Livro com
  `uso_ia` ausente ou com `estado` vazio deve ser lido como "desconhecido".
- Os `papeisHabituais` de um colaborador são só lembrete do que a pessoa costuma
  fazer. O papel que vale é o do `equipe_livro` daquele livro.

## Lendo o uso de IA

Com `estado` igual a `usou`, `usos` lista cada uso. Em cada item:

- `onde` (capa, ilustração, texto, revisão, tradução, diagramação...),
  `ferramenta` (o produto, como ChatGPT ou Midjourney) e `modelo` (modelo e
  versão) são separados de propósito: o mesmo produto troca de modelo com o
  tempo e o mesmo modelo aparece em produtos diferentes. Não deduza um pelo
  outro, e `modelo` pode estar vazio.
- `data` é parcial (ano, ou ano e mês): marca mais ou menos quando, não um dia
  exato.
- `como` diz de que modo a IA contribuiu: "Gerou do zero", "Gerou quase pronto"
  (a IA entregou algo quase utilizável, faltam retoques do autor), "Gerou uma
  base", "Editou ou refinou algo meu" (o sentido inverso: a base é do autor),
  "Sugeriu ideias", "Corrigiu ou revisou" e "Traduziu". Leia como peso de
  autoria: os três primeiros querem dizer que a IA produziu material; o quarto,
  que a base era do autor.
- `texto`, quando existe, é `{ tipo, titulo }` e diz que **aquele poema ou
  prosa específico** foi feito com IA. Sem ele, o uso é do livro como um todo.
- `nota` é uma nota geral em texto livre e pode existir sem `estado`.

## O que a exportação do livro leva, e o que nunca leva

O download do livro (`.json`, `.csv`, `.md`, `.pdf`, `.docx`) traz informações
**sobre o livro**, nunca o conteúdo dos poemas e prosas (isso é da exportação da
aba Estrutura).

- Campos que guardam id são trocados por chaves derivadas em snake_case:
  `tem_capa` (a imagem só vai nos `.pdf` e `.docx`), `autoria_livro` e
  `equipe_livro` (por nome, com papéis e escopos, sem contato e sem ids),
  `uso_ia` (com o título do texto no lugar do id) e `estrutura` (contagem de
  partes, seções, poemas, prosas, elementos e itens inéditos).
- Sinopse curta, Sinopse, Orelhas, Contracapa, Versos de Abertura, descrição da capa e frase da
  capa são do livro e por isso saem. O texto dos poemas e prosas, não.
- Com a opção "Incluir estrutura" (desligada na primeira vez, e a escolha fica
  lembrada), o registro leva também `estrutura_arvore`: a estrutura do livro só
  com os **títulos** (Partes, Seções, Elementos, poemas e prosas, aninhados como
  na aba Estrutura), mais `vinculados` (textos ligados ao livro sem posição na
  estrutura). No `.csv` ela vem num segundo arquivo, `-estrutura.csv` (uma linha
  por nó, com `nivel`, `tipo`, `titulo`, `caminho`), e os dois vão juntos num
  `.zip`. A Coletânea pode ser baixada na própria aba, com a mesma opção.
- Com a opção "Incluir Fora de escopo" (também desligada na primeira vez e
  lembrada; só vale junto da estrutura), `estrutura_arvore` ganha
  `fora_de_escopo: { migrados, descartados }`. Cada entrada é
  `{ tipo, titulo, status, detalhe, origem, destino? }`, sem id e sem o texto:
  `origem` é `{ caminho, posicao }` (onde o texto estava no livro) e `destino`
  (só no migrado) é `{ livro, secao, posicao }`. Sem a opção, o texto
  descartado não aparece em lugar nenhum da estrutura (nem na árvore, nem em
  `vinculados`, nem na contagem `estrutura`). No `.md` vira o bloco "Fora de
  escopo:"; no `-estrutura.csv`, as colunas `fora_de_escopo` e `detalhe`; no
  `.pdf` e no `.docx`, a mesma seção em lista com recuo. Coletânea não tem Fora
  de escopo.
- O "link da imagem" da capa é só texto. Um link que não dá para baixar (login,
  CORS) nunca é embutido.
- O `.pdf` e o `.docx` põem a capa ao lado dos campos curtos e o resto na
  largura toda. Isso é diagramação, não significado: a ordem dos campos segue o
  mesmo modelo dos outros formatos.

## Buscando livros

A busca da aba Livros aceita prefixos: `autor:` (Autoria), `papel:` (papel na
Autoria), `equipe:` (Equipe), `papelequipe:` (papel na equipe), `-` para excluir
e `*` para "tem algum" (`-equipe:*` são os livros sem equipe). O `@` amarra
pessoa e papel **no mesmo livro**: `autor:Maria@Tradutor` é a Maria como
tradutora, e não a Maria como autora de um livro que outra pessoa traduziu. Nomes
casam por trecho, papéis por palavra inteira. Numa pergunta do tipo "quem
ilustrou X", olhe `equipe_livro`, não `autoria_livro`.
