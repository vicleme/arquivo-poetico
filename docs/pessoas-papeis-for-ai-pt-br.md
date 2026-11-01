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
{ "pessoaId": 7, "papeis": ["Retratado(a)", "Dedicatário(a)"], "nota": "Opcional." }
```

- **`pessoaId`**: referência ao cadastro central. É "quem" a pessoa é.
- **`papeis`**: array, com zero, um ou vários valores, tirados da lista de
  papéis do acervo (os 9 de fábrica estão logo abaixo). É "como" essa pessoa
  se relaciona com **este** texto especificamente.
- **`nota`** (opcional): texto livre em que quem cataloga explica os papéis
  escolhidos, por exemplo por que nenhum papel coube. É explicação humana, não
  papel: não entra na leitura por relevância e a chave não existe quando não há
  nota. Quando houver, leia-a junto dos papéis, porque ela pode qualificar ou
  justificar a escolha.

## Os 9 papéis de fábrica

- Retratado(a)
- Inspiração para
- Dedicatário(a)
- Mencionado(a)
- Aludido(a)
- Associado(a) retroativamente
- Voz
- Alocutário(a)
- Relacionado(a)

A grafia é exata: não existem sinônimos ou variantes aceitas. Quem cataloga
pode acrescentar papéis próprios ao acervo. Se aparecer um valor fora desta
lista, trate-o como um papel do acervo, leia-o pelo nome e não o reclassifique
em um dos nove.

**Voz** responde "quem fala neste texto?". É a pessoa real que enuncia na
cena do texto: o autor, ou alguém cuja fala o texto encena e que se ouve ali
como falante (um diálogo vivido, uma resposta, uma mensagem tratada como
turno de fala, isto é, a vez de fala de cada um). Pode ou não ser o autor.
Trecho de obra ou de fala alheia trazido de fora, como apoio, comentário ou
eco (epígrafe, letra de música, frase de livro), não é Voz: é **Citação**, e
mora em Intertextualidade (ver `transtextualidade-referencias-for-ai-pt-br.md`).
Aspas e itálico não decidem sozinhos, decide a função. Teste: se o trecho
saísse, o texto perderia um falante (Voz) ou só um apoio (Citação)? Regra de
bolso: Voz é quem fala no texto; Citação é o que o texto traz de fora. Em
Alocutário(a) a pessoa é ouvida sem responder; em Voz ela fala. Não confunda
com o papel Voz de Personagem (`personagens`), que é a fala de alguém criado,
num cadastro e numa lista à parte. Três perguntas decidem cada texto:

- **Quem enuncia é a própria pessoa real?** Então é Voz em `pessoas`. Isso
  cobre primeira pessoa, poema impessoal e fábula narrada pelo autor, que é o
  autor narrando, sem figura criada. Ironia não muda o papel: o autor
  imitando um discurso alheio continua sendo o autor falando.
- **Quem enuncia é uma figura criada?** Então o lugar é `personagens`, e o
  autor não ganha Voz.
- **A fala é da cena ou trazida de fora?** Se é um turno (vez de fala) da
  cena, a Voz é de quem fala, e o autor não ganha por isso. Se é trazida de
  fora como apoio, comentário ou eco, não é Voz: é Citação, em
  Intertextualidade. Tradução fiel de texto alheio: a Voz é da outra pessoa
  (o texto inteiro é a fala dela), e o autor não ganha. Adaptação que
  reescreve de verdade é decisão de quem cataloga.

Zona cinzenta: uma mensagem de alguém reproduzida no texto. Se entra como
turno de fala da cena, é Voz dessa pessoa. Se é tratada como documento (um
print, uma conversa com data), é Citação do tipo Conversa em
Intertextualidade. Os dois podem coexistir se o texto faz as duas coisas.

A primeira pessoa sozinha não decide, e o autor só recebe Voz quando está
cadastrado como Pessoa. Voz só torna a pessoa selecionável para ligar temas a
quem aparece no texto; não liga nada sozinha.

## O que cada papel significa

Os papéis descrevem o vínculo entre a pessoa e o texto, não um juízo sobre a
pessoa: um retrato hostil ou irônico continua sendo Retratado(a). Estas
definições servem para ler com precisão o que quem cataloga marcou. Elas não
autorizam uma IA a acrescentar papéis que não estão no array. Os papéis se
organizam em três perguntas: a pessoa está no texto (Retratado(a),
Mencionado(a), Aludido(a))? O texto nasceu ligado a ela (Inspiração para,
Associado(a) retroativamente)? O texto se dirige a ela ou ela fala nele
(Dedicatário(a), Alocutário(a), Voz)?

- **Retratado(a):** a pessoa é figura do texto: aparece em cena, com ações,
  traços ou uma relação descrita, sem que o poema fale diretamente com ela. É
  a linha de base de quem está no poema, qualquer que seja a forma. Dois
  testes ajudam. O da caracterização: o texto diz algo sobre a pessoa além de
  citá-la? O da remoção: se a pessoa saísse, o texto perderia um referente que
  ele desenvolve (uma estrofe, uma imagem, um movimento) e não só uma palavra?
  Ter o nome escrito é irrelevante para ser Retratado(a).
- **Inspiração para:** a pessoa, a relação com ela ou algo vivido com ela deu
  origem ao texto, sem que o texto precise retratá-la. Cobre a musa e a
  ocasião (o poema nasceu do que aconteceu com ela). Não implica presença no
  texto e pode vir sozinha. Não convive com Associado(a) retroativamente: o
  texto nasceu ligado à pessoa ou foi ligado depois.
- **Dedicatário(a):** o texto tem forma de dedicação a esta pessoa: o título,
  o texto ou a estrutura a oferecem a ela, ou a endereçam de modo explícito
  (interpelação, pedido, resposta, acusação, perdão). Vale pela intenção e
  independe de o texto ter sido enviado ou mostrado (isso fica em Envios e
  Reações). Independe de ser retratada.
- **Mencionado(a):** a pessoa é designada no texto, de passagem, sem ser objeto
  dele: por nome, apelido ou termo de parentesco ou de relação ("meu pai",
  "minha mãe", "meu ex"). O critério é o texto designá-la, não ela ter nome
  próprio. Não convive com Aludido(a): se o texto a designa, aludir não
  acrescenta nada.
- **Aludido(a):** o texto remete à pessoa sem designá-la (por pronome sem
  antecedente, epíteto metafórico, imagem ou circunstância), de modo que quem a
  conhece a reconhece. É o equivalente de Mencionado(a) quando a designação não
  aparece, ou foi ocultada. Se o traço vira caracterização sustentada, o papel
  passa a ser Retratado(a). Não convive com Mencionado(a).
- **Associado(a) retroativamente:** o texto não nasceu ligado à pessoa: a
  ligação foi feita depois, por afinidade, releitura ou curadoria. Só vale se
  houver evidência de que a associação é posterior à escrita. Se hoje o texto
  "parece retratar" alguém, mas não foi escrito assim, é este papel, não
  Retratado(a). Não convive com Inspiração para.
- **Voz:** quem fala no texto: a pessoa real que enuncia na cena, não o que é trazido de fora como Citação (definição completa acima).
- **Alocutário(a):** o texto fala com esta pessoa em segunda pessoa, ainda que
  não seja uma dedicatória e ainda que ela não responda: é o "tu" do poema.
  Usar "você" só para nomear a figura não basta, é preciso que o texto se
  dirija a ela. Quase todo Dedicatário(a) é também Alocutário(a), mas o
  inverso não vale.
- **Relacionado(a):** a pessoa está ligada ao texto, mas quem cataloga olhou os
  outros papéis e nenhum coube sem forçar. É exclusivo: não convive com nenhum
  outro papel. É uma declaração de catalogação, não um papel fraco, e não
  entra na leitura por ordem de relevância. O motivo, quando for informativo,
  fica em Notas.

### Casos limite

- **Menção com adjetivo passageiro** ("minha mãe, sempre cansada"): uma
  caracterização isolada fica em Mencionado(a) ou Aludido(a). Se ela se
  repete ou organiza uma imagem ou estrofe, é Retratado(a).
- **Termo de parentesco ou de relação** ("meu pai", "minha mãe", "meu marido"):
  designa a pessoa, então é Mencionado(a), mesmo sem o nome próprio. Só conta
  se o termo aponta para uma pessoa específica: "todo homem tem uma mãe" é
  genérico e não é vínculo. Pronome solto ("eles") ou imagem sem designação é
  Aludido(a).
- **"Tu" ou "você" sem nome, com o poema todo voltado à pessoa:**
  Alocutário(a), e também Dedicatário(a) se o texto tem forma de dedicação ou
  de resposta. Retratado(a) só se ela também é figura em cena. A identificação
  vem do cadastro, não do texto.
- **Pessoa como metáfora** (ela é "o mar"): Retratado(a) se a figura é
  desenvolvida e a identificação é segura. Se é só um aceno, Aludido(a).
- **Pessoa que só inspirou o texto:** apenas Inspiração para.
- **Pessoa cuja fala aparece em itálico ou entre aspas:** a função decide, não
  a marca. Se é um turno (vez de fala) da cena, Voz. Se é trazida de fora como
  apoio ou eco (letra, epígrafe, frase de livro), é Citação em
  Intertextualidade, e a pessoa só entra em `pessoas` por outro papel que ela
  de fato tenha. Soma Retratado(a) só se também for caracterizada.
- **Poema impessoal, em terceira pessoa ou alegórico, escrito pelo autor:**
  Voz do autor, porque as palavras são dele. Primeira pessoa não é exigida.
- **Tradução ou adaptação de letra alheia:** a Voz é de quem é o "eu" do
  original; o autor só recebe Voz se reescreveu de verdade.
- **Autorretrato:** Retratado(a) se o autor está cadastrado como Pessoa e o
  texto o caracteriza. Estar em primeira pessoa não basta.
- **Poema dirigido a um "você", com o "eu" em cena:** se o "eu" age, sente ou
  se relaciona com o "você" de modo descrito (acolhe, agradece, promete,
  desconfia), o autor é Retratado(a), além de Voz. O "eu" que só enuncia ou
  opina fica só Voz.
- **Figura criada ou reinterpretada:** não é Pessoa, vai para `personagens`.
- **Dúvida real sobre qual papel cabe:** Relacionado(a) é a saída declarada
  (quem cataloga olhou e nenhum coube). É melhor isso do que forçar um papel.

## Papéis que não convivem

Algumas combinações são contraditórias e o sistema não as aceita no mesmo
vínculo. Ao marcar um papel, o conflitante sai.

- **Mencionado(a) e Aludido(a):** respondem à mesma pergunta, se o texto
  designa a pessoa (por nome, apelido ou termo de parentesco ou de relação).
  Se designa, vale Mencionado(a).
- **Inspiração para e Associado(a) retroativamente:** o texto nasceu ligado à
  pessoa ou foi ligado depois.
- **Relacionado(a)** não convive com nenhum outro papel.

Retratado(a) convive com Mencionado(a) e com Aludido(a). Dedicatário(a),
Alocutário(a) e Voz convivem com os demais. Dado antigo pode ter um par
conflitante; leia como está, sem corrigir.

## Múltiplos papéis e a ordem como relevância

Uma mesma pessoa pode acumular vários papéis no mesmo texto ao mesmo tempo,
e isso é comum, não exceção. Um poema de endereçamento direto costuma ter a
mesma pessoa como Retratado(a), Inspiração para e Dedicatário(a)
simultaneamente.

**A ordem dos valores no array indica relevância: o primeiro papel é o mais
relevante para aquele vínculo, naquele texto, e o último é o menos.** A ordem
é a sequência em que os papéis foram marcados no editor, e o sistema a
preserva, em vez de reordenar (por exemplo, em ordem alfabética), justamente
para que ela carregue essa informação. É um dado real, não ruído.

A relevância vale por texto e por pessoa. Não é hierarquia fixa entre
categorias (o mesmo papel pode vir primeiro num poema e depois em outro), e
a ordem só compara papéis da mesma pessoa no mesmo texto, nunca pessoas
entre si. Com um papel só, não há o que comparar.

Por isso, ao **comentar, resumir ou avaliar** os papéis de alguém, o
comportamento esperado é tratar o primeiro papel listado como o mais forte
daquele vínculo e, quando a tarefa pedir uma avaliação desse tipo, sugerir
ativamente uma ordenação por relevância. A sugestão fica na resposta: a IA
não reordena nem altera o array por conta própria. Quem cataloga deve marcar
os papéis já na ordem de relevância.

## `papeis: []` é um valor válido, e Relacionado(a) é outra coisa

Este é o ponto mais fácil de errar. Há dois estados diferentes:

- **`papeis: []`:** a pessoa está ligada ao texto e o papel ainda não foi
  categorizado. Não é um campo esquecido nem ausência de informação a ignorar.
  A interface mostra isso como um rótulo "sem papel" em itálico, junto do
  nome, nunca escondendo a pessoa.
- **`papeis: ["Relacionado(a)"]`:** quem cataloga olhou os outros papéis e
  nenhum coube. É uma decisão, não uma pendência. Vem sempre sozinho.

Regras práticas para uma IA lendo este campo:

- **Nunca invente um papel** que não está no array, mesmo que o contexto
  do texto pareça sugerir um óbvio (ex.: um poema claramente dedicado a
  alguém, mas sem "Dedicatário(a)" marcado: isso significa que essa
  categorização não foi feita, não que a IA deva completá-la por conta
  própria).
- **Nunca trate `papeis: []` como equivalente a "pessoa não vinculada":**
  a pessoa está vinculada; só o papel está em aberto. Omitir a pessoa de
  uma análise porque o array está vazio descarta informação real.
- **Não troque um estado pelo outro.** Vazio é pendência; Relacionado(a) é
  "nenhum coube". Não complete um vazio com Relacionado(a).
- Se a tarefa pedir para comentar os papéis de alguém e o array estiver
  vazio, é válido (e mais honesto) dizer explicitamente que o vínculo
  existe sem papel categorizado, em vez de simplesmente pular a pessoa.

## A legenda dos papéis no arquivo exportado

Quando os textos exportados têm papéis de Pessoa, o arquivo traz uma **legenda** com os papéis que aparecem neles: nome, apelido (a abreviação que o acervo mostra no chip e na coluna), descrição e as regras de convivência. Ela serve para você ler o nome do papel pelo que o acervo quer dizer com ele, e não pelo sentido corrente da palavra.

- No `.json` (seleção, exportação seletiva, tudo flat e templates), a legenda é a chave `legenda_papeis_pessoa`, logo depois de `export_format`. Cada entrada é `{ nome, apelido, descricao }`, mais `exclusivo: true` (não convive com nenhum outro papel) ou `nao_convive_com: [nomes]`.
- No `.md`, é a seção "Legenda dos papéis de Pessoa" no topo, com uma linha por papel.
- Só entram papéis usados nos textos do arquivo. Sem papéis, não há legenda. A caixa "🏷️ Infos de papel" (ligada por padrão; uma para baixar vários textos e outra para o Baixar de um texto só) desliga a legenda; os papéis de cada pessoa continuam nos textos, só sem a explicação.
- A legenda descreve o acervo de origem. Se a descrição de um papel da legenda destoar do que este documento diz de um papel de fábrica, vale a legenda para aquele arquivo.

Na Importação Aditiva, papel que os textos novos usam e o acervo de destino não tem é cadastrado com o apelido e a descrição da legenda (sem regra de convivência, como os papéis acrescentados à mão). Papel que o destino já tem não é alterado.

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
- **Personagens** (`personagens`, campo separado): quem o autor **criou ou
  reinterpretou**, num cadastro à parte (`db.personagens`), com papéis de
  um registro próprio (de fábrica: Voz, Interlocutor, Aparição, Menção,
  Alusão). Atenção à diferença de ordem: em `pessoas` a ordem dos papéis
  indica relevância; em `personagens` o sistema sempre reordena os papéis
  para a ordem do registro, então ela **não** indica nada. Ver `personagens-for-ai.md`.
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
   na ordem em que aparecem: a ordem indica relevância, e o primeiro papel é
   o mais relevante para aquela pessoa, naquele texto. Se a tarefa pedir uma
   avaliação de importância, parta dessa ordem e, se for o caso, sugira uma
   ordenação melhor. O critério de cada papel está em "O que cada papel
   significa", e os pares que não convivem estão em "Papéis que não
   convivem".
3. Se `papeis` estiver vazio, não pule a pessoa nem presuma um papel:
   relate o vínculo como está, presente e sem papel categorizado. Se for
   Relacionado(a), relate que quem cataloga olhou e nenhum papel coube, e não
   o inclua na leitura por relevância.
4. Não confunda com Autoria (papel único, cadastro diferente) nem com
   Grupos (propriedade fixa da pessoa, não do texto).
5. Cada entrada de `pessoas` num JSON exportado também pode trazer a ficha
   do cadastro: `genero` (texto livre), `identidadeCisTrans`
   (`Cisgênero`, `Transgênero` ou `Não se aplica`) e `corRaca` (lista
   fechada do Autor). **Vazio quer dizer "não documentado"**, nunca
   "cisgênero", "cis" nem "branca": não infira esses dados pelo nome, pelo
   papel ou pelo contexto do poema, e não os use para qualificar o texto
   sem que a tarefa peça. Esses campos não aparecem no `.md`, no `.csv` nem
   na Visualização.
