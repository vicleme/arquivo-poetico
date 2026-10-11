// ui-sugestao-ecos.js: modal "Sugerir Ecos" (Fase 11, etapa 4b). Aberto pelo
// botão do cartão de uma Pessoa ou de um Personagem. O cálculo dos pares e a
// criação do Eco vivem em sugestao-ecos.js; aqui só a tela.
//
// Cada par mostra os dois textos e a direção sugerida pelas datas de escrita.
// Criar o Eco grava no texto mais novo, na hora (com save()), e o par passa
// para a lista "Criados agora", onde dá para desfazer sem sair do modal.

import { db, save } from './db.js';
import { garantirModal, toggleModal } from './modais.js';
import { escapeHtml, formatarDataParcial, mostrarAviso } from './utils.js';
import {
    criarEcoSugerido,
    desfazerEcoSugerido,
    ignorarPar,
    restaurarPar,
    sugerirEcos,
} from './sugestao-ecos.js';

const TAMANHO_PAGINA = 15;

const estado = {
    especie: 'pessoa',
    id: null,
    limite: TAMANHO_PAGINA,
    incluirSuperficiais: false,
    criados: [],
};

function campo(id) {
    return document.getElementById(id);
}

const ROTULO_COLECAO = { poemas: 'Poema', prosas: 'Prosa' };

function rotuloDoSujeito(especie) {
    return especie === 'pessoa' ? 'a pessoa' : 'o personagem';
}

function textoData(lado) {
    const d = lado.dataEscrita;
    return d ? `escrito em ${formatarDataParcial(d)}` : 'sem data de escrita';
}

function chipsPapeis(lado) {
    if (!lado.papeis.length) {
        return `<span class="text-[9px] italic text-gray-400 dark:text-slate-500">sem papel marcado</span>`;
    }
    return lado.papeis
        .map(
            (p) =>
                `<span class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">${escapeHtml(p)}</span>`,
        )
        .join('');
}

function blocoDoTexto(lado) {
    return `
        <div class="min-w-0">
            <p class="text-sm font-semibold truncate" title="${escapeHtml(lado.titulo)}">${escapeHtml(lado.titulo || '(sem título)')}</p>
            <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">${ROTULO_COLECAO[lado.col]} · ${escapeHtml(textoData(lado))}</p>
            <div class="flex flex-wrap gap-1 mt-1">${chipsPapeis(lado)}</div>
        </div>`;
}

const BTN_PRIMARIO =
    'text-xs px-2 py-1 rounded bg-violet-600 hover:bg-violet-700 text-white max-w-full truncate';
const BTN_SECUNDARIO =
    'text-xs px-2 py-1 rounded border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 max-w-full truncate';

function botaoCriar(par, dono, primario) {
    const quem = par[dono];
    const alvo = par[dono === 'a' ? 'b' : 'a'];
    const rotulo = `“${quem.titulo || 'sem título'}” ecoa “${alvo.titulo || 'sem título'}”`;
    return `<button type="button" data-sug-criar="${escapeHtml(par.chave)}" data-dono="${dono}" title="${escapeHtml(rotulo)}" class="${primario ? BTN_PRIMARIO : BTN_SECUNDARIO}">${primario ? 'Criar: ' : ''}${escapeHtml(rotulo)}</button>`;
}

function cartaoDoPar(par) {
    const acoes = par.dono
        ? `<span class="text-[10px] text-gray-400 dark:text-slate-500 w-full">Pelas datas, o mais novo é “${escapeHtml(par[par.dono].titulo || 'sem título')}”.</span>
           ${botaoCriar(par, par.dono, true)}
           ${botaoCriar(par, par.dono === 'a' ? 'b' : 'a', false)}`
        : `<span class="text-[10px] text-amber-600 dark:text-amber-400 w-full">As datas não decidem qual é o mais novo. Escolha o sentido:</span>
           ${botaoCriar(par, 'a', false)}
           ${botaoCriar(par, 'b', false)}`;
    return `
        <div data-sug-par="${escapeHtml(par.chave)}" class="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${blocoDoTexto(par.a)}${blocoDoTexto(par.b)}</div>
            <div class="flex flex-wrap items-center gap-2 mt-3">${acoes}
                <button type="button" data-sug-ignorar="${escapeHtml(par.chave)}" title="Não sugerir este par de novo para esta figura" class="${BTN_SECUNDARIO} ml-auto">Ignorar</button>
            </div>
        </div>`;
}

function renderCriados() {
    const alvo = campo('sug-ecos-criados');
    if (!alvo) return;
    if (!estado.criados.length) {
        alvo.innerHTML = '';
        return;
    }
    alvo.innerHTML =
        `<p class="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Criados agora (${estado.criados.length})</p>` +
        estado.criados
            .map(
                (c, i) => `
            <div class="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm">
                <span class="min-w-0 truncate" title="${escapeHtml(c.rotulo)}">${escapeHtml(c.rotulo)}</span>
                <button type="button" data-sug-desfazer="${i}" class="text-xs underline text-emerald-800 dark:text-emerald-300 flex-shrink-0">Desfazer</button>
            </div>`,
            )
            .join('');
}

function renderIgnorados(ignorados) {
    const alvo = campo('sug-ecos-ignorados');
    if (!alvo) return;
    if (!ignorados.length) {
        alvo.innerHTML = '';
        return;
    }
    // Mantém aberto o que a pessoa abriu entre um clique e outro.
    const aberto = alvo.querySelector('details')?.open ? ' open' : '';
    alvo.innerHTML = `
        <details${aberto} class="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
            <summary class="text-sm cursor-pointer text-gray-600 dark:text-slate-300">Ignorados (${ignorados.length})</summary>
            <div class="grid grid-cols-1 gap-2 mt-3">
                ${ignorados
                    .map(
                        (par) => `
                    <div data-sug-ignorado="${escapeHtml(par.chave)}" class="flex items-center justify-between gap-3 text-sm">
                        <span class="min-w-0 truncate" title="${escapeHtml(`${par.a.titulo} e ${par.b.titulo}`)}">${escapeHtml(par.a.titulo || '(sem título)')} e ${escapeHtml(par.b.titulo || '(sem título)')}</span>
                        <button type="button" data-sug-restaurar="${escapeHtml(par.chave)}" class="${BTN_SECUNDARIO} flex-shrink-0">Voltar a sugerir</button>
                    </div>`,
                    )
                    .join('')}
            </div>
        </details>`;
}

function renderLista() {
    const resultado = sugerirEcos(db, estado.especie, estado.id, {
        incluirSuperficiais: estado.incluirSuperficiais,
    });
    const intro = campo('sug-ecos-intro');
    const lista = campo('sug-ecos-lista');
    const mais = campo('sug-ecos-mais');
    const rotuloSup = campo('sug-ecos-rotulo-superficiais');

    campo('modal-sugestao-ecos-titulo').textContent = `Sugerir Ecos: ${resultado.nome}`;
    const n = resultado.totalTextos;
    intro.textContent =
        n < 2
            ? `Para sugerir Ecos, ${rotuloDoSujeito(estado.especie)} precisa estar em pelo menos dois textos.`
            : `${resultado.nome} está em ${n} textos (${resultado.totalPares} pares possíveis). ${resultado.comEco} já ${resultado.comEco === 1 ? 'tem' : 'têm'} Eco entre si.`;

    if (rotuloSup) {
        rotuloSup.textContent = `Incluir pares em que os dois textos só mencionam ou aludem${
            !estado.incluirSuperficiais && resultado.superficiais
                ? ` (${resultado.superficiais} ocultos)`
                : ''
        }`;
    }

    const visiveis = resultado.pares.slice(0, estado.limite);
    if (!resultado.pares.length) {
        lista.innerHTML =
            n < 2
                ? ''
                : `<p class="text-sm text-center text-gray-400 dark:text-slate-500 py-4">Nenhum par sem Eco para sugerir.</p>`;
    } else {
        lista.innerHTML =
            `<p class="text-xs text-gray-500 dark:text-slate-400">Mostrando ${visiveis.length} de ${resultado.pares.length} ${resultado.pares.length === 1 ? 'par' : 'pares'}, dos mais prováveis para os menos.</p>` +
            visiveis.map(cartaoDoPar).join('');
    }
    const restantes = resultado.pares.length - visiveis.length;
    mais.innerHTML =
        restantes > 0
            ? `<button type="button" data-sug-mais class="${BTN_SECUNDARIO}">Mostrar mais ${Math.min(TAMANHO_PAGINA, restantes)}</button>`
            : '';
    renderIgnorados(resultado.ignorados);
    renderCriados();
}

function aoClicar(e) {
    const criar = e.target.closest('[data-sug-criar]');
    if (criar) {
        const resultado = sugerirEcos(db, estado.especie, estado.id, { incluirSuperficiais: true });
        const par = resultado.pares.find((p) => p.chave === criar.dataset.sugCriar);
        const registro = par
            ? criarEcoSugerido(db, par, estado.especie, estado.id, criar.dataset.dono)
            : null;
        if (!registro) {
            mostrarAviso('Esse par mudou e já não pode receber o Eco. A lista foi atualizada.');
            renderLista();
            return;
        }
        const quem = par[criar.dataset.dono];
        const alvo = par[criar.dataset.dono === 'a' ? 'b' : 'a'];
        estado.criados.push({
            registro,
            rotulo: `“${quem.titulo || 'sem título'}” ecoa “${alvo.titulo || 'sem título'}”`,
        });
        save();
        renderLista();
        return;
    }
    const ignorar = e.target.closest('[data-sug-ignorar]');
    if (ignorar) {
        if (ignorarPar(db, estado.especie, estado.id, ignorar.dataset.sugIgnorar)) save();
        renderLista();
        return;
    }
    const restaurar = e.target.closest('[data-sug-restaurar]');
    if (restaurar) {
        if (restaurarPar(db, estado.especie, estado.id, restaurar.dataset.sugRestaurar)) save();
        renderLista();
        return;
    }
    const desfazer = e.target.closest('[data-sug-desfazer]');
    if (desfazer) {
        const indice = Number(desfazer.dataset.sugDesfazer);
        const item = estado.criados[indice];
        if (!item) return;
        if (!desfazerEcoSugerido(db, item.registro)) {
            mostrarAviso('Esse Eco já foi alterado ou removido por outro caminho.');
        }
        estado.criados.splice(indice, 1);
        save();
        renderLista();
        return;
    }
    if (e.target.closest('[data-sug-mais]')) {
        estado.limite += TAMANHO_PAGINA;
        renderLista();
    }
}

export function initSugestaoEcos() {
    const modal = campo('modal-sugestao-ecos');
    if (!modal) return;
    modal.addEventListener('click', aoClicar);
    campo('sug-ecos-superficiais')?.addEventListener('change', (e) => {
        estado.incluirSuperficiais = e.target.checked;
        estado.limite = TAMANHO_PAGINA;
        renderLista();
    });
}

export async function abrirSugestaoEcos(especie, id) {
    const existe = (db[especie === 'pessoa' ? 'pessoas' : 'personagens'] || []).some(
        (x) => x.id == id,
    );
    if (!existe) return;
    await garantirModal('modal-sugestao-ecos');
    estado.especie = especie;
    estado.id = id;
    estado.limite = TAMANHO_PAGINA;
    estado.incluirSuperficiais = false;
    estado.criados = [];
    const marcador = campo('sug-ecos-superficiais');
    if (marcador) marcador.checked = false;
    renderLista();
    await toggleModal('modal-sugestao-ecos');
}
