// ============================================================
// busca-campo.js — Ctrl+F dentro de um campo de texto específico
// Importado por: modais.js (atalho global)
//
// Problema que resolve: o Ctrl+F nativo do navegador busca em toda
// a página, inclusive no que está "embaixo" do modal (a lista de
// poemas atrás dele, por exemplo) — resultado confuso quando a
// pessoa só quer buscar dentro do texto que está editando. Aqui a
// gente intercepta o Ctrl+F quando o foco está num dos textareas
// habilitados (ver ATIVAR_BUSCA_CAMPO_IDS) e mostra uma barra de
// busca minúscula, escopada só àquele campo.
//
// Design: o foco fica o tempo todo DENTRO do próprio textarea (nunca
// numa caixinha separada) — é o que dá o destaque azul de seleção de
// verdade. Pra isso não virar edição sem querer, a gente intercepta o
// teclado enquanto a busca está ativa: teclas normais (letras,
// Backspace) alimentam o termo de busca em vez de entrar no texto, e
// Enter/Esc navegam/fecham em vez de quebrar linha ou tentar submeter
// o formulário. Uma tentativa anterior tentava manter o foco numa
// caixinha à parte pra digitar — mas botão "onclick" e o próprio
// digitar acabavam brigando pelo foco, e um Enter perdido virava
// quebra de linha em cima do trecho selecionado, estragando o texto.
// Manter o foco fixo no textarea e interceptar tudo ali evita esse
// tipo de disputa.
//
// O campo "substituir por" (linha expansível) já é um <input> de
// verdade — ali não tem esse problema, porque o usuário clica nele de
// propósito pra digitar o texto de substituição, então roubar o foco
// do textarea é o comportamento esperado, não um acidente.
//
// A rolagem até a ocorrência é calculada manualmente (ver
// rolarAteOcorrencia): setSelectionRange, mesmo com o campo focado,
// não garante scroll automático em todos os casos.
// ============================================================

import { mostrarAviso } from './utils.js';

const ATIVAR_BUSCA_CAMPO_IDS = ['p-texto', 'p-notas', 'pr-texto', 'pr-notas'];

let barraAtual = null; // { textarea, el, termoEl, contadorEl, substituirInput, matches, indice, termo, termoSelecionado, expandido, onKeydown }

function normalizar(s) {
    return s.toLowerCase();
}

function encontrarOcorrencias(texto, termo) {
    if (!termo) return [];
    const t = normalizar(texto);
    const q = normalizar(termo);
    const ocorrencias = [];
    let i = 0;
    while (true) {
        const pos = t.indexOf(q, i);
        if (pos === -1) break;
        ocorrencias.push(pos);
        i = pos + q.length;
    }
    return ocorrencias;
}

// Propriedades de estilo que precisam ser copiadas pro "espelho" pra
// que a quebra de linha do texto espelhado seja idêntica à do textarea
// de verdade — sem isso, a posição vertical calculada não bate.
const PROPRIEDADES_ESPELHO = [
    'boxSizing', 'width', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'letterSpacing', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom',
    'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth',
    'borderLeftWidth', 'borderTopStyle', 'borderRightStyle', 'borderBottomStyle',
    'borderLeftStyle', 'textTransform', 'wordSpacing', 'textIndent', 'textAlign',
    'tabSize',
];

// Calcula a que altura (em px, dentro do conteúdo total do textarea) uma
// posição de caractere cai, renderizando o texto até ali num <div> oculto
// com o mesmo estilo/largura do textarea — é a técnica padrão pra achar
// coordenadas dentro de um textarea, já que o DOM não expõe isso direto.
function calcularOffsetVertical(textarea, posicao) {
    const espelho = document.createElement('div');
    const estilo = getComputedStyle(textarea);
    PROPRIEDADES_ESPELHO.forEach((p) => (espelho.style[p] = estilo[p]));
    espelho.style.position = 'absolute';
    espelho.style.visibility = 'hidden';
    espelho.style.whiteSpace = 'pre-wrap';
    espelho.style.wordWrap = 'break-word';
    espelho.style.top = '0';
    espelho.style.left = '-9999px';
    espelho.style.height = 'auto';
    espelho.style.width = `${textarea.clientWidth}px`;
    document.body.appendChild(espelho);

    espelho.textContent = textarea.value.substring(0, posicao);
    const marcador = document.createElement('span');
    // nbsp: um span vazio não tem altura própria pra medir
    marcador.textContent = textarea.value.substring(posicao, posicao + 1) || '\u00A0';
    espelho.appendChild(marcador);
    const offsetTop = marcador.offsetTop;

    document.body.removeChild(espelho);
    return offsetTop;
}

// Rola o textarea até a posição calculada, centralizando-a na área
// visível — usado porque setSelectionRange, sozinho, nem sempre força
// scroll (varia por navegador e depende de detalhes como o texto ter
// ou não sofrido reflow desde o último foco).
function rolarAteOcorrencia(textarea, posicao) {
    const offsetTop = calcularOffsetVertical(textarea, posicao);
    const alturaLinha = parseFloat(getComputedStyle(textarea).lineHeight) || 16;
    const alvo = offsetTop - textarea.clientHeight / 2 + alturaLinha / 2;
    textarea.scrollTop = Math.max(0, Math.min(alvo, textarea.scrollHeight - textarea.clientHeight));
}

// Vai até a ocorrência atual mantendo o foco no textarea, e força a
// rolagem manualmente (ver rolarAteOcorrencia) já que setSelectionRange
// não garante isso sozinho.
function irParaOcorrencia() {
    if (!barraAtual || !barraAtual.matches.length) return;
    const { textarea, matches, indice, termo } = barraAtual;
    const start = matches[indice];
    textarea.focus();
    textarea.setSelectionRange(start, start + termo.length);
    rolarAteOcorrencia(textarea, start);
}

function atualizarVisual() {
    if (!barraAtual) return;
    const { matches, indice, termo, termoEl, contadorEl, termoSelecionado } = barraAtual;
    termoEl.textContent = termo || '';
    termoEl.classList.toggle('text-gray-300', !termo);
    termoEl.classList.toggle('dark:text-slate-600', !termo);
    // Destaque visual equivalente a "selecionado" — já que termoEl não é
    // um input de verdade, não existe seleção nativa do navegador aqui;
    // simulamos com uma classe (ver Ctrl+A no onKeydown).
    termoEl.classList.toggle('bg-blue-200', !!termoSelecionado && !!termo);
    termoEl.classList.toggle('dark:bg-blue-700', !!termoSelecionado && !!termo);
    contadorEl.textContent = matches.length ? `${indice + 1}/${matches.length}` : termo ? '0/0' : '';
}

// Substitui o termo inteiro (usado depois de Ctrl+A + digitar, ou
// Ctrl+A + Backspace) — equivalente a "selecionar tudo e sobrescrever"
// num input comum.
function buscar(termo) {
    if (!barraAtual) return;
    barraAtual.termo = termo;
    barraAtual.termoSelecionado = false;
    barraAtual.matches = encontrarOcorrencias(barraAtual.textarea.value, termo);
    barraAtual.indice = 0;
    atualizarVisual();
    irParaOcorrencia();
}

function navegar(direcao) {
    if (!barraAtual || !barraAtual.matches.length) return;
    const n = barraAtual.matches.length;
    barraAtual.indice = (barraAtual.indice + direcao + n) % n;
    irParaOcorrencia();
    atualizarVisual();
}

// Substitui o texto de start..start+termo.length pelo valor dado, sem
// tirar o foco do textarea. Usa execCommand('insertText') — mesma
// técnica de wrapText em editor.js — porque isso dispara um 'input'
// de verdade (o rastreador de alterações do formulário depende disso;
// setar textarea.value direto não marca o form como "sujo", ver nota
// em utils.js) e mantém undo nativo (Ctrl+Z desfaz cada substituição).
// O fallback manual também dispara 'input' na mão, pro rastreador
// funcionar mesmo se o navegador não suportar execCommand.
function substituirIntervalo(textarea, start, tamanho, valor) {
    textarea.focus();
    textarea.setSelectionRange(start, start + tamanho);
    const ok = document.execCommand('insertText', false, valor);
    if (!ok) {
        textarea.value = textarea.value.substring(0, start) + valor + textarea.value.substring(start + tamanho);
        textarea.setSelectionRange(start + valor.length, start + valor.length);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// Substitui só a ocorrência atual e avança pra próxima (posição >=
// onde a substituição terminou, com volta ao início se for a última) —
// igual o "Substituir" de um find/replace comum.
function substituirAtual() {
    if (!barraAtual || !barraAtual.matches.length || !barraAtual.termo) return;
    const { textarea, matches, indice, termo, substituirInput } = barraAtual;
    const start = matches[indice];
    const valor = substituirInput.value;
    substituirIntervalo(textarea, start, termo.length, valor);

    barraAtual.matches = encontrarOcorrencias(textarea.value, termo);
    const proxima = start + valor.length;
    const novoIndice = barraAtual.matches.findIndex((p) => p >= proxima);
    barraAtual.indice = novoIndice === -1 ? 0 : novoIndice;
    atualizarVisual();
    if (barraAtual.matches.length) irParaOcorrencia();
}

// Substitui todas as ocorrências de uma vez. Percorre de trás pra
// frente: como cada substituição só pode alterar o comprimento do
// texto a PARTIR da posição substituída, ir do fim pro começo garante
// que as posições das ocorrências anteriores (ainda não processadas)
// continuam válidas o tempo todo, sem precisar recalcular a cada passo.
function substituirTudo() {
    if (!barraAtual || !barraAtual.matches.length || !barraAtual.termo) return;
    const { textarea, matches, termo, substituirInput } = barraAtual;
    const valor = substituirInput.value;
    const total = matches.length;

    for (let i = matches.length - 1; i >= 0; i--) {
        substituirIntervalo(textarea, matches[i], termo.length, valor);
    }

    barraAtual.matches = encontrarOcorrencias(textarea.value, termo);
    barraAtual.indice = 0;
    atualizarVisual();
    if (barraAtual.matches.length) irParaOcorrencia();
    mostrarAviso(`${total} ocorrência${total === 1 ? '' : 's'} substituída${total === 1 ? '' : 's'}.`);
}

// Fecha e limpa a barra — remover `el` do DOM já derruba junto o
// listener de keydown do substituirInput (não é preciso remover à
// mão); só os listeners no textarea, que ficam fora de `el`, precisam
// de removeEventListener explícito.
export function fecharBuscaEmCampo() {
    if (!barraAtual) return;
    const { textarea, el, onKeydown, onPaste } = barraAtual;
    textarea.removeEventListener('keydown', onKeydown, true);
    textarea.removeEventListener('paste', onPaste, true);
    el.remove();
    barraAtual = null;
    if (document.body.contains(textarea)) textarea.focus();
}

function posicionarBarra(el, textarea) {
    const rect = textarea.getBoundingClientRect();
    el.style.top = `${Math.max(6, rect.top + 6)}px`;
    el.style.left = `${Math.max(6, rect.right - el.offsetWidth - 6)}px`;
}

// Teclas que não mexem no texto de busca nem no conteúdo do textarea —
// deixadas passar pro comportamento nativo (mover cursor, selecionar
// com o mouse, rolar com Page Up/Down etc.) enquanto a busca está ativa.
const TECLAS_LIVRES = new Set([
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    'Tab',
    'Shift',
    'Control',
    'Meta',
    'Alt',
]);

function criarBarra(textarea) {
    const el = document.createElement('div');
    el.className =
        'fixed z-[9999] flex flex-col gap-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 shadow-lg rounded px-2 py-1';
    el.innerHTML = `
        <div class="flex items-center gap-1">
            <span class="text-xs text-gray-300 dark:text-slate-600 w-40 truncate" data-papel="termo"></span>
            <span class="text-[10px] text-gray-400 dark:text-slate-500 font-mono w-10 text-center" data-papel="contador"></span>
            <button type="button" title="Anterior (Shift+Enter)"
                class="px-1 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">&uarr;</button>
            <button type="button" title="Próximo (Enter)"
                class="px-1 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">&darr;</button>
            <button type="button" title="Substituir" data-papel="expandir"
                class="px-1 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">&#8644;</button>
            <button type="button" title="Fechar (Esc)"
                class="px-1 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400">&times;</button>
        </div>
        <div class="hidden items-center gap-1" data-papel="linha-substituir">
            <input type="text" placeholder="Substituir por…" data-papel="substituir"
                class="text-xs w-32 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <button type="button" title="Substituir a ocorrência atual" data-papel="substituir-um"
                class="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">Substituir</button>
            <button type="button" title="Substituir todas as ocorrências" data-papel="substituir-tudo"
                class="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">Tudo</button>
        </div>
    `;
    document.body.appendChild(el);
    posicionarBarra(el, textarea);
    // reposiciona depois de medir a largura real do próprio elemento
    requestAnimationFrame(() => posicionarBarra(el, textarea));

    const termoEl = el.querySelector('[data-papel="termo"]');
    const contadorEl = el.querySelector('[data-papel="contador"]');
    const [btnAnterior, btnProximo, btnExpandir, btnFechar] = el.querySelectorAll('div.flex.items-center.gap-1 > button');
    const linhaSubstituir = el.querySelector('[data-papel="linha-substituir"]');
    const substituirInput = el.querySelector('[data-papel="substituir"]');
    const btnSubstituirUm = el.querySelector('[data-papel="substituir-um"]');
    const btnSubstituirTudo = el.querySelector('[data-papel="substituir-tudo"]');

    const onKeydown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            fecharBuscaEmCampo();
            return;
        }
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            navegar(e.shiftKey ? -1 : 1);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            // Ctrl+F de novo com a busca já aberta: não faz nada demais,
            // só evita que o navegador abra o find nativo por cima.
            e.preventDefault();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            // Sem isso, o Ctrl+A cai no comportamento nativo do textarea
            // e seleciona o poema inteiro (o foco continua ali, ver nota
            // de design acima) — em vez do termo de busca, que nem é um
            // input de verdade. Aqui a gente "seleciona" o termo por
            // conta própria: o próximo caractere ou Backspace o substitui
            // inteiro, como num campo de texto comum.
            e.preventDefault();
            barraAtual.termoSelecionado = true;
            atualizarVisual();
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return; // outros atalhos (Ctrl+S etc.) passam direto
        if (TECLAS_LIVRES.has(e.key)) return; // navegação livre pelo texto
        if (e.key === 'Backspace') {
            e.preventDefault();
            // Com o termo "selecionado" (Ctrl+A), Backspace apaga tudo de
            // uma vez, igual um input comum — não só o último caractere.
            buscar(barraAtual.termoSelecionado ? '' : barraAtual.termo.slice(0, -1));
            return;
        }
        if (e.key.length === 1) {
            // Qualquer caractere normal alimenta o termo de busca em vez
            // de ser digitado no texto — é isso que evita editar o poema
            // sem querer enquanto a busca está ativa. Se o termo estava
            // "selecionado" (Ctrl+A), o caractere substitui tudo em vez
            // de concatenar.
            e.preventDefault();
            buscar((barraAtual.termoSelecionado ? '' : barraAtual.termo) + e.key);
        }
    };
    // capture:true pra rodar antes de qualquer outro keydown já ligado
    // ao textarea (ex.: atalhos de formatação em editor.js).
    textarea.addEventListener('keydown', onKeydown, true);

    // Ctrl+V não passa pelo onKeydown acima: colar é um evento de
    // 'paste' à parte, não uma tecla normal, e o bloco "outros atalhos
    // (Ctrl+S etc.) passam direto" do onKeydown deixa Ctrl+V cair no
    // comportamento nativo do textarea — ou seja, o texto colado ia
    // direto pro POEMA de verdade (inclusive substituindo a ocorrência
    // destacada, se havia uma selecionada), nunca pro termo de busca.
    // Aqui a gente intercepta o 'paste' e redireciona o conteúdo
    // colado pro termo de busca, do mesmo jeito que uma tecla normal
    // faria (ver "e.key.length === 1" no onKeydown): substitui o termo
    // se ele estava "selecionado" (Ctrl+A), senão concatena no final.
    const onPaste = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const texto = (e.clipboardData || window.clipboardData)?.getData('text') || '';
        if (!texto) return;
        buscar((barraAtual.termoSelecionado ? '' : barraAtual.termo) + texto);
    };
    textarea.addEventListener('paste', onPaste, true);

    barraAtual = {
        textarea,
        el,
        termoEl,
        contadorEl,
        substituirInput,
        matches: [],
        indice: 0,
        termo: '',
        termoSelecionado: false,
        expandido: false,
        onKeydown,
        onPaste,
    };
    atualizarVisual();

    // mousedown (não click) com preventDefault evita que o botão roube
    // o foco do textarea só de ser clicado — sem isso, o próximo
    // keydown do usuário iria pro botão, não pro nosso listener.
    const semRoubarFoco = (fn) => (e) => {
        e.preventDefault();
        fn();
        textarea.focus();
    };
    btnAnterior.addEventListener('mousedown', semRoubarFoco(() => navegar(-1)));
    btnProximo.addEventListener('mousedown', semRoubarFoco(() => navegar(1)));
    btnFechar.addEventListener('mousedown', (e) => {
        e.preventDefault();
        fecharBuscaEmCampo();
    });

    // Expandir/recolher a linha de substituição. Diferente dos outros
    // botões, aqui a gente QUER que o foco vá pro input de substituição
    // ao abrir — é pra lá que o usuário vai digitar em seguida — e volte
    // pro textarea ao fechar.
    btnExpandir.addEventListener('mousedown', (e) => {
        e.preventDefault();
        barraAtual.expandido = !barraAtual.expandido;
        linhaSubstituir.classList.toggle('hidden', !barraAtual.expandido);
        linhaSubstituir.classList.toggle('flex', barraAtual.expandido);
        btnExpandir.classList.toggle('text-blue-600', barraAtual.expandido);
        btnExpandir.classList.toggle('dark:text-blue-400', barraAtual.expandido);
        requestAnimationFrame(() => posicionarBarra(el, textarea));
        if (barraAtual.expandido) {
            substituirInput.focus();
        } else {
            textarea.focus();
        }
    });

    btnSubstituirUm.addEventListener('mousedown', semRoubarFoco(() => substituirAtual()));
    btnSubstituirTudo.addEventListener('mousedown', semRoubarFoco(() => substituirTudo()));

    // O input de substituição é um campo de texto de verdade (ver nota
    // de design acima) — só intercepta Enter (atalho pra "Substituir")
    // e Escape (fecha a barra inteira); o resto do teclado (digitar,
    // colar, setas) é o comportamento nativo do input, sem gambiarra.
    substituirInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            substituirAtual();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            fecharBuscaEmCampo();
        }
    });

    textarea.focus();
}

// Chamada pelo atalho global de teclado (ver modais.js) quando
// Ctrl+F é pressionado com o foco num dos campos habilitados.
export function abrirBuscaEmCampo(textarea) {
    if (barraAtual && barraAtual.textarea === textarea) return;
    if (barraAtual) fecharBuscaEmCampo();
    criarBarra(textarea);
}

export function campoTemBuscaHabilitada(id) {
    return ATIVAR_BUSCA_CAMPO_IDS.includes(id);
}
