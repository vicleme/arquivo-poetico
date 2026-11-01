import './helpers/localstorage-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { db } = await import('../js/db.js');
const {
    itensDaSelecaoAutores,
    gerarJsonAutores,
    gerarMarkdownAutores,
    montarRegistroAutor,
    gerarCsvAutores,
    autorParaMarkdown,
} = await import('../js/exportar-autores.js');

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
    it('Autor sigiloso: sai como dado no .json, no .md e no .csv, sem esconder o nome real', () => {
        db.autores.push({
            id: 3,
            nome: 'Maria Real',
            sigiloso: true,
            nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo' }],
        });
        const [reg] = itensDaSelecaoAutores([3]);
        assert.equal(reg.sigiloso, true);
        assert.equal(reg.nome, 'Maria Real');

        const md = autorParaMarkdown(reg);
        assert.match(md, /^## Maria Real/);
        assert.match(md, /- \*\*Autor sigiloso:\*\* sim/);
        // Autor sem a marca não ganha a linha
        assert.doesNotMatch(autorParaMarkdown(itensDaSelecaoAutores([1])[0]), /Autor sigiloso/);

        const linhas = gerarCsvAutores(itensDaSelecaoAutores([1, 3])).split('\n');
        const cab = linhas[0].replace(/^\uFEFF/, '').split(',');
        const col = cab.indexOf('sigiloso');
        assert.ok(col > 0, 'coluna sigiloso existe');
        assert.match(linhas[1], /Fernando Pessoa/);
        assert.match(linhas[2], /Maria Real/);
    });
    it('Anonimizar autor: o nome marcado sai no .md, no .json e numa coluna do .csv', () => {
        db.autores.push({
            id: 4,
            nome: 'Maria Real',
            nomesLiterarios: [
                { nome: 'Álvaro', tipo: 'Heterônimo' },
                { nome: 'Job', tipo: 'Pseudônimo', anonimizar: true },
            ],
        });
        const [reg] = itensDaSelecaoAutores([4]);
        assert.equal(reg.nomesLiterarios[1].anonimizar, true);

        const md = autorParaMarkdown(reg);
        assert.match(md, /Job \(Pseudônimo, anonimiza o autor\)/);
        assert.match(md, /Álvaro \(Heterônimo\)(,|$|\n)/);
        assert.doesNotMatch(md, /Álvaro \(Heterônimo, anonimiza/);

        const linhas = gerarCsvAutores(itensDaSelecaoAutores([4])).split('\n');
        const cab = linhas[0].replace(/^\uFEFF/, '').split(',');
        const col = cab.indexOf('nomes_anonimizam_autor');
        assert.ok(col > 0, 'coluna nomes_anonimizam_autor existe');
        assert.match(linhas[1], /Job/);
    });
});
