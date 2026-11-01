import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Leitura avaliativa (Fase 22): busca por prefixo `pegou:` e `incomodou:` nas abas
// Poemas e Prosas. Vale a leitura mais recente de cada texto; `pegou:` guarda
// também o peso do item; sem leitura (ou sem nada marcado) o campo fica vazio.
const { db } = await import('../js/db.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { sugerirBuscaTexto } = await import('../js/sugestoes-busca-texto.js');
const { montarFontesBuscaTexto } = await import('../js/fontes-sugestoes-busca-texto.js');
const { camposBuscaDaLeitura, camposBuscaDeLeitura, itensEmUsoParaBusca } =
    await import('../js/leitura-avaliativa-busca.js');

const ids = (lista) => lista.map((i) => i.id);

const leit = (id, tipo, textoId, data, extra = {}) => ({
    id,
    tipo,
    textoId,
    data,
    pegou: [],
    incomodou: [],
    ...extra,
});

describe('leitura-avaliativa-busca: texto de busca de uma leitura', () => {
    it('pegou leva o rótulo e o peso; incomodou leva só o rótulo', () => {
        const c = camposBuscaDaLeitura({
            pegou: [
                { item: 'originalidade', peso: 'centro' },
                { item: 'som', peso: 'leve' },
            ],
            incomodou: ['cliche', 'explica_demais'],
        });
        assert.equal(c._buscaPegou, 'Originalidade Central, Som e ritmo Pontual');
        assert.equal(c._buscaIncomodou, 'Clichê, Explica demais');
    });

    it('releria e mostraria levam o rótulo da resposta; resposta inválida ou ausente fica vazia', () => {
        const c = camposBuscaDaLeitura({ releria: 'sim', mostraria: 'nao' });
        assert.equal(c._buscaReleria, 'Sim');
        assert.equal(c._buscaMostraria, 'Não');
        assert.equal(camposBuscaDaLeitura({ releria: 'talvez' })._buscaReleria, 'Talvez');
        assert.equal(camposBuscaDaLeitura({ releria: 'xx' })._buscaReleria, '');
        assert.equal(camposBuscaDaLeitura({ releria: null })._buscaReleria, '');
        assert.equal(camposBuscaDaLeitura({ releria: 'sim' })._buscaMostraria, '');
    });

    it('item desconhecido é ignorado e leitura vazia dá campos vazios', () => {
        const c = camposBuscaDaLeitura({
            pegou: [{ item: 'inexistente', peso: 'leve' }],
            incomodou: ['inexistente'],
        });
        const vazio = {
            _buscaPegou: '',
            _buscaIncomodou: '',
            _buscaReleria: '',
            _buscaMostraria: '',
        };
        assert.deepEqual(c, vazio);
        assert.deepEqual(camposBuscaDaLeitura(null), vazio);
    });

    it('só a leitura mais recente do texto vale, e o tipo separa poema de prosa', () => {
        const leituras = [
            leit(1, 'poema', 1, '2026-10-01', { pegou: [{ item: 'voz', peso: 'forte' }] }),
            leit(2, 'poema', 1, '2026-11-01', { pegou: [{ item: 'graca', peso: 'leve' }] }),
            leit(3, 'prosa', 1, '2026-12-01', { pegou: [{ item: 'ideia', peso: 'centro' }] }),
        ];
        assert.equal(camposBuscaDeLeitura(leituras, 'poema', 1)._buscaPegou, 'Graça Pontual');
        assert.equal(camposBuscaDeLeitura(leituras, 'prosa', 1)._buscaPegou, 'Ideia Central');
        assert.equal(camposBuscaDeLeitura(leituras, 'poema', 2)._buscaPegou, '');
        assert.equal(camposBuscaDeLeitura(leituras, undefined, 1)._buscaPegou, '');
        assert.equal(camposBuscaDeLeitura(undefined, 'poema', 1)._buscaPegou, '');
    });
});

describe('pegou: e incomodou: na busca por prefixo', () => {
    let itens;
    beforeEach(() => {
        db.temas = [];
        db.assuntos = [];
        db.pessoas = [];
        db.grupos = [];
        db.autores = [];
        db.livros = [];
        db.epocas = [];
        db.periodosHistoricos = [];
        db.movimentosEscolas = [];
        db.locais = [];
        db.leituras = [
            leit(1, 'poema', 1, '2026-10-01', {
                pegou: [
                    { item: 'originalidade', peso: 'centro' },
                    { item: 'voz', peso: 'leve' },
                ],
                incomodou: ['cliche'],
            }),
            leit(2, 'poema', 2, '2026-10-02', {
                pegou: [{ item: 'originalidade', peso: 'leve' }],
            }),
            // Texto 3: a leitura antiga marcava Surpresa, a recente não marca nada.
            leit(3, 'poema', 3, '2026-10-01', { pegou: [{ item: 'surpresa', peso: 'forte' }] }),
            leit(4, 'poema', 3, '2026-11-01', { incomodou: ['previsivel', 'explica_demais'] }),
            // Mesmo id de outro tipo: não pode vazar para o poema 4.
            leit(5, 'prosa', 4, '2026-10-05', { pegou: [{ item: 'ideia', peso: 'centro' }] }),
        ];
        const p = (id) => decorarCamposBusca({ id, titulo: `T${id}` }, '', 'poema');
        itens = [p(1), p(2), p(3), p(4)];
    });

    it('a cadeia do prefixo está completa (canônico)', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaPegou, 'pegou');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaIncomodou, 'incomodou');
    });

    it('pegou:item acha em qualquer peso, com ou sem acento e caixa', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:originalidade')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:ORIGINALIDADE')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:voz')), [1]);
    });

    it('item de nome composto, com aspas', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:"som e ritmo"')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'incomodou:"explica demais"')), [3]);
    });

    it('o peso vem junto do item: frase com o peso, ou o peso sozinho', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:"originalidade central"')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:"originalidade pontual"')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:central')), [1]);
    });

    it('incomodou: acha pelo item e não olha o pegou:', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'incomodou:clichê')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'incomodou:cliche')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'incomodou:originalidade')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:clichê')), []);
    });

    it('vale só a leitura mais recente: Surpresa da leitura antiga não aparece', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:surpresa')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'incomodou:previsível')), [3]);
    });

    it('`*` separa quem tem algo marcado de quem não tem, cada bloco por si', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:*')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, '-pegou:*')), [3, 4]);
        assert.deepEqual(ids(filtrarTextos(itens, 'incomodou:*')), [1, 3]);
        assert.deepEqual(ids(filtrarTextos(itens, '-incomodou:*')), [2, 4]);
    });

    it('o tipo separa: o id 4 do poema não herda a leitura da prosa 4', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:ideia')), []);
        const pr = decorarCamposBusca({ id: 4, titulo: 'P4' }, '', 'prosa');
        assert.deepEqual(ids(filtrarTextos([pr], 'pegou:ideia')), [4]);
    });

    it('combina com outros termos e com exclusão', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:originalidade titulo:T2')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:originalidade -incomodou:*')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'pegou:voz ou incomodou:previsivel')), [1, 3]);
    });

    it('a busca solta não olha os campos de leitura', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'originalidade')), []);
    });

    it('sem tipo informado, os campos ficam vazios', () => {
        const semTipo = decorarCamposBusca({ id: 1, titulo: 'T1' });
        assert.deepEqual(ids(filtrarTextos([semTipo], 'pegou:*')), []);
    });
});

describe('pegou: e incomodou: nas sugestões', () => {
    beforeEach(() => {
        db.poemas = [
            { id: 1, titulo: 'A' },
            { id: 2, titulo: 'B' },
        ];
        db.prosas = [{ id: 1, titulo: 'C' }];
        db.leituras = [
            leit(1, 'poema', 1, '2026-10-01', {
                pegou: [
                    { item: 'voz', peso: 'leve' },
                    { item: 'originalidade', peso: 'centro' },
                ],
                incomodou: ['cliche'],
            }),
            leit(2, 'poema', 2, '2026-10-01', { pegou: [{ item: 'surpresa', peso: 'forte' }] }),
            leit(3, 'poema', 2, '2026-11-01', { pegou: [{ item: 'graca', peso: 'leve' }] }),
            leit(4, 'prosa', 1, '2026-11-01', { pegou: [{ item: 'ideia', peso: 'leve' }] }),
        ];
    });

    it('só oferece os itens em uso na leitura mais recente da aba, na ordem da lista', () => {
        const pegouPoemas = itensEmUsoParaBusca(db, 'poemas', 'pegou').map((i) => i.valor);
        assert.deepEqual(pegouPoemas, ['Voz', 'Graça', 'Originalidade']);
        const pegouProsas = itensEmUsoParaBusca(db, 'prosas', 'pegou').map((i) => i.valor);
        assert.deepEqual(pegouProsas, ['Ideia']);
        const incomodouPoemas = itensEmUsoParaBusca(db, 'poemas', 'incomodou').map((i) => i.valor);
        assert.deepEqual(incomodouPoemas, ['Clichê']);
        assert.deepEqual(itensEmUsoParaBusca(db, 'prosas', 'incomodou'), []);
    });

    it('a caixinha oferece os prefixos, o `*` e os itens em uso', () => {
        const fontes = montarFontesBuscaTexto(db, 'poemas');
        const p = sugerirBuscaTexto('peg', fontes);
        assert.deepEqual(
            p.itens.map((i) => i.texto),
            ['pegou:'],
        );
        const i = sugerirBuscaTexto('incomod', fontes);
        assert.deepEqual(
            i.itens.map((x) => x.texto),
            ['incomodou:'],
        );
        const v = sugerirBuscaTexto('pegou:', fontes);
        assert.equal(v.itens[0].texto, 'pegou:*');
        assert.deepEqual(
            v.itens.slice(1).map((x) => x.texto),
            ['pegou:Graça', 'pegou:Originalidade', 'pegou:Voz'],
        );
        const w = sugerirBuscaTexto('incomodou:', fontes);
        assert.deepEqual(
            w.itens.map((x) => x.texto),
            ['incomodou:*', 'incomodou:Clichê'],
        );
    });
});

describe('releria: e mostraria: na busca por prefixo (F22-D30)', () => {
    let itens;
    beforeEach(() => {
        db.temas = [];
        db.assuntos = [];
        db.pessoas = [];
        db.grupos = [];
        db.autores = [];
        db.livros = [];
        db.epocas = [];
        db.periodosHistoricos = [];
        db.movimentosEscolas = [];
        db.locais = [];
        db.leituras = [
            leit(1, 'poema', 1, '2026-10-01', { releria: 'sim', mostraria: 'nao' }),
            leit(2, 'poema', 2, '2026-10-02', { releria: 'talvez', mostraria: 'sim' }),
            // Texto 3: a leitura antiga dizia sim/sim, a mais recente diz não e deixa Mostraria em branco.
            leit(3, 'poema', 3, '2026-10-01', { releria: 'sim', mostraria: 'sim' }),
            leit(4, 'poema', 3, '2026-11-01', { releria: 'nao', mostraria: null }),
            // Texto 4: sem leitura. Mesmo id de outra tipo (prosa 4) não pode vazar.
            leit(5, 'prosa', 4, '2026-10-05', { releria: 'sim', mostraria: 'sim' }),
        ];
        const p = (id) => decorarCamposBusca({ id, titulo: `T${id}` }, '', 'poema');
        itens = [p(1), p(2), p(3), p(4)];
    });

    it('a cadeia do prefixo está completa (canônico)', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaReleria, 'releria');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaMostraria, 'mostraria');
    });

    it('releria:resposta acha pela resposta, com ou sem acento e caixa', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:sim')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:talvez')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:não')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:NAO')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'mostraria:não')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'mostraria:sim')), [2]);
    });

    it('vale só a leitura mais recente: o sim antigo do texto 3 não aparece', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:sim')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'mostraria:sim')), [2]);
    });

    it('`*` acha quem respondeu; `-` acha quem deixou em branco ou nunca foi lido', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:*')), [1, 2, 3]);
        assert.deepEqual(ids(filtrarTextos(itens, '-releria:*')), [4]);
        assert.deepEqual(ids(filtrarTextos(itens, 'mostraria:*')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, '-mostraria:*')), [3, 4]);
    });

    it('os dois prefixos se combinam: relê, mas não mostraria', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:sim mostraria:não')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:sim mostraria:sim')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:sim ou mostraria:sim')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, '-releria:sim')), [2, 3, 4]);
    });

    it('combina com pegou: e incomodou: e com outros termos', () => {
        db.leituras.push(
            leit(6, 'poema', 1, '2026-11-02', {
                pegou: [{ item: 'voz', peso: 'forte' }],
                releria: 'sim',
                mostraria: 'nao',
            }),
        );
        const p = (id) => decorarCamposBusca({ id, titulo: `T${id}` }, '', 'poema');
        const novos = [p(1), p(2), p(3), p(4)];
        assert.deepEqual(ids(filtrarTextos(novos, 'pegou:voz releria:sim')), [1]);
        assert.deepEqual(ids(filtrarTextos(novos, 'releria:sim titulo:T2')), []);
    });

    it('o tipo separa: o id 4 do poema não herda a leitura da prosa 4', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'releria:*')).includes(4), false);
        const pr = decorarCamposBusca({ id: 4, titulo: 'P4' }, '', 'prosa');
        assert.deepEqual(ids(filtrarTextos([pr], 'releria:sim')), [4]);
    });

    it('a busca solta não olha os campos de resposta', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'talvez')), []);
    });

    it('sem tipo informado, os campos ficam vazios', () => {
        const semTipo = decorarCamposBusca({ id: 1, titulo: 'T1' });
        assert.deepEqual(ids(filtrarTextos([semTipo], 'releria:*')), []);
    });
});

describe('releria: e mostraria: nas sugestões', () => {
    beforeEach(() => {
        db.poemas = [
            { id: 1, titulo: 'A' },
            { id: 2, titulo: 'B' },
        ];
        db.prosas = [{ id: 1, titulo: 'C' }];
        db.leituras = [
            leit(1, 'poema', 1, '2026-10-01', { releria: 'nao', mostraria: 'talvez' }),
            // Texto 2: a leitura antiga respondeu Sim, a mais recente deixa em branco.
            leit(2, 'poema', 2, '2026-10-01', { releria: 'sim', mostraria: 'sim' }),
            leit(3, 'poema', 2, '2026-11-01', { releria: 'talvez', mostraria: null }),
            leit(4, 'prosa', 1, '2026-11-01', { releria: 'sim' }),
        ];
    });

    it('só oferece as respostas em uso na leitura mais recente da aba, na ordem Sim, Talvez, Não', () => {
        const rel = (t) => itensEmUsoParaBusca(db, t, 'releria').map((i) => i.valor);
        const mos = (t) => itensEmUsoParaBusca(db, t, 'mostraria').map((i) => i.valor);
        assert.deepEqual(rel('poemas'), ['Talvez', 'Não']);
        assert.deepEqual(rel('prosas'), ['Sim']);
        assert.deepEqual(mos('poemas'), ['Talvez']);
        assert.deepEqual(mos('prosas'), []);
    });

    it('a caixinha oferece os prefixos, o `*` e as respostas em uso', () => {
        const fontes = montarFontesBuscaTexto(db, 'poemas');
        assert.deepEqual(
            sugerirBuscaTexto('reler', fontes).itens.map((i) => i.texto),
            ['releria:'],
        );
        assert.deepEqual(
            sugerirBuscaTexto('mostr', fontes).itens.map((i) => i.texto),
            ['mostraria:'],
        );
        const v = sugerirBuscaTexto('releria:', fontes);
        assert.equal(v.itens[0].texto, 'releria:*');
        assert.deepEqual(
            v.itens.slice(1).map((x) => x.texto),
            ['releria:Não', 'releria:Talvez'],
        );
        const w = sugerirBuscaTexto('mostraria:', fontes);
        assert.deepEqual(
            w.itens.map((x) => x.texto),
            ['mostraria:*', 'mostraria:Talvez'],
        );
    });
});
