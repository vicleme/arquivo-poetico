// Etapa 4b dos Personagens: sugestão de Ecos faltantes (js/sugestao-ecos.js).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    chaveDoPar,
    criarEcoSugerido,
    desfazerEcoSugerido,
    donoPelaData,
    ignorarPar,
    restaurarPar,
    sincronizarParesIgnorados,
    sugerirEcos,
    temEcoEntre,
    textosDoSujeito,
    vinculoForte,
} from '../js/sugestao-ecos.js';

const voz = (id) => ({ personagemId: id, papeis: ['Voz'], centralidade: 'protagonista' });
const mencao = (id) => ({ personagemId: id, papeis: ['Menção'], centralidade: '' });

// Iara está em quatro textos: Maré (poema 2019, Voz), Cais (prosa 2023, Voz),
// Rede (poema 2021, só Menção) e Sem Data (poema, Aparição). Beto só em Maré.
function acervo() {
    return {
        personagens: [
            { id: 10, nome: 'Iara' },
            { id: 11, nome: 'Beto' },
        ],
        pessoas: [{ id: 20, nome: 'Marina' }],
        poemas: [
            {
                id: 1,
                titulo: 'Maré',
                dataEscrita: { ano: 2019 },
                personagens: [voz(10), voz(11)],
                pessoas: [{ pessoaId: 20, papeis: ['Retratado(a)'] }],
            },
            {
                id: 3,
                titulo: 'Rede',
                dataEscrita: { ano: 2021 },
                personagens: [mencao(10)],
                pessoas: [{ pessoaId: 20, papeis: ['Mencionado(a)'] }],
            },
            {
                id: 4,
                titulo: 'Sem Data',
                personagens: [{ personagemId: 10, papeis: ['Aparição'], centralidade: '' }],
                pessoas: [],
            },
        ],
        prosas: [
            {
                id: 1,
                titulo: 'Cais',
                dataEscrita: { ano: 2023, mes: 5 },
                personagens: [voz(10)],
                pessoas: [{ pessoaId: 20, papeis: ['Mencionado(a)'] }],
            },
        ],
    };
}

// Acha o par pelos dois títulos, em qualquer ordem (a/b seguem a ordem do acervo).
const achar = (pares, t1, t2) =>
    pares.find(
        (p) => (p.a.titulo === t1 && p.b.titulo === t2) || (p.a.titulo === t2 && p.b.titulo === t1),
    );
// Lado ('a' ou 'b') do par em que está o título.
const ladoDe = (par, titulo) => (par.a.titulo === titulo ? 'a' : 'b');

describe('vinculoForte', () => {
    it('só menção ou alusão é de superfície; outro papel, ou nenhum, é forte', () => {
        assert.equal(vinculoForte('personagem', ['Menção']), false);
        assert.equal(vinculoForte('personagem', ['Menção', 'Alusão']), false);
        assert.equal(vinculoForte('personagem', ['Menção', 'Voz']), true);
        assert.equal(vinculoForte('personagem', []), true);
        assert.equal(vinculoForte('pessoa', ['Mencionado(a)', 'Aludido(a)']), false);
        assert.equal(vinculoForte('pessoa', ['Associado(a) retroativamente']), true);
        assert.equal(vinculoForte('pessoa', undefined), true);
    });
});

describe('textosDoSujeito', () => {
    it('junta poemas e prosas do vínculo, com os papéis', () => {
        const textos = textosDoSujeito(acervo(), 'personagem', 10);
        assert.deepEqual(
            textos.map((t) => `${t.col}:${t.item.titulo}:${t.forte}`),
            ['poemas:Maré:true', 'poemas:Rede:false', 'poemas:Sem Data:true', 'prosas:Cais:true'],
        );
        assert.equal(textosDoSujeito(acervo(), 'personagem', 11).length, 1);
        assert.equal(textosDoSujeito(acervo(), 'personagem', 999).length, 0);
    });
});

describe('donoPelaData', () => {
    const t = (d) => ({ dataEscrita: d });
    it('o mais novo guarda o Eco, quando as datas decidem', () => {
        assert.equal(donoPelaData(t({ ano: 2019 }), t({ ano: 2023 })), 'b');
        assert.equal(donoPelaData(t({ ano: 2023 }), t({ ano: 2019 })), 'a');
    });
    it('não decide com mesmo ano, data ausente ou sem ano', () => {
        assert.equal(donoPelaData(t({ ano: 2020 }), t({ ano: 2020 })), null);
        assert.equal(donoPelaData(t({ ano: 2020, mes: 1 }), t({ ano: 2020 })), null);
        assert.equal(donoPelaData(t({ ano: 2020 }), {}), null);
        assert.equal(donoPelaData({}, {}), null);
    });
    it('decide com mês e dia quando o ano é o mesmo', () => {
        assert.equal(donoPelaData(t({ ano: 2020, mes: 3 }), t({ ano: 2020, mes: 8 })), 'b');
    });
    it('usa o ano solto de registros antigos quando falta dataEscrita', () => {
        assert.equal(donoPelaData({ ano: 2010 }, t({ ano: 2022 })), 'b');
    });
});

describe('temEcoEntre', () => {
    it('vale nos dois sentidos e para qualquer tipo', () => {
        const a = { id: 1, conceitos: { ecos: [{ id: 2, tipo: 'Aceno a' }] } };
        const b = { id: 2 };
        assert.equal(temEcoEntre(a, b), true);
        assert.equal(temEcoEntre(b, a), true);
        assert.equal(temEcoEntre(b, { id: 9 }), false);
    });
});

describe('sugerirEcos', () => {
    it('lista os pares com força e direção, mais prováveis primeiro', () => {
        const r = sugerirEcos(acervo(), 'personagem', 10);
        assert.equal(r.nome, 'Iara');
        assert.equal(r.totalTextos, 4);
        assert.equal(r.totalPares, 6);
        assert.equal(r.comEco, 0);
        // Rede só menciona: os 3 pares dela têm força 1; os outros 3 têm força 2.
        assert.deepEqual(
            r.pares.map((p) => p.forca),
            [2, 2, 2, 1, 1, 1],
        );
        const mareCais = achar(r.pares, 'Cais', 'Maré');
        assert.equal(mareCais.dono, ladoDe(mareCais, 'Cais'), 'Cais (2023) é o mais novo');
        assert.equal(mareCais[mareCais.dono].col, 'prosas');
        // Dentro da mesma força, a ordem é por título (estável).
        const titulos = r.pares.filter((p) => p.forca === 2).map((p) => p.a.titulo);
        assert.deepEqual(
            titulos,
            [...titulos].sort((x, y) => x.localeCompare(y, 'pt-BR')),
        );
    });

    it('par com texto sem data vem sem direção', () => {
        const r = sugerirEcos(acervo(), 'personagem', 10);
        const semData = r.pares.filter(
            (p) => p.a.titulo === 'Sem Data' || p.b.titulo === 'Sem Data',
        );
        assert.equal(semData.length, 3);
        assert.ok(semData.every((p) => p.dono === null));
    });

    it('esconde os pares só de menção por padrão e conta quantos ficaram de fora', () => {
        const a = acervo();
        a.poemas.find((p) => p.id === 4).personagens = [mencao(10)];
        const padrao = sugerirEcos(a, 'personagem', 10);
        assert.equal(padrao.superficiais, 1, 'Rede x Sem Data: menção nos dois lados');
        assert.equal(padrao.pares.length, 5);
        const tudo = sugerirEcos(a, 'personagem', 10, { incluirSuperficiais: true });
        assert.equal(tudo.pares.length, 6);
        assert.equal(tudo.superficiais, 0);
        assert.equal(tudo.pares[tudo.pares.length - 1].forca, 0, 'os de força 0 ficam no fim');
    });

    it('não sugere par que já tem Eco, em qualquer sentido ou tipo', () => {
        const a = acervo();
        a.prosas[0].conceitos = { ecos: [{ id: 1, tipo: 'Aceno a', texto: '' }] }; // Cais -> poema id 1 (Maré)
        const r = sugerirEcos(a, 'personagem', 10);
        assert.equal(r.comEco, 1);
        assert.equal(r.pares.length, 5);
        assert.equal(achar(r.pares, 'Cais', 'Maré'), undefined);
    });

    it('prosa e poema com o mesmo id não se confundem', () => {
        const a = acervo(); // poema 1 (Maré) e prosa 1 (Cais)
        // Eco de Maré para o poema 1 não conta como Eco com a prosa 1.
        a.poemas[0].conceitos = { ecos: [{ id: 3, tipo: 'Aceno a', texto: '' }] }; // Maré -> Rede
        const r = sugerirEcos(a, 'personagem', 10);
        assert.equal(r.comEco, 1);
        assert.ok(achar(r.pares, 'Cais', 'Maré'));
    });

    it('pessoa funciona como personagem, com os papéis da pessoa', () => {
        const r = sugerirEcos(acervo(), 'pessoa', 20);
        assert.equal(r.nome, 'Marina');
        assert.equal(r.totalTextos, 3);
        // Maré (Retratado) forte; Rede e Cais só mencionam. Par Rede x Cais é superfície.
        assert.equal(r.pares.length, 2);
        assert.equal(r.superficiais, 1);
        assert.ok(r.pares.every((p) => p.forca === 1));
    });

    it('sujeito com menos de dois textos não gera par', () => {
        const r = sugerirEcos(acervo(), 'personagem', 11);
        assert.equal(r.totalTextos, 1);
        assert.equal(r.totalPares, 0);
        assert.deepEqual(r.pares, []);
    });

    it('é determinística: a ordem do acervo não muda o resultado', () => {
        const a = acervo();
        const b = acervo();
        b.poemas.reverse();
        const chaves = (r) => r.pares.map((p) => `${p.a.titulo}|${p.b.titulo}`);
        // A ordem de a/b dentro do par segue a do acervo, então comparo como conjunto.
        const norm = (r) =>
            chaves(r)
                .map((c) => c.split('|').sort().join('|'))
                .sort();
        assert.deepEqual(
            norm(sugerirEcos(a, 'personagem', 10)),
            norm(sugerirEcos(b, 'personagem', 10)),
        );
    });

    it('aguenta um sujeito em 30 textos (435 pares) sem perder nenhum', () => {
        const a = { personagens: [{ id: 1, nome: 'X' }], pessoas: [], prosas: [], poemas: [] };
        for (let i = 1; i <= 30; i++) {
            a.poemas.push({
                id: i,
                titulo: `T${String(i).padStart(2, '0')}`,
                dataEscrita: { ano: 2000 + i },
                personagens: [voz(1)],
            });
        }
        const r = sugerirEcos(a, 'personagem', 1);
        assert.equal(r.totalPares, 435);
        assert.equal(r.pares.length, 435);
        assert.equal(new Set(r.pares.map((p) => p.chave)).size, 435);
        assert.ok(r.pares.every((p) => p.dono === 'b' || p.dono === 'a'));
    });
});

describe('criarEcoSugerido e desfazerEcoSugerido', () => {
    it('grava no texto mais novo, com o tipo da espécie e a âncora', () => {
        const a = acervo();
        const par = achar(sugerirEcos(a, 'personagem', 10).pares, 'Cais', 'Maré');
        const reg = criarEcoSugerido(a, par, 'personagem', 10, par.dono);
        assert.ok(reg);
        assert.deepEqual(a.prosas[0].conceitos.ecos, [
            {
                id: 1,
                tipo: 'Personagem em comum',
                texto: '',
                ancoras: [{ especie: 'personagem', id: 10 }],
            },
        ]);
        assert.equal(reg.donoCol, 'prosas');
        assert.equal(reg.alvoCol, 'poemas');
        assert.equal(a.poemas[0].conceitos, undefined, 'o mais antigo não ganha nada');
        // O par some da próxima sugestão.
        assert.equal(sugerirEcos(a, 'personagem', 10).comEco, 1);
    });

    it('pessoa usa "Pessoa em comum"', () => {
        const a = acervo();
        const par = sugerirEcos(a, 'pessoa', 20).pares[0];
        const reg = criarEcoSugerido(a, par, 'pessoa', 20, par.dono || 'a');
        assert.equal(reg.eco.tipo, 'Pessoa em comum');
        assert.deepEqual(reg.eco.ancoras, [{ especie: 'pessoa', id: 20 }]);
    });

    it('a direção pode ser invertida ou escolhida quando as datas não decidem', () => {
        const a = acervo();
        const par = achar(sugerirEcos(a, 'personagem', 10).pares, 'Cais', 'Maré');
        const reg = criarEcoSugerido(a, par, 'personagem', 10, ladoDe(par, 'Maré')); // contra a sugestão
        assert.equal(reg.donoCol, 'poemas');
        assert.equal(a.poemas[0].conceitos.ecos[0].id, 1);
    });

    it('recusa dono inválido, par que já ganhou Eco e vínculo que sumiu', () => {
        const a = acervo();
        const par = sugerirEcos(a, 'personagem', 10).pares[0];
        assert.equal(criarEcoSugerido(a, par, 'personagem', 10, 'c'), null);
        assert.equal(criarEcoSugerido(a, par, 'personagem', 10, null), null);

        assert.ok(criarEcoSugerido(a, par, 'personagem', 10, 'a'));
        assert.equal(
            criarEcoSugerido(a, par, 'personagem', 10, 'b'),
            null,
            'o par já tem Eco, em qualquer sentido',
        );

        const b = acervo();
        const par2 = sugerirEcos(b, 'personagem', 10).pares[0];
        b.poemas.forEach((p) => (p.personagens = []));
        b.prosas.forEach((p) => (p.personagens = []));
        assert.equal(criarEcoSugerido(b, par2, 'personagem', 10, 'a'), null);
    });

    it('recusa quando um dos textos foi excluído', () => {
        const a = acervo();
        const par = sugerirEcos(a, 'personagem', 10).pares[0];
        a.prosas.length = 0;
        a.poemas.length = 0;
        assert.equal(criarEcoSugerido(a, par, 'personagem', 10, 'a'), null);
    });

    it('cria conceitos e ecos quando o texto não tinha', () => {
        const a = acervo();
        a.prosas[0].conceitos = { elos: [] };
        const par = achar(sugerirEcos(a, 'personagem', 10).pares, 'Cais', 'Maré');
        criarEcoSugerido(a, par, 'personagem', 10, ladoDe(par, 'Cais'));
        assert.equal(a.prosas[0].conceitos.ecos.length, 1);
        assert.deepEqual(a.prosas[0].conceitos.elos, []);
    });

    it('desfazer remove só o Eco criado e preserva os outros', () => {
        const a = acervo();
        a.prosas[0].conceitos = { ecos: [{ id: 3, tipo: 'Aceno a', texto: 'antigo' }] };
        const par = achar(sugerirEcos(a, 'personagem', 10).pares, 'Cais', 'Maré');
        const reg = criarEcoSugerido(a, par, 'personagem', 10, ladoDe(par, 'Cais'));
        assert.equal(a.prosas[0].conceitos.ecos.length, 2);
        assert.equal(desfazerEcoSugerido(a, reg), true);
        assert.deepEqual(a.prosas[0].conceitos.ecos, [{ id: 3, tipo: 'Aceno a', texto: 'antigo' }]);
        assert.equal(desfazerEcoSugerido(a, reg), false, 'segunda vez não acha nada');
    });

    it('desfazer acha o Eco por conteúdo se a referência se perdeu, mas não apaga um Eco com nota', () => {
        const a = acervo();
        const par = achar(sugerirEcos(a, 'personagem', 10).pares, 'Cais', 'Maré');
        const reg = criarEcoSugerido(a, par, 'personagem', 10, ladoDe(par, 'Cais'));
        // Simula um acervo recarregado: o objeto é outro, com o mesmo conteúdo.
        a.prosas[0].conceitos.ecos = a.prosas[0].conceitos.ecos.map((e) => structuredClone(e));
        assert.equal(desfazerEcoSugerido(a, reg), true);

        const par2 = achar(sugerirEcos(a, 'personagem', 10).pares, 'Cais', 'Maré');
        const reg2 = criarEcoSugerido(a, par2, 'personagem', 10, ladoDe(par2, 'Cais'));
        a.prosas[0].conceitos.ecos = a.prosas[0].conceitos.ecos.map((e) => ({
            ...structuredClone(e),
            texto: 'escrevi depois',
        }));
        assert.equal(desfazerEcoSugerido(a, reg2), false);
        assert.equal(a.prosas[0].conceitos.ecos.length, 1);
    });
});

describe('ignorar par', () => {
    const chaveMareCais = chaveDoPar('poemas', 1, 'prosas', 1);

    it('a chave não depende da ordem dos textos', () => {
        assert.equal(chaveMareCais, chaveDoPar('prosas', 1, 'poemas', 1));
        const r = sugerirEcos(acervo(), 'personagem', 10);
        assert.equal(achar(r.pares, 'Cais', 'Maré').chave, chaveMareCais);
    });

    it('o par ignorado sai de pares e vai para ignorados, só para aquela figura', () => {
        const a = acervo();
        assert.equal(ignorarPar(a, 'personagem', 10, chaveMareCais), true);
        assert.equal(ignorarPar(a, 'personagem', 10, chaveMareCais), false, 'idempotente');
        const r = sugerirEcos(a, 'personagem', 10);
        assert.equal(r.pares.length, 5);
        assert.equal(r.ignorados.length, 1);
        assert.equal(r.ignorados[0].chave, chaveMareCais);
        // A Marina (pessoa) continua vendo o par: o motivo de ignorar era da Iara.
        const pessoa = sugerirEcos(a, 'pessoa', 20);
        assert.ok(achar([...pessoa.pares, ...pessoa.ignorados], 'Cais', 'Maré'));
        assert.equal(pessoa.ignorados.length, 0);
    });

    it('par só de menção ignorado vai para ignorados, não para o contador de ocultos', () => {
        const a = acervo();
        a.poemas.find((p) => p.id === 4).personagens = [mencao(10)];
        const chave = chaveDoPar('poemas', 3, 'poemas', 4); // Rede x Sem Data
        assert.equal(sugerirEcos(a, 'personagem', 10).superficiais, 1);
        ignorarPar(a, 'personagem', 10, chave);
        const r = sugerirEcos(a, 'personagem', 10);
        assert.equal(r.superficiais, 0);
        assert.equal(r.ignorados.length, 1);
    });

    it('restaurar devolve o par à lista', () => {
        const a = acervo();
        ignorarPar(a, 'personagem', 10, chaveMareCais);
        assert.equal(restaurarPar(a, 'personagem', 10, chaveMareCais), true);
        assert.equal(restaurarPar(a, 'personagem', 10, chaveMareCais), false);
        const r = sugerirEcos(a, 'personagem', 10);
        assert.equal(r.pares.length, 6);
        assert.equal(r.ignorados.length, 0);
    });

    it('recusa espécie inválida e chave vazia', () => {
        const a = acervo();
        assert.equal(ignorarPar(a, 'grupo', 1, chaveMareCais), false);
        assert.equal(ignorarPar(a, 'pessoa', 20, ''), false);
        assert.equal(a.ecosIgnorados, undefined);
    });

    it('sincronizar solta figura ou texto excluído, par que ganhou Eco, duplicata e lixo', () => {
        const a = acervo();
        a.ecosIgnorados = [
            { especie: 'personagem', id: 10, chave: chaveMareCais }, // fica
            { especie: 'personagem', id: 10, chave: chaveMareCais }, // duplicata
            { especie: 'personagem', id: 999, chave: chaveMareCais }, // figura não existe
            { especie: 'personagem', id: 10, chave: chaveDoPar('poemas', 1, 'prosas', 77) }, // texto sumiu
            { especie: 'personagem', id: 10, chave: chaveDoPar('poemas', 1, 'poemas', 3) }, // vira Eco
            { especie: 'grupo', id: 10, chave: chaveMareCais },
            { especie: 'personagem', id: 10, chave: 'sem-barra' },
            null,
        ];
        a.poemas[0].conceitos = { ecos: [{ id: 3, tipo: 'Aceno a', texto: '' }] };
        assert.equal(sincronizarParesIgnorados(a), 7);
        assert.deepEqual(a.ecosIgnorados, [
            { especie: 'personagem', id: 10, chave: chaveMareCais },
        ]);
        assert.equal(sincronizarParesIgnorados(a), 0, 'idempotente');
        assert.equal(sincronizarParesIgnorados({}), 0, 'sem o campo, nada a fazer');
    });
});
