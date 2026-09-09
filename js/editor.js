// ============================================================
// editor.js — Toolbar de formatação, tags/sinalizações, UX
// Importado por: main.js (inicialização)
// ============================================================

import {
    db,
    obterOuCriarPessoaPorNome,
    obterOuCriarAutorPorNome,
    obterOuCriarGrupoPorNome,
} from './db.js';
import {
    extrairSinalizacoesUnicas,
    extrairGenerosUnicos,
    extrairValoresUnicosDeAnotacoes,
    extrairValoresUnicosDeIntertextualidade,
    extrairTiposIntertextoUnicos,
    extrairValoresUnicosDeReferenciasExternas,
    extrairTiposReferenciaExternaUnicos,
    extrairIdiomasUnicos,
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
    lerDataParcial,
    preencherDataParcial,
    formatarDataParcial,
} from './utils.js';

// ─── Estado local ─────────────────────────────────────────────

export let lastSelection = { start: 0, end: 0 };
let alignAtual = null;

// ─── Formatação inline ───────────────────────────────────────

export function wrapText(before, after) {
    const textarea = document.getElementById('p-texto');
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

export function applyStyle() {
    const colorInput =
        document.getElementById('toolHex')?.value || document.getElementById('toolColor')?.value;
    const fontInput = document.getElementById('toolFont')?.value.trim();
    const sizeInput = document.getElementById('toolSize')?.value.trim();

    const font = fontInput ? `'${fontInput}'` : 'inherit';
    const size = sizeInput ? `${sizeInput}pt` : 'inherit';
    let color = colorInput || 'inherit';
    if (color !== 'inherit' && !color.startsWith('#')) color = '#' + color;

    const alignStyle = alignAtual ? ` text-align: ${alignAtual};` : '';

    wrapText(
        `<div style="color: ${color}; font-family: ${font}; font-size: ${size};${alignStyle} display: inline;">`,
        `</div>`,
    );

    // reseta alinhamento após aplicar
    alignAtual = null;
    ['left', 'right'].forEach((a) => {
        document.getElementById(`toolAlign-${a}`)?.classList.remove('bg-blue-100');
    });
}

export function setAlign(valor) {
    alignAtual = alignAtual === valor ? null : valor;
    ['left', 'right'].forEach((a) => {
        document
            .getElementById(`toolAlign-${a}`)
            ?.classList.toggle('bg-blue-100', alignAtual === a);
    });
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
        cor: 'bg-emerald-600',
        corBotao: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
        rotulo: 'Tema',
        placeholder: 'Nova etiqueta de tema...',
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
    { prefixo, sufixoFuncao, sufixoDatalist, datalistInline },
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
                                    onclick="adicionarSinal${chave}${sufixoFuncao}()"
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
    return SINAL_CATEGORIAS.map((categoria) => criarBlocoSinalizacaoHTML(categoria, opcoes)).join(
        '\n',
    );
}

// Poema: o <datalist> de sugestão de cada categoria já existe
// globalmente em index.html (id="sugestoes-sinais-<slug>", sem
// sufixo) — o bloco só referencia via list="...", sem declarar o seu.
export function renderSinalizacoesPoema() {
    const container = document.getElementById('p-sinalizacoes-corpo');
    if (!container) return;
    container.innerHTML = criarBlocosSinalizacoesHTML({
        prefixo: 'p',
        sufixoFuncao: '',
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
        sufixoFuncao: 'Prosa',
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

    function remover(pessoaId) {
        itens = itens.filter((i) => i.pessoaId != pessoaId);
        if (dropdownAberto == pessoaId) dropdownAberto = null;
        renderizar();
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
    function renderPainelGrupos() {
        if (!infoGruposId) return;
        const painel = document.getElementById(infoGruposId);
        if (!painel) return;
        const pares = paresGrupoPessoa({ pessoas: itens }, db.pessoas, db.grupos);
        if (!pares.length) {
            painel.innerHTML = '';
            return;
        }
        const badges = agruparParesGrupoPessoa(pares)
            .map(
                ({ grupo, pessoas }) =>
                    `<span class="text-[9px] ${classesCorGrupo(grupo.cor)} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(grupo.nome)} <span class="opacity-70">(${pessoas.map((p) => escapeHtml(p.nome)).join(', ')})</span></span>`,
            )
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
function criarGrupoDeGruposDiretos({ tabela, inputId, containerId, nomeFuncaoRemover }) {
    let itens = []; // array de grupoId

    function grupoDe(grupoId) {
        return db.grupos.find((g) => g.id == grupoId);
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

        const existente = db.grupos.find((g) => g.nome === nome);
        if (existente) {
            adicionarPorId(existente.id);
            return;
        }

        abrirModalConfirmacao({
            titulo: `Criar grupo "${nome}"?`,
            rotulo: 'Grupo novo',
            mensagem: `"${nome}" ainda não está no cadastro de Grupos. Criar agora (cor padrão — dá pra trocar depois na aba Grupos)?`,
            textoConfirmar: 'Criar',
            corConfirmar: '#e11d48',
            onConfirmar: () => {
                const grupo = obterOuCriarGrupoPorNome(nome);
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

    return { adicionar, remover, renderizar, reset, carregar, obterItens };
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
}) {
    let itens = [];

    function nomeDe(autorId) {
        return db.autores.find((a) => a.id == autorId)?.nome || '(autor removido)';
    }

    function adicionarPorId(autorId) {
        if (!itens.some((i) => i.autorId == autorId)) {
            itens.push({ autorId, papel: AUTORIA_PAPEIS[0] });
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

    function renderizar() {
        const container = document.getElementById(containerId);
        if (!container) return;

        const opcoesPapel = (i) =>
            AUTORIA_PAPEIS.map(
                (p) =>
                    `<option value="${escapeHtml(p)}" ${i.papel === p ? 'selected' : ''}>${escapeHtml(p)}</option>`,
            ).join('');

        container.innerHTML = itens
            .map((i) => {
                const nome = nomeDe(i.autorId);
                return `
            <span class="relative ${corClasse} text-white text-[10px] pl-2 pr-1 py-1 rounded-full inline-flex items-center gap-1">
                ${escapeHtml(nome)}
                <select data-id="${escapeHtml(String(i.autorId))}"
                    onchange="${nomeFuncaoAlterarPapel}('${tabela}', this.dataset.id, this.value)"
                    class="text-[9px] bg-white/20 rounded px-1 py-0 border-0 text-white [&>option]:text-black">
                    ${opcoesPapel(i)}
                </select>
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
            if (a.autorId !== undefined)
                return { autorId: a.autorId, papel: a.papel || AUTORIA_PAPEIS[0] };
            return {
                autorId: obterOuCriarAutorPorNome(a.nome).id,
                papel: a.papel || AUTORIA_PAPEIS[0],
            };
        });
        renderizar();
    }

    function obterItens() {
        return itens;
    }

    return { adicionar, remover, alterarPapel, renderizar, reset, carregar, obterItens };
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
    nomeFuncaoRemover: 'removerGrupoDireto',
});
const grupoGruposDiretosProsa = criarGrupoDeGruposDiretos({
    tabela: 'prosas',
    inputId: 'pr-grupo-direto-input',
    containerId: 'pr-grupos-diretos-container',
    nomeFuncaoRemover: 'removerGrupoDireto',
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
});
const grupoAutoriaProsa = criarGrupoDeAutoria({
    tabela: 'prosas',
    inputId: 'pr-autor-input',
    containerId: 'pr-autoria-container',
    corClasse: 'bg-indigo-600',
    nomeFuncaoRemover: 'removerAutoria',
    nomeFuncaoAlterarPapel: 'alterarPapelAutoria',
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
    const badge = it.tipo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
        : '';
    const rotuloRemovido = tabela === 'prosas' ? '(texto removido)' : '(poema removido)';
    const titulo = item
        ? escapeHtml(item.titulo)
        : `<span class="italic text-gray-400 dark:text-slate-500">${rotuloRemovido}</span>`;
    const nota = it.texto ? ` — ${escapeHtml(it.texto)}` : '';
    return `${badge}${titulo}${nota}`;
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
    listaEcos(tabela).salvar({
        id,
        tipo: tipoEl?.value || '',
        texto: (textoEl?.value || '').trim(),
    });
    if (poemaEl) poemaEl.value = '';
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
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
    atualizarBotaoEco(tabela);
}
export function cancelarEdicaoEco(tabela) {
    listaEcos(tabela).cancelarEdicao();
    const p = prefixoDom(tabela);
    const poemaEl = document.getElementById(`${p}-eco-poema`);
    const tipoEl = document.getElementById(`${p}-eco-tipo`);
    const textoEl = document.getElementById(`${p}-eco-texto`);
    if (poemaEl) poemaEl.value = '';
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoEco(tabela);
}
export function removerEco(tabela, indice) {
    listaEcos(tabela).remover(indice);
    atualizarBotaoEco(tabela);
}
export function obterEcos(tabela) {
    return listaEcos(tabela).obterItens();
}
export function carregarEcos(tabela, lista) {
    listaEcos(tabela).carregar(lista);
    atualizarBotaoEco(tabela);
}
export function resetEcos(tabela) {
    listaEcos(tabela).reset();
    atualizarBotaoEco(tabela);
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

// ─── Anotações Marginais (lista de trecho+posição+fonte+texto) ─
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
        return `${trecho}${metaHtml}${escapeHtml(it.texto || '')}`;
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

    const trecho = (trechoEl?.value || '').trim();
    const posicao = (posicaoEl?.value || '').trim();
    const fonte = (fonteEl?.value || '').trim();
    const texto = (textoEl?.value || '').trim();
    if (!trecho && !posicao && !fonte && !texto) return;

    listaAnotacoesPoema.salvar({ trecho, posicao, fonte, texto });
    if (trechoEl) trechoEl.value = '';
    if (posicaoEl) posicaoEl.value = '';
    if (fonteEl) fonteEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnotacao();
    atualizarDatalistAnotacoes();
}
export function editarAnotacao(indice) {
    const item = listaAnotacoesPoema.iniciarEdicao(indice);
    const trechoEl = document.getElementById('p-anotacao-trecho');
    const posicaoEl = document.getElementById('p-anotacao-posicao');
    const fonteEl = document.getElementById('p-anotacao-fonte');
    const textoEl = document.getElementById('p-anotacao-texto');
    if (trechoEl) trechoEl.value = item.trecho || '';
    if (posicaoEl) posicaoEl.value = item.posicao || '';
    if (fonteEl) fonteEl.value = item.fonte || '';
    if (textoEl) textoEl.value = item.texto || '';
    trechoEl?.focus();
    atualizarBotaoAnotacao();
}
export function cancelarEdicaoAnotacao() {
    listaAnotacoesPoema.cancelarEdicao();
    const trechoEl = document.getElementById('p-anotacao-trecho');
    const posicaoEl = document.getElementById('p-anotacao-posicao');
    const fonteEl = document.getElementById('p-anotacao-fonte');
    const textoEl = document.getElementById('p-anotacao-texto');
    if (trechoEl) trechoEl.value = '';
    if (posicaoEl) posicaoEl.value = '';
    if (fonteEl) fonteEl.value = '';
    if (textoEl) textoEl.value = '';
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
        const valores = extrairSinalizacoesUnicas(todos, campo);
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
    // 8 categorias combinadas (ver correspondeFiltro em exportar.js) —
    // por isso a sugestão também precisa vir combinada, não só de Estilo.
    const datalistCombinada = document.getElementById('sugestoes-sinais');
    if (datalistCombinada) {
        datalistCombinada.innerHTML = [...combinadas]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
    atualizarDatalistPessoas();
    atualizarDatalistGrupos();
    atualizarDatalistAutores();
    atualizarDatalistMigracao();
    atualizarDatalistAnotacoes();
    atualizarDatalistIntertexto('poemas');
    atualizarDatalistReferenciaExterna('poemas');
    atualizarDatalistEpoca();
    atualizarDatalistIdioma();
    atualizarDatalistEnvios();
    atualizarDatalistReconhecimentos();
}

// Item 3 do plano de schema: Época deixou de ser texto livre varrido de
// db.poemas e passou a ser cadastro central (db.epocas) — a sugestão do
// datalist agora vem de lá (nomes já cadastrados), não mais dos nomes
// já digitados em poemas. Item 4: mesmo cadastro central vale pra
// Prosa — um datalist por modal (mesmo padrão de sugestoes-pessoas/
// sugestoes-pessoas-prosa), preenchidos com a mesma lista.
export function atualizarDatalistEpoca() {
    const nomes = [...db.epocas].map((e) => e.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    ['sugestoes-epoca-nome', 'sugestoes-epoca-nome-prosa'].forEach((id) => {
        const datalist = document.getElementById(id);
        if (datalist) {
            datalist.innerHTML = nomes.map((v) => `<option value="${escapeHtml(v)}">`).join('');
        }
    });
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
    ['sugestoes-idioma', 'sugestoes-idioma-prosa'].forEach((id) => {
        const datalist = document.getElementById(id);
        if (datalist) {
            datalist.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}">`).join('');
        }
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
        grupoSinal(chave, tabela).carregar(item[`sinalizacoes${chave}`] || '');
    });
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

export function atualizarDatalistGrupos() {
    const nomes = db.grupos.map((g) => g.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    ['sugestoes-grupos', 'sugestoes-grupos-prosa'].forEach((id) => {
        const datalist = document.getElementById(id);
        if (datalist) {
            datalist.innerHTML = nomes
                .map((nome) => `<option value="${escapeHtml(nome)}">`)
                .join('');
        }
    });
}

export function adicionarGrupoDireto(tabela, valor = null) {
    grupoGruposDiretos(tabela).adicionar(valor);
}
export function removerGrupoDireto(tabela, grupoId) {
    grupoGruposDiretos(tabela).remover(grupoId);
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

export function initEditor() {
    // Preenche o corpo de Sinalizações do Poema (ver
    // renderSinalizacoesPoema acima) antes de qualquer wiring abaixo que
    // dependa dos inputs/containers de cada categoria já existirem no
    // DOM.
    renderSinalizacoesPoema();

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
    ['p-intertexto-texto', 'p-intertexto-link', 'p-intertexto-nota'].forEach((id) => {
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
    ['p-refext-texto', 'p-refext-link', 'p-refext-nota'].forEach((id) => {
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
    // Sugestões de Texto mais focadas: refiltra pelo Tipo assim que ele
    // muda (digitado ou escolhido do datalist) — ver
    // atualizarDatalistTextoIntertexto acima.
    document
        .getElementById('p-intertexto-tipo')
        ?.addEventListener('input', () => atualizarDatalistIntertexto('poemas'));
    document
        .getElementById('p-refext-tipo')
        ?.addEventListener('input', () => atualizarDatalistReferenciaExterna('poemas'));

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
    ['pr-intertexto-texto', 'pr-intertexto-link', 'pr-intertexto-nota'].forEach((id) => {
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
    ['pr-refext-texto', 'pr-refext-link', 'pr-refext-nota'].forEach((id) => {
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
    // Ver initEditor() — mesmo refiltro de sugestões de Texto pelo Tipo.
    document
        .getElementById('pr-intertexto-tipo')
        ?.addEventListener('input', () => atualizarDatalistIntertexto('prosas'));
    document
        .getElementById('pr-refext-tipo')
        ?.addEventListener('input', () => atualizarDatalistReferenciaExterna('prosas'));
}
