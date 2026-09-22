import './helpers/localstorage-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { db } = await import('../js/db.js');
const { itensDaSelecaoAutores, gerarJsonAutores, gerarMarkdownAutores, montarRegistroAutor } =
    await import('../js/exportar-autores.js');

describe('exportar Autores', () => {
    beforeEach(() => {
        db.poemas = [
            { id: 10, titulo: 'A', autoria: [{ autorId: 1, papel: 'Autor' }] },
            { id: 11, titulo: 'B', autoria: [{ autorId: 1, papel: 'Autor' }] },
        ];
        db.prosas = [{ id: 20, titulo: 'C', autoria: [{ autorId: 1, papel: 'Autor' }] }];
        db.autores = [
            {
                id: 2,
                nome: 'Zé',
                souEu: true,
                sobre: 'Nota livre',
            },
            {
                id: 1,
                nome: 'Fernando Pessoa',
                nacionalidade: 'Portuguesa',
                nascimento: { dia: 13, mes: 6, ano: 1888 },
                obito: { dia: 30, mes: 11, ano: 1935 },
                nomesLiterarios: [{ nome: 'Álvaro de Campos', tipo: 'Heterônimo' }],
                condicoesClinicas: [{ nome: 'Depressão', tipo: 'Mental' }],
                ocupacoes: 'Tradutor, Comerciante',
            },
        ];
    });

    it('só leva os ids pedidos, em ordem alfabética', () => {
        assert.deepEqual(
            itensDaSelecaoAutores([2, 1]).map((a) => a.nome),
            ['Fernando Pessoa', 'Zé'],
        );
        assert.deepEqual(
            itensDaSelecaoAutores([2]).map((a) => a.id),
            [2],
        );
        assert.deepEqual(itensDaSelecaoAutores([999]), []);
    });

    it('registro carrega o cadastro inteiro + derivados, sem alterar o original', () => {
        const original = db.autores.find((a) => a.id === 1);
        const reg = montarRegistroAutor(original);
        assert.equal(reg.nacionalidade, 'Portuguesa');
        assert.equal(reg.derivados.dominio_publico_desde, 1935 + 71);
        assert.equal(reg.derivados.total_poemas, 2);
        assert.equal(reg.derivados.total_prosas, 1);
        assert.equal(reg.derivados.signo, 'Gêmeos');
        assert.equal('derivados' in original, false);
    });

    it('JSON usa formato próprio, distinto do de Poemas/Prosas', () => {
        const saida = JSON.parse(gerarJsonAutores(itensDaSelecaoAutores([1])));
        assert.equal(saida.export_format, 'selecao_autores');
        assert.equal(saida.itens.length, 1);
    });

    it('Markdown mostra só os campos preenchidos e inclui os sensíveis', () => {
        const md = gerarMarkdownAutores(itensDaSelecaoAutores([1, 2]));
        assert.match(md, /^# Autores/);
        assert.match(md, /## Fernando Pessoa/);
        assert.match(md, /\*\*Nomes literários:\*\* Álvaro de Campos \(Heterônimo\)/);
        assert.match(md, /\*\*Condições clínicas:\*\* Depressão \(Mental\)/);
        assert.match(md, /\*\*Ocupações:\*\* Tradutor, Comerciante/);
        assert.match(md, /\*\*Domínio público:\*\* desde 2006/);
        assert.match(md, /## Zé \(você\)/);
        assert.match(md, /\*\*Sobre:\*\* Nota livre/);
        // Zé não tem nacionalidade: a linha nem aparece
        const trechoZe = md.split('## Zé')[1];
        assert.doesNotMatch(trechoZe, /Nacionalidade/);
    });
});
