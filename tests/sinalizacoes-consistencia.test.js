// Este teste é estático (lê o texto-fonte, não importa os módulos) de
// propósito, nos moldes de wiring-onclick.test.js: SINAL_CATEGORIAS
// (editor.js) é a lista única de configuração de onde tudo mais deveria
// derivar, mas cada consumidor (SINALIZACOES_CATEGORIAS em utils.js,
// CORES_CATEGORIA_SINALIZACAO em render-listas.js, os datalists em
// index.html/modais) repete a chave/slug na mão em vez de gerar a
// partir da lista — ver "fan-out por campo novo" em
// manutencao/licoes-de-sessao.md. Sem isso, um descasamento de string
// entre esses lugares não quebra nada visualmente nem nos testes
// existentes; só faz autocomplete ou cor sumir silenciosamente (foi
// exatamente o que aconteceu com "imagetico" vs "dominioImagetico").
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    const htmlCombinado =
        fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8') +
        fs
            .readdirSync(modaisDir)
            .filter((f) => f.endsWith('.html'))
            .map((f) => fs.readFileSync(path.join(modaisDir, f), 'utf8'))
            .join('\n');

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
