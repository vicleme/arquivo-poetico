import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    NOMES_PAPEIS_PESSOA_FABRICA,
    apelidoDisponivel,
    apelidoDoPapel,
    apelidoSugerido,
    chavePapel,
    conflitosDoPapel,
    desmarcarPapel,
    marcarPapel,
    migrarRegistroPapeisPessoa,
    normalizarRegistro,
    papeisPessoaDeFabrica,
    papeisSeExcluem,
    papelEhSuperficie,
    resolverConflitosMantendoOPrimeiro,
    violacoesDeExclusao,
} from '../js/papeis-pessoa.js';
import { vinculoForte } from '../js/sugestao-ecos.js';
import {
    aplicarPlanoPessoas,
    planejarAplicacao,
    normalizarPapeis,
} from '../js/pessoas-papeis-massa.js';
import { aplicarPessoas } from '../js/importar-campos-extras.js';

describe('registro de papéis de Pessoa: fábrica', () => {
    it('tem os 9 papéis, na ordem histórica, com Alocutário(a) e Relacionado(a) no fim', () => {
        assert.deepEqual(NOMES_PAPEIS_PESSOA_FABRICA, [
            'Retratado(a)',
            'Inspiração para',
            'Dedicatário(a)',
            'Mencionado(a)',
            'Aludido(a)',
            'Associado(a) retroativamente',
            'Voz',
            'Alocutário(a)',
            'Relacionado(a)',
        ]);
    });

    it('os apelidos de fábrica têm 3 a 6 letras e não colidem', () => {
        const apelidos = papeisPessoaDeFabrica().map((p) => p.apelido);
        assert.ok(apelidos.every((a) => a.length >= 3 && a.length <= 6));
        assert.equal(new Set(apelidos.map(chavePapel)).size, apelidos.length);
        assert.equal(apelidoDoPapel('Alocutário(a)'), 'Aloc');
        assert.equal(apelidoDoPapel('Relacionado(a)'), 'Relac');
        assert.equal(apelidoDoPapel('Voz'), 'Voz');
    });

    it('papeisPessoaDeFabrica devolve cópias: editar uma não suja a fábrica', () => {
        const a = papeisPessoaDeFabrica();
        a[0].apelido = 'XXX';
        assert.equal(papeisPessoaDeFabrica()[0].apelido, 'Retr');
    });

    it('só Mencionado(a) e Aludido(a) são de superfície', () => {
        const superficie = papeisPessoaDeFabrica()
            .filter((p) => p.superficie)
            .map((p) => p.nome);
        assert.deepEqual(superficie, ['Mencionado(a)', 'Aludido(a)']);
        assert.equal(papelEhSuperficie('Relacionado(a)'), false);
    });
});

describe('exclusão entre papéis', () => {
    it('Mencionado(a) × Aludido(a) e Inspiração para × Associado(a) se excluem', () => {
        assert.equal(papeisSeExcluem('Mencionado(a)', 'Aludido(a)'), true);
        assert.equal(papeisSeExcluem('Inspiração para', 'Associado(a) retroativamente'), true);
    });

    it('Retratado(a) convive com Mencionado(a), Aludido(a) e os de endereçamento', () => {
        ['Mencionado(a)', 'Aludido(a)', 'Dedicatário(a)', 'Alocutário(a)', 'Voz'].forEach((p) =>
            assert.equal(papeisSeExcluem('Retratado(a)', p), false, p),
        );
    });

    it('Relacionado(a) não convive com nenhum outro', () => {
        NOMES_PAPEIS_PESSOA_FABRICA.filter((p) => p !== 'Relacionado(a)').forEach((p) =>
            assert.equal(papeisSeExcluem('Relacionado(a)', p), true, p),
        );
        assert.equal(papeisSeExcluem('Relacionado(a)', 'Relacionado(a)'), false);
    });

    it('marcarPapel tira o conflitante, põe o novo no fim e não altera o original', () => {
        const atuais = ['Retratado(a)', 'Mencionado(a)'];
        const r = marcarPapel('Aludido(a)', atuais);
        assert.deepEqual(r.papeis, ['Retratado(a)', 'Aludido(a)']);
        assert.deepEqual(r.removidos, ['Mencionado(a)']);
        assert.deepEqual(atuais, ['Retratado(a)', 'Mencionado(a)']);
    });

    it('marcarPapel num papel já marcado não muda nada', () => {
        const r = marcarPapel('Voz', ['Voz', 'Retratado(a)']);
        assert.deepEqual(r.papeis, ['Voz', 'Retratado(a)']);
        assert.deepEqual(r.removidos, []);
    });

    it('marcar Relacionado(a) limpa tudo, e marcar outro depois tira Relacionado(a)', () => {
        const a = marcarPapel('Relacionado(a)', ['Retratado(a)', 'Voz']);
        assert.deepEqual(a.papeis, ['Relacionado(a)']);
        assert.deepEqual(a.removidos, ['Retratado(a)', 'Voz']);
        const b = marcarPapel('Retratado(a)', ['Relacionado(a)']);
        assert.deepEqual(b.papeis, ['Retratado(a)']);
    });

    it('conflitosDoPapel, desmarcarPapel e violacoesDeExclusao', () => {
        assert.deepEqual(conflitosDoPapel('Aludido(a)', ['Mencionado(a)', 'Voz']), [
            'Mencionado(a)',
        ]);
        assert.deepEqual(desmarcarPapel('Voz', ['Retratado(a)', 'Voz']), ['Retratado(a)']);
        assert.deepEqual(violacoesDeExclusao(['Mencionado(a)', 'Voz', 'Aludido(a)']), [
            ['Mencionado(a)', 'Aludido(a)'],
        ]);
    });

    it('resolverConflitosMantendoOPrimeiro mantém o primeiro de cada conflito', () => {
        const r = resolverConflitosMantendoOPrimeiro(['Aludido(a)', 'Voz', 'Mencionado(a)']);
        assert.deepEqual(r.papeis, ['Aludido(a)', 'Voz']);
        assert.deepEqual(r.removidos, ['Mencionado(a)']);
    });
});

describe('normalizarRegistro e migração', () => {
    it('registro vazio ou torto vira a fábrica', () => {
        [null, undefined, [], 'x', [null, 3]].forEach((entrada) => {
            const r = normalizarRegistro(entrada);
            assert.deepEqual(
                r.map((p) => p.nome),
                NOMES_PAPEIS_PESSOA_FABRICA,
            );
        });
    });

    it('apelido e descrição de fábrica são editáveis; nome e regras não', () => {
        const r = normalizarRegistro([
            {
                nome: 'Voz',
                apelido: 'Fal',
                descricao: 'minha',
                grupoExclusao: 'x',
                superficie: true,
            },
        ]);
        const voz = r.find((p) => p.nome === 'Voz');
        assert.equal(voz.apelido, 'Fal');
        assert.equal(voz.descricao, 'minha');
        assert.equal(voz.grupoExclusao, '');
        assert.equal(voz.superficie, false);
        assert.equal(voz.fabrica, true);
    });

    it('descrição antiga de Mencionado(a) e Aludido(a) migra; a editada fica', () => {
        const antigaM =
            'A pessoa é nomeada no texto, de passagem, sem ser objeto dele. O critério é o nome aparecer. Não convive com Aludido(a): se o nome aparece, aludir não acrescenta nada.';
        const antigaA =
            'O texto remete à pessoa sem nomeá-la (por pronome, imagem, epíteto ou circunstância), de modo que quem a conhece a reconhece. É o equivalente de Mencionado(a) quando o nome não aparece, ou foi ocultado. Não convive com Mencionado(a).';
        const r = normalizarRegistro([
            { nome: 'Mencionado(a)', descricao: antigaM },
            { nome: 'Aludido(a)', descricao: 'minha definição' },
        ]);
        const menc = r.find((p) => p.nome === 'Mencionado(a)');
        assert.notEqual(menc.descricao, antigaM);
        assert.match(menc.descricao, /parentesco/);
        assert.doesNotMatch(menc.descricao, /o nome aparecer/);
        assert.equal(r.find((p) => p.nome === 'Aludido(a)').descricao, 'minha definição');
        const alud = normalizarRegistro([{ nome: 'Aludido(a)', descricao: antigaA }]).find(
            (p) => p.nome === 'Aludido(a)',
        );
        assert.match(alud.descricao, /sem designá-la/);
    });

    it('papel usado nos textos e desconhecido entra como papel simples', () => {
        const r = normalizarRegistro([], ['Padrinho']);
        const p = r.find((x) => x.nome === 'Padrinho');
        assert.ok(p);
        assert.equal(p.fabrica, false);
        assert.equal(p.apelido, 'Padr');
    });

    it('apelido repetido é trocado por um sugerido e o primeiro fica com ele', () => {
        const r = normalizarRegistro([{ nome: 'Retrato falado', apelido: 'Retr' }]);
        assert.equal(r.find((p) => p.nome === 'Retratado(a)').apelido, 'Retr');
        assert.notEqual(r.find((p) => p.nome === 'Retrato falado').apelido, 'Retr');
    });

    it('nome repetido sem caixa nem acento conta uma vez', () => {
        const r = normalizarRegistro([{ nome: 'ALOCUTARIO(A)' }, { nome: 'Padrinho' }]);
        assert.equal(r.filter((p) => chavePapel(p.nome) === chavePapel('Alocutário(a)')).length, 1);
    });

    it('não altera o que recebe', () => {
        const entrada = [{ nome: 'Padrinho', apelido: '' }];
        const copia = JSON.stringify(entrada);
        normalizarRegistro(entrada, ['X']);
        assert.equal(JSON.stringify(entrada), copia);
    });

    it('migrarRegistroPapeisPessoa semeia, é idempotente e devolve se mudou', () => {
        const dbRef = {
            poemas: [{ pessoas: [{ pessoaId: 1, papeis: ['Padrinho', 'Voz'] }] }],
            prosas: [],
        };
        assert.equal(migrarRegistroPapeisPessoa(dbRef), true);
        assert.equal(dbRef.papeisPessoa.length, 10);
        assert.equal(migrarRegistroPapeisPessoa(dbRef), false);
    });

    it('apelidoSugerido estende quando o apelido já está em uso', () => {
        assert.equal(apelidoSugerido('Retratado(a)'), 'Retr');
        assert.equal(apelidoSugerido('Retratado(a)', new Set(['retr'])), 'Retra');
        assert.equal(apelidoSugerido('Ação'), 'Acao');
    });

    it('apelidoDisponivel ignora o próprio papel e compara sem caixa nem acento', () => {
        const registro = papeisPessoaDeFabrica();
        assert.equal(apelidoDisponivel('retr', 'Retratado(a)', registro), true);
        assert.equal(apelidoDisponivel('RETR', 'Voz', registro), false);
        assert.equal(apelidoDisponivel('  ', 'Voz', registro), false);
    });
});

describe('papéis nos módulos que consomem o registro', () => {
    it('vinculoForte: Relacionado(a) e vazio contam como fortes; só superfície é fraco', () => {
        assert.equal(vinculoForte('pessoa', []), true);
        assert.equal(vinculoForte('pessoa', ['Relacionado(a)']), true);
        assert.equal(vinculoForte('pessoa', ['Mencionado(a)']), false);
        assert.equal(vinculoForte('pessoa', ['Aludido(a)', 'Mencionado(a)']), false);
        assert.equal(vinculoForte('pessoa', ['Alocutário(a)']), true);
        assert.equal(vinculoForte('personagem', ['Menção']), false);
    });

    it('normalizarPapeis do painel em massa mantém a ordem recebida (é a relevância)', () => {
        assert.deepEqual(normalizarPapeis(['Relacionado(a)', 'Alocutário(a)', 'Voz']), [
            'Relacionado(a)',
            'Alocutário(a)',
            'Voz',
        ]);
    });

    it('painel em massa: o que já estava marcado vence o pedido que conflita', () => {
        const item = { pessoas: [{ pessoaId: 1, papeis: ['Mencionado(a)'] }] };
        const dbRef = { pessoas: [{ id: 1, nome: 'Dani' }], poemas: [item], prosas: [] };
        const plano = planejarAplicacao(
            dbRef,
            [item],
            [{ nome: 'Dani', papeis: ['Aludido(a)', 'Voz'] }],
        );
        assert.deepEqual(plano.linhas[0].completam[0].faltam, ['Voz']);
        aplicarPlanoPessoas(dbRef, plano);
        assert.deepEqual(item.pessoas[0].papeis, ['Mencionado(a)', 'Voz']);
    });

    it('painel em massa: Relacionado(a) pedido sobre um papel existente não entra', () => {
        const item = { pessoas: [{ pessoaId: 1, papeis: ['Retratado(a)'] }] };
        const dbRef = { pessoas: [{ id: 1, nome: 'Dani' }], poemas: [item], prosas: [] };
        const plano = planejarAplicacao(
            dbRef,
            [item],
            [{ nome: 'Dani', papeis: ['Relacionado(a)'] }],
        );
        assert.equal(plano.textos, 0);
        assert.equal(plano.linhas[0].jaTinham, 1);
    });

    it('importar: papel que conflita vai ao relatório e não entra', () => {
        const item = { pessoas: [{ pessoaId: 1, papeis: ['Retratado(a)', 'Mencionado(a)'] }] };
        const dbRef = { pessoas: [{ id: 1, nome: 'Dani' }] };
        const rel = {
            adicionados: { pessoas: [] },
            jaTinha: { pessoas: [] },
            papeisPessoa: [],
            problemas: [],
        };
        aplicarPessoas(dbRef, item, [{ nome: 'Dani', papeis: ['Aludido(a)', 'Voz'] }], rel);
        assert.deepEqual(item.pessoas[0].papeis, ['Retratado(a)', 'Mencionado(a)', 'Voz']);
        assert.equal(rel.problemas[0].motivo, 'papel-pessoa-conflito');
        assert.equal(rel.problemas[0].detalhe, 'Aludido(a)');
    });
});

describe('apelido sugerido: mínimo de 4 letras, terminando em consoante', () => {
    it('dá Insp, Menc, Alud, Aloc, Dedic, Assoc e Relac; Voz fica inteiro', () => {
        const esperado = {
            'Inspiração para': 'Insp',
            'Mencionado(a)': 'Menc',
            'Aludido(a)': 'Alud',
            'Alocutário(a)': 'Aloc',
            'Dedicatário(a)': 'Dedic',
            'Associado(a) retroativamente': 'Assoc',
            'Relacionado(a)': 'Relac',
            Voz: 'Voz',
        };
        Object.entries(esperado).forEach(([nome, apelido]) => {
            assert.equal(apelidoSugerido(nome), apelido, nome);
        });
    });

    it('migra o apelido de fábrica antigo (3 letras) e respeita o que a pessoa editou', () => {
        const r = normalizarRegistro([
            { nome: 'Aludido(a)', apelido: 'Alu' },
            { nome: 'Voz', apelido: 'Fala' },
        ]);
        assert.equal(r.find((p) => p.nome === 'Aludido(a)').apelido, 'Alud');
        assert.equal(r.find((p) => p.nome === 'Voz').apelido, 'Fala');
    });
});
