import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// relatorio-pdf.js importa exportar-pdf.js, que importa módulos que tocam o
// localStorage e o document ao carregar.
globalThis.localStorage ??= {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
};
globalThis.document ??= { addEventListener: () => {}, getElementById: () => null };

const { gerarPdfRelatorio, interpretarLinha, textoParaPdf } =
    await import('../js/relatorio-pdf.js');
const { montarRelatorio } = await import('../js/relatorio-periodos.js');

const HOJE = { ano: 2026, mes: 10, dia: 16 };

// jsPDF falso: guarda o que foi escrito e em qual página.
function criarJsPdfFalso() {
    const registro = { textos: [], paginas: 1, fontes: new Set() };
    class JsPdfFalso {
        constructor() {
            this.registro = registro;
            this.pagina = 1;
            this.internal = {
                pageSize: { getWidth: () => 595, getHeight: () => 842 },
                getNumberOfPages: () => registro.paginas,
            };
        }
        setFont(_nome, estilo) {
            registro.fontes.add(estilo);
            this.estilo = estilo;
        }
        setFontSize() {}
        setTextColor() {}
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
    }
    return { JsPdfFalso, registro };
}

const dbPequeno = () => ({
    periodosHistoricos: [
        { id: 1, nome: 'Romantismo', inicio: { ano: 1830 }, fim: { ano: 1880 }, pertenceA: [] },
        {
            id: 2,
            nome: 'Primeira geração',
            inicio: { ano: 1836 },
            fim: { ano: 1850 },
            pertenceA: [1],
        },
    ],
    poemas: [{ id: 1, titulo: 'Poema A', periodosHistoricosIds: [2] }],
    prosas: [],
    autores: [],
});

describe('relatorio-pdf: texto e linhas', () => {
    it('troca o que a fonte não tem, sem perder o resto', () => {
        assert.equal(textoParaPdf('A › B – C — D'), 'A > B - C - D');
        assert.equal(textoParaPdf('“oi” ‘x’ …'), '"oi" \'x\' ...');
        assert.equal(textoParaPdf('Região São Paulo'), 'Região São Paulo');
    });

    it('interpreta cada tipo de linha do Markdown do relatório', () => {
        assert.deepEqual(interpretarLinha('## Século XIX'), {
            tipo: 'titulo',
            nivel: 2,
            texto: 'Século XIX',
        });
        assert.deepEqual(interpretarLinha('- **Datas:** 1830 - 1880'), {
            tipo: 'campo',
            rotulo: 'Datas',
            texto: '1830 - 1880',
        });
        assert.deepEqual(interpretarLinha('  - Poema A (poema)'), {
            tipo: 'subitem',
            texto: 'Poema A (poema)',
        });
        assert.equal(interpretarLinha('_Linha do tempo por data_').tipo, 'nota');
        assert.equal(interpretarLinha(''), null);
    });
});

describe('relatorio-pdf: documento', () => {
    it('falha com mensagem clara se a biblioteca não carregou', () => {
        const modelo = montarRelatorio('periodosHistoricos', dbPequeno(), {}, HOJE);
        assert.throws(() => gerarPdfRelatorio(modelo, null), /biblioteca de PDF/);
    });

    it('escreve títulos, rótulo em negrito e número de página', () => {
        const { JsPdfFalso, registro } = criarJsPdfFalso();
        const modelo = montarRelatorio(
            'periodosHistoricos',
            dbPequeno(),
            { organizacao: 'arvore', textos: 'titulos' },
            HOJE,
        );
        gerarPdfRelatorio(modelo, JsPdfFalso);
        const todos = registro.textos.map((x) => x.t).join(' ');
        assert.match(todos, /Romantismo/);
        assert.match(todos, /Poema/);
        assert.match(todos, /Página 1 de 1/);
        const datas = registro.textos.find((x) => x.t === 'Datas:');
        assert.equal(datas.estilo, 'bold');
        assert.ok(registro.fontes.has('normal'));
    });

    it('em árvore o filho fica mais à direita que o pai', () => {
        const { JsPdfFalso, registro } = criarJsPdfFalso();
        const modelo = montarRelatorio(
            'periodosHistoricos',
            dbPequeno(),
            { organizacao: 'arvore', textos: 'nenhum' },
            HOJE,
        );
        gerarPdfRelatorio(modelo, JsPdfFalso);
        const pai = registro.textos.find((x) => x.t === 'Romantismo');
        const filho = registro.textos.find((x) => x.t === 'Primeira');
        assert.ok(filho.x > pai.x);
    });

    it('vira de página quando o conteúdo passa de uma folha', () => {
        const { JsPdfFalso, registro } = criarJsPdfFalso();
        const db = dbPequeno();
        for (let i = 10; i < 80; i++) {
            db.periodosHistoricos.push({
                id: i,
                nome: `Período ${i}`,
                inicio: { ano: 1900 + i },
                pertenceA: [],
            });
        }
        const modelo = montarRelatorio('periodosHistoricos', db, { textos: 'nenhum' }, HOJE);
        gerarPdfRelatorio(modelo, JsPdfFalso);
        assert.ok(registro.paginas > 1);
        const rodape = registro.textos.filter((x) => /^Página \d+ de \d+$/.test(x.t));
        assert.equal(rodape.length, registro.paginas);
    });

    it('nada escrito contém caractere fora do Latin-1', () => {
        const { JsPdfFalso, registro } = criarJsPdfFalso();
        const db = dbPequeno();
        db.periodosHistoricos[0].notas = 'Nota com “aspas” e — travessão › seta';
        const modelo = montarRelatorio('periodosHistoricos', db, {}, HOJE);
        gerarPdfRelatorio(modelo, JsPdfFalso);
        // eslint-disable-next-line no-control-regex
        assert.ok(registro.textos.every((x) => !/[^\u0000-\u00ff]/.test(x.t)));
    });
});
