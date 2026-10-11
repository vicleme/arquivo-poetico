import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Personagem: cadastro central (db.personagens) do que o autor criou ou
// reinterpretou. O texto guarda `personagens: [{ personagemId, papeis,
// centralidade }]`. Etapa 1: dado, migração, exclusão com desfazer,
// exportação e Importação Aditiva.

const P = await import('../js/personagens.js');
const { db, deleteItem } = await import('../js/db.js');
const { calcularImpactoExclusaoPersonagem } = P;
const { montarRegistro } = await import('../js/exportar.js');
const { aplicarImportacaoAditiva, classificarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');

// Os quatro campos de relação com o texto, vazios (etapa 3b).
const REL = { papelNarrativo: [], arco: [], tropes: [], funcaoTematica: [] };

describe('normalização', () => {
    it('origem só aceita Criado e Reinterpretado; o resto vira vazio', () => {
        assert.equal(P.normalizarOrigemPersonagem('Criado'), 'Criado');
        assert.equal(P.normalizarOrigemPersonagem('Reinterpretado'), 'Reinterpretado');
        assert.equal(P.normalizarOrigemPersonagem('Mito'), '');
        assert.equal(P.normalizarOrigemPersonagem(undefined), '');
    });

    it('papéis: só válidos, sem repetição, na ordem de presença', () => {
        assert.deepEqual(P.normalizarPapeisPersonagem(['Alusão', 'Voz', 'Voz', 'x', 'Aparição']), [
            'Voz',
            'Aparição',
            'Alusão',
        ]);
        assert.deepEqual(P.normalizarPapeisPersonagem(null), []);
    });

    it('centralidade não se aplica a quem só tem Menção e/ou Alusão', () => {
        assert.equal(P.normalizarCentralidadePersonagem('protagonista', ['Menção']), '');
        assert.equal(P.normalizarCentralidadePersonagem('protagonista', ['Menção', 'Alusão']), '');
        assert.equal(
            P.normalizarCentralidadePersonagem('protagonista', ['Menção', 'Voz']),
            'protagonista',
        );
        assert.equal(P.normalizarCentralidadePersonagem('secundario', []), 'secundario');
        assert.equal(P.normalizarCentralidadePersonagem('qualquer', ['Voz']), '');
    });

    it('vínculos repetidos se juntam: papéis em união, centralidade da primeira que a tem', () => {
        const r = P.normalizarPersonagensDoTexto([
            { personagemId: 1, papeis: ['Aparição'], centralidade: '' },
            { personagemId: 1, papeis: ['Interlocutor'], centralidade: 'secundario' },
            { personagemId: '', papeis: ['Voz'] },
            { papeis: ['Voz'] },
        ]);
        assert.deepEqual(r, [
            {
                personagemId: 1,
                papeis: ['Interlocutor', 'Aparição'],
                centralidade: 'secundario',
                ...REL,
            },
        ]);
    });

    it('registro preserva campos desconhecidos (futura Referência de origem)', () => {
        const p = P.normalizarPersonagem({ id: 1, nome: ' Medusa ', origem: 'x', referenciaId: 9 });
        assert.equal(p.nome, 'Medusa');
        assert.equal(p.origem, '');
        assert.equal(p.referenciaId, 9);
        assert.equal(p.notas, '');
    });
});

describe('migração / sincronização', () => {
    it('cria o array, normaliza e solta vínculos órfãos (idempotente)', () => {
        const dbRef = {
            personagens: [{ id: 1, nome: 'Ana' }, null, { nome: 'sem id' }],
            poemas: [
                {
                    id: 10,
                    personagens: [
                        { personagemId: 1, papeis: ['Menção'], centralidade: 'protagonista' },
                        { personagemId: 99, papeis: ['Voz'] },
                    ],
                },
            ],
            prosas: [{ id: 20 }],
        };
        assert.equal(P.sincronizarPersonagens(dbRef), 1);
        assert.deepEqual(dbRef.poemas[0].personagens, [
            { personagemId: 1, papeis: ['Menção'], centralidade: '', ...REL },
        ]);
        assert.deepEqual(dbRef.prosas[0].personagens, []);
        assert.equal(dbRef.personagens.length, 1);
        assert.equal(P.sincronizarPersonagens(dbRef), 0);
    });

    it('instalação sem a chave ganha db.personagens', () => {
        const dbRef = { poemas: [], prosas: [] };
        P.sincronizarPersonagens(dbRef);
        assert.deepEqual(dbRef.personagens, []);
    });
});

describe('cadastro e consulta', () => {
    it('criarPersonagem: nome vazio não cria; nome repetido é permitido; acha por chave sem acento/caixa', () => {
        const dbRef = {};
        assert.equal(P.criarPersonagem(dbRef, { nome: '   ' }), null);
        const a = P.criarPersonagem(dbRef, { nome: 'Dona Inês', origem: 'Criado' });
        P.criarPersonagem(dbRef, { nome: 'Dona Inês' });
        assert.equal(dbRef.personagens.length, 2);
        assert.equal(P.acharPersonagemPorNome(dbRef, 'dona ines').id, a.id);
        assert.equal(P.acharPersonagemPorNome(dbRef, ''), null);
    });

    it('impacto e nomes', () => {
        const dbRef = {
            personagens: [
                { id: 1, nome: 'A' },
                { id: 2, nome: 'B' },
            ],
            poemas: [{ id: 10, personagens: [{ personagemId: 1 }, { personagemId: 2 }] }],
            prosas: [{ id: 20, personagens: [{ personagemId: 1 }] }, { id: 21 }],
        };
        assert.deepEqual(P.calcularImpactoExclusaoPersonagem(dbRef, 1), {
            poemasIds: [10],
            prosasIds: [20],
        });
        assert.deepEqual(P.nomesPersonagens(dbRef.poemas[0], dbRef.personagens), ['A', 'B']);
        assert.equal(P.vinculoDoPersonagem(dbRef.prosas[1], 1), null);
    });
});

describe('exclusão com desfazer (db real)', () => {
    beforeEach(() => {
        db.personagens.length = 0;
        db.poemas.length = 0;
        db.prosas.length = 0;
        localStorage.clear();
        document.getElementById('modal-confirmar-exclusao')?.remove();
        document.getElementById('avisos-toast')?.remove();
    });

    it('excluir tira o vínculo dos textos; Desfazer devolve personagem, papéis e centralidade', () => {
        db.personagens.push({ id: 1, nome: 'Medusa', origem: 'Reinterpretado', notas: '' });
        db.poemas.push({
            id: 10,
            titulo: 'P',
            sequencia: 1,
            personagens: [
                { personagemId: 1, papeis: ['Voz', 'Aparição'], centralidade: 'protagonista' },
            ],
        });
        db.prosas.push({
            id: 20,
            titulo: 'R',
            sequencia: 1,
            personagens: [{ personagemId: 1, papeis: ['Menção'], centralidade: '' }],
        });

        deleteItem('personagens', 1);
        assert.match(document.body.textContent, /deixará de aparecer em 2 textos/);
        document.getElementById('excl-confirmar').click();

        assert.equal(db.personagens.length, 0);
        assert.deepEqual(db.poemas[0].personagens, []);
        assert.deepEqual(db.prosas[0].personagens, []);

        document.querySelector('#avisos-toast button').click();

        assert.equal(db.personagens.length, 1);
        assert.deepEqual(db.poemas[0].personagens, [
            { personagemId: 1, papeis: ['Voz', 'Aparição'], centralidade: 'protagonista', ...REL },
        ]);
        assert.deepEqual(db.prosas[0].personagens, [
            { personagemId: 1, papeis: ['Menção'], centralidade: '', ...REL },
        ]);
    });

    it('personagem sem texto: aviso simples', () => {
        db.personagens.push({ id: 1, nome: 'Solto', origem: '', notas: '' });
        deleteItem('personagens', 1);
        assert.doesNotMatch(document.body.textContent, /deixará de aparecer/);
        assert.equal(calcularImpactoExclusaoPersonagem(db, 1).poemasIds.length, 0);
    });
});

describe('relação com o texto (etapa 3b)', () => {
    it('tags de relação: sem repetição por caixa/acento, primeira grafia fica', () => {
        const [v] = P.normalizarPersonagensDoTexto([
            {
                personagemId: 1,
                papeis: ['Voz'],
                papelNarrativo: ['Confidente', 'confidente', ' '],
                arco: 'Queda, queda, Redenção',
                tropes: ['Mulher Fatal'],
                funcaoTematica: undefined,
            },
        ]);
        assert.deepEqual(v.papelNarrativo, ['Confidente']);
        assert.deepEqual(v.arco, ['Queda', 'Redenção']);
        assert.deepEqual(v.tropes, ['Mulher Fatal']);
        assert.deepEqual(v.funcaoTematica, []);
    });

    it('vínculos repetidos juntam as tags de relação', () => {
        const [v] = P.normalizarPersonagensDoTexto([
            { personagemId: 1, arco: ['Queda'], tropes: ['Mulher fatal'] },
            { personagemId: 1, arco: ['queda', 'Redenção'], tropes: ['Mulher Fatal', 'Musa'] },
        ]);
        assert.deepEqual(v.arco, ['Queda', 'Redenção']);
        assert.deepEqual(v.tropes, ['Mulher fatal', 'Musa']);
    });

    it('exportação e importação levam a relação junto do vínculo', () => {
        const dbOrigem = {
            personagens: [{ id: 7, nome: 'Medusa', origem: 'Criado' }],
            poemas: [],
            prosas: [],
        };
        const item = {
            personagens: [
                {
                    personagemId: 7,
                    papeis: ['Voz'],
                    centralidade: 'protagonista',
                    papelNarrativo: ['Antagonista'],
                    arco: ['Queda'],
                    tropes: ['Monstro'],
                    funcaoTematica: ['Culpa'],
                },
            ],
        };
        const exp = P.personagensParaExportar(dbOrigem, item);
        assert.deepEqual(exp.personagens[0].papelNarrativo, ['Antagonista']);

        const dbDestino = { personagens: [], poemas: [], prosas: [] };
        const [v] = P.importarPersonagensDoTexto(dbDestino, exp);
        assert.deepEqual(
            [v.papelNarrativo, v.arco, v.tropes, v.funcaoTematica],
            [['Antagonista'], ['Queda'], ['Monstro'], ['Culpa']],
        );
        assert.notEqual(v.personagemId, 7);
    });
});

describe('exportação e Importação Aditiva', () => {
    const dbDestino = () => ({
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        periodosHistoricos: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
    });
    const deps = () => ({ tirarSnapshotSeNecessario: async () => true, save: () => {} });

    function exportado() {
        db.personagens.length = 0;
        db.personagens.push(
            { id: 7, nome: 'Medusa', origem: 'Reinterpretado', notas: '' },
            { id: 8, nome: 'Dona Inês', origem: 'Criado', notas: '' },
        );
        const item = {
            id: 5,
            titulo: 'X',
            personagens: [
                { personagemId: 7, papeis: ['Voz'], centralidade: 'protagonista' },
                { personagemId: 8, papeis: ['Menção'], centralidade: '' },
            ],
        };
        db.poemas.length = 0;
        db.poemas.push(item);
        const reg = montarRegistro('poema', item);
        db.poemas.length = 0;
        db.personagens.length = 0;
        return { itens: [{ ...JSON.parse(JSON.stringify(reg)), id: 42 }] };
    }

    it('o registro exportado leva nome, origem e os dados do cadastro junto do id', () => {
        const [reg] = exportado().itens;
        const vazio = {
            genero: '',
            orientacao: '',
            identidadeCisTrans: '',
            corRaca: '',
            nascimento: null,
            obito: null,
            caracteristicas: P.normalizarCaracteristicasPersonagem(null),
            participacoes: [],
        };
        assert.deepEqual(reg.personagens, [
            {
                personagemId: 7,
                papeis: ['Voz'],
                centralidade: 'protagonista',
                ...REL,
                nome: 'Medusa',
                origem: 'Reinterpretado',
                ...vazio,
            },
            {
                personagemId: 8,
                papeis: ['Menção'],
                centralidade: '',
                ...REL,
                nome: 'Dona Inês',
                origem: 'Criado',
                ...vazio,
            },
        ]);
    });

    it('acervo vazio: cria os personagens com origem e liga ao texto com ids novos', async () => {
        const payload = exportado();
        const alvo = dbDestino();
        await aplicarImportacaoAditiva(
            payload,
            classificarImportacaoAditiva(payload, alvo),
            alvo,
            deps(),
        );
        assert.deepEqual(alvo.personagens.map((p) => [p.nome, p.origem]).sort(), [
            ['Dona Inês', 'Criado'],
            ['Medusa', 'Reinterpretado'],
        ]);
        const medusa = alvo.personagens.find((p) => p.nome === 'Medusa');
        assert.deepEqual(alvo.poemas[0].personagens[0], {
            personagemId: medusa.id,
            papeis: ['Voz'],
            centralidade: 'protagonista',
            ...REL,
        });
        assert.notEqual(medusa.id, 7);
    });

    it('casa pelo nome (sem caixa/acento), não duplica e só preenche origem vazia', async () => {
        const payload = exportado();
        const alvo = dbDestino();
        alvo.personagens = [
            { id: 900, nome: 'MEDUSA', origem: 'Criado', notas: 'minha' },
            { id: 901, nome: 'dona ines', origem: '', notas: '' },
        ];
        await aplicarImportacaoAditiva(
            payload,
            classificarImportacaoAditiva(payload, alvo),
            alvo,
            deps(),
        );
        assert.equal(alvo.personagens.length, 2);
        assert.equal(alvo.personagens.find((p) => p.id === 900).origem, 'Criado');
        assert.equal(alvo.personagens.find((p) => p.id === 901).origem, 'Criado');
        assert.deepEqual(
            alvo.poemas[0].personagens.map((e) => e.personagemId),
            [900, 901],
        );
    });

    it('JSON antigo, sem `personagens`, importa com lista vazia', async () => {
        const [reg] = exportado().itens;
        delete reg.personagens;
        const payload = { itens: [reg] };
        const alvo = dbDestino();
        await aplicarImportacaoAditiva(
            payload,
            classificarImportacaoAditiva(payload, alvo),
            alvo,
            deps(),
        );
        assert.deepEqual(alvo.poemas[0].personagens, []);
    });
});

describe('etapa 1b: identidade, vida e características', () => {
    it('tags: aparadas, sem vazio, sem repetição por caixa/acento (a primeira grafia fica); aceita "a, b"', () => {
        assert.deepEqual(
            P.normalizarTagsPersonagem([' Ciumenta ', 'ciumenta', 'CIÚMENTA', '', null, 'Leal']),
            ['Ciumenta', 'Leal'],
        );
        assert.deepEqual(P.normalizarTagsPersonagem('Medo de água, medo de AGUA, Solidão'), [
            'Medo de água',
            'Solidão',
        ]);
        assert.deepEqual(P.normalizarTagsPersonagem(undefined), []);
    });

    it('características: 7 grupos de tag (incluindo backstory) mais a nota do passado', () => {
        const c = P.normalizarCaracteristicasPersonagem({
            backstory: ['Abandono parental', 'abandono parental'],
            backstoryNota: 'Criada pela avó.',
            arquetipos: ['Órfã'],
            lixo: 'x',
        });
        assert.deepEqual(Object.keys(c), [...P.GRUPOS_CARACTERISTICAS_PERSONAGEM, 'backstoryNota']);
        assert.deepEqual(c.backstory, ['Abandono parental']);
        assert.equal(c.backstoryNota, 'Criada pela avó.');
        assert.deepEqual(c.medos, []);
        assert.equal(c.lixo, undefined);
        assert.equal(P.caracteristicasVazias(null), true);
        assert.equal(P.caracteristicasVazias({ backstoryNota: '  ' }), true);
        assert.equal(P.caracteristicasVazias({ desejos: ['Liberdade'] }), false);
    });

    it('cor/raça só aceita a lista do Autor; gênero e orientação são texto livre aparado', () => {
        const p = P.normalizarPersonagem({
            nome: 'X',
            corRaca: 'Parda',
            genero: '  Mulher trans ',
            orientacao: 'Lésbica',
        });
        assert.equal(p.corRaca, 'Parda');
        assert.equal(p.genero, 'Mulher trans');
        assert.equal(p.orientacao, 'Lésbica');
        assert.equal(P.normalizarPersonagem({ nome: 'Y', corRaca: 'Verde' }).corRaca, '');
        assert.equal(P.normalizarPersonagem({ nome: 'Z' }).genero, '');
    });

    it('nascimento e óbito: data parcial só com inteiros positivos; null quando vazia', () => {
        assert.deepEqual(P.normalizarDataParcialPersonagem({ ano: '1890', mes: '', dia: 'x' }), {
            ano: 1890,
        });
        assert.equal(P.normalizarDataParcialPersonagem({}), null);
        assert.equal(P.normalizarDataParcialPersonagem('1890'), null);
        assert.equal(P.normalizarPersonagem({ nome: 'A' }).nascimento, null);
    });

    it('idade: pelo ano de referência dado, nunca pela data de hoje', () => {
        const p = { nascimento: { ano: 1890 }, obito: { ano: 1950 } };
        assert.equal(P.idadeDoPersonagemEm(p, 1920), 30);
        assert.equal(P.idadeDoPersonagemEm(p, 1890), 0);
        assert.equal(P.idadeDoPersonagemEm(p, 1889), null);
        assert.equal(P.idadeDoPersonagemEm(p, 1951), null);
        assert.equal(P.idadeDoPersonagemEm({ nascimento: { ano: 1890 } }, 2000), 110);
        assert.equal(P.idadeDoPersonagemEm({}, 1920), null);
        assert.equal(P.idadeDoPersonagemEm(p, undefined), null);
    });

    it('duração da vida e óbito anterior ao nascimento', () => {
        assert.equal(
            P.duracaoDaVidaPersonagem({ nascimento: { ano: 1890 }, obito: { ano: 1950 } }),
            60,
        );
        assert.equal(P.duracaoDaVidaPersonagem({ nascimento: { ano: 1890 } }), null);
        assert.equal(
            P.duracaoDaVidaPersonagem({ nascimento: { ano: 1950 }, obito: { ano: 1890 } }),
            null,
        );
        assert.equal(
            P.vidaInvalidaPersonagem({ nascimento: { ano: 1950 }, obito: { ano: 1890 } }),
            true,
        );
        assert.equal(P.vidaInvalidaPersonagem({ nascimento: { ano: 1890 } }), false);
    });

    it('personagem da etapa 1 (sem os campos novos) ganha os vazios ao sincronizar, e é idempotente', () => {
        const dbRef = {
            personagens: [{ id: 1, nome: 'Antiga', origem: 'Criado', notas: 'n' }],
            poemas: [],
            prosas: [],
        };
        P.sincronizarPersonagens(dbRef);
        const antes = JSON.stringify(dbRef.personagens);
        P.sincronizarPersonagens(dbRef);
        assert.equal(JSON.stringify(dbRef.personagens), antes);
        const [p] = dbRef.personagens;
        assert.equal(p.notas, 'n');
        assert.equal(p.nascimento, null);
        assert.equal(p.corRaca, '');
        assert.equal(P.caracteristicasVazias(p.caracteristicas), true);
    });

    it('criarPersonagem aceita os campos novos', () => {
        const dbRef = { personagens: [] };
        const p = P.criarPersonagem(dbRef, {
            nome: 'Capitu',
            genero: 'Mulher',
            nascimento: { ano: 1850 },
            caracteristicas: { personalidade: ['Dissimulada'], backstory: ['Vizinha de infância'] },
        });
        assert.equal(p.genero, 'Mulher');
        assert.deepEqual(p.nascimento, { ano: 1850 });
        assert.deepEqual(p.caracteristicas.personalidade, ['Dissimulada']);
        assert.equal(dbRef.personagens.length, 1);
    });

    it('importação: cria com tudo; num existente só preenche o que estava vazio', () => {
        const dbRef = { personagens: [], poemas: [], prosas: [] };
        const vinculo = {
            nome: 'Capitu',
            origem: 'Reinterpretado',
            genero: 'Mulher',
            orientacao: 'Heterossexual',
            corRaca: 'Parda',
            nascimento: { ano: 1850 },
            obito: { ano: 1900 },
            caracteristicas: {
                medos: ['Abandono'],
                backstory: ['Órfã de pai'],
                backstoryNota: 'Nota A',
            },
            papeis: ['Voz'],
        };
        P.importarPersonagensDoTexto(dbRef, { personagens: [vinculo] });
        const criado = dbRef.personagens[0];
        assert.equal(criado.corRaca, 'Parda');
        assert.deepEqual(criado.obito, { ano: 1900 });
        assert.deepEqual(criado.caracteristicas.backstory, ['Órfã de pai']);

        // existente com dados próprios: nada é trocado; o que estava vazio é completado
        const alvo = {
            personagens: [
                {
                    id: 5,
                    nome: 'CAPITU',
                    genero: 'Mulher cis',
                    nascimento: { ano: 1851 },
                    caracteristicas: { medos: ['Solidão'] },
                },
            ],
            poemas: [],
            prosas: [],
        };
        P.importarPersonagensDoTexto(alvo, { personagens: [vinculo] });
        assert.equal(alvo.personagens.length, 1);
        const p = alvo.personagens[0];
        assert.equal(p.genero, 'Mulher cis');
        assert.deepEqual(p.nascimento, { ano: 1851 });
        assert.deepEqual(p.caracteristicas.medos, ['Solidão']);
        assert.equal(p.corRaca, 'Parda');
        assert.deepEqual(p.obito, { ano: 1900 });
        assert.deepEqual(p.caracteristicas.backstory, ['Órfã de pai']);
        assert.equal(p.caracteristicas.backstoryNota, 'Nota A');
    });
});
