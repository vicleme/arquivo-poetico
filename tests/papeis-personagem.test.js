// Registro de papéis de Personagem (entrega 1): fábrica, apelidos, regra de
// exclusão Menção × Alusão, marca "sem centralidade" no lugar da lista fixa e
// leitura do registro vivo.
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    NOMES_PAPEIS_PERSONAGEM_FABRICA,
    apelidoDoPapelPersonagem,
    apelidoPersonagemDisponivel,
    conflitosDoPapelPersonagem,
    definirRegistroPapeisPersonagem,
    marcarPapelPersonagem,
    migrarRegistroPapeisPersonagem,
    nomesPapeisPersonagem,
    normalizarRegistroPersonagem,
    papeisPersonagemDeFabrica,
    papeisPersonagemSeExcluem,
    papelPersonagemSemCentralidade,
    resolverConflitosPersonagem,
    violacoesDeExclusaoPersonagem,
} from '../js/papeis-personagem.js';
import { chavePapel } from '../js/papeis-pessoa.js';
import {
    centralidadeAplicavel,
    normalizarCentralidadePersonagem,
    normalizarPapeisPersonagem,
    nomesPersonagensPorCentralidade,
} from '../js/personagens.js';
import { vinculoForte } from '../js/sugestao-ecos.js';

// Cada teste que troca o registro vivo volta para "sem registro" (= fábrica).
afterEach(() => definirRegistroPapeisPersonagem(null));

describe('registro de papéis de Personagem: fábrica', () => {
    it('tem os 5 papéis, na ordem de presença no texto', () => {
        assert.deepEqual(NOMES_PAPEIS_PERSONAGEM_FABRICA, [
            'Voz',
            'Interlocutor',
            'Aparição',
            'Menção',
            'Alusão',
        ]);
    });

    it('os apelidos de fábrica têm 3 a 5 letras, terminam em consoante e não colidem', () => {
        const apelidos = papeisPersonagemDeFabrica().map((p) => p.apelido);
        assert.deepEqual(apelidos, ['Voz', 'Inter', 'Apar', 'Menc', 'Alus']);
        assert.equal(new Set(apelidos.map(chavePapel)).size, apelidos.length);
        assert.ok(apelidos.every((a) => !'aeiou'.includes(a.slice(-1).toLowerCase())));
    });

    it('todo papel de fábrica tem descrição e vem marcado como de fábrica', () => {
        papeisPersonagemDeFabrica().forEach((p) => {
            assert.ok(p.descricao.length > 20, p.nome);
            assert.equal(p.fabrica, true);
        });
    });

    it('só Menção e Alusão são "sem centralidade"', () => {
        const marcados = papeisPersonagemDeFabrica()
            .filter((p) => p.semCentralidade)
            .map((p) => p.nome);
        assert.deepEqual(marcados, ['Menção', 'Alusão']);
    });

    it('papeisPersonagemDeFabrica devolve cópias: editar uma não suja a fábrica', () => {
        const a = papeisPersonagemDeFabrica();
        a[0].apelido = 'XXX';
        assert.equal(papeisPersonagemDeFabrica()[0].apelido, 'Voz');
        assert.equal(papeisPersonagemDeFabrica()[1].apelido, 'Inter');
    });
});

describe('exclusão Menção × Alusão', () => {
    it('só esses dois se excluem; Voz, Interlocutor e Aparição convivem com tudo', () => {
        assert.equal(papeisPersonagemSeExcluem('Menção', 'Alusão'), true);
        assert.equal(papeisPersonagemSeExcluem('Alusão', 'Menção'), true);
        const demais = ['Voz', 'Interlocutor', 'Aparição'];
        demais.forEach((a) => {
            ['Menção', 'Alusão', ...demais].forEach((b) => {
                assert.equal(papeisPersonagemSeExcluem(a, b), false, `${a} × ${b}`);
            });
        });
    });

    it('marcar Alusão sobre Menção troca um pelo outro e preserva o resto', () => {
        const r = marcarPapelPersonagem('Alusão', ['Aparição', 'Menção']);
        assert.deepEqual(r.papeis, ['Aparição', 'Alusão']);
        assert.deepEqual(r.removidos, ['Menção']);
    });

    it('conflitos, violações e resolução de uma lista que já viola a regra', () => {
        assert.deepEqual(conflitosDoPapelPersonagem('Menção', ['Voz', 'Alusão']), ['Alusão']);
        assert.deepEqual(violacoesDeExclusaoPersonagem(['Menção', 'Voz', 'Alusão']), [
            ['Menção', 'Alusão'],
        ]);
        // dado antigo: mantém o primeiro, sem alterar o que recebeu
        const entrada = ['Menção', 'Alusão', 'Voz'];
        const r = resolverConflitosPersonagem(entrada);
        assert.deepEqual(r.papeis, ['Menção', 'Voz']);
        assert.deepEqual(r.removidos, ['Alusão']);
        assert.deepEqual(entrada, ['Menção', 'Alusão', 'Voz']);
    });

    it('a leitura do dado antigo não apaga papéis em conflito', () => {
        assert.deepEqual(normalizarPapeisPersonagem(['Alusão', 'Menção']), ['Menção', 'Alusão']);
    });
});

describe('normalizarRegistroPersonagem e migração', () => {
    it('registro vazio, nulo ou torto vira a fábrica', () => {
        [undefined, null, [], 'x', [null, 3, {}]].forEach((entrada) => {
            assert.deepEqual(
                normalizarRegistroPersonagem(entrada).map((p) => p.nome),
                NOMES_PAPEIS_PERSONAGEM_FABRICA,
            );
        });
    });

    it('descrição antiga de Menção e Alusão migra; a editada fica', () => {
        const antigaM =
            'O Personagem é nomeado no texto, de passagem ou no título, sem estar em cena. O critério é o nome aparecer. Não convive com Alusão: se o nome aparece, aludir não acrescenta nada. A Centralidade não se aplica.';
        const antigaA =
            'O Personagem é evocado sem ser nomeado (por epíteto, imagem ou circunstância), de modo que quem o conhece o reconhece. É o equivalente de Menção quando o nome não aparece. Não convive com Menção. A Centralidade não se aplica.';
        const r = normalizarRegistroPersonagem([
            { nome: 'Menção', descricao: antigaM },
            { nome: 'Alusão', descricao: antigaA },
        ]);
        assert.match(r.find((p) => p.nome === 'Menção').descricao, /designado/);
        assert.match(r.find((p) => p.nome === 'Alusão').descricao, /sem ser designado/);
        const editada = normalizarRegistroPersonagem([{ nome: 'Menção', descricao: 'minha' }]);
        assert.equal(editada.find((p) => p.nome === 'Menção').descricao, 'minha');
    });

    it('apelido e descrição editados nos de fábrica se mantêm; nome e regras voltam à fábrica', () => {
        const r = normalizarRegistroPersonagem([
            {
                nome: 'Menção',
                apelido: 'Cita',
                descricao: 'Minha definição',
                grupoExclusao: 'outro',
                exclusivoComTodos: true,
                semCentralidade: false,
            },
        ]);
        const mencao = r.find((p) => p.nome === 'Menção');
        assert.equal(mencao.apelido, 'Cita');
        assert.equal(mencao.descricao, 'Minha definição');
        assert.equal(mencao.grupoExclusao, 'nome-no-texto');
        assert.equal(mencao.exclusivoComTodos, false);
        assert.equal(mencao.semCentralidade, true);
        assert.equal(mencao.fabrica, true);
    });

    it('papel acrescentado vem depois dos de fábrica, sem regras e sem ser de fábrica', () => {
        const r = normalizarRegistroPersonagem([{ nome: 'Confidente', descricao: ' x ' }]);
        const novo = r[r.length - 1];
        assert.equal(novo.nome, 'Confidente');
        assert.equal(novo.apelido, 'Conf');
        assert.equal(novo.descricao, 'x');
        assert.equal(novo.fabrica, false);
        assert.equal(novo.grupoExclusao, '');
        assert.equal(novo.semCentralidade, false);
    });

    it('nome repetido (sem caixa nem acento) conta uma vez e apelido repetido é trocado', () => {
        const r = normalizarRegistroPersonagem([
            { nome: 'APARICAO', apelido: 'zzz' },
            { nome: 'Novo A', apelido: 'Voz' },
            { nome: 'Novo A' },
        ]);
        assert.equal(r.filter((p) => chavePapel(p.nome) === 'aparicao').length, 1);
        assert.equal(r.filter((p) => p.nome === 'Novo A').length, 1);
        const apelidos = r.map((p) => chavePapel(p.apelido));
        assert.equal(new Set(apelidos).size, apelidos.length);
    });

    it('não altera o que recebe', () => {
        const entrada = [{ nome: 'Confidente', apelido: 'Conf' }];
        const copia = JSON.parse(JSON.stringify(entrada));
        normalizarRegistroPersonagem(entrada);
        assert.deepEqual(entrada, copia);
    });

    it('migrarRegistroPapeisPersonagem semeia o backup antigo e é seguro de repetir', () => {
        const dbRef = { poemas: [], prosas: [] };
        assert.equal(migrarRegistroPapeisPersonagem(dbRef), true);
        assert.deepEqual(
            dbRef.papeisPersonagem.map((p) => p.nome),
            NOMES_PAPEIS_PERSONAGEM_FABRICA,
        );
        assert.equal(migrarRegistroPapeisPersonagem(dbRef), false);
    });

    it('não semeia valores soltos dos textos (sempre foram descartados na leitura)', () => {
        const dbRef = {
            poemas: [{ personagens: [{ personagemId: 1, papeis: ['Inventado'] }] }],
            prosas: [],
        };
        migrarRegistroPapeisPersonagem(dbRef);
        assert.ok(!dbRef.papeisPersonagem.some((p) => p.nome === 'Inventado'));
    });
});

describe('registro vivo', () => {
    it('sem registro vale a fábrica; com registro vale o dele', () => {
        assert.deepEqual(nomesPapeisPersonagem(), NOMES_PAPEIS_PERSONAGEM_FABRICA);
        definirRegistroPapeisPersonagem(() =>
            normalizarRegistroPersonagem([{ nome: 'Confidente' }]),
        );
        assert.equal(nomesPapeisPersonagem().at(-1), 'Confidente');
        definirRegistroPapeisPersonagem(() => []);
        assert.deepEqual(nomesPapeisPersonagem(), NOMES_PAPEIS_PERSONAGEM_FABRICA);
    });

    it('apelido do papel vem do registro; papel desconhecido usa o sugerido', () => {
        definirRegistroPapeisPersonagem(() =>
            normalizarRegistroPersonagem([{ nome: 'Voz', apelido: 'Falante' }]),
        );
        assert.equal(apelidoDoPapelPersonagem('Voz'), 'Falante');
        assert.equal(apelidoDoPapelPersonagem('Desconhecido'), 'Desc');
    });

    it('apelidoPersonagemDisponivel é único no registro, ignorando caixa e acento', () => {
        const registro = papeisPersonagemDeFabrica();
        assert.equal(apelidoPersonagemDisponivel('menc', 'Alusão', registro), false);
        assert.equal(apelidoPersonagemDisponivel('Menc', 'Menção', registro), true);
        assert.equal(apelidoPersonagemDisponivel('  ', 'Menção', registro), false);
    });
});

describe('Centralidade e Ecos leem a marca do registro', () => {
    it('a regra de fábrica continua valendo: só Menção/Alusão = não se aplica', () => {
        assert.equal(centralidadeAplicavel([]), true);
        assert.equal(centralidadeAplicavel(['Voz']), true);
        assert.equal(centralidadeAplicavel(['Menção']), false);
        assert.equal(centralidadeAplicavel(['Alusão']), false);
        assert.equal(centralidadeAplicavel(['Menção', 'Aparição']), true);
        assert.equal(normalizarCentralidadePersonagem('protagonista', ['Menção']), '');
        assert.equal(
            normalizarCentralidadePersonagem('protagonista', ['Aparição']),
            'protagonista',
        );
    });

    it('um papel acrescentado com a marca passa a valer sem mexer em código', () => {
        definirRegistroPapeisPersonagem(() =>
            normalizarRegistroPersonagem([{ nome: 'Rumor', semCentralidade: true }]),
        );
        assert.equal(papelPersonagemSemCentralidade('Rumor'), true);
        assert.equal(centralidadeAplicavel(['Rumor']), false);
        assert.equal(centralidadeAplicavel(['Rumor', 'Voz']), true);
        assert.equal(vinculoForte('personagem', ['Rumor']), false);
        assert.equal(vinculoForte('personagem', ['Rumor', 'Voz']), true);
    });

    it('papel acrescentado sem a marca conta como presença efetiva', () => {
        definirRegistroPapeisPersonagem(() =>
            normalizarRegistroPersonagem([{ nome: 'Confidente' }]),
        );
        assert.equal(centralidadeAplicavel(['Confidente']), true);
        assert.equal(vinculoForte('personagem', ['Confidente']), true);
    });

    it('a ordem dos papéis no vínculo é a do registro, não a da marcação', () => {
        assert.deepEqual(normalizarPapeisPersonagem(['Alusão', 'Voz', 'Aparição']), [
            'Voz',
            'Aparição',
            'Alusão',
        ]);
        definirRegistroPapeisPersonagem(() =>
            normalizarRegistroPersonagem([{ nome: 'Confidente' }]),
        );
        assert.deepEqual(normalizarPapeisPersonagem(['Confidente', 'Voz']), ['Voz', 'Confidente']);
        // papel que o registro não conhece é descartado, como sempre foi
        assert.deepEqual(normalizarPapeisPersonagem(['Voz', 'Inventado']), ['Voz']);
    });

    it('nomesPersonagensPorCentralidade segue a regra do registro', () => {
        const cadastro = [{ id: 1, nome: 'Capitu' }];
        const item = { personagens: [{ personagemId: 1, papeis: ['Menção'], centralidade: '' }] };
        assert.deepEqual(nomesPersonagensPorCentralidade(item, cadastro, ''), []);
    });
});
