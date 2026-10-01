import { contarTextosFiltrados, filtrarPorIntervalo } from './estatisticas-dados.js';
import {
    agregarPorLocal,
    tiposDeLocalComTexto,
    locaisDeEscritaParaSelecao,
    agregarAssuntosPorLocalEscrita,
    agregarPorIdioma,
} from './estatisticas-dados-local-idioma.js';
import {
    getModoLocalEstatisticas,
    definirModoLocalEstatisticas,
    getTipoLocalEstatisticas,
    definirTipoLocalEstatisticas,
    getLocalAssuntosEscrita,
    definirLocalAssuntosEscrita,
    getPapelIdiomaEstatisticas,
    definirPapelIdiomaEstatisticas,
    PAPEIS_IDIOMA_ESTATISTICAS,
    ROTULOS_PAPEL_IDIOMA_ESTATISTICAS,
    TIPO_LOCAL_SEM_TIPO,
    getMinimoAparicoes,
    getOcultosGrafico,
    filtrarOcultos,
} from './estatisticas-filtros.js';
import {
    criarBarChart,
    montarPainel,
    renderFiltrosCompartilhados,
    navegarParaLista,
    tipoDestino,
    bindDrillDownBarra,
} from './estatisticas-tela-comum.js';
import { seletorOcultos } from './estatisticas-tela-temas-pessoas.js';
import { consultaBuscaDoLocal } from './locais.js';
import { escapeHtml } from './utils.js';
import { db } from './db.js';

// Os dois gráficos de Local são o mesmo componente com configuração própria.
// `prefixos` diz qual busca o clique na barra abre: o modo "direto" usa o
// prefixo `...direta:` (só o Local marcado), o "agregado" o hierárquico.
const CONFIG_LOCAL = {
    territorialidade: {
        canvas: 'grafico-local-territorialidade',
        painelControles: 'painel-controles-local-territorialidade',
        painelOcultos: 'painel-ocultos-local-territorialidade',
        chaveOcultos: 'local-territorialidade',
        cor: '#10b981',
        prefixos: { direto: 'territorialidadedireta', agregado: 'territorialidade' },
        rotuloDireto: 'Citados diretamente',
        rotuloAgregado: 'Com o que está dentro',
        textoDireto: 'Cada barra conta os textos que marcam exatamente aquele Local.',
        textoAgregado:
            'Cada barra conta os textos que marcam o Local ou qualquer lugar dentro dele (o Brasil inclui as cidades, bairros e estações do Brasil). Um texto conta uma vez por Local, então a soma das barras passa do total de textos.',
    },
    escrita: {
        canvas: 'grafico-local-escrita',
        painelControles: 'painel-controles-local-escrita',
        painelOcultos: 'painel-ocultos-local-escrita',
        chaveOcultos: 'local-escrita',
        cor: '#0ea5e9',
        prefixos: { direto: 'localescritadireta', agregado: 'localescrita' },
        rotuloDireto: 'Escrito no Local',
        rotuloAgregado: 'Com o que está dentro',
        textoDireto: 'Cada barra conta os textos escritos exatamente naquele Local.',
        textoAgregado:
            'Cada barra conta os textos escritos no Local ou em qualquer lugar dentro dele (escrito em Santos também conta para o Brasil). A soma das barras passa do total de textos.',
    },
};

const TOP_LOCAIS = 12;

function botaoSegmento(ativo, onclick, rotulo) {
    return `<button type="button" onclick="${onclick}" class="px-2 py-0.5 rounded text-[11px] font-semibold ${ativo ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${escapeHtml(rotulo)}</button>`;
}

function seletorControlesLocal(campo, cfg) {
    const modo = getModoLocalEstatisticas(campo);
    const tipoAtual = getTipoLocalEstatisticas(campo);
    const tipos = tiposDeLocalComTexto(campo, modo);
    // Um tipo salvo que já não tem texto continua na lista, senão o filtro
    // ficaria ativo sem aparecer no seletor.
    if (tipoAtual && !tipos.some((t) => t.valor === tipoAtual)) {
        tipos.push({
            valor: tipoAtual,
            rotulo: tipoAtual === TIPO_LOCAL_SEM_TIPO ? 'Sem tipo' : tipoAtual,
            locais: 0,
        });
    }
    const opcoes = [
        `<option value="">Todos os tipos</option>`,
        ...tipos.map(
            (t) =>
                `<option value="${escapeHtml(t.valor)}" ${t.valor === tipoAtual ? 'selected' : ''}>${escapeHtml(t.rotulo)} (${t.locais})</option>`,
        ),
    ].join('');
    const botoes =
        botaoSegmento(
            modo === 'direto',
            `definirModoLocalEstatisticas('${campo}', 'direto')`,
            cfg.rotuloDireto,
        ) +
        botaoSegmento(
            modo === 'agregado',
            `definirModoLocalEstatisticas('${campo}', 'agregado')`,
            cfg.rotuloAgregado,
        );
    const nomeTipo = tipoAtual ? (tipoAtual === TIPO_LOCAL_SEM_TIPO ? 'Sem tipo' : tipoAtual) : '';
    const aviso = `<p class="text-[10px] ${modo === 'agregado' || tipoAtual ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'} mt-1">${escapeHtml(modo === 'agregado' ? cfg.textoAgregado : cfg.textoDireto)}${nomeTipo ? ` Só Locais do tipo ${escapeHtml(nomeTipo)}.` : ''}</p>`;
    return `<div class="flex items-center gap-2 flex-wrap"><span class="text-[11px] text-gray-500 dark:text-slate-400">Contar:</span>${botoes}<span class="text-[11px] text-gray-500 dark:text-slate-400 ml-2">Tipo:</span><select onchange="definirTipoLocalEstatisticas('${campo}', this.value)" style="width:auto;margin:0">${opcoes}</select></div>${aviso}`;
}

function renderGraficoLocal(campo, total) {
    const cfg = CONFIG_LOCAL[campo];
    const modo = getModoLocalEstatisticas(campo);
    const base = agregarPorLocal({ campo });
    const idPorRotulo = new Map(base.labels.map((l, i) => [l, base.ids[i]]));
    const cortado = filtrarPorIntervalo(base, getMinimoAparicoes(cfg.chaveOcultos) || '', '');
    const visivel = filtrarOcultos(cortado, getOcultosGrafico(cfg.chaveOcultos));
    criarBarChart(
        cfg.canvas,
        visivel.labels.slice(0, TOP_LOCAIS),
        visivel.data.slice(0, TOP_LOCAIS),
        cfg.cor,
        total,
    );
    montarPainel(cfg.painelControles, seletorControlesLocal(campo, cfg));
    montarPainel(
        cfg.painelOcultos,
        seletorOcultos(cfg.chaveOcultos, cortado.labels, base.labels.length),
    );
    // O clique abre a lista com a mesma regra da barra: o prefixo do modo e
    // o termo "Nome (Tipo)" que separa homônimos.
    bindDrillDownBarra(cfg.canvas, (label) => {
        const id = idPorRotulo.get(label);
        if (id == null) return;
        navegarParaLista(consultaBuscaDoLocal(db, id, cfg.prefixos[modo]), '', tipoDestino());
    });
}

function seletorLocalAssuntos(opcoes, atual) {
    const lista = [
        `<option value="">Todos os textos com local de escrita</option>`,
        ...opcoes.map(
            (o) =>
                `<option value="${escapeHtml(o.id)}" ${o.id === atual ? 'selected' : ''}>${escapeHtml(o.rotulo)} (${o.n})</option>`,
        ),
    ].join('');
    return `<div class="flex items-center gap-2 flex-wrap"><span class="text-[11px] text-gray-500 dark:text-slate-400">Escritos em:</span><select onchange="definirLocalAssuntosEscrita(this.value)" style="width:auto;margin:0">${lista}</select></div>`;
}

function renderAssuntosPorLocalEscrita(total) {
    const opcoes = locaisDeEscritaParaSelecao();
    const salvo = getLocalAssuntosEscrita();
    // Local apagado ou sem texto neste recorte: volta a "todos" sem mexer na
    // escolha guardada (ela reaparece se o Local voltar a ter texto).
    const atual = opcoes.some((o) => o.id === salvo) ? salvo : '';
    const dados = agregarAssuntosPorLocalEscrita(atual);
    const base = { labels: dados.labels, data: dados.data };
    const cortado = filtrarPorIntervalo(base, getMinimoAparicoes('assuntos-escrita') || '', '');
    const visivel = filtrarOcultos(cortado, getOcultosGrafico('assuntos-escrita'));
    criarBarChart('grafico-assuntos-escrita', visivel.labels, visivel.data, '#059669', total);
    montarPainel('painel-local-assuntos-escrita', seletorLocalAssuntos(opcoes, atual));
    montarPainel(
        'painel-ocultos-assuntos-escrita',
        seletorOcultos('assuntos-escrita', cortado.labels, base.labels.length),
    );
    const contexto = document.getElementById('est-assuntos-escrita-contexto');
    if (contexto) {
        const n = dados.textos;
        contexto.textContent = n
            ? `${n} ${n === 1 ? 'texto' : 'textos'} neste recorte. Um texto com temas de mais de um Assunto conta em cada um.`
            : 'Nenhum texto com local de escrita neste recorte.';
    }
    // Sem Local escolhido, `localescrita:*` limita a lista aos textos que têm
    // local de escrita, como a barra.
    const consultaLocal = atual
        ? consultaBuscaDoLocal(db, atual, 'localescrita')
        : 'localescrita:*';
    bindDrillDownBarra('grafico-assuntos-escrita', (label) =>
        navegarParaLista(
            `assunto:"${String(label).replace(/"/g, '')}" ${consultaLocal}`,
            '',
            tipoDestino(),
        ),
    );
}

function seletorPapelIdioma() {
    const atual = getPapelIdiomaEstatisticas();
    const botoes = PAPEIS_IDIOMA_ESTATISTICAS.map((v) =>
        botaoSegmento(
            atual === v,
            `definirPapelIdiomaEstatisticas('${v}')`,
            ROTULOS_PAPEL_IDIOMA_ESTATISTICAS[v],
        ),
    ).join('');
    const aviso =
        atual === 'todos'
            ? ''
            : `<p class="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Contando só idiomas com papel: ${escapeHtml(ROTULOS_PAPEL_IDIOMA_ESTATISTICAS[atual])}.</p>`;
    return `<div class="flex items-center gap-1 flex-wrap"><span class="text-[11px] text-gray-500 dark:text-slate-400 mr-1">Papel do idioma:</span>${botoes}</div>${aviso}`;
}

function renderIdiomas(total) {
    const papel = getPapelIdiomaEstatisticas();
    const dados = agregarPorIdioma(papel);
    const base = { labels: dados.labels, data: dados.data };
    const cortado = filtrarPorIntervalo(base, getMinimoAparicoes('idiomas') || '', '');
    const visivel = filtrarOcultos(cortado, getOcultosGrafico('idiomas'));
    criarBarChart('grafico-idiomas', visivel.labels, visivel.data, '#7c3aed', total);
    montarPainel('painel-papel-idioma', seletorPapelIdioma());
    montarPainel(
        'painel-ocultos-idiomas',
        seletorOcultos('idiomas', cortado.labels, base.labels.length),
    );
    const contexto = document.getElementById('est-idiomas-contexto');
    if (contexto) {
        const soma = dados.data.reduce((a, b) => a + b, 0);
        const n = dados.textos;
        const aviso =
            soma > n
                ? ` A soma das barras (${soma}) passa do total porque um texto com mais de um idioma, ou com dois Principais, conta uma vez em cada.`
                : '';
        contexto.textContent = n
            ? `${n} ${n === 1 ? 'texto' : 'textos'} neste recorte.${aviso}`
            : 'Nenhum texto com idioma neste recorte.';
    }
    const prefixo =
        { principal: 'idiomaprincipal:', secundario: 'idiomasecundario:' }[papel] || 'idioma:';
    bindDrillDownBarra('grafico-idiomas', (label) =>
        navegarParaLista(`${prefixo}"${String(label).replace(/"/g, '')}"`, '', tipoDestino()),
    );
}

window.definirModoLocalEstatisticas = definirModoLocalEstatisticas;
window.definirTipoLocalEstatisticas = definirTipoLocalEstatisticas;
window.definirLocalAssuntosEscrita = definirLocalAssuntosEscrita;
window.definirPapelIdiomaEstatisticas = definirPapelIdiomaEstatisticas;

export function renderLocalIdioma() {
    renderFiltrosCompartilhados();
    const total = contarTextosFiltrados().total || null;
    renderGraficoLocal('territorialidade', total);
    renderGraficoLocal('escrita', total);
    renderAssuntosPorLocalEscrita(total);
    renderIdiomas(total);
}
