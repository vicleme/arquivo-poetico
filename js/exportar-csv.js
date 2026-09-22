// ============================================================
// exportar-csv.js — Exportação da seleção em .csv, formato "largo":
// UM arquivo por tipo (Poemas, Prosas, Autores), UMA linha por
// registro, cada campo vira uma coluna.
//
// Pensado pra transformar o acervo em dataset (pandas, R, planilha),
// então difere do .json/.md em três pontos:
//   - tudo é achatado: campo com vários valores (etiquetas, pessoas,
//     autores...) vai numa célula só, valores separados por " | ";
//     lista de objetos (envios, elos...) vira uma entrada de texto
//     por objeto, também separadas por " | ";
//   - nomes resolvidos, nunca ids (autor, livro, pessoa, época): o id
//     só existe dentro do acervo de origem. Só a coluna `id` do próprio
//     registro fica, como chave;
//   - o corpo do texto sai como TEXTO PURO: marcação de formatação
//     (**, _, ~~, <u>, <div style>) e comentários pessoais (<!-- -->)
//     são removidos, por `corpoParaLinhasRicas`, o mesmo caminho do
//     .md/.pdf/.docx. Datas viram três colunas (ano, mês, dia) e
//     vêm com colunas calculadas (nº de versos, de estrofes, de
//     palavras).
//
// Formato do arquivo: UTF-8 com BOM (é o que faz o Excel reconhecer os
// acentos; pandas lê sem ajuste), vírgula como separador, aspas duplas
// como escape e quebra de linha CRLF (RFC 4180). O Excel em português
// costuma esperar ";" — nele, importar pelo assistente de dados.
//
// Cada coluna declara em `campos` quais chaves do registro de origem
// ela consome. Serve só pra `tests/exportar-csv.test.js`, que compara
// com o `dados = {...}` de forms.js e falha se um campo novo entrar no
// cadastro sem coluna (ou sem ser marcado como ignorado de propósito).
// ============================================================

import {
    SINALIZACOES_CATEGORIAS,
    corpoParaLinhasRicas,
    nomesPessoas,
    paresAutoria,
    paresGrupoPessoa,
    rotuloElo,
    tokenizar,
} from './utils.js';

export const SEPARADOR_LISTA = ' | ';
const BOM = '\uFEFF';

// ─── Infra de CSV ───────────────────────────────────────────────

// Uma célula pronta pra ir pro arquivo. Vazio/nulo → vazio; booleano →
// true/false (o pandas reconhece); aspas só quando o conteúdo exige
// (vírgula, aspas, quebra de linha, espaço nas pontas).
export function celulaCsv(valor) {
    if (valor === null || valor === undefined) return '';
    const s = String(valor); // boolean vira "true"/"false"
    return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// colunas: [{ cabecalho, valor(registro, ctx) }]. `ctxDe(registro)`
// monta o que várias colunas reaproveitam (ex.: análise do texto),
// pra não recalcular por coluna.
export function gerarCsv(colunas, registros, ctxDe = () => ({})) {
    const linhas = [colunas.map((c) => celulaCsv(c.cabecalho)).join(',')];
    registros.forEach((r) => {
        const ctx = ctxDe(r);
        linhas.push(colunas.map((c) => celulaCsv(c.valor(r, ctx))).join(','));
    });
    return `${BOM}${linhas.join('\r\n')}\r\n`;
}

export function baixarCsv(conteudo, nomeArquivo) {
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
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

// Atalho pra declarar coluna: cabeçalho, chaves de origem, função.
export const coluna = (cabecalho, campos, valor) => ({ cabecalho, campos, valor });

// ─── Helpers de célula ──────────────────────────────────────────

export function juntar(lista) {
    return lista
        .map((v) => (v == null ? '' : String(v).trim()))
        .filter(Boolean)
        .join(SEPARADOR_LISTA);
}

// String "a, b, c" (formato das Sinalizações, Gênero da Prosa...) → "a | b | c".
export function virgulasParaLista(valor) {
    if (!valor) return '';
    return juntar(String(valor).split(','));
}

const vazioSeNulo = (v) => (v === null || v === undefined ? '' : v);

// Data parcial { dia, mes, ano } → texto "2023-05-12", "2023-05" ou
// "2023" (sem inventar o que falta), pra dentro de células de lista.
export function dataTexto(d) {
    if (!d) return '';
    const p = (n) => String(n).padStart(2, '0');
    return [d.ano || '', d.mes ? p(d.mes) : '', d.dia ? p(d.dia) : ''].filter(Boolean).join('-');
}

// Três colunas (ano, mês, dia) a partir de uma data parcial.
export function colunasData(prefixo, campos, obter) {
    return ['ano', 'mes', 'dia'].map((parte) =>
        coluna(`${prefixo}_${parte}`, campos, (r) => vazioSeNulo(obter(r)?.[parte])),
    );
}

// Título do texto apontado por um Elo/Eco. Ids de Poema e Prosa nunca
// colidem (contador global único), então basta procurar nos dois.
function tituloPorId(banco, id) {
    const alvo =
        (banco.poemas || []).find((p) => p.id == id) ||
        (banco.prosas || []).find((p) => p.id == id);
    return alvo ? alvo.titulo || '(sem título)' : '(texto excluído)';
}

function comNota(base, nota) {
    return nota && String(nota).trim() ? `${base} (${String(nota).trim()})` : base;
}

// "Tipo: texto [link] (nota)". O rótulo de exibição do link
// (`linkTexto`) é cosmético e não entra: a URL basta.
function entradaExterna({ tipo, texto, link, nota }) {
    const base = [tipo, texto]
        .map((v) => (v || '').trim())
        .filter(Boolean)
        .join(': ');
    return comNota(link ? `${base} [${link}]` : base, nota);
}

// ─── Análise do texto ───────────────────────────────────────────

// HTML colado de fontes externas que sobrou no `texto` (as tags que o
// editor aceita, ver ALLOWLIST_TEXTO_RICO em utils.js): <br> e </p> viram
// quebra de linha, o resto das tags some. Só essas tags: um "<" solto
// no poema ("<3", "<--") fica como está.
const TAGS_DE_QUEBRA = /<br\s*\/?>|<\/p\s*>/gi;
const TAGS_RESIDUAIS = /<\/?(?:div|span|p|br|b|i|u)(?:\s[^>]*)?\/?>/gi;

// Corpo em texto puro + contagens. Reaproveita `corpoParaLinhasRicas`
// (a marcação e os comentários pessoais somem) e o `tokenizar` das
// Estatísticas (a contagem de palavras bate com a da aba).
export function analisarTexto(texto) {
    const plano = corpoParaLinhasRicas(texto)
        .map((runs) => runs.map((r) => r.texto).join(''))
        .join('\n')
        .replace(TAGS_DE_QUEBRA, '\n')
        .replace(TAGS_RESIDUAIS, '')
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .join('\n')
        .trim();
    const linhas = plano ? plano.split('\n') : [];
    let blocos = 0;
    let dentro = false;
    linhas.forEach((l) => {
        const cheia = l.trim() !== '';
        if (cheia && !dentro) blocos++;
        dentro = cheia;
    });
    return {
        plano,
        versos: linhas.filter((l) => l.trim() !== '').length,
        blocos,
        palavras: tokenizar(plano).length,
    };
}

// "De terceiros" como nas Estatísticas (ehTextoDeTerceiros): tem Autor
// vinculado e nenhum é o próprio dono do acervo. Sem nenhum Autor marcado
// "sou eu" no cadastro, a pergunta não tem resposta: célula vazia.
function deTerceiros(item, banco) {
    if (!(banco.autores || []).some((a) => a.souEu)) return '';
    const pares = paresAutoria(item, banco.autores);
    return pares.length > 0 && !pares.some(({ autor }) => autor.souEu);
}

// ─── Colunas de Poema / Prosa ───────────────────────────────────

// Recebe o registro de `montarRegistro` (exportar.js): o item inteiro +
// `tipo`, `contexto` (livro/parte/seção), nomes já resolvidos.
export function colunasTexto(tipo) {
    const ehPoema = tipo === 'poema';
    const nomeSinal = (chave) => `sinal_${chave.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)}`;

    return [
        coluna('id', ['id'], (r) => r.id),
        coluna('tipo', [], (r) => r.tipo),
        coluna('titulo', ['titulo'], (r) => r.titulo),
        coluna('texto', ['texto'], (r, ctx) => ctx.texto.plano),
        coluna(ehPoema ? 'n_versos' : 'n_linhas', [], (r, ctx) => ctx.texto.versos),
        coluna(ehPoema ? 'n_estrofes' : 'n_paragrafos', [], (r, ctx) => ctx.texto.blocos),
        coluna('n_palavras', [], (r, ctx) => ctx.texto.palavras),
        coluna('status', ['status'], (r) => r.status),
        coluna('idioma', ['idioma'], (r) => r.idioma),
        ...(ehPoema
            ? []
            : [
                  coluna('genero', ['genero'], (r) => virgulasParaLista(r.genero)),
                  coluna('publicado', ['publicado'], (r) => vazioSeNulo(r.publicado)),
              ]),

        // Autoria
        coluna('autores', ['autoria'], (r, ctx) =>
            juntar(paresAutoria(r, ctx.banco.autores).map(({ autor }) => autor.nome)),
        ),
        coluna('autoria_detalhe', [], (r, ctx) =>
            juntar(
                paresAutoria(r, ctx.banco.autores).map(
                    ({ autor, papel, assinatura, nomeLiterario }) =>
                        `${autor.nome} (${[
                            papel,
                            assinatura + (nomeLiterario ? `: ${nomeLiterario}` : ''),
                        ]
                            .filter(Boolean)
                            .join(', ')})`,
                ),
            ),
        ),
        coluna('de_terceiros', [], (r, ctx) => deTerceiros(r, ctx.banco)),

        // Onde o texto está no acervo
        coluna('livro', ['paiTipo', 'paiId'], (r) => r.contexto?.livro || ''),
        coluna('parte', [], (r) => r.contexto?.parte || ''),
        coluna('secao', [], (r) => r.contexto?.secao || ''),
        coluna('sequencia', ['sequencia'], (r) => vazioSeNulo(r.sequencia)),
        coluna('livros_vinculados', ['livrosIds'], (r) =>
            juntar((r.livrosResolvidos || []).map((l) => l.titulo)),
        ),

        // Datas
        ...colunasData('escrita', ['dataEscrita', 'ano'], (r) => r.dataEscrita),
        coluna('escrita_exata', [], (r) => vazioSeNulo(r.dataEscrita?.exata)),
        ...colunasData('publicacao', ['dataPublicacao'], (r) => r.dataPublicacao),

        // Pessoas e grupos
        coluna('pessoas', ['pessoas'], (r, ctx) => juntar(nomesPessoas(r, ctx.banco.pessoas))),
        coluna('pessoas_papeis', [], (r, ctx) => {
            const porId = new Map((ctx.banco.pessoas || []).map((p) => [p.id, p.nome]));
            return juntar(
                (r.pessoas || [])
                    .filter((p) => porId.get(p.pessoaId))
                    .map((p) =>
                        (p.papeis || []).length
                            ? `${porId.get(p.pessoaId)}: ${p.papeis.join(', ')}`
                            : porId.get(p.pessoaId),
                    ),
            );
        }),
        coluna('grupos_via_pessoas', [], (r, ctx) =>
            juntar([
                ...new Set(
                    paresGrupoPessoa(r, ctx.banco.pessoas, ctx.banco.grupos).map(
                        ({ grupo }) => grupo.nome,
                    ),
                ),
            ]),
        ),
        coluna('grupos_diretos', ['gruposDiretos'], (r) =>
            juntar((r.gruposDiretosResolvidos || []).map((g) => g.nome)),
        ),

        // Época retratada
        coluna('epoca', ['epocaRetratada'], (r) => r.epocaRetratada?.nomeEpoca || ''),
        coluna('epoca_recorte', [], (r) => r.epocaRetratada?.recorte || ''),
        coluna('epoca_nao_se_aplica', [], (r) => vazioSeNulo(r.epocaRetratada?.na)),
        ...colunasData('epoca_inicio', [], (r) => r.epocaRetratada?.inicio),
        ...colunasData('epoca_fim', [], (r) => r.epocaRetratada?.fim),

        // Sinalizações: uma coluna por categoria
        ...Object.entries(SINALIZACOES_CATEGORIAS).map(([chave, campo]) =>
            coluna(nomeSinal(chave), [campo], (r) => virgulasParaLista(r[campo])),
        ),

        // Relações com outros textos e com o mundo
        coluna('elos', ['conceitos'], (r, ctx) =>
            juntar(
                (r.conceitos?.elos || []).map((e) =>
                    comNota(
                        `${rotuloElo(e.relacao, e.direcao) || e.relacao || 'Elo'}: ${tituloPorId(ctx.banco, e.poemaId)}`,
                        e.texto,
                    ),
                ),
            ),
        ),
        coluna('ecos', [], (r, ctx) =>
            juntar(
                (r.conceitos?.ecos || []).map((e) =>
                    comNota(`${e.tipo || 'Eco'}: ${tituloPorId(ctx.banco, e.poemaId)}`, e.texto),
                ),
            ),
        ),
        coluna('intertextualidade', ['intertextualidade'], (r) =>
            juntar((r.intertextualidade || []).map(entradaExterna)),
        ),
        coluna('hipertextualidade', ['hipertextualidade'], (r) =>
            juntar(
                (r.hipertextualidade || []).map((h) =>
                    entradaExterna({
                        tipo: h.tipo,
                        texto: h.relacao ? `${h.hipotexto || ''} (${h.relacao})` : h.hipotexto,
                        link: h.link,
                        nota: h.nota,
                    }),
                ),
            ),
        ),
        coluna('referencias_externas', ['referenciasExternas'], (r) =>
            juntar((r.referenciasExternas || []).map(entradaExterna)),
        ),
        coluna('anexos', ['anexos'], (r) =>
            juntar((r.anexos || []).map((a) => entradaExterna({ ...a, nota: '' }))),
        ),
        coluna('anexos_nota_geral', ['anexosNotaGeral'], (r) => r.anexosNotaGeral),
        ...(ehPoema
            ? [
                  coluna('anotacoes_marginais', ['anotacoesMarginais'], (r) =>
                      juntar(
                          (r.anotacoesMarginais || []).map((a) =>
                              comNota(
                                  [
                                      [a.posicao, a.trecho ? `"${a.trecho}"` : '']
                                          .filter(Boolean)
                                          .join(' '),
                                      a.texto,
                                  ]
                                      .filter(Boolean)
                                      .join(': ') + (a.fonte ? ` [${a.fonte}]` : ''),
                                  a.observacoes,
                              ),
                          ),
                      ),
                  ),
                  coluna('descricao_visual', ['descricaoVisual'], (r) => r.descricaoVisual),
              ]
            : []),

        // Notas e contexto
        coluna('notas', ['notas'], (r) => r.notas),
        coluna('contexto_historico', ['contextoHistorico'], (r) => r.contextoHistorico),
        coluna('ocultacao', ['ocultacao'], (r) => r.ocultacao),
        coluna('conteudo_sensivel', ['conteudoSensivel'], (r) => r.conteudoSensivel),
        coluna(
            'vocabulario_hiperacionante',
            ['vocabularioHiperacionante'],
            (r) => r.vocabularioHiperacionante,
        ),
        coluna('autoavaliacao', ['autoavaliacao'], (r) => r.autoavaliacao),
        // 0 (ou ausente) é "não avaliado", nunca uma nota (a mínima é 0,5):
        // vazio, pra não puxar médias pra baixo.
        coluna('autoclassificacao', ['autoclassificacao'], (r) =>
            Number(r.autoclassificacao) > 0 ? r.autoclassificacao : '',
        ),

        // Circulação
        coluna('envios', ['envios'], (r) =>
            juntar(
                (r.envios || []).map((e) => {
                    const detalhe = [dataTexto(e.data), e.meio].filter(Boolean).join('; ');
                    return [
                        detalhe ? `${e.pessoa || ''} (${detalhe})` : e.pessoa || '',
                        e.reacao ? `reação: ${e.reacao}` : '',
                        e.notas ? `notas: ${e.notas}` : '',
                    ]
                        .filter(Boolean)
                        .join('; ');
                }),
            ),
        ),
        coluna('reconhecimentos', ['reconhecimentos'], (r) =>
            juntar(
                (r.reconhecimentos || []).map((x) => {
                    const detalhe = [x.posicao, x.ano].filter(Boolean).join('; ');
                    return [detalhe ? `${x.premio || ''} (${detalhe})` : x.premio || '', x.texto]
                        .filter(Boolean)
                        .join('; ');
                }),
            ),
        ),

        // Migração, descarte, pendência
        coluna('cortado_de_livro', ['cortadoDe'], (r) => r.cortadoDe?.livro || ''),
        coluna('cortado_de_secao', [], (r) => r.cortadoDe?.secao || ''),
        coluna('lancado_em_livro', ['lancadoEm'], (r) => r.lancadoEm?.livro || ''),
        coluna('lancado_em_secao', [], (r) => r.lancadoEm?.secao || ''),
        coluna('justificativa_migracao', ['justificativaMigracao'], (r) => r.justificativaMigracao),
        coluna('descarte', ['descarte'], (r) => r.descarte),
        coluna('pendencia', ['pendencia'], (r) => r.pendencia),

        // Fonte do texto
        coluna('fonte_origem', ['fonteTexto'], (r) => r.fonteTexto?.origem || ''),
        coluna('fonte_edicao', [], (r) => r.fonteTexto?.edicao || ''),
        coluna('fonte_link', [], (r) => r.fonteTexto?.link || ''),
        coluna('fonte_conferido', [], (r) => vazioSeNulo(r.fonteTexto?.conferido)),
        coluna('fonte_grafia', [], (r) => r.fonteTexto?.grafia || ''),
    ];
}

// Chaves do cadastro de Poema/Prosa que NÃO viram coluna de propósito:
// `conceitos`/`ano` etc. já estão cobertas via `campos`; aqui ficam só as
// que não têm o que exportar. (Hoje nenhuma: a lista existe pro teste de
// consistência ter onde registrar uma exceção explícita, com o porquê.)
export const CAMPOS_TEXTO_IGNORADOS = [];

// registros: saída de `montarRegistro` (exportar.js), um por texto.
export function gerarCsvTextos(tipo, registros, banco) {
    return gerarCsv(colunasTexto(tipo), registros, (r) => ({
        banco,
        texto: analisarTexto(r.texto),
    }));
}
