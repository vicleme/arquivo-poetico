import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');

// Escopo deste teste: os HTMLs que dependem do hub central em main.js
// (index.html + modais/*.html) e os próprios js/*.js, que montam HTML
// com handlers inline dentro de strings/templates (painéis, tabelas,
// modais gerados). filtrar.html e localizar-substituir.html são páginas
// standalone com <script> inline próprio: as funções ali já nascem no
// escopo global daquele HTML e nunca precisam de um window.x, então
// ficam de fora de propósito, não por lacuna.
//
// Por que existe: um handler inline (onclick="minhaFuncao()") só
// funciona se minhaFuncao estiver em window. Função exportada de um
// módulo e não ligada ao window dá ReferenceError no clique e o botão
// "não faz nada" (foi o caso do painel "Períodos e movimentos").
const HTMLS_DO_HUB = [
    'index.html',
    ...fs
        .readdirSync(path.join(RAIZ, 'modais'))
        .filter((f) => f.endsWith('.html'))
        .map((f) => path.join('modais', f)),
];

const JS_DIR = path.join(RAIZ, 'js');
const ARQUIVOS_JS = fs.readdirSync(JS_DIR).filter((f) => f.endsWith('.js'));
const lerJs = (arq) => fs.readFileSync(path.join(JS_DIR, arq), 'utf8');

const EVENTOS = [
    'click',
    'dblclick',
    'change',
    'input',
    'keydown',
    'keyup',
    'keypress',
    'submit',
    'blur',
    'focus',
    'focusin',
    'focusout',
    'mousedown',
    'mouseup',
    'mouseover',
    'mouseout',
    'mouseenter',
    'mouseleave',
    'paste',
    'cut',
    'copy',
    'drop',
    'dragstart',
    'dragover',
    'dragend',
    'dragenter',
    'dragleave',
    'contextmenu',
    'toggle',
    'scroll',
    'wheel',
    'touchstart',
    'touchend',
    'select',
    'load',
    'error',
];

// O que pode aparecer chamado dentro de um handler sem ser função do
// projeto: palavras-chave, globais do navegador e do JS. Métodos
// (this.x(), event.x(), document.x()) já são descartados pelo ponto.
const IGNORADOS = new Set([
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'return',
    'function',
    'typeof',
    'void',
    'delete',
    'new',
    'alert',
    'confirm',
    'prompt',
    'setTimeout',
    'setInterval',
    'requestAnimationFrame',
    'encodeURIComponent',
    'decodeURIComponent',
    'parseInt',
    'parseFloat',
    'isNaN',
    'Number',
    'String',
    'Boolean',
    'Array',
    'Object',
    'Math',
    'JSON',
    'Date',
    'Set',
    'Map',
]);

// Troca cada ${...} de template (com chaves balanceadas) por um marcador.
// Isso é o código de render, não o do clique, e pode conter aspas e
// chaves que atrapalhariam a leitura do atributo. O marcador "gruda" nas
// letras vizinhas de propósito (adicionarSinal${chave}( vira um só
// bloco), pra nomes montados por interpolação serem descartados inteiros.
const MARCADOR = '\u0001';
function removerInterpolacoes(fonte) {
    let saida = '';
    let i = 0;
    while (i < fonte.length) {
        if (fonte[i] === '$' && fonte[i + 1] === '{') {
            let fundo = 1;
            let j = i + 2;
            while (j < fonte.length && fundo > 0) {
                if (fonte[j] === '{') fundo++;
                else if (fonte[j] === '}') fundo--;
                j++;
            }
            saida += MARCADOR;
            i = j;
        } else {
            saida += fonte[i++];
        }
    }
    return saida;
}

// Comentários de linha inteira e de bloco (só em .js): um exemplo
// escrito num comentário, como onclick="funcao()", não é handler.
function removerComentarios(js) {
    return js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

// Devolve os nomes de função chamados dentro dos handlers inline de um
// trecho de HTML (arquivo .html ou string/template de um .js).
//
// Cobre: aspas simples e duplas; handler em várias linhas; várias
// instruções separadas por ";"; chamadas aninhadas, como
//   onkeydown="aoEnterAplicar(event, () => aplicarPeriodoEmMassa('x'))"
// (aqui as duas precisam existir no window). Ignora o que só se resolve
// em tempo de execução: ${...} de template e nomes montados por
// interpolação (adicionarSinal${chave}).
export function extrairChamadasDeHandlers(fonte, { js = false } = {}) {
    const nomes = new Set();
    let texto = js ? removerComentarios(fonte) : fonte;
    texto = removerInterpolacoes(texto);
    const attr = new RegExp(`\\bon(?:${EVENTOS.join('|')})\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'g');
    let a;
    while ((a = attr.exec(texto))) {
        // Descarta identificadores colados no marcador (nome montado).
        const corpo = (a[1] ?? a[2]).replace(new RegExp(`[\\w$]*${MARCADOR}[\\w$]*`, 'g'), ' ');
        const chamada = /(?<![\w$.])(?<!new\s)([A-Za-z_$][\w$]*)\s*\(/g;
        let m;
        while ((m = chamada.exec(corpo))) {
            if (!IGNORADOS.has(m[1])) nomes.add(m[1]);
        }
    }
    return nomes;
}

// Tudo que vira window.x: "window.nome = ..." no início de linha em
// qualquer js/*.js (main.js concentra quase tudo, mas
// estatisticas-tela-temas-pessoas.js e forms.js também expõem as suas).
function extrairBindings() {
    const nomes = new Set();
    const regex = /^window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm;
    for (const arq of ARQUIVOS_JS) {
        const js = lerJs(arq);
        let m;
        while ((m = regex.exec(js))) nomes.add(m[1]);
    }
    return nomes;
}

describe('extração de handlers inline (o próprio teste)', () => {
    it('lê onclick em várias linhas e com várias instruções', () => {
        const html = `<button onclick="
            prepararPainelX('poemas');
            togglePainel('painel-x', this);
        ">x</button>`;
        assert.deepEqual([...extrairChamadasDeHandlers(html)].sort(), [
            'prepararPainelX',
            'togglePainel',
        ]);
    });

    it('lê chamadas aninhadas em arrow function', () => {
        const html = `<input onkeydown="aoEnterAplicar(event, () => aplicarX('t'))" />`;
        assert.deepEqual([...extrairChamadasDeHandlers(html)].sort(), [
            'aoEnterAplicar',
            'aplicarX',
        ]);
    });

    it('lê outros eventos além de click, com aspas simples', () => {
        const html = `<select onchange='trocarTipo("a")' oninput="filtrar(this.value)"></select>`;
        assert.deepEqual([...extrairChamadasDeHandlers(html)].sort(), ['filtrar', 'trocarTipo']);
    });

    it('ignora métodos, globais do navegador e palavras-chave', () => {
        const html = `<a onclick="event.stopPropagation(); if (confirm('ok')) { this.remove() } document.getElementById('x').focus()"></a>`;
        assert.deepEqual([...extrairChamadasDeHandlers(html)], []);
    });

    it('ignora ${...} de template e nomes montados por interpolação', () => {
        const js =
            'html = `<b onclick="${onclickAdicionar}"></b>' +
            '<b onclick="adicionarSinal${chave}(1)"></b>' +
            '<b onclick="${nomeFuncao}(${id})"></b>' +
            '<b onclick="editarItem(${item.id})"></b>`';
        assert.deepEqual([...extrairChamadasDeHandlers(js)], ['editarItem']);
    });

    it('lê handler cuja interpolação contém aspas e chaves', () => {
        const js =
            'html = `<input onchange="${nomeFuncao}(${JSON.stringify(id)}, \'${escapeHtml(p).replace(/\'/g, "\\\\\'")}\', this.checked)" />' +
            '<b onclick="editarItem(${item.id})"></b>`';
        assert.deepEqual([...extrairChamadasDeHandlers(js, { js: true })], ['editarItem']);
    });

    it('ignora exemplo escrito em comentário de .js', () => {
        const js = '// O HTML usa onclick="funcao()" inline\n/* onclick="outra()" */\nconst x = 1;';
        assert.deepEqual([...extrairChamadasDeHandlers(js, { js: true })], []);
    });

    it('descarta identificador colado em interpolação', () => {
        const js = 'html = `<b onclick="${prefixo}Salvar(1)"></b>`';
        assert.deepEqual([...extrairChamadasDeHandlers(js, { js: true })], []);
    });

    it('não confunde atributos comuns com handlers', () => {
        const js = 'const onde = "foo(1)"; const html = `<i data-online="bar(2)"></i>`;';
        assert.deepEqual([...extrairChamadasDeHandlers(js)], []);
    });
});

describe('wiring de handlers inline <-> window.x', () => {
    const bindings = extrairBindings();

    for (const relPath of HTMLS_DO_HUB) {
        it(`todo handler de ${relPath} tem window.x correspondente`, () => {
            const html = fs.readFileSync(path.join(RAIZ, relPath), 'utf8');
            const faltando = [...extrairChamadasDeHandlers(html)].filter((n) => !bindings.has(n));
            assert.deepEqual(
                faltando,
                [],
                `Função(ões) usada(s) em handler inline em ${relPath} sem "window.x = x" em js/: ${faltando.join(', ')}`,
            );
        });
    }

    for (const arq of ARQUIVOS_JS) {
        const usados = extrairChamadasDeHandlers(lerJs(arq), { js: true });
        if (usados.size === 0) continue;
        it(`todo handler inline montado em js/${arq} tem window.x correspondente`, () => {
            const faltando = [...usados].filter((n) => !bindings.has(n));
            assert.deepEqual(
                faltando,
                [],
                `Função(ões) usada(s) em handler inline montado em js/${arq} sem "window.x = x": ${faltando.join(', ')}`,
            );
        });
    }

    it('lista de HTMLs do hub não está vazia (sanity check do próprio teste)', () => {
        assert.ok(HTMLS_DO_HUB.length > 0);
    });

    it('acha ao menos um js/*.js com handler inline e ao menos um window.x', () => {
        assert.ok(bindings.size > 0);
        const algum = ARQUIVOS_JS.some(
            (arq) => extrairChamadasDeHandlers(lerJs(arq), { js: true }).size > 0,
        );
        assert.ok(algum);
    });
});
