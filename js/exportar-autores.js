// ============================================================
// exportar-autores.js — Exportação da seleção de Autores (.json e .md).
//
// Mesma ideia de exportarSelecaoJson/exportarSelecaoMarkdown de
// exportar.js (Poemas/Prosas), mas em arquivo à parte: o registro de um
// Autor é outro (cadastro central, sem texto literário, sem
// Livro/Parte/Seção), e os exportadores de .pdf/.docx daquele lado
// montam o documento a partir de texto de poema/prosa — não servem
// aqui. Por isso só JSON e MD por enquanto.
//
// O JSON usa `export_format: 'selecao_autores'` (não 'selecao'), pra
// nenhuma ferramenta que leia a seleção de Poemas/Prosas confundir os
// dois formatos.
//
// Exportar é ato deliberado: sai TUDO que está cadastrado, inclusive
// os campos sensíveis (orientação, condições clínicas etc.) — mesmo
// espírito do .md de Poemas/Prosas, "referência de leitura completa".
// Só a busca sem prefixo e o card da lista os escondem (ver
// busca-autores.js).
// ============================================================

import { db, calcularImpactoExclusaoAutor } from './db.js';
import {
    formatarDataParcial,
    calcularAnoDominioPublico,
    idadeAutor,
    signoDoZodiaco,
    grupoSexualGenero,
    ROTULOS_GRUPO_SEXUAL_GENERO,
    mostrarAviso,
} from './utils.js';
import { coluna, colunasData, gerarCsv, baixarCsv, juntar } from './exportar-csv.js';

// Lista de {nome, tipo} (ou string legada "a, b") → [{nome, tipo}].
function listaComTipo(valor) {
    if (!valor) return [];
    const lista = Array.isArray(valor) ? valor : String(valor).split(',');
    return lista
        .map((i) =>
            typeof i === 'string'
                ? { nome: i.trim(), tipo: '' }
                : { nome: (i?.nome || '').trim(), tipo: i?.tipo || '' },
        )
        .filter((i) => i.nome);
}

// Registro exportado de um Autor: os campos do cadastro como estão +
// alguns DERIVADOS (nunca gravados no cadastro, ver schema.md), num
// bloco `derivados` à parte pra não parecerem dado de entrada.
export function montarRegistroAutor(autor, banco = db) {
    const { poemasIds, prosasIds } = calcularImpactoExclusaoAutor(banco, autor.id);
    const idade = idadeAutor(autor);
    const grupo = grupoSexualGenero(autor);
    return {
        ...JSON.parse(JSON.stringify(autor)),
        derivados: {
            idade: idade ? idade.anos : null,
            idade_aproximada: idade ? !!idade.aproximada : null,
            signo: signoDoZodiaco(autor.nascimento) || null,
            dominio_publico_desde: calcularAnoDominioPublico(autor.obito),
            grupo_sexual_genero: grupo !== 'nao-informado' ? grupo : null,
            total_poemas: poemasIds.length,
            total_prosas: prosasIds.length,
        },
    };
}

export function itensDaSelecaoAutores(ids, banco = db) {
    const idsSet = new Set(ids);
    return banco.autores
        .filter((a) => idsSet.has(a.id))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((a) => montarRegistroAutor(a, banco));
}

export function gerarJsonAutores(itens) {
    return JSON.stringify({ export_format: 'selecao_autores', itens }, null, 4);
}

function linha(rotulo, valor) {
    return valor ? `- **${rotulo}:** ${valor}` : '';
}

function listaTexto(itens) {
    return itens.map((i) => (i.tipo ? `${i.nome} (${i.tipo})` : i.nome)).join(', ');
}

// Um Autor em Markdown: título + linhas só dos campos preenchidos.
export function autorParaMarkdown(item) {
    const nomesLit = listaComTipo(item.nomesLiterarios);
    const nasc = item.nascimento ? formatarDataParcial(item.nascimento) : '';
    const obito = item.obito ? formatarDataParcial(item.obito) : '';
    const d = item.derivados || {};
    const linhas = [
        linha('Nomes literários', listaTexto(nomesLit)),
        linha('ISNI', item.isni),
        linha('Nacionalidade', item.nacionalidade),
        linha('Nascimento', nasc !== '—' ? nasc : ''),
        linha('Óbito', obito !== '—' ? obito : ''),
        linha(
            'Idade',
            d.idade != null ? `${d.idade_aproximada ? '≈ ' : ''}${d.idade} anos` : '',
        ),
        linha('Signo', d.signo),
        linha(
            'Domínio público',
            d.dominio_publico_desde ? `desde ${d.dominio_publico_desde}` : '',
        ),
        linha('Sexo', item.sexo),
        linha('Cor/Raça', item.corRaca),
        linha('Gênero', item.genero),
        linha('Orientação sexual', item.orientacaoSexual),
        linha('Identidade cis/trans', item.identidadeCisTrans),
        linha(
            'Grupo sexual e de gênero (derivado)',
            ROTULOS_GRUPO_SEXUAL_GENERO[d.grupo_sexual_genero],
        ),
        linha('Religião', item.religiao),
        linha(
            'Neurodivergência',
            listaComTipo(item.neurodivergencias)
                .map((i) => i.nome)
                .join(', '),
        ),
        linha('Condições clínicas', listaTexto(listaComTipo(item.condicoesClinicas))),
        linha('Deficiências', listaTexto(listaComTipo(item.deficiencias))),
        linha('Classe social', item.classeSocial),
        linha('Grau acadêmico', item.grauAcademico),
        linha('Instituições', listaComTipo(item.instituicoes).map((i) => i.nome).join(', ')),
        linha('Ocupações', listaComTipo(item.ocupacoes).map((i) => i.nome).join(', ')),
        linha(
            'Aparece em',
            `${d.total_poemas || 0} poema(s) e ${d.total_prosas || 0} prosa(s)`,
        ),
    ].filter(Boolean);

    let md = `## ${item.nome}${item.souEu ? ' (você)' : ''}\n\n${linhas.join('\n')}\n`;
    if (item.sobre) md += `\n**Sobre:** ${item.sobre}\n`;
    return md;
}

export function gerarMarkdownAutores(itens) {
    return `# Autores\n\n${itens.map(autorParaMarkdown).join('\n---\n\n')}`;
}

function baixarArquivo(conteudo, tipoMime, nomeArquivo) {
    const blob = new Blob([conteudo], { type: `${tipoMime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

export function exportarAutoresJson(ids) {
    const itens = itensDaSelecaoAutores(ids);
    if (itens.length === 0) return mostrarAviso('Nenhum autor selecionado.');
    const nome = `selecao_autores_${Date.now()}.json`;
    baixarArquivo(gerarJsonAutores(itens), 'application/json', nome);
}

export function exportarAutoresMarkdown(ids) {
    const itens = itensDaSelecaoAutores(ids);
    if (itens.length === 0) return mostrarAviso('Nenhum autor selecionado.');
    const nome = `selecao_autores_${Date.now()}.md`;
    baixarArquivo(gerarMarkdownAutores(itens), 'text/markdown', nome);
}

// ─── .csv (formato largo, uma linha por Autor) ──────────────────
// Infra e convenções em exportar-csv.js. Aqui só as colunas do Autor:
// lista → " | ", tipo entre parênteses ("Depressão (Mental)"), datas
// em três colunas, e os DERIVADOS (bloco `derivados` do registro) no
// fim. Como o .json/.md, exporta tudo o que está cadastrado, inclusive
// os campos sensíveis.

const itemComTipo = (i) => (i.tipo ? `${i.nome} (${i.tipo})` : i.nome);
const listaCsv = (valor) => juntar(listaComTipo(valor).map(itemComTipo));

export const COLUNAS_AUTOR = [
    coluna('id', ['id'], (a) => a.id),
    coluna('nome', ['nome'], (a) => a.nome),
    coluna('sou_eu', ['souEu'], (a) => !!a.souEu),
    coluna('isni', ['isni'], (a) => a.isni),
    coluna('nomes_literarios', ['nomesLiterarios'], (a) => listaCsv(a.nomesLiterarios)),
    coluna('nacionalidade', ['nacionalidade'], (a) => a.nacionalidade),
    ...colunasData('nascimento', ['nascimento'], (a) => a.nascimento),
    ...colunasData('obito', ['obito'], (a) => a.obito),
    coluna('sexo', ['sexo'], (a) => a.sexo),
    coluna('cor_raca', ['corRaca'], (a) => a.corRaca),
    coluna('genero', ['genero'], (a) => a.genero),
    coluna('orientacao_sexual', ['orientacaoSexual'], (a) => a.orientacaoSexual),
    coluna('identidade_cis_trans', ['identidadeCisTrans'], (a) => a.identidadeCisTrans),
    coluna('religiao', ['religiao'], (a) => a.religiao),
    coluna('classe_social', ['classeSocial'], (a) => a.classeSocial),
    coluna('neurodivergencias', ['neurodivergencias'], (a) => listaCsv(a.neurodivergencias)),
    coluna('condicoes_clinicas', ['condicoesClinicas'], (a) => listaCsv(a.condicoesClinicas)),
    coluna('deficiencias', ['deficiencias'], (a) => listaCsv(a.deficiencias)),
    coluna('grau_academico', ['grauAcademico'], (a) => a.grauAcademico),
    coluna('instituicoes', ['instituicoes'], (a) => listaCsv(a.instituicoes)),
    coluna('ocupacoes', ['ocupacoes'], (a) => listaCsv(a.ocupacoes)),
    coluna('sobre', ['sobre'], (a) => a.sobre),
    coluna('idade', [], (a) => a.derivados?.idade ?? ''),
    coluna('idade_aproximada', [], (a) => a.derivados?.idade_aproximada ?? ''),
    coluna('signo', [], (a) => a.derivados?.signo ?? ''),
    coluna('dominio_publico_desde', [], (a) => a.derivados?.dominio_publico_desde ?? ''),
    coluna('grupo_sexual_genero', [], (a) => a.derivados?.grupo_sexual_genero ?? ''),
    coluna('total_poemas', [], (a) => a.derivados?.total_poemas ?? ''),
    coluna('total_prosas', [], (a) => a.derivados?.total_prosas ?? ''),
];

// itens: saída de `itensDaSelecaoAutores` (cadastro + `derivados`).
export function gerarCsvAutores(itens) {
    return gerarCsv(COLUNAS_AUTOR, itens);
}

export function exportarAutoresCsv(ids) {
    const itens = itensDaSelecaoAutores(ids);
    if (itens.length === 0) return mostrarAviso('Nenhum autor selecionado.');
    baixarCsv(gerarCsvAutores(itens), `selecao_autores_${Date.now()}.csv`);
}
