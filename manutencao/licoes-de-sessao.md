# Lições de sessão — retomar trabalho neste projeto

> Pra quem (Claude) for retomar trabalho de schema/refactor neste acervo depois de uma sessão cortada. Não é sobre o produto — é sobre como não repetir os mesmos erros de coordenação entre sessões. Guarda também aqui, se acontecer de novo, qualquer episódio novo do mesmo tipo.

**Sempre conferir contra o código de verdade, nunca só contra o recap da sessão anterior.** O recap pode estar atrasado (código foi mais longe do que o resumo registrou) ou adiantado (resumo lista algo como pronto que nunca chegou a ser exportado/anexado) — os dois já aconteceram. Rodar a suíte de teste contra o zip real antes de propor o próximo passo é o jeito mais confiável de descobrir qual dos dois é o caso.

**A cadeia de qualquer feature nova tem ~7 elos: dado → migração → lógica do editor → DOM/modal → submit (forms.js) → busca/coluna → export (md/pdf/visualizar).** Um item "quase pronto" pode ter mais de um elo fraco ao mesmo tempo, em camadas bem diferentes — checar todos, não parar no primeiro que aparecer ok. Casos reais: modal HTML nunca anexado enquanto toda a lógica JS já estava pronta (idioma); `main.js` sem os `window.*` bindings mesmo com o resto da cadeia fechado (Prosa, Autoria); `CAMPOS_ATRIBUTO` sem uma entrada que `PREFIXOS_CANONICOS_POR_CAMPO` já tinha, deixando um prefixo de busca "existir" na UI mas nunca funcionar de fato (idioma).

**Ao mudar o formato de um campo, `grep` o campo antigo em todo `js/*.js`, não só nos arquivos que a sessão lembra de ter tocado.** Arquivos derivados/estatística (`estatisticas.js`, `exportar.js`) são os que mais ficam de fora por não parecerem parte "óbvia" da cadeia de um campo.

**Retomada via recap + arquivos `-editado` avulsos (conversa nova) é mais arriscada que sessão contínua.** O risco não é só "um arquivo da leva atual ficou pra trás" — é também "um arquivo de sessão anterior, que o recap já dava como fechado, nunca foi exportado separadamente". Ao montar arquivos pra reanexar, exportar TODOS os arquivos-fonte tocados desde o último zip completo, não só os da sessão mais recente.

**Quando `.md` de status e `.zip`/`-editado.js` chegam juntos: sempre usar o `.md` solto mais recente como base pra editar, nunca o que vier de dentro do zip.** Já aconteceu de editar por cima do `.md` do zip (mais antigo) e entregar de volta um status regredido, mesmo com o código certo.

**Uma checagem estática (script Node comparando imports vs. exports, ids referenciados vs. ids existentes no HTML, `db.poemas.find` sem o par `db.prosas`) pega gaps mais rápido e mais completo do que reler o recap item por item.** O recap é otimista por natureza; o código é a única fonte de verdade.

**Falha de teste "conhecida e sem relação" pode estar mascarando um segundo problema atrás dela.** Ex.: a falha recorrente de `render-dom.test.js` por falta de `happy-dom` (ambiente sem rede) mascarou por várias sessões um gap real em `dom-real.js` (faltava copiar `requestAnimationFrame`/`cancelAnimationFrame` pro `globalThis`) — só apareceu quando o ambiente teve rede de verdade pela primeira vez. Reavaliar falhas "sempre as mesmas" toda vez que o ambiente de execução mudar, não assumir que a causa é sempre igual.

**Teste pode estar medindo a coisa errada, não o código.** Caso `gruposDiretos`: um teste comparava a linha inteira da tabela contra `/—/` quando a intenção era só checar a célula de Grupos — falhava sempre, com ou sem o recurso, porque outras colunas vazias legitimamente mostram "—". Ao investigar uma falha, checar se o assert está de fato isolando o que o nome do teste diz que testa antes de mexer no código de produção.

**Função exportada sem nenhum import correspondente é sinal de sobra de item que ficou pela metade** — não assumir que é código morto inofensivo sem checar primeiro se é resquício de implementação interrompida.

**O zip do projeto nunca vem com `node_modules/` (decisão deliberada, pra não inflar o zip).** Rodar `npm install` (rede liberada pro registro do npm) ANTES de `node --test`, sempre que for a primeira execução da suíte numa sessão nova — antes de reportar qualquer falha relacionada a `happy-dom` ou outra devDependency ausente. Isso evita diagnosticar como "falha conhecida do ambiente" algo que é só uma dependência não instalada.
