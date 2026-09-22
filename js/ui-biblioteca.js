// ============================================================
// ui-biblioteca.js — DOM da aba "Biblioteca" (grupo Dados):
// lista os pacotes de obras em domínio público que acompanham o app
// (pasta `biblioteca/`), mostra a proveniência de cada um e entrega o
// escolhido pra Importação Aditiva — que continua sendo quem resolve
// Autor/Livro/duplicata de título e tira o snapshot. Esta aba é só um
// adaptador: nunca escreve em `db`.
//
// Pacotes são arquivos estáticos (JSON no formato da Exportação Geral
// mais `pacote` e `autores`, ver scripts/montar-pacote.js), carregados
// com `fetch` — mesmo requisito dos modais (servidor local ou Netlify,
// não `file://`).
// ============================================================

import {
    escapeHtml,
    mostrarAviso,
    situacaoDominioPublico,
    rotuloDominioPublico as rotuloDominioPublicoBase,
} from './utils.js';
import { carregarPayloadImportacaoAditiva } from './ui-importar-aditivo.js';
import {
    prepararFormTextoBiblioteca,
    atualizarPreviaTextoBiblioteca,
} from './ui-biblioteca-texto.js';

const PASTA = 'biblioteca/';
const PADRAO_SEGURO = /^[a-z0-9][a-z0-9-]*(\.json)?$/;

let _indice = null; // { pacotes: [...] } — cache da sessão
let _pacoteAtual = null; // payload completo do pacote aberto no detalhe
let _idAtual = null;

function idSeguro(valor) {
    return typeof valor === 'string' && PADRAO_SEGURO.test(valor);
}

async function buscarJson(nomeArquivo) {
    const resp = await fetch(PASTA + nomeArquivo);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}

// Reexportada daqui pra não quebrar quem já importava de ui-biblioteca.js.
export { situacaoDominioPublico };

function rotuloDominioPublico(sit) {
    const t = rotuloDominioPublicoBase(sit);
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function classeDominioPublico(sit) {
    return sit.estado === 'livre'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400';
}

function renderCartao(p) {
    const ativo = p.id === _idAtual;
    return `<button
        type="button"
        onclick="selecionarPacoteBiblioteca('${escapeHtml(p.id)}')"
        class="text-left border rounded-xl p-4 bg-white dark:bg-slate-900 hover:border-blue-400 ${
            ativo ? 'border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-slate-700'
        }"
    >
        <div class="font-semibold text-sm">${escapeHtml(p.titulo)}</div>
        <div class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            ${escapeHtml(p.autor || '')} · ${Number(p.quantidade) || 0} texto(s)
        </div>
        ${
            p.descricao
                ? `<p class="text-xs text-gray-400 dark:text-slate-500 mt-2">${escapeHtml(p.descricao)}</p>`
                : ''
        }
    </button>`;
}

export async function renderBiblioteca() {
    // "Importar de texto" não depende do catálogo (fetch): prepara antes.
    prepararFormTextoBiblioteca();
    atualizarPreviaTextoBiblioteca();

    const lista = document.getElementById('biblioteca-lista');
    if (!lista) return;

    if (!_indice) {
        lista.innerHTML = `<p class="text-xs text-gray-400 dark:text-slate-500">Carregando pacotes…</p>`;
        try {
            _indice = await buscarJson('indice.json');
        } catch {
            lista.innerHTML = `<p class="text-xs text-red-600 dark:text-red-400">
                Não foi possível carregar a Biblioteca. Ela precisa do app rodando num servidor
                (Live Server ou o site hospedado) — abrir o index.html direto do disco bloqueia
                o carregamento dos pacotes.
            </p>`;
            return;
        }
    }

    const pacotes = (_indice.pacotes || []).filter((p) => idSeguro(p?.id) && idSeguro(p?.arquivo));
    lista.innerHTML = pacotes.length
        ? pacotes.map(renderCartao).join('')
        : `<p class="text-xs text-gray-400 dark:text-slate-500">Nenhum pacote disponível ainda.</p>`;
}

function renderDetalhe() {
    const el = document.getElementById('biblioteca-detalhe');
    if (!el) return;
    if (!_pacoteAtual) {
        el.classList.add('hidden');
        el.innerHTML = '';
        return;
    }

    const meta = _pacoteAtual.pacote || {};
    const autores = Array.isArray(_pacoteAtual.autores) ? _pacoteAtual.autores : [];
    const itens = _pacoteAtual.itens || [];
    // Pacote com Poema e Prosa juntos (ex.: Machado de Assis) rotula cada
    // texto; pacote de um tipo só não precisa repetir o rótulo em toda linha.
    const misto = new Set(itens.map((it) => (it.tipo === 'prosa' ? 'prosa' : 'poema'))).size > 1;

    const autoresHtml = autores
        .map((a) => {
            const sit = situacaoDominioPublico(a);
            return `<li>
                ${escapeHtml(a.nome)}
                ${a.nacionalidade ? `<span class="text-gray-400 dark:text-slate-500">(${escapeHtml(a.nacionalidade)})</span>` : ''}
                — <span class="${classeDominioPublico(sit)}">${escapeHtml(rotuloDominioPublico(sit))}</span>
            </li>`;
        })
        .join('');

    const link = /^https?:\/\//.test(meta.link || '')
        ? `<a href="${escapeHtml(meta.link)}" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 dark:text-blue-400 break-all">${escapeHtml(meta.link)}</a>`
        : '';

    const avisoConferencia = meta.conferido
        ? ''
        : `<p class="text-xs text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-md p-2">
            Texto ainda não conferido com a edição de origem. Vale comparar antes de usar em
            análise (grafia, pontuação, versos).
        </p>`;

    const avisoLicenca = autores.some((a) => situacaoDominioPublico(a).estado !== 'livre')
        ? `<p class="text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-md p-2">
            Ao menos um autor não tem domínio público confirmado pelo ano de óbito. O cálculo é
            informativo e não substitui orientação jurídica; edições, traduções e notas críticas
            podem ter proteção própria.
        </p>`
        : '';

    el.classList.remove('hidden');
    el.innerHTML = `
        <div class="flex justify-between items-start gap-3">
            <div>
                <h3 class="text-base font-semibold">${escapeHtml(meta.titulo || '')}</h3>
                ${meta.descricao ? `<p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">${escapeHtml(meta.descricao)}</p>` : ''}
            </div>
            <button type="button" onclick="fecharDetalhePacoteBiblioteca()"
                class="text-xs text-gray-500 dark:text-slate-400 underline whitespace-nowrap">Fechar</button>
        </div>

        <dl class="text-xs grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
            <dt class="font-medium">Fonte</dt>
            <dd>${escapeHtml(meta.fonte || 'não informada')}</dd>
            <dt class="font-medium">Edição</dt>
            <dd>${escapeHtml(meta.edicao || 'não informada')}</dd>
            ${link ? `<dt class="font-medium">Link</dt><dd>${link}</dd>` : ''}
            ${meta.ortografia ? `<dt class="font-medium">Ortografia</dt><dd>${escapeHtml(meta.ortografia)}</dd>` : ''}
        </dl>

        <ul class="text-xs list-disc ml-4 space-y-0.5">${autoresHtml}</ul>
        ${avisoLicenca}
        ${avisoConferencia}

        <details class="text-xs">
            <summary class="cursor-pointer font-medium">${itens.length} texto(s) no pacote</summary>
            <ol class="list-decimal ml-6 mt-1 text-gray-500 dark:text-slate-400">
                ${itens
                    .map(
                        (it) =>
                            `<li>${escapeHtml(it.titulo)}${
                                misto
                                    ? ` <span class="text-gray-400 dark:text-slate-500">— ${it.tipo === 'prosa' ? 'prosa' : 'poema'}</span>`
                                    : ''
                            }</li>`,
                    )
                    .join('')}
            </ol>
        </details>

        <div class="flex gap-2 items-center">
            <button type="button" onclick="usarPacoteBiblioteca()"
                class="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold whitespace-nowrap">
                Usar este pacote
            </button>
            <span class="text-xs text-gray-400 dark:text-slate-500">
                Abre a Importação com o pacote carregado; nada entra no acervo antes de você aplicar.
            </span>
        </div>`;
}

export async function selecionarPacoteBiblioteca(id) {
    const entrada = (_indice?.pacotes || []).find((p) => p.id === id);
    if (!entrada || !idSeguro(entrada.arquivo)) return;

    try {
        // `arquivo` no índice vem sem extensão (montarIndice em scripts/montar-pacote.js).
        _pacoteAtual = await buscarJson(`${entrada.arquivo}.json`);
    } catch {
        _pacoteAtual = null;
        _idAtual = null;
        mostrarAviso('Não foi possível carregar esse pacote.');
        renderDetalhe();
        renderBiblioteca();
        return;
    }
    _idAtual = id;
    renderDetalhe();
    renderBiblioteca();
}

export function fecharDetalhePacoteBiblioteca() {
    _pacoteAtual = null;
    _idAtual = null;
    renderDetalhe();
    renderBiblioteca();
}

// Entrega o pacote aberto à Importação Aditiva. Devolve true se a
// aba de destino deve ser aberta (main.js faz o abrirAba).
export function usarPacoteBiblioteca() {
    if (!_pacoteAtual) return false;
    if (!carregarPayloadImportacaoAditiva(_pacoteAtual)) {
        mostrarAviso('Esse pacote não tem nenhum Poema/Prosa pra importar.');
        return false;
    }
    return true;
}
