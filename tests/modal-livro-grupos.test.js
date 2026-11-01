import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Modal Editar Livro em seis grupos recolhíveis (campo-grupo), no padrão dos
// modais de Poema e Prosa. Só Identificação e Autoria e créditos abrem de início.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlModal = fs.readFileSync(path.resolve(__dirname, '../modais/modal-livro.html'), 'utf8');

globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const m = html.match(/<section id="livros"[\s\S]*?<\/section>/);
document.body.innerHTML = `<main>${m[0]}</main><div id="modais-container"></div>`;

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormLivro, rastreadorLivro, editarLivro } = await import('../js/forms.js');
const { prepararNovo } = await import('../js/ui.js');

registrarModal('modal-livro', 'modal-livro.html', initFormLivro, rastreadorLivro);

const GRUPOS = [
    [
        'Identificação',
        ['l-titulo', 'l-sequencia', 'l-tipo', 'l-fase', 'l-sigla-oficial', 'l-sigla-pessoal'],
    ],
    ['Autoria e créditos', ['l-autoria-lista', 'l-equipe-lista', 'l-uso-ia-estado']],
    [
        'Apresentação do livro',
        ['l-sinopse-curta', 'l-sinopse', 'l-abertura', 'l-contracapa', 'l-orelha-1', 'l-orelha-2'],
    ],
    ['Capa', ['l-capa', 'l-remover-capa', 'l-imagem-url', 'l-capa-desc', 'l-frase-capa']],
    [
        'Publicação',
        [
            'l-data-dia',
            'l-ultima-edicao-dia',
            'l-situacao-editorial',
            'l-situacao-desde-dia',
            'l-situacao-nota',
            'l-isbn-13',
            'l-isbn-10',
            'l-lojas-lista',
        ],
    ],
    [
        'Arquivos e registros',
        [
            'l-pdf',
            'l-epub',
            'l-codigo-barras',
            'l-ficha-catalografica',
            'l-certificado-direito-autoral',
            'l-carta-exclusividade',
        ],
    ],
];

const resumo = (d) => d.querySelector(':scope > summary').textContent.replace(/\s+/g, ' ').trim();
const grupoPorNome = (nome) =>
    Array.from(document.querySelectorAll('#form-livro > details.campo-grupo')).find((d) =>
        resumo(d).startsWith(nome),
    );

describe('modal do Livro: grupos', () => {
    beforeEach(async () => {
        db.livros = [];
        const el = document.getElementById('modal-livro');
        if (el && !el.classList.contains('hidden')) await toggleModal('modal-livro');
        await toggleModal('modal-livro');
        prepararNovo('livro');
    });

    it('tem os seis grupos, nesta ordem, como filhos diretos do formulário', () => {
        const nomes = Array.from(
            document.querySelectorAll('#form-livro > details.campo-grupo'),
        ).map((d) => resumo(d));
        assert.equal(nomes.length, 6);
        GRUPOS.forEach(([nome], i) => assert.ok(nomes[i].startsWith(nome), nomes[i]));
    });

    it('cada campo está no grupo certo e nenhum id do arquivo antigo se perdeu', () => {
        for (const [nome, ids] of GRUPOS) {
            const g = grupoPorNome(nome);
            for (const id of ids) {
                const el = document.getElementById(id);
                assert.ok(el, `${id} existe`);
                assert.ok(g.contains(el), `${id} está em ${nome}`);
            }
        }
        const ids = Array.from(htmlModal.matchAll(/id="(l-[a-z0-9-]+)"/g)).map((x) => x[1]);
        for (const id of ids) assert.ok(document.getElementById(id), id);
    });

    it('só Identificação e Autoria e créditos começam abertos', () => {
        const abertos = Array.from(document.querySelectorAll('#form-livro > details.campo-grupo'))
            .filter((d) => d.open)
            .map((d) => resumo(d));
        assert.equal(abertos.length, 2);
        assert.ok(abertos[0].startsWith('Identificação'));
        assert.ok(abertos[1].startsWith('Autoria e créditos'));
    });

    it('no grupo Apresentação do livro, a ordem é Sinopse curta, Sinopse, Versos de Abertura, Contracapa, Orelhas', () => {
        const ids = [
            'l-sinopse-curta',
            'l-sinopse',
            'l-abertura',
            'l-contracapa',
            'l-orelha-1',
            'l-orelha-2',
        ];
        for (let i = 0; i < ids.length - 1; i++) {
            const a = document.getElementById(ids[i]);
            const b = document.getElementById(ids[i + 1]);
            assert.ok(
                a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING,
                `${ids[i]} deve vir antes de ${ids[i + 1]}`,
            );
        }
    });

    it('Versos de Abertura fica ao lado da Contracapa (mesma linha de duas colunas)', () => {
        const a = document.getElementById('l-abertura').parentElement;
        const b = document.getElementById('l-contracapa').parentElement;
        assert.equal(a.parentElement, b.parentElement);
        assert.ok(a.classList.contains('md:col-span-2'));
        assert.ok(b.classList.contains('md:col-span-2'));
        assert.equal(a.nextElementSibling, b);
    });

    it('campo inválido em grupo fechado abre o grupo', () => {
        const g = grupoPorNome('Arquivos e registros');
        g.open = false;
        const campo = document.getElementById('l-pdf');
        campo.dispatchEvent(new window.Event('invalid', { bubbles: false, cancelable: true }));
        assert.equal(g.open, true);
    });

    it('recusa de data fora de ordem abre o grupo Publicação', async () => {
        document.getElementById('l-titulo').value = 'Livro de teste';
        document.getElementById('l-data-ano').value = '2020';
        document.getElementById('l-ultima-edicao-ano').value = '2019';
        const g = grupoPorNome('Publicação');
        g.open = false;
        document
            .getElementById('form-livro')
            .dispatchEvent(new window.Event('submit', { cancelable: true }));
        await new Promise((r) => setTimeout(r, 20));
        assert.equal(g.open, true);
        assert.equal(db.livros.length, 0);
    });

    it('editar um livro mantém os valores e a regra de grupos abertos', async () => {
        db.livros = [
            {
                id: 77,
                titulo: 'Editado',
                sequencia: 2,
                sinopseCurta: 'curta',
                pdfUrl: 'https://x.org/a.pdf',
            },
        ];
        await editarLivro(77);
        assert.equal(document.getElementById('l-titulo').value, 'Editado');
        assert.equal(document.getElementById('l-sinopse-curta').value, 'curta');
        assert.equal(document.getElementById('l-pdf').value, 'https://x.org/a.pdf');
        assert.equal(grupoPorNome('Identificação').open, true);
    });
});
