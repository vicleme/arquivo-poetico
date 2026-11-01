import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Descartado guarda de onde saiu ("Cortado de", o mesmo campo dos migrados) e sai
// da fila: a posição fica livre e quem vinha depois sobe uma casa. A posição
// guardada é uma foto do passado ("era a nº N na época"), não se mexe depois.

globalThis.indexedDB = { open: () => ({}) };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});

document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormPoema, initFormProsa, editarPoema, editarProsa, rastreadorPoema, rastreadorProsa } =
    await import('../js/forms.js');
const {
    descartadosSemLivroDeOrigem,
    foraDeEscopoDoLivro,
    origemParaDescarte,
    textoDaEntradaForaDeEscopo,
} = await import('../js/fora-de-escopo.js');
const { proximaPosicaoDoLugar } = await import('../js/utils.js');

registrarModal('modal-poema', 'modal-poema.html', initFormPoema, rastreadorPoema);
registrarModal('modal-prosa', 'modal-prosa.html', initFormProsa, rastreadorProsa);

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const esperar = () => new Promise((r) => setTimeout(r, 30));

function banco() {
    return {
        livros: [
            { id: 1, titulo: 'Livro Um', tipo: 'Inéditos' },
            { id: 2, titulo: 'Livro Dois', tipo: 'Inéditos' },
        ],
        partes: [{ id: 100, livroId: 1, titulo: 'Parte A', sequencia: 1 }],
        secoes: [
            { id: 200, paiTipo: 'parte', paiId: 100, titulo: '1. Viagens', sequencia: 1 },
            { id: 201, paiTipo: 'parte', paiId: 100, titulo: '2. Volta', sequencia: 2 },
            { id: 202, paiTipo: 'livro', paiId: 1, titulo: 'Solta', sequencia: 2 },
        ],
        elementos: [],
        itensColetanea: [],
        poemas: [],
        prosas: [],
    };
}

describe('origemParaDescarte (lógica pura)', () => {
    it('Seção dentro de Parte: livro, "Parte / Seção" e posição', () => {
        assert.deepEqual(origemParaDescarte(banco(), 'secao', 200, 3), {
            livro: 'Livro Um',
            livroId: 1,
            secao: 'Parte A / 1. Viagens',
            posicao: 3,
        });
    });

    it('Seção direto no livro, Parte e o próprio livro', () => {
        const b = banco();
        assert.deepEqual(origemParaDescarte(b, 'secao', 202, 1), {
            livro: 'Livro Um',
            livroId: 1,
            secao: 'Solta',
            posicao: 1,
        });
        assert.deepEqual(origemParaDescarte(b, 'parte', 100, 2), {
            livro: 'Livro Um',
            livroId: 1,
            secao: 'Parte A',
            posicao: 2,
        });
        assert.deepEqual(origemParaDescarte(b, 'livro', 1, 4), {
            livro: 'Livro Um',
            livroId: 1,
            secao: '',
            posicao: 4,
        });
    });

    it('sem posição (null, 0, lixo) não cria a chave; sem lugar devolve null', () => {
        const b = banco();
        for (const seq of [null, undefined, 0, 'x', '']) {
            assert.equal('posicao' in origemParaDescarte(b, 'secao', 200, seq), false);
        }
        assert.equal(origemParaDescarte(b, null, null, 2), null);
        assert.equal(origemParaDescarte(b, 'secao', 999, 2), null, 'Seção que não existe');
    });
});

describe('Fora de escopo usa o "Cortado de" do descartado', () => {
    const comCortado = (cortadoDe, extra = {}) => {
        const b = banco();
        b.poemas = [
            {
                id: 1,
                titulo: 'D',
                status: 'descartado',
                paiTipo: 'secao',
                paiId: 201,
                sequencia: null,
                livrosIds: [1],
                cortadoDe,
                ...extra,
            },
        ];
        return b;
    };

    it('a origem é a foto gravada, e não o vínculo de hoje', () => {
        const b = comCortado({ livro: 'Livro Um', secao: 'Parte A / 1. Viagens', posicao: 3 });
        const [d] = foraDeEscopoDoLivro(b, 1).descartados;
        assert.deepEqual(d.origem.caminho, ['Parte A', '1. Viagens']);
        assert.equal(d.origem.posicao, 3);
        assert.equal(
            textoDaEntradaForaDeEscopo(d),
            'Descartado (de Parte A › 1. Viagens · era a nº 3 na época)',
        );
    });

    it('o livro do Cortado de decide em qual Fora de escopo ele entra, ignorando caixa e espaços', () => {
        const igual = comCortado({ livro: '  LIVRO  um ', secao: 'S', posicao: 1 });
        assert.equal(
            textoDaEntradaForaDeEscopo(foraDeEscopoDoLivro(igual, 1).descartados[0]),
            'Descartado (de S · era a nº 1 na época)',
        );
        // Outro livro: o texto sai do Livro Um e não aparece nele.
        const outro = comCortado({ livro: 'Livro Dois', secao: 'Seção X', posicao: 2 });
        assert.equal(foraDeEscopoDoLivro(outro, 1).descartados.length, 0);
        assert.equal(foraDeEscopoDoLivro(outro, 2).descartados.length, 1);
    });

    it('a posição gravada não muda quando a fila de hoje muda', () => {
        const b = comCortado(
            { livro: 'Livro Um', secao: '2. Volta', posicao: 4 },
            { sequencia: 9 },
        );
        const [d] = foraDeEscopoDoLivro(b, 1).descartados;
        assert.equal(d.origem.posicao, 4);
    });

    it('sem "Cortado de" (descartado antigo), não entra em livro algum e vai para o aviso', () => {
        for (const cortado of [null, undefined, {}, { livro: '', secao: '' }]) {
            const b = comCortado(cortado, { sequencia: 2 });
            assert.equal(foraDeEscopoDoLivro(b, 1).descartados.length, 0);
            assert.equal(descartadosSemLivroDeOrigem(b).semOrigem.length, 1);
        }
    });

    it('a ordem segue a Seção de origem no livro, depois a posição de origem', () => {
        const b = banco();
        const base = { status: 'descartado', paiTipo: 'secao', livrosIds: [1], sequencia: null };
        b.poemas = [
            {
                ...base,
                id: 1,
                titulo: 'C',
                paiId: 201,
                cortadoDe: { livro: 'Livro Um', secao: 'Parte A / 2. Volta', posicao: 1 },
            },
            {
                ...base,
                id: 2,
                titulo: 'B',
                paiId: 200,
                cortadoDe: { livro: 'Livro Um', secao: 'Parte A / 1. Viagens', posicao: 5 },
            },
            {
                ...base,
                id: 3,
                titulo: 'A',
                paiId: 200,
                cortadoDe: { livro: 'Livro Um', secao: 'Parte A / 1. Viagens', posicao: 2 },
            },
        ];
        const titulos = foraDeEscopoDoLivro(b, 1).descartados.map((e) => e.titulo);
        assert.deepEqual(titulos, ['A', 'B', 'C']);
    });
});

const CONF = {
    poema: {
        colecao: 'poemas',
        editar: editarPoema,
        rastreador: rastreadorPoema,
        modal: 'modal-poema',
        form: 'form-poema',
        pref: 'p',
    },
    prosa: {
        colecao: 'prosas',
        editar: editarProsa,
        rastreador: rastreadorProsa,
        modal: 'modal-prosa',
        form: 'form-prosa',
        pref: 'pr',
    },
};

for (const tipo of ['poema', 'prosa']) {
    const c = CONF[tipo];
    const el = (sufixo) => document.getElementById(`${c.pref}-${sufixo}`);
    const texto = (id, seq, extra = {}) => ({
        id,
        titulo: `Texto ${id}`,
        texto: 'x',
        status: 'completo',
        paiTipo: 'secao',
        paiId: 200,
        sequencia: seq,
        livrosIds: [1],
        ...extra,
    });
    // Posições por id (10, 11, 12): o salvar pode trocar a ordem do array.
    const sequencias = () => [...db[c.colecao]].sort((a, b) => a.id - b.id).map((t) => t.sequencia);
    const mudarStatus = (valor) => {
        el('status').value = valor;
        el('status').dispatchEvent(new Event('change', { bubbles: true }));
    };
    const salvar = async () => {
        document.getElementById(c.form).requestSubmit();
        await esperar();
    };

    describe(`Descartado guarda a origem e sai da fila (${tipo})`, () => {
        beforeEach(async () => {
            localStorage.clear();
            Object.assign(db, banco());
            db.poemas = [];
            db.prosas = [];
            db[c.colecao] = [texto(10, 1), texto(11, 2), texto(12, 3)];
            c.rastreador.marcarLimpo();
            if (aberto(c.modal)) await toggleModal(c.modal);
        });

        it('ao escolher Descartado, o modal propõe o "Cortado de" com o lugar de hoje', async () => {
            await c.editar(11);
            mudarStatus('descartado');
            assert.equal(el('cortado-livro').value, 'Livro Um');
            assert.equal(el('cortado-secao').value, 'Parte A / 1. Viagens');
            assert.equal(el('cortado-posicao').value, '2');
        });

        it('o grupo "Onde aparece" trava enquanto for Descartado e destrava ao voltar', async () => {
            await c.editar(11);
            const linha = () => el('onde-linhas').querySelector('.ol-modo');
            assert.equal(linha().disabled, false);
            assert.equal(el('onde-trava').classList.contains('hidden'), true);
            mudarStatus('descartado');
            assert.equal(linha().disabled, true);
            assert.equal(el('onde-add').disabled, true);
            assert.equal(el('onde-trava').classList.contains('hidden'), false);
            assert.match(el('onde-trava').textContent, /Cortado de/);
            mudarStatus('completo');
            assert.equal(linha().disabled, false);
            assert.equal(el('onde-trava').classList.contains('hidden'), true);
        });

        it('desfazer a escolha sem mexer na proposta apaga a proposta', async () => {
            await c.editar(11);
            mudarStatus('descartado');
            mudarStatus('completo');
            assert.equal(el('cortado-livro').value, '');
            assert.equal(el('cortado-secao').value, '');
            assert.equal(el('cortado-posicao').value, '');
        });

        it('se o Victor mexeu na proposta, desfazer a escolha não apaga o que é dele', async () => {
            await c.editar(11);
            mudarStatus('descartado');
            el('cortado-secao').value = 'Outra seção';
            mudarStatus('completo');
            assert.equal(el('cortado-secao').value, 'Outra seção');
        });

        it('não sobrescreve um "Cortado de" já preenchido', async () => {
            await c.editar(11);
            el('cortado-livro').value = 'Livro Velho';
            mudarStatus('descartado');
            assert.equal(el('cortado-livro').value, 'Livro Velho');
            assert.equal(el('cortado-secao').value, '');
        });

        it('salvar grava a origem, zera a posição e fecha o buraco', async () => {
            await c.editar(11);
            mudarStatus('descartado');
            await salvar();
            const salvo = db[c.colecao].find((t) => t.id === 11);
            assert.equal(salvo.status, 'descartado');
            assert.equal(salvo.sequencia, null);
            assert.deepEqual(salvo.cortadoDe, {
                livro: 'Livro Um',
                livroId: 1,
                secao: 'Parte A / 1. Viagens',
                posicao: 2,
            });
            assert.deepEqual(sequencias(), [1, null, 2], 'o 12 subiu de 3 para 2');
        });

        it('rede de segurança: sem o evento do modal, salvar também grava a origem', async () => {
            await c.editar(11);
            el('status').value = 'descartado'; // sem disparar "change"
            await salvar();
            const salvo = db[c.colecao].find((t) => t.id === 11);
            assert.deepEqual(salvo.cortadoDe, {
                livro: 'Livro Um',
                livroId: 1,
                secao: 'Parte A / 1. Viagens',
                posicao: 2,
            });
            assert.equal(salvo.sequencia, null);
        });

        it('o que o Victor digitou em "Cortado de" vale mais que a proposta', async () => {
            await c.editar(11);
            mudarStatus('descartado');
            el('cortado-posicao').value = '8';
            await salvar();
            assert.equal(db[c.colecao].find((t) => t.id === 11).cortadoDe.posicao, 8);
        });

        it('a fila fica sem buraco e a posição sugerida é a do fim real', async () => {
            await c.editar(10);
            mudarStatus('descartado');
            await salvar();
            assert.deepEqual(sequencias(), [null, 1, 2]);
            assert.equal(proximaPosicaoDoLugar(db, 'secao', 200), 3);
        });

        it('descartado antigo com vaga viva: ao salvar, grava a origem, sai da fila e fecha o buraco', async () => {
            db[c.colecao][1].status = 'descartado'; // texto 11, sequência 2, sem cortadoDe
            await c.editar(11);
            await salvar();
            const salvo = db[c.colecao].find((t) => t.id === 11);
            assert.equal(salvo.sequencia, null);
            assert.equal(salvo.cortadoDe.posicao, 2);
            assert.deepEqual(sequencias(), [1, null, 2]);
        });

        it('já descartado e sem posição: salvar de novo não mexe em ninguém', async () => {
            db[c.colecao][1].status = 'descartado';
            db[c.colecao][1].sequencia = null;
            db[c.colecao][1].cortadoDe = { livro: 'Livro Um', secao: 'S', posicao: 7 };
            await c.editar(11);
            await salvar();
            assert.deepEqual(sequencias(), [1, null, 3]);
            assert.equal(db[c.colecao].find((t) => t.id === 11).cortadoDe.posicao, 7);
        });

        it('Fora de escopo mostra o descartado com "era a nº 2 na época"', async () => {
            await c.editar(11);
            mudarStatus('descartado');
            await salvar();
            const [d] = foraDeEscopoDoLivro(db, 1).descartados;
            assert.equal(
                textoDaEntradaForaDeEscopo(d),
                'Descartado (de Parte A › 1. Viagens · era a nº 2 na época)',
            );
        });

        it('texto novo salvo já como Descartado grava a origem do destino escolhido', async () => {
            await toggleModal(c.modal);
            el('titulo').value = 'Novo descartado';
            el('onde-add').click();
            const linha = el('onde-linhas').querySelector('.onde-linha');
            const escolher = (classe, valor) => {
                const campo = linha.querySelector(`.${classe}`);
                campo.value = valor;
                campo.dispatchEvent(new Event('change', { bubbles: true }));
            };
            escolher('ol-livro', '1');
            escolher('ol-lugar', 'secao:200');
            escolher('ol-modo', 'especifica');
            escolher('ol-seq', '2');
            mudarStatus('descartado');
            await salvar();
            const novo = db[c.colecao].find((t) => t.titulo === 'Novo descartado');
            assert.ok(novo, 'texto criado');
            assert.equal(novo.sequencia, null);
            assert.equal(novo.cortadoDe.secao, 'Parte A / 1. Viagens');
            assert.equal(novo.cortadoDe.posicao, 2);
        });

        it('texto fora do descarte não perde a posição', async () => {
            await c.editar(11);
            await salvar();
            assert.deepEqual(sequencias(), [1, 2, 3]);
            assert.equal(db[c.colecao].find((t) => t.id === 11).cortadoDe, null);
        });
    });
}
