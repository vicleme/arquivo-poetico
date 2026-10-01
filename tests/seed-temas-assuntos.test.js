import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Seed de Temas e Assuntos: amostra só para instalação nova (nada salvo no
// navegador). Este arquivo checa o `db` logo após o import, antes de
// qualquer teste mexer nele: a instalação é nova aqui (localStorage vazio).
const { db, semearTemasEAssuntos } = await import('../js/db.js');
const { chaveTema, nomesTemasDoAssunto, assuntosDoTexto } = await import('../js/utils.js');
const estadoInicial = {
    temas: structuredClone(db.temas),
    assuntos: structuredClone(db.assuntos),
};

describe('seed de Temas e Assuntos', () => {
    it('instalação nova já nasce com os 9 Assuntos e os Temas do seed', () => {
        assert.equal(estadoInicial.assuntos.length, 9);
        assert.equal(estadoInicial.temas.length, 44);
    });

    it('os nomes dos Assuntos são os do Victor', () => {
        assert.deepEqual(
            estadoInicial.assuntos.map((a) => a.nome),
            [
                'Identidade e Autoconhecimento',
                'Vida emocional',
                'Relações e vínculos',
                'Tempo, memória e perda',
                'Sociedade e política',
                'Corpo, gênero e sexualidade',
                'Discriminação',
                'Modernidade, tecnologia e consumo',
                'Arte, cultura e escrita',
            ],
        );
    });

    it('ids únicos; todo temaId aponta para um Tema do cadastro; nenhum Assunto vazio', () => {
        const ids = [...estadoInicial.temas, ...estadoInicial.assuntos].map((e) => e.id);
        assert.equal(new Set(ids).size, ids.length);
        const idsTemas = new Set(estadoInicial.temas.map((t) => t.id));
        estadoInicial.assuntos.forEach((a) => {
            assert.ok(a.temaIds.length > 0, a.nome);
            assert.ok(
                a.temaIds.every((id) => idsTemas.has(id)),
                a.nome,
            );
        });
    });

    it('nenhum Tema repetido (por caixa/acento) e todo Tema pertence a um Assunto', () => {
        const chaves = estadoInicial.temas.map((t) => chaveTema(t.nome));
        assert.equal(new Set(chaves).size, chaves.length);
        const usados = new Set(estadoInicial.assuntos.flatMap((a) => a.temaIds));
        assert.ok(estadoInicial.temas.every((t) => usados.has(t.id)));
    });

    it('"Machismo" está em dois Assuntos (N:N à vista) e é um só Tema', () => {
        const machismo = estadoInicial.temas.filter((t) => chaveTema(t.nome) === 'machismo');
        assert.equal(machismo.length, 1);
        const em = estadoInicial.assuntos
            .filter((a) => a.temaIds.includes(machismo[0].id))
            .map((a) => a.nome);
        assert.deepEqual(em, ['Corpo, gênero e sexualidade', 'Discriminação']);
    });

    it('fora do seed: temas pessoais e lugares (Brasil é Territorialidade)', () => {
        const nomes = estadoInicial.temas.map((t) => chaveTema(t.nome));
        for (const fora of ['geracao z', 'brasil', 'psicofobia', 'reificacao', 'topofilia']) {
            assert.ok(!nomes.includes(fora), fora);
        }
    });

    it('um texto com um Tema do seed já ganha o Assunto (sem cadastrar nada)', () => {
        const item = { id: 1, titulo: 'x', sinalizacoesTema: 'Saudade' };
        const r = assuntosDoTexto(item, estadoInicial.assuntos, estadoInicial.temas);
        assert.deepEqual(
            r.map((a) => a.nome),
            ['Tempo, memória e perda'],
        );
    });

    it('cada chamada gera ids próprios e o mesmo conteúdo', () => {
        const a = semearTemasEAssuntos();
        const b = semearTemasEAssuntos();
        assert.deepEqual(
            a.temas.map((t) => t.nome),
            b.temas.map((t) => t.nome),
        );
        assert.notEqual(a.temas[0].id, b.temas[0].id);
        assert.deepEqual(nomesTemasDoAssunto(a.assuntos[6], a.temas), [
            'Machismo',
            'LGBTfobia',
            'Culpabilização da vítima',
        ]);
    });

    it('excluir um Tema do seed não o traz de volta (registros comuns, sem flag)', () => {
        assert.ok(estadoInicial.temas.every((t) => t.embutido === undefined));
        assert.ok(estadoInicial.assuntos.every((a) => a.embutido === undefined));
    });
});
