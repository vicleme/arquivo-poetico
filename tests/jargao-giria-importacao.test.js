import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// Jargão e gíria, entrega 5: como o campo atravessa as entradas.
// - Importação Aditiva: copia o item inteiro (`{ ...itemOrigem }`), então a
//   lista chega intacta, em Poema e em Prosa.
// - Pacote de texto: só título, texto, tipo, idioma e fonteTexto atravessam, de
//   propósito (pacote público); o campo fica de fora, como os dialetos.
import { classificarImportacaoAditiva, aplicarImportacaoAditiva } from '../js/importar-aditivo.js';
import { montarItemDeSelecao } from '../js/pacote-texto.js';

function dbVazio() {
    return {
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        periodosHistoricos: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
    };
}

function exportado(tipo, id, extra = {}) {
    return {
        id,
        tipo,
        titulo: `Texto ${id}`,
        texto: 'texto qualquer',
        pessoas: [],
        autoria: [],
        gruposDiretosResolvidos: [],
        livrosResolvidos: [],
        contexto: { livro: null, parte: null, secao: null },
        ...extra,
    };
}

function depsFake() {
    return {
        tirarSnapshotSeNecessario: mock.fn(async () => true),
        save: mock.fn(() => {}),
    };
}

describe('Importação Aditiva leva o Jargão e gíria', () => {
    it('Poema e Prosa chegam com a lista intacta', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                exportado('poema', 1, { jargaoGiria: ['Gíria de internet', 'Gíria juvenil'] }),
                exportado('prosa', 2, { jargaoGiria: ['Jargão corporativo'] }),
            ],
        };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, depsFake());
        assert.equal(r.sucesso, true);
        assert.deepEqual(db.poemas[0].jargaoGiria, ['Gíria de internet', 'Gíria juvenil']);
        assert.deepEqual(db.prosas[0].jargaoGiria, ['Jargão corporativo']);
    });

    it('arquivo sem o campo (exportação antiga) não ganha chave inventada', async () => {
        const db = dbVazio();
        const payload = { itens: [exportado('poema', 3)] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        await aplicarImportacaoAditiva(payload, relatorio, db, depsFake());
        assert.equal('jargaoGiria' in db.poemas[0], false);
    });
});

describe('Backup', () => {
    it('o campo vai e volta pelo JSON do acervo sem mudar', () => {
        const poema = { id: 1, titulo: 'a', jargaoGiria: ['Linguagem de fandom'] };
        const volta = JSON.parse(JSON.stringify({ poemas: [poema] }));
        assert.deepEqual(volta.poemas[0].jargaoGiria, ['Linguagem de fandom']);
    });
});

describe('Pacote de texto não leva o Jargão e gíria (decisão)', () => {
    it('montarItemDeSelecao só deixa passar título, texto, tipo, idioma e fonte', () => {
        const item = montarItemDeSelecao(
            10,
            {
                tipo: 'poema',
                titulo: 'Gen Z',
                texto: 'verso',
                idioma: 'pt-BR',
                jargaoGiria: ['Gíria de internet'],
            },
            { autor: { nome: 'A' } },
        );
        assert.equal('jargaoGiria' in item, false);
    });
});
