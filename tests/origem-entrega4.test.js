import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Origem da obra, entrega 4: o aviso do Corrigir obra quando as entradas
// discordam, o prefixo de busca `origem:` (com as sugestões) e o gráfico de
// origens das Estatísticas.

const { db } = await import('../js/db.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { montarForaDoAcervo } = await import('../js/fora-do-acervo.js');
const { avisoDeOrigemDaObra } = await import('../js/corrigir-fora-do-acervo-ui.js');
const { montarFontesBuscaTexto } = await import('../js/fontes-sugestoes-busca-texto.js');
const { agregarTextosPorOrigem } = await import('../js/estatisticas-dados-data-obra.js');
const { resumoDasOrigens, consultaDoCliqueNaOrigem } =
    await import('../js/estatisticas-tela-datas-obras.js');

const ids = (lista) => lista.map((i) => i.id).sort((a, b) => a - b);

function zerarDb() {
    [
        'pessoas',
        'grupos',
        'autores',
        'livros',
        'epocas',
        'periodosHistoricos',
        'movimentosEscolas',
        'temas',
        'assuntos',
        'prosas',
    ].forEach((c) => {
        db[c] = [];
    });
}

// 1: Prometeu com Grécia; 2: Prometeu de novo, com "grécia" (mesma lista);
// 3: Saci (Brasil) e Odisseia (Hiper, Grécia e Roma); 4: Prometeu sem origem;
// 5: sem nenhuma entrada de Obras.
function montar() {
    zerarDb();
    db.poemas = [
        {
            id: 1,
            titulo: 'A',
            intertextualidade: [
                { tipoObra: 'Mitologia', obra: 'Mito de Prometeu', origemObra: ['Grécia'] },
            ],
        },
        {
            id: 2,
            titulo: 'B',
            intertextualidade: [
                { tipoObra: 'Mitologia', obra: 'Mito de Prometeu', origemObra: ['grécia'] },
            ],
        },
        {
            id: 3,
            titulo: 'C',
            intertextualidade: [{ obra: 'Saci', origemObra: ['Brasil'] }],
            hipertextualidade: [{ hipotexto: 'Odisseia', origemObra: ['Grécia', 'Roma'] }],
        },
        {
            id: 4,
            titulo: 'D',
            intertextualidade: [{ tipoObra: 'Mitologia', obra: 'Mito de Prometeu' }],
        },
        { id: 5, titulo: 'E' },
    ];
    db.prosas = [];
    return db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
}

describe('busca: prefixo origem:', () => {
    it('o prefixo é canônico e acha pela origem de Inter e de Hiper, sem acento nem caixa', () => {
        assert.ok(Object.values(PREFIXOS_CANONICOS_POR_CAMPO).includes('origem'));
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'origem:grecia')), [1, 2, 3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'origem:"Brasil"')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'origem:roma')), [3]);
    });

    it('origem:* acha quem tem alguma origem e -origem:* quem não tem', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'origem:*')), [1, 2, 3]);
        assert.deepEqual(ids(filtrarTextos(itens, '-origem:*')), [4, 5]);
    });

    it('a busca livre também acha pela origem', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'Brasil')), [3]);
    });

    it('as sugestões do prefixo vêm das origens em uso, sem repetir', () => {
        montar();
        const f = montarFontesBuscaTexto(db, 'poemas');
        assert.deepEqual(f.origem(), ['Brasil', 'Grécia', 'Roma']);
    });
});

describe('Corrigir obra: aviso quando as entradas discordam na origem', () => {
    const obraDe = (titulo) => {
        montar();
        const fora = montarForaDoAcervo({ poemas: db.poemas, prosas: [] });
        return fora.obras.find((o) => o.obra === titulo);
    };

    it('a obra traz as listas diferentes e quantas entradas ficam sem origem', () => {
        const prometeu = obraDe('Mito de Prometeu');
        assert.deepEqual(prometeu.origens, [['Grécia']]);
        assert.equal(prometeu.entradasSemOrigem, 1);
        assert.equal(prometeu.entradasTotal, 3);
        const saci = obraDe('Saci');
        assert.deepEqual(saci.origens, [['Brasil']]);
        assert.equal(saci.entradasSemOrigem, 0);
    });

    it('uma lista só mais entradas sem origem avisa; todas iguais não avisa', () => {
        assert.match(
            avisoDeOrigemDaObra(obraDe('Mito de Prometeu')),
            /Origem Grécia: 1 entrada desta obra não a tem/,
        );
        assert.match(avisoDeOrigemDaObra(obraDe('Mito de Prometeu')), /Modo revisão/);
        assert.equal(avisoDeOrigemDaObra(obraDe('Saci')), '');
    });

    it('duas listas diferentes avisam, com as entradas sem origem', () => {
        const obra = {
            origens: [['Grécia'], ['Roma']],
            entradasSemOrigem: 2,
        };
        const aviso = avisoDeOrigemDaObra(obra);
        assert.match(aviso, /não concordam \(Grécia ou Roma e 2 entradas sem origem\)/);
    });

    it('nenhuma origem em nenhuma entrada não avisa nada', () => {
        assert.equal(avisoDeOrigemDaObra({ origens: [], entradasSemOrigem: 3 }), '');
        assert.equal(avisoDeOrigemDaObra({}), '');
    });
});

describe('Estatísticas: textos por origem da obra', () => {
    let textos;
    beforeEach(() => {
        montar();
        textos = db.poemas;
    });

    it('um texto conta uma vez por origem, pela chave, com a primeira grafia', () => {
        const dados = agregarTextosPorOrigem(textos);
        assert.deepEqual(
            dados.itens.map((i) => [i.rotulo, i.textos]),
            [
                ['Grécia', 3],
                ['Brasil', 1],
                ['Roma', 1],
            ],
        );
        assert.deepEqual(dados.itens[0].ids.map((x) => x.id).sort(), [1, 2, 3]);
    });

    it('os totais: com entradas, com origem e sem origem', () => {
        const dados = agregarTextosPorOrigem(textos);
        assert.equal(dados.comEntradas, 4);
        assert.equal(dados.comOrigem, 3);
        assert.equal(dados.semOrigem, 1);
    });

    it('o resumo e a consulta da barra', () => {
        const dados = agregarTextosPorOrigem(textos);
        assert.match(
            resumoDasOrigens(dados),
            /3 textos entram nas barras, de 4 textos com entradas/,
        );
        assert.match(resumoDasOrigens(dados), /Ficam fora 1 texto sem nenhuma origem/);
        assert.equal(consultaDoCliqueNaOrigem('Grécia', dados), 'origem:"Grécia"');
        assert.equal(consultaDoCliqueNaOrigem('Inexistente', dados), null);
        assert.match(resumoDasOrigens(agregarTextosPorOrigem([])), /Nenhum texto/);
        assert.match(
            resumoDasOrigens(
                agregarTextosPorOrigem([{ id: 9, intertextualidade: [{ obra: 'X' }] }]),
            ),
            /Nenhuma das 1 entrada de Obras/,
        );
    });

    it('a consulta da barra abre os mesmos textos da barra', () => {
        const itens = db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
        const dados = agregarTextosPorOrigem(textos);
        dados.itens.forEach((barra) => {
            const consulta = consultaDoCliqueNaOrigem(barra.rotulo, dados);
            assert.deepEqual(
                ids(filtrarTextos(itens, consulta)),
                barra.ids.map((x) => x.id).sort((a, b) => a - b),
                barra.rotulo,
            );
        });
    });

    it('segue a fonte e o filtro de obra pessoal, e a barra abre os mesmos textos', () => {
        db.poemas.push({
            id: 7,
            titulo: 'G',
            intertextualidade: [
                { obra: 'Diário', obraPessoal: true, origemObra: ['Santos'] },
                { obra: 'Mito', origemObra: ['Grécia'] },
            ],
        });
        const itens = db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
        const nomes = (d) => d.itens.map((i) => i.rotulo).sort();
        const so = agregarTextosPorOrigem(db.poemas, 'obras', 'so');
        assert.deepEqual(nomes(so), ['Santos']);
        const sem = agregarTextosPorOrigem(db.poemas, 'todas', 'sem');
        assert.ok(!nomes(sem).includes('Santos'));
        assert.deepEqual(
            nomes(agregarTextosPorOrigem(db.poemas, 'obras', 'todas')).includes('Santos'),
            true,
        );
        assert.equal(agregarTextosPorOrigem(db.poemas, 'referencias').comEntradas, 0);
        assert.match(
            resumoDasOrigens(agregarTextosPorOrigem(db.poemas, 'referencias'), 'referencias'),
            /Referências não têm origem/,
        );
        [
            ['so', so],
            ['sem', sem],
        ].forEach(([modo, dados]) => {
            dados.itens.forEach((barra) => {
                const consulta = consultaDoCliqueNaOrigem(barra.rotulo, dados, modo);
                assert.match(consulta, modo === 'so' ? /^origempessoal:/ : /^origempublica:/);
                assert.deepEqual(
                    ids(filtrarTextos(itens, consulta)),
                    barra.ids.map((x) => x.id).sort((a, b) => a - b),
                    `${modo} ${barra.rotulo}`,
                );
            });
        });
    });
});
