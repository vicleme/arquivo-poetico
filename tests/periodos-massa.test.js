import './helpers/localstorage-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    TIPOS_PERIODO_MASSA,
    rotuloTipoPeriodoMassa,
    nomesCadastroPeriodoMassa,
    planejarAplicacaoPeriodo,
    aplicarPlanoPeriodo,
    planejarRemocaoPeriodo,
    aplicarRemocaoPeriodo,
} from '../js/periodos-massa.js';

function montarBase() {
    db.autores = [
        { id: 1, nome: 'Autor Um' },
        { id: 2, nome: 'Autor Dois' },
    ];
    db.epocas = [
        { id: 100, nome: 'Juventude', autorId: 1 },
        { id: 101, nome: 'Juventude', autorId: 2 },
        { id: 102, nome: 'Luto', autorId: 1 },
    ];
    db.periodosHistoricos = [
        { id: 200, nome: 'Ditadura' },
        { id: 201, nome: 'Redemocratização' },
    ];
    db.movimentosEscolas = [
        { id: 300, nome: 'Simbolismo' },
        { id: 301, nome: 'Modernismo' },
    ];
    db.poemas = [];
    db.prosas = [];
}

const texto = (id, extra = {}) => ({ id, titulo: `T${id}`, autoria: [{ autorId: 1 }], ...extra });

describe('periodos-massa: cadastro', () => {
    beforeEach(montarBase);

    it('tem os três tipos, com rótulo', () => {
        assert.deepEqual(
            TIPOS_PERIODO_MASSA.map((t) => t.chave),
            ['movimento', 'epoca', 'periodoHistorico'],
        );
        assert.equal(rotuloTipoPeriodoMassa('epoca'), 'Período Biográfico');
    });

    it('nomes pro autocompletar: sem repetição e ordenados', () => {
        assert.deepEqual(nomesCadastroPeriodoMassa('epoca'), ['Juventude', 'Luto']);
        assert.deepEqual(nomesCadastroPeriodoMassa('movimento'), ['Modernismo', 'Simbolismo']);
        assert.deepEqual(nomesCadastroPeriodoMassa('periodoHistorico'), [
            'Ditadura',
            'Redemocratização',
        ]);
    });
});

describe('Movimento/Escola (lista, aditivo)', () => {
    beforeEach(montarBase);

    it('acrescenta sem tirar os que já existem', () => {
        const a = texto(1, { movimentosEscolasIds: [301] });
        const plano = planejarAplicacaoPeriodo('movimento', [a], 'Simbolismo');
        assert.equal(plano.alterar.length, 1);
        aplicarPlanoPeriodo('movimento', plano, 'Simbolismo');
        assert.deepEqual(a.movimentosEscolasIds, [301, 300]);
    });

    it('quem já tem o movimento conta como jaIguais e não duplica', () => {
        const a = texto(1, { movimentosEscolasIds: [300] });
        const b = texto(2);
        const plano = planejarAplicacaoPeriodo('movimento', [a, b], 'Simbolismo');
        assert.equal(plano.jaIguais, 1);
        assert.equal(plano.alterar.length, 1);
        aplicarPlanoPeriodo('movimento', plano, 'Simbolismo');
        assert.deepEqual(a.movimentosEscolasIds, [300]);
        assert.deepEqual(b.movimentosEscolasIds, [300]);
    });

    it('item sem o campo (dado antigo) ganha a lista', () => {
        const a = texto(1);
        delete a.movimentosEscolasIds;
        aplicarPlanoPeriodo(
            'movimento',
            planejarAplicacaoPeriodo('movimento', [a], 'Simbolismo'),
            'Simbolismo',
        );
        assert.deepEqual(a.movimentosEscolasIds, [300]);
    });

    it('nome novo cria o cadastro uma vez só e avisa no plano', () => {
        const itens = [texto(1), texto(2), texto(3)];
        const plano = planejarAplicacaoPeriodo('movimento', itens, 'Parnasianismo');
        assert.equal(plano.cadastroNovo, true);
        assert.equal(db.movimentosEscolas.length, 2, 'planejar não cria nada');
        aplicarPlanoPeriodo('movimento', plano, 'Parnasianismo');
        assert.equal(db.movimentosEscolas.length, 3);
        const novo = db.movimentosEscolas.find((m) => m.nome === 'Parnasianismo');
        itens.forEach((i) => assert.deepEqual(i.movimentosEscolasIds, [novo.id]));
    });

    it('remover tira só aquele movimento e ignora quem não tinha', () => {
        const a = texto(1, { movimentosEscolasIds: [300, 301] });
        const b = texto(2, { movimentosEscolasIds: [301] });
        const plano = planejarRemocaoPeriodo('movimento', [a, b], 'Simbolismo');
        assert.equal(plano.alterar.length, 1);
        assert.equal(plano.naoTinham, 1);
        aplicarRemocaoPeriodo('movimento', plano, 'Simbolismo');
        assert.deepEqual(a.movimentosEscolasIds, [301]);
        assert.deepEqual(b.movimentosEscolasIds, [301]);
    });

    it('remover um nome que não existe no cadastro não faz nada nem cria', () => {
        const a = texto(1, { movimentosEscolasIds: [300] });
        const plano = planejarRemocaoPeriodo('movimento', [a], 'Inexistente');
        assert.equal(plano.alterar.length, 0);
        assert.equal(aplicarRemocaoPeriodo('movimento', plano, 'Inexistente'), 0);
        assert.equal(db.movimentosEscolas.length, 2);
    });

    it('nome vazio não planeja nada', () => {
        const plano = planejarAplicacaoPeriodo('movimento', [texto(1)], '   ');
        assert.equal(plano.alterar.length, 0);
    });
});

describe('Período Histórico (lista de períodos por texto)', () => {
    beforeEach(montarBase);

    it('aplicar acrescenta o período e mantém os que o texto já tinha', () => {
        const vazio = texto(1);
        const outro = texto(2, { periodosHistoricosIds: [201] });
        const plano = planejarAplicacaoPeriodo('periodoHistorico', [vazio, outro], 'Ditadura');
        assert.equal(plano.alterar.length, 2);
        assert.equal(plano.jaPreenchidos, 0);
        aplicarPlanoPeriodo('periodoHistorico', plano, 'Ditadura');
        assert.deepEqual(vazio.periodosHistoricosIds, [200]);
        assert.deepEqual(outro.periodosHistoricosIds, [201, 200]);
    });

    it('não existe mais "sobrescrever" para Período Histórico: a opção é ignorada', () => {
        const outro = texto(2, { periodosHistoricosIds: [201] });
        const plano = planejarAplicacaoPeriodo('periodoHistorico', [outro], 'Ditadura', {
            sobrescrever: true,
        });
        aplicarPlanoPeriodo('periodoHistorico', plano, 'Ditadura');
        assert.deepEqual(outro.periodosHistoricosIds, [201, 200]);
    });

    it('já estar com o mesmo período conta como jaIguais', () => {
        const a = texto(1, { periodosHistoricosIds: [200, 201] });
        const plano = planejarAplicacaoPeriodo('periodoHistorico', [a], 'Ditadura');
        assert.equal(plano.jaIguais, 1);
        assert.equal(plano.alterar.length, 0);
    });

    it('id órfão (período excluído) sai e não impede de aplicar', () => {
        const a = texto(1, { periodosHistoricosIds: [999] });
        const plano = planejarAplicacaoPeriodo('periodoHistorico', [a], 'Ditadura');
        assert.equal(plano.alterar.length, 1);
        aplicarPlanoPeriodo('periodoHistorico', plano, 'Ditadura');
        assert.deepEqual(a.periodosHistoricosIds, [200]);
    });

    it('texto no formato antigo (periodoHistoricoId) é convertido ao aplicar', () => {
        const a = texto(1, { periodoHistoricoId: 201 });
        const plano = planejarAplicacaoPeriodo('periodoHistorico', [a], 'Ditadura');
        aplicarPlanoPeriodo('periodoHistorico', plano, 'Ditadura');
        assert.deepEqual(a.periodosHistoricosIds, [201, 200]);
        assert.equal('periodoHistoricoId' in a, false);
    });

    it('remover tira só aquele id, de quem tem, e mantém os outros', () => {
        const a = texto(1, { periodosHistoricosIds: [200, 201] });
        const b = texto(2, { periodosHistoricosIds: [201] });
        const plano = planejarRemocaoPeriodo('periodoHistorico', [a, b], 'Ditadura');
        assert.equal(plano.alterar.length, 1);
        assert.equal(plano.naoTinham, 1);
        aplicarRemocaoPeriodo('periodoHistorico', plano, 'Ditadura');
        assert.deepEqual(a.periodosHistoricosIds, [201]);
        assert.deepEqual(b.periodosHistoricosIds, [201]);
    });

    it('remover o único período deixa a lista vazia', () => {
        const a = texto(1, { periodosHistoricosIds: [200] });
        const plano = planejarRemocaoPeriodo('periodoHistorico', [a], 'Ditadura');
        aplicarRemocaoPeriodo('periodoHistorico', plano, 'Ditadura');
        assert.deepEqual(a.periodosHistoricosIds, []);
    });
});

describe('Período Biográfico (Época pertence ao Autor)', () => {
    beforeEach(montarBase);

    it('usa a Época do Autor do texto, não a homônima de outro Autor', () => {
        const doUm = texto(1);
        const doDois = texto(2, { autoria: [{ autorId: 2 }] });
        const plano = planejarAplicacaoPeriodo('epoca', [doUm, doDois], 'Juventude');
        aplicarPlanoPeriodo('epoca', plano, 'Juventude');
        assert.equal(doUm.epocaRetratada.epocaId, 100);
        assert.equal(doDois.epocaRetratada.epocaId, 101);
        assert.equal(db.epocas.length, 3, 'nenhuma Época nova');
    });

    it('cria a Época pro primeiro Autor quando ele ainda não tem uma com esse nome', () => {
        const a = texto(1, { autoria: [{ autorId: 2 }, { autorId: 1 }] });
        const plano = planejarAplicacaoPeriodo('epoca', [a], 'Exílio');
        assert.equal(plano.cadastroNovo, true);
        aplicarPlanoPeriodo('epoca', plano, 'Exílio');
        const nova = db.epocas.find((e) => e.nome === 'Exílio');
        assert.equal(nova.autorId, 2);
        assert.equal(a.epocaRetratada.epocaId, nova.id);
    });

    it('vários textos do mesmo Autor compartilham a Época criada', () => {
        const a = texto(1);
        const b = texto(2);
        // Mesmo lote: o segundo texto não pode criar uma segunda "Exílio".
        aplicarPlanoPeriodo('epoca', planejarAplicacaoPeriodo('epoca', [a, b], 'Exílio'), 'Exílio');
        assert.equal(db.epocas.filter((e) => e.nome === 'Exílio').length, 1);
        assert.equal(a.epocaRetratada.epocaId, b.epocaRetratada.epocaId);
    });

    it('conta quantas Épocas novas o lote criaria (uma por Autor)', () => {
        const itens = [texto(1), texto(2), texto(3, { autoria: [{ autorId: 2 }] })];
        assert.equal(planejarAplicacaoPeriodo('epoca', itens, 'Exílio').epocasACriar, 2);
        assert.equal(planejarAplicacaoPeriodo('epoca', itens, 'Juventude').epocasACriar, 0);
    });

    it('texto sem Autor é pulado e contado', () => {
        const a = texto(1, { autoria: [] });
        const b = texto(2, { autoria: [{ autorId: 999 }] });
        const plano = planejarAplicacaoPeriodo('epoca', [a, b], 'Luto');
        assert.equal(plano.semAutor, 2);
        assert.equal(plano.alterar.length, 0);
    });

    it('preserva datas, recorte e N/A que o texto já tinha', () => {
        const a = texto(1, {
            epocaRetratada: {
                epocaId: null,
                inicio: { ano: 2001 },
                fim: { ano: 2003 },
                recorte: 'momento',
                na: false,
            },
        });
        aplicarPlanoPeriodo('epoca', planejarAplicacaoPeriodo('epoca', [a], 'Luto'), 'Luto');
        assert.deepEqual(a.epocaRetratada, {
            epocaId: 102,
            inicio: { ano: 2001 },
            fim: { ano: 2003 },
            recorte: 'momento',
            na: false,
        });
    });

    it('texto sem epocaRetratada ganha o objeto com defaults', () => {
        const a = texto(1);
        aplicarPlanoPeriodo('epoca', planejarAplicacaoPeriodo('epoca', [a], 'Luto'), 'Luto');
        assert.deepEqual(a.epocaRetratada, {
            inicio: null,
            fim: null,
            recorte: null,
            na: false,
            epocaId: 102,
        });
    });

    it('mantém outra Época já definida, a menos que sobrescrever', () => {
        const a = texto(1, { epocaRetratada: { epocaId: 100 } });
        const mantido = planejarAplicacaoPeriodo('epoca', [a], 'Luto');
        assert.equal(mantido.jaPreenchidos, 1);
        assert.equal(mantido.alterar.length, 0);
        const troca = planejarAplicacaoPeriodo('epoca', [a], 'Luto', { sobrescrever: true });
        aplicarPlanoPeriodo('epoca', troca, 'Luto');
        assert.equal(a.epocaRetratada.epocaId, 102);
    });

    it('já estar com a mesma Época conta como jaIguais', () => {
        const a = texto(1, { epocaRetratada: { epocaId: 102 } });
        const plano = planejarAplicacaoPeriodo('epoca', [a], 'Luto');
        assert.equal(plano.jaIguais, 1);
    });

    it('remover: sem N/A nem datas, epocaRetratada volta a null', () => {
        const a = texto(1, {
            epocaRetratada: {
                epocaId: 102,
                inicio: null,
                fim: null,
                recorte: 'momento',
                na: false,
            },
        });
        const plano = planejarRemocaoPeriodo('epoca', [a], 'Luto');
        aplicarRemocaoPeriodo('epoca', plano, 'Luto');
        assert.equal(a.epocaRetratada, null);
    });

    it('remover: com datas, só desvincula a Época e guarda o resto', () => {
        const a = texto(1, {
            epocaRetratada: {
                epocaId: 102,
                inicio: { ano: 2001 },
                fim: null,
                recorte: null,
                na: false,
            },
        });
        aplicarRemocaoPeriodo('epoca', planejarRemocaoPeriodo('epoca', [a], 'Luto'), 'Luto');
        assert.equal(a.epocaRetratada.epocaId, null);
        assert.deepEqual(a.epocaRetratada.inicio, { ano: 2001 });
    });

    it('remover não toca em texto com outra Época', () => {
        const a = texto(1, { epocaRetratada: { epocaId: 100 } });
        const plano = planejarRemocaoPeriodo('epoca', [a], 'Luto');
        assert.equal(plano.alterar.length, 0);
        assert.equal(plano.naoTinham, 1);
    });
});

describe('periodos-massa: tipo inválido', () => {
    beforeEach(montarBase);
    it('planejar com tipo desconhecido lança erro claro', () => {
        assert.throws(() => planejarAplicacaoPeriodo('xyz', [texto(1)], 'A'), /Tipo desconhecido/);
    });
});
