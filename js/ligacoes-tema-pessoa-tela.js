// ============================================================
// ligacoes-tema-pessoa-tela.js — tela de análise "Tema × Pessoa" na aba
// Cruzamentos (T14, entrega 2).
//
// A lógica dos dados mora em ligacoes-tema-pessoa.js (sem DOM). Aqui ficam:
//   - o estado da tela (só em memória: aberta ou fechada, texto atual e
//     rascunho das marcas), nunca guardado no banco;
//   - `dadosTelaLigacoes` e `htmlPainelLigacoes`, que montam a visão sem
//     tocar no documento (por isso dá para testar);
//   - os handlers `onclick` inline, como o resto da aba.
//
// A tela só grava quando o Victor clica em "Salvar e próximo" ou em "Voltar a
// não analisado". Marcar e desmarcar caixas mexe só no rascunho.
// ============================================================

import { db, save } from './db.js';
import { escapeHtml } from './utils.js';
import {
    estadoAnaliseLigacoes,
    resumoAnaliseLigacoes,
    grade,
    gravarLigacoes,
    limparLigacoes,
} from './ligacoes-tema-pessoa.js';

const estado = {
    aberto: false,
    incluirAnalisados: false,
    busca: '', // trecho do título
    temaFiltro: '', // id do Tema (texto) ou ''
    pessoaFiltro: '', // id da Pessoa (texto) ou ''
    posicao: 0,
    chave: null, // "tipo:id" do texto cujo rascunho está em `rascunho`
    rascunho: new Set(), // "temaId|pessoaId" dos pares desligados
};

// A matriz de Cruzamentos usa as ligações; quem a desenha se registra aqui para
// ser redesenhada quando uma análise é gravada ou apagada.
let aoMudar = () => {};
export function aoMudarLigacoes(fn) {
    aoMudar = typeof fn === 'function' ? fn : () => {};
}

const chavePar = (temaId, pessoaId) => `${temaId}|${pessoaId}`;
const chaveTexto = (tipo, texto) => `${tipo}:${texto.id}`;
const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

export function estadoDaTelaLigacoes() {
    return {
        aberto: estado.aberto,
        incluirAnalisados: estado.incluirAnalisados,
        posicao: estado.posicao,
    };
}

export function reiniciarTelaLigacoes() {
    estado.aberto = false;
    estado.incluirAnalisados = false;
    estado.busca = '';
    estado.temaFiltro = '';
    estado.pessoaFiltro = '';
    estado.posicao = 0;
    estado.chave = null;
    estado.rascunho = new Set();
}

// Fila da tela. Por padrão, só os textos ainda não analisados ou a revisar
// (a mesma regra de `filaAnaliseLigacoes`). Com `incluirAnalisados`, entram
// também os já analisados, para corrigir uma análise antiga.
const semAcento = (t) =>
    String(t ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

// Os filtros (busca no título, Tema e Pessoa do texto) só recortam a fila: não
// mudam o progresso \"n de N\" nem o que está gravado.
export function textoPassaNosFiltros(
    texto,
    { busca = '', temaFiltro = '', pessoaFiltro = '' } = {},
) {
    if (busca && !semAcento(texto?.titulo).includes(semAcento(busca))) return false;
    if (temaFiltro && !grade(texto).temaIds.some((id) => mesmoId(id, temaFiltro))) return false;
    if (pessoaFiltro && !grade(texto).pessoaIds.some((id) => mesmoId(id, pessoaFiltro)))
        return false;
    return true;
}

export function filaDaTelaLigacoes(dbRef, incluirAnalisados = false, filtros = {}) {
    const fila = [];
    [
        ['poema', dbRef?.poemas],
        ['prosa', dbRef?.prosas],
    ].forEach(([tipo, lista]) => {
        (lista || []).forEach((texto) => {
            const situacao = estadoAnaliseLigacoes(texto);
            if (situacao === 'sem-ambiguidade') return;
            if (situacao === 'analisado' && !incluirAnalisados) return;
            if (!textoPassaNosFiltros(texto, filtros)) return;
            fila.push({ tipo, texto, estado: situacao });
        });
    });
    return fila;
}

// Temas e Pessoas que aparecem nos textos da fila (sem filtro), para as listas
// dos filtros só mostrarem o que existe ali. Ordem alfabética.
export function opcoesDeFiltroLigacoes(dbRef, incluirAnalisados = false) {
    const temas = new Map();
    const pessoas = new Map();
    filaDaTelaLigacoes(dbRef, incluirAnalisados).forEach(({ texto }) => {
        const g = grade(texto);
        g.temaIds.forEach((id) => temas.set(String(id), nomePorId(dbRef?.temas, id)));
        g.pessoaIds.forEach((id) => pessoas.set(String(id), nomePorId(dbRef?.pessoas, id)));
    });
    const lista = (m) =>
        [...m]
            .map(([id, nome]) => ({ id, nome }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return { temas: lista(temas), pessoas: lista(pessoas) };
}

function nomePorId(lista, id) {
    const item = (lista || []).find((x) => mesmoId(x?.id, id));
    return item?.nome || '(apagado)';
}

// Tudo o que a tela mostra, sem DOM. `rascunho` é o Set de pares desligados
// em edição; sem ele, vale o que está gravado no texto.
export function dadosTelaLigacoes(
    dbRef,
    {
        posicao = 0,
        incluirAnalisados = false,
        rascunho,
        busca = '',
        temaFiltro = '',
        pessoaFiltro = '',
    } = {},
) {
    const resumo = resumoAnaliseLigacoes(dbRef);
    const opcoes = opcoesDeFiltroLigacoes(dbRef, incluirAnalisados);
    // Filtro que aponta para algo que saiu da fila deixa de valer.
    const tema = opcoes.temas.some((t) => t.id === String(temaFiltro)) ? String(temaFiltro) : '';
    const pessoa = opcoes.pessoas.some((x) => x.id === String(pessoaFiltro))
        ? String(pessoaFiltro)
        : '';
    const filtros = { busca: String(busca || ''), temaFiltro: tema, pessoaFiltro: pessoa };
    const filtrando = Boolean(filtros.busca.trim() || tema || pessoa);
    const fila = filaDaTelaLigacoes(dbRef, incluirAnalisados, filtros);
    const base = { resumo, opcoes, filtros, filtrando, incluirAnalisados };
    if (!fila.length) {
        const haFila = opcoes.temas.length > 0 || opcoes.pessoas.length > 0;
        return { ...base, fila, vazio: true, semResultado: filtrando && haFila };
    }
    const pos = Math.min(Math.max(posicao, 0), fila.length - 1);
    const { tipo, texto, estado: situacao } = fila[pos];
    const g = grade(texto);
    const desligados = rascunho
        ? rascunho
        : new Set(
              g.celulas
                  .flat()
                  .filter((c) => !c.ligado)
                  .map((c) => chavePar(c.temaId, c.pessoaId)),
          );
    return {
        ...base,
        fila,
        vazio: false,
        posicao: pos,
        tipo,
        texto,
        situacao,
        titulo: texto.titulo || '(sem título)',
        temas: g.temaIds.map((id) => ({ id, nome: nomePorId(dbRef?.temas, id) })),
        pessoas: g.pessoaIds.map((id) => ({ id, nome: nomePorId(dbRef?.pessoas, id) })),
        desligados,
    };
}

const ROTULO_SITUACAO = {
    'nao-analisado': 'Não analisado',
    revisar: 'A revisar: o texto ganhou Tema ou Pessoa depois da análise',
    analisado: 'Já analisado',
};

function htmlGrade(d) {
    const th =
        'px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap';
    const cabecalho = d.pessoas.map((p) => `<th class="${th}">${escapeHtml(p.nome)}</th>`).join('');
    const linhas = d.temas
        .map((tema, i) => {
            const celulas = d.pessoas
                .map((pessoa, j) => {
                    const ligado = !d.desligados.has(chavePar(tema.id, pessoa.id));
                    const titulo = `${tema.nome} × ${pessoa.nome}`;
                    return `<td class="px-2 py-1.5 text-center"><input type="checkbox" ${ligado ? 'checked' : ''} aria-label="${escapeHtml(titulo)}" title="${escapeHtml(titulo)}" onchange="alternarLigacaoTemaPessoa(${i}, ${j}, this.checked)"></td>`;
                })
                .join('');
            return `<tr><th class="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">${escapeHtml(tema.nome)}</th>${celulas}</tr>`;
        })
        .join('');
    return `<div class="overflow-x-auto"><table class="border-collapse"><thead><tr><th class="px-2 py-1.5 text-left text-[10px] text-gray-400">Tema × pessoa</th>${cabecalho}</tr></thead><tbody>${linhas}</tbody></table></div>`;
}

const BOTAO =
    'px-2 py-1 rounded text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-40';
const BOTAO_PRINCIPAL = 'px-3 py-1 rounded text-xs font-semibold bg-blue-600 text-white';

// HTML do cartão inteiro (título, progresso e, se aberto, a análise).
export function htmlPainelLigacoes(dbRef, opcoes = {}) {
    const aberto = Boolean(opcoes.aberto);
    const d = dadosTelaLigacoes(dbRef, opcoes);
    const r = d.resumo;
    const progresso = r.total
        ? `${r.analisados} de ${r.total} textos com 2 ou mais pessoas e algum tema já analisados` +
          (r.pendentes || r.revisar
              ? ` (${r.pendentes} por analisar${r.revisar ? `, ${r.revisar} a revisar` : ''})`
              : '')
        : 'Nenhum texto tem 2 ou mais pessoas junto com algum tema, então não há nada a analisar.';
    const cabecalho = `<div class="flex justify-between items-center gap-3 flex-wrap">
        <div>
            <h3 class="text-sm font-bold text-gray-600 dark:text-slate-300">Ligações tema × pessoa por texto</h3>
            <p class="text-[10px] text-gray-400 mt-1">Num texto com várias pessoas, diga a quais delas cada tema se refere. ${escapeHtml(progresso)}</p>
        </div>
        ${r.total ? `<button type="button" onclick="abrirPainelLigacoesTemaPessoa(${!aberto})" class="${BOTAO}">${aberto ? 'Fechar análise ▴' : 'Analisar textos ▾'}</button>` : ''}
    </div>`;
    if (!aberto || !r.total) return cabecalho;

    const alternarAnalisados = `<label class="flex items-center gap-1 text-[11px] cursor-pointer"><input type="checkbox" ${d.incluirAnalisados ? 'checked' : ''} onchange="definirIncluirAnalisadosLigacoes(this.checked)"> Incluir textos já analisados</label>`;
    const opcaoHtml = (lista, atual) =>
        lista
            .map(
                (o) =>
                    `<option value="${escapeHtml(o.id)}" ${o.id === atual ? 'selected' : ''}>${escapeHtml(o.nome)}</option>`,
            )
            .join('');
    const barraFiltros = `<div class="flex items-center gap-2 flex-wrap">
            <input id="busca-ligacoes-tema-pessoa" type="search" placeholder="Buscar texto pelo título…" value="${escapeHtml(d.filtros.busca)}" oninput="definirBuscaLigacoes(this.value)" class="text-xs w-full md:w-56" style="margin:0">
            <select id="filtro-tema-ligacoes" aria-label="Filtrar por tema" onchange="definirFiltroTemaLigacoes(this.value)" style="width:auto;margin:0">
                <option value="">Todos os temas</option>${opcaoHtml(d.opcoes.temas, d.filtros.temaFiltro)}
            </select>
            <select id="filtro-pessoa-ligacoes" aria-label="Filtrar por pessoa" onchange="definirFiltroPessoaLigacoes(this.value)" style="width:auto;margin:0">
                <option value="">Todas as pessoas</option>${opcaoHtml(d.opcoes.pessoas, d.filtros.pessoaFiltro)}
            </select>
            ${d.filtrando ? `<button type="button" onclick="limparFiltrosLigacoes()" class="${BOTAO}">Limpar filtros</button>` : ''}
        </div>`;
    if (d.vazio) {
        const msg = d.semResultado
            ? 'Nenhum texto da fila bate com a busca e os filtros.'
            : 'Fila vazia: todos os textos com ambiguidade já foram analisados.';
        return `${cabecalho}<div class="mt-3 flex flex-col gap-2">
            ${d.semResultado ? barraFiltros : ''}
            <p class="text-xs text-gray-500 dark:text-slate-400">${msg}</p>
            ${alternarAnalisados}</div>`;
    }
    const desfazer =
        d.situacao === 'analisado' || d.situacao === 'revisar'
            ? `<button type="button" onclick="voltarLigacoesNaoAnalisado()" class="${BOTAO}" title="Apaga as marcas deste texto; ele volta a contar o tema para todas as pessoas">Voltar a não analisado</button>`
            : '';
    return `${cabecalho}<div class="mt-3 flex flex-col gap-3">
        <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs text-gray-500 dark:text-slate-400">Texto ${d.posicao + 1} de ${d.fila.length} na fila${d.filtrando ? ' (filtrada)' : ''}</span>
            ${alternarAnalisados}
        </div>
        ${barraFiltros}
        <div>
            <button type="button" onclick="abrirTextoDaAnaliseLigacoes()" class="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left">${escapeHtml(d.titulo)}</button>
            <span class="text-[10px] text-gray-400 ml-1">${d.tipo === 'prosa' ? 'prosa' : 'poema'} · ${escapeHtml(ROTULO_SITUACAO[d.situacao] || '')}</span>
        </div>
        <p class="text-[10px] text-gray-400">Tudo começa marcado (o tema se liga à pessoa). Desmarque só o que não se liga. Salvar sem desmarcar nada vale como "o tema se liga a todas".</p>
        ${htmlGrade(d)}
        <div class="flex items-center gap-2 flex-wrap">
            <button type="button" onclick="navegarAnaliseLigacoes(-1)" class="${BOTAO}" ${d.posicao === 0 ? 'disabled' : ''}>← Anterior</button>
            <button type="button" onclick="navegarAnaliseLigacoes(1)" class="${BOTAO}" ${d.posicao >= d.fila.length - 1 ? 'disabled' : ''}>Pular →</button>
            <button type="button" onclick="marcarTudoLigacoesTemaPessoa()" class="${BOTAO}">Marcar tudo</button>
            ${desfazer}
            <button type="button" onclick="salvarLigacoesTemaPessoa()" class="${BOTAO_PRINCIPAL}">Salvar e próximo</button>
        </div>
    </div>`;
}

function opcoesAtuais() {
    return {
        aberto: estado.aberto,
        incluirAnalisados: estado.incluirAnalisados,
        posicao: estado.posicao,
        busca: estado.busca,
        temaFiltro: estado.temaFiltro,
        pessoaFiltro: estado.pessoaFiltro,
        rascunho: estado.chave ? estado.rascunho : undefined,
    };
}

// Garante que o rascunho pertence ao texto que a tela mostra agora.
function sincronizarRascunho() {
    const d = dadosTelaLigacoes(db, { ...opcoesAtuais(), rascunho: undefined });
    if (d.vazio) {
        estado.chave = null;
        estado.rascunho = new Set();
        return d;
    }
    estado.posicao = d.posicao;
    const chave = chaveTexto(d.tipo, d.texto);
    if (estado.chave !== chave) {
        estado.chave = chave;
        estado.rascunho = new Set(d.desligados);
    }
    return d;
}

export function renderPainelLigacoes() {
    const el =
        typeof document !== 'undefined'
            ? document.getElementById('painel-ligacoes-tema-pessoa')
            : null;
    if (!el) return;
    if (estado.aberto) sincronizarRascunho();
    el.innerHTML = htmlPainelLigacoes(db, opcoesAtuais());
}

function textoAtual() {
    const d = sincronizarRascunho();
    return d.vazio ? null : d;
}

function abrirPainel(aberto) {
    estado.aberto = Boolean(aberto);
    estado.chave = null;
    renderPainelLigacoes();
}

function definirIncluirAnalisados(ativo) {
    estado.incluirAnalisados = Boolean(ativo);
    estado.posicao = 0;
    estado.chave = null;
    renderPainelLigacoes();
}

// Refaz o cartão e devolve o foco (e o cursor) à caixa de busca, que o redesenho
// recria a cada tecla.
function aplicarFiltros(manterFocoNaBusca = false) {
    estado.posicao = 0;
    estado.chave = null;
    renderPainelLigacoes();
    if (!manterFocoNaBusca || typeof document === 'undefined') return;
    const campo = document.getElementById('busca-ligacoes-tema-pessoa');
    if (!campo) return;
    campo.focus();
    const fim = campo.value.length;
    campo.setSelectionRange?.(fim, fim);
}

function definirBusca(valor) {
    estado.busca = String(valor ?? '');
    aplicarFiltros(true);
}

function definirFiltroTema(valor) {
    estado.temaFiltro = String(valor ?? '');
    aplicarFiltros();
}

function definirFiltroPessoa(valor) {
    estado.pessoaFiltro = String(valor ?? '');
    aplicarFiltros();
}

function limparFiltros() {
    estado.busca = '';
    estado.temaFiltro = '';
    estado.pessoaFiltro = '';
    aplicarFiltros();
}

function navegar(delta) {
    estado.posicao = Math.max(0, estado.posicao + delta);
    estado.chave = null;
    renderPainelLigacoes();
}

function alternarPar(i, j, ligado) {
    const d = textoAtual();
    if (!d) return;
    const tema = d.temas[i];
    const pessoa = d.pessoas[j];
    if (!tema || !pessoa) return;
    const chave = chavePar(tema.id, pessoa.id);
    if (ligado) estado.rascunho.delete(chave);
    else estado.rascunho.add(chave);
}

function marcarTudo() {
    if (!textoAtual()) return;
    estado.rascunho = new Set();
    renderPainelLigacoes();
}

// Grava o rascunho. O texto sai da fila (fica "analisado"), então a posição
// continua a mesma e já aponta para o texto seguinte; com "Incluir textos já
// analisados" ligado, o texto fica na fila e a posição avança um.
function salvarEProximo() {
    const d = textoAtual();
    if (!d) return;
    const desligados = [];
    d.temas.forEach((tema) => {
        d.pessoas.forEach((pessoa) => {
            if (estado.rascunho.has(chavePar(tema.id, pessoa.id))) {
                desligados.push({ temaId: tema.id, pessoaId: pessoa.id });
            }
        });
    });
    gravarLigacoes(d.texto, desligados);
    save();
    aoMudar();
    if (estado.incluirAnalisados) estado.posicao += 1;
    estado.chave = null;
    renderPainelLigacoes();
}

function voltarNaoAnalisado() {
    const d = textoAtual();
    if (!d) return;
    limparLigacoes(d.texto);
    save();
    aoMudar();
    // Com a fila sem os analisados o texto não sai (volta a "não analisado").
    estado.chave = null;
    renderPainelLigacoes();
}

async function abrirTextoDaAnalise() {
    const d = textoAtual();
    if (!d) return;
    const { abrirVisualizacao } = await import('./visualizar.js');
    await abrirVisualizacao(d.tipo, d.texto.id);
}

// Handlers globais usados pelos botões do cartão (onclick inline, como a matriz).
window.abrirPainelLigacoesTemaPessoa = abrirPainel;
window.definirIncluirAnalisadosLigacoes = definirIncluirAnalisados;
window.navegarAnaliseLigacoes = navegar;
window.definirBuscaLigacoes = definirBusca;
window.definirFiltroTemaLigacoes = definirFiltroTema;
window.definirFiltroPessoaLigacoes = definirFiltroPessoa;
window.limparFiltrosLigacoes = limparFiltros;
window.alternarLigacaoTemaPessoa = alternarPar;
window.marcarTudoLigacoesTemaPessoa = marcarTudo;
window.salvarLigacoesTemaPessoa = salvarEProximo;
window.voltarLigacoesNaoAnalisado = voltarNaoAnalisado;
window.abrirTextoDaAnaliseLigacoes = abrirTextoDaAnalise;
