import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    TIPO_ECO_PERSONAGEM,
    TIPO_ECO_PESSOA,
    ancoraAtiva,
    ancorasImportadas,
    ancorasParaExportar,
    candidatosAncora,
    ecosImportados,
    ecosParaExportar,
    ecosAncoradosEnvolvendo,
    especieDoTipoEco,
    nomesDasAncoras,
    normalizarAncorasEco,
    redirecionarAncora,
    removerAncoraDoCadastro,
    removerAncoraDosEcos,
    restaurarAncoras,
    rotuloEco,
    sincronizarAncorasEco,
    tipoEcoDaEspecie,
} from '../js/ancora-eco.js';
import { TIPOS_ECO } from '../js/utils.js';

// Maré (1, poema, 2019) e Cais (2, prosa, 2023) dividem a Iara e o Tomás;
// Cais ecoa Maré. Só a Iara está nos dois com o Beto fora.
function acervo() {
    return {
        personagens: [
            { id: 10, nome: 'Iara' },
            { id: 11, nome: 'Tomás' },
            { id: 12, nome: 'Beto' },
        ],
        pessoas: [
            { id: 20, nome: 'Marina' },
            { id: 21, nome: 'Paulo' },
        ],
        poemas: [
            {
                id: 1,
                titulo: 'Maré',
                personagens: [{ personagemId: 10 }, { personagemId: 11 }],
                pessoas: [{ pessoaId: 20 }],
                conceitos: { elos: [], ecos: [] },
            },
        ],
        prosas: [
            {
                id: 2,
                titulo: 'Cais',
                personagens: [{ personagemId: 10 }, { personagemId: 11 }, { personagemId: 12 }],
                pessoas: [{ pessoaId: 20 }, { pessoaId: 21 }],
                conceitos: {
                    elos: [],
                    ecos: [
                        {
                            id: 1,
                            tipo: TIPO_ECO_PERSONAGEM,
                            texto: 'a mesma mulher',
                            ancoras: [
                                { especie: 'personagem', id: 10 },
                                { especie: 'personagem', id: 11 },
                            ],
                        },
                        {
                            id: 1,
                            tipo: TIPO_ECO_PESSOA,
                            texto: '',
                            ancoras: [{ especie: 'pessoa', id: 20 }],
                        },
                    ],
                },
            },
        ],
    };
}

describe('tipos de Eco com âncora', () => {
    it('as constantes de ancora-eco.js estão na lista TIPOS_ECO de utils.js', () => {
        assert.ok(TIPOS_ECO.includes(TIPO_ECO_PERSONAGEM));
        assert.ok(TIPOS_ECO.includes(TIPO_ECO_PESSOA));
    });

    it('o tipo define a espécie, e os demais tipos não têm âncora', () => {
        assert.equal(especieDoTipoEco('Personagem em comum'), 'personagem');
        assert.equal(especieDoTipoEco('Pessoa em comum'), 'pessoa');
        assert.equal(especieDoTipoEco('Aceno a'), null);
        assert.equal(especieDoTipoEco(''), null);
        assert.equal(tipoEcoDaEspecie('pessoa'), 'Pessoa em comum');
    });
});

describe('normalizarAncorasEco', () => {
    it('tira repetição, id inválido, espécie desconhecida e lixo', () => {
        const r = normalizarAncorasEco(
            [
                { especie: 'personagem', id: 10 },
                { especie: 'personagem', id: '10' },
                { especie: 'personagem', id: 'x' },
                { especie: 'planta', id: 1 },
                null,
                'texto',
                { especie: 'personagem', id: '11' },
            ],
            TIPO_ECO_PERSONAGEM,
        );
        assert.deepEqual(r, [
            { especie: 'personagem', id: 10 },
            { especie: 'personagem', id: 11 },
        ]);
    });

    it('só mantém a espécie que o tipo aceita', () => {
        const mistas = [
            { especie: 'personagem', id: 10 },
            { especie: 'pessoa', id: 20 },
        ];
        assert.deepEqual(normalizarAncorasEco(mistas, TIPO_ECO_PESSOA), [
            { especie: 'pessoa', id: 20 },
        ]);
    });

    it('tipo sem âncora ou entrada que não é lista dá lista vazia', () => {
        assert.deepEqual(normalizarAncorasEco([{ especie: 'pessoa', id: 1 }], 'Aceno a'), []);
        assert.deepEqual(normalizarAncorasEco(undefined, TIPO_ECO_PESSOA), []);
    });
});

describe('candidatos e âncora ativa', () => {
    it('só oferece quem existe nos dois textos, ordenado por nome', () => {
        const db = acervo();
        const c = candidatosAncora(db, db.poemas[0], db.prosas[0], 'personagem');
        assert.deepEqual(
            c.map((x) => x.nome),
            ['Iara', 'Tomás'],
        );
        const p = candidatosAncora(db, db.poemas[0], db.prosas[0], 'pessoa');
        assert.deepEqual(
            p.map((x) => x.nome),
            ['Marina'],
        );
    });

    it('aceita o estado do modal no lugar do item salvo', () => {
        const db = acervo();
        const modal = { personagens: [{ personagemId: 12 }], pessoas: [] };
        const c = candidatosAncora(db, modal, db.prosas[0], 'personagem');
        assert.deepEqual(
            c.map((x) => x.nome),
            ['Beto'],
        );
    });

    it('espécie inválida não oferece nada', () => {
        const db = acervo();
        assert.deepEqual(candidatosAncora(db, db.poemas[0], db.prosas[0], 'planta'), []);
    });

    it('ancoraAtiva vira falsa quando um dos textos perde o vínculo', () => {
        const db = acervo();
        const a = { especie: 'personagem', id: 11 };
        assert.equal(ancoraAtiva(db.prosas[0], db.poemas[0], a), true);
        db.poemas[0].personagens = db.poemas[0].personagens.filter((v) => v.personagemId != 11);
        assert.equal(ancoraAtiva(db.prosas[0], db.poemas[0], a), false);
    });
});

describe('rótulo', () => {
    it('inclui os nomes entre parênteses e resume com limite', () => {
        const db = acervo();
        const eco = db.prosas[0].conceitos.ecos[0];
        assert.equal(rotuloEco(db, eco), 'Personagem em comum (Iara, Tomás)');
        assert.equal(rotuloEco(db, eco, 1), 'Personagem em comum (Iara +1)');
        assert.equal(nomesDasAncoras(db, eco.ancoras), 'Iara, Tomás');
    });

    it('Eco sem âncora mantém só o tipo, como sempre foi', () => {
        const db = acervo();
        assert.equal(rotuloEco(db, { id: 1, tipo: 'Aceno a', texto: '' }), 'Aceno a');
        assert.equal(rotuloEco(db, { id: 1, tipo: '', texto: '' }), '');
    });

    it('id fora do cadastro aparece como (removido)', () => {
        const db = acervo();
        assert.equal(nomesDasAncoras(db, [{ especie: 'pessoa', id: 999 }]), '(removido)');
    });
});

describe('remoção de quem ancora', () => {
    it('acha os Ecos nos dois sentidos, dono e alvo', () => {
        const db = acervo();
        const doAlvo = ecosAncoradosEnvolvendo(db, 1, 'personagem', 10);
        assert.equal(doAlvo.length, 1);
        assert.equal(doAlvo[0].donoId, 2);
        assert.equal(doAlvo[0].outroId, 2);
        const doDono = ecosAncoradosEnvolvendo(db, 2, 'personagem', 10);
        assert.equal(doDono[0].outroId, 1);
        assert.equal(doDono[0].titulo, 'Maré');
    });

    it('não confunde espécie nem texto de fora', () => {
        const db = acervo();
        assert.equal(ecosAncoradosEnvolvendo(db, 1, 'pessoa', 10).length, 0);
        assert.equal(ecosAncoradosEnvolvendo(db, 99, 'personagem', 10).length, 0);
    });

    it('remover a âncora mantém o Eco, e a única âncora some do campo', () => {
        const db = acervo();
        const afetados = ecosAncoradosEnvolvendo(db, 1, 'pessoa', 20);
        const removidos = removerAncoraDosEcos(db, afetados, 'pessoa', 20);
        assert.equal(removidos.length, 1);
        const eco = db.prosas[0].conceitos.ecos[1];
        assert.equal(eco.tipo, TIPO_ECO_PESSOA);
        assert.equal('ancoras' in eco, false);
        assert.equal(db.prosas[0].conceitos.ecos.length, 2);
    });

    it('Desfazer devolve a âncora na mesma posição', () => {
        const db = acervo();
        const afetados = ecosAncoradosEnvolvendo(db, 1, 'personagem', 10);
        const removidos = removerAncoraDosEcos(db, afetados, 'personagem', 10);
        assert.deepEqual(db.prosas[0].conceitos.ecos[0].ancoras, [
            { especie: 'personagem', id: 11 },
        ]);
        restaurarAncoras(db, removidos);
        assert.deepEqual(db.prosas[0].conceitos.ecos[0].ancoras, [
            { especie: 'personagem', id: 10 },
            { especie: 'personagem', id: 11 },
        ]);
    });

    it('excluir do cadastro tira a âncora de todos os Ecos e dá para desfazer', () => {
        const db = acervo();
        const removidos = removerAncoraDoCadastro(db, 'personagem', 11);
        assert.equal(removidos.length, 1);
        assert.deepEqual(db.prosas[0].conceitos.ecos[0].ancoras, [
            { especie: 'personagem', id: 10 },
        ]);
        restaurarAncoras(db, removidos);
        assert.equal(db.prosas[0].conceitos.ecos[0].ancoras.length, 2);
    });

    it('mesclar redireciona a âncora e não duplica quando o Eco já tinha as duas', () => {
        const db = acervo();
        db.prosas[0].conceitos.ecos[1].ancoras = [
            { especie: 'pessoa', id: 20 },
            { especie: 'pessoa', id: 21 },
        ];
        redirecionarAncora(db, 'pessoa', 20, 21);
        assert.deepEqual(db.prosas[0].conceitos.ecos[1].ancoras, [{ especie: 'pessoa', id: 21 }]);

        const db2 = acervo();
        redirecionarAncora(db2, 'pessoa', 20, 21);
        assert.deepEqual(db2.prosas[0].conceitos.ecos[1].ancoras, [{ especie: 'pessoa', id: 21 }]);
    });
});

describe('sincronizarAncorasEco', () => {
    it('solta âncora de quem saiu do cadastro e é idempotente', () => {
        const db = acervo();
        db.personagens = db.personagens.filter((p) => p.id != 11);
        assert.equal(sincronizarAncorasEco(db), 1);
        assert.deepEqual(db.prosas[0].conceitos.ecos[0].ancoras, [
            { especie: 'personagem', id: 10 },
        ]);
        assert.equal(sincronizarAncorasEco(db), 0);
    });

    it('Eco antigo sem âncora passa intacto', () => {
        const db = acervo();
        db.poemas[0].conceitos.ecos = [{ id: 2, tipo: 'Personagem em comum', texto: '' }];
        assert.equal(sincronizarAncorasEco(db), 0);
        assert.equal('ancoras' in db.poemas[0].conceitos.ecos[0], false);
    });
});

describe('exportação e importação', () => {
    it('a âncora viaja com o nome e descarta quem não está no cadastro', () => {
        const db = acervo();
        const r = ancorasParaExportar(db, [
            { especie: 'personagem', id: 10 },
            { especie: 'personagem', id: 999 },
        ]);
        assert.deepEqual(r, [{ especie: 'personagem', id: 10, nome: 'Iara' }]);
    });

    it('importa casando por espécie e nome (sem caixa/acento), sem criar ninguém', () => {
        const db = acervo();
        const r = ancorasImportadas(
            db,
            [
                { especie: 'personagem', id: 777, nome: 'TOMAS' },
                { especie: 'personagem', id: 778, nome: 'Fulana Que Não Existe' },
                { especie: 'pessoa', id: 779, nome: 'Iara' },
            ],
            TIPO_ECO_PERSONAGEM,
        );
        assert.deepEqual(r, [{ especie: 'personagem', id: 11 }]);
        assert.equal(db.personagens.length, 3);
    });

    it('lista ausente ou tipo sem âncora importa vazio', () => {
        const db = acervo();
        assert.deepEqual(ancorasImportadas(db, undefined, TIPO_ECO_PESSOA), []);
        assert.deepEqual(
            ancorasImportadas(db, [{ especie: 'pessoa', nome: 'Marina' }], 'Aceno a'),
            [],
        );
    });
});

describe('Ecos no JSON de exportação e importação', () => {
    it('exportar leva o nome e deixa Eco sem âncora como está', () => {
        const db = acervo();
        db.prosas[0].conceitos.ecos.push({ id: 1, tipo: 'Aceno a', texto: 'x' });
        const r = ecosParaExportar(db, db.prosas[0].conceitos.ecos);
        assert.deepEqual(r[0].ancoras, [
            { especie: 'personagem', id: 10, nome: 'Iara' },
            { especie: 'personagem', id: 11, nome: 'Tomás' },
        ]);
        assert.deepEqual(r[2], { id: 1, tipo: 'Aceno a', texto: 'x' });
    });

    it('importar recasa pelo nome e ignora o id de origem, que pode bater em outro', () => {
        const destino = acervo();
        // No arquivo, a Iara era o id 11 (no destino, 11 é o Tomás).
        const arquivo = [
            {
                id: 1,
                tipo: TIPO_ECO_PERSONAGEM,
                texto: '',
                ancoras: [{ especie: 'personagem', id: 11, nome: 'Iara' }],
            },
            {
                id: 1,
                tipo: TIPO_ECO_PESSOA,
                texto: '',
                ancoras: [{ especie: 'pessoa', id: 1, nome: 'Ninguém Conhecida' }],
            },
            { id: 1, tipo: 'Aceno a', texto: 'n' },
        ];
        const r = ecosImportados(destino, arquivo);
        assert.deepEqual(r[0].ancoras, [{ especie: 'personagem', id: 10 }]);
        assert.equal('ancoras' in r[1], false);
        assert.deepEqual(r[2], { id: 1, tipo: 'Aceno a', texto: 'n' });
    });

    it('lista ausente passa intacta', () => {
        assert.equal(ecosImportados(acervo(), undefined), undefined);
    });
});
