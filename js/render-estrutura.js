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
    semDescartadosNaArvore,
} from './estrutura-livro.js';
import { dadosForaDeEscopoDaTela, textoDaEntradaForaDeEscopo } from './fora-de-escopo.js';
import { lugaresOcupadosDoTexto, moverAparicaoDeLugar } from './mover-aparicao-na-fila.js';
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
// Descartado sai da árvore e vive só no "Fora de escopo" do fim da aba.
// Fase 21 (21-3c): os textos vêm pelas aparições, então o mesmo texto aparece em
// cada lugar do livro onde está. Cada linha de texto leva o lugar dela
// (`paiTipo`, `paiId`) nos botões e no número da posição, e ▲▼, posição e
// "mover para outro nível" mexem só na aparição daquele lugar.
const POR_APARICAO = { porAparicao: true };
const getTopoComTipos = (livroId) =>
    semDescartadosNaArvore(filhosTopoDoLivro(db, livroId, POR_APARICAO));
const getDentroParteComTipos = (parteId) =>
    semDescartadosNaArvore(filhosDaParte(db, parteId, POR_APARICAO));
const getDentroSecaoComTipos = (secaoId) =>
    semDescartadosNaArvore(filhosDaSecao(db, secaoId, POR_APARICAO));

const ehTexto = (tipo) => tipo === 'poema' || tipo === 'prosa';

// Os irmãos (o "andar") de um lugar, na ordem da tela.
function irmaosDoLugar(paiTipo, paiId) {
    if (paiTipo === 'parte') return getDentroParteComTipos(paiId);
    if (paiTipo === 'secao') return getDentroSecaoComTipos(paiId);
    if (paiTipo === 'livro') return getTopoComTipos(paiId);
    return [];
}

// Selos "veio de ..." dos migrados do livro em exibição (de `renderEstrutura`) e
// grupos do Fora de escopo que o usuário abriu (sobrevivem ao re-render).
let selosMigracaoAtuais = new Map();
const _foraAbertos = new Set();

function seloMigracaoEstruturaHtml(tipo, dados) {
    const selo = selosMigracaoAtuais.get(`${tipo}-${dados.id}`);
    if (!selo) return '';
    return `<span data-estrutura-selo class="text-[10px] text-blue-600 dark:text-blue-400">${escapeHtml(selo.texto)}</span>`;
}

function entradaForaEstruturaHtml(e) {
    const acao = e.tipo === 'prosa' ? 'ver-prosa' : 'ver-poema';
    return `<div data-fora-entrada data-tipo="${e.tipo}" style="margin-left:18px" class="py-1.5 flex flex-wrap items-baseline gap-x-2 text-sm border-b border-gray-50 dark:border-slate-800">
        <span>${e.tipo === 'prosa' ? '📄' : '📝'}</span>
        <span class="cursor-pointer hover:underline ${e.tipo === 'prosa' ? 'text-emerald-700' : 'text-gray-600'}" data-action="${acao}" data-id="${e.id}" title="Abrir o Ver deste texto">${escapeHtml(e.titulo)}</span>
        <span class="text-[11px] text-gray-500 dark:text-slate-400">${escapeHtml(textoDaEntradaForaDeEscopo(e))}</span>
    </div>`;
}

function foraEstruturaHtml(fora, aviso) {
    const migrados = fora?.migrados || [];
    const descartados = fora?.descartados || [];
    if (!migrados.length && !descartados.length && !aviso) return '';
    const grupo = (chave, rotulo, entradas) =>
        entradas.length
            ? `<details data-fora-chave="${chave}" ${_foraAbertos.has(chave) ? 'open' : ''} class="mt-1">
                <summary class="py-1 flex items-center gap-2 text-sm cursor-pointer list-none"><span>${rotulo}</span><span class="text-[10px] text-gray-400 dark:text-slate-500 ml-auto">${entradas.length} ${entradas.length === 1 ? 'texto' : 'textos'}</span></summary>
                <div>${entradas.map(entradaForaEstruturaHtml).join('')}</div>
            </details>`
            : '';
    const avisoHtml = aviso
        ? `<p data-fora-aviso class="text-[11px] text-amber-700 dark:text-amber-400 py-1">⚠️ ${escapeHtml(aviso)}</p>`
        : '';
    const total = migrados.length + descartados.length;
    return `<details data-fora-chave="fora-de-escopo" ${_foraAbertos.has('fora-de-escopo') ? 'open' : ''} class="mt-4 border-t border-gray-100 dark:border-slate-700 pt-2">
        <summary class="py-1.5 flex items-center gap-2 text-sm cursor-pointer list-none"><span class="font-semibold">Fora de escopo</span><span class="text-[10px] text-gray-400 dark:text-slate-500 ml-auto">${total} ${total === 1 ? 'texto' : 'textos'}</span></summary>
        <div>${avisoHtml}${grupo('fora-migrados', '🔵 Migrados', migrados)}${grupo('fora-descartados', '🔴 Descartados', descartados)}</div>
    </details>`;
}

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
function seloPosicao(seq, repetida, tipo, id, lugar = null) {
    // Clicar no número edita a posição direto (ação `editar-posicao-estrutura`, em main.js).
    // Texto leva o lugar da linha: a posição é a da aparição daquele lugar.
    const base =
        'text-[10px] font-mono px-1.5 py-0.5 rounded w-8 text-center inline-block cursor-text';
    const alvo = `data-action="editar-posicao-estrutura" data-tipo="${tipo}" data-id="${id}"${
        lugar ? ` data-pai-tipo="${lugar.paiTipo}" data-pai-id="${lugar.paiId}"` : ''
    }`;
    if (repetida) {
        return `<span ${alvo} class="${base} bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" title="Outro item deste nível tem a mesma posição, então a ordem entre eles não está definida. Clique para digitar a posição, ou use ▲▼.">${seq}</span>`;
    }
    return `<span ${alvo} class="${base} bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" title="Clique para digitar a posição">${seq}</span>`;
}

function renderNoEstrutura({ tipo, dados }, nivel, repetidas = new Set()) {
    const seq = dados.sequencia !== null && dados.sequencia !== undefined ? dados.sequencia : '—';
    // O lugar desta linha, só para texto (Seção, Elemento e Parte têm um Destino só).
    const lugar = ehTexto(tipo) ? { paiTipo: dados.paiTipo, paiId: dados.paiId } : null;
    const lugarArgs = lugar ? `, '${lugar.paiTipo}', '${lugar.paiId}'` : '';
    const selo = seloPosicao(seq, repetidas.has(parseInt(dados.sequencia)), tipo, dados.id, lugar);

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
            ? `<button onclick="event.stopPropagation(); event.preventDefault(); abrirModalMoverNivel('${tipo}', ${dados.id}${lugarArgs})"
                class="text-gray-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 px-1 text-xs" title="Mover para outro nível">↪</button>`
            : '';

    const botoesMover = `
        <span class="ml-auto flex gap-1">
            <button onclick="event.stopPropagation(); event.preventDefault(); moverItemEstrutura('${tipo}', ${dados.id}, 'up'${lugarArgs})"
                class="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 px-1 text-xs" title="Subir">▲</button>
            <button onclick="event.stopPropagation(); event.preventDefault(); moverItemEstrutura('${tipo}', ${dados.id}, 'down'${lugarArgs})"
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
        ${seloMigracaoEstruturaHtml(tipo, dados)}
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

// `paiTipo` e `paiId` (só para Poema e Prosa) dizem em qual lugar a linha está:
// o texto pode aparecer em vários, e o ▲▼ troca a posição dele só ali. Sem eles
// (chamada antiga), vale o Destino do texto.
export function moverItemEstrutura(tipo, id, direcao, paiTipo = null, paiId = null) {
    let irmaos;
    if (ehTexto(tipo) && paiTipo) {
        irmaos = irmaosDoLugar(paiTipo, paiId);
    } else {
        const dados = colecoesMoviveis()[tipo]?.find((x) => x.id == id);
        if (!dados) return;
        irmaos = obterEscopoDoItem(tipo, dados);
    }
    const idx = irmaos.findIndex((f) => f.tipo === tipo && String(f.dados.id) === String(id));
    if (idx === -1) return;

    const alvoIdx = direcao === 'up' ? idx - 1 : idx + 1;
    if (alvoIdx < 0 || alvoIdx >= irmaos.length) return;

    // Posições repetidas (ex.: Parte 1, Introdução 1, Conteúdo 2) tornam a troca um
    // no-op e a ordem ao acaso: antes de trocar, fixa 1..N na ordem que a tela mostra.
    if (posicoesRepetidas(irmaos).size) renumerarIrmaos(irmaos);

    // Os nós da lista, não os objetos do `db`: num texto cuja aparição daqui não é o
    // Destino, o nó grava a posição da aparição, não a do espelho.
    const atual = irmaos[idx].dados;
    const alvo = irmaos[alvoIdx].dados;
    const seqAtual = atual.sequencia;
    atual.sequencia = alvo.sequencia;
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
export function definirPosicaoEstrutura(tipo, id, valor, paiTipo = null, paiId = null) {
    const texto = String(valor ?? '').trim();
    if (!/^\d+$/.test(texto)) return false;
    const n = parseInt(texto, 10);
    if (n < 1) return false;
    // Texto com lugar: o nó daquele lugar (a posição é a da aparição ali).
    const dados =
        ehTexto(tipo) && paiTipo
            ? irmaosDoLugar(paiTipo, paiId).find(
                  (f) => f.tipo === tipo && String(f.dados.id) === String(id),
              )?.dados
            : colecaoDoTipo(tipo)?.find((x) => String(x.id) === String(id));
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
    const { tipo, id, paiTipo, paiId } = selo.dataset;
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
        if (
            gravar &&
            !definirPosicaoEstrutura(tipo, id, campo.value, paiTipo, paiId) &&
            campo.value.trim()
        ) {
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

function construirOpcoesDestinoMover(tipoOrigem, paiTipoAtual, paiIdAtual, livroId, ocupados = []) {
    const aceitaSecaoComoDestino = tipoOrigem !== 'secao';
    const livro = db.livros.find((l) => l.id == livroId);

    // Fora das opções: o lugar de onde sai e, para texto, os lugares do livro onde
    // ele já aparece (mover para lá faria duas aparições virarem uma).
    const ehDestinoAtual = (tipo, id) =>
        tipoOrigem !== '' &&
        ((tipo === paiTipoAtual && String(id) === String(paiIdAtual)) ||
            ocupados.some(([t, i]) => t === tipo && String(i) === String(id)));

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

export function abrirModalMoverNivel(tipo, id, paiTipo = null, paiId = null) {
    const dados = colecoesMoviveis()[tipo]?.find((x) => x.id == id);
    if (!dados || !livroEstruturaAtual) return;

    const overlay = _garantirModalMoverNivel();

    document.getElementById('mov-rotulo').textContent = ROTULO_TIPO_MOVER[tipo] || tipo;
    document.getElementById('mov-titulo').textContent = dados.titulo || '(sem título)';

    // Texto: de onde sai é o lugar da linha clicada, não o Destino do espelho.
    const deTipo = ehTexto(tipo) && paiTipo ? paiTipo : dados.paiTipo;
    const deId = ehTexto(tipo) && paiTipo ? paiId : dados.paiId;
    const ocupados = ehTexto(tipo) ? lugaresOcupadosDoTexto(db, dados, livroEstruturaAtual) : [];

    const selDestino = document.getElementById('mov-destino');
    selDestino.innerHTML = construirOpcoesDestinoMover(
        tipo,
        deTipo,
        deId,
        livroEstruturaAtual,
        ocupados,
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
        executarMoverNivel(tipo, id, destino, inputPosicao.value, deTipo, deId);
        _fecharModalMoverNivel();
    };

    overlay.style.display = 'flex';
}

// Poema e Prosa: move só a aparição do lugar `deTipo`/`deId` (sem eles, a do
// Destino do texto), sem tocar nas outras. Seção e Elemento seguem pelo Destino.
export function executarMoverNivel(tipo, id, destinoStr, posicaoStr, deTipo = null, deId = null) {
    const dados = colecoesMoviveis()[tipo]?.find((x) => x.id == id);
    if (!dados) return;

    const [novoPaiTipo, novoPaiIdStr] = destinoStr.split(':');
    const novoPaiId = novoPaiIdStr;

    if (ehTexto(tipo)) {
        const de = deTipo
            ? { paiTipo: deTipo, paiId: deId }
            : { paiTipo: dados.paiTipo, paiId: dados.paiId };
        const r = moverAparicaoDeLugar(
            db,
            dados,
            de,
            { paiTipo: novoPaiTipo, paiId: novoPaiId },
            seqOuNull(posicaoStr),
        );
        if (r.ok) save();
        else if (r.motivo === 'ja-aparece') mostrarAviso('Este texto já aparece nesse lugar.');
        return;
    }

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
    const { fora, selos, aviso } = dadosForaDeEscopoDaTela(db, livroEstruturaAtual);
    selosMigracaoAtuais = selos;
    const foraHtml = foraEstruturaHtml(fora, aviso);
    if (topo.length === 0 && !foraHtml) {
        container.innerHTML =
            '<p class="text-gray-400 dark:text-slate-500 text-sm">Esse livro ainda não tem conteúdo vinculado.</p>';
        return;
    }

    const repetidasTopo = posicoesRepetidas(topo);
    container.innerHTML =
        topo.map((no) => renderNoEstrutura(no, 0, repetidasTopo)).join('') + foraHtml;

    container.querySelectorAll('details[data-fora-chave]').forEach((det) => {
        det.addEventListener('toggle', () => {
            if (det.open) _foraAbertos.add(det.dataset.foraChave);
            else _foraAbertos.delete(det.dataset.foraChave);
        });
    });

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
