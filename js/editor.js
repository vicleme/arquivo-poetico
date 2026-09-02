// ============================================================
// editor.js — Toolbar de formatação, tags/sinalizações, UX
// Importado por: main.js (inicialização)
// ============================================================

import { db, obterOuCriarPessoaPorNome, obterOuCriarAutorPorNome } from './db.js';
import {
    extrairSinalizacoesUnicas,
    extrairGenerosUnicos,
    extrairValoresUnicosDeAnotacoes,
    extrairValoresUnicosDeIntertextualidade,
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
// comportamento (adicionar, remover, renderizar como chips, resetar,
// carregar a partir de uma string "a, b, c") variando só os IDs do
// DOM e a cor do badge. Em vez de 4 cópias, uma única implementação
// parametrizada; cada grupo guarda seu próprio array em closure —
// sem estado global compartilhado entre Poema e Prosa.
function criarGrupoDeTags({ inputId, containerId, hiddenInputId, corClasse, nomeFuncaoRemover }) {
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

    function renderizar() {
        const container = document.getElementById(containerId);
        const inputOculto = document.getElementById(hiddenInputId);
        if (!container) return;

        container.innerHTML = itens
            .map(
                (i) => `
            <span class="${corClasse} text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                ${escapeHtml(i)}
                <button type="button" data-valor="${escapeHtml(i)}" onclick="${nomeFuncaoRemover}(this.dataset.valor)" class="hover:text-red-200 font-bold ml-1">×</button>
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

    return { adicionar, remover, renderizar, reset, carregar };
}

// Sinalizações viraram 5 grupos (Estilo/Tema/Relação/Sensibilidade/Tom)
// em vez de 1 — mesma engine de sempre (criarGrupoDeTags), só que
// instanciada 5x por Poema e 5x por Prosa. SINAL_CATEGORIAS é a lista
// única de configuração; os módulos e os exports nomeados abaixo (que
// window.* em main.js precisa, um por função, por causa do onclick="..."
// embutido no HTML renderizado) são gerados a partir dela pra não
// repetir os IDs de DOM em dois lugares.
const SINAL_CATEGORIAS = [
    { chave: 'Estilo', cor: 'bg-blue-600' },
    { chave: 'Tema', cor: 'bg-emerald-600' },
    { chave: 'Relacao', cor: 'bg-purple-600' },
    { chave: 'Sensibilidade', cor: 'bg-amber-600' },
    { chave: 'Tom', cor: 'bg-pink-600' },
    // Balde temporário pra tags migradas que ainda não têm categoria de
    // verdade (hoje: "Premiados", "Tradução", "Variações" — que devem
    // virar Reconhecimentos e Elos tipados de Derivação numa etapa
    // futura, ver Análise de estrutura e metadados poéticos). Fica
    // visível no modal em vez de escondido no JSON pra não se perder de
    // vista até esses campos existirem.
    { chave: 'Outros', cor: 'bg-gray-500' },
];

function criarModuloDeTags(config) {
    const grupo = criarGrupoDeTags(config);
    return {
        adicionar: (valor = null) => grupo.adicionar(valor),
        remover: (v) => grupo.remover(v),
        renderizar: () => grupo.renderizar(),
        reset: () => grupo.reset(),
        carregar: (str) => grupo.carregar(str),
    };
}

// slugDom: "Estilo" -> "estilo" (pro id de DOM, ex.: p-sinal-estilo-input)
const slugDom = (chave) => chave.charAt(0).toLowerCase() + chave.slice(1);

const modulosSinalPoema = {};
const modulosSinalProsa = {};
SINAL_CATEGORIAS.forEach(({ chave, cor }) => {
    const slug = slugDom(chave);
    modulosSinalPoema[chave] = criarModuloDeTags({
        inputId: `p-sinal-${slug}-input`,
        containerId: `p-sinal-${slug}-container`,
        hiddenInputId: `p-sinal-${slug}`,
        corClasse: cor,
        nomeFuncaoRemover: `removerSinal${chave}`,
    });
    modulosSinalProsa[chave] = criarModuloDeTags({
        inputId: `pr-sinal-${slug}-input`,
        containerId: `pr-sinal-${slug}-container`,
        hiddenInputId: `pr-sinal-${slug}`,
        corClasse: cor,
        nomeFuncaoRemover: `removerSinal${chave}Prosa`,
    });
});

const grupoGeneroProsa = criarGrupoDeTags({
    inputId: 'pr-genero-input',
    containerId: 'pr-genero-container',
    hiddenInputId: 'pr-genero',
    corClasse: 'bg-amber-600',
    nomeFuncaoRemover: 'removerGeneroProsa',
});

// ─── Fábrica de grupo de Pessoas (chip + papel) ────────────────
// Variante de criarGrupoDeTags: guarda um array de objeto
// { pessoaId, papeis } em vez de string simples — pessoaId referencia
// o cadastro central db.pessoas (ver migrarPessoasParaCadastro em
// db.js), papeis é o vínculo específico daquele texto com a pessoa
// (Retratado(a)/Inspirado(a) por/Dedicatário(a)/Mencionado(a)/Aludido(a) — ver
// PAPEIS_PESSOA em utils.js). Sem hiddenInputId: diferente dos grupos
// de tags, que gravam a string combinada num input escondido (lido por
// `.value` em forms.js), este expõe `obterItens()` — forms.js lê o
// array direto na hora do submit, mesmo padrão de Intertextualidade/
// Anexos (`obterIntertextualidade`/`obterAnexos`, ver criarListaDeEntradas
// acima), que também guardam objeto em vez de string simples.
function criarGrupoDePessoas({
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
        const badges = pares
            .map(
                ({ grupo, pessoa }) =>
                    `<span class="text-[9px] ${classesCorGrupo(grupo.cor)} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(grupo.nome)} <span class="opacity-70">(${escapeHtml(pessoa.nome)})</span></span>`,
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
                        onchange="${nomeFuncaoAlternarPapel}(${JSON.stringify(i.pessoaId)}, '${escapeHtml(p).replace(/'/g, "\\'")}', this.checked)"
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
                <button type="button" data-id="${escapeHtml(String(i.pessoaId))}" onclick="${nomeFuncaoAlternarDropdown}(this.dataset.id)"
                    class="text-[9px] bg-white/20 rounded px-1 py-0 hover:bg-white/30">
                    ${rotuloPapeis}
                </button>
                <button type="button" data-id="${escapeHtml(String(i.pessoaId))}" onclick="${nomeFuncaoRemover}(this.dataset.id)" class="hover:text-red-200 font-bold ml-1">×</button>
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
                    onchange="${nomeFuncaoAlterarPapel}(this.dataset.id, this.value)"
                    class="text-[9px] bg-white/20 rounded px-1 py-0 border-0 text-white [&>option]:text-black">
                    ${opcoesPapel(i)}
                </select>
                <button type="button" data-id="${escapeHtml(String(i.autorId))}" onclick="${nomeFuncaoRemover}(this.dataset.id)" class="hover:text-red-200 font-bold ml-1">×</button>
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
    inputId: 'p-pessoa-input',
    containerId: 'p-pessoas-container',
    corClasse: 'bg-rose-500',
    nomeFuncaoRemover: 'removerPessoa',
    nomeFuncaoAlternarPapel: 'alternarPapelPessoa',
    nomeFuncaoAlternarDropdown: 'alternarDropdownPapelPessoa',
    infoGruposId: 'p-pessoas-grupos-info',
});
const grupoPessoasProsa = criarGrupoDePessoas({
    inputId: 'pr-pessoa-input',
    containerId: 'pr-pessoas-container',
    corClasse: 'bg-rose-500',
    nomeFuncaoRemover: 'removerPessoaProsa',
    nomeFuncaoAlternarPapel: 'alternarPapelPessoaProsa',
    nomeFuncaoAlternarDropdown: 'alternarDropdownPapelPessoaProsa',
    infoGruposId: 'pr-pessoas-grupos-info',
});

const grupoAutoriaPoema = criarGrupoDeAutoria({
    inputId: 'p-autor-input',
    containerId: 'p-autoria-container',
    corClasse: 'bg-indigo-600',
    nomeFuncaoRemover: 'removerAutoria',
    nomeFuncaoAlterarPapel: 'alterarPapelAutoria',
});
const grupoAutoriaProsa = criarGrupoDeAutoria({
    inputId: 'pr-autor-input',
    containerId: 'pr-autoria-container',
    corClasse: 'bg-indigo-600',
    nomeFuncaoRemover: 'removerAutoriaProsa',
    nomeFuncaoAlterarPapel: 'alterarPapelAutoriaProsa',
});

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
function criarListaDeEntradas({ containerId, renderItem, nomeFuncaoRemover, nomeFuncaoEditar }) {
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
                    <button type="button" onclick="${nomeFuncaoEditar}(${i})"
                        class="text-blue-400 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 px-1" title="Editar">✎</button>
                    <button type="button" onclick="${nomeFuncaoRemover}(${i})"
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

const listaIntertextoPoema = criarListaDeEntradas({
    containerId: 'p-intertexto-lista',
    renderItem: (it) =>
        `${
            it.tipo
                ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
                : ''
        }${escapeHtml(it.texto || '')}`,
    nomeFuncaoRemover: 'removerIntertexto',
    nomeFuncaoEditar: 'editarIntertexto',
});

function atualizarBotaoIntertexto() {
    const btnAdd = document.getElementById('p-intertexto-btn-add');
    const btnCancelar = document.getElementById('p-intertexto-btn-cancelar');
    const emEdicao = listaIntertextoPoema.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function atualizarDatalistIntertexto() {
    const datalist = document.getElementById('sugestoes-intertexto');
    if (datalist) {
        datalist.innerHTML = extrairValoresUnicosDeIntertextualidade(db.poemas)
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
}

export function adicionarIntertexto() {
    const tipoEl = document.getElementById('p-intertexto-tipo');
    const textoEl = document.getElementById('p-intertexto-texto');
    const tipo = tipoEl?.value || '';
    const texto = (textoEl?.value || '').trim();
    if (!tipo && !texto) return;
    listaIntertextoPoema.salvar({ tipo, texto });
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoIntertexto();
    atualizarDatalistIntertexto();
}
export function editarIntertexto(indice) {
    const item = listaIntertextoPoema.iniciarEdicao(indice);
    const tipoEl = document.getElementById('p-intertexto-tipo');
    const textoEl = document.getElementById('p-intertexto-texto');
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (textoEl) textoEl.value = item.texto || '';
    textoEl?.focus();
    atualizarBotaoIntertexto();
}
export function cancelarEdicaoIntertexto() {
    listaIntertextoPoema.cancelarEdicao();
    const tipoEl = document.getElementById('p-intertexto-tipo');
    const textoEl = document.getElementById('p-intertexto-texto');
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoIntertexto();
}
export function removerIntertexto(indice) {
    listaIntertextoPoema.remover(indice);
    atualizarBotaoIntertexto();
}
export function obterIntertextualidade() {
    return listaIntertextoPoema.obterItens();
}
export function carregarIntertextualidade(lista) {
    listaIntertextoPoema.carregar(lista);
    atualizarBotaoIntertexto();
}
export function resetIntertextualidade() {
    listaIntertextoPoema.reset();
    atualizarBotaoIntertexto();
}

// ─── Anexos (lista de tipo+texto+link) ─────────────────────────
// Um texto pode ter um ou vários anexos associados (ilustração,
// foto, lettering, declamação/comentários em vídeo...), cada um com
// tipo + descrição (textarea, texto longo — ver modal-poema.html e
// o atalho Ctrl/Cmd+Enter em initEditor()) + link opcional. Para os
// tipos de vídeo o link é obrigatório, já que a descrição sozinha
// não dá acesso ao conteúdo.
const TIPOS_ANEXO_COM_LINK_OBRIGATORIO = ['Declamação em vídeo', 'Comentários em vídeo'];

const listaAnexosPoema = criarListaDeEntradas({
    containerId: 'p-anexos-lista',
    renderItem: (it) => {
        const badge = it.tipo
            ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
            : '';
        const link = it.link
            ? ` <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline text-[11px]">${escapeHtml(it.link)}</a>`
            : '';
        return `${badge}${escapeHtml(it.texto || '')}${link}`;
    },
    nomeFuncaoRemover: 'removerAnexo',
    nomeFuncaoEditar: 'editarAnexo',
});

function atualizarBotaoAnexo() {
    const btnAdd = document.getElementById('p-anexo-btn-add');
    const btnCancelar = document.getElementById('p-anexo-btn-cancelar');
    const emEdicao = listaAnexosPoema.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓ Salvar edição' : '+ Adicionar anexo';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function adicionarAnexo(valor = null) {
    const tipoEl = document.getElementById('p-anexo-tipo');
    const linkEl = document.getElementById('p-anexo-link');
    const textoEl = document.getElementById('p-anexo-input');

    const tipo = tipoEl?.value || '';
    const link = (linkEl?.value || '').trim();
    const texto = (valor ?? textoEl?.value ?? '').trim();

    if (!tipo && !texto && !link) return;

    if (TIPOS_ANEXO_COM_LINK_OBRIGATORIO.includes(tipo) && !link) {
        mostrarAviso(`Anexos do tipo "${tipo}" precisam de um link.`);
        return;
    }

    listaAnexosPoema.salvar({ tipo, texto, link });
    if (tipoEl) tipoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnexo();
}
export function editarAnexo(indice) {
    const item = listaAnexosPoema.iniciarEdicao(indice);
    const tipoEl = document.getElementById('p-anexo-tipo');
    const linkEl = document.getElementById('p-anexo-link');
    const textoEl = document.getElementById('p-anexo-input');
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (linkEl) linkEl.value = item.link || '';
    if (textoEl) textoEl.value = item.texto || '';
    textoEl?.focus();
    atualizarBotaoAnexo();
}
export function cancelarEdicaoAnexo() {
    listaAnexosPoema.cancelarEdicao();
    const tipoEl = document.getElementById('p-anexo-tipo');
    const linkEl = document.getElementById('p-anexo-link');
    const textoEl = document.getElementById('p-anexo-input');
    if (tipoEl) tipoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnexo();
}
export function removerAnexo(indice) {
    listaAnexosPoema.remover(indice);
    atualizarBotaoAnexo();
}
export function obterAnexos() {
    return listaAnexosPoema.obterItens();
}
export function carregarAnexos(lista) {
    // Compatível com o formato antigo (array de strings, só descrição).
    const normalizada = Array.isArray(lista)
        ? lista.map((it) => (typeof it === 'string' ? { tipo: '', texto: it, link: '' } : it))
        : [];
    listaAnexosPoema.carregar(normalizada);
    atualizarBotaoAnexo();
}
export function resetAnexos() {
    listaAnexosPoema.reset();
    atualizarBotaoAnexo();
}

// ─── Elos / Referências (lista de poema-alvo+tipo+texto) ───────
// Item 1 do plano de schema: cada elo/referência aponta pra outro poema
// (`id`) mais uma nota livre opcional. Elos = ligação estrutural/de
// derivação, sempre BILATERAL (Reescrita, Tradução, Resposta...);
// Referências = ligação mais solta, sempre UNIDIRECIONAL (Personagem em
// comum, Imagem central compartilhada, Aceno a...), ainda com um `tipo`
// de lista fechada simples (TIPOS_REFERENCIA em utils.js).
//
// Elos usa um schema diferente de Referências desde o redesenho
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
// Dois motores separados (não um só reaproveitado) porque cada lista
// tem seu próprio container e campos no modal.

function renderItemEloBilateral(it) {
    const poema = db.poemas.find((p) => p.id == it.id);
    const rotulo = it.relacao ? rotuloElo(it.relacao, it.direcao) : '';
    const badge = rotulo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(rotulo)}</span>`
        : '';
    const titulo = poema
        ? escapeHtml(poema.titulo)
        : `<span class="italic text-gray-400 dark:text-slate-500">(poema removido)</span>`;
    const nota = it.texto ? ` — ${escapeHtml(it.texto)}` : '';
    return `${badge}${titulo}${nota}`;
}

function renderItemReferencia(it) {
    const poema = db.poemas.find((p) => p.id == it.id);
    const badge = it.tipo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
        : '';
    const titulo = poema
        ? escapeHtml(poema.titulo)
        : `<span class="italic text-gray-400 dark:text-slate-500">(poema removido)</span>`;
    const nota = it.texto ? ` — ${escapeHtml(it.texto)}` : '';
    return `${badge}${titulo}${nota}`;
}

const listaElosPoema = criarListaDeEntradas({
    containerId: 'p-elos-lista',
    renderItem: renderItemEloBilateral,
    nomeFuncaoRemover: 'removerElo',
    nomeFuncaoEditar: 'editarElo',
});

const listaReferenciasPoema = criarListaDeEntradas({
    containerId: 'p-refs-lista',
    renderItem: renderItemReferencia,
    nomeFuncaoRemover: 'removerReferencia',
    nomeFuncaoEditar: 'editarReferencia',
});

function atualizarBotaoElo() {
    const btnAdd = document.getElementById('p-elo-btn-add');
    const btnCancelar = document.getElementById('p-elo-btn-cancelar');
    const emEdicao = listaElosPoema.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

function atualizarBotaoReferencia() {
    const btnAdd = document.getElementById('p-ref-btn-add');
    const btnCancelar = document.getElementById('p-ref-btn-cancelar');
    const emEdicao = listaReferenciasPoema.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

// Atualiza o texto dos dois botões de direção pra o rótulo de verdade
// da Relação escolhida (ex.: Relação "Reescrita" → botões viram
// "Reescrito em" / "Reescrita de") — sem relação escolhida ainda,
// caem pro rótulo genérico Origem/Destino. Não mexe em qual botão está
// marcado como ativo; ver marcarDirecaoElo pra isso.
export function atualizarRotulosDirecaoElo() {
    const relacao = document.getElementById('p-elo-relacao')?.value || '';
    const btnOrigem = document.getElementById('p-elo-direcao-origem');
    const btnDestino = document.getElementById('p-elo-direcao-destino');
    if (btnOrigem) btnOrigem.textContent = relacao ? rotuloElo(relacao, 'origem') : 'Origem';
    if (btnDestino) btnDestino.textContent = relacao ? rotuloElo(relacao, 'destino') : 'Destino';
}

// Chamado pelo onchange do select de Relação: atualiza os rótulos dos
// botões E limpa a direção já marcada (uma direção escolhida pra
// Relação anterior não necessariamente faz sentido pra nova).
export function onRelacaoEloAlterada() {
    atualizarRotulosDirecaoElo();
    marcarDirecaoElo('');
}

// Marca visualmente qual botão de direção está ativo e grava o valor
// no input escondido `p-elo-direcao`, que é o que adicionarElo/editarElo
// de fato leem/gravam.
function marcarDirecaoElo(direcao) {
    const hidden = document.getElementById('p-elo-direcao');
    if (hidden) hidden.value = direcao;
    const ativa =
        'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300';
    const inativa =
        'bg-transparent border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400';
    const btnOrigem = document.getElementById('p-elo-direcao-origem');
    const btnDestino = document.getElementById('p-elo-direcao-destino');
    if (btnOrigem)
        btnOrigem.className = `elo-direcao-btn text-xs flex-1 px-2 py-1 rounded border ${direcao === 'origem' ? ativa : inativa}`;
    if (btnDestino)
        btnDestino.className = `elo-direcao-btn text-xs flex-1 px-2 py-1 rounded border ${direcao === 'destino' ? ativa : inativa}`;
}

export function selecionarDirecaoElo(direcao) {
    marcarDirecaoElo(direcao);
}

export function adicionarElo() {
    const poemaEl = document.getElementById('p-elo-poema');
    const relacaoEl = document.getElementById('p-elo-relacao');
    const direcaoEl = document.getElementById('p-elo-direcao');
    const textoEl = document.getElementById('p-elo-texto');
    const id = poemaEl?.value ? parseInt(poemaEl.value, 10) : null;
    if (!id) return;
    listaElosPoema.salvar({
        id,
        relacao: relacaoEl?.value || '',
        direcao: direcaoEl?.value || '',
        texto: (textoEl?.value || '').trim(),
    });
    if (poemaEl) poemaEl.value = '';
    if (relacaoEl) relacaoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarRotulosDirecaoElo();
    marcarDirecaoElo('');
    atualizarBotaoElo();
}
export function editarElo(indice) {
    const item = listaElosPoema.iniciarEdicao(indice);
    const poemaEl = document.getElementById('p-elo-poema');
    const relacaoEl = document.getElementById('p-elo-relacao');
    const textoEl = document.getElementById('p-elo-texto');
    if (poemaEl) poemaEl.value = item.id ?? '';
    if (relacaoEl) relacaoEl.value = item.relacao || '';
    if (textoEl) textoEl.value = item.texto || '';
    atualizarRotulosDirecaoElo();
    marcarDirecaoElo(item.direcao || '');
    atualizarBotaoElo();
}
export function cancelarEdicaoElo() {
    listaElosPoema.cancelarEdicao();
    const poemaEl = document.getElementById('p-elo-poema');
    const relacaoEl = document.getElementById('p-elo-relacao');
    const textoEl = document.getElementById('p-elo-texto');
    if (poemaEl) poemaEl.value = '';
    if (relacaoEl) relacaoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarRotulosDirecaoElo();
    marcarDirecaoElo('');
    atualizarBotaoElo();
}
export function removerElo(indice) {
    listaElosPoema.remover(indice);
    atualizarBotaoElo();
}
export function obterElos() {
    return listaElosPoema.obterItens();
}
export function carregarElos(lista) {
    listaElosPoema.carregar(lista);
    atualizarBotaoElo();
}
export function resetElos() {
    listaElosPoema.reset();
    const relacaoEl = document.getElementById('p-elo-relacao');
    if (relacaoEl) relacaoEl.value = '';
    atualizarRotulosDirecaoElo();
    marcarDirecaoElo('');
    atualizarBotaoElo();
}

export function adicionarReferencia() {
    const poemaEl = document.getElementById('p-ref-poema');
    const tipoEl = document.getElementById('p-ref-tipo');
    const textoEl = document.getElementById('p-ref-texto');
    const id = poemaEl?.value ? parseInt(poemaEl.value, 10) : null;
    if (!id) return;
    listaReferenciasPoema.salvar({
        id,
        tipo: tipoEl?.value || '',
        texto: (textoEl?.value || '').trim(),
    });
    if (poemaEl) poemaEl.value = '';
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoReferencia();
}
export function editarReferencia(indice) {
    const item = listaReferenciasPoema.iniciarEdicao(indice);
    const poemaEl = document.getElementById('p-ref-poema');
    const tipoEl = document.getElementById('p-ref-tipo');
    const textoEl = document.getElementById('p-ref-texto');
    if (poemaEl) poemaEl.value = item.id ?? '';
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (textoEl) textoEl.value = item.texto || '';
    atualizarBotaoReferencia();
}
export function cancelarEdicaoReferencia() {
    listaReferenciasPoema.cancelarEdicao();
    const poemaEl = document.getElementById('p-ref-poema');
    const tipoEl = document.getElementById('p-ref-tipo');
    const textoEl = document.getElementById('p-ref-texto');
    if (poemaEl) poemaEl.value = '';
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoReferencia();
}
export function removerReferencia(indice) {
    listaReferenciasPoema.remover(indice);
    atualizarBotaoReferencia();
}
export function obterReferencias() {
    return listaReferenciasPoema.obterItens();
}
export function carregarReferencias(lista) {
    listaReferenciasPoema.carregar(lista);
    atualizarBotaoReferencia();
}
export function resetReferencias() {
    listaReferenciasPoema.reset();
    atualizarBotaoReferencia();
}

// ─── Painel de Elos derivados (refinamento do item 1) ───────────
// Só pra Elos (bilaterais) — Referências são unidirecionais por
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

// ─── Elos / Referências / Intertextualidade / Anexos (Prosa) ───
// Item 4 do plano de schema: mesmo motor de cada campo do Poema acima,
// espelhado pra Prosa (ids `p-`→`pr-`, funções com sufixo `Prosa`).
// Diferença deliberada: o alvo de Elos/Referências de Prosa pode ser um
// Poema OU outra Prosa (ver renderDropdowns em ui.js — optgroup
// Poemas+Prosas no `<select>` pr-elo-poema/pr-ref-poema), enquanto o
// Modal de Poema por ora só oferece outros Poemas como alvo — por isso
// resolverItemVinculado abaixo busca nos dois arrays, diferente de
// renderItemEloBilateral/renderItemReferencia (Poema) que buscam só em
// db.poemas.
function resolverItemVinculado(id) {
    return db.poemas.find((p) => p.id == id) || (db.prosas || []).find((pr) => pr.id == id);
}

function renderItemEloBilateralProsa(it) {
    const item = resolverItemVinculado(it.id);
    const rotulo = it.relacao ? rotuloElo(it.relacao, it.direcao) : '';
    const badge = rotulo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(rotulo)}</span>`
        : '';
    const titulo = item
        ? escapeHtml(item.titulo)
        : `<span class="italic text-gray-400 dark:text-slate-500">(texto removido)</span>`;
    const nota = it.texto ? ` — ${escapeHtml(it.texto)}` : '';
    return `${badge}${titulo}${nota}`;
}

function renderItemReferenciaProsa(it) {
    const item = resolverItemVinculado(it.id);
    const badge = it.tipo
        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
        : '';
    const titulo = item
        ? escapeHtml(item.titulo)
        : `<span class="italic text-gray-400 dark:text-slate-500">(texto removido)</span>`;
    const nota = it.texto ? ` — ${escapeHtml(it.texto)}` : '';
    return `${badge}${titulo}${nota}`;
}

const listaElosProsa = criarListaDeEntradas({
    containerId: 'pr-elos-lista',
    renderItem: renderItemEloBilateralProsa,
    nomeFuncaoRemover: 'removerEloProsa',
    nomeFuncaoEditar: 'editarEloProsa',
});

const listaReferenciasProsa = criarListaDeEntradas({
    containerId: 'pr-refs-lista',
    renderItem: renderItemReferenciaProsa,
    nomeFuncaoRemover: 'removerReferenciaProsa',
    nomeFuncaoEditar: 'editarReferenciaProsa',
});

function atualizarBotaoEloProsa() {
    const btnAdd = document.getElementById('pr-elo-btn-add');
    const btnCancelar = document.getElementById('pr-elo-btn-cancelar');
    const emEdicao = listaElosProsa.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

function atualizarBotaoReferenciaProsa() {
    const btnAdd = document.getElementById('pr-ref-btn-add');
    const btnCancelar = document.getElementById('pr-ref-btn-cancelar');
    const emEdicao = listaReferenciasProsa.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function atualizarRotulosDirecaoEloProsa() {
    const relacao = document.getElementById('pr-elo-relacao')?.value || '';
    const btnOrigem = document.getElementById('pr-elo-direcao-origem');
    const btnDestino = document.getElementById('pr-elo-direcao-destino');
    if (btnOrigem) btnOrigem.textContent = relacao ? rotuloElo(relacao, 'origem') : 'Origem';
    if (btnDestino) btnDestino.textContent = relacao ? rotuloElo(relacao, 'destino') : 'Destino';
}

export function onRelacaoEloAlteradaProsa() {
    atualizarRotulosDirecaoEloProsa();
    marcarDirecaoEloProsa('');
}

function marcarDirecaoEloProsa(direcao) {
    const hidden = document.getElementById('pr-elo-direcao');
    if (hidden) hidden.value = direcao;
    const ativa =
        'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300';
    const inativa =
        'bg-transparent border-slate-200 dark:border-slate-700 text-gray-500 dark:text-slate-400';
    const btnOrigem = document.getElementById('pr-elo-direcao-origem');
    const btnDestino = document.getElementById('pr-elo-direcao-destino');
    if (btnOrigem)
        btnOrigem.className = `elo-direcao-btn text-xs flex-1 px-2 py-1 rounded border ${direcao === 'origem' ? ativa : inativa}`;
    if (btnDestino)
        btnDestino.className = `elo-direcao-btn text-xs flex-1 px-2 py-1 rounded border ${direcao === 'destino' ? ativa : inativa}`;
}

export function selecionarDirecaoEloProsa(direcao) {
    marcarDirecaoEloProsa(direcao);
}

export function adicionarEloProsa() {
    const alvoEl = document.getElementById('pr-elo-poema');
    const relacaoEl = document.getElementById('pr-elo-relacao');
    const direcaoEl = document.getElementById('pr-elo-direcao');
    const textoEl = document.getElementById('pr-elo-texto');
    const id = alvoEl?.value ? parseInt(alvoEl.value, 10) : null;
    if (!id) return;
    listaElosProsa.salvar({
        id,
        relacao: relacaoEl?.value || '',
        direcao: direcaoEl?.value || '',
        texto: (textoEl?.value || '').trim(),
    });
    if (alvoEl) alvoEl.value = '';
    if (relacaoEl) relacaoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarRotulosDirecaoEloProsa();
    marcarDirecaoEloProsa('');
    atualizarBotaoEloProsa();
}
export function editarEloProsa(indice) {
    const item = listaElosProsa.iniciarEdicao(indice);
    const alvoEl = document.getElementById('pr-elo-poema');
    const relacaoEl = document.getElementById('pr-elo-relacao');
    const textoEl = document.getElementById('pr-elo-texto');
    if (alvoEl) alvoEl.value = item.id ?? '';
    if (relacaoEl) relacaoEl.value = item.relacao || '';
    if (textoEl) textoEl.value = item.texto || '';
    atualizarRotulosDirecaoEloProsa();
    marcarDirecaoEloProsa(item.direcao || '');
    atualizarBotaoEloProsa();
}
export function cancelarEdicaoEloProsa() {
    listaElosProsa.cancelarEdicao();
    const alvoEl = document.getElementById('pr-elo-poema');
    const relacaoEl = document.getElementById('pr-elo-relacao');
    const textoEl = document.getElementById('pr-elo-texto');
    if (alvoEl) alvoEl.value = '';
    if (relacaoEl) relacaoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarRotulosDirecaoEloProsa();
    marcarDirecaoEloProsa('');
    atualizarBotaoEloProsa();
}
export function removerEloProsa(indice) {
    listaElosProsa.remover(indice);
    atualizarBotaoEloProsa();
}
export function obterElosProsa() {
    return listaElosProsa.obterItens();
}
export function carregarElosProsa(lista) {
    listaElosProsa.carregar(lista);
    atualizarBotaoEloProsa();
}
export function resetElosProsa() {
    listaElosProsa.reset();
    const relacaoEl = document.getElementById('pr-elo-relacao');
    if (relacaoEl) relacaoEl.value = '';
    atualizarRotulosDirecaoEloProsa();
    marcarDirecaoEloProsa('');
    atualizarBotaoEloProsa();
}

export function adicionarReferenciaProsa() {
    const alvoEl = document.getElementById('pr-ref-poema');
    const tipoEl = document.getElementById('pr-ref-tipo');
    const textoEl = document.getElementById('pr-ref-texto');
    const id = alvoEl?.value ? parseInt(alvoEl.value, 10) : null;
    if (!id) return;
    listaReferenciasProsa.salvar({
        id,
        tipo: tipoEl?.value || '',
        texto: (textoEl?.value || '').trim(),
    });
    if (alvoEl) alvoEl.value = '';
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoReferenciaProsa();
}
export function editarReferenciaProsa(indice) {
    const item = listaReferenciasProsa.iniciarEdicao(indice);
    const alvoEl = document.getElementById('pr-ref-poema');
    const tipoEl = document.getElementById('pr-ref-tipo');
    const textoEl = document.getElementById('pr-ref-texto');
    if (alvoEl) alvoEl.value = item.id ?? '';
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (textoEl) textoEl.value = item.texto || '';
    atualizarBotaoReferenciaProsa();
}
export function cancelarEdicaoReferenciaProsa() {
    listaReferenciasProsa.cancelarEdicao();
    const alvoEl = document.getElementById('pr-ref-poema');
    const tipoEl = document.getElementById('pr-ref-tipo');
    const textoEl = document.getElementById('pr-ref-texto');
    if (alvoEl) alvoEl.value = '';
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoReferenciaProsa();
}
export function removerReferenciaProsa(indice) {
    listaReferenciasProsa.remover(indice);
    atualizarBotaoReferenciaProsa();
}
export function obterReferenciasProsa() {
    return listaReferenciasProsa.obterItens();
}
export function carregarReferenciasProsa(lista) {
    listaReferenciasProsa.carregar(lista);
    atualizarBotaoReferenciaProsa();
}
export function resetReferenciasProsa() {
    listaReferenciasProsa.reset();
    atualizarBotaoReferenciaProsa();
}

// ─── Intertextualidade (Prosa) ──────────────────────────────────

const listaIntertextoProsa = criarListaDeEntradas({
    containerId: 'pr-intertexto-lista',
    renderItem: (it) =>
        `${
            it.tipo
                ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
                : ''
        }${escapeHtml(it.texto || '')}`,
    nomeFuncaoRemover: 'removerIntertextoProsa',
    nomeFuncaoEditar: 'editarIntertextoProsa',
});

function atualizarBotaoIntertextoProsa() {
    const btnAdd = document.getElementById('pr-intertexto-btn-add');
    const btnCancelar = document.getElementById('pr-intertexto-btn-cancelar');
    const emEdicao = listaIntertextoProsa.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function atualizarDatalistIntertextoProsa() {
    const datalist = document.getElementById('sugestoes-intertexto-prosa');
    if (datalist) {
        datalist.innerHTML = extrairValoresUnicosDeIntertextualidade(db.prosas || [])
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
}

export function adicionarIntertextoProsa() {
    const tipoEl = document.getElementById('pr-intertexto-tipo');
    const textoEl = document.getElementById('pr-intertexto-texto');
    const tipo = tipoEl?.value || '';
    const texto = (textoEl?.value || '').trim();
    if (!tipo && !texto) return;
    listaIntertextoProsa.salvar({ tipo, texto });
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoIntertextoProsa();
    atualizarDatalistIntertextoProsa();
}
export function editarIntertextoProsa(indice) {
    const item = listaIntertextoProsa.iniciarEdicao(indice);
    const tipoEl = document.getElementById('pr-intertexto-tipo');
    const textoEl = document.getElementById('pr-intertexto-texto');
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (textoEl) textoEl.value = item.texto || '';
    textoEl?.focus();
    atualizarBotaoIntertextoProsa();
}
export function cancelarEdicaoIntertextoProsa() {
    listaIntertextoProsa.cancelarEdicao();
    const tipoEl = document.getElementById('pr-intertexto-tipo');
    const textoEl = document.getElementById('pr-intertexto-texto');
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoIntertextoProsa();
}
export function removerIntertextoProsa(indice) {
    listaIntertextoProsa.remover(indice);
    atualizarBotaoIntertextoProsa();
}
export function obterIntertextualidadeProsa() {
    return listaIntertextoProsa.obterItens();
}
export function carregarIntertextualidadeProsa(lista) {
    listaIntertextoProsa.carregar(lista);
    atualizarBotaoIntertextoProsa();
}
export function resetIntertextualidadeProsa() {
    listaIntertextoProsa.reset();
    atualizarBotaoIntertextoProsa();
}

// ─── Anexos (Prosa) ──────────────────────────────────────────────

const listaAnexosProsa = criarListaDeEntradas({
    containerId: 'pr-anexos-lista',
    renderItem: (it) => {
        const badge = it.tipo
            ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
            : '';
        const link = it.link
            ? ` <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline text-[11px]">${escapeHtml(it.link)}</a>`
            : '';
        return `${badge}${escapeHtml(it.texto || '')}${link}`;
    },
    nomeFuncaoRemover: 'removerAnexoProsa',
    nomeFuncaoEditar: 'editarAnexoProsa',
});

function atualizarBotaoAnexoProsa() {
    const btnAdd = document.getElementById('pr-anexo-btn-add');
    const btnCancelar = document.getElementById('pr-anexo-btn-cancelar');
    const emEdicao = listaAnexosProsa.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓ Salvar edição' : '+ Adicionar anexo';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function adicionarAnexoProsa(valor = null) {
    const tipoEl = document.getElementById('pr-anexo-tipo');
    const linkEl = document.getElementById('pr-anexo-link');
    const textoEl = document.getElementById('pr-anexo-input');

    const tipo = tipoEl?.value || '';
    const link = (linkEl?.value || '').trim();
    const texto = (valor ?? textoEl?.value ?? '').trim();

    if (!tipo && !texto && !link) return;

    if (TIPOS_ANEXO_COM_LINK_OBRIGATORIO.includes(tipo) && !link) {
        mostrarAviso(`Anexos do tipo "${tipo}" precisam de um link.`);
        return;
    }

    listaAnexosProsa.salvar({ tipo, texto, link });
    if (tipoEl) tipoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnexoProsa();
}
export function editarAnexoProsa(indice) {
    const item = listaAnexosProsa.iniciarEdicao(indice);
    const tipoEl = document.getElementById('pr-anexo-tipo');
    const linkEl = document.getElementById('pr-anexo-link');
    const textoEl = document.getElementById('pr-anexo-input');
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (linkEl) linkEl.value = item.link || '';
    if (textoEl) textoEl.value = item.texto || '';
    textoEl?.focus();
    atualizarBotaoAnexoProsa();
}
export function cancelarEdicaoAnexoProsa() {
    listaAnexosProsa.cancelarEdicao();
    const tipoEl = document.getElementById('pr-anexo-tipo');
    const linkEl = document.getElementById('pr-anexo-link');
    const textoEl = document.getElementById('pr-anexo-input');
    if (tipoEl) tipoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnexoProsa();
}
export function removerAnexoProsa(indice) {
    listaAnexosProsa.remover(indice);
    atualizarBotaoAnexoProsa();
}
export function obterAnexosProsa() {
    return listaAnexosProsa.obterItens();
}
export function carregarAnexosProsa(lista) {
    const normalizada = Array.isArray(lista)
        ? lista.map((it) => (typeof it === 'string' ? { tipo: '', texto: it, link: '' } : it))
        : [];
    listaAnexosProsa.carregar(normalizada);
    atualizarBotaoAnexoProsa();
}
export function resetAnexosProsa() {
    listaAnexosProsa.reset();
    atualizarBotaoAnexoProsa();
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

const listaEnviosPoema = criarListaDeEntradas({
    containerId: 'p-envios-lista',
    renderItem: (it) => {
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
    },
    nomeFuncaoRemover: 'removerEnvio',
    nomeFuncaoEditar: 'editarEnvio',
});

const listaEnviosProsa = criarListaDeEntradas({
    containerId: 'pr-envios-lista',
    renderItem: (it) => {
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
    },
    nomeFuncaoRemover: 'removerEnvioProsa',
    nomeFuncaoEditar: 'editarEnvioProsa',
});

function atualizarBotaoEnvio(prefixo, lista) {
    const btnAdd = document.getElementById(`${prefixo}-envio-btn-add`);
    const btnCancelar = document.getElementById(`${prefixo}-envio-btn-cancelar`);
    const emEdicao = lista.estaEditando();
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

function limparCamposEnvio(prefixo) {
    ['pessoa', 'meio', 'reacao', 'notas'].forEach((campo) => {
        const el = document.getElementById(`${prefixo}-envio-${campo}`);
        if (el) el.value = '';
    });
    preencherDataParcial(`${prefixo}-envio`, null);
}

export function adicionarEnvio() {
    const pessoa = (document.getElementById('p-envio-pessoa')?.value || '').trim();
    const meio = (document.getElementById('p-envio-meio')?.value || '').trim();
    const reacao = (document.getElementById('p-envio-reacao')?.value || '').trim();
    const notas = (document.getElementById('p-envio-notas')?.value || '').trim();
    const data = lerDataParcial('p-envio');
    if (!pessoa && !meio && !reacao && !notas && !data) return;

    listaEnviosPoema.salvar({ pessoa, data, meio, reacao, notas });
    limparCamposEnvio('p');
    atualizarBotaoEnvio('p', listaEnviosPoema);
    atualizarDatalistEnvios();
}
export function editarEnvio(indice) {
    const item = listaEnviosPoema.iniciarEdicao(indice);
    const pessoaEl = document.getElementById('p-envio-pessoa');
    const meioEl = document.getElementById('p-envio-meio');
    const reacaoEl = document.getElementById('p-envio-reacao');
    const notasEl = document.getElementById('p-envio-notas');
    if (pessoaEl) pessoaEl.value = item.pessoa || '';
    if (meioEl) meioEl.value = item.meio || '';
    if (reacaoEl) reacaoEl.value = item.reacao || '';
    if (notasEl) notasEl.value = item.notas || '';
    preencherDataParcial('p-envio', item.data);
    pessoaEl?.focus();
    atualizarBotaoEnvio('p', listaEnviosPoema);
}
export function cancelarEdicaoEnvio() {
    listaEnviosPoema.cancelarEdicao();
    limparCamposEnvio('p');
    atualizarBotaoEnvio('p', listaEnviosPoema);
}
export function removerEnvio(indice) {
    listaEnviosPoema.remover(indice);
    atualizarBotaoEnvio('p', listaEnviosPoema);
}
export function obterEnvios() {
    return listaEnviosPoema.obterItens();
}
export function carregarEnvios(lista) {
    listaEnviosPoema.carregar(lista);
    atualizarBotaoEnvio('p', listaEnviosPoema);
}
export function resetEnvios() {
    listaEnviosPoema.reset();
    atualizarBotaoEnvio('p', listaEnviosPoema);
}

export function adicionarEnvioProsa() {
    const pessoa = (document.getElementById('pr-envio-pessoa')?.value || '').trim();
    const meio = (document.getElementById('pr-envio-meio')?.value || '').trim();
    const reacao = (document.getElementById('pr-envio-reacao')?.value || '').trim();
    const notas = (document.getElementById('pr-envio-notas')?.value || '').trim();
    const data = lerDataParcial('pr-envio');
    if (!pessoa && !meio && !reacao && !notas && !data) return;

    listaEnviosProsa.salvar({ pessoa, data, meio, reacao, notas });
    limparCamposEnvio('pr');
    atualizarBotaoEnvio('pr', listaEnviosProsa);
    atualizarDatalistEnvios();
}
export function editarEnvioProsa(indice) {
    const item = listaEnviosProsa.iniciarEdicao(indice);
    const pessoaEl = document.getElementById('pr-envio-pessoa');
    const meioEl = document.getElementById('pr-envio-meio');
    const reacaoEl = document.getElementById('pr-envio-reacao');
    const notasEl = document.getElementById('pr-envio-notas');
    if (pessoaEl) pessoaEl.value = item.pessoa || '';
    if (meioEl) meioEl.value = item.meio || '';
    if (reacaoEl) reacaoEl.value = item.reacao || '';
    if (notasEl) notasEl.value = item.notas || '';
    preencherDataParcial('pr-envio', item.data);
    pessoaEl?.focus();
    atualizarBotaoEnvio('pr', listaEnviosProsa);
}
export function cancelarEdicaoEnvioProsa() {
    listaEnviosProsa.cancelarEdicao();
    limparCamposEnvio('pr');
    atualizarBotaoEnvio('pr', listaEnviosProsa);
}
export function removerEnvioProsa(indice) {
    listaEnviosProsa.remover(indice);
    atualizarBotaoEnvio('pr', listaEnviosProsa);
}
export function obterEnviosProsa() {
    return listaEnviosProsa.obterItens();
}
export function carregarEnviosProsa(lista) {
    listaEnviosProsa.carregar(lista);
    atualizarBotaoEnvio('pr', listaEnviosProsa);
}
export function resetEnviosProsa() {
    listaEnviosProsa.reset();
    atualizarBotaoEnvio('pr', listaEnviosProsa);
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

const listaReconhecimentosPoema = criarListaDeEntradas({
    containerId: 'p-reconhecimentos-lista',
    renderItem: (it) => {
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
    },
    nomeFuncaoRemover: 'removerReconhecimento',
    nomeFuncaoEditar: 'editarReconhecimento',
});

const listaReconhecimentosProsa = criarListaDeEntradas({
    containerId: 'pr-reconhecimentos-lista',
    renderItem: (it) => {
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
    },
    nomeFuncaoRemover: 'removerReconhecimentoProsa',
    nomeFuncaoEditar: 'editarReconhecimentoProsa',
});

function atualizarBotaoReconhecimento(prefixo, lista) {
    const btnAdd = document.getElementById(`${prefixo}-reconhecimento-btn-add`);
    const btnCancelar = document.getElementById(`${prefixo}-reconhecimento-btn-cancelar`);
    const emEdicao = lista.estaEditando();
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

function limparCamposReconhecimento(prefixo) {
    ['premio', 'posicao', 'ano', 'texto'].forEach((campo) => {
        const el = document.getElementById(`${prefixo}-reconhecimento-${campo}`);
        if (el) el.value = '';
    });
}

export function adicionarReconhecimento() {
    const premio = (document.getElementById('p-reconhecimento-premio')?.value || '').trim();
    const posicao = (document.getElementById('p-reconhecimento-posicao')?.value || '').trim();
    const anoStr = (document.getElementById('p-reconhecimento-ano')?.value || '').trim();
    const ano = anoStr ? parseInt(anoStr, 10) : null;
    const texto = (document.getElementById('p-reconhecimento-texto')?.value || '').trim();
    if (!premio && !posicao && !ano && !texto) return;

    listaReconhecimentosPoema.salvar({ premio, posicao, ano, texto });
    limparCamposReconhecimento('p');
    atualizarBotaoReconhecimento('p', listaReconhecimentosPoema);
    atualizarDatalistReconhecimentos();
}
export function editarReconhecimento(indice) {
    const item = listaReconhecimentosPoema.iniciarEdicao(indice);
    const premioEl = document.getElementById('p-reconhecimento-premio');
    const posicaoEl = document.getElementById('p-reconhecimento-posicao');
    const anoEl = document.getElementById('p-reconhecimento-ano');
    const textoEl = document.getElementById('p-reconhecimento-texto');
    if (premioEl) premioEl.value = item.premio || '';
    if (posicaoEl) posicaoEl.value = item.posicao || '';
    if (anoEl) anoEl.value = item.ano ?? '';
    if (textoEl) textoEl.value = item.texto || '';
    premioEl?.focus();
    atualizarBotaoReconhecimento('p', listaReconhecimentosPoema);
}
export function cancelarEdicaoReconhecimento() {
    listaReconhecimentosPoema.cancelarEdicao();
    limparCamposReconhecimento('p');
    atualizarBotaoReconhecimento('p', listaReconhecimentosPoema);
}
export function removerReconhecimento(indice) {
    listaReconhecimentosPoema.remover(indice);
    atualizarBotaoReconhecimento('p', listaReconhecimentosPoema);
}
export function obterReconhecimentos() {
    return listaReconhecimentosPoema.obterItens();
}
export function carregarReconhecimentos(lista) {
    listaReconhecimentosPoema.carregar(lista);
    atualizarBotaoReconhecimento('p', listaReconhecimentosPoema);
}
export function resetReconhecimentos() {
    listaReconhecimentosPoema.reset();
    atualizarBotaoReconhecimento('p', listaReconhecimentosPoema);
}

export function adicionarReconhecimentoProsa() {
    const premio = (document.getElementById('pr-reconhecimento-premio')?.value || '').trim();
    const posicao = (document.getElementById('pr-reconhecimento-posicao')?.value || '').trim();
    const anoStr = (document.getElementById('pr-reconhecimento-ano')?.value || '').trim();
    const ano = anoStr ? parseInt(anoStr, 10) : null;
    const texto = (document.getElementById('pr-reconhecimento-texto')?.value || '').trim();
    if (!premio && !posicao && !ano && !texto) return;

    listaReconhecimentosProsa.salvar({ premio, posicao, ano, texto });
    limparCamposReconhecimento('pr');
    atualizarBotaoReconhecimento('pr', listaReconhecimentosProsa);
    atualizarDatalistReconhecimentos();
}
export function editarReconhecimentoProsa(indice) {
    const item = listaReconhecimentosProsa.iniciarEdicao(indice);
    const premioEl = document.getElementById('pr-reconhecimento-premio');
    const posicaoEl = document.getElementById('pr-reconhecimento-posicao');
    const anoEl = document.getElementById('pr-reconhecimento-ano');
    const textoEl = document.getElementById('pr-reconhecimento-texto');
    if (premioEl) premioEl.value = item.premio || '';
    if (posicaoEl) posicaoEl.value = item.posicao || '';
    if (anoEl) anoEl.value = item.ano ?? '';
    if (textoEl) textoEl.value = item.texto || '';
    premioEl?.focus();
    atualizarBotaoReconhecimento('pr', listaReconhecimentosProsa);
}
export function cancelarEdicaoReconhecimentoProsa() {
    listaReconhecimentosProsa.cancelarEdicao();
    limparCamposReconhecimento('pr');
    atualizarBotaoReconhecimento('pr', listaReconhecimentosProsa);
}
export function removerReconhecimentoProsa(indice) {
    listaReconhecimentosProsa.remover(indice);
    atualizarBotaoReconhecimento('pr', listaReconhecimentosProsa);
}
export function obterReconhecimentosProsa() {
    return listaReconhecimentosProsa.obterItens();
}
export function carregarReconhecimentosProsa(lista) {
    listaReconhecimentosProsa.carregar(lista);
    atualizarBotaoReconhecimento('pr', listaReconhecimentosProsa);
}
export function resetReconhecimentosProsa() {
    listaReconhecimentosProsa.reset();
    atualizarBotaoReconhecimento('pr', listaReconhecimentosProsa);
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
    // 6 categorias combinadas (ver correspondeFiltro em exportar.js) —
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
    atualizarDatalistIntertexto();
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
            datalist.innerHTML = titulos.map((titulo) => `<option value="${escapeHtml(titulo)}">`).join('');
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

export function adicionarSinalEstilo(valor = null) {
    modulosSinalPoema.Estilo.adicionar(valor);
}
export function removerSinalEstilo(tag) {
    modulosSinalPoema.Estilo.remover(tag);
}
export function renderizarSinalEstilo() {
    modulosSinalPoema.Estilo.renderizar();
}

export function adicionarSinalTema(valor = null) {
    modulosSinalPoema.Tema.adicionar(valor);
}
export function removerSinalTema(tag) {
    modulosSinalPoema.Tema.remover(tag);
}
export function renderizarSinalTema() {
    modulosSinalPoema.Tema.renderizar();
}

export function adicionarSinalRelacao(valor = null) {
    modulosSinalPoema.Relacao.adicionar(valor);
}
export function removerSinalRelacao(tag) {
    modulosSinalPoema.Relacao.remover(tag);
}
export function renderizarSinalRelacao() {
    modulosSinalPoema.Relacao.renderizar();
}

export function adicionarSinalSensibilidade(valor = null) {
    modulosSinalPoema.Sensibilidade.adicionar(valor);
}
export function removerSinalSensibilidade(tag) {
    modulosSinalPoema.Sensibilidade.remover(tag);
}
export function renderizarSinalSensibilidade() {
    modulosSinalPoema.Sensibilidade.renderizar();
}

export function adicionarSinalTom(valor = null) {
    modulosSinalPoema.Tom.adicionar(valor);
}
export function removerSinalTom(tag) {
    modulosSinalPoema.Tom.remover(tag);
}
export function renderizarSinalTom() {
    modulosSinalPoema.Tom.renderizar();
}

export function adicionarSinalOutros(valor = null) {
    modulosSinalPoema.Outros.adicionar(valor);
}
export function removerSinalOutros(tag) {
    modulosSinalPoema.Outros.remover(tag);
}
export function renderizarSinalOutros() {
    modulosSinalPoema.Outros.renderizar();
}

// Ao contrário de Intertextualidade/Anexos/Anotações (arrays de objetos,
// que precisam de um getter porque não há onde o navegador guardaria o
// valor sozinho), cada categoria de Sinalizações já escreve sua string
// atual no próprio hidden input (p-sinal-{categoria}) a cada
// adicionar/remover — igual Pessoas. Por isso forms.js lê
// document.getElementById('p-sinal-estilo').value etc. direto no
// submit, sem precisar de um obterSinalizacoes() aqui.
export function resetSinalizacoes() {
    SINAL_CATEGORIAS.forEach(({ chave }) => modulosSinalPoema[chave].reset());
}
export function carregarSinalizacoes(item) {
    modulosSinalPoema.Estilo.carregar(item.sinalizacoesEstilo || '');
    modulosSinalPoema.Tema.carregar(item.sinalizacoesTema || '');
    modulosSinalPoema.Relacao.carregar(item.sinalizacoesRelacao || '');
    modulosSinalPoema.Sensibilidade.carregar(item.sinalizacoesSensibilidade || '');
    modulosSinalPoema.Outros.carregar(item.sinalizacoesOutros || '');
    modulosSinalPoema.Tom.carregar(item.sinalizacoesTom || '');
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

export function adicionarPessoa(valor = null) {
    grupoPessoasPoema.adicionar(valor);
}
export function removerPessoa(nome) {
    grupoPessoasPoema.remover(nome);
}
export function alternarPapelPessoa(nome, papel, marcado) {
    grupoPessoasPoema.alternarPapel(nome, papel, marcado);
}
export function alternarDropdownPapelPessoa(nome) {
    grupoPessoasPoema.alternarDropdown(nome);
}
export function renderizarPessoas() {
    grupoPessoasPoema.renderizar();
}
export function resetPessoas() {
    grupoPessoasPoema.reset();
}
export function carregarPessoas(pessoas) {
    grupoPessoasPoema.carregar(pessoas);
}
export function obterPessoas() {
    return grupoPessoasPoema.obterItens();
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

export function adicionarAutoria(valor = null) {
    grupoAutoriaPoema.adicionar(valor);
}
export function removerAutoria(autorId) {
    grupoAutoriaPoema.remover(autorId);
}
export function alterarPapelAutoria(autorId, papel) {
    grupoAutoriaPoema.alterarPapel(autorId, papel);
}
export function renderizarAutoria() {
    grupoAutoriaPoema.renderizar();
}
export function resetAutoria() {
    grupoAutoriaPoema.reset();
}
export function carregarAutoria(autoria) {
    grupoAutoriaPoema.carregar(autoria);
}
export function obterAutoria() {
    return grupoAutoriaPoema.obterItens();
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
    atualizarDatalistIntertextoProsa();
}

export function adicionarSinalEstiloProsa(valor = null) {
    modulosSinalProsa.Estilo.adicionar(valor);
}
export function removerSinalEstiloProsa(tag) {
    modulosSinalProsa.Estilo.remover(tag);
}
export function renderizarSinalEstiloProsa() {
    modulosSinalProsa.Estilo.renderizar();
}

export function adicionarSinalTemaProsa(valor = null) {
    modulosSinalProsa.Tema.adicionar(valor);
}
export function removerSinalTemaProsa(tag) {
    modulosSinalProsa.Tema.remover(tag);
}
export function renderizarSinalTemaProsa() {
    modulosSinalProsa.Tema.renderizar();
}

export function adicionarSinalRelacaoProsa(valor = null) {
    modulosSinalProsa.Relacao.adicionar(valor);
}
export function removerSinalRelacaoProsa(tag) {
    modulosSinalProsa.Relacao.remover(tag);
}
export function renderizarSinalRelacaoProsa() {
    modulosSinalProsa.Relacao.renderizar();
}

export function adicionarSinalSensibilidadeProsa(valor = null) {
    modulosSinalProsa.Sensibilidade.adicionar(valor);
}
export function removerSinalSensibilidadeProsa(tag) {
    modulosSinalProsa.Sensibilidade.remover(tag);
}
export function renderizarSinalSensibilidadeProsa() {
    modulosSinalProsa.Sensibilidade.renderizar();
}

export function adicionarSinalTomProsa(valor = null) {
    modulosSinalProsa.Tom.adicionar(valor);
}
export function removerSinalTomProsa(tag) {
    modulosSinalProsa.Tom.remover(tag);
}
export function renderizarSinalTomProsa() {
    modulosSinalProsa.Tom.renderizar();
}

export function adicionarSinalOutrosProsa(valor = null) {
    modulosSinalProsa.Outros.adicionar(valor);
}
export function removerSinalOutrosProsa(tag) {
    modulosSinalProsa.Outros.remover(tag);
}
export function renderizarSinalOutrosProsa() {
    modulosSinalProsa.Outros.renderizar();
}

export function resetSinalizacoesProsa() {
    SINAL_CATEGORIAS.forEach(({ chave }) => modulosSinalProsa[chave].reset());
}
export function carregarSinalizacoesProsa(item) {
    modulosSinalProsa.Estilo.carregar(item.sinalizacoesEstilo || '');
    modulosSinalProsa.Tema.carregar(item.sinalizacoesTema || '');
    modulosSinalProsa.Relacao.carregar(item.sinalizacoesRelacao || '');
    modulosSinalProsa.Sensibilidade.carregar(item.sinalizacoesSensibilidade || '');
    modulosSinalProsa.Outros.carregar(item.sinalizacoesOutros || '');
    modulosSinalProsa.Tom.carregar(item.sinalizacoesTom || '');
}

export function adicionarPessoaProsa(valor = null) {
    grupoPessoasProsa.adicionar(valor);
}
export function removerPessoaProsa(nome) {
    grupoPessoasProsa.remover(nome);
}
export function alternarPapelPessoaProsa(nome, papel, marcado) {
    grupoPessoasProsa.alternarPapel(nome, papel, marcado);
}
export function alternarDropdownPapelPessoaProsa(nome) {
    grupoPessoasProsa.alternarDropdown(nome);
}
export function renderizarPessoasProsa() {
    grupoPessoasProsa.renderizar();
}
export function resetPessoasProsa() {
    grupoPessoasProsa.reset();
}
export function carregarPessoasProsa(pessoas) {
    grupoPessoasProsa.carregar(pessoas);
}
export function obterPessoasProsa() {
    return grupoPessoasProsa.obterItens();
}

export function adicionarAutoriaProsa(valor = null) {
    grupoAutoriaProsa.adicionar(valor);
}
export function removerAutoriaProsa(autorId) {
    grupoAutoriaProsa.remover(autorId);
}
export function alterarPapelAutoriaProsa(autorId, papel) {
    grupoAutoriaProsa.alterarPapel(autorId, papel);
}
export function renderizarAutoriaProsa() {
    grupoAutoriaProsa.renderizar();
}
export function resetAutoriaProsa() {
    grupoAutoriaProsa.reset();
}
export function carregarAutoriaProsa(autoria) {
    grupoAutoriaProsa.carregar(autoria);
}
export function obterAutoriaProsa() {
    return grupoAutoriaProsa.obterItens();
}

// ─── Gênero (Cartas, Diálogos, Ensaios, Prosas poéticas...) ───

export function adicionarGeneroProsa(valor = null) {
    grupoGeneroProsa.adicionar(valor);
}
export function removerGeneroProsa(genero) {
    grupoGeneroProsa.remover(genero);
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

    // Enter nos 6 inputs de tags de Sinalizações (Poema) — um listener
    // por categoria, já que cada uma agora tem seu próprio input/função
    // de adicionar (ver SINAL_CATEGORIAS acima).
    const funcoesSinalPoema = {
        Estilo: adicionarSinalEstilo,
        Tema: adicionarSinalTema,
        Relacao: adicionarSinalRelacao,
        Sensibilidade: adicionarSinalSensibilidade,
        Tom: adicionarSinalTom,
        Outros: adicionarSinalOutros,
    };
    SINAL_CATEGORIAS.forEach(({ chave }) => {
        const input = document.getElementById(`p-sinal-${slugDom(chave)}-input`);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    funcoesSinalPoema[chave]();
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
                adicionarPessoa();
            }
        });
    }

    // Enter no input de texto da Intertextualidade
    const inputIntertexto = document.getElementById('p-intertexto-texto');
    if (inputIntertexto) {
        inputIntertexto.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarIntertexto();
            }
        });
    }

    // Anexos usa textarea (texto longo) — Enter quebra linha na
    // descrição normalmente; Ctrl/Cmd+Enter é quem adiciona o item
    // (mesmo padrão do atalho de salvar o modal inteiro).
    const inputAnexo = document.getElementById('p-anexo-input');
    if (inputAnexo) {
        inputAnexo.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                adicionarAnexo();
            }
        });
    }

    // Enter nos 6 inputs de tags de Sinalizações (Prosa) — mesmo padrão
    // do Poema acima, com as funções -Prosa correspondentes.
    const funcoesSinalProsa = {
        Estilo: adicionarSinalEstiloProsa,
        Tema: adicionarSinalTemaProsa,
        Relacao: adicionarSinalRelacaoProsa,
        Sensibilidade: adicionarSinalSensibilidadeProsa,
        Tom: adicionarSinalTomProsa,
        Outros: adicionarSinalOutrosProsa,
    };
    SINAL_CATEGORIAS.forEach(({ chave }) => {
        const input = document.getElementById(`pr-sinal-${slugDom(chave)}-input`);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    funcoesSinalProsa[chave]();
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
                adicionarPessoaProsa();
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
}
