import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Fase 11, etapa 6: Personagens na coluna das tabelas, no `.md`, no `.csv`,
// na Visualização e na contagem ("Qtd.").
const { db } = await import('../js/db.js');
const { DEFINICAO_COLUNAS } = await import('../js/colunas.js');
const { badgesPersonagens } = await import('../js/celulas-tabela.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { CAMPOS_CONTAVEIS } = await import('../js/utils.js');
const { textoPersonagensComPapel } = await import('../js/personagens.js');

function montar() {
    db.personagens = [
        { id: 1, nome: 'Capitu' },
        { id: 2, nome: 'Bento' },
        { id: 3, nome: 'Escobar' },
    ];
    db.poemas = [
        {
            id: 1,
            titulo: 'Olhos',
            texto: 'x',
            personagens: [
                {
                    personagemId: 1,
                    papeis: ['Voz', 'Aparição'],
                    centralidade: 'protagonista',
                    papelNarrativo: ['narradora'],
                },
                { personagemId: 2, papeis: ['Interlocutor'], centralidade: '' },
                // gravado por engano: só Alusão, a centralidade não se aplica
                { personagemId: 3, papeis: ['Alusão'], centralidade: 'secundario' },
                { personagemId: 99, papeis: ['Voz'] },
            ],
        },
        { id: 2, titulo: 'Vazio', texto: 'y' },
    ];
    db.prosas = [];
}

describe('coluna Personagens', () => {
    beforeEach(montar);

    it('existe em Poemas e Prosas, desligada por padrão, antes de Pessoas', () => {
        for (const t of ['poemas', 'prosas']) {
            const cols = DEFINICAO_COLUNAS[t].map((c) => c.key);
            const i = cols.indexOf('personagens');
            assert.ok(i > -1, t);
            assert.ok(i < cols.indexOf('pessoas'), t);
            assert.equal(DEFINICAO_COLUNAS[t][i].default, false);
        }
    });

    it('chip com iniciais dos papéis e ★/☆ só onde a centralidade se aplica', () => {
        const html = badgesPersonagens(db.poemas[0]);
        assert.match(html, /Capitu <span[^>]*>Vo·Ap<\/span>.*★/s);
        assert.match(html, /title="Capitu \(Voz, Aparição; protagonista\)"/);
        assert.match(html, /title="Bento \(Interlocutor\)"/);
        assert.doesNotMatch(html, /Bento[^]*?☆[^]*?Escobar/);
        assert.match(html, /title="Escobar \(Alusão\)"/);
        assert.doesNotMatch(html, /☆/);
        assert.doesNotMatch(html, /undefined|99/);
    });

    it('sem personagens mostra o traço', () => {
        assert.match(badgesPersonagens(db.poemas[1]), /—/);
        assert.match(badgesPersonagens({ personagens: [{ personagemId: 99 }] }), /—/);
    });
});

describe('texto do grupo Personagens', () => {
    beforeEach(montar);

    it('papéis, centralidade e relação entre parênteses', () => {
        assert.equal(
            textoPersonagensComPapel(db.poemas[0], db.personagens),
            'Capitu (Voz, Aparição; protagonista; papel narrativo: narradora), Bento (Interlocutor), Escobar (Alusão)',
        );
    });

    it('vínculo sem nada sai só com o nome; sem personagens, vazio', () => {
        const t = { personagens: [{ personagemId: 2, papeis: [], centralidade: '' }] };
        assert.equal(textoPersonagensComPapel(t, db.personagens), 'Bento');
        assert.equal(textoPersonagensComPapel(db.poemas[1], db.personagens), '');
    });
});

describe('.md e Visualização', () => {
    beforeEach(montar);

    it('o .md ganha a linha Personagens só quando há personagem', () => {
        const md = gerarMarkdownExportacao(db.poemas);
        assert.equal(md.match(/\*\*Personagens:\*\*/g).length, 1);
        assert.match(md, /\*\*Personagens:\*\* Capitu \(Voz, Aparição; protagonista/);
    });

    it('a Visualização mostra a mesma linha', () => {
        const html = renderVisualizacaoHtml(db.poemas[0]);
        assert.match(html, /Personagens/);
        assert.match(html, /Capitu \(Voz, Aparição; protagonista/);
        assert.doesNotMatch(renderVisualizacaoHtml(db.poemas[1]), /Personagens/);
    });
});

describe('.csv', () => {
    beforeEach(montar);

    function linha(item) {
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', item)], db);
        const [cab, ...resto] = csv
            .replace(/^\uFEFF/, '')
            .trim()
            .split(/\r?\n/);
        const cols = cab.split(',');
        const vals = resto[0].split(',');
        return Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
    }

    it('uma coluna por papel e por centralidade, ao lado de `personagens`', () => {
        const l = linha(db.poemas[0]);
        assert.equal(l.personagens, 'Capitu | Bento | Escobar');
        assert.equal(l.personagem_voz, 'Capitu');
        assert.equal(l.personagem_interlocutor, 'Bento');
        assert.equal(l.personagem_aparicao, 'Capitu');
        assert.equal(l.personagem_mencao, '');
        assert.equal(l.personagem_alusao, 'Escobar');
        assert.equal(l.personagem_protagonista, 'Capitu');
        assert.equal(l.personagem_secundario, '');
        assert.equal(l.personagem_sem_centralidade, 'Bento');
    });

    it('texto sem personagens deixa tudo vazio', () => {
        const l = linha(db.poemas[1]);
        assert.equal(l.personagem_voz, '');
        assert.equal(l.personagem_sem_centralidade, '');
    });
});

describe('Qtd. Personagens', () => {
    it('conta os vínculos do texto', () => {
        assert.equal(CAMPOS_CONTAVEIS.personagens.contar({ personagens: [{}, {}] }, db), 2);
        assert.equal(CAMPOS_CONTAVEIS.personagens.contar({}, db), 0);
    });
});
