// temas-universais-ui.js: configuração dos Temas universais na aba Assuntos
// (31/10/2026). A lógica pura está em temas-universais.js.
//
// O bloco `#universais-bloco` mora em index.html e fica fora do render (assim
// o "aberto/fechado" sobrevive); `renderTemasUniversais` só refaz o resumo e a
// lista. Os botões usam `data-action` (ligados no main.js).

import { db, save } from './db.js';
import { escapeHtml, chaveTema, mostrarAviso, mostrarAvisoComAcao } from './utils.js';
import {
    MAX_TEMAS_UNIVERSAIS,
    criarTemaUniversal,
    renomearTemaUniversal,
    definirTemasDoUniversal,
    excluirTemaUniversal,
    moverTemaUniversal,
    planejarVitrineSugerida,
    aplicarVitrineSugerida,
} from './temas-universais.js';
import { baixarVitrineMarkdown } from './exportar-vitrine.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const $ = (id) => document.getElementById(id);
const universais = () => (Array.isArray(db.temasUniversais) ? db.temasUniversais : []);
const achar = (id) => universais().find((u) => String(u.id) === String(id));
const nomeDoTema = (id) => (db.temas || []).find((t) => String(t.id) === String(id))?.nome;

const BOTAO =
    'px-2 py-0.5 rounded border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800';

function cartao(u, indice, total) {
    const chips = (u.temaIds || [])
        .map((tid) => {
            const nome = nomeDoTema(tid);
            if (!nome) return '';
            return `<span class="inline-flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded mr-1 mb-1">${escapeHtml(nome)}<button type="button" data-action="tirar-tema-universal" data-id="${u.id}" data-tema-id="${tid}" aria-label="Tirar ${escapeHtml(nome)} deste universal" title="Tirar do universal" class="hover:text-red-600">×</button></span>`;
        })
        .join('');
    const qtd = (u.temaIds || []).length;
    return `
    <div class="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 flex flex-col gap-2" data-universal="${u.id}">
        <div class="flex flex-wrap items-center gap-2">
            <input id="universal-nome-${u.id}" type="text" value="${escapeHtml(u.nome)}" aria-label="Nome de convite" style="margin-bottom: 0" class="flex-1 min-w-[10rem]" />
            <button type="button" data-action="renomear-universal" data-id="${u.id}" class="text-xs ${BOTAO}">Renomear</button>
            <button type="button" data-action="mover-universal" data-id="${u.id}" data-delta="-1" ${indice === 0 ? 'disabled' : ''} aria-label="Subir" title="Subir" class="text-xs ${BOTAO}">↑</button>
            <button type="button" data-action="mover-universal" data-id="${u.id}" data-delta="1" ${indice === total - 1 ? 'disabled' : ''} aria-label="Descer" title="Descer" class="text-xs ${BOTAO}">↓</button>
            <button type="button" data-action="excluir-universal" data-id="${u.id}" class="text-xs px-2 py-0.5 rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">Excluir</button>
        </div>
        <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">${plural(qtd, 'tema', 'temas')}${qtd === 0 ? ' · escondido do sorteio até ter temas' : ''}</p>
        ${chips ? `<div>${chips}</div>` : ''}
        <div class="flex flex-wrap items-center gap-2">
            <input id="universal-tema-${u.id}" type="text" list="universais-temas-datalist" placeholder="Adicionar tema do cadastro" aria-label="Adicionar tema" style="margin-bottom: 0" class="flex-1 min-w-[10rem]" />
            <button type="button" data-action="adicionar-tema-universal" data-id="${u.id}" class="text-xs ${BOTAO}">Adicionar</button>
        </div>
    </div>`;
}

export function renderTemasUniversais() {
    const lista = $('lista-universais');
    if (!lista) return;
    const itens = universais();
    const resumo = $('universais-resumo');
    if (resumo) resumo.textContent = `${itens.length} de ${MAX_TEMAS_UNIVERSAIS}`;
    const opcoes = [...(db.temas || [])]
        .map((t) => t.nome)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((n) => `<option value="${escapeHtml(n)}"></option>`)
        .join('');
    const vazio =
        '<div class="text-center text-gray-400 dark:text-slate-500 text-sm py-4">Nenhum convite ainda. Crie um acima ou use a vitrine sugerida.</div>';
    lista.innerHTML = `<datalist id="universais-temas-datalist">${opcoes}</datalist>${
        itens.length ? itens.map((u, i) => cartao(u, i, itens.length)).join('') : vazio
    }`;
}

function esconderRelatorio() {
    const r = $('universais-relatorio');
    if (!r) return;
    r.innerHTML = '';
    r.classList.add('hidden');
}

const ROTULO_IGNORADO = {
    duplicado: 'já existe',
    'sem-temas': 'nenhum dos temas existe no cadastro',
    limite: 'sem vaga (teto de 12)',
};

function mostrarRelatorio(plano, modo) {
    const r = $('universais-relatorio');
    if (!r) return;
    const titulo =
        modo === 'previa'
            ? `Prévia: ${plural(plano.criar.length, 'convite seria criado', 'convites seriam criados')}. Nada foi gravado.`
            : `${plural(plano.criados.length, 'convite criado', 'convites criados')}.`;
    const criados = modo === 'previa' ? plano.criar : plano.criados;
    const linhas = [`<p class="font-semibold">${titulo}</p>`];
    if (criados.length) {
        linhas.push(
            `<ul class="list-disc pl-4">${criados
                .map(
                    (c) =>
                        `<li>${escapeHtml(c.nome)} (${plural((c.temaIds || []).length, 'tema', 'temas')})</li>`,
                )
                .join('')}</ul>`,
        );
    }
    if (plano.ignorados.length) {
        linhas.push(
            `<p class="mt-1">Ignorados: ${plano.ignorados
                .map((i) => `${escapeHtml(i.nome)} (${ROTULO_IGNORADO[i.motivo] || i.motivo})`)
                .join('; ')}.</p>`,
        );
    }
    if (plano.ausentes.length) {
        linhas.push(
            `<p class="mt-1">Temas citados pela vitrine que o cadastro não tem (nada é criado): ${plano.ausentes
                .map((a) => `${escapeHtml(a.universal)}: ${a.nomes.map(escapeHtml).join(', ')}`)
                .join('; ')}.</p>`,
        );
    }
    r.innerHTML = linhas.join('');
    r.classList.remove('hidden');
}

const MOTIVO = {
    vazio: 'Escreva um nome para o convite.',
    duplicado: 'Já existe um convite com esse nome.',
    limite: `O limite é de ${MAX_TEMAS_UNIVERSAIS} convites. Exclua um para criar outro.`,
    inexistente: 'Esse convite não existe mais.',
};

export function aoCriarUniversal() {
    const campo = $('universais-novo-nome');
    const r = criarTemaUniversal(db, campo?.value ?? '');
    if (!r.ok) return mostrarAviso(MOTIVO[r.motivo] || 'Não foi possível criar.');
    if (campo) campo.value = '';
    save();
    renderTemasUniversais();
    mostrarAviso(`Convite “${r.universal.nome}” criado. Agora escolha os temas dele.`, 'info');
}

export function aoRenomearUniversal(id) {
    const r = renomearTemaUniversal(db, id, $(`universal-nome-${id}`)?.value ?? '');
    if (!r.ok) {
        renderTemasUniversais();
        return mostrarAviso(MOTIVO[r.motivo] || 'Não foi possível renomear.');
    }
    save();
    renderTemasUniversais();
    mostrarAviso('Nome atualizado.', 'info');
}

export function aoMoverUniversal(id, delta) {
    const r = moverTemaUniversal(db, id, Number(delta));
    if (!r.ok || !r.moveu) return;
    save();
    renderTemasUniversais();
}

export function aoExcluirUniversal(id) {
    const itens = universais();
    const indice = itens.findIndex((u) => String(u.id) === String(id));
    const r = excluirTemaUniversal(db, id);
    if (!r.ok) return mostrarAviso(MOTIVO[r.motivo] || 'Não foi possível excluir.');
    save();
    renderTemasUniversais();
    mostrarAvisoComAcao(
        `Convite “${r.removido.nome}” excluído (os temas e os textos não mudam)`,
        'Desfazer',
        () => {
            if (universais().length >= MAX_TEMAS_UNIVERSAIS) return;
            universais().splice(Math.min(indice, universais().length), 0, r.removido);
            save();
            renderTemasUniversais();
        },
        10000,
    );
}

export function aoAdicionarTemaAoUniversal(id) {
    const universal = achar(id);
    if (!universal) return mostrarAviso(MOTIVO.inexistente);
    const campo = $(`universal-tema-${id}`);
    const chave = chaveTema(campo?.value ?? '');
    if (!chave) return mostrarAviso('Escolha ou digite um tema do cadastro.');
    const tema = (db.temas || []).find((t) => chaveTema(t.nome) === chave);
    if (!tema) {
        return mostrarAviso('Esse tema não existe no cadastro. Nenhum tema é criado por aqui.');
    }
    if ((universal.temaIds || []).some((tid) => String(tid) === String(tema.id))) {
        return mostrarAviso('Esse tema já está neste convite.', 'info');
    }
    definirTemasDoUniversal(db, id, [...(universal.temaIds || []), tema.id]);
    save();
    renderTemasUniversais();
}

export function aoTirarTemaDoUniversal(id, temaId) {
    const universal = achar(id);
    if (!universal) return;
    definirTemasDoUniversal(
        db,
        id,
        (universal.temaIds || []).filter((tid) => String(tid) !== String(temaId)),
    );
    save();
    renderTemasUniversais();
}

export function aoConferirVitrine() {
    mostrarRelatorio(planejarVitrineSugerida(db), 'previa');
}

export function aoAplicarVitrine() {
    const r = aplicarVitrineSugerida(db);
    mostrarRelatorio(r, 'aplicado');
    if (!r.criados.length) {
        return mostrarAviso('Nada a criar: a vitrine sugerida já está no cadastro.', 'info');
    }
    save();
    renderTemasUniversais();
    mostrarAvisoComAcao(
        `${plural(r.criados.length, 'convite criado', 'convites criados')}`,
        'Desfazer',
        () => {
            r.desfazer();
            save();
            renderTemasUniversais();
            esconderRelatorio();
        },
        10000,
    );
}

// Botão "Baixar .md" do bloco: cada convite com seus temas e, no fim, os temas
// fora da vitrine, com a contagem de textos. Ver exportar-vitrine.js.
export function aoBaixarVitrine() {
    baixarVitrineMarkdown(db);
}
