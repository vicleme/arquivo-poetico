import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { papeisPessoaDeFabrica } from '../js/papeis-pessoa.js';
import {
    adicionarPapel,
    apagarPapel,
    contarViolacoesDeExclusao,
    editarPapel,
    renomearPapel,
    usoDosPapeis,
    validarApelido,
} from '../js/gestao-papeis-pessoa.js';

const montar = () => ({
    papeisPessoa: papeisPessoaDeFabrica(),
    poemas: [
        {
            id: 1,
            pessoas: [
                { pessoaId: 1, papeis: ['Retratado(a)', 'Voz'] },
                { pessoaId: 2, papeis: ['Voz'] },
            ],
        },
        { id: 2, pessoas: [{ pessoaId: 1, papeis: ['Voz'] }] },
    ],
    prosas: [{ id: 3, pessoas: [{ pessoaId: 3, papeis: [] }] }],
});

describe('gestão de papéis de Pessoa', () => {
    it('conta vínculos e textos por papel', () => {
        const uso = usoDosPapeis(montar());
        assert.deepEqual(uso.get('Voz'), { vinculos: 3, textos: 2 });
        assert.deepEqual(uso.get('Retratado(a)'), { vinculos: 1, textos: 1 });
        assert.equal(uso.get('Aludido(a)'), undefined);
    });

    it('adiciona papel com apelido sugerido, sem regras de exclusão', () => {
        const d = montar();
        const r = adicionarPapel(d, { nome: 'Confidente', descricao: ' quem ouve ' });
        assert.equal(r.ok, true);
        assert.equal(r.papel.apelido, 'Conf');
        assert.equal(r.papel.descricao, 'quem ouve');
        assert.equal(r.papel.fabrica, false);
        assert.equal(r.papel.exclusivoComTodos, false);
        assert.equal(d.papeisPessoa.at(-1).nome, 'Confidente');
    });

    it('recusa nome repetido (sem caixa nem acento) e apelido em uso', () => {
        const d = montar();
        assert.equal(adicionarPapel(d, { nome: 'voz' }).ok, false);
        assert.equal(adicionarPapel(d, { nome: 'Outro', apelido: 'retr' }).ok, false);
        assert.equal(adicionarPapel(d, { nome: ' ' }).ok, false);
        assert.equal(d.papeisPessoa.length, 9);
    });

    it('edita apelido e descrição de papel de fábrica, valida o apelido', () => {
        const d = montar();
        assert.equal(editarPapel(d, 'Voz', { apelido: 'Fala' }).ok, true);
        assert.equal(d.papeisPessoa.find((p) => p.nome === 'Voz').apelido, 'Fala');
        assert.equal(editarPapel(d, 'Voz', { apelido: 'Retr' }).ok, false);
        assert.equal(editarPapel(d, 'Voz', { apelido: 'x'.repeat(9) }).ok, false);
        assert.equal(editarPapel(d, 'Voz', { apelido: 'Voz' }).ok, true);
        assert.equal(validarApelido(d, 'Voz', ''), 'Escreva um apelido.');
    });

    it('não renomeia nem apaga papel de fábrica', () => {
        const d = montar();
        assert.equal(renomearPapel(d, 'Voz', 'Fala').ok, false);
        assert.equal(apagarPapel(d, 'Voz').ok, false);
    });

    it('renomear papel acrescentado migra os textos', () => {
        const d = montar();
        adicionarPapel(d, { nome: 'Confidente' });
        d.poemas[0].pessoas[1].papeis = ['Confidente', 'Voz'];
        const r = renomearPapel(d, 'Confidente', 'Ouvinte');
        assert.equal(r.ok, true);
        assert.equal(r.alterados, 1);
        assert.deepEqual(d.poemas[0].pessoas[1].papeis, ['Ouvinte', 'Voz']);
        assert.ok(d.papeisPessoa.some((p) => p.nome === 'Ouvinte'));
        assert.ok(!d.papeisPessoa.some((p) => p.nome === 'Confidente'));
    });

    it('renomear para um nome existente junta os dois sem duplicar', () => {
        const d = montar();
        adicionarPapel(d, { nome: 'Fala' });
        d.poemas[0].pessoas[0].papeis = ['Fala', 'Voz'];
        const r = renomearPapel(d, 'Fala', 'Voz');
        assert.equal(r.ok, true);
        assert.equal(r.juntou, true);
        assert.deepEqual(d.poemas[0].pessoas[0].papeis, ['Voz']);
        assert.ok(!d.papeisPessoa.some((p) => p.nome === 'Fala'));
    });

    it('recusa juntar quando o vínculo ficaria com papéis que não convivem', () => {
        const d = montar();
        adicionarPapel(d, { nome: 'Citado' });
        d.poemas[0].pessoas[0].papeis = ['Citado', 'Aludido(a)'];
        const r = renomearPapel(d, 'Citado', 'Mencionado(a)');
        assert.equal(r.ok, false);
        assert.deepEqual(d.poemas[0].pessoas[0].papeis, ['Citado', 'Aludido(a)']);
        assert.ok(d.papeisPessoa.some((p) => p.nome === 'Citado'));
    });

    it('apaga só papel acrescentado e sem uso', () => {
        const d = montar();
        adicionarPapel(d, { nome: 'Confidente' });
        d.prosas[0].pessoas[0].papeis = ['Confidente'];
        const emUso = apagarPapel(d, 'Confidente');
        assert.equal(emUso.ok, false);
        assert.match(emUso.erro, /1 vínculo/);
        d.prosas[0].pessoas[0].papeis = [];
        assert.equal(apagarPapel(d, 'Confidente').ok, true);
        assert.equal(d.papeisPessoa.length, 9);
    });

    it('conta vínculos que violam regras de exclusão', () => {
        const d = montar();
        assert.deepEqual(contarViolacoesDeExclusao(d), { vinculos: 0, textos: 0 });
        d.poemas[1].pessoas[0].papeis = ['Mencionado(a)', 'Aludido(a)'];
        assert.deepEqual(contarViolacoesDeExclusao(d), { vinculos: 1, textos: 1 });
    });
});
