// Período Histórico (cadastro `db.periodosHistoricos`): Esfera e Categoria.
// Funções puras, sem DOM e sem save(); quem chama decide quando persistir
// (mesmo critério de periodo-biografico-campos.js, que este módulo espelha).
//
// Modelo (decidido em 15/10/2026), tudo no cadastro do período, nada no texto:
//   esferas:    ['Política', 'Social', ...]          ONDE o fenômeno acontece
//   categorias: ['Revolução', 'Guerra e conflito']   QUE TIPO de acontecimento é
// Os dois são listas (um período pode ter vários valores) e opcionais.
//
// Vocabulário editável: `db.opcoesPeriodoHistorico = { esferas, categorias }`,
// separado do vocabulário dos Períodos Biográficos (a Esfera biográfica é
// "Trabalho", "Família"; a histórica é "Política", "Econômica": misturar as
// duas listas confundiria as duas). Nasce com a lista de fábrica, aceita valor
// novo digitado e tem o modal "Gerenciar" (renomear, juntar, apagar o que
// ninguém usa).
//
// "Evento pontual" NÃO é Categoria: evento é a marca `evento: true` da fase 14
// (F14-D3), que diz o TAMANHO do recorte; Categoria diz o tipo do fenômeno.

import { chaveValor, normalizarLista } from './periodo-biografico-campos.js';
import { periodosHistoricosIdsDoItem } from './utils.js';

export const ESFERAS_HISTORICAS_DE_FABRICA = [
    'Política',
    'Econômica',
    'Artística e cultural',
    'Científica e tecnológica',
    'Social',
    'Sanitária',
];

export const CATEGORIAS_HISTORICAS_DE_FABRICA = [
    'Revolução',
    'Guerra e conflito',
    'Regime político',
    'Movimento artístico',
    'Movimento intelectual',
    'Crise',
    'Era',
];

export const TIPOS_OPCAO_PERIODO_HISTORICO = ['esferas', 'categorias'];

// Classificação dos 16 períodos de fábrica, casada por nome (o mesmo critério
// da região e das fontes). Só vale uma vez por período: a migração preenche o
// campo que nunca existiu e depois não toca mais, nem se a pessoa esvaziar.
export const CLASSIFICACAO_DE_FABRICA_PERIODOS_HISTORICOS = [
    {
        nome: 'Renascimento',
        esferas: ['Artística e cultural'],
        categorias: ['Movimento artístico', 'Movimento intelectual'],
    },
    {
        nome: 'Iluminismo',
        esferas: ['Política', 'Científica e tecnológica'],
        categorias: ['Movimento intelectual'],
    },
    {
        nome: 'Primeira Revolução Industrial',
        esferas: ['Econômica', 'Científica e tecnológica', 'Social'],
        categorias: ['Revolução'],
    },
    {
        nome: 'Revolução Francesa',
        esferas: ['Política', 'Social'],
        categorias: ['Revolução'],
    },
    {
        nome: 'Segunda Revolução Industrial',
        esferas: ['Econômica', 'Científica e tecnológica', 'Social'],
        categorias: ['Revolução'],
    },
    {
        nome: 'Belle Époque',
        esferas: ['Artística e cultural', 'Social'],
        categorias: ['Movimento artístico'],
    },
    {
        nome: 'Primeira Guerra Mundial',
        esferas: ['Política', 'Social'],
        categorias: ['Guerra e conflito'],
    },
    {
        nome: 'Semana de Arte Moderna',
        esferas: ['Artística e cultural'],
        categorias: ['Movimento artístico'],
    },
    {
        nome: 'Segunda Guerra Mundial',
        esferas: ['Política', 'Social'],
        categorias: ['Guerra e conflito'],
    },
    {
        nome: 'Estado Novo (Portugal)',
        esferas: ['Política'],
        categorias: ['Regime político'],
    },
    {
        nome: 'Ditadura Militar Brasileira',
        esferas: ['Política'],
        categorias: ['Regime político'],
    },
    {
        nome: 'Guerra Fria',
        esferas: ['Política'],
        categorias: ['Guerra e conflito'],
    },
    {
        nome: 'Terceira Revolução Industrial (Era da Informação)',
        esferas: ['Econômica', 'Científica e tecnológica', 'Social'],
        categorias: ['Revolução'],
    },
    {
        nome: 'Nova República',
        esferas: ['Política'],
        categorias: ['Regime político'],
    },
    {
        nome: 'Quarta Revolução Industrial (Indústria 4.0)',
        esferas: ['Econômica', 'Científica e tecnológica', 'Social'],
        categorias: ['Revolução'],
    },
    {
        nome: 'Pandemia de Covid-19',
        esferas: ['Sanitária', 'Social'],
        categorias: ['Crise'],
    },
];

// ─── Vocabulário ─────────────────────────────────────────────────────────

// Vocabulário completo de uma instalação nova (a chave padrão de `db`).
export function opcoesDeFabricaPeriodoHistorico() {
    return {
        esferas: [...ESFERAS_HISTORICAS_DE_FABRICA],
        categorias: [...CATEGORIAS_HISTORICAS_DE_FABRICA],
    };
}

// Semeia a lista de fábrica uma vez (chave ausente) e garante que todo valor
// já usado num período esteja na lista (backup de outro aparelho). Com a
// chave presente o vocabulário só é normalizado: o que a pessoa apagou de
// propósito não volta. Idempotente.
export function migrarOpcoesPeriodoHistorico(dbRef) {
    const atual = dbRef.opcoesPeriodoHistorico;
    const base = atual && typeof atual === 'object' ? atual : {};
    const fabrica = opcoesDeFabricaPeriodoHistorico();
    dbRef.opcoesPeriodoHistorico = {
        esferas: Array.isArray(base.esferas) ? normalizarLista(base.esferas) : fabrica.esferas,
        categorias: Array.isArray(base.categorias)
            ? normalizarLista(base.categorias)
            : fabrica.categorias,
    };
    (dbRef.periodosHistoricos || []).forEach((p) =>
        registrarValoresNovosPeriodoHistorico(dbRef, p),
    );
}

// Período antigo ganha listas. Nos 16 de fábrica, o campo que nunca existiu
// recebe a classificação do app (casada por nome), e só nessa única vez; os
// outros períodos ficam com `[]`. As listas são saneadas (vazio e repetição
// saem). Precisa rodar DEPOIS de migrarPeriodosHistoricosEmbutidos (é ela que
// renomeia os de fábrica e cria os que faltam). Idempotente.
export function migrarClassificacaoPeriodosHistoricos(periodos) {
    const modelos = new Map(CLASSIFICACAO_DE_FABRICA_PERIODOS_HISTORICOS.map((m) => [m.nome, m]));
    (periodos || []).forEach((p) => {
        const modelo = p.embutido ? modelos.get(p.nome) : null;
        TIPOS_OPCAO_PERIODO_HISTORICO.forEach((campo) => {
            if (Array.isArray(p[campo])) p[campo] = normalizarLista(p[campo]);
            else p[campo] = normalizarLista(modelo ? modelo[campo] : []);
        });
    });
}

// Lista de fábrica/editável + o que já está em uso (nunca some uma opção que
// algum período usa), em ordem alfabética.
export function opcoesDoPeriodoHistorico(dbRef, tipo) {
    if (!TIPOS_OPCAO_PERIODO_HISTORICO.includes(tipo)) return [];
    const lista = dbRef.opcoesPeriodoHistorico?.[tipo] || [];
    const emUso = [];
    (dbRef.periodosHistoricos || []).forEach((p) => emUso.push(...(p[tipo] || [])));
    return normalizarLista([...lista, ...emUso]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Valor digitado que não está na lista entra nela.
export function registrarValoresNovosPeriodoHistorico(dbRef, periodo) {
    if (!dbRef.opcoesPeriodoHistorico) return;
    const op = dbRef.opcoesPeriodoHistorico;
    TIPOS_OPCAO_PERIODO_HISTORICO.forEach((tipo) => {
        op[tipo] = normalizarLista([...(op[tipo] || []), ...(periodo[tipo] || [])]);
    });
}

// Quantos períodos usam o valor.
export function contarUsoOpcaoPeriodoHistorico(dbRef, tipo, valor) {
    if (!TIPOS_OPCAO_PERIODO_HISTORICO.includes(tipo)) return 0;
    const chave = chaveValor(valor);
    return (dbRef.periodosHistoricos || []).filter((p) =>
        (p[tipo] || []).some((v) => chaveValor(v) === chave),
    ).length;
}

// Renomeia na lista e em todos os períodos. Se o novo nome já existe, os dois
// viram um só. Devolve { ok, motivo? }.
export function renomearOpcaoPeriodoHistorico(dbRef, tipo, de, para) {
    if (!TIPOS_OPCAO_PERIODO_HISTORICO.includes(tipo)) return { ok: false, motivo: 'tipo' };
    const novo = String(para ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!novo) return { ok: false, motivo: 'vazio' };
    const chaveAntiga = chaveValor(de);
    const trocar = (lista) =>
        normalizarLista((lista || []).map((v) => (chaveValor(v) === chaveAntiga ? novo : v)));
    if (dbRef.opcoesPeriodoHistorico) {
        dbRef.opcoesPeriodoHistorico[tipo] = trocar(dbRef.opcoesPeriodoHistorico[tipo]);
    }
    (dbRef.periodosHistoricos || []).forEach((p) => {
        p[tipo] = trocar(p[tipo]);
    });
    return { ok: true };
}

// Só remove valor que nenhum período usa. Devolve { ok, motivo?, uso? }.
export function removerOpcaoPeriodoHistorico(dbRef, tipo, valor) {
    if (!TIPOS_OPCAO_PERIODO_HISTORICO.includes(tipo)) return { ok: false, motivo: 'tipo' };
    const uso = contarUsoOpcaoPeriodoHistorico(dbRef, tipo, valor);
    if (uso > 0) return { ok: false, motivo: 'em-uso', uso };
    const chave = chaveValor(valor);
    const op = dbRef.opcoesPeriodoHistorico;
    if (op) op[tipo] = (op[tipo] || []).filter((v) => chaveValor(v) !== chave);
    return { ok: true };
}

// Na mesclagem de dois períodos, o destino fica com a soma das duas listas
// (sem repetir, mantendo a ordem: primeiro as do destino).
export function mesclarClassificacaoDosPeriodosHistoricos(destino, origem) {
    TIPOS_OPCAO_PERIODO_HISTORICO.forEach((tipo) => {
        destino[tipo] = normalizarLista([...(destino[tipo] || []), ...(origem[tipo] || [])]);
    });
}

// ─── Filtro e busca ──────────────────────────────────────────────────────

// Valor do filtro que casa com "período sem esse campo" (o mesmo texto do
// filtro de Região, de propósito: os três selects falam a mesma língua).
export const FILTRO_PERIODO_HISTORICO_SEM_VALOR = '__vazio__';

// Valores distintos usados nos períodos, em ordem alfabética: alimenta o
// select sem oferecer opção que não tem resultado.
export function opcoesDeFiltroDosPeriodosHistoricos(lista, tipo) {
    if (!TIPOS_OPCAO_PERIODO_HISTORICO.includes(tipo)) return [];
    const vistos = new Map();
    (lista || []).forEach((p) =>
        (p[tipo] || []).forEach((v) => {
            const chave = chaveValor(v);
            if (chave && !vistos.has(chave)) vistos.set(chave, v);
        }),
    );
    return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Casamento exato com o valor escolhido. '' = todos;
// FILTRO_PERIODO_HISTORICO_SEM_VALOR = só os que não têm nenhum.
export function filtrarPeriodosHistoricosPorClassificacao(
    lista,
    { esfera = '', categoria = '' } = {},
) {
    const bate = (p, tipo, valor) => {
        if (!valor) return true;
        const valores = p[tipo] || [];
        if (valor === FILTRO_PERIODO_HISTORICO_SEM_VALOR) return valores.length === 0;
        const chave = chaveValor(valor);
        return valores.some((v) => chaveValor(v) === chave);
    };
    return (lista || []).filter(
        (p) => bate(p, 'esferas', esfera) && bate(p, 'categorias', categoria),
    );
}

export function textoBuscaEsferasHistoricas(periodo) {
    return (periodo.esferas || []).join(' ');
}

export function textoBuscaCategoriasHistoricas(periodo) {
    return (periodo.categorias || []).join(' ');
}

// ─── Derivado no texto ───────────────────────────────────────────────────

// Esfera ou Categoria de um texto = soma das dos períodos históricos dele, sem
// repetir (o texto não guarda nada; lê o cadastro, como Tema e Assunto).
export function classificacaoDosPeriodosHistoricosDoTexto(item, cadastro, tipo) {
    if (!TIPOS_OPCAO_PERIODO_HISTORICO.includes(tipo)) return [];
    const lista = cadastro || [];
    return normalizarLista(
        periodosHistoricosIdsDoItem(item, lista).flatMap(
            (id) => lista.find((p) => p.id == id)?.[tipo] || [],
        ),
    );
}
