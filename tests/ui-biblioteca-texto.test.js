import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { db } from '../js/db.js';
import {
    prepararFormTextoBiblioteca,
    atualizarPreviaTextoBiblioteca,
    enviarTextoParaImportacao,
    limparFormTextoBiblioteca,
} from '../js/ui-biblioteca-texto.js';

// O formulário vem do index.html real: se um id mudar lá, este teste quebra.
const html = fs.readFileSync('index.html', 'utf-8');
const inicio = html.indexOf('<details\n                    id="biblioteca-importar-texto"');
const fim = html.indexOf('</details>', inicio) + '</details>'.length;
const FORM = html.slice(inicio, fim);

function montarTela() {
    document.body.innerHTML = `
        ${FORM}
        <div id="importacao-aditiva-preview"></div>
        <div id="importacao-aditiva-acoes" class="hidden"></div>
        <button id="btn-aplicar-importacao-aditiva"></button>
        <input id="importacao-aditiva-arquivo" />`;
}

function preencher(valores) {
    for (const [sufixo, v] of Object.entries(valores)) {
        const campo = document.getElementById(`bt-${sufixo}`);
        if (campo.type === 'checkbox') campo.checked = v;
        else campo.value = v;
    }
}

const TEXTO = '# Versos Íntimos\nVês! Ninguém assistiu\n\n# Outro\nx\n';

describe('Importar de texto (aba Biblioteca)', () => {
    beforeEach(() => {
        montarTela();
        db.autores.length = 0;
    });

    it('o formulário existe no index.html', () => {
        assert.ok(FORM.length > 100, 'trecho do formulário não encontrado no index.html');
        assert.ok(document.getElementById('bt-texto'));
    });

    it('prévia lista os títulos reconhecidos', () => {
        preencher({ texto: TEXTO });
        atualizarPreviaTextoBiblioteca();
        const prev = document.getElementById('bt-previa').innerHTML;
        assert.match(prev, /2 texto\(s\) reconhecido\(s\)/);
        assert.match(prev, /Versos Íntimos/);
        assert.match(prev, /Outro/);
    });

    it('prévia avisa de texto antes do primeiro título e de texto sem título', () => {
        preencher({ texto: 'lixo\n# A\nx\n' });
        atualizarPreviaTextoBiblioteca();
        assert.match(document.getElementById('bt-previa').innerHTML, /será ignorado/);

        preencher({ texto: 'só versos' });
        atualizarPreviaTextoBiblioteca();
        assert.match(document.getElementById('bt-previa').innerHTML, /Nenhum texto reconhecido/);
    });

    it('prévia escapa HTML do título (não injeta marcação)', () => {
        preencher({ texto: '# <img src=x onerror=alert(1)>\nv\n' });
        atualizarPreviaTextoBiblioteca();
        const prev = document.getElementById('bt-previa');
        assert.equal(prev.querySelector('img'), null);
        assert.match(prev.innerHTML, /&lt;img/);
    });

    it('prévia mostra o domínio público derivado do óbito (livre e protegido)', () => {
        preencher({ texto: TEXTO, autor: 'Fulano', 'obito-ano': '1914' });
        atualizarPreviaTextoBiblioteca();
        assert.match(document.getElementById('bt-previa').innerHTML, /domínio público desde 1985/);

        preencher({ 'obito-ano': '2010' });
        atualizarPreviaTextoBiblioteca();
        assert.match(document.getElementById('bt-previa').innerHTML, /ainda protegido até 2080/);
    });

    it('Autor já cadastrado: avisa que o cadastro não muda e usa o óbito dele', () => {
        db.autores.push({ id: 3, nome: 'Fulano', obito: { ano: 1914 } });
        preencher({ texto: TEXTO, autor: 'fulano', 'obito-ano': '2010' });
        atualizarPreviaTextoBiblioteca();
        const prev = document.getElementById('bt-previa').innerHTML;
        assert.match(prev, /Autor já cadastrado/);
        assert.match(prev, /desde 1985/); // o do cadastro, não o 2010 digitado
    });

    it('sugere os Autores do acervo no campo Autor', () => {
        db.autores.push({ id: 1, nome: 'Zé' }, { id: 2, nome: 'Ana <b>' });
        prepararFormTextoBiblioteca();
        const opcoes = [...document.querySelectorAll('#bt-autores-existentes option')].map(
            (o) => o.value,
        );
        assert.deepEqual(opcoes, ['Ana <b>', 'Zé']);
    });

    it('enviar sem Autor: recusa e não abre a Importação', () => {
        preencher({ texto: TEXTO });
        assert.equal(enviarTextoParaImportacao(), false);
        assert.equal(document.getElementById('importacao-aditiva-preview').innerHTML, '');
    });

    it('enviar sem texto reconhecido: recusa', () => {
        preencher({ texto: 'sem título', autor: 'Fulano' });
        assert.equal(enviarTextoParaImportacao(), false);
    });

    it('enviar entrega o payload à Importação Aditiva e não grava nada no acervo', () => {
        const poemasAntes = db.poemas.length;
        preencher({
            texto: TEXTO,
            autor: 'Fulano',
            'obito-ano': '1900',
            fonte: 'Wikisource',
            conferido: true,
        });
        assert.equal(enviarTextoParaImportacao(), true);

        const preview = document.getElementById('importacao-aditiva-preview').innerHTML;
        assert.match(preview, /2 item\(ns\) no arquivo/);
        assert.match(preview, /Versos Íntimos/);
        assert.equal(db.poemas.length, poemasAntes);
        assert.equal(db.autores.length, 0);
    });

    it('Tipo: nasce Poema; a prévia diz como os textos serão reconhecidos', () => {
        assert.equal(document.getElementById('bt-tipo').value, 'poema');
        preencher({ texto: TEXTO });
        atualizarPreviaTextoBiblioteca();
        assert.match(document.getElementById('bt-previa').innerHTML, /reconhecido\(s\) como Poema/);

        preencher({ tipo: 'prosa' });
        atualizarPreviaTextoBiblioteca();
        assert.match(document.getElementById('bt-previa').innerHTML, /reconhecido\(s\) como Prosa/);
    });

    it('Tipo Prosa: a Importação recebe os itens como Prosa', () => {
        preencher({ texto: TEXTO, autor: 'Fulano', tipo: 'prosa' });
        assert.equal(enviarTextoParaImportacao(), true);
        const preview = document.getElementById('importacao-aditiva-preview').innerHTML;
        assert.match(preview, /Prosa/);
        assert.doesNotMatch(preview, /Tipo de item desconhecido/);
    });

    it('limpar devolve o Tipo a Poema', () => {
        preencher({ texto: TEXTO, autor: 'Fulano', tipo: 'prosa' });
        limparFormTextoBiblioteca();
        assert.equal(document.getElementById('bt-tipo').value, 'poema');
    });

    it('limpar zera campos, checkbox e prévia', () => {
        preencher({ texto: TEXTO, autor: 'Fulano', conferido: true });
        limparFormTextoBiblioteca();
        assert.equal(document.getElementById('bt-texto').value, '');
        assert.equal(document.getElementById('bt-autor').value, '');
        assert.equal(document.getElementById('bt-conferido').checked, false);
        assert.match(document.getElementById('bt-previa').innerHTML, /Cole o texto/);
    });
});
