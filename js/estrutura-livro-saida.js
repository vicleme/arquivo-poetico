// ============================================================
// estrutura-livro-saida.js: a estrutura do livro (ou da Coletânea) só com
// títulos, para as saídas (.json, .md, .csv, .pdf e .docx). Lógica pura, sem DOM.
//
// Parte da árvore de `montarArvoreDoLivro` (a mesma ordem da aba Estrutura e do
// Ver) e a reduz a títulos: nunca o texto dos poemas e prosas. Os poemas e
// prosas ligados ao livro só por `livrosIds` (sem posição na árvore) saem à
// parte, em `vinculados`, para não fingirem uma posição que não têm.
//
// Formato (`estruturaDeTitulos`), o mesmo do `.json`:
//   { arvore: [{ tipo, titulo, sequencia, filhos? }], vinculados: [{ tipo, titulo }] }
// `tipo` é 'parte', 'secao', 'elemento', 'poema', 'prosa' ou, nos itens de
// Coletânea, 'poema', 'prosa' ou 'inédito'. `filhos` só existe em Parte e Seção.
// Com a opção "Incluir fora de escopo", o livro comum ganha ainda
// `fora_de_escopo` (ver `foraDeEscopoParaSaida`).
// ============================================================

import { tituloDoNo, rotuloTipoDoNo } from './estrutura-livro.js';
import { detalheDaEntradaForaDeEscopo } from './fora-de-escopo.js';

const sequenciaDoNo = (no) => {
    const n = parseInt(no.dados?.sequencia);
    return n > 0 ? n : null;
};

function noDeTitulos(no) {
    const saida = {
        tipo: rotuloTipoDoNo(no),
        titulo: tituloDoNo(no),
        sequencia: sequenciaDoNo(no),
    };
    if (no.filhos) saida.filhos = no.filhos.map(noDeTitulos);
    return saida;
}

// `montada`: saída de `montarArvoreDoLivro`.
export function estruturaDeTitulos(montada) {
    return {
        arvore: (montada?.arvore || []).map(noDeTitulos),
        vinculados: (montada?.vinculados || []).map((no) => ({
            tipo: rotuloTipoDoNo(no),
            titulo: tituloDoNo(no),
        })),
    };
}

// Rótulo legível do tipo. Elemento fica sem rótulo: o título dele já começa
// pelo tipo ("Pórtico: Título").
const ROTULOS = {
    parte: 'Parte',
    secao: 'Seção',
    poema: 'Poema',
    prosa: 'Prosa',
    inédito: 'Item inédito',
    elemento: '',
};

export function rotuloLegivelDoTipo(tipo) {
    return ROTULOS[tipo] ?? '';
}

// A árvore achatada em linhas, na ordem de leitura. `nivel` começa em 1.
// `caminho` são os títulos do topo até o nó (sem o do livro).
export function linhasDaEstrutura(estrutura) {
    const linhas = [];
    const visitar = (nos, nivel, ancestrais) =>
        nos.forEach((no) => {
            const caminho = [...ancestrais, no.titulo];
            linhas.push({
                nivel,
                tipo: no.tipo,
                rotulo: rotuloLegivelDoTipo(no.tipo),
                titulo: no.titulo,
                caminho,
                sequencia: no.sequencia,
            });
            if (no.filhos) visitar(no.filhos, nivel + 1, caminho);
        });
    visitar(estrutura?.arvore || [], 1, []);
    return linhas;
}

// Lista aninhada em Markdown, dois espaços de recuo por nível.
export function estruturaParaMarkdown(estrutura) {
    const item = (rotulo, titulo) => (rotulo ? `${rotulo}: ${titulo}` : titulo);
    const corpo = linhasDaEstrutura(estrutura)
        .map((l) => `${'  '.repeat(l.nivel - 1)}- ${item(l.rotulo, l.titulo)}`)
        .join('\n');
    const vinculados = (estrutura?.vinculados || [])
        .map((v) => `- ${item(rotuloLegivelDoTipo(v.tipo), v.titulo)}`)
        .join('\n');
    return { corpo, vinculados };
}

// ─── Fora de escopo ─────────────────────────────────────────────

const copiar = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

// `fora`: saída de `foraDeEscopoDoLivro`. Cada entrada sai com o que aconteceu
// (`detalhe`, a mesma frase das telas) e com a origem e o destino em dados:
//   { tipo, titulo, status, detalhe, origem: { livro?, caminho, posicao }, destino? }
// Sem id: a estrutura em árvore também não leva.
export function foraDeEscopoParaSaida(fora) {
    const entrada = (e) => {
        const saida = {
            tipo: e.tipo,
            titulo: e.titulo,
            status: e.status,
            detalhe: detalheDaEntradaForaDeEscopo(e),
            origem: copiar(e.origem),
        };
        if (e.destino) saida.destino = copiar(e.destino);
        return saida;
    };
    return {
        migrados: (fora?.migrados || []).map(entrada),
        descartados: (fora?.descartados || []).map(entrada),
    };
}

// As duas listas prontas para texto: cada linha com rótulo do tipo, título e o
// detalhe entre parênteses. Migrados primeiro, como nas telas.
export function linhasDoForaDeEscopo(foraSaida) {
    const linha = (e) => ({
        rotulo: rotuloLegivelDoTipo(e.tipo),
        titulo: e.titulo,
        detalhe: e.detalhe || '',
        status: e.status,
    });
    return {
        migrados: (foraSaida?.migrados || []).map(linha),
        descartados: (foraSaida?.descartados || []).map(linha),
    };
}

export const textoDaLinhaForaDeEscopo = (l) =>
    `${l.rotulo ? `${l.rotulo}: ` : ''}${l.titulo}${l.detalhe ? ` (${l.detalhe})` : ''}`;

// Markdown: um bloco por grupo que tem entradas. `corpo` vazio quando não há nada.
export function foraDeEscopoParaMarkdown(foraSaida) {
    const { migrados, descartados } = linhasDoForaDeEscopo(foraSaida);
    const grupo = (rotulo, linhas) =>
        linhas.length
            ? `${rotulo}\n\n${linhas.map((l) => `- ${textoDaLinhaForaDeEscopo(l)}`).join('\n')}`
            : '';
    return [grupo('Migrados:', migrados), grupo('Descartados:', descartados)]
        .filter(Boolean)
        .join('\n\n');
}
