// ============================================================
// correntes-hierarquia.js — Hierarquia das Correntes literárias
// (cadastro `db.movimentosEscolas`).
//
// Uma corrente pode ter divisões: variantes regionais (Romantismo no
// Brasil e em Portugal), fases ou gerações (as três gerações da poesia
// romântica brasileira) e vertentes (eixos temáticos paralelos, como as
// da prosa). Cada divisão é uma corrente de verdade, com período, postura,
// programa, temas e técnicas próprios, ligada ao pai por `paiId`. Texto e
// Autor se ligam a qualquer registro (pai ou filho) pelos mesmos
// `movimentosEscolasIds` de sempre.
//
// Campos novos em cada registro:
// - `paiId`: id da corrente pai, ou null (corrente de topo).
// - `divisao`: tipo da divisão (DIVISOES_CORRENTE) ou ''. Só vale com pai.
// - `generoDivisao`: 'Poesia' | 'Prosa' | '' (a que gênero a divisão se
//   aplica; vazio = a todos). Só vale com pai.
//
// Funções puras: recebem a lista de correntes (e, onde preciso, o `dbRef`)
// e não mexem em DOM nem em localStorage.
// ============================================================

import { lugaresDaRegiao } from './regiao.js';

export const DIVISOES_CORRENTE = ['Variante regional', 'Fase ou geração', 'Vertente'];

export const DESCRICOES_DIVISAO_CORRENTE = {
    'Variante regional':
        'a mesma corrente em outro lugar, com datas e traços próprios (Romantismo no Brasil e em Portugal).',
    'Fase ou geração': 'um momento da corrente, em sequência no tempo (as gerações do Romantismo).',
    Vertente:
        'um eixo paralelo e temático dentro da corrente, que não é uma fase (as vertentes da prosa romântica).',
};

export const GENEROS_DIVISAO_CORRENTE = ['Poesia', 'Prosa'];

export function normalizarDivisaoCorrente(valor) {
    return DIVISOES_CORRENTE.includes(valor) ? valor : '';
}

export function normalizarGeneroDivisaoCorrente(valor) {
    return GENEROS_DIVISAO_CORRENTE.includes(valor) ? valor : '';
}

const mesmo = (a, b) => a != null && b != null && String(a) === String(b);

function achar(lista, id) {
    if (id == null || id === '') return null;
    return (lista || []).find((m) => mesmo(m.id, id)) || null;
}

// Sugestões do campo de corrente nos modais de Poema, Prosa e Autor: as
// correntes que valem para o `tabela` ('poemas' | 'prosas' | 'autores'), cada
// uma com o rótulo que a situa na árvore. Sem `comparar`, em ordem alfabética;
// com ele, em árvore (ver `ordenarCorrentesEmArvore`), irmãos na ordem dele. Divisão de Poesia some da lista de
// Prosa e vice-versa; sem gênero (ou no Autor) todas aparecem. O rótulo traz o
// caminho dos pais ("Romantismo › Romantismo no Brasil") e, se a divisão se
// aplica a um gênero, ele depois de " · ". Corrente de topo: rótulo vazio.
//
// `somente` separa os dois campos dos modais de Poema e Prosa (Fase 14, etapa
// 2): 'topo' devolve só as correntes sem pai e 'divisoes' só as que têm pai.
// Sem ele, todas (como o modal de Autor, que segue com um campo só).
export function sugestoesDeCorrentes(lista, tabela, comparar = null, somente = null) {
    const excluido = tabela === 'poemas' ? 'Prosa' : tabela === 'prosas' ? 'Poesia' : null;
    const rotuloDe = (m) => {
        const caminho = ancestraisDaCorrente(lista, m.id)
            .reverse()
            .map((a) => a.nome)
            .join(' › ');
        return [caminho, m.generoDivisao || ''].filter(Boolean).join(' · ');
    };
    const validas = (lista || []).filter(
        (m) =>
            (!excluido || m.generoDivisao !== excluido) &&
            (somente === 'topo'
                ? !ehDivisaoDaCorrente(lista, m.id)
                : somente === 'divisoes'
                  ? ehDivisaoDaCorrente(lista, m.id)
                  : true),
    );
    // Sem `comparar`: ordem alfabética. Com ele: em árvore (cada corrente seguida
    // das suas divisões), irmãos na ordem de `comparar`, com `nivel`.
    const emOrdem = comparar
        ? ordenarCorrentesEmArvore(validas, comparar)
        : validas
              .map((m) => ({ m, nivel: 0 }))
              .sort((a, b) => a.m.nome.localeCompare(b.m.nome, 'pt-BR'));
    return emOrdem.map(({ m, nivel }) => ({
        id: m.id,
        nome: m.nome,
        rotulo: rotuloDe(m),
        nivel,
    }));
}

// Rótulo de uma corrente já escolhida (o chip do campo): o nome e, se é uma
// divisão, o caminho dos pais, "Romantismo no Brasil (Romantismo)". Vazio se o
// id não existe em `lista`.
export function rotuloDaCorrente(lista, id) {
    const m = achar(lista, id);
    if (!m) return '';
    const caminho = ancestraisDaCorrente(lista, m.id)
        .reverse()
        .map((a) => a.nome)
        .join(' › ');
    return caminho ? `${m.nome} (${caminho})` : m.nome;
}

// Pai direto (registro) ou null.
export function paiDaCorrente(lista, id) {
    const m = achar(lista, id);
    return m ? achar(lista, m.paiId) : null;
}

export function filhosDaCorrente(lista, id) {
    return (lista || []).filter((m) => m.paiId != null && mesmo(m.paiId, id));
}

// Ids de todos os descendentes (filhos, netos...), sem repetir e sem o
// próprio `id`. Tolera ciclo em dado corrompido (não entra em laço).
export function descendentesDaCorrente(lista, id) {
    const vistos = new Set([String(id)]);
    const resultado = [];
    let fronteira = [id];
    while (fronteira.length) {
        const proxima = [];
        fronteira.forEach((pai) => {
            filhosDaCorrente(lista, pai).forEach((f) => {
                if (vistos.has(String(f.id))) return;
                vistos.add(String(f.id));
                resultado.push(f.id);
                proxima.push(f.id);
            });
        });
        fronteira = proxima;
    }
    return resultado;
}

// Registros dos ancestrais, do pai até a raiz. Tolera ciclo.
export function ancestraisDaCorrente(lista, id) {
    const vistos = new Set([String(id)]);
    const resultado = [];
    let atual = paiDaCorrente(lista, id);
    while (atual && !vistos.has(String(atual.id))) {
        vistos.add(String(atual.id));
        resultado.push(atual);
        atual = paiDaCorrente(lista, atual.id);
    }
    return resultado;
}

// "Romantismo › Romantismo no Brasil › 3ª geração"
export function caminhoDaCorrente(lista, id, separador = ' › ') {
    const m = achar(lista, id);
    if (!m) return '';
    return [...ancestraisDaCorrente(lista, id).reverse(), m].map((x) => x.nome).join(separador);
}

// Caminhos ("Romantismo › Romantismo no Brasil › 3ª geração") das correntes
// de `ids`, na ordem dada, sem os que não existem mais no cadastro.
export function caminhosDasCorrentes(lista, ids) {
    if (!Array.isArray(ids)) return [];
    return ids.map((id) => caminhoDaCorrente(lista, id)).filter(Boolean);
}

// Divisão de corrente é DERIVADA (F14-D6): é a corrente que tem pai que
// existe no cadastro. Nada é gravado, então o texto segue com uma lista só
// (`movimentosEscolasIds`) e a separação entre "Correntes" e "Divisões" é só
// de exibição. Um `paiId` que aponta para registro inexistente não conta
// (a migração já o solta, mas dado cru de backup antigo pode trazê-lo).
export function ehDivisaoDaCorrente(lista, id) {
    return paiDaCorrente(lista, id) !== null;
}

// Ids de `ids` que são correntes de topo (existem no cadastro e não têm pai),
// na ordem dada e sem repetir. Id que não existe mais fica fora.
export function idsDeCorrentesDeTopo(lista, ids) {
    return idsDistintosExistentes(lista, ids).filter((id) => !ehDivisaoDaCorrente(lista, id));
}

// Ids de `ids` que são divisões (corrente com pai), mesma regra acima.
export function idsDeDivisoes(lista, ids) {
    return idsDistintosExistentes(lista, ids).filter((id) => ehDivisaoDaCorrente(lista, id));
}

function idsDistintosExistentes(lista, ids) {
    if (!Array.isArray(ids)) return [];
    const vistos = new Set();
    return ids.filter((id) => {
        if (!achar(lista, id) || vistos.has(String(id))) return false;
        vistos.add(String(id));
        return true;
    });
}

// Ligar `id` ao pai `novoPaiId` fecharia um ciclo? (o pai é o próprio
// registro ou um descendente dele)
export function criaCicloCorrente(lista, id, novoPaiId) {
    if (novoPaiId == null || novoPaiId === '') return false;
    if (mesmo(id, novoPaiId)) return true;
    return descendentesDaCorrente(lista, id).some((d) => mesmo(d, novoPaiId));
}

// Correntes que podem ser pai de `id` (todas menos ele e os descendentes
// dele), em ordem alfabética.
export function opcoesDePaiDaCorrente(lista, id) {
    const proibidos = new Set([String(id), ...descendentesDaCorrente(lista, id).map(String)]);
    return (lista || [])
        .filter((m) => !proibidos.has(String(m.id)))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Valor de `campo` na leitura: o do próprio registro quando preenchido
// (inclusive "Não se aplica", que é uma decisão); senão o do ancestral mais
// próximo que tiver. Nada é gravado. Devolve `{ valor, herdadoDe }`, com
// `herdadoDe` = nome do ancestral ou null.
function valorEfetivo(lista, m, campo, vazio = '') {
    if (!m) return { valor: vazio, herdadoDe: null };
    if (preenchido(m[campo])) return { valor: m[campo], herdadoDe: null };
    const ancestral = ancestraisDaCorrente(lista, m.id).find((a) => preenchido(a[campo]));
    return ancestral
        ? { valor: ancestral[campo], herdadoDe: ancestral.nome }
        : { valor: vazio, herdadoDe: null };
}

// Lista vazia conta como "sem valor" (um array vazio é truthy em JS).
function preenchido(v) {
    return Array.isArray(v) ? v.length > 0 : !!v;
}

export function posturaEfetivaDaCorrente(lista, m) {
    return valorEfetivo(lista, m, 'posturaEstetica');
}

export function programaEfetivoDaCorrente(lista, m) {
    return valorEfetivo(lista, m, 'programa');
}

export function tipoEfetivoDaCorrente(lista, m) {
    return valorEfetivo(lista, m, 'tipo');
}

export function regiaoEfetivaDaCorrente(lista, m) {
    return valorEfetivo(lista, m, 'regiaoOrigem', []);
}

// ─── Filtro por atributos (Tipo, Região, Programa, Postura) ──────────────
// Valor do filtro que casa com "campo sem valor" (Tipo não especificado,
// Programa/Postura não preenchidos, corrente sem região).
export const FILTRO_CORRENTE_VAZIO = '__vazio__';

// A Região é uma lista de lugares (ver regiao.js). `lugaresDaRegiao` segue
// exportada daqui para quem já a importava; aceita também o texto antigo
// com barras ("Brasil/Portugal").
export { lugaresDaRegiao };

// Lugares distintos usados no cadastro (já com a herança), em ordem
// alfabética: alimenta o select de Região sem oferecer opção sem resultado.
export function opcoesDeRegiaoDasCorrentes(lista) {
    const lugares = new Set();
    (lista || []).forEach((m) => {
        lugaresDaRegiao(regiaoEfetivaDaCorrente(lista, m).valor).forEach((l) => lugares.add(l));
    });
    return [...lugares].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function casaValor(efetivo, filtro) {
    if (!filtro) return true;
    return filtro === FILTRO_CORRENTE_VAZIO ? !efetivo : efetivo === filtro;
}

export function filtroDeAtributosAtivo(filtros) {
    const f = filtros || {};
    return !!(f.tipo || f.regiao || f.programa || f.postura);
}

// Aplica Tipo, Região, Programa e Postura (em E) sobre `candidatas`, lendo
// os valores efetivos na lista completa `lista` (a divisão sem valor próprio
// vale pelo do pai). Devolve `{ passam, contexto }`: as correntes que passam
// e os ancestrais delas que não passam, para a árvore continuar legível
// (`contexto` vem na ordem da lista, sem repetir, e só com ancestral que
// existe em `lista`).
export function filtrarCorrentesPorAtributos(lista, candidatas, filtros) {
    const f = filtros || {};
    if (!filtroDeAtributosAtivo(f)) return { passam: [...(candidatas || [])], contexto: [] };
    const passam = (candidatas || []).filter((m) => {
        if (!casaValor(tipoEfetivoDaCorrente(lista, m).valor, f.tipo)) return false;
        if (!casaValor(programaEfetivoDaCorrente(lista, m).valor, f.programa)) return false;
        if (!casaValor(posturaEfetivaDaCorrente(lista, m).valor, f.postura)) return false;
        if (f.regiao) {
            const lugares = lugaresDaRegiao(regiaoEfetivaDaCorrente(lista, m).valor);
            if (f.regiao === FILTRO_CORRENTE_VAZIO) return lugares.length === 0;
            return lugares.includes(f.regiao);
        }
        return true;
    });
    return { passam, contexto: ancestraisForaDe(lista, passam) };
}

// Ancestrais das correntes de `passam` que não estão em `passam`, na ordem
// da lista e sem repetir: o contexto que mantém a árvore legível quando um
// filtro (nome, período ou atributos) tira o pai e deixa a divisão. Só conta
// ancestral que existe em `lista`.
export function ancestraisForaDe(lista, passam) {
    const idsPassam = new Set((passam || []).map((m) => String(m.id)));
    const idsContexto = new Set();
    (passam || []).forEach((m) => {
        ancestraisDaCorrente(lista, m.id).forEach((a) => {
            if (!idsPassam.has(String(a.id))) idsContexto.add(String(a.id));
        });
    });
    return (lista || []).filter((m) => idsContexto.has(String(m.id)));
}

// ─── Período efetivo (filtro De/Até) ─────────────────────────────────────
// Uma divisão sem data própria vale, no intervalo De/Até, pelo período do
// ancestral mais próximo que tenha data (nada é gravado). `temData` diz se um
// registro tem período (`periodoTemData` de utils.js, injetado para este
// módulo seguir sem dependências). Devolve o registro cujo período vale, ou
// null quando nem a corrente nem os ancestrais têm data.
export function periodoEfetivoDaCorrente(lista, m, temData) {
    if (!m) return null;
    if (temData(m)) return m;
    return ancestraisDaCorrente(lista, m.id).find((a) => temData(a)) || null;
}

// ─── Postura e Programa de um texto ou autor ─────────────────────────────
// Valores efetivos (com a herança do pai) das correntes ligadas a `ids`,
// distintos e na ordem dos vínculos. "Não se aplica" conta como valor (é uma
// decisão registrada); vazio que não herda nada não entra.
function valoresDasCorrentes(lista, ids, campo) {
    const vistos = new Set();
    const valores = [];
    (ids || []).forEach((id) => {
        const m = achar(lista, id);
        if (!m) return;
        const { valor } = valorEfetivo(lista, m, campo);
        if (valor && !vistos.has(valor)) {
            vistos.add(valor);
            valores.push(valor);
        }
    });
    return valores;
}

export function posturasDasCorrentes(lista, ids) {
    return valoresDasCorrentes(lista, ids, 'posturaEstetica');
}

export function programasDasCorrentes(lista, ids) {
    return valoresDasCorrentes(lista, ids, 'programa');
}

// Põe a lista em ordem de árvore: cada corrente de topo seguida das suas
// divisões (recuadas por `nivel`). `comparar` ordena irmãos. Uma corrente
// cujo pai não está na lista (filtrada fora, por exemplo) entra como topo,
// e um ciclo corrompido não prende nem some com ninguém.
// Devolve `[{ m, nivel }]`.
export function ordenarCorrentesEmArvore(lista, comparar) {
    const presentes = new Map((lista || []).map((m) => [String(m.id), m]));
    const filhosDe = new Map();
    const topo = [];
    (lista || []).forEach((m) => {
        const paiPresente = m.paiId != null && presentes.has(String(m.paiId));
        if (paiPresente && !mesmo(m.paiId, m.id)) {
            const chave = String(m.paiId);
            if (!filhosDe.has(chave)) filhosDe.set(chave, []);
            filhosDe.get(chave).push(m);
        } else {
            topo.push(m);
        }
    });

    const saida = [];
    const jaIncluidos = new Set();
    const descer = (m, nivel) => {
        if (jaIncluidos.has(String(m.id))) return;
        jaIncluidos.add(String(m.id));
        saida.push({ m, nivel });
        (filhosDe.get(String(m.id)) || [])
            .slice()
            .sort(comparar)
            .forEach((f) => descer(f, nivel + 1));
    };
    topo.slice()
        .sort(comparar)
        .forEach((m) => descer(m, 0));
    // Ciclo (A pai de B, B pai de A): ninguém é topo; inclui o que sobrou.
    (lista || []).forEach((m) => descer(m, 0));
    return saida;
}

// Autores, poemas e prosas ligados à corrente `id`. Com `comDivisoes`, soma
// também os ligados a qualquer divisão dela (cada item conta uma vez).
export function impactoDaCorrente(dbRef, id, { comDivisoes = false } = {}) {
    const ids = new Set([String(id)]);
    if (comDivisoes) {
        descendentesDaCorrente(dbRef.movimentosEscolas, id).forEach((d) => ids.add(String(d)));
    }
    const acha = (item) => (item.movimentosEscolasIds || []).some((x) => ids.has(String(x)));
    return {
        autoresIds: (dbRef.autores || []).filter(acha).map((a) => a.id),
        poemasIds: (dbRef.poemas || []).filter(acha).map((p) => p.id),
        prosasIds: (dbRef.prosas || []).filter(acha).map((p) => p.id),
    };
}

// Nomes de busca das correntes ligadas a um texto ou autor (`ids`). Com
// `comAncestrais`, cada corrente traz junto os nomes de todos os seus
// ancestrais: um texto ligado à "3ª geração: Condoreira (Brasil)" também
// acha por "Romantismo no Brasil" e por "Romantismo", mas não por
// "Romantismo em Portugal". Sem repetição, na ordem em que aparecem.
export function nomesDeBuscaDasCorrentes(lista, ids, { comAncestrais = false } = {}) {
    const vistos = new Set();
    const nomes = [];
    const somar = (m) => {
        if (!m || vistos.has(String(m.id))) return;
        vistos.add(String(m.id));
        if (m.nome) nomes.push(m.nome);
    };
    (ids || []).forEach((id) => {
        const m = achar(lista, id);
        somar(m);
        if (m && comAncestrais) ancestraisDaCorrente(lista, id).forEach(somar);
    });
    return nomes;
}

// Saneia a hierarquia de uma lista (migração e importação de backup):
// normaliza `divisao` e `generoDivisao`, e solta o `paiId` que aponta para
// registro inexistente, para si mesmo ou que fecha ciclo. Divisão e gênero só
// valem com pai, então são zerados em quem não tem.
export function sanearHierarquiaDeCorrentes(lista) {
    (lista || []).forEach((m) => {
        if (m.paiId === undefined || m.paiId === '') m.paiId = null;
        if (m.paiId != null && (mesmo(m.paiId, m.id) || !achar(lista, m.paiId))) m.paiId = null;
    });
    (lista || []).forEach((m) => {
        // Ciclo (de qualquer tamanho): o pai de alguém do ciclo é descendente
        // dele. O primeiro do ciclo a ser visto vira topo e desfaz o laço.
        if (m.paiId != null && criaCicloCorrente(lista, m.id, m.paiId)) m.paiId = null;
        m.divisao = m.paiId == null ? '' : normalizarDivisaoCorrente(m.divisao);
        m.generoDivisao = m.paiId == null ? '' : normalizarGeneroDivisaoCorrente(m.generoDivisao);
    });
}
