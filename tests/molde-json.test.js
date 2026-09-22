import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
    moldeParaPayload,
    validarJsonMolde,
    detectarDuplicataMolde,
    aplicarImportacaoMolde,
    TIPO_JSON_MOLDE,
    VERSAO_JSON_MOLDE,
} = await import('../js/molde-json.js');
const { renderSeletorAcoes } = await import('../js/acoes-coluna.js');

function moldeExemplo(sobrescritas = {}) {
    return {
        id: 999,
        titulo: 'Soneto de teste',
        formaPoema: 'Soneto (Genérico)',
        regularidadeMetrica: null,
        tamanhoVerso: null,
        esquemaRimasPresenca: null,
        esquemaRimasPadrao: null,
        origemTradicao: null,
        peMetrico: null,
        registro: null,
        tom: null,
        moldeLinhas: [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs', tonicas: [1, 4] },
            { tipo: 'verso', numero: 2, texto: 'A/ noi/te/ ca/iu' },
            { tipo: 'vazia' },
            { tipo: 'verso', numero: 3, texto: 'Ter/ce/i/ro' },
        ],
        paresRima: [{ id: 5, a: { linha: 0, silabas: [4] }, b: { linha: 1, silabas: [4] } }],
        status: 'em andamento',
        poemaId: null,
        ...sobrescritas,
    };
}

describe('moldeParaPayload', () => {
    it('marca tipo/versão e não leva id nem poemaId de origem', () => {
        const p = moldeParaPayload(moldeExemplo({ status: 'promovido', poemaId: 42 }));
        assert.equal(p.tipo, TIPO_JSON_MOLDE);
        assert.equal(p.versao, VERSAO_JSON_MOLDE);
        assert.ok(!('id' in p));
        assert.ok(!('poemaId' in p));
        assert.equal(p.status, 'promovido');
    });

    it('leva a classificação e tira o id dos pares de rima', () => {
        const p = moldeParaPayload(moldeExemplo());
        assert.equal(p.formaPoema, 'Soneto (Genérico)');
        assert.equal(p.paresRima.length, 1);
        assert.ok(!('id' in p.paresRima[0]));
        assert.deepEqual(p.paresRima[0].a, { linha: 0, silabas: [4] });
    });

    it('sobrevive a JSON.stringify/parse sem perder as linhas', () => {
        const p = JSON.parse(JSON.stringify(moldeParaPayload(moldeExemplo())));
        assert.equal(p.moldeLinhas.length, 4);
        assert.deepEqual(p.moldeLinhas[0].tonicas, [1, 4]);
        assert.equal(p.moldeLinhas[2].tipo, 'vazia');
    });
});

describe('validarJsonMolde — envelope', () => {
    it('rejeita o que não é objeto', () => {
        assert.ok(validarJsonMolde(null).erro);
        assert.ok(validarJsonMolde([1]).erro);
        assert.ok(validarJsonMolde('x').erro);
    });

    it('rejeita JSON que não é de Molde (ex.: export de Poema ou de Escansão)', () => {
        assert.match(
            validarJsonMolde({ titulo: 'x', escansaoLinhas: [] }).erro,
            /não é um JSON de Molde/,
        );
        assert.match(validarJsonMolde({ tipo: 'poema' }).erro, /não é um JSON de Molde/);
    });

    it('rejeita versão de arquivo diferente da suportada', () => {
        const r = validarJsonMolde({ tipo: TIPO_JSON_MOLDE, versao: 99 });
        assert.match(r.erro, /Versão/);
    });

    it('aceita arquivo sem versão (feito à mão)', () => {
        const r = validarJsonMolde({ tipo: TIPO_JSON_MOLDE, titulo: 'À mão' });
        assert.equal(r.erro, undefined);
        assert.equal(r.molde.titulo, 'À mão');
    });
});

describe('validarJsonMolde — conteúdo', () => {
    it('round-trip: export → validar devolve o mesmo Molde, sem id, sempre em andamento', () => {
        const r = validarJsonMolde(JSON.parse(JSON.stringify(moldeParaPayload(moldeExemplo()))));
        assert.equal(r.erro, undefined);
        assert.deepEqual(r.avisos, []);
        assert.ok(!('id' in r.molde));
        assert.equal(r.molde.titulo, 'Soneto de teste');
        assert.equal(r.molde.formaPoema, 'Soneto (Genérico)');
        assert.equal(r.molde.moldeLinhas.length, 4);
        assert.deepEqual(r.molde.moldeLinhas[0].tonicas, [1, 4]);
        assert.equal(r.molde.paresRima.length, 1);
        assert.equal(r.molde.status, 'em andamento');
        assert.equal(r.molde.poemaId, null);
    });

    it('Molde "promovido" na origem entra em andamento, sem poemaId, com aviso', () => {
        const payload = { ...moldeParaPayload(moldeExemplo()), status: 'promovido', poemaId: 42 };
        const r = validarJsonMolde(payload);
        assert.equal(r.molde.status, 'em andamento');
        assert.equal(r.molde.poemaId, null);
        assert.equal(r.avisos.length, 1);
        assert.match(r.avisos[0], /promovido/);
    });

    it('valor de classificação fora da lista vira null com aviso', () => {
        const r = validarJsonMolde({ tipo: TIPO_JSON_MOLDE, formaPoema: 'Forma Inventada' });
        assert.equal(r.molde.formaPoema, null);
        assert.equal(r.avisos.length, 1);
        assert.match(r.avisos[0], /Forma do Poema/);
    });

    it('sem moldeLinhas/paresRima é válido (Molde do Bloco 1, sem grade)', () => {
        const r = validarJsonMolde({ tipo: TIPO_JSON_MOLDE, titulo: 'Só meta' });
        assert.deepEqual(r.molde.moldeLinhas, []);
        assert.deepEqual(r.molde.paresRima, []);
        assert.deepEqual(r.avisos, []);
    });

    it('renumera versos ignorando o `numero` do arquivo e descarta tônica fora do range', () => {
        const r = validarJsonMolde({
            tipo: TIPO_JSON_MOLDE,
            moldeLinhas: [
                { tipo: 'verso', numero: 77, texto: 'Ca/sa', tonicas: [0, 9] },
                { tipo: 'vazia' },
                { tipo: 'verso', numero: 3, texto: 'Mar' },
            ],
        });
        assert.deepEqual(
            r.molde.moldeLinhas.map((l) => l.numero),
            [1, undefined, 2],
        );
        assert.deepEqual(r.molde.moldeLinhas[0].tonicas, [0]);
        assert.match(r.avisos.join(' '), /tônica/);
    });

    it('descarta par de rima que aponta pra verso/sílaba inexistente e regera o id dos válidos', () => {
        const r = validarJsonMolde({
            tipo: TIPO_JSON_MOLDE,
            moldeLinhas: [
                { tipo: 'verso', texto: 'Ca/sa' },
                { tipo: 'verso', texto: 'Ma/sa' },
            ],
            paresRima: [
                { id: 1, a: { linha: 0, silabas: [1] }, b: { linha: 1, silabas: [1] } },
                { id: 2, a: { linha: 0, silabas: [1] }, b: { linha: 8, silabas: [1] } },
            ],
        });
        assert.equal(r.molde.paresRima.length, 1);
        assert.notEqual(r.molde.paresRima[0].id, 1);
        assert.match(r.avisos.join(' '), /par de rima/);
    });
});

describe('detectarDuplicataMolde', () => {
    const existente = moldeExemplo({ id: 1 });

    it('título vazio nunca é duplicata', () => {
        assert.equal(detectarDuplicataMolde({ titulo: '' }, [{ ...existente, titulo: '' }]), null);
    });

    it('sem Molde de mesmo título, null', () => {
        assert.equal(detectarDuplicataMolde({ titulo: 'Outro' }, [existente]), null);
    });

    it('ignora maiúscula/minúscula e espaços nas pontas', () => {
        const r = detectarDuplicataMolde({ titulo: '  SONETO DE TESTE ' }, [existente]);
        assert.equal(r.existentes.length, 1);
    });

    it('mesmo título + mesmo conteúdo = provável reimportação', () => {
        const importado = validarJsonMolde(moldeParaPayload(existente)).molde;
        const r = detectarDuplicataMolde(importado, [existente]);
        assert.equal(r.mesmoConteudo, true);
    });

    it('mesmo título + conteúdo diferente', () => {
        const importado = validarJsonMolde(
            moldeParaPayload({ ...existente, formaPoema: 'Haikai' }),
        ).molde;
        const r = detectarDuplicataMolde(importado, [existente]);
        assert.equal(r.mesmoConteudo, false);
    });
});

describe('aplicarImportacaoMolde', () => {
    function montar() {
        const chamadas = { snapshot: [], save: 0 };
        const deps = {
            tirarSnapshotSeNecessario: async (_db, forcar) => {
                chamadas.snapshot.push(forcar);
                return true;
            },
            save: () => {
                chamadas.save += 1;
            },
        };
        return { chamadas, deps, dbRef: { moldes: [moldeExemplo({ id: 1 })] } };
    }

    it('tira snapshot FORÇADO, soma o Molde com id novo e salva uma vez', async () => {
        const { chamadas, deps, dbRef } = montar();
        const { molde } = validarJsonMolde(moldeParaPayload(moldeExemplo({ id: 1 })));
        const r = await aplicarImportacaoMolde(molde, dbRef, deps);
        assert.equal(r.sucesso, true);
        assert.deepEqual(chamadas.snapshot, [true]);
        assert.equal(chamadas.save, 1);
        assert.equal(dbRef.moldes.length, 2);
        assert.notEqual(r.molde.id, 1);
        assert.equal(dbRef.moldes[0].id, 1); // o existente não é tocado
    });

    it('nunca reaproveita um id que venha no objeto, nem status/poemaId', async () => {
        const { deps, dbRef } = montar();
        const r = await aplicarImportacaoMolde(
            {
                titulo: 'x',
                id: 1,
                status: 'promovido',
                poemaId: 42,
                moldeLinhas: [],
                paresRima: [],
            },
            dbRef,
            deps,
        );
        assert.notEqual(r.molde.id, 1);
        assert.equal(r.molde.status, 'em andamento');
        assert.equal(r.molde.poemaId, null);
    });

    it('sem snapshot, não escreve nada', async () => {
        const { chamadas, dbRef } = montar();
        const deps = { tirarSnapshotSeNecessario: async () => false, save: () => chamadas.save++ };
        const r = await aplicarImportacaoMolde({ titulo: 'x' }, dbRef, deps);
        assert.deepEqual(r, { sucesso: false, motivo: 'snapshot' });
        assert.equal(dbRef.moldes.length, 1);
        assert.equal(chamadas.save, 0);
    });

    it('importar o mesmo arquivo duas vezes gera dois ids distintos', async () => {
        const { deps, dbRef } = montar();
        const payload = moldeParaPayload(moldeExemplo({ id: 1 }));
        const a = await aplicarImportacaoMolde(validarJsonMolde(payload).molde, dbRef, deps);
        const b = await aplicarImportacaoMolde(validarJsonMolde(payload).molde, dbRef, deps);
        assert.notEqual(a.molde.id, b.molde.id);
    });
});

describe('painel "Ações" de Moldes (acoes-coluna.js)', () => {
    it('tem o checkbox Baixar e não mostra o seletor de formato (só .json)', () => {
        const html = renderSeletorAcoes('moldes');
        assert.match(html, /toggleAcaoColuna\('moldes', 'baixar'/);
        assert.doesNotMatch(html, /Formato do Baixar/);
    });

    it('as outras abas continuam com o seletor de formato', () => {
        assert.match(renderSeletorAcoes('poemas'), /Formato do Baixar/);
    });
});
