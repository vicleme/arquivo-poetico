import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const {
    construirLinhasIniciais,
    calcularMaxSilabas,
    calcularLetrasRima,
    inicializarGradeSonoridade,
    obterLinhasSonoridade,
    obterRimasSonoridade,
} = await import('../js/editor-sonoridade.js');

describe('construirLinhasIniciais', () => {
    it('numera só os versos, pulando linhas vazias/quebras de estrofe', () => {
        const linhas = construirLinhasIniciais('Primeiro verso\n\nSegundo verso\nTerceiro verso');
        assert.deepEqual(
            linhas.map((l) => l.tipo),
            ['verso', 'vazia', 'verso', 'verso'],
        );
        assert.equal(linhas[0].numero, 1);
        assert.equal(linhas[2].numero, 2);
        assert.equal(linhas[3].numero, 3);
    });

    it('remove marcação de ênfase markdown (**negrito**/_itálico_) do texto do verso', () => {
        const linhas = construirLinhasIniciais('Um **verso em negrito** e _um em itálico_');
        assert.equal(linhas[0].texto, 'Um verso em negrito e um em itálico');
    });

    it('trata texto vazio/ausente como uma única linha vazia', () => {
        assert.deepEqual(construirLinhasIniciais(''), [{ tipo: 'vazia' }]);
        assert.deepEqual(construirLinhasIniciais(undefined), [{ tipo: 'vazia' }]);
    });
});

describe('calcularMaxSilabas', () => {
    it('conta sílabas pelo número de barras + 1, ignorando linhas vazias', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' },
            { tipo: 'vazia' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        assert.equal(calcularMaxSilabas(linhas), 5);
    });

    it('sem nenhuma barra em nenhum verso, o máximo é 1 (verso inteiro é uma célula só)', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Um verso qualquer' }];
        assert.equal(calcularMaxSilabas(linhas), 1);
    });

    it('sem nenhum verso (só linhas vazias ou array vazio), o mínimo é 1', () => {
        assert.equal(calcularMaxSilabas([{ tipo: 'vazia' }]), 1);
        assert.equal(calcularMaxSilabas([]), 1);
    });
});

describe('calcularLetrasRima', () => {
    it('sem nenhuma rima, nenhum verso ganha letra', () => {
        assert.deepEqual([...calcularLetrasRima([]).entries()], []);
    });

    it('um par simples: os dois versos ganham a mesma letra (A)', () => {
        const rimas = [{ id: 1, a: { linha: 0, silabas: [2] }, b: { linha: 2, silabas: [3] } }];
        const letras = calcularLetrasRima(rimas);
        assert.equal(letras.get(0), 'A');
        assert.equal(letras.get(2), 'A');
    });

    it('dois pares independentes ganham letras diferentes, na ordem do 1º verso de cada grupo', () => {
        const rimas = [
            { id: 1, a: { linha: 1, silabas: [0] }, b: { linha: 3, silabas: [0] } },
            { id: 2, a: { linha: 0, silabas: [0] }, b: { linha: 2, silabas: [0] } },
        ];
        const letras = calcularLetrasRima(rimas);
        // grupo {0,2} tem o menor índice (0) → letra A; grupo {1,3} → letra B,
        // mesmo o par B ter sido criado primeiro na lista
        assert.equal(letras.get(0), 'A');
        assert.equal(letras.get(2), 'A');
        assert.equal(letras.get(1), 'B');
        assert.equal(letras.get(3), 'B');
    });

    it('monorrima transitiva (1↔2, 2↔3) cai no mesmo grupo/letra sem par direto 1↔3', () => {
        const rimas = [
            { id: 1, a: { linha: 0, silabas: [0] }, b: { linha: 1, silabas: [0] } },
            { id: 2, a: { linha: 1, silabas: [0] }, b: { linha: 2, silabas: [0] } },
        ];
        const letras = calcularLetrasRima(rimas);
        assert.equal(letras.get(0), 'A');
        assert.equal(letras.get(1), 'A');
        assert.equal(letras.get(2), 'A');
    });
});

describe('inicializarGradeSonoridade — DOM real (happy-dom)', () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = '<div id="son-grade-container"></div>';
        container = document.getElementById('son-grade-container');
    });

    it('sem linhas, mostra a mensagem de "escolha um poema" e não uma tabela', () => {
        inicializarGradeSonoridade(container, []);
        assert.match(container.textContent, /Escolha um poema/);
        assert.equal(container.querySelector('table'), null);
    });

    it('renderiza uma linha por verso, número correto e uma célula editável por linha', () => {
        const linhas = construirLinhasIniciais('Primeiro verso\n\nSegundo verso');
        inicializarGradeSonoridade(container, linhas);

        const numeros = [
            ...container.querySelectorAll('#son-grade-body tr:not(.son-linha-vazia)'),
        ].map((tr) => tr.querySelector('td')?.textContent.trim());
        assert.deepEqual(numeros, ['1', '2']);

        assert.equal(container.querySelectorAll('.son-linha-texto').length, 2);
        assert.equal(container.querySelectorAll('#son-grade-body tr.son-linha-vazia').length, 1);
    });

    it('a régua do cabeçalho tem uma coluna por sílaba do maior verso já dividido', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);

        const ths = [...container.querySelectorAll('#son-grade-header-row th')];
        // 2 colunas fixas (Nº, Verso) + 5 colunas de régua (1..5) + 1 coluna de Rima
        assert.equal(ths.length, 8);
        assert.deepEqual(
            ths.slice(2, 7).map((th) => th.textContent.trim()),
            ['1', '2', '3', '4', '5'],
        );
    });

    it('preenche as células de sílaba a partir da divisão por barra de cada verso', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);

        const celulas = [...container.querySelectorAll('td.son-cel-silaba')].map((td) =>
            td.textContent.trim(),
        );
        assert.deepEqual(celulas, ['Quan', 'do o', 'sol']);
    });

    it('digitar no campo editável atualiza a grade (mais barras → mais colunas) sem perder as outras linhas', () => {
        const linhas = construirLinhasIniciais('Um verso\nOutro verso');
        inicializarGradeSonoridade(container, linhas);

        const primeiroCampo = container.querySelector('.son-linha-texto[data-idx="0"]');
        primeiroCampo.textContent = 'Um/ ver/so';
        primeiroCampo.dispatchEvent(new window.Event('input', { bubbles: true }));

        assert.equal(obterLinhasSonoridade()[0].texto, 'Um/ ver/so');

        const ths = [...container.querySelectorAll('#son-grade-header-row th')];
        assert.equal(ths.length, 6); // Nº + Verso + 3 colunas de régua + Rima

        const linhaDoisCelulas = [
            ...container.querySelectorAll('#son-grade-body tr[data-idx="1"] td.son-cel-silaba'),
        ].map((td) => td.textContent.trim());
        assert.deepEqual(linhaDoisCelulas, ['Outro verso', '', '']);
    });

    it('apaga o hífen ortográfico das células de sílaba (ênclise/composta), em qualquer posição', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Di/ze-me a ver/da/de' }];
        inicializarGradeSonoridade(container, linhas);

        const celulas = [...container.querySelectorAll('td.son-cel-silaba')].map((td) =>
            td.textContent.trim(),
        );
        assert.deepEqual(celulas, ['Di', 'zeme a ver', 'da', 'de']);
    });

    it('hífen isolado entre duas barras (célula fantasma) não conta como sílaba real', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'ze/-/me' }];
        inicializarGradeSonoridade(container, linhas);

        const celulas = [...container.querySelectorAll('td.son-cel-silaba')];
        assert.deepEqual(
            celulas.map((td) => td.textContent.trim()),
            ['ze', '', 'me'],
        );
        // a célula do meio (hífen apagado, sobrou vazia) não deve ter os
        // data attributes que marcam célula "real" (clicável no Modo Tônica)
        assert.equal(celulas[1].dataset.silabaIdx, undefined);
    });

    it('realça cada `/` digitado com um <span> de destaque, sem perder o texto puro', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'a/b' }];
        inicializarGradeSonoridade(container, linhas);

        const campo = container.querySelector('.son-linha-texto');
        assert.equal(campo.textContent, 'a/b');
        assert.ok(campo.querySelector('span'), 'a barra deveria estar envolvida num <span>');
    });
});

describe('Modo Sílaba Tônica — DOM real (happy-dom)', () => {
    let container;

    function clicar(el) {
        el.dispatchEvent(new window.Event('click', { bubbles: true }));
    }

    beforeEach(() => {
        document.body.innerHTML = '<div id="son-grade-container"></div>';
        container = document.getElementById('son-grade-container');
    });

    it('começa desligado (mesmo reabrindo a grade) e sem clicar em nada não marca tônica', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);

        const botao = container.querySelector('#son-btn-modo-tonico');
        assert.equal(botao.getAttribute('aria-pressed'), 'false');

        const celula = container.querySelector('td.son-cel-silaba[data-silaba-idx="0"]');
        clicar(celula);
        assert.ok(!celula.className.includes('bg-amber'));
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas ?? [], []);
    });

    it('ligar o modo e clicar numa célula real marca a sílaba como tônica (destaque + índice salvo)', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);

        clicar(container.querySelector('#son-btn-modo-tonico'));
        assert.equal(
            container.querySelector('#son-btn-modo-tonico').getAttribute('aria-pressed'),
            'true',
        );

        const celula = container.querySelector('td.son-cel-silaba[data-silaba-idx="2"]');
        clicar(celula);

        const celulaNova = container.querySelector('td.son-cel-silaba[data-silaba-idx="2"]');
        assert.ok(celulaNova.className.includes('bg-amber'));
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, [2]);
    });

    it('clicar de novo na mesma sílaba tônica desmarca', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));

        const celula = () => container.querySelector('td.son-cel-silaba[data-silaba-idx="1"]');
        clicar(celula());
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, [1]);
        clicar(celula());
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, []);
    });

    it('células de preenchimento (além do total de sílabas do próprio verso) não têm data-idx e não respondem a clique', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));

        const linhaDois = container.querySelectorAll(
            '#son-grade-body tr[data-idx="1"] td.son-cel-silaba',
        );
        // "A/lém" só tem 2 sílabas reais, mas a régua vai até 5 (maior verso)
        assert.equal(linhaDois[2].dataset.silabaIdx, undefined);
        clicar(linhaDois[2]);
        assert.deepEqual(obterLinhasSonoridade()[1].tonicas ?? [], []);
    });

    it('reduzir o número de sílabas de um verso descarta índices de tônica que ficaram fora do alcance', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));
        clicar(container.querySelector('td.son-cel-silaba[data-silaba-idx="4"]'));
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, [4]);

        const campo = container.querySelector('.son-linha-texto[data-idx="0"]');
        campo.textContent = 'Quan/do o/ sol';
        campo.dispatchEvent(new window.Event('input', { bubbles: true }));

        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, []);
    });

    it('desligar o modo tira o cursor-pointer das células, mas preserva as marcações já feitas', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));
        clicar(container.querySelector('td.son-cel-silaba[data-silaba-idx="0"]'));

        clicar(container.querySelector('#son-btn-modo-tonico')); // desliga de novo
        const celula = container.querySelector('td.son-cel-silaba[data-silaba-idx="0"]');
        assert.ok(!celula.className.includes('cursor-pointer'));
        assert.ok(celula.className.includes('bg-amber'), 'marcação feita antes deve persistir');
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, [0]);
    });
});

describe('Mapeamento de Rimas — DOM real (happy-dom)', () => {
    let container;

    function clicar(el) {
        el.dispatchEvent(new window.Event('click', { bubbles: true }));
    }
    function shiftClicar(el) {
        el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
    }
    function celula(linhaIdx, silabaIdx) {
        return container.querySelector(
            `#son-grade-body tr[data-idx="${linhaIdx}"] td.son-cel-silaba[data-silaba-idx="${silabaIdx}"]`,
        );
    }
    function letraDaLinha(linhaIdx) {
        return container
            .querySelector(`#son-grade-body tr[data-idx="${linhaIdx}"] td.son-cel-rima-letra`)
            .textContent.trim();
    }

    beforeEach(() => {
        document.body.innerHTML = '<div id="son-grade-container"></div>';
        container = document.getElementById('son-grade-container');
    });

    it('clicar numa sílaba com Modo Rima ligado só abre o lado A — nada é confirmado sozinho', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 0));

        assert.deepEqual(obterRimasSonoridade(), []);
        assert.equal(container.querySelector('#son-btn-confirmar-rima').disabled, true);
        assert.ok(
            container.querySelector('#son-btn-cancelar-rima'),
            'botão de cancelar deve aparecer',
        );
    });

    it('clicar num verso diferente abre o lado B; Confirmar par cria a rima e atribui a letra aos dois versos', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 2)); // lado A: verso 0, sílaba "sol"
        clicar(celula(1, 1)); // lado B: verso 1, sílaba "lém"

        assert.equal(container.querySelector('#son-btn-confirmar-rima').disabled, false);
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        const rimas = obterRimasSonoridade();
        assert.equal(rimas.length, 1);
        assert.deepEqual(rimas[0].a, { linha: 0, silabas: [2] });
        assert.deepEqual(rimas[0].b, { linha: 1, silabas: [1] });
        assert.equal(letraDaLinha(0), 'A');
        assert.equal(letraDaLinha(1), 'A');
        // seleção fecha sozinha depois de confirmar — botões somem
        assert.equal(container.querySelector('#son-btn-confirmar-rima'), null);
    });

    it('shift-clique estende os dois lados (rima rica) antes de confirmar', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Ca/mi/nhei' },
            { tipo: 'verso', numero: 2, texto: 'A/qui/vim' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 1)); // "mi"
        shiftClicar(celula(0, 2)); // + "nhei" no lado A
        clicar(celula(1, 1)); // "qui" no lado B
        shiftClicar(celula(1, 2)); // + "vim" no lado B
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        const rimas = obterRimasSonoridade();
        assert.deepEqual(rimas[0].a, { linha: 0, silabas: [1, 2] });
        assert.deepEqual(rimas[0].b, { linha: 1, silabas: [1, 2] });
    });

    it('Cancelar seleção descarta o par em curso sem criar rima', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 2));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-cancelar-rima'));

        assert.deepEqual(obterRimasSonoridade(), []);
        assert.equal(container.querySelector('#son-btn-confirmar-rima'), null);
    });

    it('monorrima transitiva (3 versos) aparece com a mesma letra na grade', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Um/ verso' },
            { tipo: 'verso', numero: 2, texto: 'Ou/tro' },
            { tipo: 'verso', numero: 3, texto: 'Ter/ceiro' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 1));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));
        clicar(celula(1, 1));
        clicar(celula(2, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        assert.equal(letraDaLinha(0), 'A');
        assert.equal(letraDaLinha(1), 'A');
        assert.equal(letraDaLinha(2), 'A');
    });

    it('ligar o Modo Rima desliga o Modo Sílaba Tônica, e vice-versa', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));
        assert.equal(
            container.querySelector('#son-btn-modo-tonico').getAttribute('aria-pressed'),
            'true',
        );

        clicar(container.querySelector('#son-btn-modo-rima'));
        assert.equal(
            container.querySelector('#son-btn-modo-tonico').getAttribute('aria-pressed'),
            'false',
        );
        assert.equal(
            container.querySelector('#son-btn-modo-rima').getAttribute('aria-pressed'),
            'true',
        );

        clicar(container.querySelector('#son-btn-modo-tonico'));
        assert.equal(
            container.querySelector('#son-btn-modo-rima').getAttribute('aria-pressed'),
            'false',
        );
    });

    it('reabrir a grade com rimas já salvas mostra as letras sem precisar reconfirmar', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        const rimasSalvas = [
            { id: 1, a: { linha: 0, silabas: [2] }, b: { linha: 1, silabas: [1] } },
        ];
        inicializarGradeSonoridade(container, linhas, rimasSalvas);

        assert.equal(letraDaLinha(0), 'A');
        assert.equal(letraDaLinha(1), 'A');
        assert.deepEqual(obterRimasSonoridade(), rimasSalvas);
    });

    it('confirmar um par dá contorno colorido às células dos dois lados, e a mesma cor na letra da linha', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 2));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        const celulaA = celula(0, 2);
        const celulaB = celula(1, 1);
        assert.match(celulaA.className, /ring-2/);
        assert.match(celulaA.className, /ring-rose-400/); // 1ª letra (A) = 1ª cor da paleta
        assert.match(celulaB.className, /ring-rose-400/);
        // célula não envolvida na rima não ganha contorno nenhum
        assert.doesNotMatch(celula(0, 0).className, /ring-2/);

        const tdLetraA = container.querySelector(
            '#son-grade-body tr[data-idx="0"] td.son-cel-rima-letra',
        );
        assert.match(tdLetraA.className, /text-rose-600/);
    });

    it('grupos de rima diferentes (letras diferentes) ganham cores diferentes', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Um/ verso' },
            { tipo: 'verso', numero: 2, texto: 'Ou/tro' },
            { tipo: 'verso', numero: 3, texto: 'Ter/ceiro' },
            { tipo: 'verso', numero: 4, texto: 'Quar/to' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        // par A: versos 0 e 1
        clicar(celula(0, 1));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));
        // par B: versos 2 e 3
        clicar(celula(2, 1));
        clicar(celula(3, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        assert.match(celula(0, 1).className, /ring-rose-400/);
        assert.match(celula(2, 1).className, /ring-emerald-400/); // 2ª letra (B) = 2ª cor
    });

    it('re-selecionar (Modo Rima) uma célula já rimada mostra o destaque de seleção, não a cor confirmada', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        const rimasSalvas = [
            { id: 1, a: { linha: 0, silabas: [2] }, b: { linha: 1, silabas: [1] } },
        ];
        inicializarGradeSonoridade(container, linhas, rimasSalvas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 2)); // reabre como novo lado A da próxima seleção

        const cel = celula(0, 2);
        assert.match(cel.className, /ring-blue-400/);
        assert.doesNotMatch(cel.className, /ring-rose-400/);
    });
});
