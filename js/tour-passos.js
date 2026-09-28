// ============================================================
// tour-passos.js — só os DADOS dos roteiros do tour do Modo Aprendizado
// (Bloco 2). Nenhuma lógica de tela aqui: pra mudar um texto ou trocar a
// ordem dos passos basta editar este arquivo, sem mexer em tour.js.
//
// Formato de cada passo:
//   id                    identificador estável (usado nos testes)
//   titulo, texto         o que aparece no cartão
//   seletor               '#id' do elemento REAL a destacar. Só aceita esse
//                         formato: tests/tour-passos.test.js confere que cada
//                         id existe no index.html, então renomear um id
//                         quebra o teste em vez de quebrar o tour em silêncio.
//   seletorAlternativo    (opcional) '#id' usado quando o principal não está
//                         visível. No celular os botões de grupo da nav não
//                         existem; o botão ☰ faz o papel deles.
//   aba                   (opcional) id de aba a abrir antes de destacar
//                         (mesmo id de abrirAba, ex.: 'poemas').
//
// Os menus de grupo abrem no hover, então os passos destacam o BOTÃO do
// grupo (Análise, Criação...) e nunca um item dentro do dropdown.
// ============================================================

export const ROTULOS_PERFIL = {
    escritor: 'Escritor(a)',
    estudioso: 'Estudioso(a) de Literatura',
};

const MENU_MOBILE = '#btn-menu-mobile';

export const PASSOS_ESCRITOR = [
    {
        id: 'escritor-novo-poema',
        titulo: 'Registre um poema',
        texto: 'É por aqui que tudo começa. O formulário é dividido em grupos que abrem e fecham, então dá pra começar só pelo texto e voltar depois pro resto.',
        aba: 'poemas',
        seletor: '#btn-novo-poema',
    },
    {
        id: 'escritor-busca',
        titulo: 'Ache qualquer coisa',
        texto: 'Busque por título, tema, pessoa, livro... O ? ao lado explica como combinar termos.',
        aba: 'poemas',
        seletor: '#busca-poemas',
    },
    {
        id: 'escritor-criacao',
        titulo: 'Planeje antes de escrever',
        texto: 'Em Moldes você monta a forma do poema (métrica e rimas) antes de ele existir, e depois promove o Molde a Poema.',
        seletor: '#grupo-criacao-btn',
        seletorAlternativo: MENU_MOBILE,
    },
    {
        id: 'escritor-analise',
        titulo: 'Analise o que já escreveu',
        texto: 'Sonoridade mapeia métrica e rima, Morfofuncionalidade descreve como o poema se organiza por dentro, e Conexões mostra como seus textos se ligam.',
        seletor: '#grupo-analise-btn',
        seletorAlternativo: MENU_MOBILE,
    },
];

export const PASSOS_ESTUDIOSO = [
    {
        id: 'estudioso-biblioteca',
        titulo: 'Obras de domínio público',
        texto: 'Aqui há pacotes prontos de autores como Camões, Pessoa e Machado de Assis. "Usar este pacote" leva à Importação, onde você confere tudo antes de aplicar.',
        aba: 'biblioteca',
        seletor: '#biblioteca-intro',
    },
    {
        id: 'estudioso-importados',
        titulo: 'Seus textos importados',
        texto: 'Depois de importar, os textos entram na lista de Poemas ou de Prosas. Busque por autor, título ou tema e abra um texto pra ver a fonte.',
        aba: 'poemas',
        seletor: '#busca-poemas',
    },
    {
        id: 'estudioso-analise',
        titulo: 'Escansão e conexões',
        texto: 'Sonoridade permite escandir versos e mapear rimas, Conexões mostra as relações entre textos, Morfofuncionalidade descreve como cada poema se organiza por dentro.',
        seletor: '#grupo-analise-btn',
        seletorAlternativo: MENU_MOBILE,
    },
    {
        id: 'estudioso-estatisticas',
        titulo: 'Números do acervo',
        texto: 'A Análise Exploratória mostra contagens de palavras, etiquetas, pessoas e livros.',
        seletor: '#grupo-estatisticas-btn',
        seletorAlternativo: MENU_MOBILE,
    },
];

// Fecham o roteiro principal, iguais pros dois perfis.
export const PASSOS_COMUNS = [
    {
        id: 'comum-backup',
        titulo: 'Faça backup',
        texto: 'Seus dados ficam guardados neste navegador. Baixe o JSON de vez em quando pra ter uma cópia.',
        seletor: '#btn-baixar-json',
    },
    {
        id: 'comum-ajuda',
        titulo: 'Reveja quando quiser',
        texto: 'A Central de Ajuda fica sempre aqui: reveja esta apresentação, veja "como eu faço para..." tarefas comuns, ou consulte as perguntas frequentes.',
        seletor: '#btn-modo-aprendizado',
    },
];

const PASSOS_PROPRIOS = {
    escritor: PASSOS_ESCRITOR,
    estudioso: PASSOS_ESTUDIOSO,
};

export const PERFIS_COM_ROTEIRO = Object.keys(PASSOS_PROPRIOS);

// Os passos que só existem pro perfil (sem os comuns). Perfil desconhecido
// devolve lista vazia em vez de lançar: o tour simplesmente não tem o que mostrar.
export function passosDoPerfil(perfil) {
    return (PASSOS_PROPRIOS[perfil] || []).slice();
}

// Roteiro principal: passos do perfil + os comuns. O perfil só define
// ordem e ênfase, nada fica escondido (o outro roteiro é oferecido no fim).
export function montarRoteiro(perfil) {
    const proprios = passosDoPerfil(perfil);
    if (proprios.length === 0) return [];
    return [...proprios, ...PASSOS_COMUNS];
}

// Perfil oposto (pra oferecer "ver também o roteiro de ...").
export function outroPerfil(perfil) {
    if (!PASSOS_PROPRIOS[perfil]) return null;
    return PERFIS_COM_ROTEIRO.find((p) => p !== perfil) || null;
}
