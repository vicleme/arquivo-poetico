# Transtextualidade e Referências (Externas): como interpretar esse grupo

Este documento não pede nenhuma tarefa — explica a lógica dos três campos
que compõem o grupo "Transtextualidade e Referências (Externas)" no modal
de Poema/Prosa, para que uma IA que receba dados exportados distinga
corretamente **Intertextualidade**, **Hipertextualidade** e **Referências
(Externas)** — três campos parecidos na superfície, mas com critérios
diferentes de quando cada um se aplica.

Os nomes vêm do vocabulário da teoria da Transtextualidade (relações que
um texto mantém com outros textos) — o grupo reúne duas categorias dessa
teoria (Intertextualidade e Hipertextualidade) mais um terceiro campo
prático, Referências Externas, para âncoras no mundo real que não são,
propriamente, diálogo com uma obra.

Importante: este grupo é sempre sobre o texto e o **mundo fora do
acervo** — obras, pessoas públicas, fatos históricos. Vínculos com
**outros poemas do próprio acervo** (reescrita, tradução, continuação,
díptico, eco...) ficam num grupo separado, "Intratextualidade (elos e
ecos)", e não são o assunto deste documento.

---

## Intertextualidade

Estrutura de cada entrada:

```json
{ "tipo": "Música", "texto": "\"Águas de Março\", Tom Jobim", "link": "", "linkTexto": "", "nota": "" }
```

- **`tipo`**: texto livre com sugestões (Livro, Texto, Música, Filme,
  Série, Vídeo, Fotografia, Pintura, Peça de teatro, Citação, Conversa,
  Palestra, Mitologia, Conto de fadas, Outro) — é o tipo de mídia/artefato
  referenciado, não uma lista fechada.
- **`texto`**: a referência em si (nome da obra, trecho citado, etc.).
- **`link`/`linkTexto`/`nota`**: opcionais, complementares.

**O que caracteriza Intertextualidade**: diálogo do texto com algo
externo ao arquivo, apontando para uma obra ou autoria **identificável e
nomeável**. Um texto pode ter várias entradas, de tipos diferentes, ao
mesmo tempo — não é vínculo único. A referência pode ser leve (uma
citação, uma alusão pontual) — não precisa envolver transformação
estrutural do texto.

## Hipertextualidade

Estrutura de cada entrada:

```json
{ "tipo": "Livro", "relacao": "Paródia", "hipotexto": "Dom Casmurro", "link": "", "linkTexto": "", "nota": "" }
```

- **`tipo`**: mesma lista de sugestões de mídia da Intertextualidade
  (reaproveitada de propósito — é o mesmo tipo de artefato, livro, música
  etc., só que aqui apontando para uma origem específica).
- **`relacao`**: a natureza do diálogo em si, com sugestões próprias —
  Releitura, Tradução Adaptada, Paródia, Pastiche, Expansão,
  Redimensionamento, Homenagem, Transposição.
- **`hipotexto`**: o nome da obra de origem específica sendo transformada.

**O que caracteriza Hipertextualidade, e a diferença para
Intertextualidade**: aqui o texto do acervo é o "hipertexto" — uma
transformação ou derivação direta de um "hipotexto" de origem específico.
É uma relação mais forte e estrutural do que Intertextualidade: não é só
"conversa com" ou "cita", é "deriva de"/"transforma". Regra prática: se o
texto **retrabalha, reescreve ou se apoia estruturalmente** numa obra de
origem específica (uma paródia, uma releitura, uma tradução adaptada),
isso é Hipertextualidade; se é uma citação, menção ou diálogo mais solto
com uma obra (sem que o texto *seja*, em si, uma transformação dela),
isso é Intertextualidade.

## Referências (Externas)

Estrutura de cada entrada:

```json
{ "tipo": "Marco histórico", "texto": "Enchente de 2011", "link": "", "linkTexto": "", "nota": "" }
```

- **`tipo`**: texto livre com sugestões (Marco histórico, Notícia, Pessoa
  pública, Outro).
- **`texto`**: a referência em si.

**O que caracteriza Referências (Externas), e a diferença para
Intertextualidade**: algo que ancora o texto num tempo ou mundo comum —
um fato, um evento, uma pessoa pública — **sem que haja uma obra ou
autoria sendo referenciada**. "Pessoa pública" é um tipo sugerido aqui
justamente porque, historicamente, esse campo nasceu de um tipo que
existia dentro de Intertextualidade e foi separado: citar uma pessoa
pública não é diálogo com uma obra dela, é uma âncora factual/de mundo.

Note que "Pessoa pública" aqui é **texto livre**, sem vínculo com o
cadastro central de pessoas (`db.pessoas`) — é diferente de uma pessoa
formalmente vinculada ao texto no campo `pessoas` (ver o documento sobre
Pessoas e Papéis). Se a pessoa mencionada tem um papel reconhecível na
gênese do texto (retratada, dedicatária, etc.) e está no cadastro
central, o vínculo correto é `pessoas`, não uma entrada aqui.

## Resumo comparativo

| Campo               | Aponta para                          | Natureza do vínculo                          |
| -------------------- | ------------------------------------- | --------------------------------------------- |
| Intertextualidade     | Uma obra/artefato específico e nomeável | Diálogo, citação, alusão — pode ser leve     |
| Hipertextualidade     | Um hipotexto de origem específico       | Derivação/transformação estrutural direta    |
| Referências (Externas)| Um fato, evento ou pessoa do mundo real | Âncora factual, sem obra/autoria envolvida   |

E, fora deste grupo, mas frequentemente confundidos com ele:

| Campo                                     | Aponta para                     |
| ------------------------------------------ | -------------------------------- |
| Elos / Ecos (Intratextualidade)             | Outro poema/prosa do próprio acervo |
| Domínio Imagético (Sinalizações)            | Vocabulário/repertório de uma área de conhecimento, sem obra específica citada |

## O que isso significa na prática para uma IA lendo os dados

1. Antes de classificar uma menção externa encontrada no texto, pergunte:
   é uma obra/autoria nomeável (Intertextualidade ou Hipertextualidade) ou
   um fato/pessoa do mundo sem autoria de obra envolvida (Referências)?
2. Se for obra nomeável, pergunte se o texto **deriva/transforma**
   estruturalmente essa obra (Hipertextualidade) ou só **dialoga/cita**
   com ela sem ser uma transformação dela (Intertextualidade).
3. Não sugira mover uma entrada de "Pessoa pública" em Referências para o
   campo Pessoas — são coisas propositalmente distintas (uma é âncora de
   mundo em texto livre; a outra é vínculo estruturado com o cadastro
   central) — a menos que a tarefa peça explicitamente para cadastrar
   aquela pessoa formalmente.
4. Não confunda este grupo com Elos/Ecos (que são sobre outros textos do
   próprio acervo) nem com Domínio Imagético (que é repertório de uma
   área do conhecimento, não uma obra específica).
