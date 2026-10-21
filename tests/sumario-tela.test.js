import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../modais/modal-elemento.html', import.meta.url), 'utf8');

function montarModal() {
    document.body.innerHTML = html;
}

const {
    renderSumarioNoModal,
    lerSumarioDoModal,
    limparSumarioDoModal,
    toggleCamposSumario,
    ligarSumarioNoModal,
} = await import('../js/ui-sumario.js');
const { camposDoSumario } = await import('../js/sumario.js');
const { renderElementos, setFiltroLivroElementos, setFiltroTipoElementos } =
    await import('../js/render-listas.js');
const { db } = await import('../js/db.js');

function linhas() {
    return Array.from(document.querySelectorAll('#el-sumario-lista [data-sumario-linha]'));
}

describe('Sumário na tela: lista do modal', () => {
    beforeEach(() => {
        montarModal();
        ligarSumarioNoModal();
    });

    it('o bloco só aparece com o tipo Sumário', () => {
        const tipo = document.getElementById('el-tipo');
        const box = document.getElementById('campos-sumario');
        tipo.value = 'Introdução';
        toggleCamposSumario();
        assert.ok(box.classList.contains('hidden'));
        tipo.value = 'Sumário';
        toggleCamposSumario();
        assert.ok(!box.classList.contains('hidden'));
    });

    it('mostra os itens e lê de volta com nível, item e página', () => {
        renderSumarioNoModal([
            { nivel: 1, item: 'Parte "I"', pagina: '9' },
            { nivel: 2, item: 'Poema', pagina: 'xii' },
        ]);
        assert.equal(linhas().length, 2);
        assert.equal(document.getElementById('el-sumario-contagem').textContent, '2 itens');
        assert.deepEqual(lerSumarioDoModal(), [
            { nivel: '1', item: 'Parte "I"', pagina: '9' },
            { nivel: '2', item: 'Poema', pagina: 'xii' },
        ]);
    });

    it('o recuo acompanha o nível', () => {
        renderSumarioNoModal([{ nivel: 3, item: 'Fundo', pagina: '' }]);
        assert.equal(linhas()[0].style.marginLeft, '28px');
        const select = linhas()[0].querySelector('[data-sumario="nivel"]');
        select.value = '1';
        select.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.equal(linhas()[0].style.marginLeft, '0px');
    });

    it('adicionar herda o nível da última linha e remover tira a linha', () => {
        renderSumarioNoModal([{ nivel: 2, item: 'A', pagina: '1' }]);
        document.getElementById('el-sumario-adicionar').click();
        assert.equal(linhas().length, 2);
        assert.equal(linhas()[1].querySelector('[data-sumario="nivel"]').value, '2');
        linhas()[0].querySelector('[data-sumario-acao="remover"]').click();
        assert.equal(linhas().length, 1);
        assert.equal(document.getElementById('el-sumario-contagem').textContent, '1 item');
    });

    it('Enter num campo da lista abre uma linha nova e não envia o formulário', () => {
        renderSumarioNoModal([{ nivel: 1, item: 'A', pagina: '1' }]);
        const campo = linhas()[0].querySelector('[data-sumario="item"]');
        const ev = new window.KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
        });
        campo.dispatchEvent(ev);
        assert.equal(ev.defaultPrevented, true);
        assert.equal(linhas().length, 2);
    });

    it('limpar esvazia a lista', () => {
        renderSumarioNoModal([{ nivel: 1, item: 'A', pagina: '1' }]);
        limparSumarioDoModal();
        assert.equal(linhas().length, 0);
        assert.equal(document.getElementById('el-sumario-contagem').textContent, 'Nenhum item');
    });

    it('ligar duas vezes não duplica os botões', () => {
        ligarSumarioNoModal();
        ligarSumarioNoModal();
        document.getElementById('el-sumario-adicionar').click();
        assert.equal(linhas().length, 1);
    });
});

describe('Sumário na tela: o que vai para o banco', () => {
    it('linha sem título é descartada e a página fica como texto', () => {
        montarModal();
        renderSumarioNoModal([
            { nivel: 1, item: 'Capítulo', pagina: '15' },
            { nivel: 2, item: '   ', pagina: '16' },
        ]);
        assert.deepEqual(camposDoSumario('Sumário', lerSumarioDoModal()), {
            itensSumario: [{ nivel: 1, item: 'Capítulo', pagina: '15' }],
        });
    });

    it('trocar o tipo para outro não guarda os itens', () => {
        montarModal();
        renderSumarioNoModal([{ nivel: 1, item: 'Capítulo', pagina: '15' }]);
        assert.deepEqual(camposDoSumario('Introdução', lerSumarioDoModal()), {});
    });

    it('o modal está ligado ao salvar e ao abrir em forms.js', () => {
        const forms = readFileSync(new URL('../js/forms.js', import.meta.url), 'utf8');
        assert.match(forms, /camposDoSumario\(tipoEscolhido, lerSumarioDoModal\(\)\)/);
        assert.match(forms, /renderSumarioNoModal\(el\.itensSumario \|\| \[\]\)/);
        assert.match(forms, /ligarSumarioNoModal\(\)/);
    });
});

describe('Sumário no card do elemento', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <select id="filtro-livro-elementos"></select>
            <select id="filtro-tipo-elementos"></select>
            <div id="lista-elementos"></div>`;
        db.livros.length = 0;
        db.partes.length = 0;
        db.secoes.length = 0;
        db.elementos.length = 0;
        setFiltroLivroElementos('');
        setFiltroTipoElementos('');
        db.livros.push({ id: 1, titulo: 'Livro A', tipo: 'Livro', sequencia: 1 });
    });

    it('mostra os primeiros itens e a contagem', () => {
        const itensSumario = Array.from({ length: 8 }, (_, i) => ({
            nivel: 1 + (i % 2),
            item: `Item ${i + 1}`,
            pagina: String(i + 10),
        }));
        db.elementos.push({
            id: 5,
            tipo: 'Sumário',
            paiTipo: 'livro',
            paiId: 1,
            texto: '',
            itensSumario,
        });
        renderElementos();
        const card = document.getElementById('lista-elementos').textContent;
        assert.match(card, /Item 1/);
        assert.match(card, /Item 6/);
        assert.doesNotMatch(card, /Item 7/);
        assert.match(card, /e mais 2 itens/);
        assert.match(card, /8 itens no sumário/);
    });

    it('escapa HTML no título do item', () => {
        db.elementos.push({
            id: 6,
            tipo: 'Sumário',
            paiTipo: 'livro',
            paiId: 1,
            texto: '',
            itensSumario: [{ nivel: 1, item: '<b>x</b>', pagina: '' }],
        });
        renderElementos();
        assert.equal(document.querySelector('#lista-elementos b'), null);
    });

    it('elemento de outro tipo ou sem itens não ganha o bloco', () => {
        db.elementos.push({ id: 7, tipo: 'Sumário', paiTipo: 'livro', paiId: 1, texto: '' });
        db.elementos.push({ id: 8, tipo: 'Epígrafe', paiTipo: 'livro', paiId: 1, texto: '' });
        renderElementos();
        assert.doesNotMatch(document.getElementById('lista-elementos').textContent, /no sumário/);
    });

    it('Sumário com itens e sem texto não mostra "(Sem texto)"', () => {
        db.elementos.push({
            id: 9,
            tipo: 'Sumário',
            paiTipo: 'livro',
            paiId: 1,
            texto: '',
            itensSumario: [{ nivel: 1, item: 'Capítulo', pagina: '3' }],
        });
        renderElementos();
        const lista = document.getElementById('lista-elementos');
        assert.doesNotMatch(lista.textContent, /Sem texto/);
        assert.ok(lista.querySelector('[data-sem-texto-oculto]'));
    });

    it('Sumário com texto mostra o texto, e sem itens nem texto mantém o aviso', () => {
        db.elementos.push({
            id: 10,
            tipo: 'Sumário',
            paiTipo: 'livro',
            paiId: 1,
            texto: 'Descrição do sumário',
            itensSumario: [{ nivel: 1, item: 'Capítulo', pagina: '3' }],
        });
        db.elementos.push({ id: 11, tipo: 'Sumário', paiTipo: 'livro', paiId: 1, texto: '' });
        db.elementos.push({ id: 12, tipo: 'Epígrafe', paiTipo: 'livro', paiId: 1, texto: '' });
        renderElementos();
        const texto = document.getElementById('lista-elementos').textContent;
        assert.match(texto, /Descrição do sumário/);
        assert.equal((texto.match(/\(Sem texto\)/g) || []).length, 2);
    });
});
