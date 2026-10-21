# Fase 9: Estatísticas de Palavras

Contagem e evolução temporal de palavras e expressões escolhidas, isoladas ou em grupos. Sem dependência (melhor depois da Fase 1).

Movido do `plano-central.md` em 20/10/2026, sem reescrever. O painel guarda só a linha da fase.

- **Ideia (Victor, 01/10/2026).** Trabalhar com as palavras em si: quantas vezes uma palavra apareceu e como foi a aparição ao longo do tempo. Não só as mais frequentes: **as que ele escolher, isoladas ou em grupos** (por exemplo, "eu, mim, me, meu" como uma série só). Serve para rastrear pronomes (eu, você, nós) e a alternância entre eles com o tempo, e para acompanhar conceitos. **Expressões** (sequências de palavras) entram junto.
- **Etapas.** **9a** base de contagem: separar palavras (letras acentuadas, ç, hífen e apóstrofo dentro da palavra), normalizar (F9-D1) e contar por texto, em funções puras e testadas; lê o campo Texto cru, nunca um espelho. **9b** tela: campo para digitar palavra, expressão ou grupo (várias séries no mesmo gráfico), linha ao longo dos anos, alternância entre contagem absoluta e por 1.000 palavras, grupos nomeados salvos entre sessões, N visível (textos e total de palavras). **9c** clique no ponto abre a lista dos textos com aquela palavra (drill-down, mesmo helper dos outros gráficos) e CSV dos dados da série.
- **Respeita** os filtros compartilhados (Corpus, Tipo, Período). Textos sem data aparecem numa nota "N sem data", fora da linha.
- **Fora do escopo (decidido em 01/10/2026).** Detecção de pessoa verbal pela conjugação e do "eu oculto": descartada por ora, porque exigiria um analisador morfológico e erraria em poesia. Quem quiser aproximar pode listar formas verbais num grupo. Como o Victor se refere a si mesmo (garoto, homem, como se caracteriza) **não** se resolve por palavra: é o caso de uso das Marcações (Fase 10).
- **Atenção.** Há textos com grafia fundida de propósito (por exemplo "sėnto" = "sinto" + "sento"); por isso ignorar acento é uma opção, não o padrão. O corpus da Biblioteca tem poucas datas, então a linha do tempo é sobretudo do acervo próprio.

## Decisões em aberto

| Código | Pergunta                                | Sugestão                                                                                                                                                                | Bloqueia |
| ------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F9-D1  | Como normalizar as palavras na contagem | Ignorar caixa por padrão; ignorar acento como opção desligada (há grafias fundidas de propósito). Plural e flexão não são unificados: o Victor lista as formas no grupo | etapa 9a |
| F9-D2  | Medida da série                         | Duas, com botão de alternância: contagem absoluta e por 1.000 palavras (só a absoluta reflete quanto foi escrito em cada período)                                       | etapa 9b |
| F9-D3  | O que entra na contagem                 | Só o campo Texto, sem marcação markdown ou HTML e sem título; incluir o título pode vir depois como opção                                                               | etapa 9a |
| F9-D4  | Como definir expressão e grupo          | Expressão é a sequência exata de palavras, ignorando pontuação e quebra de verso. Grupo é nomeado, salvo entre sessões, e cada grupo vira uma série                     | etapa 9b |
| F9-D5  | Onde mora a tela de Palavras            | Dentro da aba Linguagem (o menu já chega a 8 itens com Etiquetas); aba própria só se a tela crescer                                                                     | etapa 9b |
