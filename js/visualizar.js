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

import { garantirModal, toggleModal, aoFecharModalUmaVez } from './modais.js';
import { db, deleteItem } from './db.js';
import { editarPoema, editarProsa } from './forms.js';
import { caminhoDoPeriodo } from './periodos-historicos-hierarquia.js';
import { caminhoDaCorrente, idsDeCorrentesDeTopo, idsDeDivisoes } from './correntes-hierarquia.js';
import { textoPersonagensComPapel } from './personagens.js';
import { itensDaSelecao, exportarItem } from './exportar.js';
import { isDownloadAbrangenteAtivo } from './download-abrangente.js';
import { getFormatoBaixar } from './acoes-coluna.js';
import { montarControlesIncluirOcultos } from './ocultos-exportacao.js';
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
    periodosHistoricosIdsDoItem,
    estaPublicado,
    sinalizacoesAgrupadas,
    textoIdiomasComPapel,
    jargaoGiriaDoItem,
    textoAssuntosComPapel,
    agruparIntertextualidadePorTipo,
    corpoEntradaHipertextualidade,
    escapeHtml,
    sanitizarTextoRico,
    renderCoracoesHtml,
    formatarAutoclassificacaoTexto,
    autoclassificacaoValida,
    linhasFonteTexto,
    htmlAcessoEm,
} from './utils.js';
import { textoLocalEscrita, textoTerritorialidadeComCaminho } from './locais.js';

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
        .replace(/~~([\s\S]+?)~~/g, '<s>$1</s>')
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

// Rótulo com vários valores, um por linha (o Ver mostra todos, sem limite).
// Um valor só fica na mesma linha do rótulo, como linhaMetaHtml.
function linhaMetaListaHtml(rotulo, valores) {
    const lista = (valores || []).filter(Boolean);
    if (lista.length <= 1) return linhaMetaHtml(rotulo, lista[0] || '');
    const linhas = lista.map((v) => escapeHtml(v)).join('<br>');
    return `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">${escapeHtml(rotulo)}:</strong><br>${linhas}</p>`;
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

// Mesmo espírito de listaHtml acima, mas agrupado por tipo (ver
// agruparIntertextualidadePorTipo em utils.js) — cada grupo vira uma linha
// só com vírgula ou um <li> com uma sub-lista aninhada, dependendo de
// subBullet. Entradas sem tipo continuam soltas, sem grupo.
function listaIntertextualidadeHtml(titulo, itens) {
    const grupos = agruparIntertextualidadePorTipo(itens);
    if (!grupos.length) return '';
    const linhaEntrada = (it) => {
        const link = it.link
            ? ` — <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline break-all">${escapeHtml(it.linkTexto || it.link)}</a>`
            : '';
        const nota = it.nota ? ` <em>(${escapeHtml(it.nota)})</em>` : '';
        return `${escapeHtml(it.texto || '')}${link}${htmlAcessoEm(it)}${nota}`;
    };
    const linhasGrupo = grupos
        .map(({ tipo, entradas, subBullet }) => {
            if (!tipo) {
                return entradas
                    .map((it) => `<li class="whitespace-pre-wrap">${linhaEntrada(it)}</li>`)
                    .join('');
            }
            if (subBullet) {
                const sub = entradas
                    .map((it) => `<li class="whitespace-pre-wrap">${linhaEntrada(it)}</li>`)
                    .join('');
                return `<li class="whitespace-pre-wrap"><strong>${escapeHtml(tipo)}:</strong><ul class="list-disc list-inside ml-4 space-y-0.5">${sub}</ul></li>`;
            }
            return `<li class="whitespace-pre-wrap"><strong>${escapeHtml(tipo)}:</strong> ${entradas.map(linhaEntrada).join(', ')}</li>`;
        })
        .join('');
    return `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">${escapeHtml(titulo)}</h4>
        <ul class="list-disc list-inside text-sm space-y-0.5">${linhasGrupo}</ul>`;
}

// Monta o HTML da prévia — mesma ordem de campos de itemParaMarkdown
// (exportar-md.js), só que como blocos HTML em vez de linhas Markdown.
export function renderVisualizacaoHtml(item) {
    const tipoLabel = item.tipo === 'prosa' ? 'Prosa' : 'Poema';
    let html = `<p class="text-xs font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 mb-3">${escapeHtml(tipoLabel)}</p>`;

    const ctx = item.contexto || {};
    const caminho = [ctx.livro, ctx.parte, ctx.secao].filter(Boolean).join(' → ');
    html += linhaMetaHtml('Localização', caminho || null);
    html += linhaMetaHtml('Idioma', textoIdiomasComPapel(item) || null);
    html += linhaMetaHtml('Jargão e gíria', jargaoGiriaDoItem(item).join(', ') || null);
    html += linhaMetaHtml('Local onde foi escrito', textoLocalEscrita(db, item) || null);

    if (item.status) {
        const info = INFO_STATUS[item.status] || { emoji: '⚪', titulo: item.status };
        html += linhaMetaHtml('Status', `${info.emoji} ${info.titulo}`);
    } else {
        html += linhaMetaHtml('Publicado', estaPublicado(item) ? 'Sim' : 'Não (rascunho)');
    }

    if (item.dataEscrita) {
        const aprox = item.dataEscrita.exata ? '' : ' (aproximada)';
        html += linhaMetaHtml(
            'Data de escrita',
            `${formatarDataParcial(item.dataEscrita)}${aprox}`,
        );
    }
    if (item.dataPublicacao) {
        html += linhaMetaHtml('Primeira publicação', formatarDataParcial(item.dataPublicacao));
    }
    if (item.epocaRetratada) {
        // Períodos e Eventos em linhas separadas (F14-D4); o intervalo De/Até
        // é do texto inteiro e fica na linha dos períodos.
        const periodosTxt = formatarEpocaRetratada(item.epocaRetratada, db.epocas, {
            comCaminho: true,
            tipo: 'periodos',
        });
        if (periodosTxt !== '—') html += linhaMetaHtml('Período Biográfico Retratado', periodosTxt);
        const eventosTxt = formatarEpocaRetratada(item.epocaRetratada, db.epocas, {
            comCaminho: true,
            tipo: 'eventos',
        });
        if (eventosTxt !== '—') html += linhaMetaHtml('Evento Biográfico Retratado', eventosTxt);
    }
    const periodosDoTexto = periodosHistoricosIdsDoItem(item, db.periodosHistoricos, 'periodos');
    if (periodosDoTexto.length) {
        // Caminho completo na hierarquia, um por linha (como na tabela).
        html += linhaMetaListaHtml(
            'Período Histórico Retratado',
            periodosDoTexto.map((id) => caminhoDoPeriodo(db.periodosHistoricos, id)),
        );
    }
    const eventosDoTexto = periodosHistoricosIdsDoItem(item, db.periodosHistoricos, 'eventos');
    if (eventosDoTexto.length) {
        html += linhaMetaListaHtml(
            'Evento Histórico Retratado',
            eventosDoTexto.map((id) => caminhoDoPeriodo(db.periodosHistoricos, id)),
        );
    }
    // Correntes e Divisões em linhas separadas (Fase 14, etapa 2): a lista
    // gravada é uma só, a separação é derivada do pai de cada uma.
    const correntesDeTopo = idsDeCorrentesDeTopo(db.movimentosEscolas, item.movimentosEscolasIds);
    if (correntesDeTopo.length) {
        html += linhaMetaListaHtml(
            'Corrente literária',
            correntesDeTopo.map((id) => caminhoDaCorrente(db.movimentosEscolas, id)),
        );
    }
    const divisoesDoTexto = idsDeDivisoes(db.movimentosEscolas, item.movimentosEscolasIds);
    if (divisoesDoTexto.length) {
        // Caminho completo na hierarquia, um por linha (como o Período Histórico).
        html += linhaMetaListaHtml(
            'Divisões',
            divisoesDoTexto.map((id) => caminhoDaCorrente(db.movimentosEscolas, id)),
        );
    }
    // Assunto é derivado dos Temas do texto (assuntosDoTexto, utils.js),
    // não um campo gravado — mesmo padrão de Movimento/Escola acima.
    const assuntosTexto = textoAssuntosComPapel(item, db.assuntos, db.temas);
    if (assuntosTexto) {
        html += linhaMetaHtml('Assunto', assuntosTexto);
    }
    html += linhaMetaHtml('Personagens', textoPersonagensComPapel(item, db.personagens) || null);
    html += linhaMetaHtml('Pessoas', textoPessoas(item));
    html += linhaMetaHtml('Grupos', textoGrupos(item));
    // Uma linha por categoria preenchida, em vez da linha única
    // "Sinalizações" achatada — mesmo padrão de itemParaMarkdown
    // (exportar-md.js), via sinalizacoesAgrupadas() (utils.js).
    sinalizacoesAgrupadas(item, db.temas, {
        territorialidade: textoTerritorialidadeComCaminho(db, item),
    }).forEach(({ rotulo, valor }) => {
        html += linhaMetaHtml(rotulo, valor);
    });
    if (item.genero) html += linhaMetaHtml('Gênero', item.genero);
    html += linhaMetaHtml('Elos', titulosPorIds(item.conceitos?.elos));
    html += linhaMetaHtml('Ecos', titulosPorIds(item.conceitos?.ecos));

    html += `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">Texto</h4>
        <div class="text-sm leading-relaxed whitespace-pre-wrap">${realcarEnfaseMarkdown(sanitizarTextoRico(item.texto))}</div>`;

    html += blocoTextoHtml('Notas', item.notas);
    html += linhaMetaHtml('Autoria', textoAutoria(item), true);
    linhasFonteTexto(item, db.autores).forEach(({ rotulo, valor }) => {
        html += linhaMetaHtml(rotulo, valor);
    });
    html += blocoTextoHtml('Descrição Visual', item.descricaoVisual);
    html += blocoTextoHtml('Inspiração', item.contextoHistorico);
    html += blocoTextoHtml('Ocultação', item.ocultacao);

    html += listaIntertextualidadeHtml('Intertextualidade', item.intertextualidade);
    html += listaHtml('Hipertextualidade', item.hipertextualidade, (h) => {
        const prefixo = h.tipo ? `<strong>${escapeHtml(h.tipo)}:</strong> ` : '';
        const link = h.link
            ? ` — <a href="${escapeHtml(h.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline break-all">${escapeHtml(h.linkTexto || h.link)}</a>`
            : '';
        const nota = h.nota ? ` <em>(${escapeHtml(h.nota)})</em>` : '';
        return `${prefixo}${escapeHtml(corpoEntradaHipertextualidade(h))}${link}${htmlAcessoEm(h)}${nota}`;
    });
    html += listaIntertextualidadeHtml('Referências', item.referenciasExternas);

    html += listaHtml('Anexos', item.anexos, (a) => {
        const prefixo = a.tipo ? `<strong>${escapeHtml(a.tipo)}:</strong> ` : '';
        const link = a.link
            ? ` — <a href="${escapeHtml(a.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline break-all">${escapeHtml(a.linkTexto || a.link)}</a>`
            : '';
        return `${prefixo}${escapeHtml(a.texto || '')}${link}${htmlAcessoEm(a)}`;
    });
    html += blocoTextoHtml('Nota sobre o conjunto de anexos', item.anexosNotaGeral);

    html += listaHtml('Anotações Marginais', item.anotacoesMarginais, (a) => {
        const meta = [a.posicao, a.fonte].filter(Boolean).join(', ');
        const trecho = a.trecho ? `<em>(${escapeHtml(a.trecho)})</em> ` : '';
        const prefixo = meta ? `<strong>${escapeHtml(meta)}:</strong> ` : '';
        const notas = a.notas ? ` <em>(${escapeHtml(a.notas)})</em>` : '';
        return `${trecho}${prefixo}${escapeHtml(a.texto || '')}${notas}`;
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

    if (autoclassificacaoValida(item.autoclassificacao)) {
        html += `
            <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">Autoclassificação</h4>
            <div class="text-sm flex items-center gap-2">${renderCoracoesHtml(item.autoclassificacao, { somenteLeitura: true })}<span class="text-xs text-gray-400 dark:text-slate-500">${escapeHtml(formatarAutoclassificacaoTexto(item.autoclassificacao))}</span></div>`;
    }

    html += blocoTextoHtml('Autoavaliação', item.autoavaliacao);

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

// ─── Navegação Anterior/Próximo ───────────────────────────────
// A lista que a navegação percorre vem de fora (main.js registra, por tipo, uma
// função que devolve os ids que a aba mostra, já com busca, filtros e ordenação),
// pra este módulo não depender de render-listas.js. A lista é tirada uma vez, na
// abertura, e fica congelada enquanto o modal estiver aberto: o texto não "foge"
// do lugar se algo mudar por baixo.
const provedoresNavegacao = {};
let navegacao = { ids: [], pos: -1 };

export function registrarListaNavegacaoVisualizacao(tipo, fn) {
    provedoresNavegacao[tipo] = fn;
}

function montarNavegacao(tipo, id, idsFixos) {
    navegacao = { ids: [], pos: -1 };
    const fn = provedoresNavegacao[tipo];
    if (!fn && !idsFixos) return;
    let ids;
    try {
        ids = idsFixos || fn();
    } catch {
        return;
    }
    const pos = ids.findIndex((x) => String(x) === String(id));
    if (pos >= 0) navegacao = { ids, pos };
}

function atualizarControlesNavegacao() {
    const wrap = document.getElementById('visualizar-nav');
    if (!wrap) return;
    const ativo = navegacao.pos >= 0 && navegacao.ids.length > 1;
    wrap.classList.toggle('hidden', !ativo);
    if (!ativo) return;
    const posicao = document.getElementById('visualizar-posicao');
    if (posicao) {
        posicao.value = String(navegacao.pos + 1);
        posicao.max = String(navegacao.ids.length);
    }
    const total = document.getElementById('visualizar-total');
    if (total) total.textContent = `de ${navegacao.ids.length}`;
    const ant = document.getElementById('visualizar-anterior');
    const prox = document.getElementById('visualizar-proximo');
    if (ant) ant.disabled = proximoIndiceExistente(-1) < 0;
    if (prox) prox.disabled = proximoIndiceExistente(1) < 0;
}

// Próxima posição da lista (no sentido de `delta`) cujo texto ainda existe.
function proximoIndiceExistente(delta) {
    const { ids, pos, tipo } = navegacao;
    const colecao = tipo === 'prosa' ? db.prosas : db.poemas;
    for (let i = pos + delta; i >= 0 && i < ids.length; i += delta) {
        if (colecao.some((x) => String(x.id) === String(ids[i]))) return i;
    }
    return -1;
}

function preencherVisualizacao(tipo, id) {
    const itens = itensDaSelecao(tipo, [id]);
    if (itens.length === 0) return false;
    const item = itens[0];
    itemAtual = { tipo, id };

    const titulo = document.getElementById('modal-visualizar-titulo');
    if (titulo) titulo.innerText = item.titulo || '(sem título)';

    const conteudo = document.getElementById('visualizar-conteudo');
    if (conteudo) {
        conteudo.innerHTML = renderVisualizacaoHtml(item);
        conteudo.scrollTop = 0;
    }

    // "Abrangente" só existe pra Poema (Sonoridade e Morfofuncionalidade são
    // sempre ligadas a poemaId) — pra Prosa o checkbox fica escondido (ver
    // acoes-coluna.js/index.html pro mesmo recorte nos outros dois lugares).
    const wrapAbrangente = document.getElementById('download-abrangente-modal-visualizar-wrap');
    if (wrapAbrangente) {
        wrapAbrangente.classList.toggle('hidden', tipo !== 'poema');
        const check = wrapAbrangente.querySelector('.download-abrangente-check');
        if (check) check.checked = isDownloadAbrangenteAtivo();
    }

    // O select de formato começa no "Formato do Baixar" da coluna Ações da aba
    // (a escolha feita aqui vale só para este modal aberto, não é gravada).
    // Ao navegar entre textos, a escolha do select é mantida.
    return true;
}

// `opcoes.ids`: com `navegar`, usa essa lista em vez de pedir outra à aba (volta do
// Editar, que reabre o Ver na mesma lista que a pessoa vinha percorrendo).
// `opcoes.navegar`: liga os botões Anterior/Próximo, seguindo a lista que a aba
// mostra. Só a tabela de Poemas/Prosas liga; quem abre o Ver de outro lugar
// (por exemplo, dentro de um período) não tem lista de referência.
export async function abrirVisualizacao(tipo, id, opcoes = {}) {
    if (itensDaSelecao(tipo, [id]).length === 0) return;

    await garantirModal('modal-visualizar');
    if (!preencherVisualizacao(tipo, id)) return;

    const selFormato = document.getElementById('visualizar-baixar-formato');
    if (selFormato) selFormato.value = getFormatoBaixar(tipo === 'prosa' ? 'prosas' : 'poemas');

    navegacao = { ids: [], pos: -1 };
    if (opcoes.navegar) montarNavegacao(tipo, id, opcoes.ids);
    navegacao.tipo = tipo;
    atualizarControlesNavegacao();

    montarControlesIncluirOcultos();
    await toggleModal('modal-visualizar');
}

// Botões Anterior (-1) e Próximo (+1) do cabeçalho do modal. Pula textos que
// deixaram de existir; nas pontas da lista não faz nada (sem dar a volta).
export function navegarVisualizacao(delta) {
    if (!itemAtual || navegacao.pos < 0) return;
    const alvo = proximoIndiceExistente(delta);
    if (alvo < 0) return;
    const { tipo } = itemAtual;
    if (!preencherVisualizacao(tipo, navegacao.ids[alvo])) return;
    navegacao.pos = alvo;
    atualizarControlesNavegacao();
    montarControlesIncluirOcultos();
}

// Caixa de posição do cabeçalho: vai direto ao texto de número `n` da lista
// (1 a N). Número fora da faixa vai para a ponta mais próxima; se o texto do
// destino não existe mais, vale o existente mais próximo (primeiro adiante, depois
// atrás). Valor inválido só restaura o número atual.
export function irParaPosicaoVisualizacao(valor) {
    if (!itemAtual || navegacao.pos < 0) return;
    const n = Math.round(Number(valor));
    if (!Number.isFinite(n) || valor === '' || valor == null) {
        atualizarControlesNavegacao();
        return;
    }
    const total = navegacao.ids.length;
    const desejado = Math.min(Math.max(n, 1), total) - 1;
    const existe = (i) => {
        const colecao = navegacao.tipo === 'prosa' ? db.prosas : db.poemas;
        return colecao.some((x) => String(x.id) === String(navegacao.ids[i]));
    };
    let alvo = -1;
    for (let d = 0; d < total && alvo < 0; d++) {
        if (desejado + d < total && existe(desejado + d)) alvo = desejado + d;
        else if (desejado - d >= 0 && existe(desejado - d)) alvo = desejado - d;
    }
    if (alvo < 0 || alvo === navegacao.pos) {
        atualizarControlesNavegacao();
        return;
    }
    if (!preencherVisualizacao(itemAtual.tipo, navegacao.ids[alvo])) return;
    navegacao.pos = alvo;
    atualizarControlesNavegacao();
    montarControlesIncluirOcultos();
}

// Setas ← e → navegam com o modal aberto, desde que o foco não esteja num campo
// (select do formato, caixas de texto) e não haja Ctrl/Alt/Meta/Shift.
document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    const modal = document.getElementById('modal-visualizar');
    if (!modal || modal.classList.contains('hidden')) return;
    const alvo = e.target;
    if (alvo?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    if (document.getElementById('visualizar-nav')?.classList.contains('hidden')) return;
    e.preventDefault();
    navegarVisualizacao(e.key === 'ArrowLeft' ? -1 : 1);
});

// Botão "Editar" do rodapé: fecha o Ver e abre o formulário do mesmo texto.
// Ao fechar o formulário, o Ver reabre (ver aoFecharModalUmaVez em modais.js).
export async function editarDoModalVisualizacao() {
    if (!itemAtual) return;
    const { tipo, id } = itemAtual;
    const colecao = tipo === 'prosa' ? db.prosas : db.poemas;
    if (!colecao.some((x) => String(x.id) === String(id))) return;
    // Só quando o formulário vem daqui: ao fechar (salvar, cancelar, X ou Esc) a
    // pessoa volta ao Ver do mesmo texto, na mesma lista de navegação.
    const ids = navegacao.pos >= 0 ? [...navegacao.ids] : null;
    aoFecharModalUmaVez(tipo === 'prosa' ? 'modal-prosa' : 'modal-poema', () => {
        abrirVisualizacao(tipo, id, ids ? { navegar: true, ids } : {});
    });
    await toggleModal('modal-visualizar');
    await (tipo === 'prosa' ? editarProsa(id) : editarPoema(id));
}

// Botão "Excluir" do rodapé: pede a confirmação de sempre (com "Desfazer" depois).
// Confirmada a exclusão, o modal segue para o próximo texto da lista (ou o
// anterior, se era o último); sem navegação ou sem outro texto, fecha.
export function excluirDoModalVisualizacao() {
    if (!itemAtual) return;
    const { tipo, id } = itemAtual;
    deleteItem(tipo === 'prosa' ? 'prosas' : 'poemas', id, async () => {
        let destino = -1;
        if (navegacao.pos >= 0) {
            // Tira o excluído da lista e procura o próximo existente (a posição
            // dele agora é a do seguinte), senão o anterior.
            const idx = navegacao.pos;
            navegacao.ids.splice(idx, 1);
            const colecao = tipo === 'prosa' ? db.prosas : db.poemas;
            const existe = (i) => colecao.some((x) => String(x.id) === String(navegacao.ids[i]));
            for (let i = idx; i < navegacao.ids.length && destino < 0; i++) {
                if (existe(i)) destino = i;
            }
            for (let i = idx - 1; i >= 0 && destino < 0; i--) {
                if (existe(i)) destino = i;
            }
        }
        if (destino < 0 || !preencherVisualizacao(tipo, navegacao.ids[destino])) {
            itemAtual = null;
            navegacao = { ids: [], pos: -1 };
            await toggleModal('modal-visualizar');
            return;
        }
        navegacao.pos = destino;
        atualizarControlesNavegacao();
        montarControlesIncluirOcultos();
    });
}

// Chamado pelo botão "Baixar" do rodapé do modal, que baixa no formato
// escolhido no select ao lado (json, csv, md, pdf ou docx), sempre todos
// disponíveis ali, independente do formato configurado na coluna Ações. Aceita
// o formato direto como argumento (usado pelos testes).
export function baixarDoModalVisualizacao(formato) {
    if (!itemAtual) return;
    const escolhido =
        formato || document.getElementById('visualizar-baixar-formato')?.value || 'md';
    exportarItem(itemAtual.tipo, itemAtual.id, escolhido);
}
