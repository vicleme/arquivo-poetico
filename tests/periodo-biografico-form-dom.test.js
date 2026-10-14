import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Bloco 3: formulário do modal de Período Biográfico (Esfera, Categoria,
// Pessoas envolvidas e Relações; Contexto do relacionamento como legado).
const html = readFileSync(new URL('../modais/modal-epoca.html', import.meta.url), 'utf8');
document.body.innerHTML = `<div id="modais-container">${html}</div>`;

const { db } = await import('../js/db.js');
const { ROTULOS_VINCULO_DE_FABRICA } = await import('../js/periodo-biografico-campos.js');
const { initFormEpoca } = await import('../js/forms.js');
const { preencherCamposPeriodoBiografico, lerCamposPeriodoBiografico } =
    await import('../js/periodo-biografico-ui.js');

const el = (id) => document.getElementById(id);
const digitar = (id, valor) => {
    el(id).value = valor;
};
const escolher = (id, valor) => {
    el(id).value = valor;
    el(id).onchange();
};
const adicionarPessoa = (id) => escolher('ep-pessoas-select', String(id));
const novaRelacao = () => el('ep-relacoes-adicionar').click();
const enter = (id) => {
    el(id).dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
};
const enviar = () =>
    el('form-epoca').dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));

function montarBanco() {
    db.autores = [{ id: 1, nome: 'Ana', genero: 'Mulher' }];
    db.pessoas = [
        { id: 100, nome: 'Carla', genero: 'Mulher', oculto: false },
        { id: 101, nome: 'Davi', genero: 'Homem', oculto: true },
    ];
    db.opcoesPeriodoBiografico = {
        esferas: ['Afetiva'],
        naturezas: ['Familiar', 'Amizade', 'Romance', 'Profissional'],
        vinculos: ['Amizade', 'Namorados', ...ROTULOS_VINCULO_DE_FABRICA.map((r) => r.nome)],
        sugestoesNatureza: [
            { vinculo: 'Namorados', natureza: 'Romance' },
            { vinculo: 'Responsável por', natureza: 'Familiar' },
        ],
        rotulosVinculo: ROTULOS_VINCULO_DE_FABRICA.map((r) => ({ ...r })),
    };
    db.epocas = [];
    el('ep-autor').innerHTML = '<option value="1">Ana</option>';
    el('ep-autor').value = '1';
    el('ep-edit-id').value = '';
    el('ep-nome').value = '';
}

describe('modal de Período Biográfico (Bloco 3)', () => {
    beforeEach(() => {
        montarBanco();
        initFormEpoca();
    });

    it('período novo: Esfera, Categoria, pessoa e relação com vínculo são gravadas', () => {
        preencherCamposPeriodoBiografico(null);
        digitar('ep-nome', 'Faculdade');
        digitar('ep-esferas-input', 'Criativa');
        enter('ep-esferas-input');
        digitar('ep-categorias-input', 'Transição');
        enter('ep-categorias-input');
        adicionarPessoa(100);
        novaRelacao();
        escolher('ep-rel-para-0', '100');
        digitar('ep-rel-vinculo-0', 'Colega');
        el('ep-rel-vinculo-0').oninput();
        enter('ep-rel-vinculo-0');
        enviar();
        assert.equal(db.epocas.length, 1);
        const ep = db.epocas[0];
        assert.deepEqual(ep.esferas, ['Criativa']);
        assert.deepEqual(ep.categorias, ['Transição']);
        assert.deepEqual(ep.pessoasEnvolvidas, [{ pessoaId: 100 }]);
        assert.deepEqual(ep.relacoes, [
            { de: 'autor', para: 100, natureza: '', vinculo: 'Colega' },
        ]);
        // valor novo entra nas listas editáveis
        assert.ok(db.opcoesPeriodoBiografico.esferas.includes('Criativa'));
        assert.ok(db.opcoesPeriodoBiografico.vinculos.includes('Colega'));
    });

    it('valor digitado e não confirmado (sem Enter) também é gravado ao salvar', () => {
        preencherCamposPeriodoBiografico(null);
        digitar('ep-nome', 'Infância');
        digitar('ep-esferas-input', 'Familiar');
        enviar();
        assert.deepEqual(db.epocas[0].esferas, ['Familiar']);
    });

    it('Enter no campo de tag não salva o modal inteiro', () => {
        preencherCamposPeriodoBiografico(null);
        digitar('ep-nome', 'Infância');
        digitar('ep-esferas-input', 'Familiar');
        enter('ep-esferas-input');
        assert.equal(db.epocas.length, 0);
    });

    it('pessoa oculta já ligada não aparece na tela de edição, mas é gravada de volta', () => {
        const existente = {
            id: 5,
            nome: 'Namoro',
            autorId: 1,
            esferas: [],
            categorias: [],
            pessoasEnvolvidas: [{ pessoaId: 101 }],
            relacoes: [{ de: 'autor', para: 101, natureza: '', vinculo: 'Romântico' }],
        };
        db.epocas = [existente];
        el('ep-edit-id').value = '5';
        el('ep-nome').value = 'Namoro';
        preencherCamposPeriodoBiografico(existente);
        assert.ok(!el('ep-pessoas-lista').textContent.includes('Davi'));
        assert.ok(!el('ep-relacoes-lista').textContent.includes('Romântico'));
        assert.equal(el('ep-relacoes-lista').children.length, 0);
        const opcoes = [...el('ep-pessoas-select').options].map((o) => o.textContent);
        assert.ok(!opcoes.includes('Davi'));
        const lido = lerCamposPeriodoBiografico();
        assert.deepEqual(lido.pessoasEnvolvidas, [{ pessoaId: 101 }]);
        assert.deepEqual(lido.relacoes, [
            { de: 'autor', para: 101, natureza: '', vinculo: 'Romântico' },
        ]);
        enviar();
        assert.deepEqual(db.epocas[0].pessoasEnvolvidas, [{ pessoaId: 101 }]);
        assert.deepEqual(db.epocas[0].relacoes, [
            { de: 'autor', para: 101, natureza: '', vinculo: 'Romântico' },
        ]);
    });

    it('a frase de prévia usa o gênero de quem tem o papel', () => {
        preencherCamposPeriodoBiografico(null);
        adicionarPessoa(100);
        novaRelacao();
        escolher('ep-rel-de-0', '100');
        escolher('ep-rel-para-0', 'autor');
        digitar('ep-rel-vinculo-0', 'Responsável por');
        el('ep-rel-vinculo-0').oninput();
        assert.equal(el('ep-rel-previa-0').textContent, 'Carla é mãe de Ana');
        // o mesmo vínculo dito do lado oposto
        escolher('ep-rel-de-0', 'autor');
        escolher('ep-rel-para-0', '100');
        digitar('ep-rel-vinculo-0', 'Filho ou filha de');
        el('ep-rel-vinculo-0').oninput();
        assert.equal(el('ep-rel-previa-0').textContent, 'Ana é filha de Carla');
    });

    it('relação incompleta ou com as duas pontas iguais não é gravada', () => {
        preencherCamposPeriodoBiografico(null);
        digitar('ep-nome', 'Teste');
        adicionarPessoa(100);
        novaRelacao(); // sem vínculo e sem "com quem"
        novaRelacao();
        escolher('ep-rel-para-1', 'autor'); // autor com autor
        digitar('ep-rel-vinculo-1', 'Amizade');
        el('ep-rel-vinculo-1').oninput();
        assert.equal(el('ep-rel-previa-1').textContent, 'As duas pontas precisam ser diferentes.');
        enviar();
        assert.deepEqual(db.epocas[0].relacoes, []);
        assert.deepEqual(db.epocas[0].pessoasEnvolvidas, [{ pessoaId: 100 }]);
    });

    it('tirar uma pessoa tira também as relações dela', () => {
        const existente = {
            id: 7,
            nome: 'Fase',
            autorId: 1,
            esferas: [],
            categorias: [],
            pessoasEnvolvidas: [{ pessoaId: 100 }],
            relacoes: [{ de: 'autor', para: 100, natureza: '', vinculo: 'Amizade' }],
        };
        preencherCamposPeriodoBiografico(existente);
        assert.equal(el('ep-relacoes-lista').children.length, 1);
        el('ep-pessoas-lista').querySelector('button').click();
        assert.equal(el('ep-relacoes-lista').children.length, 0);
        assert.deepEqual(lerCamposPeriodoBiografico().relacoes, []);
        assert.deepEqual(lerCamposPeriodoBiografico().pessoasEnvolvidas, []);
    });

    it('período do formato anterior abre com o vínculo como relação autor → pessoa', () => {
        preencherCamposPeriodoBiografico({
            id: 8,
            nome: 'Antes',
            pessoasEnvolvidas: [{ pessoaId: 100, vinculos: ['Amizade'] }],
        });
        assert.equal(el('ep-relacoes-lista').children.length, 1);
        assert.equal(el('ep-rel-previa-0').textContent, 'Ana e Carla têm uma relação de amizade');
        assert.deepEqual(lerCamposPeriodoBiografico().relacoes, [
            { de: 'autor', para: 100, natureza: 'Amizade', vinculo: '' },
        ]);
    });

    it('relação só com Natureza (vínculo vazio) é gravada e a prévia usa a frase simétrica', () => {
        preencherCamposPeriodoBiografico(null);
        adicionarPessoa(100);
        novaRelacao();
        escolher('ep-rel-para-0', '100');
        assert.equal(
            el('ep-rel-previa-0').textContent,
            'Escolha as duas pontas e a Natureza ou o vínculo.',
        );
        escolher('ep-rel-natureza-0', 'Familiar');
        assert.equal(el('ep-rel-previa-0').textContent, 'Ana e Carla têm uma relação de familiar');
        assert.deepEqual(lerCamposPeriodoBiografico().relacoes, [
            { de: 'autor', para: 100, natureza: 'Familiar', vinculo: '' },
        ]);
    });

    it('só o vínculo, sem Natureza, também vale (Natureza vazia)', () => {
        preencherCamposPeriodoBiografico(null);
        adicionarPessoa(100);
        novaRelacao();
        escolher('ep-rel-para-0', '100');
        digitar('ep-rel-vinculo-0', 'Mentoria');
        el('ep-rel-vinculo-0').oninput();
        el('ep-rel-vinculo-0').onchange();
        assert.equal(el('ep-rel-natureza-0').value, '', 'sem sugestão, a Natureza fica vazia');
        assert.deepEqual(lerCamposPeriodoBiografico().relacoes, [
            { de: 'autor', para: 100, natureza: '', vinculo: 'Mentoria' },
        ]);
    });

    it('escolher o vínculo preenche a Natureza sugerida, e ela pode ser trocada', () => {
        preencherCamposPeriodoBiografico(null);
        adicionarPessoa(100);
        novaRelacao();
        escolher('ep-rel-para-0', '100');
        digitar('ep-rel-vinculo-0', 'Namorados');
        el('ep-rel-vinculo-0').oninput();
        el('ep-rel-vinculo-0').onchange();
        assert.equal(el('ep-rel-natureza-0').value, 'Romance');
        assert.equal(el('ep-rel-previa-0').textContent, 'Ana e Carla: Namorados');
        escolher('ep-rel-natureza-0', 'Amizade');
        assert.deepEqual(lerCamposPeriodoBiografico().relacoes, [
            { de: 'autor', para: 100, natureza: 'Amizade', vinculo: 'Namorados' },
        ]);
    });

    it('a Natureza escolhida à mão nunca é trocada pela sugestão do vínculo', () => {
        preencherCamposPeriodoBiografico(null);
        adicionarPessoa(100);
        novaRelacao();
        escolher('ep-rel-para-0', '100');
        escolher('ep-rel-natureza-0', 'Profissional');
        digitar('ep-rel-vinculo-0', 'Namorados');
        el('ep-rel-vinculo-0').oninput();
        el('ep-rel-vinculo-0').onchange();
        assert.equal(el('ep-rel-natureza-0').value, 'Profissional');
    });

    it('trocar de vínculo troca a Natureza que a sugestão anterior tinha posto', () => {
        preencherCamposPeriodoBiografico(null);
        adicionarPessoa(100);
        novaRelacao();
        escolher('ep-rel-para-0', '100');
        digitar('ep-rel-vinculo-0', 'Namorados');
        el('ep-rel-vinculo-0').onchange();
        assert.equal(el('ep-rel-natureza-0').value, 'Romance');
        digitar('ep-rel-vinculo-0', 'Responsável por');
        el('ep-rel-vinculo-0').onchange();
        assert.equal(el('ep-rel-natureza-0').value, 'Familiar');
    });

    it('abrir um período salvo não muda a Natureza que ele já tem', () => {
        preencherCamposPeriodoBiografico({
            id: 9,
            nome: 'Salvo',
            autorId: 1,
            pessoasEnvolvidas: [{ pessoaId: 100 }],
            relacoes: [{ de: 'autor', para: 100, natureza: 'Profissional', vinculo: 'Namorados' }],
        });
        assert.equal(el('ep-rel-natureza-0').value, 'Profissional');
        assert.equal(el('ep-rel-vinculo-0').value, 'Namorados');
    });

    it('Enter no campo de vínculo não salva o modal inteiro', () => {
        preencherCamposPeriodoBiografico(null);
        digitar('ep-nome', 'Teste');
        novaRelacao();
        enter('ep-rel-vinculo-0');
        assert.equal(db.epocas.length, 0);
    });

    it('o campo Contexto do relacionamento não existe mais no modal', () => {
        preencherCamposPeriodoBiografico(null);
        assert.equal(el('ep-contexto'), null);
        assert.equal(el('ep-contexto-legado'), null);
    });

    it('salvar um período de nome já existente mantém as notas e não recria o campo antigo', () => {
        const existente = {
            id: 6,
            nome: 'Antigo',
            autorId: 1,
            notas: 'minhas notas',
            esferas: [],
            categorias: [],
            pessoasEnvolvidas: [],
            relacoes: [],
        };
        db.epocas = [existente];
        el('ep-edit-id').value = '6';
        el('ep-nome').value = 'Antigo';
        el('ep-notas').value = existente.notas;
        preencherCamposPeriodoBiografico(existente);
        enviar();
        assert.equal(db.epocas[0].notas, 'minhas notas');
        assert.equal('contextoRelacao' in db.epocas[0], false);
    });
});
