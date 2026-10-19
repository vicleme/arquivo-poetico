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
