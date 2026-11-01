// Leitura avaliativa (Fase 22, entrega 2a): ações da aba, sem DOM.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    acharTextoDaLeitura,
    listarTextosParaLeitura,
    FILTROS_RESPOSTA,
    rotuloDaResposta,
    ultimaLeituraDoTexto,
    novoRascunho,
    marcarPegou,
    alternarIncomodou,
    responder,
    sugestaoDoRascunho,
    concluirLeitura,
} from '../js/leitura-avaliativa-acoes.js';

const base = () => ({
    poemas: [
        { id: 1, titulo: 'Árvore', autoclassificacao: 0, autoavaliacao: '' },
        { id: 2, titulo: 'Mar alto', autoclassificacao: 3, autoavaliacao: 'gostei' },
    ],
    prosas: [{ id: 1, titulo: 'Carta', autoclassificacao: 0 }],
    leituras: [],
});

const pronto = (tipo = 'poema', id = 1) => {
    let r = novoRascunho(tipo, id);
    r = responder(r, 'releria', 'sim');
    r = responder(r, 'mostraria', 'talvez');
    r = marcarPegou(r, 'imagem', 'forte');
    return r; // sugestão: 2 + 0,5 + 1 = 3,5
};

describe('listarTextosParaLeitura', () => {
    it('lista poemas e prosas em ordem alfabética, ignorando acento', () => {
        const l = listarTextosParaLeitura(base());
        assert.deepEqual(
            l.map((t) => `${t.tipo}:${t.titulo}`),
            ['poema:Árvore', 'prosa:Carta', 'poema:Mar alto'],
        );
    });

    it('busca por trecho do título sem caixa e sem acento', () => {
        assert.deepEqual(
            listarTextosParaLeitura(base(), 'arvore').map((t) => t.titulo),
            ['Árvore'],
        );
        assert.deepEqual(
            listarTextosParaLeitura(base(), 'MAR').map((t) => t.titulo),
            ['Mar alto'],
        );
        assert.equal(listarTextosParaLeitura(base(), 'zzz').length, 0);
    });

    it('traz a contagem de leituras, a última data e a Classificação', () => {
        const d = base();
        d.leituras = [
            { id: 1, tipo: 'poema', textoId: 2, data: '2026-10-01' },
            { id: 2, tipo: 'poema', textoId: 2, data: '2026-11-01' },
            { id: 3, tipo: 'prosa', textoId: 2, data: '2026-11-02' },
        ];
        const mar = listarTextosParaLeitura(d).find((t) => t.titulo === 'Mar alto');
        assert.equal(mar.leituras, 2);
        assert.equal(mar.ultimaData, '2026-11-01');
        assert.equal(mar.classificacao, 3);
    });

    it('texto sem título aparece pelo id', () => {
        const d = base();
        d.poemas.push({ id: 9, titulo: '  ' });
        assert.ok(listarTextosParaLeitura(d).some((t) => t.titulo === '#9'));
    });

    it('aguenta db sem prosas ou sem leituras', () => {
        assert.deepEqual(listarTextosParaLeitura({ poemas: [] }), []);
    });
});

describe('rascunho', () => {
    it('marcarPegou marca, troca o peso e desmarca ao repetir', () => {
        let r = novoRascunho('poema', 1);
        r = marcarPegou(r, 'som', 'leve');
        assert.deepEqual(r.pegou, [{ item: 'som', peso: 'leve' }]);
        r = marcarPegou(r, 'som', 'centro');
        assert.deepEqual(r.pegou, [{ item: 'som', peso: 'centro' }]);
        r = marcarPegou(r, 'som', 'centro');
        assert.deepEqual(r.pegou, []);
    });

    it('marcarPegou ignora item ou peso desconhecido', () => {
        const r = marcarPegou(marcarPegou(novoRascunho('poema', 1), 'cheiro', 'leve'), 'som', 'x');
        assert.deepEqual(r.pegou, []);
    });

    it('alternarIncomodou liga e desliga', () => {
        let r = alternarIncomodou(novoRascunho('poema', 1), 'cliche');
        assert.deepEqual(r.incomodou, ['cliche']);
        r = alternarIncomodou(r, 'frouxo');
        assert.deepEqual(r.incomodou, ['cliche', 'frouxo']);
        r = alternarIncomodou(r, 'cliche');
        assert.deepEqual(r.incomodou, ['frouxo']);
    });

    it('responder escolhe, troca e limpa ao repetir; ignora campo estranho', () => {
        let r = responder(novoRascunho('poema', 1), 'releria', 'sim');
        assert.equal(r.releria, 'sim');
        r = responder(r, 'releria', 'nao');
        assert.equal(r.releria, 'nao');
        r = responder(r, 'releria', 'nao');
        assert.equal(r.releria, null);
        assert.equal(responder(r, 'sugerido', 5).sugerido, null);
    });

    it('não muda o rascunho recebido', () => {
        const r = novoRascunho('poema', 1);
        const copia = JSON.parse(JSON.stringify(r));
        marcarPegou(r, 'som', 'leve');
        alternarIncomodou(r, 'cliche');
        responder(r, 'releria', 'sim');
        assert.deepEqual(r, copia);
    });

    it('sugestaoDoRascunho usa a regra da entrega 1', () => {
        assert.equal(sugestaoDoRascunho(pronto()).coracoes, 3.5);
        assert.equal(sugestaoDoRascunho(novoRascunho('poema', 1)).coracoes, null);
    });
});

describe('concluirLeitura', () => {
    it('grava a leitura com sugerido e escolhido, e a Classificação do texto', () => {
        const d = base();
        const r = concluirLeitura(d, pronto(), { escolhido: 4, id: 100, hoje: '2026-11-01' });
        assert.equal(r.ok, true);
        assert.equal(d.leituras.length, 1);
        assert.equal(d.leituras[0].sugerido, 3.5);
        assert.equal(d.leituras[0].escolhido, 4);
        assert.equal(d.leituras[0].data, '2026-11-01');
        assert.equal(d.poemas[0].autoclassificacao, 4);
        assert.equal(r.gravouClassificacao, true);
    });

    it('terminar sem escolher grava a leitura, mas não toca na Classificação', () => {
        const d = base();
        d.poemas[1].autoclassificacao = 3;
        const r = concluirLeitura(d, pronto('poema', 2), { id: 1, hoje: '2026-11-01' });
        assert.equal(r.ok, true);
        assert.equal(d.leituras[0].escolhido, null);
        assert.equal(d.leituras[0].sugerido, 3.5);
        assert.equal(d.poemas[1].autoclassificacao, 3);
        assert.equal(r.gravouClassificacao, false);
    });

    it('nunca grava 0 na Classificação', () => {
        const d = base();
        concluirLeitura(d, pronto(), { escolhido: 0, id: 1, hoje: '2026-11-01' });
        assert.equal(d.poemas[0].autoclassificacao, 0);
        assert.equal(d.leituras[0].escolhido, null);
    });

    it('pede confirmação antes de trocar uma Classificação existente e não grava nada', () => {
        const d = base();
        const r = concluirLeitura(d, pronto('poema', 2), {
            escolhido: 5,
            id: 1,
            hoje: '2026-11-01',
        });
        assert.equal(r.ok, false);
        assert.equal(r.motivo, 'confirmar-troca');
        assert.equal(r.atual, 3);
        assert.equal(r.novo, 5);
        assert.equal(d.leituras.length, 0);
        assert.equal(d.poemas[1].autoclassificacao, 3);
    });

    it('com substituir: true troca a Classificação', () => {
        const d = base();
        const r = concluirLeitura(d, pronto('poema', 2), {
            escolhido: 5,
            substituir: true,
            id: 1,
            hoje: '2026-11-01',
        });
        assert.equal(r.ok, true);
        assert.equal(d.poemas[1].autoclassificacao, 5);
    });

    it('escolher o mesmo valor que o texto já tem não pede confirmação', () => {
        const d = base();
        const r = concluirLeitura(d, pronto('poema', 2), {
            escolhido: 3,
            id: 1,
            hoje: '2026-11-01',
        });
        assert.equal(r.ok, true);
        assert.equal(r.gravouClassificacao, false);
        assert.equal(d.leituras[0].escolhido, 3);
    });

    it('grava a linha livre no campo Avaliação do texto, e só quando muda', () => {
        const d = base();
        const r = concluirLeitura(d, pronto('poema', 2), {
            avaliacao: 'releitura: melhor ainda',
            id: 1,
            hoje: '2026-11-01',
        });
        assert.equal(d.poemas[1].autoavaliacao, 'releitura: melhor ainda');
        assert.equal(r.gravouAvaliacao, true);
        const r2 = concluirLeitura(d, pronto('poema', 2), {
            avaliacao: 'releitura: melhor ainda',
            id: 2,
            hoje: '2026-11-02',
        });
        assert.equal(r2.gravouAvaliacao, false);
    });

    it('sem avaliacao informada, deixa o campo do texto como está', () => {
        const d = base();
        concluirLeitura(d, pronto('poema', 2), { id: 1, hoje: '2026-11-01' });
        assert.equal(d.poemas[1].autoavaliacao, 'gostei');
    });

    it('uma prosa grava na prosa, não no poema de mesmo id', () => {
        const d = base();
        concluirLeitura(d, pronto('prosa', 1), { escolhido: 2, id: 1, hoje: '2026-11-01' });
        assert.equal(d.prosas[0].autoclassificacao, 2);
        assert.equal(d.poemas[0].autoclassificacao, 0);
        assert.equal(d.leituras[0].tipo, 'prosa');
    });

    it('recusa texto que não existe', () => {
        const d = base();
        const r = concluirLeitura(d, pronto('poema', 999), { id: 1, hoje: '2026-11-01' });
        assert.equal(r.ok, false);
        assert.equal(r.motivo, 'sem-texto');
        assert.equal(d.leituras.length, 0);
    });

    it('recusa data ou id ausente e explica', () => {
        const d = base();
        assert.equal(concluirLeitura(d, pronto(), { id: 1 }).motivo, 'invalida');
        assert.equal(concluirLeitura(d, pronto(), { hoje: '2026-11-01' }).motivo, 'invalida');
        assert.equal(d.leituras.length, 0);
    });

    it('cria db.leituras se ainda não existir', () => {
        const d = base();
        delete d.leituras;
        concluirLeitura(d, pronto(), { id: 1, hoje: '2026-11-01' });
        assert.equal(d.leituras.length, 1);
    });

    it('sem resposta em Releria e Mostraria, grava sem sugestão', () => {
        const d = base();
        const r = concluirLeitura(d, novoRascunho('poema', 1), {
            escolhido: 2,
            id: 1,
            hoje: '2026-11-01',
        });
        assert.equal(r.ok, true);
        assert.equal(d.leituras[0].sugerido, null);
        assert.equal(d.leituras[0].escolhido, 2);
    });
});

describe('leituras anteriores', () => {
    it('ultimaLeituraDoTexto devolve uma cópia da mais recente do texto e tipo certos', () => {
        const d = base();
        concluirLeitura(d, pronto(), { id: 1, hoje: '2026-10-01' });
        concluirLeitura(d, pronto(), { id: 2, hoje: '2026-11-01' });
        concluirLeitura(d, pronto('prosa', 1), { id: 3, hoje: '2026-11-05' });
        const u = ultimaLeituraDoTexto(d, 'poema', 1);
        assert.equal(u.id, 2);
        u.pegou.push({ item: 'som', peso: 'leve' });
        assert.equal(d.leituras[1].pegou.length, 1);
        assert.equal(ultimaLeituraDoTexto(d, 'poema', 2), null);
    });

    it('acharTextoDaLeitura compara o id sem se importar com número ou texto', () => {
        assert.equal(acharTextoDaLeitura(base(), 'poema', '2').titulo, 'Mar alto');
        assert.equal(acharTextoDaLeitura(base(), 'prosa', 2), null);
    });
});

describe('listarTextosParaLeitura com filtro', () => {
    it('avaliados e não avaliados dependem de ter leitura do mesmo tipo', () => {
        const d = base();
        d.leituras.push({
            id: 1,
            textoId: 1,
            tipo: 'prosa',
            data: '2026-11-01',
            pegou: [],
            incomodou: [],
        });
        const ids = (f) =>
            listarTextosParaLeitura(d, '', f)
                .map((l) => `${l.tipo}${l.id}`)
                .sort();
        assert.deepEqual(ids('avaliados'), ['prosa1']);
        assert.deepEqual(ids('nao-avaliados'), ['poema1', 'poema2']);
        assert.equal(ids('todos').length, 3);
    });
});

describe('listarTextosParaLeitura com filtro por item de De que maneira te pegou', () => {
    const leit = (id, tipo, textoId, data, pegou) => ({
        id,
        tipo,
        textoId,
        data,
        pegou,
        incomodou: [],
    });
    const comLeituras = () => {
        const d = base();
        d.leituras = [
            leit(1, 'poema', 1, '2026-10-01', [{ item: 'originalidade', peso: 'leve' }]),
            leit(2, 'poema', 2, '2026-11-01', [{ item: 'originalidade', peso: 'centro' }]),
            leit(3, 'prosa', 1, '2026-11-01', [{ item: 'originalidade', peso: 'forte' }]),
        ];
        return d;
    };
    const nomes = (d, item) => listarTextosParaLeitura(d, '', 'todos', 'todos', 'todos', item);

    it('fica só com os textos que marcaram o item, do peso maior para o menor', () => {
        const l = nomes(comLeituras(), 'originalidade');
        assert.deepEqual(
            l.map((t) => `${t.tipo}:${t.titulo}`),
            ['poema:Mar alto', 'prosa:Carta', 'poema:Árvore'],
        );
        assert.deepEqual(
            l.map((t) => t.pesoPegouId),
            ['centro', 'forte', 'leve'],
        );
    });

    it('no empate de peso, desempata por corações e depois por título', () => {
        const d = comLeituras();
        d.leituras[0].pegou = [{ item: 'originalidade', peso: 'forte' }];
        d.poemas[0].autoclassificacao = 4.5;
        d.prosas[0].autoclassificacao = 2;
        assert.deepEqual(
            nomes(d, 'originalidade')
                .filter((t) => t.pesoPegouId === 'forte')
                .map((t) => t.titulo),
            ['Árvore', 'Carta'],
        );
    });

    it('vale a leitura mais recente do texto, não qualquer uma', () => {
        const d = comLeituras();
        d.leituras.push(leit(4, 'poema', 2, '2026-11-02', [{ item: 'graca', peso: 'leve' }]));
        assert.ok(!nomes(d, 'originalidade').some((t) => t.titulo === 'Mar alto'));
        assert.deepEqual(
            nomes(d, 'graca').map((t) => t.titulo),
            ['Mar alto'],
        );
    });

    it('texto nunca lido não aparece quando há item escolhido', () => {
        assert.equal(nomes(base(), 'som').length, 0);
    });

    it('item desconhecido ou "todos" volta à ordem alfabética completa', () => {
        const d = comLeituras();
        for (const item of ['todos', 'nao-existe', undefined]) {
            assert.deepEqual(
                nomes(d, item).map((t) => t.titulo),
                ['Árvore', 'Carta', 'Mar alto'],
            );
        }
    });

    it('combina com tipo, busca e filtros de leitura e classificação', () => {
        const d = comLeituras();
        const so = (...args) => listarTextosParaLeitura(d, ...args).map((t) => t.titulo);
        assert.deepEqual(so('', 'todos', 'todos', 'poema', 'originalidade'), [
            'Mar alto',
            'Árvore',
        ]);
        assert.deepEqual(so('mar', 'todos', 'todos', 'todos', 'originalidade'), ['Mar alto']);
        assert.deepEqual(so('', 'todos', 'classificados', 'todos', 'originalidade'), ['Mar alto']);
    });
});

describe('listarTextosParaLeitura com filtro por item de O que incomodou', () => {
    const leit = (id, tipo, textoId, data, incomodou, pegou = []) => ({
        id,
        tipo,
        textoId,
        data,
        pegou,
        incomodou,
    });
    const comLeituras = () => {
        const d = base();
        d.leituras = [
            leit(1, 'poema', 1, '2026-10-01', ['cliche']),
            leit(2, 'poema', 2, '2026-11-01', ['cliche', 'previsivel']),
            leit(3, 'prosa', 1, '2026-11-01', ['previsivel']),
        ];
        return d;
    };
    const nomes = (d, item, pegou = 'todos') =>
        listarTextosParaLeitura(d, '', 'todos', 'todos', 'todos', pegou, item).map((t) => t.titulo);

    it('fica só com os textos que marcaram o item, por corações e depois por título', () => {
        const d = comLeituras();
        assert.deepEqual(nomes(d, 'cliche'), ['Mar alto', 'Árvore']);
        d.poemas.find((p) => p.titulo === 'Árvore').autoclassificacao = 4;
        assert.deepEqual(nomes(d, 'cliche'), ['Árvore', 'Mar alto']);
        assert.deepEqual(nomes(d, 'previsivel'), ['Mar alto', 'Carta']);
    });

    it('vale a leitura mais recente do texto, não qualquer uma', () => {
        const d = comLeituras();
        d.leituras.push(leit(4, 'poema', 2, '2026-11-02', ['forcado']));
        assert.ok(!nomes(d, 'cliche').includes('Mar alto'));
        assert.deepEqual(nomes(d, 'forcado'), ['Mar alto']);
    });

    it('texto nunca lido não aparece, e item desconhecido ou "todos" volta à lista completa', () => {
        assert.equal(nomes(base(), 'cliche').length, 0);
        const d = comLeituras();
        for (const item of ['todos', 'nao-existe', undefined]) {
            assert.deepEqual(nomes(d, item), ['Árvore', 'Carta', 'Mar alto']);
        }
    });

    it('combina com o filtro Pegou: o texto precisa ter marcado os dois', () => {
        const d = comLeituras();
        d.leituras[1].pegou = [{ item: 'originalidade', peso: 'centro' }];
        assert.deepEqual(nomes(d, 'cliche', 'originalidade'), ['Mar alto']);
        assert.deepEqual(nomes(d, 'previsivel', 'originalidade'), ['Mar alto']);
        assert.deepEqual(nomes(d, 'cliche', 'voz'), []);
    });

    it('combina com tipo, busca e filtros de leitura e classificação', () => {
        const d = comLeituras();
        const so = (...args) => listarTextosParaLeitura(d, ...args).map((t) => t.titulo);
        assert.deepEqual(so('', 'todos', 'todos', 'poema', 'todos', 'previsivel'), ['Mar alto']);
        assert.deepEqual(so('mar', 'todos', 'todos', 'todos', 'todos', 'cliche'), ['Mar alto']);
    });
});

describe('listarTextosParaLeitura com a opção Algum', () => {
    const leit = (id, tipo, textoId, data, pegou, incomodou) => ({
        id,
        tipo,
        textoId,
        data,
        pegou,
        incomodou,
    });
    const comLeituras = () => {
        const d = base();
        d.leituras = [
            // Árvore: só incomodou. Mar alto: pegou (centro e leve) e incomodou. Carta: leitura vazia.
            leit(1, 'poema', 1, '2026-11-01', [], ['previsivel', 'cliche']),
            leit(
                2,
                'poema',
                2,
                '2026-11-01',
                [
                    { item: 'voz', peso: 'leve' },
                    { item: 'originalidade', peso: 'centro' },
                ],
                ['cliche'],
            ),
            leit(3, 'prosa', 1, '2026-11-01', [], []),
        ];
        return d;
    };
    const lista = (d, pegou, incomodou) =>
        listarTextosParaLeitura(d, '', 'todos', 'todos', 'todos', pegou, incomodou);

    it('Pegou: algum fica com quem marcou ao menos um item e traz o que foi marcado', () => {
        const l = lista(comLeituras(), 'algum');
        assert.deepEqual(
            l.map((t) => t.titulo),
            ['Mar alto'],
        );
        assert.deepEqual(l[0].pegouMarcas, [
            { item: 'originalidade', peso: 'centro' },
            { item: 'voz', peso: 'leve' },
        ]);
        assert.equal(l[0].pesoPegouId, 'centro');
    });

    it('Incomodou: algum fica com quem marcou ao menos um item, na ordem da lista de fábrica', () => {
        const l = lista(comLeituras(), 'todos', 'algum');
        assert.deepEqual(
            l.map((t) => t.titulo),
            ['Mar alto', 'Árvore'],
        );
        assert.deepEqual(l[1].incomodouMarcas, ['cliche', 'previsivel']);
    });

    it('vale a leitura mais recente: uma leitura vazia depois tira o texto do Algum', () => {
        const d = comLeituras();
        d.leituras.push(leit(4, 'poema', 2, '2026-11-02', [], []));
        assert.deepEqual(lista(d, 'algum'), []);
        assert.deepEqual(
            lista(d, 'todos', 'algum').map((t) => t.titulo),
            ['Árvore'],
        );
    });

    it('os dois Algum juntos pedem os dois blocos marcados', () => {
        const d = comLeituras();
        assert.deepEqual(
            lista(d, 'algum', 'algum').map((t) => t.titulo),
            ['Mar alto'],
        );
    });

    it('item marcado que não existe mais nas listas é ignorado', () => {
        const d = comLeituras();
        d.leituras.push(
            leit(4, 'poema', 2, '2026-11-02', [{ item: 'sumiu', peso: 'leve' }], ['x']),
        );
        assert.deepEqual(lista(d, 'algum'), []);
        assert.deepEqual(
            lista(d, 'todos', 'algum').map((t) => t.titulo),
            ['Árvore'],
        );
    });
});

describe('listarTextosParaLeitura com filtro por Releria e Mostraria (F22-D29)', () => {
    const leit = (id, tipo, textoId, data, releria, mostraria) => ({
        id,
        tipo,
        textoId,
        data,
        pegou: [],
        incomodou: [],
        releria,
        mostraria,
        sugerido: null,
        escolhido: null,
    });
    const dados = () => {
        const d = base();
        d.leituras = [
            // Árvore: a leitura antiga dizia sim/sim, a mais recente diz não/talvez.
            leit(1, 'poema', 1, '2026-10-01', 'sim', 'sim'),
            leit(2, 'poema', 1, '2026-11-01', 'nao', 'talvez'),
            // Mar alto: releria sim, mostraria sem resposta.
            leit(3, 'poema', 2, '2026-11-01', 'sim', null),
            // Carta (prosa): leitura sem nenhuma resposta.
            leit(4, 'prosa', 1, '2026-11-01', null, null),
        ];
        return d;
    };
    const lista = (d, releria, mostraria) =>
        listarTextosParaLeitura(
            d,
            '',
            'todos',
            'todos',
            'todos',
            'todos',
            'todos',
            releria,
            mostraria,
        );
    const titulos = (l) => l.map((t) => t.titulo);

    it('as opções são Todos, Sim, Talvez, Não e Sem resposta', () => {
        assert.deepEqual(
            FILTROS_RESPOSTA.map((f) => f.rotulo),
            ['Todos', 'Sim', 'Talvez', 'Não', 'Sem resposta'],
        );
        assert.equal(rotuloDaResposta('nao'), 'Não');
        assert.equal(rotuloDaResposta('xx'), '');
    });

    it('sem filtro, nada muda: ordem alfabética e todos os textos', () => {
        assert.deepEqual(titulos(lista(dados())), ['Árvore', 'Carta', 'Mar alto']);
        assert.deepEqual(titulos(lista(dados(), 'todos', 'todos')), [
            'Árvore',
            'Carta',
            'Mar alto',
        ]);
    });

    it('vale só a leitura mais recente de cada texto', () => {
        assert.deepEqual(titulos(lista(dados(), 'sim')), ['Mar alto']);
        assert.deepEqual(titulos(lista(dados(), 'nao')), ['Árvore']);
        assert.deepEqual(titulos(lista(dados(), 'todos', 'talvez')), ['Árvore']);
        assert.deepEqual(titulos(lista(dados(), 'todos', 'sim')), []);
    });

    it('Sem resposta pega a leitura que deixou em branco e não o texto nunca lido', () => {
        // Nenhuma leitura de Mar alto respondeu Mostraria; Carta não respondeu nada.
        assert.deepEqual(titulos(lista(dados(), 'sem-resposta')), ['Carta']);
        // Por corações: Mar alto (3) vem antes de Carta (sem classificação).
        assert.deepEqual(titulos(lista(dados(), 'todos', 'sem-resposta')), ['Mar alto', 'Carta']);
        const d = dados();
        d.leituras = [];
        assert.deepEqual(lista(d, 'sem-resposta'), []);
        assert.deepEqual(lista(d, 'sim'), []);
    });

    it('os dois filtros se combinam entre si', () => {
        assert.deepEqual(titulos(lista(dados(), 'nao', 'talvez')), ['Árvore']);
        assert.deepEqual(titulos(lista(dados(), 'sim', 'talvez')), []);
        assert.deepEqual(titulos(lista(dados(), 'sim', 'sem-resposta')), ['Mar alto']);
    });

    it('combina com Tipo, Leitura, Classificação e busca', () => {
        const d = dados();
        const l = (...a) => listarTextosParaLeitura(d, ...a);
        assert.deepEqual(
            titulos(l('', 'todos', 'todos', 'prosa', 'todos', 'todos', 'sem-resposta')),
            ['Carta'],
        );
        assert.deepEqual(
            titulos(l('', 'todos', 'classificados', 'todos', 'todos', 'todos', 'sim')),
            ['Mar alto'],
        );
        assert.deepEqual(
            titulos(l('arv', 'avaliados', 'todos', 'todos', 'todos', 'todos', 'nao')),
            ['Árvore'],
        );
        assert.deepEqual(titulos(l('arv', 'todos', 'todos', 'todos', 'todos', 'todos', 'sim')), []);
    });

    it('com o filtro ligado, a lista vem por corações (maior primeiro) e por título', () => {
        const d = dados();
        d.poemas[0].autoclassificacao = 2;
        d.poemas[1].autoclassificacao = 4;
        d.prosas[0].autoclassificacao = 4;
        d.leituras = d.leituras.map((x) => ({ ...x, mostraria: 'sim' }));
        assert.deepEqual(titulos(lista(d, 'todos', 'sim')), ['Carta', 'Mar alto', 'Árvore']);
    });

    it('cada linha traz a resposta da leitura mais recente, ou null', () => {
        const l = lista(dados(), 'todos', 'todos');
        const por = Object.fromEntries(l.map((t) => [t.titulo, t]));
        assert.equal(por['Árvore'].releriaResposta, 'nao');
        assert.equal(por['Árvore'].mostrariaResposta, 'talvez');
        assert.equal(por['Mar alto'].releriaResposta, 'sim');
        assert.equal(por['Mar alto'].mostrariaResposta, null);
        assert.equal(por['Carta'].releriaResposta, null);
    });

    it('valor desconhecido vale como Todos', () => {
        assert.deepEqual(titulos(lista(dados(), 'xx', 'yy')), ['Árvore', 'Carta', 'Mar alto']);
    });
});
