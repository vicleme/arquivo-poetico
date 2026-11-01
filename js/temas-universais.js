// temas-universais.js: Temas universais, a vitrine do sorteio de texto (31/10/2026).
//
// Parte pura (sem DOM e sem tocar em `db.js`). Um Tema universal é um rótulo de
// convite para quem lê ("Quando o amor acaba") que reúne Temas do acervo. Não é
// Assunto: o Assunto organiza o cadastro e não tem limite; o universal é uma
// vitrine para o leitor, tem no máximo 12 e só o sorteio o usa. Não vai no
// texto: o texto continua tendo só Temas, e o universal os alcança por
// `temaIds`.
//
// Forma dos dados: `dbRef.temasUniversais = [{ id, nome, temaIds }]`, na ordem
// em que a tela deve mostrar. Um Tema pode estar em mais de um universal. Todas
// as funções recebem o `db` (ou uma cópia dele nos testes) e criam o array se
// ele ainda não existe.

import { gerarId, chaveTema } from './utils.js';

export const MAX_TEMAS_UNIVERSAIS = 12;

// Nome de convite: espaços colapsados e sem sobra nas pontas.
export function limparNomeUniversal(nome) {
    return String(nome ?? '')
        .replace(/\s+/g, ' ')
        .trim();
}

function lista(dbRef) {
    if (!Array.isArray(dbRef.temasUniversais)) dbRef.temasUniversais = [];
    return dbRef.temasUniversais;
}

// Leitura sem efeito colateral (prévias não podem criar o array no `db`).
function lidos(dbRef) {
    return Array.isArray(dbRef.temasUniversais) ? dbRef.temasUniversais : [];
}

function achar(dbRef, id) {
    return lista(dbRef).find((u) => String(u.id) === String(id));
}

function nomeJaExiste(dbRef, nome, ignorarId = null) {
    const chave = chaveTema(nome);
    return lista(dbRef).some(
        (u) => chaveTema(u.nome) === chave && String(u.id) !== String(ignorarId),
    );
}

// Ids que existem no cadastro de Temas, sem repetir, na ordem recebida. Um id
// pode chegar como número ou como texto; o cadastro manda na forma gravada.
function idsExistentes(dbRef, ids) {
    const porChave = new Map((dbRef.temas || []).map((t) => [String(t.id), t.id]));
    const vistos = new Set();
    const saida = [];
    (Array.isArray(ids) ? ids : []).forEach((id) => {
        const chave = String(id);
        if (!porChave.has(chave) || vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(porChave.get(chave));
    });
    return saida;
}

// Quantos universais ainda cabem.
export function vagasDeUniversais(dbRef) {
    return Math.max(0, MAX_TEMAS_UNIVERSAIS - lidos(dbRef).length);
}

// Cria um universal no fim da lista. Motivos de recusa: 'vazio' (sem nome),
// 'duplicado' (já há um universal com esse nome, sem caixa nem acento) e
// 'limite' (já são 12). Temas que não existem no cadastro são ignorados.
// Devolve `{ ok, universal }` ou `{ ok: false, motivo }`.
export function criarTemaUniversal(dbRef, nome, temaIds = []) {
    const limpo = limparNomeUniversal(nome);
    if (!chaveTema(limpo)) return { ok: false, motivo: 'vazio' };
    if (nomeJaExiste(dbRef, limpo)) return { ok: false, motivo: 'duplicado' };
    if (lista(dbRef).length >= MAX_TEMAS_UNIVERSAIS) return { ok: false, motivo: 'limite' };
    const universal = { id: gerarId(), nome: limpo, temaIds: idsExistentes(dbRef, temaIds) };
    lista(dbRef).push(universal);
    return { ok: true, universal };
}

// Renomeia. Motivos: 'inexistente', 'vazio', 'duplicado'. Trocar só a caixa ou
// o acento do próprio nome é permitido.
export function renomearTemaUniversal(dbRef, id, nome) {
    const universal = achar(dbRef, id);
    if (!universal) return { ok: false, motivo: 'inexistente' };
    const limpo = limparNomeUniversal(nome);
    if (!chaveTema(limpo)) return { ok: false, motivo: 'vazio' };
    if (nomeJaExiste(dbRef, limpo, universal.id)) return { ok: false, motivo: 'duplicado' };
    universal.nome = limpo;
    return { ok: true, universal };
}

// Troca os Temas do universal pela lista recebida (sem repetir, só os que
// existem no cadastro). Um universal pode ficar sem Temas: a tela do sorteio o
// esconde até ter o que sortear. Motivo de recusa: 'inexistente'.
export function definirTemasDoUniversal(dbRef, id, temaIds) {
    const universal = achar(dbRef, id);
    if (!universal) return { ok: false, motivo: 'inexistente' };
    universal.temaIds = idsExistentes(dbRef, temaIds);
    return { ok: true, universal };
}

// Remove o universal. Os Temas e os textos não mudam.
export function excluirTemaUniversal(dbRef, id) {
    const itens = lista(dbRef);
    const idx = itens.findIndex((u) => String(u.id) === String(id));
    if (idx === -1) return { ok: false, motivo: 'inexistente' };
    const [removido] = itens.splice(idx, 1);
    return { ok: true, removido };
}

// Move o universal uma posição (-1 sobe, +1 desce). Na ponta, não faz nada e
// devolve `{ ok: true, moveu: false }`.
export function moverTemaUniversal(dbRef, id, delta) {
    const itens = lista(dbRef);
    const de = itens.findIndex((u) => String(u.id) === String(id));
    if (de === -1) return { ok: false, motivo: 'inexistente' };
    const para = de + (delta < 0 ? -1 : 1);
    if (para < 0 || para >= itens.length) return { ok: true, moveu: false };
    const [item] = itens.splice(de, 1);
    itens.splice(para, 0, item);
    return { ok: true, moveu: true };
}

// ─── Leitura e inclusão pela aba Temas ─────────────────────────────────

// Os universais na ordem da tela, sem criar o array no `db`.
export function listarTemasUniversais(dbRef) {
    return lidos(dbRef);
}

// Os universais (convites) que reúnem o Tema `temaId`, na ordem da tela.
export function universaisDoTema(dbRef, temaId) {
    return lidos(dbRef).filter((u) =>
        (u.temaIds || []).some((tid) => String(tid) === String(temaId)),
    );
}

// Acrescenta os Temas `temaIds` ao universal `id`, sem repetir e só com os que
// existem no cadastro. Devolve `{ ok, adicionados, jaTinham, desfazer }`;
// `ok: false` com motivo 'inexistente' (universal) ou 'vazio' (nenhum Tema
// existente na lista). Só conta como adicionado o Tema que ainda não estava.
// `desfazer()` devolve a lista de Temas do universal ao que era antes.
export function adicionarTemasAoUniversal(dbRef, id, temaIds) {
    const universal = achar(dbRef, id);
    if (!universal) return { ok: false, motivo: 'inexistente' };
    const pedidos = idsExistentes(dbRef, temaIds);
    if (pedidos.length === 0) return { ok: false, motivo: 'vazio' };
    const antes = [...(universal.temaIds || [])];
    const novos = pedidos.filter((tid) => !antes.some((x) => String(x) === String(tid)));
    if (novos.length > 0) universal.temaIds = [...antes, ...novos];
    return {
        ok: true,
        adicionados: novos.length,
        jaTinham: pedidos.length - novos.length,
        universal,
        desfazer() {
            const atual = achar(dbRef, id);
            if (atual) atual.temaIds = antes;
        },
    };
}

// ─── Limpeza quando um Tema some ou é mesclado ─────────────────────────

// Tira `temaId` de todos os universais (Tema excluído). Devolve em quantos
// universais ele estava.
export function removerTemaDosUniversais(dbRef, temaId) {
    let afetados = 0;
    lidos(dbRef).forEach((u) => {
        const antes = (u.temaIds || []).length;
        u.temaIds = (u.temaIds || []).filter((tid) => String(tid) !== String(temaId));
        if (u.temaIds.length !== antes) afetados += 1;
    });
    return afetados;
}

// Troca `origemId` por `destinoId` nos universais (Tema mesclado), sem deixar
// o destino repetido e mantendo a posição da origem. Devolve quantos universais
// mudaram.
export function substituirTemaNosUniversais(dbRef, origemId, destinoId) {
    let afetados = 0;
    lidos(dbRef).forEach((u) => {
        const ids = u.temaIds || [];
        if (!ids.some((tid) => String(tid) === String(origemId))) return;
        const novo = [];
        ids.forEach((tid) => {
            const eh = String(tid) === String(origemId) ? destinoId : tid;
            if (!novo.some((x) => String(x) === String(eh))) novo.push(eh);
        });
        u.temaIds = novo;
        afetados += 1;
    });
    return afetados;
}

// Foto dos Temas de cada universal, para o `desfazer` de quem exclui ou mescla
// Temas. Devolve uma função que restaura só as listas `temaIds` (o universal
// que foi excluído no meio do caminho continua excluído).
export function guardarTemasDosUniversais(dbRef) {
    const fotos = lidos(dbRef).map((u) => ({ universal: u, temaIds: [...(u.temaIds || [])] }));
    return () => {
        fotos.forEach(({ universal, temaIds }) => {
            universal.temaIds = [...temaIds];
        });
    };
}

// Varre os universais e tira os ids que não existem mais no cadastro de Temas
// (e as repetições). Serve de rede de segurança depois de importar, restaurar
// um backup ou de qualquer caminho que apague Tema sem passar pelas funções
// acima. Devolve quantos ids saíram.
export function limparTemasUniversais(dbRef) {
    let removidos = 0;
    lidos(dbRef).forEach((u) => {
        const antes = (u.temaIds || []).length;
        u.temaIds = idsExistentes(dbRef, u.temaIds);
        removidos += antes - u.temaIds.length;
    });
    return removidos;
}

// Põe em ordem o que veio de fora (backup, importação): descarta entrada que
// não é objeto, sem nome ou com nome repetido, dá id a quem não tem, corta no
// teto de 12 e tira os Temas que não existem. Idempotente. Devolve quantos
// universais saíram.
export function sanearTemasUniversais(dbRef) {
    const recebidos = Array.isArray(dbRef.temasUniversais) ? dbRef.temasUniversais : [];
    const vistos = new Set();
    const bons = [];
    recebidos.forEach((u) => {
        if (!u || typeof u !== 'object') return;
        const nome = limparNomeUniversal(u.nome);
        const chave = chaveTema(nome);
        if (!chave || vistos.has(chave) || bons.length >= MAX_TEMAS_UNIVERSAIS) return;
        vistos.add(chave);
        u.nome = nome;
        if (u.id === undefined || u.id === null || u.id === '') u.id = gerarId();
        bons.push(u);
    });
    dbRef.temasUniversais = bons;
    limparTemasUniversais(dbRef);
    return recebidos.length - bons.length;
}

// ─── Vitrine sugerida ──────────────────────────────────────────────────

// Os 11 universais combinados com o Victor em 31/10/2026, com os Temas do
// acervo dele que cada um reúne (casados por nome, sem caixa nem acento). Fica
// uma vaga livre. Tema que não existe no cadastro é só relatado.
export const VITRINE_SUGERIDA = [
    ['Amor e desejo', ['Paixão/desejo romântico', 'Idealização do outro', 'Amor incondicional']],
    [
        'Quando o amor acaba',
        ['Término amoroso', 'Impermanência amorosa', 'Assimetria afetiva', 'Desistência'],
    ],
    [
        'Amizade e cuidado',
        ['Amizade', 'Gratidão pela amizade', 'Cuidado interpessoal', 'Confiança interpessoal'],
    ],
    [
        'Ser compreendido e a solidão',
        ['Desejo de ser compreendido', 'Invalidação emocional', 'Isolamento', 'Pertencimento'],
    ],
    ['Saudade e memória', ['Saudade', 'Memória', 'Saudosismo', 'Memória histórica']],
    ['Perda e finitude', ['Luto/finitude', 'Despedida', 'Efemeridade']],
    [
        'Quem eu sou',
        ['Autoficção', 'Multiplicidade identitária', 'Singularidade', 'Autorrepresentação'],
    ],
    [
        'Aguentar e se refazer',
        [
            'Resiliência emocional',
            'Autoacolhimento',
            'Ruminação mental',
            'Resposta ao estresse/trauma',
        ],
    ],
    [
        'O mundo hoje',
        ['Crítica político-social', 'Modernidade líquida', 'Tecnologia', 'Polarização'],
    ],
    ['Corpo e gênero', ['Pressão estética', 'Objetificação', 'Machismo']],
    ['Escrever e criar', ['Processo criativo', 'Literatura/Escrita terapêutica']],
];

// Confere a vitrine sugerida com o cadastro, sem gravar. Devolve
// `{ criar, ignorados, ausentes }`:
// - `criar`: `[{ nome, temaIds }]`, os universais que seriam criados
//   (precisam ter ao menos um Tema do cadastro e nome ainda livre; cabem só
//   enquanto houver vaga, na ordem da vitrine);
// - `ignorados`: `[{ nome, motivo }]` com 'duplicado' (já existe), 'sem-temas'
//   (nenhum dos Temas existe no cadastro) ou 'limite' (acabaram as vagas);
// - `ausentes`: `[{ universal, nomes }]` os nomes de Tema que a vitrine cita e
//   o cadastro não tem, dos universais que entram ou que sobram por falta de
//   vaga.
export function planejarVitrineSugerida(dbRef) {
    const porChave = new Map();
    (dbRef.temas || []).forEach((t) => {
        const chave = chaveTema(t.nome);
        if (chave && !porChave.has(chave)) porChave.set(chave, t.id);
    });
    const criar = [];
    const ignorados = [];
    const ausentes = [];
    const nomesVistos = new Set(lidos(dbRef).map((u) => chaveTema(u.nome)));
    let vagas = vagasDeUniversais(dbRef);
    VITRINE_SUGERIDA.forEach(([nome, nomesTemas]) => {
        const ids = [];
        const faltam = [];
        nomesTemas.forEach((nt) => {
            const id = porChave.get(chaveTema(nt));
            if (id === undefined) faltam.push(nt);
            else if (!ids.some((x) => String(x) === String(id))) ids.push(id);
        });
        if (nomesVistos.has(chaveTema(nome))) {
            ignorados.push({ nome, motivo: 'duplicado' });
            return;
        }
        if (!ids.length) {
            ignorados.push({ nome, motivo: 'sem-temas' });
            return;
        }
        if (vagas <= 0) {
            ignorados.push({ nome, motivo: 'limite' });
            if (faltam.length) ausentes.push({ universal: nome, nomes: faltam });
            return;
        }
        vagas -= 1;
        nomesVistos.add(chaveTema(nome));
        criar.push({ nome, temaIds: ids });
        if (faltam.length) ausentes.push({ universal: nome, nomes: faltam });
    });
    return { criar, ignorados, ausentes };
}

// Grava o que `planejarVitrineSugerida` previu. Só acrescenta: nunca mexe nos
// universais que já existem. Devolve o plano mais `criados` (os registros
// novos) e `desfazer()`, que tira exatamente os criados.
export function aplicarVitrineSugerida(dbRef) {
    const plano = planejarVitrineSugerida(dbRef);
    const criados = [];
    plano.criar.forEach(({ nome, temaIds }) => {
        const r = criarTemaUniversal(dbRef, nome, temaIds);
        if (r.ok) criados.push(r.universal);
    });
    return {
        ...plano,
        criados,
        desfazer() {
            criados.forEach((u) => excluirTemaUniversal(dbRef, u.id));
        },
    };
}
