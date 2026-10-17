// Importar campos por .json: ligações Tema → Assunto (`ligacoes`), lógica pura.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirTema } from '../js/temas.js';
import {
    lerArquivoDeCampos,
    executarImportacaoCampos,
    preverImportacaoCampos,
} from '../js/importar-campos.js';

function texto(id, titulo) {
    return {
        id,
        titulo,
        temas: [],
        sinalizacoesTema: '',
        assuntosPapel: [],
        assuntosExcluidos: [],
    };
}

function montar() {
    const dbRef = {
        poemas: [texto(1, 'Olhar Lírico'), texto(2, 'Caveira')],
        prosas: [],
        temas: [],
        etiquetas: [],
        assuntos: [],
    };
    const saudade = garantirTema(dbRef, 'Saudade');
    garantirTema(dbRef, 'Memória');
    dbRef.assuntos.push(
        { id: 100, nome: 'Tempo, memória e perda', notas: '', temaIds: [saudade] },
        { id: 101, nome: 'Vida emocional', notas: '', temaIds: [] },
    );
    return dbRef;
}

const ler = (payload) => lerArquivoDeCampos(payload);
const rodar = (dbRef, payload, opcoes = {}) => {
    const lido = ler(payload);
    return executarImportacaoCampos(dbRef, lido.entradas, {
        ligacoes: lido.ligacoes,
        problemasLigacoes: lido.problemasLigacoes,
        ...opcoes,
    });
};
const temaId = (dbRef, nome) => dbRef.temas.find((t) => t.nome === nome).id;
const assunto = (dbRef, nome) => dbRef.assuntos.find((a) => a.nome === nome);

describe('lerArquivoDeCampos: ligacoes', () => {
    it('aceita arquivo só com ligacoes (sem textos) e soma vários assuntos de um tema', () => {
        const r = ler({
            ligacoes: [
                { tema: 'Memória', assunto: 'Tempo, memória e perda' },
                { tema: 'Saudade', assuntos: ['Vida emocional', 'Tempo, memória e perda'] },
            ],
        });
        assert.equal(r.ok, true);
        assert.deepEqual(r.entradas, []);
        assert.equal(r.ligacoes.length, 3);
        assert.deepEqual(r.ligacoes[1], { tema: 'Saudade', assunto: 'Vida emocional' });
    });

    it('sem textos e sem ligacoes continua inválido; ligacoes mal formada vira problema', () => {
        assert.equal(ler({ formato: 'x' }).ok, false);
        const r = ler({
            textos: [],
            ligacoes: ['solta', { tema: 'Saudade' }, { assunto: 'Vida emocional' }],
        });
        assert.equal(r.ok, true);
        assert.equal(r.ligacoes.length, 0);
        assert.equal(r.problemasLigacoes.length, 3);
        assert.ok(r.problemasLigacoes.every((p) => p.motivo === 'formato-invalido'));
        assert.equal(ler({ textos: [], ligacoes: 'x' }).problemasLigacoes.length, 1);
    });
});

describe('executarImportacaoCampos: ligacoes', () => {
    it('liga Tema existente a Assunto existente, sem mexer em texto, e é idempotente', () => {
        const dbRef = montar();
        const r = rodar(dbRef, {
            textos: [],
            ligacoes: [{ tema: 'memoria', assunto: 'tempo, memoria e perda' }],
        });
        assert.deepEqual(assunto(dbRef, 'Tempo, memória e perda').temaIds, [
            temaId(dbRef, 'Saudade'),
            temaId(dbRef, 'Memória'),
        ]);
        assert.equal(r.resumo.ligacoesFeitas, 1);
        assert.equal(r.resumo.alterados, 0);
        assert.deepEqual(r.ligacoes.feitas, [
            { tema: 'Memória', assunto: 'Tempo, memória e perda', temaNovo: false },
        ]);

        const de_novo = rodar(dbRef, {
            ligacoes: [{ tema: 'Memória', assunto: 'Tempo, memória e perda' }],
        });
        assert.equal(de_novo.resumo.ligacoesFeitas, 0);
        assert.equal(de_novo.resumo.ligacoesJaExistiam, 1);
        assert.equal(assunto(dbRef, 'Tempo, memória e perda').temaIds.length, 2);
    });

    it('Assunto que não existe nunca é criado e Tema fora do cadastro e do arquivo não é criado', () => {
        const dbRef = montar();
        const r = rodar(dbRef, {
            ligacoes: [
                { tema: 'Memória', assunto: 'Assunto Fantasma' },
                { tema: 'Tema Fantasma', assunto: 'Vida emocional' },
            ],
        });
        assert.equal(dbRef.assuntos.length, 2);
        assert.equal(
            dbRef.temas.some((t) => t.nome === 'Tema Fantasma'),
            false,
        );
        assert.deepEqual(
            r.ligacoes.problemas.map((p) => p.motivo),
            ['assunto-inexistente', 'tema-inexistente'],
        );
        assert.equal(r.resumo.ligacoesFeitas, 0);
        assert.equal(r.resumo.ligacoesComProblema, 2);
    });

    it('Tema novo trazido por um texto já vale em `assuntos` no mesmo arquivo', () => {
        const dbRef = montar();
        const r = rodar(dbRef, {
            textos: [
                {
                    id: 1,
                    temas: [{ tema: 'Efemeridade', papel: 'principal' }],
                    assuntos: [{ assunto: 'Tempo, memória e perda', papel: 'secundario' }],
                },
            ],
            ligacoes: [{ tema: 'Efemeridade', assunto: 'Tempo, memória e perda' }],
        });
        const novo = temaId(dbRef, 'Efemeridade');
        assert.ok(assunto(dbRef, 'Tempo, memória e perda').temaIds.includes(novo));
        assert.deepEqual(dbRef.poemas[0].assuntosPapel, [{ assuntoId: 100, papel: 'secundario' }]);
        assert.deepEqual(r.itens[0].problemas, []);
        // o Tema continua contando como novo, uma vez só, e entra no cadastro novo
        assert.equal(r.itens[0].adicionados.temas[0].nova, true);
        assert.deepEqual(r.cadastroNovo.temas, ['Efemeridade']);
        assert.equal(r.ligacoes.feitas[0].temaNovo, true);
    });

    it('sem a ligação, o mesmo arquivo recusa o Assunto (a ligação é que o torna válido)', () => {
        const dbRef = montar();
        const r = rodar(dbRef, {
            textos: [
                {
                    id: 1,
                    temas: [{ tema: 'Efemeridade' }],
                    assuntos: [{ assunto: 'Tempo, memória e perda', papel: 'secundario' }],
                },
            ],
        });
        assert.equal(r.itens[0].problemas[0].motivo, 'assunto-sem-tema-no-texto');
    });

    it('Tema de texto que não foi achado não é criado pelas ligações', () => {
        const dbRef = montar();
        const r = rodar(dbRef, {
            textos: [{ titulo: 'Não Existe', temas: [{ tema: 'Efemeridade' }] }],
            ligacoes: [{ tema: 'Efemeridade', assunto: 'Vida emocional' }],
        });
        assert.equal(
            dbRef.temas.some((t) => t.nome === 'Efemeridade'),
            false,
        );
        assert.equal(r.ligacoes.problemas[0].motivo === 'tema-inexistente', true);
    });

    it('problemas de leitura das ligações entram no relatório', () => {
        const dbRef = montar();
        const r = rodar(dbRef, { ligacoes: [{ tema: 'Saudade' }] });
        assert.equal(r.resumo.ligacoesComProblema, 1);
        assert.equal(r.ligacoes.problemas[0].motivo, 'formato-invalido');
    });

    it('desfazer devolve os Assuntos e os Temas ao que eram', () => {
        const dbRef = montar();
        const antes = structuredClone({ assuntos: dbRef.assuntos, temas: dbRef.temas });
        const r = rodar(dbRef, {
            textos: [{ id: 1, temas: [{ tema: 'Efemeridade' }] }],
            ligacoes: [
                { tema: 'Efemeridade', assunto: 'Vida emocional' },
                { tema: 'Memória', assunto: 'Vida emocional' },
            ],
        });
        assert.equal(assunto(dbRef, 'Vida emocional').temaIds.length, 2);
        r.desfazer();
        assert.deepEqual(dbRef.assuntos, antes.assuntos);
        assert.deepEqual(dbRef.temas, antes.temas);
        assert.deepEqual(dbRef.poemas[0].temas, []);
    });

    it('a prévia não muda o acervo', () => {
        const dbRef = montar();
        const antes = structuredClone(dbRef);
        const lido = ler({
            textos: [{ id: 1, temas: [{ tema: 'Efemeridade' }] }],
            ligacoes: [
                { tema: 'Efemeridade', assunto: 'Vida emocional' },
                { tema: 'Memória', assunto: 'Vida emocional' },
            ],
        });
        const r = preverImportacaoCampos(dbRef, lido.entradas, { ligacoes: lido.ligacoes });
        assert.equal(r.resumo.ligacoesFeitas, 2);
        assert.deepEqual(dbRef, antes);
    });
});
