import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    listarLinhasRevisao,
    filtrarLinhasRevisao,
    sugestoesDaRevisao,
    planejarRevisao,
    aplicarRevisao,
    descreverRevisao,
    MENSAGENS_ERRO_REVISAO,
    VALORES_REVISAO,
    valorAplica,
} from '../js/revisao-fora-do-acervo.js';

// Modo revisão da seção "Fora do acervo": lógica pura, uma linha por entrada.

let poemas;
let prosas;
const dados = () => ({ poemas, prosas });

beforeEach(() => {
    poemas = [
        {
            id: 2,
            titulo: 'Casmurro',
            texto: 'não mexer',
            intertextualidade: [
                {
                    relacao: 'Alusão',
                    tipoObra: 'Música',
                    obra: 'Águas de Março, de Tom Jobim',
                    autor: '',
                    descricao: 'Canção de 1972',
                },
                {
                    relacao: 'Citação',
                    tipoObra: 'Livro',
                    obra: 'Sagarana',
                    autor: 'Guimarães Rosa',
                },
            ],
            hipertextualidade: [
                {
                    relacao: 'Paródia',
                    tipoObra: 'Livro',
                    hipotexto: 'Dom Casmurro (Machado)',
                    autor: '',
                },
            ],
        },
        {
            id: 1,
            titulo: 'Águas',
            intertextualidade: [{ relacao: 'Menção', obra: '', autor: 'Ninguém' }],
        },
    ];
    prosas = [
        {
            id: 7,
            titulo: 'Conto',
            intertextualidade: [{ relacao: 'Citação', tipoObra: 'Música', obra: 'Aquarela' }],
        },
    ];
});

describe('listarLinhasRevisao', () => {
    it('devolve uma linha por entrada, com chave estável e valores aparados', () => {
        const linhas = listarLinhasRevisao(dados());
        assert.equal(linhas.length, 5);
        const hiper = linhas.find((l) => l.campo === 'hipertextualidade');
        assert.equal(hiper.chave, 'poema:2:hipertextualidade:0');
        assert.equal(hiper.valores.nome, 'Dom Casmurro (Machado)');
        assert.equal(hiper.rotuloCampo, 'Hipertextualidade');
        assert.equal(hiper.titulo, 'Casmurro');
    });

    it('ordena por título, depois campo e posição', () => {
        const chaves = listarLinhasRevisao(dados()).map((l) => l.chave);
        assert.deepEqual(chaves, [
            'poema:1:intertextualidade:0',
            'poema:2:intertextualidade:0',
            'poema:2:intertextualidade:1',
            'poema:2:hipertextualidade:0',
            'prosa:7:intertextualidade:0',
        ]);
    });

    it('entrada sem nome também entra, e o que não é objeto é ignorado', () => {
        poemas[0].intertextualidade.push('lixo', null);
        poemas.push(null, 'x');
        const linhas = listarLinhasRevisao(dados());
        assert.equal(linhas.length, 5);
        assert.equal(
            linhas.find((l) => l.chave === 'poema:1:intertextualidade:0').valores.nome,
            '',
        );
    });

    it('entrada vazia ou ausente não quebra', () => {
        assert.deepEqual(listarLinhasRevisao(), []);
        assert.deepEqual(listarLinhasRevisao({ poemas: null, prosas: undefined }), []);
    });

    it('não mexe nos dados', () => {
        const antes = JSON.stringify(dados());
        listarLinhasRevisao(dados());
        assert.equal(JSON.stringify(dados()), antes);
    });
});

describe('filtrarLinhasRevisao', () => {
    it('consulta vazia devolve tudo', () => {
        const linhas = listarLinhasRevisao(dados());
        assert.deepEqual(filtrarLinhasRevisao(linhas, ''), linhas);
    });

    it('acha o que ficou com ", de" ou parênteses no nome, sem acento nem caixa', () => {
        const linhas = listarLinhasRevisao(dados());
        const achadas = filtrarLinhasRevisao(linhas, 'AGUAS de marco');
        assert.deepEqual(
            achadas.map((l) => l.chave),
            ['poema:2:intertextualidade:0'],
        );
    });

    it('acha pelo título do texto, pelo autor e pela descrição', () => {
        const linhas = listarLinhasRevisao(dados());
        assert.equal(filtrarLinhasRevisao(linhas, 'conto').length, 1);
        assert.equal(filtrarLinhasRevisao(linhas, 'rosa').length, 1);
        assert.equal(filtrarLinhasRevisao(linhas, '1972').length, 1);
    });

    it('todas as palavras precisam aparecer', () => {
        const linhas = listarLinhasRevisao(dados());
        assert.equal(filtrarLinhasRevisao(linhas, 'sagarana rosa').length, 1);
        assert.equal(filtrarLinhasRevisao(linhas, 'sagarana jobim').length, 0);
    });

    it('limita a Intertextualidade ou a Hipertextualidade', () => {
        const linhas = listarLinhasRevisao(dados());
        assert.equal(filtrarLinhasRevisao(linhas, '', { campo: 'hipertextualidade' }).length, 1);
        assert.equal(filtrarLinhasRevisao(linhas, '', { campo: 'intertextualidade' }).length, 4);
    });

    it('"faltando" deixa só as linhas com aquele valor vazio', () => {
        const linhas = listarLinhasRevisao(dados());
        const semAutor = filtrarLinhasRevisao(linhas, '', { faltando: 'autor' });
        assert.deepEqual(
            semAutor.map((l) => l.chave),
            [
                'poema:2:intertextualidade:0',
                'poema:2:hipertextualidade:0',
                'prosa:7:intertextualidade:0',
            ],
        );
        const semNome = filtrarLinhasRevisao(linhas, '', { faltando: 'nome' });
        assert.deepEqual(
            semNome.map((l) => l.chave),
            ['poema:1:intertextualidade:0'],
        );
        assert.equal(filtrarLinhasRevisao(linhas, '', { faltando: 'qualquer' }).length, 5);
    });

    it('combina consulta, campo e faltando', () => {
        const linhas = listarLinhasRevisao(dados());
        const achadas = filtrarLinhasRevisao(linhas, 'casmurro', {
            campo: 'intertextualidade',
            faltando: 'autor',
        });
        assert.deepEqual(
            achadas.map((l) => l.chave),
            ['poema:2:intertextualidade:0'],
        );
    });
});

describe('sugestoesDaRevisao', () => {
    it('junta a lista de fábrica com o que já foi usado, sem repetir', () => {
        const s = sugestoesDaRevisao(listarLinhasRevisao(dados()));
        assert.ok(s.relacaoIntertextualidade.includes('Citação'));
        assert.equal(s.relacaoIntertextualidade.filter((r) => r === 'Citação').length, 1);
        assert.ok(s.relacaoHipertextualidade.includes('Paródia'));
        assert.ok(!s.relacaoHipertextualidade.includes('Citação'));
        assert.ok(s.tipoObra.includes('Música'));
        assert.ok(s.autor.includes('Guimarães Rosa'));
        assert.ok(!s.autor.includes(''));
        assert.ok(s.nome.includes('Sagarana'));
    });
});

describe('planejarRevisao e aplicarRevisao', () => {
    it('sem edição, recusa', () => {
        assert.equal(planejarRevisao(dados(), []).erro, 'sem-edicao');
        assert.equal(planejarRevisao(dados()).erro, 'sem-edicao');
        assert.equal(
            planejarRevisao(dados(), [{ chave: 1 }, null, { chave: 'x' }]).erro,
            'sem-edicao',
        );
        assert.ok(MENSAGENS_ERRO_REVISAO['sem-edicao']);
    });

    it('divide o ", de Fulano" da obra em nome e autor, só nessa entrada', () => {
        const plano = planejarRevisao(dados(), [
            {
                chave: 'poema:2:intertextualidade:0',
                valores: { nome: 'Águas de Março', autor: 'Tom Jobim' },
            },
        ]);
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 1);
        assert.equal(plano.textos, 1);
        assert.deepEqual(plano.camposAlterados, { nome: 1, autor: 1 });
        const feito = aplicarRevisao(plano);
        const e = poemas[0].intertextualidade[0];
        assert.equal(e.obra, 'Águas de Março');
        assert.equal(e.autor, 'Tom Jobim');
        assert.equal(e.descricao, 'Canção de 1972');
        assert.equal(poemas[0].intertextualidade[1].obra, 'Sagarana');
        assert.equal(poemas[0].texto, 'não mexer');
        assert.equal(feito.entradas, 1);
    });

    it('o nome da Hipertextualidade é o hipotexto', () => {
        const plano = planejarRevisao(dados(), [
            {
                chave: 'poema:2:hipertextualidade:0',
                valores: { nome: 'Dom Casmurro', autor: 'Machado de Assis' },
            },
        ]);
        aplicarRevisao(plano);
        const h = poemas[0].hipertextualidade[0];
        assert.equal(h.hipotexto, 'Dom Casmurro');
        assert.equal(h.autor, 'Machado de Assis');
        assert.equal('obra' in h, false);
    });

    it('só entram no plano os valores que de fato mudam', () => {
        const plano = planejarRevisao(dados(), [
            {
                chave: 'poema:2:intertextualidade:1',
                valores: {
                    relacao: 'Citação',
                    nome: '  Sagarana ',
                    autor: 'Guimarães Rosa',
                    tipoObra: 'Conto',
                },
            },
        ]);
        assert.equal(plano.entradas, 1);
        assert.deepEqual(plano.alteracoes[0].mudados, ['tipoObra']);
        assert.deepEqual(plano.camposAlterados, { tipoObra: 1 });
    });

    it('nada mudou: plano vazio sem erro', () => {
        const plano = planejarRevisao(dados(), [
            { chave: 'poema:2:intertextualidade:1', valores: { nome: 'Sagarana' } },
        ]);
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 0);
        assert.equal(aplicarRevisao(plano).entradas, 0);
    });

    it('edita várias linhas e conta os textos distintos', () => {
        const plano = planejarRevisao(dados(), [
            { chave: 'poema:2:intertextualidade:0', valores: { autor: 'Tom Jobim' } },
            { chave: 'poema:2:intertextualidade:1', valores: { descricao: 'Livro de contos' } },
            { chave: 'prosa:7:intertextualidade:0', valores: { autor: 'Toquinho' } },
        ]);
        assert.equal(plano.entradas, 3);
        assert.equal(plano.textos, 2);
    });

    it('duas edições da mesma linha se juntam, e a última vence', () => {
        const plano = planejarRevisao(dados(), [
            { chave: 'prosa:7:intertextualidade:0', valores: { autor: 'Vinicius' } },
            {
                chave: 'prosa:7:intertextualidade:0',
                valores: { autor: 'Toquinho', tipoObra: 'Canção' },
            },
        ]);
        assert.equal(plano.entradas, 1);
        aplicarRevisao(plano);
        assert.equal(prosas[0].intertextualidade[0].autor, 'Toquinho');
        assert.equal(prosas[0].intertextualidade[0].tipoObra, 'Canção');
    });

    it('apagar o nome de uma obra que tinha nome é recusado, e nada é gravado', () => {
        const plano = planejarRevisao(dados(), [
            { chave: 'poema:2:intertextualidade:0', valores: { autor: 'Tom Jobim' } },
            { chave: 'poema:2:intertextualidade:1', valores: { nome: '   ' } },
        ]);
        assert.equal(plano.erro, 'nome-vazio');
        assert.equal(plano.linhaComErro, 'poema:2:intertextualidade:1');
        assert.equal(plano.entradas, 0);
        aplicarRevisao(plano);
        assert.equal(poemas[0].intertextualidade[1].obra, 'Sagarana');
        assert.equal(poemas[0].intertextualidade[0].autor, '');
        assert.ok(MENSAGENS_ERRO_REVISAO['nome-vazio']);
    });

    it('deixar vazio o que já estava vazio não é erro nem mudança', () => {
        const plano = planejarRevisao(dados(), [
            { chave: 'poema:1:intertextualidade:0', valores: { nome: '' } },
        ]);
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 0);
    });

    it('dá para preencher o nome de uma entrada que estava sem', () => {
        const plano = planejarRevisao(dados(), [
            { chave: 'poema:1:intertextualidade:0', valores: { nome: 'Esperando Godot' } },
        ]);
        aplicarRevisao(plano);
        assert.equal(poemas[1].intertextualidade[0].obra, 'Esperando Godot');
    });

    it('linha que sumiu conta em naoEncontradas e não derruba as outras', () => {
        const plano = planejarRevisao(dados(), [
            { chave: 'poema:99:intertextualidade:0', valores: { autor: 'X' } },
            { chave: 'prosa:7:intertextualidade:0', valores: { autor: 'Toquinho' } },
        ]);
        assert.equal(plano.naoEncontradas, 1);
        assert.equal(plano.entradas, 1);
    });

    it('Desfazer devolve os valores e tira a chave de quem não a tinha', () => {
        const antes = JSON.stringify(dados());
        const plano = planejarRevisao(dados(), [
            {
                chave: 'prosa:7:intertextualidade:0',
                valores: { autor: 'Toquinho', descricao: 'Canção, 1983' },
            },
            { chave: 'poema:2:intertextualidade:0', valores: { descricao: 'Bossa nova' } },
        ]);
        const feito = aplicarRevisao(plano);
        assert.equal(prosas[0].intertextualidade[0].descricao, 'Canção, 1983');
        assert.equal(poemas[0].intertextualidade[0].descricao, 'Bossa nova');
        feito.desfazer();
        assert.equal(JSON.stringify(dados()), antes);
        assert.equal('autor' in prosas[0].intertextualidade[0], false);
        feito.desfazer();
        assert.equal(JSON.stringify(dados()), antes);
    });

    it('não toca nos campos que a revisão não edita', () => {
        poemas[0].intertextualidade[0].trecho = 'verso solto';
        poemas[0].intertextualidade[0].traduzido = true;
        aplicarRevisao(
            planejarRevisao(dados(), [
                { chave: 'poema:2:intertextualidade:0', valores: { autor: 'Tom Jobim' } },
            ]),
        );
        assert.equal(poemas[0].intertextualidade[0].trecho, 'verso solto');
        assert.equal(poemas[0].intertextualidade[0].traduzido, true);
    });

    it('valores que não são texto são ignorados', () => {
        const plano = planejarRevisao(dados(), [
            { chave: 'prosa:7:intertextualidade:0', valores: { autor: 42, nome: null } },
        ]);
        assert.equal(plano.entradas, 0);
    });
});

describe('descreverRevisao', () => {
    it('mostra título, campo e antes → depois, e conta o que ficou de fora', () => {
        const plano = planejarRevisao(dados(), [
            {
                chave: 'poema:2:intertextualidade:0',
                valores: { nome: 'Águas de Março', autor: 'Tom Jobim' },
            },
            { chave: 'poema:2:intertextualidade:1', valores: { autor: 'Rosa' } },
            { chave: 'prosa:7:intertextualidade:0', valores: { autor: 'Toquinho' } },
            { chave: 'poema:1:intertextualidade:0', valores: { autor: 'Outro' } },
        ]);
        const { linhas, restantes } = descreverRevisao(plano, { maxExemplos: 2 });
        assert.equal(linhas.length, 2);
        assert.equal(restantes, 2);
        assert.match(linhas[0], /Casmurro \(Intertextualidade\)/);
        assert.match(linhas[0], /obra: «Águas de Março, de Tom Jobim» → «Águas de Março»/);
        assert.match(linhas[0], /autor: \(vazio\) → «Tom Jobim»/);
    });

    it('plano nulo não quebra', () => {
        assert.deepEqual(descreverRevisao(null), { linhas: [], restantes: 0 });
    });
});

describe('lista de valores', () => {
    it('as colunas editáveis são os dezesseis valores da entrada, na ordem da tabela', () => {
        assert.deepEqual(VALORES_REVISAO, [
            'relacao',
            'nome',
            'autor',
            'origem',
            'tipoObra',
            'descricao',
            'dataObra',
            'dataObraAte',
            'obraPessoal',
            'personagem',
            'trecho',
            'traduzido',
            'link',
            'linkTexto',
            'dataAcesso',
            'nota',
        ]);
    });

    it('personagem, trecho e traduzido só valem na Intertextualidade', () => {
        assert.equal(valorAplica('intertextualidade', 'trecho'), true);
        assert.equal(valorAplica('hipertextualidade', 'trecho'), false);
        assert.equal(valorAplica('hipertextualidade', 'personagem'), false);
        assert.equal(valorAplica('hipertextualidade', 'traduzido'), false);
        assert.equal(valorAplica('hipertextualidade', 'nota'), true);
    });
});

describe('colunas extras (personagem, trecho, traduzido, link, data de acesso, nota)', () => {
    const chaveInter = 'poema:2:intertextualidade:1';
    const chaveHiper = 'poema:2:hipertextualidade:0';

    it('as linhas trazem os valores extras, com a data só quando há link', () => {
        poemas[0].intertextualidade[1] = {
            ...poemas[0].intertextualidade[1],
            personagem: ' Riobaldo ',
            trecho: 'Nonada.',
            traduzido: true,
            link: 'https://exemplo.org',
            linkTexto: 'página',
            dataAcesso: '2026-10-01',
            nota: ' vale conferir ',
        };
        poemas[0].intertextualidade[0].dataAcesso = '2026-10-01';
        const linhas = listarLinhasRevisao(dados());
        const cheia = linhas.find((l) => l.chave === chaveInter);
        assert.equal(cheia.valores.personagem, 'Riobaldo');
        assert.equal(cheia.valores.traduzido, true);
        assert.equal(cheia.valores.dataAcesso, '2026-10-01');
        assert.equal(cheia.valores.nota, 'vale conferir');
        const semLink = linhas.find((l) => l.chave === 'poema:2:intertextualidade:0');
        assert.equal(semLink.valores.dataAcesso, '');
        assert.equal(semLink.valores.traduzido, false);
    });

    it('a busca também acha pelas colunas extras, mesmo escondidas na tela', () => {
        poemas[0].intertextualidade[1].trecho = 'Nonada.';
        poemas[0].intertextualidade[1].nota = 'conferir edição';
        poemas[0].intertextualidade[1].link = 'https://exemplo.org/sagarana';
        poemas[0].intertextualidade[1].dataAcesso = '2026-10-01';
        const linhas = listarLinhasRevisao(dados());
        assert.equal(filtrarLinhasRevisao(linhas, 'nonada').length, 1);
        assert.equal(filtrarLinhasRevisao(linhas, 'edicao').length, 1);
        assert.equal(filtrarLinhasRevisao(linhas, 'exemplo.org').length, 1);
        assert.equal(filtrarLinhasRevisao(linhas, '01/10/2026').length, 1);
    });

    it('"faltando" ignora as linhas onde o valor não existe', () => {
        const linhas = listarLinhasRevisao(dados());
        const semPersonagem = filtrarLinhasRevisao(linhas, '', { faltando: 'personagem' });
        assert.equal(semPersonagem.length, 4);
        assert.ok(semPersonagem.every((l) => l.campo === 'intertextualidade'));
        const semNota = filtrarLinhasRevisao(linhas, '', { faltando: 'nota' });
        assert.equal(semNota.length, 5);
        const semTraduzido = filtrarLinhasRevisao(linhas, '', { faltando: 'traduzido' });
        assert.equal(semTraduzido.length, 4);
    });

    it('grava personagem, trecho, traduzido e nota, sem tocar no resto', () => {
        const plano = planejarRevisao(dados(), [
            {
                chave: chaveInter,
                valores: { personagem: 'Riobaldo', trecho: 'Nonada.', traduzido: true, nota: 'ok' },
            },
        ]);
        assert.equal(plano.erro, '');
        assert.deepEqual(plano.alteracoes[0].mudados, [
            'personagem',
            'trecho',
            'traduzido',
            'nota',
        ]);
        aplicarRevisao(plano);
        const entrada = poemas[0].intertextualidade[1];
        assert.deepEqual(entrada.personagens, ['Riobaldo']);
        assert.equal('personagem' in entrada, false);
        assert.equal(entrada.trecho, 'Nonada.');
        assert.equal(entrada.traduzido, true);
        assert.equal(entrada.nota, 'ok');
        assert.equal(entrada.obra, 'Sagarana');
        assert.equal(entrada.autor, 'Guimarães Rosa');
    });

    it('personagem em lista: lê os dois formatos, grava a lista e o Desfazer devolve o formato antigo', () => {
        poemas[0].intertextualidade[1].personagem = 'Diadorim';
        let linha = listarLinhasRevisao(dados()).find((l) => l.chave === chaveInter);
        assert.deepEqual(linha.valores.personagens, ['Diadorim']);
        assert.equal(linha.valores.personagem, 'Diadorim');

        const plano = planejarRevisao(dados(), [
            { chave: chaveInter, valores: { personagens: ['Riobaldo', 'Diadorim', 'riobaldo'] } },
        ]);
        assert.deepEqual(plano.alteracoes[0].mudados, ['personagem']);
        const { desfazer } = aplicarRevisao(plano);
        const entrada = poemas[0].intertextualidade[1];
        assert.deepEqual(entrada.personagens, ['Riobaldo', 'Diadorim']);
        assert.equal('personagem' in entrada, false);
        linha = listarLinhasRevisao(dados()).find((l) => l.chave === chaveInter);
        assert.equal(linha.valores.personagem, 'Riobaldo e Diadorim');

        desfazer();
        assert.equal(entrada.personagem, 'Diadorim');
        assert.equal('personagens' in entrada, false);
    });

    it('personagem: mesma lista não é alteração; mudar só a ordem é', () => {
        poemas[0].intertextualidade[1].personagens = ['Prometeu', 'Zeus'];
        const igual = planejarRevisao(dados(), [
            { chave: chaveInter, valores: { personagens: ['Prometeu', 'Zeus'] } },
        ]);
        assert.equal(igual.entradas, 0);
        const ordem = planejarRevisao(dados(), [
            { chave: chaveInter, valores: { personagens: ['Zeus', 'Prometeu'] } },
        ]);
        assert.equal(ordem.entradas, 1);
    });

    it('a busca acha cada tag de personagem e "faltando" vê a lista vazia', () => {
        poemas[0].intertextualidade[1].personagens = ['Prometeu', 'Zeus'];
        const linhas = listarLinhasRevisao(dados());
        assert.equal(filtrarLinhasRevisao(linhas, 'zeus').length, 1);
        const sem = filtrarLinhasRevisao(linhas, '', { faltando: 'personagem' });
        assert.equal(sem.length, 3);
    });

    it('na Hipertextualidade, personagem, trecho e traduzido são ignorados', () => {
        const plano = planejarRevisao(dados(), [
            {
                chave: chaveHiper,
                valores: { personagem: 'X', trecho: 'Y', traduzido: true, nota: 'só a nota' },
            },
        ]);
        assert.deepEqual(plano.alteracoes[0].mudados, ['nota']);
        aplicarRevisao(plano);
        const entrada = poemas[0].hipertextualidade[0];
        assert.equal(entrada.nota, 'só a nota');
        assert.equal('personagem' in entrada, false);
        assert.equal('trecho' in entrada, false);
        assert.equal('traduzido' in entrada, false);
    });

    it('só personagem na Hipertextualidade não vira alteração', () => {
        const plano = planejarRevisao(dados(), [
            { chave: chaveHiper, valores: { personagem: 'X' } },
        ]);
        assert.equal(plano.entradas, 0);
        assert.equal(plano.erro, '');
    });

    it('traduzido só aceita booleano', () => {
        const plano = planejarRevisao(dados(), [
            { chave: chaveInter, valores: { traduzido: 'sim' } },
        ]);
        assert.equal(plano.entradas, 0);
    });

    it('link novo numa linha sem data recebe a data de hoje', () => {
        const plano = planejarRevisao(
            dados(),
            [{ chave: chaveInter, valores: { link: 'https://exemplo.org' } }],
            { hoje: '2026-10-25' },
        );
        assert.deepEqual(plano.alteracoes[0].mudados, ['link', 'dataAcesso']);
        aplicarRevisao(plano);
        assert.equal(poemas[0].intertextualidade[1].link, 'https://exemplo.org');
        assert.equal(poemas[0].intertextualidade[1].dataAcesso, '2026-10-25');
    });

    it('link trocado numa linha que já tinha data mantém a data', () => {
        poemas[0].intertextualidade[1].link = 'https://velho.org';
        poemas[0].intertextualidade[1].dataAcesso = '2026-01-02';
        const plano = planejarRevisao(
            dados(),
            [{ chave: chaveInter, valores: { link: 'https://novo.org' } }],
            { hoje: '2026-10-25' },
        );
        assert.deepEqual(plano.alteracoes[0].mudados, ['link']);
    });

    it('a data do próprio pedido vence a de hoje', () => {
        const plano = planejarRevisao(
            dados(),
            [
                {
                    chave: chaveInter,
                    valores: { link: 'https://exemplo.org', dataAcesso: '2026-03-04' },
                },
            ],
            { hoje: '2026-10-25' },
        );
        aplicarRevisao(plano);
        assert.equal(poemas[0].intertextualidade[1].dataAcesso, '2026-03-04');
    });

    it('apagar o link apaga a data, e o campo some da entrada', () => {
        poemas[0].intertextualidade[1].link = 'https://exemplo.org';
        poemas[0].intertextualidade[1].dataAcesso = '2026-01-02';
        const plano = planejarRevisao(dados(), [{ chave: chaveInter, valores: { link: '' } }]);
        assert.deepEqual(plano.alteracoes[0].mudados, ['link', 'dataAcesso']);
        const resultado = aplicarRevisao(plano);
        assert.equal(poemas[0].intertextualidade[1].link, '');
        assert.equal('dataAcesso' in poemas[0].intertextualidade[1], false);
        resultado.desfazer();
        assert.equal(poemas[0].intertextualidade[1].link, 'https://exemplo.org');
        assert.equal(poemas[0].intertextualidade[1].dataAcesso, '2026-01-02');
    });

    it('data sem link no pedido não é gravada', () => {
        const plano = planejarRevisao(dados(), [
            { chave: chaveInter, valores: { dataAcesso: '2026-03-04' } },
        ]);
        assert.equal(plano.entradas, 0);
    });

    it('data que não é ISO completa é recusada, dizendo a linha', () => {
        const plano = planejarRevisao(dados(), [
            { chave: chaveInter, valores: { link: 'https://a.org', dataAcesso: '2026-03' } },
        ]);
        assert.equal(plano.erro, 'data-invalida');
        assert.equal(plano.linhaComErro, chaveInter);
        assert.ok(MENSAGENS_ERRO_REVISAO['data-invalida']);
        assert.equal(poemas[0].intertextualidade[1].link, undefined);
    });

    it('o Desfazer tira as chaves que a entrada não tinha e devolve o valor cru', () => {
        poemas[0].intertextualidade[1].nota = '  antiga  ';
        const resultado = aplicarRevisao(
            planejarRevisao(dados(), [
                {
                    chave: chaveInter,
                    valores: { nota: 'nova', trecho: 'Nonada.', link: 'https://a.org' },
                },
            ]),
        );
        const entrada = poemas[0].intertextualidade[1];
        assert.equal(entrada.nota, 'nova');
        resultado.desfazer();
        assert.equal(entrada.nota, '  antiga  ');
        assert.equal('trecho' in entrada, false);
        assert.equal('link' in entrada, false);
        assert.equal('dataAcesso' in entrada, false);
    });

    it('a confirmação mostra sim/não, data em dd/mm/aaaa e corta trecho longo', () => {
        const longo = 'palavra '.repeat(30);
        const plano = planejarRevisao(
            dados(),
            [
                {
                    chave: chaveInter,
                    valores: { traduzido: true, trecho: longo, link: 'https://a.org' },
                },
            ],
            { hoje: '2026-10-25' },
        );
        const { linhas } = descreverRevisao(plano);
        assert.match(linhas[0], /traduzido: não → sim/);
        assert.match(linhas[0], /data de acesso: \(vazio\) → «25\/10\/2026»/);
        assert.match(linhas[0], /trecho: \(vazio\) → «palavra palavra[^»]*…»/);
    });

    it('conta nos camposAlterados os valores derivados também', () => {
        const plano = planejarRevisao(
            dados(),
            [{ chave: chaveInter, valores: { link: 'https://a.org' } }],
            { hoje: '2026-10-25' },
        );
        assert.deepEqual(plano.camposAlterados, { link: 1, dataAcesso: 1 });
    });
});

describe('busca com pontuação (literal)', () => {
    it('", de" acha só o que tem vírgula e "de", não tudo que tem "de" dentro', () => {
        const linhas = listarLinhasRevisao(dados());
        const achadas = filtrarLinhasRevisao(linhas, ', de');
        assert.deepEqual(
            achadas.map((l) => l.chave),
            ['poema:2:intertextualidade:0'],
        );
    });

    it('"(" acha o aposto entre parênteses, sem acento nem caixa', () => {
        const linhas = listarLinhasRevisao(dados());
        const achadas = filtrarLinhasRevisao(linhas, '(MACHADO)');
        assert.deepEqual(
            achadas.map((l) => l.chave),
            ['poema:2:hipertextualidade:0'],
        );
        assert.equal(filtrarLinhasRevisao(linhas, '(').length, 1);
    });

    it('o nome do campo não entra na busca (para isso existe o filtro de campo)', () => {
        const linhas = listarLinhasRevisao(dados());
        assert.equal(filtrarLinhasRevisao(linhas, 'hipertextualidade').length, 0);
        assert.equal(filtrarLinhasRevisao(linhas, '', { campo: 'hipertextualidade' }).length, 1);
    });

    it('a busca literal não atravessa de um valor para o outro', () => {
        const linhas = listarLinhasRevisao(dados());
        assert.equal(filtrarLinhasRevisao(linhas, 'sagarana, guimarães').length, 0);
    });
});

describe('origem em lista (Modo revisão)', () => {
    const linhaDe = (campo, indice = 0) =>
        listarLinhasRevisao(dados()).find(
            (l) =>
                l.tipo === 'poema' &&
                l.id === poemas[0].id &&
                l.campo === campo &&
                l.indice === indice,
        );

    it('lê a lista e vale nos dois campos, Inter e Hiper', () => {
        poemas[0].intertextualidade[0].origemObra = ['Brasil', 'brasil'];
        assert.deepEqual(linhaDe('intertextualidade').valores.origens, ['Brasil']);
        assert.equal(linhaDe('intertextualidade').valores.origem, 'Brasil');
        assert.equal(valorAplica('hipertextualidade', 'origem'), true);
        assert.equal(valorAplica('intertextualidade', 'origem'), true);
    });

    it('grava a lista e o Desfazer tira a chave de quem não a tinha', () => {
        const entrada = poemas[0].intertextualidade[0];
        const linha = linhaDe('intertextualidade');
        assert.equal('origemObra' in entrada, false);
        const plano = planejarRevisao(dados(), [
            { chave: linha.chave, valores: { origens: ['Grécia', 'Roma'] } },
        ]);
        assert.deepEqual(plano.alteracoes[0].mudados, ['origem']);
        const aplicado = aplicarRevisao(plano);
        assert.deepEqual(entrada.origemObra, ['Grécia', 'Roma']);
        assert.equal(linhaDe('intertextualidade').valores.origem, 'Grécia e Roma');
        aplicado.desfazer();
        assert.equal('origemObra' in entrada, false);
    });

    it('apagar todas as tags tira a chave, e o Desfazer devolve a lista', () => {
        const entrada = poemas[0].intertextualidade[0];
        entrada.origemObra = ['Grécia'];
        const linha = linhaDe('intertextualidade');
        const aplicado = aplicarRevisao(
            planejarRevisao(dados(), [{ chave: linha.chave, valores: { origens: [] } }]),
        );
        assert.equal('origemObra' in entrada, false);
        aplicado.desfazer();
        assert.deepEqual(entrada.origemObra, ['Grécia']);
    });

    it('a mesma lista não conta como mudança, e "Sem origem" filtra as linhas vazias', () => {
        poemas[0].intertextualidade[0].origemObra = ['Grécia'];
        const linha = linhaDe('intertextualidade');
        const plano = planejarRevisao(dados(), [
            { chave: linha.chave, valores: { origens: ['grécia'] } },
        ]);
        assert.equal(plano.alteracoes.length, 1, 'trocar a grafia é mudança');
        const igual = planejarRevisao(dados(), [
            { chave: linha.chave, valores: { origens: ['Grécia'] } },
        ]);
        assert.equal(igual.alteracoes.length, 0);
        const sem = filtrarLinhasRevisao(listarLinhasRevisao(dados()), '', { faltando: 'origem' });
        assert.ok(sem.length > 0 && sem.every((l) => !l.valores.origem));
    });

    it('as sugestões trazem as origens já usadas', () => {
        poemas[0].intertextualidade[0].origemObra = ['Grécia'];
        poemas[0].intertextualidade[1].origemObra = ['Brasil'];
        assert.deepEqual(sugestoesDaRevisao(listarLinhasRevisao(dados())).origem, [
            'Brasil',
            'Grécia',
        ]);
    });
});
