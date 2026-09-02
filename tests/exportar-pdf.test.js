import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';
import { instalarJsPdfFalso, removerJsPdfFalso } from './helpers/jspdf-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { gerarPdfExportacao, baixarPdf } from '../js/exportar-pdf.js';
import { contarCamposPreenchidos, TOTAL_CAMPOS_CONSIDERADOS } from '../js/exportar-md.js';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.pessoas = [];
    db.grupos = [];
}

// Textos de todas as chamadas doc.text(...) registradas, concatenados —
// forma mais simples de checar "isso nunca aparece no PDF" / "isso
// aparece no PDF" sem se importar com layout exato.
function textoCompleto(doc) {
    return doc.chamadas
        .filter((c) => c.tipo === 'text')
        .map((c) => c.texto)
        .join('\n');
}

describe('gerarPdfExportacao', () => {
    beforeEach(() => {
        resetarDb();
        instalarJsPdfFalso();
    });
    afterEach(removerJsPdfFalso);

    it('lança erro claro quando a lib jsPDF não carregou (sem window.jspdf)', () => {
        removerJsPdfFalso();
        assert.throws(() => gerarPdfExportacao([]), /biblioteca de PDF não carregou/);
    });

    it('gera um doc mesmo com lista vazia (só o cabeçalho geral)', () => {
        const doc = gerarPdfExportacao([]);
        assert.match(textoCompleto(doc), /Exportação Poética/);
    });

    // ─── Bug original: caracteres fora de Latin-1 quebravam a página inteira ───

    it('substitui a seta "→" (Localização) por "->", sem deixar a seta original passar', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            contexto: { livro: 'Livro A', parte: 'Parte B', secao: 'Seção C' },
            texto: 'verso único',
        };
        const doc = gerarPdfExportacao([item]);
        const texto = textoCompleto(doc);
        assert.ok(!texto.includes('→'), 'a seta original não deveria sobrar em nenhum doc.text()');
        assert.match(texto, /Livro A ?-> ?Parte B ?-> ?Seção C/);
    });

    it('remove os emojis de status, sem deixar sobras corrompidas', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', status: 'publicado', texto: 'x' };
        const doc = gerarPdfExportacao([item]);
        const texto = textoCompleto(doc);
        assert.ok(!/[🟢🟡🔵🔴⚪]/u.test(texto), 'nenhum emoji de status deveria sobrar');
        assert.match(texto, /Publicado/);
    });

    it('remove um "•" solto (ex.: colado em Notas) sem quebrar o resto da linha', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', notas: 'Item • outro item', texto: 'x' };
        const doc = gerarPdfExportacao([item]);
        const texto = textoCompleto(doc);
        assert.ok(!texto.includes('•'));
        assert.match(texto, /Item.*outro item/);
    });

    it('preserva acentuação/cedilha do português normalmente (não é afetada pelo saneamento)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'Canção da Solidão',
            texto: 'verso com ç, ã, é, ô, ü',
        };
        const doc = gerarPdfExportacao([item]);
        const texto = textoCompleto(doc);
        assert.match(texto, /Canção da Solidão/);
        // Corpo rico tokeniza por palavra (cada palavra vira um doc.text()
        // separado — ver renderizarCorpoRico), então checa cada caractere
        // acentuado isoladamente em vez de casar tudo numa regex só.
        ['ç', 'ã', 'é', 'ô', 'ü'].forEach((c) =>
            assert.ok(texto.includes(c), `"${c}" deveria sobreviver ao saneamento`),
        );
    });

    it('some com qualquer outro caractere fora de Latin-1 não previsto na lista (rede de segurança)', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'verso com emoji novo 🚀 no meio' };
        const doc = gerarPdfExportacao([item]);
        const texto = textoCompleto(doc);
        assert.ok(!texto.includes('🚀'));
        ['verso', 'com', 'emoji', 'novo', 'no', 'meio'].forEach((palavra) =>
            assert.ok(texto.includes(palavra), `"${palavra}" deveria sobreviver ao saneamento`),
        );
    });

    // ─── Formatação rica do corpo do Texto ───

    it('negrito: renderiza a palavra com setFont(..., "bold") e sem os marcadores "**" no texto', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '**palavra**' };
        const doc = gerarPdfExportacao([item]);
        const chamadaTexto = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === 'palavra');
        assert.ok(chamadaTexto, 'deveria ter uma chamada text() com "palavra" sem asteriscos');
        assert.equal(chamadaTexto.fonte.estilo, 'bold');
    });

    it('itálico: renderiza a palavra com setFont(..., "italic") e sem os marcadores "_"', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '_palavra_' };
        const doc = gerarPdfExportacao([item]);
        const chamadaTexto = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === 'palavra');
        assert.ok(chamadaTexto);
        assert.equal(chamadaTexto.fonte.estilo, 'italic');
    });

    it('negrito + itálico combinados viram "bolditalic"', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '**_palavra_**' };
        const doc = gerarPdfExportacao([item]);
        const chamadaTexto = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === 'palavra');
        assert.ok(chamadaTexto);
        assert.equal(chamadaTexto.fonte.estilo, 'bolditalic');
    });

    it('sublinhado: desenha uma line() embaixo da palavra sublinhada', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '<u>palavra</u>' };
        const doc = gerarPdfExportacao([item]);
        const chamadaTexto = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === 'palavra');
        assert.ok(chamadaTexto);
        // A chamada line() do sublinhado vem depois do text() da palavra
        // (com um setDrawColor no meio — ver renderizarCorpoRico), então
        // procura qualquer line() nas chamadas seguintes, não a imediata.
        const indiceTexto = doc.chamadas.indexOf(chamadaTexto);
        const temLineDepois = doc.chamadas.slice(indiceTexto + 1, indiceTexto + 4).some((c) => c.tipo === 'line');
        assert.ok(temLineDepois, 'deveria haver uma chamada line() logo após o text() da palavra sublinhada');
    });

    it('cor: aplica setTextColor com o RGB correspondente ao hex do <div style="color:...">', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="color: #ff0000; font-size: 10pt;">vermelho</div>',
        };
        const doc = gerarPdfExportacao([item]);
        const chamadaTexto = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === 'vermelho');
        assert.ok(chamadaTexto);
        const indiceTexto = doc.chamadas.indexOf(chamadaTexto);
        // setTextColor(255,0,0) deve ter sido chamado antes desse text()
        const coresAntes = doc.chamadas
            .slice(0, indiceTexto)
            .filter((c) => c.tipo === 'setTextColor');
        const ultimaCor = coresAntes[coresAntes.length - 1];
        assert.deepEqual(ultimaCor, { tipo: 'setTextColor', r: 255, g: 0, b: 0 });
    });

    it('tamanho de fonte: usa o font-size do <div> em vez do tamanho-base', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="font-size: 16pt;">grande</div>',
        };
        const doc = gerarPdfExportacao([item]);
        const chamadaTexto = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === 'grande');
        assert.ok(chamadaTexto);
        assert.equal(chamadaTexto.tamanho, 16);
    });

    it('alinhamento à direita: desloca o x da palavra pra perto da margem direita', () => {
        const itemEsquerda = { id: 1, tipo: 'poema', titulo: 'T', texto: 'x' };
        const itemDireita = {
            id: 2,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="text-align: right;">x</div>',
        };
        const docEsq = gerarPdfExportacao([itemEsquerda]);
        const docDir = gerarPdfExportacao([itemDireita]);
        const xEsq = docEsq.chamadas.find((c) => c.tipo === 'text' && c.texto === 'x').x;
        const xDir = docDir.chamadas.find((c) => c.tipo === 'text' && c.texto === 'x').x;
        assert.ok(xDir > xEsq, 'alinhado à direita deveria ter x bem maior que alinhado à esquerda');
    });

    it('não achata a formatação do corpo (markdown "achatado" não é usado pro Texto)', () => {
        // Regressão do bug relatado: antes, o PDF vinha do Markdown já sem
        // negrito/itálico/cor — aqui garantimos que a palavra em negrito
        // realmente sai com setFont bold, não só como texto puro "palavra".
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '**forte**' };
        const doc = gerarPdfExportacao([item]);
        const algumEmBold = doc.chamadas.some(
            (c) => c.tipo === 'text' && c.texto === 'forte' && c.fonte.estilo === 'bold',
        );
        assert.ok(algumEmBold);
    });

    // ─── Paginação ───

    it('adiciona uma nova página (addPage) quando o conteúdo excede a altura útil', () => {
        const versoLongo = Array.from({ length: 5 }, (_, i) => `verso numero ${i}`).join('\n');
        const itens = Array.from({ length: 40 }, (_, i) => ({
            id: i + 1,
            tipo: 'poema',
            titulo: `Poema ${i + 1}`,
            texto: versoLongo,
        }));
        const doc = gerarPdfExportacao(itens);
        assert.ok(doc.paginas > 1, 'documento grande deveria ter disparado addPage() em algum ponto');
    });

    // ─── contarCamposPreenchidos (coluna nova) ───

    it('contarCamposPreenchidos: item vazio conta 0 e bate com TOTAL_CAMPOS_CONSIDERADOS', () => {
        assert.equal(contarCamposPreenchidos({}), 0);
        assert.ok(TOTAL_CAMPOS_CONSIDERADOS > 0);
    });

    it('contarCamposPreenchidos: cresce conforme mais campos são preenchidos', () => {
        const vazio = {};
        const parcial = { status: 'publicado', texto: 'algo' };
        const cheio = {
            contexto: { livro: 'L' },
            status: 'publicado',
            dataEscrita: { ano: 2020 },
            dataPublicacao: { ano: 2021 },
            epocaRetratada: { nome: 'X' },
            texto: 'algo',
            notas: 'nota',
            descricaoVisual: 'desc',
            contextoHistorico: 'ctx',
            ocultacao: 'oculto',
            intertextualidade: [{ texto: 'a' }],
            anexos: [{ texto: 'a' }],
            anexosNotaGeral: 'nota',
            anotacoesMarginais: [{ texto: 'a' }],
            conteudoSensivel: 'sim',
            vocabularioHiperacionante: 'sim',
            genero: 'poema',
        };
        const nVazio = contarCamposPreenchidos(vazio);
        const nParcial = contarCamposPreenchidos(parcial);
        const nCheio = contarCamposPreenchidos(cheio);
        assert.equal(nVazio, 0);
        assert.ok(nParcial > nVazio);
        assert.ok(nCheio > nParcial);
        assert.ok(nCheio <= TOTAL_CAMPOS_CONSIDERADOS);
    });

    // ─── baixarPdf ───

    it('baixarPdf chama save() com o nome de arquivo informado', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'x' };
        // baixarPdf não devolve o doc, mas dá pra capturar via o construtor
        // falso instalado nesse teste (mesma instância usada internamente).
        let docCapturado = null;
        const ConstrutorOriginal = globalThis.window.jspdf.jsPDF;
        class Espiao extends ConstrutorOriginal {
            constructor(...args) {
                super(...args);
                docCapturado = this;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        baixarPdf([item], 'arquivo-teste.pdf');

        assert.ok(docCapturado);
        const chamadaSave = docCapturado.chamadas.find((c) => c.tipo === 'save');
        assert.equal(chamadaSave?.nomeArquivo, 'arquivo-teste.pdf');
    });
});
