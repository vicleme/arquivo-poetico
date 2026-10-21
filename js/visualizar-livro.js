// ============================================================
// visualizar-livro.js — Modal de Visualização somente-leitura do
// Livro (botão "Ver" do card em Livros, ver renderLivros em
// render-listas.js, e o olho do cabeçalho do modal de edição).
//
// O card da lista é enxuto de propósito (capa pequena, título,
// siglas, ISBN, lojas e links). Aqui mora o livro inteiro: capa em
// tamanho de leitura, Abertura, Sinopse, Descrição da capa, Orelhas,
// Contracapa, situação editorial e os links, mais a contagem do que
// o livro contém.
//
// Campos vazios e seções vazias NÃO aparecem (nada de "—" em toda
// linha): a maioria dos livros tem poucos campos preenchidos.
//
// Navegação igual à do Ver de Poema e Prosa (visualizar.js): botões
// Anterior e Próximo, caixa "[n] de N" e setas ← →. A lista é a dos
// cards, na mesma ordem (main.js registra `getListaVisivelLivros`),
// tirada na abertura e congelada enquanto o modal estiver aberto.
//
// Mesmo padrão de visualizar-autor.js: a parte pura
// (`renderVisualizacaoLivroHtml`, `contarConteudoDoLivro`, só montam
// valores) é separada da parte que escreve no DOM, pra poder ser
// testada sem abrir modal.
// ============================================================

import {
    garantirModal,
    toggleModal,
    aoFecharModalUmaVez,
    cancelarAoFecharModal,
} from './modais.js';
import { db, deleteItem, calcularCascataColetanea } from './db.js';
import { editarLivro, rastreadorLivro, ultimoEnvioLivro, zerarUltimoEnvioLivro } from './forms.js';
import { preencherCapas } from './render-lightbox.js';
import { linkImagemExibivel } from './imagem-link.js';
import { abrirVisualizacao } from './visualizar.js';
import { abrirParteSecaoDaEstrutura } from './visualizar-parte-secao.js';
import { abrirElementoDaEstrutura } from './visualizar-elemento.js';
import { montarArvoreDoLivro, contarNosDaArvore } from './estrutura-livro.js';
import {
    escapeHtml,
    abrirModalConfirmacao,
    formatarDataParcial,
    htmlSeloSituacaoEditorial,
    livroForaDeCirculacao,
    rotuloSituacaoEditorial,
} from './utils.js';

// ─── Parte pura ──────────────────────────────────────────────

function linhaMetaHtml(rotulo, valor) {
    if (!valor) return '';
    return `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">${escapeHtml(rotulo)}:</strong> ${escapeHtml(valor)}</p>`;
}

function secaoHtml(titulo, corpo) {
    if (!corpo) return '';
    return `<section class="mt-5"><h4 class="text-[11px] font-bold uppercase text-gray-500 dark:text-slate-400 mb-2 pb-1 border-b border-gray-100 dark:border-slate-700">${escapeHtml(titulo)}</h4>${corpo}</section>`;
}

// Texto longo (Abertura, Sinopse etc.): quebras de linha preservadas.
function blocoTextoHtml(texto, classeExtra = '') {
    if (!texto || !String(texto).trim()) return '';
    return `<p class="text-sm text-gray-700 dark:text-slate-200 ${classeExtra}" style="white-space: pre-wrap">${escapeHtml(texto)}</p>`;
}

// Só http(s) vira link clicável; qualquer outra coisa (inclusive
// `javascript:`) aparece como texto puro.
function ehLinkWeb(url) {
    return /^https?:\/\//i.test(String(url || '').trim());
}

function linkHtml(url, rotulo) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (!ehLinkWeb(u)) return escapeHtml(rotulo || u);
    return `<a href="${escapeHtml(u)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline break-all">${escapeHtml(rotulo || u)}</a>`;
}

// Data do livro: objeto parcial {dia?, mes?, ano?} ou, em livro antigo,
// texto solto (a lista de cards trata os dois, ver renderLivros).
export function textoDataDoLivro(d) {
    if (!d) return '';
    if (typeof d === 'string') return d.trim();
    const t = formatarDataParcial(d);
    return t === '—' ? '' : t;
}

// O que o livro contém, só contagem (a lista dos textos fica nas abas
// Poemas e Prosas, com o filtro por livro). Estrutura: Partes do livro,
// Seções ligadas ao livro ou a uma de suas Partes, e os textos presos a
// qualquer um desses três pontos, mais os vinculados por `livrosIds`
// (um texto conta uma vez só). Coletânea não guarda textos: guarda
// Partes e itens (`calcularCascataColetanea`).
export function contarConteudoDoLivro(dbRef, livroId) {
    const id = String(livroId);
    const livro = (dbRef.livros || []).find((l) => String(l.id) === id);
    const partes = (dbRef.partes || []).filter((p) => String(p.livroId) === id);
    const partesIds = new Set(partes.map((p) => String(p.id)));

    if (livro?.tipo === 'Coletânea') {
        const { itensIds } = calcularCascataColetanea(dbRef, livroId);
        return { coletanea: true, partes: partes.length, itens: itensIds.length };
    }

    const secoes = (dbRef.secoes || []).filter(
        (s) =>
            (s.paiTipo === 'livro' && String(s.paiId) === id) ||
            (s.paiTipo === 'parte' && partesIds.has(String(s.paiId))),
    );
    const secoesIds = new Set(secoes.map((s) => String(s.id)));

    const doLivro = (t) =>
        (t.paiTipo === 'livro' && String(t.paiId) === id) ||
        (t.paiTipo === 'parte' && partesIds.has(String(t.paiId))) ||
        (t.paiTipo === 'secao' && secoesIds.has(String(t.paiId))) ||
        (Array.isArray(t.livrosIds) && t.livrosIds.some((x) => String(x) === id));

    return {
        coletanea: false,
        partes: partes.length,
        secoes: secoes.length,
        poemas: (dbRef.poemas || []).filter(doLivro).length,
        prosas: (dbRef.prosas || []).filter(doLivro).length,
    };
}

function pluralizar(n, singular, plural) {
    return `${n} ${n === 1 ? singular : plural}`;
}

function textoContagem(c) {
    if (!c) return '';
    const partes = [];
    if (c.coletanea) {
        if (c.partes) partes.push(pluralizar(c.partes, 'parte', 'partes'));
        if (c.itens) partes.push(pluralizar(c.itens, 'item', 'itens'));
        return partes.length ? `Contém ${partes.join(' e ')}.` : 'Ainda sem partes nem itens.';
    }
    if (c.partes) partes.push(pluralizar(c.partes, 'parte', 'partes'));
    if (c.secoes) partes.push(pluralizar(c.secoes, 'seção', 'seções'));
    if (c.poemas) partes.push(pluralizar(c.poemas, 'poema', 'poemas'));
    if (c.prosas) partes.push(pluralizar(c.prosas, 'prosa', 'prosas'));
    if (!partes.length) return 'Ainda sem partes, seções nem textos.';
    const ultimo = partes.pop();
    return `Contém ${partes.length ? `${partes.join(', ')} e ${ultimo}` : ultimo}.`;
}

// ── Estrutura (seção recolhível no fim do Ver) ───────────────
// Árvore de estrutura-livro.js (a mesma ordem da aba Estrutura). Abre fechada, e
// Partes e Seções também abrem fechadas: livro grande tem muita coisa. Os botões
// "Expandir tudo" e "Recolher tudo" são ligados por `ligarEstruturaLivro`, sem
// handler inline.
const ICONE_NO = { parte: '📂', secao: '📁', poema: '📝', prosa: '📄', elemento: '🧩', item: '📝' };

function tituloDoNo(no) {
    const d = no.dados || {};
    if (no.tipo === 'elemento') {
        const rotulo = d.tipo || 'Elemento';
        return d.titulo ? `${rotulo}: ${d.titulo}` : rotulo;
    }
    return d.titulo || '(sem título)';
}

function rotuloTipoDoNo(no) {
    if (no.tipo === 'item') return no.dados.refId ? no.dados.refTipo || '?' : 'inédito';
    return no.tipo;
}

// Poema, Prosa, Parte, Seção e Elemento abrem o Ver ao clicar no título. Item de
// Coletânea também, quando aponta para um poema ou uma prosa do acervo (a existência
// é conferida no clique); item inédito não tem Ver.
function textoAbrivelDoNo(no) {
    if (no.tipo === 'parte' || no.tipo === 'secao' || no.tipo === 'elemento') {
        return { tipo: no.tipo, id: no.dados?.id };
    }
    if (no.tipo === 'poema' || no.tipo === 'prosa') return { tipo: no.tipo, id: no.dados?.id };
    if (no.tipo === 'item' && no.dados?.refId && ['poema', 'prosa'].includes(no.dados.refTipo)) {
        return { tipo: no.dados.refTipo, id: no.dados.refId };
    }
    return null;
}

function tituloDoNoHtml(no) {
    const classe = no.tipo === 'parte' ? 'font-bold' : '';
    const alvo = textoAbrivelDoNo(no);
    const texto = escapeHtml(tituloDoNo(no));
    if (!alvo || alvo.id == null) return `<span class="${classe}">${texto}</span>`;
    return `<span class="${classe} cursor-pointer hover:underline" data-estrutura-ver data-tipo="${alvo.tipo}" data-id="${escapeHtml(String(alvo.id))}" title="${no.tipo === 'parte' ? 'Abrir o Ver desta parte' : no.tipo === 'secao' ? 'Abrir o Ver desta seção' : no.tipo === 'elemento' ? 'Abrir o Ver deste elemento' : 'Abrir o Ver deste texto'}">${texto}</span>`;
}

function noEstruturaHtml(no, nivel) {
    const d = no.dados || {};
    const seq = d.sequencia != null && d.sequencia !== '' ? d.sequencia : '—';
    const recuo = `margin-left:${nivel * 16}px`;
    const linha = `<span class="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded w-8 text-center inline-block">${escapeHtml(String(seq))}</span>
        <span>${ICONE_NO[no.tipo] || '•'}</span>
        ${tituloDoNoHtml(no)}
        <span class="text-[9px] uppercase text-gray-300 dark:text-slate-600 ml-1">${escapeHtml(rotuloTipoDoNo(no))}</span>`;
    if (no.filhos) {
        const n = no.filhos.length;
        const corpo = no.filhos.length
            ? no.filhos.map((f) => noEstruturaHtml(f, nivel + 1)).join('')
            : '<p class="text-[10px] text-gray-300 dark:text-slate-600 italic pl-8 pb-1">(vazio)</p>';
        return `<details data-estrutura-no data-estrutura-chave="${no.tipo}-${escapeHtml(String(d.id))}" data-tipo="${no.tipo}" style="${recuo}" class="border-b border-gray-50 dark:border-slate-800">
            <summary class="py-1.5 flex items-center gap-2 text-sm cursor-pointer list-none">${linha}<span class="text-[10px] text-gray-400 dark:text-slate-500 ml-auto">${pluralizar(n, 'item', 'itens')}</span></summary>
            <div>${corpo}</div>
        </details>`;
    }
    return `<div data-estrutura-folha data-tipo="${no.tipo}" style="${recuo}" class="py-1.5 flex items-center gap-2 text-sm border-b border-gray-50 dark:border-slate-800">${linha}</div>${detalhesDoElementoHtml(no, nivel)}`;
}

// Dados próprios de dois tipos de Elemento, logo abaixo da linha dele na Estrutura:
// a Ficha catalográfica (CDD, controle, bibliotecário) e o Sumário (a lista de itens,
// recolhida, com recuo por nível). Os outros tipos não têm nada a mais.
function detalhesDoElementoHtml(no, nivel) {
    if (no.tipo !== 'elemento') return '';
    const d = no.dados || {};
    const recuo = `margin-left:${(nivel + 1) * 16}px`;
    if (d.tipo === 'Ficha catalográfica') {
        const linhas = [
            ['CDD', d.fichaCdd],
            ['Controle', d.fichaNumeroControle],
            ['Bibliotecário(a)', [d.fichaBibliotecario, d.fichaCrb].filter(Boolean).join(', ')],
        ].filter(([, v]) => v);
        if (!linhas.length) return '';
        return `<div data-estrutura-detalhe-ficha style="${recuo}" class="text-[11px] text-gray-600 dark:text-slate-300 py-1 border-b border-gray-50 dark:border-slate-800">${linhas
            .map(([r, v]) => `<div><strong>${r}:</strong> ${escapeHtml(v)}</div>`)
            .join('')}</div>`;
    }
    if (d.tipo === 'Sumário') {
        const itens = Array.isArray(d.itensSumario) ? d.itensSumario : [];
        if (!itens.length) return '';
        const corpo = itens
            .map((i) => {
                const pad = ((Number(i.nivel) || 1) - 1) * 12;
                return `<div class="flex justify-between gap-2" style="padding-left:${pad}px"><span>${escapeHtml(i.item)}</span><span class="flex-shrink-0">${escapeHtml(i.pagina || '')}</span></div>`;
            })
            .join('');
        return `<details data-estrutura-no data-estrutura-chave="sumario-${escapeHtml(String(d.id))}" data-tipo="sumario" style="${recuo}" class="border-b border-gray-50 dark:border-slate-800">
            <summary class="py-1 text-[11px] cursor-pointer text-gray-500 dark:text-slate-400">Itens do sumário (${itens.length})</summary>
            <div class="text-[11px] text-gray-600 dark:text-slate-300 pb-1 space-y-0.5">${corpo}</div>
        </details>`;
    }
    return '';
}

function resumoEstruturaTexto(c) {
    const p = [];
    if (c.partes) p.push(pluralizar(c.partes, 'parte', 'partes'));
    if (c.secoes) p.push(pluralizar(c.secoes, 'seção', 'seções'));
    if (c.poemas) p.push(pluralizar(c.poemas, 'poema', 'poemas'));
    if (c.prosas) p.push(pluralizar(c.prosas, 'prosa', 'prosas'));
    if (c.elementos) p.push(pluralizar(c.elementos, 'elemento', 'elementos'));
    if (c.itens) p.push(pluralizar(c.itens, 'item', 'itens'));
    return p.join(', ');
}

// Recebe { arvore, vinculados } (de `montarArvoreDoLivro`). Sem nada, devolve ''.
export function renderEstruturaLivroHtml(estrutura) {
    const { arvore = [], vinculados = [] } = estrutura || {};
    if (!arvore.length && !vinculados.length) return '';
    const resumo = resumoEstruturaTexto(contarNosDaArvore({ arvore, vinculados }));
    const arvoreHtml = arvore.map((n) => noEstruturaHtml(n, 0)).join('');
    const vinculadosHtml = vinculados.length
        ? `<details data-estrutura-no data-estrutura-chave="vinculados" data-estrutura-vinculados class="mt-2 border-b border-gray-50 dark:border-slate-800">
            <summary class="py-1.5 flex items-center gap-2 text-sm cursor-pointer list-none"><span class="font-semibold">Vinculados, sem posição</span><span class="text-[10px] text-gray-400 dark:text-slate-500 ml-auto">${pluralizar(vinculados.length, 'item', 'itens')}</span></summary>
            <div>${vinculados.map((n) => noEstruturaHtml(n, 1)).join('')}</div>
        </details>`
        : '';
    return `<details data-estrutura-livro class="mt-5">
        <summary class="cursor-pointer text-[11px] font-bold uppercase text-gray-500 dark:text-slate-400 pb-1 border-b border-gray-100 dark:border-slate-700">Estrutura <span class="font-normal normal-case text-gray-400 dark:text-slate-500">(${escapeHtml(resumo)})</span></summary>
        <div class="flex gap-3 text-[11px] my-2">
            <button type="button" data-estrutura-acao="expandir" class="text-blue-600 dark:text-blue-400 underline">Expandir tudo</button>
            <button type="button" data-estrutura-acao="recolher" class="text-blue-600 dark:text-blue-400 underline">Recolher tudo</button>
        </div>
        <div data-estrutura-arvore>${arvoreHtml}${vinculadosHtml}</div>
    </details>`;
}

// Liga os botões "Expandir tudo" e "Recolher tudo" da seção Estrutura e o clique
// no título de cada texto (abre o Ver do texto; ao fechar, o livro volta).
// `aoAbrirTexto(tipo, id)` (padrão: o Ver do livro) deixa o Ver de Parte e de Seção
// reaproveitarem a Estrutura com a volta deles.
export function ligarEstruturaLivro(raiz, aoAbrirTexto = abrirTextoDaEstruturaLivro) {
    raiz?.querySelectorAll('[data-estrutura-acao]').forEach((botao) => {
        botao.addEventListener('click', () => {
            const abrir = botao.dataset.estruturaAcao === 'expandir';
            raiz.querySelectorAll('details[data-estrutura-no]').forEach((det) => {
                det.open = abrir;
            });
        });
    });
    raiz?.querySelectorAll('[data-estrutura-ver]').forEach((titulo) => {
        titulo.addEventListener('click', (e) => {
            // O título de uma Parte ou Seção fica dentro do <summary>; o de um texto
            // não, mas o clique nunca deve abrir ou fechar um <details> ao redor.
            e.preventDefault();
            e.stopPropagation();
            aoAbrirTexto(titulo.dataset.tipo, titulo.dataset.id);
        });
    });
}

// O que a pessoa tinha aberto na Estrutura (a seção, cada Parte e Seção, o grupo de
// vinculados) e a rolagem do modal, para a volta do Ver do texto deixar tudo como estava.
export function lerEstadoEstruturaLivro(conteudo) {
    const secao = conteudo?.querySelector('details[data-estrutura-livro]');
    if (!secao) return null;
    return {
        aberta: secao.open,
        nos: [...conteudo.querySelectorAll('details[data-estrutura-no][data-estrutura-chave]')]
            .filter((det) => det.open)
            .map((det) => det.dataset.estruturaChave),
        rolagem: conteudo.scrollTop,
    };
}

// Reabre o que estava aberto. Nó que deixou de existir (o texto mudou de lugar no
// Editar) é ignorado: sem chave achada, nada acontece.
export function aplicarEstadoEstruturaLivro(conteudo, estado) {
    if (!conteudo || !estado) return;
    const secao = conteudo.querySelector('details[data-estrutura-livro]');
    if (!secao) return;
    secao.open = !!estado.aberta;
    const abertos = new Set(estado.nos || []);
    conteudo.querySelectorAll('details[data-estrutura-no][data-estrutura-chave]').forEach((det) => {
        det.open = abertos.has(det.dataset.estruturaChave);
    });
}

// Recebe o Livro, a contagem (de `contarConteudoDoLivro`) e a estrutura (de
// `montarArvoreDoLivro`), devolve HTML.
export function renderVisualizacaoLivroHtml(livro, contagem = null, estrutura = null) {
    const l = livro || {};
    let html = '';

    // ── Capa (o src vem depois, de preencherCapas, que lê do IndexedDB)
    if (l.capa) {
        html += `<img data-capa-id="${escapeHtml(String(l.capa))}" src="" alt="Capa de ${escapeHtml(l.titulo || 'livro')}" class="max-h-72 w-auto max-w-full mx-auto object-contain rounded mb-5 opacity-0 transition-opacity duration-200">`;
    }

    // ── Cabeçalho (sem título de seção)
    html += linhaMetaHtml('Tipo', l.tipo);
    html += linhaMetaHtml('Fase', l.fase);
    html += linhaMetaHtml('Sequência', l.sequencia != null ? String(l.sequencia) : '');
    html += linhaMetaHtml('Sigla oficial', l.siglaOficial);
    html += linhaMetaHtml('Sigla pessoal', l.siglaPessoal);
    html += linhaMetaHtml('Primeira publicação', textoDataDoLivro(l.data));
    html += linhaMetaHtml('Última edição', textoDataDoLivro(l.dataUltimaEdicao));
    html += linhaMetaHtml('ISBN-13', l.isbn13);
    html += linhaMetaHtml('ISBN-10', l.isbn10);

    // ── Situação editorial (selo + nota). "Não especificado" não aparece.
    const selo = htmlSeloSituacaoEditorial(l);
    if (selo) {
        html += `<div class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300 mr-1">Situação editorial:</strong>${selo}</div>`;
        if (l.situacaoNota && String(l.situacaoNota).trim()) {
            html += blocoTextoHtml(l.situacaoNota, 'italic text-xs mb-1.5');
        }
    }

    // ── Texto do livro
    html += secaoHtml('Abertura', blocoTextoHtml(l.abertura, 'font-serif'));
    html += secaoHtml('Sinopse', blocoTextoHtml(l.sinopse));
    html += secaoHtml(
        'Capa',
        linhaMetaHtml('Frase da capa', l.fraseCapa) +
            (l.capaDesc && String(l.capaDesc).trim()
                ? `<p class="mb-1 text-[11px] font-semibold text-gray-600 dark:text-slate-300">Descrição</p>${blocoTextoHtml(l.capaDesc)}`
                : ''),
    );
    html += secaoHtml('Orelha 1', blocoTextoHtml(l.orelha1));
    html += secaoHtml('Orelha 2', blocoTextoHtml(l.orelha2));
    html += secaoHtml('Contracapa', blocoTextoHtml(l.contracapa));

    // ── Onde comprar (lojas) — com o mesmo aviso do card quando o livro
    // está esgotado, fora de catálogo ou reeditado.
    const lojas = (Array.isArray(l.lojas) ? l.lojas : []).filter((x) => x && x.url);
    if (lojas.length) {
        const itens = lojas
            .map((x) => `<li class="mb-1">🛒 ${linkHtml(x.url, x.nome || 'Comprar')}</li>`)
            .join('');
        const aviso = livroForaDeCirculacao(l)
            ? `<p data-aviso-lojas-fora-de-circulacao class="text-[11px] text-amber-700 dark:text-amber-300 mt-1">⚠️ ${escapeHtml(rotuloSituacaoEditorial(l.situacaoEditorial))}: confira se os links de compra ainda funcionam.</p>`
            : '';
        html += secaoHtml(
            'Onde comprar',
            `<ul class="text-sm list-none p-0">${itens}</ul>${aviso}`,
        );
    }

    // ── Arquivos e documentos (links)
    const links = [
        ['Imagem da capa (original)', linkImagemExibivel(l.imagemUrl)],
        ['PDF', l.pdfUrl],
        ['Epub', l.epubUrl],
        ['Código de barras', l.codigoBarrasUrl],
        ['Ficha catalográfica', l.fichaCatalograficaUrl],
        ['Certificado de direito autoral', l.certificadoDireitoAutoralUrl],
        ['Carta de exclusividade', l.cartaExclusividadeUrl],
    ].filter(([, url]) => url && String(url).trim());
    if (links.length) {
        html += secaoHtml(
            'Arquivos e documentos',
            `<ul class="text-sm list-none p-0">${links
                .map(([rotulo, url]) => `<li class="mb-1">${linkHtml(url, rotulo)}</li>`)
                .join('')}</ul>`,
        );
    }

    if (!html || html.replace(/<img[^>]*>/, '') === '') {
        html +=
            '<p class="text-sm text-gray-400 dark:text-slate-500">Nenhum dado cadastrado para este livro.</p>';
    }

    // ── Estrutura (recolhível, no fim, antes da contagem)
    html += renderEstruturaLivroHtml(estrutura);

    // ── Contagem do que o livro contém
    const contagemTexto = textoContagem(contagem);
    if (contagemTexto) {
        html += `<p class="text-[11px] font-mono text-gray-400 dark:text-slate-500 mt-6">${escapeHtml(contagemTexto)}</p>`;
    }

    return html;
}

// ─── Navegação Anterior/Próximo ──────────────────────────────
// A lista vem de fora (main.js registra a função que devolve os ids na ordem
// dos cards), pra este módulo não depender de render-listas.js. Tirada uma
// vez na abertura e congelada enquanto o modal estiver aberto.
let provedorNavegacao = null;
let navegacao = { ids: [], pos: -1 };
let livroAtualId = null;

export function registrarListaNavegacaoLivros(fn) {
    provedorNavegacao = fn;
}

const livroExiste = (id) => db.livros.some((l) => String(l.id) === String(id));

function montarNavegacao(id, idsFixos) {
    navegacao = { ids: [], pos: -1 };
    if (!provedorNavegacao && !idsFixos) return;
    let ids;
    try {
        ids = idsFixos || provedorNavegacao();
    } catch {
        return;
    }
    const pos = ids.findIndex((x) => String(x) === String(id));
    if (pos >= 0) navegacao = { ids, pos };
}

// Próxima posição da lista (no sentido de `delta`) cujo livro ainda existe.
function proximoIndiceExistente(delta) {
    const { ids, pos } = navegacao;
    for (let i = pos + delta; i >= 0 && i < ids.length; i += delta) {
        if (livroExiste(ids[i])) return i;
    }
    return -1;
}

function atualizarControlesNavegacao() {
    const wrap = document.getElementById('visualizar-livro-nav');
    if (!wrap) return;
    const ativo = navegacao.pos >= 0 && navegacao.ids.length > 1;
    wrap.classList.toggle('hidden', !ativo);
    if (!ativo) return;
    const posicao = document.getElementById('visualizar-livro-posicao');
    if (posicao) {
        posicao.value = String(navegacao.pos + 1);
        posicao.max = String(navegacao.ids.length);
    }
    const total = document.getElementById('visualizar-livro-total');
    if (total) total.textContent = `de ${navegacao.ids.length}`;
    const ant = document.getElementById('visualizar-livro-anterior');
    const prox = document.getElementById('visualizar-livro-proximo');
    if (ant) ant.disabled = proximoIndiceExistente(-1) < 0;
    if (prox) prox.disabled = proximoIndiceExistente(1) < 0;
}

function preencherVisualizacaoLivro(id) {
    const livro = db.livros.find((l) => String(l.id) === String(id));
    if (!livro) return false;
    livroAtualId = livro.id;

    const titulo = document.getElementById('modal-visualizar-livro-titulo');
    if (titulo) titulo.innerText = livro.titulo || '(sem título)';

    const conteudo = document.getElementById('visualizar-livro-conteudo');
    if (conteudo) {
        conteudo.innerHTML = renderVisualizacaoLivroHtml(
            livro,
            contarConteudoDoLivro(db, livro.id),
            montarArvoreDoLivro(db, livro.id),
        );
        ligarEstruturaLivro(conteudo);
        conteudo.scrollTop = 0;
        // A capa carrega do IndexedDB depois do HTML no DOM; falha ali não
        // pode derrubar a abertura do modal.
        if (conteudo.querySelector('img[data-capa-id]')) {
            Promise.resolve(preencherCapas(conteudo)).catch(() => {});
        }
    }
    return true;
}

// `opcoes.navegar` (padrão true): liga Anterior/Próximo, na ordem dos cards.
// `opcoes.ids`: reaproveita uma lista (volta do Editar, que reabre o Ver na
// mesma lista que a pessoa vinha percorrendo).
// `opcoes.estrutura`: estado da Estrutura (de `lerEstadoEstruturaLivro`) a restaurar,
// usado na volta do Ver de um texto aberto a partir dela.
export async function abrirVisualizacaoLivro(id, opcoes = {}) {
    if (!livroExiste(id)) return;

    await garantirModal('modal-visualizar-livro');
    if (!preencherVisualizacaoLivro(id)) return;

    const conteudo = document.getElementById('visualizar-livro-conteudo');
    aplicarEstadoEstruturaLivro(conteudo, opcoes.estrutura);

    navegacao = { ids: [], pos: -1 };
    if (opcoes.navegar !== false) montarNavegacao(id, opcoes.ids);
    atualizarControlesNavegacao();

    await toggleModal('modal-visualizar-livro');
    // A rolagem só vale com o modal visível.
    if (conteudo && opcoes.estrutura?.rolagem) conteudo.scrollTop = opcoes.estrutura.rolagem;
}

// Clique no título de um texto na Estrutura: fecha o Ver do livro (um modal só de
// cada vez, sem empilhar) e abre o Ver do texto. Ao fechar o Ver do texto (X, Esc, ou
// o Editar e a volta dele), o livro reabre na mesma lista de navegação e com a
// Estrutura como estava, na mesma rolagem. Texto que não existe mais não faz nada.
export async function abrirTextoDaEstruturaLivro(tipo, id) {
    if (livroAtualId == null) return;
    const colecao =
        tipo === 'parte'
            ? db.partes
            : tipo === 'secao'
              ? db.secoes
              : tipo === 'elemento'
                ? db.elementos
                : tipo === 'prosa'
                  ? db.prosas
                  : db.poemas;
    if (!colecao.some((x) => String(x.id) === String(id))) return;

    const livroId = livroAtualId;
    const ids = navegacao.pos >= 0 ? [...navegacao.ids] : null;
    const estrutura = lerEstadoEstruturaLivro(document.getElementById('visualizar-livro-conteudo'));
    const retorno = () => abrirVisualizacaoLivro(livroId, { ...(ids ? { ids } : {}), estrutura });

    await toggleModal('modal-visualizar-livro');
    if (tipo === 'parte' || tipo === 'secao') {
        await abrirParteSecaoDaEstrutura(tipo, id, retorno);
        return;
    }
    if (tipo === 'elemento') {
        await abrirElementoDaEstrutura(id, retorno);
        return;
    }
    await abrirVisualizacao(tipo, Number(id), { retorno });
}

// Botões Anterior (-1) e Próximo (+1) do cabeçalho. Pula livros que deixaram
// de existir; nas pontas da lista não faz nada (sem dar a volta).
export function navegarVisualizacaoLivro(delta) {
    if (livroAtualId == null || navegacao.pos < 0) return;
    const alvo = proximoIndiceExistente(delta);
    if (alvo < 0) return;
    if (!preencherVisualizacaoLivro(navegacao.ids[alvo])) return;
    navegacao.pos = alvo;
    atualizarControlesNavegacao();
}

// Caixa de posição do cabeçalho: vai direto ao livro de número `n` (1 a N).
// Fora da faixa vai para a ponta mais próxima; se o destino não existe mais,
// vale o existente mais próximo. Valor inválido só restaura o número atual.
export function irParaPosicaoVisualizacaoLivro(valor) {
    if (livroAtualId == null || navegacao.pos < 0) return;
    const n = Math.round(Number(valor));
    if (!Number.isFinite(n) || valor === '' || valor == null) {
        atualizarControlesNavegacao();
        return;
    }
    const total = navegacao.ids.length;
    const desejado = Math.min(Math.max(n, 1), total) - 1;
    const existe = (i) => livroExiste(navegacao.ids[i]);
    let alvo = -1;
    for (let d = 0; d < total && alvo < 0; d++) {
        if (desejado + d < total && existe(desejado + d)) alvo = desejado + d;
        else if (desejado - d >= 0 && existe(desejado - d)) alvo = desejado - d;
    }
    if (alvo < 0 || alvo === navegacao.pos) {
        atualizarControlesNavegacao();
        return;
    }
    if (!preencherVisualizacaoLivro(navegacao.ids[alvo])) return;
    navegacao.pos = alvo;
    atualizarControlesNavegacao();
}

// Setas ← e → navegam com o modal aberto, desde que o foco não esteja num
// campo (caixa de posição) e não haja Ctrl/Alt/Meta/Shift.
document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    const modal = document.getElementById('modal-visualizar-livro');
    if (!modal || modal.classList.contains('hidden')) return;
    if (e.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    if (document.getElementById('visualizar-livro-nav')?.classList.contains('hidden')) return;
    e.preventDefault();
    navegarVisualizacaoLivro(e.key === 'ArrowLeft' ? -1 : 1);
});

// ─── Editar e Excluir ────────────────────────────────────────

// Combina "ao fechar o formulário de edição, reabrir o Ver deste livro".
// Guarda o combinado em `voltaAoVer` enquanto vale (some quando o Ver
// reabre), para o olho do Editar saber se o formulário já veio do Ver.
let voltaAoVer = null;

export function registrarVoltaAoVerLivro(volta) {
    voltaAoVer = volta;
    aoFecharModalUmaVez('modal-livro', () => {
        voltaAoVer = null;
        abrirVisualizacaoLivro(volta.id, volta.ids ? { ids: volta.ids } : {});
    });
}

// Olho do cabeçalho do Editar livro: troca o Editar pelo Ver do mesmo livro (um
// modal só de cada vez, sem empilhar). O Ver só mostra o que está salvo, então
// com alterações pendentes pergunta antes: "Salvar e ver", "Descartar e ver" ou
// Cancelar (continua no Editar). Salvar já fecha o Editar; ao fechar, o Ver abre
// pelo mesmo combinado do botão Editar do Ver, então nunca abre duas vezes.
// Livro novo (ainda sem id) não tem o que ver: o botão nem aparece.
export async function verDoModalEdicaoLivro() {
    const campo = document.getElementById('l-edit-id')?.value;
    if (!campo) return;
    const id = Number(campo);
    if (!livroExiste(id)) return;

    // Formulário aberto pelo Ver: o combinado de voltar já existe (e leva a lista
    // de navegação); senão o olho cria um.
    const anterior = voltaAoVer && String(voltaAoVer.id) === String(id) ? voltaAoVer : null;
    const volta = anterior || { id, ids: null };
    const agendar = () => registrarVoltaAoVerLivro(volta);

    if (!rastreadorLivro.estaSujo()) {
        agendar();
        await toggleModal('modal-livro');
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
                rastreadorLivro.marcarLimpo();
                toggleModal('modal-livro');
            },
        },
        onConfirmar: async () => {
            agendar();
            // Salvar é assíncrono (a capa vai pro IndexedDB): espera o envio. Se
            // o navegador recusou antes (título vazio, nenhum envio começou) ou o
            // formulário recusou (data fora de ordem), o Editar continua aberto e
            // o combinado é desfeito, para um X depois não abrir o Ver sem ninguém
            // pedir. Já salvo, o formulário fechou e o Ver abre pelo combinado.
            zerarUltimoEnvioLivro();
            document.getElementById('form-livro')?.requestSubmit();
            const envio = ultimoEnvioLivro();
            const salvou = envio ? await envio : false;
            if (!salvou && !anterior) {
                voltaAoVer = null;
                cancelarAoFecharModal('modal-livro');
            }
        },
    });
}

// Botão "Editar" do rodapé: fecha o Ver e abre o formulário do mesmo livro.
// Ao fechar o formulário (salvar, cancelar, X ou Esc), o Ver reabre.
export async function editarLivroDoVisualizador() {
    if (livroAtualId == null || !livroExiste(livroAtualId)) return;
    const id = livroAtualId;
    const ids = navegacao.pos >= 0 ? [...navegacao.ids] : null;
    registrarVoltaAoVerLivro({ id, ids });
    await toggleModal('modal-visualizar-livro');
    await editarLivro(id);
}

// Botão "Excluir" do rodapé: pede a confirmação de sempre (com "Desfazer"
// depois, e o aviso de cascata de Coletânea). Confirmada, o modal segue para o
// próximo livro da lista (ou o anterior, se era o último); sem navegação ou
// sem outro livro, fecha.
export function excluirLivroDoVisualizador() {
    if (livroAtualId == null) return;
    const id = livroAtualId;
    deleteItem('livros', id, async () => {
        let destino = -1;
        if (navegacao.pos >= 0) {
            const idx = navegacao.pos;
            navegacao.ids.splice(idx, 1);
            const existe = (i) => livroExiste(navegacao.ids[i]);
            for (let i = idx; i < navegacao.ids.length && destino < 0; i++) {
                if (existe(i)) destino = i;
            }
            for (let i = idx - 1; i >= 0 && destino < 0; i--) {
                if (existe(i)) destino = i;
            }
        }
        if (destino < 0 || !preencherVisualizacaoLivro(navegacao.ids[destino])) {
            livroAtualId = null;
            navegacao = { ids: [], pos: -1 };
            await toggleModal('modal-visualizar-livro');
            return;
        }
        navegacao.pos = destino;
        atualizarControlesNavegacao();
    });
}
