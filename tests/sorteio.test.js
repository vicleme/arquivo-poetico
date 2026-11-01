import './helpers/localstorage-shim.js';

// Sorteio de texto para leitura, lógica pura (entrega 4a).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    PISO_FAVORITO_AUTOR,
    textoElegivel,
    textosElegiveis,
    ehFavoritoDoAutor,
    elegiveisPorCriterios,
    contarPorUniversal,
    avisosDoTexto,
    registrarRecente,
    historicoDosRecentes,
    recentesAEvitar,
    RECENTES_MAXIMO,
    chaveDoTexto,
    sortearTexto,
    FAIXAS_EXTENSAO,
    NOTA_CONVENCAO_EXTENSAO,
    contarVersos,
    contarPalavras,
    medidaDoTexto,
    faixaDaMedida,
    faixaDoTexto,
    limitesDaFaixa,
    legendaDaFaixa,
    contarPorExtensao,
    contarPorTipo,
    TIPOS_SORTEIO,
    rotuloDeExtensao,
    PALAVRAS_POR_MINUTO,
    ROTULO_EM_CONSTRUCAO,
    textoEmConstrucao,
    linhaDoTipo,
    ROTULO_SO_COMECO,
    contarForaPorLeitura,
    avisoForaPorLeitura,
    ehSensivel,
    contarForaPorSensivel,
    avisoForaPorSensivel,
    contarPorValencia,
    pesoDoTexto,
    PESOS_SORTEIO,
    versoesDeTraducaoDoSorteio,
    versoesNoIdiomaPreferido,
    ehReconhecido,
    contarForaPorReconhecimento,
    avisoForaPorReconhecimento,
    idiomasDasVersoes,
} from '../js/sorteio.js';

const t = (id, extra = {}) => ({
    id,
    titulo: `T${id}`,
    texto: 'verso',
    status: 'publicado',
    sorteavel: true,
    temas: [],
    ...extra,
});
const tm = (...ids) => ids.map((temaId) => ({ temaId, papel: '' }));

const dbBase = () => ({
    temas: [
        { id: 1, nome: 'Saudade' },
        { id: 2, nome: 'Luto' },
        { id: 3, nome: 'Cotidiano' },
    ],
    temasUniversais: [
        { id: 10, nome: 'Perda', temaIds: [1, 2] },
        { id: 11, nome: 'Dia a dia', temaIds: [3] },
        { id: 12, nome: 'Vazio', temaIds: [] },
    ],
    poemas: [
        t(1, { temas: tm(1), autoclassificacao: 4.5 }),
        t(2, { temas: tm(2), autoclassificacao: 3 }),
        t(3, { temas: tm(3), autoclassificacao: 5 }),
        t(4, { temas: tm(1), sorteavel: false, autoclassificacao: 5 }),
        t(5, { temas: tm(1), status: 'descartado', autoclassificacao: 5 }),
        t(6, { temas: tm(1), status: 'privado' }),
        t(7, { temas: tm(2), texto: '  ' }),
    ],
    prosas: [t(20, { temas: tm(1, 3), autoclassificacao: 4 }), t(21, { temas: [] })],
});
const ids = (lista) => lista.map(({ tipo, item }) => `${tipo}:${item.id}`);
const fixo = (n) => () => n;

describe('elegibilidade', () => {
    it('exige a marca; Descartado, Privado e texto vazio ficam de fora mesmo marcados', () => {
        assert.equal(textoElegivel(t(1)), true);
        assert.equal(textoElegivel(t(1, { sorteavel: false })), false);
        assert.equal(textoElegivel(t(1, { sorteavel: undefined })), false);
        assert.equal(textoElegivel(t(1, { status: 'descartado' })), false);
        assert.equal(textoElegivel(t(1, { status: 'privado' })), false);
        assert.equal(textoElegivel(t(1, { texto: ' ' })), false);
        for (const s of ['incompleto', 'completo', 'publicado', 'migrado']) {
            assert.equal(textoElegivel(t(1, { status: s })), true, s);
        }
    });
    it('textosElegiveis junta poemas e prosas, nessa ordem', () => {
        assert.deepEqual(ids(textosElegiveis(dbBase())), [
            'poema:1',
            'poema:2',
            'poema:3',
            'prosa:20',
            'prosa:21',
        ]);
    });
});

describe('favoritos do autor', () => {
    it('piso 4: 4 ou mais conta; 0, ausente e abaixo do piso não', () => {
        assert.equal(PISO_FAVORITO_AUTOR, 4);
        assert.equal(ehFavoritoDoAutor({ autoclassificacao: 4 }), true);
        assert.equal(ehFavoritoDoAutor({ autoclassificacao: 4.5 }), true);
        assert.equal(ehFavoritoDoAutor({ autoclassificacao: 3.5 }), false);
        assert.equal(ehFavoritoDoAutor({ autoclassificacao: 0 }), false);
        assert.equal(ehFavoritoDoAutor({}), false);
        assert.equal(ehFavoritoDoAutor({ autoclassificacao: 'x' }), false);
        assert.equal(ehFavoritoDoAutor({ autoclassificacao: 3 }, 3), true);
    });
});

describe('elegiveisPorCriterios', () => {
    it('sem critério, o sorteio é aberto', () => {
        assert.equal(elegiveisPorCriterios(dbBase()).length, 5);
    });
    it('universal: algum Tema dele, em qualquer papel', () => {
        const db = dbBase();
        assert.deepEqual(ids(elegiveisPorCriterios(db, { universalId: 10 })), [
            'poema:1',
            'poema:2',
            'prosa:20',
        ]);
        assert.deepEqual(ids(elegiveisPorCriterios(db, { universalId: '11' })), [
            'poema:3',
            'prosa:20',
        ]);
    });
    it('favoritos sem universal: só os bem avaliados entre os elegíveis (a marca continua valendo)', () => {
        assert.deepEqual(ids(elegiveisPorCriterios(dbBase(), { favoritosAutor: true })), [
            'poema:1',
            'poema:3',
            'prosa:20',
        ]);
    });
    it('universal e favoritos juntos formam a interseção', () => {
        assert.deepEqual(
            ids(elegiveisPorCriterios(dbBase(), { universalId: 10, favoritosAutor: true })),
            ['poema:1', 'prosa:20'],
        );
    });
    it('minCoracoes muda o piso', () => {
        assert.deepEqual(
            ids(elegiveisPorCriterios(dbBase(), { favoritosAutor: true, minCoracoes: 5 })),
            ['poema:3'],
        );
    });
    it('universal inexistente ou sem Temas dá lista vazia, nunca o sorteio aberto', () => {
        assert.deepEqual(elegiveisPorCriterios(dbBase(), { universalId: 999 }), []);
        assert.deepEqual(elegiveisPorCriterios(dbBase(), { universalId: 12 }), []);
    });
    it('`favoritosPublico` é ignorado por enquanto', () => {
        assert.equal(elegiveisPorCriterios(dbBase(), { favoritosPublico: true }).length, 5);
    });
});

describe('contarPorUniversal', () => {
    it('conta por universal, na ordem do cadastro, com ou sem favoritos', () => {
        const db = dbBase();
        assert.deepEqual(
            contarPorUniversal(db).map((u) => [u.nome, u.total]),
            [
                ['Perda', 3],
                ['Dia a dia', 2],
                ['Vazio', 0],
            ],
        );
        assert.deepEqual(
            contarPorUniversal(db, { favoritosAutor: true }).map((u) => u.total),
            [2, 2, 0],
        );
    });
});

describe('avisosDoTexto', () => {
    it('devolve só o conteúdo sensível preenchido', () => {
        assert.deepEqual(avisosDoTexto({}), []);
        assert.deepEqual(avisosDoTexto({ conteudoSensivel: '  ' }), []);
        assert.deepEqual(avisosDoTexto({ conteudoSensivel: ' ideação suicida ' }), [
            { rotulo: 'Conteúdo sensível', texto: 'ideação suicida' },
        ]);
    });
    it('o vocabulário hiperacionante nunca entra: cita o trecho e entregaria o texto', () => {
        assert.deepEqual(avisosDoTexto({ vocabularioHiperacionante: 'x, no 2º verso' }), []);
        assert.deepEqual(
            avisosDoTexto({ conteudoSensivel: 'luto', vocabularioHiperacionante: 'x' }),
            [{ rotulo: 'Conteúdo sensível', texto: 'luto' }],
        );
    });
});

describe('recentesAEvitar', () => {
    it('metade do conjunto, arredondada para baixo, com teto de 10', () => {
        assert.equal(recentesAEvitar(0), 0);
        assert.equal(recentesAEvitar(1), 0);
        assert.equal(recentesAEvitar(2), 1);
        assert.equal(recentesAEvitar(5), 2);
        assert.equal(recentesAEvitar(6), 3);
        assert.equal(recentesAEvitar(20), 10);
        assert.equal(recentesAEvitar(500), RECENTES_MAXIMO);
        assert.equal(recentesAEvitar('abc'), 0);
    });
});

describe('registrarRecente', () => {
    it('acrescenta no fim, não repete e corta no máximo', () => {
        assert.deepEqual(registrarRecente([], 'a'), ['a']);
        assert.deepEqual(registrarRecente(['a', 'b'], 'a'), ['b', 'a']);
        assert.deepEqual(registrarRecente(['a', 'b', 'c'], 'd', 3), ['b', 'c', 'd']);
        assert.deepEqual(registrarRecente(null, 'a'), ['a']);
    });
});

describe('sortearTexto', () => {
    it('escolhe pelo número aleatório e devolve total e chave', () => {
        const db = dbBase();
        const a = sortearTexto(db, {}, { aleatorio: fixo(0) });
        assert.equal(a.ok, true);
        assert.equal(a.chave, 'poema:1');
        assert.equal(a.total, 5);
        assert.equal(a.evitados, 0);
        const z = sortearTexto(db, {}, { aleatorio: fixo(0.999999) });
        assert.equal(z.chave, 'prosa:21');
        assert.equal(sortearTexto(db, {}, { aleatorio: fixo(1) }).chave, 'prosa:21');
    });
    it('evita só os últimos da janela proporcional (metade do conjunto)', () => {
        const db = dbBase();
        // 5 elegíveis: a janela é 2, então só os 2 últimos da lista são evitados.
        const r = sortearTexto(
            db,
            {},
            { recentes: ['poema:1', 'poema:2', 'poema:3'], aleatorio: fixo(0) },
        );
        assert.equal(r.chave, 'poema:1');
        assert.equal(r.evitados, 2);
        const r2 = sortearTexto(db, {}, { recentes: ['poema:1', 'poema:2'], aleatorio: fixo(0) });
        assert.equal(r2.chave, 'poema:3');
    });
    it('conjunto de 2 textos: evita só o último e nunca esvazia o sorteio', () => {
        const db = dbBase();
        const criterios = { universalId: 11, favoritosAutor: true };
        const r = sortearTexto(db, criterios, {
            recentes: ['poema:3', 'prosa:20'],
            aleatorio: fixo(0),
        });
        assert.equal(r.ok, true);
        assert.equal(r.total, 2);
        assert.equal(r.evitados, 1);
        assert.equal(r.chave, 'poema:3');
    });
    it('um único elegível: não evita ninguém e devolve esse texto', () => {
        const db = { poemas: [t(1)], prosas: [], temas: [], temasUniversais: [] };
        const r = sortearTexto(db, {}, { recentes: ['poema:1'], aleatorio: fixo(0) });
        assert.equal(r.ok, true);
        assert.equal(r.chave, 'poema:1');
        assert.equal(r.evitados, 0);
    });
    it('nada elegível: motivo "vazio"', () => {
        assert.deepEqual(sortearTexto({ poemas: [], prosas: [] }), { ok: false, motivo: 'vazio' });
        assert.deepEqual(sortearTexto(dbBase(), { universalId: 12 }), {
            ok: false,
            motivo: 'vazio',
        });
    });
    it('universal sem favoritos mas com textos: "sem-favoritos" com a contagem para a alternativa', () => {
        const db = dbBase();
        db.poemas.find((p) => p.id === 3).autoclassificacao = 0;
        db.prosas.find((p) => p.id === 20).autoclassificacao = 2;
        const r = sortearTexto(db, { universalId: 11, favoritosAutor: true });
        assert.deepEqual(r, { ok: false, motivo: 'sem-favoritos', semFavoritos: 2 });
    });
    it('sorteia de verdade (Math.random) dentro dos elegíveis', () => {
        const db = dbBase();
        const permitidas = new Set(ids(elegiveisPorCriterios(db, { universalId: 10 })));
        for (let i = 0; i < 50; i++) {
            const r = sortearTexto(db, { universalId: 10 });
            assert.ok(permitidas.has(chaveDoTexto(r.tipo, r.item)));
        }
    });
});

// Extensão (régua fixa): poema em versos, prosa em palavras.
const versos = (n) => Array.from({ length: n }, () => 'verso').join('\n');
const palavras = (n) => Array.from({ length: n }, () => 'palavra').join(' ');

describe('extensão: medir o texto', () => {
    it('contarVersos conta só linhas com conteúdo (estrofes e marcas vazias não contam)', () => {
        assert.equal(contarVersos('a\nb\nc'), 3);
        assert.equal(contarVersos('a\nb\n\nc\nd'), 4);
        assert.equal(contarVersos('a\n   \n<div></div>\n&nbsp;\n<br>\nb'), 2);
        assert.equal(contarVersos('<div>a</div>\n<span style="color:red">b</span>'), 2);
        assert.equal(contarVersos(''), 0);
        assert.equal(contarVersos(null), 0);
    });
    it('contarPalavras usa a regra do tokenizar e ignora marcas de formatação', () => {
        assert.equal(contarPalavras('uma casa, <b>vazia</b> e quieta'), 5);
        assert.equal(contarPalavras('coração&nbsp;partido'), 2);
        assert.equal(contarPalavras(''), 0);
        assert.equal(contarPalavras(undefined), 0);
    });
    it('medidaDoTexto usa versos para poema e palavras para prosa', () => {
        const texto = 'um dois\ntrês quatro cinco';
        assert.deepEqual(medidaDoTexto('poema', { texto }), { valor: 2, unidade: 'versos' });
        assert.deepEqual(medidaDoTexto('prosa', { texto }), { valor: 5, unidade: 'palavras' });
    });
});

describe('extensão: a régua', () => {
    it('as cinco faixas, da menor para a maior, com nome e âncora', () => {
        assert.deepEqual(
            FAIXAS_EXTENSAO.map((f) => f.rotulo),
            ['Breve', 'Curto', 'Médio', 'Longo', 'Extenso'],
        );
        assert.deepEqual(
            FAIXAS_EXTENSAO.map((f) => f.id),
            ['breve', 'curto', 'medio', 'longo', 'extenso'],
        );
        FAIXAS_EXTENSAO.forEach((f) => assert.ok(f.ancora));
        assert.match(NOTA_CONVENCAO_EXTENSAO, /convenção editorial/);
    });
    it('poema: quadra e soneto como âncoras, 40 e 100 versos como corte editorial', () => {
        const casos = [
            [0, 'breve'],
            [4, 'breve'],
            [5, 'curto'],
            [14, 'curto'],
            [15, 'medio'],
            [40, 'medio'],
            [41, 'longo'],
            [100, 'longo'],
            [101, 'extenso'],
            [900, 'extenso'],
        ];
        casos.forEach(([n, faixa]) => assert.equal(faixaDaMedida('poema', n), faixa, `${n}`));
    });
    it('prosa: microficção, flash fiction, conto e novelette', () => {
        const casos = [
            [0, 'breve'],
            [300, 'breve'],
            [301, 'curto'],
            [1000, 'curto'],
            [1001, 'medio'],
            [7500, 'medio'],
            [7501, 'longo'],
            [17500, 'longo'],
            [17501, 'extenso'],
        ];
        casos.forEach(([n, faixa]) => assert.equal(faixaDaMedida('prosa', n), faixa, `${n}`));
    });
    it('o mesmo corpo cai em faixas diferentes: cada tipo usa a sua régua', () => {
        const texto = versos(5);
        assert.equal(faixaDoTexto('poema', { texto }), 'curto');
        assert.equal(faixaDoTexto('prosa', { texto }), 'breve');
    });
    it('faixaDoTexto acompanha o corpo quando ele muda no mesmo objeto', () => {
        const item = { texto: versos(3) };
        assert.equal(faixaDoTexto('poema', item), 'breve');
        item.texto = versos(20);
        assert.equal(faixaDoTexto('poema', item), 'medio');
    });
    it('limites e legenda dizem os números e as âncoras', () => {
        assert.deepEqual(limitesDaFaixa('breve'), {
            poema: 'até 4 versos',
            prosa: 'até 300 palavras',
        });
        assert.deepEqual(limitesDaFaixa('curto'), {
            poema: '5 a 14 versos',
            prosa: '301 a 1.000 palavras',
        });
        assert.deepEqual(limitesDaFaixa('medio'), {
            poema: '15 a 40 versos',
            prosa: '1.001 a 7.500 palavras',
        });
        assert.deepEqual(limitesDaFaixa('extenso'), {
            poema: 'mais de 100 versos',
            prosa: 'mais de 17.500 palavras',
        });
        assert.equal(
            legendaDaFaixa('curto'),
            'Curto: 5 a 14 versos (poema) ou 301 a 1.000 palavras (prosa). Âncoras: soneto; flash fiction.',
        );
        assert.equal(limitesDaFaixa('enorme'), null);
        assert.equal(legendaDaFaixa('enorme'), '');
    });
});

describe('extensão: critério do sorteio', () => {
    const dbExt = () => ({
        temas: [
            { id: 1, nome: 'Saudade' },
            { id: 2, nome: 'Cotidiano' },
        ],
        temasUniversais: [
            { id: 10, nome: 'Perda', temaIds: [1] },
            { id: 11, nome: 'Dia a dia', temaIds: [2] },
        ],
        poemas: [
            t(1, { texto: versos(3), temas: tm(1), autoclassificacao: 5 }),
            t(2, { texto: versos(8), temas: tm(1), autoclassificacao: 2 }),
            t(3, { texto: versos(20), temas: tm(2), autoclassificacao: 1 }),
        ],
        prosas: [t(20, { texto: palavras(120), temas: tm(2), autoclassificacao: 0 })],
    });

    it('filtra pela faixa, com a régua do tipo de cada texto', () => {
        const db = dbExt();
        assert.deepEqual(ids(elegiveisPorCriterios(db, { extensao: 'breve' })), [
            'poema:1',
            'prosa:20',
        ]);
        assert.deepEqual(ids(elegiveisPorCriterios(db, { extensao: 'curto' })), ['poema:2']);
        assert.deepEqual(ids(elegiveisPorCriterios(db, { extensao: 'medio' })), ['poema:3']);
        assert.deepEqual(elegiveisPorCriterios(db, { extensao: 'extenso' }), []);
    });
    it('sem extensão (vazia ou nula) o sorteio segue aberto; faixa que não existe não sorteia', () => {
        const db = dbExt();
        assert.equal(elegiveisPorCriterios(db, { extensao: null }).length, 4);
        assert.equal(elegiveisPorCriterios(db, { extensao: '' }).length, 4);
        assert.deepEqual(elegiveisPorCriterios(db, { extensao: 'enorme' }), []);
    });
    it('combina por E com o Tema universal e com os favoritos', () => {
        const db = dbExt();
        assert.deepEqual(ids(elegiveisPorCriterios(db, { universalId: 11, extensao: 'breve' })), [
            'prosa:20',
        ]);
        assert.deepEqual(elegiveisPorCriterios(db, { universalId: 10, extensao: 'medio' }), []);
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { favoritosAutor: true, extensao: 'breve' })),
            ['poema:1'],
        );
    });
    it('contarPorUniversal respeita a extensão', () => {
        const db = dbExt();
        assert.deepEqual(
            contarPorUniversal(db, { extensao: 'breve' }).map((u) => u.total),
            [1, 1],
        );
        assert.deepEqual(
            contarPorUniversal(db, { extensao: 'medio' }).map((u) => u.total),
            [0, 1],
        );
    });
    it('contarPorExtensao conta cada faixa com os outros critérios e ignora a extensão', () => {
        const db = dbExt();
        assert.deepEqual(
            contarPorExtensao(db, {}).map((f) => [f.id, f.total]),
            [
                ['breve', 2],
                ['curto', 1],
                ['medio', 1],
                ['longo', 0],
                ['extenso', 0],
            ],
        );
        assert.deepEqual(
            contarPorExtensao(db, { universalId: 10 }).map((f) => f.total),
            [1, 1, 0, 0, 0],
        );
        assert.deepEqual(
            contarPorExtensao(db, { favoritosAutor: true, extensao: 'longo' }).map((f) => f.total),
            [1, 0, 0, 0, 0],
        );
    });
    it('sortearTexto só sorteia dentro da faixa', () => {
        const db = dbExt();
        const primeiro = sortearTexto(db, { extensao: 'breve' }, { aleatorio: fixo(0) });
        const ultimo = sortearTexto(db, { extensao: 'breve' }, { aleatorio: fixo(0.999999) });
        assert.equal(primeiro.chave, 'poema:1');
        assert.equal(ultimo.chave, 'prosa:20');
        assert.equal(primeiro.total, 2);
        for (let i = 0; i < 30; i++) {
            const r = sortearTexto(db, { extensao: 'curto' });
            assert.equal(r.chave, 'poema:2');
        }
    });
    it('combinação sem texto devolve "vazio"; sem favoritos mantém a extensão na alternativa', () => {
        const db = dbExt();
        assert.deepEqual(sortearTexto(db, { universalId: 10, extensao: 'medio' }), {
            ok: false,
            motivo: 'vazio',
        });
        // Nenhum favorito na faixa Curto, mas há um texto Curto sem o filtro.
        assert.deepEqual(sortearTexto(db, { favoritosAutor: true, extensao: 'curto' }), {
            ok: false,
            motivo: 'sem-favoritos',
            semFavoritos: 1,
        });
    });
});

describe('extensão: rótulo junto ao tipo', () => {
    it('poema mostra a contagem de versos, sem minutos', () => {
        assert.equal(rotuloDeExtensao('poema', { texto: versos(14) }), '14 versos');
        assert.equal(rotuloDeExtensao('poema', { texto: versos(1) }), '1 verso');
        assert.equal(rotuloDeExtensao('poema', { texto: 'a\n\nb\n\nc' }), '3 versos');
    });
    it('prosa mostra o tempo estimado, arredondado para cima e com piso de 1 min', () => {
        assert.equal(PALAVRAS_POR_MINUTO, 200);
        assert.equal(rotuloDeExtensao('prosa', { texto: palavras(10) }), 'cerca de 1 min');
        assert.equal(rotuloDeExtensao('prosa', { texto: palavras(200) }), 'cerca de 1 min');
        assert.equal(rotuloDeExtensao('prosa', { texto: palavras(201) }), 'cerca de 2 min');
        assert.equal(rotuloDeExtensao('prosa', { texto: palavras(600) }), 'cerca de 3 min');
    });
});

describe('em construção: aviso junto ao tipo', () => {
    it('só o status Incompleto conta como em construção', () => {
        assert.equal(ROTULO_EM_CONSTRUCAO, 'em construção');
        assert.equal(textoEmConstrucao({ status: 'incompleto' }), true);
        ['publicado', 'completo', 'migrado', 'privado', 'descartado', '', undefined].forEach(
            (status) => assert.equal(textoEmConstrucao({ status }), false, String(status)),
        );
        assert.equal(textoEmConstrucao({}), false);
        assert.equal(textoEmConstrucao(null), false);
    });

    it('a linha do tipo ganha o aviso depois da extensão, e só para o Incompleto', () => {
        const poema = { texto: versos(3), status: 'incompleto' };
        const prosa = { texto: palavras(10), status: 'incompleto' };
        assert.equal(linhaDoTipo('poema', poema), 'Poema · 3 versos · em construção');
        assert.equal(linhaDoTipo('prosa', prosa), 'Prosa · cerca de 1 min · em construção');
        assert.equal(linhaDoTipo('poema', { ...poema, status: 'publicado' }), 'Poema · 3 versos');
        assert.equal(linhaDoTipo('prosa', { texto: palavras(10) }), 'Prosa · cerca de 1 min');
    });

    it('o Incompleto continua elegível: quem decide é a marca "Pode ser sorteado"', () => {
        assert.equal(textoElegivel({ ...t(1), status: 'incompleto' }), true);
        assert.equal(textoElegivel({ ...t(1), status: 'incompleto', sorteavel: false }), false);
    });
});

describe('Leitura autônoma: o sorteio ignora o que não se lê sozinho', () => {
    it('"Lê-se sozinho" (vazio, ausente ou valor desconhecido) e "Só como início" entram', () => {
        assert.equal(textoElegivel(t(1, { leituraAutonoma: '' })), true);
        assert.equal(textoElegivel(t(1)), true);
        assert.equal(textoElegivel(t(1, { leituraAutonoma: 'lixo' })), true);
        assert.equal(textoElegivel(t(1, { leituraAutonoma: 'inicio' })), true);
        for (const v of ['sequencia', 'conjunto']) {
            assert.equal(textoElegivel(t(1, { leituraAutonoma: v })), false, v);
        }
    });
    it('"Só como início" ganha a marca "só o começo" junto ao tipo; os outros não', () => {
        assert.equal(ROTULO_SO_COMECO, 'só o começo');
        const poema = t(1, { texto: 'a\nb\nc' });
        assert.equal(
            linhaDoTipo('poema', { ...poema, leituraAutonoma: 'inicio' }),
            'Poema · 3 versos · só o começo',
        );
        assert.equal(linhaDoTipo('poema', poema), 'Poema · 3 versos');
        assert.equal(
            linhaDoTipo('poema', { ...poema, leituraAutonoma: 'conjunto' }),
            'Poema · 3 versos',
        );
        assert.equal(
            linhaDoTipo('poema', { ...poema, status: 'incompleto', leituraAutonoma: 'inicio' }),
            'Poema · 3 versos · em construção · só o começo',
        );
    });
    it('com ignorarLeitura, o texto condicionado volta a contar (só a leitura é ignorada)', () => {
        const opcoes = { ignorarLeitura: true };
        assert.equal(textoElegivel(t(1, { leituraAutonoma: 'conjunto' }), opcoes), true);
        assert.equal(
            textoElegivel(t(1, { leituraAutonoma: 'conjunto', sorteavel: false }), opcoes),
            false,
        );
        assert.equal(
            textoElegivel(t(1, { leituraAutonoma: 'conjunto', status: 'privado' }), opcoes),
            false,
        );
        assert.equal(
            textoElegivel(t(1, { leituraAutonoma: 'conjunto', texto: ' ' }), opcoes),
            false,
        );
    });
    it('textosElegiveis, elegiveisPorCriterios e o sorteio deixam o condicionado de fora', () => {
        const db = dbBase();
        db.poemas[0].leituraAutonoma = 'sequencia'; // poema 1
        db.prosas[0].leituraAutonoma = 'conjunto'; // prosa 20
        assert.deepEqual(ids(textosElegiveis(db)), ['poema:2', 'poema:3', 'prosa:21']);
        assert.deepEqual(ids(elegiveisPorCriterios(db, { universalId: 10 })), ['poema:2']);
        for (const n of [0, 0.34, 0.99]) {
            const r = sortearTexto(db, {}, { aleatorio: fixo(n) });
            assert.ok(['poema:2', 'poema:3', 'prosa:21'].includes(r.chave), r.chave);
        }
    });
    it('contarForaPorLeitura conta só os barrados pela leitura e respeita os critérios', () => {
        const db = dbBase();
        db.poemas[0].leituraAutonoma = 'sequencia'; // poema 1, Tema 1 (Perda)
        db.poemas[2].leituraAutonoma = 'conjunto'; // poema 3, Tema 3 (Dia a dia)
        db.poemas[3].leituraAutonoma = 'conjunto'; // poema 4, sem a marca: não conta
        db.poemas[4].leituraAutonoma = 'conjunto'; // poema 5, descartado: não conta
        assert.equal(contarForaPorLeitura(db), 2);
        assert.equal(contarForaPorLeitura(db, { universalId: 10 }), 1);
        assert.equal(contarForaPorLeitura(db, { universalId: 11 }), 1);
        assert.equal(contarForaPorLeitura(db, { universalId: 12 }), 0);
        assert.equal(contarForaPorLeitura(dbBase()), 0);
    });
    it('sorteio vazio só por causa da leitura: motivo "vazio" com a contagem dos de fora', () => {
        const db = {
            temas: [],
            temasUniversais: [],
            poemas: [t(1, { leituraAutonoma: 'conjunto' }), t(2, { leituraAutonoma: 'sequencia' })],
            prosas: [],
        };
        assert.deepEqual(sortearTexto(db), { ok: false, motivo: 'vazio', foraPorLeitura: 2 });
        // Sem nenhum texto barrado pela leitura, o resultado segue como era.
        assert.deepEqual(sortearTexto({ poemas: [], prosas: [] }), { ok: false, motivo: 'vazio' });
    });
    it('avisoForaPorLeitura: vazio para 0, singular e plural', () => {
        assert.equal(avisoForaPorLeitura(0), '');
        assert.equal(avisoForaPorLeitura(undefined), '');
        assert.match(
            avisoForaPorLeitura(1),
            /^1 texto marcado como "Pode ser sorteado" fica de fora/,
        );
        assert.match(
            avisoForaPorLeitura(3),
            /^3 textos marcados como "Pode ser sorteado" ficam de fora/,
        );
        assert.doesNotMatch(avisoForaPorLeitura(2), /—/);
    });
});

describe('Conteúdo sensível como critério', () => {
    const dbSensivel = () => ({
        temas: [{ id: 1, nome: 'Luto' }],
        temasUniversais: [{ id: 10, nome: 'Perda', temaIds: [1] }],
        poemas: [
            t(1, { temas: tm(1), conteudoSensivel: 'luto', autoclassificacao: 5 }),
            t(2, { temas: tm(1), conteudoSensivel: '   ' }),
            t(3),
        ],
        prosas: [t(20, { conteudoSensivel: 'violência' })],
    });
    const ids = (lista) => lista.map(({ item }) => item.id);

    it('ehSensivel segue a mesma regra do aviso: texto livre preenchido, espaços não contam', () => {
        assert.equal(ehSensivel({}), false);
        assert.equal(ehSensivel({ conteudoSensivel: '  ' }), false);
        assert.equal(ehSensivel({ conteudoSensivel: 'luto' }), true);
        assert.equal(ehSensivel(null), false);
    });
    it('sem o critério, ou com incluirSensiveis true, o sorteio segue como era', () => {
        const db = dbSensivel();
        assert.deepEqual(ids(elegiveisPorCriterios(db)), [1, 2, 3, 20]);
        assert.deepEqual(ids(elegiveisPorCriterios(db, { incluirSensiveis: true })), [1, 2, 3, 20]);
    });
    it('incluirSensiveis false tira poemas e prosas com conteúdo sensível', () => {
        const db = dbSensivel();
        assert.deepEqual(ids(elegiveisPorCriterios(db, { incluirSensiveis: false })), [2, 3]);
    });
    it('combina por E com Tema universal e favoritos', () => {
        const db = dbSensivel();
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { incluirSensiveis: false, universalId: 10 })),
            [2],
        );
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { incluirSensiveis: false, favoritosAutor: true })),
            [],
        );
    });
    it('as contagens por Tema e por extensão respeitam a escolha', () => {
        const db = dbSensivel();
        assert.equal(contarPorUniversal(db, {})[0].total, 2);
        assert.equal(contarPorUniversal(db, { incluirSensiveis: false })[0].total, 1);
        const soma = (l) => l.reduce((n, f) => n + f.total, 0);
        assert.equal(soma(contarPorExtensao(db, {})), 4);
        assert.equal(soma(contarPorExtensao(db, { incluirSensiveis: false })), 2);
    });
    it('nunca sorteia texto sensível com a escolha de excluir, mesmo sorteando muitas vezes', () => {
        const db = dbSensivel();
        for (let i = 0; i < 20; i++) {
            const r = sortearTexto(db, { incluirSensiveis: false }, { aleatorio: () => i / 20 });
            assert.equal(r.ok, true);
            assert.ok([2, 3].includes(r.item.id));
        }
    });
    it('contarForaPorSensivel: zero quando a escolha é receber; senão, os que ficam de fora', () => {
        const db = dbSensivel();
        assert.equal(contarForaPorSensivel(db, {}), 0);
        assert.equal(contarForaPorSensivel(db, { incluirSensiveis: true }), 0);
        assert.equal(contarForaPorSensivel(db, { incluirSensiveis: false }), 2);
        assert.equal(contarForaPorSensivel(db, { incluirSensiveis: false, universalId: 10 }), 1);
    });
    it('sorteio vazio só por causa da escolha: motivo "vazio" com foraPorSensivel', () => {
        const db = {
            temas: [],
            temasUniversais: [],
            poemas: [t(1, { conteudoSensivel: 'x' })],
            prosas: [],
        };
        assert.deepEqual(sortearTexto(db, { incluirSensiveis: false }), {
            ok: false,
            motivo: 'vazio',
            foraPorSensivel: 1,
        });
        assert.equal(sortearTexto(db).ok, true);
    });
    it('texto fora por leitura e por sensível aparece nas duas contagens', () => {
        const db = {
            temas: [],
            temasUniversais: [],
            poemas: [t(1, { conteudoSensivel: 'x' }), t(2, { leituraAutonoma: 'conjunto' })],
            prosas: [],
        };
        assert.deepEqual(sortearTexto(db, { incluirSensiveis: false }), {
            ok: false,
            motivo: 'vazio',
            foraPorLeitura: 1,
            foraPorSensivel: 1,
        });
    });
    it('avisoForaPorSensivel: vazio para 0, singular e plural, sem travessão', () => {
        assert.equal(avisoForaPorSensivel(0), '');
        assert.equal(avisoForaPorSensivel(undefined), '');
        assert.match(avisoForaPorSensivel(1), /^1 texto com conteúdo sensível ficou de fora/);
        assert.match(avisoForaPorSensivel(3), /^3 textos com conteúdo sensível ficaram de fora/);
        assert.doesNotMatch(avisoForaPorSensivel(2), /—/);
    });
});

describe('Peso do texto (valência) como critério', () => {
    const temasV = [
        { id: 1, nome: 'Alegria', valencia: 'agradavel' },
        { id: 2, nome: 'Cotidiano', valencia: 'neutro' },
        { id: 3, nome: 'Luto', valencia: 'desagradavel' },
        { id: 4, nome: 'Solto' },
    ];
    const dbV = () => ({
        temas: temasV,
        temasUniversais: [{ id: 10, nome: 'Tudo', temaIds: [1, 2, 3, 4] }],
        poemas: [
            t(1, { temas: tm(1) }),
            t(2, { temas: tm(3) }),
            t(3, { temas: tm(2) }),
            t(4, { temas: tm(4) }),
            t(5, { temas: tm(3), valenciaAjuste: 'leve' }),
        ],
        prosas: [t(20, { temas: tm(3), conteudoSensivel: 'luto' })],
    });
    const ids = (lista) => lista.map(({ item }) => item.id);

    it('sem faixa (ausente, vazia ou inválida) não filtra, e o texto sem valência sai', () => {
        const db = dbV();
        assert.deepEqual(ids(elegiveisPorCriterios(db)), [1, 2, 3, 4, 5, 20]);
        assert.deepEqual(ids(elegiveisPorCriterios(db, { valencias: [] })), [1, 2, 3, 4, 5, 20]);
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { valencias: ['xyz'] })),
            [1, 2, 3, 4, 5, 20],
        );
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { valencias: 'leve' })),
            [1, 2, 3, 4, 5, 20],
        );
    });
    it('uma faixa: só os daquela valência, com o ajuste do autor valendo', () => {
        const db = dbV();
        assert.deepEqual(ids(elegiveisPorCriterios(db, { valencias: ['leve'] })), [1, 5]);
        assert.deepEqual(ids(elegiveisPorCriterios(db, { valencias: ['pesado'] })), [2, 20]);
        assert.deepEqual(ids(elegiveisPorCriterios(db, { valencias: ['neutro'] })), [3]);
    });
    it('várias faixas combinam por OU entre si; texto sem valência fica de fora se "sem" não vem', () => {
        const db = dbV();
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { valencias: ['leve', 'neutro'] })),
            [1, 3, 5],
        );
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { valencias: new Set(['leve', 'neutro', 'pesado']) })),
            [1, 2, 3, 5, 20],
        );
    });
    it('combina por E com os outros critérios', () => {
        const db = dbV();
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { valencias: ['pesado'], incluirSensiveis: false })),
            [2],
        );
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { valencias: ['leve'], universalId: 10 })),
            [1, 5],
        );
    });
    it('nunca sorteia fora da faixa escolhida', () => {
        const db = dbV();
        for (let i = 0; i < 20; i++) {
            const r = sortearTexto(db, { valencias: ['leve'] }, { aleatorio: () => i / 20 });
            assert.ok([1, 5].includes(r.item.id));
        }
    });
    it('contarPorValencia: cada faixa conta como se fosse a escolhida, ignorando `valencias`', () => {
        const db = dbV();
        const total = (c) => contarPorValencia(db, c).map((f) => f.total);
        assert.deepEqual(total({}), [2, 1, 2, 1]);
        assert.deepEqual(total({ valencias: ['leve'] }), [2, 1, 2, 1]);
        assert.deepEqual(total({ incluirSensiveis: false }), [2, 1, 1, 1]);
        assert.deepEqual(
            contarPorValencia(db, {}).map((f) => f.rotulo),
            ['Leve', 'Neutro ou ambivalente', 'Pesado', 'Sem valência'],
        );
        assert.deepEqual(
            contarPorValencia(db, {}).map((f) => f.id),
            ['leve', 'neutro', 'pesado', 'sem'],
        );
    });
    it('contarPorUniversal e contarPorExtensao respeitam as faixas escolhidas', () => {
        const db = dbV();
        assert.equal(contarPorUniversal(db, {})[0].total, 6);
        assert.equal(contarPorUniversal(db, { valencias: ['leve'] })[0].total, 2);
        const soma = (l) => l.reduce((n, f) => n + f.total, 0);
        assert.equal(soma(contarPorExtensao(db, { valencias: ['pesado'] })), 2);
    });
    it('"sem" é um peso: só os textos sem valência, sozinho ou junto de outras faixas', () => {
        const db = dbV();
        assert.deepEqual(ids(elegiveisPorCriterios(db, { valencias: ['sem'] })), [4]);
        assert.deepEqual(ids(elegiveisPorCriterios(db, { valencias: ['sem', 'leve'] })), [1, 4, 5]);
        assert.deepEqual(
            ids(
                elegiveisPorCriterios(db, {
                    valencias: new Set(['leve', 'neutro', 'pesado', 'sem']),
                }),
            ),
            [1, 2, 3, 4, 5, 20],
        );
    });
    it('"sem" combina por E com os outros critérios', () => {
        const db = dbV();
        db.poemas.push(t(6, { temas: [], conteudoSensivel: 'x' }));
        assert.deepEqual(ids(elegiveisPorCriterios(db, { valencias: ['sem'] })), [4, 6]);
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { valencias: ['sem'], incluirSensiveis: false })),
            [4],
        );
    });
    it('pesoDoTexto: a faixa, ou "sem" quando não há valência; PESOS_SORTEIO tem as quatro', () => {
        const db = dbV();
        assert.equal(pesoDoTexto(db.poemas[0], db.temas), 'leve');
        assert.equal(pesoDoTexto(db.poemas[4], db.temas), 'leve');
        assert.equal(pesoDoTexto(db.poemas[3], db.temas), 'sem');
        assert.deepEqual([...PESOS_SORTEIO], ['leve', 'neutro', 'pesado', 'sem']);
    });
});

describe('Elo de tradução: as versões contam como um texto só', () => {
    const elo = (id, direcao, relacao = 'Tradução') => ({
        conceitos: { elos: [{ id, relacao, direcao }] },
    });
    const idsDe = (lista) => lista.map(({ item }) => item.id);
    const dbTrad = () => ({
        temas: [],
        poemas: [t(1, elo(2, 'origem')), t(2), t(3), t(4, elo(3, 'destino', 'Reescrita'))],
        prosas: [t(20), t(21)],
    });

    it('o texto e a tradução viram uma entrada só (mesmo com o Elo em um lado só)', () => {
        assert.deepEqual(idsDe(elegiveisPorCriterios(dbTrad())), [1, 3, 4, 20, 21]);
    });
    it('a entrada guarda as outras versões; texto sem tradução não ganha a chave', () => {
        const lista = elegiveisPorCriterios(dbTrad());
        assert.deepEqual(
            lista[0].versoes.map((v) => v.item.id),
            [2],
        );
        assert.equal('versoes' in lista[1], false);
    });
    it('só a Relação Tradução agrupa: Reescrita continua sendo outro texto', () => {
        assert.ok(idsDe(elegiveisPorCriterios(dbTrad())).includes(4));
    });
    it('tradução entre poema e prosa e grupo de três contam um texto só', () => {
        const db = dbTrad();
        db.poemas[2].conceitos = { elos: [{ id: 20, relacao: 'Tradução', direcao: 'destino' }] };
        db.prosas[0].conceitos = { elos: [{ id: 21, relacao: 'Tradução', direcao: 'origem' }] };
        assert.deepEqual(idsDe(elegiveisPorCriterios(db)), [1, 3, 4]);
        const grupo = elegiveisPorCriterios(db).find(({ item }) => item.id === 3);
        assert.deepEqual(grupo.versoes.map((v) => v.item.id).sort(), [20, 21]);
    });
    it('a obra não aparece duas vezes nas contagens', () => {
        assert.equal(elegiveisPorCriterios(dbTrad()).length, 5);
    });
    it('versão que não passa pelos critérios sai do grupo; a que passa fica sozinha', () => {
        const db = dbTrad();
        db.poemas[1].conteudoSensivel = 'x';
        const lista = elegiveisPorCriterios(db, { incluirSensiveis: false });
        assert.deepEqual(idsDe(lista), [1, 3, 4, 20, 21]);
        assert.deepEqual(lista[0].versoes, []);
    });
    it('Elo para texto apagado é ignorado', () => {
        const db = dbTrad();
        db.poemas[0].conceitos.elos[0].id = 999;
        assert.deepEqual(idsDe(elegiveisPorCriterios(db)), [1, 2, 3, 4, 20, 21]);
    });
    it('sortearTexto: nunca devolve a mesma obra por duas chances, e mostra uma das versões', () => {
        const db = { temas: [], poemas: [t(1, elo(2, 'origem')), t(2)], prosas: [] };
        const r0 = sortearTexto(db, {}, { aleatorio: () => 0 });
        assert.equal(r0.total, 1);
        assert.equal(r0.item.id, 1);
        const r1 = sortearTexto(db, {}, { aleatorio: () => 0.99 });
        assert.equal(r1.total, 1);
        assert.equal(r1.item.id, 2);
    });
    it('sortearTexto: obra com versão recente é evitada, nas duas versões', () => {
        const db = {
            temas: [],
            poemas: [t(1, elo(2, 'origem')), t(2), t(3), t(4)],
            prosas: [],
        };
        // 3 obras elegíveis: evita o último sorteado (1 recente). Saiu a versão 2.
        for (const n of [0, 0.34, 0.99]) {
            const r = sortearTexto(db, {}, { recentes: ['poema:2'], aleatorio: () => n });
            assert.ok(![1, 2].includes(r.item.id));
        }
    });
    it('versoesDeTraducaoDoSorteio: rótulo visto de cada lado, só de quem pode ser lido', () => {
        const db = dbTrad();
        const doTraduzido = versoesDeTraducaoDoSorteio(db, 'poema', db.poemas[1]);
        assert.deepEqual(
            doTraduzido.map((v) => [v.item.id, v.rotulo]),
            [[1, 'Tradução de']],
        );
        const doOriginal = versoesDeTraducaoDoSorteio(db, 'poema', db.poemas[0]);
        assert.deepEqual(
            doOriginal.map((v) => [v.item.id, v.rotulo]),
            [[2, 'Traduzido para']],
        );
        db.poemas[1].sorteavel = false;
        assert.deepEqual(versoesDeTraducaoDoSorteio(db, 'poema', db.poemas[0]), []);
        db.poemas[1].sorteavel = true;
        db.poemas[1].status = 'privado';
        assert.deepEqual(versoesDeTraducaoDoSorteio(db, 'poema', db.poemas[0]), []);
        db.poemas[1].status = 'publicado';
        db.poemas[1].conteudoSensivel = 'x';
        assert.equal(versoesDeTraducaoDoSorteio(db, 'poema', db.poemas[0]).length, 1);
        assert.equal(
            versoesDeTraducaoDoSorteio(db, 'poema', db.poemas[0], { incluirSensiveis: false })
                .length,
            0,
        );
    });
    it('texto sem tradução não tem versões', () => {
        const db = dbTrad();
        assert.deepEqual(versoesDeTraducaoDoSorteio(db, 'poema', db.poemas[2]), []);
    });
});

describe('Idioma de preferência na obra com tradução', () => {
    const idi = (idioma, papel = 'principal') => [{ idioma, papel, dialetos: [] }];
    const dbIdiomas = () => ({
        temas: [],
        poemas: [
            t(1, {
                idiomas: idi('Inglês'),
                conceitos: { elos: [{ id: 2, relacao: 'Tradução', direcao: 'origem' }] },
            }),
            t(2, { idiomas: idi('pt-BR') }),
            t(3, { idiomas: idi('Francês') }),
        ],
        prosas: [],
    });

    it('com o idioma preferido, aparece a versão nesse idioma, qualquer que seja o acaso', () => {
        for (const n of [0, 0.5, 0.99]) {
            const r = sortearTexto(
                dbIdiomas(),
                {},
                { aleatorio: () => n, idiomaPreferido: 'pt-BR' },
            );
            if (r.item.id === 3) continue;
            assert.equal(r.item.id, 2);
        }
        const r = sortearTexto(dbIdiomas(), {}, { aleatorio: () => 0, idiomaPreferido: 'inglês' });
        assert.equal(r.item.id, 1);
    });
    it('sem preferência, ou sem versão no idioma, volta ao acaso', () => {
        const db = { ...dbIdiomas(), poemas: dbIdiomas().poemas.slice(0, 2) };
        const a = sortearTexto(db, {}, { aleatorio: () => 0 });
        const b = sortearTexto(db, {}, { aleatorio: () => 0.99 });
        assert.deepEqual([a.item.id, b.item.id], [1, 2]);
        const c = sortearTexto(db, {}, { aleatorio: () => 0.99, idiomaPreferido: 'Alemão' });
        assert.equal(c.item.id, 2);
    });
    it('Principal vale mais que Secundário', () => {
        const v = [
            {
                tipo: 'poema',
                item: t(1, { idiomas: [...idi('pt-BR'), ...idi('Inglês', 'secundario')] }),
            },
            { tipo: 'poema', item: t(2, { idiomas: idi('Inglês') }) },
        ];
        assert.deepEqual(
            versoesNoIdiomaPreferido(v, 'Inglês').map((x) => x.item.id),
            [2],
        );
        assert.equal(versoesNoIdiomaPreferido(v, '').length, 2);
    });
    it('a preferência não tira nenhuma obra do sorteio nem muda o total', () => {
        const r = sortearTexto(dbIdiomas(), {}, { aleatorio: () => 0, idiomaPreferido: 'Alemão' });
        assert.equal(r.total, 2);
    });
    it('idiomasDasVersoes: só idiomas de textos com versão sorteável, sem repetir', () => {
        assert.deepEqual(idiomasDasVersoes(dbIdiomas()), ['Inglês', 'pt-BR']);
        const db = dbIdiomas();
        db.poemas[1].sorteavel = false;
        assert.deepEqual(idiomasDasVersoes(db), []);
        assert.deepEqual(idiomasDasVersoes({ temas: [], poemas: [t(1)], prosas: [] }), []);
    });
});

describe('Só os reconhecidos (prêmio ou menção)', () => {
    const rec = (premio = '', posicao = '', extra = {}) => ({
        reconhecimentos: [{ premio, posicao, ano: '', texto: '', ...extra }],
    });
    const dbRec = () => ({
        temas: [],
        poemas: [
            t(1, rec('Concurso X', '1º lugar')),
            t(2, rec('', 'Menção honrosa')),
            t(3),
            t(4, rec('', '', { ano: 2026, texto: 'só nota' })),
            t(5, { reconhecimentos: [] }),
        ],
        prosas: [t(20, rec('Prêmio Y'))],
    });
    const ids = (lista) => lista.map(({ item }) => item.id);

    it('ehReconhecido: prêmio ou posição preenchidos; vazio, só ano ou nota, não', () => {
        const db = dbRec();
        assert.deepEqual([...db.poemas, ...db.prosas].map(ehReconhecido), [
            true,
            true,
            false,
            false,
            false,
            true,
        ]);
        assert.equal(ehReconhecido(null), false);
    });
    it('com o critério, só entram os reconhecidos (poemas e prosas)', () => {
        assert.deepEqual(ids(elegiveisPorCriterios(dbRec(), { reconhecidos: true })), [1, 2, 20]);
    });
    it('desligado ou ausente, não filtra', () => {
        assert.equal(elegiveisPorCriterios(dbRec(), {}).length, 6);
        assert.equal(elegiveisPorCriterios(dbRec(), { reconhecidos: false }).length, 6);
    });
    it('combina por E com os outros critérios', () => {
        const db = dbRec();
        db.poemas[0].conteudoSensivel = 'x';
        assert.deepEqual(
            ids(elegiveisPorCriterios(db, { reconhecidos: true, incluirSensiveis: false })),
            [2, 20],
        );
    });
    it('textos não sorteáveis continuam de fora, mesmo reconhecidos', () => {
        const db = dbRec();
        db.poemas[0].sorteavel = false;
        assert.deepEqual(ids(elegiveisPorCriterios(db, { reconhecidos: true })), [2, 20]);
    });
    it('contarForaPorReconhecimento e o aviso', () => {
        assert.equal(contarForaPorReconhecimento(dbRec(), { reconhecidos: true }), 3);
        assert.equal(contarForaPorReconhecimento(dbRec(), {}), 0);
        assert.equal(avisoForaPorReconhecimento(0), '');
        assert.match(avisoForaPorReconhecimento(1), /^1 texto sem prêmio nem menção/);
        assert.match(avisoForaPorReconhecimento(3), /^3 textos sem prêmio nem menção/);
    });
    it('sorteio vazio só por causa do critério: motivo "vazio" com foraPorReconhecimento', () => {
        const db = { temas: [], poemas: [t(1), t(2)], prosas: [] };
        assert.deepEqual(sortearTexto(db, { reconhecidos: true }), {
            ok: false,
            motivo: 'vazio',
            foraPorReconhecimento: 2,
        });
    });
    it('uma obra com versões conta uma vez só também entre os reconhecidos', () => {
        const db = {
            temas: [],
            poemas: [
                t(1, {
                    ...rec('Prêmio Z'),
                    conceitos: { elos: [{ id: 2, relacao: 'Tradução', direcao: 'origem' }] },
                }),
                t(2, rec('Prêmio Z')),
            ],
            prosas: [],
        };
        assert.equal(elegiveisPorCriterios(db, { reconhecidos: true }).length, 1);
    });
});

describe('historicoDosRecentes', () => {
    const db = {
        poemas: [
            { id: 1, titulo: 'A' },
            { id: 2, titulo: 'B' },
        ],
        prosas: [{ id: 7, titulo: 'C' }],
    };

    it('devolve os textos do mais novo para o mais velho', () => {
        const h = historicoDosRecentes(db, ['poema:1', 'prosa:7', 'poema:2']);
        assert.deepEqual(
            h.map((e) => [e.chave, e.tipo, e.item.titulo]),
            [
                ['poema:2', 'poema', 'B'],
                ['prosa:7', 'prosa', 'C'],
                ['poema:1', 'poema', 'A'],
            ],
        );
    });

    it('ignora texto apagado, chave estranha e entrada que não é lista', () => {
        assert.deepEqual(
            historicoDosRecentes(db, ['poema:99', 'livro:1', 'x', 'poema:1']).map((e) => e.chave),
            ['poema:1'],
        );
        assert.deepEqual(historicoDosRecentes(db, null), []);
        assert.deepEqual(historicoDosRecentes(null, ['poema:1']), []);
    });
});

describe('Poema ou prosa (critério tipo)', () => {
    const ids = (lista) => lista.map(({ item }) => item.id);
    const dbTipo = () => ({
        temas: [],
        poemas: [t(1), t(2), t(3, { conteudoSensivel: 'x' })],
        prosas: [t(20), t(21)],
    });

    it('sem o critério (ausente, nulo ou vazio), entram poemas e prosas', () => {
        assert.deepEqual(ids(elegiveisPorCriterios(dbTipo(), {})), [1, 2, 3, 20, 21]);
        assert.equal(elegiveisPorCriterios(dbTipo(), { tipo: null }).length, 5);
        assert.equal(elegiveisPorCriterios(dbTipo(), { tipo: '' }).length, 5);
    });
    it('"poema" e "prosa" separam os dois tipos', () => {
        assert.deepEqual(ids(elegiveisPorCriterios(dbTipo(), { tipo: 'poema' })), [1, 2, 3]);
        assert.deepEqual(ids(elegiveisPorCriterios(dbTipo(), { tipo: 'prosa' })), [20, 21]);
    });
    it('tipo que não existe devolve lista vazia (nunca cai no sorteio aberto)', () => {
        assert.deepEqual(elegiveisPorCriterios(dbTipo(), { tipo: 'cronica' }), []);
    });
    it('combina por E com os outros critérios', () => {
        assert.deepEqual(
            ids(elegiveisPorCriterios(dbTipo(), { tipo: 'poema', incluirSensiveis: false })),
            [1, 2],
        );
        assert.deepEqual(
            ids(elegiveisPorCriterios(dbTipo(), { tipo: 'prosa', extensao: 'breve' })),
            [20, 21],
        );
    });
    it('o sorteio só devolve texto do tipo pedido', () => {
        for (const aleatorio of [() => 0, () => 0.5, () => 0.99]) {
            assert.equal(sortearTexto(dbTipo(), { tipo: 'prosa' }, { aleatorio }).tipo, 'prosa');
            assert.equal(sortearTexto(dbTipo(), { tipo: 'poema' }, { aleatorio }).tipo, 'poema');
        }
    });
    it('sem texto do tipo, o resultado é vazio', () => {
        const db = { temas: [], poemas: [t(1)], prosas: [] };
        assert.deepEqual(sortearTexto(db, { tipo: 'prosa' }), { ok: false, motivo: 'vazio' });
    });
    it('contarPorTipo conta cada tipo e ignora o `tipo` que vier nos critérios', () => {
        assert.deepEqual(contarPorTipo(dbTipo(), { tipo: 'prosa' }), [
            { id: 'poema', rotulo: 'Só poemas', total: 3 },
            { id: 'prosa', rotulo: 'Só prosas', total: 2 },
        ]);
        assert.deepEqual(
            contarPorTipo(dbTipo(), { incluirSensiveis: false }).map((x) => x.total),
            [2, 2],
        );
        assert.deepEqual(
            TIPOS_SORTEIO.map((x) => x.id),
            ['poema', 'prosa'],
        );
    });
    it('Elo de tradução entre poema e prosa: com o tipo, só a versão do tipo entra', () => {
        const db = {
            temas: [],
            poemas: [
                t(1, { conceitos: { elos: [{ id: 20, relacao: 'Tradução', direcao: 'origem' }] } }),
            ],
            prosas: [t(20)],
        };
        assert.deepEqual(ids(elegiveisPorCriterios(db, {})), [1]);
        const soProsa = elegiveisPorCriterios(db, { tipo: 'prosa' });
        assert.deepEqual(ids(soProsa), [20]);
        assert.equal(sortearTexto(db, { tipo: 'prosa' }).item.id, 20);
    });
});
