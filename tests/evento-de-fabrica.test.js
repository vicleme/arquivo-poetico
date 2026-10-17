import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// A Semana de Arte Moderna (recorte de uma semana) vem marcada como Evento
// no seed. Acervo que já existia recebe a marca uma única vez.

const D = await import('../js/db.js');

describe('Evento de fábrica: Semana de Arte Moderna', () => {
    it('o seed novo traz a Semana como evento e nenhum outro período de fábrica', () => {
        const banco = D.db.periodosHistoricos.filter((p) => p.embutido && p.evento === true);
        assert.deepEqual(
            banco.map((p) => p.nome),
            ['Semana de Arte Moderna'],
        );
    });

    it('acervo antigo recebe a marca uma vez; desmarcar depois vale', () => {
        const banco = {
            periodosHistoricos: [
                { id: 'a', nome: 'Semana de Arte Moderna', embutido: true },
                { id: 'b', nome: 'Belle Époque', embutido: true },
            ],
        };
        D.aplicarEventoDeFabricaUmaVez(banco);
        assert.equal(banco.periodosHistoricos[0].evento, true);
        assert.equal(banco.periodosHistoricos[1].evento, undefined);
        assert.equal(banco.eventoDeFabricaAplicado, true);
        delete banco.periodosHistoricos[0].evento;
        D.aplicarEventoDeFabricaUmaVez(banco);
        assert.equal(banco.periodosHistoricos[0].evento, undefined);
    });

    it('cadastro da própria pessoa com o mesmo nome não é tocado', () => {
        const banco = {
            periodosHistoricos: [{ id: 'c', nome: 'Semana de Arte Moderna', embutido: false }],
        };
        D.aplicarEventoDeFabricaUmaVez(banco);
        assert.equal(banco.periodosHistoricos[0].evento, undefined);
    });

    it('período recriado pela migração dos embutidos já nasce como evento', () => {
        const lista = [];
        D.migrarPeriodosHistoricosEmbutidos(lista, []);
        assert.equal(lista.find((p) => p.nome === 'Semana de Arte Moderna').evento, true);
    });
});
