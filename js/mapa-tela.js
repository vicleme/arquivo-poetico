// ============================================================
// mapa-tela.js: a tela do mapa de calor das origens (SVG puro, sem biblioteca).
//
// `montarMapaOrigens(mapa, dados, opcoes)` devolve o elemento pronto: o mapa com
// zoom (roda do mouse, botões, arrastar, pinça no celular), a miniatura de
// referência, a legenda, a lista "sem lugar no mapa" e a tabela acessível.
// `dados` vem de `montarDadosDoMapa` (mapa-origens.js).
//
// opcoes: { escuro, aoAbrirOrigem(rotulo) }
// ============================================================

import { corDoPais, corDoPaisVazio, degrausDaLegenda, usarEscalaLog } from './mapa-escala.js';
import {
    centralizarEm,
    copiarVista,
    deslocarVista,
    nivelDeZoom,
    pontoDaMiniatura,
    retanguloNaMiniatura,
    zoomNoPonto,
} from './mapa-zoom.js';
import { DESENHOS_SEM_NOME, PAISES } from './mapa-paises.js';

const NS = 'http://www.w3.org/2000/svg';
let mapaEmCache = null;

// Lê o mapa-múndi uma vez. `buscar` existe para os testes.
export async function carregarMapaMundi(buscar = fetch, url = 'assets/mapa/mapa-mundi.json') {
    if (!mapaEmCache) {
        const resposta = await buscar(url);
        if (!resposta.ok) throw new Error('Não foi possível ler o mapa-múndi.');
        mapaEmCache = await resposta.json();
    }
    return mapaEmCache;
}

function el(nome, atributos = {}, texto = null, ns = false) {
    const e = ns ? document.createElementNS(NS, nome) : document.createElement(nome);
    Object.entries(atributos).forEach(([k, v]) => e.setAttribute(k, v));
    if (texto !== null) e.textContent = texto;
    return e;
}

function svg(nome, atributos, texto) {
    return el(nome, atributos, texto, true);
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function montarMapaOrigens(mapa, dados, opcoes = {}) {
    const escuro = !!opcoes.escuro;
    const base = { x: mapa.vista[0], y: mapa.vista[1], w: mapa.vista[2], h: mapa.vista[3] };
    const log = usarEscalaLog(dados.paises);
    const corVazia = corDoPaisVazio(escuro);

    // código do desenho -> país do app (um país pode pintar mais de um desenho)
    const porDesenho = new Map();
    dados.paises.forEach((p) => {
        const info = PAISES.find((x) => x.codigo === p.codigo);
        (info?.desenhos || [p.codigo]).forEach((d) => porDesenho.set(d, p));
    });

    const raiz = el('div', { class: 'mapa-origens' });
    raiz.style.cssText = 'position:relative;';

    const palco = el('div');
    palco.style.cssText = 'position:relative;overflow:hidden;border-radius:8px;touch-action:none;';
    const tela = svg('svg', {
        viewBox: `${base.x} ${base.y} ${base.w} ${base.h}`,
        role: 'img',
        'aria-label': 'Mapa de calor dos textos por país de origem da obra',
        width: '100%',
    });
    tela.style.cssText = 'display:block;width:100%;height:auto;cursor:grab;user-select:none;';
    const grupo = svg('g');
    mapa.paises.forEach((desenho) => {
        const pais = porDesenho.get(desenho.id);
        const sem = DESENHOS_SEM_NOME.includes(desenho.id);
        const caminho = svg('path', {
            d: desenho.d,
            fill: pais ? corDoPais(pais.textos, dados.maximo, { log, escuro }) : corVazia,
            stroke: escuro ? '#0f172a' : '#ffffff',
            'stroke-width': '0.6',
            'vector-effect': 'non-scaling-stroke',
            'data-desenho': desenho.id,
        });
        if (pais) {
            caminho.setAttribute('data-pais', pais.codigo);
            caminho.style.cursor = 'pointer';
        } else if (!sem) {
            caminho.setAttribute('data-sem-texto', '1');
        }
        grupo.appendChild(caminho);
    });
    tela.appendChild(grupo);
    palco.appendChild(tela);

    const dica = el('div');
    dica.style.cssText =
        'position:absolute;pointer-events:none;display:none;padding:2px 8px;font-size:11px;border-radius:6px;white-space:nowrap;' +
        (escuro ? 'background:#e2e8f0;color:#0f172a;' : 'background:#1f2937;color:#fff;');
    palco.appendChild(dica);

    // Miniatura de referência: o mundo inteiro, com a janela atual marcada.
    const mini = svg('svg', {
        viewBox: `${base.x} ${base.y} ${base.w} ${base.h}`,
        'aria-hidden': 'true',
    });
    mini.style.cssText =
        'position:absolute;left:8px;bottom:8px;width:22%;min-width:90px;height:auto;display:none;border-radius:4px;cursor:pointer;opacity:0.95;' +
        (escuro
            ? 'background:#1e293b;border:1px solid #475569;'
            : 'background:#fff;border:1px solid #cbd5e1;');
    const miniMundo = svg('g', { fill: escuro ? '#64748b' : '#cbd5e1' });
    mapa.paises.forEach((d) => miniMundo.appendChild(svg('path', { d: d.d })));
    const janela = svg('rect', {
        fill: 'none',
        stroke: '#7c3aed',
        'stroke-width': '2',
        'vector-effect': 'non-scaling-stroke',
    });
    mini.append(miniMundo, janela);
    palco.appendChild(mini);

    // Botões de zoom.
    const botoes = el('div');
    botoes.style.cssText =
        'position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:4px;';
    const estiloBotao =
        'width:28px;height:28px;border-radius:6px;font-size:16px;line-height:1;cursor:pointer;' +
        (escuro
            ? 'background:#1e293b;color:#e2e8f0;border:1px solid #475569;'
            : 'background:#fff;color:#374151;border:1px solid #cbd5e1;');
    const criarBotao = (rotulo, titulo) => {
        const b = el('button', { type: 'button', title: titulo, 'aria-label': titulo }, rotulo);
        b.style.cssText = estiloBotao;
        botoes.appendChild(b);
        return b;
    };
    const maisBtn = criarBotao('+', 'Aproximar');
    const menosBtn = criarBotao('\u2212', 'Afastar');
    const tudoBtn = criarBotao('\u2316', 'Voltar ao mundo todo');
    palco.appendChild(botoes);
    raiz.appendChild(palco);

    raiz.appendChild(
        el(
            'p',
            { class: 'text-[10px] text-gray-400 mt-1' },
            'Arraste e use a roda do mouse (ou os botões) para aproximar. Clique num país para abrir a lista dos textos.',
        ),
    );

    // Estado do zoom.
    let vista = copiarVista(base);
    const aplicar = () => {
        tela.setAttribute('viewBox', `${vista.x} ${vista.y} ${vista.w} ${vista.h}`);
        const r = retanguloNaMiniatura(vista, base);
        janela.setAttribute('x', String(base.x + r.x * base.w));
        janela.setAttribute('y', String(base.y + r.y * base.h));
        janela.setAttribute('width', String(r.w * base.w));
        janela.setAttribute('height', String(r.h * base.h));
        const aproximado = nivelDeZoom(vista, base) > 1.01;
        mini.style.display = aproximado ? 'block' : 'none';
        tela.style.cursor = aproximado ? 'grab' : 'default';
    };
    const pontoDoEvento = (e) => {
        const caixa = tela.getBoundingClientRect();
        const fx = caixa.width ? (e.clientX - caixa.left) / caixa.width : 0.5;
        const fy = caixa.height ? (e.clientY - caixa.top) / caixa.height : 0.5;
        return { x: vista.x + fx * vista.w, y: vista.y + fy * vista.h };
    };
    const centro = () => ({ x: vista.x + vista.w / 2, y: vista.y + vista.h / 2 });
    maisBtn.onclick = () => ((vista = zoomNoPonto(vista, base, 1.6, centro())), aplicar());
    menosBtn.onclick = () => ((vista = zoomNoPonto(vista, base, 1 / 1.6, centro())), aplicar());
    tudoBtn.onclick = () => ((vista = copiarVista(base)), aplicar());
    tela.addEventListener(
        'wheel',
        (e) => {
            e.preventDefault();
            vista = zoomNoPonto(vista, base, e.deltaY < 0 ? 1.25 : 1 / 1.25, pontoDoEvento(e));
            aplicar();
        },
        { passive: false },
    );

    // Arrastar (mouse e toque) e pinça.
    const ponteiros = new Map();
    let distanciaPinca = 0;
    let arrastou = false;
    tela.addEventListener('pointerdown', (e) => {
        ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        arrastou = false;
        if (ponteiros.size === 2) {
            const [a, b] = [...ponteiros.values()];
            distanciaPinca = Math.hypot(a.x - b.x, a.y - b.y);
        }
    });
    tela.addEventListener('pointermove', (e) => {
        const antes = ponteiros.get(e.pointerId);
        if (!antes) return;
        const caixa = tela.getBoundingClientRect();
        ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ponteiros.size === 2) {
            const [a, b] = [...ponteiros.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (distanciaPinca) {
                const meio = pontoDoEvento({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
                vista = zoomNoPonto(vista, base, d / distanciaPinca, meio);
                aplicar();
            }
            distanciaPinca = d;
            arrastou = true;
            return;
        }
        const dx = e.clientX - antes.x;
        const dy = e.clientY - antes.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) arrastou = true;
        if (nivelDeZoom(vista, base) > 1.01 && caixa.width) {
            vista = deslocarVista(
                vista,
                base,
                (-dx * vista.w) / caixa.width,
                (-dy * vista.h) / caixa.height,
            );
            aplicar();
        }
    });
    const soltar = (e) => {
        ponteiros.delete(e.pointerId);
        distanciaPinca = 0;
    };
    tela.addEventListener('pointerup', soltar);
    tela.addEventListener('pointercancel', soltar);

    // Clique na miniatura leva a janela até lá.
    mini.addEventListener('click', (e) => {
        const caixa = mini.getBoundingClientRect();
        if (!caixa.width) return;
        const alvo = pontoDaMiniatura(
            base,
            (e.clientX - caixa.left) / caixa.width,
            (e.clientY - caixa.top) / caixa.height,
        );
        vista = centralizarEm(vista, base, alvo);
        aplicar();
        e.stopPropagation();
    });

    // Passar o mouse e clicar num país.
    const paisDoAlvo = (e) => {
        const codigo = e.target?.getAttribute?.('data-pais');
        return codigo ? dados.paises.find((p) => p.codigo === codigo) : null;
    };
    tela.addEventListener('mousemove', (e) => {
        const pais = paisDoAlvo(e);
        if (!pais) {
            dica.style.display = 'none';
            return;
        }
        const caixa = palco.getBoundingClientRect();
        dica.textContent = `${pais.nome}: ${plural(pais.textos, 'texto', 'textos')}`;
        dica.style.left = `${e.clientX - caixa.left + 12}px`;
        dica.style.top = `${e.clientY - caixa.top + 12}px`;
        dica.style.display = 'block';
    });
    tela.addEventListener('mouseleave', () => (dica.style.display = 'none'));
    tela.addEventListener('click', (e) => {
        if (arrastou) return;
        const pais = paisDoAlvo(e);
        if (pais && opcoes.aoAbrirOrigem) opcoes.aoAbrirOrigem(pais.rotulos[0]);
    });

    // Legenda.
    const degraus = degrausDaLegenda(dados.maximo, { log, escuro });
    if (degraus.length) {
        const legenda = el('div', { class: 'text-[10px] text-gray-500 dark:text-slate-400 mt-2' });
        legenda.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
        legenda.appendChild(el('span', {}, 'Textos:'));
        degraus.forEach((d) => {
            const caixa = el('span', {});
            caixa.style.cssText = 'display:inline-flex;align-items:center;gap:3px;';
            const amostra = el('span', {});
            amostra.style.cssText = `display:inline-block;width:14px;height:10px;border-radius:2px;background:${d.cor};`;
            caixa.append(amostra, el('span', {}, String(d.textos)));
            legenda.appendChild(caixa);
        });
        if (log) legenda.appendChild(el('span', {}, '(escala logarítmica)'));
        raiz.appendChild(legenda);
    }

    // Fora do mapa: nada some em silêncio.
    const fora = [];
    if (dados.desconhecida.textos) {
        fora.push({
            rotulo: dados.desconhecida.rotulos[0],
            nome: 'Desconhecida',
            textos: dados.desconhecida.textos,
        });
    }
    dados.semLugar.forEach((s) =>
        fora.push({ rotulo: s.rotulo, nome: s.rotulo, textos: s.textos }),
    );
    if (fora.length) {
        const bloco = el('div', { class: 'text-[11px] text-gray-500 dark:text-slate-400 mt-2' });
        const total = fora.reduce((soma, f) => soma + f.textos, 0);
        bloco.appendChild(
            el('span', {}, `Sem lugar no mapa (${plural(total, 'texto', 'textos')}): `),
        );
        fora.forEach((f, i) => {
            const b = el(
                'button',
                { type: 'button', title: 'Abrir a lista dos textos' },
                `${f.nome} (${f.textos})`,
            );
            b.style.cssText =
                'text-decoration:underline;cursor:pointer;background:none;border:0;padding:0;color:inherit;';
            b.onclick = () => opcoes.aoAbrirOrigem && opcoes.aoAbrirOrigem(f.rotulo);
            bloco.appendChild(b);
            if (i < fora.length - 1) bloco.appendChild(document.createTextNode(', '));
        });
        raiz.appendChild(bloco);
    }

    // Alternativa em tabela, porque só a cor não diz o valor exato.
    if (dados.paises.length) {
        const detalhes = el('details', {
            class: 'text-[11px] text-gray-500 dark:text-slate-400 mt-2',
        });
        detalhes.appendChild(el('summary', {}, 'Ver como tabela'));
        const tabela = el('table');
        tabela.style.cssText = 'margin-top:4px;border-collapse:collapse;';
        dados.paises.forEach((p) => {
            const linha = el('tr');
            linha.append(el('td', {}, p.nome), el('td', {}, String(p.textos)));
            linha.firstChild.style.cssText = 'padding:1px 12px 1px 0;';
            tabela.appendChild(linha);
        });
        detalhes.appendChild(tabela);
        raiz.appendChild(detalhes);
    }

    aplicar();
    // Para a exportação pegar o enquadramento atual (ou null, com o mundo todo à mostra).
    raiz.obterVista = () => (nivelDeZoom(vista, base) > 1.01 ? copiarVista(vista) : null);
    return raiz;
}
