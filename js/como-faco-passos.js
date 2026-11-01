// ============================================================
// como-faco-passos.js — só os DADOS do bloco "Como eu faço para..." da
// Central de Ajuda (Bloco 3). Cada tarefa é um mini-tour de 1 a 3 passos,
// reaproveitando o MESMO motor de tour-passos.js/tour.js — mesmo formato
// de passo (id, titulo, texto, seletor, seletorAlternativo, aba). Só o
// agrupamento por tarefa é novo aqui.
//
// Cada tarefa tem também uma `descricao` (1 a 3 frases, só texto) mostrada
// acima do botão "Mostrar na tela": quem prefere ler, ou está no celular,
// entende o que vai acontecer sem precisar rodar o mini-tour.
//
// Cada tarefa tem ainda `palavras`: sinônimos e o jeito que a pessoa costuma
// dizer ("apagar", "zerar"), lidos só pela busca da Central (busca-ajuda.js)
// e nunca mostrados na tela.
//
// Lista curta de propósito (mesmo espírito do Bloco 2: começar com o
// essencial e crescer aos poucos, tarefa por tarefa, em vez de nascer
// completa).
// ============================================================

const MENU_MOBILE = '#btn-menu-mobile';

// Grupos do "Como eu faço para...": a ordem daqui é a da tela, e dentro de
// cada grupo as tarefas seguem a ordem de TAREFAS_COMO_FACO. Toda tarefa
// aponta para um grupo pela chave `grupo` (um teste falha se faltar ou se o
// grupo não existir), para tarefa nova nunca ficar solta.
export const GRUPOS_COMO_FACO = [
    { id: 'registrar', rotulo: 'Registrar e importar textos' },
    { id: 'etiquetas', rotulo: 'Etiquetas e clusters' },
    { id: 'sonoridade', rotulo: 'Sonoridade e Molde' },
    { id: 'conexoes', rotulo: 'Conexões e relatórios' },
    { id: 'livros', rotulo: 'Livros' },
    { id: 'acervo', rotulo: 'Backup e acervo' },
];

export const TAREFAS_COMO_FACO = [
    {
        id: 'registrar-poema',
        palavras: [
            'criar',
            'novo',
            'cadastrar',
            'escrever',
            'adicionar',
            'inserir',
            'salvar',
            'texto',
            'verso',
        ],
        grupo: 'registrar',
        titulo: 'Registrar um poema',
        descricao:
            'Na aba Poemas, clique em Novo Poema. O formulário é dividido em grupos que abrem e fecham, então dá pra preencher só o Texto e completar o resto depois. Depois de salvo, a busca da mesma aba acha o poema por título, tema, pessoa ou qualquer outro campo.',
        passos: [
            {
                id: 'cf-registrar-poema-1',
                titulo: 'Abra o formulário',
                texto: 'Clique aqui pra criar um poema novo. O formulário é dividido em grupos que abrem e fecham, então dá pra preencher só o Texto e voltar depois pro resto.',
                aba: 'poemas',
                seletor: '#btn-novo-poema',
            },
            {
                id: 'cf-registrar-poema-2',
                titulo: 'Ache de novo depois',
                texto: 'Depois de salvo, o poema aparece nesta lista. Use a busca aqui pra achá-lo por título, tema, pessoa ou qualquer outro campo.',
                aba: 'poemas',
                seletor: '#busca-poemas',
            },
        ],
    },
    {
        id: 'importar-dominio-publico',
        palavras: [
            'biblioteca',
            'Camões',
            'Pessoa',
            'Machado',
            'clássicos',
            'autores',
            'pacote',
            'domínio público',
            'trazer',
            'carregar',
            'obra pronta',
        ],
        grupo: 'registrar',
        titulo: 'Importar um pacote pronto da Biblioteca',
        descricao:
            'Na aba Biblioteca, escolha o pacote de um autor (Camões, Pessoa, Machado de Assis...) e clique em Usar este pacote. Isso leva à Importação, dentro de Dados, onde você revisa autor e duplicatas antes de confirmar. Pra trazer uma obra que não está na Biblioteca, veja a tarefa seguinte.',
        passos: [
            {
                id: 'cf-biblioteca-1',
                titulo: 'Escolha um pacote',
                texto: 'Aqui há pacotes prontos de autores como Camões, Pessoa e Machado de Assis. Clique em "Usar este pacote" no autor que quiser.',
                aba: 'biblioteca',
                seletor: '#biblioteca-intro',
            },
            {
                id: 'cf-biblioteca-2',
                titulo: 'Confira antes de aplicar',
                texto: 'Ao clicar em Usar este pacote, você cai direto aqui, sem passar pelo menu. Esta área mostra o que vai ser somado ao acervo: confira autor e duplicatas antes de clicar em Aplicar.',
                aba: 'importacao-aditiva',
                seletor: '#importacao-aditiva-preview',
            },
        ],
    },
    {
        id: 'importar-texto-proprio',
        palavras: [
            'colar',
            'txt',
            'markdown',
            'subir arquivo',
            'enviar',
            'upload',
            'carregar',
            'obra própria',
            'domínio público',
        ],
        grupo: 'registrar',
        titulo: 'Trazer um texto que não está na Biblioteca',
        descricao:
            'Na aba Biblioteca, abra Importar de texto e suba um .txt ou .md (cada texto começa com uma linha # Título) ou cole o texto direto. Informe autor, ano de óbito e fonte, e clique em Enviar para a Importação. O app usa o ano de óbito pra indicar a situação de domínio público, mas é só uma indicação: edições e traduções podem ter proteção própria.',
        passos: [
            {
                id: 'cf-texto-1',
                titulo: 'Abra Importar de texto',
                texto: 'Aqui você cola um texto ou sobe um .txt/.md, informa autor, fonte e ano de óbito e clica em Enviar para a Importação.',
                aba: 'biblioteca',
                seletor: '#biblioteca-importar-texto',
            },
            {
                id: 'cf-texto-2',
                titulo: 'Confira na Importação',
                texto: 'O envio cai aqui. Nada entra no acervo antes de você conferir autor e duplicatas e clicar em Aplicar.',
                aba: 'importacao-aditiva',
                seletor: '#importacao-aditiva-preview',
            },
        ],
    },
    {
        id: 'escandir-poema',
        palavras: [
            'escansão',
            'métrica',
            'sílabas',
            'rima',
            'rimas',
            'ritmo',
            'versos',
            'análise sonora',
            'eco sonoro',
        ],
        grupo: 'sonoridade',
        titulo: 'Escandir um poema (Sonoridade)',
        descricao:
            'No menu Análise, abra Sonoridade e clique em Adicionar Escansão, escolhendo o poema que quer mapear. Depois de cadastrada, dá pra achar a escansão pela busca, por poema, forma ou qualquer campo de classificação.',
        passos: [
            {
                id: 'cf-sonoridade-1',
                titulo: 'Abra Sonoridade',
                texto: 'No menu Análise, abra a aba Sonoridade e clique em "Adicionar Escansão", escolhendo o poema que quer mapear.',
                seletor: '#grupo-analise-btn',
                seletorAlternativo: MENU_MOBILE,
            },
            {
                id: 'cf-sonoridade-2',
                titulo: 'Ache uma escansão já feita',
                texto: 'Depois de cadastrada, busque aqui por poema, forma ou qualquer campo de classificação.',
                aba: 'sonoridade',
                seletor: '#busca-sonoridade',
            },
        ],
    },
    {
        id: 'planejar-molde',
        palavras: [
            'criar',
            'rascunho',
            'métrica',
            'rima',
            'forma',
            'estrutura',
            'soneto',
            'modelo',
            'gabarito',
            'antes de escrever',
        ],
        grupo: 'sonoridade',
        titulo: 'Planejar um poema antes de escrever (Molde)',
        descricao:
            'No menu Criação, abra Moldes e clique em + Molde pra definir métrica e rimas antes de o poema existir. A grade de escrita compara a contagem de sílabas com o alvo enquanto você digita, e no fim é só promover o Molde a Poema.',
        passos: [
            {
                id: 'cf-molde-1',
                titulo: 'Abra Moldes',
                texto: 'No menu Criação, abra Moldes e clique em "+ Molde" pra montar a meta estrutural (métrica, rimas) antes de o poema existir.',
                seletor: '#grupo-criacao-btn',
                seletorAlternativo: MENU_MOBILE,
            },
            {
                id: 'cf-molde-2',
                titulo: 'Escreva guiado pela meta',
                texto: 'A grade de escrita mostra a contagem de sílabas comparada ao alvo em tempo real, enquanto você digita. Quando terminar, é só promover o Molde a Poema.',
                aba: 'moldes',
                seletor: '#busca-moldes',
            },
        ],
    },
    {
        id: 'organizar-etiquetas',
        palavras: [
            'tags',
            'apagar etiqueta',
            'excluir',
            'deletar',
            'unir',
            'fundir',
            'mesclar',
            'renomear',
            'mudar nome',
            'categoria',
            'trocar',
        ],
        grupo: 'etiquetas',
        titulo: 'Organizar as etiquetas (renomear, juntar, mover)',
        descricao:
            'Na aba Etiquetas (Tags), as etiquetas aparecem por categoria. Em cada cartão, Editar renomeia em todos os textos, Mesclar junta duas da mesma categoria, "Mover para…" troca a categoria e leva os textos junto, e Excluir só aparece para quem nenhum texto usa. Tudo tem Desfazer.',
        passos: [
            {
                id: 'cf-etiquetas-1',
                titulo: 'Ache a etiqueta',
                texto: 'Busque pelo nome ou filtre por categoria. "Outros (triagem)" mostra o que ainda não tem categoria, e "Só sem texto" mostra as que nenhum texto usa.',
                aba: 'etiquetas',
                seletor: '#busca-etiquetas',
            },
            {
                id: 'cf-etiquetas-2',
                titulo: 'Confira as possíveis duplicatas',
                texto: 'Quando duas etiquetas da mesma categoria parecem a mesma coisa, elas aparecem aqui. Escolha qual manter ou marque "Não são iguais".',
                aba: 'etiquetas',
                seletor: '#duplicatas-etiquetas',
            },
        ],
    },
    {
        id: 'classificar-valencia-temas',
        palavras: [
            'valência',
            'agradável',
            'desagradável',
            'ambivalente',
            'neutro',
            'temas',
            'classificar',
            'peso dos temas',
            'leve',
            'pesado',
            'estatísticas',
            'lista',
            'colar',
        ],
        grupo: 'etiquetas',
        titulo: 'Classificar a valência dos temas',
        descricao:
            'Na aba Temas, cada tema pode ser Agradável, Neutro, Desagradável ou Ambivalente (o que pesa e alivia ao mesmo tempo, como saudade). O botão “Aplicar valências sugeridas” dá um primeiro passo nos temas da amostra; o resto você classifica pelo seletor do cartão, em massa ou colando uma lista. As Estatísticas usam isso no cartão “Peso dos temas”.',
        passos: [
            {
                id: 'cf-valencia-1',
                titulo: 'Comece pela amostra',
                texto: 'Este botão preenche a valência dos temas da amostra que ainda estão sem valência. Não troca a que você já definiu, e dá para desfazer no aviso.',
                aba: 'temas',
                seletor: '#btn-valencias-sugeridas',
            },
            {
                id: 'cf-valencia-2',
                titulo: 'Ache os que faltam',
                texto: 'Filtre por “Sem valência”, marque “Selecionar todos os que aparecem” (ou escolha uns poucos) e use “Definir valência” na barra que surge. Também dá para trocar a valência direto no cartão do tema.',
                aba: 'temas',
                seletor: '#filtro-temas-valencia',
            },
            {
                id: 'cf-valencia-3',
                titulo: 'Ou cole uma lista',
                texto: 'Em "Definir por lista" (campo Valência), escreva a valência, dois pontos e os temas separados por ponto e vírgula ("Desagradável: Luto; Violência simbólica"), com um bloco por valência. Conferir mostra a prévia sem gravar; Aplicar grava, e o aviso tem Desfazer. Só entram temas que já existem no cadastro.',
                aba: 'temas',
                seletor: '#temas-valencia-lista',
            },
        ],
    },
    {
        id: 'sorteio-leitura',
        palavras: [
            'sortear',
            'sorteio',
            'leitura',
            'vitrine de leitura',
            'tema universal',
            'universais',
            'convite',
            'vitrine',
            'pode ser sorteado',
            'ler',
        ],
        grupo: 'etiquetas',
        titulo: 'Preparar o sorteio de leitura',
        descricao:
            'O sorteio de leitura escolhe um texto seu para alguém ler. Você monta a vitrine de leitura na aba Assuntos, marca quais textos podem sair e abre a página Sortear leitura em Ferramentas.',
        passos: [
            {
                id: 'cf-sorteio-1',
                titulo: 'Monte a vitrine de leitura',
                texto: 'Abra este bloco, na aba Assuntos. "Criar vitrine sugerida" cria uma vitrine pronta com os temas que você já tem (dá para desfazer), ou crie os seus pelo nome do convite e escolha os temas de cada um. São no máximo 12 convites.',
                aba: 'assuntos',
                seletor: '#universais-bloco',
            },
            {
                id: 'cf-sorteio-1b',
                titulo: 'Ligue os temas aos convites',
                texto: 'Na aba Temas, use "Adicionar à vitrine…" em cada cartão, ou marque vários temas e use "Adicionar à vitrine" na barra de edição em massa. O filtro "Só sem vitrine" (aparece quando já existe algum convite) mostra os temas que nenhum convite reúne.',
                aba: 'temas',
                seletor: '#busca-temas',
            },
            {
                id: 'cf-sorteio-2',
                titulo: 'Marque os textos e sorteie',
                texto: 'Só entra no sorteio o texto marcado com "Pode ser sorteado para leitura" (no grupo Status e Pendências do Poema ou da Prosa, ou em massa, em Preencher campo). Depois, abra Ferramentas e escolha "Sortear leitura".',
                seletor: '#grupo-ferramentas-btn',
                seletorAlternativo: MENU_MOBILE,
            },
        ],
    },
    {
        id: 'agrupar-etiquetas',
        palavras: [
            'cluster',
            'clusters',
            'subcluster',
            'grupos',
            'agrupar',
            'juntar etiquetas',
            'tags',
            'estatísticas',
        ],
        grupo: 'etiquetas',
        titulo: 'Agrupar etiquetas em tag clusters',
        descricao:
            'Na aba Tag clusters (agrupamentos de etiquetas), você cria grupos por categoria e coloca as etiquetas neles. O cluster não aparece nos textos: serve para ler as Estatísticas por grupo. Um cluster pode ter subclusters (um nível). Excluir um cluster só solta as etiquetas, e tudo tem Desfazer.',
        passos: [
            {
                id: 'cf-clusters-1',
                titulo: 'Crie um tag cluster',
                texto: 'Escolha o nome e a categoria (Domínio Imagético, Tom, Tradição, Estilo, Relação ou Sensibilidade). A categoria não muda depois.',
                aba: 'tag-clusters',
                seletor: '#busca-tag-clusters',
            },
            {
                id: 'cf-clusters-2',
                titulo: 'Classifique as etiquetas sem cluster',
                texto: 'Na lista “Etiquetas sem cluster”, escolha o cluster de cada uma. Também dá para classificar pelo cartão do cluster ou pelo cartão da aba Etiquetas.',
                aba: 'tag-clusters',
                seletor: '#etiquetas-sem-cluster',
            },
            {
                id: 'cf-clusters-sub',
                titulo: 'Divida um cluster em subclusters',
                texto: 'No cartão do cluster, clique em “+ Subcluster”. Para mover uma etiqueta entre o pai e os subclusters, use o botão ⇄ ao lado dela e escolha o destino; em tela grande dá para arrastar o chip até o cartão.',
                aba: 'tag-clusters',
                seletor: '#lista-tag-clusters',
            },
            {
                id: 'cf-clusters-3',
                titulo: 'Ou importe vários de uma vez',
                texto: 'Em Importar clusters, cole uma linha por cluster, no formato “Cluster: etiqueta, etiqueta” (ou “Cluster > Subcluster: etiqueta, etiqueta”). O relatório mostra o que não foi achado, e dá para desfazer a importação inteira.',
                aba: 'tag-clusters',
                seletor: '#btn-importar-tag-clusters',
            },
        ],
    },
    {
        id: 'importar-campos-em-massa',
        palavras: [
            'json',
            'lote',
            'vários textos',
            'muitos',
            'preencher',
            'IA',
            'inteligência artificial',
            'atualizar',
            'temas',
            'assuntos',
            'local',
            'pessoas',
            'gíria',
        ],
        grupo: 'registrar',
        titulo: 'Preencher campos de muitos textos de uma vez (importar .json)',
        descricao:
            'Na aba Importação, o botão Importar campos soma etiquetas, temas, assuntos, territorialidade, pessoas e jargão e gíria a textos que já existem, e preenche local de escrita, pendência e fonte. O arquivo é feito à mão ou por uma IA, e você confere tudo antes de aplicar.',
        passos: [
            {
                id: 'cf-campos-1',
                titulo: 'Abra Importar campos',
                texto: 'No cartão “Importar campos em textos que já existem”, clique em Importar campos (.json). No modal, baixe o modelo (ou o modelo com o seu vocabulário, para a IA reaproveitar os nomes).',
                aba: 'importacao-aditiva',
                seletor: '#btn-abrir-importar-campos',
            },
        ],
    },
    {
        id: 'baixar-relatorio-conexoes',
        palavras: [
            'exportar',
            'download',
            'salvar',
            'relatório',
            'elos',
            'ecos',
            'buracos',
            'markdown',
            'imagem',
            'png',
            'pdf',
            'ligações',
        ],
        grupo: 'conexoes',
        titulo: 'Baixar o relatório das Conexões (.md, .png ou .pdf)',
        descricao:
            'Na aba Conexões, o primeiro menu escolhe o que entra (tudo de dentro do acervo, só Elos ou só Ecos; o Fora do acervo tem o botão dele, na própria seção) e o segundo escolhe o formato: .md é texto simples, bom para colar numa IA; .png e .pdf trazem os desenhos. Depois é clicar em Baixar.',
        passos: [
            {
                id: 'cf-conexoes-relatorio-1',
                titulo: 'Escolha o que baixar',
                texto: 'Tudo de dentro do acervo (Elos e Ecos), só os Elos ou só os Ecos. Os Buracos (Elos registrados só de um lado) vêm junto com os Elos.',
                aba: 'conexoes',
                seletor: '#conexoes-baixar-escopo',
            },
            {
                id: 'cf-conexoes-relatorio-2',
                titulo: 'Escolha o formato',
                texto: 'O .md é texto simples. O .png é uma imagem, nas cores do tema ligado. O .pdf leva o mesmo desenho do .png em páginas A4, sempre em tema claro (o texto dele não é selecionável).',
                aba: 'conexoes',
                seletor: '#conexoes-baixar-formato',
            },
            {
                id: 'cf-conexoes-relatorio-3',
                titulo: 'Baixe',
                texto: 'O arquivo sai como conexoes, conexoes-elos ou conexoes-ecos, com a extensão escolhida.',
                aba: 'conexoes',
                seletor: '#conexoes-baixar',
            },
        ],
    },
    {
        id: 'baixar-selecao-conexoes',
        palavras: [
            'exportar',
            'download',
            'escolher',
            'marcar',
            'alguns',
            'selecionar',
            'elos',
            'ecos',
            'buracos',
            'ligações',
        ],
        grupo: 'conexoes',
        titulo: 'Baixar só alguns itens das Conexões',
        descricao:
            'Na aba Conexões, o botão Selecionar põe uma caixinha em cada Buraco, Elo e Eco. Selecione os que quiser, escolha o formato e clique em Baixar: o arquivo sai como conexoes-selecao, só com o que foi selecionado. A seleção vale enquanto o modo estiver ligado.',
        passos: [
            {
                id: 'cf-conexoes-selecao-1',
                titulo: 'Ligue o modo Selecionar',
                texto: 'Cada Buraco, cada cartão de Elo (par ou cluster) e cada cartão de Eco ganha uma caixinha. A barra que aparece mostra quantos estão selecionados e tem Marcar todos e Limpar.',
                aba: 'conexoes',
                seletor: '#conexoes-modo-selecao',
            },
            {
                id: 'cf-conexoes-selecao-2',
                titulo: 'Confira o escopo',
                texto: 'Ao selecionar o primeiro item, o menu muda sozinho para “Só selecionados”. Escolha o formato ao lado (.md, .png ou .pdf).',
                aba: 'conexoes',
                seletor: '#conexoes-baixar-escopo',
            },
            {
                id: 'cf-conexoes-selecao-3',
                titulo: 'Baixe',
                texto: 'O resumo do topo do arquivo conta só o que você selecionou, e só entram as seções com algo selecionado.',
                aba: 'conexoes',
                seletor: '#conexoes-baixar',
            },
        ],
    },
    {
        id: 'baixar-relatorio-fora-do-acervo',
        palavras: [
            'exportar',
            'download',
            'salvar',
            'relatório',
            'obras',
            'autores',
            'citações',
            'referências',
            'intertextualidade',
            'hipertextualidade',
            'fora do acervo',
            'csv',
            'planilha',
            'markdown',
            'pdf',
        ],
        grupo: 'conexoes',
        titulo: 'Baixar o relatório do Fora do acervo (.md, .csv ou .pdf)',
        descricao:
            'Na aba Conexões, a seção Fora do acervo tem o botão de baixar dela, na caixa do filtro. Escolha o que entra (tudo, ou só Obras, Autores, Derivações, Referências ou Avisos) e o formato, e clique em Baixar. O filtro e a ordem que estiverem na tela valem para Obras e Autores.',
        passos: [
            {
                id: 'cf-fora-relatorio-1',
                titulo: 'Escolha o que baixar',
                texto: 'Tudo, ou um bloco só da seção. Com o formato .csv, “Tudo” fica desabilitado, porque o .csv é uma tabela por vez e o menu passa para “Só Obras”.',
                aba: 'conexoes',
                seletor: '#conexoes-fora-baixar-escopo',
            },
            {
                id: 'cf-fora-relatorio-2',
                titulo: 'Escolha o formato',
                texto: 'O .md é texto simples, bom para colar numa IA. O .csv abre numa planilha. O .pdf leva o mesmo conteúdo do .md, com texto que dá para selecionar e pesquisar. Não há .png nesta seção.',
                aba: 'conexoes',
                seletor: '#conexoes-fora-baixar-formato',
            },
            {
                id: 'cf-fora-relatorio-3',
                titulo: 'Baixe',
                texto: 'O arquivo sai como fora-do-acervo, ou fora-do-acervo-obras e semelhantes, com a extensão escolhida. No .md, uma linha “Filtro:” no começo diz o que estava filtrado.',
                aba: 'conexoes',
                seletor: '#conexoes-fora-baixar',
            },
        ],
    },
    {
        id: 'revisar-fora-do-acervo',
        palavras: [
            'corrigir',
            'revisar',
            'editar',
            'tabela',
            'planilha',
            'autor',
            'autores',
            'data',
            'obra',
            'duplicata',
            'juntar',
            'renomear',
            'modo revisão',
            'intertextualidade',
            'hipertextualidade',
            'referências',
        ],
        grupo: 'conexoes',
        titulo: 'Corrigir de uma vez as obras, os autores e as datas citados',
        descricao:
            'Na seção Fora do acervo, o Modo revisão troca as listas por uma tabela com uma linha por entrada (relação, obra, autor, tipo, descrição e mais). Edite as células e clique em Revisar e gravar: o app tira um backup, mostra quantas entradas mudam, grava e deixa um Desfazer na tela. Para trocar o nome de uma obra ou de um autor em todos os textos, use Corrigir obra e Corrigir autor nos cartões da seção.',
        passos: [
            {
                id: 'cf-fora-revisao-1',
                titulo: 'Ligue o Modo revisão',
                texto: 'A tabela mostra uma linha por entrada de Intertextualidade, Hipertextualidade ou Referências. O seletor Colunas liga e desliga qualquer coluna; Data da obra e Até vêm desligadas. A coluna Autor edita uma etiqueta por autor, e o filtro “Por preencher” tem “Autor parece ter mais de um nome” e “Sem data da obra”.',
                aba: 'conexoes',
                seletor: '#conexoes-revisao-alternar',
            },
            {
                id: 'cf-fora-revisao-2',
                titulo: 'Corrija obra ou autor em todos os textos',
                texto: 'Nos cartões desta seção, Corrigir obra troca nome, autores, tipo, descrição e data em todos os textos que a usam, Corrigir autor troca só a etiqueta daquele autor, e Manter esta junta grafias parecidas na obra que você escolher. Todos pedem confirmação com a contagem e deixam Desfazer.',
                aba: 'conexoes',
                seletor: '#conexoes-fora-secao',
            },
        ],
    },
    {
        id: 'baixar-tag-clusters',
        palavras: [
            'exportar',
            'download',
            'relatório',
            'tags',
            'etiquetas',
            'imagem',
            'png',
            'pdf',
            'markdown',
        ],
        grupo: 'etiquetas',
        titulo: 'Baixar os tag clusters (.md, .png ou .pdf)',
        descricao:
            'Na aba Tag clusters, o primeiro menu escolhe o que entra (o que a tela mostra, todo o cadastro ou só os selecionados) e o segundo escolhe o formato: .md é texto simples, bom para colar numa IA; .png e .pdf trazem o mesmo visual da aba. Depois é clicar em Baixar.',
        passos: [
            {
                id: 'cf-tag-clusters-baixar-1',
                titulo: 'Escolha o que baixar',
                texto: '“O que a tela mostra” respeita a busca e o filtro de categoria; “Todo o cadastro” ignora os dois. Se algo estiver filtrado, o nome do arquivo ganha -filtrado e uma linha no topo avisa.',
                aba: 'tag-clusters',
                seletor: '#tag-clusters-baixar-escopo',
            },
            {
                id: 'cf-tag-clusters-baixar-2',
                titulo: 'Escolha o formato',
                texto: 'O .md é texto simples. O .png é uma imagem, nas cores do tema ligado. O .pdf leva o mesmo desenho do .png em páginas A4, sempre em tema claro (o texto dele não é selecionável).',
                aba: 'tag-clusters',
                seletor: '#tag-clusters-baixar-formato',
            },
            {
                id: 'cf-tag-clusters-baixar-3',
                titulo: 'Baixe',
                texto: 'O arquivo sai como tag-clusters, com a extensão escolhida.',
                aba: 'tag-clusters',
                seletor: '#tag-clusters-baixar',
            },
        ],
    },
    {
        id: 'baixar-selecao-tag-clusters',
        palavras: [
            'exportar',
            'download',
            'escolher',
            'marcar',
            'alguns',
            'selecionar',
            'etiquetas',
            'tags',
        ],
        grupo: 'etiquetas',
        titulo: 'Baixar só alguns tag clusters',
        descricao:
            'Na aba Tag clusters, o botão Selecionar põe uma caixinha em cada tag cluster e em cada bloco de etiquetas sem cluster. Marque os que quiser, escolha o formato e clique em Baixar: o arquivo sai como tag-clusters-selecao, só com o que foi marcado. A seleção vale enquanto o modo estiver ligado.',
        passos: [
            {
                id: 'cf-tag-clusters-selecao-1',
                titulo: 'Ligue o modo Selecionar',
                texto: 'Cada cartão (de cluster ou de subcluster) e cada bloco de etiquetas sem cluster ganha uma caixinha. A barra que aparece mostra quantos estão marcados e tem Marcar todos (o que a tela mostra) e Limpar. Marcar um cluster marca os subclusters dele junto.',
                aba: 'tag-clusters',
                seletor: '#tag-clusters-modo-selecao',
            },
            {
                id: 'cf-tag-clusters-selecao-2',
                titulo: 'Confira o escopo',
                texto: 'Ao marcar o primeiro item, o menu muda sozinho para “Só selecionados”. A seleção passa por cima da busca e do filtro de categoria. Escolha o formato ao lado (.md, .png ou .pdf).',
                aba: 'tag-clusters',
                seletor: '#tag-clusters-baixar-escopo',
            },
            {
                id: 'cf-tag-clusters-selecao-3',
                titulo: 'Baixe',
                texto: 'Um subcluster marcado sem o pai sai como cartão solto, com o nome “Pai > Subcluster”. O topo do arquivo diz “seleção de N itens”.',
                aba: 'tag-clusters',
                seletor: '#tag-clusters-baixar',
            },
        ],
    },
    {
        id: 'achar-livros',
        palavras: [
            'buscar',
            'procurar',
            'pesquisar',
            'filtrar',
            'localizar',
            'encontrar',
            'autor',
            'equipe',
            'isbn',
            'capa',
            'loja',
            'prefixo',
        ],
        grupo: 'livros',
        titulo: 'Achar livros por autor, equipe ou situação',
        descricao:
            'Na aba Livros, a caixa de busca procura em título, sigla, ISBN, autoria e equipe, e aceita prefixos como autor:, papel:, equipe: e papelequipe:. O ? ao lado mostra a sintaxe. Os botões Capa, ISBN e Loja filtram os livros que têm ou não têm cada coisa.',
        passos: [
            {
                id: 'cf-achar-livros-1',
                titulo: 'Digite na busca',
                texto: 'Escreva palavras soltas ou um prefixo, como autor:Maria@Tradutor (a Maria com o papel de tradutora no mesmo livro) ou -equipe:* (livros sem equipe). Ao digitar o começo de um prefixo, aparecem sugestões. O ? ao lado abre a ajuda.',
                aba: 'livros',
                seletor: '#filtro-busca-livros',
            },
            {
                id: 'cf-achar-livros-2',
                titulo: 'Gire o botão Capa',
                texto: 'Cada clique troca entre tanto faz, só com capa e só sem capa. ISBN e Loja funcionam do mesmo jeito. Tudo se combina com a busca.',
                aba: 'livros',
                seletor: '#filtro-tem-capa-livros',
            },
            {
                id: 'cf-achar-livros-3',
                titulo: 'Limpe quando terminar',
                texto: 'Com filtro ligado, a lista mostra “N de M livros”. Este botão desliga tudo. O Anterior e o Próximo do Ver, e o escopo Filtrados do download, seguem a mesma lista.',
                aba: 'livros',
                seletor: '#limpar-filtros-livros',
            },
        ],
    },
    {
        id: 'baixar-livros',
        palavras: [
            'exportar',
            'download',
            'salvar',
            'ficha',
            'catálogo',
            'json',
            'csv',
            'pdf',
            'docx',
            'word',
            'planilha',
        ],
        grupo: 'livros',
        titulo: 'Baixar as informações dos livros',
        descricao:
            'Na aba Livros, escolha o escopo (Filtrados, Todos ou Só selecionados) e o formato (.json, .csv, .md, .pdf ou .docx) e clique em Baixar. O arquivo leva só as informações do livro, sem o conteúdo dos textos. Para um livro só, use o ícone de baixar do card.',
        passos: [
            {
                id: 'cf-baixar-livros-1',
                titulo: 'Escolha o escopo',
                texto: 'Filtrados baixa o que a tela mostra agora (sem filtro, a aba inteira); Todos ignora os filtros.',
                aba: 'livros',
                seletor: '#livros-baixar-escopo',
            },
            {
                id: 'cf-baixar-livros-2',
                titulo: 'Escolha o formato',
                texto: 'No .pdf e no .docx a capa vai embutida ao lado dos campos e os links ficam clicáveis; nos demais, a capa sai só como “tem capa”. O formato escolhido aqui vale também para o Ver do livro e para o botão do card.',
                aba: 'livros',
                seletor: '#livros-baixar-formato',
            },
            {
                id: 'cf-baixar-livros-3',
                titulo: 'Baixe',
                texto: 'O arquivo se chama livros ou livros-filtrados, conforme haja filtro ligado.',
                aba: 'livros',
                seletor: '#livros-baixar',
            },
        ],
    },
    {
        id: 'baixar-selecao-livros',
        palavras: [
            'exportar',
            'download',
            'escolher',
            'marcar',
            'alguns',
            'selecionar',
            'vários livros',
        ],
        grupo: 'livros',
        titulo: 'Baixar só alguns livros',
        descricao:
            'Na aba Livros, o botão Selecionar põe uma caixinha em cada card. Marque os livros que quiser (shift e clique marca um intervalo) e clique em Baixar: o escopo muda sozinho para Só selecionados e o arquivo sai como livros-selecionados.',
        passos: [
            {
                id: 'cf-livros-selecao-1',
                titulo: 'Ligue o modo Selecionar',
                texto: 'Cada card ganha uma caixinha. A barra que aparece mostra quantos estão marcados e tem Marcar os que a tela mostra e Limpar.',
                aba: 'livros',
                seletor: '#livros-modo-selecao',
            },
            {
                id: 'cf-livros-selecao-2',
                titulo: 'Confira o escopo',
                texto: 'Ao marcar o primeiro livro, o menu muda sozinho para “Só selecionados”; ao desmarcar o último, volta para Filtrados.',
                aba: 'livros',
                seletor: '#livros-baixar-escopo',
            },
            {
                id: 'cf-livros-selecao-3',
                titulo: 'Baixe',
                texto: 'Só os livros marcados entram no arquivo, na ordem da aba, mesmo que um filtro os esconda.',
                aba: 'livros',
                seletor: '#livros-baixar',
            },
        ],
    },
    {
        id: 'fazer-backup',
        palavras: [
            'cópia de segurança',
            'salvar',
            'exportar',
            'baixar json',
            'guardar',
            'levar para outro computador',
            'restaurar',
            'segurança',
            'proteger',
            'perder',
        ],
        grupo: 'acervo',
        titulo: 'Fazer backup do acervo',
        descricao:
            'Seus dados ficam só neste navegador. Baixe o JSON de vez em quando: ele serve de backup e também pra levar o acervo pra outro computador.',
        passos: [
            {
                id: 'cf-backup-1',
                titulo: 'Baixe o JSON',
                texto: 'Seus dados ficam só neste navegador. Baixe o JSON de vez em quando, que serve tanto de backup quanto pra levar o acervo pra outro computador.',
                seletor: '#btn-baixar-json',
            },
        ],
    },
    {
        id: 'esvaziar-acervo',
        palavras: [
            'apagar tudo',
            'limpar',
            'resetar',
            'zerar',
            'deletar',
            'excluir',
            'recomeçar',
            'começar de novo',
            'remover tudo',
            'reiniciar',
            'zona de risco',
        ],
        grupo: 'acervo',
        titulo: 'Recomeçar do zero (esvaziar o acervo)',
        descricao:
            'Fica na aba Backup e recuperação, no menu Dados, em uma área marcada como Zona de risco. A janela pede o que apagar (dados, preferências, cadastros pré-prontos), mostra um resumo do que sai, baixa um backup e só libera o botão depois que você digita ESVAZIAR.',
        passos: [
            {
                id: 'cf-esvaziar-1',
                titulo: 'Abra a Zona de risco',
                texto: 'Este botão abre a janela de esvaziar. Nada é apagado ao abri-la: você marca o que apagar, confere o resumo e só depois confirma.',
                aba: 'backup-recuperacao',
                seletor: '#btn-esvaziar-acervo',
            },
        ],
    },
];

// Tarefa por id, ou null se o id não existir (ex.: renomeado sem
// atualizar quem chamou) — quem chama decide o que fazer com null,
// em vez desta função lançar em silêncio.
export function tarefaComoFaco(id) {
    return TAREFAS_COMO_FACO.find((t) => t.id === id) || null;
}

// Grupos na ordem da tela, cada um com as suas tarefas; grupo sem tarefa
// não aparece.
export function tarefasPorGrupo() {
    return GRUPOS_COMO_FACO.map((g) => ({
        ...g,
        tarefas: TAREFAS_COMO_FACO.filter((t) => t.grupo === g.id),
    })).filter((g) => g.tarefas.length);
}
