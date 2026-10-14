import './helpers/localstorage-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { classificarImportacaoAditiva } from '../js/importar-aditivo.js';
import { definirExibirOcultasDosPeriodos } from '../js/ocultas-periodos.js';

function dbBase(epocas) {
    return {
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas,
        periodosHistoricos: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
    };
}

function payloadComPeriodo(nomeEpoca) {
    return {
        itens: [
            {
                id: 1,
                tipo: 'poema',
                titulo: 'Texto de teste',
                texto: 'texto qualquer',
                pessoas: [],
                autoria: [],
                gruposDiretosResolvidos: [],
                livrosResolvidos: [],
                contexto: { livro: null, parte: null, secao: null },
                epocaRetratada: { epocaId: 7, nomeEpoca },
            },
        ],
    };
}

const refEpoca = (relatorio) =>
    relatorio.itensOrigem[0].referencias.find((r) => r.campo === 'epocaRetratada.epocaId');

describe('Importação aditiva: Período Biográfico oculto no destino', () => {
    beforeEach(() => definirExibirOcultasDosPeriodos(false));
    afterEach(() => definirExibirOcultasDosPeriodos(false));

    it('nome igual a período oculto casa com ele, sem criar duplicata visível', () => {
        const db = dbBase([{ id: 5, nome: 'Namoro', oculto: true }]);
        const ref = refEpoca(classificarImportacaoAditiva(payloadComPeriodo('Namoro'), db));
        assert.equal(ref.decisao, 'casar');
        assert.equal(ref.entidadeDestinoId, 5);
        assert.equal(ref.candidatos[0].oculto, true);
    });

    it('candidato de período visível não leva a marca de oculto', () => {
        const db = dbBase([{ id: 5, nome: 'Namoro' }]);
        const ref = refEpoca(classificarImportacaoAditiva(payloadComPeriodo('Namoro'), db));
        assert.equal(ref.decisao, 'casar');
        assert.equal('oculto' in ref.candidatos[0], false);
    });

    it('semelhança por substring não oferece período oculto', () => {
        const db = dbBase([{ id: 5, nome: 'Namoro com Fulano', oculto: true }]);
        const ref = refEpoca(classificarImportacaoAditiva(payloadComPeriodo('Namoro'), db));
        assert.deepEqual(ref.candidatos, []);
        assert.equal(ref.decisao, 'criar');
    });

    it('semelhança por substring oferece o oculto com Mostrar ocultas ligado', () => {
        definirExibirOcultasDosPeriodos(true);
        const db = dbBase([{ id: 5, nome: 'Namoro com Fulano', oculto: true }]);
        const ref = refEpoca(classificarImportacaoAditiva(payloadComPeriodo('Namoro'), db));
        assert.equal(ref.candidatos.length, 1);
        assert.equal(ref.candidatos[0].match, 'aproximado');
        assert.equal(ref.candidatos[0].oculto, true);
    });

    it('semelhança por substring continua valendo para período visível', () => {
        const db = dbBase([{ id: 5, nome: 'Namoro com Fulano' }]);
        const ref = refEpoca(classificarImportacaoAditiva(payloadComPeriodo('Namoro'), db));
        assert.equal(ref.candidatos.length, 1);
        assert.equal(ref.decisao, null);
    });
});
