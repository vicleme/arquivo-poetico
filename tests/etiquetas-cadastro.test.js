// Cadastro de Etiquetas por id (Fase 16, entrega 1). Lógica pura de js/etiquetas.js.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    ETIQUETAS_CATEGORIAS,
    limparNomeEtiqueta,
    nomesDeEtiquetasDigitados,
    garantirEtiqueta,
    sincronizarEtiquetas,
    migrarEtiquetasDoTexto,
    idsDeEtiquetasDoTexto,
    etiquetasDoTexto,
    nomesDeEtiquetasDoTexto,
    resolverEtiquetasEditadas,
    contarTextosPorEtiqueta,
    textosDaEtiqueta,
    etiquetasDaCategoria,
    etiquetasSemTexto,
    renomearEtiqueta,
    podeExcluirEtiqueta,
    excluirEtiquetaDoCadastro,
    mesclarEtiquetas,
    moverEtiquetaDeCategoria,
    sugerirEtiquetasDuplicadas,
    marcarEtiquetasNaoIguais,
} from '../js/etiquetas.js';

function dbAntigo() {
    return {
        poemas: [
            {
                id: 1,
                sinalizacoesTom: 'Melancólico, Íntimo',
                sinalizacoesEstilo: 'Melancólico',
                sinalizacoesOutros: 'Premiado',
                sinalizacoesTema: 'Amor',
            },
            { id: 2, sinalizacoesTom: 'melancolico' },
        ],
        prosas: [{ id: 3, sinalizacoesTom: 'Íntimo, Sombrio', sinalizacoesTradicao: '' }],
    };
}

describe('mapa de categorias', () => {
    it('tem as sete categorias, sem Tema nem Territorialidade', () => {
        assert.deepEqual(Object.keys(ETIQUETAS_CATEGORIAS), [
            'tradicao',
            'estilo',
            'relacao',
            'sensibilidade',
            'tom',
            'dominioImagetico',
            'outros',
        ]);
    });
});

describe('nomes', () => {
    it('limpa vírgula e espaços', () => {
        assert.equal(limparNomeEtiqueta('  a,  b  '), 'a b');
    });
    it('separa a digitação sem repetir (sem caixa/acento)', () => {
        assert.deepEqual(nomesDeEtiquetasDigitados('Íntimo, intimo,, Sombrio ,'), [
            'Íntimo',
            'Sombrio',
        ]);
    });
});

describe('garantirEtiqueta', () => {
    it('cria uma vez e reaproveita sem caixa/acento', () => {
        const db = {};
        const a = garantirEtiqueta(db, 'tom', 'Íntimo');
        const b = garantirEtiqueta(db, 'tom', 'intimo');
        assert.equal(a, b);
        assert.equal(db.etiquetas.length, 1);
        assert.deepEqual(db.etiquetas[0], { id: a, nome: 'Íntimo', categoria: 'tom', notas: '' });
    });
    it('o mesmo nome em outra categoria é outra etiqueta', () => {
        const db = {};
        const a = garantirEtiqueta(db, 'tom', 'Barroco');
        const b = garantirEtiqueta(db, 'estilo', 'Barroco');
        assert.notEqual(a, b);
    });
    it('recusa categoria inválida e nome vazio', () => {
        const db = {};
        assert.equal(garantirEtiqueta(db, 'tema', 'Amor'), null);
        assert.equal(garantirEtiqueta(db, 'tom', '  , '), null);
    });
});

describe('migração do texto por vírgula para ids', () => {
    it('converte os sete campos, cria o cadastro e deixa Tema como está', () => {
        const db = dbAntigo();
        const criadas = sincronizarEtiquetas(db);
        // Tom: Melancólico, Íntimo, Sombrio; Estilo: Melancólico; Outros: Premiado
        assert.equal(criadas, 5);
        assert.equal(db.poemas[0].sinalizacoesTema, 'Amor');
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'tom'), [
            'Melancólico',
            'Íntimo',
        ]);
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'estilo'), ['Melancólico']);
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'outros'), ['Premiado']);
        // "melancolico" do poema 2 reaproveita a etiqueta de Tom.
        assert.equal(db.poemas[1].sinalizacoesTom[0], db.poemas[0].sinalizacoesTom[0]);
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.prosas[0], 'tom'), ['Íntimo', 'Sombrio']);
    });
    it('é idempotente', () => {
        const db = dbAntigo();
        sincronizarEtiquetas(db);
        const retrato = JSON.stringify(db);
        assert.equal(sincronizarEtiquetas(db), 0);
        assert.equal(JSON.stringify(db), retrato);
    });
    it('texto sem etiqueta não ganha campo novo', () => {
        const db = { poemas: [{ id: 1 }], prosas: [] };
        sincronizarEtiquetas(db);
        assert.equal('sinalizacoesTom' in db.poemas[0], false);
    });
    it('descarta id órfão e id de outra categoria', () => {
        const db = { poemas: [], prosas: [] };
        const idEstilo = garantirEtiqueta(db, 'estilo', 'Barroco');
        db.poemas.push({ id: 1, sinalizacoesTom: [idEstilo, 999999999, 'Sombrio'] });
        sincronizarEtiquetas(db);
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'tom'), ['Sombrio']);
    });
    it('migrarEtiquetasDoTexto avisa se mudou', () => {
        const db = dbAntigo();
        assert.equal(migrarEtiquetasDoTexto(db, db.poemas[1]), true);
        assert.equal(migrarEtiquetasDoTexto(db, db.poemas[1]), false);
    });
    it('sincronizar não apaga nem renomeia etiqueta existente e limpa registro inválido', () => {
        const db = { poemas: [], prosas: [] };
        garantirEtiqueta(db, 'tom', 'Sombrio');
        db.etiquetas.push({ id: 5, nome: 'Perdida', categoria: 'inexistente' });
        sincronizarEtiquetas(db);
        assert.deepEqual(
            db.etiquetas.map((e) => e.nome),
            ['Sombrio'],
        );
    });
});

describe('leitura e edição no texto', () => {
    it('resolverEtiquetasEditadas cria o que falta e não repete', () => {
        const db = { poemas: [], prosas: [] };
        const ids = resolverEtiquetasEditadas(db, 'tom', ['Íntimo', 'intimo', 'Sombrio']);
        assert.equal(ids.length, 2);
        db.poemas.push({ id: 1, sinalizacoesTom: ids });
        assert.deepEqual(
            etiquetasDoTexto(db, db.poemas[0], 'tom').map((e) => e.nome),
            ['Íntimo', 'Sombrio'],
        );
    });
    it('campo ainda em texto não é lido como id', () => {
        const db = { poemas: [], prosas: [] };
        assert.deepEqual(idsDeEtiquetasDoTexto(db, { sinalizacoesTom: 'a, b' }, 'tom'), []);
    });
});

describe('uso e consultas', () => {
    it('conta textos por etiqueta e lista textos', () => {
        const db = dbAntigo();
        sincronizarEtiquetas(db);
        const intimo = db.etiquetas.find((e) => e.nome === 'Íntimo');
        assert.equal(contarTextosPorEtiqueta(db).get(intimo.id), 2);
        assert.deepEqual(textosDaEtiqueta(db, intimo.id), { poemasIds: [1], prosasIds: [3] });
    });
    it('lista a categoria em ordem alfabética com contagem', () => {
        const db = dbAntigo();
        sincronizarEtiquetas(db);
        const tom = etiquetasDaCategoria(db, 'tom');
        assert.deepEqual(
            tom.map((e) => [e.nome, e.textos]),
            [
                ['Íntimo', 2],
                ['Melancólico', 2],
                ['Sombrio', 1],
            ],
        );
    });
    it('etiquetasSemTexto', () => {
        const db = dbAntigo();
        sincronizarEtiquetas(db);
        garantirEtiqueta(db, 'tom', 'Solta');
        assert.deepEqual(
            etiquetasSemTexto(db).map((e) => e.nome),
            ['Solta'],
        );
    });
});

describe('renomear e excluir', () => {
    it('renomeia sem tocar nos textos e recusa duplicado só na mesma categoria', () => {
        const db = dbAntigo();
        sincronizarEtiquetas(db);
        const sombrio = db.etiquetas.find((e) => e.nome === 'Sombrio');
        const antes = JSON.stringify(db.prosas);
        assert.equal(renomearEtiqueta(db, sombrio.id, 'Íntimo').motivo, 'duplicado');
        assert.equal(renomearEtiqueta(db, sombrio.id, ' ').motivo, 'vazio');
        assert.equal(renomearEtiqueta(db, 'x', 'A').motivo, 'inexistente');
        // Mesmo nome de uma etiqueta de outra categoria é permitido.
        assert.equal(renomearEtiqueta(db, sombrio.id, 'Premiado').ok, true);
        assert.equal(JSON.stringify(db.prosas), antes);
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.prosas[0], 'tom'), ['Íntimo', 'Premiado']);
    });
    it('renomear só a caixa do próprio nome vale, e desfaz', () => {
        const db = dbAntigo();
        sincronizarEtiquetas(db);
        const e = db.etiquetas.find((x) => x.nome === 'Sombrio');
        const r = renomearEtiqueta(db, e.id, 'SOMBRIO');
        assert.equal(r.ok, true);
        assert.equal(e.nome, 'SOMBRIO');
        r.desfazer();
        assert.equal(e.nome, 'Sombrio');
    });
    it('só exclui etiqueta sem texto, e desfaz', () => {
        const db = dbAntigo();
        sincronizarEtiquetas(db);
        const emUso = db.etiquetas.find((e) => e.nome === 'Sombrio');
        assert.equal(podeExcluirEtiqueta(db, emUso.id).motivo, 'em-uso');
        assert.equal(excluirEtiquetaDoCadastro(db, emUso.id).ok, false);
        const solta = garantirEtiqueta(db, 'tom', 'Solta');
        const antes = db.etiquetas.length;
        const r = excluirEtiquetaDoCadastro(db, solta);
        assert.equal(r.ok, true);
        assert.equal(db.etiquetas.length, antes - 1);
        r.desfazer();
        assert.equal(db.etiquetas.length, antes);
    });
});

describe('mesclar', () => {
    function db2() {
        const db = { poemas: [], prosas: [] };
        const a = garantirEtiqueta(db, 'tom', 'Íntimo');
        const b = garantirEtiqueta(db, 'tom', 'Intimista');
        const c = garantirEtiqueta(db, 'tom', 'Sombrio');
        db.etiquetas[0].notas = 'nota A';
        db.etiquetas[1].notas = 'nota B';
        db.poemas.push({ id: 1, sinalizacoesTom: [b, c] });
        db.poemas.push({ id: 2, sinalizacoesTom: [a, b] });
        db.prosas.push({ id: 3, sinalizacoesTom: [b] });
        return { db, a, b, c };
    }
    it('passa os textos ao destino sem repetir e soma as notas', () => {
        const { db, a, b, c } = db2();
        const r = mesclarEtiquetas(db, b, a);
        assert.equal(r.ok, true);
        assert.equal(r.textos, 3);
        assert.deepEqual(db.poemas[0].sinalizacoesTom, [a, c]);
        assert.deepEqual(db.poemas[1].sinalizacoesTom, [a]);
        assert.deepEqual(db.prosas[0].sinalizacoesTom, [a]);
        assert.equal(
            db.etiquetas.some((e) => e.id === b),
            false,
        );
        assert.equal(db.etiquetas.find((e) => e.id === a).notas, 'nota A\n\nnota B');
    });
    it('desfaz tudo', () => {
        const { db, a, b } = db2();
        const antes = JSON.stringify(db);
        mesclarEtiquetas(db, b, a).desfazer();
        assert.equal(JSON.stringify(db), antes);
    });
    it('recusa igual, inexistente e categorias diferentes', () => {
        const { db, a } = db2();
        const outra = garantirEtiqueta(db, 'estilo', 'Barroco');
        assert.equal(mesclarEtiquetas(db, a, a).motivo, 'igual');
        assert.equal(mesclarEtiquetas(db, a, 'x').motivo, 'inexistente');
        assert.equal(mesclarEtiquetas(db, a, outra).motivo, 'categorias-diferentes');
    });
    it('as marcas "não são iguais" da origem passam ao destino', () => {
        const { db, a, b, c } = db2();
        marcarEtiquetasNaoIguais(db, b, c);
        mesclarEtiquetas(db, b, a);
        const dest = db.etiquetas.find((e) => e.id === a);
        const sombrio = db.etiquetas.find((e) => e.id === c);
        assert.deepEqual(dest.naoIguais, [c]);
        assert.deepEqual(sombrio.naoIguais, [a]);
    });
});

describe('mover de categoria', () => {
    function dbMover() {
        const db = { poemas: [], prosas: [] };
        const x = garantirEtiqueta(db, 'outros', 'Barroco');
        db.poemas.push({ id: 1, sinalizacoesOutros: [x] });
        db.poemas.push({ id: 2, sinalizacoesOutros: [x], sinalizacoesEstilo: [] });
        db.poemas.push({ id: 3, sinalizacoesOutros: [] });
        return { db, x };
    }
    it('move a etiqueta e os textos que a usam', () => {
        const { db, x } = dbMover();
        const r = moverEtiquetaDeCategoria(db, x, 'estilo');
        assert.equal(r.ok, true);
        assert.equal(r.textos, 2);
        assert.equal(db.etiquetas[0].categoria, 'estilo');
        assert.deepEqual(db.poemas[0].sinalizacoesOutros, []);
        assert.deepEqual(db.poemas[0].sinalizacoesEstilo, [x]);
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[1], 'estilo'), ['Barroco']);
        assert.equal('sinalizacoesEstilo' in db.poemas[2], false);
    });
    it('desfaz, inclusive campo que não existia', () => {
        const { db, x } = dbMover();
        const antes = JSON.stringify(db);
        moverEtiquetaDeCategoria(db, x, 'estilo').desfazer();
        assert.equal(JSON.stringify(db), antes);
    });
    it('recusa categoria igual, inválida e nome já existente no destino', () => {
        const { db, x } = dbMover();
        assert.equal(moverEtiquetaDeCategoria(db, x, 'outros').motivo, 'igual');
        assert.equal(moverEtiquetaDeCategoria(db, x, 'tema').motivo, 'categoria-invalida');
        garantirEtiqueta(db, 'estilo', 'barroco');
        const r = moverEtiquetaDeCategoria(db, x, 'estilo');
        assert.equal(r.motivo, 'duplicado');
        assert.equal(db.etiquetas[0].categoria, 'outros');
    });
});

describe('duplicatas', () => {
    function dbDup() {
        const db = { poemas: [], prosas: [] };
        const a = garantirEtiqueta(db, 'tom', 'Memória');
        const b = garantirEtiqueta(db, 'tom', 'Memórias');
        garantirEtiqueta(db, 'estilo', 'Memória');
        garantirEtiqueta(db, 'tom', 'Luto');
        garantirEtiqueta(db, 'tom', 'Luto/Finitude');
        db.poemas.push({ id: 1, sinalizacoesTom: [b] });
        return { db, a, b };
    }
    it('sugere só pares da mesma categoria e com a mesma forma', () => {
        const { db, a, b } = dbDup();
        const pares = sugerirEtiquetasDuplicadas(db);
        assert.equal(pares.length, 1);
        // A mais usada vem como `a`.
        assert.equal(pares[0].a.id, b);
        assert.equal(pares[0].b.id, a);
        assert.equal(pares[0].textosA, 1);
    });
    it('"não são iguais" tira o par e desfaz', () => {
        const { db, a, b } = dbDup();
        const r = marcarEtiquetasNaoIguais(db, a, b);
        assert.equal(sugerirEtiquetasDuplicadas(db).length, 0);
        r.desfazer();
        assert.equal(sugerirEtiquetasDuplicadas(db).length, 1);
        assert.equal('naoIguais' in db.etiquetas[0], false);
    });
});

describe('edição em massa', () => {
    it('adiciona pelo cadastro, sem repetir, criando o que falta', async () => {
        const { adicionarEtiquetasAosTextos } = await import('../js/etiquetas.js');
        const db = { poemas: [{ id: 1, sinalizacoesTom: 'Lírico' }, { id: 2 }], prosas: [] };
        const r = adicionarEtiquetasAosTextos(db, db.poemas, 'tom', ['Lírico', 'Sombrio']);
        assert.deepEqual(r, { vinculos: 3, textos: 2 });
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'tom'), ['Lírico', 'Sombrio']);
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[1], 'tom'), ['Lírico', 'Sombrio']);
        assert.equal(db.etiquetas.length, 2);
    });
    it('remove só as pedidas e não cria registro, nem de texto no formato antigo', async () => {
        const { removerEtiquetasDosTextos } = await import('../js/etiquetas.js');
        const db = { poemas: [{ id: 1, sinalizacoesTom: 'Lírico, Sombrio, Épico' }], prosas: [] };
        const r = removerEtiquetasDosTextos(db, db.poemas, 'tom', [
            'lirico',
            'Épico',
            'Inexistente',
        ]);
        assert.deepEqual(r, { vinculos: 2, textos: 1 });
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'tom'), ['Sombrio']);
        assert.equal(db.etiquetas.length, 3, 'a etiqueta continua no cadastro');
    });
    it('categoria inválida não faz nada', async () => {
        const { adicionarEtiquetasAosTextos } = await import('../js/etiquetas.js');
        const db = { poemas: [{ id: 1 }], prosas: [] };
        assert.deepEqual(adicionarEtiquetasAosTextos(db, db.poemas, 'tema', ['A']), {
            vinculos: 0,
            textos: 0,
        });
    });
});

describe('importação de outro arquivo', () => {
    it('traduz ids pelo cadastro do arquivo, aceita nomes e texto antigo', async () => {
        const { nomesDeEtiquetasDaOrigem } = await import('../js/etiquetas.js');
        const payload = { etiquetas: [{ id: 7, nome: 'Lírico', categoria: 'tom' }] };
        assert.deepEqual(nomesDeEtiquetasDaOrigem(payload, [7, 8, 'Sombrio']), [
            'Lírico',
            'Sombrio',
        ]);
        assert.deepEqual(nomesDeEtiquetasDaOrigem({}, 'a, B ,a'), ['a', 'B']);
        assert.deepEqual(nomesDeEtiquetasDaOrigem(payload, undefined), []);
    });
});
