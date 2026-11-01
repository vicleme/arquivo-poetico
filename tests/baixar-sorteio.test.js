import './helpers/localstorage-shim.js';

// Download do texto sorteado (.md), lógica pura: o arquivo traz o que a página do
// sorteio mostra ao leitor, e nada além.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    corpoParaMarkdownDoLeitor,
    gerarMarkdownSorteio,
    nomeArquivoSorteio,
    baixarMarkdownSorteio,
} from '../js/baixar-sorteio.js';
import { fichaDoTexto } from '../js/ficha-do-texto.js';

const poema = (extra = {}) => ({
    id: 1,
    titulo: 'Horizonte de eventos',
    texto: 'verso um\nverso **dois**\nverso três',
    status: 'publicado',
    sorteavel: true,
    ...extra,
});
const dbDe = (...poemas) => ({ temas: [], poemas, prosas: [], autores: [] });

describe('corpoParaMarkdownDoLeitor', () => {
    it('cada quebra de verso vira hard break, e vazio devolve vazio', () => {
        assert.equal(corpoParaMarkdownDoLeitor('a\nb\n\nc'), 'a  \nb  \n  \nc');
        assert.equal(corpoParaMarkdownDoLeitor(''), '');
        assert.equal(corpoParaMarkdownDoLeitor(null), '');
    });
    it('o comentário do editor sai (anotação pessoal do autor)', () => {
        assert.equal(corpoParaMarkdownDoLeitor('a <!-- nota minha -->b'), 'a b');
        assert.equal(corpoParaMarkdownDoLeitor('a\n<!-- várias\nlinhas -->\nb'), 'a  \n  \nb');
    });
    it('os divs de estilo saem e o conteúdo fica; negrito e itálico seguem em Markdown', () => {
        assert.equal(
            corpoParaMarkdownDoLeitor('<div style="color:red; padding:20px;">**oi** *tu*</div>'),
            '**oi** *tu*',
        );
    });
});

describe('gerarMarkdownSorteio', () => {
    it('título, tipo com extensão, texto e ficha, nessa ordem', () => {
        const item = poema();
        const md = gerarMarkdownSorteio(dbDe(item), 'poema', item);
        assert.match(md, /^# Horizonte de eventos\n\n_Poema · 3 versos_\n\nverso um {2}\n/);
        assert.ok(md.indexOf('verso três') < md.indexOf('## Ficha'));
        assert.match(md, /- \*\*Status:\*\* 🟢 Publicado/);
        assert.ok(md.endsWith('\n') && !md.endsWith('\n\n'));
    });
    it('a ficha traz as mesmas linhas da tela', () => {
        const item = poema({ fonte: 'Livro X', obraPropria: false });
        const db = dbDe(item);
        const md = gerarMarkdownSorteio(db, 'poema', item);
        fichaDoTexto(db, 'poema', item).forEach(({ rotulo, valor }) => {
            assert.ok(md.includes(`- **${rotulo}:** ${valor}`), rotulo);
        });
    });
    it('fichaAntes põe a ficha logo depois do tipo, antes do texto', () => {
        const item = poema();
        const md = gerarMarkdownSorteio(dbDe(item), 'poema', item, { fichaAntes: true });
        assert.ok(md.indexOf('## Ficha') < md.indexOf('verso um'));
    });
    it('prosa: tempo estimado em vez de versos', () => {
        const item = poema({ texto: 'palavra '.repeat(450) });
        const md = gerarMarkdownSorteio(dbDe(), 'prosa', item);
        assert.match(md, /_Prosa · cerca de 3 min_/);
    });
    it('título vazio vira "Sem título"; status incompleto e só o começo aparecem junto ao tipo', () => {
        const item = poema({ titulo: '  ', status: 'incompleto' });
        assert.match(
            gerarMarkdownSorteio(dbDe(item), 'poema', item),
            /^# Sem título\n\n_Poema · 3 versos · em construção_/,
        );
    });
    it('traz o que o autor deixou para o leitor, com a quebra de linha', () => {
        const item = poema({
            comentariosPublicos: 'Escrito de madrugada.\nSegunda linha.',
            inspiracaoPublica: true,
            contextoHistorico: 'Vi um eclipse.',
            notasPublicas: true,
            notas: 'Nota aberta.',
        });
        const md = gerarMarkdownSorteio(dbDe(item), 'poema', item);
        assert.match(md, /## Comentários ao leitor\n\nEscrito de madrugada\. {2}\nSegunda linha\./);
        assert.match(md, /## Inspiração\n\nVi um eclipse\./);
        assert.match(md, /## Notas\n\nNota aberta\./);
    });
    it('nada privado vaza: Notas e Inspiração privadas, comentário do editor e outros campos', () => {
        const item = poema({
            texto: 'verso <!-- SEGREDO DO EDITOR -->limpo',
            notas: 'NOTA PRIVADA',
            contextoHistorico: 'INSPIRACAO PRIVADA',
            conteudoSensivel: '',
            vocabularioHiperacionante: 'VOCAB',
            escansao: { grade: 'ESCANSAO' },
        });
        const md = gerarMarkdownSorteio(dbDe(item), 'poema', item);
        ['NOTA PRIVADA', 'INSPIRACAO PRIVADA', 'SEGREDO DO EDITOR', 'VOCAB', 'ESCANSAO'].forEach(
            (x) => assert.ok(!md.includes(x), x),
        );
        assert.match(md, /verso limpo/);
    });
    it('paratexto: link http vira link Markdown; link perigoso é descartado', () => {
        const item = poema({
            descricaoVisual: 'Capa azul.',
            anexos: [
                { tipo: 'Áudio', texto: 'Leitura', link: 'https://exemplo.com/a' },
                { texto: 'Ruim', link: 'javascript:alert(1)' },
            ],
            reconhecimentos: [{ premio: 'Concurso X', posicao: '1º lugar', ano: 2026, texto: '' }],
        });
        const md = gerarMarkdownSorteio(dbDe(item), 'poema', item);
        assert.match(md, /## Descrição Visual\n\nCapa azul\./);
        assert.match(
            md,
            /## Anexos\n\n- \*\*Áudio:\*\* Leitura · \[https:\/\/exemplo\.com\/a\]\(https:\/\/exemplo\.com\/a\)/,
        );
        assert.ok(!md.includes('javascript:'));
        assert.match(md, /## Reconhecimentos\n\n- \*\*Concurso X, 1º lugar, 2026\*\*/);
    });
});

describe('nomeArquivoSorteio', () => {
    it('título sem acento, minúsculo e com hífens', () => {
        assert.equal(nomeArquivoSorteio({ titulo: '  Ação & Reação!! ' }, 'md'), 'acao-reacao.md');
    });
    it('título sem nada aproveitável vira "texto"; título longo é cortado', () => {
        assert.equal(nomeArquivoSorteio({ titulo: '???' }, 'pdf'), 'texto.pdf');
        assert.equal(nomeArquivoSorteio({}, 'md'), 'texto.md');
        assert.ok(nomeArquivoSorteio({ titulo: 'a '.repeat(100) }, 'md').length <= 63);
    });
});

describe('baixarMarkdownSorteio', () => {
    it('entrega conteúdo, tipo e nome do arquivo ao baixador', () => {
        const item = poema();
        const chamadas = [];
        baixarMarkdownSorteio(dbDe(item), 'poema', item, {}, (...args) => chamadas.push(args));
        assert.equal(chamadas.length, 1);
        const [conteudo, mime, nome] = chamadas[0];
        assert.match(conteudo, /^# Horizonte de eventos/);
        assert.equal(mime, 'text/markdown');
        assert.equal(nome, 'horizonte-de-eventos.md');
    });
});
