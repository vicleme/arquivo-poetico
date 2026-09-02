// ============================================================
// ui.js — Controles de interface: tabs, modais, dropdowns
// Importado por: forms.js, render.js, index.html (main.js)
// ============================================================

import { db } from './db.js';
import {
    resetSinalizacoes,
    resetPessoas,
    resetAutoria,
    resetEnvios,
    resetReconhecimentos,
    atualizarDatalist,
    resetIntertextualidade,
    resetAnexos,
    resetAnotacoes,
    resetElos,
    resetReferencias,
    renderPainelElosDerivados,
    atualizarRotulosDirecaoElo,
    atualizarRotulosDirecaoEloProsa,
} from './editor.js';
import {
    extrairFasesUnicas,
    escapeHtml,
    RELACOES_ELO,
    TIPOS_REFERENCIA,
    CORES_GRUPO_PADRAO,
} from './utils.js';
import { toggleModal, garantirModal } from './modais.js';
import { renderEstatisticas } from './estatisticas.js';
import { renderConexoes } from './render-conexoes.js';

// Reexportados pra quem já importava toggleModal a partir de ui.js
// (forms.js, coletaneas.js, main.js) não precisar trocar o caminho.
export { toggleModal, garantirModal };

export function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active-tab'));
    const targetTab = document.getElementById(tabName);
    const targetBtn = document.getElementById('btn-' + tabName);
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active-tab');
}

// ─── Navegação agrupada: dropdowns no desktop + menu hambúrguer (mobile) ─
// As 11 abas, organizadas nos 4 grupos combinados com Victor: Estrutura
// do acervo, Conteúdo, Análise, e Exportação sozinha. Única fonte de
// verdade tanto pro painel mobile quanto pro destaque do grupo ativo na
// nav desktop — a nav desktop em si (os dropdowns, que abrem no hover
// via CSS puro, ver .nav-dropdown em style.css) continua estática no
// HTML, só o "qual botão de grupo fica destacado" é calculado daqui.
export const GRUPOS_NAV = [
    {
        id: 'estrutura-acervo',
        rotulo: 'Estrutura do acervo',
        abas: [
            { id: 'livros', rotulo: 'Livros' },
            { id: 'coletaneas', rotulo: 'Coletâneas' },
            { id: 'partes', rotulo: 'Partes' },
            { id: 'secoes', rotulo: 'Seções' },
            { id: 'pessoas', rotulo: 'Pessoas' },
            { id: 'grupos', rotulo: 'Grupos' },
            { id: 'autores', rotulo: 'Autores' },
            { id: 'epocas', rotulo: 'Épocas' },
        ],
    },
    {
        id: 'conteudo',
        rotulo: 'Conteúdo',
        abas: [
            { id: 'poemas', rotulo: 'Poemas' },
            { id: 'prosas', rotulo: 'Prosas' },
            { id: 'elementos', rotulo: 'Elementos Textuais' },
        ],
    },
    {
        id: 'analise',
        rotulo: 'Análise',
        abas: [
            { id: 'estrutura', rotulo: 'Estrutura' },
            { id: 'conexoes', rotulo: 'Conexões' },
            { id: 'estatisticas', rotulo: 'Estatísticas' },
        ],
    },
    {
        id: 'exportacao',
        rotulo: 'Exportação',
        abas: [{ id: 'exportar-filtrado', rotulo: 'Exportação' }],
    },
];

// Grupo "Ferramentas" (Localizar e Substituir, Versões Alternativas): fora
// do GRUPOS_NAV porque são links pra páginas separadas, não abas trocadas
// via abrirAba/openTab dentro desta SPA — por isso ficam de fora de
// TODAS_ABAS e de atualizarGrupoAtivoNavDesktop (não há "aba ativa" pra
// destacar aqui). Ainda assim precisam aparecer no menu mobile — ver
// renderMenuMobile logo abaixo — senão ficam inacessíveis abaixo do
// breakpoint md, já que a nav desktop (onde moram como dropdown por CSS
// puro) some inteira no mobile.
const FERRAMENTAS_NAV = [
    { href: 'localizar-substituir.html', rotulo: 'Localizar e Substituir' },
    { href: 'filtrar.html', rotulo: 'Versões Alternativas' },
];

const TODAS_ABAS = GRUPOS_NAV.flatMap((g) => g.abas);

// Ponto de entrada único pra trocar de aba (chamado tanto pelos
// dropdowns da nav desktop quanto pelo painel mobile): faz o que
// openTab já fazia, mais o recálculo sob demanda que Conexões/
// Estatísticas precisam (antes vivia espalhado em onclick inline no
// HTML), atualiza o destaque do grupo ativo e fecha o painel mobile
// se estiver aberto, já que selecionar uma aba é o sinal claro de que
// o usuário terminou de navegar.
export function abrirAba(tabName) {
    openTab(tabName);
    if (tabName === 'conexoes') renderConexoes();
    if (tabName === 'estatisticas') renderEstatisticas();
    atualizarRotuloAbaAtual(tabName);
    atualizarGrupoAtivoNavDesktop(tabName);
    fecharDropdownNavDesktop(tabName);
    fecharMenuMobile();
}

function atualizarRotuloAbaAtual(tabName) {
    const rotuloEl = document.getElementById('rotulo-aba-atual');
    if (!rotuloEl) return;
    const aba = TODAS_ABAS.find((a) => a.id === tabName);
    rotuloEl.textContent = aba ? aba.rotulo : '';
}

// Destaca (borda azul embaixo, mesmo visual do .active-tab) o botão do
// grupo que contém a aba aberta — só existe botão de grupo pros 3 com
// dropdown; Exportação é uma aba solta, já destacada pelo openTab.
function atualizarGrupoAtivoNavDesktop(tabName) {
    document
        .querySelectorAll('.grupo-nav-btn')
        .forEach((b) => b.classList.remove('nav-grupo-ativo'));
    const grupo = GRUPOS_NAV.find((g) => g.abas.some((a) => a.id === tabName));
    if (!grupo) return;
    const btn = document.getElementById(`grupo-${grupo.id}-btn`);
    if (btn) btn.classList.add('nav-grupo-ativo');
}

// Clicar num item do dropdown não tira o mouse de cima da área — sem
// isso, o :hover em style.css manteria o dropdown do grupo aberto por
// cima da aba recém-aberta. Fecha na hora via classe própria
// (.dropdown-fechado-manual, ver style.css) e só devolve o dropdown ao
// controle normal do :hover quando o mouse sai de fato (mouseleave),
// pra não precisar ficar rastreando estado depois disso. Também tira o
// foco do botão clicado, senão o :focus-within reabriria o dropdown já
// no primeiro mouseleave (antes do usuário voltar a interagir com ele).
function fecharDropdownNavDesktop(tabName) {
    document.activeElement?.blur();
    const btn = document.getElementById('btn-' + tabName);
    const wrap = btn?.closest('.nav-dropdown-wrap');
    if (!wrap) return;
    wrap.classList.add('dropdown-fechado-manual');
    wrap.addEventListener('mouseleave', () => wrap.classList.remove('dropdown-fechado-manual'), {
        once: true,
    });
}

function renderMenuMobile() {
    const painel = document.getElementById('painel-menu-mobile');
    if (!painel) return;
    const atual = document.querySelector('.tab-content.active')?.id;
    painel.innerHTML = GRUPOS_NAV.map(
        (grupo) => `
        <div class="mb-3 last:mb-0">
            <div class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500 px-2 mb-1">
                ${escapeHtml(grupo.rotulo)}
            </div>
            ${grupo.abas
                .map(
                    (aba) => `
                <button type="button" onclick="abrirAba('${aba.id}')"
                    class="w-full text-left text-sm py-2 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-slate-200 ${
                        aba.id === atual
                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold'
                            : ''
                    }">
                    ${escapeHtml(aba.rotulo)}
                </button>`,
                )
                .join('')}
        </div>`,
    ).join('');
    painel.innerHTML += `
        <div class="mb-3 last:mb-0">
            <div class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500 px-2 mb-1">
                Ferramentas
            </div>
            ${FERRAMENTAS_NAV.map(
                (item) => `
                <a href="${item.href}"
                    class="block w-full text-left text-sm py-2 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-slate-200">
                    ${escapeHtml(item.rotulo)}
                </a>`,
            ).join('')}
        </div>`;
}

// Abre/fecha o painel mobile (dropdown abaixo do botão hambúrguer,
// mesmo princípio de togglePainel — só que com conteúdo montado na
// hora, pra sempre refletir a aba ativa quando reaberto) e alterna o
// ícone entre ☰ e ✕.
export function toggleMenuMobile() {
    const painel = document.getElementById('painel-menu-mobile');
    const icone = document.getElementById('icone-menu-mobile');
    if (!painel) return;
    const vaiAbrir = painel.classList.contains('hidden');
    if (vaiAbrir) renderMenuMobile();
    painel.classList.toggle('hidden');
    if (icone) icone.textContent = vaiAbrir ? '✕' : '☰';
}

function fecharMenuMobile() {
    const painel = document.getElementById('painel-menu-mobile');
    const icone = document.getElementById('icone-menu-mobile');
    if (!painel || painel.classList.contains('hidden')) return;
    painel.classList.add('hidden');
    if (icone) icone.textContent = '☰';
}

// Chamada no load (main.js) pra sincronizar o rótulo do botão
// hambúrguer e o destaque de grupo na nav desktop com a aba que já
// vem ativa no HTML (Livros).
export function initNav() {
    const atual = document.querySelector('.tab-content.active')?.id;
    if (atual) {
        atualizarRotuloAbaAtual(atual);
        atualizarGrupoAtivoNavDesktop(atual);
    }
}

// ─── Helpers de hierarquia (pra saber a qual Livro algo pertence) ──

function livroIdDaParte(parteId) {
    const parte = db.partes.find((p) => p.id == parteId);
    return parte ? parte.livroId : null;
}

function livroIdDaSecao(secaoId) {
    const secao = db.secoes.find((s) => s.id == secaoId);
    if (!secao) return null;
    return secao.paiTipo === 'parte' ? livroIdDaParte(secao.paiId) : secao.paiId;
}

// Exportada para uso de auto-preenchimento de data de publicação
export function livroIdDoDestino(destinoStr) {
    if (!destinoStr) return null;
    const [tipo, id] = destinoStr.split(':');
    if (tipo === 'livro') return id;
    if (tipo === 'parte') return livroIdDaParte(id);
    if (tipo === 'secao') return livroIdDaSecao(id);
    return null;
}

// Monta a lista de Partes/Seções de um livro já na ORDEM da estrutura
// real do livro: Parte 1 (e suas Seções), Parte 2 (e suas Seções), e
// Seções soltas direto no Livro entram na posição certa pela sequência.
function construirEstruturaLivro(livroId) {
    const partesDoLivro = db.partes.filter((p) => String(p.livroId) === String(livroId));
    const secoesDiretas = db.secoes.filter(
        (s) => s.paiTipo === 'livro' && String(s.paiId) === String(livroId),
    );

    const topo = [
        ...partesDoLivro.map((item) => ({ tipo: 'parte', item })),
        ...secoesDiretas.map((item) => ({ tipo: 'secao', item })),
    ].sort((a, b) => (parseInt(a.item.sequencia) || 9999) - (parseInt(b.item.sequencia) || 9999));

    let html = '';
    topo.forEach(({ tipo, item }) => {
        if (tipo === 'parte') {
            html += `<option value="parte:${item.id}">▸ ${escapeHtml(item.titulo)}</option>`;
            db.secoes
                .filter((s) => s.paiTipo === 'parte' && String(s.paiId) === String(item.id))
                .sort((a, b) => (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999))
                .forEach((s) => {
                    html += `<option value="secao:${s.id}">　↳ ${escapeHtml(s.titulo)}</option>`;
                });
        } else {
            html += `<option value="secao:${item.id}">↳ ${escapeHtml(item.titulo)}</option>`;
        }
    });
    return html;
}

// Monta as opções de destino de Poema/Prosa. Coletâneas são excluídas:
// o vínculo poema↔coletânea é gerido pela aba Coletâneas via itensColetanea.
// Sem filtro: grupos planos (Livros / Partes / Seções).
// Com livro filtrado: só aquele livro + sua estrutura interna ordenada.
function construirOptionsDestino(livroFiltroId, formatoSimples = true) {
    const livrosNormais = db.livros.filter((l) => l.tipo !== 'Coletânea');
    const livroIdsNormais = new Set(livrosNormais.map((l) => String(l.id)));
    const partesNormais = db.partes.filter((p) => livroIdsNormais.has(String(p.livroId)));
    const secoesNormais = db.secoes.filter((s) => {
        if (s.paiTipo === 'livro') return livroIdsNormais.has(String(s.paiId));
        if (s.paiTipo === 'parte') {
            const pt = db.partes.find((p) => p.id == s.paiId);
            return pt ? livroIdsNormais.has(String(pt.livroId)) : false;
        }
        return false;
    });

    if (!livroFiltroId) {
        if (formatoSimples) {
            return (
                '<option value="">Poema Avulso (Sem Vínculo)</option>' +
                '<optgroup label="Livros">' +
                livrosNormais
                    .map((l) => `<option value="livro:${l.id}">${escapeHtml(l.titulo)}</option>`)
                    .join('') +
                '</optgroup>' +
                '<optgroup label="Partes">' +
                partesNormais
                    .map((p) => `<option value="parte:${p.id}">${escapeHtml(p.titulo)}</option>`)
                    .join('') +
                '</optgroup>' +
                '<optgroup label="Seções">' +
                secoesNormais
                    .map((s) => `<option value="secao:${s.id}">${escapeHtml(s.titulo)}</option>`)
                    .join('') +
                '</optgroup>'
            );
        }
        const opcoes = [
            ...livrosNormais.map((l) => ({
                id: `livro:${l.id}`,
                texto: `[Livro] ${escapeHtml(l.titulo)}`,
            })),
            ...partesNormais.map((p) => ({
                id: `parte:${p.id}`,
                texto: `[Parte] ${escapeHtml(p.titulo)}`,
            })),
            ...secoesNormais.map((s) => ({
                id: `secao:${s.id}`,
                texto: `[Seção] ${escapeHtml(s.titulo)}`,
            })),
        ];
        return (
            '<option value="">-- Sem vínculo (Avulso) --</option>' +
            opcoes.map((o) => `<option value="${o.id}">${o.texto}</option>`).join('')
        );
    }

    const livro = db.livros.find((l) => String(l.id) === String(livroFiltroId));
    const estrutura = construirEstruturaLivro(livroFiltroId);

    if (formatoSimples) {
        return (
            '<option value="">Poema Avulso (Sem Vínculo)</option>' +
            `<option value="livro:${livroFiltroId}">📖 ${escapeHtml(livro?.titulo) || ''} (o livro inteiro)</option>` +
            `<optgroup label="Estrutura: ${escapeHtml(livro?.titulo) || ''}">${estrutura}</optgroup>`
        );
    }
    return (
        '<option value="">-- Sem vínculo (Avulso) --</option>' +
        `<option value="livro:${livroFiltroId}">[Livro] ${escapeHtml(livro?.titulo) || ''}</option>` +
        estrutura
    );
}

function popularFiltroLivro(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    // Coletâneas excluídas: o filtro de destino é só para livros normais.
    sel.innerHTML =
        '<option value="">-- Todos os livros --</option>' +
        db.livros
            .filter((l) => l.tipo !== 'Coletânea')
            .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
            .join('');
}

// Reconstrói o select de Destino do Poema, filtrado pelo livro escolhido.
// Tenta preservar o valor atualmente selecionado, se ele ainda for válido.
export function filtrarDestinoPoema(livroId) {
    const sel = document.getElementById('p-destino');
    if (!sel) return;
    const valorAtual = sel.value;
    sel.innerHTML = construirOptionsDestino(livroId, true);
    const aindaExiste = Array.from(sel.options).some((o) => o.value === valorAtual);
    if (aindaExiste) sel.value = valorAtual;
}

export function filtrarDestinoProsa(livroId) {
    const sel = document.getElementById('pr-destino');
    if (!sel) return;
    const valorAtual = sel.value;
    sel.innerHTML = construirOptionsDestino(livroId, false);
    const aindaExiste = Array.from(sel.options).some((o) => o.value === valorAtual);
    if (aindaExiste) sel.value = valorAtual;
}

// Usado por forms.js ao abrir um Poema/Prosa existente para edição:
// pré-seleciona o filtro de livro de acordo com o destino atual,
// pra não esconder o vínculo que o item já tinha.
export function sincronizarFiltroDestino(filtroSelectId, destinoSelectId, destinoStr) {
    const livroId = livroIdDoDestino(destinoStr);
    const filtroSel = document.getElementById(filtroSelectId);
    if (filtroSel) filtroSel.value = livroId || '';

    if (destinoSelectId === 'p-destino') filtrarDestinoPoema(livroId || '');
    else filtrarDestinoProsa(livroId || '');

    const destinoSel = document.getElementById(destinoSelectId);
    if (destinoSel) destinoSel.value = destinoStr || '';
}

export function renderDropdowns() {
    // 0. Sugestões de "Fase de Vida" já usadas em outros livros
    const datalistFases = document.getElementById('sugestoes-fases');
    if (datalistFases) {
        datalistFases.innerHTML = extrairFasesUnicas(db.livros)
            .map((fase) => `<option value="${escapeHtml(fase)}">`)
            .join('');
    }

    // 1. Livros → Modal de Partes (coletâneas excluídas: têm estrutura própria)
    const sPartLivro = document.getElementById('part-livro');
    if (sPartLivro)
        sPartLivro.innerHTML = db.livros
            .filter((l) => l.tipo !== 'Coletânea')
            .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
            .join('');

    // 2. Destino de Poemas (Livro, Parte ou Seção) — sem filtro por padrão
    const sPoemaDestino = document.getElementById('p-destino');
    if (sPoemaDestino) sPoemaDestino.innerHTML = construirOptionsDestino('', true);
    popularFiltroLivro('p-destino-filtro');

    // 3. Vínculo de Seções (Livro ou Parte) — coletâneas excluídas dos dois grupos:
    //    livros-coletânea não aceitam seções; partes-de-coletânea também não.
    const sSecVinculo = document.getElementById('sec-vinculo');
    if (sSecVinculo) {
        const livrosNormais = db.livros.filter((l) => l.tipo !== 'Coletânea');
        const livroIdsNormais = new Set(livrosNormais.map((l) => String(l.id)));
        const partesNormais = db.partes.filter((p) => livroIdsNormais.has(String(p.livroId)));
        sSecVinculo.innerHTML =
            '<optgroup label="Livros">' +
            livrosNormais
                .map((l) => `<option value="livro:${l.id}">${escapeHtml(l.titulo)}</option>`)
                .join('') +
            '</optgroup>' +
            '<optgroup label="Partes">' +
            partesNormais
                .map((p) => `<option value="parte:${p.id}">${escapeHtml(p.titulo)}</option>`)
                .join('') +
            '</optgroup>';
    }

    // 4. Vínculo de Elementos (Livro, Parte ou Seção) — coletâneas excluídas:
    //    elementos textuais pertencem à hierarquia editorial, não às coletâneas.
    const sElVinculo = document.getElementById('el-vinculo');
    if (sElVinculo) {
        const livrosNorm = db.livros.filter((l) => l.tipo !== 'Coletânea');
        const livroIdsNorm = new Set(livrosNorm.map((l) => String(l.id)));
        const partesNorm = db.partes.filter((p) => livroIdsNorm.has(String(p.livroId)));
        // Seções cujo pai é livro ou parte normal
        const secoesNorm = db.secoes.filter((s) => {
            if (s.paiTipo === 'livro') return livroIdsNorm.has(String(s.paiId));
            if (s.paiTipo === 'parte') {
                const pt = db.partes.find((p) => p.id == s.paiId);
                return pt ? livroIdsNorm.has(String(pt.livroId)) : false;
            }
            return false;
        });
        sElVinculo.innerHTML =
            '<optgroup label="Livros">' +
            livrosNorm
                .map((l) => `<option value="livro:${l.id}">${escapeHtml(l.titulo)}</option>`)
                .join('') +
            '</optgroup>' +
            '<optgroup label="Partes">' +
            partesNorm
                .map((p) => `<option value="parte:${p.id}">${escapeHtml(p.titulo)}</option>`)
                .join('') +
            '</optgroup>' +
            '<optgroup label="Seções">' +
            secoesNorm
                .map((s) => `<option value="secao:${s.id}">${escapeHtml(s.titulo)}</option>`)
                .join('') +
            '</optgroup>';
    }

    // 5. Livros múltiplos no Modal de Poemas — etiqueta editorial paralela;
    //    coletâneas excluídas: o vínculo poema↔coletânea já vive em itensColetanea.
    const sPoemaLivros = document.getElementById('p-livros');
    if (sPoemaLivros)
        sPoemaLivros.innerHTML = db.livros
            .filter((l) => l.tipo !== 'Coletânea')
            .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
            .join('');

    // 6. Elos e Referências entre poemas — selects de poema-alvo (single),
    //    usados pela linha de "adicionar" de cada lista (ver editor.js:
    //    adicionarElo/adicionarReferencia). Repovoados a cada render pra
    //    refletir poemas criados/renomeados depois que o modal abriu.
    const sEloPoema = document.getElementById('p-elo-poema');
    const sRefPoema = document.getElementById('p-ref-poema');
    if (sEloPoema || sRefPoema) {
        const opcoes =
            '<option value="">Selecione um poema...</option>' +
            [...db.poemas]
                .sort((a, b) => a.titulo.localeCompare(b.titulo))
                .map((p) => `<option value="${p.id}">${escapeHtml(p.titulo)}</option>`)
                .join('');
        if (sEloPoema) sEloPoema.innerHTML = opcoes;
        if (sRefPoema) sRefPoema.innerHTML = opcoes;
    }
    // Relação de Elos / Tipo de Referências — Elos usa as 8 relações
    // fechadas (RELACOES_ELO em utils.js, ver redesenho Relação+Direção);
    // Referências continua com sua lista fechada simples de tipos
    // (TIPOS_REFERENCIA), sem Direção. Populadas aqui, e não hardcoded
    // no HTML, pra ter uma única fonte de verdade caso a lista mude.
    const sEloRelacao = document.getElementById('p-elo-relacao');
    const sRefTipo = document.getElementById('p-ref-tipo');
    if (sEloRelacao) {
        sEloRelacao.innerHTML =
            '<option value="">Relação...</option>' +
            RELACOES_ELO.map(
                (r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`,
            ).join('');
        atualizarRotulosDirecaoElo();
    }
    if (sRefTipo) {
        sRefTipo.innerHTML =
            '<option value="">Tipo...</option>' +
            TIPOS_REFERENCIA.map(
                (t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`,
            ).join('');
    }

    // 6b. Livros múltiplos no Modal de Prosas (item 4 — mesmo campo de
    //     Poema, etiqueta editorial paralela, coletâneas excluídas).
    const sProsaLivros = document.getElementById('pr-livros');
    if (sProsaLivros)
        sProsaLivros.innerHTML = db.livros
            .filter((l) => l.tipo !== 'Coletânea')
            .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
            .join('');

    // 6c. Elos e Referências no Modal de Prosas (item 4) — selects de
    //     texto-alvo (single), mas agora com Poemas E Prosas juntos num
    //     optgroup por tipo (um texto do acervo pode se ligar tanto a um
    //     poema quanto a outra prosa) — diferente do Modal de Poemas
    //     acima, que por ora só oferece outros Poemas como alvo.
    const sEloProsa = document.getElementById('pr-elo-poema');
    const sRefProsa = document.getElementById('pr-ref-poema');
    if (sEloProsa || sRefProsa) {
        const opcoesProsa =
            '<option value="">Selecione um texto...</option>' +
            '<optgroup label="Poemas">' +
            [...db.poemas]
                .sort((a, b) => a.titulo.localeCompare(b.titulo))
                .map((p) => `<option value="${p.id}">${escapeHtml(p.titulo)}</option>`)
                .join('') +
            '</optgroup>' +
            '<optgroup label="Prosas">' +
            [...db.prosas]
                .sort((a, b) => a.titulo.localeCompare(b.titulo))
                .map((pr) => `<option value="${pr.id}">${escapeHtml(pr.titulo)}</option>`)
                .join('') +
            '</optgroup>';
        if (sEloProsa) sEloProsa.innerHTML = opcoesProsa;
        if (sRefProsa) sRefProsa.innerHTML = opcoesProsa;
    }
    const sEloRelacaoProsa = document.getElementById('pr-elo-relacao');
    const sRefTipoProsa = document.getElementById('pr-ref-tipo');
    if (sEloRelacaoProsa) {
        sEloRelacaoProsa.innerHTML =
            '<option value="">Relação...</option>' +
            RELACOES_ELO.map(
                (r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`,
            ).join('');
        atualizarRotulosDirecaoEloProsa();
    }
    if (sRefTipoProsa) {
        sRefTipoProsa.innerHTML =
            '<option value="">Tipo...</option>' +
            TIPOS_REFERENCIA.map(
                (t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`,
            ).join('');
    }

    // 7. Destino de Prosas (Livro, Parte ou Seção) — sem filtro por padrão
    const destinoProsa = document.getElementById('pr-destino');
    if (destinoProsa) destinoProsa.innerHTML = construirOptionsDestino('', false);
    popularFiltroLivro('pr-destino-filtro');

    // 8. Grupos → checkboxes do Modal de Pessoa. Sempre reconstruído
    // (e portanto sempre desmarcado) — editarPessoa() marca de volta os
    // que a pessoa já pertence logo em seguida, depois desta chamada.
    const cGrupos = document.getElementById('ps-grupos-container');
    if (cGrupos) {
        const ordenados = [...db.grupos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        cGrupos.innerHTML = ordenados.length
            ? ordenados
                  .map(
                      (g) => `
                <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" value="${g.id}"
                        class="rounded border-gray-300 dark:border-slate-600 text-rose-500 focus:ring-rose-400" />
                    ${escapeHtml(g.nome)}
                </label>`,
                  )
                  .join('')
            : `<p class="text-xs text-gray-400 dark:text-slate-500">Nenhum grupo cadastrado ainda — use "+ Criar novo grupo" acima.</p>`;
    }
}

// Quando o destino (Livro/Parte/Seção) escolhido pertence a um Livro que
// já tem Data de Publicação preenchida, sugere automaticamente a data de
// "Primeira Publicação" do poema/prosa — campo a campo, sem sobrescrever
// nada que o usuário já tenha preenchido manualmente.
export function autoPreencherDataPublicacao(destinoStr, prefixo) {
    const livroId = livroIdDoDestino(destinoStr);
    if (!livroId) return;

    const livro = db.livros.find((l) => String(l.id) === String(livroId));
    if (!livro || !livro.data) return;

    // Compatibilidade: livros antigos podem ter `data` como texto livre.
    // Nesse caso, extraímos só o ano (4 dígitos) com segurança.
    const dataLivro =
        typeof livro.data === 'string'
            ? { ano: parseInt((livro.data.match(/\d{4}/) || [])[0]) || null }
            : livro.data;
    if (!dataLivro) return;

    ['dia', 'mes', 'ano'].forEach((campo) => {
        if (dataLivro[campo] == null) return;
        const el = document.getElementById(`${prefixo}-data-pub-${campo}`);
        if (el && !el.value) el.value = dataLivro[campo];
    });
}

export async function prepararNovo(tipo) {
    await garantirModal(`modal-${tipo}`);

    const form = document.getElementById(`form-${tipo}`);
    if (!form) return;
    form.reset();
    renderDropdowns();

    const idFields = {
        livro: 'l-edit-id',
        poema: 'p-edit-id',
        parte: 'part-edit-id',
        secao: 'sec-edit-id',
        prosa: 'pr-edit-id',
        elemento: 'el-edit-id',
        coletanea: 'col-edit-id',
        pessoa: 'ps-edit-id',
        grupo: 'g-edit-id',
        autor: 'au-edit-id',
        epoca: 'ep-edit-id',
    };

    const idField = document.getElementById(idFields[tipo]);
    if (idField) idField.value = '';

    if (tipo === 'poema') {
        resetSinalizacoes();
        resetPessoas();
        resetAutoria();
        resetEnvios();
        resetReconhecimentos();
        resetIntertextualidade();
        resetAnexos();
        resetAnotacoes();
        resetElos();
        resetReferencias();
        renderPainelElosDerivados(null);
        atualizarDatalist();
        const infoP = document.getElementById('p-coletaneas-info');
        if (infoP) infoP.innerHTML = '';
    }

    if (tipo === 'prosa') {
        // resetSinalizacoesProsa e resetPessoasProsa são importadas
        // dinamicamente pra evitar ciclo de importação (editor → ui não existe)
        import('./editor.js').then(
            ({
                resetSinalizacoesProsa,
                resetPessoasProsa,
                resetAutoriaProsa,
                resetEnviosProsa,
                resetReconhecimentosProsa,
                resetGeneroProsa,
                atualizarDatalistProsa,
                resetIntertextualidadeProsa,
                resetAnexosProsa,
                resetElosProsa,
                resetReferenciasProsa,
                renderPainelElosDerivadosProsa,
            }) => {
                resetSinalizacoesProsa();
                resetPessoasProsa();
                resetAutoriaProsa();
                resetEnviosProsa();
                resetReconhecimentosProsa();
                resetGeneroProsa();
                resetIntertextualidadeProsa();
                resetAnexosProsa();
                resetElosProsa();
                resetReferenciasProsa();
                renderPainelElosDerivadosProsa(null);
                atualizarDatalistProsa();
            },
        );
        const infoPr = document.getElementById('pr-coletaneas-info');
        if (infoPr) infoPr.innerHTML = '';
    }

    if (tipo === 'grupo') {
        // Import dinâmico pra evitar ciclo (forms → ui já existe, ver
        // resetPessoasProsa acima pelo mesmo motivo). Sem cor marcada
        // ainda no form novo: seleciona a primeira da paleta por padrão
        // (mesmo padrão do fallback em classesCorGrupo, ver utils.js).
        import('./forms.js').then(({ renderSeletorCorGrupo }) => {
            const corField = document.getElementById('g-cor');
            if (corField) corField.value = CORES_GRUPO_PADRAO;
            renderSeletorCorGrupo(CORES_GRUPO_PADRAO);
        });
    }

    const title = document.getElementById(`modal-${tipo}-titulo`);
    if (title) title.innerText = `Novo(a) ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;

    toggleModal(`modal-${tipo}`);
}

// Toggle genérico pra painéis recolhíveis (ex.: filtro de data em
// Poemas/Prosas) — mostra/esconde por id e atualiza o rótulo do botão
// que o abriu (▾ fechado / ▴ aberto), se o botão for passado.
export function togglePainel(painelId, botaoEl = null) {
    const painel = document.getElementById(painelId);
    if (!painel) return;
    const aberto = painel.classList.toggle('hidden') === false;
    if (botaoEl) {
        botaoEl.textContent = botaoEl.textContent.replace(/[▾▴]/, aberto ? '▴' : '▾');
    }
}

export function toggleCamposIntroducao() {
    const tipo = document.getElementById('el-tipo')?.value;
    const box = document.getElementById('campos-introducao');
    if (!box) return;
    box.classList.toggle('hidden', tipo !== 'Introdução');
}

export function sugerirSequencia() {
    const destino = document.getElementById('p-destino')?.value;
    const campo = document.getElementById('p-sequencia');
    if (!destino || !campo) return;

    const [tipo, id] = destino.split(':');
    const textos = [
        ...db.poemas.filter((p) => String(p.paiTipo) === tipo && String(p.paiId) === id),
        ...(db.prosas || []).filter((pr) => String(pr.paiTipo) === tipo && String(pr.paiId) === id),
    ];

    if (textos.length === 0) {
        campo.value = 1;
    } else {
        const max = Math.max(...textos.map((t) => parseInt(t.sequencia) || 0));
        campo.value = max + 1;
    }
}
