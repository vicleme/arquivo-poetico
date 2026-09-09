// ============================================================
// celulas-tabela.js — Helpers de renderização de célula/linha e
// cabeçalho das tabelas de Poemas/Prosas: badges (Etiquetas, Pessoas,
// Grupos, Autoria, Envios, Reconhecimentos, Época), resolução de
// título de Elos/Referências, formatação de nota/trecho, célula de
// "Campos Preenchidos", montagem de <thead> (ordenável ou com lupa) e
// da barra de paginação, e os botões da coluna Ações.
//
// Extraído de render-listas.js, que continua com a orquestração por
// aba (renderPoemas/renderProsas/etc.), o estado de filtro/paginação/
// ordenação (`itensPorPagina`, `ordenacaoPoemas`, exportados só-leitura
// daqui pra montarPaginacao/thOrdenavel/montarCabecalho usarem) e
// `decorarCamposBusca` (que fica lá por chamar `resolverTituloPoemaOuProsa`
// — daqui — mas também precisar ficar perto de getListaVisivelPoemas/
// Prosas, que reatribuem estado local delas). Import circular com
// render-listas.js é proposital, mesmo espírito do de selecao-massa.js:
// este módulo só lê `itensPorPagina`/`ordenacaoPoemas`/`ICONE_EDITAR`/
// `ICONE_EXCLUIR` de lá dentro de corpo de função, nunca no topo.
// ============================================================

import { db } from './db.js';
import {
    formatarDataParcial,
    nomeEpoca,
    escapeHtml,
    PREFIXOS_CANONICOS_POR_CAMPO,
    rotuloElo,
    iniciaisPapeisPessoa,
    paresGrupoPessoa,
    agruparParesGrupoPessoa,
    classesCorGrupo,
    paresAutoria,
    SINALIZACOES_CATEGORIAS,
    CAMPOS_CONTAVEIS,
} from './utils.js';
import { getAcoesAtivas, renderSeletorAcoes } from './acoes-coluna.js';
import { DEFINICAO_COLUNAS, getColunasAtivas, renderSeletorColunas } from './colunas.js';
import {
    getColunasContagem,
    renderSeletorColunasContagem,
    PREFIXO_ORDENACAO as PREFIXO_ORDENACAO_CONTAGEM,
} from './colunas-contagem.js';
import { contarCamposPreenchidos, TOTAL_CAMPOS_CONSIDERADOS } from './exportar-md.js';
import {
    ICONE_EDITAR,
    ICONE_EXCLUIR,
    itensPorPagina,
    OPCOES_ITENS_POR_PAGINA,
    ordenacaoPoemas,
} from './render-listas.js';

// Ver = olho; Baixar = seta pra baixo com bandeja — só usados na coluna
// Ações de Poemas/Prosas (ver acoes-coluna.js). ICONE_EDITAR/ICONE_EXCLUIR
// continuam em render-listas.js (usados também nos cards de
// Livros/Partes/Seções/Elementos/Pessoas/Grupos/Autores/Épocas).
const ICONE_VER = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"/><circle cx="10" cy="10" r="2.25"/></svg>`;
const ICONE_BAIXAR = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M10 3v9.5"/><path d="M6 9l4 4 4-4"/><path d="M3.5 15.5h13"/></svg>`;

// Botões da coluna Ações de Poemas/Prosas (Ver/Baixar/Editar/Excluir,
// ver acoes-coluna.js), montados conforme a configuração salva de cada
// tabela — só entram os habilitados, na ordem fixa de DEFINICAO_ACOES.
// `tipo` é 'poema'/'prosa' (usado por ver-item/baixar-item em
// main.js e por deleteItem, que espera 'poemas'/'prosas').
export function celulaAcoesItem(tabela, tipo, tipoPlural, id) {
    const ativas = new Set(getAcoesAtivas(tabela));
    const botoes = [];
    if (ativas.has('ver'))
        botoes.push(
            `<button data-action="ver-item" data-tipo="${tipo}" data-id="${id}" title="Ver" aria-label="Ver" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_VER}</button>`,
        );
    if (ativas.has('baixar'))
        botoes.push(
            `<button data-action="baixar-item" data-tabela="${tabela}" data-tipo="${tipo}" data-id="${id}" title="Baixar" aria-label="Baixar" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_BAIXAR}</button>`,
        );
    if (ativas.has('editar'))
        botoes.push(
            `<button data-action="editar-${tipo}" data-id="${id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-1.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800">${ICONE_EDITAR}</button>`,
        );
    if (ativas.has('excluir'))
        botoes.push(
            `<button data-action="excluir-item" data-tipo="${tipoPlural}" data-id="${id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>`,
        );
    return botoes.join('');
}

// ─── Colunas dinâmicas de Poemas/Prosas ────────────────────────

// ─── Colunas dinâmicas de Poemas/Prosas ────────────────────────

// Badges de etiqueta (reaproveitado nas colunas opcionais "Etiquetas" e
// "Gênero" — mesma lógica de string "a, b, c" → chips, cor customizável).
export function badgesEtiquetas(
    sinalizacoes,
    corClasse = 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
) {
    if (!sinalizacoes) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    return (
        sinalizacoes
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map(
                (t) =>
                    `<span class="text-[9px] ${corClasse} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(t)}</span>`,
            )
            .join('') || '<span class="text-gray-300 dark:text-slate-600">—</span>'
    );
}

// Coluna "Etiquetas": mesmo tratamento por cor que a coluna Grupos já
// tem (cada badge com a cor do que ele representa), só que aqui a cor é
// fixa por categoria (SINALIZACOES_CATEGORIAS), não cadastrável pelo
// Victor como a cor de Grupo — são 8 categorias fechadas, não entidades
// com registro próprio. Mesmo espírito das cores fixas já usadas em
// Elos (ciano) e Referências (fuchsia): cor comunica o "tipo" da tag
// só de bater o olho, sem abrir o item.
const CORES_CATEGORIA_SINALIZACAO = {
    tradicao: 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
    estilo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300',
    tema: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
    relacao: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
    sensibilidade: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
    tom: 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300',
    dominioImagetico: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300',
    outros: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
};

// Percorre as 8 categorias em vez de usar sinalizacoesCombinadas (que
// achata tudo numa string só, perdendo de qual campo cada tag veio) —
// aqui a categoria de origem de cada tag é o que decide a cor do badge.
export function badgesEtiquetasPorCategoria(item) {
    const badges = Object.entries(SINALIZACOES_CATEGORIAS).flatMap(([categoria, campo]) => {
        const valor = item[campo];
        if (!valor) return [];
        const corClasse = CORES_CATEGORIA_SINALIZACAO[categoria];
        return valor
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map(
                (t) =>
                    `<span class="text-[9px] ${corClasse} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(t)}</span>`,
            );
    });
    return badges.length
        ? badges.join('')
        : '<span class="text-gray-300 dark:text-slate-600">—</span>';
}

// Coluna de Pessoas: pessoas é array de objeto {pessoaId, papeis} —
// nome vem do cadastro central db.pessoas (ver migrarPessoasParaCadastro
// em db.js); papeis é array, desde o multi-select (ver migrarPapeisPessoa)
// — cada chip mostra o nome e, quando há papéis marcados, as iniciais
// deles (Re/In/De/Me/Al/As — ver iniciaisPapeisPessoa em utils.js) separadas por
// "·", na ordem em que foram marcados no editor (não é hierarquia fixa
// por categoria — ver alternarPapel em editor.js). Iniciais em vez do
// nome por extenso pra caber na coluna sem poluir; passar o mouse por
// cima do chip mostra "Nome (Papel1, Papel2)" por extenso via `title`
// (mesmo padrão da bolinha de status/pendência, ver DEFINICAO_COLUNAS
// mais abaixo). Sem papel marcado, o title mostra só o nome — não faz
// sentido escrever "(sem papel)" ali. Exportação pra MD também mantém os
// papéis por extenso (ver exportar-md.js). pessoaId sem correspondência
// no cadastro (não deveria acontecer) não gera chip, em vez de mostrar
// "undefined". Iniciais em preto (claro) / branco (escuro) sólido, sem
// opacity — testado com opacity-70 sobre o rosa e ficava baixo contraste
// demais pra ler rápido numa coluna cheia de chips; texto sólido é mais
// legível mesmo sendo secundário ao nome.
export function badgesPessoas(pessoas) {
    if (!Array.isArray(pessoas) || !pessoas.length)
        return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    return pessoas
        .map((p) => {
            const nome = db.pessoas.find((x) => x.id == p.pessoaId)?.nome;
            if (!nome) return '';
            const papeis = Array.isArray(p.papeis) ? p.papeis.filter(Boolean) : [];
            const iniciais = escapeHtml(iniciaisPapeisPessoa(papeis));
            const title = papeis.length ? `${nome} (${papeis.join(', ')})` : nome;
            return `<span title="${escapeHtml(title)}" class="text-[9px] bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(nome)}${iniciais ? ` <span class="text-black dark:text-white font-medium">${iniciais}</span>` : ''}</span>`;
        })
        .join('');
}

// Coluna de Grupos: um badge por par (Grupo, Pessoa) — ver paresGrupoPessoa
// em utils.js (mesma resolução usada no painel do modal — ver
// renderPainelGruposDoChip em editor.js — e na exportação em Markdown —
// ver exportar-md.js). Cada badge usa a cor própria daquele grupo
// (classesCorGrupo) e mostra "Grupo (Pessoa)" pra não perder de quem é
// o vínculo quando o item tem mais de uma pessoa em grupos diferentes.
// Além disso, um badge por grupo referenciado diretamente
// (item.gruposDiretos — ver obterGruposDiretos em editor.js), sem o
// parêntese de pessoa (não há uma pessoa específica associada).
export function badgesGrupos(item) {
    const pares = paresGrupoPessoa(item, db.pessoas, db.grupos);
    const diretos = (item.gruposDiretos || [])
        .map((id) => db.grupos.find((g) => g.id == id))
        .filter(Boolean);
    if (!pares.length && !diretos.length)
        return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    // Agrupado por Grupo (ver agruparParesGrupoPessoa em utils.js): um
    // badge por Grupo, com todas as pessoas que pertencem a ele entre
    // parênteses — não um badge repetido por pessoa.
    const badgesViaPessoa = agruparParesGrupoPessoa(pares).map(
        ({ grupo, pessoas }) =>
            `<span class="text-[9px] ${classesCorGrupo(grupo.cor)} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(grupo.nome)} <span class="opacity-70">(${pessoas.map((p) => escapeHtml(p.nome)).join(', ')})</span></span>`,
    );
    const badgesDiretos = diretos.map(
        (grupo) =>
            `<span class="text-[9px] ${classesCorGrupo(grupo.cor)} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(grupo.nome)}</span>`,
    );
    return [...badgesViaPessoa, ...badgesDiretos].join('');
}

// Coluna de Autoria: um badge por par (Autor, papel) — ver paresAutoria
// em utils.js. Diferente de badgesPessoas, papel aqui é sempre único e
// sempre marcado (todo item.autoria vem preenchido pela migração — ver
// migrarAutoria em db.js), então o badge sempre mostra "Nome (Papel)"
// por extenso — não precisa reduzir a iniciais como em Pessoas, já que
// não acumula mais de um papel por autor no mesmo texto.
export function badgesAutoria(item) {
    const pares = paresAutoria(item, db.autores);
    if (!pares.length) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    return pares
        .map(
            ({ autor, papel }) =>
                `<span class="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(autor.nome)} <span class="opacity-70">(${escapeHtml(papel)})</span></span>`,
        )
        .join('');
}

// Coluna de Envios: um badge por envio, "pessoa · data" no chip (com
// meio no title, hover) — igual espírito de badgesAutoria, mas sem
// cadastro central por trás (pessoa/meio são texto livre — ver
// comentário em criarListaDeEntradas/utils.js). A reação em si não
// cabe no chip (pode ser longa); fica só no modal/exportação — aqui é
// só "pra quem e quando", suficiente pra escanear a tabela.
export function badgesEnvios(item) {
    if (!Array.isArray(item.envios) || !item.envios.length) {
        return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    }
    return item.envios
        .map((e) => {
            const rotulo = [e.pessoa, formatarDataParcial(e.data)]
                .filter((v) => v && v !== '—')
                .map(escapeHtml)
                .join(' · ');
            const title = e.meio ? ` title="via ${escapeHtml(e.meio)}"` : '';
            return `<span class="text-[9px] bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block"${title}>${rotulo || '(sem dados)'}</span>`;
        })
        .join('');
}

// Coluna de Reconhecimentos: um badge por prêmio/menção, "prêmio ·
// posição · ano" no chip — mesmo espírito de badgesEnvios (sem
// cadastro central, premio/posicao são texto livre). O texto/nota em
// si não cabe no chip; fica só no modal/exportação.
export function badgesReconhecimentos(item) {
    if (!Array.isArray(item.reconhecimentos) || !item.reconhecimentos.length) {
        return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    }
    return item.reconhecimentos
        .map((r) => {
            const rotulo = [r.premio, r.posicao, r.ano]
                .filter((v) => v || v === 0)
                .map((v) => escapeHtml(String(v)))
                .join(' · ');
            return `<span class="text-[9px] bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${rotulo || '(sem dados)'}</span>`;
        })
        .join('');
}

// Badge do nome de Época na coluna Época Retratada (Poemas e Prosas —
// mesmo helper pras duas tabelas, ver CELULAS_POEMAS/CELULAS_PROSAS
// abaixo). Pedido do Victor: o "e pós" do recorte "repercussão" (ver
// ROTULOS_RECORTE_EPOCA em utils.js) precisa aparecer direto no badge,
// não só na exportação — mesmo texto que formatarEpocaRetratada já
// usa ("Nome e pós"). O Contexto do relacionamento (`contextoRelacao`,
// campo do cadastro central db.epocas — ver modal-epoca.html) não cabe
// no espaço do badge, então entra como `title` (hover), mesmo padrão
// já usado em badgesPessoas/badgesEnvios pra informação secundária que
// não precisa estar sempre visível.
export function badgeEpocaRetratada(epoca) {
    const nome = nomeEpoca(epoca, db.epocas);
    if (!nome) return '';
    const posRepercussao = epoca?.recorte === 'repercussão' ? ' e pós' : '';
    const contexto = epoca?.epocaId
        ? db.epocas.find((e) => e.id == epoca.epocaId)?.contextoRelacao
        : '';
    const title = contexto ? ` title="${escapeHtml(contexto)}"` : '';
    return `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-[10px] font-bold align-middle"${title}>${escapeHtml(nome)}${posRepercussao}</span>`;
}

// Resolve o título de um Elo/Referência-alvo, que pode ser um poema OU
// uma prosa — ids são gerados por um contador global único (gerarId()
// em utils.js), então nunca colidem entre os dois arrays; basta checar
// os dois. Usado por titulosPoemasPorId/textoTitulosPoemasPorId
// (tabela) e por _buscaElos/_buscaReferencias (decorarCamposBusca).
export function resolverTituloPoemaOuProsa(id) {
    return db.poemas.find((p) => p.id == id)?.titulo || db.prosas.find((pr) => pr.id == id)?.titulo;
}

// Títulos dos poemas referenciados por uma lista de Elos/Referências.
// Elos guarda { id, relacao, direcao, texto } (ver migrarElosParaRelacaoDirecao
// em db.js — redesenho Relação+Direção); Referências guarda { id, tipo, texto }
// (schema mais simples, não mudou). `resolverRotulo` isola essa diferença:
// cada chamador passa a função certa pra extrair o rótulo de exibição de
// uma entrada. O rótulo vira uma badge (mesmo padrão de Intertextualidade/
// Anexos logo abaixo), uma linha por vínculo — assim o tipo da relação não
// se confunde com o título do poema só de bater o olho na coluna.
// `corClasse` deixa Elos e Referências com uma cor de badge própria cada.
export function titulosPoemasPorId(
    lista,
    resolverRotulo,
    corClasse = 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300',
) {
    if (!lista || !lista.length) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    const linhas = lista
        .map((entrada) => {
            const titulo = resolverTituloPoemaOuProsa(entrada.id);
            if (!titulo) return null;
            const rotulo = resolverRotulo(entrada);
            const badge = rotulo
                ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded ${corClasse} text-[10px] font-bold uppercase align-middle">${escapeHtml(rotulo)}</span>`
                : '';
            return `<div>${badge}${escapeHtml(titulo)}</div>`;
        })
        .filter(Boolean);
    if (!linhas.length) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    return linhas.join('');
}

// Resolvedores de rótulo pra cada natureza de entrada — ver
// titulosPoemasPorId acima e textoTitulosPoemasPorId abaixo.
export function rotuloEntradaElo(entrada) {
    return entrada.relacao ? rotuloElo(entrada.relacao, entrada.direcao) : '';
}
export function rotuloEntradaReferencia(entrada) {
    return entrada.tipo || '';
}

export function trechoNota(notas) {
    if (!notas) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    const limpo = notas.trim();
    const trecho = limpo.length > 80 ? limpo.slice(0, 80) + '…' : limpo;
    return `<span title="${escapeHtml(limpo)}">${escapeHtml(trecho)}</span>`;
}

// Célula da coluna "Campos Preenchidos" (ver contarCamposPreenchidos em
// exportar-md.js) — compartilhada entre Poemas e Prosas. Mostra "N/TOTAL"
// mais uma barrinha de preenchimento, pra bater o olho e comparar a
// riqueza/complexidade estrutural entre os textos sem abrir cada um.
export function celulaCamposPreenchidos(item) {
    const preenchidos = contarCamposPreenchidos(item);
    const proporcao = Math.round((preenchidos / TOTAL_CAMPOS_CONSIDERADOS) * 100);
    return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400" title="${preenchidos} de ${TOTAL_CAMPOS_CONSIDERADOS} campos preenchidos">
        <div class="flex items-center gap-2">
            <span class="font-mono">${preenchidos}/${TOTAL_CAMPOS_CONSIDERADOS}</span>
            <span class="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <span class="block h-full bg-indigo-400 dark:bg-indigo-500" style="width: ${proporcao}%"></span>
            </span>
        </div>
    </td>`;
}

// Monta o <thead> de Poemas ou Prosas de acordo com as colunas ativas.
// `celulaCheck`/`celulaTitulo`/`celulaAcoes` são o HTML fixo de início/fim
// (checkbox, título e Ações), que não passam pelo seletor de colunas.
// Monta a barra de paginação (itens por página + Anterior/Próxima) exibida
// abaixo da tabela. totalItens é o total já filtrado (não só o da página).
export function montarPaginacao(totalItens, paginaAtual, acaoPagina) {
    if (totalItens === 0) return '';

    const porPagina = itensPorPagina === Infinity ? totalItens : itensPorPagina;
    const totalPaginas =
        itensPorPagina === Infinity ? 1 : Math.max(1, Math.ceil(totalItens / itensPorPagina));
    const inicio = (paginaAtual - 1) * porPagina + 1;
    const fim = Math.min(paginaAtual * porPagina, totalItens);

    const seletor = `
        <label class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
            Itens por página:
            <select onchange="setItensPorPagina(this.value)"
                class="border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded px-1.5 py-1 text-xs">
                ${OPCOES_ITENS_POR_PAGINA.map((n) => `<option value="${n}" ${itensPorPagina === n ? 'selected' : ''}>${n}</option>`).join('')}
                <option value="todos" ${itensPorPagina === Infinity ? 'selected' : ''}>Todos</option>
            </select>
        </label>`;

    const navegacao =
        totalPaginas > 1
            ? `
        <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            <button data-action="${acaoPagina}" data-pagina="${paginaAtual - 1}" ${paginaAtual <= 1 ? 'disabled' : ''}
                class="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700">‹ Anterior</button>
            <span>Página ${paginaAtual} de ${totalPaginas}</span>
            <button data-action="${acaoPagina}" data-pagina="${paginaAtual + 1}" ${paginaAtual >= totalPaginas ? 'disabled' : ''}
                class="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700">Próxima ›</button>
        </div>`
            : '<span></span>';

    return `
        <div class="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
            ${seletor}
            <span class="text-xs text-gray-400 dark:text-slate-500">${inicio}–${fim} de ${totalItens}</span>
            ${navegacao}
        </div>`;
}

// Seta indicando a coluna ativa e sua direção — ou um ícone neutro (↕)
// nas demais colunas ordenáveis, pra sinalizar que também dá pra clicar
// nelas.
function iconeOrdenacao(ativo, direcao) {
    if (!ativo) return '<span class="inline-block w-3 text-gray-300 dark:text-slate-600">↕</span>';
    return `<span class="inline-block w-3 text-blue-600 dark:text-blue-400">${direcao === 'asc' ? '▲' : '▼'}</span>`;
}

// Coluna → campo do item decorado usado pela busca (ver decorarCamposBusca
// acima e CAMPOS_ATRIBUTO em utils.js), uma por tabela. Só entram aqui as
// colunas que têm um prefixo "campo:" correspondente — em Poemas, Status
// e Datas ficam de fora de propósito: já têm filtro estruturado próprio
// (dropdown/painel de data). Elos/Referências (item 1 do schema ainda
// pendente) ficam de fora porque ainda não têm texto decorado pra
// buscar. Em Prosas, Datas e Vínculo (posição estrutural, não um campo
// de texto único) ficam de fora pelo mesmo motivo das Datas de Poemas.
// Época Retratada entrou (item 3) apesar de ter filtro estruturado de
// data próprio — mesmo assim, com nome agora resolvido via cadastro
// central (_buscaEpoca), faz sentido ter a lupa de atalho pro prefixo
// "epoca:", igual autoria — a data continua só pelo painel dedicado.
// pessoas aponta pro campo decorado "_buscaPessoas" (não pro nome cru da
// coluna) — mesma convenção de todas as outras entradas aqui; sem isso a
// lupa da coluna Pessoas não teria prefixo correspondente em
// PREFIXOS_CANONICOS_POR_CAMPO (utils.js) e não apareceria.
const COLUNA_CAMPO_BUSCA = {
    poemas: {
        titulo: 'titulo',
        pessoas: '_buscaPessoas',
        grupos: '_buscaGrupos',
        intertextualidade: '_buscaIntertexto',
        anexos: '_buscaAnexos',
        anexosNotaGeral: 'anexosNotaGeral',
        anotacoesMarginais: '_buscaAnotacoes',
        descricaoVisual: 'descricaoVisual',
        contextoHistorico: 'contextoHistorico',
        etiquetas: '_buscaSinalizacoes',
        notas: 'notas',
        ocultacao: 'ocultacao',
        conteudoSensivel: 'conteudoSensivel',
        vocabularioHiperacionante: 'vocabularioHiperacionante',
        descarte: 'descarte',
        pendencia: 'pendencia',
        cortadoDe: '_buscaCortadoDe',
        lancadoEm: '_buscaLancadoEm',
        justificativaMigracao: 'justificativaMigracao',
        elos: '_buscaElos',
        referencias: '_buscaReferencias',
        autoria: '_buscaAutoria',
        envios: '_buscaEnvios',
        reconhecimentos: '_buscaReconhecimentos',
        autoavaliacao: 'autoavaliacao',
        epocaRetratada: '_buscaEpoca',
    },
    prosas: {
        titulo: 'titulo',
        pessoas: '_buscaPessoas',
        grupos: '_buscaGrupos',
        genero: 'genero',
        etiquetas: '_buscaSinalizacoes',
        notas: 'notas',
        autoria: '_buscaAutoria',
        envios: '_buscaEnvios',
        reconhecimentos: '_buscaReconhecimentos',
        autoavaliacao: 'autoavaliacao',
        // Item 4: mesmas entradas de Poemas para os campos que Prosa
        // acabou de ganhar (ver decorarCamposBusca acima — já genérico,
        // roda igual pras duas tabelas, então os campos decorados
        // _busca* já existem pra Prosa desde sempre).
        intertextualidade: '_buscaIntertexto',
        anexos: '_buscaAnexos',
        anexosNotaGeral: 'anexosNotaGeral',
        contextoHistorico: 'contextoHistorico',
        ocultacao: 'ocultacao',
        conteudoSensivel: 'conteudoSensivel',
        vocabularioHiperacionante: 'vocabularioHiperacionante',
        descarte: 'descarte',
        pendencia: 'pendencia',
        cortadoDe: '_buscaCortadoDe',
        lancadoEm: '_buscaLancadoEm',
        justificativaMigracao: 'justificativaMigracao',
        elos: '_buscaElos',
        referencias: '_buscaReferencias',
        epocaRetratada: '_buscaEpoca',
    },
};

// Ícone de atalho pra busca por essa coluna (ver buscarPorPrefixo) — só
// aparece quando a coluna tem um prefixo "campo:" correspondente.
// mousedown+preventDefault (não click) pelo mesmo motivo do resto da UI de
// busca: evita que o botão roube o foco antes do input.focus() dentro da
// própria função.
function iconeBuscaColuna(tabela, campoItem) {
    if (!campoItem || !PREFIXOS_CANONICOS_POR_CAMPO[campoItem]) return '';
    const prefixo = PREFIXOS_CANONICOS_POR_CAMPO[campoItem];
    return `<span onmousedown="event.preventDefault(); event.stopPropagation(); buscarPorPrefixo('${tabela}', '${campoItem}')"
        class="text-gray-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
        title="Buscar por ${prefixo}:">🔍</span>`;
}

// <th> clicável: alterna a ordenação da tabela de Poemas pra essa coluna
// (ver ordenarPoemasPor). `campo` é a key usada em COMPARADORES_ORDENACAO_POEMAS
// (ou 'titulo'/'estrutura', os dois casos especiais). `campoItem`, quando
// informado, é o campo decorado usado pela busca (ver COLUNA_CAMPO_BUSCA)
// — controla se a lupa de atalho aparece.
// `sticky top-0` vai direto em cada <th> (não no <thead>, nem no <tr>) —
// em vários navegadores, sticky em table-row-group/table-row é ignorado ou
// inconsistente, ainda mais combinado com border-collapse; em <th>
// (table-cell) funciona de forma confiável, então é aí que a regra mora.
function thOrdenavel(campo, label, estado, classeExtra = '', campoItem = null) {
    const ativo = estado.campo === campo;
    return `<th class="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700 ${classeExtra}">
        <span class="flex items-center gap-1">
            <button type="button" onclick="ordenarPoemasPor('${campo}')"
                class="flex items-center gap-1 font-semibold hover:text-blue-600 dark:hover:text-blue-400 select-none"
                title="Ordenar por ${escapeHtml(label)}">
                <span>${label}</span>
                ${iconeOrdenacao(ativo, estado.direcao)}
            </button>
            ${iconeBuscaColuna('poemas', campoItem)}
        </span>
    </th>`;
}

// <th> não-ordenável (Prosas não tem cabeçalho clicável pra ordenação —
// ver comentário em montarCabecalho), mas que ainda ganha a lupa de
// atalho quando a coluna tem prefixo de busca correspondente (ver
// COLUNA_CAMPO_BUSCA).
function thComLupa(label, campoItem, classeExtra = '') {
    return `<th class="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700 ${classeExtra}">
        <span class="flex items-center gap-1">
            <span class="font-semibold">${label}</span>
            ${iconeBuscaColuna('prosas', campoItem)}
        </span>
    </th>`;
}

// <th> de uma coluna de contagem (ver colunas-contagem.js): mesmo botão
// ordenável de thOrdenavel, mas com `campo` sintético (PREFIXO_ORDENACAO +
// id) e, no lugar da lupa de busca (colunas de contagem não têm prefixo de
// busca — ver item 3 do plano, o operador de busca por quantidade ficou
// pra depois), um <select> de campo + botão de remover, iguais aos do
// painel de configuração (renderSeletorColunasContagem).
function thContagem(coluna, estado) {
    const campoOrdenacao = PREFIXO_ORDENACAO_CONTAGEM + coluna.id;
    const ativo = estado.campo === campoOrdenacao;
    const label = CAMPOS_CONTAVEIS[coluna.campo]?.label || coluna.campo;
    const opcoes = Object.entries(CAMPOS_CONTAVEIS)
        .map(
            ([key, { label: l }]) =>
                `<option value="${key}" ${key === coluna.campo ? 'selected' : ''}>${l}</option>`,
        )
        .join('');
    return `<th class="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700">
        <div class="flex items-center gap-1">
            <button type="button" onclick="ordenarPoemasPor('${campoOrdenacao}')"
                class="flex items-center gap-1 font-semibold hover:text-blue-600 dark:hover:text-blue-400 select-none"
                title="Ordenar por Qtd. ${escapeHtml(label)}">
                <span>Qtd.</span>
                ${iconeOrdenacao(ativo, estado.direcao)}
            </button>
        </div>
        <div class="flex items-center gap-1 mt-1 font-normal">
            <select onchange="definirCampoColunaContagem('poemas', ${coluna.id}, this.value)"
                class="text-[10px] border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200 py-0.5 max-w-[7rem]">
                ${opcoes}
            </select>
            <button type="button" onclick="removerColunaContagem('poemas', ${coluna.id})"
                title="Remover essa coluna de contagem"
                class="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400">✕</button>
        </div>
    </th>`;
}

export function montarCabecalho(tabela, celulaCheck, celulaAcoes) {
    const ativas = getColunasAtivas(tabela);
    const def = DEFINICAO_COLUNAS[tabela];
    const camposBusca = COLUNA_CAMPO_BUSCA[tabela] || {};

    // Só Poemas tem cabeçalho ordenável por enquanto (ver DEFINICAO_COLUNAS —
    // é a única tabela cujas colunas têm sortType definido). Prosas ainda
    // ganha a lupa de atalho por coluna (ver thComLupa), só não a ordenação.
    if (tabela === 'poemas') {
        const tituloOrdenavel = thOrdenavel(
            'titulo',
            'ID / Título',
            ordenacaoPoemas,
            'left-8',
            camposBusca.titulo,
        );
        const meio = ativas
            .map((key) => def.find((c) => c.key === key))
            .filter(Boolean)
            .map((c) => thOrdenavel(c.key, c.label, ordenacaoPoemas, '', camposBusca[c.key]))
            .join('');
        // Colunas de contagem (ver colunas-contagem.js) vêm depois das
        // colunas fixas, na ordem em que foram criadas — só Poemas, mesmo
        // motivo do comentário acima (precisa de cabeçalho ordenável).
        const contagem = getColunasContagem('poemas')
            .map((c) => thContagem(c, ordenacaoPoemas))
            .join('');
        return celulaCheck + tituloOrdenavel + meio + contagem + celulaAcoes;
    }

    const tituloComLupa = thComLupa('Título', camposBusca.titulo, 'sticky left-8');
    const meio = ativas
        .map((key) => def.find((c) => c.key === key))
        .filter(Boolean)
        .map((c) => thComLupa(c.label, camposBusca[c.key]))
        .join('');
    return celulaCheck + tituloComLupa + meio + celulaAcoes;
}

export function atualizarPainelColunas(tabela, painelId) {
    const painel = document.getElementById(painelId);
    if (!painel) return;
    // Colunas de contagem (ver colunas-contagem.js) só existem em Poemas —
    // mesmo motivo do comentário em montarCabecalho (precisa de cabeçalho
    // ordenável). O botão "+ Adicionar" mora aqui; trocar campo/remover uma
    // já criada dá pra fazer tanto aqui quanto direto no cabeçalho da
    // tabela (thContagem acima) — os dois lêem/escrevem o mesmo estado.
    painel.innerHTML =
        renderSeletorColunas(tabela) +
        (tabela === 'poemas' ? renderSeletorColunasContagem(tabela) : '');
}

export function atualizarPainelAcoes(tabela, painelId) {
    const painel = document.getElementById(painelId);
    if (painel) painel.innerHTML = renderSeletorAcoes(tabela);
}

