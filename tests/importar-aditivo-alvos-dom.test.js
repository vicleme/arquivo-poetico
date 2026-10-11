import './helpers/dom-real.js';

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Etapa 4a2 (F11-D9): ciclo real de exportar com montarRegistro e importar,
// e o aviso "Ligações que serão soltas" na prévia da Importação Aditiva.
document.body.innerHTML = `
    <main>
        <div id="importacao-aditiva-preview"></div>
        <div id="importacao-aditiva-acoes" class="hidden">
            <button id="btn-aplicar-importacao-aditiva"></button>
        </div>
        <input id="importacao-aditiva-arquivo" />
    </main>
`;

const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { classificarImportacaoAditiva, aplicarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');
const { carregarPayloadImportacaoAditiva, cancelarImportacaoAditiva } =
    await import('../js/ui-importar-aditivo.js');

const $ = (id) => document.getElementById(id);

function acervoOrigem() {
    db.poemas = [
        { id: 7, titulo: 'Maré', texto: 'a' },
        { id: 8, titulo: 'Farol', texto: 'b' },
    ];
    db.prosas = [
        {
            id: 1000,
            titulo: 'Cais',
            texto: 'c',
            conceitos: {
                ecos: [
                    { id: 7, tipo: 'Aceno a', texto: 'um' },
                    { id: 8, tipo: 'Aceno a', texto: 'dois' },
                ],
                elos: [{ id: 7, relacao: 'Variação', direcao: '', texto: '' }],
            },
        },
    ];
    db.pessoas = [];
    db.personagens = [];
    db.temas = [];
    db.assuntos = [];
    db.autores = [];
    db.grupos = [];
    db.livros = [];
}

function exportarCais(...outros) {
    const textos = [db.prosas[0], ...outros];
    const itens = textos.map((t) =>
        JSON.parse(JSON.stringify(montarRegistro(t === db.prosas[0] ? 'prosa' : 'poema', t))),
    );
    return { itens };
}

function acervoDestinoVazio() {
    db.poemas = [];
    db.prosas = [];
    db.pessoas = [];
    db.personagens = [];
    db.escansoes = [];
    db.estruturasTextuais = [];
}

describe('exportação leva o título do alvo', () => {
    beforeEach(acervoOrigem);

    it('montarRegistro grava alvoTitulo em cada Elo e Eco', () => {
        const [cais] = exportarCais().itens;
        assert.deepEqual(
            cais.conceitos.ecos.map((e) => e.alvoTitulo),
            ['Maré', 'Farol'],
        );
        assert.equal(cais.conceitos.elos[0].alvoTitulo, 'Maré');
    });

    it('o dado do acervo não ganha alvoTitulo (só o registro exportado)', () => {
        exportarCais();
        assert.equal('alvoTitulo' in db.prosas[0].conceitos.ecos[0], false);
        assert.equal('alvoTitulo' in db.prosas[0].conceitos.elos[0], false);
    });

    it('ciclo: exportar só a Cais e importar num acervo que tem a Maré liga a Maré', async () => {
        acervoOrigem();
        const payload = exportarCais();
        acervoDestinoVazio();
        db.poemas.push({ id: 555, titulo: 'Maré', texto: 'já aqui' });

        const relatorio = classificarImportacaoAditiva(payload, db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, {
            tirarSnapshotSeNecessario: mock.fn(async () => true),
            save: mock.fn(() => {}),
        });
        const cais = db.prosas.find((p) => p.titulo === 'Cais');
        assert.deepEqual(
            cais.conceitos.ecos.map((e) => [e.id, e.texto]),
            [[555, 'um']],
        );
        assert.equal(cais.conceitos.elos[0].id, 555);
        assert.deepEqual(r.soltos, { elos: 0, ecos: 1 }, 'o Farol não existe no destino');
    });
});

describe('prévia: ligações que serão soltas', () => {
    beforeEach(() => {
        acervoOrigem();
    });

    it('lista o item, a contagem e os títulos que faltam', () => {
        const payload = exportarCais();
        acervoDestinoVazio();
        carregarPayloadImportacaoAditiva(payload);
        const html = $('importacao-aditiva-preview').textContent;
        assert.match(html, /Ligações que serão soltas/);
        assert.match(html, /Cais:/);
        assert.match(html, /2 Ecos e 1 Elo apontam para textos que não estão no arquivo/);
        assert.match(html, /"Maré"/);
        assert.match(html, /"Farol"/);
        cancelarImportacaoAditiva();
    });

    it('com o alvo dentro do arquivo e no acervo, não aparece aviso', () => {
        const payload = exportarCais(db.poemas[0]);
        acervoDestinoVazio();
        db.poemas.push({ id: 556, titulo: 'Farol', texto: 'no destino' });
        carregarPayloadImportacaoAditiva(payload);
        assert.doesNotMatch($('importacao-aditiva-preview').textContent, /serão soltos/);
        cancelarImportacaoAditiva();
    });

    it('um só Eco solto fala no singular', () => {
        acervoOrigem();
        db.prosas[0].conceitos.elos = [];
        db.prosas[0].conceitos.ecos = [db.prosas[0].conceitos.ecos[0]];
        const payload = exportarCais();
        acervoDestinoVazio();
        carregarPayloadImportacaoAditiva(payload);
        assert.match(
            $('importacao-aditiva-preview').textContent,
            /1 Eco aponta para textos que não estão no arquivo nem no acervo e será solto/,
        );
        cancelarImportacaoAditiva();
    });
});
