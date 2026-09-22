import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
    separarTextos,
    temTextoAntesDoPrimeiroTitulo,
    montarPayloadDeTexto,
} from '../js/pacote-texto.js';
import { classificarImportacaoAditiva, aplicarImportacaoAditiva } from '../js/importar-aditivo.js';
import * as script from '../scripts/montar-pacote.js';

function dbVazio() {
    return {
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
    };
}

const deps = () => ({
    tirarSnapshotSeNecessario: mock.fn(async () => true),
    save: mock.fn(() => {}),
});

const CAMPOS = {
    md: '# A\nv1\nv2\n\n# B\nx\n',
    autor: 'Fulano',
    nacionalidade: 'brasileira',
    nascimentoAno: '1850',
    obitoAno: '1900',
    fonte: 'Wikisource',
    edicao: 'Ed. Y',
    link: 'https://x.test/a',
    conferido: true,
};

describe('parser compartilhado (script e aba Biblioteca usam o mesmo código)', () => {
    it('o script reexporta as mesmas funções do módulo', async () => {
        const modulo = await import('../js/pacote-texto.js');
        assert.equal(script.separarTextos, modulo.separarTextos);
        assert.equal(script.montarPacote, modulo.montarPacote);
        assert.equal(script.montarItem, modulo.montarItem);
    });
});

describe('separarTextos: tituloPadrao', () => {
    it('sem nenhum "# Título", o texto inteiro vira um texto com o título padrão', () => {
        const r = separarTextos('v1\nv2\n\nv3\n', { tituloPadrao: '  Soneto  ' });
        assert.deepEqual(r, [{ titulo: 'Soneto', texto: 'v1\nv2\n\nv3\n' }]);
    });

    it('sem título e sem tituloPadrao: nada (comportamento do script preservado)', () => {
        assert.deepEqual(separarTextos('v1\nv2\n'), []);
        assert.deepEqual(separarTextos('v1', { tituloPadrao: '   ' }), []);
    });

    it('com "# Título" no arquivo, tituloPadrao é ignorado', () => {
        const r = separarTextos('# A\nx\n', { tituloPadrao: 'Outro' });
        assert.deepEqual(r, [{ titulo: 'A', texto: 'x\n' }]);
    });

    it('entrada nula ou vazia não lança', () => {
        assert.deepEqual(separarTextos(undefined), []);
        assert.deepEqual(separarTextos(''), []);
    });

    it('"## subtítulo" não é tratado como título de texto', () => {
        const r = separarTextos('# A\n## nota\nv\n');
        assert.deepEqual(r, [{ titulo: 'A', texto: '## nota\nv\n' }]);
    });
});

describe('temTextoAntesDoPrimeiroTitulo', () => {
    it('detecta conteúdo antes do primeiro título', () => {
        assert.equal(temTextoAntesDoPrimeiroTitulo('lixo\n# A\nx\n'), true);
    });
    it('linhas em branco antes do título não contam', () => {
        assert.equal(temTextoAntesDoPrimeiroTitulo('\n\n# A\nx\n'), false);
    });
    it('sem nenhum título, ou título na primeira linha: false', () => {
        assert.equal(temTextoAntesDoPrimeiroTitulo('só versos'), false);
        assert.equal(temTextoAntesDoPrimeiroTitulo('# A\nx'), false);
    });
});

describe('montarPayloadDeTexto', () => {
    it('gera payload no formato de pacote, com Autor e proveniência', () => {
        const p = montarPayloadDeTexto(CAMPOS);
        assert.equal(p.export_format, 'biblioteca');
        assert.equal(p.itens.length, 2);
        assert.deepEqual(p.autores[0], {
            id: 1,
            sobre: '',
            nome: 'Fulano',
            nacionalidade: 'brasileira',
            nascimento: { ano: 1850 },
            obito: { ano: 1900 },
        });
        assert.deepEqual(p.itens[0].fonteTexto, {
            origem: 'Wikisource',
            edicao: 'Ed. Y',
            link: 'https://x.test/a',
            conferido: true,
            grafia: '',
        });
    });

    it('conferido nasce false sem a declaração da pessoa', () => {
        const p = montarPayloadDeTexto({ ...CAMPOS, conferido: false });
        assert.equal(p.itens[0].fonteTexto.conferido, false);
        assert.equal(p.pacote.conferido, false);
    });

    it('campos opcionais vazios não viram chaves no Autor', () => {
        const p = montarPayloadDeTexto({
            md: '# A\nv\n',
            autor: 'Fulano',
            nacionalidade: '  ',
            nascimentoAno: '',
            obitoAno: '',
        });
        assert.deepEqual(Object.keys(p.autores[0]).sort(), ['id', 'nome', 'sobre']);
    });

    it('usa tituloPadrao quando o texto colado não tem "# Título"', () => {
        const p = montarPayloadDeTexto({ md: 'v1\nv2\n', tituloPadrao: 'Soneto', autor: 'F' });
        assert.equal(p.itens[0].titulo, 'Soneto');
    });

    it('recusa Autor vazio, ano que não é ano, óbito antes do nascimento e texto sem título', () => {
        assert.throws(() => montarPayloadDeTexto({ ...CAMPOS, autor: '  ' }), /Autor/);
        assert.throws(() => montarPayloadDeTexto({ ...CAMPOS, obitoAno: '19x0' }), /Óbito/);
        assert.throws(
            () => montarPayloadDeTexto({ ...CAMPOS, nascimentoAno: '1850-01' }),
            /Nascimento/,
        );
        assert.throws(() => montarPayloadDeTexto({ ...CAMPOS, obitoAno: '1800' }), /anterior/);
        assert.throws(() => montarPayloadDeTexto({ ...CAMPOS, md: 'sem título' }), /Nenhum texto/);
    });

    it('é importável: Autor novo nasce com nacionalidade e óbito, textos com fonteTexto', async () => {
        const payload = montarPayloadDeTexto(CAMPOS);
        const db = dbVazio();
        const rel = classificarImportacaoAditiva(payload, db);
        assert.equal(rel.resumo.prontos, 2);

        const r = await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.equal(r.sucesso, true);
        assert.equal(db.poemas.length, 2);
        assert.equal(db.autores.length, 1);
        assert.deepEqual(db.autores[0].obito, { ano: 1900 });
        assert.equal(db.poemas[0].fonteTexto.link, 'https://x.test/a');
        assert.equal(db.poemas[0].fonteTexto.conferido, true);
    });

    it('Autor já cadastrado é casado e o cadastro dele não é alterado', async () => {
        const payload = montarPayloadDeTexto({
            ...CAMPOS,
            nacionalidade: 'outra',
            obitoAno: '1999',
        });
        const db = dbVazio();
        db.autores.push({ id: 7, nome: 'fulano', sobre: 'x' });

        const rel = classificarImportacaoAditiva(payload, db);
        assert.equal(rel.resumo.prontos, 2); // match exato, sem pergunta
        await aplicarImportacaoAditiva(payload, rel, db, deps());

        assert.equal(db.autores.length, 1);
        assert.deepEqual(db.autores[0], { id: 7, nome: 'fulano', sobre: 'x' });
        assert.equal(db.poemas[0].autoria[0].autorId, 7);
    });
});

describe('montarPayloadDeTexto: tipo (Poema ou Prosa)', () => {
    it('sem tipo, tudo continua Poema (com descricaoVisual, campo exclusivo de Poema)', () => {
        for (const tipo of [undefined, '', '  ']) {
            const p = montarPayloadDeTexto({ ...CAMPOS, tipo });
            assert.deepEqual(
                p.itens.map((i) => i.tipo),
                ['poema', 'poema'],
            );
            assert.equal(p.itens[0].descricaoVisual, '');
        }
    });

    it('tipo prosa vale para todos os textos e tira descricaoVisual (só existe em Poema)', () => {
        const p = montarPayloadDeTexto({ ...CAMPOS, tipo: 'prosa' });
        assert.deepEqual(
            p.itens.map((i) => i.tipo),
            ['prosa', 'prosa'],
        );
        assert.equal('descricaoVisual' in p.itens[0], false);
        // o resto do molde é o mesmo do Poema
        const poema = montarPayloadDeTexto({ ...CAMPOS, tipo: 'poema' }).itens[0];
        const semTipoNemVisual = (item) => {
            const copia = { ...item, tipo: null };
            delete copia.descricaoVisual;
            return copia;
        };
        assert.deepEqual(semTipoNemVisual(p.itens[0]), semTipoNemVisual(poema));
    });

    it('recusa tipo desconhecido em vez de virar Poema em silêncio', () => {
        assert.throws(() => montarPayloadDeTexto({ ...CAMPOS, tipo: 'conto' }), /Tipo inválido/);
    });

    it('é importável: a Prosa cai em db.prosas, não em db.poemas', async () => {
        const payload = montarPayloadDeTexto({ ...CAMPOS, tipo: 'prosa' });
        const db = dbVazio();
        const rel = classificarImportacaoAditiva(payload, db);
        assert.equal(rel.resumo.prontos, 2);

        const r = await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.equal(r.sucesso, true);
        assert.equal(db.prosas.length, 2);
        assert.equal(db.poemas.length, 0);
        assert.equal(db.prosas[0].fonteTexto.link, 'https://x.test/a');
    });

    it('duplicata de título é checada na coleção do tipo escolhido', () => {
        const db = dbVazio();
        db.poemas.push({ id: 1, titulo: 'A' });

        const comoProsa = classificarImportacaoAditiva(
            montarPayloadDeTexto({ ...CAMPOS, tipo: 'prosa' }),
            db,
        );
        assert.equal(comoProsa.resumo.prontos, 2); // "A" existe como Poema, não como Prosa

        const comoPoema = classificarImportacaoAditiva(montarPayloadDeTexto(CAMPOS), db);
        assert.equal(comoPoema.resumo.ambiguos, 1);
    });
});
