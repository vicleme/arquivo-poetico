# Referências de Pessoa pública: Conhecido(a) como, gênero, orientação e cor/raça

Fora de fase, a pedido do Victor (22/10/2026). Objetivo: saber de que tipos de pessoa ele mais tira referências, olhando de que áreas elas vêm (Conhecido(a) como), se são mulheres, homens ou pessoas não binárias, se são pessoas LGBT ou héteros e a cor/raça. Tudo mora em cada entrada de `referenciasExternas` cujo Tipo é "Pessoa pública", e não num cadastro de pessoas públicas, porque a mesma pessoa pode ser outra coisa conforme a época e a entrada registra a versão que o texto cita.

Detalhe do que foi feito, por entrega: `manutencao/status.md` ("Estado atual"). Forma dos dados e porquês: `schema.md` e `decisoes.md` (entram na entrega 4).

## Entregas

| Entrega | Conteúdo                                                                                                                                                                | Status                                 |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1       | Conhecido(a) como: dados e lógica pura (`js/conhecido-como.js`)                                                                                                         | feita                                  |
| 2       | Conhecido(a) como: tela nos modais de Poema e Prosa                                                                                                                     | feita                                  |
| 3       | Gênero, orientação e cor/raça: lógica pura (`js/caracterizacao-pessoa-publica.js`), tela e preenchimento por nome repetido                                              | feita, falta navegador                 |
| 4       | Saídas (busca, Ver, `.md`, `.csv`; o `.json` já leva a entrada inteira), filtro de campos sensíveis nas exportações e docs (`schema.md`, `decisoes.md`, guias `for-ai`) | feita, falta navegador                 |
| 5       | **Estatísticas** (abaixo)                                                                                                                                               | **a implementar, adiada de propósito** |

## Dados (entregas 1 a 3)

- `conhecidoComo`: lista de textos (tags livres, com 10 sugestões de fábrica).
- `genero`: `Mulher`, `Homem` ou `Não-binário` (botões ♀, ♂ e 🜬 NB). Só a identidade de gênero: cis/trans não é registrado aqui (trans também pode ser binário, e a pessoa trans já cai em Mulher ou Homem). Quem for LGBT é marcado em `orientacao`. Não existe símbolo Unicode de não binário; o 🜬 é alquímico e leva "NB" escrito ao lado por causa da fonte.
- `orientacao`: `LGBT` (botão 🏳️‍🌈), `Hétero` (botão ⚤) ou ausente. São três estados, e **ausente é "não informado", nunca "hétero"**.
- `corRaca`: Branca, Preta, Parda, Amarela ou Indígena (a lista de Autores e Pessoas).
- Cada chave só existe quando há valor e só com o Tipo Pessoa pública; trocar o Tipo apaga todas. Sem migração.
- **Regra geral: vazio é "não informado", não "não é".** Vale para os três campos.

## Estatísticas (entrega 5, a implementar)

Adiadas de propósito (decisão do Victor, 22/10/2026): o sistema tem ganhado possibilidades de coleta de dados com as remodelagens, e planejar as Estatísticas depois permite desenhá-las uma vez só, já com tudo o que será coletado. O que foi postulado e ele aprovou como coerente, para entrar quando a entrega chegar:

1. **Contagens por entrada e por texto.** Cada tag, gênero, orientação e cor/raça conta quantas referências (entradas) e em quantos textos distintos, por exemplo "Escritor(a): 14 referências em 9 textos".
2. **O não informado aparece à parte.** Gênero, orientação e cor/raça mostram sempre uma categoria "Sem informação", separada das demais, e os percentuais dizem em cima de quê foram calculados.
3. **Orientação em duas contagens, nunca uma.** "Marcadas como LGBT" e "marcadas como hétero" são contadas cada uma por si, mais "Sem informação". Nenhuma conta é feita como "LGBT contra o resto".
4. **Cruzamentos**, por exemplo Conhecido(a) como por gênero, por cor/raça e por orientação, e gênero por cor/raça. Sempre mostrando o "Sem informação" de cada eixo. **Tela (decidido em 01/11/2026):** Pessoas e Grupos, e não a aba Cruzamentos (Temas), que guarda só matrizes com Tema na linha (`decisoes.md`).
5. A sugestão automática por nome repetido (entrega 3) faz a mesma pessoa tender a ter a mesma caracterização em todas as citações, o que ajuda a contagem por entrada. As tags de Conhecido(a) como continuam valendo só por entrada.

**Decisão F-PP-D1 (Victor, 22/10/2026):** oferecer as duas contagens, por citação (cada entrada, como acima, **padrão**) e por pessoa distinta (nome normalizado), porque citar 5 vezes a mesma autora diz algo diferente de citar 5 autoras.

**A planejar junto, nas remodelagens:** onde a tela mora (dentro de Estatísticas de Pessoas ou em tela própria) e como cruza com os outros dados coletados.

## Decisão F-PP-D2 (Victor, 22/10/2026)

- **Privacidade das exportações: fica como está.** Motivo dele: pessoa pública, informação pública. Não existe filtro de campos sensíveis do Autor: o Autor sai com orientação e cor/raça sem filtro, e o único mecanismo é "Incluir dados ocultados" (Pessoa e Período ocultos). Os campos de Pessoa pública seguiram esse padrão. Como o Victor manda exportações para outras pessoas e para IAs, decidir se a orientação (e a cor/raça) de Pessoa pública passa a sair só com uma caixa própria. Sugestão do Claude: manter como está, porque a pessoa citada é pública e a informação vem do próprio Victor.
