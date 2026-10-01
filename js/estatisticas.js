// ============================================================
// estatisticas.js — fachada pública das Estatísticas.
// A lógica de dados, filtros e telas vive em módulos menores para
// manter este ponto de entrada estável para o restante do app/testes.
// ============================================================

export * from './estatisticas-filtros.js';
export * from './estatisticas-dados.js';
export * from './estatisticas-dados-local-idioma.js';
export { filtrarItensOcultos } from './estatisticas-tela-comum.js';

import { renderVisaoGeral } from './estatisticas-tela-visao-geral.js';
import { renderProducao } from './estatisticas-tela-producao.js';
import { renderTemasPessoas } from './estatisticas-tela-temas-pessoas.js';
import { renderLinguagem } from './estatisticas-tela-linguagem.js';
import { renderLocalIdioma } from './estatisticas-tela-local-idioma.js';

export function renderEstatisticas() {
    renderVisaoGeral();
    renderProducao();
    renderTemasPessoas();
    renderLocalIdioma();
    renderLinguagem();
}

if (typeof window !== 'undefined') {
    window.addEventListener('estatisticas:filtros-alterados', () => {
        const ids = [
            'estatisticas',
            'estatisticas-producao',
            'estatisticas-temas-pessoas',
            'estatisticas-local-idioma',
            'estatisticas-linguagem',
        ];
        if (ids.some((id) => document.getElementById(id)?.classList.contains('active'))) {
            renderEstatisticas();
        }
    });

    window.addEventListener('db:saved', () => {
        const ids = [
            'estatisticas',
            'estatisticas-producao',
            'estatisticas-temas-pessoas',
            'estatisticas-local-idioma',
            'estatisticas-linguagem',
        ];
        if (ids.some((id) => document.getElementById(id)?.classList.contains('active'))) {
            renderEstatisticas();
        }
    });

    window.addEventListener('tema:alterado', () => {
        const ids = [
            'estatisticas',
            'estatisticas-producao',
            'estatisticas-temas-pessoas',
            'estatisticas-local-idioma',
            'estatisticas-linguagem',
        ];
        if (ids.some((id) => document.getElementById(id)?.classList.contains('active'))) {
            renderEstatisticas();
        }
    });
}
