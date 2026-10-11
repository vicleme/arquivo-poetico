// ============================================================
// celulas-tabela.js — Helpers de renderização de célula/linha e
// cabeçalho das tabelas de Poemas/Prosas: badges (Etiquetas, Pessoas,
// Grupos, Autoria, Envios, Reconhecimentos, Época), resolução de
// título de Elos/Referências, formatação de nota/trecho, célula de
// "Campos Preenchidos", montagem de <thead> (ordenável nas duas
// tabelas — ver item 1 do plano de integração em Prosa e Poema.md) e
// da barra de paginação, e os botões da coluna Ações.
//
// Extraído de render-listas.js, que continua com a orquestração por
// aba (renderPoemas/renderProsas/etc.), o estado de filtro/paginação/
// ordenação (`itensPorPagina`, `ordenacaoPoemas`/`ordenacaoProsas`,
// exportados só-leitura daqui pra montarPaginacao/thOrdenavel/
// montarCabecalho usarem) e `decorarCamposBusca` (que fica lá por
// chamar `resolverTituloPoemaOuProsa` — daqui — mas também precisar
// ficar perto de getListaVisivelPoemas/Prosas, que reatribuem estado
// local delas). Import circular com render-listas.js é proposital,
// mesmo espírito do de selecao-massa.js: este módulo só lê
// `itensPorPagina`/`ordenacaoPoemas`/`ordenacaoProsas`/`ICONE_EDITAR`/
// `ICONE_EXCLUIR` de lá dentro de corpo de função, nunca no topo.
// ============================================================

import { db } from './db.js';
import {
    ROTULOS_CENTRALIDADE_PERSONAGEM,
    normalizarCentralidadePersonagem,
    normalizarPapeisPersonagem,
} from './personagens.js';
import { rotuloEco } from './ancora-eco.js';
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
    nomeAutoriaExibido,
    SINALIZACOES_CATEGORIAS,
    renderCoracoesHtml,
    OPCOES_GRAFIA,
    temasComPapel,
    assuntosComPapel,
    ROTULOS_PAPEL_TEMA_CURTO,
    rotuloSelecaoEmLote,
} from './utils.js';
import { getAcoesAtivas, renderSeletorAcoes } from './acoes-coluna.js';
import { renderCheckboxDownloadAbrangenteAcoes } from './download-abrangente.js';
import { DEFINICAO_COLUNAS, getColunasAtivas, renderSeletorColunas } from './colunas.js';
import {
    getColunasContagem,
    renderSeletorColunasContagem,
    renderOpcoesCampoContagem,
    registroContavel,
    PREFIXO_ORDENACAO as PREFIXO_ORDENACAO_CONTAGEM,
} from './colunas-contagem.js';
import { contarCamposPreenchidos, TOTAL_CAMPOS_CONSIDERADOS } from './exportar-md.js';
import {
    ICONE_EDITAR,
    ICONE_EXCLUIR,
    itensPorPagina,
    OPCOES_ITENS_POR_PAGINA,
    ordenacaoPoemas,
    ordenacaoProsas,
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
// Victor como a cor de Grupo — são 9 categorias fechadas, não entidades
// com registro próprio. Mesmo espírito das cores fixas já usadas em
// Elos (ciano) e Referências (fuchsia): cor comunica o "tipo" da tag
// só de bater o olho, sem abrir o item.
const CORES_CATEGORIA_SINALIZACAO = {
    tradicao: 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
    estilo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300',
    tema: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
    territorialidade: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
    relacao: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
    sensibilidade: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
    tom: 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300',
    dominioImagetico: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300',
    outros: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
};

// Badge de um Tema com o papel dele: marcador visível só quando há papel
// (★ principal, ☆ secundário); o title diz "Nome (papel)".
// O marcador é maior que o texto do badge (9px deixava ★ e ☆ quase iguais) e
// ganha cor própria, independente da cor da categoria: principal em dourado
// forte (preenchido + cor chamativa), secundário em cinza (vazado + cor
// apagada) — assim o papel se lê pela forma E pela cor.
const MARCADOR_PAPEL_TEMA = { principal: '★', secundario: '☆' };
const CLASSE_MARCADOR_PAPEL_TEMA = {
    principal: 'text-amber-500 dark:text-amber-300 font-bold',
    secundario: 'text-gray-400 dark:text-slate-400',
};
function marcadorPapelHtml(papel) {
    const marcador = MARCADOR_PAPEL_TEMA[papel];
    if (!marcador) return '';
    return ` <span class="text-[13px] leading-none align-[-1px] ${CLASSE_MARCADOR_PAPEL_TEMA[papel]}">${marcador}</span>`;
}
function badgeTemaComPapel({ nome, papel }, corClasse) {
    const title = papel ? `${nome} (${ROTULOS_PAPEL_TEMA_CURTO[papel]})` : nome;
    return `<span title="${escapeHtml(title)}" class="text-[9px] ${corClasse} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(nome)}${marcadorPapelHtml(papel)}</span>`;
}

// Percorre as 9 categorias em vez de usar sinalizacoesCombinadas (que
// achata tudo numa string só, perdendo de qual campo cada tag veio) —
// aqui a categoria de origem de cada tag é o que decide a cor do badge.
// `semTema: true` tira os Temas das Etiquetas (a tabela tem coluna própria).
export function badgesEtiquetasPorCategoria(item, { semTema = false } = {}) {
    const badges = Object.entries(SINALIZACOES_CATEGORIAS).flatMap(([categoria, campo]) => {
        const valor = item[campo];
        if (!valor) return [];
        if (semTema && categoria === 'tema') return [];
        const corClasse = CORES_CATEGORIA_SINALIZACAO[categoria];
        // Tema com papel: o badge ganha um marcador (★ principal, ☆ secundário)
        // e o papel por extenso no title. Texto sem `temas` cai no caminho comum.
        if (categoria === 'tema' && Array.isArray(item.temas)) {
            return temasComPapel(item, db.temas).map((e) => badgeTemaComPapel(e, corClasse));
        }
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

// Coluna "Tema" (Poemas e Prosas): um selo por Tema, com ★ (principal) ou ☆
// (secundário) e o papel por extenso no title. Sem Tema, traço.
export function badgesTemas(item) {
    const corClasse = CORES_CATEGORIA_SINALIZACAO.tema;
    const lista = temasComPapel(item, db.temas);
    return lista.length
        ? lista.map((e) => badgeTemaComPapel(e, corClasse)).join('')
        : '<span class="text-gray-300 dark:text-slate-600">—</span>';
}

// Coluna "Assunto": Assuntos derivados dos Temas, cada um com o papel
// efetivo (★/☆). Papel fixado pela pessoa neste texto vem avisado no title.
export function badgesAssuntos(item) {
    const lista = assuntosComPapel(item, db.assuntos, db.temas);
    if (!lista.length) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    const cor = 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300';
    return lista
        .map((a) => {
            const base = a.papel ? `${a.nome} (${ROTULOS_PAPEL_TEMA_CURTO[a.papel]})` : a.nome;
            const title = a.fixado ? `${base} — papel fixado neste texto` : base;
            return `<span title="${escapeHtml(title)}" class="text-[9px] ${cor} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(a.nome)}${marcadorPapelHtml(a.papel)}</span>`;
        })
        .join('');
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

// Coluna de Personagens: um chip por vínculo (nome do cadastro db.personagens),
// com as iniciais dos papéis (Vo/In/Ap/Me/Al) e, na centralidade, o mesmo ★ (protagonista) e ☆
// (secundário) do papel de Tema. Personagem só com Menção/Alusão não tem
// centralidade (não se aplica), então fica sem marcador. O title traz tudo por
// extenso: "Nome (Papéis; centralidade)". Personagem sem cadastro não gera chip.
const INICIAIS_PAPEL_PERSONAGEM = {
    Voz: 'Vo',
    Interlocutor: 'In',
    Aparição: 'Ap',
    Menção: 'Me',
    Alusão: 'Al',
};
export function badgesPersonagens(item) {
    const vazio = '<span class="text-gray-300 dark:text-slate-600">—</span>';
    if (!Array.isArray(item?.personagens) || !item.personagens.length) return vazio;
    const chips = item.personagens
        .map((e) => {
            const nome = db.personagens?.find((x) => x.id == e.personagemId)?.nome;
            if (!nome) return '';
            const papeis = normalizarPapeisPersonagem(e.papeis);
            const centralidade = normalizarCentralidadePersonagem(e.centralidade, papeis);
            const iniciais = papeis.map((p) => INICIAIS_PAPEL_PERSONAGEM[p]).join('·');
            const partes = [];
            if (papeis.length) partes.push(papeis.join(', '));
            if (centralidade)
                partes.push(ROTULOS_CENTRALIDADE_PERSONAGEM[centralidade].toLowerCase());
            const title = partes.length ? `${nome} (${partes.join('; ')})` : nome;
            const marcador = marcadorPapelHtml(
                centralidade === 'protagonista' ? 'principal' : centralidade ? 'secundario' : '',
            );
            return `<span title="${escapeHtml(title)}" class="text-[9px] bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(nome)}${iniciais ? ` <span class="text-black dark:text-white font-medium">${escapeHtml(iniciais)}</span>` : ''}${marcador}</span>`;
        })
        .join('');
    return chips || vazio;
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
//
// Desambiguação por Autor (decisão B, 27/09/2026, ver
// manutencao/decisoes.md): Grupo deixou de ter nome único globalmente
// (agora só único por Autor — ver migrarGruposAutorId em db.js), então
// um texto de coautoria pode, em tese, citar dois Grupos com o mesmo
// nome vindos de Autores diferentes. Em vez de mostrar o Autor sempre
// (poluiria os 99% dos casos sem Autor duplicado), o nome do Autor só
// entra no badge quando há colisão de fato DENTRO deste item — ver
// rotuloGrupo/nomesColidindo abaixo.
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
    const viaPessoa = agruparParesGrupoPessoa(pares);
    const autorIdsPorNome = new Map();
    for (const g of [...viaPessoa.map((p) => p.grupo), ...diretos]) {
        if (!autorIdsPorNome.has(g.nome)) autorIdsPorNome.set(g.nome, new Set());
        autorIdsPorNome.get(g.nome).add(g.autorId);
    }
    const nomesColidindo = new Set(
        [...autorIdsPorNome.entries()]
            .filter(([, autorIds]) => autorIds.size > 1)
            .map(([nome]) => nome),
    );
    const rotuloGrupo = (grupo) => {
        if (!nomesColidindo.has(grupo.nome)) return escapeHtml(grupo.nome);
        const nomeAutor = db.autores.find((a) => a.id == grupo.autorId)?.nome || '(autor)';
        return `${escapeHtml(grupo.nome)}, ${escapeHtml(nomeAutor)}`;
    };
    const badgesViaPessoa = viaPessoa.map(
        ({ grupo, pessoas }) =>
            `<span class="text-[9px] ${classesCorGrupo(grupo.cor)} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${rotuloGrupo(grupo)} <span class="opacity-70">(${pessoas.map((p) => escapeHtml(p.nome)).join(', ')})</span></span>`,
    );
    const badgesDiretos = diretos.map(
        (grupo) =>
            `<span class="text-[9px] ${classesCorGrupo(grupo.cor)} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${rotuloGrupo(grupo)}</span>`,
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
        .map(({ autor, papel, assinatura, nomeLiterario }) => {
            const nome = nomeAutoriaExibido({ autor, assinatura, nomeLiterario });
            // Heterônimo/Pseudônimo em uso: badge mostra o nome literário,
            // `title` guarda o Autor real por trás dele (passar o mouse
            // revela quem é).
            const titulo =
                assinatura !== 'Ortônimo' && nomeLiterario
                    ? ` title="${escapeHtml(autor.nome)}"`
                    : '';
            return `<span class="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block"${titulo}>${escapeHtml(nome)} <span class="opacity-70">(${escapeHtml(papel)})</span></span>`;
        })
        .join('');
}

// Coluna "Fonte" (grupo Fonte do modal, `item.fonteTexto.origem/edicao/
// link` — ver linhasFonteTexto em utils.js): mostra o nome da fonte
// (origem), virando link clicável (mesmo padrão de Intertextualidade/
// Referências acima) quando `link` estiver preenchido; Edição, se
// houver, aparece entre parênteses em opacidade reduzida (mesmo
// espírito de badgesAutoria). Sem origem preenchida (texto próprio sem
// nada digitado no grupo Fonte), célula vazia — mesmo estado "—" do
// resto das colunas de texto livre.
export function celulaFonte(item) {
    const origem = (item.fonteTexto?.origem || '').trim();
    if (!origem) return '<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>';
    const link = (item.fonteTexto?.link || '').trim();
    const edicao = (item.fonteTexto?.edicao || '').trim();
    const nome = link
        ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">${escapeHtml(origem)}</a>`
        : escapeHtml(origem);
    const complemento = edicao ? ` <span class="opacity-70">(${escapeHtml(edicao)})</span>` : '';
    return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${nome}${complemento}</td>`;
}

// Coluna "Grafia" (mesmo grupo Fonte, `item.fonteTexto.grafia` —
// GRAFIA_ATUAL/GRAFIA_ETIMOLOGICA/GRAFIA_QUINHENTISTA em utils.js):
// vazio = nunca definido, mostrado como "—" igual ao resto das colunas.
// "Atual (padrão)" escolhido de propósito tem valor próprio
// (GRAFIA_ATUAL) e aparece como "Atual" na célula — diferente de "—",
// de propósito: a tabela também distingue "nunca mexi nisso" de
// "confirmei que é a grafia atual". Rótulo curto na célula (só a parte
// antes do parêntese explicativo de OPCOES_GRAFIA) com o rótulo
// completo no title, pra não estourar a largura da coluna com o
// exemplo/explicação que o select do modal mostra.
export function celulaGrafia(item) {
    const grafia = (item.fonteTexto?.grafia || '').trim();
    if (!grafia) return '<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>';
    const opcao = OPCOES_GRAFIA.find((o) => o.valor === grafia);
    const curto = opcao ? opcao.rotulo.split(' (')[0] : grafia;
    const title = opcao ? ` title="${escapeHtml(opcao.rotulo)}"` : '';
    return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400"${title}>${escapeHtml(curto)}</td>`;
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

// Resolve o título de um Elo/Eco-alvo, que pode ser um poema OU
// uma prosa — ids são gerados por um contador global único (gerarId()
// em utils.js), então nunca colidem entre os dois arrays; basta checar
// os dois. Usado por titulosPoemasPorId/textoTitulosPoemasPorId
// (tabela) e por _buscaElos/_buscaEcos (decorarCamposBusca).
export function resolverTituloPoemaOuProsa(id) {
    return db.poemas.find((p) => p.id == id)?.titulo || db.prosas.find((pr) => pr.id == id)?.titulo;
}

// Títulos dos poemas referenciados por uma lista de Elos/Ecos — ambos
// são a única dupla de Intratextualidade (vínculo por id a outro texto
// do acervo; Referências, o campo novo, não entra aqui por não ter
// vínculo por id, ver celulaReferenciasExternas). Elos guarda
// { id, relacao, direcao, texto } (ver migrarElosParaRelacaoDirecao em
// db.js — redesenho Relação+Direção); Ecos guarda { id, tipo, texto }
// (schema mais simples, não mudou, só o nome — era "Referências").
// `resolverRotulo` isola essa diferença: cada chamador passa a função
// certa pra extrair o rótulo de exibição de uma entrada. O rótulo vira
// uma badge (mesmo padrão de Intertextualidade/Anexos logo abaixo), uma
// linha por vínculo — assim o tipo da relação não se confunde com o
// título do poema só de bater o olho na coluna.
// `corClasse` deixa Elos e Ecos com uma cor de badge própria cada.
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
export function rotuloEntradaEco(entrada) {
    // Com âncora: "Personagem em comum (Iara, Tomás +1)" (F11-D6).
    return rotuloEco(db, entrada, 2);
}

export function trechoNota(notas) {
    if (!notas) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    const limpo = notas.trim();
    const trecho = limpo.length > 80 ? limpo.slice(0, 80) + '…' : limpo;
    return `<span title="${escapeHtml(limpo)}">${escapeHtml(trecho)}</span>`;
}

// Célula da coluna "Autoclassificação" — mesma marcação de corações do
// widget do modal (ver renderCoracoesHtml em utils.js), só que
// somenteLeitura (sem os botões de clique).
export function celulaAutoclassificacao(item) {
    return `<td class="p-4">${renderCoracoesHtml(item.autoclassificacao, { somenteLeitura: true })}</td>`;
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
// `tabela` ('poemas'|'prosas') e `idsPagina` (ids dos itens exibidos na
// página atual, na ordem da lista filtrada) são opcionais — sem eles, o
// botão "Selecionar estes N" não é renderizado (ver chamadas em
// render-listas.js pra quem passa os dois). `idsRestantes` (ids da lista
// filtrada que NÃO estão na página atual) e `selecao` (o Set da aba) são
// opcionais: com eles, o botão "Selecionar restantes (M)" aparece e os dois
// botões alternam (viram "Desselecionar ..." quando o lote já está todo
// selecionado).
export function montarPaginacao(
    totalItens,
    paginaAtual,
    acaoPagina,
    tabela,
    idsPagina,
    idsRestantes = [],
    selecao = new Set(),
) {
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

    // Só aparecem com mais de 1 página: com página única (ou "Todos"
    // escolhido no seletor), selecionar a página inteira e selecionar tudo
    // seriam a mesma ação — o checkbox do cabeçalho já cobre esse caso.
    // Os dois alternam: clicar de novo num lote já todo selecionado desmarca
    // só aquele lote (o que fica de fora da seleção continua como estava).
    // "Restantes" = o que a lista filtrada tem fora da página na tela (ids
    // não vão no atributo: o handler recalcula a partir da lista visível).
    // A classe comum e o data-sel-lote deixam atualizarBotoesSelecaoEmLote
    // (selecao-massa.js) reescrever o rótulo sem re-renderizar a tabela.
    const classeBotaoSel =
        'px-2 py-1 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700';
    const botaoSelecionarPagina =
        totalPaginas > 1 && tabela && idsPagina && idsPagina.length
            ? `<button data-action="selecionar-pagina-${tabela}" data-sel-lote="pagina" data-ids="${idsPagina.join(',')}"
                class="${classeBotaoSel}">${rotuloSelecaoEmLote('pagina', idsPagina, selecao)}</button>`
            : '';
    const botaoSelecionarRestantes =
        totalPaginas > 1 && tabela && idsPagina && idsPagina.length && idsRestantes.length
            ? `<button data-action="selecionar-restantes-${tabela}" data-sel-lote="restantes" data-ids="${idsPagina.join(',')}"
                class="${classeBotaoSel}">${rotuloSelecaoEmLote('restantes', idsRestantes, selecao)}</button>`
            : '';

    const meio = `
        <span class="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
            ${inicio}–${fim} de ${totalItens}
            ${botaoSelecionarPagina}
            ${botaoSelecionarRestantes}
        </span>`;

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
            ${meio}
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
// fica de fora de propósito: já tem filtro estruturado próprio (dropdown).
// Em Prosas, Vínculo (posição estrutural, não um campo de texto único)
// fica de fora pelo mesmo motivo.
// Data de escrita e Data de publicação já ficaram de fora por terem o
// painel De/Até; entraram depois que ganharam os prefixos "dataescrita:" e
// "datapublicacao:" (`*` / `-*` separam quem tem e quem não tem a data). A
// lupa é só atalho: o filtro De/Até continua à parte, no painel dedicado.
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
        idioma: 'idioma',
        movimentosEscolas: '_buscaMovimentosEscolas',
        posturaEstetica: '_buscaPosturas',
        programa: '_buscaProgramas',
        pessoas: '_buscaPessoas',
        personagens: '_buscaPersonagens',
        grupos: '_buscaGrupos',
        dataEscrita: '_buscaDataEscrita',
        dataPublicacao: '_buscaDataPublicacao',
        intertextualidade: '_buscaIntertexto',
        hipertextualidade: '_buscaHipertexto',
        anexos: '_buscaAnexos',
        anexosNotaGeral: 'anexosNotaGeral',
        anotacoesMarginais: '_buscaAnotacoes',
        descricaoVisual: 'descricaoVisual',
        contextoHistorico: 'contextoHistorico',
        localEscrita: '_buscaLocalEscrita',
        territorialidade: '_buscaTerritorialidade',
        etiquetas: '_buscaSinalizacoes',
        temas: 'sinalizacoesTema',
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
        ecos: '_buscaEcos',
        referenciasExternas: '_buscaReferenciasExternas',
        autoria: '_buscaAutoria',
        envios: '_buscaEnvios',
        reconhecimentos: '_buscaReconhecimentos',
        autoavaliacao: 'autoavaliacao',
        epocaRetratada: '_buscaEpoca',
        periodoHistoricoId: '_buscaPeriodoHistorico',
        assuntos: '_buscaAssuntos',
        fonte: '_buscaFonte',
        grafia: '_buscaGrafia',
        // ID do Sistema (ver comentário em CAMPOS_ATRIBUTO, utils.js) —
        // não é campo decorado por decorarCamposBusca, aponta direto
        // pro id cru do item.
        idSistema: 'id',
    },
    prosas: {
        titulo: 'titulo',
        idioma: 'idioma',
        movimentosEscolas: '_buscaMovimentosEscolas',
        posturaEstetica: '_buscaPosturas',
        programa: '_buscaProgramas',
        pessoas: '_buscaPessoas',
        personagens: '_buscaPersonagens',
        grupos: '_buscaGrupos',
        dataEscrita: '_buscaDataEscrita',
        dataPublicacao: '_buscaDataPublicacao',
        genero: 'genero',
        etiquetas: '_buscaSinalizacoes',
        temas: 'sinalizacoesTema',
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
        hipertextualidade: '_buscaHipertexto',
        anexos: '_buscaAnexos',
        anexosNotaGeral: 'anexosNotaGeral',
        contextoHistorico: 'contextoHistorico',
        localEscrita: '_buscaLocalEscrita',
        territorialidade: '_buscaTerritorialidade',
        ocultacao: 'ocultacao',
        conteudoSensivel: 'conteudoSensivel',
        vocabularioHiperacionante: 'vocabularioHiperacionante',
        descarte: 'descarte',
        pendencia: 'pendencia',
        cortadoDe: '_buscaCortadoDe',
        lancadoEm: '_buscaLancadoEm',
        justificativaMigracao: 'justificativaMigracao',
        elos: '_buscaElos',
        ecos: '_buscaEcos',
        referenciasExternas: '_buscaReferenciasExternas',
        epocaRetratada: '_buscaEpoca',
        periodoHistoricoId: '_buscaPeriodoHistorico',
        assuntos: '_buscaAssuntos',
        fonte: '_buscaFonte',
        grafia: '_buscaGrafia',
        idSistema: 'id',
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

// <th> clicável: alterna a ordenação da tabela (Poemas OU Prosas — ver
// ordenarPor em render-listas.js) pra essa coluna. `campo` é a key usada
// em COMPARADORES_ORDENACAO (ou 'titulo'/CAMPO_ESTRUTURA_POR_TABELA[tabela],
// os casos especiais). `campoItem`, quando informado, é o campo decorado
// usado pela busca (ver COLUNA_CAMPO_BUSCA) — controla se a lupa de
// atalho aparece.
// `sticky top-0` vai direto em cada <th> (não no <thead>, nem no <tr>) —
// em vários navegadores, sticky em table-row-group/table-row é ignorado ou
// inconsistente, ainda mais combinado com border-collapse; em <th>
// (table-cell) funciona de forma confiável, então é aí que a regra mora.
function thOrdenavel(tabela, campo, label, estado, classeExtra = '', campoItem = null) {
    const ativo = estado.campo === campo;
    return `<th class="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700 ${classeExtra}">
        <span class="flex items-center gap-1">
            <button type="button" onclick="ordenarPor('${tabela}', '${campo}')"
                class="flex items-center gap-1 font-semibold hover:text-blue-600 dark:hover:text-blue-400 select-none"
                title="Ordenar por ${escapeHtml(label)}">
                <span>${label}</span>
                ${iconeOrdenacao(ativo, estado.direcao)}
            </button>
            ${iconeBuscaColuna(tabela, campoItem)}
        </span>
    </th>`;
}

// <th> de uma coluna de contagem (ver colunas-contagem.js): mesmo botão
// ordenável de thOrdenavel, mas com `campo` sintético (PREFIXO_ORDENACAO +
// id) e, no lugar da lupa de busca (colunas de contagem não têm prefixo de
// busca — ver item 3 do plano, o operador de busca por quantidade ficou
// pra depois), um <select> de campo + botão de remover, iguais aos do
// painel de configuração (renderSeletorColunasContagem).
function thContagem(tabela, coluna, estado) {
    const campoOrdenacao = PREFIXO_ORDENACAO_CONTAGEM + coluna.id;
    const ativo = estado.campo === campoOrdenacao;
    const label = registroContavel(tabela)[coluna.campo]?.label || coluna.campo;
    const opcoes = renderOpcoesCampoContagem(tabela, coluna.campo);
    return `<th class="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700">
        <div class="flex items-center gap-1">
            <button type="button" onclick="ordenarPor('${tabela}', '${campoOrdenacao}')"
                class="flex items-center gap-1 font-semibold hover:text-blue-600 dark:hover:text-blue-400 select-none"
                title="Ordenar por Qtd. ${escapeHtml(label)}">
                <span>Qtd.</span>
                ${iconeOrdenacao(ativo, estado.direcao)}
            </button>
        </div>
        <div class="flex items-center gap-1 mt-1 font-normal">
            <select onchange="definirCampoColunaContagem('${tabela}', ${coluna.id}, this.value)"
                class="text-[10px] border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200 py-0.5 max-w-[7rem]">
                ${opcoes}
            </select>
            <button type="button" onclick="removerColunaContagem('${tabela}', ${coluna.id})"
                title="Remover essa coluna de contagem"
                class="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400">✕</button>
        </div>
    </th>`;
}

// <th> fixo, não-clicável — usado só pela coluna "Contagem de Linhas"
// (ver colunas.js): diferente de qualquer outra coluna da tabela, o
// valor dela É a posição de exibição atual, então "ordenar por ela"
// não tem sentido (thOrdenavel exige uma key com comparador em
// COMPARADORES_ORDENACAO ou tratamento especial em aplicarOrdenacao,
// e essa coluna não tem nenhum dos dois de propósito).
function thContagemLinha(label) {
    return `<th class="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
        title="Numeração das linhas na ordem de exibição atual — muda se você reordenar a tabela, filtrar ou trocar de página">
        ${label}
    </th>`;
}

export function montarCabecalho(tabela, celulaCheck, celulaAcoes) {
    const ativas = getColunasAtivas(tabela);
    const def = DEFINICAO_COLUNAS[tabela];
    const camposBusca = COLUNA_CAMPO_BUSCA[tabela] || {};
    const estadoOrdenacao = tabela === 'prosas' ? ordenacaoProsas : ordenacaoPoemas;

    // Item 1 do plano de integração (ver Prosa e Poema.md): as duas
    // tabelas têm cabeçalho ordenável agora — a única diferença é a key
    // usada pra "ordem estrutural padrão" (ver CAMPO_ESTRUTURA_POR_TABELA
    // em render-listas.js: 'estrutura' em Poemas, 'vinculo' em Prosas).
    const tituloOrdenavel = thOrdenavel(
        tabela,
        'titulo',
        'ID / Título',
        estadoOrdenacao,
        'left-8',
        camposBusca.titulo,
    );
    const meio = ativas
        .map((key) => def.find((c) => c.key === key))
        .filter(Boolean)
        .map((c) =>
            c.key === 'contagemLinha'
                ? thContagemLinha(c.label)
                : thOrdenavel(tabela, c.key, c.label, estadoOrdenacao, '', camposBusca[c.key]),
        )
        .join('');
    // Colunas de contagem (ver colunas-contagem.js) vêm depois das
    // colunas fixas, na ordem em que foram criadas.
    const contagem = getColunasContagem(tabela)
        .map((c) => thContagem(tabela, c, estadoOrdenacao))
        .join('');
    return celulaCheck + tituloOrdenavel + meio + contagem + celulaAcoes;
}

export function atualizarPainelColunas(tabela, painelId) {
    const painel = document.getElementById(painelId);
    if (!painel) return;
    // Colunas de contagem (ver colunas-contagem.js) agora disponíveis nas
    // duas tabelas (ver Prosa e Poema.md, item 1). O botão "+ Adicionar"
    // mora aqui; trocar campo/remover uma já criada dá pra fazer tanto
    // aqui quanto direto no cabeçalho da tabela (thContagem acima) — os
    // dois lêem/escrevem o mesmo estado.
    painel.innerHTML = renderSeletorColunas(tabela) + renderSeletorColunasContagem(tabela);
}

export function atualizarPainelAcoes(tabela, painelId) {
    const painel = document.getElementById(painelId);
    if (!painel) return;
    // "Download abrangente" só existe pra Poemas — Sonoridade e
    // Morfofuncionalidade são sempre ligadas a poemaId, Prosa não tem
    // nenhuma das duas (ver download-abrangente.js). Bloco extra
    // anexado por fora de renderSeletorAcoes (compartilhado entre as 4
    // tabelas), não um campo novo em DEFINICAO_ACOES/FORMATOS_BAIXAR.
    const extra = tabela === 'poemas' ? renderCheckboxDownloadAbrangenteAcoes() : '';
    painel.innerHTML = renderSeletorAcoes(tabela) + extra;
}
