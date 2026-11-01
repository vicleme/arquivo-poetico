// ============================================================
// exportar-fora-do-acervo.js: relatório da seção "Fora do acervo" da aba
// Conexões, em .md e .csv (T9, entrega 10 de 13: lógica, sem tela; o .pdf vem
// na 11 e o botão na 12). Mesmo desenho do relatório de Conexões
// (exportar-conexoes.js): lógica pura sobre os dados já calculados por
// `montarForaDoAcervo` (fora-do-acervo.js), e só os `baixar...` tocam o DOM.
//
// Escopos: 'tudo' e um por bloco da tela (obras, autores, origens, derivacoes,
// referencias, avisos). O .md aceita todos; o .csv é uma tabela por vez, então
// 'tudo' (ou escopo desconhecido) vira a tabela de obras.
//
// Filtro e ordem: `{ consulta, ordem }` valem para Obras, Autores e Origens, como
// na tela (filtrarObras/filtrarAutores/filtrarOrigens e as ordenar...DaLista).
// Os outros blocos saem inteiros, como na tela.
//
// Autores em lista e datas já saem como no resto do app: autores numa frase
// ("A, B e C"), datas por `textoDaDataDaEntrada` (Pessoa pública: nasc. e óbito).
// ============================================================

import {
    filtrarObras,
    filtrarAutores,
    filtrarOrigens,
    ordenarObrasDaLista,
    ordenarAutoresDaLista,
    ordenarOrigensDaLista,
    ORDENS_FORA_DO_ACERVO,
} from './fora-do-acervo.js';
import { textoDaDataDaEntrada, textosDasPontasDaEntrada } from './data-da-entrada-texto.js';
import { gerarCsv, baixarCsv } from './exportar-csv.js';
import { baixarArquivo } from './exportar-conexoes.js';

export const ESCOPOS_FORA_DO_ACERVO = [
    'tudo',
    'obras',
    'autores',
    'origens',
    'derivacoes',
    'referencias',
    'avisos',
];

export const ESCOPOS_CSV_FORA_DO_ACERVO = [
    'obras',
    'autores',
    'origens',
    'derivacoes',
    'referencias',
    'avisos',
];

export const NOME_ARQUIVO_FORA_DO_ACERVO = {
    tudo: 'fora-do-acervo',
    obras: 'fora-do-acervo-obras',
    autores: 'fora-do-acervo-autores',
    origens: 'fora-do-acervo-origens',
    derivacoes: 'fora-do-acervo-derivacoes',
    referencias: 'fora-do-acervo-referencias',
    avisos: 'fora-do-acervo-avisos',
};

export const TITULOS_FORA_DO_ACERVO = {
    tudo: 'Fora do acervo',
    obras: 'Fora do acervo: obras',
    autores: 'Fora do acervo: autores',
    origens: 'Fora do acervo: origens',
    derivacoes: 'Fora do acervo: derivações',
    referencias: 'Fora do acervo: referências',
    avisos: 'Fora do acervo: avisos de quase-duplicatas',
};

const ROTULO_ORDEM = {
    textos: 'mais textos primeiro',
    alfabetica: 'A → Z',
    'data-antiga': 'data da obra, mais antiga primeiro',
    'data-recente': 'data da obra, mais recente primeiro',
};

const MOTIVOS = {
    grafias: 'Mesma obra escrita de jeitos diferentes',
    autor: 'Mesmo título com autor diferente ou sem autor',
    parecido: 'Títulos parecidos do mesmo autor',
};

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`;
const aparar = (v) => String(v ?? '').trim();

// Escopo desconhecido no .md vale 'tudo' (como no relatório de Conexões).
const escopoDoMarkdown = (escopo) => (ESCOPOS_FORA_DO_ACERVO.includes(escopo) ? escopo : 'tudo');

// O .pdf parte do mesmo Markdown, então usa o mesmo critério de escopo.
export const escopoDoRelatorioForaDoAcervo = escopoDoMarkdown;

function normalizarOpcoes({ consulta = '', ordem = 'textos' } = {}) {
    return {
        consulta: typeof consulta === 'string' ? consulta.trim() : '',
        ordem: ORDENS_FORA_DO_ACERVO.includes(ordem) ? ordem : 'textos',
    };
}

// Obras e Autores como a tela mostra: filtrados e na ordem escolhida.
export function obrasDoRelatorio(dados, opcoes) {
    const { consulta, ordem } = normalizarOpcoes(opcoes);
    return ordenarObrasDaLista(filtrarObras(dados?.obras || [], consulta), ordem);
}

export function autoresDoRelatorio(dados, opcoes) {
    const { consulta, ordem } = normalizarOpcoes(opcoes);
    return ordenarAutoresDaLista(filtrarAutores(dados?.autores || [], consulta), ordem);
}

export function origensDoRelatorio(dados, opcoes) {
    const { consulta, ordem } = normalizarOpcoes(opcoes);
    return ordenarOrigensDaLista(filtrarOrigens(dados?.origens || [], consulta), ordem);
}

const tituloDoTexto = (t) =>
    `${aparar(t.titulo) || '(sem título)'} (${t.tipo === 'prosa' ? 'prosa' : 'poema'})`;
const listaDeTextos = (textos, separador) => (textos || []).map(tituloDoTexto).join(separador);

// A marca "Obra pessoal" da obra em texto: 'sim' (todas as entradas), 'em N de
// M entradas' (divergem) ou '' (nenhuma).
const pessoalDaObra = (o) => {
    if (o.obraPessoal === 'todas') return 'sim';
    if (o.obraPessoal === 'algumas') {
        return `em ${o.entradasPessoais} de ${plural(o.entradasTotal, 'entrada', 'entradas')}`;
    }
    return '';
};

const relacoesDaObra = (o) =>
    Object.entries(o.porRelacao || {}).map(([rel, n]) => (n > 1 ? `${rel} ×${n}` : rel));

const dataDoPar = (par) =>
    textoDaDataDaEntrada({ dataObra: par?.inicio || null, dataObraAte: par?.fim || null });

// Os pares de data da obra, do mais usado ao menos usado, em texto.
const datasDaObra = (o) => (o.datas || []).map(dataDoPar).filter(Boolean);

// ─── Resumo ──────────────────────────────────────────────────

export function resumoForaDoAcervo(dados) {
    const t = dados?.totais;
    if (!t?.textosComForaDoAcervo) {
        return 'Nenhuma Intertextualidade, Hipertextualidade ou Referência (Externa) cadastrada ainda.';
    }
    const partes = [
        plural(t.textosComForaDoAcervo, 'texto', 'textos'),
        plural(t.obras, 'obra', 'obras'),
        plural(t.autores, 'autor', 'autores'),
        plural(t.referencias, 'referência', 'referências'),
    ];
    return partes.join(' · ');
}

// Linha do filtro e da ordem, quando há filtro (ou ordem diferente da padrão).
function linhaDoFiltro(dados, opcoes) {
    const { consulta, ordem } = normalizarOpcoes(opcoes);
    const partes = [];
    if (consulta) {
        partes.push(
            `Filtro: “${consulta}” (${plural(obrasDoRelatorio(dados, opcoes).length, 'obra', 'obras')} de ${dados?.obras?.length || 0}; ${plural(autoresDoRelatorio(dados, opcoes).length, 'autor', 'autores')} de ${dados?.autores?.length || 0}; ${plural(origensDoRelatorio(dados, opcoes).length, 'origem', 'origens')} de ${dados?.origens?.length || 0})`,
        );
    }
    if (ordem !== 'textos') partes.push(`Ordem: ${ROTULO_ORDEM[ordem]}`);
    return partes.length ? `${partes.join('. ')}.\n` : '';
}

// ─── Markdown ────────────────────────────────────────────────

const vazio = (mensagem) => `_${mensagem}_\n`;

function blocoObra(o) {
    const cabecalho = [
        `**${o.obra}**${o.autor ? ` (${o.autor})` : ''}`,
        aparar(o.tipoObra),
        o.comoHipotexto ? 'hipotexto' : '',
        plural(o.totalTextos, 'texto', 'textos'),
    ]
        .filter(Boolean)
        .join(' · ');
    const linhas = [`- ${cabecalho}`];
    const datas = datasDaObra(o);
    if (datas.length === 1) linhas.push(`  - Data: ${datas[0]}`);
    else if (datas.length > 1) linhas.push(`  - Datas diferentes: ${datas.join('; ')}`);
    const pessoal = pessoalDaObra(o);
    if (pessoal) linhas.push(`  - Obra pessoal: ${pessoal}`);
    const relacoes = relacoesDaObra(o);
    if (relacoes.length) linhas.push(`  - Relações: ${relacoes.join(', ')}`);
    if (o.descricao) linhas.push(`  - Descrição: ${o.descricao}`);
    if ((o.descricoes || []).length > 1) {
        linhas.push(
            `  - Outras descrições: ${o.descricoes.filter((d) => d !== o.descricao).join('; ')}`,
        );
    }
    if ((o.grafias || []).length > 1)
        linhas.push(`  - Escrita de jeitos diferentes: ${o.grafias.join('; ')}`);
    linhas.push(`  - Textos: ${listaDeTextos(o.textos, ', ')}`);
    return linhas.join('\n');
}

function secaoObras(dados, opcoes) {
    let md = '## Obras\n\n';
    if (!dados?.obras?.length) return md + vazio('Nenhuma obra com nome cadastrada.');
    const lista = obrasDoRelatorio(dados, opcoes);
    if (!lista.length) return md + vazio('Nenhuma obra combina com o filtro.');
    return md + `${lista.map(blocoObra).join('\n')}\n`;
}

function blocoAutor(a) {
    const obras = (a.obras || [])
        .map((o) => `${o.obra}${o.totalTextos > 1 ? ` (${o.totalTextos})` : ''}`)
        .join(', ');
    const linhas = [`- **${a.autor}** · ${plural(a.totalTextos, 'texto', 'textos')}`];
    if (obras) linhas.push(`  - Obras: ${obras}`);
    linhas.push(`  - Textos: ${listaDeTextos(a.textos, ', ')}`);
    return linhas.join('\n');
}

function secaoAutores(dados, opcoes) {
    let md = '## Autores\n\n';
    if (!dados?.autores?.length) return md + vazio('Nenhum autor cadastrado.');
    const lista = autoresDoRelatorio(dados, opcoes);
    if (!lista.length) return md + vazio('Nenhum autor combina com o filtro.');
    return md + `${lista.map(blocoAutor).join('\n')}\n`;
}

function linhaDerivacao(d) {
    const origens = (d.hipotextos || [])
        .map((h) => {
            const rotulo = aparar(h.relacao) ? `${h.relacao}: ` : '';
            const autor = h.autor ? ` (${h.autor})` : '';
            return `${rotulo}**${h.hipotexto}**${autor}`;
        })
        .join(' · ');
    return `- ${tituloDoTexto(d)} ← ${origens}`;
}

function secaoDerivacoes(dados) {
    let md = '## Hipertextualidade: de qual obra cada texto deriva\n\n';
    if (!dados?.derivacoes?.length) return md + vazio('Nenhuma Hipertextualidade cadastrada.');
    return md + `${dados.derivacoes.map(linhaDerivacao).join('\n')}\n`;
}

function blocoReferencia(r) {
    const cabecalho = [
        `**${r.texto}**`,
        aparar(r.tipo),
        textoDaDataDaEntrada({ tipo: r.tipo, dataObra: r.dataObra, dataObraAte: r.dataObraAte }),
        plural(r.totalTextos, 'texto', 'textos'),
    ]
        .filter(Boolean)
        .join(' · ');
    return `- ${cabecalho}\n  - Textos: ${listaDeTextos(r.textos, ', ')}`;
}

function secaoReferencias(dados) {
    let md = '## Referências\n\n';
    const todas = dados?.referencias || [];
    if (!todas.length) return md + vazio('Nenhuma referência (Externa) cadastrada.');
    const recorrentes = todas.filter((r) => r.recorrente);
    const unicas = todas.filter((r) => !r.recorrente);
    md += '### Recorrentes (em dois textos ou mais)\n\n';
    md += recorrentes.length
        ? `${recorrentes.map(blocoReferencia).join('\n')}\n`
        : vazio('Nenhuma referência aparece em mais de um texto.');
    if (unicas.length) {
        md += `\n### Em um texto só (${unicas.length})\n\n${unicas.map(blocoReferencia).join('\n')}\n`;
    }
    return md;
}

function blocoOrigem(g) {
    const obras = (g.obras || [])
        .map((o) => `${o.obra}${o.autor ? ` (${o.autor})` : ''}`)
        .join(', ');
    const linhas = [
        `- **${g.origem}** · ${[
            plural(g.totalTextos, 'texto', 'textos'),
            plural(g.totalObras, 'obra', 'obras'),
            plural(g.totalAutores, 'autor', 'autores'),
        ].join(' · ')}`,
    ];
    if (obras) linhas.push(`  - Obras: ${obras}`);
    if ((g.autores || []).length) linhas.push(`  - Autores: ${g.autores.join(', ')}`);
    linhas.push(`  - Textos: ${listaDeTextos(g.textos, ', ')}`);
    return linhas.join('\n');
}

function secaoOrigens(dados, opcoes) {
    let md = '## Origens\n\n';
    if (!dados?.origens?.length)
        return md + vazio('Nenhuma obra cadastrada para listar por origem.');
    const lista = origensDoRelatorio(dados, opcoes);
    if (!lista.length) return md + vazio('Nenhuma origem combina com o filtro.');
    return md + `${lista.map(blocoOrigem).join('\n')}\n`;
}

const itemDeAviso = (i) => `**${i.obra}** (${i.autor || 'sem autor'})`;

function secaoAvisos(dados) {
    let md = '## Avisos de quase-duplicatas\n\n';
    if (!dados?.quaseDuplicatas?.length) return md + vazio('Nenhuma quase-duplicata encontrada.');
    return (
        md +
        `${dados.quaseDuplicatas
            .map(
                (q) =>
                    `- ${MOTIVOS[q.motivo] || q.motivo}: ${q.itens.map(itemDeAviso).join(' ≈ ')}`,
            )
            .join('\n')}\n`
    );
}

// `dados` é o resultado de `montarForaDoAcervo`. `escopo`: 'tudo' (padrão) ou
// um bloco. `opcoes`: `{ consulta, ordem }` (Obras e Autores).
export function gerarMarkdownForaDoAcervo(dados, escopo = 'tudo', opcoes = {}) {
    const e = escopoDoMarkdown(escopo);
    const cabecalho = `# ${TITULOS_FORA_DO_ACERVO[e]}\n\n${resumoForaDoAcervo(dados)}\n${linhaDoFiltro(dados, opcoes)}`;
    if (!dados?.totais?.textosComForaDoAcervo) return cabecalho;
    const secoes = {
        obras: () => secaoObras(dados, opcoes),
        autores: () => secaoAutores(dados, opcoes),
        origens: () => secaoOrigens(dados, opcoes),
        derivacoes: () => secaoDerivacoes(dados),
        referencias: () => secaoReferencias(dados),
        avisos: () => secaoAvisos(dados),
    };
    const quais = e === 'tudo' ? ESCOPOS_CSV_FORA_DO_ACERVO : [e];
    return [cabecalho, ...quais.map((q) => secoes[q]())].join('\n---\n\n');
}

// ─── CSV ─────────────────────────────────────────────────────

const SEP = ' | ';

const COLUNAS_CSV = {
    obras: [
        { cabecalho: 'obra', valor: (o) => o.obra },
        { cabecalho: 'autor', valor: (o) => (o.autores || []).join('; ') },
        { cabecalho: 'tipo_obra', valor: (o) => o.tipoObra },
        { cabecalho: 'hipotexto', valor: (o) => (o.comoHipotexto ? 'sim' : '') },
        { cabecalho: 'obra_pessoal', valor: (o) => pessoalDaObra(o) },
        {
            cabecalho: 'data_obra',
            valor: (o) => textosDasPontasDaEntrada({ dataObra: o.dataObra }).inicio,
        },
        {
            cabecalho: 'data_obra_ate',
            valor: (o) => textosDasPontasDaEntrada({ dataObraAte: o.dataObraAte }).fim,
        },
        { cabecalho: 'outras_datas', valor: (o) => datasDaObra(o).slice(1).join(SEP) },
        { cabecalho: 'relacoes', valor: (o) => relacoesDaObra(o).join(SEP) },
        { cabecalho: 'n_textos', valor: (o) => o.totalTextos },
        { cabecalho: 'textos', valor: (o) => listaDeTextos(o.textos, SEP) },
        { cabecalho: 'descricao', valor: (o) => o.descricao },
        {
            cabecalho: 'grafias',
            valor: (o) => ((o.grafias || []).length > 1 ? o.grafias.join(SEP) : ''),
        },
    ],
    autores: [
        { cabecalho: 'autor', valor: (a) => a.autor },
        { cabecalho: 'n_textos', valor: (a) => a.totalTextos },
        {
            cabecalho: 'obras',
            valor: (a) =>
                (a.obras || [])
                    .map((o) => `${o.obra}${o.totalTextos > 1 ? ` (${o.totalTextos})` : ''}`)
                    .join(SEP),
        },
        { cabecalho: 'textos', valor: (a) => listaDeTextos(a.textos, SEP) },
    ],
    origens: [
        { cabecalho: 'origem', valor: (g) => g.origem },
        { cabecalho: 'sem_origem', valor: (g) => (g.semOrigem ? 'sim' : '') },
        { cabecalho: 'n_textos', valor: (g) => g.totalTextos },
        { cabecalho: 'n_obras', valor: (g) => g.totalObras },
        { cabecalho: 'n_autores', valor: (g) => g.totalAutores },
        {
            cabecalho: 'obras',
            valor: (g) =>
                (g.obras || []).map((o) => `${o.obra}${o.autor ? ` (${o.autor})` : ''}`).join(SEP),
        },
        { cabecalho: 'autores', valor: (g) => (g.autores || []).join(SEP) },
        { cabecalho: 'textos', valor: (g) => listaDeTextos(g.textos, SEP) },
    ],
    derivacoes: [
        { cabecalho: 'texto', valor: (l) => aparar(l.titulo) || '(sem título)' },
        { cabecalho: 'tipo_texto', valor: (l) => l.tipo },
        { cabecalho: 'relacao', valor: (l) => l.relacao },
        { cabecalho: 'hipotexto', valor: (l) => l.hipotexto },
        { cabecalho: 'autor', valor: (l) => (l.autores || []).join('; ') },
        { cabecalho: 'tipo_obra', valor: (l) => l.tipoObra },
    ],
    referencias: [
        { cabecalho: 'referencia', valor: (r) => r.texto },
        { cabecalho: 'tipo', valor: (r) => r.tipo },
        {
            cabecalho: 'data',
            valor: (r) => textosDasPontasDaEntrada({ dataObra: r.dataObra }).inicio,
        },
        {
            cabecalho: 'data_ate',
            valor: (r) => textosDasPontasDaEntrada({ dataObraAte: r.dataObraAte }).fim,
        },
        { cabecalho: 'n_textos', valor: (r) => r.totalTextos },
        { cabecalho: 'recorrente', valor: (r) => (r.recorrente ? 'sim' : '') },
        { cabecalho: 'textos', valor: (r) => listaDeTextos(r.textos, SEP) },
    ],
    avisos: [
        { cabecalho: 'motivo', valor: (q) => MOTIVOS[q.motivo] || q.motivo },
        {
            cabecalho: 'obras',
            valor: (q) => q.itens.map((i) => `${i.obra} (${i.autor || 'sem autor'})`).join(SEP),
        },
    ],
};

// Uma linha por registro: obra, autor, referência ou aviso; nas derivações, uma
// linha por hipotexto de cada texto.
function registrosDoCsv(dados, escopo, opcoes) {
    if (escopo === 'obras') return obrasDoRelatorio(dados, opcoes);
    if (escopo === 'autores') return autoresDoRelatorio(dados, opcoes);
    if (escopo === 'origens') return origensDoRelatorio(dados, opcoes);
    if (escopo === 'derivacoes') {
        return (dados?.derivacoes || []).flatMap((d) =>
            (d.hipotextos || []).map((h) => ({ ...h, tipo: d.tipo, id: d.id, titulo: d.titulo })),
        );
    }
    if (escopo === 'referencias') return dados?.referencias || [];
    return dados?.quaseDuplicatas || [];
}

export function escopoDoCsvForaDoAcervo(escopo) {
    return ESCOPOS_CSV_FORA_DO_ACERVO.includes(escopo) ? escopo : 'obras';
}

export function gerarCsvForaDoAcervo(dados, escopo = 'obras', opcoes = {}) {
    const e = escopoDoCsvForaDoAcervo(escopo);
    return gerarCsv(COLUNAS_CSV[e], registrosDoCsv(dados, e, opcoes));
}

// ─── Download ────────────────────────────────────────────────

export function baixarForaDoAcervoMarkdown(dados, escopo = 'tudo', opcoes = {}) {
    const e = escopoDoMarkdown(escopo);
    baixarArquivo(
        gerarMarkdownForaDoAcervo(dados, e, opcoes),
        'text/markdown',
        `${NOME_ARQUIVO_FORA_DO_ACERVO[e]}.md`,
    );
}

export function baixarForaDoAcervoCsv(dados, escopo = 'obras', opcoes = {}) {
    const e = escopoDoCsvForaDoAcervo(escopo);
    baixarCsv(gerarCsvForaDoAcervo(dados, e, opcoes), `${NOME_ARQUIVO_FORA_DO_ACERVO[e]}.csv`);
}
