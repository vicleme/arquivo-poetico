import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { db, importarDB, limparPadroesColunas } = await import('../js/db.js');
const {
    usarArmazenamentoPadroes,
    salvarPadraoColunas,
    listarPadroesColunas,
    aplicarPadraoColunas,
    getColunasAtivas,
    resetarColunas,
} = await import('../js/colunas.js');

// Mesmo registro que main.js faz no boot.
function registrar() {
    usarArmazenamentoPadroes({
        ler: (tabela) => db.padroesColunas?.[tabela] ?? [],
        gravar: (tabela, lista) => {
            db.padroesColunas = { ...db.padroesColunas, [tabela]: lista };
        },
    });
}

describe('padrões de colunas guardados no db (backup)', () => {
    beforeEach(() => {
        localStorage.clear();
        db.padroesColunas = {};
        registrar();
    });

    it('salvar grava em db.padroesColunas, não no localStorage', () => {
        salvarPadraoColunas('poemas', 'Base');
        assert.deepEqual(Object.keys(db.padroesColunas), ['poemas']);
        assert.equal(db.padroesColunas.poemas[0].nome, 'Base');
        assert.equal(localStorage.getItem('arquivoPoetico_colunasPadroes_poemas'), null);
    });

    it('o JSON do backup leva os padrões, e restaurar num acervo vazio traz tudo de volta', async () => {
        toggle();
        salvarPadraoColunas('poemas', 'Revisão');
        salvarPadraoColunas('prosas', 'Enxuto');
        const backup = JSON.parse(JSON.stringify(db));
        assert.equal(backup.padroesColunas.poemas[0].nome, 'Revisão');

        db.padroesColunas = {};
        assert.deepEqual(listarPadroesColunas('poemas'), []);
        await importarDB(backup);
        assert.deepEqual(
            listarPadroesColunas('poemas').map((p) => p.nome),
            ['Revisão'],
        );
        assert.deepEqual(
            listarPadroesColunas('prosas').map((p) => p.nome),
            ['Enxuto'],
        );
        resetarColunas('poemas');
        assert.equal(aplicarPadraoColunas('poemas', 'Revisão'), true);
        assert.ok(getColunasAtivas('poemas').includes('notas'));
    });

    it('backup antigo, sem a chave, não quebra e só recebe os padrões de fábrica', async () => {
        await importarDB({ livros: [], poemas: [], prosas: [] });
        assert.deepEqual(Object.keys(db.padroesColunas).sort(), ['poemas', 'prosas']);
        assert.equal(db.padroesColunas.poemas.length, 8);
        assert.ok(db.padroesColunasFabricaVersao >= 1);
    });

    it('backup que já aplicou a versão de fábrica não recria o padrão excluído', async () => {
        await importarDB({
            padroesColunasFabricaVersao: 2,
            padroesColunas: { poemas: [{ nome: 'Meu', colunas: ['notas'] }] },
        });
        assert.deepEqual(
            db.padroesColunas.poemas.map((p) => p.nome),
            ['Meu'],
        );
    });

    it('backup mal formado é limpo: tabela desconhecida, lista torta, nome vazio, repetido, chave extinta', () => {
        const limpo = limparPadroesColunas({
            poemas: [
                { nome: 'A', colunas: ['status', 'colunaQueSumiu', 'status'] },
                { nome: 'a', colunas: ['notas'] },
                { nome: '   ', colunas: ['notas'] },
                { nome: 'B' },
                null,
            ],
            fantasma: [{ nome: 'X', colunas: ['status'] }],
            prosas: 'texto',
        });
        assert.deepEqual(limpo, { poemas: [{ nome: 'A', colunas: ['status'] }] });
        assert.deepEqual(limparPadroesColunas(null), {});
        assert.deepEqual(limparPadroesColunas([]), {});
    });

    it('padrões que a primeira versão deixou no localStorage migram pro db, sem sobrescrever e sem duplicar', () => {
        db.padroesColunas = { poemas: [{ nome: 'Base', colunas: ['status'] }] };
        localStorage.setItem(
            'arquivoPoetico_colunasPadroes_poemas',
            JSON.stringify([
                { nome: 'base', colunas: ['notas'] },
                { nome: 'Antigo', colunas: ['elos'] },
            ]),
        );
        localStorage.setItem(
            'arquivoPoetico_colunasPadroes_prosas',
            JSON.stringify([{ nome: 'Só prosa', colunas: ['genero'] }]),
        );
        registrar();
        assert.deepEqual(
            listarPadroesColunas('poemas').map((p) => [p.nome, p.colunas]),
            [
                ['Base', ['status']],
                ['Antigo', ['elos']],
            ],
        );
        assert.deepEqual(
            listarPadroesColunas('prosas').map((p) => p.nome),
            ['Só prosa'],
        );
        assert.equal(localStorage.getItem('arquivoPoetico_colunasPadroes_poemas'), null);
        assert.equal(localStorage.getItem('arquivoPoetico_colunasPadroes_prosas'), null);
    });
});

function toggle() {
    // liga uma coluna a mais antes de salvar, pra o padrão ser diferente do de fábrica
    localStorage.setItem(
        'arquivoPoetico_colunas_poemas',
        JSON.stringify({ ordem: ['status', 'notas', 'estrutura'], ativas: ['status', 'notas'] }),
    );
}
