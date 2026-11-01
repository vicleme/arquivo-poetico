import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Modal Ver de Poema e Prosa: campos em grupos com título, recolhíveis. A ficha
// (campos curtos de cadastro) vem antes do texto; o que se consulta depois de ler
// vem depois. Os avisos de leitura ficam fora dos grupos.
const { db } = await import('../js/db.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');

const LS = 'arquivoPoetico_gruposVerAbertos';

function poema(extra = {}) {
    return {
        id: 1,
        tipo: 'poema',
        titulo: 'Olhos',
        texto: 'verso unico',
        autoria: [],
        notas: 'nota longa',
        pendencia: 'revisar',
        ...extra,
    };
}

const grupo = (html, chave) => {
    const m = html.match(new RegExp(`<details data-grupo-ver="${chave}"[\\s\\S]*?</details>`));
    return m ? m[0] : null;
};

describe('Ver: grupos com título', () => {
    beforeEach(() => {
        localStorage.clear();
        db.poemas = [poema()];
        db.prosas = [];
    });

    it('Identificação vem antes do Texto; Paratexto e Controle do acervo vêm depois', () => {
        const html = renderVisualizacaoHtml(poema({ idioma: 'Português' }));
        const iTexto = html.indexOf('>Texto</h4>');
        const iIdent = html.indexOf('data-grupo-ver="identificacao"');
        const iPara = html.indexOf('data-grupo-ver="paratexto"');
        const iCtrl = html.indexOf('data-grupo-ver="controle"');
        assert.ok(iTexto > 0 && iPara > iTexto && iCtrl > iPara);
        assert.ok(iIdent < 0 || iIdent < iTexto);
        assert.match(grupo(html, 'paratexto'), /nota longa/);
        assert.match(grupo(html, 'controle'), /revisar/);
    });

    it('grupo sem nenhum campo preenchido não aparece', () => {
        const html = renderVisualizacaoHtml(poema());
        assert.equal(grupo(html, 'recepcao'), null);
        assert.equal(grupo(html, 'avaliacao'), null);
        assert.equal(grupo(html, 'relacoes'), null);
    });

    it('todos os grupos começam recolhidos', () => {
        const html = renderVisualizacaoHtml(poema());
        assert.doesNotMatch(html, /<details[^>]*\sopen/);
    });

    it('a Autoria fica na Identificação, antes do texto, e os Elos ficam em Relações', () => {
        db.poemas = [poema(), poema({ id: 2, titulo: 'Outro', texto: 'y' })];
        const item = poema({
            autoria: [{ tipo: 'Autor', nome: 'Fulano' }],
            conceitos: { elos: [{ id: 2 }] },
        });
        const html = renderVisualizacaoHtml(item);
        const ident = grupo(html, 'identificacao');
        if (ident) assert.ok(html.indexOf(ident) < html.indexOf('>Texto</h4>'));
        assert.match(grupo(html, 'relacoes') || '', /Elos<\/h4>[\s\S]*<li[^>]*>Outro/);
        assert.doesNotMatch(html.slice(0, html.indexOf('>Texto</h4>')), /Elos/);
    });

    it('Conteúdo Sensível fica fora dos grupos, logo depois do texto', () => {
        const html = renderVisualizacaoHtml(poema({ conteudoSensivel: 'luto' }));
        const i = html.indexOf('Conteúdo Sensível');
        assert.ok(i > html.indexOf('>Texto</h4>'));
        assert.ok(!(grupo(html, 'controle') || '').includes('Conteúdo Sensível'));
        assert.ok(i < html.indexOf('data-grupo-ver="paratexto"'));
    });

    it('os grupos abertos são lembrados ao trocar de texto', () => {
        localStorage.setItem(LS, JSON.stringify(['paratexto']));
        // O módulo lê a preferência uma vez, no carregamento; aqui basta conferir
        // que o estado em memória (alimentado pelo toggle) é o que abre o grupo.
        const container = document.createElement('div');
        container.id = 'visualizar-conteudo';
        container.innerHTML = renderVisualizacaoHtml(poema());
        document.body.appendChild(container);
        const d = container.querySelector('details[data-grupo-ver="paratexto"]');
        container.querySelector('[data-grupo-ver-todos="abrir"]').click();
        assert.equal(d.open, true);
        const reaberto = renderVisualizacaoHtml(poema());
        assert.match(grupo(reaberto, 'paratexto'), /^<details[^>]*\sopen/);
        container.querySelector('[data-grupo-ver-todos="recolher"]').click();
        assert.doesNotMatch(renderVisualizacaoHtml(poema()), /<details[^>]*\sopen/);
        container.remove();
    });

    it('Ecos saem em lista, um por linha, com rótulo e nota', () => {
        db.poemas = [
            poema(),
            poema({ id: 2, titulo: 'Morradia', texto: 'y' }),
            poema({ id: 3, titulo: 'Podre', texto: 'z' }),
        ];
        const item = poema({
            conceitos: {
                ecos: [
                    { id: 2, texto: 'retoma a queda' },
                    { id: 3, texto: 'retoma o suicídio' },
                ],
            },
        });
        const rel = grupo(renderVisualizacaoHtml(item), 'relacoes');
        assert.match(rel, /Ecos<\/h4>\s*<ul/);
        const itens = [...rel.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
        assert.equal(itens.length, 2);
        assert.match(itens[0], /Morradia \(retoma a queda\)/);
        assert.match(itens[1], /Podre \(retoma o suicídio\)/);
    });
});
