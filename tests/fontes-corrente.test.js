import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fontes de uma Corrente literária: `fontes: [{ autor, obra, ano, nota }]`.
// A professora de Linguagens observou que autores diferentes classificam de
// modos distintos; o cadastro registra o que embasa cada classificação, e quem
// cria uma corrente também pode registrar o que consultou.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-movimentosEscolas"></div>
        <div id="lista-movimentos-escolas"></div>
    </main>
    ${fs.readFileSync(path.resolve(__dirname, '../modais/modal-movimento-escola.html'), 'utf8')}
`;

const F = await import('../js/fontes-corrente.js');
const UI = await import('../js/fontes-corrente-ui.js');
const D = await import('../js/db.js');
const { db } = D;
const { editarMovimentoEscola, initFormMovimentoEscola } = await import('../js/forms.js');
const { renderVisualizacaoMovimentoEscolaHtml } =
    await import('../js/visualizar-movimento-escola.js');
const { renderMovimentosEscolas } = await import('../js/render-listas.js');

// Nomes das correntes de fábrica, lidos do seed real (instalação nova).
const NOMES_DE_FABRICA = D.db.movimentosEscolas.filter((m) => m.embutido).map((m) => m.nome);

describe('normalizarFonte', () => {
    it('aparra espaços, aceita ano numérico e mantém as quebras de linha da nota', () => {
        assert.deepEqual(
            F.normalizarFonte({
                autor: '  Alfredo   Bosi ',
                obra: ' História concisa ',
                ano: 1970,
                nota: ' cap. 3\nver p. 40 ',
            }),
            {
                autor: 'Alfredo Bosi',
                obra: 'História concisa',
                ano: '1970',
                nota: 'cap. 3\nver p. 40',
            },
        );
    });

    it('autor ou obra bastam; sem nenhum dos dois não é fonte', () => {
        assert.ok(F.normalizarFonte({ autor: 'Bosi' }));
        assert.ok(F.normalizarFonte({ obra: 'Mimesis' }));
        assert.equal(F.normalizarFonte({ ano: '1970', nota: 'solta' }), null);
        assert.equal(F.normalizarFonte({ autor: ' ', obra: '' }), null);
        assert.equal(F.normalizarFonte(null), null);
        assert.equal(F.normalizarFonte('Bosi'), null);
        assert.equal(F.normalizarFonte([]), null);
    });
});

describe('normalizarFontes e unirFontes', () => {
    it('lixo sai, a mesma obra do mesmo autor não se repete (sem caixa nem acento)', () => {
        const r = F.normalizarFontes([
            { autor: 'Antonio Candido', obra: 'Formação' },
            null,
            { autor: 'ANTÔNIO candido', obra: 'formação', ano: '1959', nota: 'cap. 1' },
            { autor: 'Outro', obra: 'Formação' },
            { nota: 'vazia' },
        ]);
        assert.equal(r.length, 2);
        assert.deepEqual(r[0], {
            autor: 'Antonio Candido',
            obra: 'Formação',
            ano: '1959',
            nota: 'cap. 1',
        });
    });

    it('não é lista: devolve lista vazia', () => {
        assert.deepEqual(F.normalizarFontes(undefined), []);
        assert.deepEqual(F.normalizarFontes('x'), []);
        assert.deepEqual(F.normalizarFontes({}), []);
    });

    it('unir: o destino manda e a origem só acrescenta o que falta', () => {
        const r = F.unirFontes(
            [{ autor: 'A', obra: 'X', nota: 'do destino' }],
            [
                { autor: 'A', obra: 'X', nota: 'da origem' },
                { autor: 'B', obra: 'Y' },
            ],
        );
        assert.deepEqual(
            r.map((f) => [f.autor, f.obra, f.nota]),
            [
                ['A', 'X', 'do destino'],
                ['B', 'Y', ''],
            ],
        );
        assert.deepEqual(F.unirFontes(undefined, undefined), []);
    });
});

describe('textoDaFonte e textoBuscaDasFontes', () => {
    it('autor. obra (ano). nota, sem ponto duplo', () => {
        assert.equal(
            F.textoDaFonte({
                autor: 'Alfredo Bosi.',
                obra: 'História concisa da literatura brasileira',
                ano: '1970',
            }),
            'Alfredo Bosi. História concisa da literatura brasileira (1970).',
        );
        assert.equal(
            F.textoDaFonte({ autor: 'A', obra: 'B', ano: '1', nota: 'cap. 2' }),
            'A. B (1). cap. 2',
        );
        assert.equal(
            F.textoDaFonte({ autor: 'A', obra: 'B', ano: '1', nota: 'cap. 2' }, { comNota: false }),
            'A. B (1).',
        );
        assert.equal(F.textoDaFonte({ autor: 'Só autor' }), 'Só autor.');
        assert.equal(F.textoDaFonte(null), '');
    });

    it('o texto de busca junta autor, obra, ano e nota', () => {
        const t = F.textoBuscaDasFontes([
            { autor: 'Bosi', obra: 'Concisa', ano: '1970', nota: 'x' },
        ]);
        assert.match(t, /Bosi.*Concisa.*1970.*x/);
        assert.equal(F.textoBuscaDasFontes([]), '');
    });
});

describe('catálogo de fábrica', () => {
    it('toda corrente de fábrica tem fonte, e só elas (a lista bate com o seed)', () => {
        assert.equal(NOMES_DE_FABRICA.length, 38);
        assert.deepEqual([...F.nomesComFontesDeFabrica()].sort(), [...NOMES_DE_FABRICA].sort());
        NOMES_DE_FABRICA.forEach((nome) =>
            assert.ok(F.fontesDeFabricaDaCorrente(nome).length >= 1, nome),
        );
    });

    it('nome fora do seed não recebe fonte', () => {
        assert.deepEqual(F.fontesDeFabricaDaCorrente('Minha corrente'), []);
    });

    it('nenhuma chave morta: o que a corrente cita existe, e tudo do catálogo é usado', () => {
        const usadas = F.chavesUsadasNoCatalogo();
        usadas.forEach((chave) => assert.ok(F.CATALOGO_FONTES[chave], `chave morta: ${chave}`));
        Object.keys(F.CATALOGO_FONTES).forEach((chave) =>
            assert.ok(usadas.has(chave), `sem uso no catálogo: ${chave}`),
        );
    });

    it('toda referência tem autor, obra e ano de quatro dígitos que já passou', () => {
        Object.entries(F.CATALOGO_FONTES).forEach(([chave, f]) => {
            assert.ok(f.autor && f.obra, chave);
            assert.match(f.ano, /^\d{4}$/, chave);
            assert.ok(Number(f.ano) <= 2026, chave);
        });
    });

    it('sem repetir fonte dentro de uma corrente e sem travessão nos textos', () => {
        NOMES_DE_FABRICA.forEach((nome) => {
            const fontes = F.fontesDeFabricaDaCorrente(nome);
            assert.equal(F.normalizarFontes(fontes).length, fontes.length, nome);
            fontes.forEach((f) => {
                [f.autor, f.obra, f.ano, f.nota].forEach((t) =>
                    assert.doesNotMatch(t, /[—–]/, `${nome}: travessão`),
                );
            });
        });
    });

    it('devolve cópias: mexer numa corrente não muda o catálogo nem outra corrente', () => {
        const a = F.fontesDeFabricaDaCorrente('Barroco');
        a[0].obra = 'ALTERADA';
        a.push({ autor: 'X', obra: 'Y' });
        const b = F.fontesDeFabricaDaCorrente('Barroco');
        assert.notEqual(b[0].obra, 'ALTERADA');
        assert.equal(F.CATALOGO_FONTES.bosi.obra, 'História concisa da literatura brasileira');
        assert.ok(b.length < a.length);
    });

    it('divergência conhecida fica anotada onde importa (Barroco, Pós-modernismo)', () => {
        const barroco = F.fontesDeFabricaDaCorrente('Barroco');
        assert.ok(barroco.some((f) => /Formação/.test(f.obra) && f.nota));
        assert.ok(barroco.some((f) => /sequestro/i.test(f.obra) && f.nota));
        const pos = F.fontesDeFabricaDaCorrente('Pós-modernismo');
        assert.ok(pos.some((f) => /Lyotard/.test(f.autor) && /disputado/.test(f.nota)));
    });
});

describe('dado: seed, migração, criação e mesclagem', () => {
    it('instalação nova: as correntes de fábrica já nascem com as fontes', () => {
        D.db.movimentosEscolas
            .filter((m) => m.embutido)
            .forEach((m) => {
                assert.deepEqual(m.fontes, F.fontesDeFabricaDaCorrente(m.nome), m.nome);
            });
    });

    it('migrarMovimentosEscolasEmbutidos cria o que falta já com as fontes', () => {
        const lista = [];
        D.migrarMovimentosEscolasEmbutidos(lista, []);
        assert.equal(lista.find((m) => m.nome === 'Futurismo').fontes.length >= 1, true);
    });

    it('registro antigo (sem o campo) recebe as fontes de fábrica uma única vez, por nome', () => {
        const lista = [
            { id: 1, nome: 'Barroco' },
            { id: 2, nome: 'Minha corrente' },
            { id: 3, nome: 'Realismo', embutido: true },
            { id: 4, nome: 'Barroco copiado', embutido: false },
        ];
        D.migrarMovimentosEscolas(lista);
        assert.deepEqual(lista[0].fontes, F.fontesDeFabricaDaCorrente('Barroco'));
        assert.deepEqual(lista[1].fontes, []);
        assert.deepEqual(lista[2].fontes, F.fontesDeFabricaDaCorrente('Realismo'));
        assert.deepEqual(lista[3].fontes, []);
    });

    it('nunca sobrescreve: nem fonte da pessoa, nem lista esvaziada de propósito', () => {
        const propria = [{ autor: 'Eu', obra: 'Minhas notas', ano: '2026', nota: '' }];
        const lista = [
            { id: 1, nome: 'Barroco', fontes: propria },
            { id: 2, nome: 'Realismo', fontes: [] },
        ];
        D.migrarMovimentosEscolas(lista);
        D.migrarMovimentosEscolas(lista);
        assert.deepEqual(lista[0].fontes, propria);
        assert.deepEqual(lista[1].fontes, []);
    });

    it('a migração limpa fonte torta e lista que não é lista', () => {
        const lista = [
            {
                id: 1,
                nome: 'X',
                embutido: false,
                fontes: [null, { autor: ' A ' }, 5, { ano: '1' }],
            },
            { id: 2, nome: 'Y', embutido: false, fontes: 'texto solto' },
        ];
        D.migrarMovimentosEscolas(lista);
        assert.deepEqual(lista[0].fontes, [{ autor: 'A', obra: '', ano: '', nota: '' }]);
        assert.deepEqual(lista[1].fontes, []);
    });

    it('obterOuCriarMovimentoEscolaPorNome cria sem fontes', () => {
        db.movimentosEscolas.length = 0;
        const m = D.obterOuCriarMovimentoEscolaPorNome('Movimento X');
        assert.deepEqual(m.fontes, []);
    });

    it('mesclar une as fontes sem repetir, e o destino manda', () => {
        const dbRef = {
            autores: [],
            poemas: [],
            prosas: [],
            movimentosEscolas: [
                {
                    id: 1,
                    nome: 'Origem',
                    fontes: [
                        { autor: 'A', obra: 'X', ano: '', nota: '' },
                        { autor: 'B', obra: 'Y', ano: '', nota: '' },
                    ],
                },
                {
                    id: 2,
                    nome: 'Destino',
                    fontes: [{ autor: 'A', obra: 'X', ano: '', nota: 'minha' }],
                },
            ],
        };
        D.mesclarMovimentosEscolas(dbRef, 1, 2);
        const destino = dbRef.movimentosEscolas.find((m) => m.id === 2);
        assert.deepEqual(
            destino.fontes.map((f) => [f.autor, f.nota]),
            [
                ['A', 'minha'],
                ['B', ''],
            ],
        );
    });
});

describe('modal: grupo Fontes', () => {
    const linhas = () => [...document.querySelectorAll('#me-fontes-lista [data-fonte-linha]')];
    const preencher = (linha, valores) =>
        Object.entries(valores).forEach(([campo, v]) => {
            linha.querySelector(`[data-campo-fonte="${campo}"]`).value = v;
        });

    beforeEach(() => {
        db.movimentosEscolas = [
            {
                id: 7,
                nome: 'Concretismo',
                tipo: 'Literário',
                posturaEstetica: 'Iconoclasta',
                fontes: [
                    { autor: 'Alfredo Bosi', obra: 'Concisa', ano: '1970', nota: 'cap. 8' },
                    { autor: 'Haroldo de Campos', obra: 'Teoria', ano: '1965', nota: '' },
                ],
            },
            { id: 8, nome: 'Sem fonte', tipo: '', fontes: [] },
        ];
        db.autores = [];
        db.poemas = [];
        db.prosas = [];
    });

    it('editar carrega uma linha por fonte, com os quatro campos', async () => {
        await editarMovimentoEscola(7);
        assert.equal(linhas().length, 2);
        const primeira = linhas()[0];
        const valor = (c) => primeira.querySelector(`[data-campo-fonte="${c}"]`).value;
        assert.equal(valor('autor'), 'Alfredo Bosi');
        assert.equal(valor('obra'), 'Concisa');
        assert.equal(valor('ano'), '1970');
        assert.equal(valor('nota'), 'cap. 8');
        assert.equal(document.getElementById('me-fontes-vazio').classList.contains('hidden'), true);
    });

    it('sem fonte: lista vazia e o aviso aparece; o grupo abre só quando há fonte', async () => {
        await editarMovimentoEscola(8);
        assert.equal(linhas().length, 0);
        assert.equal(
            document.getElementById('me-fontes-vazio').classList.contains('hidden'),
            false,
        );
        const grupo = document.querySelector('details[data-grupo-corrente="fontes"]');
        assert.equal(grupo.open, false);
        await editarMovimentoEscola(7);
        assert.equal(grupo.open, true);
    });

    it('adicionar cria linha em branco com o foco no Autor; remover tira só aquela', async () => {
        await editarMovimentoEscola(8);
        UI.adicionarFonteCorrente();
        UI.adicionarFonteCorrente();
        assert.equal(linhas().length, 2);
        assert.equal(document.getElementById('me-fontes-vazio').classList.contains('hidden'), true);
        preencher(linhas()[1], { autor: 'Segunda' });
        UI.removerFonteCorrente(linhas()[0].querySelector('button'));
        assert.equal(linhas().length, 1);
        assert.equal(linhas()[0].querySelector('[data-campo-fonte="autor"]').value, 'Segunda');
    });

    it('o botão e o remover usam handlers do window (wiring)', () => {
        assert.match(
            document.getElementById('me-fontes-adicionar').getAttribute('onclick'),
            /adicionarFonteCorrente\(\)/,
        );
        UI.adicionarFonteCorrente();
        assert.match(
            linhas()[0].querySelector('button').getAttribute('onclick'),
            /removerFonteCorrente\(this\)/,
        );
    });

    it('salvar grava as fontes, descarta linha vazia e repetida, e preserva o resto', async () => {
        initFormMovimentoEscola();
        await editarMovimentoEscola(7);
        UI.adicionarFonteCorrente(); // fica vazia: some ao salvar
        UI.adicionarFonteCorrente();
        preencher(linhas()[3], { autor: ' Antonio Candido ', obra: 'Formação', ano: '1959' });
        UI.adicionarFonteCorrente();
        preencher(linhas()[4], { autor: 'antonio candido', obra: 'FORMAÇÃO' }); // repetida
        preencher(linhas()[0], { nota: 'cap. 8, p. 40' });
        document.getElementById('form-movimento-escola').requestSubmit();
        const m = db.movimentosEscolas.find((x) => x.id === 7);
        assert.deepEqual(
            m.fontes.map((f) => [f.autor, f.obra, f.ano, f.nota]),
            [
                ['Alfredo Bosi', 'Concisa', '1970', 'cap. 8, p. 40'],
                ['Haroldo de Campos', 'Teoria', '1965', ''],
                ['Antonio Candido', 'Formação', '1959', ''],
            ],
        );
        assert.equal(m.nome, 'Concretismo');
        assert.equal(m.posturaEstetica, 'Iconoclasta');
    });

    it('remover todas as linhas e salvar deixa a corrente sem fontes (e a migração não as devolve)', async () => {
        initFormMovimentoEscola();
        db.movimentosEscolas[0] = { ...db.movimentosEscolas[0], nome: 'Barroco' };
        await editarMovimentoEscola(7);
        UI.resetFontesCorrente();
        document.getElementById('form-movimento-escola').requestSubmit();
        const m = db.movimentosEscolas.find((x) => x.id === 7);
        assert.deepEqual(m.fontes, []);
        D.migrarMovimentosEscolas(db.movimentosEscolas);
        assert.deepEqual(m.fontes, []);
    });

    it('reset (corrente nova) esvazia a lista', async () => {
        await editarMovimentoEscola(7);
        UI.resetFontesCorrente();
        assert.equal(linhas().length, 0);
        assert.deepEqual(UI.lerFontesCorrente(), []);
    });

    it('o HTML escapa o que a pessoa digitou (nada vira marcação)', async () => {
        db.movimentosEscolas[1].fontes = [
            { autor: '<img src=x onerror=1>', obra: '"aspas" & cia', ano: '', nota: '' },
        ];
        await editarMovimentoEscola(8);
        assert.equal(document.querySelector('#me-fontes-lista img'), null);
        assert.equal(UI.lerFontesCorrente()[0].autor, '<img src=x onerror=1>');
        const html = renderVisualizacaoMovimentoEscolaHtml(db.movimentosEscolas[1]);
        assert.doesNotMatch(html, /<img/);
    });
});

describe('Visualização e cartão', () => {
    it('Ver mostra a seção Fontes com a contagem, autor, obra, ano e a nota; sem fonte, sem seção', () => {
        const com = renderVisualizacaoMovimentoEscolaHtml({
            nome: 'X',
            fontes: [
                { autor: 'Alfredo Bosi', obra: 'Concisa', ano: '1970', nota: 'cap. 8' },
                { autor: 'B', obra: 'Y', ano: '', nota: '' },
            ],
        });
        assert.match(com, /Fontes \(2\)/);
        assert.match(com, /Alfredo Bosi\. Concisa \(1970\)\./);
        assert.match(com, /cap\. 8/);
        const sem = renderVisualizacaoMovimentoEscolaHtml({ nome: 'X', fontes: [] });
        assert.doesNotMatch(sem, /Fontes/);
        assert.doesNotMatch(renderVisualizacaoMovimentoEscolaHtml({ nome: 'X' }), /Fontes/);
    });

    it('o cartão diz quantas fontes a corrente tem, ou que não tem nenhuma', () => {
        db.autores = [];
        db.poemas = [];
        db.prosas = [];
        db.movimentosEscolas = [
            { id: 1, nome: 'Com uma', paiId: null, fontes: [{ autor: 'A', obra: 'B' }] },
            { id: 2, nome: 'Com duas', paiId: null, fontes: [{ autor: 'A' }, { autor: 'B' }] },
            { id: 3, nome: 'Sem nada', paiId: null, fontes: [] },
            { id: 4, nome: 'Registro antigo', paiId: null },
        ];
        renderMovimentosEscolas();
        const texto = document.getElementById('lista-movimentos-escolas').textContent;
        assert.match(texto, /1 fonte(?!s)/);
        assert.match(texto, /2 fontes/);
        assert.equal((texto.match(/sem fontes/g) || []).length, 2);
    });
});
