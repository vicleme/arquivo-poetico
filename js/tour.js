// ============================================================
// tour.js — motor do tour do Modo Aprendizado (Bloco 2).
//
// Desenha uma camada escura com um "buraco" em cima de um elemento REAL da
// tela e um cartão explicando o que ele faz. Não guarda imagem nenhuma:
// a posição vem de getBoundingClientRect() do elemento no momento, então
// se o layout mudar o destaque acompanha. O risco é o id mudar de nome;
// tests/tour-passos.test.js confere que todo seletor existe no index.html.
//
// A camada NÃO bloqueia a página (pointer-events: none no destaque), pra
// quem quiser clicar de verdade no elemento destacado. Só o cartão recebe
// clique. Sem biblioteca externa, mesmo espírito do resto do app.
//
// Os DADOS dos roteiros ficam em tour-passos.js; aqui só a mecânica.
// Navegação entre abas é injetada por main.js (definirNavegacaoTour) pra
// este módulo não depender de ui.js e continuar fácil de testar.
// ============================================================

const ID_DESTAQUE = 'tour-destaque';
const ID_CARTAO = 'tour-cartao';
const FOLGA = 12; // respiro entre o elemento, o cartão e a borda da tela
const PADDING_DESTAQUE = 6; // o destaque é um pouco maior que o elemento
const LARGURA_CARTAO = 340;
const ALTURA_CARTAO_FALLBACK = 200; // se o navegador não devolver a altura medida

let navegacao = null; // (idAba) => void, definida por main.js
let estado = null; // null = tour fechado

export function definirNavegacaoTour(fn) {
    navegacao = typeof fn === 'function' ? fn : null;
}

export function tourAtivo() {
    return estado !== null;
}

// ─── Posicionamento (puro) ───────────────────────────────────

function limitar(valor, minimo, maximo) {
    return Math.min(Math.max(valor, minimo), maximo);
}

// Onde pôr o cartão. `alvo` é o retângulo (já com o padding do destaque)
// ou null quando não há elemento visível pra apontar. Prefere abaixo do
// alvo, depois acima, e por último cola no rodapé da tela. Sem alvo,
// centraliza. Nunca sai da tela na horizontal.
export function calcularPosicaoCartao(alvo, cartao, viewport, folga = FOLGA) {
    const maxLeft = Math.max(folga, viewport.largura - cartao.largura - folga);

    if (!alvo) {
        return {
            top: Math.round(Math.max(folga, (viewport.altura - cartao.altura) / 2)),
            left: Math.round(Math.max(folga, (viewport.largura - cartao.largura) / 2)),
        };
    }

    const left = Math.round(limitar(alvo.left, folga, maxLeft));

    const abaixo = alvo.bottom + folga;
    if (abaixo + cartao.altura + folga <= viewport.altura) {
        return { top: Math.round(abaixo), left };
    }

    const acima = alvo.top - folga - cartao.altura;
    if (acima >= folga) return { top: Math.round(acima), left };

    return { top: Math.round(Math.max(folga, viewport.altura - cartao.altura - folga)), left };
}

// ─── Alvo do passo ───────────────────────────────────────────

function retanguloVisivel(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
}

// Primeiro seletor (principal, depois o alternativo) cujo elemento existe e
// tem tamanho na tela. No celular os botões de grupo da nav estão com
// display:none (tamanho zero), então o passo cai pro ☰. Sem nenhum visível,
// devolve null e o cartão aparece centralizado, sem destaque.
export function resolverAlvo(passo) {
    const candidatos = [passo.seletor, passo.seletorAlternativo].filter(Boolean);
    for (const seletor of candidatos) {
        const el = document.querySelector(seletor);
        if (el && retanguloVisivel(el)) return el;
    }
    return null;
}

// ─── Montagem do DOM ─────────────────────────────────────────

function criar(tag, { id, classe, texto, tipo } = {}) {
    const el = document.createElement(tag);
    if (id) el.id = id;
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    if (tipo) el.type = tipo;
    return el;
}

const CLASSE_BOTAO_PRIMARIO = 'bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold';
const CLASSE_BOTAO_SECUNDARIO = 'text-gray-600 dark:text-slate-300 px-3 py-1.5 text-sm';

function montarCamada() {
    const destaque = criar('div', { id: ID_DESTAQUE });
    destaque.setAttribute('aria-hidden', 'true');
    destaque.style.cssText =
        'position:fixed;pointer-events:none;z-index:60;border-radius:8px;display:none;' +
        'box-shadow:0 0 0 9999px rgba(15,23,42,0.55),0 0 0 3px #3b82f6;';

    const cartao = criar('div', {
        id: ID_CARTAO,
        classe: 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700 rounded-lg shadow-2xl p-4 text-sm',
    });
    cartao.setAttribute('role', 'dialog');
    cartao.setAttribute('aria-label', 'Tour do Modo Aprendizado');
    cartao.tabIndex = -1;
    cartao.style.cssText = `position:fixed;z-index:61;top:0;left:0;width:${LARGURA_CARTAO}px;max-width:calc(100vw - ${FOLGA * 2}px);`;

    const topo = criar('div', { classe: 'flex items-center justify-between mb-2' });
    topo.append(
        criar('span', {
            id: 'tour-progresso',
            classe: 'text-xs text-gray-500 dark:text-slate-400',
        }),
        criar('button', {
            id: 'tour-pular',
            tipo: 'button',
            texto: 'Pular tour',
            classe: 'text-xs text-gray-500 dark:text-slate-400 underline',
        }),
    );

    const rodape = criar('div', { classe: 'flex items-center justify-between gap-2 mt-4' });
    rodape.append(
        criar('button', {
            id: 'tour-anterior',
            tipo: 'button',
            texto: 'Anterior',
            classe: CLASSE_BOTAO_SECUNDARIO,
        }),
        criar('button', {
            id: 'tour-proximo',
            tipo: 'button',
            texto: 'Próximo',
            classe: CLASSE_BOTAO_PRIMARIO,
        }),
    );

    cartao.append(
        topo,
        criar('h4', { id: 'tour-titulo', classe: 'font-bold text-base mb-1' }),
        criar('p', { id: 'tour-texto', classe: 'text-gray-600 dark:text-slate-300' }),
        criar('button', {
            id: 'tour-extra',
            tipo: 'button',
            classe: 'hidden mt-3 text-sm text-blue-600 dark:text-blue-400 underline text-left',
        }),
        rodape,
    );

    return { destaque, cartao };
}

const $ = (id) => document.getElementById(id);

// ─── Renderização de um passo ────────────────────────────────

function abaAtiva() {
    return document.querySelector('.tab-content.active')?.id || null;
}

function posicionar() {
    if (!estado) return;
    const { destaque, cartao } = estado;
    const alvo = estado.alvo && document.body.contains(estado.alvo) ? estado.alvo : null;
    const r = alvo ? retanguloVisivel(alvo) : null;

    let retAlvo = null;
    if (r) {
        retAlvo = {
            top: r.top - PADDING_DESTAQUE,
            left: r.left - PADDING_DESTAQUE,
            width: r.width + PADDING_DESTAQUE * 2,
            height: r.height + PADDING_DESTAQUE * 2,
        };
        retAlvo.bottom = retAlvo.top + retAlvo.height;
        retAlvo.right = retAlvo.left + retAlvo.width;
        destaque.style.display = 'block';
        destaque.style.top = `${Math.round(retAlvo.top)}px`;
        destaque.style.left = `${Math.round(retAlvo.left)}px`;
        destaque.style.width = `${Math.round(retAlvo.width)}px`;
        destaque.style.height = `${Math.round(retAlvo.height)}px`;
    } else {
        destaque.style.display = 'none';
    }

    const medida = cartao.getBoundingClientRect();
    const pos = calcularPosicaoCartao(
        retAlvo,
        {
            largura: medida.width || LARGURA_CARTAO,
            altura: medida.height || ALTURA_CARTAO_FALLBACK,
        },
        { largura: window.innerWidth, altura: window.innerHeight },
    );
    cartao.style.top = `${pos.top}px`;
    cartao.style.left = `${pos.left}px`;
}

function agendarReposicionamento() {
    if (!estado || estado.quadroPendente) return;
    estado.quadroPendente = true;
    requestAnimationFrame(() => {
        if (!estado) return;
        estado.quadroPendente = false;
        posicionar();
    });
}

function rolarAteOAlvo(el) {
    const r = el.getBoundingClientRect();
    const cabe = r.top >= 0 && r.bottom <= window.innerHeight;
    if (!cabe && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
}

export function irParaPasso(indice) {
    if (!estado) return;
    const passo = estado.passos[indice];
    if (!passo) return;
    estado.indice = indice;

    if (passo.aba && navegacao) navegacao(passo.aba);

    estado.alvo = resolverAlvo(passo);
    if (estado.alvo) rolarAteOAlvo(estado.alvo);

    const ultimo = indice === estado.passos.length - 1;
    $('tour-progresso').textContent = `${indice + 1} de ${estado.passos.length}`;
    $('tour-titulo').textContent = passo.titulo;
    $('tour-texto').textContent = passo.texto;

    $('tour-anterior').classList.toggle('hidden', indice === 0);
    $('tour-proximo').textContent = ultimo ? 'Concluir' : 'Próximo';
    // No último passo o "Concluir" já sai do tour; um "Pular" ao lado seria redundante.
    $('tour-pular').classList.toggle('hidden', ultimo);

    const extra = $('tour-extra');
    const mostrarExtra = ultimo && estado.extra !== null;
    extra.classList.toggle('hidden', !mostrarExtra);
    extra.textContent = mostrarExtra ? `Ver também o roteiro de ${estado.extra.rotulo}` : '';

    posicionar();
    $('tour-proximo').focus();
}

export function proximoPasso() {
    if (!estado) return;
    if (estado.indice >= estado.passos.length - 1) {
        encerrarTour();
        return;
    }
    irParaPasso(estado.indice + 1);
}

export function passoAnterior() {
    if (!estado || estado.indice === 0) return;
    irParaPasso(estado.indice - 1);
}

// Fim do roteiro principal: troca pros passos do outro perfil (só os
// próprios dele, os comuns a pessoa já viu). Não muda o perfil salvo.
function trocarParaRoteiroExtra() {
    if (!estado || !estado.extra) return;
    estado.passos = estado.extra.passos;
    estado.extra = null;
    irParaPasso(0);
}

// ─── Ciclo de vida ───────────────────────────────────────────

function aoTeclar(e) {
    if (e.key === 'Escape') encerrarTour();
}

// `passos`: roteiro principal. `extra` (opcional): { rotulo, passos } do
// outro perfil, oferecido no último passo. Devolve false se não há passos.
export function iniciarTour({ passos, extra = null }) {
    if (!Array.isArray(passos) || passos.length === 0) return false;
    if (estado) encerrarTour();

    const { destaque, cartao } = montarCamada();
    document.body.append(destaque, cartao);

    estado = {
        passos,
        extra: extra && extra.passos?.length ? extra : null,
        indice: 0,
        alvo: null,
        destaque,
        cartao,
        abaOriginal: abaAtiva(),
        focoOriginal: document.activeElement,
        quadroPendente: false,
    };

    $('tour-proximo').addEventListener('click', proximoPasso);
    $('tour-anterior').addEventListener('click', passoAnterior);
    $('tour-pular').addEventListener('click', () => encerrarTour());
    $('tour-extra').addEventListener('click', trocarParaRoteiroExtra);

    document.addEventListener('keydown', aoTeclar);
    window.addEventListener('resize', agendarReposicionamento);
    document.addEventListener('scroll', agendarReposicionamento, true);

    irParaPasso(0);
    return true;
}

// Fecha o tour e devolve a pessoa pra aba em que estava (alguns passos
// abrem outras abas). Idempotente: chamar sem tour aberto não faz nada.
export function encerrarTour() {
    if (!estado) return;
    const { destaque, cartao, abaOriginal, focoOriginal } = estado;
    estado = null;

    document.removeEventListener('keydown', aoTeclar);
    window.removeEventListener('resize', agendarReposicionamento);
    document.removeEventListener('scroll', agendarReposicionamento, true);
    destaque.remove();
    cartao.remove();

    if (abaOriginal && abaAtiva() !== abaOriginal && navegacao) navegacao(abaOriginal);
    if (focoOriginal && document.body.contains(focoOriginal) && focoOriginal.focus) {
        focoOriginal.focus();
    }
}
