# O sorteio de leitura: o que ele lê e como sugerir os campos que usa

Este documento não pede nenhuma tarefa. Explica como a página "Sortear leitura" (em Ferramentas) escolhe e mostra um texto, para que uma IA que receba os textos (ou o cadastro) sugira os campos de que essa página depende do jeito que o app espera. O mapa campo a campo está em `campos-poema-prosa-for-ai-pt-br.md` e o formato de importação em `importar-campos-for-ai-pt-br.md`; este documento trata dos critérios.

---

## O que a página faz

Quem lê pergunta "sobre o que você quer ler hoje?", escolhe (ou não) um convite da Vitrine de leitura, uma extensão e "só os meus preferidos" (o rótulo fala na voz de quem organiza o acervo), e a página sorteia **um texto** do acervo do autor. Ela lê o acervo do navegador em que é aberta e não grava nada nele, a não ser a lista dos últimos sorteados e a posição da ficha do texto.

## Quem pode ser sorteado

O texto só entra no sorteio se **tudo** isto for verdade:

1. `sorteavel` é `true` (a caixa "Pode ser sorteado para leitura"). O autor marca à mão. **Nunca marque por conta própria**: ofereça como sugestão para o autor revisar.
2. `status` não é `descartado` nem `privado`, mesmo marcado. `incompleto`, `completo`, `publicado` e `migrado` entram.
3. O texto tem corpo (`texto` não vazio).
4. `leituraAutonoma` não é `sequencia` nem `conjunto` (ver abaixo).

## Traduções (Elo de tradução)

Um texto e a sua tradução são duas versões da mesma obra, então o sorteio os conta como **um texto só**: a obra tem uma chance, nunca duas. Só agrupa o Elo cuja `relacao` é `Tradução` (Reescrita, Versão, Variação e as demais continuam textos à parte). O vínculo vale nos dois sentidos, mesmo que só um lado tenha cadastrado o Elo, e uma cadeia (A traduzido para B, B para C) é um grupo só. O agrupamento vale depois dos critérios de quem lê, entre as versões que passaram por eles; quando mais de uma passa, o sorteio escolhe uma delas ao acaso. A obra inteira também é evitada quando qualquer versão dela saiu há pouco.

A página mostra, abaixo do título, uma caixa "Este texto tem outra(s) versão(ões) (Elo de tradução)" com o link de cada outra versão ("Tradução de" ou "Traduzido para"). O clique abre aquela versão ali mesmo (conta como lida e entra nos recentes). Só se oferecem versões que poderiam ser sorteadas (marcadas `sorteavel`, com status diferente de `descartado` e `privado`, com corpo, que se leem sozinhas) e, se quem lê excluiu conteúdo sensível, nenhuma com Conteúdo sensível. Quem lê também pode escolher um **idioma de preferência** (guardado no navegador; o campo só aparece quando alguma obra tem tradução sorteável). Ele nunca tira texto do sorteio: só decide qual versão da obra aparece (a de idioma Principal igual; depois a de Secundário igual; sem nenhuma, ao acaso). Lê `idiomas` (ver `campos-poema-prosa-for-ai.md`), então **preencha o idioma do original e o da tradução** para a preferência funcionar. Cada link mostra também o idioma Principal da versão. **Para sugestões:** para agrupar uma tradução, cadastre um Elo de `relacao` `Tradução` entre os dois textos; não marque a tradução como sorteável sem o autor querer que ela seja oferecida como link.

## Leitura autônoma (`leituraAutonoma`)

Diz se o texto faz sentido quando um desconhecido o lê sozinho. É uma pergunta diferente de Elos e Ecos, que só ligam textos entre si.

| Valor           | Significado                                                           | No sorteio                                             |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| `""` ou ausente | lê-se sozinho (o padrão)                                              | pode sair                                              |
| `sequencia`     | só em sequência: depende dos textos que vêm antes ou depois           | nunca sai                                              |
| `conjunto`      | só em conjunto: precisa dos outros textos juntos                      | nunca sai                                              |
| `inicio`        | só como início: é o primeiro texto de uma sequência ou de um conjunto | **pode sair**, com a marca "só o começo" junto ao tipo |

O `inicio` existe para um caso só: apresentar o começo de algo a quem lê, que então sabe que há mais. Incompleto, Díptico e Resposta **não** definem este campo: o autor decide caso a caso, e um texto pode ser parte de um Díptico e ainda assim se ler sozinho.

Como sugerir: só quando o texto, lido a frio, deixa o leitor perdido (responde a um texto que ele não viu, continua uma frase, depende de um refrão posto em outro lugar). Diga de quais textos ele depende. Nunca preencha só porque o texto faz parte de um Livro ou de uma Coletânea: a maioria dos textos ali se lê sozinha. Na dúvida, deixe vazio e explique por quê.

## "Em construção"

Um texto com `status: "incompleto"` continua sendo sorteado, e a página mostra `em construção` junto ao tipo (`Poema · 14 versos · em construção`) antes do texto. O autor pode querer a opinião de quem lê sobre algo inacabado, então o sorteio não o esconde.

## Critérios que quem lê escolhe

Todos opcionais, combinados por E:

- **Convite** ("Sobre o que você quer ler?"): o texto tem algum Tema que pertence a esse convite da Vitrine de leitura (qualquer papel do Tema). O texto não guarda convite, só Temas. Ver `temas-assuntos-for-ai-pt-br.md`.
- **Extensão**: régua fixa, igual para todo acervo. Poema se mede em versos, prosa em palavras. Breve: até 4 versos ou 300 palavras. Curto: de 5 a 14 versos ou de 301 a 1.000 palavras. Médio: de 15 a 40 ou de 1.001 a 7.500. Longo: de 41 a 100 ou de 7.501 a 17.500. Extenso: acima disso.
- **Só os meus preferidos**: `autoclassificacao` de 4 corações ou mais. 0 ("não avaliado") nunca conta.
- **Só os reconhecidos** ("Só os reconhecidos (com prêmio ou menção)"): o texto tem ao menos uma entrada em `reconhecimentos` com `premio` ou `posicao` preenchidos. Prêmio e menção moram no mesmo campo (por exemplo `posicao` "Menção honrosa"); entrada só com ano ou nota não conta. Desmarcada por padrão, e não fica guardada entre visitas. **Para sugestões:** preencha `premio` ou `posicao` em todo reconhecimento, senão o texto não conta.
- **Peso do texto**: quatro caixas (Leve, Neutro ou ambivalente, Pesado e Sem valência), nenhuma marcada por padrão, que valem como OU entre si e E com os outros critérios. O peso de um texto é o `valenciaAjuste` do autor, quando preenchido, e senão a valência calculada pelos Temas do texto (o mesmo índice das Estatísticas: temas desagradáveis menos agradáveis, sobre agradáveis, neutros e desagradáveis; até -1/3 é leve, a partir de +1/3 é pesado; Tema ambivalente fica fora da conta). O texto **sem valência** (nenhum Tema classificado e sem ajuste) só sai quando "Sem valência" é uma das caixas marcadas; marcando só faixas de peso, ele fica de fora. A valência do texto nunca é guardada. Ao sugerir, classifique a valência dos **Temas** (é o que alimenta o peso de vários textos de uma vez); `valenciaAjuste` só quando o texto pesa diferente dos Temas dele. Ver `campos-poema-prosa-for-ai-pt-br.md`.
- **Conteúdo sensível**: uma caixa, marcada por padrão ("Incluir textos com conteúdo sensível"). Desmarcada, o texto com `conteudoSensivel` preenchido não sai e não entra nas contagens; marcada, ele sai com o aviso antes do texto. A escolha fica guardada no navegador de quem lê. O que vale como sensível é só o campo `conteudoSensivel` (texto livre): um texto sem ele é sorteado de qualquer jeito, então preencha esse campo ao sugerir um texto delicado, descrevendo o que há (e não o trecho).

A página evita repetir os últimos sorteados (metade dos textos possíveis, no máximo 10), então nunca fica sem texto para sortear.

## Sigilo do nome do autor: três níveis

O nome civil do autor fica fora da página de quem lê quando **qualquer um** destes pede. Nenhum nível libera o que outro escondeu:

| Nível          | Onde                                                              | Campo                          | Efeito                                                                                                             |
| -------------- | ----------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Autor          | modal do Autor, "Autor sigiloso"                                  | `sigiloso` (Autor)             | vale para todos os textos do autor                                                                                 |
| Nome literário | modal do Autor, "Anonimizar autor" no chip de cada nome literário | `anonimizar` (no item do nome) | vale para os textos assinados com esse nome                                                                        |
| Texto          | modal de Poema/Prosa, "Autor em sigilo"                           | `autorEmSigilo` (texto)        | vale para esse texto, e também esconde os nomes civis dos autores dele nos créditos de "Obras citadas e adaptadas" |

O efeito é sempre o mesmo. Texto assinado com **nome literário** (heterônimo ou pseudônimo): a linha Autoria mostra só esse nome, sem "pseudônimo de X". Texto assinado com o **nome civil**: o autor sai da linha, e a linha some se ninguém sobrar. "Sigiloso" é o que o Autor é; "em sigilo" é o que o autor está naquele texto.

O `.md`, o `.csv`, o `.json` e o Ver são do autor, então mantêm o nome real. Só a página de quem lê aplica o sigilo.

Como sugerir: nunca defina `sigiloso`, `anonimizar` nem `autorEmSigilo` por conta própria. Se um texto é assinado com pseudônimo e nenhum nível está ligado, você pode apontar que a página de quem lê vai mostrar "pseudônimo de" seguido do nome civil, e perguntar se é isso mesmo que se quer.

## O que quem lê vê além do corpo

Depois do texto: os **Comentários ao leitor** do autor e as **Notas** marcadas como públicas; depois o bloco **Paratexto** (Descrição Visual, Anotações Marginais, Anexos, a nota sobre o conjunto de anexos, "Obras citadas e adaptadas" e Reconhecimentos); depois a **ficha** do texto (Localização, Coletâneas, Idioma, Gênero, Status, primeira publicação, Autoria; mais Fonte e Edição quando o texto não é obra própria). Com `conteudoSensivel`, o aviso vem primeiro e o resto espera o "Ler mesmo assim".

**Nunca aparecem**: o vocabulário hiperacionante (ele cita o texto e o entregaria), Elos, Ecos, Referências, Alusão e Menção, Inspiração, Ocultação, as Notas privadas, a data de escrita e qualquer entrada de Intertextualidade marcada como obra pessoal. Notas e comentários são escritos para quem lê: se você os redigir, tenha isso em mente.

## Lista rápida para sugestões

- Quer um texto no sorteio? Sugira `sorteavel`, nunca defina.
- O texto depende de outros? Sugira `leituraAutonoma` com o motivo; o primeiro texto de uma sequência é `inicio`.
- Quer que o peso do texto funcione no sorteio? Classifique a valência dos Temas; sugira `valenciaAjuste` só quando o texto pesa diferente deles.
- Autor com pseudônimo? Pergunte sobre o sigilo antes de supor qualquer coisa.
- Use os nomes de campo e os valores do app exatamente como estão acima.
