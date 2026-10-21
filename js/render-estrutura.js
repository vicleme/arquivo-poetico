// ============================================================
// render-estrutura.js — Aba "Estrutura": árvore completa do livro
// (Parte → Seção → Poema/Prosa/Elemento), com seleção múltipla
// (inclusive em cascata via Shift+clique), exportação da seleção,
// reordenação (▲▼) e o modal de "mover para outro nível".
//
// Extraído de render.js — ver render-listas.js (tabelas/grids das
// abas Livros/Partes/Seções/Poemas/Prosas/Elementos) e
// render-lightbox.js (capas + lightbox, não usados aqui: a árvore
// de Estrutura não mostra capas).
// ============================================================

import { db, save } from './db.js';
import {
    filhosTopoDoLivro,
    filhosDaParte,
    filhosDaSecao,
    posicoesRepetidas,
    renumerarIrmaos,
} from './estrutura-livro.js';
import {
    reordenarPosicao,
    seqOuNull,
    fecharEspaco,
    getIrmaosPorEscopo,
    escapeHtml,
    mostrarAviso,
} from './utils.js';

let livroEstruturaAtual = '';

// Chaves (`${tipo}-${id}`) dos <details> que o usuário fechou manualmente.
// Sobrevive a re-renders (causados por mover item, salvar etc.) pra não
// reabrir tudo que já tinha sido colapsado.
const _detailsColapsados = new Set();

// Guarda o que o usuário marcou na árvore: { tipo → Set de ids }
const selecaoEstrutura = {
    parte: new Set(),
    secao: new Set(),
    poema: new Set(),
    prosa: new Set(),
    elemento: new Set(),
};

export function toggleSelecaoEstrutura(tipo, id, checked, comShift) {
    if (comShift) {
        // Shift+clique: aplica ao item e a tudo dentro dele recursivamente
        _selecionarCascata(tipo, Number(id), checked);
    } else {
        if (checked) selecaoEstrutura[tipo].add(Number(id));
        else selecaoEstrutura[tipo].delete(Number(id));
    }
    atualizarBarraEstrutura();
}

// Aplica checked recursivamente a um nó e todos os seus descendentes
function _selecionarCascata(tipo, id, checked) {
    if (selecaoEstrutura[tipo]) {
        if (checked) selecaoEstrutura[tipo].add(id);
        else selecaoEstrutura[tipo].delete(id);
    }
    // Desce nos filhos, se houver
    if (tipo === 'parte') {
        getDentroParteComTipos(id).forEach((f) =>
            _selecionarCascata(f.tipo, Number(f.dados.id), checked),
        );
    } else if (tipo === 'secao') {
        getDentroSecaoComTipos(id).forEach((f) =>
            _selecionarCascata(f.tipo, Number(f.dados.id), checked),
        );
    }
    // Poema, prosa e elemento são folhas — não têm filhos
}

// Abre (true) ou fecha (false) todas as Partes e Seções da árvore de uma vez, com o
// emoji de pasta certo, e memoriza o estado: um ▲▼ ou "Selecionar tudo" depois
// re-renderiza a árvore e não desfaz a escolha.
export function expandirTodosEstrutura(abrir) {
    const container = document.getElementById('estrutura-arvore');
    if (!container) return;
    container.querySelectorAll('details.details-icone[data-key]').forEach((det) => {
        det.open = !!abrir;
        const icone = det.querySelector(':scope > summary .icone-details');
        if (icone) icone.textContent = abrir ? det.dataset.iconeAberto : det.dataset.iconeFechado;
        if (abrir) _detailsColapsados.delete(det.dataset.key);
        else _detailsColapsados.add(det.dataset.key);
    });
}

export function marcarTodosEstrutura(marcar) {
    Object.values(selecaoEstrutura).forEach((s) => s.clear());
    if (marcar && livroEstruturaAtual) {
        const topo = getTopoComTipos(livroEstruturaAtual);
        coletarIdsRecursivos(topo);
    }
    renderEstrutura();
    atualizarBarraEstrutura();
}

function coletarIdsRecursivos(nos) {
    nos.forEach(({ tipo, dados }) => {
        selecaoEstrutura[tipo]?.add(Number(dados.id));
        if (tipo === 'parte') coletarIdsRecursivos(getDentroParteComTipos(dados.id));
        if (tipo === 'secao') coletarIdsRecursivos(getDentroSecaoComTipos(dados.id));
    });
}

function atualizarBarraEstrutura() {
    const barra = document.getElementById('barra-acoes-estrutura');
    const cont = document.getElementById('contador-estrutura');
    if (!barra) return;
    const total = Object.values(selecaoEstrutura).reduce((s, set) => s + set.size, 0);
    if (total > 0) {
        barra.classList.remove('hidden');
        if (cont) cont.innerText = `${total} item(ns) selecionado(s)`;
    } else {
        barra.classList.add('hidden');
    }
}

export function exportarSelecaoEstrutura() {
    const getIds = (tipo) => Array.from(selecaoEstrutura[tipo] || []).map(String);

    const saida = {
        livros: db.livros.filter((l) => getIds('livro').includes(String(l.id))), // nunca selecionável, mas mantém compatibilidade
        partes: db.partes.filter((p) => getIds('parte').includes(String(p.id))),
        secoes: db.secoes.filter((s) => getIds('secao').includes(String(s.id))),
        poemas: db.poemas.filter((p) => getIds('poema').includes(String(p.id))),
        prosas: (db.prosas || []).filter((pr) => getIds('prosa').includes(String(pr.id))),
        elementos: (db.elementos || []).filter((e) => getIds('elemento').includes(String(e.id))),
        coletaneas: [],
        itensColetanea: [],
    };

    const total = Object.values(saida).flat().length;
    if (total === 0) {
        mostrarAviso('Nenhum item selecionado.');
        return;
    }

    const blob = new Blob([JSON.stringify(saida, null, 4)], {
        type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `selecao_estrutura_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// A ordem e o pertencimento da árvore moram em estrutura-livro.js, que o Ver do
// Livro também lê: as duas telas nunca divergem.
const getTopoComTipos = (livroId) => filhosTopoDoLivro(db, livroId);
const getDentroParteComTipos = (parteId) => filhosDaParte(db, parteId);
const getDentroSecaoComTipos = (secaoId) => filhosDaSecao(db, secaoId);

const ICONE_TIPO = { parte: '📂', secao: '📁', poema: '📝', prosa: '📄', elemento: '🧩' };
const COR_TIPO = {
    parte: 'font-bold text-blue-800',
    secao: 'font-semibold text-indigo-600',
    poema: 'text-gray-600',
    prosa: 'text-emerald-700',
    elemento: 'text-amber-600 italic',
};

// Número da posição. Se outro irmão do mesmo nível tem o mesmo número, a ordem entre
// eles é ao acaso: o selo fica âmbar, e o ▲▼ passa a renumerar o nível.
function seloPosicao(seq, repetida, tipo, id) {
    // Clicar no número edita a posição direto (ação `editar-posicao-estrutura`, em main.js).
    const base =
        'text-[10px] font-mono px-1.5 py-0.5 rounded w-8 text-center inline-block cursor-text';
    const alvo = `data-action="editar-posicao-estrutura" data-tipo="${tipo}" data-id="${id}"`;
    if (repetida) {
        return `<span ${alvo} class="${base} bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" title="Outro item deste nível tem a mesma posição, então a ordem entre eles não está definida. Clique para digitar a posição, ou use ▲▼.">${seq}</span>`;
    }
    return `<span ${alvo} class="${base} bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" title="Clique para digitar a posição">${seq}</span>`;
}

function renderNoEstrutura({ tipo, dados }, nivel, repetidas = new Set()) {
    const seq = dados.sequencia !== null && dados.sequencia !== undefined ? dados.sequencia : '—';
    const selo = seloPosicao(seq, repetidas.has(parseInt(dados.sequencia)), tipo, dados.id);

    // Elementos (Respiros etc) só têm "tipo" às vezes, sem título — mostra
    // "Tipo: Título" quando os dois existem, senão só o que tiver.
    let titulo = escapeHtml(dados.titulo) || '(sem título)';
    if (tipo === 'elemento') {
        const rotuloTipo = dados.tipo || 'Elemento';
        titulo = dados.titulo
            ? `${escapeHtml(rotuloTipo)}: ${escapeHtml(dados.titulo)}`
            : escapeHtml(rotuloTipo);
    }

    const estaMarcado = selecaoEstrutura[tipo]?.has(Number(dados.id)) ? 'checked' : '';

    // Shift+clique → cascata; clique normal → só o item
    const checkbox = `<input type="checkbox" ${estaMarcado}
        onclick="event.stopPropagation(); toggleSelecaoEstrutura('${tipo}', ${dados.id}, this.checked, event.shiftKey)"
        class="flex-shrink-0" title="Clique normal: só este item. Shift+clique: este item e tudo dentro."
        style="width:14px;height:14px;cursor:pointer;">`;

    // "Mover" (mudar de nível) só existe pra quem pode mudar de pai:
    // Seção, Poema, Prosa, Elemento. Parte nunca aparece aqui pois
    // tipo === 'parte' não tem botão de mover nível (Partes só existem
    // diretamente no Livro).
    const botaoMoverNivel =
        tipo !== 'parte'
            ? `<button onclick="event.stopPropagation(); event.preventDefault(); abrirModalMoverNivel('${tipo}', ${dados.id})"
                class="text-gray-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 px-1 text-xs" title="Mover para outro nível">↪</button>`
            : '';

    const botoesMover = `
        <span class="ml-auto flex gap-1">
            <button onclick="event.stopPropagation(); event.preventDefault(); moverItemEstrutura('${tipo}', ${dados.id}, 'up')"
                class="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 px-1 text-xs" title="Subir">▲</button>
            <button onclick="event.stopPropagation(); event.preventDefault(); moverItemEstrutura('${tipo}', ${dados.id}, 'down')"
                class="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 px-1 text-xs" title="Descer">▼</button>
            ${botaoMoverNivel}
        </span>`;

    // Parte e Seção: emoji varia com o estado open/closed do <details>
    if (tipo === 'parte' || tipo === 'secao') {
        const iconeAberto = tipo === 'parte' ? '📂' : '🗂️';
        const iconeFechado = tipo === 'parte' ? '📁' : '📁';
        const filhos =
            tipo === 'parte' ? getDentroParteComTipos(dados.id) : getDentroSecaoComTipos(dados.id);
        const repetidasFilhos = posicoesRepetidas(filhos);
        const filhosHtml = filhos
            .map((f) => renderNoEstrutura(f, nivel + 1, repetidasFilhos))
            .join('');

        const conteudoLinha = `
            ${checkbox}
            ${selo}
            <span class="icone-details">${iconeAberto}</span>
            <span class="${COR_TIPO[tipo] || ''} cursor-pointer hover:underline" data-action="${tipo === 'parte' ? 'ver-parte-estrutura' : 'ver-secao-estrutura'}" data-id="${dados.id}" title="${tipo === 'parte' ? 'Abrir o Ver desta parte' : 'Abrir o Ver desta seção'}">${titulo}</span>
            <span class="text-[9px] uppercase text-gray-300 dark:text-slate-600 ml-2">${tipo}</span>
            ${botoesMover}`;

        return `
        <details open data-icone-aberto="${iconeAberto}" data-icone-fechado="${iconeFechado}"
            data-key="${tipo}-${dados.id}"
            style="margin-left:${nivel * 18}px" class="border-b border-gray-50 dark:border-slate-800 details-icone">
            <summary class="py-1.5 flex items-center gap-2 text-sm cursor-pointer list-none">${conteudoLinha}</summary>
            <div>${filhosHtml || '<p class="text-[10px] text-gray-300 dark:text-slate-600 italic pl-8 pb-1">(vazio)</p>'}</div>
        </details>`;
    }

    // Poema, Prosa, Elemento: linha simples, sem filhos. O título abre o Ver (ações
    // `ver-poema`, `ver-prosa` e `ver-elemento-estrutura`, em main.js).
    const acaoVer =
        tipo === 'poema'
            ? 'ver-poema'
            : tipo === 'prosa'
              ? 'ver-prosa'
              : tipo === 'elemento'
                ? 'ver-elemento-estrutura'
                : '';
    const dicaVer = tipo === 'elemento' ? 'Abrir o Ver deste elemento' : 'Abrir o Ver deste texto';
    const tituloHtml = acaoVer
        ? `<span class="${COR_TIPO[tipo] || ''} cursor-pointer hover:underline" data-action="${acaoVer}" data-id="${dados.id}" title="${dicaVer}">${titulo}</span>`
        : `<span class="${COR_TIPO[tipo] || ''}">${titulo}</span>`;
    const conteudoLinha = `
        ${checkbox}
        ${selo}
        <span>${ICONE_TIPO[tipo] || '•'}</span>
        ${tituloHtml}
        <span class="text-[9px] uppercase text-gray-300 dark:text-slate-600 ml-2">${tipo}</span>
        ${botoesMover}`;

    return `
        <div style="margin-left:${nivel * 18}px" class="py-1.5 flex items-center gap-2 text-sm border-b border-gray-50 dark:border-slate-800">
            ${conteudoLinha}
        </div>`;
}

// Acha o grupo de irmãos (mesmo "andar") de um item da árvore, pra
// poder trocar a sequência dele com o vizinho ao mover pra cima/baixo.
function obterEscopoDoItem(tipo, dados) {
    if (tipo === 'parte') return getTopoComTipos(dados.livroId);
    if (dados.paiTipo === 'parte') return getDentroParteComTipos(dados.paiId);
    if (dados.paiTipo === 'secao') return getDentroSecaoComTipos(dados.paiId);
    if (dados.paiTipo === 'livro') return getTopoComTipos(dados.paiId);
    return [];
}

export function moverItemEstrutura(tipo, id, direcao) {
    const dados = colecoesMoviveis()[tipo]?.find((x) => x.id == id);
    if (!dados) return;

    const irmaos = obterEscopoDoItem(tipo, dados);
    const idx = irmaos.findIndex((f) => f.tipo === tipo && String(f.dados.id) === String(id));
    if (idx === -1) return;

    const alvoIdx = direcao === 'up' ? idx - 1 : idx + 1;
    if (alvoIdx < 0 || alvoIdx >= irmaos.length) return;

    // Posições repetidas (ex.: Parte 1, Introdução 1, Conteúdo 2) tornam a troca um
    // no-op e a ordem ao acaso: antes de trocar, fixa 1..N na ordem que a tela mostra.
    if (posicoesRepetidas(irmaos).size) renumerarIrmaos(irmaos);

    const alvo = irmaos[alvoIdx].dados;
    const seqAtual = dados.sequencia;
    dados.sequencia = alvo.sequencia;
    alvo.sequencia = seqAtual;

    save();
}

function colecaoDoTipo(tipo) {
    return tipo === 'parte' ? db.partes : colecoesMoviveis()[tipo];
}

// Grava a posição digitada (inteiro de 1 em diante) só neste item, sem empurrar os
// vizinhos: assim dá para pôr um número alto e ir arrumando um a um. Se outro irmão
// ficar com a mesma posição, o selo continua âmbar. Valor inválido não muda nada.
// Devolve true quando gravou.
export function definirPosicaoEstrutura(tipo, id, valor) {
    const texto = String(valor ?? '').trim();
    if (!/^\d+$/.test(texto)) return false;
    const n = parseInt(texto, 10);
    if (n < 1) return false;
    const dados = colecaoDoTipo(tipo)?.find((x) => String(x.id) === String(id));
    if (!dados) return false;
    if (parseInt(dados.sequencia, 10) !== n) {
        dados.sequencia = n;
        save();
    }
    return true;
}

// Troca o número do selo por uma caixa. Enter ou sair do campo grava; Esc cancela.
export function editarPosicaoEstrutura(selo, evento) {
    if (!selo || selo.querySelector('input')) return;
    // O selo de Parte e Seção fica dentro do <summary>: sem isto o clique recolheria.
    evento?.preventDefault?.();
    evento?.stopPropagation?.();
    const { tipo, id } = selo.dataset;
    const atual = selo.textContent.trim();
    const campo = document.createElement('input');
    campo.type = 'text';
    campo.inputMode = 'numeric';
    campo.value = /^\d+$/.test(atual) ? atual : '';
    campo.setAttribute('aria-label', 'Posição');
    campo.className =
        'w-12 text-[10px] font-mono text-center rounded border border-blue-400 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100';
    campo.style.cssText = 'padding:1px 2px;margin:0;height:auto';
    let encerrado = false;
    const encerrar = (gravar) => {
        if (encerrado) return;
        encerrado = true;
        if (gravar && !definirPosicaoEstrutura(tipo, id, campo.value) && campo.value.trim()) {
            mostrarAviso('Digite um número inteiro de 1 em diante.');
        }
        renderEstrutura();
    };
    campo.addEventListener('click', (e) => e.stopPropagation());
    campo.addEventListener('keydown', (e) => {
        e.stopPropagation(); // espaço dentro do <summary> alternaria o <details>
        if (e.key === 'Enter') {
            e.preventDefault();
            encerrar(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            encerrar(false);
        }
    });
    campo.addEventListener('blur', () => encerrar(true));
    selo.textContent = '';
    selo.appendChild(campo);
    campo.focus();
    campo.select();
}

function colecoesMoviveis() {
    return {
        secao: db.secoes,
        poema: db.poemas,
        prosa: db.prosas,
        elemento: db.elementos,
    };
}

function construirOpcoesDestinoMover(tipoOrigem, paiTipoAtual, paiIdAtual, livroId) {
    const aceitaSecaoComoDestino = tipoOrigem !== 'secao';
    const livro = db.livros.find((l) => l.id == livroId);

    const ehDestinoAtual = (tipo, id) =>
        tipoOrigem !== '' && tipo === paiTipoAtual && String(id) === String(paiIdAtual);

    let html = '';
    if (!ehDestinoAtual('livro', livroId)) {
        html += `<option value="livro:${livroId}">📖 ${escapeHtml(livro?.titulo) || ''} (o livro inteiro)</option>`;
    }

    const partesDoLivro = db.partes.filter((p) => String(p.livroId) === String(livroId));
    const secoesDiretas = db.secoes.filter(
        (s) => s.paiTipo === 'livro' && String(s.paiId) === String(livroId),
    );

    const topo = [
        ...partesDoLivro.map((item) => ({ tipo: 'parte', item })),
        ...secoesDiretas.map((item) => ({ tipo: 'secao', item })),
    ].sort((a, b) => (parseInt(a.item.sequencia) || 9999) - (parseInt(b.item.sequencia) || 9999));

    topo.forEach(({ tipo, item }) => {
        if (tipo === 'parte') {
            if (!ehDestinoAtual('parte', item.id)) {
                html += `<option value="parte:${item.id}">▸ ${escapeHtml(item.titulo)}</option>`;
            }
            if (aceitaSecaoComoDestino) {
                db.secoes
                    .filter((s) => s.paiTipo === 'parte' && String(s.paiId) === String(item.id))
                    .sort(
                        (a, b) => (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999),
                    )
                    .forEach((s) => {
                        if (!ehDestinoAtual('secao', s.id)) {
                            html += `<option value="secao:${s.id}">　↳ ${escapeHtml(s.titulo)}</option>`;
                        }
                    });
            }
        } else if (aceitaSecaoComoDestino && !ehDestinoAtual('secao', item.id)) {
            html += `<option value="secao:${item.id}">↳ ${escapeHtml(item.titulo)}</option>`;
        }
    });

    return html;
}

function _garantirModalMoverNivel() {
    let overlay = document.getElementById('modal-mover-nivel');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'modal-mover-nivel';
    overlay.style.cssText = `
        position:fixed; inset:0; z-index:10000;
        background:rgba(0,0,0,0.5);
        display:none; align-items:center; justify-content:center;
        animation:fadeIn .15s ease-out;
    `;

    const caixa = document.createElement('div');
    caixa.style.cssText = `
        background:#fff; border-radius:12px;
        padding:28px 32px; max-width:420px; width:90%;
        box-shadow:0 8px 40px rgba(0,0,0,0.18);
        font-family:sans-serif;
    `;

    caixa.innerHTML = `
        <p style="margin:0 0 6px; font-size:11px; font-weight:700;
                  text-transform:uppercase; letter-spacing:.06em; color:#9ca3af;"
           id="mov-rotulo"></p>
        <h3 style="margin:0 0 20px; font-size:16px; font-weight:700;
                   color:#111827; line-height:1.4; word-break:break-word;"
            id="mov-titulo"></h3>

        <label class="form-label" style="margin-bottom:4px;">Mover para</label>
        <select id="mov-destino" style="margin-bottom:16px;"></select>

        <label class="form-label" style="margin-bottom:4px;">Posição (opcional)</label>
        <input id="mov-posicao" type="number" min="1" placeholder="fim" style="margin-bottom:20px;">

        <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="mov-cancelar"
                style="padding:8px 18px; border-radius:8px; border:1px solid #e5e7eb;
                       background:#fff; color:#374151; font-size:13px; font-weight:600;
                       cursor:pointer;">
                Cancelar
            </button>
            <button id="mov-confirmar"
                style="padding:8px 18px; border-radius:8px; border:none;
                       background:#1d4ed8; color:#fff; font-size:13px; font-weight:600;
                       cursor:pointer;">
                Mover
            </button>
        </div>
    `;

    overlay.appendChild(caixa);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) _fecharModalMoverNivel();
    });

    return overlay;
}

function _fecharModalMoverNivel() {
    const overlay = document.getElementById('modal-mover-nivel');
    if (overlay) overlay.style.display = 'none';
}

const ROTULO_TIPO_MOVER = { secao: 'Seção', poema: 'Poema', prosa: 'Prosa', elemento: 'Elemento' };

export function abrirModalMoverNivel(tipo, id) {
    const dados = colecoesMoviveis()[tipo]?.find((x) => x.id == id);
    if (!dados || !livroEstruturaAtual) return;

    const overlay = _garantirModalMoverNivel();

    document.getElementById('mov-rotulo').textContent = ROTULO_TIPO_MOVER[tipo] || tipo;
    document.getElementById('mov-titulo').textContent = dados.titulo || '(sem título)';

    const selDestino = document.getElementById('mov-destino');
    selDestino.innerHTML = construirOpcoesDestinoMover(
        tipo,
        dados.paiTipo,
        dados.paiId,
        livroEstruturaAtual,
    );

    const inputPosicao = document.getElementById('mov-posicao');
    inputPosicao.value = '';

    document.getElementById('mov-cancelar').onclick = () => _fecharModalMoverNivel();
    document.getElementById('mov-confirmar').onclick = () => {
        const destino = selDestino.value;
        if (!destino) {
            _fecharModalMoverNivel();
            return;
        }
        executarMoverNivel(tipo, id, destino, inputPosicao.value);
        _fecharModalMoverNivel();
    };

    overlay.style.display = 'flex';
}

export function executarMoverNivel(tipo, id, destinoStr, posicaoStr) {
    const dados = colecoesMoviveis()[tipo]?.find((x) => x.id == id);
    if (!dados) return;

    const [novoPaiTipo, novoPaiIdStr] = destinoStr.split(':');
    const novoPaiId = novoPaiIdStr;

    // Nada a fazer se o destino escolhido é igual ao pai atual
    if (dados.paiTipo === novoPaiTipo && String(dados.paiId) === String(novoPaiId)) return;

    // Fecha o buraco que o item deixa no grupo antigo
    const irmaosAntigos = getIrmaosPorEscopo(db, dados.paiTipo, dados.paiId);
    const posicaoAntiga = dados.sequencia ?? null;

    dados.paiTipo = novoPaiTipo;
    dados.paiId = novoPaiId;

    fecharEspaco(irmaosAntigos, posicaoAntiga);

    // Posiciona no grupo novo: posição escolhida ou fim por padrão
    const irmaosNovos = getIrmaosPorEscopo(db, novoPaiTipo, novoPaiId).filter(
        (it) => it.id != dados.id,
    );
    const posicaoDesejada = seqOuNull(posicaoStr);

    if (posicaoDesejada !== null) {
        reordenarPosicao([...irmaosNovos, dados], dados, posicaoDesejada, null);
    } else {
        const maxSeq = irmaosNovos.reduce(
            (max, it) => Math.max(max, parseInt(it.sequencia) || 0),
            0,
        );
        dados.sequencia = maxSeq + 1;
    }

    save();
}

export function popularSeletorEstrutura() {
    const sel = document.getElementById('estrutura-livro-select');
    if (!sel) return;
    const valorAtual = sel.value;
    // Coletâneas não entram aqui: sua estrutura (Partes → Itens em
    // db.itensColetanea) é diferente da árvore Livro→Parte→Seção→Poema
    // que esta aba percorre. Coletâneas têm sua própria aba dedicada.
    sel.innerHTML =
        '<option value="">-- Escolha um livro --</option>' +
        db.livros
            .filter((l) => l.tipo !== 'Coletânea')
            .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
            .join('');
    if (Array.from(sel.options).some((o) => o.value === valorAtual)) sel.value = valorAtual;
}

export function setLivroEstrutura(livroId) {
    livroEstruturaAtual = livroId;
    _detailsColapsados.clear();
    renderEstrutura();
}

export function renderEstrutura() {
    const container = document.getElementById('estrutura-arvore');
    if (!container) return;

    if (!livroEstruturaAtual) {
        container.innerHTML =
            '<p class="text-gray-400 dark:text-slate-500 text-sm">Escolha um livro acima pra ver a árvore completa.</p>';
        return;
    }

    const topo = getTopoComTipos(livroEstruturaAtual);
    if (topo.length === 0) {
        container.innerHTML =
            '<p class="text-gray-400 dark:text-slate-500 text-sm">Esse livro ainda não tem conteúdo vinculado.</p>';
        return;
    }

    const repetidasTopo = posicoesRepetidas(topo);
    container.innerHTML = topo.map((no) => renderNoEstrutura(no, 0, repetidasTopo)).join('');

    // Re-renderizar reconstrói o HTML do zero (innerHTML), então todo
    // <details> nasce aberto de novo. Aqui reaplicamos o estado de
    // colapso que o usuário já tinha escolhido (rastreado em
    // _detailsColapsados via o listener de 'toggle' abaixo), pra que
    // mover um item (▲▼) não reabra tudo que estava fechado.
    container.querySelectorAll('details.details-icone[data-key]').forEach((det) => {
        if (_detailsColapsados.has(det.dataset.key)) {
            det.open = false;
            const icone = det.querySelector(':scope > summary .icone-details');
            if (icone) icone.textContent = det.dataset.iconeFechado;
        }
    });

    // Atualiza o emoji de pasta quando o usuário abre/fecha um <details>,
    // e memoriza o estado de colapso pra sobreviver ao próximo re-render.
    container.querySelectorAll('details.details-icone').forEach((det) => {
        det.addEventListener('toggle', () => {
            const icone = det.querySelector(':scope > summary .icone-details');
            if (icone) {
                icone.textContent = det.open ? det.dataset.iconeAberto : det.dataset.iconeFechado;
            }
            if (det.dataset.key) {
                if (det.open) _detailsColapsados.delete(det.dataset.key);
                else _detailsColapsados.add(det.dataset.key);
            }
        });
    });
}
