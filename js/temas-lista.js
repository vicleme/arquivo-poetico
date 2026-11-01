// ============================================================
// temas-lista.js: "Definir por lista" na aba Temas (31/10/2026).
//
// Parte pura (sem DOM). Generaliza a lista que já existia só para a valência
// (temas-valencia-lista.js) para três campos:
//
//     valência:  "Desagradável: Luto; Violência simbólica"
//     assunto:   "Sociedade: Machismo; Polarização"
//     vitrine:   "Quando o amor acaba: Perda; Saudade"
//
// `;` separa os Temas (a vírgula faz parte do nome) e a quebra de linha
// também. Em assunto e vitrine o cabeçalho vale quando o que vem antes do
// primeiro `:` é o nome de um assunto ou de um convite que já existe (sem
// caixa nem acento); qualquer outro `:` fica dentro do nome do Tema.
//
// Assunto e vitrine só ACRESCENTAM (um Tema pode estar em vários, como na
// barra de edição em massa): a lista nunca tira um Tema de onde ele está e
// nunca cria Tema, assunto nem convite. Na valência nada muda: continua
// valendo temas-valencia-lista.js.
// ============================================================

import { chaveTema } from './utils.js';
import { limparNomeTema } from './temas.js';
import { adicionarTemasAoAssuntoEmMassa } from './temas-massa.js';
import { adicionarTemasAoUniversal, listarTemasUniversais } from './temas-universais.js';
import { planejarListaValencia, aplicarListaValencia } from './temas-valencia-lista.js';

export const CAMPOS_LISTA = Object.freeze(['valencia', 'assunto', 'vitrine']);

const mesmoId = (a, b) => String(a) === String(b);

// chave do nome -> assunto (ou convite), o primeiro quando há nomes iguais.
function destinosDoCampo(dbRef, campo) {
    const itens = campo === 'assunto' ? dbRef.assuntos || [] : listarTemasUniversais(dbRef);
    const mapa = new Map();
    itens.forEach((d) => {
        const chave = chaveTema(d.nome);
        if (chave && !mapa.has(chave)) mapa.set(chave, d);
    });
    return mapa;
}

// Nome de Tema de um pedaço da lista: sem `;` e `|` e sem vírgula sobrando
// nas pontas (igual a temas-valencia-lista.js).
function nomeDoPedaco(texto) {
    return limparNomeTema(texto)
        .replace(/^[,\s]+|[,\s]+$/g, '')
        .trim();
}

// `{ blocos, semCabecalho }`: `blocos` é, na ordem, `{ destino, nomes }`; um
// mesmo destino repetido na lista junta os nomes no primeiro bloco.
// `semCabecalho` são os nomes que vieram antes de qualquer cabeçalho.
export function lerListaPorDestino(texto, destinos) {
    const blocos = [];
    const semCabecalho = [];
    let atual = null;
    String(texto ?? '')
        .split(/[;\n\r]+/)
        .forEach((pedaco) => {
            let resto = pedaco;
            const dois = pedaco.indexOf(':');
            if (dois !== -1) {
                const destino = destinos.get(chaveTema(pedaco.slice(0, dois)));
                if (destino) {
                    atual =
                        blocos.find((b) => mesmoId(b.destino.id, destino.id)) ||
                        (blocos.push({ destino, nomes: [] }), blocos[blocos.length - 1]);
                    resto = pedaco.slice(dois + 1);
                }
            }
            const nome = nomeDoPedaco(resto);
            if (!nome) return;
            if (atual) atual.nomes.push(nome);
            else semCabecalho.push(nome);
        });
    return { blocos, semCabecalho };
}

// Confere a lista com o cadastro, sem gravar nada. Na valência devolve o plano
// de temas-valencia-lista.js. Em assunto e vitrine devolve
// `{ ok, campo, aplicaveis, inexistentes, semCabecalho, resumo }` ou
// `{ ok: false, motivo }` ('vazio', 'sem-destinos' quando não há assunto ou
// convite cadastrado, 'sem-cabecalho'):
// - `aplicaveis`: `{ id, nome, destinoId, destino, muda }` (nome do cadastro;
//   `muda` é falso quando o Tema já está nesse assunto ou convite);
// - `inexistentes`: `{ nome, destino }` (nada é criado);
// - `resumo`: por destino, `{ destinoId, destino, encontrados, mudam }`, na
//   ordem em que o cabeçalho apareceu.
export function planejarLista(dbRef, campo, texto) {
    if (!campo || campo === 'valencia') return planejarListaValencia(dbRef, texto);
    if (!String(texto ?? '').trim()) return { ok: false, motivo: 'vazio' };
    const destinos = destinosDoCampo(dbRef, campo);
    if (!destinos.size) return { ok: false, motivo: 'sem-destinos' };
    const { blocos, semCabecalho } = lerListaPorDestino(texto, destinos);
    if (!blocos.length) return { ok: false, motivo: 'sem-cabecalho', semCabecalho };

    const cadastro = new Map();
    (dbRef.temas || []).forEach((t) => {
        const chave = chaveTema(t.nome);
        if (chave && !cadastro.has(chave)) cadastro.set(chave, t);
    });

    const aplicaveis = [];
    const inexistentes = [];
    const vistos = new Set();
    blocos.forEach(({ destino, nomes }) => {
        nomes.forEach((nome) => {
            const chave = chaveTema(nome);
            const par = `${destino.id}\u0000${chave}`;
            if (vistos.has(par)) return;
            vistos.add(par);
            const tema = cadastro.get(chave);
            if (!tema) return inexistentes.push({ nome, destino: destino.nome });
            aplicaveis.push({
                id: tema.id,
                nome: tema.nome,
                destinoId: destino.id,
                destino: destino.nome,
                muda: !(destino.temaIds || []).some((tid) => mesmoId(tid, tema.id)),
            });
        });
    });

    const resumo = blocos.map(({ destino }) => {
        const doGrupo = aplicaveis.filter((a) => mesmoId(a.destinoId, destino.id));
        return {
            destinoId: destino.id,
            destino: destino.nome,
            encontrados: doGrupo.length,
            mudam: doGrupo.filter((a) => a.muda).length,
        };
    });

    return { ok: true, campo, aplicaveis, inexistentes, semCabecalho, resumo };
}

// Aplica a lista e devolve o plano mais `{ alterados, iguais, desfazer }`.
// Em assunto e vitrine `alterados` conta as ligações novas (Tema que entrou
// num assunto ou convite). Sem Tema aplicável não grava nada
// (`motivo: 'sem-temas'`, com o relatório para a tela mostrar o porquê).
export function aplicarLista(dbRef, campo, texto) {
    if (!campo || campo === 'valencia') return aplicarListaValencia(dbRef, texto);
    const plano = planejarLista(dbRef, campo, texto);
    if (!plano.ok) return plano;
    if (!plano.aplicaveis.length) return { ...plano, ok: false, motivo: 'sem-temas' };

    const adicionar =
        campo === 'assunto' ? adicionarTemasAoAssuntoEmMassa : adicionarTemasAoUniversal;
    const desfazeres = [];
    let alterados = 0;
    plano.resumo.forEach(({ destinoId }) => {
        const ids = plano.aplicaveis
            .filter((a) => mesmoId(a.destinoId, destinoId))
            .map((a) => a.id);
        const r = adicionar(dbRef, destinoId, ids);
        if (!r.ok) return;
        alterados += r.adicionados;
        desfazeres.push(r.desfazer);
    });
    return {
        ...plano,
        alterados,
        iguais: plano.aplicaveis.length - alterados,
        desfazer: () => [...desfazeres].reverse().forEach((f) => f()),
    };
}
