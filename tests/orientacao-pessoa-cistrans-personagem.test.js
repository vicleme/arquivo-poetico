import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Orientação na Pessoa (campo, ficha que viaja no JSON, mesclagem, edição em
// massa) e identidade cis/trans no Personagem (normalização, exportação e
// Importação Aditiva). Vazio quer dizer "não documentado".
document.body.innerHTML = `
    <main>
        <div id="lista-pessoas"></div>
        <span id="contagem-pessoas"></span>
        <input id="pessoas-massa-orientacao" />
    </main>
`;

const { db, migrarPessoasIdentidade, mesclarPessoas } = await import('../js/db.js');
const {
    selecaoPessoas,
    limparSelecaoPessoas,
    aplicarOrientacaoEmMassaPessoas,
    limparOrientacaoEmMassaPessoas,
} = await import('../js/pessoas-acoes.js');
const { normalizarFichaPessoa, completarPessoaComFicha } = await import('../js/pessoas-viagem.js');
const { extrairOrientacoesPessoasUnicas } = await import('../js/utils.js');
const {
    normalizarPersonagem,
    personagensParaExportar,
    importarPersonagensDoTexto,
    criarPersonagem,
} = await import('../js/personagens.js');

const $ = (id) => document.getElementById(id);
const desfazer = () =>
    [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Desfazer').at(-1);

describe('Pessoa: orientação', () => {
    beforeEach(() => {
        db.autores = [];
        db.grupos = [];
        db.pessoas = [
            { id: 1, nome: 'Ana', autorIds: [], grupoIds: [], orientacao: '' },
            { id: 2, nome: 'Bia', autorIds: [], grupoIds: [], orientacao: 'Bissexual' },
            { id: 3, nome: 'Caio', autorIds: [], grupoIds: [] },
        ];
        limparSelecaoPessoas();
        $('pessoas-massa-orientacao').value = '';
        document.querySelectorAll('button').forEach((b) => b.remove());
    });

    it('migração: texto aparado, ausente vira vazio, nada é inferido', () => {
        const lista = [{ id: 9, orientacao: '  Lésbica ' }, { id: 10 }, { id: 11, orientacao: 5 }];
        migrarPessoasIdentidade(lista);
        assert.deepEqual(
            lista.map((p) => p.orientacao),
            ['Lésbica', '', ''],
        );
    });

    it('ficha: orientação viaja como texto aparado e só preenche o que estava vazio', () => {
        assert.equal(normalizarFichaPessoa({ orientacao: '  Gay ' }).orientacao, 'Gay');
        assert.equal(normalizarFichaPessoa(null).orientacao, '');
        const vazia = { genero: '', orientacao: '' };
        assert.equal(completarPessoaComFicha(vazia, { orientacao: 'Gay' }), true);
        assert.equal(vazia.orientacao, 'Gay');
        const cheia = { orientacao: 'Bissexual' };
        completarPessoaComFicha(cheia, { orientacao: 'Gay' });
        assert.equal(cheia.orientacao, 'Bissexual');
    });

    it('mesclar: o destino mantém a dele e só preenche orientação vazia', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            pessoas: [
                { id: 1, nome: 'A', grupoIds: [], autorIds: [], orientacao: '' },
                { id: 2, nome: 'A2', grupoIds: [], autorIds: [], orientacao: 'Gay' },
                { id: 3, nome: 'B', grupoIds: [], autorIds: [], orientacao: 'Bissexual' },
                { id: 4, nome: 'B2', grupoIds: [], autorIds: [], orientacao: 'Gay' },
            ],
        };
        mesclarPessoas(dbRef, 2, 1);
        mesclarPessoas(dbRef, 4, 3);
        assert.equal(dbRef.pessoas.find((p) => p.id === 1).orientacao, 'Gay');
        assert.equal(dbRef.pessoas.find((p) => p.id === 3).orientacao, 'Bissexual');
    });

    it('sugestões: semente fixa mais o que já foi digitado nas Pessoas', () => {
        const lista = extrairOrientacoesPessoasUnicas([{ orientacao: 'Demissexual' }, {}]);
        assert.ok(lista.includes('Demissexual'));
        assert.ok(lista.includes('Heterossexual'));
    });

    it('edição em massa: substitui só nas selecionadas e "Desfazer" devolve', () => {
        selecaoPessoas.add(1);
        selecaoPessoas.add(2);
        $('pessoas-massa-orientacao').value = 'Gay';
        aplicarOrientacaoEmMassaPessoas();
        assert.deepEqual(
            db.pessoas.map((p) => p.orientacao),
            ['Gay', 'Gay', undefined],
        );
        assert.equal($('pessoas-massa-orientacao').value, '');
        desfazer().click();
        assert.deepEqual(
            db.pessoas.map((p) => p.orientacao),
            ['', 'Bissexual', undefined],
        );
    });

    it('"Limpar" apaga das selecionadas; sem seleção ou sem texto, não altera nada', () => {
        $('pessoas-massa-orientacao').value = 'Gay';
        aplicarOrientacaoEmMassaPessoas();
        selecaoPessoas.add(2);
        $('pessoas-massa-orientacao').value = '';
        aplicarOrientacaoEmMassaPessoas();
        assert.equal(db.pessoas[1].orientacao, 'Bissexual');
        limparOrientacaoEmMassaPessoas();
        assert.equal(db.pessoas[1].orientacao, '');
        desfazer().click();
        assert.equal(db.pessoas[1].orientacao, 'Bissexual');
    });
});

describe('Personagem: identidade cis/trans', () => {
    it('só aceita a lista fechada do Autor; o resto vira vazio', () => {
        assert.equal(
            normalizarPersonagem({ nome: 'X', identidadeCisTrans: 'Transgênero' })
                .identidadeCisTrans,
            'Transgênero',
        );
        assert.equal(
            normalizarPersonagem({ nome: 'X', identidadeCisTrans: 'trans' }).identidadeCisTrans,
            '',
        );
        assert.equal(normalizarPersonagem({ nome: 'X' }).identidadeCisTrans, '');
    });

    it('viaja no JSON junto do vínculo e cria o personagem com o valor na importação', () => {
        const origem = { personagens: [], livros: [] };
        const p = criarPersonagem(origem, { nome: 'Lia', identidadeCisTrans: 'Transgênero' });
        const item = { personagens: [{ personagemId: p.id, papeis: ['Voz'] }] };
        const exportado = personagensParaExportar(origem, item);
        assert.equal(exportado.personagens[0].identidadeCisTrans, 'Transgênero');

        const destino = { personagens: [], livros: [] };
        importarPersonagensDoTexto(destino, exportado);
        assert.equal(destino.personagens[0].identidadeCisTrans, 'Transgênero');
    });

    it('importação em personagem existente só preenche o que estava vazio', () => {
        const destino = { personagens: [], livros: [] };
        criarPersonagem(destino, { nome: 'Lia' });
        criarPersonagem(destino, { nome: 'Ravi', identidadeCisTrans: 'Cisgênero' });
        importarPersonagensDoTexto(destino, {
            personagens: [
                { nome: 'Lia', identidadeCisTrans: 'Transgênero', papeis: [] },
                { nome: 'Ravi', identidadeCisTrans: 'Transgênero', papeis: [] },
            ],
        });
        assert.equal(destino.personagens[0].identidadeCisTrans, 'Transgênero');
        assert.equal(destino.personagens[1].identidadeCisTrans, 'Cisgênero');
    });
});
