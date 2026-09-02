// ============================================================
// visualizar.js — Modal de Visualização (botão "Ver" da coluna
// Ações, ver acoes-coluna.js). Mostra o mesmo conteúdo que o .md
// exportado traria, só que renderizado na tela em vez de baixado —
// sem reimplementar a lista de campos: reaproveita os mesmos
// helpers de exportar-md.js (textoPessoas, textoGrupos, etc.), só
// trocando a saída de "linha Markdown" pra "bloco HTML".
//
// O corpo do texto (campo `texto` do item) é HTML de verdade, não
// Markdown (ver corpoParaMarkdown em exportar-md.js) — por isso vai
// direto por sanitizarTextoRico() em vez de passar pelo Markdown.
//
// Registrado como modal comum (ver registrarModal em main.js), mas
// sem formulário: só o botão Fechar e os três de Baixar, que reusam
// exportarItem() (exportar.js) com o tipo/id guardados aqui.
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { db } from './db.js';
import { itensDaSelecao, exportarItem } from './exportar.js';
import {
    INFO_STATUS,
    textoPessoas,
    textoGrupos,
    textoAutoria,
    titulosPorIds,
    livroSecaoStr,
} from './exportar-md.js';
import {
    formatarDataParcial,
    formatarEpocaRetratada,
    estaPublicado,
    sinalizacoesCombinadas,
    escapeHtml,
    sanitizarTextoRico,
} from './utils.js';

// tipo/id do item atualmente aberto no modal — os botões de Baixar do
// próprio modal usam esse estado em vez de data-attributes, já que o
// modal não é recriado a cada abertura (garantirModal só busca o HTML
// uma vez, ver modais.js).
let itemAtual = null;

// item.texto guarda conteúdo HÍBRIDO, não HTML puro: quebras de linha
// são \n de verdade (uma por verso — por isso o container abaixo leva
// white-space: pre-wrap, não <br>), negrito/itálico são inseridos pela
// toolbar como markdown puro (**negrito**/_itálico_ — ver wrapText/
// applyStyle em editor.js), e só sublinhado/cor/fonte/tamanho/
// alinhamento são HTML de verdade (<u>, <div style="...">, já cobertos
// por sanitizarTextoRico). Roda DEPOIS da sanitização, sobre HTML já
// seguro — os asteriscos/underscores de markdown nunca formam tag
// nenhuma, então não há risco de reabrir brecha de HTML malicioso.
//
// Usa [\s\S]+? em vez de .+? porque "." não bate com quebra de linha
// em JS — um trecho como "_(frase um\nfrase dois)_" (itálico quebrado
// em duas linhas, comum em versos) não fechava o par e ficava sem
// formatar, com os underscores/asteriscos aparecendo literais na tela.
// [\s\S] casa qualquer caractere, incluindo \n, sem depender da flag
// "s" (dotAll), então também funciona em engines mais antigas.
//
// Também usada por blocoTextoHtml() abaixo — não só no campo Texto —
// pra que a mesma convenção **negrito**/_itálico_ funcione em Notas,
// Descrição Visual e demais campos de texto longo.
function realcarEnfaseMarkdown(html) {
    return html
        .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^\w])_([\s\S]+?)_(?!\w)/g, '$1<em>$2</em>');
}

// `espacoExtra` adiciona uma margem acima da linha — usado só na linha
// de Autoria (ver renderVisualizacaoHtml abaixo), que é a única
// linhaMetaHtml que aparece DEPOIS do bloco de Texto/Notas (uma <div>
// sem margem inferior), em vez de empilhada com as outras linhas de
// meta antes do Texto. Sem isso, "Autoria:" ficava colado direto no
// último verso do poema (ou na última linha de Notas), sem respiro
// visual nenhum.
function linhaMetaHtml(rotulo, valorTexto, espacoExtra = false) {
    if (!valorTexto) return '';
    const margem = espacoExtra ? 'mt-4 mb-1.5' : 'mb-1.5';
    return `<p class="${margem}"><strong class="text-gray-600 dark:text-slate-300">${escapeHtml(rotulo)}:</strong> ${escapeHtml(valorTexto)}</p>`;
}

function blocoTextoHtml(titulo, texto) {
    const t = (texto || '').trim();
    if (!t) return '';
    return `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">${escapeHtml(titulo)}</h4>
        <div class="whitespace-pre-wrap text-sm">${realcarEnfaseMarkdown(escapeHtml(t))}</div>`;
}

// whitespace-pre-wrap no <li> (não só nos blocos de texto longo acima)
// — sem isso, um \n dentro do texto de um item (ex.: a Reação de um
// Envio, que pode ser uma mensagem colada com várias linhas) é
// ignorado visualmente: o HTML preserva o caractere, mas sem essa
// classe o navegador colapsa quebras de linha como se fossem espaço.
function listaHtml(titulo, itens, montarLinha) {
    if (!Array.isArray(itens) || !itens.length) return '';
    return `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">${escapeHtml(titulo)}</h4>
        <ul class="list-disc list-inside text-sm space-y-0.5">
            ${itens.map((it) => `<li class="whitespace-pre-wrap">${montarLinha(it)}</li>`).join('')}
        </ul>`;
}

// Monta o HTML da prévia — mesma ordem de campos de itemParaMarkdown
// (exportar-md.js), só que como blocos HTML em vez de linhas Markdown.
export function renderVisualizacaoHtml(item) {
    const tipoLabel = item.tipo === 'prosa' ? 'Prosa' : 'Poema';
    let html = `<p class="text-xs font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 mb-3">${escapeHtml(tipoLabel)}</p>`;

    const ctx = item.contexto || {};
    const caminho = [ctx.livro, ctx.parte, ctx.secao].filter(Boolean).join(' → ');
    html += linhaMetaHtml('Localização', caminho || null);

    if (item.status) {
        const info = INFO_STATUS[item.status] || { emoji: '⚪', titulo: item.status };
        html += linhaMetaHtml('Status', `${info.emoji} ${info.titulo}`);
    } else {
        html += linhaMetaHtml('Publicado', estaPublicado(item) ? 'Sim' : 'Não (rascunho)');
    }

    if (item.dataEscrita) {
        const aprox = item.dataEscrita.exata ? '' : ' (aproximada)';
        html += linhaMetaHtml('Escrito em', `${formatarDataParcial(item.dataEscrita)}${aprox}`);
    }
    if (item.dataPublicacao) {
        html += linhaMetaHtml('Primeira publicação', formatarDataParcial(item.dataPublicacao));
    }
    if (item.epocaRetratada) {
        html += linhaMetaHtml(
            'Época retratada',
            formatarEpocaRetratada(item.epocaRetratada, db.epocas),
        );
    }
    html += linhaMetaHtml('Pessoas', textoPessoas(item));
    html += linhaMetaHtml('Grupos', textoGrupos(item));
    html += linhaMetaHtml('Sinalizações', sinalizacoesCombinadas(item) || null);
    if (item.genero) html += linhaMetaHtml('Gênero', item.genero);
    html += linhaMetaHtml('Elos', titulosPorIds(item.conceitos?.elos));
    html += linhaMetaHtml('Referências', titulosPorIds(item.conceitos?.referencias));

    html += `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">Texto</h4>
        <div class="text-sm leading-relaxed whitespace-pre-wrap">${realcarEnfaseMarkdown(sanitizarTextoRico(item.texto))}</div>`;

    html += blocoTextoHtml('Notas', item.notas);
    html += linhaMetaHtml('Autoria', textoAutoria(item), true);
    html += blocoTextoHtml('Descrição Visual', item.descricaoVisual);
    html += blocoTextoHtml('Contexto Histórico/Pessoal', item.contextoHistorico);
    html += blocoTextoHtml('Ocultação', item.ocultacao);

    html += listaHtml('Intertextualidade', item.intertextualidade, (it) => {
        const prefixo = it.tipo ? `<strong>${escapeHtml(it.tipo)}:</strong> ` : '';
        return `${prefixo}${escapeHtml(it.texto || '')}`;
    });

    html += listaHtml('Anexos', item.anexos, (a) => {
        const prefixo = a.tipo ? `<strong>${escapeHtml(a.tipo)}:</strong> ` : '';
        const link = a.link ? ` — ${escapeHtml(a.link)}` : '';
        return `${prefixo}${escapeHtml(a.texto || '')}${link}`;
    });
    html += blocoTextoHtml('Nota sobre o conjunto de anexos', item.anexosNotaGeral);

    html += listaHtml('Anotações Marginais', item.anotacoesMarginais, (a) => {
        const meta = [a.posicao, a.fonte].filter(Boolean).join(', ');
        const trecho = a.trecho ? `<em>(${escapeHtml(a.trecho)})</em> ` : '';
        const prefixo = meta ? `<strong>${escapeHtml(meta)}:</strong> ` : '';
        return `${trecho}${prefixo}${escapeHtml(a.texto || '')}`;
    });

    html += listaHtml('Envios e Reações', item.envios, (e) => {
        const partes = [
            e.pessoa,
            e.meio ? `via ${e.meio}` : '',
            e.data && formatarDataParcial(e.data) !== '—' ? formatarDataParcial(e.data) : '',
        ]
            .filter(Boolean)
            .join(', ');
        const prefixo = partes ? `<strong>${escapeHtml(partes)}:</strong> ` : '';
        const notas = e.notas ? ` <em>(${escapeHtml(e.notas)})</em>` : '';
        return `${prefixo}${escapeHtml(e.reacao || '')}${notas}`;
    });

    html += listaHtml('Reconhecimentos', item.reconhecimentos, (r) => {
        const ano = r.ano || r.ano === 0 ? String(r.ano) : '';
        const meta = [r.premio, r.posicao, ano].filter(Boolean).join(', ');
        const prefixo = meta ? `<strong>${escapeHtml(meta)}:</strong> ` : '';
        return `${prefixo}${escapeHtml(r.texto || '')}`;
    });

    if ((item.conteudoSensivel || '').trim()) {
        html += `
            <div class="mt-4 p-3 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-600">
                <p class="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">⚠️ Conteúdo Sensível</p>
                <div class="text-sm whitespace-pre-wrap">${escapeHtml(item.conteudoSensivel.trim())}</div>
            </div>`;
    }
    if ((item.vocabularioHiperacionante || '').trim()) {
        html += `
            <div class="mt-4 p-3 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-600">
                <p class="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">⚠️ Vocabulário Hiperacionante</p>
                <div class="text-sm whitespace-pre-wrap">${escapeHtml(item.vocabularioHiperacionante.trim())}</div>
            </div>`;
    }

    const cortado = livroSecaoStr(item.cortadoDe);
    const lancado = livroSecaoStr(item.lancadoEm);
    if (cortado || lancado) {
        html += `<h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">Migração entre livros</h4>`;
        html += `<ul class="list-disc list-inside text-sm space-y-0.5">`;
        if (cortado) html += `<li>Cortado de: ${escapeHtml(cortado)}</li>`;
        if (lancado) html += `<li>Lançado em: ${escapeHtml(lancado)}</li>`;
        html += `</ul>`;
    }
    html += blocoTextoHtml('Justificativa da Migração', item.justificativaMigracao);
    html += blocoTextoHtml('Pendência', item.pendencia);
    html += blocoTextoHtml('Descarte', item.descarte);

    return html;
}

export async function abrirVisualizacao(tipo, id) {
    const itens = itensDaSelecao(tipo, [id]);
    if (itens.length === 0) return;
    const item = itens[0];
    itemAtual = { tipo, id };

    await garantirModal('modal-visualizar');

    const titulo = document.getElementById('modal-visualizar-titulo');
    if (titulo) titulo.innerText = item.titulo || '(sem título)';

    const conteudo = document.getElementById('visualizar-conteudo');
    if (conteudo) conteudo.innerHTML = renderVisualizacaoHtml(item);

    toggleModal('modal-visualizar');
}

// Chamado pelos três botões "Baixar em .md/.pdf/.json" dentro do
// próprio modal — sempre os três disponíveis ali, independente do
// formato configurado na coluna Ações (ver painel "⚙️ Ações ▾"),
// já que o pedido original foi deixar o download "bem acessível"
// nessa tela também.
export function baixarDoModalVisualizacao(formato) {
    if (!itemAtual) return;
    exportarItem(itemAtual.tipo, itemAtual.id, formato);
}
