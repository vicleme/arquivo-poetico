import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    FAIXAS,
    MINIMO_PARA_PADRAO,
    faixaDe,
    leiturasParaPadrao,
    calcularPadrao,
    coracoesDoTexto,
} from '../js/leitura-avaliativa-padrao.js';
import { ITENS_PEGOU } from '../js/leitura-avaliativa.js';

let seq = 0;
const leitura = (extra = {}) => ({
    id: ++seq,
    textoId: seq,
    tipo: 'poema',
    data: '2026-11-01',
    pegou: [],
    incomodou: [],
    releria: null,
    mostraria: null,
    sugerido: null,
    escolhido: 4,
    ...extra,
});

const item = (padrao, faixa, id) =>
    padrao.faixas.find((f) => f.id === faixa).pegou.find((p) => p.item === id);

describe('faixas', () => {
    it('cortam em 2, 3,5 e 4 e cobrem 0,5 a 5', () => {
        assert.equal(faixaDe(0.5), 'baixa');
        assert.equal(faixaDe(2), 'baixa');
        assert.equal(faixaDe(2.5), 'media');
        assert.equal(faixaDe(3.5), 'media');
        assert.equal(faixaDe(4), 'alta');
        assert.equal(faixaDe(5), 'alta');
        assert.equal(faixaDe(0), null);
        assert.equal(faixaDe(null), null);
        assert.equal(faixaDe(5.5), null);
        assert.equal(FAIXAS.length, 3);
    });
});

describe('uma leitura por texto', () => {
    it('fica a mais recente; poema e prosa de mesmo id são textos diferentes', () => {
        const lista = leiturasParaPadrao([
            leitura({ textoId: 1, data: '2026-10-01', escolhido: 1 }),
            leitura({ textoId: 1, data: '2026-11-01', escolhido: 5 }),
            leitura({ textoId: 1, tipo: 'prosa', escolhido: 3 }),
        ]);
        assert.equal(lista.length, 2);
        assert.equal(lista.find((l) => l.tipo === 'poema').escolhido, 5);
    });

    it('filtra por tipo e ignora leitura sem texto', () => {
        const base = [leitura(), leitura({ tipo: 'prosa' }), leitura({ textoId: null })];
        assert.equal(leiturasParaPadrao(base).length, 2);
        assert.equal(leiturasParaPadrao(base, { tipo: 'prosa' }).length, 1);
        assert.equal(leiturasParaPadrao(null).length, 0);
    });
});

describe('ponderado por faixa', () => {
    it('soma os pesos e divide pelo nº de leituras da faixa (quem não marcou conta 0)', () => {
        const p = calcularPadrao([
            leitura({ escolhido: 5, pegou: [{ item: 'voz', peso: 'centro' }] }),
            leitura({ escolhido: 4, pegou: [{ item: 'voz', peso: 'leve' }] }),
            leitura({ escolhido: 4.5, pegou: [] }),
            leitura({ escolhido: 1, pegou: [{ item: 'voz', peso: 'forte' }] }),
        ]);
        const voz = item(p, 'alta', 'voz');
        assert.equal(voz.marcaram, 2);
        assert.equal(voz.ponderado, 1.33); // (3 + 1 + 0) / 3
        assert.equal(voz.mediaPeso, 2); // (3 + 1) / 2
        assert.equal(item(p, 'baixa', 'voz').ponderado, 2);
        assert.equal(item(p, 'media', 'voz').ponderado, 0);
        assert.equal(p.faixas.find((f) => f.id === 'alta').n, 3);
    });

    it('conta o que incomodou e as respostas por faixa', () => {
        const p = calcularPadrao([
            leitura({
                escolhido: 1,
                incomodou: ['cliche', 'frouxo'],
                releria: 'nao',
                mostraria: 'talvez',
            }),
            leitura({ escolhido: 2, incomodou: ['cliche'], releria: 'sim' }),
        ]);
        const baixa = p.faixas.find((f) => f.id === 'baixa');
        assert.equal(baixa.incomodou.find((i) => i.item === 'cliche').marcaram, 2);
        assert.equal(baixa.incomodou.find((i) => i.item === 'frouxo').marcaram, 1);
        assert.deepEqual(baixa.releria, { total: 2, sim: 1, talvez: 0, nao: 1 });
        assert.deepEqual(baixa.mostraria, { total: 1, sim: 0, talvez: 1, nao: 0 });
    });
});

describe('leitura sem corações escolhidos', () => {
    it('não entra nas faixas, mas é contada à parte', () => {
        const p = calcularPadrao([leitura({ escolhido: null }), leitura({ escolhido: 4 })]);
        assert.equal(p.totalTextos, 2);
        assert.equal(p.totalComCoracoes, 1);
        assert.equal(p.semCoracoes, 1);
    });

    it('avisa que são poucas leituras abaixo do mínimo', () => {
        assert.equal(calcularPadrao([]).poucos, true);
        const muitas = Array.from({ length: MINIMO_PARA_PADRAO }, () => leitura());
        assert.equal(calcularPadrao(muitas).poucos, false);
    });
});

describe('contraste entre alta e baixa', () => {
    it('só existe com as duas faixas e vem do maior para o menor', () => {
        const so = calcularPadrao([leitura({ escolhido: 5 })]);
        assert.deepEqual(so.contraste, []);
        const p = calcularPadrao([
            leitura({ escolhido: 5, pegou: [{ item: 'voz', peso: 'centro' }] }),
            leitura({
                escolhido: 1,
                pegou: [
                    { item: 'voz', peso: 'leve' },
                    { item: 'imagem', peso: 'forte' },
                ],
            }),
        ]);
        assert.equal(p.contraste.length, ITENS_PEGOU.length);
        assert.deepEqual(p.contraste[0], { item: 'voz', rotulo: 'Voz', diferenca: 2 });
        assert.equal(p.contraste.at(-1).item, 'imagem');
        assert.equal(p.contraste.at(-1).diferenca, -2);
    });
});

describe('divergências', () => {
    it('lista só as que diferem, as maiores primeiro, e resume', () => {
        const p = calcularPadrao([
            leitura({ sugerido: 3, escolhido: 4 }),
            leitura({ sugerido: 4, escolhido: 4 }),
            leitura({ sugerido: 4.5, escolhido: 2.5 }),
            leitura({ sugerido: null, escolhido: 3 }),
        ]);
        const d = p.divergencias;
        assert.equal(d.total, 2);
        assert.equal(d.acima, 1);
        assert.equal(d.abaixo, 1);
        assert.equal(d.mediaDiferenca, -0.5);
        assert.equal(d.linhas[0].diferenca, -2);
        assert.equal(d.linhas[1].diferenca, 1);
    });

    it('sem divergência, zeros', () => {
        const d = calcularPadrao([leitura({ sugerido: 4, escolhido: 4 })]).divergencias;
        assert.deepEqual(
            { total: d.total, media: d.mediaDiferenca, linhas: d.linhas.length },
            { total: 0, media: 0, linhas: 0 },
        );
    });
});

describe('faixa pela Classificação atual do texto (F22-D19)', () => {
    it('coracoesDoTexto: Classificação, depois escolhido, depois nada', () => {
        const l = { tipo: 'poema', textoId: 7, escolhido: 2 };
        assert.equal(
            coracoesDoTexto(l, () => 4.5),
            4.5,
        );
        assert.equal(
            coracoesDoTexto(l, () => 0),
            2,
        );
        assert.equal(
            coracoesDoTexto(l, () => undefined),
            2,
        );
        assert.equal(coracoesDoTexto(l), 2);
        assert.equal(
            coracoesDoTexto({ ...l, escolhido: null }, () => 0),
            null,
        );
    });

    it('reler sem escolher corações não tira o texto da faixa', () => {
        const l = leitura({
            textoId: 1,
            escolhido: null,
            pegou: [{ item: 'voz', peso: 'centro' }],
        });
        const p = calcularPadrao([l], { classificacaoDe: () => 5 });
        assert.equal(p.semCoracoes, 0);
        assert.equal(p.faixas.find((f) => f.id === 'alta').n, 1);
        assert.equal(item(p, 'alta', 'voz').ponderado, 3);
    });

    it('mudar a Classificação do texto muda a faixa dele', () => {
        const l = leitura({ textoId: 1, escolhido: 5 });
        const p = calcularPadrao([l], { classificacaoDe: () => 1 });
        assert.equal(p.faixas.find((f) => f.id === 'baixa').n, 1);
        assert.equal(p.faixas.find((f) => f.id === 'alta').n, 0);
    });

    it('sem Classificação nem escolhido, o texto fica de fora', () => {
        const p = calcularPadrao([leitura({ escolhido: null })], { classificacaoDe: () => 0 });
        assert.equal(p.semCoracoes, 1);
    });
});
