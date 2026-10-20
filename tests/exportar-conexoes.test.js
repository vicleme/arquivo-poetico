// Relatório .md da aba Conexões (Elos, Ecos e Buracos).
import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { dadosConexoes, baixarConexoes } from '../js/render-conexoes.js';
import {
    gerarMarkdownConexoes,
    ESCOPOS_CONEXOES,
    NOME_ARQUIVO_CONEXOES,
} from '../js/exportar-conexoes.js';

function poema(id, titulo, conceitos = {}) {
    return { id, titulo, conceitos: { elos: [], ecos: [], ...conceitos } };
}

// Acervo de teste:
//  - Elos: A e B com os dois lados (par); C aponta para D e D não volta (buraco).
//  - Ecos: cadeia E → F → G (linear) e um grafo que converge: H → J, I → J.
function montarAcervo() {
    db.poemas = [
        poema(1, 'A', { elos: [{ id: 2, relacao: 'Resposta', direcao: 'destino', texto: '' }] }),
        poema(2, 'B', { elos: [{ id: 1, relacao: 'Resposta', direcao: 'origem', texto: '' }] }),
        poema(3, 'C', { elos: [{ id: 4, relacao: 'Reescrita', direcao: 'destino', texto: '' }] }),
        poema(4, 'D'),
        poema(5, 'E', { ecos: [{ id: 6, tipo: 'Tema', texto: '' }] }),
        poema(6, 'F', { ecos: [{ id: 7, tipo: 'Imagem', texto: '' }] }),
        poema(7, 'G'),
        poema(8, 'H', { ecos: [{ id: 10, tipo: 'Citação', texto: '' }] }),
        poema(9, 'I', { ecos: [{ id: 10, tipo: '', texto: '' }] }),
        poema(10, 'J'),
    ];
}

describe('gerarMarkdownConexoes (dados do acervo)', () => {
    beforeEach(() => {
        db.prosas = [];
        montarAcervo();
    });

    it('"tudo" traz resumo, buracos, elos e ecos, nessa ordem', () => {
        const md = gerarMarkdownConexoes(dadosConexoes(), 'tudo');
        assert.match(
            md,
            /^# Conexões\n\n3 Elos em 2 pares e 0 clusters, 1 buraco; 4 Ecos em 1 cadeia e 1 grafo\.\n/,
        );
        const pos = ['## Buracos', '## Elos (pares e clusters)', '## Ecos (cadeias e grafos)'].map(
            (t) => md.indexOf(t),
        );
        assert.ok(pos.every((p) => p > 0));
        assert.deepEqual(
            [...pos].sort((a, b) => a - b),
            pos,
        );
    });

    it('o buraco aparece com o rótulo do lado cadastrado', () => {
        const md = gerarMarkdownConexoes(dadosConexoes(), 'elos');
        assert.match(md, /- C \(Reescrita de\) → D\. Falta o vínculo de volta\./);
    });

    it('o par de Elos lista as duas arestas, como na tela', () => {
        const md = gerarMarkdownConexoes(dadosConexoes(), 'elos');
        assert.match(md, /### Par 1\n\n- A \(Resposta a\) ↔ B\n- B \(Respondido em\) ↔ A/);
    });

    it('cadeia linear sai numa linha só, com o Tipo de cada Eco', () => {
        const md = gerarMarkdownConexoes(dadosConexoes(), 'ecos');
        assert.match(md, /### Cadeia 1 \(3 poemas\)\n\nE → \(Tema\) F → \(Imagem\) G\n/);
    });

    it('grafo que converge lista um Eco por linha, com e sem Tipo', () => {
        const md = gerarMarkdownConexoes(dadosConexoes(), 'ecos');
        assert.match(md, /### Grafo 1 \(3 poemas, 2 Ecos\)/);
        assert.match(md, /- H → \(Citação\) J/);
        assert.match(md, /- I → J/);
    });

    it('"elos" não leva Ecos e "ecos" não leva Elos nem Buracos', () => {
        const dados = dadosConexoes();
        const elos = gerarMarkdownConexoes(dados, 'elos');
        const ecos = gerarMarkdownConexoes(dados, 'ecos');
        assert.match(elos, /^# Conexões: Elos/);
        assert.ok(!elos.includes('## Ecos'));
        assert.match(ecos, /^# Conexões: Ecos/);
        assert.ok(!ecos.includes('## Elos') && !ecos.includes('## Buracos'));
    });

    it('escopo desconhecido cai em "tudo"', () => {
        const dados = dadosConexoes();
        assert.equal(gerarMarkdownConexoes(dados, 'xis'), gerarMarkdownConexoes(dados, 'tudo'));
    });

    it('não usa travessão', () => {
        assert.ok(!gerarMarkdownConexoes(dadosConexoes(), 'tudo').includes('—'));
    });
});

describe('gerarMarkdownConexoes (casos de borda)', () => {
    it('acervo sem conexões avisa em cada seção', () => {
        const md = gerarMarkdownConexoes({ buracos: [], clusters: [], grafos: [] }, 'tudo');
        assert.match(md, /Nenhum: todo Elo registrado tem os dois lados\./);
        assert.match(md, /_Nenhum Elo cadastrado ainda\._/);
        assert.match(md, /_Nenhum Eco cadastrado ainda\._/);
        assert.match(
            md,
            /0 Elos em 0 pares e 0 clusters, 0 buracos; 0 Ecos em 0 cadeias e 0 grafos\./,
        );
    });

    it('sem argumento nenhum não quebra', () => {
        assert.match(gerarMarkdownConexoes(undefined), /^# Conexões\n/);
    });

    it('cluster de 3 poemas ou mais ganha o tamanho no título', () => {
        const cluster = {
            ids: [1, 2, 3],
            tamanho: 3,
            arestas: [
                { aId: 1, aTitulo: 'X', bId: 2, bTitulo: 'Y', rotulo: 'Díptico com' },
                { aId: 2, aTitulo: 'Y', bId: 3, bTitulo: '', rotulo: '' },
            ],
        };
        const md = gerarMarkdownConexoes({ clusters: [cluster] }, 'elos');
        assert.match(
            md,
            /### Cluster 1 \(3 poemas\)\n\n- X \(Díptico com\) ↔ Y\n- Y ↔ \(sem título\)/,
        );
    });

    it('um Eco só usa o singular', () => {
        const grafo = {
            nos: [
                { id: 1, titulo: 'P' },
                { id: 2, titulo: 'Q' },
            ],
            arestas: [{ deId: 1, deTitulo: 'P', paraId: 2, paraTitulo: 'Q', tipo: '' }],
            camadas: [[1], [2]],
            linear: true,
        };
        const md = gerarMarkdownConexoes({ grafos: [grafo] }, 'ecos');
        assert.match(md, /^# Conexões: Ecos\n\n1 Eco em 1 cadeia e 0 grafos\./);
        assert.match(md, /### Cadeia 1 \(2 poemas\)\n\nP → Q\n/);
    });

    it('os escopos e os nomes de arquivo andam juntos', () => {
        assert.deepEqual(Object.keys(NOME_ARQUIVO_CONEXOES).sort(), [...ESCOPOS_CONEXOES].sort());
    });
});

describe('baixarConexoes (botão da aba)', () => {
    const guardado = {};
    let baixado;

    beforeEach(() => {
        db.prosas = [];
        montarAcervo();
        baixado = null;
        guardado.getElementById = document.getElementById;
        guardado.createElement = document.createElement;
        guardado.createObjectURL = URL.createObjectURL;
        guardado.revokeObjectURL = URL.revokeObjectURL;
        URL.createObjectURL = (blob) => {
            baixado = { blob };
            return 'blob:teste';
        };
        URL.revokeObjectURL = () => {};
        document.createElement = () => ({
            style: {},
            click() {
                baixado.nome = this.download;
            },
        });
    });

    afterEach(() => {
        document.getElementById = guardado.getElementById;
        document.createElement = guardado.createElement;
        URL.createObjectURL = guardado.createObjectURL;
        URL.revokeObjectURL = guardado.revokeObjectURL;
    });

    function selects(escopo, formato) {
        document.getElementById = (id) =>
            ({
                'conexoes-baixar-escopo': { value: escopo },
                'conexoes-baixar-formato': { value: formato },
            })[id] || null;
    }

    it('baixa o escopo escolhido, com o nome do escopo', async () => {
        for (const [escopo, nome, titulo] of [
            ['tudo', 'conexoes.md', '# Conexões\n'],
            ['elos', 'conexoes-elos.md', '# Conexões: Elos\n'],
            ['ecos', 'conexoes-ecos.md', '# Conexões: Ecos\n'],
        ]) {
            selects(escopo, 'md');
            baixarConexoes();
            assert.equal(baixado.nome, nome);
            assert.ok((await baixado.blob.text()).startsWith(titulo));
        }
    });

    it('formato que ainda não existe não baixa nada', () => {
        selects('tudo', 'docx');
        baixarConexoes();
        assert.equal(baixado, null);
    });
});
