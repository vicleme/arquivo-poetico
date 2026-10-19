// Exportação do cadastro de Etiquetas (Tags) para .md (aba Etiquetas, "Baixar .md").
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirEtiqueta } from '../js/etiquetas.js';
import { criarCluster, atribuirEtiquetasAoCluster } from '../js/tag-clusters.js';
import { gerarMarkdownEtiquetas } from '../js/exportar-etiquetas.js';

function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    const med = garantirEtiqueta(dbRef, 'dominioImagetico', 'Medicina');
    const oft = garantirEtiqueta(dbRef, 'dominioImagetico', 'Oftalmologia');
    const ironico = garantirEtiqueta(dbRef, 'tom', 'Irônico');
    const solene = garantirEtiqueta(dbRef, 'tom', 'Solene');
    const premiado = garantirEtiqueta(dbRef, 'outros', 'Premiado');
    dbRef.poemas.push({
        id: 1,
        sinalizacoesDominioImagetico: [med, oft],
        sinalizacoesTom: [ironico],
    });
    dbRef.poemas.push({ id: 2, sinalizacoesDominioImagetico: [med] });
    dbRef.prosas.push({ id: 3, sinalizacoesTom: [ironico], sinalizacoesOutros: [premiado] });
    const saude = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
    const clinica = criarCluster(dbRef, 'Clínica', 'dominioImagetico', saude.id).cluster;
    atribuirEtiquetasAoCluster(dbRef, [med], saude.id);
    atribuirEtiquetasAoCluster(dbRef, [oft], clinica.id);
    return { dbRef, solene };
}

describe('gerarMarkdownEtiquetas', () => {
    it('agrupa por categoria, na ordem da aba, e só mostra categorias com etiqueta', () => {
        const { dbRef } = montar();
        const md = gerarMarkdownEtiquetas(dbRef);
        assert.match(md, /^# Etiquetas \(Tags\)\n/);
        const titulos = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
        assert.deepEqual(titulos, ['Tom', 'Domínio Imagético', 'Outros (triagem)']);
    });

    it('lista as etiquetas em ordem alfabética com a contagem de textos', () => {
        const { dbRef } = montar();
        const md = gerarMarkdownEtiquetas(dbRef);
        assert.match(md, /## Tom\n\n- Irônico \(2\)\n- Solene \(0\)\n/);
        assert.match(md, /- Medicina \(2\)\. Cluster: Saúde\n/);
    });

    it('mostra o cluster com o pai quando a etiqueta está num subcluster', () => {
        const { dbRef } = montar();
        assert.match(
            gerarMarkdownEtiquetas(dbRef),
            /- Oftalmologia \(1\)\. Cluster: Saúde > Clínica/,
        );
    });

    it('junta as quebras de linha da nota em uma linha e omite nota vazia', () => {
        const { dbRef } = montar();
        dbRef.etiquetas.find((e) => e.nome === 'Solene').notas = 'Tom\ngrave';
        const md = gerarMarkdownEtiquetas(dbRef);
        assert.match(md, /- Solene \(0\)\n {2}Notas: Tom grave/);
        assert.doesNotMatch(md, /- Irônico[^\n]*\n {2}Notas/);
    });

    it('resume a quantidade de etiquetas e as sem texto', () => {
        const { dbRef } = montar();
        assert.match(gerarMarkdownEtiquetas(dbRef), /5 etiquetas, 1 sem texto\./);
    });

    it('marca Outros como triagem', () => {
        const { dbRef } = montar();
        assert.match(
            gerarMarkdownEtiquetas(dbRef),
            /## Outros \(triagem\)\n\n_O que ainda não tem categoria\._\n\n- Premiado \(1\)/,
        );
    });

    it('sem nenhuma etiqueta devolve só o aviso', () => {
        const md = gerarMarkdownEtiquetas({
            etiquetas: [],
            tagClusters: [],
            poemas: [],
            prosas: [],
        });
        assert.equal(md, '# Etiquetas (Tags)\n\n_Nenhuma etiqueta cadastrada ainda._\n');
    });
});
