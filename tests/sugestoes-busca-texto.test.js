import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
    sugerirBuscaTexto,
    aplicarSugestaoBuscaTexto,
    DESCRICAO_PREFIXO_TEXTO,
    PREFIXOS_CANONICOS_TEXTO,
    APELIDOS_PREFIXO_TEXTO,
    prefixoCanonicoTexto,
} = await import('../js/sugestoes-busca-texto.js');
const { PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');

const FONTES = {
    tema: ['Luto', 'Amor', 'Amor próprio', 'Autoengano', 'amor'],
    pessoa: () => ['Maria Silva', 'João Pereira'],
    etiqueta: [
        { valor: 'Moldura de abertura', detalhe: 'Paratexto' },
        { valor: 'Estrutura circular', detalhe: 'Estilo' },
    ],
    corrente: ['Romantismo', 'Realismo'],
    movimento: ['Romantismo', 'Modernismo'],
    escola: ['Romantismo', 'Parnasianismo'],
    genero: ['Conto', 'Crônica'],
    vazia: [],
    estilo: [],
};

const sug = (q, opcoes) => sugerirBuscaTexto(q, FONTES, opcoes);
const textos = (q, opcoes) => sug(q, opcoes)?.itens.map((i) => i.texto);

describe('cobertura da tabela de prefixos', () => {
    it('os 115 prefixos canônicos da busca têm descrição', () => {
        assert.equal(PREFIXOS_CANONICOS_TEXTO.length, 115);
        const sem = PREFIXOS_CANONICOS_TEXTO.filter((p) => !DESCRICAO_PREFIXO_TEXTO[p]);
        assert.deepEqual(sem, []);
    });

    it('não há descrição de prefixo que a busca não conhece', () => {
        const canonicos = new Set(Object.values(PREFIXOS_CANONICOS_POR_CAMPO));
        const sobra = Object.keys(DESCRICAO_PREFIXO_TEXTO).filter((p) => !canonicos.has(p));
        assert.deepEqual(sobra, []);
    });

    it('apelidos apontam para o canônico do mesmo campo', () => {
        assert.equal(APELIDOS_PREFIXO_TEXTO.escola, undefined);
        assert.equal(APELIDOS_PREFIXO_TEXTO.movimento, undefined);
        assert.equal(APELIDOS_PREFIXO_TEXTO.hipertextualidade, 'hipertexto');
        assert.equal(APELIDOS_PREFIXO_TEXTO.anexos, 'anexo');
        assert.equal(APELIDOS_PREFIXO_TEXTO.tema, undefined);
    });

    it('prefixoCanonicoTexto ignora caixa e acento e devolve undefined se não existe', () => {
        assert.equal(prefixoCanonicoTexto('Escola'), 'escola');
        assert.equal(prefixoCanonicoTexto('Título'), 'titulo');
        assert.equal(prefixoCanonicoTexto('inexistente'), undefined);
    });
});

describe('completar o prefixo', () => {
    it('oferece os prefixos que começam como o digitado', () => {
        const r = sug('temas');
        assert.deepEqual(
            r.itens.map((i) => i.texto),
            ['temasecundario:', 'temasempapel:'],
        );
        assert.equal(r.inicio, 0);
        assert.ok(r.itens.every((i) => i.completo === false));
        assert.equal(r.itens[0].detalhe, 'tema com papel secundário');
    });

    it('"tem" lista tema e as variantes por papel', () => {
        const t = textos('tem');
        assert.equal(t[0], 'tema:');
        assert.ok(t.includes('temaprincipal:'));
        assert.ok(t.includes('temasecundario:'));
    });

    it('mantém o - na frente', () => {
        assert.equal(textos('-pes')[0], '-pessoa:');
        assert.ok(textos('-pes').includes('-pessoaperiodo:'));
    });

    it('só o último termo conta e o início aponta para ele', () => {
        const r = sug('amor tem');
        assert.equal(r.inicio, 5);
        assert.equal(r.itens[0].texto, 'tema:');
    });

    it('ignora acento e caixa no que foi digitado', () => {
        assert.equal(textos('TÍT')[0], 'titulo:');
    });

    it('escola: é prefixo de verdade (não apelido de movimento:) e traz a própria descrição', () => {
        const escola = sug('esc').itens.find((i) => i.texto === 'escola:');
        assert.ok(escola);
        assert.equal(escola.detalhe, 'corrente de Programa Escola, com o que está dentro');
        assert.equal(escola.completo, false);
    });

    it('oferece o apelido, dizendo de quem é', () => {
        const apelido = sug('hipertextual').itens.find((i) => i.texto === 'hipertextualidade:');
        assert.ok(apelido);
        assert.match(apelido.detalhe, /o mesmo que hipertexto:/);
    });

    it('"hiper" acha hipertexto e hiperacionante, sem repetir o apelido hipertextualidade', () => {
        const t = textos('hiper');
        assert.ok(t.includes('hipertexto:'));
        assert.ok(t.includes('hiperacionante:'));
        assert.ok(!t.includes('hipertextualidade:'));
    });

    it('o apelido não repete o canônico: "anexo" dá só anexo:, "anexos" dá anexos: com o aviso', () => {
        assert.deepEqual(
            textos('anexo').filter((x) => x.startsWith('anexo')),
            ['anexo:'],
        );
        const r = sug('anexos');
        assert.deepEqual(
            r.itens.map((i) => i.texto),
            ['anexos:'],
        );
        assert.match(r.itens[0].detalhe, /o mesmo que anexo:/);
    });

    it('respeita o limite', () => {
        assert.equal(sug('p').itens.length, 12);
        assert.equal(sug('p', { limite: 3 }).itens.length, 3);
    });

    it('nada a oferecer quando nenhum prefixo começa assim', () => {
        assert.equal(sug('zzz'), null);
        assert.equal(sug('-'), null);
        assert.equal(sug(''), null);
        assert.equal(sug('amor '), null, 'termo novo ainda vazio');
    });

    it('prefixo desconhecido com dois pontos não sugere nada', () => {
        assert.equal(sug('inexistente:'), null);
        assert.equal(sug('"tem'), null);
    });

    it('prefixos ocultos não são oferecidos (ex.: genero em Poemas)', () => {
        assert.ok(textos('gen').includes('genero:'));
        assert.ok(!textos('gen', { prefixosOcultos: ['genero'] })?.includes('genero:'));
        assert.equal(sug('genero:', { prefixosOcultos: ['genero'] }), null);
    });
});

describe('valores depois do prefixo', () => {
    it('com valor vazio oferece * e os valores, sem repetir os iguais', () => {
        const t = textos('tema:');
        assert.equal(t[0], 'tema:*');
        assert.deepEqual(t.slice(1), [
            'tema:Amor',
            'tema:"Amor próprio"',
            'tema:Autoengano',
            'tema:Luto',
        ]);
    });

    it('filtra pelo trecho, sem acento nem caixa, começando por quem abre com ele', () => {
        assert.deepEqual(textos('tema:pro'), ['tema:"Amor próprio"']);
        assert.deepEqual(textos('tema:AU'), ['tema:Autoengano']);
        const t = textos('tema:u');
        assert.deepEqual(t, ['tema:Autoengano', 'tema:Luto']);
        assert.equal(sug('tema:u').itens[0].completo, true);
    });

    it('valor com espaço sai entre aspas e o que já tem aspas abertas continua funcionando', () => {
        assert.deepEqual(textos('pessoa:"maria'), ['pessoa:"Maria Silva"']);
        assert.deepEqual(textos('pessoa:mar'), ['pessoa:"Maria Silva"']);
    });

    it('o detalhe da fonte vai junto', () => {
        const r = sug('etiqueta:mold');
        assert.equal(r.itens[0].rotulo, 'Moldura de abertura');
        assert.equal(r.itens[0].detalhe, 'Paratexto');
        assert.equal(r.itens[0].texto, 'etiqueta:"Moldura de abertura"');
    });

    it('mantém o - e o apelido digitados', () => {
        assert.deepEqual(textos('-tema:lu'), ['-tema:Luto']);
        assert.deepEqual(textos('escola:rom'), ['escola:Romantismo']);
        assert.deepEqual(textos('MOVIMENTO:mod'), ['MOVIMENTO:Modernismo']);
    });

    it('aceita fonte como função', () => {
        assert.deepEqual(textos('pessoa:jo'), ['pessoa:"João Pereira"']);
    });

    it('descarta valores vazios e repetidos (ignorando caixa e acento) da fonte', () => {
        const r = sugerirBuscaTexto('t', { tema: ['', '  ', 'Amor', 'amor', 'AMOR'] });
        assert.ok(r);
        const v = sugerirBuscaTexto('tema:', { tema: ['', '  ', 'Amor', 'amor', 'AMOR'] });
        assert.deepEqual(
            v.itens.map((i) => i.texto),
            ['tema:*', 'tema:Amor'],
        );
    });

    it('só oferece o que existe: valor sem casamento devolve null', () => {
        assert.equal(sug('tema:xyz'), null);
    });

    it('prefixo sem fonte, ou com fonte vazia, não oferece valor (nem *)', () => {
        assert.equal(sug('titulo:'), null);
        assert.equal(sug('nota:a'), null);
        assert.equal(sug('estilo:'), null);
        assert.equal(sugerirBuscaTexto('tema:', {}), null);
        assert.equal(sugerirBuscaTexto('tema:', undefined), null);
    });

    it('datas aceitam * mesmo sem fonte', () => {
        assert.deepEqual(textos('dataescrita:'), ['dataescrita:*']);
        assert.deepEqual(textos('-datapublicacao:'), ['-datapublicacao:*']);
        assert.equal(sug('dataescrita:2020'), null);
    });

    it('"campo:*" já completo não sugere nada', () => {
        assert.equal(sug('tema:*'), null);
        assert.equal(sug('-tema:*'), null);
    });

    it('o termo já exato não é repetido', () => {
        assert.equal(sug('tema:Luto'), null);
        assert.equal(sug('pessoa:"Maria Silva"'), null);
    });

    it('termos antes do último não interferem', () => {
        const r = sug('"vida longa" -tema:lu');
        assert.equal(r.inicio, 13);
        assert.deepEqual(
            r.itens.map((i) => i.texto),
            ['-tema:Luto'],
        );
    });

    it('aspas no valor são escapadas', () => {
        const r = sugerirBuscaTexto('tema:a', { tema: ['O "sol" e a lua'] });
        assert.equal(r.itens[0].texto, 'tema:"O \\"sol\\" e a lua"');
    });

    it('respeita o limite também nos valores', () => {
        const muitos = Array.from({ length: 20 }, (_, i) => `Tema ${i}`);
        assert.equal(sugerirBuscaTexto('tema:', { tema: muitos }).itens.length, 12);
        assert.equal(sugerirBuscaTexto('tema:', { tema: muitos }, { limite: 4 }).itens.length, 4);
    });
});

describe('aplicar a sugestão', () => {
    it('termo completo ganha espaço; prefixo fica esperando o valor', () => {
        const comValor = sug('amor tema:lu');
        assert.equal(
            aplicarSugestaoBuscaTexto('amor tema:lu', comValor.inicio, comValor.itens[0]),
            'amor tema:Luto ',
        );
        const prefixo = sug('amor tem');
        assert.equal(
            aplicarSugestaoBuscaTexto('amor tem', prefixo.inicio, prefixo.itens[0]),
            'amor tema:',
        );
    });
});

describe('pessoa:Nome@Papel (T6)', () => {
    const VINCULOS = [
        { nome: 'Maria Silva', papeis: ['Retratado(a)', 'Dedicatário(a)', 'Voz'] },
        { nome: 'Pedro', papeis: ['Mencionado(a)', 'Dedicatário(a)'] },
        { nome: 'Ana', papeis: ['Inspiração para'] },
    ];
    const fontes = {
        pessoa: ['Maria Silva', 'Pedro', 'Ana'],
        vinculospessoa: () => VINCULOS,
    };
    const textos = (r) => r.itens.map((i) => i.texto);

    it('depois do @ oferece os papéis da pessoa, na ordem dada', () => {
        const r = sugerirBuscaTexto('pessoa:Pedro@', fontes);
        assert.deepEqual(textos(r), ['pessoa:Pedro@Mencionado(a)', 'pessoa:Pedro@Dedicatário(a)']);
        assert.ok(r.itens.every((i) => i.completo));
    });

    it('filtra pelo que foi digitado depois do @, também pela forma feminina', () => {
        assert.deepEqual(textos(sugerirBuscaTexto('pessoa:Pedro@ded', fontes)), [
            'pessoa:Pedro@Dedicatário(a)',
        ]);
        assert.deepEqual(textos(sugerirBuscaTexto('pessoa:Pedro@dedicatária', fontes)), [
            'pessoa:Pedro@Dedicatário(a)',
        ]);
        assert.deepEqual(textos(sugerirBuscaTexto('pessoa:Pedro@mencionada', fontes)), [
            'pessoa:Pedro@Mencionado(a)',
        ]);
    });

    it('nome com espaço e papel com espaço vêm entre aspas', () => {
        assert.deepEqual(textos(sugerirBuscaTexto('pessoa:"Maria Silva@v', fontes)), [
            'pessoa:"Maria Silva@Voz"',
        ]);
        assert.deepEqual(textos(sugerirBuscaTexto('pessoa:Ana@', fontes)), [
            'pessoa:"Ana@Inspiração para"',
        ]);
    });

    it('nome vazio vale "qualquer pessoa": só papéis em uso, sem repetir', () => {
        const r = sugerirBuscaTexto('pessoa:@', fontes);
        assert.deepEqual(textos(r), [
            'pessoa:@Retratado(a)',
            'pessoa:@Dedicatário(a)',
            'pessoa:@Voz',
            'pessoa:@Mencionado(a)',
            'pessoa:"@Inspiração para"',
        ]);
        assert.deepEqual(textos(sugerirBuscaTexto('pessoa:@dedicatária', fontes)), [
            'pessoa:@Dedicatário(a)',
        ]);
    });

    it('sem @, uma pessoa só que casa mostra também os pares dela', () => {
        assert.deepEqual(textos(sugerirBuscaTexto('pessoa:Ped', fontes)), [
            'pessoa:Pedro',
            'pessoa:Pedro@Mencionado(a)',
            'pessoa:Pedro@Dedicatário(a)',
        ]);
        // duas pessoas casam: só os nomes
        assert.deepEqual(textos(sugerirBuscaTexto('pessoa:a', fontes)), [
            'pessoa:Ana',
            'pessoa:"Maria Silva"',
        ]);
    });

    it('mantém o "-" e não sugere o que não existe nem o que já está digitado', () => {
        assert.deepEqual(textos(sugerirBuscaTexto('-pessoa:Pedro@men', fontes)), [
            '-pessoa:Pedro@Mencionado(a)',
        ]);
        assert.equal(sugerirBuscaTexto('pessoa:Pedro@xyz', fontes), null);
        assert.equal(sugerirBuscaTexto('pessoa:Pedro@Mencionado(a)', fontes), null);
        assert.equal(sugerirBuscaTexto('pessoa:Zélia@', fontes), null);
    });

    it('sem a tabela de vínculos, pessoa: segue oferecendo só os nomes', () => {
        const r = sugerirBuscaTexto('pessoa:Ped', { pessoa: ['Pedro'] });
        assert.deepEqual(textos(r), ['pessoa:Pedro']);
        assert.equal(sugerirBuscaTexto('pessoa:Pedro@', { pessoa: ['Pedro'] }), null);
    });
});

describe('total antes do corte', () => {
    it('devolve quantas havia antes do limite, para a tela avisar', () => {
        const muitos = Array.from({ length: 30 }, (_, i) => `Tema ${i}`);
        const r = sugerirBuscaTexto('tema:', { tema: muitos });
        assert.equal(r.itens.length, 12);
        assert.equal(r.total, 31); // 30 valores mais o *
        assert.equal(sugerirBuscaTexto('tema:', { tema: muitos }, { limite: 4 }).total, 31);
    });

    it('sem corte, total é o número de itens', () => {
        const r = sugerirBuscaTexto('tema:', { tema: ['Amor', 'Luto'] });
        assert.equal(r.total, r.itens.length);
        const p = sugerirBuscaTexto('tem', {});
        assert.equal(p.total, p.itens.length);
    });
});
