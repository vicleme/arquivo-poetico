# Fase 20, rodada 4: rascunho de Estilo

Rascunho para o Victor revisar, antes de qualquer código (ver `fase-20-vocabulario-de-fabrica.md`). Como marcar: responda com os nomes que **cortam**, os que **renomeiam** e o que **falta**; o que não for citado fica.

Legenda da coluna Origem: **seu** = já existe no acervo do Victor; **novo** = proposta do Claude. As definições são do Claude, escritas de memória, sem fonte, e servem de nota da etiqueta.

## O que é Estilo aqui

Estilo é o **recurso de linguagem, de construção ou de apresentação** que o texto usa, e que dá para contar e filtrar (por exemplo, "quantos textos usam anáfora"). Estilo diz que o texto **usa** o recurso. Onde ele aparece, verso a verso, é assunto de outros campos.

Fronteiras que respeitei, para não duplicar o que o app já tem:

- **Som (F20-D9).** Aliteração, assonância, consonância e onomatopeia entram aqui, em "Jogos de palavras e sons", subcluster "Som e sentido", junto de Paronomásia. O **Eco Sonoro** da Sonoridade continua dizendo **em quais versos**. Uma coisa não exclui a outra.
- **Forma e medida** (soneto, haikai, verso livre, decassílabo, rima, esquema de rimas) são campos da Sonoridade e não entram.
- **Intertextualidade** (alusão, paródia, citação de outra obra) já é um campo próprio do Poema, então não propus etiqueta de paródia nem de pastiche. Epígrafe e Citação de encerramento ficam porque são **posição no texto**, e não relação com outra obra.
- **Alegoria** já está em Tradição (Fábula/alegoria). **Ironia** é Tom (Irônico, Autoirônico). Não repeti nenhuma das duas.
- **Verso livre e quebra de verso:** "Enjambement" entra aqui porque o app não tem campo para ele (conferi: só aparece como comentário em `utils.js`, sem catálogo).

## Nomes a normalizar antes da adoção por nome

Nenhum. Os dois ajustes de caixa de Estilo (Poesia espacial e Mise en abyme) o Victor já fez em 20/10/2026. Os demais nomes de etiqueta e de cluster batem com o que a semente usaria.

## Os 9 achados do Victor que proponho deixar só no acervo dele

Regra (F20-D5): vale o termo mais fácil de entender para quem começa. Estes são variantes finas de uma etiqueta que **fica** na semente, ou termos pessoais que pedem explicação demais. Continuam existindo no acervo dele, nos mesmos clusters, e só não vão para o catálogo (então não aparecem como "nunca usadas" para quem não os criou).

| Etiqueta                               | Motivo                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Bifronte                               | Termo pessoal, sem definição que eu conheça; ficaria opaco para quem começa  |
| Bifurcação lexical por hífen           | Variante de Bifurcação lexical por parênteses, que fica como a representante |
| Bifurcação lexical por pontuação       | Mesmo motivo                                                                 |
| Fusão lexical por diacrítico           | Variante de Palavra-valise e Neologismo, que ficam                           |
| Fusão lexical por supressão de espaços | Mesmo motivo                                                                 |
| Fusão lexical por troca de letra       | Mesmo motivo                                                                 |
| Diminutivo em eco                      | Recurso muito específico (1 texto)                                           |
| Paronomásia por espaçamento            | Variante de Paronomásia, que fica                                            |
| Espelhamento de palavra                | Próximo de Anagrama e de Ambigrama simétrico, que ficam                      |

## Estilo (89 propostas, 65 do Victor e 24 novas)

### Contraste e paradoxo

| Etiqueta | Origem | Definição                                                                                 |
| -------- | ------ | ----------------------------------------------------------------------------------------- |
| Antítese | seu    | Oposição de ideias ou palavras contrárias na mesma frase, como "fogo e gelo".             |
| Oxímoro  | seu    | Junção de dois termos que se contradizem numa expressão só, como "silêncio ensurdecedor". |
| Paradoxo | novo   | Afirmação que parece absurda e guarda uma verdade quando pensada com calma.               |

### Cor

| Etiqueta                       | Origem | Definição                                                                         |
| ------------------------------ | ------ | --------------------------------------------------------------------------------- |
| Codificação cromática de vozes | seu    | Cada voz do texto aparece numa cor, e a cor diz quem fala.                        |
| Cor semântica                  | seu    | A cor do texto carrega sentido: marca uma emoção, um tema ou uma ideia.           |
| Ênfase cromática               | seu    | Cor usada para destacar uma palavra ou um trecho.                                 |
| Metáfora cromática             | seu    | A cor serve de imagem para um sentimento ou uma ideia, como "o azul da tristeza". |
| Policromia                     | seu    | Várias cores no mesmo texto, sem um código fixo para cada uma.                    |

### Jogos de palavras e sons

#### Cadência e eco

| Etiqueta           | Origem | Definição                                                                             |
| ------------------ | ------ | ------------------------------------------------------------------------------------- |
| Cadência por pausa | seu    | O ritmo nasce de pausas marcadas (vírgulas, reticências, quebras) que ditam o fôlego. |

#### Fusão e bifurcação lexical

| Etiqueta                          | Origem | Definição                                                                       |
| --------------------------------- | ------ | ------------------------------------------------------------------------------- |
| Bifurcação lexical por parênteses | seu    | Palavra que se abre em duas leituras por meio de parênteses, como "des(a)pego". |
| Neologismo                        | seu    | Palavra nova, inventada pelo autor.                                             |
| Palavra-valise                    | seu    | Palavra formada pela fusão de duas, como "portunhol".                           |

#### Som e sentido

| Etiqueta               | Origem | Definição                                                                                        |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Aliteração             | novo   | Repetição de consoantes iguais ou parecidas em palavras próximas, como em "o rato roeu a roupa". |
| Anagrama               | seu    | Palavra feita com as letras de outra, em outra ordem.                                            |
| Assonância             | novo   | Repetição de sons de vogal em palavras próximas.                                                 |
| Consonância            | novo   | Repetição de sons de consoante, em geral no fim das palavras ou das sílabas, sem chegar a rima.  |
| Jogo fonético-silábico | seu    | Brincadeira com os sons e as sílabas da palavra: cortar, repetir, trocar ou separar sílabas.     |
| Onomatopeia            | novo   | Palavra que imita um som, como "tic-tac" e "zum".                                                |
| Paronomásia            | seu    | Aproximação de palavras de som parecido e sentido diferente, como "passado" e "pássaro".         |
| Trocadilho             | novo   | Brincadeira com palavras de som igual ou parecido para criar duplo sentido ou graça.             |

### Metáfora e sentido

| Etiqueta                       | Origem | Definição                                                                                          |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------- |
| Apelido-metáfora               | seu    | Apelido que funciona como metáfora: chama alguém ou algo por um nome que o descreve por imagem.    |
| Comparação                     | novo   | Aproxima duas coisas com "como", "tal qual" ou "parece".                                           |
| Eufemismo                      | novo   | Palavra suave no lugar de uma dura, como "partiu" por "morreu".                                    |
| Hipérbole                      | novo   | Exagero de propósito para dar força à ideia, como "morri de rir".                                  |
| Homonímia                      | seu    | Palavras de mesma forma e sentidos diferentes, como "manga" (fruta) e "manga" (roupa).             |
| Metáfora                       | novo   | Chama uma coisa pelo nome de outra, sem "como", para dizer o que ela é por imagem.                 |
| Litotes                        | novo   | Afirma negando o contrário, para suavizar ou dar ênfase, como "não é nada mau" para "é muito bom". |
| Metáforas complexas (conceits) | seu    | Metáfora longa e engenhosa, desenvolvida por vários versos como um raciocínio.                     |
| Metonímia                      | novo   | Troca uma palavra por outra ligada a ela, como "ler Drummond" para ler a obra dele.                |
| Polissemia                     | seu    | Palavra com vários sentidos, e o texto aproveita mais de um ao mesmo tempo.                        |
| Prosopopeia                    | seu    | Dá voz, vontade ou sentimento a quem não tem, como coisa, bicho ou ideia.                          |
| Sinestesia                     | novo   | Mistura de sentidos numa imagem só, como "voz doce" ou "cheiro azul".                              |

### Metalinguagem e autorreferência

| Etiqueta              | Origem | Definição                                                                               |
| --------------------- | ------ | --------------------------------------------------------------------------------------- |
| Autorreferencialidade | seu    | O texto fala de si mesmo: do próprio título, das próprias partes ou do próprio formato. |
| Isomorfismo           | seu    | A forma do texto imita o que ele diz, como um poema sobre cair que desce a página.      |
| Metalinguagem         | seu    | Fala da própria linguagem ou do ato de escrever.                                        |
| Metapoesia            | seu    | O poema fala do próprio poema ou do ofício de fazer poesia.                             |
| Mise en abyme         | seu    | Texto dentro do texto, como uma cena que repete a obra em miniatura.                    |

### Paratexto

#### Jogos com o título

| Etiqueta                  | Origem | Definição                                                                    |
| ------------------------- | ------ | ---------------------------------------------------------------------------- |
| Menção ao título do livro | seu    | Texto que cita, no corpo, o título do livro em que está publicado.           |
| Título ausente do texto   | seu    | O título traz uma palavra ou ideia que não aparece no corpo do poema.        |
| Título camuflado          | seu    | O título se esconde dentro do texto, como parte de um verso ou de uma frase. |
| Título deslocado          | seu    | O título aparece fora do lugar de costume, no meio ou no fim do poema.       |

#### Molduras e citações

| Etiqueta                       | Origem | Definição                                                                  |
| ------------------------------ | ------ | -------------------------------------------------------------------------- |
| Citação de encerramento        | seu    | Fala, frase ou trecho citado no fim do texto, que o fecha.                 |
| Epígrafe                       | seu    | Citação curta posta antes do texto, que dá o tom ou a chave de leitura.    |
| Moldura de abertura pós-título | seu    | Texto curto fora dos versos, logo depois do título, que prepara a leitura. |
| Moldura de abertura pré-título | seu    | Texto curto fora dos versos, antes do título, que prepara a leitura.       |
| Moldura de fechamento          | seu    | Texto curto fora dos versos, no fim, que fecha ou comenta o poema.         |
| Moldura em itálico             | seu    | Moldura escrita em itálico, para separá-la da voz principal.               |

### Poesia visual e ambigramas

| Etiqueta              | Origem | Definição                                                                                     |
| --------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Ambigrama assimétrico | seu    | Palavra ou frase que, girada ou refletida, se lê como outra palavra ou frase.                 |
| Ambigrama simétrico   | seu    | Palavra ou frase que se lê igual quando girada ou refletida.                                  |
| Caligrama             | seu    | Poema cujas letras e versos desenham o objeto de que ele fala.                                |
| Poema-desenho         | seu    | Poema em que um desenho faz parte do texto, e não é só enfeite.                               |
| Poesia espacial       | seu    | Usa o espaço da página como parte do sentido: brancos, posição e distância entre as palavras. |

### Repetição e paralelismo

#### Estrutura paralela

| Etiqueta               | Origem | Definição                                                      |
| ---------------------- | ------ | -------------------------------------------------------------- |
| Paralelismo            | seu    | Versos ou frases com a mesma construção, postos lado a lado.   |
| Paralelismo antitético | seu    | Estrutura repetida em que cada parte diz o oposto da anterior. |
| Quiasmo                | seu    | Estrutura que se cruza e se inverte, no desenho A B / B A.     |

#### Progressão e retorno

| Etiqueta             | Origem | Definição                                                                                                                     |
| -------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Estrutura circular   | seu    | O texto termina retomando, literalmente ou com variação reconhecível, um elemento da abertura (verso, estrofe ou imagem).     |
| Gradação             | seu    | Sequência de ideias ou palavras que sobe ou desce em intensidade.                                                             |
| Refrão               | seu    | Verso ou trecho que volta ao longo do poema.                                                                                  |
| Retomada de abertura | seu    | Um verso ou uma imagem do começo volta no meio ou perto do fim do texto, sem ser o fecho, ao contrário da estrutura circular. |

#### Repetição de termos

| Etiqueta   | Origem | Definição                                                                                                       |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| Anadiplose | seu    | A última palavra de um verso abre o verso seguinte.                                                             |
| Anáfora    | seu    | Mesma palavra ou expressão no começo de versos ou frases seguidos.                                              |
| Epífora    | novo   | Mesma palavra ou expressão no fim de versos ou frases seguidos.                                                 |
| Poliptoto  | seu    | Repetição da mesma palavra em outra forma, como outro tempo verbal ou outra classe, em "amar o amor que amava". |

### Sintaxe e ritmo (cluster novo)

| Etiqueta                   | Origem | Definição                                                                                                                            |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Assíndeto                  | novo   | Termos ou frases postos em fila sem conectivo, como em "cheguei, vi, venci".                                                         |
| Elipse                     | novo   | Omite uma palavra que o leitor completa sozinho.                                                                                     |
| Enjambement (cavalgamento) | novo   | A frase passa do fim de um verso para o seguinte sem pausa, e o verso "cai" no outro.                                                |
| Hipérbato                  | novo   | Inverte a ordem comum das palavras, como em "de ouro era o seu cabelo".                                                              |
| Zeugma                     | novo   | Um termo dito uma vez serve a várias partes da frase, às vezes com sentido diferente em cada uma, como "pegou o chapéu e a coragem". |
| Polissíndeto               | novo   | Repete os conectivos, como em "e chove, e some, e volta".                                                                            |

### Registro e linguagem (cluster novo)

| Etiqueta           | Origem | Definição                                                                |
| ------------------ | ------ | ------------------------------------------------------------------------ |
| Arcaísmo           | novo   | Palavra ou construção antiga, que já saiu de uso, retomada de propósito. |
| Coloquialismo      | novo   | Fala do dia a dia, com gíria, contração e jeito de conversa.             |
| Mistura de línguas | novo   | Palavras ou frases de mais de uma língua no mesmo texto.                 |

### Tipografia e diagramação

#### Arranjo espacial

| Etiqueta                      | Origem | Definição                                                                             |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Diagramação diagonal/vertical | seu    | Texto posto na diagonal ou na vertical, em vez de em linhas horizontais.              |
| Grafia espaçada               | seu    | Letras ou sílabas separadas por espaço, como "s a u d a d e", para esticar a leitura. |
| Recuo de continuidade         | seu    | Recuo que mostra que a linha continua a anterior.                                     |
| Recuo hipotático              | seu    | Recuo que marca uma parte subordinada, como um desdobramento ou um aparte.            |
| Rotação tipográfica           | seu    | Texto girado, inclinado ou de cabeça para baixo.                                      |

#### Codificação de vozes e semântica

| Etiqueta                         | Origem | Definição                                                                           |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| Codificação tipográfica de vozes | seu    | Fontes, estilos ou tamanhos diferentes marcam quem fala.                            |
| Ênfase tipográfica               | seu    | Negrito, itálico, caixa alta ou tamanho usados para destacar uma palavra ou trecho. |
| Variação semântica de fonte      | seu    | A fonte muda para mudar o sentido ou o clima do trecho.                             |

#### Marcas de edição

| Etiqueta           | Origem | Definição                                                   |
| ------------------ | ------ | ----------------------------------------------------------- |
| Itálico integral   | seu    | O texto inteiro em itálico, como uma voz à parte.           |
| Notação matemática | seu    | Símbolos e fórmulas de matemática dentro do texto.          |
| Tachado            | seu    | Texto riscado, que mostra o que se corrige, nega ou desfaz. |

### Vozes e formato do texto

| Etiqueta               | Origem | Definição                                                                                         |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Aparte                 | seu    | Fala entre parênteses ou à parte, como um comentário baixinho do eu.                              |
| Apóstrofe              | novo   | O eu se dirige a alguém ou a algo ausente, ou que não pode responder, como em "Ó mar!".           |
| Dueto                  | seu    | Duas vozes que se alternam no mesmo poema.                                                        |
| Enumeração telegráfica | seu    | Lista rápida de itens ou ações, em frases curtas e sem conectivos.                                |
| Formato de mensagem    | seu    | Texto que imita mensagem de celular, e-mail ou chat.                                              |
| Parêntese aberto       | seu    | Parêntese de abertura sem fechamento, em geral na última estrofe, que deixa o aparte em suspenso. |

## Fora do catálogo

Candidatas que avaliei e deixei de fora, com o motivo:

- **Alegoria:** já está em Tradição (Fábula/alegoria).
- **Ironia:** é Tom.
- **Paródia e pastiche:** são relação com outra obra, que o campo Intertextualidade já cobre.
- **Verso livre, soneto, rima:** são campos da Sonoridade.
- **Perífrase, catacrese, antonomásia, pleonasmo:** figuras clássicas, mas raras de se ver e de se reconhecer; deixariam a lista de "nunca usadas" longa sem ajudar quem começa. (Zeugma e Litotes entraram a pedido do Victor.)
- **Dedicatória:** o Poema já tem o papel "Dedicatário(a)" no campo Pessoas.

## Contagem

65 do Victor e 24 novas, 89 no total, em 12 clusters de topo (10 do Victor e 2 novos, "Sintaxe e ritmo" e "Registro e linguagem") e 11 subclusters. Fica abaixo do teto de cerca de 90 (F20-D14). Dos 74 do Victor, 9 ficam só no acervo dele.

## Respostas do Victor (20/10/2026)

1. As novas foram aprovadas como estão, e ele pediu para entrarem também **Zeugma** e **Litotes** (não as considera raras). Entraram: Litotes em "Metáfora e sentido" e Zeugma em "Sintaxe e ritmo".
2. Os 9 achados ficam só no acervo dele (aprovado).
3. As 20 definições marcadas "seu": o Claude as reenvia em tabela para ele aprovar ou corrigir.
4. Os clusters "Sintaxe e ritmo" e "Registro e linguagem" ficam.
5. Enjambement fica em Estilo.

6. As 20 definições de termos dele foram aprovadas. Uma foi corrigida: **Retomada de abertura** pode voltar no meio ou perto do fim do texto, só não é o fecho (esse é o papel da Estrutura circular). Os dois Recuos (de continuidade e hipotático) estavam certos como escritos.

7. Em 21/10/2026 o Victor criou a etiqueta **Menção ao título do livro** ("Texto que cita, no corpo, o título do livro em que está publicado."). Entrou na semente, em Paratexto, subcluster "Jogos com o título", junto de Título ausente do texto, Título camuflado e Título deslocado: as quatro tratam da relação entre título e corpo, e esta diz respeito ao título do livro, e não ao do texto. O nome do subcluster não muda. A etiqueta só se aplica a texto publicado em livro; para quem não usa Livros, ficará na lista de "nunca usadas".

**Rodada de Estilo fechada** (89 etiquetas, 65 do Victor e 24 novas). Segue Temas e Assuntos.
