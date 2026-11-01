// Entrega 2 da remodelagem de Intertextualidade: a migração está ligada ao
// importarDB e os leitores antigos (listagem, busca, exportações) enxergam
// tanto o formato antigo (tipo e texto) quanto o novo (tipoObra e obra).
import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { db, importarDB } = await import('../js/db.js');
const { tipoObraDaEntrada, obraDaEntrada, agruparIntertextualidadePorTipo } =
    await import('../js/utils.js');
const { decorarCamposBusca, celulaIntertextualidade, celulaHipertextualidade } =
    await import('../js/render-listas.js');

describe('importarDB migra Intertextualidade para o formato novo', () => {
    it('poemas e prosas com tipo e texto passam a ter tipoObra e obra', async () => {
        await importarDB({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    texto: 'x',
                    intertextualidade: [{ tipo: 'Música', texto: 'Construção', link: 'l' }],
                },
            ],
            prosas: [
                {
                    id: 2,
                    titulo: 'B',
                    intertextualidade: [{ tipo: 'Livro', texto: 'Dom Casmurro' }],
                },
            ],
        });
        const e = db.poemas[0].intertextualidade[0];
        assert.equal(e.tipoObra, 'Música');
        assert.equal(e.obra, 'Construção');
        assert.equal(e.relacao, '');
        assert.equal(e.link, 'l');
        assert.ok(!('tipo' in e) && !('texto' in e));
        assert.equal(db.prosas[0].intertextualidade[0].obra, 'Dom Casmurro');
    });

    it('formato de objeto único antigo vira lista já no formato novo', async () => {
        await importarDB({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    intertextualidade: { tipo: 'Filme', texto: 'Cidade de Deus' },
                },
            ],
        });
        assert.deepEqual(
            db.poemas[0].intertextualidade.map((e) => [e.tipoObra, e.obra]),
            [['Filme', 'Cidade de Deus']],
        );
    });

    it('importar de novo não muda nada (idempotente)', async () => {
        const bruto = {
            poemas: [{ id: 1, titulo: 'A', intertextualidade: [{ tipo: 'Livro', texto: 'X' }] }],
        };
        await importarDB(bruto);
        const antes = JSON.stringify(db.poemas[0].intertextualidade);
        await importarDB({ poemas: db.poemas });
        assert.equal(JSON.stringify(db.poemas[0].intertextualidade), antes);
    });
});

describe('importarDB migra Hipertextualidade para o formato novo', () => {
    it('tipo vira tipoObra e entram autores (lista vazia) e descricao vazios', async () => {
        await importarDB({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    hipertextualidade: [
                        { tipo: 'Livro', relacao: 'Releitura', hipotexto: 'Dom Casmurro' },
                    ],
                },
            ],
            prosas: [],
        });
        const h = db.poemas[0].hipertextualidade[0];
        assert.equal(h.tipoObra, 'Livro');
        assert.deepEqual(h.autores, []);
        assert.ok(!('autor' in h));
        assert.equal(h.descricao, '');
        assert.equal(h.hipotexto, 'Dom Casmurro');
        assert.ok(!('tipo' in h));
    });
});

describe('Leitores compatíveis com os dois formatos', () => {
    it('tipoObraDaEntrada e obraDaEntrada leem o novo e o antigo', () => {
        assert.equal(tipoObraDaEntrada({ tipoObra: 'Livro' }), 'Livro');
        assert.equal(tipoObraDaEntrada({ tipo: 'Música' }), 'Música');
        assert.equal(obraDaEntrada({ obra: 'A' }), 'A');
        assert.equal(obraDaEntrada({ texto: 'B' }), 'B');
        assert.equal(obraDaEntrada(null), '');
    });

    it('agrupamento por tipo funciona com entradas novas', () => {
        const grupos = agruparIntertextualidadePorTipo([
            { tipoObra: 'Livro', obra: 'A' },
            { tipoObra: 'Livro', obra: 'B, de C' },
            { tipoObra: 'Música', obra: 'D' },
        ]);
        assert.deepEqual(
            grupos.map((g) => [g.tipo, g.entradas.length, g.subBullet]),
            [
                ['Livro', 2, true],
                ['Música', 1, false],
            ],
        );
    });

    it('a busca por hipertexto acha tipo de obra, autor e descrição do formato novo', () => {
        const d = decorarCamposBusca({
            id: 1,
            hipertextualidade: [
                {
                    relacao: 'Paródia',
                    hipotexto: 'Canção do Exílio',
                    tipoObra: 'Poema',
                    autor: 'Gonçalves Dias',
                    descricao: 'de 1843',
                },
            ],
        });
        for (const termo of ['Paródia', 'Canção do Exílio', 'Poema', 'Gonçalves Dias', '1843']) {
            assert.ok(d._buscaHipertexto.includes(termo), termo);
        }
    });

    it('a busca por intertexto: acha obra, autor, personagem e trecho do formato novo', () => {
        const d = decorarCamposBusca({
            id: 1,
            intertextualidade: [
                {
                    relacao: 'Citação',
                    tipoObra: 'Livro',
                    obra: 'Dom Casmurro',
                    autor: 'Machado',
                    personagem: 'Capitu',
                    trecho: 'olhos de ressaca',
                },
            ],
        });
        for (const termo of ['Citação', 'Livro', 'Dom Casmurro', 'Machado', 'Capitu', 'ressaca']) {
            assert.ok(d._buscaIntertexto.includes(termo), termo);
        }
    });
});

describe('Células da listagem: Intertextualidade e Hipertextualidade', () => {
    it('Inter mostra relação, tipo de obra, obra, quem, descrição, trecho e traduzido', () => {
        const html = celulaIntertextualidade([
            {
                relacao: 'Citação',
                tipoObra: 'Livro',
                obra: 'Dom Casmurro',
                autor: 'Machado de Assis',
                personagem: 'Capitu',
                descricao: 'romance de 1899',
                trecho: 'olhos de ressaca',
                traduzido: true,
            },
        ]);
        for (const t of [
            'Citação',
            'Livro',
            'Dom Casmurro',
            'Machado de Assis, Capitu',
            'romance de 1899',
            'olhos de ressaca',
            '(traduzido)',
        ]) {
            assert.ok(html.includes(t), t);
        }
    });

    it('Inter com entrada no formato antigo continua aparecendo', () => {
        const html = celulaIntertextualidade([{ tipo: 'Música', texto: 'Construção' }]);
        assert.ok(html.includes('Música') && html.includes('Construção'));
    });

    it('Inter e Hiper sem entradas mostram o traço', () => {
        assert.match(celulaIntertextualidade([]), />—</);
        assert.match(celulaHipertextualidade(undefined), />—</);
    });

    it('Hiper mostra tipo de obra, relação e hipotexto, autor e descrição', () => {
        const html = celulaHipertextualidade([
            {
                relacao: 'Paródia',
                hipotexto: 'Canção do Exílio',
                tipoObra: 'Poema',
                autor: 'Gonçalves Dias',
                descricao: 'poema de 1843',
            },
        ]);
        for (const t of [
            'Poema',
            'Paródia',
            'Canção do Exílio',
            'Gonçalves Dias',
            'poema de 1843',
        ]) {
            assert.ok(html.includes(t), t);
        }
    });

    it('escapa HTML nos campos novos', () => {
        const html = celulaIntertextualidade([{ obra: 'a', autor: '<b>x</b>' }]);
        assert.ok(!html.includes('<b>x</b>'));
    });
});
