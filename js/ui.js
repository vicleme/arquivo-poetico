// ============================================================
// ui.js — Controles de interface: tabs, modais, dropdowns
// Importado por: forms.js, render.js, index.html (main.js)
// ============================================================

import { db } from './db.js';
import { resetPersonagens } from './grupo-personagens.js';
import {
    resetSinalizacoes,
    resetTemasTexto,
    resetLocaisTexto,
    resetIdiomasTexto,
    resetJargaoGiriaTexto,
    resetPessoas,
    resetAutoria,
    resetEnvios,
    resetReconhecimentos,
    atualizarDatalist,
    atualizarDatalistRegiaoPeriodoHistorico,
    preencherPaisPeriodoHistorico,
    atualizarDatalistRegiaoOrigemMovimento,
    preencherOpcoesPaiCorrente,
    atualizarDatalistsAutor,
    resetIntertextualidade,
    resetAnexos,
    resetAnotacoes,
    resetElos,
    resetEcos,
    resetReferenciasExternas,
    renderPainelElosDerivados,
    atualizarRotulosDirecaoElo,
    renderAutoclassificacao,
    resetMovimentosEscolasDiretos,
    resetPeriodosHistoricosDoTexto,
    resetEpocasRetratadasDoTexto,
    resetTodosOsGruposDeMovimento,
    resetRegiaoPeriodoHistorico,
    resetTemasAssunto,
    atualizarDatalistTemasAssunto,
} from './editor.js';
import { resetFontesCorrente } from './fontes-corrente-ui.js';
import { resetFontesPeriodoHistorico } from './fontes-periodo-historico-ui.js';
import { preencherCamposPeriodoHistorico } from './periodo-historico-campos-ui.js';
import {
    extrairFasesUnicas,
    extrairNacionalidadesUnicas,
    extrairGenerosAutorUnicos,
    extrairGenerosPessoasUnicos,
    extrairOrientacoesUnicas,
    extrairOrientacoesPessoasUnicas,
    extrairReligioesUnicas,
    extrairInstituicoesUnicas,
    extrairNomesLojasUnicos,
    escapeHtml,
    RELACOES_ELO,
    TIPOS_ECO,
    CORES_GRUPO_PADRAO,
} from './utils.js';
import { toggleModal, garantirModal } from './modais.js';
import { renderEstatisticas } from './estatisticas.js';
import { renderConexoes } from './render-conexoes.js';
import { renderExportacoesFrequentes } from './exportar-frequentes.js';
import { renderBiblioteca } from './ui-biblioteca.js';

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
// As abas, organizadas nos grupos combinados com Victor: Estrutura
// do acervo, Conteúdo, Análise, Criação (aba Moldes — rascunho
// estruturado, ver forms.js/render-listas.js) e Dados (Importação +
// Exportação Geral + Exportações Frequentes — grupo antes chamado só
// "Exportação"). Única
// fonte de verdade tanto pro painel mobile quanto pro destaque do
// grupo ativo na
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
            { id: 'autores', rotulo: 'Autores' },
            { id: 'estrutura', rotulo: 'Estrutura' },
        ],
    },
    {
        id: 'cadastros',
        rotulo: 'Cadastros',
        abas: [
            { id: 'temas', rotulo: 'Temas' },
            { id: 'assuntos', rotulo: 'Assuntos' },
            { id: 'etiquetas', rotulo: 'Etiquetas (Tags)' },
            { id: 'tag-clusters', rotulo: 'Tag clusters' },
            { id: 'locais', rotulo: 'Locais' },
            { id: 'pessoas', rotulo: 'Pessoas' },
            { id: 'grupos', rotulo: 'Grupos (Pessoas)' },
            { id: 'personagens', rotulo: 'Personagens' },
            { id: 'epocas', rotulo: 'Período Biográfico' },
            { id: 'periodos-historicos', rotulo: 'Período Histórico' },
            { id: 'movimentos-escolas', rotulo: 'Correntes literárias' },
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
            { id: 'conexoes', rotulo: 'Conexões' },
            { id: 'sonoridade', rotulo: 'Sonoridade' },
            { id: 'morfofuncionalidade', rotulo: 'Morfofuncionalidade' },
        ],
    },
    {
        id: 'estatisticas',
        rotulo: 'Estatísticas',
        abas: [
            { id: 'estatisticas', rotulo: 'Visão geral' },
            { id: 'estatisticas-producao', rotulo: 'Produção' },
            { id: 'estatisticas-temas-assuntos', rotulo: 'Temas e Assuntos' },
            { id: 'estatisticas-pessoas-grupos', rotulo: 'Pessoas e Grupos' },
            { id: 'estatisticas-personagens', rotulo: 'Personagens' },
            { id: 'estatisticas-cruzamentos', rotulo: 'Cruzamentos' },
            { id: 'estatisticas-local-idioma', rotulo: 'Local e idioma' },
            { id: 'estatisticas-correntes', rotulo: 'Correntes literárias' },
            { id: 'estatisticas-linguagem', rotulo: 'Linguagem' },
        ],
    },
    {
        id: 'criacao',
        rotulo: 'Criação',
        abas: [{ id: 'moldes', rotulo: 'Moldes' }],
    },
    {
        id: 'dados',
        rotulo: 'Dados',
        abas: [
            { id: 'biblioteca', rotulo: 'Biblioteca' },
            { id: 'importacao-aditiva', rotulo: 'Importação' },
            { id: 'exportar-filtrado', rotulo: 'Exportação Geral' },
            { id: 'exportacoes-frequentes', rotulo: 'Exportações Frequentes' },
            { id: 'backup-recuperacao', rotulo: 'Backup e recuperação' },
        ],
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
    if (tabName.startsWith('estatisticas')) renderEstatisticas();
    if (tabName === 'exportacoes-frequentes') renderExportacoesFrequentes();
    if (tabName === 'biblioteca') renderBiblioteca();
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

    // 0.05. Sugestões de "Nacionalidade" já usadas em outros Autores
    // (mesmo padrão da Fase de Vida acima)
    const datalistNacionalidades = document.getElementById('sugestoes-nacionalidades');
    if (datalistNacionalidades) {
        datalistNacionalidades.innerHTML = extrairNacionalidadesUnicas(db.autores)
            .map((nac) => `<option value="${escapeHtml(nac)}">`)
            .join('');
    }

    // 0.06. Sugestões de "Gênero" e "Orientação sexual" do Autor — semente
    // fixa (GENEROS_SUGERIDOS/ORIENTACOES_SUGERIDAS) + o que já foi
    // digitado no acervo (mesmo padrão da Nacionalidade acima).
    const datalistGenero = document.getElementById('sugestoes-genero-autor');
    if (datalistGenero) {
        datalistGenero.innerHTML = extrairGenerosAutorUnicos(db.autores)
            .map((g) => `<option value="${escapeHtml(g)}">`)
            .join('');
    }
    const datalistOrientacao = document.getElementById('sugestoes-orientacao-autor');
    if (datalistOrientacao) {
        datalistOrientacao.innerHTML = extrairOrientacoesUnicas(db.autores)
            .map((o) => `<option value="${escapeHtml(o)}">`)
            .join('');
    }

    // 0.065. Sugestões de "Gênero" da Pessoa (cadastro central de
    // Pessoas, distinto do Autor acima) — mesmo padrão, semente
    // GENEROS_SUGERIDOS + o que já foi digitado (extrairGenerosPessoasUnicos
    // em utils.js).
    const datalistGeneroPessoa = document.getElementById('sugestoes-genero-pessoa');
    if (datalistGeneroPessoa) {
        datalistGeneroPessoa.innerHTML = extrairGenerosPessoasUnicos(db.pessoas)
            .map((g) => `<option value="${escapeHtml(g)}">`)
            .join('');
    }
    // Mesma sugestão, agora pro input "Definir gênero" da barra de ações
    // em massa da aba Pessoas (index.html) — datalist própria porque o
    // input fica sempre na página, enquanto a de cima (sugestoes-genero-pessoa)
    // só existe no DOM depois que o modal-pessoa é carregado (fetch lazy,
    // ver garantirModal em modais.js).
    const datalistGeneroPessoaMassa = document.getElementById('sugestoes-genero-pessoas-massa');
    if (datalistGeneroPessoaMassa) {
        datalistGeneroPessoaMassa.innerHTML = extrairGenerosPessoasUnicos(db.pessoas)
            .map((g) => `<option value="${escapeHtml(g)}">`)
            .join('');
    }

    // 0.066. Sugestões de "Orientação" da Pessoa (modal) e do input "Definir
    // orientação" da barra em massa (fica sempre na página, por isso datalist
    // própria, igual ao Gênero acima).
    ['sugestoes-orientacao-pessoa', 'sugestoes-orientacao-pessoas-massa'].forEach((idLista) => {
        const lista = document.getElementById(idLista);
        if (lista) {
            lista.innerHTML = extrairOrientacoesPessoasUnicas(db.pessoas)
                .map((o) => `<option value="${escapeHtml(o)}">`)
                .join('');
        }
    });

    // 0.07. Sugestões de "Religião" e "Instituições frequentadas" do
    // Autor — mesmo padrão acima: Religião soma semente fixa + o que já
    // existe no acervo; Instituições só vem do acervo (nome de instituição não tem teto
    // fechado, ver extrairInstituicoesUnicas em utils.js).
    const datalistReligiao = document.getElementById('sugestoes-religiao-autor');
    if (datalistReligiao) {
        datalistReligiao.innerHTML = extrairReligioesUnicas(db.autores)
            .map((r) => `<option value="${escapeHtml(r)}">`)
            .join('');
    }
    const datalistInstituicoes = document.getElementById('sugestoes-instituicoes-autor');
    if (datalistInstituicoes) {
        datalistInstituicoes.innerHTML = extrairInstituicoesUnicas(db.autores)
            .map((i) => `<option value="${escapeHtml(i)}">`)
            .join('');
    }

    // 0.1. Sugestões de "Loja/Editora" já usadas em outros livros (mesmo
    // padrão da Fase de Vida acima)
    const datalistLojas = document.getElementById('sugestoes-loja-nome');
    if (datalistLojas) {
        datalistLojas.innerHTML = extrairNomesLojasUnicos(db.livros)
            .map((nome) => `<option value="${escapeHtml(nome)}">`)
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

    // 6. Elos e Ecos entre poemas — selects de poema-alvo (single),
    //    usados pela linha de "adicionar" de cada lista (ver editor.js:
    //    adicionarElo/adicionarEco). Repovoados a cada render pra
    //    refletir poemas criados/renomeados depois que o modal abriu.
    const sEloPoema = document.getElementById('p-elo-poema');
    const sRefPoema = document.getElementById('p-eco-poema');
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
    // Relação de Elos / Tipo de Ecos — Elos usa as 8 relações
    // fechadas (RELACOES_ELO em utils.js, ver redesenho Relação+Direção);
    // Ecos continua com sua lista fechada simples de tipos
    // (TIPOS_ECO), sem Direção. Populadas aqui, e não hardcoded
    // no HTML, pra ter uma única fonte de verdade caso a lista mude.
    const sEloRelacao = document.getElementById('p-elo-relacao');
    const sRefTipo = document.getElementById('p-eco-tipo');
    if (sEloRelacao) {
        sEloRelacao.innerHTML =
            '<option value="">Relação...</option>' +
            RELACOES_ELO.map(
                (r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`,
            ).join('');
        atualizarRotulosDirecaoElo('poemas');
    }
    if (sRefTipo) {
        sRefTipo.innerHTML =
            '<option value="">Tipo...</option>' +
            TIPOS_ECO.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join(
                '',
            );
    }

    // 6b. Livros múltiplos no Modal de Prosas (item 4 — mesmo campo de
    //     Poema, etiqueta editorial paralela, coletâneas excluídas).
    const sProsaLivros = document.getElementById('pr-livros');
    if (sProsaLivros)
        sProsaLivros.innerHTML = db.livros
            .filter((l) => l.tipo !== 'Coletânea')
            .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
            .join('');

    // 6c. Elos e Ecos no Modal de Prosas (item 4) — selects de
    //     texto-alvo (single), mas agora com Poemas E Prosas juntos num
    //     optgroup por tipo (um texto do acervo pode se ligar tanto a um
    //     poema quanto a outra prosa) — diferente do Modal de Poemas
    //     acima, que por ora só oferece outros Poemas como alvo.
    const sEloProsa = document.getElementById('pr-elo-poema');
    const sRefProsa = document.getElementById('pr-eco-poema');
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
    const sRefTipoProsa = document.getElementById('pr-eco-tipo');
    if (sEloRelacaoProsa) {
        sEloRelacaoProsa.innerHTML =
            '<option value="">Relação...</option>' +
            RELACOES_ELO.map(
                (r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`,
            ).join('');
        atualizarRotulosDirecaoElo('prosas');
    }
    if (sRefTipoProsa) {
        sRefTipoProsa.innerHTML =
            '<option value="">Tipo...</option>' +
            TIPOS_ECO.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join(
                '',
            );
    }

    // 7. Destino de Prosas (Livro, Parte ou Seção) — sem filtro por padrão
    const destinoProsa = document.getElementById('pr-destino');
    if (destinoProsa) destinoProsa.innerHTML = construirOptionsDestino('', false);
    popularFiltroLivro('pr-destino-filtro');

    // 8. Grupos → checkboxes do Modal de Pessoa. Sempre reconstruído
    // (e portanto sempre desmarcado) — editarPessoa() marca de volta os
    // que a pessoa já pertence logo em seguida, depois desta chamada.
    //
    // Agrupado por Autor (cabeçalho de seção) e, dentro de cada Autor,
    // por "família" (um grupo de nível 1 e toda a sua descendência, em
    // pré-ordem alfabética, indentada por nível com "↳") — mesma lógica
    // de `seletorGrupos` em estatisticas-tela-pessoas.js e de
    // `cartoesDaFamilia`/`renderGrupos` em render-listas.js. Antes disto
    // a lista era só `db.grupos` cru ordenado por nome, sem Autor nem
    // nível — o mesmo problema real já corrigido nos outros dois lugares
    // (dois Autores podem ter cada um um grupo "Família": sem o Autor
    // como cabeçalho, ficariam indistinguíveis aqui). Pedido do Victor,
    // 27/09/2026: "na seleção de grupos a que uma pessoa pertence,
    // também acho que cabe mostrar a subdivisão de níveis".
    const cGrupos = document.getElementById('ps-grupos-container');
    if (cGrupos) {
        if (!db.grupos.length) {
            cGrupos.innerHTML = `<p class="text-xs text-gray-400 dark:text-slate-500">Nenhum grupo cadastrado ainda — use "+ Criar novo grupo" acima.</p>`;
        } else {
            const checkboxGrupo = (g, nivel) => {
                const indent = nivel > 1 ? ` style="padding-left:${(nivel - 1) * 0.9}rem"` : '';
                const seta = nivel > 1 ? '↳ ' : '';
                return `<label class="flex items-center gap-1.5 text-sm cursor-pointer"${indent}>
                    <input type="checkbox" value="${g.id}"
                        class="rounded border-gray-300 dark:border-slate-600 text-rose-500 focus:ring-rose-400" />
                    ${seta}${escapeHtml(g.nome)}
                </label>`;
            };
            const familiaGrupo = (g, gruposDoAutor, nivel) => {
                const filhos = gruposDoAutor
                    .filter((sub) => sub.paiId == g.id)
                    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                return (
                    checkboxGrupo(g, nivel) +
                    filhos.map((f) => familiaGrupo(f, gruposDoAutor, nivel + 1)).join('')
                );
            };
            const autoresComGrupo = [...new Set(db.grupos.map((g) => g.autorId))]
                .map((id) => db.autores?.find((a) => a.id == id))
                .filter(Boolean)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            cGrupos.innerHTML = autoresComGrupo
                .map((autor) => {
                    const gruposDoAutor = db.grupos.filter((g) => g.autorId == autor.id);
                    const nivel1 = gruposDoAutor
                        .filter((g) => g.paiId == null)
                        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                    const itens = nivel1.map((g) => familiaGrupo(g, gruposDoAutor, 1)).join('');
                    return `<h4 class="w-full text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-1.5 first:mt-0">${escapeHtml(autor.nome)}</h4>${itens}`;
                })
                .join('');
        }
    }

    // 8b. Autores → checkboxes do Modal de Pessoa (lacuna apontada pelo
    // Victor, 27/09/2026: "Pessoas ainda não atribui a autores... a
    // ideia seria que tivesse essa atribuição, só que não ficasse presa
    // a atribuir a apenas um autor"). N:N e opcional — por isso
    // checkbox, não um `<select>` único como em Grupo/Época (onde Autor
    // é obrigatório e de escolha única, ver `g-autor`/`ep-autor`). Lista
    // simples (sem hierarquia — Autor não tem nível, diferente do bloco
    // de Grupos acima), sempre reconstruída e desmarcada; `editarPessoa`
    // marca de volta os já associados.
    const cAutoresPessoa = document.getElementById('ps-autores-container');
    if (cAutoresPessoa) {
        const autoresOrdenados = [...db.autores].sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR'),
        );
        cAutoresPessoa.innerHTML = autoresOrdenados.length
            ? autoresOrdenados
                  .map(
                      (a) => `
                <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" value="${a.id}"
                        class="rounded border-gray-300 dark:border-slate-600 text-rose-500 focus:ring-rose-400" />
                    ${escapeHtml(a.nome)}
                </label>`,
                  )
                  .join('')
            : `<p class="text-xs text-gray-400 dark:text-slate-500">Nenhum Autor cadastrado ainda.</p>`;
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
        'periodo-historico': 'ph-edit-id',
        'movimento-escola': 'me-edit-id',
        assunto: 'as-edit-id',
        tema: 'te-edit-id',
    };

    const idField = document.getElementById(idFields[tipo]);
    if (idField) idField.value = '';

    if (tipo === 'periodo-historico') {
        atualizarDatalistRegiaoPeriodoHistorico();
        resetRegiaoPeriodoHistorico();
        preencherPaisPeriodoHistorico(null, []);
        resetFontesPeriodoHistorico();
        preencherCamposPeriodoHistorico(null);
    }
    if (tipo === 'movimento-escola') {
        atualizarDatalistRegiaoOrigemMovimento();
        preencherOpcoesPaiCorrente();
    }
    if (tipo === 'autor') atualizarDatalistsAutor();

    if (tipo === 'poema') {
        resetSinalizacoes('poemas');
        resetTemasTexto('poemas');
        resetLocaisTexto('poemas');
        resetIdiomasTexto('poemas');
        resetJargaoGiriaTexto('poemas');
        resetPersonagens('poemas');
        resetPessoas('poemas');
        resetAutoria('poemas');
        resetEnvios('poemas');
        resetReconhecimentos('poemas');
        resetIntertextualidade('poemas');
        resetReferenciasExternas('poemas');
        resetAnexos('poemas');
        resetAnotacoes();
        resetElos('poemas');
        resetEcos('poemas');
        resetMovimentosEscolasDiretos('poemas');
        resetPeriodosHistoricosDoTexto('poemas');
        resetEpocasRetratadasDoTexto('poemas');
        renderPainelElosDerivados(null);
        renderAutoclassificacao('poemas');
        atualizarDatalist();
        const infoP = document.getElementById('p-coletaneas-info');
        if (infoP) infoP.innerHTML = '';
        // Import dinâmico pra evitar ciclo (forms.js já importa de
        // ui.js estaticamente, ver import no topo de forms.js — mesmo
        // motivo do bloco 'prosa'/'grupo' abaixo). Limpa por segurança
        // uma eventual promoção de Molde pendente (ver
        // moldePromovendoContexto, forms.js): "Adicionar Poema" comum
        // nunca deveria herdar isso. AWAITED (diferente do bloco
        // 'prosa'/'grupo' abaixo, que dispara e esquece) — sem isso,
        // iniciarPromocaoMolde (forms.js) setaria o contexto logo
        // depois do `await prepararNovo('poema')` só pra correr risco
        // de este import ainda resolver depois e limpar o contexto que
        // acabou de ser setado.
        await import('./forms.js').then(({ limparPromocaoMoldeEmCurso }) => {
            limparPromocaoMoldeEmCurso();
        });
    }

    if (tipo === 'prosa') {
        // resetPessoas, resetAutoria, resetSinalizacoes e os 7 grupos de
        // criarListaDeEntradas (Elos/Ecos/Intertextualidade/Referências/
        // Anexos/Envios/Reconhecimentos) já são importados estaticamente
        // acima (unificados por tabela) — só o que ainda é exclusivo de
        // Prosa (gênero) precisa de import dinâmico (evita ciclo de
        // importação, editor → ui não existe).
        resetSinalizacoes('prosas');
        resetTemasTexto('prosas');
        resetLocaisTexto('prosas');
        resetIdiomasTexto('prosas');
        resetJargaoGiriaTexto('prosas');
        resetPersonagens('prosas');
        resetPessoas('prosas');
        resetAutoria('prosas');
        resetEnvios('prosas');
        resetReconhecimentos('prosas');
        resetIntertextualidade('prosas');
        resetReferenciasExternas('prosas');
        resetAnexos('prosas');
        resetElos('prosas');
        resetEcos('prosas');
        resetMovimentosEscolasDiretos('prosas');
        resetPeriodosHistoricosDoTexto('prosas');
        resetEpocasRetratadasDoTexto('prosas');
        renderPainelElosDerivados(null);
        renderAutoclassificacao('prosas');
        import('./editor.js').then(
            ({ resetGeneroProsa, atualizarDatalistProsa, renderPainelElosDerivadosProsa }) => {
                resetGeneroProsa();
                atualizarDatalistProsa();
                renderPainelElosDerivadosProsa(null);
            },
        );
        const infoPr = document.getElementById('pr-coletaneas-info');
        if (infoPr) infoPr.innerHTML = '';
    }

    if (tipo === 'livro') {
        // Import dinâmico pra evitar ciclo (ui → editor não existe hoje,
        // mesmo motivo do bloco 'prosa' acima) — só zera o estado
        // transitório da lista de Lojas (onde comprar), já que ela vive
        // fora do form.reset() nativo.
        import('./editor.js').then(({ resetLojas }) => resetLojas());
    }

    if (tipo === 'autor') {
        // Mesmo motivo do bloco 'livro' acima: os chips de Nomes
        // Literários, Ocupações, Neurodivergências, Condições Clínicas,
        // Deficiências e Instituições Frequentadas vivem em estado próprio (closure de
        // criarGrupoDeTags/criarGrupoDeTagsComTipo), fora do form.reset()
        // nativo. Sexo/Cor-Raça/Gênero/Orientação/Religião/Classe
        // social/Grau acadêmico são inputs/selects nativos comuns — o
        // form.reset() já cuida deles. Os grupos colapsáveis
        // (<details>) não são resetados pelo form.reset(): fecha todos
        // à mão pra Autor novo começar limpo, sem herdar o estado do
        // Autor aberto por último.
        document.querySelectorAll('#modal-autor details[data-grupo-autor]').forEach((d) => {
            d.open = false;
        });
        import('./editor.js').then(
            ({
                resetNomesLiterariosAutor,
                resetOcupacoesAutor,
                resetNeurodivergenciasAutor,
                resetCondicoesClinicasAutor,
                resetDeficienciasAutor,
                resetInstituicoesAutor,
                resetPremiosAutor,
                resetObrasAutor,
                resetCirculoLiterarioAutor,
                resetLinguasEscritaAutor,
            }) => {
                resetNomesLiterariosAutor();
                resetOcupacoesAutor();
                resetNeurodivergenciasAutor();
                resetCondicoesClinicasAutor();
                resetDeficienciasAutor();
                resetInstituicoesAutor();
                resetPremiosAutor();
                resetObrasAutor();
                resetCirculoLiterarioAutor();
                resetLinguasEscritaAutor();
            },
        );
        resetMovimentosEscolasDiretos('autores');
    }

    if (tipo === 'movimento-escola') {
        // Mesmo motivo do bloco 'autor' acima: os 6 campos de tag livre
        // (Valores/Temas/Técnicas/Tipos de Composição/Lemas/Manifestos)
        // vivem em estado próprio (closure de criarGrupoDeTagsArray),
        // fora do form.reset() nativo.
        resetTodosOsGruposDeMovimento();
        resetFontesCorrente();
        // Os grupos colapsáveis (<details>) também não são resetados pelo
        // form.reset(): fecha todos à mão, como no bloco 'autor' acima.
        document
            .querySelectorAll('#modal-movimento-escola details[data-grupo-corrente]')
            .forEach((d) => {
                d.open = false;
            });
    }

    if (tipo === 'assunto') {
        // Os chips de Temas vivem em estado próprio (closure de
        // criarGrupoDeTagsArray), fora do form.reset() nativo — mesmo
        // motivo do bloco 'movimento-escola' acima.
        resetTemasAssunto();
        atualizarDatalistTemasAssunto();
    }

    if (tipo === 'grupo') {
        // Import dinâmico pra evitar ciclo (forms → ui já existe, ver
        // resetPessoas('prosas') acima pelo mesmo motivo). Sem cor marcada
        // ainda no form novo: seleciona a primeira da paleta por padrão
        // (mesmo padrão do fallback em classesCorGrupo, ver utils.js).
        // Autor: pré-seleciona quem estiver marcado "sou eu" (sugestão,
        // não trava — ver obterAutorSouEuId em db.js); "Grupo pai" nasce
        // vazio até um Autor ser escolhido (ver atualizarSelectGrupoPai).
        import('./forms.js').then(({ renderSeletorCorGrupo, renderSelectAutor }) => {
            const corField = document.getElementById('g-cor');
            if (corField) corField.value = CORES_GRUPO_PADRAO;
            renderSeletorCorGrupo(CORES_GRUPO_PADRAO);
            renderSelectAutor('g-autor', null);
            window.atualizarSelectGrupoPai();
        });
    }

    if (tipo === 'epoca') {
        // Mesmo raciocínio do bloco 'grupo' acima: Autor pré-selecionado
        // com quem estiver marcado "sou eu", sem travar a escolha.
        // Bloco 3: campos novos nascem vazios (estado fora do form.reset nativo).
        // Depois do Autor, porque "Faz parte de" só oferece períodos do autor
        // escolhido.
        Promise.all([import('./forms.js'), import('./periodo-biografico-ui.js')]).then(
            ([{ renderSelectAutor }, { preencherCamposPeriodoBiografico }]) => {
                renderSelectAutor('ep-autor', null);
                preencherCamposPeriodoBiografico(null);
            },
        );
    }

    const title = document.getElementById(`modal-${tipo}-titulo`);
    if (title) title.innerText = `Novo(a) ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
    if (title && tipo === 'assunto') title.innerText = 'Cadastrar Assunto';
    if (title && tipo === 'movimento-escola') title.innerText = 'Nova Corrente literária';
    if (title && tipo === 'tema') title.innerText = 'Cadastrar Tema';

    toggleModal(`modal-${tipo}`);
}

// Atalho pro botão "Novo subgrupo" no card de um Grupo em qualquer nível
// abaixo do teto (ver cartaoGrupo em render-listas.js e NIVEL_MAXIMO_GRUPO
// em db.js — o último nível não ganha esse botão, já é o mais fundo
// permitido). Passa pelo mesmo `prepararNovo('grupo')`
// de sempre e só poupa os dois passos manuais mais comuns nesse
// caminho: Autor e Grupo pai já saem pré-selecionados a partir do grupo
// clicado, em vez de vazios.
export async function prepararNovoSubgrupo(paiId) {
    const pai = db.grupos.find((g) => g.id == paiId);
    if (!pai) return;
    await prepararNovo('grupo');
    const { renderSelectAutor } = await import('./forms.js');
    renderSelectAutor('g-autor', pai.autorId);
    window.atualizarSelectGrupoPai();
    const selectPai = document.getElementById('g-pai');
    if (selectPai) selectPai.value = String(pai.id);
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
