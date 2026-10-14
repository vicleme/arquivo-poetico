// ============================================================
// fontes-periodo-historico-ui.js: lista editável de fontes no modal de Período Histórico
// ============================================================
// Mesma lista da Corrente literária (criarListaDeFontes), com os ids do modal
// de Período Histórico (`ph-`) e em uma coluna só, porque o modal é estreito.
// A lógica de normalizar e comparar fontes fica em fontes-corrente.js (puro).

import { criarListaDeFontes } from './fontes-corrente-ui.js';

const periodo = criarListaDeFontes({
    idLista: 'ph-fontes-lista',
    idVazio: 'ph-fontes-vazio',
    nomeRemover: 'removerFontePeriodoHistorico',
    compacto: true,
});

export const carregarFontesPeriodoHistorico = (fontes) => periodo.carregar(fontes);
export const resetFontesPeriodoHistorico = () => periodo.reset();
export const adicionarFontePeriodoHistorico = () => periodo.adicionar();
export const removerFontePeriodoHistorico = (botao) => periodo.remover(botao);
export const lerFontesPeriodoHistorico = () => periodo.ler();
