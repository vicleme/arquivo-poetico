// ============================================================
// leitura-avaliativa-cruzamento-vista.js: o que a vista "Cruzamento com
// etiquetas" da tela Leituras mostra (Fase 22, entrega 4d-1; F22-D27). Puro:
// sem DOM, sem HTML e sem handler; recebe o resultado de `calcularCruzamento`
// (ou de `cruzarDetalheDoCluster`) e devolve texto, números e o nível de cor
// de cada célula. A entrega 4d-2 monta a tabela e liga os botões.
//
// Regras para a amostra pequena não mentir:
//   - cada coluna leva o n (textos) e o n vai escrito no cabeçalho;
//   - a célula mostra o valor E o "x de n" (quantos textos da coluna marcaram o
//     item), porque 100% de uma coluna com um texto não é padrão;
//   - item que ninguém da coluna marcou aparece como "—", sem cor, e não como
//     zero: o zero estaria dizendo mais do que a amostra sabe;
//   - coluna com menos de LIMITE_COLUNA_PEQUENA textos é marcada, e o aviso
//     conta quantas são;
//   - o cabeçalho diz que as colunas somam mais que o total quando é o caso
//     (um texto cai em todos os clusters que tem, com o peso inteiro).
// ============================================================

import { MINIMO_PARA_PADRAO } from './leitura-avaliativa-padrao.js';
import {
    CATEGORIAS_CRUZAMENTO,
    MEDIDAS_CRUZAMENTO,
    rotuloDaCategoriaCruzamento,
} from './leitura-avaliativa-cruzamento.js';

export const VISTAS_LEITURAS = Object.freeze([
    { id: 'padrao', rotulo: 'Padrão' },
    { id: 'cruzamento', rotulo: 'Cruzamento com etiquetas' },
]);
export const ROTULOS_MEDIDA = Object.freeze({ pegou: 'Pegou', incomodou: 'Incomodou' });

// Coluna com menos textos que isso é só indício (escolha minha a confirmar).
export const LIMITE_COLUNA_PEQUENA = 3;
// Níveis de cor de 1 a 4 (0 é "sem marca", sem cor).
export const NIVEIS_DE_COR = 4;

const PESO_MAXIMO = 3;

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const numeroPt = (n) => String(n).replace('.', ',');

// ─── Seletores: valor desconhecido volta ao padrão ─────────────────────

export function normalizarVista(vista) {
    return VISTAS_LEITURAS.some((v) => v.id === vista) ? vista : 'padrao';
}

export function normalizarCategoria(categoria) {
    return CATEGORIAS_CRUZAMENTO.includes(categoria) ? categoria : CATEGORIAS_CRUZAMENTO[0];
}

export function normalizarMedida(medida) {
    return MEDIDAS_CRUZAMENTO.includes(medida) ? medida : MEDIDAS_CRUZAMENTO[0];
}

// As opções do seletor de categoria, na ordem da lista (Tom, Estilo, Domínio
// Imagético e Tradição).
export function opcoesDeCategoria() {
    return CATEGORIAS_CRUZAMENTO.map((id) => ({ id, rotulo: rotuloDaCategoriaCruzamento(id) }));
}

export function opcoesDeMedida() {
    return MEDIDAS_CRUZAMENTO.map((id) => ({ id, rotulo: ROTULOS_MEDIDA[id] }));
}

// ─── Textos de apoio ───────────────────────────────────────────────────

export function textoDaMedida(medida) {
    if (normalizarMedida(medida) === 'incomodou') {
        return 'Cada célula é a proporção dos textos da coluna em que o item incomodou, com o "x de n" embaixo. Um texto conta uma vez em cada cluster que tem, sem peso.';
    }
    return 'Cada célula é o peso médio do item nos textos da coluna, de 0 a 3 (pontual 1, marcante 2, central 3; quem não marcou conta 0), com o "x de n" embaixo. O texto entra com o peso inteiro em cada cluster que tem.';
}

export function colunasPequenas(dados) {
    return (dados?.colunas || []).filter((c) => c.n < LIMITE_COLUNA_PEQUENA);
}

// Aviso do cabeçalho. `nomeDoCluster` só vale no detalhe (cluster aberto).
export function textoDoAvisoCruzamento(dados, { nomeDoCluster = '' } = {}) {
    if (!dados?.totalTextos) {
        return nomeDoCluster
            ? `Nenhum texto lido tem etiqueta do cluster ${nomeDoCluster} neste recorte.`
            : 'Ainda não há leituras neste recorte. O cruzamento aparece depois de algumas leituras de textos com etiquetas.';
    }
    const partes = [];
    partes.push(
        nomeDoCluster
            ? `${plural(dados.totalTextos, 'texto lido tem', 'textos lidos têm')} etiqueta do cluster ${nomeDoCluster}.`
            : `${plural(dados.totalTextos, 'texto lido entra', 'textos lidos entram')} no cruzamento de ${dados.rotuloCategoria}.`,
    );
    if (dados.somaPassaDoTotal) {
        partes.push(
            'As colunas somam mais que o total: um texto cai em todos os clusters que tem e entra com o peso inteiro em cada um.',
        );
    }
    const pequenas = colunasPequenas(dados).length;
    if (pequenas) {
        partes.push(
            `${plural(pequenas, 'coluna tem', 'colunas têm')} menos de ${LIMITE_COLUNA_PEQUENA} textos: leia como indício.`,
        );
    }
    if (dados.poucos) {
        partes.push(
            `Poucos textos lidos (o ideal é ${MINIMO_PARA_PADRAO} ou mais): os números são indício, não padrão.`,
        );
    }
    return partes.join(' ');
}

// Frase do "sem etiqueta" e do "sem cluster", para a legenda da tabela.
export function textoDasColunasEspeciais(dados) {
    const tipos = new Set((dados?.colunas || []).map((c) => c.tipo));
    const frases = [];
    if (tipos.has('semCluster')) {
        frases.push(
            '"Sem cluster": o texto tem etiqueta da categoria, mas nenhuma delas está num cluster.',
        );
    }
    if (tipos.has('semEtiqueta')) {
        frases.push(
            '"Sem etiqueta": o texto não tem nenhuma etiqueta da categoria (a falta de etiqueta não quer dizer falta daquela marca).',
        );
    }
    return frases.join(' ');
}

// ─── Células ───────────────────────────────────────────────────────────

// Nível de cor de 0 a 4. 0: ninguém da coluna marcou o item.
export function nivelDeCor(celula, medida) {
    if (!celula || !celula.marcaram) return 0;
    const intensidade =
        normalizarMedida(medida) === 'incomodou'
            ? celula.proporcao
            : celula.ponderado / PESO_MAXIMO;
    const limitada = Math.min(1, Math.max(0, Number(intensidade) || 0));
    return Math.min(NIVEIS_DE_COR, Math.max(1, Math.ceil(limitada * NIVEIS_DE_COR)));
}

// O que a tela escreve numa célula: valor, "x de n", dica e nível de cor.
// `rotuloLinha` e `rotuloColuna` entram só na dica (title).
export function celulaParaTela(celula, medida, rotuloLinha = '', rotuloColuna = '') {
    const m = normalizarMedida(medida);
    const onde = [rotuloLinha, rotuloColuna].filter(Boolean).join(' × ');
    const prefixo = onde ? `${onde}: ` : '';
    if (!celula || !celula.n) {
        return { vazia: true, principal: '', secundario: '', titulo: '', nivel: 0 };
    }
    const xDeN = `${celula.marcaram} de ${celula.n}`;
    if (!celula.marcaram) {
        return {
            vazia: true,
            principal: '—',
            secundario: '',
            titulo: `${prefixo}nenhum dos ${plural(celula.n, 'texto', 'textos')} da coluna marcou.`,
            nivel: 0,
        };
    }
    if (m === 'incomodou') {
        return {
            vazia: false,
            principal: `${Math.round(celula.proporcao * 100)}%`,
            secundario: xDeN,
            titulo: `${prefixo}incomodou em ${xDeN} ${celula.n === 1 ? 'texto' : 'textos'}.`,
            nivel: nivelDeCor(celula, m),
        };
    }
    return {
        vazia: false,
        principal: numeroPt(Number(celula.ponderado.toFixed(2))),
        secundario: xDeN,
        titulo: `${prefixo}marcado em ${xDeN} ${celula.n === 1 ? 'texto' : 'textos'}; peso médio entre os que marcaram: ${numeroPt(celula.mediaPeso)} de 3; peso médio da coluna: ${numeroPt(Number(celula.ponderado.toFixed(2)))} de 3.`,
        nivel: nivelDeCor(celula, m),
    };
}

// ─── A tabela inteira, sem HTML ────────────────────────────────────────

// Colunas e linhas prontas para a tela montar a tabela. Só a coluna de cluster
// (tipo "cluster") pode ser aberta no detalhe; "Sem cluster", "Sem etiqueta" e
// as colunas de etiqueta (já no detalhe) não abrem.
export function tabelaParaTela(dados) {
    const medida = normalizarMedida(dados?.medida);
    const colunas = (dados?.colunas || []).map((c) => ({
        id: c.id,
        tipo: c.tipo,
        rotulo: c.rotulo,
        n: c.n,
        rotuloComN: `${c.rotulo} (n = ${c.n})`,
        pequena: c.n < LIMITE_COLUNA_PEQUENA,
        abrivel: c.tipo === 'cluster',
        clusterId: c.clusterId ?? null,
    }));
    const linhas = (dados?.linhas || []).map((l) => ({
        item: l.item,
        rotulo: l.rotulo,
        total: celulaParaTela(l.total, medida, l.rotulo, 'todos os textos'),
        celulas: l.celulas.map((cel, i) =>
            celulaParaTela(cel, medida, l.rotulo, dados.colunas[i]?.rotulo || ''),
        ),
    }));
    return {
        medida,
        categoria: dados?.categoria,
        colunas,
        linhas,
        semColunas: colunas.length === 0,
    };
}
