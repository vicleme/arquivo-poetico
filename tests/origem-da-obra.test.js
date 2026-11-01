import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    origensDaEntrada,
    textoOrigemDaEntrada,
    rotuloDaOrigem,
    entradaTemAsOrigens,
    mesmaListaDeOrigens,
    definirOrigensDaEntrada,
    migrarOrigensDaEntrada,
    capturarOrigensDaEntrada,
    restaurarOrigensDaEntrada,
} from '../js/origem-da-obra.js';
import {
    extrairOrigensUnicas,
    extrairOrigensDaObra,
    origemUnicaDaObra,
    migrarEntradaIntertextualidade,
    migrarEntradaHipertextualidade,
} from '../js/intertextualidade.js';
import { partesEntradaIntertexto, agruparIntertextualidadePorTipo } from '../js/utils.js';

const { db } = await import('../js/db.js');
const { celulaIntertextualidade, celulaHipertextualidade } = await import('../js/render-listas.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');

describe('origem da obra: lógica pura', () => {
    it('lê a lista, sem vazios nem repetidos (ignora acento e caixa), e o resto vale vazio', () => {
        assert.deepEqual(origensDaEntrada({ origemObra: ['Grécia', ' grecia ', '', 'Roma'] }), [
            'Grécia',
            'Roma',
        ]);
        assert.deepEqual(origensDaEntrada({ origemObra: 'Grécia' }), []);
        assert.deepEqual(origensDaEntrada({}), []);
        assert.deepEqual(origensDaEntrada(null), []);
    });

    it('texto, rótulo e checagem de quem tem todas', () => {
        const e = { origemObra: ['França', 'Alemanha', 'Itália'] };
        assert.equal(textoOrigemDaEntrada(e), 'França, Alemanha e Itália');
        assert.equal(rotuloDaOrigem({ origemObra: ['Grécia'] }), 'origem Grécia');
        assert.equal(rotuloDaOrigem({}), '');
        assert.equal(entradaTemAsOrigens(e, ['franca', 'Itália']), true);
        assert.equal(entradaTemAsOrigens(e, ['Brasil']), false);
        assert.equal(mesmaListaDeOrigens(['A', 'B'], ['A', 'B']), true);
        assert.equal(mesmaListaDeOrigens(['a'], ['A']), false);
    });

    it('definir grava a lista e, vazia, tira a chave; migrar é idempotente e não cria a chave', () => {
        const e = { obra: 'Mito de Prometeu' };
        assert.equal(migrarOrigensDaEntrada(e), false);
        assert.deepEqual(e, { obra: 'Mito de Prometeu' });
        definirOrigensDaEntrada(e, ['Grécia', 'grécia']);
        assert.deepEqual(e.origemObra, ['Grécia']);
        definirOrigensDaEntrada(e, []);
        assert.equal('origemObra' in e, false);
        const sujo = { origemObra: [' Grécia ', 'Grécia'] };
        assert.equal(migrarOrigensDaEntrada(sujo), true);
        assert.deepEqual(sujo.origemObra, ['Grécia']);
        assert.equal(migrarOrigensDaEntrada(sujo), false);
        const vazio = { origemObra: [] };
        assert.equal(migrarOrigensDaEntrada(vazio), true);
        assert.equal('origemObra' in vazio, false);
    });

    it('capturar e restaurar devolvem a entrada como estava, inclusive sem a chave', () => {
        const com = { origemObra: ['Grécia'] };
        const captura = capturarOrigensDaEntrada(com);
        com.origemObra.push('Roma');
        restaurarOrigensDaEntrada(com, captura);
        assert.deepEqual(com.origemObra, ['Grécia']);
        const sem = {};
        const c2 = capturarOrigensDaEntrada(sem);
        sem.origemObra = ['X'];
        restaurarOrigensDaEntrada(sem, c2);
        assert.equal('origemObra' in sem, false);
    });
});

describe('origem da obra: migração e sugestões', () => {
    it('as migrações de Inter e Hiper limpam a lista que já existe e não criam a chave', () => {
        const inter = migrarEntradaIntertextualidade({
            obra: 'A',
            origemObra: ['Grécia', 'grecia'],
        });
        assert.deepEqual(inter.origemObra, ['Grécia']);
        assert.equal('origemObra' in migrarEntradaIntertextualidade({ obra: 'A' }), false);
        const hiper = migrarEntradaHipertextualidade({ hipotexto: 'H', origemObra: [' Brasil '] });
        assert.deepEqual(hiper.origemObra, ['Brasil']);
        assert.equal('origemObra' in migrarEntradaHipertextualidade({ hipotexto: 'H' }), false);
    });

    it('as sugestões juntam Inter e Hiper, uma por lugar, e respeitam a obra', () => {
        const itens = [
            {
                intertextualidade: [
                    { obra: 'Mito de Prometeu', origemObra: ['Grécia'] },
                    { obra: 'Saci', origemObra: ['Brasil'] },
                ],
                hipertextualidade: [{ hipotexto: 'Odisseia', origemObra: ['grécia', 'Roma'] }],
            },
        ];
        assert.deepEqual(extrairOrigensUnicas(itens), ['Brasil', 'Grécia', 'Roma']);
        assert.deepEqual(extrairOrigensUnicas(itens, { obra: 'Saci' }), ['Brasil']);
        assert.deepEqual(extrairOrigensUnicas(itens, { obra: 'Odisseia' }), ['grécia', 'Roma']);
    });
});

describe('origem da obra: a mesma obra', () => {
    const itens = [
        {
            intertextualidade: [
                {
                    tipoObra: 'Livro',
                    obra: 'Odisseia',
                    autores: ['Homero'],
                    origemObra: ['Grécia'],
                },
                {
                    tipoObra: 'Livro',
                    obra: 'Odisseia',
                    autores: ['Homero'],
                    origemObra: ['grécia'],
                },
                { tipoObra: 'Livro', obra: 'Odisseia', autores: ['Homero'] },
                { tipoObra: 'Livro', obra: 'Outra', origemObra: ['Roma'] },
            ],
            hipertextualidade: [
                {
                    tipoObra: 'Livro',
                    hipotexto: 'Odisseia',
                    autores: ['Homero'],
                    origemObra: ['Grécia'],
                },
            ],
        },
    ];
    const criterio = { tipoObra: 'Livro', obra: 'Odisseia', autores: ['Homero'] };

    it('entrada sem origem não conta e a grafia não separa listas', () => {
        assert.deepEqual(extrairOrigensDaObra(itens, criterio), [['Grécia']]);
        assert.deepEqual(origemUnicaDaObra(itens, criterio), ['Grécia']);
    });

    it('duas listas diferentes, ou nenhuma, não preenchem nada', () => {
        assert.deepEqual(origemUnicaDaObra(itens, { obra: 'Outra' }), ['Roma']);
        assert.deepEqual(origemUnicaDaObra(itens, { obra: 'Inexistente' }), []);
        assert.deepEqual(origemUnicaDaObra(itens, { obra: '' }), []);
        const duas = [
            {
                intertextualidade: [
                    { obra: 'X', origemObra: ['A'] },
                    { obra: 'X', origemObra: ['B'] },
                ],
            },
        ];
        assert.deepEqual(origemUnicaDaObra(duas, { obra: 'X' }), []);
        assert.equal(extrairOrigensDaObra(duas, { obra: 'X' }).length, 2);
    });
});

describe('origem da obra: leitores', () => {
    const prometeu = {
        relacao: 'Alusão',
        tipoObra: 'Mitologia',
        obra: 'Mito de Prometeu',
        origemObra: ['Grécia'],
        personagens: ['Prometeu', 'Zeus'],
    };

    it('o corpo da entrada mostra a origem entre autor e personagens', () => {
        assert.equal(
            partesEntradaIntertexto(prometeu).corpo,
            'Mito de Prometeu (origem Grécia; personagens Prometeu e Zeus)',
        );
        assert.equal(
            partesEntradaIntertexto({
                obra: 'Dom Casmurro',
                autor: 'Machado',
                personagem: 'Capitu',
            }).corpo,
            'Dom Casmurro (Machado; personagem Capitu)',
        );
        assert.equal(
            partesEntradaIntertexto({ obra: 'Saci', origemObra: ['Brasil'] }).corpo,
            'Saci (origem Brasil)',
        );
    });

    it('a origem com vírgula leva o grupo para sub-lista', () => {
        const grupos = agruparIntertextualidadePorTipo([
            { tipoObra: 'Lenda', obra: 'A', origemObra: ['Rio, Brasil'] },
            { tipoObra: 'Lenda', obra: 'B' },
        ]);
        assert.equal(grupos[0].subBullet, true);
    });

    it('a célula da tabela mostra a origem em Inter e em Hiper', () => {
        assert.match(celulaIntertextualidade([prometeu]), /origem Grécia, Prometeu e Zeus/);
        const hiper = celulaHipertextualidade([
            {
                tipoObra: 'Livro',
                hipotexto: 'Odisseia',
                autores: ['Homero'],
                origemObra: ['Grécia'],
            },
        ]);
        assert.match(hiper, /Homero, origem Grécia/);
        assert.doesNotMatch(
            celulaHipertextualidade([{ tipoObra: 'Livro', hipotexto: 'H' }]),
            /origem/,
        );
    });

    describe('Ver, .md e .csv', () => {
        const poema = () => ({
            id: 1,
            titulo: 'Fogo',
            texto: 'x',
            intertextualidade: [prometeu],
            hipertextualidade: [
                {
                    tipoObra: 'Livro',
                    hipotexto: 'Odisseia',
                    autores: ['Homero'],
                    origemObra: ['Grécia'],
                },
                { tipoObra: 'Livro', hipotexto: 'Sem origem' },
            ],
        });
        beforeEach(() => {
            db.poemas = [poema()];
            db.prosas = [];
        });

        it('o Ver mostra a origem nas duas listas', () => {
            const html = renderVisualizacaoHtml(db.poemas[0]);
            assert.match(html, /Mito de Prometeu \(origem Grécia; personagens Prometeu e Zeus\)/);
            assert.match(html, /\(Homero; origem Grécia\)/);
            assert.equal((html.match(/origem Grécia/g) || []).length, 2);
        });

        it('o .md mostra a origem nas duas listas', () => {
            const md = gerarMarkdownExportacao(db.poemas);
            assert.match(md, /Mito de Prometeu \(origem Grécia; personagens Prometeu e Zeus\)/);
            assert.match(md, /\(Homero; origem Grécia\)/);
        });

        it('o .csv leva a origem na leitura e em colunas por posição', () => {
            const csv = gerarCsvTextos('poema', [montarRegistro('poema', db.poemas[0])], db);
            const [cab, ...resto] = csv
                .replace(/^\uFEFF/, '')
                .trim()
                .split(/\r?\n/);
            const cols = cab.split(',');
            assert.ok(cols.includes('intertextualidade_origem'));
            assert.ok(cols.includes('hipertextualidade_origem'));
            assert.match(csv, /Mito de Prometeu \(origem Grécia; personagens Prometeu e Zeus\)/);
            assert.match(csv, /Odisseia \(autor Homero; origem Grécia\)/);
            assert.ok(resto.length >= 1);
            assert.match(csv, /,Grécia,Prometeu; Zeus,/);
            assert.match(csv, /"Grécia \| "/);
        });
    });
});
