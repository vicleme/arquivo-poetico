import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');

document.body.innerHTML = '<main></main>';

const ui = await import('../js/ui-extras-backup.js');
const { CHAVE_VERSOES_FILTRADAS } = await import('../js/inventario-armazenamento.js');
const { FORMATO_EXTRAS } = await import('../js/extras-backup.js');

// Captura o que seria baixado, sem depender de download de verdade.
const baixados = [];
globalThis.URL.createObjectURL = (blob) => {
    baixados.push(blob);
    return 'blob:teste';
};
globalThis.URL.revokeObjectURL = () => {};

function eventoComArquivo(texto) {
    const entrada = { value: 'C:\\fakepath\\x.json', files: [{ text: async () => texto }] };
    return { target: entrada, entrada };
}

describe('backup completo (UI)', () => {
    beforeEach(() => {
        localStorage.clear();
        baixados.length = 0;
    });

    it('baixa o acervo com capas e depois os extras, com a mesma data no nome', async () => {
        const reg = [];
        const r = await ui.baixarBackupCompleto({
            exportarJSON: async (capas, nome) => reg.push(['acervo', capas, nome]),
            baixarExtras: (nome) => {
                reg.push(['extras', nome]);
                return true;
            },
        });
        assert.equal(r.sucesso, true);
        assert.equal(reg[0][0], 'acervo');
        assert.equal(reg[0][1], true);
        assert.equal(reg[1][0], 'extras');
        const dia = (nome) => nome.match(/(\d{4}-\d{2}-\d{2})/)[1];
        assert.equal(dia(reg[0][2]), dia(reg[1][1]));
        assert.match(reg[0][2], /^arquivo_poetico_backup_/);
        assert.match(reg[1][1], /^arquivo_poetico_extras_/);
    });

    it('se o backup do acervo falha, os extras nem são baixados', async () => {
        const reg = [];
        const r = await ui.baixarBackupCompleto({
            exportarJSON: async () => {
                throw new Error('sem espaço');
            },
            baixarExtras: () => reg.push('extras'),
        });
        assert.equal(r.sucesso, false);
        assert.deepEqual(reg, []);
    });

    it('sem nada para os extras, só o acervo é baixado e a pessoa é avisada', async () => {
        const r = await ui.baixarBackupCompleto({
            exportarJSON: async () => {},
            baixarExtras: () => false,
        });
        assert.equal(r.sucesso, true);
        assert.equal(r.extras, false);
    });

    it('baixarExtras gera o arquivo com as preferências e as versões do navegador', async () => {
        localStorage.setItem('arquivoPoetico_tema', 'dark');
        localStorage.setItem(
            CHAVE_VERSOES_FILTRADAS,
            JSON.stringify({ 'poema:1': { tipo: 'poema' } }),
        );
        assert.equal(ui.baixarExtras('extras.json'), true);
        assert.equal(baixados.length, 1);
        const conteudo = JSON.parse(await baixados[0].text());
        assert.equal(conteudo.export_format, FORMATO_EXTRAS);
        assert.equal(conteudo.preferencias.arquivoPoetico_tema, 'dark');
        assert.deepEqual(conteudo.versoes, { 'poema:1': { tipo: 'poema' } });
    });

    it('baixarExtras não gera arquivo vazio', () => {
        assert.equal(ui.baixarExtras('extras.json'), false);
        assert.equal(baixados.length, 0);
    });
});

describe('restaurar extras (UI)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    const extrasValidos = () =>
        JSON.stringify({
            export_format: FORMATO_EXTRAS,
            versao: 1,
            preferencias: { arquivoPoetico_tema: 'dark', arquivoPoetico_itensPorPagina: '50' },
            versoes: { 'poema:1': { tipo: 'poema', atualizadoEm: 'a' } },
        });

    function deps(extra = {}) {
        const chamadas = { confirmou: [], recarregou: 0 };
        return {
            chamadas,
            d: {
                confirmar: (o) => {
                    chamadas.confirmou.push(o);
                    o.onConfirmar();
                },
                recarregar: () => {
                    chamadas.recarregou++;
                },
                ...extra,
            },
        };
    }

    it('restaura depois de confirmar e recarrega a página', async () => {
        const { chamadas, d } = deps();
        const ev = eventoComArquivo(extrasValidos());
        const r = await ui.restaurarExtrasArquivo(ev, d);
        assert.equal(r.sucesso, true);
        assert.equal(r.preferencias, 2);
        assert.equal(r.versoes, 1);
        assert.equal(localStorage.getItem('arquivoPoetico_tema'), 'dark');
        assert.ok(localStorage.getItem(CHAVE_VERSOES_FILTRADAS).includes('poema:1'));
        assert.equal(chamadas.recarregou, 1);
        assert.match(chamadas.confirmou[0].mensagem, /2 preferência\(s\)/);
        assert.match(chamadas.confirmou[0].mensagem, /O acervo não é tocado/);
        assert.equal(ev.entrada.value, '', 'campo de arquivo liberado');
    });

    it('sem confirmar, nada é gravado', async () => {
        let guardado;
        const ev = eventoComArquivo(extrasValidos());
        const pendente = ui.restaurarExtrasArquivo(ev, {
            confirmar: (o) => {
                guardado = o;
            },
            recarregar: () => assert.fail('não deveria recarregar'),
        });
        await new Promise((r) => setTimeout(r, 10));
        assert.ok(guardado);
        assert.equal(localStorage.getItem('arquivoPoetico_tema'), null);
        assert.equal(ev.entrada.value, '', 'campo liberado mesmo sem confirmar');
        void pendente;
    });

    it('arquivo que não é JSON, de outro formato ou vazio: avisa e não grava', async () => {
        for (const [texto, motivo] of [
            ['isto não é json', 'json'],
            [JSON.stringify({ export_format: 'banco_versoes_filtradas', versoes: {} }), 'formato'],
            [JSON.stringify({ export_format: FORMATO_EXTRAS, versao: 1 }), 'vazio'],
        ]) {
            const { chamadas, d } = deps();
            const r = await ui.restaurarExtrasArquivo(eventoComArquivo(texto), d);
            assert.equal(r.sucesso, false);
            assert.equal(r.motivo, motivo);
            assert.equal(chamadas.confirmou.length, 0);
            assert.equal(chamadas.recarregou, 0);
        }
        assert.equal(localStorage.getItem('arquivoPoetico_tema'), null);
    });

    it('sem arquivo escolhido não faz nada', async () => {
        const r = await ui.restaurarExtrasArquivo({ target: { files: [] } }, {});
        assert.equal(r.motivo, 'sem-arquivo');
    });

    it('chave de acervo escondida no arquivo de extras não é gravada', async () => {
        const texto = JSON.stringify({
            export_format: FORMATO_EXTRAS,
            versao: 1,
            preferencias: { arquivoPoetico_v3: '{"poemas":[]}', arquivoPoetico_tema: 'dark' },
        });
        const { d } = deps();
        await ui.restaurarExtrasArquivo(eventoComArquivo(texto), d);
        assert.equal(localStorage.getItem('arquivoPoetico_v3'), null);
        assert.equal(localStorage.getItem('arquivoPoetico_tema'), 'dark');
    });
});

describe('backup completo: entrada na página', () => {
    const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

    it('os três botões estão na aba Backup e recuperação, antes dos retratos automáticos', () => {
        const ini = html.indexOf('<section id="backup-recuperacao"');
        const aba = html.slice(ini, html.indexOf('</section>', ini));
        for (const [id, chamada] of [
            ['btn-backup-completo', 'baixarBackupCompleto()'],
            ['btn-baixar-extras', 'baixarSoExtras()'],
        ]) {
            const m = aba.match(new RegExp(`id="${id}"[\\s\\S]{0,120}?onclick="([^"]+)"`));
            assert.ok(m, id);
            assert.equal(m[1], chamada);
        }
        assert.match(
            aba,
            /id="arquivo-restaurar-extras"[\s\S]{0,200}onchange="restaurarExtrasArquivo\(event\)"/,
        );
        assert.ok(aba.indexOf('id="btn-backup-completo"') < aba.indexOf('id="lista-snapshots"'));
    });

    it('nenhum texto novo da aba usa travessão', () => {
        const ini = html.indexOf('id="backup-completo"');
        const trecho = html.slice(ini, html.indexOf('Backups automáticos', ini));
        assert.ok(!/[—–]/.test(trecho.replace(/<!--[\s\S]*?-->/g, '')));
    });
});
