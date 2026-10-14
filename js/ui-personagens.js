// ui-personagens.js: aba Personagens (lista, filtros, cartões), modal de
// cadastro e "Ver textos". O dado e as regras (normalização, idade,
// exclusão com Desfazer) vivem em personagens.js e db.js; aqui só a tela.
// Exclusão: botão do cartão -> deleteItem('personagens', id) (ação
// 'excluir-item' em main.js), que já avisa em quantos textos o personagem
// deixa de aparecer e oferece Desfazer.

import { db, save } from './db.js';
import { garantirModal, toggleModal } from './modais.js';
import {
    CORES_RACA_AUTOR,
    IDENTIDADES_CIS_TRANS,
    GENEROS_SUGERIDOS,
    ORIENTACOES_SUGERIDAS,
    escapeHtml,
    gerarId,
    mostrarAviso,
    normalizarBusca,
    escaparAspasBusca,
} from './utils.js';
import {
    CAMPOS_RELACAO_PERSONAGEM,
    GRUPOS_CARACTERISTICAS_PERSONAGEM,
    ROTULOS_RELACAO_PERSONAGEM,
    ROTULOS_CARACTERISTICAS_PERSONAGEM,
    calcularImpactoExclusaoPersonagem,
    duracaoDaVidaPersonagem,
    normalizarParticipacoesPersonagem,
    normalizarPersonagem,
    normalizarTagsPersonagem,
    sugestoesRelacaoPersonagem,
    vidaInvalidaPersonagem,
} from './personagens.js';
import {
    ICONE_EDITAR,
    ICONE_EXCLUIR,
    ICONE_LISTA_TEXTOS,
    ICONE_SUGERIR_ECOS,
    abrirListaComConsulta,
} from './render-listas.js';

// ─── Lista ───────────────────────────────────────────────────

const ROTULO_ORIGEM_VAZIA = 'sem origem';

function valorDoControle(id, padrao) {
    return document.getElementById(id)?.value || padrao;
}

// Tudo que a busca enxerga num personagem: nome, identidade, notas e
// todas as tags. Sem acento e sem diferenciar caixa.
function textoDeBusca(p) {
    const c = p.caracteristicas;
    return normalizarBusca(
        [
            p.nome,
            p.origem,
            p.genero,
            p.orientacao,
            p.identidadeCisTrans,
            p.corRaca,
            p.notas,
            c.backstoryNota,
            ...GRUPOS_CARACTERISTICAS_PERSONAGEM.flatMap((g) => c[g]),
            ...p.participacoes.flatMap((v) => [
                tituloDoLivro(v.livroId),
                ...CAMPOS_RELACAO_PERSONAGEM.flatMap((campo) => v[campo]),
            ]),
        ].join(' '),
    );
}

function tituloDoLivro(livroId) {
    return (db.livros || []).find((l) => l.id == livroId)?.titulo || '(livro removido)';
}

// Linha do cartão: "Participa de 2 livros: Título A, Título B".
function resumoParticipacoes(p) {
    const n = p.participacoes.length;
    if (!n) return '';
    const titulos = p.participacoes.map((v) => tituloDoLivro(v.livroId)).join(', ');
    return `participa de ${n} livro${n !== 1 ? 's' : ''}: ${titulos}`;
}

function contagemTextos(p) {
    const { poemasIds, prosasIds } = calcularImpactoExclusaoPersonagem(db, p.id);
    return {
        poemas: poemasIds.length,
        prosas: prosasIds.length,
        total: poemasIds.length + prosasIds.length,
    };
}

function textoVida(p) {
    const n = p.nascimento?.ano;
    const o = p.obito?.ano;
    if (!n && !o) return '';
    const duracao = duracaoDaVidaPersonagem(p);
    if (n && o) {
        return `${n} – ${o}${duracao != null ? ` (${duracao} ano${duracao !== 1 ? 's' : ''})` : ''}`;
    }
    return n ? `nasc. ${n}` : `óbito ${o}`;
}

function resumoTextos(c) {
    if (c.total === 0) return 'ainda sem textos';
    const partes = [];
    if (c.poemas) partes.push(`${c.poemas} poema${c.poemas !== 1 ? 's' : ''}`);
    if (c.prosas) partes.push(`${c.prosas} prosa${c.prosas !== 1 ? 's' : ''}`);
    return `aparece em ${partes.join(' e ')}`;
}

function trecho(texto, max = 160) {
    const t = String(texto || '').trim();
    return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

const BTN = 'inline-flex items-center justify-center p-1.5 rounded';

function cartaoPersonagem(p, contagem) {
    const identidade = [p.genero, p.orientacao, p.identidadeCisTrans, p.corRaca]
        .filter(Boolean)
        .map(escapeHtml)
        .join(' · ');
    const vida = textoVida(p);
    const grupos = GRUPOS_CARACTERISTICAS_PERSONAGEM.filter((g) => p.caracteristicas[g].length)
        .map(
            (g) => `
            <div class="flex flex-wrap items-center gap-1 mt-1">
                <span class="text-[9px] uppercase tracking-wide text-gray-400 dark:text-slate-500 mr-1">${escapeHtml(ROTULOS_CARACTERISTICAS_PERSONAGEM[g])}</span>
                ${p.caracteristicas[g]
                    .map(
                        (t) =>
                            `<span class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">${escapeHtml(t)}</span>`,
                    )
                    .join('')}
            </div>`,
        )
        .join('');
    const nota = p.caracteristicas.backstoryNota.trim();
    return `
        <div data-personagem-id="${p.id}" class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex justify-between items-start gap-3">
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="font-semibold text-sm">${escapeHtml(p.nome)}</span>
                    ${
                        p.origem
                            ? `<span class="text-[9px] bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 px-1.5 py-0.5 rounded">${escapeHtml(p.origem)}</span>`
                            : ''
                    }
                </div>
                ${identidade ? `<p class="text-[11px] text-gray-500 dark:text-slate-400 mt-1">${identidade}</p>` : ''}
                ${vida ? `<p class="text-[11px] text-gray-500 dark:text-slate-400">${escapeHtml(vida)}</p>` : ''}
                ${grupos}
                ${nota ? `<p class="text-[10px] italic text-gray-500 dark:text-slate-400 mt-1">${escapeHtml(trecho(nota))}</p>` : ''}
                ${p.notas.trim() ? `<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1">${escapeHtml(trecho(p.notas))}</p>` : ''}
                ${resumoParticipacoes(p) ? `<p class="text-[10px] text-gray-500 dark:text-slate-400 mt-1">${escapeHtml(resumoParticipacoes(p))}</p>` : ''}
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">${escapeHtml(resumoTextos(contagem))}</p>
            </div>
            <div class="flex gap-1 flex-shrink-0">
                ${
                    contagem.total > 0
                        ? `<button data-action="ver-textos-personagem" data-id="${p.id}" title="Ver textos" aria-label="Ver textos" class="${BTN} text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800">${ICONE_LISTA_TEXTOS}</button>`
                        : ''
                }
                ${
                    contagem.total > 1
                        ? `<button data-action="sugerir-ecos" data-especie="personagem" data-id="${p.id}" title="Sugerir Ecos" aria-label="Sugerir Ecos" class="${BTN} text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40">${ICONE_SUGERIR_ECOS}</button>`
                        : ''
                }
                <button data-action="editar-personagem" data-id="${p.id}" title="Editar" aria-label="Editar" class="${BTN} text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="excluir-item" data-tipo="personagens" data-id="${p.id}" title="Excluir" aria-label="Excluir" class="${BTN} text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
}

export function renderPersonagens() {
    const container = document.getElementById('lista-personagens');
    if (!container) return;
    const resumo = document.getElementById('resumo-personagens');

    const todos = (db.personagens || []).map(normalizarPersonagem);
    if (todos.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum personagem cadastrado ainda.</div>`;
        if (resumo) resumo.textContent = '';
        return;
    }

    const busca = normalizarBusca(valorDoControle('busca-personagens', '').trim());
    const origem = valorDoControle('filtro-origem-personagens', 'todos');
    const uso = valorDoControle('filtro-uso-personagens', 'todos');

    const linhas = todos
        .map((p) => ({ p, contagem: contagemTextos(p) }))
        .filter(({ p, contagem }) => {
            if (origem === 'sem-origem' && p.origem) return false;
            if (origem !== 'todos' && origem !== 'sem-origem' && p.origem !== origem) return false;
            if (uso === 'com-textos' && contagem.total === 0) return false;
            if (uso === 'sem-textos' && contagem.total > 0) return false;
            return !busca || textoDeBusca(p).includes(busca);
        })
        .sort((a, b) => a.p.nome.localeCompare(b.p.nome, 'pt-BR'));

    if (resumo) {
        resumo.textContent =
            linhas.length === todos.length
                ? `${todos.length} ${todos.length === 1 ? 'personagem' : 'personagens'}`
                : `${linhas.length} de ${todos.length}`;
    }
    container.innerHTML = linhas.length
        ? linhas.map(({ p, contagem }) => cartaoPersonagem(p, contagem)).join('')
        : `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum personagem encontrado com esse filtro (${ROTULO_ORIGEM_VAZIA} incluído).</div>`;
}

// "Ver textos": leva à aba Poemas (ou Prosas, se só houver prosa) com o
// prefixo `personagem:"Nome"`. Casa pelo nome, então dois personagens com
// o mesmo nome aparecem juntos no resultado.
export function verTextosPersonagem(id) {
    const p = (db.personagens || []).find((x) => x.id == id);
    if (!p) return;
    const { poemasIds, prosasIds } = calcularImpactoExclusaoPersonagem(db, id);
    abrirListaComConsulta(
        `personagem:"${escaparAspasBusca(p.nome)}"`,
        poemasIds,
        prosasIds,
        `Textos com o personagem “${p.nome}”`,
    );
}

// ─── Tags do modal ───────────────────────────────────────────
// Um estado por grupo (array de strings). Eventos delegados no próprio
// form: Enter ou vírgula no campo adiciona, × no chip remove.

const tagsAtuais = {};

function zerarTags() {
    GRUPOS_CARACTERISTICAS_PERSONAGEM.forEach((g) => {
        tagsAtuais[g] = [];
    });
}
zerarTags();

function renderChips(grupo) {
    const alvo = document.getElementById(`per-chips-${grupo}`);
    if (!alvo) return;
    alvo.innerHTML = (tagsAtuais[grupo] || [])
        .map(
            (t) => `
            <span class="bg-violet-600 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                ${escapeHtml(t)}
                <button type="button" data-tags-remover="${grupo}" data-valor="${escapeHtml(t)}" class="hover:text-red-200 font-bold ml-1" title="Remover" aria-label="Remover ${escapeHtml(t)}">×</button>
            </span>`,
        )
        .join('');
}

function adicionarTag(grupo, bruto) {
    tagsAtuais[grupo] = normalizarTagsPersonagem([
        ...(tagsAtuais[grupo] || []),
        ...String(bruto || '').split(','),
    ]);
    renderChips(grupo);
}

// O que está digitado e ainda não virou chip também entra ao salvar.
function absorverTextoPendente() {
    GRUPOS_CARACTERISTICAS_PERSONAGEM.forEach((g) => {
        const input = document.getElementById(`per-tag-${g}`);
        if (input?.value.trim()) {
            adicionarTag(g, input.value);
            input.value = '';
        }
    });
}

function preencherDatalist(id, valores) {
    const el = document.getElementById(id);
    if (!el) return;
    const vistos = new Set();
    const lista = [];
    valores.filter(Boolean).forEach((v) => {
        const chave = normalizarBusca(v);
        if (!vistos.has(chave)) {
            vistos.add(chave);
            lista.push(v);
        }
    });
    el.innerHTML = lista.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
}

// Sugestões = o que já foi usado em qualquer personagem (identidade e cada
// grupo de tag), mais a lista fixa de gênero e orientação do Autor.
function popularSugestoes() {
    const todos = (db.personagens || []).map(normalizarPersonagem);
    preencherDatalist('per-sugestoes-genero', [
        ...GENEROS_SUGERIDOS,
        ...todos.map((p) => p.genero),
    ]);
    preencherDatalist('per-sugestoes-orientacao', [
        ...ORIENTACOES_SUGERIDAS,
        ...todos.map((p) => p.orientacao),
    ]);
    GRUPOS_CARACTERISTICAS_PERSONAGEM.forEach((g) => {
        preencherDatalist(
            `per-sugestoes-${g}`,
            todos.flatMap((p) => p.caracteristicas[g]),
        );
    });
    const selCisTrans = document.getElementById('per-identidade-cis-trans');
    if (selCisTrans && !selCisTrans.options.length) {
        selCisTrans.innerHTML =
            `<option value="">Não definida</option>` +
            IDENTIDADES_CIS_TRANS.map(
                (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`,
            ).join('');
    }
    const sel = document.getElementById('per-cor-raca');
    if (sel && !sel.options.length) {
        sel.innerHTML =
            `<option value="">Não definida</option>` +
            CORES_RACA_AUTOR.map(
                (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`,
            ).join('');
    }
}

// ─── Participação por livro ──────────────────────────────────
// Estado do modal: lista `[{ livroId, papelNarrativo, funcaoTematica, arco,
// tropes }]`. Cada livro vira um cartão com os quatro campos de tag (a mesma
// relação do texto, no nível do livro). Eventos delegados no container.

let participacoesAtuais = [];

function rotuloDoLivro(l) {
    return `${l.titulo || '(sem título)'}${l.tipo === 'Coletânea' ? ' (Coletânea)' : ''}`;
}

function renderSeletorDeLivros() {
    const sel = campo('per-livro-select');
    if (!sel) return;
    const usados = new Set(participacoesAtuais.map((v) => String(v.livroId)));
    const livros = (db.livros || [])
        .filter((l) => !usados.has(String(l.id)))
        .sort((a, b) => (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR'));
    sel.innerHTML = livros.length
        ? `<option value="">Escolha um livro...</option>` +
          livros
              .map(
                  (l) =>
                      `<option value="${escapeHtml(String(l.id))}">${escapeHtml(rotuloDoLivro(l))}</option>`,
              )
              .join('')
        : `<option value="">${db.livros?.length ? 'Todos os livros já foram adicionados' : 'Nenhum livro cadastrado'}</option>`;
}

function htmlCampoParticipacao(v, c) {
    const chips = v[c]
        .map(
            (
                t,
            ) => `<span class="bg-violet-600 text-white text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(t)}
                <button type="button" data-part-remover="${c}" data-valor="${escapeHtml(t)}" class="hover:text-red-200 font-bold" title="Remover" aria-label="Remover ${escapeHtml(t)}">×</button>
            </span>`,
        )
        .join('');
    return `<div>
        <label class="form-label">${escapeHtml(ROTULOS_RELACAO_PERSONAGEM[c])}</label>
        <div class="flex flex-wrap gap-1 mb-1">${chips}</div>
        <input type="text" data-part-input="${c}" list="per-sug-part-${c}" class="text-xs" placeholder="Enter adiciona" autocomplete="off" />
    </div>`;
}

function renderParticipacoes(foco = null) {
    const alvo = campo('per-participacoes-container');
    if (!alvo) return;
    alvo.innerHTML = participacoesAtuais.length
        ? participacoesAtuais
              .map(
                  (
                      v,
                  ) => `<div data-part-livro="${escapeHtml(String(v.livroId))}" class="border border-gray-200 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-900">
            <div class="flex items-center justify-between gap-2 mb-1">
                <span class="font-semibold text-sm">${escapeHtml(tituloDoLivro(v.livroId))}</span>
                <button type="button" data-part-excluir class="text-gray-400 hover:text-red-500 font-bold" title="Remover participação" aria-label="Remover participação">×</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                ${CAMPOS_RELACAO_PERSONAGEM.map((c) => htmlCampoParticipacao(v, c)).join('')}
            </div>
        </div>`,
              )
              .join('')
        : `<p class="text-[11px] italic text-gray-400 dark:text-slate-500">Nenhum livro adicionado.</p>`;
    campo('per-participacoes-datalists').innerHTML = CAMPOS_RELACAO_PERSONAGEM.map(
        (c) =>
            `<datalist id="per-sug-part-${c}">${sugestoesRelacaoPersonagem(db, c)
                .map((t) => `<option value="${escapeHtml(t)}"></option>`)
                .join('')}</datalist>`,
    ).join('');
    renderSeletorDeLivros();
    if (foco) {
        const cartao = [...alvo.querySelectorAll('[data-part-livro]')].find(
            (el) => el.getAttribute('data-part-livro') === String(foco.livroId),
        );
        cartao?.querySelector(`[data-part-input="${foco.campo}"]`)?.focus();
    }
}

function participacaoDoEvento(el) {
    const id =
        el instanceof HTMLElement
            ? el.closest('[data-part-livro]')?.getAttribute('data-part-livro')
            : null;
    return participacoesAtuais.find((v) => String(v.livroId) === id) || null;
}

function adicionarLivroParticipacao() {
    const sel = campo('per-livro-select');
    const livroId = sel?.value;
    if (!livroId) return;
    const livro = (db.livros || []).find((l) => String(l.id) === livroId);
    if (!livro || participacoesAtuais.some((v) => String(v.livroId) === livroId)) return;
    participacoesAtuais.push(...normalizarParticipacoesPersonagem([{ livroId: livro.id }]));
    renderParticipacoes();
}

// O que está digitado e ainda não virou chip também entra ao salvar.
function absorverTextoPendenteParticipacoes() {
    campo('per-participacoes-container')
        ?.querySelectorAll('[data-part-input]')
        .forEach((input) => {
            const texto = input.value.trim();
            if (!texto) return;
            const v = participacaoDoEvento(input);
            const c = input.getAttribute('data-part-input');
            if (v) v[c] = normalizarTagsPersonagem([...v[c], ...texto.split(',')]);
            input.value = '';
        });
}

function ligarParticipacoes() {
    campo('per-livro-adicionar')?.addEventListener('click', adicionarLivroParticipacao);
    const alvo = campo('per-participacoes-container');
    alvo?.addEventListener('keydown', (e) => {
        const input = e.target;
        if (!(input instanceof HTMLElement) || !input.hasAttribute('data-part-input')) return;
        if (e.key !== 'Enter' && e.key !== ',') return;
        e.preventDefault();
        const v = participacaoDoEvento(input);
        if (!v) return;
        const c = input.getAttribute('data-part-input');
        v[c] = normalizarTagsPersonagem([...v[c], ...input.value.split(',')]);
        input.value = '';
        renderParticipacoes({ livroId: v.livroId, campo: c });
    });
    alvo?.addEventListener('click', (e) => {
        const el = e.target instanceof HTMLElement ? e.target : null;
        if (!el) return;
        const remover = el.closest('[data-part-remover]');
        if (remover) {
            const v = participacaoDoEvento(remover);
            if (!v) return;
            const c = remover.getAttribute('data-part-remover');
            v[c] = v[c].filter((t) => t !== remover.getAttribute('data-valor'));
            renderParticipacoes();
            return;
        }
        if (el.closest('[data-part-excluir]')) {
            const v = participacaoDoEvento(el);
            if (!v) return;
            participacoesAtuais = participacoesAtuais.filter((x) => x !== v);
            renderParticipacoes();
        }
    });
}

// ─── Modal ───────────────────────────────────────────────────

function campo(id) {
    return document.getElementById(id);
}

function anoDoCampo(id) {
    const n = parseInt(campo(id)?.value, 10);
    return Number.isInteger(n) && n > 0 ? { ano: n } : null;
}

export function initFormPersonagem() {
    const form = campo('form-personagem');
    if (!form) return;

    form.addEventListener('keydown', (e) => {
        const alvo = e.target;
        if (!(alvo instanceof HTMLElement) || !alvo.hasAttribute('data-tags-input')) return;
        if (e.key !== 'Enter' && e.key !== ',') return;
        e.preventDefault();
        const grupo = alvo.closest('[data-tags-grupo]')?.getAttribute('data-tags-grupo');
        if (!grupo) return;
        adicionarTag(grupo, alvo.value);
        alvo.value = '';
    });
    form.addEventListener('click', (e) => {
        const botao =
            e.target instanceof HTMLElement ? e.target.closest('[data-tags-remover]') : null;
        if (!botao) return;
        const grupo = botao.getAttribute('data-tags-remover');
        const valor = botao.getAttribute('data-valor');
        tagsAtuais[grupo] = (tagsAtuais[grupo] || []).filter((t) => t !== valor);
        renderChips(grupo);
    });

    ligarParticipacoes();

    form.onsubmit = (e) => {
        e.preventDefault();
        const nome = campo('per-nome').value.trim();
        if (!nome) return mostrarAviso('Dê um nome ao personagem.');

        const nascimento = anoDoCampo('per-nascimento');
        const obito = anoDoCampo('per-obito');
        if (vidaInvalidaPersonagem({ nascimento, obito })) {
            return mostrarAviso('O ano de óbito não pode ser anterior ao ano de nascimento.');
        }

        absorverTextoPendente();
        absorverTextoPendenteParticipacoes();
        const idBruto = campo('per-edit-id').value;
        const existente = idBruto ? db.personagens.find((x) => x.id == idBruto) : null;
        const dados = normalizarPersonagem({
            ...(existente || {}),
            id: existente ? existente.id : gerarId(),
            nome,
            origem: campo('per-origem').value,
            genero: campo('per-genero').value,
            orientacao: campo('per-orientacao').value,
            identidadeCisTrans: campo('per-identidade-cis-trans').value,
            corRaca: campo('per-cor-raca').value,
            nascimento,
            obito,
            notas: campo('per-notas').value,
            caracteristicas: {
                ...Object.fromEntries(
                    GRUPOS_CARACTERISTICAS_PERSONAGEM.map((g) => [g, tagsAtuais[g]]),
                ),
                backstoryNota: campo('per-backstory-nota').value,
            },
            participacoes: participacoesAtuais,
        });
        if (existente)
            db.personagens[db.personagens.findIndex((x) => x.id == existente.id)] = dados;
        else db.personagens.push(dados);
        save();
        toggleModal('modal-personagem');
    };
}

function preencherFormulario(p) {
    campo('per-edit-id').value = p ? p.id : '';
    campo('per-nome').value = p?.nome || '';
    campo('per-origem').value = p?.origem || '';
    campo('per-genero').value = p?.genero || '';
    campo('per-orientacao').value = p?.orientacao || '';
    campo('per-identidade-cis-trans').value = p?.identidadeCisTrans || '';
    campo('per-cor-raca').value = p?.corRaca || '';
    campo('per-nascimento').value = p?.nascimento?.ano ?? '';
    campo('per-obito').value = p?.obito?.ano ?? '';
    campo('per-notas').value = p?.notas || '';
    campo('per-backstory-nota').value = p?.caracteristicas.backstoryNota || '';
    zerarTags();
    GRUPOS_CARACTERISTICAS_PERSONAGEM.forEach((g) => {
        tagsAtuais[g] = p ? [...p.caracteristicas[g]] : [];
        const input = campo(`per-tag-${g}`);
        if (input) input.value = '';
        renderChips(g);
    });
    participacoesAtuais = p ? normalizarParticipacoesPersonagem(p.participacoes) : [];
    renderParticipacoes();
}

export async function novoPersonagem() {
    await garantirModal('modal-personagem');
    popularSugestoes();
    preencherFormulario(null);
    campo('modal-personagem-titulo').innerText = 'Cadastrar Personagem';
    toggleModal('modal-personagem');
}

export async function editarPersonagem(id) {
    const bruto = (db.personagens || []).find((x) => x.id == id);
    if (!bruto) return;
    await garantirModal('modal-personagem');
    popularSugestoes();
    preencherFormulario(normalizarPersonagem(bruto));
    campo('modal-personagem-titulo').innerText = 'Editar Personagem';
    toggleModal('modal-personagem');
}
