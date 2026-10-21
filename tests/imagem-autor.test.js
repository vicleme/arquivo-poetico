import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Imagem do Autor (upload, id no IndexedDB) e "Link da imagem" (só acesso,
// abre em outra aba, nunca exibido). DOM real do modal, como em
// form-autor-campos.test.js. Sem arquivo escolhido o salvar não toca no
// IndexedDB, então o fluxo roda sem ele.
const MODAL_HTML = fs.readFileSync(path.resolve(__dirname, '../modais/modal-autor.html'), 'utf8');
document.body.innerHTML = MODAL_HTML + '<div id="lista-autores"></div>';

const { db } = await import('../js/db.js');
const { initFormAutor, editarAutor } = await import('../js/forms.js');
const { renderAutores } = await import('../js/render-listas.js');
const { renderVisualizacaoAutorHtml } = await import('../js/visualizar-autor.js');
const { autorParaMarkdown, COLUNAS_AUTOR } = await import('../js/exportar-autores.js');
const { normalizarLinkImagem, linkImagemExibivel, linkImagemHtml } =
    await import('../js/imagem-link.js');

// IndexedDB falso: o card e o Ver chamam preencherCapas, que lê a imagem do
// banco. Aqui toda leitura volta vazia (a imagem fica oculta), sem erro solto.
globalThis.indexedDB = {
    open() {
        const req = {};
        const idb = {
            transaction: () => ({
                objectStore: () => ({
                    get: () => {
                        const r = {};
                        setTimeout(() => r.onsuccess?.({ target: { result: undefined } }));
                        return r;
                    },
                }),
            }),
        };
        setTimeout(() => req.onsuccess?.({ target: { result: idb } }));
        return req;
    },
};

const el = (id) => document.getElementById(id);
const enviar = () => el('form-autor').onsubmit({ preventDefault() {} });

describe('imagem-link (lógica pura)', () => {
    it('vazio vira string vazia; http e https passam; o resto é recusado', () => {
        assert.equal(normalizarLinkImagem(''), '');
        assert.equal(normalizarLinkImagem('   '), '');
        assert.equal(normalizarLinkImagem(undefined), '');
        assert.equal(
            normalizarLinkImagem(' https://i.ibb.co/x/foto.jpg '),
            'https://i.ibb.co/x/foto.jpg',
        );
        assert.equal(normalizarLinkImagem('http://exemplo.com/a.png'), 'http://exemplo.com/a.png');
        assert.equal(normalizarLinkImagem('javascript:alert(1)'), null);
        assert.equal(normalizarLinkImagem('ftp://exemplo.com/a.png'), null);
        assert.equal(normalizarLinkImagem('foto.jpg'), null);
    });

    it('exibição tolerante: dado inválido de importação não vira link', () => {
        assert.equal(linkImagemExibivel('javascript:alert(1)'), '');
        assert.equal(linkImagemHtml('javascript:alert(1)'), '');
        assert.equal(linkImagemHtml(''), '');
        const html = linkImagemHtml('https://drive.google.com/file/d/abc/view');
        assert.match(html, /href="https:\/\/drive\.google\.com\/file\/d\/abc\/view"/);
        assert.match(html, /target="_blank"/);
        assert.match(html, /rel="noopener noreferrer"/);
        assert.match(html, />Abrir imagem original</);
    });
});

describe('Modal de Autor: link da imagem', () => {
    beforeEach(() => {
        db.autores = [];
        el('form-autor').reset();
        el('au-edit-id').value = '';
    });

    it('o modal tem upload, "remover" e link, fora dos grupos colapsáveis', () => {
        ['au-imagem', 'au-remover-imagem', 'au-imagem-url'].forEach((id) => {
            assert.ok(el(id), id);
            assert.equal(el(id).closest('details'), null, id);
        });
        assert.equal(el('au-imagem').type, 'file');
        assert.equal(el('au-imagem-url').type, 'url');
    });

    it('grava e relê o link; sem link grava string vazia', async () => {
        initFormAutor();
        el('au-nome').value = 'Cruz e Sousa';
        el('au-imagem-url').value = ' https://i.ibb.co/abc/cruz.jpg ';
        await enviar();
        assert.equal(db.autores.length, 1);
        assert.equal(db.autores[0].imagemUrl, 'https://i.ibb.co/abc/cruz.jpg');
        assert.equal(db.autores[0].imagem, null);

        await editarAutor(db.autores[0].id);
        assert.equal(el('au-imagem-url').value, 'https://i.ibb.co/abc/cruz.jpg');
        el('au-imagem-url').value = '';
        await enviar();
        assert.equal(db.autores[0].imagemUrl, '');
    });

    it('recusa link que não é http/https e não grava o Autor', async () => {
        initFormAutor();
        el('au-nome').value = 'Camões';
        el('au-imagem-url').value = 'javascript:alert(1)';
        await enviar();
        assert.equal(db.autores.length, 0);
    });

    it('editar sem mexer na imagem mantém o id guardado', async () => {
        initFormAutor();
        db.autores = [{ id: 7, nome: 'Pessoa', imagem: 'capa_1_abc', imagemUrl: '' }];
        await editarAutor(7);
        await enviar();
        assert.equal(db.autores[0].imagem, 'capa_1_abc');
    });
});

describe('Card, Ver e exportação do Autor com imagem e link', () => {
    beforeEach(() => {
        db.autores = [
            {
                id: 1,
                nome: 'Florbela Espanca',
                imagem: 'capa_9_xyz',
                imagemUrl: 'https://upload.wikimedia.org/x/florbela.jpg',
            },
            { id: 2, nome: 'Sem imagem' },
            { id: 3, nome: 'Link inválido', imagemUrl: 'javascript:alert(1)' },
        ];
        db.poemas = [];
        db.prosas = [];
    });

    it('card mostra a miniatura só para quem tem imagem e o link só se for válido', () => {
        renderAutores();
        const cards = el('lista-autores').children;
        assert.equal(cards.length, 3);
        assert.ok(cards[0].querySelector('img[data-capa-id="capa_9_xyz"]'));
        assert.match(cards[0].innerHTML, /Abrir imagem original/);
        assert.equal(cards[1].querySelector('img[data-capa-id]'), null);
        assert.doesNotMatch(cards[1].innerHTML, /Abrir imagem original/);
        assert.doesNotMatch(cards[2].innerHTML, /Abrir imagem original/);
    });

    it('Ver mostra a imagem e o link; sem eles, nada aparece', () => {
        const comImagem = renderVisualizacaoAutorHtml(db.autores[0]);
        assert.match(comImagem, /data-capa-id="capa_9_xyz"/);
        assert.match(comImagem, /Imagem:<\/strong> <a href="https:\/\/upload\.wikimedia\.org/);
        const sem = renderVisualizacaoAutorHtml(db.autores[1]);
        assert.doesNotMatch(sem, /data-capa-id/);
        assert.doesNotMatch(sem, /Abrir imagem original/);
    });

    it('exportação em .md e .csv leva o link, e só o válido', () => {
        assert.match(autorParaMarkdown(db.autores[0]), /Link da imagem.*florbela\.jpg/);
        assert.doesNotMatch(autorParaMarkdown(db.autores[2]), /Link da imagem/);
        const col = COLUNAS_AUTOR.find((c) => c.cabecalho === 'link_imagem');
        assert.ok(col, 'coluna link_imagem existe');
        assert.equal(col.valor(db.autores[0]), 'https://upload.wikimedia.org/x/florbela.jpg');
        assert.equal(col.valor(db.autores[2]), '');
    });
});

describe('Excluir Autor descarta a imagem do IndexedDB (ao confirmar)', () => {
    it('a imagem do Autor e a do Elemento saem do banco quando a exclusão é confirmada', async () => {
        const apagados = [];
        const idbOriginal = globalThis.indexedDB;
        globalThis.indexedDB = {
            open() {
                const req = {};
                const idb = {
                    transaction: () => {
                        const tx = {};
                        setTimeout(() => tx.oncomplete?.());
                        return {
                            objectStore: () => ({ delete: (id) => apagados.push(id) }),
                            set oncomplete(fn) {
                                tx.oncomplete = fn;
                            },
                            set onerror(fn) {
                                tx.onerror = fn;
                            },
                        };
                    },
                };
                setTimeout(() => req.onsuccess?.({ target: { result: idb } }));
                return req;
            },
        };
        const { deleteItemsEmMassa } = await import('../js/db.js');
        db.autores = [
            { id: 11, nome: 'A', imagem: 'capa_a' },
            { id: 12, nome: 'B', imagem: 'capa_b' },
        ];
        db.poemas = [];
        db.prosas = [];
        db.elementos = [{ id: 21, tipo: 'Epígrafe', imagem: 'capa_el' }];
        deleteItemsEmMassa('autores', [11]);
        // A exclusão seguinte confirma a anterior de vez (ver _pendingExclusao).
        deleteItemsEmMassa('elementos', [21]);
        await new Promise((r) => setTimeout(r, 30));
        assert.ok(apagados.includes('capa_a'), 'imagem do Autor descartada');
        assert.ok(!apagados.includes('capa_b'), 'imagem de outro Autor intacta');
        // Elemento: antes só `capa` era descartada; `imagem` ficava no banco.
        deleteItemsEmMassa('autores', [12]);
        await new Promise((r) => setTimeout(r, 30));
        assert.ok(apagados.includes('capa_el'), 'imagem do Elemento descartada');
        globalThis.indexedDB = idbOriginal;
    });
});
