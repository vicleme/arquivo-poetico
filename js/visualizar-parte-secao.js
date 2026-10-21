// ============================================================
// visualizar-parte-secao.js: Modal de Visualização somente-leitura
// de Parte e de Seção (botão "Ver" do card em Partes e em Seções,
// ver renderPartes e renderSecoes em render-listas.js).
//
// Mesmo modelo do Ver do Livro (visualizar-livro.js), uma lógica só
// para os dois tipos: o card fica enxuto (imagem pequena, título,
// vínculo, posição) e aqui mora o resto: imagem em tamanho de
// leitura, Sobre, Abertura, descrição da imagem, link da imagem, a
// Estrutura recolhível do que a Parte ou a Seção contém (cada título
// de texto abre o Ver do texto e, ao fechar, volta para cá) e a
// contagem.
//
// Campos e seções vazios NÃO aparecem. Navegação igual à do Livro:
// Anterior e Próximo, caixa "[n] de N" e setas ← →, na ordem dos
// cards (main.js registra `getListaVisivelPartes` e
// `getListaVisivelSecoes`), tirada na abertura e congelada enquanto
// o modal estiver aberto.
//
// A parte pura (`renderVisualizacaoParteHtml`,
// `renderVisualizacaoSecaoHtml`, `textoContagemEstrutura`) só monta
// valores; a parte que escreve no DOM vem depois, para testar sem
// abrir modal.
//
// Olho do cabeçalho do Editar (`verDoModalEdicaoParteSecao`): troca o
// Editar pelo Ver do mesmo item, perguntando antes quando há alteração
// não salva (os formulários de Parte e Seção têm rastreador, como o do
// Livro). O título de Parte e de Seção na Estrutura (do Livro, da aba
// e destes Ver) também abre o Ver (`abrirParteSecaoDaEstrutura`).
// ============================================================

import {
    garantirModal,
    toggleModal,
    aoFecharModalUmaVez,
    cancelarAoFecharModal,
} from './modais.js';
import { db, deleteItem } from './db.js';
import {
    editarParte,
    editarSecao,
    rastreadorParte,
    rastreadorSecao,
    ultimoEnvioParteSecao,
    zerarUltimoEnvioParteSecao,
} from './forms.js';
import { preencherCapas } from './render-lightbox.js';
import { linkImagemHtml } from './imagem-link.js';
import { abrirVisualizacao } from './visualizar.js';
import { abrirVisualizacaoElemento } from './visualizar-elemento.js';
import { montarArvoreDaParte, montarArvoreDaSecao, contarNosDaArvore } from './estrutura-livro.js';
import {
    renderEstruturaLivroHtml,
    ligarEstruturaLivro,
    lerEstadoEstruturaLivro,
    aplicarEstadoEstruturaLivro,
} from './visualizar-livro.js';
import { escapeHtml, abrirModalConfirmacao } from './utils.js';

// ─── Parte pura ──────────────────────────────────────────────

function linhaMetaHtml(rotulo, valor) {
    if (valor == null || valor === '') return '';
    return `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">${escapeHtml(rotulo)}:</strong> ${escapeHtml(String(valor))}</p>`;
}

function secaoHtml(titulo, corpo) {
    if (!corpo) return '';
    return `<section class="mt-5"><h4 class="text-[11px] font-bold uppercase text-gray-500 dark:text-slate-400 mb-2 pb-1 border-b border-gray-100 dark:border-slate-700">${escapeHtml(titulo)}</h4>${corpo}</section>`;
}

function blocoTextoHtml(texto, classeExtra = '') {
    if (!texto || !String(texto).trim()) return '';
    return `<p class="text-sm text-gray-700 dark:text-slate-200 ${classeExtra}" style="white-space: pre-wrap">${escapeHtml(texto)}</p>`;
}

function pluralizar(n, singular, plural) {
    return `${n} ${n === 1 ? singular : plural}`;
}

// "Contém 2 seções, 5 poemas e 1 prosa." a partir da Estrutura ({ arvore, vinculados }).
export function textoContagemEstrutura(estrutura) {
    const c = contarNosDaArvore(estrutura || { arvore: [] });
    const partes = [];
    if (c.secoes) partes.push(pluralizar(c.secoes, 'seção', 'seções'));
    if (c.poemas) partes.push(pluralizar(c.poemas, 'poema', 'poemas'));
    if (c.prosas) partes.push(pluralizar(c.prosas, 'prosa', 'prosas'));
    if (c.elementos) partes.push(pluralizar(c.elementos, 'elemento', 'elementos'));
    if (!partes.length) return 'Ainda sem seções, textos nem elementos.';
    const ultimo = partes.pop();
    return `Contém ${partes.length ? `${partes.join(', ')} e ${ultimo}` : ultimo}.`;
}

// Imagem, link da imagem, Sobre, Abertura e descrição da imagem: iguais nos dois tipos.
function corpoComumHtml(item, rotuloTipo) {
    let html = '';
    if (item.capa) {
        html += `<img data-capa-id="${escapeHtml(String(item.capa))}" src="" alt="Capa de ${escapeHtml(item.titulo || rotuloTipo)}" class="max-h-72 w-auto max-w-full mx-auto object-contain rounded mb-5 opacity-0 transition-opacity duration-200">`;
    }
    return html;
}

function fimDoCorpoHtml(item, estrutura) {
    let html = '';
    const linkImagem = linkImagemHtml(item.imagemUrl);
    if (linkImagem) {
        html += `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">Imagem:</strong> ${linkImagem}</p>`;
    }
    html += secaoHtml('Sobre', blocoTextoHtml(item.sobre));
    html += secaoHtml('Abertura', blocoTextoHtml(item.abertura, 'font-serif'));
    html += secaoHtml('Descrição da capa', blocoTextoHtml(item.capaDesc));
    return html + estruturaEContagemHtml(estrutura);
}

function estruturaEContagemHtml(estrutura) {
    let html = renderEstruturaLivroHtml(estrutura);
    html += `<p class="text-[11px] font-mono text-gray-400 dark:text-slate-500 mt-6">${escapeHtml(textoContagemEstrutura(estrutura))}</p>`;
    return html;
}

// `contexto.livro`: o Livro da Parte. `contexto.estrutura`: de `montarArvoreDaParte`.
export function renderVisualizacaoParteHtml(parte, contexto = {}) {
    const p = parte || {};
    const { livro = null, estrutura = null } = contexto;
    let html = corpoComumHtml(p, 'parte');
    html += linhaMetaHtml('Livro', livro?.titulo || '');
    html += linhaMetaHtml('Sequência', p.sequencia != null ? String(p.sequencia) : '');
    html += fimDoCorpoHtml(p, estrutura);
    return html;
}

// `contexto.pai`: o Livro ou a Parte onde a Seção está. `contexto.livro`: o Livro
// dela (o do pai, quando o pai é uma Parte).
export function renderVisualizacaoSecaoHtml(secao, contexto = {}) {
    const s = secao || {};
    const { pai = null, livro = null, estrutura = null } = contexto;
    let html = corpoComumHtml(s, 'seção');
    if (s.paiTipo === 'parte') {
        html += linhaMetaHtml('Parte', pai?.titulo || '');
        html += linhaMetaHtml('Livro', livro?.titulo || '');
    } else {
        html += linhaMetaHtml('Livro', (pai || livro)?.titulo || '');
    }
    html += linhaMetaHtml('Posição', s.sequencia != null ? String(s.sequencia) : '');
    html += fimDoCorpoHtml(s, estrutura);
    return html;
}

// ─── Configuração por tipo ───────────────────────────────────

const TIPOS = {
    parte: {
        colecao: 'partes',
        rotulo: 'Parte',
        este: 'esta parte',
        modal: 'modal-visualizar-parte',
        modalEdicao: 'modal-parte',
        campoId: 'part-edit-id',
        form: 'form-parte',
        rastreador: rastreadorParte,
        editar: (id) => editarParte(id),
        arvore: (id) => montarArvoreDaParte(db, id),
        contexto(parte) {
            return { livro: db.livros.find((l) => String(l.id) === String(parte.livroId)) || null };
        },
        html: renderVisualizacaoParteHtml,
    },
    secao: {
        colecao: 'secoes',
        rotulo: 'Seção',
        este: 'esta seção',
        modal: 'modal-visualizar-secao',
        modalEdicao: 'modal-secao',
        campoId: 'sec-edit-id',
        form: 'form-secao',
        rastreador: rastreadorSecao,
        editar: (id) => editarSecao(id),
        arvore: (id) => montarArvoreDaSecao(db, id),
        contexto(secao) {
            const pai =
                secao.paiTipo === 'parte'
                    ? db.partes.find((p) => String(p.id) === String(secao.paiId))
                    : db.livros.find((l) => String(l.id) === String(secao.paiId));
            const livro =
                secao.paiTipo === 'parte'
                    ? db.livros.find((l) => String(l.id) === String(pai?.livroId))
                    : pai;
            return { pai: pai || null, livro: livro || null };
        },
        html: renderVisualizacaoSecaoHtml,
    },
};

const ids = (tipo) => ({
    titulo: `${TIPOS[tipo].modal}-titulo`,
    conteudo: `visualizar-${tipo}-conteudo`,
    nav: `visualizar-${tipo}-nav`,
    posicao: `visualizar-${tipo}-posicao`,
    total: `visualizar-${tipo}-total`,
    anterior: `visualizar-${tipo}-anterior`,
    proximo: `visualizar-${tipo}-proximo`,
});

// Estado por tipo: o item aberto e a lista de navegação (congelada na abertura).
const estado = {
    parte: { atualId: null, nav: { ids: [], pos: -1 }, provedor: null },
    secao: { atualId: null, nav: { ids: [], pos: -1 }, provedor: null },
};

// Função que roda uma vez quando o Ver fechar, pedida por `opcoes.retorno` (o Ver do
// Livro, ao clicar num título da Estrutura, ou outro Ver de Parte e Seção). Fica
// guardada enquanto o Ver estiver no caminho (inclusive no desvio pelo Editar e na
// descida a um texto, Parte ou Seção de dentro dele).
const retornos = { parte: null, secao: null };

function dispararRetorno(tipo) {
    const fn = retornos[tipo];
    retornos[tipo] = null;
    fn?.();
}

export function registrarListaNavegacaoParteSecao(tipo, fn) {
    estado[tipo].provedor = fn;
}

const existe = (tipo, id) => db[TIPOS[tipo].colecao].some((x) => String(x.id) === String(id));

function montarNavegacao(tipo, id, idsFixos) {
    const e = estado[tipo];
    e.nav = { ids: [], pos: -1 };
    if (!e.provedor && !idsFixos) return;
    let lista;
    try {
        lista = idsFixos || e.provedor();
    } catch {
        return;
    }
    const pos = lista.findIndex((x) => String(x) === String(id));
    if (pos >= 0) e.nav = { ids: lista, pos };
}

// Próxima posição da lista (no sentido de `delta`) cujo item ainda existe.
function proximoIndiceExistente(tipo, delta) {
    const { ids: lista, pos } = estado[tipo].nav;
    for (let i = pos + delta; i >= 0 && i < lista.length; i += delta) {
        if (existe(tipo, lista[i])) return i;
    }
    return -1;
}

function atualizarControlesNavegacao(tipo) {
    const el = ids(tipo);
    const wrap = document.getElementById(el.nav);
    if (!wrap) return;
    const { nav } = estado[tipo];
    const ativo = nav.pos >= 0 && nav.ids.length > 1;
    wrap.classList.toggle('hidden', !ativo);
    if (!ativo) return;
    const posicao = document.getElementById(el.posicao);
    if (posicao) {
        posicao.value = String(nav.pos + 1);
        posicao.max = String(nav.ids.length);
    }
    const total = document.getElementById(el.total);
    if (total) total.textContent = `de ${nav.ids.length}`;
    const ant = document.getElementById(el.anterior);
    const prox = document.getElementById(el.proximo);
    if (ant) ant.disabled = proximoIndiceExistente(tipo, -1) < 0;
    if (prox) prox.disabled = proximoIndiceExistente(tipo, 1) < 0;
}

function preencher(tipo, id) {
    const conf = TIPOS[tipo];
    const item = db[conf.colecao].find((x) => String(x.id) === String(id));
    if (!item) return false;
    estado[tipo].atualId = item.id;
    const el = ids(tipo);

    const titulo = document.getElementById(el.titulo);
    if (titulo) titulo.innerText = item.titulo || '(sem título)';

    const conteudo = document.getElementById(el.conteudo);
    if (conteudo) {
        conteudo.innerHTML = conf.html(item, {
            ...conf.contexto(item),
            estrutura: conf.arvore(item.id),
        });
        ligarEstruturaLivro(conteudo, (tipoTexto, idTexto) =>
            abrirTextoDaEstrutura(tipo, tipoTexto, idTexto),
        );
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
// `opcoes.ids`: reaproveita uma lista (volta do Editar ou de um Ver de texto).
// `opcoes.estrutura`: estado da Estrutura a restaurar (volta do Ver de um texto).
// `opcoes.retorno`: função que roda quando este Ver fechar (X, Esc ou Excluir sem
// outro item). Sem `retorno`, uma abertura nova apaga um retorno antigo, exceto a
// volta do Editar (`opcoes.manterRetorno`), que reabre o mesmo Ver no meio do caminho.
export async function abrirVisualizacaoParteSecao(tipo, id, opcoes = {}) {
    if (!TIPOS[tipo] || !existe(tipo, id)) return;
    const conf = TIPOS[tipo];

    if (opcoes.retorno) retornos[tipo] = opcoes.retorno;
    else if (!opcoes.manterRetorno) retornos[tipo] = null;

    await garantirModal(conf.modal);
    if (!preencher(tipo, id)) return;

    const conteudo = document.getElementById(ids(tipo).conteudo);
    aplicarEstadoEstruturaLivro(conteudo, opcoes.estrutura);

    estado[tipo].nav = { ids: [], pos: -1 };
    if (opcoes.navegar !== false) montarNavegacao(tipo, id, opcoes.ids);
    atualizarControlesNavegacao(tipo);

    if (retornos[tipo]) aoFecharModalUmaVez(conf.modal, () => dispararRetorno(tipo));
    await toggleModal(conf.modal);
    // A rolagem só vale com o modal visível.
    if (conteudo && opcoes.estrutura?.rolagem) conteudo.scrollTop = opcoes.estrutura.rolagem;
}

// Clique no título de um texto, Parte, Seção ou Elemento na Estrutura deste Ver: fecha este Ver
// (um modal só de cada vez) e abre o Ver do que foi clicado; ao fechá-lo, este Ver
// reabre na mesma lista e com a Estrutura como estava. O retorno que este Ver já
// tinha (por exemplo, voltar ao Ver do Livro) passa adiante e só roda ao fechar o
// último da cadeia. Item que não existe mais não faz nada.
export async function abrirTextoDaEstrutura(tipo, tipoAlvo, idAlvo) {
    const e = estado[tipo];
    if (e.atualId == null) return;
    const ehParteSecao = !!TIPOS[tipoAlvo];
    const colecao = ehParteSecao
        ? db[TIPOS[tipoAlvo].colecao]
        : tipoAlvo === 'elemento'
          ? db.elementos
          : tipoAlvo === 'prosa'
            ? db.prosas
            : db.poemas;
    if (!colecao.some((x) => String(x.id) === String(idAlvo))) return;

    const atual = e.atualId;
    const lista = e.nav.pos >= 0 ? [...e.nav.ids] : null;
    const estrutura = lerEstadoEstruturaLivro(document.getElementById(ids(tipo).conteudo));
    const retornoAnterior = retornos[tipo];
    const voltar = () =>
        abrirVisualizacaoParteSecao(tipo, atual, {
            ...(lista ? { ids: lista } : {}),
            estrutura,
            ...(retornoAnterior ? { retorno: retornoAnterior } : {}),
        });

    // Fechar este Ver não pode disparar o retorno dele: quem o recebe é a volta acima.
    cancelarAoFecharModal(TIPOS[tipo].modal);
    await toggleModal(TIPOS[tipo].modal);
    if (ehParteSecao) {
        await abrirVisualizacaoParteSecao(tipoAlvo, Number(idAlvo), {
            navegar: false,
            retorno: voltar,
        });
    } else if (tipoAlvo === 'elemento') {
        await abrirVisualizacaoElemento(Number(idAlvo), { navegar: false, retorno: voltar });
    } else {
        await abrirVisualizacao(tipoAlvo, Number(idAlvo), { retorno: voltar });
    }
}

// Título de Parte ou de Seção clicado na Estrutura do Livro ou da aba Estrutura: abre
// o Ver dele, sem lista de navegação. `retorno` (opcional) roda ao fechar.
export async function abrirParteSecaoDaEstrutura(tipo, id, retorno = null) {
    if (!TIPOS[tipo] || !existe(tipo, id)) return;
    await abrirVisualizacaoParteSecao(tipo, Number(id), {
        navegar: false,
        ...(retorno ? { retorno } : {}),
    });
}

// Botões Anterior (-1) e Próximo (+1). Pula itens que deixaram de existir; nas
// pontas da lista não faz nada (sem dar a volta).
export function navegarVisualizacaoParteSecao(tipo, delta) {
    const e = estado[tipo];
    if (!e || e.atualId == null || e.nav.pos < 0) return;
    const alvo = proximoIndiceExistente(tipo, delta);
    if (alvo < 0) return;
    if (!preencher(tipo, e.nav.ids[alvo])) return;
    e.nav.pos = alvo;
    atualizarControlesNavegacao(tipo);
}

// Caixa de posição: vai direto ao item de número `n` (1 a N). Fora da faixa vai para
// a ponta mais próxima; se o destino não existe mais, vale o existente mais próximo.
export function irParaPosicaoVisualizacaoParteSecao(tipo, valor) {
    const e = estado[tipo];
    if (!e || e.atualId == null || e.nav.pos < 0) return;
    const n = Math.round(Number(valor));
    if (!Number.isFinite(n) || valor === '' || valor == null) {
        atualizarControlesNavegacao(tipo);
        return;
    }
    const total = e.nav.ids.length;
    const desejado = Math.min(Math.max(n, 1), total) - 1;
    const ok = (i) => existe(tipo, e.nav.ids[i]);
    let alvo = -1;
    for (let d = 0; d < total && alvo < 0; d++) {
        if (desejado + d < total && ok(desejado + d)) alvo = desejado + d;
        else if (desejado - d >= 0 && ok(desejado - d)) alvo = desejado - d;
    }
    if (alvo < 0 || alvo === e.nav.pos) {
        atualizarControlesNavegacao(tipo);
        return;
    }
    if (!preencher(tipo, e.nav.ids[alvo])) return;
    e.nav.pos = alvo;
    atualizarControlesNavegacao(tipo);
}

// Setas ← e → navegam com o modal aberto, desde que o foco não esteja num campo
// (caixa de posição) e não haja Ctrl/Alt/Meta/Shift.
document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) return;
    if (ev.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    for (const tipo of Object.keys(TIPOS)) {
        const modal = document.getElementById(TIPOS[tipo].modal);
        if (!modal || modal.classList.contains('hidden')) continue;
        if (document.getElementById(ids(tipo).nav)?.classList.contains('hidden')) return;
        ev.preventDefault();
        navegarVisualizacaoParteSecao(tipo, ev.key === 'ArrowLeft' ? -1 : 1);
        return;
    }
});

// ─── Editar e Excluir ────────────────────────────────────────

// Combina "ao fechar o formulário de edição, reabrir o Ver deste item". Guarda o
// combinado em `voltaAoVer` enquanto vale (some quando o Ver reabre), para o olho
// do Editar saber se o formulário já veio do Ver.
const voltaAoVer = { parte: null, secao: null };

function registrarVoltaAoVer(tipo, volta) {
    voltaAoVer[tipo] = volta;
    aoFecharModalUmaVez(TIPOS[tipo].modalEdicao, () => {
        voltaAoVer[tipo] = null;
        abrirVisualizacaoParteSecao(tipo, volta.id, {
            manterRetorno: true,
            ...(volta.ids ? { ids: volta.ids } : {}),
        });
    });
}

// Olho do cabeçalho do Editar parte e Editar seção: troca o Editar pelo Ver do mesmo
// item (um modal só de cada vez, sem empilhar). O Ver só mostra o que está salvo,
// então com alterações pendentes pergunta antes: "Salvar e ver", "Descartar e ver"
// ou Cancelar (continua no Editar). Salvar já fecha o Editar; ao fechar, o Ver abre
// pelo mesmo combinado do botão Editar do Ver, então nunca abre duas vezes. Item
// novo (ainda sem id) não tem o que ver: o botão nem aparece.
export async function verDoModalEdicaoParteSecao(tipo) {
    const conf = TIPOS[tipo];
    if (!conf) return;
    const campo = document.getElementById(conf.campoId)?.value;
    if (!campo) return;
    const id = Number(campo);
    if (!existe(tipo, id)) return;

    // Formulário aberto pelo Ver: o combinado de voltar já existe (e leva a lista de
    // navegação); senão o olho cria um.
    const atual = voltaAoVer[tipo];
    const anterior = atual && String(atual.id) === String(id) ? atual : null;
    const volta = anterior || { id, ids: null };
    const agendar = () => registrarVoltaAoVer(tipo, volta);

    if (!conf.rastreador.estaSujo()) {
        agendar();
        await toggleModal(conf.modalEdicao);
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
                conf.rastreador.marcarLimpo();
                toggleModal(conf.modalEdicao);
            },
        },
        onConfirmar: async () => {
            agendar();
            // Salvar é assíncrono (a imagem vai pro IndexedDB): espera o envio. Se o
            // navegador recusou antes (título vazio, nenhum envio começou) ou o
            // formulário recusou (vínculo vazio, link da imagem inválido), o Editar
            // continua aberto e o combinado é desfeito, para um X depois não abrir o
            // Ver sem ninguém pedir. Já salvo, o formulário fechou e o Ver abre pelo
            // combinado.
            zerarUltimoEnvioParteSecao(tipo);
            document.getElementById(conf.form)?.requestSubmit();
            const envio = ultimoEnvioParteSecao(tipo);
            const salvou = envio ? await envio : false;
            if (!salvou && !anterior) {
                voltaAoVer[tipo] = null;
                cancelarAoFecharModal(conf.modalEdicao);
            }
        },
    });
}

// Botão "Editar" do rodapé: fecha o Ver e abre o formulário do mesmo item. Ao
// fechar o formulário (salvar, cancelar, X ou Esc), o Ver reabre na mesma lista.
export async function editarParteSecaoDoVisualizador(tipo) {
    const e = estado[tipo];
    if (!e || e.atualId == null || !existe(tipo, e.atualId)) return;
    const conf = TIPOS[tipo];
    const id = e.atualId;
    const lista = e.nav.pos >= 0 ? [...e.nav.ids] : null;
    registrarVoltaAoVer(tipo, { id, ids: lista });
    // Se o Ver veio de outro Ver (o do Livro, por exemplo), a volta a ele espera:
    // primeiro o Editar, depois este Ver de novo, e só ao fechar este é que o outro
    // reabre.
    cancelarAoFecharModal(conf.modal);
    await toggleModal(conf.modal);
    await conf.editar(id);
}

// Botão "Excluir" do rodapé: pede a confirmação de sempre (com "Desfazer" depois).
// Confirmada, o modal segue para o próximo item da lista (ou o anterior, se era o
// último); sem navegação ou sem outro item, fecha.
export function excluirParteSecaoDoVisualizador(tipo) {
    const e = estado[tipo];
    if (!e || e.atualId == null) return;
    const conf = TIPOS[tipo];
    const id = e.atualId;
    deleteItem(conf.colecao, id, async () => {
        let destino = -1;
        if (e.nav.pos >= 0) {
            const idx = e.nav.pos;
            e.nav.ids.splice(idx, 1);
            const ok = (i) => existe(tipo, e.nav.ids[i]);
            for (let i = idx; i < e.nav.ids.length && destino < 0; i++) {
                if (ok(i)) destino = i;
            }
            for (let i = idx - 1; i >= 0 && destino < 0; i--) {
                if (ok(i)) destino = i;
            }
        }
        if (destino < 0 || !preencher(tipo, e.nav.ids[destino])) {
            e.atualId = null;
            e.nav = { ids: [], pos: -1 };
            await toggleModal(conf.modal);
            return;
        }
        e.nav.pos = destino;
        atualizarControlesNavegacao(tipo);
    });
}
