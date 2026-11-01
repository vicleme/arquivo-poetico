// baixar-sorteio.js: o texto sorteado como arquivo para quem lê (01/11/2026).
//
// Lógica pura (sem DOM, exceto `baixarArquivo`, que só é chamada pela tela) e
// sem o `db` global: recebe o acervo (`dbRef`) lido do navegador, como
// ficha-do-texto.js. O arquivo traz o que a página do sorteio mostra ao leitor,
// e nada além disso: título, tipo e extensão, o texto, o que o autor deixou
// para quem lê (Comentários ao leitor, Inspiração e Notas públicas), o
// paratexto e a ficha, em `.md` e em `.pdf` (baixar-sorteio-pdf.js). Os exportadores do Arquivo (exportar-md.js e
// exportar-pdf.js) não servem aqui: eles trazem campos privados (Notas,
// Inspiração privadas, Sonoridade etc.) e leem o `db` global.
//
// Duas regras que o leitor não vê, mas que valem no arquivo:
//   - o comentário `<!-- ... -->` do editor é anotação pessoal do autor e sai do
//     texto (no `.md` do Arquivo ele fica, porque aquele é o arquivo do autor);
//   - o nome civil de autor em sigilo continua fora (autoria-publica.js), como
//     na tela.

import { linhaDoTipo } from './sorteio.js';
import { fichaDoTexto } from './ficha-do-texto.js';
import { blocosPublicosDoTexto } from './comentarios-publicos.js';
import { blocosParatextoDoTexto } from './paratexto-publico.js';
import { chavesDeAutoresSigilosos } from './autoria-publica.js';

const COMENTARIO_REGEX = /<!--[\s\S]*?-->/g;

// O comentário `<!-- ... -->` do editor sai do texto que o leitor recebe.
export function tirarComentariosDoEditor(texto) {
    return String(texto ?? '').replace(COMENTARIO_REGEX, '');
}

// O corpo para o `.md`, no mesmo molde do Arquivo (exportar-md.js): os
// `<div style="...">` de cor e fundo saem, e cada quebra de linha vira "hard
// break" (dois espaços e \n), para a quebra de verso sobreviver à leitura
// como Markdown. Negrito, itálico e tachado já estão em Markdown no texto.
export function corpoParaMarkdownDoLeitor(texto) {
    if (!texto) return '';
    return tirarComentariosDoEditor(texto)
        .replace(/<div style="[^"]*"[^>]*>/gi, '')
        .replace(/<\/div>/gi, '')
        .split('\n')
        .map((linha) => linha.replace(/\s+$/, ''))
        .join('  \n')
        .trim();
}

// Texto livre do autor (comentários, notas): parágrafos como foram escritos,
// com a quebra de linha preservada.
function textoLivre(texto) {
    return String(texto ?? '')
        .split('\n')
        .map((linha) => linha.replace(/\s+$/, ''))
        .join('  \n')
        .trim();
}

// Negrito ou itálico em Markdown só fecha se não houver espaço colado por dentro
// do marcador (`**Áudio: **` não fecha), então os espaços das pontas ficam fora.
function comMarcador(texto, marcador) {
    const [, antes, miolo, depois] = /^(\s*)([\s\S]*?)(\s*)$/.exec(texto);
    return miolo ? `${antes}${marcador}${miolo}${marcador}${depois}` : texto;
}

// Um item do paratexto: lista de segmentos `{ texto, href?, estilo? }`.
function segmentosParaMarkdown(segmentos) {
    return segmentos
        .map((s) => {
            if (s.href) return `[${s.texto}](${s.href})`;
            if (s.estilo === 'forte') return comMarcador(s.texto, '**');
            if (s.estilo) return comMarcador(s.texto, '*');
            return s.texto;
        })
        .join('');
}

// O que o arquivo leva, em ordem, como blocos neutros (nem Markdown, nem PDF):
// o `.md` e o `.pdf` leem a mesma lista, então nunca divergem em quais campos
// entram nem em que ordem. `fichaAntes` espelha a escolha da tela ("Ficha do
// texto: antes ou depois"); o padrão é depois do texto.
// Blocos: `titulo`, `tipo` (a linha de tipo e extensão), `ficha` (`itens` com
// `rotulo` e `valor`), `corpo` (`texto`, ainda sem tirar o comentário do
// editor) e `secao` (`rotulo`, mais `texto` livre ou `itens`, cada um uma
// lista de segmentos do paratexto).
export function blocosDoSorteio(dbRef, tipo, item, { fichaAntes = false } = {}) {
    const titulo = String(item?.titulo ?? '').trim() || 'Sem título';
    const blocos = [
        { tipo: 'titulo', texto: titulo },
        { tipo: 'tipo', texto: linhaDoTipo(tipo, item) },
    ];

    const itensFicha = fichaDoTexto(dbRef, tipo, item);
    const ficha = itensFicha.length ? { tipo: 'ficha', itens: itensFicha } : null;
    if (ficha && fichaAntes) blocos.push(ficha);

    blocos.push({ tipo: 'corpo', texto: item?.texto ?? '' });

    blocosPublicosDoTexto(item).forEach(({ rotulo, texto }) => {
        blocos.push({ tipo: 'secao', rotulo, texto });
    });
    const nomesOcultos = chavesDeAutoresSigilosos(dbRef?.autores || [], item);
    blocosParatextoDoTexto(item, nomesOcultos).forEach(({ rotulo, texto, itens }) => {
        blocos.push(itens ? { tipo: 'secao', rotulo, itens } : { tipo: 'secao', rotulo, texto });
    });

    if (ficha && !fichaAntes) blocos.push(ficha);
    return blocos;
}

// O .md completo do texto sorteado.
export function gerarMarkdownSorteio(dbRef, tipo, item, opcoes = {}) {
    const partes = blocosDoSorteio(dbRef, tipo, item, opcoes).map((bloco) => {
        if (bloco.tipo === 'titulo') return `# ${bloco.texto}`;
        if (bloco.tipo === 'tipo') return `_${bloco.texto}_`;
        if (bloco.tipo === 'corpo') return corpoParaMarkdownDoLeitor(bloco.texto);
        if (bloco.tipo === 'ficha') {
            const linhas = bloco.itens.map(({ rotulo, valor }) => `- **${rotulo}:** ${valor}`);
            return `## Ficha\n\n${linhas.join('\n')}`;
        }
        const corpo = bloco.itens
            ? bloco.itens.map((segmentos) => `- ${segmentosParaMarkdown(segmentos)}`).join('\n')
            : textoLivre(bloco.texto);
        return `## ${bloco.rotulo}\n\n${corpo}`;
    });
    return `${partes.filter(Boolean).join('\n\n')}\n`;
}

// Nome do arquivo: o título sem acento, em minúsculas e com hífens. Título que
// não deixa nada depois da limpeza vira "texto".
export function nomeArquivoSorteio(item, extensao) {
    const base = String(item?.titulo ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/, '');
    return `${base || 'texto'}.${extensao}`;
}

export function baixarArquivo(conteudo, tipoMime, nomeArquivo) {
    const blob = new Blob([conteudo], { type: `${tipoMime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

export function baixarMarkdownSorteio(dbRef, tipo, item, opcoes = {}, baixar = baixarArquivo) {
    baixar(
        gerarMarkdownSorteio(dbRef, tipo, item, opcoes),
        'text/markdown',
        nomeArquivoSorteio(item, 'md'),
    );
}
