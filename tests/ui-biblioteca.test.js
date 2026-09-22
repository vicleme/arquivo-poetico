import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { situacaoDominioPublico } from '../js/ui-biblioteca.js';
import {
    linhasFonteTexto,
    extrairFontesUnicas,
    ehObraPropria,
    normalizarGrafia,
    ehGrafiaAntiga,
    GRAFIA_ATUAL,
    GRAFIA_ETIMOLOGICA,
    GRAFIA_QUINHENTISTA,
} from '../js/utils.js';
import { contarCamposPreenchidos } from '../js/exportar-md.js';

describe('situacaoDominioPublico', () => {
    it('óbito + 71 anos já passou: livre', () => {
        assert.deepEqual(situacaoDominioPublico({ obito: { ano: 1914 } }, 2026), {
            estado: 'livre',
            desde: 1985,
        });
    });

    it('domínio público começa em 1º de janeiro de Y+71, não em Y+70', () => {
        assert.equal(situacaoDominioPublico({ obito: { ano: 1955 } }, 2025).estado, 'protegido');
        assert.equal(situacaoDominioPublico({ obito: { ano: 1955 } }, 2026).estado, 'livre');
    });

    it('sem óbito: não dá pra afirmar nada', () => {
        assert.deepEqual(situacaoDominioPublico({ nome: 'X' }, 2026), {
            estado: 'sem-obito',
            desde: null,
        });
    });
});

describe('linhasFonteTexto', () => {
    const autores = [
        { id: 1, nome: 'Augusto dos Anjos', obito: { ano: 1914 } },
        { id: 2, nome: 'Victor Leme' },
    ];

    it('mostra Fonte/Edição/Link/conferido e o domínio público derivado do óbito', () => {
        const item = {
            autoria: [{ autorId: 1, papel: 'Autor' }],
            fonteTexto: { origem: 'Wikisource', edicao: 'Eu, 1912', link: '', conferido: false },
        };
        assert.deepEqual(linhasFonteTexto(item, autores, 2026), [
            { rotulo: 'Fonte', valor: 'Wikisource' },
            { rotulo: 'Edição', valor: 'Eu, 1912' },
            { rotulo: 'Texto conferido', valor: 'não' },
            {
                rotulo: 'Domínio público',
                valor: 'Augusto dos Anjos — domínio público desde 1985 (estimativa informativa)',
            },
        ]);
    });

    it('o domínio público acompanha o cadastro do Autor (não fica congelado no texto)', () => {
        const item = { autoria: [{ autorId: 1, papel: 'Autor' }] };
        const antes = linhasFonteTexto(item, autores, 2026)[0].valor;
        const depois = linhasFonteTexto(item, [{ ...autores[0], obito: { ano: 1990 } }], 2026)[0]
            .valor;
        assert.match(antes, /desde 1985/);
        assert.match(depois, /ainda protegido até 2060/);
    });

    it('texto próprio, sem Fonte e sem óbito no Autor, não gera nada', () => {
        assert.deepEqual(
            linhasFonteTexto({ autoria: [{ autorId: 2, papel: 'Autor' }] }, autores),
            [],
        );
        assert.deepEqual(linhasFonteTexto({}, autores), []);
    });

    it('grafia vazia (nunca definida) não gera linha; "Atual"/etimológica/quinhentista geram, com o rótulo (não o valor cru do enum)', () => {
        const semGrafia = linhasFonteTexto({ fonteTexto: { origem: 'X', grafia: '' } });
        assert.deepEqual(semGrafia, [
            { rotulo: 'Fonte', valor: 'X' },
            { rotulo: 'Texto conferido', valor: 'não' },
        ]);

        const comAtual = linhasFonteTexto({
            fonteTexto: { origem: 'X', grafia: GRAFIA_ATUAL },
        });
        assert.deepEqual(comAtual, [
            { rotulo: 'Fonte', valor: 'X' },
            { rotulo: 'Grafia', valor: 'Atual (padrão)' },
            { rotulo: 'Texto conferido', valor: 'não' },
        ]);

        const comGrafia = linhasFonteTexto({
            fonteTexto: { origem: 'X', grafia: GRAFIA_ETIMOLOGICA },
        });
        assert.deepEqual(comGrafia, [
            { rotulo: 'Fonte', valor: 'X' },
            {
                rotulo: 'Grafia',
                valor: 'Etimológica (ph, th, y, dobradas — ex.: Cruz e Sousa, Augusto dos Anjos)',
            },
            { rotulo: 'Texto conferido', valor: 'não' },
        ]);

        const comQuinhentista = linhasFonteTexto({
            fonteTexto: { origem: 'X', grafia: GRAFIA_QUINHENTISTA },
        });
        assert.deepEqual(comQuinhentista, [
            { rotulo: 'Fonte', valor: 'X' },
            { rotulo: 'Grafia', valor: 'Quinhentista (português do séc. XVI — ex.: Camões)' },
            { rotulo: 'Texto conferido', valor: 'não' },
        ]);
    });
});

describe('normalizarGrafia', () => {
    it('reconhece variações de grafia etimológica em texto livre', () => {
        assert.equal(normalizarGrafia('original'), GRAFIA_ETIMOLOGICA);
        assert.equal(normalizarGrafia('Original da edição'), GRAFIA_ETIMOLOGICA);
        assert.equal(normalizarGrafia('anterior à reforma'), GRAFIA_ETIMOLOGICA);
        assert.equal(normalizarGrafia('grafia antiga'), GRAFIA_ETIMOLOGICA);
        assert.equal(normalizarGrafia('pré-reforma'), GRAFIA_ETIMOLOGICA);
        assert.equal(normalizarGrafia('etimológica'), GRAFIA_ETIMOLOGICA);
    });

    it('reconhece variações de grafia quinhentista em texto livre', () => {
        assert.equal(normalizarGrafia('quinhentista'), GRAFIA_QUINHENTISTA);
        assert.equal(normalizarGrafia('século XVI'), GRAFIA_QUINHENTISTA);
        assert.equal(normalizarGrafia('grafia camoniana'), GRAFIA_QUINHENTISTA);
    });

    it('texto vazio/ausente vira "nunca definida" (\'\'), não "Atual"', () => {
        assert.equal(normalizarGrafia(''), '');
        assert.equal(normalizarGrafia(undefined), '');
        assert.equal(normalizarGrafia(null), '');
        assert.equal(normalizarGrafia('   '), '');
    });

    it('"atual"/"atualizada" (texto presente, não vazio) viram GRAFIA_ATUAL — não \'\'', () => {
        assert.equal(normalizarGrafia('atual'), GRAFIA_ATUAL);
        assert.equal(normalizarGrafia('atualizada'), GRAFIA_ATUAL);
        assert.equal(normalizarGrafia('moderna'), GRAFIA_ATUAL);
    });
});

describe('ehGrafiaAntiga', () => {
    it('só as tradições antigas contam como "antiga" — vazio e Atual não', () => {
        assert.equal(ehGrafiaAntiga(''), false);
        assert.equal(ehGrafiaAntiga(undefined), false);
        assert.equal(ehGrafiaAntiga(GRAFIA_ATUAL), false);
        assert.equal(ehGrafiaAntiga(GRAFIA_ETIMOLOGICA), true);
        assert.equal(ehGrafiaAntiga(GRAFIA_QUINHENTISTA), true);
        // Futura tradição hipotética: qualquer valor não-vazio e diferente
        // de GRAFIA_ATUAL conta, sem precisar editar a função.
        assert.equal(ehGrafiaAntiga('futura-tradicao'), true);
    });
});

describe('Fonte: sugestões, obra própria e contagem', () => {
    it('sugestões de origem = semente + o que já foi usado, sem repetir; edição só o usado', () => {
        const itens = [
            { fonteTexto: { origem: 'Obra própria', edicao: 'Eu, 1912' } },
            { fonteTexto: { origem: 'Antologia da escola', edicao: '' } },
            {},
        ];
        const origens = extrairFontesUnicas(itens, 'origem');
        assert.ok(origens.includes('Obra própria') && origens.includes('Wikisource'));
        assert.ok(origens.includes('Antologia da escola'));
        assert.equal(origens.filter((o) => o === 'Obra própria').length, 1);
        assert.deepEqual(extrairFontesUnicas(itens, 'edicao'), ['Eu, 1912']);
    });

    it('obra própria é reconhecida sem depender de maiúsculas e não mostra "Texto conferido"', () => {
        assert.equal(ehObraPropria({ origem: ' obra PRÓPRIA ' }), true);
        assert.equal(ehObraPropria({ origem: 'Wikisource' }), false);
        const linhas = linhasFonteTexto({
            fonteTexto: { origem: 'Obra própria', conferido: false },
        });
        assert.deepEqual(linhas, [{ rotulo: 'Fonte', valor: 'Obra própria' }]);
    });

    it('Fonte conta como UM campo preenchido (origem ou edição), não quatro', () => {
        const base = contarCamposPreenchidos({});
        assert.equal(contarCamposPreenchidos({ fonteTexto: { origem: 'Obra própria' } }), base + 1);
        assert.equal(
            contarCamposPreenchidos({
                fonteTexto: { origem: 'X', edicao: 'Y', link: 'https://z', conferido: true },
            }),
            base + 1,
        );
        assert.equal(contarCamposPreenchidos({ fonteTexto: { conferido: true } }), base);
    });
});
