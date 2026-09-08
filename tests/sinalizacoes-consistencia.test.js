// SINALIZACOES_CATEGORIAS (utils.js) e CORES_CATEGORIA_SINALIZACAO
// (render-listas.js) continuam repetidas na mão (nada gerado a partir
// de SINAL_CATEGORIAS lá) — a checagem delas abaixo continua estática
// de propósito, nos moldes de wiring-onclick.test.js, pra pegar
// descasamento de string sem precisar de DOM (ver "fan-out por campo
// novo" em manutencao/licoes-de-sessao.md; foi assim que "imagetico" vs
// "dominioImagetico" foi pego).
//
// Os datalists de sugestão já não são todos estáticos: desde a geração
// programática do bloco de Sinalizações (ver criarBlocosSinalizacoesHTML
// em editor.js), o datalist "-prosa" de cada categoria é montado em
// runtime por renderSinalizacoesProsa(), não existe mais como texto no
// HTML de modal-prosa.html. Por isso essa checagem específica renderiza
// de verdade (happy-dom) em vez de só ler o arquivo — os outros 3
// datalists (sem sufixo, -bulk, -bulk-prosa) continuam estáticos em
// index.html e seguem checados por leitura de texto.
import './helpers/dom-real.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSinalizacoesProsa } from '../js/editor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');

// slugDom (editor.js): "Estilo" -> "estilo", "DominioImagetico" ->
// "dominioImagetico". Reimplementado aqui de propósito — é a mesma
// regra de uma linha que o próprio editor.js usa, e reimplementar em
// vez de importar é o que permite este teste rodar sem DOM real.
const slugDom = (chave) => chave.charAt(0).toLowerCase() + chave.slice(1);

function extrairBlocoEntreChaves(texto, marcador, aberturaChar, fechamentoChar) {
    const inicio = texto.indexOf(marcador);
    assert.ok(inicio !== -1, `Marcador "${marcador}" não encontrado no arquivo`);
    const inicioBloco = texto.indexOf(aberturaChar, inicio);
    let profundidade = 0;
    for (let i = inicioBloco; i < texto.length; i++) {
        if (texto[i] === aberturaChar) profundidade++;
        else if (texto[i] === fechamentoChar) {
            profundidade--;
            if (profundidade === 0) return texto.slice(inicioBloco, i + 1);
        }
    }
    throw new Error(`Bloco de "${marcador}" não fechou corretamente`);
}

function extrairSinalCategorias(editorJs) {
    const bloco = extrairBlocoEntreChaves(editorJs, 'const SINAL_CATEGORIAS = [', '[', ']');
    const regex = /chave:\s*'([^']+)'/g;
    const chaves = [];
    let m;
    while ((m = regex.exec(bloco))) chaves.push(m[1]);
    return chaves;
}

function extrairObjetoChaveValor(texto, marcador) {
    const bloco = extrairBlocoEntreChaves(texto, marcador, '{', '}');
    const regex = /(\w+):\s*'([^']+)'/g;
    const mapa = {};
    let m;
    while ((m = regex.exec(bloco))) mapa[m[1]] = m[2];
    return mapa;
}

function extrairObjetoChaves(texto, marcador) {
    const bloco = extrairBlocoEntreChaves(texto, marcador, '{', '}');
    const regex = /^\s*(\w+):/gm;
    const chaves = new Set();
    let m;
    while ((m = regex.exec(bloco))) chaves.add(m[1]);
    return chaves;
}

describe('consistência das categorias de Sinalizações entre editor/utils/render-listas/HTML', () => {
    const editorJs = fs.readFileSync(path.join(RAIZ, 'js/editor.js'), 'utf8');
    const utilsJs = fs.readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8');
    const renderListasJs = fs.readFileSync(path.join(RAIZ, 'js/render-listas.js'), 'utf8');
    const modaisDir = path.join(RAIZ, 'modais');
    // Corpo de Sinalizações da Prosa não é mais texto estático em
    // modal-prosa.html — renderiza de verdade (happy-dom, ver
    // helpers/dom-real.js) pra incluir o datalist "-prosa" gerado por
    // renderSinalizacoesProsa() na checagem abaixo.
    document.body.innerHTML = '<div id="pr-sinalizacoes-corpo"></div>';
    renderSinalizacoesProsa();
    const sinalizacoesProsaHtml = document.getElementById('pr-sinalizacoes-corpo').innerHTML;

    const htmlCombinado =
        fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8') +
        fs
            .readdirSync(modaisDir)
            .filter((f) => f.endsWith('.html'))
            .map((f) => fs.readFileSync(path.join(modaisDir, f), 'utf8'))
            .join('\n') +
        sinalizacoesProsaHtml;

    const categorias = extrairSinalCategorias(editorJs);
    const sinalizacoesCategorias = extrairObjetoChaveValor(
        utilsJs,
        'export const SINALIZACOES_CATEGORIAS = {',
    );
    const coresCategoria = extrairObjetoChaves(
        renderListasJs,
        'const CORES_CATEGORIA_SINALIZACAO = {',
    );

    it('SINAL_CATEGORIAS não está vazia (sanity check do próprio teste)', () => {
        assert.ok(categorias.length > 0);
    });

    for (const chave of categorias) {
        const slug = slugDom(chave);

        it(`"${chave}" tem entrada correspondente em SINALIZACOES_CATEGORIAS (utils.js)`, () => {
            assert.ok(
                Object.hasOwn(sinalizacoesCategorias, slug),
                `Falta a chave "${slug}" em SINALIZACOES_CATEGORIAS`,
            );
            assert.equal(
                sinalizacoesCategorias[slug],
                `sinalizacoes${chave}`,
                `SINALIZACOES_CATEGORIAS.${slug} deveria valer "sinalizacoes${chave}"`,
            );
        });

        it(`"${chave}" tem cor correspondente em CORES_CATEGORIA_SINALIZACAO (render-listas.js)`, () => {
            assert.ok(
                coresCategoria.has(slug),
                `Falta a chave "${slug}" em CORES_CATEGORIA_SINALIZACAO`,
            );
        });

        it(`"${chave}" tem os 4 datalists de sugestão (index.html/modais)`, () => {
            const idsEsperados = [
                `sugestoes-sinais-${slug}`,
                `sugestoes-sinais-${slug}-prosa`,
                `sugestoes-sinais-${slug}-bulk`,
                `sugestoes-sinais-${slug}-bulk-prosa`,
            ];
            const faltando = idsEsperados.filter((id) => !htmlCombinado.includes(`id="${id}"`));
            assert.deepEqual(
                faltando,
                [],
                `Datalist(s) faltando pra categoria "${chave}": ${faltando.join(', ')}`,
            );
        });
    }
});
