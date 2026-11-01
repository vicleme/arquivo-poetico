import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Valência na aba Temas: modal (salvar e editar), selo no cartão, filtro,
// resumo e o JSON de exportação.
const modal = fs.readFileSync(new URL('../modais/modal-tema.html', import.meta.url), 'utf8');
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
document.body.innerHTML = `
    <main>
        <input id="busca-temas" />
        <input type="checkbox" id="filtro-temas-sem-assunto" />
        <select id="ordem-temas">
            <option value="alfabetica"></option>
            <option value="usados"></option>
        </select>
        <select id="filtro-temas-valencia">
            <option value=""></option>
            <option value="agradavel"></option>
            <option value="neutro"></option>
            <option value="desagradavel"></option>
            <option value="ambivalente"></option>
            <option value="sem"></option>
        </select>
        <input type="checkbox" id="toggle-todos-temas" />
        <div id="barra-acoes-temas" class="hidden">
            <span id="contador-selecao-temas"></span>
            <select id="temas-massa-valencia">
                <option value="__nenhuma__"></option>
                <option value="agradavel"></option>
                <option value="desagradavel"></option>
                <option value=""></option>
            </select>
        </div>
        <span id="resumo-temas"></span>
        <div id="lista-temas"></div>
    </main>
    ${modal}
`;

const { db } = await import('../js/db.js');
const { renderTemas, definirBuscaTemas } = await import('../js/render-listas.js');
const { initFormTema, editarTema } = await import('../js/forms.js');
const { prepararNovo } = await import('../js/ui.js');
const { sincronizarTemas } = await import('../js/temas.js');
const { montarRegistro } = await import('../js/exportar.js');
const ui = await import('../js/temas-massa-ui.js');
const { limparSelecaoTemas, selecaoTemas } = await import('../js/temas-massa.js');

const $ = (id) => document.getElementById(id);
const nomesNaLista = () => [...$('lista-temas').querySelectorAll('h4')].map((h) => h.textContent);
const enviar = () => $('form-tema').dispatchEvent(new Event('submit', { cancelable: true }));

function preparar() {
    db.poemas = [
        { id: 1, titulo: 'A', sinalizacoesTema: 'Luto, Amizade' },
        { id: 2, titulo: 'B', sinalizacoesTema: 'Saudade, Paisagem' },
    ];
    db.prosas = [];
    db.assuntos = [];
    db.temas = [];
    sincronizarTemas(db);
    const porNome = (n) => db.temas.find((t) => t.nome === n);
    porNome('Luto').valencia = 'desagradavel';
    porNome('Amizade').valencia = 'agradavel';
    porNome('Saudade').valencia = 'ambivalente';
    // Paisagem fica sem valência.
    $('busca-temas').value = '';
    $('filtro-temas-sem-assunto').checked = false;
    $('ordem-temas').value = 'alfabetica';
    $('filtro-temas-valencia').value = '';
}

describe('index.html e modal', () => {
    it('o filtro de valência existe na aba Temas, com as seis opções', () => {
        assert.match(indexHtml, /id="filtro-temas-valencia"/);
        ['agradavel', 'neutro', 'desagradavel', 'ambivalente', 'sem'].forEach((v) =>
            assert.match(indexHtml, new RegExp(`<option value="${v}">`)),
        );
    });

    it('o modal tem o seletor de valência, com "Não classificado" primeiro', () => {
        const opcoes = [...$('te-valencia').options].map((o) => o.value);
        assert.deepEqual(opcoes, ['', 'agradavel', 'neutro', 'desagradavel', 'ambivalente']);
    });
});

describe('cartão do Tema e filtro de valência', () => {
    beforeEach(preparar);

    it('cada cartão tem o seletor de valência, no valor do tema', () => {
        renderTemas();
        const valores = [...$('lista-temas').querySelectorAll('select[data-valencia]')].map((e) => [
            e.closest('div[data-atribuido]').querySelector('h4').textContent,
            e.value,
        ]);
        assert.deepEqual(valores, [
            ['Amizade', 'agradavel'],
            ['Luto', 'desagradavel'],
            ['Paisagem', ''],
            ['Saudade', 'ambivalente'],
        ]);
    });

    it('trocar o seletor do cartão grava a valência; "Sem valência" limpa', () => {
        renderTemas();
        const luto = db.temas.find((t) => t.nome === 'Luto');
        const sel = () => $('lista-temas').querySelector(`select[data-tema-id="${luto.id}"]`);
        sel().value = 'ambivalente';
        ui.definirValenciaDoCard(sel());
        assert.equal(luto.valencia, 'ambivalente');
        assert.equal(sel().value, 'ambivalente');
        sel().value = '';
        ui.definirValenciaDoCard(sel());
        assert.equal('valencia' in luto, false);
    });

    it('classificar um tema do filtro "Sem valência" o tira da lista', () => {
        $('filtro-temas-valencia').value = 'sem';
        renderTemas();
        const sel = $('lista-temas').querySelector('select[data-valencia]');
        sel.value = 'neutro';
        ui.definirValenciaDoCard(sel);
        assert.deepEqual(nomesNaLista(), []);
        assert.equal(db.temas.find((t) => t.nome === 'Paisagem').valencia, 'neutro');
    });

    it('filtra por uma valência', () => {
        $('filtro-temas-valencia').value = 'desagradavel';
        renderTemas();
        assert.deepEqual(nomesNaLista(), ['Luto']);
    });

    it('"Sem valência" mostra só os não classificados', () => {
        $('filtro-temas-valencia').value = 'sem';
        renderTemas();
        assert.deepEqual(nomesNaLista(), ['Paisagem']);
    });

    it('o resumo conta os sem valência quando já há tema classificado', () => {
        renderTemas();
        assert.match(
            $('resumo-temas').textContent,
            /4 de 4 temas · 4 sem assunto · 1 sem valência/,
        );
    });

    it('o resumo não fala de valência enquanto nenhum tema foi classificado', () => {
        db.temas.forEach((t) => delete t.valencia);
        renderTemas();
        assert.doesNotMatch($('resumo-temas').textContent, /valência/);
    });

    it('buscar um tema por fora (definirBuscaTemas) limpa o filtro de valência', () => {
        $('filtro-temas-valencia').value = 'neutro';
        definirBuscaTemas('Luto');
        assert.equal($('filtro-temas-valencia').value, '');
        assert.deepEqual(nomesNaLista(), ['Luto']);
    });
});

describe('modal de Tema: salvar e editar a valência', () => {
    beforeEach(preparar);

    it('Novo Tema nasce com a valência escolhida', async () => {
        initFormTema();
        await prepararNovo('tema');
        $('te-nome').value = 'Esperança';
        $('te-valencia').value = 'agradavel';
        enviar();
        assert.equal(db.temas.find((t) => t.nome === 'Esperança').valencia, 'agradavel');
    });

    it('Novo Tema sem escolher fica sem o campo', async () => {
        initFormTema();
        await prepararNovo('tema');
        $('te-nome').value = 'Chuva';
        enviar();
        const t = db.temas.find((x) => x.nome === 'Chuva');
        assert.ok(t);
        assert.equal('valencia' in t, false);
    });

    it('Editar carrega a valência e salvar troca ou limpa', async () => {
        initFormTema();
        const luto = db.temas.find((t) => t.nome === 'Luto');
        await editarTema(luto.id);
        assert.equal($('te-valencia').value, 'desagradavel');
        $('te-valencia').value = 'ambivalente';
        enviar();
        assert.equal(luto.valencia, 'ambivalente');

        await editarTema(luto.id);
        $('te-valencia').value = '';
        enviar();
        assert.equal('valencia' in luto, false);
    });

    it('Editar tema sem valência abre em "Não classificado"', async () => {
        initFormTema();
        const p = db.temas.find((t) => t.nome === 'Paisagem');
        await editarTema(p.id);
        assert.equal($('te-valencia').value, '');
    });
});

describe('JSON de exportação', () => {
    beforeEach(preparar);

    it('cada Tema do texto leva a valência do cadastro, só quando existe', () => {
        const reg = montarRegistro('poema', db.poemas[0]);
        const porNome = Object.fromEntries(reg.temas.map((t) => [t.nome, t]));
        assert.equal(porNome.Luto.valencia, 'desagradavel');
        assert.equal(porNome.Amizade.valencia, 'agradavel');
        const reg2 = montarRegistro('poema', db.poemas[1]);
        const paisagem = reg2.temas.find((t) => t.nome === 'Paisagem');
        assert.equal('valencia' in paisagem, false);
    });
});

describe('edição em massa na aba Temas', () => {
    beforeEach(preparar);

    it('o index.html tem a barra, a caixa "todos" e o botão da amostra', () => {
        [
            'barra-acoes-temas',
            'contador-selecao-temas',
            'temas-massa-valencia',
            'toggle-todos-temas',
        ].forEach((id) => assert.match(indexHtml, new RegExp(`id="${id}"`)));
        assert.match(indexHtml, /data-action="aplicar-valencias-sugeridas"/);
        assert.match(indexHtml, /data-action="aplicar-valencia-temas"/);
        assert.match(indexHtml, /data-action="limpar-selecao-temas"/);
    });
});

describe('ações da tela de edição em massa', () => {
    beforeEach(() => {
        preparar();
        limparSelecaoTemas();
    });

    it('marcar um cartão mostra a barra com o contador; "todos" marca os que aparecem', () => {
        renderTemas();
        assert.ok($('barra-acoes-temas').classList.contains('hidden'));
        const luto = db.temas.find((t) => t.nome === 'Luto');
        ui.aoMarcarTema(luto.id, true, false);
        assert.equal($('barra-acoes-temas').classList.contains('hidden'), false);
        assert.equal($('contador-selecao-temas').textContent, '1 tema selecionado');
        assert.ok($('lista-temas').querySelector(`input[data-id="${luto.id}"]`).checked);
        ui.aoMarcarTodosTemas(true);
        assert.equal($('contador-selecao-temas').textContent, '4 temas selecionados');
        assert.equal($('toggle-todos-temas').checked, true);
    });

    it('"todos" respeita o filtro de valência', () => {
        $('filtro-temas-valencia').value = 'sem';
        renderTemas();
        ui.aoMarcarTodosTemas(true);
        assert.equal(selecaoTemas.size, 1);
        $('temas-massa-valencia').value = 'agradavel';
        ui.aoAplicarValenciaEmMassa();
        assert.equal(db.temas.find((t) => t.nome === 'Paisagem').valencia, 'agradavel');
        assert.equal(db.temas.find((t) => t.nome === 'Luto').valencia, 'desagradavel');
    });

    it('aplicar sem escolher a valência não muda nada', () => {
        renderTemas();
        ui.aoMarcarTodosTemas(true);
        $('temas-massa-valencia').value = '__nenhuma__';
        ui.aoAplicarValenciaEmMassa();
        assert.equal(db.temas.find((t) => t.nome === 'Luto').valencia, 'desagradavel');
    });

    it('limpar a seleção esconde a barra', () => {
        renderTemas();
        ui.aoMarcarTodosTemas(true);
        ui.aoLimparSelecaoTemas();
        assert.ok($('barra-acoes-temas').classList.contains('hidden'));
        assert.equal(selecaoTemas.size, 0);
    });

    it('"Aplicar valências sugeridas" preenche os da amostra sem valência', () => {
        db.temas.push({ id: 900, nome: 'Cotidiano', notas: '' });
        renderTemas();
        ui.aoAplicarValenciasSugeridas();
        assert.equal(db.temas.find((t) => t.nome === 'Cotidiano').valencia, 'neutro');
        assert.equal('valencia' in db.temas.find((t) => t.nome === 'Paisagem'), false);
    });
});
