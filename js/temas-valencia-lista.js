// temas-valencia-lista.js: valência dos Temas por lista de texto (31/10/2026).
//
// Parte pura (sem DOM). A pessoa entrega uma lista como
//
//     Desagradável: Luto; Violência simbólica; Amor, perda
//     Agradável: Amizade; Cotidiano
//     Sem valência: Tema meu
//
// e cada bloco "valência: tema; tema" aplica a valência aos Temas que já
// existem no cadastro. `;` separa os Temas (a vírgula faz parte do nome, como
// na Etapa 7 da Fase 2) e a quebra de linha também. Um cabeçalho vale quando o
// que vem antes do primeiro `:` é uma valência (chave ou rótulo, sem caixa nem
// acento) ou "sem valência"; qualquer outro `:` fica dentro do nome ("Luto:
// perda"). Nunca cria Tema: o nome que não existe vai para o relatório. A tela
// mora em temas-massa-ui.js (entrega seguinte).

import { chaveTema } from './utils.js';
import { limparNomeTema, normalizarValenciaTema, definirValenciaDoTema } from './temas.js';
import { retrato, restaurar } from './temas-massa.js';

// Cabeçalhos que limpam a valência (volta a "não classificado").
const CABECALHOS_SEM_VALENCIA = new Set(
    ['sem valencia', 'nao classificado', 'sem classificacao', 'nenhuma'].map(chaveTema),
);

// `{ valencia }` se `rotulo` é um cabeçalho ('' = limpar), ou null.
function lerCabecalho(rotulo) {
    const chave = chaveTema(rotulo);
    if (!chave) return null;
    if (CABECALHOS_SEM_VALENCIA.has(chave)) return { valencia: '' };
    const valencia = normalizarValenciaTema(rotulo);
    return valencia ? { valencia } : null;
}

// Nome de Tema de um pedaço da lista: sem `;` e `|`, e sem vírgula sobrando
// nas pontas ("tema 4,;tema 5" deixa de ser um nome com vírgula no fim).
function nomeDoPedaco(texto) {
    return limparNomeTema(texto)
        .replace(/^[,\s]+|[,\s]+$/g, '')
        .trim();
}

// Lê o texto em `{ blocos, semCabecalho }`: `blocos` é a lista, na ordem, de
// `{ valencia, nomes }`; `semCabecalho` são os nomes que vieram antes de
// qualquer cabeçalho (não se sabe que valência aplicar).
export function lerListaValencia(texto) {
    const blocos = [];
    const semCabecalho = [];
    let atual = null;
    String(texto ?? '')
        .split(/[;\n\r]+/)
        .forEach((pedaco) => {
            let resto = pedaco;
            const dois = pedaco.indexOf(':');
            if (dois !== -1) {
                const cab = lerCabecalho(pedaco.slice(0, dois));
                if (cab) {
                    atual = { valencia: cab.valencia, nomes: [] };
                    blocos.push(atual);
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

// Confere a lista com o cadastro, sem gravar nada. Devolve
// `{ ok, motivo?, aplicaveis, inexistentes, conflitos, semCabecalho, resumo }`:
// - `aplicaveis`: `{ id, nome, valencia, muda }` (nome do cadastro; `muda` é
//   falso quando o Tema já está com essa valência);
// - `inexistentes`: `{ nome, valencia }` (nada é criado);
// - `conflitos`: `{ nome, valencias }`, Tema que a lista pôs em duas valências
//   diferentes (fica de fora, a pessoa corrige a lista);
// - `semCabecalho`: nomes antes do primeiro cabeçalho (ficam de fora);
// - `resumo`: por valência, `{ valencia, encontrados, mudam }`, na ordem em
//   que o cabeçalho apareceu pela primeira vez.
export function planejarListaValencia(dbRef, texto) {
    if (!String(texto ?? '').trim()) return { ok: false, motivo: 'vazio' };
    const { blocos, semCabecalho } = lerListaValencia(texto);
    if (!blocos.length) return { ok: false, motivo: 'sem-cabecalho', semCabecalho };

    const cadastro = new Map();
    (dbRef.temas || []).forEach((t) => {
        const chave = chaveTema(t.nome);
        if (chave && !cadastro.has(chave)) cadastro.set(chave, t);
    });

    // chave do Tema -> { nome digitado, valencias (em ordem, sem repetir) }
    const pedidos = new Map();
    blocos.forEach(({ valencia, nomes }) => {
        nomes.forEach((nome) => {
            const chave = chaveTema(nome);
            const p = pedidos.get(chave) || { nome, valencias: [] };
            if (!p.valencias.includes(valencia)) p.valencias.push(valencia);
            pedidos.set(chave, p);
        });
    });

    const aplicaveis = [];
    const inexistentes = [];
    const conflitos = [];
    pedidos.forEach((p, chave) => {
        const tema = cadastro.get(chave);
        if (!tema) {
            p.valencias.forEach((valencia) => inexistentes.push({ nome: p.nome, valencia }));
            return;
        }
        if (p.valencias.length > 1) {
            conflitos.push({ nome: tema.nome, valencias: p.valencias });
            return;
        }
        const valencia = p.valencias[0];
        aplicaveis.push({
            id: tema.id,
            nome: tema.nome,
            valencia,
            muda: normalizarValenciaTema(tema.valencia) !== valencia,
        });
    });

    const resumo = [];
    blocos.forEach(({ valencia }) => {
        if (resumo.some((r) => r.valencia === valencia)) return;
        const doGrupo = aplicaveis.filter((a) => a.valencia === valencia);
        resumo.push({
            valencia,
            encontrados: doGrupo.length,
            mudam: doGrupo.filter((a) => a.muda).length,
        });
    });

    return { ok: true, aplicaveis, inexistentes, conflitos, semCabecalho, resumo };
}

// Aplica a lista: grava a valência dos Temas `aplicaveis` e devolve o plano
// mais `{ alterados, iguais, desfazer }`. Sem Tema aplicável não grava nada
// (`motivo: 'sem-temas'`, com o relatório para a tela mostrar o porquê).
export function aplicarListaValencia(dbRef, texto) {
    const plano = planejarListaValencia(dbRef, texto);
    if (!plano.ok) return plano;
    if (!plano.aplicaveis.length) return { ...plano, ok: false, motivo: 'sem-temas' };

    const porId = new Map((dbRef.temas || []).map((t) => [String(t.id), t]));
    const alvos = plano.aplicaveis.map((a) => porId.get(String(a.id)));
    const antes = retrato(alvos);
    let alterados = 0;
    plano.aplicaveis.forEach((a, i) => {
        if (!a.muda) return;
        definirValenciaDoTema(alvos[i], a.valencia);
        alterados += 1;
    });
    return {
        ...plano,
        alterados,
        iguais: plano.aplicaveis.length - alterados,
        desfazer: () => restaurar(antes),
    };
}
