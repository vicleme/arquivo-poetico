import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Bloco 3: aba Período Biográfico (cartões, filtros Esfera/Categoria/Pessoa/
// Vínculo, contagem "N de M", pessoa oculta) e o modal "Esferas e vínculos".
const htmlModalOpcoes = readFileSync(
    new URL('../modais/modal-opcoes-periodo-biografico.html', import.meta.url),
    'utf8',
);
document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-epocas"></div>
        <div id="lista-epocas"></div>
    </main>
    <div id="modais-container">${htmlModalOpcoes}</div>
`;

const { db } = await import('../js/db.js');
const {
    renderEpocas,
    setFiltroPeriodo,
    limparFiltrosPeriodosBiograficos,
    alternarExibirOcultasEpocas,
} = await import('../js/render-listas.js');
const { initOpcoesPeriodoBiografico } = await import('../js/periodo-biografico-opcoes-ui.js');
const { filtrarTextos } = await import('../js/utils.js');
const {
    ROTULOS_VINCULO_DE_FABRICA,
    textoBuscaEsferas,
    textoBuscaNaturezas,
    textoBuscaVinculos,
    textoBuscaPessoasDoPeriodo,
} = await import('../js/periodo-biografico-campos.js');

const definir = (id, valor) => {
    document.getElementById(id).value = valor;
};
const titulos = () =>
    [...document.querySelectorAll('#lista-epocas h4')].map((h) => h.textContent.trim());
const contagem = () => document.getElementById('fp-epocas-contagem').textContent.trim();
const textoLista = () => document.getElementById('lista-epocas').textContent;

function montarBanco() {
    db.autores = [{ id: 1, nome: 'Ana', genero: 'Mulher' }];
    db.pessoas = [
        { id: 100, nome: 'Carla', genero: 'Mulher', oculto: false },
        { id: 101, nome: 'Davi', genero: 'Homem', oculto: true },
        { id: 102, nome: 'Elisa', genero: 'Mulher', oculto: false },
    ];
    db.opcoesPeriodoBiografico = {
        esferas: ['Afetiva', 'Acadêmica'],
        naturezas: ['Familiar', 'Amizade', 'Romance'],
        vinculos: ['Amizade', 'Romântico', ...ROTULOS_VINCULO_DE_FABRICA.map((r) => r.nome)],
        sugestoesNatureza: [{ vinculo: 'Romântico', natureza: 'Romance' }],
        rotulosVinculo: ROTULOS_VINCULO_DE_FABRICA.map((r) => ({ ...r })),
    };
    db.epocas = [
        {
            id: 10,
            nome: 'Faculdade',
            autorId: 1,
            inicio: { ano: 2010 },
            fim: { ano: 2014 },
            esferas: ['Acadêmica'],
            categorias: ['Transição'],
            pessoasEnvolvidas: [{ pessoaId: 100 }],
            relacoes: [{ de: 'autor', para: 100, natureza: '', vinculo: 'Amizade' }],
        },
        {
            id: 11,
            nome: 'Namoro',
            autorId: 1,
            inicio: { ano: 2015 },
            fim: { ano: 2017 },
            esferas: ['Afetiva'],
            categorias: [],
            pessoasEnvolvidas: [{ pessoaId: 100 }, { pessoaId: 101 }],
            relacoes: [
                { de: 'autor', para: 100, natureza: '', vinculo: 'Romântico' },
                { de: 'autor', para: 101, natureza: '', vinculo: 'Romântico' },
            ],
        },
        {
            id: 12,
            nome: 'Só oculta',
            autorId: 1,
            inicio: { ano: 2018 },
            fim: null,
            esferas: ['Afetiva'],
            categorias: ['Luto'],
            pessoasEnvolvidas: [{ pessoaId: 101 }],
            relacoes: [{ de: 'autor', para: 101, natureza: '', vinculo: 'Amizade' }],
            contextoRelacao: 'Davi e eu', // resto de dado antigo: nunca deve aparecer
        },
        {
            id: 13,
            nome: 'Antigo',
            autorId: 1,
            inicio: null,
            fim: null,
            esferas: [],
            categorias: [],
            pessoasEnvolvidas: [],
            relacoes: [],
            contextoRelacao: 'Parceiro A e Parceiro B', // idem
        },
    ];
}

// Período dos pais: uma mãe visível e um pai oculto, os dois responsáveis pelo autor.
function adicionarPeriodoDaFamilia() {
    db.epocas.push({
        id: 14,
        nome: 'Família',
        autorId: 1,
        inicio: { ano: 1990 },
        fim: null,
        esferas: ['Familiar'],
        categorias: [],
        pessoasEnvolvidas: [{ pessoaId: 102 }, { pessoaId: 101 }],
        relacoes: [
            { de: 102, para: 'autor', natureza: '', vinculo: 'Responsável por' },
            { de: 101, para: 'autor', natureza: '', vinculo: 'Responsável por' },
            { de: 102, para: 101, natureza: '', vinculo: 'Romântico' },
        ],
    });
}

describe('aba Período Biográfico (Bloco 3)', () => {
    beforeEach(() => {
        montarBanco();
        renderEpocas();
        limparFiltrosPeriodosBiograficos();
    });

    it('mostra a contagem total sem filtro e "N de M" com filtro', () => {
        assert.equal(contagem(), '4 períodos');
        definir('fp-epocas-esfera', 'Afetiva');
        setFiltroPeriodo('epocas');
        assert.equal(contagem(), '2 de 4 períodos');
        assert.deepEqual(titulos(), ['Namoro', 'Só oculta']);
    });

    it('filtra por Categoria e por Pessoa', () => {
        definir('fp-epocas-categoria', 'Luto');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), ['Só oculta']);
        limparFiltrosPeriodosBiograficos();
        definir('fp-epocas-pessoa', '100');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), ['Faculdade', 'Namoro']);
    });

    it('Pessoa e Vínculo juntos: o vínculo tem de ser da pessoa escolhida', () => {
        definir('fp-epocas-pessoa', '100');
        definir('fp-epocas-vinculo', 'Romântico');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), ['Namoro']);
    });

    it('pessoa oculta não aparece no cartão, nas opções do filtro nem na busca por nome', () => {
        assert.ok(textoLista().includes('Ana e Carla: Romântico'));
        assert.ok(!textoLista().includes('Davi'));
        const opcoesPessoa = [...document.getElementById('fp-epocas-pessoa').options].map(
            (o) => o.textContent,
        );
        assert.ok(opcoesPessoa.includes('Carla'));
        assert.ok(!opcoesPessoa.includes('Davi'));
        definir('fp-epocas-nome', 'Davi');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), []);
        definir('fp-epocas-nome', 'Carla');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), ['Faculdade', 'Namoro']);
    });

    it('vínculo orientado aparece com o gênero da pessoa; relação com oculta some inteira', () => {
        adicionarPeriodoDaFamilia();
        renderEpocas();
        limparFiltrosPeriodosBiograficos();
        const cartao = [...document.querySelectorAll('#lista-epocas h4')]
            .find((h) => h.textContent.trim() === 'Família')
            .closest('div.flex-1');
        assert.ok(cartao.textContent.includes('Elisa é mãe de Ana'));
        assert.ok(!cartao.textContent.includes('Davi'));
        assert.ok(!cartao.textContent.includes('Romântico'), 'relação com oculto some inteira');
    });

    it('filtro de vínculo orientado: um item para os dois lados, e acha só o visível', () => {
        adicionarPeriodoDaFamilia();
        renderEpocas();
        limparFiltrosPeriodosBiograficos();
        const opcoes = [...document.getElementById('fp-epocas-vinculo').options].map((o) => [
            o.value,
            o.textContent,
        ]);
        assert.ok(
            opcoes.some(([v, t]) => v === 'Responsável por' && t.includes('Filho ou filha de')),
        );
        definir('fp-epocas-vinculo', 'Responsável por');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), ['Família']);
        limparFiltrosPeriodosBiograficos();
        definir('fp-epocas-vinculo', 'Romântico');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), ['Namoro']);
    });

    it('o período de pessoa oculta continua na lista, só sem o nome', () => {
        assert.ok(titulos().includes('Só oculta'));
        assert.ok(!textoLista().includes('Davi e eu'));
    });

    it('o antigo Contexto do relacionamento não aparece mais no cartão', () => {
        assert.ok(!textoLista().includes('Parceiro A e Parceiro B'));
        assert.ok(!textoLista().includes('texto antigo'));
    });

    describe('Exibir ocultas (só na tela, na hora)', () => {
        const botao = () => document.getElementById('fp-epocas-ocultas');
        const opcoesPessoa = () =>
            [...document.getElementById('fp-epocas-pessoa').options].map((o) => o.textContent);

        beforeEach(() => {
            // Cada teste começa escondendo (o padrão do app).
            if (botao().getAttribute('aria-pressed') === 'true') alternarExibirOcultasEpocas();
        });

        it('o botão aparece porque há pessoa oculta no cadastro, e começa desligado', () => {
            assert.ok(!botao().classList.contains('hidden'));
            assert.equal(botao().getAttribute('aria-pressed'), 'false');
            assert.equal(botao().textContent, 'Exibir ocultas');
        });

        it('sem nenhuma pessoa oculta no cadastro, o botão fica escondido', () => {
            db.pessoas.forEach((p) => (p.oculto = false));
            renderEpocas();
            assert.ok(botao().classList.contains('hidden'));
        });

        it('ligado: o cartão mostra a pessoa e as relações com ela, marcadas "(oculta)"', () => {
            adicionarPeriodoDaFamilia();
            renderEpocas();
            assert.ok(!textoLista().includes('Davi'));
            alternarExibirOcultasEpocas();
            assert.equal(botao().getAttribute('aria-pressed'), 'true');
            assert.equal(botao().textContent, 'Esconder ocultas');
            assert.ok(textoLista().includes('Ana e Davi (oculta): Amizade'));
            assert.ok(textoLista().includes('Elisa é mãe de Ana'));
            assert.ok(textoLista().includes('Davi (oculta) é pai de Ana'));
            assert.ok(textoLista().includes('Elisa e Davi (oculta): Romântico'));
        });

        it('ligado: o filtro de Pessoa passa a oferecer a pessoa oculta e filtra por ela', () => {
            assert.ok(!opcoesPessoa().some((t) => t.startsWith('Davi')));
            alternarExibirOcultasEpocas();
            assert.ok(opcoesPessoa().includes('Davi (oculta)'));
            definir('fp-epocas-pessoa', '101');
            setFiltroPeriodo('epocas');
            assert.deepEqual(titulos(), ['Namoro', 'Só oculta']);
        });

        it('ligado: a busca por nome acha a pessoa oculta; desligado, não', () => {
            definir('fp-epocas-nome', 'davi');
            setFiltroPeriodo('epocas');
            assert.deepEqual(titulos(), []);
            alternarExibirOcultasEpocas();
            assert.deepEqual(titulos(), ['Namoro', 'Só oculta']);
        });

        it('desligar de novo esconde tudo e solta o filtro que apontava para a oculta', () => {
            alternarExibirOcultasEpocas();
            definir('fp-epocas-pessoa', '101');
            setFiltroPeriodo('epocas');
            alternarExibirOcultasEpocas();
            assert.equal(document.getElementById('fp-epocas-pessoa').value, '');
            assert.equal(titulos().length, 4);
            assert.ok(!textoLista().includes('Davi'));
        });

        it('não muda o flag da pessoa nem é guardado no banco', () => {
            alternarExibirOcultasEpocas();
            assert.equal(db.pessoas.find((p) => p.id === 101).oculto, true);
            assert.ok(!JSON.stringify(db).includes('exibirOcultas'));
        });
    });

    it('Limpar filtros volta ao estado inicial', () => {
        definir('fp-epocas-esfera', 'Afetiva');
        setFiltroPeriodo('epocas');
        limparFiltrosPeriodosBiograficos();
        assert.equal(titulos().length, 4);
        assert.equal(document.getElementById('fp-epocas-esfera').value, '');
    });
});

describe('busca por prefixo nos textos (Bloco 3)', () => {
    it('esfera:, vinculo: e pessoaperiodo: acham pelo período; oculta não entra', () => {
        montarBanco();
        const decorar = (id, epoca) => ({
            id,
            titulo: `T${id}`,
            _buscaEsferas: textoBuscaEsferas(epoca),
            _buscaVinculos: textoBuscaVinculos(epoca, db),
            _buscaPessoasPeriodo: textoBuscaPessoasDoPeriodo(epoca, db),
        });
        const itens = db.epocas.map((e) => decorar(e.id, e));
        const ids = (q) => filtrarTextos(itens, q).map((i) => i.id);
        assert.deepEqual(ids('esfera:Afetiva'), [11, 12]);
        // o vínculo do período 12 é com uma pessoa oculta: não é achado
        assert.deepEqual(ids('vinculo:Amizade'), [10]);
        assert.deepEqual(ids('pessoaperiodo:Carla'), [10, 11]);
        assert.deepEqual(ids('pessoaperiodo:Davi'), []);
        // sem prefixo, esfera/vínculo não entram na busca geral
        assert.deepEqual(ids('Afetiva'), []);
    });
});

describe('Natureza na aba (item 3)', () => {
    beforeEach(() => {
        montarBanco();
        // Natureza nas relações visíveis: Faculdade (Amizade, sem vínculo) e
        // Namoro (Romance com vínculo Romântico, e uma com a pessoa oculta).
        db.epocas[0].relacoes = [{ de: 'autor', para: 100, natureza: 'Amizade', vinculo: '' }];
        db.epocas[1].relacoes = [
            { de: 'autor', para: 100, natureza: 'Romance', vinculo: 'Romântico' },
            { de: 'autor', para: 101, natureza: 'Romance', vinculo: '' },
        ];
        db.epocas[2].relacoes = [{ de: 'autor', para: 101, natureza: 'Amizade', vinculo: '' }];
        renderEpocas();
        // Começa escondendo as ocultas (o padrão do app), mesmo que um teste
        // anterior tenha deixado "Exibir ocultas" ligado.
        const botao = document.getElementById('fp-epocas-ocultas');
        if (botao.getAttribute('aria-pressed') === 'true') alternarExibirOcultasEpocas();
        limparFiltrosPeriodosBiograficos();
    });

    const opcoes = (id) => [...document.getElementById(id).options].map((o) => o.value);

    it('o filtro de Natureza lista só o que algum período usa em relação visível', () => {
        assert.deepEqual(opcoes('fp-epocas-natureza'), ['', 'Amizade', 'Romance']);
    });

    it('filtra por Natureza e mostra "N de M"', () => {
        definir('fp-epocas-natureza', 'Amizade');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), ['Faculdade']);
        assert.equal(contagem(), '1 de 4 períodos');
        limparFiltrosPeriodosBiograficos();
        assert.equal(document.getElementById('fp-epocas-natureza').value, '');
        assert.equal(contagem(), '4 períodos');
    });

    it('Natureza + Vínculo: a mesma relação tem de ter os dois', () => {
        definir('fp-epocas-natureza', 'Romance');
        definir('fp-epocas-vinculo', 'Romântico');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), ['Namoro']);
        definir('fp-epocas-natureza', 'Amizade');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), []);
    });

    it('o cartão mostra a relação só com Natureza em frase simétrica', () => {
        assert.ok(textoLista().includes('Ana e Carla têm uma relação de amizade'));
        assert.ok(!textoLista().includes('Davi'), 'relação com oculta some inteira');
    });

    it('a busca por nome da aba acha pela Natureza', () => {
        definir('fp-epocas-nome', 'amizade');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos(), ['Faculdade']);
    });

    it('natureza: acha pelo período do texto; oculta não entra; sem prefixo não entra', () => {
        const decorar = (epoca) => ({
            id: epoca.id,
            titulo: `T${epoca.id}`,
            _buscaNaturezas: textoBuscaNaturezas(epoca, db),
            _buscaVinculos: textoBuscaVinculos(epoca, db),
        });
        const itens = db.epocas.map(decorar);
        const ids = (q) => filtrarTextos(itens, q).map((i) => i.id);
        assert.deepEqual(ids('natureza:Amizade'), [10]);
        assert.deepEqual(ids('natureza:Romance'), [11]);
        assert.deepEqual(ids('vinculo:Romântico'), [11]);
        assert.deepEqual(ids('vinculo:Amizade'), [], 'Amizade é Natureza aqui, não vínculo');
        assert.deepEqual(ids('Romance'), []);
    });
});

describe('modal Esferas, naturezas e vínculos (item 3)', () => {
    beforeEach(() => {
        montarBanco();
        db.epocas[0].relacoes = [{ de: 'autor', para: 100, natureza: 'Amizade', vinculo: '' }];
        renderEpocas();
        initOpcoesPeriodoBiografico();
    });

    const abrir = async () => {
        const { abrirOpcoesPeriodoBiografico } =
            await import('../js/periodo-biografico-opcoes-ui.js');
        await abrirOpcoesPeriodoBiografico();
    };
    const nomes = (tipo) =>
        [...document.querySelectorAll(`#opb-${tipo}-lista [data-valor]`)].map(
            (l) => l.dataset.valor,
        );

    it('tem a seção Naturezas e adiciona uma nova', async () => {
        await abrir();
        definir('opb-naturezas-novo', 'Vizinhança');
        document.getElementById('opb-naturezas-adicionar').click();
        assert.ok(db.opcoesPeriodoBiografico.naturezas.includes('Vizinhança'));
        assert.ok(nomes('naturezas').includes('Vizinhança'));
    });

    it('a Natureza em uso não pode ser apagada; a sem uso pode', async () => {
        await abrir();
        const apagar = (valor) =>
            [
                ...document.querySelectorAll(`#opb-naturezas-lista [data-valor="${valor}"] button`),
            ].find((b) => b.textContent === 'Apagar');
        assert.equal(apagar('Amizade').disabled, true);
        assert.equal(apagar('Familiar').disabled, false);
        apagar('Familiar').click();
        assert.ok(!db.opcoesPeriodoBiografico.naturezas.includes('Familiar'));
    });

    it('renomear a Natureza muda a relação do período', async () => {
        await abrir();
        const linha = document.querySelector('#opb-naturezas-lista [data-valor="Amizade"]');
        const input = linha.querySelector('input');
        input.value = 'Amizades';
        [...linha.querySelectorAll('button')].find((b) => b.textContent === 'Renomear').click();
        assert.equal(db.epocas[0].relacoes[0].natureza, 'Amizades');
    });

    it('cada Vínculo tem o seletor da Natureza sugerida, que grava no vocabulário', async () => {
        await abrir();
        const select = document.querySelector('select[data-natureza-sugerida="Romântico"]');
        assert.ok(select, 'seletor no vínculo');
        assert.equal(select.value, 'Romance');
        const outro = document.querySelector('select[data-natureza-sugerida="Amizade"]');
        outro.value = 'Amizade';
        outro.onchange();
        assert.equal(
            db.opcoesPeriodoBiografico.sugestoesNatureza.find((s) => s.vinculo === 'Amizade')
                .natureza,
            'Amizade',
        );
        const novo = document.querySelector('select[data-natureza-sugerida="Amizade"]');
        novo.value = '';
        novo.onchange();
        assert.ok(
            !db.opcoesPeriodoBiografico.sugestoesNatureza.some((s) => s.vinculo === 'Amizade'),
        );
    });
});

describe('check e aviso de alterações no modal de vocabulário', () => {
    beforeEach(() => {
        montarBanco();
        renderEpocas();
        initOpcoesPeriodoBiografico();
    });

    const abrir = async () => {
        const { abrirOpcoesPeriodoBiografico } =
            await import('../js/periodo-biografico-opcoes-ui.js');
        await abrirOpcoesPeriodoBiografico();
    };
    const linha = (tipo, valor) =>
        document.querySelector(`#opb-${tipo}-lista [data-valor="${valor}"]`);
    const botao = (el, texto) =>
        [...el.querySelectorAll('button')].find((b) => b.textContent === texto);

    it('tem o check ao lado do X', async () => {
        await abrir();
        const check = document.getElementById('opb-salvar-tudo');
        assert.ok(check);
        assert.equal(check.nextElementSibling.getAttribute('aria-label'), 'Fechar');
    });

    it('sem nada digitado, não há pendência', async () => {
        const { rastreadorOpcoesPeriodoBiografico: r } =
            await import('../js/periodo-biografico-opcoes-ui.js');
        await abrir();
        assert.equal(r.estaSujo(), false);
    });

    it('nome editado, Papéis alterado e valor novo contam como pendência', async () => {
        const { rastreadorOpcoesPeriodoBiografico: r } =
            await import('../js/periodo-biografico-opcoes-ui.js');
        await abrir();
        const nome = linha('naturezas', 'Amizade').querySelector('input');
        nome.value = 'Amizades';
        assert.equal(r.estaSujo(), true);
        nome.value = 'Amizade';
        assert.equal(r.estaSujo(), false);
        const campo = document.querySelector('[data-painel-papeis] [data-campo-papel="nota"]');
        campo.value = 'texto novo';
        assert.equal(r.estaSujo(), true);
        campo.value = campo.dataset.original;
        definir('opb-esferas-novo', 'Estudos');
        assert.equal(r.estaSujo(), true);
        r.marcarLimpo();
        assert.equal(r.estaSujo(), false);
    });

    it('o check aplica renomeação, Papéis e valor novo de uma vez e fecha', async () => {
        const { salvarTudoOpcoesPeriodoBiografico: salvarTudo } =
            await import('../js/periodo-biografico-opcoes-ui.js');
        await abrir();
        linha('naturezas', 'Familiar').querySelector('input').value = 'Parentesco';
        const painel = document.querySelector('[data-painel-papeis]');
        const vinculoAlvo = painel.dataset.painelPapeis;
        painel.querySelector('[data-campo-papel="nota"]').value = 'minha nota';
        definir('opb-esferas-novo', 'Estudos');
        document.getElementById('opb-salvar-tudo').click();
        assert.ok(db.opcoesPeriodoBiografico.naturezas.includes('Parentesco'));
        assert.ok(!db.opcoesPeriodoBiografico.naturezas.includes('Familiar'));
        assert.ok(db.opcoesPeriodoBiografico.esferas.includes('Estudos'));
        assert.equal(
            db.opcoesPeriodoBiografico.rotulosVinculo.find((x) => x.nome === vinculoAlvo).nota,
            'minha nota',
        );
        assert.equal(typeof salvarTudo, 'function');
    });

    it('nome vazio ou já existente barra tudo e nada muda', async () => {
        const { salvarTudoOpcoesPeriodoBiografico: salvarTudo } =
            await import('../js/periodo-biografico-opcoes-ui.js');
        await abrir();
        linha('naturezas', 'Familiar').querySelector('input').value = 'Amizade';
        definir('opb-esferas-novo', 'Estudos');
        assert.equal(salvarTudo(), false);
        assert.ok(db.opcoesPeriodoBiografico.naturezas.includes('Familiar'));
        assert.ok(!db.opcoesPeriodoBiografico.esferas.includes('Estudos'));
        linha('naturezas', 'Familiar').querySelector('input').value = '  ';
        assert.equal(salvarTudo(), false);
        assert.ok(botao(linha('naturezas', 'Familiar'), 'Renomear'));
    });
});

describe('organizar vínculos por Natureza sugerida', () => {
    beforeEach(() => {
        montarBanco();
        renderEpocas();
        initOpcoesPeriodoBiografico();
    });

    const abrir = async () => {
        const { abrirOpcoesPeriodoBiografico } =
            await import('../js/periodo-biografico-opcoes-ui.js');
        await abrirOpcoesPeriodoBiografico();
    };
    const trocar = (valor) => {
        const select = document.getElementById('opb-vinculos-ordem');
        select.value = valor;
        select.dispatchEvent(new window.Event('change'));
    };

    it('agrupa por Natureza sugerida, com os sem sugestão no fim, e volta ao alfabético', async () => {
        await abrir();
        const { definirNaturezaSugerida } = await import('../js/periodo-biografico-campos.js');
        const antes = [...document.querySelectorAll('#opb-vinculos-lista [data-valor]')].map(
            (l) => l.dataset.valor,
        );
        assert.equal(document.querySelectorAll('[data-grupo-natureza]').length, 0);
        definirNaturezaSugerida(db, antes[0], '');
        trocar('natureza');
        const grupos = [...document.querySelectorAll('[data-grupo-natureza]')].map(
            (g) => g.dataset.grupoNatureza,
        );
        assert.ok(grupos.length >= 1);
        assert.equal(grupos.at(-1), 'Sem natureza sugerida');
        const depois = [...document.querySelectorAll('#opb-vinculos-lista [data-valor]')].map(
            (l) => l.dataset.valor,
        );
        assert.deepEqual([...depois].sort(), [...antes].sort());
        trocar('alfabetica');
        assert.equal(document.querySelectorAll('[data-grupo-natureza]').length, 0);
        const volta = [...document.querySelectorAll('#opb-vinculos-lista [data-valor]')].map(
            (l) => l.dataset.valor,
        );
        assert.deepEqual(volta, antes);
    });

    it('"Varia" é uma escolha própria, vira grupo e não preenche Natureza', async () => {
        await abrir();
        const { naturezaSugeridaDoVinculo, vinculoVariaDeNatureza } =
            await import('../js/periodo-biografico-campos.js');
        const select = document.querySelector('select[data-natureza-sugerida]');
        const V = select.dataset.naturezaSugerida;
        const sel = () => document.querySelector(`select[data-natureza-sugerida="${V}"]`);
        assert.ok([...select.options].some((o) => o.textContent === 'Varia'));
        select.value = '__varia__';
        select.onchange();
        assert.equal(vinculoVariaDeNatureza(db, V), true);
        assert.equal(naturezaSugeridaDoVinculo(db, V), '');
        assert.equal(sel().value, '__varia__');
        trocar('natureza');
        const grupos = [...document.querySelectorAll('[data-grupo-natureza]')].map(
            (g) => g.dataset.grupoNatureza,
        );
        assert.ok(grupos.includes('Varia'));
        if (grupos.includes('Sem natureza sugerida'))
            assert.ok(grupos.indexOf('Varia') < grupos.indexOf('Sem natureza sugerida'));
        const outro = sel();
        outro.value = 'Amizade';
        outro.onchange();
        assert.equal(vinculoVariaDeNatureza(db, V), false);
        assert.equal(naturezaSugeridaDoVinculo(db, V), 'Amizade');
    });

    it('não reorganiza com alteração pendente', async () => {
        await abrir();
        trocar('alfabetica');
        definir('opb-vinculos-novo', 'Rival');
        trocar('natureza');
        assert.equal(document.getElementById('opb-vinculos-ordem').value, 'alfabetica');
        assert.equal(document.getElementById('opb-vinculos-novo').value, 'Rival');
    });
});

describe('modal Esferas e vínculos (Bloco 3)', () => {
    beforeEach(() => {
        montarBanco();
        renderEpocas();
        initOpcoesPeriodoBiografico();
    });

    it('adicionar valor novo entra na lista da esfera', async () => {
        definir('opb-esferas-novo', 'Criativa');
        document.getElementById('opb-esferas-adicionar').click();
        assert.ok(db.opcoesPeriodoBiografico.esferas.includes('Criativa'));
        const nomes = [...document.querySelectorAll('#opb-esferas-lista input')].map(
            (i) => i.value,
        );
        assert.ok(nomes.includes('Criativa'));
    });

    it('a lista de vínculos mostra só os nomes diretos, não o lado oposto', () => {
        definir('opb-vinculos-novo', 'Mentoria');
        document.getElementById('opb-vinculos-adicionar').click();
        const nomes = [...document.querySelectorAll('#opb-vinculos-lista [data-valor]')].map(
            (l) => l.dataset.valor,
        );
        assert.ok(nomes.includes('Responsável por'));
        assert.ok(!nomes.includes('Filho ou filha de'));
    });

    it('Papéis: define lado oposto e formas por gênero e recusa nome repetido', () => {
        definir('opb-vinculos-novo', 'Mentoria');
        document.getElementById('opb-vinculos-adicionar').click();
        const painel = () => document.querySelector('[data-painel-papeis="Mentoria"]');
        const campo = (nome) => painel().querySelector(`[data-campo-papel="${nome}"]`);
        const salvar = () =>
            [...painel().querySelectorAll('button')]
                .find((b) => b.textContent === 'Salvar papéis')
                .click();
        campo('inverso').value = 'Amizade';
        salvar();
        assert.ok(
            !db.opcoesPeriodoBiografico.rotulosVinculo.some((r) => r.nome === 'Mentoria'),
            'lado oposto igual a outro vínculo é recusado',
        );
        campo('inverso').value = 'Mentorado(a) por';
        campo('feminino').value = 'Mentora de';
        campo('masculino').value = 'Mentor de';
        salvar();
        const rotulo = db.opcoesPeriodoBiografico.rotulosVinculo.find((r) => r.nome === 'Mentoria');
        assert.equal(rotulo.inverso, 'Mentorado(a) por');
        assert.equal(rotulo.feminino, 'Mentora de');
        assert.equal(rotulo.masculino, 'Mentor de');
    });
});

describe('modal: seção Categorias (lista própria, 15/10/2026)', () => {
    beforeEach(() => {
        montarBanco();
        db.opcoesPeriodoBiografico.categorias = ['Crise', 'Conquista', 'Recomeço'];
        db.epocas[0].categorias = ['Crise'];
        renderEpocas();
        initOpcoesPeriodoBiografico();
    });

    const abrir = async () => {
        const { abrirOpcoesPeriodoBiografico } =
            await import('../js/periodo-biografico-opcoes-ui.js');
        await abrirOpcoesPeriodoBiografico();
    };
    const nomes = () =>
        [...document.querySelectorAll('#opb-categorias-lista [data-valor]')].map(
            (l) => l.dataset.valor,
        );
    const linha = (valor) =>
        document.querySelector(`#opb-categorias-lista [data-valor="${valor}"]`);
    const botao = (el, texto) =>
        [...el.querySelectorAll('button')].find((b) => b.textContent === texto);

    it('lista as categorias em ordem alfabética, com a contagem de uso', async () => {
        await abrir();
        // 'Luto' não está na lista, mas outro período o usa: valor em uso sempre aparece.
        assert.deepEqual(nomes(), ['Conquista', 'Crise', 'Luto', 'Recomeço']);
        assert.match(linha('Crise').textContent, /1 período/);
        assert.match(linha('Conquista').textContent, /sem uso/);
    });

    it('adicionar valor novo entra na lista de Categoria e nas sugestões do modal do período', async () => {
        await abrir();
        definir('opb-categorias-novo', 'Suspensão ou espera');
        document.getElementById('opb-categorias-adicionar').click();
        assert.ok(db.opcoesPeriodoBiografico.categorias.includes('Suspensão ou espera'));
        assert.ok(nomes().includes('Suspensão ou espera'));
    });

    it('a categoria em uso não pode ser apagada; a sem uso pode', async () => {
        await abrir();
        assert.equal(botao(linha('Crise'), 'Apagar').disabled, true);
        botao(linha('Conquista'), 'Apagar').onclick();
        assert.ok(!db.opcoesPeriodoBiografico.categorias.includes('Conquista'));
        assert.ok(!nomes().includes('Conquista'));
    });

    it('renomear propaga para os períodos', async () => {
        await abrir();
        linha('Crise').querySelector('input').value = 'Crise aguda';
        botao(linha('Crise'), 'Renomear').onclick();
        assert.deepEqual(db.epocas[0].categorias, ['Crise aguda']);
        assert.ok(db.opcoesPeriodoBiografico.categorias.includes('Crise aguda'));
    });

    it('o check aplica renomeação de categoria e categoria nova de uma vez', async () => {
        await abrir();
        linha('Recomeço').querySelector('input').value = 'Retomada';
        definir('opb-categorias-novo', 'Despertar ou conscientização');
        document.getElementById('opb-salvar-tudo').click();
        assert.ok(db.opcoesPeriodoBiografico.categorias.includes('Retomada'));
        assert.ok(!db.opcoesPeriodoBiografico.categorias.includes('Recomeço'));
        assert.ok(db.opcoesPeriodoBiografico.categorias.includes('Despertar ou conscientização'));
    });

    it('categoria digitada e ainda não aplicada conta como pendência', async () => {
        const { rastreadorOpcoesPeriodoBiografico: r } =
            await import('../js/periodo-biografico-opcoes-ui.js');
        await abrir();
        assert.equal(r.estaSujo(), false);
        definir('opb-categorias-novo', 'Nova');
        assert.equal(r.estaSujo(), true);
        r.marcarLimpo();
        assert.equal(r.estaSujo(), false);
    });
});
