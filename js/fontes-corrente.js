// ============================================================
// fontes-corrente.js: fontes e referências de uma Corrente literária
// ============================================================
// Cada corrente guarda `fontes: [{ autor, obra, ano, nota }]`: as obras que
// tratam dela e permitem conferir a classificação (período, região, divisões).
// A professora de Linguagens observou que autores diferentes classificam de
// modos distintos, então o cadastro registra de onde cada classificação vem e
// quem cria uma corrente também pode registrar o que consultou.
//
// O que as fontes de fábrica são, e o que não são:
// - São obras de referência que tratam da corrente. Não são citações de
//   página: a `nota` fica livre para quem quiser registrar capítulo, página
//   ou onde o autor diverge do recorte adotado.
// - Sustentam sobretudo período, região e divisões. Postura estética e
//   Programa são categorias próprias do app, sem autor único por trás.
//
// Módulo puro (sem DOM, sem db), como correntes-hierarquia.js.

import { escapeHtml } from './utils.js';

// Campos de uma fonte, na ordem de exibição. `nota` é opcional; `ano` é texto
// (aceita "1970", "c. 1550" ou "1955-1959"); autor ou obra bastam para a fonte existir.
export const CAMPOS_FONTE = ['autor', 'obra', 'ano', 'nota'];

const texto = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

// Uma fonte válida: objeto com ao menos autor ou obra. O ano vindo como número
// (JSON antigo, digitação) vira texto. Qualquer outra coisa vira null.
export function normalizarFonte(fonte) {
    if (!fonte || typeof fonte !== 'object' || Array.isArray(fonte)) return null;
    const ano = typeof fonte.ano === 'number' ? String(fonte.ano) : texto(fonte.ano);
    const limpa = {
        autor: texto(fonte.autor),
        obra: texto(fonte.obra),
        ano,
        // A nota preserva as quebras de linha que a pessoa digitou.
        nota: typeof fonte.nota === 'string' ? fonte.nota.trim() : '',
    };
    return limpa.autor || limpa.obra ? limpa : null;
}

// Chave para comparar fontes (sem caixa, acento nem espaço sobrando). O ano e a
// nota ficam fora de propósito: a mesma obra com outra nota é a mesma fonte.
export function chaveDaFonte(fonte) {
    const f = normalizarFonte(fonte);
    if (!f) return '';
    const base = `${f.autor}|${f.obra}`;
    return base
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

// Lista saneada: só fontes válidas, sem repetir a mesma obra do mesmo autor
// (vale a primeira; se a repetida trouxer nota e a primeira não, a nota é aproveitada).
export function normalizarFontes(lista) {
    if (!Array.isArray(lista)) return [];
    const vistas = new Map();
    const saida = [];
    lista.forEach((bruta) => {
        const f = normalizarFonte(bruta);
        if (!f) return;
        const chave = chaveDaFonte(f);
        const existente = vistas.get(chave);
        if (!existente) {
            vistas.set(chave, f);
            saida.push(f);
            return;
        }
        if (!existente.nota && f.nota) existente.nota = f.nota;
        if (!existente.ano && f.ano) existente.ano = f.ano;
    });
    return saida;
}

// União de duas listas (mesclar correntes): o destino manda e a origem só
// acrescenta o que ele ainda não tem.
export function unirFontes(destino, origem) {
    return normalizarFontes([...(destino || []), ...(origem || [])]);
}

// "Alfredo Bosi. História concisa da literatura brasileira (1970)." Sem ponto
// duplo, sem travessão. A nota (quando há) vem depois, separada por ponto.
export function textoDaFonte(fonte, { comNota = true } = {}) {
    const f = normalizarFonte(fonte);
    if (!f) return '';
    const semPontoFinal = (s) => s.replace(/[.\s]+$/, '');
    const partes = [];
    if (f.autor) partes.push(semPontoFinal(f.autor));
    if (f.obra) partes.push(`${semPontoFinal(f.obra)}${f.ano ? ` (${f.ano})` : ''}`);
    else if (f.ano) partes.push(`(${f.ano})`);
    let saida = `${partes.join('. ')}.`;
    if (comNota && f.nota) saida += ` ${f.nota}`;
    return saida;
}

// Texto para busca e exportação: autor, obra, ano e nota juntos.
export function textoBuscaDasFontes(fontes) {
    return normalizarFontes(fontes)
        .map((f) => [f.autor, f.obra, f.ano, f.nota].filter(Boolean).join(' '))
        .join(' ');
}

// Lista das fontes em HTML (a visualização "Ver" de Correntes e de Períodos
// Históricos): autor, obra e ano numa linha; a nota (capítulo, página,
// divergência entre autores), quando há, numa linha menor logo abaixo. Vazio
// quando não há fonte válida.
export function listaFontesHtml(fontes) {
    const lista = normalizarFontes(fontes);
    if (!lista.length) return '';
    return `<ul class="text-sm text-gray-700 dark:text-slate-200 space-y-2">${lista
        .map(
            (f) =>
                `<li data-fonte="true">${escapeHtml(textoDaFonte(f, { comNota: false }))}${
                    f.nota
                        ? `<span class="block text-xs text-gray-500 dark:text-slate-400" style="white-space: pre-wrap">${escapeHtml(f.nota)}</span>`
                        : ''
                }</li>`,
        )
        .join('')}</ul>`;
}

// ─── Catálogo de fábrica ─────────────────────────────────────────
// Cada referência aparece uma vez aqui e é ligada às correntes abaixo por
// chave, para título e ano não divergirem entre uma corrente e outra. O ano é o
// da primeira edição (ou do texto original, nos manifestos). Edição, editora e
// página ficam por conta de quem conferir na própria cópia.
export const CATALOGO_FONTES = {
    // História e crítica da literatura brasileira
    bosi: {
        autor: 'Alfredo Bosi',
        obra: 'História concisa da literatura brasileira',
        ano: '1970',
    },
    'candido-formacao': {
        autor: 'Antonio Candido',
        obra: 'Formação da literatura brasileira: momentos decisivos',
        ano: '1959',
    },
    'candido-castello': {
        autor: 'Antonio Candido e José Aderaldo Castello',
        obra: 'Presença da literatura brasileira',
        ano: '1964',
    },
    coutinho: {
        autor: 'Afrânio Coutinho (dir.)',
        obra: 'A literatura no Brasil',
        ano: '1955',
    },
    proenca: {
        autor: 'Domício Proença Filho',
        obra: 'Estilos de época na literatura',
        ano: '1974',
    },
    'lucia-pereira': {
        autor: 'Lúcia Miguel Pereira',
        obra: 'Prosa de ficção (de 1870 a 1920)',
        ano: '1950',
    },
    'haroldo-barroco': {
        autor: 'Haroldo de Campos',
        obra: 'O sequestro do Barroco na formação da literatura brasileira: o caso Gregório de Matos',
        ano: '1989',
    },
    muricy: {
        autor: 'Andrade Muricy',
        obra: 'Panorama do movimento simbolista brasileiro',
        ano: '1952',
    },
    sussekind: {
        autor: 'Flora Süssekind',
        obra: 'Tal Brasil, qual romance? Uma ideologia estética e sua história: o naturalismo',
        ano: '1984',
    },
    'mario-brito': {
        autor: 'Mário da Silva Brito',
        obra: 'História do Modernismo brasileiro, v. 1: Antecedentes da Semana de Arte Moderna',
        ano: '1958',
    },
    'wilson-martins': {
        autor: 'Wilson Martins',
        obra: 'O Modernismo (1916-1945)',
        ano: '1965',
    },
    concretos: {
        autor: 'Augusto de Campos, Décio Pignatari e Haroldo de Campos',
        obra: 'Teoria da poesia concreta: textos críticos e manifestos 1950-1960',
        ano: '1965',
    },
    favaretto: {
        autor: 'Celso Favaretto',
        obra: 'Tropicália: alegoria, alegria',
        ano: '1979',
    },
    hollanda: {
        autor: 'Heloisa Buarque de Hollanda',
        obra: 'Impressões de viagem: CPC, vanguarda e desbunde 1960/70',
        ano: '1980',
    },
    resende: {
        autor: 'Beatriz Resende',
        obra: 'Contemporâneos: expressões da literatura brasileira no século XXI',
        ano: '2008',
    },
    schollhammer: {
        autor: 'Karl Erik Schøllhammer',
        obra: 'Ficção brasileira contemporânea',
        ano: '2009',
    },
    // História e crítica da literatura portuguesa
    'saraiva-lopes': {
        autor: 'António José Saraiva e Óscar Lopes',
        obra: 'História da literatura portuguesa',
        ano: '1955',
    },
    'moises-pt': {
        autor: 'Massaud Moisés',
        obra: 'A literatura portuguesa',
        ano: '1960',
    },
    'rodrigues-lapa': {
        autor: 'Manuel Rodrigues Lapa',
        obra: 'Lições de literatura portuguesa: época medieval',
        ano: '1934',
    },
    michaelis: {
        autor: 'Carolina Michaëlis de Vasconcelos',
        obra: 'Cancioneiro da Ajuda',
        ano: '1904',
    },
    // Teoria e história europeia
    wellek: {
        autor: 'René Wellek',
        obra: 'The concept of "Romanticism" in literary history',
        ano: '1949',
    },
    auerbach: {
        autor: 'Erich Auerbach',
        obra: 'Mimesis: a representação da realidade na literatura ocidental',
        ano: '1946',
    },
    zola: {
        autor: 'Émile Zola',
        obra: 'Le roman expérimental',
        ano: '1880',
    },
    friedrich: {
        autor: 'Hugo Friedrich',
        obra: 'Estrutura da lírica moderna: da metade do século XIX a meados do século XX',
        ano: '1956',
    },
    // Vanguardas
    teles: {
        autor: 'Gilberto Mendonça Teles',
        obra: 'Vanguarda europeia e modernismo brasileiro',
        ano: '1972',
    },
    burger: {
        autor: 'Peter Bürger',
        obra: 'Teoria da vanguarda',
        ano: '1974',
    },
    marinetti: {
        autor: 'Filippo Tommaso Marinetti',
        obra: 'Manifesto do Futurismo',
        ano: '1909',
    },
    tzara: {
        autor: 'Tristan Tzara',
        obra: 'Manifesto Dada 1918',
        ano: '1918',
    },
    breton: {
        autor: 'André Breton',
        obra: 'Manifesto do Surrealismo',
        ano: '1924',
    },
    nadeau: {
        autor: 'Maurice Nadeau',
        obra: 'História do Surrealismo',
        ano: '1945',
    },
    // Pós-modernismo e contemporâneo
    jameson: {
        autor: 'Fredric Jameson',
        obra: 'Pós-modernismo: a lógica cultural do capitalismo tardio',
        ano: '1991',
    },
    hutcheon: {
        autor: 'Linda Hutcheon',
        obra: 'Poética do pós-modernismo',
        ano: '1988',
    },
    lyotard: {
        autor: 'Jean-François Lyotard',
        obra: 'A condição pós-moderna',
        ano: '1979',
    },
    agamben: {
        autor: 'Giorgio Agamben',
        obra: 'O que é o contemporâneo? e outros ensaios',
        ano: '2009',
    },
};

// Notas de fábrica: só onde a divergência entre autores é conhecida, ou onde o
// rótulo é de convenção. Cada uma entra na fonte indicada, não na corrente toda.
const NOTA_BARROCO_CANDIDO =
    'Trata as manifestações anteriores a meados do século XVIII como anteriores à formação do sistema literário brasileiro, o que deixa o Barroco de fora do recorte da Formação.';
const NOTA_BARROCO_HAROLDO =
    'Contesta essa exclusão e defende o Barroco como parte da formação literária brasileira.';
const NOTA_GERACOES =
    'A divisão em gerações é de uso didático corrente; os nomes e os recortes variam entre os autores.';
const NOTA_PRE_MODERNISMO =
    'Rótulo de convenção didática: reúne autores de transição que não formam escola.';
const NOTA_POS_MODERNISMO =
    'O termo é disputado: Lyotard e Jameson o definem de modos distintos (crise dos grandes relatos, num; lógica cultural do capitalismo tardio, no outro).';
const NOTA_CONTEMPORANEA =
    'O recorte temporal está em aberto: "contemporâneo" não designa uma escola.';

// Quais referências cada corrente de fábrica leva, pelo nome da corrente.
// Item: chave do catálogo, ou [chave, nota] para uma nota de fábrica.
const FONTES_POR_CORRENTE = {
    Trovadorismo: ['rodrigues-lapa', 'michaelis', 'saraiva-lopes', 'moises-pt'],
    Humanismo: ['saraiva-lopes', 'moises-pt'],
    'Classicismo (Quinhentismo)': ['saraiva-lopes', 'moises-pt'],
    Barroco: [
        'bosi',
        'saraiva-lopes',
        ['candido-formacao', NOTA_BARROCO_CANDIDO],
        ['haroldo-barroco', NOTA_BARROCO_HAROLDO],
    ],
    'Arcadismo (Neoclassicismo)': ['candido-formacao', 'bosi', 'saraiva-lopes'],
    Romantismo: ['wellek', 'bosi', 'candido-formacao', 'saraiva-lopes'],
    'Romantismo no Brasil': ['candido-formacao', 'bosi', 'candido-castello', 'coutinho'],
    '1ª geração: Indianista (Brasil)': ['bosi', 'candido-formacao', ['proenca', NOTA_GERACOES]],
    '2ª geração: Ultrarromântica (Brasil)': [
        'bosi',
        'candido-formacao',
        ['proenca', NOTA_GERACOES],
    ],
    '3ª geração: Condoreira (Brasil)': ['bosi', 'candido-formacao', ['proenca', NOTA_GERACOES]],
    'Romance indianista (Brasil)': ['bosi', 'candido-formacao', 'candido-castello'],
    'Romance urbano (Brasil)': ['bosi', 'candido-formacao', 'candido-castello'],
    'Romance regionalista (Brasil)': ['bosi', 'candido-formacao', 'candido-castello'],
    'Romance histórico (Brasil)': ['bosi', 'candido-formacao', 'candido-castello'],
    'Romantismo em Portugal': ['saraiva-lopes', 'moises-pt'],
    '1ª geração: Liberal e nacionalista (Portugal)': [
        ['saraiva-lopes', NOTA_GERACOES],
        'moises-pt',
    ],
    '2ª geração: Ultrarromântica (Portugal)': [['saraiva-lopes', NOTA_GERACOES], 'moises-pt'],
    '3ª geração: Renovação romântica (Portugal)': [['saraiva-lopes', NOTA_GERACOES], 'moises-pt'],
    'Romance histórico (Portugal)': ['saraiva-lopes', 'moises-pt'],
    'Romance de costumes (Portugal)': ['saraiva-lopes', 'moises-pt'],
    'Novela passional (Portugal)': ['saraiva-lopes', 'moises-pt'],
    'Romance campesino (Portugal)': ['saraiva-lopes', 'moises-pt'],
    Realismo: ['bosi', 'candido-castello', 'lucia-pereira', 'saraiva-lopes', 'auerbach'],
    Naturalismo: ['zola', 'sussekind', 'bosi', 'lucia-pereira'],
    Parnasianismo: ['bosi', 'candido-castello', 'coutinho'],
    Simbolismo: ['muricy', 'bosi', 'friedrich', 'saraiva-lopes'],
    'Pré-Modernismo': ['bosi', ['lucia-pereira', NOTA_PRE_MODERNISMO]],
    Futurismo: ['marinetti', 'teles', 'burger'],
    Expressionismo: ['teles', 'burger'],
    'Cubismo literário': ['teles', 'burger'],
    Dadaísmo: ['tzara', 'teles', 'burger'],
    Modernismo: ['mario-brito', 'wilson-martins', 'bosi', 'teles'],
    Surrealismo: ['breton', 'nadeau', 'teles'],
    'Geração de 45': ['bosi'],
    Concretismo: ['concretos', 'bosi'],
    Tropicalismo: ['favaretto', 'hollanda'],
    'Pós-modernismo': ['jameson', 'hutcheon', ['lyotard', NOTA_POS_MODERNISMO]],
    'Literatura Contemporânea': ['resende', 'schollhammer', ['agamben', NOTA_CONTEMPORANEA]],
};

// Fontes de fábrica de uma corrente (cópias novas, nunca o objeto do catálogo,
// para editar uma corrente não mexer em outra). Nome fora da lista: [].
export function fontesDeFabricaDaCorrente(nome) {
    const itens = FONTES_POR_CORRENTE[nome];
    if (!itens) return [];
    return itens.map((item) => {
        const [chave, nota] = Array.isArray(item) ? item : [item, ''];
        const base = CATALOGO_FONTES[chave];
        return { autor: base.autor, obra: base.obra, ano: base.ano, nota: nota || '' };
    });
}

// Nomes de corrente que têm fontes de fábrica (os testes conferem contra o seed).
export function nomesComFontesDeFabrica() {
    return Object.keys(FONTES_POR_CORRENTE);
}

// Chaves do catálogo usadas por alguma corrente (os testes barram referência
// morta e entrada de catálogo sem uso).
export function chavesUsadasNoCatalogo() {
    const usadas = new Set();
    Object.values(FONTES_POR_CORRENTE).forEach((itens) =>
        itens.forEach((item) => usadas.add(Array.isArray(item) ? item[0] : item)),
    );
    return usadas;
}
