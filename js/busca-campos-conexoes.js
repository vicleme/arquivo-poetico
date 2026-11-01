// ============================================================
// busca-campos-conexoes.js: a busca por campo (`campo:valor`) das listas de
// Obras, Autores e Origens da seção "Fora do acervo" (aba Conexões). Lógica
// pura, sem DOM. É a mesma sintaxe do Modo revisão e das abas de texto, pelo
// mesmo interpretador de utils.js (`parseConsultaBusca`): termos soltos = E;
// `ou`; "frase exata"; `-termo` exclui; `campo:*` = campo preenchido (então
// `-origem:*` deixa só o que está sem origem); acento e caixa seguem os
// interruptores de busca, como no Modo revisão.
//
// Uma consulta só vira "avançada" quando traz algum prefixo conhecido, `-`, `ou`
// ou aspas; fora isso a busca é a de antes (as palavras em qualquer ordem, sem
// pontuação), que continua em `casaConsulta` (fora-do-acervo.js).
//
// Cada item (obra, autor ou origem) tem, por prefixo, uma LISTA de valores; o
// termo casa quando algum valor da lista casa (então `autor:Homero` acha uma obra
// com dois autores, e `-tipo:Poema` só exclui a obra que tem esse tipo).
// ============================================================

import { formatarIntervaloDataObra } from './data-da-obra.js';
import { normalizarBusca, opcoesBuscaPadrao, parseConsultaBusca, valorBateTermo } from './utils.js';

// Nome digitado (sem acento) → campo. `nome` é o mesmo que `obra`, como no Modo
// revisão; `titulo` é o mesmo que `texto`.
export const CAMPOS_BUSCA_CONEXOES = {
    texto: 'texto',
    titulo: 'texto',
    obra: 'obra',
    nome: 'obra',
    autor: 'autor',
    origem: 'origem',
    tipo: 'tipo',
    relacao: 'relacao',
    data: 'data',
    pessoal: 'pessoal',
};

// Prefixo canônico (um por campo), para a ajuda e as sugestões.
export const PREFIXOS_BUSCA_CONEXOES = [
    'texto',
    'obra',
    'autor',
    'origem',
    'tipo',
    'relacao',
    'data',
    'pessoal',
];

export const DESCRICAO_PREFIXO_CONEXOES = {
    texto: 'título do texto',
    obra: 'nome da obra',
    autor: 'autor da obra',
    origem: 'lugar ou cultura',
    tipo: 'tipo de obra',
    relacao: 'relação com o texto',
    data: 'data da obra (e Até)',
    pessoal: 'obra pessoal',
};

const textos = (x) => (x?.textos || []).map((t) => t.titulo);

// As datas da obra (cada par "de" e "até" uma vez), como aparecem na tela.
function datasEmTexto(datas = []) {
    return datas.map((d) => d.texto || formatarIntervaloDataObra(d.inicio, d.fim)).filter(Boolean);
}

// "Obra pessoal": `todas` ou `algumas` valem `sim`; o próprio estado também
// vale (`pessoal:algumas`). `nenhuma` não tem valor, então `pessoal:*` acha só
// quem tem a marca e `-pessoal:*` quem não tem.
function pessoalEmTexto(estado) {
    return estado === 'todas' || estado === 'algumas' ? ['sim', estado] : [];
}

// Os valores de cada prefixo, por tipo de lista.
const VALORES = {
    obras: (o) => ({
        texto: textos(o),
        obra: [o.obra, ...(o.grafias || [])],
        autor: o.autores || [],
        origem: (o.origens || []).flat(),
        tipo: [o.tipoObra],
        relacao: Object.keys(o.porRelacao || {}),
        data: datasEmTexto(o.datas),
        pessoal: pessoalEmTexto(o.obraPessoal),
    }),
    autores: (a) => ({
        texto: textos(a),
        obra: (a.obras || []).map((o) => o.obra),
        autor: [a.autor],
        origem: (a.origens || []).flat(),
        tipo: (a.obras || []).map((o) => o.tipoObra),
        relacao: a.relacoes || [],
        data: datasEmTexto(a.datas),
        pessoal: pessoalEmTexto(a.obraPessoal),
    }),
    origens: (g) => ({
        texto: textos(g),
        obra: (g.obras || []).map((o) => o.obra),
        autor: g.autores || [],
        // O item "Sem origem preenchida" não tem valor de origem: assim
        // `-origem:*` o encontra, como encontra as obras sem origem.
        origem: g.semOrigem ? [] : [g.origem],
        tipo: (g.obras || []).map((o) => o.tipoObra),
        relacao: g.relacoes || [],
        data: datasEmTexto(g.datas),
        pessoal: pessoalEmTexto(g.obraPessoal),
    }),
};

export const TIPOS_LISTA_CONEXOES = Object.keys(VALORES);

// Os valores (texto puro, sem vazios) que o item tem em cada prefixo.
export function valoresDeBuscaConexoes(tipoLista, item) {
    const f = VALORES[tipoLista];
    if (!f || !item) return {};
    const porCampo = f(item);
    return Object.fromEntries(
        Object.entries(porCampo).map(([campo, lista]) => [
            campo,
            lista.map((v) => String(v ?? '').trim()).filter(Boolean),
        ]),
    );
}

// A consulta interpretada, ou `null` quando não é avançada (a busca de sempre).
export function interpretarBuscaConexoes(consulta) {
    const bruta = String(consulta ?? '');
    if (!bruta.trim()) return null;
    const parsed = parseConsultaBusca(bruta, CAMPOS_BUSCA_CONEXOES);
    const usaCampo = [...parsed.gruposIncluir.flat(), ...parsed.termosExcluir].some((t) => t.campo);
    // `origem:` ainda sem valor (a pessoa está digitando): não filtra nada, em
    // vez de procurar a palavra "origem".
    const prefixoSemValor = bruta.split(/\s+/).some((token) => {
        const m = token.match(/^-?([a-zA-Zà-úÀ-Ú]+):$/);
        return Boolean(m && CAMPOS_BUSCA_CONEXOES[normalizarBusca(m[1])]);
    });
    const avancada =
        usaCampo ||
        prefixoSemValor ||
        parsed.termosExcluir.length > 0 ||
        parsed.gruposIncluir.length > 1 ||
        bruta.includes('"');
    return avancada ? parsed : null;
}

// O item casa a busca avançada? `camposGerais` são os textos onde um termo sem
// prefixo é procurado (os mesmos da busca simples daquela lista).
export function bateBuscaConexoes(item, tipoLista, interpretada, camposGerais = []) {
    const { gruposIncluir, termosExcluir } = interpretada;
    const opts = opcoesBuscaPadrao();
    const porCampo = valoresDeBuscaConexoes(tipoLista, item);
    const geral = normalizarBusca(camposGerais.filter(Boolean).join(' '), opts);
    const bate = (t) => {
        const alvo = normalizarBusca(t.termo, opts);
        if (!t.campo) return valorBateTermo(geral, alvo, opts.palavraInteira);
        const valores = (porCampo[t.campo] || []).map((v) => normalizarBusca(v, opts));
        if (t.presenca) return valores.length > 0;
        return valores.some((v) => valorBateTermo(v, alvo, opts.palavraInteira));
    };
    const incluido = !gruposIncluir.length || gruposIncluir.some((g) => g.every(bate));
    return incluido && !termosExcluir.some(bate);
}

// ─── Filtro por conteúdo (Autores e Origens) ─────────────────
//
// Nas listas de Autores e de Origens, o filtro por campo vale para as obras
// (usos) DENTRO de cada item, não para o item inteiro: `-pessoal:*` deixa a
// origem com só as obras não pessoais, e ela só some quando não sobra nenhuma.
// Ficam no item inteiro: o prefixo do próprio nome da lista (`autor:` em
// Autores, `origem:` em Origens), `pessoal:todas` e `pessoal:algumas` (o estado
// do grupo) e o termo sem prefixo.

const LUGAR_DA_LISTA = { autores: 'autor', origens: 'origem' };

// Os valores de um uso (uma entrada de obra de um texto) em cada prefixo.
function valoresDoUso(u) {
    return {
        texto: [u.titulo],
        obra: [u.obra],
        autor: u.autores || [],
        origem: u.origens || [],
        tipo: [u.tipoObra],
        relacao: [u.relacao],
        data: datasEmTexto(u.datas ? [u.datas] : []),
        pessoal: u.obraPessoal ? ['sim'] : [],
    };
}

function termoDoGrupo(t, tipoLista) {
    if (!t.campo) return true;
    if (t.campo === LUGAR_DA_LISTA[tipoLista]) return true;
    if (t.campo === 'pessoal' && !t.presenca) {
        return ['todas', 'algumas'].includes(normalizarBusca(t.termo, opcoesBuscaPadrao()));
    }
    return false;
}

// `{ bate, usos }`: o item casa a consulta e quais dos usos dele sobram.
// Sem usos guardados (`usosDoItem` vazio), vale a busca no item inteiro.
export function filtrarItemPorConteudo(item, tipoLista, interpretada, camposGerais, usosDoItem) {
    if (!usosDoItem?.length) {
        return { bate: bateBuscaConexoes(item, tipoLista, interpretada, camposGerais), usos: null };
    }
    const { gruposIncluir, termosExcluir } = interpretada;
    const opts = opcoesBuscaPadrao();
    const porCampo = valoresDeBuscaConexoes(tipoLista, item);
    const geral = normalizarBusca(camposGerais.filter(Boolean).join(' '), opts);
    const bateGrupo = (t) => {
        const alvo = normalizarBusca(t.termo, opts);
        if (!t.campo) return valorBateTermo(geral, alvo, opts.palavraInteira);
        const valores = (porCampo[t.campo] || []).map((v) => normalizarBusca(v, opts));
        if (t.presenca) return valores.length > 0;
        return valores.some((v) => valorBateTermo(v, alvo, opts.palavraInteira));
    };
    const bateUso = (t, u) => {
        const alvo = normalizarBusca(t.termo, opts);
        const valores = (valoresDoUso(u)[t.campo] || [])
            .map((v) => String(v ?? '').trim())
            .filter(Boolean)
            .map((v) => normalizarBusca(v, opts));
        if (t.presenca) return valores.length > 0;
        return valores.some((v) => valorBateTermo(v, alvo, opts.palavraInteira));
    };
    const doGrupo = (t) => termoDoGrupo(t, tipoLista);

    if (termosExcluir.filter(doGrupo).some(bateGrupo)) return { bate: false, usos: [] };

    let sobram;
    if (!gruposIncluir.length) {
        sobram = new Set(usosDoItem);
    } else {
        sobram = new Set();
        gruposIncluir.forEach((ramo) => {
            if (!ramo.filter(doGrupo).every(bateGrupo)) return;
            const deUso = ramo.filter((t) => !doGrupo(t));
            usosDoItem.forEach((u) => {
                if (deUso.every((t) => bateUso(t, u))) sobram.add(u);
            });
        });
    }
    termosExcluir
        .filter((t) => !doGrupo(t))
        .forEach((t) => {
            [...sobram].forEach((u) => {
                if (bateUso(t, u)) sobram.delete(u);
            });
        });
    const usos = usosDoItem.filter((u) => sobram.has(u));
    return { bate: usos.length > 0, usos };
}
