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
//   - nomes resolvidos, nunca ids (autor, livro, pessoa, período biográfico): o id
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

import { faixaDeValencia, rotuloValenciaTexto, valenciaAjusteDe } from './valencia-texto.js';
import { ehSorteavel } from './sorteavel.js';
import { ehAutorEmSigilo } from './autor-em-sigilo.js';
import {
    leituraAutonomaDe,
    rotuloLeituraAutonoma,
    temLeituraCondicionada,
} from './leitura-autonoma.js';
import { ehNotaPublica, ehInspiracaoPublica } from './comentarios-publicos.js';
import { textoDaDataDaEntrada, textosDasPontasDaEntrada } from './data-da-entrada-texto.js';
import { rotuloEco } from './ancora-eco.js';
import { autoresDaEntrada, textoAutoresDaEntrada } from './autores-da-obra.js';
import { personagensDaEntrada } from './personagens-da-obra.js';
import { origensDaEntrada, rotuloDaOrigem } from './origem-da-obra.js';
import {
    nomesPersonagens,
    nomesPersonagensPorCentralidade,
    nomesPersonagensPorPapel,
} from './personagens.js';
import {
    SINALIZACOES_CATEGORIAS,
    categoriaEhVirtual,
    valorDaCategoria,
    corpoParaLinhasRicas,
    nomesPessoas,
    paresAutoria,
    paresGrupoPessoa,
    rotuloElo,
    tokenizar,
    nomePeriodoHistorico,
    periodosHistoricosIdsDoItem,
    nomesMovimentosEscolas,
    assuntosDoTexto,
    nomesAssuntosPorPapel,
    nomesTemasPorPapel,
    nomesTemasDoTexto,
    nomesIdiomasPorPapel,
    dialetosDoItem,
    jargaoGiriaDoItem,
    formatarDataAcesso,
    dataAcessoDoLink,
    tipoObraDaEntrada,
    obraDaEntrada,
    partesEntradaIntertexto,
} from './utils.js';
import {
    territorialidadeDoTexto,
    caminhoCompletoLocal,
    caminhoDoLocal,
    idLocalEscrita,
} from './locais.js';
import { textosApareceEm } from './aparicoes-do-texto.js';
import { caminhoDoPeriodo } from './periodos-historicos-hierarquia.js';
import { classificacaoDosPeriodosHistoricosDoTexto } from './periodos-historicos-campos.js';
import { caminhosDasCorrentes, idsDeDivisoes, caminhoDaCorrente } from './correntes-hierarquia.js';
import { conhecidoComoDaEntrada } from './conhecido-como.js';
import {
    caracterizacaoDaEntrada,
    descricaoPessoaPublica,
} from './caracterizacao-pessoa-publica.js';

// Local onde o texto foi escrito, para as colunas do CSV ('' sem Local ou se
// o Local não existe mais).
const localEscritaNome = (banco, item) =>
    caminhoDoLocal(banco, idLocalEscrita(item))[0]?.nome || '';
const localEscritaCaminho = (banco, item) =>
    caminhoDoLocal(banco, idLocalEscrita(item)).length
        ? caminhoCompletoLocal(banco, idLocalEscrita(item))
        : '';

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

// Períodos Biográficos do registro exportado (`epocaRetratada.periodos`; o
// formato anterior, com `nomeEpoca` e `recorte` direto no objeto, ainda vale).
function periodosDoRegistro(r) {
    const er = r.epocaRetratada;
    if (!er) return [];
    if (Array.isArray(er.periodos)) return er.periodos;
    return er.nomeEpoca || er.recorte
        ? [
              {
                  nomeEpoca: er.nomeEpoca,
                  recorte: er.recorte,
                  esferas: er.esferas,
                  categorias: er.categorias,
              },
          ]
        : [];
}

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
// (`linkTexto`) é cosmético e não entra: a URL basta. Com `dataAcesso` válida
// o colchete vira "[link, acesso aaaa-mm-dd]" (ISO, que serve a dataset); sem
// link a data não entra.
// " · 1972" depois da obra, ou '' sem data (a mesma forma do .md).
function dataNoCsv(entrada) {
    const texto = textoDaDataDaEntrada(entrada);
    return texto ? ` · ${texto}` : '';
}

function entradaExterna(entrada) {
    const { link, dataAcesso, nota } = entrada;
    const base = [tipoObraDaEntrada(entrada), obraDaEntrada(entrada)]
        .map((v) => (v || '').trim())
        .filter(Boolean)
        .join(': ');
    const pessoa = descricaoPessoaPublica(entrada);
    const corpo = `${pessoa ? `${base} (${pessoa})` : base}${dataNoCsv(entrada)}`;
    const acesso = formatarDataAcesso(dataAcesso) ? `, acesso ${String(dataAcesso).trim()}` : '';
    return comNota(link ? `${corpo} [${link}${acesso}]` : corpo, nota);
}

// Intertextualidade: "Relação, Tipo de obra: Obra (Autor; personagem X),
// descrição “trecho” (traduzido) (obra pessoal) [link] (nota)". Cada parte só entra se
// preenchida; entrada antiga (sem relação nem os campos novos) sai igual a
// entradaExterna.
// Os autores de uma entrada numa célula só: separados por "; " (o " | " já
// separa as entradas entre si).
function autoresParaCsv(entrada) {
    return autoresDaEntrada(entrada).join('; ');
}

// Idem para as origens (mesmo separador).
function origensParaCsv(entrada) {
    return origensDaEntrada(entrada).join('; ');
}

// Idem para os personagens (mesmo separador).
function personagensParaCsv(entrada) {
    return personagensDaEntrada(entrada).join('; ');
}

function entradaIntertexto(entrada) {
    const p = partesEntradaIntertexto(entrada);
    const { link, dataAcesso, nota } = entrada;
    const rotulo = [(entrada.relacao || '').trim(), tipoObraDaEntrada(entrada).trim()]
        .filter(Boolean)
        .join(', ');
    const corpo = [
        p.corpo,
        p.descricao ? `, ${p.descricao}` : '',
        dataNoCsv(entrada),
        p.trecho ? ` “${p.trecho}”` : '',
        p.traduzido ? ' (traduzido)' : '',
        p.obraPessoal ? ' (obra pessoal)' : '',
    ].join('');
    const base = [rotulo, corpo.trim()].filter(Boolean).join(': ');
    const acesso = formatarDataAcesso(dataAcesso) ? `, acesso ${String(dataAcesso).trim()}` : '';
    return comNota(link ? `${base} [${link}${acesso}]` : base, nota);
}

// Hipertextualidade: "Tipo de obra: Hipotexto (Relação; autor X; origem Y),
// descrição [link] (nota)". Sem autor, origem nem descrição sai como antes.
function entradaHipertexto(h) {
    const relacao = (h.relacao || '').trim();
    const autor = textoAutoresDaEntrada(h);
    const dentro = [relacao, autor ? `autor ${autor}` : '', rotuloDaOrigem(h)]
        .filter(Boolean)
        .join('; ');
    const hipotexto = (h.hipotexto || '').trim();
    const descricao = (h.descricao || '').trim();
    const texto = `${dentro ? (hipotexto ? `${hipotexto} (${dentro})` : `(${dentro})`) : hipotexto}${
        descricao ? `, ${descricao}` : ''
    }${dataNoCsv(h)}${h.obraPessoal === true ? ' (obra pessoal)' : ''}`;
    return entradaExterna({
        tipo: tipoObraDaEntrada(h),
        texto,
        link: h.link,
        dataAcesso: h.dataAcesso,
        nota: h.nota,
    });
}

// Coluna paralela, uma por campo, para quem usa o CSV como dataset: um valor
// por entrada, na mesma ordem da coluna de leitura, separados por " | ". Campo
// vazio numa entrada deixa o lugar vazio (a posição segue valendo); lista toda
// vazia vira célula vazia.
function listaPosicional(lista, obter) {
    const valores = (lista || []).map((e) => String(obter(e) ?? '').trim());
    return valores.some(Boolean) ? valores.join(SEPARADOR_LISTA) : '';
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
// Rótulo de Grupo pra uma linha do CSV, com o mesmo critério de
// desambiguação por Autor de badgesGrupos (celulas-tabela.js) e
// textoGrupos (exportar-md.js): olha TODOS os Grupos citados nesta
// linha (via pessoa + diretos, as duas colunas juntas — daí `banco`
// pra buscar `paresGrupoPessoa` de novo aqui dentro) e só acrescenta o
// nome do Autor quando dois deles colidem em nome. Retorna uma função
// (grupo) => rótulo, pronta pra usar em .map() nas duas colunas.
function rotuloGrupoCsv(item, banco) {
    const viaPessoa = paresGrupoPessoa(item, banco.pessoas, banco.grupos).map(({ grupo }) => grupo);
    const diretos = (item.gruposDiretosResolvidos || []).filter(Boolean);
    const autorIdsPorNome = new Map();
    for (const g of [...viaPessoa, ...diretos]) {
        if (!autorIdsPorNome.has(g.nome)) autorIdsPorNome.set(g.nome, new Set());
        autorIdsPorNome.get(g.nome).add(g.autorId);
    }
    const nomesColidindo = new Set(
        [...autorIdsPorNome.entries()]
            .filter(([, autorIds]) => autorIds.size > 1)
            .map(([nome]) => nome),
    );
    return (grupo) => {
        if (!nomesColidindo.has(grupo.nome)) return grupo.nome;
        const nomeAutor =
            (banco.autores || []).find((a) => a.id == grupo.autorId)?.nome || '(autor)';
        return `${grupo.nome}, ${nomeAutor}`;
    };
}

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
        // Idioma por papel e dialetos (idiomas do texto, utils.js): `idioma`
        // acima segue com o espelho (todos os nomes, Principais primeiro).
        // Cada dialeto sai com o idioma a que pertence ("paulistano (pt-BR)").
        coluna('idioma_principal', ['idiomas'], (r) =>
            juntar(nomesIdiomasPorPapel(r, 'principal')),
        ),
        coluna('idioma_secundario', ['idiomas'], (r) =>
            juntar(nomesIdiomasPorPapel(r, 'secundario')),
        ),
        coluna('dialetos', ['idiomas'], (r) => juntar(dialetosDoItem(r))),
        // Jargão e gíria: lista de textos livres no nível do texto (fora de
        // `idiomas`). Entra em `dados` por espalhamento, então o teste-guarda de
        // consistência não o enxerga: tests/jargao-giria-saidas.test.js cobra a coluna.
        coluna('jargao_giria', ['jargaoGiria'], (r) => juntar(jargaoGiriaDoItem(r))),
        // Local onde foi escrito (um só), com o caminho completo do mais alto
        // até ele ("Brasil › São Paulo › Lapa").
        coluna('local_escrita', ['localEscrita'], (r, ctx) => localEscritaNome(ctx.banco, r)),
        coluna('local_escrita_caminho', ['localEscrita'], (r, ctx) =>
            localEscritaCaminho(ctx.banco, r),
        ),
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
        // Coletâneas que trazem o texto (derivado de `itensColetanea`).
        coluna('coletaneas', [], (r) => juntar(r.contexto?.coletaneas || [])),
        // Todas as aparições em livros comuns (Fase 21, 21-4b): caminho e posição
        // de cada uma. Texto com uma só aparição fica com a célula vazia (as
        // colunas livro, parte, secao e sequencia já dizem tudo).
        coluna('aparece_em', [], (r) => juntar(textosApareceEm(r))),

        // Datas
        ...colunasData('escrita', ['dataEscrita', 'ano'], (r) => r.dataEscrita),
        coluna('escrita_exata', [], (r) => vazioSeNulo(r.dataEscrita?.exata)),
        ...colunasData('publicacao', ['dataPublicacao'], (r) => r.dataPublicacao),

        // Pessoas e grupos
        coluna('pessoas', ['pessoas'], (r, ctx) => juntar(nomesPessoas(r, ctx.banco.pessoas))),
        coluna('personagens', ['personagens'], (r, ctx) =>
            juntar(nomesPersonagens(r, ctx.banco.personagens)),
        ),
        // Personagem por papel e por centralidade (nomesPersonagensPorPapel e
        // nomesPersonagensPorCentralidade, personagens.js): as mesmas oito
        // visões dos prefixos de busca. `personagens` acima segue com todos.
        // Vêm do `personagens` do texto, por isso sem campo próprio em `campos`.
        ...[
            ['personagem_voz', 'Voz'],
            ['personagem_interlocutor', 'Interlocutor'],
            ['personagem_aparicao', 'Aparição'],
            ['personagem_mencao', 'Menção'],
            ['personagem_alusao', 'Alusão'],
        ].map(([cab, papel]) =>
            coluna(cab, [], (r, ctx) =>
                juntar(nomesPersonagensPorPapel(r, ctx.banco.personagens, papel)),
            ),
        ),
        ...[
            ['personagem_protagonista', 'protagonista'],
            ['personagem_secundario', 'secundario'],
            ['personagem_sem_centralidade', ''],
        ].map(([cab, valor]) =>
            coluna(cab, [], (r, ctx) =>
                juntar(nomesPersonagensPorCentralidade(r, ctx.banco.personagens, valor)),
            ),
        ),
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
        // Nota do vínculo Pessoa × texto (só quem tem nota), "Nome: nota".
        coluna('pessoas_notas', [], (r, ctx) => {
            const porId = new Map((ctx.banco.pessoas || []).map((p) => [p.id, p.nome]));
            return juntar(
                (r.pessoas || [])
                    .filter(
                        (p) => porId.get(p.pessoaId) && typeof p.nota === 'string' && p.nota.trim(),
                    )
                    .map(
                        (p) =>
                            `${porId.get(p.pessoaId)}: ${p.nota.trim().replace(/\s*\n\s*/g, ' ')}`,
                    ),
            );
        }),
        // Desambiguação por Autor (decisão B, 27/09/2026 — mesmo critério de
        // badgesGrupos em celulas-tabela.js e textoGrupos em exportar-md.js):
        // "Nome, Autor" só entra quando, dentro desta linha, dois Grupos
        // citados (via pessoa OU diretos, as duas colunas juntas) têm o
        // mesmo nome mas Autores diferentes (coautoria); resolvido via
        // rotuloGrupoCsv abaixo, que olha as duas colunas juntas pra achar
        // a colisão antes de montar cada uma separadamente.
        coluna('grupos_via_pessoas', [], (r, ctx) => {
            const gruposViaPessoa = [
                ...new Map(
                    paresGrupoPessoa(r, ctx.banco.pessoas, ctx.banco.grupos).map(({ grupo }) => [
                        grupo.id,
                        grupo,
                    ]),
                ).values(),
            ];
            const rotulo = rotuloGrupoCsv(r, ctx.banco);
            return juntar(gruposViaPessoa.map(rotulo));
        }),
        coluna('grupos_diretos', ['gruposDiretos'], (r, ctx) => {
            const rotulo = rotuloGrupoCsv(r, ctx.banco);
            return juntar((r.gruposDiretosResolvidos || []).map(rotulo));
        }),

        // Período Biográfico Retratado (campo interno: epocaRetratada)
        // Vários períodos por texto: nomes juntos pelo separador de lista; o
        // recorte sai na mesma ordem (posição vazia = sem recorte).
        coluna('periodo_biografico', ['epocaRetratada'], (r) =>
            juntar(periodosDoRegistro(r).map((p) => p.nomeEpoca)),
        ),
        // Caminho na hierarquia ("Pai › Filho"), coluna à parte como no Histórico.
        coluna('periodo_biografico_caminho', [], (r) =>
            juntar(periodosDoRegistro(r).map((p) => p.caminho || p.nomeEpoca)),
        ),
        coluna('periodo_biografico_recorte', [], (r) => {
            const recortes = periodosDoRegistro(r)
                .filter((p) => p.nomeEpoca)
                .map((p) => p.recorte || '');
            return recortes.some(Boolean) ? recortes.join(SEPARADOR_LISTA) : '';
        }),
        coluna('periodo_biografico_nao_se_aplica', [], (r) => vazioSeNulo(r.epocaRetratada?.na)),
        ...colunasData('periodo_biografico_inicio', [], (r) => r.epocaRetratada?.inicio),
        ...colunasData('periodo_biografico_fim', [], (r) => r.epocaRetratada?.fim),
        // Bloco 3: Esfera e Categoria do período (Pessoas e Vínculo não saem).
        coluna('periodo_biografico_esferas', [], (r) =>
            juntar([...new Set(periodosDoRegistro(r).flatMap((p) => p.esferas || []))]),
        ),
        coluna('periodo_biografico_categorias', [], (r) =>
            juntar([...new Set(periodosDoRegistro(r).flatMap((p) => p.categorias || []))]),
        ),

        // Período Histórico retratado (sem recorte de data, campo solto)
        // Bloco 2e: vários períodos por texto, juntos com ponto e vírgula.
        coluna('periodo_historico', ['periodosHistoricosIds'], (r, ctx) =>
            periodosHistoricosIdsDoItem(r, ctx.banco.periodosHistoricos)
                .map((id) => nomePeriodoHistorico(id, ctx.banco.periodosHistoricos))
                .filter(Boolean)
                .join('; '),
        ),
        // Caminho completo na hierarquia ("Nova República › Governo Dilma
        // Rousseff › Segundo mandato"): coluna à parte, para quem lê o CSV
        // pelo nome ou pela posição das colunas anteriores não se perder.
        coluna('periodo_historico_caminho', ['periodosHistoricosIds'], (r, ctx) =>
            periodosHistoricosIdsDoItem(r, ctx.banco.periodosHistoricos)
                .map((id) => caminhoDoPeriodo(ctx.banco.periodosHistoricos, id))
                .filter(Boolean)
                .join('; '),
        ),
        // Esfera e Categoria dos períodos do texto (derivadas do cadastro,
        // sem repetir), como as do Período Biográfico logo acima.
        coluna('periodo_historico_esferas', ['periodosHistoricosIds'], (r, ctx) =>
            juntar(
                classificacaoDosPeriodosHistoricosDoTexto(
                    r,
                    ctx.banco.periodosHistoricos,
                    'esferas',
                ),
            ),
        ),
        coluna('periodo_historico_categorias', ['periodosHistoricosIds'], (r, ctx) =>
            juntar(
                classificacaoDosPeriodosHistoricosDoTexto(
                    r,
                    ctx.banco.periodosHistoricos,
                    'categorias',
                ),
            ),
        ),

        // Eventos (F14-D3): as colunas acima seguem com TODOS os períodos do
        // texto, eventos inclusive (quem já lê o arquivo não quebra); estas só
        // repetem os que são evento, para filtrar sem recalcular.
        coluna('evento_biografico', [], (r) =>
            juntar(
                periodosDoRegistro(r)
                    .filter((p) => p.evento === true)
                    .map((p) => p.nomeEpoca),
            ),
        ),
        coluna('evento_biografico_caminho', [], (r) =>
            juntar(
                periodosDoRegistro(r)
                    .filter((p) => p.evento === true)
                    .map((p) => p.caminho || p.nomeEpoca),
            ),
        ),
        coluna('evento_historico', ['periodosHistoricosIds'], (r, ctx) =>
            periodosHistoricosIdsDoItem(r, ctx.banco.periodosHistoricos, 'eventos')
                .map((id) => nomePeriodoHistorico(id, ctx.banco.periodosHistoricos))
                .filter(Boolean)
                .join('; '),
        ),
        coluna('evento_historico_caminho', ['periodosHistoricosIds'], (r, ctx) =>
            periodosHistoricosIdsDoItem(r, ctx.banco.periodosHistoricos, 'eventos')
                .map((id) => caminhoDoPeriodo(ctx.banco.periodosHistoricos, id))
                .filter(Boolean)
                .join('; '),
        ),

        // Movimento/Escola (N:N, cadastro central — ver Autor também)
        coluna('movimentos_escolas', ['movimentosEscolasIds'], (r, ctx) =>
            juntar(nomesMovimentosEscolas(r.movimentosEscolasIds, ctx.banco.movimentosEscolas)),
        ),
        // Caminho completo ("Romantismo › Romantismo no Brasil"), coluna à parte.
        coluna('movimentos_escolas_caminho', ['movimentosEscolasIds'], (r, ctx) =>
            juntar(caminhosDasCorrentes(ctx.banco.movimentosEscolas, r.movimentosEscolasIds)),
        ),
        // As duas colunas acima trazem TODAS as correntes ligadas (de topo e
        // divisões), como sempre. Estas duas são só as divisões, a mesma
        // separação do campo "Divisões" dos modais (Fase 14, etapa 2); é
        // derivado, então não há campo novo no texto.
        coluna('divisoes_corrente', ['movimentosEscolasIds'], (r, ctx) =>
            juntar(
                idsDeDivisoes(ctx.banco.movimentosEscolas, r.movimentosEscolasIds).map(
                    (id) =>
                        ctx.banco.movimentosEscolas.find((m) => String(m.id) === String(id)).nome,
                ),
            ),
        ),
        coluna('divisoes_corrente_caminho', ['movimentosEscolasIds'], (r, ctx) =>
            juntar(
                idsDeDivisoes(ctx.banco.movimentosEscolas, r.movimentosEscolasIds).map((id) =>
                    caminhoDaCorrente(ctx.banco.movimentosEscolas, id),
                ),
            ),
        ),

        // Assunto: derivado dos Temas do texto (assuntosDoTexto, utils.js),
        // não um campo gravado — sem entrada em `campos` (nada pra marcar
        // como preenchido: sempre segue os Temas).
        coluna('assuntos', [], (r, ctx) =>
            juntar(assuntosDoTexto(r, ctx.banco.assuntos, ctx.banco.temas).map((a) => a.nome)),
        ),
        // Papel do Assunto no texto (herdado dos Temas, ou fixado pela pessoa
        // em `assuntosPapel`): `assuntos` acima lista todos; estas duas
        // separam os que têm papel efetivo definido.
        coluna('assunto_principal', [], (r, ctx) =>
            juntar(nomesAssuntosPorPapel(r, ctx.banco.assuntos, ctx.banco.temas, 'principal')),
        ),
        coluna('assunto_secundario', [], (r, ctx) =>
            juntar(nomesAssuntosPorPapel(r, ctx.banco.assuntos, ctx.banco.temas, 'secundario')),
        ),

        // Sinalizações: uma coluna por categoria
        // Categoria virtual (Tema) não tem campo de dado: sem entrada em `campos`.
        ...Object.entries(SINALIZACOES_CATEGORIAS).map(([chave, campo]) =>
            coluna(nomeSinal(chave), categoriaEhVirtual(chave) ? [] : [campo], (r, ctx) =>
                // Tema: um nome por item (o nome pode ter vírgula); o resto quebra por vírgula.
                chave === 'tema'
                    ? juntar(nomesTemasDoTexto(r, ctx.banco.temas))
                    : virgulasParaLista(valorDaCategoria(r, chave, { temas: ctx.banco.temas })),
            ),
        ),
        // Territorialidade com o caminho de cada Local, do mais alto até ele
        // (`sinal_territorialidade` acima segue com só os nomes).
        coluna('territorialidade_caminho', ['territorialidade'], (r, ctx) =>
            juntar(
                territorialidadeDoTexto(ctx.banco, r).map((id) =>
                    caminhoCompletoLocal(ctx.banco, id),
                ),
            ),
        ),
        // Tema por papel: `sinal_tema` acima continua com TODOS os Temas; estas
        // duas separam os que têm papel definido (Tema "sem papel" só
        // aparece em `sinal_tema`). Vêm do `temas` do texto (ver
        // nomesTemasPorPapel, utils.js), por isso sem campo próprio em `campos`.
        coluna('tema_principal', [], (r, ctx) =>
            juntar(nomesTemasPorPapel(r, ctx.banco.temas, 'principal')),
        ),
        coluna('tema_secundario', [], (r, ctx) =>
            juntar(nomesTemasPorPapel(r, ctx.banco.temas, 'secundario')),
        ),

        // Relações com outros textos e com o mundo
        coluna('elos', ['conceitos'], (r, ctx) =>
            juntar(
                (r.conceitos?.elos || []).map((e) =>
                    comNota(
                        `${rotuloElo(e.relacao, e.direcao) || e.relacao || 'Elo'}: ${tituloPorId(ctx.banco, e.poemaId ?? e.id)}`,
                        e.texto,
                    ),
                ),
            ),
        ),
        coluna('ecos', [], (r, ctx) =>
            juntar(
                (r.conceitos?.ecos || []).map((e) =>
                    comNota(
                        `${rotuloEco(ctx.banco, e, 2) || 'Eco'}: ${tituloPorId(ctx.banco, e.poemaId ?? e.id)}`,
                        e.texto,
                    ),
                ),
            ),
        ),
        coluna('intertextualidade', ['intertextualidade'], (r) =>
            juntar((r.intertextualidade || []).map(entradaIntertexto)),
        ),
        ...[
            ['relacao', (e) => e.relacao],
            ['tipo_obra', tipoObraDaEntrada],
            ['obra', obraDaEntrada],
            ['autor', autoresParaCsv],
            ['origem', origensParaCsv],
            ['personagem', personagensParaCsv],
            ['descricao', (e) => e.descricao],
            ['trecho', (e) => String(e.trecho ?? '').replace(/\s*\n\s*/g, ' / ')],
            ['traduzido', (e) => (e.traduzido === true ? 'sim' : '')],
            ['obra_pessoal', (e) => (e.obraPessoal === true ? 'sim' : '')],
            ['data_obra', (e) => textosDasPontasDaEntrada(e).inicio],
            ['data_obra_ate', (e) => textosDasPontasDaEntrada(e).fim],
        ].map(([sufixo, obter]) =>
            coluna(`intertextualidade_${sufixo}`, [], (r) =>
                listaPosicional(r.intertextualidade, obter),
            ),
        ),
        coluna('hipertextualidade', ['hipertextualidade'], (r) =>
            juntar((r.hipertextualidade || []).map(entradaHipertexto)),
        ),
        ...[
            ['relacao', (h) => h.relacao],
            ['tipo_obra', tipoObraDaEntrada],
            ['hipotexto', (h) => h.hipotexto],
            ['autor', autoresParaCsv],
            ['origem', origensParaCsv],
            ['descricao', (h) => h.descricao],
            ['obra_pessoal', (h) => (h.obraPessoal === true ? 'sim' : '')],
            ['data_obra', (h) => textosDasPontasDaEntrada(h).inicio],
            ['data_obra_ate', (h) => textosDasPontasDaEntrada(h).fim],
        ].map(([sufixo, obter]) =>
            coluna(`hipertextualidade_${sufixo}`, [], (r) =>
                listaPosicional(r.hipertextualidade, obter),
            ),
        ),
        coluna('referencias_externas', ['referenciasExternas'], (r) =>
            juntar((r.referenciasExternas || []).map(entradaExterna)),
        ),
        // Pessoa pública: uma coluna por campo, por posição como as de
        // Intertextualidade. Vazio numa entrada deixa o lugar vazio (não
        // informado), e as tags de uma mesma pessoa vão separadas por "; ".
        ...[
            ['conhecido_como', (e) => conhecidoComoDaEntrada(e).join('; ')],
            ['genero', (e) => caracterizacaoDaEntrada(e).genero],
            ['orientacao', (e) => caracterizacaoDaEntrada(e).orientacao],
            ['cor_raca', (e) => caracterizacaoDaEntrada(e).corRaca],
            ['data', (e) => textosDasPontasDaEntrada(e).inicio],
            ['data_ate', (e) => textosDasPontasDaEntrada(e).fim],
        ].map(([sufixo, obter]) =>
            coluna(`referencias_externas_${sufixo}`, [], (r) =>
                listaPosicional(r.referenciasExternas, obter),
            ),
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
        // Notas marcadas como públicas ("sim" só para `true`) e o comentário
        // escrito para o leitor (comentarios-publicos.js).
        coluna('notas_publicas', ['notasPublicas'], (r) => (ehNotaPublica(r) ? 'sim' : '')),
        coluna('comentarios_ao_leitor', ['comentariosPublicos'], (r) => r.comentariosPublicos),
        // Inspiração (campo interno: contextoHistorico)
        coluna('inspiracao', ['contextoHistorico'], (r) => r.contextoHistorico),
        coluna('inspiracao_publica', ['inspiracaoPublica'], (r) =>
            ehInspiracaoPublica(r) ? 'sim' : '',
        ),
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
        // Marca de leitura: "sim" só para `true`; desligado e ausente saem vazios.
        coluna('sorteavel', ['sorteavel'], (r) => (ehSorteavel(r) ? 'sim' : '')),
        // Sigilo do autor no texto: "sim" só para `true` (autor-em-sigilo.js).
        coluna('autor_em_sigilo', ['autorEmSigilo'], (r) => (ehAutorEmSigilo(r) ? 'sim' : '')),
        // Valência do texto (valencia-texto.js): a faixa final (ajuste do autor, ou
        // a derivada dos temas) e, à parte, só o ajuste, para separar o juízo do
        // autor do que os temas dizem. Sem valência, ambas saem vazias.
        coluna('valencia', ['valenciaAjuste'], (r, ctx) =>
            rotuloValenciaTexto(faixaDeValencia(r, ctx.banco.temas)),
        ),
        coluna('valencia_ajuste', ['valenciaAjuste'], (r) =>
            rotuloValenciaTexto(valenciaAjusteDe(r)),
        ),
        // Leitura autônoma: o rótulo (Só em sequência...); Lê-se sozinho, o padrão, sai vazio.
        coluna('leitura_autonoma', ['leituraAutonoma'], (r) =>
            temLeituraCondicionada(r) ? rotuloLeituraAutonoma(leituraAutonomaDe(r)) : '',
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
        coluna('cortado_de_posicao', [], (r) => r.cortadoDe?.posicao ?? ''),
        coluna('lancado_em_livro', ['lancadoEm'], (r) => r.lancadoEm?.livro || ''),
        coluna('lancado_em_secao', [], (r) => r.lancadoEm?.secao || ''),
        coluna('justificativa_migracao', ['justificativaMigracao'], (r) => r.justificativaMigracao),
        coluna('descarte', ['descarte'], (r) => r.descarte),
        coluna('pendencia', ['pendencia'], (r) => r.pendencia),

        // Fonte do texto
        coluna('fonte_origem', ['fonteTexto'], (r) => r.fonteTexto?.origem || ''),
        coluna('fonte_edicao', [], (r) => r.fonteTexto?.edicao || ''),
        coluna('fonte_link', [], (r) => r.fonteTexto?.link || ''),
        coluna('fonte_data_acesso', [], (r) =>
            dataAcessoDoLink(r.fonteTexto?.link, r.fonteTexto?.dataAcesso),
        ),
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
// `opcoes.somenteTituloTexto`: só as colunas titulo e texto (caixa "Metadados"
// desmarcada, ver metadados-download.js).
export function gerarCsvTextos(tipo, registros, banco, opcoes = {}) {
    const colunas = opcoes.somenteTituloTexto
        ? colunasTexto(tipo).filter((c) => c.cabecalho === 'titulo' || c.cabecalho === 'texto')
        : colunasTexto(tipo);
    return gerarCsv(colunas, registros, (r) => ({
        banco,
        texto: analisarTexto(r.texto),
    }));
}
