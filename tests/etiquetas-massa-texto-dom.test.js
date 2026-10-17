import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Campo de etiquetas (chips) nas barras de edição em massa das abas de texto
// (Poemas e Prosas): Pessoas, Sinalizações, Gênero (só Prosa), Temas e o
// nome em Períodos e movimentos. Usa o HTML de verdade do index.html, para
// pegar também o markup (bloco com o <div id="{id}-chips" ...> acima do campo).
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const secao = (id) => indexHtml.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))[0];
document.body.innerHTML = `<main>${secao('poemas')}${secao('prosas')}</main>`;

const { db } = await import('../js/db.js');
const { textoDeEtiquetas } = await import('../js/utils.js');
const SM = await import('../js/selecao-massa.js');
const { renderPoemas, renderProsas } = await import('../js/render-listas.js');

const el = (id) => document.getElementById(id);
const chips = (idCampo) =>
    [...el(`${idCampo}-chips`).querySelectorAll('span > span')].map((s) => s.textContent);
const teclar = (id, key) => el(id).onkeydown({ key, preventDefault() {}, stopPropagation() {} });
const digitar = (id, texto, key = 'Enter') => {
    el(id).value = texto;
    teclar(id, key);
};
const confirmar = () => el('excl-confirmar').click();
const modalAberto = () => {
    const overlay = el('modal-confirmar-exclusao');
    return !!overlay && overlay.style.display !== 'none';
};
const textoDoModal = () => el('modal-confirmar-exclusao')?.textContent || '';

const poema = (id, extra = {}) => ({
    id,
    titulo: `P${id}`,
    sequencia: id,
    paiTipo: 'livro',
    paiId: 9,
    autoria: [{ autorId: 1 }],
    ...extra,
});
const prosa = (id, extra = {}) => ({ id, titulo: `Pr${id}`, sequencia: id, ...extra });

function selecionarPoemas(...ids) {
    renderPoemas();
    ids.forEach((id) => SM.toggleSelecao('poemas', true, id));
}
function selecionarProsas(...ids) {
    renderProsas();
    ids.forEach((id) => SM.toggleSelecao('prosas', true, id));
}

const CAMPOS = [
    'bulk-pessoa-input',
    'bulk-pessoa-input-prosa',
    'bulk-sinal-input',
    'bulk-sinal-input-prosa',
    'bulk-tema-input',
    'bulk-tema-input-prosa',
    'bulk-genero-input-prosa',
];

async function reset() {
    const { limparEtiquetasMassa } = await import('../js/campo-etiquetas-massa.js');
    db.poemas.length = 0;
    db.prosas.length = 0;
    SM.limparSelecao('poemas');
    SM.limparSelecao('prosas');
    db.etiquetas = [];
    db.autores = [{ id: 1, nome: 'Autor Um' }];
    db.pessoas = [
        { id: 1, nome: 'Ana' },
        { id: 2, nome: 'Bia' },
    ];
    db.temas = [
        { id: 101, nome: 'Amor', notas: '' },
        { id: 102, nome: 'Saudade', notas: '' },
    ];
    db.movimentosEscolas = [
        { id: 300, nome: 'Simbolismo' },
        { id: 301, nome: 'Modernismo' },
    ];
    db.epocas = [];
    db.periodosHistoricos = [];
    // O campo de etiquetas guarda a lista em memória, fora do DOM.
    CAMPOS.forEach((id) => limparEtiquetasMassa(id));
    el('painel-periodos-massa').innerHTML = '';
    el('painel-periodos-massa-prosa').innerHTML = '';
    const overlay = el('modal-confirmar-exclusao');
    if (overlay) overlay.style.display = 'none';
}

describe('Barra de Poemas e Prosas: o markup traz o campo de etiquetas', () => {
    it('cada campo tem o bloco de etiquetas e nenhum Enter aplica direto', () => {
        CAMPOS.forEach((id) => {
            assert.ok(el(id), `falta o campo ${id}`);
            assert.ok(el(`${id}-chips`), `falta o bloco de etiquetas de ${id}`);
            assert.equal(
                el(id).getAttribute('onkeydown'),
                null,
                `${id} não deve aplicar sozinho no Enter: Enter confirma a etiqueta`,
            );
        });
    });
});

describe('Pessoas em massa com etiquetas', () => {
    beforeEach(reset);

    it('ligar a barra liga o campo: Enter e vírgula viram etiquetas, o × tira', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        digitar('bulk-pessoa-input', 'Ana');
        digitar('bulk-pessoa-input', 'Bia', ',');
        assert.deepEqual(chips('bulk-pessoa-input'), ['Ana', 'Bia']);
        el('bulk-pessoa-input-chips').querySelector('button').click();
        assert.deepEqual(chips('bulk-pessoa-input'), ['Bia']);
    });

    it('dedica várias pessoas numa confirmação só, sem papéis, criando quem não existe', () => {
        db.poemas.push(
            poema(1, { pessoas: [{ pessoaId: 1, papeis: ['Retratado(a)'] }] }),
            poema(2),
            poema(3),
        );
        selecionarPoemas(1, 2);
        digitar('bulk-pessoa-input', 'Ana');
        digitar('bulk-pessoa-input', 'Caio');
        SM.aplicarPessoaEmMassa('poemas');
        assert.ok(modalAberto());
        assert.match(textoDoModal(), /"Ana" e "Caio"/);
        assert.equal(db.poemas[1].pessoas, undefined, 'nada muda antes de confirmar');
        confirmar();

        const caio = db.pessoas.find((p) => p.nome === 'Caio');
        assert.ok(caio, 'Caio foi criado no cadastro');
        assert.deepEqual(db.poemas[0].pessoas, [
            { pessoaId: 1, papeis: ['Retratado(a)'] },
            { pessoaId: caio.id, papeis: [] },
        ]);
        assert.deepEqual(db.poemas[1].pessoas, [
            { pessoaId: 1, papeis: [] },
            { pessoaId: caio.id, papeis: [] },
        ]);
        assert.equal(db.poemas[2].pessoas, undefined);
        assert.deepEqual(chips('bulk-pessoa-input'), [], 'campo limpo depois de aplicar');
    });

    it('o que ainda está digitado entra ao clicar em Dedicar', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        el('bulk-pessoa-input').value = 'Bia';
        SM.aplicarPessoaEmMassa('poemas');
        confirmar();
        assert.deepEqual(db.poemas[0].pessoas, [{ pessoaId: 2, papeis: [] }]);
    });

    it('remove várias pessoas e avisa de quem não está no cadastro', () => {
        db.poemas.push(
            poema(1, {
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 2, papeis: [] },
                ],
            }),
        );
        selecionarPoemas(1);
        digitar('bulk-pessoa-input', 'Ana');
        digitar('bulk-pessoa-input', 'Zé');
        SM.removerPessoaEmMassa('poemas');
        assert.ok(modalAberto());
        assert.match(textoDoModal(), /"Zé" não está cadastrada e será ignorada/);
        confirmar();
        assert.deepEqual(db.poemas[0].pessoas, [{ pessoaId: 2, papeis: [] }]);
    });

    it('remover só nomes fora do cadastro não abre confirmação nem cria ninguém', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        digitar('bulk-pessoa-input', 'Fulano');
        SM.removerPessoaEmMassa('poemas');
        assert.ok(!modalAberto());
        assert.equal(db.pessoas.length, 2);
        assert.deepEqual(chips('bulk-pessoa-input'), []);
    });

    it('funciona nas Prosas, com o campo próprio', () => {
        db.prosas.push(prosa(7));
        selecionarProsas(7);
        digitar('bulk-pessoa-input-prosa', 'Ana');
        digitar('bulk-pessoa-input-prosa', 'Bia');
        SM.aplicarPessoaEmMassa('prosas');
        confirmar();
        assert.deepEqual(
            db.prosas[0].pessoas.map((p) => p.pessoaId),
            [1, 2],
        );
        assert.deepEqual(chips('bulk-pessoa-input'), [], 'o campo de Poemas não foi tocado');
    });
});

describe('Sinalizações em massa com etiquetas', () => {
    beforeEach(reset);

    const categoria = (valor, sufixo = '') => {
        const sel = el(`bulk-sinal-categoria${sufixo}`);
        sel.value = valor;
        SM.atualizarListaSinalBulk(sel, `bulk-sinal-input${sufixo}`, sufixo);
    };

    it('marca várias etiquetas na categoria escolhida, numa confirmação só', () => {
        db.poemas.push(poema(1, { sinalizacoesTom: 'Lírico' }), poema(2), poema(3));
        selecionarPoemas(1, 2);
        categoria('sinalizacoesTom');
        digitar('bulk-sinal-input', 'Lírico');
        digitar('bulk-sinal-input', 'Sombrio');
        SM.aplicarSinalEmMassa('poemas');
        assert.match(textoDoModal(), /as etiquetas "Lírico" e "Sombrio"/);
        confirmar();
        // Etiquetas guardam ids (Fase 16); o nome vem do cadastro.
        assert.equal(
            textoDeEtiquetas(db.poemas[0].sinalizacoesTom),
            'Lírico, Sombrio',
            'sem duplicar o que já tinha',
        );
        assert.equal(textoDeEtiquetas(db.poemas[1].sinalizacoesTom), 'Lírico, Sombrio');
        assert.equal(db.poemas[2].sinalizacoesTom, undefined);
        assert.deepEqual(chips('bulk-sinal-input'), []);
    });

    it('uma etiqueta só mantém o texto no singular', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        categoria('sinalizacoesEstilo');
        digitar('bulk-sinal-input', 'Barroco');
        SM.aplicarSinalEmMassa('poemas');
        assert.match(textoDoModal(), /a etiqueta "Barroco"/);
        assert.doesNotMatch(textoDoModal(), /as etiquetas/);
    });

    it('trocar a categoria esvazia as etiquetas e troca o datalist', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        categoria('sinalizacoesTom');
        digitar('bulk-sinal-input', 'Lírico');
        assert.deepEqual(chips('bulk-sinal-input'), ['Lírico']);
        categoria('sinalizacoesEstilo');
        assert.deepEqual(chips('bulk-sinal-input'), []);
        assert.equal(el('bulk-sinal-input').getAttribute('list'), 'sugestoes-sinais-estilo-bulk');
    });

    it('remove várias etiquetas e deixa as outras', () => {
        db.poemas.push(poema(1, { sinalizacoesTom: 'Lírico, Sombrio, Épico' }));
        selecionarPoemas(1);
        categoria('sinalizacoesTom');
        digitar('bulk-sinal-input', 'Lírico');
        digitar('bulk-sinal-input', 'Épico');
        SM.removerSinalEmMassa('poemas');
        confirmar();
        assert.equal(textoDeEtiquetas(db.poemas[0].sinalizacoesTom), 'Sombrio');
    });

    it('funciona nas Prosas', () => {
        db.prosas.push(prosa(7));
        selecionarProsas(7);
        categoria('sinalizacoesTom', '-prosa');
        digitar('bulk-sinal-input-prosa', 'Lírico');
        digitar('bulk-sinal-input-prosa', 'Sombrio');
        SM.aplicarSinalEmMassa('prosas');
        confirmar();
        assert.equal(textoDeEtiquetas(db.prosas[0].sinalizacoesTom), 'Lírico, Sombrio');
    });
});

describe('Gênero em massa (Prosa) com etiquetas', () => {
    beforeEach(reset);

    it('marca e remove vários gêneros de uma vez', () => {
        db.prosas.push(prosa(7, { genero: 'Conto' }), prosa(8), prosa(9));
        selecionarProsas(7, 8);
        digitar('bulk-genero-input-prosa', 'Conto');
        digitar('bulk-genero-input-prosa', 'Crônica');
        SM.aplicarGeneroEmMassaProsa();
        assert.match(textoDoModal(), /os gêneros "Conto" e "Crônica"/);
        confirmar();
        assert.equal(db.prosas[0].genero, 'Conto, Crônica');
        assert.equal(db.prosas[1].genero, 'Conto, Crônica');
        assert.equal(db.prosas[2].genero, undefined);

        selecionarProsas(7, 8);
        digitar('bulk-genero-input-prosa', 'Conto');
        SM.removerGeneroEmMassaProsa();
        assert.match(textoDoModal(), /o gênero "Conto"/);
        confirmar();
        assert.equal(db.prosas[0].genero, 'Crônica');
    });
});

describe('Temas em massa com etiquetas', () => {
    beforeEach(reset);

    it('Enter vira etiqueta no painel de Temas e a ação leva todas, criando o que falta', () => {
        db.poemas.push(poema(1), poema(2));
        selecionarPoemas(1, 2);
        SM.prepararPainelTemasMassa('poemas');
        digitar('bulk-tema-input', 'Amor');
        digitar('bulk-tema-input', 'Exílio');
        assert.deepEqual(chips('bulk-tema-input'), ['Amor', 'Exílio']);
        SM.aplicarTemaEmMassa('poemas');
        assert.match(textoDoModal(), /"Exílio" ainda não existe no cadastro/);
        confirmar();
        assert.equal(db.poemas[0].temas.length, 2);
        assert.equal(db.poemas[1].temas.length, 2);
        assert.ok(db.temas.some((t) => t.nome === 'Exílio'));
        assert.deepEqual(chips('bulk-tema-input'), []);
    });

    it('o datalist traz o cadastro sem encadear texto', () => {
        SM.prepararPainelTemasMassa('prosas');
        const valores = [...el('sugestoes-temas-bulk-prosa').querySelectorAll('option')].map(
            (o) => o.value,
        );
        assert.deepEqual(valores, ['Amor', 'Saudade']);
    });
});

describe('Períodos e movimentos em massa com etiquetas', () => {
    beforeEach(reset);

    const escolherTipo = (tipo, tabela = 'poemas') => {
        el('bulk-periodo-tipo').value = tipo;
        SM.trocarTipoPeriodoMassa(tabela);
    };

    it('o painel monta o bloco de etiquetas e o placeholder avisa do Enter', () => {
        SM.prepararPainelPeriodosMassa('poemas');
        assert.ok(el('bulk-periodo-nome-chips'));
        assert.match(el('bulk-periodo-nome').placeholder, /Enter adiciona/);
        assert.equal(el('bulk-periodo-nome').getAttribute('onkeydown'), null);
    });

    it('acrescenta vários movimentos numa confirmação só, criando o que falta', () => {
        db.poemas.push(poema(1, { movimentosEscolasIds: [300] }), poema(2), poema(3));
        selecionarPoemas(1, 2);
        SM.prepararPainelPeriodosMassa('poemas');
        escolherTipo('movimento');
        digitar('bulk-periodo-nome', 'Simbolismo');
        digitar('bulk-periodo-nome', 'Modernismo');
        digitar('bulk-periodo-nome', 'Parnasianismo');
        assert.deepEqual(chips('bulk-periodo-nome'), ['Simbolismo', 'Modernismo', 'Parnasianismo']);
        SM.aplicarPeriodoEmMassa('poemas');
        assert.ok(modalAberto());
        assert.match(textoDoModal(), /"Simbolismo", "Modernismo" e "Parnasianismo"/);
        assert.match(textoDoModal(), /"Parnasianismo" ainda não existe no cadastro/);
        assert.match(textoDoModal(), /2 poemas/);
        confirmar();

        const parnasianismo = db.movimentosEscolas.find((m) => m.nome === 'Parnasianismo');
        assert.ok(parnasianismo, 'Parnasianismo foi criado');
        assert.deepEqual(db.poemas[0].movimentosEscolasIds, [300, 301, parnasianismo.id]);
        assert.deepEqual(db.poemas[1].movimentosEscolasIds, [300, 301, parnasianismo.id]);
        assert.equal(db.poemas[2].movimentosEscolasIds, undefined);
        assert.deepEqual(chips('bulk-periodo-nome'), []);
    });

    it('quando nenhum nome muda nada, avisa e não abre confirmação', () => {
        db.poemas.push(poema(1, { movimentosEscolasIds: [300, 301] }));
        selecionarPoemas(1);
        SM.prepararPainelPeriodosMassa('poemas');
        escolherTipo('movimento');
        digitar('bulk-periodo-nome', 'Simbolismo');
        digitar('bulk-periodo-nome', 'Modernismo');
        SM.aplicarPeriodoEmMassa('poemas');
        assert.ok(!modalAberto());
        assert.deepEqual(db.poemas[0].movimentosEscolasIds, [300, 301]);
    });

    it('remove vários movimentos de uma vez e ignora o nome que ninguém tinha', () => {
        db.poemas.push(poema(1, { movimentosEscolasIds: [300, 301] }), poema(2));
        selecionarPoemas(1, 2);
        SM.prepararPainelPeriodosMassa('poemas');
        escolherTipo('movimento');
        digitar('bulk-periodo-nome', 'Simbolismo');
        digitar('bulk-periodo-nome', 'Inexistente');
        SM.removerPeriodoEmMassa('poemas');
        assert.match(textoDoModal(), /"Simbolismo"/);
        assert.match(textoDoModal(), /"Inexistente" não estava em nenhum dos selecionados/);
        confirmar();
        assert.deepEqual(db.poemas[0].movimentosEscolasIds, [301]);
        assert.equal(db.movimentosEscolas.length, 2, 'o cadastro não é apagado');
    });

    it('trocar o campo esvazia as etiquetas', () => {
        SM.prepararPainelPeriodosMassa('poemas');
        escolherTipo('movimento');
        digitar('bulk-periodo-nome', 'Simbolismo');
        assert.deepEqual(chips('bulk-periodo-nome'), ['Simbolismo']);
        escolherTipo('periodoHistorico');
        assert.deepEqual(chips('bulk-periodo-nome'), []);
    });

    it('reabrir o painel mantém as etiquetas do mesmo campo', () => {
        SM.prepararPainelPeriodosMassa('poemas');
        escolherTipo('movimento');
        digitar('bulk-periodo-nome', 'Simbolismo');
        SM.prepararPainelPeriodosMassa('poemas');
        assert.deepEqual(chips('bulk-periodo-nome'), ['Simbolismo']);
    });
});
