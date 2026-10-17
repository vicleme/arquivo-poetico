// etiquetas-aba.js: Aba Etiquetas (Tags), Fase 16, entrega 3.
//
// Tela sobre o cadastro `db.etiquetas` (lógica em etiquetas.js): seções por
// categoria, busca, filtro por categoria (inclui "Outros" para triagem),
// criar, renomear, excluir, mesclar, mover de categoria e painel de
// possíveis duplicatas. Nada aqui muda o formato dos dados. Toda ação que
// mexe em textos devolve Desfazer.

import { db, save } from './db.js';
import {
    escapeHtml,
    chaveTema,
    gerarId,
    escaparAspasBusca,
    mostrarAviso,
    mostrarAvisoComAcao,
    abrirModalConfirmacao,
} from './utils.js';
import { garantirModal } from './modais.js';
import { toggleModal } from './ui.js';
import {
    ICONE_EDITAR,
    ICONE_EXCLUIR,
    ICONE_LISTA_TEXTOS,
    ICONE_MESCLAR,
    abrirListaComConsulta,
} from './render-listas.js';
import {
    ETIQUETAS_CATEGORIAS,
    ROTULOS_ETIQUETAS,
    categoriaEhValida,
    limparNomeEtiqueta,
    contarTextosPorEtiqueta,
    textosDaEtiqueta,
    renomearEtiqueta,
    podeExcluirEtiqueta,
    excluirEtiquetaDoCadastro,
    moverEtiquetaDeCategoria,
    mesclarEtiquetas,
    sugerirEtiquetasDuplicadas,
    marcarEtiquetasNaoIguais,
} from './etiquetas.js';
import { categoriaAceitaCluster, clusterDaEtiqueta, clustersDaCategoria } from './tag-clusters.js';

// Prefixo da busca por categoria (ver CAMPOS_ATRIBUTO em utils.js). O
// Domínio Imagético usa o prefixo curto "imagetico".
export const PREFIXO_BUSCA = {
    tradicao: 'tradicao',
    estilo: 'estilo',
    relacao: 'relacao',
    sensibilidade: 'sensibilidade',
    tom: 'tom',
    dominioImagetico: 'imagetico',
    outros: 'outros',
};

const CATEGORIAS = Object.keys(ETIQUETAS_CATEGORIAS);

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const textosRotulo = (n) => plural(n, 'texto', 'textos');

// Categorias recolhidas na tela (só em memória: some ao recarregar, sem
// criar chave nova no armazenamento).
const recolhidas = new Set();

export function alternarCategoriaEtiquetas(categoria) {
    if (!categoriaEhValida(categoria)) return;
    if (recolhidas.has(categoria)) recolhidas.delete(categoria);
    else recolhidas.add(categoria);
    renderEtiquetas();
}

export function recolherTodasEtiquetas() {
    CATEGORIAS.forEach((c) => recolhidas.add(c));
    renderEtiquetas();
}

export function expandirTodasEtiquetas() {
    recolhidas.clear();
    renderEtiquetas();
}

function achar(id) {
    return (db.etiquetas || []).find((e) => e.id == id);
}

// Impacto de uma etiqueta para o modal genérico de Mesclar (forms.js).
export function impactoDaEtiqueta(dbRef, id) {
    return textosDaEtiqueta(dbRef, id);
}

// ─── Tela ──────────────────────────────────────────────────────────────

function prepararFiltroCategoria() {
    const select = document.getElementById('filtro-categoria-etiquetas');
    if (!select || select.options.length > 1) return;
    select.innerHTML =
        '<option value="">Todas as categorias</option>' +
        CATEGORIAS.map((c) => {
            const rotulo = c === 'outros' ? 'Outros (triagem)' : ROTULOS_ETIQUETAS[c];
            return `<option value="${c}">${escapeHtml(rotulo)}</option>`;
        }).join('');
}

function renderDuplicatasEtiquetas() {
    const painel = document.getElementById('duplicatas-etiquetas');
    if (!painel) return;
    const pares = sugerirEtiquetasDuplicadas(db);
    if (pares.length === 0) {
        painel.innerHTML = '';
        return;
    }
    const botao = 'text-xs px-2 py-1 rounded border';
    const linhas = pares
        .map(({ a, b, textosA, textosB }) => {
            const manter = (deste, outro) =>
                `<button type="button" data-action="mesclar-duplicata-etiqueta" data-manter="${deste.id}" data-remover="${outro.id}" title="Junta “${escapeHtml(outro.nome)}” em “${escapeHtml(deste.nome)}”" class="${botao} border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40">Manter “${escapeHtml(deste.nome)}”</button>`;
            return `
        <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
            <span class="text-sm text-gray-800 dark:text-slate-100"><span class="text-[10px] uppercase text-gray-400 dark:text-slate-500 mr-1">${escapeHtml(ROTULOS_ETIQUETAS[a.categoria])}</span><strong>${escapeHtml(a.nome)}</strong> <span class="text-[10px] font-mono text-gray-400 dark:text-slate-500">${textosRotulo(textosA)}</span> e <strong>${escapeHtml(b.nome)}</strong> <span class="text-[10px] font-mono text-gray-400 dark:text-slate-500">${textosRotulo(textosB)}</span></span>
            <span class="flex flex-wrap gap-1.5">
                ${manter(a, b)}
                ${manter(b, a)}
                <button type="button" data-action="nao-sao-iguais-etiqueta" data-a="${a.id}" data-b="${b.id}" class="${botao} border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">Não são iguais</button>
            </span>
        </li>`;
        })
        .join('');
    painel.innerHTML = `
        <details open class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2">
            <summary class="text-sm text-amber-800 dark:text-amber-200 cursor-pointer">${pares.length} possíve${pares.length !== 1 ? 'is duplicatas' : 'l duplicata'}: etiquetas da mesma categoria que só mudam em hífen, plural ou acento</summary>
            <ul class="mt-1 divide-y divide-amber-100 dark:divide-amber-900/50">${linhas}</ul>
        </details>`;
}

// Cluster da etiqueta no cartão: um selo com o nome e um seletor para
// classificar ali mesmo. Só as categorias que aceitam cluster (Fase 17).
function seletorDeCluster(e) {
    if (!categoriaAceitaCluster(e.categoria)) return { badge: '', seletor: '' };
    const atual = clusterDaEtiqueta(db, e);
    const badge = atual
        ? `<span class="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded" title="Tag cluster desta etiqueta">${escapeHtml(atual.nome)}</span>`
        : '';
    const clusters = clustersDaCategoria(db, e.categoria);
    const opcoes = clusters
        .map(
            (c) =>
                `<option value="${c.id}"${atual && atual.id == c.id ? ' selected' : ''}>${escapeHtml(c.nome)}</option>`,
        )
        .join('');
    const dica =
        clusters.length === 0
            ? ' title="Crie um tag cluster desta categoria na aba Tag clusters"'
            : '';
    const seletor = `<select data-etiqueta="${e.id}" onchange="definirClusterDaEtiqueta(this)" aria-label="Tag cluster da etiqueta ${escapeHtml(e.nome)}"${dica} style="width: auto; margin-bottom: 0">
        <option value=""${atual ? '' : ' selected'}>Sem cluster</option>
        ${opcoes}
    </select>`;
    return { badge, seletor };
}

function cartaoEtiqueta(e, textos) {
    const nota = e.notas
        ? `<p class="text-[11px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">${escapeHtml(e.notas)}</p>`
        : '';
    const destinos = CATEGORIAS.filter((c) => c !== e.categoria)
        .map((c) => `<option value="${c}">${escapeHtml(ROTULOS_ETIQUETAS[c])}</option>`)
        .join('');
    const mover = `<select data-etiqueta="${e.id}" onchange="moverEtiquetaDoCartao(this)" aria-label="Mover a etiqueta ${escapeHtml(e.nome)} para outra categoria" style="width: auto; margin-bottom: 0">
        <option value="">Mover para…</option>
        ${destinos}
    </select>`;
    const iconeBotao = 'inline-flex items-center justify-center p-1.5 rounded';
    const cluster = seletorDeCluster(e);
    return `
<div class="bg-white dark:bg-slate-900 px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-start gap-3">
    <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-baseline gap-x-2">
            <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(e.nome)}</h4>
            <span class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">${textosRotulo(textos)}</span>
            ${cluster.badge}
        </div>
        ${nota}
        <div class="mt-2 flex flex-wrap items-center gap-2">${mover}${cluster.seletor}</div>
    </div>
    <div class="flex gap-3 flex-shrink-0">
        <button data-action="ver-textos-etiqueta" data-id="${e.id}" title="Ver textos" aria-label="Ver textos" class="${iconeBotao} text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_LISTA_TEXTOS}</button>
        <button data-action="editar-etiqueta" data-id="${e.id}" title="Editar" aria-label="Editar" class="${iconeBotao} text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
        <button data-action="mesclar-item" data-tipo="etiquetas" data-id="${e.id}" title="Mesclar com outra etiqueta da mesma categoria" aria-label="Mesclar" class="${iconeBotao} text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">${ICONE_MESCLAR}</button>
        <button data-action="excluir-etiqueta" data-id="${e.id}" title="Excluir" aria-label="Excluir" class="${iconeBotao} text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
    </div>
</div>`;
}

export function renderEtiquetas() {
    const container = document.getElementById('lista-etiquetas');
    if (!container) return;
    prepararFiltroCategoria();
    renderDuplicatasEtiquetas();

    const busca = chaveTema(document.getElementById('busca-etiquetas')?.value || '');
    const categoriaFiltro = document.getElementById('filtro-categoria-etiquetas')?.value || '';
    const soSemTexto = !!document.getElementById('filtro-etiquetas-sem-texto')?.checked;
    const ordem = document.getElementById('ordem-etiquetas')?.value || 'alfabetica';
    const uso = contarTextosPorEtiqueta(db);
    const todas = db.etiquetas || [];

    const filtradas = todas
        .map((e) => ({ e, textos: uso.get(e.id) || 0 }))
        .filter(({ e }) => !categoriaFiltro || e.categoria === categoriaFiltro)
        .filter(({ e }) => !busca || chaveTema(e.nome).includes(busca))
        .filter(({ textos }) => !soSemTexto || textos === 0)
        .sort((a, b) =>
            ordem === 'usadas'
                ? b.textos - a.textos || a.e.nome.localeCompare(b.e.nome, 'pt-BR')
                : a.e.nome.localeCompare(b.e.nome, 'pt-BR'),
        );

    const resumo = document.getElementById('resumo-etiquetas');
    if (resumo) {
        const semTexto = todas.filter((e) => !uso.get(e.id)).length;
        const outros = todas.filter((e) => e.categoria === 'outros').length;
        resumo.textContent = `${filtradas.length} de ${plural(todas.length, 'etiqueta', 'etiquetas')} · ${semTexto} sem texto · ${outros} em Outros`;
    }

    if (filtradas.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 dark:text-slate-500 text-sm py-6">${
            todas.length === 0
                ? 'Nenhuma etiqueta cadastrada ainda.'
                : 'Nenhuma etiqueta bate com o filtro.'
        }</div>`;
        return;
    }

    container.innerHTML = CATEGORIAS.map((categoria) => {
        const daCategoria = filtradas.filter(({ e }) => e.categoria === categoria);
        if (daCategoria.length === 0) return '';
        const dica =
            categoria === 'outros'
                ? '<p class="text-[11px] text-gray-400 dark:text-slate-500 mb-2">O que ainda não tem categoria. Use “Mover para…” para classificar.</p>'
                : '';
        // Com busca ligada, tudo fica aberto para não esconder resultado.
        const fechada = !busca && recolhidas.has(categoria);
        return `
<section data-categoria="${categoria}" data-recolhida="${fechada}" class="mb-6">
    <h3 class="mb-2">
        <button type="button" data-action="alternar-categoria-etiquetas" data-categoria="${categoria}" aria-expanded="${!fechada}" title="${fechada ? 'Expandir' : 'Recolher'} a categoria" class="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 inline-flex items-center gap-1.5">
            <span class="text-[9px]" aria-hidden="true">${fechada ? '▸' : '▾'}</span>${escapeHtml(ROTULOS_ETIQUETAS[categoria])} <span class="font-mono text-[10px] normal-case text-gray-400 dark:text-slate-500">${daCategoria.length}</span>
        </button>
    </h3>
    <div class="${fechada ? 'hidden' : ''}">
        ${dica}
        <div class="grid grid-cols-1 gap-2">${daCategoria.map(({ e, textos }) => cartaoEtiqueta(e, textos)).join('')}</div>
    </div>
</section>`;
    }).join('');
}

// ─── Criar e editar ────────────────────────────────────────────────────

function opcoesCategoria(select, selecionada) {
    select.innerHTML = CATEGORIAS.map(
        (c) =>
            `<option value="${c}"${c === selecionada ? ' selected' : ''}>${escapeHtml(ROTULOS_ETIQUETAS[c])}</option>`,
    ).join('');
}

export async function novaEtiqueta() {
    await garantirModal('modal-etiqueta');
    document.getElementById('form-etiqueta')?.reset();
    document.getElementById('et-edit-id').value = '';
    const select = document.getElementById('et-categoria');
    const filtro = document.getElementById('filtro-categoria-etiquetas')?.value;
    opcoesCategoria(select, categoriaEhValida(filtro) ? filtro : 'tradicao');
    select.disabled = false;
    document.getElementById('et-categoria-dica').classList.add('hidden');
    document.getElementById('modal-etiqueta-titulo').innerText = 'Cadastrar Etiqueta';
    toggleModal('modal-etiqueta');
}

export async function editarEtiqueta(id) {
    const e = achar(id);
    if (!e) return;
    await garantirModal('modal-etiqueta');
    document.getElementById('et-edit-id').value = e.id;
    document.getElementById('et-nome').value = e.nome;
    document.getElementById('et-notas').value = e.notas || '';
    const select = document.getElementById('et-categoria');
    opcoesCategoria(select, e.categoria);
    select.disabled = true;
    document.getElementById('et-categoria-dica').classList.remove('hidden');
    document.getElementById('modal-etiqueta-titulo').innerText = 'Editar Etiqueta';
    toggleModal('modal-etiqueta');
}

export function initFormEtiqueta() {
    const form = document.getElementById('form-etiqueta');
    if (!form) return;

    form.onsubmit = (ev) => {
        ev.preventDefault();
        const id = document.getElementById('et-edit-id').value;
        const nome = limparNomeEtiqueta(document.getElementById('et-nome').value);
        const notas = document.getElementById('et-notas').value.trim();
        if (!nome) return mostrarAviso('Dê um nome à etiqueta.');

        if (id) {
            const e = achar(id);
            if (!e) return;
            const r = renomearEtiqueta(db, id, nome);
            if (!r.ok) {
                return mostrarAviso(
                    r.motivo === 'duplicado'
                        ? `Já existe uma etiqueta chamada "${r.existente.nome}" em ${ROTULOS_ETIQUETAS[e.categoria]}. Para juntar as duas, use Mesclar no cartão.`
                        : 'Não foi possível renomear a etiqueta.',
                );
            }
            e.notas = notas;
            if (r.textos > 0) {
                mostrarAviso(`Etiqueta renomeada em ${textosRotulo(r.textos)}.`, 'sucesso');
            }
        } else {
            const categoria = document.getElementById('et-categoria').value;
            if (!categoriaEhValida(categoria)) return mostrarAviso('Escolha uma categoria.');
            const chave = chaveTema(nome);
            const duplicada = (db.etiquetas || []).find(
                (e) => e.categoria === categoria && chaveTema(e.nome) === chave,
            );
            if (duplicada) {
                return mostrarAviso(
                    `Já existe uma etiqueta chamada "${duplicada.nome}" em ${ROTULOS_ETIQUETAS[categoria]}.`,
                );
            }
            if (!Array.isArray(db.etiquetas)) db.etiquetas = [];
            db.etiquetas.push({ id: gerarId(), nome, categoria, notas });
        }
        save();
        toggleModal('modal-etiqueta');
    };
}

// ─── Excluir, ver textos, mover ────────────────────────────────────────

export function excluirEtiquetaComAviso(id) {
    const e = achar(id);
    if (!e) return;
    const pode = podeExcluirEtiqueta(db, id);
    if (!pode.ok) {
        return mostrarAviso(
            `"${e.nome}" está em ${textosRotulo(pode.textos)}. Tire a etiqueta dos textos (ou mescle com outra) antes de excluir.`,
        );
    }
    const r = excluirEtiquetaDoCadastro(db, id);
    if (!r.ok) return;
    save();
    mostrarAvisoComAcao(`Etiqueta "${e.nome}" excluída`, 'Desfazer', () => {
        r.desfazer();
        save();
    });
}

export function verTextosEtiqueta(id) {
    const e = achar(id);
    if (!e) return;
    const { poemasIds, prosasIds } = textosDaEtiqueta(db, id);
    if (poemasIds.length + prosasIds.length === 0) {
        return mostrarAviso('Nenhum texto tem esta etiqueta ainda.');
    }
    const rotulo = ROTULOS_ETIQUETAS[e.categoria];
    abrirListaComConsulta(
        `${PREFIXO_BUSCA[e.categoria]}:"${escaparAspasBusca(e.nome)}"`,
        poemasIds,
        prosasIds,
        `Textos filtrados por ${rotulo} “${e.nome}”`,
    );
}

// Handler do select "Mover para…" do cartão (onchange inline).
export function moverEtiquetaDoCartao(select) {
    const id = Number(select.dataset.etiqueta);
    const destino = select.value;
    select.value = '';
    const e = achar(id);
    if (!e || !destino) return;
    const de = ROTULOS_ETIQUETAS[e.categoria];
    const r = moverEtiquetaDeCategoria(db, id, destino);
    if (!r.ok) {
        return mostrarAviso(
            r.motivo === 'duplicado'
                ? `Já existe "${r.existente.nome}" em ${ROTULOS_ETIQUETAS[destino]}. Mescle as duas ou renomeie uma antes de mover.`
                : 'Não foi possível mover a etiqueta.',
        );
    }
    save();
    mostrarAvisoComAcao(
        `"${e.nome}" movida de ${de} para ${ROTULOS_ETIQUETAS[destino]}${r.textos ? ` (${textosRotulo(r.textos)})` : ''}`,
        'Desfazer',
        () => {
            r.desfazer();
            save();
        },
    );
}

// ─── Duplicatas ────────────────────────────────────────────────────────

export function mesclarDuplicataEtiqueta(manterId, removerId) {
    const manter = achar(manterId);
    const remover = achar(removerId);
    if (!manter || !remover) return;
    const { poemasIds, prosasIds } = textosDaEtiqueta(db, removerId);
    const textos = poemasIds.length + prosasIds.length;
    const impacto =
        textos > 0
            ? `${textosRotulo(textos)} que ${textos !== 1 ? 'usam' : 'usa'} "${remover.nome}" ${textos !== 1 ? 'passam' : 'passa'} a usar "${manter.nome}". `
            : '';
    abrirModalConfirmacao({
        titulo: `${remover.nome} → ${manter.nome}`,
        rotulo: 'Mesclar Etiqueta',
        mensagem: `${impacto}"${remover.nome}" será removida do cadastro. Você terá alguns segundos para desfazer.`,
        textoConfirmar: 'Mesclar',
        corConfirmar: '#d97706',
        onConfirmar: () => {
            const r = mesclarEtiquetas(db, removerId, manterId);
            if (!r.ok) return;
            save();
            mostrarAvisoComAcao(
                `Mesclada: "${remover.nome}" → "${manter.nome}"`,
                'Desfazer',
                () => {
                    r.desfazer();
                    save();
                },
            );
        },
    });
}

export function marcarEtiquetasNaoIguaisComAviso(idA, idB) {
    const r = marcarEtiquetasNaoIguais(db, idA, idB);
    if (!r.ok) return;
    save();
    mostrarAvisoComAcao('Par marcado como diferente', 'Desfazer', () => {
        r.desfazer();
        save();
    });
}
