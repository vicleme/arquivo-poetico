// ============================================================
// render-fora-do-acervo.js: a seção "Fora do acervo" da aba Conexões (T9,
// entrega 2). Mostra Intertextualidade, Hipertextualidade e Referências
// (Externas) de Poemas e Prosas, lidas por `montarForaDoAcervo`
// (`fora-do-acervo.js`). É só leitura: não é dona de nenhum dado, e os títulos
// abrem o Ver do texto. Elos e Ecos (dentro do acervo) seguem em
// `render-conexoes.js`.
// ============================================================

import { db } from './db.js';
import { escapeHtml } from './utils.js';
import { formatarIntervaloDataObra } from './data-da-obra.js';
import {
    montarForaDoAcervo,
    filtrarObras,
    filtrarAutores,
    filtrarOrigens,
    ordenarObrasDaLista,
    ordenarAutoresDaLista,
    ordenarOrigensDaLista,
    ORDENS_FORA_DO_ACERVO,
} from './fora-do-acervo.js';
import { initSugestoesBuscaConexoes } from './ui-sugestoes-busca-conexoes.js';
import {
    blocoEstaAberto,
    definirBlocoAberto,
    definirTodosBlocos,
    tituloComContagem,
} from './blocos-recolhiveis.js';

const COR_LINK = 'text-gray-700 dark:text-slate-200';
const CAIXA =
    'bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4';

function plural(n, singular, pluralTxt) {
    return `${n} ${n === 1 ? singular : pluralTxt}`;
}

function badge(rotulo, classe) {
    if (!rotulo) return '';
    return `<span class="inline-block px-1.5 py-0.5 rounded ${classe} text-[10px] font-bold uppercase align-middle">${escapeHtml(rotulo)}</span>`;
}

const BADGE_AZUL = 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
const BADGE_CINZA = 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300';
const BADGE_ROXO = 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
const BADGE_ROSA = 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300';
const BADGE_AMBAR = 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300';

// Título que abre o Ver do texto; o tipo (Poema ou Prosa) vem marcado. Dentro de
// uma lista de textos de uma obra, autor ou referência (`naLista`), o clique abre
// o Ver com Anterior/Próximo percorrendo os textos da mesma lista.
function tituloDoTexto(t, naLista = false) {
    const acao = naLista ? 'ver-texto-da-lista' : t.tipo === 'prosa' ? 'ver-prosa' : 'ver-poema';
    const tipoAttr = naLista ? ` data-tipo="${t.tipo === 'prosa' ? 'prosa' : 'poema'}"` : '';
    const marca = t.tipo === 'prosa' ? badge('prosa', BADGE_CINZA) : '';
    return `<span class="inline-flex items-center gap-1"><span class="cursor-pointer hover:underline ${COR_LINK}" data-action="${acao}"${tipoAttr} data-id="${escapeHtml(String(t.id))}">${escapeHtml(t.titulo)}</span>${marca}</span>`;
}

// Botão de correção. A ação é tratada em main.js (delegação de cliques); os
// dados vão em atributos `data-*`.
function botaoCorrigir(acao, dados, rotulo, dica) {
    const attrs = Object.entries(dados)
        .map(([k, v]) => `data-${k}="${escapeHtml(String(v))}"`)
        .join(' ');
    return `<button type="button" data-action="${acao}" ${attrs} title="${escapeHtml(dica)}" class="px-2 py-0.5 rounded border border-gray-300 dark:border-slate-600 text-[11px] font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">${escapeHtml(rotulo)}</button>`;
}

// `rotulo` diz de que lista se trata (aparece no cabeçalho do Ver ao navegar).
function listaDeTextos(textos, rotulo = '') {
    return `<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs" data-lista-textos data-rotulo="${escapeHtml(rotulo)}">${textos.map((t) => tituloDoTexto(t, true)).join('')}</div>`;
}

function vazio(mensagem) {
    return `<p class="text-sm text-gray-400 dark:text-slate-500">${escapeHtml(mensagem)}</p>`;
}

// Chip estático (sem hover nem cursor de clique, porque não abre nada): o
// título da obra em destaque e, em cinza e menor, o que a acompanha (autor,
// data, quantidade de textos). O chip delimita a obra, então não precisa de
// aspas nem de parênteses, e um título com vírgula ou parênteses não se
// confunde com o separador. Título longo quebra dentro do chip.
const CLASSE_CHIP =
    'inline-flex flex-wrap items-baseline gap-x-1.5 max-w-full px-2 py-0.5 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-700 dark:text-slate-200 break-words';

function chip(principal, apoio = '') {
    const extra = apoio
        ? `<span class="text-[11px] text-gray-500 dark:text-slate-400">· ${escapeHtml(apoio)}</span>`
        : '';
    return `<span data-chip class="${CLASSE_CHIP}"><span>${escapeHtml(principal)}</span>${extra}</span>`;
}

function fileiraDeChips(chips, classeExtra = '') {
    return `<div data-chips class="flex flex-wrap gap-1.5 ${classeExtra}">${chips.join('')}</div>`;
}

// Com uma busca ativa, Obras e Autores abrem sozinhos para o resultado não
// ficar escondido. Isso não mexe no estado guardado: ao limpar a busca, cada
// bloco volta ao que a pessoa deixou.
const BLOCOS_DA_BUSCA = ['obras', 'autores', 'origens'];

function blocoAberto(chave) {
    if (consultaAtual.trim() && BLOCOS_DA_BUSCA.includes(chave)) return true;
    return blocoEstaAberto(chave);
}

// Cada bloco é um recolhível, com a contagem no título (o tamanho aparece
// mesmo fechado). O estado de aberto e fechado fica guardado fora do HTML
// (`blocos-recolhiveis.js`), porque a seção é redesenhada a cada atualização.
function bloco(chave, titulo, total, ajuda, conteudo, idConteudo = '') {
    const id = idConteudo ? ` id="${idConteudo}"` : '';
    const aberto = blocoAberto(chave) ? ' open' : '';
    return `
    <details data-bloco-conexoes="${chave}"${aberto} class="mb-6">
        <summary data-bloco-resumo class="cursor-pointer select-none text-sm font-bold text-gray-600 dark:text-slate-300 mb-1">${escapeHtml(tituloComContagem(titulo, total))}</summary>
        <p class="text-[11px] text-gray-400 dark:text-slate-500 mb-3 mt-1">${escapeHtml(ajuda)}</p>
        <div${id} class="${CAIXA}">${conteudo}</div>
    </details>`;
}

// Filtro das listas de Obras e Autores. Fica aqui (e não no HTML gerado)
// porque a seção é redesenhada a cada renderConexoes; o campo de busca mora
// fora do contêiner, então não perde o foco enquanto se digita.
let consultaAtual = '';
let ordemAtual = 'textos';
let ultimosDados = null;

const ID_OBRAS = 'conexoes-fora-obras';
const ID_AUTORES = 'conexoes-fora-autores';
const ID_ORIGENS = 'conexoes-fora-origens';

function contagemFiltro(mostrados, total, singular, pluralTxt) {
    if (!consultaAtual.trim()) return '';
    return `<p class="text-[11px] text-gray-400 dark:text-slate-500 mb-2">Mostrando ${mostrados} de ${plural(total, singular, pluralTxt)}.</p>`;
}

function htmlListaObras(dados) {
    if (!dados.obras.length) return vazio('Nenhuma obra com nome cadastrada.');
    const lista = ordenarObrasDaLista(filtrarObras(dados.obras, consultaAtual), ordemAtual);
    const topo = contagemFiltro(lista.length, dados.obras.length, 'obra', 'obras');
    if (!lista.length) return topo + vazio('Nenhuma obra combina com o filtro.');
    return topo + lista.map(cartaoObra).join('');
}

function htmlListaAutores(dados) {
    if (!dados.autores.length) return vazio('Nenhum autor cadastrado.');
    const lista = ordenarAutoresDaLista(filtrarAutores(dados.autores, consultaAtual), ordemAtual);
    const topo = contagemFiltro(lista.length, dados.autores.length, 'autor', 'autores');
    if (!lista.length) return topo + vazio('Nenhum autor combina com o filtro.');
    return topo + lista.map(linhaAutor).join('');
}

function htmlListaOrigens(dados) {
    if (!dados.origens.length) return vazio('Nenhuma obra cadastrada para listar por origem.');
    const lista = ordenarOrigensDaLista(filtrarOrigens(dados.origens, consultaAtual), ordemAtual);
    const topo = contagemFiltro(lista.length, dados.origens.length, 'origem', 'origens');
    if (!lista.length) return topo + vazio('Nenhuma origem combina com o filtro.');
    return topo + lista.map(cartaoOrigem).join('');
}

// Cada origem: textos, obras e autores no título; dentro, as obras, os autores
// e os textos. O botão abre a lista de Poemas ou Prosas com `origem:` (a mesma
// consulta do clique nas barras das Estatísticas). O item "Sem origem
// preenchida" não tem esse botão, porque não há valor para buscar.
function cartaoOrigem(g) {
    const obras = fileiraDeChips(g.obras.map((o) => chip(o.obra, o.autor || '')));
    const autores = fileiraDeChips(g.autores.map((a) => chip(a)));
    const botao = g.semOrigem
        ? ''
        : `<div class="pl-5 pt-1 pb-1"><button type="button" data-action="abrir-lista-origem" data-origem="${escapeHtml(g.origem)}" data-poemas="${g.textos
              .filter((t) => t.tipo !== 'prosa')
              .map((t) => t.id)
              .join(',')}" data-prosas="${g.textos
              .filter((t) => t.tipo === 'prosa')
              .map((t) => t.id)
              .join(
                  ',',
              )}" class="text-xs text-blue-600 dark:text-blue-400 underline" title="Abre Poemas ou Prosas filtrado por esta origem">Ver os textos desta origem na lista</button></div>`;
    return `
    <details class="py-1.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
        <summary class="flex flex-wrap items-center gap-2 cursor-pointer text-sm">
            <span class="font-semibold">${escapeHtml(g.origem)}</span>
            <span class="text-[11px] text-gray-400 dark:text-slate-500">${[
                plural(g.totalTextos, 'texto', 'textos'),
                plural(g.totalObras, 'obra', 'obras'),
                plural(g.totalAutores, 'autor', 'autores'),
            ].join(' · ')}</span>
        </summary>
        <div class="pl-5 pt-2 pb-1"><p class="text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">Obras</p>${obras}</div>
        ${g.autores.length ? `<div class="pl-5 pt-1 pb-1"><p class="text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">Autores</p>${autores}</div>` : ''}
        <div class="pl-5 pt-1 pb-1">${listaDeTextos(g.textos, `Origem: ${g.origem}`)}</div>
        ${botao}
    </details>`;
}

// A data da obra (o par mais usado) ao lado do nome, para a ordem por data
// poder ser conferida na tela. Obra sem data não mostra nada.
function dataDaObra(o) {
    const texto = formatarIntervaloDataObra(o.dataObra, o.dataObraAte);
    if (!texto) return '';
    return `<span class="text-[11px] text-gray-500 dark:text-slate-400" title="Data da obra">${escapeHtml(texto)}</span>`;
}

// A marca "Obra pessoal" da obra: inteira ou só em parte das entradas.
function etiquetaObraPessoal(o) {
    if (o.obraPessoal === 'todas') return badge('obra pessoal', BADGE_ROSA);
    if (o.obraPessoal === 'algumas') {
        return badge(
            `obra pessoal em ${o.entradasPessoais} de ${plural(o.entradasTotal, 'entrada', 'entradas')}`,
            BADGE_ROSA,
        );
    }
    return '';
}

function cartaoObra(o) {
    const relacoes = Object.entries(o.porRelacao)
        .map(([rel, n]) => badge(n > 1 ? `${rel} ×${n}` : rel, BADGE_AZUL))
        .join(' ');
    const autor = o.autor
        ? `<span class="text-xs text-gray-500 dark:text-slate-400">${escapeHtml(o.autor)}</span>`
        : '';
    return `
    <details class="py-1.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
        <summary class="flex flex-wrap items-center gap-2 cursor-pointer text-sm">
            <span class="font-semibold">${escapeHtml(o.obra)}</span>
            ${autor}
            ${badge(o.tipoObra, BADGE_CINZA)}
            ${dataDaObra(o)}
            ${etiquetaObraPessoal(o)}
            ${o.comoHipotexto ? badge('hipotexto', BADGE_ROXO) : ''}
            <span class="text-[11px] text-gray-400 dark:text-slate-500">${plural(o.totalTextos, 'texto', 'textos')}</span>
            ${relacoes}
        </summary>
        <div class="pl-5 pt-2 pb-1">${listaDeTextos(o.textos, `Obra: ${o.obra}${o.autor ? ` (${o.autor})` : ''}`)}</div>
        <div class="pl-5 pt-1 pb-1">${botaoCorrigir('corrigir-obra-fora', { chave: o.chave }, 'Corrigir obra', 'Muda o nome, o autor ou o tipo desta obra em todos os textos que a usam')}</div>
    </details>`;
}

function linhaAutor(a) {
    const obras = fileiraDeChips(
        a.obras.map((o) => {
            const data = formatarIntervaloDataObra(o.dataObra, o.dataObraAte);
            const apoio = [data, o.totalTextos > 1 ? `${o.totalTextos} textos` : '']
                .filter(Boolean)
                .join(' · ');
            return chip(o.obra, apoio);
        }),
        'w-full',
    );
    return `
    <details class="py-1.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
        <summary class="flex flex-wrap items-center gap-2 cursor-pointer text-sm">
            <span class="font-semibold">${escapeHtml(a.autor)}</span>
            <span class="text-[11px] text-gray-400 dark:text-slate-500">${plural(a.totalTextos, 'texto', 'textos')}</span>
            ${obras}
        </summary>
        <div class="pl-5 pt-2 pb-1">${listaDeTextos(a.textos, `Autor: ${a.autor}`)}</div>
        <div class="pl-5 pt-1 pb-1">${botaoCorrigir('corrigir-autor-fora', { chave: a.chave }, 'Corrigir autor', 'Muda o nome ou a origem deste autor em todos os textos, ou junta com outro')}</div>
    </details>`;
}

function linhaDerivacao(d) {
    const origens = d.hipotextos
        .map((h) => {
            const autor = h.autor
                ? ` <span class="text-gray-500 dark:text-slate-400">(${escapeHtml(h.autor)})</span>`
                : '';
            return `${badge(h.relacao, BADGE_ROXO)} <span class="font-semibold">${escapeHtml(h.hipotexto)}</span>${autor}`;
        })
        .join('<span class="text-gray-300 dark:text-slate-600"> · </span>');
    return `
    <div class="flex flex-wrap items-center gap-2 py-1.5 text-sm border-b border-gray-100 dark:border-slate-800 last:border-0">
        ${tituloDoTexto(d)}
        <span class="text-gray-300 dark:text-slate-600">←</span>
        ${origens}
    </div>`;
}

function linhaReferencia(r) {
    return `
    <details class="py-1.5 border-b border-gray-100 dark:border-slate-800 last:border-0">
        <summary class="flex flex-wrap items-center gap-2 cursor-pointer text-sm">
            <span class="font-semibold">${escapeHtml(r.texto)}</span>
            ${badge(r.tipo, BADGE_CINZA)}
            <span class="text-[11px] text-gray-400 dark:text-slate-500">${plural(r.totalTextos, 'texto', 'textos')}</span>
        </summary>
        <div class="pl-5 pt-1 pb-1">${botaoCorrigir('corrigir-referencia-fora', { chave: r.chave }, 'Corrigir referência', 'Muda o nome, o tipo ou a data desta referência em todos os textos que a usam')}</div>
        <div class="pl-5 pt-1 pb-1">${listaDeTextos(r.textos, `Referência${r.tipo ? ` (${r.tipo})` : ''}: ${r.texto}`)}</div>
    </details>`;
}

const MOTIVOS = {
    grafias: 'Mesma obra escrita de jeitos diferentes',
    autor: 'Mesmo título com autor diferente ou sem autor',
    parecido: 'Títulos parecidos do mesmo autor',
};

function linhaQuaseDuplicata(q, indice) {
    const itens = q.itens
        .map((i, j) => {
            const autor = i.autor
                ? ` <span class="text-gray-500 dark:text-slate-400">(${escapeHtml(i.autor)})</span>`
                : ` <span class="text-gray-400 dark:text-slate-500 italic">(sem autor)</span>`;
            const manter = botaoCorrigir(
                'manter-obra-fora',
                { aviso: indice, item: j },
                'Manter esta',
                'Junta as outras obras desta linha nesta, em todos os textos',
            );
            return `<span class="inline-flex items-center gap-1"><span class="font-semibold">${escapeHtml(i.obra)}</span>${autor} ${manter}</span>`;
        })
        .join('<span class="text-gray-300 dark:text-slate-600"> ≈ </span>');
    return `
    <div class="flex flex-wrap items-center gap-2 py-1.5 text-sm border-b border-gray-100 dark:border-slate-800 last:border-0">
        ${badge(MOTIVOS[q.motivo] || q.motivo, BADGE_AMBAR)}
        ${itens}
    </div>`;
}

// O HTML da seção, a partir do resultado de `montarForaDoAcervo`.
export function htmlForaDoAcervo(dados, consulta = consultaAtual) {
    consultaAtual = typeof consulta === 'string' ? consulta : '';
    const t = dados.totais;
    if (!t.textosComForaDoAcervo) {
        return vazio(
            'Nenhuma Intertextualidade, Hipertextualidade ou Referência (Externa) cadastrada ainda.',
        );
    }
    const resumo = `<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-4">
        <p class="text-xs text-gray-500 dark:text-slate-400">${[
            plural(t.textosComForaDoAcervo, 'texto', 'textos'),
            plural(t.obras, 'obra', 'obras'),
            plural(t.autores, 'autor', 'autores'),
            plural(t.referencias, 'referência', 'referências'),
        ].join(' · ')}</p>
        <div class="flex gap-3 text-xs">
            <button type="button" data-bloco-acao="expandir" class="text-blue-600 dark:text-blue-400 underline">Expandir tudo</button>
            <button type="button" data-bloco-acao="recolher" class="text-blue-600 dark:text-blue-400 underline">Recolher tudo</button>
        </div>
    </div>`;

    const recorrentes = dados.referencias.filter((r) => r.recorrente);
    const soUma = dados.referencias.length - recorrentes.length;
    const unicas = dados.referencias.filter((r) => !r.recorrente);
    const notaReferencias = soUma
        ? `<details id="conexoes-fora-referencias-unicas" class="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <summary class="cursor-pointer text-xs font-semibold text-gray-500 dark:text-slate-400">${plural(soUma, 'referência em um texto só', 'referências em um texto só')}</summary>
            <div class="pt-2">${unicas.map(linhaReferencia).join('')}</div>
        </details>`
        : '';

    return [
        resumo,
        bloco(
            'obras',
            'Obras',
            dados.obras.length,
            'Obra mais autor, juntando Intertextualidade e Hipertextualidade, em Poemas e Prosas. Clique numa obra para ver os textos e a relação de cada um. A ordem (mais textos, A → Z ou data da obra) é a do campo acima.',
            htmlListaObras(dados),
            ID_OBRAS,
        ),
        bloco(
            'autores',
            'Autores',
            dados.autores.length,
            'Cada autor com os textos e as obras dele, na mesma ordem das obras (por data, vale a obra mais antiga ou a mais recente dele). Autor vazio não entra.',
            htmlListaAutores(dados),
            ID_AUTORES,
        ),
        bloco(
            'origens',
            'Origens',
            dados.origens.filter((g) => !g.semOrigem).length,
            'De que lugar ou cultura vêm as obras (o campo Origem da obra). Cada origem com as obras, os autores e os textos que a trazem, na mesma ordem do campo acima (A → Z ou mais textos; as ordens por data valem como mais textos). "Sem origem preenchida" fica sempre no fim.',
            htmlListaOrigens(dados),
            ID_ORIGENS,
        ),
        bloco(
            'hipertextualidade',
            'Hipertextualidade: de qual obra cada texto deriva',
            dados.derivacoes.length,
            'O hipotexto de cada texto, com a relação (paródia, releitura, tradução adaptada...).',
            dados.derivacoes.length
                ? dados.derivacoes.map(linhaDerivacao).join('')
                : vazio('Nenhuma Hipertextualidade cadastrada.'),
        ),
        bloco(
            'referencias',
            'Referências recorrentes',
            recorrentes.length,
            'O mesmo Marco histórico, Notícia ou Pessoa pública em dois textos ou mais. As de um texto só ficam numa seção recolhida logo abaixo.',
            (recorrentes.length
                ? recorrentes.map(linhaReferencia).join('')
                : vazio('Nenhuma referência aparece em mais de um texto.')) + notaReferencias,
        ),
        bloco(
            'quase-duplicatas',
            'Avisos de quase-duplicatas',
            dados.quaseDuplicatas.length,
            'Possíveis grafias diferentes da mesma obra. Nada é mudado sozinho: "Manter esta" junta as outras da linha nesta, depois de você confirmar.',
            dados.quaseDuplicatas.length
                ? dados.quaseDuplicatas.map((q, i) => linhaQuaseDuplicata(q, i)).join('')
                : vazio('Nenhuma quase-duplicata encontrada.'),
        ),
    ].join('');
}

// Liga, uma vez só por contêiner, o clique no título de cada bloco e os botões
// "Expandir tudo" e "Recolher tudo". O estado é lido logo DEPOIS de o navegador
// trocar o `open` (por isso o `setTimeout`), em vez de usar o evento `toggle`,
// que também dispara quando o HTML é redesenhado ou quando a busca abre um
// bloco sozinha, e gravaria uma escolha que a pessoa não fez.
function ligarBlocos(container) {
    if (container.dataset.blocosLigados) return;
    container.dataset.blocosLigados = '1';
    container.addEventListener('click', (e) => {
        const resumo = e.target.closest?.('summary[data-bloco-resumo]');
        if (resumo) {
            const bloco = resumo.closest('details[data-bloco-conexoes]');
            if (bloco) {
                setTimeout(() => definirBlocoAberto(bloco.dataset.blocoConexoes, bloco.open), 0);
            }
            return;
        }
        const botao = e.target.closest?.('button[data-bloco-acao]');
        if (!botao) return;
        definirTodosBlocos(botao.dataset.blocoAcao === 'expandir');
        aplicarAberturaDosBlocos(container);
    });
}

// Põe cada bloco no estado guardado (com a regra da busca por cima).
function aplicarAberturaDosBlocos(container = document.getElementById('conexoes-fora')) {
    if (!container) return;
    container.querySelectorAll('details[data-bloco-conexoes]').forEach((d) => {
        d.open = blocoAberto(d.dataset.blocoConexoes);
    });
}

export function renderForaDoAcervo() {
    const container = document.getElementById('conexoes-fora');
    if (!container) return;
    ultimosDados = montarForaDoAcervo({ poemas: db.poemas, prosas: db.prosas });
    container.innerHTML = htmlForaDoAcervo(ultimosDados);
    ligarBlocos(container);
    const caixa = document.getElementById('conexoes-fora-filtro-caixa');
    if (caixa) caixa.classList.toggle('hidden', !ultimosDados.totais.textosComForaDoAcervo);
    // Sugestões de `campo:valor` na caixa do filtro (ligadas uma vez; a função
    // das obras lê sempre o último cálculo).
    initSugestoesBuscaConexoes({
        obras: () => ultimosDados?.obras || [],
        mudou: setFiltroForaDoAcervo,
    });
    // Avisa o Modo revisão (revisao-fora-do-acervo-ui.js), que tem a própria
    // tabela e precisa se redesenhar quando o dado muda.
    window.dispatchEvent(new CustomEvent('fora-do-acervo:renderizado'));
}

// Acessores para a tela de correção (corrigir-fora-do-acervo-ui.js): leem o
// último cálculo da seção, sem filtro.
export function obterObraForaDoAcervo(chave) {
    return ultimosDados?.obras.find((o) => o.chave === chave) || null;
}

export function obterAutorForaDoAcervo(chave) {
    return ultimosDados?.autores.find((a) => a.chave === chave) || null;
}

export function obterReferenciaForaDoAcervo(chave) {
    return ultimosDados?.referencias.find((r) => r.chave === chave) || null;
}

export function obterItemQuaseDuplicata(aviso, item) {
    const q = ultimosDados?.quaseDuplicatas[aviso];
    return q ? { aviso: q, item: q.itens[item] || null } : null;
}

// Chamado pelo campo de filtro (oninput). Redesenha só as listas de Obras,
// Autores e Origens, para não fechar o que a pessoa abriu nas outras partes da seção.
export function setFiltroForaDoAcervo(valor) {
    consultaAtual = typeof valor === 'string' ? valor : '';
    if (!ultimosDados) return;
    const obras = document.getElementById(ID_OBRAS);
    const autores = document.getElementById(ID_AUTORES);
    const origens = document.getElementById(ID_ORIGENS);
    if (obras) obras.innerHTML = htmlListaObras(ultimosDados);
    if (autores) autores.innerHTML = htmlListaAutores(ultimosDados);
    if (origens) origens.innerHTML = htmlListaOrigens(ultimosDados);
    aplicarAberturaDosBlocos();
}

// Chamado pelo seletor de ordem (onchange). Vale para Obras, Autores e
// Origens e redesenha só essas listas. Ordem desconhecida volta para "textos".
export function setOrdemForaDoAcervo(valor) {
    ordemAtual = ORDENS_FORA_DO_ACERVO.includes(valor) ? valor : 'textos';
    if (!ultimosDados) return;
    const obras = document.getElementById(ID_OBRAS);
    const autores = document.getElementById(ID_AUTORES);
    const origens = document.getElementById(ID_ORIGENS);
    if (obras) obras.innerHTML = htmlListaObras(ultimosDados);
    if (autores) autores.innerHTML = htmlListaAutores(ultimosDados);
    if (origens) origens.innerHTML = htmlListaOrigens(ultimosDados);
}

// O que a tela mostra agora (dados e opções de filtro e ordem), para o
// relatório baixar exatamente isso (baixar-fora-do-acervo.js).
export function estadoDoRelatorioForaDoAcervo() {
    return {
        dados: ultimosDados || montarForaDoAcervo({ poemas: db.poemas, prosas: db.prosas }),
        opcoes: { consulta: consultaAtual, ordem: ordemAtual },
    };
}
