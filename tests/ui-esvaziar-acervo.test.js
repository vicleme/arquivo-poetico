import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fase 13, etapa 13b: modal "Esvaziar o acervo". Aqui se prova o resumo, a trava
// da palavra e a ordem backup, retrato, apagar. O apagar em si (13c) é testado em
// tests/apagar-acervo.test.js; neste arquivo ele entra sempre por `deps`.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');
const HTML_MODAL = fs.readFileSync(path.join(RAIZ, 'modais/modal-esvaziar-acervo.html'), 'utf8');

document.body.innerHTML = '<main></main><div id="modais-container"></div>';
globalThis.fetch = async (url) => {
    assert.match(String(url), /modal-esvaziar-acervo\.html$/);
    return { ok: true, status: 200, text: async () => HTML_MODAL };
};

const { db } = await import('../js/db.js');
const { registrarModal } = await import('../js/modais.js');
const { CHAVE_VERSOES_FILTRADAS } = await import('../js/inventario-armazenamento.js');
const ui = await import('../js/ui-esvaziar-acervo.js');
const { resumirEsvaziamento } = await import('../js/esvaziar-acervo.js');

registrarModal('modal-esvaziar-acervo', 'modal-esvaziar-acervo.html', () => {});

const $ = (id) => document.getElementById(id);
const marcar = (id, valor = true) => {
    $(id).checked = valor;
};
const digitar = (texto) => {
    $('esv-palavra').value = texto;
};

function prepararDb() {
    db.poemas = [
        { id: 1, titulo: 'A' },
        { id: 2, titulo: 'B' },
    ];
    db.prosas = [{ id: 3, titulo: 'C' }];
    db.livros = [{ id: 10, titulo: 'L' }];
}

describe('esvaziar acervo (UI): funções puras', () => {
    it('palavra: exata, com espaços nas pontas tolerados, sem tolerar caixa baixa', () => {
        assert.equal(ui.palavraConfere('ESVAZIAR'), true);
        assert.equal(ui.palavraConfere('  ESVAZIAR \n'), true);
        assert.equal(ui.palavraConfere('esvaziar'), false);
        assert.equal(ui.palavraConfere('ESVAZIA'), false);
        assert.equal(ui.palavraConfere(null), false);
    });

    it('botão só libera com caixa, palavra e sem operação em andamento', () => {
        assert.equal(ui.podeConfirmar({ dados: true }, 'ESVAZIAR'), true);
        assert.equal(ui.podeConfirmar({}, 'ESVAZIAR'), false);
        assert.equal(ui.podeConfirmar({ dados: true }, ''), false);
        assert.equal(ui.podeConfirmar({ preProntos: true }, 'ESVAZIAR', true), false);
    });

    it('resumo vazio pede para marcar uma caixa', () => {
        const r = ui.descreverResumo(resumirEsvaziamento(db, {}));
        assert.deepEqual(r.secoes, []);
        assert.match(r.notas[0], /Marque ao menos uma caixa/);
    });

    it('resumo de Dados lista contagens, capas e versões, e avisa que o acervo fica vazio', () => {
        prepararDb();
        const resumo = resumirEsvaziamento(db, { dados: true }, { capas: 2, versoesFiltradas: 4 });
        const { secoes, notas } = ui.descreverResumo(resumo);
        const itens = secoes[0].itens;
        assert.ok(itens.includes('poemas: 2'));
        assert.ok(itens.includes('prosas: 1'));
        assert.ok(itens.includes('livros: 1'));
        assert.ok(itens.includes('imagens de capa: 2'));
        assert.ok(itens.includes('versões alternativas: 4'));
        assert.ok(notas.some((n) => /sem os Assuntos e Temas de exemplo/.test(n)));
        assert.ok(notas.some((n) => /voltam ao estado inicial/.test(n)));
    });

    it('resumo de Pré-prontos informa quantos ficam por estarem em uso', () => {
        const resumo = {
            vazio: false,
            dados: null,
            preferencias: null,
            preProntos: {
                mantidos: 3,
                cadastros: {
                    periodosHistoricos: {
                        rotulo: 'Períodos históricos',
                        apagar: 10,
                        mantidosPorUso: 1,
                        mantidosPorHierarquia: 0,
                    },
                    movimentosEscolas: {
                        rotulo: 'Movimentos e escolas',
                        apagar: 18,
                        mantidosPorUso: 1,
                        mantidosPorHierarquia: 1,
                    },
                    templatesEstrutura: {
                        rotulo: 'Templates de estrutura',
                        apagar: 2,
                        mantidosPorUso: 0,
                        mantidosPorHierarquia: 0,
                    },
                },
            },
            backup: { obrigatorio: false, acervo: true, incluiExtras: false },
        };
        const { secoes } = ui.descreverResumo(resumo);
        assert.equal(
            secoes[0].itens[0],
            'Períodos históricos de fábrica: 10 para apagar, 1 fica por estar em uso',
        );
        assert.match(secoes[0].itens[1], /2 ficam por estarem em uso ou ligado\(s\) a um que fica/);
        assert.equal(secoes[0].itens[2], 'Templates de estrutura de fábrica: 2 para apagar');
    });

    it('nenhum texto da interface usa travessão', () => {
        const textos = [
            HTML_MODAL.replace(/<!--[\s\S]*?-->/g, ''),
            JSON.stringify(
                ui.descreverResumo(
                    resumirEsvaziamento(db, { dados: true, preferencias: true, preProntos: true }),
                ),
            ),
            JSON.stringify(ui.descreverBackup(resumirEsvaziamento(db, { dados: true }))),
        ];
        for (const t of textos) assert.ok(!/[—–]/.test(t), 'travessão encontrado');
    });

    it('backup: obrigatório com Dados; o arquivo de extras só é citado quando há o que guardar', () => {
        const com = ui.descreverBackup(
            resumirEsvaziamento(db, { dados: true }, { versoesFiltradas: 1 }),
        );
        assert.equal(com.obrigatorio, true);
        assert.match(com.extra, /arquivo de extras/);
        assert.match(com.extra, /dois arquivos/);
        const sem = ui.descreverBackup(resumirEsvaziamento(db, { dados: true }));
        assert.equal(sem.extra, '');
        assert.equal(sem.visivel, true);
        const pre = ui.descreverBackup(resumirEsvaziamento(db, { preProntos: true }));
        assert.equal(pre.obrigatorio, false);
        assert.match(pre.texto, /backup completo/);
    });

    it('só Preferências: o backup oferecido é o dos extras, sem o JSON do acervo', () => {
        const info = ui.descreverBackup(
            resumirEsvaziamento(db, { preferencias: true }, { preferencias: 4 }),
        );
        assert.equal(info.visivel, true);
        assert.match(info.texto, /arquivo de extras/);
        assert.doesNotMatch(info.extra, /dois arquivos/);
    });

    it('só Preferências sem nenhuma preferência salva: não há backup a oferecer', () => {
        const info = ui.descreverBackup(
            resumirEsvaziamento(db, { preferencias: true }, { preferencias: 0 }),
        );
        assert.equal(info.visivel, false);
    });
});

describe('esvaziar acervo (UI): modal', () => {
    beforeEach(() => {
        prepararDb();
        localStorage.clear();
    });

    it('abre com tudo desmarcado e o botão travado', async () => {
        await ui.abrirModalEsvaziarAcervo();
        const modal = $('modal-esvaziar-acervo');
        assert.ok(modal, 'modal carregado');
        assert.equal(modal.classList.contains('hidden'), false);
        for (const id of ['esv-chk-dados', 'esv-chk-preferencias', 'esv-chk-pre-prontos']) {
            assert.equal($(id).checked, false, id);
        }
        assert.equal($('esv-btn-confirmar').disabled, true);
        assert.match($('esv-resumo').textContent, /Marque ao menos uma caixa/);
    });

    it('marcar Dados mostra o resumo e trava o backup ligado', async () => {
        await ui.abrirModalEsvaziarAcervo();
        marcar('esv-chk-dados');
        ui.atualizarModalEsvaziarAcervo();
        assert.match($('esv-resumo').textContent, /poemas: 2/);
        assert.equal($('esv-chk-backup').checked, true);
        assert.equal($('esv-chk-backup').disabled, true);
    });

    it('sem Dados o backup é opcional', async () => {
        await ui.abrirModalEsvaziarAcervo();
        marcar('esv-chk-preferencias');
        ui.atualizarModalEsvaziarAcervo();
        assert.equal($('esv-chk-backup').disabled, false);
    });

    it('o botão só libera com caixa marcada e a palavra exata', async () => {
        await ui.abrirModalEsvaziarAcervo();
        digitar('ESVAZIAR');
        ui.atualizarModalEsvaziarAcervo();
        assert.equal($('esv-btn-confirmar').disabled, true, 'sem caixa');
        marcar('esv-chk-dados');
        ui.atualizarModalEsvaziarAcervo();
        assert.equal($('esv-btn-confirmar').disabled, false);
        digitar('esvaziar');
        ui.atualizarModalEsvaziarAcervo();
        assert.equal($('esv-btn-confirmar').disabled, true, 'caixa baixa não vale');
        digitar('ESVAZIAR');
        marcar('esv-chk-dados', false);
        ui.atualizarModalEsvaziarAcervo();
        assert.equal($('esv-btn-confirmar').disabled, true, 'desmarcou a caixa');
    });

    it('reabrir limpa caixas e palavra', async () => {
        await ui.abrirModalEsvaziarAcervo();
        marcar('esv-chk-dados');
        digitar('ESVAZIAR');
        await ui.abrirModalEsvaziarAcervo();
        assert.equal($('esv-chk-dados').checked, false);
        assert.equal($('esv-palavra').value, '');
    });

    it('conta as Versões Alternativas guardadas no navegador', async () => {
        localStorage.setItem(
            CHAVE_VERSOES_FILTRADAS,
            JSON.stringify({ 'poema:1': {}, 'prosa:3': {} }),
        );
        await ui.abrirModalEsvaziarAcervo();
        marcar('esv-chk-dados');
        ui.atualizarModalEsvaziarAcervo();
        assert.match($('esv-resumo').textContent, /versões alternativas: 2/);
        assert.match($('esv-backup-extra').textContent, /arquivo de extras/);
    });
});

describe('esvaziar acervo (UI): confirmação', () => {
    function deps(registro, sobrescrever = {}) {
        return {
            exportarJSON: async (capas) => registro.push(['backup', capas]),
            baixarExtras: (nome) => registro.push(['extras', nome]),
            tirarSnapshotSeNecessario: async (_db, forcar) => {
                registro.push(['retrato', forcar]);
                return true;
            },
            apagar: async (caixas) => {
                registro.push(['apagar', { ...caixas }]);
                return { apagado: true };
            },
            ...sobrescrever,
        };
    }

    async function abrirComCaixas(caixas, palavra = 'ESVAZIAR') {
        await ui.abrirModalEsvaziarAcervo();
        if (caixas.dados) marcar('esv-chk-dados');
        if (caixas.preferencias) marcar('esv-chk-preferencias');
        if (caixas.preProntos) marcar('esv-chk-pre-prontos');
        digitar(palavra);
        ui.atualizarModalEsvaziarAcervo();
    }

    beforeEach(() => {
        prepararDb();
        localStorage.clear();
    });

    it('Dados: backup com capas, retrato forçado e só então apagar, nessa ordem', async () => {
        await abrirComCaixas({ dados: true });
        const reg = [];
        const r = await ui.confirmarEsvaziarAcervo(deps(reg));
        assert.deepEqual(
            reg.map((x) => x[0]),
            ['backup', 'retrato', 'apagar'],
        );
        assert.deepEqual(reg[0], ['backup', true]);
        assert.deepEqual(reg[1], ['retrato', true]);
        assert.equal(reg[2][1].dados, true);
        assert.equal(r.sucesso, true);
        assert.equal(r.apagado, true);
    });

    it('com Versões Alternativas, baixa também o arquivo de extras, antes do retrato', async () => {
        localStorage.setItem(
            CHAVE_VERSOES_FILTRADAS,
            JSON.stringify({ 'poema:1': { tipo: 'poema' } }),
        );
        await abrirComCaixas({ dados: true });
        const reg = [];
        await ui.confirmarEsvaziarAcervo(deps(reg));
        assert.deepEqual(
            reg.map((x) => x[0]),
            ['backup', 'extras', 'retrato', 'apagar'],
        );
    });

    it('Dados: o backup é obrigatório mesmo que a caixa de backup esteja desmarcada', async () => {
        await abrirComCaixas({ dados: true });
        $('esv-chk-backup').checked = false;
        const reg = [];
        await ui.confirmarEsvaziarAcervo(deps(reg));
        assert.equal(reg[0][0], 'backup');
    });

    it('só Preferências: sem retrato (o db não muda) e backup dispensável', async () => {
        await abrirComCaixas({ preferencias: true });
        $('esv-chk-backup').checked = false;
        const reg = [];
        await ui.confirmarEsvaziarAcervo(deps(reg));
        assert.deepEqual(
            reg.map((x) => x[0]),
            ['apagar'],
        );
    });

    it('só Preferências com preferências salvas: baixa só os extras e não tira retrato', async () => {
        localStorage.setItem('arquivoPoetico_tema', 'dark');
        await abrirComCaixas({ preferencias: true });
        const reg = [];
        await ui.confirmarEsvaziarAcervo(deps(reg));
        assert.deepEqual(
            reg.map((x) => x[0]),
            ['extras', 'apagar'],
        );
    });

    it('só Preferências sem nada salvo: nada para baixar', async () => {
        await abrirComCaixas({ preferencias: true });
        const reg = [];
        await ui.confirmarEsvaziarAcervo(deps(reg));
        assert.deepEqual(
            reg.map((x) => x[0]),
            ['apagar'],
        );
    });

    it('os dois arquivos do backup levam a mesma data no nome', async () => {
        localStorage.setItem(
            CHAVE_VERSOES_FILTRADAS,
            JSON.stringify({ 'poema:1': { tipo: 'poema' } }),
        );
        await abrirComCaixas({ dados: true });
        const reg = [];
        await ui.confirmarEsvaziarAcervo({
            ...deps(reg),
            exportarJSON: async (capas, nome) => reg.push(['backup', capas, nome]),
        });
        const dia = (n) => n.match(/(\d{4}-\d{2}-\d{2})/)[1];
        const acervo = reg.find((x) => x[0] === 'backup')[2];
        const extras = reg.find((x) => x[0] === 'extras')[1];
        assert.equal(dia(acervo), dia(extras));
    });

    it('Pré-prontos: tira retrato, porque o db muda', async () => {
        await abrirComCaixas({ preProntos: true });
        $('esv-chk-backup').checked = false;
        const reg = [];
        await ui.confirmarEsvaziarAcervo(deps(reg));
        assert.deepEqual(
            reg.map((x) => x[0]),
            ['retrato', 'apagar'],
        );
    });

    it('retrato que falha interrompe: nada é apagado', async () => {
        await abrirComCaixas({ dados: true });
        const reg = [];
        const r = await ui.confirmarEsvaziarAcervo(
            deps(reg, { tirarSnapshotSeNecessario: async () => false }),
        );
        assert.equal(r.sucesso, false);
        assert.equal(r.motivo, 'snapshot');
        assert.ok(!reg.some((x) => x[0] === 'apagar'));
    });

    it('backup que dá erro interrompe: nem retrato nem apagar', async () => {
        await abrirComCaixas({ dados: true });
        const reg = [];
        const r = await ui.confirmarEsvaziarAcervo(
            deps(reg, {
                exportarJSON: async () => {
                    throw new Error('sem espaço');
                },
            }),
        );
        assert.equal(r.sucesso, false);
        assert.equal(r.motivo, 'erro');
        assert.deepEqual(reg, []);
    });

    it('palavra errada ou sem caixa: nada roda', async () => {
        await abrirComCaixas({ dados: true }, 'esvaziar');
        const reg = [];
        const r = await ui.confirmarEsvaziarAcervo(deps(reg));
        assert.equal(r.motivo, 'nao-liberado');
        assert.deepEqual(reg, []);
    });

    it('depois de confirmar, a palavra é limpa e o botão volta a travar', async () => {
        await abrirComCaixas({ dados: true });
        await ui.confirmarEsvaziarAcervo(deps([]));
        assert.equal($('esv-palavra').value, '');
        assert.equal($('esv-btn-confirmar').disabled, true);
    });

    it('apagar concluído: avisa que vai recarregar e devolve as falhas parciais', async () => {
        await abrirComCaixas({ dados: true });
        const r = await ui.confirmarEsvaziarAcervo(
            deps([], { apagar: async () => ({ apagado: true, falhas: ['imagens de capa'] }) }),
        );
        assert.equal(r.sucesso, true);
        assert.equal(r.apagado, true);
        assert.deepEqual(r.falhas, ['imagens de capa']);
        assert.match($('esv-status').textContent, /Recarregando/);
    });

    it('apagar que não gravou: não é sucesso, o status é limpo e o acervo continua', async () => {
        await abrirComCaixas({ dados: true });
        const r = await ui.confirmarEsvaziarAcervo(
            deps([], { apagar: async () => ({ apagado: false, motivo: 'gravacao' }) }),
        );
        assert.equal(r.sucesso, false);
        assert.equal(r.apagado, false);
        assert.equal(r.motivo, 'gravacao');
        assert.equal($('esv-status').classList.contains('hidden'), true);
        assert.equal(db.poemas.length, 2, 'o acervo continua intacto');
    });

    it('o apagar padrão é o de verdade (apagar-acervo.js), não um substituto', () => {
        const fonte = fs.readFileSync(path.join(RAIZ, 'js/ui-esvaziar-acervo.js'), 'utf8');
        assert.match(fonte, /import \{ executarEsvaziamento \} from '\.\/apagar-acervo\.js'/);
        assert.match(fonte, /apagar: \(caixas\) => executarEsvaziamento\(caixas\)/);
        assert.doesNotMatch(fonte, /apagarAindaNaoLigado/);
    });
});

describe('esvaziar acervo (UI): entrada na página', () => {
    const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    const secao = (id) => {
        const ini = html.indexOf(`<section id="${id}"`);
        assert.ok(ini >= 0, `seção ${id} existe`);
        return html.slice(ini, html.indexOf('</section>', ini));
    };

    it('o botão da Zona de risco chama a função certa', () => {
        const m = html.match(/id="btn-esvaziar-acervo"[\s\S]{0,200}?onclick="([^"]+)"/);
        assert.ok(m, 'botão encontrado');
        assert.equal(m[1], 'abrirModalEsvaziarAcervo()');
    });

    it('Zona de risco e retratos automáticos moram na aba Backup e recuperação, não na Exportação Geral', () => {
        const aba = secao('backup-recuperacao');
        assert.ok(aba.includes('id="zona-de-risco"'));
        assert.ok(aba.includes('id="lista-snapshots"'));
        assert.ok(aba.indexOf('id="zona-de-risco"') > aba.indexOf('id="lista-snapshots"'));
        const exportacao = secao('exportar-filtrado');
        assert.ok(!exportacao.includes('id="zona-de-risco"'));
        assert.ok(!exportacao.includes('id="btn-esvaziar-acervo"'));
        assert.ok(!exportacao.includes('id="lista-snapshots"'));
        assert.ok(
            exportacao.includes("abrirAba('backup-recuperacao')"),
            'ponteiro para a nova aba',
        );
    });

    it('a aba está no menu Dados (desktop e mobile) com o rótulo certo', async () => {
        assert.match(
            html,
            /id="btn-backup-recuperacao"[\s\S]{0,120}onclick="abrirAba\('backup-recuperacao'\)"[\s\S]{0,200}Backup e recuperação/,
        );
        const fonte = fs.readFileSync(path.join(RAIZ, 'js/ui.js'), 'utf8');
        assert.match(fonte, /id: 'backup-recuperacao', rotulo: 'Backup e recuperação'/);
    });
});
