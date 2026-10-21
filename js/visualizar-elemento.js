// ============================================================
// visualizar-elemento.js: Modal de Visualização somente-leitura
// de Elemento textual (botão "Ver" do card na aba Elementos Textuais,
// ver renderElementos em render-listas.js).
//
// Mesmo modelo do Ver de Parte e de Seção (visualizar-parte-secao.js):
// o card fica enxuto e aqui mora o texto inteiro (o card corta em 3
// linhas), a imagem em tamanho de leitura, o link da imagem, as Notas de
// Contexto e os dados próprios de cada tipo (Aviso e Versos pós-Introdução
// na Introdução, CDD e demais dados da Ficha catalográfica, todos os itens
// do Sumário).
//
// Campos e seções vazios NÃO aparecem. Como o formulário, os dados próprios
// de um tipo só aparecem naquele tipo (um valor que sobrou de um tipo antigo
// não aparece). Navegação igual à dos outros Ver: Anterior e Próximo, caixa
// "[n] de N" e setas ← →, na ordem e com os filtros dos cards (main.js
// registra `getListaVisivelElementos`), tirada na abertura e congelada
// enquanto o modal estiver aberto.
//
// A parte pura (`renderVisualizacaoElementoHtml`, `resolverVinculoElemento`)
// só monta valores; a parte que escreve no DOM vem depois, para testar sem
// abrir modal.
//
// Olho do cabeçalho do Editar (`verDoModalEdicaoElemento`): troca o Editar pelo
// Ver do mesmo elemento, perguntando antes quando há alteração não salva. O título
// do Elemento na Estrutura (do Livro, de Parte e Seção e da aba) também abre o Ver
// (`abrirElementoDaEstrutura`).
// ============================================================

import {
    garantirModal,
    toggleModal,
    aoFecharModalUmaVez,
    cancelarAoFecharModal,
} from './modais.js';
import { db, deleteItem } from './db.js';
import {
    editarElemento,
    rastreadorElemento,
    ultimoEnvioElemento,
    zerarUltimoEnvioElemento,
} from './forms.js';
import { preencherCapas } from './render-lightbox.js';
import { linkImagemHtml } from './imagem-link.js';
import { escapeHtml, sanitizarTextoRico, abrirModalConfirmacao } from './utils.js';

const MODAL = 'modal-visualizar-elemento';
const MODAL_EDICAO = 'modal-elemento';
const ID = {
    titulo: `${MODAL}-titulo`,
    conteudo: 'visualizar-elemento-conteudo',
    nav: 'visualizar-elemento-nav',
    posicao: 'visualizar-elemento-posicao',
    total: 'visualizar-elemento-total',
    anterior: 'visualizar-elemento-anterior',
    proximo: 'visualizar-elemento-proximo',
};

// ─── Parte pura ──────────────────────────────────────────────

// Livro, Parte e Seção onde o Elemento está (os que existirem). Elemento ligado
// a uma Seção traz também a Parte dela (quando a Seção está numa Parte) e o Livro.
export function resolverVinculoElemento(el, dados = db) {
    const achar = (colecao, id) =>
        (dados[colecao] || []).find((x) => String(x.id) === String(id)) || null;
    let livro = null;
    let parte = null;
    let secao = null;
    if (el?.paiTipo === 'livro') {
        livro = achar('livros', el.paiId);
    } else if (el?.paiTipo === 'parte') {
        parte = achar('partes', el.paiId);
        livro = achar('livros', parte?.livroId);
    } else if (el?.paiTipo === 'secao') {
        secao = achar('secoes', el.paiId);
        if (secao?.paiTipo === 'parte') {
            parte = achar('partes', secao.paiId);
            livro = achar('livros', parte?.livroId);
        } else if (secao) {
            livro = achar('livros', secao.paiId);
        }
    }
    return { livro, parte, secao };
}

function linhaMetaHtml(rotulo, valor) {
    if (valor == null || valor === '') return '';
    return `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">${escapeHtml(rotulo)}:</strong> ${escapeHtml(String(valor))}</p>`;
}

function secaoHtml(titulo, corpo) {
    if (!corpo) return '';
    return `<section class="mt-5"><h4 class="text-[11px] font-bold uppercase text-gray-500 dark:text-slate-400 mb-2 pb-1 border-b border-gray-100 dark:border-slate-700">${escapeHtml(titulo)}</h4>${corpo}</section>`;
}

// Texto longo: respeita as quebras de linha e a formatação permitida (a mesma
// sanitização do card, ver sanitizarTextoRico).
function blocoTextoHtml(texto, classeExtra = '') {
    if (!texto || !String(texto).trim()) return '';
    return `<p class="text-sm text-gray-700 dark:text-slate-200 ${classeExtra}" style="white-space: pre-wrap">${sanitizarTextoRico(texto)}</p>`;
}

function blocoNotasHtml(texto) {
    if (!texto || !String(texto).trim()) return '';
    return `<p class="text-sm text-gray-700 dark:text-slate-200" style="white-space: pre-wrap">${escapeHtml(texto)}</p>`;
}

// Só http e https viram link: o campo é um <input type="url">, que aceita outros
// esquemas (javascript:, por exemplo).
function linkFichaHtml(url) {
    const texto = String(url || '').trim();
    if (!/^https?:\/\//i.test(texto)) return '';
    return `<a href="${escapeHtml(texto)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">Abrir link da ficha</a>`;
}

function fichaHtml(el) {
    if (el.tipo !== 'Ficha catalográfica') return '';
    let html = '';
    html += linhaMetaHtml('CDD', el.fichaCdd);
    html += linhaMetaHtml('Número de controle (CIP)', el.fichaNumeroControle);
    html += linhaMetaHtml(
        'Bibliotecário(a)',
        [el.fichaBibliotecario, el.fichaCrb].filter(Boolean).join(', '),
    );
    const link = linkFichaHtml(el.fichaUrl);
    if (link) html += `<p class="mb-1.5">${link}</p>`;
    return html;
}

// Todos os itens, com recuo por nível e a página à direita.
function sumarioHtml(el) {
    if (el.tipo !== 'Sumário') return '';
    const itens = Array.isArray(el.itensSumario) ? el.itensSumario : [];
    if (!itens.length) return '';
    const linhas = itens
        .map((i) => {
            const recuo = ((Number(i.nivel) || 1) - 1) * 16;
            return `<div class="flex justify-between gap-3 py-0.5" style="padding-left:${recuo}px"><span>${escapeHtml(i.item)}</span><span class="flex-shrink-0 tabular-nums">${escapeHtml(i.pagina || '')}</span></div>`;
        })
        .join('');
    return secaoHtml(
        `Itens do sumário (${itens.length})`,
        `<div data-sumario-itens class="text-sm text-gray-700 dark:text-slate-200">${linhas}</div>`,
    );
}

// `contexto.vinculo`: { livro, parte, secao } (de `resolverVinculoElemento`).
export function renderVisualizacaoElementoHtml(elemento, contexto = {}) {
    const el = elemento || {};
    const { livro = null, parte = null, secao = null } = contexto.vinculo || {};
    const ehIntroducao = el.tipo === 'Introdução';
    let html = '';

    // O src vem depois, de preencherCapas, que lê do IndexedDB.
    if (el.imagem) {
        html += `<img data-capa-id="${escapeHtml(String(el.imagem))}" src="" alt="${escapeHtml(el.titulo ? `Imagem de ${el.titulo}` : 'Imagem do elemento')}" class="max-h-72 w-auto max-w-full mx-auto object-contain rounded mb-5 opacity-0 transition-opacity duration-200">`;
    }

    html += linhaMetaHtml('Tipo', el.tipo);
    html += linhaMetaHtml('Livro', livro?.titulo || '');
    html += linhaMetaHtml('Parte', parte?.titulo || '');
    html += linhaMetaHtml('Seção', secao?.titulo || '');
    html += linhaMetaHtml('Sequência', el.sequencia != null ? String(el.sequencia) : '');

    const linkImagem = linkImagemHtml(el.imagemUrl);
    if (linkImagem) {
        html += `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">Imagem:</strong> ${linkImagem}</p>`;
    }

    html += fichaHtml(el);
    if (ehIntroducao) html += secaoHtml('Aviso de conteúdo', blocoNotasHtml(el.avisoConteudo));
    html += secaoHtml('Conteúdo', blocoTextoHtml(el.texto, 'font-serif'));
    if (ehIntroducao) {
        html += secaoHtml(
            'Versos pós-Introdução',
            blocoTextoHtml(el.versosPosIntroducao, 'font-serif'),
        );
    }
    html += sumarioHtml(el);
    html += secaoHtml('Notas de contexto', blocoNotasHtml(el.notas));
    return html;
}

// ─── Estado e navegação ──────────────────────────────────────

// O elemento aberto e a lista de navegação (congelada na abertura).
const estado = { atualId: null, nav: { ids: [], pos: -1 }, provedor: null };

// Função que roda uma vez quando o Ver fechar, pedida por `opcoes.retorno`. Fica
// guardada enquanto o Ver estiver no caminho (inclusive no desvio pelo Editar).
let retorno = null;

function dispararRetorno() {
    const fn = retorno;
    retorno = null;
    fn?.();
}

export function registrarListaNavegacaoElemento(fn) {
    estado.provedor = fn;
}

const existe = (id) => db.elementos.some((x) => String(x.id) === String(id));

function montarNavegacao(id, idsFixos) {
    estado.nav = { ids: [], pos: -1 };
    if (!estado.provedor && !idsFixos) return;
    let lista;
    try {
        lista = idsFixos || estado.provedor();
    } catch {
        return;
    }
    const pos = lista.findIndex((x) => String(x) === String(id));
    if (pos >= 0) estado.nav = { ids: lista, pos };
}

// Próxima posição da lista (no sentido de `delta`) cujo item ainda existe.
function proximoIndiceExistente(delta) {
    const { ids: lista, pos } = estado.nav;
    for (let i = pos + delta; i >= 0 && i < lista.length; i += delta) {
        if (existe(lista[i])) return i;
    }
    return -1;
}

function atualizarControlesNavegacao() {
    const wrap = document.getElementById(ID.nav);
    if (!wrap) return;
    const { nav } = estado;
    const ativo = nav.pos >= 0 && nav.ids.length > 1;
    wrap.classList.toggle('hidden', !ativo);
    if (!ativo) return;
    const posicao = document.getElementById(ID.posicao);
    if (posicao) {
        posicao.value = String(nav.pos + 1);
        posicao.max = String(nav.ids.length);
    }
    const total = document.getElementById(ID.total);
    if (total) total.textContent = `de ${nav.ids.length}`;
    const ant = document.getElementById(ID.anterior);
    const prox = document.getElementById(ID.proximo);
    if (ant) ant.disabled = proximoIndiceExistente(-1) < 0;
    if (prox) prox.disabled = proximoIndiceExistente(1) < 0;
}

function preencher(id) {
    const el = db.elementos.find((x) => String(x.id) === String(id));
    if (!el) return false;
    estado.atualId = el.id;

    const titulo = document.getElementById(ID.titulo);
    if (titulo) titulo.innerText = el.titulo || el.tipo || 'Elemento';

    const conteudo = document.getElementById(ID.conteudo);
    if (conteudo) {
        conteudo.innerHTML = renderVisualizacaoElementoHtml(el, {
            vinculo: resolverVinculoElemento(el),
        });
        conteudo.scrollTop = 0;
        // A imagem carrega do IndexedDB depois do HTML no DOM; falha ali não
        // pode derrubar a abertura do modal.
        if (conteudo.querySelector('img[data-capa-id]')) {
            Promise.resolve(preencherCapas(conteudo)).catch(() => {});
        }
    }
    return true;
}

// `opcoes.navegar` (padrão true): liga Anterior/Próximo, na ordem dos cards.
// `opcoes.ids`: reaproveita uma lista (volta do Editar).
// `opcoes.retorno`: função que roda quando este Ver fechar (X, Esc ou Excluir sem
// outro item). Sem `retorno`, uma abertura nova apaga um retorno antigo, exceto a
// volta do Editar (`opcoes.manterRetorno`), que reabre o mesmo Ver no meio do caminho.
export async function abrirVisualizacaoElemento(id, opcoes = {}) {
    if (!existe(id)) return;

    if (opcoes.retorno) retorno = opcoes.retorno;
    else if (!opcoes.manterRetorno) retorno = null;

    await garantirModal(MODAL);
    if (!preencher(id)) return;

    estado.nav = { ids: [], pos: -1 };
    if (opcoes.navegar !== false) montarNavegacao(id, opcoes.ids);
    atualizarControlesNavegacao();

    if (retorno) aoFecharModalUmaVez(MODAL, dispararRetorno);
    await toggleModal(MODAL);
}

// Botões Anterior (-1) e Próximo (+1). Pula itens que deixaram de existir; nas
// pontas da lista não faz nada (sem dar a volta).
export function navegarVisualizacaoElemento(delta) {
    if (estado.atualId == null || estado.nav.pos < 0) return;
    const alvo = proximoIndiceExistente(delta);
    if (alvo < 0) return;
    if (!preencher(estado.nav.ids[alvo])) return;
    estado.nav.pos = alvo;
    atualizarControlesNavegacao();
}

// Caixa de posição: vai direto ao item de número `n` (1 a N). Fora da faixa vai para
// a ponta mais próxima; se o destino não existe mais, vale o existente mais próximo.
export function irParaPosicaoVisualizacaoElemento(valor) {
    if (estado.atualId == null || estado.nav.pos < 0) return;
    const n = Math.round(Number(valor));
    if (!Number.isFinite(n) || valor === '' || valor == null) {
        atualizarControlesNavegacao();
        return;
    }
    const total = estado.nav.ids.length;
    const desejado = Math.min(Math.max(n, 1), total) - 1;
    const ok = (i) => existe(estado.nav.ids[i]);
    let alvo = -1;
    for (let d = 0; d < total && alvo < 0; d++) {
        if (desejado + d < total && ok(desejado + d)) alvo = desejado + d;
        else if (desejado - d >= 0 && ok(desejado - d)) alvo = desejado - d;
    }
    if (alvo < 0 || alvo === estado.nav.pos) {
        atualizarControlesNavegacao();
        return;
    }
    if (!preencher(estado.nav.ids[alvo])) return;
    estado.nav.pos = alvo;
    atualizarControlesNavegacao();
}

// Setas ← e → navegam com o modal aberto, desde que o foco não esteja num campo
// (caixa de posição) e não haja Ctrl/Alt/Meta/Shift.
document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) return;
    if (ev.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    const modal = document.getElementById(MODAL);
    if (!modal || modal.classList.contains('hidden')) return;
    if (document.getElementById(ID.nav)?.classList.contains('hidden')) return;
    ev.preventDefault();
    navegarVisualizacaoElemento(ev.key === 'ArrowLeft' ? -1 : 1);
});

// ─── Editar e Excluir ────────────────────────────────────────

// Combina "ao fechar o formulário de edição, reabrir o Ver deste elemento". Guarda o
// combinado em `voltaAoVer` enquanto vale (some quando o Ver reabre), para o olho
// do Editar saber se o formulário já veio do Ver.
let voltaAoVer = null;

function registrarVoltaAoVer(volta) {
    voltaAoVer = volta;
    aoFecharModalUmaVez(MODAL_EDICAO, () => {
        voltaAoVer = null;
        abrirVisualizacaoElemento(volta.id, {
            manterRetorno: true,
            ...(volta.ids ? { ids: volta.ids } : {}),
        });
    });
}

// Olho do cabeçalho do Editar elemento: troca o Editar pelo Ver do mesmo elemento
// (um modal só de cada vez, sem empilhar). O Ver só mostra o que está salvo, então
// com alterações pendentes pergunta antes: "Salvar e ver", "Descartar e ver" ou
// Cancelar (continua no Editar). Salvar já fecha o Editar; ao fechar, o Ver abre pelo
// mesmo combinado do botão Editar do Ver, então nunca abre duas vezes. Elemento novo
// (ainda sem id) não tem o que ver: o botão nem aparece.
export async function verDoModalEdicaoElemento() {
    const campo = document.getElementById('el-edit-id')?.value;
    if (!campo) return;
    const id = Number(campo);
    if (!existe(id)) return;

    // Formulário aberto pelo Ver: o combinado de voltar já existe (e leva a lista de
    // navegação); senão o olho cria um.
    const anterior = voltaAoVer && String(voltaAoVer.id) === String(id) ? voltaAoVer : null;
    const volta = anterior || { id, ids: null };
    const agendar = () => registrarVoltaAoVer(volta);

    if (!rastreadorElemento.estaSujo()) {
        agendar();
        await toggleModal(MODAL_EDICAO);
        return;
    }

    abrirModalConfirmacao({
        titulo: 'Salvar antes de ver?',
        rotulo: 'Alterações não salvas',
        mensagem:
            'A visualização mostra só o que já está salvo. Salve para ver as alterações, ou descarte-as.',
        textoConfirmar: 'Salvar e ver',
        corConfirmar: '#059669',
        focarConfirmar: true,
        acaoSecundaria: {
            texto: 'Descartar e ver',
            onClick: () => {
                agendar();
                rastreadorElemento.marcarLimpo();
                toggleModal(MODAL_EDICAO);
            },
        },
        onConfirmar: async () => {
            agendar();
            // Salvar é assíncrono (a imagem vai pro IndexedDB): espera o envio. Se o
            // navegador recusou antes (nenhum envio começou) ou o formulário recusou
            // (vínculo vazio, link da imagem inválido, ou segunda ficha cancelada no
            // aviso), o Editar continua aberto e o combinado é desfeito, para um X
            // depois não abrir o Ver sem ninguém pedir. Com o aviso da segunda ficha,
            // o envio espera a resposta: confirmada, salva e o Ver abre. Já salvo, o
            // formulário fechou e o Ver abre pelo combinado.
            zerarUltimoEnvioElemento();
            document.getElementById('form-elemento')?.requestSubmit();
            const envio = ultimoEnvioElemento();
            const salvou = envio ? await envio : false;
            if (!salvou && !anterior) {
                voltaAoVer = null;
                cancelarAoFecharModal(MODAL_EDICAO);
            }
        },
    });
}

// Botão "Editar" do rodapé: fecha o Ver e abre o formulário do mesmo elemento. Ao
// fechar o formulário (salvar, cancelar, X ou Esc), o Ver reabre na mesma lista.
export async function editarElementoDoVisualizador() {
    if (estado.atualId == null || !existe(estado.atualId)) return;
    const id = estado.atualId;
    const lista = estado.nav.pos >= 0 ? [...estado.nav.ids] : null;
    registrarVoltaAoVer({ id, ids: lista });
    // Se o Ver veio de outro Ver, a volta a ele espera: primeiro o Editar, depois
    // este Ver de novo, e só ao fechar este é que o outro reabre.
    cancelarAoFecharModal(MODAL);
    await toggleModal(MODAL);
    await editarElemento(id);
}

// Título de Elemento clicado na Estrutura do Livro, de Parte e Seção ou da aba
// Estrutura: abre o Ver dele, sem lista de navegação. `retorno` (opcional) roda ao
// fechar.
export async function abrirElementoDaEstrutura(id, retornoAoFechar = null) {
    if (!existe(id)) return;
    await abrirVisualizacaoElemento(Number(id), {
        navegar: false,
        ...(retornoAoFechar ? { retorno: retornoAoFechar } : {}),
    });
}

// Botão "Excluir" do rodapé: pede a confirmação de sempre (com "Desfazer" depois).
// Confirmada, o modal segue para o próximo item da lista (ou o anterior, se era o
// último); sem navegação ou sem outro item, fecha.
export function excluirElementoDoVisualizador() {
    if (estado.atualId == null) return;
    const id = estado.atualId;
    deleteItem('elementos', id, async () => {
        let destino = -1;
        if (estado.nav.pos >= 0) {
            const idx = estado.nav.pos;
            estado.nav.ids.splice(idx, 1);
            const ok = (i) => existe(estado.nav.ids[i]);
            for (let i = idx; i < estado.nav.ids.length && destino < 0; i++) {
                if (ok(i)) destino = i;
            }
            for (let i = idx - 1; i >= 0 && destino < 0; i--) {
                if (ok(i)) destino = i;
            }
        }
        if (destino < 0 || !preencher(estado.nav.ids[destino])) {
            estado.atualId = null;
            estado.nav = { ids: [], pos: -1 };
            await toggleModal(MODAL);
            return;
        }
        estado.nav.pos = destino;
        atualizarControlesNavegacao();
    });
}
