import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizarNota, somarNotas, vinculoComNota } from '../js/papeis-pessoa.js';

const { mesclarPessoas, db } = await import('../js/db.js');
const { textoPessoas } = await import('../js/exportar-md.js');

describe('nota por vínculo: lógica pura', () => {
    it('normalizarNota apara e ignora o que não é texto', () => {
        assert.equal(normalizarNota('  oi  '), 'oi');
        assert.equal(normalizarNota(undefined), '');
        assert.equal(normalizarNota(5), '');
    });

    it('somarNotas junta, não duplica iguais e ignora vazias', () => {
        assert.equal(somarNotas('a', 'b'), 'a\nb');
        assert.equal(somarNotas('a', 'a'), 'a');
        assert.equal(somarNotas('', 'b'), 'b');
        assert.equal(somarNotas('a', undefined), 'a');
        assert.equal(somarNotas('', ''), '');
    });

    it('vinculoComNota grava só com texto e apaga a chave quando vazia', () => {
        const base = { pessoaId: 1, papeis: ['Voz'] };
        assert.deepEqual(vinculoComNota(base, ' x '), { pessoaId: 1, papeis: ['Voz'], nota: 'x' });
        assert.deepEqual(vinculoComNota({ ...base, nota: 'x' }, '  '), base);
        assert.ok(!('nota' in vinculoComNota({ ...base, nota: 'x' }, '')));
    });
});

describe('nota por vínculo: mesclar Pessoas', () => {
    const montar = () => ({
        pessoas: [
            { id: 1, nome: 'Pedro', grupoIds: [] },
            { id: 2, nome: 'Pedro (dup)', grupoIds: [] },
        ],
        poemas: [],
        prosas: [],
    });

    it('soma as notas quando o mesmo texto vinculava as duas', () => {
        const d = montar();
        d.poemas = [
            {
                id: 10,
                pessoas: [
                    { pessoaId: 1, papeis: ['Retratado(a)'], nota: 'a' },
                    { pessoaId: 2, papeis: ['Voz'], nota: 'b' },
                ],
            },
        ];
        mesclarPessoas(d, 2, 1);
        assert.equal(d.poemas[0].pessoas.length, 1);
        assert.equal(d.poemas[0].pessoas[0].nota, 'a\nb');
    });

    it('não cria a chave nota quando nenhuma das duas tinha', () => {
        const d = montar();
        d.poemas = [
            {
                id: 10,
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 2, papeis: [] },
                ],
            },
        ];
        mesclarPessoas(d, 2, 1);
        assert.ok(!('nota' in d.poemas[0].pessoas[0]));
    });

    it('a nota da origem viaja quando só a origem estava no texto', () => {
        const d = montar();
        d.prosas = [{ id: 20, pessoas: [{ pessoaId: 2, papeis: [], nota: 'só dela' }] }];
        mesclarPessoas(d, 2, 1);
        assert.deepEqual(d.prosas[0].pessoas, [{ pessoaId: 1, papeis: [], nota: 'só dela' }]);
    });
});

describe('nota por vínculo: exportação .md', () => {
    it('textoPessoas acrescenta [nota: ...] em uma linha só', () => {
        const antes = db.pessoas;
        db.pessoas = [
            { id: 1, nome: 'Pedro' },
            { id: 2, nome: 'Ana' },
        ];
        try {
            const txt = textoPessoas({
                pessoas: [
                    { pessoaId: 1, papeis: ['Relacionado(a)'], nota: 'epígrafe\nda seção' },
                    { pessoaId: 2, papeis: [] },
                ],
            });
            assert.equal(txt, 'Pedro (Relacionado(a)) [nota: epígrafe da seção], Ana');
        } finally {
            db.pessoas = antes;
        }
    });
});
