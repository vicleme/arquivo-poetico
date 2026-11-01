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

import { textoDaValencia } from './valencia-texto.js';
import { ehSorteavel } from './sorteavel.js';
import { rotuloLeituraCondicionada } from './leitura-autonoma.js';
import { ehAutorEmSigilo } from './autor-em-sigilo.js';
import { ehNotaPublica, ehInspiracaoPublica } from './comentarios-publicos.js';
import { textoDaDataDaEntrada } from './data-da-entrada-texto.js';
import {
    garantirModal,
    toggleModal,
    aoFecharModalUmaVez,
    cancelarAoFecharModal,
} from './modais.js';
import { textoAutoresDaEntrada } from './autores-da-obra.js';
import { rotuloDaOrigem } from './origem-da-obra.js';
import { db, deleteItem, getLeiturasDoTexto } from './db.js';
import { leiturasParaHtml } from './leituras-saida.js';
import { montarControlesLeituras } from './leituras-download.js';
import { titulosDeColetaneasDoTexto } from './coletaneas-do-texto.js';
import { textosApareceEm } from './aparicoes-do-texto.js';
import { editarPoema, editarProsa, rastreadorPoema } from './forms.js';
import { caminhoDoPeriodo } from './periodos-historicos-hierarquia.js';
import { caminhoDaCorrente, idsDeCorrentesDeTopo, idsDeDivisoes } from './correntes-hierarquia.js';
import { textoPersonagensComPapel } from './personagens.js';
import { itensDaSelecao, exportarItem } from './exportar.js';
import { montarCaixasSonoridadeProgressao } from './download-abrangente.js';
import { montarControlesMetadados } from './metadados-download.js';
import { getFormatoBaixar } from './acoes-coluna.js';
import { montarControlesIncluirOcultos } from './ocultos-exportacao.js';
import { montarControlesInfosPapel } from './infos-papel.js';
import {
    INFO_STATUS,
    textoPessoas,
    textoGrupos,
    textoAutoria,
    itensPorIds,
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
    agruparIntertextualidadePorRelacao,
    partesEntradaIntertexto,
    corpoEntradaHipertextualidade,
    escapeHtml,
    abrirModalConfirmacao,
    sanitizarTextoRico,
    realcarEnfaseMarkdown,
    renderCoracoesHtml,
    formatarAutoclassificacaoTexto,
    autoclassificacaoValida,
    linhasFonteTexto,
    htmlAcessoEm,
    tipoObraDaEntrada,
    textoLocalizacaoDoTexto,
    rotuloLocalizacaoDoTexto,
} from './utils.js';
import { textoLocalEscrita, textoTerritorialidadeComCaminho } from './locais.js';
import { descricaoPessoaPublica } from './caracterizacao-pessoa-publica.js';

// tipo/id do item atualmente aberto no modal — os botões de Baixar do
// próprio modal usam esse estado em vez de data-attributes, já que o
// modal não é recriado a cada abertura (garantirModal só busca o HTML
// uma vez, ver modais.js).
let itemAtual = null;

// `espacoExtra` adiciona uma margem acima da linha. Hoje nenhuma linha usa,
// porque todas as linhas Rótulo: valor ficam dentro de um grupo (a Autoria
// foi para a Identificação, antes do texto); fica para quem precisar de uma
// linha solta logo depois de um bloco sem margem inferior.
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

// " · 1972" depois da obra, ou '' sem data.
function htmlDataDaEntrada(it) {
    const texto = textoDaDataDaEntrada(it);
    return texto ? ` · ${escapeHtml(texto)}` : '';
}

// Linha de uma entrada com link e nota (Intertextualidade e Referências). Obra
// com autor e personagem, descrição como aposto, trecho em itálico e
// "(traduzido)" só aparecem quando preenchidos; entrada antiga sai como sempre.
function linhaEntradaIntertextoHtml(it) {
    const p = partesEntradaIntertexto(it);
    const link = it.link
        ? ` — <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline break-all">${escapeHtml(it.linkTexto || it.link)}</a>`
        : '';
    const nota = it.nota ? ` <em>(${escapeHtml(it.nota)})</em>` : '';
    const descricao = p.descricao ? `, ${escapeHtml(p.descricao)}` : '';
    const trecho = p.trecho ? ` <em>“${escapeHtml(p.trecho)}”</em>` : '';
    const traduzido = p.traduzido ? ' (traduzido)' : '';
    const pessoal = p.obraPessoal ? ' (obra pessoal)' : '';
    const pessoa = descricaoPessoaPublica(it);
    const pessoaHtml = pessoa ? ` (${escapeHtml(pessoa)})` : '';
    return `${escapeHtml(p.corpo)}${pessoaHtml}${descricao}${htmlDataDaEntrada(it)}${trecho}${traduzido}${pessoal}${link}${htmlAcessoEm(it)}${nota}`;
}

// Itens <li> de um grupo por tipo (ver agruparIntertextualidadePorTipo em
// utils.js): uma linha só com vírgula ou um <li> com sub-lista aninhada,
// conforme subBullet. Entradas sem tipo ficam soltas, sem rótulo.
function itensGrupoTipoHtml({ tipo, entradas, subBullet }) {
    if (!tipo) {
        return entradas
            .map((it) => `<li class="whitespace-pre-wrap">${linhaEntradaIntertextoHtml(it)}</li>`)
            .join('');
    }
    if (subBullet) {
        const sub = entradas
            .map((it) => `<li class="whitespace-pre-wrap">${linhaEntradaIntertextoHtml(it)}</li>`)
            .join('');
        return `<li class="whitespace-pre-wrap"><strong>${escapeHtml(tipo)}:</strong><ul class="list-disc list-inside ml-4 space-y-0.5">${sub}</ul></li>`;
    }
    return `<li class="whitespace-pre-wrap"><strong>${escapeHtml(tipo)}:</strong> ${entradas.map(linhaEntradaIntertextoHtml).join(', ')}</li>`;
}

// Referências: agrupado só por tipo (não têm relação).
function listaIntertextualidadeHtml(titulo, itens) {
    const grupos = agruparIntertextualidadePorTipo(itens);
    if (!grupos.length) return '';
    return `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">${escapeHtml(titulo)}</h4>
        <ul class="list-disc list-inside text-sm space-y-0.5">${grupos.map(itensGrupoTipoHtml).join('')}</ul>`;
}

// Intertextualidade em dois níveis: relação por fora, tipo de obra por dentro
// (ver agruparIntertextualidadePorRelacao em utils.js). Entrada antiga, sem
// relação, vai num bloco no fim, agrupada só por tipo de obra.
function listaIntertextualidadeDoisNiveisHtml(titulo, itens) {
    const { relacoes, semRelacao } = agruparIntertextualidadePorRelacao(itens);
    if (!relacoes.length && !semRelacao.length) return '';
    const porRelacao = relacoes
        .map(
            ({ relacao, tipos }) =>
                `<li class="whitespace-pre-wrap"><strong>${escapeHtml(relacao)}:</strong><ul class="list-disc list-inside ml-4 space-y-0.5">${tipos.map(itensGrupoTipoHtml).join('')}</ul></li>`,
        )
        .join('');
    return `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">${escapeHtml(titulo)}</h4>
        <ul class="list-disc list-inside text-sm space-y-0.5">${porRelacao}${semRelacao.map(itensGrupoTipoHtml).join('')}</ul>`;
}

// Monta o HTML da prévia — mesma ordem de campos de itemParaMarkdown
// (exportar-md.js), só que como blocos HTML em vez de linhas Markdown.
// ─── Grupos recolhíveis do Ver ────────────────────────────────
// Critério que rege a ordem e os grupos (registrado em decisoes.md):
//   ANTES do texto vai a ficha: campo curto, em linha "Rótulo: valor", vindo de
//   cadastro ou lista fechada, que situa o texto antes de ler. Três grupos:
//   Identificação (quem, onde, quando e em que situação), Contexto retratado
//   (épocas e correntes) e Conteúdo e classificação (sobre o quê, quem aparece,
//   como se classifica).
//   DEPOIS do texto vai o que se consulta depois de ler: prosa livre ou lista de
//   registros. Cinco grupos: Paratexto (o que o autor escreveu em volta do
//   texto), Relações (ligações com outros textos e obras), Recepção (o que o
//   texto provocou), Avaliação do autor e Controle do acervo (migração,
//   pendência, descarte). Os avisos de Conteúdo Sensível e Vocabulário
//   Hiperacionante ficam fora dos grupos, sempre à vista, logo após o texto.
// Todos começam recolhidos, para o texto ficar perto do topo; a escolha de abrir
// cada grupo é lembrada neste navegador, inclusive ao passar de um texto para
// outro. Grupo sem nenhum campo preenchido nem aparece.
const LS_GRUPOS_VER = 'arquivoPoetico_gruposVerAbertos';

function lerGruposAbertos() {
    try {
        const lista = JSON.parse(localStorage.getItem(LS_GRUPOS_VER) || '[]');
        return new Set(Array.isArray(lista) ? lista : []);
    } catch {
        return new Set();
    }
}

const gruposAbertos = lerGruposAbertos();

function gravarGruposAbertos() {
    try {
        localStorage.setItem(LS_GRUPOS_VER, JSON.stringify([...gruposAbertos]));
    } catch (e) {
        console.warn('[visualizar.js] Não foi possível salvar os grupos abertos:', e);
    }
}

function grupoVerHtml(chave, titulo, conteudo) {
    if (!conteudo || !conteudo.trim()) return '';
    const aberto = gruposAbertos.has(chave) ? ' open' : '';
    return `
        <details data-grupo-ver="${chave}"${aberto} class="mt-3 border border-gray-200 dark:border-slate-700 rounded-md">
            <summary class="cursor-pointer select-none px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md">${escapeHtml(titulo)}</summary>
            <div class="px-3 pt-1 pb-3">${conteudo}</div>
        </details>`;
}

if (typeof document !== 'undefined') {
    // `toggle` não borbulha: escuta na captura, uma vez só, para valer também
    // para o conteúdo trocado a cada texto.
    document.addEventListener(
        'toggle',
        (e) => {
            const d = e.target;
            if (!d || !d.matches || !d.matches('details[data-grupo-ver]')) return;
            if (d.open) gruposAbertos.add(d.dataset.grupoVer);
            else gruposAbertos.delete(d.dataset.grupoVer);
            gravarGruposAbertos();
        },
        true,
    );
    document.addEventListener('click', (e) => {
        const botao = e.target && e.target.closest && e.target.closest('[data-grupo-ver-todos]');
        if (!botao) return;
        const abrir = botao.dataset.grupoVerTodos === 'abrir';
        const raiz = botao.closest('#visualizar-conteudo') || document;
        raiz.querySelectorAll('details[data-grupo-ver]').forEach((d) => {
            d.open = abrir;
            if (abrir) gruposAbertos.add(d.dataset.grupoVer);
            else gruposAbertos.delete(d.dataset.grupoVer);
        });
        gravarGruposAbertos();
    });
}

export function renderVisualizacaoHtml(item) {
    const tipoLabel = item.tipo === 'prosa' ? 'Prosa' : 'Poema';

    // ── Antes do texto: a ficha ──
    let identificacao = '';
    identificacao += linhaMetaHtml(rotuloLocalizacaoDoTexto(item), textoLocalizacaoDoTexto(item));
    identificacao += linhaMetaHtml(
        'Coletâneas',
        titulosDeColetaneasDoTexto(db, item.tipo, item.id).join(', ') || null,
    );
    identificacao += linhaMetaHtml('Aparece em', textosApareceEm(item).join('; ') || null);
    identificacao += linhaMetaHtml('Idioma', textoIdiomasComPapel(item) || null);
    identificacao += linhaMetaHtml('Jargão e gíria', jargaoGiriaDoItem(item).join(', ') || null);
    identificacao += linhaMetaHtml('Local onde foi escrito', textoLocalEscrita(db, item) || null);

    if (item.status) {
        const info = INFO_STATUS[item.status] || { emoji: '⚪', titulo: item.status };
        identificacao += linhaMetaHtml('Status', `${info.emoji} ${info.titulo}`);
    } else {
        identificacao += linhaMetaHtml('Publicado', estaPublicado(item) ? 'Sim' : 'Não (rascunho)');
    }

    if (item.dataEscrita) {
        const aprox = item.dataEscrita.exata ? '' : ' (aproximada)';
        identificacao += linhaMetaHtml(
            'Data de escrita',
            `${formatarDataParcial(item.dataEscrita)}${aprox}`,
        );
    }
    if (item.dataPublicacao) {
        identificacao += linhaMetaHtml(
            'Primeira publicação',
            formatarDataParcial(item.dataPublicacao),
        );
    }
    identificacao += linhaMetaHtml('Autoria', textoAutoria(item));
    linhasFonteTexto(item, db.autores).forEach(({ rotulo, valor }) => {
        identificacao += linhaMetaHtml(rotulo, valor);
    });

    let retratado = '';
    if (item.epocaRetratada) {
        // Períodos e Eventos em linhas separadas (F14-D4); o intervalo De/Até
        // é do texto inteiro e fica na linha dos períodos.
        const periodosTxt = formatarEpocaRetratada(item.epocaRetratada, db.epocas, {
            comCaminho: true,
            tipo: 'periodos',
        });
        if (periodosTxt !== '—') {
            retratado += linhaMetaHtml('Período Biográfico Retratado', periodosTxt);
        }
        const eventosTxt = formatarEpocaRetratada(item.epocaRetratada, db.epocas, {
            comCaminho: true,
            tipo: 'eventos',
        });
        if (eventosTxt !== '—') {
            retratado += linhaMetaHtml('Evento Biográfico Retratado', eventosTxt);
        }
    }
    const periodosDoTexto = periodosHistoricosIdsDoItem(item, db.periodosHistoricos, 'periodos');
    if (periodosDoTexto.length) {
        // Caminho completo na hierarquia, um por linha (como na tabela).
        retratado += linhaMetaListaHtml(
            'Período Histórico Retratado',
            periodosDoTexto.map((id) => caminhoDoPeriodo(db.periodosHistoricos, id)),
        );
    }
    const eventosDoTexto = periodosHistoricosIdsDoItem(item, db.periodosHistoricos, 'eventos');
    if (eventosDoTexto.length) {
        retratado += linhaMetaListaHtml(
            'Evento Histórico Retratado',
            eventosDoTexto.map((id) => caminhoDoPeriodo(db.periodosHistoricos, id)),
        );
    }
    // Correntes e Divisões em linhas separadas (Fase 14, etapa 2): a lista
    // gravada é uma só, a separação é derivada do pai de cada uma.
    const correntesDeTopo = idsDeCorrentesDeTopo(db.movimentosEscolas, item.movimentosEscolasIds);
    if (correntesDeTopo.length) {
        retratado += linhaMetaListaHtml(
            'Corrente literária',
            correntesDeTopo.map((id) => caminhoDaCorrente(db.movimentosEscolas, id)),
        );
    }
    const divisoesDoTexto = idsDeDivisoes(db.movimentosEscolas, item.movimentosEscolasIds);
    if (divisoesDoTexto.length) {
        // Caminho completo na hierarquia, um por linha (como o Período Histórico).
        retratado += linhaMetaListaHtml(
            'Divisões',
            divisoesDoTexto.map((id) => caminhoDaCorrente(db.movimentosEscolas, id)),
        );
    }

    let classificacao = '';
    // Assunto é derivado dos Temas do texto (assuntosDoTexto, utils.js),
    // não um campo gravado — mesmo padrão de Movimento/Escola acima.
    const assuntosTexto = textoAssuntosComPapel(item, db.assuntos, db.temas);
    if (assuntosTexto) {
        classificacao += linhaMetaHtml('Assunto', assuntosTexto);
    }
    classificacao += linhaMetaHtml(
        'Personagens',
        textoPersonagensComPapel(item, db.personagens) || null,
    );
    classificacao += linhaMetaHtml('Pessoas', textoPessoas(item));
    classificacao += linhaMetaHtml('Grupos', textoGrupos(item));
    // Uma linha por categoria preenchida, em vez da linha única
    // "Sinalizações" achatada — mesmo padrão de itemParaMarkdown
    // (exportar-md.js), via sinalizacoesAgrupadas() (utils.js).
    sinalizacoesAgrupadas(item, db.temas, {
        territorialidade: textoTerritorialidadeComCaminho(db, item),
    }).forEach(({ rotulo, valor }) => {
        classificacao += linhaMetaHtml(rotulo, valor);
    });
    if (item.genero) classificacao += linhaMetaHtml('Gênero', item.genero);

    // ── O texto e os avisos de leitura ──
    let texto = `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">Texto</h4>
        <div class="text-sm leading-relaxed whitespace-pre-wrap">${realcarEnfaseMarkdown(sanitizarTextoRico(item.texto))}</div>`;

    if ((item.conteudoSensivel || '').trim()) {
        texto += `
            <div class="mt-4 p-3 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-600">
                <p class="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">⚠️ Conteúdo Sensível</p>
                <div class="text-sm whitespace-pre-wrap">${escapeHtml(item.conteudoSensivel.trim())}</div>
            </div>`;
    }
    if ((item.vocabularioHiperacionante || '').trim()) {
        texto += `
            <div class="mt-4 p-3 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-600">
                <p class="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">⚠️ Vocabulário Hiperacionante</p>
                <div class="text-sm whitespace-pre-wrap">${escapeHtml(item.vocabularioHiperacionante.trim())}</div>
            </div>`;
    }

    // ── Depois do texto: consulta ──
    let paratexto = '';
    paratexto += blocoTextoHtml('Notas', item.notas);
    paratexto += blocoTextoHtml('Notas públicas', ehNotaPublica(item) ? 'Sim' : '');
    paratexto += blocoTextoHtml('Comentários ao leitor', item.comentariosPublicos);
    paratexto += listaHtml('Anotações Marginais', item.anotacoesMarginais, (a) => {
        const meta = [a.posicao, a.fonte].filter(Boolean).join(', ');
        const trecho = a.trecho ? `<em>(${escapeHtml(a.trecho)})</em> ` : '';
        const prefixo = meta ? `<strong>${escapeHtml(meta)}:</strong> ` : '';
        const notas = a.notas ? ` <em>(${escapeHtml(a.notas)})</em>` : '';
        return `${trecho}${prefixo}${escapeHtml(a.texto || '')}${notas}`;
    });
    paratexto += blocoTextoHtml('Descrição Visual', item.descricaoVisual);
    paratexto += blocoTextoHtml('Inspiração', item.contextoHistorico);
    paratexto += blocoTextoHtml('Inspiração pública', ehInspiracaoPublica(item) ? 'Sim' : '');
    paratexto += blocoTextoHtml('Ocultação', item.ocultacao);
    paratexto += listaHtml('Anexos', item.anexos, (a) => {
        const prefixo = a.tipo ? `<strong>${escapeHtml(a.tipo)}:</strong> ` : '';
        const link = a.link
            ? ` — <a href="${escapeHtml(a.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline break-all">${escapeHtml(a.linkTexto || a.link)}</a>`
            : '';
        return `${prefixo}${escapeHtml(a.texto || '')}${link}${htmlAcessoEm(a)}`;
    });
    paratexto += blocoTextoHtml('Nota sobre o conjunto de anexos', item.anexosNotaGeral);

    let relacoes = '';
    // Elos e Ecos em lista, um por linha: cada entrada leva rótulo, título e
    // nota, e um texto pode ter muitos.
    relacoes += listaHtml('Elos', itensPorIds(item.conceitos?.elos), escapeHtml);
    relacoes += listaHtml('Ecos', itensPorIds(item.conceitos?.ecos), escapeHtml);
    relacoes += listaIntertextualidadeDoisNiveisHtml('Intertextualidade', item.intertextualidade);
    relacoes += listaHtml('Hipertextualidade', item.hipertextualidade, (h) => {
        const prefixo = tipoObraDaEntrada(h)
            ? `<strong>${escapeHtml(tipoObraDaEntrada(h))}:</strong> `
            : '';
        const link = h.link
            ? ` — <a href="${escapeHtml(h.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline break-all">${escapeHtml(h.linkTexto || h.link)}</a>`
            : '';
        const nota = h.nota ? ` <em>(${escapeHtml(h.nota)})</em>` : '';
        const quem = [textoAutoresDaEntrada(h), rotuloDaOrigem(h)].filter(Boolean).join('; ');
        const autor = quem ? ` (${escapeHtml(quem)})` : '';
        const descricao = String(h.descricao || '').trim()
            ? `, ${escapeHtml(String(h.descricao).trim())}`
            : '';
        return `${prefixo}${escapeHtml(corpoEntradaHipertextualidade(h))}${autor}${descricao}${htmlDataDaEntrada(h)}${h.obraPessoal === true ? ' (obra pessoal)' : ''}${link}${htmlAcessoEm(h)}${nota}`;
    });
    relacoes += listaIntertextualidadeHtml('Referências', item.referenciasExternas);

    let recepcao = '';
    recepcao += listaHtml('Envios e Reações', item.envios, (e) => {
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
    recepcao += listaHtml('Reconhecimentos', item.reconhecimentos, (r) => {
        const ano = r.ano || r.ano === 0 ? String(r.ano) : '';
        const meta = [r.premio, r.posicao, ano].filter(Boolean).join(', ');
        const prefixo = meta ? `<strong>${escapeHtml(meta)}:</strong> ` : '';
        return `${prefixo}${escapeHtml(r.texto || '')}`;
    });

    let avaliacao = '';
    if (autoclassificacaoValida(item.autoclassificacao)) {
        avaliacao += `
            <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">Classificação</h4>
            <div class="text-sm flex items-center gap-2">${renderCoracoesHtml(item.autoclassificacao, { somenteLeitura: true })}<span class="text-xs text-gray-400 dark:text-slate-500">${escapeHtml(formatarAutoclassificacaoTexto(item.autoclassificacao))}</span></div>`;
    }
    avaliacao += blocoTextoHtml('Avaliação', item.autoavaliacao);
    if (ehSorteavel(item)) avaliacao += blocoTextoHtml('Sorteio de leitura', 'Pode ser sorteado');
    avaliacao += blocoTextoHtml('Leitura autônoma', rotuloLeituraCondicionada(item));
    avaliacao += blocoTextoHtml('Valência', textoDaValencia(item, db.temas));
    if (ehAutorEmSigilo(item)) avaliacao += blocoTextoHtml('Autor em sigilo', 'Sim');
    // Leituras avaliativas (Fase 22): sempre à vista no Ver, sem depender da
    // caixa "Leituras", que só vale para o que é baixado.
    if (item.id !== undefined && item.id !== null) {
        avaliacao += leiturasParaHtml(
            getLeiturasDoTexto(item.id, item.tipo === 'prosa' ? 'prosa' : 'poema'),
        );
    }

    let controle = '';
    // Descartado: o "Cortado de" já está na linha de lugar, na Identificação.
    const cortado = item.status === 'descartado' ? null : livroSecaoStr(item.cortadoDe);
    const lancado = livroSecaoStr(item.lancadoEm);
    if (cortado || lancado) {
        controle += `<h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">Migração entre livros</h4>`;
        controle += `<ul class="list-disc list-inside text-sm space-y-0.5">`;
        if (cortado) controle += `<li>Cortado de: ${escapeHtml(cortado)}</li>`;
        if (lancado) controle += `<li>Lançado em: ${escapeHtml(lancado)}</li>`;
        controle += `</ul>`;
    }
    controle += blocoTextoHtml('Justificativa da Migração', item.justificativaMigracao);
    controle += blocoTextoHtml('Pendência', item.pendencia);
    controle += blocoTextoHtml('Descarte', item.descarte);

    const antes =
        grupoVerHtml('identificacao', 'Identificação', identificacao) +
        grupoVerHtml('contexto-retratado', 'Contexto retratado', retratado) +
        grupoVerHtml('conteudo-classificacao', 'Conteúdo e classificação', classificacao);
    const depois =
        grupoVerHtml('paratexto', 'Paratexto', paratexto) +
        grupoVerHtml('relacoes', 'Relações', relacoes) +
        grupoVerHtml('recepcao', 'Recepção', recepcao) +
        grupoVerHtml('avaliacao', 'Avaliação pessoal', avaliacao) +
        grupoVerHtml('controle', 'Controle do acervo', controle);

    const controles =
        antes || depois
            ? `
        <p class="text-[11px] text-gray-500 dark:text-slate-400 mb-1 flex gap-2">
            <button type="button" data-grupo-ver-todos="abrir" class="underline">Expandir tudo</button>
            <span aria-hidden="true">·</span>
            <button type="button" data-grupo-ver-todos="recolher" class="underline">Recolher tudo</button>
        </p>`
            : '';

    return (
        `<p class="text-xs font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 mb-3">${escapeHtml(tipoLabel)}</p>` +
        controles +
        antes +
        texto +
        depois
    );
}

// ─── Navegação Anterior/Próximo ───────────────────────────────
// A lista que a navegação percorre vem de fora (main.js registra, por tipo, uma
// função que devolve os ids que a aba mostra, já com busca, filtros e ordenação),
// pra este módulo não depender de render-listas.js. A lista é tirada uma vez, na
// abertura, e fica congelada enquanto o modal estiver aberto: o texto não "foge"
// do lugar se algo mudar por baixo.
const provedoresNavegacao = {};
let navegacao = { itens: [], pos: -1, rotulo: '' };

export function registrarListaNavegacaoVisualizacao(tipo, fn) {
    provedoresNavegacao[tipo] = fn;
}

const colecaoDoTipo = (tipo) => (tipo === 'prosa' ? db.prosas : db.poemas);
const itemExiste = (item) =>
    !!item && colecaoDoTipo(item.tipo).some((x) => String(x.id) === String(item.id));

// A lista pode vir de três jeitos: `opcoes.itens` (lista mista de Poemas e Prosas,
// cada um com `tipo` e `id`, como as Conexões montam), `opcoes.ids` (só do tipo
// aberto, na volta do Editar) ou a função que a aba registrou.
function montarNavegacao(tipo, id, opcoes = {}) {
    navegacao = { itens: [], pos: -1, rotulo: '' };
    let itens;
    if (Array.isArray(opcoes.itens)) {
        itens = opcoes.itens.map((i) => ({
            tipo: i.tipo === 'prosa' ? 'prosa' : 'poema',
            id: i.id,
        }));
    } else {
        const fn = provedoresNavegacao[tipo];
        if (!fn && !opcoes.ids) return;
        let ids;
        try {
            ids = opcoes.ids || fn();
        } catch {
            return;
        }
        itens = ids.map((x) => ({ tipo, id: x }));
    }
    const pos = itens.findIndex((i) => i.tipo === tipo && String(i.id) === String(id));
    if (pos >= 0) {
        navegacao = { itens, pos, rotulo: typeof opcoes.rotulo === 'string' ? opcoes.rotulo : '' };
    }
}

function atualizarControlesNavegacao() {
    const wrap = document.getElementById('visualizar-nav');
    if (!wrap) return;
    const ativo = navegacao.pos >= 0 && navegacao.itens.length > 1;
    wrap.classList.toggle('hidden', !ativo);
    const rotulo = document.getElementById('visualizar-lista-rotulo');
    if (rotulo) {
        rotulo.textContent = ativo ? navegacao.rotulo : '';
        rotulo.classList.toggle('hidden', !ativo || !navegacao.rotulo);
    }
    if (!ativo) return;
    const posicao = document.getElementById('visualizar-posicao');
    if (posicao) {
        posicao.value = String(navegacao.pos + 1);
        posicao.max = String(navegacao.itens.length);
    }
    const total = document.getElementById('visualizar-total');
    if (total) total.textContent = `de ${navegacao.itens.length}`;
    const ant = document.getElementById('visualizar-anterior');
    const prox = document.getElementById('visualizar-proximo');
    if (ant) ant.disabled = proximoIndiceExistente(-1) < 0;
    if (prox) prox.disabled = proximoIndiceExistente(1) < 0;
}

// Próxima posição da lista (no sentido de `delta`) cujo texto ainda existe.
function proximoIndiceExistente(delta) {
    const { itens, pos } = navegacao;
    for (let i = pos + delta; i >= 0 && i < itens.length; i += delta) {
        if (itemExiste(itens[i])) return i;
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

    // Sonoridade e Progressão só existem pra Poema (são sempre ligadas a
    // poemaId): pra Prosa as caixas ficam escondidas (ver acoes-coluna.js e
    // index.html pro mesmo recorte nos outros dois lugares).
    montarControlesMetadados();
    montarControlesLeituras();
    const wrapExtras = document.getElementById('download-extras-modal-visualizar-wrap');
    if (wrapExtras) {
        wrapExtras.classList.toggle('hidden', tipo !== 'poema');
        montarCaixasSonoridadeProgressao(wrapExtras);
    }

    // O select de formato começa no "Formato do Baixar" da coluna Ações da aba
    // (a escolha feita aqui vale só para este modal aberto, não é gravada).
    // Ao navegar entre textos, a escolha do select é mantida.
    return true;
}

// Função que roda uma vez quando o Ver fechar, pedida por `opcoes.retorno`. Fica
// guardada enquanto o Ver estiver no caminho (inclusive no desvio pelo Editar).
let retornoDoVer = null;

function dispararRetornoDoVer() {
    const fn = retornoDoVer;
    retornoDoVer = null;
    fn?.();
}

// `opcoes.ids`: com `navegar`, usa essa lista em vez de pedir outra à aba (só do
// tipo aberto). `opcoes.itens`: o mesmo, mas lista mista de Poemas e Prosas
// (`{ tipo, id }`), usada pelas Conexões e pela volta do Editar.
// `opcoes.rotulo`: texto curto mostrado no cabeçalho dizendo de que lista se trata
// (por exemplo, a obra cujos textos estão sendo percorridos).
// `opcoes.navegar`: liga os botões Anterior/Próximo, seguindo a lista que a aba
// mostra. Só a tabela de Poemas/Prosas liga; quem abre o Ver de outro lugar
// (por exemplo, dentro de um período) não tem lista de referência.
export async function abrirVisualizacao(tipo, id, opcoes = {}) {
    if (itensDaSelecao(tipo, [id]).length === 0) return;

    // Retorno pedido por quem abriu o Ver (o Ver do Livro, ao clicar num título da
    // Estrutura): roda quando este Ver fechar. Sem `retorno`, uma abertura nova
    // limpa o combinado antigo, exceto a volta do Editar (`manterRetorno`), que
    // reabre o mesmo Ver no meio do caminho.
    if (opcoes.retorno) retornoDoVer = opcoes.retorno;
    else if (!opcoes.manterRetorno) retornoDoVer = null;

    await garantirModal('modal-visualizar');
    if (!preencherVisualizacao(tipo, id)) return;

    const selFormato = document.getElementById('visualizar-baixar-formato');
    if (selFormato) selFormato.value = getFormatoBaixar(tipo === 'prosa' ? 'prosas' : 'poemas');

    navegacao = { itens: [], pos: -1, rotulo: '' };
    if (opcoes.navegar) montarNavegacao(tipo, id, opcoes);
    atualizarControlesNavegacao();

    montarControlesIncluirOcultos();

    montarControlesInfosPapel();
    if (retornoDoVer) aoFecharModalUmaVez('modal-visualizar', dispararRetornoDoVer);
    await toggleModal('modal-visualizar');
}

// Botões Anterior (-1) e Próximo (+1) do cabeçalho do modal. Pula textos que
// deixaram de existir; nas pontas da lista não faz nada (sem dar a volta).
export function navegarVisualizacao(delta) {
    if (!itemAtual || navegacao.pos < 0) return;
    const alvo = proximoIndiceExistente(delta);
    if (alvo < 0) return;
    const destino = navegacao.itens[alvo];
    if (!preencherVisualizacao(destino.tipo, destino.id)) return;
    navegacao.pos = alvo;
    atualizarControlesNavegacao();
    montarControlesIncluirOcultos();
    montarControlesInfosPapel();
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
    const total = navegacao.itens.length;
    const desejado = Math.min(Math.max(n, 1), total) - 1;
    const existe = (i) => itemExiste(navegacao.itens[i]);
    let alvo = -1;
    for (let d = 0; d < total && alvo < 0; d++) {
        if (desejado + d < total && existe(desejado + d)) alvo = desejado + d;
        else if (desejado - d >= 0 && existe(desejado - d)) alvo = desejado - d;
    }
    if (alvo < 0 || alvo === navegacao.pos) {
        atualizarControlesNavegacao();
        return;
    }
    const destinoPos = navegacao.itens[alvo];
    if (!preencherVisualizacao(destinoPos.tipo, destinoPos.id)) return;
    navegacao.pos = alvo;
    atualizarControlesNavegacao();
    montarControlesIncluirOcultos();
    montarControlesInfosPapel();
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

// Combina "ao fechar o formulário de edição, reabrir o Ver deste texto". Guarda
// o combinado em `voltaAoVer` enquanto ele vale (some quando o Ver reabre), para
// o olho do Editar saber se o formulário já veio do Ver.
let voltaAoVer = null;

function registrarVoltaAoVer(volta) {
    voltaAoVer = volta;
    aoFecharModalUmaVez(volta.tipo === 'prosa' ? 'modal-prosa' : 'modal-poema', () => {
        voltaAoVer = null;
        abrirVisualizacao(volta.tipo, volta.id, {
            manterRetorno: true,
            ...(volta.itens
                ? { navegar: true, itens: volta.itens, rotulo: volta.rotulo || '' }
                : {}),
        });
    });
}

// Olho do cabeçalho do Editar poema: troca o Editar pelo Ver do mesmo poema (um
// modal só de cada vez, sem empilhar). O Ver só mostra o que está salvo, então
// com alterações pendentes pergunta antes: "Salvar e ver", "Descartar e ver" ou
// Cancelar (continua no Editar). Salvar já fecha o Editar; ao fechar, o Ver abre
// pelo mesmo combinado do botão Editar do Ver, então nunca abre duas vezes. Poema
// novo (ainda sem id) não tem o que ver: o botão nem aparece.
export async function verDoModalEdicao() {
    const campo = document.getElementById('p-edit-id')?.value;
    if (!campo) return;
    const id = Number(campo);
    if (!db.poemas.some((p) => String(p.id) === String(id))) return;

    // Formulário aberto pelo Ver: o combinado de voltar já existe (e leva a lista de
    // navegação); senão o olho cria um, sem lista.
    const anterior =
        voltaAoVer && voltaAoVer.tipo === 'poema' && String(voltaAoVer.id) === String(id)
            ? voltaAoVer
            : null;
    const volta = anterior || { tipo: 'poema', id, itens: null };
    const agendar = () => registrarVoltaAoVer(volta);
    const modalAberto = () => !document.getElementById('modal-poema')?.classList.contains('hidden');

    if (!rastreadorPoema.estaSujo()) {
        agendar();
        await toggleModal('modal-poema');
        return;
    }

    abrirModalConfirmacao({
        titulo: 'Salvar antes de ver?',
        rotulo: 'Alterações não salvas',
        mensagem:
            'A visualização mostra só o que já está salvo. Salve para ver as alterações, ou descarte-as.',
        textoConfirmar: 'Salvar e ver',
        corConfirmar: '#059669',
        focarConfirmar: true,
        acaoSecundaria: {
            texto: 'Descartar e ver',
            onClick: () => {
                agendar();
                rastreadorPoema.marcarLimpo();
                toggleModal('modal-poema');
            },
        },
        onConfirmar: () => {
            agendar();
            // O envio fecha o formulário na hora quando salva (e o Ver abre pelo
            // combinado acima). Se algo impediu (campo obrigatório, data fora de
            // ordem), o formulário segue aberto e o combinado é desfeito, para um
            // X depois não abrir o Ver sem ninguém pedir.
            document.getElementById('form-poema')?.requestSubmit();
            if (modalAberto() && !anterior) {
                voltaAoVer = null;
                cancelarAoFecharModal('modal-poema');
            }
        },
    });
}

// Botão "Editar" do rodapé: fecha o Ver e abre o formulário do mesmo texto.
// Ao fechar o formulário, o Ver reabre (ver aoFecharModalUmaVez em modais.js).
export async function editarDoModalVisualizacao() {
    if (!itemAtual) return;
    const { tipo, id } = itemAtual;
    const colecao = tipo === 'prosa' ? db.prosas : db.poemas;
    if (!colecao.some((x) => String(x.id) === String(id))) return;
    // Só quando o formulário vem daqui: ao fechar (salvar, cancelar, X ou Esc) a
    // pessoa volta ao Ver do mesmo texto, na mesma lista de navegação.
    const itens = navegacao.pos >= 0 ? navegacao.itens.map((i) => ({ ...i })) : null;
    registrarVoltaAoVer({ tipo, id, itens, rotulo: navegacao.rotulo });
    // Se o Ver veio do Ver do Livro, a volta ao livro espera: primeiro o Editar,
    // depois o Ver de novo, e só ao fechar este é que o livro reabre.
    cancelarAoFecharModal('modal-visualizar');
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
            navegacao.itens.splice(idx, 1);
            const existe = (i) => itemExiste(navegacao.itens[i]);
            for (let i = idx; i < navegacao.itens.length && destino < 0; i++) {
                if (existe(i)) destino = i;
            }
            for (let i = idx - 1; i >= 0 && destino < 0; i--) {
                if (existe(i)) destino = i;
            }
        }
        const alvoExcluir = destino >= 0 ? navegacao.itens[destino] : null;
        if (!alvoExcluir || !preencherVisualizacao(alvoExcluir.tipo, alvoExcluir.id)) {
            itemAtual = null;
            navegacao = { itens: [], pos: -1, rotulo: '' };
            await toggleModal('modal-visualizar');
            return;
        }
        navegacao.pos = destino;
        atualizarControlesNavegacao();
        montarControlesIncluirOcultos();
        montarControlesInfosPapel();
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
