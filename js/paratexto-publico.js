// paratexto-publico.js: o paratexto que a página do sorteio mostra ao leitor (31/10/2026).
//
// Lógica pura, sem DOM e sem o `db` global. Devolve blocos prontos para a tela
// montar, na ordem em que aparecem depois do texto:
//   - Descrição Visual (só poema);
//   - Anotações Marginais (só poema);
//   - Anexos e a Nota sobre o conjunto de anexos;
//   - Obras citadas e adaptadas (créditos);
//   - Reconhecimentos.
// O que o Ver chama de Paratexto, menos o que é interno ao autor: Notas e
// Comentários ao leitor seguem em comentarios-publicos.js; Inspiração e Ocultação
// nunca saem.
//
// Forma de um bloco:
//   { rotulo, texto }                    prosa livre (quebras de linha preservadas);
//   { rotulo, itens: [segmentos[]] }     lista, uma linha por item.
// Um segmento é `{ texto, estilo?, href? }`: `estilo` é 'forte' ou 'italico', e
// `href` (só http ou https) faz o segmento virar link. A tela monta tudo com
// textContent, sem HTML.
//
// Créditos: só o que vale como crédito, no sentido da epígrafe e do "tradução
// de". De Intertextualidade entram as relações Citação e Paráfrase; de
// Hipertextualidade, todas (tradução, adaptação, paródia: o texto deriva da
// obra). Alusão, Menção e Bricolagem ficam de fora, e Referências também: o
// leitor carrega o próprio repertório. Entrada marcada como obra pessoal nunca
// entra. Cada linha leva só relação, obra e autor, sem nota, descrição, trecho,
// link nem data.

import { autoresDaEntrada, textoDosAutores } from './autores-da-obra.js';
import { autoresSemSigilosos } from './autoria-publica.js';
import { ehObraPessoal } from './intertextualidade.js';
import { corpoEntradaHipertextualidade, rotuloAcessoEm } from './utils.js';

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const seg = (t, estilo) => ({ texto: t, ...(estilo ? { estilo } : {}) });

// Só http e https viram link: o campo aceitaria `javascript:` e coisas piores.
export function linkSeguro(bruto) {
    const link = texto(bruto);
    return /^https?:\/\/\S+$/i.test(link) ? link : '';
}

// Sem acento nem caixa, para comparar o nome da relação ("Paráfrase", "parafrase").
const normalizar = (s) =>
    String(s ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

export const RELACOES_DE_CREDITO = Object.freeze(['citacao', 'parafrase']);

export function descricaoVisualDe(item) {
    return texto(item?.descricaoVisual);
}

export function notaDosAnexosDe(item) {
    return texto(item?.anexosNotaGeral);
}

// Anotações marginais com texto, no formato do Ver:
// `(trecho) posição, fonte: texto (notas)`. Anotação sem texto não entra.
export function anotacoesMarginaisDe(item) {
    if (!Array.isArray(item?.anotacoesMarginais)) return [];
    return item.anotacoesMarginais
        .filter((a) => a && texto(a.texto))
        .map((a) => {
            const meta = [texto(a.posicao), texto(a.fonte)].filter(Boolean).join(', ');
            const partes = [];
            if (texto(a.trecho)) partes.push(seg(`(${texto(a.trecho)}) `, 'italico'));
            if (meta) partes.push(seg(`${meta}: `, 'forte'));
            partes.push(seg(texto(a.texto)));
            if (texto(a.notas)) partes.push(seg(` (${texto(a.notas)})`, 'italico'));
            return partes;
        });
}

// Anexos com texto ou link, no formato do Ver: `Tipo: texto, link (acesso em ...)`.
// Link que não é http ou https é descartado, mas a descrição fica.
export function anexosDe(item) {
    if (!Array.isArray(item?.anexos)) return [];
    return item.anexos
        .map((a) => (typeof a === 'string' ? { texto: a } : a))
        .filter((a) => a && (texto(a.texto) || linkSeguro(a.link)))
        .map((a) => {
            const partes = [];
            if (texto(a.tipo)) partes.push(seg(`${texto(a.tipo)}: `, 'forte'));
            if (texto(a.texto)) partes.push(seg(texto(a.texto)));
            const href = linkSeguro(a.link);
            if (href) {
                partes.push(seg(texto(a.texto) ? ' · ' : ''));
                partes.push({ texto: texto(a.linkTexto) || href, href });
                const acesso = rotuloAcessoEm({ ...a, link: href });
                if (acesso) partes.push(seg(` (${acesso})`));
            }
            return partes;
        });
}

// Reconhecimentos como o Ver mostra: `Prêmio, posição, ano: texto`. Sem texto, só
// o prêmio, a posição e o ano, sem dois-pontos pendurados.
export function reconhecimentosDe(item) {
    if (!Array.isArray(item?.reconhecimentos)) return [];
    return item.reconhecimentos
        .filter((r) => r && typeof r === 'object')
        .map((r) => {
            const ano = r.ano || r.ano === 0 ? String(r.ano) : '';
            const meta = [texto(r.premio), texto(r.posicao), ano].filter(Boolean).join(', ');
            const corpo = texto(r.texto);
            const partes = [];
            if (meta) partes.push(seg(corpo ? `${meta}: ` : meta, 'forte'));
            if (corpo) partes.push(seg(corpo));
            return partes;
        })
        .filter((partes) => partes.length);
}

// `nomesOcultos`: chaves dos nomes civis de Autores sigilosos (ver
// autoria-publica.js). Quem está nele some da lista de autores da obra.
function comAutor(corpo, entrada, nomesOcultos) {
    const autor = textoDosAutores(autoresSemSigilosos(autoresDaEntrada(entrada), nomesOcultos));
    return autor ? `${corpo} (${autor})` : corpo;
}

// As linhas de crédito, sem repetir. Citação e Paráfrase de Intertextualidade
// e toda a Hipertextualidade, sempre sem as obras pessoais.
export function creditosDe(item, nomesOcultos = null) {
    const linhas = [];
    const poe = (linha) => {
        if (linha && !linhas.includes(linha)) linhas.push(linha);
    };
    (Array.isArray(item?.intertextualidade) ? item.intertextualidade : []).forEach((e) => {
        if (!e || typeof e !== 'object' || ehObraPessoal(e)) return;
        if (!RELACOES_DE_CREDITO.includes(normalizar(e.relacao))) return;
        const obra = texto(e.obra) || texto(e.texto);
        if (!obra) return;
        poe(comAutor(`${texto(e.relacao)}: ${obra}`, e, nomesOcultos));
    });
    (Array.isArray(item?.hipertextualidade) ? item.hipertextualidade : []).forEach((h) => {
        if (!h || typeof h !== 'object' || ehObraPessoal(h)) return;
        const corpo = corpoEntradaHipertextualidade(h);
        if (corpo) poe(comAutor(corpo, h, nomesOcultos));
    });
    return linhas.map((l) => [seg(l)]);
}

// Os blocos, na ordem de exibição. Bloco sem conteúdo não entra.
export function blocosParatextoDoTexto(item, nomesOcultos = null) {
    const blocos = [];
    const prosa = (rotulo, valor) => {
        if (valor) blocos.push({ rotulo, texto: valor });
    };
    const lista = (rotulo, itens) => {
        if (itens.length) blocos.push({ rotulo, itens });
    };
    prosa('Descrição Visual', descricaoVisualDe(item));
    lista('Anotações Marginais', anotacoesMarginaisDe(item));
    lista('Anexos', anexosDe(item));
    prosa('Nota sobre o conjunto de anexos', notaDosAnexosDe(item));
    lista('Obras citadas e adaptadas', creditosDe(item, nomesOcultos));
    lista('Reconhecimentos', reconhecimentosDe(item));
    return blocos;
}
