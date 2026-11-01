// ============================================================
// fora-do-acervo.js: lógica pura (sem DOM e sem db.js) da seção "Fora do
// acervo" da aba Conexões (T9, entrega 1). Lê Intertextualidade,
// Hipertextualidade e Referências (Externas) de Poemas e Prosas e monta:
//
//   obras            cada obra (nome + autor) com os textos que a usam, pela
//                    Intertextualidade (`obra`) ou pela Hipertextualidade
//                    (`hipotexto`), e a relação de cada uso
//   autores          cada autor com os textos e as obras dele
//   origens          cada origem (lugar ou cultura da obra) com os textos, as
//                    obras e os autores dela; as entradas sem origem ficam
//                    num item à parte, `semOrigem`, sempre por último
//   derivacoes       de qual obra cada texto deriva (o hipotexto)
//   referencias      o mesmo Marco histórico, Notícia ou Pessoa pública em
//                    vários textos (`recorrente`)
//   quaseDuplicatas  grafias diferentes da mesma obra, mesmo título com
//                    autores diferentes e títulos parecidos do mesmo autor
//
// Identidade da obra: nome mais autores, sem acento, sem caixa e sem pontuação
// (o mesmo critério da Descrição, que já repete pela mesma obra). A obra pode
// ter mais de um autor (`autores`, uma lista; ver autores-da-obra.js) e a ordem
// dos autores não conta: "A e B" e "B e A" são a mesma obra. Cada obra traz
// `autores` (lista) e `autor` (os mesmos nomes numa frase, "A, B e C"), e na
// lista de Autores a obra aparece sob cada um dos seus autores. A data da obra
// (`dataObra` e `dataObraAte`, ver data-da-obra.js) sai em `dataObra`,
// `dataObraAte` (o par mais usado) e `datas` (todos os pares, do mais usado ao
// menos usado), nas obras e nas referências. Poema e
// Prosa entram juntos; cada texto leva `tipo` ('poema' ou 'prosa'). Quem chama
// decide quais textos entram (por exemplo, sem os ocultos). A marca "Obra
// pessoal" (ver intertextualidade.js) sai em cada obra como `entradasTotal`,
// `entradasPessoais` e `obraPessoal` ('todas', 'algumas' ou 'nenhuma'). A origem
// (`origemObra`, ver origem-da-obra.js) sai em `origens` (as listas diferentes,
// da mais usada à menos usada) e `entradasSemOrigem`, para a Correção avisar
// quando as entradas da obra discordam. Nada aqui grava.
// ============================================================

import { normalizarBusca } from './utils.js';
import {
    autoresDaEntrada,
    chaveDeAutor,
    chaveDosAutores,
    chavesDosAutores,
    textoDosAutores,
} from './autores-da-obra.js';
import { agruparDatasDaObra, datasDaEntrada } from './data-da-obra.js';
import { chaveDeOrigem, origensDaEntrada } from './origem-da-obra.js';
import { ehObraPessoal } from './intertextualidade.js';
import {
    bateBuscaConexoes,
    filtrarItemPorConteudo,
    interpretarBuscaConexoes,
} from './busca-campos-conexoes.js';

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function ehObjeto(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

// Sem acento, sem caixa, sem pontuação e com espaços colapsados.
export function chaveDeNome(valor) {
    return normalizarBusca(texto(valor))
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

function ordenarPt(a, b) {
    return a.localeCompare(b, 'pt-BR');
}

function distancia(a, b) {
    if (a === b) return 0;
    let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const atual = [i];
        for (let j = 1; j <= b.length; j++) {
            atual[j] = Math.min(
                anterior[j] + 1,
                atual[j - 1] + 1,
                anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
            );
        }
        anterior = atual;
    }
    return anterior[b.length];
}

// O valor mais frequente (empate: o que apareceu primeiro), ignorando vazios.
function maisFrequente(valores) {
    const contagem = new Map();
    valores.forEach((v) => {
        if (v) contagem.set(v, (contagem.get(v) || 0) + 1);
    });
    let melhor = '';
    let max = 0;
    contagem.forEach((n, v) => {
        if (n > max) {
            melhor = v;
            max = n;
        }
    });
    return melhor;
}

function* textosDaLista({ poemas = [], prosas = [] } = {}) {
    for (const [tipo, lista] of [
        ['poema', poemas],
        ['prosa', prosas],
    ]) {
        for (const item of lista || []) {
            if (!ehObjeto(item)) continue;
            yield { tipo, id: item.id, titulo: texto(item.titulo) || '(sem título)', item };
        }
    }
}

function entradas(item, campo) {
    return Array.isArray(item[campo]) ? item[campo].filter(ehObjeto) : [];
}

const refTexto = (t) => ({ tipo: t.tipo, id: t.id, titulo: t.titulo });
const mesmoTexto = (a, b) => a.tipo === b.tipo && a.id === b.id;

function textosDistintos(usos) {
    const vistos = [];
    usos.forEach((u) => {
        if (!vistos.some((v) => mesmoTexto(v, u))) vistos.push(refTexto(u));
    });
    return vistos;
}

function porTitulo(a, b) {
    return ordenarPt(a.titulo, b.titulo) || ordenarPt(a.tipo, b.tipo);
}

// ─── Obras e autores ─────────────────────────────────────────

// `autores` (lista) e `autor` (a mesma lista numa frase) de uma entrada.
function autoresDoUso(e) {
    const autores = autoresDaEntrada(e);
    return { autores, autor: textoDosAutores(autores) };
}

// A lista de autores da forma mais usada (pelo texto mostrado), no empate a que
// apareceu primeiro.
function autoresMaisFrequentes(usos) {
    const texto = maisFrequente(usos.map((u) => u.autor));
    const achado = usos.find((u) => u.autor === texto);
    return achado ? [...achado.autores] : [];
}

function coletarUsos(entrada) {
    const usos = [];
    for (const t of textosDaLista(entrada)) {
        entradas(t.item, 'intertextualidade').forEach((e) => {
            usos.push({
                ...refTexto(t),
                campo: 'intertextualidade',
                obra: texto(e.obra),
                ...autoresDoUso(e),
                tipoObra: texto(e.tipoObra),
                descricao: texto(e.descricao),
                origens: origensDaEntrada(e),
                relacao: texto(e.relacao),
                datas: datasDaEntrada(e),
                obraPessoal: ehObraPessoal(e),
            });
        });
        entradas(t.item, 'hipertextualidade').forEach((e) => {
            usos.push({
                ...refTexto(t),
                campo: 'hipertextualidade',
                obra: texto(e.hipotexto),
                ...autoresDoUso(e),
                tipoObra: texto(e.tipoObra),
                descricao: texto(e.descricao),
                origens: origensDaEntrada(e),
                relacao: texto(e.relacao),
                datas: datasDaEntrada(e),
                obraPessoal: ehObraPessoal(e),
            });
        });
    }
    return usos;
}

// As descrições diferentes (sem vazias), da mais usada para a menos usada.
function descricoesDistintas(usos) {
    const contagem = new Map();
    usos.forEach((u) => {
        if (u.descricao) contagem.set(u.descricao, (contagem.get(u.descricao) || 0) + 1);
    });
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d);
}

// As listas de origem diferentes (entrada sem origem não conta), da mais usada
// para a menos usada. A ordem das tags e a grafia não separam listas; vale a
// primeira grafia vista.
function origensComContagem(usos) {
    const grupos = new Map();
    usos.forEach((u) => {
        if (!u.origens.length) return;
        const chave = u.origens.map(chaveDeOrigem).sort().join('|');
        if (!grupos.has(chave)) grupos.set(chave, { lista: u.origens, usos: 0 });
        grupos.get(chave).usos += 1;
    });
    return [...grupos.values()].sort((a, b) => b.usos - a.usos);
}

function origensDistintas(usos) {
    return origensComContagem(usos).map((g) => [...g.lista]);
}

// As listas de origem de todas as obras de um autor, somando as entradas de
// cada lista (a mais usada primeiro).
function origensDoAutor(obras) {
    const grupos = new Map();
    obras.forEach((o) => {
        (o.contagemOrigens || []).forEach((g) => {
            const chave = g.lista.map(chaveDeOrigem).sort().join('|');
            if (!grupos.has(chave)) grupos.set(chave, { lista: g.lista, usos: 0 });
            grupos.get(chave).usos += g.usos;
        });
    });
    return [...grupos.values()].sort((a, b) => b.usos - a.usos).map((g) => [...g.lista]);
}

// O resumo das datas de um grupo de usos (cada um com `datas: { inicio, fim }`):
// o par mais usado em `dataObra` e `dataObraAte` e todos em `datas`.
function resumoDeDatas(listaDeDatas) {
    const datas = agruparDatasDaObra(listaDeDatas);
    return {
        dataObra: datas[0]?.inicio || null,
        dataObraAte: datas[0]?.fim || null,
        datas,
    };
}

// A marca "Obra pessoal" de um grupo de entradas: 'todas' (todas marcadas),
// 'nenhuma' ou 'algumas' (divergem). Sem entradas vale 'nenhuma'.
export function estadoObraPessoal(pessoais, total) {
    if (!total || !pessoais) return 'nenhuma';
    return pessoais >= total ? 'todas' : 'algumas';
}

// Guarda no item os usos completos (cada entrada de obra de cada texto) sem
// entrar em cópias, JSON nem comparações: a busca por campo usa para refazer o
// autor ou a origem só com as obras que sobram no filtro.
function guardarUsos(item, usos) {
    Object.defineProperty(item, '_usos', { value: usos, enumerable: false, writable: true });
    return item;
}

function agruparObras(usos) {
    const mapa = new Map();
    usos.forEach((u) => {
        const chaveObra = chaveDeNome(u.obra);
        if (!chaveObra) return;
        const chave = `${chaveObra}|${chaveDosAutores(u.autores)}`;
        if (!mapa.has(chave)) mapa.set(chave, { chave, chaveObra, usos: [] });
        mapa.get(chave).usos.push(u);
    });
    return [...mapa.values()].map((g) => {
        const textos = textosDistintos(g.usos).sort(porTitulo);
        const porRelacao = {};
        g.usos.forEach((u) => {
            if (u.relacao) porRelacao[u.relacao] = (porRelacao[u.relacao] || 0) + 1;
        });
        const entradasPessoais = g.usos.filter((u) => u.obraPessoal).length;
        return guardarUsos(
            {
                chave: g.chave,
                chaveObra: g.chaveObra,
                entradasTotal: g.usos.length,
                entradasPessoais,
                obraPessoal: estadoObraPessoal(entradasPessoais, g.usos.length),
                obra: maisFrequente(g.usos.map((u) => u.obra)),
                grafias: [...new Set(g.usos.map((u) => u.obra))].sort(ordenarPt),
                autores: autoresMaisFrequentes(g.usos),
                autor: textoDosAutores(autoresMaisFrequentes(g.usos)),
                tipoObra: maisFrequente(g.usos.map((u) => u.tipoObra)),
                descricao: maisFrequente(g.usos.map((u) => u.descricao)),
                descricoes: descricoesDistintas(g.usos),
                origens: origensDistintas(g.usos),
                contagemOrigens: origensComContagem(g.usos),
                entradasSemOrigem: g.usos.filter((u) => !u.origens.length).length,
                ...resumoDeDatas(g.usos.map((u) => u.datas)),
                textos,
                totalTextos: textos.length,
                porRelacao,
                comoHipotexto: g.usos.some((u) => u.campo === 'hipertextualidade'),
                usos: g.usos.map((u) => ({
                    tipo: u.tipo,
                    id: u.id,
                    titulo: u.titulo,
                    campo: u.campo,
                    relacao: u.relacao,
                })),
            },
            g.usos,
        );
    });
}

function ordenarObras(obras) {
    return obras.sort(
        (a, b) =>
            b.totalTextos - a.totalTextos ||
            ordenarPt(a.obra, b.obra) ||
            ordenarPt(a.autor, b.autor),
    );
}

function agruparAutores(obras) {
    const mapa = new Map();
    obras.forEach((o) => {
        // A obra entra sob cada um dos autores dela.
        (o.autores || []).forEach((nome) => {
            const chave = chaveDeAutor(nome);
            if (!chave) return;
            if (!mapa.has(chave)) mapa.set(chave, { chave, nomes: [], obras: [] });
            const g = mapa.get(chave);
            g.nomes.push(nome);
            g.obras.push(o);
        });
    });
    return [...mapa.values()]
        .map((g) => {
            const textos = textosDistintos(g.obras.flatMap((o) => o.textos)).sort(porTitulo);
            const pessoais = g.obras.reduce((n, o) => n + o.entradasPessoais, 0);
            const total = g.obras.reduce((n, o) => n + o.entradasTotal, 0);
            return guardarUsos(
                {
                    chave: g.chave,
                    autor: maisFrequente(g.nomes),
                    textos,
                    totalTextos: textos.length,
                    // Para a busca por campo (`relacao:`, `data:`, `pessoal:`), que
                    // olha o que as obras do autor têm.
                    relacoes: [...new Set(g.obras.flatMap((o) => Object.keys(o.porRelacao)))],
                    datas: g.obras.flatMap((o) => o.datas),
                    obraPessoal: estadoObraPessoal(pessoais, total),
                    origens: origensDoAutor(g.obras),
                    entradasSemOrigem: g.obras.reduce((n, o) => n + (o.entradasSemOrigem || 0), 0),
                    obras: g.obras
                        .map((o) => ({
                            obra: o.obra,
                            tipoObra: o.tipoObra,
                            totalTextos: o.totalTextos,
                            autores: o.autores,
                            dataObra: o.dataObra,
                            dataObraAte: o.dataObraAte,
                        }))
                        .sort((a, b) => b.totalTextos - a.totalTextos || ordenarPt(a.obra, b.obra)),
                },
                g.obras.flatMap((o) => o._usos || []),
            );
        })
        .sort((a, b) => b.totalTextos - a.totalTextos || ordenarPt(a.autor, b.autor));
}

// ─── Origens (lugar ou cultura das obras) ────────────────────

export const ROTULO_SEM_ORIGEM = 'Sem origem preenchida';

// Cada origem com os textos, as obras e os autores que a trazem. Um texto (ou
// uma obra) conta uma vez em cada origem que alguma entrada dele traz, então a
// soma pode passar do total, como no gráfico de origens das Estatísticas. A
// chave é a de `chaveDeOrigem` (sem acento nem caixa) e o rótulo é a primeira
// grafia vista. As entradas de obra com nome mas sem nenhuma origem vão para o
// item `semOrigem` (chave própria, sem colidir com uma origem digitada), que só
// existe quando há alguma e fica sempre no fim.
function agruparOrigens(usos) {
    const mapa = new Map();
    const SEM = '\u0000sem-origem';
    const pegar = (chave, origem, semOrigem) => {
        if (!mapa.has(chave)) {
            mapa.set(chave, {
                chave,
                origem,
                semOrigem,
                usos: [],
                obras: new Map(),
                autores: new Map(),
            });
        }
        return mapa.get(chave);
    };
    usos.forEach((u) => {
        const chaveObra = chaveDeNome(u.obra);
        if (!chaveObra) return;
        const alvos = u.origens.length
            ? u.origens.map((nome) => [chaveDeOrigem(nome), nome, false])
            : [[SEM, ROTULO_SEM_ORIGEM, true]];
        alvos.forEach(([chave, nome, semOrigem]) => {
            const g = pegar(chave, nome, semOrigem);
            g.usos.push(u);
            const chaveDaObra = `${chaveObra}|${chaveDosAutores(u.autores)}`;
            if (!g.obras.has(chaveDaObra)) {
                g.obras.set(chaveDaObra, { obra: u.obra, autor: u.autor, tipoObra: u.tipoObra });
            }
            (u.autores || []).forEach((nomeAutor) => {
                const chaveAutor = chaveDeAutor(nomeAutor);
                if (chaveAutor && !g.autores.has(chaveAutor)) g.autores.set(chaveAutor, nomeAutor);
            });
        });
    });
    return ordenarOrigensDaLista(
        [...mapa.values()].map((g) => {
            const textos = textosDistintos(g.usos).sort(porTitulo);
            const obras = [...g.obras.values()].sort((a, b) => ordenarPt(a.obra, b.obra));
            const autores = [...g.autores.values()].sort(ordenarPt);
            const pessoais = g.usos.filter((u) => u.obraPessoal).length;
            return guardarUsos(
                {
                    chave: g.chave,
                    origem: g.origem,
                    semOrigem: g.semOrigem,
                    textos,
                    totalTextos: textos.length,
                    // Para a busca por campo (`relacao:`, `data:`, `pessoal:`).
                    relacoes: [...new Set(g.usos.map((u) => u.relacao).filter(Boolean))],
                    datas: agruparDatasDaObra(g.usos.map((u) => u.datas)),
                    obraPessoal: estadoObraPessoal(pessoais, g.usos.length),
                    obras,
                    totalObras: obras.length,
                    autores,
                    totalAutores: autores.length,
                },
                g.usos,
            );
        }),
        'textos',
    );
}

// ─── Derivações (hipotexto de cada texto) ────────────────────

function montarDerivacoes(entrada) {
    const lista = [];
    for (const t of textosDaLista(entrada)) {
        const hipotextos = entradas(t.item, 'hipertextualidade')
            .filter((e) => texto(e.hipotexto))
            .map((e) => ({
                hipotexto: texto(e.hipotexto),
                ...autoresDoUso(e),
                tipoObra: texto(e.tipoObra),
                relacao: texto(e.relacao),
            }));
        if (hipotextos.length) lista.push({ ...refTexto(t), hipotextos });
    }
    return lista.sort(porTitulo);
}

// ─── Referências recorrentes ─────────────────────────────────

function montarReferencias(entrada, minimo) {
    const mapa = new Map();
    for (const t of textosDaLista(entrada)) {
        entradas(t.item, 'referenciasExternas').forEach((e) => {
            const chaveTexto = chaveDeNome(e.texto);
            if (!chaveTexto) return;
            const chave = `${chaveDeNome(e.tipo)}|${chaveTexto}`;
            if (!mapa.has(chave))
                mapa.set(chave, { chave, tipos: [], nomes: [], datas: [], usos: [] });
            const g = mapa.get(chave);
            g.tipos.push(texto(e.tipo));
            g.nomes.push(texto(e.texto));
            g.datas.push(datasDaEntrada(e));
            g.usos.push(refTexto(t));
        });
    }
    return [...mapa.values()]
        .map((g) => {
            const textos = textosDistintos(g.usos).sort(porTitulo);
            return {
                chave: g.chave,
                tipo: maisFrequente(g.tipos),
                texto: maisFrequente(g.nomes),
                ...resumoDeDatas(g.datas),
                textos,
                totalTextos: textos.length,
                recorrente: textos.length >= minimo,
            };
        })
        .sort((a, b) => b.totalTextos - a.totalTextos || ordenarPt(a.texto, b.texto));
}

// ─── Quase-duplicatas ────────────────────────────────────────

const rotuloObra = (o) => ({
    chave: o.chave,
    obra: o.obra,
    autor: o.autor,
    autores: o.autores,
    totalTextos: o.totalTextos,
});

// As duas obras têm pelo menos um autor em comum? Obra sem autor só casa com
// obra sem autor (como antes, quando os dois "autores" vazios eram iguais).
function dividemAutor(a, b) {
    const x = chavesDosAutores(a.autores);
    const y = chavesDosAutores(b.autores);
    if (!x.length && !y.length) return true;
    return x.some((chave) => y.includes(chave));
}

function acharQuaseDuplicatas(obras) {
    const achados = [];

    // 1. A mesma obra e o mesmo autor escritos de jeitos diferentes.
    obras.forEach((o) => {
        if (o.grafias.length > 1) {
            achados.push({
                motivo: 'grafias',
                itens: o.grafias.map((g) => ({
                    chave: o.chave,
                    obra: g,
                    autor: o.autor,
                    autores: o.autores,
                })),
            });
        }
    });

    // 2. O mesmo título com autores diferentes (ou um sem autor).
    const porTituloObra = new Map();
    obras.forEach((o) => {
        if (!porTituloObra.has(o.chaveObra)) porTituloObra.set(o.chaveObra, []);
        porTituloObra.get(o.chaveObra).push(o);
    });
    porTituloObra.forEach((grupo) => {
        if (grupo.length > 1) achados.push({ motivo: 'autor', itens: grupo.map(rotuloObra) });
    });

    // 3. Títulos parecidos de obras que dividem pelo menos um autor (um ou dois
    // toques de diferença).
    for (let i = 0; i < obras.length; i++) {
        for (let j = i + 1; j < obras.length; j++) {
            const a = obras[i];
            const b = obras[j];
            if (a.chaveObra === b.chaveObra) continue;
            if (!dividemAutor(a, b)) continue;
            const sa = a.chaveObra.replace(/ /g, '');
            const sb = b.chaveObra.replace(/ /g, '');
            const menor = Math.min(sa.length, sb.length);
            if (menor < 5) continue;
            if (sa === sb || distancia(sa, sb) <= (menor >= 10 ? 2 : 1)) {
                achados.push({ motivo: 'parecido', itens: [rotuloObra(a), rotuloObra(b)] });
            }
        }
    }
    return achados;
}

// ─── Filtro das listas (Obras e Autores) ─────────────────────

// Cada palavra da consulta precisa aparecer (sem acento nem caixa) em algum
// dos campos do item. Consulta vazia devolve a lista inteira, na mesma ordem.
function casaConsulta(campos, consulta) {
    const palavras = chaveDeNome(consulta).split(' ').filter(Boolean);
    if (!palavras.length) return true;
    const alvo = chaveDeNome(campos.filter(Boolean).join(' '));
    return palavras.every((p) => alvo.includes(p));
}

// Onde um termo SEM prefixo é procurado, em cada lista: no nome da obra (e nas
// grafias), no autor, no tipo, nas relações e nos títulos dos textos que a usam;
// no autor, nas obras dele e nos títulos; na origem, nas obras, nos autores e
// nos títulos.
const CAMPOS_GERAIS = {
    obras: (o) => [
        o.obra,
        ...(o.grafias || []),
        o.autor,
        ...(o.autores || []),
        o.tipoObra,
        ...Object.keys(o.porRelacao || {}),
        ...(o.textos || []).map((t) => t.titulo),
    ],
    autores: (a) => [
        a.autor,
        ...(a.obras || []).map((o) => o.obra),
        ...(a.textos || []).map((t) => t.titulo),
    ],
    origens: (g) => [
        g.origem,
        ...(g.obras || []).map((o) => o.obra),
        ...(g.autores || []),
        ...(g.textos || []).map((t) => t.titulo),
    ],
};

// Consulta com `campo:valor`, `-termo`, `ou` ou aspas vai para a busca por
// campo (busca-campos-conexoes.js, a mesma do Modo revisão); o resto segue a
// busca de sempre (as palavras em qualquer ordem).
function filtrarLista(itens, consulta, tipoLista) {
    const avancada = interpretarBuscaConexoes(consulta);
    const gerais = CAMPOS_GERAIS[tipoLista];
    if (!avancada) return itens.filter((i) => casaConsulta(gerais(i), consulta));
    // Obras: cada obra é testada inteira. Autores e Origens: o filtro por campo
    // vale para as obras DENTRO de cada um (`-pessoal:*` deixa a origem com só
    // as obras não pessoais), e o item é refeito com o que sobra.
    if (tipoLista === 'obras') {
        return itens.filter((i) => bateBuscaConexoes(i, tipoLista, avancada, gerais(i)));
    }
    const saida = [];
    itens.forEach((i) => {
        const r = filtrarItemPorConteudo(i, tipoLista, avancada, gerais(i), i._usos);
        if (!r.bate) return;
        saida.push(
            r.usos && r.usos.length < i._usos.length ? refazerComUsos(i, tipoLista, r.usos) : i,
        );
    });
    return saida;
}

// O autor ou a origem refeito só com os usos que sobraram (textos, obras,
// autores, datas, relações e contagens recalculados). O nome e a grafia do
// próprio item não mudam.
function refazerComUsos(item, tipoLista, usos) {
    if (tipoLista === 'autores') {
        const novo = agruparAutores(agruparObras(usos)).find((g) => g.chave === item.chave);
        return novo ? Object.assign(novo, { autor: item.autor }) : item;
    }
    const novo = agruparOrigens(usos).find((g) => g.chave === item.chave);
    return novo ? Object.assign(novo, { origem: item.origem }) : item;
}

export function filtrarObras(obras = [], consulta = '') {
    return filtrarLista(obras, consulta, 'obras');
}

export function filtrarAutores(autores = [], consulta = '') {
    return filtrarLista(autores, consulta, 'autores');
}

// ─── Ordem das listas (Obras e Autores) ──────────────────────

export const ORDENS_FORA_DO_ACERVO = ['textos', 'alfabetica', 'data-antiga', 'data-recente'];

function ordemValida(ordem) {
    return ORDENS_FORA_DO_ACERVO.includes(ordem) ? ordem : 'textos';
}

// O ano de referência da obra (o começo da data do par mais usado, ou o fim
// quando só ele existe; a mesma regra da busca e das Estatísticas), ou null
// quando a obra não tem data.
function anoDaObra(o) {
    const ref = o?.dataObra || o?.dataObraAte;
    return ref ? ref.de : null;
}

// O ano de um autor numa ordem por data: a obra mais antiga dele (data-antiga)
// ou a mais recente (data-recente). Autor sem nenhuma obra datada vale null.
function anoDoAutor(a, ordem) {
    const anos = (a.obras || []).map(anoDaObra).filter((x) => x !== null);
    if (!anos.length) return null;
    return ordem === 'data-recente' ? Math.max(...anos) : Math.min(...anos);
}

// Compara dois anos na direção da ordem; sem data vai sempre para o fim, nas
// duas direções.
function compararAnos(a, b, ordem) {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return ordem === 'data-recente' ? b - a : a - b;
}

const ehOrdemPorData = (ordem) => ordem === 'data-antiga' || ordem === 'data-recente';

// "textos": de quem aparece em mais textos para quem aparece em menos, e no
// empate pelo nome (a ordem de sempre). "alfabetica": pelo nome, sem olhar a
// contagem. "data-antiga" e "data-recente": pelo ano da obra (do mais antigo
// ao mais novo, ou o contrário); obra sem data fica no fim, e o empate segue a
// ordem de "textos". No autor, vale a obra mais antiga dele (data-antiga) ou a
// mais recente (data-recente). Devolve uma cópia; ordem desconhecida vale
// "textos".
export function ordenarObrasDaLista(obras = [], ordem = 'textos') {
    const copia = [...obras];
    const o = ordemValida(ordem);
    if (o === 'alfabetica') {
        return copia.sort(
            (a, b) =>
                ordenarPt(a.obra, b.obra) ||
                ordenarPt(a.autor || '', b.autor || '') ||
                b.totalTextos - a.totalTextos,
        );
    }
    if (ehOrdemPorData(o)) {
        return copia.sort(
            (a, b) =>
                compararAnos(anoDaObra(a), anoDaObra(b), o) ||
                b.totalTextos - a.totalTextos ||
                ordenarPt(a.obra, b.obra) ||
                ordenarPt(a.autor || '', b.autor || ''),
        );
    }
    return ordenarObras(copia);
}

export function ordenarAutoresDaLista(autores = [], ordem = 'textos') {
    const copia = [...autores];
    const o = ordemValida(ordem);
    if (o === 'alfabetica') {
        return copia.sort((a, b) => ordenarPt(a.autor, b.autor) || b.totalTextos - a.totalTextos);
    }
    if (ehOrdemPorData(o)) {
        return copia.sort(
            (a, b) =>
                compararAnos(anoDoAutor(a, o), anoDoAutor(b, o), o) ||
                b.totalTextos - a.totalTextos ||
                ordenarPt(a.autor, b.autor),
        );
    }
    return copia.sort((a, b) => b.totalTextos - a.totalTextos || ordenarPt(a.autor, b.autor));
}

export function filtrarOrigens(origens = [], consulta = '') {
    return filtrarLista(origens, consulta, 'origens');
}

// Origens na ordem da lista: a que tem mais textos primeiro (padrão) ou A → Z.
// A origem não tem data: as ordens por data valem como "textos". O item "Sem
// origem preenchida" fica sempre por último, em qualquer ordem.
export function ordenarOrigensDaLista(origens = [], ordem = 'textos') {
    const alfabetica = ordemValida(ordem) === 'alfabetica';
    return [...origens].sort((a, b) => {
        if (a.semOrigem !== b.semOrigem) return a.semOrigem ? 1 : -1;
        if (alfabetica) return ordenarPt(a.origem, b.origem) || b.totalTextos - a.totalTextos;
        return b.totalTextos - a.totalTextos || ordenarPt(a.origem, b.origem);
    });
}

// ─── Entrada única ───────────────────────────────────────────

// `entrada` é `{ poemas, prosas }` (já filtrados por quem chama). Opções:
// `minimoRecorrente` (padrão 2): quantos textos fazem uma referência recorrente.
export function montarForaDoAcervo(entrada = {}, { minimoRecorrente = 2 } = {}) {
    const usos = coletarUsos(entrada);
    const obras = ordenarObras(agruparObras(usos));
    const referencias = montarReferencias(entrada, minimoRecorrente);
    const origens = agruparOrigens(usos);

    const comForaDoAcervo = new Set();
    for (const t of textosDaLista(entrada)) {
        const tem = ['intertextualidade', 'hipertextualidade', 'referenciasExternas'].some(
            (campo) => entradas(t.item, campo).length > 0,
        );
        if (tem) comForaDoAcervo.add(`${t.tipo}:${t.id}`);
    }

    return {
        obras,
        autores: agruparAutores(obras),
        origens,
        derivacoes: montarDerivacoes(entrada),
        referencias,
        quaseDuplicatas: acharQuaseDuplicatas(obras),
        totais: {
            textosComForaDoAcervo: comForaDoAcervo.size,
            obras: obras.length,
            autores: new Set(obras.flatMap((o) => chavesDosAutores(o.autores))).size,
            origens: origens.filter((g) => !g.semOrigem).length,
            referencias: referencias.length,
            referenciasRecorrentes: referencias.filter((r) => r.recorrente).length,
            entradasSemNome: usos.filter((u) => !chaveDeNome(u.obra)).length,
        },
    };
}
