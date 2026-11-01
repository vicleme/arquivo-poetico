// ============================================================
// sugestoes-busca-conexoes.js: sugestões enquanto se digita na caixa "Filtrar
// obras, autores e origens" da seção "Fora do acervo" (aba Conexões). Lógica
// pura, sem DOM; o núcleo mora em sugestoes-busca-campos.js (o mesmo do Modo
// revisão). Os valores oferecidos vêm das OBRAS (cada obra conta uma vez por
// valor), porque a lista de obras tem todos os campos; as listas de Autores e
// Origens usam os mesmos prefixos. A ligação com a caixa mora em
// ui-sugestoes-busca-conexoes.js.
// ============================================================

import {
    CAMPOS_BUSCA_CONEXOES,
    DESCRICAO_PREFIXO_CONEXOES,
    PREFIXOS_BUSCA_CONEXOES,
    valoresDeBuscaConexoes,
} from './busca-campos-conexoes.js';
import { LIMITE_SUGESTOES_BUSCA, sugerirPorCampos } from './sugestoes-busca-campos.js';

// Campos que oferecem os valores que existem; `pessoal` só aceita `*`.
const CAMPOS_COM_VALORES = ['texto', 'obra', 'autor', 'origem', 'tipo', 'relacao', 'data'];

const VALORES_OFERECIDOS = Object.fromEntries(
    CAMPOS_COM_VALORES.map((campo) => [
        campo,
        (obra) => valoresDeBuscaConexoes('obras', obra)[campo] || [],
    ]),
);

export function sugerirBuscaConexoes(query, obras = [], limite = LIMITE_SUGESTOES_BUSCA) {
    return sugerirPorCampos(
        query,
        {
            campos: CAMPOS_BUSCA_CONEXOES,
            prefixos: PREFIXOS_BUSCA_CONEXOES,
            descricoes: DESCRICAO_PREFIXO_CONEXOES,
            valores: VALORES_OFERECIDOS,
            itens: obras,
            unidade: ['obra', 'obras'],
        },
        limite,
    );
}
