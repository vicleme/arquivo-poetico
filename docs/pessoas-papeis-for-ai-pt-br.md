# Pessoas e Papéis: como interpretar esse campo

Este documento não pede nenhuma tarefa — ele explica a lógica de um campo do
acervo, para que uma IA que receba dados exportados (ou o próprio código)
interprete corretamente o campo `pessoas` de Poemas e Prosas, sem inferir
coisas que o schema deliberadamente não afirma.

---

## O que o campo é

`pessoas` é uma lista de **vínculos** entre o texto e pessoas cadastradas
no registro central do acervo (`db.pessoas`, cada uma com `{ id, nome,
grupoIds }`). Não é uma string solta de nomes — cada entrada aponta pra uma
pessoa cadastrada uma única vez, cujo nome e grupos moram só no cadastro,
não repetidos em cada poema.

Estrutura de cada entrada:

```json
{ "pessoaId": 7, "papeis": ["Retratado(a)", "Dedicatário(a)"] }
```

- **`pessoaId`**: referência ao cadastro central. É "quem" a pessoa é.
- **`papeis`**: array — pode ter zero, um ou vários valores — de uma lista
  **fechada** de 6 opções. É "como" essa pessoa se relaciona com **este**
  texto especificamente.

## Os 6 papéis possíveis

- Retratado(a)
- Inspiração para
- Dedicatário(a)
- Mencionado(a)
- Aludido(a)
- Associado(a) retroativamente

A grafia é exata — não existem sinônimos ou variantes aceitas fora dessa
lista.

## Múltiplos papéis, e o que a ordem pode significar

Uma mesma pessoa pode acumular vários papéis no mesmo texto ao mesmo tempo
— isso é comum, não exceção. Um poema de endereçamento direto costuma ter
a mesma pessoa como Retratado(a), Inspiração para e Dedicatário(a)
simultaneamente.

A ordem dos valores no array reflete a ordem em que foram marcados no
editor — e isso é proposital, não um efeito colateral da interface: o
sistema preserva a ordem de seleção em vez de reordenar automaticamente
(ex.: em ordem alfabética) justamente para deixar em aberto, pra quem
cataloga, a possibilidade de usar essa ordem como critério de
**relevância/importância daquele papel para aquela pessoa, naquele
texto específico**. Não é hierarquia fixa por categoria (o mesmo papel
pode vir primeiro num poema e depois em outro) e não é obrigatório usar a
ordem com esse sentido — quem cataloga pode simplesmente marcar os papéis
sem se preocupar com a sequência. Mas quando a ordem É usada assim, ela é
um dado real, não ruído.

Por isso, ao **comentar, resumir ou avaliar** os papéis de alguém, o
comportamento esperado é: tratar a ordem como um indício válido de
relevância relativa (o primeiro papel listado tende a ser o mais forte
pra aquele vínculo, nesse texto) e, quando a tarefa pedir uma avaliação
desse tipo, sugerir ativamente uma ordenação por relevância — não tratar
os papéis como um conjunto não-ordenado nem presumir que a ordem é
arbitrária.

## `papeis: []` é um valor válido — e significa algo

Este é o ponto mais fácil de errar. Uma pessoa pode estar vinculada ao
texto com o array de papéis **vazio**. Isso não é um campo esquecido nem
ausência de informação a ignorar: é o estado deliberado de "esta pessoa
está ligada a este texto, mas quem cataloga não categorizou o papel dela
— ou decidiu que ele não se encaixa nas 6 opções fechadas, ou prefere não
especificar." A interface mostra isso como um rótulo "sem papel" em
itálico, junto do nome, nunca escondendo a pessoa.

Regras práticas para uma IA lendo este campo:

- **Nunca invente um papel** que não está no array, mesmo que o contexto
  do texto pareça sugerir um óbvio (ex.: um poema claramente dedicado a
  alguém, mas sem "Dedicatário(a)" marcado — isso significa que essa
  categorização não foi feita, não que a IA deva completá-la por conta
  própria).
- **Nunca trate `papeis: []` como equivalente a "pessoa não vinculada"** —
  a pessoa está vinculada; só o papel está em aberto. Omitir a pessoa de
  uma análise porque o array está vazio descarta informação real.
- Se a tarefa pedir para comentar os papéis de alguém e o array estiver
  vazio, é válido (e mais honesto) dizer explicitamente que o vínculo
  existe sem papel categorizado, em vez de simplesmente pular a pessoa.

## Como isso se diferencia de outros campos parecidos

- **Autoria** (`autoria`, campo separado): vínculo de quem escreveu o
  texto, `{ autorId, papel }` — aqui `papel` é **um único valor** (não
  array) de uma lista fechada própria, menor: `Autor` ou `Coautor`.
  Resolve contra `db.autores`, um cadastro central diferente de
  `db.pessoas` — mesmo que a mesma pessoa da vida real apareça nos dois
  cadastros, eles são registros distintos. Autoria não acumula papéis; uma
  pessoa cadastrada como Autor não pode também estar marcada como Coautor
  no mesmo texto.
- **Grupos** (`grupoIds`, no cadastro da Pessoa, não no poema): é
  característica fixa da pessoa — a quais grupos ela pertence —,
  independente do texto. Não varia poema a poema, diferente de `papeis`,
  que é vínculo específico deste texto com essa pessoa.
- **"Pessoa pública" em Referências (Externas)**: um dos tipos sugeridos
  do campo `referenciasExternas` (ver o documento sobre o grupo
  Transtextualidade e Referências) é texto livre, sem `pessoaId` — usado
  quando alguém é citado como referência de mundo real (ex.: uma figura
  pública mencionada de passagem), não como pessoa formalmente cadastrada
  com vínculo de papel ao texto. Se a pessoa está no cadastro central e
  tem um papel reconhecível, o lugar certo é `pessoas`, não
  `referenciasExternas`.

## Resumo para uso prático

Ao processar ou comentar o campo `pessoas` de um item exportado:

1. Resolva `pessoaId` contra o cadastro central para obter o nome (e,
   se relevante, os grupos da pessoa).
2. Leia `papeis` como um conjunto de descrições cumulativas do vínculo,
   na ordem em que aparecem — essa ordem pode (opcionalmente) refletir a
   relevância de cada papel pra aquela pessoa, naquele texto; se a tarefa
   pedir uma avaliação de importância, sugira uma ordenação por
   relevância em vez de tratar os papéis como um conjunto sem ordem.
3. Se `papeis` estiver vazio, não pule a pessoa nem presuma um papel —
   relate o vínculo como está: presente, sem papel especificado.
4. Não confunda com Autoria (papel único, cadastro diferente) nem com
   Grupos (propriedade fixa da pessoa, não do texto).
