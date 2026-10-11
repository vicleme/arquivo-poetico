// grupo-personagens.js: grupo "Personagens" dos modais de Poema e Prosa.
// Cada personagem do texto vira um cartão com os papéis (lista), a
// centralidade e a relação com ESTE texto (papel narrativo, arco, tropes,
// função temática, em tag). O dado e as regras vivem em personagens.js; o
// cadastro do Personagem (identidade, vida, características) é editado na
// aba Personagens. Estado em closure, um por tabela, como os outros grupos
// do modal (ver criarGrupoDePessoas em editor.js): forms.js lê
// obterPersonagens() no submit, carrega com carregarPersonagens() e zera
// com resetPersonagens().

import { db } from './db.js';
import { confirmarRemocaoVinculo, repintarAncoras } from './ancora-eco-ui.js';
import { abrirModalConfirmacao, chaveTema, escapeHtml } from './utils.js';
import {
    CAMPOS_RELACAO_PERSONAGEM,
    CENTRALIDADES_PERSONAGEM,
    PAPEIS_PERSONAGEM,
    ROTULOS_CENTRALIDADE_PERSONAGEM,
    ROTULOS_RELACAO_PERSONAGEM,
    acharPersonagemPorNome,
    centralidadeAplicavel,
    criarPersonagem,
    normalizarPapeisPersonagem,
    normalizarPersonagensDoTexto,
    normalizarTagsPersonagem,
    sugestoesRelacaoPersonagem,
} from './personagens.js';

const PREFIXO = { poemas: 'p', prosas: 'pr' };

// Um grupo por tabela: { itens, abertos (Set de ids com a relação aberta) }.
const estado = {
    poemas: { itens: [], abertos: new Set() },
    prosas: { itens: [], abertos: new Set() },
};

function ids(tabela) {
    const pre = PREFIXO[tabela];
    return {
        container: `${pre}-personagens-container`,
        input: `${pre}-personagem-input`,
        datalist: `${pre}-sugestoes-personagens`,
    };
}

function grupo(tabela) {
    const g = estado[tabela];
    if (!g) throw new Error(`Tabela desconhecida em grupo-personagens: ${tabela}`);
    return g;
}

function nomeDe(personagemId) {
    return (
        (db.personagens || []).find((p) => p.id == personagemId)?.nome || '(personagem removido)'
    );
}

// O form do modal escuta 'input'/'change' para saber se há alteração não
// salva; mexer em chips não dispara isso sozinho.
function avisarAlteracao(container) {
    container?.dispatchEvent(new Event('change', { bubbles: true }));
}

function htmlPapeis(v) {
    return PAPEIS_PERSONAGEM.map((papel) => {
        const marcado = v.papeis.includes(papel);
        return `<label class="inline-flex items-center gap-1 text-[10px] text-gray-700 dark:text-slate-200 cursor-pointer whitespace-nowrap">
            <input type="checkbox" data-pers-papel="${escapeHtml(papel)}" ${marcado ? 'checked' : ''} class="rounded border-gray-300 dark:border-slate-600" />
            ${escapeHtml(papel)}
        </label>`;
    }).join('');
}

function htmlCentralidade(v) {
    if (!centralidadeAplicavel(v.papeis)) {
        return `<span class="text-[10px] italic text-gray-400 dark:text-slate-500">Centralidade não se aplica a quem só é mencionado ou aludido</span>`;
    }
    const opcoes = ['', ...CENTRALIDADES_PERSONAGEM]
        .map(
            (c) =>
                `<option value="${c}" ${v.centralidade === c ? 'selected' : ''}>${escapeHtml(ROTULOS_CENTRALIDADE_PERSONAGEM[c])}</option>`,
        )
        .join('');
    return `<label class="inline-flex items-center gap-1 text-[10px] text-gray-700 dark:text-slate-200">
        Centralidade
        <select data-pers-centralidade style="width: auto; margin-bottom: 0" class="text-[10px]">${opcoes}</select>
    </label>`;
}

function htmlCampoRelacao(tabela, v, campo) {
    const chips = v[campo]
        .map(
            (
                t,
            ) => `<span class="bg-violet-600 text-white text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(t)}
                <button type="button" data-pers-tag-remover="${campo}" data-valor="${escapeHtml(t)}" class="hover:text-red-200 font-bold" title="Remover" aria-label="Remover ${escapeHtml(t)}">×</button>
            </span>`,
        )
        .join('');
    return `<div>
        <label class="form-label">${escapeHtml(ROTULOS_RELACAO_PERSONAGEM[campo])}</label>
        <div class="flex flex-wrap gap-1 mb-1">${chips}</div>
        <input type="text" data-pers-tag-input="${campo}" list="sug-pers-${tabela}-${campo}" class="text-xs" placeholder="Enter adiciona" autocomplete="off" />
    </div>`;
}

function htmlCartao(tabela, v, aberto) {
    const temRelacao = CAMPOS_RELACAO_PERSONAGEM.some((c) => v[c].length > 0);
    return `<div data-pers-vinculo="${escapeHtml(String(v.personagemId))}" class="border border-gray-200 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-900">
        <div class="flex items-center justify-between gap-2 mb-1">
            <span class="font-semibold text-sm">${escapeHtml(nomeDe(v.personagemId))}</span>
            <button type="button" data-pers-remover class="text-gray-400 hover:text-red-500 font-bold" title="Remover do texto" aria-label="Remover do texto">×</button>
        </div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">${htmlPapeis(v)}</div>
        <div class="mt-1">${htmlCentralidade(v)}</div>
        <details data-pers-relacao class="mt-1" ${aberto || temRelacao ? 'open' : ''}>
            <summary class="text-[10px] text-gray-500 dark:text-slate-400 cursor-pointer">Relação com este texto</summary>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                ${CAMPOS_RELACAO_PERSONAGEM.map((c) => htmlCampoRelacao(tabela, v, c)).join('')}
            </div>
        </details>
    </div>`;
}

function renderizar(tabela, foco = null) {
    const g = grupo(tabela);
    const { container: idContainer, datalist: idDatalist } = ids(tabela);
    const container = document.getElementById(idContainer);
    if (!container) return;

    container.innerHTML =
        g.itens.map((v) => htmlCartao(tabela, v, g.abertos.has(String(v.personagemId)))).join('') +
        CAMPOS_RELACAO_PERSONAGEM.map(
            (c) =>
                `<datalist id="sug-pers-${tabela}-${c}">${sugestoesRelacaoPersonagem(db, c)
                    .map((t) => `<option value="${escapeHtml(t)}"></option>`)
                    .join('')}</datalist>`,
        ).join('');

    const datalist = document.getElementById(idDatalist);
    if (datalist) {
        datalist.innerHTML = (db.personagens || [])
            .map((p) => p.nome)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
            .map((n) => `<option value="${escapeHtml(n)}"></option>`)
            .join('');
    }

    if (foco) {
        const alvo = [...container.querySelectorAll('[data-pers-vinculo]')].find(
            (el) => el.getAttribute('data-pers-vinculo') === String(foco.personagemId),
        );
        alvo?.querySelector(`[data-pers-tag-input="${foco.campo}"]`)?.focus();
    }
}

function vinculo(tabela, personagemId) {
    return grupo(tabela).itens.find((v) => v.personagemId == personagemId);
}

function adicionarPorId(tabela, personagemId) {
    const g = grupo(tabela);
    if (g.itens.some((v) => v.personagemId == personagemId)) return;
    g.itens.push(...normalizarPersonagensDoTexto([{ personagemId }]));
    renderizar(tabela);
    repintarAncoras(tabela);
    avisarAlteracao(document.getElementById(ids(tabela).container));
}

// Nome digitado: reaproveita o personagem de mesmo nome (sem caixa/acento);
// nome novo pede confirmação antes de criar, para um erro de digitação não
// virar personagem novo por acidente.
export function adicionarPersonagem(tabela, valor = null) {
    const input = document.getElementById(ids(tabela).input);
    const nome = String(valor ?? input?.value ?? '').trim();
    if (input) input.value = '';
    if (!chaveTema(nome)) return;

    const existente = acharPersonagemPorNome(db, nome);
    if (existente) {
        adicionarPorId(tabela, existente.id);
        return;
    }
    abrirModalConfirmacao({
        titulo: `Criar personagem "${nome}"?`,
        rotulo: 'Personagem novo',
        mensagem: `"${nome}" ainda não está no cadastro de Personagens. Criar agora (os demais dados ficam para preencher na aba Personagens)?`,
        textoConfirmar: 'Criar',
        corConfirmar: '#7c3aed',
        onConfirmar: () => {
            const criado = criarPersonagem(db, { nome });
            if (criado) adicionarPorId(tabela, criado.id);
        },
    });
}

function tirarPersonagem(tabela, personagemId) {
    const g = grupo(tabela);
    g.itens = g.itens.filter((v) => v.personagemId != personagemId);
    g.abertos.delete(String(personagemId));
    renderizar(tabela);
    repintarAncoras(tabela);
    avisarAlteracao(document.getElementById(ids(tabela).container));
}

// Se o personagem ancora Ecos com este texto, pergunta antes (manter com aviso,
// remover a âncora ou cancelar); senão remove direto (F11-D6).
export function removerPersonagem(tabela, personagemId) {
    const nome = (db.personagens || []).find((p) => p.id == personagemId)?.nome || 'Personagem';
    confirmarRemocaoVinculo({
        tabela,
        especie: 'personagem',
        id: personagemId,
        nome,
        remover: () => tirarPersonagem(tabela, personagemId),
    });
}

export function resetPersonagens(tabela) {
    const g = grupo(tabela);
    g.itens = [];
    g.abertos = new Set();
    renderizar(tabela);
}

export function carregarPersonagens(tabela, lista) {
    const g = grupo(tabela);
    g.itens = normalizarPersonagensDoTexto(lista);
    g.abertos = new Set();
    renderizar(tabela);
}

// Leitura sem efeito colateral (não mexe nos campos de tag): para quem só
// precisa saber quem está ligado ao texto agora, como o seletor de âncora.
export function lerPersonagens(tabela) {
    return normalizarPersonagensDoTexto(grupo(tabela).itens);
}

// O que ainda está digitado num campo de tag e não virou chip também entra.
export function obterPersonagens(tabela) {
    const g = grupo(tabela);
    const container = document.getElementById(ids(tabela).container);
    container?.querySelectorAll('[data-pers-tag-input]').forEach((input) => {
        const texto = input.value.trim();
        if (!texto) return;
        const id = input.closest('[data-pers-vinculo]')?.getAttribute('data-pers-vinculo');
        const v = g.itens.find((x) => String(x.personagemId) === id);
        const campo = input.getAttribute('data-pers-tag-input');
        if (v) v[campo] = normalizarTagsPersonagem([...v[campo], ...texto.split(',')]);
        input.value = '';
    });
    return normalizarPersonagensDoTexto(g.itens);
}

// Liga os eventos (delegados no container, que é recriado a cada render).
// Chamado pelo initForm do Poema/Prosa, quando o modal já está no DOM.
export function iniciarGrupoPersonagens(tabela) {
    const g = grupo(tabela);
    const { container: idContainer, input: idInput } = ids(tabela);
    const container = document.getElementById(idContainer);
    if (!container || container.dataset.persLigado) return;
    container.dataset.persLigado = '1';

    const vinculoDoEvento = (alvo) => {
        const el = alvo instanceof HTMLElement ? alvo.closest('[data-pers-vinculo]') : null;
        return el ? vinculo(tabela, el.getAttribute('data-pers-vinculo')) : null;
    };

    container.addEventListener('change', (e) => {
        const alvo = e.target;
        if (!(alvo instanceof HTMLElement)) return;
        const v = vinculoDoEvento(alvo);
        if (!v) return;
        if (alvo.hasAttribute('data-pers-papel')) {
            const caixas = alvo
                .closest('[data-pers-vinculo]')
                .querySelectorAll('[data-pers-papel]');
            v.papeis = normalizarPapeisPersonagem(
                [...caixas].filter((c) => c.checked).map((c) => c.getAttribute('data-pers-papel')),
            );
            if (!centralidadeAplicavel(v.papeis)) v.centralidade = '';
            renderizar(tabela);
        } else if (alvo.hasAttribute('data-pers-centralidade')) {
            v.centralidade = alvo.value;
        }
    });

    container.addEventListener('click', (e) => {
        const alvo = e.target instanceof HTMLElement ? e.target : null;
        if (!alvo) return;
        if (alvo.closest('[data-pers-remover]')) {
            const v = vinculoDoEvento(alvo);
            if (v) removerPersonagem(tabela, v.personagemId);
            return;
        }
        const botaoTag = alvo.closest('[data-pers-tag-remover]');
        if (botaoTag) {
            const v = vinculoDoEvento(botaoTag);
            if (!v) return;
            const campo = botaoTag.getAttribute('data-pers-tag-remover');
            const valor = botaoTag.getAttribute('data-valor');
            v[campo] = v[campo].filter((t) => t !== valor);
            renderizar(tabela);
            avisarAlteracao(container);
        }
    });

    container.addEventListener('keydown', (e) => {
        const alvo = e.target;
        if (!(alvo instanceof HTMLElement) || !alvo.hasAttribute('data-pers-tag-input')) return;
        if (e.key !== 'Enter' && e.key !== ',') return;
        e.preventDefault();
        const v = vinculoDoEvento(alvo);
        if (!v) return;
        const campo = alvo.getAttribute('data-pers-tag-input');
        v[campo] = normalizarTagsPersonagem([...v[campo], ...alvo.value.split(',')]);
        alvo.value = '';
        renderizar(tabela, { personagemId: v.personagemId, campo });
        avisarAlteracao(container);
    });

    // Abrir/fechar a relação não pode se perder no próximo render.
    container.addEventListener(
        'toggle',
        (e) => {
            const alvo = e.target;
            if (!(alvo instanceof HTMLElement) || !alvo.hasAttribute('data-pers-relacao')) return;
            const id = alvo.closest('[data-pers-vinculo]')?.getAttribute('data-pers-vinculo');
            if (!id) return;
            if (alvo.open) g.abertos.add(id);
            else g.abertos.delete(id);
        },
        true,
    );

    // Enter no campo de nome adiciona (e não envia o formulário).
    document.getElementById(idInput)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarPersonagem(tabela);
        }
    });

    renderizar(tabela);
}
