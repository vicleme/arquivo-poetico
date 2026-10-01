import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Local: cadastro hierárquico (vários pais) que alimenta a Territorialidade
// (lugares citados) e o Local de escrita. O espelho
// `sinalizacoesTerritorialidade` continua sendo o que busca, badges e
// exportações leem; os ids são a fonte da verdade.

const L = await import('../js/locais.js');
const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { aplicarImportacaoAditiva, classificarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');
const { locaisParaSalvar } = await import('../js/forms.js');

// Exemplo do Victor: Estação Lapa está no bairro da Lapa E no Metrô de São
// Paulo; Praça Coração de Maria está no bairro da Ponta da Praia, em Santos.
// (ids numéricos fixos para leitura fácil.)
function acervo() {
    return {
        poemas: [],
        prosas: [],
        locais: [
            { id: 1, nome: 'Brasil', tipo: 'País', pertenceA: [], notas: '' },
            { id: 2, nome: 'São Paulo', tipo: 'Estado', pertenceA: [1], notas: '' },
            { id: 3, nome: 'São Paulo', tipo: 'Cidade', pertenceA: [2], notas: '' },
            { id: 4, nome: 'Lapa', tipo: 'Bairro', pertenceA: [3], notas: '' },
            {
                id: 5,
                nome: 'Metrô de São Paulo',
                tipo: 'Rede ou sistema',
                pertenceA: [3],
                notas: '',
            },
            { id: 6, nome: 'Estação Lapa', tipo: 'Estação', pertenceA: [4, 5], notas: '' },
            { id: 7, nome: 'Santos', tipo: 'Cidade', pertenceA: [2], notas: '' },
            { id: 8, nome: 'Ponta da Praia', tipo: 'Bairro', pertenceA: [7], notas: '' },
            {
                id: 9,
                nome: 'Praça Coração de Maria',
                tipo: 'Logradouro',
                pertenceA: [8],
                notas: '',
            },
        ],
    };
}

// Texto coerente: os ids e o espelho falam dos mesmos Locais (é o estado
// que o app grava; espelho vazio com ids significaria "a pessoa limpou a
// etiqueta" e os ids seriam refeitos a partir dele).
function texto(d, id, ids, localEscrita = null) {
    return {
        id,
        titulo: `T${id}`,
        territorialidade: ids,
        sinalizacoesTerritorialidade: L.espelhoDeLocais(d, ids),
        localEscrita,
    };
}

function comTextos(d) {
    d.poemas = [texto(d, 101, [6], 8), texto(d, 102, [9, 6], 8)];
    d.prosas = [texto(d, 201, [3], 3)];
    return d;
}

describe('hierarquia com vários pais', () => {
    it('ancestrais de Estação Lapa passam pelos dois pais, sem repetir', () => {
        const d = acervo();
        const ids = L.ancestraisDoLocal(d, 6);
        assert.deepEqual([...ids].sort(), [1, 2, 3, 4, 5]);
        assert.equal(new Set(ids).size, ids.length);
    });

    it('descendentes de São Paulo (cidade)', () => {
        const d = acervo();
        assert.deepEqual([...L.descendentesDoLocal(d, 3)].sort(), [4, 5, 6]);
    });

    it('caminho canônico segue o primeiro pai', () => {
        const d = acervo();
        assert.equal(
            L.rotuloCaminhoLocal(d, 6),
            'Estação Lapa › Lapa › São Paulo › São Paulo › Brasil',
        );
        assert.equal(
            L.rotuloCaminhoLocal(d, 9),
            'Praça Coração de Maria › Ponta da Praia › Santos › São Paulo › Brasil',
        );
    });

    it('mudar a ordem dos pais muda o caminho canônico, não os ancestrais', () => {
        const d = acervo();
        d.locais.find((l) => l.id === 6).pertenceA = [5, 4];
        assert.equal(
            L.rotuloCaminhoLocal(d, 6),
            'Estação Lapa › Metrô de São Paulo › São Paulo › São Paulo › Brasil',
        );
        assert.deepEqual([...L.ancestraisDoLocal(d, 6)].sort(), [1, 2, 3, 4, 5]);
    });

    it('rótulo ganha o tipo só quando há homônimo (São Paulo cidade x estado)', () => {
        const d = acervo();
        assert.equal(L.rotuloLocal(d, 3), 'São Paulo (Cidade)');
        assert.equal(L.rotuloLocal(d, 2), 'São Paulo (Estado)');
        assert.equal(L.rotuloLocal(d, 4), 'Lapa');
    });

    it('detecta ciclo: pai que é o próprio Local ou um descendente', () => {
        const d = acervo();
        assert.equal(L.criaCiclo(d, 3, [3]), true);
        assert.equal(L.criaCiclo(d, 3, [6]), true);
        assert.equal(L.criaCiclo(d, 6, [3]), false);
    });

    it('tipos sugeridos: padrão + os já usados, sem repetir por caixa/acento', () => {
        const d = acervo();
        d.locais.push({ id: 50, nome: 'X', tipo: 'Vila', pertenceA: [], notas: '' });
        d.locais.push({ id: 51, nome: 'Y', tipo: 'cidade', pertenceA: [], notas: '' });
        const tipos = L.tiposDeLocalSugeridos(d);
        assert.ok(tipos.includes('Vila'));
        assert.equal(tipos.filter((t) => t.toLowerCase() === 'cidade').length, 1);
    });
});

describe('contagens: diretos x agregados', () => {
    it('cita a Estação Lapa: conta direto nela e agregado em Lapa, Metrô, cidade, estado e país', () => {
        const d = comTextos(acervo());
        const c = L.contarTextosPorLocal(d);
        assert.deepEqual(c.get('6'), { diretos: 2, agregados: 2 });
        assert.deepEqual(c.get('4'), { diretos: 0, agregados: 2 });
        assert.deepEqual(c.get('5'), { diretos: 0, agregados: 2 });
    });

    it('dois caminhos até o mesmo ancestral contam um texto uma vez só', () => {
        const d = comTextos(acervo());
        // O poema 101 cita a Estação Lapa, que chega a São Paulo (cidade)
        // pelo bairro E pelo Metrô. A prosa 201 cita a cidade direto.
        const c = L.contarTextosPorLocal(d);
        assert.deepEqual(c.get('3'), { diretos: 1, agregados: 3 });
    });

    it('"locais do Brasil" soma tudo, sem contar texto em dobro', () => {
        const d = comTextos(acervo());
        // 101 (Estação Lapa), 102 (Praça + Estação) e 201 (cidade): 3 textos.
        assert.equal(L.contarTextosPorLocal(d).get('1').agregados, 3);
        assert.equal(L.contarTextosPorLocal(d).get('1').diretos, 0);
    });

    it('Santos só agrega a Praça (texto 102), sem pegar a Estação Lapa', () => {
        const d = comTextos(acervo());
        assert.deepEqual(L.contarTextosPorLocal(d).get('7'), { diretos: 0, agregados: 1 });
    });

    it('local de escrita conta separado, com agregação pela hierarquia', () => {
        const d = comTextos(acervo());
        const c = L.contarTextosPorLocalEscrita(d);
        assert.deepEqual(c.get('8'), { diretos: 2, agregados: 2 });
        assert.deepEqual(c.get('7'), { diretos: 0, agregados: 2 });
        assert.deepEqual(c.get('3'), { diretos: 1, agregados: 1 });
        assert.deepEqual(c.get('1'), { diretos: 0, agregados: 3 });
    });

    it('textos que citam ou foram escritos no Local', () => {
        const d = comTextos(acervo());
        assert.deepEqual(L.textosQueCitamLocal(d, 6).poemasIds, [101, 102]);
        assert.deepEqual(L.textosEscritosNoLocal(d, 8).poemasIds, [101, 102]);
        assert.deepEqual(L.textosEscritosNoLocal(d, 3).prosasIds, [201]);
    });
});

describe('migração e reconciliação com o espelho', () => {
    it('etiqueta antiga de Territorialidade vira Local (sem tipo e sem pai) e id no texto', () => {
        const d = {
            poemas: [
                { id: 1, sinalizacoesTerritorialidade: 'Santos, Copacabana' },
                { id: 2, sinalizacoesTerritorialidade: 'santos' },
            ],
            prosas: [],
        };
        const criados = L.sincronizarLocais(d);
        assert.equal(criados, 2);
        assert.deepEqual(d.locais.map((l) => l.nome).sort(), ['Copacabana', 'Santos']);
        d.locais.forEach((l) => {
            assert.equal(l.tipo, '');
            assert.deepEqual(l.pertenceA, []);
        });
        const santos = d.locais.find((l) => l.nome === 'Santos').id;
        assert.deepEqual(d.poemas[1].territorialidade, [santos]);
        assert.equal(d.poemas[0].territorialidade.length, 2);
        assert.equal(d.poemas[0].localEscrita, null);
    });

    it('grafia do Local novo é a mais frequente nos textos', () => {
        const d = {
            poemas: [
                { id: 1, sinalizacoesTerritorialidade: 'santos' },
                { id: 2, sinalizacoesTerritorialidade: 'Santos' },
                { id: 3, sinalizacoesTerritorialidade: 'Santos' },
            ],
            prosas: [],
        };
        L.sincronizarLocais(d);
        assert.equal(d.locais[0].nome, 'Santos');
    });

    it('é idempotente e não recria nem renomeia o que já existe', () => {
        const d = comTextos(acervo());
        L.sincronizarLocais(d);
        const antes = JSON.stringify(d);
        assert.equal(L.sincronizarLocais(d), 0);
        assert.equal(JSON.stringify(d), antes);
    });

    it('espelho é derivado dos ids, sem repetir nome', () => {
        const d = comTextos(acervo());
        L.sincronizarLocais(d);
        assert.equal(
            d.poemas[1].sinalizacoesTerritorialidade,
            'Praça Coração de Maria, Estação Lapa',
        );
    });

    it('ids e espelho com os mesmos nomes: mantém os ids (São Paulo cidade x estado)', () => {
        const d = acervo();
        d.poemas = [
            {
                id: 1,
                territorialidade: [3, 2],
                sinalizacoesTerritorialidade: 'São Paulo',
            },
        ];
        L.sincronizarLocais(d);
        assert.deepEqual(d.poemas[0].territorialidade, [3, 2]);
        assert.equal(d.poemas[0].sinalizacoesTerritorialidade, 'São Paulo');
    });

    it('espelho editado à mão vence: ids refeitos, mantendo os que ainda batem', () => {
        const d = acervo();
        d.poemas = [
            {
                id: 1,
                territorialidade: [6],
                sinalizacoesTerritorialidade: 'Estação Lapa, Copacabana',
            },
        ];
        L.sincronizarLocais(d);
        const copa = d.locais.find((l) => l.nome === 'Copacabana');
        assert.ok(copa);
        assert.deepEqual(d.poemas[0].territorialidade, [6, copa.id]);
    });

    it('tirar um nome do espelho tira o Local do texto (o cadastro fica)', () => {
        const d = acervo();
        d.poemas = [
            { id: 1, territorialidade: [6, 9], sinalizacoesTerritorialidade: 'Estação Lapa' },
        ];
        L.sincronizarLocais(d);
        assert.deepEqual(d.poemas[0].territorialidade, [6]);
        assert.ok(d.locais.some((l) => l.id === 9));
    });

    it('id que não existe no cadastro é descartado; local de escrita inválido vira null', () => {
        const d = acervo();
        d.poemas = [
            {
                id: 1,
                territorialidade: [6, 999],
                sinalizacoesTerritorialidade: 'Estação Lapa',
                localEscrita: 12345,
            },
        ];
        L.sincronizarLocais(d);
        assert.deepEqual(d.poemas[0].territorialidade, [6]);
        assert.equal(d.poemas[0].localEscrita, null);
    });

    it('backup com ciclo ou pai inexistente é consertado sem perder o Local', () => {
        const d = {
            poemas: [],
            prosas: [],
            locais: [
                { id: 1, nome: 'A', tipo: '', pertenceA: [2, 99, 1], notas: '' },
                { id: 2, nome: 'B', tipo: '', pertenceA: [1], notas: '' },
            ],
        };
        L.sincronizarLocais(d);
        assert.equal(d.locais.length, 2);
        const [a, b] = d.locais;
        assert.equal(a.pertenceA.includes(1), false);
        assert.equal(a.pertenceA.includes(99), false);
        assert.equal(L.criaCiclo(d, a.id, b.pertenceA), b.pertenceA.length > 0 && true);
        assert.equal(
            L.ancestraisDoLocal(d, 1).includes(1) || L.ancestraisDoLocal(d, 2).includes(2),
            false,
        );
    });

    it('vírgula no nome do Local vira espaço (é o separador do espelho)', () => {
        assert.equal(L.limparNomeLocal('  Santos,  SP '), 'Santos SP');
    });
});

describe('árvore da aba Locais', () => {
    const achatar = (nos, nivel = 0) =>
        nos.flatMap((n) => [
            { id: n.id, nivel, tambemAqui: n.tambemAqui },
            ...achatar(n.filhos, nivel + 1),
        ]);

    it('cada Local aparece uma vez, sob o pai principal; o outro pai só referencia', () => {
        const d = acervo();
        const plano = achatar(L.arvoreDeLocais(d));
        assert.equal(plano.length, d.locais.length);
        assert.equal(new Set(plano.map((n) => n.id)).size, plano.length);
        const brasil = plano.find((n) => n.id === 1);
        assert.equal(brasil.nivel, 0);
        assert.equal(plano.find((n) => n.id === 6).nivel, 4);
        // Estação Lapa é filha principal da Lapa e só referência sob o Metrô.
        assert.deepEqual(plano.find((n) => n.id === 5).tambemAqui, [6]);
        assert.deepEqual(plano.find((n) => n.id === 4).tambemAqui, []);
    });

    it('irmãos em ordem alfabética e raízes são os Locais sem pai', () => {
        const d = acervo();
        d.locais.push({ id: 30, nome: 'Argentina', tipo: 'País', pertenceA: [], notas: '' });
        const arvore = L.arvoreDeLocais(d);
        assert.deepEqual(
            arvore.map((n) => n.id),
            [30, 1],
        );
        const estado = arvore[1].filhos[0];
        assert.deepEqual(
            estado.filhos.map((n) => n.id),
            [7, 3],
        );
    });

    it('mudar o pai principal move o Local na árvore', () => {
        const d = acervo();
        d.locais.find((l) => l.id === 6).pertenceA = [5, 4];
        const plano = achatar(L.arvoreDeLocais(d));
        assert.deepEqual(plano.find((n) => n.id === 4).tambemAqui, [6]);
        assert.deepEqual(plano.find((n) => n.id === 5).tambemAqui, []);
        assert.equal(plano.find((n) => n.id === 6).nivel, 4);
    });

    it('acervo vazio e ciclo que escapou não quebram nem escondem Local', () => {
        assert.deepEqual(L.arvoreDeLocais({ locais: [] }), []);
        const d = {
            locais: [
                { id: 1, nome: 'A', tipo: '', pertenceA: [2] },
                { id: 2, nome: 'B', tipo: '', pertenceA: [1] },
            ],
        };
        assert.equal(achatar(L.arvoreDeLocais(d)).length, 2);
    });
});

describe('ver textos do Local', () => {
    it('textos que citam o Local ou qualquer sublocal, sem repetir', () => {
        const d = comTextos(acervo());
        assert.deepEqual(L.textosQueCitamLocalOuSublocais(d, 4).poemasIds, [101, 102]);
        assert.deepEqual(L.textosQueCitamLocalOuSublocais(d, 7).poemasIds, [102]);
        const br = L.textosQueCitamLocalOuSublocais(d, 1);
        assert.deepEqual([br.poemasIds, br.prosasIds], [[101, 102], [201]]);
    });

    it('consulta é um termo só, hierárquico, com o tipo para não confundir homônimos', () => {
        const d = acervo();
        assert.equal(
            L.consultaTerritorialidadeDoLocal(d, 6),
            'territorialidade:"Estação Lapa (Estação)"',
        );
        assert.equal(L.consultaTerritorialidadeDoLocal(d, 4), 'territorialidade:"Lapa (Bairro)"');
        // São Paulo cidade e estado ficam distintos.
        assert.equal(
            L.consultaTerritorialidadeDoLocal(d, 3),
            'territorialidade:"São Paulo (Cidade)"',
        );
        assert.equal(
            L.consultaTerritorialidadeDoLocal(d, 2),
            'territorialidade:"São Paulo (Estado)"',
        );
    });
});

describe('cadastro: criar e editar', () => {
    it('cria com vários pais na ordem dada', () => {
        const d = acervo();
        const r = L.criarLocal(d, { nome: 'Estação Sé', tipo: 'Estação', pais: [5, 4] });
        assert.equal(r.ok, true);
        assert.deepEqual(d.locais.at(-1).pertenceA, [5, 4]);
    });

    it('recusa nome vazio, pai inexistente e duplicata (mesmo nome, tipo e pai)', () => {
        const d = acervo();
        assert.equal(L.criarLocal(d, { nome: '  ' }).motivo, 'vazio');
        assert.equal(L.criarLocal(d, { nome: 'X', pais: [999] }).motivo, 'pai-inexistente');
        const dup = L.criarLocal(d, { nome: 'estação lapa', tipo: 'estação', pais: [4] });
        assert.equal(dup.motivo, 'duplicado');
        assert.equal(dup.existente.id, 6);
    });

    it('mesmo nome com tipo diferente coexiste (São Paulo cidade e estado)', () => {
        const d = acervo();
        assert.equal(L.criarLocal(d, { nome: 'São Paulo', tipo: 'Região', pais: [1] }).ok, true);
    });

    it('mesmo nome e tipo com pais diferentes coexiste (dois "Centro")', () => {
        const d = acervo();
        assert.equal(L.criarLocal(d, { nome: 'Centro', tipo: 'Bairro', pais: [7] }).ok, true);
        assert.equal(L.criarLocal(d, { nome: 'Centro', tipo: 'Bairro', pais: [3] }).ok, true);
        assert.equal(
            L.criarLocal(d, { nome: 'Centro', tipo: 'Bairro', pais: [7] }).motivo,
            'duplicado',
        );
    });

    it('editar recusa ciclo e pai inexistente sem mudar nada', () => {
        const d = acervo();
        const antes = JSON.stringify(d.locais);
        assert.equal(L.editarLocal(d, 3, { pais: [6] }).motivo, 'ciclo');
        assert.equal(L.editarLocal(d, 3, { pais: [3] }).motivo, 'ciclo');
        assert.equal(L.editarLocal(d, 3, { pais: [999] }).motivo, 'pai-inexistente');
        assert.equal(JSON.stringify(d.locais), antes);
    });

    it('renomear atualiza o espelho dos textos que citam o Local e não recria o antigo', () => {
        const d = comTextos(acervo());
        L.sincronizarLocais(d);
        const r = L.editarLocal(d, 6, { nome: 'Estação da Lapa' });
        assert.deepEqual([r.ok, r.textos], [true, 2]);
        assert.equal(d.poemas[0].sinalizacoesTerritorialidade, 'Estação da Lapa');
        const total = d.locais.length;
        L.sincronizarLocais(d);
        assert.equal(d.locais.length, total);
        assert.deepEqual(d.poemas[0].territorialidade, [6]);
    });

    it('renomear para nome+tipo que já existe sob o mesmo pai é recusado', () => {
        const d = acervo();
        assert.equal(
            L.editarLocal(d, 8, { nome: 'Santos', tipo: 'Cidade', pais: [2] }).motivo,
            'duplicado',
        );
    });

    it('trocar a ordem dos pais é permitido', () => {
        const d = acervo();
        assert.equal(L.editarLocal(d, 6, { pais: [5, 4] }).ok, true);
        assert.deepEqual(d.locais.find((l) => l.id === 6).pertenceA, [5, 4]);
    });
});

describe('mesclar e excluir', () => {
    let d;
    beforeEach(() => {
        d = comTextos(acervo());
        L.sincronizarLocais(d);
    });

    it('mesclar: textos, local de escrita e filhos passam ao destino; a origem sai', () => {
        d.locais.push({
            id: 20,
            nome: 'Estaçao Lapa (dup)',
            tipo: 'Estação',
            pertenceA: [4],
            notas: 'n',
        });
        d.poemas.push(texto(d, 103, [20], 20));
        d.locais.push({ id: 21, nome: 'Plataforma 1', tipo: '', pertenceA: [20], notas: '' });
        L.sincronizarLocais(d);
        const r = L.mesclarLocais(d, 20, 6);
        assert.equal(r.ok, true);
        assert.equal(
            d.locais.some((l) => l.id === 20),
            false,
        );
        assert.deepEqual(d.poemas.at(-1).territorialidade, [6]);
        assert.equal(d.poemas.at(-1).localEscrita, 6);
        assert.equal(d.poemas.at(-1).sinalizacoesTerritorialidade, 'Estação Lapa');
        assert.deepEqual(d.locais.find((l) => l.id === 21).pertenceA, [6]);
        assert.equal(d.locais.find((l) => l.id === 6).notas, 'n');
    });

    it('mesclar texto que já tinha os dois deixa uma entrada só', () => {
        d.locais.push({ id: 23, nome: 'Est. Lapa', tipo: 'Estação', pertenceA: [4], notas: '' });
        d.poemas.push(texto(d, 104, [6, 23]));
        L.sincronizarLocais(d);
        assert.equal(L.mesclarLocais(d, 23, 6).ok, true);
        assert.deepEqual(d.poemas.at(-1).territorialidade, [6]);
        assert.equal(d.poemas.at(-1).sinalizacoesTerritorialidade, 'Estação Lapa');
    });

    it('mesclar recusa igual, inexistente e destino dentro da origem (ciclo)', () => {
        assert.equal(L.mesclarLocais(d, 3, 3).motivo, 'igual');
        assert.equal(L.mesclarLocais(d, 3, 999).motivo, 'inexistente');
        assert.equal(L.mesclarLocais(d, 1, 7).motivo, 'ciclo');
        assert.equal(L.mesclarLocais(d, 4, 6).motivo, 'ciclo');
        assert.equal(d.locais.length, 9);
    });

    it('mesclar traz os outros pais da origem quando não criam ciclo', () => {
        d.locais.push({ id: 22, nome: 'Estação B', tipo: 'Estação', pertenceA: [5], notas: '' });
        L.mesclarLocais(d, 22, 6);
        assert.deepEqual(d.locais.find((l) => l.id === 6).pertenceA, [4, 5]);
    });

    it('excluir: sai dos textos, local de escrita vira null e filhos herdam os pais', () => {
        const r = L.excluirLocal(d, 4);
        assert.equal(r.ok, true);
        assert.equal(
            d.locais.some((l) => l.id === 4),
            false,
        );
        // Estação Lapa pertencia a [Lapa, Metrô]; Lapa saiu e pôs a cidade no lugar.
        assert.deepEqual(d.locais.find((l) => l.id === 6).pertenceA, [3, 5]);
        const r2 = L.excluirLocal(d, 8);
        assert.equal(r2.ok, true);
        assert.equal(d.poemas[0].localEscrita, null);
        assert.equal(d.poemas[1].localEscrita, null);
        assert.deepEqual(d.locais.find((l) => l.id === 9).pertenceA, [7]);
        assert.equal(
            d.poemas[1].sinalizacoesTerritorialidade,
            'Praça Coração de Maria, Estação Lapa',
        );
    });

    it('excluir Local citado tira o nome do espelho do texto e ele não volta no sync', () => {
        L.excluirLocal(d, 9);
        assert.equal(d.poemas[1].sinalizacoesTerritorialidade, 'Estação Lapa');
        L.sincronizarLocais(d);
        assert.equal(
            d.locais.some((l) => l.id === 9),
            false,
        );
    });

    it('desfazer restaura cadastro, textos, espelho e local de escrita', () => {
        const antes = JSON.stringify({ locais: d.locais, p: d.poemas, pr: d.prosas });
        L.excluirLocal(d, 8).desfazer();
        assert.equal(JSON.stringify({ locais: d.locais, p: d.poemas, pr: d.prosas }), antes);
        const mesclagem = L.mesclarLocais(d, 7, 3);
        assert.equal(mesclagem.ok, true);
        mesclagem.desfazer();
        assert.equal(JSON.stringify({ locais: d.locais, p: d.poemas, pr: d.prosas }), antes);
    });

    it('impacto do Local: textos que citam, escritos nele e filhos', () => {
        const i = L.impactoDoLocal(d, 8);
        assert.deepEqual(i.escritosPoemasIds, [101, 102]);
        assert.deepEqual(i.filhosIds, [9]);
        assert.deepEqual(L.impactoDoLocal(d, 6).citadosPoemasIds, [101, 102]);
    });
});

describe('integração com o db real', () => {
    beforeEach(() => {
        db.poemas.length = 0;
        db.prosas.length = 0;
        db.locais.length = 0;
        db.locais.push(...acervo().locais);
    });

    it('db.locais existe por padrão como lista', () => {
        assert.ok(Array.isArray(db.locais));
    });

    it('formulário: locaisParaSalvar lê o grupo Região e Idioma do modal, sem apagar localEscrita', async () => {
        const { carregarLocaisTexto, resetLocaisTexto } = await import('../js/editor.js');
        db.poemas.push({ id: 5, titulo: 'X', territorialidade: [6], localEscrita: 8 });
        carregarLocaisTexto('poemas', db.poemas[0]);
        const r = locaisParaSalvar('poemas');
        assert.deepEqual(r.territorialidade, [6]);
        assert.equal(r.localEscrita, 8);
        assert.equal(r.sinalizacoesTerritorialidade, 'Estação Lapa');
        resetLocaisTexto('poemas');
        assert.deepEqual(locaisParaSalvar('poemas'), {
            territorialidade: [],
            sinalizacoesTerritorialidade: '',
            localEscrita: null,
        });
    });

    it('JSON exportado leva nome, tipo e a hierarquia completa dos Locais do texto', () => {
        const item = { id: 5, titulo: 'X', territorialidade: [6], localEscrita: 8 };
        db.poemas.push(item);
        const reg = montarRegistro('poema', item);
        assert.deepEqual(reg.territorialidade, [
            { localId: 6, nome: 'Estação Lapa', tipo: 'Estação' },
        ]);
        assert.deepEqual(reg.localEscrita, { localId: 8, nome: 'Ponta da Praia', tipo: 'Bairro' });
        const porId = new Map(reg.locaisHierarquia.map((h) => [h.localId, h]));
        assert.deepEqual([...porId.keys()].sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
        assert.deepEqual(porId.get(6).pertenceA, [4, 5]);
        assert.deepEqual(porId.get(1).pertenceA, []);
    });

    describe('importação aditiva', () => {
        const dbDestino = () => ({
            poemas: [],
            prosas: [],
            pessoas: [],
            grupos: [],
            autores: [],
            epocas: [],
            periodosHistoricos: [],
            livros: [],
            escansoes: [],
            estruturasTextuais: [],
            locais: [],
        });
        const deps = () => ({ tirarSnapshotSeNecessario: async () => true, save: () => {} });

        function exportado() {
            const item = { id: 5, titulo: 'X', territorialidade: [6, 9], localEscrita: 8 };
            db.poemas.push(item);
            const reg = montarRegistro('poema', item);
            db.poemas.length = 0;
            return { itens: [{ ...JSON.parse(JSON.stringify(reg)), id: 42 }] };
        }

        it('recria a hierarquia num acervo vazio, com ids novos e os dois pais da Estação Lapa', async () => {
            const payload = exportado();
            const alvo = dbDestino();
            const relatorio = classificarImportacaoAditiva(payload, alvo);
            await aplicarImportacaoAditiva(payload, relatorio, alvo, deps());
            const nomes = alvo.locais.map((l) => l.nome).sort();
            assert.deepEqual(nomes, [
                'Brasil',
                'Estação Lapa',
                'Lapa',
                'Metrô de São Paulo',
                'Ponta da Praia',
                'Praça Coração de Maria',
                'Santos',
                'São Paulo',
                'São Paulo',
            ]);
            const estacao = alvo.locais.find((l) => l.nome === 'Estação Lapa');
            const pais = estacao.pertenceA.map((id) => alvo.locais.find((l) => l.id === id).nome);
            assert.deepEqual(pais, ['Lapa', 'Metrô de São Paulo']);
            const texto = alvo.poemas[0];
            assert.equal(texto.territorialidade.length, 2);
            assert.equal(
                alvo.locais.find((l) => l.id === texto.localEscrita).nome,
                'Ponta da Praia',
            );
            assert.equal(
                texto.sinalizacoesTerritorialidade,
                'Estação Lapa, Praça Coração de Maria',
            );
            assert.equal('locaisHierarquia' in texto, false);
        });

        it('num acervo que já tem os Locais, casa por nome + tipo + pai em vez de duplicar', async () => {
            const payload = exportado();
            const alvo = dbDestino();
            alvo.locais = structuredClone(acervo().locais);
            const antes = alvo.locais.length;
            const relatorio = classificarImportacaoAditiva(payload, alvo);
            await aplicarImportacaoAditiva(payload, relatorio, alvo, deps());
            assert.equal(alvo.locais.length, antes);
            assert.deepEqual(alvo.poemas[0].territorialidade, [6, 9]);
            assert.equal(alvo.poemas[0].localEscrita, 8);
        });

        it('adota o Local sem pai (vindo da migração) e passa a ligar aos pais do JSON', async () => {
            const payload = exportado();
            const alvo = dbDestino();
            alvo.locais = [{ id: 900, nome: 'Santos', tipo: 'Cidade', pertenceA: [], notas: '' }];
            const relatorio = classificarImportacaoAditiva(payload, alvo);
            await aplicarImportacaoAditiva(payload, relatorio, alvo, deps());
            assert.equal(alvo.locais.filter((l) => l.nome === 'Santos').length, 1);
            const santos = alvo.locais.find((l) => l.id === 900);
            assert.equal(santos.pertenceA.length, 1);
        });

        it('JSON antigo (sem hierarquia) cai no espelho e o Local nasce no sync', async () => {
            const alvo = dbDestino();
            const payload = {
                itens: [
                    {
                        id: 1,
                        tipo: 'poema',
                        titulo: 'Velho',
                        texto: 'x',
                        pessoas: [],
                        autoria: [],
                        gruposDiretosResolvidos: [],
                        livrosResolvidos: [],
                        contexto: { livro: null, parte: null, secao: null },
                        sinalizacoesTerritorialidade: 'Copacabana',
                    },
                ],
            };
            const relatorio = classificarImportacaoAditiva(payload, alvo);
            await aplicarImportacaoAditiva(payload, relatorio, alvo, deps());
            assert.deepEqual(alvo.poemas[0].territorialidade, []);
            L.sincronizarLocais(alvo);
            assert.deepEqual(
                alvo.locais.map((l) => l.nome),
                ['Copacabana'],
            );
            assert.deepEqual(alvo.poemas[0].territorialidade, [alvo.locais[0].id]);
        });
    });
});
