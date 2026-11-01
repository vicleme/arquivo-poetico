import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    TIPO_PESSOA_PUBLICA,
    CONHECIDO_COMO_SUGERIDOS,
    ehPessoaPublica,
    normalizarConhecidoComo,
    conhecidoComoDaEntrada,
    camposConhecidoComo,
    extrairConhecidoComoUnicos,
} from '../js/conhecido-como.js';
import { TIPOS_REFERENCIA_EXTERNA_SUGERIDOS } from '../js/utils.js';

describe('Conhecido(a) como: tipo Pessoa pública', () => {
    it('o tipo bate com a sugestão de tipo de Referências', () => {
        assert.ok(TIPOS_REFERENCIA_EXTERNA_SUGERIDOS.includes(TIPO_PESSOA_PUBLICA));
    });

    it('reconhece o tipo ignorando caixa, acento e espaços', () => {
        for (const v of ['Pessoa pública', 'pessoa publica', '  PESSOA   PÚBLICA ']) {
            assert.equal(ehPessoaPublica(v), true, v);
        }
    });

    it('recusa outros tipos, vazio e o que não é texto', () => {
        for (const v of ['Notícia', 'Marco histórico', '', 'Pessoa', undefined, null, 3, {}]) {
            assert.equal(ehPessoaPublica(v), false, String(v));
        }
    });
});

describe('Conhecido(a) como: normalizar', () => {
    it('tira espaços das pontas e repetidos e descarta vazio', () => {
        assert.deepEqual(normalizarConhecidoComo(['  Poeta   maldito ', '', '   ']), [
            'Poeta maldito',
        ]);
    });

    it('descarta o que não é texto e devolve [] quando não é lista', () => {
        assert.deepEqual(normalizarConhecidoComo(['Poeta', 3, null, {}, ['x']]), ['Poeta']);
        for (const v of [undefined, null, 'Cantor(a)', 5, {}]) {
            assert.deepEqual(normalizarConhecidoComo(v), [], String(v));
        }
    });

    it('não repete a mesma tag ignorando caixa e acento, e vale a primeira', () => {
        assert.deepEqual(normalizarConhecidoComo(['Poeta maldito', 'poeta  MALDITO']), [
            'Poeta maldito',
        ]);
        assert.deepEqual(normalizarConhecidoComo(['Músico', 'musico']), ['Músico']);
    });

    it('usa a grafia da fábrica quando a tag casa com uma sugestão', () => {
        assert.deepEqual(
            normalizarConhecidoComo(['cantor(a)', 'FILOSOFO(A)', 'figura historica']),
            ['Cantor(a)', 'Filósofo(a)', 'Figura histórica'],
        );
    });

    it('mantém a ordem em que as tags foram postas', () => {
        assert.deepEqual(normalizarConhecidoComo(['Escritor(a)', 'Cantor(a)', 'Atleta']), [
            'Escritor(a)',
            'Cantor(a)',
            'Atleta',
        ]);
    });

    it('devolve uma lista nova, sem alterar a de entrada', () => {
        const entrada = ['  cantor(a) ', 'Cantor(a)'];
        const copia = [...entrada];
        const saida = normalizarConhecidoComo(entrada);
        assert.notEqual(saida, entrada);
        assert.deepEqual(entrada, copia);
    });
});

describe('Conhecido(a) como: ler da entrada', () => {
    it('entrada antiga, sem o campo, dá lista vazia', () => {
        assert.deepEqual(conhecidoComoDaEntrada({ tipo: 'Pessoa pública', texto: 'Fulano' }), []);
        assert.deepEqual(conhecidoComoDaEntrada(undefined), []);
        assert.deepEqual(conhecidoComoDaEntrada(null), []);
    });

    it('limpa campo que chegou sujo (importação, backup)', () => {
        assert.deepEqual(
            conhecidoComoDaEntrada({ conhecidoComo: [' cantor(a)', 'Cantor(a)', 7, ''] }),
            ['Cantor(a)'],
        );
        assert.deepEqual(conhecidoComoDaEntrada({ conhecidoComo: 'Cantor(a)' }), []);
    });
});

describe('Conhecido(a) como: campos a gravar na entrada', () => {
    it('com Pessoa pública e tags, devolve a chave com a lista limpa', () => {
        assert.deepEqual(camposConhecidoComo('Pessoa pública', ['cantor(a)', ' Poeta ']), {
            conhecidoComo: ['Cantor(a)', 'Poeta'],
        });
    });

    it('com outro tipo, não devolve nada (trocar o tipo apaga as tags)', () => {
        assert.deepEqual(camposConhecidoComo('Notícia', ['Cantor(a)']), {});
        assert.deepEqual(camposConhecidoComo('', ['Cantor(a)']), {});
        assert.deepEqual(camposConhecidoComo(undefined, ['Cantor(a)']), {});
    });

    it('sem tag nenhuma, a chave não existe', () => {
        assert.deepEqual(camposConhecidoComo('Pessoa pública', []), {});
        assert.deepEqual(camposConhecidoComo('Pessoa pública', ['', '  ']), {});
        assert.deepEqual(camposConhecidoComo('Pessoa pública', undefined), {});
    });

    it('espalhado na entrada, não deixa a chave quando não vale', () => {
        const base = { tipo: 'Notícia', texto: 'X' };
        const entrada = { ...base, ...camposConhecidoComo(base.tipo, ['Cantor(a)']) };
        assert.equal('conhecidoComo' in entrada, false);
    });
});

describe('Conhecido(a) como: sugestões do autocompletar', () => {
    const ref = (conhecidoComo) => ({ tipo: 'Pessoa pública', texto: 'F', conhecidoComo });

    it('sem nenhum texto, são as sugestões de fábrica em ordem alfabética', () => {
        const esperado = [...CONHECIDO_COMO_SUGERIDOS].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        assert.deepEqual(extrairConhecidoComoUnicos([]), esperado);
        assert.deepEqual(extrairConhecidoComoUnicos(undefined), esperado);
    });

    it('junta as tags já usadas, sem repetir as de fábrica', () => {
        const textos = [
            { referenciasExternas: [ref(['Poeta maldito', 'cantor(a)'])] },
            { referenciasExternas: [ref(['poeta  MALDITO', 'Dramaturgo'])] },
        ];
        const r = extrairConhecidoComoUnicos(textos);
        assert.equal(r.filter((t) => t === 'Cantor(a)').length, 1);
        assert.ok(r.includes('Poeta maldito'));
        assert.ok(r.includes('Dramaturgo'));
        assert.equal(r.length, CONHECIDO_COMO_SUGERIDOS.length + 2);
    });

    it('ignora texto sem Referências e entrada sem o campo', () => {
        const textos = [
            {},
            { referenciasExternas: 'lixo' },
            { referenciasExternas: [{ tipo: 'Notícia', texto: 'N' }, null] },
        ];
        assert.equal(extrairConhecidoComoUnicos(textos).length, CONHECIDO_COMO_SUGERIDOS.length);
    });
});
