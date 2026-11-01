// ============================================================
// faq-conteudo.js — só os DADOS do bloco "Perguntas frequentes" da
// Central de Ajuda (Bloco 3). Sem seletor, sem aba: são perguntas
// conceituais ("o que é X", "por que Y funciona assim"), não
// procedimentais — essas ficam em como-faco-passos.js, apontando pra
// tela de verdade. Se uma pergunta daqui começar a pedir "onde clico
// pra fazer X", ela pertence ao outro bloco, não a este.
//
// Conteúdo adaptado dos docs/*-for-ai*.md (escritos pra uma IA entender o
// schema) e de decisões já tomadas com o Victor (ver manutencao/decisoes.md),
// reescrito num tom pra quem nunca abriu o console.
//
// Cada pergunta tem ainda `palavras`: sinônimos e o jeito que a pessoa costuma
// dizer, lidos só pela busca da Central (busca-ajuda.js), nunca mostrados.
// ============================================================

export const CATEGORIAS_FAQ = [
    {
        id: 'geral',
        rotulo: 'Geral',
        perguntas: [
            {
                id: 'faq-onde-dados',
                palavras: [
                    'servidor',
                    'nuvem',
                    'privacidade',
                    'localStorage',
                    'navegador',
                    'armazenamento',
                    'salvos',
                    'online',
                    'internet',
                ],
                pergunta: 'Onde ficam meus dados? Vão pra algum servidor?',
                resposta:
                    'Não há servidor: o app roda inteiro no seu navegador. Os textos e metadados ficam salvos em localStorage, e as capas de livro em IndexedDB. Baixe o JSON de vez em quando (botão "Baixar JSON"), que é o seu backup e também serve pra levar o acervo pra outro computador.',
            },
            {
                id: 'faq-perde-dado',
                palavras: [
                    'perder',
                    'apagar',
                    'limpar cache',
                    'cookies',
                    'backup',
                    'sumir',
                    'recuperar',
                    'segurança',
                ],
                pergunta: 'Posso perder meus dados limpando o navegador?',
                resposta:
                    'Sim, localStorage e IndexedDB são apagados junto se você limpar os dados de navegação do site. Como não há backend guardando uma cópia em outro lugar, o hábito de baixar o JSON periodicamente é a sua rede de segurança.',
            },
            {
                id: 'faq-esvaziar-acervo',
                palavras: [
                    'apagar tudo',
                    'limpar',
                    'resetar',
                    'zerar',
                    'deletar',
                    'excluir',
                    'recomeçar',
                    'zona de risco',
                    'reiniciar',
                ],
                pergunta: 'O que o recurso de esvaziar o acervo apaga?',
                resposta:
                    'Serve para recomeçar do zero, na aba Backup e recuperação (menu Dados). Você escolhe entre três caixas independentes: Dados (textos, livros e cadastros criados por você, capas, Versões Alternativas e os padrões de colunas salvos), Preferências (tema, colunas visíveis, itens por página, filtros e padrões das Estatísticas, templates de exportação e nomes de arquivo frequentes) e Cadastros pré-prontos (períodos, movimentos e templates que vêm de fábrica; os que algum texto usa só saem junto com os Dados). Nada é apagado antes da confirmação final: o app baixa um backup, tira um retrato de segurança e só libera o botão depois que você digita ESVAZIAR.',
            },
            {
                id: 'faq-esvaziar-depois',
                palavras: [
                    'desfazer',
                    'restaurar',
                    'recuperar',
                    'voltar',
                    'arrependi',
                    'retrato',
                    'snapshot',
                    'backup',
                ],
                pergunta: 'Depois de esvaziar, dá para voltar atrás?',
                resposta:
                    'Dá, importando o backup que o app baixou na hora. Os retratos automáticos (os últimos 10, guardados no navegador) nunca são apagados e são a outra volta se o arquivo se perder, mas cada edição nova gasta uma vaga. Dois detalhes: os padrões de colunas salvos moram nos Dados e vão no backup, então só somem junto com eles, e não ao apagar só as Preferências; e, se houver outra aba do app aberta, ela avisa e recarrega sozinha para não trazer o acervo antigo de volta.',
            },
        ],
    },
    {
        id: 'poemas-prosas',
        rotulo: 'Poemas e Prosas',
        perguntas: [
            {
                id: 'faq-elo-referencia',
                palavras: [
                    'ligação',
                    'conexão',
                    'intertextualidade',
                    'citação',
                    'eco',
                    'relação entre poemas',
                    'fonte',
                ],
                pergunta: 'Qual a diferença entre Elo e Referência?',
                resposta:
                    'Elo é uma relação bilateral entre dois textos SEUS (Reescrita, Continuação, Tradução, Versão anterior/oficial, Díptico, Resposta), cadastrada, em geral, dos dois lados. Referência é unidirecional, do texto mais novo pro mais antigo (Personagem em comum, Imagem central compartilhada, Aceno, Outro), e pode citar uma obra que não é sua.',
            },
            {
                id: 'faq-conexoes-buraco',
                palavras: [
                    'lacuna',
                    'elo quebrado',
                    'pendência',
                    'faltando',
                    'poema sem par',
                    'órfão',
                ],
                pergunta: 'O que é um Buraco na aba Conexões?',
                resposta:
                    'É um Elo registrado só de um lado. Como o Elo liga dois textos seus, o normal é cadastrá-lo nos dois: se o poema A diz "reescrita de B", o B deveria dizer o mesmo de volta. Quando só um dos dois tem o registro, a aba mostra o par incompleto como Buraco, para você completar. Por isso o título de um Buraco abre direto a edição do poema, e não a visualização.',
            },
            {
                id: 'faq-conexoes-relatorio',
                palavras: ['exportar', 'download', 'markdown', 'png', 'pdf', 'imagem', 'formato'],
                pergunta: 'O que vai em cada formato do relatório da aba Conexões?',
                resposta:
                    'O .md é texto simples, bom para colar numa IA: traz um resumo com as contagens, os Buracos, os Elos (um bloco por par ou por cluster, que é um grupo de três ou mais poemas ligados entre si) e os Ecos (uma linha só para uma cadeia simples, ou uma linha por Eco quando o grafo ramifica ou converge; grafo, aqui, é o desenho de textos ligados por setas). A seta vai sempre do texto mais novo para o mais antigo. O .png é uma imagem do relatório, com os Elos em cartões e os Ecos com os diagramas que a aba desenha, nas cores do tema que estiver ligado. O .pdf leva o mesmo desenho do .png, sempre em tema claro, dividido em páginas A4 com "n / total" no rodapé. Como o .pdf é uma imagem, o texto dele não pode ser selecionado nem pesquisado; para isso use o .md. Esse relatório cobre só o Dentro do acervo (Elos e Ecos): o Fora do acervo tem o relatório dele, com botão na própria seção.',
            },
            {
                id: 'faq-conexoes-ver-editar',
                palavras: ['abrir', 'clicar', 'editar', 'visualizar', 'título', 'buraco'],
                pergunta:
                    'Por que os títulos de Elos e Ecos abrem o Ver, e os Buracos abrem a edição?',
                resposta:
                    'Na aba Conexões você costuma estar lendo um panorama: quer lembrar que poema é aquele e como ele se liga aos outros, sem risco de mexer em nada. O Ver serve a isso, mostra os Elos e os Ecos do poema, e tem o botão Editar para quando você quiser corrigir um rótulo ou um Tipo. O Buraco é o caso contrário, o objetivo ali é consertar, então abre a edição direto. E, dentro do Editar de um poema já salvo, o olho no cabeçalho leva de volta ao Ver; se houver alteração não salva, o app pergunta "Salvar antes de ver?". Editar e Ver se alternam sobre o mesmo poema, nunca ficam empilhados.',
            },
            {
                id: 'faq-conexoes-selecao-some',
                palavras: ['selecionar', 'marcar', 'desmarcar', 'desaparece', 'perdeu', 'ligar'],
                pergunta: 'Por que a seleção de um Eco some depois que eu ligo outro poema a ele?',
                resposta:
                    'Cada cartão selecionado é lembrado pelos poemas que ele reúne, e não pela posição ("Grafo 2" muda de número quando entra um item novo, por isso a posição não serve). Ao ligar outro poema a um grafo de Ecos, o conjunto de poemas do cartão muda, o app o enxerga como outro cartão e a seleção do antigo se perde. É raro e fácil de notar: basta selecionar de novo. O mesmo vale se você apagar um poema ou desfizer um vínculo, o item que deixou de existir sai da seleção sozinho. A seleção vale só enquanto o modo Selecionar está ligado e não fica guardada entre sessões.',
            },
            {
                id: 'faq-fora-do-acervo',
                palavras: [
                    'intertextualidade',
                    'hipertextualidade',
                    'referências',
                    'obras citadas',
                    'autores citados',
                    'derivação',
                    'hipotexto',
                    'fora',
                ],
                pergunta: 'O que é a seção Fora do acervo na aba Conexões?',
                resposta:
                    'É a outra metade da aba. Dentro do acervo estão os Elos e os Ecos, que ligam um texto seu a outro; o Fora do acervo mostra o que os textos citam ou de que derivam e que não está no app: obras (Intertextualidade e Hipertextualidade), autores e fatos do mundo (Referências). Ela traz as obras e os autores com os textos que os usam e a relação de cada um, as origens das obras (o lugar ou a cultura, com as obras, os autores e os textos de cada uma), de qual obra cada texto deriva, as referências que aparecem em mais de um texto e os avisos de grafias parecidas que talvez sejam a mesma obra. Como os Elos e os Ecos, é só uma lente: nada mora ali, o dado continua nos campos de cada poema e prosa, e por isso o título de um texto abre o Ver. Cada parte (Obras, Autores, Origens, Hipertextualidade, Referências recorrentes e Avisos) abre e fecha pelo título, com a contagem ao lado, e “Recolher tudo” e “Expandir tudo” mexem em todas de uma vez; o que você deixar fechado fica guardado neste navegador. Com algo digitado na busca, Obras, Autores e Origens abrem sozinhas.',
            },
            {
                id: 'faq-fora-mesma-obra',
                palavras: [
                    'duplicata',
                    'duplicada',
                    'mesma obra',
                    'grafia',
                    'identidade',
                    'junta',
                    'parecidas',
                    'aviso',
                ],
                pergunta: 'Como o app decide que duas entradas são a mesma obra?',
                resposta:
                    'Pelo nome da obra mais os autores, sem acento, sem maiúsculas e sem pontuação. A ordem dos autores não conta: “Tom Jobim e Vinicius de Moraes” e “Vinicius de Moraes e Tom Jobim” são a mesma obra. O tipo de obra, a data e a descrição não entram nessa identidade. Quando duas grafias são parecidas demais (o mesmo título escrito de dois jeitos, o mesmo título com autores diferentes ou títulos parecidos do mesmo autor), a seção avisa, e você decide se junta com Manter esta ou deixa como está.',
            },
            {
                id: 'faq-fora-varios-autores',
                palavras: [
                    'coautoria',
                    'feat',
                    'dupla',
                    'vários autores',
                    'etiquetas',
                    'tags',
                    'autor da obra',
                    'enter',
                    'vírgula',
                    'personagens',
                ],
                pergunta: 'Posso registrar mais de um autor numa obra citada?',
                resposta:
                    'Pode. Em Intertextualidade e Hipertextualidade o Autor é uma lista de etiquetas: digite o nome e aperte Enter ou vírgula, e repita para cada autor (uma música com participação, um livro de várias pessoas). O campo tem autocompletar com os autores que você já usou. A ordem digitada é guardada, porque a participação costuma ter ordem de destaque, mas ela não muda a identidade da obra. Não há papel por autor (intérprete, produtor) por enquanto. Como a vírgula separa as etiquetas, um nome escrito com vírgula (“Andrade, Mário de”) deve ser digitado sem ela. As entradas antigas, que tinham um autor só em texto, viraram uma etiqueta cada, sem divisão automática: no Modo revisão da seção Fora do acervo, o filtro “Autor parece ter mais de um nome” acha as que talvez precisem ser divididas. O Personagem, na Intertextualidade, funciona do mesmo jeito: uma etiqueta por personagem (o mito de Prometeu pode citar Prometeu e Zeus), com autocompletar e Enter ou vírgula para confirmar.',
            },
            {
                id: 'faq-origem-da-obra',
                palavras: [
                    'origem',
                    'origem da obra',
                    'lugar',
                    'cultura',
                    'mito',
                    'folclore',
                    'sem autor',
                    'grécia',
                ],
                pergunta: 'Como registro de onde vem uma obra sem autor único, como um mito?',
                resposta:
                    'Use o campo Origem, em Intertextualidade e em Hipertextualidade. É uma lista de etiquetas, como o Autor: digite o lugar ou a cultura (“Grécia”, “Brasil”) e aperte Enter ou vírgula. Põe só o lugar, não a época (o tempo já mora na data da obra) e não o que a obra é (Mitologia, Conto de fadas e Folclore vão no Tipo de obra). O mito de Prometeu fica assim: Tipo Mitologia, Autor vazio, Origem Grécia, Personagens Prometeu e Zeus. O campo aparece nas listas, no Ver, no .md e no .csv como “origem Grécia”, e tem colunas próprias no .csv. A busca de Poemas e Prosas acha por `origem:Grécia` (`origem:*` traz quem tem alguma origem). A origem não faz parte da identidade da obra: cada entrada guarda a sua, então a mesma obra pode ter origem numa entrada e não em outra. Para ajudar, ao digitar a obra o campo se preenche sozinho se a obra já tem uma única origem no acervo, e o diálogo Corrigir obra (Conexões › Fora do acervo) avisa quando as entradas da obra não concordam; o acerto é feito no Modo revisão, na coluna Origem. Nas Estatísticas, a aba Datas das obras tem o gráfico “Textos por origem da obra”, que mostra de que culturas vêm as obras que você cita e abre a lista de textos ao clicar na barra.',
            },
            {
                id: 'faq-busca-modo-revisao',
                palavras: [
                    'busca',
                    'filtro por coluna',
                    'campo:valor',
                    'lupa',
                    'modo revisão',
                    'sem origem',
                    'excluir',
                    'prefixo',
                ],
                pergunta: 'Como busco por uma coluna só no Modo revisão?',
                resposta:
                    'Escreva campo:valor na caixa “Buscar nas linhas”, como nas abas de Poemas e Prosas, ou clique na 🔍 do cabeçalho da coluna, que põe o prefixo na busca. Os prefixos são texto (o título do texto), relacao, nome, autor, origem, tipo, descricao, data (as duas datas da obra), pessoal, personagem, trecho, traduzido, link, acesso e nota. Termos soltos se somam; ou alterna (autor:Homero ou autor:Ovídio); aspas fazem frase exata; -termo exclui; campo:* pede a coluna preenchida, então -origem:* deixa só as linhas sem origem. Acento e caixa não importam. Sem prefixo, o termo vale para todas as colunas (inclusive as escondidas). Por exemplo, tipo:Mitologia -origem:* acha as entradas de mitologia ainda sem origem, e a barra “Editar em massa” pode aplicar a origem só a elas. Enquanto você digita, uma caixinha sugere os prefixos (digite “or” e ela oferece origem:) e, depois dos dois pontos, os valores que existem nas linhas, com quantas linhas têm cada um; as setas escolhem, Enter ou Tab aplicam e Esc fecha. Os filtros Campo e Por preencher continuam valendo junto com a busca.',
            },
            {
                id: 'faq-fora-filtro-por-campo',
                palavras: [
                    'filtrar',
                    'filtro',
                    'campo:valor',
                    'obras',
                    'autores',
                    'origens',
                    'sem origem',
                    'excluir',
                    'prefixo',
                    'sugestões',
                    'relatório',
                ],
                pergunta: 'Como filtro as obras, os autores e as origens por um campo só?',
                resposta:
                    'Na caixa “Filtrar obras, autores e origens” da seção Fora do acervo, escreva campo:valor, como nas abas de Poemas e Prosas e no Modo revisão. Os prefixos são texto (o título do texto), obra (ou nome), autor, origem, tipo, relacao, data (as datas da obra) e pessoal. Termos soltos se somam; ou alterna (autor:Homero ou autor:Ovídio); aspas fazem frase exata; -termo exclui; campo:* pede o campo preenchido, então -origem:* deixa só o que está sem origem (nas Origens, o item “Sem origem preenchida”). Acento e caixa não importam. Sem prefixo, o termo vale para o nome, o autor, o tipo, a relação e os títulos. O mesmo filtro vale para as três listas. Em Autores e Origens ele vale para as obras dentro de cada item: relacao:Paródia mostra os autores com alguma obra em paródia, já só com essas obras, e -pessoal:* mantém a origem com apenas as obras não pessoais (ela só some se não sobrar nenhuma). O prefixo do próprio nome da lista (autor: em Autores, origem: em Origens) e pessoal:algumas olham o item inteiro. Enquanto você digita, uma caixinha sugere os prefixos e, depois dos dois pontos, os valores que existem, com quantas obras têm cada um; as setas escolhem, Enter ou Tab aplicam e Esc fecha. O relatório baixado (.md, .csv e .pdf) respeita o mesmo filtro, e a linha “Filtro:” do .md mostra a consulta.',
            },
            {
                id: 'faq-edicao-em-massa-origem',
                palavras: [
                    'em massa',
                    'vários textos',
                    'mesma origem',
                    'mitologia grega',
                    'modo revisão',
                    'editar todas',
                    'aplicar a todas',
                    'filtro',
                ],
                pergunta:
                    'Como aplico a mesma origem (ou outro valor) a várias entradas de uma vez?',
                resposta:
                    'Há dois caminhos. Se as entradas são de um mesmo autor, abra Conexões › Fora do acervo › Corrigir autor: o campo Origem vale para todas as entradas em que ele é autor. Para qualquer outro grupo, use o Modo revisão e a barra “Editar em massa as linhas do filtro”: filtre as linhas (por exemplo, busque “Mitologia”), escolha o campo e a mudança, e aperte Aplicar. Cada linha tem uma caixinha: marcando algumas, a mudança vale só para elas; a caixinha do cabeçalho marca todas as linhas do filtro, em todas as páginas. Sem nenhuma marcada, a mudança vale para todas as linhas que o filtro mostra. Mudar a busca ou o filtro solta as marcadas que saíram dele. Dá para mexer em Origem (adicionar, trocar tudo, tirar umas ou tirar todas), Tipo de obra, Relação, Data da obra, Até, Obra pessoal, Personagem e Traduzido. Personagem e Traduzido só existem na Intertextualidade: as linhas de Hipertextualidade ficam de fora, e a confirmação avisa. Adicionar ignora acento e caixa e mantém a grafia que já estava. A confirmação diz quantas entradas mudam e quantas já estavam assim, o app tira um backup obrigatório antes de gravar e deixa um Desfazer na tela. Com linhas alteradas e ainda não gravadas na tabela, a barra pede para gravar ou descartar antes. Nome e Autor têm Corrigir obra e Corrigir autor; Descrição, Trecho, Link, Data de acesso e Nota são de cada entrada e ficam fora da edição em massa.',
            },
            {
                id: 'faq-fora-data-da-obra',
                palavras: [
                    'data',
                    'século',
                    'década',
                    'ano',
                    'aproximada',
                    'a.C.',
                    'nascimento',
                    'óbito',
                    'início',
                    'fim',
                ],
                pergunta: 'Como funciona a data da obra ou do fato?',
                resposta:
                    'Cada entrada de Intertextualidade, Hipertextualidade e Referências pode ter uma data de começo e outra de fim (“até”), as duas opcionais. O rótulo muda com o tipo: Obra e Notícia têm data e “até”; Marco histórico, início e fim; Pessoa pública, nascimento e óbito (vazio para quem está viva). Cada ponta escolhe um nível, que pode ser século, década, ano, mês ou dia, com as marcas “aprox.” e “a.C.”: assim você escreve “séc. XIX” quando só sabe isso, sem inventar um ano. Por baixo, o app guarda o intervalo de anos que o nível cobre, e é isso que as Estatísticas usam. A data é da obra, como a Descrição: ao repetir a mesma obra, o app sugere a data e só a preenche sozinho quando existe uma só e o campo está vazio; com datas diferentes, aparecem os botões “Já usadas para esta obra”.',
            },
            {
                id: 'faq-fora-corrigir',
                palavras: [
                    'corrigir obra',
                    'corrigir autor',
                    'manter esta',
                    'renomear',
                    'trocar nome',
                    'juntar',
                    'desfazer',
                    'backup',
                    'todos os textos',
                ],
                pergunta:
                    'O que “Corrigir obra”, “Corrigir autor”, “Corrigir referência” e “Manter esta” mudam?',
                resposta:
                    'Os quatro mexem nos textos de verdade, em todos de uma vez. Corrigir obra troca nome, autores, tipo, descrição e data da obra em todas as entradas que a usam. Corrigir autor troca a etiqueta daquele autor, inclusive nas obras com mais de um autor, e também pode definir a origem de todas as entradas dele. Corrigir referência, o botão de cada linha da lista de Referências, troca o nome, o tipo e a data da referência em todos os textos que a usam; a nota, o link e os campos de Pessoa pública de cada texto ficam como estão, a não ser que o tipo deixe de ser Pessoa pública (aí esses campos saem, e a confirmação avisa). Se o resultado coincide com outra referência, as duas passam a contar juntas. Manter esta junta grafias parecidas, passando todas para a obra que você escolheu. Antes de gravar, o app mostra quantas entradas mudam (e quantas perdem uma descrição, uma origem ou uma data diferente da nova), tira um backup obrigatório e, depois, deixa um Desfazer na tela. O Modo revisão faz o mesmo entrada por entrada, numa tabela, e tem a barra “Editar em massa” para aplicar o mesmo valor às linhas marcadas (ou a todas as do filtro).',
            },
            {
                id: 'faq-fora-relatorio',
                palavras: [
                    'exportar',
                    'download',
                    'markdown',
                    'csv',
                    'planilha',
                    'pdf',
                    'formato',
                    'relatório',
                ],
                pergunta: 'O que vai em cada formato do relatório do Fora do acervo?',
                resposta:
                    'O .md é texto simples, bom para colar numa IA: obras com autores, tipo, datas, relações e textos; autores com as obras deles; origens com as obras, os autores e os textos de cada uma; derivações; referências que se repetem e as de um texto só; e os avisos. O .csv é uma tabela por vez (obras, autores, origens, derivações, referências ou avisos), com os autores de uma obra separados por “; ” e os itens de lista por “ | ”, para abrir numa planilha. O .pdf leva o mesmo conteúdo do .md em páginas A4, com texto de verdade que dá para selecionar e pesquisar (diferente do .pdf do relatório das Conexões, que é imagem). Não há .png. O filtro e a ordem da tela valem para Obras, Autores e Origens, e uma linha “Filtro:” no começo do .md diz o que estava filtrado.',
            },
            {
                id: 'faq-estatisticas-datas-obras',
                palavras: [
                    'estatísticas',
                    'século',
                    'década',
                    'distância',
                    'gráfico',
                    'datas',
                    'época das obras',
                    'datas das obras',
                    'obras citadas',
                ],
                pergunta: 'O que mostra a aba Obras citadas nas Estatísticas?',
                resposta:
                    'Conta os seus textos pela época e pela origem das obras que eles citam. Quatro gráficos de barras: textos por século da obra, textos por década e a distância temporal entre obra e texto, em faixas que se ajustam ao recorte: a largura (1, 2, 5, 10, 20, 50, 100 anos e assim por diante) é a menor que cobre as distâncias do acervo em até 12 barras, então textos concentrados num trecho aparecem divididos nele; a obra datada depois do texto tem barra própria. No gráfico de distância, clicar no rótulo de uma faixa (o texto azul embaixo da barra, como "0 a 249 anos") dá zoom: o gráfico passa a mostrar só aquela faixa, dividida em barras menores, e dá para aprofundar de novo; "Voltar" sobe um nível e "Ver tudo" volta ao gráfico inteiro. Clicar na barra continua abrindo a lista de textos. O gráfico de origens tem o seletor Colunas / Mapa: o mapa pinta os países pela quantidade de textos (mais escuro, mais textos), aproxima com a roda do mouse, os botões, arrastando ou com a pinça (uma miniatura mostra onde você está), abre a lista ao clicar num país e traz as origens que não são país (como Roma Antiga) e a Desconhecida numa linha à parte. Abaixo do mapa, Baixar .png e Baixar .pdf, com a opção de levar só o enquadramento atual. O seletor de fonte escolhe Obras (Intertextualidade e Hipertextualidade), Referências ou Todas; a padrão é Obras. Cada texto conta uma vez por barra. A data da obra é o começo da entrada (ou o fim, se só ele existe), e uma Pessoa pública entra pelo nascimento. Textos sem nenhuma data da obra ficam fora das barras, e a distância usa o ano de escrita do texto, então entradas datadas de textos sem ano de escrita também ficam fora; a tela avisa quantos são. Clicar numa barra abre a lista de Poemas (ou de Prosas, se o filtro de Tipo estiver em Prosas) já filtrada pela busca equivalente, com os mesmos textos da barra: nos gráficos de século e década, `dataobra:` ou `datareferencia:` com o intervalo de anos da barra; na distância, `distanciaobra:` ou `distanciareferencia:` com a faixa de anos da barra. Você também pode digitar esses filtros na busca de Poemas e Prosas. Na distância as barras contam entradas, e a lista traz os textos que têm ao menos uma entrada na faixa. Abaixo do seletor de fonte, o filtro de obra pessoal escolhe quais entradas de Intertextualidade e de Hipertextualidade entram: Todas as obras (padrão), Sem as pessoais ou Só as pessoais. A marca "Obra pessoal" é da entrada (marque no cadastro ou em Conexões › Fora do acervo › Corrigir obra) e serve para separar o que vem da vida particular de quem escreve, como diário, carta e conversa, do que vem do mundo externo. A tela diz quantas entradas o filtro deixa de fora. As Referências não têm a marca: na fonte Referências o filtro não vale, e em Só as pessoais a fonte Todas deixa as Referências de fora. Com o filtro ligado, clicar numa barra abre a lista com `dataobrapublica:` (sem as pessoais) ou `dataobrapessoal:` (só as pessoais), e os de distância, que também valem digitados. Embaixo há ainda o gráfico “Textos por origem da obra”, com as até 20 origens mais citadas nas entradas de Obras (cada texto conta uma vez por origem); ele segue a fonte e o filtro de obra pessoal como os outros (só as Obras têm origem, então a fonte Referências fica sem barras e Todas vale como Obras), e clicar na barra abre a lista pela busca `origem:` (ou `origempublica:` e `origempessoal:`, com o filtro ligado).',
            },
            {
                id: 'faq-valencia-temas',
                palavras: [
                    'valência',
                    'peso dos temas',
                    'agradável',
                    'desagradável',
                    'ambivalente',
                    'leve',
                    'pesado',
                    'sombrio',
                    'estatísticas',
                    'temas',
                ],
                pergunta: 'O que é a valência do tema e o que o peso dos temas mede?',
                resposta:
                    'A valência diz se o assunto de um tema é agradável, neutro, desagradável ou ambivalente (o que pesa e alivia ao mesmo tempo, como saudade). Descreve o afeto do tema, não um juízo moral: luto é desagradável sem ser ruim. É do tema, igual em todo texto, então o cartão Peso dos temas, nas Estatísticas, mostra que temas um autor escolhe, não se um poema é alegre ou sombrio. O índice vai de -1 (só temas agradáveis) a +1 (só desagradáveis); ambivalentes aparecem à parte e ficam fora da média, e tema sem valência fica fora da conta (a cobertura diz quanto). Dá para ver por autor e ao longo do ano, do Período Biográfico ou do livro; grupo com poucos textos aparece esmaecido, porque não pesa como um com muitos.',
            },
            {
                id: 'faq-valencia-lista',
                palavras: [
                    'valência',
                    'lista',
                    'colar',
                    'vários temas',
                    'em massa',
                    'sem valência',
                    'definir a valência por lista',
                    'definir por lista',
                    'lista por assunto',
                    'lista por vitrine',
                    'temas',
                ],
                pergunta: 'Posso definir a valência de vários temas de uma vez colando uma lista?',
                resposta:
                    'Pode. Na aba Temas, abra "Definir por lista", deixe o campo em Valência e escreva a valência, dois pontos e os temas separados por ponto e vírgula, por exemplo "Desagradável: Luto; Violência simbólica" e, na linha de baixo, "Agradável: Cotidiano; Amizade". Pode ter vários blocos, na mesma linha ou em linhas separadas. Os cabeçalhos aceitos são Agradável, Neutro, Desagradável e Ambivalente (com ou sem acento e maiúscula) e "Sem valência:", que limpa a valência dos temas do bloco. A vírgula faz parte do nome do tema ("Amor, perda" é um tema só). Só entram temas que já existem no cadastro: nenhum tema é criado, e o nome que não existe aparece no relatório. Um tema que a lista põe em duas valências diferentes fica de fora e também aparece no relatório, para você corrigir a lista. Conferir mostra a prévia sem gravar nada; Aplicar grava e abre um aviso com Desfazer. O mesmo bloco serve para ligar vários temas a assuntos ou a convites da vitrine: troque o campo para Assunto ou Vitrine e escreva o nome do assunto (ou do convite), dois pontos e os temas, por exemplo "Sociedade: Machismo; Polarização". Nesses dois campos a lista só acrescenta (o tema entra sem sair de nenhum outro) e só valem assuntos, convites e temas que já existem: nada é criado.',
            },
            {
                id: 'faq-vitrine-leitura',
                palavras: [
                    'vitrine de leitura',
                    'tema universal',
                    'universal',
                    'universais',
                    'vitrine',
                    'convite',
                    'sorteio',
                    'assuntos',
                    'temas',
                    'só sem vitrine',
                    'adicionar à vitrine',
                ],
                pergunta: 'O que é a vitrine de leitura e em que ela difere de um assunto?',
                resposta:
                    'A vitrine de leitura é o conjunto de convites do sorteio de leitura. Cada convite é um nome para quem lê, como "Quando o amor acaba", que reúne vários temas do cadastro (antes chamado de tema universal). Não é um assunto: o assunto organiza o cadastro e não tem limite, enquanto o convite serve só ao sorteio de leitura e são no máximo 12. Um tema pode estar em mais de um convite, e o texto não guarda convite nenhum: ele continua tendo só temas, e o convite o alcança por eles. Os convites ficam na aba Assuntos, no bloco "Vitrine de leitura (convites do sorteio de texto)", onde você cria, renomeia, reordena, escolhe os temas de cada um e exclui. "Conferir vitrine sugerida" mostra, sem gravar nada, uma vitrine pronta com 11 convites, e "Criar vitrine sugerida" a cria, com Desfazer; só entram temas que já existem no cadastro, e o que faltar aparece no relatório. Na aba Temas, cada cartão tem o seletor "Adicionar à vitrine…" (com os convites que ainda não o têm) e um selo por convite em que o tema já está; o filtro "Só sem vitrine" mostra os temas que nenhum convite reúne, com a mesma triagem do "Só sem assunto" (o tema que entra num convite fica marcado até você clicar em "Atualizar lista"), e a barra de edição em massa também tem "Adicionar à vitrine", com Desfazer. Convite sem nenhum tema fica escondido do sorteio. Excluir um tema o tira dos convites, e mesclar dois temas troca o que saiu pelo que ficou.',
            },
            {
                id: 'faq-sorteio-leitura',
                palavras: [
                    'sortear',
                    'sorteio',
                    'sortear leitura',
                    'ler',
                    'leitura',
                    'pode ser sorteado',
                    'preferidos',
                    'conteúdo sensível',
                    'peso',
                    'valência',
                    'leve',
                    'pesado',
                    'ferramentas',
                    'recentes',
                    'extensão',
                    'tamanho',
                    'curto',
                    'longo',
                    'tempo de leitura',
                    'paratexto',
                    'anexos',
                    'reconhecimentos',
                    'ficha',
                    'em construção',
                    'só o começo',
                    'reconhecidos',
                    'prêmio',
                    'premiados',
                    'menção honrosa',
                    'tradução',
                    'traduzido',
                    'elo de tradução',
                    'outra versão',
                    'idioma',
                    'idioma de preferência',
                ],
                pergunta: 'Como funciona o sorteio de leitura?',
                resposta:
                    'É a página "Sortear leitura", em Ferramentas, que escolhe um texto seu para alguém ler ("sobre o que você quer ler hoje?"). Só entra no sorteio o texto que você marcou com "Pode ser sorteado para leitura", no grupo Status e Pendências do Poema ou da Prosa (ou em massa, em Preencher campo, "Pode ser sorteado"). Mesmo marcado, texto Descartado ou Privado e texto sem corpo nunca saem. Na página, escolha o assunto do convite, em "Sobre o que você quer ler?" (cada um mostra quantos textos tem), escolha, se quiser, uma Extensão (Breve, Curto, Médio, Longo ou Extenso, também com a contagem), marque, se quiser, "Só os preferidos do autor" (autoclassificação de 4 corações ou mais), marque, se quiser, "Só os reconhecidos (com prêmio ou menção)" (só saem textos com ao menos um item em Reconhecimentos com o nome do prêmio ou a posição preenchidos, como "1º lugar" ou "Menção honrosa"; item só com ano ou nota não conta), desmarque "Incluir textos com conteúdo sensível" para não receber os textos que têm o campo Conteúdo Sensível preenchido (a caixa vem marcada, e esses textos saem com um aviso antes; a escolha fica guardada neste navegador) e escolha, se quiser, o Peso do texto (Leve, Neutro ou ambivalente, Pesado e Sem valência; pode marcar mais de uma, e sem nenhuma vale qualquer peso): o peso vem do ajuste que você deu ao texto ou, sem ele, dos temas do texto (a mesma conta das Estatísticas), e o texto sem nenhum tema classificado e sem ajuste só sai quando "Sem valência" está marcada; use Sortear; "Sortear outro" repete com os mesmos critérios. A página lembra, neste navegador, os últimos sorteados e evita repeti-los logo: evita metade dos textos possíveis, no máximo 10, então nunca fica sem o que sortear. Se um tema não tem nenhum texto com nota alta, a página oferece sortear entre todos os dele. A Extensão tem uma régua fixa, igual para todo acervo: poema se mede em versos e prosa em palavras, então "Curto" é curto para o tipo do texto. Breve é até 4 versos ou 300 palavras; Curto, de 5 a 14 versos ou de 301 a 1.000 palavras; Médio, de 15 a 40 ou de 1.001 a 7.500; Longo, de 41 a 100 ou de 7.501 a 17.500; Extenso, acima disso. Escolhida a faixa, uma legenda diz os limites e a que cada um se refere (quadra, soneto, conto, novela); os cortes de poema acima de 14 versos são convenção editorial de revistas, não regra da teoria. Tema e Extensão se contam um com o outro: se a combinação não tem texto, a página avisa e não apaga nenhuma escolha. "Só os reconhecidos" se soma a todos os outros critérios e vale também nas contagens de assunto, Extensão e Peso; se ele deixa a página sem texto, ela diz quantos textos sem prêmio nem menção cadastrados ficaram de fora por sua escolha. A caixa vem desmarcada e não fica guardada: ao reabrir a página, ela volta desmarcada. Junto ao tipo do texto sorteado aparece a extensão: a contagem de versos no poema e, na prosa, o tempo estimado de leitura (cerca de 200 palavras por minuto). Depois do texto sorteado aparece uma ficha curta com Localização, Coletâneas e Aparece em (quando houver), Idioma, Jargão e gíria e Gênero (quando preenchidos), Status, Primeira publicação (se houver data) e Autoria; se o texto não é obra própria, a ficha traz também Fonte, Edição e Grafia, sem o link da fonte. Em "Ficha do texto", logo abaixo do botão Sortear, dá para escolher Antes do texto, se você prefere saber de cara de onde e de quem é; a escolha fica guardada neste navegador. Texto longo (mais de 25 linhas) ganha "Voltar ao início" no rodapé, que leva ao título, e, com a ficha depois do texto, também "Ir para a ficha", que rola até ela. Quando o texto tem Conteúdo sensível preenchido, o aviso aparece antes e o texto só abre em "Ler mesmo assim"; com a ficha depois do texto (o padrão), ela também espera o texto abrir, e com "Antes do texto" ela aparece junto do aviso, sem revelar nada do corpo. A página só lê o acervo deste navegador: abra-a no mesmo navegador do Arquivo Poético. Ela não grava no acervo, só a lista de recentes e a escolha de onde fica a ficha. Depois do texto (e antes da ficha) aparece, quando houver, o que você escreveu para quem lê: os Comentários ao leitor e, só se marcadas como Públicas, as Notas. Em seguida vem o bloco "Paratexto", só com o que o texto tem: Descrição Visual, Anotações Marginais, Anexos (o link só abre se for http ou https, em outra aba), a Nota sobre o conjunto de anexos, "Obras citadas e adaptadas" e Reconhecimentos. As obras citadas são as Citações e Paráfrases de Intertextualidade e toda a Hipertextualidade (tradução, adaptação, paródia), cada uma só com relação, obra e autor; a entrada marcada como "Obra pessoal" nunca aparece, então marque assim o que for seu. O paratexto não tem marca própria: quem decide o que o leitor vê é a marca "Pode ser sorteado", texto a texto. Elos, Ecos, Referências, as outras relações de Intertextualidade (Alusão, Menção), Inspiração, Ocultação e as Notas que não são públicas nunca aparecem. Com Conteúdo sensível, os comentários, as Notas e o paratexto também esperam o "Ler mesmo assim", e o paratexto fica sempre depois do texto, mesmo com a ficha "Antes do texto". Texto com o status Incompleto continua sendo sorteado e aparece com "em construção" junto ao tipo, porque você pode querer a opinião de quem lê sobre algo que ainda está fazendo. Texto marcado em Leitura autônoma como "Só em sequência" ou "Só em conjunto" nunca sai, e "Só como início" sai com "só o começo" junto ao tipo (veja as perguntas sobre Leitura autônoma e sobre sigilo do autor). Um texto e a sua tradução, ligados por um Elo de relação Tradução, contam como um texto só no sorteio, então a obra não tem duas chances: quando mais de uma versão passa pelos critérios, a página escolhe uma ao acaso, e a obra inteira é evitada se qualquer versão saiu há pouco. O vínculo vale nos dois sentidos, mesmo com o Elo preenchido em um lado só, e só a relação Tradução agrupa. Abaixo do título aparece a caixa "Este texto tem uma outra versão (Elo de tradução)", com o link "Traduzido para: ..." ou "Tradução de: ..." e o idioma dela; o clique abre a outra versão ali mesmo, também depois do aviso de conteúdo sensível, e conta nos recentes. Só se oferece uma versão que também poderia ser sorteada (marcada, com status que pode sair, com corpo e que se lê sozinha) e, com o conteúdo sensível desmarcado, nenhuma sensível. Se o acervo tem obras com tradução, a página mostra, abaixo de "Ficha do texto", o seletor "Idioma de preferência (obras com tradução)", com Sem preferência e os idiomas Principais dessas obras: com um idioma escolhido, aparece a versão de idioma Principal igual; sem ela, a de idioma Secundário igual; sem nenhuma, a escolha volta a ser ao acaso. A preferência não tira texto do sorteio nem muda as contagens, vale o idioma preenchido nos dois lados e fica guardada neste navegador.',
            },
            {
                id: 'faq-leitura-autonoma',
                palavras: [
                    'leitura autônoma',
                    'só em sequência',
                    'só em conjunto',
                    'só como início',
                    'se lê sozinho',
                    'sozinho',
                    'sequência',
                    'sorteio',
                    'pode ser sorteado',
                    'só o começo',
                ],
                pergunta: 'Para que serve a Leitura autônoma?',
                resposta:
                    'Diz se o texto faz sentido quando alguém o lê sozinho, e o sorteio de leitura usa isso para não entregar a um desconhecido um texto que depende de outros. O select fica nos modais de Poema e Prosa, abaixo de "Pode ser sorteado". "Lê-se sozinho" é o padrão (e o que vale para texto antigo, sem o campo). "Só em sequência" é o texto que depende dos que vêm antes ou depois, e "Só em conjunto" o que precisa dos outros textos juntos: os dois nunca saem no sorteio, mesmo com "Pode ser sorteado" ligado, e o modal avisa quando as duas marcas estão juntas. "Só como início" é o primeiro texto de uma sequência ou de um conjunto: ele sai no sorteio, com "só o começo" junto ao tipo, para apresentar o começo de algo a quem lê. Se a página fica sem texto só por causa disso, ela diz quantos textos ficam de fora. Leitura autônoma não tem relação com Elos e Ecos, que só ligam textos, e Incompleto, Díptico e Resposta não a definem: você decide caso a caso. Também há a coluna "Leitura autônoma" (escondida por padrão), a busca `leitura:` (`leitura:*` acha os que não se leem sozinhos), o "Preencher campo" e o Importar campos.',
            },
            {
                id: 'faq-sigilo-do-autor',
                palavras: [
                    'sigilo',
                    'autor sigiloso',
                    'autor em sigilo',
                    'anonimizar autor',
                    'anonimizar',
                    'pseudônimo',
                    'heterônimo',
                    'nome civil',
                    'nome literário',
                    'anônimo',
                    'sorteio',
                    'identidade',
                ],
                pergunta: 'Como escondo meu nome civil na página do sorteio?',
                resposta:
                    'Há três níveis, e basta um pedir sigilo para ele valer; nenhum libera o que outro escondeu. No modal do Autor, a caixa "Autor sigiloso" vale para todos os textos dele. Ainda no modal do Autor, cada nome literário (heterônimo ou pseudônimo) tem, dentro do chip, a caixa "Anonimizar autor", que vale para os textos assinados com esse nome. E nos modais de Poema e Prosa a caixa "Autor em sigilo" vale só para aquele texto (e também tira os nomes civis dos autores dele dos créditos de "Obras citadas e adaptadas"). O efeito é sempre o mesmo: o nome civil não aparece junto do texto. Texto assinado com um nome literário sai só com ele, sem "pseudônimo de X"; texto assinado com o nome civil fica sem a linha de Autoria. Nos modais, uma linha ao vivo ("No sorteio: ...") mostra como a Autoria vai aparecer, e o modal do Autor avisa quando ele tem nome literário sem nenhuma marca. Só a página do sorteio aplica o sigilo: o `.md`, o `.csv`, o `.json` e o Ver são seus e continuam com o nome real. Há também a busca `sigiloso:*` e `anonimiza:*` na aba Autores e `autoremsigilo:*` em Poemas e Prosas.',
            },
            {
                id: 'faq-comentarios-ao-leitor',
                palavras: [
                    'comentários ao leitor',
                    'comentário',
                    'comentários públicos',
                    'notas públicas',
                    'pública',
                    'notas',
                    'leitor',
                    'sorteio',
                    'privado',
                ],
                pergunta: 'O que são Comentários ao leitor e Notas públicas?',
                resposta:
                    'São o jeito de o texto falar com quem o lê. Nos modais de Poema e Prosa, logo depois do texto, há três campos: Notas, a caixa Pública e Comentários ao leitor. Notas continua sendo seu espaço de trabalho e pode guardar coisa privada: só aparece fora do cadastro se você marcar a caixa Pública, e é para marcar quando o conteúdo não for comprometedor. Comentários ao leitor é escrito já pensando em quem lê, e aparece sempre que preenchido. Hoje os dois aparecem na página "Sortear leitura", depois do texto sorteado. Não confunda com o botão 💬 da barra do texto, que cria um comentário `<!-- -->` seu, invisível na Visualização e nas exportações. Dá para ligar as colunas "Notas públicas" e "Comentários ao leitor", buscar com `notapublica:*` (ou `-notapublica:*`) e `comentarioleitor:palavra`, e preencher em massa pelo painel "Preencher campo". Nas saídas, o .md e o .pdf trazem os blocos "Notas públicas" (Sim) e "Comentários ao leitor", o .csv traz as colunas notas_publicas e comentarios_ao_leitor, e o .json traz os campos notasPublicas e comentariosPublicos. Texto Privado ou Descartado nunca é sorteado, mesmo com comentários.',
            },
            {
                id: 'faq-tema-com-virgula',
                palavras: [
                    'tema',
                    'temas',
                    'vírgula',
                    'ponto e vírgula',
                    'nome do tema',
                    'separar temas',
                    'barra vertical',
                ],
                pergunta: 'Posso usar vírgula no nome de um Tema? Como separo vários Temas?',
                resposta:
                    'Pode. O nome vale como foi escrito: “Amor, perda” é um Tema só. Para digitar vários de uma vez, separe com ponto e vírgula (;): “Amor; Luto” cria dois. Na edição em massa, Enter e ; confirmam cada Tema. O ponto e vírgula e a barra vertical (|) não podem fazer parte do nome, porque são os separadores, e o app troca os dois por um espaço. Nas saídas, o .csv separa os Temas da coluna sinal_tema por “ | ”; no .md e na Visualização eles vêm separados por vírgula, e por ponto e vírgula quando algum deles tem vírgula no nome. Nos filtros de Tema da aba Exportação, separe vários por ponto e vírgula. Se uma barra ou uma reformulação resolve (“Luto/Finitude”), ela deixa essas linhas mais fáceis de ler.',
            },
            {
                id: 'faq-anotacao-descricao-visual',
                palavras: [
                    'nota',
                    'comentário',
                    'margem',
                    'imagem',
                    'ilustração',
                    'visual',
                    'descrever',
                ],
                pergunta: 'Qual a diferença entre Anotação Marginal e Descrição Visual?',
                resposta:
                    'Anotação Marginal é outra voz comentando o poema, numa fonte diferente da do texto principal, referenciando um trecho específico. Descrição Visual é o próprio poema disposto de forma incomum no espaço, na MESMA fonte, sem quebra de autoria.',
            },
            {
                id: 'faq-dominio-publico-derivado',
                palavras: [
                    'licença',
                    'autoral',
                    'direitos',
                    'biblioteca',
                    'importado',
                    'bloqueado',
                    'não consigo marcar',
                ],
                pergunta: 'Por que não consigo marcar um texto como "domínio público" direto nele?',
                resposta:
                    'Porque essa situação não é gravada no texto: ela é calculada a partir do óbito do Autor vinculado. Corrigir a data de óbito no cadastro do Autor corrige automaticamente todos os textos dele, sem precisar mexer um por um.',
            },
            {
                id: 'faq-etiquetas-tags',
                palavras: [
                    'tags',
                    'marcadores',
                    'categorias',
                    'rótulos',
                    'classificar',
                    'armazenadas',
                ],
                pergunta: 'O que são Etiquetas (Tags) e como são guardadas?',
                resposta:
                    'São as marcas de Tradição, Estilo, Relação, Sensibilidade, Tom, Domínio Imagético e Outros que você põe nos textos. Cada etiqueta existe uma vez no cadastro, na aba Etiquetas (Tags), e o texto só aponta para ela. Por isso renomear lá muda o nome em todos os textos, e duas etiquetas que dizem a mesma coisa podem ser juntadas com Mesclar. O mesmo nome pode existir em duas categorias, mas não repetido dentro de uma.',
            },
            {
                id: 'faq-etiquetas-renomear-localizar',
                palavras: [
                    'mudar nome',
                    'trocar',
                    'substituir',
                    'achar',
                    'localizar',
                    'buscar e substituir',
                    'editar',
                ],
                pergunta:
                    'Qual a diferença entre renomear uma etiqueta e trocá-la no Localizar e Substituir?',
                resposta:
                    'Renomear, na aba Etiquetas, muda a etiqueta em todos os textos de uma vez. O Localizar e Substituir mexe só nos textos que você marcar na lista: troca, naquele texto, a etiqueta pela de nome novo (criada se ainda não existe) e deixa o cadastro e os outros textos como estavam. Com o campo "Substituir por" vazio, a etiqueta sai só dos textos marcados.',
            },
            {
                id: 'faq-tag-clusters',
                palavras: ['cluster', 'agrupar', 'grupos de etiquetas', 'estatísticas'],
                pergunta: 'O que são Tag clusters (agrupamentos de etiquetas)?',
                resposta:
                    'São grupos de etiquetas que você monta à mão, na aba Tag clusters, para ler as Estatísticas por grupo em vez de por etiqueta. Um cluster pertence a uma categoria (Domínio Imagético, Tom, Tradição, Estilo, Relação ou Sensibilidade) e só aceita etiquetas dela. Uma etiqueta fica em um cluster só, ou em nenhum, e continua sendo etiqueta própria. O cluster não aparece nos modais nem é gravado nos textos: classifica a etiqueta em si. Por isso excluir um cluster só solta as etiquetas e nenhum texto muda. Um cluster pode ter subclusters (um nível só): veja a pergunta sobre subclusters.',
            },
            {
                id: 'faq-tag-clusters-subclusters',
                palavras: ['subcluster', 'mover', 'arrastar', 'hierarquia', 'nível', 'dentro'],
                pergunta: 'O que é um subcluster e como mover uma etiqueta para dentro dele?',
                resposta:
                    'Um subcluster é um grupo dentro de um cluster, na mesma categoria, para dar dois níveis de detalhe (por exemplo, o cluster “Tipografia e diagramação” com os subclusters “Arranjo no espaço da página” e “Marcas de edição”). Só existe um nível: um subcluster não tem subcluster. A etiqueta fica em um lugar só, o mais específico, e pertence ao cluster pai por consequência. Ela também pode ficar direto no pai, sem subcluster. O cluster pai conta os textos dele e dos subclusters sem somar: um texto vale uma vez. Para criar, use “+ Subcluster” no cartão do pai. Para mover uma etiqueta de um lugar para outro, clique no botão ⇄ ao lado dela e escolha o destino (“Pai” ou “Pai > Sub”, ou “Sem cluster”); em tela grande também dá para arrastar o chip até o cartão. Excluir o pai não apaga os subclusters: eles sobem para o topo. O nome pode se repetir em pais diferentes, mas não pode repetir o de um cluster de topo nem o de um irmão.',
            },
            {
                id: 'faq-tag-clusters-importar',
                palavras: ['lote', 'json', 'vários', 'muitos', 'carregar', 'subir', 'em massa'],
                pergunta: 'Como importar vários tag clusters de uma vez?',
                resposta:
                    'Na aba Tag clusters, clique em Importar clusters, escolha a categoria e cole uma linha por cluster, no formato “Cluster: etiqueta, etiqueta”. Para um subcluster, escreva o caminho: “Cluster > Subcluster: etiqueta, etiqueta” (um nível só; o pai é criado se não existir). Um título como “## Tom” troca a categoria dali em diante. O app cria os clusters e põe as etiquetas, reaproveita o cluster ou subcluster que já existe e não cria etiqueta nova: o que não existir na categoria aparece no relatório. Tudo tem Desfazer.',
            },
            {
                id: 'faq-tag-clusters-baixar',
                palavras: [
                    'exportar',
                    'download',
                    'markdown',
                    'png',
                    'pdf',
                    'imagem',
                    'selecionar',
                ],
                pergunta: 'Como baixar os tag clusters em .md, .png ou .pdf, e só alguns deles?',
                resposta:
                    'Na aba Tag clusters, o primeiro menu escolhe o que entra: o que a tela mostra (respeita a busca e o filtro de categoria), todo o cadastro ou, depois de marcar, só os selecionados. O segundo menu escolhe o formato. O .md é texto simples, bom para colar numa IA. O .png é uma imagem com o mesmo visual da aba, nas cores do tema ligado. O .pdf leva o mesmo desenho do .png, sempre em tema claro, dividido em páginas A4 sem cortar cartão ao meio; como é imagem, o texto dele não pode ser selecionado nem pesquisado. Para escolher cartões, clique em Selecionar: cada tag cluster e cada bloco de etiquetas sem cluster ganha uma caixinha. Marcar um cluster marca os subclusters dele junto, e dá para desmarcar um. Um subcluster marcado sem o pai sai como cartão solto, com o nome “Pai > Subcluster”. A seleção vale por si, passa por cima da busca e do filtro, e some ao desligar o modo. Quando o arquivo não é o cadastro inteiro, o nome ganha -filtrado ou -selecao e uma linha no topo diz o recorte.',
            },
            {
                id: 'faq-importar-campos',
                palavras: [
                    'lote',
                    'em massa',
                    'json',
                    'IA',
                    'inteligência artificial',
                    'preencher',
                    'muitos textos',
                    'automático',
                ],
                pergunta:
                    'Como preencher etiquetas, temas, pessoas e outros campos de muitos textos de uma vez?',
                resposta:
                    'Na aba Importação, clique em Importar campos (.json). O arquivo aponta cada texto pelo id ou pelo título e traz etiquetas, temas e assuntos (com papel), além de ligações de Temas a Assuntos que já existem, territorialidade, local de escrita, pessoas (com papéis), pendência e fonte. Dá para montá-lo à mão ou pedir a uma IA, entregando o modelo (de preferência o que leva o seu vocabulário) e a exportação dos textos. O app mostra a prévia antes de gravar, tira um snapshot de segurança e permite desfazer.',
            },
            {
                id: 'faq-importar-campos-regras',
                palavras: [
                    'sobrescrever',
                    'substituir',
                    'somar',
                    'duplicar',
                    'preserva',
                    'conflito',
                    'já preenchido',
                    'mesclar',
                ],
                pergunta: 'O que a importação de campos faz com o que o texto já tem?',
                resposta:
                    'Nunca tira nada. Listas (etiquetas, temas, territorialidade, pessoas, jargão e gíria) são somadas, e só o papel de um tema, de um assunto ou de uma pessoa é atualizado quando o arquivo traz outro. Campos de valor único (local de escrita, pendência e fonte) só preenchem o que está vazio, a menos que você ligue “Substituir campos simples” no modal. Etiqueta, tema, local e pessoa que não existem são criados e listados na prévia, para você pegar erro de digitação. Jargão e gíria não tem cadastro: o termo novo entra como está escrito e a prévia o marca como novo. Assunto nunca é criado.',
            },
            {
                id: 'faq-tag-clusters-contagem',
                palavras: [
                    'soma',
                    'total',
                    'maior',
                    'contagem',
                    'repetido',
                    'duplicado',
                    'conta duas vezes',
                    'estatística',
                ],
                pergunta: 'Por que a soma dos textos dos tag clusters passa do total de textos?',
                resposta:
                    'Porque um texto tem várias etiquetas, e elas podem estar em clusters diferentes. O texto conta uma vez em cada cluster que tem alguma etiqueta dele, mas só uma vez por cluster, mesmo que use duas etiquetas do mesmo grupo. No cluster pai, vale a união dos textos dele e dos subclusters, também sem somar.',
            },
            {
                id: 'faq-exportar-linhas-comuns',
                palavras: [
                    'cabeçalho',
                    'topo',
                    'repetido',
                    'markdown',
                    'word',
                    'pdf',
                    'exportação',
                    'metadados',
                ],
                pergunta: 'Por que Autoria e Fonte aparecem só no topo do meu .md, .pdf ou .docx?',
                resposta:
                    'Quando você baixa mais de um texto, as linhas que são exatamente iguais em todos eles (por exemplo Autoria, Fonte e Corrente literária) saem uma vez só, no começo do arquivo, sob "Comum a todos os textos", em vez de se repetirem em cada texto. A regra é estrita: se um único texto não tem a linha ou tem outro valor, ela continua em cada texto. Para ter tudo em cada texto, desmarque "Agrupar no topo" em "Opções de download" (a escolha fica guardada). O .json e o .csv não mudam, e baixar um texto só também não.',
            },
        ],
    },
    {
        id: 'livros',
        rotulo: 'Livros',
        perguntas: [
            {
                id: 'faq-livro-ver',
                palavras: ['visualizar', 'abrir', 'ficha', 'olho', 'ler', 'sem editar'],
                pergunta: 'Como vejo um livro inteiro, sem abrir o formulário de edição?',
                resposta:
                    'Na aba Livros, clique no olho do card. O Ver mostra a capa, as datas, o ISBN, a situação editorial, a Autoria, a equipe e créditos, o Uso de IA, a Abertura, a Sinopse, as Orelhas, a Contracapa, as lojas e os links. No fim há a seção Estrutura (partes, seções e textos do livro, fechada ao abrir) e a contagem do que o livro contém. O título de cada poema ou prosa da Estrutura abre o Ver daquele texto, e ao fechá-lo você volta ao livro, na mesma posição. No cabeçalho, Anterior e Próximo (ou as setas do teclado) andam pelos livros na ordem dos cards, respeitando a busca e os filtros que estiverem ligados, e a caixa de número leva direto a um livro. Dentro do formulário de edição, o olho azul do cabeçalho abre o Ver do mesmo livro: se houver alteração não salva, ele pergunta se você quer salvar antes.',
            },
            {
                id: 'faq-onde-aparece',
                palavras: [
                    'onde aparece',
                    'aparição',
                    'destino',
                    'posição',
                    'coletânea',
                    'vários livros',
                    'sequência',
                ],
                pergunta: 'Como digo em quais livros um poema ou prosa está, e em que posição?',
                resposta:
                    'No formulário do texto, abra o grupo "Onde aparece". Cada aparição é uma linha: escolha o Livro, a Parte ou Seção e a posição ("Posição específica", "No fim da fila" ou "Sem posição"). Use "+ Aparição" para pôr o mesmo texto em outro livro, com posição própria, e o ✕ para tirar uma linha. Ao salvar, a fila de cada lugar é renumerada. Sem lugar, o texto só consta no livro. As Coletâneas em que o texto entra aparecem logo abaixo, só para leitura: clique no nome para abrir a aba Coletâneas já nela, com uma faixa para voltar. Lá, o título de cada poema ou prosa abre o Ver do texto. Para pôr ou tirar o texto de uma Coletânea, use essa aba. Com o status Descartado o grupo fica travado, porque a origem do texto está em "Cortado de".',
            },
            {
                id: 'faq-ordem-aparicao-tabela',
                palavras: [
                    'ordem',
                    'ordenar',
                    'tabela',
                    'estrutura',
                    'vínculo',
                    'aparição principal',
                    'vários livros',
                    '+1',
                    'tooltip',
                ],
                pergunta:
                    'Por que um poema que está em dois livros aparece só uma vez na tabela, e em que ordem?',
                resposta:
                    'A tabela de Poemas e a de Prosas têm uma linha por texto. A ordem padrão (coluna Estrutura, ou Vínculo em Prosas) segue o lugar da aparição principal: a do livro de publicação mais antiga, e, se os livros não têm data ou empatam, a primeira da lista do texto. Dentro do livro, a ordem é Parte, Seção e a posição daquela aparição. Quando o texto aparece em mais lugares, a célula mostra um "+1" (ou +2, e assim por diante) e, ao passar o mouse, o tooltip lista os outros lugares. Texto que só consta num livro, sem posição, fica no fim desse livro; texto sem livro, ou só numa Coletânea, fica no fim da tabela. A ordem de gravação do acervo segue a mesma regra, então a coluna Contagem acompanha. Ordenar por outra coluna não muda nada disso: voltar a Estrutura traz a ordem de volta.',
            },
            {
                id: 'faq-busca-aparicao',
                palavras: [
                    'buscar',
                    'busca',
                    'livro:',
                    'coletanea:',
                    'parte:',
                    'secao:',
                    'avulso',
                    'vários livros',
                    'aparece em',
                ],
                pergunta:
                    'Como acho os textos de um livro ou de uma Coletânea, se um mesmo texto está em vários lugares?',
                resposta:
                    'Na busca de Poemas e Prosas, os prefixos livro:, parte: e secao: olham todos os lugares onde o texto aparece, não só o primeiro; por isso um poema em dois livros é achado por qualquer um dos dois. O prefixo coletanea: acha só as Coletâneas (livro: também acha o título da Coletânea). O filtro de livro da aba funciona do mesmo jeito, e "Avulsos" lista os textos que não aparecem em nenhum livro comum (quem só consta num livro, sem posição, não é avulso; a Coletânea não conta). Nas exportações, texto em dois ou mais livros ganha a linha "Aparece em" (no .md, .pdf e .docx e no Ver) ou a coluna aparece_em (no .csv). Nas Estatísticas, "Por Livro" conta o texto em cada livro onde ele aparece, então a soma das barras pode passar do total de textos, o que a nota sob o gráfico avisa.',
            },
            {
                id: 'faq-livro-autoria-equipe',
                palavras: [
                    'autor',
                    'tradutor',
                    'capista',
                    'créditos',
                    'colaborador',
                    'papel',
                    'ficha técnica',
                ],
                pergunta:
                    'Qual a diferença entre Autoria, Equipe e créditos e os autores dos textos?',
                resposta:
                    'A regra é: quem produz o conteúdo da obra vai em Autoria; quem produz o objeto livro vai em Equipe e créditos. Autoria é um campo do livro, ligado ao cadastro de Autores, com papéis (Autor, Coautor, Organizador, Tradutor, Prefaciador, Posfaciador, ou Outro com texto livre). Não é calculada a partir dos textos: um livro que só traz o prefácio de alguém não é "do" prefaciador, e numa coletânea a lista de autores dos textos não diz quem organizou. Por isso o Ver mostra também "Autores dos textos deste livro", que é derivada e só de leitura. Equipe e créditos aponta para o cadastro de Colaboradores (capista, ilustrador, diagramador, revisor, preparador de texto, editor, fotógrafo, ou Outro), e cada papel pode ter um escopo opcional em texto livre, como Capa, Miolo ou Encarte. A mesma pessoa pode estar nos dois, com papéis diferentes: por exemplo, Autor e Capista do próprio livro.',
            },
            {
                id: 'faq-colaboradores-cadastro',
                palavras: [
                    'equipe',
                    'pessoas',
                    'autores',
                    'cadastro',
                    'separado',
                    'ilustrador',
                    'revisor',
                ],
                pergunta: 'Por que Colaboradores é um cadastro separado de Autores e de Pessoas?',
                resposta:
                    'Porque cada cadastro responde a uma pergunta diferente. Pessoas guarda quem aparece na vida do acervo (de quem você fala, a quem dedica); Autores guarda quem escreve. Pôr capista e revisor num deles misturaria funções e sujaria as Estatísticas de cada um. Colaboradores guarda só nome, papéis habituais (um lembrete, que não limita o que você escolhe no livro), site ou contato, e não tem dados demográficos. Se um colaborador também é um Autor do acervo, dá para ligá-lo a ele, de modo opcional; a ligação com Pessoas passa pelo Autor. Excluir um colaborador usado em livros avisa em quantos ele aparece e oferece Desfazer, sem bloquear.',
            },
            {
                id: 'faq-livro-uso-ia',
                palavras: [
                    'inteligência artificial',
                    'IA',
                    'chatgpt',
                    'declarar',
                    'transparência',
                    'não informado',
                    'não usou',
                ],
                pergunta: 'Qual a diferença entre "Não informado" e "Não usou" no Uso de IA?',
                resposta:
                    '"Não informado" é o padrão, e é de propósito: um livro antigo, que nunca foi registrado, não pode afirmar que não usou IA. "Não usou" é uma afirmação sua. "Usou" abre a lista de usos, e cada item diz onde foi usada (capa, ilustração, texto, revisão, tradução, diagramação...), a ferramenta, o modelo e a versão (em campos separados, porque o mesmo produto troca de modelo e o mesmo modelo aparece em produtos diferentes), uma descrição, a data aproximada e, por último, como foi usada (gerou do zero, gerou quase pronto, gerou uma base, editou algo seu, sugeriu ideias, corrigiu, traduziu). Um item também pode apontar para um poema ou uma prosa do acervo, para dizer que aquele texto específico foi feito com IA. Há ainda uma nota geral do livro.',
            },
            {
                id: 'faq-livro-busca',
                palavras: [
                    'procurar',
                    'pesquisar',
                    'filtrar',
                    'prefixo',
                    'autor:',
                    'equipe:',
                    'achar',
                    'sintaxe',
                ],
                pergunta: 'Como funciona a busca da aba Livros?',
                resposta:
                    'A caixa procura em título, sigla, ISBN, autoria e equipe, e cada palavra separada por espaço é um termo que precisa casar (E). Com prefixo, ela afunila: autor:, papel:, equipe: e papelequipe:, com "-" na frente para excluir, e "*" para "tem" (autor:* são os livros com autoria, -equipe:* são os sem equipe). O arroba amarra pessoa e papel no mesmo livro: autor:Maria@Tradutor acha a Maria como tradutora, e não a Maria como autora de um livro em que outra pessoa traduz. Nomes casam por trecho e papéis por palavra inteira (papel:Autor não acha Coautor). Nome com espaço pede aspas. Ilustrador é papel da equipe, então o prefixo certo é equipe:, e não autor:. O ? ao lado da caixa abre a ajuda com a sintaxe, e ao digitar o começo de um prefixo aparecem sugestões. Os botões Capa, ISBN e Loja giram entre tanto faz, só com e só sem.',
            },
            {
                id: 'faq-livro-baixar',
                palavras: [
                    'exportar',
                    'download',
                    'ficha',
                    'json',
                    'csv',
                    'pdf',
                    'docx',
                    'conteúdo',
                    'sem textos',
                ],
                pergunta: 'O que sai no arquivo que baixo de um livro?',
                resposta:
                    'Só as informações do livro, nunca o conteúdo dos poemas e prosas (isso é da exportação da aba Estrutura). Saem os campos do cadastro, a Sinopse, as Orelhas e a Contracapa, as lojas e os links, a Autoria, a equipe e créditos, o Uso de IA e a contagem do que o livro contém. A forma de baixar é a mesma em três lugares: o botão do card (só aquele livro), o rodapé do Ver e a barra da aba, que tem escopo Filtrados, Todos ou Só selecionados. O formato escolhido num lugar vale para os outros. Os formatos são .json, .csv, .md, .pdf e .docx. No .json, .csv e .md a capa sai só como "tem capa". No .pdf e no .docx a imagem vai embutida, ao lado dos campos curtos, e os links ficam clicáveis. Livro sem Autoria, equipe ou Uso de IA registrados não ganha essas chaves, para nunca virar "sem autor" ou "não usou" por engano. A caixa "Incluir estrutura" (desligada na primeira vez, e a escolha fica lembrada) acrescenta a estrutura do livro só com os títulos: Partes, Seções, Elementos, poemas e prosas, e à parte os que estão ligados ao livro sem posição na estrutura. No .csv ela sai num segundo arquivo, e os dois vêm juntos num .zip. A caixa "Incluir Fora de escopo" (também desligada na primeira vez, lembrada, e só habilitada com a estrutura marcada) acrescenta, dentro da estrutura, os textos migrados para outro livro e os descartados, com o lugar onde estariam (livro, seção e posição). Sem ela, o descartado não aparece em lugar nenhum da estrutura, e o texto dos poemas e prosas nunca sai. Ela existe no rodapé do Ver e na barra da aba Livros, e o botão do card segue a escolha lembrada. A aba Coletâneas também tem o botão Baixar, com o mesmo formato e a caixa da estrutura, mas sem a do Fora de escopo, porque Coletânea não tem Fora de escopo.',
            },
        ],
    },
    {
        id: 'sonoridade-molde',
        rotulo: 'Sonoridade, Molde e Análise',
        perguntas: [
            {
                id: 'faq-sonoridade-molde',
                palavras: [
                    'escansão',
                    'métrica',
                    'planejar',
                    'analisar',
                    'antes',
                    'depois',
                    'rima',
                    'sílabas',
                ],
                pergunta: 'Qual a diferença entre Sonoridade e Molde?',
                resposta:
                    'Sonoridade é descritiva: parte de um poema já escrito e mapeia a métrica e as rimas que já estão lá. Molde é prescritivo: você planeja a estrutura (métrica, rimas) primeiro e escreve depois, guiado por essa meta, que pode até mudar no meio do processo sem perder o que já foi escrito.',
            },
            {
                id: 'faq-morfofuncionalidade',
                palavras: [
                    'progressão',
                    'estrutura',
                    'sintaxe',
                    'função',
                    'morfologia',
                    'análise gramatical',
                    'soneto',
                ],
                pergunta: 'O que é a aba Morfofuncionalidade?',
                resposta:
                    'Mapeia como um poema se organiza por dentro: Unidades (blocos com uma função, como "apresentação" ou "virada") e Eventos (uma progressão dialética pontual). Os dois podem se sobrepor livremente, o que não é erro, é só como o texto se organiza.',
            },
            {
                id: 'faq-heteronimo-pseudonimo',
                palavras: [
                    'autor fictício',
                    'nome',
                    'Pessoa',
                    'Caeiro',
                    'persona',
                    'identidade',
                    'assinatura',
                ],
                pergunta: 'Qual a diferença entre Heterônimo e Pseudônimo?',
                resposta:
                    'Heterônimo é uma identidade literária com voz e biografia próprias (caso clássico: Fernando Pessoa e Álvaro de Campos). Pseudônimo é só um nome diferente de assinatura, sem essa identidade paralela por trás.',
            },
        ],
    },
];

// Pergunta por id, ou null se não existir — mesmo espírito de
// tarefaComoFaco em como-faco-passos.js.
export function perguntaFaq(id) {
    for (const cat of CATEGORIAS_FAQ) {
        const achada = cat.perguntas.find((p) => p.id === id);
        if (achada) return achada;
    }
    return null;
}
