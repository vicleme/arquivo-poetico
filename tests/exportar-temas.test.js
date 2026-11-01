// Exportação do cadastro de Temas para .md (aba Temas, "Baixar .md").
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { gerarMarkdownTemas } from '../js/exportar-temas.js';

function montar() {
    return {
        temas: [
            { id: 1, nome: 'Machismo', notas: '' },
            { id: 2, nome: 'Polarização', notas: 'Política\nbrasileira' },
            { id: 3, nome: 'Água', notas: '' },
            { id: 4, nome: 'Saudade', notas: '' },
        ],
        assuntos: [
            { id: 10, nome: 'Sociedade', temaIds: [1, 2] },
            { id: 11, nome: 'Gênero', temaIds: [1] },
        ],
        poemas: [
            { id: 1, sinalizacoesTema: 'Machismo, Polarização' },
            { id: 2, sinalizacoesTema: 'machismo' },
        ],
        prosas: [{ id: 3, sinalizacoesTema: 'Saudade' }],
    };
}

describe('gerarMarkdownTemas', () => {
    it('separa os temas com assunto dos sem assunto, cada grupo em ordem alfabética', () => {
        const md = gerarMarkdownTemas(montar());
        assert.match(md, /^# Temas\n/);
        const comAssunto = md.split('## Temas sem assunto')[0];
        const semAssunto = md.split('## Temas sem assunto')[1];
        assert.match(comAssunto, /- Machismo[\s\S]*- Polarização/);
        assert.match(semAssunto, /- Água \(0\)\n- Saudade \(1\)/);
    });

    it('mostra a contagem de textos (Poemas e Prosas) e os assuntos de cada tema', () => {
        const md = gerarMarkdownTemas(montar());
        assert.match(md, /- Machismo \(2\)\. Assuntos: Gênero, Sociedade/);
        assert.match(md, /- Polarização \(1\)\. Assuntos: Sociedade/);
    });

    it('junta as quebras de linha da nota em uma linha e omite nota vazia', () => {
        const md = gerarMarkdownTemas(montar());
        assert.match(
            md,
            /- Polarização \(1\)\. Assuntos: Sociedade\n {2}Notas: Política brasileira/,
        );
        assert.doesNotMatch(md, /- Machismo[^\n]*\n {2}Notas/);
    });

    it('resume a quantidade de temas e de temas sem assunto', () => {
        assert.match(gerarMarkdownTemas(montar()), /4 temas, 2 sem assunto\./);
    });

    it('avisa quando um dos grupos está vazio', () => {
        const db = montar();
        db.assuntos = [];
        assert.match(gerarMarkdownTemas(db), /Nenhum: ainda não há tema ligado a um assunto\./);
        db.assuntos = [{ id: 10, nome: 'Tudo', temaIds: [1, 2, 3, 4] }];
        assert.match(
            gerarMarkdownTemas(db),
            /Nenhum: todos os temas já pertencem a algum assunto\./,
        );
    });

    it('sem nenhum tema cadastrado devolve só o aviso', () => {
        const md = gerarMarkdownTemas({ temas: [], assuntos: [], poemas: [], prosas: [] });
        assert.equal(md, '# Temas\n\n_Nenhum tema cadastrado ainda._\n');
    });
});

describe('gerarMarkdownTemas: valência e Vitrine de leitura', () => {
    const base = () => {
        const db = montar();
        db.temas[0].valencia = 'desagradavel'; // Machismo
        db.temas[3].valencia = 'ambivalente'; // Saudade
        db.temasUniversais = [
            { id: 'u1', nome: 'Corpo e gênero', temaIds: [1, 3] },
            { id: 'u2', nome: 'Saudade e memória', temaIds: [4] },
        ];
        return db;
    };

    it('cada tema mostra a vitrine depois dos assuntos, na ordem da tela', () => {
        const md = gerarMarkdownTemas(base());
        assert.match(
            md,
            /- Machismo \(2\)\. Valência: Desagradável\. Assuntos: Gênero, Sociedade\. Vitrine: Corpo e gênero/,
        );
        assert.match(md, /- Saudade \(1\)\. Valência: Ambivalente\. Vitrine: Saudade e memória/);
        assert.doesNotMatch(md, /- Polarização[^\n]*Vitrine/);
    });

    it('o resumo conta os temas sem valência e sem vitrine', () => {
        assert.match(
            gerarMarkdownTemas(base()),
            /4 temas, 2 sem assunto, 2 sem valência, 1 sem vitrine\./,
        );
    });

    it('o resumo não fala de valência nem de vitrine quando não são usadas', () => {
        const md = gerarMarkdownTemas(montar());
        assert.match(md, /4 temas, 2 sem assunto\./);
        assert.doesNotMatch(md, /Vitrine/);
    });

    it('lista os convites com os temas que reúnem, em ordem alfabética', () => {
        const md = gerarMarkdownTemas(base());
        const vitrine = md.split('## Vitrine de leitura')[1];
        assert.match(vitrine, /- Corpo e gênero \(2 temas\): Água, Machismo/);
        assert.match(vitrine, /- Saudade e memória \(1 tema\): Saudade/);
    });

    it('convite sem tema aparece com zero e sem dois pontos', () => {
        const db = base();
        db.temasUniversais.push({ id: 'u3', nome: 'Vazio', temaIds: [] });
        assert.match(gerarMarkdownTemas(db), /- Vazio \(0 temas\)\n/);
    });
});
