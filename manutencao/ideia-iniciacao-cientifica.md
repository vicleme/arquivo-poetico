# Ideia: Iniciação Científica (rimas e escansão automáticas, autoria provável e semelhança entre autores)

Origem: conversa do Victor de 01/11/2026. Estado: **só anotada**, registrada como **IC** no painel de `plano-central.md`. Nada aqui foi decidido em definitivo: o que está escrito é o rumo conversado, e as perguntas abertas estão no fim. Não há código nem dado novo; o app não mudou.

## Em uma frase

Levar o Arquivo Poético para o lado Ciência de Dados do curso, como projeto de Iniciação Científica, com três frentes: identificar rimas e escansão de forma automática, dizer qual autor cadastrado provavelmente escreveu um texto enviado, e comparar autores para dizer quais se parecem mais entre si.

## Contexto

- O Victor já conversou com uma professora do curso de Ciência de Dados, que pode orientar o projeto.
- Ele quer chamar um segundo professor para entrar junto, **só quando começar a parte de escansão**. Até lá, a frente de escansão fica parada e as outras podem andar.
- O objetivo da IC é dar mais força ao projeto como trabalho acadêmico. As três frentes abaixo são o que torna o Arquivo Poético uma pergunta de pesquisa, e não só um catálogo.

## As três frentes

### 1. Rimas e escansão automáticas

- **Querer:** aprimorar a identificação de rimas e de escansão para que aconteça de forma automatizada. Hoje a aba Sonoridade é manual: o Victor escande, marca as sílabas tônicas e classifica os pares de rima, e o sistema só deriva e conta o que ele marcou (por exemplo, pares Vizinha ou Distante e o rótulo "Rimas mais Próximas" ou "Rimas mais Distantes").
- **O que o app já tem e ajuda:** as escansões e os pares de rima feitos à mão são, ao mesmo tempo, o **gabarito** para medir o automático. Quanto mais escansões manuais, melhor a avaliação. Essa é uma razão para não parar de escandir à mão.
- **Atenção:** a escansão do português tem regras que mudam o número de sílabas (elisão e sinalefa entre palavras, diérese, sinérese, contagem até a última sílaba tônica do verso). Um método automático precisa decidir como tratar cada uma, e é esse o núcleo técnico e de pesquisa da frente. Quais ferramentas e artigos existem para o português fica por pesquisar antes de escolher o caminho.
- **Dependência:** chamar o segundo professor quando esta frente começar.

### 2. Autoria provável

- **Querer:** enviar um texto e o sistema dizer qual dos autores cadastrados provavelmente o teria escrito.
- **Nome da área:** atribuição de autoria, parte da estilometria. Pergunta de pesquisa: com os textos de cada autor no acervo, dá para reconhecer o autor de um texto que o sistema nunca viu?
- **Avaliação:** esconder um texto de cada vez, tentar adivinhar o autor e contar os acertos (validação cruzada), comparando com um palpite simples (sempre o autor com mais textos) para saber se o método acrescenta algo.
- **Atenção, tamanho dos dados:** poema é texto curto, e os pacotes atuais da Biblioteca têm poucos textos por autor (de dois a seis). Para a conta valer, vai ser preciso mais texto por autor. Quantos textos bastam é pergunta em aberto.
- **Atenção, o que o sistema aprende:** se a diferença entre dois autores for de época, de forma (soneto contra verso livre), de língua (tradução) ou da edição, o sistema pode acertar pelo motivo errado. Por isso a avaliação deve controlar isso, por exemplo comparando só textos da mesma forma, e dizer no trabalho o que foi controlado.
- **Saída esperada:** uma lista com os autores mais prováveis e o quanto o sistema confia em cada um, e não um nome só dito com certeza. Texto de autor que não está cadastrado deve poder aparecer como "nenhum se parece".

### 3. Semelhança entre autores

- **Querer:** comparar autores e dizer quais se parecem mais entre si.
- **Relação com a frente 2:** usa a mesma medida de estilo, só que entre autores, e não entre um texto e os autores. Vale desenhar as duas juntas, para a medida ser uma só.
- **Saída esperada:** uma tabela ou um mapa de distâncias entre autores, e a explicação do que pesou (por exemplo, vocabulário, forma, som, temas). Explicar o porquê é o que separa o resultado de uma caixa-preta.
- **Dado que o app já tem de graça:** Temas, etiquetas de Estilo, Tradição, forma e Sonoridade são características já registradas por texto. Dá para comparar autores por elas além de pelo texto bruto, e comparar os dois caminhos é uma boa pergunta de pesquisa.

## O que o app já oferece como base

- Autores e seus textos, com Tema, etiquetas, Período, Corrente, Idioma e Forma por texto.
- Aba Biblioteca, com pacotes de domínio público por autor, para formar um corpus que não expõe o acervo pessoal.
- Exportação em `.csv` e `.json`, para levar os dados a um notebook de análise.
- Sonoridade manual (escansão, rimas), que serve de gabarito para a frente 1.

## Ordem sugerida (a decidir)

1. Montar o **corpus** e o critério de avaliação (qual dado, quantos textos por autor, que controles). Vale para as frentes 2 e 3 e não depende do segundo professor.
2. Frentes 2 e 3 juntas, com a medida de estilo única, num notebook fora do app, para testar antes de pensar em tela.
3. Só depois, o que der certo vira função do app (por exemplo, "De quem se parece este texto?" e "Autores parecidos").
4. Frente 1 quando o segundo professor entrar, usando as escansões manuais como gabarito.

## Fronteira

O Arquivo Poético continua sendo um app que roda no navegador, sem servidor. Parte do trabalho de pesquisa (as contas, os testes) pode viver num notebook ou script à parte, e só o resultado final que valer a pena volta como função do app. Isso é a decisão IC-D2 abaixo.

## Perguntas em aberto

| Código | Pergunta                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| IC-D1  | Quais autores e quantos textos por autor formam o corpus (só a Biblioteca de domínio público, ou também o acervo do Victor como um autor)?  |
| IC-D2  | As contas ficam fora do app (notebook), dentro dele (JavaScript no navegador), ou começam fora e as que valerem entram depois?              |
| IC-D3  | Qual o critério de sucesso da frente 2 (taxa de acerto, comparada com que palpite simples) e que controles de época, forma e língua entram? |
| IC-D4  | A frente 3 compara autores só pelo texto, só pelas etiquetas já registradas, ou pelos dois, comparando os caminhos?                         |
| IC-D5  | Como o projeto entra no formato da IC: título, cronograma e o que a professora pede de entrega? (conversa com a orientadora, do lado dele)  |
| IC-D6  | Em que momento chamar o segundo professor e o que dizer a ele (a frente de escansão, o gabarito manual, o que o app já faz)?                |
| IC-D7  | Autoria provável pode responder "nenhum dos cadastrados"? E o que mostrar quando o texto enviado for muito curto?                           |
| IC-D8  | Pesquisar antes de escolher: como a literatura trata a escansão automática do português e a atribuição de autoria em poesia curta.          |

## Do lado do Victor

- Conversar com a professora orientadora sobre o formato da IC (IC-D5).
- Seguir escandindo à mão alguns poemas variados (soneto, redondilha, verso livre), porque são o gabarito da frente 1.
- Seguir formando a Biblioteca com mais textos por autor, porque é o corpus das frentes 2 e 3.
