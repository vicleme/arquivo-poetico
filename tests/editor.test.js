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
    <input id="p-intertexto-texto" />
    <input id="p-intertexto-link" />
    <input id="p-intertexto-link-texto" />
    <input id="p-intertexto-nota" />
    <button id="p-intertexto-btn-add"></button>
    <button id="p-intertexto-btn-cancelar" class="hidden"></button>
    <div id="p-intertexto-lista"></div>
    <input id="pr-intertexto-tipo" />
    <input id="pr-intertexto-texto" />
    <input id="pr-intertexto-link" />
    <input id="pr-intertexto-link-texto" />
    <input id="pr-intertexto-nota" />
    <button id="pr-intertexto-btn-add"></button>
    <button id="pr-intertexto-btn-cancelar" class="hidden"></button>
    <div id="pr-intertexto-lista"></div>
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
    adicionarGrupoDiretoProsa,
    removerGrupoDiretoProsa,
    resetGruposDiretosProsa,
    carregarGruposDiretosProsa,
    obterGruposDiretosProsa,
} = await import('../js/editor.js');
const {
    adicionarIntertexto,
    editarIntertexto,
    cancelarEdicaoIntertexto,
    obterIntertextualidade,
    resetIntertextualidade,
    adicionarIntertextoProsa,
    editarIntertextoProsa,
    cancelarEdicaoIntertextoProsa,
    obterIntertextualidadeProsa,
    resetIntertextualidadeProsa,
} = await import('../js/editor.js');
const { renderSinalizacoesProsa, initEditorProsa } = await import('../js/editor.js');

function limparDb() {
    db.pessoas.length = 0;
    db.grupos.length = 0;
    document.getElementById('modal-confirmar-exclusao')?.remove();
    resetPessoas();
    resetGruposDiretos();
    resetGruposDiretosProsa();
}

describe('Criação de pessoa nova via chip (editor.js, DOM real)', () => {
    beforeEach(limparDb);

    it('nome que bate com pessoa já cadastrada reaproveita o id direto, sem pedir confirmação', () => {
        db.pessoas.push({ id: 1, nome: 'Ana', grupoIds: [] });

        adicionarPessoa('Ana');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.deepEqual(obterPessoas(), [{ pessoaId: 1, papeis: [] }]);
        assert.equal(db.pessoas.length, 1, 'não deveria duplicar a pessoa existente');
    });

    it('nome sem correspondência pede confirmação antes de criar — cancelar não cria nada', () => {
        adicionarPessoa('Beatriz');

        const overlay = document.getElementById('modal-confirmar-exclusao');
        assert.ok(overlay, 'deveria abrir o modal de confirmação de pessoa nova');
        assert.match(document.getElementById('excl-titulo').textContent, /Beatriz/);

        document.getElementById('excl-cancelar').click();

        assert.equal(db.pessoas.length, 0);
        assert.deepEqual(obterPessoas(), []);
    });

    it('nome sem correspondência, ao confirmar, cria a pessoa no cadastro central sem grupo e gera o chip', () => {
        adicionarPessoa('Carla');

        document.getElementById('excl-confirmar').click();

        assert.equal(db.pessoas.length, 1);
        const criada = db.pessoas[0];
        assert.equal(criada.nome, 'Carla');
        assert.deepEqual(criada.grupoIds, [], 'pessoa nova via chip não vem com grupo atribuído');

        assert.deepEqual(obterPessoas(), [{ pessoaId: criada.id, papeis: [] }]);
        assert.match(
            document.getElementById('p-pessoas-container').textContent,
            /Carla/,
            'o chip da pessoa recém-criada deveria aparecer no container',
        );
    });

    it('adicionar a mesma pessoa duas vezes não duplica o chip', () => {
        db.pessoas.push({ id: 5, nome: 'Duda', grupoIds: [] });

        adicionarPessoa('Duda');
        adicionarPessoa('Duda');

        assert.equal(obterPessoas().length, 1);
    });

    it('remover um chip tira a pessoa da lista de itens, sem afetar o cadastro central', () => {
        db.pessoas.push({ id: 9, nome: 'Elis', grupoIds: [] });
        adicionarPessoa('Elis');

        removerPessoa(9);

        assert.deepEqual(obterPessoas(), []);
        assert.equal(db.pessoas.length, 1, 'remover o chip não remove a pessoa do cadastro');
    });

    it('input com espaços/vazio não gera pessoa nem confirmação', () => {
        adicionarPessoa('   ');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.equal(db.pessoas.length, 0);
        assert.deepEqual(obterPessoas(), []);
    });
});

describe('Painel somente-leitura de Grupos embaixo dos chips (editor.js, DOM real)', () => {
    beforeEach(limparDb);

    it('some (fica vazio) quando nenhuma pessoa selecionada está em grupo', () => {
        db.pessoas.push({ id: 1, nome: 'Fábio', grupoIds: [] });
        carregarPessoas([{ pessoaId: 1, papeis: [] }]);

        assert.equal(document.getElementById('p-pessoas-grupos-info').innerHTML, '');
    });

    it('mostra "Grupo (Pessoa)" pra cada grupo que a pessoa selecionada pertence', () => {
        db.grupos.push({ id: 10, nome: 'Namorado', cor: 'blue' });
        db.pessoas.push({ id: 1, nome: 'Dalton', grupoIds: [10] });
        carregarPessoas([{ pessoaId: 1, papeis: [] }]);

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
        carregarPessoas([{ pessoaId: 1, papeis: [] }]);

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
        carregarPessoas([{ pessoaId: 1, papeis: [] }]);

        assert.notEqual(document.getElementById('p-pessoas-grupos-info').innerHTML, '');

        removerPessoa(1);

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
    beforeEach(limparDb);

    it('nome que bate com grupo já cadastrado reaproveita o id direto, sem pedir confirmação', () => {
        db.grupos.push({ id: 10, nome: 'Família', cor: 'blue' });

        adicionarGrupoDireto('Família');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.deepEqual(obterGruposDiretos(), [10]);
        assert.equal(db.grupos.length, 1, 'não deveria duplicar o grupo existente');
    });

    it('nome sem correspondência pede confirmação antes de criar — cancelar não cria nada', () => {
        adicionarGrupoDireto('Coletivo Novo');

        const overlay = document.getElementById('modal-confirmar-exclusao');
        assert.ok(overlay, 'deveria abrir o modal de confirmação de grupo novo');
        assert.match(document.getElementById('excl-titulo').textContent, /Coletivo Novo/);

        document.getElementById('excl-cancelar').click();

        assert.equal(db.grupos.length, 0);
        assert.deepEqual(obterGruposDiretos(), []);
    });

    it('nome sem correspondência, ao confirmar, cria o grupo no cadastro central com cor padrão e gera o chip', () => {
        adicionarGrupoDireto('Coletivo Novo');

        document.getElementById('excl-confirmar').click();

        assert.equal(db.grupos.length, 1);
        const criado = db.grupos[0];
        assert.equal(criado.nome, 'Coletivo Novo');
        assert.ok(criado.cor, 'grupo novo via chip deveria vir com uma cor padrão');

        assert.deepEqual(obterGruposDiretos(), [criado.id]);
        assert.match(
            document.getElementById('p-grupos-diretos-container').textContent,
            /Coletivo Novo/,
            'o chip do grupo recém-criado deveria aparecer no container',
        );
    });

    it('adicionar o mesmo grupo duas vezes não duplica o chip', () => {
        db.grupos.push({ id: 20, nome: 'Trabalho', cor: 'emerald' });

        adicionarGrupoDireto('Trabalho');
        adicionarGrupoDireto('Trabalho');

        assert.equal(obterGruposDiretos().length, 1);
    });

    it('remover um chip tira o grupo da lista de itens, sem afetar o cadastro central', () => {
        db.grupos.push({ id: 30, nome: 'Faculdade', cor: 'amber' });
        adicionarGrupoDireto('Faculdade');

        removerGrupoDireto(30);

        assert.deepEqual(obterGruposDiretos(), []);
        assert.equal(db.grupos.length, 1, 'remover o chip não remove o grupo do cadastro');
    });

    it('input com espaços/vazio não gera grupo nem confirmação', () => {
        adicionarGrupoDireto('   ');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.equal(db.grupos.length, 0);
        assert.deepEqual(obterGruposDiretos(), []);
    });

    it('carregar/resetar preenche e limpa os chips (ida e volta pelo formulário)', () => {
        db.grupos.push({ id: 40, nome: 'Vizinhança', cor: 'rose' });

        carregarGruposDiretos([40]);
        assert.deepEqual(obterGruposDiretos(), [40]);
        assert.match(
            document.getElementById('p-grupos-diretos-container').textContent,
            /Vizinhança/,
        );

        resetGruposDiretos();
        assert.deepEqual(obterGruposDiretos(), []);
        assert.equal(document.getElementById('p-grupos-diretos-container').innerHTML, '');
    });

    it('a variante de Prosa é independente da de Poema (containers e estado próprios)', () => {
        db.grupos.push({ id: 50, nome: 'Editora', cor: 'sky' });

        adicionarGrupoDiretoProsa('Editora');

        assert.deepEqual(obterGruposDiretosProsa(), [50]);
        assert.deepEqual(obterGruposDiretos(), [], 'não deveria vazar pro estado de Poema');
        assert.match(document.getElementById('pr-grupos-diretos-container').textContent, /Editora/);
        assert.equal(document.getElementById('p-grupos-diretos-container').innerHTML, '');

        removerGrupoDiretoProsa(50);
        assert.deepEqual(obterGruposDiretosProsa(), []);
    });

    it('carregarGruposDiretosProsa restaura o array salvo, sem vazar pro estado de Poema', () => {
        carregarGruposDiretosProsa([50]);
        assert.deepEqual(obterGruposDiretosProsa(), [50]);
        assert.deepEqual(obterGruposDiretos(), []);
    });
});

// ─── Intertextualidade — campos de link, linkTexto e nota (Poema) ─────
// item.tipo + item.texto já existiam; link e nota vieram depois; linkTexto
// é o rótulo opcional do link (evita estouro de URL longa na lista
// renderizada — cai pra URL crua quando vazio), espelhando o padrão
// tipo+texto+link que Anexos já usa (ver editor.js).

function limparIntertextoPoema() {
    document.getElementById('p-intertexto-tipo').value = '';
    document.getElementById('p-intertexto-texto').value = '';
    document.getElementById('p-intertexto-link').value = '';
    document.getElementById('p-intertexto-link-texto').value = '';
    document.getElementById('p-intertexto-nota').value = '';
    resetIntertextualidade();
}

describe('Intertextualidade — link, linkTexto e nota (Poema, editor.js, DOM real)', () => {
    beforeEach(limparIntertextoPoema);

    it('adicionarIntertexto salva tipo, texto, link, linkTexto e nota juntos', () => {
        document.getElementById('p-intertexto-tipo').value = 'Citação';
        document.getElementById('p-intertexto-texto').value = 'Trecho citado';
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com/obra';
        document.getElementById('p-intertexto-link-texto').value = 'Site da obra';
        document.getElementById('p-intertexto-nota').value = 'Nota livre sobre a referência';

        adicionarIntertexto();

        assert.deepEqual(obterIntertextualidade(), [
            {
                tipo: 'Citação',
                texto: 'Trecho citado',
                link: 'https://exemplo.com/obra',
                linkTexto: 'Site da obra',
                nota: 'Nota livre sobre a referência',
            },
        ]);
    });

    it('limpa os 5 campos depois de adicionar', () => {
        document.getElementById('p-intertexto-texto').value = 'Algo';
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com';
        document.getElementById('p-intertexto-link-texto').value = 'Rótulo';
        document.getElementById('p-intertexto-nota').value = 'Nota';

        adicionarIntertexto();

        assert.equal(document.getElementById('p-intertexto-tipo').value, '');
        assert.equal(document.getElementById('p-intertexto-texto').value, '');
        assert.equal(document.getElementById('p-intertexto-link').value, '');
        assert.equal(document.getElementById('p-intertexto-link-texto').value, '');
        assert.equal(document.getElementById('p-intertexto-nota').value, '');
    });

    it('link e nota sozinhos (sem tipo nem texto) já bastam pra adicionar a entrada', () => {
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com';

        adicionarIntertexto();

        assert.equal(obterIntertextualidade().length, 1);
    });

    it('não adiciona nada se os 5 campos estiverem vazios', () => {
        adicionarIntertexto();
        assert.deepEqual(obterIntertextualidade(), []);
    });

    it('editarIntertexto repopula tipo, texto, link, linkTexto e nota do item selecionado', () => {
        document.getElementById('p-intertexto-texto').value = 'Original';
        document.getElementById('p-intertexto-link').value = 'https://original.com';
        document.getElementById('p-intertexto-link-texto').value = 'Rótulo original';
        document.getElementById('p-intertexto-nota').value = 'Nota original';
        adicionarIntertexto();

        editarIntertexto(0);

        assert.equal(document.getElementById('p-intertexto-texto').value, 'Original');
        assert.equal(document.getElementById('p-intertexto-link').value, 'https://original.com');
        assert.equal(document.getElementById('p-intertexto-link-texto').value, 'Rótulo original');
        assert.equal(document.getElementById('p-intertexto-nota').value, 'Nota original');
    });

    it('cancelarEdicaoIntertexto limpa os 5 campos sem alterar a lista', () => {
        document.getElementById('p-intertexto-texto').value = 'Original';
        adicionarIntertexto();
        editarIntertexto(0);

        document.getElementById('p-intertexto-nota').value = 'Rascunho descartado';
        cancelarEdicaoIntertexto();

        assert.equal(document.getElementById('p-intertexto-nota').value, '');
        assert.equal(obterIntertextualidade().length, 1);
        assert.equal(obterIntertextualidade()[0].texto, 'Original');
    });

    it('sem linkTexto, a lista renderizada mostra a URL crua como texto do <a>', () => {
        document.getElementById('p-intertexto-texto').value = 'Trecho';
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com/pagina';
        document.getElementById('p-intertexto-nota').value = 'Comentário à parte';

        adicionarIntertexto();

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

        adicionarIntertexto();

        const html = document.getElementById('p-intertexto-lista').innerHTML;
        assert.match(
            html,
            /<a href="https:\/\/g1\.globo\.com\/pe\/pernambuco\/noticia\/2020\/06\/19\/algum-slug-bem-longo\.ghtml"[^>]*>G1 Pernambuco<\/a>/,
        );
        assert.ok(!html.includes('>https://g1.globo.com'));
    });

    it('o <a> renderizado tem a classe break-all, pra URL longa quebrar em vez de estourar', () => {
        document.getElementById('p-intertexto-link').value = 'https://exemplo.com/pagina-longa';

        adicionarIntertexto();

        const html = document.getElementById('p-intertexto-lista').innerHTML;
        assert.match(html, /class="[^"]*break-all[^"]*"/);
    });
});

// ─── Intertextualidade — link, linkTexto e nota (Prosa) ────────────────
// Mesmo comportamento acima, na versão de Prosa (funções com sufixo
// "Prosa" e ids prefixados "pr-").

function limparIntertextoProsa() {
    document.getElementById('pr-intertexto-tipo').value = '';
    document.getElementById('pr-intertexto-texto').value = '';
    document.getElementById('pr-intertexto-link').value = '';
    document.getElementById('pr-intertexto-link-texto').value = '';
    document.getElementById('pr-intertexto-nota').value = '';
    resetIntertextualidadeProsa();
}

describe('Intertextualidade — link, linkTexto e nota (Prosa, editor.js, DOM real)', () => {
    beforeEach(limparIntertextoProsa);

    it('adicionarIntertextoProsa salva tipo, texto, link, linkTexto e nota juntos', () => {
        document.getElementById('pr-intertexto-tipo').value = 'Alusão';
        document.getElementById('pr-intertexto-texto').value = 'Trecho aludido';
        document.getElementById('pr-intertexto-link').value = 'https://exemplo.com/prosa';
        document.getElementById('pr-intertexto-link-texto').value = 'Rótulo prosa';
        document.getElementById('pr-intertexto-nota').value = 'Nota sobre a prosa';

        adicionarIntertextoProsa();

        assert.deepEqual(obterIntertextualidadeProsa(), [
            {
                tipo: 'Alusão',
                texto: 'Trecho aludido',
                link: 'https://exemplo.com/prosa',
                linkTexto: 'Rótulo prosa',
                nota: 'Nota sobre a prosa',
            },
        ]);
    });

    it('editarIntertextoProsa repopula tipo, texto, link, linkTexto e nota do item selecionado', () => {
        document.getElementById('pr-intertexto-texto').value = 'Original';
        document.getElementById('pr-intertexto-link').value = 'https://original.com';
        document.getElementById('pr-intertexto-link-texto').value = 'Rótulo original';
        document.getElementById('pr-intertexto-nota').value = 'Nota original';
        adicionarIntertextoProsa();

        editarIntertextoProsa(0);

        assert.equal(document.getElementById('pr-intertexto-texto').value, 'Original');
        assert.equal(document.getElementById('pr-intertexto-link').value, 'https://original.com');
        assert.equal(document.getElementById('pr-intertexto-link-texto').value, 'Rótulo original');
        assert.equal(document.getElementById('pr-intertexto-nota').value, 'Nota original');
    });

    it('cancelarEdicaoIntertextoProsa limpa os 5 campos sem alterar a lista', () => {
        document.getElementById('pr-intertexto-texto').value = 'Original';
        adicionarIntertextoProsa();
        editarIntertextoProsa(0);

        document.getElementById('pr-intertexto-nota').value = 'Rascunho descartado';
        cancelarEdicaoIntertextoProsa();

        assert.equal(document.getElementById('pr-intertexto-nota').value, '');
        assert.equal(obterIntertextualidadeProsa().length, 1);
    });

    it('sem linkTexto, a lista renderizada mostra a URL crua como texto do <a>', () => {
        document.getElementById('pr-intertexto-texto').value = 'Trecho';
        document.getElementById('pr-intertexto-link').value = 'https://exemplo.com/pagina-prosa';
        document.getElementById('pr-intertexto-nota').value = 'Comentário de prosa';

        adicionarIntertextoProsa();

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

        adicionarIntertextoProsa();

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
