// ============================================================
// sugestoes-busca-revisao.js: sugestões enquanto se digita na caixa "Buscar nas
// linhas" do Modo revisão (seção "Fora do acervo", aba Conexões), como nas abas
// de texto e na de Livros. Lógica pura, sem DOM: recebe o texto da caixa e as
// linhas do Modo revisão e devolve o que oferecer para o ÚLTIMO termo (o que
// está sendo digitado). O núcleo mora em sugestoes-busca-campos.js (o mesmo das
// listas de Obras, Autores e Origens); aqui ficam só os campos e os valores das
// linhas. A ligação com a caixa mora em ui-sugestoes-busca-revisao.js.
//
//   "or"            → origem:
//   "origem:"       → * (preenchida) e as origens que existem, da mais usada
//   "origem:gr"     → as origens que contêm "gr" (sem acento nem caixa)
//   "-tipo:mi"      → o "-" é mantido
//
// As colunas de texto livre (descrição, trecho, link, nota) e os checks só
// oferecem `*`.
// ============================================================

import { CAMPOS_BUSCA_REVISAO, PREFIXOS_BUSCA_REVISAO } from './revisao-fora-do-acervo.js';
import {
    LIMITE_SUGESTOES_BUSCA,
    aplicarSugestaoBusca,
    sugerirPorCampos,
} from './sugestoes-busca-campos.js';

export const LIMITE_SUGESTOES_BUSCA_REVISAO = LIMITE_SUGESTOES_BUSCA;

const DESCRICAO_PREFIXO = {
    texto: 'título do texto',
    relacao: 'relação com a obra',
    nome: 'nome da obra',
    autor: 'autor da obra',
    origem: 'lugar ou cultura',
    tipo: 'tipo de obra',
    descricao: 'descrição',
    data: 'data da obra (e Até)',
    pessoal: 'obra pessoal',
    personagem: 'personagem',
    trecho: 'trecho',
    traduzido: 'traduzido',
    link: 'link',
    acesso: 'data de acesso',
    nota: 'nota',
};

// Os valores de cada coluna que vale oferecer (os demais só aceitam `*`).
const VALORES_OFERECIDOS = {
    titulo: (l) => [l.titulo],
    relacao: (l) => [l.valores.relacao],
    nome: (l) => [l.valores.nome],
    autor: (l) => l.valores.autores,
    origem: (l) => l.valores.origens,
    tipo: (l) => [l.valores.tipoObra],
    data: (l) => [l.valores.dataObra, l.valores.dataObraAte],
    personagem: (l) => l.valores.personagens,
};

export function sugerirBuscaRevisao(query, linhas = [], limite = LIMITE_SUGESTOES_BUSCA_REVISAO) {
    return sugerirPorCampos(
        query,
        {
            campos: CAMPOS_BUSCA_REVISAO,
            prefixos: PREFIXOS_BUSCA_REVISAO,
            descricoes: DESCRICAO_PREFIXO,
            valores: VALORES_OFERECIDOS,
            itens: linhas,
            unidade: ['linha', 'linhas'],
        },
        limite,
    );
}

export const aplicarSugestaoBuscaRevisao = aplicarSugestaoBusca;
