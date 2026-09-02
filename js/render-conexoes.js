// ============================================================
// render-conexoes.js — Aba "Conexões" (item 10 do plano de schema).
// Visão computada sobre Elos e Referências: não é dona de nenhum
// dado (sem db.relacoes[], sem migração) — varre db.poemas inteiro e
// monta a tela na hora, mesmo princípio de estatisticas.js. O campo
// no modal e a coluna na tabela continuam sendo a fonte de verdade;
// esta aba é só uma lente adicional sobre o mesmo dado.
//
// Elos (bilateral: { id, relacao, direcao, texto }) podem formar
// pares e clusters, tecnicamente com ciclo (A Díptico com B, B com C,
// C com A) — tratados como grafo não-direcionado, agrupados em
// componentes conexos.
//
// Referências (unidirecional, sempre mais novo → mais antigo:
// { id, tipo, texto }) formam grafos direcionados sem ciclo — mas
// "sem ciclo" não é o mesmo que "sem ramificação nem convergência":
// um poema pode referenciar vários outros (ramifica), e vários poemas
// podem referenciar o mesmo poema (converge — ex.: "Garoto Café"
// sendo o pano de fundo comum de três textos diferentes). Uma
// primeira versão desta tela modelava isso como árvore, e toda
// convergência virava nó duplicado (o mesmo poema aparecendo várias
// vezes, uma por caminho que chega nele) — resolvido reescrevendo pra
// um diagrama de grafo de verdade: cada poema é um nó único, com uma
// aresta chegando de cada origem que o referencia (ver
// montarGrafosReferencias/renderDiagramaReferencias abaixo). Quando o
// grafo é mesmo uma cadeia simples (sem ramificar nem convergir em
// ponto nenhum — o caso comum), a exibição colapsa numa linha reta em
// vez do diagrama, que seria over-engineering pra esse caso.
//
// Ainda só cobre Poema — Prosa não tem `conceitos` até o item 4 do
// plano de schema.
// ============================================================

import { db } from './db.js';
import { escapeHtml, rotuloElo } from './utils.js';

// ─── Buracos: Elos com só um lado cadastrado ───────────────────
// Mesmo critério do painel derivado do modal (elosDerivados em
// editor.js), só que pra todos os poemas de uma vez: pra cada elo
// registrado de A pra B, se B não tem um elo de volta pra A, é um
// buraco. Cada buraco aparece exatamente uma vez (a partir do lado
// que tem o registro), já com o rótulo real gravado nesse lado — o
// mesmo que aparece na lista de Elos do modal de A.
export function calcularBuracos() {
    const buracos = [];
    for (const poema of db.poemas) {
        for (const elo of poema.conceitos?.elos || []) {
            const alvo = db.poemas.find((p) => p.id == elo.id);
            if (!alvo) continue; // poema removido — já sinalizado no próprio modal, não é um "buraco" de reciprocidade
            const alvoLigaDeVolta = (alvo.conceitos?.elos || []).some((e) => e.id == poema.id);
            if (alvoLigaDeVolta) continue;
            buracos.push({
                deId: poema.id,
                deTitulo: poema.titulo,
                paraId: alvo.id,
                paraTitulo: alvo.titulo,
                rotulo: elo.relacao ? rotuloElo(elo.relacao, elo.direcao) : '',
            });
        }
    }
    return buracos;
}

// ─── Elos: pares e clusters (componentes conexos) ──────────────
// Cada elo registrado vira uma aresta não-direcionada entre os dois
// poemas envolvidos (poema removido é ignorado, mesmo critério de
// calcularBuracos — não faz sentido montar cluster com um nó
// fantasma). Componentes de tamanho 2 são "pares"; tamanho 3+ são
// "clusters". Um par pode ter 1 ou 2 arestas (1 = ainda é um buraco,
// já sinalizado acima; aqui mostramos o que existe, com o rótulo de
// cada lado que estiver registrado).
export function agruparElos() {
    const arestas = [];
    for (const poema of db.poemas) {
        for (const elo of poema.conceitos?.elos || []) {
            const alvo = db.poemas.find((p) => p.id == elo.id);
            if (!alvo) continue;
            arestas.push({
                aId: poema.id,
                aTitulo: poema.titulo,
                bId: alvo.id,
                bTitulo: alvo.titulo,
                rotulo: elo.relacao ? rotuloElo(elo.relacao, elo.direcao) : '',
            });
        }
    }
    if (!arestas.length) return [];

    const adj = new Map();
    const addAdj = (x, y) => {
        if (!adj.has(x)) adj.set(x, new Set());
        adj.get(x).add(y);
    };
    arestas.forEach((a) => {
        addAdj(a.aId, a.bId);
        addAdj(a.bId, a.aId);
    });

    const visitados = new Set();
    const clusters = [];
    for (const raiz of adj.keys()) {
        if (visitados.has(raiz)) continue;
        const fila = [raiz];
        const componente = new Set([raiz]);
        visitados.add(raiz);
        while (fila.length) {
            const atual = fila.shift();
            for (const vizinho of adj.get(atual) || []) {
                if (!visitados.has(vizinho)) {
                    visitados.add(vizinho);
                    componente.add(vizinho);
                    fila.push(vizinho);
                }
            }
        }
        const arestasDoComponente = arestas.filter(
            (a) => componente.has(a.aId) && componente.has(a.bId),
        );
        clusters.push({
            ids: [...componente],
            tamanho: componente.size,
            arestas: arestasDoComponente,
        });
    }
    clusters.sort((a, b) => b.tamanho - a.tamanho);
    return clusters;
}

// ─── Referências: grafos (grafo direcionado, mais novo → mais antigo) ──
// Cada componente fracamente conexo (mesmo critério de BFS de
// agruparElos, mas sobre as arestas de Referências) vira um grafo
// independente. Dentro de cada um, os nós são organizados em
// "camadas" (colunas): a camada de um nó é 1 + a maior camada entre
// seus predecessores — não a menor. Isso é o que faz uma aresta-atalho
// (ex.: A → D direto, além de A → B → C → D) não puxar D pra perto de
// A: D só fecha camada depois que B e C também fecharem, então ele
// fica na coluna mais funda, coerente com o caminho mais longo até
// ele. É a técnica padrão de "longest-path layering" (primeiro passo
// de um layout Sugiyama), implementada aqui como uma variante de Kahn:
// a cada rodada, todo nó cujas entradas já foram processadas entra na
// camada da vez.
//
// Ciclo (não esperado pela natureza da relação, mas o dado não
// garante que não aconteça): se sobrar algum nó sem entrada zerada, o
// de menor entrada restante é forçado pra camada atual mesmo assim —
// quebra o ciclo sem travar e sem sumir com nó nenhum (mesmo espírito
// de resiliência que já existia aqui antes, só que agora sobre
// camadas em vez de sobre árvore).
export function montarGrafosReferencias() {
    const arestas = [];
    const titulos = new Map();
    for (const poema of db.poemas) {
        for (const ref of poema.conceitos?.referencias || []) {
            const alvo = db.poemas.find((p) => p.id == ref.id);
            if (!alvo) continue;
            arestas.push({
                deId: poema.id,
                deTitulo: poema.titulo,
                paraId: alvo.id,
                paraTitulo: alvo.titulo,
                tipo: ref.tipo || '',
            });
            titulos.set(poema.id, poema.titulo);
            titulos.set(alvo.id, alvo.titulo);
        }
    }
    if (!arestas.length) return [];

    // Componentes fracamente conexos.
    const adjND = new Map();
    const addAdjND = (x, y) => {
        if (!adjND.has(x)) adjND.set(x, new Set());
        adjND.get(x).add(y);
    };
    arestas.forEach((a) => {
        addAdjND(a.deId, a.paraId);
        addAdjND(a.paraId, a.deId);
    });

    const visitados = new Set();
    const componentes = [];
    for (const raiz of adjND.keys()) {
        if (visitados.has(raiz)) continue;
        const fila = [raiz];
        const ids = new Set([raiz]);
        visitados.add(raiz);
        while (fila.length) {
            const atual = fila.shift();
            for (const vizinho of adjND.get(atual) || []) {
                if (!visitados.has(vizinho)) {
                    visitados.add(vizinho);
                    ids.add(vizinho);
                    fila.push(vizinho);
                }
            }
        }
        componentes.push([...ids]);
    }

    const grafos = componentes.map((ids) => montarGrafoComponente(ids, arestas, titulos));
    grafos.sort((a, b) => b.nos.length - a.nos.length);
    return grafos;
}

function montarGrafoComponente(ids, todasArestas, titulos) {
    const idSet = new Set(ids);
    const arestas = todasArestas.filter((a) => idSet.has(a.deId) && idSet.has(a.paraId));

    const grauEntrada = new Map(ids.map((id) => [id, 0]));
    const saida = new Map(ids.map((id) => [id, []]));
    arestas.forEach((a) => {
        saida.get(a.deId).push(a);
        grauEntrada.set(a.paraId, grauEntrada.get(a.paraId) + 1);
    });

    const camadas = [];
    const restante = new Set(ids);
    while (restante.size) {
        let prontos = [...restante].filter((id) => grauEntrada.get(id) === 0);
        if (!prontos.length) {
            // Ciclo puro: nenhum nó com entrada zerada. Força o de menor
            // entrada restante pra abrir a próxima camada mesmo assim.
            prontos = [
                [...restante].reduce((min, id) =>
                    grauEntrada.get(id) < grauEntrada.get(min) ? id : min,
                ),
            ];
        }
        prontos.forEach((id) => {
            restante.delete(id);
            saida.get(id).forEach((a) => {
                if (restante.has(a.paraId)) {
                    grauEntrada.set(a.paraId, Math.max(0, grauEntrada.get(a.paraId) - 1));
                }
            });
        });
        camadas.push(prontos);
    }

    ordenarCamadas(camadas, arestas);

    const nos = camadas.flat().map((id) => ({ id, titulo: titulos.get(id) }));

    // "Linear" = cadeia simples, sem ramificação nem convergência (uma
    // camada por nó, e o número de arestas bate com o de um caminho
    // simples — nós-1). Só nesse caso a exibição em linha reta é
    // suficiente; qualquer ramificação ou convergência real (inclusive
    // um ciclo de 2 nós, que tecnicamente teria 1 nó por camada mas 2
    // arestas em vez de 1) cai no diagrama, que não esconde nada.
    const linear = arestas.length === nos.length - 1 && camadas.every((c) => c.length === 1);

    return { nos, arestas, camadas, linear };
}

// Heurística de baricentro (uma passada left-to-right, suficiente pra
// grafos pequenos de uso pessoal): ordena cada camada pela posição
// média dos predecessores já posicionados nas camadas anteriores, pra
// reduzir cruzamento de arestas no desenho. Não é ótimo global — essa
// minimização de cruzamentos é NP-difícil de verdade —, só uma
// aproximação razoável pro tamanho de grafo que este acervo tem.
function ordenarCamadas(camadas, arestas) {
    const posicao = new Map();
    (camadas[0] || []).forEach((id, i) => posicao.set(id, i));
    for (let c = 1; c < camadas.length; c++) {
        const baricentro = new Map(
            camadas[c].map((id) => {
                const preds = arestas
                    .filter((a) => a.paraId === id && posicao.has(a.deId))
                    .map((a) => posicao.get(a.deId));
                return [
                    id,
                    preds.length ? preds.reduce((s, p) => s + p, 0) / preds.length : Infinity,
                ];
            }),
        );
        camadas[c].sort((a, b) => baricentro.get(a) - baricentro.get(b));
        camadas[c].forEach((id, i) => posicao.set(id, i));
    }
}

// ─── Render DOM ─────────────────────────────────────────────────

function tituloClicavel(id, titulo, corClasse = '') {
    return `<span class="cursor-pointer hover:underline ${corClasse}" data-action="editar-poema" data-id="${id}">${escapeHtml(titulo)}</span>`;
}

function badge(rotulo, corClasse) {
    if (!rotulo) return '';
    return `<span class="inline-block px-1.5 py-0.5 rounded ${corClasse} text-[10px] font-bold uppercase align-middle">${escapeHtml(rotulo)}</span>`;
}

function renderBuracos() {
    const container = document.getElementById('conexoes-buracos');
    if (!container) return;
    const buracos = calcularBuracos();
    if (!buracos.length) {
        container.innerHTML =
            '<p class="text-sm text-gray-400 dark:text-slate-500">Nenhum buraco encontrado — todo Elo bilateral registrado tem os dois lados.</p>';
        return;
    }
    container.innerHTML = buracos
        .map(
            (b) => `
        <div class="flex flex-wrap items-center gap-2 py-1.5 text-sm border-b border-gray-100 dark:border-slate-800 last:border-0">
            ${tituloClicavel(b.deId, b.deTitulo)}
            ${badge(b.rotulo, 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300')}
            <span class="text-gray-300 dark:text-slate-600">→</span>
            ${tituloClicavel(b.paraId, b.paraTitulo, 'text-amber-600 dark:text-amber-400')}
            <span class="text-[11px] text-gray-400 dark:text-slate-500 italic">(falta o vínculo de volta)</span>
        </div>`,
        )
        .join('');
}

function renderClusterElo(cluster) {
    const linhas = cluster.arestas
        .map(
            (a) => `
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
            ${tituloClicavel(a.aId, a.aTitulo)}
            ${badge(a.rotulo, 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300')}
            <span class="text-gray-300 dark:text-slate-600">↔</span>
            ${tituloClicavel(a.bId, a.bTitulo)}
        </div>`,
        )
        .join('');
    const rotuloTamanho = cluster.tamanho === 2 ? 'Par' : `Cluster (${cluster.tamanho} poemas)`;
    return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
            <div class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500 mb-2">${rotuloTamanho}</div>
            <div class="space-y-1.5">${linhas}</div>
        </div>`;
}

function renderElos() {
    const container = document.getElementById('conexoes-elos');
    if (!container) return;
    const clusters = agruparElos();
    if (!clusters.length) {
        container.innerHTML =
            '<p class="text-sm text-gray-400 dark:text-slate-500 col-span-full">Nenhum Elo cadastrado ainda.</p>';
        return;
    }
    container.innerHTML = clusters.map(renderClusterElo).join('');
}

// Cadeia simples (uma camada por nó): mesma exibição compacta em linha
// reta que a aba já tinha, reaproveitada aqui — sem ramificação nem
// convergência não há repetição possível, então o diagrama de caixas
// seria over-engineering pra esse caso comum.
function renderPassosLineares(grafo) {
    const passos = grafo.camadas.map((c) => c[0]);
    return passos
        .map((id, i) => {
            const no = grafo.nos.find((n) => n.id === id);
            if (i === 0) return tituloClicavel(id, no.titulo);
            const aresta = grafo.arestas.find((a) => a.deId === passos[i - 1] && a.paraId === id);
            const seta = '<span class="text-gray-300 dark:text-slate-600 mx-1">→</span>';
            const rotulo = aresta?.tipo
                ? badge(
                      aresta.tipo,
                      'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-700 dark:text-fuchsia-300',
                  ) + seta
                : '';
            return `${seta}${rotulo}${tituloClicavel(id, no.titulo)}`;
        })
        .join('');
}

// ─── Diagrama de grafo (caso ramifica/converge) ────────────────────
// SVG puro, sem lib de layout (o projeto não tem nenhuma dependência
// de terceiros pra isso) — as posições vêm das camadas calculadas em
// montarGrafosReferencias/montarGrafoComponente. Medição de texto via
// canvas offscreen (memoizado) em vez de estimativa por caractere,
// porque títulos de poema variam muito em largura e uma estimativa
// ruim ou estoura a caixa ou desperdiça espaço.

const DIAGRAMA_NO_LARGURA = 190;
const DIAGRAMA_NO_PAD_X = 10;
const DIAGRAMA_NO_PAD_Y = 8;
const DIAGRAMA_LINHA_ALTURA = 14;
const DIAGRAMA_NO_ALTURA_MIN = 36;
const DIAGRAMA_COL_GAP = 100;
const DIAGRAMA_LINHA_GAP = 16;
const DIAGRAMA_MARGEM = 20;
const DIAGRAMA_FAIXA_ATALHO_ALTURA_MIN = 26;
const DIAGRAMA_FONTE_TITULO = '600 11px ui-sans-serif, system-ui, sans-serif';
const DIAGRAMA_FONTE_ROTULO = '700 9px ui-sans-serif, system-ui, sans-serif';
// Acima dessa largura (numa linha só), o rótulo quebra em até 2 linhas
// em vez de esticar a caixinha — mais legível que uma pílula enorme e
// deixa o vão entre colunas mais compacto.
const DIAGRAMA_ROTULO_LARGURA_MAX = 120;
const DIAGRAMA_ROTULO_LINHA_ALTURA = 11;
const DIAGRAMA_ROTULO_PAD_X = 6;
const DIAGRAMA_ROTULO_PAD_Y = 4;

let _ctxMedicao = null;
function ctxMedicao() {
    if (!_ctxMedicao) {
        _ctxMedicao = document.createElement('canvas').getContext('2d');
    }
    return _ctxMedicao;
}

function medir(texto, fonte) {
    const ctx = ctxMedicao();
    ctx.font = fonte;
    return ctx.measureText(texto).width;
}

// Quebra `texto` em até `maxLinhas` linhas que cabem em `larguraMax`
// px, truncando com reticências se sobrar conteúdo.
function quebrarLinhas(texto, larguraMax, fonte, maxLinhas = 3) {
    const palavras = texto.split(' ');
    const todasLinhas = [];
    let atual = '';
    for (const palavra of palavras) {
        const tentativa = atual ? `${atual} ${palavra}` : palavra;
        if (!atual || medir(tentativa, fonte) <= larguraMax) {
            atual = tentativa;
        } else {
            todasLinhas.push(atual);
            atual = palavra;
        }
    }
    if (atual) todasLinhas.push(atual);

    if (todasLinhas.length <= maxLinhas) return todasLinhas;

    const linhas = todasLinhas.slice(0, maxLinhas);
    let ultima = linhas[maxLinhas - 1];
    while (ultima.length > 1 && medir(`${ultima}…`, fonte) > larguraMax) {
        ultima = ultima.slice(0, -1).trimEnd();
    }
    linhas[maxLinhas - 1] = `${ultima}…`;
    return linhas;
}

// Aresta de "atalho" = pula coluna (vai da camada c pra uma camada
// > c+1), caso de "Sob o sol → coffe breaks" direto, além do caminho
// "Sob o sol → [Insone] → coffe breaks". Sem tratamento especial, ela
// é desenhada quase reta na mesma altura das arestas normais — e como
// muitos grafos daqui colapsam numa única fileira (uma coluna por nó),
// o rótulo cai em cima das caixas que ficam no meio do caminho.
//
// Aqui cada atalho ganha um "nível" de faixa (0, 1, 2...) reservada
// acima da linha de caixas, por onde ele é roteado por cima em vez de
// cruzar sobre tudo. Dois atalhos só podem dividir o mesmo nível se
// seus intervalos de coluna [colOrigem, colDestino] não se sobrepõem
// — do contrário um cruzaria a rota do outro na mesma altura. Isso é
// o problema clássico de "agendamento de intervalos": percorre os
// atalhos (mais curtos primeiro, já que ocupam menos espaço) e cada
// um pega o nível mais baixo ainda livre pro seu intervalo.
function calcularNiveisAtalho(grafo, colunaDoNo) {
    const candidatos = grafo.arestas
        .map((aresta) => ({
            aresta,
            colOrigem: colunaDoNo.get(aresta.deId),
            colDestino: colunaDoNo.get(aresta.paraId),
        }))
        .filter(({ colOrigem, colDestino }) => colDestino - colOrigem > 1)
        .sort((x, y) => x.colDestino - x.colOrigem - (y.colDestino - y.colOrigem));

    const faixasPorNivel = [];
    const nivelPorAresta = new Map();
    candidatos.forEach(({ aresta, colOrigem, colDestino }) => {
        let nivel = 0;
        for (;;) {
            const ocupadas = faixasPorNivel[nivel] || (faixasPorNivel[nivel] = []);
            const conflita = ocupadas.some(([s, d]) => colOrigem < d && s < colDestino);
            if (!conflita) {
                ocupadas.push([colOrigem, colDestino]);
                nivelPorAresta.set(aresta, nivel);
                break;
            }
            nivel++;
        }
    });
    return { nivelPorAresta, totalNiveis: faixasPorNivel.length };
}

// Mede o rótulo de uma aresta e decide se ele cabe numa linha só ou
// precisa quebrar em duas — sempre com a MESMA fonte usada na medição
// e no <text> renderizado (ver style inline em renderRotulo), pra
// largura calculada e largura desenhada nunca ficarem descasadas (era
// isso que fazia o texto vazar da caixinha rosa: a caixinha era
// dimensionada pra uma fonte de 9px, mas o <text> sem font-size
// próprio herdava o 12px do container ".text-xs" da aba).
function prepararRotulo(tipo) {
    if (!tipo) return null;
    const textoMaiusculo = tipo.toUpperCase();
    let linhas = [textoMaiusculo];
    if (medir(textoMaiusculo, DIAGRAMA_FONTE_ROTULO) > DIAGRAMA_ROTULO_LARGURA_MAX) {
        linhas = quebrarLinhas(
            textoMaiusculo,
            DIAGRAMA_ROTULO_LARGURA_MAX,
            DIAGRAMA_FONTE_ROTULO,
            2,
        );
    }
    const largura =
        Math.max(...linhas.map((l) => medir(l, DIAGRAMA_FONTE_ROTULO))) + DIAGRAMA_ROTULO_PAD_X * 2;
    const altura = linhas.length * DIAGRAMA_ROTULO_LINHA_ALTURA + DIAGRAMA_ROTULO_PAD_Y * 2;
    return { linhas, largura, altura };
}

// O gap fixo entre colunas (DIAGRAMA_COL_GAP) é só o mínimo. Uma
// aresta normal (uma coluna pro lado) desenha o rótulo bem no meio
// desse vão — se o rótulo for mais largo que o vão, ele estoura pra
// dentro da caixa vizinha e fica cortado (a caixa é desenhada por
// cima). Aresta de atalho não tem esse problema (o vão dela é a soma
// de várias colunas, sempre bem mais largo que um rótulo), então só
// entra nessa conta o pior caso entre as arestas normais.
function calcularGapColuna(grafo, nivelPorAresta) {
    let gap = DIAGRAMA_COL_GAP;
    grafo.arestas.forEach((a) => {
        if (nivelPorAresta.has(a) || !a.tipo) return;
        const largura = prepararRotulo(a.tipo).largura + 32;
        if (largura > gap) gap = largura;
    });
    return gap;
}

// Altura da faixa reservada pros atalhos: precisa caber o rótulo mais
// alto entre os atalhos (rótulo de 2 linhas é mais alto que um de
// linha só), com uma folga em cima/embaixo.
function calcularAlturaFaixa(grafo, nivelPorAresta) {
    let altura = DIAGRAMA_FAIXA_ATALHO_ALTURA_MIN;
    grafo.arestas.forEach((a) => {
        if (!nivelPorAresta.has(a) || !a.tipo) return;
        const necessario = prepararRotulo(a.tipo).altura + 14;
        if (necessario > altura) altura = necessario;
    });
    return altura;
}

function montarLayoutDiagrama(grafo) {
    const larguraTexto = DIAGRAMA_NO_LARGURA - DIAGRAMA_NO_PAD_X * 2;
    const posicoes = new Map();

    const colunaDoNo = new Map();
    grafo.camadas.forEach((camada, c) => camada.forEach((id) => colunaDoNo.set(id, c)));
    const { nivelPorAresta, totalNiveis } = calcularNiveisAtalho(grafo, colunaDoNo);
    const colGap = calcularGapColuna(grafo, nivelPorAresta);
    const faixaAltura = calcularAlturaFaixa(grafo, nivelPorAresta);

    // Em vez de empilhar todos os níveis de atalho só acima da linha
    // de caixas, alterna: níveis pares crescem pra cima, ímpares pra
    // baixo. Isso aproveita espaço dos dois lados (o diagrama fica
    // mais baixo no total) e, de quebra, separa atalhos com colunas
    // sobrepostas em lados opostos — o que evita o cruzamento entre a
    // vertical de um atalho "mais alto" e o rótulo de outro que ela
    // teria que atravessar se os dois ficassem do mesmo lado.
    const totalNiveisCima = Math.ceil(totalNiveis / 2);
    const totalNiveisBaixo = Math.floor(totalNiveis / 2);
    const margemSuperior = DIAGRAMA_MARGEM + totalNiveisCima * faixaAltura;

    grafo.camadas.forEach((camada, c) => {
        let y = margemSuperior;
        camada.forEach((id) => {
            const no = grafo.nos.find((n) => n.id === id);
            const linhas = quebrarLinhas(no.titulo, larguraTexto, DIAGRAMA_FONTE_TITULO);
            const altura = Math.max(
                DIAGRAMA_NO_ALTURA_MIN,
                linhas.length * DIAGRAMA_LINHA_ALTURA + DIAGRAMA_NO_PAD_Y * 2,
            );
            posicoes.set(id, {
                x: DIAGRAMA_MARGEM + c * (DIAGRAMA_NO_LARGURA + colGap),
                y,
                altura,
                linhas,
            });
            y += altura + DIAGRAMA_LINHA_GAP;
        });
    });

    const largura =
        DIAGRAMA_MARGEM * 2 +
        grafo.camadas.length * DIAGRAMA_NO_LARGURA +
        (grafo.camadas.length - 1) * colGap;
    const maiorBase = Math.max(...[...posicoes.values()].map((p) => p.y + p.altura));
    const altura = maiorBase + totalNiveisBaixo * faixaAltura + DIAGRAMA_MARGEM;

    // Nível par (cima): faixa mais perto do topo das caixas primeiro,
    // subindo a partir daí. Nível ímpar (baixo): espelhado, descendo a
    // partir da base das caixas.
    const bandaY = (nivel) => {
        const ehCima = nivel % 2 === 0;
        const indice = ehCima ? nivel / 2 : (nivel - 1) / 2;
        return ehCima
            ? margemSuperior - (indice + 0.5) * faixaAltura
            : maiorBase + (indice + 0.5) * faixaAltura;
    };
    const direcao = (nivel) => (nivel % 2 === 0 ? 'cima' : 'baixo');

    return { posicoes, largura, altura, nivelPorAresta, bandaY, direcao };
}

let _idDiagramaSeq = 0;

function renderDiagramaReferencias(grafo, idSvg) {
    const { posicoes, largura, altura, nivelPorAresta, bandaY, direcao } =
        montarLayoutDiagrama(grafo);
    const idMarcador = `conexoes-seta-${_idDiagramaSeq++}`;

    const nosSvg = grafo.nos
        .map((no) => {
            const p = posicoes.get(no.id);
            const yTextoInicial =
                p.altura / 2 - ((p.linhas.length - 1) * DIAGRAMA_LINHA_ALTURA) / 2;
            const linhasSvg = p.linhas
                .map(
                    (linha, i) =>
                        `<tspan x="${DIAGRAMA_NO_LARGURA / 2}" dy="${i === 0 ? 0 : DIAGRAMA_LINHA_ALTURA}">${escapeHtml(linha)}</tspan>`,
                )
                .join('');
            return `
        <g class="grafo-no" data-action="editar-poema" data-id="${no.id}" transform="translate(${p.x},${p.y})">
            <rect class="grafo-no-caixa" width="${DIAGRAMA_NO_LARGURA}" height="${p.altura}" rx="8"></rect>
            <text class="grafo-no-titulo" style="font: ${DIAGRAMA_FONTE_TITULO};" text-anchor="middle" y="${yTextoInicial}">${linhasSvg}</text>
        </g>`;
        })
        .join('');

    // Caminhos e rótulos são desenhados em grupos separados (arestas →
    // nós → rótulos, nessa ordem) em vez de intercalados por aresta:
    // como em SVG quem é desenhado depois fica por cima, isso garante
    // que nenhum rótulo fique escondido atrás da caixa de um nó (que
    // ficava por cima quando os grupos eram arestas → nós, com o
    // rótulo dentro do grupo de arestas) nem atrás da linha de outra
    // aresta que passe por cima dele.
    const caminhos = [];
    const rotulos = [];

    grafo.arestas.forEach((a) => {
        const src = posicoes.get(a.deId);
        const dst = posicoes.get(a.paraId);
        const nivelAtalho = nivelPorAresta.get(a);

        let caminho, lx, ly;
        if (nivelAtalho !== undefined) {
            // Atalho (pula coluna): sai pelo topo (nível par) ou pela base
            // (nível ímpar) da caixa de origem, atravessa a faixa reservada
            // na horizontal, e entra pelo mesmo lado na caixa de destino —
            // em vez de cruzar reto por cima de tudo na mesma altura das
            // arestas normais, o que colidia com as caixas do meio do
            // caminho.
            const ehCima = direcao(nivelAtalho) === 'cima';
            const xSaida = src.x + DIAGRAMA_NO_LARGURA / 2;
            const xChegada = dst.x + DIAGRAMA_NO_LARGURA / 2;
            const y = bandaY(nivelAtalho);
            const ySaida = ehCima ? src.y : src.y + src.altura;
            const yChegada = ehCima ? dst.y : dst.y + dst.altura;
            caminho = `M ${xSaida} ${ySaida} L ${xSaida} ${y} L ${xChegada} ${y} L ${xChegada} ${yChegada}`;
            lx = (xSaida + xChegada) / 2;
            ly = y;
        } else {
            const x1 = src.x + DIAGRAMA_NO_LARGURA;
            const y1 = src.y + src.altura / 2;
            const x2 = dst.x;
            const y2 = dst.y + dst.altura / 2;

            if (x2 > x1) {
                const midX = (x1 + x2) / 2;
                caminho = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
            } else {
                // Só acontece em ciclo (não esperado pela natureza da
                // relação, mas o dado não garante) — a camada de destino
                // não ficou à direita da origem. Em vez de esconder a
                // aresta, desenha em loop por fora do nó de origem.
                const desvio = 50;
                caminho = `M ${x1} ${y1} C ${x1 + desvio} ${y1 + desvio}, ${x2 - desvio} ${y2 + desvio}, ${x2} ${y2}`;
            }
            lx = (x1 + x2) / 2;
            ly = (y1 + y2) / 2;
        }

        caminhos.push(
            `<path class="grafo-aresta-linha" d="${caminho}" fill="none" marker-end="url(#${idMarcador})"></path>`,
        );

        if (a.tipo) {
            const rotulo = prepararRotulo(a.tipo);
            const x0 = lx - rotulo.largura / 2;
            const y0 = ly - rotulo.altura / 2;
            // Mesma lógica de centralização vertical usada no título do
            // nó: a primeira linha recua a metade do espaço extra que as
            // linhas de baixo vão ocupar.
            const yTextoInicial =
                rotulo.altura / 2 +
                3 -
                ((rotulo.linhas.length - 1) * DIAGRAMA_ROTULO_LINHA_ALTURA) / 2;
            const linhasSvg = rotulo.linhas
                .map(
                    (linha, i) =>
                        `<tspan x="${rotulo.largura / 2}" dy="${i === 0 ? 0 : DIAGRAMA_ROTULO_LINHA_ALTURA}">${escapeHtml(linha)}</tspan>`,
                )
                .join('');
            rotulos.push(`<g transform="translate(${x0},${y0})">
                    <rect class="grafo-aresta-rotulo-fundo" width="${rotulo.largura}" height="${rotulo.altura}" rx="3"></rect>
                    <text class="grafo-aresta-rotulo-texto" style="font: ${DIAGRAMA_FONTE_ROTULO};" text-anchor="middle" y="${yTextoInicial}">${linhasSvg}</text>
                   </g>`);
        }
    });

    const caminhosSvg = caminhos.join('');
    const rotulosSvg = rotulos.join('');

    return `
    <div class="overflow-x-auto">
        <svg id="${idSvg}" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <marker id="${idMarcador}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path class="grafo-aresta-marcador" d="M 0 0 L 10 5 L 0 10 z"></path>
                </marker>
            </defs>
            <g class="grafo-arestas">${caminhosSvg}</g>
            <g class="grafo-nos">${nosSvg}</g>
            <g class="grafo-rotulos">${rotulosSvg}</g>
        </svg>
    </div>`;
}

// Índice só pra dar um id de DOM único a cada <svg> desta renderização
// (usado pelo botão "Baixar imagem" pra achar o diagrama certo — ver
// baixarDiagramaReferencias abaixo). Reinicia a cada renderReferencias(),
// não precisa ser globalmente único entre re-renders.
// Cadeia linear também pode virar imagem: `renderDiagramaReferencias`
// já lida com "1 nó por camada" perfeitamente (uma cadeia linear é só
// um caso particular do mesmo layout de colunas), então reaproveita a
// mesma função — só que o SVG fica escondido (a exibição em texto
// compacto continua sendo o que aparece na tela, sem mudar o visual
// de antes), e o botão de baixar aponta pra esse SVG oculto. Mesma
// função `svgParaPngBlob`/`baixarDiagramaReferencias` de baixo,
// já que ela clona o SVG e resolve as cores por classe — não
// depende de o elemento original estar visível.
function renderCartaoReferencia(grafo, indice) {
    const idSvg = `conexoes-diagrama-${indice}`;
    if (grafo.linear) {
        return `
        <div class="relative bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm text-xs">
            <button
                type="button"
                data-action="baixar-diagrama-referencias"
                data-svg-id="${idSvg}"
                title="Baixar esta cadeia como imagem PNG"
                class="absolute top-2 right-2 z-10 text-[11px] leading-none px-2 py-1 rounded border border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-gray-500 dark:text-slate-400 hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400 dark:hover:border-blue-500 transition"
            >
                ⭳ PNG
            </button>
            <div class="flex flex-wrap items-center gap-y-1.5 pr-12">${renderPassosLineares(grafo)}</div>
            <div class="hidden">${renderDiagramaReferencias(grafo, idSvg)}</div>
        </div>`;
    }
    return `
        <div class="relative bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm text-xs">
            <button
                type="button"
                data-action="baixar-diagrama-referencias"
                data-svg-id="${idSvg}"
                title="Baixar este diagrama como imagem PNG"
                class="absolute top-2 right-2 z-10 text-[11px] leading-none px-2 py-1 rounded border border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-gray-500 dark:text-slate-400 hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400 dark:hover:border-blue-500 transition"
            >
                ⭳ PNG
            </button>
            ${renderDiagramaReferencias(grafo, idSvg)}
        </div>`;
}

function renderReferencias() {
    const container = document.getElementById('conexoes-referencias');
    if (!container) return;
    const grafos = montarGrafosReferencias();
    if (!grafos.length) {
        container.innerHTML =
            '<p class="text-sm text-gray-400 dark:text-slate-500">Nenhuma Referência cadastrada ainda.</p>';
        return;
    }
    container.innerHTML = grafos.map((grafo, i) => renderCartaoReferencia(grafo, i)).join('');
}

// ─── Baixar diagrama como imagem (PNG) ─────────────────────────
// O <svg> já embutido no DOM usa cor via classe CSS (.grafo-*, ver
// style.css), não via atributo — ótimo pra reagir ao tema sozinho (ver
// comentário lá), mas ruim pra exportar: um <img>/canvas renderizando
// o SVG isolado (fora da página) não enxerga o style.css externo, só o
// que estiver dentro do próprio SVG. Por isso o clone abaixo resolve
// cada classe pro valor de cor fixo correspondente ao tema atual antes
// de serializar — mesma paleta de style.css, espelhada aqui a propósito
// (são poucas regras, e ler getComputedStyle exigiria o clone já
// inserido no DOM só pra medir, mais complexo sem ganho real).
const CORES_DIAGRAMA = {
    escuro: {
        fundo: '#0f172a', // slate-900, mesmo tom do card
        'grafo-no-caixa': { fill: '#0f172a', stroke: '#334155' },
        'grafo-no-titulo': { fill: '#cbd5e1' },
        'grafo-aresta-linha': { stroke: '#475569' },
        'grafo-aresta-marcador': { fill: '#475569' },
        'grafo-aresta-rotulo-fundo': { fill: '#701a75' },
        'grafo-aresta-rotulo-texto': { fill: '#f0abfc' },
    },
    claro: {
        fundo: '#ffffff',
        'grafo-no-caixa': { fill: '#ffffff', stroke: '#e5e7eb' },
        'grafo-no-titulo': { fill: '#374151' },
        'grafo-aresta-linha': { stroke: '#d1d5db' },
        'grafo-aresta-marcador': { fill: '#d1d5db' },
        'grafo-aresta-rotulo-fundo': { fill: '#fae8ff' },
        'grafo-aresta-rotulo-texto': { fill: '#a21caf' },
    },
};

// Escala de super-amostragem: exporta em 2x o tamanho do SVG (que já é
// pequeno, pensado pra caber na tela) pra não sair borrado em telas de
// alta densidade — mesmo motivo de qualquer export canvas->PNG.
const EXPORT_ESCALA = 2;

function svgParaPngBlob(svgOriginal) {
    const clone = svgOriginal.cloneNode(true);
    const escuro = document.documentElement.classList.contains('dark');
    const paleta = escuro ? CORES_DIAGRAMA.escuro : CORES_DIAGRAMA.claro;

    for (const [classe, cores] of Object.entries(paleta)) {
        if (classe === 'fundo') continue;
        clone.querySelectorAll(`.${classe}`).forEach((el) => {
            if (cores.fill) el.setAttribute('fill', cores.fill);
            if (cores.stroke) el.setAttribute('stroke', cores.stroke);
        });
    }

    // Fundo opaco (o card tem bg-white/slate-900) — sem isso, a área
    // fora dos elementos desenhados sairia transparente no PNG.
    const fundo = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    fundo.setAttribute('width', '100%');
    fundo.setAttribute('height', '100%');
    fundo.setAttribute('fill', paleta.fundo);
    clone.insertBefore(fundo, clone.firstChild);

    const largura = Number(svgOriginal.getAttribute('width'));
    const altura = Number(svgOriginal.getAttribute('height'));

    const svgTexto = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgTexto], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(svgUrl);
            const canvas = document.createElement('canvas');
            canvas.width = largura * EXPORT_ESCALA;
            canvas.height = altura * EXPORT_ESCALA;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Falha ao gerar PNG do diagrama.'));
                    return;
                }
                resolve(blob);
            }, 'image/png');
        };
        img.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            reject(new Error('Falha ao carregar o diagrama pra exportação.'));
        };
        img.src = svgUrl;
    });
}

// Chamado pelo listener delegado em main.js (data-action="baixar-diagrama-referencias").
export async function baixarDiagramaReferencias(botao) {
    const svg = document.getElementById(botao.dataset.svgId);
    if (!svg) return;
    try {
        const blob = await svgParaPngBlob(svg);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conexoes-referencias_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert('Não foi possível gerar a imagem do diagrama.');
    }
}

export function renderConexoes() {
    renderBuracos();
    renderElos();
    renderReferencias();
}

// Só recalcula se a aba de Conexões estiver visível, mesmo critério de
// estatisticas.js — evita gastar processamento toda hora que algo é
// salvo em outra aba.
window.addEventListener('db:saved', () => {
    if (document.getElementById('conexoes')?.classList.contains('active')) {
        renderConexoes();
    }
});
