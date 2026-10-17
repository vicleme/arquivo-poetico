// ============================================================
// editor.js — Toolbar de formatação, tags/sinalizações, UX
// Importado por: main.js (inicialização)
// ============================================================

import {
    db,
    obterOuCriarPessoaPorNome,
    obterOuCriarAutorPorNome,
    obterOuCriarGrupoPorNome,
    obterOuCriarMovimentoEscolaPorNome,
    nivelGrupo,
} from './db.js';
import {
    opcoesLocaisParaCampo,
    localDoTextoDigitado,
    entradaDeLocal,
    rotuloLocal,
    rotuloCaminhoLocal,
    limparNomeLocal,
    nomesTerritorialidade,
} from './locais.js';
import {
    resumoTemas,
    assuntosComPapelDeEntradas,
    podarExcecoesAssunto,
    idsAssuntosExcluidos,
    podarSobrescritasAssunto,
    normalizarPapelTema,
    ROTULOS_PAPEL_TEMA,
    chaveTema,
    temasDoTexto,
    extrairSinalizacoesUnicas,
    textoDeEtiquetas,
    extrairGenerosUnicos,
    extrairValoresUnicosDeAnotacoes,
    extrairValoresUnicosDeIntertextualidade,
    extrairTiposIntertextoUnicos,
    extrairValoresUnicosDeReferenciasExternas,
    extrairTiposReferenciaExternaUnicos,
    extrairTiposHipertextualidadeUnicos,
    extrairRelacoesHipertextualidadeUnicas,
    extrairHipotextosUnicos,
    corpoEntradaHipertextualidade,
    extrairIdiomasUnicos,
    extrairFontesUnicas,
    extrairMeiosEnviosUnicos,
    extrairPremiosUnicos,
    escapeHtml,
    mostrarAviso,
    abrirModalConfirmacao,
    rotuloElo,
    direcaoInversa,
    PAPEIS_PESSOA,
    iniciaisPapeisPessoa,
    paresGrupoPessoa,
    agruparParesGrupoPessoa,
    classesCorGrupo,
    AUTORIA_PAPEIS,
    ASSINATURAS_AUTORIA,
    TIPOS_NOME_LITERARIO,
    DIMENSOES_CONDICAO_CLINICA,
    TIPOS_DEFICIENCIA,
    FONTE_OBRA_PROPRIA,
    lerDataParcial,
    preencherDataParcial,
    formatarDataParcial,
    renderCoracoesHtml,
    formatarAutoclassificacaoTexto,
    IDIOMAS_SUGERIDOS,
    extrairCirculosLiterariosUnicos,
    ROTULOS_PAPEL_IDIOMA,
    PAPEIS_IDIOMA,
    normalizarIdiomas,
    normalizarDialetos,
    normalizarPapelIdioma,
    idiomasDoItem,
    extrairDialetosUnicos,
    anoEquivalenteMovimento,
    periodosHistoricosIdsDoItem,
    periodosDaEpocaRetratada,
    ehEvento,
    RECORTES_EPOCA,
    ROTULOS_RECORTE_EPOCA,
} from './utils.js';
import { lugaresUsados, normalizarRegiao } from './regiao.js';
import { periodosVisiveis } from './periodo-biografico-campos.js';
import {
    criarComparadorDeEpocas,
    opcoesDeEscolhaDoPeriodoBiografico,
    resolverPeriodoBiograficoPorRotulo,
    rotuloDoPeriodoBiografico,
} from './periodos-biograficos-hierarquia.js';
import { opcoesOcultasDosPeriodos } from './ocultas-periodos.js';
import {
    adicionarAssuntoPendente,
    podarAssuntosPendentes,
    sobreporAssuntosPendentes,
    assuntoEhNovo,
    contarTextosPorTema,
} from './temas.js';
import {
    opcoesDePaiDaCorrente,
    caminhoDaCorrente,
    rotuloDaCorrente,
    sugestoesDeCorrentes,
    ehDivisaoDaCorrente,
} from './correntes-hierarquia.js';
import {
    ancorasSelecionadas,
    confirmarRemocaoVinculo,
    definirAncoras,
    limparAncoras,
    limparPendenciasAncora,
    repintarAncoras,
} from './ancora-eco-ui.js';
import { ancoraAtiva, normalizarAncorasEco, rotuloEco } from './ancora-eco.js';
import { lerPersonagens } from './grupo-personagens.js';
import {
    opcoesDePaiEmArvore,
    caminhoDosAncestraisDoPeriodo,
    rotuloDeEscolhaDoPeriodo,
    resolverPeriodoPorRotulo,
    opcoesDeEscolhaDosPeriodosHistoricos,
} from './periodos-historicos-hierarquia.js';

// ─── Estado local ─────────────────────────────────────────────

export let lastSelection = { start: 0, end: 0 };

// Alinhamento pendente (escolhido via setAlign, some no próximo applyStyle)
// — um por prefixo ('p' = Poema, 'pr' = Prosa), não uma variável única
// compartilhada: os modais ficam os dois carregados no DOM ao mesmo tempo
// depois de abertos uma vez (ver garantirModal em modais.js, que só
// esconde via classe, nunca remove), então sem isolar por prefixo um
// alinhamento escolhido na Prosa vazaria pro próximo "Aplicar Estilo" do
// Poema (ou vice-versa) se os dois ficassem abertos/fechados fora de ordem.
const ALINHAMENTOS = ['left', 'right', 'center', 'justify'];
const alignAtualPorPrefixo = { p: null, pr: null };

// ─── Formatação inline ───────────────────────────────────────
// prefixo identifica QUAL textarea (Poema = 'p-texto', Prosa = 'pr-texto')
// e, por extensão (ver applyStyle/applyBackground abaixo), quais inputs
// de cor/fonte/tamanho/alinhamento ler — mesmos botões, mesma lógica, só
// muda o alvo. Poema continua sendo o padrão pra não obrigar a reescrever
// os onclick já existentes no modal de Poema.

export function wrapText(before, after, prefixo = 'p') {
    const textarea = document.getElementById(`${prefixo}-texto`);
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const novo = before + selected + after;

    if (!document.execCommand('insertText', false, novo)) {
        textarea.value = textarea.value.substring(0, start) + novo + textarea.value.substring(end);
    }

    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
}

// Só entra no style="..." o que a pessoa realmente escolheu — nada de
// "font-family: inherit; font-size: inherit;" quando só a cor foi
// definida. Além de mais limpo, evitava um bug real: o parser
// compartilhado (analisarEstiloDeDiv, utils.js) lê qualquer valor depois
// de "font-family:" — incluindo a palavra "inherit" literal — e ela
// descia pro .docx (exportar-docx.js define opcoes.font = run.fonte) como
// se "inherit" fosse o nome de uma fonte de verdade, e pro .md
// (exportar-md.js) como uma legenda falsa tipo `fonte "inherit"`. Sem
// nenhum desses três campos, não faz sentido embrulhar em <div> nenhum —
// avisa e não faz nada, em vez de gerar uma tag vazia.
export function applyStyle(prefixo = 'p') {
    const colorInput =
        document.getElementById(`${prefixo}-toolHex`)?.value ||
        document.getElementById(`${prefixo}-toolColor`)?.value;
    const fontInput = document.getElementById(`${prefixo}-toolFont`)?.value.trim();
    const sizeInput = document.getElementById(`${prefixo}-toolSize`)?.value.trim();
    const alignAtual = alignAtualPorPrefixo[prefixo];

    let color = colorInput || '';
    if (color && !color.startsWith('#')) color = '#' + color;

    const declaracoes = [];
    if (color) declaracoes.push(`color: ${color};`);
    if (fontInput) declaracoes.push(`font-family: '${fontInput}';`);
    if (sizeInput) declaracoes.push(`font-size: ${sizeInput}pt;`);
    if (alignAtual) declaracoes.push(`text-align: ${alignAtual};`);

    if (!declaracoes.length) {
        mostrarAviso('Escolha uma cor, fonte, tamanho ou alinhamento antes de aplicar.');
        return;
    }
    // display: inline evita a quebra de linha extra que um <div> (block
    // por padrão) causaria na hora de visualizar um trecho no meio do
    // verso — ver corpoParaLinhasRicas (utils.js), que depende de cada
    // <div> não introduzir parágrafo novo sozinho.
    declaracoes.push('display: inline;');

    wrapText(`<div style="${declaracoes.join(' ')}">`, `</div>`, prefixo);

    // reseta alinhamento após aplicar
    alignAtualPorPrefixo[prefixo] = null;
    ALINHAMENTOS.forEach((a) => {
        document.getElementById(`${prefixo}-toolAlign-${a}`)?.classList.remove('bg-blue-100');
    });
}

export function setAlign(valor, prefixo = 'p') {
    alignAtualPorPrefixo[prefixo] = alignAtualPorPrefixo[prefixo] === valor ? null : valor;
    ALINHAMENTOS.forEach((a) => {
        document
            .getElementById(`${prefixo}-toolAlign-${a}`)
            ?.classList.toggle('bg-blue-100', alignAtualPorPrefixo[prefixo] === a);
    });
}

// Cor de fundo — botão separado do "Aplicar Estilo" de cima porque o uso
// típico é diferente: envolve um trecho/estrofe inteiro numa caixa (com
// respiro e cantos arredondados), não uma palavra solta no meio da linha
// — por isso NÃO leva display: inline (ao contrário de applyStyle),
// deixando o <div> como block mesmo, pra caixa poder abraçar várias
// linhas seguidas de uma vez. padding/border-radius fixos em 20px/8px por
// ora (mesma proporção já usada manualmente); dá pra virar input
// configurável depois se um valor único não bastar.
export function applyBackground(prefixo = 'p') {
    const bgInput =
        document.getElementById(`${prefixo}-toolBgHex`)?.value ||
        document.getElementById(`${prefixo}-toolBgColor`)?.value;
    if (!bgInput) {
        mostrarAviso('Escolha uma cor de fundo antes de aplicar.');
        return;
    }
    const cor = bgInput.startsWith('#') ? bgInput : `#${bgInput}`;

    wrapText(
        `<div style="background-color: ${cor}; padding: 20px; border-radius: 8px;">`,
        `</div>`,
        prefixo,
    );
}

// ─── Fábrica de grupos de tags/pessoas ────────────────────────
// Poema/Tags, Poema/Pessoas, Prosa/Tags, Prosa/Pessoas são o mesmo
// comportamento (adicionar, remover, editar, renderizar como chips,
// resetar, carregar a partir de uma string "a, b, c") variando só os
// IDs do DOM e a cor do badge. Em vez de 4 cópias, uma única
// implementação parametrizada; cada grupo guarda seu próprio array em
// closure — sem estado global compartilhado entre Poema e Prosa.
// tabela é opcional: Sinalizações (Poema/Prosa unificadas) passa
// 'poemas'/'prosas' pra embutir no onclick gerado (ver renderizar()
// abaixo); Gênero (grupoGeneroProsa, só existe pra Prosa) não passa
// nada e o onclick sai sem esse argumento — mesmo espírito de tabela
// opcional que criarGrupoDeAutoria/criarGrupoDePessoas usam, mas aqui
// o parâmetro pode legitimamente ficar de fora.
function criarGrupoDeTags({
    tabela,
    inputId,
    containerId,
    hiddenInputId,
    corClasse,
    nomeFuncaoRemover,
    nomeFuncaoEditar,
}) {
    let itens = [];

    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const item = (valor ?? input?.value ?? '').trim();
        if (item && !itens.includes(item)) {
            itens.push(item);
            renderizar();
        }
        if (input) input.value = '';
    }

    function remover(item) {
        itens = itens.filter((i) => i !== item);
        renderizar();
    }

    // Editar: tira a etiqueta da lista e devolve o texto dela pro
    // input, pronto pra ser corrigido — mesmo espírito de "clicar pra
    // editar" de campos de chips (ex.: destinatários de e-mail). Sem
    // estado de "em edição" separado (diferente de criarListaDeEntradas,
    // que precisa disso pra objetos com vários campos): aqui
    // adicionar() de volta já resolve salvar, então cancelar é só não
    // clicar em "+"/Enter — o texto fica visível no input até lá, nada
    // some da vista.
    function editar(item) {
        const input = document.getElementById(inputId);
        remover(item);
        if (input) {
            input.value = item;
            input.focus();
        }
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        const inputOculto = document.getElementById(hiddenInputId);
        if (!container) return;

        const argTabela = tabela ? `'${tabela}', ` : '';
        container.innerHTML = itens
            .map(
                (i) => `
            <span class="${corClasse} text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                ${escapeHtml(i)}
                <button type="button" data-valor="${escapeHtml(i)}" onclick="${nomeFuncaoEditar}(${argTabela}this.dataset.valor)" class="hover:text-blue-200 ml-1" title="Editar">✎</button>
                <button type="button" data-valor="${escapeHtml(i)}" onclick="${nomeFuncaoRemover}(${argTabela}this.dataset.valor)" class="hover:text-red-200 font-bold ml-1" title="Remover">×</button>
            </span>`,
            )
            .join('');

        if (inputOculto) inputOculto.value = itens.join(', ');
    }

    function reset() {
        itens = [];
        renderizar();
    }

    function carregar(valorStr) {
        itens = valorStr
            ? valorStr
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s)
            : [];
        renderizar();
    }

    return { adicionar, remover, editar, renderizar, reset, carregar };
}

// Mesma fábrica que criarGrupoDeTags acima, mas pro caso em que o campo
// já é array de verdade no registro (não string separada por vírgula) —
// caso dos 6 campos de tags do cadastro central de Movimento/Escola
// (Valores/Temas/Técnicas/Tipos de Composição/Lemas/Manifestos, ver
// SEED_MOVIMENTOS_ESCOLAS em db.js). O hidden input carrega
// JSON.stringify(itens) em vez de itens.join(', ') — forms.js faz
// JSON.parse no submit.
function criarGrupoDeTagsArray({
    inputId,
    containerId,
    hiddenInputId,
    corClasse,
    nomeFuncaoRemover,
    nomeFuncaoEditar,
}) {
    let itens = [];

    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const item = (valor ?? input?.value ?? '').trim();
        if (item && !itens.includes(item)) {
            itens.push(item);
            renderizar();
        }
        if (input) input.value = '';
    }

    function remover(item) {
        itens = itens.filter((i) => i !== item);
        renderizar();
    }

    function editar(item) {
        const input = document.getElementById(inputId);
        remover(item);
        if (input) {
            input.value = item;
            input.focus();
        }
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        const inputOculto = document.getElementById(hiddenInputId);
        if (!container) return;
        container.innerHTML = itens
            .map(
                (i) => `
            <span class="${corClasse} text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                ${escapeHtml(i)}
                <button type="button" data-valor="${escapeHtml(i)}" onclick="${nomeFuncaoEditar}(this.dataset.valor)" class="hover:text-blue-200 ml-1" title="Editar">✎</button>
                <button type="button" data-valor="${escapeHtml(i)}" onclick="${nomeFuncaoRemover}(this.dataset.valor)" class="hover:text-red-200 font-bold ml-1" title="Remover">×</button>
            </span>`,
            )
            .join('');
        if (inputOculto) inputOculto.value = JSON.stringify(itens);
    }

    function reset() {
        itens = [];
        renderizar();
    }

    function carregar(arr) {
        itens = Array.isArray(arr) ? [...arr] : [];
        renderizar();
    }

    return { adicionar, remover, editar, renderizar, reset, carregar };
}

// As 6 instâncias, uma por campo de tags do modal-movimento-escola.html
// — mesmo raciocínio de grupoCirculoLiterarioAutor/grupoLinguasEscritaAutor
// (estado isolado por campo, sem nenhuma referência a outro cadastro).
const grupoValoresMovimento = criarGrupoDeTagsArray({
    inputId: 'me-valor-input',
    containerId: 'me-valores-container',
    hiddenInputId: 'me-valores',
    corClasse: 'bg-purple-700',
    nomeFuncaoRemover: 'removerValorMovimento',
    nomeFuncaoEditar: 'editarValorMovimento',
});
export function adicionarValorMovimento(v) {
    grupoValoresMovimento.adicionar(v);
}
export function removerValorMovimento(v) {
    grupoValoresMovimento.remover(v);
}
export function editarValorMovimento(v) {
    grupoValoresMovimento.editar(v);
}
export function resetValoresMovimento() {
    grupoValoresMovimento.reset();
}
export function carregarValoresMovimento(v) {
    grupoValoresMovimento.carregar(v);
}

// Região (lista de lugares) dos dois cadastros que têm o campo: Corrente
// literária (região de origem) e Período Histórico (região de alcance).
// Mesma fábrica dos campos de tag acima; o hidden input leva o JSON do array.
const grupoRegiaoOrigemMovimento = criarGrupoDeTagsArray({
    inputId: 'me-regiao-origem-input',
    containerId: 'me-regiao-origem-container',
    hiddenInputId: 'me-regiao-origem',
    corClasse: 'bg-teal-700',
    nomeFuncaoRemover: 'removerRegiaoOrigemMovimento',
    nomeFuncaoEditar: 'editarRegiaoOrigemMovimento',
});
export function adicionarRegiaoOrigemMovimento(v) {
    grupoRegiaoOrigemMovimento.adicionar(v);
}
export function removerRegiaoOrigemMovimento(v) {
    grupoRegiaoOrigemMovimento.remover(v);
}
export function editarRegiaoOrigemMovimento(v) {
    grupoRegiaoOrigemMovimento.editar(v);
}
export function resetRegiaoOrigemMovimento() {
    grupoRegiaoOrigemMovimento.reset();
}
export function carregarRegiaoOrigemMovimento(v) {
    grupoRegiaoOrigemMovimento.carregar(normalizarRegiao(v));
}

const grupoRegiaoPeriodoHistorico = criarGrupoDeTagsArray({
    inputId: 'ph-regiao-input',
    containerId: 'ph-regiao-container',
    hiddenInputId: 'ph-regiao',
    corClasse: 'bg-teal-700',
    nomeFuncaoRemover: 'removerRegiaoPeriodoHistorico',
    nomeFuncaoEditar: 'editarRegiaoPeriodoHistorico',
});
export function adicionarRegiaoPeriodoHistorico(v) {
    grupoRegiaoPeriodoHistorico.adicionar(v);
}
export function removerRegiaoPeriodoHistorico(v) {
    grupoRegiaoPeriodoHistorico.remover(v);
}
export function editarRegiaoPeriodoHistorico(v) {
    grupoRegiaoPeriodoHistorico.editar(v);
}
export function resetRegiaoPeriodoHistorico() {
    grupoRegiaoPeriodoHistorico.reset();
}
export function carregarRegiaoPeriodoHistorico(v) {
    grupoRegiaoPeriodoHistorico.carregar(normalizarRegiao(v));
}

const grupoTemasMovimento = criarGrupoDeTagsArray({
    inputId: 'me-tema-input',
    containerId: 'me-temas-container',
    hiddenInputId: 'me-temas',
    corClasse: 'bg-sky-700',
    nomeFuncaoRemover: 'removerTemaMovimento',
    nomeFuncaoEditar: 'editarTemaMovimento',
});
export function adicionarTemaMovimento(v) {
    grupoTemasMovimento.adicionar(v);
}
export function removerTemaMovimento(v) {
    grupoTemasMovimento.remover(v);
}
export function editarTemaMovimento(v) {
    grupoTemasMovimento.editar(v);
}
export function resetTemasMovimento() {
    grupoTemasMovimento.reset();
}
export function carregarTemasMovimento(v) {
    grupoTemasMovimento.carregar(v);
}

const grupoTecnicasMovimento = criarGrupoDeTagsArray({
    inputId: 'me-tecnica-input',
    containerId: 'me-tecnicas-container',
    hiddenInputId: 'me-tecnicas',
    corClasse: 'bg-emerald-700',
    nomeFuncaoRemover: 'removerTecnicaMovimento',
    nomeFuncaoEditar: 'editarTecnicaMovimento',
});
export function adicionarTecnicaMovimento(v) {
    grupoTecnicasMovimento.adicionar(v);
}
export function removerTecnicaMovimento(v) {
    grupoTecnicasMovimento.remover(v);
}
export function editarTecnicaMovimento(v) {
    grupoTecnicasMovimento.editar(v);
}
export function resetTecnicasMovimento() {
    grupoTecnicasMovimento.reset();
}
export function carregarTecnicasMovimento(v) {
    grupoTecnicasMovimento.carregar(v);
}

const grupoTiposComposicaoMovimento = criarGrupoDeTagsArray({
    inputId: 'me-tipo-composicao-input',
    containerId: 'me-tipos-composicao-container',
    hiddenInputId: 'me-tipos-composicao',
    corClasse: 'bg-orange-700',
    nomeFuncaoRemover: 'removerTipoComposicaoMovimento',
    nomeFuncaoEditar: 'editarTipoComposicaoMovimento',
});
export function adicionarTipoComposicaoMovimento(v) {
    grupoTiposComposicaoMovimento.adicionar(v);
}
export function removerTipoComposicaoMovimento(v) {
    grupoTiposComposicaoMovimento.remover(v);
}
export function editarTipoComposicaoMovimento(v) {
    grupoTiposComposicaoMovimento.editar(v);
}
export function resetTiposComposicaoMovimento() {
    grupoTiposComposicaoMovimento.reset();
}
export function carregarTiposComposicaoMovimento(v) {
    grupoTiposComposicaoMovimento.carregar(v);
}

const grupoLemasMovimento = criarGrupoDeTagsArray({
    inputId: 'me-lema-input',
    containerId: 'me-lemas-container',
    hiddenInputId: 'me-lemas',
    corClasse: 'bg-rose-700',
    nomeFuncaoRemover: 'removerLemaMovimento',
    nomeFuncaoEditar: 'editarLemaMovimento',
});
export function adicionarLemaMovimento(v) {
    grupoLemasMovimento.adicionar(v);
}
export function removerLemaMovimento(v) {
    grupoLemasMovimento.remover(v);
}
export function editarLemaMovimento(v) {
    grupoLemasMovimento.editar(v);
}
export function resetLemasMovimento() {
    grupoLemasMovimento.reset();
}
export function carregarLemasMovimento(v) {
    grupoLemasMovimento.carregar(v);
}

const grupoManifestosMovimento = criarGrupoDeTagsArray({
    inputId: 'me-manifesto-input',
    containerId: 'me-manifestos-container',
    hiddenInputId: 'me-manifestos',
    corClasse: 'bg-slate-600',
    nomeFuncaoRemover: 'removerManifestoMovimento',
    nomeFuncaoEditar: 'editarManifestoMovimento',
});
export function adicionarManifestoMovimento(v) {
    grupoManifestosMovimento.adicionar(v);
}
export function removerManifestoMovimento(v) {
    grupoManifestosMovimento.remover(v);
}
export function editarManifestoMovimento(v) {
    grupoManifestosMovimento.editar(v);
}
export function resetManifestosMovimento() {
    grupoManifestosMovimento.reset();
}
export function carregarManifestosMovimento(v) {
    grupoManifestosMovimento.carregar(v);
}
// Temas de um Assunto (db.assuntos[].temas) — mesma fábrica de array de
// nomes dos campos do Movimento/Escola acima. O Tema não tem cadastro
// próprio (é a etiqueta de `sinalizacoesTema`), então aqui o chip é só
// o nome; a sugestão do input vem dos temas já usados nos textos (ver
// atualizarDatalistTemasAssunto).
const grupoTemasAssunto = criarGrupoDeTagsArray({
    inputId: 'as-tema-input',
    containerId: 'as-temas-container',
    hiddenInputId: 'as-temas',
    corClasse: 'bg-emerald-700',
    nomeFuncaoRemover: 'removerTemaAssunto',
    nomeFuncaoEditar: 'editarTemaAssunto',
});
export function adicionarTemaAssunto(v) {
    grupoTemasAssunto.adicionar(v);
}
export function removerTemaAssunto(v) {
    grupoTemasAssunto.remover(v);
}
export function editarTemaAssunto(v) {
    grupoTemasAssunto.editar(v);
}
export function resetTemasAssunto() {
    grupoTemasAssunto.reset();
}
export function carregarTemasAssunto(v) {
    grupoTemasAssunto.carregar(v);
}

export function resetTodosOsGruposDeMovimento() {
    resetRegiaoOrigemMovimento();
    resetValoresMovimento();
    resetTemasMovimento();
    resetTecnicasMovimento();
    resetTiposComposicaoMovimento();
    resetLemasMovimento();
    resetManifestosMovimento();
}

// Sinalizações viraram 5 grupos (Estilo/Tema/Relação/Sensibilidade/Tom)
// em vez de 1 — mesma engine de sempre (criarGrupoDeTags), só que
// instanciada 5x por Poema e 5x por Prosa. SINAL_CATEGORIAS é a lista
// única de configuração; os módulos, os exports nomeados (que window.*
// em main.js precisa, um por função, por causa do onclick="..."
// embutido no HTML renderizado) E o próprio HTML do bloco (ver
// criarBlocosSinalizacoesHTML abaixo) são gerados a partir dela pra não
// repetir os IDs de DOM e o rótulo/placeholder em vários lugares.
const SINAL_CATEGORIAS = [
    // "Tradição" (ex.: formas/escolas poéticas herdadas — soneto,
    // haicai, cordel...) — categoria própria pedida à parte de Estilo,
    // por isso vem antes dele na ordem de exibição.
    {
        chave: 'Tradicao',
        cor: 'bg-teal-600',
        corBotao: 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300',
        rotulo: 'Tradição',
        placeholder: 'Nova etiqueta de tradição...',
    },
    {
        chave: 'Estilo',
        cor: 'bg-blue-600',
        corBotao: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
        rotulo: 'Estilo',
        placeholder: 'Nova etiqueta de estilo...',
    },
    {
        chave: 'Tema',
        // Tema não é mais campo do bloco Sinalizações: virou o grupo
        // "Temas e Assuntos" (por id, com papel) — ver renderTemasPoema.
        // A categoria continua aqui só pra manter as funções/módulos e o
        // espelho `sinalizacoesTema` funcionando (busca, badges, cores).
        ocultoNoModal: true,
        cor: 'bg-orange-600',
        corBotao: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
        rotulo: 'Tema',
        placeholder: 'Nova etiqueta de tema...',
    },
    // "Territorialidade": lugares específicos citados no texto (país,
    // cidade, bairro, rio). Diferente de Tema (assunto amplo) e de
    // Domínio Imagético (vocabulário de um campo de conhecimento).
    {
        chave: 'Territorialidade',
        // Como o Tema, deixou o bloco Sinalizações: vive no grupo "Região e
        // Idioma" (por id, puxando do cadastro de Locais) — ver
        // renderRegiaoPoema. A categoria segue aqui só para o espelho
        // `sinalizacoesTerritorialidade` (busca, badges, cores, exportações).
        ocultoNoModal: true,
        cor: 'bg-emerald-600',
        corBotao: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
        rotulo: 'Territorialidade',
        placeholder: 'Nova etiqueta de lugar...',
    },
    {
        chave: 'Relacao',
        cor: 'bg-purple-600',
        corBotao: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
        rotulo: 'Relação',
        placeholder: 'Nova etiqueta de relação...',
    },
    {
        chave: 'Sensibilidade',
        cor: 'bg-amber-600',
        corBotao: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
        rotulo: 'Sensibilidade',
        placeholder: 'Nova etiqueta de sensibilidade...',
    },
    {
        chave: 'Tom',
        cor: 'bg-pink-600',
        corBotao: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
        rotulo: 'Tom',
        placeholder: 'Nova etiqueta de tom...',
    },
    // "Domínio Imagético" (vocabulário/imagética que o texto toma
    // emprestado de um domínio de conhecimento — ex.: "Astrologia" —
    // sem que cada termo do domínio precise virar uma entrada separada
    // de Intertextualidade, que é pra diálogo com UM artefato externo
    // específico e nomeável, não pra registro geral).
    {
        chave: 'DominioImagetico',
        cor: 'bg-cyan-600',
        corBotao: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300',
        rotulo: 'Domínio Imagético',
        rotuloExtra: '(repertório)',
        placeholder: 'Nova etiqueta de domínio imagético...',
    },
    // Balde temporário pra tags migradas que ainda não têm categoria de
    // verdade (hoje: "Premiados", "Tradução", "Variações" — que devem
    // virar Reconhecimentos e Elos tipados de Derivação numa etapa
    // futura, ver Análise de estrutura e metadados poéticos). Fica
    // visível no modal em vez de escondido no JSON pra não se perder de
    // vista até esses campos existirem.
    {
        chave: 'Outros',
        cor: 'bg-gray-500',
        // Dark bg mais claro (700, não 900 como as outras) de propósito:
        // é uma categoria neutra/temporária, então o botão já nasce um
        // pouco mais apagado que as demais no modo escuro.
        corBotao: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
        rotulo: 'Outros',
        placeholder: 'Etiqueta ainda sem categoria...',
    },
];

function criarModuloDeTags(config) {
    const grupo = criarGrupoDeTags(config);
    return {
        adicionar: (valor = null) => grupo.adicionar(valor),
        remover: (v) => grupo.remover(v),
        editar: (v) => grupo.editar(v),
        renderizar: () => grupo.renderizar(),
        reset: () => grupo.reset(),
        carregar: (str) => grupo.carregar(str),
    };
}

// slugDom: "Estilo" -> "estilo" (pro id de DOM, ex.: p-sinal-estilo-input)
const slugDom = (chave) => chave.charAt(0).toLowerCase() + chave.slice(1);

// ─── Geração do HTML de Sinalizações a partir de SINAL_CATEGORIAS ──
// Substitui o HTML antes estático (e duplicado) de modal-poema.html e
// modal-prosa.html: cada modal agora só tem um <div id="...-sinalizacoes-
// -corpo"></div> vazio (ver renderSinalizacoesPoema/Prosa abaixo), que é
// preenchido uma vez, na primeira vez que o modal é carregado (ver
// registrarModal em main.js). Função pura — recebe config, devolve
// string; não toca em DOM, então é testável sem happy-dom.
function criarBlocoSinalizacaoHTML(
    { chave, corBotao, rotulo, rotuloExtra, placeholder },
    { prefixo, tabela, sufixoDatalist, datalistInline },
) {
    const slug = slugDom(chave);
    const idDatalist = `sugestoes-sinais-${slug}${sufixoDatalist}`;
    const rotuloHtml = rotuloExtra
        ? `${rotulo}\n                                <span class="font-normal normal-case text-gray-400 dark:text-slate-500">${rotuloExtra}</span>`
        : rotulo;

    return `
                            <label class="form-label">${rotuloHtml}</label>
                            <div class="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    id="${prefixo}-sinal-${slug}-input"
                                    list="${idDatalist}"
                                    class="text-sm flex-1"
                                    placeholder="${placeholder}"
                                />
                                <button
                                    type="button"
                                    onclick="adicionarSinal${chave}('${tabela}')"
                                    class="${corBotao} px-3 rounded text-xs font-bold"
                                >
                                    +
                                </button>
                            </div>
                            <div
                                id="${prefixo}-sinal-${slug}-container"
                                class="flex flex-wrap gap-1 min-h-[30px] p-2 bg-white dark:bg-slate-900 border rounded border-gray-300 dark:border-slate-600"
                            ></div>${
                                datalistInline
                                    ? `\n                            <datalist id="${idDatalist}"></datalist>`
                                    : ''
                            }
                            <input type="hidden" id="${prefixo}-sinal-${slug}" />`;
}

// Monta o corpo inteiro do bloco "Sinalizações" (todas as categorias de
// SINAL_CATEGORIAS, na ordem de exibição).
function criarBlocosSinalizacoesHTML(opcoes) {
    return SINAL_CATEGORIAS.filter((categoria) => !categoria.ocultoNoModal)
        .map((categoria) => criarBlocoSinalizacaoHTML(categoria, opcoes))
        .join('\n');
}

// Poema: o <datalist> de sugestão de cada categoria já existe
// globalmente em index.html (id="sugestoes-sinais-<slug>", sem
// sufixo) — o bloco só referencia via list="...", sem declarar o seu.
export function renderSinalizacoesPoema() {
    const container = document.getElementById('p-sinalizacoes-corpo');
    if (!container) return;
    container.innerHTML = criarBlocosSinalizacoesHTML({
        prefixo: 'p',
        tabela: 'poemas',
        sufixoDatalist: '',
        datalistInline: false,
    });
}

// Prosa: ao contrário do Poema, index.html não declara uma versão
// global do datalist pra Prosa (só as variantes -bulk-prosa da edição
// em massa) — cada bloco declara a sua própria <datalist> inline, como
// o HTML estático já fazia.
export function renderSinalizacoesProsa() {
    const container = document.getElementById('pr-sinalizacoes-corpo');
    if (!container) return;
    container.innerHTML = criarBlocosSinalizacoesHTML({
        prefixo: 'pr',
        tabela: 'prosas',
        sufixoDatalist: '-prosa',
        datalistInline: true,
    });
}

// Poema e Prosa agora compartilham os mesmos nomes de função por
// categoria (removerSinalX/editarSinalX, sem sufixo Prosa) — o
// argumento `tabela` embutido no onclick (ver criarGrupoDeTags acima)
// é quem diferencia a instância em runtime, mesmo padrão de
// grupoAutoria(tabela)/grupoPessoas(tabela).
const modulosSinalPoema = {};
const modulosSinalProsa = {};
SINAL_CATEGORIAS.forEach(({ chave, cor }) => {
    const slug = slugDom(chave);
    modulosSinalPoema[chave] = criarModuloDeTags({
        tabela: 'poemas',
        inputId: `p-sinal-${slug}-input`,
        containerId: `p-sinal-${slug}-container`,
        hiddenInputId: `p-sinal-${slug}`,
        corClasse: cor,
        nomeFuncaoRemover: `removerSinal${chave}`,
        nomeFuncaoEditar: `editarSinal${chave}`,
    });
    modulosSinalProsa[chave] = criarModuloDeTags({
        tabela: 'prosas',
        inputId: `pr-sinal-${slug}-input`,
        containerId: `pr-sinal-${slug}-container`,
        hiddenInputId: `pr-sinal-${slug}`,
        corClasse: cor,
        nomeFuncaoRemover: `removerSinal${chave}`,
        nomeFuncaoEditar: `editarSinal${chave}`,
    });
});
// Resolve a instância certa (Poema/Prosa) de uma categoria de
// Sinalização — mesmo papel de grupoAutoria(tabela)/grupoPessoas(tabela).
function grupoSinal(chave, tabela) {
    if (tabela === 'poemas') return modulosSinalPoema[chave];
    if (tabela === 'prosas') return modulosSinalProsa[chave];
    throw new Error(`Tabela desconhecida em grupoSinal: ${tabela}`);
}

const grupoGeneroProsa = criarGrupoDeTags({
    inputId: 'pr-genero-input',
    containerId: 'pr-genero-container',
    hiddenInputId: 'pr-genero',
    corClasse: 'bg-amber-600',
    nomeFuncaoRemover: 'removerGeneroProsa',
    nomeFuncaoEditar: 'editarGeneroProsa',
});

// Ocupações do Autor (modal-autor.html) — lista livre (quem trabalhava/
// trabalha com o quê além de escrever), mesma fábrica genérica de
// grupoGeneroProsa acima. Sem "tipo" por chip (diferente de Nomes
// Literários, ver criarGrupoDeNomesLiterariosAutor abaixo) — cada
// ocupação é só um texto solto, mesmo espírito de Gênero (Prosa).
const grupoOcupacoesAutor = criarGrupoDeTags({
    inputId: 'au-ocupacao-input',
    containerId: 'au-ocupacoes-container',
    hiddenInputId: 'au-ocupacoes',
    corClasse: 'bg-teal-600',
    nomeFuncaoRemover: 'removerOcupacaoAutor',
    nomeFuncaoEditar: 'editarOcupacaoAutor',
});

// Fábrica genérica de "tags com tipo" — cada chip carrega um nome (ou
// descrição) junto de um tipo escolhido numa lista fechada pequena
// (ex.: TIPOS_NOME_LITERARIO, DIMENSOES_CONDICAO_CLINICA). Generalizada
// a partir da versão original, que só servia a Nomes Literários do
// Autor — a mesma forma (chip + <select> de tipo embutido) se aplica
// a Condições Clínicas (Física/Mental). Variante de criarGrupoDeTags
// (usada em Gênero): aqui cada chip carrega um tipo junto do nome,
// então não dá pra serializar como string simples separada por vírgula
// — o hidden input guarda JSON, lido por forms.js no submit.
function criarGrupoDeTagsComTipo({
    inputId,
    containerId,
    hiddenInputId,
    corClasse,
    nomeFuncaoRemover,
    nomeFuncaoEditar,
    nomeFuncaoAlterarTipo,
    tipos,
}) {
    let itens = []; // [{ nome, tipo }]

    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const nome = (valor ?? input?.value ?? '').trim();
        if (input) input.value = '';
        if (!nome || itens.some((i) => i.nome === nome)) return;
        itens.push({ nome, tipo: tipos[0] });
        renderizar();
    }

    function remover(nome) {
        itens = itens.filter((i) => i.nome !== nome);
        renderizar();
    }

    function alterarTipo(nome, tipo) {
        const item = itens.find((i) => i.nome === nome);
        if (!item || !tipos.includes(tipo)) return;
        item.tipo = tipo;
        renderizar();
    }

    // Mesmo espírito de editar() em criarGrupoDeTags: tira o item da
    // lista e devolve o nome pro input, pronto pra corrigir. O tipo se
    // perde nessa volta (reaparece com o tipo padrão ao readicionar)
    // — custo aceito pela simplicidade, mesmo padrão do resto da
    // fábrica.
    function editar(nome) {
        const input = document.getElementById(inputId);
        remover(nome);
        if (input) {
            input.value = nome;
            input.focus();
        }
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        const inputOculto = document.getElementById(hiddenInputId);
        if (!container) return;

        const opcoesTipo = (i) =>
            tipos
                .map((t) => `<option value="${t}" ${i.tipo === t ? 'selected' : ''}>${t}</option>`)
                .join('');

        container.innerHTML = itens
            .map(
                (i) => `
            <span class="${corClasse} text-white text-[10px] pl-2 pr-1 py-1 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(i.nome)}
                <select data-nome="${escapeHtml(i.nome)}"
                    onchange="${nomeFuncaoAlterarTipo}(this.dataset.nome, this.value)"
                    class="text-[9px] bg-white/20 rounded px-1 py-0 border-0 text-white select-chip-autoria">
                    ${opcoesTipo(i)}
                </select>
                <button type="button" data-nome="${escapeHtml(i.nome)}" onclick="${nomeFuncaoEditar}(this.dataset.nome)" class="hover:text-blue-200 ml-1" title="Editar">✎</button>
                <button type="button" data-nome="${escapeHtml(i.nome)}" onclick="${nomeFuncaoRemover}(this.dataset.nome)" class="hover:text-red-200 font-bold ml-1" title="Remover">×</button>
            </span>`,
            )
            .join('');

        if (inputOculto) inputOculto.value = JSON.stringify(itens);
    }

    function reset() {
        itens = [];
        renderizar();
    }

    // Aceita o array já no formato {nome, tipo} e, por defesa, string
    // legada "a, b, c" (sem tipo) — cada nome legado ganha o tipo
    // padrão (tipos[0]). Ver decisoes.md.
    function carregar(valor) {
        if (Array.isArray(valor)) {
            itens = valor.map((i) =>
                typeof i === 'string'
                    ? { nome: i, tipo: tipos[0] }
                    : { nome: i.nome, tipo: tipos.includes(i.tipo) ? i.tipo : tipos[0] },
            );
        } else {
            itens = (valor || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((nome) => ({ nome, tipo: tipos[0] }));
        }
        renderizar();
    }

    return { adicionar, remover, editar, alterarTipo, renderizar, reset, carregar };
}

// Nomes Literários do Autor (modal-autor.html) — cadastro central de
// Heterônimos/Pseudônimos daquele Autor, cada um com seu tipo (ver
// TIPOS_NOME_LITERARIO em utils.js). Alimenta o seletor de
// "Assinatura"/nome literário do chip de Autoria (ver
// criarGrupoDeAutoria abaixo): ao marcar a Assinatura como Heterônimo
// ou Pseudônimo pra este Autor num Poema/Prosa, só os nomes
// cadastrados aqui com o tipo correspondente aparecem pra escolher.
const grupoNomesLiterariosAutor = criarGrupoDeTagsComTipo({
    inputId: 'au-nome-literario-input',
    containerId: 'au-nomes-literarios-container',
    hiddenInputId: 'au-nomes-literarios',
    corClasse: 'bg-indigo-600',
    nomeFuncaoRemover: 'removerNomeLiterarioAutor',
    nomeFuncaoEditar: 'editarNomeLiterarioAutor',
    nomeFuncaoAlterarTipo: 'alterarTipoNomeLiterarioAutor',
    tipos: TIPOS_NOME_LITERARIO,
});

// Condições Clínicas do Autor (modal-autor.html) — tags tipificadas
// entre dimensão Física e Mental (DIMENSOES_CONDICAO_CLINICA em
// utils.js), mesma fábrica de Nomes Literários acima. À parte de
// Neurodivergências (grupoNeurodivergenciasAutor abaixo) — ver
// comentário de DIMENSOES_CONDICAO_CLINICA em utils.js pra distinção.
const grupoCondicoesClinicasAutor = criarGrupoDeTagsComTipo({
    inputId: 'au-condicao-clinica-input',
    containerId: 'au-condicoes-clinicas-container',
    hiddenInputId: 'au-condicoes-clinicas',
    corClasse: 'bg-rose-600',
    nomeFuncaoRemover: 'removerCondicaoClinicaAutor',
    nomeFuncaoEditar: 'editarCondicaoClinicaAutor',
    nomeFuncaoAlterarTipo: 'alterarTipoCondicaoClinicaAutor',
    tipos: DIMENSOES_CONDICAO_CLINICA,
});

// Deficiências do Autor — tags tipificadas (Física/Auditiva/Visual/
// Intelectual/Mental-psicossocial/Múltipla, TIPOS_DEFICIENCIA em
// utils.js), mesma fábrica de Condições Clínicas acima. O texto da tag
// é a deficiência específica; o tipo é a categoria ampla.
const grupoDeficienciasAutor = criarGrupoDeTagsComTipo({
    inputId: 'au-deficiencia-input',
    containerId: 'au-deficiencias-container',
    hiddenInputId: 'au-deficiencias',
    corClasse: 'bg-amber-600',
    nomeFuncaoRemover: 'removerDeficienciaAutor',
    nomeFuncaoEditar: 'editarDeficienciaAutor',
    nomeFuncaoAlterarTipo: 'alterarTipoDeficienciaAutor',
    tipos: TIPOS_DEFICIENCIA,
});

// Neurodivergências do Autor — lista simples de tags, sem tipo, mesma
// fábrica de Ocupações do Autor (grupoOcupacoesAutor acima).
const grupoNeurodivergenciasAutor = criarGrupoDeTags({
    inputId: 'au-neurodivergencia-input',
    containerId: 'au-neurodivergencias-container',
    hiddenInputId: 'au-neurodivergencias',
    corClasse: 'bg-fuchsia-600',
    nomeFuncaoRemover: 'removerNeurodivergenciaAutor',
    nomeFuncaoEditar: 'editarNeurodivergenciaAutor',
});

// Instituições Frequentadas do Autor (grupo Escolaridade) — lista de
// tags, mesma fábrica de Ocupações/Neurodivergências acima; sugestão
// (datalist) vem do que já foi cadastrado no acervo, ver
// extrairInstituicoesUnicas em utils.js/renderDropdowns em ui.js.
const grupoInstituicoesAutor = criarGrupoDeTags({
    inputId: 'au-instituicao-input',
    containerId: 'au-instituicoes-container',
    hiddenInputId: 'au-instituicoes',
    corClasse: 'bg-cyan-600',
    nomeFuncaoRemover: 'removerInstituicaoAutor',
    nomeFuncaoEditar: 'editarInstituicaoAutor',
});

// ─── Fábrica de grupo de Pessoas (chip + papel) ────────────────
// Variante de criarGrupoDeTags: guarda um array de objeto
// { pessoaId, papeis } em vez de string simples — pessoaId referencia
// o cadastro central db.pessoas (ver migrarPessoasParaCadastro em
// db.js), papeis é o vínculo específico daquele texto com a pessoa
// (Retratado(a)/Inspiração para/Dedicatário(a)/Mencionado(a)/Aludido(a)/
// Associado(a) retroativamente — ver PAPEIS_PESSOA em utils.js). Sem
// hiddenInputId: diferente dos grupos
// de tags, que gravam a string combinada num input escondido (lido por
// `.value` em forms.js), este expõe `obterItens()` — forms.js lê o
// array direto na hora do submit, mesmo padrão de Intertextualidade/
// Anexos (`obterIntertextualidade`/`obterAnexos`, ver criarListaDeEntradas
// acima), que também guardam objeto em vez de string simples.
function criarGrupoDePessoas({
    tabela,
    inputId,
    containerId,
    corClasse,
    nomeFuncaoRemover,
    nomeFuncaoAlternarPapel,
    nomeFuncaoAlternarDropdown,
    infoGruposId = null,
}) {
    let itens = [];
    // dropdown de papéis aberto no momento (pessoaId), pra fechar ao
    // abrir outro ou ao clicar fora — só um aberto por vez.
    let dropdownAberto = null;

    function nomeDe(pessoaId) {
        return db.pessoas.find((p) => p.id == pessoaId)?.nome || '(pessoa removida)';
    }

    function adicionarPorId(pessoaId) {
        if (!itens.some((i) => i.pessoaId == pessoaId)) {
            itens.push({ pessoaId, papeis: [] });
            renderizar();
            if (tabela) repintarAncoras(tabela);
        }
    }

    // Resolve nome digitado → pessoaId. Nome que bate exatamente com
    // alguém já cadastrado reaproveita o id direto; nome sem
    // correspondência pede confirmação explícita antes de criar pessoa
    // nova (ver conversa que definiu isso) — evita que um typo vire uma
    // pessoa nova por acidente no cadastro central.
    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const nome = (valor ?? input?.value ?? '').trim();
        if (input) input.value = '';
        if (!nome) return;

        const existente = db.pessoas.find((p) => p.nome === nome);
        if (existente) {
            adicionarPorId(existente.id);
            return;
        }

        abrirModalConfirmacao({
            titulo: `Criar pessoa "${nome}"?`,
            rotulo: 'Pessoa nova',
            mensagem: `"${nome}" ainda não está no cadastro de Pessoas. Criar agora (sem grupo — dá pra atribuir depois na aba Pessoas)?`,
            textoConfirmar: 'Criar',
            corConfirmar: '#e11d48',
            onConfirmar: () => {
                const pessoa = obterOuCriarPessoaPorNome(nome);
                adicionarPorId(pessoa.id);
            },
        });
    }

    function tirar(pessoaId) {
        itens = itens.filter((i) => i.pessoaId != pessoaId);
        if (dropdownAberto == pessoaId) dropdownAberto = null;
        renderizar();
        if (tabela) repintarAncoras(tabela);
    }

    // Se a pessoa ancora Ecos com este texto, pergunta antes (F11-D6).
    function remover(pessoaId) {
        if (!tabela) return tirar(pessoaId);
        confirmarRemocaoVinculo({
            tabela,
            especie: 'pessoa',
            id: pessoaId,
            nome: nomeDe(pessoaId),
            remover: () => tirar(pessoaId),
        });
    }

    // Marcar acrescenta ao fim de `papeis` (= ordem de marcação vira
    // ordem de exibição — não é uma hierarquia fixa por categoria, ver
    // migrarPapeisPessoa em db.js); desmarcar remove do array, mantendo
    // a ordem relativa dos que sobraram.
    function alternarPapel(pessoaId, papel, marcado) {
        const item = itens.find((i) => i.pessoaId == pessoaId);
        if (!item) return;
        if (marcado) {
            if (!item.papeis.includes(papel)) item.papeis.push(papel);
        } else {
            item.papeis = item.papeis.filter((p) => p !== papel);
        }
        renderizar(); // precisa redesenhar: a ordem dos papéis já marcados pode mudar
    }

    function alternarDropdown(pessoaId) {
        dropdownAberto = dropdownAberto == pessoaId ? null : pessoaId;
        renderizar();
    }

    // Fecha o dropdown ao clicar fora dele — sem isso ficaria aberto até
    // a pessoa clicar em alguma outra coisa dentro do próprio grupo.
    // Usa composedPath() (caminho do clique fixado no momento do
    // dispatch) em vez de container.contains(ev.target): o próprio botão
    // que abre o dropdown chama renderizar() (troca o innerHTML) antes
    // do clique terminar de borbulhar até aqui, o que desconectaria
    // ev.target do container e fecharia o dropdown no mesmo clique que
    // acabou de abrir ele.
    document.addEventListener('click', (ev) => {
        if (!dropdownAberto) return;
        const container = document.getElementById(containerId);
        if (container && !ev.composedPath().includes(container)) {
            dropdownAberto = null;
            renderizar();
        }
    });

    // Painel somente-leitura, embaixo dos chips: mostra os Grupos que as
    // pessoas selecionadas trazem consigo (não é editável por aqui — Grupo
    // é característica da Pessoa, atribuída na aba Pessoas; ver
    // paresGrupoPessoa em utils.js, mesma resolução usada na coluna
    // "Grupos" das tabelas — ver badgesGrupos em render-listas.js — e na
    // exportação em Markdown — ver exportar-md.js). Some quando ninguém
    // selecionado está em grupo nenhum, pra não sobrar um rótulo vazio.
    // Desambiguação por Autor (decisão B, 27/09/2026, mesmo critério de
    // badgesGrupos/textoGrupos): "— Autor" só entra se, entre as pessoas
    // selecionadas, dois Grupos com o mesmo nome vierem de Autores
    // diferentes.
    function renderPainelGrupos() {
        if (!infoGruposId) return;
        const painel = document.getElementById(infoGruposId);
        if (!painel) return;
        const pares = paresGrupoPessoa({ pessoas: itens }, db.pessoas, db.grupos);
        if (!pares.length) {
            painel.innerHTML = '';
            return;
        }
        const agrupados = agruparParesGrupoPessoa(pares);
        const autorIdsPorNome = new Map();
        for (const { grupo } of agrupados) {
            if (!autorIdsPorNome.has(grupo.nome)) autorIdsPorNome.set(grupo.nome, new Set());
            autorIdsPorNome.get(grupo.nome).add(grupo.autorId);
        }
        const nomesColidindo = new Set(
            [...autorIdsPorNome.entries()]
                .filter(([, autorIds]) => autorIds.size > 1)
                .map(([nome]) => nome),
        );
        const badges = agrupados
            .map(({ grupo, pessoas }) => {
                const rotulo = nomesColidindo.has(grupo.nome)
                    ? `${escapeHtml(grupo.nome)} — ${escapeHtml(db.autores.find((a) => a.id == grupo.autorId)?.nome || '(autor)')}`
                    : escapeHtml(grupo.nome);
                return `<span class="text-[9px] ${classesCorGrupo(grupo.cor)} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${rotulo} <span class="opacity-70">(${pessoas.map((p) => escapeHtml(p.nome)).join(', ')})</span></span>`;
            })
            .join('');
        painel.innerHTML = `<span class="mr-1">Grupos:</span>${badges}`;
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        if (!container) return;

        const checkboxesPapel = (i) =>
            PAPEIS_PESSOA.map((p) => {
                const marcado = i.papeis.includes(p);
                return `
                <label class="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" ${marcado ? 'checked' : ''}
                        onchange="${nomeFuncaoAlternarPapel}('${tabela}', ${JSON.stringify(i.pessoaId)}, '${escapeHtml(p).replace(/'/g, "\\'")}', this.checked)"
                        class="rounded border-gray-300 dark:border-slate-600 text-rose-500 focus:ring-rose-400" />
                    ${escapeHtml(p)}
                </label>`;
            }).join('');

        container.innerHTML = itens
            .map((i) => {
                const nome = nomeDe(i.pessoaId);
                const rotuloPapeis = i.papeis.length
                    ? `<span class="opacity-80">${escapeHtml(iniciaisPapeisPessoa(i.papeis))}</span>`
                    : `<span class="opacity-50 italic">sem papel</span>`;
                const aberto = dropdownAberto == i.pessoaId;
                return `
            <span class="relative ${corClasse} text-white text-[10px] pl-2 pr-1 py-1 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(nome)}
                <button type="button" data-id="${escapeHtml(String(i.pessoaId))}" onclick="${nomeFuncaoAlternarDropdown}('${tabela}', this.dataset.id)"
                    class="text-[9px] bg-white/20 rounded px-1 py-0 hover:bg-white/30">
                    ${rotuloPapeis}
                </button>
                <button type="button" data-id="${escapeHtml(String(i.pessoaId))}" onclick="${nomeFuncaoRemover}('${tabela}', this.dataset.id)" class="hover:text-red-200 font-bold ml-1">×</button>
                ${
                    aberto
                        ? `<div class="absolute z-10 top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded shadow-lg py-1 min-w-max">${checkboxesPapel(i)}</div>`
                        : ''
                }
            </span>`;
            })
            .join('');
        renderPainelGrupos();
    }

    function reset() {
        itens = [];
        dropdownAberto = null;
        renderizar();
    }

    // Aceita o array já migrado ({pessoaId, papeis}) e — só por defesa —
    // formatos antigos: {nome, papeis}/{nome, papel} (schema anterior à
    // virada pro cadastro central) e string "a, b, c" (não deveria mais
    // acontecer, já que db.js normaliza tudo no load, mas evita quebrar
    // se esta função for chamada antes disso por algum motivo). Nome
    // legado sem pessoa cadastrada correspondente cria uma (sem
    // confirmação aqui — carregar() é preenchimento automático do
    // formulário, não digitação da pessoa, então não faz sentido pedir
    // confirmação de criação nesse caminho).
    function carregar(pessoas) {
        if (Array.isArray(pessoas)) {
            itens = pessoas.map((p) => {
                if (typeof p === 'string')
                    return { pessoaId: obterOuCriarPessoaPorNome(p).id, papeis: [] };
                if (p.pessoaId !== undefined)
                    return { pessoaId: p.pessoaId, papeis: [...(p.papeis || [])] };
                if (Array.isArray(p.papeis))
                    return {
                        pessoaId: obterOuCriarPessoaPorNome(p.nome).id,
                        papeis: [...p.papeis],
                    };
                return {
                    pessoaId: obterOuCriarPessoaPorNome(p.nome).id,
                    papeis: p.papel ? [p.papel] : [],
                };
            });
        } else {
            itens = (pessoas || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((nome) => ({ pessoaId: obterOuCriarPessoaPorNome(nome).id, papeis: [] }));
        }
        dropdownAberto = null;
        renderizar();
    }

    function obterItens() {
        return itens;
    }

    return {
        adicionar,
        remover,
        alternarPapel,
        alternarDropdown,
        renderizar,
        reset,
        carregar,
        obterItens,
    };
}

// ─── Fábrica de Grupos referenciados diretamente ────────────────
// Complementa o painel somente-leitura acima (renderPainelGrupos, que
// só mostra Grupo derivado de Pessoa citada): às vezes o texto se
// refere a um Grupo inteiro sem citar ninguém dele em particular (ex.:
// um poema que fala da família em geral, não de uma pessoa específica
// dela). Guarda um array de grupoId — variante mais simples de
// criarGrupoDePessoas (sem papéis, sem dropdown): nome digitado que bate
// com Grupo já cadastrado reaproveita o id direto; nome sem
// correspondência pede confirmação antes de criar (mesmo padrão de
// Pessoa, ver obterOuCriarGrupoPorNome em db.js).
function criarGrupoDeGruposDiretos({
    tabela,
    inputId,
    containerId,
    sugestoesId,
    nomeFuncaoRemover,
    nomeFuncaoSelecionar,
}) {
    let itens = []; // array de grupoId
    let sugestoesAbertas = false;

    function grupoDe(grupoId) {
        return db.grupos.find((g) => g.id == grupoId);
    }

    // Dropdown próprio (não mais <input list="..."> nativo) — pedido do
    // Victor, 27/09/2026: "o select nos modais [de Poema/Prosa e Pessoa]
    // devia separar os níveis dos grupos". Um <datalist> nativo não dá
    // pra estilizar (sem indentação/cabeçalho por Autor, e dois grupos
    // "Família" de Autores diferentes apareceriam idênticos na sugestão),
    // então vira o mesmo padrão já usado em ps-grupos-container (ui.js) e
    // seletorGrupos (estatisticas-tela-pessoas.js): cabeçalho por
    // Autor (só quando há mais de um candidato) + "↳" pro nível > 1, com
    // o pai imediato entre parênteses pra não perder contexto quando o
    // filtro digitado esconde o pai da lista. Fecha ao clicar fora, mesmo
    // mecanismo (composedPath) do dropdown de papel em
    // criarGrupoDePessoas acima.
    function candidatosPorAutoria() {
        const autorIdsAtuais = obterAutoria(tabela).map((a) => a.autorId);
        const base = autorIdsAtuais.length
            ? db.grupos.filter((g) => autorIdsAtuais.includes(g.autorId))
            : db.grupos;
        return base.filter((g) => !itens.includes(g.id));
    }

    function abrirSugestoes() {
        sugestoesAbertas = true;
        renderSugestoes();
    }

    function fecharSugestoes() {
        if (!sugestoesAbertas) return;
        sugestoesAbertas = false;
        renderSugestoes();
    }

    function renderSugestoes() {
        const el = sugestoesId ? document.getElementById(sugestoesId) : null;
        if (!el) return;
        // A borda/sombra do painel vivem na própria <div> (classe fixa no
        // HTML, não recriada aqui a cada render) — por isso alterna
        // "hidden" em vez de só zerar o innerHTML, senão uma caixinha
        // vazia (com borda/sombra) ficaria visível flutuando sob o input
        // mesmo fechado, sobrevivendo entre aberturas.
        el.classList.toggle('hidden', !sugestoesAbertas);
        if (!sugestoesAbertas) {
            el.innerHTML = '';
            return;
        }
        const input = document.getElementById(inputId);
        const filtro = (input?.value || '').trim().toLocaleLowerCase('pt-BR');
        const candidatos = candidatosPorAutoria();
        const visiveis = filtro
            ? candidatos.filter((g) => g.nome.toLocaleLowerCase('pt-BR').includes(filtro))
            : candidatos;
        if (!visiveis.length) {
            el.innerHTML = `<p class="px-2 py-1.5 text-[11px] text-gray-400 dark:text-slate-500 whitespace-nowrap">Nenhum grupo encontrado${filtro ? '' : ''} — digite e clique em "+" pra criar um novo.</p>`;
            return;
        }
        const autoresComGrupo = [...new Set(visiveis.map((g) => g.autorId))]
            .map((id) => db.autores?.find((a) => a.id == id))
            .filter(Boolean)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        const opcao = (g) => {
            const nivel = nivelGrupo(db, g.id);
            const pai = g.paiId != null ? db.grupos.find((x) => x.id == g.paiId) : null;
            const contexto = pai
                ? ` <span class="opacity-60">(dentro de ${escapeHtml(pai.nome)})</span>`
                : '';
            const seta = nivel > 1 ? '↳ ' : '';
            return `<button type="button" data-id="${g.id}" onclick="${nomeFuncaoSelecionar}('${tabela}', ${g.id})" class="block w-full text-left px-2 py-1 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap">${seta}${escapeHtml(g.nome)}${contexto}</button>`;
        };
        el.innerHTML = autoresComGrupo
            .map((autor) => {
                const doAutor = visiveis
                    .filter((g) => g.autorId == autor.id)
                    .sort(
                        (a, b) =>
                            nivelGrupo(db, a.id) - nivelGrupo(db, b.id) ||
                            a.nome.localeCompare(b.nome, 'pt-BR'),
                    );
                const cabecalho =
                    autoresComGrupo.length > 1
                        ? `<h5 class="px-2 pt-1.5 text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">${escapeHtml(autor.nome)}</h5>`
                        : '';
                return cabecalho + doAutor.map(opcao).join('');
            })
            .join('');
    }

    function selecionarSugestao(grupoId) {
        adicionarPorId(grupoId);
        const input = document.getElementById(inputId);
        if (input) input.value = '';
        fecharSugestoes();
        input?.focus();
    }

    if (sugestoesId) {
        document.addEventListener('click', (ev) => {
            if (!sugestoesAbertas) return;
            const input = document.getElementById(inputId);
            const painel = document.getElementById(sugestoesId);
            const dentro =
                (input && ev.composedPath().includes(input)) ||
                (painel && ev.composedPath().includes(painel));
            if (!dentro) fecharSugestoes();
        });
    }

    function adicionarPorId(grupoId) {
        if (!itens.some((id) => id == grupoId)) {
            itens.push(grupoId);
            renderizar();
        }
    }

    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const nome = (valor ?? input?.value ?? '').trim();
        if (input) input.value = '';
        if (!nome) return;

        // Desde 27/09/2026, Grupo pertence a um Autor — dedup/sugestão
        // aqui escopada pela união dos Autores já adicionados no texto
        // (mesmo critério do dropdown, ver candidatosPorAutoria acima).
        // Sem nenhum Autor ainda adicionado no momento (campo
        // preenchido antes de Autoria), cai num fallback permissivo
        // (todos os grupos, sem filtro) — mais seguro que travar o
        // fluxo por causa da ordem em que os campos foram preenchidos.
        const autorIdsAtuais = obterAutoria(tabela).map((a) => a.autorId);
        const candidatos = autorIdsAtuais.length
            ? db.grupos.filter((g) => autorIdsAtuais.includes(g.autorId))
            : db.grupos;

        const existente = candidatos.find((g) => g.nome === nome);
        if (existente) {
            adicionarPorId(existente.id);
            return;
        }

        // Criar um Grupo novo exige saber de qual Autor ele é — sem
        // nenhum Autor no texto ainda, não tem como decidir isso.
        if (autorIdsAtuais.length === 0) {
            mostrarAviso('Adicione um Autor ao texto antes de criar um Grupo novo.');
            return;
        }
        const autorIdNovoGrupo = autorIdsAtuais[0];
        const nomeAutor = db.autores.find((a) => a.id == autorIdNovoGrupo)?.nome || '(autor)';
        const sufixoAutor =
            autorIdsAtuais.length > 1
                ? ` — vinculado a "${nomeAutor}" (primeiro autor do texto)`
                : ` — vinculado a "${nomeAutor}"`;

        abrirModalConfirmacao({
            titulo: `Criar grupo "${nome}"?`,
            rotulo: 'Grupo novo',
            mensagem: `"${nome}" ainda não está no cadastro de Grupos${sufixoAutor}. Criar agora (cor padrão — dá pra trocar depois na aba Grupos)?`,
            textoConfirmar: 'Criar',
            corConfirmar: '#e11d48',
            onConfirmar: () => {
                const grupo = obterOuCriarGrupoPorNome(nome, autorIdNovoGrupo);
                adicionarPorId(grupo.id);
            },
        });
    }

    function remover(grupoId) {
        itens = itens.filter((id) => id != grupoId);
        renderizar();
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = itens
            .map((grupoId) => {
                const grupo = grupoDe(grupoId);
                const nome = grupo?.nome || '(grupo removido)';
                return `
            <span class="text-[11px] ${classesCorGrupo(grupo?.cor)} px-2 py-1 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(nome)}
                <button type="button" data-id="${escapeHtml(String(grupoId))}" onclick="${nomeFuncaoRemover}('${tabela}', this.dataset.id)" class="hover:text-red-600 dark:hover:text-red-400 font-bold ml-1">×</button>
            </span>`;
            })
            .join('');
    }

    function reset() {
        itens = [];
        renderizar();
    }

    // Aceita o array de grupoId já migrado — sem formatos legados aqui,
    // já que o campo é novo (não existe dado antigo em outro formato
    // pra defender, diferente de carregar() em criarGrupoDePessoas).
    function carregar(ids) {
        itens = Array.isArray(ids) ? [...ids] : [];
        renderizar();
    }

    function obterItens() {
        return [...itens];
    }

    return {
        adicionar,
        remover,
        renderizar,
        reset,
        carregar,
        obterItens,
        abrirSugestoes,
        fecharSugestoes,
        selecionarSugestao,
    };
}

// ─── Fábrica de grupo de Autoria (chip + papel único) ──────────
// Variante mais simples de criarGrupoDePessoas: o vínculo item↔Autor
// é single-role (Autor OU Coautor, nunca os dois pro mesmo texto — ver
// AUTORIA_PAPEIS em utils.js), então cada chip mostra um <select>
// inline em vez do dropdown de checkboxes de Pessoas — não tem "sem
// papel" possível aqui, todo autor adicionado já entra com um papel
// (padrão 'Autor'). Resolve nome digitado → autorId no cadastro
// central db.autores (ver migrarAutoria/obterOuCriarAutorPorNome em
// db.js), mesmo padrão de confirmação de "criar autor novo" que
// criarGrupoDePessoas usa pra Pessoa.
function criarGrupoDeAutoria({
    tabela,
    inputId,
    containerId,
    corClasse,
    nomeFuncaoRemover,
    nomeFuncaoAlterarPapel,
    fonteOrigemId,
}) {
    let itens = [];

    function nomeDe(autorId) {
        return db.autores.find((a) => a.id == autorId)?.nome || '(autor removido)';
    }

    // Autor marcado "Este autor sou eu" (db.autores[].souEu) preenche a
    // Fonte do texto com "Obra própria" — mas só se a Fonte ainda estiver
    // vazia, então nunca sobrescreve o que a pessoa já digitou. Roda só
    // aqui (adição manual de um chip), nunca em carregar(): reabrir um
    // texto existente não pode mexer na Fonte dele.
    function preencherFonteSeSouEu(autorId) {
        if (!fonteOrigemId) return;
        if (!db.autores.find((a) => a.id == autorId)?.souEu) return;
        const el = document.getElementById(fonteOrigemId);
        if (el && !el.value.trim()) el.value = FONTE_OBRA_PROPRIA;
    }

    function adicionarPorId(autorId) {
        if (!itens.some((i) => i.autorId == autorId)) {
            itens.push({
                autorId,
                papel: AUTORIA_PAPEIS[0],
                assinatura: ASSINATURAS_AUTORIA[0],
                nomeLiterario: '',
            });
            preencherFonteSeSouEu(autorId);
            renderizar();
        }
    }

    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const nome = (valor ?? input?.value ?? '').trim();
        if (input) input.value = '';
        if (!nome) return;

        const existente = db.autores.find((a) => a.nome === nome);
        if (existente) {
            adicionarPorId(existente.id);
            return;
        }

        abrirModalConfirmacao({
            titulo: `Criar autor "${nome}"?`,
            rotulo: 'Autor novo',
            mensagem: `"${nome}" ainda não está no cadastro de Autores. Criar agora?`,
            textoConfirmar: 'Criar',
            corConfirmar: '#e11d48',
            onConfirmar: () => {
                const autor = obterOuCriarAutorPorNome(nome);
                adicionarPorId(autor.id);
            },
        });
    }

    function remover(autorId) {
        itens = itens.filter((i) => i.autorId != autorId);
        renderizar();
    }

    function alterarPapel(autorId, papel) {
        const item = itens.find((i) => i.autorId == autorId);
        if (!item || !AUTORIA_PAPEIS.includes(papel)) return;
        item.papel = papel;
        renderizar();
    }

    // Assinatura sob a qual ESTE texto foi publicado por este Autor:
    // Ortônimo (nome próprio, padrão), Heterônimo ou Pseudônimo — ver
    // ASSINATURAS_AUTORIA em utils.js. Trocar pra Ortônimo (ou pra um
    // tipo diferente do nome já escolhido) limpa nomeLiterario — o nome
    // certo pro tipo novo se escolhe de novo em alterarNomeLiterario.
    function alterarAssinatura(autorId, assinatura) {
        const item = itens.find((i) => i.autorId == autorId);
        if (!item || !ASSINATURAS_AUTORIA.includes(assinatura)) return;
        item.assinatura = assinatura;
        item.nomeLiterario = '';
        renderizar();
    }

    // Nome literário (Heterônimo/Pseudônimo, conforme a Assinatura do
    // item) sob o qual ESTE texto foi publicado, dentre os cadastrados
    // pro Autor com o tipo correspondente (db.autores[].nomesLiterarios
    // — ver modal-autor.html/grupoNomesLiterariosAutor). O vínculo
    // (autorId) não muda — só troca o nome exibido/exportado pra este
    // texto (ver nomeAutoriaExibido em utils.js). Nome fora da lista
    // atual do Autor pro tipo escolhido (ex.: removido do cadastro, ou
    // cadastrado com outro tipo, depois de escolhido aqui) é ignorado,
    // mesmo critério defensivo do resto do arquivo.
    function alterarNomeLiterario(autorId, nomeLiterario) {
        const item = itens.find((i) => i.autorId == autorId);
        if (!item) return;
        const nomesDoTipo = (db.autores.find((a) => a.id == autorId)?.nomesLiterarios || []).filter(
            (n) => n.tipo === item.assinatura,
        );
        item.nomeLiterario = nomesDoTipo.some((n) => n.nome === nomeLiterario) ? nomeLiterario : '';
        renderizar();
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        if (!container) return;

        const opcoesPapel = (i) =>
            AUTORIA_PAPEIS.map(
                (p) =>
                    `<option value="${escapeHtml(p)}" ${i.papel === p ? 'selected' : ''}>${escapeHtml(p)}</option>`,
            ).join('');

        const opcoesAssinatura = (i) =>
            ASSINATURAS_AUTORIA.map(
                (a) => `<option value="${a}" ${i.assinatura === a ? 'selected' : ''}>${a}</option>`,
            ).join('');

        const opcoesNomeLiterario = (i, nomesDoTipo) =>
            `<option value="">(escolher)</option>` +
            nomesDoTipo
                .map(
                    (n) =>
                        `<option value="${escapeHtml(n.nome)}" ${i.nomeLiterario === n.nome ? 'selected' : ''}>${escapeHtml(n.nome)}</option>`,
                )
                .join('');

        container.innerHTML = itens
            .map((i) => {
                const nome = nomeDe(i.autorId);
                if (!ASSINATURAS_AUTORIA.includes(i.assinatura))
                    i.assinatura = ASSINATURAS_AUTORIA[0];
                const nomesLiterariosDoAutor =
                    db.autores.find((a) => a.id == i.autorId)?.nomesLiterarios || [];
                const nomesDoTipo = nomesLiterariosDoAutor.filter((n) => n.tipo === i.assinatura);
                // Nome literário escolhido antes, mas removido do cadastro
                // do Autor (ou recadastrado com outro tipo) depois — volta
                // a vazio (mesmo critério defensivo de alterarNomeLiterario
                // acima).
                if (i.nomeLiterario && !nomesDoTipo.some((n) => n.nome === i.nomeLiterario))
                    i.nomeLiterario = '';
                // Seletor de nome literário só aparece quando a Assinatura
                // não é Ortônimo — nome próprio não precisa de nome
                // alternativo nenhum. Sem nome cadastrado pro tipo, mostra
                // um aviso curto em vez de um select vazio (mesmo espírito
                // do antigo "só aparece com Pseudônimos cadastrados").
                const seletorNomeLiterario =
                    i.assinatura === 'Ortônimo'
                        ? ''
                        : nomesDoTipo.length
                          ? `<select data-id="${escapeHtml(String(i.autorId))}"
                        onchange="alterarNomeLiterarioAutoria('${tabela}', this.dataset.id, this.value)"
                        title="Nome literário usado neste texto"
                        class="text-[9px] bg-white/20 rounded px-1 py-0 border-0 text-white select-chip-autoria">
                        ${opcoesNomeLiterario(i, nomesDoTipo)}
                    </select>`
                          : `<span class="text-[9px] italic opacity-70 px-1" title="Cadastre em Editar Autor">sem ${i.assinatura.toLowerCase()} cadastrado</span>`;
                return `
            <span class="relative ${corClasse} text-white text-[10px] pl-2 pr-1 py-1 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(nome)}
                <select data-id="${escapeHtml(String(i.autorId))}"
                    onchange="${nomeFuncaoAlterarPapel}('${tabela}', this.dataset.id, this.value)"
                    class="text-[9px] bg-white/20 rounded px-1 py-0 border-0 text-white select-chip-autoria">
                    ${opcoesPapel(i)}
                </select>
                <select data-id="${escapeHtml(String(i.autorId))}"
                    onchange="alterarAssinaturaAutoria('${tabela}', this.dataset.id, this.value)"
                    title="Assinatura usada neste texto"
                    class="text-[9px] bg-white/20 rounded px-1 py-0 border-0 text-white select-chip-autoria">
                    ${opcoesAssinatura(i)}
                </select>
                ${seletorNomeLiterario}
                <button type="button" data-id="${escapeHtml(String(i.autorId))}" onclick="${nomeFuncaoRemover}('${tabela}', this.dataset.id)" class="hover:text-red-200 font-bold ml-1">×</button>
            </span>`;
            })
            .join('');
    }

    function reset() {
        itens = [];
        renderizar();
    }

    // Aceita o array já migrado ({autorId, papel}) e — só por defesa —
    // nome legado sem correspondência (cria autor sem confirmação, mesmo
    // raciocínio de carregar() em criarGrupoDePessoas: preenchimento
    // automático do formulário, não digitação).
    function carregar(autoria) {
        itens = (Array.isArray(autoria) ? autoria : []).map((a) => {
            const autorId =
                a.autorId !== undefined ? a.autorId : obterOuCriarAutorPorNome(a.nome).id;
            return {
                autorId,
                papel: a.papel || AUTORIA_PAPEIS[0],
                assinatura: ASSINATURAS_AUTORIA.includes(a.assinatura)
                    ? a.assinatura
                    : ASSINATURAS_AUTORIA[0],
                nomeLiterario: a.nomeLiterario || '',
            };
        });
        renderizar();
    }

    function obterItens() {
        return itens;
    }

    return {
        adicionar,
        remover,
        alterarPapel,
        alterarAssinatura,
        alterarNomeLiterario,
        renderizar,
        reset,
        carregar,
        obterItens,
    };
}

const grupoPessoasPoema = criarGrupoDePessoas({
    tabela: 'poemas',
    inputId: 'p-pessoa-input',
    containerId: 'p-pessoas-container',
    corClasse: 'bg-rose-500',
    nomeFuncaoRemover: 'removerPessoa',
    nomeFuncaoAlternarPapel: 'alternarPapelPessoa',
    nomeFuncaoAlternarDropdown: 'alternarDropdownPapelPessoa',
    infoGruposId: 'p-pessoas-grupos-info',
});
const grupoPessoasProsa = criarGrupoDePessoas({
    tabela: 'prosas',
    inputId: 'pr-pessoa-input',
    containerId: 'pr-pessoas-container',
    corClasse: 'bg-rose-500',
    nomeFuncaoRemover: 'removerPessoa',
    nomeFuncaoAlternarPapel: 'alternarPapelPessoa',
    nomeFuncaoAlternarDropdown: 'alternarDropdownPapelPessoa',
    infoGruposId: 'pr-pessoas-grupos-info',
});
// Resolve a instância certa (Poema/Prosa) pra cada chamada unificada
// abaixo — mesmo papel do cfg()/CONFIG_SELECAO em selecao-massa.js.
function grupoPessoas(tabela) {
    if (tabela === 'poemas') return grupoPessoasPoema;
    if (tabela === 'prosas') return grupoPessoasProsa;
    throw new Error(`Tabela desconhecida em grupoPessoas: ${tabela}`);
}

const grupoGruposDiretosPoema = criarGrupoDeGruposDiretos({
    tabela: 'poemas',
    inputId: 'p-grupo-direto-input',
    containerId: 'p-grupos-diretos-container',
    sugestoesId: 'p-grupo-direto-sugestoes',
    nomeFuncaoRemover: 'removerGrupoDireto',
    nomeFuncaoSelecionar: 'selecionarGrupoDireto',
});
const grupoGruposDiretosProsa = criarGrupoDeGruposDiretos({
    tabela: 'prosas',
    inputId: 'pr-grupo-direto-input',
    containerId: 'pr-grupos-diretos-container',
    sugestoesId: 'pr-grupo-direto-sugestoes',
    nomeFuncaoRemover: 'removerGrupoDireto',
    nomeFuncaoSelecionar: 'selecionarGrupoDireto',
});
function grupoGruposDiretos(tabela) {
    if (tabela === 'poemas') return grupoGruposDiretosPoema;
    if (tabela === 'prosas') return grupoGruposDiretosProsa;
    throw new Error(`Tabela desconhecida em grupoGruposDiretos: ${tabela}`);
}

const grupoAutoriaPoema = criarGrupoDeAutoria({
    tabela: 'poemas',
    inputId: 'p-autor-input',
    containerId: 'p-autoria-container',
    corClasse: 'bg-indigo-600',
    nomeFuncaoRemover: 'removerAutoria',
    nomeFuncaoAlterarPapel: 'alterarPapelAutoria',
    fonteOrigemId: 'p-fonte-origem',
});
const grupoAutoriaProsa = criarGrupoDeAutoria({
    tabela: 'prosas',
    inputId: 'pr-autor-input',
    containerId: 'pr-autoria-container',
    corClasse: 'bg-indigo-600',
    nomeFuncaoRemover: 'removerAutoria',
    nomeFuncaoAlterarPapel: 'alterarPapelAutoria',
    fonteOrigemId: 'pr-fonte-origem',
});
function grupoAutoria(tabela) {
    if (tabela === 'poemas') return grupoAutoriaPoema;
    if (tabela === 'prosas') return grupoAutoriaProsa;
    throw new Error(`Tabela desconhecida em grupoAutoria: ${tabela}`);
}

// ─── Listas genéricas de entradas (objetos ou texto livre) ────
// Usado por Intertextualidade (pares tipo+texto) e Anexos (tipo+
// texto+link). Diferente de criarGrupoDeTags: guarda
// um array de verdade (não uma string separada por vírgula), porque
// os valores podem conter vírgulas e/ou ter mais de um campo por item.
//
// Suporta edição in-place: iniciarEdicao(i) marca o item i como "em
// edição" (destacado visualmente); a próxima chamada a salvar() atualiza
// esse item em vez de adicionar um novo. cancelarEdicao() sai do modo
// sem alterar nada. remover() sempre cancela edição em andamento, pra
// não arriscar salvar num índice que mudou de posição.
function criarListaDeEntradas({
    tabela,
    containerId,
    renderItem,
    nomeFuncaoRemover,
    nomeFuncaoEditar,
}) {
    let itens = [];
    let editando = null; // índice do item em edição, ou null

    function salvar(entrada) {
        if (editando !== null) {
            itens[editando] = entrada;
            editando = null;
        } else {
            itens.push(entrada);
        }
        renderizar();
    }

    function remover(indice) {
        itens.splice(indice, 1);
        editando = null; // evita salvar depois num índice que já mudou de posição
        renderizar();
    }

    function iniciarEdicao(indice) {
        editando = indice;
        renderizar();
        return itens[indice];
    }

    function cancelarEdicao() {
        editando = null;
        renderizar();
    }

    function estaEditando() {
        return editando !== null;
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        if (!container) return;

        const argTabela = tabela ? `'${tabela}', ` : '';
        container.innerHTML = itens
            .map((item, i) => {
                const emEdicao = i === editando;
                return `
            <div class="flex items-start justify-between gap-2 bg-white dark:bg-slate-900 border rounded px-2 py-1.5 text-xs ${
                emEdicao
                    ? 'border-blue-400 dark:border-blue-500 ring-1 ring-blue-300 dark:ring-blue-600'
                    : 'border-gray-200 dark:border-slate-700'
            }">
                <div class="flex-1 min-w-0 whitespace-pre-wrap">${renderItem(item)}</div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onclick="${nomeFuncaoEditar}(${argTabela}${i})"
                        class="text-blue-400 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 px-1" title="Editar">✎</button>
                    <button type="button" onclick="${nomeFuncaoRemover}(${argTabela}${i})"
                        class="text-red-400 hover:text-red-600 dark:hover:text-red-400 font-bold flex-shrink-0 px-1" title="Remover">×</button>
                </div>
            </div>`;
            })
            .join('');
    }

    function obterItens() {
        return itens;
    }

    function carregar(lista) {
        itens = Array.isArray(lista) ? [...lista] : [];
        editando = null;
        renderizar();
    }

    function reset() {
        itens = [];
        editando = null;
        renderizar();
    }

    return {
        salvar,
        remover,
        renderizar,
        obterItens,
        carregar,
        reset,
        iniciarEdicao,
        cancelarEdicao,
        estaEditando,
    };
}

// ─── Intertextualidade (lista de pares tipo+texto) ────────────
// Um texto pode dialogar com várias referências externas de tipos
// diferentes ao mesmo tempo — por isso é uma lista, não um par único.
// Poema e Prosa compartilham motor + nomes de função (sem sufixo
// Prosa), resolvidos por `tabela` — mesmo padrão do item 6
// (Sinalizações): a fábrica embute `tabela` no onclick gerado (ver
// criarListaDeEntradas acima), os wrappers exportados recebem `tabela`
// como primeiro argumento, e prefixoDom(tabela) resolve os IDs de DOM
// ('p-'/'pr-'), já que esses campos (ao contrário de Sinalizações/
// Autoria/Pessoas) ainda são lidos direto do formulário nos wrappers,
// não guardados na closure da fábrica.

function prefixoDom(tabela) {
    if (tabela === 'poemas') return 'p';
    if (tabela === 'prosas') return 'pr';
    throw new Error(`Tabela desconhecida em prefixoDom: ${tabela}`);
}

// ─── Autoclassificação (corações) ───────────────────────────────
// Widget de 5 corações (0,5 a 5, passo 0,5 — ver renderCoracoesHtml/
// autoclassificacaoValida em utils.js). O valor de verdade mora no
// hidden #p(r)-autoclassificacao; esta função só redesenha os corações
// e a legenda a partir dele — chamada sempre que o valor muda (clique
// num coração, "Limpar", ou ao popular o formulário em editarPoema/
// editarProsa/prepararNovo).
export function renderAutoclassificacao(tabela) {
    const p = prefixoDom(tabela);
    const hidden = document.getElementById(`${p}-autoclassificacao`);
    const container = document.getElementById(`${p}-autoclassificacao-corar`);
    if (!hidden || !container) return;
    const valor = Number(hidden.value) || 0;
    container.innerHTML = renderCoracoesHtml(valor, { tabela });
    const legenda = document.getElementById(`${p}-autoclassificacao-legenda`);
    if (legenda)
        legenda.textContent = formatarAutoclassificacaoTexto(valor) || 'Sem autoclassificação';
}

// Clicar num coração (ou numa das metades) chama isto com o valor
// correspondente. Clicar de novo no MESMO valor já selecionado apaga a
// autoclassificação (volta a "não avaliado") — junto com o botão
// "Limpar" (limparAutoclassificacao abaixo), é a forma de voltar a zero
// sem precisar de um sexto estado/botão dedicado.
// Dispara 'change' manualmente no hidden: preencherCampos/editarPoema
// setam .value direto sem disparar evento de propósito (ver comentário
// de criarRastreadorDeAlteracoes em utils.js), mas aqui é o oposto —
// é uma interação real do usuário (o clique no coração), então precisa
// marcar o formulário como "sujo" igual a qualquer outro campo editado.
export function definirAutoclassificacao(tabela, valor) {
    const p = prefixoDom(tabela);
    const hidden = document.getElementById(`${p}-autoclassificacao`);
    if (!hidden) return;
    const atual = Number(hidden.value) || 0;
    hidden.value = atual === valor ? 0 : valor;
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
    renderAutoclassificacao(tabela);
}

export function limparAutoclassificacao(tabela) {
    const p = prefixoDom(tabela);
    const hidden = document.getElementById(`${p}-autoclassificacao`);
    if (!hidden) return;
    if (Number(hidden.value) === 0) return; // já limpo — evita 'change'/dirty à toa
    hidden.value = 0;
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
    renderAutoclassificacao(tabela);
}

function renderItemIntertexto(it) {
    const badge = it.tipo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
        : '';
    const link = it.link
        ? ` <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline text-[11px] break-all">${escapeHtml(it.linkTexto || it.link)}</a>`
        : '';
    const nota = it.nota ? ` — ${escapeHtml(it.nota)}` : '';
    return `${badge}${escapeHtml(it.texto || '')}${link}${nota}`;
}

const listaIntertextoPoema = criarListaDeEntradas({
    tabela: 'poemas',
    containerId: 'p-intertexto-lista',
    renderItem: renderItemIntertexto,
    nomeFuncaoRemover: 'removerIntertexto',
    nomeFuncaoEditar: 'editarIntertexto',
});
const listaIntertextoProsa = criarListaDeEntradas({
    tabela: 'prosas',
    containerId: 'pr-intertexto-lista',
    renderItem: renderItemIntertexto,
    nomeFuncaoRemover: 'removerIntertexto',
    nomeFuncaoEditar: 'editarIntertexto',
});
function listaIntertexto(tabela) {
    if (tabela === 'poemas') return listaIntertextoPoema;
    if (tabela === 'prosas') return listaIntertextoProsa;
    throw new Error(`Tabela desconhecida em listaIntertexto: ${tabela}`);
}

function atualizarBotaoIntertexto(tabela) {
    const p = prefixoDom(tabela);
    const btnAdd = document.getElementById(`${p}-intertexto-btn-add`);
    const btnCancelar = document.getElementById(`${p}-intertexto-btn-cancelar`);
    const emEdicao = listaIntertexto(tabela).estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

// Lê o Tipo atual (`tipoElId`) e repopula o datalist de Texto
// (`datalistTextoId`) só com as referências já tipadas com ele — chamada
// tanto no carregamento do modal (lista geral) quanto a cada mudança no
// campo Tipo (lista focada, ver wiring do 'input' em initEditor()/
// initEditorProsa()). Sem Tipo ainda escolhido, cai no comportamento
// anterior (todas as referências, de qualquer tipo).
function atualizarDatalistTextoIntertexto(itens, tipoElId, datalistTextoId) {
    const datalist = document.getElementById(datalistTextoId);
    if (!datalist) return;
    const tipoAtual = document.getElementById(tipoElId)?.value.trim() || null;
    datalist.innerHTML = extrairValoresUnicosDeIntertextualidade(itens, tipoAtual)
        .map((v) => `<option value="${escapeHtml(v)}">`)
        .join('');
}

// Espelha atualizarDatalistTextoIntertexto acima, sobre `referenciasExternas`
// em vez de `intertextualidade` — ver bloco de Referências mais abaixo.
function atualizarDatalistTextoReferenciaExterna(itens, tipoElId, datalistTextoId) {
    const datalist = document.getElementById(datalistTextoId);
    if (!datalist) return;
    const tipoAtual = document.getElementById(tipoElId)?.value.trim() || null;
    datalist.innerHTML = extrairValoresUnicosDeReferenciasExternas(itens, tipoAtual)
        .map((v) => `<option value="${escapeHtml(v)}">`)
        .join('');
}

// Prosa não tem versão global do datalist de Tipo em index.html (só a
// de Poema) — cada bloco de Prosa declara a sua própria <datalist>
// inline (mesmo motivo de renderSinalizacoesProsa acima), daí o sufixo
// '-prosa' nos ids abaixo quando tabela === 'prosas'.
export function atualizarDatalistIntertexto(tabela) {
    const p = prefixoDom(tabela);
    const dados = tabela === 'prosas' ? db.prosas || [] : db.poemas;
    const sufixo = tabela === 'prosas' ? '-prosa' : '';
    atualizarDatalistTextoIntertexto(
        dados,
        `${p}-intertexto-tipo`,
        `sugestoes-intertexto${sufixo}`,
    );
    const datalistTipo = document.getElementById(`sugestoes-intertexto-tipo${sufixo}`);
    if (datalistTipo) {
        datalistTipo.innerHTML = extrairTiposIntertextoUnicos(dados)
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
}

export function adicionarIntertexto(tabela) {
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-intertexto-tipo`);
    const textoEl = document.getElementById(`${p}-intertexto-texto`);
    const linkEl = document.getElementById(`${p}-intertexto-link`);
    const linkTextoEl = document.getElementById(`${p}-intertexto-link-texto`);
    const notaEl = document.getElementById(`${p}-intertexto-nota`);
    const tipo = tipoEl?.value || '';
    const texto = (textoEl?.value || '').trim();
    const link = (linkEl?.value || '').trim();
    const linkTexto = (linkTextoEl?.value || '').trim();
    const nota = (notaEl?.value || '').trim();
    if (!tipo && !texto && !link && !linkTexto && !nota) return;
    listaIntertexto(tabela).salvar({ tipo, texto, link, linkTexto, nota });
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (linkTextoEl) linkTextoEl.value = '';
    if (notaEl) notaEl.value = '';
    atualizarBotaoIntertexto(tabela);
    atualizarDatalistIntertexto(tabela);
}
export function editarIntertexto(tabela, indice) {
    const item = listaIntertexto(tabela).iniciarEdicao(indice);
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-intertexto-tipo`);
    const textoEl = document.getElementById(`${p}-intertexto-texto`);
    const linkEl = document.getElementById(`${p}-intertexto-link`);
    const linkTextoEl = document.getElementById(`${p}-intertexto-link-texto`);
    const notaEl = document.getElementById(`${p}-intertexto-nota`);
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (textoEl) textoEl.value = item.texto || '';
    if (linkEl) linkEl.value = item.link || '';
    if (linkTextoEl) linkTextoEl.value = item.linkTexto || '';
    if (notaEl) notaEl.value = item.nota || '';
    textoEl?.focus();
    atualizarBotaoIntertexto(tabela);
}
export function cancelarEdicaoIntertexto(tabela) {
    listaIntertexto(tabela).cancelarEdicao();
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-intertexto-tipo`);
    const textoEl = document.getElementById(`${p}-intertexto-texto`);
    const linkEl = document.getElementById(`${p}-intertexto-link`);
    const linkTextoEl = document.getElementById(`${p}-intertexto-link-texto`);
    const notaEl = document.getElementById(`${p}-intertexto-nota`);
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (linkTextoEl) linkTextoEl.value = '';
    if (notaEl) notaEl.value = '';
    atualizarBotaoIntertexto(tabela);
}
export function removerIntertexto(tabela, indice) {
    listaIntertexto(tabela).remover(indice);
    atualizarBotaoIntertexto(tabela);
}
export function obterIntertextualidade(tabela) {
    return listaIntertexto(tabela).obterItens();
}
export function carregarIntertextualidade(tabela, lista) {
    listaIntertexto(tabela).carregar(lista);
    atualizarBotaoIntertexto(tabela);
}
export function resetIntertextualidade(tabela) {
    listaIntertexto(tabela).reset();
    atualizarBotaoIntertexto(tabela);
}

// ─── Referências (lista de tipo+texto+link+linkTexto+nota) ─────
// Par de Intertextualidade dentro do grupo "Intertextualidade e
// Referências": mesmo motor/schema (tipo e texto livres com datalist de
// sugestão, tipo filtra as sugestões de texto — ver
// atualizarDatalistTextoIntertexto acima, espelhado aqui em
// atualizarDatalistTextoReferenciaExterna — arrays diferentes, mesmo
// mecanismo), mas diálogo com um tipo
// diferente de "fora do acervo": não um artefato específico (livro,
// música...), e sim algo que ancora o texto num tempo/mundo comum —
// Marco Histórico, Notícia, Pessoa Pública, Astrologia
// (TIPOS_REFERENCIA_EXTERNA_SUGERIDOS em utils.js). Campo interno
// `referenciasExternas` —
// deliberadamente distinto da chave antiga `conceitos.referencias`
// (agora `conceitos.ecos`), pra não haver ambiguidade lendo o código:
// o rótulo "Referências" é novo aqui, a chave também.
function renderItemReferenciaExterna(it) {
    const badge = it.tipo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
        : '';
    const link = it.link
        ? ` <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline text-[11px] break-all">${escapeHtml(it.linkTexto || it.link)}</a>`
        : '';
    const nota = it.nota ? ` — ${escapeHtml(it.nota)}` : '';
    return `${badge}${escapeHtml(it.texto || '')}${link}${nota}`;
}

const listaReferenciaExternaPoema = criarListaDeEntradas({
    tabela: 'poemas',
    containerId: 'p-refext-lista',
    renderItem: renderItemReferenciaExterna,
    nomeFuncaoRemover: 'removerReferenciaExterna',
    nomeFuncaoEditar: 'editarReferenciaExterna',
});
const listaReferenciaExternaProsa = criarListaDeEntradas({
    tabela: 'prosas',
    containerId: 'pr-refext-lista',
    renderItem: renderItemReferenciaExterna,
    nomeFuncaoRemover: 'removerReferenciaExterna',
    nomeFuncaoEditar: 'editarReferenciaExterna',
});
function listaReferenciaExterna(tabela) {
    if (tabela === 'poemas') return listaReferenciaExternaPoema;
    if (tabela === 'prosas') return listaReferenciaExternaProsa;
    throw new Error(`Tabela desconhecida em listaReferenciaExterna: ${tabela}`);
}

function atualizarBotaoReferenciaExterna(tabela) {
    const p = prefixoDom(tabela);
    const btnAdd = document.getElementById(`${p}-refext-btn-add`);
    const btnCancelar = document.getElementById(`${p}-refext-btn-cancelar`);
    const emEdicao = listaReferenciaExterna(tabela).estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

// Prosa não tem versão global do datalist de Tipo em index.html (só a
// de Poema) — mesmo motivo do sufixo '-prosa' em atualizarDatalistIntertexto.
export function atualizarDatalistReferenciaExterna(tabela) {
    const p = prefixoDom(tabela);
    const dados = tabela === 'prosas' ? db.prosas || [] : db.poemas;
    const sufixo = tabela === 'prosas' ? '-prosa' : '';
    atualizarDatalistTextoReferenciaExterna(dados, `${p}-refext-tipo`, `sugestoes-refext${sufixo}`);
    const datalistTipo = document.getElementById(`sugestoes-refext-tipo${sufixo}`);
    if (datalistTipo) {
        datalistTipo.innerHTML = extrairTiposReferenciaExternaUnicos(dados)
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
}

// ─── Hipertextualidade (lista de tipo+relação+hipotexto+link+linkTexto+nota) ─
// Terceiro campo do grupo "Transtextualidade e Referências (Externas)",
// entre Intertextualidade e Referências. Diferente da primeira versão
// (um par único de campos direto no item), agora é uma lista — mesmo
// motor genérico (criarListaDeEntradas) de Intertextualidade/
// Referências logo acima — porque um texto pode ser hipertexto de mais
// de um hipotexto (ex.: uma paródia que mistura duas obras de origem).
// Tipo reaproveita o mesmo papel de mídia de Intertextualidade (livro,
// música, série...); Relação é a natureza do diálogo (Releitura,
// Paródia...); Hipotexto é o nome da obra de origem — ver
// corpoEntradaHipertextualidade (utils.js) pra como os dois últimos
// viram texto.
function renderItemHipertextualidade(h) {
    const badge = h.tipo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(h.tipo)}</span>`
        : '';
    const link = h.link
        ? ` <a href="${escapeHtml(h.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline text-[11px] break-all">${escapeHtml(h.linkTexto || h.link)}</a>`
        : '';
    const nota = h.nota ? ` — ${escapeHtml(h.nota)}` : '';
    return `${badge}${escapeHtml(corpoEntradaHipertextualidade(h))}${link}${nota}`;
}

const listaHipertextualidadePoema = criarListaDeEntradas({
    tabela: 'poemas',
    containerId: 'p-hipertexto-lista',
    renderItem: renderItemHipertextualidade,
    nomeFuncaoRemover: 'removerHipertextualidade',
    nomeFuncaoEditar: 'editarHipertextualidade',
});
const listaHipertextualidadeProsa = criarListaDeEntradas({
    tabela: 'prosas',
    containerId: 'pr-hipertexto-lista',
    renderItem: renderItemHipertextualidade,
    nomeFuncaoRemover: 'removerHipertextualidade',
    nomeFuncaoEditar: 'editarHipertextualidade',
});
function listaHipertextualidade(tabela) {
    if (tabela === 'poemas') return listaHipertextualidadePoema;
    if (tabela === 'prosas') return listaHipertextualidadeProsa;
    throw new Error(`Tabela desconhecida em listaHipertextualidade: ${tabela}`);
}

function atualizarBotaoHipertextualidade(tabela) {
    const p = prefixoDom(tabela);
    const btnAdd = document.getElementById(`${p}-hipertexto-btn-add`);
    const btnCancelar = document.getElementById(`${p}-hipertexto-btn-cancelar`);
    const emEdicao = listaHipertextualidade(tabela).estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

// Espelha atualizarDatalistTextoIntertexto acima: refiltra as sugestões
// de Hipotexto pelo Tipo de mídia já escolhido.
function atualizarDatalistTextoHipertextualidade(itens, tipoElId, datalistHipotextoId) {
    const datalist = document.getElementById(datalistHipotextoId);
    if (!datalist) return;
    const tipoAtual = document.getElementById(tipoElId)?.value.trim() || null;
    datalist.innerHTML = extrairHipotextosUnicos(itens, tipoAtual)
        .map((v) => `<option value="${escapeHtml(v)}">`)
        .join('');
}

// Prosa não tem versão global do datalist de Tipo em index.html (só a
// de Poema) — mesmo motivo do sufixo '-prosa' em atualizarDatalistIntertexto.
export function atualizarDatalistHipertextualidade(tabela) {
    const p = prefixoDom(tabela);
    const dados = tabela === 'prosas' ? db.prosas || [] : db.poemas;
    const sufixo = tabela === 'prosas' ? '-prosa' : '';
    atualizarDatalistTextoHipertextualidade(
        dados,
        `${p}-hipertexto-tipo`,
        `sugestoes-hipertexto-hipotexto${sufixo}`,
    );
    const datalistTipo = document.getElementById(`sugestoes-hipertexto-tipo${sufixo}`);
    if (datalistTipo) {
        datalistTipo.innerHTML = extrairTiposHipertextualidadeUnicos(dados)
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
    const datalistRelacao = document.getElementById(`sugestoes-hipertexto-relacao${sufixo}`);
    if (datalistRelacao) {
        datalistRelacao.innerHTML = extrairRelacoesHipertextualidadeUnicas(dados)
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
}

export function adicionarHipertextualidade(tabela) {
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-hipertexto-tipo`);
    const relacaoEl = document.getElementById(`${p}-hipertexto-relacao`);
    const hipotextoEl = document.getElementById(`${p}-hipertexto-hipotexto`);
    const linkEl = document.getElementById(`${p}-hipertexto-link`);
    const linkTextoEl = document.getElementById(`${p}-hipertexto-link-texto`);
    const notaEl = document.getElementById(`${p}-hipertexto-nota`);
    const tipo = tipoEl?.value || '';
    const relacao = (relacaoEl?.value || '').trim();
    const hipotexto = (hipotextoEl?.value || '').trim();
    const link = (linkEl?.value || '').trim();
    const linkTexto = (linkTextoEl?.value || '').trim();
    const nota = (notaEl?.value || '').trim();
    if (!tipo && !relacao && !hipotexto && !link && !linkTexto && !nota) return;
    listaHipertextualidade(tabela).salvar({ tipo, relacao, hipotexto, link, linkTexto, nota });
    if (tipoEl) tipoEl.value = '';
    if (relacaoEl) relacaoEl.value = '';
    if (hipotextoEl) hipotextoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (linkTextoEl) linkTextoEl.value = '';
    if (notaEl) notaEl.value = '';
    atualizarBotaoHipertextualidade(tabela);
    atualizarDatalistHipertextualidade(tabela);
}
export function editarHipertextualidade(tabela, indice) {
    const item = listaHipertextualidade(tabela).iniciarEdicao(indice);
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-hipertexto-tipo`);
    const relacaoEl = document.getElementById(`${p}-hipertexto-relacao`);
    const hipotextoEl = document.getElementById(`${p}-hipertexto-hipotexto`);
    const linkEl = document.getElementById(`${p}-hipertexto-link`);
    const linkTextoEl = document.getElementById(`${p}-hipertexto-link-texto`);
    const notaEl = document.getElementById(`${p}-hipertexto-nota`);
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (relacaoEl) relacaoEl.value = item.relacao || '';
    if (hipotextoEl) hipotextoEl.value = item.hipotexto || '';
    if (linkEl) linkEl.value = item.link || '';
    if (linkTextoEl) linkTextoEl.value = item.linkTexto || '';
    if (notaEl) notaEl.value = item.nota || '';
    relacaoEl?.focus();
    atualizarBotaoHipertextualidade(tabela);
}
export function cancelarEdicaoHipertextualidade(tabela) {
    listaHipertextualidade(tabela).cancelarEdicao();
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-hipertexto-tipo`);
    const relacaoEl = document.getElementById(`${p}-hipertexto-relacao`);
    const hipotextoEl = document.getElementById(`${p}-hipertexto-hipotexto`);
    const linkEl = document.getElementById(`${p}-hipertexto-link`);
    const linkTextoEl = document.getElementById(`${p}-hipertexto-link-texto`);
    const notaEl = document.getElementById(`${p}-hipertexto-nota`);
    if (tipoEl) tipoEl.value = '';
    if (relacaoEl) relacaoEl.value = '';
    if (hipotextoEl) hipotextoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (linkTextoEl) linkTextoEl.value = '';
    if (notaEl) notaEl.value = '';
    atualizarBotaoHipertextualidade(tabela);
}
export function removerHipertextualidade(tabela, indice) {
    listaHipertextualidade(tabela).remover(indice);
    atualizarBotaoHipertextualidade(tabela);
}
export function obterHipertextualidade(tabela) {
    return listaHipertextualidade(tabela).obterItens();
}
export function carregarHipertextualidade(tabela, lista) {
    listaHipertextualidade(tabela).carregar(lista);
    atualizarBotaoHipertextualidade(tabela);
}
export function resetHipertextualidade(tabela) {
    listaHipertextualidade(tabela).reset();
    atualizarBotaoHipertextualidade(tabela);
}

export function adicionarReferenciaExterna(tabela) {
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-refext-tipo`);
    const textoEl = document.getElementById(`${p}-refext-texto`);
    const linkEl = document.getElementById(`${p}-refext-link`);
    const linkTextoEl = document.getElementById(`${p}-refext-link-texto`);
    const notaEl = document.getElementById(`${p}-refext-nota`);
    const tipo = tipoEl?.value || '';
    const texto = (textoEl?.value || '').trim();
    const link = (linkEl?.value || '').trim();
    const linkTexto = (linkTextoEl?.value || '').trim();
    const nota = (notaEl?.value || '').trim();
    if (!tipo && !texto && !link && !linkTexto && !nota) return;
    listaReferenciaExterna(tabela).salvar({ tipo, texto, link, linkTexto, nota });
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (linkTextoEl) linkTextoEl.value = '';
    if (notaEl) notaEl.value = '';
    atualizarBotaoReferenciaExterna(tabela);
    atualizarDatalistReferenciaExterna(tabela);
}
export function editarReferenciaExterna(tabela, indice) {
    const item = listaReferenciaExterna(tabela).iniciarEdicao(indice);
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-refext-tipo`);
    const textoEl = document.getElementById(`${p}-refext-texto`);
    const linkEl = document.getElementById(`${p}-refext-link`);
    const linkTextoEl = document.getElementById(`${p}-refext-link-texto`);
    const notaEl = document.getElementById(`${p}-refext-nota`);
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (textoEl) textoEl.value = item.texto || '';
    if (linkEl) linkEl.value = item.link || '';
    if (linkTextoEl) linkTextoEl.value = item.linkTexto || '';
    if (notaEl) notaEl.value = item.nota || '';
    textoEl?.focus();
    atualizarBotaoReferenciaExterna(tabela);
}
export function cancelarEdicaoReferenciaExterna(tabela) {
    listaReferenciaExterna(tabela).cancelarEdicao();
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-refext-tipo`);
    const textoEl = document.getElementById(`${p}-refext-texto`);
    const linkEl = document.getElementById(`${p}-refext-link`);
    const linkTextoEl = document.getElementById(`${p}-refext-link-texto`);
    const notaEl = document.getElementById(`${p}-refext-nota`);
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (linkTextoEl) linkTextoEl.value = '';
    if (notaEl) notaEl.value = '';
    atualizarBotaoReferenciaExterna(tabela);
}
export function removerReferenciaExterna(tabela, indice) {
    listaReferenciaExterna(tabela).remover(indice);
    atualizarBotaoReferenciaExterna(tabela);
}
export function obterReferenciasExternas(tabela) {
    return listaReferenciaExterna(tabela).obterItens();
}
export function carregarReferenciasExternas(tabela, lista) {
    listaReferenciaExterna(tabela).carregar(lista);
    atualizarBotaoReferenciaExterna(tabela);
}
export function resetReferenciasExternas(tabela) {
    listaReferenciaExterna(tabela).reset();
    atualizarBotaoReferenciaExterna(tabela);
}

// ─── Anexos (lista de tipo+texto+link) ─────────────────────────
// Um texto pode ter um ou vários anexos associados (ilustração,
// foto, lettering, declamação/comentários em vídeo...), cada um com
// tipo + descrição (textarea, texto longo — ver modal-poema.html e
// o atalho Ctrl/Cmd+Enter em initEditor()) + link opcional. Para os
// tipos de vídeo o link é obrigatório, já que a descrição sozinha
// não dá acesso ao conteúdo.
const TIPOS_ANEXO_COM_LINK_OBRIGATORIO = ['Declamação em vídeo', 'Comentários em vídeo'];

function renderItemAnexo(it) {
    const badge = it.tipo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
        : '';
    const link = it.link
        ? ` <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline text-[11px]">${escapeHtml(it.link)}</a>`
        : '';
    return `${badge}${escapeHtml(it.texto || '')}${link}`;
}

const listaAnexosPoema = criarListaDeEntradas({
    tabela: 'poemas',
    containerId: 'p-anexos-lista',
    renderItem: renderItemAnexo,
    nomeFuncaoRemover: 'removerAnexo',
    nomeFuncaoEditar: 'editarAnexo',
});
const listaAnexosProsa = criarListaDeEntradas({
    tabela: 'prosas',
    containerId: 'pr-anexos-lista',
    renderItem: renderItemAnexo,
    nomeFuncaoRemover: 'removerAnexo',
    nomeFuncaoEditar: 'editarAnexo',
});
function listaAnexos(tabela) {
    if (tabela === 'poemas') return listaAnexosPoema;
    if (tabela === 'prosas') return listaAnexosProsa;
    throw new Error(`Tabela desconhecida em listaAnexos: ${tabela}`);
}

function atualizarBotaoAnexo(tabela) {
    const p = prefixoDom(tabela);
    const btnAdd = document.getElementById(`${p}-anexo-btn-add`);
    const btnCancelar = document.getElementById(`${p}-anexo-btn-cancelar`);
    const emEdicao = listaAnexos(tabela).estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓ Salvar edição' : '+ Adicionar anexo';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function adicionarAnexo(tabela, valor = null) {
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-anexo-tipo`);
    const linkEl = document.getElementById(`${p}-anexo-link`);
    const textoEl = document.getElementById(`${p}-anexo-input`);

    const tipo = tipoEl?.value || '';
    const link = (linkEl?.value || '').trim();
    const texto = (valor ?? textoEl?.value ?? '').trim();

    if (!tipo && !texto && !link) return;

    if (TIPOS_ANEXO_COM_LINK_OBRIGATORIO.includes(tipo) && !link) {
        mostrarAviso(`Anexos do tipo "${tipo}" precisam de um link.`);
        return;
    }

    listaAnexos(tabela).salvar({ tipo, texto, link });
    if (tipoEl) tipoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnexo(tabela);
}
export function editarAnexo(tabela, indice) {
    const item = listaAnexos(tabela).iniciarEdicao(indice);
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-anexo-tipo`);
    const linkEl = document.getElementById(`${p}-anexo-link`);
    const textoEl = document.getElementById(`${p}-anexo-input`);
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (linkEl) linkEl.value = item.link || '';
    if (textoEl) textoEl.value = item.texto || '';
    textoEl?.focus();
    atualizarBotaoAnexo(tabela);
}
export function cancelarEdicaoAnexo(tabela) {
    listaAnexos(tabela).cancelarEdicao();
    const p = prefixoDom(tabela);
    const tipoEl = document.getElementById(`${p}-anexo-tipo`);
    const linkEl = document.getElementById(`${p}-anexo-link`);
    const textoEl = document.getElementById(`${p}-anexo-input`);
    if (tipoEl) tipoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnexo(tabela);
}
export function removerAnexo(tabela, indice) {
    listaAnexos(tabela).remover(indice);
    atualizarBotaoAnexo(tabela);
}
export function obterAnexos(tabela) {
    return listaAnexos(tabela).obterItens();
}
export function carregarAnexos(tabela, lista) {
    // Compatível com o formato antigo (array de strings, só descrição).
    const normalizada = Array.isArray(lista)
        ? lista.map((it) => (typeof it === 'string' ? { tipo: '', texto: it, link: '' } : it))
        : [];
    listaAnexos(tabela).carregar(normalizada);
    atualizarBotaoAnexo(tabela);
}
export function resetAnexos(tabela) {
    listaAnexos(tabela).reset();
    atualizarBotaoAnexo(tabela);
}

// ─── Lojas (livro — lista de nome+link) ────────────────────────
// Onde o livro é vendido (loja, editora, marketplace...) + o link
// direto pra página de venda. Vive no Livro, não no Poema/Prosa —
// mesmo motor genérico (criarListaDeEntradas) usado acima, só com
// dois campos (nome, link) em vez dos três+ de Anexos/Envios.
const listaLojasLivro = criarListaDeEntradas({
    containerId: 'l-lojas-lista',
    renderItem: (it) => {
        const nome = it.nome ? `<span class="font-semibold">${escapeHtml(it.nome)}</span>` : '';
        const link = it.url
            ? ` <a href="${escapeHtml(it.url)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline text-[11px]">${escapeHtml(it.url)}</a>`
            : '';
        return `${nome}${nome && link ? ' —' : ''}${link}`;
    },
    nomeFuncaoRemover: 'removerLoja',
    nomeFuncaoEditar: 'editarLoja',
});

function atualizarBotaoLoja() {
    const btnAdd = document.getElementById('l-loja-btn-add');
    const btnCancelar = document.getElementById('l-loja-btn-cancelar');
    const emEdicao = listaLojasLivro.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓ Salvar edição' : '+ Adicionar loja';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function adicionarLoja() {
    const nomeEl = document.getElementById('l-loja-nome');
    const urlEl = document.getElementById('l-loja-url');

    const nome = (nomeEl?.value || '').trim();
    const url = (urlEl?.value || '').trim();
    if (!nome && !url) return;

    listaLojasLivro.salvar({ nome, url });
    if (nomeEl) nomeEl.value = '';
    if (urlEl) urlEl.value = '';
    atualizarBotaoLoja();
}
export function editarLoja(indice) {
    const item = listaLojasLivro.iniciarEdicao(indice);
    const nomeEl = document.getElementById('l-loja-nome');
    const urlEl = document.getElementById('l-loja-url');
    if (nomeEl) nomeEl.value = item.nome || '';
    if (urlEl) urlEl.value = item.url || '';
    nomeEl?.focus();
    atualizarBotaoLoja();
}
export function cancelarEdicaoLoja() {
    listaLojasLivro.cancelarEdicao();
    const nomeEl = document.getElementById('l-loja-nome');
    const urlEl = document.getElementById('l-loja-url');
    if (nomeEl) nomeEl.value = '';
    if (urlEl) urlEl.value = '';
    atualizarBotaoLoja();
}
export function removerLoja(indice) {
    listaLojasLivro.remover(indice);
    atualizarBotaoLoja();
}
export function obterLojas() {
    return listaLojasLivro.obterItens();
}
export function carregarLojas(lista) {
    listaLojasLivro.carregar(lista);
    atualizarBotaoLoja();
}
export function resetLojas() {
    listaLojasLivro.reset();
    atualizarBotaoLoja();
}

// ─── Elos / Ecos (lista de poema-alvo+tipo+texto) ───────────────
// Item 1 do plano de schema, par de Intratextualidade (o que acontece
// entre os textos do próprio acervo): cada elo/eco aponta pra outro
// poema (`id`) mais uma nota livre opcional. Elos = ligação estrutural/
// de derivação, sempre BILATERAL (Reescrita, Tradução, Resposta...);
// Ecos = ligação mais solta, sempre UNIDIRECIONAL (Personagem em comum,
// Imagem central compartilhada, Aceno a...), ainda com um `tipo` de
// lista fechada simples (TIPOS_ECO em utils.js). Ecos era chamado
// "Referências" — renomeado quando "Referências" passou a nomear um
// campo novo e distinto (diálogo com algo fora do acervo, tipado, mas
// sem vínculo por id — ver bloco de Referências Externas mais abaixo,
// ao lado de Intertextualidade).
//
// Elos usa um schema diferente de Ecos desde o redesenho
// Relação+Direção: em vez de `tipo` (lista fechada de rótulos, um valor
// por rótulo possível — "Reescrita de" e "Reescrito em" eram dois
// valores em vez de dois lados da mesma relação), guarda `relacao` (uma
// das 8 relações, ver RELACOES_ELO em utils.js) + `direcao` ('origem' =
// texto mais antigo/base, 'destino' = texto derivado/mais novo). O
// rótulo mostrado (ver rotuloElo em utils.js) é sempre derivado dos
// dois — os dois botões de direção no modal já mostram o rótulo de
// verdade pra Relação escolhida (ver atualizarRotulosDirecaoElo
// abaixo), não "Origem"/"Destino" cru.
//
// Poema e Prosa compartilham motor + nomes de função (mesmo padrão do
// item 6/Intertextualidade/Anexos acima) — resolverItemVinculado busca
// nos dois arrays (Poema só aponta pra outros Poemas por ora, ver
// renderDropdowns em ui.js, mas ids nunca colidem entre os dois
// arrays, então buscar nos dois não muda o resultado do lado Poema).

function resolverItemVinculado(id) {
    return db.poemas.find((p) => p.id == id) || (db.prosas || []).find((pr) => pr.id == id);
}

function renderItemEloBilateral(it, tabela) {
    const item = resolverItemVinculado(it.id);
    const rotulo = it.relacao ? rotuloElo(it.relacao, it.direcao) : '';
    const badge = rotulo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(rotulo)}</span>`
        : '';
    const rotuloRemovido = tabela === 'prosas' ? '(texto removido)' : '(poema removido)';
    const titulo = item
        ? escapeHtml(item.titulo)
        : `<span class="italic text-gray-400 dark:text-slate-500">${rotuloRemovido}</span>`;
    const nota = it.texto ? ` — ${escapeHtml(it.texto)}` : '';
    return `${badge}${titulo}${nota}`;
}

function renderItemEco(it, tabela) {
    const item = resolverItemVinculado(it.id);
    const rotulo = rotuloEco(db, it, 2);
    const badge = rotulo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(rotulo)}</span>`
        : '';
    // Âncora que deixou de valer (um dos textos perdeu o vínculo) fica à vista.
    const modal = estadoModalAncora(tabela);
    const desatualizada =
        item && modal && (it.ancoras || []).some((a) => !ancoraAtiva(modal, item, a));
    const aviso = desatualizada
        ? ' <span class="text-amber-600 dark:text-amber-400" title="Uma âncora não está mais nos dois textos">⚠</span>'
        : '';
    const rotuloRemovido = tabela === 'prosas' ? '(texto removido)' : '(poema removido)';
    const titulo = item
        ? escapeHtml(item.titulo)
        : `<span class="italic text-gray-400 dark:text-slate-500">${rotuloRemovido}</span>`;
    const nota = it.texto ? ` — ${escapeHtml(it.texto)}` : '';
    return `${badge}${aviso}${titulo}${nota}`;
}

// Personagens e pessoas ainda não salvos do texto aberto no modal (o que a
// âncora precisa para saber quem está nos dois textos).
function estadoModalAncora(tabela) {
    const modal = { personagens: [], pessoas: [] };
    try {
        modal.personagens = lerPersonagens(tabela);
        modal.pessoas = grupoPessoas(tabela).obterItens();
    } catch {
        return null;
    }
    return modal;
}

const listaElosPoema = criarListaDeEntradas({
    tabela: 'poemas',
    containerId: 'p-elos-lista',
    renderItem: (it) => renderItemEloBilateral(it, 'poemas'),
    nomeFuncaoRemover: 'removerElo',
    nomeFuncaoEditar: 'editarElo',
});
const listaElosProsa = criarListaDeEntradas({
    tabela: 'prosas',
    containerId: 'pr-elos-lista',
    renderItem: (it) => renderItemEloBilateral(it, 'prosas'),
    nomeFuncaoRemover: 'removerElo',
    nomeFuncaoEditar: 'editarElo',
});
function listaElos(tabela) {
    if (tabela === 'poemas') return listaElosPoema;
    if (tabela === 'prosas') return listaElosProsa;
    throw new Error(`Tabela desconhecida em listaElos: ${tabela}`);
}

const listaEcosPoema = criarListaDeEntradas({
    tabela: 'poemas',
    containerId: 'p-ecos-lista',
    renderItem: (it) => renderItemEco(it, 'poemas'),
    nomeFuncaoRemover: 'removerEco',
    nomeFuncaoEditar: 'editarEco',
});
const listaEcosProsa = criarListaDeEntradas({
    tabela: 'prosas',
    containerId: 'pr-ecos-lista',
    renderItem: (it) => renderItemEco(it, 'prosas'),
    nomeFuncaoRemover: 'removerEco',
    nomeFuncaoEditar: 'editarEco',
});
function listaEcos(tabela) {
    if (tabela === 'poemas') return listaEcosPoema;
    if (tabela === 'prosas') return listaEcosProsa;
    throw new Error(`Tabela desconhecida em listaEcos: ${tabela}`);
}

function atualizarBotaoElo(tabela) {
    const p = prefixoDom(tabela);
    const btnAdd = document.getElementById(`${p}-elo-btn-add`);
    const btnCancelar = document.getElementById(`${p}-elo-btn-cancelar`);
    const emEdicao = listaElos(tabela).estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

function atualizarBotaoEco(tabela) {
    const p = prefixoDom(tabela);
    const btnAdd = document.getElementById(`${p}-eco-btn-add`);
    const btnCancelar = document.getElementById(`${p}-eco-btn-cancelar`);
    const emEdicao = listaEcos(tabela).estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

// Atualiza o texto dos dois botões de direção pra o rótulo de verdade
// da Relação escolhida (ex.: Relação "Reescrita" → botões viram
// "Reescrito em" / "Reescrita de") — sem relação escolhida ainda,
// caem pro rótulo genérico Origem/Destino. Não mexe em qual botão está
// marcado como ativo; ver marcarDirecaoElo pra isso.
export function atualizarRotulosDirecaoElo(tabela) {
    const p = prefixoDom(tabela);
    const relacao = document.getElementById(`${p}-elo-relacao`)?.value || '';
    const btnOrigem = document.getElementById(`${p}-elo-direcao-origem`);
    const btnDestino = document.getElementById(`${p}-elo-direcao-destino`);
    if (btnOrigem) btnOrigem.textContent = relacao ? rotuloElo(relacao, 'origem') : 'Origem';
    if (btnDestino) btnDestino.textContent = relacao ? rotuloElo(relacao, 'destino') : 'Destino';
}

// Chamado pelo onchange do select de Relação: atualiza os rótulos dos
// botões E limpa a direção já marcada (uma direção escolhida pra
// Relação anterior não necessariamente faz sentido pra nova).
export function onRelacaoEloAlterada(tabela) {
    atualizarRotulosDirecaoElo(tabela);
    marcarDirecaoElo(tabela, '');
}

// Marca visualmente qual botão de direção está ativo e grava o valor
// no input escondido `<p>-elo-direcao`, que é o que adicionarElo/
// editarElo de fato leem/gravam.
function marcarDirecaoElo(tabela, direcao) {
    const p = prefixoDom(tabela);
    const hidden = document.getElementById(`${p}-elo-direcao`);
    if (hidden) hidden.value = direcao;
    const ativa =
        'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300';
    const inativa =
        'bg-transparent border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400';
    const btnOrigem = document.getElementById(`${p}-elo-direcao-origem`);
    const btnDestino = document.getElementById(`${p}-elo-direcao-destino`);
    if (btnOrigem)
        btnOrigem.className = `elo-direcao-btn text-xs flex-1 px-2 py-1 rounded border ${direcao === 'origem' ? ativa : inativa}`;
    if (btnDestino)
        btnDestino.className = `elo-direcao-btn text-xs flex-1 px-2 py-1 rounded border ${direcao === 'destino' ? ativa : inativa}`;
}

export function selecionarDirecaoElo(tabela, direcao) {
    marcarDirecaoElo(tabela, direcao);
}

export function adicionarElo(tabela) {
    const p = prefixoDom(tabela);
    const poemaEl = document.getElementById(`${p}-elo-poema`);
    const relacaoEl = document.getElementById(`${p}-elo-relacao`);
    const direcaoEl = document.getElementById(`${p}-elo-direcao`);
    const textoEl = document.getElementById(`${p}-elo-texto`);
    const id = poemaEl?.value ? parseInt(poemaEl.value, 10) : null;
    if (!id) return;
    listaElos(tabela).salvar({
        id,
        relacao: relacaoEl?.value || '',
        direcao: direcaoEl?.value || '',
        texto: (textoEl?.value || '').trim(),
    });
    if (poemaEl) poemaEl.value = '';
    if (relacaoEl) relacaoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarRotulosDirecaoElo(tabela);
    marcarDirecaoElo(tabela, '');
    atualizarBotaoElo(tabela);
}
export function editarElo(tabela, indice) {
    const item = listaElos(tabela).iniciarEdicao(indice);
    const p = prefixoDom(tabela);
    const poemaEl = document.getElementById(`${p}-elo-poema`);
    const relacaoEl = document.getElementById(`${p}-elo-relacao`);
    const textoEl = document.getElementById(`${p}-elo-texto`);
    if (poemaEl) poemaEl.value = item.id ?? '';
    if (relacaoEl) relacaoEl.value = item.relacao || '';
    if (textoEl) textoEl.value = item.texto || '';
    atualizarRotulosDirecaoElo(tabela);
    marcarDirecaoElo(tabela, item.direcao || '');
    atualizarBotaoElo(tabela);
}
export function cancelarEdicaoElo(tabela) {
    listaElos(tabela).cancelarEdicao();
    const p = prefixoDom(tabela);
    const poemaEl = document.getElementById(`${p}-elo-poema`);
    const relacaoEl = document.getElementById(`${p}-elo-relacao`);
    const textoEl = document.getElementById(`${p}-elo-texto`);
    if (poemaEl) poemaEl.value = '';
    if (relacaoEl) relacaoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarRotulosDirecaoElo(tabela);
    marcarDirecaoElo(tabela, '');
    atualizarBotaoElo(tabela);
}
export function removerElo(tabela, indice) {
    listaElos(tabela).remover(indice);
    atualizarBotaoElo(tabela);
}
export function obterElos(tabela) {
    return listaElos(tabela).obterItens();
}
export function carregarElos(tabela, lista) {
    listaElos(tabela).carregar(lista);
    atualizarBotaoElo(tabela);
}
export function resetElos(tabela) {
    listaElos(tabela).reset();
    const p = prefixoDom(tabela);
    const relacaoEl = document.getElementById(`${p}-elo-relacao`);
    if (relacaoEl) relacaoEl.value = '';
    atualizarRotulosDirecaoElo(tabela);
    marcarDirecaoElo(tabela, '');
    atualizarBotaoElo(tabela);
}

export function adicionarEco(tabela) {
    const p = prefixoDom(tabela);
    const poemaEl = document.getElementById(`${p}-eco-poema`);
    const tipoEl = document.getElementById(`${p}-eco-tipo`);
    const textoEl = document.getElementById(`${p}-eco-texto`);
    const id = poemaEl?.value ? parseInt(poemaEl.value, 10) : null;
    if (!id) return;
    const tipo = tipoEl?.value || '';
    // Âncora é opcional e só existe nos tipos que a aceitam; sem âncora o Eco
    // fica no formato antigo (sem o campo).
    const ancoras = normalizarAncorasEco(ancorasSelecionadas(tabela), tipo);
    listaEcos(tabela).salvar({
        id,
        tipo,
        texto: (textoEl?.value || '').trim(),
        ...(ancoras.length ? { ancoras } : {}),
    });
    limparCamposEco(tabela);
}

function limparCamposEco(tabela) {
    const p = prefixoDom(tabela);
    const poemaEl = document.getElementById(`${p}-eco-poema`);
    const tipoEl = document.getElementById(`${p}-eco-tipo`);
    const textoEl = document.getElementById(`${p}-eco-texto`);
    if (poemaEl) poemaEl.value = '';
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    limparAncoras(tabela);
    atualizarBotaoEco(tabela);
}

export function editarEco(tabela, indice) {
    const item = listaEcos(tabela).iniciarEdicao(indice);
    const p = prefixoDom(tabela);
    const poemaEl = document.getElementById(`${p}-eco-poema`);
    const tipoEl = document.getElementById(`${p}-eco-tipo`);
    const textoEl = document.getElementById(`${p}-eco-texto`);
    if (poemaEl) poemaEl.value = item.id ?? '';
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (textoEl) textoEl.value = item.texto || '';
    definirAncoras(tabela, item.tipo || '', item.ancoras || []);
    atualizarBotaoEco(tabela);
}
export function cancelarEdicaoEco(tabela) {
    listaEcos(tabela).cancelarEdicao();
    limparCamposEco(tabela);
}
export function removerEco(tabela, indice) {
    listaEcos(tabela).remover(indice);
    atualizarBotaoEco(tabela);
}
export function obterEcos(tabela) {
    return listaEcos(tabela).obterItens();
}
// Cópia dos Ecos do texto: o modal edita as âncoras (ao tirar um personagem,
// por exemplo) e cancelar o modal não pode alterar o registro salvo.
export function carregarEcos(tabela, lista) {
    const copia = (Array.isArray(lista) ? lista : []).map((eco) =>
        Array.isArray(eco?.ancoras) ? { ...eco, ancoras: eco.ancoras.map((a) => ({ ...a })) } : eco,
    );
    listaEcos(tabela).carregar(copia);
    limparPendenciasAncora(tabela);
    limparAncoras(tabela);
    atualizarBotaoEco(tabela);
}
export function resetEcos(tabela) {
    listaEcos(tabela).reset();
    limparPendenciasAncora(tabela);
    limparAncoras(tabela);
    atualizarBotaoEco(tabela);
}
// Redesenha a lista de Ecos (as âncoras mudaram por fora, ver ancora-eco-ui.js).
export function repintarEcos(tabela) {
    listaEcos(tabela).renderizar();
}

// ─── Painel de Elos derivados (refinamento do item 1) ───────────
// Só pra Elos (bilaterais) — Ecos são unidirecionais por
// natureza, sem "outro lado" a inferir. Quando o poema B é alvo de um
// elo cadastrado no poema A, mas o poema B não tem um elo manual de
// volta pra A, mostra aqui um aviso calculado ("Referenciado por..."),
// sem duplicar o cadastro. Se o vínculo manual do lado de B for criado,
// o painel derivado some — pra não mostrar a mesma relação duas vezes.
// Desde o redesenho Relação+Direção, o rótulo do lado derivado é sempre
// calculado (mesma relação, direção invertida via direcaoInversa em
// utils.js) — não depende mais de um mapa de tipos com par nomeado.
// Item 4: Elos agora podem ligar Poema↔Prosa (não só Poema↔Poema), então
// o cálculo de derivados precisa varrer os dois arrays dos dois lados —
// tanto pra achar o item atual (que pode ser um poema OU uma prosa)
// quanto pros "outros" que podem ter um elo apontando pra ele. ids nunca
// colidem entre os dois arrays (gerarId() é um contador global único,
// ver resolverTituloPoemaOuProsa em render-listas.js pro mesmo padrão).
function todosItensComElos() {
    return [...db.poemas, ...(db.prosas || [])];
}

function elosDerivados(itemId) {
    if (!itemId) return [];
    const idAtual = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    if (!idAtual) return [];
    const todos = todosItensComElos();
    const itemAtual = todos.find((it) => it.id == idAtual);
    const idsJaLigados = new Set((itemAtual?.conceitos?.elos || []).map((e) => e.id));
    const derivados = [];
    for (const outro of todos) {
        if (outro.id == idAtual) continue;
        for (const elo of outro.conceitos?.elos || []) {
            if (elo.id == idAtual && !idsJaLigados.has(outro.id)) {
                derivados.push({
                    id: outro.id,
                    titulo: outro.titulo,
                    rotulo: elo.relacao ? rotuloElo(elo.relacao, direcaoInversa(elo.direcao)) : '',
                });
            }
        }
    }
    return derivados;
}

function renderizarPainelElosDerivadosEm(containerId, itemId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const derivados = elosDerivados(itemId);
    if (!derivados.length) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');
    const linhas = derivados
        .map((d) => {
            const badge = d.rotulo
                ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-[10px] font-bold uppercase align-middle">${escapeHtml(d.rotulo)}</span>`
                : '';
            return `<div class="text-xs text-gray-500 dark:text-slate-400 italic">${badge}${escapeHtml(d.titulo)}</div>`;
        })
        .join('');
    container.innerHTML =
        `<div class="text-[11px] text-gray-400 dark:text-slate-500 mb-1">Referenciado por (calculado — sem elo cadastrado de volta):</div>` +
        linhas;
}

export function renderPainelElosDerivados(poemaId) {
    renderizarPainelElosDerivadosEm('p-elos-derivados', poemaId);
}

export function renderPainelElosDerivadosProsa(prosaId) {
    renderizarPainelElosDerivadosEm('pr-elos-derivados', prosaId);
}

// ─── Anotações Marginais (lista de trecho+posição+fonte+texto+notas) ─
// Comentários de outra "voz" escritos por cima do texto — em geral
// numa fonte cursiva diferente da do poema — associados a um verso ou
// estrofe específico. Diferente de Intertextualidade (diálogo com algo
// externo ao arquivo) e de Descrição Visual (o próprio poema disposto
// de forma incomum no espaço): aqui é um comentário externo ao poema,
// sobre um trecho dele.
//
// Posição e Fonte são texto livre (não um <select> fechado), porque a
// posição pode ser composta ("abaixo e à esquerda") e a fonte, embora
// costume ser a mesma, pode variar — ambas com autocompletar (ver
// atualizarDatalistAnotacoes) alimentado pelo que já foi digitado antes,
// pra puxar consistência sem travar o formato.
//
// Uma mesma referência (verso/estrofe) pode ter mais de uma anotação —
// ex.: uma "à direita" e sua continuação "abaixo e à esquerda" — cada
// lado é uma entrada própria, agrupadas na lista por aparecerem com a
// mesma referência de trecho.
//
// `notas` é observação SUA sobre a anotação em si (ex.: "texto escrito
// na diagonal", "trecho riscado/tachado por cima") — diferente de
// `texto`, que é a TRANSCRIÇÃO do que está escrito na margem. Mesmo
// papel que `notas` já cumpre em Envios e Reações (ver renderItemEnvio
// logo abaixo): campo livre opcional, exibido em itálico depois do
// conteúdo principal, tanto na lista do editor quanto na Visualização
// e no .md (ver listaHtml/'Anotações Marginais' em visualizar.js e o
// bloco correspondente em exportar-md.js).

const listaAnotacoesPoema = criarListaDeEntradas({
    containerId: 'p-anotacoes-lista',
    renderItem: (it) => {
        const trecho = it.trecho
            ? `<span class="block text-[11px] text-gray-400 dark:text-slate-500 italic mb-0.5">${escapeHtml(it.trecho)}</span>`
            : '';
        const meta = [it.posicao, it.fonte].filter(Boolean).map(escapeHtml).join(' · ');
        const metaHtml = meta
            ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-bold align-middle">${meta}</span>`
            : '';
        const notas = it.notas
            ? `<span class="block text-[11px] text-gray-400 dark:text-slate-500 italic mt-0.5">${escapeHtml(it.notas)}</span>`
            : '';
        return `${trecho}${metaHtml}${escapeHtml(it.texto || '')}${notas}`;
    },
    nomeFuncaoRemover: 'removerAnotacao',
    nomeFuncaoEditar: 'editarAnotacao',
});

function atualizarBotaoAnotacao() {
    const btnAdd = document.getElementById('p-anotacao-btn-add');
    const btnCancelar = document.getElementById('p-anotacao-btn-cancelar');
    const emEdicao = listaAnotacoesPoema.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓ Salvar edição' : '+ Adicionar anotação';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function atualizarDatalistAnotacoes() {
    const datalistPosicoes = document.getElementById('sugestoes-posicoes-anotacoes');
    if (datalistPosicoes) {
        datalistPosicoes.innerHTML = extrairValoresUnicosDeAnotacoes(db.poemas, 'posicao')
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
    const datalistFontes = document.getElementById('sugestoes-fontes-anotacoes');
    if (datalistFontes) {
        datalistFontes.innerHTML = extrairValoresUnicosDeAnotacoes(db.poemas, 'fonte')
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
}

export function adicionarAnotacao() {
    const trechoEl = document.getElementById('p-anotacao-trecho');
    const posicaoEl = document.getElementById('p-anotacao-posicao');
    const fonteEl = document.getElementById('p-anotacao-fonte');
    const textoEl = document.getElementById('p-anotacao-texto');
    const notasEl = document.getElementById('p-anotacao-notas');

    const trecho = (trechoEl?.value || '').trim();
    const posicao = (posicaoEl?.value || '').trim();
    const fonte = (fonteEl?.value || '').trim();
    const texto = (textoEl?.value || '').trim();
    const notas = (notasEl?.value || '').trim();
    if (!trecho && !posicao && !fonte && !texto && !notas) return;

    listaAnotacoesPoema.salvar({ trecho, posicao, fonte, texto, notas });
    if (trechoEl) trechoEl.value = '';
    if (posicaoEl) posicaoEl.value = '';
    if (fonteEl) fonteEl.value = '';
    if (textoEl) textoEl.value = '';
    if (notasEl) notasEl.value = '';
    atualizarBotaoAnotacao();
    atualizarDatalistAnotacoes();
}
export function editarAnotacao(indice) {
    const item = listaAnotacoesPoema.iniciarEdicao(indice);
    const trechoEl = document.getElementById('p-anotacao-trecho');
    const posicaoEl = document.getElementById('p-anotacao-posicao');
    const fonteEl = document.getElementById('p-anotacao-fonte');
    const textoEl = document.getElementById('p-anotacao-texto');
    const notasEl = document.getElementById('p-anotacao-notas');
    if (trechoEl) trechoEl.value = item.trecho || '';
    if (posicaoEl) posicaoEl.value = item.posicao || '';
    if (fonteEl) fonteEl.value = item.fonte || '';
    if (textoEl) textoEl.value = item.texto || '';
    if (notasEl) notasEl.value = item.notas || '';
    trechoEl?.focus();
    atualizarBotaoAnotacao();
}
export function cancelarEdicaoAnotacao() {
    listaAnotacoesPoema.cancelarEdicao();
    const trechoEl = document.getElementById('p-anotacao-trecho');
    const posicaoEl = document.getElementById('p-anotacao-posicao');
    const fonteEl = document.getElementById('p-anotacao-fonte');
    const textoEl = document.getElementById('p-anotacao-texto');
    const notasEl = document.getElementById('p-anotacao-notas');
    if (trechoEl) trechoEl.value = '';
    if (posicaoEl) posicaoEl.value = '';
    if (fonteEl) fonteEl.value = '';
    if (textoEl) textoEl.value = '';
    if (notasEl) notasEl.value = '';
    atualizarBotaoAnotacao();
}
export function removerAnotacao(indice) {
    listaAnotacoesPoema.remover(indice);
    atualizarBotaoAnotacao();
}
export function obterAnotacoes() {
    return listaAnotacoesPoema.obterItens();
}
export function carregarAnotacoes(lista) {
    listaAnotacoesPoema.carregar(lista);
    atualizarBotaoAnotacao();
}
export function resetAnotacoes() {
    listaAnotacoesPoema.reset();
    atualizarBotaoAnotacao();
}

// ─── Envios e Reações (item 7 — lista de pessoa+data+meio+reação+notas) ─
// Registro de quando um texto foi enviado/mostrado pra alguém e como
// essa pessoa reagiu. Poema e Prosa desde já (ver AUTORIA_PAPEIS/
// extrairMeiosEnviosUnicos em utils.js pro raciocínio da antecipação).
// Mesmo motor genérico de Anotações (criarListaDeEntradas), mas com um
// campo a mais fora do texto livre: `data`, parcial (dia/mês/ano —
// ver lerDataParcial/preencherDataParcial em utils.js), lida/escrita
// direto nos três `<input type="number">` do formulário de adicionar,
// não guardada em estado local separado. `pessoa` é texto livre (só
// reaproveita o datalist de nomes já cadastrados como sugestão — ver
// comentário em extrairMeiosEnviosUnicos), não um vínculo por id como
// em Autoria/Pessoas.

function renderItemEnvio(it) {
    const meta = [it.pessoa, it.meio, formatarDataParcial(it.data)]
        .filter((v) => v && v !== '—')
        .map(escapeHtml)
        .join(' · ');
    const metaHtml = meta
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-[10px] font-bold align-middle">${meta}</span>`
        : '';
    const notas = it.notas
        ? `<span class="block text-[11px] text-gray-400 dark:text-slate-500 italic mt-0.5">${escapeHtml(it.notas)}</span>`
        : '';
    return `${metaHtml}${escapeHtml(it.reacao || '')}${notas}`;
}

const listaEnviosPoema = criarListaDeEntradas({
    tabela: 'poemas',
    containerId: 'p-envios-lista',
    renderItem: renderItemEnvio,
    nomeFuncaoRemover: 'removerEnvio',
    nomeFuncaoEditar: 'editarEnvio',
});

const listaEnviosProsa = criarListaDeEntradas({
    tabela: 'prosas',
    containerId: 'pr-envios-lista',
    renderItem: renderItemEnvio,
    nomeFuncaoRemover: 'removerEnvio',
    nomeFuncaoEditar: 'editarEnvio',
});

function listaEnvios(tabela) {
    if (tabela === 'poemas') return listaEnviosPoema;
    if (tabela === 'prosas') return listaEnviosProsa;
    throw new Error(`Tabela desconhecida em listaEnvios: ${tabela}`);
}

function atualizarBotaoEnvio(tabela) {
    const p = prefixoDom(tabela);
    const btnAdd = document.getElementById(`${p}-envio-btn-add`);
    const btnCancelar = document.getElementById(`${p}-envio-btn-cancelar`);
    const emEdicao = listaEnvios(tabela).estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓ Salvar edição' : '+ Adicionar envio';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

// Um datalist por modal (mesmo motivo de sugestoes-idioma/
// sugestoes-idioma-prosa — cada modal carrega o próprio HTML sob
// demanda via garantirModal), preenchidos com a mesma lista combinada
// Poemas+Prosas.
export function atualizarDatalistEnvios() {
    const todos = [...db.poemas, ...(db.prosas || [])];
    const valores = extrairMeiosEnviosUnicos(todos);
    ['sugestoes-meios-envio', 'sugestoes-meios-envio-prosa'].forEach((id) => {
        const datalist = document.getElementById(id);
        if (datalist) {
            datalist.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}">`).join('');
        }
    });
}

function limparCamposEnvio(tabela) {
    const p = prefixoDom(tabela);
    ['pessoa', 'meio', 'reacao', 'notas'].forEach((campo) => {
        const el = document.getElementById(`${p}-envio-${campo}`);
        if (el) el.value = '';
    });
    preencherDataParcial(`${p}-envio`, null);
}

export function adicionarEnvio(tabela) {
    const p = prefixoDom(tabela);
    const pessoa = (document.getElementById(`${p}-envio-pessoa`)?.value || '').trim();
    const meio = (document.getElementById(`${p}-envio-meio`)?.value || '').trim();
    const reacao = (document.getElementById(`${p}-envio-reacao`)?.value || '').trim();
    const notas = (document.getElementById(`${p}-envio-notas`)?.value || '').trim();
    const data = lerDataParcial(`${p}-envio`);
    if (!pessoa && !meio && !reacao && !notas && !data) return;

    listaEnvios(tabela).salvar({ pessoa, data, meio, reacao, notas });
    limparCamposEnvio(tabela);
    atualizarBotaoEnvio(tabela);
    atualizarDatalistEnvios();
}
export function editarEnvio(tabela, indice) {
    const item = listaEnvios(tabela).iniciarEdicao(indice);
    const p = prefixoDom(tabela);
    const pessoaEl = document.getElementById(`${p}-envio-pessoa`);
    const meioEl = document.getElementById(`${p}-envio-meio`);
    const reacaoEl = document.getElementById(`${p}-envio-reacao`);
    const notasEl = document.getElementById(`${p}-envio-notas`);
    if (pessoaEl) pessoaEl.value = item.pessoa || '';
    if (meioEl) meioEl.value = item.meio || '';
    if (reacaoEl) reacaoEl.value = item.reacao || '';
    if (notasEl) notasEl.value = item.notas || '';
    preencherDataParcial(`${p}-envio`, item.data);
    pessoaEl?.focus();
    atualizarBotaoEnvio(tabela);
}
export function cancelarEdicaoEnvio(tabela) {
    listaEnvios(tabela).cancelarEdicao();
    limparCamposEnvio(tabela);
    atualizarBotaoEnvio(tabela);
}
export function removerEnvio(tabela, indice) {
    listaEnvios(tabela).remover(indice);
    atualizarBotaoEnvio(tabela);
}
export function obterEnvios(tabela) {
    return listaEnvios(tabela).obterItens();
}
export function carregarEnvios(tabela, lista) {
    listaEnvios(tabela).carregar(lista);
    atualizarBotaoEnvio(tabela);
}
export function resetEnvios(tabela) {
    listaEnvios(tabela).reset();
    atualizarBotaoEnvio(tabela);
}

// ─── Reconhecimentos (item 8 — lista de prêmio+posição+ano+texto) ───
// Prêmios/menções que um texto recebeu. Poema e Prosa desde já (mesmo
// padrão de antecipação de Envios/Autoria/Idioma). Migra a tag solta
// "Premiados" que hoje mora no balde temporário sinalizacoesOutros —
// ver migrarReconhecimentos em db.js. Mesmo motor genérico
// (criarListaDeEntradas) de Envios, com `ano` lido/escrito direto num
// único <input type="number"> (não parcial como a data de Envios —
// aqui é só o ano da premiação, sem dia/mês). `premio` é texto livre
// (só reaproveita o datalist dos nomes já cadastrados como sugestão —
// ver extrairPremiosUnicos em utils.js), não um vínculo por id.
// `posicao` também é texto livre — prêmios diferentes nomeiam
// colocação de formas diferentes ("1º lugar", "Menção honrosa" etc.).

function renderItemReconhecimento(it) {
    const meta = [it.premio, it.posicao, it.ano]
        .filter((v) => v || v === 0)
        .map((v) => escapeHtml(String(v)))
        .join(' · ');
    const metaHtml = meta
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-bold align-middle">${meta}</span>`
        : '';
    const texto = it.texto
        ? `<span class="block text-[11px] text-gray-400 dark:text-slate-500 italic mt-0.5">${escapeHtml(it.texto)}</span>`
        : '';
    return `${metaHtml}${texto}`;
}

const listaReconhecimentosPoema = criarListaDeEntradas({
    tabela: 'poemas',
    containerId: 'p-reconhecimentos-lista',
    renderItem: renderItemReconhecimento,
    nomeFuncaoRemover: 'removerReconhecimento',
    nomeFuncaoEditar: 'editarReconhecimento',
});

const listaReconhecimentosProsa = criarListaDeEntradas({
    tabela: 'prosas',
    containerId: 'pr-reconhecimentos-lista',
    renderItem: renderItemReconhecimento,
    nomeFuncaoRemover: 'removerReconhecimento',
    nomeFuncaoEditar: 'editarReconhecimento',
});

function listaReconhecimentos(tabela) {
    if (tabela === 'poemas') return listaReconhecimentosPoema;
    if (tabela === 'prosas') return listaReconhecimentosProsa;
    throw new Error(`Tabela desconhecida em listaReconhecimentos: ${tabela}`);
}

function atualizarBotaoReconhecimento(tabela) {
    const p = prefixoDom(tabela);
    const btnAdd = document.getElementById(`${p}-reconhecimento-btn-add`);
    const btnCancelar = document.getElementById(`${p}-reconhecimento-btn-cancelar`);
    const emEdicao = listaReconhecimentos(tabela).estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓ Salvar edição' : '+ Adicionar reconhecimento';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

// Um datalist por modal (mesmo motivo de sugestoes-meios-envio/
// sugestoes-meios-envio-prosa), preenchido com a mesma lista
// combinada Poemas+Prosas.
export function atualizarDatalistReconhecimentos() {
    const todos = [...db.poemas, ...(db.prosas || [])];
    const valores = extrairPremiosUnicos(todos);
    ['sugestoes-premios', 'sugestoes-premios-prosa'].forEach((id) => {
        const datalist = document.getElementById(id);
        if (datalist) {
            datalist.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}">`).join('');
        }
    });
}

function limparCamposReconhecimento(tabela) {
    const p = prefixoDom(tabela);
    ['premio', 'posicao', 'ano', 'texto'].forEach((campo) => {
        const el = document.getElementById(`${p}-reconhecimento-${campo}`);
        if (el) el.value = '';
    });
}

export function adicionarReconhecimento(tabela) {
    const p = prefixoDom(tabela);
    const premio = (document.getElementById(`${p}-reconhecimento-premio`)?.value || '').trim();
    const posicao = (document.getElementById(`${p}-reconhecimento-posicao`)?.value || '').trim();
    const anoStr = (document.getElementById(`${p}-reconhecimento-ano`)?.value || '').trim();
    const ano = anoStr ? parseInt(anoStr, 10) : null;
    const texto = (document.getElementById(`${p}-reconhecimento-texto`)?.value || '').trim();
    if (!premio && !posicao && !ano && !texto) return;

    listaReconhecimentos(tabela).salvar({ premio, posicao, ano, texto });
    limparCamposReconhecimento(tabela);
    atualizarBotaoReconhecimento(tabela);
    atualizarDatalistReconhecimentos();
}
export function editarReconhecimento(tabela, indice) {
    const item = listaReconhecimentos(tabela).iniciarEdicao(indice);
    const p = prefixoDom(tabela);
    const premioEl = document.getElementById(`${p}-reconhecimento-premio`);
    const posicaoEl = document.getElementById(`${p}-reconhecimento-posicao`);
    const anoEl = document.getElementById(`${p}-reconhecimento-ano`);
    const textoEl = document.getElementById(`${p}-reconhecimento-texto`);
    if (premioEl) premioEl.value = item.premio || '';
    if (posicaoEl) posicaoEl.value = item.posicao || '';
    if (anoEl) anoEl.value = item.ano ?? '';
    if (textoEl) textoEl.value = item.texto || '';
    premioEl?.focus();
    atualizarBotaoReconhecimento(tabela);
}
export function cancelarEdicaoReconhecimento(tabela) {
    listaReconhecimentos(tabela).cancelarEdicao();
    limparCamposReconhecimento(tabela);
    atualizarBotaoReconhecimento(tabela);
}
export function removerReconhecimento(tabela, indice) {
    listaReconhecimentos(tabela).remover(indice);
    atualizarBotaoReconhecimento(tabela);
}
export function obterReconhecimentos(tabela) {
    return listaReconhecimentos(tabela).obterItens();
}
export function carregarReconhecimentos(tabela, lista) {
    listaReconhecimentos(tabela).carregar(lista);
    atualizarBotaoReconhecimento(tabela);
}
export function resetReconhecimentos(tabela) {
    listaReconhecimentos(tabela).reset();
    atualizarBotaoReconhecimento(tabela);
}

// ─── Tags (Sinalizações) ─────────────────────────────────────

export function atualizarDatalist() {
    // Uma fonte por categoria: sugestões vêm de Poemas + Prosas juntos
    // (mesmo padrão que Pessoas já usava), pra "Concretista" digitado
    // numa prosa aparecer como sugestão num poema e vice-versa.
    const todos = [...db.poemas, ...(db.prosas || [])];
    const combinadas = new Set();
    SINAL_CATEGORIAS.forEach(({ chave }) => {
        const slug = slugDom(chave);
        const campo = `sinalizacoes${chave}`;
        // Sugestões = o que os textos usam + o que o cadastro de Etiquetas tem
        // nesta categoria (etiqueta criada na aba e ainda sem uso também aparece).
        const valores = [
            ...new Set([
                ...extrairSinalizacoesUnicas(todos, campo),
                ...(db.etiquetas || []).filter((e) => e.categoria === slug).map((e) => e.nome),
            ]),
        ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        valores.forEach((v) => combinadas.add(v));
        [
            `sugestoes-sinais-${slug}`,
            `sugestoes-sinais-${slug}-prosa`,
            `sugestoes-sinais-${slug}-bulk`,
            `sugestoes-sinais-${slug}-bulk-prosa`,
        ].forEach((id) => {
            const datalist = document.getElementById(id);
            if (datalist) {
                datalist.innerHTML = valores
                    .map((v) => `<option value="${escapeHtml(v)}">`)
                    .join('');
            }
        });
    });
    // Datalist "sugestoes-sinais" (sem categoria): usada pelo painel de
    // exportação seletiva (exp-temas-incluir/excluir), que filtra pelas
    // 9 categorias combinadas (ver correspondeFiltro em exportar.js) —
    // por isso a sugestão também precisa vir combinada, não só de Estilo.
    const datalistCombinada = document.getElementById('sugestoes-sinais');
    if (datalistCombinada) {
        datalistCombinada.innerHTML = [...combinadas]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
    atualizarDatalistPessoas();
    atualizarDatalistAutores();
    atualizarDatalistMigracao();
    atualizarDatalistAnotacoes();
    atualizarDatalistIntertexto('poemas');
    atualizarDatalistReferenciaExterna('poemas');
    atualizarDatalistHipertextualidade('poemas');
    atualizarDatalistEpoca();
    atualizarDatalistPeriodoHistorico();
    atualizarDatalistIdioma();
    atualizarDatalistFonte();
    atualizarDatalistEnvios();
    atualizarDatalistReconhecimentos();
    atualizarDatalistMovimentosEscolas();
    atualizarDatalistRegiaoOrigemMovimento();
    atualizarDatalistRegiaoPeriodoHistorico();
    atualizarDatalistTemasAssunto();
    atualizarDatalistCirculoLiterarioAutor();
    atualizarDatalistLinguasEscritaAutor();
}

// Item 3 do plano de schema: Época deixou de ser texto livre varrido de
// db.poemas e passou a ser cadastro central (db.epocas) — a sugestão do
// datalist agora vem de lá (nomes já cadastrados), não mais dos nomes
// já digitados em poemas. Item 4: mesmo cadastro central vale pra
// Prosa — um datalist por modal (mesmo padrão de sugestoes-pessoas/
// sugestoes-pessoas-prosa), preenchidos com a mesma lista. Desde
// 27/09/2026, Época pertence a um Autor — mesma lógica de escopo por
// união de Autoria (e mesmo fallback permissivo sem Autor ainda) do
// dropdown de Grupo (candidatosPorAutoria, ver criarGrupoDeGruposDiretos
// acima).
export function atualizarDatalistEpoca(tabela = null) {
    const tabelas = tabela ? [tabela] : ['poemas', 'prosas'];
    // Um datalist por campo: Períodos e Eventos (F14-D4) sugerem cada um só o
    // que é da sua marca.
    const idsPorTabela = {
        poemas: { periodos: 'sugestoes-epoca-nome', eventos: 'sugestoes-evento-biografico-nome' },
        prosas: {
            periodos: 'sugestoes-epoca-nome-prosa',
            eventos: 'sugestoes-evento-biografico-nome-prosa',
        },
    };
    tabelas.forEach((tab) => {
        ['periodos', 'eventos'].forEach((tipo) => {
            const datalist = document.getElementById(idsPorTabela[tab][tipo]);
            if (!datalist) return;
            // O valor de cada opção é o nome do período; o `label` mostra de onde ele
            // está ("Relação com X › Fase 1") e as opções vêm em árvore, o filho logo
            // depois do pai, como na lista de Correntes literárias.
            const { candidatos, comparar } = periodosParaEscolhaRetratada(tab);
            const doTipo = candidatos.filter((e) => ehEvento(e) === (tipo === 'eventos'));
            const opcoes = opcoesDeEscolhaDoPeriodoBiografico(db.epocas, doTipo, comparar);
            datalist.innerHTML = opcoes
                .map(
                    (o) =>
                        `<option value="${escapeHtml(o.rotulo)}"${o.caminho ? ` label="${escapeHtml(o.caminho)}"` : ''}></option>`,
                )
                .join('');
        });
    });
}

// Períodos que o campo Período Biográfico Retratado de um texto oferece e
// resolve: `candidatos` são as sugestões (dos Autores do texto, ou de todos
// enquanto não há Autor; sem os ocultos, a menos que "Exibir ocultas" da aba
// Período Biográfico esteja ligado) e `preferidos` os dos Autores do texto,
// ocultos inclusive, para o nome digitado achar o período certo.
function periodosParaEscolhaRetratada(tab) {
    const autorIds = (obterAutoria(tab) || []).map((a) => a.autorId);
    const doAutor = (lista) =>
        autorIds.length ? lista.filter((e) => autorIds.some((id) => id == e.autorId)) : lista;
    const visiveis = periodosVisiveis(db.epocas, opcoesOcultasDosPeriodos());
    return {
        candidatos: doAutor(visiveis),
        preferidos: doAutor(db.epocas),
        comparar: criarComparadorDeEpocas(db.epocas),
    };
}

// Mesmo padrão de atualizarDatalistEpoca acima, pro cadastro central de
// Período Histórico (db.periodosHistoricos): um datalist por modal
// (Poema/Prosa). O valor da opção é o nome e o `label` mostra de onde o
// período está ("Nova República › Governo Dilma"); as opções vêm em árvore,
// irmãos por data, como na aba. Só os homônimos levam o caminho no valor (ver
// opcoesDeEscolhaDosPeriodosHistoricos).
export function atualizarDatalistPeriodoHistorico() {
    // Os rótulos e caminhos saem da lista inteira (homônimos e pais contam
    // mesmo sendo de outra marca); só a oferta é separada por campo (F14-D4).
    const opcoes = opcoesDeEscolhaDosPeriodosHistoricos(
        db.periodosHistoricos,
        compararPeriodosNoSelect,
    );
    const montar = (querEvento) =>
        opcoes
            .filter((o) => ehEvento(db.periodosHistoricos.find((p) => p.id == o.id)) === querEvento)
            .map(
                (o) =>
                    `<option value="${escapeHtml(o.rotulo)}"${o.caminho ? ` label="${escapeHtml(o.caminho)}"` : ''}></option>`,
            )
            .join('');
    const htmlPeriodos = montar(false);
    const htmlEventos = montar(true);
    [
        ['sugestoes-periodo-historico-nome', htmlPeriodos],
        ['sugestoes-periodo-historico-nome-prosa', htmlPeriodos],
        ['sugestoes-evento-historico-nome', htmlEventos],
        ['sugestoes-evento-historico-nome-prosa', htmlEventos],
    ].forEach(([id, html]) => {
        const datalist = document.getElementById(id);
        if (datalist) datalist.innerHTML = html;
    });
}

// Sugestões do input de Temas do modal de Assunto: os temas já usados em
// Poemas + Prosas (mesma fonte de atualizarDatalist, categoria Tema),
// sem repetir variações que só diferem em caixa/acento (resumoTemas
// escolhe a grafia mais usada). Datalist dentro do modal carregado sob
// demanda — chamada também ao abrir/inicializar o modal, não só no load.
export function atualizarDatalistTemasAssunto() {
    const datalist = document.getElementById('sugestoes-temas-assunto');
    if (!datalist) return;
    const nomes = resumoTemas([...db.poemas, ...(db.prosas || [])], db.assuntos, db.temas)
        .map((t) => t.nome)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    datalist.innerHTML = nomes.map((v) => `<option value="${escapeHtml(v)}">`).join('');
}

// Idioma (item 9) — Poemas + Prosas juntos, mesmo motivo de somar as
// duas fontes em atualizarDatalist (Sinalizações) — um idioma digitado
// numa prosa deve sugerir numa próxima edição de poema e vice-versa.
// Dois `<datalist>` (um por modal, mesmo padrão de
// sugestoes-pessoas/sugestoes-pessoas-prosa — cada modal carrega o
// próprio HTML sob demanda via garantirModal), preenchidos com a mesma
// lista combinada.
export function atualizarDatalistIdioma() {
    const todos = [...db.poemas, ...(db.prosas || [])];
    const valores = extrairIdiomasUnicos(todos);
    ['p-idiomas-sugestoes', 'pr-idiomas-sugestoes'].forEach((id) => {
        const datalist = document.getElementById(id);
        if (datalist) {
            datalist.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}">`).join('');
        }
    });
}

// Fonte do texto (origem/edição) — Poemas + Prosas juntos, um
// `<datalist>` por modal e por campo (mesmo padrão de
// atualizarDatalistIdioma acima).
export function atualizarDatalistFonte() {
    const todos = [...db.poemas, ...(db.prosas || [])];
    [
        ['origem', ['sugestoes-fonte-origem', 'sugestoes-fonte-origem-prosa']],
        ['edicao', ['sugestoes-fonte-edicao', 'sugestoes-fonte-edicao-prosa']],
    ].forEach(([campo, ids]) => {
        const valores = extrairFontesUnicas(todos, campo);
        ids.forEach((id) => {
            const datalist = document.getElementById(id);
            if (datalist) {
                datalist.innerHTML = valores
                    .map((v) => `<option value="${escapeHtml(v)}">`)
                    .join('');
            }
        });
    });
}

// Sugestões pros campos "Cortado de"/"Lançado em" (Livro e Parte/Seção)
// — texto livre (o livro de origem pode nem existir mais como registro),
// mas com autocompletar pra acertar o nome de algo já cadastrado sem
// digitar de novo/errado.
//
// A lista de Seção de cada par fica filtrada pelo Livro já digitado ao
// lado (quando esse texto bate com um livro do acervo) — e escolher/
// digitar uma Seção já cadastrada preenche o Livro correspondente
// sozinho, contanto que o nome não seja ambíguo (mesma Seção existindo
// em mais de um Livro). Se o livro digitado não existir no acervo (ex.:
// origem antiga, nunca cadastrada aqui), a sugestão de Seção volta a
// mostrar a lista inteira, sem filtro.

const PARES_MIGRACAO_POEMA = [
    {
        livro: 'p-cortado-livro',
        secao: 'p-cortado-secao',
        datalist: 'sugestoes-secoes-migracao-cortado',
    },
    {
        livro: 'p-lancado-livro',
        secao: 'p-lancado-secao',
        datalist: 'sugestoes-secoes-migracao-lancado',
    },
];

// Item 4: mesmos pares, lado Prosa (ids `p-`→`pr-`) — reaproveita toda a
// lógica abaixo (mapaSecoesMigracao, autopreenchimento, filtro) sem
// duplicar nada. Lista separada de PARES_MIGRACAO_POEMA (em vez de uma
// única lista combinada) porque initListenersMigracao/
// initListenersMigracaoProsa precisam ligar os listeners em momentos
// diferentes — modal-poema e modal-prosa carregam sob demanda, cada um
// só tem seus próprios campos no DOM quando abre pela primeira vez (ver
// os dois initListenersMigracao* abaixo); atualizarFiltroSecoesMigracao,
// que só lê/escreve (sem risco de listener duplicado), continua
// varrendo as duas listas juntas.
const PARES_MIGRACAO_PROSA = [
    {
        livro: 'pr-cortado-livro',
        secao: 'pr-cortado-secao',
        datalist: 'sugestoes-secoes-migracao-cortado-prosa',
    },
    {
        livro: 'pr-lancado-livro',
        secao: 'pr-lancado-secao',
        datalist: 'sugestoes-secoes-migracao-lancado-prosa',
    },
];

const PARES_MIGRACAO = [...PARES_MIGRACAO_POEMA, ...PARES_MIGRACAO_PROSA];

// Seção pode estar presa direto no Livro ou dentro de uma Parte.
function livroIdDaSecao(secao) {
    if (secao.paiTipo === 'livro') return secao.paiId;
    if (secao.paiTipo === 'parte')
        return db.partes.find((p) => p.id == secao.paiId)?.livroId ?? null;
    return null;
}

// { titulo, livroId, livroTitulo } de cada Parte/Seção do acervo, com o
// livro já resolvido — base tanto pro filtro quanto pro autopreenchimento.
function mapaSecoesMigracao() {
    const partes = db.partes.map((p) => ({ titulo: p.titulo, livroId: p.livroId }));
    const secoes = db.secoes.map((s) => ({ titulo: s.titulo, livroId: livroIdDaSecao(s) }));
    return [...partes, ...secoes]
        .filter((x) => x.titulo && x.livroId != null)
        .map((x) => ({
            ...x,
            livroTitulo: db.livros.find((l) => l.id == x.livroId)?.titulo || null,
        }))
        .filter((x) => x.livroTitulo);
}

// Preenche o datalist de Seção de um par com as opções do livro digitado
// no campo `livroInputId` ao lado — ou a lista inteira, se esse texto não
// bater com nenhum livro cadastrado.
function preencherDatalistSecoesMigracao(datalistId, livroInputId) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;

    const mapa = mapaSecoesMigracao();
    const livroDigitado = (document.getElementById(livroInputId)?.value || '').trim();
    const livro = livroDigitado
        ? db.livros.find(
              (l) => (l.titulo || '').trim().toLowerCase() === livroDigitado.toLowerCase(),
          )
        : null;

    const titulos = new Set(
        (livro ? mapa.filter((x) => x.livroId == livro.id) : mapa).map((x) => x.titulo),
    );
    datalist.innerHTML = Array.from(titulos)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((titulo) => `<option value="${escapeHtml(titulo)}">`)
        .join('');
}

// Ao digitar/escolher uma Seção, se o texto bater — sem ambiguidade — com
// uma Parte/Seção já cadastrada no acervo, preenche sozinho o Livro
// correspondente. Fica quieto se não achar nada ou se o mesmo nome existir
// em mais de um livro (aí quem escolhe é a pessoa mesmo).
function autopreencherLivroDaSecao(secaoInputId, livroInputId) {
    const secaoDigitada = (document.getElementById(secaoInputId)?.value || '').trim();
    if (!secaoDigitada) return;

    const encontrados = mapaSecoesMigracao().filter(
        (x) => x.titulo.trim().toLowerCase() === secaoDigitada.toLowerCase(),
    );
    const livrosUnicos = new Set(encontrados.map((x) => x.livroId));
    if (livrosUnicos.size !== 1) return;

    const livroInput = document.getElementById(livroInputId);
    if (livroInput) livroInput.value = encontrados[0].livroTitulo;
}

export function atualizarDatalistMigracao() {
    const titulos = db.livros
        .map((l) => l.titulo)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    // Item 4: mesmo datalist de nomes de livro, lado Prosa.
    ['sugestoes-livros-migracao', 'sugestoes-livros-migracao-prosa'].forEach((id) => {
        const datalist = document.getElementById(id);
        if (datalist) {
            datalist.innerHTML = titulos
                .map((titulo) => `<option value="${escapeHtml(titulo)}">`)
                .join('');
        }
    });

    atualizarFiltroSecoesMigracao();
}

// Reaplica o filtro de Seção pelo que já estiver nos dois campos de Livro
// — chamado sozinho depois que editarPoema() seta os 4 campos de migração
// de uma vez (setar .value direto no JS não dispara 'input').
export function atualizarFiltroSecoesMigracao() {
    PARES_MIGRACAO.forEach(({ livro, datalist }) =>
        preencherDatalistSecoesMigracao(datalist, livro),
    );
}

// Liga os listeners dos campos de migração (livro ⇄ seção) de um grupo
// de pares — fábrica compartilhada pelas duas funções abaixo, cada uma
// chamada uma vez só, quando o respectivo modal é carregado pela
// primeira vez (garantirModal/registrarModal, ver main.js) — não dá pra
// ligar os dois grupos juntos numa função só porque os campos de Prosa
// ainda não existem no DOM na primeira vez que modal-poema abre (e
// vice-versa), então rodar duas vezes sobre a lista combinada
// duplicaria os listeners do grupo que já estava presente.
function ligarListenersMigracao(pares) {
    pares.forEach(({ livro, secao, datalist }) => {
        document
            .getElementById(livro)
            ?.addEventListener('input', () => preencherDatalistSecoesMigracao(datalist, livro));
        document.getElementById(secao)?.addEventListener('input', () => {
            autopreencherLivroDaSecao(secao, livro);
            preencherDatalistSecoesMigracao(datalist, livro);
        });
    });
}

// Chamado uma vez por initEditor(), quando modal-poema é carregado pela
// primeira vez.
function initListenersMigracao() {
    ligarListenersMigracao(PARES_MIGRACAO_POEMA);
}

// Chamado uma vez quando modal-prosa é carregado pela primeira vez (ver
// registrarModal('modal-prosa', ...) em main.js).
export function initListenersMigracaoProsa() {
    ligarListenersMigracao(PARES_MIGRACAO_PROSA);
}

// ─── Sinalizações por categoria (Poema) ────────────────────────
// Um conjunto de funções por categoria, no mesmo padrão pra todas
// (Estilo incluído — antes tinha nomes especiais adicionarTag/
// removerTag/renderizarTags/resetTags/carregarTags de quando só existia
// essa categoria; renomeado aqui pra consistência com as outras 5, já
// que nada mais depende do nome antigo). resetSinalizacoes/
// carregarSinalizacoes abaixo cobrem as 6 de uma vez, pra quem abre/
// fecha o modal não precisar chamar 6 funções.

// Um wrapper por ação (não mais por ação×tabela): recebe `tabela` como
// primeiro argumento e resolve a instância via grupoSinal(chave,
// tabela) — mesmo padrão de adicionarAutoria(tabela, ...) etc. Reduz
// de 64 pra 32 funções exportadas (8 categorias × 4 ações).
export function adicionarSinalTradicao(tabela, valor = null) {
    grupoSinal('Tradicao', tabela).adicionar(valor);
}
export function removerSinalTradicao(tabela, tag) {
    grupoSinal('Tradicao', tabela).remover(tag);
}
export function editarSinalTradicao(tabela, tag) {
    grupoSinal('Tradicao', tabela).editar(tag);
}
export function renderizarSinalTradicao(tabela) {
    grupoSinal('Tradicao', tabela).renderizar();
}

export function adicionarSinalEstilo(tabela, valor = null) {
    grupoSinal('Estilo', tabela).adicionar(valor);
}
export function removerSinalEstilo(tabela, tag) {
    grupoSinal('Estilo', tabela).remover(tag);
}
export function editarSinalEstilo(tabela, tag) {
    grupoSinal('Estilo', tabela).editar(tag);
}
export function renderizarSinalEstilo(tabela) {
    grupoSinal('Estilo', tabela).renderizar();
}

export function adicionarSinalTema(tabela, valor = null) {
    grupoSinal('Tema', tabela).adicionar(valor);
}
export function removerSinalTema(tabela, tag) {
    grupoSinal('Tema', tabela).remover(tag);
}
export function editarSinalTema(tabela, tag) {
    grupoSinal('Tema', tabela).editar(tag);
}
export function renderizarSinalTema(tabela) {
    grupoSinal('Tema', tabela).renderizar();
}

export function adicionarSinalTerritorialidade(tabela, valor = null) {
    grupoSinal('Territorialidade', tabela).adicionar(valor);
}
export function removerSinalTerritorialidade(tabela, tag) {
    grupoSinal('Territorialidade', tabela).remover(tag);
}
export function editarSinalTerritorialidade(tabela, tag) {
    grupoSinal('Territorialidade', tabela).editar(tag);
}
export function renderizarSinalTerritorialidade(tabela) {
    grupoSinal('Territorialidade', tabela).renderizar();
}

export function adicionarSinalRelacao(tabela, valor = null) {
    grupoSinal('Relacao', tabela).adicionar(valor);
}
export function removerSinalRelacao(tabela, tag) {
    grupoSinal('Relacao', tabela).remover(tag);
}
export function editarSinalRelacao(tabela, tag) {
    grupoSinal('Relacao', tabela).editar(tag);
}
export function renderizarSinalRelacao(tabela) {
    grupoSinal('Relacao', tabela).renderizar();
}

export function adicionarSinalSensibilidade(tabela, valor = null) {
    grupoSinal('Sensibilidade', tabela).adicionar(valor);
}
export function removerSinalSensibilidade(tabela, tag) {
    grupoSinal('Sensibilidade', tabela).remover(tag);
}
export function editarSinalSensibilidade(tabela, tag) {
    grupoSinal('Sensibilidade', tabela).editar(tag);
}
export function renderizarSinalSensibilidade(tabela) {
    grupoSinal('Sensibilidade', tabela).renderizar();
}

export function adicionarSinalTom(tabela, valor = null) {
    grupoSinal('Tom', tabela).adicionar(valor);
}
export function removerSinalTom(tabela, tag) {
    grupoSinal('Tom', tabela).remover(tag);
}
export function editarSinalTom(tabela, tag) {
    grupoSinal('Tom', tabela).editar(tag);
}
export function renderizarSinalTom(tabela) {
    grupoSinal('Tom', tabela).renderizar();
}

export function adicionarSinalDominioImagetico(tabela, valor = null) {
    grupoSinal('DominioImagetico', tabela).adicionar(valor);
}
export function removerSinalDominioImagetico(tabela, tag) {
    grupoSinal('DominioImagetico', tabela).remover(tag);
}
export function editarSinalDominioImagetico(tabela, tag) {
    grupoSinal('DominioImagetico', tabela).editar(tag);
}
export function renderizarSinalDominioImagetico(tabela) {
    grupoSinal('DominioImagetico', tabela).renderizar();
}

export function adicionarSinalOutros(tabela, valor = null) {
    grupoSinal('Outros', tabela).adicionar(valor);
}
export function removerSinalOutros(tabela, tag) {
    grupoSinal('Outros', tabela).remover(tag);
}
export function editarSinalOutros(tabela, tag) {
    grupoSinal('Outros', tabela).editar(tag);
}
export function renderizarSinalOutros(tabela) {
    grupoSinal('Outros', tabela).renderizar();
}

// Mapa chave -> wrapper, reaproveitado pelo wiring de Enter de
// initEditor() e initEditorProsa() abaixo (era um objeto duplicado por
// modal, um com as funções -Poema e outro com as -Prosa; agora as
// funções já são as mesmas, só muda o argumento `tabela` na chamada).
const funcoesSinal = {
    Tradicao: adicionarSinalTradicao,
    Estilo: adicionarSinalEstilo,
    Tema: adicionarSinalTema,
    Territorialidade: adicionarSinalTerritorialidade,
    Relacao: adicionarSinalRelacao,
    Sensibilidade: adicionarSinalSensibilidade,
    Tom: adicionarSinalTom,
    DominioImagetico: adicionarSinalDominioImagetico,
    Outros: adicionarSinalOutros,
};

// Ao contrário de Intertextualidade/Anexos/Anotações (arrays de objetos,
// que precisam de um getter porque não há onde o navegador guardaria o
// valor sozinho), cada categoria de Sinalizações já escreve sua string
// atual no próprio hidden input (p-sinal-{categoria}/pr-sinal-
// {categoria}) a cada adicionar/remover — igual Pessoas. Por isso
// forms.js lê document.getElementById('p-sinal-estilo').value etc.
// direto no submit, sem precisar de um obterSinalizacoes() aqui.
export function resetSinalizacoes(tabela) {
    SINAL_CATEGORIAS.forEach(({ chave }) => grupoSinal(chave, tabela).reset());
}
export function carregarSinalizacoes(tabela, item) {
    SINAL_CATEGORIAS.forEach(({ chave }) => {
        grupoSinal(chave, tabela).carregar(textoDeEtiquetas(item[`sinalizacoes${chave}`]));
    });
}

// ─── Temas e Assuntos (Tema por id, com papel) ──────────────────
// Grupo próprio nos modais de Poema e Prosa (fora do bloco Sinalizações).
// O estado é uma lista de { nome, papel } por tabela; os ids só são
// resolvidos ao salvar (resolverTemasEditados, temas.js), então cancelar
// a edição não cria Tema no cadastro. Os Assuntos mostrados são derivados
// dos temas (somente leitura) — o mesmo cálculo de assuntosDoTexto.
const PREFIXO_TEMAS_TEXTO = { poemas: 'p', prosas: 'pr' };
const temasTexto = { poemas: [], prosas: [] };
// Sobrescritas do papel do Assunto neste texto: [{ assuntoId, papel }]. Só
// existe entrada quando a pessoa fixou; sem entrada o Assunto segue o Tema.
const assuntosPapelTexto = { poemas: [], prosas: [] };
// Assuntos que a pessoa tirou deste texto ("não se aplica"): ids como string.
// O Tema segue no texto e no Assunto do cadastro; só este texto deixa de
// pertencer àquele Assunto.
const assuntosExcluidosTexto = { poemas: [], prosas: [] };
// Ligações Tema → Assunto feitas neste modal e ainda não gravadas:
// [{ temaChave, assuntoId (null = Assunto novo), nome }]. Só viram cadastro ao
// salvar o texto (aplicarAssuntosPendentes, temas.js); cancelar descarta.
const assuntosPendentesTexto = { poemas: [], prosas: [] };
// Chave (chaveTema) do Tema que está com o mini-formulário de Assunto aberto.
const assuntoAbertoTexto = { poemas: null, prosas: null };

function prefixoTemasTexto(tabela) {
    const prefixo = PREFIXO_TEMAS_TEXTO[tabela];
    if (!prefixo) throw new Error(`Tabela desconhecida em temas do texto: ${tabela}`);
    return prefixo;
}

// O CSS global dá `width: 100%` e margem inferior a todo select; sem `w-auto`
// o select de papel ocupava a linha inteira e espremia o campo de texto do
// Tema. `mb-0` tira a margem pra alinhar com o botão "+" e com o chip.
const CLASSE_SELECT_PAPEL_TEMA =
    'text-xs w-auto shrink-0 mb-0 [&>option]:text-black dark:[&>option]:text-white';
const CLASSE_SELECT_PAPEL_TEMA_CHIP = CLASSE_SELECT_PAPEL_TEMA;

function opcoesPapelTemaHTML(selecionado) {
    return ['', 'principal', 'secundario']
        .map(
            (papel) =>
                `<option value="${papel}"${papel === selecionado ? ' selected' : ''}>${ROTULOS_PAPEL_TEMA[papel]}</option>`,
        )
        .join('');
}

export function criarGrupoTemasHTML(prefixo, tabela) {
    return `
                            <p class="text-xs text-gray-500 dark:text-slate-400 mb-2">
                                O que o texto aborda. O papel diz o peso do tema no texto. Os Assuntos
                                vêm dos temas e herdam o papel, mas você pode fixar outro papel
                                ou marcar "não se aplica a este texto". Use "+ Assunto" abaixo
                                de um tema para ligá-lo a um assunto (vale para o tema em todos
                                os textos).
                            </p>
                            <div class="mb-2">
                                <input
                                    type="text"
                                    id="${prefixo}-tema-input"
                                    list="${prefixo}-temas-sugestoes"
                                    class="text-sm w-full"
                                    placeholder="Tema novo ou já cadastrado..."
                                />
                            </div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-xs text-gray-500 dark:text-slate-400">Papel:</span>
                                <select id="${prefixo}-tema-papel" class="${CLASSE_SELECT_PAPEL_TEMA}">${opcoesPapelTemaHTML('')}</select>
                                <button
                                    type="button"
                                    onclick="adicionarTemaTexto('${tabela}')"
                                    class="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-3 py-1 rounded text-xs font-bold"
                                    title="Adicionar tema"
                                >
                                    + Adicionar
                                </button>
                            </div>
                            <div
                                id="${prefixo}-temas-container"
                                class="flex flex-col gap-1 min-h-[30px] p-2 bg-white dark:bg-slate-900 border rounded border-gray-300 dark:border-slate-600"
                            ></div>
                            <datalist id="${prefixo}-temas-sugestoes"></datalist>
                            <datalist id="${prefixo}-assuntos-sugestoes"></datalist>
                            <input type="hidden" id="${prefixo}-temas-json" />
                            <label class="form-label mt-3">Assuntos <span class="font-normal normal-case text-gray-400 dark:text-slate-500">(derivados dos temas; o papel segue o do tema, a menos que você fixe)</span></label>
                            <div id="${prefixo}-temas-assuntos" class="flex flex-col min-h-[24px]"></div>`;
}

function preencherDatalistTemasTexto(prefixo) {
    const datalist = document.getElementById(`${prefixo}-temas-sugestoes`);
    if (datalist) {
        const nomes = (db.temas || [])
            .map((t) => t.nome)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        datalist.innerHTML = nomes.map((v) => `<option value="${escapeHtml(v)}">`).join('');
    }
    const datalistAssuntos = document.getElementById(`${prefixo}-assuntos-sugestoes`);
    if (datalistAssuntos) {
        const nomes = (db.assuntos || [])
            .map((a) => a.nome)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        datalistAssuntos.innerHTML = nomes.map((v) => `<option value="${escapeHtml(v)}">`).join('');
    }
}

// Linha "Assuntos: ..." de um Tema da lista, mais o link "+ Assunto" e, se
// aberto, o mini-formulário. Pensado para a coluna estreita do modal (cerca de
// um terço da largura): tudo empilhado, texto pequeno, sem tabela. Assuntos já
// gravados em texto simples; os pendentes em verde, itálico, com "×" para
// desfazer antes de salvar.
function assuntosDoTemaHTML(tabela, prefixo, indice, tema, contagem) {
    const chave = chaveTema(tema.nome);
    const cadastrado = (db.temas || []).find((t) => chaveTema(t.nome) === chave);
    const doCadastro = cadastrado
        ? (db.assuntos || []).filter((a) =>
              (a.temaIds || []).some((id) => String(id) === String(cadastrado.id)),
          )
        : [];
    const pendentes = assuntosPendentesTexto[tabela]
        .map((p, pi) => ({ p, pi }))
        .filter(({ p }) => p.temaChave === chave);
    const partes = [
        ...doCadastro.map((a) => `<span>${escapeHtml(a.nome)}</span>`),
        ...pendentes.map(
            ({ p, pi }) =>
                `<span class="italic text-emerald-700 dark:text-emerald-400" title="Entra no cadastro ao salvar este texto">${escapeHtml(p.nome)}${p.assuntoId == null ? ' (novo)' : ''}<button type="button" onclick="desfazerAssuntoPendenteTexto('${tabela}', ${pi})" class="ml-0.5 font-bold text-red-500 hover:text-red-700" title="Desfazer">×</button></span>`,
        ),
    ];
    const linha = partes.length
        ? `Assuntos: ${partes.join(' · ')}`
        : '<span class="text-amber-600 dark:text-amber-400">Sem assunto ainda</span>';
    const aberto = assuntoAbertoTexto[tabela] === chave;
    const formulario = aberto
        ? `
                <div class="w-full mt-1 p-2 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                    <input type="text" id="${prefixo}-assunto-input" list="${prefixo}-assuntos-sugestoes" autocomplete="off" class="text-xs w-full mb-1" placeholder="Assunto existente ou novo..." onkeydown="aoEnterAplicar(event, () => adicionarAssuntoTemaTexto('${tabela}', ${indice}))" />
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="adicionarAssuntoTemaTexto('${tabela}', ${indice})" class="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold">Adicionar</button>
                        <button type="button" onclick="fecharAssuntoTemaTexto('${tabela}')" class="text-[10px] text-gray-500 dark:text-slate-400 underline">Fechar</button>
                    </div>
                    <p class="text-[10px] text-gray-500 dark:text-slate-400 mt-1 leading-snug">Muda o cadastro do tema, então vale para todos os textos com ele (hoje: ${contagem.get(chave) || 0}). Só é gravado ao salvar este texto.</p>
                </div>`
        : '';
    const botao = aberto
        ? ''
        : ` <button type="button" onclick="abrirAssuntoTemaTexto('${tabela}', ${indice})" class="font-bold text-emerald-700 dark:text-emerald-400 hover:underline" title="Ligar este tema a um assunto (existente ou novo)">+ Assunto</button>`;
    return `
                <div class="w-full text-[10px] leading-snug text-gray-500 dark:text-slate-400 break-words">${linha}${botao}</div>${formulario}`;
}

function renderizarTemasTexto(tabela) {
    const prefixo = prefixoTemasTexto(tabela);
    const lista = temasTexto[tabela];
    const container = document.getElementById(`${prefixo}-temas-container`);
    if (container) {
        // Pendência de Tema que saiu da lista (ou formulário aberto nele) some junto.
        assuntosPendentesTexto[tabela] = podarAssuntosPendentes(
            lista,
            assuntosPendentesTexto[tabela],
        );
        if (
            assuntoAbertoTexto[tabela] &&
            !lista.some((t) => chaveTema(t.nome) === assuntoAbertoTexto[tabela])
        ) {
            assuntoAbertoTexto[tabela] = null;
        }
        const contagem = contarTextosPorTema(db);
        container.innerHTML = lista.length
            ? lista
                  .map(
                      (t, i) => `
            <div class="flex flex-col items-start gap-1 py-1.5 border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                <span class="bg-orange-600 text-white text-[10px] px-2 py-1 rounded-full max-w-full break-words">${escapeHtml(t.nome)}</span>
                <div class="flex items-center gap-2">
                    <select class="${CLASSE_SELECT_PAPEL_TEMA_CHIP}" onchange="mudarPapelTemaTexto('${tabela}', ${i}, this.value)">${opcoesPapelTemaHTML(t.papel)}</select>
                    <button type="button" onclick="removerTemaTexto('${tabela}', ${i})" class="text-red-500 hover:text-red-700 font-bold" title="Remover">×</button>
                </div>${assuntosDoTemaHTML(tabela, prefixo, i, t, contagem)}
            </div>`,
                  )
                  .join('')
            : '';
    }
    // O cadastro "como ficará ao salvar": os Assuntos derivados abaixo já
    // contam as ligações Tema → Assunto pendentes.
    const sobreposto = sobreporAssuntosPendentes(db, lista, assuntosPendentesTexto[tabela]);
    // Sobrescrita de Assunto que deixou de se aplicar (Tema removido, Assunto
    // excluído) some junto: não fica esperando o Tema voltar.
    assuntosPapelTexto[tabela] = podarSobrescritasAssunto(
        lista,
        assuntosPapelTexto[tabela],
        sobreposto.assuntos,
        sobreposto.temas,
    ).map((e) => ({ assuntoId: String(e.assuntoId), papel: e.papel }));
    // Mesma regra para a exceção "não se aplica": tirou o Tema do texto (ou o
    // Assunto deixou de existir), a exceção some junto.
    assuntosExcluidosTexto[tabela] = podarExcecoesAssunto(
        lista,
        assuntosExcluidosTexto[tabela],
        sobreposto.assuntos,
        sobreposto.temas,
    ).map(String);
    const alvoAssuntos = document.getElementById(`${prefixo}-temas-assuntos`);
    if (alvoAssuntos) {
        const assuntosDoTexto = assuntosComPapelDeEntradas(
            lista,
            assuntosPapelTexto[tabela],
            sobreposto.assuntos,
            sobreposto.temas,
            assuntosExcluidosTexto[tabela],
            { incluirExcluidos: true },
        );
        alvoAssuntos.innerHTML = assuntosDoTexto.length
            ? assuntosDoTexto
                  .map((a) => {
                      if (a.excluido) {
                          return `
            <div class="flex flex-col items-start gap-1 py-1.5 border-b border-gray-200 dark:border-slate-700 last:border-b-0" data-assunto-excluido="${escapeHtml(String(a.id))}">
                <span class="bg-gray-400 dark:bg-slate-600 text-white text-[10px] px-2 py-1 rounded-full max-w-full break-words line-through opacity-70">${escapeHtml(a.nome)}</span>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] text-gray-500 dark:text-slate-400">não se aplica a este texto</span>
                    <button type="button" onclick="mudarPapelAssuntoTexto('${tabela}', '${escapeHtml(String(a.id))}', 'auto')" class="text-emerald-700 dark:text-emerald-400 hover:underline text-[10px] font-bold" title="Voltar a incluir este Assunto no texto">Restaurar</button>
                </div>
            </div>`;
                      }
                      if (assuntoEhNovo(a.id)) {
                          // Assunto que ainda não existe: sem papel fixável até salvar.
                          return `
            <div class="flex flex-col items-start gap-1 py-1.5 border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                <span class="bg-emerald-700 text-white text-[10px] px-2 py-1 rounded-full max-w-full break-words border border-dashed border-white/70">${escapeHtml(a.nome)}</span>
                <span class="text-[10px] text-gray-500 dark:text-slate-400">novo, entra ao salvar (papel ${escapeHtml(ROTULOS_PAPEL_TEMA[a.papelAuto].toLowerCase())})</span>
            </div>`;
                      }
                      const rotuloAuto = `Automático (${ROTULOS_PAPEL_TEMA[a.papelAuto]})`;
                      const valor = a.fixado ? a.papel : 'auto';
                      const opcoes = [
                          ['auto', rotuloAuto],
                          ['', ROTULOS_PAPEL_TEMA['']],
                          ['principal', ROTULOS_PAPEL_TEMA.principal],
                          ['secundario', ROTULOS_PAPEL_TEMA.secundario],
                          ['excluir', 'Não se aplica'],
                      ]
                          .map(
                              ([v, r]) =>
                                  `<option value="${v}"${v === valor ? ' selected' : ''}>${escapeHtml(r)}</option>`,
                          )
                          .join('');
                      return `
            <div class="flex flex-col items-start gap-1 py-1.5 border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                <span class="bg-emerald-700 text-white text-[10px] px-2 py-1 rounded-full max-w-full break-words">${escapeHtml(a.nome)}</span>
                <select data-valor="${escapeHtml(valor)}" class="${CLASSE_SELECT_PAPEL_TEMA_CHIP}" onchange="mudarPapelAssuntoTexto('${tabela}', '${escapeHtml(String(a.id))}', this.value)">${opcoes}</select>
                ${a.fixado ? '<span class="text-[10px] text-gray-500 dark:text-slate-400">(fixado)</span>' : ''}
            </div>`;
                  })
                  .join('')
            : '<span class="text-xs text-gray-400 dark:text-slate-500">Nenhum (os temas acima não estão em nenhum Assunto)</span>';
        // Força o valor pelo DOM: a opção "sem papel" tem value vazio e alguns
        // motores ignoram o `selected` das outras nesse caso.
        alvoAssuntos.querySelectorAll('select[data-valor]').forEach((sel) => {
            sel.value = sel.dataset.valor;
        });
    }
    const oculto = document.getElementById(`${prefixo}-temas-json`);
    if (oculto) {
        oculto.value = JSON.stringify({
            temas: lista,
            assuntosPapel: assuntosPapelTexto[tabela],
            assuntosExcluidos: assuntosExcluidosTexto[tabela],
            assuntosPendentes: assuntosPendentesTexto[tabela],
        });
        // Avisa o rastreador de alterações do formulário (só escuta input/change).
        oculto.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// Aceita vários nomes separados por vírgula (vírgula não cabe num nome de
// Tema: é o separador do espelho sinalizacoesTema). Tema que já está na
// lista só troca de papel.
export function adicionarTemaTexto(tabela, valor = null) {
    const prefixo = prefixoTemasTexto(tabela);
    const input = document.getElementById(`${prefixo}-tema-input`);
    const seletor = document.getElementById(`${prefixo}-tema-papel`);
    const papel = normalizarPapelTema(seletor?.value);
    String(valor ?? input?.value ?? '')
        .split(',')
        .map((n) => n.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .forEach((nome) => {
            const existente = temasTexto[tabela].find((t) => chaveTema(t.nome) === chaveTema(nome));
            if (existente) existente.papel = papel;
            else temasTexto[tabela].push({ nome, papel });
        });
    if (input) input.value = '';
    renderizarTemasTexto(tabela);
}
export function removerTemaTexto(tabela, indice) {
    temasTexto[tabela].splice(Number(indice), 1);
    renderizarTemasTexto(tabela);
}
export function mudarPapelTemaTexto(tabela, indice, papel) {
    const alvo = temasTexto[tabela][Number(indice)];
    if (!alvo) return;
    alvo.papel = normalizarPapelTema(papel);
    renderizarTemasTexto(tabela);
}
// Fixa o papel de um Assunto neste texto; 'auto' volta a seguir os Temas
// (e restaura um Assunto que estava como "não se aplica"); 'excluir' tira o
// Assunto deste texto, sem mexer no Tema nem no cadastro.
export function mudarPapelAssuntoTexto(tabela, assuntoId, papel) {
    const chave = String(assuntoId);
    const resto = assuntosPapelTexto[tabela].filter((e) => e.assuntoId !== chave);
    const excluidos = assuntosExcluidosTexto[tabela].filter((id) => id !== chave);
    if (papel === 'excluir') {
        // Assunto fora do texto não guarda papel fixado: restaurar volta ao automático.
        excluidos.push(chave);
    } else if (papel !== 'auto') {
        resto.push({ assuntoId: chave, papel: normalizarPapelTema(papel) });
    }
    assuntosPapelTexto[tabela] = resto;
    assuntosExcluidosTexto[tabela] = excluidos;
    renderizarTemasTexto(tabela);
}
// ─── Ligar Tema a Assunto (cadastro) pelo modal do texto ────────
export function abrirAssuntoTemaTexto(tabela, indice) {
    const alvo = temasTexto[tabela][Number(indice)];
    if (!alvo) return;
    assuntoAbertoTexto[tabela] = chaveTema(alvo.nome);
    renderizarTemasTexto(tabela);
    document.getElementById(`${prefixoTemasTexto(tabela)}-assunto-input`)?.focus();
}
export function fecharAssuntoTemaTexto(tabela) {
    assuntoAbertoTexto[tabela] = null;
    renderizarTemasTexto(tabela);
}
// Marca (sem gravar) a ligação do Tema ao Assunto digitado: nome que já existe
// liga ao existente, nome novo vira Assunto novo ao salvar. O formulário fica
// aberto para ligar a mais de um Assunto em seguida.
export function adicionarAssuntoTemaTexto(tabela, indice) {
    const prefixo = prefixoTemasTexto(tabela);
    const alvo = temasTexto[tabela][Number(indice)];
    if (!alvo) return;
    const input = document.getElementById(`${prefixo}-assunto-input`);
    const r = adicionarAssuntoPendente(db, assuntosPendentesTexto[tabela], alvo.nome, input?.value);
    if (r.resultado === 'vazio') return mostrarAviso('Digite o nome do assunto.');
    if (r.resultado === 'ja-esta') {
        return mostrarAviso(`"${alvo.nome}" já está em "${r.assunto.nome}".`, 'info');
    }
    if (r.resultado === 'repetido') {
        return mostrarAviso('Esse assunto já está marcado para este tema.', 'info');
    }
    assuntosPendentesTexto[tabela] = r.pendentes;
    renderizarTemasTexto(tabela);
    document.getElementById(`${prefixo}-assunto-input`)?.focus();
}
export function desfazerAssuntoPendenteTexto(tabela, indice) {
    assuntosPendentesTexto[tabela].splice(Number(indice), 1);
    renderizarTemasTexto(tabela);
}
// Ligações pendentes, pra forms.js gravar no cadastro ao salvar o texto.
export function obterAssuntosPendentesTexto(tabela) {
    return assuntosPendentesTexto[tabela].map((p) => ({ ...p }));
}
// Assuntos tirados deste texto (ids), pra forms.js podar e gravar.
export function obterAssuntosExcluidosTexto(tabela) {
    return [...assuntosExcluidosTexto[tabela]];
}
// Sobrescritas atuais ([{ assuntoId, papel }]), pra forms.js podar e gravar.
export function obterAssuntosPapelTexto(tabela) {
    return assuntosPapelTexto[tabela].map((e) => ({ ...e }));
}
// Cópia da lista atual ({ nome, papel }), pra forms.js resolver os ids.
export function obterTemasTexto(tabela) {
    return temasTexto[tabela].map((t) => ({ ...t }));
}
export function resetTemasTexto(tabela) {
    temasTexto[tabela] = [];
    assuntosPapelTexto[tabela] = [];
    assuntosExcluidosTexto[tabela] = [];
    assuntosPendentesTexto[tabela] = [];
    assuntoAbertoTexto[tabela] = null;
    preencherDatalistTemasTexto(prefixoTemasTexto(tabela));
    renderizarTemasTexto(tabela);
}
export function carregarTemasTexto(tabela, item) {
    const porId = new Map((db.temas || []).map((t) => [String(t.id), t.nome]));
    temasTexto[tabela] = Array.isArray(item?.temas)
        ? item.temas
              .map((e) => ({
                  nome: porId.get(String(e?.temaId)),
                  papel: normalizarPapelTema(e?.papel),
              }))
              .filter((e) => e.nome)
        : temasDoTexto(item).map((nome) => ({ nome, papel: '' }));
    assuntosPapelTexto[tabela] = (Array.isArray(item?.assuntosPapel) ? item.assuntosPapel : []).map(
        (e) => ({ assuntoId: String(e?.assuntoId), papel: normalizarPapelTema(e?.papel) }),
    );
    assuntosExcluidosTexto[tabela] = [...idsAssuntosExcluidos(item?.assuntosExcluidos)];
    assuntosPendentesTexto[tabela] = [];
    assuntoAbertoTexto[tabela] = null;
    preencherDatalistTemasTexto(prefixoTemasTexto(tabela));
    renderizarTemasTexto(tabela);
}

export function renderTemasPoema() {
    const container = document.getElementById('p-temas-corpo');
    if (!container) return;
    container.innerHTML = criarGrupoTemasHTML('p', 'poemas');
}
export function renderTemasProsa() {
    const container = document.getElementById('pr-temas-corpo');
    if (!container) return;
    container.innerHTML = criarGrupoTemasHTML('pr', 'prosas');
}

// ─── Região e Idioma (Territorialidade e Local onde foi escrito) ──
// Grupo próprio nos modais de Poema e Prosa. O Idioma é o campo de sempre
// (HTML estático dos modais); aqui vivem os dois campos que puxam do cadastro
// de Locais. O estado são entradas { id, nome }: `id` para Local já
// cadastrado, null para nome digitado que ainda não existe. Os Locais novos
// só são criados ao salvar (resolverLocaisEditados, locais.js), então
// cancelar o modal não suja o cadastro.
const PREFIXO_LOCAIS_TEXTO = { poemas: 'p', prosas: 'pr' };
const territorialidadeTexto = { poemas: [], prosas: [] };
const localEscritaTexto = { poemas: null, prosas: null };

function prefixoLocaisTexto(tabela) {
    const prefixo = PREFIXO_LOCAIS_TEXTO[tabela];
    if (!prefixo) throw new Error(`Tabela desconhecida em locais do texto: ${tabela}`);
    return prefixo;
}

const BOTAO_LOCAL_TEXTO =
    'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded text-xs font-bold shrink-0';

export function criarGrupoRegiaoHTML(prefixo, tabela) {
    return `
                            <div class="mb-4">
                                <label class="form-label">Idioma <span class="font-normal normal-case text-gray-400 dark:text-slate-500">(mais de um é possível; sempre ao menos um Principal)</span></label>
                                <div class="flex items-center gap-2 mb-2">
                                    <input
                                        type="text"
                                        id="${prefixo}-idioma-input"
                                        list="${prefixo}-idiomas-sugestoes"
                                        class="text-sm flex-1 mb-0"
                                        placeholder="Idioma (vírgula separa vários)..."
                                    />
                                    <button type="button" onclick="adicionarIdiomaTexto('${tabela}')" class="${BOTAO_LOCAL_TEXTO}" title="Adicionar idioma">+ Adicionar</button>
                                </div>
                                <div id="${prefixo}-idiomas-container" class="flex flex-col gap-1 min-h-[30px] p-2 bg-white dark:bg-slate-900 border rounded border-gray-300 dark:border-slate-600"></div>
                                <datalist id="${prefixo}-idiomas-sugestoes"></datalist>
                                <input type="hidden" id="${prefixo}-idiomas-json" />
                            </div>
                            <div class="mb-4">
                                <label class="form-label">Local onde foi escrito <span class="font-normal normal-case text-gray-400 dark:text-slate-500">(um só; para escrita em trânsito, use um Local como “Viagem”)</span></label>
                                <div class="flex items-center gap-2 mb-2">
                                    <input
                                        type="text"
                                        id="${prefixo}-local-escrita-input"
                                        list="${prefixo}-locais-sugestoes"
                                        class="text-sm flex-1 mb-0"
                                        placeholder="Local já cadastrado ou novo..."
                                    />
                                    <button type="button" onclick="definirLocalEscritaTexto('${tabela}')" class="${BOTAO_LOCAL_TEXTO}" title="Definir o local onde foi escrito">Definir</button>
                                </div>
                                <div id="${prefixo}-local-escrita-container" class="min-h-[30px] p-2 bg-white dark:bg-slate-900 border rounded border-gray-300 dark:border-slate-600"></div>
                            </div>
                            <div>
                                <label class="form-label">Territorialidade <span class="font-normal normal-case text-gray-400 dark:text-slate-500">(lugares que o texto cita)</span></label>
                                <div class="flex items-center gap-2 mb-2">
                                    <input
                                        type="text"
                                        id="${prefixo}-territorialidade-input"
                                        list="${prefixo}-locais-sugestoes"
                                        class="text-sm flex-1 mb-0"
                                        placeholder="Local já cadastrado ou novo (vírgula separa vários)..."
                                    />
                                    <button type="button" onclick="adicionarTerritorialidadeTexto('${tabela}')" class="${BOTAO_LOCAL_TEXTO}" title="Adicionar local citado">+ Adicionar</button>
                                </div>
                                <div id="${prefixo}-territorialidade-container" class="flex flex-wrap gap-1 min-h-[30px] p-2 bg-white dark:bg-slate-900 border rounded border-gray-300 dark:border-slate-600"></div>
                            </div>
                            <datalist id="${prefixo}-locais-sugestoes"></datalist>
                            <input type="hidden" id="${prefixo}-locais-json" />`;
}

function preencherDatalistLocaisTexto(prefixo) {
    const datalist = document.getElementById(`${prefixo}-locais-sugestoes`);
    if (!datalist) return;
    datalist.innerHTML = opcoesLocaisParaCampo(db)
        .map((o) => `<option value="${escapeHtml(o.valor)}" label="${escapeHtml(o.caminho)}">`)
        .join('');
}

// Entrada { id, nome } para o que a pessoa digitou: Local do cadastro se o
// texto o designa, senão um nome novo (id null).
function entradaDeTextoLocal(texto) {
    const nome = limparNomeLocal(texto);
    if (!nome) return null;
    const id = localDoTextoDigitado(db, nome);
    return id != null ? entradaDeLocal(db, id) : { id: null, nome };
}

function rotuloEntradaLocal(entrada) {
    return entrada.id != null ? rotuloLocal(db, entrada.id) || entrada.nome : entrada.nome;
}

function chipLocalTexto(entrada, onclickRemover) {
    const novo = entrada.id == null;
    const caminho = novo ? 'Local novo: será criado ao salvar' : rotuloCaminhoLocal(db, entrada.id);
    return `<span class="bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-full max-w-full break-words inline-flex items-center gap-1" title="${escapeHtml(caminho)}">${escapeHtml(rotuloEntradaLocal(entrada))}${novo ? ' <em class="opacity-80">(novo)</em>' : ''}<button type="button" onclick="${onclickRemover}" class="font-bold hover:text-red-200" title="Remover">×</button></span>`;
}

function renderizarLocaisTexto(tabela) {
    const prefixo = prefixoLocaisTexto(tabela);
    const lista = territorialidadeTexto[tabela];
    const escrita = localEscritaTexto[tabela];
    const contTerr = document.getElementById(`${prefixo}-territorialidade-container`);
    if (contTerr) {
        contTerr.innerHTML = lista
            .map((e, i) => chipLocalTexto(e, `removerTerritorialidadeTexto('${tabela}', ${i})`))
            .join('');
    }
    const contEscrita = document.getElementById(`${prefixo}-local-escrita-container`);
    if (contEscrita) {
        contEscrita.innerHTML = escrita
            ? chipLocalTexto(escrita, `limparLocalEscritaTexto('${tabela}')`)
            : '';
    }
    const oculto = document.getElementById(`${prefixo}-locais-json`);
    if (oculto) {
        oculto.value = JSON.stringify({ territorialidade: lista, escrita });
        // Avisa o rastreador de alterações do formulário (só escuta input/change).
        oculto.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// Vírgula não cabe num nome de Local (é o separador do espelho), então
// separa vários de uma vez. Repetido (mesmo Local, ou mesmo nome novo) é ignorado.
export function adicionarTerritorialidadeTexto(tabela, valor = null) {
    const prefixo = prefixoLocaisTexto(tabela);
    const input = document.getElementById(`${prefixo}-territorialidade-input`);
    String(valor ?? input?.value ?? '')
        .split(',')
        .map(entradaDeTextoLocal)
        .filter(Boolean)
        .forEach((entrada) => {
            const repetido = territorialidadeTexto[tabela].some((e) =>
                entrada.id != null
                    ? String(e.id) === String(entrada.id)
                    : e.id == null && chaveTema(e.nome) === chaveTema(entrada.nome),
            );
            if (!repetido) territorialidadeTexto[tabela].push(entrada);
        });
    if (input) input.value = '';
    renderizarLocaisTexto(tabela);
}
export function removerTerritorialidadeTexto(tabela, indice) {
    territorialidadeTexto[tabela].splice(Number(indice), 1);
    renderizarLocaisTexto(tabela);
}
// Um só por texto: definir de novo troca o anterior. A vírgula é tirada pelo
// limparNomeLocal, então "Santos, SP" vira um Local só, como no cadastro.
export function definirLocalEscritaTexto(tabela, valor = null) {
    const prefixo = prefixoLocaisTexto(tabela);
    const input = document.getElementById(`${prefixo}-local-escrita-input`);
    const entrada = entradaDeTextoLocal(valor ?? input?.value ?? '');
    if (entrada) localEscritaTexto[tabela] = entrada;
    if (input) input.value = '';
    renderizarLocaisTexto(tabela);
}
export function limparLocalEscritaTexto(tabela) {
    localEscritaTexto[tabela] = null;
    renderizarLocaisTexto(tabela);
}
// Estado atual ({ territorialidade: [{ id, nome }], escrita }), para forms.js
// resolver os ids ao salvar.
export function obterLocaisTexto(tabela) {
    return {
        territorialidade: territorialidadeTexto[tabela].map((e) => ({ ...e })),
        escrita: localEscritaTexto[tabela] ? { ...localEscritaTexto[tabela] } : null,
    };
}
export function resetLocaisTexto(tabela) {
    territorialidadeTexto[tabela] = [];
    localEscritaTexto[tabela] = null;
    preencherDatalistLocaisTexto(prefixoLocaisTexto(tabela));
    renderizarLocaisTexto(tabela);
}
export function carregarLocaisTexto(tabela, item) {
    const ids = Array.isArray(item?.territorialidade) ? item.territorialidade : null;
    territorialidadeTexto[tabela] = ids
        ? ids.map((id) => entradaDeLocal(db, id)).filter(Boolean)
        : nomesTerritorialidade(item).map(entradaDeTextoLocal).filter(Boolean);
    localEscritaTexto[tabela] = entradaDeLocal(db, item?.localEscrita);
    preencherDatalistLocaisTexto(prefixoLocaisTexto(tabela));
    renderizarLocaisTexto(tabela);
}

// ─── Idiomas do texto (papel por idioma + dialetos) ──────────────
// Estado: [{ idioma, papel, dialetos }], a mesma forma gravada no texto
// (`idiomas`). O papel vale por idioma, então mais de um pode ser Principal.
// Havendo algum idioma, há sempre ao menos um Principal: tirar ou rebaixar o
// único Principal promove o próximo da lista. Texto sem nenhum idioma é
// permitido (a pessoa pode remover todos). Um texto novo começa com pt-BR.
const idiomaPadraoTexto = () => [{ idioma: 'pt-BR', papel: 'principal', dialetos: [] }];
const idiomasTexto = { poemas: idiomaPadraoTexto(), prosas: idiomaPadraoTexto() };

function sincronizarIdiomasOculto(tabela) {
    const oculto = document.getElementById(`${prefixoLocaisTexto(tabela)}-idiomas-json`);
    if (!oculto) return;
    oculto.value = JSON.stringify(idiomasTexto[tabela]);
    // Avisa o rastreador de alterações do formulário (só escuta input/change).
    oculto.dispatchEvent(new Event('input', { bubbles: true }));
}

function preencherDatalistIdiomasTexto(prefixo) {
    const datalist = document.getElementById(`${prefixo}-idiomas-sugestoes`);
    if (!datalist) return;
    const todos = [...db.poemas, ...(db.prosas || [])];
    datalist.innerHTML = extrairIdiomasUnicos(todos)
        .map((v) => `<option value="${escapeHtml(v)}">`)
        .join('');
}

function linhaIdiomaTexto(entrada, indice, tabela, prefixo, todos) {
    const dialetos = extrairDialetosUnicos(todos, entrada.idioma);
    const idDialetos = `${prefixo}-dialetos-${indice}`;
    const opcoesPapel = PAPEIS_IDIOMA.map(
        (papel) =>
            `<option value="${papel}"${entrada.papel === papel ? ' selected' : ''}>${ROTULOS_PAPEL_IDIOMA[papel]}</option>`,
    ).join('');
    const chipsDialetos = entrada.dialetos
        .map(
            (d, j) =>
                `<span class="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[11px] px-2 py-1 rounded-full font-bold break-words max-w-full flex items-center gap-1">${escapeHtml(d)}<button type="button" onclick="removerDialetoIdiomaTexto('${tabela}', ${indice}, ${j})" class="hover:text-red-500" title="Remover dialeto" aria-label="Remover dialeto ${escapeHtml(d)}">×</button></span>`,
        )
        .join('');
    return `<div class="flex flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
            <span class="bg-emerald-600 text-white text-[11px] px-2 py-1 rounded-full font-bold break-words max-w-full">${escapeHtml(entrada.idioma)}</span>
            <select class="text-xs mb-0 w-auto" aria-label="Papel do idioma ${escapeHtml(entrada.idioma)}" onchange="definirPapelIdiomaTexto('${tabela}', ${indice}, this.value)">${opcoesPapel}</select>
            <button type="button" onclick="removerIdiomaTexto('${tabela}', ${indice})" class="font-bold text-gray-500 hover:text-red-500 px-1" title="Remover idioma">×</button>
        </div>
        <div class="flex flex-wrap items-center gap-2 pl-3">
            ${chipsDialetos}
            <input type="text" id="${prefixo}-dialeto-input-${indice}" list="${idDialetos}" class="text-xs flex-1 mb-0 min-w-[10rem]" placeholder="Dialeto ou variedade (vírgula separa vários)" aria-label="Adicionar dialeto de ${escapeHtml(entrada.idioma)}" onchange="adicionarDialetoIdiomaTexto('${tabela}', ${indice}, this.value)" onkeydown="if (event.key === 'Enter') { event.preventDefault(); adicionarDialetoIdiomaTexto('${tabela}', ${indice}, this.value); }" />
            <datalist id="${idDialetos}">${dialetos.map((d) => `<option value="${escapeHtml(d)}">`).join('')}</datalist>
        </div>
    </div>`;
}

function renderizarIdiomasTexto(tabela, focarDialetoDe = null) {
    const prefixo = prefixoLocaisTexto(tabela);
    preencherDatalistIdiomasTexto(prefixo);
    const container = document.getElementById(`${prefixo}-idiomas-container`);
    if (container) {
        const todos = [...db.poemas, ...(db.prosas || [])];
        container.innerHTML = idiomasTexto[tabela]
            .map((e, i) => linhaIdiomaTexto(e, i, tabela, prefixo, todos))
            .join('');
    }
    sincronizarIdiomasOculto(tabela);
    // Depois de adicionar um dialeto o campo é refeito; devolve o foco a ele
    // para a pessoa poder digitar o próximo sem clicar de novo.
    if (focarDialetoDe != null) {
        document.getElementById(`${prefixo}-dialeto-input-${focarDialetoDe}`)?.focus();
    }
}

// Vírgula separa vários de uma vez. Repetido (mesmo idioma, sem diferenciar
// caixa nem acento) é ignorado. O primeiro idioma de um texto vazio entra
// como Principal; os seguintes, como Secundário.
export function adicionarIdiomaTexto(tabela, valor = null) {
    const prefixo = prefixoLocaisTexto(tabela);
    const input = document.getElementById(`${prefixo}-idioma-input`);
    const lista = idiomasTexto[tabela].map((e) => ({ ...e }));
    String(valor ?? input?.value ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((idioma) => {
            if (lista.some((e) => chaveTema(e.idioma) === chaveTema(idioma))) return;
            lista.push({ idioma, papel: lista.length ? 'secundario' : 'principal', dialetos: [] });
        });
    idiomasTexto[tabela] = normalizarIdiomas(lista);
    if (input) input.value = '';
    renderizarIdiomasTexto(tabela);
}
export function removerIdiomaTexto(tabela, indice) {
    const lista = idiomasTexto[tabela].map((e) => ({ ...e }));
    lista.splice(Number(indice), 1);
    idiomasTexto[tabela] = normalizarIdiomas(lista); // promove o primeiro se faltar Principal
    renderizarIdiomasTexto(tabela);
}
// Rebaixar o único Principal promove o próximo da lista (o seguinte, ou o
// primeiro se era o último). Se for o único idioma, continua Principal.
export function definirPapelIdiomaTexto(tabela, indice, papel) {
    const i = Number(indice);
    const lista = idiomasTexto[tabela].map((e) => ({ ...e }));
    if (!lista[i]) return;
    lista[i].papel = normalizarPapelIdioma(papel);
    if (!lista.some((e) => e.papel === 'principal')) {
        const ordem = [...lista.keys()]
            .filter((j) => j > i)
            .concat([...lista.keys()].filter((j) => j < i));
        lista[ordem.length ? ordem[0] : i].papel = 'principal';
    }
    idiomasTexto[tabela] = lista;
    renderizarIdiomasTexto(tabela);
}
// Vírgula separa vários de uma vez; repetido (sem diferenciar caixa nem
// acento) é ignorado. O campo é refeito e recebe o foco de volta.
export function adicionarDialetoIdiomaTexto(tabela, indice, valor) {
    const i = Number(indice);
    const lista = idiomasTexto[tabela].map((e) => ({ ...e, dialetos: [...e.dialetos] }));
    if (!lista[i]) return;
    const novos = String(valor ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    if (!novos.length) return;
    lista[i].dialetos = normalizarDialetos(lista[i].dialetos, novos);
    idiomasTexto[tabela] = lista;
    renderizarIdiomasTexto(tabela, i);
}
export function removerDialetoIdiomaTexto(tabela, indice, posicao) {
    const i = Number(indice);
    const lista = idiomasTexto[tabela].map((e) => ({ ...e, dialetos: [...e.dialetos] }));
    if (!lista[i]) return;
    lista[i].dialetos.splice(Number(posicao), 1);
    idiomasTexto[tabela] = lista;
    renderizarIdiomasTexto(tabela, i);
}
// Estado atual, limpo, para forms.js gravar (`idiomas` e o espelho `idioma`).
// Um dialeto digitado e ainda não confirmado (sem Enter nem sair do campo)
// entra junto, para não se perder ao salvar.
export function obterIdiomasTexto(tabela) {
    const prefixo = prefixoLocaisTexto(tabela);
    const lista = idiomasTexto[tabela].map((e, i) => {
        const pendente = document.getElementById(`${prefixo}-dialeto-input-${i}`)?.value ?? '';
        return { ...e, dialetos: normalizarDialetos(e.dialetos, pendente.split(',')) };
    });
    return normalizarIdiomas(lista);
}
export function resetIdiomasTexto(tabela) {
    idiomasTexto[tabela] = idiomaPadraoTexto();
    renderizarIdiomasTexto(tabela);
}
export function carregarIdiomasTexto(tabela, item) {
    idiomasTexto[tabela] = idiomasDoItem(item).map((e) => ({ ...e }));
    renderizarIdiomasTexto(tabela);
}

export function renderRegiaoPoema() {
    const container = document.getElementById('p-regiao-corpo');
    if (!container) return;
    container.innerHTML = criarGrupoRegiaoHTML('p', 'poemas');
    renderizarIdiomasTexto('poemas');
}
export function renderRegiaoProsa() {
    const container = document.getElementById('pr-regiao-corpo');
    if (!container) return;
    container.innerHTML = criarGrupoRegiaoHTML('pr', 'prosas');
    renderizarIdiomasTexto('prosas');
}

// ─── Pessoas ─────────────────────────────────────────────────
// Mesmo padrão das Sinalizações, mas em grupo separado: pessoas
// não são tema, são "a quem o texto se refere/é dedicado".

export function atualizarDatalistPessoas() {
    const datalist = document.getElementById('sugestoes-pessoas');
    if (!datalist) return;
    datalist.innerHTML = nomesPessoasCadastro()
        .map((nome) => `<option value="${escapeHtml(nome)}">`)
        .join('');
}

// Nomes do cadastro central de Pessoas (db.pessoas), ordenados —
// alimenta os datalists de autocomplete de nome nos chips de Pessoas
// (poema e prosa, modal e bulk-edit). Pessoa é entidade própria desde
// migrarPessoasParaCadastro (db.js): a lista de sugestão passou a vir
// direto do cadastro, não mais varrendo item.pessoas de cada poema
// (que hoje só guarda pessoaId, não nome).
function nomesPessoasCadastro() {
    return db.pessoas.map((p) => p.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function adicionarPessoa(tabela, valor = null) {
    grupoPessoas(tabela).adicionar(valor);
}
export function removerPessoa(tabela, nome) {
    grupoPessoas(tabela).remover(nome);
}
export function alternarPapelPessoa(tabela, nome, papel, marcado) {
    grupoPessoas(tabela).alternarPapel(nome, papel, marcado);
}
export function alternarDropdownPapelPessoa(tabela, nome) {
    grupoPessoas(tabela).alternarDropdown(nome);
}
export function renderizarPessoas(tabela) {
    grupoPessoas(tabela).renderizar();
}
export function resetPessoas(tabela) {
    grupoPessoas(tabela).reset();
}
export function carregarPessoas(tabela, pessoas) {
    grupoPessoas(tabela).carregar(pessoas);
}
export function obterPessoas(tabela) {
    return grupoPessoas(tabela).obterItens();
}

// ─── Grupos referenciados diretamente (poema) ─────────────────

// Desde 27/09/2026, Grupo pertence a um Autor — a sugestão passa a ser
// escopada pela união dos Autores já adicionados no texto (mesmo
// critério usado em criarGrupoDeGruposDiretos.adicionar acima: sem
// nenhum Autor ainda, cai num fallback permissivo com todos os grupos).
// O dropdown próprio (candidatosPorAutoria, dentro da fábrica) recalcula
// isso a cada abertura, então — ao contrário do antigo <datalist> nativo
// — não precisa de uma função de refresh chamada de fora a cada mudança
// de Autoria; ela só ficaria desatualizada se o painel já estivesse
// aberto no instante exato da mudança, caso raríssimo (Autoria e Grupo
// direto não são editados ao mesmo tempo pela mesma pessoa).

export function adicionarGrupoDireto(tabela, valor = null) {
    grupoGruposDiretos(tabela).adicionar(valor);
}
export function removerGrupoDireto(tabela, grupoId) {
    grupoGruposDiretos(tabela).remover(grupoId);
}
// Dropdown próprio de sugestão (ver criarGrupoDeGruposDiretos acima) —
// abre ao focar/digitar no input, fecha ao clicar fora (tratado dentro
// da própria fábrica) ou ao escolher uma opção.
export function abrirSugestoesGrupoDireto(tabela) {
    grupoGruposDiretos(tabela).abrirSugestoes();
}
export function fecharSugestoesGrupoDireto(tabela) {
    grupoGruposDiretos(tabela).fecharSugestoes();
}
export function selecionarGrupoDireto(tabela, grupoId) {
    grupoGruposDiretos(tabela).selecionarSugestao(grupoId);
}
export function resetGruposDiretos(tabela) {
    grupoGruposDiretos(tabela).reset();
}
export function carregarGruposDiretos(tabela, ids) {
    grupoGruposDiretos(tabela).carregar(ids);
}
export function obterGruposDiretos(tabela) {
    return grupoGruposDiretos(tabela).obterItens();
}

// ─── Movimento/Escola (referência direta — N:N) ─────────────────
// Mesmo espírito de criarGrupoDeGruposDiretos acima (array de id,
// autocomplete por nome, cria com confirmação se não existir) —
// generalizada aqui pra servir aos TRÊS lugares que referenciam
// db.movimentosEscolas: Poema, Prosa (grupo "Correntes literárias", desde a Fase 14) e
// Autor (4º grupo do modal, ver decisoes.md). "tabela" cobre também
// 'autores', não só 'poemas'/'prosas' como no resto do arquivo.
function criarGrupoDeMovimentosEscolas({
    tabela,
    inputId,
    containerId,
    nomeFuncaoRemover,
    inputDivisoesId = null,
    containerDivisoesId = null,
}) {
    let itens = []; // array de movimentoEscolaId

    // Fase 14, etapa 2: em Poema e Prosa os chips se dividem em dois campos,
    // Correntes (sem pai) e Divisões (com pai). A lista continua uma só
    // (`itens` é o `movimentosEscolasIds` do texto): quem decide em qual campo
    // o chip aparece é `ehDivisaoDaCorrente`, derivado do `paiId` na hora de
    // desenhar (F14-D6). Sem `containerDivisoesId` (modal de Autor) o campo é
    // um só, como antes.
    const separado = !!containerDivisoesId;

    function movimentoDe(id) {
        return db.movimentosEscolas.find((m) => m.id == id);
    }

    function adicionarPorId(id) {
        if (!itens.some((i) => i == id)) {
            itens.push(id);
            renderizar();
        }
    }

    // `campo`: 'corrente' (padrão) ou 'divisao'. Nome que já existe entra
    // pelos dois campos e aparece no campo a que pertence; nome novo só é
    // criado pelo campo de Correntes, porque uma divisão precisa de pai.
    function adicionar(valor = null, campo = 'corrente') {
        const idDoInput = campo === 'divisao' && separado ? inputDivisoesId : inputId;
        const input = document.getElementById(idDoInput);
        const nome = (valor ?? input?.value ?? '').trim();
        if (input) input.value = '';
        if (!nome) return;

        const existente = db.movimentosEscolas.find((m) => m.nome === nome);
        if (existente) {
            adicionarPorId(existente.id);
            return;
        }

        if (campo === 'divisao' && separado) {
            mostrarAviso(
                `"${nome}" não está no cadastro. Uma divisão precisa de uma corrente pai: crie-a na aba Correntes literárias, em "Faz parte de", e volte aqui.`,
                'info',
            );
            return;
        }

        abrirModalConfirmacao({
            titulo: `Criar corrente literária "${nome}"?`,
            rotulo: 'Corrente literária nova',
            mensagem: `"${nome}" ainda não está no cadastro de Correntes literárias. Criar agora (só com o nome, dá pra completar o resto depois na aba Correntes literárias)?`,
            textoConfirmar: 'Criar',
            corConfirmar: '#e11d48',
            onConfirmar: () => {
                const movimento = obterOuCriarMovimentoEscolaPorNome(nome);
                adicionarPorId(movimento.id);
            },
        });
    }

    function remover(id) {
        itens = itens.filter((i) => i != id);
        renderizar();
    }

    // Chip com o nome e, na dica, o caminho completo (F14-D7): nomes de
    // divisão se repetem entre correntes ("2ª geração") e o pai nem sempre
    // está marcado no texto.
    function chipHtml(id, nome, dica) {
        return `
            <span title="${escapeHtml(dica)}" class="text-[11px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(nome)}
                <button type="button" data-id="${escapeHtml(String(id))}" onclick="${nomeFuncaoRemover}('${tabela}', this.dataset.id)" class="hover:text-red-600 dark:hover:text-red-400 font-bold ml-1">×</button>
            </span>`;
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        const containerDivisoes = separado ? document.getElementById(containerDivisoesId) : null;
        if (!separado) {
            if (!container) return;
            container.innerHTML = itens
                .map((id) => {
                    const nome = movimentoDe(id)
                        ? rotuloDaCorrente(db.movimentosEscolas, id)
                        : '(corrente literária removida)';
                    return chipHtml(id, nome, nome);
                })
                .join('');
            return;
        }
        const correntes = [];
        const divisoes = [];
        itens.forEach((id) => {
            const movimento = movimentoDe(id);
            if (!movimento) {
                correntes.push(chipHtml(id, '(corrente literária removida)', 'removida'));
            } else if (ehDivisaoDaCorrente(db.movimentosEscolas, id)) {
                divisoes.push(
                    chipHtml(id, movimento.nome, caminhoDaCorrente(db.movimentosEscolas, id)),
                );
            } else {
                correntes.push(chipHtml(id, movimento.nome, movimento.nome));
            }
        });
        if (container) container.innerHTML = correntes.join('');
        if (containerDivisoes) containerDivisoes.innerHTML = divisoes.join('');
    }

    function reset() {
        itens = [];
        renderizar();
    }

    function carregar(ids) {
        itens = Array.isArray(ids) ? [...ids] : [];
        renderizar();
    }

    function obterItens() {
        return itens;
    }

    return { adicionar, remover, renderizar, reset, carregar, obterItens };
}

const grupoMovimentosEscolasPoema = criarGrupoDeMovimentosEscolas({
    tabela: 'poemas',
    inputId: 'p-movimento-escola-input',
    containerId: 'p-movimentos-escolas-container',
    inputDivisoesId: 'p-divisao-corrente-input',
    containerDivisoesId: 'p-divisoes-correntes-container',
    nomeFuncaoRemover: 'removerMovimentoEscolaDireto',
});
const grupoMovimentosEscolasProsa = criarGrupoDeMovimentosEscolas({
    tabela: 'prosas',
    inputId: 'pr-movimento-escola-input',
    containerId: 'pr-movimentos-escolas-container',
    inputDivisoesId: 'pr-divisao-corrente-input',
    containerDivisoesId: 'pr-divisoes-correntes-container',
    nomeFuncaoRemover: 'removerMovimentoEscolaDireto',
});
const grupoMovimentosEscolasAutor = criarGrupoDeMovimentosEscolas({
    tabela: 'autores',
    inputId: 'au-movimento-escola-input',
    containerId: 'au-movimentos-escolas-container',
    nomeFuncaoRemover: 'removerMovimentoEscolaDireto',
});
function grupoMovimentosEscolas(tabela) {
    if (tabela === 'poemas') return grupoMovimentosEscolasPoema;
    if (tabela === 'prosas') return grupoMovimentosEscolasProsa;
    if (tabela === 'autores') return grupoMovimentosEscolasAutor;
    throw new Error(`Tabela desconhecida em grupoMovimentosEscolas: ${tabela}`);
}

// Sugestão por nome já cadastrado — mesmo padrão do dropdown de Grupo
// acima (candidatosPorAutoria), só que alimentando os TRÊS modais.
export function atualizarDatalistMovimentosEscolas() {
    // O valor da opção é o nome (único no cadastro, e é o que o campo casa);
    // o rótulo situa a divisão na árvore e diz a que gênero ela se aplica. A
    // ordem é a da aba (árvore, irmãos por data, como `compararPeriodosNoSelect`).
    // Em Poema e Prosa, divisão do outro gênero não é sugerida, e o campo de
    // Correntes sugere só as de topo e o de Divisões só as que têm pai
    // (Fase 14, etapa 2). O Autor segue com um campo só, com todas.
    const datalists = [
        { tabela: 'poemas', id: 'sugestoes-movimentos-escolas', somente: 'topo' },
        { tabela: 'poemas', id: 'sugestoes-divisoes-correntes', somente: 'divisoes' },
        { tabela: 'prosas', id: 'sugestoes-movimentos-escolas-prosa', somente: 'topo' },
        { tabela: 'prosas', id: 'sugestoes-divisoes-correntes-prosa', somente: 'divisoes' },
        { tabela: 'autores', id: 'sugestoes-movimentos-escolas-autor', somente: null },
    ];
    datalists.forEach(({ tabela, id, somente }) => {
        const datalist = document.getElementById(id);
        if (!datalist) return;
        datalist.innerHTML = sugestoesDeCorrentes(
            db.movimentosEscolas,
            tabela,
            compararPeriodosNoSelect,
            somente,
        )
            .map(
                (o) =>
                    `<option value="${escapeHtml(o.nome)}"${o.rotulo ? ` label="${escapeHtml(o.rotulo)}"` : ''}></option>`,
            )
            .join('');
    });
}

// Sugestão de Região (origem de Corrente, alcance de Período Histórico) —
// direto dos dois cadastros centrais, não de Poemas/Prosas.
// Opções do select "Faz parte de" do modal de Corrente literária: todas as
// correntes menos a que está sendo editada e as divisões dela (não dá para
// ser filha de si mesma). O rótulo é o caminho completo (Romantismo ›
// Romantismo no Brasil), em ordem alfabética. `paiId` pré-seleciona.
export function preencherOpcoesPaiCorrente(idEditando = null, paiId = null) {
    const select = document.getElementById('me-pai');
    if (!select) return;
    const lista = db.movimentosEscolas;
    const opcoes = opcoesDePaiDaCorrente(lista, idEditando)
        .map((m) => ({ id: m.id, rotulo: caminhoDaCorrente(lista, m.id) }))
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
    select.innerHTML =
        '<option value="">Nenhuma (corrente de topo)</option>' +
        opcoes.map((o) => `<option value="${o.id}">${escapeHtml(o.rotulo)}</option>`).join('');
    select.value = paiId != null ? String(paiId) : '';
    sincronizarCamposDivisaoCorrente();
}

// Divisão e "Aplica-se a" só valem com pai: sem pai ficam desabilitados e
// vazios.
export function sincronizarCamposDivisaoCorrente() {
    const temPai = Boolean(document.getElementById('me-pai')?.value);
    ['me-divisao', 'me-genero-divisao'].forEach((idCampo) => {
        const campo = document.getElementById(idCampo);
        if (!campo) return;
        campo.disabled = !temPai;
        if (!temPai) campo.value = '';
    });
}

// As sugestões de Região (nos dois cadastros) vêm dos lugares já usados nos
// dois: Corrente literária e Período Histórico compartilham o vocabulário.
function lugaresDeRegiaoJaUsados() {
    return lugaresUsados(
        { lista: db.movimentosEscolas, ler: (m) => m.regiaoOrigem },
        { lista: db.periodosHistoricos, ler: (p) => p.regiao },
    );
}

function preencherDatalistRegiao(idDatalist) {
    const datalist = document.getElementById(idDatalist);
    if (datalist) {
        datalist.innerHTML = lugaresDeRegiaoJaUsados()
            .map((r) => `<option value="${escapeHtml(r)}">`)
            .join('');
    }
}

export function atualizarDatalistRegiaoOrigemMovimento() {
    preencherDatalistRegiao('sugestoes-regiao-origem-movimento');
}

// Mesmo padrão de atualizarDatalistRegiaoOrigemMovimento acima, pro campo
// Região do cadastro de Período Histórico — sugestão vem do próprio
// db.periodosHistoricos.
// ─── Pertence a (Período Histórico) ──────────────────────────────────────
// Lista de períodos pais do modal de Período Histórico, como chips: o
// primeiro é o principal (define o caminho mostrado) e um clique nos outros
// o promove. O select oferece todos os períodos menos o que está sendo
// editado e os de dentro dele (não dá para ser filho de si mesmo) e menos
// quem já está na lista. O rótulo de cada opção traz o caminho acima dela,
// para distinguir períodos de mesmo nome.
let _paisPeriodoHistorico = [];
let _idEditandoPeriodoHistorico = null;

function rotuloPeriodoHistoricoNaLista(p) {
    const acima = caminhoDosAncestraisDoPeriodo(db.periodosHistoricos, p.id);
    return acima ? `${p.nome} (${acima})` : p.nome;
}

export function preencherPaisPeriodoHistorico(idEditando = null, pais = []) {
    _idEditandoPeriodoHistorico = idEditando;
    _paisPeriodoHistorico = [...(pais || [])];
    renderPaisPeriodoHistorico();
}

export function lerPaisPeriodoHistorico() {
    return [..._paisPeriodoHistorico];
}

// Irmãos em ordem cronológica (início, ou fim se faltar), como a lista da aba;
// sem data, vão para o fim e desempatam por nome.
function compararPeriodosNoSelect(a, b) {
    const anoA = anoEquivalenteMovimento(a.inicio) ?? anoEquivalenteMovimento(a.fim);
    const anoB = anoEquivalenteMovimento(b.inicio) ?? anoEquivalenteMovimento(b.fim);
    if (anoA == null && anoB == null) return a.nome.localeCompare(b.nome, 'pt-BR');
    if (anoA == null) return 1;
    if (anoB == null) return -1;
    if (anoA !== anoB) return anoA - anoB;
    return a.nome.localeCompare(b.nome, 'pt-BR');
}

function renderPaisPeriodoHistorico() {
    const chips = document.getElementById('ph-pais-chips');
    const select = document.getElementById('ph-pais-select');
    if (!chips || !select) return;
    const lista = db.periodosHistoricos;
    // Pai que deixou de existir sai da lista sem barulho.
    _paisPeriodoHistorico = _paisPeriodoHistorico.filter((id) => lista.some((p) => p.id == id));

    chips.innerHTML = '';
    _paisPeriodoHistorico.forEach((id, i) => {
        const reg = lista.find((p) => p.id == id);
        const chip = document.createElement('span');
        chip.className =
            'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300';
        const rotulo = document.createElement('button');
        rotulo.type = 'button';
        rotulo.textContent = rotuloPeriodoHistoricoNaLista(reg) + (i === 0 ? ' · principal' : '');
        rotulo.title = i === 0 ? 'Período principal' : 'Tornar principal';
        if (i === 0) rotulo.disabled = true;
        rotulo.onclick = () => {
            _paisPeriodoHistorico = [id, ..._paisPeriodoHistorico.filter((x) => x != id)];
            renderPaisPeriodoHistorico();
        };
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.textContent = '×';
        remover.title = 'Remover';
        remover.setAttribute('aria-label', `Remover ${reg.nome}`);
        remover.onclick = () => {
            _paisPeriodoHistorico = _paisPeriodoHistorico.filter((x) => x != id);
            renderPaisPeriodoHistorico();
        };
        chip.append(rotulo, remover);
        chips.appendChild(chip);
    });

    // Em árvore, como a lista da aba: cada período seguido dos de dentro, com
    // recuo. Quem já está nos chips continua na árvore (para os de dentro não
    // perderem o contexto), mas desabilitado e marcado.
    const opcoes = opcoesDePaiEmArvore(
        lista,
        _idEditandoPeriodoHistorico,
        compararPeriodosNoSelect,
    );
    select.innerHTML =
        '<option value="">Adicionar período pai...</option>' +
        opcoes
            .map(({ m, nivel }) => {
                const jaEsta = _paisPeriodoHistorico.some((x) => x == m.id);
                const recuo = '\u00a0\u00a0\u00a0\u00a0'.repeat(nivel) + (nivel ? '↳ ' : '');
                return `<option value="${m.id}" title="${escapeHtml(rotuloPeriodoHistoricoNaLista(m))}"${jaEsta ? ' disabled' : ''}>${recuo}${escapeHtml(m.nome)}${jaEsta ? ' ✓' : ''}</option>`;
            })
            .join('');
    select.value = '';
    select.onchange = () => {
        if (!select.value) return;
        _paisPeriodoHistorico.push(Number(select.value));
        renderPaisPeriodoHistorico();
    };
}

export function atualizarDatalistRegiaoPeriodoHistorico() {
    preencherDatalistRegiao('sugestoes-regiao-periodo-historico');
}

export function adicionarMovimentoEscolaDireto(tabela, valor = null) {
    grupoMovimentosEscolas(tabela).adicionar(valor);
}
export function adicionarDivisaoCorrenteDireta(tabela, valor = null) {
    grupoMovimentosEscolas(tabela).adicionar(valor, 'divisao');
}
export function removerMovimentoEscolaDireto(tabela, id) {
    grupoMovimentosEscolas(tabela).remover(id);
}
export function resetMovimentosEscolasDiretos(tabela) {
    grupoMovimentosEscolas(tabela).reset();
}
export function carregarMovimentosEscolasDiretos(tabela, ids) {
    grupoMovimentosEscolas(tabela).carregar(ids);
}
export function obterMovimentosEscolasDiretos(tabela) {
    return grupoMovimentosEscolas(tabela).obterItens();
}

// ─── Períodos Históricos Retratados (Bloco 2e) ──────────────────
// Poema e Prosa podem retratar vários períodos históricos, todos iguais
// entre si (sem principal, a ordem não significa nada). Chips com o
// rótulo de caminho (rotuloDeEscolhaDoPeriodo). Nome que não existe vira
// chip "novo" e só é criado no cadastro ao SALVAR o texto, para cancelar o
// modal não deixar período solto. Cada item é um id ou { novo: 'Nome' }.
// Eventos (F14-D3/D4): a mesma lista do texto aparece em dois campos, Períodos
// e Eventos. Cada campo é uma instância desta fábrica com o seu `tipo`
// ('periodos' | 'eventos') e só guarda os itens da sua marca. Nome que já
// existe no cadastro mas é do outro tipo vai para o campo certo, com um aviso.
// `{ novo }` nasce com a marca do campo em que foi digitado.
function criarGrupoDePeriodosHistoricos({
    inputId,
    containerId,
    nomeFuncaoRemover,
    tabela,
    tipo = 'periodos',
}) {
    let itens = [];
    const querEvento = tipo === 'eventos';
    const doTipo = (id) => ehEvento(db.periodosHistoricos.find((p) => p.id == id)) === querEvento;

    const ehNovo = (i) => i && typeof i === 'object';
    const mesmoItem = (a, b) =>
        ehNovo(a) || ehNovo(b) ? ehNovo(a) && ehNovo(b) && a.novo === b.novo : a == b;

    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const texto = (valor ?? input?.value ?? '').trim();
        if (!texto) return;
        const r = resolverPeriodoPorRotulo(db.periodosHistoricos, texto);
        if (r.ambiguo) {
            mostrarAviso(
                `Há mais de um período chamado "${r.nome}". Escolha na lista o que mostra o caminho.`,
            );
            return;
        }
        if (input) input.value = '';
        if (!r.novo && !doTipo(r.id)) {
            const nome = db.periodosHistoricos.find((p) => p.id == r.id)?.nome || texto;
            mostrarAviso(
                `"${nome}" ${querEvento ? 'é um período, não um evento' : 'é um evento'}: entrou ${querEvento ? 'em Períodos' : 'em Eventos'}.`,
                'info',
            );
            grupoPeriodosHistoricos(tabela, querEvento ? 'periodos' : 'eventos').adicionarResolvido(
                r.id,
            );
            return;
        }
        const item = r.novo ? { novo: texto } : r.id;
        if (!itens.some((i) => mesmoItem(i, item))) {
            itens.push(item);
            renderizar();
        }
    }

    // Entrada já resolvida (id) vinda do campo irmão.
    function adicionarResolvido(id) {
        if (!itens.some((i) => mesmoItem(i, id))) {
            itens.push(id);
            renderizar();
        }
    }

    function remover(chave) {
        itens = itens.filter((i) => String(ehNovo(i) ? `novo:${i.novo}` : i) !== String(chave));
        renderizar();
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        if (!container) return;
        // Id que deixou de existir sai sem barulho.
        itens = itens.filter((i) => ehNovo(i) || db.periodosHistoricos.some((p) => p.id == i));
        const cor = querEvento
            ? 'bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200'
            : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
        const avisoNovo = querEvento
            ? 'Evento novo: será criado ao salvar o texto'
            : 'Período novo: será criado ao salvar o texto';
        container.innerHTML = itens
            .map((i) => {
                const novo = ehNovo(i);
                const rotulo = novo ? i.novo : rotuloDeEscolhaDoPeriodo(db.periodosHistoricos, i);
                const chave = novo ? `novo:${i.novo}` : String(i);
                return `
            <span title="${escapeHtml(novo ? avisoNovo : rotulo)}" class="text-[11px] ${cor} px-2 py-1 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(rotulo)}${novo ? ' (novo)' : ''}
                <button type="button" data-chave="${escapeHtml(chave)}" onclick="${nomeFuncaoRemover}('${tabela}', this.dataset.chave, '${tipo}')" aria-label="Remover ${escapeHtml(rotulo)}" class="hover:text-red-600 dark:hover:text-red-400 font-bold ml-1">×</button>
            </span>`;
            })
            .join('');
    }

    function reset() {
        itens = [];
        renderizar();
    }

    function carregar(ids) {
        itens = periodosHistoricosIdsDoItem(
            { periodosHistoricosIds: ids },
            db.periodosHistoricos,
        ).filter(doTipo);
        renderizar();
    }

    // Chips + o que sobrou digitado no campo (quem digita e salva sem
    // apertar "+" não perde o período).
    function obterItens() {
        const pendente = (document.getElementById(inputId)?.value || '').trim();
        if (pendente) adicionar(pendente);
        // `{ novo }` do campo Eventos leva a marca, para quem salva criar o
        // registro já como evento.
        return querEvento ? itens.map((i) => (ehNovo(i) ? { ...i, evento: true } : i)) : itens;
    }

    return { adicionar, adicionarResolvido, remover, renderizar, reset, carregar, obterItens };
}

const GRUPOS_PERIODOS_HISTORICOS = {};
[
    ['poemas', 'p', 'periodo-historico-nome', 'periodos-historicos-container'],
    ['prosas', 'pr', 'periodo-historico-nome', 'periodos-historicos-container'],
].forEach(([tabela, pre, entrada, caixa]) => {
    const por = (GRUPOS_PERIODOS_HISTORICOS[tabela] = {});
    por.periodos = criarGrupoDePeriodosHistoricos({
        tabela,
        tipo: 'periodos',
        inputId: `${pre}-${entrada}`,
        containerId: `${pre}-${caixa}`,
        nomeFuncaoRemover: 'removerPeriodoHistoricoDoTexto',
    });
    por.eventos = criarGrupoDePeriodosHistoricos({
        tabela,
        tipo: 'eventos',
        inputId: `${pre}-evento-historico-nome`,
        containerId: `${pre}-eventos-historicos-container`,
        nomeFuncaoRemover: 'removerPeriodoHistoricoDoTexto',
    });
});
function grupoPeriodosHistoricos(tabela, tipo = 'periodos') {
    const grupo = GRUPOS_PERIODOS_HISTORICOS[tabela]?.[tipo === 'eventos' ? 'eventos' : 'periodos'];
    if (!grupo) throw new Error(`Tabela desconhecida em grupoPeriodosHistoricos: ${tabela}`);
    return grupo;
}
export function adicionarPeriodoHistoricoDoTexto(tabela, valor = null, tipo = 'periodos') {
    grupoPeriodosHistoricos(tabela, tipo).adicionar(valor);
}
export function removerPeriodoHistoricoDoTexto(tabela, chave, tipo = 'periodos') {
    grupoPeriodosHistoricos(tabela, tipo).remover(chave);
}
export function resetPeriodosHistoricosDoTexto(tabela) {
    grupoPeriodosHistoricos(tabela, 'periodos').reset();
    grupoPeriodosHistoricos(tabela, 'eventos').reset();
}
// A lista do texto é uma só (F14-D4): cada campo fica com os itens da sua marca.
export function carregarPeriodosHistoricosDoTexto(tabela, ids) {
    grupoPeriodosHistoricos(tabela, 'periodos').carregar(ids);
    grupoPeriodosHistoricos(tabela, 'eventos').carregar(ids);
}
// Lista de id ou { novo } (o novo de Eventos leva `evento: true`): primeiro os
// períodos, depois os eventos. Quem salva troca cada { novo } pelo id criado.
export function obterPeriodosHistoricosDoTexto(tabela) {
    return [
        ...grupoPeriodosHistoricos(tabela, 'periodos').obterItens(),
        ...grupoPeriodosHistoricos(tabela, 'eventos').obterItens(),
    ];
}

// ─── Períodos Biográficos Retratados (vários por texto) ─────────
// Poema e Prosa podem retratar vários Períodos Biográficos. Cada chip leva o
// SEU recorte (Momento, ou Momento e Repercussão): o mesmo texto pode retratar
// um período como evento e outro como efeito. `inicio`, `fim` e N/A seguem
// por texto (campos De/Até fora dos chips). Cada item é
// `{ epocaId, recorte }` ou, para nome que ainda não existe no cadastro,
// `{ novo: 'Nome', recorte }`: o período novo só é criado ao SALVAR o texto,
// para cancelar o modal não deixar período solto. A ordem dos chips é a da
// lista e não significa hierarquia.
// Eventos (F14-D3/D4): a lista do texto é uma só e aparece em dois campos,
// Períodos e Eventos. Cada campo é uma instância desta fábrica com o seu `tipo`
// e só guarda os itens da sua marca; nome que existe no cadastro mas é do outro
// tipo vai para o campo certo, com um aviso.
function criarGrupoDeEpocasRetratadas({ inputId, containerId, tabela, tipo = 'periodos' }) {
    let itens = [];
    const querEvento = tipo === 'eventos';
    const doTipo = (epocaId) => ehEvento(db.epocas.find((e) => e.id == epocaId)) === querEvento;

    const ehNovo = (i) => i && Object.prototype.hasOwnProperty.call(i, 'novo');
    const chaveDe = (i) => (ehNovo(i) ? `novo:${i.novo}` : String(i.epocaId));

    // Texto do campo (o rótulo de uma sugestão ou só o nome) -> período do
    // cadastro. Prefere o de um Autor do texto; sem nenhum deles, vira período
    // novo (criado ao salvar, para o primeiro Autor).
    function resolver(texto) {
        const extras = periodosParaEscolhaRetratada(tabela);
        const r = resolverPeriodoBiograficoPorRotulo(db.epocas, texto, extras);
        return r.id != null ? { epocaId: r.id, recorte: null } : { novo: texto, recorte: null };
    }

    // Item já resolvido (vindo do campo irmão): entra sem repetir.
    function adicionarResolvido(item) {
        if (itens.some((i) => chaveDe(i) === chaveDe(item))) return;
        itens.push(item);
        renderizar();
    }

    // Devolve o nome adicionado (para quem quiser sugerir datas) ou null.
    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const texto = (valor ?? input?.value ?? '').trim();
        if (!texto) return null;
        if (input) input.value = '';
        const item = resolver(texto);
        if (!ehNovo(item) && !doTipo(item.epocaId)) {
            const nome = db.epocas.find((e) => e.id == item.epocaId)?.nome || texto;
            mostrarAviso(
                `"${nome}" ${querEvento ? 'é um período, não um evento' : 'é um evento'}: entrou ${querEvento ? 'em Períodos' : 'em Eventos'}.`,
                'info',
            );
            grupoEpocasRetratadas(tabela, querEvento ? 'periodos' : 'eventos').adicionarResolvido(
                item,
            );
            return db.epocas.find((e) => e.id == item.epocaId)?.nome || texto;
        }
        if (itens.some((i) => chaveDe(i) === chaveDe(item))) return null;
        itens.push(item);
        renderizar();
        // O nome do período (não o rótulo digitado, que leva o caminho) é o que
        // a sugestão de datas procura no cadastro.
        return ehNovo(item) ? texto : db.epocas.find((e) => e.id == item.epocaId)?.nome || texto;
    }

    function remover(chave) {
        itens = itens.filter((i) => chaveDe(i) !== String(chave));
        renderizar();
    }

    function alterarRecorte(chave, valor) {
        const item = itens.find((i) => chaveDe(i) === String(chave));
        if (!item) return;
        item.recorte = RECORTES_EPOCA.includes(valor) ? valor : null;
        renderizar();
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        if (!container) return;
        // Id que deixou de existir sai sem barulho.
        itens = itens.filter((i) => ehNovo(i) || db.epocas.some((e) => e.id == i.epocaId));
        const cor = querEvento
            ? 'bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200'
            : 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200';
        const avisoNovo = querEvento
            ? 'Evento novo: será criado ao salvar o texto'
            : 'Período novo: será criado ao salvar o texto';
        container.innerHTML = itens
            .map((i) => {
                const novo = ehNovo(i);
                const rotulo = novo ? i.novo : rotuloDoPeriodoBiografico(db.epocas, i.epocaId);
                const chave = chaveDe(i);
                const opcoes = [['', 'Recorte não especificado']]
                    .concat(RECORTES_EPOCA.map((r) => [r, ROTULOS_RECORTE_EPOCA[r]]))
                    .map(
                        ([v, t]) =>
                            `<option value="${v}"${(i.recorte || '') === v ? ' selected' : ''}>${escapeHtml(t)}</option>`,
                    )
                    .join('');
                return `
            <span title="${escapeHtml(novo ? avisoNovo : rotulo)}" class="text-[11px] ${cor} px-2 py-1 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(rotulo)}${novo ? ' (novo)' : ''}
                <select data-chave="${escapeHtml(chave)}" onchange="alterarRecorteEpocaRetratadaDoTexto('${tabela}', this.dataset.chave, this.value, '${tipo}')" aria-label="Recorte de ${escapeHtml(rotulo)}" class="text-[10px] py-0 px-1 w-auto rounded">${opcoes}</select>
                <button type="button" data-chave="${escapeHtml(chave)}" onclick="removerEpocaRetratadaDoTexto('${tabela}', this.dataset.chave, '${tipo}')" aria-label="Remover ${escapeHtml(rotulo)}" class="hover:text-red-600 dark:hover:text-red-400 font-bold ml-1">×</button>
            </span>`;
            })
            .join('');
    }

    function reset() {
        itens = [];
        renderizar();
    }

    // `periodos`: a lista de `epocaRetratada.periodos` do texto.
    function carregar(periodos) {
        itens = periodosDaEpocaRetratada({ periodos }, db.epocas)
            .map((p) => ({
                epocaId: p.epocaId,
                recorte: p.recorte,
            }))
            .filter((p) => doTipo(p.epocaId));
        renderizar();
    }

    // Chips + o que sobrou digitado no campo (quem digita e salva sem
    // apertar "+" não perde o período).
    function obterItens() {
        const pendente = (document.getElementById(inputId)?.value || '').trim();
        if (pendente) adicionar(pendente);
        // `{ novo }` do campo Eventos leva a marca, para quem salva criar o
        // registro já como evento.
        return itens.map((i) => (querEvento && ehNovo(i) ? { ...i, evento: true } : { ...i }));
    }

    return {
        adicionar,
        adicionarResolvido,
        remover,
        alterarRecorte,
        renderizar,
        reset,
        carregar,
        obterItens,
    };
}

const GRUPOS_EPOCAS_RETRATADAS = {};
[
    ['poemas', 'p'],
    ['prosas', 'pr'],
].forEach(([tabela, pre]) => {
    GRUPOS_EPOCAS_RETRATADAS[tabela] = {
        periodos: criarGrupoDeEpocasRetratadas({
            tabela,
            tipo: 'periodos',
            inputId: `${pre}-epoca-nome`,
            containerId: `${pre}-epocas-container`,
        }),
        eventos: criarGrupoDeEpocasRetratadas({
            tabela,
            tipo: 'eventos',
            inputId: `${pre}-evento-biografico-nome`,
            containerId: `${pre}-eventos-biograficos-container`,
        }),
    };
});
function grupoEpocasRetratadas(tabela, tipo = 'periodos') {
    const grupo = GRUPOS_EPOCAS_RETRATADAS[tabela]?.[tipo === 'eventos' ? 'eventos' : 'periodos'];
    if (!grupo) throw new Error(`Tabela desconhecida em grupoEpocasRetratadas: ${tabela}`);
    return grupo;
}
export function adicionarEpocaRetratadaDoTexto(tabela, valor = null, tipo = 'periodos') {
    return grupoEpocasRetratadas(tabela, tipo).adicionar(valor);
}
export function removerEpocaRetratadaDoTexto(tabela, chave, tipo = 'periodos') {
    grupoEpocasRetratadas(tabela, tipo).remover(chave);
}
export function alterarRecorteEpocaRetratadaDoTexto(tabela, chave, valor, tipo = 'periodos') {
    grupoEpocasRetratadas(tabela, tipo).alterarRecorte(chave, valor);
}
export function resetEpocasRetratadasDoTexto(tabela) {
    grupoEpocasRetratadas(tabela, 'periodos').reset();
    grupoEpocasRetratadas(tabela, 'eventos').reset();
}
// A lista do texto é uma só (F14-D4): cada campo fica com os itens da sua marca.
export function carregarEpocasRetratadasDoTexto(tabela, periodos) {
    grupoEpocasRetratadas(tabela, 'periodos').carregar(periodos);
    grupoEpocasRetratadas(tabela, 'eventos').carregar(periodos);
}
// Lista de { epocaId, recorte } ou { novo, recorte } (o novo de Eventos leva
// `evento: true`): primeiro os períodos, depois os eventos; quem salva troca
// cada { novo } pelo id do período criado.
export function obterEpocasRetratadasDoTexto(tabela) {
    return [
        ...grupoEpocasRetratadas(tabela, 'periodos').obterItens(),
        ...grupoEpocasRetratadas(tabela, 'eventos').obterItens(),
    ];
}

// ─── 4º grupo do Autor: Reconhecimento e formação literária ─────
// Prêmios/Obras (fábrica nova, chip + ano livre — diferente de
// criarGrupoDeTagsComTipo, que é chip + <select> de tipo FECHADO);
// Círculo/Línguas de escrita reaproveitam criarGrupoDeTags (chip
// simples), mesmo padrão de Ocupações. Ver decisoes.md.
function criarGrupoDeTagsComAno({
    inputId,
    containerId,
    hiddenInputId,
    corClasse,
    nomeFuncaoRemover,
    nomeFuncaoEditar,
    nomeFuncaoAlterarAno,
}) {
    let itens = []; // [{ nome, ano }], ano opcional

    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const nome = (valor ?? input?.value ?? '').trim();
        if (input) input.value = '';
        if (!nome || itens.some((i) => i.nome === nome)) return;
        itens.push({ nome, ano: null });
        renderizar();
    }

    function remover(nome) {
        itens = itens.filter((i) => i.nome !== nome);
        renderizar();
    }

    function alterarAno(nome, ano) {
        const item = itens.find((i) => i.nome === nome);
        if (!item) return;
        const anoNum = parseInt(ano);
        item.ano = Number.isFinite(anoNum) ? anoNum : null;
        renderizar();
    }

    function editar(nome) {
        const input = document.getElementById(inputId);
        remover(nome);
        if (input) {
            input.value = nome;
            input.focus();
        }
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        const inputOculto = document.getElementById(hiddenInputId);
        if (!container) return;

        container.innerHTML = itens
            .map(
                (i) => `
            <span class="${corClasse} text-white text-[10px] pl-2 pr-1 py-1 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(i.nome)}
                <input type="number" data-nome="${escapeHtml(i.nome)}" value="${i.ano ?? ''}" placeholder="ano"
                    onchange="${nomeFuncaoAlterarAno}(this.dataset.nome, this.value)"
                    class="w-14 text-[9px] bg-white/20 rounded px-1 py-0 border-0 text-white placeholder-white/60">
                <button type="button" data-nome="${escapeHtml(i.nome)}" onclick="${nomeFuncaoEditar}(this.dataset.nome)" class="hover:text-blue-200 ml-1" title="Editar">✎</button>
                <button type="button" data-nome="${escapeHtml(i.nome)}" onclick="${nomeFuncaoRemover}(this.dataset.nome)" class="hover:text-red-200 font-bold ml-1" title="Remover">×</button>
            </span>`,
            )
            .join('');

        if (inputOculto) inputOculto.value = JSON.stringify(itens);
    }

    function reset() {
        itens = [];
        renderizar();
    }

    // Aceita array já {nome, ano} e, por defesa, string legada "a, b, c".
    function carregar(valor) {
        itens = Array.isArray(valor)
            ? valor.map((i) =>
                  typeof i === 'string'
                      ? { nome: i, ano: null }
                      : { nome: i.nome, ano: i.ano ?? null },
              )
            : [];
        renderizar();
    }

    return { adicionar, remover, editar, alterarAno, renderizar, reset, carregar };
}

const grupoPremiosAutor = criarGrupoDeTagsComAno({
    inputId: 'au-premio-input',
    containerId: 'au-premios-container',
    hiddenInputId: 'au-premios',
    corClasse: 'bg-amber-600',
    nomeFuncaoRemover: 'removerPremioAutor',
    nomeFuncaoEditar: 'editarPremioAutor',
    nomeFuncaoAlterarAno: 'alterarAnoPremioAutor',
});
export function adicionarPremioAutor(valor = null) {
    grupoPremiosAutor.adicionar(valor);
}
export function removerPremioAutor(nome) {
    grupoPremiosAutor.remover(nome);
}
export function editarPremioAutor(nome) {
    grupoPremiosAutor.editar(nome);
}
export function alterarAnoPremioAutor(nome, ano) {
    grupoPremiosAutor.alterarAno(nome, ano);
}
export function resetPremiosAutor() {
    grupoPremiosAutor.reset();
}
export function carregarPremiosAutor(valor) {
    grupoPremiosAutor.carregar(valor);
}

const grupoObrasAutor = criarGrupoDeTagsComAno({
    inputId: 'au-obra-input',
    containerId: 'au-obras-container',
    hiddenInputId: 'au-obras',
    corClasse: 'bg-cyan-700',
    nomeFuncaoRemover: 'removerObraAutor',
    nomeFuncaoEditar: 'editarObraAutor',
    nomeFuncaoAlterarAno: 'alterarAnoObraAutor',
});
export function adicionarObraAutor(valor = null) {
    grupoObrasAutor.adicionar(valor);
}
export function removerObraAutor(nome) {
    grupoObrasAutor.remover(nome);
}
export function editarObraAutor(nome) {
    grupoObrasAutor.editar(nome);
}
export function alterarAnoObraAutor(nome, ano) {
    grupoObrasAutor.alterarAno(nome, ano);
}
export function resetObrasAutor() {
    grupoObrasAutor.reset();
}
export function carregarObrasAutor(valor) {
    grupoObrasAutor.carregar(valor);
}

const grupoCirculoLiterarioAutor = criarGrupoDeTagsArray({
    inputId: 'au-circulo-input',
    containerId: 'au-circulo-container',
    hiddenInputId: 'au-circulo',
    corClasse: 'bg-fuchsia-700',
    nomeFuncaoRemover: 'removerCirculoLiterarioAutor',
    nomeFuncaoEditar: 'editarCirculoLiterarioAutor',
});
export function adicionarCirculoLiterarioAutor(valor = null) {
    grupoCirculoLiterarioAutor.adicionar(valor);
}
export function removerCirculoLiterarioAutor(item) {
    grupoCirculoLiterarioAutor.remover(item);
}
export function editarCirculoLiterarioAutor(item) {
    grupoCirculoLiterarioAutor.editar(item);
}
export function resetCirculoLiterarioAutor() {
    grupoCirculoLiterarioAutor.reset();
}
export function carregarCirculoLiterarioAutor(valor) {
    grupoCirculoLiterarioAutor.carregar(valor);
}

// Sugestão por nome já digitado em outros Autores — mesmo padrão de
// atualizarDatalistIdioma, mas a fonte é extrairCirculosLiterariosUnicos
// (utils.js) em vez de Poemas/Prosas.
export function atualizarDatalistCirculoLiterarioAutor() {
    const valores = extrairCirculosLiterariosUnicos(db.autores);
    const datalist = document.getElementById('sugestoes-circulo-literario');
    if (datalist) {
        datalist.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}">`).join('');
    }
}

// Línguas de escrita — mesma semente IDIOMAS_SUGERIDOS do campo Idioma
// de Poema/Prosa, mas multi-select (um Autor pode escrever em mais de
// uma língua) e sem derivar de nenhum texto — datalist populado 1x
// (semente fixa) por atualizarDatalistLinguasEscritaAutor abaixo.
const grupoLinguasEscritaAutor = criarGrupoDeTagsArray({
    inputId: 'au-lingua-input',
    containerId: 'au-linguas-container',
    hiddenInputId: 'au-linguas-escrita',
    corClasse: 'bg-lime-700',
    nomeFuncaoRemover: 'removerLinguaEscritaAutor',
    nomeFuncaoEditar: 'editarLinguaEscritaAutor',
});
export function adicionarLinguaEscritaAutor(valor = null) {
    grupoLinguasEscritaAutor.adicionar(valor);
}
export function removerLinguaEscritaAutor(item) {
    grupoLinguasEscritaAutor.remover(item);
}
export function editarLinguaEscritaAutor(item) {
    grupoLinguasEscritaAutor.editar(item);
}
export function resetLinguasEscritaAutor() {
    grupoLinguasEscritaAutor.reset();
}
export function carregarLinguasEscritaAutor(valor) {
    grupoLinguasEscritaAutor.carregar(valor);
}

// Semente fixa (IDIOMAS_SUGERIDOS), não derivada de Poemas/Prosas — ver
// comentário acima de grupoLinguasEscritaAutor.
export function atualizarDatalistLinguasEscritaAutor() {
    const datalist = document.getElementById('sugestoes-linguas-escrita-autor');
    if (datalist) {
        datalist.innerHTML = IDIOMAS_SUGERIDOS.map((v) => `<option value="${escapeHtml(v)}">`).join(
            '',
        );
    }
}

// O modal de Autor é carregado sob demanda (garantirModal), então o
// refresh inicial de atualizarDatalist() não alcança os datalists dele.
// Chamado a cada abertura (Novo Autor e Editar Autor), depois do modal
// existir; assim um Movimento/Escola criado entre duas aberturas também
// já aparece nas sugestões. Os de Nacionalidade, Gênero, Orientação,
// Religião e Instituições vêm de renderDropdowns (ui.js).
export function atualizarDatalistsAutor() {
    atualizarDatalistMovimentosEscolas();
    atualizarDatalistCirculoLiterarioAutor();
    atualizarDatalistLinguasEscritaAutor();
}

// Nomes do cadastro central de Autores (db.autores), ordenados —
// alimenta o datalist de autocomplete do chip de Autoria (poema e
// prosa). Mesmo padrão de nomesPessoasCadastro acima.
function nomesAutoresCadastro() {
    return db.autores.map((a) => a.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function atualizarDatalistAutores() {
    const nomes = nomesAutoresCadastro();
    ['sugestoes-autores', 'sugestoes-autores-prosa'].forEach((id) => {
        const datalist = document.getElementById(id);
        if (!datalist) return;
        datalist.innerHTML = nomes.map((nome) => `<option value="${escapeHtml(nome)}">`).join('');
    });
}

export function adicionarAutoria(tabela, valor = null) {
    grupoAutoria(tabela).adicionar(valor);
}
export function removerAutoria(tabela, autorId) {
    grupoAutoria(tabela).remover(autorId);
}
export function alterarPapelAutoria(tabela, autorId, papel) {
    grupoAutoria(tabela).alterarPapel(autorId, papel);
}
export function alterarAssinaturaAutoria(tabela, autorId, assinatura) {
    grupoAutoria(tabela).alterarAssinatura(autorId, assinatura);
}
export function alterarNomeLiterarioAutoria(tabela, autorId, nomeLiterario) {
    grupoAutoria(tabela).alterarNomeLiterario(autorId, nomeLiterario);
}
export function renderizarAutoria(tabela) {
    grupoAutoria(tabela).renderizar();
}
export function resetAutoria(tabela) {
    grupoAutoria(tabela).reset();
}
export function carregarAutoria(tabela, autoria) {
    grupoAutoria(tabela).carregar(autoria);
}
export function obterAutoria(tabela) {
    return grupoAutoria(tabela).obterItens();
}

// ─── Inicialização dos listeners ─────────────────────────────

// ─── Tags/Pessoas: Prosa (espelha o padrão do Poema) ─────────

export function atualizarDatalistProsa() {
    // As 5 categorias de Sinalizações (poema+prosa+bulk, todas as
    // variantes de ID) já são preenchidas centralmente por
    // atualizarDatalist() — chamado logo depois desta, ver main.js.
    const pessoasUnicas = nomesPessoasCadastro();
    const generosUnicos = extrairGenerosUnicos(db.prosas || []);

    const datalistPessoas = document.getElementById('sugestoes-pessoas-prosa');
    if (datalistPessoas) {
        datalistPessoas.innerHTML = pessoasUnicas
            .map((nome) => `<option value="${escapeHtml(nome)}">`)
            .join('');
    }

    // Datalists sempre presentes no index.html, usados pela barra de
    // edição em massa da aba Prosas (independem do modal ter sido aberto)
    const datalistPessoasBulk = document.getElementById('sugestoes-pessoas-bulk-prosa');
    if (datalistPessoasBulk) {
        datalistPessoasBulk.innerHTML = pessoasUnicas
            .map((nome) => `<option value="${escapeHtml(nome)}">`)
            .join('');
    }

    const datalistGenero = document.getElementById('sugestoes-genero-prosa');
    if (datalistGenero) {
        datalistGenero.innerHTML = generosUnicos
            .map((g) => `<option value="${escapeHtml(g)}">`)
            .join('');
    }
    const datalistGeneroBulk = document.getElementById('sugestoes-genero-bulk-prosa');
    if (datalistGeneroBulk) {
        datalistGeneroBulk.innerHTML = generosUnicos
            .map((g) => `<option value="${escapeHtml(g)}">`)
            .join('');
    }

    // Item 4: Intertextualidade sugere só a partir de db.prosas (cada
    // tipo de texto sugere pelo próprio histórico, não combinado — ver
    // atualizarDatalistIntertexto acima, que só lê db.poemas). Época e
    // Migração (ver atualizarDatalistEpoca/atualizarDatalistMigracao)
    // já foram generalizadas pra preencher os dois datalists (Poema e
    // Prosa) de uma vez só, então não precisam ser chamadas de novo
    // aqui — atualizarDatalist() (Poema) já cobre as duas pontas.
    atualizarDatalistIntertexto('prosas');
    atualizarDatalistReferenciaExterna('prosas');
    atualizarDatalistHipertextualidade('prosas');
    // Movimento/Escola: o modal de Prosa também é carregado sob demanda e
    // atualizarDatalist() só o alcança se ele já existir (mesmo motivo do Autor).
    atualizarDatalistMovimentosEscolas();
}

// Wrappers de Sinalizações (Prosa) unificados acima em
// adicionarSinalTradicao(tabela, ...) etc. — ver grupoSinal(chave, tabela).

// Wrappers de Pessoa (Prosa) unificados acima em adicionarPessoa(tabela, ...)
// etc. — ver grupoPessoas(tabela).

// ─── Grupos referenciados diretamente (prosa) ─────────────────
// Mesmo padrão do Poema acima, instância própria da Prosa.

// Wrappers de Grupos Diretos (Prosa) unificados acima em
// adicionarGrupoDireto(tabela, ...) etc. — ver grupoGruposDiretos(tabela).

// Wrappers de Autoria (Prosa) unificados acima em adicionarAutoria(tabela, ...)
// etc. — ver grupoAutoria(tabela).

// ─── Gênero (Cartas, Diálogos, Ensaios, Prosas poéticas...) ───

export function adicionarGeneroProsa(valor = null) {
    grupoGeneroProsa.adicionar(valor);
}
export function removerGeneroProsa(genero) {
    grupoGeneroProsa.remover(genero);
}
export function editarGeneroProsa(genero) {
    grupoGeneroProsa.editar(genero);
}
export function renderizarGeneroProsa() {
    grupoGeneroProsa.renderizar();
}
export function resetGeneroProsa() {
    grupoGeneroProsa.reset();
}
export function carregarGeneroProsa(generoStr) {
    grupoGeneroProsa.carregar(generoStr);
}

// ─── Ocupações do Autor ────────────────────────────────────────

export function adicionarOcupacaoAutor(valor = null) {
    grupoOcupacoesAutor.adicionar(valor);
}
export function removerOcupacaoAutor(ocupacao) {
    grupoOcupacoesAutor.remover(ocupacao);
}
export function editarOcupacaoAutor(ocupacao) {
    grupoOcupacoesAutor.editar(ocupacao);
}
export function renderizarOcupacoesAutor() {
    grupoOcupacoesAutor.renderizar();
}
export function resetOcupacoesAutor() {
    grupoOcupacoesAutor.reset();
}
export function carregarOcupacoesAutor(ocupacoesStr) {
    grupoOcupacoesAutor.carregar(ocupacoesStr);
}

export function adicionarNomeLiterarioAutor(valor = null) {
    grupoNomesLiterariosAutor.adicionar(valor);
}
export function removerNomeLiterarioAutor(nome) {
    grupoNomesLiterariosAutor.remover(nome);
}
export function editarNomeLiterarioAutor(nome) {
    grupoNomesLiterariosAutor.editar(nome);
}
export function alterarTipoNomeLiterarioAutor(nome, tipo) {
    grupoNomesLiterariosAutor.alterarTipo(nome, tipo);
}
export function renderizarNomesLiterariosAutor() {
    grupoNomesLiterariosAutor.renderizar();
}
export function resetNomesLiterariosAutor() {
    grupoNomesLiterariosAutor.reset();
}
export function carregarNomesLiterariosAutor(nomesLiterarios) {
    grupoNomesLiterariosAutor.carregar(nomesLiterarios);
}

// ─── Condições Clínicas do Autor ───────────────────────────────

export function adicionarCondicaoClinicaAutor(valor = null) {
    grupoCondicoesClinicasAutor.adicionar(valor);
}
export function removerCondicaoClinicaAutor(nome) {
    grupoCondicoesClinicasAutor.remover(nome);
}
export function editarCondicaoClinicaAutor(nome) {
    grupoCondicoesClinicasAutor.editar(nome);
}
export function alterarTipoCondicaoClinicaAutor(nome, tipo) {
    grupoCondicoesClinicasAutor.alterarTipo(nome, tipo);
}
export function renderizarCondicoesClinicasAutor() {
    grupoCondicoesClinicasAutor.renderizar();
}
export function resetCondicoesClinicasAutor() {
    grupoCondicoesClinicasAutor.reset();
}
export function carregarCondicoesClinicasAutor(condicoesClinicas) {
    grupoCondicoesClinicasAutor.carregar(condicoesClinicas);
}

// ─── Deficiências do Autor ─────────────────────────────────────

export function adicionarDeficienciaAutor(valor = null) {
    grupoDeficienciasAutor.adicionar(valor);
}
export function removerDeficienciaAutor(nome) {
    grupoDeficienciasAutor.remover(nome);
}
export function editarDeficienciaAutor(nome) {
    grupoDeficienciasAutor.editar(nome);
}
export function alterarTipoDeficienciaAutor(nome, tipo) {
    grupoDeficienciasAutor.alterarTipo(nome, tipo);
}
export function renderizarDeficienciasAutor() {
    grupoDeficienciasAutor.renderizar();
}
export function resetDeficienciasAutor() {
    grupoDeficienciasAutor.reset();
}
export function carregarDeficienciasAutor(deficiencias) {
    grupoDeficienciasAutor.carregar(deficiencias);
}

// ─── Neurodivergências do Autor ────────────────────────────────

export function adicionarNeurodivergenciaAutor(valor = null) {
    grupoNeurodivergenciasAutor.adicionar(valor);
}
export function removerNeurodivergenciaAutor(item) {
    grupoNeurodivergenciasAutor.remover(item);
}
export function editarNeurodivergenciaAutor(item) {
    grupoNeurodivergenciasAutor.editar(item);
}
export function renderizarNeurodivergenciasAutor() {
    grupoNeurodivergenciasAutor.renderizar();
}
export function resetNeurodivergenciasAutor() {
    grupoNeurodivergenciasAutor.reset();
}
export function carregarNeurodivergenciasAutor(valorStr) {
    grupoNeurodivergenciasAutor.carregar(valorStr);
}

// ─── Instituições Frequentadas do Autor ────────────────────────

export function adicionarInstituicaoAutor(valor = null) {
    grupoInstituicoesAutor.adicionar(valor);
}
export function removerInstituicaoAutor(item) {
    grupoInstituicoesAutor.remover(item);
}
export function editarInstituicaoAutor(item) {
    grupoInstituicoesAutor.editar(item);
}
export function renderizarInstituicoesAutor() {
    grupoInstituicoesAutor.renderizar();
}
export function resetInstituicoesAutor() {
    grupoInstituicoesAutor.reset();
}
export function carregarInstituicoesAutor(valorStr) {
    grupoInstituicoesAutor.carregar(valorStr);
}

export function initEditor() {
    // Preenche o corpo de Sinalizações do Poema (ver
    // renderSinalizacoesPoema acima) antes de qualquer wiring abaixo que
    // dependa dos inputs/containers de cada categoria já existirem no
    // DOM.
    renderSinalizacoesPoema();
    renderTemasPoema();
    renderRegiaoPoema();

    const textarea = document.getElementById('p-texto');
    const toolbar = document.querySelector('.bg-slate-50.border-slate-200');

    // Sincroniza toolColor ↔ toolHex
    const toolColor = document.getElementById('toolColor');
    const toolHex = document.getElementById('toolHex');

    if (toolColor && toolHex) {
        toolColor.addEventListener('input', (e) => {
            toolHex.value = e.target.value.toUpperCase();
        });
        toolHex.addEventListener('change', (e) => {
            let hex = e.target.value;
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9A-F]{6}$/i.test(hex)) toolColor.value = hex;
        });
    }

    // toolSize → applyStyle ao pressionar Enter
    const toolSize = document.getElementById('toolSize');
    if (toolSize) {
        toolSize.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyStyle();
            }
        });
    }

    // Liga os 4 campos de migração (livro ⇄ seção) — independe da
    // textarea existir, então roda antes do early return abaixo.
    initListenersMigracao();

    if (!textarea) return;

    // Persiste a seleção enquanto o usuário interage com a toolbar
    const updateSelection = () => {
        lastSelection.start = textarea.selectionStart;
        lastSelection.end = textarea.selectionEnd;
    };

    textarea.addEventListener('select', updateSelection);
    textarea.addEventListener('mouseup', updateSelection);
    textarea.addEventListener('keyup', updateSelection);

    if (toolbar) {
        const restore = () => {
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(lastSelection.start, lastSelection.end);
            }, 0);
        };

        toolbar.addEventListener('pointerdown', (e) => {
            const tag = e.target.tagName;
            const type = e.target.type;
            const isEditableInput = tag === 'INPUT' && (type === 'text' || type === 'number');
            if (isEditableInput) return;
            e.preventDefault();
            restore();
        });

        [toolHex, document.getElementById('toolFont'), toolSize].forEach((input) => {
            if (!input) return;
            input.addEventListener('blur', () => restore());
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                    restore();
                }
            });
        });
    }

    // Previne perda de seleção ao clicar nos inputs de ferramenta
    ['toolColor', 'toolHex', 'toolFont', 'toolSize'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('mousedown', () => {
                const s = textarea.selectionStart;
                const e_sel = textarea.selectionEnd;
                setTimeout(() => textarea.setSelectionRange(s, e_sel), 10);
            });
        }
    });

    // Enter nos inputs de tags de Sinalizações (Poema) — um listener por
    // categoria de SINAL_CATEGORIAS, via funcoesSinal[chave]('poemas')
    // (mapa único, compartilhado com initEditorProsa abaixo desde a
    // unificação Poema/Prosa). Corrigido bug: faltava "DominioImagetico"
    // nesse mapa (a categoria existia em SINAL_CATEGORIAS e o listener
    // era ligado ao input dela, mas a entrada vinha undefined — Enter
    // nesse campo lançava TypeError em vez de adicionar a tag). Não pego
    // pelo teste estático de consistência porque esse mapa não é um dos
    // 4 lugares que ele cobre (ver sinalizacoes-consistencia.test.js).
    // Enter no input do grupo Temas e Assuntos (Poema).
    document.getElementById('p-tema-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarTemaTexto('poemas');
        }
    });
    // Enter nos inputs do grupo Região e Idioma (Poema).
    document.getElementById('p-idioma-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarIdiomaTexto('poemas');
        }
    });
    document.getElementById('p-territorialidade-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarTerritorialidadeTexto('poemas');
        }
    });
    document.getElementById('p-local-escrita-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            definirLocalEscritaTexto('poemas');
        }
    });
    SINAL_CATEGORIAS.forEach(({ chave }) => {
        const input = document.getElementById(`p-sinal-${slugDom(chave)}-input`);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    funcoesSinal[chave]('poemas');
                }
            });
        }
    });

    // Enter no input de pessoas
    const inputPessoa = document.getElementById('p-pessoa-input');
    if (inputPessoa) {
        inputPessoa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarPessoa('poemas');
            }
        });
    }

    // Enter nos inputs de texto/link/nota da Intertextualidade
    ['p-intertexto-texto', 'p-intertexto-link'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionarIntertexto('poemas');
                }
            });
        }
    });
    // Enter nos inputs de texto/link/nota de Referências — mesmo padrão
    // de Intertextualidade acima.
    ['p-refext-texto', 'p-refext-link'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionarReferenciaExterna('poemas');
                }
            });
        }
    });
    // Enter nos inputs de relação/hipotexto/link/nota da Hipertextualidade
    // — mesmo padrão de Intertextualidade/Referências acima.
    ['p-hipertexto-relacao', 'p-hipertexto-hipotexto', 'p-hipertexto-link'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionarHipertextualidade('poemas');
                }
            });
        }
    });
    // Sugestões de Texto mais focadas: refiltra pelo Tipo assim que ele
    // muda (digitado ou escolhido do datalist) — ver
    // atualizarDatalistTextoIntertexto acima.
    document
        .getElementById('p-intertexto-tipo')
        ?.addEventListener('input', () => atualizarDatalistIntertexto('poemas'));
    document
        .getElementById('p-refext-tipo')
        ?.addEventListener('input', () => atualizarDatalistReferenciaExterna('poemas'));
    // Mesmo refiltro acima, mas pro Hipotexto (Hipertextualidade) —
    // ver atualizarDatalistTextoHipertextualidade acima.
    document
        .getElementById('p-hipertexto-tipo')
        ?.addEventListener('input', () => atualizarDatalistHipertextualidade('poemas'));

    // Anexos usa textarea (texto longo) — Enter quebra linha na
    // descrição normalmente; Ctrl/Cmd+Enter é quem adiciona o item
    // (mesmo padrão do atalho de salvar o modal inteiro).
    const inputAnexo = document.getElementById('p-anexo-input');
    if (inputAnexo) {
        inputAnexo.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                adicionarAnexo('poemas');
            }
        });
    }
}

// Wiring de Enter dos campos de Prosa (Sinalizações, pessoas, gênero,
// Intertextualidade). Extraído de initEditor() — item 4 do plano de
// manutenibilidade: antes vivia dentro de initEditor(), então só era
// registrado quando o modal de Poema carregava pela primeira vez. Se o
// modal de Prosa fosse aberto primeiro numa sessão, esses listeners de
// Enter nunca eram ligados (só o botão "+" funcionava). Agora é chamado
// diretamente pelo init do modal-prosa em main.js, sem depender do
// modal-poema ter carregado antes.
export function initEditorProsa() {
    // Enter no input do grupo Temas e Assuntos (Prosa).
    document.getElementById('pr-tema-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarTemaTexto('prosas');
        }
    });
    // Enter nos inputs do grupo Região e Idioma (Prosa).
    document.getElementById('pr-idioma-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarIdiomaTexto('prosas');
        }
    });
    document.getElementById('pr-territorialidade-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarTerritorialidadeTexto('prosas');
        }
    });
    document.getElementById('pr-local-escrita-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            definirLocalEscritaTexto('prosas');
        }
    });
    // Enter nos inputs de tags de Sinalizações (Prosa) — mesmo padrão do
    // Poema em initEditor(), via funcoesSinal[chave]('prosas') (mesmo
    // mapa único; mesmo bug do "DominioImagetico" faltando, corrigido
    // também aqui).
    SINAL_CATEGORIAS.forEach(({ chave }) => {
        const input = document.getElementById(`pr-sinal-${slugDom(chave)}-input`);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    funcoesSinal[chave]('prosas');
                }
            });
        }
    });

    // Enter nos inputs de prosa (pessoas e gênero)
    const inputPessoaProsa = document.getElementById('pr-pessoa-input');
    if (inputPessoaProsa) {
        inputPessoaProsa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarPessoa('prosas');
            }
        });
    }
    const inputGeneroProsa = document.getElementById('pr-genero-input');
    if (inputGeneroProsa) {
        inputGeneroProsa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarGeneroProsa();
            }
        });
    }

    // Enter nos inputs de texto/link/nota da Intertextualidade (Prosa) —
    // mesmo padrão do Poema em initEditor().
    ['pr-intertexto-texto', 'pr-intertexto-link'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionarIntertexto('prosas');
                }
            });
        }
    });
    ['pr-refext-texto', 'pr-refext-link'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionarReferenciaExterna('prosas');
                }
            });
        }
    });
    // Enter nos inputs de relação/hipotexto/link/nota da Hipertextualidade
    // (Prosa) — mesmo padrão do Poema em initEditor().
    ['pr-hipertexto-relacao', 'pr-hipertexto-hipotexto', 'pr-hipertexto-link'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionarHipertextualidade('prosas');
                }
            });
        }
    });
    // Ver initEditor() — mesmo refiltro de sugestões de Texto pelo Tipo.
    document
        .getElementById('pr-intertexto-tipo')
        ?.addEventListener('input', () => atualizarDatalistIntertexto('prosas'));
    document
        .getElementById('pr-refext-tipo')
        ?.addEventListener('input', () => atualizarDatalistReferenciaExterna('prosas'));
    document
        .getElementById('pr-hipertexto-tipo')
        ?.addEventListener('input', () => atualizarDatalistHipertextualidade('prosas'));
}
