// Exportação da Vitrine de leitura para .md (aba Assuntos, bloco da vitrine).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { gerarMarkdownVitrine } from '../js/exportar-vitrine.js';

function montar() {
    return {
        temas: [
            { id: 1, nome: 'Amor' },
            { id: 2, nome: 'Perda' },
            { id: 3, nome: 'Água' },
            { id: 4, nome: 'Saudade' },
            { id: 5, nome: 'Cidade' },
        ],
        temasUniversais: [
            { id: 'u1', nome: 'Quando o amor acaba', temaIds: [2, 1] },
            { id: 'u2', nome: 'Convite vazio', temaIds: [] },
        ],
        poemas: [
            { id: 1, sinalizacoesTema: 'Amor, Perda' },
            { id: 2, sinalizacoesTema: 'amor, Saudade' },
        ],
        prosas: [{ id: 3, sinalizacoesTema: 'Saudade, Cidade, Saudade' }],
    };
}

describe('gerarMarkdownVitrine', () => {
    it('lista cada convite, na ordem da tela, com seus temas em ordem alfabética e a contagem', () => {
        const md = gerarMarkdownVitrine(montar());
        assert.match(md, /^# Vitrine de leitura\n/);
        assert.match(md, /## Quando o amor acaba \(2 temas\)\n\n- Amor \(2\)\n- Perda \(1\)\n/);
        assert.ok(md.indexOf('## Quando o amor acaba') < md.indexOf('## Convite vazio'));
    });

    it('termina com "Temas fora da vitrine", os mais usados primeiro e a contagem de textos', () => {
        const md = gerarMarkdownVitrine(montar());
        const fim = md.split('## Temas fora da vitrine')[1];
        assert.match(fim, /^ \(3\)\n\n- Saudade \(2\)\n- Cidade \(1\)\n- Água \(0\)\n$/);
    });

    it('um tema que está em algum convite não aparece fora da vitrine', () => {
        const md = gerarMarkdownVitrine(montar());
        const fim = md.split('## Temas fora da vitrine')[1];
        assert.doesNotMatch(fim, /Amor|Perda/);
    });

    it('um tema em dois convites aparece nos dois', () => {
        const db = montar();
        db.temasUniversais[1].temaIds = [1];
        const md = gerarMarkdownVitrine(db);
        assert.match(md, /## Convite vazio \(1 tema\)\n\n- Amor \(2\)\n/);
        assert.match(md, /## Quando o amor acaba \(2 temas\)\n\n- Amor \(2\)\n/);
    });

    it('convite sem temas avisa que fica escondido do sorteio', () => {
        const md = gerarMarkdownVitrine(montar());
        assert.match(
            md,
            /## Convite vazio \(0 temas\)\n\n_Nenhum tema ainda \(o convite fica escondido do sorteio\)\._/,
        );
    });

    it('resume convites e temas fora da vitrine, no singular quando for um', () => {
        assert.match(gerarMarkdownVitrine(montar()), /2 convites, 3 temas fora da vitrine\./);
        const db = montar();
        db.temasUniversais = [{ id: 'u1', nome: 'Único', temaIds: [1, 2, 3, 4] }];
        assert.match(gerarMarkdownVitrine(db), /1 convite, 1 tema fora da vitrine\./);
    });

    it('sem convites, todos os temas ficam fora da vitrine', () => {
        const db = montar();
        db.temasUniversais = [];
        const md = gerarMarkdownVitrine(db);
        assert.match(md, /0 convites, 5 temas fora da vitrine\./);
        assert.match(md, /_Nenhum convite ainda: todos os temas estão fora da vitrine\._/);
        assert.match(md, /## Temas fora da vitrine \(5\)/);
    });

    it('sem a propriedade temasUniversais no db também funciona', () => {
        const db = montar();
        delete db.temasUniversais;
        assert.match(gerarMarkdownVitrine(db), /## Temas fora da vitrine \(5\)/);
        assert.equal(db.temasUniversais, undefined);
    });

    it('avisa quando todos os temas já estão em algum convite', () => {
        const db = montar();
        db.temasUniversais = [{ id: 'u1', nome: 'Tudo', temaIds: [1, 2, 3, 4, 5] }];
        assert.match(
            gerarMarkdownVitrine(db),
            /## Temas fora da vitrine \(0\)\n\n_Nenhum: todos os temas já estão em algum convite\._/,
        );
    });

    it('sem nenhum tema cadastrado devolve só o aviso', () => {
        const md = gerarMarkdownVitrine({ temas: [], poemas: [], prosas: [] });
        assert.equal(md, '# Vitrine de leitura\n\n_Nenhum tema cadastrado ainda._\n');
    });
});
