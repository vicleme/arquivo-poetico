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
                resposta: `Serve para **recomeçar do zero**, na aba Backup e recuperação (menu Dados). Você escolhe entre três caixas independentes:

- **Dados:** textos, livros e cadastros criados por você, capas, Versões Alternativas e os padrões de colunas salvos.
- **Preferências:** tema, colunas visíveis, itens por página, filtros e padrões das Estatísticas, templates de exportação e nomes de arquivo frequentes.
- **Cadastros pré-prontos:** períodos, movimentos e templates que vêm de fábrica. Os que algum texto usa só saem junto com os Dados.

## Nada some sem confirmação

Antes de apagar, o app baixa um backup, tira um retrato de segurança e só libera o botão depois que você digita **ESVAZIAR**.`,
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
                resposta: `**Dá**, importando o backup que o app baixou na hora.

A outra volta são os retratos automáticos (os últimos 10, guardados no navegador): eles nunca são apagados, mas cada edição nova gasta uma vaga.

## Dois detalhes

- Os padrões de colunas salvos moram nos Dados e vão no backup, então só somem junto com eles, e não ao apagar só as Preferências.
- Se houver outra aba do app aberta, ela avisa e recarrega sozinha, para não trazer o acervo antigo de volta.`,
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
                resposta: `É um **Elo registrado só de um lado**.

Como o Elo liga dois textos seus, o normal é cadastrá-lo nos dois: se o poema A diz "reescrita de B", o B deveria dizer o mesmo de volta. Quando só um dos dois tem o registro, a aba mostra o par incompleto como Buraco, para você completar.

Por isso o título de um Buraco abre direto a edição do poema, e não a visualização.`,
            },
            {
                id: 'faq-conexoes-relatorio',
                palavras: ['exportar', 'download', 'markdown', 'png', 'pdf', 'imagem', 'formato'],
                pergunta: 'O que vai em cada formato do relatório da aba Conexões?',
                resposta: `O relatório cobre só o **Dentro do acervo** (Elos e Ecos). O Fora do acervo tem o relatório dele, com botão na própria seção.

## .md

Texto simples, bom para colar numa IA. Traz:

- um resumo com as contagens;
- os **Buracos**;
- os **Elos**, um bloco por par ou por cluster (um grupo de três ou mais poemas ligados entre si);
- os **Ecos**: uma linha só para uma cadeia simples, ou uma linha por Eco quando o grafo ramifica ou converge. Grafo, aqui, é o desenho de textos ligados por setas.

A seta vai sempre do texto mais novo para o mais antigo.

## .png

Uma imagem do relatório, com os Elos em cartões e os Ecos com os diagramas que a aba desenha, nas cores do tema que estiver ligado.

## .pdf

O mesmo desenho do .png, sempre em tema claro, dividido em páginas A4 com "n / total" no rodapé. Como é imagem, o texto não pode ser selecionado nem pesquisado: para isso use o .md.`,
            },
            {
                id: 'faq-conexoes-ver-editar',
                palavras: ['abrir', 'clicar', 'editar', 'visualizar', 'título', 'buraco'],
                pergunta:
                    'Por que os títulos de Elos e Ecos abrem o Ver, e os Buracos abrem a edição?',
                resposta: `Porque cada um tem um objetivo diferente.

## Elos e Ecos abrem o Ver

Na aba Conexões você costuma estar lendo um panorama: quer lembrar que poema é aquele e como ele se liga aos outros, sem risco de mexer em nada. O Ver mostra os Elos e os Ecos do poema e tem o botão **Editar** para quando você quiser corrigir um rótulo ou um Tipo.

## Buracos abrem a edição

O Buraco é o caso contrário: o objetivo ali é consertar, então abre a edição direto.

## Alternar entre os dois

Dentro do Editar de um poema já salvo, o olho no cabeçalho leva de volta ao Ver. Se houver alteração não salva, o app pergunta "Salvar antes de ver?". Editar e Ver se alternam sobre o mesmo poema, nunca ficam empilhados.`,
            },
            {
                id: 'faq-conexoes-selecao-some',
                palavras: ['selecionar', 'marcar', 'desmarcar', 'desaparece', 'perdeu', 'ligar'],
                pergunta: 'Por que a seleção de um Eco some depois que eu ligo outro poema a ele?',
                resposta: `Porque o app lembra cada cartão pelos **poemas que ele reúne**, e não pela posição ("Grafo 2" muda de número quando entra um item novo, então a posição não serve).

## O que acontece

Ao ligar outro poema a um grafo de Ecos, o conjunto de poemas do cartão muda. O app o enxerga como outro cartão, e a seleção do antigo se perde. É raro e fácil de notar: basta selecionar de novo.

## Mesma lógica

Se você apagar um poema ou desfizer um vínculo, o item que deixou de existir sai da seleção sozinho.

A seleção vale só enquanto o modo **Selecionar** está ligado e não fica guardada entre sessões.`,
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
                resposta: `É a outra metade da aba. **Dentro do acervo** estão os Elos e os Ecos, que ligam um texto seu a outro. O **Fora do acervo** mostra o que os textos citam ou de que derivam e que não está no app: obras (Intertextualidade e Hipertextualidade), autores e fatos do mundo (Referências).

## O que ela traz

- as obras e os autores, com os textos que os usam e a relação de cada um;
- as origens das obras (o lugar ou a cultura), com as obras, os autores e os textos de cada uma;
- de qual obra cada texto deriva;
- as referências que aparecem em mais de um texto;
- os avisos de grafias parecidas que talvez sejam a mesma obra.

## Como funciona

Como os Elos e os Ecos, é só uma lente: nada mora ali, o dado continua nos campos de cada poema e prosa, e por isso o título de um texto abre o Ver.

Cada parte (Obras, Autores, Origens, Hipertextualidade, Referências recorrentes e Avisos) abre e fecha pelo título, com a contagem ao lado. "Recolher tudo" e "Expandir tudo" mexem em todas de uma vez, e o que você deixar fechado fica guardado neste navegador. Com algo digitado na busca, Obras, Autores e Origens abrem sozinhas.`,
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
                resposta: `Pelo **nome da obra mais os autores**, sem acento, sem maiúsculas e sem pontuação.

- A ordem dos autores não conta: "Tom Jobim e Vinicius de Moraes" e "Vinicius de Moraes e Tom Jobim" são a mesma obra.
- O tipo de obra, a data e a descrição não entram nessa identidade.

## Grafias parecidas

Quando duas grafias são parecidas demais (o mesmo título escrito de dois jeitos, o mesmo título com autores diferentes ou títulos parecidos do mesmo autor), a seção avisa. Você decide se junta com **Manter esta** ou deixa como está.`,
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
                resposta: `**Pode.** Em Intertextualidade e Hipertextualidade o Autor é uma lista de etiquetas: digite o nome, aperte Enter ou vírgula, e repita para cada autor (uma música com participação, um livro de várias pessoas). O campo tem autocompletar com os autores que você já usou.

## O que vale saber

- A ordem digitada é guardada, porque a participação costuma ter ordem de destaque, mas ela não muda a identidade da obra.
- Não há papel por autor (intérprete, produtor) por enquanto.
- Como a vírgula separa as etiquetas, um nome escrito com vírgula ("Andrade, Mário de") deve ser digitado sem ela.

## Entradas antigas

As que tinham um autor só em texto viraram uma etiqueta cada, sem divisão automática. No Modo revisão da seção Fora do acervo, o filtro "Autor parece ter mais de um nome" acha as que talvez precisem ser divididas.

## Personagem

Na Intertextualidade funciona do mesmo jeito: uma etiqueta por personagem (o mito de Prometeu pode citar Prometeu e Zeus), com autocompletar e Enter ou vírgula para confirmar.`,
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
                resposta: `Use o campo **Origem**, em Intertextualidade e em Hipertextualidade. É uma lista de etiquetas, como o Autor: digite o lugar ou a cultura ("Grécia", "Brasil") e aperte Enter ou vírgula.

## O que vai (e o que não vai) na Origem

- Põe só o **lugar**, não a época: o tempo já mora na data da obra.
- Não ponha **o que a obra é**: Mitologia, Conto de fadas e Folclore vão no Tipo de obra.

Exemplo, o mito de Prometeu: Tipo Mitologia, Autor vazio, Origem Grécia, Personagens Prometeu e Zeus.

## Onde ela aparece

O campo aparece nas listas, no Ver, no .md e no .csv como "origem Grécia", e tem colunas próprias no .csv.

A busca de Poemas e Prosas acha por \`origem:Grécia\` (\`origem:*\` traz quem tem alguma origem).

Nas Estatísticas, a aba Datas das obras tem o gráfico "Textos por origem da obra", que mostra de que culturas vêm as obras que você cita e abre a lista de textos ao clicar na barra.

## Uma obra, origens diferentes

A origem não faz parte da identidade da obra: cada entrada guarda a sua, então a mesma obra pode ter origem numa entrada e não em outra. Para ajudar:

- ao digitar a obra, o campo se preenche sozinho se a obra já tem uma única origem no acervo;
- o diálogo Corrigir obra (Conexões › Fora do acervo) avisa quando as entradas da obra não concordam. O acerto é feito no Modo revisão, na coluna Origem.`,
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
                resposta: `Escreva \`campo:valor\` na caixa "Buscar nas linhas", como nas abas de Poemas e Prosas, ou clique na 🔍 do cabeçalho da coluna, que põe o prefixo na busca.

## Os prefixos

texto (o título do texto), relacao, nome, autor, origem, tipo, descricao, data (as duas datas da obra), pessoal, personagem, trecho, traduzido, link, acesso e nota.

## As regras

- Termos soltos se somam.
- **ou** alterna: \`autor:Homero ou autor:Ovídio\`.
- Aspas fazem frase exata.
- \`-termo\` exclui.
- \`campo:*\` pede a coluna preenchida, então \`-origem:*\` deixa só as linhas sem origem.
- Acento e caixa não importam.
- Sem prefixo, o termo vale para todas as colunas (inclusive as escondidas).

Por exemplo, \`tipo:Mitologia -origem:*\` acha as entradas de mitologia ainda sem origem, e a barra "Editar em massa" pode aplicar a origem só a elas.

## As sugestões

Enquanto você digita, uma caixinha sugere os prefixos (digite "or" e ela oferece \`origem:\`) e, depois dos dois pontos, os valores que existem nas linhas, com quantas linhas têm cada um. As setas escolhem, Enter ou Tab aplicam e Esc fecha.

Os filtros Campo e Por preencher continuam valendo junto com a busca.`,
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
                resposta: `Na caixa "Filtrar obras, autores e origens" da seção Fora do acervo, escreva \`campo:valor\`, como nas abas de Poemas e Prosas e no Modo revisão.

## Os prefixos

texto (o título do texto), obra (ou nome), autor, origem, tipo, relacao, data (as datas da obra) e pessoal.

## As regras

- Termos soltos se somam.
- **ou** alterna: \`autor:Homero ou autor:Ovídio\`.
- Aspas fazem frase exata.
- \`-termo\` exclui.
- \`campo:*\` pede o campo preenchido, então \`-origem:*\` deixa só o que está sem origem (nas Origens, o item "Sem origem preenchida").
- Acento e caixa não importam.
- Sem prefixo, o termo vale para o nome, o autor, o tipo, a relação e os títulos.

## Nas três listas

O mesmo filtro vale para Obras, Autores e Origens. Em Autores e Origens ele vale para as obras dentro de cada item:

- \`relacao:Paródia\` mostra os autores com alguma obra em paródia, já só com essas obras;
- \`-pessoal:*\` mantém a origem com apenas as obras não pessoais (ela só some se não sobrar nenhuma).

O prefixo do próprio nome da lista (\`autor:\` em Autores, \`origem:\` em Origens) e \`pessoal:algumas\` olham o item inteiro.

## Sugestões e relatório

Enquanto você digita, uma caixinha sugere os prefixos e, depois dos dois pontos, os valores que existem, com quantas obras têm cada um. As setas escolhem, Enter ou Tab aplicam e Esc fecha. O relatório baixado (.md, .csv e .pdf) respeita o mesmo filtro, e a linha "Filtro:" do .md mostra a consulta.`,
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
                resposta: `Há dois caminhos.

- **Entradas de um mesmo autor:** abra Conexões › Fora do acervo › Corrigir autor. O campo Origem vale para todas as entradas em que ele é autor.
- **Qualquer outro grupo:** use o Modo revisão e a barra "Editar em massa as linhas do filtro".

## No Modo revisão

Filtre as linhas (por exemplo, busque "Mitologia"), escolha o campo e a mudança, e aperte **Aplicar**.

- Cada linha tem uma caixinha: marcando algumas, a mudança vale só para elas.
- A caixinha do cabeçalho marca todas as linhas do filtro, em todas as páginas.
- Sem nenhuma marcada, a mudança vale para todas as linhas que o filtro mostra.
- Mudar a busca ou o filtro solta as marcadas que saíram dele.

## O que dá para mudar

Origem (adicionar, trocar tudo, tirar umas ou tirar todas), Tipo de obra, Relação, Data da obra, Até, Obra pessoal, Personagem e Traduzido.

Personagem e Traduzido só existem na Intertextualidade: as linhas de Hipertextualidade ficam de fora, e a confirmação avisa. Adicionar ignora acento e caixa e mantém a grafia que já estava.

## Segurança

- A confirmação diz quantas entradas mudam e quantas já estavam assim.
- O app tira um backup obrigatório antes de gravar e deixa um **Desfazer** na tela.
- Com linhas alteradas e ainda não gravadas na tabela, a barra pede para gravar ou descartar antes.

Nome e Autor têm Corrigir obra e Corrigir autor. Descrição, Trecho, Link, Data de acesso e Nota são de cada entrada e ficam fora da edição em massa.`,
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
                resposta: `Cada entrada de Intertextualidade, Hipertextualidade e Referências pode ter uma **data de começo** e outra de **fim** ("até"), as duas opcionais.

## O rótulo muda com o tipo

- **Obra** e **Notícia:** data e "até".
- **Marco histórico:** início e fim.
- **Pessoa pública:** nascimento e óbito (vazio para quem está viva).

## O nível de cada ponta

Cada ponta escolhe um nível: século, década, ano, mês ou dia, com as marcas "aprox." e "a.C.". Assim você escreve "séc. XIX" quando só sabe isso, sem inventar um ano. Por baixo, o app guarda o intervalo de anos que o nível cobre, e é isso que as Estatísticas usam.

## Ao repetir a obra

A data é da obra, como a Descrição. O app sugere a data e só a preenche sozinho quando existe uma só e o campo está vazio. Com datas diferentes, aparecem os botões "Já usadas para esta obra".`,
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
                resposta: `Os quatro mexem nos textos de verdade, em todos de uma vez.

- **Corrigir obra** troca nome, autores, tipo, descrição e data da obra em todas as entradas que a usam.
- **Corrigir autor** troca a etiqueta daquele autor, inclusive nas obras com mais de um autor, e também pode definir a origem de todas as entradas dele.
- **Corrigir referência**, o botão de cada linha da lista de Referências, troca o nome, o tipo e a data da referência em todos os textos que a usam. A nota, o link e os campos de Pessoa pública de cada texto ficam como estão.
- **Manter esta** junta grafias parecidas, passando todas para a obra que você escolheu.

## Ao corrigir uma referência

- Se o tipo deixa de ser Pessoa pública, os campos de Pessoa pública saem, e a confirmação avisa.
- Se o resultado coincide com outra referência, as duas passam a contar juntas.

## Antes de gravar

O app mostra quantas entradas mudam (e quantas perdem uma descrição, uma origem ou uma data diferente da nova), tira um backup obrigatório e, depois, deixa um Desfazer na tela.

O Modo revisão faz o mesmo entrada por entrada, numa tabela, e tem a barra "Editar em massa" para aplicar o mesmo valor às linhas marcadas (ou a todas as do filtro).`,
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
                resposta: `O relatório do Fora do acervo leva um botão na própria seção. O filtro e a ordem da tela valem para Obras, Autores e Origens.

## .md

Texto simples, bom para colar numa IA. Traz obras (com autores, tipo, datas, relações e textos), autores com as obras deles, origens com as obras, os autores e os textos de cada uma, derivações, referências que se repetem e as de um texto só, e os avisos. Uma linha "Filtro:" no começo diz o que estava filtrado.

## .csv

Uma tabela por vez: obras, autores, origens, derivações, referências ou avisos. Os autores de uma obra vão separados por "; " e os itens de lista por " | ", para abrir numa planilha.

## .pdf

O mesmo conteúdo do .md em páginas A4, com texto de verdade que dá para selecionar e pesquisar (diferente do .pdf do relatório das Conexões, que é imagem).

## .png

Não há.`,
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
                resposta: `Conta os seus textos pela época e pela origem das obras que eles citam. Cada texto conta uma vez por barra.

## Os gráficos

- **Textos por século da obra** e **textos por década**.
- **Distância temporal entre obra e texto**, em faixas que se ajustam ao recorte. A largura (1, 2, 5, 10, 20, 50, 100 anos e assim por diante) é a menor que cobre as distâncias do acervo em até 12 barras, então textos concentrados num trecho aparecem divididos nele. A obra datada depois do texto tem barra própria.
- **Textos por origem da obra**, com as até 20 origens mais citadas nas entradas de Obras.

## Zoom na distância

Clicar no rótulo de uma faixa (o texto azul embaixo da barra, como "0 a 249 anos") dá zoom: o gráfico passa a mostrar só aquela faixa, em barras menores, e dá para aprofundar de novo. **Voltar** sobe um nível e **Ver tudo** volta ao gráfico inteiro. Clicar na barra continua abrindo a lista de textos.

## O mapa das origens

O gráfico de origens tem o seletor **Colunas / Mapa**. O mapa pinta os países pela quantidade de textos (mais escuro, mais textos) e aproxima com a roda do mouse, os botões, arrastando ou com a pinça (uma miniatura mostra onde você está).

Clicar num país abre a lista. As origens que não são país (como Roma Antiga) e a Desconhecida ficam numa linha à parte.

Abaixo do mapa, **Baixar .png** e **Baixar .pdf**, com a opção de levar só o enquadramento atual.

## De onde vêm os números

O seletor de fonte escolhe Obras (Intertextualidade e Hipertextualidade), Referências ou Todas; a padrão é Obras. A data da obra é o começo da entrada (ou o fim, se só ele existe), e uma Pessoa pública entra pelo nascimento.

Textos sem nenhuma data da obra ficam fora das barras. A distância usa o ano de escrita do texto, então entradas datadas de textos sem ano de escrita também ficam fora. A tela avisa quantos são.

## Obra pessoal

Abaixo do seletor de fonte, o filtro de obra pessoal escolhe quais entradas de Intertextualidade e de Hipertextualidade entram: **Todas as obras** (padrão), **Sem as pessoais** ou **Só as pessoais**. A tela diz quantas entradas o filtro deixa de fora.

A marca "Obra pessoal" é da entrada (marque no cadastro ou em Conexões › Fora do acervo › Corrigir obra). Ela separa o que vem da vida particular de quem escreve, como diário, carta e conversa, do que vem do mundo externo.

As Referências não têm a marca: na fonte Referências o filtro não vale, e em "Só as pessoais" a fonte Todas deixa as Referências de fora. O gráfico de origens segue a fonte e o filtro como os outros (só as Obras têm origem, então a fonte Referências fica sem barras e Todas vale como Obras).

## Clicar numa barra

Abre a lista de Poemas (ou de Prosas, se o filtro de Tipo estiver em Prosas) já filtrada pela busca equivalente, com os mesmos textos da barra. Você também pode digitar esses filtros na busca de Poemas e Prosas.

- **Século e década:** \`dataobra:\` ou \`datareferencia:\`, com o intervalo de anos da barra.
- **Distância:** \`distanciaobra:\` ou \`distanciareferencia:\`, com a faixa de anos da barra. Aqui as barras contam entradas, e a lista traz os textos que têm ao menos uma entrada na faixa.
- **Origem:** \`origem:\`.
- **Com o filtro de obra pessoal ligado:** \`dataobrapublica:\` (sem as pessoais) ou \`dataobrapessoal:\` (só as pessoais), com os de distância também válidos digitados, e \`origempublica:\` ou \`origempessoal:\` na origem.`,
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
                resposta: `**Valência** diz se o assunto de um tema é agradável, neutro, desagradável ou ambivalente (o que pesa e alivia ao mesmo tempo, como saudade). Ela descreve o afeto do tema, não um juízo moral: luto é desagradável sem ser ruim.

## De quem é a valência

Do **tema**, igual em todo texto. Por isso o cartão **Peso dos temas**, nas Estatísticas, mostra que temas um autor escolhe, e não se um poema é alegre ou sombrio.

## Como o índice é calculado

- Vai de **-1** (só temas agradáveis) a **+1** (só desagradáveis).
- Ambivalentes aparecem à parte e ficam fora da média.
- Tema sem valência fica fora da conta (a cobertura diz quanto).

## Recortes

Dá para ver por autor e ao longo do ano, do Período Biográfico ou do livro. Grupo com poucos textos aparece esmaecido, porque não pesa como um com muitos.`,
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
                resposta: `Pode. Na aba Temas, abra **Definir por lista**, deixe o campo em Valência e escreva a valência, dois pontos e os temas separados por ponto e vírgula. Por exemplo:

- \`Desagradável: Luto; Violência simbólica\`
- \`Agradável: Cotidiano; Amizade\`

Pode ter vários blocos, na mesma linha ou em linhas separadas.

## Regras da lista

- Os cabeçalhos aceitos são Agradável, Neutro, Desagradável e Ambivalente (com ou sem acento e maiúscula) e "Sem valência:", que limpa a valência dos temas do bloco.
- A vírgula faz parte do nome do tema ("Amor, perda" é um tema só).
- Só entram temas que já existem no cadastro: nenhum tema é criado, e o nome que não existe aparece no relatório.
- Um tema que a lista põe em duas valências diferentes fica de fora e também aparece no relatório, para você corrigir a lista.

**Conferir** mostra a prévia sem gravar nada. **Aplicar** grava e abre um aviso com Desfazer.

## Assuntos e vitrine

O mesmo bloco serve para ligar vários temas a assuntos ou a convites da vitrine: troque o campo para Assunto ou Vitrine e escreva o nome do assunto (ou do convite), dois pontos e os temas, por exemplo \`Sociedade: Machismo; Polarização\`.

Nesses dois campos a lista só acrescenta (o tema entra sem sair de nenhum outro) e só valem assuntos, convites e temas que já existem: nada é criado.`,
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
                resposta: `A **vitrine de leitura** é o conjunto de convites do sorteio de leitura. Cada convite é um nome para quem lê, como "Quando o amor acaba", que reúne vários temas do cadastro (antes chamado de tema universal).

## Convite não é assunto

- O **assunto** organiza o cadastro e não tem limite.
- O **convite** serve só ao sorteio de leitura, e são no máximo 12.
- Um tema pode estar em mais de um convite. O texto não guarda convite nenhum: ele continua tendo só temas, e o convite o alcança por eles.

## Onde ficam

Os convites ficam na aba Assuntos, no bloco "Vitrine de leitura (convites do sorteio de texto)", onde você cria, renomeia, reordena, escolhe os temas de cada um e exclui.

"Conferir vitrine sugerida" mostra, sem gravar nada, uma vitrine pronta com 11 convites, e "Criar vitrine sugerida" a cria, com Desfazer. Só entram temas que já existem no cadastro, e o que faltar aparece no relatório.

## Na aba Temas

- Cada cartão tem o seletor "Adicionar à vitrine…" (com os convites que ainda não o têm) e um selo por convite em que o tema já está.
- O filtro "Só sem vitrine" mostra os temas que nenhum convite reúne, com a mesma triagem do "Só sem assunto": o tema que entra num convite fica marcado até você clicar em "Atualizar lista".
- A barra de edição em massa também tem "Adicionar à vitrine", com Desfazer.

Convite sem nenhum tema fica escondido do sorteio. Excluir um tema o tira dos convites, e mesclar dois temas troca o que saiu pelo que ficou.`,
            },
            {
                id: 'faq-leitura-avaliativa',
                palavras: [
                    'leitura avaliativa',
                    'avaliação',
                    'avaliar',
                    'pegou',
                    'incomodou',
                    'releria',
                    'mostraria',
                    'corações',
                    'classificação',
                    'padrão das leituras',
                    'cruzamento',
                    'etiquetas',
                    'estatísticas',
                    'contraste',
                    'originalidade',
                    'comoção',
                    'cluster',
                    'tom',
                    'estilo',
                ],
                pergunta: 'Como funciona a Leitura avaliativa e a tela Leituras das Estatísticas?',
                resposta: `É a aba **Leitura avaliativa**, no grupo Análise, depois de Morfofuncionalidade. Serve para registrar o que pegou e o que incomodou em cada poema ou prosa e, com o tempo, ver o que se repete.

## Na aba

Escolha um texto na lista (com busca e os filtros Todos, Avaliados e Não avaliados, Tipo, Leitura, Classificação, Pegou, Incomodou, Releria e Mostraria). O texto abre de um lado e o formulário do outro.

- **De que maneira te pegou** tem 13 itens: Som e ritmo, Palavra, Imagem, Ideia, Voz, Atmosfera, Surpresa, Graça, Identificação, Comoção, Construção, Engenho e Originalidade. Cada um tem um nível: _Pontual_ (num momento ou num detalhe), _Marcante_ (ficou com você depois de ler) ou _Central_ (foi o que mais te pegou no texto). Clicar de novo no mesmo nível desmarca.
- **O que incomodou** tem 12 itens, sem nível: Clichê, Previsível, Explica demais, Obscuro demais, Forçado, Impreciso, Frouxo, Cansativo, Superficial, Idealizado, Problemático e Pouco trabalhado.
- **Releria?** e **Mostraria a alguém?** aceitam Sim, Talvez ou Não, e podem ficar em branco.
- **Avaliação** é a linha livre, o mesmo campo do modal do texto, sem cópia.

## Corações e várias leituras

A tela sugere os corações e diz o motivo em uma frase ("Usar a sugestão" aceita). Você escolhe de 0,5 a 5, e o valor escolhido é a **Classificação** do próprio texto, que vale no sorteio de leitura.

- Terminar a leitura sem escolher corações não mexe na Classificação.
- Trocar uma Classificação que já existe pede confirmação.
- Cada texto pode ter várias leituras, cada uma com data. "Partir desta leitura" copia o que pegou, o que incomodou e as respostas (não os corações nem a linha livre).
- Excluir um poema ou uma prosa apaga as leituras dele. O aviso de exclusão conta quantas são, e o Desfazer as devolve.

## Na busca de Poemas e Prosas

Quatro prefixos olham a leitura: \`pegou:\`, \`incomodou:\`, \`releria:\` e \`mostraria:\`.

- \`pegou:originalidade\` acha o texto cuja leitura mais recente marcou o item. \`pegou:"originalidade central"\` restringe ao nível.
- \`incomodou:clichê\` faz o mesmo no que incomodou.
- \`releria:sim\` e \`mostraria:não\` acham pela resposta.
- \`*\` quer dizer "tem algo marcado", e o \`-\` na frente inverte: \`-releria:*\` acha quem deixou em branco e também o texto nunca lido.

Vale só a leitura mais recente de cada texto, e a busca solta não olha esses campos.

## Para baixar e guardar

A caixa **Leituras** (desligada por padrão) leva as leituras no .json, .md, .pdf e .docx de Poemas e Prosas. O modal Ver mostra o bloco "Leitura avaliativa" sempre. As leituras também entram no backup e na Importação Aditiva.

## Estatísticas: a tela Leituras

Ela tem duas vistas. Cada texto conta uma vez, pela leitura mais recente, e cada tradução conta como um texto, porque Som e ritmo e Palavra mudam de uma língua para outra.

**Padrão.** Os textos lidos se dividem em três faixas pela Classificação atual de cada um (0,5 a 2 corações, 2,5 a 3,5 e 4 a 5). Cinco gráficos mostram:

- o **Contraste**: o que pesa mais nos textos que você mais ama do que nos que menos ama;
- o nível médio de cada item por faixa;
- o que incomodou, em proporção da faixa (com "x de n");
- Releria e Mostraria, em barras de 100%.

Faixa sem texto não é desenhada: ficar de fora quer dizer "não há texto", não "ninguém marcou".

**Cruzamento com etiquetas.** Escolha a Categoria (Tom, Estilo, Domínio Imagético ou Tradição) e a Medida (Pegou ou Incomodou). As linhas são os itens, e as colunas são "Todos" e os clusters de etiqueta da categoria, mais duas:

- "Sem cluster": o texto tem etiqueta da categoria, mas nenhuma está num cluster;
- "Sem etiqueta": o texto não tem etiqueta da categoria. Isso não quer dizer que falte a marca.

Cada célula mostra o nível médio do item nos textos da coluna (de 0 a 3) ou a porcentagem de textos em que o item incomodou, sempre com o "x de n" embaixo, e um traço quando ninguém da coluna marcou. As colunas somam mais que o total, porque um texto cai em todos os clusters que tem, com o peso inteiro em cada um.

Coluna com menos de 3 textos aparece como indício, e com menos de 10 textos lidos o aviso pede cautela. Clicar no nome de um cluster abre, embaixo, o detalhe por etiqueta, com um "Fechar". As escolhas da vista valem só enquanto a página está aberta.`,
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
                    'só poemas',
                    'só prosas',
                    'poema ou prosa',
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
                resposta: `É a página **Sortear leitura**, em Ferramentas. Ela escolhe um texto seu para alguém ler ("sobre o que você quer ler hoje?").

## Quais textos entram

Só entra o texto marcado com "Pode ser sorteado para leitura", no grupo Status e Pendências do Poema ou da Prosa (ou em massa, em Preencher campo, "Pode ser sorteado"). Mesmo marcado, nunca saem:

- texto Descartado ou Privado;
- texto sem corpo;
- texto marcado em Leitura autônoma como "Só em sequência" ou "Só em conjunto" (veja as perguntas sobre Leitura autônoma e sobre sigilo do autor).

Texto marcado como "Só como início" sai, com "só o começo" junto ao tipo. Texto com o status Incompleto também sai, com "em construção" junto ao tipo, porque você pode querer a opinião de quem lê sobre algo que ainda está fazendo.

## Os critérios da página

Todos são opcionais, e as contagens ao lado de cada opção mostram quantos textos ela tem.

- **Poema ou prosa:** "Poemas e prosas" (o padrão), "Só poemas" ou "Só prosas". A escolha não fica guardada.
- **Sobre o que você quer ler?** É o assunto do convite.
- **Extensão:** Breve, Curto, Médio, Longo ou Extenso (régua logo abaixo).
- **Só os meus preferidos:** Classificação de 4 corações ou mais.
- **Só os reconhecidos (com prêmio ou menção):** só saem textos com ao menos um item em Reconhecimentos com o nome do prêmio ou a posição preenchidos, como "1º lugar" ou "Menção honrosa". Item só com ano ou nota não conta. A caixa vem desmarcada e não fica guardada.
- **Incluir textos com conteúdo sensível:** a caixa vem marcada. Desmarcada, a página não traz os textos com o campo Conteúdo Sensível preenchido; marcada, eles saem com um aviso antes. A escolha fica guardada neste navegador.
- **Peso do texto:** Leve, Neutro ou ambivalente, Pesado e Sem valência. Pode marcar mais de uma, e sem nenhuma vale qualquer peso. O peso vem do ajuste que você deu ao texto ou, sem ele, dos temas do texto (a mesma conta das Estatísticas). O texto sem tema classificado e sem ajuste só sai com "Sem valência" marcada.

Os critérios se contam uns com os outros: se a combinação não tem texto, a página avisa e não apaga nenhuma escolha.

"Só os reconhecidos" vale também nas contagens de assunto, Extensão e Peso; se ele esvazia a página, ela diz quantos textos sem prêmio nem menção ficaram de fora por escolha sua.

"Poema ou prosa" vale também nas contagens dos outros critérios. Uma obra com tradução em outro tipo (um poema traduzido em prosa) aparece só com a versão do tipo escolhido, e a caixa de outras versões continua oferecendo a outra.

Se um tema não tem nenhum texto com nota alta, a página oferece sortear entre todos os dele.

## Sortear, voltar e não repetir

Use **Sortear**, e **Sortear outro** repete com os mesmos critérios.

- **Anterior** e **Próximo** ficam ao lado dos botões e percorrem, nesta visita, os textos que já passaram pela tela. Só aparecem quando há para onde ir, com a posição (por exemplo "2 de 5"). Voltar a um texto não conta como sorteio novo, e o percurso some ao fechar a página.
- **Últimos sorteados** lista os títulos dos últimos (do mais novo para o mais velho, até 10). Clicar num deles reabre o texto sem sortear de novo.
- A página lembra, neste navegador, os últimos sorteados e evita repeti-los logo: evita metade dos textos possíveis, no máximo 10, então nunca fica sem o que sortear.

## A régua da Extensão

Ela é fixa, igual para todo acervo. Poema se mede em versos e prosa em palavras, então "Curto" é curto para o tipo do texto.

- **Breve:** até 4 versos ou 300 palavras.
- **Curto:** de 5 a 14 versos ou de 301 a 1.000 palavras.
- **Médio:** de 15 a 40 versos ou de 1.001 a 7.500 palavras.
- **Longo:** de 41 a 100 versos ou de 7.501 a 17.500 palavras.
- **Extenso:** acima disso.

Escolhida a faixa, uma legenda diz os limites e a que cada um se refere (quadra, soneto, conto, novela). Os cortes de poema acima de 14 versos são convenção editorial de revistas, não regra da teoria.

## O que aparece com o texto sorteado

Junto ao tipo aparece a extensão: a contagem de versos no poema e, na prosa, o tempo estimado de leitura (cerca de 200 palavras por minuto). Depois do texto vêm, nesta ordem:

- Comentários ao leitor e, só se marcadas como Públicas, as Notas;
- o bloco **Paratexto**, só com o que o texto tem: Descrição Visual, Anotações Marginais, Anexos (o link só abre se for http ou https, em outra aba), a Nota sobre o conjunto de anexos, "Obras citadas e adaptadas" e Reconhecimentos;
- a **ficha curta**: Localização, Coletâneas e Aparece em (quando houver), Idioma, Jargão e gíria e Gênero (quando preenchidos), Status, Primeira publicação (se houver data) e Autoria. Se o texto não é obra própria, a ficha traz também Fonte, Edição e Grafia, sem o link da fonte.

Em "Ficha do texto", logo abaixo do Sortear, dá para escolher **Antes do texto**, se você prefere saber de cara de onde e de quem é. A escolha fica guardada neste navegador. Texto longo (mais de 25 linhas) ganha "Voltar ao início" no rodapé, que leva ao título, e, com a ficha depois do texto, também "Ir para a ficha".

## Baixar o texto

No rodapé do texto aberto, **Baixar .md** e **Baixar .pdf** guardam o texto que está na tela, com o título no nome do arquivo.

- O arquivo traz só o que quem lê vê: título, tipo e extensão, o texto, os comentários ao leitor, a Inspiração e as Notas públicas, o paratexto e a ficha (antes ou depois do texto, como você escolheu).
- Campos privados, o comentário do editor e o nome civil de autor em sigilo nunca saem.
- No PDF, o texto mantém cor, fundo, negrito, itálico, sublinhado e alinhamento do editor.

Atrás do aviso de conteúdo sensível não há botão: ele aparece depois de "Ler mesmo assim". A biblioteca do PDF vem da internet no primeiro clique; sem conexão, um aviso aparece ao lado do botão. Baixar não conta como sorteio novo.

## Sobre o paratexto

O paratexto não tem marca própria: quem decide o que o leitor vê é a marca "Pode ser sorteado", texto a texto. As obras citadas são as Citações e Paráfrases de Intertextualidade e toda a Hipertextualidade (tradução, adaptação, paródia), cada uma só com relação, obra e autor.

A entrada marcada como "Obra pessoal" nunca aparece, então marque assim o que for seu.

Nunca aparecem: Elos, Ecos, Referências, as outras relações de Intertextualidade (Alusão, Menção), Inspiração, Ocultação e as Notas que não são públicas.

## Conteúdo sensível

Quando o texto tem Conteúdo sensível preenchido, o aviso aparece antes e o texto só abre em "Ler mesmo assim".

Os comentários, as Notas e o paratexto esperam o mesmo clique, e o paratexto fica sempre depois do texto, mesmo com a ficha "Antes do texto".

Com a ficha depois do texto (o padrão), ela também espera o texto abrir; com "Antes do texto", ela aparece junto do aviso, sem revelar nada do corpo.

## Texto e tradução

Um texto e a sua tradução, ligados por um Elo de relação Tradução, contam como um texto só no sorteio, então a obra não tem duas chances.

Quando mais de uma versão passa pelos critérios, a página escolhe uma ao acaso, e a obra inteira é evitada se qualquer versão saiu há pouco. O vínculo vale nos dois sentidos, mesmo com o Elo preenchido em um lado só, e só a relação Tradução agrupa.

Abaixo do título aparece a caixa "Este texto tem uma outra versão (Elo de tradução)", com o link "Traduzido para: ..." ou "Tradução de: ..." e o idioma dela.

O clique abre a outra versão ali mesmo, também depois do aviso de conteúdo sensível, e conta nos recentes.

Só se oferece uma versão que também poderia ser sorteada (marcada, com status que pode sair, com corpo e que se lê sozinha) e, com o conteúdo sensível desmarcado, nenhuma sensível.

Se o acervo tem obras com tradução, a página mostra, abaixo de "Ficha do texto", o seletor **Idioma de preferência (obras com tradução)**, com Sem preferência e os idiomas Principais dessas obras.

Com um idioma escolhido, aparece a versão de idioma Principal igual; sem ela, a de idioma Secundário igual; sem nenhuma, a escolha volta a ser ao acaso.

A preferência não tira texto do sorteio nem muda as contagens, vale o idioma preenchido nos dois lados e fica guardada neste navegador.

## Onde a página lê

Ela só lê o acervo deste navegador: abra-a no mesmo navegador do Arquivo Poético. Não grava no acervo, só a lista de recentes e a escolha de onde fica a ficha.`,
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
                resposta: `Diz se o texto faz sentido quando alguém o lê sozinho, e o sorteio de leitura usa isso para não entregar a um desconhecido um texto que depende de outros. O select fica nos modais de Poema e Prosa, abaixo de "Pode ser sorteado".

## As quatro opções

- **Lê-se sozinho:** é o padrão (e o que vale para texto antigo, sem o campo).
- **Só em sequência:** o texto depende dos que vêm antes ou depois.
- **Só em conjunto:** o texto precisa dos outros textos juntos.
- **Só como início:** é o primeiro texto de uma sequência ou de um conjunto.

"Só em sequência" e "Só em conjunto" nunca saem no sorteio, mesmo com "Pode ser sorteado" ligado, e o modal avisa quando as duas marcas estão juntas. "Só como início" sai, com "só o começo" junto ao tipo, para apresentar o começo de algo a quem lê. Se a página fica sem texto só por causa disso, ela diz quantos textos ficam de fora.

## O que não define a marca

Leitura autônoma não tem relação com Elos e Ecos, que só ligam textos, e Incompleto, Díptico e Resposta não a definem: você decide caso a caso.

## Onde mais aparece

A coluna "Leitura autônoma" (escondida por padrão), a busca \`leitura:\` (\`leitura:*\` acha os que não se leem sozinhos), o "Preencher campo" e o Importar campos.`,
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
                resposta: `Há três níveis, e basta um pedir sigilo para ele valer; nenhum libera o que outro escondeu.

- **Autor sigiloso:** caixa no modal do Autor, vale para todos os textos dele.
- **Anonimizar autor:** ainda no modal do Autor, cada nome literário (heterônimo ou pseudônimo) tem essa caixa dentro do chip, e ela vale para os textos assinados com esse nome.
- **Autor em sigilo:** caixa nos modais de Poema e Prosa, vale só para aquele texto (e também tira os nomes civis dos autores dele dos créditos de "Obras citadas e adaptadas").

## O efeito

É sempre o mesmo: o nome civil não aparece junto do texto.

- Texto assinado com um nome literário sai só com ele, sem "pseudônimo de X".
- Texto assinado com o nome civil fica sem a linha de Autoria.

Nos modais, uma linha ao vivo ("No sorteio: ...") mostra como a Autoria vai aparecer, e o modal do Autor avisa quando ele tem nome literário sem nenhuma marca.

## Só a página do sorteio

Só ela aplica o sigilo: o \`.md\`, o \`.csv\`, o \`.json\` e o Ver são seus e continuam com o nome real. Há também a busca \`sigiloso:*\` e \`anonimiza:*\` na aba Autores e \`autoremsigilo:*\` em Poemas e Prosas.`,
            },
            {
                id: 'faq-comentarios-ao-leitor',
                palavras: [
                    'comentários ao leitor',
                    'comentário',
                    'comentários públicos',
                    'notas públicas',
                    'inspiração pública',
                    'inspiração',
                    'pública',
                    'notas',
                    'leitor',
                    'sorteio',
                    'privado',
                ],
                pergunta: 'O que são Comentários ao leitor e Notas públicas?',
                resposta: `São o jeito de o texto falar com quem o lê. Nos modais de Poema e Prosa, logo depois do texto, há três campos: **Notas**, a caixa **Pública** e **Comentários ao leitor**.

## Cada um

- **Notas** continua sendo seu espaço de trabalho e pode guardar coisa privada. Só aparece fora do cadastro se você marcar a caixa Pública, e é para marcar quando o conteúdo não for comprometedor.
- **Comentários ao leitor** é escrito já pensando em quem lê, e aparece sempre que preenchido.
- **Inspiração** tem a mesma caixa Pública, logo abaixo do campo (no grupo "Períodos e Inspiração"). Marcada, ela também pode aparecer para quem lê, e a ligação com pessoas (o papel "Inspiração para") nunca aparece.

Hoje os três aparecem na página "Sortear leitura", depois do texto sorteado, na ordem Comentários ao leitor, Inspiração e Notas. Texto Privado ou Descartado nunca é sorteado, mesmo com comentários.

Não confunda com o botão 💬 da barra do texto, que cria um comentário \`<!-- -->\` seu, invisível na Visualização e nas exportações.

## Colunas, busca e preenchimento

Dá para ligar as colunas "Notas públicas", "Inspiração pública" e "Comentários ao leitor", buscar com \`notapublica:*\`, \`inspiracaopublica:*\` (ou o mesmo com \`-\` na frente) e \`comentarioleitor:palavra\`, e preencher em massa pelo painel "Preencher campo".

## Nas saídas

- **.md e .pdf:** os blocos "Notas públicas" (Sim), "Inspiração pública" (Sim) e "Comentários ao leitor".
- **.csv:** as colunas \`notas_publicas\`, \`inspiracao_publica\` e \`comentarios_ao_leitor\`.
- **.json:** os campos \`notasPublicas\`, \`inspiracaoPublica\` e \`comentariosPublicos\`.`,
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
                resposta: `**Pode.** O nome vale como foi escrito: "Amor, perda" é um Tema só.

## Vários Temas de uma vez

Separe com **ponto e vírgula** (;): "Amor; Luto" cria dois. Na edição em massa, Enter e ; confirmam cada Tema. Nos filtros de Tema da aba Exportação, também separe vários por ponto e vírgula.

## O que não pode estar no nome

O ponto e vírgula e a barra vertical (|) são separadores, então o app troca os dois por um espaço. Se uma barra ou uma reformulação resolve ("Luto/Finitude"), ela deixa essas linhas mais fáceis de ler.

## Nas saídas

- **.csv:** os Temas da coluna \`sinal_tema\` vão separados por " | ".
- **.md e Visualização:** separados por vírgula, e por ponto e vírgula quando algum deles tem vírgula no nome.`,
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
                resposta: `São as marcas de Tradição, Estilo, Relação, Sensibilidade, Tom, Domínio Imagético e Outros que você põe nos textos.

## Como são guardadas

Cada etiqueta existe **uma vez** no cadastro, na aba Etiquetas (Tags), e o texto só aponta para ela.

- Renomear lá muda o nome em todos os textos.
- Duas etiquetas que dizem a mesma coisa podem ser juntadas com **Mesclar**.
- O mesmo nome pode existir em duas categorias, mas não repetido dentro de uma.`,
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
                resposta: `- **Renomear**, na aba Etiquetas, muda a etiqueta **em todos os textos** de uma vez.
- **Localizar e Substituir** mexe **só nos textos que você marcar** na lista: troca, naquele texto, a etiqueta pela de nome novo (criada se ainda não existe) e deixa o cadastro e os outros textos como estavam.

Com o campo "Substituir por" vazio, a etiqueta sai só dos textos marcados.`,
            },
            {
                id: 'faq-tag-clusters',
                palavras: ['cluster', 'agrupar', 'grupos de etiquetas', 'estatísticas'],
                pergunta: 'O que são Tag clusters (agrupamentos de etiquetas)?',
                resposta: `São grupos de etiquetas que você monta à mão, na aba Tag clusters, para ler as Estatísticas **por grupo** em vez de por etiqueta.

## Regras

- Um cluster pertence a uma categoria (Domínio Imagético, Tom, Tradição, Estilo, Relação ou Sensibilidade) e só aceita etiquetas dela.
- Uma etiqueta fica em um cluster só, ou em nenhum, e continua sendo etiqueta própria.
- Um cluster pode ter subclusters (um nível só): veja a pergunta sobre subclusters.

## O que ele não faz

O cluster não aparece nos modais nem é gravado nos textos: classifica a etiqueta em si. Por isso excluir um cluster só solta as etiquetas, e nenhum texto muda.`,
            },
            {
                id: 'faq-tag-clusters-subclusters',
                palavras: ['subcluster', 'mover', 'arrastar', 'hierarquia', 'nível', 'dentro'],
                pergunta: 'O que é um subcluster e como mover uma etiqueta para dentro dele?',
                resposta: `É um grupo **dentro de um cluster**, na mesma categoria, para dar dois níveis de detalhe. Por exemplo, o cluster "Tipografia e diagramação" com os subclusters "Arranjo no espaço da página" e "Marcas de edição".

## Como funciona

- Só existe **um nível**: um subcluster não tem subcluster.
- A etiqueta fica em **um lugar só**, o mais específico, e pertence ao cluster pai por consequência. Ela também pode ficar direto no pai, sem subcluster.
- O cluster pai conta os textos dele e dos subclusters **sem somar**: um texto vale uma vez.

## Criar e mover

- Para criar, use **+ Subcluster** no cartão do pai.
- Para mover uma etiqueta, clique no botão **⇄** ao lado dela e escolha o destino ("Pai", "Pai > Sub" ou "Sem cluster"). Em tela grande também dá para arrastar o chip até o cartão.

## Ao excluir e ao nomear

- Excluir o pai não apaga os subclusters: eles sobem para o topo.
- O nome pode se repetir em pais diferentes, mas não pode repetir o de um cluster de topo nem o de um irmão.`,
            },
            {
                id: 'faq-tag-clusters-importar',
                palavras: ['lote', 'json', 'vários', 'muitos', 'carregar', 'subir', 'em massa'],
                pergunta: 'Como importar vários tag clusters de uma vez?',
                resposta: `Na aba Tag clusters, clique em **Importar clusters**, escolha a categoria e cole **uma linha por cluster**.

## O formato

- Cluster: \`Cluster: etiqueta, etiqueta\`
- Subcluster, com o caminho: \`Cluster > Subcluster: etiqueta, etiqueta\` (um nível só; o pai é criado se não existir)
- Um título como \`## Tom\` troca a categoria dali em diante.

## O que o app faz

- Cria os clusters e põe as etiquetas.
- Reaproveita o cluster ou subcluster que já existe.
- **Não cria etiqueta nova:** o que não existir na categoria aparece no relatório.

Tudo tem Desfazer.`,
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
                resposta: `Na aba Tag clusters, use os dois menus: o primeiro escolhe **o que entra**, o segundo escolhe **o formato**.

## O que entra

- o que a tela mostra (respeita a busca e o filtro de categoria);
- todo o cadastro;
- só os selecionados (depois de marcar).

## Os formatos

- **.md:** texto simples, bom para colar numa IA.
- **.png:** imagem com o mesmo visual da aba, nas cores do tema ligado.
- **.pdf:** o mesmo desenho do .png, sempre em tema claro, dividido em páginas A4 sem cortar cartão ao meio. Como é imagem, o texto dele não pode ser selecionado nem pesquisado.

## Escolher só alguns

Clique em **Selecionar**: cada tag cluster e cada bloco de etiquetas sem cluster ganha uma caixinha.

- Marcar um cluster marca os subclusters dele junto, e dá para desmarcar um.
- Um subcluster marcado sem o pai sai como cartão solto, com o nome "Pai > Subcluster".
- A seleção passa por cima da busca e do filtro, e some ao desligar o modo.

Quando o arquivo não é o cadastro inteiro, o nome ganha \`-filtrado\` ou \`-selecao\`, e uma linha no topo diz o recorte.`,
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
                resposta: `Na aba Importação, clique em **Importar campos (.json)**.

## O que o arquivo traz

Ele aponta cada texto pelo id ou pelo título e pode trazer etiquetas, temas e assuntos (com papel), ligações de Temas a Assuntos que já existem, territorialidade, local de escrita, pessoas (com papéis), pendência e fonte.

## Como montar o arquivo

À mão, ou pedindo a uma IA: entregue o modelo (de preferência o que leva o seu vocabulário) e a exportação dos textos.

## Segurança

O app mostra a **prévia** antes de gravar, tira um snapshot de segurança e permite desfazer.`,
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
                resposta: `**Nunca tira nada.**

## Listas: somam

Etiquetas, temas, territorialidade, pessoas, jargão e gíria são somadas. Só o papel de um tema, de um assunto ou de uma pessoa é atualizado quando o arquivo traz outro.

## Valor único: só preenche o vazio

Local de escrita, pendência e fonte só entram onde o campo está vazio, a menos que você ligue **Substituir campos simples** no modal.

## O que é criado

- Etiqueta, tema, local e pessoa que não existem são criados e listados na prévia, para você pegar erro de digitação.
- Jargão e gíria não têm cadastro: o termo novo entra como está escrito, e a prévia o marca como novo.
- Assunto nunca é criado.`,
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
                resposta: `Quando você baixa **mais de um texto**, as linhas exatamente iguais em todos eles (por exemplo Autoria, Fonte e Corrente literária) saem uma vez só, no começo do arquivo, sob "Comum a todos os textos". Assim não se repetem em cada texto.

## A regra é estrita

Se um único texto não tem a linha ou tem outro valor, ela continua em cada texto.

## Para ter tudo em cada texto

Desmarque **Agrupar no topo** em "Opções de download". A escolha fica guardada.

O .json e o .csv não mudam, e baixar um texto só também não.`,
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
                resposta: `Na aba Livros, clique no **olho** do card.

## O que o Ver mostra

Capa, datas, ISBN, situação editorial, Autoria, equipe e créditos, Uso de IA, Abertura, Sinopse, Orelhas, Contracapa, lojas e links. No fim há a seção **Estrutura** (partes, seções e textos do livro, fechada ao abrir) e a contagem do que o livro contém.

O título de cada poema ou prosa da Estrutura abre o Ver daquele texto, e ao fechá-lo você volta ao livro, na mesma posição.

## Andar entre os livros

No cabeçalho, **Anterior** e **Próximo** (ou as setas do teclado) andam pelos livros na ordem dos cards, respeitando a busca e os filtros ligados. A caixa de número leva direto a um livro.

## Do formulário para o Ver

Dentro do formulário de edição, o olho azul do cabeçalho abre o Ver do mesmo livro. Se houver alteração não salva, ele pergunta se você quer salvar antes.`,
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
                resposta: `No formulário do texto, abra o grupo **Onde aparece**. Cada aparição é uma linha.

## Montar uma aparição

- Escolha o **Livro**, a **Parte** ou **Seção** e a posição ("Posição específica", "No fim da fila" ou "Sem posição").
- **+ Aparição** põe o mesmo texto em outro livro, com posição própria.
- **✕** tira uma linha.

Ao salvar, a fila de cada lugar é renumerada. Sem lugar, o texto só consta no livro.

## Coletâneas

As Coletâneas em que o texto entra aparecem logo abaixo, só para leitura. Clique no nome para abrir a aba Coletâneas já nela, com uma faixa para voltar; lá, o título de cada poema ou prosa abre o Ver do texto. Para pôr ou tirar o texto de uma Coletânea, use essa aba.

## Texto Descartado

Com o status Descartado o grupo fica travado, porque a origem do texto está em "Cortado de".`,
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
                resposta: `A tabela de Poemas e a de Prosas têm **uma linha por texto**. Quando o texto está em mais de um lugar, a célula mostra "+1" (ou +2, e assim por diante), e o tooltip lista os outros lugares.

## Em que ordem

A ordem padrão (coluna Estrutura, ou Vínculo em Prosas) segue a **aparição principal**: a do livro de publicação mais antiga. Se os livros não têm data ou empatam, vale a primeira da lista do texto. Dentro do livro, a ordem é Parte, Seção e a posição daquela aparição.

## Casos especiais

- Texto que só consta num livro, sem posição, fica no fim desse livro.
- Texto sem livro, ou só numa Coletânea, fica no fim da tabela.

## Detalhes

A ordem de gravação do acervo segue a mesma regra, então a coluna Contagem acompanha. Ordenar por outra coluna não muda nada disso: voltar a Estrutura traz a ordem de volta.`,
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
                resposta: `Na busca de Poemas e Prosas, os prefixos \`livro:\`, \`parte:\` e \`secao:\` olham **todos os lugares** onde o texto aparece, não só o primeiro. Por isso um poema em dois livros é achado por qualquer um dos dois.

## Coletâneas e avulsos

- \`coletanea:\` acha só as Coletâneas (\`livro:\` também acha o título da Coletânea).
- O filtro de livro da aba funciona do mesmo jeito.
- **Avulsos** lista os textos que não aparecem em nenhum livro comum. Quem só consta num livro, sem posição, não é avulso, e a Coletânea não conta.

## Nas exportações

Texto em dois ou mais livros ganha a linha "Aparece em" (no .md, .pdf, .docx e no Ver) ou a coluna \`aparece_em\` (no .csv).

## Nas Estatísticas

"Por Livro" conta o texto em cada livro onde ele aparece, então a soma das barras pode passar do total de textos. A nota sob o gráfico avisa.`,
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
                resposta: `A regra é uma só: **quem produz o conteúdo da obra** vai em Autoria; **quem produz o objeto livro** vai em Equipe e créditos.

## Autoria

É um campo do livro, ligado ao cadastro de Autores, com papéis: Autor, Coautor, Organizador, Tradutor, Prefaciador, Posfaciador ou Outro (texto livre).

Ela **não é calculada** a partir dos textos: um livro que só traz o prefácio de alguém não é "do" prefaciador, e numa coletânea a lista de autores dos textos não diz quem organizou. Por isso o Ver mostra também "Autores dos textos deste livro", que é derivada e só de leitura.

## Equipe e créditos

Aponta para o cadastro de Colaboradores: capista, ilustrador, diagramador, revisor, preparador de texto, editor, fotógrafo ou Outro. Cada papel pode ter um escopo opcional em texto livre, como Capa, Miolo ou Encarte.

## Nos dois ao mesmo tempo

A mesma pessoa pode estar nos dois, com papéis diferentes: por exemplo, Autor e Capista do próprio livro.`,
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
                resposta: `Porque cada cadastro responde a uma pergunta diferente:

- **Pessoas:** quem aparece na vida do acervo (de quem você fala, a quem dedica).
- **Autores:** quem escreve.
- **Colaboradores:** quem produz o objeto livro.

Pôr capista e revisor em Pessoas ou Autores misturaria funções e sujaria as Estatísticas de cada um.

## O que o cadastro guarda

Só nome, papéis habituais (um lembrete, que não limita o que você escolhe no livro) e site ou contato. Não tem dados demográficos.

## Ligação e exclusão

- Se um colaborador também é um Autor do acervo, dá para ligá-lo a ele, de modo opcional. A ligação com Pessoas passa pelo Autor.
- Excluir um colaborador usado em livros avisa em quantos ele aparece e oferece Desfazer, sem bloquear.`,
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
                resposta: `**Não informado** é o padrão, e é de propósito: um livro antigo, que nunca foi registrado, não pode afirmar que não usou IA. **Não usou** é uma afirmação sua.

## Se você marcar "Usou"

Abre a lista de usos. Cada item diz:

- **onde** a IA foi usada (capa, ilustração, texto, revisão, tradução, diagramação...);
- a **ferramenta**, o **modelo** e a **versão**, em campos separados, porque o mesmo produto troca de modelo e o mesmo modelo aparece em produtos diferentes;
- uma descrição e a data aproximada;
- **como** foi usada: gerou do zero, gerou quase pronto, gerou uma base, editou algo seu, sugeriu ideias, corrigiu ou traduziu.

## Extras

Um item também pode apontar para um poema ou uma prosa do acervo, para dizer que aquele texto específico foi feito com IA. Há ainda uma nota geral do livro.`,
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
                resposta: `A caixa procura em **título, sigla, ISBN, autoria e equipe**. Cada palavra separada por espaço é um termo, e todos precisam casar (E).

## Afunilar com prefixo

- \`autor:\` e \`equipe:\` olham a autoria e a equipe.
- \`papel:\` e \`papelequipe:\` olham o papel da pessoa.
- \`-\` na frente exclui: \`-equipe:*\` são os livros sem equipe.
- \`*\` quer dizer "tem": \`autor:*\` são os livros com autoria.

## Pessoa e papel no mesmo livro

O arroba amarra os dois: \`autor:Maria@Tradutor\` acha a Maria **como tradutora**, e não a Maria como autora de um livro em que outra pessoa traduz.

## Detalhes que evitam surpresa

- Nomes casam por trecho; papéis, por palavra inteira (\`papel:Autor\` não acha Coautor).
- Nome com espaço pede aspas.
- Ilustrador é papel da equipe, então o prefixo certo é \`equipe:\`, e não \`autor:\`.

## Ajuda na própria caixa

O **?** ao lado da caixa abre a ajuda com a sintaxe, e ao digitar o começo de um prefixo aparecem sugestões. Os botões **Capa**, **ISBN** e **Loja** giram entre tanto faz, só com e só sem.`,
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
                resposta: `Só as informações do livro, nunca o conteúdo dos poemas e prosas (isso é da exportação da aba Estrutura). Saem os campos do cadastro, a Sinopse, as Orelhas e a Contracapa, as lojas e os links, a Autoria, a equipe e créditos, o Uso de IA e a contagem do que o livro contém.

## Onde e em que formato

A forma de baixar é a mesma em três lugares: o botão do card (só aquele livro), o rodapé do Ver e a barra da aba, que tem escopo Filtrados, Todos ou Só selecionados. O formato escolhido num lugar vale para os outros.

- **.json, .csv e .md:** a capa sai só como "tem capa".
- **.pdf e .docx:** a imagem vai embutida, ao lado dos campos curtos, e os links ficam clicáveis.

Livro sem Autoria, equipe ou Uso de IA registrados não ganha essas chaves, para nunca virar "sem autor" ou "não usou" por engano.

## Incluir estrutura

A caixa "Incluir estrutura" (desligada na primeira vez, e a escolha fica lembrada) acrescenta a estrutura do livro só com os títulos: Partes, Seções, Elementos, poemas e prosas, e à parte os que estão ligados ao livro sem posição na estrutura. No .csv ela sai num segundo arquivo, e os dois vêm juntos num .zip.

## Incluir Fora de escopo

A caixa "Incluir Fora de escopo" (também desligada na primeira vez, lembrada, e só habilitada com a estrutura marcada) acrescenta, dentro da estrutura, os textos migrados para outro livro e os descartados, com o lugar onde estariam (livro, seção e posição).

Sem ela, o descartado não aparece em lugar nenhum da estrutura, e o texto dos poemas e prosas nunca sai.

Ela existe no rodapé do Ver e na barra da aba Livros, e o botão do card segue a escolha lembrada.

## Coletâneas

A aba Coletâneas também tem o botão Baixar, com o mesmo formato e a caixa da estrutura, mas sem a do Fora de escopo, porque Coletânea não tem Fora de escopo.`,
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
