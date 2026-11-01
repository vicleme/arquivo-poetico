import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    GENEROS_PESSOA_PUBLICA,
    ORIENTACOES_PESSOA_PUBLICA,
    CORES_RACA_PESSOA_PUBLICA,
    normalizarGeneroPessoaPublica,
    normalizarOrientacaoPessoaPublica,
    normalizarCorRacaPessoaPublica,
    caracterizacaoDaEntrada,
    camposCaracterizacao,
    alternarEscolha,
    caracterizacaoDaUltimaCitacao,
    completarCaracterizacao,
    rotulosCaracterizacao,
} from '../js/caracterizacao-pessoa-publica.js';
import { GENEROS_SUGERIDOS, CORES_RACA_AUTOR } from '../js/utils.js';

const VAZIA = { genero: '', orientacao: '', corRaca: '' };

describe('listas', () => {
    it('os gêneros gravados são os mesmos de GENEROS_SUGERIDOS', () => {
        GENEROS_PESSOA_PUBLICA.forEach((g) => assert.ok(GENEROS_SUGERIDOS.includes(g.valor)));
        assert.deepEqual(
            GENEROS_PESSOA_PUBLICA.map((g) => g.valor),
            ['Mulher', 'Homem', 'Não-binário'],
        );
    });

    it('os símbolos dos botões são Vênus, Marte e 🜬 com NB escrito', () => {
        const simbolos = GENEROS_PESSOA_PUBLICA.map((g) => g.simbolo);
        assert.deepEqual(simbolos, ['♀︎', '♂︎', '🜬 NB']);
    });

    it('a orientação tem LGBT e Hétero, com bandeira e ⚤', () => {
        assert.deepEqual(
            ORIENTACOES_PESSOA_PUBLICA.map((o) => [o.valor, o.simbolo]),
            [
                ['LGBT', '🏳️‍🌈'],
                ['Hétero', '⚤︎'],
            ],
        );
    });

    it('cor/raça é a lista do Autor, com Indígena', () => {
        assert.deepEqual(CORES_RACA_PESSOA_PUBLICA, CORES_RACA_AUTOR);
        assert.ok(CORES_RACA_PESSOA_PUBLICA.includes('Indígena'));
    });
});

describe('normalização', () => {
    it('gênero aceita caixa e acento, e devolve a grafia canônica', () => {
        assert.equal(normalizarGeneroPessoaPublica('mulher'), 'Mulher');
        assert.equal(normalizarGeneroPessoaPublica(' HOMEM '), 'Homem');
        assert.equal(normalizarGeneroPessoaPublica('nao-binario'), 'Não-binário');
    });

    it('gênero fora dos três vira vazio (não informado), sem inventar', () => {
        ['Agênero', 'Genderfluid', '', '   ', null, undefined, 3, {}, ['Mulher']].forEach((v) =>
            assert.equal(normalizarGeneroPessoaPublica(v), '', String(v)),
        );
    });

    it('orientação aceita lgbt e hetero em qualquer caixa e acento', () => {
        assert.equal(normalizarOrientacaoPessoaPublica('lgbt'), 'LGBT');
        assert.equal(normalizarOrientacaoPessoaPublica('hetero'), 'Hétero');
        assert.equal(normalizarOrientacaoPessoaPublica('HÉTERO'), 'Hétero');
    });

    it('orientação: texto livre, booleano e vazio viram não informado', () => {
        ['gay', 'bissexual', true, false, '', null, undefined].forEach((v) =>
            assert.equal(normalizarOrientacaoPessoaPublica(v), '', String(v)),
        );
    });

    it('cor/raça aceita caixa e rejeita o que não está na lista', () => {
        assert.equal(normalizarCorRacaPessoaPublica('parda'), 'Parda');
        assert.equal(normalizarCorRacaPessoaPublica('INDIGENA'), 'Indígena');
        assert.equal(normalizarCorRacaPessoaPublica('Mestiça'), '');
        assert.equal(normalizarCorRacaPessoaPublica(undefined), '');
    });
});

describe('caracterizacaoDaEntrada', () => {
    it('entrada sem os campos, ou lixo, é tudo não informado', () => {
        assert.deepEqual(caracterizacaoDaEntrada({ tipo: 'Pessoa pública', texto: 'F' }), VAZIA);
        assert.deepEqual(caracterizacaoDaEntrada(undefined), VAZIA);
        assert.deepEqual(caracterizacaoDaEntrada(null), VAZIA);
        assert.deepEqual(caracterizacaoDaEntrada('Mulher'), VAZIA);
    });

    it('lê os três campos válidos e ignora os inválidos', () => {
        assert.deepEqual(
            caracterizacaoDaEntrada({ genero: 'mulher', orientacao: 'LGBT', corRaca: 'Marciana' }),
            { genero: 'Mulher', orientacao: 'LGBT', corRaca: '' },
        );
    });

    it('não altera o objeto recebido', () => {
        const e = { genero: 'mulher' };
        caracterizacaoDaEntrada(e);
        assert.deepEqual(e, { genero: 'mulher' });
    });
});

describe('camposCaracterizacao', () => {
    it('só grava com o Tipo Pessoa pública, e só as chaves com valor', () => {
        assert.deepEqual(
            camposCaracterizacao('Pessoa pública', {
                genero: 'Homem',
                orientacao: '',
                corRaca: 'Preta',
            }),
            { genero: 'Homem', corRaca: 'Preta' },
        );
        assert.deepEqual(camposCaracterizacao('pessoa publica ', { orientacao: 'Hétero' }), {
            orientacao: 'Hétero',
        });
    });

    it('trocar o Tipo apaga os três', () => {
        const c = { genero: 'Mulher', orientacao: 'LGBT', corRaca: 'Parda' };
        assert.deepEqual(camposCaracterizacao('Notícia', c), {});
        assert.deepEqual(camposCaracterizacao('', c), {});
        assert.deepEqual(camposCaracterizacao(undefined, c), {});
    });

    it('tudo vazio não grava chave nenhuma (não informado não é gravado)', () => {
        assert.deepEqual(camposCaracterizacao('Pessoa pública', VAZIA), {});
        assert.deepEqual(camposCaracterizacao('Pessoa pública', undefined), {});
    });

    it('Hétero é gravado como Hétero, e ausência nunca vira Hétero', () => {
        assert.equal(
            camposCaracterizacao('Pessoa pública', { orientacao: 'Hétero' }).orientacao,
            'Hétero',
        );
        assert.equal(
            'orientacao' in camposCaracterizacao('Pessoa pública', { genero: 'Homem' }),
            false,
        );
    });
});

describe('alternarEscolha', () => {
    it('clicar no marcado desmarca; clicar em outro troca; de vazio, marca', () => {
        assert.equal(alternarEscolha('Mulher', 'Mulher'), '');
        assert.equal(alternarEscolha('Mulher', 'Homem'), 'Homem');
        assert.equal(alternarEscolha('', 'Homem'), 'Homem');
    });
});

describe('caracterizacaoDaUltimaCitacao', () => {
    const pp = (texto, extra = {}) => ({ tipo: 'Pessoa pública', texto, ...extra });
    const texto = (...refs) => ({ referenciasExternas: refs });

    it('nome sem citação anterior, ou vazio, devolve tudo vazio', () => {
        const textos = [texto(pp('Clarice', { genero: 'Mulher' }))];
        assert.deepEqual(caracterizacaoDaUltimaCitacao(textos, 'Caetano'), VAZIA);
        assert.deepEqual(caracterizacaoDaUltimaCitacao(textos, ''), VAZIA);
        assert.deepEqual(caracterizacaoDaUltimaCitacao(textos, undefined), VAZIA);
        assert.deepEqual(caracterizacaoDaUltimaCitacao(undefined, 'Clarice'), VAZIA);
    });

    it('casa o nome ignorando caixa, acento e espaços', () => {
        const textos = [texto(pp('Clarice Lispector', { genero: 'Mulher', corRaca: 'Branca' }))];
        assert.deepEqual(caracterizacaoDaUltimaCitacao(textos, '  clarice  LISPECTOR '), {
            genero: 'Mulher',
            orientacao: '',
            corRaca: 'Branca',
        });
    });

    it('vale a citação mais recente, campo a campo', () => {
        const textos = [
            texto(pp('Fulano', { genero: 'Homem', orientacao: 'Hétero', corRaca: 'Parda' })),
            texto(pp('Fulano', { corRaca: 'Preta' })),
        ];
        assert.deepEqual(caracterizacaoDaUltimaCitacao(textos, 'Fulano'), {
            genero: 'Homem',
            orientacao: 'Hétero',
            corRaca: 'Preta',
        });
    });

    it('dentro de um texto, a última entrada vence', () => {
        const textos = [texto(pp('F', { genero: 'Homem' }), pp('F', { genero: 'Mulher' }))];
        assert.equal(caracterizacaoDaUltimaCitacao(textos, 'F').genero, 'Mulher');
    });

    it('ignora entradas de outro Tipo com o mesmo nome', () => {
        const textos = [texto({ tipo: 'Notícia', texto: 'Fulano', genero: 'Homem' })];
        assert.deepEqual(caracterizacaoDaUltimaCitacao(textos, 'Fulano'), VAZIA);
    });

    it('não quebra com textos sem referências ou com entradas inválidas', () => {
        const textos = [
            {},
            null,
            { referenciasExternas: 'x' },
            texto(null, 3, pp('F', { genero: 'Mulher' })),
        ];
        assert.equal(caracterizacaoDaUltimaCitacao(textos, 'F').genero, 'Mulher');
    });
});

describe('completarCaracterizacao', () => {
    it('só preenche o que está vazio e nunca sobrescreve', () => {
        assert.deepEqual(
            completarCaracterizacao(
                { genero: 'Homem', orientacao: '', corRaca: '' },
                { genero: 'Mulher', orientacao: 'LGBT', corRaca: 'Preta' },
            ),
            { genero: 'Homem', orientacao: 'LGBT', corRaca: 'Preta' },
        );
    });

    it('sem sugestão, mantém tudo como está', () => {
        assert.deepEqual(completarCaracterizacao({ genero: 'Mulher' }, VAZIA), {
            genero: 'Mulher',
            orientacao: '',
            corRaca: '',
        });
    });
});

describe('rotulosCaracterizacao', () => {
    it('entrada sem caracterização não gera selinho', () => {
        assert.deepEqual(rotulosCaracterizacao({ tipo: 'Pessoa pública' }), []);
        assert.deepEqual(rotulosCaracterizacao(undefined), []);
    });

    it('gera gênero, orientação e cor/raça, na ordem, só do que existe', () => {
        const r = rotulosCaracterizacao({ genero: 'Mulher', orientacao: 'LGBT', corRaca: 'Parda' });
        assert.deepEqual(
            r.map((x) => x.texto),
            ['♀︎', '🏳️‍🌈', 'Parda'],
        );
        assert.deepEqual(
            rotulosCaracterizacao({ orientacao: 'Hétero' }).map((x) => x.titulo),
            ['Pessoa hétero'],
        );
    });
});
