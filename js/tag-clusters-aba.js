// tag-clusters-aba.js: aba Tag clusters (Fase 17, entrega 2).
//
// Tela sobre `db.tagClusters` (lógica pura em tag-clusters.js), no molde da
// aba Assuntos: um cartão por tag cluster com as etiquetas dele, criar,
// renomear, excluir e a triagem "Etiquetas sem cluster". O vínculo mora na
// etiqueta (`clusterId`), então nada aqui toca em texto: excluir um cluster
// só solta as etiquetas. Toda ação que muda algo devolve Desfazer.

import { db, save } from './db.js';
import {
    escapeHtml,
    chaveTema,
    escaparAspasBusca,
    mostrarAviso,
    mostrarAvisoComAcao,
} from './utils.js';
import { garantirModal } from './modais.js';
import { toggleModal } from './ui.js';
import {
    ICONE_EDITAR,
    ICONE_EXCLUIR,
    ICONE_LISTA_TEXTOS,
    abrirListaComConsulta,
} from './render-listas.js';
import { ROTULOS_ETIQUETAS, contarTextosPorEtiqueta } from './etiquetas.js';
import { PREFIXO_BUSCA } from './etiquetas-aba.js';
import { baixarTagClustersMarkdown } from './exportar-tag-clusters.js';
import { importarTagClusters } from './importar-tag-clusters.js';
import {
    CATEGORIAS_COM_CLUSTER,
    CATEGORIAS_EM_ORDEM,
    criarCluster,
    editarCluster,
    excluirCluster,
    atribuirEtiquetasAoCluster,
    clusterDaEtiqueta,
    clustersDaCategoria,
    etiquetasDoCluster,
    etiquetasSemCluster,
    textosDoCluster,
    contarTextosPorCluster,
} from './tag-clusters.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const textosRotulo = (n) => plural(n, 'texto', 'textos');

function achar(id) {
    return (db.tagClusters || []).find((c) => c.id == id);
}

function achaEtiqueta(id) {
    return (db.etiquetas || []).find((e) => e.id == id);
}

// ─── Recolher e expandir ───────────────────────────────────────────────

// Estado só em memória (some ao recarregar, sem chave nova no
// armazenamento): categorias inteiras e cartões de cluster recolhidos.
const categoriasRecolhidas = new Set();
const clustersRecolhidos = new Set();

export function alternarCategoriaTagClusters(categoria) {
    if (!CATEGORIAS_COM_CLUSTER.includes(categoria)) return;
    if (categoriasRecolhidas.has(categoria)) categoriasRecolhidas.delete(categoria);
    else categoriasRecolhidas.add(categoria);
    renderTagClusters();
}

export function alternarTagCluster(id) {
    const c = achar(id);
    if (!c) return;
    if (clustersRecolhidos.has(c.id)) clustersRecolhidos.delete(c.id);
    else clustersRecolhidos.add(c.id);
    renderTagClusters();
}

export function recolherTodosTagClusters() {
    CATEGORIAS_COM_CLUSTER.forEach((c) => categoriasRecolhidas.add(c));
    (db.tagClusters || []).forEach((c) => clustersRecolhidos.add(c.id));
    renderTagClusters();
}

export function expandirTodosTagClusters() {
    categoriasRecolhidas.clear();
    clustersRecolhidos.clear();
    renderTagClusters();
}

// ─── Tela ──────────────────────────────────────────────────────────────

function prepararFiltroCategoria() {
    const select = document.getElementById('filtro-categoria-tag-clusters');
    if (!select || select.options.length > 1) return;
    select.innerHTML =
        '<option value="">Todas as categorias</option>' +
        CATEGORIAS_EM_ORDEM.map(
            (c) => `<option value="${c}">${escapeHtml(ROTULOS_ETIQUETAS[c])}</option>`,
        ).join('');
}

function chipEtiqueta(e, textos) {
    const usada = textos > 0;
    const cor = usada
        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
        : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 italic';
    const titulo = usada ? textosRotulo(textos) : 'Nenhum texto usa esta etiqueta';
    return `<span title="${titulo}" class="text-[10px] ${cor} pl-1.5 pr-0.5 py-0.5 rounded mr-1 mb-1 inline-flex items-center gap-0.5">${escapeHtml(e.nome)}${usada ? ` · ${textos}` : ''}<button type="button" data-action="tirar-etiqueta-do-cluster" data-id="${e.id}" title="Tirar “${escapeHtml(e.nome)}” deste tag cluster" aria-label="Tirar ${escapeHtml(e.nome)} deste tag cluster" class="px-1 rounded hover:bg-black/10 dark:hover:bg-white/10">×</button></span>`;
}

function seletorAdicionar(cluster) {
    const livres = etiquetasSemCluster(db, cluster.categoria);
    if (livres.length === 0) return '';
    const opcoes = livres
        .map((e) => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`)
        .join('');
    return `<select data-cluster="${cluster.id}" onchange="adicionarEtiquetaAoClusterDoCartao(this)" aria-label="Adicionar etiqueta ao tag cluster ${escapeHtml(cluster.nome)}" style="width: auto; margin-bottom: 0">
        <option value="">Adicionar etiqueta…</option>
        ${opcoes}
    </select>`;
}

function cartaoCluster(c, usoClusters, usoEtiquetas, fechado) {
    const etiquetas = etiquetasDoCluster(db, c.id);
    const totalTextos = usoClusters.get(c.id) || 0;
    const chips = etiquetas.map((e) => chipEtiqueta(e, usoEtiquetas.get(e.id) || 0)).join('');
    const nota = c.notas
        ? `<p class="text-[11px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">${escapeHtml(c.notas)}</p>`
        : '';
    const iconeBotao = 'inline-flex items-center justify-center p-1.5 rounded';
    return `
<div data-cluster-id="${c.id}" data-recolhido="${fechado}" class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-start gap-3">
    <div class="flex-1 min-w-0">
        <h4 class="font-bold text-gray-800 dark:text-slate-100">
            <button type="button" data-action="alternar-tag-cluster" data-id="${c.id}" aria-expanded="${!fechado}" title="${fechado ? 'Expandir' : 'Recolher'} o tag cluster" class="text-left hover:text-gray-600 dark:hover:text-slate-300 inline-flex items-start gap-1.5"><span class="text-[9px] mt-1.5" aria-hidden="true">${fechado ? '▸' : '▾'}</span><span>${escapeHtml(c.nome)}</span></button>
        </h4>
        <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
            ${plural(etiquetas.length, 'etiqueta', 'etiquetas')} · aparece em ${textosRotulo(totalTextos)}
        </p>
        <div class="${fechado ? 'hidden' : ''}">
            ${nota}
            ${chips ? `<div class="mt-2">${chips}</div>` : '<p class="text-[11px] text-gray-400 dark:text-slate-500 mt-2">Nenhuma etiqueta ainda.</p>'}
            <div class="mt-2">${seletorAdicionar(c)}</div>
        </div>
    </div>
    <div class="flex gap-3 flex-shrink-0">
        <button data-action="ver-textos-tag-cluster" data-id="${c.id}" title="Ver textos" aria-label="Ver textos" class="${iconeBotao} text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_LISTA_TEXTOS}</button>
        <button data-action="editar-tag-cluster" data-id="${c.id}" title="Editar" aria-label="Editar" class="${iconeBotao} text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
        <button data-action="excluir-tag-cluster" data-id="${c.id}" title="Excluir (as etiquetas ficam sem cluster; nenhum texto muda)" aria-label="Excluir" class="${iconeBotao} text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
    </div>
</div>`;
}

function linhaTriagem(e, textos, clusters) {
    const seletor =
        clusters.length === 0
            ? `<span class="text-[11px] text-gray-400 dark:text-slate-500">Crie um tag cluster de ${escapeHtml(ROTULOS_ETIQUETAS[e.categoria])} para classificar.</span>`
            : `<select data-etiqueta="${e.id}" onchange="colocarEtiquetaNoCluster(this)" aria-label="Pôr a etiqueta ${escapeHtml(e.nome)} em um tag cluster" style="width: auto; margin-bottom: 0">
        <option value="">Pôr em cluster…</option>
        ${clusters.map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('')}
    </select>`;
    return `
<li data-etiqueta-id="${e.id}" class="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
    <span class="text-sm text-gray-800 dark:text-slate-100">${escapeHtml(e.nome)} <span class="text-[10px] font-mono text-gray-400 dark:text-slate-500">${textosRotulo(textos)}</span></span>
    ${seletor}
</li>`;
}

function renderTriagem(busca, categoriaFiltro, usoEtiquetas) {
    const alvo = document.getElementById('etiquetas-sem-cluster');
    if (!alvo) return 0;
    const soltas = etiquetasSemCluster(db).filter(
        (e) =>
            (!categoriaFiltro || e.categoria === categoriaFiltro) &&
            (!busca || chaveTema(e.nome).includes(busca)),
    );
    if (soltas.length === 0) {
        const total = (db.etiquetas || []).filter((e) =>
            CATEGORIAS_COM_CLUSTER.includes(e.categoria),
        );
        alvo.innerHTML =
            total.length === 0 || busca || categoriaFiltro
                ? ''
                : '<p class="text-sm text-gray-400 dark:text-slate-500">Todas as etiquetas já estão em algum tag cluster.</p>';
        return 0;
    }
    const secoes = CATEGORIAS_EM_ORDEM.map((categoria) => {
        const daCategoria = soltas.filter((e) => e.categoria === categoria);
        if (daCategoria.length === 0) return '';
        const clusters = clustersDaCategoria(db, categoria);
        return `
<section data-categoria="${categoria}" class="mb-4">
    <h4 class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">${escapeHtml(ROTULOS_ETIQUETAS[categoria])} <span class="font-mono text-[10px] normal-case text-gray-400 dark:text-slate-500">${daCategoria.length}</span></h4>
    <ul class="divide-y divide-gray-100 dark:divide-slate-800">${daCategoria
        .map((e) => linhaTriagem(e, usoEtiquetas.get(e.id) || 0, clusters))
        .join('')}</ul>
</section>`;
    }).join('');
    alvo.innerHTML = `
<h3 class="text-sm font-bold text-gray-700 dark:text-slate-200 mb-1">Etiquetas sem cluster <span class="font-mono text-[10px] text-gray-400 dark:text-slate-500">${soltas.length}</span></h3>
<p class="text-[11px] text-gray-400 dark:text-slate-500 mb-3">Escolha o tag cluster de cada uma. Quem fica de fora aparece como “Sem cluster” nas Estatísticas.</p>
${secoes}`;
    return soltas.length;
}

export function renderTagClusters() {
    const lista = document.getElementById('lista-tag-clusters');
    if (!lista) return;
    prepararFiltroCategoria();

    const busca = chaveTema(document.getElementById('busca-tag-clusters')?.value || '');
    const categoriaFiltro = document.getElementById('filtro-categoria-tag-clusters')?.value || '';
    const usoClusters = contarTextosPorCluster(db);
    const usoEtiquetas = contarTextosPorEtiqueta(db);
    const todos = db.tagClusters || [];

    const filtrados = todos
        .filter((c) => !categoriaFiltro || c.categoria === categoriaFiltro)
        .filter(
            (c) =>
                !busca ||
                chaveTema(c.nome).includes(busca) ||
                etiquetasDoCluster(db, c.id).some((e) => chaveTema(e.nome).includes(busca)),
        );

    if (filtrados.length === 0) {
        lista.innerHTML = `<div class="text-center text-gray-400 dark:text-slate-500 text-sm py-6">${
            todos.length === 0
                ? 'Nenhum tag cluster cadastrado ainda.'
                : 'Nenhum tag cluster bate com o filtro.'
        }</div>`;
    } else {
        lista.innerHTML = CATEGORIAS_EM_ORDEM.map((categoria) => {
            const daCategoria = filtrados
                .filter((c) => c.categoria === categoria)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            if (daCategoria.length === 0) return '';
            // Com busca ligada, tudo fica aberto para não esconder resultado.
            const categoriaFechada = !busca && categoriasRecolhidas.has(categoria);
            return `
<section data-categoria="${categoria}" data-recolhida="${categoriaFechada}" class="mb-6">
    <h3 class="mb-2">
        <button type="button" data-action="alternar-categoria-tag-clusters" data-categoria="${categoria}" aria-expanded="${!categoriaFechada}" title="${categoriaFechada ? 'Expandir' : 'Recolher'} a categoria" class="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 inline-flex items-center gap-1.5">
            <span class="text-[9px]" aria-hidden="true">${categoriaFechada ? '▸' : '▾'}</span>${escapeHtml(ROTULOS_ETIQUETAS[categoria])} <span class="font-mono text-[10px] normal-case text-gray-400 dark:text-slate-500">${daCategoria.length}</span>
        </button>
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4${categoriaFechada ? ' hidden' : ''}">${daCategoria
        .map((c) =>
            cartaoCluster(c, usoClusters, usoEtiquetas, !busca && clustersRecolhidos.has(c.id)),
        )
        .join('')}</div>
</section>`;
        }).join('');
    }

    const soltas = renderTriagem(busca, categoriaFiltro, usoEtiquetas);
    const resumo = document.getElementById('resumo-tag-clusters');
    if (resumo) {
        resumo.innerHTML = `${filtrados.length} de ${escapeHtml(plural(todos.length, 'tag cluster', 'tag clusters'))} · <button type="button" data-action="ir-etiquetas-sem-cluster" title="Ir para a lista de etiquetas sem cluster" class="underline decoration-dotted hover:text-gray-600 dark:hover:text-slate-300">${escapeHtml(plural(soltas, 'etiqueta sem cluster', 'etiquetas sem cluster'))}</button>`;
    }
}

// Rola a página até a triagem "Etiquetas sem cluster".
export function irParaEtiquetasSemCluster() {
    const alvo = document.getElementById('etiquetas-sem-cluster');
    if (alvo && typeof alvo.scrollIntoView === 'function') {
        alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ─── Criar e editar ────────────────────────────────────────────────────

// Sem `selecionada` (cadastro novo sem filtro de categoria), nada vem
// escolhido: a opção vazia obriga a decidir, em vez de assumir uma categoria.
function opcoesCategoria(select, selecionada) {
    const vazia = selecionada ? '' : '<option value="" selected>Escolha a categoria…</option>';
    select.innerHTML =
        vazia +
        CATEGORIAS_EM_ORDEM.map(
            (c) =>
                `<option value="${c}"${c === selecionada ? ' selected' : ''}>${escapeHtml(ROTULOS_ETIQUETAS[c])}</option>`,
        ).join('');
}

export async function novoTagCluster() {
    await garantirModal('modal-tag-cluster');
    document.getElementById('form-tag-cluster')?.reset();
    document.getElementById('tc-edit-id').value = '';
    const select = document.getElementById('tc-categoria');
    const filtro = document.getElementById('filtro-categoria-tag-clusters')?.value;
    opcoesCategoria(select, CATEGORIAS_COM_CLUSTER.includes(filtro) ? filtro : '');
    select.disabled = false;
    document.getElementById('tc-categoria-dica').classList.add('hidden');
    document.getElementById('modal-tag-cluster-titulo').innerText = 'Cadastrar Tag cluster';
    toggleModal('modal-tag-cluster');
}

export async function editarTagCluster(id) {
    const c = achar(id);
    if (!c) return;
    await garantirModal('modal-tag-cluster');
    document.getElementById('tc-edit-id').value = c.id;
    document.getElementById('tc-nome').value = c.nome;
    document.getElementById('tc-notas').value = c.notas || '';
    const select = document.getElementById('tc-categoria');
    opcoesCategoria(select, c.categoria);
    select.disabled = true;
    document.getElementById('tc-categoria-dica').classList.remove('hidden');
    document.getElementById('modal-tag-cluster-titulo').innerText = 'Editar Tag cluster';
    toggleModal('modal-tag-cluster');
}

export function initFormTagCluster() {
    const form = document.getElementById('form-tag-cluster');
    if (!form) return;

    form.onsubmit = (ev) => {
        ev.preventDefault();
        const id = document.getElementById('tc-edit-id').value;
        const nome = document.getElementById('tc-nome').value;
        const notas = document.getElementById('tc-notas').value.trim();
        if (!nome.trim()) return mostrarAviso('Dê um nome ao tag cluster.');

        if (id) {
            const c = achar(id);
            if (!c) return;
            const r = editarCluster(db, id, { nome, notas });
            if (!r.ok) {
                return mostrarAviso(
                    r.motivo === 'duplicado'
                        ? `Já existe um tag cluster chamado "${r.existente.nome}" em ${ROTULOS_ETIQUETAS[c.categoria]}.`
                        : 'Não foi possível salvar o tag cluster.',
                );
            }
        } else {
            const categoria = document.getElementById('tc-categoria').value;
            const r = criarCluster(db, nome, categoria);
            if (!r.ok) {
                return mostrarAviso(
                    r.motivo === 'duplicado'
                        ? `Já existe um tag cluster chamado "${r.existente.nome}" em ${ROTULOS_ETIQUETAS[categoria]}.`
                        : 'Escolha uma categoria e dê um nome ao tag cluster.',
                );
            }
            if (notas) r.cluster.notas = notas;
        }
        save();
        toggleModal('modal-tag-cluster');
    };
}

// Botão "Baixar .md" da aba: o cadastro inteiro, para colar numa IA.
export function baixarTagClustersMd() {
    baixarTagClustersMarkdown(db);
}

// ─── Importar por lista colada ─────────────────────────────────────────

const MOTIVOS_AVISO = {
    'sem-dois-pontos': 'faltou o ":" entre o cluster e as etiquetas',
    'sem-nome-de-cluster': 'faltou o nome do cluster antes do ":"',
    'sem-categoria': 'sem categoria: escolha uma acima ou ponha um título como “## Tom”',
    'titulo-ignorado': 'título que não é uma categoria que aceita cluster',
};

// Desfazer da última importação (a do relatório aberto). Só vale uma vez.
let desfazerImportacao = null;

export async function abrirImportarTagClusters() {
    await garantirModal('modal-importar-tag-clusters');
    document.getElementById('form-importar-tag-clusters')?.reset();
    const filtro = document.getElementById('filtro-categoria-tag-clusters')?.value;
    opcoesCategoria(
        document.getElementById('itc-categoria'),
        CATEGORIAS_COM_CLUSTER.includes(filtro) ? filtro : '',
    );
    document.getElementById('itc-relatorio').innerHTML = '';
    desfazerImportacao = null;
    toggleModal('modal-importar-tag-clusters');
}

function itemRelatorio(titulo, linhas) {
    if (linhas.length === 0) return '';
    return `<div class="mt-3"><h4 class="text-xs font-bold text-gray-700 dark:text-slate-200">${titulo} <span class="font-mono text-[10px] text-gray-400 dark:text-slate-500">${linhas.length}</span></h4><ul class="mt-1 text-[11px] text-gray-600 dark:text-slate-300 list-disc pl-5 space-y-0.5">${linhas
        .map((l) => `<li>${l}</li>`)
        .join('')}</ul></div>`;
}

function relatorioImportacao(r) {
    const e = escapeHtml;
    const resumo = [
        plural(r.criados, 'tag cluster criado', 'tag clusters criados'),
        r.reaproveitados ? `${plural(r.reaproveitados, 'já existia', 'já existiam')}` : '',
        plural(r.etiquetasColocadas, 'etiqueta colocada', 'etiquetas colocadas'),
    ]
        .filter(Boolean)
        .join(' · ');
    const naoAchadas = r.naoAchadas.map(
        (n) =>
            `<strong>${e(n.nome)}</strong> (em “${e(n.cluster)}”, ${e(ROTULOS_ETIQUETAS[n.categoria])}): não existe nessa categoria`,
    );
    const movidas = r.movidas.map(
        (m) => `<strong>${e(m.nome)}</strong> saiu de “${e(m.de)}” e foi para “${e(m.para)}”`,
    );
    const repetidas = r.repetidas.map(
        (m) =>
            `<strong>${e(m.nome)}</strong> aparece em “${e(m.de)}” e em “${e(m.para)}”: ficou em “${e(m.para)}”`,
    );
    const avisos = r.avisos.map(
        (a) => `linha ${a.linha}: ${e(MOTIVOS_AVISO[a.motivo] || a.motivo)}`,
    );
    return `
<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
        <p class="text-sm font-semibold text-gray-800 dark:text-slate-100">${resumo}</p>
        <button type="button" data-action="desfazer-importacao-tag-clusters" class="text-xs border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 px-3 py-1.5 rounded hover:bg-white dark:hover:bg-slate-800">Desfazer importação</button>
    </div>
    ${itemRelatorio('Etiquetas não encontradas (nada foi criado)', naoAchadas)}
    ${itemRelatorio('Etiquetas que mudaram de cluster', movidas)}
    ${itemRelatorio('Etiquetas repetidas na lista', repetidas)}
    ${itemRelatorio('Linhas com problema', avisos)}
</div>`;
}

export function initFormImportarTagClusters() {
    const form = document.getElementById('form-importar-tag-clusters');
    if (!form) return;

    form.onsubmit = (ev) => {
        ev.preventDefault();
        const texto = document.getElementById('itc-texto').value;
        const categoria = document.getElementById('itc-categoria').value;
        if (!texto.trim()) return mostrarAviso('Cole a lista de clusters.');

        const r = importarTagClusters(db, texto, categoria);
        const alvo = document.getElementById('itc-relatorio');
        if (!r.ok) {
            desfazerImportacao = null;
            alvo.innerHTML = itemRelatorio(
                'Nada foi importado',
                r.avisos.map(
                    (a) => `linha ${a.linha}: ${escapeHtml(MOTIVOS_AVISO[a.motivo] || a.motivo)}`,
                ),
            );
            return mostrarAviso(
                'Nenhuma linha válida. Use o formato "Cluster: etiqueta, etiqueta".',
            );
        }
        desfazerImportacao = r.desfazer;
        save();
        alvo.innerHTML = relatorioImportacao(r);
        const faltou = r.naoAchadas.length
            ? ` ${plural(r.naoAchadas.length, 'etiqueta não achada', 'etiquetas não achadas')}.`
            : '';
        mostrarAvisoComAcao(
            `${plural(r.criados, 'tag cluster criado', 'tag clusters criados')}, ${plural(r.etiquetasColocadas, 'etiqueta colocada', 'etiquetas colocadas')}.${faltou}`,
            'Desfazer',
            () => desfazerImportacaoTagClusters(r.desfazer),
        );
    };
}

// Desfaz a importação (pelo toast ou pelo botão do relatório). Cada
// importação desfaz uma vez só.
export function desfazerImportacaoTagClusters(desfazer = desfazerImportacao) {
    if (!desfazer || desfazer !== desfazerImportacao) {
        return mostrarAviso('Essa importação já foi desfeita ou foi substituída por outra.');
    }
    desfazer();
    desfazerImportacao = null;
    save();
    const alvo = document.getElementById('itc-relatorio');
    if (alvo) {
        alvo.innerHTML =
            '<p class="text-sm text-gray-500 dark:text-slate-400">Importação desfeita.</p>';
    }
}

// ─── Excluir e ver textos ──────────────────────────────────────────────

export function excluirTagClusterComAviso(id) {
    const c = achar(id);
    if (!c) return;
    const r = excluirCluster(db, id);
    if (!r.ok) return;
    save();
    const soltas = r.etiquetas
        ? ` ${plural(r.etiquetas, 'etiqueta ficou', 'etiquetas ficaram')} sem cluster.`
        : '';
    mostrarAvisoComAcao(`Tag cluster "${c.nome}" excluído.${soltas}`, 'Desfazer', () => {
        r.desfazer();
        save();
    });
}

export function verTextosTagCluster(id) {
    const c = achar(id);
    if (!c) return;
    const etiquetas = etiquetasDoCluster(db, id);
    if (etiquetas.length === 0) {
        return mostrarAviso('Este tag cluster ainda não tem etiquetas.');
    }
    const { poemasIds, prosasIds } = textosDoCluster(db, id);
    if (poemasIds.length + prosasIds.length === 0) {
        return mostrarAviso('Nenhum texto usa as etiquetas deste tag cluster ainda.');
    }
    const prefixo = PREFIXO_BUSCA[c.categoria];
    const consulta = etiquetas.map((e) => `${prefixo}:"${escaparAspasBusca(e.nome)}"`).join(' ou ');
    abrirListaComConsulta(
        consulta,
        poemasIds,
        prosasIds,
        `Textos filtrados pelo tag cluster “${c.nome}”`,
    );
}

// ─── Atribuir etiquetas ────────────────────────────────────────────────

// Põe (ou solta, com `clusterId` null) uma etiqueta e avisa, com Desfazer.
function atribuirComAviso(etiquetaId, clusterId) {
    const e = achaEtiqueta(etiquetaId);
    if (!e) return;
    const antes = clusterDaEtiqueta(db, e);
    const r = atribuirEtiquetasAoCluster(db, [etiquetaId], clusterId);
    if (!r.ok) {
        return mostrarAviso(
            r.motivo === 'categoria-diferente'
                ? 'Essa etiqueta é de outra categoria que a do tag cluster.'
                : 'Não foi possível classificar a etiqueta.',
        );
    }
    if (r.etiquetas === 0) return;
    save();
    const depois = clusterId == null ? null : achar(clusterId);
    const mensagem = depois
        ? `"${e.nome}" agora está em "${depois.nome}"`
        : `"${e.nome}" saiu de ${antes ? `"${antes.nome}"` : 'seu tag cluster'}`;
    mostrarAvisoComAcao(mensagem, 'Desfazer', () => {
        r.desfazer();
        save();
    });
}

export function tirarEtiquetaDoCluster(etiquetaId) {
    atribuirComAviso(etiquetaId, null);
}

// Handler do select "Pôr em cluster…" da triagem (onchange inline).
export function colocarEtiquetaNoCluster(select) {
    const etiquetaId = Number(select.dataset.etiqueta);
    const clusterId = select.value;
    select.value = '';
    if (!clusterId) return;
    atribuirComAviso(etiquetaId, Number(clusterId));
}

// Handler do select "Adicionar etiqueta…" do cartão do cluster.
export function adicionarEtiquetaAoClusterDoCartao(select) {
    const clusterId = Number(select.dataset.cluster);
    const etiquetaId = select.value;
    select.value = '';
    if (!etiquetaId) return;
    atribuirComAviso(Number(etiquetaId), clusterId);
}

// Handler do select "Cluster" do cartão da aba Etiquetas: valor vazio
// solta a etiqueta.
export function definirClusterDaEtiqueta(select) {
    const etiquetaId = Number(select.dataset.etiqueta);
    const valor = select.value;
    const e = achaEtiqueta(etiquetaId);
    if (!e) return;
    const atual = clusterDaEtiqueta(db, e);
    if ((atual ? String(atual.id) : '') === valor) return;
    atribuirComAviso(etiquetaId, valor === '' ? null : Number(valor));
}
