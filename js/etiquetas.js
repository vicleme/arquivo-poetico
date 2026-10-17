// etiquetas.js: Cadastro central de Etiquetas (db.etiquetas = [{ id, nome, categoria, notas }]).
//
// Fase 16, entrega 1 (só lógica pura; ainda não ligado ao app). As sete
// categorias de Etiquetas (Tradição, Estilo, Relação, Sensibilidade, Tom,
// Domínio Imagético e Outros) hoje são texto separado por vírgula em cada
// Poema e Prosa. Tema e Territorialidade já têm cadastro próprio e ficam
// de fora.
//
// Decisões (F16-D1 a F16-D3, em `planejamento/plano-central.md`):
// - Os sete campos continuam nos textos, mas guardam IDS (lista), sem
//   espelho de texto por vírgula. O nome mora só em `db.etiquetas`.
// - A etiqueta guarda a própria categoria. O mesmo nome pode existir em
//   duas categorias (são etiquetas diferentes); dentro de uma categoria o
//   nome é único (sem caixa/acento).
// - "Outros" migra como está, sem adivinhar categoria.
//
// Tudo aqui é função pura sobre o objeto `dbRef` passado (sem DOM, sem
// save()), no molde de `temas.js`. Quem lê o campo de um texto pode
// receber o formato antigo (string "a, b") ou o novo (lista de ids);
// `sincronizarEtiquetas` converte tudo para ids.

import { chaveTema, gerarId } from './utils.js';
import { formaTema } from './temas.js';

// Categoria (chave de SINALIZACOES_CATEGORIAS em utils.js) → campo do texto.
// Mesma ordem do modal.
export const ETIQUETAS_CATEGORIAS = {
    tradicao: 'sinalizacoesTradicao',
    estilo: 'sinalizacoesEstilo',
    relacao: 'sinalizacoesRelacao',
    sensibilidade: 'sinalizacoesSensibilidade',
    tom: 'sinalizacoesTom',
    dominioImagetico: 'sinalizacoesDominioImagetico',
    outros: 'sinalizacoesOutros',
};

export const ROTULOS_ETIQUETAS = {
    tradicao: 'Tradição',
    estilo: 'Estilo',
    relacao: 'Relação',
    sensibilidade: 'Sensibilidade',
    tom: 'Tom',
    dominioImagetico: 'Domínio Imagético',
    outros: 'Outros',
};

export function categoriaEhValida(categoria) {
    return Object.prototype.hasOwnProperty.call(ETIQUETAS_CATEGORIAS, categoria);
}

function todosOsTextos(dbRef) {
    return [...(dbRef.poemas || []), ...(dbRef.prosas || [])];
}

function acharEtiqueta(dbRef, id) {
    return (dbRef.etiquetas || []).find((e) => e.id == id);
}

function acharPorNome(dbRef, categoria, nome, ignorarId = null) {
    const chave = chaveTema(nome);
    return (dbRef.etiquetas || []).find(
        (e) => e.categoria === categoria && e.id != ignorarId && chaveTema(e.nome) === chave,
    );
}

// Vírgula separava as etiquetas no formato antigo (e separa na digitação
// e na Importação Aditiva), então não pode existir dentro do nome.
export function limparNomeEtiqueta(nome) {
    return String(nome ?? '')
        .replace(/,/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// "a, b,, c" → ['a', 'b', 'c'] (sem repetir, comparando sem caixa/acento).
export function nomesDeEtiquetasDigitados(texto) {
    const vistos = new Set();
    const saida = [];
    String(texto ?? '')
        .split(',')
        .forEach((parte) => {
            const nome = limparNomeEtiqueta(parte);
            const chave = chaveTema(nome);
            if (!chave || vistos.has(chave)) return;
            vistos.add(chave);
            saida.push(nome);
        });
    return saida;
}

// Id da etiqueta `nome` da categoria, criando o registro se ainda não
// existe. Devolve null para categoria inválida ou nome vazio.
export function garantirEtiqueta(dbRef, categoria, nome) {
    if (!categoriaEhValida(categoria)) return null;
    const limpo = limparNomeEtiqueta(nome);
    if (!chaveTema(limpo)) return null;
    if (!Array.isArray(dbRef.etiquetas)) dbRef.etiquetas = [];
    const existente = acharPorNome(dbRef, categoria, limpo);
    if (existente) return existente.id;
    const id = gerarId();
    dbRef.etiquetas.push({ id, nome: limpo, categoria, notas: '' });
    return id;
}

// ─── Etiquetas no texto ────────────────────────────────────────────────

// Valor cru de um campo (string antiga ou lista) → lista de itens, sem vazios.
function itensDoCampo(valor) {
    if (valor == null || valor === '') return [];
    if (Array.isArray(valor)) return valor.filter((v) => v != null && v !== '');
    return String(valor)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

// Ids que o campo de `categoria` do texto guarda (só os que existem no
// cadastro, na categoria certa, sem repetir). Campo ainda em texto não é
// lido aqui: `sincronizarEtiquetas` o converte antes.
export function idsDeEtiquetasDoTexto(dbRef, item, categoria) {
    if (!categoriaEhValida(categoria)) return [];
    const valor = item?.[ETIQUETAS_CATEGORIAS[categoria]];
    if (!Array.isArray(valor)) return [];
    const vistos = new Set();
    const ids = [];
    valor.forEach((id) => {
        const e = acharEtiqueta(dbRef, id);
        if (!e || e.categoria !== categoria || vistos.has(String(e.id))) return;
        vistos.add(String(e.id));
        ids.push(e.id);
    });
    return ids;
}

// Etiquetas de uma categoria de um texto como [{ id, nome }], na ordem gravada.
export function etiquetasDoTexto(dbRef, item, categoria) {
    return idsDeEtiquetasDoTexto(dbRef, item, categoria).map((id) => {
        const e = acharEtiqueta(dbRef, id);
        return { id: e.id, nome: e.nome };
    });
}

// Só os nomes, na ordem gravada (o que os leitores de texto precisam).
export function nomesDeEtiquetasDoTexto(dbRef, item, categoria) {
    return etiquetasDoTexto(dbRef, item, categoria).map((e) => e.nome);
}

// Nomes vindos do editor ou do modal → ids prontos pra gravar no texto.
// Cria no cadastro a etiqueta que ainda não existe.
export function resolverEtiquetasEditadas(dbRef, categoria, nomes) {
    const vistos = new Set();
    const ids = [];
    (nomes || []).forEach((nome) => {
        const id = garantirEtiqueta(dbRef, categoria, nome);
        if (id == null || vistos.has(String(id))) return;
        vistos.add(String(id));
        ids.push(id);
    });
    return ids;
}

// Converte os sete campos de um texto para lista de ids, criando no
// cadastro o que ainda não existe. Campo em texto ("a, b") usa os nomes;
// campo que já é lista mantém os ids que existem na categoria e, se
// houver nomes soltos (backup misto), também os resolve. Devolve true se
// mudou algo. Idempotente.
export function migrarEtiquetasDoTexto(dbRef, item) {
    if (!item) return false;
    let mudou = false;
    Object.entries(ETIQUETAS_CATEGORIAS).forEach(([categoria, campo]) => {
        const bruto = item[campo];
        const ids = [];
        const vistos = new Set();
        const empurrar = (id) => {
            if (id == null || vistos.has(String(id))) return;
            vistos.add(String(id));
            ids.push(id);
        };
        itensDoCampo(bruto).forEach((valor) => {
            const registro = typeof valor === 'number' ? acharEtiqueta(dbRef, valor) : null;
            if (registro) {
                if (registro.categoria === categoria) empurrar(registro.id);
                return;
            }
            // Número solto sem registro é id órfão: descarta. Texto é nome.
            if (typeof valor === 'number') return;
            empurrar(garantirEtiqueta(dbRef, categoria, valor));
        });
        const igual = Array.isArray(bruto) && JSON.stringify(bruto) === JSON.stringify(ids);
        if (!igual && !(bruto === undefined && ids.length === 0)) {
            item[campo] = ids;
            mudou = true;
        }
    });
    return mudou;
}

// Garante `dbRef.etiquetas` limpo e todos os textos com os campos em ids.
// Nunca apaga nem renomeia registro existente. Roda no load, no importar
// e no save (como `sincronizarTemas`). Devolve quantos registros criou.
export function sincronizarEtiquetas(dbRef) {
    if (!Array.isArray(dbRef.etiquetas)) dbRef.etiquetas = [];
    dbRef.etiquetas = dbRef.etiquetas.filter((e) => e && categoriaEhValida(e.categoria));
    dbRef.etiquetas.forEach((e) => {
        e.nome = limparNomeEtiqueta(e.nome);
        e.notas = typeof e.notas === 'string' ? e.notas : '';
    });
    const antes = dbRef.etiquetas.length;
    todosOsTextos(dbRef).forEach((t) => migrarEtiquetasDoTexto(dbRef, t));
    return dbRef.etiquetas.length - antes;
}

// Nomes que um campo de etiquetas de um item de OUTRO arquivo (importação)
// guarda: lista de ids (resolvidos pelo `etiquetas` do próprio arquivo),
// lista de nomes ou texto "a, b" de JSON antigo. Id sem registro no arquivo
// é descartado.
export function nomesDeEtiquetasDaOrigem(payload, valor) {
    if (valor == null || valor === '') return [];
    if (!Array.isArray(valor)) return nomesDeEtiquetasDigitados(valor);
    const cadastro = Array.isArray(payload?.etiquetas) ? payload.etiquetas : [];
    return valor
        .map((v) => (typeof v === 'number' ? cadastro.find((e) => e?.id == v)?.nome : v))
        .map((v) => limparNomeEtiqueta(v))
        .filter(Boolean);
}

// Os sete campos do texto como listas de NOMES, para os `.json` que saem do
// app (o id do cadastro não vale em outro acervo). Só inclui o campo que o
// texto tem. Campo ainda em texto antigo ("a, b") vira lista de nomes.
export function etiquetasParaExportar(dbRef, item) {
    const saida = {};
    Object.entries(ETIQUETAS_CATEGORIAS).forEach(([, campo]) => {
        if (!item || item[campo] === undefined) return;
        const valor = item[campo];
        if (Array.isArray(valor)) {
            const cadastro = dbRef?.etiquetas || [];
            saida[campo] = valor
                .map((v) => (typeof v === 'number' ? cadastro.find((e) => e.id == v)?.nome : v))
                .map((v) => limparNomeEtiqueta(v))
                .filter(Boolean);
        } else {
            saida[campo] = nomesDeEtiquetasDigitados(valor);
        }
    });
    return saida;
}

// ─── Edição em massa ───────────────────────────────────────────────────

// Acrescenta as etiquetas `nomes` (da categoria) aos textos, criando no
// cadastro a que ainda não existe. Quem já tem a etiqueta não muda.
// Devolve `{ vinculos, textos }` (vínculos novos e textos que mudaram).
export function adicionarEtiquetasAosTextos(dbRef, itens, categoria, nomes) {
    if (!categoriaEhValida(categoria)) return { vinculos: 0, textos: 0 };
    const campo = ETIQUETAS_CATEGORIAS[categoria];
    const ids = resolverEtiquetasEditadas(dbRef, categoria, nomes);
    let vinculos = 0;
    let textos = 0;
    (itens || []).forEach((t) => {
        migrarEtiquetasDoTexto(dbRef, t);
        const atuais = Array.isArray(t[campo]) ? t[campo] : [];
        const novos = ids.filter((id) => !atuais.some((x) => x == id));
        if (!novos.length) return;
        t[campo] = [...atuais, ...novos];
        vinculos += novos.length;
        textos += 1;
    });
    return { vinculos, textos };
}

// Tira as etiquetas `nomes` (da categoria) dos textos. Nome sem etiqueta no
// cadastro não faz nada (e não cria registro). A etiqueta continua no
// cadastro, mesmo sem uso. Devolve `{ vinculos, textos }`.
export function removerEtiquetasDosTextos(dbRef, itens, categoria, nomes) {
    if (!categoriaEhValida(categoria)) return { vinculos: 0, textos: 0 };
    const campo = ETIQUETAS_CATEGORIAS[categoria];
    // Texto ainda no formato antigo ganha o cadastro antes de procurar o id.
    (itens || []).forEach((t) => migrarEtiquetasDoTexto(dbRef, t));
    const ids = (nomes || [])
        .map((nome) => acharPorNome(dbRef, categoria, limparNomeEtiqueta(nome))?.id)
        .filter((id) => id != null);
    let vinculos = 0;
    let textos = 0;
    (itens || []).forEach((t) => {
        const atuais = Array.isArray(t[campo]) ? t[campo] : [];
        const restantes = atuais.filter((x) => !ids.some((id) => id == x));
        if (restantes.length === atuais.length) return;
        vinculos += atuais.length - restantes.length;
        t[campo] = restantes;
        textos += 1;
    });
    return { vinculos, textos };
}

// ─── Uso e consultas ───────────────────────────────────────────────────

// Mapa id → quantos textos (Poemas e Prosas) usam a etiqueta.
export function contarTextosPorEtiqueta(dbRef) {
    const contagem = new Map();
    todosOsTextos(dbRef).forEach((t) => {
        const vistos = new Set();
        Object.keys(ETIQUETAS_CATEGORIAS).forEach((categoria) => {
            idsDeEtiquetasDoTexto(dbRef, t, categoria).forEach((id) => {
                if (vistos.has(String(id))) return;
                vistos.add(String(id));
                contagem.set(id, (contagem.get(id) || 0) + 1);
            });
        });
    });
    return contagem;
}

// Ids de Poemas e Prosas que usam a etiqueta.
export function textosDaEtiqueta(dbRef, id) {
    const e = acharEtiqueta(dbRef, id);
    if (!e) return { poemasIds: [], prosasIds: [] };
    const usa = (t) => idsDeEtiquetasDoTexto(dbRef, t, e.categoria).some((x) => x == id);
    return {
        poemasIds: (dbRef.poemas || []).filter(usa).map((t) => t.id),
        prosasIds: (dbRef.prosas || []).filter(usa).map((t) => t.id),
    };
}

// Etiquetas de uma categoria em ordem alfabética, com a contagem de textos.
export function etiquetasDaCategoria(dbRef, categoria) {
    const uso = contarTextosPorEtiqueta(dbRef);
    return (dbRef.etiquetas || [])
        .filter((e) => e.categoria === categoria)
        .map((e) => ({ ...e, textos: uso.get(e.id) || 0 }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Etiquetas cadastradas que nenhum texto usa (para triagem e limpeza).
export function etiquetasSemTexto(dbRef) {
    const uso = contarTextosPorEtiqueta(dbRef);
    return (dbRef.etiquetas || []).filter((e) => !uso.get(e.id));
}

// ─── Renomear, excluir, mesclar, mover ─────────────────────────────────

// Renomeia. Os textos guardam ids e não mudam. Recusa nome vazio ou que já
// pertença a OUTRA etiqueta da mesma categoria (o caminho é mesclar).
// Mudar só caixa/acentuação do próprio nome é permitido.
export function renomearEtiqueta(dbRef, id, novoNome) {
    const e = acharEtiqueta(dbRef, id);
    const nome = limparNomeEtiqueta(novoNome);
    if (!e) return { ok: false, motivo: 'inexistente' };
    if (!nome) return { ok: false, motivo: 'vazio' };
    const duplicada = acharPorNome(dbRef, e.categoria, nome, id);
    if (duplicada) return { ok: false, motivo: 'duplicado', existente: duplicada };
    const antes = e.nome;
    e.nome = nome;
    return {
        ok: true,
        textos: contarTextosPorEtiqueta(dbRef).get(e.id) || 0,
        desfazer: () => {
            e.nome = antes;
        },
    };
}

// Só se nenhum texto usa a etiqueta (senão o texto ficaria com id órfão).
export function podeExcluirEtiqueta(dbRef, id) {
    const e = acharEtiqueta(dbRef, id);
    if (!e) return { ok: false, motivo: 'inexistente' };
    const textos = contarTextosPorEtiqueta(dbRef).get(e.id) || 0;
    if (textos > 0) return { ok: false, motivo: 'em-uso', textos };
    return { ok: true };
}

export function excluirEtiquetaDoCadastro(dbRef, id) {
    const pode = podeExcluirEtiqueta(dbRef, id);
    if (!pode.ok) return pode;
    const indice = dbRef.etiquetas.findIndex((e) => e.id == id);
    const [removida] = dbRef.etiquetas.splice(indice, 1);
    return {
        ok: true,
        desfazer: () => {
            if (!dbRef.etiquetas.some((e) => e.id == removida.id)) {
                dbRef.etiquetas.splice(Math.min(indice, dbRef.etiquetas.length), 0, removida);
            }
        },
    };
}

// Troca `de` por `para` na lista de ids do campo, sem repetir e mantendo
// a posição de quem entra.
function trocarId(lista, de, para) {
    const saida = [];
    lista.forEach((id) => {
        const novo = id == de ? para : id;
        if (!saida.some((x) => x == novo)) saida.push(novo);
    });
    return saida;
}

// Mescla `origemId` em `destinoId` (mesma categoria): todo texto da origem
// passa ao destino (uma entrada só se tinha os dois), a nota da origem é
// somada à do destino e a origem sai do cadastro. Não salva. Devolve
// `{ ok, motivo?, textos, desfazer }`.
export function mesclarEtiquetas(dbRef, origemId, destinoId) {
    if (origemId == destinoId) return { ok: false, motivo: 'igual' };
    const origem = acharEtiqueta(dbRef, origemId);
    const destino = acharEtiqueta(dbRef, destinoId);
    if (!origem || !destino) return { ok: false, motivo: 'inexistente' };
    if (origem.categoria !== destino.categoria)
        return { ok: false, motivo: 'categorias-diferentes' };

    const campo = ETIQUETAS_CATEGORIAS[origem.categoria];
    const indiceOrigem = dbRef.etiquetas.findIndex((e) => e.id == origemId);
    const notasDestinoAntes = destino.notas;
    const clusterDestinoAntes = Object.prototype.hasOwnProperty.call(destino, 'clusterId')
        ? { valor: destino.clusterId }
        : null;
    const marcasAntes = dbRef.etiquetas.map((e) => ({
        etiqueta: e,
        tinha: Object.prototype.hasOwnProperty.call(e, 'naoIguais'),
        naoIguais: Array.isArray(e.naoIguais) ? [...e.naoIguais] : undefined,
    }));
    const textosAntes = [];
    todosOsTextos(dbRef).forEach((t) => {
        if (!Array.isArray(t[campo]) || !t[campo].some((id) => id == origemId)) return;
        textosAntes.push({ texto: t, lista: [...t[campo]] });
        t[campo] = trocarId(t[campo], origemId, destino.id);
    });

    const notaOrigem = String(origem.notas || '').trim();
    const notaDestino = String(destino.notas || '').trim();
    if (notaOrigem && notaOrigem !== notaDestino) {
        destino.notas = notaDestino ? `${notaDestino}\n\n${notaOrigem}` : notaOrigem;
    }

    // "Não são iguais" da origem passam ao destino (sem apontar para si).
    dbRef.etiquetas.forEach((e) => {
        if (e === origem || e === destino || !Array.isArray(e.naoIguais)) return;
        if (!e.naoIguais.some((id) => id == origemId)) return;
        e.naoIguais = trocarId(e.naoIguais, origemId, destino.id);
    });
    const herdadas = [
        ...(Array.isArray(destino.naoIguais) ? destino.naoIguais : []),
        ...(Array.isArray(origem.naoIguais) ? origem.naoIguais : []),
    ]
        .filter((id) => id != destino.id && id != origemId)
        .filter((id, i, lista) => lista.findIndex((x) => x == id) === i);
    if (herdadas.length > 0) destino.naoIguais = herdadas;
    else delete destino.naoIguais;

    // Tag cluster (Fase 17): o destino herda o da origem quando não tem o seu.
    if (destino.clusterId == null && origem.clusterId != null) {
        destino.clusterId = origem.clusterId;
    }

    dbRef.etiquetas = dbRef.etiquetas.filter((e) => e.id != origemId);

    const desfazer = () => {
        if (clusterDestinoAntes) destino.clusterId = clusterDestinoAntes.valor;
        else delete destino.clusterId;
        textosAntes.forEach(({ texto, lista }) => {
            texto[campo] = lista;
        });
        destino.notas = notasDestinoAntes;
        if (!dbRef.etiquetas.some((e) => e.id == origem.id)) {
            dbRef.etiquetas.splice(Math.min(indiceOrigem, dbRef.etiquetas.length), 0, origem);
        }
        marcasAntes.forEach(({ etiqueta, tinha, naoIguais }) => {
            if (tinha) etiqueta.naoIguais = naoIguais;
            else delete etiqueta.naoIguais;
        });
    };
    return { ok: true, textos: textosAntes.length, desfazer };
}

// Muda a categoria da etiqueta e a move, nos textos que a usam, do campo
// antigo para o novo (F16-D2). Recusa categoria inválida, a mesma
// categoria e destino que já tenha etiqueta de mesmo nome (aí o caminho é
// renomear ou mesclar). Não salva. Devolve `{ ok, motivo?, textos, desfazer }`.
export function moverEtiquetaDeCategoria(dbRef, id, novaCategoria) {
    const e = acharEtiqueta(dbRef, id);
    if (!e) return { ok: false, motivo: 'inexistente' };
    if (!categoriaEhValida(novaCategoria)) return { ok: false, motivo: 'categoria-invalida' };
    if (novaCategoria === e.categoria) return { ok: false, motivo: 'igual' };
    const duplicada = acharPorNome(dbRef, novaCategoria, e.nome);
    if (duplicada) return { ok: false, motivo: 'duplicado', existente: duplicada };

    const campoAntigo = ETIQUETAS_CATEGORIAS[e.categoria];
    const campoNovo = ETIQUETAS_CATEGORIAS[novaCategoria];
    const categoriaAntes = e.categoria;
    // Tag cluster (Fase 17): vale só dentro da categoria; ao mudar de
    // categoria a etiqueta sai do cluster (o Desfazer a devolve).
    const clusterAntes = Object.prototype.hasOwnProperty.call(e, 'clusterId')
        ? { valor: e.clusterId }
        : null;
    const textosAntes = [];
    todosOsTextos(dbRef).forEach((t) => {
        if (!Array.isArray(t[campoAntigo]) || !t[campoAntigo].some((x) => x == id)) return;
        textosAntes.push({
            texto: t,
            antigo: [...t[campoAntigo]],
            novo: Array.isArray(t[campoNovo]) ? [...t[campoNovo]] : t[campoNovo],
        });
        t[campoAntigo] = t[campoAntigo].filter((x) => x != id);
        const atual = Array.isArray(t[campoNovo]) ? t[campoNovo] : [];
        t[campoNovo] = atual.some((x) => x == id) ? atual : [...atual, e.id];
    });
    e.categoria = novaCategoria;
    delete e.clusterId;

    const desfazer = () => {
        e.categoria = categoriaAntes;
        if (clusterAntes) e.clusterId = clusterAntes.valor;
        textosAntes.forEach(({ texto, antigo, novo }) => {
            texto[campoAntigo] = antigo;
            if (novo === undefined) delete texto[campoNovo];
            else texto[campoNovo] = novo;
        });
    };
    return { ok: true, textos: textosAntes.length, desfazer };
}

// ─── Duplicatas ────────────────────────────────────────────────────────

function marcadasComoDiferentes(a, b) {
    return (
        (Array.isArray(a.naoIguais) && a.naoIguais.some((id) => id == b.id)) ||
        (Array.isArray(b.naoIguais) && b.naoIguais.some((id) => id == a.id))
    );
}

// Pares de etiquetas da MESMA categoria com a mesma forma escrita (mesmo
// critério dos Temas: caixa, acento, pontuação e plural simples) que a
// pessoa ainda não marcou como "não são iguais". Em cada par, `a` é a mais
// usada (empate: ordem alfabética). Nada é mesclado sozinho.
export function sugerirEtiquetasDuplicadas(dbRef) {
    const porForma = new Map();
    (dbRef.etiquetas || []).forEach((e) => {
        const forma = formaTema(e.nome);
        if (!forma) return;
        const chave = `${e.categoria}|${forma}`;
        if (!porForma.has(chave)) porForma.set(chave, []);
        porForma.get(chave).push(e);
    });
    const uso = contarTextosPorEtiqueta(dbRef);
    const textosDe = (e) => uso.get(e.id) || 0;
    const pares = [];
    porForma.forEach((grupo) => {
        for (let i = 0; i < grupo.length; i += 1) {
            for (let j = i + 1; j < grupo.length; j += 1) {
                if (marcadasComoDiferentes(grupo[i], grupo[j])) continue;
                const [a, b] = [grupo[i], grupo[j]].sort(
                    (x, y) => textosDe(y) - textosDe(x) || x.nome.localeCompare(y.nome, 'pt-BR'),
                );
                pares.push({ a, b, textosA: textosDe(a), textosB: textosDe(b) });
            }
        }
    });
    return pares.sort((p, q) => p.a.nome.localeCompare(q.a.nome, 'pt-BR'));
}

// "Não são iguais": guarda a marca nas duas etiquetas (`naoIguais: [id]`)
// e o par deixa de ser sugerido. Devolve um `desfazer`. Não salva.
export function marcarEtiquetasNaoIguais(dbRef, idA, idB) {
    if (idA == idB) return { ok: false, motivo: 'igual' };
    const a = acharEtiqueta(dbRef, idA);
    const b = acharEtiqueta(dbRef, idB);
    if (!a || !b) return { ok: false, motivo: 'inexistente' };
    const antes = [a, b].map((e) => ({
        etiqueta: e,
        tinha: Object.prototype.hasOwnProperty.call(e, 'naoIguais'),
        naoIguais: Array.isArray(e.naoIguais) ? [...e.naoIguais] : undefined,
    }));
    const marcar = (e, outra) => {
        const lista = Array.isArray(e.naoIguais) ? e.naoIguais : [];
        if (!lista.some((id) => id == outra.id)) lista.push(outra.id);
        e.naoIguais = lista;
    };
    marcar(a, b);
    marcar(b, a);
    const desfazer = () => {
        antes.forEach(({ etiqueta, tinha, naoIguais }) => {
            if (tinha) etiqueta.naoIguais = naoIguais;
            else delete etiqueta.naoIguais;
        });
    };
    return { ok: true, desfazer };
}
