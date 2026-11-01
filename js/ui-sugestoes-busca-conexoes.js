// ============================================================
// ui-sugestoes-busca-conexoes.js: caixinha de sugestões sob a caixa "Filtrar
// obras, autores e origens" da seção "Fora do acervo" (aba Conexões). A lógica
// mora em sugestoes-busca-conexoes.js e a ligação com a caixa em
// ui-sugestoes-busca.js; aqui só os ids desta caixa.
// ============================================================

import { sugerirBuscaConexoes } from './sugestoes-busca-conexoes.js';
import { criarSugestoesBusca } from './ui-sugestoes-busca.js';

const ui = criarSugestoesBusca({
    idCaixa: 'conexoes-fora-filtro',
    idLista: 'conexoes-fora-sugestoes',
    sugerir: sugerirBuscaConexoes,
});

export const fecharSugestoesBuscaConexoes = ui.fechar;
export const atualizarSugestoesBuscaConexoes = ui.atualizar;

// `obras()` devolve as obras da seção (todas, sem filtro) e `mudou(texto)` é
// chamada quando a sugestão muda o texto da caixa (o mesmo `oninput` de quem digita).
export function initSugestoesBuscaConexoes({ obras, mudou }) {
    ui.iniciar({ itens: obras, mudou });
}
