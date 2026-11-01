// Leitura avaliativa (Fase 22, entrega 2b): a tela da aba. A lógica está em
// leitura-avaliativa.js (listas, sugestão) e em leitura-avaliativa-acoes.js
// (o que cada clique faz no rascunho e o que "Terminar leitura" grava).
// Este arquivo só desenha e liga os cliques; os cliques entram pelos
// `window.leitura*` do main.js.
//
// Fluxo: a aba abre na lista de textos; escolher um texto abre o texto de um
// lado e o formulário do outro. O formulário é um rascunho em memória: só
// "Terminar leitura" grava (em `db.leituras`, na Avaliação e na Classificação
// do texto). Trocar de texto ou de aba descarta o rascunho.

import { db, save } from './db.js';
import {
    escapeHtml,
    sanitizarTextoRico,
    mostrarAviso,
    abrirModalConfirmacao,
    gerarId,
    hojeIso,
    formatarAutoclassificacaoTexto,
    formatarDataAcesso,
} from './utils.js';
import {
    ITENS_PEGOU,
    ITENS_INCOMODOU,
    PESOS,
    RESPOSTAS,
    coracoesValidos,
    rotuloDoPeso,
    rotuloItemPegou,
    rotuloItemIncomodou,
} from './leitura-avaliativa.js';
import { calcularPadrao, MINIMO_PARA_PADRAO } from './leitura-avaliativa-padrao.js';
import {
    FILTROS_LEITURA,
    FILTROS_CLASSIFICACAO,
    FILTROS_TIPO,
    FILTRO_ALGUM,
    FILTROS_RESPOSTA,
    rotuloDaResposta,
    listarTextosParaLeitura,
    ultimaLeituraDoTexto,
    acharTextoDaLeitura,
    novoRascunho,
    marcarPegou,
    alternarIncomodou,
    responder,
    sugestaoDoRascunho,
    concluirLeitura,
} from './leitura-avaliativa-acoes.js';

const PASSOS_CORACOES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

// Estado da tela. `selecionado` é { tipo, id } ou null (aba na lista).
export const estado = {
    busca: '',
    filtro: 'todos',
    classificacao: 'todos',
    tipo: 'todos',
    pegou: 'todos',
    incomodou: 'todos',
    releria: 'todos',
    mostraria: 'todos',
    padraoAberto: false,
    selecionado: null,
    // Fila para Anterior e Próximo: a lista (com filtros e busca) no momento em
    // que o texto foi escolhido, como [{ tipo, id }]. Não muda ao terminar uma leitura.
    fila: [],
    rascunho: null,
    escolhido: null,
    avaliacao: '',
};

export function reiniciarEstado() {
    estado.busca = '';
    estado.filtro = 'todos';
    estado.classificacao = 'todos';
    estado.tipo = 'todos';
    estado.pegou = 'todos';
    estado.incomodou = 'todos';
    estado.releria = 'todos';
    estado.mostraria = 'todos';
    estado.padraoAberto = false;
    estado.selecionado = null;
    estado.fila = [];
    estado.rascunho = null;
    estado.escolhido = null;
    estado.avaliacao = '';
}

const BTN_BASE = 'text-xs font-medium rounded border px-2.5 py-1 whitespace-nowrap';
const BTN_OFF =
    'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800';
const BTN_ON = 'bg-blue-600 border-blue-600 text-white';
const classeBtn = (ligado) => `${BTN_BASE} ${ligado ? BTN_ON : BTN_OFF}`;

const textoDoTipo = (tipo) => (tipo === 'prosa' ? 'Prosa' : 'Poema');

// Olho e seta no canto da caixa do texto (Ver e Baixar o texto aberto).
const ICONE_VER = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"/><circle cx="10" cy="10" r="2.25"/></svg>`;
const ICONE_BAIXAR = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M10 3v9.5"/><path d="M6 9l4 4 4-4"/><path d="M3.5 15.5h13"/></svg>`;
const BTN_ICONE =
    'inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/90 hover:bg-gray-100 dark:hover:bg-slate-700';

function formatarCoracoes(n) {
    return formatarAutoclassificacaoTexto(n) || 'sem classificação';
}

// ─── HTML (puro, sem DOM: testável) ─────────────────────────────

export function htmlListaTextos(
    dbRef,
    busca,
    filtro = 'todos',
    classificacao = 'todos',
    tipo = 'todos',
    pegou = 'todos',
    incomodou = 'todos',
    releria = 'todos',
    mostraria = 'todos',
) {
    const linhas = listarTextosParaLeitura(
        dbRef,
        busca,
        filtro,
        classificacao,
        tipo,
        pegou,
        incomodou,
        releria,
        mostraria,
    );
    if (!linhas.length) {
        return `<p class="text-sm text-gray-500 dark:text-slate-400 p-4">${
            busca ||
            filtro !== 'todos' ||
            classificacao !== 'todos' ||
            tipo !== 'todos' ||
            pegou !== 'todos' ||
            incomodou !== 'todos' ||
            releria !== 'todos' ||
            mostraria !== 'todos'
                ? 'Nenhum texto com esse filtro e essa busca.'
                : 'Nenhum poema ou prosa cadastrado ainda.'
        }</p>`;
    }
    return linhas
        .map((l) => {
            const lidas = l.leituras
                ? `${l.leituras} ${l.leituras === 1 ? 'leitura' : 'leituras'}, a última em ${escapeHtml(formatarDataAcesso(l.ultimaData) || l.ultimaData)}`
                : 'nunca lido por esta aba';
            const pesoRotulo = PESOS.find((p) => p.id === l.pesoPegouId)?.rotulo;
            const marcaPegou =
                pegou === FILTRO_ALGUM
                    ? `<span class="ml-2 text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Pegou: ${escapeHtml(l.pegouMarcas.map((m) => `${rotuloItemPegou(m.item)} (${rotuloDoPeso(m.peso).toLowerCase()})`).join(', '))}</span>`
                    : pesoRotulo
                      ? `<span class="ml-2 text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">${escapeHtml(rotuloItemPegou(pegou))}: ${escapeHtml(pesoRotulo)}</span>`
                      : '';
            const marcaIncomodou =
                incomodou !== 'todos'
                    ? `<span class="ml-2 text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Incomodou: ${escapeHtml(incomodou === FILTRO_ALGUM ? l.incomodouMarcas.map(rotuloItemIncomodou).join(', ') : rotuloItemIncomodou(incomodou))}</span>`
                    : '';
            const respostaDaLinha = (resposta) =>
                resposta ? rotuloDaResposta(resposta).toLowerCase() : 'sem resposta';
            const marcaReleria =
                releria !== 'todos'
                    ? `<span class="ml-2 text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Releria: ${escapeHtml(respostaDaLinha(l.releriaResposta))}</span>`
                    : '';
            const marcaMostraria =
                mostraria !== 'todos'
                    ? `<span class="ml-2 text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400">Mostraria: ${escapeHtml(respostaDaLinha(l.mostrariaResposta))}</span>`
                    : '';
            return `<button type="button" onclick="leituraSelecionarTexto('${l.tipo}', '${escapeHtml(String(l.id))}')"
                class="w-full text-left px-4 py-2 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800">
                <span class="font-medium">${escapeHtml(l.titulo)}</span>
                <span class="ml-2 text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">${textoDoTipo(l.tipo)}</span>${marcaPegou}${marcaIncomodou}${marcaReleria}${marcaMostraria}
                <span class="block text-xs text-gray-500 dark:text-slate-400">${lidas}. Classificação: ${escapeHtml(formatarCoracoes(l.classificacao))}.</span>
            </button>`;
        })
        .join('');
}

function htmlPegou(rascunho) {
    return ITENS_PEGOU.map((item) => {
        const marca = rascunho.pegou.find((m) => m.item === item.id);
        const botoes = PESOS.map(
            (p) =>
                `<button type="button" onclick="leituraMarcarPegou('${item.id}', '${p.id}')"
                    ${p.descricao ? `title="${escapeHtml(p.descricao)}"` : ''}
                    aria-pressed="${marca?.peso === p.id}"
                    class="${classeBtn(marca?.peso === p.id)}">${p.rotulo}</button>`,
        ).join('');
        return `<div class="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-slate-800">
            <div class="min-w-0 flex-1 basis-48">
                <div class="text-sm font-medium">${escapeHtml(item.rotulo)}</div>
                <div class="text-xs text-gray-500 dark:text-slate-400">${escapeHtml(item.descricao)}</div>
            </div>
            <div class="flex gap-1">${botoes}</div>
        </div>`;
    }).join('');
}

function htmlIncomodou(rascunho) {
    return `<div class="flex flex-wrap gap-2">${ITENS_INCOMODOU.map((item) => {
        const ligado = rascunho.incomodou.includes(item.id);
        return `<button type="button" onclick="leituraAlternarIncomodou('${item.id}')"
            title="${escapeHtml(item.descricao)}" aria-pressed="${ligado}"
            class="${classeBtn(ligado)}">${escapeHtml(item.rotulo)}</button>`;
    }).join('')}</div>`;
}

function htmlResposta(rascunho, campo, pergunta) {
    const botoes = RESPOSTAS.map(
        (r) =>
            `<button type="button" onclick="leituraResponder('${campo}', '${r.id}')"
                aria-pressed="${rascunho[campo] === r.id}"
                class="${classeBtn(rascunho[campo] === r.id)}">${r.rotulo}</button>`,
    ).join('');
    return `<div class="flex flex-wrap items-center justify-between gap-2 py-1.5">
        <span class="text-sm font-medium">${pergunta}</span>
        <div class="flex gap-1">${botoes}</div>
    </div>`;
}

function htmlSugestao(texto, rascunho, escolhido) {
    const sug = sugestaoDoRascunho(rascunho);
    const atual = coracoesValidos(texto.autoclassificacao) ? Number(texto.autoclassificacao) : 0;
    const botoes = PASSOS_CORACOES.map(
        (n) =>
            `<button type="button" onclick="leituraEscolherCoracoes(${n})" aria-pressed="${escolhido === n}"
                class="${classeBtn(escolhido === n)}">${String(n).replace('.', ',')}</button>`,
    ).join('');
    const linhaSugerido =
        sug.coracoes === null
            ? `<p class="text-sm text-gray-600 dark:text-slate-300">${escapeHtml(sug.motivo)}</p>`
            : `<p class="text-sm"><strong>Sugestão: ${escapeHtml(formatarCoracoes(sug.coracoes))}.</strong>
                   <span class="text-gray-600 dark:text-slate-300">${escapeHtml(sug.motivo)}</span></p>
               <button type="button" onclick="leituraEscolherCoracoes(${sug.coracoes})"
                   class="${BTN_BASE} ${BTN_OFF} mt-2">Usar a sugestão</button>`;
    return `${linhaSugerido}
        <p class="text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mt-4 mb-1">Corações a gravar</p>
        <div class="flex flex-wrap gap-1" role="group" aria-label="Corações a gravar">${botoes}</div>
        <p class="text-xs text-gray-600 dark:text-slate-300 mt-2">${
            escolhido === null
                ? 'Nenhum valor escolhido: a Classificação do texto não muda.'
                : `Ao terminar, a Classificação do texto passa a ser ${escapeHtml(formatarCoracoes(escolhido))}.`
        }
            Classificação atual: ${escapeHtml(formatarCoracoes(atual))}.</p>
        <p class="text-xs text-amber-700 dark:text-amber-400 mt-1">O valor escolhido é o do próprio texto: ele vale também no sorteio de leitura, onde 4 corações ou mais entram em "Só os meus preferidos".</p>`;
}

function htmlUltimaLeitura(dbRef, selecionado) {
    const u = ultimaLeituraDoTexto(dbRef, selecionado.tipo, selecionado.id);
    if (!u) {
        return `<p class="text-xs text-gray-500 dark:text-slate-400 mb-3">Este texto ainda não tem leitura registrada.</p>`;
    }
    const pegou =
        u.pegou
            .map((m) => `${rotuloItemPegou(m.item)} (${rotuloDoPeso(m.peso).toLowerCase()})`)
            .join(', ') || 'nada';
    const incomodou = u.incomodou.map(rotuloItemIncomodou).join(', ') || 'nada';
    return `<div class="rounded border border-gray-200 dark:border-slate-700 p-3 mb-4 text-xs text-gray-600 dark:text-slate-300">
        <div class="font-bold uppercase text-gray-500 dark:text-slate-400 mb-1">Última leitura, em ${escapeHtml(formatarDataAcesso(u.data) || u.data)}</div>
        <div>Pegou: ${escapeHtml(pegou)}.</div>
        <div>Incomodou: ${escapeHtml(incomodou)}.</div>
        <div>Corações: sugerido ${escapeHtml(formatarCoracoes(u.sugerido))}, escolhido ${escapeHtml(formatarCoracoes(u.escolhido))}.</div>
        <button type="button" onclick="leituraPartirDaUltima()" class="${BTN_BASE} ${BTN_OFF} mt-2">Partir desta leitura</button>
    </div>`;
}

// Anterior, posição e Próximo, seguindo a fila de quando o texto foi escolhido.
function htmlNavegacao(est) {
    const fila = Array.isArray(est.fila) ? est.fila : [];
    const pos = fila.findIndex(
        (f) => f.tipo === est.selecionado.tipo && String(f.id) === String(est.selecionado.id),
    );
    if (pos < 0 || fila.length < 2) return '';
    const btn = (delta, rotulo, desligado) =>
        `<button type="button" onclick="leituraNavegar(${delta})" ${desligado ? 'disabled' : ''}
            class="${BTN_BASE} ${BTN_OFF} ${desligado ? 'opacity-40 cursor-not-allowed' : ''}">${rotulo}</button>`;
    return `<div class="flex items-center gap-2" role="group" aria-label="Navegar entre os textos">
            ${btn(-1, '← Anterior', pos === 0)}
            <span id="leitura-posicao" class="text-xs text-gray-600 dark:text-slate-300">${pos + 1} de ${fila.length}</span>
            ${btn(1, 'Próximo →', pos === fila.length - 1)}
        </div>`;
}

// ─── Padrão das leituras (entrega 4) ────────────────────────────

const numeroPt = (n) => String(n).replace('.', ',');
const CEL = 'px-2 py-1 border-b border-gray-100 dark:border-slate-800 text-xs';

function htmlTabelaPegou(padrao) {
    const cab = padrao.faixas
        .map(
            (f) =>
                `<th class="${CEL} text-right font-semibold">${escapeHtml(f.rotulo)}<span class="block font-normal text-gray-500 dark:text-slate-400">${f.n} ${f.n === 1 ? 'texto' : 'textos'}</span></th>`,
        )
        .join('');
    const temContraste = padrao.contraste.length > 0;
    const linhas = padrao.faixas[0].pegou
        .map((item, i) => {
            const celulas = padrao.faixas
                .map((f) => {
                    const c = f.pegou[i];
                    return `<td class="${CEL} text-right">${f.n ? numeroPt(c.ponderado) : '-'}<span class="block text-gray-500 dark:text-slate-400">${f.n ? `${c.marcaram} de ${f.n}` : ''}</span></td>`;
                })
                .join('');
            const dif = temContraste ? padrao.contraste.find((c) => c.item === item.item) : null;
            const contraste = temContraste
                ? `<td class="${CEL} text-right font-semibold">${dif.diferenca > 0 ? '+' : ''}${numeroPt(dif.diferenca)}</td>`
                : '';
            const nome = `<button type="button" onclick="leituraAbrirItemPegou('${item.item}')"
                title="Ver os textos que pegaram por ${escapeHtml(item.rotulo)}"
                class="text-left underline decoration-dotted underline-offset-2 hover:decoration-solid">${escapeHtml(item.rotulo)}</button>`;
            return `<tr><td class="${CEL}">${nome}</td>${celulas}${contraste}</tr>`;
        })
        .join('');
    return `<div class="overflow-x-auto"><table class="w-full text-left">
        <thead><tr><th class="${CEL}">Item</th>${cab}${temContraste ? `<th class="${CEL} text-right font-semibold">Contraste<span class="block font-normal text-gray-500 dark:text-slate-400">alta menos baixa</span></th>` : ''}</tr></thead>
        <tbody>${linhas}</tbody></table></div>`;
}

function htmlTabelaIncomodou(padrao) {
    const cab = padrao.faixas
        .map((f) => `<th class="${CEL} text-right font-semibold">${escapeHtml(f.rotulo)}</th>`)
        .join('');
    const linhas = padrao.faixas[0].incomodou
        .map((item, i) => {
            const celulas = padrao.faixas
                .map(
                    (f) =>
                        `<td class="${CEL} text-right">${f.n ? `${f.incomodou[i].marcaram} de ${f.n}` : '-'}</td>`,
                )
                .join('');
            const nome = `<button type="button" onclick="leituraAbrirItemIncomodou('${item.item}')"
                title="Ver os textos que incomodaram por ${escapeHtml(item.rotulo)}"
                class="text-left underline decoration-dotted underline-offset-2 hover:decoration-solid">${escapeHtml(item.rotulo)}</button>`;
            return `<tr><td class="${CEL}">${nome}</td>${celulas}</tr>`;
        })
        .join('');
    return `<div class="overflow-x-auto"><table class="w-full text-left">
        <thead><tr><th class="${CEL}">Item</th>${cab}</tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function htmlRespostasPadrao(padrao) {
    const linha = (campo, rotulo) =>
        `<tr><td class="${CEL}">${rotulo}</td>${padrao.faixas
            .map((f) => {
                const r = f[campo];
                return `<td class="${CEL} text-right">${r.total ? `${r.sim} sim, ${r.talvez} talvez, ${r.nao} não` : '-'}</td>`;
            })
            .join('')}</tr>`;
    return `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr><th class="${CEL}">Resposta</th>${padrao.faixas
        .map((f) => `<th class="${CEL} text-right font-semibold">${escapeHtml(f.rotulo)}</th>`)
        .join(
            '',
        )}</tr></thead><tbody>${linha('releria', 'Releria?')}${linha('mostraria', 'Mostraria a alguém?')}</tbody></table></div>`;
}

function htmlDivergencias(dbRef, padrao) {
    const d = padrao.divergencias;
    if (!d.total) {
        return `<p class="text-xs text-gray-600 dark:text-slate-300">Nenhuma leitura em que os corações escolhidos diferem dos sugeridos.</p>`;
    }
    const linhas = d.linhas
        .slice(0, 10)
        .map((l) => {
            const texto = acharTextoDaLeitura(dbRef, l.tipo, l.textoId);
            const titulo = String(texto?.titulo || '').trim() || `#${l.textoId}`;
            return `<li>${escapeHtml(titulo)} <span class="text-gray-500 dark:text-slate-400">(${textoDoTipo(l.tipo)})</span>: sugerido ${numeroPt(l.sugerido)}, escolhido ${numeroPt(l.escolhido)}</li>`;
        })
        .join('');
    return `<p class="text-xs text-gray-600 dark:text-slate-300 mb-1">${d.total} ${d.total === 1 ? 'leitura' : 'leituras'} com escolha diferente da sugestão: ${d.acima} acima e ${d.abaixo} abaixo. Diferença média: ${d.mediaDiferenca > 0 ? '+' : ''}${numeroPt(d.mediaDiferenca)} corações.</p>
        <ul class="list-disc list-inside text-xs space-y-0.5">${linhas}</ul>
        ${d.total > 10 ? `<p class="text-xs text-gray-500 dark:text-slate-400 mt-1">Mostrando as 10 maiores diferenças.</p>` : ''}`;
}

const H5 = 'text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mt-4 mb-1';

export function htmlPadrao(dbRef, est) {
    const padrao = calcularPadrao(dbRef.leituras, {
        tipo: est.tipo || 'todos',
        classificacaoDe: (tipo, id) => acharTextoDaLeitura(dbRef, tipo, id)?.autoclassificacao,
    });
    const resumo = `Padrão das leituras (${padrao.totalComCoracoes} ${padrao.totalComCoracoes === 1 ? 'texto' : 'textos'} com corações)`;
    let corpo;
    if (!padrao.totalTextos) {
        corpo = `<p class="text-xs text-gray-600 dark:text-slate-300">Ainda não há leituras${est.tipo && est.tipo !== 'todos' ? ' neste tipo' : ''}. O padrão aparece depois de algumas leituras com corações escolhidos.</p>`;
    } else {
        corpo = `<p class="text-xs text-gray-600 dark:text-slate-300 mb-2">Cada texto conta uma vez, pela leitura mais recente dele. Os textos são separados em três faixas pela Classificação atual de cada um, os corações que você escolheu na leitura ou mudou no próprio texto (4 corações ou mais é a faixa dos preferidos, o mesmo corte do sorteio). Reler um texto sem mexer nos corações não o tira da faixa. Em "De que maneira te pegou", o número é o <strong>peso médio</strong> do item na faixa: pontual vale 1, marcante 2 e central 3, e quem não marcou o item conta 0, então vai de 0 a 3. O <strong>contraste</strong> é o peso da faixa alta menos o da baixa: mostra o que separa os textos que você mais ama dos que menos ama. O filtro Tipo da lista vale aqui também.</p>
            ${
                padrao.poucos
                    ? `<p class="text-xs text-amber-700 dark:text-amber-400 mb-2">Poucos textos com corações escolhidos (${padrao.totalComCoracoes}; o ideal é ${MINIMO_PARA_PADRAO} ou mais). Leia os números como indício, não como padrão.</p>`
                    : ''
            }
            ${padrao.semCoracoes ? `<p class="text-xs text-gray-500 dark:text-slate-400 mb-2">${padrao.semCoracoes} ${padrao.semCoracoes === 1 ? 'texto lido sem Classificação fica' : 'textos lidos sem Classificação ficam'} de fora das faixas.</p>` : ''}
            <h5 class="${H5}">De que maneira te pegou (peso médio de 0 a 3)</h5>
            <p class="text-xs text-gray-500 dark:text-slate-400 mb-1">Clique no nome de um item para ver, na lista abaixo, os textos que pegaram por ele.</p>${htmlTabelaPegou(padrao)}
            <h5 class="${H5}">O que incomodou</h5>
            <p class="text-xs text-gray-500 dark:text-slate-400 mb-1">Clique no nome de um item para ver, na lista abaixo, os textos que incomodaram por ele.</p>${htmlTabelaIncomodou(padrao)}
            <h5 class="${H5}">Releria e mostraria</h5>${htmlRespostasPadrao(padrao)}
            <h5 class="${H5}">Divergências entre sugerido e escolhido</h5>
            <p class="text-xs text-gray-500 dark:text-slate-400 mb-1">São os textos em que você discordou da sugestão. Mostram o que o formulário ainda não nomeia.</p>${htmlDivergencias(dbRef, padrao)}`;
    }
    return `<details class="mb-4 border border-gray-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900" ${est.padraoAberto ? 'open' : ''}
            ontoggle="leituraPadraoAberto(this.open)">
        <summary class="cursor-pointer select-none px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">${escapeHtml(resumo)}</summary>
        <div class="px-3 pb-3">${corpo}</div>
    </details>`;
}

export function htmlLeitura(dbRef, est) {
    if (!est.selecionado) {
        const filtros = FILTROS_LEITURA.map(
            (f) =>
                `<button type="button" onclick="leituraFiltrar('${f.id}')" aria-pressed="${est.filtro === f.id}"
                    class="${classeBtn(est.filtro === f.id)}">${f.rotulo}</button>`,
        ).join('');
        const filtrosClass = FILTROS_CLASSIFICACAO.map(
            (f) =>
                `<button type="button" onclick="leituraFiltrarClassificacao('${f.id}')" aria-pressed="${est.classificacao === f.id}"
                    class="${classeBtn(est.classificacao === f.id)}">${f.rotulo}</button>`,
        ).join('');
        const filtrosTipo = FILTROS_TIPO.map(
            (f) =>
                `<button type="button" onclick="leituraFiltrarTipo('${f.id}')" aria-pressed="${(est.tipo || 'todos') === f.id}"
                    class="${classeBtn((est.tipo || 'todos') === f.id)}">${f.rotulo}</button>`,
        ).join('');
        const filtrosPegou = [
            { id: 'todos', rotulo: 'Todos', descricao: '' },
            {
                id: FILTRO_ALGUM,
                rotulo: 'Algum',
                descricao: 'Textos com pelo menos um item marcado, mostrando quais.',
            },
            ...ITENS_PEGOU,
        ]
            .map(
                (f) =>
                    `<button type="button" onclick="leituraFiltrarPegou('${f.id}')" aria-pressed="${(est.pegou || 'todos') === f.id}"
                    ${f.descricao ? `title="${escapeHtml(f.descricao)}"` : ''}
                    class="${classeBtn((est.pegou || 'todos') === f.id)}">${escapeHtml(f.rotulo)}</button>`,
            )
            .join('');
        const filtrosIncomodou = [
            { id: 'todos', rotulo: 'Todos', descricao: '' },
            {
                id: FILTRO_ALGUM,
                rotulo: 'Algum',
                descricao: 'Textos com pelo menos um item marcado, mostrando quais.',
            },
            ...ITENS_INCOMODOU,
        ]
            .map(
                (f) =>
                    `<button type="button" onclick="leituraFiltrarIncomodou('${f.id}')" aria-pressed="${(est.incomodou || 'todos') === f.id}"
                    ${f.descricao ? `title="${escapeHtml(f.descricao)}"` : ''}
                    class="${classeBtn((est.incomodou || 'todos') === f.id)}">${escapeHtml(f.rotulo)}</button>`,
            )
            .join('');
        const botoesResposta = (campo, atual) =>
            FILTROS_RESPOSTA.map(
                (f) =>
                    `<button type="button" onclick="${campo}('${f.id}')" aria-pressed="${atual === f.id}"
                    class="${classeBtn(atual === f.id)}">${escapeHtml(f.rotulo)}</button>`,
            ).join('');
        const filtrosReleria = botoesResposta('leituraFiltrarReleria', est.releria || 'todos');
        const filtrosMostraria = botoesResposta(
            'leituraFiltrarMostraria',
            est.mostraria || 'todos',
        );
        return `${htmlPadrao(dbRef, est)}<div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por tipo">
                    <span class="text-xs text-gray-500 dark:text-slate-400 mr-1">Tipo:</span>${filtrosTipo}</div>
                <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por leitura">
                    <span class="text-xs text-gray-500 dark:text-slate-400 mr-1">Leitura:</span>${filtros}</div>
                <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por classificação">
                    <span class="text-xs text-gray-500 dark:text-slate-400 mr-1">Classificação:</span>${filtrosClass}</div>
                <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar pelo que pegou">
                    <span class="text-xs text-gray-500 dark:text-slate-400 mr-1">Pegou:</span>${filtrosPegou}</div>
                <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar pelo que incomodou">
                    <span class="text-xs text-gray-500 dark:text-slate-400 mr-1">Incomodou:</span>${filtrosIncomodou}</div>
                <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por Releria">
                    <span class="text-xs text-gray-500 dark:text-slate-400 mr-1">Releria:</span>${filtrosReleria}</div>
                <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por Mostraria a alguém">
                    <span class="text-xs text-gray-500 dark:text-slate-400 mr-1">Mostraria:</span>${filtrosMostraria}</div>
            </div>
            <input type="search" id="leitura-busca" value="${escapeHtml(est.busca)}"
                oninput="leituraBuscar(this.value)" placeholder="Buscar pelo título do texto..."
                class="w-full mb-3" />
            <div id="leitura-lista" class="bg-white dark:bg-slate-900 rounded shadow overflow-auto max-h-[70vh]">
                ${htmlListaTextos(dbRef, est.busca, est.filtro, est.classificacao, est.tipo || 'todos', est.pegou || 'todos', est.incomodou || 'todos', est.releria || 'todos', est.mostraria || 'todos')}
            </div>`;
    }
    const texto = acharTextoDaLeitura(dbRef, est.selecionado.tipo, est.selecionado.id);
    if (!texto || !est.rascunho) return '';
    const titulo = String(texto.titulo || '').trim() || `#${texto.id}`;
    return `<div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <button type="button" onclick="leituraVoltarLista()" class="${BTN_BASE} ${BTN_OFF}">← Outro texto</button>
            ${htmlNavegacao(est)}
            <span class="text-xs text-gray-500 dark:text-slate-400">O rascunho só é gravado em "Terminar leitura".</span>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
            <div class="relative">
                <div class="absolute top-3 right-5 z-10 flex items-center gap-1">
                    <button type="button" onclick="leituraVerTexto()" title="Ver" aria-label="Ver" class="${BTN_ICONE}">${ICONE_VER}</button>
                    <details data-menu-baixar-texto class="relative">
                        <summary title="Baixar título e texto" aria-label="Baixar título e texto" style="list-style:none" class="${BTN_ICONE} cursor-pointer select-none list-none">${ICONE_BAIXAR}</summary>
                        <div class="absolute right-0 mt-1 flex flex-col overflow-hidden rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow text-xs">
                            <button type="button" onclick="leituraBaixarTexto('md')" class="px-3 py-1.5 text-left whitespace-nowrap hover:bg-gray-100 dark:hover:bg-slate-700">.md</button>
                            <button type="button" onclick="leituraBaixarTexto('pdf')" class="px-3 py-1.5 text-left whitespace-nowrap hover:bg-gray-100 dark:hover:bg-slate-700">.pdf</button>
                        </div>
                    </details>
                </div>
                <article data-rolagem="texto" class="bg-white dark:bg-slate-900 rounded shadow p-5 overflow-auto max-h-[80vh]">
                    <h3 class="text-lg font-semibold mb-1 pr-20">${escapeHtml(titulo)}</h3>
                    <p class="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-4">${textoDoTipo(est.selecionado.tipo)}</p>
                    <div class="leading-relaxed whitespace-pre-wrap">${sanitizarTextoRico(texto.texto)}</div>
                </article>
            </div>
            <div data-rolagem="formulario" class="bg-white dark:bg-slate-900 rounded shadow p-5 overflow-auto max-h-[80vh]">
                ${htmlUltimaLeitura(dbRef, est.selecionado)}
                <h4 class="text-sm font-bold uppercase text-gray-500 dark:text-slate-400 mb-1">De que maneira te pegou</h4>
                <p class="text-xs text-gray-500 dark:text-slate-400 mb-2">Marque só o que pegou e diga de que maneira: pontual, marcante ou central. Clicar de novo na mesma maneira desmarca.</p>
                ${htmlPegou(est.rascunho)}
                <h4 class="text-sm font-bold uppercase text-gray-500 dark:text-slate-400 mt-5 mb-2">O que incomodou</h4>
                ${htmlIncomodou(est.rascunho)}
                <div class="mt-5">
                    ${htmlResposta(est.rascunho, 'releria', 'Releria?')}
                    ${htmlResposta(est.rascunho, 'mostraria', 'Mostraria a alguém?')}
                </div>
                <h4 class="text-sm font-bold uppercase text-gray-500 dark:text-slate-400 mt-5 mb-1">Avaliação</h4>
                <textarea id="leitura-avaliacao" rows="3" oninput="leituraAvaliacao(this.value)"
                    placeholder="Uma linha livre. É o mesmo campo Avaliação do modal do texto."
                    class="w-full">${escapeHtml(est.avaliacao)}</textarea>
                <h4 class="text-sm font-bold uppercase text-gray-500 dark:text-slate-400 mt-5 mb-2">Classificação</h4>
                ${htmlSugestao(texto, est.rascunho, est.escolhido)}
                <button type="button" onclick="leituraConcluir()"
                    class="mt-5 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 dark:hover:bg-blue-500">Terminar leitura</button>
            </div>
        </div>`;
}

// ─── DOM ────────────────────────────────────────────────────────

// Texto aberto no último desenho (ou null na lista): decide se a rolagem dos
// painéis é mantida.
let chaveUltimoRender = null;

export function renderLeituraAvaliativa() {
    const alvo = document.getElementById('leitura-conteudo');
    if (!alvo) return;
    // Rascunho que sobrou de uma visita anterior à aba: recomeça na lista.
    if (
        estado.selecionado &&
        !acharTextoDaLeitura(db, estado.selecionado.tipo, estado.selecionado.id)
    ) {
        reiniciarEstado();
    }
    // Cada clique no formulário redesenha a aba, e os dois painéis (texto e
    // formulário) rolam por conta própria: sem isto, voltam ao topo a cada
    // marca. Só vale para o mesmo texto; ao trocar de texto, recomeça no topo.
    const chave = estado.selecionado ? `${estado.selecionado.tipo}:${estado.selecionado.id}` : null;
    const rolagens = {};
    if (chave && chave === chaveUltimoRender) {
        alvo.querySelectorAll('[data-rolagem]').forEach((el) => {
            rolagens[el.dataset.rolagem] = el.scrollTop;
        });
    }
    alvo.innerHTML = htmlLeitura(db, estado);
    chaveUltimoRender = chave;
    alvo.querySelectorAll('[data-rolagem]').forEach((el) => {
        if (rolagens[el.dataset.rolagem]) el.scrollTop = rolagens[el.dataset.rolagem];
    });
}

function iniciarRascunho(tipo, id) {
    const texto = acharTextoDaLeitura(db, tipo, id);
    if (!texto) return false;
    estado.selecionado = { tipo, id: texto.id };
    estado.rascunho = novoRascunho(tipo, texto.id);
    estado.escolhido = null;
    estado.avaliacao = texto.autoavaliacao || '';
    return true;
}

export function aoSelecionarTextoLeitura(tipo, id) {
    if (iniciarRascunho(tipo, id)) {
        estado.fila = listarTextosParaLeitura(
            db,
            estado.busca,
            estado.filtro,
            estado.classificacao,
            estado.tipo,
            estado.pegou,
            estado.incomodou,
            estado.releria,
            estado.mostraria,
        ).map((l) => ({ tipo: l.tipo, id: l.id }));
        renderLeituraAvaliativa();
    }
}

// O rascunho tem algo que se perderia ao trocar de texto?
function rascunhoMexido() {
    const r = estado.rascunho;
    if (!r || !estado.selecionado) return false;
    const texto = acharTextoDaLeitura(db, estado.selecionado.tipo, estado.selecionado.id);
    return !!(
        r.pegou.length ||
        r.incomodou.length ||
        r.releria ||
        r.mostraria ||
        estado.escolhido !== null ||
        estado.avaliacao !== (texto?.autoavaliacao || '')
    );
}

// Vai para o texto anterior (-1) ou o próximo (+1) da fila, pulando os que
// foram excluídos. Rascunho com marcas pede confirmação antes de descartar.
export function aoNavegarLeitura(delta) {
    if (!estado.selecionado) return;
    const passo = Number(delta) < 0 ? -1 : 1;
    const pos = estado.fila.findIndex(
        (f) => f.tipo === estado.selecionado.tipo && String(f.id) === String(estado.selecionado.id),
    );
    if (pos < 0) return;
    let destino = null;
    for (let i = pos + passo; i >= 0 && i < estado.fila.length; i += passo) {
        if (acharTextoDaLeitura(db, estado.fila[i].tipo, estado.fila[i].id)) {
            destino = estado.fila[i];
            break;
        }
    }
    if (!destino) return;
    const ir = () => {
        if (iniciarRascunho(destino.tipo, destino.id)) renderLeituraAvaliativa();
    };
    if (!rascunhoMexido()) return ir();
    abrirModalConfirmacao({
        rotulo: 'Leitura avaliativa',
        titulo: 'Descartar o rascunho desta leitura?',
        mensagem: 'As marcas ainda não foram gravadas. Só "Terminar leitura" grava.',
        textoConfirmar: 'Descartar e ir',
        corConfirmar: '#2563eb',
        onConfirmar: ir,
    });
}

export function aoVoltarListaLeitura() {
    estado.selecionado = null;
    estado.rascunho = null;
    estado.escolhido = null;
    estado.avaliacao = '';
    renderLeituraAvaliativa();
}

export function aoFiltrarLeitura(filtro) {
    if (!FILTROS_LEITURA.some((f) => f.id === filtro)) return;
    estado.filtro = filtro;
    renderLeituraAvaliativa();
}

// Guarda só se o bloco está aberto (sem redesenhar).
export function aoAlternarPadraoLeitura(aberto) {
    estado.padraoAberto = !!aberto;
}

export function aoFiltrarTipoLeitura(filtro) {
    if (!FILTROS_TIPO.some((f) => f.id === filtro)) return;
    estado.tipo = filtro;
    renderLeituraAvaliativa();
}

// Filtra a lista pelo que pegou (um item de "De que maneira te pegou", ou "algum"), do peso maior ao menor.
export function aoFiltrarPegouLeitura(filtro) {
    if (filtro !== 'todos' && filtro !== FILTRO_ALGUM && !ITENS_PEGOU.some((i) => i.id === filtro))
        return;
    estado.pegou = filtro;
    renderLeituraAvaliativa();
}

// Do bloco "Padrão das leituras": clicar no item aplica o filtro "Pegou:" e leva a
// tela à lista. A lista traz todos os textos cuja leitura mais recente marcou o item,
// com ou sem corações escolhidos, então pode ter mais textos que a tabela.
export function aoAbrirItemPegouLeitura(item) {
    if (!ITENS_PEGOU.some((i) => i.id === item)) return;
    estado.pegou = item;
    renderLeituraAvaliativa();
    document.getElementById('leitura-lista')?.scrollIntoView?.({ block: 'start' });
}

// Filtra a lista pelo que incomodou (um item de "O que incomodou", ou "algum"). Combina com o
// filtro "Pegou:".
export function aoFiltrarIncomodouLeitura(filtro) {
    if (
        filtro !== 'todos' &&
        filtro !== FILTRO_ALGUM &&
        !ITENS_INCOMODOU.some((i) => i.id === filtro)
    )
        return;
    estado.incomodou = filtro;
    renderLeituraAvaliativa();
}

// Do bloco "Padrão das leituras": clicar no item aplica o filtro "Incomodou:" e leva
// a tela à lista, como no "Pegou:". A lista traz todos os textos cuja leitura mais
// recente marcou o item, com ou sem corações escolhidos.
export function aoAbrirItemIncomodouLeitura(item) {
    if (!ITENS_INCOMODOU.some((i) => i.id === item)) return;
    estado.incomodou = item;
    renderLeituraAvaliativa();
    document.getElementById('leitura-lista')?.scrollIntoView?.({ block: 'start' });
}

// Filtra a lista pela resposta de Releria ou de Mostraria na leitura mais recente (F22-D29).
// Combina com os outros filtros e entre si.
export function aoFiltrarReleriaLeitura(filtro) {
    if (!FILTROS_RESPOSTA.some((f) => f.id === filtro)) return;
    estado.releria = filtro;
    renderLeituraAvaliativa();
}

export function aoFiltrarMostrariaLeitura(filtro) {
    if (!FILTROS_RESPOSTA.some((f) => f.id === filtro)) return;
    estado.mostraria = filtro;
    renderLeituraAvaliativa();
}

export function aoFiltrarClassificacaoLeitura(filtro) {
    if (!FILTROS_CLASSIFICACAO.some((f) => f.id === filtro)) return;
    estado.classificacao = filtro;
    renderLeituraAvaliativa();
}

// Só a lista é redesenhada, para o campo de busca não perder o foco.
export function aoBuscarLeitura(valor) {
    estado.busca = String(valor || '');
    const lista = document.getElementById('leitura-lista');
    if (lista) {
        lista.innerHTML = htmlListaTextos(
            db,
            estado.busca,
            estado.filtro,
            estado.classificacao,
            estado.tipo,
            estado.pegou,
            estado.incomodou,
            estado.releria,
            estado.mostraria,
        );
    }
}

export function aoMarcarPegouLeitura(item, peso) {
    if (!estado.rascunho) return;
    estado.rascunho = marcarPegou(estado.rascunho, item, peso);
    renderLeituraAvaliativa();
}

export function aoAlternarIncomodouLeitura(id) {
    if (!estado.rascunho) return;
    estado.rascunho = alternarIncomodou(estado.rascunho, id);
    renderLeituraAvaliativa();
}

export function aoResponderLeitura(campo, resposta) {
    if (!estado.rascunho) return;
    estado.rascunho = responder(estado.rascunho, campo, resposta);
    renderLeituraAvaliativa();
}

// Clicar de novo no valor já escolhido desfaz a escolha (volta a "não gravar").
export function aoEscolherCoracoesLeitura(valor) {
    const n = Number(valor);
    if (!coracoesValidos(n)) return;
    estado.escolhido = estado.escolhido === n ? null : n;
    renderLeituraAvaliativa();
}

// Sem redesenhar: o texto digitado fica no próprio campo.
export function aoDigitarAvaliacaoLeitura(valor) {
    estado.avaliacao = String(valor || '');
}

// Copia a última leitura do texto para o rascunho (a linha livre e os
// corações escolhidos não vêm: a primeira é do texto, os segundos são desta
// leitura).
export function aoPartirDaUltimaLeitura() {
    if (!estado.selecionado || !estado.rascunho) return;
    const u = ultimaLeituraDoTexto(db, estado.selecionado.tipo, estado.selecionado.id);
    if (!u) return;
    estado.rascunho = {
        ...estado.rascunho,
        pegou: u.pegou,
        incomodou: u.incomodou,
        releria: u.releria,
        mostraria: u.mostraria,
    };
    renderLeituraAvaliativa();
}

function terminar(substituir) {
    const resultado = concluirLeitura(db, estado.rascunho, {
        escolhido: estado.escolhido,
        avaliacao: estado.avaliacao,
        substituir,
        id: gerarId(),
        hoje: hojeIso(),
    });
    if (resultado.ok) {
        save();
        const { tipo, id } = estado.selecionado;
        const partes = ['Leitura registrada'];
        if (resultado.gravouClassificacao) partes.push('Classificação do texto atualizada');
        if (resultado.gravouAvaliacao) partes.push('Avaliação do texto atualizada');
        mostrarAviso(`${partes.join('. ')}.`, 'sucesso');
        iniciarRascunho(tipo, id);
        // O formulário recomeça em branco: volta os painéis ao topo.
        chaveUltimoRender = null;
        renderLeituraAvaliativa();
        return;
    }
    if (resultado.motivo === 'confirmar-troca') {
        abrirModalConfirmacao({
            rotulo: 'Classificação do texto',
            titulo: `Trocar ${formatarCoracoes(resultado.atual)} por ${formatarCoracoes(resultado.novo)}?`,
            mensagem:
                'A leitura é registrada e a Classificação do texto muda. Isso vale também no sorteio de leitura.',
            textoConfirmar: 'Trocar',
            corConfirmar: '#2563eb',
            onConfirmar: () => terminar(true),
        });
        return;
    }
    mostrarAviso(
        resultado.motivo === 'sem-texto'
            ? 'O texto desta leitura não existe mais.'
            : `Não foi possível registrar a leitura. ${(resultado.erros || []).join(' ')}`.trim(),
    );
}

export function aoConcluirLeitura() {
    if (!estado.selecionado || !estado.rascunho) return;
    terminar(false);
}

// ─── Ver e Baixar o texto aberto ────────────────────────────────

// O Ver abre o modal por cima da aba: o rascunho em memória não é mexido.
export async function aoVerTextoLeitura() {
    const sel = estado.selecionado;
    if (!sel) return;
    const { abrirVisualizacao } = await import('./visualizar.js');
    await abrirVisualizacao(sel.tipo, sel.id);
}

export async function aoBaixarTextoLeitura(formato = 'md') {
    document.querySelector('[data-menu-baixar-texto]')?.removeAttribute('open');
    const sel = estado.selecionado;
    if (!sel) return;
    const texto = acharTextoDaLeitura(db, sel.tipo, sel.id);
    if (!texto) return mostrarAviso('Texto não encontrado.');
    const { baixarTituloETexto } = await import('./leitura-avaliativa-texto.js');
    baixarTituloETexto(sel.tipo, texto, formato);
}
