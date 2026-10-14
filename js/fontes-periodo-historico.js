// ============================================================
// fontes-periodo-historico.js: fontes de um Período Histórico
// ============================================================
// Cada período histórico guarda `fontes: [{ autor, obra, ano, nota }]`, o mesmo
// formato das Correntes literárias (ver fontes-corrente.js, de onde vêm
// normalizarFonte, normalizarFontes, unirFontes e textoDaFonte). Este módulo
// só traz o catálogo de fábrica dos 16 períodos do seed e a função que o
// entrega por nome.
//
// O que as fontes de fábrica são, e o que não são:
// - São obras de referência de história (e, onde cabe, de história da
//   literatura), sem número de página, escolhidas de memória. Títulos e anos
//   precisam ser conferidos por quem for citar.
// - Sustentam o recorte do período (datas, região, rótulo). As datas e a região
//   do seed são decisões do próprio app: as fontes dão base ao recorte, não
//   provam cada número. Onde a divergência entre autores é conhecida, a `nota`
//   da fonte a registra.
// - O Período Biográfico não tem fontes: o recorte é a vida do autor.
//
// Módulo puro (sem DOM, sem db), como fontes-corrente.js.

import { CATALOGO_FONTES as CATALOGO_DAS_CORRENTES } from './fontes-corrente.js';

// Referências próprias dos períodos. Cada uma aparece uma vez aqui e é ligada
// aos períodos abaixo por chave. Algumas referências já existem no catálogo das
// Correntes (por exemplo, o livro de Mário da Silva Brito): essas são pedidas
// pela mesma chave de lá, sem copiar. O ano é o da primeira edição (ou do texto
// original). Edição, editora e página ficam por conta de quem conferir.
export const CATALOGO_FONTES_PERIODOS = {
    // Hobsbawm: a tetralogia e o livro sobre a Revolução Industrial
    'hobsbawm-revolucoes': {
        autor: 'Eric Hobsbawm',
        obra: 'A era das revoluções: Europa 1789-1848',
        ano: '1962',
    },
    'hobsbawm-capital': {
        autor: 'Eric Hobsbawm',
        obra: 'A era do capital: 1848-1875',
        ano: '1975',
    },
    'hobsbawm-imperios': {
        autor: 'Eric Hobsbawm',
        obra: 'A era dos impérios: 1875-1914',
        ano: '1987',
    },
    'hobsbawm-extremos': {
        autor: 'Eric Hobsbawm',
        obra: 'Era dos extremos: o breve século XX (1914-1991)',
        ano: '1994',
    },
    'hobsbawm-industria': {
        autor: 'Eric Hobsbawm',
        obra: 'Da revolução industrial inglesa ao imperialismo',
        ano: '1968',
    },
    // Renascimento
    burckhardt: {
        autor: 'Jacob Burckhardt',
        obra: 'A cultura do Renascimento na Itália',
        ano: '1860',
    },
    huizinga: {
        autor: 'Johan Huizinga',
        obra: 'O outono da Idade Média',
        ano: '1919',
    },
    delumeau: {
        autor: 'Jean Delumeau',
        obra: 'A civilização do Renascimento',
        ano: '1967',
    },
    'burke-renascimento': {
        autor: 'Peter Burke',
        obra: 'O Renascimento italiano: cultura e sociedade na Itália',
        ano: '1972',
    },
    // Iluminismo
    cassirer: {
        autor: 'Ernst Cassirer',
        obra: 'A filosofia do Iluminismo',
        ano: '1932',
    },
    hazard: {
        autor: 'Paul Hazard',
        obra: 'A crise da consciência europeia',
        ano: '1935',
    },
    kant: {
        autor: 'Immanuel Kant',
        obra: 'Resposta à pergunta: que é o Esclarecimento?',
        ano: '1784',
    },
    'adorno-horkheimer': {
        autor: 'Theodor Adorno e Max Horkheimer',
        obra: 'Dialética do esclarecimento',
        ano: '1947',
    },
    // Revolução Industrial (primeira e segunda)
    ashton: {
        autor: 'T. S. Ashton',
        obra: 'A Revolução Industrial, 1760-1830',
        ano: '1948',
    },
    landes: {
        autor: 'David S. Landes',
        obra: 'Prometeu desacorrentado',
        ano: '1969',
    },
    thompson: {
        autor: 'E. P. Thompson',
        obra: 'A formação da classe operária inglesa',
        ano: '1963',
    },
    // Revolução Francesa
    tocqueville: {
        autor: 'Alexis de Tocqueville',
        obra: 'O Antigo Regime e a Revolução',
        ano: '1856',
    },
    'furet-richet': {
        autor: 'François Furet e Denis Richet',
        obra: 'A Revolução Francesa',
        ano: '1965',
    },
    lefebvre: {
        autor: 'Georges Lefebvre',
        obra: '1789: o surgimento da Revolução Francesa',
        ano: '1939',
    },
    // Belle Époque
    'tuchman-torre': {
        autor: 'Barbara W. Tuchman',
        obra: 'A torre do orgulho',
        ano: '1966',
    },
    needell: {
        autor: 'Jeffrey D. Needell',
        obra: 'Belle Époque tropical: sociedade e cultura de elite no Rio de Janeiro na virada do século',
        ano: '1987',
    },
    // Primeira Guerra Mundial
    keegan: {
        autor: 'John Keegan',
        obra: 'Uma história da Primeira Guerra Mundial',
        ano: '1998',
    },
    clark: {
        autor: 'Christopher Clark',
        obra: 'Os sonâmbulos: como eclodiu a Primeira Guerra Mundial',
        ano: '2012',
    },
    fussell: {
        autor: 'Paul Fussell',
        obra: 'A Grande Guerra e a memória moderna',
        ano: '1975',
    },
    // Semana de Arte Moderna
    'mario-de-andrade-movimento': {
        autor: 'Mário de Andrade',
        obra: 'O movimento modernista',
        ano: '1942',
    },
    amaral: {
        autor: 'Aracy Amaral',
        obra: 'Artes plásticas na Semana de 22',
        ano: '1970',
    },
    // Segunda Guerra Mundial
    beevor: {
        autor: 'Antony Beevor',
        obra: 'A Segunda Guerra Mundial',
        ano: '2012',
    },
    overy: {
        autor: 'Richard Overy',
        obra: 'Por que os Aliados venceram',
        ano: '1995',
    },
    // Estado Novo (Portugal)
    'rosas-estado-novo': {
        autor: 'Fernando Rosas',
        obra: 'O Estado Novo (1926-1974), em História de Portugal, v. 7, dir. José Mattoso',
        ano: '1994',
    },
    'rosas-anos-trinta': {
        autor: 'Fernando Rosas',
        obra: 'O Estado Novo nos anos trinta (1928-1938)',
        ano: '1986',
    },
    torgal: {
        autor: 'Luís Reis Torgal',
        obra: 'Estados Novos, Estado Novo',
        ano: '2009',
    },
    // Ditadura Militar Brasileira e Nova República
    skidmore: {
        autor: 'Thomas E. Skidmore',
        obra: 'Brasil: de Castelo a Tancredo, 1964-1985',
        ano: '1988',
    },
    gaspari: {
        autor: 'Elio Gaspari',
        obra: 'A ditadura envergonhada',
        ano: '2002',
    },
    fico: {
        autor: 'Carlos Fico',
        obra: 'O golpe de 1964: momentos decisivos',
        ano: '2014',
    },
    'aarao-reis': {
        autor: 'Daniel Aarão Reis',
        obra: 'Ditadura e democracia no Brasil: do golpe de 1964 à Constituição de 1988',
        ano: '2014',
    },
    fausto: {
        autor: 'Boris Fausto',
        obra: 'História do Brasil',
        ano: '1994',
    },
    'schwarcz-starling': {
        autor: 'Lilia Moritz Schwarcz e Heloisa Murgel Starling',
        obra: 'Brasil: uma biografia',
        ano: '2015',
    },
    // Guerra Fria (títulos no original)
    gaddis: {
        autor: 'John Lewis Gaddis',
        obra: 'The Cold War: A New History',
        ano: '2005',
    },
    westad: {
        autor: 'Odd Arne Westad',
        obra: 'The Global Cold War',
        ano: '2005',
    },
    // Terceira Revolução Industrial (Era da Informação)
    castells: {
        autor: 'Manuel Castells',
        obra: 'A sociedade em rede',
        ano: '1996',
    },
    bell: {
        autor: 'Daniel Bell',
        obra: 'O advento da sociedade pós-industrial',
        ano: '1973',
    },
    rifkin: {
        autor: 'Jeremy Rifkin',
        obra: 'A terceira revolução industrial',
        ano: '2011',
    },
    // Quarta Revolução Industrial (Indústria 4.0)
    schwab: {
        autor: 'Klaus Schwab',
        obra: 'A quarta revolução industrial',
        ano: '2016',
    },
    kagermann: {
        autor: 'Henning Kagermann, Wolfgang Wahlster e Johannes Helbig',
        obra: 'Recommendations for implementing the strategic initiative INDUSTRIE 4.0',
        ano: '2013',
    },
    brynjolfsson: {
        autor: 'Erik Brynjolfsson e Andrew McAfee',
        obra: 'A segunda era das máquinas',
        ano: '2014',
    },
    // Pandemia de Covid-19
    'oms-pandemia': {
        autor: 'Organização Mundial da Saúde',
        obra: 'Declaração do Diretor-Geral caracterizando a Covid-19 como pandemia, 11 de março de 2020',
        ano: '2020',
    },
    'oms-fim': {
        autor: 'Organização Mundial da Saúde',
        obra: 'Declaração do fim da emergência de saúde pública de importância internacional da Covid-19, 5 de maio de 2023',
        ano: '2023',
    },
    tooze: {
        autor: 'Adam Tooze',
        obra: "Shutdown: How Covid Shook the World's Economy",
        ano: '2021',
    },
    snowden: {
        autor: 'Frank M. Snowden',
        obra: 'Epidemics and Society: From the Black Death to the Present',
        ano: '2019',
    },
};

// Notas de fábrica: só onde a divergência entre autores é conhecida, ou onde o
// rótulo é de convenção. Cada uma entra na fonte indicada, não no período todo.
const NOTA_RENASCIMENTO_BURCKHARDT =
    'A periodização é a de um Renascimento italiano que rompe com a Idade Média. As datas variam por região: começa na Itália no século XIV e chega mais tarde ao norte da Europa.';
const NOTA_RENASCIMENTO_HUIZINGA =
    'Lê os séculos XIV e XV como o fim da Idade Média, não como o começo de um novo tempo; diverge de Burckhardt.';
const NOTA_ILUMINISMO_HAZARD =
    'Trata de 1680 a 1715, os anos que antecedem o Iluminismo; o recorte do app começa em 1715. Há autores que fazem o Iluminismo começar antes.';
const NOTA_ILUMINISMO_ADORNO =
    'Obra crítica do Iluminismo: lê a razão esclarecida como também capaz de dominação.';
const NOTA_REV_INDUSTRIAL_ASHTON =
    'Data a Revolução Industrial inglesa de 1760 a 1830; o recorte do app vai de c. 1760 a c. 1840. Os marcos de início e de fim variam entre os historiadores.';
const NOTA_SEGUNDA_REV_INDUSTRIAL =
    'A numeração das revoluções industriais é convencional e os marcos variam entre os autores.';
const NOTA_REV_FRANCESA_FURET =
    'Leitura revisionista, que contesta a interpretação social de Lefebvre e outros. A data de fim varia: 1794 (Termidor) ou 1799 (golpe do 18 Brumário).';
const NOTA_BELLE_EPOQUE =
    'Trata do Rio de Janeiro. O termo é de uso retrospectivo e as datas mudam entre a França e o Brasil.';
const NOTA_SEMANA_MARIO_BRITO =
    'As noites no Theatro Municipal de São Paulo foram em 13, 15 e 17 de fevereiro de 1922; o recorte do app cobre a semana inteira, de 11 a 18.';
const NOTA_SEGUNDA_GUERRA =
    'Sobre a datação: 1º de setembro de 1939 (invasão da Polônia) é o marco europeu; parte dos historiadores conta a guerra desde 1937, com o conflito sino-japonês.';
const NOTA_ESTADO_NOVO_ROSAS =
    'O título da obra data o regime desde 1926 (golpe militar); o recorte do app começa em 1933, com a Constituição que cria o Estado Novo.';
const NOTA_DITADURA_AARAO_REIS =
    'O recorte vai até a Constituição de 1988; o app encerra em 1985. O autor fala em ditadura civil-militar, para marcar o apoio de setores civis ao regime.';
const NOTA_NOVA_REPUBLICA_FAUSTO =
    'O termo nasceu para o governo Sarney (a partir de 1985) e passou a nomear todo o período democrático seguinte; o fim, em aberto, varia conforme o autor.';
const NOTA_GUERRA_FRIA_GADDIS =
    'A datação varia: o início fica entre 1945 e 1947 (Doutrina Truman) e o fim entre 1989 (queda do Muro de Berlim) e 1991 (dissolução da União Soviética).';
const NOTA_TERCEIRA_CASTELLS =
    'Situa a revolução da tecnologia da informação sobretudo nos anos 1970, mais tarde que o início de c. 1950 adotado aqui.';
const NOTA_TERCEIRA_RIFKIN =
    'O termo tem usos distintos: Rifkin o liga à convergência entre internet e energias renováveis; outros autores o associam à eletrônica e à automação a partir dos anos 1950.';
const NOTA_QUARTA_SCHWAB =
    'O termo foi difundido pelo Fórum Econômico Mundial; a ideia de uma nova revolução industrial é contestada por parte dos historiadores e economistas.';
const NOTA_QUARTA_KAGERMANN =
    'Relatório final do grupo de trabalho do governo alemão; a expressão "Indústria 4.0" apareceu na feira de Hannover de 2011.';
const NOTA_COVID_SNOWDEN =
    'Anterior à Covid-19: serve para situar as pandemias na história, não para datar esta.';

// Quais referências cada período de fábrica leva, pelo nome do período (o
// mesmo do seed em db.js). Item: chave do catálogo (próprio ou das Correntes),
// ou [chave, nota] para uma nota de fábrica.
const FONTES_POR_PERIODO = {
    Renascimento: [
        ['burckhardt', NOTA_RENASCIMENTO_BURCKHARDT],
        ['huizinga', NOTA_RENASCIMENTO_HUIZINGA],
        'delumeau',
        'burke-renascimento',
    ],
    Iluminismo: [
        'cassirer',
        ['hazard', NOTA_ILUMINISMO_HAZARD],
        'kant',
        ['adorno-horkheimer', NOTA_ILUMINISMO_ADORNO],
    ],
    'Primeira Revolução Industrial': [
        ['ashton', NOTA_REV_INDUSTRIAL_ASHTON],
        'hobsbawm-industria',
        'thompson',
        'landes',
    ],
    'Revolução Francesa': [
        'hobsbawm-revolucoes',
        'tocqueville',
        ['furet-richet', NOTA_REV_FRANCESA_FURET],
        'lefebvre',
    ],
    'Segunda Revolução Industrial': [
        ['landes', NOTA_SEGUNDA_REV_INDUSTRIAL],
        'hobsbawm-capital',
        'hobsbawm-imperios',
    ],
    'Belle Époque': ['hobsbawm-imperios', 'tuchman-torre', ['needell', NOTA_BELLE_EPOQUE]],
    'Primeira Guerra Mundial': ['keegan', 'clark', 'fussell', 'hobsbawm-extremos'],
    'Semana de Arte Moderna': [
        ['mario-brito', NOTA_SEMANA_MARIO_BRITO],
        'mario-de-andrade-movimento',
        'amaral',
        'wilson-martins',
    ],
    'Segunda Guerra Mundial': [['beevor', NOTA_SEGUNDA_GUERRA], 'overy', 'hobsbawm-extremos'],
    'Estado Novo (Portugal)': [
        ['rosas-estado-novo', NOTA_ESTADO_NOVO_ROSAS],
        'rosas-anos-trinta',
        'torgal',
    ],
    'Ditadura Militar Brasileira': [
        'skidmore',
        'gaspari',
        'fico',
        ['aarao-reis', NOTA_DITADURA_AARAO_REIS],
    ],
    'Guerra Fria': [['gaddis', NOTA_GUERRA_FRIA_GADDIS], 'westad', 'hobsbawm-extremos'],
    'Terceira Revolução Industrial (Era da Informação)': [
        ['castells', NOTA_TERCEIRA_CASTELLS],
        'bell',
        ['rifkin', NOTA_TERCEIRA_RIFKIN],
    ],
    'Nova República': [['fausto', NOTA_NOVA_REPUBLICA_FAUSTO], 'schwarcz-starling', 'aarao-reis'],
    'Quarta Revolução Industrial (Indústria 4.0)': [
        ['schwab', NOTA_QUARTA_SCHWAB],
        ['kagermann', NOTA_QUARTA_KAGERMANN],
        'brynjolfsson',
    ],
    'Pandemia de Covid-19': ['oms-pandemia', 'oms-fim', 'tooze', ['snowden', NOTA_COVID_SNOWDEN]],
};

// A referência pela chave: primeiro o catálogo dos períodos, depois o das
// Correntes (obras que servem aos dois).
function referencia(chave) {
    return CATALOGO_FONTES_PERIODOS[chave] || CATALOGO_DAS_CORRENTES[chave] || null;
}

// Fontes de fábrica de um período (cópias novas, nunca o objeto do catálogo,
// para editar um período não mexer em outro). Nome fora da lista: [].
export function fontesDeFabricaDoPeriodoHistorico(nome) {
    const itens = FONTES_POR_PERIODO[nome];
    if (!itens) return [];
    return itens.map((item) => {
        const [chave, nota] = Array.isArray(item) ? item : [item, ''];
        const base = referencia(chave);
        return { autor: base.autor, obra: base.obra, ano: base.ano, nota: nota || '' };
    });
}

// Nomes de período que têm fontes de fábrica (os testes conferem contra o seed).
export function nomesDePeriodosComFontesDeFabrica() {
    return Object.keys(FONTES_POR_PERIODO);
}

// Chaves usadas por algum período, de qualquer dos dois catálogos (os testes
// barram referência morta e entrada de catálogo sem uso).
export function chavesUsadasNoCatalogoDosPeriodos() {
    const usadas = new Set();
    Object.values(FONTES_POR_PERIODO).forEach((itens) =>
        itens.forEach((item) => usadas.add(Array.isArray(item) ? item[0] : item)),
    );
    return usadas;
}

// Chave que existe em algum catálogo (para o teste de "referência morta").
export function chaveExiste(chave) {
    return referencia(chave) !== null;
}
