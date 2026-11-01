// ============================================================
// revisao-massa-fora-do-acervo.js: lógica pura (sem DOM e sem db.js) da edição
// em massa do "Modo revisão" da seção "Fora do acervo" da aba Conexões (a
// pedido do Victor, 28/10/2026): aplicar o mesmo valor a todas as linhas que o
// filtro mostra, por exemplo a origem "Grécia" a todas as entradas de tipo
// "Mitologia".
//
// Não há plano nem Desfazer novos: a edição em massa vira uma lista de edições
// linha por linha e passa pelo `planejarRevisao` e pelo `aplicarRevisao` de
// `revisao-fora-do-acervo.js`, com as mesmas recusas (data da obra inválida,
// "Até" antes do começo) e o mesmo Desfazer, que devolve cada entrada como
// estava.
//
//   planejarEdicaoEmMassa(entrada, chaves, operacoes)   só lê; diz o que mudaria
//   aplicarEdicaoEmMassa(plano)                         grava e devolve `desfazer()`
//
// `entrada` é `{ poemas, prosas }`; `chaves` são as chaves das linhas de
// `listarLinhasRevisao` (as que o filtro mostra); `operacoes` é uma lista de
// operações, no máximo uma por valor:
//
//   Listas (origem, personagem):
//     { valor: 'origem', modo: 'adicionar' | 'substituir' | 'remover' | 'limpar', valores: [...] }
//     `adicionar` junta às que a entrada já tem (sem repetir, ignorando acento
//     e caixa; a grafia que já estava vence), `substituir` troca a lista
//     inteira, `remover` tira só as citadas e `limpar` tira todas (sem
//     `valores`). O personagem não tem `substituir`.
//   Texto (tipoObra, relacao, dataObra, dataObraAte):
//     { valor: 'tipoObra', texto: 'Mitologia' }   texto vazio tira o valor
//   Check (obraPessoal, traduzido):
//     { valor: 'obraPessoal', marcado: true }
//
// Personagem e traduzido só existem na Intertextualidade: nas linhas de
// Hipertextualidade essas operações não valem e a linha só recebe as outras.
// Linha em que nenhuma operação vale conta em `semAplicacao`; linha em que o
// valor já é o pedido não entra no plano e conta em `semMudanca`.
//
// Recusas (plano com `erro`, sem alteracoes): `sem-linhas`, `sem-operacao`,
// `operacao-invalida`, `operacao-repetida`, `valor-vazio` (adicionar, substituir
// ou remover sem nenhum valor), mais as do `planejarRevisao`.
// ============================================================

import {
    aplicarRevisao,
    listarLinhasRevisao,
    MENSAGENS_ERRO_REVISAO,
    planejarRevisao,
    ROTULOS_VALOR_REVISAO,
    valorAplica,
} from './revisao-fora-do-acervo.js';
import { chaveDeOrigem, normalizarOrigens } from './origem-da-obra.js';
import { chaveDePersonagem, normalizarPersonagens } from './personagens-da-obra.js';
import { hojeIso } from './utils.js';

// Os valores que a edição em massa aceita, por tipo de operação.
export const MASSA_LISTAS = {
    origem: {
        modos: ['adicionar', 'substituir', 'remover', 'limpar'],
        normalizar: normalizarOrigens,
        chave: chaveDeOrigem,
        lista: 'origens',
    },
    personagem: {
        modos: ['adicionar', 'remover', 'limpar'],
        normalizar: normalizarPersonagens,
        chave: chaveDePersonagem,
        lista: 'personagens',
    },
};
export const MASSA_TEXTOS = ['tipoObra', 'relacao', 'dataObra', 'dataObraAte'];
export const MASSA_CHECKS = ['obraPessoal', 'traduzido'];
export const VALORES_EM_MASSA = [...Object.keys(MASSA_LISTAS), ...MASSA_TEXTOS, ...MASSA_CHECKS];

export const MENSAGENS_ERRO_MASSA = {
    ...MENSAGENS_ERRO_REVISAO,
    'sem-linhas': 'Nenhuma linha para editar. Ajuste o filtro e tente de novo.',
    'sem-operacao': 'Escolha o que mudar antes de aplicar.',
    'operacao-invalida': 'Uma das mudanças pedidas não é válida.',
    'operacao-repetida': 'O mesmo campo foi escolhido duas vezes. Deixe só uma mudança por campo.',
    'valor-vazio': 'Escreva pelo menos um valor para adicionar, substituir ou remover.',
};

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Confere e normaliza as operações. Devolve `{ erro, operacoes }`.
export function normalizarOperacoes(operacoes) {
    const lista = Array.isArray(operacoes) ? operacoes.filter(ehObjeto) : [];
    if (!lista.length) return { erro: 'sem-operacao', operacoes: [] };
    const vistos = new Set();
    const saida = [];
    for (const op of lista) {
        const valor = op.valor;
        if (!VALORES_EM_MASSA.includes(valor)) return { erro: 'operacao-invalida', operacoes: [] };
        if (vistos.has(valor)) return { erro: 'operacao-repetida', operacoes: [] };
        vistos.add(valor);
        if (valor in MASSA_LISTAS) {
            const info = MASSA_LISTAS[valor];
            if (!info.modos.includes(op.modo)) return { erro: 'operacao-invalida', operacoes: [] };
            const valores = info.normalizar(Array.isArray(op.valores) ? op.valores : []);
            if (op.modo !== 'limpar' && !valores.length) {
                return { erro: 'valor-vazio', operacoes: [] };
            }
            saida.push({ valor, modo: op.modo, valores: op.modo === 'limpar' ? [] : valores });
        } else if (MASSA_TEXTOS.includes(valor)) {
            if (typeof op.texto !== 'string') return { erro: 'operacao-invalida', operacoes: [] };
            saida.push({ valor, texto: op.texto.replace(/\s+/g, ' ').trim() });
        } else {
            if (typeof op.marcado !== 'boolean')
                return { erro: 'operacao-invalida', operacoes: [] };
            saida.push({ valor, marcado: op.marcado });
        }
    }
    return { erro: '', operacoes: saida };
}

// A lista que a entrada terá depois da operação de lista.
function listaDepois(info, atual, op) {
    if (op.modo === 'limpar') return [];
    if (op.modo === 'substituir') return info.normalizar(op.valores);
    if (op.modo === 'adicionar') return info.normalizar([...atual, ...op.valores]);
    const tirar = new Set(op.valores.map(info.chave));
    return atual.filter((item) => !tirar.has(info.chave(item)));
}

// As edições de linha (as de `planejarRevisao`) para as linhas escolhidas.
// Devolve `{ edicoes, alvos, semAplicacao }`; chave que não existe mais não
// entra (o `planejarRevisao` a contaria em `naoEncontradas`, mas aqui ela é
// descartada antes: a tela filtrou as chaves das linhas que existem).
export function montarEdicoesEmMassa(linhas, chaves, operacoes) {
    const porChave = new Map((linhas || []).map((l) => [l.chave, l]));
    const edicoes = [];
    let alvos = 0;
    let semAplicacao = 0;
    const vistas = new Set();
    for (const chave of Array.isArray(chaves) ? chaves : []) {
        const linha = porChave.get(chave);
        if (!linha || vistas.has(chave)) continue;
        vistas.add(chave);
        alvos += 1;
        const valores = {};
        for (const op of operacoes) {
            if (!valorAplica(linha.campo, op.valor)) continue;
            if (op.valor in MASSA_LISTAS) {
                const info = MASSA_LISTAS[op.valor];
                valores[info.lista] = listaDepois(info, linha.valores[info.lista], op);
            } else if (MASSA_TEXTOS.includes(op.valor)) {
                valores[op.valor] = op.texto;
            } else {
                valores[op.valor] = op.marcado;
            }
        }
        if (!Object.keys(valores).length) {
            semAplicacao += 1;
            continue;
        }
        edicoes.push({ chave, valores });
    }
    return { edicoes, alvos, semAplicacao };
}

function planoVazio(erro) {
    return {
        erro,
        alteracoes: [],
        textos: 0,
        entradas: 0,
        naoEncontradas: 0,
        linhaComErro: '',
        camposAlterados: {},
        alvos: 0,
        semMudanca: 0,
        semAplicacao: 0,
        operacoes: [],
    };
}

export function planejarEdicaoEmMassa(
    entrada = {},
    chaves = [],
    operacoes = [],
    { hoje = hojeIso() } = {},
) {
    const { erro, operacoes: ops } = normalizarOperacoes(operacoes);
    if (erro) return planoVazio(erro);
    const linhas = listarLinhasRevisao(entrada);
    const { edicoes, alvos, semAplicacao } = montarEdicoesEmMassa(linhas, chaves, ops);
    if (!alvos) return planoVazio('sem-linhas');
    if (!edicoes.length)
        return { ...planoVazio('sem-edicao'), alvos, semAplicacao, operacoes: ops };
    const plano = planejarRevisao(entrada, edicoes, { hoje });
    return {
        ...plano,
        alvos,
        semAplicacao,
        semMudanca: plano.erro ? 0 : edicoes.length - plano.entradas,
        operacoes: ops,
    };
}

// Grava o plano. É o `aplicarRevisao`: o Desfazer devolve cada entrada.
export const aplicarEdicaoEmMassa = aplicarRevisao;

const LISTA_FRASE = {
    adicionar: (rotulo, vs) => `adicionar ${rotulo} ${vs}`,
    substituir: (rotulo, vs) => `trocar ${rotulo} por ${vs}`,
    remover: (rotulo, vs) => `tirar ${rotulo} ${vs}`,
};

const LIMPAR_FRASE = { origem: 'todas as origens', personagem: 'todos os personagens' };

function frasePorValores(valores) {
    const citados = valores.map((v) => `«${v}»`);
    if (citados.length <= 1) return citados.join('');
    return `${citados.slice(0, -1).join(', ')} e ${citados.at(-1)}`;
}

// As mudanças pedidas em frases curtas, para a confirmação:
// "adicionar origem «Grécia»", "tipo: «Mitologia»", "obra pessoal: sim".
export function descreverOperacoes(operacoes = []) {
    const { operacoes: ops } = normalizarOperacoes(operacoes);
    return ops.map((op) => {
        const rotulo = ROTULOS_VALOR_REVISAO[op.valor];
        if (op.valor in MASSA_LISTAS) {
            if (op.modo === 'limpar') return `tirar ${LIMPAR_FRASE[op.valor]}`;
            return LISTA_FRASE[op.modo](rotulo, frasePorValores(op.valores));
        }
        if (MASSA_TEXTOS.includes(op.valor)) {
            return op.texto ? `${rotulo}: «${op.texto}»` : `${rotulo}: tirar`;
        }
        return `${rotulo}: ${op.marcado ? 'sim' : 'não'}`;
    });
}
