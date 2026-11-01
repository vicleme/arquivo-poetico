import './helpers/localstorage-shim.js';

// Ficha do texto sorteado (Localização, Status, Primeira publicação, Autoria):
// lógica pura, sem o `db` global.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fichaDoTexto, contextoDoTexto } from '../js/ficha-do-texto.js';

const acervo = () => ({
    livros: [{ id: 1, titulo: 'Livro 1', tipo: 'Inéditos' }],
    partes: [{ id: 10, livroId: 1, titulo: 'Parte I' }],
    secoes: [{ id: 20, paiTipo: 'parte', paiId: 10, titulo: 'Seção A' }],
    autores: [
        {
            id: 5,
            nome: 'Fernando Pessoa',
            nomesLiterarios: [{ nome: 'Álvaro de Campos', tipo: 'Heterônimo' }],
        },
        { id: 6, nome: 'Victor Leme' },
    ],
    poemas: [],
    prosas: [],
});

const poema = (extra = {}) => ({
    id: 1,
    titulo: 'T',
    texto: 'verso',
    status: 'publicado',
    paiTipo: 'secao',
    paiId: 20,
    sequencia: 3,
    dataPublicacao: { dia: 5, mes: 3, ano: 2020 },
    autoria: [{ autorId: 6, papel: 'Autor', assinatura: 'Ortônimo', nomeLiterario: '' }],
    ...extra,
});

const valor = (ficha, rotulo) => ficha.find((l) => l.rotulo === rotulo)?.valor;

describe('fichaDoTexto', () => {
    it('traz as quatro linhas, com o mesmo texto do Ver', () => {
        const ficha = fichaDoTexto(acervo(), 'poema', poema());
        assert.deepEqual(
            ficha.map((l) => l.rotulo),
            ['Localização', 'Status', 'Primeira publicação', 'Autoria'],
        );
        assert.equal(valor(ficha, 'Localização'), 'Livro 1 › Parte I › Seção A · posição 3');
        assert.equal(valor(ficha, 'Status'), '🟢 Publicado');
        assert.equal(valor(ficha, 'Primeira publicação'), '05/03/2020');
        assert.equal(valor(ficha, 'Autoria'), 'Victor Leme (Autor)');
    });

    it('traz Coletâneas e Aparece em, na ordem do Ver, entre Localização e Status', () => {
        const db = acervo();
        db.livros.push(
            { id: 2, titulo: 'Livro 2', tipo: 'Inéditos' },
            { id: 3, titulo: 'Seleta', tipo: 'Coletânea' },
        );
        db.partes.push({ id: 40, livroId: 3, titulo: 'Parte Seleta' });
        db.itensColetanea = [{ id: 1, parteId: 40, refTipo: 'poema', refId: 1, sequencia: 2 }];
        const ficha = fichaDoTexto(
            db,
            'poema',
            poema({
                aparicoes: [
                    { livroId: 1, parteId: 10, secaoId: 20, sequencia: 3 },
                    { livroId: 2, parteId: null, secaoId: null, sequencia: 1 },
                ],
            }),
        );
        assert.deepEqual(
            ficha.map((l) => l.rotulo),
            ['Localização', 'Coletâneas', 'Aparece em', 'Status', 'Primeira publicação', 'Autoria'],
        );
        assert.equal(valor(ficha, 'Coletâneas'), 'Seleta');
        assert.equal(
            valor(ficha, 'Aparece em'),
            'Livro 1 › Parte I › Seção A · posição 3; Livro 2 · posição 1',
        );
    });

    it('Coletâneas lista todas, por vírgula; a Coletânea não entra em Aparece em', () => {
        const db = acervo();
        db.livros.push(
            { id: 3, titulo: 'Seleta', tipo: 'Coletânea', sequencia: 1 },
            { id: 4, titulo: 'Antologia', tipo: 'Coletânea', sequencia: 2 },
        );
        db.partes.push({ id: 40, livroId: 3, titulo: 'P1' }, { id: 41, livroId: 4, titulo: 'P2' });
        db.itensColetanea = [
            { id: 1, parteId: 41, refTipo: 'poema', refId: 1 },
            { id: 2, parteId: 40, refTipo: 'poema', refId: 1 },
            { id: 3, parteId: 40, refTipo: 'prosa', refId: 1 },
        ];
        const ficha = fichaDoTexto(db, 'poema', poema());
        assert.equal(valor(ficha, 'Coletâneas'), 'Seleta, Antologia');
        assert.equal(valor(ficha, 'Aparece em'), undefined);
    });

    it('texto em um só lugar e fora de Coletâneas não ganha as duas linhas', () => {
        const rotulos = fichaDoTexto(acervo(), 'poema', poema()).map((l) => l.rotulo);
        assert.equal(rotulos.includes('Coletâneas'), false);
        assert.equal(rotulos.includes('Aparece em'), false);
    });

    it('não traz data de escrita nem tema: só o que o Ver mostra da ficha curta', () => {
        const ficha = fichaDoTexto(
            acervo(),
            'poema',
            poema({ dataEscrita: { ano: 2001 }, temas: [{ temaId: 1, papel: '' }] }),
        );
        assert.equal(JSON.stringify(ficha).includes('2001'), false);
        assert.deepEqual(
            ficha.map((l) => l.rotulo),
            ['Localização', 'Status', 'Primeira publicação', 'Autoria'],
        );
    });

    it('texto avulso, sem data e sem autoria: só o Status', () => {
        const ficha = fichaDoTexto(
            acervo(),
            'poema',
            poema({
                paiTipo: null,
                paiId: null,
                sequencia: null,
                dataPublicacao: null,
                autoria: [],
            }),
        );
        assert.deepEqual(ficha, [{ rotulo: 'Status', valor: '🟢 Publicado' }]);
    });

    it('lugar sem posição diz "sem posição"; só o ano da data basta', () => {
        const ficha = fichaDoTexto(
            acervo(),
            'prosa',
            poema({ paiTipo: 'livro', paiId: 1, sequencia: null, dataPublicacao: { ano: 1915 } }),
        );
        assert.equal(valor(ficha, 'Localização'), 'Livro 1 · sem posição');
        assert.equal(valor(ficha, 'Primeira publicação'), '1915');
    });

    it('heterônimo mostra o nome literário e de quem é', () => {
        const ficha = fichaDoTexto(
            acervo(),
            'poema',
            poema({
                autoria: [
                    {
                        autorId: 5,
                        papel: 'Autor',
                        assinatura: 'Heterônimo',
                        nomeLiterario: 'Álvaro de Campos',
                    },
                ],
            }),
        );
        assert.equal(
            valor(ficha, 'Autoria'),
            'Álvaro de Campos (Autor, heterônimo de Fernando Pessoa)',
        );
    });

    it('autor excluído do cadastro some, sem quebrar', () => {
        const ficha = fichaDoTexto(
            acervo(),
            'poema',
            poema({ autoria: [{ autorId: 999, papel: 'Autor' }] }),
        );
        assert.equal(valor(ficha, 'Autoria'), undefined);
    });

    it('texto antigo, sem status: Publicado sim ou não', () => {
        const sem = (extra) =>
            fichaDoTexto(acervo(), 'prosa', poema({ status: undefined, ...extra }));
        assert.equal(valor(sem({ publicado: true }), 'Publicado'), 'Sim');
        assert.equal(valor(sem({}), 'Publicado'), 'Não (rascunho)');
    });

    it('status fora da lista não quebra e mostra o valor cru', () => {
        const ficha = fichaDoTexto(acervo(), 'poema', poema({ status: 'novo' }));
        assert.equal(valor(ficha, 'Status'), '⚪ novo');
    });

    it('acervo sem as listas (backup antigo) não quebra', () => {
        const ficha = fichaDoTexto({ poemas: [] }, 'poema', poema());
        assert.equal(valor(ficha, 'Status'), '🟢 Publicado');
        assert.equal(valor(ficha, 'Localização'), undefined);
    });

    it('não muda o texto nem grava `contexto` nele', () => {
        const item = poema();
        const antes = JSON.stringify(item);
        fichaDoTexto(acervo(), 'poema', item);
        assert.equal(JSON.stringify(item), antes);
        assert.equal('contexto' in item, false);
    });
});

describe('contextoDoTexto', () => {
    it('resolve os títulos do Destino', () => {
        const c = contextoDoTexto(acervo(), 'poema', poema());
        assert.deepEqual([c.livro, c.parte, c.secao], ['Livro 1', 'Parte I', 'Seção A']);
    });
});
