import './helpers/dom-real.js';

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// F1-D7, parte 1: a ficha da Pessoa (gênero, cis/trans, cor/raça) viaja no
// JSON exportado por texto e a Importação Aditiva casa pelo nome e só
// preenche o que estava vazio. `.md`, `.csv` e Visualização não levam a ficha.

const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');
const {
    normalizarFichaPessoa,
    completarPessoaComFicha,
    isIncluirDadosPessoaisAtivo,
    toggleIncluirDadosPessoais,
    avisoDadosPessoaisOmitidos,
} = await import('../js/pessoas-viagem.js');
const { aplicarImportacaoAditiva, classificarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');

function dbDestino(pessoas = []) {
    return {
        poemas: [],
        prosas: [],
        pessoas,
        grupos: [],
        autores: [],
        epocas: [],
        periodosHistoricos: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
    };
}

function depsFake() {
    return {
        tirarSnapshotSeNecessario: mock.fn(async () => true),
        save: mock.fn(() => {}),
    };
}

async function importar(payload, destino) {
    const relatorio = classificarImportacaoAditiva(payload, destino);
    return aplicarImportacaoAditiva(payload, relatorio, destino, depsFake());
}

function registroComPessoa(ficha) {
    db.pessoas = [{ id: 7, nome: 'Pedro Maia', grupoIds: [], ...ficha }];
    return montarRegistro('poema', {
        id: 42,
        titulo: 'Movimento Circular',
        texto: 'x',
        pessoas: [{ pessoaId: 7, papeis: ['Dedicatário(a)'] }],
    });
}

describe('normalizarFichaPessoa / completarPessoaComFicha', () => {
    it('valor fora das listas vira vazio; gênero é aparado', () => {
        assert.deepEqual(
            normalizarFichaPessoa({ genero: '  Mulher ', identidadeCisTrans: 'x', corRaca: 'y' }),
            { genero: 'Mulher', orientacao: '', identidadeCisTrans: '', corRaca: '' },
        );
        assert.deepEqual(normalizarFichaPessoa(null), {
            genero: '',
            orientacao: '',
            identidadeCisTrans: '',
            corRaca: '',
        });
    });

    it('só preenche o que estava vazio, nunca sobrescreve', () => {
        const p = { id: 1, nome: 'A', genero: 'Homem', identidadeCisTrans: '' };
        const mudou = completarPessoaComFicha(p, {
            genero: 'Mulher',
            identidadeCisTrans: 'Transgênero',
        });
        assert.equal(mudou, true);
        assert.equal(p.genero, 'Homem');
        assert.equal(p.identidadeCisTrans, 'Transgênero');
        assert.equal(p.corRaca, '');
    });
});

describe('exportação por texto', () => {
    beforeEach(() => {
        db.grupos = [];
    });

    it('o vínculo leva nome e a ficha da Pessoa', () => {
        const reg = registroComPessoa({
            genero: 'Homem',
            identidadeCisTrans: 'Cisgênero',
            corRaca: 'Preta',
        });
        assert.equal(reg.pessoas[0].nome, 'Pedro Maia');
        assert.equal(reg.pessoas[0].genero, 'Homem');
        assert.equal(reg.pessoas[0].identidadeCisTrans, 'Cisgênero');
        assert.equal(reg.pessoas[0].corRaca, 'Preta');
        assert.deepEqual(reg.pessoas[0].papeis, ['Dedicatário(a)']);
    });

    it('Pessoa sem ficha sai com os três campos vazios', () => {
        const reg = registroComPessoa({});
        assert.equal(reg.pessoas[0].genero, '');
        assert.equal(reg.pessoas[0].identidadeCisTrans, '');
        assert.equal(reg.pessoas[0].corRaca, '');
    });

    it('o .md continua só com nome e papel', () => {
        const reg = registroComPessoa({ genero: 'Homem', corRaca: 'Preta' });
        const md = itemParaMarkdown(reg);
        assert.ok(md.includes('Pedro Maia'));
        assert.ok(!md.includes('Preta'));
        assert.ok(!md.includes('Homem'));
    });
});

describe('Importação Aditiva', () => {
    it('Pessoa nova nasce com a ficha completa', async () => {
        const reg = registroComPessoa({
            genero: 'Homem',
            identidadeCisTrans: 'Cisgênero',
            corRaca: 'Preta',
        });
        const destino = dbDestino();
        const r = await importar({ itens: [reg] }, destino);
        assert.equal(r.sucesso, true);
        assert.equal(destino.pessoas.length, 1);
        assert.equal(destino.pessoas[0].genero, 'Homem');
        assert.equal(destino.pessoas[0].identidadeCisTrans, 'Cisgênero');
        assert.equal(destino.pessoas[0].corRaca, 'Preta');
    });

    it('Pessoa que já existe (casada pelo nome) só preenche o vazio', async () => {
        const reg = registroComPessoa({
            genero: 'Mulher',
            identidadeCisTrans: 'Transgênero',
            corRaca: 'Parda',
        });
        const destino = dbDestino([
            { id: 900, nome: 'Pedro Maia', grupoIds: [], genero: 'Homem', corRaca: '' },
        ]);
        await importar({ itens: [reg] }, destino);
        assert.equal(destino.pessoas.length, 1);
        assert.equal(destino.pessoas[0].genero, 'Homem'); // não sobrescreve
        assert.equal(destino.pessoas[0].identidadeCisTrans, 'Transgênero');
        assert.equal(destino.pessoas[0].corRaca, 'Parda');
    });

    it('JSON antigo (sem os campos) cria a Pessoa só com nome, ficha vazia', async () => {
        const reg = registroComPessoa({});
        reg.pessoas = [{ pessoaId: 7, papeis: ['Retratado(a)'], nome: 'Pedro Maia' }];
        const destino = dbDestino();
        await importar({ itens: [reg] }, destino);
        assert.equal(destino.pessoas[0].nome, 'Pedro Maia');
        assert.equal(destino.pessoas[0].genero, '');
        assert.equal(destino.pessoas[0].identidadeCisTrans, '');
        assert.equal(destino.pessoas[0].corRaca, '');
    });

    it('valor fora da lista no arquivo vira vazio no destino', async () => {
        const reg = registroComPessoa({});
        reg.pessoas[0].identidadeCisTrans = 'qualquer';
        reg.pessoas[0].corRaca = 'qualquer';
        const destino = dbDestino();
        await importar({ itens: [reg] }, destino);
        assert.equal(destino.pessoas[0].identidadeCisTrans, '');
        assert.equal(destino.pessoas[0].corRaca, '');
    });

    it('a mesma Pessoa em dois textos do lote é criada uma vez', async () => {
        const reg = registroComPessoa({ corRaca: 'Preta' });
        const reg2 = { ...reg, id: 43, titulo: 'Outro' };
        const destino = dbDestino();
        await importar({ itens: [reg, reg2] }, destino);
        assert.equal(destino.pessoas.length, 1);
        assert.equal(destino.pessoas[0].corRaca, 'Preta');
    });
});

describe('chave "Incluir dados pessoais das Pessoas nos JSON" (parte 2)', () => {
    beforeEach(() => {
        db.grupos = [];
        toggleIncluirDadosPessoais(true);
    });

    it('o padrão é ligada', () => {
        localStorage.removeItem('arquivoPoetico_incluirDadosPessoaisPessoas');
        assert.equal(isIncluirDadosPessoaisAtivo(), true);
    });

    it('desligada, o vínculo sai sem a ficha (campos ausentes) e com nome e papel', () => {
        const ficha = { genero: 'Homem', identidadeCisTrans: 'Cisgênero', corRaca: 'Preta' };
        toggleIncluirDadosPessoais(false);
        assert.equal(isIncluirDadosPessoaisAtivo(), false);
        const reg = registroComPessoa(ficha);
        assert.equal(reg.pessoas[0].nome, 'Pedro Maia');
        assert.deepEqual(reg.pessoas[0].papeis, ['Dedicatário(a)']);
        ['genero', 'identidadeCisTrans', 'corRaca'].forEach((k) => {
            assert.equal(k in reg.pessoas[0], false);
        });
    });

    it('religada, a ficha volta ao JSON', () => {
        toggleIncluirDadosPessoais(false);
        toggleIncluirDadosPessoais(true);
        const reg = registroComPessoa({ corRaca: 'Preta' });
        assert.equal(reg.pessoas[0].corRaca, 'Preta');
    });

    it('o backup completo (acervo inteiro) nunca omite', () => {
        toggleIncluirDadosPessoais(false);
        registroComPessoa({ genero: 'Homem', corRaca: 'Preta' });
        const backup = JSON.parse(JSON.stringify(db));
        assert.equal(backup.pessoas[0].genero, 'Homem');
        assert.equal(backup.pessoas[0].corRaca, 'Preta');
    });

    it('JSON sem a ficha importa normalmente: Pessoa nasce só com o nome', async () => {
        toggleIncluirDadosPessoais(false);
        const reg = registroComPessoa({ genero: 'Homem', corRaca: 'Preta' });
        const destino = dbDestino();
        await importar({ itens: [reg] }, destino);
        assert.equal(destino.pessoas[0].nome, 'Pedro Maia');
        assert.equal(destino.pessoas[0].genero, '');
        assert.equal(destino.pessoas[0].corRaca, '');
    });

    it('o aviso só aparece com a chave desligada e algum vínculo de Pessoa', () => {
        const comPessoa = [{ pessoas: [{ pessoaId: 1 }] }];
        assert.equal(avisoDadosPessoaisOmitidos(comPessoa), '');
        toggleIncluirDadosPessoais(false);
        assert.match(avisoDadosPessoaisOmitidos(comPessoa), /ficaram de fora/);
        assert.equal(avisoDadosPessoaisOmitidos([{ pessoas: [] }]), '');
        assert.equal(avisoDadosPessoaisOmitidos([]), '');
    });
});
