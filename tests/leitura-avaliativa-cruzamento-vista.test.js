import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    LIMITE_COLUNA_PEQUENA,
    VISTAS_LEITURAS,
    celulaParaTela,
    colunasPequenas,
    nivelDeCor,
    normalizarCategoria,
    normalizarMedida,
    normalizarVista,
    opcoesDeCategoria,
    opcoesDeMedida,
    tabelaParaTela,
    textoDaMedida,
    textoDasColunasEspeciais,
    textoDoAvisoCruzamento,
} from '../js/leitura-avaliativa-cruzamento-vista.js';
import { calcularCruzamento } from '../js/leitura-avaliativa-cruzamento.js';
import { MINIMO_PARA_PADRAO } from '../js/leitura-avaliativa-padrao.js';
import { garantirEtiqueta } from '../js/etiquetas.js';
import { atribuirEtiquetasAoCluster, criarCluster } from '../js/tag-clusters.js';

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

// Tom com um cluster (Sombrio) e uma etiqueta solta (Irônico).
function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    const melan = garantirEtiqueta(dbRef, 'tom', 'Melancólico');
    const ironico = garantirEtiqueta(dbRef, 'tom', 'Irônico');
    const sombrio = criarCluster(dbRef, 'Sombrio', 'tom').cluster;
    atribuirEtiquetasAoCluster(dbRef, [melan], sombrio.id);
    return { dbRef, melan, ironico };
}

const poema = (dbRef, id, tom = []) => {
    dbRef.poemas.push({ id, sinalizacoesTom: tom });
    return id;
};

describe('seletores', () => {
    it('as duas vistas são Padrão e Cruzamento com etiquetas', () => {
        assert.deepEqual(
            VISTAS_LEITURAS.map((v) => v.rotulo),
            ['Padrão', 'Cruzamento com etiquetas'],
        );
    });

    it('valor desconhecido volta ao primeiro da lista', () => {
        assert.equal(normalizarVista('x'), 'padrao');
        assert.equal(normalizarVista('cruzamento'), 'cruzamento');
        assert.equal(normalizarCategoria('sensibilidade'), 'tom');
        assert.equal(normalizarCategoria('tradicao'), 'tradicao');
        assert.equal(normalizarMedida('x'), 'pegou');
        assert.equal(normalizarMedida('incomodou'), 'incomodou');
    });

    it('as opções seguem Tom, Estilo, Domínio Imagético e Tradição e Pegou, Incomodou', () => {
        assert.deepEqual(
            opcoesDeCategoria().map((o) => o.rotulo),
            ['Tom', 'Estilo', 'Domínio Imagético', 'Tradição'],
        );
        assert.deepEqual(
            opcoesDeMedida().map((o) => o.rotulo),
            ['Pegou', 'Incomodou'],
        );
    });
});

describe('célula para a tela', () => {
    it('pegou: mostra o peso médio da coluna e o "x de n"', () => {
        const cel = { n: 3, marcaram: 2, soma: 4, ponderado: 1.33, mediaPeso: 2 };
        const t = celulaParaTela(cel, 'pegou', 'Voz', 'Sombrio');
        assert.equal(t.vazia, false);
        assert.equal(t.principal, '1,33');
        assert.equal(t.secundario, '2 de 3');
        assert.match(t.titulo, /^Voz × Sombrio: marcado em 2 de 3 textos/);
        assert.match(t.titulo, /peso médio entre os que marcaram: 2 de 3/);
    });

    it('incomodou: mostra a proporção em porcentagem e o "x de n"', () => {
        const t = celulaParaTela(
            { n: 5, marcaram: 2, proporcao: 0.4 },
            'incomodou',
            'Clichê',
            'Sombrio',
        );
        assert.equal(t.principal, '40%');
        assert.equal(t.secundario, '2 de 5');
        assert.match(t.titulo, /incomodou em 2 de 5 textos/);
    });

    it('ninguém marcou: traço, sem cor e sem número', () => {
        const t = celulaParaTela(
            { n: 4, marcaram: 0, ponderado: 0, mediaPeso: 0 },
            'pegou',
            'Voz',
            'Sombrio',
        );
        assert.equal(t.vazia, true);
        assert.equal(t.principal, '—');
        assert.equal(t.nivel, 0);
        assert.match(t.titulo, /nenhum dos 4 textos da coluna marcou/);
    });

    it('um texto só usa o singular', () => {
        const t = celulaParaTela(
            { n: 1, marcaram: 1, proporcao: 1 },
            'incomodou',
            'Clichê',
            'Sombrio',
        );
        assert.match(t.titulo, /incomodou em 1 de 1 texto\./);
    });

    it('célula ausente ou sem n é vazia e sem traço', () => {
        assert.equal(celulaParaTela(null, 'pegou').principal, '');
        assert.equal(celulaParaTela({ n: 0, marcaram: 0 }, 'pegou').vazia, true);
    });
});

describe('nível de cor', () => {
    it('vai de 1 a 4 e fica em 0 quando ninguém marcou', () => {
        assert.equal(nivelDeCor({ n: 3, marcaram: 0, ponderado: 0 }, 'pegou'), 0);
        assert.equal(nivelDeCor({ n: 3, marcaram: 1, ponderado: 0.1 }, 'pegou'), 1);
        assert.equal(nivelDeCor({ n: 3, marcaram: 3, ponderado: 1.5 }, 'pegou'), 2);
        assert.equal(nivelDeCor({ n: 3, marcaram: 3, ponderado: 3 }, 'pegou'), 4);
        assert.equal(nivelDeCor({ n: 4, marcaram: 1, proporcao: 0.25 }, 'incomodou'), 1);
        assert.equal(nivelDeCor({ n: 4, marcaram: 4, proporcao: 1 }, 'incomodou'), 4);
    });

    it('valor fora da faixa é limitado', () => {
        assert.equal(nivelDeCor({ n: 1, marcaram: 1, ponderado: 9 }, 'pegou'), 4);
        assert.equal(nivelDeCor({ n: 1, marcaram: 1, proporcao: NaN }, 'incomodou'), 1);
        assert.equal(nivelDeCor(undefined, 'pegou'), 0);
    });
});

describe('aviso do cabeçalho', () => {
    it('sem textos, diz que ainda não há leituras', () => {
        assert.match(textoDoAvisoCruzamento({ totalTextos: 0 }), /Ainda não há leituras/);
        assert.match(
            textoDoAvisoCruzamento({ totalTextos: 0 }, { nomeDoCluster: 'Sombrio' }),
            /Nenhum texto lido tem etiqueta do cluster Sombrio/,
        );
    });

    it('avisa que as colunas somam mais que o total, só quando é o caso', () => {
        const base = { totalTextos: 12, rotuloCategoria: 'Tom', poucos: false, colunas: [] };
        assert.match(
            textoDoAvisoCruzamento({ ...base, somaPassaDoTotal: true }),
            /As colunas somam mais que o total/,
        );
        assert.doesNotMatch(
            textoDoAvisoCruzamento({ ...base, somaPassaDoTotal: false }),
            /somam mais/,
        );
    });

    it('conta as colunas pequenas e avisa quando há poucos textos', () => {
        const dados = {
            totalTextos: 4,
            rotuloCategoria: 'Tom',
            poucos: true,
            somaPassaDoTotal: false,
            colunas: [
                { id: 'a', n: 1 },
                { id: 'b', n: LIMITE_COLUNA_PEQUENA },
                { id: 'c', n: 2 },
            ],
        };
        assert.equal(colunasPequenas(dados).length, 2);
        const t = textoDoAvisoCruzamento(dados);
        assert.match(t, /2 colunas têm menos de 3 textos/);
        assert.match(t, new RegExp(`o ideal é ${MINIMO_PARA_PADRAO} ou mais`));
        assert.match(t, /4 textos lidos entram no cruzamento de Tom/);
    });

    it('no detalhe do cluster, fala do cluster e usa o singular', () => {
        const t = textoDoAvisoCruzamento(
            { totalTextos: 1, rotuloCategoria: 'Tom', poucos: true, colunas: [] },
            { nomeDoCluster: 'Sombrio' },
        );
        assert.match(t, /^1 texto lido tem etiqueta do cluster Sombrio\./);
    });
});

describe('textos fixos', () => {
    it('a frase da medida muda com Pegou e Incomodou', () => {
        assert.match(textoDaMedida('pegou'), /peso médio/);
        assert.match(textoDaMedida('incomodou'), /proporção dos textos da coluna/);
        assert.equal(textoDaMedida('x'), textoDaMedida('pegou'));
    });

    it('explica "Sem cluster" e "Sem etiqueta" só quando a coluna existe', () => {
        assert.equal(textoDasColunasEspeciais({ colunas: [{ tipo: 'cluster' }] }), '');
        const t = textoDasColunasEspeciais({
            colunas: [{ tipo: 'semCluster' }, { tipo: 'semEtiqueta' }],
        });
        assert.match(t, /"Sem cluster": o texto tem etiqueta da categoria/);
        assert.match(t, /"Sem etiqueta": o texto não tem nenhuma etiqueta/);
    });
});

describe('tabela para a tela, sobre o cálculo real', () => {
    it('monta colunas com n, só o cluster abre, e uma linha por item com a célula de cada coluna', () => {
        const { dbRef, melan, ironico } = montar();
        const a = poema(dbRef, 1, [melan]);
        const b = poema(dbRef, 2, [melan, ironico]);
        const c = poema(dbRef, 3, []);
        const dados = calcularCruzamento(
            [
                leitura({ textoId: a, pegou: [{ item: 'voz', peso: 'centro' }] }),
                leitura({ textoId: b, pegou: [{ item: 'voz', peso: 'leve' }] }),
                leitura({ textoId: c }),
            ],
            dbRef,
        );
        const t = tabelaParaTela(dados);
        assert.deepEqual(
            t.colunas.map((x) => [x.rotulo, x.n, x.abrivel, x.pequena]),
            [
                ['Sombrio', 2, true, true],
                ['Sem cluster', 1, false, true],
                ['Sem etiqueta', 1, false, true],
            ],
        );
        assert.equal(t.colunas[0].rotuloComN, 'Sombrio (n = 2)');
        assert.ok(t.colunas[0].clusterId != null);
        assert.equal(t.colunas[1].clusterId, null);
        assert.equal(t.semColunas, false);

        const voz = t.linhas.find((l) => l.item === 'voz');
        assert.equal(voz.celulas.length, t.colunas.length);
        assert.equal(voz.celulas[0].principal, '2');
        assert.equal(voz.celulas[0].secundario, '2 de 2');
        assert.equal(voz.celulas[2].vazia, true);
        assert.equal(voz.total.secundario, '2 de 3');
        assert.match(voz.celulas[0].titulo, /^Voz × Sombrio:/);
    });

    it('sem leituras não há colunas', () => {
        const { dbRef } = montar();
        const t = tabelaParaTela(calcularCruzamento([], dbRef));
        assert.equal(t.semColunas, true);
        assert.deepEqual(t.colunas, []);
    });

    it('dados ausentes não quebram', () => {
        const t = tabelaParaTela(undefined);
        assert.equal(t.semColunas, true);
        assert.equal(t.medida, 'pegou');
    });
});
