// Editor visual da grade de versos do Molde (aba Criação) — Bloco 2:
// sub-passo 1 (grade editável + contagem silábica ao vivo vs. alvo do
// Tamanho do Verso), sub-passo 2 (Modo Tônica + coluna silábica
// clicável + divergência de Pé Métrico) e sub-passo 3 (coluna "Rima",
// letra esperada derivada do Esquema de Rimas — ver
// calcularLetraRimaEsperada em editor-sonoridade.js) — os três
// implementados. Bloco 3 inteiro também implementado agora: sub-passo 1
// (Pareamento de Rima — ver bloco de comentário mais abaixo, perto de
// `modoRima`) e "Promover a Poema" (ver bloco de comentário perto de
// `statusMoldeAtual`/`definirCallbackPromocaoMolde`, mais abaixo — a
// lógica de criar o Poema/Escansão de verdade mora em forms.js, este
// módulo só expõe o gancho).
//
// Inversão de direção em relação a editor-sonoridade.js: lá a grade
// nasce do texto de um poema já escrito (construirLinhasIniciais);
// aqui não existe poema nenhum — a grade nasce VAZIA e cresce por
// botão ("+ Verso"/"+ Quebra de estrofe"), um verso de cada vez. Por
// isso o alvo (sílabas esperadas) e a divergência de Pé Métrico são
// sempre recalculados ao vivo a partir dos <select>s do próprio modal
// (nunca salvos) — combina com a decisão de a meta poder mudar no meio
// da escrita sem perder o que já foi digitado (ver
// manutencao/criacao-molde.md).
//
// Modo Tônica: mesmo gesto de Sonoridade (clique numa sílaba real
// marca/desmarca o acento, `linha.tonicas`) — mas aqui é o PRIMEIRO
// lugar em que esse gesto existe no Molde (Sonoridade já tinha o modo
// pronto de antes de Pé Métrico existir; aqui ele nasce junto com a
// divergência, não antes). A grade silábica em si (colunas de sílaba
// clicáveis, régua no topo) também não existia — sub-passo 1 desenhava
// só um <div contenteditable> com o texto inteiro numa célula só; agora
// reconstruirColunasMolde() desmembra o texto em células por sílaba
// (dividirSilabas), igual reconstruirColunas() faz em
// editor-sonoridade.js, sem tocar no <div contenteditable> em si (evita
// perder foco/cursor de quem estiver digitando — mesmo cuidado de lá).
//
// Estado (`linhasAtuais`, `paresRimaAtuais`) mora neste módulo, não em
// forms.js — mesmo motivo de editor-sonoridade.js: é mutado a cada
// tecla digitada, clique de sílaba, ou troca de Tamanho do Verso/Pé
// Métrico no select, não só ao abrir/salvar o modal. `numero` de cada
// linha nunca é guardado de forma persistente durante a edição (ficaria
// obsoleto a cada adicionar/remover linha no meio da grade) — é sempre
// recalculado no render e na hora de obter o resultado final (ver
// numerarLinhas). `modoTonico`/`modoRima`/`selecaoRima` moram aqui pelo
// mesmo motivo de seus equivalentes em editor-sonoridade.js — são
// estado de sessão do modal, não dado salvo; sempre começam desligados
// a cada abertura (ver inicializarGradeMolde).

import { escapeHtml, gerarId, mostrarAvisoComAcao } from './utils.js';
import {
    dividirSilabas,
    calcularDivergenciaSilabas,
    calcularMaxSilabas,
    celulasDivergentesPeMetrico,
    calcularLetraRimaEsperada,
    calcularLetrasRima,
    celulasRimadas,
    trechoLado,
    corDaLetra,
} from './editor-sonoridade.js';

let linhasAtuais = [];
let containerEl = null;
let tamanhoVersoAtual = '';
// Pé Métrico selecionado na Meta Estrutural do modal — mesmo padrão de
// peMetricoAtual em editor-sonoridade.js: fora do estado salvo em
// linhasAtuais (não pertence ao Molde em si, só alimenta
// celulasDivergentesPeMetrico ao desenhar a grade). Atualizado ao vivo
// por atualizarPeMetricoGradeMolde(), sem precisar reabrir o modal
// quando o Victor troca o Pé Métrico no meio da escrita.
let peMetricoAtual = '';
// Esquema de Rimas selecionado (os dois subcampos) — mesmo motivo/mesmo
// tratamento de peMetricoAtual acima: alimenta só a coluna "Rima"
// (calcularLetraRimaEsperada), nunca é salvo no Molde em si. Atualizado
// ao vivo por atualizarEsquemaRimaGradeMolde() (Bloco 2 sub-passo 3).
let esquemaRimasPresencaAtual = '';
let esquemaRimasPadraoAtual = '';
let modoTonico = false;
// ─── Bloco 3 sub-passo 1 — Pareamento de Rima ────────────────────────
// Mesmo gesto de onCliqueCelulaRima/confirmarParRima/etc. em
// editor-sonoridade.js: clique simples numa sílaba abre/reinicia um
// lado, shift-clique alterna a sílaba nesse lado (rima rica), clicar
// numa linha diferente abre o outro lado, nada fecha o par sozinho
// (só "Confirmar par"). Reaproveitado por REPLICAÇÃO, não import — os
// helpers (novoLadoRimaMolde/alternarSilabaLadoMolde/
// onCliqueCelulaRimaMolde) são pequenos e sem estado próprio fora
// deste módulo, mesmo raciocínio já usado aqui pra
// offsetDoCursor/restaurarCursor/realceHtml (evita acoplar este módulo
// pequeno ao estado interno bem maior de editor-sonoridade.js).
// Diferença de fundo em relação a Sonoridade: lá o par de rima é uma
// CLASSIFICAÇÃO do que já foi escrito (ganha Acentuação/Tonalidade/
// Riqueza na lista); aqui não existe nada disso — o Molde só registra
// QUE dois versos foram pareados, sem qualificar o tipo de rima (isso
// é trabalho de Escansão, depois que o Molde virar Poema de verdade).
// `paresRimaAtuais` sobrevive à troca de Meta Estrutural (decisão 2,
// criacao-molde.md) — nunca é limpo por atualizarEsquemaRimaGradeMolde
// nem por nenhuma outra função de recálculo ao vivo, só por
// inicializarGradeMolde (abrir/fechar o modal) ou remoção manual.
let modoRima = false;
let selecaoRima = null;
let paresRimaAtuais = [];
// ─── Bloco 3, 2ª metade — "Promover a Poema" ─────────────────────────
// `statusMoldeAtual`/`poemaIdMoldeAtual` só refletem o que já está
// salvo em db.moldes pro Molde aberto agora (não são estado editável
// aqui) — controlam se a barra de ferramentas mostra o botão "Promover
// a Poema" ou o selo "✓ Promovido", ver renderBarraFerramentasMolde.
// `callbackPromoverMolde` é registrado UMA VEZ por forms.js (ver
// definirCallbackPromocaoMolde/initFormMolde) — este módulo não sabe
// nada sobre abrir o modal de Poema nem sobre Escansão, só avisa que o
// botão foi clicado; forms.js decide o que fazer com o estado atual
// (obterLinhasMolde/obterParesRimaMolde, já exportadas, mais os
// selects de Meta Estrutural que forms.js já lê em outros lugares).
let statusMoldeAtual = 'em andamento';
let poemaIdMoldeAtual = null;
let callbackPromoverMolde = null;

export function definirCallbackPromocaoMolde(fn) {
    callbackPromoverMolde = fn;
}

// Mesmo raciocínio de callbackPromoverMolde acima — este módulo não
// sabe abrir o modal de Poema (é forms.js quem sabe, ver editarPoema),
// só avisa o clique no id do Poema dentro do selo "✓ Promovido".
// Existe porque o link dentro do modal (ver blocoPromocaoMolde) NÃO
// pode reaproveitar a delegação global de data-action em main.js
// (document.querySelector('main').addEventListener) — #modais-container
// fica FORA de <main> no index.html, então cliques dentro de qualquer
// modal carregado via registrarModal (molde incluso) nunca borbulham
// até aquele listener; só os cliques nas linhas da própria tabela (essas
// sim dentro de <main>) chegam lá — foi por isso que o link do selo
// funcionava em toda outra parte do sistema (Conexões é aba fixa dentro
// de <main>, não modal) menos aqui dentro do modal do Molde.
let callbackAbrirPoema = null;

export function definirCallbackAbrirPoema(fn) {
    callbackAbrirPoema = fn;
}

// Clona sem manter referência ao array/objetos salvos (mesmo cuidado de
// inicializarGradeSonoridade) — editar a grade não pode mutar por engano
// o `moldeLinhas` já salvo em db.moldes antes de "Salvar" ser clicado de
// verdade (ex.: fechar o modal sem salvar não pode deixar rastro).
export function inicializarGradeMolde(
    container,
    linhasSalvas = [],
    tamanhoVerso = '',
    peMetrico = '',
    esquemaRimasPresenca = '',
    esquemaRimasPadrao = '',
    paresRimaSalvos = [],
    status = 'em andamento',
    poemaId = null,
) {
    containerEl = container;
    linhasAtuais = (linhasSalvas || []).map((l) => ({ ...l }));
    tamanhoVersoAtual = tamanhoVerso || '';
    peMetricoAtual = peMetrico || '';
    esquemaRimasPresencaAtual = esquemaRimasPresenca || '';
    esquemaRimasPadraoAtual = esquemaRimasPadrao || '';
    // Clona os pares (e os arrays `silabas` de cada lado) sem manter
    // referência ao que já está salvo em db.moldes — mesmo cuidado de
    // linhasAtuais acima: editar/remover um par na sessão não pode
    // mutar por engano o Molde salvo antes de "Salvar" de verdade.
    paresRimaAtuais = (paresRimaSalvos || []).map((r) => ({
        ...r,
        a: { ...r.a, silabas: [...r.a.silabas] },
        b: { ...r.b, silabas: [...r.b.silabas] },
    }));
    statusMoldeAtual = status || 'em andamento';
    poemaIdMoldeAtual = poemaId ?? null;
    // Modo Tônica/Modo Rima são da sessão do modal, não do Molde salvo —
    // sempre começam desligados, tanto abrindo um Molde novo quanto
    // reabrindo/editando um já existente (mesmo padrão de modoTonico em
    // editor-sonoridade.js).
    modoTonico = false;
    modoRima = false;
    selecaoRima = null;
    renderGradeMolde();
}

// Chamada pelo listener `change` de `molde-tamanho-verso` (forms.js) —
// só precisa recalcular a coluna de contagem/alvo, não a grade inteira
// (evita perder o foco de quem estiver digitando um verso na hora).
export function atualizarAlvoGradeMolde(tamanhoVerso) {
    tamanhoVersoAtual = tamanhoVerso || '';
    atualizarColunaAlvo();
}

// Chamada pelos listeners `change` de `molde-tamanho-verso` e
// `molde-pe-metrico` (forms.js) — mesmo padrão de
// atualizarPeMetricoSonoridade() em editor-sonoridade.js: só reconstrói
// as colunas de sílaba (recalcula celulasDivergentesPeMetrico), sem
// perder Modo Tônica em curso nem o cursor de quem estiver digitando.
export function atualizarPeMetricoGradeMolde(peMetrico) {
    peMetricoAtual = peMetrico || '';
    reconstruirColunasMolde();
}

// Chamada pelos listeners `change` de `molde-esquema-rimas-presenca` e
// `molde-esquema-rimas-padrao` (forms.js) e pela cascata
// (aplicarCascataMolde) — só recalcula a coluna "Rima" (Bloco 2
// sub-passo 3), sem reconstruir a grade toda nem mexer no que está
// sendo digitado.
export function atualizarEsquemaRimaGradeMolde(esquemaRimasPresenca, esquemaRimasPadrao) {
    esquemaRimasPresencaAtual = esquemaRimasPresenca || '';
    esquemaRimasPadraoAtual = esquemaRimasPadrao || '';
    atualizarColunaRima();
}

function numerarLinhas(linhas) {
    let numero = 0;
    return linhas.map((l) => {
        if (l.tipo === 'vazia') return { tipo: 'vazia' };
        numero += 1;
        return { tipo: 'verso', numero, texto: l.texto || '', tonicas: l.tonicas };
    });
}

export function obterLinhasMolde() {
    return numerarLinhas(linhasAtuais);
}

// Contraparte de obterLinhasMolde acima, pro form.onsubmit gravar
// `paresRima` em db.moldes junto de `moldeLinhas`.
export function obterParesRimaMolde() {
    return paresRimaAtuais;
}

// Reconstrói o texto "limpo" de um Poema a partir de linhas no formato
// do Molde — inverso, em espírito, de construirLinhasIniciais em
// editor-sonoridade.js (que vai de texto de Poema pra linhas; esta
// função vai de linhas pra texto). Usada só na promoção (ver "Promover
// a Poema" em criacao-molde.md, Bloco 3). Cada verso perde as barras
// `/` de divisão silábica que o Victor foi digitando pra marcar
// sílabas — mesma convenção de dividirSilabas (editor-sonoridade.js):
// `/` sem escape divide (removida aqui, sem sobrar espaço, já que o
// Victor não digita espaço nenhum ao dividir uma palavra em sílabas),
// `\/` escapada é barra de conteúdo de verdade (vira `/` de novo). O
// Poema final não carrega marcação nenhuma, só o texto em si — quem
// quiser reconstruir a divisão continua tendo a Escansão pré-preenchida
// pela promoção (ver aplicarPromocaoMoldeSePendente, forms.js).
// Pura (recebe `linhas`, não lê estado do módulo) pelo mesmo motivo de
// calcularMaxSilabas — dá pra chamar tanto com o estado ao vivo do
// editor (obterLinhasMolde()) quanto com um `moldeLinhas` já salvo em
// db.moldes (promoção disparada direto da tabela, sem abrir o modal).
export function linhasMoldeParaTextoPoema(linhas) {
    return (linhas || [])
        .map((l) => {
            if (l.tipo !== 'verso') return '';
            return (l.texto || '').replace(/(?<!\\)\//g, '').replace(/\\\//g, '/');
        })
        .join('\n');
}

export function adicionarVersoMolde() {
    linhasAtuais.push({ tipo: 'verso', texto: '' });
    renderGradeMolde();
    // Foca o campo recém-criado — sem isso, cada "+ Verso" exigiria um
    // clique extra só pra começar a digitar.
    const linhas = containerEl?.querySelectorAll('.molde-linha-texto');
    const ultimo = linhas?.[linhas.length - 1];
    ultimo?.focus();
}

export function adicionarQuebraEstrofeMolde() {
    linhasAtuais.push({ tipo: 'vazia' });
    renderGradeMolde();
}

export function removerLinhaMolde(idx) {
    linhasAtuais.splice(idx, 1);
    renderGradeMolde();
}

// `linha.tonicas` só existe depois do primeiro clique numa sílaba —
// mesmo motivo/mesma função de garantirTonicas em editor-sonoridade.js
// (duplicada aqui, não importada, pelo mesmo motivo de
// offsetDoCursor/restaurarCursor abaixo — módulo pequeno, sem acoplar
// ao estado interno bem maior daquele).
function garantirTonicas(linha) {
    if (!Array.isArray(linha.tonicas)) linha.tonicas = [];
    return linha.tonicas;
}

// Cria/substitui um lado do par com uma única sílaba — réplica de
// novoLadoRima em editor-sonoridade.js (ver comentário de "Bloco 3
// sub-passo 1" mais acima sobre replicar em vez de importar).
function novoLadoRimaMolde(linhaIdx, silabaIdx) {
    return { linhaIdx, silabas: [silabaIdx] };
}

// Réplica de alternarSilabaLado — shift-clique adiciona/remove a
// sílaba do lado em vez de reiniciar, pra rima rica (mais de uma
// sílaba por lado).
function alternarSilabaLadoMolde(lado, silabaIdx) {
    const pos = lado.silabas.indexOf(silabaIdx);
    if (pos === -1) lado.silabas.push(silabaIdx);
    else lado.silabas.splice(pos, 1);
    lado.silabas.sort((a, b) => a - b);
}

// Réplica de onCliqueCelulaRima — mesmo gesto, ver comentário lá pro
// raciocínio completo (clique simples reinicia o lado onde caiu;
// shift-clique alterna a sílaba; clicar numa linha diferente abre/
// reabre o outro lado; 3ª linha distinta sem par confirmado recomeça a
// seleção do zero).
function onCliqueCelulaRimaMolde(linhaIdx, silabaIdx, comShift) {
    if (!selecaoRima) {
        selecaoRima = { ladoA: novoLadoRimaMolde(linhaIdx, silabaIdx), ladoB: null };
        renderGradeMolde();
        return;
    }
    const { ladoA, ladoB } = selecaoRima;

    if (!ladoB) {
        if (linhaIdx === ladoA.linhaIdx) {
            if (comShift) alternarSilabaLadoMolde(ladoA, silabaIdx);
            else selecaoRima.ladoA = novoLadoRimaMolde(linhaIdx, silabaIdx);
        } else {
            selecaoRima.ladoB = novoLadoRimaMolde(linhaIdx, silabaIdx);
        }
        renderGradeMolde();
        return;
    }

    if (linhaIdx === ladoB.linhaIdx) {
        if (comShift) alternarSilabaLadoMolde(ladoB, silabaIdx);
        else selecaoRima.ladoB = novoLadoRimaMolde(linhaIdx, silabaIdx);
    } else if (linhaIdx === ladoA.linhaIdx) {
        if (comShift) alternarSilabaLadoMolde(ladoA, silabaIdx);
        else selecaoRima.ladoA = novoLadoRimaMolde(linhaIdx, silabaIdx);
    } else {
        selecaoRima = { ladoA: novoLadoRimaMolde(linhaIdx, silabaIdx), ladoB: null };
    }
    renderGradeMolde();
}

// Réplica de confirmarParRima — reaproveita o `id` original quando é
// uma correção em curso (parOriginal), gera um novo caso contrário.
function confirmarParRimaMolde() {
    if (!selecaoRima?.ladoA.silabas.length || !selecaoRima?.ladoB?.silabas.length) return;
    const { ladoA, ladoB, parOriginal } = selecaoRima;
    paresRimaAtuais.push({
        ...(parOriginal || {}),
        id: parOriginal?.id ?? gerarId(),
        a: { linha: ladoA.linhaIdx, silabas: [...ladoA.silabas] },
        b: { linha: ladoB.linhaIdx, silabas: [...ladoB.silabas] },
    });
    selecaoRima = null;
    renderGradeMolde();
}

// Réplica de cancelarSelecaoRima — devolve o par original à lista se a
// seleção em curso era uma correção (evita apagar o par ao cancelar em
// vez de só descartar o ajuste).
function cancelarSelecaoRimaMolde() {
    if (selecaoRima?.parOriginal) paresRimaAtuais.push(selecaoRima.parOriginal);
    selecaoRima = null;
    renderGradeMolde();
}

// Réplica de removerParRima — toast "Desfazer" no mesmo padrão do
// resto do app (mostrarAvisoComAcao, utils.js).
function removerParRimaMolde(id) {
    const idx = paresRimaAtuais.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return;
    const [removido] = paresRimaAtuais.splice(idx, 1);
    renderGradeMolde();
    mostrarAvisoComAcao('Par de rima removido.', 'Desfazer', () => {
        paresRimaAtuais.splice(idx, 0, removido);
        renderGradeMolde();
    });
}

// Réplica de iniciarCorrecaoPar — tira o par da lista de confirmados e
// recarrega os dois lados em selecaoRima, como se o Victor tivesse
// acabado de clicá-los agora. Liga Modo Rima automaticamente
// (desligando Modo Tônica) caso não estivesse ligado.
function iniciarCorrecaoParMolde(id) {
    const idx = paresRimaAtuais.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return;
    const [par] = paresRimaAtuais.splice(idx, 1);
    modoRima = true;
    modoTonico = false;
    selecaoRima = {
        parOriginal: par,
        ladoA: { linhaIdx: par.a.linha, silabas: [...par.a.silabas] },
        ladoB: { linhaIdx: par.b.linha, silabas: [...par.b.silabas] },
    };
    renderGradeMolde();
}

// Decisão 2 (criacao-molde.md): um par confirmado sobrevive à troca de
// Esquema de Rimas, só ganha destaque leve se deixar de bater com a
// posição esperada ATUAL — "bater" aqui significa os dois versos do
// par caírem na MESMA letra esperada (calcularLetraRimaEsperada). Se
// um dos dois (ou os dois) não tiver mais letra esperada nenhuma (ex.:
// esquema virou Não Rimado, ou a posição virou "solta"), ou as letras
// esperadas dos dois lados divergirem, o par diverge — mas continua
// valendo, nunca é desfeito automaticamente.
function paresDivergentesMolde() {
    const esperadas = calcularLetraRimaEsperada(
        linhasAtuais,
        esquemaRimasPresencaAtual,
        esquemaRimasPadraoAtual,
    );
    const divergentes = new Set();
    paresRimaAtuais.forEach((par) => {
        const letraA = esperadas.get(par.a.linha);
        const letraB = esperadas.get(par.b.linha);
        if (!letraA || !letraB || letraA !== letraB) divergentes.add(par.id);
    });
    return divergentes;
}

function maxSilabasMolde() {
    return calcularMaxSilabas(linhasAtuais);
}

// ─── Realce das barras enquanto digita (réplica de
// realcarBarras/offsetDoCursor/restaurarCursor de editor-sonoridade.js —
// duplicado em vez de importado pra não acoplar este módulo, ainda
// pequeno, ao estado interno bem maior daquele) ──
function offsetDoCursor(el) {
    const sel = window.getSelection?.();
    if (!sel || !sel.rangeCount) return el.textContent.length;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
}

function restaurarCursor(el, offset) {
    const sel = window.getSelection?.();
    if (!sel) return;
    const range = document.createRange();
    let restante = offset;
    let achou = false;

    function percorrer(node) {
        if (achou) return;
        if (node.nodeType === Node.TEXT_NODE) {
            if (restante <= node.textContent.length) {
                range.setStart(node, Math.max(0, restante));
                range.collapse(true);
                achou = true;
            } else {
                restante -= node.textContent.length;
            }
        } else {
            for (const filho of node.childNodes) {
                percorrer(filho);
                if (achou) return;
            }
        }
    }
    percorrer(el);
    if (!achou) {
        range.selectNodeContents(el);
        range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
}

function realceHtml(texto) {
    return escapeHtml(texto).replace(/\//g, '<span class="text-orange-500 font-bold">/</span>');
}

function realcarBarras(el) {
    const offset = offsetDoCursor(el);
    el.innerHTML = realceHtml(el.textContent);
    restaurarCursor(el, offset);
}

// ─── Coluna de contagem/alvo ────────────────────────────────────────
// `alvo` = número entre parênteses do rótulo de Tamanho do Verso (ex.
// "Decassílabo (10)" → 10), ou null se o rótulo não tiver um número
// fixo (Bárbaro, Múltiplos Metros, Variável, ou nenhum tamanho
// escolhido ainda) — mesma extração que calcularDivergenciaSilabas já
// faz internamente, refeita aqui só pra exibir o número no rótulo da
// coluna, já que aquela função devolve só a lista de linhas divergentes.
function extrairAlvo(tamanhoVerso) {
    const match = /\((\d+)\)/.exec(tamanhoVerso || '');
    return match ? parseInt(match[1], 10) : null;
}

// Atualiza só as células de contagem (não mexe no contenteditable, pra
// não perder foco/cursor de quem estiver digitando) — chamada tanto a
// cada tecla (onInputTextoMolde) quanto ao trocar Tamanho do Verso
// (atualizarAlvoGradeMolde).
function atualizarColunaAlvo() {
    if (!containerEl) return;
    const alvo = extrairAlvo(tamanhoVersoAtual);
    const divergentes = new Set(
        calcularDivergenciaSilabas(numerarLinhas(linhasAtuais), tamanhoVersoAtual),
    );

    const rotuloAlvo = containerEl.querySelector('#molde-grade-rotulo-alvo');
    if (rotuloAlvo) {
        rotuloAlvo.textContent = alvo
            ? `Alvo: ${alvo} sílaba${alvo === 1 ? '' : 's'} por verso`
            : 'Sem alvo fixo de sílabas pra esse Tamanho do Verso.';
    }

    let numeroVerso = 0;
    linhasAtuais.forEach((linha, idx) => {
        const td = containerEl.querySelector(
            `#molde-grade-body tr[data-idx="${idx}"] .molde-cel-contagem`,
        );
        if (!td || linha.tipo !== 'verso') return;
        numeroVerso += 1;
        const contagem = dividirSilabas(linha.texto).filter((s) => s !== '').length;
        const diverge = alvo !== null && divergentes.has(numeroVerso);
        td.textContent = alvo !== null ? `${contagem}/${alvo}` : `${contagem}`;
        td.className = `molde-cel-contagem px-2 py-1.5 text-center text-[11px] font-mono border-b border-gray-100 dark:border-slate-800 align-top ${
            diverge
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-gray-400 dark:text-slate-500'
        }`;
    });
}

// ─── Coluna "Rima" — letra esperada pelo Esquema de Rimas (Bloco 2
// sub-passo 3) ────────────────────────────────────────────────────────
// Réplica em espírito de atualizarColunaAlvo acima: atualiza só a
// célula estática `.molde-cel-rima` de cada linha (nunca o
// contenteditable), pra não perder foco/cursor de quem estiver
// digitando. Diferente da contagem silábica, a letra esperada não muda
// por tecla digitada (depende só da SEQUÊNCIA de tipos de linha —
// verso/quebra —, não do texto em si), então não precisa ser chamada em
// onInputTextoMolde — só quando a grade ganha/perde uma linha
// (renderGradeMolde) ou quando o Esquema de Rimas muda
// (atualizarEsquemaRimaGradeMolde).
function atualizarColunaRima() {
    if (!containerEl) return;
    const letras = calcularLetraRimaEsperada(
        linhasAtuais,
        esquemaRimasPresencaAtual,
        esquemaRimasPadraoAtual,
    );
    linhasAtuais.forEach((linha, idx) => {
        const td = containerEl.querySelector(
            `#molde-grade-body tr[data-idx="${idx}"] .molde-cel-rima`,
        );
        if (!td) return;
        const letra = linha.tipo === 'verso' ? letras.get(idx) : undefined;
        let classes =
            'molde-cel-rima px-1 py-1.5 text-center text-xs font-bold border-b border-gray-100 dark:border-slate-800 align-top';
        classes += letra
            ? ` text-${corDaLetra(letra)}-600 dark:text-${corDaLetra(letra)}-400`
            : ' text-gray-300 dark:text-slate-600';
        td.className = classes;
        td.textContent = letra || '';
    });
}

// ─── Grade silábica — régua + colunas clicáveis (Modo Tônica) ───────
// Réplica, em escala menor (sem Modo Rima/Modo Eco — Molde ainda não
// tem Mapeamento de Rimas, Bloco 3), de renderReguaHeader/
// reconstruirColunas em editor-sonoridade.js: reconstrói só a régua
// (colgroup + cabeçalho) e as células de sílaba de cada linha — NUNCA o
// <div contenteditable> (coluna "Verso"), que fica intacto mesmo quando
// esta função roda a cada tecla digitada (ver onInputTextoMolde). As
// novas células de sílaba são inseridas ANTES da célula de contagem já
// existente (`.molde-cel-contagem`), que continua sendo atualizada à
// parte por atualizarColunaAlvo().
function renderReguaHeaderMolde(n) {
    let ths = '';
    for (let i = 1; i <= n; i++) {
        ths += `<th class="px-1 py-2 text-center text-[10px] font-mono text-gray-400 dark:text-slate-500 border-b border-gray-200 dark:border-slate-700">${i}</th>`;
    }
    return ths;
}

function reconstruirColunasMolde() {
    if (!containerEl) return;
    const n = maxSilabasMolde();
    // celulasDivergentesPeMetrico não lê `linha.numero` (só `idx`,
    // `tipo`, `texto`, `tonicas`) — dá pra passar linhasAtuais direto,
    // sem numerar, mesmo jeito que editor-sonoridade.js passa
    // linhasAtuais (também não numeradas ali).
    const divergentesPe = celulasDivergentesPeMetrico(linhasAtuais, peMetricoAtual);
    // Mesma dupla de calcularLetrasRima/celulasRimadas que
    // reconstruirColunas() usa em editor-sonoridade.js — a letra aqui é
    // dos pares REAIS confirmados (paresRimaAtuais), diferente da
    // coluna "Rima" (letra ESPERADA, atualizarColunaRima acima).
    const letrasRima = calcularLetrasRima(paresRimaAtuais);
    const rimadas = celulasRimadas(paresRimaAtuais, letrasRima);

    const colgroup = containerEl.querySelector('#molde-grade-colgroup');
    if (colgroup) {
        colgroup.innerHTML =
            '<col style="width:28px"><col style="width:200px">' +
            '<col style="width:36px">'.repeat(n) +
            '<col style="width:50px"><col style="width:36px"><col style="width:24px">';
    }

    const headerRow = containerEl.querySelector('#molde-grade-header-row');
    if (headerRow) {
        headerRow.innerHTML = `
            <th class="px-2 py-2 text-[10px] font-bold text-gray-500 dark:text-slate-400 text-right border-b border-gray-200 dark:border-slate-700">Nº</th>
            <th class="px-2 py-2 text-[10px] font-bold text-gray-500 dark:text-slate-400 text-left border-b border-gray-200 dark:border-slate-700">Verso — separe sílabas com /</th>
            ${renderReguaHeaderMolde(n)}
            <th class="px-1 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">Cont.</th>
            <th class="px-1 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">Rima</th>
            <th class="border-b border-gray-200 dark:border-slate-700"></th>`;
    }

    linhasAtuais.forEach((linha, idx) => {
        const tr = containerEl.querySelector(`#molde-grade-body tr[data-idx="${idx}"]`);
        if (!tr) return;
        tr.querySelectorAll('td.molde-cel-silaba').forEach((td) => td.remove());
        if (linha.tipo !== 'verso') return;
        const tdContagem = tr.querySelector('.molde-cel-contagem');
        const silabas = dividirSilabas(linha.texto);
        const tonicas = garantirTonicas(linha);
        for (let i = 0; i < n; i++) {
            const td = document.createElement('td');
            // Célula "real" = existe sílaba de fato nessa posição pra
            // esse verso (não é preenchimento até a régua bater no
            // maior verso do Molde) — só células reais respondem a
            // clique no Modo Tônica/Modo Rima, mesmo critério `ehReal`
            // de reconstruirColunas() em editor-sonoridade.js.
            const ehReal = i < silabas.length && silabas[i] !== '';
            const ehTonica = ehReal && tonicas.includes(i);
            // Destaque de seleção em curso (Modo Rima, ainda não
            // confirmado) — mesma prioridade sobre a cor de par já
            // confirmado que editor-sonoridade.js usa: o que o Victor
            // está ajustando agora importa mais que o estado salvo.
            const emLadoA =
                ehReal &&
                modoRima &&
                selecaoRima?.ladoA.linhaIdx === idx &&
                selecaoRima.ladoA.silabas.includes(i);
            const emLadoB =
                ehReal &&
                modoRima &&
                selecaoRima?.ladoB?.linhaIdx === idx &&
                selecaoRima.ladoB.silabas.includes(i);
            let classes =
                'molde-cel-silaba px-1 py-1.5 text-center text-[11px] border-b border-gray-100 dark:border-slate-800 align-top';
            if (ehReal && (modoTonico || modoRima))
                classes += ' cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800';
            if (ehTonica) classes += ' bg-amber-200 dark:bg-amber-900/60 font-bold rounded';
            if (emLadoA) classes += ' ring-2 ring-inset ring-blue-400 rounded';
            if (emLadoB) classes += ' ring-2 ring-inset ring-purple-400 rounded';
            if (!emLadoA && !emLadoB) {
                const letraRimada = ehReal ? rimadas.get(`${idx}:${i}`) : undefined;
                if (letraRimada) {
                    const cor = corDaLetra(letraRimada);
                    classes += ` ring-2 ring-inset ring-${cor}-400 dark:ring-${cor}-600 rounded`;
                }
            }
            // Tônica esperada pelo Pé Métrico, ainda não marcada —
            // mesmo destaque não-bloqueante (borda tracejada âmbar) de
            // celulasDivergentesPeMetrico em editor-sonoridade.js. Só
            // aparece quando não há tônica ali (a própria função já
            // exclui posições marcadas do mapa).
            const divergePe = ehReal && divergentesPe.get(`${idx}:${i}`);
            if (divergePe) {
                classes += ' border-2 border-dashed border-amber-400 dark:border-amber-600 rounded';
            }
            td.className = classes;
            td.textContent = silabas[i] || '';
            if (ehReal) {
                td.dataset.linhaIdx = String(idx);
                td.dataset.silabaIdx = String(i);
                if (divergePe) td.title = 'Pé Métrico esperava tônica aqui';
            }
            if (tdContagem) tr.insertBefore(td, tdContagem);
            else tr.appendChild(td);
        }
    });
}

// Delegado no <tbody> (não uma célula por vez) porque
// reconstruirColunasMolde() recria as células de sílaba a cada tecla —
// um listener por célula seria perdido no primeiro re-render. Ramifica
// por modo: Modo Rima usa o gesto de clique/shift-clique de
// onCliqueCelulaRimaMolde (lado A/B); Modo Tônica usa o clique simples
// de marca/desmarca (mesmo gesto de onCliqueCelula em
// editor-sonoridade.js). Os dois modos são mutuamente exclusivos (ver
// os handlers dos botões de toggle em renderGradeMolde), então nunca
// competem pelo mesmo clique.
function onCliqueCelulaMolde(e) {
    const td = e.target.closest('td.molde-cel-silaba');
    if (!td || td.dataset.linhaIdx === undefined) return;
    const linhaIdx = parseInt(td.dataset.linhaIdx, 10);
    const silabaIdx = parseInt(td.dataset.silabaIdx, 10);
    if (modoRima) {
        onCliqueCelulaRimaMolde(linhaIdx, silabaIdx, e.shiftKey);
        return;
    }
    if (!modoTonico) return;
    const linha = linhasAtuais[linhaIdx];
    if (!linha) return;
    const tonicas = garantirTonicas(linha);
    const pos = tonicas.indexOf(silabaIdx);
    if (pos === -1) tonicas.push(silabaIdx);
    else tonicas.splice(pos, 1);
    reconstruirColunasMolde();
}

// Réplica de renderizarListaRimas em espírito: reconstrói só o
// innerHTML de #molde-lista-pares-rima (rebind dos botões incluído),
// sem tocar na grade nem no contenteditable — chamada a cada tecla
// digitada (onInputTextoMolde), já que o trecho exibido de cada par
// ("mun-do") precisa acompanhar o texto conforme o Victor edita o
// verso, mesmo se nenhum par novo for confirmado/removido.
function atualizarListaParesRimaMolde() {
    if (!containerEl) return;
    const lista = containerEl.querySelector('#molde-lista-pares-rima');
    if (!lista) return;
    lista.innerHTML = renderListaParesRimaMolde(numerarLinhas(linhasAtuais));
    lista.querySelectorAll('.molde-btn-remover-rima').forEach((btn) => {
        btn.onclick = () => removerParRimaMolde(btn.dataset.id);
    });
    lista.querySelectorAll('.molde-btn-corrigir-rima').forEach((btn) => {
        btn.onclick = () => iniciarCorrecaoParMolde(btn.dataset.id);
    });
}

function onInputTextoMolde(e) {
    const el = e.target;
    if (!el.classList.contains('molde-linha-texto')) return;
    const idx = parseInt(el.dataset.idx, 10);
    const linha = linhasAtuais[idx];
    linha.texto = el.textContent;
    // Reeditar a divisão silábica pode encolher o verso (menos barras) —
    // sem isso, uma sílaba marcada como tônica na posição 4 continuaria
    // "tônica" numa posição que não existe mais depois de tirar uma
    // barra — mesmo cuidado de onInputTexto em editor-sonoridade.js.
    if (Array.isArray(linha.tonicas)) {
        const totalSilabas = dividirSilabas(linha.texto).length;
        linha.tonicas = linha.tonicas.filter((i) => i < totalSilabas);
    }
    realcarBarras(el);
    reconstruirColunasMolde();
    atualizarColunaAlvo();
    atualizarListaParesRimaMolde();
}

function montarLinhaHtml(linha, idx) {
    if (linha.tipo === 'vazia') {
        return `
        <tr data-idx="${idx}" class="molde-linha-vazia">
            <td colspan="2" class="py-1"></td>
            <td class="molde-cel-contagem px-2 py-1.5 border-b border-gray-100 dark:border-slate-800"></td>
            <td class="molde-cel-rima px-1 py-1.5 border-b border-gray-100 dark:border-slate-800"></td>
            <td class="px-1 py-1 text-right border-b border-gray-100 dark:border-slate-800">
                <button type="button" class="molde-btn-remover text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 text-xs" data-idx="${idx}" title="Remover quebra de estrofe">✕</button>
            </td>
        </tr>`;
    }
    return `
        <tr data-idx="${idx}">
            <td class="px-2 py-1.5 text-[10px] font-mono text-gray-400 dark:text-slate-500 text-right align-top border-b border-gray-100 dark:border-slate-800">${linha.numero || ''}</td>
            <td class="px-2 py-1.5 border-b border-gray-100 dark:border-slate-800 align-top">
                <div
                    class="molde-linha-texto outline-none text-sm whitespace-pre-wrap"
                    contenteditable="true"
                    data-idx="${idx}"
                    spellcheck="false"
                >${realceHtml(linha.texto)}</div>
            </td>
            <td class="molde-cel-contagem px-2 py-1.5 text-center text-[11px] font-mono text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800 align-top"></td>
            <td class="molde-cel-rima px-1 py-1.5 text-center text-xs font-bold text-gray-300 dark:text-slate-600 border-b border-gray-100 dark:border-slate-800 align-top"></td>
            <td class="px-1 py-1.5 text-right border-b border-gray-100 dark:border-slate-800 align-top">
                <button type="button" class="molde-btn-remover text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 text-xs" data-idx="${idx}" title="Remover verso">✕</button>
            </td>
        </tr>`;
}

// Barra de ferramentas — "+ Verso"/"+ Quebra de estrofe" (sub-passo 1) +
// toggle de Modo Tônica (sub-passo 2) + toggle de Modo Pareamento de
// Rima + Confirmar/Cancelar (Bloco 3 sub-passo 1) + legenda contextual,
// mesmo espírito de renderBarraFerramentas() em editor-sonoridade.js.
// Os dois modos são mutuamente exclusivos (ver handlers em
// renderGradeMolde) — sem Eco aqui, que não existe no Molde.
function renderBarraFerramentasMolde() {
    const classesTonico = modoTonico
        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
        : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700';
    const classesRima = modoRima
        ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700'
        : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700';
    const emCorrecaoRima = Boolean(selecaoRima?.parOriginal);

    let legenda = 'Ative um dos modos acima pra marcar sílabas tônicas ou parear rimas.';
    if (modoTonico) {
        legenda = 'Clique numa sílaba pra marcar/desmarcar o acento.';
    }
    if (modoRima) {
        if (!selecaoRima)
            legenda = 'Clique na 1ª sílaba de um par de rima (shift-clique pra estender).';
        else if (!selecaoRima.ladoB)
            legenda = 'Agora clique na sílaba do outro verso que rima (shift-clique pra estender).';
        else if (emCorrecaoRima)
            legenda = 'Corrigindo este par — ajuste os lados, salve a alteração ou cancele.';
        else legenda = 'Shift-clique pra ajustar os dois lados, ou confirme o par.';
    }

    const podeConfirmarRima = Boolean(
        selecaoRima?.ladoA?.silabas.length && selecaoRima?.ladoB?.silabas.length,
    );
    let controlesRima = '';
    if (modoRima && selecaoRima) {
        controlesRima = `
            <button
                type="button"
                id="molde-btn-confirmar-rima"
                ${podeConfirmarRima ? '' : 'disabled'}
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${
                    podeConfirmarRima
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600 border-gray-200 dark:border-slate-700 cursor-not-allowed'
                }"
            >
                ${emCorrecaoRima ? 'Salvar alteração' : 'Confirmar par'}
            </button>
            <button
                type="button"
                id="molde-btn-cancelar-rima"
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700"
            >
                Cancelar
            </button>`;
    }

    return `
        <div class="flex items-center flex-wrap gap-2 mb-2">
            <button type="button" id="molde-btn-add-verso" class="text-[11px] font-bold px-3 py-1 rounded-full border bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                + Verso
            </button>
            <button type="button" id="molde-btn-add-estrofe" class="text-[11px] font-bold px-3 py-1 rounded-full border bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700">
                + Quebra de estrofe
            </button>
            <button
                type="button"
                id="molde-btn-modo-tonico"
                aria-pressed="${modoTonico}"
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${classesTonico}"
            >
                Modo Sílaba Tônica${modoTonico ? ': Ligado' : ''}
            </button>
            <button
                type="button"
                id="molde-btn-modo-rima"
                aria-pressed="${modoRima}"
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${classesRima}"
            >
                Modo Pareamento de Rima${modoRima ? ': Ligado' : ''}
            </button>
            ${controlesRima}
            ${blocoPromocaoMolde()}
            <p id="molde-grade-rotulo-alvo" class="text-[10px] text-gray-400 dark:text-slate-500 w-full sm:w-auto sm:ml-auto"></p>
            <p class="text-[10px] text-gray-400 dark:text-slate-500 w-full">${legenda}</p>
        </div>`;
}

// "Promover a Poema" (Bloco 3, 2ª metade — ver criacao-molde.md), do
// lado de dentro do modal — junto dos outros controles da barra, não
// escondido embaixo da lista de pares. Molde já promovido (status/
// poemaId já salvos em db.moldes, ver statusMoldeAtual/
// poemaIdMoldeAtual) vira só um selo, sem botão: promover de novo
// criaria um segundo Poema pro mesmo Molde, o que o mecanismo (Bloco 3,
// criacao-molde.md) nunca previu. `callbackPromoverMolde` é quem sabe
// abrir o modal de Poema pré-preenchido — este módulo só avisa o clique
// (ver definirCallbackPromocaoMolde acima).
function blocoPromocaoMolde() {
    if (statusMoldeAtual === 'promovido' && poemaIdMoldeAtual != null) {
        return `
            <span class="text-[11px] font-bold px-3 py-1 rounded-full border bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                ✓ Promovido a Poema #<span id="molde-link-poema-promovido" class="cursor-pointer hover:underline" title="Abrir Poema">${poemaIdMoldeAtual}</span>
            </span>`;
    }
    return `
        <button
            type="button"
            id="molde-btn-promover"
            class="text-[11px] font-bold px-3 py-1 rounded-full border bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700"
        >
            Promover a Poema
        </button>`;
}

// Lista de pares confirmados, abaixo da grade — versão bem mais simples
// que o painel de classificação de Sonoridade (montarItemRimaHtml):
// aqui não existe classificação de tipo de rima (Acentuação/Tonalidade/
// Riqueza), só o registro do par em si + aviso de divergência (decisão
// 2, criacao-molde.md) + Corrigir/Remover. `linhasNumeradas` é passado
// de fora (renderGradeMolde já numerou pra outros fins) pra não
// recalcular numerarLinhas() de novo aqui.
function renderListaParesRimaMolde(linhasNumeradas) {
    if (!paresRimaAtuais.length) {
        return `<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-3">Nenhum par de rima confirmado ainda — ative o Modo Pareamento de Rima e clique em duas sílabas que rimem.</p>`;
    }
    const letras = calcularLetrasRima(paresRimaAtuais);
    const divergentes = paresDivergentesMolde();
    const emOrdem = [...paresRimaAtuais].sort((r1, r2) => r1.a.linha - r2.a.linha);

    const itens = emOrdem
        .map((par) => {
            const letra = letras.get(par.a.linha) || '';
            const cor = letra ? corDaLetra(letra) : 'gray';
            const trechoA = trechoLado(par.a, linhasAtuais) || '—';
            const trechoB = trechoLado(par.b, linhasAtuais) || '—';
            const numA = linhasNumeradas[par.a.linha]?.numero ?? '?';
            const numB = linhasNumeradas[par.b.linha]?.numero ?? '?';
            const diverge = divergentes.has(par.id);
            return `
            <div class="flex items-center justify-between gap-2 text-[11px] border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5">
                <span class="flex items-center gap-2 flex-wrap">
                    <span class="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 bg-${cor}-100 dark:bg-${cor}-950 text-${cor}-700 dark:text-${cor}-300">${escapeHtml(letra)}</span>
                    <span>"${escapeHtml(trechoA)}" (v.${numA}) ↔ "${escapeHtml(trechoB)}" (v.${numB})</span>
                    ${
                        diverge
                            ? `<span class="text-amber-600 dark:text-amber-400" title="Esse par não bate mais com a posição esperada pelo Esquema de Rimas atual — continua valendo, é só um aviso">⚠ fora do esquema atual</span>`
                            : ''
                    }
                </span>
                <span class="flex items-center gap-2 flex-shrink-0">
                    <button type="button" class="molde-btn-corrigir-rima text-blue-500 hover:underline" data-id="${par.id}">Corrigir</button>
                    <button type="button" class="molde-btn-remover-rima text-red-500 hover:underline" data-id="${par.id}">Remover</button>
                </span>
            </div>`;
        })
        .join('');

    return `<div class="flex flex-col gap-1 mt-3">${itens}</div>`;
}

function renderGradeMolde() {
    if (!containerEl) return;
    const linhasHtml = linhasAtuais.length
        ? linhasAtuais.map((linha, idx) => montarLinhaHtml(linha, idx)).join('')
        : '';
    // Numerada uma vez só aqui e reaproveitada por
    // renderListaParesRimaMolde (evita recalcular numerarLinhas() de
    // novo só pra exibir o número do verso de cada par).
    const linhasNumeradas = numerarLinhas(linhasAtuais);

    containerEl.innerHTML = `
        ${renderBarraFerramentasMolde()}
        ${
            linhasAtuais.length
                ? `<div class="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded">
            <table class="border-collapse w-full" style="table-layout:fixed;">
                <colgroup id="molde-grade-colgroup"></colgroup>
                <thead class="bg-gray-50 dark:bg-slate-800">
                    <tr id="molde-grade-header-row"></tr>
                </thead>
                <tbody id="molde-grade-body">${linhasHtml}</tbody>
            </table>
        </div>
        <div id="molde-lista-pares-rima">${renderListaParesRimaMolde(linhasNumeradas)}</div>`
                : `<p class="text-xs text-gray-400 dark:text-slate-500 py-3 text-center">Nenhum verso ainda — clique em "+ Verso" pra começar.</p>`
        }`;

    containerEl.querySelector('#molde-btn-add-verso').onclick = adicionarVersoMolde;
    containerEl.querySelector('#molde-btn-add-estrofe').onclick = adicionarQuebraEstrofeMolde;
    containerEl.querySelector('#molde-btn-modo-tonico').onclick = () => {
        modoTonico = !modoTonico;
        // Os dois modos são mutuamente exclusivos — ligar um desliga o
        // outro e descarta qualquer seleção de rima em curso (não dá
        // pra deixar um par "pela metade" persistindo escondido).
        if (modoTonico) {
            modoRima = false;
            selecaoRima = null;
        }
        renderGradeMolde();
    };
    containerEl.querySelector('#molde-btn-modo-rima')?.addEventListener('click', () => {
        modoRima = !modoRima;
        if (modoRima) modoTonico = false;
        else selecaoRima = null;
        renderGradeMolde();
    });
    containerEl
        .querySelector('#molde-btn-confirmar-rima')
        ?.addEventListener('click', confirmarParRimaMolde);
    containerEl
        .querySelector('#molde-btn-cancelar-rima')
        ?.addEventListener('click', cancelarSelecaoRimaMolde);
    containerEl.querySelector('#molde-btn-promover')?.addEventListener('click', () => {
        callbackPromoverMolde?.();
    });
    containerEl.querySelector('#molde-link-poema-promovido')?.addEventListener('click', () => {
        callbackAbrirPoema?.(poemaIdMoldeAtual);
    });
    containerEl.querySelectorAll('.molde-btn-remover').forEach((btn) => {
        btn.onclick = () => removerLinhaMolde(parseInt(btn.dataset.idx, 10));
    });
    containerEl.querySelectorAll('.molde-btn-remover-rima').forEach((btn) => {
        btn.onclick = () => removerParRimaMolde(btn.dataset.id);
    });
    containerEl.querySelectorAll('.molde-btn-corrigir-rima').forEach((btn) => {
        btn.onclick = () => iniciarCorrecaoParMolde(btn.dataset.id);
    });
    // Sem isso, digitar num verso não faz nada: nem grava o texto em
    // `linhasAtuais[idx].texto` (onInputTextoMolde é quem faz isso), nem
    // realça as barras, nem atualiza a contagem/grade silábica — mesmo
    // ponto em que editor-sonoridade.js anexa `onInputTexto` a cada
    // `.son-linha-texto` no fim do seu renderGrade(). innerHTML é
    // reconstruído a cada renderGradeMolde(), então os elementos (e
    // portanto o listener) são sempre recriados junto — não duplica em
    // renders seguintes.
    containerEl.querySelectorAll('.molde-linha-texto').forEach((el) => {
        el.addEventListener('input', onInputTextoMolde);
    });
    containerEl.querySelector('#molde-grade-body')?.addEventListener('click', onCliqueCelulaMolde);

    reconstruirColunasMolde();
    atualizarColunaAlvo();
    atualizarColunaRima();
}
