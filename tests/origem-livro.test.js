import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Cortado de e Lançado em guardam o livro por id (`livroId`), com o `livro` (texto)
// como espelho do título atual. Renomear um livro não faz o texto sumir do Fora de
// escopo; livro nunca cadastrado segue como texto livre, sem id.

const { db, importarDB } = await import('../js/db.js');
const {
    chaveDeNomeDeLivro,
    livroDaOrigem,
    origemCitaLivro,
    origemTemLivroCadastrado,
    sincronizarOrigemComLivros,
    origemComLivroId,
} = await import('../js/origem-livro.js');
const fora = await import('../js/fora-de-escopo.js');

const L1 = { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 };
const L2 = { id: 2, titulo: 'Livro Dois', tipo: 'Inéditos', sequencia: 2 };

function montar(extra = {}) {
    db.livros = [{ ...L1 }, { ...L2 }];
    db.partes = [];
    db.secoes = [];
    db.elementos = [];
    db.itensColetanea = [];
    db.poemas = [];
    db.prosas = [];
    Object.assign(db, extra);
}

describe('livroDaOrigem e origemCitaLivro', () => {
    beforeEach(() => montar());

    it('o id decide, mesmo com o nome desatualizado', () => {
        const ls = { livro: 'Nome Velho', livroId: 1 };
        assert.equal(livroDaOrigem(db, ls).id, 1);
        assert.equal(origemCitaLivro(db, ls, db.livros[0]), true);
        assert.equal(origemCitaLivro(db, ls, db.livros[1]), false);
    });

    it('com id válido, um nome que casa com outro livro não vale', () => {
        const ls = { livro: 'Livro Dois', livroId: 1 };
        assert.equal(origemCitaLivro(db, ls, db.livros[0]), true);
        assert.equal(origemCitaLivro(db, ls, db.livros[1]), false);
    });

    it('sem id, vale o nome (ignora caixa, acento e espaços)', () => {
        const ls = { livro: ' livro  UM ' };
        assert.equal(livroDaOrigem(db, ls).id, 1);
        assert.equal(origemCitaLivro(db, ls, db.livros[0]), true);
    });

    it('nome repetido é ambíguo: não liga a nenhum livro', () => {
        db.livros.push({ id: 3, titulo: 'LIVRO UM', tipo: 'Inéditos' });
        assert.equal(livroDaOrigem(db, { livro: 'Livro Um' }), null);
    });

    it('id de livro que não existe mais cai no nome', () => {
        assert.equal(livroDaOrigem(db, { livro: 'Livro Dois', livroId: 99 }).id, 2);
        assert.equal(livroDaOrigem(db, { livro: 'Sumiu', livroId: 99 }), null);
    });

    it('origemTemLivroCadastrado: por id ou por nome', () => {
        assert.equal(origemTemLivroCadastrado(db, { livro: 'x', livroId: 2 }), true);
        assert.equal(origemTemLivroCadastrado(db, { livro: 'Livro Um' }), true);
        assert.equal(origemTemLivroCadastrado(db, { livro: 'Fantasma' }), false);
        assert.equal(origemTemLivroCadastrado(db, null), false);
    });

    it('chaveDeNomeDeLivro segue exportada pelo fora-de-escopo', () => {
        assert.equal(fora.chaveDeNomeDeLivro, chaveDeNomeDeLivro);
    });
});

describe('sincronizarOrigemComLivros', () => {
    beforeEach(() => montar());

    it('liga ao id um livro cadastrado que só tinha o nome, em Cortado de e Lançado em', () => {
        db.poemas = [
            {
                id: 10,
                cortadoDe: { livro: 'livro um', secao: 'S' },
                lancadoEm: { livro: 'Livro Dois', secao: 'Cofre' },
            },
        ];
        db.prosas = [{ id: 20, cortadoDe: { livro: 'Livro Dois' } }];
        assert.equal(sincronizarOrigemComLivros(db), 3);
        assert.equal(db.poemas[0].cortadoDe.livroId, 1);
        assert.equal(db.poemas[0].cortadoDe.livro, 'Livro Um');
        assert.equal(db.poemas[0].lancadoEm.livroId, 2);
        assert.equal(db.prosas[0].cortadoDe.livroId, 2);
        assert.equal(db.poemas[0].cortadoDe.secao, 'S');
    });

    it('renomear o livro atualiza o espelho do título pelo id', () => {
        db.poemas = [{ id: 10, cortadoDe: { livro: 'Livro Um', livroId: 1, posicao: 3 } }];
        db.livros[0].titulo = 'Livro Um, revisto';
        assert.equal(sincronizarOrigemComLivros(db), 1);
        assert.equal(db.poemas[0].cortadoDe.livro, 'Livro Um, revisto');
        assert.equal(db.poemas[0].cortadoDe.livroId, 1);
        assert.equal(db.poemas[0].cortadoDe.posicao, 3);
    });

    it('livro nunca cadastrado fica como texto livre, sem id', () => {
        db.poemas = [{ id: 10, cortadoDe: { livro: 'Fantasma', secao: 'X' } }];
        assert.equal(sincronizarOrigemComLivros(db), 0);
        assert.deepEqual(db.poemas[0].cortadoDe, { livro: 'Fantasma', secao: 'X' });
    });

    it('nome repetido no cadastro não liga a ninguém', () => {
        db.livros.push({ id: 3, titulo: 'Livro Um', tipo: 'Inéditos' });
        db.poemas = [{ id: 10, cortadoDe: { livro: 'Livro Um' } }];
        assert.equal(sincronizarOrigemComLivros(db), 0);
        assert.equal('livroId' in db.poemas[0].cortadoDe, false);
    });

    it('livro excluído: o texto guarda o último nome e o id fica solto', () => {
        db.poemas = [{ id: 10, cortadoDe: { livro: 'Livro Um', livroId: 1 } }];
        db.livros = db.livros.filter((l) => l.id !== 1);
        assert.equal(sincronizarOrigemComLivros(db), 0);
        assert.equal(db.poemas[0].cortadoDe.livro, 'Livro Um');
        assert.equal(origemTemLivroCadastrado(db, db.poemas[0].cortadoDe), false);
    });

    it('livro novo com o mesmo nome do excluído religa pelo nome', () => {
        db.poemas = [{ id: 10, cortadoDe: { livro: 'Livro Um', livroId: 1 } }];
        db.livros = [{ id: 7, titulo: 'Livro Um', tipo: 'Inéditos' }];
        assert.equal(sincronizarOrigemComLivros(db), 1);
        assert.equal(db.poemas[0].cortadoDe.livroId, 7);
    });

    it('é idempotente e não mexe em texto sem Cortado de nem Lançado em', () => {
        db.poemas = [{ id: 10, cortadoDe: { livro: 'Livro Um' } }, { id: 11 }];
        assert.equal(sincronizarOrigemComLivros(db), 1);
        assert.equal(sincronizarOrigemComLivros(db), 0);
        assert.equal(db.poemas[1].cortadoDe, undefined);
    });
});

describe('origemComLivroId (valor do formulário)', () => {
    beforeEach(() => montar());

    it('livro cadastrado ganha o id e o título do cadastro', () => {
        assert.deepEqual(origemComLivroId(db, { livro: 'livro dois', secao: 'S', posicao: 2 }), {
            livro: 'Livro Dois',
            livroId: 2,
            secao: 'S',
            posicao: 2,
        });
    });

    it('livro fora do cadastro fica sem id, como digitado; um id antigo sai', () => {
        assert.deepEqual(origemComLivroId(db, { livro: 'Fantasma', livroId: 1, secao: '' }), {
            livro: 'Fantasma',
            secao: '',
        });
        assert.equal(origemComLivroId(db, null), null);
    });
});

describe('Fora de escopo casa pelo id', () => {
    beforeEach(() => montar());

    const descartado = (extra = {}) => ({
        id: 11,
        titulo: 'D',
        status: 'descartado',
        texto: 'x',
        cortadoDe: { livro: 'Livro Um', livroId: 1, secao: 'Parte A / S', posicao: 2 },
        ...extra,
    });

    it('renomear o livro, sem sincronizar o espelho, não tira o descartado da lista', () => {
        db.poemas = [descartado()];
        db.livros[0].titulo = 'Outro Nome';
        assert.equal(fora.foraDeEscopoDoLivro(db, 1).descartados.length, 1);
        assert.equal(fora.foraDeEscopoDoLivro(db, 2).descartados.length, 0);
        assert.equal(fora.descartadosSemLivroDeOrigem(db).foraDoCadastro.length, 0);
    });

    it('renomear o livro de origem de um migrado também não o perde', () => {
        db.poemas = [
            {
                id: 12,
                titulo: 'M',
                status: 'migrado',
                texto: 'x',
                livrosIds: [2],
                cortadoDe: { livro: 'Livro Um', livroId: 1, secao: 'S' },
            },
        ];
        db.livros[0].titulo = 'Outro Nome';
        const lista = fora.foraDeEscopoDoLivro(db, 1).migrados;
        assert.equal(lista.length, 1);
        assert.equal(fora.migradosSemLivroDeOrigem(db).length, 0);
    });

    it('nome igual ao de outro livro não confunde quando há id', () => {
        db.poemas = [descartado({ cortadoDe: { livro: 'Livro Dois', livroId: 1, secao: '' } })];
        assert.equal(fora.foraDeEscopoDoLivro(db, 1).descartados.length, 1);
        assert.equal(fora.foraDeEscopoDoLivro(db, 2).descartados.length, 0);
    });

    it('livro excluído: o descartado sai da lista e vai para o aviso, com o último nome', () => {
        db.poemas = [descartado()];
        db.livros = db.livros.filter((l) => l.id !== 1);
        const sem = fora.descartadosSemLivroDeOrigem(db);
        assert.equal(sem.foraDoCadastro.length, 1);
        assert.equal(sem.foraDoCadastro[0].livroDeOrigem, 'Livro Um');
    });

    it('sem id (cadastro antigo), segue casando pelo nome', () => {
        db.poemas = [descartado({ cortadoDe: { livro: 'livro um', secao: '' } })];
        assert.equal(fora.foraDeEscopoDoLivro(db, 1).descartados.length, 1);
    });
});

describe('Backup', () => {
    it('importar um backup antigo liga o id e atualiza o espelho', async () => {
        montar();
        const antigo = JSON.parse(JSON.stringify(db));
        antigo.poemas = [
            {
                id: 10,
                titulo: 'P',
                status: 'descartado',
                cortadoDe: { livro: 'LIVRO DOIS', secao: 'S' },
            },
        ];
        importarDB(antigo);
        const c = db.poemas.find((p) => p.id === 10).cortadoDe;
        assert.equal(c.livroId, 2);
        assert.equal(c.livro, 'Livro Dois');
    });
});

describe('origemComLivroId com a origem anterior', () => {
    beforeEach(() => montar());

    it('título repetido: mantém o id anterior quando o texto ainda é o nome dele', () => {
        db.livros.push({ id: 3, titulo: 'Gêmeo' }, { id: 4, titulo: 'GÊMEO' });
        const saida = origemComLivroId(
            db,
            { livro: 'gêmeo', secao: 'X' },
            { livro: 'Gêmeo', livroId: 4 },
        );
        assert.equal(saida.livroId, 4);
        assert.equal(saida.livro, 'GÊMEO');
    });

    it('sem a dica, o título repetido não liga a ninguém', () => {
        db.livros.push({ id: 3, titulo: 'Gêmeo' }, { id: 4, titulo: 'GÊMEO' });
        const saida = origemComLivroId(db, { livro: 'gêmeo', secao: 'X' });
        assert.equal('livroId' in saida, false);
        assert.equal(saida.livro, 'gêmeo');
    });

    it('a dica não vale quando o texto passou a ser outro livro', () => {
        const saida = origemComLivroId(
            db,
            { livro: 'Livro Dois', secao: 'X' },
            { livro: 'Livro Um', livroId: 1 },
        );
        assert.equal(saida.livroId, 2);
    });

    it('a dica de um livro que foi excluído não liga a nada', () => {
        const saida = origemComLivroId(
            db,
            { livro: 'Fantasma', secao: 'X' },
            { livro: 'Fantasma', livroId: 99 },
        );
        assert.equal('livroId' in saida, false);
    });
});
