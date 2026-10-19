import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Data de acesso (`dataAcesso`) dos links de Intertextualidade,
// Hipertextualidade, Referências e Anexos (Poema). Esqueleto de DOM antes do
// import, como em editor.test.js (o módulo de Pessoas procura estes elementos
// ao carregar).
const bloco = (nome, extra = '') => `
    <input id="p-${nome}-tipo" />
    ${extra}
    <input id="p-${nome}-link" />
    <input id="p-${nome}-data-acesso" type="date" />
    <input id="p-${nome}-link-texto" />
    <input id="p-${nome}-nota" />
    <button id="p-${nome}-btn-add"></button>
    <button id="p-${nome}-btn-cancelar" class="hidden"></button>
    <div id="p-${nome}-lista"></div>`;

document.body.innerHTML = `
    <div id="p-pessoa-input-wrapper">
        <input id="p-pessoa-input" />
        <div id="p-pessoas-container"></div>
        <div id="p-pessoas-grupos-info"></div>
    </div>
    <input id="p-grupo-direto-input" />
    <div id="p-grupos-diretos-container"></div>
    <input id="pr-grupo-direto-input" />
    <div id="pr-grupos-diretos-container"></div>
    <input id="p-fonte-link" />
    <input id="p-fonte-data-acesso" type="date" />
    ${bloco('intertexto', '<input id="p-intertexto-texto" />')}
    ${bloco('refext', '<input id="p-refext-texto" />')}
    ${bloco(
        'hipertexto',
        '<input id="p-hipertexto-relacao" /><input id="p-hipertexto-hipotexto" />',
    )}
    <select id="p-anexo-tipo">
        <option value=""></option>
        <option value="Foto">Foto</option>
        <option value="Declamação em vídeo">Declamação em vídeo</option>
    </select>
    <input id="p-anexo-link" />
    <input id="p-anexo-data-acesso" type="date" />
    <input id="p-anexo-link-texto" />
    <textarea id="p-anexo-input"></textarea>
    <button id="p-anexo-btn-add"></button>
    <button id="p-anexo-btn-cancelar" class="hidden"></button>
    <div id="p-anexos-lista"></div>
    <div id="pr-sinalizacoes-corpo"></div>
`;

const ed = await import('../js/editor.js');
const { formatarDataAcesso, hojeIso } = await import('../js/utils.js');

const val = (id, v) => (document.getElementById(id).value = v);
const lista = (id) => document.getElementById(id).innerHTML;

function limpar() {
    document.querySelectorAll('input, textarea, select').forEach((el) => (el.value = ''));
    ed.resetIntertextualidade('poemas');
    ed.resetHipertextualidade('poemas');
    ed.resetReferenciasExternas('poemas');
    ed.resetAnexos('poemas');
}

describe('formatarDataAcesso e hojeIso (utils.js)', () => {
    it('ISO completo vira dd/mm/aaaa; qualquer outra coisa vira vazio', () => {
        assert.equal(formatarDataAcesso('2026-10-18'), '18/10/2026');
        assert.equal(formatarDataAcesso(' 2026-01-05 '), '05/01/2026');
        assert.equal(formatarDataAcesso(''), '');
        assert.equal(formatarDataAcesso(undefined), '');
        assert.equal(formatarDataAcesso('2026-10'), '');
        assert.equal(formatarDataAcesso('18/10/2026'), '');
    });

    it('hojeIso usa a data local, com zero à esquerda', () => {
        assert.equal(hojeIso(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
        assert.equal(hojeIso(new Date(2026, 9, 18)), '2026-10-18');
    });
});

describe('Data de acesso — Intertextualidade (Poema)', () => {
    beforeEach(limpar);

    it('salva a data junto do link e mostra "(acesso em dd/mm/aaaa)" na lista', () => {
        val('p-intertexto-texto', 'Águas de Março');
        val('p-intertexto-link', 'https://exemplo.com/a');
        val('p-intertexto-data-acesso', '2026-10-18');
        ed.adicionarIntertexto('poemas');

        const [item] = ed.obterIntertextualidade('poemas');
        assert.equal(item.dataAcesso, '2026-10-18');
        assert.match(lista('p-intertexto-lista'), /\(acesso em 18\/10\/2026\)/);
        assert.equal(document.getElementById('p-intertexto-data-acesso').value, '');
    });

    it('sem link, a data é descartada (não existe acesso sem link)', () => {
        val('p-intertexto-texto', 'Só texto');
        val('p-intertexto-data-acesso', '2026-10-18');
        ed.adicionarIntertexto('poemas');

        const [item] = ed.obterIntertextualidade('poemas');
        assert.equal('dataAcesso' in item, false);
        assert.doesNotMatch(lista('p-intertexto-lista'), /acesso em/);
    });

    it('só a data preenchida não cria item', () => {
        val('p-intertexto-data-acesso', '2026-10-18');
        ed.adicionarIntertexto('poemas');
        assert.deepEqual(ed.obterIntertextualidade('poemas'), []);
    });

    it('link sem data não grava a chave dataAcesso (formato antigo intacto)', () => {
        val('p-intertexto-texto', 'X');
        val('p-intertexto-link', 'https://exemplo.com/a');
        ed.adicionarIntertexto('poemas');
        assert.equal('dataAcesso' in ed.obterIntertextualidade('poemas')[0], false);
    });

    it('editar carrega a data no campo e cancelar limpa', () => {
        val('p-intertexto-texto', 'X');
        val('p-intertexto-link', 'https://exemplo.com/a');
        val('p-intertexto-data-acesso', '2026-10-18');
        ed.adicionarIntertexto('poemas');

        ed.editarIntertexto('poemas', 0);
        assert.equal(document.getElementById('p-intertexto-data-acesso').value, '2026-10-18');

        ed.cancelarEdicaoIntertexto('poemas');
        assert.equal(document.getElementById('p-intertexto-data-acesso').value, '');
    });

    it('item antigo (sem dataAcesso) abre com a data vazia', () => {
        ed.carregarIntertextualidade('poemas', [
            { tipo: 'Música', texto: 'Y', link: 'https://exemplo.com/y', linkTexto: '', nota: '' },
        ]);
        ed.editarIntertexto('poemas', 0);
        assert.equal(document.getElementById('p-intertexto-data-acesso').value, '');
    });
});

describe('Data de acesso — Hipertextualidade e Referências (Poema)', () => {
    beforeEach(limpar);

    it('Hipertextualidade salva e mostra a data', () => {
        val('p-hipertexto-relacao', 'Paródia');
        val('p-hipertexto-hipotexto', 'Soneto X');
        val('p-hipertexto-link', 'https://exemplo.com/h');
        val('p-hipertexto-data-acesso', '2026-03-02');
        ed.adicionarHipertextualidade('poemas');

        assert.equal(ed.obterHipertextualidade('poemas')[0].dataAcesso, '2026-03-02');
        assert.match(lista('p-hipertexto-lista'), /\(acesso em 02\/03\/2026\)/);
    });

    it('Referências salva, recarrega na edição e mostra a data', () => {
        val('p-refext-texto', 'Enchente de 2011');
        val('p-refext-link', 'https://exemplo.com/r');
        val('p-refext-data-acesso', '2026-10-18');
        ed.adicionarReferenciaExterna('poemas');

        assert.equal(ed.obterReferenciasExternas('poemas')[0].dataAcesso, '2026-10-18');
        assert.match(lista('p-refext-lista'), /\(acesso em 18\/10\/2026\)/);

        ed.editarReferenciaExterna('poemas', 0);
        assert.equal(document.getElementById('p-refext-data-acesso').value, '2026-10-18');
    });
});

describe('Anexos — Texto do link e Data de acesso (Poema)', () => {
    beforeEach(limpar);

    it('salva linkTexto e dataAcesso; a lista usa o texto como rótulo e quebra URL longa', () => {
        val('p-anexo-tipo', 'Foto');
        val('p-anexo-link', 'https://exemplo.com/uma/url/bem/longa');
        val('p-anexo-link-texto', 'Foto no Drive');
        val('p-anexo-data-acesso', '2026-10-18');
        val('p-anexo-input', 'Foto da capa');
        ed.adicionarAnexo('poemas');

        const [item] = ed.obterAnexos('poemas');
        assert.equal(item.linkTexto, 'Foto no Drive');
        assert.equal(item.dataAcesso, '2026-10-18');
        const html = lista('p-anexos-lista');
        assert.match(html, />Foto no Drive<\/a>/);
        assert.doesNotMatch(html, />https:\/\/exemplo\.com/);
        assert.match(html, /break-all/);
        assert.match(html, /\(acesso em 18\/10\/2026\)/);
    });

    it('sem Texto do link, o rótulo cai para a URL; item antigo segue igual', () => {
        ed.carregarAnexos('poemas', [
            { tipo: 'Foto', texto: 'Velha', link: 'https://exemplo.com/v' },
        ]);
        assert.match(lista('p-anexos-lista'), />https:\/\/exemplo\.com\/v<\/a>/);
        assert.doesNotMatch(lista('p-anexos-lista'), /acesso em/);

        val('p-anexo-tipo', 'Foto');
        val('p-anexo-link', 'https://exemplo.com/n');
        ed.adicionarAnexo('poemas');
        const novo = ed.obterAnexos('poemas')[1];
        assert.deepEqual(novo, { tipo: 'Foto', texto: '', link: 'https://exemplo.com/n' });
    });

    it('editar carrega os dois campos novos e cancelar limpa', () => {
        val('p-anexo-tipo', 'Foto');
        val('p-anexo-link', 'https://exemplo.com/a');
        val('p-anexo-link-texto', 'Rótulo');
        val('p-anexo-data-acesso', '2026-10-18');
        ed.adicionarAnexo('poemas');

        ed.editarAnexo('poemas', 0);
        assert.equal(document.getElementById('p-anexo-link-texto').value, 'Rótulo');
        assert.equal(document.getElementById('p-anexo-data-acesso').value, '2026-10-18');

        ed.cancelarEdicaoAnexo('poemas');
        assert.equal(document.getElementById('p-anexo-link-texto').value, '');
        assert.equal(document.getElementById('p-anexo-data-acesso').value, '');
    });

    it('vídeo sem link continua barrado', () => {
        val('p-anexo-tipo', 'Declamação em vídeo');
        val('p-anexo-link-texto', 'só o rótulo');
        ed.adicionarAnexo('poemas');
        assert.deepEqual(ed.obterAnexos('poemas'), []);
    });
});

describe('ligarDataAcessoAoLink: hoje ao digitar o link (Poema)', () => {
    beforeEach(limpar);

    const digitar = (id, v) => {
        val(id, v);
        document.getElementById(id).dispatchEvent(new Event('input', { bubbles: true }));
    };

    it('preenche com hoje quando o link ganha texto e a data está vazia, nos quatro blocos e na Fonte', () => {
        ed.ligarDataAcessoAoLink('p');
        for (const nome of ['intertexto', 'hipertexto', 'refext', 'anexo', 'fonte']) {
            digitar(`p-${nome}-link`, 'https://exemplo.com');
            assert.equal(document.getElementById(`p-${nome}-data-acesso`).value, hojeIso(), nome);
        }
    });

    it('não troca uma data já preenchida e não preenche com link vazio', () => {
        ed.ligarDataAcessoAoLink('p');
        val('p-refext-data-acesso', '2020-01-01');
        digitar('p-refext-link', 'https://exemplo.com');
        assert.equal(document.getElementById('p-refext-data-acesso').value, '2020-01-01');

        digitar('p-intertexto-link', '   ');
        assert.equal(document.getElementById('p-intertexto-data-acesso').value, '');
    });
});
