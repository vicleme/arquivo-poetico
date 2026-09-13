# Etiquetas (Sinalizações): como interpretar esse campo

Este documento não pede nenhuma tarefa — explica a lógica das etiquetas do
acervo (chamadas "Sinalizações" na interface), para que uma IA que receba
dados exportados leia as tags pela categoria certa, sem misturar o que
cada uma quer dizer.

---

## O que o campo é (e o que não é)

Não existe um campo único de "etiquetas". "Sinalizações" é o nome do
**grupo**, mas por trás dele há **8 campos independentes**, um por
categoria, cada um uma lista de tags em **texto livre** (não uma lista
fechada de opções pré-definidas — quem cataloga digita a etiqueta que
quiser, com autocompletar sugerindo o que já foi usado antes na mesma
categoria, pra evitar variantes da mesma ideia).

Cada um desses 8 campos é, de fato, uma **lista** — aceita quantas
etiquetas fizerem sentido para o texto, não um valor único por categoria.
Isso importa para uma decisão recorrente: quando o texto carrega duas
coisas percebidas ao mesmo tempo (duas tradições, dois temas, duas
sensações de Tom), o padrão é registrar cada uma como uma etiqueta própria
na lista — não fundir as duas num rótulo composto. Só vale fundir num
único rótulo quando a combinação é, ela mesma, uma sensação ou ideia
indivisível, que não é a soma das partes — em Tom, por exemplo, "Muito
meloso" não é "romântico" + "intenso" acontecendo em paralelo, é uma
textura de leitura própria, então funciona como uma etiqueta só. Fora esse
caso (ex.: um poema que é ao mesmo tempo melancólico *e*, num outro
trecho, esperançoso — duas sensações reais, mas distintas, não uma coisa
só), etiquetas separadas mantêm a lista mais útil para filtrar e cruzar
dados depois.

Os 8 campos, na ordem em que aparecem no editor:

| Campo (chave)                 | Rótulo            |
| ------------------------------ | ------------------ |
| `sinalizacoesTradicao`         | Tradição           |
| `sinalizacoesEstilo`           | Estilo             |
| `sinalizacoesTema`             | Tema               |
| `sinalizacoesRelacao`          | Relação            |
| `sinalizacoesSensibilidade`    | Sensibilidade      |
| `sinalizacoesTom`              | Tom                |
| `sinalizacoesDominioImagetico` | Domínio Imagético  |
| `sinalizacoesOutros`           | Outros             |

Uma exportação "flat" combina tudo numa string única (`sinalizacoesCombinadas`)
para busca geral e estatísticas simples — mas essa versão combinada **perde
a categoria** de cada tag. Sempre que a tarefa depender de saber a que
categoria uma etiqueta pertence (ex.: "quais são os temas mais comuns" vs.
"quais são os recursos de estilo mais comuns"), use os 8 campos separados,
não a string combinada.

## O que cada categoria significa

- **Tradição**: formas ou escolas poéticas herdadas de uma tradição — ex.:
  soneto, haicai, cordel. É sobre a forma vinda de fora, não sobre um
  recurso inventado pelo próprio texto (isso é Estilo).
- **Estilo**: um recurso formal ou estilístico específico do texto —
  jogos tipográficos, recursos de construção de verso, figuras de
  linguagem nomeadas de forma própria pelo acervo (ex.: "Rotação
  tipográfica" para um trecho que só lê de cabeça para baixo,
  "Paronomásia por espaçamento" para um espaço que isola uma raiz comum
  entre duas palavras). Tende a nomear a técnica, não o efeito.
- **Tema**: o assunto ou conteúdo central do texto (ex.: "Brasil"). Ao
  revisar consistência de tags, o critério já adotado no acervo é nomear a
  **causa concreta**, não o efeito emocional — uma etiqueta como "Crise
  existencial cíclica" é mais vaga do que nomear o evento ou situação
  concreta que gera essa sensação.
- **Relação**: nomeia uma relação ou vínculo específico retratado no
  texto — pode ser o nome de uma dinâmica entre duas pessoas específicas
  (o acervo já usa etiquetas desse tipo, cunhadas pelo autor para nomear
  um par de pessoas e sua relação). Diferente de Pessoas+Papéis (que liga
  o texto a uma pessoa cadastrada com um papel fechado, ver o outro
  documento) — Relação é uma etiqueta livre sobre a natureza do vínculo em
  si, não um vínculo estruturado com `pessoaId`.
- **Sensibilidade**: tags soltas sobre conteúdo sensível de tipo
  categorizável (ex.: "Linguagem obscena"). Cuidado: isso é **diferente**
  do campo `conteudoSensivel`, que é um parágrafo descritivo à parte sobre
  conteúdo sensível — "Conteúdo sensível" deixou de ser uma tag dentro
  desta categoria e passou a ser **derivado** da simples presença (não
  vazia) desse outro campo. Não espere ver uma tag literal "Conteúdo
  sensível" dentro de Sensibilidade nos dados atuais do acervo.
- **Tom**: o registro emocional ou atitude percebida no texto (ex.: "Muito
  meloso"). Isso é um juízo/tom de leitura, não um recurso formal (isso
  seria Estilo) nem um tipo de conteúdo sensível.
- **Domínio Imagético** *(rótulo completo: "Domínio Imagético
  (repertório)")*: vocabulário ou imagética que o texto toma emprestado de
  um domínio de conhecimento inteiro — ex.: "Astrologia", quando o poema
  usa termos como Vênus/Trânsitos como registro geral, sem citar uma obra
  específica. A distinção importante é com **Intertextualidade** (ver o
  documento sobre o grupo Transtextualidade e Referências): Domínio
  Imagético é repertório/vocabulário emprestado de uma área de
  conhecimento; Intertextualidade é diálogo com **um artefato externo
  específico e nomeável** (uma música, um livro específico). Um poema que
  cita astrologia de forma genérica usa Domínio Imagético; um poema que
  cita um relatório astrológico específico e identificável usaria
  Intertextualidade.
- **Outros**: balde temporário para tags migradas que ainda não ganharam
  categoria própria no schema (hoje, por exemplo, reconhecimentos e
  variações/traduções que devem migrar futuramente para campos
  estruturados de Elos e Reconhecimentos). Não é uma 9ª categoria de
  sentido definitivo — é visibilidade temporária até essas tags virarem
  campos próprios. Ao interpretar, não presuma que tags aqui compartilham
  algum sentido comum entre si além de "ainda não tem lugar certo".

## O que isso significa na prática para uma IA lendo os dados

1. Sempre leia a tag junto da categoria (campo) em que ela está — o mesmo
   texto de etiqueta pode, em tese, aparecer em categorias diferentes com
   sentidos diferentes; a categoria é o que resolve a ambiguidade.
2. Não trate a lista de tags de uma categoria como fechada/enumerada — são
   valores livres, então uma tag "estranha" ou não vista antes não é erro,
   é só uma etiqueta nova.
3. Ao sugerir novas etiquetas, prefira reaproveitar uma já usada na mesma
   categoria (evitar variantes da mesma ideia) e nomear a causa concreta
   em vez do efeito emocional, seguindo o critério já adotado no acervo
   para Tema.
4. Não confunda Sensibilidade (tag categorizável) com o campo derivado de
   "conteúdo sensível" (presença de um parágrafo em `conteudoSensivel`) —
   são coisas diferentes que não devem ser somadas nem tratadas como
   sinônimos.
5. Cada campo é uma lista (múltiplos valores por texto): via de regra,
   registre aspectos ou sensações distintas como etiquetas separadas na
   mesma lista. Só proponha uma etiqueta composta/fundida quando a
   combinação for, ela mesma, uma ideia indivisível que não se reduz à
   soma das partes — quando em dúvida, prefira separar.
