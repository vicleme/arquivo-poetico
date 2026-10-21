# Plano central do Arquivo Poético

Painel de controle das alterações planejadas. Atualizado em **(20/10/2026, plano central reduzido a índice)**. Estado do código: suíte **4116/0** (rodada pelo Victor em 16/10/2026); ESLint e Prettier limpos. O estado corrente da implementação está em `manutencao/status.md` (seção "Estado atual"); este arquivo guarda só o índice das fases e o que cruza fases. O resumo, as etapas e as decisões em aberto de cada fase moram no arquivo dela.

As fases já terminadas ficam em `planejamento/plano-concluido.md`, uma linha cada, com o detalhe antigo preservado ali.

## Como usar

1. **Este arquivo é o índice, e só dele.** Cada fase tem o seu arquivo em `planejamento/` (coluna "Arquivo"): resumo, etapas e decisões em aberto moram lá, e só lá. Fase pequena ou ainda sem detalhe fica com uma linha na tabela e ganha arquivo quando começar.
2. **Cada sessão** começa lendo este arquivo e o da fase atual, e termina atualizando a linha da fase na tabela e o "Registro" abaixo, além do "Estado atual" do `status.md`.
3. **Uma fase em andamento por vez.** Dentro da fase, dá para parar depois de qualquer etapa: cada etapa termina com a suíte verde e o app utilizável.
4. **Status possíveis:** só anotada, planejada, em andamento, pausada, feita.
5. **Decisões** têm código `F<fase>-D<n>` e ficam na seção "Decisões em aberto" do arquivo da fase. A sugestão está ao lado, mas a decisão é do Victor.
6. Antes de dar uma etapa por pronta, conferir a cadeia inteira (dado, lógica, modal ou tela, salvar, exportar), como em `licoes-de-sessao.md`.
7. **Sem limite de fases no painel (combinado em 20/10/2026).** O limite de 10 fases deixou de existir: com uma linha por fase, o índice cabe numa tela. O número da fase não muda (os ids `F16-D1`, "Fase 2b" aparecem no código e nos testes).
8. **Ao terminar uma fase:** arquivá-la conforme "Como arquivar uma fase" em `plano-concluido.md`, na última entrega da fase: a linha sai da tabela e o arquivo da fase vira detalhe em `plano-concluido.md`.

## Fases ativas

| Fase | Assunto | Depende de | Tamanho | Status | Arquivo |
| 2 | Aposentar o espelho `sinalizacoesTema` | nada (melhor depois da Fase 1) | médio, 7 etapas, invisível | planejada | `fase-02-aposentar-espelho-tema.md` |
| 2b | Aposentar os espelhos `sinalizacoesTerritorialidade` e `idioma` (mesmo molde da Fase 2, para Local e Idioma) | Fase 2 (reaproveita a leitura única) | médio, 6 etapas, invisível | planejada | `fase-02b-aposentar-espelhos-local-idioma.md` |
| 3 | Estatísticas: Completude e exportação PNG/CSV (Bloco 4) | nada | pequeno | planejada | `fase-03-completude-exportacao.md` |
| 4 | Biblioteca: pacotes com dados preenchidos (Fases 1, 2 e 3 de A) | F4-D1 (só a 4c) | grande, em levas | planejada | `fase-04-biblioteca.md` |
| 5 | Estatísticas: filtros de tempo e movimento, faixas e matriz Temas × Movimento | Fase 1 e 4b | médio a grande | planejada | `fase-05-filtros-tempo-movimento.md` |
| 6 | Estatísticas restantes: Extensão, Autores, Linguagem avançada, Forma e som; Cruzamentos por Esfera; Períodos e Eventos | cadastro de Autores, escansão | grande, em levas | planejada | `fase-06-estatisticas-restantes.md` |
| 7 | Fechamento: documentação de Movimento/Escola, `status.md` defasado, teste com rede | nada | pequeno, em pedaços | planejada | `fase-07-fechamento.md` |
| 8 | Estatísticas de Etiquetas (Sinalizações): gráfico por tipo e por cluster (com subclusters) | Fases 1, 16 e 17 (prontas) | a definir | decidida, a criar | `fase-08-estatisticas-etiquetas.md` |
| 9 | Estatísticas de Palavras: contagem e evolução temporal de palavras e expressões escolhidas, isoladas ou em grupos | nada (melhor depois da Fase 1) | médio, 3 etapas | planejada, decisões abertas | `fase-09-estatisticas-palavras.md` |
| 10 | Marcações: marcar trechos dentro do texto com categorias próprias e contá-las nas Estatísticas | nada (a parte de Estatísticas, depois da Fase 1) | grande, 5 etapas | planejada, decisões abertas | `fase-10-marcacoes.md` |
| 14 | Núcleo de texto compartilhado: extrair o miolo comum de Poema e Prosa (formulário, edição, modal e a lista manual de tipos) em módulos por `tabela` | Fases 2 e 2b (mexem nos mesmos gravadores) | médio, 6 etapas, invisível | planejada, decisões abertas | `fase-14-nucleo-de-texto.md` |
| 15 | Músicas: letra como terceiro tipo de texto, entidade própria; Cifra como entidade futura, ligada à Música | Fase 14 e F15-D1 | grande, em levas | só anotada, decisões abertas | `ideia-musica-e-cifra.md` |
| 18 | Faixa de períodos nos eixos de anos: botão (desligado por padrão) que mostra, embaixo dos gráficos com anos no eixo, os Períodos Históricos e Biográficos | Fase 1 (Estatísticas; não depende da 4b nem da 5) | médio, 4 entregas | planejada, decisões abertas (F18-D2 a D8) | `fase-18-faixa-de-periodos.md` |
| 19 | **Livros:** Estrutura no Ver, filtros da aba, autoria com papéis, uso de IA, Colaboradores (cadastro de produção) e download (`.json`, `.md`, `.csv`, `.pdf`, `.docx`) | modal Ver do Livro (feito em 20/10/2026) | grande, 9 etapas | **em andamento** (Ver do Livro entregue) | `fase-19-livros.md` |
| 19b | Filiações do Autor (academias, sociedades, cadeira e período; por exemplo, a ABL) | nada (não bloqueia nem depende da Fase 19) | médio | planejada | `fase-19-livros.md` (seção "Fase 19b") |
| 20 | Vocabulário de fábrica: catálogo inicial de etiquetas (Tradição, Estilo, Tom, Domínio Imagético, Sensibilidade), tag clusters com subclusters, Temas e Assuntos, no modelo `embutido`; e o painel de "nunca usadas" nas Estatísticas (dentro da Fase 8) | Fases 16 e 17 (prontas); o painel de "nunca usadas" depende da Fase 8 | médio, em rodadas de catálogo e 5 etapas | **planejada**, catálogo em revisão (rodada 1 pronta) | `fase-20-vocabulario-de-fabrica.md` |

Fases concluídas (1, 11, 12, 13, 14\* de Eventos, 16 e 17): ver `plano-concluido.md`.

## Pendências soltas de fases concluídas

- **Fase 12:** Postura estética e Programa ainda não saem nas exportações dos textos (`status.md`, "Fechado", entrada de Correntes literárias de 03/10/2026).
- **Fase 11:** vínculo opcional do Personagem reinterpretado com a Referência de origem (F11-D2), sem data.
- **Fases 1, 16 e 17:** o Victor ainda precisa conferir no navegador (roteiros no `status.md`).
- **Fase 8:** precisa ler o `paiId` dos subclusters da Fase 17.

## Sequência recomendada e por quê

As Fases 1, 11, 13, 16 e 17 já foram feitas (ver `plano-concluido.md`); os itens abaixo seguem a numeração antiga da lista, só com o que ainda vale.

1. **Fase 2.** É limpeza sem ganho visível, mas é melhor antes de qualquer fase que acrescente leitores novos de Tema (3, 5 e 6 acrescentam). Pode ser dividida: etapas 0 a 4 numa ou duas sessões (reversíveis) e a etapa 5, que apaga o campo, sozinha e **com backup**.

    **Fase 2b logo depois da 2**, sem renumerar nenhuma fase: é a mesma limpeza para Territorialidade e Idioma, que seguiram o molde do Tema em 30/09/2026. Vem depois porque reaproveita o que a Fase 2 cria (`valorDaCategoria`, a categoria virtual e o teste de paridade) e antes de qualquer fase que crie leitor novo de Local ou Idioma (a 3, se a Completude contar esses campos, e a 6). As duas etapas sem volta (a 5 da Fase 2 e a 2b-4) ficam em sessões separadas, cada uma com backup novo.

2. **Fase 3 (Completude) antes da Biblioteca.** É barata e dá o placar do antes e depois do enriquecimento dos pacotes.

3. **Fase 4 (Biblioteca)** em levas, **na ordem 4b, 4a, 4c** (decidido em 01/10/2026): 4b movimento e período histórico primeiro, porque destrava a Fase 5 e o estudo comparativo entre o acervo do Victor e os movimentos dos autores importados; depois 4a fatos verificáveis; por fim 4c interpretação (tema, tom, pessoas), esta só depois de F4-D1. As letras foram mantidas para não quebrar referências; o que mudou é a ordem de execução. A 4b não depende da 4a: a importação aditiva já resolve os períodos históricos e `movimentosEscolas`. (Bloco 2e, 12/10/2026: o campo do texto virou a lista `periodosHistoricosIds`; a importação aceita os dois formatos.)

4. **Fase 5 (filtros de tempo e movimento)** só rende depois da 4b, porque os textos do Victor são sempre "Literatura Contemporânea" e o movimento só varia nos textos que vêm da Biblioteca ou de fora do acervo. Duas levas: filtros primeiro, faixas e matriz depois.

5. **Fase 6** na ordem Extensão, Autores, Linguagem avançada, Forma e som (do mais pronto ao que mais depende de dados).

6. **Fase 7** não precisa esperar: cada fase que fechar deixa a sua documentação em dia, e o que sobrar entra aqui.

7. **Fase 8** (Etiquetas) pode entrar a qualquer momento depois da Fase 1, que reorganiza o menu e o despachante de Estatísticas (`estatisticas.js`, `ui.js`, `index.html`); de preferência depois da Etapa 2 da Fase 2, para reaproveitar `valorDaCategoria`. Não depende de mais nada, e como usa só os 7 tipos que não são Tema nem Territorialidade, a Fase 2b não a afeta. A ordem numérica não a obriga a esperar pela 7.

8. **Fase 9** (Palavras) pode entrar a qualquer momento depois da Fase 1, que reorganiza o menu e o despachante de Estatísticas. Não depende de Marcações. Lê só o campo Texto, então não é afetada pelas Fases 2 e 2b.

9. **Fase 10** (Marcações) começa pelo dado e pela marcação no texto (10a a 10d), que não dependem de Estatísticas; só a 10e espera a Fase 1. Vem depois da Fase 9 por ser maior e por tocar mais pontos do app (edição de texto, exportação, importação). **Melhor depois da Fase 14**, porque a 10 mexe em edição de texto, exportação e importação, e a 14 deixa esses pontos num lugar só.

10. **Fase 14** (Núcleo de texto compartilhado) entra **depois das Fases 2 e 2b e antes da Fase 10**. Por quê: as Fases 2 e 2b trocam os gravadores de Tema, Local e Idioma dentro de `initFormPoema` e `initFormProsa` (`temasParaSalvar` e parentes, em `forms.js`); refatorar antes obrigaria a mexer duas vezes nos mesmos trechos. A Fase 10 (Marcações) tem de tratar o campo Texto em edição, exportação e importação, e fica bem mais barata com um só lugar para isso. A Fase 15 (Músicas) seria o terceiro texto copiado à mão sem a 14. As Fases 1, 3, 4, 5, 6, 8 e 9 não mexem nesses formulários (são Estatísticas, Biblioteca e leitura), então não esperam por ela. Se o Victor quiser a Música antes das Fases 2 e 2b, a 14 pode vir antes delas, mas então as etapas de gravação das Fases 2 e 2b passam a ser feitas já sobre o código novo (ver F14-D1).

11. **Fase 15** (Músicas) vem **depois da Fase 14**. Está só anotada em `ideia-musica-e-cifra.md`, com decisões abertas (F15-D1 a F15-D8). A Cifra não entra nela: fica para fase própria depois, como entidade ligada à Música.

12. **Fase 18** (faixa de períodos nos eixos de anos) pode entrar **a qualquer momento depois da Fase 1**: só lê os cadastros de período e os gráficos de anos que já existem, e não cria dado novo. Não espera pela 4b nem pela 5. A Leva 2 da Fase 5 (faixas sombreadas) desenha períodos sobre o mesmo eixo de anos, então as duas **dividem o cálculo de quais períodos cobrem quais anos** (entrega 1 da 18); quem vier primeiro cria esse módulo e a outra o reaproveita.

**Fase 19 (Livros)** não depende de nenhuma outra fase: não mexe em Estatísticas, nos gravadores de Tema, Local e Idioma, nem no núcleo de texto, e a Fase 14 (Núcleo) não toca nos formulários de Livro. Está **em andamento** desde o modal Ver do Livro (20/10/2026). A ordem dela frente às demais é do Victor. Dentro da fase, a ordem é a do `fase-19-livros.md`: confirmação e Estrutura no Ver, filtros, Autoria, Uso de IA, Colaboradores, download e documentação. A **Fase 19b** (filiações do Autor) vem em fase própria e não bloqueia nem depende dela.

**Trilha do Victor, em paralelo e sem código:** ver a seção "Do lado do Victor".

## Resumo e decisões de cada fase

O resumo, as etapas e as decisões em aberto de cada fase moram no arquivo dela (coluna "Arquivo" da tabela). A Fase 15 (Músicas) mora em `ideia-musica-e-cifra.md`, e as Fases 19, 19b e 20 já tinham arquivo próprio. As decisões das fases concluídas (Fases 1, 11, 13, 16 e 17) estão em `plano-concluido.md`.

## Do lado do Victor (sem código)

- Nenhuma resposta pendente bloqueia as Fases 1, 2 e 8: já têm o desenho decidido.
- Responder F2b-D1 a F2b-D3 antes de começar a Fase 2b (não bloqueiam a Fase 2).
- Pensar, sem pressa, no desenho dedicado de **Etiquetas/Sinalizações** nas Estatísticas (fase futura, a criar).
- Tema, e depois tom, nos livros ainda vazios (só o Vol. 1 está bem coberto).
- **Orientação em Pessoas:** Victor já preencheu as pessoas que conhece (12/10/2026). A Completude já pode medir a cobertura, e as Estatísticas da orientação deixam de esperar por ela.
- Passar os links de fonte dos 45 textos sem link, começando por Renée Vivien e Virginia Woolf.
- Responder F4-D1.
- Responder F9-D1 a F9-D5 antes da Fase 9 e F10-D1 a F10-D3 antes da Fase 10 (nenhuma bloqueia as Fases 1, 2 e 8). F8-D1 (nome Etiquetas) não bloqueia nada.
- Responder F14-D1 a F14-D3 antes da Fase 14 e F15-D1 (e as demais, em `ideia-musica-e-cifra.md`) antes da Fase 15. Nenhuma bloqueia as outras fases.
- Pensar, sem pressa, se quer letras do próprio acervo musical dele, de outros artistas ou de domínio público (F15-D1). Se houver letras de domínio público, a coleta vem de fontes abertas, como a Wikisource, com a morte do autor conferida caso a caso.
- Conferir no navegador o que a suíte não vê: aba Local e idioma no modo escuro e no celular; painel Períodos e movimentos (Poemas e Prosas); modal de Prosa (checkbox "Não se aplica" e sugestão de datas); Biblioteca com os 11 pacotes; roteiros completos no `status.md` (seções de roteiros).
- Conferir no navegador o "Esvaziar o acervo", que agora apaga de verdade (roteiro no `status.md`): baixar um backup novo antes, testar primeiro só Preferências, depois Pré-prontos, por último Dados, e testar com duas abas abertas.
- Mandar **backup novo** quando importar os outros pacotes ou etiquetar mais, para medir a cobertura de novo.

- Conferir as **escolhas do Claude** do Ver do Livro em `decisoes.md` ("Modal Ver do Livro", (a) a (i)) e responder F19-D12 a F19-D16 antes das etapas 5, 6 e 2 da Fase 19.

## Pontos de atenção que cruzam fases

- **Tema, Local e Idioma pela fonte da verdade, nunca pelo espelho.** Todo código novo (Fases 1, 3, 5 e 6) lê Tema por `temas` e papel, Local por `territorialidade` e `localEscrita` (ids) e Idioma por `idiomas`. Os espelhos `sinalizacoesTema`, `sinalizacoesTerritorialidade` e `idioma` não ganham leitor novo. Assim as Fases 2 e 2b só encolhem.
- **Etapas sem volta.** A Etapa 5 da Fase 2 e a 2b-4 apagam campos do dado. Uma por sessão, cada uma com backup novo exportado antes: o Desfazer não cobre.
- **Corpus.** Todo filtro e gráfico novo precisa se comportar bem nos dois corpora: o acervo do Victor tem datas e sinalizações mas um só movimento; a Biblioteca tem (potencialmente) movimento e quase nenhuma data.
- **Grupo e repique.** Somas sobre Grupos contam a pessoa de novo no grupo pai (`cadeiaAncestraisGrupo`); qualquer total novo precisa disso em conta.
- **Marcações dependem do campo Texto.** Depois da Fase 10, toda rotina que reescreve o Texto (Localizar e Substituir, Versões Alternativas, edição em massa, importação) precisa tratar as marcações do texto.
- **Palavras leem o Texto cru.** A Fase 9 não usa espelho nem campo derivado.
- **Handler inline exige `window.x`.** Botão novo, rodar `tests/wiring-onclick.test.js`.
- **Listas manuais por tipo viram bug.** Quando um tipo novo precisa ser lembrado em uma lista escrita à mão (como `idFields` em `prepararNovo`, que faltava o `tema`), esquecer é questão de tempo. Preferir derivar do DOM ou de um registro único. A Fase 14 faz isso para os tipos de texto.
- **Tipo novo de texto passa pela cadeia inteira.** `'poemas'` e `'prosas'` aparecem em mais de 160 pontos de `js/`; ao criar a Música, percorrer o checklist da 14-0 (dado, lista, modal, salvar, busca, exportação, importação, Estatísticas, docs).
- **Sem travessão** em texto de interface, exportação e ajuda; **commits em inglês**.
- **Nomes de arquivos novos** em minúsculas e sem acento.

## Registro

O histórico completo (30/09/2026 a 20/10/2026) está em `plano-concluido.md`, seção "Registro completo". Aqui ficam só as entradas mais recentes.

| Data                                          | O que mudou                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (17/10/2026, Fase 17)                         | **Fase 17 (tag clusters) implementada** em três entregas (núcleo e dados, aba e seletores, exportação e documentação). A pedido do Victor, a Fase 17 passou a vir **antes** da Fase 8 e a F17-D3 foi ampliada: Relação e Sensibilidade também aceitam cluster (seis categorias; Outros segue de fora). O gráfico por cluster nas Estatísticas é da Fase 8. Falta o Victor conferir no navegador.                                                                                                                                                                                                                                                                             |
| (19/10/2026, Fase 18)                         | Criada a **Fase 18** (faixa de períodos nos eixos de anos), só planejamento, a partir de ideia do Victor. F18-D1 decidida (botão, desligado por padrão); F18-D2 a D8 abertas, com sugestão. Cruzamento registrado com a Leva 2 da Fase 5, que divide com ela o cálculo de quais períodos cobrem quais anos. Nenhum código mudou.                                                                                                                                                                                                                                                                                                                                             |
| (20/10/2026, Tag clusters)                    | **Fora de fase, a pedido do Victor:** a aba Tag clusters baixa em `.md`, `.png` e `.pdf`, no cadastro inteiro, no que a tela mostra ou só nos cartões selecionados (cinco entregas, concluído). Detalhe e escolhas a confirmar em `manutencao/decisoes.md`. Não muda nenhuma fase nem a ordem.                                                                                                                                                                                                                                                                                                                                                                               |
| (20/10/2026, arrumação do painel e Fase 19)   | **Documentação reorganizada, sem código.** `plano-concluido.md` criado: as Fases 1, 11, 12, 13, 14\* (Eventos), 16 e 17 viraram uma linha cada, com o detalhe antigo preservado lá. O painel ficou só com as fases abertas; as decisões das fases concluídas e o Registro antigo foram para o arquivo. Aberta a **Fase 19 (Livros)** em `fase-19-livros.md`, com nove etapas e as decisões da conversa (Autoria com papéis, Colaboradores, Uso de IA, download), e a **Fase 19b** (filiações do Autor, por exemplo a ABL). Limite combinado: 10 fases ativas no painel; hoje são 15, a decidir. O Estado atual do `status.md` passou a guardar só as entradas mais recentes. |
| (20/10/2026, Fase 20)                         | **Criada a Fase 20 (Vocabulário de fábrica)**, só planejamento, a pedido do Victor: catálogo inicial de etiquetas, tag clusters com subclusters, Temas e Assuntos no modelo `embutido`, e painel de "nunca usadas" dentro da Fase 8. Decididas F20-D1 a F20-D8; abertas F20-D9 a F20-D14. Rodada 1 do catálogo (Sensibilidade e Tom) em rascunho. Nenhum código mudou.                                                                                                                                                                                                                                                                                                       |
| (20/10/2026, plano central reduzido a índice) | **Documentação reorganizada, sem código.** O resumo, as etapas e as decisões em aberto de cada fase saíram do central para o arquivo da fase (criados: 2b, 3, 4, 5, 6, 7, 8, 9, 10, 14 e 18; Fases 2 e 15 receberam o resumo que estava aqui). O limite de 10 fases deixou de valer: o central é só a tabela de uma linha por fase, a sequência, os pontos que cruzam fases, o lado do Victor e o Registro. Nenhum texto foi reescrito, só movido.                                                                                                                                                                                                                           |
