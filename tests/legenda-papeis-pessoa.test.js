import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
    CHAVE_LEGENDA_PAPEIS,
    comLegendaPapeis,
    incorporarPapeisImportados,
    legendaDosItens,
    legendaPapeisPessoa,
    legendaParaMarkdown,
    nomesDePapeisNosItens,
} from '../js/legenda-papeis-pessoa.js';
import { papeisPessoaDeFabrica } from '../js/papeis-pessoa.js';
import { aplicarImportacaoAditiva, classificarImportacaoAditiva } from '../js/importar-aditivo.js';

const item = (...papeisPorVinculo) => ({
    pessoas: papeisPorVinculo.map((papeis, i) => ({ pessoaId: i + 1, papeis })),
});

describe('legenda dos papéis: montagem', () => {
    it('lista só os papéis usados, na ordem do registro, com apelido e descrição', () => {
        const itens = [item(['Aludido(a)', 'Retratado(a)']), item(['Retratado(a)'])];
        const legenda = legendaDosItens(itens);
        assert.deepEqual(
            legenda.map((p) => p.nome),
            ['Retratado(a)', 'Aludido(a)'],
        );
        assert.equal(legenda[0].apelido, 'Retr');
        assert.ok(legenda[0].descricao.length > 10);
    });

    it('sem papéis nos textos, a legenda é vazia', () => {
        assert.deepEqual(legendaDosItens([item([]), { pessoas: [] }, {}]), []);
        assert.deepEqual(nomesDePapeisNosItens(null), []);
    });

    it('Relacionado(a) sai como exclusivo, sem lista de papéis', () => {
        const [rel] = legendaDosItens([item(['Relacionado(a)'])]);
        assert.equal(rel.exclusivo, true);
        assert.equal(rel.nao_convive_com, undefined);
    });

    it('papel com regra lista com quem não convive', () => {
        const [menc] = legendaDosItens([item(['Mencionado(a)'])]);
        assert.ok(menc.nao_convive_com.includes('Aludido(a)'));
        assert.ok(!menc.nao_convive_com.includes('Mencionado(a)'));
    });

    it('papel que o registro não conhece entra no fim, com apelido sugerido', () => {
        const legenda = legendaPapeisPessoa(['Confidente', 'Voz']);
        assert.deepEqual(
            legenda.map((p) => p.nome),
            ['Voz', 'Confidente'],
        );
        assert.equal(legenda[1].apelido, 'Conf');
        assert.equal(legenda[1].descricao, '');
    });

    it('usa o registro dado (apelido editado, papel acrescentado)', () => {
        const registro = papeisPessoaDeFabrica().map((p) =>
            p.nome === 'Voz' ? { ...p, apelido: 'Fala' } : p,
        );
        registro.push({
            nome: 'Confidente',
            apelido: 'Conf',
            descricao: 'Quem ouviu o segredo.',
            grupoExclusao: '',
            exclusivoComTodos: false,
            superficie: false,
            fabrica: false,
        });
        const legenda = legendaPapeisPessoa(['Voz', 'Confidente'], registro);
        assert.equal(legenda[0].apelido, 'Fala');
        assert.equal(legenda[1].descricao, 'Quem ouviu o segredo.');
    });
});

describe('legenda dos papéis: envelope do JSON e do .md', () => {
    it('entra logo depois de export_format, antes dos textos', () => {
        const itens = [item(['Voz'])];
        const saida = comLegendaPapeis({ export_format: 'selecao', itens }, itens);
        assert.deepEqual(Object.keys(saida), ['export_format', CHAVE_LEGENDA_PAPEIS, 'itens']);
        assert.equal(saida[CHAVE_LEGENDA_PAPEIS][0].nome, 'Voz');
    });

    it('sem papéis, o envelope sai igual', () => {
        const saida = { export_format: 'selecao', itens: [item([])] };
        assert.equal(comLegendaPapeis(saida, saida.itens), saida);
    });

    it('o .md tem uma linha por papel, sem travessão', () => {
        const md = legendaParaMarkdown(
            legendaDosItens([item(['Mencionado(a)'], ['Relacionado(a)'])]),
        );
        assert.match(md, /^## Legenda dos papéis de Pessoa/);
        assert.match(md, /- \*\*Mencionado\(a\)\*\* \(Menc\): .*Não convive com: /);
        assert.match(
            md,
            /- \*\*Relacionado\(a\)\*\* \(Relac\): .*Não convive com nenhum outro papel\./,
        );
        assert.ok(!md.includes('—'));
        assert.equal(legendaParaMarkdown([]), '');
    });
});

describe('legenda dos papéis: importação', () => {
    const textoCom = (...papeis) => ({ pessoas: [{ pessoaId: 1, papeis }] });

    it('cadastra o papel novo com apelido e descrição da legenda', () => {
        const dbRef = { papeisPessoa: papeisPessoaDeFabrica() };
        const legenda = [
            { nome: 'Confidente', apelido: 'Conf', descricao: 'Quem ouviu o segredo.' },
        ];
        const novos = incorporarPapeisImportados(dbRef, legenda, [textoCom('Confidente')]);
        assert.deepEqual(novos, ['Confidente']);
        const papel = dbRef.papeisPessoa.find((p) => p.nome === 'Confidente');
        assert.equal(papel.apelido, 'Conf');
        assert.equal(papel.descricao, 'Quem ouviu o segredo.');
        assert.equal(papel.fabrica, false);
        assert.equal(papel.exclusivoComTodos, false);
        assert.equal(papel.grupoExclusao, '');
    });

    it('papel que o destino já tem não muda (nem descrição, nem apelido)', () => {
        const dbRef = { papeisPessoa: papeisPessoaDeFabrica() };
        const antes = JSON.stringify(dbRef.papeisPessoa);
        const legenda = [{ nome: 'Voz', apelido: 'XXXX', descricao: 'Outra coisa.' }];
        assert.deepEqual(incorporarPapeisImportados(dbRef, legenda, [textoCom('Voz')]), []);
        assert.equal(JSON.stringify(dbRef.papeisPessoa), antes);
    });

    it('apelido da legenda que colide com o do destino é trocado por um sugerido', () => {
        const dbRef = { papeisPessoa: papeisPessoaDeFabrica() };
        const legenda = [{ nome: 'Confidente', apelido: 'Retr', descricao: '' }];
        incorporarPapeisImportados(dbRef, legenda, [textoCom('Confidente')]);
        const papel = dbRef.papeisPessoa.find((p) => p.nome === 'Confidente');
        assert.notEqual(papel.apelido.toLowerCase(), 'retr');
        assert.ok(papel.apelido.length >= 4);
    });

    it('papel usado sem legenda entra simples; legenda de papel não usado é ignorada', () => {
        const dbRef = { papeisPessoa: papeisPessoaDeFabrica() };
        const legenda = [{ nome: 'Fantasma', apelido: 'Fant', descricao: 'Ninguém usa.' }];
        const novos = incorporarPapeisImportados(dbRef, legenda, [textoCom('Sem legenda')]);
        assert.deepEqual(novos, ['Sem legenda']);
        assert.ok(!dbRef.papeisPessoa.some((p) => p.nome === 'Fantasma'));
    });

    it('sem legenda, sem papéis ou com legenda torta, não quebra nem muda nada', () => {
        const dbRef = { papeisPessoa: papeisPessoaDeFabrica() };
        const antes = JSON.stringify(dbRef.papeisPessoa);
        assert.deepEqual(incorporarPapeisImportados(dbRef, undefined, [textoCom()]), []);
        assert.deepEqual(incorporarPapeisImportados(dbRef, 'torta', []), []);
        assert.deepEqual(incorporarPapeisImportados(dbRef, [null, 3, {}], [textoCom('Voz')]), []);
        assert.equal(JSON.stringify(dbRef.papeisPessoa), antes);
    });

    it('acervo sem registro ainda: parte da fábrica e acrescenta o novo', () => {
        const dbRef = {};
        const novos = incorporarPapeisImportados(dbRef, [], [textoCom('Confidente', 'Voz')]);
        assert.deepEqual(novos, ['Confidente']);
        assert.equal(dbRef.papeisPessoa.length, 10);
    });
});

describe('legenda dos papéis: Importação Aditiva de ponta a ponta', () => {
    const dbDestino = () => ({
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        periodosHistoricos: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
        papeisPessoa: papeisPessoaDeFabrica(),
    });
    const deps = () => ({
        tirarSnapshotSeNecessario: mock.fn(async () => true),
        save: mock.fn(() => {}),
    });
    const poema = (id, papeis) => ({
        id,
        tipo: 'poema',
        titulo: `Poema ${id}`,
        texto: 'texto',
        pessoas: [{ pessoaId: 7, papeis, nome: 'Pedro' }],
        autoria: [],
        gruposDiretosResolvidos: [],
        livrosResolvidos: [],
        contexto: { livro: null, parte: null, secao: null },
    });

    it('papel novo do arquivo é cadastrado com a descrição da legenda e vai para o resultado', async () => {
        const db = dbDestino();
        const payload = {
            export_format: 'selecao',
            [CHAVE_LEGENDA_PAPEIS]: [
                { nome: 'Confidente', apelido: 'Conf', descricao: 'Quem ouviu o segredo.' },
            ],
            itens: [poema(1, ['Confidente', 'Voz'])],
        };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const d = deps();
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, d);
        assert.equal(r.sucesso, true);
        assert.deepEqual(r.papeisNovos, ['Confidente']);
        assert.equal(
            db.papeisPessoa.find((p) => p.nome === 'Confidente').descricao,
            'Quem ouviu o segredo.',
        );
        assert.deepEqual(db.poemas[0].pessoas[0].papeis, ['Confidente', 'Voz']);
        assert.equal(d.save.mock.callCount(), 1);
    });

    it('arquivo sem legenda ou só com papéis de fábrica: nada novo no registro', async () => {
        const db = dbDestino();
        const antes = JSON.stringify(db.papeisPessoa);
        const payload = { itens: [poema(1, ['Voz'])] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps());
        assert.deepEqual(r.papeisNovos, []);
        assert.equal(JSON.stringify(db.papeisPessoa), antes);
    });

    it('texto tratado como duplicata não traz o papel dele para o registro', async () => {
        const db = dbDestino();
        db.poemas.push({ id: 999, titulo: 'Poema 1', texto: 'texto', pessoas: [] });
        const payload = {
            [CHAVE_LEGENDA_PAPEIS]: [{ nome: 'Confidente', apelido: 'Conf', descricao: 'x' }],
            itens: [poema(1, ['Confidente'])],
        };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps());
        if (r.sucesso && r.criados.poemas === 0) {
            assert.deepEqual(r.papeisNovos, []);
        }
    });
});
