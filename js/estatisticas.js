// ============================================================
// estatisticas.js — fachada pública das Estatísticas.
// A lógica de dados, filtros e telas vive em módulos menores para
// manter este ponto de entrada estável para o restante do app/testes.
// ============================================================

export * from './estatisticas-filtros.js';
export * from './estatisticas-dados.js';
export * from './estatisticas-dados-local-idioma.js';
export * from './estatisticas-dados-personagens.js';
export * from './estatisticas-dados-correntes.js';
export { filtrarItensOcultos } from './estatisticas-tela-comum.js';

import { renderVisaoGeral } from './estatisticas-tela-visao-geral.js';
import { renderProducao } from './estatisticas-tela-producao.js';
import { renderTemasAssuntos } from './estatisticas-tela-temas.js';
import { renderPessoasGrupos } from './estatisticas-tela-pessoas.js';
import { renderPersonagens } from './estatisticas-tela-personagens.js';
import { renderCruzamentos } from './estatisticas-tela-cruzamentos.js';
import { renderLinguagem } from './estatisticas-tela-linguagem.js';
import { renderLocalIdioma } from './estatisticas-tela-local-idioma.js';
import { renderCorrentes } from './estatisticas-tela-correntes.js';

// Abas que redesenham quando os filtros, os dados ou o tema claro/escuro mudam.
const ABAS_ESTATISTICAS = [
    'estatisticas',
    'estatisticas-producao',
    'estatisticas-temas-assuntos',
    'estatisticas-pessoas-grupos',
    'estatisticas-personagens',
    'estatisticas-cruzamentos',
    'estatisticas-local-idioma',
    'estatisticas-correntes',
    'estatisticas-linguagem',
];

export function renderEstatisticas() {
    renderVisaoGeral();
    renderProducao();
    renderTemasAssuntos();
    renderPessoasGrupos();
    renderPersonagens();
    renderCruzamentos();
    renderLocalIdioma();
    renderCorrentes();
    renderLinguagem();
}

if (typeof window !== 'undefined') {
    window.addEventListener('estatisticas:filtros-alterados', () => {
        if (
            ABAS_ESTATISTICAS.some((id) =>
                document.getElementById(id)?.classList.contains('active'),
            )
        ) {
            renderEstatisticas();
        }
    });

    window.addEventListener('db:saved', () => {
        if (
            ABAS_ESTATISTICAS.some((id) =>
                document.getElementById(id)?.classList.contains('active'),
            )
        ) {
            renderEstatisticas();
        }
    });

    window.addEventListener('tema:alterado', () => {
        if (
            ABAS_ESTATISTICAS.some((id) =>
                document.getElementById(id)?.classList.contains('active'),
            )
        ) {
            renderEstatisticas();
        }
    });
}
