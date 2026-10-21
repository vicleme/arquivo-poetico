import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    TIPO_FICHA,
    camposDaFicha,
    outrasFichasDoLivro,
    sincronizarLivroComFicha,
    sincronizarFichasComLivro,
    linkDoLivroParaFicha,
} from '../js/ficha-catalografica.js';

function novoDb() {
    return {
        livros: [
            { id: 1, titulo: 'Livro A', fichaCatalograficaUrl: 'https://a.com/ficha' },
            { id: 2, titulo: 'Livro B', fichaCatalograficaUrl: '' },
        ],
        elementos: [],
    };
}

const ficha = (extra) => ({ id: 10, tipo: TIPO_FICHA, paiTipo: 'livro', paiId: 1, ...extra });

describe('Ficha catalográfica: campos próprios', () => {
    it('só guarda os campos quando o tipo é Ficha catalográfica', () => {
        const valores = { fichaCdd: 'B869.1', fichaCrb: 'CRB-8/9253' };
        assert.deepEqual(camposDaFicha('Introdução', valores), {});
        assert.deepEqual(camposDaFicha(TIPO_FICHA, valores), {
            fichaCdd: 'B869.1',
            fichaCrb: 'CRB-8/9253',
        });
    });

    it('campo vazio ou só com espaços não é gravado', () => {
        assert.deepEqual(camposDaFicha(TIPO_FICHA, { fichaCdd: '  ', fichaUrl: '' }), {});
    });
});

describe('Ficha catalográfica: sincronia do link com o livro', () => {
    let db;
    beforeEach(() => {
        db = novoDb();
    });

    it('salvar a ficha muda o link do livro', () => {
        const mudou = sincronizarLivroComFicha(db, ficha({ fichaUrl: 'https://b.com/nova' }));
        assert.equal(mudou, true);
        assert.equal(db.livros[0].fichaCatalograficaUrl, 'https://b.com/nova');
    });

    it('link igual não conta como mudança', () => {
        const mudou = sincronizarLivroComFicha(db, ficha({ fichaUrl: 'https://a.com/ficha' }));
        assert.equal(mudou, false);
    });

    it('apagar o link na ficha apaga no livro', () => {
        sincronizarLivroComFicha(db, ficha({ fichaUrl: '' }));
        assert.equal(db.livros[0].fichaCatalograficaUrl, '');
    });

    it('ficha ligada a Parte ou Seção não mexe no livro', () => {
        const mudou = sincronizarLivroComFicha(db, {
            ...ficha({ fichaUrl: 'https://x.com' }),
            paiTipo: 'parte',
        });
        assert.equal(mudou, false);
        assert.equal(db.livros[0].fichaCatalograficaUrl, 'https://a.com/ficha');
    });

    it('outro tipo de elemento não mexe no livro', () => {
        const mudou = sincronizarLivroComFicha(db, {
            ...ficha({ fichaUrl: 'https://x.com' }),
            tipo: 'Sumário',
        });
        assert.equal(mudou, false);
    });

    it('salvar o livro com link novo muda as fichas dele', () => {
        db.elementos.push(ficha({ fichaUrl: 'https://a.com/ficha' }));
        db.elementos.push({ ...ficha({ fichaUrl: 'https://o.com' }), id: 11, paiId: 2 });
        const n = sincronizarFichasComLivro(db, 1, 'https://a.com/ficha', 'https://novo.com');
        assert.equal(n, 1);
        assert.equal(db.elementos[0].fichaUrl, 'https://novo.com');
        assert.equal(db.elementos[1].fichaUrl, 'https://o.com');
    });

    it('livro salvo sem mudar o link não mexe em nenhuma ficha', () => {
        db.elementos.push(ficha({ fichaUrl: 'https://diferente.com' }));
        const n = sincronizarFichasComLivro(db, 1, 'https://a.com/ficha', 'https://a.com/ficha');
        assert.equal(n, 0);
        assert.equal(db.elementos[0].fichaUrl, 'https://diferente.com');
    });

    it('apagar o link no livro tira o link das fichas dele', () => {
        db.elementos.push(ficha({ fichaUrl: 'https://a.com/ficha' }));
        sincronizarFichasComLivro(db, 1, 'https://a.com/ficha', '');
        assert.equal('fichaUrl' in db.elementos[0], false);
    });

    it('linkDoLivroParaFicha devolve o link do livro ou vazio', () => {
        assert.equal(linkDoLivroParaFicha(db, 1), 'https://a.com/ficha');
        assert.equal(linkDoLivroParaFicha(db, 2), '');
        assert.equal(linkDoLivroParaFicha(db, 99), '');
    });
});

describe('Ficha catalográfica: segunda ficha no mesmo livro', () => {
    it('acha a outra ficha do mesmo livro, sem contar a própria', () => {
        const db = novoDb();
        db.elementos.push(ficha({}));
        assert.equal(outrasFichasDoLivro(db, ficha({ id: 10 })).length, 0);
        assert.equal(outrasFichasDoLivro(db, ficha({ id: 20 })).length, 1);
    });

    it('ficha de outro livro, de Parte ou de outro tipo não conta', () => {
        const db = novoDb();
        db.elementos.push(ficha({ id: 10, paiId: 2 }));
        db.elementos.push({ ...ficha({}), id: 11, paiTipo: 'parte' });
        db.elementos.push({ ...ficha({}), id: 12, tipo: 'Sumário' });
        assert.equal(outrasFichasDoLivro(db, ficha({ id: 20 })).length, 0);
    });

    it('um elemento que não é ficha nunca dispara o aviso', () => {
        const db = novoDb();
        db.elementos.push(ficha({}));
        assert.equal(
            outrasFichasDoLivro(db, { id: 30, tipo: 'Pórtico', paiTipo: 'livro', paiId: 1 }).length,
            0,
        );
    });
});

describe('Ficha catalográfica: modal e filtro', () => {
    const html = readFileSync('modais/modal-elemento.html', 'utf8');
    it('o select do modal tem Ficha catalográfica e Sumário', () => {
        assert.ok(html.includes('<option value="Ficha catalográfica">'));
        assert.ok(html.includes('<option value="Sumário">'));
    });
    it('o modal tem os cinco campos da ficha', () => {
        for (const id of [
            'el-ficha-url',
            'el-ficha-cdd',
            'el-ficha-numero-controle',
            'el-ficha-bibliotecario',
            'el-ficha-crb',
        ]) {
            assert.ok(html.includes(`id="${id}"`), id);
        }
    });
});

describe('Ficha catalográfica: campos aparecem só no tipo certo', () => {
    it('toggleCamposFicha mostra o bloco e o link conforme tipo e vínculo', async () => {
        document.body.innerHTML = `
            <select id="el-tipo"><option value="Pórtico"></option><option value="${TIPO_FICHA}"></option></select>
            <select id="el-vinculo"><option value="livro:1"></option><option value="parte:5"></option></select>
            <div id="campos-ficha" class="hidden"></div>
            <div id="campo-ficha-url"></div>
            <input id="el-ficha-url" />`;
        const { db } = await import('../js/db.js');
        db.livros.length = 0;
        db.livros.push({ id: 1, titulo: 'L', fichaCatalograficaUrl: 'https://a.com/ficha' });
        const { toggleCamposFicha } = await import('../js/ui.js');
        const tipo = document.getElementById('el-tipo');
        const vinculo = document.getElementById('el-vinculo');
        const bloco = document.getElementById('campos-ficha');
        const campoUrl = document.getElementById('campo-ficha-url');
        const url = document.getElementById('el-ficha-url');

        tipo.value = 'Pórtico';
        toggleCamposFicha();
        assert.ok(bloco.classList.contains('hidden'));

        tipo.value = TIPO_FICHA;
        vinculo.value = 'livro:1';
        toggleCamposFicha();
        assert.ok(!bloco.classList.contains('hidden'));
        assert.ok(!campoUrl.classList.contains('hidden'));
        assert.equal(url.value, 'https://a.com/ficha');

        vinculo.value = 'parte:5';
        toggleCamposFicha();
        assert.ok(campoUrl.classList.contains('hidden'));
    });
});
