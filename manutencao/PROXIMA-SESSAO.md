# Próxima sessão: Arquivo Poético (estado em 07/10/2026, após a Fase 13 etapa 13c (apagar efetivo); antes, o Backup completo com arquivo de extras e a etapa 13b (modal e botão de esvaziar); antes, a etapa 13a (lógica pura); antes, a etapa 13-0 (inventário); antes, em 06/10/2026, após a etapa 8 (docs `for-ai` de Personagem), que encerra a Fase 11; antes, a etapa 7 (Estatísticas de Personagens); antes, em 05/10/2026, após a etapa 6 (coluna, `.md`, `.csv` e Visualização de Personagem); antes, a etapa 5 (busca por papel e centralidade); antes, a etapa 4b (sugestão de Ecos faltantes); antes, em 04/10/2026, a etapa 4a2 (alvo de Elos e Ecos na importação) e os títulos das abas; antes, Personagens etapa 4a; antes, em 30/09/2026, após Estatísticas de Local e Idioma, colunas, `.md`, `.csv` e Visualização de Local e Idioma, busca de Local e Idioma, Idioma em lista, Locais etapa 3 e a faixa Voltar/Limpar filtro)

Leia este arquivo, depois `manutencao/status.md` (as primeiras entradas: Estatísticas de Local e Idioma, colunas/md/csv/Visualização de Local e Idioma, busca de Local e Idioma, Idioma em lista, Locais etapa 3, faixa Voltar, Locais etapa 2 e etapa 1), `decisoes.md` (última seção, "Local: cadastro hierárquico com vários pais"), `schema.md` (última seção, `db.locais`) e `licoes-de-sessao.md`. O contexto da sessão anterior (Temas e Assuntos) está mais abaixo, sem mudança.

## Fontes dos Períodos Históricos: pronto no código (14/10/2026)

Detalhes em `status.md`, `decisoes.md` e `schema.md` (seção "Fontes do Período Histórico"). **Conferir no navegador:** Cadastros › Períodos históricos › editar o Renascimento e ver a seção Fontes preenchida (4 linhas, em uma coluna só); adicionar, remover, salvar e reabrir; período novo sem fontes; Ver com a seção Fontes; cartão com "N fontes"; mesclar dois períodos; modo escuro e celular. **Para o Victor:** conferir títulos, anos e traduções do catálogo (`CATALOGO_FONTES_PERIODOS`), e as datas das notas (Semana de 22: noites de 13, 15 e 17 de fevereiro). **Arquitetura:** a lista editável é a fábrica `criarListaDeFontes` (`fontes-corrente-ui.js`); um terceiro tipo de cadastro com fontes só precisa de ids, de um nome de função de remover no `window` e de um catálogo.

## Fontes das Correntes literárias: pronto no código (13/10/2026)

Detalhes em `status.md`, `decisoes.md` e `schema.md` (última seção de Corrente). **Conferir no navegador:** Cadastros › Correntes literárias › editar o Barroco e ver o grupo Fontes aberto com 4 linhas; adicionar, remover, salvar e reabrir; corrente nova sem fontes (grupo fechado); Ver com a seção Fontes; cartão com "N fontes"; modo escuro e celular. **Para o Victor:** conferir títulos e anos do catálogo (`CATALOGO_FONTES`); decidir se Período Histórico ganha o mesmo campo.

## Bloco 3 (Período Biográfico: Esfera, Categoria, Pessoas e Relações): código pronto (13/10/2026)

Plano em `plano-bloco-3-periodo-biografico.md`. **Falta conferir no navegador:** tudo foi testado só em happy-dom. Modelo e decisões em `schema.md` e `decisoes.md` (últimas seções).

- **O que existe:** `js/periodo-biografico-campos.js` (lógica pura), `js/periodo-biografico-ui.js` (campos do modal), `js/periodo-biografico-opcoes-ui.js` e `modais/modal-opcoes-periodo-biografico.html` (modal "Esferas e vínculos", com o botão Papéis em cada vínculo), `modais/modal-epoca.html` (Esfera, Categoria, Pessoas envolvidas, Relações), filtros e "N de M" em `render-listas.js`, prefixos de busca `esfera:`, `categoria:`, `vinculo:` e `pessoaperiodo:`, Esfera e Categoria em CSV, MD, exportação e importação aditiva. Migração em `db.js` (load e `importarDB`); chave `db.opcoesPeriodoBiografico` (inventário e esvaziar: 30 chaves).
- **Relações (mudança de 13/10):** o vínculo deixou de morar dentro da pessoa. Agora `relacoes: [{ de, para, vinculo }]`, com o autor ou uma pessoa em cada ponta. Vínculos orientados ("Responsável por" e "Filho ou filha de") têm lado oposto; o rótulo usa o gênero da pessoa (só Mulher e Homem escolhem forma, o resto usa o neutro). O cartão mostra frases ("Elisa é mãe de Ana"). A migração do formato anterior é automática.
- **Testes:** `periodo-biografico-campos` (48), `-dom`, `-exportacao`, `-form-dom` e `-backup`. eslint e prettier limpos nos arquivos tocados.
- **Decisões minhas, para o Victor confirmar:** gênero fora de Mulher e Homem usa o rótulo neutro; relação com pessoa oculta some inteira (não só o nome); `vinculo:` na busca acha os dois lados do vínculo; no filtro, os dois lados são um item só ("Responsável por / Filho ou filha de"); esfera, categoria e vínculo só entram na busca com prefixo; `pessoaperiodo:` (porque `pessoa:` é a pessoa do texto); pessoas e relações não viajam em MD, CSV, JSON seletivo nem importação aditiva, mas viajam no backup completo; "Contexto do relacionamento" só aparece no cartão se não há pessoa ligada; a importação aditiva cria o período sem `autorId` (já era assim).
- **Conferir no navegador:** abrir um período, adicionar pessoas e relações (autor com pessoa, e pessoa com pessoa), ver a frase de prévia mudar com o gênero e com o lado do vínculo; cartão e filtros da aba; "Esferas e vínculos" (adicionar, renomear com junção, Papéis, apagar só o que ninguém usa); ocultar uma pessoa e ver a relação sumir; busca pelos prefixos; backup e restauração; modo escuro e celular; abrir um período salvo antes da mudança e ver o vínculo antigo como relação com o autor.
- **Botão Ver: pronto (12/10/2026).** `js/visualizar-periodo-biografico.js`, `modais/modal-visualizar-periodo-biografico.html`, ligação em `main.js` e botão no cartão (`render-listas.js`); teste `tests/periodo-biografico-ver.test.js`. Mostra autor, intervalo, esfera, categoria, pessoas e relações por extenso, texto antigo (só sem pessoa ligada), notas e textos ligados. Pessoa oculta e relação com ela não aparecem. **Conferir no navegador:** o olho no cartão, o modal (claro, escuro, celular), o botão Editar do modal e um período com pessoa oculta.
- **Mostrar ocultas: pronto (12/10/2026).** Botão no modal do período (ao lado de Pessoas envolvidas) e no rodapé da Visualização; só aparece se há pessoa oculta no cadastro. Vale só com a janela aberta, volta a esconder a cada abertura, nunca é guardado e não muda o flag da pessoa. Ligado, mostra a pessoa como "Nome (oculta)", as relações com ela e a oferece no seletor. Código: `periodo-biografico-ui.js`, `visualizar-periodo-biografico.js`, `periodo-biografico-campos.js` (opção `incluirOcultas`), os dois modais; teste `tests/periodo-biografico-ocultas.test.js`. **Conferir no navegador:** ligar e desligar nos dois modais, reabrir (volta escondido), salvar com ocultas ligadas e ver que nada some do período.
- **Edição em massa na aba: pronta (12/10/2026).** Caixa de marcar em cada cartão (shift-click marca o intervalo na ordem da tela), "Selecionar todos os que aparecem" e barra com Ação (Acrescentar ou Remover), Campo (Esfera, Categoria, Pessoa envolvida, Relação), Aplicar, Mostrar ocultas, Inverter e Limpar seleção. Só acrescentar e remover; acrescentar não duplica e remover ignora quem não tem; o aviso diz quantos mudaram e quantos já tinham (ou não tinham). Relação: cada ponta é uma pessoa ou "Autor do período"; a mesma relação dita do outro lado ("mãe de" e "filha de") conta como igual; vínculo simétrico vale nas duas ordens. **Seleção com mais de um autor e "Autor do período" numa ponta pede confirmação** (cada período fica com o próprio autor). Acrescentar relação põe as pessoas entre as envolvidas; remover relação não tira ninguém das envolvidas; remover pessoa tira as relações dela. Desfazer devolve os quatro campos de cada período alterado. Esfera e Vínculo novos ficam no vocabulário mesmo após Desfazer. Pessoa oculta fora dos seletores, salvo "Mostrar ocultas" (só com seleção; some ao limpar). Código: `js/periodo-biografico-massa.js` (puro), `js/epocas-acoes.js` (seleção, barra, confirmação), `js/render-listas.js` (`getListaVisivelEpocas`, checkbox no cartão), `js/main.js`, `index.html`; testes `periodo-biografico-massa.test.js` (15) e `periodo-biografico-massa-dom.test.js` (12). **Conferir no navegador:** marcar cartões e ver a barra; cada um dos quatro campos acrescentando e removendo; Desfazer; relação com Autor numa seleção de dois autores (aviso) e de um só (sem aviso); a barra no modo escuro e no celular (quebra de linha); ocultas nos seletores. **Não coberto:** exportação e importação aditiva continuam sem pessoas e relações (como antes).
- **Edição em massa, decidido com o Victor (12/10/2026):** só acrescentar e remover. Na relação em massa cada ponta é uma pessoa do cadastro ou "Autor do período" (o app guarda só `autor`, o autor de cada período).
- **Contexto do relacionamento removido, Exibir ocultas na aba e as duas Revoluções Industriais: prontos (13/10/2026).** Ver `status.md` e `decisoes.md` (última seção). **Conferir no navegador:** abrir um período que tinha texto antigo e ver o trecho no fim das Notas (se não tinha pessoa ligada); ver que o campo sumiu do modal, do cartão e da Visualização; na aba, ligar e desligar "Exibir ocultas" (cartões, filtro de Pessoa, busca por nome, modo escuro, celular); em Períodos Históricos, ver as duas Revoluções novas (e que uma excluída de propósito antes não volta).
- **Natureza Relacional (item 3): código pronto (13/10/2026).** A relação é `{ de, para, natureza, vinculo }`; Natureza e Vínculo são independentes e um dos dois basta. Migração automática (relação sem a chave `natureza` é do formato antigo). Modelo em `schema.md`, decisões e escolhas minhas em `decisoes.md` (última seção). **Conferir no navegador:** abrir períodos antigos e ver Amizade, Familiar, Romântico etc. como Natureza com vínculo vazio (frase "Ana e Carla: Amizade"); criar relação só com Natureza; escolher o vínculo "Namorados" e ver a Natureza Romance preenchida e trocável; "Esferas, naturezas e vínculos" (seção Naturezas, seletor de Natureza sugerida em cada vínculo, apagar só o que ninguém usa); filtro Natureza e busca `natureza:`; edição em massa com Natureza e Desfazer; claro, escuro e celular. **Escolhas minhas a confirmar:** nome "Romance"; vínculos de fábrica novos (Namorados, Ex-namorados, Conversantes, Webnamorados, Situationship, Amigos); frase simétrica sem vínculo.
- **Ver com textos linkados: pronto (13/10/2026), falta conferir no navegador.** Pendência (a) feita: títulos clicáveis, limite de 6, "Ver todos os N" nos dois Ver (`js/lista-textos-periodo.js`). **Conferir:** período com 0, 3 e ~20 textos nos dois Ver; clique abre o texto certo (poema e prosa); "Ver todos" leva à lista filtrada com a faixa Voltar; claro, escuro e celular. **Item 3 (Esfera, Natureza e Vínculo): pronto no código (13/10/2026), falta conferir no navegador.** Ver o bloco logo abaixo. **Item 4 ("Faz parte de" entre Períodos Biográficos): pronto no código (14/10/2026), falta conferir no navegador.** Detalhes em `status.md` (primeira entrada), `decisoes.md` (última seção) e `schema.md` (`pertenceA` em `db.epocas`). **Conferir:** criar um período e outro dentro dele (campo "Faz parte de" no modal, seletor só com períodos do mesmo autor); filho que começa depois do fim do pai e filho que termina antes do começo dele (deve bloquear e dizer qual pai e quais datas); filho que sobrepõe sem estar contido (deve salvar); pai sem datas (cartão e Ver mostram "dos períodos de dentro"); dois pais (o primeiro é o principal; clicar no outro o promove); editar as datas do pai de modo que um filho fique fora (deve bloquear e listar); trocar o autor no modal; na aba, a árvore com recuo, recolher e expandir (por cartão, "Recolher tudo", "Expandir tudo"), filtro ou busca mostrando o pai apagado como contexto, "Selecionar todos" e shift-click com ramos recolhidos, edição em massa; excluir um pai (os filhos sobem, Desfazer devolve) e mesclar; pai oculto (o filho vira de topo e o nome some); Ver com "Faz parte de" e "Períodos dentro"; claro, escuro e celular. **Escolhas minhas a confirmar:** data "c." compara só o ano e acusa; fim em aberto vale como infinito também para o filho; edição em massa de "Faz parte de" ficou de fora; excluir não revalida o intervalo dos filhos que sobem. **Próximo:** item 5 (mais de um autor por período), ainda "a pensar" (ver o plano); só depois o `plano-central.md`.
- **Em aberto, para o Victor decidir (levantado em 13/10/2026):** (a) ~~linkar os textos no modal Ver~~ feito; (b) ~~separar "tipo de vínculo" de "papel"~~ feito (item 3); (c) ~~"faz parte de" entre períodos biográficos~~ feito (item 4, 14/10/2026).
- **Próximos passos combinados com o Victor, em ordem:** (1) ~~botão temporário **Mostrar ocultas**~~ feito em 12/10/2026 (ver acima); (2) ~~**edição em massa na aba**~~ feita em 12/10/2026 (ver o item abaixo); (3) ~~"faz parte de" entre períodos biográficos~~ feito em 14/10/2026 (ver acima); (4) cruzamentos de Estatística por Esfera; (5) ~~remover de vez o "Contexto do relacionamento"~~ feito em 13/10/2026 (ver acima).
- **Limites conhecidos:** no modal, relação com pessoa oculta não aparece e é regravada sem mudança; só a pessoa de cadastro tem gênero (o autor usa o campo `genero` dele, texto livre).

## Fase 1, etapa 1d: totais na matriz de Cruzamentos: pronta (06/10/2026)

Com a 1d, **a Fase 1 está completa no código** (1a, 1b, 1c-0, 1c, 1d). Detalhes em `status.md` e `decisoes.md` (F1-D9).

- **Conferir no navegador (pelo Victor):** Estatísticas › Cruzamentos: em Pessoa × tema, ver a coluna final "Total (soma da linha)" e "Textos com a pessoa", o rodapé "Aparições de pessoas (soma da coluna)" e "Textos com o tema", e o texto de ajuda; em Grupo × tema, ver que **não** há soma da coluna; em Personagem × tema, ver o mesmo da Pessoa; com muitos temas, rolar na horizontal e ver se o rodapé e a coluna final seguem alinhados; modo escuro (borda e negrito do rodapé).
- **Para o Victor decidir (escolhi sozinho, F1-D9):** "Textos com…" conta só textos que têm ao menos um tema e uma linha da matriz (não bate com a barra do gráfico de Temas se houver texto com tema e sem pessoa); Personagens recebeu o mesmo tratamento das Pessoas; em Grupos a coluna "Total (soma da linha)" existe.
- **Depois da Fase 1:** Fase 2 e 2b (`plano-central.md`); nada ali depende da conferência.

## Fase 1, etapa 1c: "Por gênero" em Pessoas: pronta (06/10/2026)

Pedido do Victor ("siga implementando a Fase 1"). Detalhes em `status.md` (primeira entrada) e `decisoes.md` (F1-D8, que lista o que decidi sozinho).

- **Conferir no navegador (pelo Victor):** Estatísticas › Pessoas e Grupos: os três botões "Por pessoa | Por grupo | Por gênero"; o cartão de gênero separado não existe mais; em "Por gênero" ver as barras e que clicar nelas não abre nada; ligar "Considerar cis/trans" e ver as barras "Gênero, Identidade"; em "Por pessoa", abrir "⚧ Gênero ▾", marcar um gênero e combinar com "👥 Grupos"; com cis/trans ligado, ver a seção Identidade no mesmo painel; recarregar a página (modo e botão persistem); modo escuro e celular (o botão e a frase ao lado quebram linha?).
- **Em aberto, para o Victor:** em "Por gênero" o filtro de Grupo vale (decidi eu); a linha do tempo de Pessoa ainda não tem o filtro de gênero (plano: depois, com a 1c estável).
- **Sobra da 1a:** `js/estatisticas-tela-temas-pessoas.js` (módulo antigo) não é importado por ninguém; pode ser apagado.
- **Próximo:** etapa **1d** (soma no fim da coluna e total por linha na matriz de Cruzamentos).

## Backup completo e arquivo de extras: pronto (07/10/2026)

Pedido do Victor (limpar os dados do navegador sem perder preferências e Versões Alternativas), feito antes da 13c. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (última seção).

- **O que existe:** `js/extras-backup.js` (lógica pura), `js/ui-extras-backup.js`, card "Backup completo" no topo da aba Backup e recuperação (Baixar backup completo, Baixar só os extras, Restaurar extras) e os testes `tests/extras-backup.test.js` e `tests/ui-extras-backup.test.js`.
- **Para a 13c e a 13d:** o modal de esvaziar já baixa o arquivo de extras no lugar do `versoes_filtradas_banco.json`. A ajuda (13d) precisa citar o backup completo e a ordem de restauração (Importar JSON, depois Restaurar extras), no FAQ e no passo "Fazer backup do acervo" de "Como faço".
- **Conferir (pelo Victor), antes de limpar o navegador:** baixar o backup completo; abrir uma janela anônima, importar o JSON do acervo e usar "Restaurar extras"; comparar contagens (poemas, prosas, livros, capas) e ver se tema, colunas e Versões Alternativas voltaram.

## Fase 13 (Esvaziar o acervo): concluída (08/10/2026)

As etapas 13-0 a 13d estão prontas e o Victor conferiu o apagar no navegador. Não há próxima etapa desta fase. Detalhes em `status.md` (primeira entrada) e `decisoes.md`.

- **Pontos a lembrar:** os padrões de colunas salvos são **Dados** (não Preferências), por decisão de 08/10/2026 só documentada, no FAQ e na janela. Quem mexer em `save()` ou em um novo ouvinte de saída de página deve conferir a trava `bloquearSalvamento` (ver 13c).
- **Limites conhecidos (13c):** `filtrar.html` e `localizar-substituir.html` não têm o ouvinte de outras abas; navegador sem `BroadcastChannel` não avisa as outras abas.

## Fase 13, etapa 13c: apagar efetivo: pronta (07/10/2026)

Detalhes em `status.md` (primeira entrada) e `decisoes.md` (seção da 13c). **Esta etapa apaga de verdade.**

- **O que existe:** `js/apagar-acervo.js` (`executarEsvaziamento`, `ouvirEsvaziamentoDeOutraAba`, `mostrarAvisoPosEsvaziar`), `limparTodasCapas()` em `capas.js`, a trava `bloquearSalvamento()` em `db.js`, `tests/apagar-acervo.test.js` (24 testes). Ligações em `main.js` (ouvinte de outras abas no carregamento do módulo; aviso pós-recarga no `DOMContentLoaded`).
- **Próximo:** etapa **13d** (Central de Ajuda, README, `manutencao/`: `schema.md` só se algo mudar; nada mudou no formato do acervo).
- **Conferir (pelo Victor), nesta ordem, com um backup NOVO baixado antes:** (1) só Preferências: tema, colunas e itens por página voltam ao padrão, acervo e capas intactos; (2) só Pré-prontos: os 12 períodos, os 22 movimentos e os templates de fábrica somem (menos os que têm texto usando) e não voltam ao recarregar; (3) só Dados: acervo vazio **sem** Assuntos e Temas de exemplo, capas e Versões Alternativas apagadas, pré-prontos de volta ao estado inicial; (4) as três juntas; (5) **duas abas abertas:** esvaziar em uma e ver a outra avisar e recarregar sozinha, sem regravar nada; (6) o aviso de resultado depois da recarga; (7) restaurar pelo backup e pelo arquivo de extras depois de um apagar de Dados.
- **Limites conhecidos:** `filtrar.html` e `localizar-substituir.html` são páginas separadas, sem o ouvinte: se uma estiver aberta em outra aba, salvar uma Versão Alternativa lá depois do apagar traz essa versão de volta. Navegador sem `BroadcastChannel` (anterior a 2022) não avisa as outras abas.

## Fase 13, etapa 13b: modal e botão de esvaziar: pronta (07/10/2026)

Pedido do Victor, com F13-D9 e as interpretações da 13a aprovadas. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (última seção). **Nenhum dado é apagado por esta etapa.**

- **O que existe:** aba **Backup e recuperação** (menu Dados) com os retratos automáticos e o bloco "Zona de risco"; `modais/modal-esvaziar-acervo.html`; `js/ui-esvaziar-acervo.js`; `tests/ui-esvaziar-acervo.test.js` (25 testes). Confirmar baixa o backup com capas, o arquivo das Versões Alternativas (se houver) e tira o retrato forçado; falha em qualquer um interrompe.
- **Ponto de encaixe da 13c:** `confirmarEsvaziarAcervo(deps)` chama `deps.apagar(caixas, resumo)` e espera `{ apagado: true }`. O padrão atual devolve `{ apagado: false }` e a janela avisa que nada foi apagado. A 13c troca esse padrão por: `aplicarEsvaziamento(db, caixas)`, regravar o acervo (`save()`, nunca remover a chave, F13-D9), remover as chaves de `planoArmazenamento(...).localStorageRemover`, limpar o banco de capas (`indexedDBLimpar`) e recarregar a página; decidir o que fazer com outras abas abertas. O retrato (`arquivoPoetico_snapshots`) nunca é limpo.
- **Cuidado da 13c:** é a etapa sem volta fácil. Exportar um backup novo antes de testar à mão, e testar primeiro só Preferências, depois Pré-prontos, por último Dados.
- **Próximo:** etapa **13c** (apagar efetivo e recarga); depois 13d (Central de Ajuda, README, `manutencao/`).
- **Conferir (pelo Victor):** no navegador, a janela no modo escuro e no celular; a trava do botão (palavra errada, sem caixa); os dois downloads seguidos com Dados marcado. Por enquanto nada é apagado de verdade. `npm test` deve mostrar a suíte inteira verde.

## Fase 13, etapa 13a: lógica pura de esvaziar o acervo: pronta (07/10/2026)

Pedido do Victor, com F13-D7 e F13-D8 aprovadas como sugeridas. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (última seção). Nenhum comportamento do app mudou; ainda não há botão.

- **O que existe:** `js/esvaziar-acervo.js` e `tests/esvaziar-acervo.test.js` (37 testes). `resumirEsvaziamento(db, caixas, { capas, versoesFiltradas })` para o modal; `aplicarEsvaziamento(db, caixas)` apaga no `db`; `planoArmazenamento(caixas, Object.keys(localStorage))` lista o que remover fora do `db`; `montarArquivoVersoesFiltradas(texto)` gera o arquivo extra do backup. Caixas são `{ dados, preferencias, preProntos }`.
- **Regra central:** pré-prontos saem pelo campo `embutido` e o nome vai para `*Ocultos`; só Dados zera os ocultos e deixa a migração recolocar os de fábrica. Quem mexer em `migrar*Embutidos` precisa rodar `tests/esvaziar-acervo.test.js`.
- **Para o Victor decidir antes da 13c:** F13-D9 (apagar a chave do acervo faria o app semear Assuntos e Temas de exemplo; sugestão: regravar o `db` vazio). Também conferir as interpretações listadas na última seção de `decisoes.md` (edições em itens de fábrica sobrevivem; excluídos de fábrica voltam quando só Dados é apagado).
- **Próximo:** etapa **13b** (modal e botão na área Dados: caixas, resumo, backup automático com capas mais `versoes_filtradas_banco.json` quando houver versões, retrato forçado, palavra "ESVAZIAR"; `window.x` e `tests/wiring-onclick.test.js`). O apagar efetivo continua sendo a 13c.
- **Conferir (pelo Victor):** nada no navegador; só rodar `npm test` e ver 2968 verdes.

## Fase 13, etapa 13-0: inventário e teste: pronta (07/10/2026)

Pedido do Victor ("pode começar", com F13-D1 a F13-D6 aprovadas). Detalhes em `status.md` (primeira entrada) e `decisoes.md` (última seção). Nenhum comportamento do app mudou.

- **O que existe:** `js/inventario-armazenamento.js` (classificação de toda chave do `localStorage`, dos 2 bancos do IndexedDB e das chaves do `db`) e `tests/inventario-armazenamento.test.js`, que falha se uma chave nova aparecer sem classificação. Chave nova em qualquer fase futura: acrescentar a linha no inventário.
- **Para o Victor decidir antes da 13a:** F13-D7 (as Versões Alternativas ficam fora do JSON de backup; sugestão: tratar como Dados e baixar `versoes_filtradas_banco.json` junto) e F13-D8 (`templatesEstrutura` como terceiro cadastro pré-pronto; sugestão: sim).
- **Próximo:** etapa **13a** (lógica pura em `js/esvaziar-acervo.js`, usando os seletores do inventário). Regra a lembrar: em `periodosHistoricos` e `movimentosEscolas` os de fábrica e os da pessoa moram no mesmo array, separados por `embutido`; apagar pré-prontos precisa registrar nas listas de ocultos, não só filtrar o array.
- **Conferir (pelo Victor):** nada no navegador; só rodar `npm test` e ver 2931 verdes.

## Fase 1, F1-D7 partes 1 e 2: Pessoa no JSON e chave de dados pessoais: prontas (06/10/2026)

A parte 1 (a Pessoa viaja no JSON e na Importação Aditiva) foi conferida no navegador pelo Victor. A parte 2 é a chave "Incluir dados pessoais das Pessoas nos JSON". Detalhes em `status.md` (duas primeiras entradas) e `decisoes.md` (F1-D7).

- **Conferir no navegador (pelo Victor):** na aba Exportação, o checkbox aparece marcado; desmarcar, exportar um texto com Pessoa em JSON (seletivo, seleção, item avulso e tudo flat) e ver o vínculo sem os três campos e o aviso no resultado; recarregar a página e ver que a escolha ficou; religar e ver os campos de volta; o backup completo continua com tudo.
- **Próximo:** etapa **1c** ("Por gênero" em Pessoas). Falta, se quiser, aviso também nas Exportações Frequentes e nos templates (a chave já vale lá).
- **Doc `for-ai` de Pessoas:** já tem a regra "vazio é não documentado"; se a chave estiver desligada os campos simplesmente não existem no arquivo, e o doc pode ganhar uma frase sobre isso.

## Fase 1, etapa 1c-0: identidade e cor/raça na Pessoa: pronta (06/10/2026)

Pedido do Victor ("seguir com a implementação da fase 1"). Detalhes em `status.md` (primeira entrada), `decisoes.md` (F1-D7) e `planejamento/fase-01-estatisticas-temas-pessoas.md`.

- **Conferir no navegador (pelo Victor):** Cadastros › Pessoas › editar uma pessoa; os dois selects "Identidade cis/trans" e "Cor/Raça" (padrão "Não documentado"); salvar, reabrir; a linha pequena no cartão; modo escuro e celular; mesclar duas Pessoas e ver que o destino mantém o que tinha.
- **F1-D7:** respondida em 06/10/2026 (a Pessoa viaja no JSON; ver a entrada acima).
- **Próximo:** etapa **1c** ("Por gênero" em Pessoas: alternância Por pessoa | Por grupo | Por gênero, botão \"Considerar cis/trans\", filtro de gênero em Por pessoa; sai o cartão separado de gênero) e depois a **1d** (soma na matriz).

## Personagens, etapa 8: docs `for-ai`: pronta (06/10/2026), Fase 11 concluída

Pedido do Victor ("terminar a fase de Personagem"). Só documentação; nenhum código mudou. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (F11-D14).

- **O que mudou:** `docs/personagens-for-ai.md` e `-pt-br.md` (novos); `campos-poema-prosa-for-ai` (Ecos com `ancoras`, `alvoTitulo` e "Pessoa em comum", `poemaId` corrigido para `id`, Personagens no resumo); `pessoas-papeis-for-ai` (ponteiro para Personagens); `README.md` e `README.pt-br.md`.
- **Conferir (pelo Victor):** ler `personagens-for-ai-pt-br.md` com o olho de quem vai colar o arquivo numa IA: a regra de que a ordem de `papeis` não indica relevância (decidi sozinho, porque o código sempre reordena); a escolha de **não definir** Voz, Interlocutor e Aparição (o projeto só define Menção e Alusão; se quiser definição, é você quem a dá); a leitura de `centralidade` vazia (indefinida x só Menção/Alusão).
- **Em aberto, herdado:** Personagens entra ou não em Campos Preenchidos (hoje não entra); filtro por papel do Personagem em Personagem × Tema; gráfico de Personagem ao longo do tempo; "Sugerir Ecos" no modal de Visualização e a regra de ocultar par só com Menção/Alusão (etapa 4b).
- **Depois, sem data:** vínculo opcional do Personagem reinterpretado com a Referência de origem (F11-D2). É a única parte da Fase 11 que falta.

## Personagens, etapa 7: Estatísticas: pronta (06/10/2026)

Pedido do Victor ("prosseguir"). A sessão anterior caiu antes de entregar arquivos, então a etapa foi refeita do zip original. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (F11-D13, que lista o que decidi sozinho).

- **O que mudou:** aba **Estatísticas › Personagens** (cinco gráficos) e modo "Temas × personagens" na matriz de Cruzamentos. Código em `js/estatisticas-dados-personagens.js`, `js/estatisticas-tela-personagens.js`, `js/estatisticas-dados.js`, `js/estatisticas-tela-cruzamentos.js`, `js/estatisticas.js`, `js/ui.js`, `index.html`. Teste: `tests/estatisticas-personagens.test.js`.
- **Conferir no navegador (pelo Victor):** menu Estatísticas mostra "Personagens" entre "Pessoas e Grupos" e "Cruzamentos"; os cinco gráficos desenham (Chart.js real, modo escuro, celular); clicar numa barra de Personagem, de papel e de centralidade abre Poemas ou Prosas com a busca e o mesmo número da barra; a barra "Só Menção/Alusão" não abre nada; a linha de contexto dos Ecos diz o total, a soma por âncora e quantos estão sem âncora; "Ocultar" e o mínimo de aparições nos dois gráficos de nomes; em Cruzamentos, escolher "Temas × personagens" e ver a matriz com o painel de colunas de temas.
- **Em aberto:** Personagem × Tema usa o papel de Tema escolhido na aba, e o Personagem conta em qualquer papel (um filtro por papel do Personagem não existe). Não há gráfico de Personagem ao longo do tempo.
- **Próximo:** etapa **8** (docs `for-ai`, que ainda não citam `alvoTitulo`, as âncoras do Eco nem as Estatísticas de Personagem).

## Personagens, etapa 6: coluna, exportações e Visualização: pronta (05/10/2026)

Pedido do Victor. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (F11-D12, que lista o que decidi sozinho).

- **O que mudou:** coluna "Personagens" (Poemas e Prosas), linha no `.md` e na Visualização, 8 colunas no `.csv`, "Qtd. Personagens". Código em `js/celulas-tabela.js`, `js/colunas.js`, `js/personagens.js`, `js/exportar-md.js`, `js/visualizar.js`, `js/exportar-csv.js`, `js/utils.js`. Teste: `tests/personagens-colunas-export.test.js`.
- **Conferir no navegador (pelo Victor):** ligar a coluna em "🧱 Colunas" (Poemas e Prosas) e ver o chip (iniciais, ★/☆, `title`); ordenar; clicar na lupa; abrir a Visualização de um texto com personagem; exportar `.md` e `.csv` e conferir a linha e as colunas; adicionar "Qtd. Personagens" e filtrar `>= 2`.
- **Decisão em aberto:** Personagens entra ou não em Campos Preenchidos (hoje não entra).
- **Próximo:** etapa **7** (Estatísticas; Personagem × Tema espera a aba Cruzamentos da Fase 1) ou a **8** (docs `for-ai`).

## Busca de Personagem por papel e centralidade, etapa 5: pronta (05/10/2026)

Pedido do Victor. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (F11-D11).

- **Como funciona:** `personagemvoz:`, `personageminterlocutor:`, `personagemaparicao:`, `personagemmencao:`, `personagemalusao:`, `personagemprotagonista:`, `personagemsecundario:`, `personagemsemcentralidade:`, cada um com nome ou `*`. "Sem centralidade" é só a ainda não preenchida (Menção/Alusão sozinhas não entram em nenhuma).
- **Código:** `js/personagens.js` (helpers), `js/render-listas.js`, `js/utils.js`, legenda em `index.html`. Teste: `tests/busca-personagem-papel.test.js`.
- **Conferir no navegador (pelo Victor):** na busca de Poemas ou Prosas, digitar `personagemvoz:*`, `personagemsemcentralidade:*` e `-personagemprotagonista:*`; abrir a legenda "Restringir a um campo" e ver as duas linhas novas; conferir que um texto com o personagem só em Menção não aparece em `personagemsemcentralidade:`.
- **Próximo:** etapa **6** (colunas, `.md`, `.csv`, Visualização). A 7 (Estatísticas) segue esperando a aba Cruzamentos da Fase 1.

## Sugestão de Ecos faltantes, etapa 4b: pronta (05/10/2026)

O Victor pediu só "prosseguir" na Fase 11; escolhi a 4b por ser a próxima da ordem F11-D8. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (F11-D10, que lista o que decidi sozinho).

- **Como funciona:** botão "Sugerir Ecos" nos cartões de Pessoa e Personagem (dois textos ou mais) abre um modal com os pares sem Eco entre si, direção pelas datas, força pelo papel, 15 por vez; criar grava o Eco na hora, com âncora, e há Desfazer.
- **Código:** `js/sugestao-ecos.js` (puro), `js/ui-sugestao-ecos.js`, `modais/modal-sugestao-ecos.html`. Testes: `tests/sugestao-ecos.test.js` e `tests/sugestao-ecos-dom.test.js`. Suíte verde (ver `status.md`).
- **Próximo:** etapa **5** (busca por papel e centralidade) ou a **6** (colunas, `.md`, `.csv`, Visualização). A 7 (Estatísticas) segue esperando a aba Cruzamentos da Fase 1 para Personagem × Tema.
- **Ignorar par feito (05/10/2026, pedido dele):** por figura, em `db.ecosIgnorados`, com seção "Ignorados" e "Voltar a sugerir". Conferir no navegador: ignorar, fechar e reabrir (continua ignorado); restaurar; ignorar o mesmo par para a Pessoa e para o Personagem (são independentes).
- **Em aberto, para o Victor decidir:** (b) se a regra "só menção/alusão nos dois lados fica oculto" é a certa; (c) se o botão deve existir também no modal de Visualização. Nada disso foi feito.
- **Conferir no navegador (pelo Victor):** Cadastros › Personagens e Pessoas: o ícone de eco aparece só em quem está em dois textos ou mais; abrir e ver os pares (o texto mais novo na ponta do "ecoa"); par com texto sem data deve vir com aviso âmbar e dois botões iguais; criar um Eco e abrir o poema/prosa mais novo: grupo Intratextualidade › Ecos mostra "Personagem em comum (Nome)" com o texto antigo; Desfazer tira; criar, fechar e reabrir o modal (o par não volta); muitos pares: "Mostrar mais"; caixa de menção/alusão; modo escuro, celular e Esc. **Não vi o visual com estilo** (o Tailwind da CDN não carrega no meu ambiente).

## Importação Aditiva e alvo de Elos e Ecos, etapa 4a2: pronta (04/10/2026)

Pedido do Victor. Detalhes em `status.md` (primeira entrada), `decisoes.md` (F11-D9) e `schema.md` (Ecos). Respostas dele: sem alvo, **solta o Eco inteiro**; o aviso fica **na prévia**.

- **Resolução do alvo:** texto do lote, duplicata casada, título exato único no acervo (`alvoTitulo`, gravado pela exportação em cada Elo e Eco) e, sem nada disso, a entrada é solta. JSON antigo (sem `alvoTitulo`) só resolve dentro do lote ou por duplicata casada.
- **Código:** `js/alvos-conceitos.js` (novo), `js/importar-aditivo.js`, `js/ui-importar-aditivo.js`, `js/exportar.js`, `js/exportar-csv.js`. Testes: `tests/importar-aditivo-alvos.test.js` e `tests/importar-aditivo-alvos-dom.test.js`.
- **Corrigido no caminho:** o `.csv` lia `e.poemaId` nos Elos (o dado grava `id`), então o título do alvo saía vazio; o `schema.md` ainda descrevia o Elo com `poemaId`.
- **Títulos das abas:** o app agora se chama só "Arquivo Poético"; Versões Alternativas e Localizar e Substituir usam hífen no lugar do travessão.
- **Próximo:** etapa **4b** (sugestão de Ecos faltantes sob demanda, F11-D7) ou a **5** (busca por papel e centralidade). Desenho da 4b em "Personagens, etapa 4a" abaixo.
- **Conferir no navegador (pelo Victor):** a aba do navegador dizendo "Arquivo Poético" no app e "Arquivo Poético - ..." nas outras duas (sem travessão); exportar só a Prosa que tem Eco e Elo (individualmente ou numa seleção) e importar num acervo que tem o texto-alvo com o mesmo título: o Eco e o Elo devem ligar nele; importar o mesmo arquivo num acervo sem o alvo: a prévia mostra o bloco âmbar "Ligações que serão soltas" com a contagem e os títulos, e o aviso do resultado diz quantos foram soltos; exportar dois textos que se ecoam e importar juntos: o Eco liga ao id novo; texto com título igual a um existente: trocar a decisão da duplicata (não importar x importar como novo) e ver o aviso da prévia acompanhar; modo escuro e celular (bloco âmbar quebrando linha).
- **Limite conhecido:** a ligação por título não distingue dois textos de mesmo título no acervo (solta, em vez de chutar); os docs `for-ai` ainda não citam `alvoTitulo` nem as âncoras do Eco (etapa 8).

## Personagens, etapa 4a: pronta (04/10/2026)

Pedido do Victor. Detalhes em `status.md` (primeira entrada), `decisoes.md` (F11-D6, "Refinada em 04/10/2026") e `schema.md` (Ecos).

- **Próximo:** a etapa 4a2 está feita (ver a seção acima); falta a etapa 4b (sugestão de Ecos faltantes sob demanda, F11-D7) ou a 5 (busca por papel e centralidade). O desenho da 4b sugerido: botão no cartão da Pessoa ou do Personagem, com a faixa "Voltar"; o Eco é unidirecional (do mais novo para o mais antigo), então a sugestão propõe a direção pelas datas e pergunta quando faltar data; pessoa em 30 textos gera 435 pares, então precisa de ordenação ou limite; nunca como aviso automático.
- **Etapa 7 (Estatísticas):** um Eco com duas âncoras conta uma vez para cada uma, então a soma por âncora passa do total de Ecos (explicar na tela); tratar "Personagem em comum sem âncora" como grupo à parte.
- **Fora do escopo da 4a:** o grafo de Ecos não mostra a âncora; a importação não remapeava o `id` do texto-alvo de Elos e Ecos (defeito anterior à 4a, resolvido na etapa 4a2).
- **Conferir no navegador (pelo Victor):** abrir uma Prosa, grupo Intratextualidade › Ecos; escolher tipo "Personagem em comum" e o texto-alvo e ver os chips (só quem está nos dois); marcar dois, adicionar o Eco e ver "Personagem em comum (Iara, Tomás)" na lista; editar o Eco e ver as âncoras marcadas; trocar para "Pessoa em comum" com âncoras marcadas e ver a confirmação; tirar um personagem ancorado do texto e ver as três escolhas (testar "Manter com aviso" e ver o ⚠, e "Remover a âncora"); cancelar o modal depois de "Remover a âncora" num Eco de outro texto e ver que nada mudou; excluir um Personagem ancorado e usar Desfazer; mesclar duas Pessoas; exportar `.md`/`.csv` e ver o rótulo; modo escuro e celular.

## Situação editorial de Livro e Coletânea: pronta (03/10/2026)

Pedido do Victor. Detalhes em `status.md` (primeira entrada), `decisoes.md` (última seção) e `schema.md` ("Situação editorial").

- **Conferir no navegador (pelo Victor):** Livros › editar um livro antigo e ver "Não especificado"; Novo Livro e ver "Em circulação" já marcado; escolher Esgotado, preencher mês/ano e nota, salvar e ver o selo no card; num livro com loja cadastrada, ver o aviso âmbar; abrir a aba Coletâneas e ver a situação ao lado do SEQ; modo escuro e celular.
- **Em aberto:** filtro/coluna/busca por situação; seletor de "nova edição" para Reeditado (hoje vai na nota).

## Correntes literárias: fechado em 03/10/2026 (período, busca, colunas, Estatísticas, modal)

Detalhes em `status.md` e `decisoes.md`. Escolha da divisão nos modais feita (ver `status.md`). **Falta:** Postura/Programa nas exportações dos textos.

- **Conferir no navegador:** Correntes › Novo (título, grupos fechados, toggles de explicação); editar uma corrente e ver abrirem só os grupos com dado; filtro De/Até com 1826–1830 (Romantismo apagado como contexto); colunas novas no painel de colunas de Poemas; Estatísticas › Correntes literárias (Chart.js real, modo escuro, celular).

## Hierarquia das Correntes literárias: etapa 1 pronta (03/10/2026)

Detalhes em `status.md` (primeira entrada) e `decisoes.md` (seção "Divisões de uma corrente").

- **Próximos passos, em ordem:** (1) ~~seed das fases do Romantismo~~ feito em 03/10/2026 (ver `decisoes.md`): o Victor revisa as datas de Portugal (3ª geração 1860-1865 no seed, 1860-1870 no texto dele) e decide se quer vertentes da prosa de Portugal e teatro; (2) ~~filtros e busca que incluem as divisões~~ feito em 03/10/2026 (busca hierárquica, `movimentodireto:`, "Ver" somando as divisões); resta o filtro de período da lista de correntes conhecer a hierarquia; (2b) ~~filtros de Tipo, Região, Programa e Postura na aba~~ feito em 03/10/2026 (valor efetivo, pai como contexto, ver `decisoes.md`), e o Victor confere se prefere pai apagado como contexto ou lista achatada com filtro ativo; (3) coluna, busca e Estatísticas de Postura e Programa, usando a postura efetiva; (4) escolha da divisão nos campos de corrente de Autor, Poema e Prosa, se o campo livre por nome não bastar.
- **Conferir no navegador:** Cadastros › Correntes literárias › Novo: escolher "Faz parte de", ver Divisão e "Aplica-se a" habilitarem; salvar e ver o card recuado abaixo do pai, com postura e programa herdados; excluir o pai e ver as divisões subirem, com Desfazer.

## Postura estética em Movimento/Escola: pronta (03/10/2026)

Detalhes em `status.md` (primeira entrada), `decisoes.md` e `schema.md` (última seção).

- **Pendente (pedido do Victor em 03/10/2026):** coluna, busca e Estatísticas da postura (e do Programa), a fazer **depois** de decidir como cadastrar fases, gerações e vertentes, porque a leitura "postura efetiva" e a contagem com sublocais dependem da hierarquia. Também falta o Victor revisar uma proposta de Programa para os 22 movimentos de fábrica. Proposta de hierarquia em discussão (ver `decisoes.md`, última seção).
- **Conferir no navegador:** abrir Cadastros › Correntes literárias (antes Movimento/Escola; o Programa agora tem Tendência e Não se aplica e os 22 vêm preenchidos), editar um movimento, escolher uma postura, salvar e ver no card e em "Ver"; a legenda no modo escuro e no celular.

## Personagens, etapa 1: pronta (03/10/2026)

Detalhes em `status.md` (primeira entrada), `decisoes.md` (F11-D1 a D8) e `schema.md` (`db.personagens`).

- **Suíte 2429/0 (03/10/2026).** Os dois testes antigos que falhavam foram corrigidos: `temas-texto-editor` esperava o campo oculto sem `assuntosExcluidos`, e `assunto-excecao-dom` clicava num `onclick` inline, que o happy-dom não executa (a exceção de Assunto não tem bug; a nota antiga que suspeitava disso está superada). Prettier limpo.
- **Planejamento:** `planejamento/` agora tem `plano-central.md`, as Fases 1 e 2 e a nova `fase-11-personagens.md`.
- **Etapa 1b feita (04/10/2026):** identidade, vida e características no dado (sem tela). Ver `status.md`.
- **Etapa 2 feita (04/10/2026):** aba Personagens em Cadastros, com modal e "Ver textos". Ver `status.md`.
    - **Conferir no navegador (pelo Victor):** Cadastros › Personagens; Novo Personagem com gênero, orientação, cor/raça, anos, tags (Enter adiciona, × remove, autocomplete do que já existe) e nota do passado; salvar, reabrir e editar; óbito anterior ao nascimento deve ser recusado; busca e filtros; Ver textos num personagem que já esteja ligado a algum poema (a ligação pelo modal do texto já existe desde a 3b); excluir e Desfazer; modo escuro e celular.
- **Etapa 3b feita (04/10/2026):** grupo Personagens nos modais de Poema e Prosa. Ver `status.md`.
    - **Conferir no navegador (pelo Victor):** abrir um poema, grupo "Personagens"; digitar um nome existente e ver o cartão; marcar papéis (Menção sozinha desabilita a centralidade); abrir "Relação com este texto" e adicionar tags com Enter e vírgula; salvar, reabrir e ver tudo igual; digitar um nome novo e ver a confirmação; remover o cartão; Novo Poema abre o grupo vazio; o mesmo em Prosa; "Ver textos" na aba Personagens agora encontra o poema; modo escuro e celular.
- **Etapa 3a feita (04/10/2026):** participação por livro no modal do Personagem. Ver `status.md`.
    - **Conferir no navegador (pelo Victor):** Cadastros › Personagens › editar um personagem, seção "Participação por livro"; escolher um livro e uma coletânea; adicionar tags (Enter e vírgula); salvar e reabrir; ver a linha "participa de N livros" no cartão e a busca achando o título do livro; excluir um livro e ver a participação sumir, e o Desfazer devolver; modo escuro e celular.
- **Próximo:** etapa 4, âncora do Eco e "Pessoa em comum" (ou a 5, busca por papel e centralidade). Desenho em `planejamento/fase-11-personagens.md`.
- **Ponto aberto:** a Fase 11 corre em paralelo à Fase 1 (ainda em andamento). Personagem × Tema, na etapa 7, só faz sentido depois da aba Cruzamentos da Fase 1.
- **Conferir no navegador (pelo Victor):** nada visível ainda. Só abrir o app, editar e salvar um poema qualquer e ver que nada quebra.

## Seleção por página e estrelas de papel: pronto (01/10/2026)

Pedido do Victor. Detalhes em `status.md` (primeira entrada).

- **Falhas antigas dos dois testes (corrigidas em 03/10/2026, ver a seção de Personagens acima):** `assunto-excecao-dom` clicava num `onclick` inline que o happy-dom não executa (sem bug no app) e `temas-texto-editor` não esperava `assuntosExcluidos: []`.
- **Conferir no navegador (pelo Victor):** com mais de uma página, clicar "Selecionar estes N" e de novo (desmarca); marcar a página à mão e ver o rótulo virar "Desselecionar"; "Selecionar restantes (M)" com e sem filtro ativo; as estrelas na coluna Tema e Assunto em claro e escuro (★ dourado x ☆ cinza).
- **Decisão a confirmar:** "restantes" = o que a lista **filtrada** tem fora da página (não o acervo inteiro).

## Exceção de Assunto por texto: pronta (01/10/2026)

Pedido do Victor. Detalhes em `status.md` (primeira entrada), `decisoes.md` e `schema.md` ("Exceção de Assunto no texto").

- **Uso:** no grupo "Temas e Assuntos" do modal, o seletor de cada Assunto ganhou **Não se aplica** (rótulo curto para não alargar o seletor; o Assunto riscado diz "não se aplica a este texto"). O Assunto aparece riscado com **Restaurar**; some das tabelas, busca, Estatísticas e exportações daquele texto.
- **Regra combinada:** a exceção some junto se o Tema sair do texto ou deixar de levar àquele Assunto.
- **Pendente de verificação:** `tests/assunto-excecao-dom.test.js` e `tests/assunto-papel.test.js` (DOM real) não rodaram na sessão por falta do happy-dom. Rodar `npm test` completo antes de seguir.

## Local de escrita em massa: pronto (30/09/2026)

Pedido do Victor. Painel **✏️ Preencher campo**, campo **Local de escrita**, em Poemas e Prosas. Detalhes em `status.md` (primeira entrada).

- **Uso:** selecionar os textos, abrir "Preencher campo", escolher o campo, digitar o Local (autocompleta do cadastro; "São Paulo (Estado)" distingue homônimos) e Preencher. Padrão aditivo (só nos vazios); "Sobrescrever" troca o que já tem; "Limpar campo" esvazia.
- **Local novo:** se o nome não existe, a confirmação avisa e o Local só é criado ao confirmar (sem tipo e sem pai; completar na aba Locais).
- **Código:** `js/campos-preenchiveis.js` (tipo `local`, `valorAlvo`) e `js/selecao-massa.js`. Testes: `tests/campos-preenchiveis.test.js` (6) e `tests/selecao-massa-preencher.test.js` (9). Suíte 2339/0.
- **Limite conhecido:** Territorialidade em massa não existe (é lista; precisa de acrescentar x substituir).

Conferir no navegador (pelo Victor): selecionar uns poemas, Preencher campo › Local de escrita, ver o autocompletar com o caminho; preencher com um Local existente e abrir um dos poemas para ver o chip no modal; repetir com um nome novo e ver o aviso "será criado" e o Local na aba Locais; marcar "Sobrescrever" num texto que já tinha outro Local; "Limpar campo"; conferir a coluna "Local de escrita" e a busca `localescrita:` depois; o mesmo em Prosas; o painel no modo escuro e no celular.

## Estatísticas de Local e Idioma: prontas (30/09/2026)

Item 3 da lista de passos de Locais, feito uma vez só para Local e Idioma. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (última seção). Aba nova **Estatísticas › Local e idioma**, com quatro gráficos clicáveis:

- **Locais citados (Territorialidade)** e **Locais de escrita:** seletor de modo ("Citados diretamente" conta só o Local marcado; "Com o que está dentro" soma sublocais, cada texto uma vez por Local) e seletor de tipo (só lista tipos com texto no recorte). Assim saem as cidades citadas, os "locais do Brasil" e "locais de São Paulo (estado)" x "(cidade)". Padrão: direto. Os dois escolhem seu modo e tipo em separado, guardados no navegador, com aviso âmbar do que está ativo.
- **Assuntos por local de escrita:** seletor de Local (ou todos os textos com local de escrita). Escolher Santos inclui o escrito na Ponta da Praia. Usa o Assunto derivado, em qualquer papel.
- **Idiomas:** seletor de papel (Todos, Principal, Secundário). O texto do cartão diz a soma das barras e o total de textos quando a soma passa do total.
- **Clique na barra:** abre Poemas ou Prosas com `territorialidadedireta:` / `territorialidade:` / `localescritadireta:` / `localescrita:` ("Nome (Tipo)"), `assunto:"X" localescrita:"Local"` (sem Local, `localescrita:*`) e `idioma:` / `idiomaprincipal:` / `idiomasecundario:`. Um teste confere, para cada barra dos quatro modos de Local, que a lista aberta tem o mesmo número da barra.
- **Código:** `js/estatisticas-dados-local-idioma.js` e `js/estatisticas-tela-local-idioma.js` (novos), `js/estatisticas-filtros.js`, `js/estatisticas-dados.js` (`textosDasEstatisticas`), `js/locais.js` (`contarTextosPorLocal` e `...Escrita` aceitam `textos`; `consultaBuscaDoLocal`; `rotulosUnicosDeLocais`), `js/ui.js`, `index.html`. Testes: `tests/estatisticas-local-idioma.test.js` (48). Suíte 2323/0, lint e Prettier limpos.
- **Limites conhecidos:** não há gráfico de dialetos (nenhum preenchido no acervo real) nem de Local ao longo do tempo; o gráfico de Assuntos por local não tem seletor de papel do Assunto; Local com mesmo nome e tipo em pais diferentes aparece como "Centro (Bairro, em Santos)" no gráfico, mas a busca por nome e tipo não os separa (a aba Locais separa por id).
- **Bug que os testes pegaram:** `descendentesDoLocal` devolve ids numéricos; comparar com strings fazia o Local escolhido nos Assuntos ignorar os sublocais. Ao comparar ids de Local, sempre `String(...)` nos dois lados.

Conferir no navegador (pelo Victor), porque o Chart.js real, o modo escuro e o celular não foram vistos:

- Menu Estatísticas: aparece "Local e idioma" entre "Temas e pessoas" e "Linguagem"; abrir e ver os quatro gráficos.
- Locais citados: alternar "Citados diretamente" x "Com o que está dentro" e ver os números mudarem (Brasil só aparece com valor alto no segundo). Escolher o tipo "País" no modo agregado e ver só os países; "Cidade" mostra São Paulo (Cidade) e Santos. Ver o aviso âmbar e a legenda do tipo ativo.
- Clicar numa barra: abre a lista de Poemas (ou Prosas, se o filtro de Tipo for Prosas) com a busca preenchida e o mesmo número de textos da barra; usar "Voltar" e ver o gráfico como estava.
- "São Paulo (Cidade)" x "São Paulo (Estado)": os dois aparecem como barras separadas e cada clique abre o seu.
- Locais de escrita: o mesmo teste; escrever em Santos deve contar para Brasil no modo agregado.
- Assuntos por local de escrita: escolher um Local e ver o número de textos no cartão; clicar numa barra e comparar com a lista.
- Idiomas: trocar o papel e ver a barra mudar; com um texto com Inglês secundário (por exemplo "fado reducionista"), `idiomasecundario:` deve achar 3 textos no acervo real; ver o aviso da soma.
- Filtros compartilhados (Autor, Tipo, período, terceiros): mudar e ver os quatro gráficos acompanharem.
- Botão "Ocultar" de cada gráfico, o mínimo de aparições, o modo escuro e o celular (seletores quebrando linha sem estourar a largura).

## Colunas, `.md`, `.csv` e Visualização de Local e Idioma: prontos (30/09/2026)

Passo 2 do plano, feito uma vez só para os dois campos. Detalhes em `status.md` (primeira entrada).

- **Idioma com papel e dialeto** na linha do `.md` (PDF e DOCX herdam), na Visualização (que não mostrava Idioma) e na coluna da tabela: "pt-BR (principal; dialeto: paulistano), Inglês (secundário)". Um Principal sem dialeto sai só com o nome. Um idioma sozinho nunca aparece como Secundário (a regra "ao menos um Principal" o promove).
- **Local:** linha "Local onde foi escrito" no `.md` e na Visualização; a Territorialidade passa a sair com o caminho ("Lapa (São Paulo › São Paulo › Brasil)"). O caminho segue o primeiro pai, então a Estação Lapa mostra Lapa e não o Metrô. Texto só com o espelho de nomes continua saindo pelos nomes.
- **Tabela:** colunas novas "Local de escrita" e "Territorialidade" (selo por Local, caminho na dica), desligadas por padrão, logo depois de Idioma. Quem já tem configuração salva de colunas as vê no fim da lista.
- **CSV:** `idioma_principal`, `idioma_secundario`, `dialetos`, `local_escrita`, `local_escrita_caminho`, `territorialidade_caminho`. `idioma` e `sinal_territorialidade` não mudaram.
- **Código:** `js/utils.js` (`textoIdiomasComPapel`, `sinalizacoesAgrupadas` com 3º parâmetro), `js/locais.js` (`textoLocalComCaminho`, `textoTerritorialidadeComCaminho`, `textoLocalEscrita`, `caminhoCompletoLocal`), `js/exportar-md.js`, `js/visualizar.js`, `js/exportar-csv.js`, `js/colunas.js`, `js/celulas-tabela.js`, `js/render-listas.js` (`celulaIdioma`, `celulaLocalEscrita`, `celulaTerritorialidade`). Testes: `tests/saidas-local-idioma.test.js` (23); `tests/colunas.test.js` ajustado. Suíte 2274/0. A coluna chama "Local de escrita" (pedido do Victor); o campo do modal e as linhas do `.md` e da Visualização seguem "Local onde foi escrito". As colunas Idioma e Movimento/Escola ganharam a lupa no cabeçalho.

Conferir no navegador (pelo Victor): na tabela de Poemas e de Prosas, ligar as colunas "Local de escrita" e "Territorialidade" pelo painel de colunas e ver os selos (cores no modo escuro e quebra de linha no celular); passar o mouse num selo e ver o caminho; ordenar pelas duas colunas; usar a lupa da coluna e ver o prefixo `localescrita:` / `territorialidade:` na busca; ver a coluna Idioma num texto com Secundário e dialeto; abrir "Ver" num texto com Local e idioma e conferir as linhas; exportar `.md` e `.csv` e abrir o `.csv` numa planilha para ver as seis colunas novas.

## Busca de Local e de Idioma: pronta (30/09/2026)

Passo 2 do plano, feito uma vez só para os dois campos. Detalhes em `status.md` (primeira entrada) e `decisoes.md` (última seção).

- **`territorialidade:` é hierárquico.** `territorialidade:Brasil` acha tudo que está dentro do Brasil, por qualquer caminho (a Estação Lapa conta para Lapa, Metrô de São Paulo, São Paulo e Brasil). `territorialidade:"São Paulo (Cidade)"` e `"São Paulo (Estado)"` se distinguem pelo tipo entre parênteses; só `"São Paulo"` pega os dois. Local sem tipo vale "Nome (sem tipo)".
- **Novos prefixos:** `territorialidadedireta:` (só o Local exato), `localescrita:` (hierárquico) e `localescritadireta:`; `idiomaprincipal:`, `idiomasecundario:` e `dialeto:` (casa qualquer dos dialetos e o idioma deles, por exemplo `dialeto:espanhol`). `idioma:` segue achando em qualquer papel.
- **Atalho "Ver textos" do Local** gera um termo só (`territorialidade:"Lapa (Bairro)"`). Um teste confere que, para todos os Locais do fixture, a lista filtrada bate com a contagem de "citam o Local ou sublocais".
- **Código:** `js/locais.js` (`buscaTerritorialidadeDoTexto`, `buscaLocalEscritaDoTexto`, `consultaTerritorialidadeDoLocal`), `js/utils.js` (`CAMPOS_ATRIBUTO`, `PREFIXOS_CANONICOS_POR_CAMPO`, `nomesIdiomasPorPapel`, `dialetosDoItem`), `js/render-listas.js` (`decorarCamposBusca`), legenda do "?" no `index.html`. Testes: `tests/busca-local-idioma.test.js` (22); ajustados `locais`, `locais-dom` e `territorialidade`.
- **Limites conhecidos:** a busca é por substring (a opção "palavra inteira" resolve `Brasil` x "Brasileiro"), e dois Locais com mesmo nome e mesmo tipo em pais diferentes não se distinguem na caixa (a aba Locais os separa por id). A busca geral sem prefixo não olha o Local hierárquico.
- **Victor, no acervo real:** não preencheu dialeto em nenhum texto (segui a minha leitura de que o que há é registro coloquial, não variedade regional) e marcou Inglês como Secundário em "fado reducionista", "disposable thing" e "like daylight". Com isso, `idiomasecundario:ingles` deve achar 3 textos, e `idiomaprincipal:fr` o "colibri (beija-flor - version française)".

Conferir no navegador (pelo Victor): na busca de Poemas, `territorialidade:Brasil` (conta como o total de textos com algum Local); `territorialidade:"São Paulo (Cidade)"` x `"São Paulo (Estado)"`; aba Locais, "Ver textos" de um Local e comparar o número da lista com o da aba; `localescrita:` com um Local que tenha sublocais; `idiomasecundario:ingles` (3 textos) e `idiomaprincipal:pt-BR`; a legenda do "?" com os dois itens novos (Poemas e Prosas).

## Dialetos em lista: pronto (30/09/2026)

Pedido do Victor depois da busca: um texto pode ter mais de um dialeto no mesmo idioma (diálogo entre falantes de regiões diferentes). Detalhes em `decisoes.md` (última seção) e `schema.md`.

- **Dado:** `idiomas: [{ idioma, papel, dialetos: [] }]`. `dialeto` de texto único (dado antigo) vira `dialetos: [dialeto]` em `normalizarIdiomas` e `migrarIdioma`. Idioma repetido soma os dialetos. Nada a converter no acervo real (nenhum dialeto preenchido).
- **Modal:** chips de dialeto com × abaixo de cada idioma e um campo para adicionar (vírgula separa vários, Enter ou sair do campo confirma, foco volta ao campo; o que ficou digitado entra ao salvar). Código: `js/editor.js` (`adicionarDialetoIdiomaTexto`, `removerDialetoIdiomaTexto`, `linhaIdiomaTexto`, `obterIdiomasTexto`), `js/main.js`, `js/utils.js` (`normalizarDialetos`, `normalizarIdiomas`, `dialetosDoItem`, `extrairDialetosUnicos`).
- **Limite assumido:** o dialeto vale para o idioma do texto todo, não para uma fala ou personagem (isso vai nas Notas).
- **Testes:** ampliados `tests/idiomas.test.js`, `tests/regiao-idioma-dom.test.js` e `tests/busca-local-idioma.test.js`. Suíte 2250/0.
- **Conferir no navegador (Victor):** num Poema, em Região e Idioma, adicionar um dialeto ao pt-BR (chip aparece, campo recupera o foco), adicionar um segundo ("paulistano, gaúcho" com vírgula), remover um pelo ×, digitar um sem confirmar e salvar (deve entrar), reabrir o texto e ver os chips; ver as sugestões dos já usados; ver no modo escuro e no celular (chips e campo quebrando linha sem estourar a largura); `dialeto:gaucho` na busca.

## Idioma em lista: passo 1 pronto (30/09/2026)

Decidido com o Victor nesta sessão (detalhes e porquês em `decisoes.md`, última seção; schema em `schema.md`, campo `idiomas`):

- **Região e Idioma vem antes de Datas** nos dois modais (o "onde" antes do "quando", como a ordem dos Cadastros), com a nota "(idioma, local onde foi escrito, territorialidade)" no título. Já aplicado.
- **Mais de um idioma por texto, com papel por idioma** (Principal ou Secundário, não pela posição da lista), então um texto meio a meio pode ter dois Principais. **Ao menos um Principal** quando há idioma: tirar ou rebaixar o único Principal promove o próximo da lista; o único idioma não vira Secundário; texto sem idioma é permitido.
- **Dialeto ligado ao idioma** (texto livre, opcional, com sugestão dos já usados para aquele idioma). **Idioma não vira entidade** (sem aba nova).
- Dado: `idiomas: [{ idioma, papel, dialetos }]` é a fonte da verdade (os dialetos são uma **lista**, ver a seção abaixo); `idioma` (string) continua como **espelho** só com os nomes, Principais primeiro, para busca, coluna e exportações seguirem funcionando. Migração: cada `idioma` antigo vira um Principal sem dialeto. Quem lê usa `idiomasDoItem` (`js/utils.js`).
- Código: `js/utils.js` (`normalizarIdiomas`, `idiomasDoItem`, `espelhoDeIdiomas`, `extrairDialetosUnicos`, `PAPEIS_IDIOMA`), `js/editor.js` (`adicionarIdiomaTexto`, `removerIdiomaTexto`, `definirPapelIdiomaTexto`, `definirDialetoIdiomaTexto`, `obterIdiomasTexto`, `resetIdiomasTexto`, `carregarIdiomasTexto`), `js/forms.js` (`idiomasParaSalvar`), `js/db.js` (`migrarIdioma`), `js/ui.js`, `js/main.js`, os dois modais. Testes: `tests/idiomas.test.js` e `tests/regiao-idioma-dom.test.js`.

**Falta do Idioma:** só os docs `for-ai` completos (a entrada `idiomas` já foi descrita em `campos-poema-prosa-for-ai*.md`). Busca, colunas, exportações e Estatísticas (com o aviso da soma) estão prontas.

Conferir no navegador (pelo Victor): abrir um Poema e ver **Região e Idioma antes de Datas**; ver pt-BR como Principal num texto novo; adicionar "en, es" (vírgula) e ver os dois como Secundário; trocar um para Principal e ver os dois Principais; rebaixar o único Principal e ver o próximo ser promovido; digitar um dialeto, salvar, reabrir e ver que ficou; ver as sugestões de dialeto; remover todos e salvar (texto sem idioma); conferir a coluna Idioma na tabela (espelho) e a busca `idioma:`; ver o grupo no modo escuro e no celular (linha do idioma quebrando sem estourar a largura); abrir um backup antigo real e ver cada idioma virar um Principal.

## Faixa "Voltar / Limpar filtro": pronta

Todo atalho "Ver textos" (Tema, Assunto, Época, Período, Movimento, Autor, Pessoa, Local), o drill-down das Estatísticas e os atalhos Assunto para Tema mostram, na aba de destino, a faixa "Voltar para <aba> · Limpar filtro". Módulo `js/faixa-origem.js`, testes em `tests/faixa-origem.test.js`. Para conferir no navegador: aba Locais, Ver textos de um Local, Voltar (a árvore deve estar como foi deixada); Estatísticas, clicar numa barra, Voltar; editar a caixa de busca à mão e ver a faixa sumir; ver a faixa no modo escuro e no celular (quebra de linha).

## Locais: onde estamos

Projeto do Victor: Territorialidade deixa de ser só etiqueta de Sinalizações e vira campo próprio, alimentado por um cadastro de **Locais** hierárquico. **Etapas 1 (dado, migração, lógica, exportação/importação) e 2 (aba Locais) prontas e testadas; a busca hierárquica também.** Detalhes em `status.md` e `schema.md`. A Territorialidade ainda é editada em Sinalizações; a aba Locais só cadastra e organiza.

Etapa 3 (grupo "Região e Idioma" nos modais, Local onde foi escrito e Territorialidade por id, criar Local direto do modal) **pronta e testada por testes automáticos**; ver `status.md`. Etapas que faltam, na ordem que recomendo (primeiro o mais fácil; as de número 1, 2 e 3 já foram feitas):

1. ~~**Busca**~~ **Pronta** (ver a seção "Busca de Local e de Idioma" acima).
2. ~~**Colunas, `.md`, `.csv`, Visualização**~~ **Prontas**, com o caminho hierárquico, o local de escrita e os idiomas com papel e dialetos (ver a seção acima).
3. ~~**Estatísticas**~~ **Prontas** (ver a seção "Estatísticas de Local e Idioma" acima): citados diretamente x com o que está dentro, filtro por tipo, textos e assuntos por local de escrita, idiomas por papel.
4. **Docs `for-ai`** (o Idioma em lista já está descrito) (`docs/campos-poema-prosa-for-ai*.md`, `docs/etiquetas-sinalizacoes-for-ai*.md`): descrever `territorialidade`, `localEscrita` e `locaisHierarquia` no JSON exportado; e tirar a Territorialidade da lista de Sinalizações do modal.

Decidido pelo Victor: vários pais por Local; "Local onde foi escrito" é um só por texto (para escrita em trânsito, um Local tipo "Viagem" que pertence a uma região). Nada bloqueante em aberto.

Conferência no navegador (pelo Victor). O grupo novo ainda não foi aberto num navegador: abrir um Poema, expandir "Região e Idioma" (agora antes de Datas), ver o Idioma lá dentro, com papel e dialeto (seção do Idioma acima), digitar "Estação Lapa" na Territorialidade e escolher pela lista (o caminho deve aparecer ao lado), digitar um nome novo (chip "(novo)"), definir o Local onde foi escrito, salvar, reabrir e conferir que tudo permanece, e que a aba Locais mostra o Local novo sem tipo. Cancelar um modal com Local novo digitado não deve criar nada. Além disso: abrir o app com o acervo real, ir à aba Locais e ver se cada etiqueta de Territorialidade virou um Local; organizar alguns (tipo e local maior, com dois pais na Estação Lapa); editar um texto pelo modal e conferir que a Territorialidade permanece; exportar JSON e importar em outro navegador.

## Contexto da sessão anterior (Temas e Assuntos)

A fase 3 do Tema está feita e verificada por testes. Nesta sessão entraram, além dos pedidos da rodada anterior (coluna Tema, papel do Assunto herdado com sobrescrita, layout do campo do Tema), estas correções e o seed:

1. **Modal "Temas e Assuntos" mais folgado.** Cada Tema e cada Assunto ocupa duas linhas: o nome em cima e o seletor de papel embaixo. O × do Tema fica ao lado do seletor. O "(fixado)" do Assunto aparece abaixo do seletor, não ao lado.
2. **"Indefinido" no lugar de "Sem papel definido"** na interface (modal, seletores, Estatísticas). O dado gravado continua `''` e a busca continua `temasempapel:`.
3. **Seed de Temas e Assuntos** (`semearTemasEAssuntos`, `js/db.js`): 9 Assuntos e 44 Temas, a partir da lista do Victor, sem os temas pessoais ou de geração, sem o Brasil (é Territorialidade) e sem "Território e ambiente". Roda **só em instalação nova** (nada salvo no navegador). O acervo atual do Victor, com os 74 temas, não muda. Os registros do seed são comuns: ficam junto dos temas que a pessoa criar, podem ser editados ou excluídos, e o que for excluído não volta. "Machismo" está em dois Assuntos de propósito.
4. **Excluir em lote nas abas Temas e Assuntos** (pedido do Victor: começar do zero). Aba Assuntos ganhou **"Excluir todos os assuntos"**: esvazia o cadastro, sem tocar em Temas nem em textos. Aba Temas ganhou **"Excluir temas sem texto"**: remove só os Temas que nenhum texto usa e mantém os em uso (vale para qualquer tema sem uso, não só os do seed). Os dois pedem confirmação dizendo quantos saem e quantos ficam, e o **Desfazer** devolve tudo (notas e lugar nos Assuntos incluídos). Não existe exclusão que tire o Tema dos textos. Código: `js/temas.js` (`temasSemTexto`, `resumoExclusaoTemasSemTexto`, `excluirTemasSemTexto`, `excluirTodosAssuntos`), `js/forms.js`, `js/main.js`, `index.html`.
5. **Busca por papel do Assunto e papel do Assunto nas Estatísticas.** Prefixos `assuntoprincipal:`, `assuntosecundario:` e `assuntoindefinido:` (sinônimo `assuntosempapel:`), sobre o papel efetivo do Assunto no texto (herdado do Tema ou fixado na mão); `assunto:` segue achando em qualquer papel. Nas Estatísticas, seletor "Papel do assunto" acima do gráfico de Assuntos (escolha guardada em chave própria, independente da do Tema); o clique na barra abre a lista com o prefixo do papel escolhido. O papel Indefinido junta Tema indefinido e papel fixado como indefinido (decisão do Victor). Código em `js/utils.js`, `js/render-listas.js`, `js/estatisticas-*.js`, `js/main.js` e `index.html`.
6. **Sugestão de Temas duplicados e Desfazer na mesclagem.** Escolha do Victor: sugerir só pela mesma forma escrita (caixa, acento, hífen, espaço, pontuação e plural palavra a palavra), sem lista de "talvez" por erro de digitação. Aba Temas ganha o painel "Possíveis duplicatas" (some quando não há par): cada par mostra as contagens de textos e os botões "Manter X", "Manter Y" e "Não são iguais". Nada é mesclado sozinho. "Não são iguais" grava `naoIguais` nos dois Temas e o par não volta. `mesclarTemas` agora devolve `desfazer`; a mesclagem de Temas (modal comum e painel) mostra o aviso com Desfazer, e a frase da confirmação diz "Você terá alguns segundos para desfazer". Nome contido em outro ("Luto" e "Luto/Finitude"), erro de digitação e sinônimo ficam de fora de propósito. Código: `js/temas.js` (`formaTema`, `sugerirTemasDuplicados`, `marcarTemasNaoIguais`, `mesclarTemas`), `js/render-listas.js`, `js/forms.js`, `js/main.js`, `index.html`.

## Verificação feita

- `npm test`: **2086 passam, 0 falham**. Testes novos desta rodada: `tests/temas-duplicatas.test.js` (12) e `tests/temas-duplicatas-dom.test.js` (5); `tests/temas-fase3.test.js` ajustado (o retorno de `mesclarTemas` ganhou `desfazer`). Da rodada anterior: `tests/seed-temas-assuntos.test.js`, `tests/seed-temas-assuntos-existente.test.js`, o bloco de duas linhas em `tests/assunto-papel.test.js` `tests/temas-excluir-lote.test.js` (18), `tests/assunto-papel-busca.test.js` (11) e o bloco "Papel do assunto nas Estatísticas" em `tests/estatisticas.test.js` (5).
- `npm run lint`: limpo. `prettier --check .` limpo no projeto inteiro; `biblioteca/*.json` está no `.prettierignore` (são gerados por `scripts/montar-pacote.js`).
- Não abri o app no navegador. `happy-dom` não aplica CSS, então o visual do modal e dos botões novos só o navegador confirma.

## Conferência no navegador (pelo Victor)

- Modal de Poema/Prosa, grupo "Temas e Assuntos": Tema numa linha e o seletor "Indefinido/Principal/Secundário" na de baixo, sem aperto. Nos Assuntos, o "(fixado)" abaixo do seletor.
- Fixar um papel num Assunto, salvar, reabrir: a sobrescrita permanece. Voltar a "Automático" remove.
- Tabela: coluna **Tema** (se a configuração de colunas for antiga, ela entra no fim da lista), coluna **Assunto** com ★/☆, Etiquetas sem o Tema.
- `.md`, `.csv` (`assunto_principal`, `assunto_secundario`), Visualização, e exportar/importar JSON com papel fixado.
- **Seed:** o acervo atual não deve ganhar nenhum tema novo. Para ver o seed, abrir o app em outro navegador (ou perfil anônimo): devem aparecer 9 Assuntos e 44 Temas, e criar um tema novo deve somar aos existentes. Excluir um tema do seed e recarregar: ele não volta.
- **Excluir em lote:** aba Assuntos, botão "Excluir todos os assuntos" (vermelho, ao lado de "Novo Assunto"): confirmação com o total, excluir, conferir que os Temas e os textos continuam iguais (os Temas passam a "sem assunto"), Desfazer devolve todos. Aba Temas, botão "Excluir temas sem texto": confirmação com "N saem, M ficam", conferir que nenhum tema em uso some, Desfazer devolve os temas com as notas. Com nada a excluir, só aparece um aviso. Ver os botões no modo escuro e no celular.
- **Busca por papel do Assunto:** na busca de Poemas ou Prosas, digitar `assuntoprincipal:` (e `assuntosecundario:`, `assuntoindefinido:`) com um assunto e conferir que a lista bate com as estrelas ★/☆ da coluna Assunto; um Assunto com papel fixado num texto deve aparecer no papel fixado, não no herdado. A legenda de busca (o "?") deve listar os três prefixos. **Estatísticas:** aba Temas e pessoas, gráfico de Assuntos, seletor "Papel do assunto" (Todos, Principal, Secundário, Indefinido): trocar o papel, ver o gráfico mudar e o aviso âmbar aparecer, fechar e reabrir o app (a escolha fica), e clicar numa barra com um papel escolhido (a lista aberta deve ter o mesmo número da barra). Ver também no modo escuro e no celular.
- **Duplicatas de Temas:** aba Temas, painel "Possíveis duplicatas" no alto da lista. Criar dois temas que só mudam em hífen ou plural (por exemplo "Auto-acolhimento" e "Autoacolhimento", "Memória" e "Memórias") e ver o par aparecer com as contagens. "Manter X": confirmação com o número de textos e assuntos afetados, mesclar, conferir que os textos ficam com o tema mantido e o papel mais forte, e que o Desfazer devolve tudo (nota, posição na lista, Assuntos). "Não são iguais": o par some, recarregar o app e ver que continua sem voltar, Desfazer traz de volta. "Luto" e "Luto/Finitude" não devem aparecer como par. A mesclagem pelo ícone de mesclar de cada linha também deve mostrar o Desfazer. Ver o painel no modo escuro e no celular (linhas quebrando sem estourar a largura).
- Ainda valem da rodada anterior: mesclar Temas, abrir um backup antigo real (migração), linha-aviso em Assuntos, seletor "Papel do tema" nas Estatísticas, buscas `temaprincipal:` e `tema:`.

## Ao começar a próxima sessão

1. `npm install` ANTES de qualquer teste (o zip não traz `node_modules/`); depois `npm test` e `npm run lint`. Esperado: 2323/0 e lint limpo.
2. Se algo da conferência falhar, o relato do Victor manda: corrigir a partir dele.

## Ideias (não decididas; só se o Victor pedir)

- Aposentar o espelho `sinalizacoesTema`.
- Lista separada de "talvez são iguais" por erro de digitação (distância de edição 1, só em nomes longos), só depois de medir no acervo real do Victor: com tolerância 2, "Machismo" e "Racismo" viram par.
- Desfazer nas outras mesclagens (Pessoa, Grupo, Período, Movimento/Escola), no mesmo padrão de `mesclarTemas`.
- Um assunto "Território e ambiente" no seed (Victor disse que não precisa por ora).

## Decisões do Victor que valem

- Papel de Tema: principal, secundário, "indefinido" (antes "sem papel definido"); nada é inferido. `tema:` acha em qualquer papel.
- Papel do Assunto: herda do Tema por padrão, o usuário pode fixar outro por texto.
- Painel "Temas sem assunto" virou linha-aviso (aprovado). A exportação `.md` de Assuntos mantém a própria seção.
- Seed de Temas e Assuntos só em instalação nova; os temas do seed são comuns, ficam junto dos criados pela pessoa.
- JSONs de `biblioteca/` ficam fora do Prettier (`.prettierignore`): a fonte é o `.md` mais o meta, o script regenera byte a byte e o teste `biblioteca-pacotes-curados` guarda o conteúdo.
- Papel do Assunto: `assuntoprincipal:`, `assuntosecundario:`, `assuntoindefinido:` na busca e seletor "Papel do assunto" nas Estatísticas; Indefinido é um só (Tema indefinido e papel fixado como indefinido valem igual).
- Duplicatas de Temas: sugerir só pela mesma forma escrita, nunca mesclar sozinho, com "Não são iguais" e Desfazer na mesclagem; sem lista de "talvez" por ora.
- Começar do zero: "Excluir todos os assuntos" e "Excluir temas sem texto", sempre com confirmação e Desfazer; nunca uma exclusão que tire o Tema dos textos.
- Busca de Local hierárquica (`territorialidade:`), com `...direta:` para o exato e o tipo entre parênteses para homônimos; busca de Idioma por papel e dialeto.
- Dialeto é lista por idioma (vários dialetos num texto, por exemplo um diálogo entre regiões); vale para o idioma todo, não para uma fala.
- Idioma: lista com papel por idioma (mais de um Principal permitido, ao menos um Principal havendo idioma), dialeto ligado ao idioma, sem entidade; Região e Idioma antes de Datas. Fez-se o Idioma antes de terminar Locais para que busca, colunas, exportações, Estatísticas e docs saiam uma vez só para os dois.
- Estatísticas de Local e Idioma: aba própria, direto x com o que está dentro como seletor (padrão direto) mais filtro por tipo, mesmo corpus filtrado das outras telas, clique na barra abre a busca do mesmo modo; Idiomas por papel com aviso da soma. Dialetos e Local ao longo do tempo ficaram de fora por ora.
- Ele prefere: primeiro o mais fácil, depois o difícil; e a sessão termina entregando `.zip` do projeto + este `.md`, mesmo incompleto.
- Ele não gosta de travessão nos textos escritos por mim nem nos textos da interface.
