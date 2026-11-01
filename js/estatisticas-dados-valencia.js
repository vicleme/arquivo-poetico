// ============================================================
// estatisticas-dados-valencia.js: "peso dos temas" (Valência do Tema).
//
// A valência é do TEMA (db.temas[].valencia), igual para todo texto: ela diz
// que temas o autor ESCOLHE, não se um poema é alegre ou sombrio. Cada ligação
// Tema-texto conta uma vez (o mesmo Tema duas vezes no texto conta uma), e o
// seletor "Papel do tema" das Estatísticas recorta quais ligações entram.
//
// Para cada grupo (tudo, um autor, um ano, um período, um livro):
//   - agradavel, neutro, desagradavel, ambivalente: ligações com valência;
//   - semValencia: ligações cujo Tema ainda não foi classificado (ficam FORA
//     da conta, e a cobertura mostra quanto);
//   - indice = (desagradáveis - agradáveis) / (agradáveis + neutras +
//     desagradáveis), de -1 (só temas agradáveis) a +1 (só desagradáveis).
//     Ambivalente não entra na média (pesa e alivia ao mesmo tempo); aparece
//     à parte. `null` quando não há ligação para calcular;
//   - cobertura = ligações com valência / todas as ligações.
// ============================================================

import { db } from './db.js';
import {
    anoDeDataParcial,
    chaveTema,
    periodosBiograficosDoItem,
    ROTULO_PERIODO_OCULTO,
    temasComPapel,
} from './utils.js';
import { normalizarValenciaTema } from './temas.js';
import { getPapelTemaEstatisticas } from './estatisticas-filtros.js';
import { textosDasEstatisticas, textosDasEstatisticasComLivros } from './estatisticas-dados.js';

// Abaixo disto o grupo mostra o aviso "poucos dados": ano com 3 ligações não
// pesa como ano com 40.
export const MINIMO_LIGACOES_CONFIAVEL = 5;

function grupoVazio(rotulo) {
    return {
        rotulo,
        textos: 0,
        ligacoes: 0,
        agradavel: 0,
        neutro: 0,
        desagradavel: 0,
        ambivalente: 0,
        semValencia: 0,
    };
}

// Valência de cada Tema do texto (um por Tema, no recorte de papel).
function valenciasDoTexto(texto, papel) {
    const vistos = new Set();
    const lista = [];
    temasComPapel(texto, db.temas).forEach((e) => {
        if (papel !== 'todos' && e.papel !== (papel === 'semPapel' ? '' : papel)) return;
        const chave = chaveTema(e.nome);
        if (vistos.has(chave)) return;
        vistos.add(chave);
        const cadastro =
            e.temaId != null
                ? db.temas.find((t) => String(t.id) === String(e.temaId))
                : db.temas.find((t) => chaveTema(t.nome) === chave);
        lista.push(normalizarValenciaTema(cadastro?.valencia));
    });
    return lista;
}

function somarNoGrupo(grupo, valencias) {
    if (!valencias.length) return;
    grupo.textos += 1;
    valencias.forEach((v) => {
        grupo.ligacoes += 1;
        if (v) grupo[v] += 1;
        else grupo.semValencia += 1;
    });
}

// Completa o grupo com os derivados (classificados, cobertura, índice).
export function fecharGrupoValencia(grupo) {
    const base = grupo.agradavel + grupo.neutro + grupo.desagradavel;
    const classificados = base + grupo.ambivalente;
    return {
        ...grupo,
        classificados,
        cobertura: grupo.ligacoes ? classificados / grupo.ligacoes : null,
        indice: base ? (grupo.desagradavel - grupo.agradavel) / base : null,
        poucosDados: classificados < MINIMO_LIGACOES_CONFIAVEL,
    };
}

function agrupar(itens, chavesDoItem, { papel, ordenar }) {
    const mapa = new Map();
    itens.forEach(({ texto, extra }) => {
        const valencias = valenciasDoTexto(texto, papel);
        if (!valencias.length) return;
        chavesDoItem(texto, extra).forEach((rotulo) => {
            if (!mapa.has(rotulo)) mapa.set(rotulo, grupoVazio(rotulo));
            somarNoGrupo(mapa.get(rotulo), valencias);
        });
    });
    return ordenar([...mapa.values()].map(fecharGrupoValencia));
}

const porRotulo = (a, b) => String(a.rotulo).localeCompare(String(b.rotulo), 'pt-BR');

// Todos os textos contados juntos.
export function valenciaGeral({ textos = textosDasEstatisticas(), papel } = {}) {
    const p = papel || getPapelTemaEstatisticas();
    const grupo = grupoVazio('Todos os textos');
    textos.forEach((t) => somarNoGrupo(grupo, valenciasDoTexto(t, p)));
    return fecharGrupoValencia(grupo);
}

// Um grupo por Autor (db.autores). Texto com mais de um autor conta para cada
// um; texto sem autor entra em "(sem autor)". Ordem: mais ligações primeiro.
export function valenciaPorAutor({ textos = textosDasEstatisticas(), papel } = {}) {
    const p = papel || getPapelTemaEstatisticas();
    const nomes = (texto) => {
        const lista = (Array.isArray(texto?.autoria) ? texto.autoria : [])
            .map((a) => (db.autores || []).find((x) => String(x.id) === String(a.autorId))?.nome)
            .filter(Boolean);
        return lista.length ? [...new Set(lista)] : ['(sem autor)'];
    };
    return agrupar(
        textos.map((texto) => ({ texto })),
        nomes,
        {
            papel: p,
            ordenar: (gs) => gs.sort((a, b) => b.ligacoes - a.ligacoes || porRotulo(a, b)),
        },
    );
}

export function anoDoTextoValencia(texto) {
    const ano = parseInt(anoDeDataParcial(texto?.dataEscrita) ?? texto?.ano);
    return Number.isFinite(ano) && ano > 0 ? String(ano) : null;
}

function anoDoPeriodo(epoca) {
    const ano = parseInt(anoDeDataParcial(epoca?.inicio));
    return Number.isFinite(ano) ? ano : Infinity;
}

// Evolução pelo eixo escolhido: 'ano' (cronológico; texto sem data fica de
// fora), 'periodo' (Período Biográfico pela época retratada; texto com vários
// períodos conta em cada um; período oculto vira "(período oculto)") ou
// 'livro' (ordem do cadastro de livros; Coletânea de fora).
export function valenciaPorEixo({ eixo = 'ano', textos = textosDasEstatisticas(), papel } = {}) {
    const p = papel || getPapelTemaEstatisticas();
    if (eixo === 'periodo') {
        return agrupar(
            textos.map((texto) => ({ texto })),
            (texto) => {
                const nomes = periodosBiograficosDoItem(texto, db.epocas).map((x) => {
                    const epoca = (db.epocas || []).find((e) => String(e.id) === String(x.epocaId));
                    if (!epoca) return '';
                    return epoca.oculto ? ROTULO_PERIODO_OCULTO : epoca.nome;
                });
                return [...new Set(nomes.filter(Boolean))];
            },
            {
                papel: p,
                ordenar: (gs) => {
                    const inicio = (rotulo) =>
                        anoDoPeriodo((db.epocas || []).find((e) => e.nome === rotulo));
                    return gs.sort(
                        (a, b) => inicio(a.rotulo) - inicio(b.rotulo) || porRotulo(a, b),
                    );
                },
            },
        );
    }
    if (eixo === 'livro') {
        const ordemLivros = (db.livros || []).map((l) => l.titulo || l.nome || '');
        const conjunto = new Set(textos);
        const alvo = textosDasEstatisticasComLivros()
            .filter(({ texto }) => conjunto.has(texto))
            .map(({ texto, livroIds }) => ({ texto, extra: livroIds }));
        return agrupar(
            alvo,
            (_texto, livroIds) => [
                ...new Set(
                    (livroIds || [])
                        .map((id) => {
                            const l = (db.livros || []).find((x) => String(x.id) === String(id));
                            return l ? l.titulo || l.nome || '' : '';
                        })
                        .filter(Boolean),
                ),
            ],
            {
                papel: p,
                ordenar: (gs) =>
                    gs.sort(
                        (a, b) =>
                            ordemLivros.indexOf(a.rotulo) - ordemLivros.indexOf(b.rotulo) ||
                            porRotulo(a, b),
                    ),
            },
        );
    }
    return agrupar(
        textos.map((texto) => ({ texto })),
        (texto) => {
            const ano = anoDoTextoValencia(texto);
            return ano ? [ano] : [];
        },
        { papel: p, ordenar: (gs) => gs.sort((a, b) => Number(a.rotulo) - Number(b.rotulo)) },
    );
}
