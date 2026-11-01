// ============================================================
// mapa-zoom.js: lógica pura do zoom e do arrastar do mapa de calor.
//
// A "vista" é a janela do SVG que está na tela: { x, y, w, h }, no mesmo plano
// da `base` (o mundo inteiro, `vista` do mapa-mundi.json). Aproximar é só
// encolher a janela; nada é recalculado no desenho. A vista nunca sai da base.
// ============================================================

export const ZOOM_MAXIMO = 40;

export function copiarVista(v) {
    return { x: v.x, y: v.y, w: v.w, h: v.h };
}

// A vista cabe dentro da base: é o que impede de arrastar o mapa para o vazio.
export function manterDentro(vista, base) {
    const v = copiarVista(vista);
    v.w = Math.min(v.w, base.w);
    v.h = Math.min(v.h, base.h);
    v.x = Math.min(Math.max(v.x, base.x), base.x + base.w - v.w);
    v.y = Math.min(Math.max(v.y, base.y), base.y + base.h - v.h);
    return v;
}

// 1 = mundo inteiro; 2 = metade da largura na tela.
export function nivelDeZoom(vista, base) {
    return base.w / vista.w;
}

// Aproxima (fator > 1) ou afasta (fator < 1) mantendo `ponto` ({x, y} no plano)
// parado na tela, como a roda do mouse faz nos mapas.
export function zoomNoPonto(vista, base, fator, ponto) {
    const nivel = Math.min(ZOOM_MAXIMO, Math.max(1, nivelDeZoom(vista, base) * fator));
    const w = base.w / nivel;
    const h = base.h / nivel;
    const fx = (ponto.x - vista.x) / vista.w;
    const fy = (ponto.y - vista.y) / vista.h;
    return manterDentro({ x: ponto.x - fx * w, y: ponto.y - fy * h, w, h }, base);
}

export function deslocarVista(vista, base, dx, dy) {
    return manterDentro({ ...vista, x: vista.x + dx, y: vista.y + dy }, base);
}

export function centralizarEm(vista, base, ponto) {
    return manterDentro({ ...vista, x: ponto.x - vista.w / 2, y: ponto.y - vista.h / 2 }, base);
}

// Aproxima até enquadrar uma caixa {x, y, w, h}, com folga.
export function enquadrar(base, caixa, folga = 1.6) {
    const nivel = Math.min(
        ZOOM_MAXIMO,
        Math.max(1, Math.min(base.w / (caixa.w * folga), base.h / (caixa.h * folga))),
    );
    const w = base.w / nivel;
    const h = base.h / nivel;
    return manterDentro(
        { x: caixa.x + caixa.w / 2 - w / 2, y: caixa.y + caixa.h / 2 - h / 2, w, h },
        base,
    );
}

// O retângulo da vista dentro da miniatura, em frações de 0 a 1 da base.
export function retanguloNaMiniatura(vista, base) {
    return {
        x: (vista.x - base.x) / base.w,
        y: (vista.y - base.y) / base.h,
        w: vista.w / base.w,
        h: vista.h / base.h,
    };
}

// Um ponto da miniatura (frações de 0 a 1) no plano da base.
export function pontoDaMiniatura(base, fx, fy) {
    return { x: base.x + fx * base.w, y: base.y + fy * base.h };
}
