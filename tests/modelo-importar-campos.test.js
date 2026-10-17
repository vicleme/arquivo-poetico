// Modelo .json da "Importar campos" (js/modelo-importar-campos.js).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirTema } from '../js/temas.js';
import { garantirEtiqueta } from '../js/etiquetas.js';
import { lerArquivoDeCampos, FORMATO_CAMPOS } from '../js/importar-campos.js';
import { gerarModeloCampos } from '../js/modelo-importar-campos.js';

function acervo() {
    const dbRef = { poemas: [], prosas: [], temas: [], etiquetas: [], assuntos: [] };
    const saudade = garantirTema(dbRef, 'Saudade');
    const perda = garantirTema(dbRef, 'Perda');
    garantirTema(dbRef, 'Amor');
    dbRef.assuntos.push(
        { id: 1, nome: 'Tempo, memória e perda', temaIds: [saudade, perda] },
        { id: 2, nome: 'Afetos', temaIds: [] },
    );
    garantirEtiqueta(dbRef, 'tom', 'Solar');
    garantirEtiqueta(dbRef, 'tom', 'Melancólico');
    garantirEtiqueta(dbRef, 'tradicao', 'Barroco');
    return dbRef;
}

describe('gerarModeloCampos', () => {
    it('traz o formato, a explicação, os valores aceitos e os exemplos, com "textos" vazio', () => {
        const m = gerarModeloCampos(null);
        assert.equal(m.formato, FORMATO_CAMPOS);
        assert.equal(m.versao, 1);
        assert.ok(Array.isArray(m.como_usar) && m.como_usar.length > 3);
        assert.deepEqual(m.valores_aceitos.categorias_de_etiqueta, [
            'Tradição',
            'Estilo',
            'Relação',
            'Sensibilidade',
            'Tom',
            'Domínio Imagético',
            'Outros',
        ]);
        assert.deepEqual(m.valores_aceitos.papel_do_tema, [
            'principal',
            'secundario',
            'indefinido',
        ]);
        assert.deepEqual(m.valores_aceitos.papel_do_assunto, [
            'automatico',
            'principal',
            'secundario',
            'indefinido',
            'nao-se-aplica',
        ]);
        assert.deepEqual(m.textos, []);
        assert.ok(m.exemplos.length >= 2);
        assert.equal('vocabulario' in m, false);
    });

    it('a leitura do modelo inteiro dá zero entradas (o exemplo não é importado sem querer)', () => {
        const lido = lerArquivoDeCampos(JSON.parse(JSON.stringify(gerarModeloCampos(null))));
        assert.equal(lido.ok, true);
        assert.deepEqual(lido.entradas, []);
        assert.deepEqual(lido.avisos, []);
    });

    it('os exemplos são válidos: lidos como "textos", não geram problema nenhum', () => {
        const { exemplos } = gerarModeloCampos(null);
        const lido = lerArquivoDeCampos({ textos: exemplos });
        assert.equal(lido.entradas.length, exemplos.length);
        assert.ok(lido.entradas.every((e) => e.problemas.length === 0));
        assert.ok(lido.entradas.some((e) => e.assuntos.some((a) => a.acao === 'excluir')));
        assert.ok(lido.entradas.some((e) => e.temas.some((t) => t.papel === 'principal')));
    });

    it('traz "ligacoes" vazia, a explicação e exemplos que a leitura aceita sem problema', () => {
        const m = gerarModeloCampos(null);
        assert.deepEqual(m.ligacoes, []);
        assert.ok(m.como_usar.some((l) => l.includes('"ligacoes"')));
        const lido = lerArquivoDeCampos({ textos: [], ligacoes: m.exemplos_ligacoes });
        assert.equal(lido.problemasLigacoes.length, 0);
        assert.equal(lido.ligacoes.length, 3);
        // o modelo inteiro continua sem importar nada sem querer
        const inteiro = lerArquivoDeCampos(JSON.parse(JSON.stringify(m)));
        assert.deepEqual(inteiro.ligacoes, []);
    });

    it('com vocabulário, leva etiquetas por categoria, temas e assuntos com seus temas, em ordem alfabética', () => {
        const m = gerarModeloCampos(acervo(), { comVocabulario: true });
        assert.deepEqual(m.vocabulario.etiquetas, {
            Tradição: ['Barroco'],
            Tom: ['Melancólico', 'Solar'],
        });
        assert.deepEqual(m.vocabulario.temas, ['Amor', 'Perda', 'Saudade']);
        assert.deepEqual(m.vocabulario.assuntos, [
            { assunto: 'Afetos', temas: [] },
            { assunto: 'Tempo, memória e perda', temas: ['Perda', 'Saudade'] },
        ]);
        // Continua sem nada para importar.
        assert.deepEqual(lerArquivoDeCampos(m).entradas, []);
    });

    it('sem vocabulário, o acervo nem é lido', () => {
        assert.doesNotThrow(() => gerarModeloCampos(undefined));
    });

    it('não usa travessão nos textos de explicação', () => {
        const texto = JSON.stringify(gerarModeloCampos(null));
        assert.equal(texto.includes('—'), false);
    });
});

describe('modelo: extras da entrega 3', () => {
    it('lista os papéis de pessoa e as grafias aceitas', () => {
        const m = gerarModeloCampos(null);
        assert.ok(m.valores_aceitos.papeis_da_pessoa.includes('Dedicatário(a)'));
        assert.deepEqual(m.valores_aceitos.grafia_da_fonte, [
            'atual',
            'etimológica',
            'quinhentista',
        ]);
        assert.ok(m.como_usar.some((l) => l.includes('territorialidade')));
        assert.ok(m.como_usar.some((l) => l.includes('pessoas')));
    });

    it('o exemplo com extras lê sem problema e continua fora de "textos"', () => {
        const m = gerarModeloCampos(null);
        const lido = lerArquivoDeCampos({ textos: m.exemplos });
        assert.ok(lido.entradas.every((e) => e.problemas.length === 0));
        assert.ok(lido.entradas.some((e) => e.territorialidade.length && e.pessoas.length));
        assert.deepEqual(lerArquivoDeCampos(m).entradas, []);
    });

    it('com vocabulário, leva locais com caminho e pessoas (sem as ocultas)', () => {
        const dbRef = {
            ...acervo(),
            locais: [
                { id: 1, nome: 'Brasil', tipo: 'País', pertenceA: [], notas: '' },
                { id: 2, nome: 'Santos', tipo: 'Cidade', pertenceA: [1], notas: '' },
            ],
            pessoas: [
                { id: 5, nome: 'Dani', oculto: false },
                { id: 6, nome: 'Reservada', oculto: true },
            ],
        };
        const m = gerarModeloCampos(dbRef, { comVocabulario: true });
        assert.deepEqual(m.vocabulario.locais, ['Brasil', 'Santos › Brasil']);
        assert.deepEqual(m.vocabulario.pessoas, ['Dani']);
    });
});
