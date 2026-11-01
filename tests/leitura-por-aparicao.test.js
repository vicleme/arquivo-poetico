import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { montarArvoreDoLivro, contarNosDaArvore, filhosDaParte } from '../js/estrutura-livro.js';
import { contarConteudoDoLivro } from '../js/visualizar-livro.js';
import { buildNesting, flattenLivroAninhado } from '../js/nesting.js';
import { textoApareceNoLivro, livroIdsDoTexto } from '../js/aparicoes-do-texto.js';

// Fase 21, etapa 21-3b: a árvore do livro, a contagem do Ver e o tudo aninhado
// leem os textos pelas aparições. O mesmo texto aparece na árvore de cada livro
// onde está, com a posição daquela aparição, e o "só consta" vira vinculado.

const ap = (livroId, parteId, secaoId, sequencia) => ({ livroId, parteId, secaoId, sequencia });

// Livro 1: Parte 10 e Parte 11. Livro 2: Parte 30.
// Poema 1: Parte 10 do Livro 1 (posição 1, é o Destino) e Parte 30 do Livro 2 (posição 4).
// Poema 2: só consta no Livro 1 e está na Parte 11 (posição 1) por Destino... não: só consta no Livro 1.
function banco() {
    const p1 = {
        id: 1,
        titulo: 'Um',
        paiTipo: 'parte',
        paiId: 10,
        sequencia: 1,
        livrosIds: [],
        aparicoes: [ap(1, 10, null, 1), ap(2, 30, null, 4)],
    };
    const p2 = {
        id: 2,
        titulo: 'Dois',
        paiTipo: null,
        paiId: null,
        sequencia: null,
        livrosIds: [1],
        aparicoes: [ap(1, null, null, null)],
    };
    const p3 = {
        id: 3,
        titulo: 'Três',
        paiTipo: 'parte',
        paiId: 11,
        sequencia: 2,
        livrosIds: [],
        aparicoes: [ap(1, 11, null, 2), ap(1, 10, null, 2)],
    };
    return {
        livros: [
            { id: 1, titulo: 'L1', tipo: 'Inéditos' },
            { id: 2, titulo: 'L2', tipo: 'Inéditos' },
        ],
        partes: [
            { id: 10, livroId: 1, titulo: 'P10', sequencia: 1 },
            { id: 11, livroId: 1, titulo: 'P11', sequencia: 2 },
            { id: 30, livroId: 2, titulo: 'P30', sequencia: 1 },
        ],
        secoes: [],
        elementos: [],
        poemas: [p1, p2, p3],
        prosas: [],
        itensColetanea: [],
    };
}

const nomes = (nos) => nos.map((n) => `${n.tipo}:${n.dados.titulo}:${n.dados.sequencia}`);

describe('árvore do livro por aparição', () => {
    it('o mesmo texto aparece na árvore de cada livro onde está, com a posição de cada um', () => {
        const db = banco();
        const l1 = montarArvoreDoLivro(db, 1).arvore;
        const l2 = montarArvoreDoLivro(db, 2).arvore;
        assert.deepEqual(nomes(l1[0].filhos), ['poema:Um:1', 'poema:Três:2']);
        assert.deepEqual(nomes(l2[0].filhos), ['poema:Um:4']);
    });

    it('a segunda aparição (que não é o Destino) também entra, e o nó lê a posição dela', () => {
        const db = banco();
        const p10 = montarArvoreDoLivro(db, 1).arvore.find((n) => n.dados.id === 10);
        const tres = p10.filhos.find((f) => f.dados.id === 3);
        // O Destino do Três é a Parte 11; aqui ele está na Parte 10, posição 2.
        assert.equal(tres.dados.sequencia, 2);
        assert.equal(tres.dados.paiId, 10);
        assert.equal(tres.dados.titulo, 'Três');
        // Mexer na posição do nó mexe só na aparição, não no espelho.
        tres.dados.sequencia = 7;
        assert.equal(db.poemas[2].aparicoes[1].sequencia, 7);
        assert.equal(db.poemas[2].sequencia, 2);
        assert.equal(tres.dados._texto, db.poemas[2]);
    });

    it('o nó do Destino é o próprio texto, como antes', () => {
        const db = banco();
        const p10 = montarArvoreDoLivro(db, 1).arvore.find((n) => n.dados.id === 10);
        assert.equal(p10.filhos[0].dados, db.poemas[0]);
    });

    it('o "só consta" vira a lista de vinculados e fica fora da árvore', () => {
        const db = banco();
        const { arvore, vinculados } = montarArvoreDoLivro(db, 1);
        assert.deepEqual(
            vinculados.map((v) => v.dados.titulo),
            ['Dois'],
        );
        const ids = JSON.stringify(nomes(arvore.flatMap((n) => n.filhos)));
        assert.ok(!ids.includes('Dois'));
        // No Livro 2 ninguém só consta.
        assert.deepEqual(montarArvoreDoLivro(db, 2).vinculados, []);
    });

    it('texto sem posição direto no livro (espelho antigo) também é vinculado', () => {
        const db = banco();
        db.poemas.push({
            id: 9,
            titulo: 'Solto',
            paiTipo: 'livro',
            paiId: 1,
            sequencia: null,
            aparicoes: [ap(1, null, null, null)],
        });
        const { arvore, vinculados } = montarArvoreDoLivro(db, 1);
        assert.ok(vinculados.some((v) => v.dados.id === 9));
        assert.ok(!arvore.some((n) => n.dados.id === 9));
    });

    it('texto com duas aparições no mesmo livro conta uma vez só', () => {
        const db = banco();
        db.poemas[2].aparicoes = [ap(1, 11, null, 2), ap(1, 10, null, 2)];
        const c = contarNosDaArvore(montarArvoreDoLivro(db, 1));
        assert.equal(c.poemas, 3);
    });

    it('texto sem lista segue pelo Destino e por livrosIds', () => {
        const db = banco();
        db.poemas.forEach((p) => {
            delete p.aparicoes;
        });
        db.poemas[1].livrosIds = [1];
        const { arvore, vinculados } = montarArvoreDoLivro(db, 1);
        assert.deepEqual(nomes(arvore[0].filhos), ['poema:Um:1']);
        assert.deepEqual(nomes(arvore[1].filhos), ['poema:Três:2']);
        assert.deepEqual(
            vinculados.map((v) => v.dados.titulo),
            ['Dois'],
        );
    });

    it('a leitura da aba Estrutura (filhosDaParte) segue pelo Destino', () => {
        const db = banco();
        // O Três tem Destino na Parte 11, não na 10.
        assert.deepEqual(
            filhosDaParte(db, 10).map((n) => n.dados.titulo),
            ['Um'],
        );
        assert.deepEqual(
            filhosDaParte(db, 11).map((n) => n.dados.titulo),
            ['Três'],
        );
    });
});

describe('contagem do Ver do livro e leitura das aparições', () => {
    it('conta o texto que está no livro só por uma aparição que não é o Destino', () => {
        const db = banco();
        db.poemas.push({
            id: 5,
            titulo: 'Cinco',
            paiTipo: 'parte',
            paiId: 30,
            sequencia: 1,
            aparicoes: [ap(2, 30, null, 1), ap(1, 11, null, 3)],
        });
        assert.equal(contarConteudoDoLivro(db, 1).poemas, 4);
        assert.equal(contarConteudoDoLivro(db, 2).poemas, 2);
        assert.equal(textoApareceNoLivro(db, 'poema', db.poemas[3], 1), true);
        assert.deepEqual(livroIdsDoTexto(db, 'poema', db.poemas[3]), [2, 1]);
    });

    it('livro que não existe mais fica de fora', () => {
        const db = banco();
        db.poemas[0].aparicoes.push(ap(99, null, null, null));
        assert.deepEqual(livroIdsDoTexto(db, 'poema', db.poemas[0]), [1, 2]);
    });
});

describe('tudo aninhado por aparição', () => {
    it('o mesmo texto sai dentro de cada livro, com o lugar e a posição dele', () => {
        const db = banco();
        const dados = buildNesting(db).data;
        const l1 = dados.find((l) => l.id === 1);
        const l2 = dados.find((l) => l.id === 2);
        const p10 = l1.conteudo_partes.find((p) => p.id === 10);
        const p11 = l1.conteudo_partes.find((p) => p.id === 11);
        assert.deepEqual(
            p10.conteudo_poemas_diretos.map((p) => [p.titulo, p.sequencia, p.paiId]),
            [
                ['Um', 1, 10],
                ['Três', 2, 10],
            ],
        );
        assert.deepEqual(
            p11.conteudo_poemas_diretos.map((p) => [p.titulo, p.sequencia, p.paiId]),
            [['Três', 2, 11]],
        );
        assert.deepEqual(
            l2.conteudo_partes[0].conteudo_poemas_diretos.map((p) => [p.titulo, p.sequencia]),
            [['Um', 4]],
        );
    });

    it('o texto no lugar do Destino sai como ele mesmo', () => {
        const db = banco();
        const l1 = buildNesting(db).data.find((l) => l.id === 1);
        assert.equal(l1.conteudo_partes[0].conteudo_poemas_diretos[0], db.poemas[0]);
    });

    it('o "só consta" sai à parte no livro, e avulso é só quem não tem aparição', () => {
        const db = banco();
        db.poemas.push({ id: 7, titulo: 'Sem lugar', paiTipo: null, paiId: null, aparicoes: [] });
        const nest = buildNesting(db);
        const l1 = nest.data.find((l) => l.id === 1);
        assert.deepEqual(
            l1.conteudo_poemas_vinculados.map((p) => p.titulo),
            ['Dois'],
        );
        assert.equal('conteudo_poemas_vinculados' in nest.data.find((l) => l.id === 2), false);
        assert.deepEqual(
            nest.avulsos.poemas.map((p) => p.titulo),
            ['Sem lugar'],
        );
    });

    it('o desaninhamento lê também os vinculados, com o livro como contexto', () => {
        const db = banco();
        const l1 = buildNesting(db).data.find((l) => l.id === 1);
        const poemas = [];
        flattenLivroAninhado(l1, poemas, []);
        const dois = poemas.find((p) => p.titulo === 'Dois');
        assert.deepEqual(dois.contexto, { livro: 'L1', parte: null, secao: null });
    });

    it('sem lista, o Destino manda e o avulso é quem não tem Destino', () => {
        const db = banco();
        db.poemas.forEach((p) => {
            delete p.aparicoes;
        });
        const nest = buildNesting(db);
        const l1 = nest.data.find((l) => l.id === 1);
        assert.deepEqual(
            l1.conteudo_partes[0].conteudo_poemas_diretos.map((p) => p.titulo),
            ['Um'],
        );
        assert.deepEqual(
            nest.avulsos.poemas.map((p) => p.titulo),
            ['Dois'],
        );
    });
});
