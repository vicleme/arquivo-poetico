import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// .pdf da matriz de Cruzamentos: lê a mesma tabela do .csv e do .md.
const { db } = await import('../js/db.js');
const F = await import('../js/estatisticas-filtros.js');
const P = await import('../js/exportar-cruzamentos-pdf.js');
const X = await import('../js/exportar-cruzamentos.js');
const { matrizParaExportar } = await import('../js/estatisticas-tela-cruzamentos.js');

function criarJsPdfFalso() {
    const registro = { textos: [], retangulos: 0, paginas: 1, salvo: null, opcoes: null };
    class JsPdfFalso {
        constructor(opcoes) {
            registro.opcoes = opcoes;
            const paisagem = opcoes.orientation === 'landscape';
            const largura = paisagem ? 842 : 595;
            const altura = paisagem ? 595 : 842;
            this.pagina = 1;
            this.tamanho = 10;
            this.internal = {
                pageSize: { getWidth: () => largura, getHeight: () => altura },
                getNumberOfPages: () => registro.paginas,
            };
        }
        setFont(_n, estilo) {
            this.estilo = estilo;
        }
        setFontSize(t) {
            this.tamanho = t;
        }
        setTextColor() {}
        setDrawColor() {}
        setFillColor() {}
        rect() {
            registro.retangulos += 1;
        }
        line() {}
        getTextWidth(t) {
            return String(t).length * this.tamanho * 0.5;
        }
        text(t, x, y, opcoes) {
            registro.textos.push({ t, x, y, pagina: this.pagina, estilo: this.estilo, opcoes });
        }
        addPage(formato, orientacao) {
            registro.paginas += 1;
            this.pagina = registro.paginas;
            registro.ultimaOrientacao = orientacao;
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

function acervo(nTemas = 2) {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores'].forEach((c) => (db[c] = []));
    db.assuntos = [];
    db.temas = Array.from({ length: nTemas }, (_, i) => ({
        id: i + 1,
        nome: i === 0 ? 'Amor' : i === 1 ? 'Mar' : `Tema número ${i + 1}`,
        notas: '',
    }));
    db.grupos = [];
    db.pessoas = [
        { id: 1, nome: 'Ana', grupoIds: [] },
        { id: 2, nome: 'Bia', grupoIds: [] },
        { id: 3, nome: 'Caio', grupoIds: [] },
    ];
    const todos = db.temas.map((t) => t.id);
    const tm = (ids) => ids.map((temaId) => ({ temaId, papel: 'principal' }));
    const nomes = (ids) => ids.map((id) => db.temas.find((t) => t.id === id).nome).join(', ');
    const t = (id, temas, pessoas) => ({
        id,
        titulo: `T${id}`,
        ano: 2020,
        temas: tm(temas),
        sinalizacoesTema: nomes(temas),
        pessoas: pessoas.map((pessoaId) => ({ pessoaId, papeis: [] })),
    });
    db.poemas = [t(1, [1], [3]), t(2, [1], [3]), t(3, todos.slice(0, 2), [2]), t(4, [2], [1])];
    if (nTemas > 2) db.poemas.push(t(5, todos.slice(2), [1, 2, 3]));
    db.prosas = [];
    document.body.innerHTML =
        '<select id="est-coocorrencia-modo"><option value="pessoas"></option></select>';
}

const gerar = () => {
    const { JsPdfFalso, registro } = criarJsPdfFalso();
    P.gerarPdfCruzamentos(matrizParaExportar(), JsPdfFalso);
    return registro;
};
const textos = (registro) => registro.textos.map((x) => x.t);

describe('dividirColunasEmBlocos', () => {
    it('tudo cabe: um bloco com os totais', () => {
        assert.deepEqual(P.dividirColunasEmBlocos(5, 11, 2), [{ inicio: 0, fim: 5, totais: true }]);
    });

    it('divide em blocos e põe os totais no último quando cabem', () => {
        assert.deepEqual(P.dividirColunasEmBlocos(15, 11, 2), [
            { inicio: 0, fim: 11, totais: false },
            { inicio: 11, fim: 15, totais: true },
        ]);
    });

    it('sem espaço no último bloco, os totais ganham um bloco só deles', () => {
        assert.deepEqual(P.dividirColunasEmBlocos(11, 11, 2), [
            { inicio: 0, fim: 11, totais: false },
            { inicio: 11, fim: 11, totais: true },
        ]);
    });

    it('sem colunas de dados ainda tem um bloco', () => {
        assert.deepEqual(P.dividirColunasEmBlocos(0, 11, 1), [{ inicio: 0, fim: 0, totais: true }]);
    });
});

describe('orientacaoDoPdf', () => {
    it('retrato enquanto as colunas de dados e de total cabem na largura dele', () => {
        // Retrato: (595,28 - 72 - 150) / 56 = 6 colunas.
        assert.equal(P.colunasPorFolha(595.28), 6);
        assert.equal(P.orientacaoDoPdf(4, 2), 'portrait');
        assert.equal(P.orientacaoDoPdf(5, 2), 'landscape');
        assert.equal(P.orientacaoDoPdf(5, 1), 'portrait');
    });

    it('paisagem comporta mais colunas por bloco', () => {
        assert.equal(P.colunasPorFolha(841.89), 11);
    });
});

describe('quebrarNaLargura e cortarNaLargura', () => {
    const medir = (s) => String(s).length * 5;

    it('quebra por palavra e parte a palavra maior que a largura', () => {
        assert.deepEqual(P.quebrarNaLargura(medir, 'mar azul', 30, 4), ['mar', 'azul']);
        const partida = P.quebrarNaLargura(medir, 'Autodesvalorização', 50, 4);
        assert.ok(partida.length > 1);
        assert.equal(partida.join(''), 'Autodesvalorização');
    });

    it('passou do máximo de linhas: a última termina em reticências', () => {
        const linhas = P.quebrarNaLargura(medir, 'a bb cc dd ee ff gg hh', 15, 2);
        assert.equal(linhas.length, 2);
        assert.match(linhas[1], /\.\.\.$/);
    });

    it('cortarNaLargura só corta quando precisa', () => {
        assert.equal(P.cortarNaLargura(medir, 'Ana', 100), 'Ana');
        assert.match(P.cortarNaLargura(medir, 'Um nome bem comprido', 60), /\.\.\.$/);
    });
});

describe('gerarPdfCruzamentos', () => {
    beforeEach(() => acervo());

    it('poucas colunas: abre em A4 retrato e desenha título, recorte, cabeçalho, linhas e rodapé', () => {
        const r = gerar();
        assert.deepEqual(r.opcoes, { unit: 'pt', format: 'a4', orientation: 'portrait' });
        const t = textos(r);
        assert.ok(t.includes('Cruzamentos: Temas × pessoas'));
        assert.ok(t.includes('Pessoa: Todas as pessoas'));
        // O cabeçalho quebra em linhas dentro da coluna: "Total (soma da" / "linha)".
        ['Pessoa × tema', 'Amor', 'Mar', 'Total (soma da', 'linha)', 'Caio', 'Bia', 'Ana'].forEach(
            (esperado) => assert.ok(t.includes(esperado), esperado),
        );
        assert.ok(t.includes('Textos com o tema'));
    });

    it('os números batem com a tabela do .csv e do .md, com traço no lugar do zero', () => {
        const r = gerar();
        const linhaCaio = r.textos.find((x) => x.t === 'Caio');
        const daLinha = r.textos
            .filter((x) => x.pagina === linhaCaio.pagina && x.y === linhaCaio.y && x.t !== 'Caio')
            .sort((a, b) => a.x - b.x)
            .map((x) => x.t);
        // Amor 2, Mar 0, total 2, textos com a pessoa 2
        assert.deepEqual(daLinha, ['2', '-', '2', '2']);
    });

    it('os números ficam centralizados na coluna', () => {
        const r = gerar();
        const numero = r.textos.find((x) => x.t === '2');
        assert.equal(numero.opcoes.align, 'center');
    });

    it('usa a ordem escolhida na tela', () => {
        F.alternarOrdemTabelaCoocorrencia('col', 'Mar', false);
        const r = gerar();
        assert.ok(textos(r).includes('Ordem das linhas: coluna Mar, do maior para o menor'));
        const y = (nome) => r.textos.find((x) => x.t === nome).y;
        assert.ok(y('Ana') < y('Bia') && y('Bia') < y('Caio'));
    });

    it('matriz invertida: os temas são as linhas', () => {
        F.definirInverterCoocorrencia(true);
        const t = textos(gerar());
        assert.ok(t.includes('Tema × pessoa'));
        assert.ok(t.includes('Matriz invertida: os temas são as linhas.'));
        assert.ok(t.includes('Total (soma da'));
    });

    it('numera as páginas', () => {
        const r = gerar();
        const rodape = r.textos.filter((x) => /^Página \d+ de \d+$/.test(x.t));
        assert.equal(rodape.length, r.paginas);
    });

    it('sem a biblioteca de PDF, avisa', () => {
        assert.throws(() => P.gerarPdfCruzamentos(matrizParaExportar(), null), /biblioteca de PDF/);
    });
});

describe('PDF com muitas colunas', () => {
    beforeEach(() => acervo(30));

    it('divide as colunas em blocos que repetem os nomes das linhas, em paisagem', () => {
        const r = gerar();
        assert.equal(r.opcoes.orientation, 'landscape');
        const partes = textos(r).filter((t) => /^Parte \d+ de \d+:/.test(t));
        assert.ok(partes.length >= 2);
        assert.match(partes[0], /^Parte 1 de \d+: colunas 1 a \d+ de 30$/);
        assert.match(partes[partes.length - 1], /totais$/);
        // "Caio" aparece uma vez por bloco.
        assert.equal(textos(r).filter((t) => t === 'Caio').length, partes.length);
        // O total só sai no último bloco.
        assert.equal(textos(r).filter((t) => t === 'Total (soma da').length, 1);
    });

    it('nome longo de tema é quebrado ou cortado, nunca passa da coluna', () => {
        db.temas[0].nome = 'Autodesvalorização persistente e profunda';
        db.poemas.forEach((p) => {
            p.sinalizacoesTema = p.sinalizacoesTema.replace('Amor', db.temas[0].nome);
        });
        const r = gerar();
        const cab = r.textos.filter(
            (x) => x.opcoes?.align === 'center' && /[A-Za-zÀ-ú]/.test(x.t) && !/^Página/.test(x.t),
        );
        assert.ok(cab.length > 0);
        assert.ok(cab.every((x) => x.t.length * 7 * 0.5 <= 60));
    });
});

describe('nome e download', () => {
    it('nome do .pdf por modo', () => {
        assert.equal(P.nomeDoPdfCruzamentos('pessoas'), 'cruzamentos-temas-pessoas.pdf');
        assert.equal(P.nomeDoPdfCruzamentos('grupos'), 'cruzamentos-temas-grupos.pdf');
    });

    it('baixar salva com o nome certo', async () => {
        acervo();
        const { JsPdfFalso, registro } = criarJsPdfFalso();
        globalThis.window = globalThis.window || {};
        const antes = globalThis.window.jspdf;
        globalThis.window.jspdf = { jsPDF: JsPdfFalso };
        try {
            P.baixarCruzamentosPdf(matrizParaExportar());
        } finally {
            globalThis.window.jspdf = antes;
        }
        assert.equal(registro.salvo, 'cruzamentos-temas-pessoas.pdf');
        assert.ok(X.FORMATOS_CRUZAMENTOS.includes('pdf'));
    });
});
