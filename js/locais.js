// locais.js: cadastro central de Local (db.locais).
//
// Local: `{ id, nome, tipo, pertenceA: [id, ...], notas, apelido? }`.
//
// - `apelido` é opcional (um só, texto curto) e vale só para EXIBIÇÃO nas
//   Estatísticas, onde o nome longo estoura o gráfico: com apelido, a barra
//   e o seletor trazem o apelido no lugar do nome. Em todo o resto (cadastro,
//   modais, `.md`, Visualização, exportação) o nome segue mandando. Também é
//   termo de busca (`territorialidade:Sampa`). Sem apelido a chave nem existe.
// - `tipo` é texto livre (País, Estado, Cidade, Bairro, Estação...), com
//   sugestões em TIPOS_LOCAL_PADRAO e memória dos tipos já usados.
// - `pertenceA` é uma LISTA de ids (vários pais). O primeiro é o pai
//   principal: define o caminho canônico do Local (caminhoDoLocal). Os
//   demais são vínculos adicionais, que só entram nas agregações.
//   Exemplo: Estação Lapa → [bairro da Lapa, Metrô de São Paulo].
// - A identidade de um Local é nome + tipo + pai (São Paulo cidade e São
//   Paulo estado coexistem; dois "Centro" de cidades diferentes também).
//
// No texto (Poema/Prosa):
// - `territorialidade: [id, ...]`: lugares que o texto cita (fonte da
//   verdade, só o que a pessoa marcou; ancestrais são sempre calculados).
// - `sinalizacoesTerritorialidade`: ESPELHO derivado (nomes separados
//   por vírgula), mantido para busca, badges e exportações que já leem
//   esse campo. Se o espelho diverge dos ids (edição em massa, Localizar
//   e Substituir, JSON antigo), o espelho vence e os ids são refeitos,
//   igual ao Tema (temas.js).
// - `localEscrita: id | null`: onde o texto foi redigido (um só).
//
// Tudo aqui é função pura sobre o `dbRef` passado (sem DOM, sem save()).
// Comparação de nomes sempre por `chaveTema` (sem caixa/acento).

import { chaveTema, gerarId } from './utils.js';

export const TIPOS_LOCAL_PADRAO = [
    'País',
    'Estado',
    'Região',
    'Cidade',
    'Bairro',
    'Logradouro',
    'Edificação',
    'Estação',
    'Rede ou sistema',
    "Corpo d'água",
];

function todosOsTextos(dbRef) {
    return [...(dbRef.poemas || []), ...(dbRef.prosas || [])];
}

// Vírgula é o separador do espelho, então não pode existir num nome.
export function limparNomeLocal(nome) {
    return String(nome ?? '')
        .replace(/,/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Apelido de exibição: mesma limpeza do nome; igual ao nome (sem caixa/acento)
// não é apelido, vira ''.
export function limparApelidoLocal(apelido, nome = '') {
    const limpo = limparNomeLocal(apelido);
    return chaveTema(limpo) === chaveTema(nome) ? '' : limpo;
}

export function limparTipoLocal(tipo) {
    return String(tipo ?? '')
        .replace(/\s+/g, ' ')
        .trim();
}

function achar(dbRef, id) {
    if (id == null) return null;
    return (dbRef.locais || []).find((l) => String(l.id) === String(id)) || null;
}

function mesmoId(a, b) {
    return String(a) === String(b);
}

function semRepetir(ids) {
    const vistos = new Set();
    return ids.filter((id) => {
        const k = String(id);
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
    });
}

// ─── Hierarquia ─────────────────────────────────────────────────────────

// Ids dos pais do Local, na ordem gravada (o primeiro é o principal),
// só os que existem no cadastro.
export function paisDoLocal(dbRef, id) {
    const local = achar(dbRef, id);
    if (!local || !Array.isArray(local.pertenceA)) return [];
    return semRepetir(local.pertenceA).filter((p) => achar(dbRef, p) && !mesmoId(p, id));
}

// Todos os ancestrais (por qualquer caminho), sem repetição, do mais
// próximo ao mais distante (busca em largura). Não inclui o próprio Local.
export function ancestraisDoLocal(dbRef, id) {
    const vistos = new Set([String(id)]);
    const saida = [];
    let fila = [id];
    while (fila.length) {
        const proxima = [];
        fila.forEach((atual) => {
            paisDoLocal(dbRef, atual).forEach((p) => {
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

// Todos os descendentes (por qualquer caminho), sem repetição. Não inclui
// o próprio Local.
export function descendentesDoLocal(dbRef, id) {
    const filhos = new Map();
    (dbRef.locais || []).forEach((l) => {
        paisDoLocal(dbRef, l.id).forEach((p) => {
            const k = String(p);
            if (!filhos.has(k)) filhos.set(k, []);
            filhos.get(k).push(l.id);
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

// Filhos diretos (quem lista `id` em pertenceA), na ordem do cadastro.
export function filhosDoLocal(dbRef, id) {
    return (dbRef.locais || [])
        .filter((l) => paisDoLocal(dbRef, l.id).some((p) => mesmoId(p, id)))
        .map((l) => l.id);
}

// Caminho canônico: do Local até a raiz, sempre pelo primeiro pai.
// Devolve [{ id, nome, tipo }, ...] começando pelo próprio Local.
export function caminhoDoLocal(dbRef, id) {
    const saida = [];
    const vistos = new Set();
    let atual = achar(dbRef, id);
    while (atual && !vistos.has(String(atual.id))) {
        vistos.add(String(atual.id));
        saida.push({ id: atual.id, nome: atual.nome, tipo: atual.tipo || '' });
        const pai = paisDoLocal(dbRef, atual.id)[0];
        atual = pai == null ? null : achar(dbRef, pai);
    }
    return saida;
}

export function rotuloCaminhoLocal(dbRef, id, separador = ' › ') {
    return caminhoDoLocal(dbRef, id)
        .map((l) => l.nome)
        .join(separador);
}

// Nome para listas e selects: só ganha o tipo entre parênteses quando
// outro Local tem o mesmo nome (São Paulo cidade / São Paulo estado).
export function rotuloLocal(dbRef, id) {
    const local = achar(dbRef, id);
    if (!local) return '';
    const chave = chaveTema(local.nome);
    const homonimos = (dbRef.locais || []).filter(
        (l) => !mesmoId(l.id, local.id) && chaveTema(l.nome) === chave,
    );
    if (!homonimos.length) return local.nome;
    return `${local.nome} (${local.tipo || 'sem tipo'})`;
}

// Ligar `id` a `novosPais` fecharia um ciclo? (algum pai é o próprio
// Local ou um descendente dele.)
export function criaCiclo(dbRef, id, novosPais) {
    const desc = new Set(descendentesDoLocal(dbRef, id).map(String));
    return (novosPais || []).some((p) => mesmoId(p, id) || desc.has(String(p)));
}

// Tipos já usados no cadastro + os padrão, sem repetir por caixa/acento.
export function tiposDeLocalSugeridos(dbRef) {
    const vistos = new Set();
    const saida = [];
    [...TIPOS_LOCAL_PADRAO, ...(dbRef.locais || []).map((l) => l.tipo)].forEach((t) => {
        const tipo = limparTipoLocal(t);
        const chave = chaveTema(tipo);
        if (!chave || vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(tipo);
    });
    return saida;
}

// ─── Texto: territorialidade (ids + espelho) e local de escrita ─────────

function nomeDoLocal(dbRef, id) {
    return achar(dbRef, id)?.nome ?? '';
}

// Nomes do espelho `sinalizacoesTerritorialidade` (string "a, b" ou array),
// sem vazio nem repetição por chave.
export function nomesTerritorialidade(item) {
    const valor = item?.sinalizacoesTerritorialidade;
    if (!valor) return [];
    const lista = Array.isArray(valor) ? valor : String(valor).split(',');
    const vistos = new Set();
    const saida = [];
    lista.forEach((n) => {
        const nome = String(n ?? '').trim();
        const chave = chaveTema(nome);
        if (!chave || vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(nome);
    });
    return saida;
}

// Espelho a partir de ids: nomes na ordem, sem repetir por chave.
export function espelhoDeLocais(dbRef, ids) {
    const vistos = new Set();
    const nomes = [];
    (ids || []).forEach((id) => {
        const nome = nomeDoLocal(dbRef, id);
        const chave = chaveTema(nome);
        if (!chave || vistos.has(chave)) return;
        vistos.add(chave);
        nomes.push(nome);
    });
    return nomes.join(', ');
}

// Recalcula o espelho de UM texto a partir dos ids dele (uso interno das
// operações de cadastro, que mexem nos ids e precisam do espelho coerente).
function atualizarEspelho(dbRef, item) {
    item.sinalizacoesTerritorialidade = espelhoDeLocais(dbRef, item.territorialidade);
}

// Ids de Locais citados pelo texto (só os que existem no cadastro).
export function territorialidadeDoTexto(dbRef, item) {
    return semRepetir(Array.isArray(item?.territorialidade) ? item.territorialidade : []).filter(
        (id) => achar(dbRef, id),
    );
}

// Local para ler (md, Visualização, coluna): o nome e, entre parênteses, o
// caminho até a raiz sem o próprio Local ("Estação Lapa (Lapa › São Paulo ›
// Brasil)"). Local sem pai sai só com o nome. Sempre pelo primeiro pai.
export function textoLocalComCaminho(dbRef, id) {
    const [proprio, ...acima] = caminhoDoLocal(dbRef, id);
    if (!proprio) return '';
    return acima.length
        ? `${proprio.nome} (${acima.map((l) => l.nome).join(' › ')})`
        : proprio.nome;
}

// Territorialidade do texto como lista de Locais com caminho, separados por
// vírgula. Texto sem ids (só o espelho de nomes) devolve '' e quem chama
// cai no espelho.
export function textoTerritorialidadeComCaminho(dbRef, item) {
    return territorialidadeDoTexto(dbRef, item)
        .map((id) => textoLocalComCaminho(dbRef, id))
        .join(', ');
}

// Local onde o texto foi escrito, com caminho ('' se não houver ou se o
// Local não existe mais).
export function textoLocalEscrita(dbRef, item) {
    return achar(dbRef, item?.localEscrita) ? textoLocalComCaminho(dbRef, item.localEscrita) : '';
}

// Caminho completo de um Local, do mais alto até ele ("Brasil › São Paulo ›
// Lapa"), para células de CSV. Ordem inversa de rotuloCaminhoLocal.
export function caminhoCompletoLocal(dbRef, id) {
    return caminhoDoLocal(dbRef, id)
        .map((l) => l.nome)
        .reverse()
        .join(' › ');
}

// Id do Local de nome `nome` (qualquer tipo), o primeiro do cadastro.
// Com `preferidos` (ids), um deles ganha se tiver o mesmo nome.
function localPorNome(dbRef, nome, preferidos = []) {
    const chave = chaveTema(nome);
    if (!chave) return null;
    const candidatos = (dbRef.locais || []).filter((l) => chaveTema(l.nome) === chave);
    if (!candidatos.length) return null;
    const pref = candidatos.find((c) => preferidos.some((p) => mesmoId(p, c.id)));
    return (pref || candidatos[0]).id;
}

// Cria (sem pai e sem tipo) o Local de nome `nome` se ainda não existe
// nenhum com esse nome; devolve o id. Nome vazio → null.
export function garantirLocalPorNome(dbRef, nome) {
    const limpo = limparNomeLocal(nome);
    if (!chaveTema(limpo)) return null;
    if (!Array.isArray(dbRef.locais)) dbRef.locais = [];
    const existente = localPorNome(dbRef, limpo);
    if (existente != null) return existente;
    const id = gerarId();
    dbRef.locais.push({ id, nome: limpo, tipo: '', pertenceA: [], notas: '' });
    return id;
}

// Deixa `item.territorialidade`, o espelho e `item.localEscrita` coerentes
// entre si e com o cadastro. Casos: (1) texto sem `territorialidade` (dado
// antigo) → migra do espelho; (2) ids e espelho falam dos mesmos nomes →
// mantém os ids (é o que preserva "São Paulo" cidade x estado) e só
// normaliza o espelho; (3) divergem → o espelho vence: refaz os ids,
// mantendo quem já estava quando o nome bate. Devolve true se mudou algo.
export function reconciliarLocaisDoTexto(dbRef, item) {
    if (!item) return false;
    const nomesEspelho = nomesTerritorialidade(item);
    const chavesEspelho = new Set(nomesEspelho.map(chaveTema));
    const anteriores = Array.isArray(item.territorialidade)
        ? territorialidadeDoTexto(dbRef, item)
        : null;

    let ids = null;
    if (anteriores) {
        const chavesBase = new Set(anteriores.map((id) => chaveTema(nomeDoLocal(dbRef, id))));
        const igual =
            chavesBase.size === chavesEspelho.size &&
            [...chavesBase].every((c) => chavesEspelho.has(c));
        if (igual) ids = anteriores;
    }
    if (!ids) {
        const base = anteriores || [];
        const saida = [];
        nomesEspelho.forEach((nome) => {
            const chave = chaveTema(nome);
            const mantidos = base.filter((id) => chaveTema(nomeDoLocal(dbRef, id)) === chave);
            if (mantidos.length) {
                saida.push(...mantidos);
                return;
            }
            const id = garantirLocalPorNome(dbRef, nome);
            if (id != null) saida.push(id);
        });
        ids = semRepetir(saida);
    }

    const espelho = espelhoDeLocais(dbRef, ids);
    const escrita = achar(dbRef, item.localEscrita) ? item.localEscrita : null;
    const mudou =
        JSON.stringify(item.territorialidade) !== JSON.stringify(ids) ||
        item.sinalizacoesTerritorialidade !== espelho ||
        (item.localEscrita ?? null) !== escrita;
    item.territorialidade = ids;
    item.sinalizacoesTerritorialidade = espelho;
    item.localEscrita = escrita;
    return mudou;
}

// ─── Sincronização (load, importarDB, save) ─────────────────────────────

// Remove vínculos que fechariam ciclo (backup editado à mão, importação),
// um a um, deixando o resto intacto.
function quebrarCiclos(dbRef) {
    (dbRef.locais || []).forEach((l) => {
        (l.pertenceA || []).slice().forEach((p) => {
            const ancestraisDoPai = ancestraisDoLocal(dbRef, p);
            if (mesmoId(p, l.id) || ancestraisDoPai.some((a) => mesmoId(a, l.id))) {
                l.pertenceA = l.pertenceA.filter((x) => !mesmoId(x, p));
            }
        });
    });
}

// Garante `dbRef.locais` bem formado, cria um Local para todo nome em uso
// no espelho de Territorialidade e reconcilia cada texto. Nunca apaga nem
// renomeia registro existente; a grafia de um Local novo é a mais
// frequente nos textos. Idempotente. Devolve quantos Locais criou.
export function sincronizarLocais(dbRef) {
    if (!Array.isArray(dbRef.locais)) dbRef.locais = [];
    dbRef.locais.forEach((l) => {
        l.nome = limparNomeLocal(l.nome);
        l.tipo = limparTipoLocal(l.tipo);
        l.notas = typeof l.notas === 'string' ? l.notas : '';
        const apelido = limparApelidoLocal(l.apelido, l.nome);
        if (apelido) l.apelido = apelido;
        else delete l.apelido;
    });
    dbRef.locais.forEach((l) => {
        l.pertenceA = Array.isArray(l.pertenceA) ? l.pertenceA : [];
        l.pertenceA = semRepetir(l.pertenceA).filter((p) => achar(dbRef, p) && !mesmoId(p, l.id));
    });
    quebrarCiclos(dbRef);

    const textos = todosOsTextos(dbRef);
    const contagem = new Map();
    textos.forEach((t) => {
        nomesTerritorialidade(t).forEach((nome) => {
            const chave = chaveTema(nome);
            const atual = contagem.get(chave) || { grafias: new Map(), ordem: contagem.size };
            atual.grafias.set(nome, (atual.grafias.get(nome) || 0) + 1);
            contagem.set(chave, atual);
        });
    });
    let criados = 0;
    [...contagem.entries()]
        .sort((a, b) => a[1].ordem - b[1].ordem)
        .forEach(([chave, { grafias }]) => {
            if (dbRef.locais.some((l) => chaveTema(l.nome) === chave)) return;
            const [nome] = [...grafias.entries()].sort((a, b) => b[1] - a[1])[0];
            dbRef.locais.push({
                id: gerarId(),
                nome: limparNomeLocal(nome),
                tipo: '',
                pertenceA: [],
                notas: '',
            });
            criados += 1;
        });

    textos.forEach((t) => reconciliarLocaisDoTexto(dbRef, t));
    return criados;
}

// ─── Consultas e contagens ──────────────────────────────────────────────

function textoTemLocalCitado(dbRef, t, id) {
    return territorialidadeDoTexto(dbRef, t).some((x) => mesmoId(x, id));
}

// Ids de Poemas e Prosas que citam o Local diretamente.
export function textosQueCitamLocal(dbRef, id) {
    const tem = (t) => textoTemLocalCitado(dbRef, t, id);
    return {
        poemasIds: (dbRef.poemas || []).filter(tem).map((t) => t.id),
        prosasIds: (dbRef.prosas || []).filter(tem).map((t) => t.id),
    };
}

// Ids de Poemas e Prosas escritos no Local (só o local exato).
export function textosEscritosNoLocal(dbRef, id) {
    const tem = (t) => t.localEscrita != null && mesmoId(t.localEscrita, id);
    return {
        poemasIds: (dbRef.poemas || []).filter(tem).map((t) => t.id),
        prosasIds: (dbRef.prosas || []).filter(tem).map((t) => t.id),
    };
}

// Conta textos por Local. `diretos`: textos que marcam exatamente esse
// Local. `agregados`: textos que marcam o Local OU qualquer descendente
// dele, cada texto uma só vez (dois caminhos até o mesmo ancestral não
// contam em dobro). Devolve Map(String(id) → { diretos, agregados }).
function contarPorSeletor(dbRef, seletor, textos = todosOsTextos(dbRef)) {
    const ancestraisCache = new Map();
    const ancestrais = (id) => {
        const k = String(id);
        if (!ancestraisCache.has(k)) ancestraisCache.set(k, ancestraisDoLocal(dbRef, id));
        return ancestraisCache.get(k);
    };
    const contagem = new Map();
    (dbRef.locais || []).forEach((l) => contagem.set(String(l.id), { diretos: 0, agregados: 0 }));
    textos.forEach((t) => {
        const diretos = semRepetir(seletor(t)).filter((id) => achar(dbRef, id));
        const agregados = new Set();
        diretos.forEach((id) => {
            contagem.get(String(id)).diretos += 1;
            agregados.add(String(id));
            ancestrais(id).forEach((a) => agregados.add(String(a)));
        });
        agregados.forEach((k) => {
            contagem.get(k).agregados += 1;
        });
    });
    return contagem;
}

// Locais citados (Territorialidade). `textos` recorta o corpus (as
// Estatísticas passam só os textos que entram nos filtros); sem ele, conta
// todos os Poemas e Prosas.
export function contarTextosPorLocal(dbRef, textos) {
    return contarPorSeletor(dbRef, (t) => territorialidadeDoTexto(dbRef, t), textos);
}

// Locais de escrita (um por texto).
export function contarTextosPorLocalEscrita(dbRef, textos) {
    return contarPorSeletor(dbRef, (t) => (t.localEscrita != null ? [t.localEscrita] : []), textos);
}

// Rótulos distintos para uma lista de Locais num gráfico (o apelido, se houver;
// senão o rótulo curto do modal; se dois ainda colidirem, ganham o tipo e o pai principal). Devolve
// Map(String(id) → rótulo). Rótulo repetido quebraria o "ocultar" e o clique
// na barra, que se orientam pelo texto do rótulo.
export function rotulosUnicosDeLocais(dbRef, ids) {
    // Com apelido, o gráfico traz o apelido no lugar do nome (ver cabeçalho).
    const base = new Map(
        ids.map((id) => [String(id), achar(dbRef, id)?.apelido || rotuloLocal(dbRef, id)]),
    );
    const repeticoes = new Map();
    base.forEach((rotulo) => repeticoes.set(rotulo, (repeticoes.get(rotulo) || 0) + 1));
    const usados = new Set();
    const saida = new Map();
    base.forEach((rotulo, k) => {
        let final = rotulo;
        if (repeticoes.get(rotulo) > 1) {
            const local = achar(dbRef, k);
            const pai = paisDoLocal(dbRef, k)[0];
            const nomePai = pai == null ? '' : achar(dbRef, pai)?.nome;
            final = `${local.apelido || local.nome} (${local.tipo || 'sem tipo'}${nomePai ? `, em ${nomePai}` : ''})`;
        }
        let candidato = final;
        for (let n = 2; usados.has(candidato); n += 1) candidato = `${final} #${n}`;
        usados.add(candidato);
        saida.set(k, candidato);
    });
    return saida;
}

// ─── Busca: texto hierárquico por Local ─────────────────────────────────
// Alimenta os prefixos `territorialidade:` e `localescrita:` (achar o que
// está DENTRO do Local, por qualquer caminho) e os irmãos `...direta:`
// (só o Local exato). Cada Local entra com dois termos: o nome e
// "nome (tipo)", este último para distinguir homônimos (São Paulo
// (Cidade) x São Paulo (Estado)); sem tipo, vale "nome (sem tipo)", o
// mesmo rótulo que o modal mostra nos homônimos.

function termosDeBuscaDoLocal(local) {
    const nome = String(local.nome ?? '').trim();
    if (!nome) return [];
    const termos = [nome, `${nome} (${local.tipo || 'sem tipo'})`];
    const apelido = String(local.apelido ?? '').trim();
    if (apelido) termos.push(apelido);
    return termos;
}

// Termos de busca de uma lista de ids, sem repetição. Com `ancestrais`,
// cada Local traz junto todos os seus ancestrais (por qualquer caminho).
function termosDeBuscaDosLocais(dbRef, ids, ancestrais) {
    const vistos = new Set();
    const termos = [];
    const somar = (id) => {
        const k = String(id);
        if (vistos.has(k)) return;
        vistos.add(k);
        const local = achar(dbRef, id);
        if (local) termos.push(...termosDeBuscaDoLocal(local));
    };
    semRepetir(ids || []).forEach((id) => {
        somar(id);
        if (ancestrais) ancestraisDoLocal(dbRef, id).forEach(somar);
    });
    return termos.join(', ');
}

// Texto de busca da Territorialidade do texto. `direta`: só os Locais
// citados; sem ela, também os ancestrais (citar a Estação Lapa conta para a
// Lapa, o Metrô de São Paulo, São Paulo e o Brasil). Texto que ainda só tem
// o espelho de nomes (sem ids) cai nele, para não sumir da busca.
export function buscaTerritorialidadeDoTexto(dbRef, item, { direta = false } = {}) {
    const ids = territorialidadeDoTexto(dbRef, item);
    if (ids.length) return termosDeBuscaDosLocais(dbRef, ids, !direta);
    return nomesTerritorialidade(item).join(', ');
}

// Texto de busca do Local onde o texto foi escrito (mesma regra acima).
export function buscaLocalEscritaDoTexto(dbRef, item, { direta = false } = {}) {
    if (item?.localEscrita == null || !achar(dbRef, item.localEscrita)) return '';
    return termosDeBuscaDosLocais(dbRef, [item.localEscrita], !direta);
}

// ─── Cadastro: criar, editar, mesclar, excluir ──────────────────────────

function chavesDosPais(dbRef, pais) {
    return semRepetir(pais || []).filter((p) => achar(dbRef, p));
}

// Outro Local com o mesmo nome e tipo que compartilha algum pai (ou os
// dois sem pai): é o que a identidade "nome + tipo + pai" chama de igual.
function localIgual(dbRef, { nome, tipo, pais }, ignorarId = null) {
    const chaveNome = chaveTema(nome);
    const chaveTipo = chaveTema(tipo);
    const meusPais = chavesDosPais(dbRef, pais).map(String);
    return (
        (dbRef.locais || []).find((l) => {
            if (ignorarId != null && mesmoId(l.id, ignorarId)) return false;
            if (chaveTema(l.nome) !== chaveNome || chaveTema(l.tipo) !== chaveTipo) return false;
            const outrosPais = paisDoLocal(dbRef, l.id).map(String);
            if (!meusPais.length && !outrosPais.length) return true;
            return meusPais.some((p) => outrosPais.includes(p));
        }) || null
    );
}

// Cria um Local. Recusa nome vazio, pai inexistente e duplicata
// (mesmo nome + tipo + pai). Devolve `{ ok, id?, motivo?, existente? }`.
export function criarLocal(dbRef, { nome, tipo = '', pais = [], notas = '', apelido = '' } = {}) {
    const nomeLimpo = limparNomeLocal(nome);
    if (!chaveTema(nomeLimpo)) return { ok: false, motivo: 'vazio' };
    if (!Array.isArray(dbRef.locais)) dbRef.locais = [];
    const paisValidos = chavesDosPais(dbRef, pais);
    if (paisValidos.length !== semRepetir(pais || []).length) {
        return { ok: false, motivo: 'pai-inexistente' };
    }
    const tipoLimpo = limparTipoLocal(tipo);
    const igual = localIgual(dbRef, { nome: nomeLimpo, tipo: tipoLimpo, pais: paisValidos });
    if (igual) return { ok: false, motivo: 'duplicado', existente: igual };
    const id = gerarId();
    const novo = {
        id,
        nome: nomeLimpo,
        tipo: tipoLimpo,
        pertenceA: paisValidos,
        notas: typeof notas === 'string' ? notas : '',
    };
    const apelidoLimpo = limparApelidoLocal(apelido, nomeLimpo);
    if (apelidoLimpo) novo.apelido = apelidoLimpo;
    dbRef.locais.push(novo);
    return { ok: true, id };
}

// Edita nome, tipo, apelido, notas e/ou pais (`pais`, lista ordenada; o primeiro é
// o principal) do Local. Valida tudo antes de mudar qualquer coisa.
// Recusa: inexistente, vazio, duplicado, pai-inexistente, ciclo. Renomear
// atualiza o espelho dos textos que citam o Local. Devolve
// `{ ok, motivo?, textos }`.
export function editarLocal(dbRef, id, campos = {}) {
    const local = achar(dbRef, id);
    if (!local) return { ok: false, motivo: 'inexistente' };
    const nome = 'nome' in campos ? limparNomeLocal(campos.nome) : local.nome;
    const tipo = 'tipo' in campos ? limparTipoLocal(campos.tipo) : local.tipo;
    if (!chaveTema(nome)) return { ok: false, motivo: 'vazio' };
    const paisPedidos = 'pais' in campos ? semRepetir(campos.pais || []) : paisDoLocal(dbRef, id);
    const pais = chavesDosPais(dbRef, paisPedidos);
    if (pais.length !== paisPedidos.length) return { ok: false, motivo: 'pai-inexistente' };
    if (criaCiclo(dbRef, id, pais)) return { ok: false, motivo: 'ciclo' };
    const igual = localIgual(dbRef, { nome, tipo, pais }, id);
    if (igual) return { ok: false, motivo: 'duplicado', existente: igual };

    const nomeMudou = local.nome !== nome;
    const apelido = limparApelidoLocal('apelido' in campos ? campos.apelido : local.apelido, nome);
    if (apelido) local.apelido = apelido;
    else delete local.apelido;
    local.nome = nome;
    local.tipo = tipo;
    local.pertenceA = pais;
    if ('notas' in campos) local.notas = typeof campos.notas === 'string' ? campos.notas : '';

    let textos = 0;
    if (nomeMudou) {
        todosOsTextos(dbRef).forEach((t) => {
            if (!textoTemLocalCitado(dbRef, t, id)) return;
            atualizarEspelho(dbRef, t);
            textos += 1;
        });
    }
    return { ok: true, textos };
}

// O que uma mesclagem ou exclusão do Local alcança: ids de Poemas/Prosas
// que o citam, que foram escritos nele, e de Locais filhos diretos.
export function impactoDoLocal(dbRef, id) {
    const citam = textosQueCitamLocal(dbRef, id);
    const escritos = textosEscritosNoLocal(dbRef, id);
    return {
        poemasIds: semRepetir([...citam.poemasIds, ...escritos.poemasIds]),
        prosasIds: semRepetir([...citam.prosasIds, ...escritos.prosasIds]),
        citadosPoemasIds: citam.poemasIds,
        citadosProsasIds: citam.prosasIds,
        escritosPoemasIds: escritos.poemasIds,
        escritosProsasIds: escritos.prosasIds,
        filhosIds: filhosDoLocal(dbRef, id),
    };
}

// Retrato do que uma mesclagem/exclusão pode mudar, pro `desfazer`.
function tirarRetrato(dbRef) {
    return {
        locais: structuredClone(dbRef.locais || []),
        textos: todosOsTextos(dbRef).map((t) => ({
            ref: t,
            territorialidade: structuredClone(t.territorialidade),
            espelho: t.sinalizacoesTerritorialidade,
            localEscrita: t.localEscrita,
        })),
    };
}

function restaurarRetrato(dbRef, retrato) {
    dbRef.locais.splice(0, dbRef.locais.length, ...structuredClone(retrato.locais));
    retrato.textos.forEach((r) => {
        r.ref.territorialidade = structuredClone(r.territorialidade);
        r.ref.sinalizacoesTerritorialidade = r.espelho;
        r.ref.localEscrita = r.localEscrita;
    });
}

// Troca `origemId` por `destinoId` (ou tira, se destinoId for null) nos
// textos, mantendo ordem e sem repetição. Devolve quantos textos mudaram.
function trocarNosTextos(dbRef, origemId, destinoId) {
    let textos = 0;
    todosOsTextos(dbRef).forEach((t) => {
        let mexeu = false;
        if (
            Array.isArray(t.territorialidade) &&
            t.territorialidade.some((x) => mesmoId(x, origemId))
        ) {
            const trocados = t.territorialidade
                .map((x) => (mesmoId(x, origemId) ? destinoId : x))
                .filter((x) => x != null);
            t.territorialidade = semRepetir(trocados);
            atualizarEspelho(dbRef, t);
            mexeu = true;
        }
        if (t.localEscrita != null && mesmoId(t.localEscrita, origemId)) {
            t.localEscrita = destinoId ?? null;
            mexeu = true;
        }
        if (mexeu) textos += 1;
    });
    return textos;
}

// Mescla `origemId` em `destinoId`: textos (citados e local de escrita) e
// filhos da origem passam ao destino; os outros pais da origem viram
// também pais do destino quando não criam ciclo; a nota da origem é somada
// à do destino e a origem sai do cadastro. Recusa: igual, inexistente e
// ciclo (destino dentro da origem). Devolve
// `{ ok, motivo?, textos, filhos, desfazer }`.
export function mesclarLocais(dbRef, origemId, destinoId) {
    if (mesmoId(origemId, destinoId)) return { ok: false, motivo: 'igual' };
    const origem = achar(dbRef, origemId);
    const destino = achar(dbRef, destinoId);
    if (!origem || !destino) return { ok: false, motivo: 'inexistente' };
    if (descendentesDoLocal(dbRef, origemId).some((d) => mesmoId(d, destinoId))) {
        return { ok: false, motivo: 'ciclo' };
    }

    const retrato = tirarRetrato(dbRef);
    const filhos = filhosDoLocal(dbRef, origemId).length;
    const paisOrigem = paisDoLocal(dbRef, origemId);
    const paisDestino = paisDoLocal(dbRef, destinoId);
    const descDestino = new Set(descendentesDoLocal(dbRef, destinoId).map(String));

    const textos = trocarNosTextos(dbRef, origemId, destinoId);

    dbRef.locais.forEach((l) => {
        if (!Array.isArray(l.pertenceA) || !l.pertenceA.some((p) => mesmoId(p, origemId))) return;
        l.pertenceA = semRepetir(
            l.pertenceA.map((p) => (mesmoId(p, origemId) ? destinoId : p)),
        ).filter((p) => !mesmoId(p, l.id));
    });

    const novosPais = [...paisDestino];
    paisOrigem.forEach((p) => {
        if (mesmoId(p, destinoId) || descDestino.has(String(p))) return;
        if (!novosPais.some((x) => mesmoId(x, p))) novosPais.push(p);
    });
    destino.pertenceA = novosPais;

    // Sem apelido no destino, ele fica com o da origem (o apelido não se perde).
    if (!destino.apelido && origem.apelido) {
        const apelido = limparApelidoLocal(origem.apelido, destino.nome);
        if (apelido) destino.apelido = apelido;
    }

    const notaOrigem = String(origem.notas || '').trim();
    if (notaOrigem && !String(destino.notas || '').includes(notaOrigem)) {
        destino.notas = destino.notas ? `${destino.notas}\n\n${notaOrigem}` : notaOrigem;
    }

    dbRef.locais.splice(
        dbRef.locais.findIndex((l) => mesmoId(l.id, origemId)),
        1,
    );

    return { ok: true, textos, filhos, desfazer: () => restaurarRetrato(dbRef, retrato) };
}

// Exclui o Local: sai dos textos (citado e local de escrita) e os filhos
// dele passam a ter os pais dele no lugar (a cadeia não se rompe). Não
// pede confirmação (quem chama decide). Devolve
// `{ ok, motivo?, textos, filhos, desfazer }`.
export function excluirLocal(dbRef, id) {
    const local = achar(dbRef, id);
    if (!local) return { ok: false, motivo: 'inexistente' };
    const retrato = tirarRetrato(dbRef);
    const paisDele = paisDoLocal(dbRef, id);
    const filhos = filhosDoLocal(dbRef, id).length;

    const textos = trocarNosTextos(dbRef, id, null);

    dbRef.locais.forEach((l) => {
        if (!Array.isArray(l.pertenceA) || !l.pertenceA.some((p) => mesmoId(p, id))) return;
        const novos = [];
        l.pertenceA.forEach((p) => {
            if (mesmoId(p, id)) novos.push(...paisDele);
            else novos.push(p);
        });
        l.pertenceA = semRepetir(novos).filter((p) => !mesmoId(p, l.id));
    });

    dbRef.locais.splice(
        dbRef.locais.findIndex((l) => mesmoId(l.id, id)),
        1,
    );

    return { ok: true, textos, filhos, desfazer: () => restaurarRetrato(dbRef, retrato) };
}

// ─── Exportação e importação entre acervos ──────────────────────────────

// Os ids não valem em outro acervo, então o texto exportado leva, além
// dos ids, a hierarquia completa (cada Local citado, o local de escrita e
// todos os ancestrais) com pais referenciados por id de origem.
// Devolve `{ territorialidade, localEscrita, locaisHierarquia }` com
// nomes e tipos, prontos pra montarRegistro.
export function locaisParaExportar(dbRef, item) {
    const citados = territorialidadeDoTexto(dbRef, item);
    const escrita = achar(dbRef, item?.localEscrita) ? item.localEscrita : null;
    const ordem = [];
    const vistos = new Set();
    const incluir = (id) => {
        if (vistos.has(String(id))) return;
        vistos.add(String(id));
        ordem.push(id);
    };
    [...citados, ...(escrita != null ? [escrita] : [])].forEach((id) => {
        incluir(id);
        ancestraisDoLocal(dbRef, id).forEach(incluir);
    });
    const ficha = (id) => {
        const l = achar(dbRef, id);
        return {
            localId: l.id,
            nome: l.nome,
            tipo: l.tipo || '',
            ...(l.apelido ? { apelido: l.apelido } : {}),
        };
    };
    return {
        territorialidade: citados.map(ficha),
        localEscrita: escrita != null ? ficha(escrita) : null,
        locaisHierarquia: ordem.map((id) => ({
            ...ficha(id),
            pertenceA: paisDoLocal(dbRef, id),
        })),
    };
}

// Traz para `dbRef` os Locais de um texto exportado (ver locaisParaExportar),
// casando por nome + tipo + pai (cria o que falta, ancestrais primeiro) e
// devolve `{ ids, localEscrita, espelho }` no id do acervo de destino.
// Sem `locaisHierarquia` (JSON antigo) devolve null e o texto cai no
// espelho, que sincronizarLocais migra no save().
export function importarLocaisDoTexto(dbRef, itemOrigem) {
    const hierarquia = Array.isArray(itemOrigem?.locaisHierarquia)
        ? itemOrigem.locaisHierarquia
        : null;
    if (!hierarquia) return null;
    if (!Array.isArray(dbRef.locais)) dbRef.locais = [];

    const porOrigem = new Map(hierarquia.map((h) => [String(h.localId), h]));
    const destinoDe = new Map();
    const resolver = (idOrigem, pilha = new Set()) => {
        const k = String(idOrigem);
        if (destinoDe.has(k)) return destinoDe.get(k);
        const h = porOrigem.get(k);
        if (!h || pilha.has(k)) return null;
        pilha.add(k);
        const pais = (Array.isArray(h.pertenceA) ? h.pertenceA : [])
            .map((p) => resolver(p, pilha))
            .filter((p) => p != null);
        const nome = limparNomeLocal(h.nome);
        if (!chaveTema(nome)) return null;
        const tipo = limparTipoLocal(h.tipo);
        // Sem correspondência exata, um Local do mesmo nome e tipo ainda sem
        // pai (nascido da migração) é adotado e ganha os pais.
        const existente =
            localIgual(dbRef, { nome, tipo, pais }) ||
            (pais.length
                ? dbRef.locais.find(
                      (l) =>
                          chaveTema(l.nome) === chaveTema(nome) &&
                          chaveTema(l.tipo) === chaveTema(tipo) &&
                          !paisDoLocal(dbRef, l.id).length,
                  )
                : null);
        const apelido = limparApelidoLocal(h.apelido, nome);
        let id;
        if (existente) {
            id = existente.id;
            // o apelido do acervo de destino nunca é trocado; só preenche se faltava
            if (apelido && !existente.apelido) existente.apelido = apelido;
            // traz pais novos sem criar ciclo
            const novos = pais.filter(
                (p) =>
                    !existente.pertenceA.some((x) => mesmoId(x, p)) && !criaCiclo(dbRef, id, [p]),
            );
            if (novos.length) existente.pertenceA = [...existente.pertenceA, ...novos];
        } else {
            id = gerarId();
            dbRef.locais.push({
                id,
                nome,
                tipo,
                pertenceA: semRepetir(pais),
                notas: '',
                ...(apelido ? { apelido } : {}),
            });
        }
        destinoDe.set(k, id);
        return id;
    };

    const ids = semRepetir(
        (Array.isArray(itemOrigem.territorialidade) ? itemOrigem.territorialidade : [])
            .map((e) => resolver(e?.localId))
            .filter((id) => id != null),
    );
    const escritaOrigem = itemOrigem.localEscrita?.localId;
    const localEscrita = escritaOrigem != null ? (resolver(escritaOrigem) ?? null) : null;
    return { ids, localEscrita, espelho: espelhoDeLocais(dbRef, ids) };
}

// ─── Árvore da aba Locais ───────────────────────────────────────────────

function compararLocais(dbRef) {
    return (a, b) => {
        const la = achar(dbRef, a);
        const lb = achar(dbRef, b);
        return (
            String(la?.nome ?? '').localeCompare(String(lb?.nome ?? ''), 'pt-BR') ||
            String(la?.tipo ?? '').localeCompare(String(lb?.tipo ?? ''), 'pt-BR')
        );
    };
}

// Árvore para a aba: cada Local aparece UMA vez na árvore, sob o pai
// principal (o primeiro de `pertenceA`); quem não tem pai é raiz. Sob cada
// pai adicional, o Local entra só como referência (`tambemAqui`), sem os
// filhos dele, para a árvore não se duplicar. Irmãos em ordem alfabética.
// Devolve `[{ id, filhos: [nó], tambemAqui: [id] }]`.
export function arvoreDeLocais(dbRef) {
    const ordem = compararLocais(dbRef);
    const filhosPrincipais = new Map();
    const referencias = new Map();
    const raizes = [];
    (dbRef.locais || []).forEach((l) => {
        const pais = paisDoLocal(dbRef, l.id);
        if (!pais.length) {
            raizes.push(l.id);
            return;
        }
        const add = (mapa, paiId) => {
            const k = String(paiId);
            if (!mapa.has(k)) mapa.set(k, []);
            mapa.get(k).push(l.id);
        };
        add(filhosPrincipais, pais[0]);
        pais.slice(1).forEach((p) => add(referencias, p));
    });

    const visitados = new Set();
    const montar = (id) => {
        visitados.add(String(id));
        return {
            id,
            filhos: (filhosPrincipais.get(String(id)) || [])
                .slice()
                .sort(ordem)
                .filter((f) => !visitados.has(String(f)))
                .map(montar),
            tambemAqui: (referencias.get(String(id)) || []).slice().sort(ordem),
        };
    };
    const arvore = raizes.slice().sort(ordem).map(montar);
    // Rede de segurança: Local fora de qualquer raiz (ciclo que escapou)
    // vira raiz, para nunca sumir da tela.
    (dbRef.locais || []).forEach((l) => {
        if (!visitados.has(String(l.id))) arvore.push(montar(l.id));
    });
    return arvore;
}

// Ids de Poemas e Prosas que citam o Local OU algum sublocal dele (é o que
// a contagem `agregados` mede).
export function textosQueCitamLocalOuSublocais(dbRef, id) {
    const alvos = new Set([String(id), ...descendentesDoLocal(dbRef, id).map(String)]);
    const tem = (t) => territorialidadeDoTexto(dbRef, t).some((x) => alvos.has(String(x)));
    return {
        poemasIds: (dbRef.poemas || []).filter(tem).map((t) => t.id),
        prosasIds: (dbRef.prosas || []).filter(tem).map((t) => t.id),
    };
}

// Consulta para a caixa de busca das abas Poemas/Prosas: um único termo
// `territorialidade:` com o Local, que já acha o que está dentro dele (ver
// buscaTerritorialidadeDoTexto). Com tipo, vai "Nome (Tipo)" para não
// confundir homônimos (São Paulo cidade e estado); sem tipo, o rótulo
// curto do modal (só traz o tipo quando há homônimo).
export function consultaTerritorialidadeDoLocal(dbRef, id) {
    return consultaBuscaDoLocal(dbRef, id, 'territorialidade');
}

// Mesma consulta para qualquer prefixo de Local: `territorialidade`,
// `territorialidadedireta`, `localescrita` ou `localescritadireta`. É o que
// o clique numa barra das Estatísticas abre na lista.
export function consultaBuscaDoLocal(dbRef, id, prefixo) {
    const local = achar(dbRef, id);
    if (!local) return '';
    const rotulo = local.tipo ? `${local.nome} (${local.tipo})` : rotuloLocal(dbRef, id);
    return `${prefixo}:"${rotulo.replace(/"/g, '')}"`;
}

// ─── Campos do modal: Territorialidade e Local onde foi escrito ─────────
// O modal trabalha com entradas `{ id, nome }`: `id` quando a pessoa
// escolheu um Local do cadastro, `id: null` quando digitou um nome que
// ainda não existe. O Local novo só é criado ao salvar (como o Tema:
// cancelar o modal não suja o cadastro), sem tipo e sem pai, para a pessoa
// organizar depois na aba Locais.

// Opções do <datalist> do modal: o valor digitado é o rótulo curto
// (rotuloLocal, com o tipo entre parênteses só nos homônimos) e o caminho
// completo vai no `label`, que o navegador mostra ao lado.
export function opcoesLocaisParaCampo(dbRef) {
    return (dbRef.locais || [])
        .map((l) => ({
            id: l.id,
            valor: rotuloLocal(dbRef, l.id),
            caminho: rotuloCaminhoLocal(dbRef, l.id),
        }))
        .sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'));
}

// Id do Local que o texto digitado designa, ou null se não existe. Vale o
// rótulo exato ("São Paulo (Cidade)") e, na falta dele, o nome puro; nome
// puro de homônimos cai no primeiro do cadastro (mesma regra da migração).
export function localDoTextoDigitado(dbRef, texto) {
    const chave = chaveTema(limparNomeLocal(texto));
    if (!chave) return null;
    const porRotulo = (dbRef.locais || []).find(
        (l) => chaveTema(rotuloLocal(dbRef, l.id)) === chave,
    );
    if (porRotulo) return porRotulo.id;
    return localPorNome(dbRef, texto);
}

// Entrada do modal para um Local do cadastro (null se o id não existe).
export function entradaDeLocal(dbRef, id) {
    const local = achar(dbRef, id);
    return local ? { id: local.id, nome: local.nome } : null;
}

// Territorialidade e local de escrita que o modal vai gravar. Cria (sem
// tipo e sem pai) os Locais novos, tira repetidos e devolve os campos já
// coerentes: ids, espelho por nomes e `localEscrita` (id ou null).
export function resolverLocaisEditados(dbRef, { territorialidade = [], escrita = null } = {}) {
    const resolver = (entrada) => {
        if (!entrada) return null;
        if (entrada.id != null && achar(dbRef, entrada.id)) return entrada.id;
        return garantirLocalPorNome(dbRef, entrada.nome);
    };
    const ids = semRepetir(territorialidade.map(resolver).filter((id) => id != null));
    return {
        territorialidade: ids,
        sinalizacoesTerritorialidade: espelhoDeLocais(dbRef, ids),
        localEscrita: resolver(escrita),
    };
}
