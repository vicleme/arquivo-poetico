import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Interface da âncora do Eco (F11-D6): chips só com quem existe nos dois
// textos, troca de tipo, e o diálogo ao tirar personagem/pessoa de um texto.
// O dado puro está em ancora-eco.test.js; o db real, em ancora-eco-db.test.js.

const { db } = await import('../js/db.js');
const ui = await import('../js/ancora-eco-ui.js');

let modal;
let ecosDoModal;

function montar() {
    db.personagens.length = 0;
    db.pessoas.length = 0;
    db.poemas.length = 0;
    db.prosas.length = 0;
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.body.innerHTML = `
        <select id="pr-eco-tipo">
            <option value=""></option>
            <option>Personagem em comum</option>
            <option>Pessoa em comum</option>
            <option>Aceno a</option>
        </select>
        <select id="pr-eco-poema"><option value=""></option><option value="10">Maré</option></select>
        <div id="pr-eco-ancoras" data-eco-ancoras-tabela="prosas" class="hidden"></div>`;

    db.personagens.push({ id: 1, nome: 'Iara' }, { id: 2, nome: 'Tomás' }, { id: 3, nome: 'Beto' });
    db.pessoas.push({ id: 5, nome: 'Marina' });
    db.poemas.push({
        id: 10,
        titulo: 'Maré',
        personagens: [{ personagemId: 1 }, { personagemId: 2 }],
        pessoas: [{ pessoaId: 5 }],
        conceitos: { elos: [], ecos: [] },
    });
    // Texto aberto no modal (ainda sem salvar): Iara, Tomás e Beto.
    modal = {
        personagens: [{ personagemId: 1 }, { personagemId: 2 }, { personagemId: 3 }],
        pessoas: [{ pessoaId: 5 }],
    };
    ecosDoModal = [
        {
            id: 10,
            tipo: 'Personagem em comum',
            texto: '',
            ancoras: [{ especie: 'personagem', id: 1 }],
        },
    ];
    ui.registrarProvedorAncora({
        estadoModal: () => modal,
        ecosDoModal: () => ecosDoModal,
        textoId: () => 20,
        repintarEcos: () => {},
    });
    ui.limparAncoras('prosas');
    ui.limparPendenciasAncora('prosas');
    ui.iniciarAncoraEco();
}

function escolher(id, valor) {
    const s = document.getElementById(id);
    s.value = valor;
    s.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('seletor de âncoras', () => {
    beforeEach(montar);

    it('fica oculto num tipo sem âncora e aparece nos tipos com âncora', () => {
        const area = document.getElementById('pr-eco-ancoras');
        escolher('pr-eco-tipo', 'Aceno a');
        assert.ok(area.classList.contains('hidden'));
        escolher('pr-eco-tipo', 'Personagem em comum');
        assert.ok(!area.classList.contains('hidden'));
    });

    it('oferece só quem está nos dois textos, lendo o modal aberto', () => {
        escolher('pr-eco-tipo', 'Personagem em comum');
        escolher('pr-eco-poema', '10');
        const chips = [...document.querySelectorAll('[data-eco-ancora]')].map((c) =>
            c.getAttribute('data-eco-ancora'),
        );
        // Beto está só no texto aberto; Maré não o tem.
        assert.deepEqual(chips, ['personagem:1', 'personagem:2']);
        modal.personagens = modal.personagens.filter((v) => v.personagemId != 2);
        ui.repintarAncoras('prosas');
        assert.equal(document.querySelectorAll('[data-eco-ancora]').length, 1);
    });

    it('marcar e desmarcar um chip atualiza a seleção', () => {
        escolher('pr-eco-tipo', 'Personagem em comum');
        escolher('pr-eco-poema', '10');
        const chip = document.querySelector('[data-eco-ancora="personagem:2"]');
        chip.checked = true;
        chip.dispatchEvent(new Event('change', { bubbles: true }));
        assert.deepEqual(ui.ancorasSelecionadas('prosas'), [{ especie: 'personagem', id: 2 }]);
        const de = document.querySelector('[data-eco-ancora="personagem:2"]');
        de.checked = false;
        de.dispatchEvent(new Event('change', { bubbles: true }));
        assert.deepEqual(ui.ancorasSelecionadas('prosas'), []);
    });

    it('editar um Eco devolve as âncoras e mostra com aviso a que deixou de valer', () => {
        modal.personagens = modal.personagens.filter((v) => v.personagemId != 1);
        document.getElementById('pr-eco-tipo').value = 'Personagem em comum';
        document.getElementById('pr-eco-poema').value = '10';
        ui.definirAncoras('prosas', 'Personagem em comum', [{ especie: 'personagem', id: 1 }]);
        const chip = document.querySelector('[data-eco-ancora="personagem:1"]');
        assert.ok(chip, 'a âncora antiga continua à vista');
        assert.equal(chip.checked, true);
        assert.match(chip.closest('label').textContent, /⚠/);
    });

    it('trocar o tipo com âncora de outra espécie pede confirmação; cancelar volta o tipo', () => {
        escolher('pr-eco-tipo', 'Personagem em comum');
        escolher('pr-eco-poema', '10');
        const chip = document.querySelector('[data-eco-ancora="personagem:1"]');
        chip.checked = true;
        chip.dispatchEvent(new Event('change', { bubbles: true }));

        escolher('pr-eco-tipo', 'Pessoa em comum');
        assert.ok(document.getElementById('modal-confirmar-exclusao'), 'pede confirmação');
        document.getElementById('excl-cancelar').click();
        assert.equal(document.getElementById('pr-eco-tipo').value, 'Personagem em comum');
        assert.equal(ui.ancorasSelecionadas('prosas').length, 1);
    });

    it('trocar o tipo sem âncora marcada não pergunta nada', () => {
        escolher('pr-eco-tipo', 'Personagem em comum');
        escolher('pr-eco-tipo', 'Pessoa em comum');
        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
    });
});

describe('tirar personagem ou pessoa de um texto', () => {
    beforeEach(montar);

    it('sem Eco ancorado nele, remove direto', () => {
        let removeu = false;
        ui.confirmarRemocaoVinculo({
            tabela: 'prosas',
            especie: 'personagem',
            id: 3,
            nome: 'Beto',
            remover: () => (removeu = true),
        });
        assert.equal(removeu, true);
        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
    });

    it('"Manter com aviso" remove só o vínculo; a âncora fica', () => {
        let removeu = false;
        ui.confirmarRemocaoVinculo({
            tabela: 'prosas',
            especie: 'personagem',
            id: 1,
            nome: 'Iara',
            remover: () => (removeu = true),
        });
        assert.equal(removeu, false, 'espera a escolha');
        document.getElementById('excl-confirmar').click();
        assert.equal(removeu, true);
        assert.deepEqual(ecosDoModal[0].ancoras, [{ especie: 'personagem', id: 1 }]);
    });

    it('"Remover a âncora" tira a âncora do Eco do modal e o Eco fica', () => {
        let removeu = false;
        ui.confirmarRemocaoVinculo({
            tabela: 'prosas',
            especie: 'personagem',
            id: 1,
            nome: 'Iara',
            remover: () => (removeu = true),
        });
        document.getElementById('excl-secundaria').click();
        assert.equal(removeu, true);
        assert.equal(ecosDoModal.length, 1);
        assert.equal('ancoras' in ecosDoModal[0], false);
    });

    it('cancelar não remove nem mexe na âncora', () => {
        let removeu = false;
        ui.confirmarRemocaoVinculo({
            tabela: 'prosas',
            especie: 'personagem',
            id: 1,
            nome: 'Iara',
            remover: () => (removeu = true),
        });
        document.getElementById('excl-cancelar').click();
        assert.equal(removeu, false);
        assert.equal(ecosDoModal[0].ancoras.length, 1);
    });

    it('Eco de OUTRO texto só muda ao salvar, e some o pedido se o vínculo voltou', () => {
        // Maré (10) ecoa a Cais (20) no sentido contrário: o Eco mora em Maré.
        db.poemas[0].conceitos.ecos.push({
            id: 20,
            tipo: 'Personagem em comum',
            texto: '',
            ancoras: [{ especie: 'personagem', id: 2 }],
        });
        ecosDoModal = [];
        ui.confirmarRemocaoVinculo({
            tabela: 'prosas',
            especie: 'personagem',
            id: 2,
            nome: 'Tomás',
            remover: () =>
                (modal.personagens = modal.personagens.filter((v) => v.personagemId != 2)),
        });
        document.getElementById('excl-secundaria').click();
        // Ainda não salvou: o outro texto continua intacto.
        assert.equal(db.poemas[0].conceitos.ecos[0].ancoras.length, 1);
        assert.equal(ui.aplicarPendenciasAncora('prosas'), 1);
        assert.equal('ancoras' in db.poemas[0].conceitos.ecos[0], false);

        // Segundo caso: o Tomás volta ao texto antes de salvar, e nada é removido.
        db.poemas[0].conceitos.ecos[0].ancoras = [{ especie: 'personagem', id: 2 }];
        ui.confirmarRemocaoVinculo({
            tabela: 'prosas',
            especie: 'personagem',
            id: 2,
            nome: 'Tomás',
            remover: () => {},
        });
        document.getElementById('excl-secundaria').click();
        modal.personagens = [{ personagemId: 2 }];
        assert.equal(ui.aplicarPendenciasAncora('prosas'), 0);
        assert.equal(db.poemas[0].conceitos.ecos[0].ancoras.length, 1);
    });
});

describe('troca de tipo confirmada', () => {
    beforeEach(montar);

    it('"Trocar e limpar" aplica o tipo novo no select e limpa as âncoras', () => {
        escolher('pr-eco-tipo', 'Personagem em comum');
        escolher('pr-eco-poema', '10');
        const chip = document.querySelector('[data-eco-ancora="personagem:1"]');
        chip.checked = true;
        chip.dispatchEvent(new Event('change', { bubbles: true }));

        escolher('pr-eco-tipo', 'Pessoa em comum');
        document.getElementById('excl-confirmar').click();
        assert.equal(document.getElementById('pr-eco-tipo').value, 'Pessoa em comum');
        assert.deepEqual(ui.ancorasSelecionadas('prosas'), []);
        const chips = [...document.querySelectorAll('[data-eco-ancora]')].map((c) =>
            c.getAttribute('data-eco-ancora'),
        );
        assert.deepEqual(chips, ['pessoa:5']);
    });
});
