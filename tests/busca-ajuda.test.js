import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buscarNaAjuda, termosBuscaAjuda } from '../js/busca-ajuda.js';
import { TAREFAS_COMO_FACO } from '../js/como-faco-passos.js';
import { CATEGORIAS_FAQ } from '../js/faq-conteudo.js';

const DADOS = {
    grupos: [
        { id: 'a', rotulo: 'Grupo A' },
        { id: 'b', rotulo: 'Grupo B' },
        { id: 'vazio', rotulo: 'Grupo sem tarefa' },
    ],
    tarefas: [
        {
            id: 't1',
            grupo: 'a',
            titulo: 'Registrar um poema',
            palavras: ['criar', 'cadastrar'],
            descricao: 'Clique em Novo Poema e preencha o Texto.',
            passos: [{ titulo: 'Passo', texto: 'palavra-so-no-passo' }],
        },
        {
            id: 't2',
            grupo: 'b',
            titulo: 'Baixar o acervo',
            palavras: ['exportar', 'download'],
            descricao: 'Gera um arquivo de segurança (cópia).',
            passos: [],
        },
        { id: 't3', grupo: 'a', titulo: 'Ajustar a Sonoridade', descricao: '', passos: [] },
    ],
    categorias: [
        {
            id: 'c1',
            rotulo: 'Cat 1',
            perguntas: [
                {
                    id: 'p1',
                    pergunta: 'Onde ficam meus dados?',
                    resposta: 'No navegador, sem servidor.',
                },
                {
                    id: 'p2',
                    pergunta: 'O que é um Eco?',
                    resposta: 'Repetição sonora entre trechos.',
                },
            ],
        },
        {
            id: 'c2',
            rotulo: 'Cat 2',
            perguntas: [
                {
                    id: 'p3',
                    pergunta: 'Posso desfazer?',
                    resposta: 'Sim, pelo retrato.',
                    palavras: ['voltar atras', 'restaurar'],
                },
            ],
        },
    ],
};

const idsTarefas = (r) => r.grupos.flatMap((g) => g.tarefas.map((t) => t.id));
const idsPerguntas = (r) => r.categorias.flatMap((c) => c.perguntas.map((p) => p.id));

describe('busca da Central de Ajuda: termos', () => {
    it('separa por espaço, ignora acento e caixa e tira repetição', () => {
        assert.deepEqual(termosBuscaAjuda('  Segurança  CÓPIA segurança '), ['seguranca', 'copia']);
    });

    it('texto vazio, só espaços ou nulo não dá termo', () => {
        assert.deepEqual(termosBuscaAjuda(''), []);
        assert.deepEqual(termosBuscaAjuda('   '), []);
        assert.deepEqual(termosBuscaAjuda(null), []);
        assert.deepEqual(termosBuscaAjuda(undefined), []);
    });
});

describe('busca da Central de Ajuda: frase exata', () => {
    it('aspas com par viram uma frase só', () => {
        assert.deepEqual(termosBuscaAjuda('"Novo Poema" texto'), ['novo poema', 'texto']);
    });

    it('aspa sem par e aspas vazias somem, sem erro', () => {
        assert.deepEqual(termosBuscaAjuda('"novo poema'), ['novo', 'poema']);
        assert.deepEqual(termosBuscaAjuda('poema"'), ['poema']);
        assert.deepEqual(termosBuscaAjuda('""'), []);
        assert.deepEqual(termosBuscaAjuda('" "'), []);
    });

    it('a frase exige as palavras juntas e nessa ordem', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('"novo poema"', DADOS)), ['t1']);
        assert.deepEqual(idsTarefas(buscarNaAjuda('"poema novo"', DADOS)), []);
        // as duas palavras existem na descrição, mas não coladas
        assert.deepEqual(idsTarefas(buscarNaAjuda('"novo texto"', DADOS)), []);
        assert.deepEqual(idsTarefas(buscarNaAjuda('novo texto', DADOS)), ['t1']);
    });

    it('frase ignora acento, caixa e espaço repetido', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('"ARQUIVO   de seguranca"', DADOS)), ['t2']);
    });

    it('frase combina por E com palavras soltas', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('"novo poema" registrar', DADOS)), ['t1']);
        const r = buscarNaAjuda('"novo poema" acervo', DADOS);
        assert.equal(r.parcial, true);
        assert.equal(r.acertos, 1);
    });

    it('a frase não atravessa o fim do título e o começo da descrição', () => {
        const dados = {
            ...DADOS,
            tarefas: [
                {
                    id: 'x',
                    grupo: 'a',
                    titulo: 'Fim do titulo',
                    descricao: 'comeco da descricao',
                    passos: [],
                },
            ],
        };
        assert.equal(buscarNaAjuda('"titulo comeco"', dados).total, 0);
        assert.equal(buscarNaAjuda('titulo comeco', dados).total, 1);
    });

    it('aspa sem par ainda filtra pelas palavras', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('"novo poema', DADOS)), ['t1']);
    });

    it('só aspas vazias não filtra nada', () => {
        const r = buscarNaAjuda('""', DADOS);
        assert.equal(r.ativa, false);
        assert.equal(r.total, 6);
    });
});

describe('busca da Central de Ajuda: filtro', () => {
    it('sem termo não filtra nada e a busca fica inativa', () => {
        const r = buscarNaAjuda('   ', DADOS);
        assert.equal(r.ativa, false);
        assert.equal(r.vazia, false);
        assert.deepEqual(idsTarefas(r), ['t1', 't3', 't2']);
        assert.deepEqual(idsPerguntas(r), ['p1', 'p2', 'p3']);
        assert.equal(r.total, 6);
    });

    it('grupo e categoria sem item nunca aparecem, nem sem busca', () => {
        const r = buscarNaAjuda('', DADOS);
        assert.ok(!r.grupos.some((g) => g.id === 'vazio'));
    });

    it('acha tarefa pelo título e pela descrição, sem acento nem caixa', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('REGISTRAR', DADOS)), ['t1']);
        assert.deepEqual(idsTarefas(buscarNaAjuda('seguranca', DADOS)), ['t2']);
        assert.deepEqual(idsTarefas(buscarNaAjuda('copia', DADOS)), ['t2']);
    });

    it('acha pergunta pela pergunta e pela resposta', () => {
        assert.deepEqual(idsPerguntas(buscarNaAjuda('dados', DADOS)), ['p1']);
        assert.deepEqual(idsPerguntas(buscarNaAjuda('servidor', DADOS)), ['p1']);
        assert.deepEqual(idsPerguntas(buscarNaAjuda('retrato', DADOS)), ['p3']);
    });

    it('casa por trecho da palavra', () => {
        const r = buscarNaAjuda('sonor', DADOS);
        assert.deepEqual(idsTarefas(r), ['t3']);
        assert.deepEqual(idsPerguntas(r), ['p2']);
    });

    it('cada palavra é um termo E, em qualquer ordem', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('poema registrar', DADOS)), ['t1']);
        // nenhum item tem os dois: cai no resultado parcial (ver a seção própria)
        assert.equal(buscarNaAjuda('registrar acervo', DADOS).parcial, true);
    });

    it('os termos podem estar um no título e outro na descrição', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('registrar texto', DADOS)), ['t1']);
        assert.deepEqual(idsPerguntas(buscarNaAjuda('onde navegador', DADOS)), ['p1']);
    });

    it('não olha o texto dos passos do mini-tour', () => {
        const r = buscarNaAjuda('palavra-so-no-passo', DADOS);
        assert.equal(r.total, 0);
    });

    it('mantém a ordem da tela e remove só o que não casa', () => {
        const r = buscarNaAjuda('a', DADOS);
        assert.deepEqual(
            r.grupos.map((g) => g.id),
            ['a', 'b'],
        );
        assert.deepEqual(
            r.grupos[0].tarefas.map((t) => t.id),
            ['t1', 't3'],
        );
    });

    it('carrega o rótulo do grupo e da categoria para a tela', () => {
        const r = buscarNaAjuda('retrato', DADOS);
        assert.equal(r.categorias[0].rotulo, 'Cat 2');
        const t = buscarNaAjuda('acervo', DADOS);
        assert.equal(t.grupos[0].rotulo, 'Grupo B');
    });

    it('nada casando: vazia verdadeira, listas vazias e total 0', () => {
        const r = buscarNaAjuda('xyzxyz', DADOS);
        assert.equal(r.ativa, true);
        assert.equal(r.vazia, true);
        assert.equal(r.total, 0);
        assert.deepEqual(r.grupos, []);
        assert.deepEqual(r.categorias, []);
    });

    it('tarefa com descrição vazia ou ausente não quebra', () => {
        const dados = {
            ...DADOS,
            tarefas: [{ id: 'x', grupo: 'a', titulo: 'Só título', passos: [] }],
        };
        assert.deepEqual(idsTarefas(buscarNaAjuda('titulo', dados)), ['x']);
        assert.equal(buscarNaAjuda('descricao', dados).total, 0);
    });

    it('não altera os dados recebidos', () => {
        const antes = JSON.stringify(DADOS);
        buscarNaAjuda('poema', DADOS);
        assert.equal(JSON.stringify(DADOS), antes);
    });
});

describe('busca da Central de Ajuda: palavras-chave', () => {
    it('acha tarefa e pergunta por sinônimo que não está no texto', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('exportar', DADOS)), ['t2']);
        assert.deepEqual(idsPerguntas(buscarNaAjuda('restaurar', DADOS)), ['p3']);
    });

    it('frase exata também vale nas palavras-chave', () => {
        assert.deepEqual(idsPerguntas(buscarNaAjuda('"voltar atras"', DADOS)), ['p3']);
        assert.equal(buscarNaAjuda('"atras voltar"', DADOS).total, 0);
    });

    it('palavras-chave se combinam com título e descrição por E', () => {
        const r = buscarNaAjuda('exportar acervo', DADOS);
        assert.deepEqual(idsTarefas(r), ['t2']);
        assert.equal(r.parcial, false);
    });

    it('item sem `palavras` não quebra', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('ajustar', DADOS)), ['t3']);
    });
});

describe('busca da Central de Ajuda: palavras de enchimento', () => {
    it('somem quando há outra palavra na busca', () => {
        assert.deepEqual(termosBuscaAjuda('Como eu faço para apagar meu acervo'), [
            'apagar',
            'acervo',
        ]);
    });

    it('ficam quando a busca é só isso', () => {
        assert.deepEqual(termosBuscaAjuda('como para'), ['como', 'para']);
        assert.deepEqual(termosBuscaAjuda('a'), ['a']);
    });

    it('enchimento não derruba o E', () => {
        assert.deepEqual(idsTarefas(buscarNaAjuda('como eu faço para registrar um poema', DADOS)), [
            't1',
        ]);
        assert.equal(buscarNaAjuda('como eu faço para registrar um poema', DADOS).parcial, false);
    });
});

describe('busca da Central de Ajuda: resultado parcial', () => {
    it('com item que tem todos os termos, não é parcial', () => {
        const r = buscarNaAjuda('baixar acervo', DADOS);
        assert.equal(r.parcial, false);
        assert.equal(r.acertos, undefined);
        assert.deepEqual(idsTarefas(r), ['t2']);
    });

    it('sem item completo, traz só os que têm o maior número de termos', () => {
        // t1 tem "registrar" e "poema" (2 de 3); nenhum tem "xyzabc"
        const r = buscarNaAjuda('registrar poema xyzabc', DADOS);
        assert.equal(r.parcial, true);
        assert.equal(r.acertos, 2);
        assert.equal(r.totalTermos, 3);
        assert.deepEqual(idsTarefas(r), ['t1']);
        assert.deepEqual(idsPerguntas(r), []);
    });

    it('empate no maior número traz todos os empatados, tarefas e perguntas', () => {
        const r = buscarNaAjuda('acervo dados', DADOS);
        assert.equal(r.parcial, true);
        assert.equal(r.acertos, 1);
        assert.deepEqual(idsTarefas(r), ['t2']);
        assert.deepEqual(idsPerguntas(r), ['p1']);
        assert.equal(r.total, 2);
    });

    it('com um termo só nunca é parcial', () => {
        const r = buscarNaAjuda('xyzabc', DADOS);
        assert.equal(r.parcial, false);
        assert.equal(r.vazia, true);
    });

    it('nenhum termo casa com nada: vazia e não parcial', () => {
        const r = buscarNaAjuda('xyzabc qwerty', DADOS);
        assert.equal(r.parcial, false);
        assert.equal(r.vazia, true);
        assert.equal(r.total, 0);
    });

    it('enchimento não vira acerto no parcial', () => {
        // "como" e "para" estão fora; sobram dois termos sem item completo
        const r = buscarNaAjuda('como xyzabc registrar para', DADOS);
        assert.equal(r.totalTermos, 2);
        assert.equal(r.parcial, true);
        assert.deepEqual(idsTarefas(r), ['t1']);
    });
});

describe('busca da Central de Ajuda: dados reais', () => {
    it('sem busca devolve todas as tarefas e todas as perguntas', () => {
        const r = buscarNaAjuda('');
        assert.equal(idsTarefas(r).length, TAREFAS_COMO_FACO.length);
        assert.equal(
            idsPerguntas(r).length,
            CATEGORIAS_FAQ.reduce((n, c) => n + c.perguntas.length, 0),
        );
    });

    it('o título de cada tarefa acha a própria tarefa', () => {
        for (const t of TAREFAS_COMO_FACO) {
            assert.ok(idsTarefas(buscarNaAjuda(t.titulo)).includes(t.id), `tarefa ${t.id}`);
        }
    });

    it('a pergunta de cada FAQ acha a própria pergunta', () => {
        for (const c of CATEGORIAS_FAQ) {
            for (const p of c.perguntas) {
                assert.ok(idsPerguntas(buscarNaAjuda(p.pergunta)).includes(p.id), `faq ${p.id}`);
            }
        }
    });

    it('um termo que não existe em lugar nenhum não acha nada', () => {
        assert.equal(buscarNaAjuda('zzqxwv').vazia, true);
    });

    it('toda tarefa e toda pergunta tem palavras-chave de busca', () => {
        const itens = [...TAREFAS_COMO_FACO, ...CATEGORIAS_FAQ.flatMap((c) => c.perguntas)];
        for (const i of itens) {
            assert.ok(Array.isArray(i.palavras) && i.palavras.length >= 3, `palavras em ${i.id}`);
            assert.ok(
                i.palavras.every((w) => typeof w === 'string' && w.trim()),
                `texto em ${i.id}`,
            );
            assert.ok(!/[\u2014\u2013]/.test(i.palavras.join(' ')), `travessão em ${i.id}`);
        }
    });

    it('o vocabulário que a pessoa usa leva ao item certo', () => {
        const casos = [
            ['apagar tudo', 'tarefa', 'esvaziar-acervo'],
            ['resetar', 'tarefa', 'esvaziar-acervo'],
            ['cópia de segurança', 'tarefa', 'fazer-backup'],
            ['exportar livros', 'tarefa', 'baixar-livros'],
            ['escansão', 'tarefa', 'escandir-poema'],
            ['apagar tudo', 'faq', 'faq-esvaziar-acervo'],
            ['desfazer', 'faq', 'faq-esvaziar-depois'],
            ['cloud nuvem servidor', 'faq', 'faq-onde-dados'],
            ['pseudônimo', 'faq', 'faq-heteronimo-pseudonimo'],
        ];
        for (const [consulta, tipo, id] of casos) {
            const r = buscarNaAjuda(consulta);
            const ids = tipo === 'tarefa' ? idsTarefas(r) : idsPerguntas(r);
            assert.ok(ids.includes(id), `"${consulta}" deveria achar ${id}`);
        }
    });

    it('uma frase de pergunta cheia de enchimento ainda acha o item', () => {
        const r = buscarNaAjuda('como eu faço para apagar o meu acervo inteiro');
        assert.ok(idsTarefas(r).includes('esvaziar-acervo'));
    });
});
