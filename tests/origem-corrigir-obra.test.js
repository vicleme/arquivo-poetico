import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Campo Origem no diálogo de Corrigir obra (lógica pura e tela): ausente
// mantém, lista troca em todas, lista vazia tira a chave, e o Desfazer devolve
// cada entrada como estava (inclusive a ausência da chave).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { montarForaDoAcervo } = await import('../js/fora-do-acervo.js');
const { planejarCorrecao, aplicarPlano } = await import('../js/corrigir-fora-do-acervo.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { abrirCorrecaoObra, fecharDialogo } = await import('../js/corrigir-fora-do-acervo-ui.js');

const el = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));
const snapshotOk = async () => true;
const CHAVE = 'mito de prometeu|';

function cenario() {
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        elementos: [],
        itensColetanea: [],
        poemas: [
            {
                id: 1,
                titulo: 'Fogo',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Mitologia',
                        obra: 'Mito de Prometeu',
                        autor: '',
                        origemObra: ['Grécia'],
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Fígado',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Mitologia',
                        obra: 'Mito de Prometeu',
                        autor: '',
                        origemObra: ['Grécia', 'Roma'],
                    },
                ],
            },
        ],
        prosas: [
            {
                id: 7,
                titulo: 'Conto',
                intertextualidade: [
                    {
                        relacao: 'Menção',
                        tipoObra: 'Mitologia',
                        obra: 'Mito de Prometeu',
                        autor: '',
                    },
                ],
            },
        ],
    });
}

const entradas = () => [
    db.poemas[0].intertextualidade[0],
    db.poemas[1].intertextualidade[0],
    db.prosas[0].intertextualidade[0],
];
const pedido = (novo) => ({
    tipo: 'obra',
    alvos: [CHAVE],
    novo: { obra: 'Mito de Prometeu', ...novo },
});

describe('origem na correção de obra (lógica)', () => {
    beforeEach(cenario);

    it('o cenário usa a chave esperada', () => {
        const dados = montarForaDoAcervo({ poemas: db.poemas, prosas: db.prosas });
        assert.ok(dados.obras.some((o) => o.chave === CHAVE));
    });

    it('sem `origens` no pedido, nada muda nas origens', () => {
        const plano = planejarCorrecao(
            { poemas: db.poemas, prosas: db.prosas },
            pedido({ tipoObra: 'Mito' }),
        );
        aplicarPlano(plano);
        assert.deepEqual(entradas()[0].origemObra, ['Grécia']);
        assert.deepEqual(entradas()[1].origemObra, ['Grécia', 'Roma']);
        assert.equal('origemObra' in entradas()[2], false);
    });

    it('uma lista troca em todas e conta as sobrescritas', () => {
        const plano = planejarCorrecao(
            { poemas: db.poemas, prosas: db.prosas },
            pedido({ origens: ['Grécia Clássica'] }),
        );
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 3);
        assert.equal(plano.origensSobrescritas, 2);
        aplicarPlano(plano);
        entradas().forEach((e) => assert.deepEqual(e.origemObra, ['Grécia Clássica']));
    });

    it('lista vazia tira a chave de todas', () => {
        const plano = planejarCorrecao(
            { poemas: db.poemas, prosas: db.prosas },
            pedido({ origens: [] }),
        );
        assert.equal(plano.entradas, 2);
        aplicarPlano(plano);
        entradas().forEach((e) => assert.equal('origemObra' in e, false));
    });

    it('lista igual à que a entrada já tem não conta como mudança', () => {
        const plano = planejarCorrecao(
            { poemas: db.poemas, prosas: db.prosas },
            pedido({ origens: ['Grécia'] }),
        );
        assert.equal(plano.entradas, 2);
        assert.equal(plano.jaIguais, 1);
    });

    it('o Desfazer devolve cada entrada como estava, inclusive sem a chave', () => {
        const plano = planejarCorrecao(
            { poemas: db.poemas, prosas: db.prosas },
            pedido({ origens: ['Grécia Clássica'] }),
        );
        const feito = aplicarPlano(plano);
        feito.desfazer();
        assert.deepEqual(entradas()[0].origemObra, ['Grécia']);
        assert.deepEqual(entradas()[1].origemObra, ['Grécia', 'Roma']);
        assert.equal('origemObra' in entradas()[2], false);
    });

    it('a origem não entra na identidade: não junta nem separa obras', () => {
        const plano = planejarCorrecao(
            { poemas: db.poemas, prosas: db.prosas },
            pedido({ origens: ['Grécia Clássica'] }),
        );
        assert.equal(plano.juntaCom, 0);
    });
});

describe('campo Origem no diálogo de Corrigir obra', () => {
    const confirmar = async () => {
        const c = el('modal-confirmar-exclusao');
        c.querySelector('#btn-confirmar-exclusao, [data-confirmar], button:last-of-type')?.click();
        await tick();
        await tick();
    };

    beforeEach(() => {
        cenario();
        renderConexoes();
    });

    it('abre com a origem mais usada nas etiquetas e avisa quando há origens diferentes', () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        assert.ok(el('corrigir-fora-origem'));
        assert.match(el('corrigir-fora-origem-chips').textContent, /Grécia/);
        assert.match(el('modal-corrigir-fora-do-acervo').textContent, /2 origens diferentes/);
        fecharDialogo();
    });

    it('sem mexer no campo, a origem não vai no pedido e as exceções ficam como estão', async () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        el('corrigir-fora-tipo').value = 'Mito';
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        assert.deepEqual(entradas()[0].origemObra, ['Grécia']);
        assert.deepEqual(entradas()[1].origemObra, ['Grécia', 'Roma']);
        assert.equal('origemObra' in entradas()[2], false);
    });

    it('mexendo no campo, a confirmação avisa a sobrescrita e vale para todas', async () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        el('corrigir-fora-origem').value = 'Mesopotâmia';
        document.querySelector('[data-corrigir="revisar"]').click();
        assert.match(
            el('modal-confirmar-exclusao').textContent,
            /origem nova substitui uma origem diferente em 2 entradas/,
        );
        await confirmar();
        entradas().forEach((e) => assert.deepEqual(e.origemObra, ['Grécia', 'Mesopotâmia']));
    });

    it('tirar todas as etiquetas apaga a origem das entradas', async () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        el('corrigir-fora-origem-chips').querySelector('button').click();
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        entradas().forEach((e) => assert.equal('origemObra' in e, false));
    });
});
