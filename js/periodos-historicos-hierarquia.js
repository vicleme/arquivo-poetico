// ============================================================
// periodos-historicos-hierarquia.js — Hierarquia dos Períodos Históricos
// (cadastro `db.periodosHistoricos`).
//
// Um período pode estar dentro de outro: o Segundo mandato do governo
// Dilma Rousseff está dentro do Governo Dilma Rousseff, que está dentro
// da Nova República. Cada um é um período de verdade, com datas, região
// e notas próprias. O texto se liga ao período mais específico
// (`periodoHistoricoId`, como sempre) e os ancestrais aparecem pelo
// caminho e pela busca.
//
// Mesmo desenho de Locais (ver locais.js): `pertenceA` é uma lista de
// ids de pais e o primeiro é o principal (o caminho exibido segue por
// ele). Quase sempre há um pai só; a lista existe para o caso de um
// período caber em dois recortes ao mesmo tempo.
//
// Funções puras: recebem a lista de períodos e não mexem em DOM nem em
// localStorage.
// ============================================================

const mesmo = (a, b) => a != null && b != null && String(a) === String(b);

function achar(lista, id) {
    if (id == null || id === '') return null;
    return (lista || []).find((p) => mesmo(p.id, id)) || null;
}

function semRepetir(ids) {
    const vistos = new Set();
    return (ids || []).filter((id) => {
        const k = String(id);
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
    });
}

// Ids dos pais do período, na ordem gravada (o primeiro é o principal),
// só os que existem no cadastro e nunca o próprio período.
export function paisDoPeriodo(lista, id) {
    const p = achar(lista, id);
    if (!p || !Array.isArray(p.pertenceA)) return [];
    return semRepetir(p.pertenceA).filter((x) => achar(lista, x) && !mesmo(x, id));
}

// Filhos diretos (quem lista `id` em pertenceA), na ordem do cadastro.
export function filhosDoPeriodo(lista, id) {
    return (lista || [])
        .filter((p) => paisDoPeriodo(lista, p.id).some((x) => mesmo(x, id)))
        .map((p) => p.id);
}

// Todos os ancestrais, por qualquer caminho, sem repetir, do mais próximo
// ao mais distante. Não inclui o próprio período. Tolera ciclo.
export function ancestraisDoPeriodo(lista, id) {
    const vistos = new Set([String(id)]);
    const saida = [];
    let fila = [id];
    while (fila.length) {
        const proxima = [];
        fila.forEach((atual) => {
            paisDoPeriodo(lista, atual).forEach((p) => {
                if (vistos.has(String(p))) return;
                vistos.add(String(p));
                saida.push(p);
                proxima.push(p);
            });
        });
        fila = proxima;
    }
    return saida;
}

// Todos os descendentes, por qualquer caminho, sem repetir. Não inclui o
// próprio período. Tolera ciclo.
export function descendentesDoPeriodo(lista, id) {
    const filhos = new Map();
    (lista || []).forEach((p) => {
        paisDoPeriodo(lista, p.id).forEach((pai) => {
            const k = String(pai);
            if (!filhos.has(k)) filhos.set(k, []);
            filhos.get(k).push(p.id);
        });
    });
    const vistos = new Set([String(id)]);
    const saida = [];
    let fila = [id];
    while (fila.length) {
        const proxima = [];
        fila.forEach((atual) => {
            (filhos.get(String(atual)) || []).forEach((f) => {
                if (vistos.has(String(f))) return;
                vistos.add(String(f));
                saida.push(f);
                proxima.push(f);
            });
        });
        fila = proxima;
    }
    return saida;
}

// Caminho canônico, da raiz até o período, sempre pelo primeiro pai:
// "Nova República › Governo Dilma Rousseff › Segundo mandato".
export function caminhoDoPeriodo(lista, id, separador = ' › ') {
    const nomes = [];
    const vistos = new Set();
    let atual = achar(lista, id);
    while (atual && !vistos.has(String(atual.id))) {
        vistos.add(String(atual.id));
        nomes.unshift(atual.nome);
        const pai = paisDoPeriodo(lista, atual.id)[0];
        atual = pai == null ? null : achar(lista, pai);
    }
    return nomes.join(separador);
}

// Só os ancestrais pelo caminho principal, da raiz até o pai direto (sem o
// próprio período). Usado para mostrar o contexto de onde o período está.
export function caminhoDosAncestraisDoPeriodo(lista, id, separador = ' › ') {
    const nomes = [];
    const vistos = new Set([String(id)]);
    let pai = paisDoPeriodo(lista, id)[0];
    while (pai != null && !vistos.has(String(pai))) {
        vistos.add(String(pai));
        const reg = achar(lista, pai);
        if (!reg) break;
        nomes.unshift(reg.nome);
        pai = paisDoPeriodo(lista, reg.id)[0];
    }
    return nomes.join(separador);
}

// Ligar `id` a `novosPais` fecharia um ciclo? (algum pai é o próprio
// período ou um descendente dele)
export function criaCicloPeriodo(lista, id, novosPais) {
    const desc = new Set(descendentesDoPeriodo(lista, id).map(String));
    return (novosPais || []).some((p) => mesmo(p, id) || desc.has(String(p)));
}

// Períodos que podem ser pai de `id` (todos menos ele e os descendentes
// dele), em ordem alfabética.
export function opcoesDePaiDoPeriodo(lista, id) {
    const proibidos = new Set([String(id), ...descendentesDoPeriodo(lista, id).map(String)]);
    return (lista || [])
        .filter((p) => !proibidos.has(String(p.id)))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// As mesmas opções de `opcoesDePaiDoPeriodo`, em árvore (cada período seguido
// dos de dentro), como `[{ m, nivel }]`, para o select de "Pertence a" seguir
// a ordem e o recuo da lista de Períodos Históricos. `comparar` ordena irmãos.
export function opcoesDePaiEmArvore(lista, id, comparar) {
    return ordenarPeriodosEmArvore(opcoesDePaiDoPeriodo(lista, id), comparar);
}

// Nomes para a busca de um texto ligado aos períodos `ids`. Com
// `comAncestrais`, entram também os nomes de quem contém o período
// (buscar "Nova República" acha o texto do Segundo mandato). Sem isso,
// só o próprio período (consulta "direta").
export function nomesDeBuscaDosPeriodos(lista, ids, { comAncestrais = false } = {}) {
    const alvos = Array.isArray(ids) ? ids : ids == null || ids === '' ? [] : [ids];
    const vistos = new Set();
    const nomes = [];
    const incluir = (id) => {
        const k = String(id);
        if (vistos.has(k)) return;
        vistos.add(k);
        const reg = achar(lista, id);
        if (reg?.nome) nomes.push(reg.nome);
    };
    alvos.forEach((id) => {
        incluir(id);
        if (comAncestrais) ancestraisDoPeriodo(lista, id).forEach(incluir);
    });
    return nomes;
}

// ─── Datas ──────────────────────────────────────────────────────────────

// Instante (ano/mês/dia) de uma data parcial no extremo pedido: 'inicio'
// assume o menor valor possível nos campos em branco, 'fim' o maior. Sem
// ano, não dá para posicionar: null.
function instante(d, extremo) {
    if (!d || d.ano == null) return null;
    const mes = d.mes ?? (extremo === 'inicio' ? 1 : 12);
    const ultimoDia = new Date(d.ano, mes, 0).getDate();
    const dia = d.dia ?? (extremo === 'inicio' ? 1 : ultimoDia);
    return new Date(d.ano, mes - 1, dia).getTime();
}

// Pais cujo intervalo COM CERTEZA não contém o período `filho` (dados
// avulsos `{ inicio, fim }`, para servir ao modal antes de salvar). Só
// acusa quando nenhuma combinação dos campos em branco tornaria os dois
// compatíveis, como violaOrdemDeDatas em utils.js, e cala quando o limite
// em questão está marcado "c.". Período sem data, ou
// pai sem data, nunca é acusado. Um período pontual (sem `fim`) conta
// como começando e terminando na data do `inicio`.
export function paisQueNaoContem(lista, filho, idsPais) {
    const iniFilhoMax = instante(filho?.inicio, 'fim');
    const fimFilhoMin = instante(filho?.fim ?? filho?.inicio, 'inicio');
    return semRepetir(idsPais).filter((idPai) => {
        const pai = achar(lista, idPai);
        if (!pai) return false;
        const iniPaiMin = instante(pai.inicio, 'inicio');
        const fimPaiMax = pai.fim ? instante(pai.fim, 'fim') : null;
        // Um limite marcado "c." (de um lado ou do outro) é aproximado ou
        // convencional: "c. 1870" dentro de "1871" não é erro.
        const inicioAprox = Boolean(filho?.inicio?.aprox || pai.inicio?.aprox);
        const fimAprox = Boolean((filho?.fim ?? filho?.inicio)?.aprox || pai.fim?.aprox);
        const comecaAntes =
            !inicioAprox && iniFilhoMax != null && iniPaiMin != null && iniFilhoMax < iniPaiMin;
        const terminaDepois =
            !fimAprox && fimFilhoMin != null && fimPaiMax != null && fimFilhoMin > fimPaiMax;
        return comecaAntes || terminaDepois;
    });
}

// Períodos de fora de `passam` (os que passaram no filtro) que são ancestrais
// de algum deles, na ordem do cadastro. A lista os mostra apagados, só como
// contexto, para a árvore não perder o fio quando o filtro esconde o pai.
export function ancestraisForaDoPeriodo(lista, passam) {
    const idsPassam = new Set((passam || []).map((p) => String(p.id)));
    const idsContexto = new Set();
    (passam || []).forEach((p) => {
        ancestraisDoPeriodo(lista, p.id).forEach((a) => {
            if (!idsPassam.has(String(a))) idsContexto.add(String(a));
        });
    });
    return (lista || []).filter((p) => idsContexto.has(String(p.id)));
}

// ─── Ordem em árvore ─────────────────────────────────────────────────────

// Lista plana `[{ m, nivel }]`: cada período seguido dos seus filhos,
// recuados. Com vários pais, o período aparece sob o principal (o
// primeiro que estiver na lista). Quem não tem pai na lista é de topo.
// `comparar` ordena irmãos.
export function ordenarPeriodosEmArvore(lista, comparar) {
    const presentes = new Set((lista || []).map((p) => String(p.id)));
    const filhosDe = new Map();
    const topo = [];
    (lista || []).forEach((p) => {
        const pai = paisDoPeriodo(lista, p.id).find((x) => presentes.has(String(x)));
        if (pai != null) {
            const k = String(pai);
            if (!filhosDe.has(k)) filhosDe.set(k, []);
            filhosDe.get(k).push(p);
        } else {
            topo.push(p);
        }
    });
    const saida = [];
    const incluidos = new Set();
    const descer = (p, nivel) => {
        if (incluidos.has(String(p.id))) return;
        incluidos.add(String(p.id));
        saida.push({ m: p, nivel });
        (filhosDe.get(String(p.id)) || [])
            .slice()
            .sort(comparar)
            .forEach((f) => descer(f, nivel + 1));
    };
    topo.slice()
        .sort(comparar)
        .forEach((p) => descer(p, 0));
    // Ciclo em dado corrompido: ninguém é topo; inclui o que sobrou.
    (lista || []).forEach((p) => descer(p, 0));
    return saida;
}

// ─── Manutenção do dado ─────────────────────────────────────────────────

// Normaliza `pertenceA` de todos os períodos: garante que seja lista, tira
// ids que não existem, repetidos e o próprio período, e desfaz ciclos
// (corta o vínculo que fecha o ciclo). Idempotente. Devolve true se mexeu
// em algo.
export function sanearHierarquiaDePeriodos(lista) {
    let mudou = false;
    (lista || []).forEach((p) => {
        const atual = Array.isArray(p.pertenceA) ? p.pertenceA : null;
        const limpo = paisDoPeriodo(lista, p.id);
        if (!atual || atual.length !== limpo.length || atual.some((x, i) => x !== limpo[i])) {
            p.pertenceA = limpo;
            mudou = true;
        }
    });
    (lista || []).forEach((p) => {
        const cortar = paisDoPeriodo(lista, p.id).filter((pai) =>
            ancestraisDoPeriodo(lista, pai).some((a) => mesmo(a, p.id)),
        );
        if (cortar.length) {
            p.pertenceA = p.pertenceA.filter((x) => !cortar.some((c) => mesmo(c, x)));
            mudou = true;
        }
    });
    return mudou;
}

// Mesclagem de `origem` em `destino` (os dois registros, ainda na lista).
// Os filhos da origem passam a ser do destino; o próprio destino sai da
// lista de pais de qualquer um (e, se era filho da origem, herda os pais
// dela). O destino herda os pais da origem se não tiver nenhum e se isso
// não fechar um ciclo. A origem sai da lista de pais de todos. Não remove
// a origem da lista (quem chama faz isso depois).
export function mesclarHierarquiaDePeriodos(lista, origem, destino) {
    const paisOrigem = paisDoPeriodo(lista, origem.id);
    (lista || []).forEach((p) => {
        if (mesmo(p.id, origem.id) || !Array.isArray(p.pertenceA)) return;
        if (!p.pertenceA.some((x) => mesmo(x, origem.id))) return;
        const trocado = p.pertenceA.map((x) => (mesmo(x, origem.id) ? destino.id : x));
        p.pertenceA = semRepetir(trocado).filter((x) => !mesmo(x, p.id));
    });
    // O destino não pode ficar abaixo de si mesmo (era filho da origem).
    destino.pertenceA = semRepetir(destino.pertenceA || []).filter(
        (x) => !mesmo(x, origem.id) && !mesmo(x, destino.id),
    );
    if (!destino.pertenceA.length) {
        const herdados = paisOrigem.filter((x) => !mesmo(x, destino.id));
        const semOrigem = (lista || []).filter((p) => !mesmo(p.id, origem.id));
        if (!criaCicloPeriodo(semOrigem, destino.id, herdados)) destino.pertenceA = herdados;
    }
    origem.pertenceA = [];
}

// Para onde vão os filhos de `id` quando ele é excluído, sem alterar nada
// (serve ao aviso da exclusão). Cada filho cai em um de três casos:
// - `topo`: sem outro pai e `id` não tinha pais, então vira período de topo;
// - `sobem`: só tinha `id` como pai e passa aos pais dele;
// - `mantem`: já tinha outro pai e continua dentro dele.
export function destinoDosFilhosAoExcluir(lista, id) {
    const paisDele = paisDoPeriodo(lista, id);
    const destino = { topo: [], sobem: [], mantem: [] };
    filhosDoPeriodo(lista, id).forEach((filhoId) => {
        const outros = paisDoPeriodo(lista, filhoId).filter((x) => !mesmo(x, id));
        if (outros.length) destino.mantem.push(filhoId);
        else if (paisDele.length) destino.sobem.push(filhoId);
        else destino.topo.push(filhoId);
    });
    return destino;
}

// Retira `id` da hierarquia ao excluí-lo: os filhos sobem para os pais
// dele (o neto não fica solto). Devolve o que mudou, para o Desfazer:
// `[{ id, anterior }]` com o `pertenceA` de cada filho antes da exclusão.
// `paisDele` vem de quem chama quando `id` já saiu da lista (a exclusão
// remove o período antes de religar os filhos, e aí a lista já não o acha).
export function retirarPeriodoDaHierarquia(lista, id, paisDele = paisDoPeriodo(lista, id)) {
    const alterados = [];
    (lista || []).forEach((p) => {
        if (mesmo(p.id, id) || !Array.isArray(p.pertenceA)) return;
        if (!p.pertenceA.some((x) => mesmo(x, id))) return;
        alterados.push({ id: p.id, anterior: [...p.pertenceA] });
        const novo = [];
        p.pertenceA.forEach((x) => {
            if (mesmo(x, id)) novo.push(...paisDele);
            else novo.push(x);
        });
        p.pertenceA = semRepetir(novo).filter((x) => !mesmo(x, p.id));
    });
    return alterados;
}

// ---- Escolha pelo nome nos modais de Poema e Prosa ------------------
// Com hierarquia, dois períodos podem ter o mesmo nome ("Primeiro mandato"
// sob Lula e sob Dilma). O campo de texto do modal mostra então um rótulo
// que os distingue; o texto digitado volta a um id por `resolverPeriodoPorRotulo`.

// Rótulo que identifica o período na lista de sugestões: o próprio nome
// quando ele é de topo e único; quando está dentro de outro, o nome seguido
// do caminho dos ancestrais ("Segundo mandato (Nova República › Governo
// Dilma Rousseff)"), para a pessoa ver onde ele fica e para separar
// homônimos; se nem isso os separa, acrescenta o id.
export function rotuloDeEscolhaDoPeriodo(lista, id) {
    const p = achar(lista, id);
    if (!p) return '';
    const caminho = caminhoDosAncestraisDoPeriodo(lista, p.id);
    const rotulo = caminho ? `${p.nome} (${caminho})` : p.nome;
    const iguais = (lista || []).filter(
        (x) => x.nome === p.nome && (caminhoDosAncestraisDoPeriodo(lista, x.id) || '') === caminho,
    );
    return iguais.length > 1 ? `${rotulo} #${p.id}` : rotulo;
}

// Texto do campo -> período. Devolve `{ id }` (achou), `{ id: null, novo: true }`
// (nome que não existe, vira período novo), `{ id: null }` (campo vazio) ou
// `{ ambiguo: true, nome }` (há mais de um com esse nome e o texto não diz
// qual). Com homônimos, o período que o texto já tinha (`idAtual`) vale como
// desempate, para reabrir e salvar sem mexer no vínculo.
export function resolverPeriodoPorRotulo(lista, texto, idAtual = null) {
    const t = String(texto ?? '').trim();
    if (!t) return { id: null };
    const todos = lista || [];
    const porRotulo = todos.find((p) => rotuloDeEscolhaDoPeriodo(todos, p.id) === t);
    if (porRotulo) return { id: porRotulo.id };
    const mesmoNome = todos.filter((p) => p.nome === t);
    if (mesmoNome.length === 1) return { id: mesmoNome[0].id };
    if (mesmoNome.length > 1) {
        const atual = mesmoNome.find((p) => mesmo(p.id, idAtual));
        return atual ? { id: atual.id } : { ambiguo: true, nome: t };
    }
    return { id: null, novo: true };
}
