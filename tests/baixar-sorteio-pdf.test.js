import './helpers/dom-real.js';
import './helpers/localstorage-shim.js';
import { instalarJsPdfFalso, removerJsPdfFalso } from './helpers/jspdf-shim.js';

// Download do texto sorteado em .pdf: mesmo conteúdo do .md, sem campo privado,
// com o corpo desenhado pelo desenhista do Arquivo e o jsPDF carregado sob demanda.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    gerarPdfSorteio,
    baixarPdfSorteio,
    carregarJsPdf,
    MENSAGEM_SEM_JSPDF,
} from '../js/baixar-sorteio-pdf.js';

const poema = (extra = {}) => ({
    id: 1,
    titulo: 'Horizonte de eventos',
    texto: 'verso um\nverso **dois**\nverso três',
    status: 'publicado',
    sorteavel: true,
    ...extra,
});
const dbDe = (...poemas) => ({ temas: [], poemas, prosas: [], autores: [] });
const textos = (doc) => doc.chamadas.filter((c) => c.tipo === 'text').map((c) => c.texto);
const tudo = (doc) => textos(doc).join(' | ');

beforeEach(() => {
    globalThis.window = globalThis.window || {};
    instalarJsPdfFalso();
});
afterEach(() => removerJsPdfFalso());

describe('gerarPdfSorteio', () => {
    it('título em negrito grande, tipo e extensão, texto e ficha, nessa ordem', () => {
        const item = poema();
        const doc = gerarPdfSorteio(dbDe(item), 'poema', item);
        const titulo = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === item.titulo);
        assert.equal(titulo.tamanho, 18);
        assert.equal(titulo.fonte.estilo, 'bold');
        const ordem = ['Poema · 3 versos', 'verso | um', 'verso | três', 'Ficha'].map((x) =>
            tudo(doc).indexOf(x),
        );
        assert.ok(
            ordem.every((i) => i >= 0),
            String(ordem),
        );
        assert.deepEqual(
            [...ordem].sort((a, b) => a - b),
            ordem,
        );
        assert.match(tudo(doc), /Status: .*Publicado/);
    });
    it('a ficha vai antes do texto quando a tela a põe antes', () => {
        const item = poema();
        const doc = gerarPdfSorteio(dbDe(item), 'poema', item, { fichaAntes: true });
        assert.ok(tudo(doc).indexOf('Ficha') < tudo(doc).indexOf('verso | um'));
    });
    it('nada privado vaza: Notas e Inspiração privadas, comentário do editor e outros campos', () => {
        const item = poema({
            texto: 'verso <!-- SEGREDO DO EDITOR -->limpo',
            notas: 'NOTA PRIVADA',
            contextoHistorico: 'INSPIRACAO PRIVADA',
            vocabularioHiperacionante: 'VOCAB',
            escansao: { grade: 'ESCANSAO' },
        });
        const saida = tudo(gerarPdfSorteio(dbDe(item), 'poema', item));
        ['NOTA PRIVADA', 'INSPIRACAO PRIVADA', 'SEGREDO DO EDITOR', 'VOCAB', 'ESCANSAO'].forEach(
            (x) => assert.ok(!saida.includes(x), x),
        );
        assert.match(saida, /verso/);
        assert.match(saida, /limpo/);
    });
    it('traz o que o autor deixou para o leitor e o paratexto, com link só http e https', () => {
        const item = poema({
            comentariosPublicos: 'Escrito de madrugada.\nSegunda linha.',
            inspiracaoPublica: true,
            contextoHistorico: 'Vi um eclipse.',
            anexos: [
                { tipo: 'Áudio', texto: 'Leitura', link: 'https://exemplo.com/a' },
                { texto: 'Ruim', link: 'javascript:alert(1)' },
            ],
        });
        const saida = tudo(gerarPdfSorteio(dbDe(item), 'poema', item));
        assert.match(saida, /Comentários ao leitor/);
        assert.match(saida, /Escrito de madrugada\./);
        assert.match(saida, /Segunda linha\./);
        assert.match(saida, /Vi um eclipse\./);
        assert.match(saida, /Áudio: Leitura · https:\/\/exemplo\.com\/a/);
        assert.ok(!saida.includes('javascript:'));
    });
    it('o corpo mantém a cor do texto, como no PDF do Arquivo', () => {
        const item = poema({ texto: '<div style="color:#ff0000;">vermelho</div>' });
        const doc = gerarPdfSorteio(dbDe(item), 'poema', item);
        assert.ok(doc.chamadas.some((c) => c.tipo === 'setTextColor' && c.r === 255 && c.g === 0));
        assert.match(tudo(doc), /vermelho/);
    });
    it('texto longo passa para outra página, sempre em retrato', () => {
        const item = poema({
            texto: Array.from({ length: 120 }, (_, i) => `verso número ${i + 1}`).join('\n'),
        });
        const doc = gerarPdfSorteio(dbDe(item), 'poema', item);
        assert.ok(doc.paginas > 1);
        doc.chamadas
            .filter((c) => c.tipo === 'addPage')
            .forEach((c) => assert.equal(c.orientacao, 'portrait'));
    });
    it('título vazio vira "Sem título"; sem jsPDF carregado, lança a mensagem da biblioteca', () => {
        const item = poema({ titulo: ' ' });
        assert.ok(tudo(gerarPdfSorteio(dbDe(item), 'poema', item)).startsWith('Sem título'));
        removerJsPdfFalso();
        assert.throws(() => gerarPdfSorteio(dbDe(item), 'poema', item), {
            message: MENSAGEM_SEM_JSPDF,
        });
    });
});

describe('baixarPdfSorteio', () => {
    it('carrega a biblioteca, monta o PDF e salva com o título no nome', async () => {
        const item = poema();
        const passos = [];
        await baixarPdfSorteio(
            dbDe(item),
            'poema',
            item,
            {},
            {
                carregar: async () => passos.push('carregou'),
                salvar: (doc, nome) => passos.push(['salvou', nome, doc.paginas]),
            },
        );
        assert.deepEqual(passos, ['carregou', ['salvou', 'horizonte-de-eventos.pdf', 1]]);
    });
    it('sem opção de salvar, usa o save do jsPDF', async () => {
        const item = poema();
        let doc;
        const Original = window.jspdf.jsPDF;
        window.jspdf.jsPDF = class extends Original {
            constructor(...args) {
                super(...args);
                doc = this;
            }
        };
        await baixarPdfSorteio(dbDe(item), 'poema', item);
        assert.deepEqual(doc.chamadas.at(-1), {
            tipo: 'save',
            nomeArquivo: 'horizonte-de-eventos.pdf',
        });
    });
    it('falha de carregamento recusa a Promise e não salva nada', async () => {
        const item = poema();
        let salvou = false;
        await assert.rejects(
            baixarPdfSorteio(
                dbDe(item),
                'poema',
                item,
                {},
                {
                    carregar: async () => {
                        throw new Error(MENSAGEM_SEM_JSPDF);
                    },
                    salvar: () => (salvou = true),
                },
            ),
            { message: MENSAGEM_SEM_JSPDF },
        );
        assert.equal(salvou, false);
    });
});

describe('carregarJsPdf', () => {
    it('com a biblioteca já na página, resolve sem mexer no documento', async () => {
        const antes = document.head.children.length;
        await carregarJsPdf();
        assert.equal(document.head.children.length, antes);
    });
    it('sem ela, acrescenta o script do CDN; falha de rede recusa e o clique seguinte tenta de novo', async () => {
        removerJsPdfFalso();
        const original = document.head.appendChild;
        const tags = [];
        document.head.appendChild = (tag) => {
            tags.push(tag);
            queueMicrotask(() => (tags.length === 1 ? tag.onerror() : tag.onload()));
            return tag;
        };
        try {
            await assert.rejects(carregarJsPdf(), { message: MENSAGEM_SEM_JSPDF });
            await carregarJsPdf();
            assert.equal(tags.length, 2);
            assert.match(tags[0].src, /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\//);
        } finally {
            document.head.appendChild = original;
        }
    });
});
