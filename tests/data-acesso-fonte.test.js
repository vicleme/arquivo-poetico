import './helpers/localstorage-shim.js';
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Data de acesso (`dataAcesso`) da Fonte do texto (`fonteTexto`): ligações
// puras (gravação, importação de campos, pacote), Visualização/.md, coluna da
// tabela e .csv. A data só vale com link; a chave só existe quando preenchida.

const { db } = await import('../js/db.js');
const { linhasFonteTexto, dataAcessoDoLink } = await import('../js/utils.js');
const { definirSubcampoFonte, obterCampoPreenchivel, CAMPOS_PREENCHIVEIS } =
    await import('../js/campos-preenchiveis.js');
const { lerExtrasDaEntrada, aplicarCamposSimples } =
    await import('../js/importar-campos-extras.js');
const { montarItemDeSelecao, montarPayloadDeTexto, montarPacote, cabecalhoPacote } =
    await import('../js/pacote-texto.js');
const { celulaFonte } = await import('../js/celulas-tabela.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');

const LINK = 'https://pt.wikisource.org/x';

describe('dataAcessoDoLink', () => {
    it('devolve a data ISO só com link e data válida', () => {
        assert.equal(dataAcessoDoLink(LINK, '2026-10-18'), '2026-10-18');
        assert.equal(dataAcessoDoLink('', '2026-10-18'), '');
        assert.equal(dataAcessoDoLink(LINK, '18/10/2026'), '');
        assert.equal(dataAcessoDoLink(LINK, undefined), '');
    });
});

describe('linhasFonteTexto com data de acesso', () => {
    it('anexa "(acesso em dd/mm/aaaa)" ao link da fonte', () => {
        const item = { fonteTexto: { origem: 'Wikisource', link: LINK, dataAcesso: '2026-10-18' } };
        const l = linhasFonteTexto(item, []).find((x) => x.rotulo === 'Link da fonte');
        assert.equal(l.valor, `${LINK} (acesso em 18/10/2026)`);
    });
    it('sem data, ou data sem link, o link sai como antes', () => {
        const a = linhasFonteTexto({ fonteTexto: { link: LINK } }, []);
        assert.equal(a.find((x) => x.rotulo === 'Link da fonte').valor, LINK);
        const b = linhasFonteTexto({ fonteTexto: { origem: 'X', dataAcesso: '2026-10-18' } }, []);
        assert.equal(
            b.some((x) => x.rotulo === 'Link da fonte'),
            false,
        );
    });
});

describe('definirSubcampoFonte e o campo fonteDataAcesso', () => {
    it('preserva a data ao mexer em outro subcampo e a descarta sem link', () => {
        const item = { fonteTexto: { origem: 'A', link: LINK, dataAcesso: '2026-10-18' } };
        definirSubcampoFonte(item, 'edicao', 'E');
        assert.equal(item.fonteTexto.dataAcesso, '2026-10-18');
        definirSubcampoFonte(item, 'link', '');
        assert.equal('dataAcesso' in item.fonteTexto, false);
    });
    it('data inválida ou sem link não é gravada', () => {
        const campo = obterCampoPreenchivel('fonteDataAcesso');
        const sem = { fonteTexto: { origem: 'A' } };
        campo.gravar(sem, '2026-10-18');
        assert.equal('dataAcesso' in sem.fonteTexto, false);
        const com = { fonteTexto: { link: LINK } };
        campo.gravar(com, 'ontem');
        assert.equal('dataAcesso' in com.fonteTexto, false);
        campo.gravar(com, '2026-10-18');
        assert.equal(campo.ler(com), '2026-10-18');
    });
    it('o campo é só da importação (fora do painel de preencher em massa)', () => {
        assert.equal(obterCampoPreenchivel('fonteDataAcesso').soImportacao, true);
        assert.equal(
            CAMPOS_PREENCHIVEIS.filter((c) => !c.soImportacao).length,
            CAMPOS_PREENCHIVEIS.length - 1,
        );
    });
});

describe('importar campos: fonte.dataAcesso', () => {
    const ler = (fonte) => {
        const problemas = [];
        const { simples } = lerExtrasDaEntrada({ fonte }, problemas);
        return { simples, problemas };
    };
    it('aceita ISO e dd/mm/aaaa, e grava depois do link', () => {
        for (const d of ['2026-10-18', '18/10/2026']) {
            const { simples, problemas } = ler({ origem: 'W', link: LINK, dataAcesso: d });
            assert.deepEqual(problemas, []);
            assert.deepEqual(
                simples.find((s) => s.chave === 'fonteDataAcesso'),
                {
                    chave: 'fonteDataAcesso',
                    valor: '2026-10-18',
                },
            );
            const item = { fonteTexto: null };
            aplicarCamposSimples(item, simples, { camposSimples: [] });
            assert.equal(item.fonteTexto.dataAcesso, '2026-10-18');
        }
    });
    it('data inválida vira problema e não é gravada', () => {
        const { simples, problemas } = ler({ link: LINK, dataAcesso: '31/02/2026' });
        assert.equal(
            simples.some((s) => s.chave === 'fonteDataAcesso'),
            false,
        );
        assert.equal(problemas[0].motivo, 'valor-invalido');
    });
    it('sem link no arquivo nem no texto, a data não fica', () => {
        const { simples } = ler({ origem: 'W', dataAcesso: '2026-10-18' });
        const item = { fonteTexto: null };
        aplicarCamposSimples(item, simples, { camposSimples: [] });
        assert.equal('dataAcesso' in item.fonteTexto, false);
    });
});

describe('pacote de texto: dataAcesso', () => {
    const meta = { id: 'x', autor: { nome: 'A' }, link: LINK, dataAcesso: '2026-10-18' };
    it('o cabeçalho e os itens carregam a data quando há link', () => {
        assert.equal(cabecalhoPacote(meta).pacote.dataAcesso, '2026-10-18');
        const p = montarPacote('# T\n\ntexto\n', meta);
        assert.equal(p.itens[0].fonteTexto.dataAcesso, '2026-10-18');
    });
    it('sem data a chave não existe (saída igual à de antes)', () => {
        const p = montarPacote('# T\n\ntexto\n', { ...meta, dataAcesso: undefined });
        assert.equal('dataAcesso' in p.itens[0].fonteTexto, false);
        assert.equal('dataAcesso' in p.pacote, false);
    });
    it('recusa data inválida em vez de perder em silêncio', () => {
        assert.throws(() => cabecalhoPacote({ ...meta, dataAcesso: '18/10/2026' }), /dataAcesso/);
    });
    it('seleção exportada: a data da fonte atravessa; meta e sobre sobrescrevem', () => {
        const base = { titulo: 'T', texto: 'x', tipo: 'poema' };
        const m1 = { autor: { nome: 'A' } };
        const a = montarItemDeSelecao(
            1,
            { ...base, fonteTexto: { link: LINK, dataAcesso: '2026-01-02' } },
            m1,
        );
        assert.equal(a.fonteTexto.dataAcesso, '2026-01-02');
        const b = montarItemDeSelecao(
            1,
            { ...base, fonteTexto: { link: LINK, dataAcesso: '2026-01-02' } },
            {
                ...m1,
                textos: { T: { dataAcesso: '2026-03-04' } },
            },
        );
        assert.equal(b.fonteTexto.dataAcesso, '2026-03-04');
    });
    it('importar de texto: o campo dataAcesso chega ao item', () => {
        const pl = montarPayloadDeTexto({
            md: '# T\n\ntexto\n',
            autor: 'A',
            link: LINK,
            dataAcesso: '2026-10-18',
        });
        assert.equal(pl.itens[0].fonteTexto.dataAcesso, '2026-10-18');
    });
});

describe('tabela e CSV', () => {
    beforeEach(() => {
        db.autores = [];
        db.livros = [];
    });
    it('a coluna Fonte mostra a data depois do nome', () => {
        const html = celulaFonte({
            fonteTexto: { origem: 'W', link: LINK, dataAcesso: '2026-10-18' },
        });
        assert.ok(html.includes('(acesso em 18/10/2026)'));
        assert.ok(!celulaFonte({ fonteTexto: { origem: 'W', link: LINK } }).includes('acesso'));
    });
    it('o CSV tem a coluna fonte_data_acesso em ISO', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            fonteTexto: {
                origem: 'W',
                link: LINK,
                dataAcesso: '2026-10-18',
                conferido: false,
                grafia: '',
            },
        };
        db.poemas = [item];
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', item)], db);
        const [cab, linha] = csv.split('\n');
        const i = cab.split(',').indexOf('fonte_data_acesso');
        assert.ok(i > 0);
        assert.ok(linha.includes('2026-10-18'));
    });
});
