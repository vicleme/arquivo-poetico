import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { gerarMarkdownAssuntos } from '../js/exportar-assuntos.js';

// Formato pensado pra colar num prompt de IA (ver o comentário do
// módulo): texto simples, um "##" por Assunto com seus Temas e a
// contagem de textos, e por fim os Temas sem assunto.
describe('gerarMarkdownAssuntos', () => {
    const assuntos = [
        {
            id: 1,
            nome: 'Sociedade',
            notas: 'Crítica social em geral',
            temas: ['Machismo', 'Polarização'],
        },
        { id: 2, nome: 'Gênero', notas: '', temas: ['machismo', 'Objetificação'] },
    ];
    const textos = [
        { sinalizacoesTema: 'Machismo, Brasil' },
        { sinalizacoesTema: 'machismo' },
        { sinalizacoesTema: 'Polarização' },
    ];

    it('lista cada Assunto com seus Temas e a contagem de textos', () => {
        const md = gerarMarkdownAssuntos(assuntos, textos);
        assert.match(md, /## Sociedade\n\n- Machismo \(2\)\n- Polarização \(1\)/);
        assert.match(md, /## Gênero\n\n- machismo \(2\)\n- Objetificação \(0\)/);
    });

    it('a contagem do tema ignora caixa/acento e usa o valor real do texto', () => {
        // "Machismo" no cadastro do Assunto 1, mas os textos têm "Machismo" e
        // "machismo" — os dois contam juntos.
        const md = gerarMarkdownAssuntos(assuntos, textos);
        assert.match(md, /- Machismo \(2\)/);
    });

    it('mostra as notas do Assunto quando existem, e omite quando vazias', () => {
        const md = gerarMarkdownAssuntos(assuntos, textos);
        assert.match(md, /\*\*Notas:\*\* Crítica social em geral/);
        const blocoGenero = md.split('## Gênero')[1];
        assert.ok(!blocoGenero.includes('**Notas:**'));
    });

    it('Assunto sem nenhum tema mostra um marcador de lista vazia', () => {
        const md = gerarMarkdownAssuntos([{ id: 9, nome: 'Vazio', temas: [] }], []);
        assert.match(md, /## Vazio\n\n- \(nenhum tema ainda\)/);
    });

    it('sem assuntos cadastrados, avisa isso em vez de gerar lista vazia', () => {
        const md = gerarMarkdownAssuntos([], []);
        assert.match(md, /_Nenhum assunto cadastrado ainda\._/);
    });

    it('lista os Temas sem assunto, mais usados primeiro, com contagem', () => {
        const md = gerarMarkdownAssuntos(assuntos, textos);
        const secao = md.split('## Temas sem assunto')[1];
        assert.match(secao, /- Brasil \(1\)/);
        assert.ok(!secao.includes('Machismo'));
    });

    it('quando todos os temas em uso já têm assunto, avisa isso', () => {
        const md = gerarMarkdownAssuntos(assuntos, [{ sinalizacoesTema: 'Machismo' }]);
        const secao = md.split('## Temas sem assunto')[1];
        assert.match(secao, /_Nenhum — todos os temas em uso já pertencem a algum assunto\._/);
    });
});
