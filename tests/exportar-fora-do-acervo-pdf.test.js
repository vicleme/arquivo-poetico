import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Relatório do Fora do acervo em .pdf (T9, entrega 11 de 13): o PDF lê o mesmo
// Markdown do .md, então os testes conferem o que foi desenhado, o recuo, o
// negrito, as trocas de símbolos, a paginação e o nome do arquivo.

const { montarForaDoAcervo } = await import('../js/fora-do-acervo.js');
const { criarDataObra } = await import('../js/data-da-obra.js');
const {
    gerarPdfForaDoAcervo,
    interpretarLinhaForaDoAcervo,
    partirNegrito,
    textoParaPdfForaDoAcervo,
    nomeDoPdfForaDoAcervo,
    baixarForaDoAcervoPdf,
} = await import('../js/exportar-fora-do-acervo-pdf.js');

const ano = (n) => criarDataObra({ nivel: 'ano', ano: String(n) }).data;

function acervo() {
    return montarForaDoAcervo({
        poemas: [
            {
                id: 1,
                titulo: 'Águas',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Música',
                        obra: 'Águas de Março',
                        autores: ['Tom Jobim', 'Elis Regina'],
                        descricao: 'Canção de 1972',
                        dataObra: ano(1972),
                    },
                ],
                referenciasExternas: [
                    {
                        tipo: 'Pessoa pública',
                        texto: 'Clarice',
                        dataObra: ano(1920),
                        dataObraAte: ano(1977),
                    },
                    { tipo: 'Notícia', texto: 'Enchente' },
                ],
            },
            {
                id: 2,
                titulo: 'Rio',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Música',
                        obra: 'Águas de Março',
                        autores: ['Elis Regina', 'Tom Jobim'],
                    },
                    {
                        relacao: 'Citação',
                        tipoObra: 'Livro',
                        obra: 'Sagarana',
                        autor: 'Guimarães Rosa',
                    },
                ],
                hipertextualidade: [
                    {
                        relacao: 'Paródia',
                        tipoObra: 'Livro',
                        hipotexto: 'Dom Casmurro',
                        autor: 'Machado de Assis',
                    },
                ],
                referenciasExternas: [{ tipo: 'Pessoa pública', texto: 'Clarice' }],
            },
        ],
        prosas: [
            {
                id: 1,
                titulo: 'Conto',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Livro',
                        obra: 'Sagarana',
                        autor: 'Guimarães Rosa',
                    },
                ],
            },
        ],
    });
}

const vazio = () => montarForaDoAcervo({ poemas: [], prosas: [] });

// jsPDF falso: guarda o que foi escrito, em qual página e com que estilo.
function criarJsPdfFalso() {
    const registro = { textos: [], paginas: 1, linhas: 0, salvo: null };
    class JsPdfFalso {
        constructor() {
            this.pagina = 1;
            this.internal = {
                pageSize: { getWidth: () => 595, getHeight: () => 842 },
                getNumberOfPages: () => registro.paginas,
            };
        }
        setFont(_nome, estilo) {
            this.estilo = estilo;
        }
        setFontSize() {}
        setTextColor() {}
        setDrawColor() {}
        line() {
            registro.linhas += 1;
        }
        getTextWidth(t) {
            return String(t).length * 5;
        }
        text(t, x, y) {
            registro.textos.push({ t, x, y, pagina: this.pagina, estilo: this.estilo });
        }
        addPage() {
            registro.paginas += 1;
            this.pagina = registro.paginas;
        }
        setPage(n) {
            this.pagina = n;
        }
        save(nome) {
            registro.salvo = nome;
        }
    }
    return { JsPdfFalso, registro };
}

const gerar = (dados, escopo, opcoes) => {
    const { JsPdfFalso, registro } = criarJsPdfFalso();
    gerarPdfForaDoAcervo(dados, escopo, opcoes, JsPdfFalso);
    return registro;
};

const textoDaPagina = (registro, n) =>
    registro.textos
        .filter((t) => t.pagina === n)
        .map((t) => t.t)
        .join(' ');
const textoTodo = (registro) => registro.textos.map((t) => t.t).join(' ');

describe('interpretarLinhaForaDoAcervo', () => {
    it('reconhece título, separador, nota, item, subitem com rótulo e parágrafo', () => {
        assert.deepEqual(interpretarLinhaForaDoAcervo('## Obras'), {
            tipo: 'titulo',
            nivel: 2,
            texto: 'Obras',
        });
        assert.deepEqual(interpretarLinhaForaDoAcervo('---'), { tipo: 'separador' });
        assert.deepEqual(interpretarLinhaForaDoAcervo('_Nenhuma obra._'), {
            tipo: 'nota',
            texto: 'Nenhuma obra.',
        });
        assert.deepEqual(interpretarLinhaForaDoAcervo('- **A** · 2 textos'), {
            tipo: 'item',
            texto: '**A** · 2 textos',
        });
        assert.deepEqual(interpretarLinhaForaDoAcervo('  - Textos: Rio (poema)'), {
            tipo: 'subitem',
            rotulo: 'Textos',
            texto: 'Rio (poema)',
        });
        assert.deepEqual(interpretarLinhaForaDoAcervo('2 textos · 1 obra'), {
            tipo: 'paragrafo',
            texto: '2 textos · 1 obra',
        });
        assert.equal(interpretarLinhaForaDoAcervo(''), null);
        assert.equal(interpretarLinhaForaDoAcervo('   '), null);
    });
});

describe('partirNegrito e trocas de símbolos', () => {
    it('separa o trecho em negrito e deixa ** sem par como texto', () => {
        assert.deepEqual(partirNegrito('a **b** c'), [
            { texto: 'a ', negrito: false },
            { texto: 'b', negrito: true },
            { texto: ' c', negrito: false },
        ]);
        assert.deepEqual(partirNegrito('sem ** par'), [{ texto: 'sem ** par', negrito: false }]);
        assert.deepEqual(partirNegrito(''), []);
    });

    it('troca ← e ≈ (e o que o relatório de períodos já trocava)', () => {
        assert.equal(textoParaPdfForaDoAcervo('Rio ← Dom Casmurro'), 'Rio <- Dom Casmurro');
        assert.equal(textoParaPdfForaDoAcervo('A ≈ B'), 'A ~ B');
        assert.equal(textoParaPdfForaDoAcervo('“oi” — fim…'), '"oi" - fim...');
        assert.equal(textoParaPdfForaDoAcervo('A → Z'), 'A -> Z');
        // Latin-1 passa.
        assert.equal(textoParaPdfForaDoAcervo('Águas · ×2'), 'Águas · ×2');
    });
});

describe('gerarPdfForaDoAcervo', () => {
    it('sem a biblioteca de PDF, avisa com mensagem clara', () => {
        assert.throws(
            () => gerarPdfForaDoAcervo(acervo(), 'tudo', {}, null),
            /biblioteca de PDF não carregou/,
        );
    });

    it('desenha título, resumo, seções, obras, autores e referências', () => {
        const r = gerar(acervo(), 'tudo');
        const t = textoTodo(r);
        ['Fora', 'do', 'acervo', 'Obras', 'Autores', 'Referências'].forEach((p) =>
            assert.ok(t.includes(p), p),
        );
        assert.ok(t.includes('Águas'), 'obra');
        assert.ok(t.includes('Tom'), 'autor');
        assert.ok(t.includes('Clarice'), 'referência');
        assert.ok(r.linhas >= 1, 'separador entre seções');
    });

    it('os autores em lista e as datas saem como no .md', () => {
        const t = textoTodo(gerar(acervo(), 'obras'));
        assert.ok(t.includes('1972'), 'data da obra');
        assert.ok(t.includes('Elis'), 'segundo autor');
    });

    it('o rótulo do subitem e o nome da obra saem em negrito; o resto, em normal', () => {
        const r = gerar(acervo(), 'obras');
        const rotulo = r.textos.find((x) => x.t === 'Textos:');
        assert.equal(rotulo?.estilo, 'bold');
        const obra = r.textos.find((x) => x.t === 'Águas');
        assert.equal(obra?.estilo, 'bold');
        const marcador = r.textos.find((x) => x.t === '-');
        assert.ok(marcador, 'marcador do item');
        assert.equal(marcador.estilo, 'normal');
    });

    it('o subitem entra mais recuado que o item, e o marcador fica à esquerda do texto', () => {
        const r = gerar(acervo(), 'obras');
        const marcador = r.textos.find((x) => x.t === '-');
        const rotulo = r.textos.find((x) => x.t === 'Textos:');
        const obra = r.textos.find((x) => x.t === 'Águas');
        assert.ok(marcador.x < obra.x);
        assert.ok(rotulo.x > obra.x);
    });

    it('a seta de derivação e o ≈ dos avisos saem em ASCII', () => {
        const t = textoTodo(gerar(acervo(), 'derivacoes'));
        assert.ok(t.includes('<-'), 'derivação');
        assert.ok(!/[←≈→]/.test(t));
    });

    it('o escopo limita o que é desenhado (mesmos escopos do .md)', () => {
        const so = textoTodo(gerar(acervo(), 'referencias'));
        assert.ok(so.includes('Clarice'));
        assert.ok(!so.includes('Dom'), 'sem derivações');
        // Escopo desconhecido vale "tudo", como no .md.
        const desconhecido = textoTodo(gerar(acervo(), '???'));
        assert.ok(desconhecido.includes('Dom'));
        assert.ok(desconhecido.includes('Clarice'));
    });

    it('o filtro e a ordem valem e aparecem no cabeçalho', () => {
        const r = gerar(acervo(), 'obras', { consulta: 'Sagarana', ordem: 'alfabetica' });
        const t = textoTodo(r);
        assert.ok(t.includes('Sagarana'));
        assert.ok(t.includes('Filtro:'));
        assert.ok(t.includes('A -> Z'), 'ordem em ASCII');
        assert.ok(!t.includes('Casmurro'));
    });

    it('acervo sem nada gera só o cabeçalho com o aviso', () => {
        const r = gerar(vazio(), 'tudo');
        const t = textoTodo(r);
        assert.ok(t.includes('Nenhuma'));
        assert.ok(t.includes('Página 1 de 1'));
    });

    it('numera as páginas e vira a página quando o texto não cabe', () => {
        const poemas = Array.from({ length: 80 }, (_, i) => ({
            id: i + 1,
            titulo: `Poema ${i + 1}`,
            intertextualidade: [
                {
                    relacao: 'Citação',
                    tipoObra: 'Livro',
                    obra: `Obra ${i + 1}`,
                    autor: `Autor ${i + 1}`,
                },
            ],
        }));
        const r = gerar(montarForaDoAcervo({ poemas, prosas: [] }), 'obras');
        assert.ok(r.paginas > 1, 'mais de uma página');
        assert.ok(textoDaPagina(r, 1).includes(`Página 1 de ${r.paginas}`));
        assert.ok(textoDaPagina(r, r.paginas).includes(`Página ${r.paginas} de ${r.paginas}`));
        // Nada fora da margem de baixo (842 - 48), exceto o número da página.
        r.textos
            .filter((x) => !x.t.startsWith('Página') && x.t !== 'de' && !/^\d+$/.test(x.t))
            .forEach((x) => assert.ok(x.y <= 842 - 48 + 1, `${x.t} em y=${x.y}`));
    });

    it('um título nunca fica sozinho no fim da página', () => {
        const poemas = Array.from({ length: 60 }, (_, i) => ({
            id: i + 1,
            titulo: `P${i}`,
            intertextualidade: [
                { relacao: 'Citação', tipoObra: 'Livro', obra: `O${i}`, autor: `A${i}` },
            ],
        }));
        const r = gerar(montarForaDoAcervo({ poemas, prosas: [] }), 'tudo');
        const titulos = r.textos.filter(
            (x) => ['Obras', 'Autores'].includes(x.t) && x.estilo === 'bold',
        );
        titulos.forEach((tt) => {
            const depois = r.textos.filter((x) => x.pagina === tt.pagina && x.y > tt.y);
            assert.ok(depois.length > 0, `${tt.t} sozinho na página ${tt.pagina}`);
        });
    });
});

describe('nome e download', () => {
    it('o nome do arquivo segue o escopo, como no .md', () => {
        assert.equal(nomeDoPdfForaDoAcervo(), 'fora-do-acervo.pdf');
        assert.equal(nomeDoPdfForaDoAcervo('tudo'), 'fora-do-acervo.pdf');
        assert.equal(nomeDoPdfForaDoAcervo('autores'), 'fora-do-acervo-autores.pdf');
        assert.equal(nomeDoPdfForaDoAcervo('???'), 'fora-do-acervo.pdf');
    });

    it('baixar salva com o nome certo', () => {
        const { JsPdfFalso, registro } = criarJsPdfFalso();
        globalThis.window ??= {};
        const antes = globalThis.window.jspdf;
        globalThis.window.jspdf = { jsPDF: JsPdfFalso };
        try {
            baixarForaDoAcervoPdf(acervo(), 'avisos');
        } finally {
            globalThis.window.jspdf = antes;
        }
        assert.equal(registro.salvo, 'fora-do-acervo-avisos.pdf');
    });
});
