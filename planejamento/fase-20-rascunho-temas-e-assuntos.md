# Fase 20, rodada 5: rascunho de Temas e Assuntos

Rascunho para o Victor revisar, antes de qualquer código (ver `fase-20-vocabulario-de-fabrica.md`). Como marcar: responda com os nomes que **cortam**, os que **renomeiam** e o que **falta**; o que não for citado fica.

Legenda da coluna Origem: **seu** = já existe no acervo do Victor (o número é a quantidade de textos); **novo** = proposta do Claude. As definições são do Claude, escritas de memória, sem fonte, e servem de nota do Tema ou do Assunto. Onde o Victor já tem nota própria, a dele vence na adoção.

## O que são Tema e Assunto aqui

**Tema** é sobre o que o texto trata, em poucas palavras (por exemplo, Saudade, Guerra, Autoanulação). **Assunto** é o agrupador de Temas e é derivado: o texto não guarda Assunto, ele sai dos Temas do texto. Um Tema pode estar em mais de um Assunto (N:N).

Fronteiras que respeitei:

- **Lugares** (cidade, país, praia) ficam com a Territorialidade e não entram como Tema (F20-D7). Por isso "Brasil" e "Topofilia" ficam só no acervo do Victor.
- **Domínio Imagético** é de onde o texto tira imagens; Tema é o que ele trata. "Natureza" como Tema é poema sobre a natureza, e "Botânica" como Domínio é poema que usa o vocabulário da botânica como imagem. Os dois podem coexistir.
- **Tom** é como o texto soa (Melancólico, Indignado); Tema é o assunto (Saudade, Violência). Por isso "Tristeza" ficou de fora, e "Raiva", "Medo", "Alegria" e "Coragem" entram só como vivência tratada pelo texto.
- **Sensibilidade** e Tema convivem (F20-D18): Automutilação, Ideação suicida e Transtornos alimentares seguem como Temas e também existem como aviso de conteúdo.

## Nomes a normalizar antes da adoção por nome

A adoção casa por nome sem diferenciar maiúscula e acento, então a **caixa** é só uniformidade e **não** causa duplicata. Vale a regra da F20-D23: só a inicial maiúscula, e depois da barra também minúscula (como "Fábula/alegoria").

| Tipo    | Hoje no acervo                     | Passa a ser                        |
| ------- | ---------------------------------- | ---------------------------------- |
| Assunto | Identidade e Autoconhecimento      | Identidade e autoconhecimento      |
| Tema    | Aquecimento Global                 | Aquecimento global                 |
| Tema    | Arrependimento/Culpa               | Arrependimento/culpa               |
| Tema    | Crítica Cultural                   | Crítica cultural                   |
| Tema    | Descanso/Sono                      | Descanso/sono                      |
| Tema    | Descartabilidade/Consumismo        | Descartabilidade/consumismo        |
| Tema    | Desigualdade social/Pobreza        | Desigualdade social/pobreza        |
| Tema    | Literatura/Escrita terapêutica     | Literatura/escrita terapêutica     |
| Tema    | Luto/Finitude                      | Luto/finitude                      |
| Tema    | Repressão emocional/Medo de sentir | Repressão emocional/medo de sentir |
| Tema    | Suspensão/Espera                   | Suspensão/espera                   |

Ficam como estão: "LGBTfobia" e "LGBTQIA+" (siglas) e "Projeção (mecanismo de defesa)" e "Sublimação (mecanismo de defesa)" (o parêntese ajuda a distinguir da palavra comum). A semente em `db.js` ainda usa as grafias antigas e muda na etapa 20b.

## Assuntos (13: 10 do Victor e 3 novos)

| Assunto                           | Origem | Definição                                                |
| --------------------------------- | ------ | -------------------------------------------------------- |
| Identidade e autoconhecimento     | seu    | Quem somos, como nos vemos e como mudamos.               |
| Vida emocional                    | seu    | O que se sente e como se lida com o que se sente.        |
| Modernidade, tecnologia e consumo | seu    | O mundo atual: tecnologia, pressa, consumo e informação. |
| Sociedade e política              | seu    | Poder, desigualdade, justiça, guerra e vida em comum.    |
| Relações e vínculos               | seu    | Amor, amizade, família e os laços entre pessoas.         |
| Corpo, gênero e sexualidade       | seu    | O corpo, o desejo, o gênero e as cobranças sobre eles.   |
| Tempo, memória e perda            | seu    | Passagem do tempo, lembrança, saudade e luto.            |
| Arte, cultura e escrita           | seu    | O ato de criar e o lugar da arte e da escrita.           |
| Discriminação                     | seu    | Preconceito e violência contra grupos de pessoas.        |
| Cotidiano e trabalho              | seu    | A rotina, o trabalho e o cuidado de si no dia a dia.     |
| Natureza e elementos              | novo   | O mundo natural e os elementos como tema.                |
| Espiritualidade e fé              | novo   | Fé, dúvida, sagrado e sentido.                           |
| Infância e família                | novo   | Infância, pais, ancestrais e vida em família.            |

O Assunto do Victor "Cotidiano e trabalho" não existe na semente atual do app (que tem 9 Assuntos); entra no catálogo.

## Temas (155 propostos, 116 do Victor e 39 novos), por Assunto

### Identidade e autoconhecimento

| Tema                             | Origem   | Definição                                                                                                                                |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Autoficção                       | seu (6)  | O texto fala de transformar a própria vida em poema ou narrativa: a consciência de se narrar, de dramatizar ou de romantizar a si mesmo. |
| Busca pela verdade/autenticidade | seu (18) | Procurar ser e dizer o que é verdadeiro, sem máscara.                                                                                    |
| Multiplicidade identitária       | seu (9)  | Ser várias pessoas em uma, ou ter muitas faces.                                                                                          |
| Mudança pessoal                  | seu (13) | Transformar-se, deixar de ser quem se era.                                                                                               |
| Autorrepresentação               | seu (8)  | Como a pessoa se mostra e se descreve a si mesma.                                                                                        |
| Influência formativa             | seu (7)  | Pessoas, lugares e fatos que moldaram quem se é.                                                                                         |
| Pertencimento                    | seu (9)  | Sentir-se parte de um lugar, grupo ou pessoa.                                                                                            |
| Retrato de caráter               | seu (18) | Descrição de uma pessoa pelo jeito de ser.                                                                                               |
| Autonomia pessoal                | seu (12) | Capacidade de decidir a própria vida e agir por conta própria.                                                                           |
| Potencial humano                 | seu (11) | O que uma pessoa pode vir a ser.                                                                                                         |
| Singularidade                    | seu (13) | O que faz cada pessoa única.                                                                                                             |
| Amadurecimento                   | seu (11) | Crescer por dentro, com o tempo e a experiência.                                                                                         |
| Identidade profissional          | seu (1)  | Quem a pessoa é pelo trabalho que faz.                                                                                                   |
| Sentido da vida                  | novo     | Para que se vive e o que dá valor à existência.                                                                                          |

### Vida emocional

| Tema                                | Origem   | Definição                                                            |
| ----------------------------------- | -------- | -------------------------------------------------------------------- |
| Resiliência emocional               | seu (40) | Aguentar a dor e se reerguer.                                        |
| Aceitação da imperfeição            | seu (14) | Aceitar falhas e limites, os próprios e os dos outros, sem se punir. |
| Esgotamento/burnout                 | seu (4)  | Cansaço extremo, físico e mental, por excesso de demanda.            |
| Ruminação mental                    | seu (13) | Pensar o mesmo pensamento ruim, sem parar.                           |
| Autoacolhimento                     | seu (13) | Tratar a si mesmo com cuidado e gentileza, sobretudo na dor.         |
| Crise existencial cíclica           | seu (3)  | Dúvida sobre o sentido da vida que volta de tempos em tempos.        |
| Escapismo                           | seu (6)  | Fugir da realidade pela distração, pela fantasia ou pelo vício.      |
| Medo do fracasso/expectativa alheia | seu (8)  | Receio de falhar ou de decepcionar quem espera algo de nós.          |
| Positividade tóxica                 | seu (2)  | Exigir alegria e otimismo o tempo todo, negando a dor.               |
| Reestruturação cognitiva            | seu (8)  | Mudar o modo de pensar sobre algo para sentir diferente.             |
| Repressão emocional/medo de sentir  | seu (20) | Guardar ou evitar o que se sente, por medo.                          |
| Sublimação (mecanismo de defesa)    | seu (5)  | Transformar um impulso ou uma dor em criação ou trabalho.            |
| Perfeccionismo                      | seu (4)  | Exigir de si um padrão sem falha.                                    |
| Resposta ao estresse/trauma         | seu (10) | Como mente e corpo reagem a uma ameaça ou a uma ferida.              |
| Sonhos e aspirações                 | seu (16) | O que se deseja ser ou conquistar.                                   |
| Autossabotagem                      | seu (6)  | Agir contra os próprios objetivos, sem querer.                       |
| Limites do controle                 | seu (4)  | O que não está ao alcance da vontade, e aceitar isso.                |
| Desapego                            | seu (5)  | Soltar pessoas, coisas ou expectativas.                              |
| Automutilação                       | seu (2)  | Ferir o próprio corpo como resposta à dor emocional.                 |
| Ideação suicida                     | seu (1)  | Pensamentos de morrer ou de se matar.                                |
| Fragilidade emocional               | seu (1)  | Sentir-se emocionalmente vulnerável ou quebradiço.                   |
| Autodesvalorização                  | seu (7)  | Crença de que se vale pouco.                                         |
| Arrependimento/culpa                | seu (5)  | Dor por algo que se fez ou deixou de fazer, e o peso de ter errado.  |
| Autoengano                          | seu (6)  | Contar a si mesmo uma versão que alivia, mas não é verdadeira.       |
| Projeção (mecanismo de defesa)      | seu (2)  | Atribuir ao outro o que não se aceita em si.                         |
| Ressentimento                       | seu (6)  | Mágoa guardada, que não se desfaz.                                   |
| Autoanulação                        | seu (3)  | Apagar-se, calar vontades e limites para manter um vínculo.          |
| Solidão                             | novo     | Sentir-se só, com ou sem gente por perto.                            |
| Medo                                | novo     | O receio, do perigo real ao imaginado.                               |
| Raiva                               | novo     | A ira, a fúria e o que se faz com ela.                               |
| Alegria                             | novo     | Contentamento, riso e leveza.                                        |
| Esperança                           | novo     | Esperar que as coisas melhorem.                                      |
| Coragem                             | novo     | Agir apesar do medo.                                                 |

### Modernidade, tecnologia e consumo

| Tema                        | Origem  | Definição                                                          |
| --------------------------- | ------- | ------------------------------------------------------------------ |
| Modernidade líquida         | seu (6) | Vínculos e valores que se desfazem rápido no mundo atual.          |
| Tecnologia                  | seu (4) | Aparelhos, redes e máquinas na vida da gente.                      |
| Crítica ao materialismo     | seu (1) | Questiona a importância dada a bens e dinheiro.                    |
| Descartabilidade/consumismo | seu (2) | Tratar coisas e pessoas como descartáveis, e a pressa de consumir. |
| Infodemia                   | seu (2) | Excesso de informação, em boa parte falsa ou confusa.              |
| Amor digital/virtual        | seu (3) | Amar ou desejar por tela, mensagem ou aplicativo.                  |
| Crítica cultural            | seu (5) | Olhar crítico sobre costumes, valores e produtos da cultura.       |
| Positividade tóxica         | seu (2) | Exigir alegria e otimismo o tempo todo, negando a dor.             |
| Redes sociais               | novo    | A vida em plataformas, curtidas e perfis.                          |

### Sociedade e política

| Tema                        | Origem   | Definição                                                    |
| --------------------------- | -------- | ------------------------------------------------------------ |
| Crítica político-social     | seu (10) | Critica o poder, as leis e as estruturas da sociedade.       |
| Desigualdade social/pobreza | seu (3)  | Diferenças de renda e de oportunidade, e a vida na falta.    |
| Polarização                 | seu (6)  | Divisão da sociedade em lados que não se ouvem.              |
| Corrupção sistêmica         | seu (2)  | Corrupção que é parte do funcionamento das instituições.     |
| Discurso de ódio            | seu (2)  | Fala que ataca ou desumaniza um grupo.                       |
| Intolerância religiosa      | seu (1)  | Hostilidade contra a fé ou a descrença de alguém.            |
| Psicofobia                  | seu (1)  | Preconceito contra quem tem sofrimento ou transtorno mental. |
| Sistema educacional         | seu (3)  | A escola e o ensino, com seus acertos e falhas.              |
| Violência                   | seu (3)  | Agressão física, psicológica ou social.                      |
| Aquecimento global          | seu (2)  | Mudança do clima e seus efeitos sobre o mundo.               |
| Inconformismo               | seu (2)  | Recusar aceitar as coisas como estão.                        |
| Utopia coletiva             | seu (6)  | O sonho de uma sociedade melhor.                             |
| Violência simbólica         | seu (4)  | Dominação que passa por costumes e palavras, sem golpe.      |
| Meritocracia                | seu (1)  | A ideia de que cada um chega onde merece, e seus limites.    |
| Guerra                      | novo     | Conflito armado e o que ele faz com as pessoas.              |
| Liberdade                   | novo     | Poder escolher e agir, e o que a tira.                       |
| Justiça e injustiça         | novo     | O que é justo, o que é tratado como direito, e o que não é.  |
| Poder e autoridade          | novo     | Quem manda, como manda e o que isso causa.                   |
| Exílio e migração           | novo     | Deixar a terra, ser forçado a sair ou viver longe de casa.   |
| Resistência e luta          | novo     | Enfrentar uma opressão, em grupo ou sozinho.                 |

### Relações e vínculos

| Tema                       | Origem   | Definição                                                      |
| -------------------------- | -------- | -------------------------------------------------------------- |
| Gratidão pela amizade      | seu (7)  | Agradecer o que os amigos fazem e são.                         |
| Confiança interpessoal     | seu (21) | Confiar nos outros, ou perder essa confiança.                  |
| Amor digital/virtual       | seu (3)  | Amar ou desejar por tela, mensagem ou aplicativo.              |
| Cuidado interpessoal       | seu (19) | Cuidar de alguém e ser cuidado, em gestos e atenção.           |
| Desejo de ser compreendido | seu (20) | Vontade de que o outro entenda quem se é de verdade.           |
| Empatia social             | seu (3)  | Sentir e entender a situação dos outros em geral.              |
| Impermanência amorosa      | seu (11) | O amor que muda, acaba ou não dura.                            |
| Isolamento                 | seu (12) | Afastamento dos outros, por escolha ou por força.              |
| Paixão/desejo romântico    | seu (35) | Querer alguém com intensidade: o encanto, o desejo, a entrega. |
| União social               | seu (3)  | Pessoas que se juntam por uma causa comum.                     |
| Retrato de caráter         | seu (18) | Descrição de uma pessoa pelo jeito de ser.                     |
| Amizade                    | seu (15) | O laço entre amigos: companhia, lealdade, afeto sem romance.   |
| Possessividade             | seu (4)  | Querer o outro só para si.                                     |
| Violência simbólica        | seu (4)  | Dominação que passa por costumes e palavras, sem golpe.        |
| Paternidade                | seu (1)  | Ser pai ou ter um pai, e o que isso carrega.                   |
| Término amoroso            | seu (35) | O fim de uma relação de amor.                                  |
| Dependência afetiva        | seu (9)  | Precisar de alguém além do saudável para se sentir bem.        |
| Assimetria afetiva         | seu (22) | Um sente ou se dá mais do que o outro na relação.              |
| Relação cíclica            | seu (5)  | Relação que termina e recomeça, repetindo o padrão.            |
| Invalidação emocional      | seu (21) | Ter o que se sente negado ou diminuído por outra pessoa.       |
| Amor incondicional         | seu (7)  | Amor que não depende de o outro merecer ou retribuir.          |
| Limites interpessoais      | seu (9)  | Até onde o outro pode ir, e dizer "não" a ele.                 |
| Interdependência           | seu (2)  | Pessoas que dependem umas das outras.                          |
| Perdão                     | seu (3)  | Perdoar a outro ou a si.                                       |
| Pedido de desculpas        | seu (2)  | Pedir perdão ou esperar por ele.                               |
| Pertencimento              | seu (9)  | Sentir-se parte de um lugar, grupo ou pessoa.                  |
| Suspensão/espera           | seu (4)  | Ficar no meio do caminho, esperando algo ou alguém.            |
| Manipulação emocional      | seu (9)  | Usar o sentimento do outro para controlá-lo.                   |
| Autoanulação               | seu (3)  | Apagar-se, calar vontades e limites para manter um vínculo.    |
| Idealização do outro       | seu (9)  | Ver o outro maior ou melhor do que ele é.                      |
| Ambivalência afetiva       | seu (13) | Querer e não querer a mesma pessoa ao mesmo tempo.             |
| Desistência                | seu (5)  | Parar de insistir em alguém, em algo ou em si.                 |
| Amor                       | novo     | O amor em geral, de qualquer tipo e intensidade.               |
| Ciúme                      | novo     | Receio de perder o outro para alguém ou para algo.             |
| Traição                    | novo     | Quebra de confiança ou de lealdade.                            |
| Maternidade                | novo     | Ser mãe ou ter uma mãe, e o que isso carrega.                  |

### Corpo, gênero e sexualidade

| Tema                     | Origem  | Definição                                                   |
| ------------------------ | ------- | ----------------------------------------------------------- |
| Machismo                 | seu (2) | Preconceito e domínio dos homens sobre as mulheres.         |
| Pressão estética         | seu (7) | Cobrança para ter um corpo e uma aparência de padrão.       |
| Autonomia corporal       | seu (1) | Direito de decidir sobre o próprio corpo.                   |
| Corporeidade             | seu (1) | A vivência de ter e ser um corpo.                           |
| Culpabilização da vítima | seu (2) | Pôr na vítima a responsabilidade pela violência que sofreu. |
| LGBTfobia                | seu (1) | Preconceito e violência contra pessoas LGBTQIA+.            |
| LGBTQIA+                 | seu (1) | Vivências e identidades da diversidade sexual e de gênero.  |
| Masculinidade tóxica     | seu (1) | Normas de "ser homem" que ferem os homens e os outros.      |
| Objetificação            | seu (4) | Tratar uma pessoa como coisa.                               |
| Vergonha sexual          | seu (1) | Vergonha ligada ao desejo, ao corpo ou à vida sexual.       |
| Violência simbólica      | seu (4) | Dominação que passa por costumes e palavras, sem golpe.     |
| Transtornos alimentares  | seu (1) | Relação doentia com a comida e com o corpo.                 |
| Erotismo                 | novo    | O desejo físico e sensual, sugerido ou dito.                |
| Doença e saúde           | novo    | Adoecer, tratar, curar, e o que isso muda na vida.          |

### Tempo, memória e perda

| Tema              | Origem   | Definição                                                 |
| ----------------- | -------- | --------------------------------------------------------- |
| Luto/finitude     | seu (14) | A perda de quem morreu e a consciência de que tudo acaba. |
| Saudade           | seu (23) | Falta de alguém, de algum tempo ou de algum lugar.        |
| Cotidiano         | seu (5)  | A vida de todo dia, em suas rotinas e pequenos fatos.     |
| Despedida         | seu (4)  | O momento de partir ou de ver partir.                     |
| Efemeridade       | seu (7)  | O que dura pouco e passa.                                 |
| Memória           | seu (23) | Lembrar, o que fica e como se lembra.                     |
| Memória histórica | seu (2)  | Como uma sociedade lembra o seu passado.                  |
| Saudosismo        | seu (1)  | Apego ao passado, visto como melhor que o presente.       |
| Viver o presente  | seu (1)  | Estar no agora, sem se prender ao antes nem ao depois.    |
| Passagem do tempo | novo     | O tempo que corre e o que ele faz com tudo.               |
| Envelhecimento    | novo     | Envelhecer, a velhice e o que ela traz.                   |

### Arte, cultura e escrita

| Tema                           | Origem   | Definição                                                          |
| ------------------------------ | -------- | ------------------------------------------------------------------ |
| Crítica cultural               | seu (5)  | Olhar crítico sobre costumes, valores e produtos da cultura.       |
| Literatura/escrita terapêutica | seu (15) | Escrever para elaborar a dor e se cuidar.                          |
| Contracultura                  | seu (2)  | Recusa dos valores dominantes e criação de modos de vida à margem. |
| Função social da arte          | seu (4)  | Para que serve a arte na sociedade: denunciar, unir, transformar.  |
| Inconformismo                  | seu (2)  | Recusar aceitar as coisas como estão.                              |
| Processo criativo              | seu (12) | Como se cria, os bloqueios e as descobertas do fazer.              |
| Limites da linguagem           | seu (1)  | O que as palavras não conseguem dizer.                             |
| Inspiração e musa              | novo     | De onde vem o impulso de escrever, e quem o desperta.              |
| Leitura e livros               | novo     | Ler, os livros e as bibliotecas como vivência.                     |

### Discriminação

| Tema                     | Origem  | Definição                                                    |
| ------------------------ | ------- | ------------------------------------------------------------ |
| Machismo                 | seu (2) | Preconceito e domínio dos homens sobre as mulheres.          |
| LGBTfobia                | seu (1) | Preconceito e violência contra pessoas LGBTQIA+.             |
| Culpabilização da vítima | seu (2) | Pôr na vítima a responsabilidade pela violência que sofreu.  |
| Intolerância religiosa   | seu (1) | Hostilidade contra a fé ou a descrença de alguém.            |
| Psicofobia               | seu (1) | Preconceito contra quem tem sofrimento ou transtorno mental. |
| Racismo                  | novo    | Preconceito e violência por causa de raça ou cor.            |
| Xenofobia                | novo    | Preconceito contra quem vem de outro país ou lugar.          |
| Capacitismo              | novo    | Preconceito contra pessoas com deficiência.                  |

### Cotidiano e trabalho

| Tema                    | Origem  | Definição                                                 |
| ----------------------- | ------- | --------------------------------------------------------- |
| Cotidiano               | seu (5) | A vida de todo dia, em suas rotinas e pequenos fatos.     |
| Esgotamento/burnout     | seu (4) | Cansaço extremo, físico e mental, por excesso de demanda. |
| Descanso/sono           | seu (2) | Repouso, sono e a falta deles.                            |
| Hábitos                 | seu (2) | Hábitos e rotinas que moldam a vida.                      |
| Meritocracia            | seu (1) | A ideia de que cada um chega onde merece, e seus limites. |
| Identidade profissional | seu (1) | Quem a pessoa é pelo trabalho que faz.                    |
| Saúde física            | seu (1) | O estado do corpo e o cuidado com ele.                    |
| Trabalho e ofício       | novo    | O trabalho, o ofício e o que se faz para viver.           |
| Dinheiro e escassez     | novo    | Ter ou não ter dinheiro, dívida e sobrevivência.          |

### Natureza e elementos

| Tema            | Origem | Definição                                                            |
| --------------- | ------ | -------------------------------------------------------------------- |
| Natureza        | novo   | O mundo natural: plantas, bichos, paisagens e seus ciclos.           |
| Estações do ano | novo   | Primavera, verão, outono e inverno, como imagem do tempo e do ânimo. |
| Água e mar      | novo   | Mar, rio, chuva e a água como força e como imagem.                   |
| Céu e astros    | novo   | Sol, lua, estrelas e o que se vê lá em cima.                         |

### Espiritualidade e fé

| Tema                     | Origem | Definição                                            |
| ------------------------ | ------ | ---------------------------------------------------- |
| Fé e dúvida              | novo   | Crer, descrer e duvidar.                             |
| Sagrado e transcendência | novo   | O divino, o mistério e o que passa do humano.        |
| Destino e acaso          | novo   | O que está escrito, o que é sorte e o que é escolha. |
| Sentido da vida          | novo   | Para que se vive e o que dá valor à existência.      |

### Infância e família

| Tema                     | Origem | Definição                                                   |
| ------------------------ | ------ | ----------------------------------------------------------- |
| Infância                 | novo   | O tempo de criança, lembrado ou vivido.                     |
| Família                  | novo   | Os laços e os conflitos de quem cresce junto.               |
| Maternidade              | novo   | Ser mãe ou ter uma mãe, e o que isso carrega.               |
| Ancestralidade e herança | novo   | O que se herda de quem veio antes: histórias, nome, marcas. |

Temas que aparecem em mais de um Assunto (por exemplo Machismo, Violência simbólica, Retrato de caráter) repetem a mesma linha em cada tabela e valem como um Tema só. Em "Sentido da vida" e "Maternidade", os novos também ficam em dois Assuntos.

## Os 19 Temas do Victor que proponho deixar só no acervo dele

Regra (F20-D5): vale o termo mais fácil de entender para quem começa. Estes são técnicos demais, pessoais demais ou de uso único. Continuam no acervo dele, nos mesmos Assuntos, e só não vão para o catálogo (então não aparecem como "nunca usados" para quem não os criou).

| Tema                             | Textos | Motivo                                                              |
| -------------------------------- | ------ | ------------------------------------------------------------------- |
| Encanto pessoal                  | 1      | Termo pessoal, de uso único; fica opaco para quem começa            |
| Humildade intelectual            | 1      | Uso único e muito específico                                        |
| Atendimento ao público           | 1      | Muito específico de uma experiência de trabalho                     |
| Psicologização                   | 1      | Termo técnico de sociologia, difícil para quem começa               |
| Individualização do sofrimento   | 1      | Termo técnico de sociologia, difícil para quem começa               |
| Alívio momentâneo                | 1      | Próximo de Escapismo, e de uso único                                |
| Profecia autorrealizável         | 4      | Conceito analítico que pede explicação; fica melhor como achado seu |
| Quantificação do inquantificável | 3      | Conceito analítico seu, difícil de reconhecer fora do seu uso       |
| Hyper-scheduling/workaholism     | 2      | Jargão em inglês, e já há Esgotamento/burnout e Hábitos             |
| Reificação                       | 2      | Termo técnico de filosofia; Objetificação cobre o caso comum        |
| Imaginação sociológica           | 2      | Termo técnico de sociologia                                         |
| Topofilia                        | 4      | É sobre lugar, e lugares ficam com a Territorialidade               |
| Brasil                           | 3      | É lugar, e lugares ficam com a Territorialidade (F20-D7)            |
| Anomia                           | 2      | Termo técnico de sociologia                                         |
| Patologia social                 | 2      | Termo técnico de sociologia                                         |
| Hedonismo juvenil                | 1      | Uso único e muito específico                                        |
| Geração Z                        | 2      | Marca de geração, que envelhece depressa como tema de fábrica       |
| Pós-verdade                      | 1      | Próximo de Infodemia, que fica                                      |
| Colapso civilizacional           | 2      | Próximo de Aquecimento global, que fica                             |

## Regras de adoção

- Os vínculos Tema e Assunto que o Victor já tem **não mudam**: a semente só cria vínculos para o que ela cadastra de novo. Se ele ligou um Tema a um Assunto diferente do catálogo, o dele vence.
- Tema do catálogo que o Victor já tem com o mesmo nome vira de fábrica, e a nota dele vence a definição de fábrica.
- O que ele excluir não volta (F20-D1). Nenhum texto ganha Tema por causa da semente.

## Contagem

116 Temas do Victor e 39 novos, 155 no total, em 13 Assuntos. Isso passa do teto de cerca de 120 (F20-D14) em uns 30%, mais do que "um pouco" (F20-D17). A causa é que o acervo dele já tem 135 Temas, e o catálogo mantém 116 deles. Se preferir ficar mais perto de 120, a pergunta 3 abaixo traz um caminho.

## Perguntas ao Victor

1. Dos 39 novos, algum você nunca usaria? Falta algum clássico da poesia que faria sentido para quem começa?
2. Concorda com os 19 que ficam só no seu acervo? Se quiser algum no catálogo, diga o nome.
3. Tamanho: aceita 155, ou prefere que eu mande para "só no acervo" também os Temas seus de uso único que ficaram (por exemplo Paternidade, Meritocracia, Saudosismo, Viver o presente, LGBTQIA+) para reduzir um pouco o total?
4. Os 3 Assuntos novos (Natureza e elementos, Espiritualidade e fé, Infância e família) fazem sentido, ou prefere outros nomes?
5. As 11 renomeações da tabela de nomes (1 Assunto e 10 Temas): você as faz no seu sistema, como nas rodadas anteriores?
6. As definições dos Temas seus estão certas? Aponte pelo nome as que não soarem como você; o que não for citado fica.

## Respostas do Victor (20/10/2026)

1. Os 39 Temas novos foram aprovados, sem cortes.
2. Os 19 Temas que ficam só no acervo dele foram aprovados.
3. O catálogo fica com os **155 Temas** ("tema é algo amplo por natureza"); nenhum corte extra de uso único.
4. Os 3 Assuntos novos e seus nomes foram aprovados.
5. As 11 renomeações (tabela "Nomes a normalizar") ele faz no sistema dele.
6. As definições dos Temas dele: ele vai conferir e apontar pelo nome as que não soarem certas; o que não for citado fica.

7. Definições conferidas e aprovadas, com **uma ressalva**: **Autoficção** é o texto **falar sobre** a autoficção (o ato de se narrar, de transformar a própria vida em escrita), e não o **uso** dela. Quem usa a vivência real misturada com invenção já tem a Tradição "Poesia confessional". Conferido nos cinco textos que levam o Tema (Grafiabio, Terra do Nunca, Desestruturação, Apenas para sapatear, Reis do drama): em todos o texto comenta o próprio ato de se escrever e de dramatizar a vida. A definição foi trocada para: "O texto fala de transformar a própria vida em poema ou narrativa: a consciência de se narrar, de dramatizar ou de romantizar a si mesmo." As 11 renomeações de caixa já foram feitas no sistema dele.

**Rodada 5 fechada** (155 Temas e 13 Assuntos). Com ela, **o catálogo da Fase 20 está completo**: Sensibilidade e Tom, Tradição, Domínio Imagético, Estilo, Temas e Assuntos.
