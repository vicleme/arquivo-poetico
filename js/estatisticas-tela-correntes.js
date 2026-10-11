import {
    agregarPorAtributoDaCorrente,
    cruzarProgramaPostura,
    SEM_CLASSIFICACAO,
} from './estatisticas-dados-correntes.js';
import {
    criarBarChart,
    renderFiltrosCompartilhados,
    navegarParaLista,
    tipoDestino,
    bindDrillDownBarra,
} from './estatisticas-tela-comum.js';
import { escapeHtml } from './utils.js';

const COR_POSTURA = '#7c3aed';
const COR_PROGRAMA = '#0284c7';
const COR_SEM_CLASSIFICACAO = '#9ca3af';

const CONFIG_GRAFICO = {
    postura: {
        canvas: 'grafico-correntes-postura',
        contexto: 'est-correntes-postura-contexto',
        cor: COR_POSTURA,
    },
    programa: {
        canvas: 'grafico-correntes-programa',
        contexto: 'est-correntes-programa-contexto',
        cor: COR_PROGRAMA,
    },
};

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Texto de apoio sob cada gráfico: o que entra no denominador, o que fica
// fora e por que a soma das barras pode passar do total.
export function resumoDoAtributoDaCorrente(dados) {
    if (dados.textos === 0) return 'Nenhum texto neste recorte.';
    const soma = dados.data.reduce((a, b) => a + b, 0);
    const partes = [
        `${plural(dados.denominador, 'texto entra', 'textos entram')} nas barras, de ${plural(dados.textos, 'texto', 'textos')} neste recorte.`,
    ];
    const fora = [];
    if (dados.semCorrente) fora.push(`${dados.semCorrente} sem corrente literária ligada`);
    if (dados.soNaoSeAplica)
        fora.push(`${dados.soNaoSeAplica} só em correntes marcadas Não se aplica`);
    if (fora.length) partes.push(`Ficam fora: ${fora.join(' e ')}.`);
    if (soma > dados.denominador) {
        partes.push(
            `A soma das barras (${soma}) passa do total porque um texto ligado a correntes de valores diferentes conta em cada um.`,
        );
    }
    return partes.join(' ');
}

function renderGraficoAtributo(campo) {
    const cfg = CONFIG_GRAFICO[campo];
    const dados = agregarPorAtributoDaCorrente(campo);
    const cores = dados.labels.map((l) =>
        l === SEM_CLASSIFICACAO ? COR_SEM_CLASSIFICACAO : cfg.cor,
    );
    criarBarChart(cfg.canvas, dados.labels, dados.data, cores, dados.denominador || null);
    const contexto = document.getElementById(cfg.contexto);
    if (contexto) contexto.textContent = resumoDoAtributoDaCorrente(dados);
    // O clique abre a lista com a mesma busca que define a barra.
    const consultaPorRotulo = new Map(dados.labels.map((l, i) => [l, dados.consultas[i]]));
    bindDrillDownBarra(cfg.canvas, (label) => {
        const consulta = consultaPorRotulo.get(label);
        if (consulta) navegarParaLista(consulta, '', tipoDestino());
    });
}

// Cruzamento em tabela: linhas = Programa, colunas = Postura. A cor da célula
// acompanha a contagem; clicar abre a lista com a busca da célula.
export function renderCruzamentoDasCorrentes() {
    const el = document.getElementById('tabela-correntes-cruzamento');
    if (!el) return;
    const { programas, posturas, valores, consultas } = cruzarProgramaPostura();
    const maximo = Math.max(0, ...valores.flat());
    if (maximo === 0) {
        el.innerHTML =
            '<p class="text-xs text-gray-400">Nenhum texto tem, ao mesmo tempo, Programa e Postura classificados neste recorte.</p>';
        return;
    }
    const cabecalho = posturas
        .map(
            (p) =>
                `<th class="px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap">${escapeHtml(p)}</th>`,
        )
        .join('');
    const linhas = programas
        .map((programa, i) => {
            const celulas = valores[i]
                .map((v, j) => {
                    if (!v) {
                        return `<td class="px-2 py-1.5 text-center text-xs text-gray-300 dark:text-slate-600">—</td>`;
                    }
                    const alfa = (0.1 + 0.5 * (v / maximo)).toFixed(2);
                    const titulo = `${programa} × ${posturas[j]}: ${v} texto(s)`;
                    return `<td class="p-0 text-center" style="background: rgba(124, 58, 237, ${alfa})"><button type="button" data-consulta="${escapeHtml(consultas[i][j])}" onclick="abrirListaCorrenteEstatisticas(this)" title="${escapeHtml(titulo)}" class="w-full px-2 py-1.5 text-xs font-semibold text-gray-900 dark:text-slate-50 hover:underline">${v}</button></td>`;
                })
                .join('');
            return `<tr><th class="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">${escapeHtml(programa)}</th>${celulas}</tr>`;
        })
        .join('');
    el.innerHTML = `
        <div class="overflow-x-auto">
            <table class="border-collapse">
                <thead><tr><th class="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400">Programa × Postura</th>${cabecalho}</tr></thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>
        <p class="text-[10px] text-gray-400 mt-2">Cada célula conta os textos que têm o Programa e a Postura (em qualquer das correntes deles). Um texto ligado a correntes diferentes pode contar em mais de uma célula. Ficam fora "Não se aplica" e o que não tem classificação.</p>`;
}

window.abrirListaCorrenteEstatisticas = (botao) => {
    const consulta = botao?.dataset?.consulta;
    if (consulta) navegarParaLista(consulta, '', tipoDestino());
};

export function renderCorrentes() {
    renderFiltrosCompartilhados();
    renderGraficoAtributo('postura');
    renderGraficoAtributo('programa');
    renderCruzamentoDasCorrentes();
}
