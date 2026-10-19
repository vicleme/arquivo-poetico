// Importar campos por .json aceita `jargaoGiria` (campo do grupo Idioma).
// Soma, sem cadastro, e marca no relatório o termo novo.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    lerArquivoDeCampos,
    executarImportacaoCampos,
    preverImportacaoCampos,
} from '../js/importar-campos.js';
import { gerarModeloCampos } from '../js/modelo-importar-campos.js';

function montar() {
    return {
        poemas: [
            { id: 1, titulo: 'Gen Z', jargaoGiria: ['Gíria de internet'] },
            { id: 2, titulo: 'Vulgarize!' },
            { id: 3, titulo: 'Canteiro de Íris' },
        ],
        prosas: [{ id: 10, titulo: 'Crônica Azul' }],
        temas: [],
        etiquetas: [],
        assuntos: [],
        locais: [],
        pessoas: [],
    };
}

function importar(db, textos, opcoes) {
    const lido = lerArquivoDeCampos({ textos });
    assert.equal(lido.ok, true);
    return executarImportacaoCampos(db, lido.entradas, opcoes);
}

describe('leitura de jargaoGiria', () => {
    it('lê lista, texto separado por vírgula e as chaves alternativas', () => {
        const lido = lerArquivoDeCampos({
            textos: [
                { titulo: 'A', jargaoGiria: ['Gíria juvenil', '  Jargão corporativo '] },
                { titulo: 'B', jargao_giria: 'Gíria de internet; Linguagem de fandom' },
                { titulo: 'C', 'jargão e gíria': ['Gíria juvenil'] },
            ],
        });
        assert.deepEqual(lido.entradas[0].jargaoGiria, ['Gíria juvenil', 'Jargão corporativo']);
        assert.deepEqual(lido.entradas[1].jargaoGiria, [
            'Gíria de internet',
            'Linguagem de fandom',
        ]);
        assert.deepEqual(lido.entradas[2].jargaoGiria, ['Gíria juvenil']);
    });

    it('junta repetidos sem diferenciar caixa nem acento e ignora vazios', () => {
        const lido = lerArquivoDeCampos({
            textos: [{ titulo: 'A', jargaoGiria: ['Gíria juvenil', 'GIRIA JUVENIL', '', '  '] }],
        });
        assert.deepEqual(lido.entradas[0].jargaoGiria, ['Gíria juvenil']);
    });

    it('formato errado vai para os problemas e deixa o resto da entrada de pé', () => {
        const lido = lerArquivoDeCampos({
            textos: [
                { titulo: 'A', jargaoGiria: { x: 1 } },
                { titulo: 'B', jargaoGiria: ['Gíria juvenil', 7, { a: 1 }] },
            ],
        });
        assert.deepEqual(lido.entradas[0].jargaoGiria, []);
        assert.equal(lido.entradas[0].problemas[0].campo, 'jargaoGiria');
        assert.equal(lido.entradas[0].problemas[0].motivo, 'formato-invalido');
        assert.deepEqual(lido.entradas[1].jargaoGiria, ['Gíria juvenil']);
        assert.equal(lido.entradas[1].problemas.length, 2);
    });

    it('entrada só com jargaoGiria não é "sem campos"', () => {
        const db = montar();
        const r = importar(db, [{ id: 2, jargaoGiria: ['Gíria juvenil'] }]);
        assert.equal(r.itens[0].avisos.includes('entrada-sem-campos'), false);
    });
});

describe('aplicação de jargaoGiria', () => {
    it('soma ao texto sem apagar o que já tinha', () => {
        const db = montar();
        importar(db, [{ id: 1, jargaoGiria: ['Gíria juvenil'] }]);
        assert.deepEqual(db.poemas[0].jargaoGiria, ['Gíria de internet', 'Gíria juvenil']);
    });

    it('termo que o texto já tem (outra caixa ou acento) não duplica e vai para "já tinha"', () => {
        const db = montar();
        const r = importar(db, [{ id: 1, jargaoGiria: ['gíria DE INTERNET'] }]);
        assert.deepEqual(db.poemas[0].jargaoGiria, ['Gíria de internet']);
        assert.equal(r.itens[0].jaTinha.jargaoGiria.length, 1);
        assert.equal(r.itens[0].adicionados.jargaoGiria.length, 0);
        assert.equal(r.itens[0].mudou, false);
    });

    it('texto sem o campo ganha a lista; texto sem entrada não ganha chave', () => {
        const db = montar();
        importar(db, [{ id: 2, jargaoGiria: ['Gíria juvenil'] }]);
        assert.deepEqual(db.poemas[1].jargaoGiria, ['Gíria juvenil']);
        assert.equal('jargaoGiria' in db.poemas[2], false);
    });

    it('funciona em Prosa', () => {
        const db = montar();
        importar(db, [{ id: 10, tipo: 'prosa', jargaoGiria: ['Jargão corporativo'] }]);
        assert.deepEqual(db.prosas[0].jargaoGiria, ['Jargão corporativo']);
    });

    it('marca como novo só o termo que não é semente nem já está no acervo', () => {
        const db = montar();
        const r = importar(db, [
            { id: 2, jargaoGiria: ['Gíria juvenil', 'Gíria de internet', 'Giria de balada'] },
        ]);
        const porNome = Object.fromEntries(
            r.itens[0].adicionados.jargaoGiria.map((j) => [j.nome, j.nova]),
        );
        assert.deepEqual(porNome, {
            'Gíria juvenil': false,
            'Gíria de internet': false,
            'Giria de balada': true,
        });
        assert.deepEqual(r.cadastroNovo.jargaoGiria, ['Giria de balada']);
    });

    it('o mesmo termo novo em dois textos aparece uma vez em "novos"', () => {
        const db = montar();
        const r = importar(db, [
            { id: 2, jargaoGiria: ['Giria de balada'] },
            { id: 3, jargaoGiria: ['giria de balada'] },
        ]);
        assert.deepEqual(r.cadastroNovo.jargaoGiria, ['Giria de balada']);
        assert.equal(r.resumo.vinculosJargaoGiria, 2);
    });

    it('não mexe nos campos de idioma nem cria cadastro', () => {
        const db = montar();
        db.poemas[1].idiomas = [{ idioma: 'Português', papel: 'principal', dialetos: ['Carioca'] }];
        const antes = structuredClone(db.poemas[1].idiomas);
        importar(db, [{ id: 2, jargaoGiria: ['Gíria juvenil'] }]);
        assert.deepEqual(db.poemas[1].idiomas, antes);
        assert.deepEqual(db.temas, []);
        assert.deepEqual(db.etiquetas, []);
    });

    it('a prévia não muda o acervo e Desfazer devolve o texto como estava', () => {
        const db = montar();
        const lido = lerArquivoDeCampos({
            textos: [
                { id: 1, jargaoGiria: ['Gíria juvenil'] },
                { id: 2, jargaoGiria: ['Gíria juvenil'] },
            ],
        });
        const original = structuredClone(db);
        const previa = preverImportacaoCampos(db, lido.entradas);
        assert.equal(previa.resumo.vinculosJargaoGiria, 2);
        assert.deepEqual(db, original);

        const r = executarImportacaoCampos(db, lido.entradas);
        assert.deepEqual(db.poemas[0].jargaoGiria, ['Gíria de internet', 'Gíria juvenil']);
        r.desfazer();
        assert.deepEqual(db, original);
        assert.equal('jargaoGiria' in db.poemas[1], false);
    });

    it('conta como alteração do texto e convive com outros campos do mesmo texto', () => {
        const db = montar();
        const r = importar(db, [
            { id: 2, jargaoGiria: ['Gíria juvenil'], pendencia: 'revisar métrica' },
        ]);
        assert.equal(r.itens[0].mudou, true);
        assert.equal(db.poemas[1].pendencia, 'revisar métrica');
        assert.deepEqual(db.poemas[1].jargaoGiria, ['Gíria juvenil']);
        assert.equal(r.resumo.alterados, 1);
    });
});

describe('modelo baixável', () => {
    it('explica o campo, traz exemplo e sugestões, e o modelo continua sem importar nada', () => {
        const m = gerarModeloCampos(null);
        assert.ok(m.como_usar.some((l) => l.includes('"jargaoGiria"') && l.includes('FALA COM')));
        assert.deepEqual(m.valores_aceitos.sugestoes_jargao_giria, [
            'Gíria de internet',
            'Gíria juvenil',
            'Jargão corporativo',
            'Linguagem de fandom',
        ]);
        assert.ok(m.exemplos.some((x) => Array.isArray(x.jargaoGiria)));
        const lido = lerArquivoDeCampos(JSON.parse(JSON.stringify(m)));
        assert.deepEqual(lido.entradas, []);
    });

    it('com vocabulário, leva as sementes e os termos já usados no acervo', () => {
        const db = montar();
        db.prosas[0].jargaoGiria = ['Giria de balada'];
        const m = gerarModeloCampos(db, { comVocabulario: true });
        assert.deepEqual(m.vocabulario.jargaoGiria, [
            'Giria de balada',
            'Gíria de internet',
            'Gíria juvenil',
            'Jargão corporativo',
            'Linguagem de fandom',
        ]);
    });
});
