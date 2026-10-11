import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Os handlers de Elo e Eco recebem a tabela como primeiro argumento
// ('poemas' ou 'prosas'). O modal de Poema chegou a chamar três deles sem
// ela (Cancelar, a Relação e os botões Origem/Destino): o clique não fazia
// nada. Aqui cada chamada inline dos dois modais é conferida.
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODAIS = { poemas: 'modais/modal-poema.html', prosas: 'modais/modal-prosa.html' };
const CHAMADA =
    /\bon(?:click|change)="((?:adicionar|editar|remover|cancelarEdicao|selecionarDirecao|onRelacao)(?:Elo|Eco)\w*)\(([^)]*)\)"/g;

describe('handlers inline de Elo e Eco nos modais', () => {
    for (const [tabela, arquivo] of Object.entries(MODAIS)) {
        const html = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
        const chamadas = [...html.matchAll(CHAMADA)];

        it(`${arquivo}: encontra os handlers`, () => {
            const nomes = chamadas.map((c) => c[1]);
            [
                'adicionarElo',
                'cancelarEdicaoElo',
                'onRelacaoEloAlterada',
                'selecionarDirecaoElo',
                'adicionarEco',
                'cancelarEdicaoEco',
            ].forEach((n) => assert.ok(nomes.includes(n), n));
        });

        it(`${arquivo}: toda chamada começa pela tabela '${tabela}'`, () => {
            chamadas.forEach(([, nome, args]) => {
                assert.ok(args.trim().startsWith(`'${tabela}'`), `${nome}(${args})`);
            });
        });
    }

    it('os botões de direção passam a tabela e depois a direção', () => {
        const html = fs.readFileSync(path.join(RAIZ, MODAIS.poemas), 'utf8');
        assert.match(html, /selecionarDirecaoElo\('poemas', 'origem'\)/);
        assert.match(html, /selecionarDirecaoElo\('poemas', 'destino'\)/);
    });
});

describe('Cancelar e direção do Elo no modal de Poema (comportamento)', () => {
    it('Origem/Destino marcam o botão e gravam a direção; Cancelar limpa e esconde', async () => {
        const html = fs.readFileSync(path.join(RAIZ, MODAIS.poemas), 'utf8');
        document.body.innerHTML = html;
        const E = await import('../js/editor.js');
        const get = (id) => document.getElementById(id);

        get('p-elo-relacao').innerHTML =
            '<option value="">--</option><option value="Resposta">Resposta</option>';
        get('p-elo-relacao').value = 'Resposta';
        E.onRelacaoEloAlterada('poemas');
        assert.equal(get('p-elo-direcao-origem').textContent.trim(), 'Respondido em');
        assert.equal(get('p-elo-direcao-destino').textContent.trim(), 'Resposta a');

        E.selecionarDirecaoElo('poemas', 'destino');
        assert.equal(get('p-elo-direcao').value, 'destino');
        assert.match(get('p-elo-direcao-destino').className, /bg-blue-100/);
        assert.doesNotMatch(get('p-elo-direcao-origem').className, /bg-blue-100/);

        E.cancelarEdicaoElo('poemas');
        assert.equal(get('p-elo-direcao').value, '');
        assert.equal(get('p-elo-relacao').value, '');
        assert.ok(get('p-elo-btn-cancelar').classList.contains('hidden'));
    });
});
