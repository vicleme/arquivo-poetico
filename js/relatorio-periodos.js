// ============================================================
// relatorio-periodos.js: relatório em .md e .pdf dos Períodos Biográficos,
// dos Períodos Históricos e das Correntes literárias (Fase 14, etapa 4).
//
// Pedido do Victor: "Baixar .md e .pdf, em formato de relatório, dos períodos
// e das correntes. A organização forma uma boa linha do tempo." Respostas
// dele (16/10/2026):
//   - um arquivo por aba, baixado na própria aba, como em Assuntos;
//   - a linha do tempo pode sair por data ou em árvore, e quem baixa escolhe
//     uma delas ou as duas, cada uma em seu arquivo;
//   - os textos ligados a cada item (nenhum, só a contagem ou os títulos) são
//     escolhidos na hora de baixar.
//
// Este arquivo só tem lógica pura (sem DOM e sem download): monta o modelo do
// relatório a partir do `db` e o escreve em Markdown. O PDF (relatorio-pdf.js)
// e a janela de escolhas (ui-relatorio-periodos.js) leem o mesmo modelo, então
// .md e .pdf nunca divergem no que entra.
//
// Regras herdadas do plano da Fase 14:
//   - F14-D10: um texto marcado numa divisão (ou num período de dentro) aparece
//     sob ela e também sob o pai, e o pai conta tudo o que está abaixo, cada
//     texto uma vez só;
//   - duração com a data da exportação colada ao valor, porque a duração "até
//     hoje" envelhece: "(2 anos e 7 meses, até 15/10/2026)", e uma linha
//     "Exportado em ..." no topo;
//   - evento é período marcado (`evento: true`) e segue a mesma árvore.
// ============================================================

import {
    anoEquivalenteMovimento,
    comDuracao,
    duracaoDoIntervalo,
    ehEvento,
    formatarDataParcialMovimento,
    formatarIntervaloMovimentoEscola,
    formatarIntervaloPeriodoHistorico,
    periodosBiograficosDoItem,
    periodosHistoricosIdsDoItem,
} from './utils.js';
import { textoDaRegiao } from './regiao.js';
import {
    caminhoDoPeriodo,
    descendentesDoPeriodo,
    ordenarPeriodosEmArvore,
    paisDoPeriodo,
} from './periodos-historicos-hierarquia.js';
import {
    criarComparadorDeEpocas,
    datasEfetivasDoPeriodo,
} from './periodos-biograficos-hierarquia.js';
import {
    caminhoDaCorrente,
    descendentesDaCorrente,
    ordenarCorrentesEmArvore,
    posturaEfetivaDaCorrente,
    programaEfetivoDaCorrente,
    regiaoEfetivaDaCorrente,
    tipoEfetivoDaCorrente,
} from './correntes-hierarquia.js';
import { ordenarTextosDoPeriodo } from './lista-textos-periodo.js';

// ─── Opções e rótulos ────────────────────────────────────────

export const TIPOS_RELATORIO = ['epocas', 'periodosHistoricos', 'correntes'];
export const ORGANIZACOES_RELATORIO = ['data', 'arvore'];
export const TEXTOS_RELATORIO = ['nenhum', 'contagem', 'titulos'];

const ROTULOS = {
    epocas: {
        titulo: 'Períodos Biográficos',
        arquivo: 'periodos-biograficos',
        singular: 'período',
        vazio: 'Nenhum período biográfico cadastrado ainda.',
    },
    periodosHistoricos: {
        titulo: 'Períodos Históricos',
        arquivo: 'periodos-historicos',
        singular: 'período',
        vazio: 'Nenhum período histórico cadastrado ainda.',
    },
    correntes: {
        titulo: 'Correntes literárias',
        arquivo: 'correntes-literarias',
        singular: 'corrente',
        vazio: 'Nenhuma corrente literária cadastrada ainda.',
    },
};

export function rotulosDoRelatorio(tipo) {
    return ROTULOS[tipo] || ROTULOS.periodosHistoricos;
}

const SUFIXO_ORGANIZACAO = { data: 'por-data', arvore: 'em-arvore' };
const ROTULO_ORGANIZACAO = { data: 'Linha do tempo por data', arvore: 'Linha do tempo em árvore' };

// "periodos-historicos-por-data.md": minúsculas e sem acento (CLAUDE.md).
export function nomeDoArquivoDoRelatorio(tipo, organizacao, extensao) {
    const base = rotulosDoRelatorio(tipo).arquivo;
    const sufixo = SUFIXO_ORGANIZACAO[organizacao] || SUFIXO_ORGANIZACAO.data;
    return `${base}-${sufixo}.${extensao}`;
}

export function normalizarOpcoesDoRelatorio(opcoes = {}) {
    const organizacao = ORGANIZACOES_RELATORIO.includes(opcoes.organizacao)
        ? opcoes.organizacao
        : 'data';
    const textos = TEXTOS_RELATORIO.includes(opcoes.textos) ? opcoes.textos : 'contagem';
    return { organizacao, textos, incluirOcultos: !!opcoes.incluirOcultos };
}

// ─── Datas ───────────────────────────────────────────────────

const doisDigitos = (n) => String(n).padStart(2, '0');

// { ano, mes, dia } -> "15/10/2026".
export function textoDeHoje(hoje) {
    if (!hoje) return '';
    return `${doisDigitos(hoje.dia)}/${doisDigitos(hoje.mes)}/${hoje.ano}`;
}

const SEM_DATA = '—';

// Evento de um dia só (começo e fim iguais) mostra a data uma vez: "05/12/2024"
// em vez de "05/12/2024 – 05/12/2024". Só no relatório; a tela segue como está.
function recolherIntervaloIgual(texto) {
    const partes = String(texto).split(' – ');
    return partes.length === 2 && partes[0] === partes[1] ? partes[0] : texto;
}

function temFim(fim) {
    return formatarDataParcialMovimento(fim) !== SEM_DATA;
}

// Texto do intervalo com a duração. "Em andamento" e "Em aberto" colam a data
// da exportação: "A partir de 03/2024 (2 anos e 7 meses, até 15/10/2026)".
// A marca vem sempre explícita, "em andamento, até ..." ou "em aberto, até ...",
// para não se confundir com algo que terminou de fato na data da exportação.
// Sem duração calculável, só a marca e a data.
export function intervaloDoRelatorio(registro, { textoIntervalo, inicio, fim, hoje }) {
    if (!textoIntervalo || textoIntervalo === SEM_DATA) return '';
    textoIntervalo = recolherIntervaloIgual(textoIntervalo);
    if (registro?.emAndamento && !temFim(fim)) {
        const duracao = hoje && inicio ? duracaoDoIntervalo(inicio, hoje) : '';
        const marca = registro.emAberto ? 'em aberto' : 'em andamento';
        const ate = hoje ? `${marca}, até ${textoDeHoje(hoje)}` : '';
        const partes = [duracao, ate].filter(Boolean).join(', ');
        return partes ? `${textoIntervalo} (${partes})` : textoIntervalo;
    }
    return comDuracao(textoIntervalo, inicio, fim, {});
}

const ROMANOS = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
];

function paraRomano(n) {
    let resto = n;
    let saida = '';
    ROMANOS.forEach(([valor, letras]) => {
        while (resto >= valor) {
            saida += letras;
            resto -= valor;
        }
    });
    return saida;
}

// Século de um ano: 1 a 100 = I, 1801 a 1900 = XIX. Ano 0 ou negativo cai em
// "Antes do século I" (o app não distingue a.C.).
export function rotuloDoSeculo(ano) {
    if (ano == null) return 'Sem data';
    if (ano < 1) return 'Antes do século I';
    return `Século ${paraRomano(Math.floor((ano - 1) / 100) + 1)}`;
}

function chaveDeSeculo(ano) {
    if (ano == null) return Infinity;
    if (ano < 1) return -Infinity;
    return Math.floor((ano - 1) / 100) + 1;
}

// ─── Modelo comum ────────────────────────────────────────────

const comparaNome = (a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR');

// Mesma ordem cronológica das abas Período Histórico e Correntes literárias
// (compararPeriodosHistoricos e compararMovimentosEscolas, em render-listas.js):
// pelo ano do começo, ou do fim se faltar o começo; sem ano vai para o fim;
// empate pelo nome. O Período Biográfico usa o comparador próprio dele.
function compararPorAnoEquivalente(a, b) {
    const anoA = anoEquivalenteMovimento(a.inicio) ?? anoEquivalenteMovimento(a.fim);
    const anoB = anoEquivalenteMovimento(b.inicio) ?? anoEquivalenteMovimento(b.fim);
    if (anoA == null && anoB == null) return comparaNome(a, b);
    if (anoA == null) return 1;
    if (anoB == null) return -1;
    if (anoA !== anoB) return anoA - anoB;
    return comparaNome(a, b);
}

function ordenarPorTitulo(lista) {
    return ordenarTextosDoPeriodo(lista);
}

// Textos (poemas e prosas) que ligam algum dos ids; cada texto entra uma vez.
function textosLigados(dbRef, achaEm) {
    const poemas = ordenarPorTitulo((dbRef.poemas || []).filter(achaEm));
    const prosas = ordenarPorTitulo((dbRef.prosas || []).filter(achaEm));
    return { poemas, prosas, total: poemas.length + prosas.length };
}

function resumoDosTextos(textos) {
    const partes = [];
    if (textos.poemas.length) {
        partes.push(`${textos.poemas.length} ${textos.poemas.length === 1 ? 'poema' : 'poemas'}`);
    }
    if (textos.prosas.length) {
        partes.push(`${textos.prosas.length} ${textos.prosas.length === 1 ? 'prosa' : 'prosas'}`);
    }
    return partes.length ? `${textos.total} (${partes.join(', ')})` : '0';
}

const tituloDoTexto = (t) => (t.titulo && String(t.titulo).trim()) || '(sem título)';

function limparNotas(notas) {
    return String(notas || '')
        .replace(/\s*\n\s*/g, ' ')
        .trim();
}

function listaDeTexto(valores) {
    return (valores || []).filter(Boolean).join(', ');
}

// Quem está visível no relatório: oculto só entra com "Incluir dados
// ocultados". Hoje só o Período Biográfico tem `oculto`; a regra vale para
// qualquer registro que ganhe a marca.
function visiveisDe(lista, incluirOcultos) {
    return (lista || []).filter((r) => incluirOcultos || !r.oculto);
}

// ids do registro e dos que estão dentro dele (só os visíveis: o texto de um
// período oculto não pode vazar para o pai pela contagem).
function idsComDentro(id, descendentes, idsVisiveis) {
    const ids = new Set([String(id)]);
    descendentes.forEach((d) => {
        if (idsVisiveis.has(String(d))) ids.add(String(d));
    });
    return ids;
}

// ─── Montagem por tipo ───────────────────────────────────────

// Cada "fonte" devolve o mesmo formato: { grupos: [{ titulo, itens }] }, com
// `itens` = [{ id, nome, evento, nivel, datas, dentroDe, tambemEm, detalhes,
// notas, textos, autores, chaveData }] já na ordem da organização pedida.
// `chaveData` (ano) só serve ao agrupamento por século da linha por data.

function fonteEpocas(dbRef, { incluirOcultos, hoje }) {
    const todas = dbRef.epocas || [];
    const visiveis = visiveisDe(todas, incluirOcultos);
    const idsVisiveis = new Set(visiveis.map((e) => String(e.id)));
    const autores = [...new Set(visiveis.map((e) => e.autorId))]
        .map((id) => (dbRef.autores || []).find((a) => a.id == id))
        .filter(Boolean)
        .sort(comparaNome);

    return autores.map((autor) => {
        const doAutor = visiveis.filter((e) => e.autorId == autor.id);
        const comparar = criarComparadorDeEpocas(doAutor, 'cronologica');
        const itemDe = (ep) => {
            const datas = datasEfetivasDoPeriodo(doAutor, ep);
            const textoIntervalo = formatarIntervaloPeriodoHistorico(datas);
            const intervalo = intervaloDoRelatorio(ep, {
                textoIntervalo,
                inicio: datas.inicio,
                fim: datas.fim,
                hoje,
            });
            const ids = idsComDentro(ep.id, descendentesDoPeriodo(doAutor, ep.id), idsVisiveis);
            const textos = textosLigados(dbRef, (t) =>
                periodosBiograficosDoItem(t).some((x) => ids.has(String(x.epocaId))),
            );
            return {
                id: ep.id,
                nome: ep.nome,
                evento: ehEvento(ep),
                datas: intervalo ? { texto: intervalo, derivado: !!datas.derivado } : null,
                dentroDe: caminhoDosAncestrais(doAutor, ep.id),
                tambemEm: paisDoPeriodo(doAutor, ep.id)
                    .slice(1)
                    .map((pid) => caminhoDoPeriodo(doAutor, pid))
                    .filter(Boolean),
                detalhes: [
                    ['Esfera', listaDeTexto(ep.esferas)],
                    ['Categoria', listaDeTexto(ep.categorias)],
                ],
                notas: limparNotas(ep.notas),
                textos,
                autores: null,
                chaveData: anoDeReferencia(datas.inicio, datas.fim),
            };
        };
        return {
            titulo: autor.nome,
            lista: doAutor,
            comparar,
            arvore: (lista, cmp) => ordenarPeriodosEmArvore(lista, cmp),
            itemDe,
        };
    });
}

function fonteHistoricos(dbRef, { incluirOcultos, hoje }) {
    const todas = dbRef.periodosHistoricos || [];
    const lista = visiveisDe(todas, incluirOcultos);
    const idsVisiveis = new Set(lista.map((p) => String(p.id)));
    const comparar = compararPorAnoEquivalente;
    const itemDe = (ph) => {
        const textoIntervalo = formatarIntervaloPeriodoHistorico(ph);
        const intervalo = intervaloDoRelatorio(ph, {
            textoIntervalo,
            inicio: ph.inicio,
            fim: ph.fim,
            hoje,
        });
        const ids = idsComDentro(ph.id, descendentesDoPeriodo(lista, ph.id), idsVisiveis);
        const textos = textosLigados(dbRef, (t) =>
            periodosHistoricosIdsDoItem(t).some((x) => ids.has(String(x))),
        );
        return {
            id: ph.id,
            nome: ph.nome,
            evento: ehEvento(ph),
            datas: intervalo ? { texto: intervalo, derivado: false } : null,
            dentroDe: caminhoDosAncestrais(lista, ph.id),
            tambemEm: paisDoPeriodo(lista, ph.id)
                .slice(1)
                .map((pid) => caminhoDoPeriodo(lista, pid))
                .filter(Boolean),
            detalhes: [
                ['Esfera', listaDeTexto(ph.esferas)],
                ['Categoria', listaDeTexto(ph.categorias)],
                ['Região', textoDaRegiao(ph.regiao)],
            ],
            notas: limparNotas(ph.notas),
            textos,
            autores: null,
            chaveData: anoDeReferencia(ph.inicio, ph.fim),
        };
    };
    return [
        {
            titulo: null,
            lista,
            comparar,
            arvore: (l, cmp) => ordenarPeriodosEmArvore(l, cmp),
            itemDe,
        },
    ];
}

function fonteCorrentes(dbRef, { incluirOcultos, hoje }) {
    const todas = dbRef.movimentosEscolas || [];
    const lista = visiveisDe(todas, incluirOcultos);
    const idsVisiveis = new Set(lista.map((m) => String(m.id)));
    const comparar = compararPorAnoEquivalente;
    const itemDe = (m) => {
        const textoIntervalo = formatarIntervaloMovimentoEscola(m);
        const intervalo = intervaloDoRelatorio(m, {
            textoIntervalo,
            inicio: m.inicio,
            fim: m.fim,
            hoje,
        });
        const ids = idsComDentro(m.id, descendentesDaCorrente(lista, m.id), idsVisiveis);
        const acha = (t) => (t.movimentosEscolasIds || []).some((x) => ids.has(String(x)));
        const textos = textosLigados(dbRef, acha);
        const autores = (dbRef.autores || [])
            .filter(acha)
            .map((a) => a.nome)
            .sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
        const programa = programaEfetivoDaCorrente(lista, m);
        const postura = posturaEfetivaDaCorrente(lista, m);
        const tipo = tipoEfetivoDaCorrente(lista, m);
        const regiao = regiaoEfetivaDaCorrente(lista, m);
        const herdado = (v, sufixo) =>
            v.valor ? (v.herdadoDe ? `${v.valor} (${sufixo})` : v.valor) : '';
        return {
            id: m.id,
            nome: m.nome,
            evento: false,
            datas: intervalo ? { texto: intervalo, derivado: false } : null,
            dentroDe: caminhoDosAncestraisDaCorrente(lista, m),
            tambemEm: [],
            detalhes: [
                ['Divisão', [m.divisao, m.generoDivisao].filter(Boolean).join(', ')],
                ['Tipo', herdado(tipo, 'herdado')],
                ['Programa', herdado(programa, 'herdado')],
                ['Postura estética', herdado(postura, 'herdada')],
                ['Região', textoDaRegiao(regiao.valor)],
            ],
            notas: limparNotas(m.notas),
            textos,
            autores,
            chaveData: anoEquivalenteMovimento(m.inicio) ?? anoEquivalenteMovimento(m.fim) ?? null,
        };
    };
    return [
        {
            titulo: null,
            lista,
            comparar,
            arvore: (l, cmp) => ordenarCorrentesEmArvore(l, cmp),
            itemDe,
        },
    ];
}

// Caminho só dos ancestrais ("A › B" para um item dentro de B, que está em A):
// o nome do próprio item não entra.
function caminhoDosAncestrais(lista, id) {
    const completo = caminhoDoPeriodo(lista, id);
    const partes = completo.split(' › ');
    return partes.length > 1 ? partes.slice(0, -1).join(' › ') : '';
}

function caminhoDosAncestraisDaCorrente(lista, m) {
    if (m.paiId == null) return '';
    return caminhoDaCorrente(lista, m.paiId);
}

// Ano que posiciona o item na linha por data: o do começo; sem começo, o do fim.
function anoDeReferencia(inicio, fim) {
    return anoEquivalenteMovimento(inicio) ?? anoEquivalenteMovimento(fim) ?? null;
}

const FONTES = {
    epocas: fonteEpocas,
    periodosHistoricos: fonteHistoricos,
    correntes: fonteCorrentes,
};

// ─── Modelo do relatório ─────────────────────────────────────

/**
 * Monta o relatório de uma aba.
 *
 * `tipo`: 'epocas' | 'periodosHistoricos' | 'correntes'.
 * `opcoes`: { organizacao: 'data' | 'arvore', textos: 'nenhum' | 'contagem' |
 * 'titulos', incluirOcultos }. `hoje`: { ano, mes, dia } (o "hoje" do fuso da
 * pessoa, ver hojeDoUsuario).
 *
 * Devolve { tipo, titulo, organizacao, textos, hoje, grupos }:
 * `grupos` = [{ titulo, secoes: [{ titulo, itens }] }]. Na organização por
 * data cada seção é um século; em árvore há uma seção só, sem título. O
 * `titulo` do grupo é o nome do autor (Período Biográfico) ou null.
 */
export function montarRelatorio(tipo, dbRef, opcoes = {}, hoje = null) {
    const fonte = FONTES[tipo] || FONTES.periodosHistoricos;
    const norm = normalizarOpcoesDoRelatorio(opcoes);
    const grupos = fonte(dbRef, { incluirOcultos: norm.incluirOcultos, hoje }).map((g) => {
        if (norm.organizacao === 'arvore') {
            const itens = g.arvore(g.lista, g.comparar).map(({ m, nivel }) => ({
                ...g.itemDe(m),
                nivel,
            }));
            return { titulo: g.titulo, secoes: [{ titulo: null, itens }] };
        }
        const itens = g.lista
            .slice()
            .sort(g.comparar)
            .map((m) => ({ ...g.itemDe(m), nivel: 0 }));
        return { titulo: g.titulo, secoes: agruparPorSeculo(itens) };
    });
    return {
        tipo,
        titulo: rotulosDoRelatorio(tipo).titulo,
        organizacao: norm.organizacao,
        textos: norm.textos,
        hoje,
        grupos: grupos.filter((g) => g.secoes.some((s) => s.itens.length)),
    };
}

function agruparPorSeculo(itens) {
    const porChave = new Map();
    itens.forEach((item) => {
        const chave = chaveDeSeculo(item.chaveData);
        if (!porChave.has(chave)) {
            porChave.set(chave, { titulo: rotuloDoSeculo(item.chaveData), itens: [] });
        }
        porChave.get(chave).itens.push(item);
    });
    return [...porChave.entries()].sort((a, b) => a[0] - b[0]).map(([, secao]) => secao);
}

export function relatorioVazio(modelo) {
    return !modelo.grupos.length;
}

// ─── Markdown ────────────────────────────────────────────────

const NIVEL_MAXIMO_TITULO = 6;

function tituloMd(nivel, texto) {
    return `${'#'.repeat(Math.min(Math.max(nivel, 1), NIVEL_MAXIMO_TITULO))} ${texto}`;
}

function linhasDoItem(item, modelo, recuo = '') {
    const linhas = [];
    if (item.datas) {
        linhas.push(
            `- **Datas:** ${item.datas.texto}${item.datas.derivado ? ' (dos períodos de dentro)' : ''}`,
        );
    }
    if (modelo.organizacao === 'data' && item.dentroDe) {
        linhas.push(`- **Dentro de:** ${item.dentroDe}`);
    }
    if (item.tambemEm.length) linhas.push(`- **Também em:** ${item.tambemEm.join('; ')}`);
    item.detalhes.forEach(([rotulo, valor]) => {
        if (valor) linhas.push(`- **${rotulo}:** ${valor}`);
    });
    if (item.notas) linhas.push(`- **Notas:** ${item.notas}`);

    if (modelo.textos !== 'nenhum') {
        // Autores antes de Textos: a lista de títulos fica colada em Textos.
        if (item.autores) {
            linhas.push(
                `- **Autores:** ${item.autores.length}${
                    modelo.textos === 'titulos' && item.autores.length
                        ? ` (${item.autores.join(', ')})`
                        : ''
                }`,
            );
        }
        linhas.push(`- **Textos:** ${resumoDosTextos(item.textos)}`);
        if (modelo.textos === 'titulos') {
            item.textos.poemas.forEach((t) => linhas.push(`  - ${tituloDoTexto(t)} (poema)`));
            item.textos.prosas.forEach((t) => linhas.push(`  - ${tituloDoTexto(t)} (prosa)`));
        }
    }
    return linhas.map((l) => `${recuo}${l}`);
}

function tituloDoItem(item) {
    return `${item.nome}${item.evento ? ' (evento)' : ''}`;
}

/**
 * Escreve o modelo em Markdown. Estrutura de títulos:
 *   # Relatório (tipo)
 *   ## Autor            (só Período Biográfico)
 *   ## Século XIX       (só por data; ### sob o autor)
 *   ### Item            (em árvore, um nível a mais por nível da árvore)
 * Cada item vem seguido de uma lista de campos. Do 7º nível em diante (o
 * Markdown só tem títulos até ######), o item vira marcador em negrito, com
 * os campos recuados e um recuo a mais por nível. Sem travessão (CLAUDE.md).
 */
export function relatorioParaMarkdown(modelo) {
    const org = modelo.organizacao;
    const partes = [];
    partes.push(`# ${modelo.titulo}`);
    partes.push(`_${ROTULO_ORGANIZACAO[org]}_`);
    if (modelo.hoje) {
        partes.push(
            `Exportado em ${textoDeHoje(modelo.hoje)}. As durações em andamento contam até essa data.`,
        );
    }
    if (relatorioVazio(modelo)) {
        partes.push(`_${rotulosDoRelatorio(modelo.tipo).vazio}_`);
        return `${partes.join('\n\n')}\n`;
    }

    modelo.grupos.forEach((grupo) => {
        const base = grupo.titulo ? 2 : 1;
        if (grupo.titulo) partes.push(tituloMd(2, grupo.titulo));
        grupo.secoes.forEach((secao) => {
            let nivelItem = base + 1;
            if (secao.titulo) {
                partes.push(tituloMd(base + 1, secao.titulo));
                nivelItem = base + 2;
            }
            secao.itens.forEach((item) => {
                const nivel = nivelItem + (org === 'arvore' ? item.nivel : 0);
                if (nivel <= NIVEL_MAXIMO_TITULO) {
                    const bloco = [
                        tituloMd(nivel, tituloDoItem(item)),
                        ...linhasDoItem(item, modelo),
                    ];
                    partes.push(bloco.join('\n'));
                    return;
                }
                // Além do 6º nível o Markdown não tem título: o item vira
                // um marcador em negrito (sem dois-pontos, para não parecer
                // um campo) e os campos dele ficam recuados por baixo. Cada
                // nível a mais recua mais, então a árvore continua legível e
                // o item continua dentro do pai. Colado ao bloco anterior
                // (sem linha em branco) para a lista não se partir.
                const fundo = nivel - NIVEL_MAXIMO_TITULO;
                const recuo = '  '.repeat(fundo - 1);
                const bloco = [
                    `${recuo}- **${tituloDoItem(item)}**`,
                    ...linhasDoItem(item, modelo, `${recuo}  `),
                ].join('\n');
                if (partes.length) partes[partes.length - 1] += `\n${bloco}`;
                else partes.push(bloco);
            });
        });
    });
    return `${partes.join('\n\n')}\n`;
}

export function gerarMarkdownRelatorio(tipo, dbRef, opcoes, hoje) {
    return relatorioParaMarkdown(montarRelatorio(tipo, dbRef, opcoes, hoje));
}
