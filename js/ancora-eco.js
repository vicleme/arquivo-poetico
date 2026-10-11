// ancora-eco.js: âncora do Eco (Fase 11, etapa 4a, decisão F11-D6).
//
// Um Eco é `{ id, tipo, texto, ancoras? }`. `ancoras` é a lista, opcional, de
// quem sustenta a ligação entre os dois textos: `[{ especie, id }]`, com
// `especie` 'personagem' ou 'pessoa'. O tipo do Eco define a espécie:
// "Personagem em comum" só aceita personagens e "Pessoa em comum" só aceita
// pessoas; os demais tipos não têm âncora. Presença em comum nunca gera Eco
// sozinha (F11-D5): a âncora só documenta o motivo de um Eco já decidido.
//
// Funções puras sobre o `dbRef`: sem DOM e sem `save()`. Quem chama decide
// quando persistir. Um texto é "dono" do Eco quando o Eco mora em
// `conceitos.ecos` dele; o outro texto é o alvo (`eco.id`).

export const TIPO_ECO_PERSONAGEM = 'Personagem em comum';
export const TIPO_ECO_PESSOA = 'Pessoa em comum';

export const ESPECIES_ANCORA = ['personagem', 'pessoa'];

const TIPO_POR_ESPECIE = {
    personagem: TIPO_ECO_PERSONAGEM,
    pessoa: TIPO_ECO_PESSOA,
};

const ESPECIE_POR_TIPO = {
    [TIPO_ECO_PERSONAGEM]: 'personagem',
    [TIPO_ECO_PESSOA]: 'pessoa',
};

const COLECAO_POR_ESPECIE = {
    personagem: 'personagens',
    pessoa: 'pessoas',
};

const CAMPO_ID_VINCULO = {
    personagem: 'personagemId',
    pessoa: 'pessoaId',
};

// ─── Tipo e espécie ──────────────────────────────────────────

// Espécie de âncora que o tipo aceita, ou null (tipo sem âncora).
export function especieDoTipoEco(tipo) {
    return ESPECIE_POR_TIPO[tipo] || null;
}

export function tipoEcoDaEspecie(especie) {
    return TIPO_POR_ESPECIE[especie] || null;
}

// ─── Normalização ────────────────────────────────────────────

function idNumerico(valor) {
    const n = typeof valor === 'number' ? valor : parseInt(valor, 10);
    return Number.isFinite(n) ? n : null;
}

/**
 * Lista de âncoras limpa: só espécies válidas, id numérico, sem repetição,
 * e só da espécie que o tipo aceita. Tipo sem âncora zera a lista. Lixo
 * (null, objeto sem id, espécie desconhecida) é descartado sem erro.
 */
export function normalizarAncorasEco(lista, tipo) {
    const especieDoTipo = especieDoTipoEco(tipo);
    if (!especieDoTipo || !Array.isArray(lista)) return [];
    const vistos = new Set();
    const saida = [];
    lista.forEach((a) => {
        if (!a || typeof a !== 'object') return;
        if (a.especie !== especieDoTipo) return;
        const id = idNumerico(a.id);
        if (id == null) return;
        const chave = `${a.especie}:${id}`;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        saida.push({ especie: a.especie, id });
    });
    return saida;
}

function nomeNoCadastro(dbRef, especie, id) {
    const colecao = COLECAO_POR_ESPECIE[especie];
    return (dbRef[colecao] || []).find((x) => x.id == id)?.nome || null;
}

/**
 * Idempotente. Normaliza as âncoras de todo Eco de Poema e Prosa e solta as
 * que apontam para alguém que não está mais no cadastro. Devolve quantas
 * soltou. Eco sem `ancoras` continua sem (Ecos antigos seguem válidos).
 */
export function sincronizarAncorasEco(dbRef) {
    let soltas = 0;
    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((it) => {
            (it.conceitos?.ecos || []).forEach((eco) => {
                if (!Array.isArray(eco.ancoras)) return;
                const normalizadas = normalizarAncorasEco(eco.ancoras, eco.tipo);
                const validas = normalizadas.filter((a) => nomeNoCadastro(dbRef, a.especie, a.id));
                soltas += eco.ancoras.length - validas.length;
                if (validas.length) eco.ancoras = validas;
                else delete eco.ancoras;
            });
        });
    });
    return soltas;
}

// ─── Quem existe nos dois textos ─────────────────────────────

function idsDoVinculo(item, especie) {
    const campo = CAMPO_ID_VINCULO[especie];
    const lista = especie === 'personagem' ? item?.personagens : item?.pessoas;
    return new Set((lista || []).map((v) => String(v[campo])));
}

/**
 * Candidatos a âncora: quem existe no cadastro e está vinculado aos DOIS
 * textos, ordenados por nome. Os textos são objetos com `personagens` e
 * `pessoas` (o item salvo, ou o estado atual do modal para o texto que está
 * sendo editado). Papel diferente nos dois textos não impede.
 */
export function candidatosAncora(dbRef, textoA, textoB, especie) {
    if (!ESPECIES_ANCORA.includes(especie)) return [];
    const a = idsDoVinculo(textoA, especie);
    const b = idsDoVinculo(textoB, especie);
    return (dbRef[COLECAO_POR_ESPECIE[especie]] || [])
        .filter((x) => a.has(String(x.id)) && b.has(String(x.id)))
        .map((x) => ({ id: x.id, nome: x.nome }))
        .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
}

// A âncora continua valendo quando os dois textos ainda têm o vínculo.
export function ancoraAtiva(textoDono, textoAlvo, ancora) {
    const dono = idsDoVinculo(textoDono, ancora.especie);
    const alvo = idsDoVinculo(textoAlvo, ancora.especie);
    return dono.has(String(ancora.id)) && alvo.has(String(ancora.id));
}

// ─── Rótulo ──────────────────────────────────────────────────

// "Iara, Tomás" (id fora do cadastro vira "(removido)"). Com `limite`,
// mostra os primeiros e resume o resto: "Iara, Tomás +2".
export function nomesDasAncoras(dbRef, ancoras, limite = null) {
    const nomes = (ancoras || []).map(
        (a) => nomeNoCadastro(dbRef, a.especie, a.id) || '(removido)',
    );
    if (limite == null || nomes.length <= limite) return nomes.join(', ');
    return `${nomes.slice(0, limite).join(', ')} +${nomes.length - limite}`;
}

// "Personagem em comum (Iara)"; sem âncora, só o tipo (como sempre foi).
export function rotuloEco(dbRef, eco, limite = null) {
    const tipo = eco?.tipo || '';
    if (!tipo || !eco?.ancoras?.length) return tipo;
    return `${tipo} (${nomesDasAncoras(dbRef, eco.ancoras, limite)})`;
}

// ─── Remoção de quem ancora ──────────────────────────────────

function textoPorId(dbRef, id) {
    return (
        (dbRef.poemas || []).find((p) => p.id == id) ||
        (dbRef.prosas || []).find((p) => p.id == id) ||
        null
    );
}

function colecaoDoTexto(dbRef, id) {
    if ((dbRef.poemas || []).some((p) => p.id == id)) return 'poemas';
    if ((dbRef.prosas || []).some((p) => p.id == id)) return 'prosas';
    return null;
}

/**
 * Ecos ancorados em (`especie`, `id`) que envolvem o texto `textoId`, nos
 * dois sentidos: Eco que mora nele e aponta para outro, ou Eco que mora em
 * outro e aponta para ele (o Eco mora no texto mais novo). Serve para o
 * aviso de remoção. Cada item: { donoCol, donoId, indice, outroId, titulo }
 * (`outroId` é o texto do outro lado; `titulo` é o dele).
 */
export function ecosAncoradosEnvolvendo(dbRef, textoId, especie, id) {
    const achados = [];
    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((dono) => {
            (dono.conceitos?.ecos || []).forEach((eco, indice) => {
                const ancorado = (eco.ancoras || []).some(
                    (a) => a.especie === especie && a.id == id,
                );
                if (!ancorado) return;
                let outroId = null;
                if (dono.id == textoId) outroId = eco.id;
                else if (eco.id == textoId) outroId = dono.id;
                if (outroId == null) return;
                achados.push({
                    donoCol: col,
                    donoId: dono.id,
                    indice,
                    outroId,
                    titulo: textoPorId(dbRef, outroId)?.titulo || '',
                });
            });
        });
    });
    return achados;
}

/**
 * Tira a âncora (`especie`, `id`) dos Ecos listados (resultado de
 * ecosAncoradosEnvolvendo). O Eco nunca some: se era a única âncora, fica
 * como Eco sem âncora. Devolve o que removeu, para o "Desfazer".
 */
export function removerAncoraDosEcos(dbRef, afetados, especie, id) {
    const removidos = [];
    afetados.forEach((f) => {
        const dono = textoPorId(dbRef, f.donoId);
        const eco = dono?.conceitos?.ecos?.[f.indice];
        if (!eco || !Array.isArray(eco.ancoras)) return;
        const pos = eco.ancoras.findIndex((a) => a.especie === especie && a.id == id);
        if (pos < 0) return;
        const [ancora] = eco.ancoras.splice(pos, 1);
        removidos.push({ donoId: f.donoId, indice: f.indice, posicao: pos, ancora });
        if (!eco.ancoras.length) delete eco.ancoras;
    });
    return removidos;
}

/**
 * Exclusão do cadastro (Pessoa ou Personagem): a âncora não pode apontar
 * para quem não existe, então sai de todos os Ecos. Devolve o que removeu.
 */
export function removerAncoraDoCadastro(dbRef, especie, id) {
    const removidos = [];
    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((dono) => {
            (dono.conceitos?.ecos || []).forEach((eco, indice) => {
                if (!Array.isArray(eco.ancoras)) return;
                const pos = eco.ancoras.findIndex((a) => a.especie === especie && a.id == id);
                if (pos < 0) return;
                const [ancora] = eco.ancoras.splice(pos, 1);
                removidos.push({ donoId: dono.id, indice, posicao: pos, ancora });
                if (!eco.ancoras.length) delete eco.ancoras;
            });
        });
    });
    return removidos;
}

// Devolve ao Eco as âncoras de removerAncoraDosEcos/removerAncoraDoCadastro.
export function restaurarAncoras(dbRef, removidos) {
    [...removidos].reverse().forEach((r) => {
        const dono = textoPorId(dbRef, r.donoId);
        const eco = dono?.conceitos?.ecos?.[r.indice];
        if (!eco) return;
        if (!Array.isArray(eco.ancoras)) eco.ancoras = [];
        if (eco.ancoras.some((a) => a.especie === r.ancora.especie && a.id == r.ancora.id)) return;
        eco.ancoras.splice(Math.min(r.posicao, eco.ancoras.length), 0, r.ancora);
    });
}

/**
 * Mesclagem de Pessoas: a âncora da origem passa para o destino (sem
 * duplicar quando o Eco já tinha as duas). Só Pessoa tem mesclagem hoje.
 */
export function redirecionarAncora(dbRef, especie, origemId, destinoId) {
    if (origemId == destinoId) return;
    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((dono) => {
            (dono.conceitos?.ecos || []).forEach((eco) => {
                if (!Array.isArray(eco.ancoras)) return;
                const temOrigem = eco.ancoras.some(
                    (a) => a.especie === especie && a.id == origemId,
                );
                if (!temOrigem) return;
                const temDestino = eco.ancoras.some(
                    (a) => a.especie === especie && a.id == destinoId,
                );
                if (temDestino) {
                    eco.ancoras = eco.ancoras.filter(
                        (a) => !(a.especie === especie && a.id == origemId),
                    );
                } else {
                    eco.ancoras = eco.ancoras.map((a) =>
                        a.especie === especie && a.id == origemId ? { especie, id: destinoId } : a,
                    );
                }
            });
        });
    });
}

// ─── Exportação e importação ─────────────────────────────────

// O id não vale em outro acervo: a âncora viaja com o nome.
export function ancorasParaExportar(dbRef, ancoras) {
    return (ancoras || [])
        .map((a) => ({
            especie: a.especie,
            id: a.id,
            nome: nomeNoCadastro(dbRef, a.especie, a.id) || '',
        }))
        .filter((a) => a.nome);
}

function chaveNome(nome) {
    return String(nome || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

/**
 * Âncoras de um arquivo: casa por espécie e nome (sem caixa/acento) com o
 * que já existe no acervo. Nunca cria Pessoa nem Personagem: quem não casa
 * é descartado (o texto traz os próprios vínculos, e a importação deles roda
 * antes, ver importarPersonagensDoTexto). Respeita a regra do tipo.
 */
export function ancorasImportadas(dbRef, ancoras, tipo) {
    if (!Array.isArray(ancoras)) return [];
    const resolvidas = [];
    ancoras.forEach((a) => {
        if (!a || !ESPECIES_ANCORA.includes(a.especie)) return;
        const alvo = chaveNome(a.nome);
        if (!alvo) return;
        const achado = (dbRef[COLECAO_POR_ESPECIE[a.especie]] || []).find(
            (x) => chaveNome(x.nome) === alvo,
        );
        if (achado) resolvidas.push({ especie: a.especie, id: achado.id });
    });
    return normalizarAncorasEco(resolvidas, tipo);
}

// Ecos de um texto prontos para o JSON: cada âncora leva o nome. Eco sem
// âncora passa como está (formato antigo intacto).
export function ecosParaExportar(dbRef, ecos) {
    return (ecos || []).map((eco) =>
        eco?.ancoras?.length ? { ...eco, ancoras: ancorasParaExportar(dbRef, eco.ancoras) } : eco,
    );
}

// Ecos de um arquivo, com as âncoras recasadas pelo nome no acervo de destino
// (o id de origem não vale aqui e pode bater em outra pessoa por acaso).
// Âncora que não casa sai; se era a única, o Eco fica sem o campo.
export function ecosImportados(dbRef, ecos) {
    if (!Array.isArray(ecos)) return ecos;
    return ecos.map((eco) => {
        if (!eco || typeof eco !== 'object' || !('ancoras' in eco)) return eco;
        const { ancoras, ...resto } = eco;
        const resolvidas = ancorasImportadas(dbRef, ancoras, eco.tipo);
        return resolvidas.length ? { ...resto, ancoras: resolvidas } : resto;
    });
}

// Útil para quem precisa saber em qual coleção o texto mora.
export { colecaoDoTexto };
