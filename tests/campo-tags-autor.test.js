import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Campo de tags do autor da obra (Intertextualidade e Hipertextualidade),
// nos modais REAIS de Poema e Prosa (confere também os ids do HTML) e com os
// listeners ligados por initEditor e initEditorProsa, como no app.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais/', arquivo), 'utf8');
document.body.innerHTML = `${lerModal('modal-poema.html')}\n${lerModal('modal-prosa.html')}`;

const { db } = await import('../js/db.js');
const ed = await import('../js/editor.js');
const { migrarTranstextualidadeDosItens } = await import('../js/intertextualidade.js');

ed.initEditor();
ed.initEditorProsa();

const el = (id) => document.getElementById(id);
const chips = (id) =>
    Array.from(el(`${id}-chips`).querySelectorAll('span')).map((s) => s.firstChild.textContent);

function digitar(id, texto) {
    el(id).value = texto;
    el(id).dispatchEvent(new window.Event('input', { bubbles: true }));
}
function tecla(id, key) {
    const e = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el(id).dispatchEvent(e);
    return e;
}
function escolherDaLista(id, texto) {
    el(id).value = texto;
    const e = new window.Event('input', { bubbles: true });
    e.inputType = 'insertReplacementText';
    el(id).dispatchEvent(e);
}
const sugestoes = (id) =>
    Array.from(el(id).querySelectorAll('option')).map((o) => o.getAttribute('value'));

const CASOS = [
    // [tabela, prefixo, campo, sufixo dos datalists, id da obra, prefixo do botão add]
    ['poemas', 'p', 'intertexto', '', 'obra'],
    ['poemas', 'p', 'hipertexto', '', 'hipotexto'],
    ['prosas', 'pr', 'intertexto', '-prosa', 'obra'],
    ['prosas', 'pr', 'hipertexto', '-prosa', 'hipotexto'],
];

function adicionar(tabela, campo) {
    if (campo === 'intertexto') ed.adicionarIntertexto(tabela);
    else ed.adicionarHipertextualidade(tabela);
}
function obterEntradas(tabela, campo) {
    return campo === 'intertexto'
        ? ed.obterIntertextualidade(tabela)
        : ed.obterHipertextualidade(tabela);
}
function editar(tabela, campo, i) {
    if (campo === 'intertexto') ed.editarIntertexto(tabela, i);
    else ed.editarHipertextualidade(tabela, i);
}
function reset() {
    ['poemas', 'prosas'].forEach((t) => {
        ed.resetIntertextualidade(t);
        ed.resetHipertextualidade(t);
    });
    document
        .querySelectorAll('input[type="text"], input[type="url"], textarea')
        .forEach((e) => (e.value = ''));
    db.poemas = [];
    db.prosas = [];
}

for (const [tabela, p, campo, sufixoLista, idObra] of CASOS) {
    const autor = `${p}-${campo}-autor`;
    const obra = `${p}-${campo}-${idObra}`;
    const nome = `${tabela}, ${campo}`;

    describe(`Campo de tags do autor (${nome})`, () => {
        beforeEach(reset);

        it('o HTML traz o campo e o contêiner das tags', () => {
            assert.ok(el(autor), 'input do autor');
            assert.ok(el(`${autor}-chips`), 'contêiner das tags');
            assert.equal(el(autor).getAttribute('list'), `sugestoes-${campo}-autor${sufixoLista}`);
        });

        it('Enter confirma a tag e esvazia o campo; Enter vazio não faz nada', () => {
            digitar(autor, 'Tom Jobim');
            tecla(autor, 'Enter');
            assert.deepEqual(chips(autor), ['Tom Jobim']);
            assert.equal(el(autor).value, '');
            tecla(autor, 'Enter');
            assert.deepEqual(chips(autor), ['Tom Jobim']);
            assert.deepEqual(ed.autoresDoFormulario(tabela, campo), ['Tom Jobim']);
        });

        it('vírgula confirma; vírgula com o campo vazio não escreve nada', () => {
            digitar(autor, 'Vinicius de Moraes');
            const e = tecla(autor, ',');
            assert.equal(e.defaultPrevented, true);
            assert.deepEqual(chips(autor), ['Vinicius de Moraes']);
            const vazio = tecla(autor, ',');
            assert.equal(vazio.defaultPrevented, true);
            assert.deepEqual(chips(autor), ['Vinicius de Moraes']);
        });

        it('escolher uma sugestão da lista confirma na hora; digitar não', () => {
            digitar(autor, 'Chico');
            assert.deepEqual(chips(autor), []);
            escolherDaLista(autor, 'Chico Buarque');
            assert.deepEqual(chips(autor), ['Chico Buarque']);
            assert.equal(el(autor).value, '');
        });

        it('repetida (ignorando caixa e acento) não entra, e a ordem digitada fica', () => {
            ['Tom Jobim', 'Vinicius de Moraes', 'tom jobim', 'Vinícius de Moraes'].forEach((t) => {
                digitar(autor, t);
                tecla(autor, 'Enter');
            });
            assert.deepEqual(ed.autoresDoFormulario(tabela, campo), [
                'Tom Jobim',
                'Vinicius de Moraes',
            ]);
        });

        it('Backspace com o campo vazio tira a última tag; com texto, não', () => {
            ['A', 'B'].forEach((t) => {
                digitar(autor, t);
                tecla(autor, 'Enter');
            });
            digitar(autor, 'C');
            const comTexto = tecla(autor, 'Backspace');
            assert.equal(comTexto.defaultPrevented, false);
            assert.deepEqual(chips(autor), ['A', 'B']);
            el(autor).value = '';
            tecla(autor, 'Backspace');
            assert.deepEqual(chips(autor), ['A']);
        });

        it('o × de uma tag a remove', () => {
            ['A', 'B', 'C'].forEach((t) => {
                digitar(autor, t);
                tecla(autor, 'Enter');
            });
            el(`${autor}-chips`).querySelector('[data-autor-remover="1"]').click();
            assert.deepEqual(chips(autor), ['A', 'C']);
            // Os índices foram refeitos: o × da última agora é o 1.
            el(`${autor}-chips`).querySelector('[data-autor-remover="1"]').click();
            assert.deepEqual(chips(autor), ['A']);
        });

        it('salvar grava `autores` com as tags e o texto ainda digitado, sem `autor`', () => {
            digitar(obra, 'Garota de Ipanema');
            digitar(autor, 'Tom Jobim');
            tecla(autor, 'Enter');
            digitar(autor, 'Vinicius de Moraes');
            adicionar(tabela, campo);
            const [e] = obterEntradas(tabela, campo);
            assert.deepEqual(e.autores, ['Tom Jobim', 'Vinicius de Moraes']);
            assert.ok(!('autor' in e));
            assert.deepEqual(chips(autor), [], 'o formulário volta vazio');
            assert.equal(el(autor).value, '');
        });

        it('só um autor, sem mais nada, já basta para adicionar a entrada', () => {
            digitar(autor, 'Anônimo');
            adicionar(tabela, campo);
            assert.deepEqual(
                obterEntradas(tabela, campo).map((e) => e.autores),
                [['Anônimo']],
            );
        });

        it('editar traz as tags de volta, na ordem; cancelar limpa', () => {
            digitar(obra, 'X');
            ['Ana', 'Bia'].forEach((t) => {
                digitar(autor, t);
                tecla(autor, 'Enter');
            });
            adicionar(tabela, campo);
            editar(tabela, campo, 0);
            assert.deepEqual(chips(autor), ['Ana', 'Bia']);
            if (campo === 'intertexto') ed.cancelarEdicaoIntertexto(tabela);
            else ed.cancelarEdicaoHipertextualidade(tabela);
            assert.deepEqual(chips(autor), []);
            assert.equal(obterEntradas(tabela, campo).length, 1);
        });

        it('editar e tirar uma tag grava a lista nova no mesmo lugar', () => {
            digitar(obra, 'X');
            ['Ana', 'Bia'].forEach((t) => {
                digitar(autor, t);
                tecla(autor, 'Enter');
            });
            adicionar(tabela, campo);
            editar(tabela, campo, 0);
            el(`${autor}-chips`).querySelector('[data-autor-remover="0"]').click();
            adicionar(tabela, campo);
            const entradas = obterEntradas(tabela, campo);
            assert.equal(entradas.length, 1);
            assert.deepEqual(entradas[0].autores, ['Bia']);
        });

        it('carregar outro texto limpa as tags do formulário', () => {
            digitar(autor, 'Ana');
            tecla(autor, 'Enter');
            if (campo === 'intertexto') ed.carregarIntertextualidade(tabela, []);
            else ed.carregarHipertextualidade(tabela, []);
            assert.deepEqual(chips(autor), []);
        });

        it('entrada antiga com `autor` (texto) abre como UMA tag, mesmo com " e "', () => {
            const antiga =
                campo === 'intertexto'
                    ? { tipoObra: 'Música', obra: 'Y', autor: 'Tom Jobim e Vinicius' }
                    : { tipoObra: 'Música', hipotexto: 'Y', autor: 'Tom Jobim e Vinicius' };
            if (campo === 'intertexto') ed.carregarIntertextualidade(tabela, [antiga]);
            else ed.carregarHipertextualidade(tabela, [antiga]);
            const [e] = obterEntradas(tabela, campo);
            assert.deepEqual(e.autores, ['Tom Jobim e Vinicius']);
            assert.ok(!('autor' in e));
            editar(tabela, campo, 0);
            assert.deepEqual(chips(autor), ['Tom Jobim e Vinicius']);
        });

        it('a lista de entradas mostra os autores em uma frase', () => {
            digitar(obra, 'Y');
            ['Ana', 'Bia', 'Caio'].forEach((t) => {
                digitar(autor, t);
                tecla(autor, 'Enter');
            });
            adicionar(tabela, campo);
            assert.match(el(`${p}-${campo}-lista`).textContent, /Ana, Bia e Caio/);
        });

        it('o autocompletar de autor não repete quem já virou tag', () => {
            const dados = tabela === 'prosas' ? 'prosas' : 'poemas';
            db[dados] = [
                {
                    id: 1,
                    intertextualidade: [
                        { tipoObra: 'Música', obra: 'Z', autores: ['Ana', 'Bia', 'Caio'] },
                    ],
                },
            ];
            digitar(autor, 'Ana');
            tecla(autor, 'Enter');
            assert.deepEqual(sugestoes(`sugestoes-${campo}-autor${sufixoLista}`), ['Bia', 'Caio']);
        });

        it('as obras sugeridas se restringem às que têm todas as tags escolhidas', () => {
            const dados = tabela === 'prosas' ? 'prosas' : 'poemas';
            const itens = [
                { tipoObra: 'Música', obra: 'Dupla', hipotexto: 'Dupla', autores: ['Ana', 'Bia'] },
                { tipoObra: 'Música', obra: 'Solo', hipotexto: 'Solo', autores: ['Ana'] },
            ];
            db[dados] = [{ id: 1, intertextualidade: itens, hipertextualidade: itens }];
            digitar(autor, 'Ana');
            tecla(autor, 'Enter');
            const lista =
                campo === 'intertexto' ? 'sugestoes-intertexto' : 'sugestoes-hipertexto-hipotexto';
            assert.deepEqual(sugestoes(`${lista}${sufixoLista}`), ['Dupla', 'Solo']);
            digitar(autor, 'Bia');
            tecla(autor, 'Enter');
            assert.deepEqual(sugestoes(`${lista}${sufixoLista}`), ['Dupla']);
        });
    });
}

describe('Campo de tags do autor: migração e descrição', () => {
    beforeEach(reset);

    it('migrarTranstextualidadeDosItens passa `autor` para `autores` nos dois campos e é idempotente', () => {
        const itens = [
            {
                intertextualidade: [{ obra: 'A', autor: 'Ana' }, { obra: 'B' }],
                hipertextualidade: [{ hipotexto: 'C', autor: 'Bia e Caio' }],
            },
        ];
        migrarTranstextualidadeDosItens(itens);
        assert.deepEqual(
            itens[0].intertextualidade.map((e) => e.autores),
            [['Ana'], []],
        );
        assert.deepEqual(itens[0].hipertextualidade[0].autores, ['Bia e Caio']);
        assert.ok(itens[0].intertextualidade.every((e) => !('autor' in e)));
        const antes = JSON.stringify(itens);
        migrarTranstextualidadeDosItens(itens);
        assert.equal(JSON.stringify(itens), antes);
    });

    it('confirmar uma tag preenche a Descrição vazia quando a obra e os autores têm uma só', () => {
        db.poemas = [
            {
                id: 1,
                intertextualidade: [
                    {
                        tipoObra: 'Livro',
                        obra: 'Dom Casmurro',
                        autores: ['Machado'],
                        descricao: 'romance',
                    },
                ],
            },
        ];
        digitar('p-intertexto-tipo', 'Livro');
        digitar('p-intertexto-obra', 'Dom Casmurro');
        digitar('p-intertexto-autor', 'Machado');
        tecla('p-intertexto-autor', 'Enter');
        assert.equal(el('p-intertexto-descricao').value, 'romance');
    });

    it('com outros autores a Descrição não é copiada da obra de mesmo nome', () => {
        db.poemas = [
            {
                id: 1,
                intertextualidade: [
                    {
                        tipoObra: 'Livro',
                        obra: 'Dom Casmurro',
                        autores: ['Machado'],
                        descricao: 'romance',
                    },
                ],
            },
        ];
        digitar('p-intertexto-tipo', 'Livro');
        digitar('p-intertexto-obra', 'Dom Casmurro');
        digitar('p-intertexto-autor', 'Outra Pessoa');
        tecla('p-intertexto-autor', 'Enter');
        assert.equal(el('p-intertexto-descricao').value, '');
    });

    it('os campos de Poema e de Prosa têm tags independentes', () => {
        digitar('p-intertexto-autor', 'Ana');
        tecla('p-intertexto-autor', 'Enter');
        digitar('pr-intertexto-autor', 'Bia');
        tecla('pr-intertexto-autor', 'Enter');
        digitar('p-hipertexto-autor', 'Caio');
        tecla('p-hipertexto-autor', 'Enter');
        assert.deepEqual(ed.autoresDoFormulario('poemas', 'intertexto'), ['Ana']);
        assert.deepEqual(ed.autoresDoFormulario('prosas', 'intertexto'), ['Bia']);
        assert.deepEqual(ed.autoresDoFormulario('poemas', 'hipertexto'), ['Caio']);
        assert.deepEqual(ed.autoresDoFormulario('prosas', 'hipertexto'), []);
    });
});
