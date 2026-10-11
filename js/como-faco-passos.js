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
