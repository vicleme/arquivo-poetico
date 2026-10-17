import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Etiquetas (renderEtiquetas em etiquetas-aba.js), modal de Etiqueta
// (modais/modal-etiqueta.html + initFormEtiqueta) e as ações do cartão.
const modal = fs.readFileSync(new URL('../modais/modal-etiqueta.html', import.meta.url), 'utf8');
const modalMesclar = fs.readFileSync(
    new URL('../modais/modal-mesclar.html', import.meta.url),
    'utf8',
);
document.body.innerHTML = `
    <main>
        <input id="busca-etiquetas" />
        <select id="filtro-categoria-etiquetas"></select>
        <input type="checkbox" id="filtro-etiquetas-sem-texto" />
        <select id="ordem-etiquetas">
            <option value="alfabetica"></option>
            <option value="usadas"></option>
        </select>
        <span id="resumo-etiquetas"></span>
        <div id="duplicatas-etiquetas"></div>
        <div id="lista-etiquetas"></div>
    </main>
    ${modal}
    ${modalMesclar}
`;

const { db } = await import('../js/db.js');
const {
    renderEtiquetas,
    initFormEtiqueta,
    novaEtiqueta,
    editarEtiqueta,
    excluirEtiquetaComAviso,
    moverEtiquetaDoCartao,
    alternarCategoriaEtiquetas,
    recolherTodasEtiquetas,
    expandirTodasEtiquetas,
} = await import('../js/etiquetas-aba.js');
const { abrirModalMesclar } = await import('../js/forms.js');
const { sincronizarEtiquetas, textosDaEtiqueta } = await import('../js/etiquetas.js');

const $ = (id) => document.getElementById(id);
const nomesNaLista = () =>
    [...$('lista-etiquetas').querySelectorAll('h4')].map((h) => h.textContent);
const secoes = () =>
    [...$('lista-etiquetas').querySelectorAll('section')].map((s) => s.dataset.categoria);
const enviar = () => $('form-etiqueta').dispatchEvent(new Event('submit', { cancelable: true }));
const idDe = (nome, categoria) =>
    db.etiquetas.find((e) => e.nome === nome && e.categoria === categoria).id;

function preparar() {
    db.poemas = [
        {
            id: 1,
            titulo: 'A',
            sinalizacoesTom: 'Melancólico, Irônico',
            sinalizacoesEstilo: 'Barroco',
        },
        { id: 2, titulo: 'B', sinalizacoesTom: 'melancólico', sinalizacoesOutros: 'Rascunho' },
    ];
    db.prosas = [{ id: 3, titulo: 'C', sinalizacoesTom: 'Sombrio' }];
    db.etiquetas = [];
    sincronizarEtiquetas(db);
    $('busca-etiquetas').value = '';
    $('filtro-categoria-etiquetas').value = '';
    $('filtro-etiquetas-sem-texto').checked = false;
    $('ordem-etiquetas').value = 'alfabetica';
}

describe('renderEtiquetas (DOM real via happy-dom)', () => {
    beforeEach(preparar);

    it('agrupa por categoria, em ordem alfabética, com contagem de textos', () => {
        renderEtiquetas();
        assert.deepEqual(secoes(), ['estilo', 'tom', 'outros']);
        assert.deepEqual(nomesNaLista(), [
            'Barroco',
            'Irônico',
            'Melancólico',
            'Sombrio',
            'Rascunho',
        ]);
        assert.match($('lista-etiquetas').textContent, /Melancólico\s*2 textos/);
        assert.match(
            $('resumo-etiquetas').textContent,
            /5 de 5 etiquetas · 0 sem texto · 1 em Outros/,
        );
    });

    it('filtra por categoria (Outros serve de triagem) e busca sem caixa/acento', () => {
        $('filtro-categoria-etiquetas').value = 'outros';
        renderEtiquetas();
        assert.deepEqual(nomesNaLista(), ['Rascunho']);
        assert.match($('lista-etiquetas').textContent, /Use “Mover para…” para classificar/);

        $('filtro-categoria-etiquetas').value = '';
        $('busca-etiquetas').value = 'MELANCOL';
        renderEtiquetas();
        assert.deepEqual(nomesNaLista(), ['Melancólico']);
    });

    it('ordena por mais usadas e filtra as sem texto', () => {
        $('ordem-etiquetas').value = 'usadas';
        renderEtiquetas();
        const tom = [...$('lista-etiquetas').querySelectorAll('section[data-categoria="tom"] h4')];
        assert.equal(tom[0].textContent, 'Melancólico');

        db.etiquetas.push({ id: 999, nome: 'Solta', categoria: 'tom', notas: '' });
        $('filtro-etiquetas-sem-texto').checked = true;
        renderEtiquetas();
        assert.deepEqual(nomesNaLista(), ['Solta']);
    });

    it('mostra o painel de duplicatas só quando há par na mesma categoria', () => {
        renderEtiquetas();
        assert.equal($('duplicatas-etiquetas').innerHTML, '');
        db.etiquetas.push({ id: 998, nome: 'melancolico', categoria: 'tom', notas: '' });
        renderEtiquetas();
        assert.match($('duplicatas-etiquetas').textContent, /1 possível duplicata/);
        assert.ok(
            $('duplicatas-etiquetas').querySelector('[data-action="nao-sao-iguais-etiqueta"]'),
        );
    });
});

describe('categorias recolhíveis', () => {
    beforeEach(() => {
        preparar();
        expandirTodasEtiquetas();
    });

    const recolhida = (c) =>
        $('lista-etiquetas').querySelector(`section[data-categoria="${c}"]`).dataset.recolhida;

    it('alterna uma categoria e mantém o estado ao re-renderizar', () => {
        alternarCategoriaEtiquetas('tom');
        assert.equal(recolhida('tom'), 'true');
        assert.equal(recolhida('estilo'), 'false');
        renderEtiquetas();
        assert.equal(recolhida('tom'), 'true');
        alternarCategoriaEtiquetas('tom');
        assert.equal(recolhida('tom'), 'false');
    });

    it('recolhe e expande todas', () => {
        recolherTodasEtiquetas();
        assert.deepEqual(
            [...$('lista-etiquetas').querySelectorAll('section')].map((s) => s.dataset.recolhida),
            ['true', 'true', 'true'],
        );
        expandirTodasEtiquetas();
        assert.equal(recolhida('outros'), 'false');
    });

    it('com busca ligada, nada fica recolhido', () => {
        recolherTodasEtiquetas();
        $('busca-etiquetas').value = 'sombrio';
        renderEtiquetas();
        assert.equal(recolhida('tom'), 'false');
    });
});

describe('modal e ações da aba Etiquetas (DOM real via happy-dom)', () => {
    beforeEach(() => {
        preparar();
        initFormEtiqueta();
    });

    it('cria etiqueta na categoria escolhida e recusa duplicata na mesma categoria', async () => {
        await novaEtiqueta();
        $('et-nome').value = 'Épico';
        $('et-categoria').value = 'estilo';
        $('et-notas').value = 'grandes feitos';
        enviar();
        const criada = db.etiquetas.find((e) => e.nome === 'Épico');
        assert.equal(criada.categoria, 'estilo');
        assert.equal(criada.notas, 'grandes feitos');

        const total = db.etiquetas.length;
        $('et-nome').value = 'ÉPICO';
        enviar();
        assert.equal(db.etiquetas.length, total);
        // O mesmo nome em outra categoria é outra etiqueta.
        $('et-nome').value = 'Épico';
        $('et-categoria').value = 'tom';
        enviar();
        assert.equal(db.etiquetas.length, total + 1);
    });

    it('editar renomeia, guarda a nota e trava a categoria', async () => {
        const id = idDe('Melancólico', 'tom');
        await editarEtiqueta(id);
        assert.equal($('et-nome').value, 'Melancólico');
        assert.equal($('et-categoria').disabled, true);
        $('et-nome').value = 'Melancolia';
        $('et-notas').value = 'nota nova';
        enviar();
        const e = db.etiquetas.find((x) => x.id === id);
        assert.equal(e.nome, 'Melancolia');
        assert.equal(e.notas, 'nota nova');
        assert.equal(textosDaEtiqueta(db, id).poemasIds.length, 2);
    });

    it('"Nova etiqueta" depois de "Editar" libera a categoria e limpa o id', async () => {
        await editarEtiqueta(idDe('Barroco', 'estilo'));
        await novaEtiqueta();
        assert.equal($('et-edit-id').value, '');
        assert.equal($('et-categoria').disabled, false);
        assert.equal($('et-nome').value, '');
    });

    it('excluir recusa etiqueta em uso e apaga a que nenhum texto usa', () => {
        const usada = idDe('Barroco', 'estilo');
        excluirEtiquetaComAviso(usada);
        assert.ok(db.etiquetas.some((e) => e.id === usada));

        db.etiquetas.push({ id: 997, nome: 'Solta', categoria: 'tom', notas: '' });
        excluirEtiquetaComAviso(997);
        assert.ok(!db.etiquetas.some((e) => e.id === 997));
    });

    it('mover para outra categoria leva os textos junto', () => {
        const id = idDe('Rascunho', 'outros');
        const select = document.createElement('select');
        select.dataset.etiqueta = String(id);
        select.innerHTML = '<option value="">Mover</option><option value="estilo">Estilo</option>';
        select.value = 'estilo';
        moverEtiquetaDoCartao(select);
        assert.equal(db.etiquetas.find((e) => e.id === id).categoria, 'estilo');
        assert.ok(db.poemas[1].sinalizacoesEstilo.some((x) => x == id));
        assert.ok(!(db.poemas[1].sinalizacoesOutros || []).some((x) => x == id));
        assert.equal(select.value, '');
    });

    it('Mesclar só oferece destinos da mesma categoria', async () => {
        await abrirModalMesclar('etiquetas', idDe('Melancólico', 'tom'));
        const opcoes = [...$('ms-destino-id').options].map((o) => o.textContent);
        assert.deepEqual(opcoes, ['Irônico', 'Sombrio']);
    });
});
