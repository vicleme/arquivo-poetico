# Poemas e Prosas: guia de todos os campos

Este documento não pede nenhuma tarefa — é o mapa completo dos campos que
existem num registro de Poema ou Prosa, para que uma IA que receba dados
exportados (ou uma pessoa lendo o schema) saiba o que cada campo é, sem
precisar abrir o código. Campos com regra própria ambígua ou fácil de
confundir têm documento dedicado — aqui eles só aparecem resumidos, com
link pro doc certo. O resto (a maioria) é documentado aqui mesmo, porque é
autoexplicativo o bastante pra não precisar de um doc só seu.

---

## Poema vs. Prosa: o que muda

O schema dos dois é quase idêntico — a mesma lista de campos abaixo vale
pra ambos, com duas exceções conhecidas:

- **Alvo de Elos/Ecos** (Intratextualidade, ver abaixo): numa Prosa, pode
  apontar pra outro Poema **ou** outra Prosa; num Poema, só pra outro
  Poema.
- **`descricaoVisual`**: campo exclusivo de Poema — Prosa não tem.

Fora isso, os dois compartilham a mesma estrutura, e o resto deste
documento vale pros dois sem distinção.

## Campos com documento próprio (só resumidos aqui)

Estes grupos têm regras específicas de interpretação — categorias que se
parecem mas não são a mesma coisa, casos especiais, campos derivados.
Consulte o doc dedicado sempre que a tarefa realmente depender de acertar
essa distinção.

- **Sinalizações** (`sinalizacoesTradicao`, `sinalizacoesEstilo`,
  `sinalizacoesTema`, `sinalizacoesRelacao`, `sinalizacoesSensibilidade`,
  `sinalizacoesTom`, `sinalizacoesDominioImagetico`,
  `sinalizacoesOutros`) — 8 campos de etiquetas em texto livre, cada um
  uma categoria diferente. Ver `etiquetas-sinalizacoes-for-ai.md`.
- **Transtextualidade e Referências** (`intertextualidade`,
  `hipertextualidade`, `referenciasExternas`) — diálogo com obras e fatos
  externos ao acervo. Ver `transtextualidade-referencias-for-ai.md`.
- **Pessoas** (`pessoas`, e como isso se diferencia de `autoria` e
  `gruposDiretos`) — vínculo com pessoas cadastradas e os papéis que elas
  exercem no texto. Ver `pessoas-papeis-for-ai.md`.
- **Sonoridade** — não é um campo de Poema/Prosa, é uma aba/entidade à
  parte (`db.escansoes`, um registro por poema). Ver `sonoridade-for-ai.md`
  pra interpretar dados já preenchidos, ou `scansion-for-ai.md` pra pedir
  a uma IA que analise um poema do zero.

## Identificação e conteúdo

- **`titulo`**: título do texto.
- **`texto`**: o conteúdo em si — poema ou prosa —, com marcação HTML
  inline permitida (negrito, itálico, sublinhado, tachado, cor de fonte,
  cor de fundo em trecho ou em faixa de largura total, comentários
  `<!-- -->` invisíveis na Visualização/exportação mas visíveis no `.md`
  bruto).
- **`idioma`**: string livre com sugestão de autocomplete, padrão
  `"pt-BR"`.

## Onde o texto mora (hierarquia e coletâneas)

- **`paiTipo` / `paiId`**: vínculo polimórfico de posição — em qual Livro,
  Parte, Seção (ou direto sob outro Elemento) o texto está encaixado na
  árvore do acervo. É posição estrutural (um lugar só).
- **`sequencia`**: ordem manual do texto dentro do pai (quando a ordenação
  não é só cronológica).
- **`livrosIds`**: diferente de `paiTipo`/`paiId` — são os Livros/
  Coletâneas onde esse texto aparece **listado** (pode estar listado em
  mais de um), sem que isso mude onde ele vive estruturalmente na árvore.

## Datas e época retratada

- **`dataEscrita`** / **`dataPublicacao`**: datas parciais (dia/mês/ano,
  qualquer parte pode faltar), com uma flag `exata` em `dataEscrita`
  (data precisa vs. aproximada). O sistema recusa salvar se
  `dataPublicacao` for anterior a `dataEscrita`.
- **`ano`**: cópia de `dataEscrita.ano`, mantida só por compatibilidade
  com ordenação/estatísticas/exportação antigas — não edite direto, é
  derivado de `dataEscrita`.
- **`epocaRetratada`**: intervalo de tempo que o texto retrata (não é
  quando foi escrito) — `{ epocaId, inicio, fim, recorte, na }`. Aponta
  pro cadastro central `db.epocas`. `recorte` é `"momento"` |
  `"repercussão"` | `null`. `na: true` é um terceiro estado deliberado —
  "marcado como Não Aplicável", diferente de "ainda não categorizado"
  (campo inteiro `null`). Não confunda os dois: um texto sem
  `epocaRetratada` não foi avaliado; um texto com `na: true` foi avaliado
  e a resposta foi "não se aplica".

## Intratextualidade — Elos e Ecos

Vínculos com outros textos do próprio acervo, por id (`conceitos.elos`,
`conceitos.ecos`):

- **Elos** (bilateral): `{ id, poemaId, relacao, direcao, texto }`.
  `relacao` vem de uma lista fechada (Reescrita, Continuidade, Tradução,
  Variação, Versão, Resposta, Díptico, Outro). `direcao` é `"origem"`
  (texto mais antigo/base) ou `"destino"` (texto derivado/mais novo).
- **Ecos** (sempre unidirecional, do mais novo pro mais antigo): só
  `{ id, poemaId, tipo, texto }`, sem `direcao`. `tipo` vem de lista
  fechada (Personagem em comum, Imagem central compartilhada, Aceno a,
  Outro).

**Atenção a um nome ambíguo**: este `ecos` (`conceitos.ecos`, vínculo
entre textos do acervo) não tem nenhuma relação com `es.ecos` do registro
de Sonoridade (ecos sonoros/quase-rimas de um poema). Mesmo nome, campos
completamente diferentes — ver `sonoridade-for-ai.md` pra mais detalhe
sobre essa colisão.

## Pessoas, autoria e grupos (visão geral)

Três campos parecidos, detalhados em `pessoas-papeis-for-ai.md`:

- **`pessoas`**: vínculo com pessoas cadastradas + papéis (Retratado(a),
  Dedicatário(a) etc.) — o campo com mais nuance, tem doc próprio.
- **`autoria`**: quem escreveu o texto — `{ autorId, papel }`, `papel`
  único (não array) entre `Autor`/`Coautor`. Resolve contra `db.autores`,
  cadastro central diferente de `db.pessoas`.
- **`gruposDiretos`**: array de `grupoId` — grupo citado sem apontar pra
  nenhuma Pessoa específica dele.

## Notas, avaliação e status

- **`notas`**: campo de notas livres sobre o texto.
- **`autoavaliacao`**: texto livre — opinião sobre o próprio texto.
- **`autoclassificacao`**: número de 0,5 a 5 (passo 0,5) — "corações" que
  o autor dá ao próprio texto, puramente afetivo, sem pretensão de nota
  técnica. `0`/ausente é o estado especial "não avaliado" (não é a nota
  mínima — a nota mínima de verdade é 0,5).
- **`status`**: lista fechada — `incompleto`, `completo`, `publicado`,
  `migrado`, `descartado`, `privado`. `privado` é diferente de
  `descartado`: nunca teve intenção de publicação (sempre restrito a
  contexto pessoal/íntimo), não é algo que foi descartado depois.
- **`pendencia`**: texto livre marcando uma pendência aberta sobre o
  texto — presença de texto (não vazio) é o que liga o indicador visual
  (🟠) na tabela, mesmo espírito de `conteudoSensivel` (ver abaixo).

## Fonte do texto

- **`fonteTexto`**: objeto `{ origem, edicao, link, conferido, grafia }`
  (ou `null`) — de onde veio o texto quando não é obra própria (edição de
  terceiros, transcrição). `conferido` é booleano: o texto foi comparado
  com a edição de origem. `grafia` é `''` (atual, padrão), `'etimológica'`
  (ph/th/y/dobradas — ex.: Cruz e Sousa, Augusto dos Anjos) ou
  `'quinhentista'` (português do séc. XVI — ex.: Camões) — existe pra a
  Sonoridade avisar em vez de errar a contagem/tônica em texto de grafia
  antiga; não conta em
  "Campos Preenchidos" e não tem coluna nem Estatísticas. A situação de
  domínio público **não** é um campo: é derivada do ano de óbito do Autor
  vinculado em `autoria`.

## Conteúdo sensível e vocabulário de alerta

- **`conteudoSensivel`**: parágrafo livre descrevendo conteúdo sensível do
  texto. A presença (não vazia) desse campo é o que aciona o badge
  "Conteúdo sensível" na interface — não existe uma flag booleana salva à
  parte; é sempre derivado da string. Diferente de
  `sinalizacoesSensibilidade` (tags soltas e categorizáveis, ex.
  "Linguagem obscena" — ver `etiquetas-sinalizacoes-for-ai.md`): este
  campo é o parágrafo descritivo, aquele é etiqueta curta.
- **`vocabularioHiperacionante`**: texto livre — nota sobre vocabulário do
  texto que pode ser especialmente gatilho/acionador pra quem lê.
- **`ocultacao`**: texto livre — nota sobre alguma forma de ocultação
  aplicada ao texto (o quê e por quê).

## Envios, reconhecimentos e anexos

- **`envios`**: lista de `{ pessoa, data, meio, reacao, notas }` — a quem
  o texto foi enviado, quando, por qual meio, e a reação registrada.
  `pessoa` e `meio` são texto livre com autocomplete (sem vínculo por id
  com `db.pessoas`).
- **`reconhecimentos`**: lista de `{ premio, posicao, ano, texto }` —
  prêmios/reconhecimentos recebidos pelo texto.
- **`anexos`** (antigo `ilustracoes`): lista de anexos do texto, com
  **`anexosNotaGeral`** como nota livre cobrindo o conjunto todo (não um
  anexo específico).
- **`anotacoesMarginais`**: lista de anotações associadas a pontos
  específicos do texto (distinto de `notas`, que é geral, não pontual).

## `descricaoVisual` (só em Poema)

Texto livre — descrição visual associada ao poema. Único campo desta
lista que não existe em Prosa (ver seção "Poema vs. Prosa" acima).

## Migração entre Livros/Seções

Trio usado quando um texto muda de lugar na estrutura editorial (é
"cortado" de um Livro/Seção e "lançado" em outro), ou é descartado nesse
processo:

- **`cortadoDe`** / **`lancadoEm`**: `{ livro, secao }` — de onde o texto
  saiu / onde entrou.
- **`justificativaMigracao`**: texto livre justificando a migração.
- **`descarte`**: texto livre — motivo do descarte, quando aplicável
  (`status: "descartado"`).

## Resumo para uso prático

1. Se a tarefa envolve Sinalizações, Transtextualidade/Referências,
   Pessoas/Papéis ou Sonoridade, use o doc dedicado — este arquivo só
   resume esses grupos o suficiente pra você saber que existem.
2. Não confunda `conceitos.ecos` (vínculo entre textos, Intratextualidade)
   com `es.ecos` de Sonoridade (ecos sonoros) — nomes iguais, campos
   diferentes, docs diferentes.
3. `paiTipo`/`paiId` é onde o texto **vive** na árvore; `livrosIds` é
   onde ele **aparece listado** — não são a mesma coisa.
4. `epocaRetratada` ausente (`null`) ≠ `epocaRetratada.na === true` — o
   primeiro é "não avaliado", o segundo é "avaliado como não aplicável".
5. `descricaoVisual` só existe em Poema — não espere encontrá-lo (nem
   sinta falta dele) num registro de Prosa.
