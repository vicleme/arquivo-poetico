import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
    separarTextos,
    montarPacote,
    montarPacoteDeSelecao,
    montarIndice,
    escolherFonte,
} from '../scripts/montar-pacote.js';
import { classificarImportacaoAditiva, aplicarImportacaoAditiva } from '../js/importar-aditivo.js';

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

const META = {
    id: 'teste',
    titulo: 'Teste',
    autor: { nome: 'Fulano', nacionalidade: 'Brasileira', obito: { ano: 1900 } },
    fonte: 'Fonte X',
    edicao: 'Ed. Y',
    conferido: true,
};

describe('separarTextos', () => {
    it('divide por "# Título" e preserva as quebras de estrofe', () => {
        const r = separarTextos('# A\nv1\nv2\n\nv3\n\n# B\nx\n');
        assert.deepEqual(r, [
            { titulo: 'A', texto: 'v1\nv2\n\nv3\n' },
            { titulo: 'B', texto: 'x\n' },
        ]);
    });

    it('ignora texto antes do primeiro título e textos vazios', () => {
        const r = separarTextos('lixo\n# A\n\n# B\nx\n');
        assert.deepEqual(r, [{ titulo: 'B', texto: 'x\n' }]);
    });
});

describe('montarPacote', () => {
    it('grava a proveniência em fonteTexto (não em notas) e marca o autor de cada item', () => {
        const p = montarPacote('# A\nv\n', META);
        assert.equal(p.itens.length, 1);
        assert.deepEqual(p.itens[0].fonteTexto, {
            origem: 'Fonte X',
            edicao: 'Ed. Y',
            link: '',
            conferido: true,
            grafia: '',
        });
        assert.equal(p.itens[0].notas, '');
        assert.equal(p.itens[0].autoria[0].nome, 'Fulano');
        assert.equal(p.autores[0].id, p.itens[0].autoria[0].autorId);
    });

    it('meta.textos sobrescreve a proveniência de um texto pelo título', () => {
        const meta = { ...META, link: '', textos: { A: { link: 'https://x.test/a' } } };
        const p = montarPacote('# A\nv\n\n# B\nw\n', meta);
        assert.equal(p.itens[0].fonteTexto.link, 'https://x.test/a');
        assert.equal(p.itens[0].fonteTexto.origem, 'Fonte X');
        assert.equal(p.itens[1].fonteTexto.link, '');
    });

    it('conferido nasce false quando o meta não diz que foi conferido', () => {
        const p = montarPacote('# A\nv\n', { ...META, conferido: false });
        assert.equal(p.itens[0].fonteTexto.conferido, false);
    });

    it('fonteTexto sobrevive à Importação Aditiva', async () => {
        const payload = montarPacote('# A\nv\n', META);
        const db = dbVazio();
        await aplicarImportacaoAditiva(
            payload,
            classificarImportacaoAditiva(payload, db),
            db,
            deps(),
        );
        assert.equal(db.poemas[0].fonteTexto.origem, 'Fonte X');
        assert.equal(db.poemas[0].fonteTexto.conferido, true);
    });

    it('recusa entrada inválida', () => {
        assert.throws(() => montarPacote('sem título', META), /Nenhum texto/);
        assert.throws(() => montarPacote('# A\nv', { ...META, id: 'Inválido!' }), /meta\.id/);
        assert.throws(() => montarPacote('# A\nv', { ...META, autor: {} }), /autor\.nome/);
    });

    it('recusa o formato de SAÍDA (pacote/autor aninhados) com mensagem que aponta a causa', () => {
        const metaAninhado = {
            pacote: { id: 'teste', titulo: 'Teste' },
            autor: { nome: 'Fulano' },
        };
        assert.throws(() => montarPacote('# A\nv', metaAninhado), /formato de SAÍDA/);
    });

    it('recusa nascimento/obito como string em vez de { dia?, mes?, ano }', () => {
        assert.throws(
            () =>
                montarPacote('# A\nv', { ...META, autor: { nome: 'Fulano', obito: '1900-01-01' } }),
            /autor\.obito.*objeto/,
        );
        assert.throws(
            () =>
                montarPacote('# A\nv', {
                    ...META,
                    autor: { nome: 'Fulano', nascimento: '1850-01-01', obito: { ano: 1900 } },
                }),
            /autor\.nascimento.*objeto/,
        );
    });

    it('meta.ortografia vira fonteTexto.grafia (normalizado); meta.textos sobrescreve por texto', () => {
        const p1 = montarPacote('# A\nv\n', { ...META, ortografia: 'original' });
        assert.equal(p1.itens[0].fonteTexto.grafia, 'etimológica');

        // Texto presente ("atualizada") mas sem bater em nenhuma tradição
        // antiga vira GRAFIA_ATUAL ('atual') — decisão explícita do pacote,
        // não "nunca definida" (essa só pra ortografia vazia/ausente).
        const p2 = montarPacote('# A\nv\n', { ...META, ortografia: 'atualizada' });
        assert.equal(p2.itens[0].fonteTexto.grafia, 'atual');

        const meta = {
            ...META,
            ortografia: 'original',
            textos: { B: { grafia: 'atualizada' } },
        };
        const p3 = montarPacote('# A\nv\n\n# B\nw\n', meta);
        assert.equal(p3.itens[0].fonteTexto.grafia, 'etimológica');
        assert.equal(p3.itens[1].fonteTexto.grafia, 'atual');
    });
});

describe('montarPacoteDeSelecao', () => {
    const SELECAO = {
        export_format: 'selecao',
        itens: [
            {
                id: 77,
                tipo: 'poema',
                titulo: 'A',
                texto: 'v1\nv2\n',
                idioma: 'pt-BR',
                notas: 'anotação particular',
                pendencia: 'revisar',
                pessoas: [{ pessoaId: 3, papel: 'Dedicatário(a)', nome: 'Alguém' }],
                livrosIds: [2],
                autoavaliacao: 'fraco',
                autoclassificacao: 4,
                fonteTexto: {
                    origem: 'Escritas.org',
                    edicao: 'Eu (1912)',
                    link: 'https://x.test/a',
                    conferido: true,
                },
                autoria: [{ autorId: 9, papel: 'Autor', nome: 'Fulano' }],
            },
            { id: 78, tipo: 'prosa', titulo: 'B', texto: 'parágrafo\n' },
        ],
    };

    it('mantém título, texto, tipo, idioma e a proveniência de cada item', () => {
        const p = montarPacoteDeSelecao(SELECAO, META);
        assert.equal(p.export_format, 'biblioteca');
        assert.equal(p.pacote.id, 'teste');
        assert.deepEqual(
            p.itens.map((i) => [i.id, i.tipo, i.titulo, i.texto]),
            [
                [1, 'poema', 'A', 'v1\nv2\n'],
                [2, 'prosa', 'B', 'parágrafo\n'],
            ],
        );
        assert.deepEqual(p.itens[0].fonteTexto, {
            origem: 'Escritas.org',
            edicao: 'Eu (1912)',
            link: 'https://x.test/a',
            conferido: true,
            grafia: '',
        });
    });

    it('descarta os campos pessoais e reescreve a autoria como a do pacote', () => {
        const p = montarPacoteDeSelecao(SELECAO, META);
        const item = p.itens[0];
        assert.equal(item.notas, '');
        assert.equal(item.pendencia, '');
        assert.deepEqual(item.pessoas, []);
        assert.deepEqual(item.livrosIds, []);
        assert.equal(item.autoavaliacao, '');
        assert.equal(item.autoclassificacao, 0);
        assert.deepEqual(item.autoria, [{ autorId: 1, papel: 'Autor', nome: 'Fulano' }]);
        assert.equal(item.autoria[0].autorId, p.autores[0].id);
    });

    it('cai no meta quando o item não traz fonte, e meta.textos vence os dois', () => {
        const textos = { A: { link: 'https://só-a' } };
        const meta = { ...META, link: 'https://geral.test', textos };
        const p = montarPacoteDeSelecao(SELECAO, meta);
        assert.equal(p.itens[0].fonteTexto.link, 'https://só-a');
        assert.deepEqual(p.itens[1].fonteTexto, {
            origem: 'Fonte X',
            edicao: 'Ed. Y',
            link: 'https://geral.test',
            conferido: true,
            grafia: '',
        });
    });

    it('grafia do item da seleção vence a do meta; sem nenhuma, cai no meta.ortografia', () => {
        const selecaoComGrafia = {
            ...SELECAO,
            itens: [
                {
                    ...SELECAO.itens[0],
                    fonteTexto: { ...SELECAO.itens[0].fonteTexto, grafia: 'original' },
                },
                SELECAO.itens[1],
            ],
        };
        const meta = { ...META, ortografia: 'atualizada' };
        const p = montarPacoteDeSelecao(selecaoComGrafia, meta);
        assert.equal(p.itens[0].fonteTexto.grafia, 'etimológica');
        // item[1] cai no meta.ortografia ("atualizada", texto presente) →
        // GRAFIA_ATUAL, não "nunca definida".
        assert.equal(p.itens[1].fonteTexto.grafia, 'atual');
    });

    it('recusa seleção sem itens, item vazio, título repetido e autoria alheia', () => {
        assert.throws(() => montarPacoteDeSelecao({ itens: [] }, META), /itens/);
        assert.throws(
            () => montarPacoteDeSelecao({ itens: [{ titulo: 'A', texto: '  ' }] }, META),
            /sem título ou sem texto/,
        );
        assert.throws(
            () =>
                montarPacoteDeSelecao(
                    {
                        itens: [
                            { titulo: 'A', texto: 'v' },
                            { titulo: 'A', texto: 'w' },
                        ],
                    },
                    META,
                ),
            /repetidos/,
        );
        assert.throws(
            () =>
                montarPacoteDeSelecao(
                    {
                        itens: [{ titulo: 'A', texto: 'v', autoria: [{ nome: 'Victor Leme' }] }],
                    },
                    META,
                ),
            /Autoria diferente/,
        );
    });

    it('aceita o array de itens direto e valida o meta como o caminho do .md', () => {
        const p = montarPacoteDeSelecao(SELECAO.itens, META);
        assert.equal(p.itens.length, 2);
        assert.throws(
            () => montarPacoteDeSelecao(SELECAO, { ...META, id: 'Inválido!' }),
            /meta\.id/,
        );
        assert.throws(() => montarPacoteDeSelecao(SELECAO, { ...META, autor: {} }), /autor\.nome/);
    });

    it('o pacote da seleção atravessa a Importação Aditiva', async () => {
        const payload = montarPacoteDeSelecao(SELECAO, META);
        const db = dbVazio();
        await aplicarImportacaoAditiva(
            payload,
            classificarImportacaoAditiva(payload, db),
            db,
            deps(),
        );
        assert.equal(db.poemas.length, 1);
        assert.equal(db.prosas.length, 1);
        assert.equal(db.poemas[0].fonteTexto.origem, 'Escritas.org');
        assert.equal(db.autores.length, 1);
    });
});

describe('escolherFonte', () => {
    const existe = (lista) => (p) => lista.includes(p);

    it('acha o .md ou o .json a partir do nome-base', () => {
        assert.deepEqual(escolherFonte('f/x', existe(['f/x.md'])), {
            base: 'f/x',
            tipo: 'md',
            caminho: 'f/x.md',
        });
        assert.deepEqual(escolherFonte('f/x', existe(['f/x.json'])), {
            base: 'f/x',
            tipo: 'selecao',
            caminho: 'f/x.json',
        });
    });

    it('a extensão informada decide, sem olhar o disco', () => {
        assert.equal(escolherFonte('f/x.json', existe(['f/x.md', 'f/x.json'])).tipo, 'selecao');
        assert.equal(escolherFonte('f/x.md', existe(['f/x.md', 'f/x.json'])).tipo, 'md');
        assert.equal(escolherFonte('f/x.meta.json', existe(['f/x.md'])).tipo, 'md');
    });

    it('recusa os dois ao mesmo tempo sem extensão, e recusa a ausência dos dois', () => {
        assert.throws(() => escolherFonte('f/x', existe(['f/x.md', 'f/x.json'])), /Existem/);
        assert.throws(() => escolherFonte('f/x', existe([])), /Não encontrei/);
    });
});

describe('Importação Aditiva de um pacote', () => {
    it('cria o Autor com nacionalidade e óbito do pacote', async () => {
        const payload = montarPacote('# A\nv\n\n# B\nw\n', META);
        const db = dbVazio();
        const rel = classificarImportacaoAditiva(payload, db);
        assert.equal(rel.resumo.prontos, 2);

        const r = await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.equal(r.sucesso, true);
        assert.equal(db.poemas.length, 2);
        assert.equal(db.autores.length, 1); // um Autor só, mesmo com 2 textos
        assert.equal(db.autores[0].nacionalidade, 'Brasileira');
        assert.deepEqual(db.autores[0].obito, { ano: 1900 });
        assert.equal(db.poemas[0].autoria[0].autorId, db.autores[0].id);
    });

    it('Exportação comum (sem `autores` no payload) continua criando Autor só com nome', async () => {
        const payload = montarPacote('# A\nv\n', META);
        delete payload.autores;
        const db = dbVazio();
        const rel = classificarImportacaoAditiva(payload, db);
        await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.deepEqual(Object.keys(db.autores[0]).sort(), ['id', 'nome', 'sobre']);
    });

    it('segundo import do mesmo autor casa com o Autor já cadastrado e pergunta sobre a duplicata', async () => {
        const payload = montarPacote('# A\nv\n', META);
        const db = dbVazio();
        await aplicarImportacaoAditiva(
            payload,
            classificarImportacaoAditiva(payload, db),
            db,
            deps(),
        );

        const rel2 = classificarImportacaoAditiva(payload, db);
        const campos = rel2.itensOrigem[0].referencias.map((r) => r.campo).sort();
        assert.deepEqual(campos, ['autores', 'duplicataTitulo']);
        assert.equal(rel2.itensOrigem[0].status, 'ambiguo'); // nunca decide duplicata sozinho
    });
});

describe('pacotes que acompanham o app', () => {
    it('indice.json bate com os arquivos de biblioteca/', () => {
        const indice = JSON.parse(fs.readFileSync('biblioteca/indice.json', 'utf-8'));
        assert.deepEqual(montarIndice('biblioteca'), indice);
    });

    it('cada pacote é importável e tem autor com óbito', () => {
        for (const p of montarIndice('biblioteca').pacotes) {
            const payload = JSON.parse(fs.readFileSync(`biblioteca/${p.arquivo}.json`, 'utf-8'));
            const rel = classificarImportacaoAditiva(payload, dbVazio());
            assert.equal(rel.resumo.comErro, 0, p.id);
            assert.ok(
                payload.autores.every((a) => a.obito?.ano),
                `${p.id}: autor sem óbito`,
            );
        }
    });
});
