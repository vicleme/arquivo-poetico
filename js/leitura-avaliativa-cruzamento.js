// ============================================================
// leitura-avaliativa-cruzamento.js: cruzamento das leituras com as etiquetas
// (Fase 22, entrega 4b; F22-D24, F22-D26 e F22-D27). Puro: sem DOM e sem db
// global; recebe as leituras e o `dbRef` (etiquetas, clusters, poemas, prosas).
//
// Pergunta: quando o texto tem esta etiqueta (ou este cluster), o que costuma
// pegar ou incomodar na leitura dele?
//
// Regras:
//   - Categorias: Tom, Estilo, Domínio Imagético e Tradição (F22-D27).
//   - Unidade da coluna: o cluster de topo. Etiqueta de subcluster conta para o
//     cluster de topo. O detalhe por etiqueta vem de `cruzarDetalheDoCluster`.
//   - Uma leitura por texto, a mais recente (a mesma regra do padrão), e as
//     traduções NÃO se agrupam (F22-D24): cada versão é um texto.
//   - "Pegou" entra com o PESO INTEIRO em cada cluster do texto, sem repartir:
//     é um juízo sobre o texto. Por isso as colunas somam mais que o total.
//     "Incomodou" é a mesma conta sem peso, uma vez por cluster de cada texto.
//   - Um texto com duas etiquetas do mesmo cluster conta uma vez nele.
//   - Colunas especiais, sempre no fim: "Sem cluster" (o texto tem etiqueta da
//     categoria, mas nenhuma está em cluster) e "Sem etiqueta" (o texto não tem
//     nenhuma etiqueta da categoria), para a falta não passar por ausência.
//   - Cada célula leva o n (textos da coluna), para a tela mostrar o tamanho da
//     amostra. Célula com n = 0 não existe: a coluna só aparece se tem texto.
// ============================================================

import { ITENS_PEGOU, ITENS_INCOMODOU, valorDoPeso } from './leitura-avaliativa.js';
import {
    MINIMO_PARA_PADRAO,
    coracoesDoTexto,
    faixaDe,
    leiturasParaPadrao,
} from './leitura-avaliativa-padrao.js';
import { ROTULOS_ETIQUETAS, idsDeEtiquetasDoTexto } from './etiquetas.js';
import { clusterDaEtiqueta, paiDoCluster } from './tag-clusters.js';

export const CATEGORIAS_CRUZAMENTO = Object.freeze([
    'tom',
    'estilo',
    'dominioImagetico',
    'tradicao',
]);
export const MEDIDAS_CRUZAMENTO = Object.freeze(['pegou', 'incomodou']);

export const ID_SEM_CLUSTER = 'sem-cluster';
export const ID_SEM_ETIQUETA = 'sem-etiqueta';

export function rotuloDaCategoriaCruzamento(categoria) {
    return CATEGORIAS_CRUZAMENTO.includes(categoria) ? ROTULOS_ETIQUETAS[categoria] : '';
}

const arredondar = (n) => Math.round(n * 100) / 100;
const porNome = (a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR');

function textoDaLeitura(dbRef, leitura) {
    const lista = leitura.tipo === 'prosa' ? dbRef?.prosas : dbRef?.poemas;
    return (lista || []).find((t) => String(t.id) === String(leitura.textoId)) || null;
}

// Leituras prontas para o cruzamento: uma por texto, com o texto resolvido, e
// só as que passam no filtro de faixa (opcional). Leitura de texto que não
// existe mais no acervo é contada à parte, nunca somada.
function prepararLeituras(
    leituras,
    dbRef,
    { tipo = 'todos', faixa = 'todas', classificacaoDe } = {},
) {
    const unicas = leiturasParaPadrao(leituras, { tipo });
    const prontas = [];
    let semTexto = 0;
    let foraDaFaixa = 0;
    unicas.forEach((leitura) => {
        const texto = textoDaLeitura(dbRef, leitura);
        if (!texto) {
            semTexto += 1;
            return;
        }
        if (faixa !== 'todas' && faixaDe(coracoesDoTexto(leitura, classificacaoDe)) !== faixa) {
            foraDaFaixa += 1;
            return;
        }
        prontas.push({ leitura, texto });
    });
    return { prontas, semTexto, foraDaFaixa, totalUnicas: unicas.length };
}

// ─── Colunas: de onde vem cada texto ───────────────────────────────────

// Cluster de topo de uma etiqueta (objeto) ou null.
function topoDaEtiqueta(dbRef, etiquetaId) {
    const proprio = clusterDaEtiqueta(dbRef, etiquetaId);
    if (!proprio) return null;
    return paiDoCluster(dbRef, proprio) || proprio;
}

// Resolvedor por cluster de topo: devolve as colunas ({ id, rotulo, ... }) em
// que o texto cai, sem repetir.
function resolvedorPorCluster(dbRef, categoria) {
    return (texto) => {
        const ids = idsDeEtiquetasDoTexto(dbRef, texto, categoria);
        if (!ids.length)
            return [{ id: ID_SEM_ETIQUETA, tipo: 'semEtiqueta', rotulo: 'Sem etiqueta' }];
        const colunas = new Map();
        let algumSemCluster = false;
        ids.forEach((id) => {
            const topo = topoDaEtiqueta(dbRef, id);
            if (!topo) {
                algumSemCluster = true;
                return;
            }
            colunas.set(String(topo.id), {
                id: String(topo.id),
                tipo: 'cluster',
                rotulo: topo.nome,
                clusterId: topo.id,
            });
        });
        const saida = [...colunas.values()];
        if (algumSemCluster) {
            saida.push({ id: ID_SEM_CLUSTER, tipo: 'semCluster', rotulo: 'Sem cluster' });
        }
        return saida;
    };
}

// Resolvedor por etiqueta, para abrir um cluster: só as etiquetas daquele
// cluster (e dos subclusters dele) viram coluna.
function resolvedorPorEtiqueta(dbRef, categoria, clusterId) {
    const nomes = new Map();
    (dbRef?.etiquetas || []).forEach((e) => {
        if (e.categoria !== categoria || e.clusterId == null) return;
        const topo = topoDaEtiqueta(dbRef, e.id);
        if (topo && String(topo.id) === String(clusterId)) nomes.set(String(e.id), e.nome);
    });
    return (texto) =>
        idsDeEtiquetasDoTexto(dbRef, texto, categoria)
            .filter((id) => nomes.has(String(id)))
            .map((id) => ({
                id: String(id),
                tipo: 'etiqueta',
                rotulo: nomes.get(String(id)),
                etiquetaId: id,
            }));
}

// ─── A conta ───────────────────────────────────────────────────────────

function itensDaMedida(medida) {
    return medida === 'incomodou' ? ITENS_INCOMODOU : ITENS_PEGOU;
}

// Uma célula: a leitura de cada texto da coluna entra com o que marcou.
function celulaDe(leiturasDaColuna, item, medida) {
    const n = leiturasDaColuna.length;
    if (medida === 'incomodou') {
        const marcaram = leiturasDaColuna.filter((l) => l.incomodou.includes(item.id)).length;
        return { n, marcaram, proporcao: n ? arredondar(marcaram / n) : 0 };
    }
    const pesos = leiturasDaColuna
        .map((l) => l.pegou.find((m) => m.item === item.id)?.peso)
        .filter(Boolean)
        .map(valorDoPeso);
    const soma = pesos.reduce((a, b) => a + b, 0);
    return {
        n,
        marcaram: pesos.length,
        soma,
        // Como no padrão: quem não marcou o item conta 0 (vai de 0 a 3).
        ponderado: n ? arredondar(soma / n) : 0,
        mediaPeso: pesos.length ? arredondar(soma / pesos.length) : 0,
    };
}

function montarTabela(prontas, resolvedor, medida, ordemColunas) {
    const grupos = new Map(); // id da coluna -> { coluna, leituras }
    prontas.forEach(({ leitura, texto }) => {
        resolvedor(texto).forEach((coluna) => {
            if (!grupos.has(coluna.id)) grupos.set(coluna.id, { coluna, leituras: [] });
            grupos.get(coluna.id).leituras.push(leitura);
        });
    });
    const ordenadas = [...grupos.values()].sort(ordemColunas);
    const itens = itensDaMedida(medida);
    const todas = prontas.map((p) => p.leitura);
    return {
        colunas: ordenadas.map(({ coluna, leituras }) => ({ ...coluna, n: leituras.length })),
        linhas: itens.map((item) => ({
            item: item.id,
            rotulo: item.rotulo,
            total: celulaDe(todas, item, medida),
            celulas: ordenadas.map(({ leituras }) => celulaDe(leituras, item, medida)),
        })),
    };
}

// Colunas de cluster: mais textos primeiro, depois nome; "Sem cluster" e
// "Sem etiqueta" sempre no fim, nessa ordem.
const PESO_TIPO = { cluster: 0, etiqueta: 0, semCluster: 1, semEtiqueta: 2 };
function ordemDeColunas(a, b) {
    const ta = PESO_TIPO[a.coluna.tipo];
    const tb = PESO_TIPO[b.coluna.tipo];
    if (ta !== tb) return ta - tb;
    if (b.leituras.length !== a.leituras.length) return b.leituras.length - a.leituras.length;
    return porNome(a.coluna, b.coluna);
}

function resumoComum(prep, categoria, medida) {
    return {
        categoria,
        rotuloCategoria: rotuloDaCategoriaCruzamento(categoria),
        medida,
        totalTextos: prep.prontas.length,
        semTexto: prep.semTexto,
        foraDaFaixa: prep.foraDaFaixa,
        poucos: prep.prontas.length < MINIMO_PARA_PADRAO,
        // Um texto cai em vários clusters com o peso inteiro: a soma das
        // colunas passa do total. A tela diz isso no cabeçalho.
        somaPassaDoTotal: false,
    };
}

function validar(categoria, medida) {
    return CATEGORIAS_CRUZAMENTO.includes(categoria) && MEDIDAS_CRUZAMENTO.includes(medida);
}

function vazio(categoria, medida) {
    return {
        categoria,
        rotuloCategoria: rotuloDaCategoriaCruzamento(categoria),
        medida,
        totalTextos: 0,
        semTexto: 0,
        foraDaFaixa: 0,
        poucos: true,
        somaPassaDoTotal: false,
        colunas: [],
        linhas: [],
    };
}

// Cruzamento item × cluster de topo da categoria.
// opcoes: { categoria, medida: 'pegou' | 'incomodou', tipo, faixa, classificacaoDe }
export function calcularCruzamento(leituras, dbRef, opcoes = {}) {
    const { categoria = 'tom', medida = 'pegou' } = opcoes;
    if (!validar(categoria, medida)) return vazio(categoria, medida);
    const prep = prepararLeituras(leituras, dbRef, opcoes);
    const tabela = montarTabela(
        prep.prontas,
        resolvedorPorCluster(dbRef, categoria),
        medida,
        ordemDeColunas,
    );
    const somaColunas = tabela.colunas.reduce((acc, c) => acc + c.n, 0);
    return {
        ...resumoComum(prep, categoria, medida),
        somaPassaDoTotal: somaColunas > prep.prontas.length,
        ...tabela,
    };
}

// O mesmo cruzamento aberto num cluster: uma coluna por etiqueta dele (e dos
// subclusters). Só entram as etiquetas usadas por algum texto lido.
export function cruzarDetalheDoCluster(leituras, dbRef, opcoes = {}) {
    const { categoria = 'tom', medida = 'pegou', clusterId = null } = opcoes;
    if (!validar(categoria, medida) || clusterId == null) return vazio(categoria, medida);
    const prep = prepararLeituras(leituras, dbRef, opcoes);
    const resolvedor = resolvedorPorEtiqueta(dbRef, categoria, clusterId);
    // O total do detalhe são só os textos que têm alguma etiqueta do cluster.
    const doCluster = prep.prontas.filter(({ texto }) => resolvedor(texto).length > 0);
    const tabela = montarTabela(doCluster, resolvedor, medida, ordemDeColunas);
    return {
        ...resumoComum(prep, categoria, medida),
        clusterId,
        totalTextos: doCluster.length,
        poucos: doCluster.length < MINIMO_PARA_PADRAO,
        somaPassaDoTotal: tabela.colunas.reduce((acc, c) => acc + c.n, 0) > doCluster.length,
        ...tabela,
    };
}
