// ============================================================
// periodos-biograficos-hierarquia.js: "Faz parte de" entre Períodos
// Biográficos (cadastro `db.epocas`).
//
// Um período pode estar dentro de outro: "Pré-vestibular" faz parte de
// "Ensino médio". Cada um continua sendo um período de verdade, com datas,
// esferas, pessoas e textos próprios. `pertenceA` é uma lista de ids de pais
// (o primeiro é o principal), igual ao Período Histórico.
//
// As peças de grafo (pais, filhos, ancestrais, descendentes, ciclo, caminho,
// ordem em árvore, mesclar, excluir) são as mesmas do Histórico e valem para
// qualquer lista de `{ id, nome, pertenceA }`; este módulo só as reexporta e
// acrescenta o que é próprio do biográfico:
//
// - Regra de intervalo: filho e pai precisam SE SOBREPOR no tempo. O filho
//   pode começar antes do pai e terminar depois dele, mas não pode começar
//   depois do fim do pai nem terminar antes do começo dele. É mais branda que
//   a contenção do Histórico (`paisQueNaoContem`).
// - Regra de autor: os autores do filho precisam estar entre os de cada pai.
//   Hoje um período tem um autor só (`autorId`), então equivale a "mesmo
//   autor"; passa tudo por `autoresDoPeriodo`, para quando um período puder
//   ter vários autores só essa função mudar.
// - Intervalo derivado: pai sem datas mostra, só na tela, o que os períodos
//   de dentro cobrem (nunca é gravado).
//
// Funções puras: recebem a lista e não mexem em DOM nem em localStorage.
// ============================================================

import {
    paisDoPeriodo,
    filhosDoPeriodo,
    descendentesDoPeriodo,
    opcoesDePaiDoPeriodo,
    ordenarPeriodosEmArvore,
    caminhoDosAncestraisDoPeriodo,
} from './periodos-historicos-hierarquia.js';

export {
    paisDoPeriodo,
    filhosDoPeriodo,
    ancestraisDoPeriodo,
    descendentesDoPeriodo,
    caminhoDoPeriodo,
    caminhoDosAncestraisDoPeriodo,
    criaCicloPeriodo,
    opcoesDePaiDoPeriodo,
    ancestraisForaDoPeriodo,
    ordenarPeriodosEmArvore,
    sanearHierarquiaDePeriodos,
    mesclarHierarquiaDePeriodos,
    destinoDosFilhosAoExcluir,
    retirarPeriodoDaHierarquia,
} from './periodos-historicos-hierarquia.js';

const mesmo = (a, b) => a != null && b != null && String(a) === String(b);

function achar(lista, id) {
    if (id == null || id === '') return null;
    return (lista || []).find((p) => mesmo(p.id, id)) || null;
}

// ─── Autor ───────────────────────────────────────────────────────────────

// Autores do período. Hoje é um só (`autorId`); é o único ponto que muda
// quando um período puder ter vários.
export function autoresDoPeriodo(periodo) {
    const id = periodo?.autorId;
    return id == null || id === '' ? [] : [id];
}

// Os autores de `filho` estão todos entre os de `pai`? (Sem autor, vale.)
export function autoresCabemNoPai(filho, pai) {
    const doPai = autoresDoPeriodo(pai).map(String);
    return autoresDoPeriodo(filho).every((a) => doPai.includes(String(a)));
}

// ─── Intervalo ───────────────────────────────────────────────────────────

// Número comparável de uma data parcial `{ dia, mes, ano, aprox }` no extremo
// pedido: 'inicio' assume o menor valor possível nos campos em branco, 'fim'
// o maior. Com `soAno`, só o ano conta. Sem ano, não dá para posicionar: null.
function chave(d, extremo, soAno) {
    if (!d || d.ano == null) return null;
    const inicio = extremo === 'inicio';
    const mes = soAno ? (inicio ? 1 : 12) : (d.mes ?? (inicio ? 1 : 12));
    const dia = soAno ? (inicio ? 1 : 31) : (d.dia ?? (inicio ? 1 : 31));
    return d.ano * 10000 + mes * 100 + dia;
}

// `a` e `b` são `{ inicio, fim }` (datas parciais, `fim` ausente = em aberto,
// vale como infinito). Devolve null quando se sobrepõem (ou não dá para
// dizer), 'depois' quando `a` começa depois do fim de `b` e 'antes' quando
// `a` termina antes do começo de `b`. Só acusa quando nenhuma combinação dos
// campos em branco tornaria os dois compatíveis; encostar (mesmo ano) conta
// como sobrepor. Data marcada "c." (de qualquer lado) compara só o ano.
// Período sem data nenhuma, ou lado sem o limite em questão, nunca é acusado.
export function ordemSemSobreposicao(a, b) {
    const soAno = (x, y) => Boolean(x?.aprox || y?.aprox);
    const iniA = chave(a?.inicio, 'inicio', soAno(a?.inicio, b?.fim));
    const fimB = chave(b?.fim, 'fim', soAno(a?.inicio, b?.fim));
    if (iniA != null && fimB != null && iniA > fimB) return 'depois';
    const fimA = chave(a?.fim, 'fim', soAno(a?.fim, b?.inicio));
    const iniB = chave(b?.inicio, 'inicio', soAno(a?.fim, b?.inicio));
    if (fimA != null && iniB != null && fimA < iniB) return 'antes';
    return null;
}

// ─── Validação do "Faz parte de" ─────────────────────────────────────────

// Pais de `idsPais` com os quais `filho` (dados avulsos `{ inicio, fim,
// autorId }`, para servir ao modal antes de salvar) não pode ficar. Um item
// por pai: `{ paiId, motivo }`, com motivo 'autor' (o pai não tem o autor do
// filho), 'depois' (o filho começa depois do fim do pai) ou 'antes' (o filho
// termina antes do começo do pai). Com vários pais, cada um conta.
export function paisInvalidosParaOFilho(lista, filho, idsPais) {
    const saida = [];
    const vistos = new Set();
    (idsPais || []).forEach((paiId) => {
        const k = String(paiId);
        if (vistos.has(k)) return;
        vistos.add(k);
        const pai = achar(lista, paiId);
        if (!pai) return;
        if (!autoresCabemNoPai(filho, pai)) {
            saida.push({ paiId: pai.id, motivo: 'autor' });
            return;
        }
        const motivo = ordemSemSobreposicao(filho, pai);
        if (motivo) saida.push({ paiId: pai.id, motivo });
    });
    return saida;
}

// Filhos diretos de `idPai` que deixariam de caber nele se o pai passasse a
// ter os dados `paiNovo` (`{ inicio, fim, autorId }`): usado ao editar as
// datas ou o autor de um período que já tem períodos dentro. Um item por
// filho: `{ filhoId, motivo }`, mesmos motivos acima ('depois' e 'antes' são
// do ponto de vista do filho).
export function filhosInvalidosParaOPai(lista, idPai, paiNovo) {
    const saida = [];
    filhosDoPeriodo(lista, idPai).forEach((filhoId) => {
        const filho = achar(lista, filhoId);
        if (!filho) return;
        if (!autoresCabemNoPai(filho, paiNovo)) {
            saida.push({ filhoId, motivo: 'autor' });
            return;
        }
        const motivo = ordemSemSobreposicao(filho, paiNovo);
        if (motivo) saida.push({ filhoId, motivo });
    });
    return saida;
}

// Períodos que podem ser pai de `filho` (`{ id, autorId }`, id ausente se for
// novo): todos menos ele, os de dentro dele e os que não têm o autor dele.
// Em árvore, `[{ m, nivel }]`, na ordem de `comparar` (para o seletor seguir a
// ordem e o recuo da aba). A regra de intervalo não filtra aqui: depende das
// datas digitadas, e é conferida ao salvar.
export function opcoesDePaiBiografico(lista, filho, comparar) {
    const possiveis = opcoesDePaiDoPeriodo(lista, filho?.id).filter((p) =>
        autoresCabemNoPai(filho, p),
    );
    return ordenarPeriodosEmArvore(possiveis, comparar);
}

// ─── Escolha do período num texto (campo com sugestões) ──────────────────

// Opções do campo "Período Biográfico Retratado" dos textos, em árvore (o
// filho logo depois do pai, na ordem de `comparar`), cada uma como
// `{ id, nome, nivel, caminho, rotulo }`:
// - `caminho`: de onde o período está, "Relação com X › Fase 1" (vazio no
//   topo). É lido em `lista` (o cadastro inteiro, para não perder pai oculto
//   ou de fora das sugestões); `candidatos` é o que entra nas opções.
// - `rotulo`: o que preenche o campo, só o nome. Nome repetido entre as
//   opções ganha o caminho entre parênteses e, se ainda repetir, " #id".
export function opcoesDeEscolhaDoPeriodoBiografico(lista, candidatos, comparar) {
    const base = ordenarPeriodosEmArvore(candidatos, comparar).map(({ m, nivel }) => ({
        id: m.id,
        nome: m.nome,
        nivel,
        caminho: caminhoDosAncestraisDoPeriodo(lista, m.id),
    }));
    const contar = (valorDe) => {
        const n = new Map();
        base.forEach((o) => n.set(valorDe(o), (n.get(valorDe(o)) || 0) + 1));
        return n;
    };
    const porNome = contar((o) => o.nome);
    const comCaminho = (o) =>
        porNome.get(o.nome) > 1 && o.caminho ? `${o.nome} (${o.caminho})` : o.nome;
    const porRotulo = contar(comCaminho);
    return base.map((o) => {
        const rotulo = comCaminho(o);
        return { ...o, rotulo: porRotulo.get(rotulo) > 1 ? `${rotulo} #${o.id}` : rotulo };
    });
}

// Rótulo de um período já escolhido (o chip do campo): o nome e, se ele está
// dentro de outro, o caminho de onde fica, "Fase 1 (Relação com X)". Vazio se o
// id não existe em `lista`.
export function rotuloDoPeriodoBiografico(lista, id) {
    const p = achar(lista, id);
    if (!p) return '';
    const caminho = caminhoDosAncestraisDoPeriodo(lista, p.id);
    return caminho ? `${p.nome} (${caminho})` : p.nome;
}

// Caminho de exibição de um período, da raiz até ele, pelo pai principal:
// "Ensino médio › Pré-vestibular". Período oculto não vaza o nome: ele próprio
// vira só `rotuloOculto`, e um ancestral oculto vira `rotuloOculto` no meio do
// caminho. Com `incluirOculto` (opção "Exibir ocultas"/"Incluir ocultados") os
// nomes reais saem. Vazio se o id não existe em `lista`.
export function caminhoExibivelDoPeriodoBiografico(
    lista,
    id,
    { incluirOculto = false, rotuloOculto = '(período oculto)' } = {},
) {
    const folha = achar(lista, id);
    if (!folha) return '';
    if (folha.oculto && !incluirOculto) return rotuloOculto;
    const nomes = [];
    const vistos = new Set();
    let atual = folha;
    while (atual && !vistos.has(String(atual.id))) {
        vistos.add(String(atual.id));
        nomes.unshift(atual.oculto && !incluirOculto ? rotuloOculto : atual.nome);
        const pai = paisDoPeriodo(lista, atual.id)[0];
        atual = pai == null ? null : achar(lista, pai);
    }
    return nomes.join(' › ');
}

// Texto do campo -> período: `{ id }` (achou) ou `{ id: null, novo: true }`
// (nome que não existe, vira período novo ao salvar o texto) ou `{ id: null }`
// (campo vazio). Ordem: o rótulo exato de uma opção; o nome puro entre as
// opções (a primeira em árvore); o nome puro entre os `preferidos` (períodos
// dos Autores do texto, inclusive ocultos); o nome puro em qualquer período.
export function resolverPeriodoBiograficoPorRotulo(lista, texto, extras = {}) {
    const t = String(texto ?? '').trim();
    if (!t) return { id: null };
    const { candidatos, preferidos, comparar } = extras;
    const opcoes = opcoesDeEscolhaDoPeriodoBiografico(lista, candidatos ?? lista, comparar);
    const achado =
        opcoes.find((o) => o.rotulo === t) ||
        opcoes.find((o) => o.nome === t) ||
        (preferidos || []).find((p) => p.nome === t) ||
        (lista || []).find((p) => p.nome === t);
    return achado ? { id: achado.id } : { id: null, novo: true };
}

// ─── Intervalo derivado (só para mostrar) ────────────────────────────────

// O que os períodos de dentro de `id` cobrem, do começo mais cedo ao fim mais
// tarde, como `{ inicio, fim }` (as próprias datas parciais dos filhos, sem
// copiar). Se algum período de dentro tem começo e não tem fim, o conjunto
// está em aberto e `fim` fica null. Sem nenhuma data nos de dentro: null.
export function intervaloDerivadoDoPeriodo(lista, id) {
    let inicio = null;
    let fim = null;
    let emAberto = false;
    descendentesDoPeriodo(lista, id).forEach((dId) => {
        const d = achar(lista, dId);
        if (!d) return;
        const ini = chave(d.inicio, 'inicio') != null ? d.inicio : d.fim;
        if (
            chave(ini, 'inicio') != null &&
            (!inicio || chave(ini, 'inicio') < chave(inicio, 'inicio'))
        ) {
            inicio = ini;
        }
        if (chave(d.fim, 'fim') != null) {
            if (!fim || chave(d.fim, 'fim') > chave(fim, 'fim')) fim = d.fim;
        } else if (chave(d.inicio, 'inicio') != null) {
            emAberto = true;
        }
    });
    if (!inicio && !fim) return null;
    return { inicio, fim: emAberto ? null : fim };
}

// Datas que valem para posicionar e mostrar o período: as próprias, se tem
// alguma; senão as derivadas dos de dentro. `derivado` diz qual dos dois.
export function datasEfetivasDoPeriodo(lista, periodo) {
    const proprio = chave(periodo?.inicio, 'inicio') != null || chave(periodo?.fim, 'fim') != null;
    if (proprio)
        return { inicio: periodo.inicio ?? null, fim: periodo.fim ?? null, derivado: false };
    const derivado = periodo ? intervaloDerivadoDoPeriodo(lista, periodo.id) : null;
    if (derivado) return { ...derivado, derivado: true };
    return { inicio: null, fim: null, derivado: false };
}

// ─── Ordem ───────────────────────────────────────────────────────────────

// Comparador de irmãos para `ordenarPeriodosEmArvore`. 'cronologica' põe pela
// data de começo completa (ano, mês e dia; campo em branco vale o menor
// valor), ou pela de fim, se faltar o começo, usando as datas efetivas: pai
// sem data vai pela data do mais antigo dos de dentro. Mesmo começo: termina
// antes vem primeiro e período em aberto vem por último. Sem nenhuma data,
// vai para o fim; empate total (e o modo alfabético) desempata pelo nome.
// `lista` é a lista em que a hierarquia é lida (a que a tela mostra).
export function criarComparadorDeEpocas(lista, modo = 'cronologica') {
    const porNome = (a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR');
    if (modo !== 'cronologica') return porNome;
    const chaves = new Map();
    const chavesDe = (p) => {
        const k = String(p.id);
        if (!chaves.has(k)) {
            const d = datasEfetivasDoPeriodo(lista, p);
            const comeco = chave(d.inicio, 'inicio') ?? chave(d.fim, 'fim');
            const termino = chave(d.fim, 'fim') ?? Infinity; // em aberto: por último
            chaves.set(k, { comeco, termino });
        }
        return chaves.get(k);
    };
    return (a, b) => {
        const ca = chavesDe(a);
        const cb = chavesDe(b);
        if (ca.comeco == null && cb.comeco == null) return porNome(a, b);
        if (ca.comeco == null) return 1;
        if (cb.comeco == null) return -1;
        if (ca.comeco !== cb.comeco) return ca.comeco - cb.comeco;
        if (ca.termino !== cb.termino) return ca.termino < cb.termino ? -1 : 1;
        return porNome(a, b);
    };
}
