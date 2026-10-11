// Etapa 3a dos Personagens: participação por livro (`participacoes` no
// cadastro do Personagem), editada no modal do Personagem.
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_MODAL = fs.readFileSync(path.join(RAIZ, 'modais', 'modal-personagem.html'), 'utf8');
const HTML_LIVRO = fs.readFileSync(path.join(RAIZ, 'modais', 'modal-livro.html'), 'utf8');

document.body.innerHTML = `
    <main><div id="lista-personagens"></div><span id="resumo-personagens"></span></main>
    <div id="modais-container">${HTML_MODAL}</div>
`;

const P = await import('../js/personagens.js');
const { db, deleteItem } = await import('../js/db.js');
const U = await import('../js/ui-personagens.js');
const { montarRegistro } = await import('../js/exportar.js');
const { aplicarImportacaoAditiva, classificarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');

const REL = { papelNarrativo: [], funcaoTematica: [], arco: [], tropes: [] };

describe('normalização e sincronização', () => {
    it('uma participação por livro, tags em união, sem livroId descartada', () => {
        const r = P.normalizarParticipacoesPersonagem([
            { livroId: 5, arco: ['Queda'], tropes: ['Musa'] },
            { livroId: 5, arco: ['queda', 'Redenção'] },
            { livroId: '', arco: ['x'] },
            { arco: ['y'] },
            { livroId: 6 },
        ]);
        assert.deepEqual(r, [
            { livroId: 5, ...REL, arco: ['Queda', 'Redenção'], tropes: ['Musa'] },
            { livroId: 6, ...REL },
        ]);
    });

    it('normalizarPersonagem sempre devolve a lista (vazia em cadastro antigo)', () => {
        assert.deepEqual(P.normalizarPersonagem({ id: 1, nome: 'A' }).participacoes, []);
    });

    it('sincronizar solta participação de livro que não existe; db sem livros fica intacto', () => {
        const com = {
            livros: [{ id: 5, titulo: 'L' }],
            personagens: [{ id: 1, nome: 'A', participacoes: [{ livroId: 5 }, { livroId: 9 }] }],
            poemas: [],
            prosas: [],
        };
        P.sincronizarPersonagens(com);
        assert.deepEqual(
            com.personagens[0].participacoes.map((v) => v.livroId),
            [5],
        );

        const sem = {
            personagens: [{ id: 1, nome: 'A', participacoes: [{ livroId: 9 }] }],
            poemas: [],
            prosas: [],
        };
        P.sincronizarPersonagens(sem);
        assert.equal(sem.personagens[0].participacoes.length, 1);
    });

    it('as sugestões de tag juntam texto e livro', () => {
        const dbRef = {
            personagens: [{ id: 1, participacoes: [{ livroId: 5, arco: ['Queda'] }] }],
            poemas: [{ personagens: [{ personagemId: 1, arco: ['queda', 'Ascensão'] }] }],
            prosas: [],
        };
        // Os textos vêm primeiro, então a grafia do texto ('queda') é a que fica.
        assert.deepEqual(P.sugestoesRelacaoPersonagem(dbRef, 'arco'), ['queda', 'Ascensão']);
    });
});

describe('excluir o Livro tira a participação, e Desfazer devolve', () => {
    beforeEach(() => {
        db.livros.length = 0;
        db.personagens.length = 0;
        db.poemas.length = 0;
        db.prosas.length = 0;
        localStorage.clear();
        document.getElementById('modal-confirmar-exclusao')?.remove();
        document.getElementById('avisos-toast')?.remove();
    });

    it('com as tags de volta', () => {
        db.livros.push({ id: 5, titulo: 'Livro A', sequencia: 1, tipo: '' });
        db.personagens.push({
            id: 1,
            nome: 'Capitu',
            participacoes: [{ livroId: 5, arco: ['Queda'], papelNarrativo: ['Musa'] }],
        });
        deleteItem('livros', 5);
        document.getElementById('excl-confirmar').click();

        assert.equal(db.livros.length, 0);
        assert.deepEqual(db.personagens[0].participacoes, []);

        document.querySelector('#avisos-toast button').click();

        assert.equal(db.livros.length, 1);
        assert.deepEqual(db.personagens[0].participacoes, [
            { livroId: 5, ...REL, arco: ['Queda'], papelNarrativo: ['Musa'] },
        ]);
    });
});

describe('exportação e Importação Aditiva', () => {
    const destinoVazio = (livros) => ({
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        periodosHistoricos: [],
        livros,
        escansoes: [],
        estruturasTextuais: [],
        personagens: [],
    });

    function exportado() {
        db.livros.length = 0;
        db.personagens.length = 0;
        db.poemas.length = 0;
        db.livros.push({ id: 5, titulo: 'Livro Ágil', sequencia: 1, tipo: '' });
        db.personagens.push({
            id: 7,
            nome: 'Medusa',
            participacoes: [
                { livroId: 5, arco: ['Queda'], tropes: ['Monstro'] },
                { livroId: 99, arco: ['fantasma'] },
            ],
        });
        const item = {
            id: 3,
            titulo: 'X',
            personagens: [{ personagemId: 7, papeis: ['Voz'], centralidade: '' }],
        };
        db.poemas.push(item);
        const reg = JSON.parse(JSON.stringify(montarRegistro('poema', item)));
        db.poemas.length = 0;
        db.personagens.length = 0;
        db.livros.length = 0;
        return { itens: [{ ...reg, id: 42 }] };
    }

    const deps = () => ({
        tirarSnapshotSeNecessario: async () => true,
        save: () => {},
    });

    it('o vínculo leva a participação com o título do livro, sem o id, e omite livro inexistente', () => {
        const [reg] = exportado().itens;
        assert.deepEqual(reg.personagens[0].participacoes, [
            { livroTitulo: 'Livro Ágil', ...REL, arco: ['Queda'], tropes: ['Monstro'] },
        ]);
    });

    it('importa casando o livro pelo título (sem caixa/acento) e descarta o que não existe', async () => {
        const payload = exportado();
        const alvo = destinoVazio([{ id: 800, titulo: 'livro agil', sequencia: 1, tipo: '' }]);
        await aplicarImportacaoAditiva(
            payload,
            classificarImportacaoAditiva(payload, alvo),
            alvo,
            deps(),
        );
        assert.deepEqual(alvo.personagens[0].participacoes, [
            { livroId: 800, ...REL, arco: ['Queda'], tropes: ['Monstro'] },
        ]);

        const alvo2 = destinoVazio([]);
        await aplicarImportacaoAditiva(
            payload,
            classificarImportacaoAditiva(payload, alvo2),
            alvo2,
            deps(),
        );
        assert.deepEqual(alvo2.personagens[0].participacoes, []);
    });

    it('personagem existente: acrescenta livro novo e só preenche tag vazia', async () => {
        const payload = exportado();
        const alvo = destinoVazio([{ id: 800, titulo: 'Livro Ágil', sequencia: 1, tipo: '' }]);
        alvo.personagens = [
            {
                id: 900,
                nome: 'medusa',
                participacoes: [{ livroId: 800, arco: ['Minha leitura'] }],
            },
        ];
        await aplicarImportacaoAditiva(
            payload,
            classificarImportacaoAditiva(payload, alvo),
            alvo,
            deps(),
        );
        assert.equal(alvo.personagens.length, 1);
        assert.deepEqual(alvo.personagens[0].participacoes, [
            { livroId: 800, ...REL, arco: ['Minha leitura'], tropes: ['Monstro'] },
        ]);
    });
});

describe('modal do Personagem', () => {
    const campo = (id) => document.getElementById(id);
    const enviar = () =>
        campo('form-personagem').dispatchEvent(new Event('submit', { cancelable: true }));
    const cartoes = () => [...document.querySelectorAll('[data-part-livro]')];
    const opcoes = () => [...document.querySelectorAll('#per-livro-select option')];

    beforeEach(() => {
        db.livros.length = 0;
        db.personagens.length = 0;
        db.poemas.length = 0;
        db.prosas.length = 0;
        db.livros.push(
            { id: 5, titulo: 'Zênite', sequencia: 2, tipo: '' },
            { id: 6, titulo: 'Antologia', sequencia: 1, tipo: 'Coletânea' },
        );
        db.personagens.push({
            id: 1,
            nome: 'Capitu',
            participacoes: [{ livroId: 5, arco: ['Queda'] }],
        });
        U.initFormPersonagem();
    });

    it('lista os livros que ainda não foram adicionados, marcando Coletânea', async () => {
        await U.novoPersonagem();
        assert.deepEqual(
            opcoes().map((o) => o.textContent),
            ['Escolha um livro...', 'Antologia (Coletânea)', 'Zênite'],
        );
    });

    it('editar mostra a participação existente e tira o livro do seletor', async () => {
        await U.editarPersonagem(1);
        assert.equal(cartoes().length, 1);
        assert.match(cartoes()[0].textContent, /Zênite/);
        assert.match(cartoes()[0].textContent, /Queda/);
        assert.ok(!opcoes().some((o) => o.value === '5'));
    });

    it('adiciona livro, digita tags (Enter, vírgula e texto pendente) e salva', async () => {
        await U.editarPersonagem(1);
        campo('per-livro-select').value = '6';
        campo('per-livro-adicionar').click();
        assert.equal(cartoes().length, 2);

        const novo = cartoes().find((c) => c.getAttribute('data-part-livro') === '6');
        const arco = novo.querySelector('[data-part-input="arco"]');
        arco.value = 'Ascensão, Queda';
        arco.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        );
        const refeito = cartoes().find((c) => c.getAttribute('data-part-livro') === '6');
        assert.equal(refeito.querySelectorAll('[data-part-remover="arco"]').length, 2);
        refeito.querySelector('[data-part-input="tropes"]').value = 'Musa'; // sem Enter
        enviar();

        const salvo = db.personagens.find((p) => p.id === 1);
        const doNovo = salvo.participacoes.find((v) => v.livroId == 6);
        assert.deepEqual(doNovo.arco, ['Ascensão', 'Queda']);
        assert.deepEqual(doNovo.tropes, ['Musa']);
        assert.deepEqual(salvo.participacoes.find((v) => v.livroId == 5).arco, ['Queda']);
    });

    it('remover a tag e remover a participação', async () => {
        await U.editarPersonagem(1);
        document.querySelector('[data-part-remover="arco"]').click();
        assert.equal(document.querySelectorAll('[data-part-remover]').length, 0);
        document.querySelector('[data-part-excluir]').click();
        assert.equal(cartoes().length, 0);
        enviar();
        assert.deepEqual(db.personagens.find((p) => p.id === 1).participacoes, []);
    });

    it('novo personagem começa sem participações', async () => {
        await U.editarPersonagem(1);
        await U.novoPersonagem();
        assert.equal(cartoes().length, 0);
    });
});

describe('o modal do Livro não ganhou nada de personagem', () => {
    it('a análise por livro mora só no modal do Personagem', () => {
        assert.ok(!/personagem/i.test(HTML_LIVRO));
    });
});
