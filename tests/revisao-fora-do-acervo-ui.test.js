import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Tela do "Modo revisão" da seção "Fora do acervo": botão, tabela, colunas,
// edição pendente, confirmação, backup antes de gravar e Desfazer.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { toggleColuna, resetarColunas } = await import('../js/colunas.js');
const {
    alternarModoRevisao,
    modoRevisaoAtivo,
    pedirRevisao,
    descartarAlteracoes,
    reiniciarRevisaoParaTestes,
} = await import('../js/revisao-fora-do-acervo-ui.js');

const el = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));
const confirmacaoAberta = () => {
    const c = el('modal-confirmar-exclusao');
    return Boolean(c) && c.style.display !== 'none';
};
const snapshotOk = async () => true;
const snapshotFalha = async () => false;

const linhas = () => [...el('conexoes-revisao').querySelectorAll('[data-rev-linha]')];
const celula = (chave, valor) =>
    [...el('conexoes-revisao').querySelectorAll('[data-rev-valor]')].find(
        (c) => c.dataset.revChave === chave && c.dataset.revValor === valor,
    );
const cabecalhos = () =>
    [...el('conexoes-revisao').querySelectorAll('thead th')].map((t) =>
        t.textContent.replace(/🔍/g, '').trim(),
    );

function digitar(campo, valor) {
    campo.value = valor;
    campo.dispatchEvent(new window.Event('input', { bubbles: true }));
}

const campoAutor = (chave) =>
    [...el('conexoes-revisao').querySelectorAll('[data-rev-autor-input]')].find(
        (c) => c.dataset.revAutorInput === chave,
    );
const campoPersonagem = (chave) =>
    [...el('conexoes-revisao').querySelectorAll('[data-rev-personagem-input]')].find(
        (c) => c.dataset.revPersonagemInput === chave,
    );
const personagensDe = (chave) =>
    [
        ...(el('conexoes-revisao')
            .querySelector(`[data-rev-personagem-chips="${chave}"]`)
            ?.querySelectorAll('span') || []),
    ].map((t) => t.firstChild.textContent);
// Digita um nome no campo de tags de personagem da linha e confirma com Enter.
function digitarPersonagem(chave, nome) {
    const campo = campoPersonagem(chave);
    campo.value = nome;
    teclar(campo, 'Enter');
}
const tagsDe = (chave) =>
    [
        ...(el('conexoes-revisao')
            .querySelector(`[data-rev-autor-chips="${chave}"]`)
            ?.querySelectorAll('span') || []),
    ].map((t) => t.firstChild.textContent);
function teclar(campo, key) {
    campo.dispatchEvent(
        new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
}
// Digita um nome no campo de tags de autor da linha e confirma com Enter.
function digitarAutor(chave, nome) {
    const campo = campoAutor(chave);
    campo.value = nome;
    teclar(campo, 'Enter');
}

function marcar(campo, marcado) {
    campo.checked = marcado;
    campo.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function cenario() {
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        elementos: [],
        itensColetanea: [],
        poemas: [
            {
                id: 1,
                titulo: 'Águas',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Música',
                        obra: 'Águas de Março, de Tom Jobim',
                        autor: '',
                        trecho: 'é pau, é pedra',
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Casmurro',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Livro',
                        obra: 'Sagarana',
                        autor: 'Guimarães Rosa',
                    },
                ],
                hipertextualidade: [
                    { relacao: 'Paródia', tipoObra: 'Livro', hipotexto: 'Dom Casmurro', autor: '' },
                ],
            },
        ],
        prosas: [],
    });
    reiniciarRevisaoParaTestes();
    resetarColunas('revisao-fora');
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.querySelectorAll('button').forEach((b) => {
        if (b.textContent === 'Desfazer') b.closest('div')?.remove();
    });
    renderConexoes();
}

async function confirmar() {
    const botao = el('excl-confirmar');
    assert.ok(botao, 'confirmação aberta');
    botao.onclick();
    await tick();
    await tick();
}

describe('botão e troca de tela', () => {
    beforeEach(cenario);

    it('o botão aparece quando há entradas e some quando não há', () => {
        assert.equal(el('conexoes-fora-barra').classList.contains('hidden'), false);
        db.poemas = [];
        renderConexoes();
        assert.equal(el('conexoes-fora-barra').classList.contains('hidden'), true);
    });

    it('alternar troca as listas pela tabela e volta', () => {
        alternarModoRevisao();
        assert.equal(modoRevisaoAtivo(), true);
        assert.equal(el('conexoes-revisao').classList.contains('hidden'), false);
        assert.equal(el('conexoes-fora-listas').classList.contains('hidden'), true);
        assert.equal(el('conexoes-revisao-alternar').textContent.trim(), 'Voltar às listas');
        alternarModoRevisao();
        assert.equal(el('conexoes-revisao').classList.contains('hidden'), true);
        assert.equal(el('conexoes-fora-listas').classList.contains('hidden'), false);
        assert.equal(el('conexoes-revisao-alternar').textContent.trim(), 'Modo revisão');
    });

    it('o clique no botão passa pela ação data-action registrada no HTML', () => {
        assert.equal(el('conexoes-revisao-alternar').dataset.action, 'alternar-modo-revisao-fora');
    });
});

describe('tabela e colunas', () => {
    beforeEach(() => {
        cenario();
        alternarModoRevisao(true);
    });

    it('uma linha por entrada, com o título do texto abrindo o Ver', () => {
        assert.equal(linhas().length, 3);
        const titulo = linhas()[0].querySelector('[data-action="ver-texto-da-lista"]');
        assert.equal(titulo.textContent, 'Águas');
        assert.equal(titulo.dataset.id, '1');
        assert.equal(titulo.dataset.tipo, 'poema');
        // A tabela é a lista do Anterior/Próximo do Ver, na ordem da tela.
        const lista = titulo.closest('[data-lista-textos]');
        assert.ok(lista);
        assert.equal(lista.dataset.rotulo, 'Modo revisão');
    });

    it('a lista do Anterior/Próximo é a da tela: um item por texto, na ordem das linhas', async () => {
        const { itensDaListaNoDom } = await import('../js/ver-texto-da-lista.js');
        const primeiro = linhas()[0].querySelector('[data-action="ver-texto-da-lista"]');
        const { itens, rotulo } = itensDaListaNoDom(primeiro);
        const tela = [...document.querySelectorAll('[data-action="ver-texto-da-lista"]')];
        const esperados = [];
        tela.forEach((n) => {
            const chave = `${n.dataset.tipo}:${n.dataset.id}`;
            if (!esperados.includes(chave)) esperados.push(chave);
        });
        assert.deepEqual(
            itens.map((i) => `${i.tipo}:${i.id}`),
            esperados,
        );
        assert.equal(rotulo, 'Modo revisão');
    });

    it('as colunas padrão são as seis combinadas, mais o Texto fixo', () => {
        assert.deepEqual(cabecalhos(), [
            'Texto',
            'Campo',
            'Relação',
            'Obra',
            'Autor',
            'Tipo de obra',
            'Descrição',
        ]);
    });

    it('ligar uma coluna no seletor a mostra na tabela, e o seletor lista as 17', () => {
        assert.equal(celula('poema:1:intertextualidade:0', 'trecho'), undefined);
        toggleColuna('revisao-fora', 'trecho', true);
        assert.ok(cabecalhos().includes('Trecho'));
        assert.equal(celula('poema:1:intertextualidade:0', 'trecho').value, 'é pau, é pedra');
        const painel = el('painel-colunas-revisao-fora');
        assert.equal(painel.querySelectorAll('input[type="checkbox"]').length, 17);
    });

    it('na Hipertextualidade, personagem, trecho e traduzido ficam desabilitados', () => {
        ['personagem', 'trecho', 'traduzido'].forEach((k) => toggleColuna('revisao-fora', k, true));
        const linhaHiper = linhas().find(
            (l) => l.dataset.revLinha === 'poema:2:hipertextualidade:0',
        );
        const desabilitados = [...linhaHiper.querySelectorAll('input:disabled')];
        assert.equal(desabilitados.length, 3);
        assert.ok(campoPersonagem('poema:2:intertextualidade:0'));
        assert.equal(campoPersonagem('poema:2:hipertextualidade:0'), undefined);
    });

    it('a busca acha pelo ", de" e também pelas colunas escondidas', () => {
        digitar(el('revisao-busca'), ', de');
        assert.equal(linhas().length, 1);
        digitar(el('revisao-busca'), 'pau pedra');
        assert.equal(linhas().length, 1);
        digitar(el('revisao-busca'), 'zzz');
        assert.match(el('revisao-tabela').textContent, /Nenhuma linha combina/);
    });

    it('os seletores de campo e de "por preencher" filtram', () => {
        const campo = el('revisao-campo');
        campo.value = 'hipertextualidade';
        campo.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.equal(linhas().length, 1);
        campo.value = '';
        campo.dispatchEvent(new window.Event('change', { bubbles: true }));
        const faltando = el('revisao-faltando');
        faltando.value = 'autor';
        faltando.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.equal(linhas().length, 2);
    });

    it('pagina de 50 em 50', () => {
        db.poemas = Array.from({ length: 120 }, (_, n) => ({
            id: n + 1,
            titulo: `Texto ${String(n).padStart(3, '0')}`,
            intertextualidade: [{ obra: `Obra ${n}` }],
        }));
        renderConexoes();
        assert.equal(linhas().length, 50);
        assert.match(el('revisao-tabela').textContent, /Linhas 1 a 50 de 120/);
        el('conexoes-revisao').querySelector('[data-rev-acao="proxima"]').click();
        assert.equal(linhas().length, 50);
        assert.match(el('revisao-tabela').textContent, /Linhas 51 a 100 de 120/);
        el('conexoes-revisao').querySelector('[data-rev-acao="proxima"]').click();
        assert.equal(linhas().length, 20);
    });
});

describe('edição, confirmação e gravação', () => {
    beforeEach(() => {
        cenario();
        alternarModoRevisao(true);
    });

    const chave = 'poema:1:intertextualidade:0';

    it('editar uma célula só marca a linha: nada é gravado antes de confirmar', () => {
        assert.equal(
            el('conexoes-revisao').querySelector('[data-rev-acao="gravar"]').disabled,
            true,
        );
        digitar(celula(chave, 'nome'), 'Águas de Março');
        assert.match(el('revisao-resumo').textContent, /1 linha alterada/);
        assert.equal(
            el('conexoes-revisao').querySelector('[data-rev-acao="gravar"]').disabled,
            false,
        );
        assert.equal(db.poemas[0].intertextualidade[0].obra, 'Águas de Março, de Tom Jobim');
    });

    it('voltar ao valor original tira a linha das alterações', () => {
        digitar(celula(chave, 'nome'), 'Outra');
        digitar(celula(chave, 'nome'), 'Águas de Março, de Tom Jobim');
        assert.match(el('revisao-resumo').textContent, /Nenhuma alteração/);
    });

    it('a edição sobrevive a mudar o filtro', () => {
        digitarAutor(chave, 'Tom Jobim');
        digitar(el('revisao-busca'), 'sagarana');
        digitar(el('revisao-busca'), '');
        assert.deepEqual(tagsDe(chave), ['Tom Jobim']);
        assert.match(el('revisao-resumo').textContent, /1 linha alterada/);
    });

    it('revisar e gravar: confirmação com a contagem, grava, redesenha e Desfazer devolve', async () => {
        digitar(celula(chave, 'nome'), 'Águas de Março');
        digitarAutor(chave, 'Tom Jobim');
        pedirRevisao({ tirarSnapshot: snapshotOk });
        assert.equal(confirmacaoAberta(), true);
        assert.match(el('excl-mensagem').textContent, /1 texto/);
        assert.match(el('excl-mensagem').textContent, /backup/i);
        assert.equal(db.poemas[0].intertextualidade[0].obra, 'Águas de Março, de Tom Jobim');
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].obra, 'Águas de Março');
        assert.equal(db.poemas[0].intertextualidade[0].autor, 'Tom Jobim');
        assert.equal(celula(chave, 'nome').value, 'Águas de Março');
        assert.match(el('revisao-resumo').textContent, /Nenhuma alteração/);

        const desfazer = [...document.querySelectorAll('button')].find(
            (b) => b.textContent === 'Desfazer',
        );
        assert.ok(desfazer, 'aviso com Desfazer');
        desfazer.click();
        assert.equal(db.poemas[0].intertextualidade[0].obra, 'Águas de Março, de Tom Jobim');
        assert.equal(db.poemas[0].intertextualidade[0].autor, '');
        assert.equal(celula(chave, 'nome').value, 'Águas de Março, de Tom Jobim');
    });

    it('o botão Revisar e gravar abre a mesma confirmação', () => {
        digitarAutor(chave, 'Tom Jobim');
        el('conexoes-revisao').querySelector('[data-rev-acao="gravar"]').click();
        assert.equal(confirmacaoAberta(), true);
    });

    it('sem backup, nada é gravado e as edições continuam pendentes', async () => {
        digitarAutor(chave, 'Tom Jobim');
        pedirRevisao({ tirarSnapshot: snapshotFalha });
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].autor, '');
        assert.match(el('revisao-resumo').textContent, /1 linha alterada/);
    });

    it('apagar o nome de uma obra que tinha nome é recusado, sem confirmação', () => {
        digitar(celula(chave, 'nome'), '');
        assert.equal(pedirRevisao({ tirarSnapshot: snapshotOk }), false);
        assert.equal(confirmacaoAberta(), false);
    });

    it('nada alterado: avisa e não abre a confirmação', () => {
        assert.equal(pedirRevisao(), false);
        assert.equal(confirmacaoAberta(), false);
    });

    it('grava traduzido e personagem só na Intertextualidade', async () => {
        toggleColuna('revisao-fora', 'traduzido', true);
        toggleColuna('revisao-fora', 'personagem', true);
        marcar(celula(chave, 'traduzido'), true);
        digitarPersonagem(chave, 'Narrador');
        pedirRevisao({ tirarSnapshot: snapshotOk });
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].traduzido, true);
        assert.deepEqual(db.poemas[0].intertextualidade[0].personagens, ['Narrador']);
    });

    it('personagem é um campo de tags: Enter confirma, o × e o Backspace tiram, sair do campo confirma', async () => {
        toggleColuna('revisao-fora', 'personagem', true);
        digitarPersonagem(chave, 'Prometeu');
        digitarPersonagem(chave, 'Zeus');
        digitarPersonagem(chave, 'prometeu');
        assert.deepEqual(personagensDe(chave), ['Prometeu', 'Zeus']);
        assert.equal(campoPersonagem(chave).value, '');
        assert.ok(
            linhas()
                .find((l) => l.dataset.revLinha === chave)
                .classList.contains('bg-amber-50'),
        );

        el('conexoes-revisao').querySelector('[data-rev-personagem-remover="0"]').click();
        assert.deepEqual(personagensDe(chave), ['Zeus']);
        teclar(campoPersonagem(chave), 'Backspace');
        assert.deepEqual(personagensDe(chave), []);

        const campo = campoPersonagem(chave);
        campo.value = 'Hera';
        campo.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.deepEqual(personagensDe(chave), ['Hera']);
        pedirRevisao({ tirarSnapshot: snapshotOk });
        await confirmar();
        assert.deepEqual(db.poemas[0].intertextualidade[0].personagens, ['Hera']);
    });

    it('origem é um campo de tags: Enter confirma, o × e o Backspace tiram, e grava origemObra', async () => {
        toggleColuna('revisao-fora', 'origem', true);
        const campo = () =>
            [...el('conexoes-revisao').querySelectorAll('[data-rev-origem-input]')].find(
                (c) => c.dataset.revOrigemInput === chave,
            );
        const origensDe = () =>
            [
                ...(el('conexoes-revisao')
                    .querySelector(`[data-rev-origem-chips="${chave}"]`)
                    ?.querySelectorAll('span') || []),
            ].map((t) => t.firstChild.textContent);
        for (const nome of ['Grécia', 'Roma', 'grécia']) {
            campo().value = nome;
            teclar(campo(), 'Enter');
        }
        assert.deepEqual(origensDe(), ['Grécia', 'Roma']);
        el('conexoes-revisao').querySelector('[data-rev-origem-remover="0"]').click();
        assert.deepEqual(origensDe(), ['Roma']);
        campo().value = 'Itália';
        campo().dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.deepEqual(origensDe(), ['Roma', 'Itália']);
        pedirRevisao({ tirarSnapshot: snapshotOk });
        await confirmar();
        assert.deepEqual(db.poemas[0].intertextualidade[0].origemObra, ['Roma', 'Itália']);
    });

    it('personagem antigo (texto) aparece como uma tag', () => {
        db.poemas[0].intertextualidade[0].personagem = 'Capitu';
        window.dispatchEvent(new window.Event('fora-do-acervo:renderizado'));
        toggleColuna('revisao-fora', 'personagem', true);
        assert.deepEqual(personagensDe(chave), ['Capitu']);
    });

    it('link novo preenche a data de acesso com hoje, e apagar o link a limpa', async () => {
        toggleColuna('revisao-fora', 'link', true);
        toggleColuna('revisao-fora', 'dataAcesso', true);
        assert.equal(celula(chave, 'dataAcesso').disabled, true);
        digitar(celula(chave, 'link'), 'https://exemplo.org');
        assert.equal(celula(chave, 'dataAcesso').disabled, false);
        assert.match(celula(chave, 'dataAcesso').value, /^\d{4}-\d{2}-\d{2}$/);
        pedirRevisao({ tirarSnapshot: snapshotOk });
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].link, 'https://exemplo.org');
        assert.match(db.poemas[0].intertextualidade[0].dataAcesso, /^\d{4}-\d{2}-\d{2}$/);

        digitar(celula(chave, 'link'), '');
        assert.equal(celula(chave, 'dataAcesso').value, '');
        assert.equal(celula(chave, 'dataAcesso').disabled, true);
    });
});

describe('descartar e dados que mudam por fora', () => {
    beforeEach(() => {
        cenario();
        alternarModoRevisao(true);
    });

    const chave = 'poema:1:intertextualidade:0';

    it('descartar volta tudo ao gravado, depois de confirmar', async () => {
        digitarAutor(chave, 'Tom Jobim');
        assert.equal(descartarAlteracoes(), true);
        assert.equal(confirmacaoAberta(), true);
        await confirmar();
        assert.deepEqual(tagsDe(chave), []);
        assert.match(el('revisao-resumo').textContent, /Nenhuma alteração/);
        assert.equal(descartarAlteracoes(), false);
    });

    it('se o dado da linha mudou por outro caminho, a edição pendente é descartada', () => {
        digitarAutor(chave, 'Tom Jobim');
        db.poemas[0].intertextualidade[0].obra = 'Mudou por fora';
        renderConexoes();
        assert.match(el('revisao-resumo').textContent, /Nenhuma alteração/);
        assert.equal(celula(chave, 'nome').value, 'Mudou por fora');
        assert.deepEqual(tagsDe(chave), []);
    });

    it('sem nenhuma entrada, o modo revisão se fecha sozinho', () => {
        db.poemas = [];
        renderConexoes();
        assert.equal(modoRevisaoAtivo(), false);
        assert.equal(el('conexoes-fora-listas').classList.contains('hidden'), false);
    });
});

// ─── Autoria em lista (entrega 4 de 13) ──────────────────────

function cenarioAutoria() {
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        elementos: [],
        itensColetanea: [],
        poemas: [
            {
                id: 1,
                titulo: 'Ipanema',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Música',
                        obra: 'Garota de Ipanema',
                        autores: ['Tom Jobim', 'Vinicius de Moraes'],
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Dupla',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Música',
                        obra: 'Aquarela',
                        autor: 'Toquinho e Vinicius',
                    },
                ],
            },
        ],
        prosas: [],
    });
    reiniciarRevisaoParaTestes();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    renderConexoes();
    alternarModoRevisao(true);
}

describe('autor em tags no Modo revisão', () => {
    beforeEach(cenarioAutoria);
    const ipanema = 'poema:1:intertextualidade:0';
    const aquarela = 'poema:2:intertextualidade:0';

    it('a célula mostra uma tag por autor, e a entrada antiga vira uma tag só', () => {
        assert.deepEqual(tagsDe(ipanema), ['Tom Jobim', 'Vinicius de Moraes']);
        assert.deepEqual(tagsDe(aquarela), ['Toquinho e Vinicius']);
    });

    it('Enter e vírgula criam a tag; repetida não entra; nada é gravado ainda', () => {
        digitarAutor(ipanema, 'Chico Buarque');
        const campo = campoAutor(ipanema);
        campo.value = 'tom jobim';
        teclar(campo, ',');
        assert.deepEqual(tagsDe(ipanema), ['Tom Jobim', 'Vinicius de Moraes', 'Chico Buarque']);
        assert.match(el('revisao-resumo').textContent, /1 linha alterada/);
        assert.deepEqual(db.poemas[0].intertextualidade[0].autores, [
            'Tom Jobim',
            'Vinicius de Moraes',
        ]);
    });

    it('sair do campo com texto confirma a tag', () => {
        const campo = campoAutor(ipanema);
        campo.value = 'Chico Buarque';
        campo.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.deepEqual(tagsDe(ipanema), ['Tom Jobim', 'Vinicius de Moraes', 'Chico Buarque']);
        assert.equal(campo.value, '');
    });

    it('o × e o Backspace com o campo vazio tiram tags; voltar ao original limpa a pendência', () => {
        el('conexoes-revisao').querySelector('[data-rev-autor-remover="1"]').click();
        assert.deepEqual(tagsDe(ipanema), ['Tom Jobim']);
        assert.match(el('revisao-resumo').textContent, /1 linha alterada/);
        digitarAutor(ipanema, 'Vinicius de Moraes');
        assert.deepEqual(tagsDe(ipanema), ['Tom Jobim', 'Vinicius de Moraes']);
        assert.match(el('revisao-resumo').textContent, /Nenhuma alteração/);
        teclar(campoAutor(ipanema), 'Backspace');
        assert.deepEqual(tagsDe(ipanema), ['Tom Jobim']);
    });

    it('a edição pendente de autor sobrevive a um redesenho da seção (comparada por valor)', () => {
        digitarAutor(ipanema, 'Chico Buarque');
        renderConexoes();
        assert.deepEqual(tagsDe(ipanema), ['Tom Jobim', 'Vinicius de Moraes', 'Chico Buarque']);
        assert.match(el('revisao-resumo').textContent, /1 linha alterada/);
    });

    it('a edição sobrevive a mudar o filtro e a busca', () => {
        digitarAutor(ipanema, 'Chico Buarque');
        digitar(el('revisao-busca'), 'aquarela');
        digitar(el('revisao-busca'), '');
        assert.deepEqual(tagsDe(ipanema), ['Tom Jobim', 'Vinicius de Moraes', 'Chico Buarque']);
    });

    it('o filtro "Autor parece ter mais de um nome" deixa só as linhas com tag a dividir', () => {
        const faltando = el('revisao-faltando');
        faltando.value = 'autor-varios-nomes';
        faltando.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.equal(linhas().length, 1);
        assert.equal(linhas()[0].dataset.revLinha, aquarela);
        assert.equal(faltando.value, 'autor-varios-nomes');
    });

    it('dividir a tag e gravar guarda a lista; Desfazer devolve o formato antigo', async () => {
        el('conexoes-revisao').querySelector(`[data-rev-autor-chave="${aquarela}"]`).click();
        digitarAutor(aquarela, 'Toquinho');
        digitarAutor(aquarela, 'Vinicius de Moraes');
        assert.deepEqual(tagsDe(aquarela), ['Toquinho', 'Vinicius de Moraes']);
        pedirRevisao({ tirarSnapshot: snapshotOk });
        assert.ok(confirmacaoAberta());
        el('excl-confirmar').onclick();
        await tick();
        await tick();
        assert.deepEqual(db.poemas[1].intertextualidade[0].autores, [
            'Toquinho',
            'Vinicius de Moraes',
        ]);
        assert.equal(db.poemas[1].intertextualidade[0].autor, undefined);
        const desfazer = [...document.querySelectorAll('button')].find(
            (b) => b.textContent === 'Desfazer',
        );
        desfazer.click();
        assert.equal(db.poemas[1].intertextualidade[0].autor, 'Toquinho e Vinicius');
        assert.equal(db.poemas[1].intertextualidade[0].autores, undefined);
    });
});
