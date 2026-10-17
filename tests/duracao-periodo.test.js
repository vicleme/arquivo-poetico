import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { duracaoDoIntervalo, comDuracao, hojeNoFuso } from '../js/utils.js';
import {
    FUSO_PADRAO,
    fusoValido,
    getFusoHorario,
    setFusoHorario,
    hojeDoUsuario,
    opcoesDuracao,
} from '../js/fuso-horario.js';
import { renderVisualizacaoPeriodoHistoricoHtml } from '../js/visualizar-periodo-historico.js';
import { renderVisualizacaoMovimentoEscolaHtml } from '../js/visualizar-movimento-escola.js';

const A = (ano) => ({ ano });
const M = (ano, mes) => ({ ano, mes });
const D = (ano, mes, dia) => ({ ano, mes, dia });

describe('duracaoDoIntervalo', () => {
    it('anos viram séculos, décadas e anos, só a maior unidade e a seguinte', () => {
        assert.equal(duracaoDoIntervalo(A(1914), A(1918)), '4 anos');
        assert.equal(duracaoDoIntervalo(A(1920), A(1930)), '1 década');
        assert.equal(duracaoDoIntervalo(A(1822), A(1889)), '6 décadas e 7 anos');
        assert.equal(duracaoDoIntervalo(A(1900), A(2000)), '1 século');
        assert.equal(duracaoDoIntervalo(A(1900), A(2025)), '1 século e 2 décadas');
    });

    it('unidade seguinte zerada não entra, mesmo havendo outras menores', () => {
        // 1 século e 5 anos: décadas é zero, então só "1 século".
        assert.equal(duracaoDoIntervalo(A(1900), A(2005)), '1 século');
    });

    it('com dia e mês, mostra só o par (anos e meses), sem os dias', () => {
        assert.equal(duracaoDoIntervalo(D(2020, 1, 1), D(2021, 4, 10)), '1 ano e 3 meses');
        assert.equal(duracaoDoIntervalo(D(2020, 1, 1), D(2021, 1, 6)), '1 ano');
        assert.equal(duracaoDoIntervalo(D(2020, 3, 15), D(2020, 3, 20)), '5 dias');
        assert.equal(duracaoDoIntervalo(D(2019, 12, 31), D(2020, 1, 1)), '1 dia');
    });

    it('usa a menor precisão que as duas pontas têm em comum', () => {
        assert.equal(duracaoDoIntervalo(M(2020, 5), M(2022, 8)), '2 anos e 3 meses');
        assert.equal(duracaoDoIntervalo(A(2020), D(2022, 8, 3)), '2 anos');
        assert.equal(duracaoDoIntervalo(M(2020, 5), D(2020, 8, 30)), '3 meses');
    });

    it('século e década (Correntes literárias)', () => {
        assert.equal(duracaoDoIntervalo({ seculo: 'XV' }, { seculo: 'XX' }), '5 séculos');
        assert.equal(duracaoDoIntervalo({ decada: 1920 }, { decada: 1950 }), '3 décadas');
        assert.equal(duracaoDoIntervalo({ decada: 1920 }, { decada: 1990 }), '7 décadas');
        assert.equal(duracaoDoIntervalo({ decada: 1900 }, { decada: 2010 }), '1 século e 1 década');
        assert.equal(duracaoDoIntervalo({ seculo: 'XVIII' }, A(1850)), '1 século');
    });

    it('sem as duas pontas, igual ou invertido, não há duração', () => {
        assert.equal(duracaoDoIntervalo(A(2000), null), '');
        assert.equal(duracaoDoIntervalo(null, A(2000)), '');
        assert.equal(duracaoDoIntervalo({}, {}), '');
        assert.equal(duracaoDoIntervalo(D(2020, 1, 1), D(2020, 1, 1)), '');
        assert.equal(duracaoDoIntervalo(A(2000), A(1990)), '');
        assert.equal(duracaoDoIntervalo(D(2021, 1, 1), D(2020, 1, 1)), '');
    });

    it('31/01 a 01/03 não gera dias negativos', () => {
        assert.equal(duracaoDoIntervalo(D(2020, 1, 31), D(2020, 3, 1)), '1 mês');
    });
});

describe('comDuracao', () => {
    it('acrescenta a duração entre parênteses; sem intervalo ou sem duração volta igual', () => {
        assert.equal(comDuracao('1914 – 1918', A(1914), A(1918)), '1914 – 1918 (4 anos)');
        assert.equal(comDuracao('—', null, null), '—');
        assert.equal(comDuracao('A partir de 1914', A(1914), null), 'A partir de 1914');
    });
});

describe('modais Ver mostram a duração na linha Período', () => {
    it('Período Histórico', () => {
        const html = renderVisualizacaoPeriodoHistoricoHtml({
            nome: 'X',
            inicio: A(1964),
            fim: A(1985),
        });
        assert.match(html, /1964 – 1985 \(2 décadas e 1 ano\)/);
    });

    it('Corrente literária, com séculos', () => {
        const html = renderVisualizacaoMovimentoEscolaHtml({
            nome: 'X',
            inicio: { seculo: 'XVIII' },
            fim: { seculo: 'XIX' },
        });
        assert.match(html, /séc\. XVIII – séc\. XIX \(1 século\)/);
    });
});

describe('hojeNoFuso', () => {
    // 16/10/2026 02:30 UTC: ainda é 15/10 em Brasília (UTC-3), já é 16/10 em Tóquio.
    const instante = new Date('2026-10-16T02:30:00Z');

    it('devolve a data de hoje no fuso pedido', () => {
        assert.deepEqual(hojeNoFuso('America/Sao_Paulo', instante), {
            ano: 2026,
            mes: 10,
            dia: 15,
        });
        assert.deepEqual(hojeNoFuso('Asia/Tokyo', instante), { ano: 2026, mes: 10, dia: 16 });
    });

    it('fuso inválido cai no horário do aparelho, sem quebrar', () => {
        const h = hojeNoFuso('Nada/Existe', instante);
        assert.equal(typeof h.ano, 'number');
        assert.ok(h.mes >= 1 && h.mes <= 12);
    });
});

describe('fuso global', () => {
    it('padrão é Brasília; troca, valida e volta ao padrão', () => {
        localStorage.removeItem('arquivoPoetico_fusoHorario');
        assert.equal(getFusoHorario(), FUSO_PADRAO);
        assert.equal(FUSO_PADRAO, 'America/Sao_Paulo');

        setFusoHorario('Asia/Tokyo');
        assert.equal(getFusoHorario(), 'Asia/Tokyo');
        const instante = new Date('2026-10-16T02:30:00Z');
        assert.equal(hojeDoUsuario(instante).dia, 16);

        setFusoHorario('Lixo/Invalido');
        assert.equal(getFusoHorario(), FUSO_PADRAO);
        assert.equal(fusoValido('Lixo/Invalido'), false);
        assert.equal(hojeDoUsuario(instante).dia, 15);
    });

    it('opcoesDuracao lê a marca do registro', () => {
        assert.equal(opcoesDuracao({ emAndamento: true }).emAndamento, true);
        assert.equal(opcoesDuracao({}).emAndamento, false);
        assert.equal(opcoesDuracao(null).emAndamento, false);
    });

    it('opcoesDuracao: em aberto só vale junto com em andamento', () => {
        assert.equal(opcoesDuracao({ emAndamento: true, emAberto: true }).emAberto, true);
        assert.equal(opcoesDuracao({ emAndamento: true }).emAberto, false);
        assert.equal(opcoesDuracao({ emAberto: true }).emAberto, false);
    });
});

describe('em andamento', () => {
    const hoje = { ano: 2026, mes: 10, dia: 15 };

    it('sem fim, conta até hoje e marca "em andamento"', () => {
        assert.equal(
            comDuracao('A partir de 2024', A(2024), null, { emAndamento: true, hoje }),
            'A partir de 2024 (2 anos, em andamento)',
        );
        assert.equal(
            comDuracao('A partir de 01/03/2024', D(2024, 3, 1), null, { emAndamento: true, hoje }),
            'A partir de 01/03/2024 (2 anos e 7 meses, em andamento)',
        );
        assert.equal(
            comDuracao('A partir de séc. XIX', { seculo: 'XIX' }, null, {
                emAndamento: true,
                hoje,
            }),
            'A partir de séc. XIX (2 séculos, em andamento)',
        );
    });

    it('em aberto: mesma conta, outra palavra', () => {
        assert.equal(
            comDuracao('A partir de 01/03/2024', D(2024, 3, 1), null, {
                emAndamento: true,
                emAberto: true,
                hoje,
            }),
            'A partir de 01/03/2024 (2 anos e 7 meses, em aberto)',
        );
        assert.equal(
            comDuracao('A partir de 15/10/2026', D(2026, 10, 15), null, {
                emAndamento: true,
                emAberto: true,
                hoje,
            }),
            'A partir de 15/10/2026 (em aberto)',
        );
    });

    it('em aberto sem a marca de sem fim não faz nada', () => {
        assert.equal(
            comDuracao('A partir de 2024', A(2024), null, { emAberto: true, hoje }),
            'A partir de 2024',
        );
    });

    it('começou hoje ou no futuro: só "em andamento"', () => {
        assert.equal(
            comDuracao('A partir de 15/10/2026', D(2026, 10, 15), null, {
                emAndamento: true,
                hoje,
            }),
            'A partir de 15/10/2026 (em andamento)',
        );
    });

    it('com fim preenchido a marca não vale', () => {
        assert.equal(
            comDuracao('2020 – 2022', A(2020), A(2022), { emAndamento: true, hoje }),
            '2020 – 2022 (2 anos)',
        );
    });

    it('sem a marca, período sem fim continua sem duração', () => {
        assert.equal(comDuracao('A partir de 2024', A(2024), null, { hoje }), 'A partir de 2024');
    });

    it('o modal Ver mostra a marca', () => {
        const html = renderVisualizacaoPeriodoHistoricoHtml({
            nome: 'X',
            inicio: A(2000),
            emAndamento: true,
        });
        assert.match(html, /A partir de 2000 \(.*em andamento\)/);
    });

    it('o modal Ver mostra "em aberto" quando é o rótulo escolhido', () => {
        const html = renderVisualizacaoPeriodoHistoricoHtml({
            nome: 'X',
            inicio: A(2000),
            emAndamento: true,
            emAberto: true,
        });
        assert.match(html, /A partir de 2000 \(.*em aberto\)/);
        assert.doesNotMatch(html, /em andamento/);
    });
});
