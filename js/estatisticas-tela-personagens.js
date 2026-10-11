import { contarTextosFiltrados, filtrarPorIntervalo } from './estatisticas-dados.js';
import {
    PREFIXO_BUSCA_PAPEL_PERSONAGEM,
    agregarPorPersonagem,
    agregarPersonagensPorPapel,
    agregarPersonagensPorCentralidade,
    distribuicaoPersonagensPorTexto,
    agregarEcosPorPersonagem,
} from './estatisticas-dados-personagens.js';
import { getMinimoAparicoes, getOcultosGrafico, filtrarOcultos } from './estatisticas-filtros.js';
import {
    criarBarChart,
    montarPainel,
    renderFiltrosCompartilhados,
    navegarParaLista,
    tipoDestino,
    bindDrillDownBarra,
    seletorOcultos,
} from './estatisticas-tela-comum.js';

const TOP_PERSONAGENS = 12;

function termoEntreAspas(label) {
    return String(label).replace(/"/g, '');
}

function textoDeContexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

function pluralTextos(n) {
    return `${n} ${n === 1 ? 'texto' : 'textos'}`;
}

function renderPersonagensPorTexto(total) {
    const base = agregarPorPersonagem();
    const cortado = filtrarPorIntervalo(base, getMinimoAparicoes('personagens') || '', '');
    const visivel = filtrarOcultos(cortado, getOcultosGrafico('personagens'));
    criarBarChart(
        'grafico-personagens-textos',
        visivel.labels.slice(0, TOP_PERSONAGENS),
        visivel.data.slice(0, TOP_PERSONAGENS),
        '#8b5cf6',
        total,
    );
    montarPainel(
        'painel-ocultos-personagens',
        seletorOcultos('personagens', cortado.labels, base.labels.length),
    );
    textoDeContexto(
        'est-personagens-contexto',
        base.labels.length
            ? ''
            : 'Nenhum texto deste recorte tem Personagem. Cadastre em Cadastros › Personagens e ligue no grupo Personagens do texto.',
    );
    bindDrillDownBarra('grafico-personagens-textos', (label) =>
        navegarParaLista(`personagem:"${termoEntreAspas(label)}"`, '', tipoDestino()),
    );
}

function renderPapeis(total) {
    const dados = agregarPersonagensPorPapel();
    criarBarChart('grafico-personagens-papeis', dados.labels, dados.data, '#7c3aed', total);
    const soma = dados.data.reduce((a, b) => a + b, 0);
    textoDeContexto(
        'est-personagens-papeis-contexto',
        soma
            ? 'Um texto conta em cada papel que algum Personagem tem nele, então a soma das barras passa do total.'
            : 'Nenhum texto deste recorte tem Personagem com papel.',
    );
    bindDrillDownBarra('grafico-personagens-papeis', (label) => {
        const prefixo = PREFIXO_BUSCA_PAPEL_PERSONAGEM[label];
        if (prefixo) navegarParaLista(`${prefixo}:*`, '', tipoDestino());
    });
}

function renderCentralidade(total) {
    const dados = agregarPersonagensPorCentralidade();
    criarBarChart('grafico-personagens-centralidade', dados.labels, dados.data, '#a855f7', total);
    textoDeContexto(
        'est-personagens-centralidade-contexto',
        'Indefinido é a centralidade ainda não preenchida. Só Menção/Alusão é o Personagem que só é mencionado ou aludido: não tem centralidade e não conta como falta. Essa barra não abre lista.',
    );
    const prefixoPorRotulo = new Map(dados.labels.map((l, i) => [l, dados.prefixos[i]]));
    bindDrillDownBarra('grafico-personagens-centralidade', (label) => {
        const prefixo = prefixoPorRotulo.get(label);
        if (prefixo) navegarParaLista(`${prefixo}:*`, '', tipoDestino());
    });
}

function renderDistribuicao(total) {
    const dados = distribuicaoPersonagensPorTexto();
    criarBarChart('grafico-personagens-por-texto', dados.labels, dados.data, '#c084fc', total);
    textoDeContexto(
        'est-personagens-por-texto-contexto',
        dados.textos
            ? `${pluralTextos(dados.textos)} neste recorte. Cada texto cai numa faixa só, então a soma das barras é o total.`
            : 'Nenhum texto neste recorte.',
    );
}

function renderEcos() {
    const dados = agregarEcosPorPersonagem();
    const base = { labels: dados.labels, data: dados.data };
    const cortado = filtrarPorIntervalo(base, getMinimoAparicoes('ecos-personagem') || '', '');
    const visivel = filtrarOcultos(cortado, getOcultosGrafico('ecos-personagem'));
    criarBarChart(
        'grafico-personagens-ecos',
        visivel.labels.slice(0, TOP_PERSONAGENS),
        visivel.data.slice(0, TOP_PERSONAGENS),
        '#6d28d9',
        null,
    );
    montarPainel(
        'painel-ocultos-personagens-ecos',
        seletorOcultos('ecos-personagem', cortado.labels, base.labels.length),
    );
    const soma = dados.data.reduce((a, b) => a + b, 0);
    let contexto;
    if (!dados.ecos) {
        contexto = 'Nenhum Eco "Personagem em comum" neste recorte.';
    } else {
        const quantos = `${dados.ecos} ${dados.ecos === 1 ? 'Eco' : 'Ecos'} "Personagem em comum" neste recorte.`;
        const passa =
            soma > dados.ecos - dados.semAncora
                ? ` A soma das barras (${soma}) passa do total porque um Eco com mais de um Personagem como âncora conta uma vez em cada.`
                : '';
        const solto = dados.semAncora
            ? ` ${dados.semAncora} ${dados.semAncora === 1 ? 'Eco está' : 'Ecos estão'} sem âncora e ${dados.semAncora === 1 ? 'fica' : 'ficam'} fora das barras.`
            : '';
        contexto = quantos + passa + solto;
    }
    textoDeContexto('est-personagens-ecos-contexto', contexto);
}

export function renderPersonagens() {
    renderFiltrosCompartilhados();
    const total = contarTextosFiltrados().total || null;
    renderPersonagensPorTexto(total);
    renderPapeis(total);
    renderCentralidade(total);
    renderDistribuicao(total);
    renderEcos();
}
