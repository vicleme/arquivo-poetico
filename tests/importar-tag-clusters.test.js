// Importar tag clusters (lógica pura de js/importar-tag-clusters.js).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirEtiqueta } from '../js/etiquetas.js';
import {
    criarCluster,
    atribuirEtiquetasAoCluster,
    etiquetasDoCluster,
} from '../js/tag-clusters.js';
import { importarTagClusters, lerListaDeClusters } from '../js/importar-tag-clusters.js';

function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    ['Melancólico', 'Sombrio', 'Irônico', 'Solar'].forEach((n) =>
        garantirEtiqueta(dbRef, 'tom', n),
    );
    ['Barroco', 'Romântico'].forEach((n) => garantirEtiqueta(dbRef, 'estilo', n));
    // Mesmo nome em duas categorias.
    garantirEtiqueta(dbRef, 'tradicao', 'Barroco');
    return dbRef;
}
const idDe = (dbRef, nome, categoria) =>
    dbRef.etiquetas.find((e) => e.nome === nome && e.categoria === categoria).id;
const nomesDo = (dbRef, cluster) => etiquetasDoCluster(dbRef, cluster.id).map((e) => e.nome);

describe('lerListaDeClusters', () => {
    it('lê "Cluster: a, b", ignora linhas vazias e corta no primeiro ":"', () => {
        const { itens, avisos } = lerListaDeClusters(
            'Tons sombrios: Sombrio, melancólico,, Sombrio\n\n  Outro: x: y  \n',
            'tom',
        );
        assert.deepEqual(avisos, []);
        assert.deepEqual(
            itens.map((i) => [i.cluster, i.nomes]),
            [
                ['Tons sombrios', ['Sombrio', 'melancólico']],
                ['Outro', ['x: y']],
            ],
        );
    });

    it('título "## Estilo" muda a categoria; título desconhecido só avisa', () => {
        const { itens, avisos } = lerListaDeClusters(
            'Antes: a\n## Estilo\nEscolas: Barroco\n### Etiquetas sem cluster\nMais: b\n## Tom\nTons: Solar',
            'tom',
        );
        assert.deepEqual(
            itens.map((i) => [i.categoria, i.cluster]),
            [
                ['tom', 'Antes'],
                ['estilo', 'Escolas'],
                ['estilo', 'Mais'],
                ['tom', 'Tons'],
            ],
        );
        assert.deepEqual(
            avisos.map((a) => [a.linha, a.motivo]),
            [[4, 'titulo-ignorado']],
        );
    });

    it('avisa linha sem ":", sem nome de cluster e sem categoria', () => {
        const { itens, avisos } = lerListaDeClusters('só texto\n: a, b', 'tom');
        assert.equal(itens.length, 0);
        assert.deepEqual(
            avisos.map((a) => a.motivo),
            ['sem-dois-pontos', 'sem-nome-de-cluster'],
        );
        const semCategoria = lerListaDeClusters('Tons: a', null);
        assert.equal(semCategoria.avisos[0].motivo, 'sem-categoria');
    });
});

describe('importarTagClusters', () => {
    it('cria clusters e põe as etiquetas, só na categoria escolhida', () => {
        const dbRef = montar();
        const r = importarTagClusters(
            dbRef,
            'Tons sombrios: Melancólico, Sombrio\nTons claros: Solar',
            'tom',
        );
        assert.equal(r.ok, true);
        assert.equal(r.criados, 2);
        assert.equal(r.etiquetasColocadas, 3);
        assert.equal(dbRef.tagClusters.length, 2);
        const sombrios = dbRef.tagClusters.find((c) => c.nome === 'Tons sombrios');
        assert.deepEqual(nomesDo(dbRef, sombrios), ['Melancólico', 'Sombrio']);
        assert.equal(sombrios.categoria, 'tom');
    });

    it('casa nome sem caixa e sem acento, e respeita a categoria (Barroco de Estilo, não de Tradição)', () => {
        const dbRef = montar();
        importarTagClusters(dbRef, 'Escolas: BARROCO, romantico', 'estilo');
        const escolas = dbRef.tagClusters[0];
        assert.deepEqual(nomesDo(dbRef, escolas), ['Barroco', 'Romântico']);
        assert.equal(
            dbRef.etiquetas.find((e) => e.id === idDe(dbRef, 'Barroco', 'tradicao')).clusterId,
            undefined,
        );
    });

    it('não cria etiqueta: o que não achou vai para naoAchadas', () => {
        const dbRef = montar();
        const antes = dbRef.etiquetas.length;
        const r = importarTagClusters(dbRef, 'Tons: Sombrio, Inexistente', 'tom');
        assert.equal(dbRef.etiquetas.length, antes);
        assert.deepEqual(r.naoAchadas, [
            { cluster: 'Tons', nome: 'Inexistente', categoria: 'tom' },
        ]);
        assert.equal(r.etiquetasColocadas, 1);
    });

    it('cluster que já existe é reaproveitado, sem duplicar', () => {
        const dbRef = montar();
        const c = criarCluster(dbRef, 'Tons sombrios', 'tom').cluster;
        atribuirEtiquetasAoCluster(dbRef, [idDe(dbRef, 'Sombrio', 'tom')], c.id);
        const r = importarTagClusters(dbRef, 'TONS SOMBRIOS: Melancólico', 'tom');
        assert.equal(r.criados, 0);
        assert.equal(r.reaproveitados, 1);
        assert.equal(dbRef.tagClusters.length, 1);
        assert.deepEqual(nomesDo(dbRef, c), ['Melancólico', 'Sombrio']);
    });

    it('etiqueta que estava em outro cluster passa para o novo e é avisada', () => {
        const dbRef = montar();
        const velho = criarCluster(dbRef, 'Velho', 'tom').cluster;
        atribuirEtiquetasAoCluster(dbRef, [idDe(dbRef, 'Solar', 'tom')], velho.id);
        const r = importarTagClusters(dbRef, 'Novo: Solar', 'tom');
        assert.deepEqual(r.movidas, [{ nome: 'Solar', de: 'Velho', para: 'Novo' }]);
        assert.deepEqual(nomesDo(dbRef, velho), []);
    });

    it('etiqueta repetida em duas linhas: vale a última e avisa em repetidas', () => {
        const dbRef = montar();
        const r = importarTagClusters(dbRef, 'A: Solar\nB: Solar', 'tom');
        assert.deepEqual(r.repetidas, [{ nome: 'Solar', categoria: 'tom', de: 'A', para: 'B' }]);
        assert.deepEqual(r.movidas, []);
        const b = dbRef.tagClusters.find((c) => c.nome === 'B');
        assert.deepEqual(nomesDo(dbRef, b), ['Solar']);
    });

    it('cluster sem etiquetas na linha ("Vazio:") é criado vazio', () => {
        const dbRef = montar();
        const r = importarTagClusters(dbRef, 'Vazio:', 'tom');
        assert.equal(r.criados, 1);
        assert.equal(r.etiquetasColocadas, 0);
    });

    it('vários títulos de categoria no mesmo texto', () => {
        const dbRef = montar();
        const r = importarTagClusters(
            dbRef,
            '## Tom\nTons: Solar\n## Estilo\nEscolas: Barroco',
            null,
        );
        assert.equal(r.criados, 2);
        assert.deepEqual(
            dbRef.tagClusters.map((c) => [c.nome, c.categoria]),
            [
                ['Tons', 'tom'],
                ['Escolas', 'estilo'],
            ],
        );
    });

    it('sem linha válida: ok false e nada muda', () => {
        const dbRef = montar();
        const r = importarTagClusters(dbRef, 'sem dois pontos', 'tom');
        assert.equal(r.ok, false);
        assert.equal(dbRef.tagClusters.length, 0);
        assert.equal(r.avisos.length, 1);
        r.desfazer();
    });

    it('desfazer volta tudo: clusters criados, etiquetas colocadas e o cluster antigo', () => {
        const dbRef = montar();
        const velho = criarCluster(dbRef, 'Velho', 'tom').cluster;
        atribuirEtiquetasAoCluster(dbRef, [idDe(dbRef, 'Solar', 'tom')], velho.id);
        const r = importarTagClusters(dbRef, 'Velho: Sombrio\nNovo: Solar, Melancólico', 'tom');
        assert.equal(dbRef.tagClusters.length, 2);
        r.desfazer();
        assert.deepEqual(
            dbRef.tagClusters.map((c) => c.nome),
            ['Velho'],
        );
        assert.deepEqual(nomesDo(dbRef, velho), ['Solar']);
        assert.equal(
            dbRef.etiquetas.some((e) => e.nome === 'Melancólico' && e.clusterId != null),
            false,
        );
    });
});

describe('importarTagClusters: nome de cluster com vírgula (F20-D16)', () => {
    it('lê "Arte, cultura e jogo: a, b" com a vírgula no nome do cluster e do pai', () => {
        const { itens } = lerListaDeClusters(
            'Arte, cultura e jogo > Música, dança e som: x, y',
            'dominioImagetico',
        );
        assert.equal(itens.length, 1);
        assert.equal(itens[0].pai, 'Arte, cultura e jogo');
        assert.equal(itens[0].cluster, 'Música, dança e som');
        assert.deepEqual(itens[0].nomes, ['x', 'y']);
    });
});
