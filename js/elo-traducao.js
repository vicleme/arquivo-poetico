// elo-traducao.js: Elos de Tradução vistos pelo sorteio de leitura (31/10/2026).
//
// Lógica pura (sem DOM). Uma tradução e o texto traduzido são duas versões da
// mesma obra: no sorteio contam como UM texto só (senão a obra teria duas
// chances), e quem lê vê o aviso e o link para a outra versão.
//
// O vínculo vale nos dois sentidos, mesmo quando só um lado cadastrou o Elo
// (`conceitos.elos: [{ id, relacao: 'Tradução', direcao }]`, onde `id` é o do
// texto-alvo; ids nunca colidem entre poemas e prosas). O grupo é o componente
// conexo: A traduzido para B e B para C formam um grupo de três. Só a Relação
// "Tradução" agrupa; Reescrita, Versão, Variação etc. continuam textos à parte.

import { rotuloElo, direcaoInversa } from './utils.js';

export const RELACAO_TRADUCAO = 'Tradução';
export const ROTULO_TRADUCAO_GENERICO = 'Elo de tradução';

const chaveDe = (tipo, item) => `${tipo}:${item?.id}`;

function todosOsTextos(dbRef) {
    const saida = [];
    (dbRef?.poemas || []).forEach((item) => saida.push({ tipo: 'poema', item }));
    (dbRef?.prosas || []).forEach((item) => saida.push({ tipo: 'prosa', item }));
    return saida;
}

// Arestas de tradução entre textos que existem: `{ de, para, direcao }`, com
// `de` e `para` em chaves ("poema:12"). Elo cujo alvo foi apagado é ignorado.
function arestasDeTraducao(textos) {
    const porId = new Map(textos.map((t) => [String(t.item.id), t]));
    const arestas = [];
    textos.forEach(({ tipo, item }) => {
        (item.conceitos?.elos || []).forEach((elo) => {
            if (elo?.relacao !== RELACAO_TRADUCAO) return;
            const alvo = porId.get(String(elo.id));
            if (!alvo || alvo.item === item) return;
            arestas.push({
                de: chaveDe(tipo, item),
                para: chaveDe(alvo.tipo, alvo.item),
                direcao: elo.direcao,
            });
        });
    });
    return arestas;
}

// Grupos de tradução: `Map` de chave do texto para a lista de chaves do seu
// grupo (ele incluído, na ordem de poemas e depois prosas). Texto sem Elo de
// tradução não aparece no mapa.
export function gruposDeTraducao(dbRef) {
    const textos = todosOsTextos(dbRef);
    const arestas = arestasDeTraducao(textos);
    if (!arestas.length) return new Map();
    const vizinhos = new Map();
    const liga = (a, b) => {
        if (!vizinhos.has(a)) vizinhos.set(a, new Set());
        vizinhos.get(a).add(b);
    };
    arestas.forEach(({ de, para }) => {
        liga(de, para);
        liga(para, de);
    });
    const ordem = new Map(textos.map((t, i) => [chaveDe(t.tipo, t.item), i]));
    const grupos = new Map();
    const visto = new Set();
    for (const raiz of vizinhos.keys()) {
        if (visto.has(raiz)) continue;
        const fila = [raiz];
        const membros = [];
        visto.add(raiz);
        while (fila.length) {
            const atual = fila.shift();
            membros.push(atual);
            vizinhos.get(atual).forEach((v) => {
                if (!visto.has(v)) {
                    visto.add(v);
                    fila.push(v);
                }
            });
        }
        membros.sort((a, b) => ordem.get(a) - ordem.get(b));
        membros.forEach((m) => grupos.set(m, membros));
    }
    return grupos;
}

// O rótulo do vínculo, visto do texto `item`, para o texto `outro`: "Tradução
// de" ou "Traduzido para". Vem do Elo do próprio texto; se só o outro lado
// cadastrou, vem do Elo dele com a direção invertida (mesma regra do painel de
// Elos derivados do editor). Sem vínculo direto (grupo de três ou mais), o
// rótulo genérico.
export function rotuloDaTraducao(dbRef, tipo, item, outroTipo, outro) {
    const textos = todosOsTextos(dbRef);
    const arestas = arestasDeTraducao(textos);
    const eu = chaveDe(tipo, item);
    const el = chaveDe(outroTipo, outro);
    const meu = arestas.find((a) => a.de === eu && a.para === el);
    if (meu) return rotuloElo(RELACAO_TRADUCAO, meu.direcao) || ROTULO_TRADUCAO_GENERICO;
    const dele = arestas.find((a) => a.de === el && a.para === eu);
    if (dele) {
        return (
            rotuloElo(RELACAO_TRADUCAO, direcaoInversa(dele.direcao)) || ROTULO_TRADUCAO_GENERICO
        );
    }
    return ROTULO_TRADUCAO_GENERICO;
}

// Os textos do grupo de `item`, menos ele, que `aceita` deixa mostrar:
// `[{ tipo, item, rotulo }]`. `aceita(tipo, outro)` decide quem pode ser
// oferecido (o sorteio só oferece quem poderia ser sorteado).
export function versoesPorTraducao(dbRef, tipo, item, aceita = () => true) {
    const grupos = gruposDeTraducao(dbRef);
    const grupo = grupos.get(chaveDe(tipo, item));
    if (!grupo) return [];
    const porChave = new Map(todosOsTextos(dbRef).map((t) => [chaveDe(t.tipo, t.item), t]));
    const saida = [];
    grupo.forEach((chave) => {
        const outro = porChave.get(chave);
        if (!outro || outro.item === item) return;
        if (!aceita(outro.tipo, outro.item)) return;
        saida.push({
            tipo: outro.tipo,
            item: outro.item,
            rotulo: rotuloDaTraducao(dbRef, tipo, item, outro.tipo, outro.item),
        });
    });
    return saida;
}
