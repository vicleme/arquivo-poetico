# Personagens: como interpretar esse campo

Este documento não pede nenhuma tarefa. Ele explica a lógica do campo
`personagens` de Poemas e Prosas e do cadastro de Personagem, para que uma
IA que receba dados exportados (ou o próprio código) interprete o campo
sem inferir o que o schema deliberadamente não afirma.

---

## O que é um Personagem

Personagem é o que **o autor criou ou reinterpretou**. Não se confunde com
duas coisas parecidas:

- **Pessoa** (`pessoas`): quem existe ou existiu de fato. Ver
  `pessoas-papeis-for-ai.md`.
- **Referência** (`intertextualidade`, `referenciasExternas`): quem já
  existe fora da obra (figura pública, religiosa, mítica). Ver
  `transtextualidade-referencias-for-ai.md`.

Um mesmo nome pode existir nos três cadastros sem que sejam o mesmo
registro. Não una os três por semelhança de nome.

## O cadastro (`db.personagens`)

Cada Personagem é registrado uma única vez, com `{ id, nome, origem, notas,
genero, orientacao, corRaca, nascimento, obito, caracteristicas,
participacoes }`. Nos dados exportados de um Poema ou Prosa o cadastro não
vem como lista à parte: cada vínculo do texto carrega `nome`, `origem` e os
dados do cadastro (ver "O que viaja na exportação").

- **`origem`**: `Criado`, `Reinterpretado` ou vazio. Vazio quer dizer "não
  definida". Não deduza a origem pelo nome (um nome famoso não torna o
  Personagem `Reinterpretado`).
- **Nome repetido é permitido.** Dois Personagens de obras diferentes podem
  ter o mesmo nome. Nas buscas e nas Estatísticas a comparação é pelo nome
  sem caixa e sem acento, então esses dois contam juntos. Se a tarefa
  depender de separá-los, olhe `origem` e `participacoes`.
- **`genero`, `orientacao`**: texto livre com sugestões. **`corRaca`**: lista
  fechada (a mesma do cadastro de Autor). **Vazio significa não definido, e
  nada é inferido.** Não complete gênero, orientação ou cor/raça pelo nome,
  pelo texto ou pelo contexto.
- **`nascimento`, `obito`**: data parcial `{ dia, mes, ano }`, com qualquer
  parte possível de faltar, ou `null`. O ano é **interno à ficção**: serve
  para a idade do Personagem dentro da obra, nunca para compará-lo com a
  data real de escrita. A idade não é exportada (é calculada na tela, e só
  contra um ano de referência).
- **`caracteristicas`**: o que é do Personagem em si, não da relação com um
  texto. Sete grupos de tag (`personalidade`, `valoresCrencas`, `desejos`,
  `medos`, `tracosFisicos`, `arquetipos`, `backstory`) mais `backstoryNota`
  (texto livre sobre o passado). As tags são simples e sem tipo, para o
  vocabulário ser compartilhado e comparável. Lista vazia é "ainda não
  preenchido", não "o Personagem não tem".

A finalidade dessas características e da identidade é comparar, no futuro,
como o gênero de quem escreve muda a visão de gênero na escrita. Por isso
elas pertencem ao Personagem e ficam separadas da relação com o texto.

## O vínculo com o texto (`personagens`)

`personagens` é uma lista de vínculos, **um por Personagem** em cada texto:

```json
{
    "personagemId": 4,
    "nome": "Capitu",
    "origem": "Reinterpretado",
    "papeis": ["Voz", "Aparição"],
    "centralidade": "protagonista",
    "papelNarrativo": ["narradora"],
    "funcaoTematica": ["ciúme"],
    "arco": [],
    "tropes": []
}
```

(Fora os campos do cadastro descritos acima, que também vêm no vínculo.)

### `papeis`: lista fechada, e a ordem NÃO é relevância

Lista de zero, um ou vários valores de uma lista fechada de 5, na ordem em
que aparecem aqui:

- **Voz**, **Interlocutor** e **Aparição**: papéis de presença efetiva no
  texto. O schema não define cada um além do rótulo, então leia pelo nome e
  não acrescente detalhes que o autor não registrou.
- **Menção**: o Personagem é nomeado no texto.
- **Alusão**: o Personagem é evocado sem nome. Fica separada de Menção
  de propósito, como em `pessoas`.

O mesmo Personagem pode acumular papéis no mesmo texto (por exemplo,
Aparição e Interlocutor).

**Atenção, aqui é diferente do campo `pessoas`.** Em `pessoas`, a ordem dos
papéis pode refletir relevância, porque preserva a ordem em que a pessoa
marcou. Em `personagens`, o sistema **sempre reordena** os papéis para a
ordem fixa acima (Voz, Interlocutor, Aparição, Menção, Alusão), não importa
a sequência em que foram marcados. Logo:

- A ordem de `papeis` **não carrega informação de relevância**. Não diga que
  "Voz vem primeiro, então é o papel mais forte".
- Não sugira reordenar os papéis por relevância: o sistema não guardaria.
  Se a tarefa pedir uma avaliação de peso, use `centralidade` e as tags de
  relação.

`papeis: []` é válido e significa que o Personagem está ligado ao texto mas
o papel dele ainda não foi definido. Não o trate como "não vinculado" e não
invente um papel.

### `centralidade`: `protagonista`, `secundario` ou vazio

É um valor único por vínculo. O vazio (`""`) tem **dois significados**, e
`papeis` é o que os distingue:

- **Indefinido**: o vínculo ainda não tem papel, ou tem ao menos um papel de
  presença efetiva (Voz, Interlocutor, Aparição), e a centralidade ainda não
  foi preenchida.
- **Não se aplica**: o vínculo só tem Menção e/ou Alusão. Quem é só
  mencionado ou aludido não é protagonista nem secundário, e o campo fica
  sempre vazio. Nas Estatísticas isso aparece como "Só Menção/Alusão".

Antes de dizer "centralidade não preenchida", confira `papeis`. Se for só
Menção e/ou Alusão, não há nada a preencher.

### Tags de relação com o texto

`papelNarrativo`, `funcaoTematica`, `arco` e `tropes` são listas de tag
sobre **a relação do Personagem com este texto**: antagonista, mentor,
confidente, o arco que ele percorre, o trope que ele encarna, a função que
ele cumpre no tema. A Centralidade é só uma escala simples (protagonista ou
secundário); `papelNarrativo` cobre o resto. Lista vazia é "não preenchido".

### Característica é do Personagem, relação é do texto ou do livro

Esta é a distinção mais fácil de errar:

| O que descreve                      | Onde mora                                                 |
| ----------------------------------- | --------------------------------------------------------- |
| Como o Personagem é (medos, traços) | `caracteristicas`, no cadastro                            |
| Como ele atua neste texto           | `papeis`, `centralidade` e as 4 tags, no vínculo do texto |
| Como ele atua neste livro           | `participacoes`, no cadastro                              |

Não atribua a um Personagem, como característica fixa, algo que está só nas
tags de relação de um texto (um Personagem pode ser "antagonista" num poema
e "confidente" em outro).

## Participação por livro (`participacoes`)

Lista, no cadastro do Personagem, de `{ livroId, papelNarrativo,
funcaoTematica, arco, tropes }`, uma por Livro ou Coletânea. É a mesma
ficha de relação do texto, só que no nível do livro. Uma participação com as
quatro listas vazias quer dizer "participa deste livro, ainda sem análise".

Como o id do livro não vale em outro acervo, na exportação cada participação
leva `livroTitulo` no lugar de `livroId`. E como a participação é do
Personagem, **ela se repete em todo texto que cita aquele Personagem**: a
mesma lista aparece idêntica em cada vínculo. Ao agregar, deduplique por
Personagem em vez de contar a mesma participação várias vezes.

## O que viaja na exportação

- Cada vínculo leva `nome` e `origem` junto do `personagemId`, porque o id
  não vale em outro acervo. **Identifique o Personagem pelo `nome`, não pelo
  `personagemId`.** Na Importação Aditiva o Personagem é casado pelo nome
  (sem caixa e sem acento) e criado se faltar.
- O vínculo também leva `genero`, `orientacao`, `corRaca`, `nascimento`,
  `obito`, `caracteristicas` e `participacoes`.
- Num Personagem que já existia no acervo de destino, a importação **só
  preenche o que estava vazio**. O que já estava definido nunca é trocado.
- O Personagem só viaja junto de um texto que o cite. Um Personagem sem
  texto não aparece numa exportação de textos.
- JSON antigo, sem a chave `personagens`, equivale a lista vazia.

No `.md` e na Visualização, o grupo aparece numa linha só, por exemplo:
`Capitu (Voz, Aparição; protagonista; papel narrativo: narradora), Bento
(Interlocutor), Escobar`. Dentro dos parênteses vêm, nesta ordem, os
papéis, a centralidade e as tags de relação. Só o nome, sem parênteses,
quer dizer vínculo sem nada preenchido.

No `.csv` há uma coluna `personagens` (todos os nomes) e oito colunas
derivadas: `personagem_voz`, `personagem_interlocutor`, `personagem_aparicao`,
`personagem_mencao`, `personagem_alusao` (quem tem aquele papel),
`personagem_protagonista`, `personagem_secundario` e
`personagem_sem_centralidade` (quem está naquela faixa de centralidade).
`personagem_sem_centralidade` é só o **indefinido**: quem tem apenas
Menção/Alusão não entra nela.

## Personagem e Eco

**Presença em dois textos não cria Eco.** O Eco é leitura deliberada do
autor, e nunca se infere. Se dois textos têm o mesmo Personagem e nenhum
Eco entre eles, isso significa que o autor não registrou essa ligação (ou
ainda não a avaliou), não que ela não exista nem que você deva criá-la.

O Personagem pode **ancorar** um Eco: o Eco do tipo `Personagem em comum`
pode listar, em `ancoras`, `{ especie: "personagem", id, nome }`, quem
sustenta a ligação. Ver `campos-poema-prosa-for-ai.md` (seção
Intratextualidade) para o formato completo. O app oferece, sob demanda, uma
**sugestão** de Ecos faltantes a partir de um Personagem ou Pessoa; ela é
só uma ajuda de catalogação, e o Eco só existe depois que o autor o cria.

## Estatísticas

A aba Estatísticas › Personagens parte do corpus filtrado (não de todo o
acervo), com estas regras de contagem:

- A unidade é o **texto**. Um texto conta uma vez em cada barra a que tem
  direito, então **a soma das barras pode passar do total de textos**.
- O Personagem é identificado pelo nome, como na busca. Dois cadastros de
  mesmo nome viram uma barra só.
- Nos Ecos, um Eco com duas âncoras conta uma vez para cada âncora, então a
  soma por âncora pode passar do total de Ecos. "Personagem em comum" sem
  âncora é um grupo à parte.
- Em Cruzamentos, "Temas × personagens" usa o papel de Tema escolhido na
  aba, e o Personagem conta em **qualquer** papel.

## Resumo para uso prático

Ao processar ou comentar o campo `personagens` de um item exportado:

1. Identifique o Personagem pelo `nome` (o id só vale no acervo de origem) e
   leia `origem` vazia como "não definida".
2. Trate vazio em identidade, datas e características como "não definido",
   sem completar por inferência.
3. Leia `papeis` como lista fechada em ordem fixa. A ordem **não** indica
   relevância (diferente de `pessoas`). `papeis: []` é vínculo sem papel
   definido, não ausência de vínculo.
4. Para `centralidade` vazia, olhe `papeis`: só Menção/Alusão é "não se
   aplica"; o resto é "indefinido".
5. Separe característica (do Personagem), relação com o texto (tags no
   vínculo) e relação com o livro (`participacoes`, repetida em cada
   vínculo).
6. Nunca crie Eco a partir de Personagem em comum, e não confunda
   Personagem com Pessoa nem com Referência.
