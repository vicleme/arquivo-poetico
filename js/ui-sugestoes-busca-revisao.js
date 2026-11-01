// ============================================================
// ui-sugestoes-busca-revisao.js: caixinha de sugestões sob a caixa "Buscar nas
// linhas" do Modo revisão. A lógica mora em sugestoes-busca-revisao.js e a
// ligação com a caixa em ui-sugestoes-busca.js (a mesma das listas de Obras,
// Autores e Origens); aqui só os ids desta caixa.
// ============================================================

import { sugerirBuscaRevisao } from './sugestoes-busca-revisao.js';
import { criarSugestoesBusca } from './ui-sugestoes-busca.js';

const ui = criarSugestoesBusca({
    idCaixa: 'revisao-busca',
    idLista: 'revisao-sugestoes',
    sugerir: sugerirBuscaRevisao,
});

export const fecharSugestoesBuscaRevisao = ui.fechar;
export const atualizarSugestoesBuscaRevisao = ui.atualizar;

// `linhas()` devolve as linhas do Modo revisão (todas, sem filtro) e `mudou(texto)`
// é chamada quando a sugestão muda o texto da caixa.
export function initSugestoesBuscaRevisao({ linhas, mudou }) {
    ui.iniciar({ itens: linhas, mudou });
}
