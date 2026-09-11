import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';
import { instalarDocxReal, removerDocxReal } from './helpers/docx-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Packer } from 'docx';
import JSZip from 'jszip';

import { db } from '../js/db.js';
import { gerarDocxDocumento, baixarDocx } from '../js/exportar-docx.js';

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

// ─── Helpers de inspeção do OOXML gerado ────────────────────────────────
// Em vez de comparar contra uma string HTML (como a versão anterior, que
// testava só o que ia pro html-docx-js — nunca o .docx de verdade), estes
// testes empacotam o Document de verdade (Packer.toBuffer) e reabrem o
// .zip resultante, lendo word/document.xml — o mesmo XML que o Word
// interpreta. Os helpers abaixo usam regex simples (não um parser XML
// completo) só pra isolar o <w:p>...</w:p> ou <w:r>...</w:r> relevante;
// suficiente pro que os testes checam.
async function documentoParaXml(documento) {
    const buffer = await Packer.toBuffer(documento);
    const zip = await JSZip.loadAsync(buffer);
    return zip.file('word/document.xml').async('string');
}

async function relacionamentosParaXml(documento) {
    const buffer = await Packer.toBuffer(documento);
    const zip = await JSZip.loadAsync(buffer);
    return zip.file('word/_rels/document.xml.rels').async('string');
}

async function documentoParaStylesXml(documento) {
    const buffer = await Packer.toBuffer(documento);
    const zip = await JSZip.loadAsync(buffer);
    return zip.file('word/styles.xml').async('string');
}

function estiloPorId(stylesXml, id) {
    const m = (stylesXml || '').match(
        new RegExp(`<w:style[^>]*w:styleId="${id}"[^>]*>.*?<\\/w:style>`, 's'),
    );
    return m ? m[0] : '';
}

function extrairParagrafoComTexto(xml, textoAlvo) {
    const blocos = xml.match(/<w:p(?: [^>]*)?>.*?<\/w:p>/gs) || [];
    return blocos.find((p) => p.includes(textoAlvo));
}

function pPrDoParagrafo(paragrafoXml) {
    const m = (paragrafoXml || '').match(/<w:pPr>.*?<\/w:pPr>/s);
    return m ? m[0] : '';
}

function runComTexto(paragrafoXml, textoAlvo) {
    const blocos = (paragrafoXml || '').match(/<w:r>.*?<\/w:r>/gs) || [];
    return blocos.find((r) => r.includes(textoAlvo)) || '';
}

describe('gerarDocxDocumento', () => {
    beforeEach(() => {
        resetarDb();
        instalarDocxReal();
    });
    afterEach(removerDocxReal);

    it('lança erro claro quando a lib docx não carregou (sem window.docx)', () => {
        removerDocxReal();
        assert.throws(() => gerarDocxDocumento([]), /biblioteca de \.docx não carregou/);
    });

    it('gera um Document válido mesmo com lista vazia (só o cabeçalho geral)', async () => {
        const documento = gerarDocxDocumento([]);
        const xml = await documentoParaXml(documento);
        assert.match(xml, /Exportação Poética/);
        assert.match(xml, /0 texto\(s\)/);
    });

    it('título do item vira Heading2, com o tipo em itálico (run separado)', async () => {
        const item = { id: 1, tipo: 'poema', titulo: 'Canção da Solidão', texto: 'verso único' };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);

        const paragrafo = extrairParagrafoComTexto(xml, 'Canção da Solidão');
        assert.ok(paragrafo, 'parágrafo do título não encontrado');
        assert.match(pPrDoParagrafo(paragrafo), /<w:pStyle w:val="Heading2"\s*\/>/);

        const runTipo = runComTexto(paragrafo, 'Poema');
        assert.match(runTipo, /<w:i\b/);
    });

    it('prosa é rotulada como "(Prosa)"', async () => {
        const item = { id: 1, tipo: 'prosa', titulo: 'T', texto: 'x' };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        // O rótulo do tipo sai entre parênteses (ver "(Poema)" no teste
        // anterior) — checa substring, não ">Prosa<" cru, senão o próprio
        // "(" antes do texto já faz a regex antiga nunca bater.
        assert.ok(xml.includes('(Prosa)'));
    });

    it('linhas de meta ("- **Rótulo:** valor") viram item de lista com o rótulo em negrito', async () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            idioma: 'Português',
            texto: 'x',
        };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);

        const paragrafo = extrairParagrafoComTexto(xml, 'Português');
        assert.ok(paragrafo, 'parágrafo da meta de Idioma não encontrado');
        assert.match(pPrDoParagrafo(paragrafo), /<w:numPr>/); // é item de lista (bullet)
        assert.match(runComTexto(paragrafo, 'Idioma'), /<w:b\b/);
    });

    it('seções ### (ex.: Notas) viram Heading3, com o conteúdo em parágrafo próprio', async () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'x', notas: 'Uma nota qualquer' };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);

        const tituloSecao = extrairParagrafoComTexto(xml, 'Notas');
        assert.match(pPrDoParagrafo(tituloSecao), /<w:pStyle w:val="Heading3"\s*\/>/);
        assert.ok(extrairParagrafoComTexto(xml, 'Uma nota qualquer'));
    });

    it('Conteúdo Sensível vira parágrafo com borda esquerda (mesmo destaque do .md/.pdf)', async () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            conteudoSensivel: 'aviso importante',
        };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);

        const paragrafo = extrairParagrafoComTexto(xml, 'aviso importante');
        assert.ok(paragrafo);
        assert.match(pPrDoParagrafo(paragrafo), /<w:pBdr>.*<w:left /s);
    });

    it('link de Intertextualidade ([texto](url)) vira hyperlink de verdade (w:hyperlink + relacionamento)', async () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            intertextualidade: [{ tipo: 'Referência', texto: 'algo', link: 'https://ex.com' }],
        };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        const rels = await relacionamentosParaXml(documento);

        assert.match(xml, /<w:hyperlink/);
        const paragrafo = extrairParagrafoComTexto(xml, 'https://ex.com');
        assert.ok(paragrafo, 'texto visível do link não encontrado');
        assert.match(rels, /Target="https:\/\/ex\.com"/);
    });

    it('escapa & < > em campos de texto livre (serialização XML, não string HTML montada à mão)', async () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            notas: '<script>a & b</script>',
        };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        assert.ok(!xml.includes('<script>a & b</script>'));
        assert.match(xml, /&lt;script&gt;a &amp; b&lt;\/script&gt;/);
    });

    it('item sem Texto preenchido não quebra (não há corpo rico pra renderizar)', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T' };
        assert.doesNotThrow(() => gerarDocxDocumento([item]));
    });

    // ─── Corpo rico do Texto (mesmas runs que o PDF usa) ───

    it('negrito: "**palavra**" vira run com <w:b/>, sem os marcadores', async () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '**palavra**' };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        const paragrafo = extrairParagrafoComTexto(xml, 'palavra');
        assert.match(runComTexto(paragrafo, 'palavra'), /<w:b\b/);
        assert.ok(!xml.includes('**palavra**'));
    });

    it('itálico: "_palavra_" vira run com <w:i/>', async () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '_palavra_' };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        const paragrafo = extrairParagrafoComTexto(xml, 'palavra');
        assert.match(runComTexto(paragrafo, 'palavra'), /<w:i\b/);
    });

    it('sublinhado: "<u>palavra</u>" vira run com <w:u .../>', async () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '<u>palavra</u>' };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        const paragrafo = extrairParagrafoComTexto(xml, 'palavra');
        assert.match(runComTexto(paragrafo, 'palavra'), /<w:u /);
    });

    it('cor de um <div style="color:...​"> vira <w:color w:val="FF0000"/> no run', async () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="color: #ff0000;">palavra</div>',
        };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        const paragrafo = extrairParagrafoComTexto(xml, 'palavra');
        assert.match(runComTexto(paragrafo, 'palavra'), /<w:color w:val="FF0000"\s*\/>/);
    });

    // ─── Fundo: largura total quando cobre a linha inteira, colado ao
    // texto quando cobre só parte dela ──────────────────────────────────
    // Motivo original do sombreamento de RUN (troca html-docx-js → docx,
    // ver decisoes.md): com o html-docx-js, cada verso virando seu
    // próprio <p style="background-color:..."> fazia o motor de
    // importação HTML do Word promover QUALQUER fundo a algo equivalente
    // a sombreamento de parágrafo/linha inteira, mesmo quando só uma
    // palavra tinha estilo. Com TextRun({ shading: {...} }) da lib docx,
    // dá pra escolher: quando a linha inteira compartilha o mesmo fundo,
    // o pedido agora é justamente esse efeito de linha inteira (w:shd no
    // w:pPr, largura da página) — só quando o fundo cobre só parte da
    // linha é que ele precisa ficar colado ao texto (w:shd no w:rPr do
    // run), senão destacar uma palavra pintaria o resto da linha junto.
    it('fundo cobrindo a linha inteira vira w:shd no w:pPr do parágrafo (faixa de largura total)', async () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="background-color: #710808;">linha inteira destacada</div>',
        };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);

        const paragrafo = extrairParagrafoComTexto(xml, 'linha inteira destacada');
        assert.ok(paragrafo, 'parágrafo com o texto não encontrado no XML');

        assert.match(
            pPrDoParagrafo(paragrafo),
            /<w:shd[^>]*w:fill="710808"/,
            'fundo de linha inteira deveria virar sombreamento de PARÁGRAFO',
        );
        // E não duplica no run (senão a cor "soma" visualmente):
        const run = runComTexto(paragrafo, 'linha inteira destacada');
        assert.ok(
            !run.includes('<w:shd'),
            'fundo de linha inteira não deveria repetir no w:rPr do run',
        );
    });

    it('fundo cobrindo só um trecho da linha continua w:shd no w:rPr do RUN, colado ao texto', async () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'antes <div style="background-color: #710808;">palavra</div> depois',
        };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);

        const paragrafo = extrairParagrafoComTexto(xml, 'palavra');
        assert.ok(paragrafo, 'parágrafo com o texto não encontrado no XML');

        // Não vazou pro parágrafo inteiro:
        assert.ok(
            !pPrDoParagrafo(paragrafo).includes('<w:shd'),
            'sombreamento de trecho parcial vazou pro w:pPr do parágrafo',
        );

        // Ficou no run, colado ao texto:
        const run = runComTexto(paragrafo, 'palavra');
        assert.match(run, /<w:rPr>.*<w:shd[^>]*w:fill="710808"/s);
    });

    // ─── Caixa contínua (padding/border-radius) ──────────────────────
    // Ver blocosDeFundoContinuos (utils.js) e criarTabelaComCaixa
    // (exportar-docx.js): um <div> com padding/border-radius embrulhando
    // várias linhas (estrofes incluídas) tem que virar UMA tabela 1×1
    // sem bordas, com o fundo na célula (shd) — não um shading de
    // parágrafo repetido linha a linha.
    describe('caixa contínua (padding/border-radius)', () => {
        const TEXTO_BLOCO =
            '<div style="background-color: #000000; padding: 20px; border-radius: 8px;">' +
            'primeira estrofe\nsegue\n\nsegunda estrofe</div>';

        it('vira uma única <w:tbl>, não N faixas de parágrafo', async () => {
            const item = { id: 1, tipo: 'poema', titulo: 'T', texto: TEXTO_BLOCO };
            const documento = gerarDocxDocumento([item]);
            const xml = await documentoParaXml(documento);
            const tabelas = xml.match(/<w:tbl>.*?<\/w:tbl>/gs) || [];
            assert.equal(
                tabelas.length,
                1,
                'deveria haver exatamente uma <w:tbl> pro bloco inteiro',
            );
        });

        it('a tabela não tem bordas e a célula tem o fundo (shd) do bloco', async () => {
            const item = { id: 1, tipo: 'poema', titulo: 'T', texto: TEXTO_BLOCO };
            const documento = gerarDocxDocumento([item]);
            const xml = await documentoParaXml(documento);
            const tabela = (xml.match(/<w:tbl>.*?<\/w:tbl>/gs) || [])[0];
            assert.ok(tabela, 'tabela não encontrada');
            assert.match(tabela, /<w:tcPr>.*?<w:shd[^>]*w:fill="000000"/s);
            const bordas = tabela.match(/w:val="none"/g) || [];
            assert.ok(bordas.length >= 4, 'tabela deveria estar sem bordas visíveis');
        });

        it('padding (px) vira margem de célula (w:tcMar) em twips — 20px = 300 twips', async () => {
            const item = { id: 1, tipo: 'poema', titulo: 'T', texto: TEXTO_BLOCO };
            const documento = gerarDocxDocumento([item]);
            const xml = await documentoParaXml(documento);
            const tabela = (xml.match(/<w:tbl>.*?<\/w:tbl>/gs) || [])[0];
            assert.match(tabela, /<w:tcMar>/);
            assert.match(tabela, /w:type="dxa" w:w="300"/);
        });

        it('todos os versos do bloco (estrofe em branco incluída) ficam dentro da tabela, sem shading repetido no parágrafo', async () => {
            const item = { id: 1, tipo: 'poema', titulo: 'T', texto: TEXTO_BLOCO };
            const documento = gerarDocxDocumento([item]);
            const xml = await documentoParaXml(documento);
            const tabela = (xml.match(/<w:tbl>.*?<\/w:tbl>/gs) || [])[0];
            assert.ok(tabela.includes('primeira'));
            assert.ok(tabela.includes('segunda'));
            assert.ok(tabela.includes('estrofe'));
            // Sem <w:shd> no w:pPr de cada verso — o fundo já está na célula.
            const paragrafosDaTabela = tabela.match(/<w:p(?: [^>]*)?>.*?<\/w:p>/gs) || [];
            paragrafosDaTabela.forEach((p) => {
                assert.ok(!pPrDoParagrafo(p).includes('<w:shd'));
            });
        });

        it('sem padding/border-radius, o fundo continua indo pro w:pPr do parágrafo (sem tabela)', async () => {
            const item = {
                id: 1,
                tipo: 'poema',
                titulo: 'T',
                texto: '<div style="background-color: #710808;">linha inteira</div>',
            };
            const documento = gerarDocxDocumento([item]);
            const xml = await documentoParaXml(documento);
            assert.ok(
                !xml.includes('<w:tbl>'),
                'não deveria haver tabela sem padding/border-radius',
            );
        });
    });

    it('fonte (font-family) de um <div> vira <w:rFonts .../> no run', async () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="font-family: Georgia;">palavra</div>',
        };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        const paragrafo = extrairParagrafoComTexto(xml, 'palavra');
        assert.match(runComTexto(paragrafo, 'palavra'), /<w:rFonts[^>]*w:ascii="Georgia"/);
    });

    it('cor de texto, fundo e fonte no mesmo <div> coexistem no mesmo run, cada um sua propriedade', async () => {
        // "depois" fora do <div>, sem fundo, garante que a linha NÃO é
        // uniforme — senão o fundo subiria pro w:pPr do parágrafo (ver
        // testes de fundo acima) e essa asserção de w:shd no run falharia
        // por um motivo que não tem nada a ver com o que este teste checa.
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="color: #ffffff; background-color: #710808; font-family: Georgia;">palavra</div> depois',
        };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        const paragrafo = extrairParagrafoComTexto(xml, 'palavra');
        const run = runComTexto(paragrafo, 'palavra');
        assert.match(run, /<w:color w:val="FFFFFF"\s*\/>/);
        assert.match(run, /<w:shd[^>]*w:fill="710808"/);
        assert.match(run, /<w:rFonts[^>]*w:ascii="Georgia"/);
    });

    it('quebra de linha do corpo (verso a verso) vira um parágrafo por linha, preservando a estrutura de versos', async () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'primeiro verso\nsegundo verso' };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);

        const paragrafoPrimeiro = extrairParagrafoComTexto(xml, 'primeiro verso');
        const paragrafoSegundo = extrairParagrafoComTexto(xml, 'segundo verso');
        assert.ok(paragrafoPrimeiro && paragrafoSegundo);
        // Cada verso é seu próprio <w:p> — não devem cair no mesmo parágrafo.
        assert.notEqual(paragrafoPrimeiro, paragrafoSegundo);
        assert.ok(!xml.includes('primeiro versosegundo verso'));
    });

    it('linha em branco (parágrafo vazio) vira um <w:p> sem runs, sem quebrar', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'verso um\n\nverso dois' };
        assert.doesNotThrow(() => gerarDocxDocumento([item]));
    });

    // ─── Regressão: espaçamento "espremido" depois da troca html-docx-js → docx ───
    // Sem w:spacing/w:line explícito, cada verso (Paragraph) usava a
    // métrica "auto" nativa da fonte pro Word — bem mais apertada que o
    // fator usado no PDF (tamanho * 1.4, ver alturaLinha em
    // exportar-pdf.js) — dando pouquíssimo respiro dentro do fundo
    // (shading) e entre os versos.
    it('cada verso do corpo tem w:spacing com w:line="360" (1,5 linha) — respiro maior que o padrão "single"', async () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'verso único' };
        const documento = gerarDocxDocumento([item]);
        const xml = await documentoParaXml(documento);
        const paragrafo = extrairParagrafoComTexto(xml, 'verso único');
        assert.ok(paragrafo, 'parágrafo com o texto não encontrado no XML');
        assert.match(
            pPrDoParagrafo(paragrafo),
            /<w:spacing[^>]*w:line="360"[^>]*w:lineRule="auto"/,
        );
    });

    // ─── Espaçamento padrão do documento ────────────────────────────
    // Regressão: sem w:docDefaults/estilos de heading com spacing, o
    // Word abre o .docx com tudo "grudado" (fallback sem espaço antes/
    // depois, linha single) — título colado no parágrafo seguinte, item
    // colado no próximo, meta colada na de cima. Ver ESTILOS_PADRAO_DOCUMENTO
    // em exportar-docx.js.
    describe('espaçamento padrão do documento (styles.xml)', () => {
        it('parágrafo comum (Normal/docDefaults) tem spacing "after" e linha mais folgada que single', async () => {
            const documento = gerarDocxDocumento([]);
            const styles = await documentoParaStylesXml(documento);
            const docDefaults = styles.match(/<w:docDefaults>.*?<\/w:docDefaults>/s)?.[0] || '';
            assert.match(docDefaults, /<w:spacing[^>]*w:after="120"/);
            assert.match(docDefaults, /<w:spacing[^>]*w:line="264"[^>]*w:lineRule="auto"/);
        });

        it('Heading1/2/3 têm spacing "before" maior quanto maior o nível (respiro antes do título)', async () => {
            const documento = gerarDocxDocumento([]);
            const styles = await documentoParaStylesXml(documento);
            assert.match(estiloPorId(styles, 'Heading1'), /<w:spacing[^>]*w:before="320"/);
            assert.match(estiloPorId(styles, 'Heading2'), /<w:spacing[^>]*w:before="240"/);
            assert.match(estiloPorId(styles, 'Heading3'), /<w:spacing[^>]*w:before="160"/);
        });

        it('ListParagraph (linhas de meta) tem spacing "after" bem menor que o Normal — lista compacta', async () => {
            const documento = gerarDocxDocumento([]);
            const styles = await documentoParaStylesXml(documento);
            assert.match(estiloPorId(styles, 'ListParagraph'), /<w:spacing[^>]*w:after="40"/);
        });
    });
});

describe('baixarDocx', () => {
    beforeEach(() => {
        resetarDb();
    });
    afterEach(removerDocxReal);

    it('lança erro claro quando a lib docx não carregou (sem window.docx)', async () => {
        removerDocxReal();
        await assert.rejects(
            () => baixarDocx([], 'teste.docx'),
            /biblioteca de \.docx não carregou/,
        );
    });

    it('gera e desencadeia o download quando a lib está disponível (não lança)', async () => {
        instalarDocxReal();
        const item = { id: 1, tipo: 'poema', titulo: 'Título Único', texto: 'x' };
        await assert.doesNotReject(() => baixarDocx([item], 'teste.docx'));
    });
});
