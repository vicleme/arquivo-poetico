import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    CAMPOS_PREENCHIVEIS,
    obterCampoPreenchivel,
    definirSubcampoFonte,
    planejarPreenchimento,
    planejarLimpeza,
    aplicarPreenchimento,
    aplicarLimpeza,
} from '../js/campos-preenchiveis.js';

const campo = (chave) => obterCampoPreenchivel(chave);

describe('campos-preenchiveis: lista', () => {
    it('chaves são únicas e todo campo tem rotulo/tipo/ler/gravar', () => {
        const chaves = CAMPOS_PREENCHIVEIS.map((c) => c.chave);
        assert.equal(new Set(chaves).size, chaves.length);
        CAMPOS_PREENCHIVEIS.forEach((c) => {
            assert.ok(c.rotulo);
            assert.ok(['texto', 'booleano', 'opcoes'].includes(c.tipo));
            assert.equal(typeof c.ler, 'function');
            assert.equal(typeof c.gravar, 'function');
            if (c.tipo === 'opcoes') assert.ok(Array.isArray(c.opcoes) && c.opcoes.length);
        });
    });

    it('obterCampoPreenchivel devolve null pra chave desconhecida', () => {
        assert.equal(obterCampoPreenchivel('nao-existe'), null);
    });
});

describe('definirSubcampoFonte', () => {
    it('cria o objeto se não existir e preserva os outros subcampos', () => {
        const item = {};
        definirSubcampoFonte(item, 'origem', 'Wikisource');
        assert.deepEqual(item.fonteTexto, {
            origem: 'Wikisource',
            edicao: '',
            link: '',
            conferido: false,
            grafia: '',
        });
        definirSubcampoFonte(item, 'edicao', '1920');
        assert.equal(item.fonteTexto.origem, 'Wikisource');
        assert.equal(item.fonteTexto.edicao, '1920');
    });

    it('volta a null quando tudo fica vazio e "conferido" está desmarcado', () => {
        const item = { fonteTexto: { origem: 'X', edicao: '', link: '', conferido: false } };
        definirSubcampoFonte(item, 'origem', '');
        assert.equal(item.fonteTexto, null);
    });

    it('mantém o objeto se "conferido" continua marcado', () => {
        const item = { fonteTexto: { origem: 'X', edicao: '', link: '', conferido: true } };
        definirSubcampoFonte(item, 'origem', '');
        assert.equal(item.fonteTexto.conferido, true);
    });

    it('mantém o objeto se grafia foi marcada, mesmo sem origem/edição/link/conferido', () => {
        const item = {};
        definirSubcampoFonte(item, 'grafia', 'etimológica');
        assert.deepEqual(item.fonteTexto, {
            origem: '',
            edicao: '',
            link: '',
            conferido: false,
            grafia: 'etimológica',
        });
        definirSubcampoFonte(item, 'grafia', '');
        assert.equal(item.fonteTexto, null);
    });
});

describe('campo "fonteGrafia" (Preencher campo em massa)', () => {
    it('planeja e aplica como os demais campos de Fonte', () => {
        const itens = [{ id: 1 }, { id: 2, fonteTexto: { origem: 'X', grafia: 'etimológica' } }];
        const r = planejarPreenchimento(itens, campo('fonteGrafia'), 'etimológica');
        assert.deepEqual(
            r.alterar.map((i) => i.id),
            [1],
        );
        assert.equal(r.jaIguais, 1);

        aplicarPreenchimento(r.alterar, campo('fonteGrafia'), 'etimológica');
        assert.equal(itens[0].fonteTexto.grafia, 'etimológica');
    });
});

describe('planejarPreenchimento (texto)', () => {
    const itens = () => [
        { id: 1 },
        { id: 2, fonteTexto: { origem: 'Wikisource', edicao: '', link: '', conferido: false } },
        { id: 3, fonteTexto: { origem: 'Obra própria', edicao: '', link: '', conferido: false } },
    ];

    it('só onde está vazio por padrão; pula quem já tem valor; conta os já iguais', () => {
        const r = planejarPreenchimento(itens(), campo('fonteOrigem'), 'Obra própria');
        assert.deepEqual(
            r.alterar.map((i) => i.id),
            [1],
        );
        assert.equal(r.jaPreenchidos, 1);
        assert.equal(r.jaIguais, 1);
    });

    it('sobrescrever inclui quem tem outro valor, mas não quem já está igual', () => {
        const r = planejarPreenchimento(itens(), campo('fonteOrigem'), 'Obra própria', {
            sobrescrever: true,
        });
        assert.deepEqual(
            r.alterar.map((i) => i.id),
            [1, 2],
        );
        assert.equal(r.jaPreenchidos, 0);
        assert.equal(r.jaIguais, 1);
    });

    it('espaços nas pontas do valor são ignorados', () => {
        const r = planejarPreenchimento(itens(), campo('fonteOrigem'), '  Obra própria  ');
        assert.equal(r.jaIguais, 1);
    });
});

describe('planejarPreenchimento (booleano)', () => {
    it('ignora sobrescrever: define em todos e pula só quem já está assim', () => {
        const itens = [{ id: 1 }, { id: 2, fonteTexto: { origem: 'X', conferido: true } }];
        const r = planejarPreenchimento(itens, campo('fonteConferido'), true);
        assert.deepEqual(
            r.alterar.map((i) => i.id),
            [1],
        );
        assert.equal(r.jaIguais, 1);
        assert.equal(r.jaPreenchidos, 0);
    });
});

describe('aplicar e limpar', () => {
    it('aplica só nos itens do plano e não deixa fonteTexto vazio pra trás', () => {
        const a = { id: 1 };
        const b = { id: 2, fonteTexto: { origem: 'X', edicao: '', link: '', conferido: false } };
        const { alterar } = planejarPreenchimento([a, b], campo('fonteOrigem'), 'Obra própria');
        aplicarPreenchimento(alterar, campo('fonteOrigem'), 'Obra própria');
        assert.equal(a.fonteTexto.origem, 'Obra própria');
        assert.equal(b.fonteTexto.origem, 'X');

        const limpar = planejarLimpeza([a, b], campo('fonteOrigem'));
        assert.equal(limpar.alterar.length, 2);
        aplicarLimpeza(limpar.alterar, campo('fonteOrigem'));
        assert.equal(a.fonteTexto, null);
        assert.equal(b.fonteTexto, null);
    });

    it('limpar conta os já vazios', () => {
        const r = planejarLimpeza([{ id: 1 }, { id: 2, pendencia: 'revisar' }], campo('pendencia'));
        assert.equal(r.alterar.length, 1);
        assert.equal(r.jaVazios, 1);
    });

    it('booleano: aplicar false num item sem Fonte não cria objeto', () => {
        const item = { id: 1 };
        aplicarPreenchimento([item], campo('fonteConferido'), false);
        assert.equal(item.fonteTexto, null);
    });

    it('pendência grava e limpa em item.pendencia', () => {
        const item = { id: 1 };
        aplicarPreenchimento([item], campo('pendencia'), 'revisar métrica');
        assert.equal(item.pendencia, 'revisar métrica');
        aplicarLimpeza([item], campo('pendencia'));
        assert.equal(item.pendencia, '');
    });
});
