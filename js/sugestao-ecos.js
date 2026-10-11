// sugestao-ecos.js: sugestão de Ecos faltantes, sob demanda (Fase 11,
// etapa 4b, decisão F11-D7).
//
// A partir de UMA pessoa ou UM personagem, lista os pares de textos que
// compartilham essa presença e ainda não têm Eco entre si. Nunca é aviso
// automático: presença em comum não gera Eco (F11-D5), e uma pessoa muito
// citada é recorrência geral, não ligação deliberada. Quem decide é o autor;
// a sugestão só poupa o trabalho de procurar.
//
// O Eco é unidirecional, do texto mais NOVO para o mais ANTIGO e mora no mais
// novo (`conceitos.ecos` dele, com `id` do alvo). A direção sugerida vem da
// data de escrita e só é afirmada quando as datas a determinam com certeza
// (mesmo critério de `violaOrdemDeDatas`: ano igual, ou data ausente, não
// decide). Sem certeza, o par vem sem direção e a pessoa escolhe.
//
// Par ignorado: `dbRef.ecosIgnorados = [{ especie, id, chave }]`. Vale para a
// figura que foi ignorada (ignorar o par para a Iara não o esconde para a
// Marina, porque o motivo é outro). `chave` é canônica (os dois textos em
// ordem), então não depende de qual texto veio primeiro.
//
// Funções puras sobre o `dbRef`: sem DOM e sem `save()`.

import { violaOrdemDeDatas } from './utils.js';
import { especieDoTipoEco, tipoEcoDaEspecie, normalizarAncorasEco } from './ancora-eco.js';

export const ESPECIES_SUGESTAO = ['personagem', 'pessoa'];

const COLECAO_POR_ESPECIE = { personagem: 'personagens', pessoa: 'pessoas' };
const CAMPO_ID_VINCULO = { personagem: 'personagemId', pessoa: 'pessoaId' };
const CAMPO_LISTA_TEXTO = { personagem: 'personagens', pessoa: 'pessoas' };

// Papéis "de superfície": o texto só cita ou evoca, sem a figura estar em
// cena (ou, no caso da pessoa, sem ser tema do texto). Par em que os DOIS
// lados só têm isso é a recorrência geral que a F11-D7 manda não sugerir
// por padrão.
const PAPEIS_SUPERFICIE = {
    personagem: ['Menção', 'Alusão'],
    pessoa: ['Mencionado(a)', 'Aludido(a)'],
};

// ─── Textos do sujeito ───────────────────────────────────────

// Forte = o texto tem a figura em algum papel que não é só de superfície.
// Vínculo sem nenhum papel marcado conta como forte: "ainda não preenchido"
// não é motivo para esconder o texto.
export function vinculoForte(especie, papeis) {
    const lista = Array.isArray(papeis) ? papeis : [];
    if (!lista.length) return true;
    return lista.some((p) => !PAPEIS_SUPERFICIE[especie].includes(p));
}

/**
 * Poemas e prosas vinculados ao sujeito (`especie` + `id`), com o vínculo.
 * Cada entrada: { col, item, papeis, forte }.
 */
export function textosDoSujeito(dbRef, especie, id) {
    const campoId = CAMPO_ID_VINCULO[especie];
    const campoLista = CAMPO_LISTA_TEXTO[especie];
    const saida = [];
    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((item) => {
            const vinculo = (item[campoLista] || []).find((v) => v[campoId] == id);
            if (!vinculo) return;
            const papeis = Array.isArray(vinculo.papeis) ? vinculo.papeis : [];
            saida.push({ col, item, papeis, forte: vinculoForte(especie, papeis) });
        });
    });
    return saida;
}

// ─── Eco existente e direção ─────────────────────────────────

// Já há Eco entre os dois textos, de qualquer tipo e em qualquer sentido?
export function temEcoEntre(textoA, textoB) {
    const aponta = (dono, alvo) => (dono?.conceitos?.ecos || []).some((e) => e.id == alvo?.id);
    return aponta(textoA, textoB) || aponta(textoB, textoA);
}

// Data usada para ordenar: a de escrita, ou o ano solto de registros antigos.
function dataDoTexto(item) {
    if (item?.dataEscrita) return item.dataEscrita;
    return item?.ano ? { ano: item.ano } : null;
}

/**
 * Qual dos dois é, com certeza, o mais novo (o que guarda o Eco)? 'a', 'b' ou
 * null quando as datas não decidem (iguais no ano, sobrepostas ou ausentes).
 */
export function donoPelaData(textoA, textoB) {
    const da = dataDoTexto(textoA);
    const db_ = dataDoTexto(textoB);
    if (violaOrdemDeDatas(da, db_)) return 'a'; // B é certamente anterior a A
    if (violaOrdemDeDatas(db_, da)) return 'b';
    return null;
}

// ─── Sugestão ────────────────────────────────────────────────

// Os dois ids da espécie podem repetir entre poema e prosa, então a chave do
// texto leva a coleção.
const chaveTexto = (col, id) => `${col}:${id}`;

// Chave canônica do par: as duas chaves de texto em ordem alfabética.
export function chaveDoPar(colA, idA, colB, idB) {
    return [chaveTexto(colA, idA), chaveTexto(colB, idB)].sort().join('|');
}

function ignoradoNoAcervo(dbRef, especie, id, chave) {
    return (dbRef.ecosIgnorados || []).some(
        (e) => e.especie === especie && e.id == id && e.chave === chave,
    );
}

/**
 * Pares de textos que compartilham o sujeito e não têm Eco entre si.
 *
 * Retorna { nome, especie, totalTextos, totalPares, comEco, superficiais,
 * pares, ignorados }. `ignorados` são os pares que a pessoa mandou ignorar
 * para esta figura (mesmo formato, fora de `pares` e de `superficiais`).
 * `pares` já vem ordenado e filtrado:
 * - força 2: o sujeito tem papel forte nos dois textos; 1: em um deles; 0: só
 *   menção/alusão nos dois. Os de força 0 só entram com `incluirSuperficiais`
 *   (F11-D7); `superficiais` diz quantos ficaram de fora por isso.
 * - ordem: força decrescente, depois título (estável, sem depender da ordem
 *   do acervo).
 * Cada par: { chave, forca, dono, a, b } com a/b = { col, id, titulo, papeis,
 * forte, dataEscrita }; `dono` é 'a', 'b' ou null (direção indefinida).
 */
export function sugerirEcos(dbRef, especie, id, { incluirSuperficiais = false } = {}) {
    const sujeito = (dbRef[COLECAO_POR_ESPECIE[especie]] || []).find((x) => x.id == id);
    const textos = textosDoSujeito(dbRef, especie, id);
    const pares = [];
    let comEco = 0;
    let superficiais = 0;
    const ignorados = [];

    for (let i = 0; i < textos.length; i++) {
        for (let j = i + 1; j < textos.length; j++) {
            const x = textos[i];
            const y = textos[j];
            if (temEcoEntre(x.item, y.item)) {
                comEco++;
                continue;
            }
            const chave = chaveDoPar(x.col, x.item.id, y.col, y.item.id);
            const ignorado = ignoradoNoAcervo(dbRef, especie, id, chave);
            const forca = (x.forte ? 1 : 0) + (y.forte ? 1 : 0);
            if (forca === 0 && !incluirSuperficiais && !ignorado) {
                superficiais++;
                continue;
            }
            const lado = (t) => ({
                col: t.col,
                id: t.item.id,
                titulo: t.item.titulo || '',
                papeis: t.papeis,
                forte: t.forte,
                dataEscrita: dataDoTexto(t.item),
            });
            (ignorado ? ignorados : pares).push({
                chave,
                forca,
                dono: donoPelaData(x.item, y.item),
                a: lado(x),
                b: lado(y),
            });
        }
    }

    const ordem = (p, q) =>
        q.forca - p.forca ||
        p.a.titulo.localeCompare(q.a.titulo, 'pt-BR') ||
        p.b.titulo.localeCompare(q.b.titulo, 'pt-BR');
    pares.sort(ordem);
    ignorados.sort(ordem);

    return {
        nome: sujeito?.nome || '',
        especie,
        totalTextos: textos.length,
        totalPares: (textos.length * (textos.length - 1)) / 2,
        comEco,
        superficiais,
        pares,
        ignorados,
    };
}

// ─── Criar e desfazer ────────────────────────────────────────

function textoDaColecao(dbRef, col, id) {
    return (dbRef[col] || []).find((t) => t.id == id) || null;
}

/**
 * Cria o Eco do par: o texto `dono` ('a' ou 'b') ecoa o outro, com o tipo
 * "Personagem em comum" ou "Pessoa em comum" e o sujeito como âncora. Não
 * persiste (quem chama faz o `save()`). Recusa, devolvendo null, se um dos
 * textos sumiu, se o sujeito não está mais vinculado aos dois ou se o par já
 * ganhou um Eco entre uma sugestão e o clique.
 * Devolve { donoCol, donoId, alvoCol, alvoId, eco } para o "Desfazer".
 */
export function criarEcoSugerido(dbRef, par, especie, id, dono) {
    if (dono !== 'a' && dono !== 'b') return null;
    const tipo = tipoEcoDaEspecie(especie);
    if (!tipo || especieDoTipoEco(tipo) !== especie) return null;
    const ladoDono = par[dono];
    const ladoAlvo = par[dono === 'a' ? 'b' : 'a'];
    const textoDono = textoDaColecao(dbRef, ladoDono.col, ladoDono.id);
    const textoAlvo = textoDaColecao(dbRef, ladoAlvo.col, ladoAlvo.id);
    if (!textoDono || !textoAlvo) return null;
    if (temEcoEntre(textoDono, textoAlvo)) return null;
    const campoId = CAMPO_ID_VINCULO[especie];
    const campoLista = CAMPO_LISTA_TEXTO[especie];
    const nosDois = [textoDono, textoAlvo].every((t) =>
        (t[campoLista] || []).some((v) => v[campoId] == id),
    );
    if (!nosDois) return null;

    const ancoras = normalizarAncorasEco([{ especie, id }], tipo);
    const eco = { id: textoAlvo.id, tipo, texto: '', ancoras };
    if (!textoDono.conceitos || typeof textoDono.conceitos !== 'object') textoDono.conceitos = {};
    if (!Array.isArray(textoDono.conceitos.ecos)) textoDono.conceitos.ecos = [];
    textoDono.conceitos.ecos.push(eco);
    return {
        donoCol: ladoDono.col,
        donoId: textoDono.id,
        alvoCol: ladoAlvo.col,
        alvoId: textoAlvo.id,
        eco,
    };
}

/**
 * Tira o Eco criado por criarEcoSugerido. Procura pelo próprio objeto; se o
 * acervo foi recarregado e a referência se perdeu, cai para o Eco de mesmo
 * alvo, tipo e âncora, e só se ele ainda estiver sem nota (nada que a pessoa
 * tenha escrito depois é apagado). Devolve true se removeu.
 */
export function desfazerEcoSugerido(dbRef, registro) {
    const dono = textoDaColecao(dbRef, registro.donoCol, registro.donoId);
    const ecos = dono?.conceitos?.ecos;
    if (!Array.isArray(ecos)) return false;
    let pos = ecos.indexOf(registro.eco);
    if (pos < 0) {
        const { id, tipo, ancoras } = registro.eco;
        pos = ecos.findIndex(
            (e) =>
                e.id == id &&
                e.tipo === tipo &&
                !String(e.texto || '').trim() &&
                JSON.stringify(e.ancoras || []) === JSON.stringify(ancoras || []),
        );
    }
    if (pos < 0) return false;
    ecos.splice(pos, 1);
    return true;
}

// ─── Ignorar ─────────────────────────────────────────────────

/**
 * Marca o par como ignorado para a figura. Idempotente. Não persiste (quem
 * chama faz o `save()`). Devolve true se acrescentou.
 */
export function ignorarPar(dbRef, especie, id, chave) {
    if (!ESPECIES_SUGESTAO.includes(especie) || !chave) return false;
    if (!Array.isArray(dbRef.ecosIgnorados)) dbRef.ecosIgnorados = [];
    if (ignoradoNoAcervo(dbRef, especie, id, chave)) return false;
    dbRef.ecosIgnorados.push({ especie, id, chave });
    return true;
}

// Tira a marca. Devolve true se havia.
export function restaurarPar(dbRef, especie, id, chave) {
    const lista = dbRef.ecosIgnorados;
    if (!Array.isArray(lista)) return false;
    const pos = lista.findIndex((e) => e.especie === especie && e.id == id && e.chave === chave);
    if (pos < 0) return false;
    lista.splice(pos, 1);
    return true;
}

/**
 * Idempotente. Limpa o que perdeu o sentido: entrada malformada, figura ou
 * texto que não existe mais, e par que já ganhou Eco (não há mais o que
 * ignorar). Devolve quantas soltou.
 */
export function sincronizarParesIgnorados(dbRef) {
    if (!Array.isArray(dbRef.ecosIgnorados)) return 0;
    const antes = dbRef.ecosIgnorados.length;
    const vistos = new Set();
    dbRef.ecosIgnorados = dbRef.ecosIgnorados.filter((e) => {
        if (!e || !ESPECIES_SUGESTAO.includes(e.especie) || typeof e.chave !== 'string') {
            return false;
        }
        const dupla = e.chave.split('|');
        if (dupla.length !== 2) return false;
        const unica = `${e.especie}:${e.id}:${e.chave}`;
        if (vistos.has(unica)) return false;
        vistos.add(unica);
        if (!(dbRef[COLECAO_POR_ESPECIE[e.especie]] || []).some((x) => x.id == e.id)) return false;
        const textos = dupla.map((k) => {
            const [col, tid] = k.split(':');
            return textoDaColecao(dbRef, col, tid);
        });
        if (textos.some((t) => !t)) return false;
        return !temEcoEntre(textos[0], textos[1]);
    });
    return antes - dbRef.ecosIgnorados.length;
}
