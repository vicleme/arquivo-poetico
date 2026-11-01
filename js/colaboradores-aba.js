// colaboradores-aba.js: aba Colaboradores (Fase 19, etapa 6, entrega 2).
//
// Tela sobre `db.colaboradores` (dado e regras em colaboradores-livro.js):
// lista de cartões, busca, filtros, modal de cadastro e "tudo o que fulano
// fez" (os livros em que a pessoa consta, com o papel e o escopo de cada um).
// A equipe de cada livro é marcada no modal do Livro (entrega 3); aqui só o
// cadastro das pessoas.
//
// Exclusão: botão do cartão -> deleteItem('colaboradores', id) (ação
// 'excluir-item' em main.js), que já avisa em quantos livros a pessoa sai da
// equipe e oferece Desfazer.

import { db, save } from './db.js';
import { garantirModal, toggleModal } from './modais.js';
import { escapeHtml, gerarId, mostrarAviso, normalizarBusca } from './utils.js';
import { ICONE_EDITAR, ICONE_EXCLUIR } from './render-listas.js';
import { abrirVisualizacaoLivro } from './visualizar-livro.js';
import { chavePapel as chavePapelEquipe } from './autoria-livro.js';
import {
    PAPEIS_EQUIPE_LIVRO,
    colaboradorComNome,
    normalizarColaborador,
    normalizarPapeisHabituais,
    papeisEquipeLivresUsados,
    papelEquipeDaLista,
    textoPapelEquipe,
    trabalhosDoColaborador,
} from './colaboradores-livro.js';

// ─── Lista ───────────────────────────────────────────────────

const BTN = 'inline-flex items-center justify-center p-1.5 rounded';

const campo = (id) => document.getElementById(id);
const valorDoControle = (id, padrao) => campo(id)?.value || padrao;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function autorDoColaborador(c) {
    if (c.autorId === undefined || c.autorId === null || c.autorId === '') return null;
    return (db.autores || []).find((a) => String(a.id) === String(c.autorId)) || null;
}

// Tudo que a busca enxerga num colaborador: nome, papéis habituais, contato,
// o Autor ligado e, em cada livro dele, o título, os papéis e os escopos.
// Sem acento e sem diferenciar caixa.
function textoDeBusca(c, trabalhos) {
    return normalizarBusca(
        [
            c.nome,
            ...c.papeisHabituais,
            c.contato,
            autorDoColaborador(c)?.nome,
            ...trabalhos.flatMap(({ livro, papeis }) => [
                livro.titulo,
                ...papeis.flatMap((p) => [p.papel, p.escopo]),
            ]),
        ]
            .filter(Boolean)
            .join(' '),
    );
}

// Papéis para o select do filtro: os da lista fechada, depois os livres que já
// foram usados (nos livros ou como habituais), sem repetir.
function papeisParaFiltro(colaboradores) {
    const vistos = new Set(PAPEIS_EQUIPE_LIVRO.map(chavePapelEquipe));
    const extras = new Map();
    const juntar = (papel) => {
        const chave = chavePapelEquipe(papel);
        if (chave && !vistos.has(chave) && !extras.has(chave)) extras.set(chave, papel);
    };
    papeisEquipeLivresUsados(db.livros).forEach(juntar);
    colaboradores.forEach((c) => c.papeisHabituais.forEach(juntar));
    return [
        ...PAPEIS_EQUIPE_LIVRO,
        ...Array.from(extras.values()).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    ];
}

function preencherFiltroPapel(colaboradores) {
    const select = campo('filtro-papel-colaboradores');
    if (!select) return;
    const atual = select.value || '';
    const papeis = papeisParaFiltro(colaboradores);
    select.innerHTML =
        `<option value="">Todos os papéis</option>` +
        papeis.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    select.value = papeis.includes(atual) ? atual : '';
}

// O colaborador tem o papel (habitual ou em algum livro dele)?
function temPapel(c, trabalhos, papel) {
    const chave = chavePapelEquipe(papel);
    return (
        c.papeisHabituais.some((p) => chavePapelEquipe(p) === chave) ||
        trabalhos.some(({ papeis }) => papeis.some((p) => chavePapelEquipe(p.papel) === chave))
    );
}

function contatoHtml(contato) {
    const texto = String(contato || '').trim();
    if (!texto) return '';
    const link = /^https?:\/\/\S+$/i.test(texto)
        ? `<a href="${escapeHtml(texto)}" target="_blank" rel="noopener noreferrer" class="underline decoration-dotted hover:text-gray-700 dark:hover:text-slate-200">${escapeHtml(texto)}</a>`
        : escapeHtml(texto);
    return `<p class="text-[11px] text-gray-500 dark:text-slate-400 mt-1 break-all">${link}</p>`;
}

function linhaTrabalho({ livro, papeis }) {
    const papeisTexto = papeis.map(textoPapelEquipe).join(', ');
    return `
            <li class="text-[11px] text-gray-600 dark:text-slate-300">
                <button type="button" data-action="ver-livro-colaborador" data-id="${livro.id}" title="Ver o livro" class="underline decoration-dotted hover:text-gray-900 dark:hover:text-white text-left">${escapeHtml(livro.titulo || '(sem título)')}</button>${
                    papeisTexto
                        ? ` <span class="text-gray-400 dark:text-slate-500">(${escapeHtml(papeisTexto)})</span>`
                        : ''
                }
            </li>`;
}

function cartaoColaborador(c, trabalhos) {
    const autor = autorDoColaborador(c);
    const habituais = c.papeisHabituais
        .map(
            (p) =>
                `<span class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">${escapeHtml(p)}</span>`,
        )
        .join('');
    const resumo = trabalhos.length
        ? `consta em ${plural(trabalhos.length, 'livro', 'livros')}`
        : 'ainda sem livros';
    return `
        <div data-colaborador-id="${c.id}" class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex justify-between items-start gap-3">
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="font-semibold text-sm">${escapeHtml(c.nome)}</span>
                    ${
                        autor
                            ? `<span class="text-[9px] bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 px-1.5 py-0.5 rounded" title="Mesma pessoa que este Autor">Autor: ${escapeHtml(autor.nome)}</span>`
                            : ''
                    }
                </div>
                ${habituais ? `<div class="flex flex-wrap items-center gap-1 mt-1">${habituais}</div>` : ''}
                ${contatoHtml(c.contato)}
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">${escapeHtml(resumo)}</p>
                ${trabalhos.length ? `<ul class="mt-1 space-y-0.5">${trabalhos.map(linhaTrabalho).join('')}</ul>` : ''}
            </div>
            <div class="flex gap-1 flex-shrink-0">
                <button data-action="editar-colaborador" data-id="${c.id}" title="Editar" aria-label="Editar" class="${BTN} text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="excluir-item" data-tipo="colaboradores" data-id="${c.id}" title="Excluir (sai da equipe dos livros; nenhum livro é apagado)" aria-label="Excluir" class="${BTN} text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
}

export function renderColaboradores() {
    const container = campo('lista-colaboradores');
    if (!container) return;
    const resumo = campo('resumo-colaboradores');

    const todos = (db.colaboradores || []).map(normalizarColaborador);
    preencherFiltroPapel(todos);
    if (todos.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum colaborador cadastrado ainda.</div>`;
        if (resumo) resumo.textContent = '';
        return;
    }

    const busca = normalizarBusca(valorDoControle('busca-colaboradores', '').trim());
    const papel = valorDoControle('filtro-papel-colaboradores', '');
    const uso = valorDoControle('filtro-uso-colaboradores', 'todos');

    const linhas = todos
        .map((c) => ({ c, trabalhos: trabalhosDoColaborador(db.livros, c.id) }))
        .filter(({ c, trabalhos }) => {
            if (uso === 'com-livros' && trabalhos.length === 0) return false;
            if (uso === 'sem-livros' && trabalhos.length > 0) return false;
            if (papel && !temPapel(c, trabalhos, papel)) return false;
            return !busca || textoDeBusca(c, trabalhos).includes(busca);
        })
        .sort((a, b) => a.c.nome.localeCompare(b.c.nome, 'pt-BR'));

    if (resumo) {
        resumo.textContent =
            linhas.length === todos.length
                ? plural(todos.length, 'colaborador', 'colaboradores')
                : `${linhas.length} de ${todos.length}`;
    }
    container.innerHTML = linhas.length
        ? linhas.map(({ c, trabalhos }) => cartaoColaborador(c, trabalhos)).join('')
        : `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum colaborador encontrado com esse filtro.</div>`;
}

// Abre o Ver do livro em que o colaborador consta.
export function verLivroDoColaborador(livroId) {
    if (!(db.livros || []).some((l) => String(l.id) === String(livroId))) return;
    return abrirVisualizacaoLivro(Number(livroId));
}

// ─── Modal ───────────────────────────────────────────────────

function opcoesAutor(selecionado) {
    const select = campo('col-autor');
    if (!select) return;
    const autores = [...(db.autores || [])].sort((a, b) =>
        String(a.nome).localeCompare(String(b.nome), 'pt-BR'),
    );
    select.innerHTML =
        `<option value="">Nenhum</option>` +
        autores.map((a) => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`).join('');
    select.value = selecionado !== null && selecionado !== undefined ? String(selecionado) : '';
}

function preencherFormulario(c) {
    campo('form-colaborador')?.reset();
    campo('col-edit-id').value = c ? c.id : '';
    campo('col-nome').value = c ? c.nome : '';
    campo('col-contato').value = c ? c.contato : '';
    const habituais = c ? c.papeisHabituais : [];
    const daLista = new Set(habituais.map(chavePapelEquipe));
    document.querySelectorAll('#col-papeis input[name="col-papel"]').forEach((caixa) => {
        caixa.checked = daLista.has(chavePapelEquipe(caixa.value));
    });
    campo('col-papeis-outros').value = habituais
        .filter((p) => papelEquipeDaLista(p) === null)
        .join(', ');
    opcoesAutor(c ? c.autorId : null);
}

export async function novoColaborador() {
    await garantirModal('modal-colaborador');
    preencherFormulario(null);
    campo('modal-colaborador-titulo').innerText = 'Cadastrar Colaborador';
    toggleModal('modal-colaborador');
}

export async function editarColaborador(id) {
    const bruto = (db.colaboradores || []).find((x) => x.id == id);
    if (!bruto) return;
    await garantirModal('modal-colaborador');
    preencherFormulario(normalizarColaborador(bruto));
    campo('modal-colaborador-titulo').innerText = 'Editar Colaborador';
    toggleModal('modal-colaborador');
}

export function initFormColaborador() {
    const form = campo('form-colaborador');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const nome = campo('col-nome').value.trim();
        if (!nome) return mostrarAviso('Dê um nome ao colaborador.');

        const idBruto = campo('col-edit-id').value;
        const repetido = colaboradorComNome(db.colaboradores, nome, idBruto || null);
        if (repetido) {
            return mostrarAviso(`Já existe um colaborador chamado "${repetido.nome}".`);
        }

        const marcados = Array.from(
            document.querySelectorAll('#col-papeis input[name="col-papel"]:checked'),
        ).map((caixa) => caixa.value);
        const outros = campo('col-papeis-outros')
            .value.split(',')
            .map((p) => p.trim())
            .filter(Boolean);
        const autorEscolhido = campo('col-autor').value;

        const existente = idBruto ? db.colaboradores.find((x) => x.id == idBruto) : null;
        const dados = normalizarColaborador({
            id: existente ? existente.id : gerarId(),
            nome,
            papeisHabituais: normalizarPapeisHabituais([...marcados, ...outros]),
            contato: campo('col-contato').value,
            autorId: autorEscolhido === '' ? undefined : Number(autorEscolhido),
        });
        if (existente) {
            db.colaboradores[db.colaboradores.indexOf(existente)] = dados;
        } else {
            db.colaboradores.push(dados);
        }
        save();
        toggleModal('modal-colaborador');
    };
}
