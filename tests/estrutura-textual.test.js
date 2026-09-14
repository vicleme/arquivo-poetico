import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const {
    construirEstrofesDoTexto,
    itemPosicionado,
    overlapEntre,
    detectarSobrepostos,
    ordenarPorPosicao,
    instanciarTemplateEstrutura,
    extrairClassificacaoParaTemplate,
    resumoPosicao,
    inicializarEstruturaTextual,
    obterUnidadesAtuais,
    obterEventosAtuais,
    adicionarUnidade,
    adicionarEvento,
    removerUnidade,
    removerEvento,
    aplicarTemplateNoEstado,
    toggleEstrofeItem,
    setVersosTodosItem,
    toggleVersoItem,
} = await import('../js/estrutura-textual.js');

const TEXTO_SONETO =
    'Verso 1\nVerso 2\nVerso 3\nVerso 4\n\nVerso 5\nVerso 6\nVerso 7\nVerso 8\n\nVerso 9\nVerso 10\nVerso 11';

describe('construirEstrofesDoTexto', () => {
    it('agrupa versos em estrofes separadas por linha em branco, numerando versos de forma contínua', () => {
        const estrofes = construirEstrofesDoTexto(TEXTO_SONETO);
        assert.equal(estrofes.length, 3);
        assert.deepEqual(
            estrofes.map((e) => e.versos.length),
            [4, 4, 3],
        );
        assert.equal(estrofes[0].versos[0].numero, 1);
        assert.equal(estrofes[1].versos[0].numero, 5);
        assert.equal(estrofes[2].versos[2].numero, 11);
    });

    it('trata múltiplas linhas vazias seguidas como uma única quebra de estrofe', () => {
        const estrofes = construirEstrofesDoTexto('Verso 1\n\n\n\nVerso 2');
        assert.equal(estrofes.length, 2);
    });

    it('texto vazio não quebra e retorna lista vazia', () => {
        assert.deepEqual(construirEstrofesDoTexto(''), []);
        assert.deepEqual(construirEstrofesDoTexto(null), []);
    });

    it('remove marcação markdown (negrito/itálico) do texto do verso', () => {
        const estrofes = construirEstrofesDoTexto('_Verso_ em **itálico e negrito**');
        assert.equal(estrofes[0].versos[0].texto, 'Verso em itálico e negrito');
    });
});

describe('itemPosicionado', () => {
    it('false pra posição vazia/ausente, true com ao menos uma estrofe', () => {
        assert.equal(itemPosicionado(null), false);
        assert.equal(itemPosicionado({ estrofes: [], versos: 'todos' }), false);
        assert.equal(itemPosicionado({ estrofes: [1], versos: 'todos' }), true);
    });
});

describe('overlapEntre', () => {
    it('sem sobreposição quando as estrofes não têm interseção', () => {
        const a = { estrofes: [1], versos: 'todos' };
        const b = { estrofes: [2], versos: 'todos' };
        assert.equal(overlapEntre(a, b), false);
    });

    it('sobreposição quando uma das posições cobre "todos" os versos da estrofe comum', () => {
        const resolucao = { estrofes: [3], versos: 'todos' };
        const volta = { estrofes: [3], versos: [1] };
        assert.equal(overlapEntre(resolucao, volta), true);
    });

    it('sem sobreposição quando os dois têm versos específicos e não se cruzam', () => {
        const a = { estrofes: [3], versos: [1] };
        const b = { estrofes: [3], versos: [2, 3] };
        assert.equal(overlapEntre(a, b), false);
    });

    it('sobreposição quando os versos específicos se cruzam', () => {
        const a = { estrofes: [3], versos: [1, 2] };
        const b = { estrofes: [3], versos: [2, 3] };
        assert.equal(overlapEntre(a, b), true);
    });

    it('item não posicionado nunca sobrepõe nada', () => {
        const a = { estrofes: [], versos: 'todos' };
        const b = { estrofes: [1], versos: 'todos' };
        assert.equal(overlapEntre(a, b), false);
    });

    it('estrofe múltipla trata versos como "todos" mesmo se o outro lado tiver array salvo por engano', () => {
        const a = { estrofes: [1, 2], versos: 'todos' };
        const b = { estrofes: [2], versos: [1] };
        assert.equal(overlapEntre(a, b), true);
    });
});

describe('detectarSobrepostos', () => {
    it('marca só os itens envolvidos em algum cruzamento, ignorando os isolados', () => {
        const unidades = [
            { id: 1, posicao: { estrofes: [3, 4], versos: 'todos' } }, // Resolução
            { id: 2, posicao: { estrofes: [1, 2], versos: 'todos' } }, // Proposição — isolada
        ];
        const eventos = [
            { id: 3, posicao: { estrofes: [4], versos: [1] } }, // Volta — cruza com id 1
            { id: 4, posicao: { estrofes: [], versos: 'todos' } }, // não posicionado
        ];
        const sobrepostos = detectarSobrepostos(unidades, eventos);
        assert.deepEqual([...sobrepostos].sort(), [1, 3]);
    });

    it('detecta sobreposição Unidade×Unidade e Evento×Evento igual a Unidade×Evento', () => {
        const unidades = [
            { id: 1, posicao: { estrofes: [1], versos: 'todos' } },
            { id: 2, posicao: { estrofes: [1], versos: [1] } },
        ];
        const eventos = [
            { id: 3, posicao: { estrofes: [2], versos: [1] } },
            { id: 4, posicao: { estrofes: [2], versos: [1, 2] } },
        ];
        const sobrepostos = detectarSobrepostos(unidades, eventos);
        assert.deepEqual([...sobrepostos].sort(), [1, 2, 3, 4]);
    });
});

describe('ordenarPorPosicao', () => {
    it('ordena pela posição no texto, não posicionados sempre ao final', () => {
        const itens = [
            { id: 'nao-posicionado', posicao: { estrofes: [], versos: 'todos' } },
            { id: 'estrofe-3', posicao: { estrofes: [3], versos: 'todos' } },
            { id: 'estrofe-1-verso-2', posicao: { estrofes: [1], versos: [2] } },
            { id: 'estrofe-1-verso-1', posicao: { estrofes: [1], versos: [1] } },
        ];
        const ordenado = ordenarPorPosicao(itens).map((i) => i.id);
        assert.deepEqual(ordenado, [
            'estrofe-1-verso-1',
            'estrofe-1-verso-2',
            'estrofe-3',
            'nao-posicionado',
        ]);
    });

    it('preserva a ordem original entre itens com a mesma posição (estável)', () => {
        const itens = [
            { id: 'a', posicao: { estrofes: [1], versos: 'todos' } },
            { id: 'b', posicao: { estrofes: [1], versos: 'todos' } },
        ];
        assert.deepEqual(
            ordenarPorPosicao(itens).map((i) => i.id),
            ['a', 'b'],
        );
    });
});

describe('instanciarTemplateEstrutura / extrairClassificacaoParaTemplate', () => {
    const templateSoneto = {
        nome: 'Soneto',
        unidades: [
            { unidadeEstrofica: 'Quartetos', unidadeDiscursiva: 'Proposição' },
            { unidadeEstrofica: 'Tercetos', unidadeDiscursiva: 'Resolução' },
        ],
        eventos: [{ progressaoDialetica: 'Volta' }],
    };

    it('instancia Unidades/Eventos sempre não posicionados, com ids próprios', () => {
        const { unidadesNovas, eventosNovos } = instanciarTemplateEstrutura(templateSoneto);
        assert.equal(unidadesNovas.length, 2);
        assert.equal(eventosNovos.length, 1);
        unidadesNovas.concat(eventosNovos).forEach((item) => {
            assert.equal(itemPosicionado(item.posicao), false);
            assert.ok(item.id);
        });
        assert.equal(unidadesNovas[0].unidadeEstrofica, 'Quartetos');
    });

    it('é o inverso de extrairClassificacaoParaTemplate (ida e volta preserva a classificação)', () => {
        const { unidadesNovas, eventosNovos } = instanciarTemplateEstrutura(templateSoneto);
        const extraido = extrairClassificacaoParaTemplate(unidadesNovas, eventosNovos);
        assert.deepEqual(extraido, {
            unidades: templateSoneto.unidades,
            eventos: templateSoneto.eventos,
        });
    });
});

describe('resumoPosicao', () => {
    it('cobre os formatos de resumo', () => {
        assert.equal(resumoPosicao({ estrofes: [], versos: 'todos' }), 'Não posicionado');
        assert.equal(resumoPosicao({ estrofes: [1], versos: 'todos' }), 'Estrofe 1, todos os versos');
        assert.equal(
            resumoPosicao({ estrofes: [1, 2], versos: 'todos' }),
            'Estrofes 1, 2, todos os versos',
        );
        assert.equal(resumoPosicao({ estrofes: [4], versos: [1] }), 'Estrofe 4, verso 1');
        assert.equal(resumoPosicao({ estrofes: [4], versos: [1, 2] }), 'Estrofe 4, versos 1, 2');
    });
});

describe('estado de edição do modal', () => {
    const poema = { texto: TEXTO_SONETO };

    beforeEach(() => {
        inicializarEstruturaTextual(null, null, poema, null);
    });

    it('inicia vazio pra um poema sem estrutura salva ainda', () => {
        assert.deepEqual(obterUnidadesAtuais(), []);
        assert.deepEqual(obterEventosAtuais(), []);
    });

    it('adicionarUnidade/adicionarEvento criam item não posicionado', () => {
        adicionarUnidade('Quartetos', 'Proposição');
        adicionarEvento('Volta');
        assert.equal(obterUnidadesAtuais().length, 1);
        assert.equal(obterEventosAtuais().length, 1);
        assert.equal(itemPosicionado(obterUnidadesAtuais()[0].posicao), false);
    });

    it('não adiciona unidade/evento totalmente vazio', () => {
        adicionarUnidade('', '');
        adicionarEvento('   ');
        assert.equal(obterUnidadesAtuais().length, 0);
        assert.equal(obterEventosAtuais().length, 0);
    });

    it('removerUnidade/removerEvento tiram o item da lista', () => {
        adicionarUnidade('Quartetos', 'Proposição');
        const id = obterUnidadesAtuais()[0].id;
        removerUnidade(id);
        assert.equal(obterUnidadesAtuais().length, 0);

        adicionarEvento('Volta');
        const idEvento = obterEventosAtuais()[0].id;
        removerEvento(idEvento);
        assert.equal(obterEventosAtuais().length, 0);
    });

    it('toggleEstrofeItem marca/desmarca estrofe e força versos "todos" com 2+ marcadas', () => {
        adicionarUnidade('Quartetos', 'Proposição');
        const id = obterUnidadesAtuais()[0].id;
        toggleEstrofeItem('unidade', id, 1);
        toggleEstrofeItem('unidade', id, 2);
        const item = obterUnidadesAtuais()[0];
        assert.deepEqual(item.posicao.estrofes, [1, 2]);
        assert.equal(item.posicao.versos, 'todos');

        toggleEstrofeItem('unidade', id, 2); // desmarca, volta pra 1 estrofe só
        assert.deepEqual(obterUnidadesAtuais()[0].posicao.estrofes, [1]);
    });

    it('setVersosTodosItem/toggleVersoItem controlam a seleção fina (só com 1 estrofe)', () => {
        adicionarEvento('Volta');
        const id = obterEventosAtuais()[0].id;
        toggleEstrofeItem('evento', id, 3);
        setVersosTodosItem('evento', id, false);
        toggleVersoItem('evento', id, 1);
        assert.deepEqual(obterEventosAtuais()[0].posicao, { estrofes: [3], versos: [1] });

        setVersosTodosItem('evento', id, true);
        assert.equal(obterEventosAtuais()[0].posicao.versos, 'todos');
    });

    it('toggleVersoItem não faz nada enquanto versos estiver em "todos"', () => {
        adicionarEvento('Volta');
        const id = obterEventosAtuais()[0].id;
        toggleEstrofeItem('evento', id, 3); // versos nasce 'todos'
        toggleVersoItem('evento', id, 1);
        assert.equal(obterEventosAtuais()[0].posicao.versos, 'todos');
    });

    it('aplicarTemplateNoEstado concatena com o que já existe, sem substituir', () => {
        adicionarUnidade('Oitava', 'Apresentação');
        aplicarTemplateNoEstado({
            unidades: [{ unidadeEstrofica: 'Quartetos', unidadeDiscursiva: 'Proposição' }],
            eventos: [{ progressaoDialetica: 'Volta' }],
        });
        assert.equal(obterUnidadesAtuais().length, 2);
        assert.equal(obterEventosAtuais().length, 1);
    });
});
