import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Hierarquia das Correntes literárias: cada corrente pode ter divisões
// (variante regional, fase ou geração, vertente), ligadas ao pai por `paiId`.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
document.body.innerHTML =
    fs.readFileSync(path.resolve(__dirname, '../modais/modal-movimento-escola.html'), 'utf8') +
    '<div id="lista-movimentos-escolas"></div><div id="filtros-periodo-movimentosEscolas"></div>';

const H = await import('../js/correntes-hierarquia.js');
const D = await import('../js/db.js');
const { db } = D;
const { editarMovimentoEscola, initFormMovimentoEscola } = await import('../js/forms.js');
const { renderVisualizacaoMovimentoEscolaHtml } =
    await import('../js/visualizar-movimento-escola.js');
const { renderMovimentosEscolas } = await import('../js/render-listas.js');
const { deleteItem } = D;

// Romantismo > Romantismo no Brasil > 3ª geração; Romantismo > Romantismo em Portugal.
const arvore = () => [
    { id: 1, nome: 'Romantismo', paiId: null, posturaEstetica: 'Inovadora', programa: 'Movimento' },
    { id: 2, nome: 'Romantismo no Brasil', paiId: 1, divisao: 'Variante regional' },
    { id: 3, nome: '3ª geração', paiId: 2, divisao: 'Fase ou geração', generoDivisao: 'Poesia' },
    { id: 4, nome: 'Romantismo em Portugal', paiId: 1, divisao: 'Variante regional' },
    { id: 5, nome: 'Barroco', paiId: null },
];

describe('listas e normalização', () => {
    it('três divisões, cada uma com descrição; dois gêneros', () => {
        assert.deepEqual(H.DIVISOES_CORRENTE, ['Variante regional', 'Fase ou geração', 'Vertente']);
        assert.deepEqual(Object.keys(H.DESCRICOES_DIVISAO_CORRENTE), H.DIVISOES_CORRENTE);
        assert.deepEqual(H.GENEROS_DIVISAO_CORRENTE, ['Poesia', 'Prosa']);
    });

    it('valor fora da lista vira vazio', () => {
        assert.equal(H.normalizarDivisaoCorrente('Vertente'), 'Vertente');
        assert.equal(H.normalizarDivisaoCorrente('Geração'), '');
        assert.equal(H.normalizarGeneroDivisaoCorrente('Prosa'), 'Prosa');
        assert.equal(H.normalizarGeneroDivisaoCorrente('Teatro'), '');
    });
});

describe('navegação na árvore', () => {
    it('pai, filhos, descendentes, ancestrais e caminho', () => {
        const l = arvore();
        assert.equal(H.paiDaCorrente(l, 3).nome, 'Romantismo no Brasil');
        assert.equal(H.paiDaCorrente(l, 1), null);
        assert.deepEqual(
            H.filhosDaCorrente(l, 1).map((m) => m.id),
            [2, 4],
        );
        assert.deepEqual(H.descendentesDaCorrente(l, 1).sort(), [2, 3, 4]);
        assert.deepEqual(
            H.ancestraisDaCorrente(l, 3).map((m) => m.id),
            [2, 1],
        );
        assert.equal(H.caminhoDaCorrente(l, 3), 'Romantismo › Romantismo no Brasil › 3ª geração');
    });

    it('ciclo: o pai não pode ser o próprio registro nem um descendente dele', () => {
        const l = arvore();
        assert.equal(H.criaCicloCorrente(l, 1, 1), true);
        assert.equal(H.criaCicloCorrente(l, 1, 3), true);
        assert.equal(H.criaCicloCorrente(l, 2, 4), false);
        assert.equal(H.criaCicloCorrente(l, 1, null), false);
    });

    it('opções de pai excluem o registro e as divisões dele', () => {
        const nomes = H.opcoesDePaiDaCorrente(arvore(), 2).map((m) => m.nome);
        assert.deepEqual(nomes, ['Barroco', 'Romantismo', 'Romantismo em Portugal']);
    });

    it('dado corrompido (ciclo) não prende a navegação', () => {
        const l = [
            { id: 1, nome: 'A', paiId: 2 },
            { id: 2, nome: 'B', paiId: 1 },
        ];
        assert.equal(H.descendentesDaCorrente(l, 1).length, 1);
        assert.equal(H.ancestraisDaCorrente(l, 1).length, 1);
    });
});

describe('herança de postura e programa na leitura', () => {
    it('filho vazio herda do ancestral mais próximo; valor próprio vence, inclusive "Não se aplica"', () => {
        const l = arvore();
        const noBrasil = l[1];
        assert.deepEqual(H.posturaEfetivaDaCorrente(l, noBrasil), {
            valor: 'Inovadora',
            herdadoDe: 'Romantismo',
        });
        assert.deepEqual(H.programaEfetivoDaCorrente(l, l[2]), {
            valor: 'Movimento',
            herdadoDe: 'Romantismo',
        });
        l[1].posturaEstetica = 'Não se aplica';
        assert.deepEqual(H.posturaEfetivaDaCorrente(l, l[2]), {
            valor: 'Não se aplica',
            herdadoDe: 'Romantismo no Brasil',
        });
        assert.deepEqual(H.posturaEfetivaDaCorrente(l, l[0]), {
            valor: 'Inovadora',
            herdadoDe: null,
        });
        assert.deepEqual(H.posturaEfetivaDaCorrente(l, l[4]), { valor: '', herdadoDe: null });
    });

    it('a leitura não grava nada no registro', () => {
        const l = arvore();
        H.posturaEfetivaDaCorrente(l, l[1]);
        assert.equal(l[1].posturaEstetica, undefined);
    });
});

describe('ordem em árvore', () => {
    const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

    it('cada corrente vem seguida das divisões, com o nível', () => {
        const saida = H.ordenarCorrentesEmArvore(arvore(), porNome);
        assert.deepEqual(
            saida.map(({ m, nivel }) => `${nivel}:${m.nome}`),
            [
                '0:Barroco',
                '0:Romantismo',
                '1:Romantismo em Portugal',
                '1:Romantismo no Brasil',
                '2:3ª geração',
            ],
        );
    });

    it('divisão cujo pai saiu da lista entra como topo; nada some, nem em ciclo', () => {
        const semPai = arvore().filter((m) => m.id !== 1);
        const saida = H.ordenarCorrentesEmArvore(semPai, porNome);
        assert.equal(saida.length, 4);
        assert.equal(saida.find(({ m }) => m.id === 2).nivel, 0);
        const ciclo = [
            { id: 1, nome: 'A', paiId: 2 },
            { id: 2, nome: 'B', paiId: 1 },
        ];
        assert.equal(H.ordenarCorrentesEmArvore(ciclo, porNome).length, 2);
    });
});

describe('impacto com divisões', () => {
    it('soma o que está nas divisões, cada item uma vez', () => {
        const dbRef = {
            movimentosEscolas: arvore(),
            autores: [
                { id: 1, movimentosEscolasIds: [1, 2] },
                { id: 2, movimentosEscolasIds: [3] },
            ],
            poemas: [
                { id: 10, movimentosEscolasIds: [3] },
                { id: 11, movimentosEscolasIds: [5] },
            ],
            prosas: [{ id: 20, movimentosEscolasIds: [4] }],
        };
        const direto = H.impactoDaCorrente(dbRef, 1);
        assert.deepEqual(direto.autoresIds, [1]);
        assert.deepEqual(direto.poemasIds, []);
        const comDivisoes = H.impactoDaCorrente(dbRef, 1, { comDivisoes: true });
        assert.deepEqual(comDivisoes.autoresIds, [1, 2]);
        assert.deepEqual(comDivisoes.poemasIds, [10]);
        assert.deepEqual(comDivisoes.prosasIds, [20]);
    });
});

describe('saneamento (migração e importação de backup)', () => {
    it('registro antigo ganha os campos; pai inexistente, próprio ou em ciclo é solto', () => {
        const l = [
            { id: 1, nome: 'A' },
            { id: 2, nome: 'B', paiId: 99, divisao: 'Vertente' },
            { id: 3, nome: 'C', paiId: 3, divisao: 'Vertente' },
            { id: 4, nome: 'D', paiId: 5, divisao: 'Fase ou geração' },
            { id: 5, nome: 'E', paiId: 4, divisao: 'Fase ou geração' },
            { id: 6, nome: 'F', paiId: 1, divisao: 'Inválida', generoDivisao: 'Teatro' },
            { id: 7, nome: 'G', paiId: 1, divisao: 'Vertente', generoDivisao: 'Prosa' },
        ];
        D.migrarMovimentosEscolas(l);
        const por = (id) => l.find((m) => m.id === id);
        assert.equal(por(1).paiId, null);
        assert.equal(por(2).paiId, null);
        assert.equal(por(2).divisao, '');
        assert.equal(por(3).paiId, null);
        // ciclo 4 <-> 5: um deles vira topo, o outro continua filho dele
        assert.equal([por(4), por(5)].filter((m) => m.paiId == null).length, 1);
        assert.equal(por(6).divisao, '');
        assert.equal(por(6).generoDivisao, '');
        assert.equal(por(7).divisao, 'Vertente');
        assert.equal(por(7).generoDivisao, 'Prosa');
    });

    it('os 22 originais de fábrica nascem sem pai; só as divisões do Romantismo têm pai', () => {
        assert.ok(db.movimentosEscolas.length > 20);
        const comPai = db.movimentosEscolas.filter((m) => m.paiId !== null);
        assert.ok(comPai.length > 0);
        assert.ok(comPai.every((m) => m.divisao !== ''));
        assert.equal(db.movimentosEscolas.filter((m) => m.paiId === null).length, 22);
    });

    it('criação por nome nasce de topo', () => {
        const m = D.obterOuCriarMovimentoEscolaPorNome('Corrente nova X');
        assert.equal(m.paiId, null);
        assert.equal(m.divisao, '');
        assert.equal(m.generoDivisao, '');
    });
});

describe('mesclagem', () => {
    const base = () => ({
        autores: [],
        poemas: [],
        prosas: [],
        movimentosEscolas: arvore(),
    });

    it('as divisões da origem passam ao destino', () => {
        const dbRef = base();
        D.mesclarMovimentosEscolas(dbRef, 1, 5); // Romantismo -> Barroco
        const por = (id) => dbRef.movimentosEscolas.find((m) => m.id === id);
        assert.equal(por(2).paiId, 5);
        assert.equal(por(4).paiId, 5);
        assert.equal(por(1), undefined);
    });

    it('destino que era divisão da origem sobe para o pai dela, sem ciclo', () => {
        const dbRef = base();
        D.mesclarMovimentosEscolas(dbRef, 2, 3); // Brasil <- 3ª geração (filha)
        const por = (id) => dbRef.movimentosEscolas.find((m) => m.id === id);
        assert.equal(por(3).paiId, 1);
        assert.equal(por(2), undefined);
        assert.equal(H.criaCicloCorrente(dbRef.movimentosEscolas, 3, por(3).paiId), false);
    });

    it('destino sem pai herda o da origem; destino com pai o mantém', () => {
        const dbRef = base();
        D.mesclarMovimentosEscolas(dbRef, 4, 5); // Portugal -> Barroco
        const barroco = dbRef.movimentosEscolas.find((m) => m.id === 5);
        assert.equal(barroco.paiId, 1);
        assert.equal(barroco.divisao, 'Variante regional');
        const outra = base();
        D.mesclarMovimentosEscolas(outra, 4, 2); // Portugal -> Brasil (já tem pai)
        assert.equal(outra.movimentosEscolas.find((m) => m.id === 2).paiId, 1);
    });
});

describe('exclusão com desfazer', () => {
    beforeEach(() => {
        db.movimentosEscolas = arvore().map((m) => ({ divisao: '', generoDivisao: '', ...m }));
        db.autores = [];
        db.poemas = [];
        db.prosas = [];
    });

    it('as divisões sobem para o pai da excluída; o desfazer devolve tudo', () => {
        deleteItem('movimentosEscolas', 2);
        assert.match(document.body.textContent, /1 divisão passam a fazer parte da corrente acima/);
        document.getElementById('excl-confirmar').click();
        const por = (id) => db.movimentosEscolas.find((m) => m.id === id);
        assert.equal(por(2), undefined);
        assert.equal(por(3).paiId, 1);
        assert.equal(por(3).divisao, 'Fase ou geração');

        document.querySelector('#avisos-toast button').click();
        assert.equal(por(2).paiId, 1);
        assert.equal(por(3).paiId, 2);
        assert.equal(por(3).generoDivisao, 'Poesia');
    });

    it('excluir uma corrente de topo solta as divisões e zera divisão e gênero; o desfazer restaura', () => {
        deleteItem('movimentosEscolas', 1);
        document.getElementById('excl-confirmar').click();
        const por = (id) => db.movimentosEscolas.find((m) => m.id === id);
        assert.equal(por(2).paiId, null);
        assert.equal(por(2).divisao, '');
        assert.equal(por(4).paiId, null);

        document.querySelector('#avisos-toast button').click();
        assert.equal(por(2).paiId, 1);
        assert.equal(por(2).divisao, 'Variante regional');
        assert.equal(por(4).paiId, 1);
    });
});

describe('formulário', () => {
    beforeEach(() => {
        db.movimentosEscolas = arvore().map((m) => ({
            divisao: '',
            generoDivisao: '',
            embutido: true,
            ...m,
        }));
        initFormMovimentoEscola();
    });

    const opcoes = () =>
        [...document.querySelectorAll('#me-pai option')].map((o) => o.getAttribute('value'));

    it('o select de pai não oferece a própria corrente nem as divisões dela', async () => {
        await editarMovimentoEscola(2);
        assert.deepEqual(opcoes(), ['', '5', '1', '4']);
        assert.equal(document.getElementById('me-pai').value, '1');
        assert.equal(document.getElementById('me-divisao').value, 'Variante regional');
        assert.equal(document.getElementById('me-divisao').disabled, false);
    });

    it('sem pai, Divisão e "Aplica-se a" ficam desabilitados e vazios', async () => {
        await editarMovimentoEscola(1);
        assert.equal(document.getElementById('me-pai').value, '');
        assert.equal(document.getElementById('me-divisao').disabled, true);
        assert.equal(document.getElementById('me-genero-divisao').disabled, true);
        const pai = document.getElementById('me-pai');
        pai.value = '5';
        pai.dispatchEvent(new window.Event('change'));
        assert.equal(document.getElementById('me-divisao').disabled, false);
        pai.value = '';
        pai.dispatchEvent(new window.Event('change'));
        assert.equal(document.getElementById('me-divisao').value, '');
    });

    it('salvar grava pai, divisão e gênero, e preserva `embutido`', async () => {
        await editarMovimentoEscola(5);
        const pai = document.getElementById('me-pai');
        pai.value = '1';
        pai.dispatchEvent(new window.Event('change'));
        document.getElementById('me-divisao').value = 'Vertente';
        document.getElementById('me-genero-divisao').value = 'Prosa';
        document.getElementById('form-movimento-escola').requestSubmit();
        const m = db.movimentosEscolas.find((x) => x.id === 5);
        assert.equal(m.paiId, 1);
        assert.equal(m.divisao, 'Vertente');
        assert.equal(m.generoDivisao, 'Prosa');
        assert.equal(m.embutido, true);
    });

    it('trocar o pai para nenhum zera divisão e gênero', async () => {
        await editarMovimentoEscola(3);
        const pai = document.getElementById('me-pai');
        pai.value = '';
        pai.dispatchEvent(new window.Event('change'));
        document.getElementById('form-movimento-escola').requestSubmit();
        const m = db.movimentosEscolas.find((x) => x.id === 3);
        assert.equal(m.paiId, null);
        assert.equal(m.divisao, '');
        assert.equal(m.generoDivisao, '');
    });
});

describe('lista e visualização', () => {
    beforeEach(() => {
        db.movimentosEscolas = arvore().map((m) => ({
            tipo: '',
            inicio: null,
            fim: null,
            divisao: '',
            generoDivisao: '',
            ...m,
        }));
        db.autores = [{ id: 1, nome: 'Castro Alves', movimentosEscolasIds: [3] }];
        db.poemas = [];
        db.prosas = [];
    });

    it('a lista vem em árvore: divisões recuadas logo abaixo do pai', () => {
        renderMovimentosEscolas();
        const cards = [...document.querySelectorAll('#lista-movimentos-escolas > div')];
        const nomes = cards.map((c) => c.querySelector('h4').textContent);
        assert.deepEqual(nomes, [
            'Barroco',
            'Romantismo',
            'Romantismo em Portugal',
            'Romantismo no Brasil',
            '3ª geração',
        ]);
        const recuo = (c) => c.style.marginLeft;
        assert.equal(recuo(cards[1]), '0rem');
        assert.equal(recuo(cards[2]), '1.5rem');
        assert.equal(recuo(cards[4]), '3rem');
    });

    it('o card do pai soma o que está nas divisões; o de uma divisão mostra o herdado', () => {
        renderMovimentosEscolas();
        const cards = [...document.querySelectorAll('#lista-movimentos-escolas > div')];
        assert.match(cards[1].textContent, /1 autor, 0 textos \(com as divisões\)/);
        assert.match(cards[3].textContent, /Movimento \(herdado\)/);
        assert.match(cards[3].textContent, /Inovadora \(herdada\)/);
        assert.match(cards[3].textContent, /Variante regional/);
    });

    it('a Visualização mostra o pai, a divisão, a herança e as divisões', () => {
        const l = db.movimentosEscolas;
        const html = renderVisualizacaoMovimentoEscolaHtml(l[1], {
            pai: 'Romantismo',
            divisoes: [l[2]],
            programa: H.programaEfetivoDaCorrente(l, l[1]),
            postura: H.posturaEfetivaDaCorrente(l, l[1]),
        });
        assert.match(html, /Faz parte de:<\/strong> Romantismo/);
        assert.match(html, /Divisão:<\/strong> Variante regional/);
        assert.match(html, /Movimento \(herdado de Romantismo\)/);
        assert.match(html, /Divisões \(1\)/);
        assert.match(html, /3ª geração · Fase ou geração, Poesia/);
    });

    it('sem divisões nem pai, a Visualização não mostra essas linhas', () => {
        const html = renderVisualizacaoMovimentoEscolaHtml({ nome: 'X', programa: 'Escola' });
        assert.doesNotMatch(html, /Faz parte de/);
        assert.match(html, /Escola/);
    });
});

describe('sugestoesDeCorrentes (campo de corrente em Poema, Prosa e Autor)', () => {
    const lista = [
        { id: 1, nome: 'Romantismo', paiId: null },
        { id: 2, nome: 'Romantismo no Brasil', paiId: 1 },
        { id: 3, nome: '3ª geração: Condoreira (Brasil)', paiId: 2, generoDivisao: 'Poesia' },
        { id: 4, nome: 'Romance urbano (Brasil)', paiId: 2, generoDivisao: 'Prosa' },
    ];
    const nomes = (t) => H.sugestoesDeCorrentes(lista, t).map((o) => o.nome);

    it('poema não vê divisão de Prosa, prosa não vê divisão de Poesia, autor vê todas', () => {
        assert.ok(!nomes('poemas').includes('Romance urbano (Brasil)'));
        assert.ok(nomes('poemas').includes('3ª geração: Condoreira (Brasil)'));
        assert.ok(!nomes('prosas').includes('3ª geração: Condoreira (Brasil)'));
        assert.equal(nomes('autores').length, 4);
    });

    it('rótulo: caminho dos pais e gênero; corrente de topo sem rótulo', () => {
        const r = Object.fromEntries(
            H.sugestoesDeCorrentes(lista, 'autores').map((o) => [o.id, o.rotulo]),
        );
        assert.equal(r[1], '');
        assert.equal(r[2], 'Romantismo');
        assert.equal(r[3], 'Romantismo › Romantismo no Brasil · Poesia');
    });
});
