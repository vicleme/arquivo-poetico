import './helpers/localstorage-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    CANAL_ESVAZIAR,
    CHAVE_AVISO_POS_ESVAZIAR,
    executarEsvaziamento,
    mostrarAvisoPosEsvaziar,
    ouvirEsvaziamentoDeOutraAba,
    textoAvisoPosEsvaziar,
} from '../js/apagar-acervo.js';
import { CHAVE_ACERVO, CHAVE_VERSOES_FILTRADAS } from '../js/inventario-armazenamento.js';
import {
    migrarMovimentosEscolasEmbutidos,
    migrarPeriodosHistoricosEmbutidos,
    migrarTemplatesEstruturaEmbutidos,
    bloquearSalvamento,
    desbloquearSalvamento,
    salvamentoBloqueado,
    save,
} from '../js/db.js';

// Fase 13, etapa 13c: apagar efetivo. Tudo com armazenamento falso e dependências
// injetadas, sem navegador: o que se prova aqui é a ORDEM, o que sobra em cada
// combinação das três caixas e o que acontece quando algo falha no meio.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');

function armazenamentoFalso(inicial = {}) {
    const dados = { ...inicial };
    return {
        dados,
        getItem: (k) => (k in dados ? dados[k] : null),
        setItem(k, v) {
            if (this.falharEm === k) throw new Error('quota');
            dados[k] = String(v);
        },
        removeItem(k) {
            if (this.falharRemocaoDe === k) throw new Error('bloqueado');
            delete dados[k];
        },
        key: (i) => Object.keys(dados)[i],
        get length() {
            return Object.keys(dados).length;
        },
    };
}

// Object.keys(armazenamento) precisa listar só as chaves guardadas.
function comoStorage(falso) {
    return new Proxy(falso, {
        ownKeys: () => Reflect.ownKeys(falso.dados),
        getOwnPropertyDescriptor: (_alvo, chave) =>
            chave in falso.dados
                ? { enumerable: true, configurable: true, value: falso.dados[chave] }
                : undefined,
    });
}

function historicoFalso(estado = null) {
    return {
        state: estado,
        replaceState(novo) {
            this.state = novo;
        },
    };
}

function dbDeTeste() {
    const periodosHistoricos = [];
    const movimentosEscolas = [];
    const templatesEstrutura = [];
    migrarPeriodosHistoricosEmbutidos(periodosHistoricos, []);
    migrarMovimentosEscolasEmbutidos(movimentosEscolas, []);
    migrarTemplatesEstruturaEmbutidos(templatesEstrutura, []);
    return {
        livros: [{ id: 1, titulo: 'L' }],
        partes: [],
        secoes: [],
        poemas: [{ id: 2, titulo: 'P' }],
        prosas: [],
        elementos: [],
        coletaneas: [],
        itensColetanea: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        assuntos: [{ id: 3, nome: 'A' }],
        temas: [],
        locais: [],
        personagens: [],
        ecosIgnorados: [],
        escansoes: [],
        estruturasTextuais: [],
        moldes: [],
        padroesColunas: { poemas: ['titulo'] },
        periodosHistoricos,
        periodosHistoricosOcultos: [],
        movimentosEscolas,
        movimentosEscolasOcultos: [],
        templatesEstrutura,
        templatesEstruturaOcultos: [],
        programaDeFabricaAplicado: true,
    };
}

function montar({ banco = dbDeTeste(), chaves = {}, sobrescrever = {} } = {}) {
    const falso = armazenamentoFalso({
        [CHAVE_ACERVO]: JSON.stringify(banco),
        [CHAVE_VERSOES_FILTRADAS]: '{"poema:2":"v"}',
        arquivoPoetico_tema: 'escuro',
        arquivoPoetico_itensPorPagina: '50',
        arquivoPoetico_colunas_poemas: '["titulo"]',
        arquivoPoetico_ultimoBackup: '2026-10-07T00:00:00.000Z',
        ...chaves,
    });
    const historico = historicoFalso();
    const registro = [];
    const deps = {
        db: banco,
        armazenamento: comoStorage(falso),
        historico,
        limparCapas: async () => registro.push('capas'),
        bloquear: () => registro.push('bloquear'),
        desbloquear: () => registro.push('desbloquear'),
        avisarOutrasAbas: () => registro.push('avisar'),
        recarregar: () => registro.push('recarregar'),
        ...sobrescrever,
    };
    return { banco, falso, historico, registro, deps };
}

const acervoGravado = (falso) => JSON.parse(falso.dados[CHAVE_ACERVO]);

describe('apagar acervo (13c): sem nada marcado', () => {
    it('não faz nada, nem bloqueia o salvamento', async () => {
        const { falso, registro, deps } = montar();
        const antes = { ...falso.dados };
        const r = await executarEsvaziamento({}, deps);
        assert.deepEqual(r, { apagado: false, motivo: 'sem-caixa' });
        assert.deepEqual(registro, []);
        assert.deepEqual(falso.dados, antes);
    });
});

describe('apagar acervo (13c): Dados', () => {
    it('regrava o acervo vazio (nunca remove a chave) e semeia nada de volta', async () => {
        const { falso, registro, deps } = montar();
        const r = await executarEsvaziamento({ dados: true }, deps);
        assert.equal(r.apagado, true);

        assert.ok(CHAVE_ACERVO in falso.dados, 'a chave do acervo continua existindo (F13-D9)');
        const gravado = acervoGravado(falso);
        for (const k of ['livros', 'poemas', 'assuntos', 'temas']) {
            assert.deepEqual(gravado[k], [], `${k} vazio`);
        }
        assert.deepEqual(gravado.padroesColunas, {});
        assert.ok(gravado.periodosHistoricos.length > 0, 'pré-prontos ficam (caixa desmarcada)');
        assert.deepEqual(registro, ['bloquear', 'capas', 'avisar', 'recarregar']);
    });

    it('remove versões alternativas e o registro do último backup; preferências ficam', async () => {
        const { falso, deps } = montar();
        await executarEsvaziamento({ dados: true }, deps);
        assert.equal(CHAVE_VERSOES_FILTRADAS in falso.dados, false);
        assert.equal('arquivoPoetico_ultimoBackup' in falso.dados, false);
        assert.equal(falso.dados.arquivoPoetico_tema, 'escuro');
        assert.equal(falso.dados.arquivoPoetico_colunas_poemas, '["titulo"]');
    });

    it('não toca no db em memória (só em uma cópia)', async () => {
        const { banco, deps } = montar();
        await executarEsvaziamento({ dados: true }, deps);
        assert.equal(banco.poemas.length, 1);
        assert.equal(banco.livros.length, 1);
    });
});

describe('apagar acervo (13c): Preferências', () => {
    it('remove só preferências: acervo, capas, versões e último backup intactos', async () => {
        const { falso, registro, deps } = montar();
        const acervoAntes = falso.dados[CHAVE_ACERVO];
        await executarEsvaziamento({ preferencias: true }, deps);

        assert.equal(falso.dados[CHAVE_ACERVO], acervoAntes, 'acervo nem foi regravado');
        assert.ok(CHAVE_VERSOES_FILTRADAS in falso.dados);
        assert.ok('arquivoPoetico_ultimoBackup' in falso.dados);
        for (const k of [
            'arquivoPoetico_tema',
            'arquivoPoetico_itensPorPagina',
            'arquivoPoetico_colunas_poemas',
        ]) {
            assert.equal(k in falso.dados, false, `${k} removida`);
        }
        assert.ok(!registro.includes('capas'), 'capas não são limpas');
    });

    it('chave sem classificação nunca é apagada', async () => {
        const { falso, deps } = montar({ chaves: { arquivoPoetico_chaveNovaSemInventario: 'x' } });
        await executarEsvaziamento({ preferencias: true }, deps);
        assert.equal(falso.dados.arquivoPoetico_chaveNovaSemInventario, 'x');
    });

    it('chave de outro app no mesmo navegador nunca é apagada', async () => {
        const { falso, deps } = montar({ chaves: { outroApp_tema: 'x' } });
        await executarEsvaziamento({ dados: true, preferencias: true, preProntos: true }, deps);
        assert.equal(falso.dados.outroApp_tema, 'x');
    });
});

describe('apagar acervo (13c): Pré-prontos e combinações', () => {
    it('só Pré-prontos: regrava o acervo com os de fábrica fora e registrados nos ocultos', async () => {
        const { falso, registro, deps } = montar();
        await executarEsvaziamento({ preProntos: true }, deps);
        const g = acervoGravado(falso);
        assert.deepEqual(g.periodosHistoricos, []);
        assert.deepEqual(g.movimentosEscolas, []);
        assert.ok(g.periodosHistoricosOcultos.length > 0, 'os nomes foram registrados');
        assert.equal(g.poemas.length, 1, 'textos intactos');
        assert.ok(CHAVE_VERSOES_FILTRADAS in falso.dados);
        assert.ok(!registro.includes('capas'));
    });

    it('recarregar não recoloca o que saiu: a migração respeita os ocultos', async () => {
        const { falso, deps } = montar();
        await executarEsvaziamento({ preProntos: true }, deps);
        const g = acervoGravado(falso);
        migrarPeriodosHistoricosEmbutidos(g.periodosHistoricos, g.periodosHistoricosOcultos);
        migrarMovimentosEscolasEmbutidos(g.movimentosEscolas, g.movimentosEscolasOcultos);
        migrarTemplatesEstruturaEmbutidos(g.templatesEstrutura, g.templatesEstruturaOcultos);
        assert.deepEqual(g.periodosHistoricos, []);
        assert.deepEqual(g.movimentosEscolas, []);
        assert.deepEqual(g.templatesEstrutura, []);
    });

    it('só Dados + recarregar: os de fábrica estão todos de volta (instalação nova)', async () => {
        const banco = dbDeTeste();
        banco.periodosHistoricosOcultos = [banco.periodosHistoricos[0].nome];
        banco.periodosHistoricos.shift();
        const { falso, deps } = montar({ banco });
        await executarEsvaziamento({ dados: true }, deps);
        const g = acervoGravado(falso);
        migrarPeriodosHistoricosEmbutidos(g.periodosHistoricos, g.periodosHistoricosOcultos);
        const completo = [];
        migrarPeriodosHistoricosEmbutidos(completo, []);
        assert.equal(g.periodosHistoricos.length, completo.length);
    });

    it('as três caixas: tudo some, o acervo fica regravado e a ordem é a combinada', async () => {
        const { falso, registro, historico, deps } = montar();
        const r = await executarEsvaziamento(
            { dados: true, preferencias: true, preProntos: true },
            deps,
        );
        assert.equal(r.apagado, true);
        assert.deepEqual(Object.keys(falso.dados), [CHAVE_ACERVO]);
        assert.deepEqual(registro, ['bloquear', 'capas', 'avisar', 'recarregar']);
        assert.match(historico.state[CHAVE_AVISO_POS_ESVAZIAR], /dados, preferências e cadastros/);
    });
});

describe('apagar acervo (13c): falhas no meio', () => {
    it('falha ao gravar o acervo: nada é apagado, trava solta, sem recarregar', async () => {
        const { falso, registro, deps } = montar();
        falso.falharEm = CHAVE_ACERVO;
        const antes = { ...falso.dados };
        const r = await executarEsvaziamento({ dados: true, preferencias: true }, deps);

        assert.equal(r.apagado, false);
        assert.equal(r.motivo, 'gravacao');
        assert.deepEqual(falso.dados, antes, 'nenhuma chave foi tocada');
        assert.deepEqual(registro, ['bloquear', 'desbloquear']);
    });

    it('falha ao limpar capas: o resto segue, a falha é avisada e a página recarrega', async () => {
        const { falso, historico, registro, deps } = montar({
            sobrescrever: {
                limparCapas: async () => {
                    throw new Error('idb');
                },
            },
        });
        const r = await executarEsvaziamento({ dados: true }, deps);
        assert.equal(r.apagado, true);
        assert.deepEqual(r.falhas, ['imagens de capa']);
        assert.equal(CHAVE_VERSOES_FILTRADAS in falso.dados, false, 'o resto foi apagado');
        assert.ok(registro.includes('recarregar'));
        assert.match(historico.state[CHAVE_AVISO_POS_ESVAZIAR], /imagens de capa/);
    });

    it('uma chave que não sai não impede as outras', async () => {
        const { falso, deps } = montar();
        falso.falharRemocaoDe = 'arquivoPoetico_tema';
        const r = await executarEsvaziamento({ preferencias: true }, deps);
        assert.equal(r.apagado, true);
        assert.deepEqual(r.falhas, ['arquivoPoetico_tema']);
        assert.equal('arquivoPoetico_itensPorPagina' in falso.dados, false);
    });

    it('histórico ou aviso às outras abas quebrados não impedem a recarga', async () => {
        const { registro, deps } = montar({
            sobrescrever: {
                historico: {
                    replaceState() {
                        throw new Error('negado');
                    },
                },
                avisarOutrasAbas: () => {
                    throw new Error('sem canal');
                },
            },
        });
        const r = await executarEsvaziamento({ preferencias: true }, deps);
        assert.equal(r.apagado, true);
        assert.ok(registro.includes('recarregar'));
    });
});

describe('apagar acervo (13c): trava de salvamento do db.js', () => {
    it('com a trava, save() não grava; sem ela, grava', async () => {
        // save() dispara um evento em `window` e tenta um retrato em IndexedDB
        // (best-effort); sem navegador, basta um window mínimo e silenciar o aviso.
        const windowAntes = globalThis.window;
        const avisoAntes = console.warn;
        globalThis.window = { dispatchEvent() {} };
        console.warn = () => {};
        try {
            localStorage.clear();
            desbloquearSalvamento();
            save();
            assert.ok(localStorage.getItem(CHAVE_ACERVO), 'save() normal grava');
            await new Promise((r) => setTimeout(r, 10));
        } finally {
            console.warn = avisoAntes;
            if (windowAntes === undefined) delete globalThis.window;
            else globalThis.window = windowAntes;
        }

        localStorage.clear();
        bloquearSalvamento();
        assert.equal(salvamentoBloqueado(), true);
        save();
        assert.equal(localStorage.getItem(CHAVE_ACERVO), null, 'save() travado não grava');

        desbloquearSalvamento();
        assert.equal(salvamentoBloqueado(), false);
    });
});

describe('apagar acervo (13c): outras abas', () => {
    function canalFalso() {
        const canal = { onmessage: null };
        return canal;
    }

    beforeEach(() => desbloquearSalvamento());

    it('ao receber o aviso: trava o salvamento, avisa e recarrega depois do atraso', async () => {
        const canal = canalFalso();
        const registro = [];
        let nomeDoCanal = null;
        ouvirEsvaziamentoDeOutraAba({
            criarCanal: (nome) => {
                nomeDoCanal = nome;
                return canal;
            },
            bloquear: () => registro.push('bloquear'),
            avisar: (t) => registro.push(['avisar', t]),
            recarregar: () => registro.push('recarregar'),
            atrasoMs: 5,
        });
        assert.equal(nomeDoCanal, CANAL_ESVAZIAR);

        canal.onmessage({ data: { tipo: 'esvaziado' } });
        assert.deepEqual(registro.slice(0, 2), ['bloquear', ['avisar', registro[1][1]]]);
        assert.match(registro[1][1], /esvaziado em outra aba/);
        assert.equal(registro.includes('recarregar'), false, 'só depois do atraso');
        await new Promise((r) => setTimeout(r, 20));
        assert.equal(registro[2], 'recarregar');
    });

    it('mensagem de outro tipo é ignorada', async () => {
        const canal = canalFalso();
        const registro = [];
        ouvirEsvaziamentoDeOutraAba({
            criarCanal: () => canal,
            bloquear: () => registro.push('bloquear'),
            recarregar: () => registro.push('recarregar'),
            atrasoMs: 1,
        });
        canal.onmessage({ data: { tipo: 'outra-coisa' } });
        canal.onmessage({ data: null });
        await new Promise((r) => setTimeout(r, 10));
        assert.deepEqual(registro, []);
    });

    it('sem BroadcastChannel no navegador: devolve null e não quebra', () => {
        assert.equal(ouvirEsvaziamentoDeOutraAba({ criarCanal: () => null }), null);
        assert.equal(
            ouvirEsvaziamentoDeOutraAba({
                criarCanal: () => {
                    throw new Error('nao suportado');
                },
            }),
            null,
        );
    });
});

describe('apagar acervo (13c): aviso depois da recarga', () => {
    it('mostra uma vez e apaga a marca, sem mexer no resto do estado', () => {
        const historico = historicoFalso({
            [CHAVE_AVISO_POS_ESVAZIAR]: 'Acervo esvaziado: dados.',
            outra: 1,
        });
        const mostrados = [];
        assert.equal(
            mostrarAvisoPosEsvaziar((t) => mostrados.push(t), historico),
            true,
        );
        assert.deepEqual(mostrados, ['Acervo esvaziado: dados.']);
        assert.deepEqual(historico.state, { outra: 1 });
        assert.equal(
            mostrarAvisoPosEsvaziar((t) => mostrados.push(t), historico),
            false,
        );
        assert.equal(mostrados.length, 1);
    });

    it('sem marca, não mostra nada', () => {
        const mostrar = () => assert.fail('não devia mostrar');
        assert.equal(mostrarAvisoPosEsvaziar(mostrar, historicoFalso()), false);
        assert.equal(mostrarAvisoPosEsvaziar(mostrar, historicoFalso({ outra: 1 })), false);
    });

    it('texto: uma caixa, duas e falhas', () => {
        assert.equal(textoAvisoPosEsvaziar({ dados: true }), 'Acervo esvaziado: dados.');
        assert.equal(
            textoAvisoPosEsvaziar({ dados: true, preferencias: true }),
            'Acervo esvaziado: dados e preferências.',
        );
        assert.match(
            textoAvisoPosEsvaziar({ preferencias: true }, ['arquivoPoetico_tema']),
            /não pôde ser apagado \(arquivoPoetico_tema\)/,
        );
    });
});

describe('apagar acervo (13c): código-fonte', () => {
    const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

    it('só save() grava a chave do acervo no db.js, e ele respeita a trava', () => {
        const fonte = ler('js/db.js');
        const gravacoes = fonte.match(/localStorage\.setItem\(DB_KEY/g) || [];
        assert.equal(gravacoes.length, 1, 'uma única gravação do acervo no db.js');
        const corpo = fonte.slice(fonte.indexOf('export function save() {'));
        assert.match(corpo.slice(0, 120), /if \(_salvamentoBloqueado\) return;/);
    });

    it('main.js registra o ouvinte de outras abas e o aviso pós-recarga', () => {
        const fonte = ler('js/main.js');
        assert.match(fonte, /ouvirEsvaziamentoDeOutraAba\(/);
        assert.match(fonte, /mostrarAvisoPosEsvaziar\(/);
    });
});
