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
// Lista curta de propósito (mesmo espírito do Bloco 2: começar com o
// essencial e crescer aos poucos, tarefa por tarefa, em vez de nascer
// completa).
// ============================================================

const MENU_MOBILE = '#btn-menu-mobile';

export const TAREFAS_COMO_FACO = [
    {
        id: 'registrar-poema',
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
        id: 'agrupar-etiquetas',
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
        titulo: 'Baixar o relatório das Conexões (.md, .png ou .pdf)',
        descricao:
            'Na aba Conexões, o primeiro menu escolhe o que entra (todas as conexões, só Elos ou só Ecos) e o segundo escolhe o formato: .md é texto simples, bom para colar numa IA; .png e .pdf trazem os desenhos. Depois é clicar em Baixar.',
        passos: [
            {
                id: 'cf-conexoes-relatorio-1',
                titulo: 'Escolha o que baixar',
                texto: 'Todas as conexões, só os Elos ou só os Ecos. Os Buracos (Elos registrados só de um lado) vêm junto com os Elos.',
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
        id: 'fazer-backup',
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
