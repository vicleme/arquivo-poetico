import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Download do Livro (Fase 19, etapa 7, entrega 1): registro, .json, .md e .csv.
// Só as informações do livro, nunca o conteúdo dos textos.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const {
    FORMATO_EXPORTACAO_LIVROS,
    COLUNAS_LIVRO,
    montarRegistroLivro,
    registrosDeLivros,
    gerarJsonLivros,
    gerarMarkdownLivros,
    livroParaMarkdown,
    gerarCsvLivros,
    itensAutoria,
    itensEquipe,
    itensUsoIa,
    itensLojas,
    textoEstrutura,
    FORMATOS_DOWNLOAD_LIVROS,
    nomeArquivoLivro,
    conteudoDoDownloadLivros,
} = await import('../js/exportar-livros.js');

// Leitor de CSV mínimo (RFC 4180): se o que sai não volta idêntico por um
// parser de verdade, o arquivo está errado.
function lerCsv(texto) {
    const limpo = texto.replace(/^\uFEFF/, '');
    const linhas = [];
    let linha = [];
    let celula = '';
    let aspas = false;
    for (let i = 0; i < limpo.length; i++) {
        const c = limpo[i];
        if (aspas) {
            if (c === '"' && limpo[i + 1] === '"') {
                celula += '"';
                i++;
            } else if (c === '"') aspas = false;
            else celula += c;
        } else if (c === '"') aspas = true;
        else if (c === ',') {
            linha.push(celula);
            celula = '';
        } else if (c === '\r' && limpo[i + 1] === '\n') {
            linha.push(celula);
            linhas.push(linha);
            linha = [];
            celula = '';
            i++;
        } else celula += c;
    }
    return linhas;
}

function linhaDoCsv(registros, indice = 0) {
    const [cabecalho, ...corpo] = lerCsv(gerarCsvLivros(registros));
    return Object.fromEntries(cabecalho.map((nome, i) => [nome, corpo[indice][i]]));
}

function banco() {
    return {
        autores: [
            { id: 3, nome: 'Victor Leme' },
            { id: 7, nome: 'Maria Prefácio' },
        ],
        colaboradores: [
            { id: 5, nome: 'Ana Souza', papeisHabituais: ['Capista'], contato: 'ana@exemplo.com' },
            { id: 6, nome: 'Bruno Lima', papeisHabituais: [], contato: '' },
        ],
        poemas: [
            {
                id: 12,
                titulo: 'Capa gerada',
                texto: 'VERSO SECRETO DO POEMA',
                paiTipo: 'parte',
                paiId: 20,
            },
            { id: 13, titulo: 'Outro', texto: 'OUTRO CORPO', paiTipo: 'livro', paiId: 1 },
        ],
        prosas: [{ id: 14, titulo: 'Conto', texto: 'CORPO DA PROSA', paiTipo: 'secao', paiId: 30 }],
        partes: [{ id: 20, titulo: 'Parte I', livroId: 1, sequencia: 1 }],
        secoes: [{ id: 30, titulo: 'Seção A', paiTipo: 'parte', paiId: 20, sequencia: 1 }],
        elementos: [],
        itensColetanea: [],
        livros: [livroCompleto(), { id: 2, titulo: 'Livro Vazio' }],
    };
}

function livroCompleto() {
    return {
        id: 1,
        titulo: 'Livro Um, "o primeiro"',
        sequencia: 1,
        siglaOficial: 'LU',
        siglaPessoal: 'um',
        data: { mes: 3, ano: 2020 },
        dataUltimaEdicao: { ano: 2022 },
        tipo: 'Inéditos',
        fase: 'Fase 1',
        abertura: 'versos de abertura',
        sinopse: 'Linha 1, com vírgula\nLinha 2',
        capaDesc: 'capa azul',
        fraseCapa: 'frase',
        orelha1: 'orelha um',
        orelha2: '',
        contracapa: 'contra',
        isbn13: '978-85-00000-00-0',
        isbn10: '',
        codigoBarrasUrl: '',
        pdfUrl: 'https://exemplo.com/livro.pdf',
        epubUrl: '',
        fichaCatalograficaUrl: '',
        certificadoDireitoAutoralUrl: '',
        cartaExclusividadeUrl: '',
        situacaoEditorial: 'esgotado',
        situacaoDesde: { mes: 5, ano: 2024 },
        situacaoNota: 'Nova edição prevista',
        lojas: [
            { nome: 'Amazon', url: 'https://amazon.exemplo/livro' },
            { nome: 'Sebo', url: '' },
        ],
        capa: 987,
        imagemUrl: 'https://exemplo.com/capa.jpg',
        autoriaLivro: [
            { autorId: 3, papeis: ['Autor', 'Tradutor'] },
            { autorId: 7, papeis: ['Prefaciador'] },
            { autorId: 99, papeis: ['Autor'] },
        ],
        equipeLivro: [
            { colaboradorId: 6, papeis: [{ papel: 'Diagramador' }] },
            {
                colaboradorId: 5,
                papeis: [{ papel: 'Ilustrador', escopo: 'Capa' }, { papel: 'Revisor' }],
            },
        ],
        usoIa: {
            estado: 'usou',
            usos: [
                {
                    onde: 'Capa',
                    ferramenta: 'Midjourney',
                    modelo: 'v6',
                    descricao: 'Gerei a capa',
                    data: { mes: 3, ano: 2025 },
                    texto: { tipo: 'poema', id: 12 },
                    como: 'Gerou do zero',
                },
            ],
            nota: 'Só na capa.',
        },
    };
}

describe('montarRegistroLivro', () => {
    it('copia os campos do cadastro com o mesmo nome e guarda só "tem capa", sem o id da capa', () => {
        const b = banco();
        const r = montarRegistroLivro(b.livros[0], b);
        assert.equal(r.titulo, 'Livro Um, "o primeiro"');
        assert.equal(r.siglaOficial, 'LU');
        assert.deepEqual(r.data, { mes: 3, ano: 2020 });
        assert.equal(r.tem_capa, true);
        assert.equal(r.capa, undefined);
        assert.equal(r.imagemUrl, 'https://exemplo.com/capa.jpg');
        assert.deepEqual(r.lojas, b.livros[0].lojas);
    });

    it('livro sem capa sai com tem_capa false', () => {
        const b = banco();
        assert.equal(montarRegistroLivro(b.livros[1], b).tem_capa, false);
    });

    it('autoria e equipe saem por nome, na ordem dos vínculos, sem ids e sem dados do cadastro', () => {
        const b = banco();
        const r = montarRegistroLivro(b.livros[0], b);
        assert.deepEqual(r.autoria_livro, [
            { autor: 'Victor Leme', papeis: ['Autor', 'Tradutor'] },
            { autor: 'Maria Prefácio', papeis: ['Prefaciador'] },
        ]);
        assert.deepEqual(r.equipe_livro, [
            { colaborador: 'Bruno Lima', papeis: [{ papel: 'Diagramador' }] },
            {
                colaborador: 'Ana Souza',
                papeis: [{ papel: 'Ilustrador', escopo: 'Capa' }, { papel: 'Revisor' }],
            },
        ]);
        assert.equal(r.autoriaLivro, undefined);
        assert.equal(r.equipeLivro, undefined);
        assert.doesNotMatch(JSON.stringify(r), /colaboradorId|autorId|ana@exemplo/);
    });

    it('uso de IA sai com o título do texto no lugar do id', () => {
        const b = banco();
        const r = montarRegistroLivro(b.livros[0], b);
        assert.equal(r.uso_ia.estado, 'usou');
        assert.deepEqual(r.uso_ia.usos[0].texto, { tipo: 'poema', titulo: 'Capa gerada' });
        assert.equal(r.uso_ia.nota, 'Só na capa.');
        assert.equal(r.usoIa, undefined);
    });

    it('estado desconhecido nunca vira afirmação: livro sem autoria, equipe e uso de IA não ganha as chaves', () => {
        const b = banco();
        const r = montarRegistroLivro(b.livros[1], b);
        assert.equal('autoria_livro' in r, false);
        assert.equal('equipe_livro' in r, false);
        assert.equal('uso_ia' in r, false);
    });

    it('conta a estrutura, mas nunca leva o conteúdo dos textos', () => {
        const b = banco();
        const r = montarRegistroLivro(b.livros[0], b);
        assert.deepEqual(r.estrutura, {
            partes: 1,
            secoes: 1,
            poemas: 2,
            prosas: 1,
            elementos: 0,
            itens: 0,
        });
        const tudo = [gerarJsonLivros([r]), gerarMarkdownLivros([r]), gerarCsvLivros([r])].join(
            '\n',
        );
        assert.doesNotMatch(tudo, /VERSO SECRETO|OUTRO CORPO|CORPO DA PROSA/);
    });

    it('não divide objeto com o acervo', () => {
        const b = banco();
        const r = montarRegistroLivro(b.livros[0], b);
        r.lojas[0].nome = 'Alterada';
        r.data.ano = 1900;
        assert.equal(b.livros[0].lojas[0].nome, 'Amazon');
        assert.equal(b.livros[0].data.ano, 2020);
    });

    it('registrosDeLivros mantém a ordem recebida', () => {
        const b = banco();
        const rs = registrosDeLivros([b.livros[1], b.livros[0]], b);
        assert.deepEqual(
            rs.map((r) => r.id),
            [2, 1],
        );
    });
});

describe('.json', () => {
    it('envelope próprio, para não se confundir com outras seleções', () => {
        const b = banco();
        const json = JSON.parse(gerarJsonLivros(registrosDeLivros(b.livros, b)));
        assert.equal(json.export_format, FORMATO_EXPORTACAO_LIVROS);
        assert.equal(FORMATO_EXPORTACAO_LIVROS, 'selecao_livros');
        assert.equal(json.itens.length, 2);
    });
});

describe('textos de apoio', () => {
    it('autoria, equipe, uso de IA, lojas e estrutura', () => {
        const b = banco();
        const r = montarRegistroLivro(b.livros[0], b);
        assert.deepEqual(itensAutoria(r), [
            'Victor Leme (Autor, Tradutor)',
            'Maria Prefácio (Prefaciador)',
        ]);
        assert.deepEqual(itensEquipe(r), [
            'Bruno Lima (Diagramador)',
            'Ana Souza (Ilustrador: Capa, Revisor)',
        ]);
        assert.deepEqual(itensLojas(r), ['Amazon [https://amazon.exemplo/livro]', 'Sebo']);
        const [uso] = itensUsoIa(r);
        assert.match(uso, /^Capa: Midjourney v6, 03\/2025 \(Gerou do zero\)/);
        assert.match(uso, /Gerei a capa/);
        assert.match(uso, /\[poema: Capa gerada\]$/);
        assert.equal(textoEstrutura(r), '1 parte, 1 seção, 2 poemas, 1 prosa');
        assert.equal(textoEstrutura(montarRegistroLivro(b.livros[1], b)), 'Sem conteúdo');
    });
});

describe('.md', () => {
    it('livro completo: informações, autoria, equipe, uso de IA e textos do livro', () => {
        const b = banco();
        const md = livroParaMarkdown(montarRegistroLivro(b.livros[0], b));
        assert.match(md, /^## Livro Um, "o primeiro"\n/);
        assert.match(md, /- \*\*Sigla oficial:\*\* LU/);
        assert.match(md, /- \*\*Primeira publicação:\*\* 03\/2020/);
        assert.match(md, /- \*\*Última edição:\*\* 2022/);
        assert.match(md, /- \*\*ISBN-13:\*\* 978-85-00000-00-0/);
        assert.match(
            md,
            /- \*\*Situação editorial:\*\* Esgotado desde 05\/2024\. Nova edição prevista/,
        );
        assert.match(
            md,
            /- \*\*Autoria:\*\* Victor Leme \(Autor, Tradutor\); Maria Prefácio \(Prefaciador\)/,
        );
        assert.match(
            md,
            /- \*\*Equipe e créditos:\*\* Bruno Lima \(Diagramador\); Ana Souza \(Ilustrador: Capa, Revisor\)/,
        );
        assert.match(md, /- \*\*Capa:\*\* tem capa/);
        assert.match(md, /- \*\*Lojas:\*\* Amazon \[https:\/\/amazon\.exemplo\/livro\]; Sebo/);
        assert.match(md, /- \*\*Conteúdo:\*\* 1 parte, 1 seção, 2 poemas, 1 prosa/);
        assert.match(md, /\*\*Uso de IA:\*\* Usou\n\n- Capa: Midjourney v6/);
        assert.match(md, /\nSó na capa\.\n/);
        assert.match(md, /\*\*Sinopse:\*\*\n\nLinha 1, com vírgula\nLinha 2\n/);
        assert.match(md, /\*\*Orelha 1:\*\*\n\norelha um\n/);
    });

    it('campo vazio não aparece, e o travessão não é usado', () => {
        const b = banco();
        const md = livroParaMarkdown(montarRegistroLivro(b.livros[0], b));
        assert.doesNotMatch(md, /ISBN-10|Orelha 2|Código de barras/);
        assert.doesNotMatch(md, /—/);
    });

    it('livro vazio: título e conteúdo, sem inventar situação, autoria ou uso de IA', () => {
        const b = banco();
        const md = livroParaMarkdown(montarRegistroLivro(b.livros[1], b));
        assert.match(md, /^## Livro Vazio\n/);
        assert.match(md, /- \*\*Conteúdo:\*\* Sem conteúdo/);
        assert.doesNotMatch(md, /Situação editorial|Autoria|Equipe|Uso de IA|Capa:/);
    });

    it('vários livros: um título nível 1 e blocos separados por ---', () => {
        const b = banco();
        const md = gerarMarkdownLivros(registrosDeLivros(b.livros, b));
        assert.match(md, /^# Livros\n\n## Livro Um/);
        assert.equal(md.split('\n---\n').length, 2);
    });

    it('nota de uso de IA sem estado sai sozinha, como "Não informado"', () => {
        const b = banco();
        const l = { id: 3, titulo: 'So nota', usoIa: { nota: 'Usei para ideias' } };
        const md = livroParaMarkdown(montarRegistroLivro(l, { ...b, livros: [l] }));
        assert.match(md, /\*\*Uso de IA:\*\* Não informado/);
        assert.match(md, /Usei para ideias/);
    });
});

describe('.csv', () => {
    it('cabeçalhos únicos e mesmo nº de colunas em toda linha', () => {
        const b = banco();
        const nomes = COLUNAS_LIVRO.map((c) => c.cabecalho);
        assert.equal(new Set(nomes).size, nomes.length);
        const tabela = lerCsv(gerarCsvLivros(registrosDeLivros(b.livros, b)));
        assert.equal(tabela.length, 3);
        assert.ok(tabela.every((l) => l.length === nomes.length));
    });

    it('uma linha por livro, com valores simples, datas em três colunas e texto com vírgula e quebra de linha', () => {
        const b = banco();
        const l = linhaDoCsv(registrosDeLivros(b.livros, b), 0);
        assert.equal(l.id, '1');
        assert.equal(l.titulo, 'Livro Um, "o primeiro"');
        assert.equal(l.publicacao_ano, '2020');
        assert.equal(l.publicacao_mes, '3');
        assert.equal(l.publicacao_dia, '');
        assert.equal(l.ultima_edicao_ano, '2022');
        assert.equal(l.situacao_editorial, 'esgotado');
        assert.equal(l.situacao_desde_mes, '5');
        assert.equal(l.tem_capa, 'true');
        assert.equal(l.link_imagem, 'https://exemplo.com/capa.jpg');
        assert.equal(l.sinopse, 'Linha 1, com vírgula\nLinha 2');
    });

    it('listas viram " | " e nada sai por id', () => {
        const b = banco();
        const l = linhaDoCsv(registrosDeLivros(b.livros, b), 0);
        assert.equal(l.autoria, 'Victor Leme (Autor, Tradutor) | Maria Prefácio (Prefaciador)');
        assert.equal(l.equipe, 'Bruno Lima (Diagramador) | Ana Souza (Ilustrador: Capa, Revisor)');
        assert.equal(l.lojas, 'Amazon [https://amazon.exemplo/livro] | Sebo');
        assert.equal(l.uso_ia_estado, 'usou');
        assert.match(l.uso_ia, /^Capa: Midjourney v6, 03\/2025 \(Gerou do zero\)/);
        assert.equal(l.uso_ia_nota, 'Só na capa.');
        assert.equal(l.total_partes, '1');
        assert.equal(l.total_poemas, '2');
        assert.equal(l.total_prosas, '1');
    });

    it('livro vazio: células vazias, tem_capa false e contagens zeradas, sem afirmar situação nem uso de IA', () => {
        const b = banco();
        const l = linhaDoCsv(registrosDeLivros(b.livros, b), 1);
        assert.equal(l.titulo, 'Livro Vazio');
        assert.equal(l.tem_capa, 'false');
        assert.equal(l.situacao_editorial, '');
        assert.equal(l.autoria, '');
        assert.equal(l.equipe, '');
        assert.equal(l.uso_ia_estado, '');
        assert.equal(l.total_poemas, '0');
    });

    it('começa com BOM e termina com CRLF', () => {
        const b = banco();
        const csv = gerarCsvLivros(registrosDeLivros(b.livros, b));
        assert.ok(csv.startsWith('\uFEFF'));
        assert.ok(csv.endsWith('\r\n'));
    });
});

describe('formato, nome do arquivo e conteúdo', () => {
    it('formatos da etapa 7: json, md e csv', () => {
        assert.deepEqual(FORMATOS_DOWNLOAD_LIVROS, ['json', 'md', 'csv']);
    });

    it('nome do arquivo: sem acento, minúsculo, só letras, números e hífen', () => {
        assert.equal(nomeArquivoLivro('Livro Um, "o primeiro"'), 'livro-um-o-primeiro');
        assert.equal(nomeArquivoLivro('Coração & Razão!'), 'coracao-razao');
        assert.equal(nomeArquivoLivro('  '), 'sem-titulo');
        assert.equal(nomeArquivoLivro(undefined), 'sem-titulo');
    });

    it('conteúdo de cada formato, com mime e extensão', () => {
        const b = banco();
        const rs = registrosDeLivros([b.livros[0]], b);
        const json = conteudoDoDownloadLivros(rs, 'json');
        assert.equal(json.extensao, 'json');
        assert.equal(json.mime, 'application/json');
        assert.equal(JSON.parse(json.conteudo).export_format, 'selecao_livros');
        const md = conteudoDoDownloadLivros(rs, 'md');
        assert.equal(md.extensao, 'md');
        assert.equal(md.mime, 'text/markdown');
        assert.match(md.conteudo, /^# Livros/);
        const csv = conteudoDoDownloadLivros(rs, 'csv');
        assert.equal(csv.extensao, 'csv');
        assert.equal(csv.mime, 'text/csv');
        assert.ok(csv.conteudo.startsWith('\uFEFF'));
    });

    it('formato que não existe devolve null (pdf e docx só na etapa 8)', () => {
        assert.equal(conteudoDoDownloadLivros([], 'pdf'), null);
        assert.equal(conteudoDoDownloadLivros([], 'docx'), null);
        assert.equal(conteudoDoDownloadLivros([], undefined), null);
    });
});

// ─── Consistência com o cadastro ──────────────────────────────────
// Lê forms.js como texto e compara com as colunas: campo novo no Livro sem
// coluna no .csv faz este teste falhar, em vez de o campo sumir do download
// em silêncio.

function chavesDoLivroSalvo() {
    const fonte = fs.readFileSync(path.join(RAIZ, 'js', 'forms.js'), 'utf8');
    const marcador = "titulo: document.getElementById('l-titulo').value";
    const meio = fonte.indexOf(marcador);
    assert.ok(meio > -1, 'marcador do salvar do Livro não encontrado em forms.js');
    const ini = fonte.lastIndexOf('const dados = {', meio);
    const fim = fonte.indexOf('\n    };', ini);
    return [...fonte.slice(ini, fim).matchAll(/^ {8}(\w+)[:,]/gm)].map((m) => m[1]);
}

describe('consistência: todo campo do Livro tem coluna no .csv', () => {
    it('cada chave gravada pelo salvar do Livro é consumida por alguma coluna', () => {
        const chaves = chavesDoLivroSalvo();
        assert.ok(chaves.length > 20, 'não extraiu as chaves de `dados`');
        const cobertos = new Set(COLUNAS_LIVRO.flatMap((c) => c.campos));
        const faltando = chaves.filter((k) => !cobertos.has(k));
        assert.deepEqual(faltando, [], `campos de Livro sem coluna no .csv: ${faltando}`);
    });

    it('as três chaves que guardam ids (autoriaLivro, equipeLivro, usoIa) e a capa estão cobertas por coluna resolvida', () => {
        const cobertos = new Set(COLUNAS_LIVRO.flatMap((c) => c.campos));
        ['capa', 'autoriaLivro', 'equipeLivro', 'usoIa'].forEach((k) =>
            assert.ok(cobertos.has(k), `${k} sem coluna`),
        );
    });
});
