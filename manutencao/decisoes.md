# Decisões de design — Acervo Poético

> Só os porquês que valem lembrar pra não repetir a pergunta. Forma atual dos dados: `schema.md`.

**Hierarquia de papéis de Pessoa** — critério pra escolher entre os quatro principais quando mais de um se aplicaria: _Retratado(a)_ = o poema fala sobre a pessoa/a relação com ela (conteúdo). _Inspirado(a) por_ = um fato/vivência com a pessoa gerou a ideia, sem o poema necessariamente falar dela. _Dedicatário(a)_ = decisão deliberada de oferecer o poema à pessoa, independente de estar ou não no conteúdo. _Mencionado(a)_ = aparece no texto/contexto, de forma secundária. Ordem de "envolvimento com o texto" (do mais ao menos presente): **Retratado(a) > Inspirado(a) por > Dedicatário(a) > Mencionado(a)** — reflete a ordem do `<select>`. Quando uma pessoa seria ao mesmo tempo Retratado(a) e Dedicatário(a) e só um coubesse, prioriza Retratado(a) (mas hoje o campo aceita múltiplos papéis por pessoa, então essa prioridade raramente precisa ser exercida).

**Convenção de gênero em `PAPEIS_PESSOA`** — "forma de papel da pessoa" (Retratado(a), Inspirado(a) por...) em vez de substantivo abstrato (Retrato, Inspiração...). Teste decisivo: a leitura no `.md` exportado (`Nome (Papel)`, ex. `Analu (Retratado(a), Dedicatário(a))`) — substantivo solto vira lista ambígua de temas; a forma de papel lê naturalmente.

**`recorte` de Época** — `"momento"` (só o evento) / `"repercussão"` (o efeito depois) / `null`, em vez da alternativa considerada "pontual"/"estendido" — Victor preferiu a opção neutra.

**Status "Privado" (🔒)** — não é `descartado` (que implica ter sido considerado e rejeitado) nem `incompleto` (que implica intenção futura de terminar/publicar): é texto que nunca teve intenção de publicação, sempre ficou num contexto pessoal/íntimo. No filtro "Todos os status" da Exportação, itens Privados entram normalmente — só saem se o filtro escolhido for "Só privados" ou outro que os exclua explicitamente.

**`gruposDiretos`** — array simples de `grupoId`, sem papel (diferente de `pessoas`), porque não faz sentido um "papel" pra alguém em relação a um grupo citado sem intermediário — é referência ao grupo como um todo, não a um vínculo pessoal específico.

**Escopo de Elos/Referências em Prosa vs. Poema** — Prosa pode referenciar Poema ou outra Prosa; Poema, por ora, só referencia outro Poema (não alterado quando Prosa ganhou o campo).

**Reconhecimentos — migração automática não tenta parsear o texto livre antigo.** Cria entrada em branco (`premio: '', posicao: '', ano: null`) pra todo item que tinha a tag "Premiados", em vez de adivinhar os campos a partir da tag ou de Notas — não dá pra parsear isso com confiança.

**Envios/Reações e Reconhecimentos usam texto livre pra `pessoa`/`meio`/`premio`, não vínculo por id** — datalist como sugestão de digitação, sem forçar cadastro central. Critério: não faz sentido cadastrar formalmente só pra registrar "mandei pro Instagram da Dani".

**`idioma` fora de "Campos Preenchidos"** — como a migração sempre preenche `"pt-BR"`, contar o campo tornaria a métrica sempre-verdadeira, sem sinal real. Mesmo raciocínio já usado pra excluir Localização/Status dessa contagem. Autoria também fica fora pelo mesmo motivo (migração sempre preenche com "Victor Leme"/Autor). Envios e Reconhecimentos **entram** na contagem — são dado genuinamente opcional, não preenchido por migração estrutural.

**Não existe estágio "Ideia"/"Rascunho" separado de "Incompleto"** — decisão tomada ao remover a tag solta "Rascunho" de Sinalizações; não virou campo novo.

**Status editorial (Inédito/Esgotado/Domínio público/Reeditado) fica só em `db.livros`/`db.coletaneas`**, nunca em Poema/Prosa — são conceitos de publicação do livro, não do texto individual.

**Mesclar Pessoa/Época — nome duplicado não mescla automaticamente.** Renomear pra um nome já existente não funde os registros (cada um mantém `id`/vínculos próprios) — porque às vezes o nome igual é de propósito (pessoa homônima em outro grupo; Época com mesmo apelido mas relacionamento diferente). Ao salvar um rename que colide, o formulário oferece três saídas: Mesclar agora / Salvar mesmo assim / Cancelar — nunca força a fusão.
