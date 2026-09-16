import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const {
    inicializarGradeMolde,
    atualizarAlvoGradeMolde,
    atualizarPeMetricoGradeMolde,
    obterLinhasMolde,
    adicionarVersoMolde,
    adicionarQuebraEstrofeMolde,
    removerLinhaMolde,
} = await import('../js/editor-molde.js');

describe('inicializarGradeMolde — DOM real (happy-dom)', () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = '<div id="molde-grade-container"></div>';
        container = document.getElementById('molde-grade-container');
    });

    it('sem versos, mostra a mensagem de grade vazia e não uma tabela', () => {
        inicializarGradeMolde(container, [], '');
        assert.match(container.textContent, /Nenhum verso ainda/);
        assert.equal(container.querySelector('table'), null);
    });

    it('carrega linhas salvas (edição de um Molde existente)', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' },
            { tipo: 'vazia' },
            { tipo: 'verso', numero: 2, texto: 'A/ noi/te/ ca/iu' },
        ];
        inicializarGradeMolde(container, linhas, '');
        assert.equal(container.querySelectorAll('.molde-linha-texto').length, 2);
        assert.equal(container.querySelectorAll('.molde-linha-vazia').length, 1);
    });

    it('"+ Verso" adiciona uma linha vazia e foca o campo recém-criado', () => {
        inicializarGradeMolde(container, [], '');
        adicionarVersoMolde();
        assert.equal(container.querySelectorAll('.molde-linha-texto').length, 1);
        assert.equal(obterLinhasMolde()[0].texto, '');
    });

    it('"+ Quebra de estrofe" adiciona uma linha vazia sem campo de texto', () => {
        inicializarGradeMolde(container, [], '');
        adicionarQuebraEstrofeMolde();
        assert.equal(container.querySelectorAll('.molde-linha-vazia').length, 1);
        assert.equal(container.querySelectorAll('.molde-linha-texto').length, 0);
    });

    it('remover uma linha atualiza a grade e renumera os versos restantes', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Primeiro' },
            { tipo: 'verso', numero: 2, texto: 'Segundo' },
        ];
        inicializarGradeMolde(container, linhas, '');
        removerLinhaMolde(0);
        const restantes = obterLinhasMolde();
        assert.equal(restantes.length, 1);
        assert.equal(restantes[0].texto, 'Segundo');
        assert.equal(restantes[0].numero, 1);
    });

    it('digitar num verso atualiza o texto (obterLinhasMolde reflete o que foi digitado)', () => {
        inicializarGradeMolde(container, [{ tipo: 'verso', numero: 1, texto: '' }], '');
        const campo = container.querySelector('.molde-linha-texto[data-idx="0"]');
        campo.textContent = 'Quan/do o/ sol/ se/ pôs';
        campo.dispatchEvent(new window.Event('input', { bubbles: true }));

        assert.equal(obterLinhasMolde()[0].texto, 'Quan/do o/ sol/ se/ pôs');
    });

    it('contagem silábica ao vivo aparece na coluna de contagem enquanto digita', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: '' }],
            'Decassílabo (10)',
        );
        const campo = container.querySelector('.molde-linha-texto[data-idx="0"]');
        campo.textContent = 'Quan/do o/ sol/ se/ pôs';
        campo.dispatchEvent(new window.Event('input', { bubbles: true }));

        const celula = container.querySelector(
            '#molde-grade-body tr[data-idx="0"] .molde-cel-contagem',
        );
        assert.equal(celula.textContent.trim(), '5/10');
    });

    it('divergência do alvo silábico marca a célula de contagem em destaque', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            'Decassílabo (10)',
        );
        const celula = container.querySelector(
            '#molde-grade-body tr[data-idx="0"] .molde-cel-contagem',
        );
        assert.match(celula.className, /text-amber/);
    });

    it('sem alvo fixo (ex. Verso Livre), mostra só a contagem, sem divergência', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            'Verso Livre',
        );
        const celula = container.querySelector(
            '#molde-grade-body tr[data-idx="0"] .molde-cel-contagem',
        );
        assert.equal(celula.textContent.trim(), '5');
        assert.doesNotMatch(celula.className, /text-amber/);
    });

    it('trocar a meta com atualizarAlvoGradeMolde recalcula o alvo sem apagar o texto já escrito', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
        );
        atualizarAlvoGradeMolde('Decassílabo (10)');

        const celula = container.querySelector(
            '#molde-grade-body tr[data-idx="0"] .molde-cel-contagem',
        );
        assert.equal(celula.textContent.trim(), '5/10');
        assert.equal(obterLinhasMolde()[0].texto, 'Quan/do o/ sol/ se/ pôs');
    });

    it('rótulo do alvo mostra a mensagem de "sem alvo fixo" quando não há número entre parênteses', () => {
        inicializarGradeMolde(container, [], 'Bárbaro');
        assert.match(container.textContent, /Sem alvo fixo de sílabas/);
    });

    it('rótulo do alvo mostra o número de sílabas esperado quando há Tamanho do Verso fixo', () => {
        inicializarGradeMolde(container, [], 'Decassílabo (10)');
        assert.match(container.textContent, /Alvo: 10 sílabas por verso/);
    });

    it('editar sem salvar não deixa rastro no que foi passado a inicializarGradeMolde (clona as linhas)', () => {
        const linhasSalvas = [{ tipo: 'verso', numero: 1, texto: 'Original' }];
        inicializarGradeMolde(container, linhasSalvas, '');
        const campo = container.querySelector('.molde-linha-texto[data-idx="0"]');
        campo.textContent = 'Mudou';
        campo.dispatchEvent(new window.Event('input', { bubbles: true }));

        assert.equal(linhasSalvas[0].texto, 'Original');
    });
});

// ─── Bloco 2 sub-passo 2 (lado do Molde) — Modo Tônica + grade
// silábica clicável + divergência de Pé Métrico, replicando o gesto que
// já existia em editor-sonoridade.js. Ver manutencao/criacao-molde.md.
describe('Modo Tônica e Pé Métrico na grade do Molde — DOM real (happy-dom)', () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = '<div id="molde-grade-container"></div>';
        container = document.getElementById('molde-grade-container');
    });

    function celulaSilaba(linhaIdx, silabaIdx) {
        return container.querySelector(
            `.molde-cel-silaba[data-linha-idx="${linhaIdx}"][data-silaba-idx="${silabaIdx}"]`,
        );
    }

    it('grade nasce com Modo Tônica desligado e a régua com uma coluna por sílaba do maior verso', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
        );
        const botao = container.querySelector('#molde-btn-modo-tonico');
        assert.equal(botao.getAttribute('aria-pressed'), 'false');
        assert.equal(container.querySelectorAll('#molde-grade-header-row th').length, 10); // Nº + Verso + 5 sílabas + Cont. + Rima + coluna vazia do botão remover
    });

    it('clicar numa sílaba SEM Modo Tônica ligado não marca nada', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
        );
        celulaSilaba(0, 0).dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.deepEqual(obterLinhasMolde()[0].tonicas, []);
    });

    it('ligar Modo Tônica e clicar numa sílaba real marca a tônica (destaque âmbar + linha.tonicas)', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
        );
        container.querySelector('#molde-btn-modo-tonico').click();
        assert.equal(
            container.querySelector('#molde-btn-modo-tonico').getAttribute('aria-pressed'),
            'true',
        );

        celulaSilaba(0, 1).dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.deepEqual(obterLinhasMolde()[0].tonicas, [1]);
        assert.match(celulaSilaba(0, 1).className, /bg-amber-200/);
    });

    it('clicar de novo na mesma sílaba tônica desmarca (mesmo gesto de alternância de Sonoridade)', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
        );
        container.querySelector('#molde-btn-modo-tonico').click();
        celulaSilaba(0, 1).dispatchEvent(new window.Event('click', { bubbles: true }));
        celulaSilaba(0, 1).dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.deepEqual(obterLinhasMolde()[0].tonicas, []);
    });

    it('editar o texto do verso descarta tônicas em posições que deixaram de existir', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs', tonicas: [1, 4] }],
            '',
        );
        const campo = container.querySelector('.molde-linha-texto[data-idx="0"]');
        campo.textContent = 'Quan/do o/ sol'; // 3 sílabas agora — posição 4 não cabe mais
        campo.dispatchEvent(new window.Event('input', { bubbles: true }));
        assert.deepEqual(obterLinhasMolde()[0].tonicas, [1]);
    });

    it('Pé Métrico selecionado na inicialização marca divergência (borda tracejada âmbar) onde falta tônica', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
            'Iambo (fraca-forte)',
        );
        // Iambo espera tônica nas posições pares (2, 4, 0-based 1, 3) —
        // nenhuma marcada ainda, as duas divergem.
        assert.match(celulaSilaba(0, 1).className, /border-dashed border-amber-400/);
        assert.match(celulaSilaba(0, 3).className, /border-dashed border-amber-400/);
        assert.doesNotMatch(celulaSilaba(0, 0).className, /border-dashed/);
    });

    it('marcar a tônica esperada remove o destaque de divergência daquela célula', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
            'Iambo (fraca-forte)',
        );
        container.querySelector('#molde-btn-modo-tonico').click();
        celulaSilaba(0, 1).dispatchEvent(new window.Event('click', { bubbles: true }));
        assert.doesNotMatch(celulaSilaba(0, 1).className, /border-dashed/);
        // A posição 3 continua sem tônica marcada — segue divergindo.
        assert.match(celulaSilaba(0, 3).className, /border-dashed border-amber-400/);
    });

    it('sem Pé Métrico selecionado, nenhuma célula recebe a borda de divergência', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
        );
        for (let i = 0; i < 5; i++) {
            assert.doesNotMatch(celulaSilaba(0, i).className, /border-dashed/);
        }
    });

    it('atualizarPeMetricoGradeMolde recalcula a divergência ao vivo sem perder o texto já digitado', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
        );
        assert.doesNotMatch(celulaSilaba(0, 1).className, /border-dashed/);

        atualizarPeMetricoGradeMolde('Iambo (fraca-forte)');

        assert.match(celulaSilaba(0, 1).className, /border-dashed border-amber-400/);
        assert.equal(obterLinhasMolde()[0].texto, 'Quan/do o/ sol/ se/ pôs');
    });

    it("trocar de Pé Métrico pra vazio ('') limpa toda divergência", () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }],
            '',
            'Iambo (fraca-forte)',
        );
        atualizarPeMetricoGradeMolde('');
        for (let i = 0; i < 5; i++) {
            assert.doesNotMatch(celulaSilaba(0, i).className, /border-dashed/);
        }
    });

    it('linha de quebra de estrofe não gera célula de sílaba nenhuma', () => {
        inicializarGradeMolde(
            container,
            [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }, { tipo: 'vazia' }],
            '',
            'Iambo (fraca-forte)',
        );
        const linhaVazia = container.querySelector('.molde-linha-vazia');
        assert.equal(linhaVazia.querySelectorAll('.molde-cel-silaba').length, 0);
    });

    it('"+ Verso" reabre a grade com Modo Tônica preservado (não reseta o modo a cada linha nova)', () => {
        inicializarGradeMolde(container, [{ tipo: 'verso', numero: 1, texto: 'A/ noi/te' }], '');
        container.querySelector('#molde-btn-modo-tonico').click();
        adicionarVersoMolde();
        assert.equal(
            container.querySelector('#molde-btn-modo-tonico').getAttribute('aria-pressed'),
            'true',
        );
    });
});
