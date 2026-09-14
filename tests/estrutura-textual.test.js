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
    recalcularEstrofesLinhasIgnoradas,
    atualizarCampoEstrutura,
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

    it('linhasIgnoradas remove a linha inteira antes de tudo, sem contar nem como quebra de estrofe', () => {
        // linha 1 = título (deve ser ignorada), linha 2 = verso 1, linha 3
        // vazia, linha 4 = verso 2 — sem a linha 1, o poema efetivo é
        // "Verso A\n\nVerso B": 2 estrofes, cada uma com 1 verso.
        const texto = 'Título do poema\nVerso A\n\nVerso B';
        const estrofes = construirEstrofesDoTexto(texto, '1');
        assert.equal(estrofes.length, 2);
        assert.equal(estrofes[0].versos[0].texto, 'Verso A');
        assert.equal(estrofes[0].versos[0].numero, 1);
        assert.equal(estrofes[1].versos[0].texto, 'Verso B');
    });

    it('linhasIgnoradas aceita intervalos e números soltos misturados', () => {
        const texto = 'Ignora 1\nIgnora 2\nVerso real\nIgnora 4\nIgnora 5\nOutro verso';
        const estrofes = construirEstrofesDoTexto(texto, '1-2, 4-5');
        const versos = estrofes.flatMap((e) => e.versos.map((v) => v.texto));
        assert.deepEqual(versos, ['Verso real', 'Outro verso']);
    });

    it('remove comentário HTML por completo (não vira texto nem afeta a linha)', () => {
        const estrofes = construirEstrofesDoTexto('Verso com <!-- nota da autora --> comentário');
        assert.equal(estrofes[0].versos[0].texto, 'Verso com  comentário');
    });

    it('remove apenas a tag de um elemento HTML (ex.: div), preservando o conteúdo', () => {
        const estrofes = construirEstrofesDoTexto(
            '<div style="font-weight:bold">Verso em negrito</div> normal',
        );
        assert.equal(estrofes[0].versos[0].texto, 'Verso em negrito normal');
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
        assert.equal(
            resumoPosicao({ estrofes: [1], versos: 'todos' }),
            'Estrofe 1, todos os versos',
        );
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
        adicionarUnidade('', 'Quartetos', 'Proposição');
        adicionarEvento('Volta');
        assert.equal(obterUnidadesAtuais().length, 1);
        assert.equal(obterEventosAtuais().length, 1);
        assert.equal(itemPosicionado(obterUnidadesAtuais()[0].posicao), false);
    });

    it('adicionarUnidade guarda o nome/descrição da camada quando informado', () => {
        adicionarUnidade('Presença e ausência', 'Dísticos em contraste', 'Proposição');
        const unidade = obterUnidadesAtuais()[0];
        assert.equal(unidade.nome, 'Presença e ausência');
        assert.equal(unidade.unidadeEstrofica, 'Dísticos em contraste');
    });

    it('adicionarUnidade aceita só o nome, sem classificação', () => {
        adicionarUnidade('Só um nome', '', '');
        assert.equal(obterUnidadesAtuais().length, 1);
        assert.equal(obterUnidadesAtuais()[0].nome, 'Só um nome');
    });

    it('não adiciona unidade/evento totalmente vazio', () => {
        adicionarUnidade('', '', '');
        adicionarEvento('   ');
        assert.equal(obterUnidadesAtuais().length, 0);
        assert.equal(obterEventosAtuais().length, 0);
    });

    it('removerUnidade/removerEvento tiram o item da lista', () => {
        adicionarUnidade('', 'Quartetos', 'Proposição');
        const id = obterUnidadesAtuais()[0].id;
        removerUnidade(id);
        assert.equal(obterUnidadesAtuais().length, 0);

        adicionarEvento('Volta');
        const idEvento = obterEventosAtuais()[0].id;
        removerEvento(idEvento);
        assert.equal(obterEventosAtuais().length, 0);
    });

    it('toggleEstrofeItem marca/desmarca estrofe e força versos "todos" com 2+ marcadas', () => {
        adicionarUnidade('', 'Quartetos', 'Proposição');
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
        adicionarUnidade('', 'Oitava', 'Apresentação');
        aplicarTemplateNoEstado({
            unidades: [{ unidadeEstrofica: 'Quartetos', unidadeDiscursiva: 'Proposição' }],
            eventos: [{ progressaoDialetica: 'Volta' }],
        });
        assert.equal(obterUnidadesAtuais().length, 2);
        assert.equal(obterEventosAtuais().length, 1);
    });
});

describe('atualizarCampoEstrutura', () => {
    const poema = { texto: TEXTO_SONETO };

    beforeEach(() => {
        inicializarEstruturaTextual(null, null, poema, null);
    });

    it('atualiza nome/unidadeEstrofica/unidadeDiscursiva de uma Unidade existente', () => {
        adicionarUnidade('', 'Quartetos', 'Proposição');
        const id = obterUnidadesAtuais()[0].id;
        atualizarCampoEstrutura('unidade', id, 'nome', 'Presença e ausência');
        atualizarCampoEstrutura('unidade', id, 'unidadeEstrofica', 'Dísticos');
        atualizarCampoEstrutura('unidade', id, 'unidadeDiscursiva', 'Resolução');
        const unidade = obterUnidadesAtuais()[0];
        assert.equal(unidade.nome, 'Presença e ausência');
        assert.equal(unidade.unidadeEstrofica, 'Dísticos');
        assert.equal(unidade.unidadeDiscursiva, 'Resolução');
    });

    it('atualiza progressaoDialetica de um Evento existente', () => {
        adicionarEvento('Volta');
        const id = obterEventosAtuais()[0].id;
        atualizarCampoEstrutura('evento', id, 'progressaoDialetica', 'Síntese');
        assert.equal(obterEventosAtuais()[0].progressaoDialetica, 'Síntese');
    });

    it('remove espaços nas pontas do valor', () => {
        adicionarUnidade('', 'Quartetos', 'Proposição');
        const id = obterUnidadesAtuais()[0].id;
        atualizarCampoEstrutura('unidade', id, 'nome', '   Corpo de aprendizados   ');
        assert.equal(obterUnidadesAtuais()[0].nome, 'Corpo de aprendizados');
    });

    it('não faz nada (nem lança erro) quando o id não corresponde a nenhum item', () => {
        adicionarUnidade('', 'Quartetos', 'Proposição');
        assert.doesNotThrow(() => {
            atualizarCampoEstrutura('unidade', 'id-inexistente', 'nome', 'Novo nome');
        });
        assert.equal(obterUnidadesAtuais()[0].nome, '');
    });

    it('não confunde tipo — atualizar como "evento" não afeta uma Unidade com o mesmo id', () => {
        adicionarUnidade('', 'Quartetos', 'Proposição');
        const id = obterUnidadesAtuais()[0].id;
        atualizarCampoEstrutura('evento', id, 'progressaoDialetica', 'Volta');
        assert.equal(obterUnidadesAtuais()[0].unidadeEstrofica, 'Quartetos');
        assert.equal(obterEventosAtuais().length, 0);
    });
});

describe('recalcularEstrofesLinhasIgnoradas (reconciliação de posição — bug das "Linhas a ignorar")', () => {
    it('remove uma estrofe inteira da posição de um item quando ela deixa de existir no novo recorte', () => {
        // "Verso 1\nVerso 2" (estrofe 1) / "Verso 3\nVerso 4" (estrofe 2)
        const poema = { texto: 'Verso 1\nVerso 2\n\nVerso 3\nVerso 4' };
        inicializarEstruturaTextual(null, null, poema, null);
        adicionarUnidade('', 'Dístico', 'Volta');
        const id = obterUnidadesAtuais()[0].id;
        toggleEstrofeItem('unidade', id, 2); // marca a 2ª estrofe ("Verso 3"/"Verso 4")
        assert.deepEqual(obterUnidadesAtuais()[0].posicao.estrofes, [2]);

        // Ignorar as linhas 4-5 ("Verso 3"/"Verso 4") remove a 2ª estrofe
        // por completo — a posição marcada não deve sobreviver apontando
        // pra outro trecho sem aviso: deve simplesmente esvaziar.
        recalcularEstrofesLinhasIgnoradas(poema, '4-5');
        const item = obterUnidadesAtuais()[0];
        assert.deepEqual(item.posicao.estrofes, []);
        assert.equal(item.posicao.versos, 'todos');
    });

    it('limpa a seleção fina de verso quando o número marcado deixa de existir na mesma estrofe', () => {
        // linha1 = título (a ser ignorada depois) / linha2-3 = estrofe 1 /
        // linha4 vazia / linha5 = estrofe 2.
        const poema = { texto: 'Título\nVerso A\nVerso B\n\nVerso C' };
        inicializarEstruturaTextual(null, null, poema, null);
        // Sem "Linhas a ignorar" ainda: estrofe 1 = [1:Título, 2:Verso A,
        // 3:Verso B]. Marca estrofe 1, verso 3 ("Verso B").
        adicionarEvento('Volta');
        const id = obterEventosAtuais()[0].id;
        toggleEstrofeItem('evento', id, 1);
        setVersosTodosItem('evento', id, false);
        toggleVersoItem('evento', id, 3);
        assert.deepEqual(obterEventosAtuais()[0].posicao, { estrofes: [1], versos: [3] });

        // Ignorando a linha do título, a numeração de verso desliza:
        // "Verso B" passa a ser o verso 2 da estrofe 1, não mais o 3 —
        // o item continuava marcado no "verso 3", que sem reconciliação
        // apontaria silenciosamente pra outro trecho (ou pra nada).
        recalcularEstrofesLinhasIgnoradas(poema, '1');
        const item = obterEventosAtuais()[0];
        assert.deepEqual(item.posicao.estrofes, [1]); // a estrofe em si sobrevive
        assert.deepEqual(item.posicao.versos, []); // mas o verso 3 não existe mais nela
    });

    it('mantém a posição intacta quando o recorte novo continua batendo com o que já estava marcado', () => {
        const poema = { texto: TEXTO_SONETO };
        inicializarEstruturaTextual(null, null, poema, null);
        adicionarUnidade('', 'Quartetos', 'Proposição');
        const id = obterUnidadesAtuais()[0].id;
        toggleEstrofeItem('unidade', id, 1);
        setVersosTodosItem('unidade', id, false);
        toggleVersoItem('unidade', id, 1);

        recalcularEstrofesLinhasIgnoradas(poema, ''); // recorte sem mudança nenhuma
        assert.deepEqual(obterUnidadesAtuais()[0].posicao, { estrofes: [1], versos: [1] });
    });

    it('força versos "todos" quando a filtragem deixa 2+ estrofes marcadas (mesmo que antes fosse 1)', () => {
        const poema = { texto: TEXTO_SONETO };
        inicializarEstruturaTextual(null, null, poema, null);
        adicionarEvento('Volta');
        const id = obterEventosAtuais()[0].id;
        toggleEstrofeItem('evento', id, 1);
        toggleEstrofeItem('evento', id, 2); // 2 estrofes marcadas já força 'todos' na origem
        assert.equal(obterEventosAtuais()[0].posicao.versos, 'todos');

        recalcularEstrofesLinhasIgnoradas(poema, ''); // recorte igual, nada deveria mudar
        assert.deepEqual(obterEventosAtuais()[0].posicao.estrofes, [1, 2]);
        assert.equal(obterEventosAtuais()[0].posicao.versos, 'todos');
    });
});
