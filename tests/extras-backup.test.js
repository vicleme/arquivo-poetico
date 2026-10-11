import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    FORMATO_EXTRAS,
    aplicarExtras,
    coletarExtras,
    dataParaNome,
    extrasTemConteudo,
    nomesDoBackup,
    resumirExtras,
    validarExtras,
} from '../js/extras-backup.js';
import { CHAVE_ACERVO, CHAVE_VERSOES_FILTRADAS } from '../js/inventario-armazenamento.js';

// Armazenamento falso: um objeto, com as mesmas três operações que o código usa.
function armazem(inicial = {}) {
    const dados = { ...inicial };
    return {
        dados,
        chaves: () => Object.keys(dados),
        ler: (c) => (c in dados ? dados[c] : null),
        escrever: (c, v) => {
            dados[c] = v;
        },
    };
}

const AGORA = new Date(2026, 9, 7, 19, 30);

describe('extras: nomes e data', () => {
    it('data local com zeros, e o par de arquivos leva a mesma data', () => {
        assert.equal(dataParaNome(new Date(2026, 0, 5)), '2026-01-05');
        assert.deepEqual(nomesDoBackup(AGORA), {
            acervo: 'arquivo_poetico_backup_2026-10-07.json',
            extras: 'arquivo_poetico_extras_2026-10-07.json',
        });
    });
});

describe('extras: coletar', () => {
    it('pega preferências do inventário, as versões e nada mais', () => {
        const a = armazem({
            [CHAVE_ACERVO]: '{"poemas":[]}',
            arquivoPoetico_tema: 'dark',
            arquivoPoetico_colunas_poemas: '["titulo"]',
            arquivoPoetico_est_filtros: '{"a":1}',
            arquivoPoetico_ultimoBackup: '2026-10-01T00:00:00Z',
            arquivoPoetico_chave_desconhecida: 'x',
            outroSite: 'y',
            [CHAVE_VERSOES_FILTRADAS]: JSON.stringify({ 'poema:1': { tipo: 'poema' } }),
        });
        const extras = coletarExtras(a.chaves(), a.ler, AGORA);
        assert.equal(extras.export_format, FORMATO_EXTRAS);
        assert.deepEqual(Object.keys(extras.preferencias), [
            'arquivoPoetico_colunas_poemas',
            'arquivoPoetico_est_filtros',
            'arquivoPoetico_tema',
        ]);
        assert.equal(extras.total_preferencias, 3);
        assert.equal(extras.total_versoes, 1);
        assert.deepEqual(extras.versoes, { 'poema:1': { tipo: 'poema' } });
        assert.equal(extras.gerado_em, AGORA.toISOString());
    });

    it('sem nada guardado, devolve vazio e sem conteúdo', () => {
        const a = armazem();
        const extras = coletarExtras(a.chaves(), a.ler, AGORA);
        assert.equal(extras.total_preferencias, 0);
        assert.equal(extras.total_versoes, 0);
        assert.equal(extrasTemConteudo(extras), false);
    });

    it('banco de versões corrompido não derruba a coleta', () => {
        const a = armazem({ [CHAVE_VERSOES_FILTRADAS]: 'não é json', arquivoPoetico_tema: 'dark' });
        const extras = coletarExtras(a.chaves(), a.ler, AGORA);
        assert.equal(extras.total_versoes, 0);
        assert.equal(extras.total_preferencias, 1);
        assert.equal(extrasTemConteudo(extras), true);
    });

    it('as versões ficam na raiz, no formato que a tela filtrar.html importa', () => {
        const a = armazem({
            [CHAVE_VERSOES_FILTRADAS]: JSON.stringify({ 'prosa:2': { tipo: 'prosa' } }),
        });
        const extras = coletarExtras(a.chaves(), a.ler, AGORA);
        // filtrar.html faz `parsed.versoes || parsed`
        assert.deepEqual(extras.versoes, { 'prosa:2': { tipo: 'prosa' } });
    });
});

describe('extras: validar', () => {
    it('aceita o que foi coletado', () => {
        const a = armazem({ arquivoPoetico_tema: 'dark' });
        assert.equal(validarExtras(coletarExtras(a.chaves(), a.ler, AGORA)).ok, true);
    });

    it('recusa JSON de outro tipo, versão futura e campos malformados', () => {
        assert.equal(validarExtras(null).ok, false);
        assert.equal(validarExtras([]).ok, false);
        assert.equal(
            validarExtras({ export_format: 'banco_versoes_filtradas', versao: 1 }).ok,
            false,
        );
        assert.equal(validarExtras({ export_format: FORMATO_EXTRAS, versao: 99 }).ok, false);
        assert.equal(validarExtras({ export_format: FORMATO_EXTRAS }).ok, false);
        assert.equal(
            validarExtras({ export_format: FORMATO_EXTRAS, versao: 1, preferencias: [] }).ok,
            false,
        );
        assert.equal(
            validarExtras({ export_format: FORMATO_EXTRAS, versao: 1, versoes: 'x' }).ok,
            false,
        );
    });
});

describe('extras: restaurar', () => {
    const base = (extra = {}) => ({
        export_format: FORMATO_EXTRAS,
        versao: 1,
        preferencias: {},
        versoes: {},
        ...extra,
    });

    it('ida e volta: coleta num navegador e restaura em outro vazio', () => {
        const origem = armazem({
            arquivoPoetico_tema: 'dark',
            arquivoPoetico_itensPorPagina: '50',
            arquivoPoetico_ma_perfil: 'escritor',
            [CHAVE_VERSOES_FILTRADAS]: JSON.stringify({
                'poema:1': { tipo: 'poema', atualizadoEm: 'a' },
            }),
        });
        const extras = JSON.parse(
            JSON.stringify(coletarExtras(origem.chaves(), origem.ler, AGORA)),
        );
        const destino = armazem();
        const r = aplicarExtras(extras, destino);
        assert.deepEqual(
            { ok: r.ok, preferencias: r.preferencias, versoes: r.versoes, ignoradas: r.ignoradas },
            { ok: true, preferencias: 3, versoes: 1, ignoradas: 0 },
        );
        assert.equal(destino.dados.arquivoPoetico_tema, 'dark');
        assert.equal(destino.dados.arquivoPoetico_ma_perfil, 'escritor');
        assert.deepEqual(JSON.parse(destino.dados[CHAVE_VERSOES_FILTRADAS]), {
            'poema:1': { tipo: 'poema', atualizadoEm: 'a' },
        });
    });

    it('só grava chave de preferência: acervo, backup, desconhecidas e outros sites ficam de fora', () => {
        const destino = armazem();
        const r = aplicarExtras(
            base({
                preferencias: {
                    arquivoPoetico_tema: 'dark',
                    [CHAVE_ACERVO]: '{"poemas":["vazio"]}',
                    arquivoPoetico_ultimoBackup: 'x',
                    arquivoPoetico_inventada: 'x',
                    outroSite: 'x',
                    arquivoPoetico_colunas_poemas: 123,
                },
            }),
            destino,
        );
        assert.equal(r.preferencias, 1);
        assert.equal(r.ignoradas, 5);
        assert.deepEqual(Object.keys(destino.dados), ['arquivoPoetico_tema']);
    });

    it('versões somam às existentes e, na mesma chave, vale a mais recente', () => {
        const destino = armazem({
            [CHAVE_VERSOES_FILTRADAS]: JSON.stringify({
                'poema:1': { texto: 'novo daqui', atualizadoEm: '2026-10-05' },
                'poema:2': { texto: 'só daqui', atualizadoEm: '2026-10-01' },
            }),
        });
        const r = aplicarExtras(
            base({
                versoes: {
                    'poema:1': { texto: 'velho do arquivo', atualizadoEm: '2026-10-02' },
                    'poema:3': { texto: 'só do arquivo', atualizadoEm: '2026-10-03' },
                    'poema:4': 'lixo',
                },
            }),
            destino,
        );
        assert.equal(r.versoes, 1);
        assert.equal(r.ignoradas, 1);
        const banco = JSON.parse(destino.dados[CHAVE_VERSOES_FILTRADAS]);
        assert.equal(banco['poema:1'].texto, 'novo daqui');
        assert.equal(banco['poema:2'].texto, 'só daqui');
        assert.equal(banco['poema:3'].texto, 'só do arquivo');
        assert.ok(!('poema:4' in banco));
    });

    it('em empate ou sem data, vale a do arquivo', () => {
        const destino = armazem({
            [CHAVE_VERSOES_FILTRADAS]: JSON.stringify({ 'poema:1': { texto: 'daqui' } }),
        });
        aplicarExtras(base({ versoes: { 'poema:1': { texto: 'do arquivo' } } }), destino);
        assert.equal(
            JSON.parse(destino.dados[CHAVE_VERSOES_FILTRADAS])['poema:1'].texto,
            'do arquivo',
        );
    });

    it('arquivo inválido não escreve nada', () => {
        const destino = armazem();
        const r = aplicarExtras({ export_format: 'outro' }, destino);
        assert.equal(r.ok, false);
        assert.match(r.motivo, /não é um arquivo de extras/);
        assert.deepEqual(destino.dados, {});
    });

    it('cota cheia conta como falha e não interrompe o resto', () => {
        const destino = armazem();
        let n = 0;
        const r = aplicarExtras(
            base({
                preferencias: { arquivoPoetico_tema: 'dark', arquivoPoetico_itensPorPagina: '50' },
            }),
            {
                ler: destino.ler,
                escrever: (c, v) => {
                    if (n++ === 0) throw new Error('QuotaExceededError');
                    destino.escrever(c, v);
                },
            },
        );
        assert.equal(r.preferencias, 1);
        assert.equal(r.falhas, 1);
    });

    it('restaurar duas vezes dá o mesmo resultado', () => {
        const destino = armazem();
        const extras = base({
            preferencias: { arquivoPoetico_tema: 'dark' },
            versoes: { 'poema:1': { texto: 'a', atualizadoEm: 'x' } },
        });
        aplicarExtras(extras, destino);
        const uma = JSON.stringify(destino.dados);
        aplicarExtras(extras, destino);
        assert.equal(JSON.stringify(destino.dados), uma);
    });

    it('resumirExtras conta só o que seria gravado', () => {
        assert.deepEqual(
            resumirExtras(
                base({
                    preferencias: {
                        arquivoPoetico_tema: 'dark',
                        [CHAVE_ACERVO]: 'x',
                        arquivoPoetico_est_a: 1,
                    },
                    versoes: { 'poema:1': {}, 'poema:2': 'lixo' },
                }),
            ),
            { preferencias: 1, versoes: 1 },
        );
    });

    it('nenhum texto de erro usa travessão', () => {
        const textos = [
            validarExtras(null).motivo,
            validarExtras({ export_format: FORMATO_EXTRAS, versao: 99 }).motivo,
        ];
        for (const t of textos) assert.ok(!/[—–]/.test(t));
    });
});
