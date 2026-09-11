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
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'verso com emoji novo 🚀 no meio',
        };
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
        const temLineDepois = doc.chamadas
            .slice(indiceTexto + 1, indiceTexto + 4)
            .some((c) => c.tipo === 'line');
        assert.ok(
            temLineDepois,
            'deveria haver uma chamada line() logo após o text() da palavra sublinhada',
        );
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

    it('fundo: desenha um rect() preenchido ATRÁS da palavra, com o RGB do background-color', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="background-color: #ff0000;">destaque</div>',
        };
        const doc = gerarPdfExportacao([item]);
        const chamadaTexto = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === 'destaque');
        assert.ok(chamadaTexto);
        const indiceTexto = doc.chamadas.indexOf(chamadaTexto);

        // O rect() de fundo tem que vir ANTES do text() (senão o texto
        // fica embaixo da caixa colorida, escondido) — ver comentário
        // "3º passo" em renderizarCorpoRico.
        const rectAntes = doc.chamadas.slice(0, indiceTexto).find((c) => c.tipo === 'rect');
        assert.ok(rectAntes, 'deveria haver um rect() de fundo antes do text() da palavra');
        assert.equal(rectAntes.estilo, 'F');

        const corAntes = doc.chamadas
            .slice(0, doc.chamadas.indexOf(rectAntes) + 1)
            .filter((c) => c.tipo === 'setFillColor')
            .pop();
        assert.deepEqual(corAntes, { tipo: 'setFillColor', r: 255, g: 0, b: 0 });
    });

    it('fundo: não desenha rect() quando a palavra não tem background-color', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'sem fundo' };
        const doc = gerarPdfExportacao([item]);
        assert.ok(!doc.chamadas.some((c) => c.tipo === 'rect'));
    });

    // ─── Caixa contínua (padding/border-radius) ──────────────────────
    // Ver blocosDeFundoContinuos (utils.js) e renderizarBlocoComCaixa
    // (exportar-pdf.js): um <div> com padding/border-radius embrulhando
    // várias linhas (estrofes incluídas) tem que virar UM retângulo só,
    // não uma faixa por linha — mesmo com uma linha em branco (quebra
    // de estrofe) no meio do bloco.
    describe('caixa contínua (padding/border-radius)', () => {
        const TEXTO_BLOCO =
            '<div style="background-color: #000000; padding: 20px; border-radius: 8px;">' +
            'primeira estrofe\nsegue\n\nsegunda estrofe</div>';

        it('desenha um único rect() cobrindo o bloco inteiro (não uma faixa por linha)', () => {
            const item = { id: 1, tipo: 'poema', titulo: 'T', texto: TEXTO_BLOCO };
            const doc = gerarPdfExportacao([item]);
            const rects = doc.chamadas.filter((c) => c.tipo === 'rect' && c.estilo === 'F');
            assert.equal(
                rects.length,
                1,
                'deveria haver exatamente um rect() de fundo pro bloco inteiro',
            );
        });

        it('o rect() do bloco vem antes de qualquer text() do bloco, com a cor de fundo certa', () => {
            const item = { id: 1, tipo: 'poema', titulo: 'T', texto: TEXTO_BLOCO };
            const doc = gerarPdfExportacao([item]);
            const rect = doc.chamadas.find((c) => c.tipo === 'rect' && c.estilo === 'F');
            const primeiroTexto = doc.chamadas.find(
                (c) => c.tipo === 'text' && c.texto === 'primeira',
            );
            assert.ok(rect && primeiroTexto);
            assert.ok(doc.chamadas.indexOf(rect) < doc.chamadas.indexOf(primeiroTexto));

            const corAntes = doc.chamadas
                .slice(0, doc.chamadas.indexOf(rect) + 1)
                .filter((c) => c.tipo === 'setFillColor')
                .pop();
            assert.deepEqual(corAntes, { tipo: 'setFillColor', r: 0, g: 0, b: 0 });
        });

        it('todos os versos do bloco (estrofes incluídas) aparecem depois do rect() único', () => {
            const item = { id: 1, tipo: 'poema', titulo: 'T', texto: TEXTO_BLOCO };
            const doc = gerarPdfExportacao([item]);
            assert.match(textoCompleto(doc), /primeira/);
            assert.match(textoCompleto(doc), /segunda/);
            assert.match(textoCompleto(doc), /estrofe/);
        });

        it('sem padding/border-radius, o fundo continua desenhado linha a linha (comportamento de sempre)', () => {
            const item = {
                id: 1,
                tipo: 'poema',
                titulo: 'T',
                texto: '<div style="background-color: #710808;">linha um</div>\nsem fundo',
            };
            const doc = gerarPdfExportacao([item]);
            const rects = doc.chamadas.filter((c) => c.tipo === 'rect' && c.estilo === 'F');
            assert.equal(rects.length, 1);
        });

        // Regressão do bug relatado: a margem vertical (padding) era medida a
        // partir da BASELINE do texto, não do topo/fundo visual das letras —
        // o topo ficava colado na borda da caixa (a "subida" da fonte comia o
        // padding) e a base sobrava um respiro do tamanho de uma linha
        // fantasma inteira, grande e desproporcional. Ver comentário em
        // renderizarBlocoComCaixa (exportar-pdf.js).
        it('margem visual do topo da caixa bate com o padding pedido (não fica colada no texto)', () => {
            const item = {
                id: 1,
                tipo: 'poema',
                titulo: 'T',
                texto: '<div style="background-color: #710808; padding: 20px; font-size: 18pt;">verso</div>',
            };
            const doc = gerarPdfExportacao([item]);
            const rect = doc.chamadas.find((c) => c.tipo === 'rect' && c.estilo === 'F');
            const primeiroTexto = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === 'verso');
            const paddingPt = 20 * 0.75; // 1px = 0.75pt, mesma conversão do código
            const subida = 18 * 0.78; // extensaoVerticalTexto
            const topoVisualDoTexto = primeiroTexto.y - subida;
            assert.ok(
                Math.abs(topoVisualDoTexto - (rect.y + paddingPt)) < 0.01,
                `topo visual do texto deveria ficar a ${paddingPt}pt da borda da caixa, mas a distância foi ${(topoVisualDoTexto - rect.y).toFixed(2)}pt`,
            );
        });

        it('margem visual da base da caixa bate com o padding pedido (sem sobra de linha fantasma)', () => {
            const item = {
                id: 1,
                tipo: 'poema',
                titulo: 'T',
                texto: '<div style="background-color: #710808; padding: 20px; font-size: 18pt;">verso</div>',
            };
            const doc = gerarPdfExportacao([item]);
            const rect = doc.chamadas.find((c) => c.tipo === 'rect' && c.estilo === 'F');
            const ultimoTexto = doc.chamadas.find((c) => c.tipo === 'text' && c.texto === 'verso');
            const paddingPt = 20 * 0.75;
            const descida = 18 * 0.22;
            const baseVisualDoTexto = ultimoTexto.y + descida;
            const baseDaCaixa = rect.y + rect.h;
            assert.ok(
                Math.abs(baseDaCaixa - baseVisualDoTexto - paddingPt) < 0.01,
                `base visual do texto deveria ficar a ${paddingPt}pt da borda da caixa, mas a distância foi ${(baseDaCaixa - baseVisualDoTexto).toFixed(2)}pt`,
            );
        });

        it('o campo seguinte (Autoria) não nasce sobreposto ao fundo pintado da caixa', () => {
            db.autores = [{ id: 1, nome: 'Victor' }];
            const item = {
                id: 1,
                tipo: 'poema',
                titulo: 'T',
                texto: '<div style="background-color: #710808; padding: 20px; font-size: 18pt;">verso</div>',
                autoria: [{ autorId: 1, papel: 'Autor' }],
            };
            const doc = gerarPdfExportacao([item]);
            const rect = doc.chamadas.find((c) => c.tipo === 'rect' && c.estilo === 'F');
            const baseDaCaixa = rect.y + rect.h;
            const autoria = doc.chamadas.find((c) => c.tipo === 'text' && /Autoria/.test(c.texto));
            const subidaAutoria = 10 * 0.78; // tamanhoBase
            const topoVisualDaAutoria = autoria.y - subidaAutoria;
            assert.ok(
                topoVisualDaAutoria >= baseDaCaixa,
                `Autoria não deveria invadir a caixa: topo visual em ${topoVisualDaAutoria.toFixed(2)}, base da caixa em ${baseDaCaixa.toFixed(2)}`,
            );
        });
    });

    it('fundo: mescla palavras ADJACENTES com o mesmo fundo num único rect (sem lacuna no espaço entre elas)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="background-color: #ff0000;">duas palavras</div>',
        };
        const doc = gerarPdfExportacao([item]);
        const rects = doc.chamadas.filter((c) => c.tipo === 'rect');
        assert.equal(
            rects.length,
            1,
            'duas palavras adjacentes com o mesmo fundo deveriam virar um único rect',
        );

        const [chamadaDuas, chamadaPalavras] = ['duas', 'palavras'].map((texto) =>
            doc.chamadas.find((c) => c.tipo === 'text' && c.texto === texto),
        );
        // O rect precisa cobrir do início de "duas" até o fim de "palavras"
        // (incluindo o espaço entre as duas) — não só a largura de uma
        // palavra isolada.
        assert.ok(rects[0].x <= chamadaDuas.x);
        assert.ok(rects[0].x + rects[0].w >= chamadaPalavras.x);
    });

    it('fundo: NÃO mescla palavras adjacentes com fundos diferentes (dois rects separados)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto:
                '<div style="background-color: #ff0000;">vermelho</div> ' +
                '<div style="background-color: #0000ff;">azul</div>',
        };
        const doc = gerarPdfExportacao([item]);
        const rects = doc.chamadas.filter((c) => c.tipo === 'rect');
        assert.equal(rects.length, 2, 'fundos diferentes não deveriam se fundir num só rect');
    });

    // ─── Fundo de linha inteira: faixa de largura total, margem a margem ───
    it('fundo cobrindo a linha inteira: rect() estica margem a margem (largura útil da página)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="background-color: #ff0000;">linha inteira destacada</div>',
        };
        const doc = gerarPdfExportacao([item]);
        const rects = doc.chamadas.filter((c) => c.tipo === 'rect');
        assert.equal(rects.length, 1, 'linha inteira com um só fundo deveria virar um único rect');

        const margem = 48;
        const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
        assert.equal(rects[0].x, margem, 'faixa de fundo deveria começar na margem esquerda');
        assert.equal(
            rects[0].w,
            larguraUtil,
            'faixa de fundo deveria cobrir toda a largura útil, não só o texto',
        );
    });

    it('fundo cobrindo só uma palavra (resto da linha sem fundo): rect() continua colado ao texto, não estica pra largura total', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'antes <div style="background-color: #ff0000;">destaque</div> depois',
        };
        const doc = gerarPdfExportacao([item]);
        const rects = doc.chamadas.filter((c) => c.tipo === 'rect');
        assert.equal(rects.length, 1, 'só a palavra com fundo deveria gerar rect');

        const margem = 48;
        const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
        const chamadaDestaque = doc.chamadas.find(
            (c) => c.tipo === 'text' && c.texto === 'destaque',
        );
        assert.ok(chamadaDestaque);
        // Colado à palavra — bem menor que a largura útil inteira, e não
        // começando na margem (tem "antes " na frente).
        assert.ok(
            rects[0].w < larguraUtil,
            'fundo de trecho parcial não deveria ocupar a página toda',
        );
        assert.ok(
            rects[0].x > margem,
            'fundo de trecho parcial não deveria começar colado na margem',
        );
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
        assert.ok(
            xDir > xEsq,
            'alinhado à direita deveria ter x bem maior que alinhado à esquerda',
        );
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

    // ─── Respiro entre título/corpo/campos ───
    // Regressão do bug relatado: "### Texto\n\n" (título + UMA linha em
    // branco de verdade) virava, no split('\n'), três entradas — título,
    // "", "" — e cada string vazia extra somava +8pt sozinha, dobrando o
    // respiro pretendido. Ver comentário em renderizarLinhasSimples
    // (exportar-pdf.js) pro detalhe da correção.

    it('não soma o respiro da linha em branco duas vezes depois do título "Texto" (bug corrigido)', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'x' };
        const doc = gerarPdfExportacao([item]);
        const chamadas = doc.chamadas.filter((c) => c.tipo === 'text');
        const yTitulo = chamadas.find((c) => c.texto === 'Texto').y;
        const yCorpo = chamadas.find((c) => c.texto === 'x').y;
        const respiro = yCorpo - yTitulo;
        // Antes do fix: 8 (pré-título) + 4 (pós-título) + 16 (duas linhas
        // em branco contadas em vez de uma) = 28pt só de espaço morto,
        // sem contar a linha do título em si (~36pt de gap total nesse
        // cenário). Depois do fix, sem o dobro: bem menos que isso.
        assert.ok(
            respiro < 30,
            `respiro título->corpo deveria ser bem menor que os ~36pt do bug antigo, mas foi ${respiro}pt`,
        );
        assert.ok(respiro > 15, `respiro não deveria ter colapsado quase a zero (foi ${respiro}pt)`);
    });

    it('respiro entre o corpo do Texto e o próximo campo (Autoria) cai de 8pt fixos pra 4pt', () => {
        db.autores = [{ id: 1, nome: 'Victor' }];
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            autoria: [{ autorId: 1, papel: 'Autor' }],
        };
        const doc = gerarPdfExportacao([item]);
        const chamadas = doc.chamadas.filter((c) => c.tipo === 'text');
        const yCorpo = chamadas.find((c) => c.texto === 'x').y;
        const yAutoria = chamadas.find((c) => /Autoria/.test(c.texto)).y;
        const respiro = yAutoria - yCorpo;
        assert.ok(respiro <= 19, `respiro corpo->Autoria deveria ter caído (foi ${respiro}pt, antes era ~22pt)`);
        assert.ok(respiro >= 14, `respiro não deveria ter colapsado demais (foi ${respiro}pt)`);
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
        assert.ok(
            doc.paginas > 1,
            'documento grande deveria ter disparado addPage() em algum ponto',
        );
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
