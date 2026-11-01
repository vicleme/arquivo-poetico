import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Origem no Corrigir autor: definir de uma vez a origem de todas as entradas em
// que o autor aparece (lógica, dados do autor e diálogo).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { montarForaDoAcervo } = await import('../js/fora-do-acervo.js');
const { planejarCorrecao, aplicarPlano, descreverPlano } =
    await import('../js/corrigir-fora-do-acervo.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { abrirCorrecaoAutor, fecharDialogo } = await import('../js/corrigir-fora-do-acervo-ui.js');

const el = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));
const snapshotOk = async () => true;
const CHAVE = 'ovidio';

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
                titulo: 'Metamorfose',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Livro',
                        obra: 'Metamorfoses',
                        autores: ['Ovídio'],
                        origemObra: ['Roma'],
                    },
                    {
                        relacao: 'Citação',
                        tipoObra: 'Livro',
                        obra: 'Outra',
                        autores: ['Alguém'],
                        origemObra: ['Brasil'],
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Exílio',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Livro',
                        obra: 'Tristia',
                        autores: ['Ovídio'],
                        origemObra: ['Roma', 'Grécia'],
                    },
                ],
            },
        ],
        prosas: [
            {
                id: 7,
                titulo: 'Conto',
                hipertextualidade: [
                    {
                        relacao: 'Paródia',
                        tipoObra: 'Livro',
                        hipotexto: 'Arte de amar',
                        autores: ['Ovídio', 'Parceiro'],
                    },
                ],
            },
        ],
    });
}

const entradasDoAutor = () => [
    db.poemas[0].intertextualidade[0],
    db.poemas[1].intertextualidade[0],
    db.prosas[0].hipertextualidade[0],
];
const base = () => ({ poemas: db.poemas, prosas: db.prosas });
const pedido = (novo) => ({ tipo: 'autor', alvos: [CHAVE], novo: { autor: 'Ovídio', ...novo } });

describe('origem no Corrigir autor (lógica)', () => {
    beforeEach(cenario);

    it('os dados do autor trazem as origens e as entradas sem origem', () => {
        const autor = montarForaDoAcervo(base()).autores.find((a) => a.chave === CHAVE);
        assert.ok(autor);
        assert.equal(autor.entradasSemOrigem, 1);
        assert.deepEqual(autor.origens[0].map(String), ['Roma']);
        assert.equal(autor.origens.length, 2);
    });

    it('sem `origens` no pedido, nada muda (mesmo nome, sem mudança)', () => {
        const plano = planejarCorrecao(base(), pedido({}));
        assert.equal(plano.entradas, 0);
        assert.equal(plano.jaIguais, 3);
    });

    it('uma lista troca em todas as entradas do autor, inclusive em obra com mais de um autor', () => {
        const plano = planejarCorrecao(base(), pedido({ origens: ['Roma Antiga'] }));
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 3);
        assert.equal(plano.origensSobrescritas, 2);
        aplicarPlano(plano);
        entradasDoAutor().forEach((e) => assert.deepEqual(e.origemObra, ['Roma Antiga']));
        // A obra de outro autor não é tocada.
        assert.deepEqual(db.poemas[0].intertextualidade[1].origemObra, ['Brasil']);
    });

    it('entrada que já tem a lista pedida não conta como mudança', () => {
        const plano = planejarCorrecao(base(), pedido({ origens: ['Roma'] }));
        assert.equal(plano.entradas, 2);
        assert.equal(plano.jaIguais, 1);
    });

    it('lista vazia tira a chave de todas', () => {
        const plano = planejarCorrecao(base(), pedido({ origens: [] }));
        assert.equal(plano.entradas, 2);
        aplicarPlano(plano);
        entradasDoAutor().forEach((e) => assert.equal('origemObra' in e, false));
    });

    it('o Desfazer devolve cada entrada como estava, inclusive sem a chave', () => {
        const feito = aplicarPlano(planejarCorrecao(base(), pedido({ origens: ['Itália'] })));
        feito.desfazer();
        assert.deepEqual(entradasDoAutor()[0].origemObra, ['Roma']);
        assert.deepEqual(entradasDoAutor()[1].origemObra, ['Roma', 'Grécia']);
        assert.equal('origemObra' in entradasDoAutor()[2], false);
    });

    it('renomear e definir a origem juntos funciona', () => {
        const plano = planejarCorrecao(
            base(),
            pedido({ autor: 'Públio Ovídio', origens: ['Roma'] }),
        );
        aplicarPlano(plano);
        assert.deepEqual(entradasDoAutor()[0].autores, ['Públio Ovídio']);
        assert.deepEqual(entradasDoAutor()[2].autores, ['Públio Ovídio', 'Parceiro']);
    });

    it('a frase da confirmação mostra a origem nova quando só ela muda', () => {
        const plano = planejarCorrecao(base(), pedido({ origens: ['Itália'] }));
        const { linhas } = descreverPlano(plano);
        assert.ok(linhas.some((l) => /origem: Itália/.test(l)));
    });
});

describe('campo Origem no diálogo de Corrigir autor', () => {
    const confirmar = async () => {
        el('modal-confirmar-exclusao')
            .querySelector('#btn-confirmar-exclusao, [data-confirmar], button:last-of-type')
            ?.click();
        await tick();
        await tick();
    };
    const revisar = () => document.querySelector('[data-corrigir="revisar"]').click();

    beforeEach(() => {
        cenario();
        renderConexoes();
    });

    it('abre com a origem mais usada e avisa que há origens diferentes', () => {
        abrirCorrecaoAutor(CHAVE, { tirarSnapshot: snapshotOk });
        assert.match(el('corrigir-fora-origem-chips').textContent, /Roma/);
        assert.match(el('modal-corrigir-fora-do-acervo').textContent, /2 origens diferentes/);
        fecharDialogo();
    });

    it('sem mexer em nada, não há o que alterar', () => {
        abrirCorrecaoAutor(CHAVE, { tirarSnapshot: snapshotOk });
        revisar();
        const c = el('modal-confirmar-exclusao');
        assert.ok(!c || c.style.display === 'none');
        fecharDialogo();
    });

    it('mexendo no campo, a confirmação avisa a sobrescrita e vale para todas', async () => {
        abrirCorrecaoAutor(CHAVE, { tirarSnapshot: snapshotOk });
        el('corrigir-fora-origem').value = 'Itália';
        revisar();
        assert.match(
            el('modal-confirmar-exclusao').textContent,
            /origem nova substitui uma origem diferente em 2 entradas/,
        );
        await confirmar();
        entradasDoAutor().forEach((e) => assert.deepEqual(e.origemObra, ['Roma', 'Itália']));
    });
});
