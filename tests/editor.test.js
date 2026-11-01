import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Esqueleto mínimo de DOM que o módulo de Pessoas do editor precisa
// (input + container de chips + painel somente-leitura de Grupos, ver
// modal-poema.html/modal-prosa.html) — precisa existir ANTES do import,
// mesmo motivo do render-dom.test.js. Inclui também os campos de
// Intertextualidade (tipo/texto/link/linkTexto/nota + lista), poema e
// prosa, pra cobrir os campos de link/linkTexto/nota (ver
// modal-poema.html/modal-prosa.html).
document.body.innerHTML = `
    <div id="p-pessoa-input-wrapper">
        <input id="p-pessoa-input" />
        <div id="p-pessoas-container"></div>
        <div id="p-pessoas-grupos-info"></div>
    </div>
    <input id="p-grupo-direto-input" />
    <div id="p-grupos-diretos-container"></div>
    <input id="pr-grupo-direto-input" />
    <div id="pr-grupos-diretos-container"></div>
    <input id="p-intertexto-tipo" />
    <input id="p-intertexto-obra" />
    <input id="p-intertexto-relacao" />
    <input id="p-intertexto-autor" />
    <input id="p-intertexto-personagem" />
    <div id="p-intertexto-personagem-chips"></div>
    <input id="p-intertexto-descricao" />
    <textarea id="p-intertexto-trecho"></textarea>
    <input type="checkbox" id="p-intertexto-traduzido" />
    <input id="p-intertexto-link" />
    <input id="p-intertexto-link-texto" />
    <input id="p-intertexto-nota" />
    <button id="p-intertexto-btn-add"></button>
    <button id="p-intertexto-btn-cancelar" class="hidden"></button>
    <div id="p-intertexto-lista"></div>
    <input id="p-hipertexto-relacao" />
    <input id="p-hipertexto-tipo" />
    <input id="p-hipertexto-hipotexto" />
    <input id="p-hipertexto-autor" />
    <input id="p-hipertexto-descricao" />
    <input id="p-hipertexto-link" />
    <input id="p-hipertexto-link-texto" />
    <input id="p-hipertexto-data-acesso" />
    <textarea id="p-hipertexto-nota"></textarea>
    <button id="p-hipertexto-btn-add"></button>
    <button id="p-hipertexto-btn-cancelar" class="hidden"></button>
    <div id="p-hipertexto-lista"></div>
    <input id="pr-intertexto-tipo" />
    <input id="pr-intertexto-obra" />
    <input id="pr-intertexto-relacao" />
    <input id="pr-intertexto-autor" />
    <input id="pr-intertexto-personagem" />
    <div id="pr-intertexto-personagem-chips"></div>
    <input id="pr-intertexto-descricao" />
    <textarea id="pr-intertexto-trecho"></textarea>
    <input type="checkbox" id="pr-intertexto-traduzido" />
    <input id="pr-intertexto-link" />
    <input id="pr-intertexto-link-texto" />
    <input id="pr-intertexto-nota" />
    <button id="pr-intertexto-btn-add"></button>
    <button id="pr-intertexto-btn-cancelar" class="hidden"></button>
    <div id="pr-intertexto-lista"></div>
    <input id="p-refext-tipo" />
    <input id="p-refext-texto" />
    <input id="p-refext-link" />
    <input id="p-refext-link-texto" />
    <input id="p-refext-nota" />
    <button id="p-refext-btn-add"></button>
    <button id="p-refext-btn-cancelar" class="hidden"></button>
    <div id="p-refext-lista"></div>
    <input id="pr-refext-tipo" />
    <input id="pr-refext-texto" />
    <input id="pr-refext-link" />
    <input id="pr-refext-link-texto" />
    <input id="pr-refext-nota" />
    <button id="pr-refext-btn-add"></button>
    <button id="pr-refext-btn-cancelar" class="hidden"></button>
    <div id="pr-refext-lista"></div>
    <div id="pr-sinalizacoes-corpo"></div>
`;

const { db } = await import('../js/db.js');
const { adicionarPessoa, removerPessoa, resetPessoas, carregarPessoas, obterPessoas } =
    await import('../js/editor.js');
const {
    adicionarGrupoDireto,
    removerGrupoDireto,
    resetGruposDiretos,
    carregarGruposDiretos,
    obterGruposDiretos,
} = await import('../js/editor.js');
const {
    adicionarIntertexto,
    editarIntertexto,
    cancelarEdicaoIntertexto,
    obterIntertextualidade,
    carregarIntertextualidade,
    resetIntertextualidade,
} = await import('../js/editor.js');
const { renderSinalizacoesProsa, initEditorProsa, editarSinalRelacao } =
    await import('../js/editor.js');
const { adicionarAutoria, resetAutoria } = await import('../js/editor.js');
const {
    adicionarHipertextualidade,
    editarHipertextualidade,
    cancelarEdicaoHipertextualidade,
    obterHipertextualidade,
    carregarHipertextualidade,
    resetHipertextualidade,
    autoresDoFormulario: campoAutores,
} = await import('../js/editor.js');

function limparDb() {
    db.pessoas.length = 0;
    db.grupos.length = 0;
    document.getElementById('modal-confirmar-exclusao')?.remove();
    resetPessoas('poemas');
    resetGruposDiretos('poemas');
    resetGruposDiretos('prosas');
}

// Desde 27/09/2026, criar um Grupo novo via chip exige saber de qual
// Autor ele é (Grupo passou a pertencer a um Autor — ver
// criarGrupoDeGruposDiretos em editor.js), então os testes de "Grupos
// referenciados diretamente" precisam de um Autor já adicionado ao
// texto antes de cada caso. adicionarAutoria aceita o nome direto
// (sem precisar de input no DOM) e, como o autor já existe em
// db.autores, entra sem passar pelo modal de confirmação.
function limparDbComAutor() {
    limparDb();
    db.autores.length = 0;
    db.autores.push({ id: 1, nome: 'Victor Leme', sobre: '' });
    resetAutoria('poemas');
    resetAutoria('prosas');
    adicionarAutoria('poemas', 'Victor Leme');
    adicionarAutoria('prosas', 'Victor Leme');
}

describe('Criação de pessoa nova via chip (editor.js, DOM real)', () => {
    beforeEach(limparDb);

    it('nome que bate com pessoa já cadastrada reaproveita o id direto, sem pedir confirmação', () => {
        db.pessoas.push({ id: 1, nome: 'Ana', grupoIds: [] });

        adicionarPessoa('poemas', 'Ana');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.deepEqual(obterPessoas('poemas'), [{ pessoaId: 1, papeis: [] }]);
        assert.equal(db.pessoas.length, 1, 'não deveria duplicar a pessoa existente');
    });

    it('nome sem correspondência pede confirmação antes de criar — cancelar não cria nada', () => {
        adicionarPessoa('poemas', 'Beatriz');

        const overlay = document.getElementById('modal-confirmar-exclusao');
        assert.ok(overlay, 'deveria abrir o modal de confirmação de pessoa nova');
        assert.match(document.getElementById('excl-titulo').textContent, /Beatriz/);

        document.getElementById('excl-cancelar').click();

        assert.equal(db.pessoas.length, 0);
        assert.deepEqual(obterPessoas('poemas'), []);
    });

    it('nome sem correspondência, ao confirmar, cria a pessoa no cadastro central sem grupo e gera o chip', () => {
        adicionarPessoa('poemas', 'Carla');

        document.getElementById('excl-confirmar').click();

        assert.equal(db.pessoas.length, 1);
        const criada = db.pessoas[0];
        assert.equal(criada.nome, 'Carla');
        assert.deepEqual(criada.grupoIds, [], 'pessoa nova via chip não vem com grupo atribuído');

        assert.deepEqual(obterPessoas('poemas'), [{ pessoaId: criada.id, papeis: [] }]);
        assert.match(
            document.getElementById('p-pessoas-container').textContent,
            /Carla/,
            'o chip da pessoa recém-criada deveria aparecer no container',
        );
    });

    it('adicionar a mesma pessoa duas vezes não duplica o chip', () => {
        db.pessoas.push({ id: 5, nome: 'Duda', grupoIds: [] });

        adicionarPessoa('poemas', 'Duda');
        adicionarPessoa('poemas', 'Duda');

        assert.equal(obterPessoas('poemas').length, 1);
    });

    it('remover um chip tira a pessoa da lista de itens, sem afetar o cadastro central', () => {
        db.pessoas.push({ id: 9, nome: 'Elis', grupoIds: [] });
        adicionarPessoa('poemas', 'Elis');

        removerPessoa('poemas', 9);

        assert.deepEqual(obterPessoas('poemas'), []);
        assert.equal(db.pessoas.length, 1, 'remover o chip não remove a pessoa do cadastro');
    });

    it('input com espaços/vazio não gera pessoa nem confirmação', () => {
        adicionarPessoa('poemas', '   ');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.equal(db.pessoas.length, 0);
        assert.deepEqual(obterPessoas('poemas'), []);
    });
});

describe('Painel somente-leitura de Grupos embaixo dos chips (editor.js, DOM real)', () => {
    beforeEach(limparDb);

    it('some (fica vazio) quando nenhuma pessoa selecionada está em grupo', () => {
        db.pessoas.push({ id: 1, nome: 'Fábio', grupoIds: [] });
        carregarPessoas('poemas', [{ pessoaId: 1, papeis: [] }]);

        assert.equal(document.getElementById('p-pessoas-grupos-info').innerHTML, '');
    });

    it('mostra "Grupo (Pessoa)" pra cada grupo que a pessoa selecionada pertence', () => {
        db.grupos.push({ id: 10, nome: 'Namorado', cor: 'blue' });
        db.pessoas.push({ id: 1, nome: 'Dalton', grupoIds: [10] });
        carregarPessoas('poemas', [{ pessoaId: 1, papeis: [] }]);

        const texto = document.getElementById('p-pessoas-grupos-info').textContent;
        assert.match(texto, /Namorado/);
        assert.match(texto, /Dalton/);
    });

    it('pessoa em mais de um grupo gera um badge por grupo, não uma linha combinada', () => {
        db.grupos.push(
            { id: 10, nome: 'Namorado', cor: 'blue' },
            { id: 11, nome: 'Ex-namorado', cor: 'amber' },
        );
        db.pessoas.push({ id: 1, nome: 'Pedro', grupoIds: [10, 11] });
        carregarPessoas('poemas', [{ pessoaId: 1, papeis: [] }]);

        const badges = document
            .getElementById('p-pessoas-grupos-info')
            .querySelectorAll('span span');
        // Um <span> de nome+grupo por par — 2 grupos = 2 badges com "(Pedro)".
        const comPedro = Array.from(badges).filter((s) => /Pedro/.test(s.textContent));
        assert.equal(comPedro.length, 2);
    });

    it('painel some de novo ao remover a pessoa que trazia o único grupo', () => {
        db.grupos.push({ id: 10, nome: 'Amigos', cor: 'emerald' });
        db.pessoas.push({ id: 1, nome: 'Gustavo', grupoIds: [10] });
        carregarPessoas('poemas', [{ pessoaId: 1, papeis: [] }]);

        assert.notEqual(document.getElementById('p-pessoas-grupos-info').innerHTML, '');

        removerPessoa('poemas', 1);

        assert.equal(document.getElementById('p-pessoas-grupos-info').innerHTML, '');
    });
});

// ─── Grupos referenciados diretamente (sem citar uma pessoa em particular) ──
// Complementa o painel somente-leitura acima: o texto se refere ao grupo
// em geral, não a alguém dele específico (ver criarGrupoDeGruposDiretos
// em editor.js). Mesmo padrão de confirmação de "criar na hora" que
// Pessoa usa (ver describe acima), variante mais simples: sem papéis,
// sem dropdown.

describe('Grupos referenciados diretamente via chip (editor.js, DOM real)', () => {
    beforeEach(limparDbComAutor);

    it('nome que bate com grupo já cadastrado reaproveita o id direto, sem pedir confirmação', () => {
        db.grupos.push({ id: 10, nome: 'Família', cor: 'blue', autorId: 1 });

        adicionarGrupoDireto('poemas', 'Família');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.deepEqual(obterGruposDiretos('poemas'), [10]);
        assert.equal(db.grupos.length, 1, 'não deveria duplicar o grupo existente');
    });

    it('nome sem correspondência pede confirmação antes de criar — cancelar não cria nada', () => {
        adicionarGrupoDireto('poemas', 'Coletivo Novo');

        const overlay = document.getElementById('modal-confirmar-exclusao');
        assert.ok(overlay, 'deveria abrir o modal de confirmação de grupo novo');
        assert.match(document.getElementById('excl-titulo').textContent, /Coletivo Novo/);

        document.getElementById('excl-cancelar').click();

        assert.equal(db.grupos.length, 0);
        assert.deepEqual(obterGruposDiretos('poemas'), []);
    });

    it('nome sem correspondência, ao confirmar, cria o grupo no cadastro central com cor padrão e gera o chip', () => {
        adicionarGrupoDireto('poemas', 'Coletivo Novo');

        document.getElementById('excl-confirmar').click();

        assert.equal(db.grupos.length, 1);
        const criado = db.grupos[0];
        assert.equal(criado.nome, 'Coletivo Novo');
        assert.ok(criado.cor, 'grupo novo via chip deveria vir com uma cor padrão');
        assert.equal(criado.autorId, 1, 'grupo novo via chip deveria herdar o Autor do texto');

        assert.deepEqual(obterGruposDiretos('poemas'), [criado.id]);
        assert.match(
            document.getElementById('p-grupos-diretos-container').textContent,
            /Coletivo Novo/,
            'o chip do grupo recém-criado deveria aparecer no container',
        );
    });

    it('adicionar o mesmo grupo duas vezes não duplica o chip', () => {
        db.grupos.push({ id: 20, nome: 'Trabalho', cor: 'emerald', autorId: 1 });

        adicionarGrupoDireto('poemas', 'Trabalho');
        adicionarGrupoDireto('poemas', 'Trabalho');

        assert.equal(obterGruposDiretos('poemas').length, 1);
    });

    it('remover um chip tira o grupo da lista de itens, sem afetar o cadastro central', () => {
        db.grupos.push({ id: 30, nome: 'Faculdade', cor: 'amber', autorId: 1 });
        adicionarGrupoDireto('poemas', 'Faculdade');

        removerGrupoDireto('poemas', 30);

        assert.deepEqual(obterGruposDiretos('poemas'), []);
        assert.equal(db.grupos.length, 1, 'remover o chip não remove o grupo do cadastro');
    });

    it('input com espaços/vazio não gera grupo nem confirmação', () => {
        adicionarGrupoDireto('poemas', '   ');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.equal(db.grupos.length, 0);
        assert.deepEqual(obterGruposDiretos('poemas'), []);
    });

    it('carregar/resetar preenche e limpa os chips (ida e volta pelo formulário)', () => {
        db.grupos.push({ id: 40, nome: 'Vizinhança', cor: 'rose' });

        carregarGruposDiretos('poemas', [40]);
        assert.deepEqual(obterGruposDiretos('poemas'), [40]);
        assert.match(
            document.getElementById('p-grupos-diretos-container').textContent,
            /Vizinhança/,
        );

        resetGruposDiretos('poemas');
        assert.deepEqual(obterGruposDiretos('poemas'), []);
        assert.equal(document.getElementById('p-grupos-diretos-container').innerHTML, '');
    });

    it('a variante de Prosa é independente da de Poema (containers e estado próprios)', () => {
        db.grupos.push({ id: 50, nome: 'Editora', cor: 'sky', autorId: 1 });

        adicionarGrupoDireto('prosas', 'Editora');

        assert.deepEqual(obterGruposDiretos('prosas'), [50]);
        assert.deepEqual(obterGruposDiretos('poemas'), [], 'não deveria vazar pro estado de Poema');
        assert.match(document.getElementById('pr-grupos-diretos-container').textContent, /Editora/);
        assert.equal(document.getElementById('p-grupos-diretos-container').innerHTML, '');

        removerGrupoDireto('prosas', 50);
        assert.deepEqual(obterGruposDiretos('prosas'), []);
    });

    it("carregarGruposDiretos('prosas', ...) restaura o array salvo, sem vazar pro estado de Poema", () => {
        carregarGruposDiretos('prosas', [50]);
        assert.deepEqual(obterGruposDiretos('prosas'), [50]);
        assert.deepEqual(obterGruposDiretos('poemas'), []);
    });
});

// ─── Intertextualidade — campos de link, linkTexto e nota (Poema) ─────
// item.tipo + item.texto já existiam; link e nota vieram depois; linkTexto
// é o rótulo opcional do link (evita estouro de URL longa na lista
// renderizada — cai pra URL crua quando vazio), espelhando o padrão
// tipo+texto+link que Anexos já usa (ver editor.js).

function limparIntertextoPoema() {
    document.getElementById('p-intertexto-tipo').value = '';
    document.getElementById('p-intertexto-obra').value = '';
    document.getElementById('p-intertexto-link').value = '';
    document.getElementById('p-intertexto-link-texto').value = '';
    document.getElementById('p-intertexto-nota').value = '';
    document.getElementById('p-intertexto-traduzido').checked = false;
    resetIntertextualidade('poemas');
}

describe('Intertextualidade — link, linkTexto e nota (Poema, editor.js, DOM real)', () => {
    beforeEach(limparIntertextoPoema);

    it('adicionarIntertexto salva tipo, texto, link, linkTexto e nota juntos', () => {
        document.getElementById('p-intertexto-tipo').value = 'Citação';
        document.getElementById('p-intertexto-obra').value = 'Trecho citado';
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com/obra';
        document.getElementById('p-intertexto-link-texto').value = 'Site da obra';
        document.getElementById('p-intertexto-nota').value = 'Nota livre sobre a referência';

        adicionarIntertexto('poemas');

        assert.deepEqual(obterIntertextualidade('poemas'), [
            {
                relacao: '',
                tipoObra: 'Citação',
                obra: 'Trecho citado',
                autores: [],
                personagens: [],
                descricao: '',
                trecho: '',
                traduzido: false,
                link: 'https://exemplo.com/obra',
                linkTexto: 'Site da obra',
                nota: 'Nota livre sobre a referência',
            },
        ]);
    });

    it('limpa os 5 campos depois de adicionar', () => {
        document.getElementById('p-intertexto-obra').value = 'Algo';
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com';
        document.getElementById('p-intertexto-link-texto').value = 'Rótulo';
        document.getElementById('p-intertexto-nota').value = 'Nota';

        adicionarIntertexto('poemas');

        assert.equal(document.getElementById('p-intertexto-tipo').value, '');
        assert.equal(document.getElementById('p-intertexto-obra').value, '');
        assert.equal(document.getElementById('p-intertexto-link').value, '');
        assert.equal(document.getElementById('p-intertexto-link-texto').value, '');
        assert.equal(document.getElementById('p-intertexto-nota').value, '');
    });

    it('link e nota sozinhos (sem tipo nem texto) já bastam pra adicionar a entrada', () => {
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com';

        adicionarIntertexto('poemas');

        assert.equal(obterIntertextualidade('poemas').length, 1);
    });

    it('não adiciona nada se os 5 campos estiverem vazios', () => {
        adicionarIntertexto('poemas');
        assert.deepEqual(obterIntertextualidade('poemas'), []);
    });

    it('editarIntertexto repopula tipo, texto, link, linkTexto e nota do item selecionado', () => {
        document.getElementById('p-intertexto-obra').value = 'Original';
        document.getElementById('p-intertexto-link').value = 'https://original.com';
        document.getElementById('p-intertexto-link-texto').value = 'Rótulo original';
        document.getElementById('p-intertexto-nota').value = 'Nota original';
        adicionarIntertexto('poemas');

        editarIntertexto('poemas', 0);

        assert.equal(document.getElementById('p-intertexto-obra').value, 'Original');
        assert.equal(document.getElementById('p-intertexto-link').value, 'https://original.com');
        assert.equal(document.getElementById('p-intertexto-link-texto').value, 'Rótulo original');
        assert.equal(document.getElementById('p-intertexto-nota').value, 'Nota original');
    });

    it('cancelarEdicaoIntertexto limpa os 5 campos sem alterar a lista', () => {
        document.getElementById('p-intertexto-obra').value = 'Original';
        adicionarIntertexto('poemas');
        editarIntertexto('poemas', 0);

        document.getElementById('p-intertexto-nota').value = 'Rascunho descartado';
        cancelarEdicaoIntertexto('poemas');

        assert.equal(document.getElementById('p-intertexto-nota').value, '');
        assert.equal(obterIntertextualidade('poemas').length, 1);
        assert.equal(obterIntertextualidade('poemas')[0].obra, 'Original');
    });

    it('sem linkTexto, a lista renderizada mostra a URL crua como texto do <a>', () => {
        document.getElementById('p-intertexto-obra').value = 'Trecho';
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com/pagina';
        document.getElementById('p-intertexto-nota').value = 'Comentário à parte';

        adicionarIntertexto('poemas');

        const html = document.getElementById('p-intertexto-lista').innerHTML;
        assert.match(
            html,
            /<a href="https:\/\/exemplo\.com\/pagina"[^>]*>https:\/\/exemplo\.com\/pagina<\/a>/,
        );
        assert.match(html, /Comentário à parte/);
    });

    it('com linkTexto preenchido, a lista renderizada usa o rótulo no lugar da URL crua', () => {
        document.getElementById('p-intertexto-tipo').value = 'Notícias';
        document.getElementById('p-intertexto-link').value =
            'https://g1.globo.com/pe/pernambuco/noticia/2020/06/19/algum-slug-bem-longo.ghtml';
        document.getElementById('p-intertexto-link-texto').value = 'G1 Pernambuco';

        adicionarIntertexto('poemas');

        const html = document.getElementById('p-intertexto-lista').innerHTML;
        assert.match(
            html,
            /<a href="https:\/\/g1\.globo\.com\/pe\/pernambuco\/noticia\/2020\/06\/19\/algum-slug-bem-longo\.ghtml"[^>]*>G1 Pernambuco<\/a>/,
        );
        assert.ok(!html.includes('>https://g1.globo.com'));
    });

    it('o <a> renderizado tem a classe break-all, pra URL longa quebrar em vez de estourar', () => {
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com/pagina-longa';

        adicionarIntertexto('poemas');

        const html = document.getElementById('p-intertexto-lista').innerHTML;
        assert.match(html, /class="[^"]*break-all[^"]*"/);
    });
});

// ─── Intertextualidade — link, linkTexto e nota (Prosa) ────────────────
// Mesmo comportamento acima, na versão de Prosa (funções com sufixo
// "Prosa" e ids prefixados "pr-").

function limparIntertextoProsa() {
    document.getElementById('pr-intertexto-tipo').value = '';
    document.getElementById('pr-intertexto-obra').value = '';
    document.getElementById('pr-intertexto-link').value = '';
    document.getElementById('pr-intertexto-link-texto').value = '';
    document.getElementById('pr-intertexto-nota').value = '';
    resetIntertextualidade('prosas');
}

describe('Intertextualidade — link, linkTexto e nota (Prosa, editor.js, DOM real)', () => {
    beforeEach(limparIntertextoProsa);

    it('adicionarIntertexto(prosas) salva tipo, texto, link, linkTexto e nota juntos', () => {
        document.getElementById('pr-intertexto-tipo').value = 'Alusão';
        document.getElementById('pr-intertexto-obra').value = 'Trecho aludido';
        document.getElementById('pr-intertexto-link').value = 'https://exemplo.com/prosa';
        document.getElementById('pr-intertexto-link-texto').value = 'Rótulo prosa';
        document.getElementById('pr-intertexto-nota').value = 'Nota sobre a prosa';

        adicionarIntertexto('prosas');

        assert.deepEqual(obterIntertextualidade('prosas'), [
            {
                relacao: '',
                tipoObra: 'Alusão',
                obra: 'Trecho aludido',
                autores: [],
                personagens: [],
                descricao: '',
                trecho: '',
                traduzido: false,
                link: 'https://exemplo.com/prosa',
                linkTexto: 'Rótulo prosa',
                nota: 'Nota sobre a prosa',
            },
        ]);
    });

    it('editarIntertexto(prosas) repopula tipo, texto, link, linkTexto e nota do item selecionado', () => {
        document.getElementById('pr-intertexto-obra').value = 'Original';
        document.getElementById('pr-intertexto-link').value = 'https://original.com';
        document.getElementById('pr-intertexto-link-texto').value = 'Rótulo original';
        document.getElementById('pr-intertexto-nota').value = 'Nota original';
        adicionarIntertexto('prosas');

        editarIntertexto('prosas', 0);

        assert.equal(document.getElementById('pr-intertexto-obra').value, 'Original');
        assert.equal(document.getElementById('pr-intertexto-link').value, 'https://original.com');
        assert.equal(document.getElementById('pr-intertexto-link-texto').value, 'Rótulo original');
        assert.equal(document.getElementById('pr-intertexto-nota').value, 'Nota original');
    });

    it('cancelarEdicaoIntertexto(prosas) limpa os 5 campos sem alterar a lista', () => {
        document.getElementById('pr-intertexto-obra').value = 'Original';
        adicionarIntertexto('prosas');
        editarIntertexto('prosas', 0);

        document.getElementById('pr-intertexto-nota').value = 'Rascunho descartado';
        cancelarEdicaoIntertexto('prosas');

        assert.equal(document.getElementById('pr-intertexto-nota').value, '');
        assert.equal(obterIntertextualidade('prosas').length, 1);
    });

    it('sem linkTexto, a lista renderizada mostra a URL crua como texto do <a>', () => {
        document.getElementById('pr-intertexto-obra').value = 'Trecho';
        document.getElementById('pr-intertexto-link').value = 'https://exemplo.com/pagina-prosa';
        document.getElementById('pr-intertexto-nota').value = 'Comentário de prosa';

        adicionarIntertexto('prosas');

        const html = document.getElementById('pr-intertexto-lista').innerHTML;
        assert.match(
            html,
            /<a href="https:\/\/exemplo\.com\/pagina-prosa"[^>]*>https:\/\/exemplo\.com\/pagina-prosa<\/a>/,
        );
        assert.match(html, /Comentário de prosa/);
    });

    it('com linkTexto preenchido, a lista renderizada usa o rótulo no lugar da URL crua', () => {
        document.getElementById('pr-intertexto-link').value =
            'https://exemplo.com/pagina-prosa-bem-longa-que-normalmente-estouraria';
        document.getElementById('pr-intertexto-link-texto').value = 'Fonte da prosa';

        adicionarIntertexto('prosas');

        const html = document.getElementById('pr-intertexto-lista').innerHTML;
        assert.match(html, />Fonte da prosa<\/a>/);
        assert.ok(!html.includes('>https://exemplo.com/pagina-prosa-bem-longa'));
    });
});

describe('Enter nos campos de Sinalizações da Prosa não depende do modal de Poema (editor.js, DOM real)', () => {
    // Item 4 do plano de manutenibilidade: funcoesSinalProsa (e o
    // wiring de Enter que a usa) vivia dentro de initEditor(), que só é
    // chamado pelo init do modal-poema (main.js). Se o modal de Prosa
    // fosse aberto primeiro numa sessão, initEditor() nunca rodava e
    // Enter nesses campos não fazia nada (só o botão "+" funcionava).
    // initEditorProsa() foi extraído justamente pra não depender disso
    // — este teste simula o cenário do bug: renderiza o corpo de
    // Sinalizações da Prosa e chama só initEditorProsa(), sem nunca
    // chamar initEditor().
    renderSinalizacoesProsa();
    initEditorProsa();

    function pressionarEnter(input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }

    it('Enter em Tradição (categoria comum) adiciona a etiqueta sem initEditor() ter rodado', () => {
        const input = document.getElementById('pr-sinal-tradicao-input');
        input.value = 'Soneto';

        pressionarEnter(input);

        assert.match(
            document.getElementById('pr-sinal-tradicao-container').innerHTML,
            />\s*Soneto\s*</,
        );
        assert.equal(input.value, '', 'input deveria limpar após adicionar');
    });

    it('Enter em Domínio Imagético (categoria que já teve o bug do TypeError) adiciona a etiqueta sem lançar', () => {
        const input = document.getElementById('pr-sinal-dominioImagetico-input');
        input.value = 'Astrologia';

        assert.doesNotThrow(() => pressionarEnter(input));

        assert.match(
            document.getElementById('pr-sinal-dominioImagetico-container').innerHTML,
            />\s*Astrologia\s*</,
        );
    });
});

describe('editar etiqueta de Sinalizações (editor.js, DOM real)', () => {
    // Clicar em "editar" numa etiqueta existente tira ela da lista e
    // devolve o texto pro input, pronto pra corrigir — sem estado de
    // "em edição" (diferente de Intertextualidade/Anexos): reaproveita
    // o próprio fluxo de adicionar pra salvar a correção.
    renderSinalizacoesProsa();
    initEditorProsa();

    function pressionarEnter(input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }

    it('editar tira a etiqueta do container e devolve o texto pro input', () => {
        const input = document.getElementById('pr-sinal-relacao-input');
        input.value = 'Sonto';
        pressionarEnter(input);
        assert.match(
            document.getElementById('pr-sinal-relacao-container').innerHTML,
            />\s*Sonto\s*</,
        );

        editarSinalRelacao('prosas', 'Sonto');

        assert.equal(input.value, 'Sonto', 'input deveria receber o texto da etiqueta editada');
        assert.doesNotMatch(
            document.getElementById('pr-sinal-relacao-container').innerHTML,
            />\s*Sonto\s*</,
            'etiqueta original deveria sair do container ao entrar em edição',
        );
    });

    it('corrigir e apertar Enter de novo salva o texto corrigido', () => {
        const input = document.getElementById('pr-sinal-relacao-input');
        input.value = 'Sonto';
        pressionarEnter(input);

        editarSinalRelacao('prosas', 'Sonto');
        input.value = 'Soneto';
        pressionarEnter(input);

        assert.match(
            document.getElementById('pr-sinal-relacao-container').innerHTML,
            />\s*Soneto\s*</,
        );
        assert.doesNotMatch(
            document.getElementById('pr-sinal-relacao-container').innerHTML,
            />\s*Sonto\s*</,
        );
        assert.equal(input.value, '', 'input deveria limpar após salvar a correção');
    });
});

describe('Intertextualidade: campos novos (relação, autor, personagem, descrição, trecho, traduzido)', () => {
    beforeEach(limparIntertextoPoema);

    it('adicionarIntertexto salva os campos novos e limpa o formulário', () => {
        const v = (id, valor) => {
            document.getElementById(id).value = valor;
        };
        v('p-intertexto-relacao', 'Citação');
        v('p-intertexto-tipo', 'Livro');
        v('p-intertexto-obra', 'Dom Casmurro');
        v('p-intertexto-autor', 'Machado de Assis');
        v('p-intertexto-personagem', 'Capitu');
        v('p-intertexto-descricao', 'romance de 1899');
        v('p-intertexto-trecho', 'Capitu era Capitu');
        document.getElementById('p-intertexto-traduzido').checked = true;

        adicionarIntertexto('poemas');

        const [e] = obterIntertextualidade('poemas');
        assert.equal(e.relacao, 'Citação');
        assert.equal(e.tipoObra, 'Livro');
        assert.equal(e.obra, 'Dom Casmurro');
        assert.deepEqual(e.autores, ['Machado de Assis']);
        assert.ok(!('autor' in e));
        assert.deepEqual(e.personagens, ['Capitu']);
        assert.ok(!('personagem' in e));
        assert.equal(e.descricao, 'romance de 1899');
        assert.equal(e.trecho, 'Capitu era Capitu');
        assert.equal(e.traduzido, true);
        assert.equal(document.getElementById('p-intertexto-autor').value, '');
        assert.equal(document.getElementById('p-intertexto-traduzido').checked, false);
        assert.ok(!('tipo' in e) && !('texto' in e));
    });

    it('só marcar Traduzido não basta para adicionar uma entrada', () => {
        document.getElementById('p-intertexto-traduzido').checked = true;
        adicionarIntertexto('poemas');
        assert.deepEqual(obterIntertextualidade('poemas'), []);
    });

    it('editarIntertexto repopula os campos novos', () => {
        document.getElementById('p-intertexto-obra').value = 'Medusa';
        document.getElementById('p-intertexto-relacao').value = 'Alusão';
        document.getElementById('p-intertexto-personagem').value = 'Medusa';
        document.getElementById('p-intertexto-traduzido').checked = true;
        adicionarIntertexto('poemas');

        editarIntertexto('poemas', 0);

        assert.equal(document.getElementById('p-intertexto-relacao').value, 'Alusão');
        assert.equal(document.getElementById('p-intertexto-personagem').value, '');
        assert.match(
            document.getElementById('p-intertexto-personagem-chips').textContent,
            /Medusa/,
        );
        assert.equal(document.getElementById('p-intertexto-traduzido').checked, true);
    });

    it('entrada no formato antigo (tipo e texto) abre no formato novo ao ser carregada', () => {
        carregarIntertextualidade('poemas', [{ tipo: 'Música', texto: 'Construção' }]);
        const [e] = obterIntertextualidade('poemas');
        assert.equal(e.tipoObra, 'Música');
        assert.equal(e.obra, 'Construção');
        assert.equal(e.relacao, '');
        assert.match(document.getElementById('p-intertexto-lista').innerHTML, /Construção/);
    });
});

describe('Hipertextualidade: tipo de obra, autor e descrição (Poema, editor.js, DOM real)', () => {
    const v = (id, valor) => {
        document.getElementById(`p-hipertexto-${id}`).value = valor;
    };
    beforeEach(() => {
        [
            'relacao',
            'tipo',
            'hipotexto',
            'autor',
            'descricao',
            'link',
            'link-texto',
            'nota',
        ].forEach((id) => v(id, ''));
        resetHipertextualidade('poemas');
    });

    it('adicionarHipertextualidade salva no formato novo e limpa o formulário', () => {
        v('relacao', 'Paródia');
        v('tipo', 'Poema');
        v('hipotexto', 'Canção do Exílio');
        v('autor', 'Gonçalves Dias');
        v('descricao', 'poema de 1843');
        v('nota', 'inverte o tom');

        adicionarHipertextualidade('poemas');

        assert.deepEqual(obterHipertextualidade('poemas'), [
            {
                relacao: 'Paródia',
                hipotexto: 'Canção do Exílio',
                tipoObra: 'Poema',
                autores: ['Gonçalves Dias'],
                descricao: 'poema de 1843',
                link: '',
                linkTexto: '',
                nota: 'inverte o tom',
            },
        ]);
        assert.equal(document.getElementById('p-hipertexto-autor').value, '');
        assert.equal(document.getElementById('p-hipertexto-tipo').value, '');
    });

    it('não adiciona nada com o formulário vazio', () => {
        adicionarHipertextualidade('poemas');
        assert.deepEqual(obterHipertextualidade('poemas'), []);
    });

    it('editarHipertextualidade repopula autor, descrição e tipo de obra; cancelar limpa', () => {
        v('hipotexto', 'X');
        v('autor', 'Fulano');
        v('descricao', 'desc');
        v('tipo', 'Livro');
        adicionarHipertextualidade('poemas');

        editarHipertextualidade('poemas', 0);
        assert.deepEqual(campoAutores('poemas', 'hipertexto'), ['Fulano']);
        assert.equal(document.getElementById('p-hipertexto-descricao').value, 'desc');
        assert.equal(document.getElementById('p-hipertexto-tipo').value, 'Livro');

        cancelarEdicaoHipertextualidade('poemas');
        assert.equal(document.getElementById('p-hipertexto-autor').value, '');
        assert.equal(obterHipertextualidade('poemas').length, 1);
    });

    it('entrada antiga (tipo) abre no formato novo ao ser carregada', () => {
        carregarHipertextualidade('poemas', [
            { tipo: 'Filme', relacao: 'Homenagem', hipotexto: 'Y' },
        ]);
        const [e] = obterHipertextualidade('poemas');
        assert.equal(e.tipoObra, 'Filme');
        assert.deepEqual(e.autores, []);
        assert.ok(!('autor' in e) && !('tipo' in e));
        assert.match(document.getElementById('p-hipertexto-lista').innerHTML, /Filme/);
    });
});

describe('Descrição repetida para a mesma obra (Intertextualidade, Prosa, editor.js, DOM real)', () => {
    initEditorProsa();
    const v = (id, valor) => {
        document.getElementById(`pr-intertexto-${id}`).value = valor;
    };
    const mudou = (id) =>
        document
            .getElementById(`pr-intertexto-${id}`)
            .dispatchEvent(new window.Event('change', { bubbles: true }));
    beforeEach(() => {
        limparIntertextoProsa();
        v('descricao', '');
        db.prosas.length = 0;
    });

    it('preenche a descrição vazia quando a obra e o autor já têm uma só', () => {
        db.prosas.push({
            id: 1,
            intertextualidade: [
                {
                    tipoObra: 'Livro',
                    obra: 'Dom Casmurro',
                    autor: 'Machado',
                    descricao: 'romance de 1899',
                },
            ],
        });
        v('tipo', 'Livro');
        v('obra', 'Dom Casmurro');
        v('autor', 'Machado');
        mudou('autor');
        assert.equal(document.getElementById('pr-intertexto-descricao').value, 'romance de 1899');
    });

    it('não sobrescreve uma descrição já digitada', () => {
        db.prosas.push({
            id: 1,
            intertextualidade: [{ tipoObra: 'Livro', obra: 'Dom Casmurro', descricao: 'romance' }],
        });
        v('obra', 'Dom Casmurro');
        v('descricao', 'minha versão');
        mudou('obra');
        assert.equal(document.getElementById('pr-intertexto-descricao').value, 'minha versão');
    });

    it('com duas descrições diferentes, não preenche sozinho', () => {
        db.prosas.push({
            id: 1,
            intertextualidade: [
                { tipoObra: 'Livro', obra: 'X', descricao: 'a' },
                { tipoObra: 'Livro', obra: 'X', descricao: 'b' },
            ],
        });
        v('obra', 'X');
        mudou('obra');
        assert.equal(document.getElementById('pr-intertexto-descricao').value, '');
    });
});
