# Fase 11: Personagens

Origem: conversa do Victor de 03/10/2026. Estado: **concluída, etapas 1, 1b, 2, 3a, 3b, 4a, 4a2, 4b, 5, 6, 7 e 8 feitas (03 a 06/10/2026)**; resta só o item "Depois, sem data". Todas as decisões estão respondidas (F11-D1 a F11-D8, em `plano-central.md` e `manutencao/decisoes.md`). Painel geral: `plano-central.md`. Schema: `manutencao/schema.md` (`db.personagens`).

## Em uma frase

Um cadastro central de Personagem (o que o autor criou ou reinterpretou), ligado aos textos com papéis em lista e centralidade, que depois ancora o Eco sem nunca gerá-lo sozinho.

## Desenho fechado

- **Cadastro:** `{ id, nome, origem, notas, genero, orientacao, corRaca, nascimento, obito, caracteristicas }`. `origem` é `Criado`, `Reinterpretado` ou vazio. Nome repetido é permitido; comparação por `chaveTema`.
- **Característica é do personagem; relação é do texto ou do livro** (pedido de 03/10/2026). `caracteristicas` (tags de Personalidade, Valores e crenças, Desejos, Medos, Traços físicos, Arquétipos e Backstory, mais a nota do passado) e a identidade (gênero, orientação, cor/raça) existem para comparar, no futuro, como o gênero de quem escreve muda a visão de gênero na escrita. Ver `schema.md`.
- **Relação com a obra, em dois níveis** (etapa 3, desenho aprovado): papel narrativo, arco, trope e função temática, todos em tags. No **texto**, dentro do vínculo `{ personagemId, papeis, centralidade }`. No **livro** (coletâneas contam), em `participacoes: [{ livroId, papelNarrativo, arco, tropes, funcaoTematica }]` no cadastro do Personagem. A Centralidade segue como escala simples; o papel narrativo cobre o resto (antagonista, mentor, confidente).
- **No texto:** `personagens: [{ personagemId, papeis, centralidade }]`, um vínculo por personagem.
    - `papeis` (lista, na ordem de presença): Voz, Interlocutor, Aparição, Menção, Alusão.
    - `centralidade`: Protagonista, Secundário ou Indefinido (vazio). Não se aplica a quem só tem Menção e/ou Alusão; o campo fica desabilitado no modal e conta como "não se aplica" nas Estatísticas.
- **Sem espelho** de nomes (diferente de Tema, Local e Idioma), então a Fase 2 e a 2b não a afetam.
- **Eco:** presença em dois textos não cria Eco. O Personagem só pode ancorá-lo (etapa 4).

## Etapas

| Etapa | O que entra                                                                                                                                                                                                                                                                                                                                                                                          | Estado                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1     | Dado, migração, exclusão com Desfazer, exportação e Importação Aditiva (`js/personagens.js`, `db.js`, `exportar.js`, `importar-aditivo.js`)                                                                                                                                                                                                                                                          | feita, 16 testes              |
| 1b    | Identidade (gênero, orientação, cor/raça), nascimento e óbito (ano), características em tags com Backstory em tag e nota; idade calculada; exportação e Importação Aditiva                                                                                                                                                                                                                           | feita, 10 testes              |
| 2     | Aba Personagens no grupo Cadastros (lista com busca e filtros de origem e de uso, cartão, modal com os campos da 1b e tags com autocomplete, exclusão com Desfazer, "Ver textos" pelo prefixo `personagem:` que já nasce na busca) (`js/ui-personagens.js`, `modais/modal-personagem.html`)                                                                                                          | feita, 16 testes              |
| 3a    | Participação por livro: seção no **modal do Personagem** (nunca no modal do Livro) com `participacoes: [{ livroId, papelNarrativo, arco, tropes, funcaoTematica }]` em tags; limpar ao excluir o livro; exportação e Importação Aditiva pelo título do livro                                                                                                                                         | feita, 14 testes              |
| 3b    | Grupo "Personagens" nos modais de Poema e Prosa (papéis em lista, centralidade e os mesmos quatro campos de relação, em tags); remove o `personagensParaSalvar` provisório de `forms.js` (`js/grupo-personagens.js`)                                                                                                                                                                                 | feita, 15 testes              |
| 4a    | Âncora do Eco (lista de `{ especie, id }`, uma espécie por Eco, só quem está nos dois textos) e tipo "Pessoa em comum"; escolha ao remover (manter com aviso x remover a âncora); cascata na exclusão com Desfazer e na mesclagem; rótulo, busca, `.md`, `.csv`, Visualização, JSON e Importação Aditiva (`js/ancora-eco.js`, `js/ancora-eco-ui.js`)                                                 | feita, 42 testes              |
| 4a2   | Importação Aditiva remapeia o alvo de Elos e Ecos (`id` do texto-alvo): mapa id de origem → id novo, segunda passada depois que todo o lote tem id, alvo fora do lote casa por título ou é solto, duplicata casada aponta para o texto existente; a exportação leva `alvoTitulo` (`js/alvos-conceitos.js`, `js/importar-aditivo.js`, `js/exportar.js`); aviso na prévia e Eco sem alvo solto inteiro | feita (04/10/2026)            |
| 4b    | Sugestão de Ecos faltantes sob demanda (F11-D7), a partir de uma pessoa ou personagem; propõe a direção pelas datas e pergunta quando faltar; ordenação por força do papel 15 pares por vez e "Ignorar" por figura (`js/sugestao-ecos.js`, `js/ui-sugestao-ecos.js`)                                                                                                                                 | feita (05/10/2026), 38 testes |
| 5     | Busca por papel (`personagemvoz:`, `personageminterlocutor:`, `personagemaparicao:`, `personagemmencao:`, `personagemalusao:`) e por centralidade (`personagemprotagonista:`, `personagemsecundario:`, `personagemsemcentralidade:`), todos com nome ou `*`; `personagem:` segue achando em qualquer papel                                                                                           | feita, 14 testes              |
| 6     | Coluna Personagens (chip com iniciais dos papéis e ★/☆), linha "Personagens" no `.md` e na Visualização, 8 colunas por papel e centralidade no `.csv`, "Qtd. Personagens"                                                                                                                                                                                                                            | feita, 10 testes              |
| 7     | Estatísticas: personagens por texto, por papel e centralidade, quais sustentam mais Ecos; Personagem × Tema na aba Cruzamentos (depende da Fase 1)                                                                                                                                                                                                                                                   | feita (06/10/2026), 30 testes |
| 8     | Docs `for-ai`: `personagens-for-ai.md` e `-pt-br.md` (novos); `campos-poema-prosa-for-ai` (Ecos com `ancoras`, `alvoTitulo` e "Pessoa em comum"; Personagens resumido) e `pessoas-papeis-for-ai` (ponteiro, com a diferença de ordem dos papéis); READMEs                                                                                                                                            | feita (06/10/2026)            |

Depois, sem data: vínculo opcional do Personagem reinterpretado com a Referência de origem.

## Cuidados de cadeia (de `licoes-de-sessao.md`)

- O salvar dos modais de Poema e Prosa **substitui o texto inteiro**. Todo campo novo precisa ser carregado no submit, senão editar qualquer coisa o apaga. A etapa 1 já faz isso de forma provisória.
- Fusão de Pessoas e outras rotinas que clonam ou reescrevem textos precisam tratar `personagens` quando a etapa 3 existir.
- Handler inline (`onclick`) exige `window.x`; rodar `tests/wiring-onclick.test.js` a cada botão novo. O happy-dom não executa `onclick` inline, então testes de clique conferem o atributo e chamam a função.
- Sem travessão em texto de interface, exportação e ajuda; commits em inglês.

## Onde cada coisa é editada (decisão de 04/10/2026)

A ficha de relação **por livro** (papel narrativo, arco, trope, função temática) é do Personagem, então é editada no **modal do Personagem**, numa seção que lista os livros em que ele participa. O modal de Livro não ganha nada. A ficha **por texto** vive no vínculo do poema ou da prosa e é editada no modal do próprio texto (etapa 3b). Receio do Victor: que a análise por livro fosse parar no modal de Livro, onde o foco é o livro e não a personagem.
