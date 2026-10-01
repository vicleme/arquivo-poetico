// ui-locais.js: aba Locais (árvore, filtros), modal de cadastro com vários
// pais, exclusão com Desfazer e "Ver textos". A lógica (hierarquia,
// contagens, validações, mesclar/excluir) vive em locais.js; aqui só a tela.
// Mesclar usa o modal genérico (RENDER_MESCLAR em forms.js).

import { db, save } from './db.js';
import { garantirModal, toggleModal } from './modais.js';
import {
    arvoreDeLocais,
    contarTextosPorLocal,
    contarTextosPorLocalEscrita,
    criarLocal,
    editarLocal,
    excluirLocal,
    impactoDoLocal,
    paisDoLocal,
    descendentesDoLocal,
    rotuloCaminhoLocal,
    rotuloLocal,
    textosQueCitamLocalOuSublocais,
    consultaTerritorialidadeDoLocal,
    tiposDeLocalSugeridos,
    criaCiclo,
} from './locais.js';
import {
    abrirModalConfirmacao,
    chaveTema,
    escapeHtml,
    mostrarAviso,
    mostrarAvisoComAcao,
} from './utils.js';
import { abrirListaComConsulta } from './render-listas.js';

const svg = (caminhos) =>
    `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true">${caminhos}</svg>`;
const ICONE_EDITAR = svg(
    '<path d="M12.5 3.5l4 4L6.5 17.5H2.5v-4L12.5 3.5Z"/><path d="M10.5 5.5l4 4"/>',
);
const ICONE_EXCLUIR = svg(
    '<path d="M4 6h12"/><path d="M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6"/><path d="M5.5 6l.6 9.5a1.5 1.5 0 0 0 1.5 1.4h4.8a1.5 1.5 0 0 0 1.5-1.4L14.5 6"/><path d="M8.5 9v5"/><path d="M11.5 9v5"/>',
);
const ICONE_MESCLAR = svg(
    '<path d="M4 3v5a4 4 0 0 0 4 4h0"/><path d="M16 3v5a4 4 0 0 1-4 4h0"/><path d="M10 12v5"/><path d="M7.5 14.5l2.5 2.5 2.5-2.5"/>',
);
const ICONE_NOVO = svg('<path d="M10 5v10"/><path d="M5 10h10"/>');
const ICONE_LISTA_TEXTOS = svg('<path d="M4 5.5h12"/><path d="M4 10h8"/><path d="M4 14.5h10"/>');

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Nós recolhidos na árvore (só em memória, como o colapso de Grupos).
const recolhidos = new Set();

// ─── Lista ──────────────────────────────────────────────────────────────

function contagensHtml(diretosC, agregC, diretosE, agregE) {
    const partes = [];
    if (agregC > 0) {
        partes.push(
            diretosC === agregC
                ? `${plural(diretosC, 'citado', 'citados')}`
                : `${plural(diretosC, 'citado', 'citados')} (${agregC} com sublocais)`,
        );
    }
    if (agregE > 0) {
        partes.push(
            diretosE === agregE
                ? `${plural(diretosE, 'escrito aqui', 'escritos aqui')}`
                : `${plural(diretosE, 'escrito aqui', 'escritos aqui')} (${agregE} com sublocais)`,
        );
    }
    return partes.length ? partes.join(' · ') : 'sem textos';
}

function botao(acao, id, titulo, cor, icone, extra = '') {
    return `<button data-action="${acao}" data-id="${id}" ${extra} title="${titulo}" aria-label="${titulo}" class="inline-flex items-center justify-center p-1.5 rounded ${cor}">${icone}</button>`;
}

function botoesDoLocal(l, agregC) {
    return [
        agregC > 0
            ? botao(
                  'ver-textos-local',
                  l.id,
                  'Ver textos que citam este local',
                  'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700',
                  ICONE_LISTA_TEXTOS,
              )
            : '',
        botao(
            'novo-sublocal',
            l.id,
            `Novo local dentro de "${escapeHtml(l.nome)}"`,
            'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
            ICONE_NOVO,
        ),
        botao(
            'editar-local',
            l.id,
            'Editar',
            'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40',
            ICONE_EDITAR,
        ),
        botao(
            'mesclar-item',
            l.id,
            'Mesclar com outro local',
            'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40',
            ICONE_MESCLAR,
            'data-tipo="locais"',
        ),
        botao(
            'excluir-local',
            l.id,
            'Excluir',
            'text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40',
            ICONE_EXCLUIR,
        ),
    ].join('');
}

function tipoBadge(l) {
    return l.tipo
        ? `<span class="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">${escapeHtml(l.tipo)}</span>`
        : '<span class="text-[9px] text-gray-400 dark:text-slate-500 italic">sem tipo</span>';
}

// Uma linha de Local. `nivel` indenta na árvore; `caminho` (lista plana)
// mostra onde o Local fica. `nos` é o nó da árvore (para o botão de
// recolher e as referências), ausente na lista plana.
function linhaLocal(l, ctx, { nivel = 0, caminho = false, no = null } = {}) {
    const c = ctx.citados.get(String(l.id)) || { diretos: 0, agregados: 0 };
    const e = ctx.escritos.get(String(l.id)) || { diretos: 0, agregados: 0 };
    const pais = paisDoLocal(db, l.id);
    const outrosPais = pais.slice(1).map((p) => rotuloLocal(db, p));
    const temFilhos = !!no && no.filhos.length + no.tambemAqui.length > 0;
    const fechado = recolhidos.has(String(l.id));
    const seta = temFilhos
        ? `<button type="button" data-action="toggle-local-colapso" data-id="${l.id}" aria-expanded="${!fechado}" title="${fechado ? 'Expandir' : 'Recolher'}" class="w-5 h-5 text-[10px] text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200">${fechado ? '▸' : '▾'}</button>`
        : '<span class="inline-block w-5"></span>';
    const nota = l.notas
        ? `<p class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">${escapeHtml(l.notas)}</p>`
        : '';
    const caminhoHtml = caminho
        ? `<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">${escapeHtml(rotuloCaminhoLocal(db, l.id))}</p>`
        : '';
    const tambem = outrosPais.length
        ? `<span class="text-[10px] text-gray-400 dark:text-slate-500">também em ${escapeHtml(outrosPais.join(', '))}</span>`
        : '';
    return `
<div class="bg-white dark:bg-slate-900 pr-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 flex justify-between items-start gap-2" style="margin-left: ${nivel * 1.25}rem; padding-left: 0.25rem" data-local-id="${l.id}">
    <div class="flex items-start gap-1 flex-1 min-w-0">
        ${seta}
        <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(l.nome)}</h4>
                ${tipoBadge(l)}
                <span class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">${contagensHtml(c.diretos, c.agregados, e.diretos, e.agregados)}</span>
                ${tambem}
            </div>
            ${caminhoHtml}
            ${nota}
        </div>
    </div>
    <div class="flex gap-1 flex-shrink-0">${botoesDoLocal(l, c.agregados)}</div>
</div>`;
}

// Referência do Local sob um pai adicional: sem os filhos dele (que ficam
// sob o pai principal), só o nome e o atalho para editar.
function linhaReferencia(l, nivel) {
    const principal = paisDoLocal(db, l.id)[0];
    const onde = principal != null ? rotuloCaminhoLocal(db, principal) : '';
    return `
<div class="pr-2 py-1 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 flex justify-between items-center gap-2 text-sm text-gray-500 dark:text-slate-400" style="margin-left: ${nivel * 1.25}rem; padding-left: 0.25rem" data-local-ref="${l.id}">
    <span class="flex items-baseline gap-2 min-w-0"><span class="inline-block w-5 text-center">↪</span><span class="italic">${escapeHtml(l.nome)}</span>${tipoBadge(l)}<span class="text-[10px]">principal em ${escapeHtml(onde)}</span></span>
    ${botao('editar-local', l.id, 'Editar', 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40', ICONE_EDITAR)}
</div>`;
}

function renderNo(no, ctx, nivel) {
    const l = ctx.porId.get(String(no.id));
    if (!l) return '';
    let html = linhaLocal(l, ctx, { nivel, no });
    if (recolhidos.has(String(no.id))) return html;
    html += no.filhos.map((f) => renderNo(f, ctx, nivel + 1)).join('');
    html += no.tambemAqui
        .map((id) => ctx.porId.get(String(id)))
        .filter(Boolean)
        .map((ref) => linhaReferencia(ref, nivel + 1))
        .join('');
    return html;
}

export function renderLocais() {
    const container = document.getElementById('lista-locais');
    if (!container) return;

    const locais = db.locais || [];
    const busca = chaveTema(document.getElementById('busca-locais')?.value || '');
    const filtro = document.getElementById('filtro-locais')?.value || 'todos';
    const uso = document.getElementById('filtro-uso-locais')?.value || 'todos';
    const ctx = {
        porId: new Map(locais.map((l) => [String(l.id), l])),
        citados: contarTextosPorLocal(db),
        escritos: contarTextosPorLocalEscrita(db),
    };

    const semTipo = locais.filter((l) => !l.tipo).length;
    const semPai = locais.filter((l) => paisDoLocal(db, l.id).length === 0).length;
    const resumo = document.getElementById('resumo-locais');

    if (locais.length === 0) {
        if (resumo) resumo.textContent = '';
        container.innerHTML =
            '<div class="text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum local cadastrado ainda.</div>';
        return;
    }

    const filtrando = !!busca || filtro !== 'todos' || uso !== 'todos';
    if (!filtrando) {
        if (resumo) {
            resumo.textContent = `${plural(locais.length, 'local', 'locais')} · ${semTipo} sem tipo · ${semPai} sem local maior`;
        }
        container.innerHTML = arvoreDeLocais(db)
            .map((no) => renderNo(no, ctx, 0))
            .join('');
        return;
    }

    const visiveis = locais
        .filter(
            (l) =>
                !busca ||
                chaveTema(l.nome).includes(busca) ||
                chaveTema(l.tipo).includes(busca) ||
                chaveTema(rotuloCaminhoLocal(db, l.id)).includes(busca),
        )
        .filter((l) => filtro !== 'sem-tipo' || !l.tipo)
        .filter((l) => filtro !== 'sem-pai' || paisDoLocal(db, l.id).length === 0)
        // Uso nos textos: conta só o que é direto do local (sem somar sublocais),
        // para a lista mostrar os locais de fato citados / de escrita.
        .filter((l) => uso !== 'citados' || (ctx.citados.get(String(l.id))?.diretos || 0) > 0)
        .filter((l) => uso !== 'escritos' || (ctx.escritos.get(String(l.id))?.diretos || 0) > 0)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (resumo) resumo.textContent = `${visiveis.length} de ${locais.length}`;
    container.innerHTML = visiveis.length
        ? visiveis.map((l) => linhaLocal(l, ctx, { caminho: true })).join('')
        : '<div class="text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum local bate com o filtro.</div>';
}

export function alternarColapsoLocal(id) {
    const k = String(id);
    if (recolhidos.has(k)) recolhidos.delete(k);
    else recolhidos.add(k);
    renderLocais();
}

// ─── Modal: cadastro e edição ───────────────────────────────────────────

// Pais escolhidos no modal, na ordem (o primeiro é o principal).
let paisEditando = [];

function idEmEdicao() {
    const v = document.getElementById('lo-edit-id')?.value;
    return v ? Number(v) : null;
}

// Locais que podem ser pai do que está no modal: não o próprio, não quem
// pertence a ele (fecharia um ciclo) e não quem já foi escolhido.
function candidatosAPai(idAtual) {
    return (db.locais || [])
        .filter((l) => idAtual == null || (l.id !== idAtual && !criaCiclo(db, idAtual, [l.id])))
        .filter((l) => !paisEditando.some((p) => String(p) === String(l.id)))
        .map((l) => ({ id: l.id, rotulo: rotuloCaminhoLocal(db, l.id) }))
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

function renderPaisDoModal() {
    const lista = document.getElementById('lo-pais-lista');
    const select = document.getElementById('lo-pais-add');
    if (!lista || !select) return;
    const idAtual = idEmEdicao();

    lista.innerHTML = paisEditando.length
        ? paisEditando
              .map(
                  (p, i) => `
<div class="flex items-center gap-2 text-sm rounded border border-gray-200 dark:border-slate-700 px-2 py-1" data-pai-linha="${i}">
    <span class="flex-1 min-w-0">${escapeHtml(rotuloCaminhoLocal(db, p))}</span>
    ${
        i === 0
            ? '<span class="text-[9px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">principal</span>'
            : `<button type="button" data-pai-principal="${i}" class="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">tornar principal</button>`
    }
    <button type="button" data-pai-remover="${i}" aria-label="Remover" title="Remover" class="text-red-400 hover:text-red-600 px-1">✕</button>
</div>`,
              )
              .join('')
        : '<p class="text-[11px] text-gray-400 dark:text-slate-500 italic">Nenhum: este local fica na raiz da árvore.</p>';

    lista.querySelectorAll('[data-pai-remover]').forEach((b) => {
        b.onclick = () => {
            paisEditando.splice(Number(b.dataset.paiRemover), 1);
            renderPaisDoModal();
        };
    });
    lista.querySelectorAll('[data-pai-principal]').forEach((b) => {
        b.onclick = () => {
            const [p] = paisEditando.splice(Number(b.dataset.paiPrincipal), 1);
            paisEditando.unshift(p);
            renderPaisDoModal();
        };
    });

    const candidatos = candidatosAPai(idAtual);
    select.innerHTML =
        `<option value="">${paisEditando.length ? 'Adicionar outro local maior…' : 'Escolher o local maior…'}</option>` +
        candidatos.map((c) => `<option value="${c.id}">${escapeHtml(c.rotulo)}</option>`).join('');
    select.disabled = candidatos.length === 0;
    select.onchange = () => {
        if (!select.value) return;
        paisEditando.push(Number(select.value));
        renderPaisDoModal();
    };
}

function atualizarSugestoesDeTipo() {
    const lista = document.getElementById('lo-tipos-lista');
    if (!lista) return;
    lista.innerHTML = tiposDeLocalSugeridos(db)
        .map((t) => `<option value="${escapeHtml(t)}"></option>`)
        .join('');
}

const MOTIVOS = {
    vazio: () => 'Dê um nome ao local.',
    duplicado: (r) =>
        `Já existe "${rotuloLocal(db, r.existente.id)}" com o mesmo tipo e o mesmo local maior. Para juntar os dois, use Mesclar.`,
    'pai-inexistente': () => 'Um dos locais maiores escolhidos não existe mais.',
    ciclo: () => 'Um local não pode pertencer a si mesmo nem a algo que já pertence a ele.',
    inexistente: () => 'Este local não existe mais.',
};

export function initFormLocal() {
    const form = document.getElementById('form-local');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = idEmEdicao();
        const campos = {
            nome: document.getElementById('lo-nome').value,
            tipo: document.getElementById('lo-tipo').value,
            notas: document.getElementById('lo-notas').value.trim(),
        };
        const pais = [...paisEditando];

        if (id != null) {
            const r = editarLocal(db, id, { ...campos, pais });
            if (!r.ok) return mostrarAviso((MOTIVOS[r.motivo] || MOTIVOS.inexistente)(r));
            if (r.textos > 0) {
                mostrarAviso(
                    `Local renomeado em ${plural(r.textos, 'texto', 'textos')}.`,
                    'sucesso',
                );
            }
        } else {
            const r = criarLocal(db, { ...campos, pais });
            if (!r.ok) return mostrarAviso((MOTIVOS[r.motivo] || MOTIVOS.vazio)(r));
        }
        save();
        toggleModal('modal-local');
    };
}

async function abrirModalLocal({ id = null, paiId = null } = {}) {
    await garantirModal('modal-local');
    const form = document.getElementById('form-local');
    if (!form) return;
    form.reset();
    atualizarSugestoesDeTipo();
    const local = id != null ? (db.locais || []).find((l) => l.id == id) : null;
    if (id != null && !local) return;
    document.getElementById('lo-edit-id').value = local ? local.id : '';
    document.getElementById('lo-nome').value = local ? local.nome : '';
    document.getElementById('lo-tipo').value = local ? local.tipo || '' : '';
    document.getElementById('lo-notas').value = local ? local.notas || '' : '';
    paisEditando = local ? paisDoLocal(db, local.id) : paiId != null ? [paiId] : [];
    renderPaisDoModal();
    document.getElementById('modal-local-titulo').innerText = local
        ? 'Editar Local'
        : 'Cadastrar Local';
    toggleModal('modal-local');
}

export const novoLocal = () => abrirModalLocal();
export const novoSublocal = (paiId) => abrirModalLocal({ paiId });
export const editarLocalNaTela = (id) => abrirModalLocal({ id });

// ─── Excluir e ver textos ───────────────────────────────────────────────

// Exclui o Local: sai dos textos que o citam ou foram escritos nele, e os
// locais dentro dele herdam os pais dele. Pede confirmação só quando há o
// que perder; sempre oferece Desfazer.
export function excluirLocalComAviso(id) {
    const local = (db.locais || []).find((l) => l.id == id);
    if (!local) return;
    const impacto = impactoDoLocal(db, id);
    const textos = impacto.poemasIds.length + impacto.prosasIds.length;
    const filhos = impacto.filhosIds.length;

    const executar = () => {
        const r = excluirLocal(db, id);
        if (!r.ok) return;
        save();
        mostrarAvisoComAcao(`Local "${local.nome}" excluído`, 'Desfazer', () => {
            r.desfazer();
            save();
        });
    };
    if (textos === 0 && filhos === 0) return executar();

    const partes = [];
    if (textos) {
        partes.push(
            `sai de ${plural(textos, 'texto', 'textos')} (citado ou como local de escrita)`,
        );
    }
    if (filhos) {
        partes.push(
            `${plural(filhos, 'local dentro dele passa', 'locais dentro dele passam')} a pertencer ao local maior dele`,
        );
    }
    abrirModalConfirmacao({
        titulo: `Excluir "${local.nome}"?`,
        rotulo: 'Local',
        mensagem: `Ao excluir: ${partes.join('; ')}. Você terá alguns segundos para desfazer.`,
        textoConfirmar: 'Excluir',
        corConfirmar: '#dc2626',
        onConfirmar: executar,
    });
}

// Abre a aba Poemas (ou Prosas, se só houver prosa) filtrada pelo Local e
// pelos locais que pertencem a ele.
export function verTextosLocal(id) {
    const local = (db.locais || []).find((l) => l.id == id);
    if (!local) return;
    const { poemasIds, prosasIds } = textosQueCitamLocalOuSublocais(db, id);
    if (poemasIds.length + prosasIds.length === 0) {
        return mostrarAviso('Nenhum texto cita este local ainda.');
    }
    const consulta = consultaTerritorialidadeDoLocal(db, id);
    abrirListaComConsulta(
        consulta,
        poemasIds,
        prosasIds,
        `Textos que citam “${local.nome}” (e sublocais)`,
    );
}

// Locais que uma mesclagem de `origemId` aceita como destino: todos menos
// ela mesma e quem pertence a ela (o destino viraria ancestral de si
// mesmo). Usado pelo modal genérico de Mesclar (forms.js).
export function destinosDeMesclagemDeLocal(origemId) {
    const proibidos = new Set([String(origemId), ...descendentesDoLocal(db, origemId).map(String)]);
    return (db.locais || [])
        .filter((l) => !proibidos.has(String(l.id)))
        .map((l) => ({ id: l.id, rotulo: rotuloCaminhoLocal(db, l.id) }))
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}
