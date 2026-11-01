// ============================================================
// exportar-livros.js: download das informações do Livro em .json, .md e .csv
// (Fase 19, etapa 7, entrega 1: lógica pura, sem DOM e sem botão ainda).
//
// Só as informações do livro, nunca o conteúdo dos textos: é isso que o
// distingue da exportação da aba Estrutura. Sinopse, Orelhas, Contracapa e os
// Versos de Abertura são do livro e saem; o corpo de cada poema e prosa não.
//
// O registro de um Livro é montado uma vez (`montarRegistroLivro`) e os três
// formatos leem dele, no mesmo molde de exportar-autores.js:
//   - os campos do cadastro saem como estão, com o mesmo nome do objeto;
//   - o que é derivado ou resolvido sai em snake_case: `tem_capa`,
//     `autoria_livro`, `equipe_livro`, `uso_ia` e `estrutura`;
//   - nada de ids que só valem dentro deste acervo: a capa sai só como
//     "tem capa", autoria, equipe e texto do uso de IA saem por nome ou título.
//
// O .json usa `export_format: 'selecao_livros'`, para nenhuma ferramenta que
// leia outros formatos de seleção confundir os dois.
// ============================================================

import { formatarDataParcial, textoSituacaoEditorial, situacaoEditorialDoLivro } from './utils.js';
import { linkImagemExibivel } from './imagem-link.js';
import { autoriaLivroPorNome } from './autoria-livro.js';
import { equipeLivroPorNome, textoPapelEquipe } from './colaboradores-livro.js';
import { usoIaParaExportar, textoDoUso } from './uso-ia-livro.js';
import { montarArvoreDoLivro, contarNosDaArvore } from './estrutura-livro.js';
import {
    estruturaDeTitulos,
    linhasDaEstrutura,
    estruturaParaMarkdown,
    rotuloLegivelDoTipo,
    foraDeEscopoParaSaida,
    foraDeEscopoParaMarkdown,
    linhasDoForaDeEscopo,
} from './estrutura-livro-saida.js';
import { foraDeEscopoDoLivro } from './fora-de-escopo.js';
import { coluna, colunasData, gerarCsv, juntar } from './exportar-csv.js';

export const FORMATO_EXPORTACAO_LIVROS = 'selecao_livros';

// Chaves do objeto do livro que não saem como estão: o id interno da capa
// (IndexedDB) e os três campos que guardam ids de outros cadastros. Os dois
// últimos grupos saem resolvidos por nome, em chaves derivadas.
const CHAVES_RESOLVIDAS = ['capa', 'autoriaLivro', 'equipeLivro', 'usoIa'];

function copia(valor) {
    return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
}

// Registro de um Livro para sair em arquivo. `banco` é o db (ou um recorte
// com autores, colaboradores, poemas, prosas, partes, secoes, elementos...).
// `opcoes.incluirEstrutura` (desligada por padrão) acrescenta `estrutura_arvore`:
// a estrutura só com títulos, sem o texto dos poemas e prosas (ver
// estrutura-livro-saida.js). A contagem em `estrutura` sai sempre.
// `opcoes.incluirForaDeEscopo` (também desligada) acrescenta, dentro de
// `estrutura_arvore`, `fora_de_escopo`: os migrados e descartados que saíram do
// livro, com de onde vieram e para onde foram. Só vale com `incluirEstrutura` e
// nunca em Coletânea.
// Descartado fica fora da árvore e da contagem, como no Ver e na aba Estrutura:
// ele só existe em `fora_de_escopo`.
export function montarRegistroLivro(livro, banco, opcoes = {}) {
    const base = {};
    Object.keys(livro || {}).forEach((chave) => {
        if (!CHAVES_RESOLVIDAS.includes(chave)) base[chave] = copia(livro[chave]);
    });

    const registro = {
        ...base,
        tem_capa: livro?.capa != null && livro.capa !== '',
    };

    const autoria = autoriaLivroPorNome(livro, banco?.autores || []);
    if (autoria.length) registro.autoria_livro = autoria;

    const equipe = equipeLivroPorNome(livro, banco?.colaboradores || []);
    if (equipe.length) registro.equipe_livro = equipe;

    const usoIa = usoIaParaExportar(livro, banco);
    if (usoIa) registro.uso_ia = usoIa;

    const montada = montarArvoreDoLivro(banco, livro?.id, { semDescartados: true });
    registro.estrutura = contarNosDaArvore(montada);
    if (opcoes.incluirEstrutura) {
        registro.estrutura_arvore = estruturaDeTitulos(montada);
        if (opcoes.incluirForaDeEscopo && livro?.tipo !== 'Coletânea') {
            registro.estrutura_arvore.fora_de_escopo = foraDeEscopoParaSaida(
                foraDeEscopoDoLivro(banco, livro?.id),
            );
        }
    }
    return registro;
}

// Quem chama decide a ordem da lista (a aba usa a dela; o Ver, um livro só).
export function registrosDeLivros(livros, banco, opcoes = {}) {
    return (livros || []).map((l) => montarRegistroLivro(l, banco, opcoes));
}

// ─── .json ──────────────────────────────────────────────────────

export function gerarJsonLivros(registros) {
    return JSON.stringify({ export_format: FORMATO_EXPORTACAO_LIVROS, itens: registros }, null, 4);
}

// ─── Textos de apoio, comuns ao .md e ao .csv ───────────────────

// "Nome (Autor, Tradutor)": um item por pessoa, na ordem dos vínculos.
export function itensAutoria(registro) {
    return (registro.autoria_livro || []).map((v) =>
        v.papeis?.length ? `${v.autor} (${v.papeis.join(', ')})` : v.autor,
    );
}

// "Ana Souza (Ilustrador: Capa, Revisor)": papel e escopo de cada pessoa.
export function itensEquipe(registro) {
    return (registro.equipe_livro || []).map((v) =>
        v.papeis?.length
            ? `${v.colaborador} (${v.papeis.map(textoPapelEquipe).join(', ')})`
            : v.colaborador,
    );
}

// "Capa: Midjourney v6, 03/2025 (Gerou do zero)", mais o texto do acervo
// quando o uso aponta para um: "[poema: Título]".
export function itensUsoIa(registro) {
    const usos = registro.uso_ia?.usos || [];
    return usos
        .map((u) => {
            const linha = textoDoUso(u);
            const alvo = u.texto?.titulo ? ` [${u.texto.tipo}: ${u.texto.titulo}]` : '';
            const descricao = u.descricao ? `. ${u.descricao}` : '';
            return `${linha}${descricao}${alvo}`.trim();
        })
        .filter(Boolean);
}

const ROTULO_ESTADO_IA = { usou: 'Usou', 'nao-usou': 'Não usou' };

export function rotuloEstadoUsoIa(registro) {
    return ROTULO_ESTADO_IA[registro.uso_ia?.estado] || '';
}

export function itensLojas(registro) {
    return (registro.lojas || [])
        .map((l) => {
            const nome = (l?.nome || '').trim();
            const url = (l?.url || '').trim();
            if (nome && url) return `${nome} [${url}]`;
            return nome || url;
        })
        .filter(Boolean);
}

function dataLegivel(d) {
    if (!d || typeof d === 'string') return d ? String(d).trim() : '';
    const texto = formatarDataParcial(d);
    return texto === '—' ? '' : texto;
}

const ROTULOS_ESTRUTURA = [
    ['partes', 'parte', 'partes'],
    ['secoes', 'seção', 'seções'],
    ['poemas', 'poema', 'poemas'],
    ['prosas', 'prosa', 'prosas'],
    ['elementos', 'elemento', 'elementos'],
    ['itens', 'item inédito', 'itens inéditos'],
];

// "2 partes, 3 seções, 20 poemas": só o que existe. Livro vazio, "Sem conteúdo".
export function textoEstrutura(registro) {
    const e = registro.estrutura || {};
    const partes = ROTULOS_ESTRUTURA.filter(([chave]) => e[chave] > 0).map(
        ([chave, um, varios]) => `${e[chave]} ${e[chave] === 1 ? um : varios}`,
    );
    return partes.length ? partes.join(', ') : 'Sem conteúdo';
}

// ─── .md ────────────────────────────────────────────────────────

// Textos longos do livro, na ordem em que aparecem na capa e no miolo.
const BLOCOS_TEXTO = [
    ['Sinopse curta', 'sinopseCurta'],
    ['Sinopse', 'sinopse'],
    ['Versos de abertura', 'abertura'],
    ['Descrição da capa', 'capaDesc'],
    ['Frase da capa', 'fraseCapa'],
    ['Orelha 1', 'orelha1'],
    ['Orelha 2', 'orelha2'],
    ['Contracapa', 'contracapa'],
];

// Modelo único do documento de um Livro: o .md, o .pdf e o .docx leem dele, então
// os três formatos nunca divergem no que entra. Campo vazio não aparece.
//   { titulo, campos: [{ rotulo, valor }],
//     usoIa: { estado, itens, nota } | null,
//     blocos: [{ rotulo, texto }] }
export function modeloDocumentoLivro(registro) {
    const situacao = textoSituacaoEditorial(registro);
    const nota = (registro.situacaoNota || '').trim();
    const campos = [
        ['Sigla oficial', registro.siglaOficial],
        ['Sigla pessoal', registro.siglaPessoal],
        ['Tipo', registro.tipo],
        ['Fase', (registro.fase || '').trim()],
        ['Posição', registro.sequencia != null ? String(registro.sequencia) : ''],
        ['Primeira publicação', dataLegivel(registro.data)],
        ['Última edição', dataLegivel(registro.dataUltimaEdicao)],
        ['ISBN-13', registro.isbn13],
        ['ISBN-10', registro.isbn10],
        ['Situação editorial', [situacao, nota].filter(Boolean).join('. ')],
        ['Autoria', itensAutoria(registro).join('; ')],
        ['Equipe e créditos', itensEquipe(registro).join('; ')],
        ['Capa', registro.tem_capa ? 'tem capa' : ''],
        ['Link da imagem', linkImagemExibivel(registro.imagemUrl)],
        ['Lojas', itensLojas(registro).join('; ')],
        ['Código de barras', registro.codigoBarrasUrl],
        ['PDF', registro.pdfUrl],
        ['EPUB', registro.epubUrl],
        ['Ficha catalográfica', registro.fichaCatalograficaUrl],
        ['Certificado de direito autoral', registro.certificadoDireitoAutoralUrl],
        ['Carta de exclusividade', registro.cartaExclusividadeUrl],
        ['Conteúdo', textoEstrutura(registro)],
    ]
        .filter(([, valor]) => valor)
        .map(([rotulo, valor]) => ({ rotulo, valor }));

    const estado = rotuloEstadoUsoIa(registro);
    const itens = itensUsoIa(registro);
    const notaIa = (registro.uso_ia?.nota || '').trim();
    const usoIa =
        estado || itens.length || notaIa
            ? { estado: estado || 'Não informado', itens, nota: notaIa }
            : null;

    const blocos = BLOCOS_TEXTO.map(([rotulo, chave]) => ({
        rotulo,
        texto: (registro[chave] || '').trim(),
    })).filter((b) => b.texto);

    const modelo = { titulo: registro.titulo || '(sem título)', campos, usoIa, blocos };
    // Só quando o registro trouxe a estrutura (opção "Incluir estrutura"):
    // linhas na ordem de leitura e os vinculados, que o .md, o .pdf e o .docx
    // desenham do mesmo jeito.
    if (registro.estrutura_arvore) {
        modelo.estrutura = {
            linhas: linhasDaEstrutura(registro.estrutura_arvore),
            vinculados: registro.estrutura_arvore.vinculados.map((v) => ({
                rotulo: rotuloLegivelDoTipo(v.tipo),
                titulo: v.titulo,
            })),
        };
        if (registro.estrutura_arvore.fora_de_escopo) {
            modelo.estrutura.foraDeEscopo = linhasDoForaDeEscopo(
                registro.estrutura_arvore.fora_de_escopo,
            );
        }
    }
    return modelo;
}

/**
 * Divide os campos do livro para a ficha com capa: os curtos vão ao lado da
 * capa e, a partir de Lojas ou do primeiro valor com link (endereços longos,
 * que quebrariam numa coluna estreita), o resto volta para a largura toda.
 */
export function dividirCamposDaFicha(campos) {
    const lista = campos || [];
    const corte = lista.findIndex(
        (c) => c.rotulo === 'Lojas' || /https?:\/\//.test(String(c.valor ?? '')),
    );
    if (corte < 0) return { aoLado: lista, abaixo: [] };
    return { aoLado: lista.slice(0, corte), abaixo: lista.slice(corte) };
}

// Quebra um texto em trechos `{ texto, url? }`, com `url` nos endereços http e
// https. Usada pelo .pdf e pelo .docx para deixar os links clicáveis. A
// pontuação que fecha o endereço (ponto, vírgula, colchete, parêntese) fica fora.
export function segmentarLinks(texto) {
    const t = String(texto ?? '');
    const partes = [];
    let ultimo = 0;
    for (const m of t.matchAll(/https?:\/\/[^\s<>"]+/g)) {
        const url = m[0].replace(/[.,;:!?)\]]+$/, '');
        if (!url || url === 'http://' || url === 'https://') continue;
        if (m.index > ultimo) partes.push({ texto: t.slice(ultimo, m.index) });
        partes.push({ texto: url, url });
        ultimo = m.index + url.length;
    }
    if (ultimo < t.length) partes.push({ texto: t.slice(ultimo) });
    return partes.length ? partes : [{ texto: t }];
}

export function livroParaMarkdown(registro) {
    const m = modeloDocumentoLivro(registro);
    let md = `## ${m.titulo}\n\n${m.campos.map((c) => `- **${c.rotulo}:** ${c.valor}`).join('\n')}\n`;
    if (m.usoIa) {
        md += `\n**Uso de IA:** ${m.usoIa.estado}\n`;
        if (m.usoIa.itens.length) md += `\n${m.usoIa.itens.map((u) => `- ${u}`).join('\n')}\n`;
        if (m.usoIa.nota) md += `\n${m.usoIa.nota}\n`;
    }
    m.blocos.forEach((b) => {
        md += `\n**${b.rotulo}:**\n\n${b.texto}\n`;
    });
    if (registro.estrutura_arvore) {
        const { corpo, vinculados } = estruturaParaMarkdown(registro.estrutura_arvore);
        md += `\n**Estrutura:**\n\n${corpo || 'Sem conteúdo.'}\n`;
        if (vinculados) md += `\n**Vinculados, sem posição na estrutura:**\n\n${vinculados}\n`;
        const fora = registro.estrutura_arvore.fora_de_escopo;
        if (fora) {
            md += `\n**Fora de escopo:**\n\n${foraDeEscopoParaMarkdown(fora) || 'Nada fora de escopo.'}\n`;
        }
    }
    return md;
}

export function gerarMarkdownLivros(registros) {
    return `# Livros\n\n${registros.map(livroParaMarkdown).join('\n---\n\n')}`;
}

// ─── .csv (formato largo, uma linha por Livro) ──────────────────
// Infra e convenções em exportar-csv.js. Aqui só as colunas do Livro: lista
// vira " | ", datas em três colunas e o derivado resolvido por nome. Cada coluna
// declara em `campos` as chaves do cadastro que consome, para o teste de
// consistência apontar campo novo sem coluna.

const valorOuVazio = (v) => (v === null || v === undefined ? '' : v);

export const COLUNAS_LIVRO = [
    coluna('id', ['id'], (r) => r.id),
    coluna('titulo', ['titulo'], (r) => r.titulo),
    coluna('sequencia', ['sequencia'], (r) => valorOuVazio(r.sequencia)),
    coluna('sigla_oficial', ['siglaOficial'], (r) => r.siglaOficial),
    coluna('sigla_pessoal', ['siglaPessoal'], (r) => r.siglaPessoal),
    coluna('tipo', ['tipo'], (r) => r.tipo),
    coluna('fase', ['fase'], (r) => (r.fase || '').trim()),
    ...colunasData('publicacao', ['data'], (r) => r.data),
    ...colunasData('ultima_edicao', ['dataUltimaEdicao'], (r) => r.dataUltimaEdicao),
    coluna('isbn13', ['isbn13'], (r) => r.isbn13),
    coluna('isbn10', ['isbn10'], (r) => r.isbn10),
    coluna('situacao_editorial', ['situacaoEditorial'], (r) => situacaoEditorialDoLivro(r)),
    ...colunasData('situacao_desde', ['situacaoDesde'], (r) => r.situacaoDesde),
    coluna('situacao_nota', ['situacaoNota'], (r) => r.situacaoNota),
    coluna('tem_capa', ['capa'], (r) => !!r.tem_capa),
    coluna('link_imagem', ['imagemUrl'], (r) => linkImagemExibivel(r.imagemUrl)),
    coluna('lojas', ['lojas'], (r) => juntar(itensLojas(r))),
    coluna('codigo_barras_url', ['codigoBarrasUrl'], (r) => r.codigoBarrasUrl),
    coluna('pdf_url', ['pdfUrl'], (r) => r.pdfUrl),
    coluna('epub_url', ['epubUrl'], (r) => r.epubUrl),
    coluna('ficha_catalografica_url', ['fichaCatalograficaUrl'], (r) => r.fichaCatalograficaUrl),
    coluna(
        'certificado_direito_autoral_url',
        ['certificadoDireitoAutoralUrl'],
        (r) => r.certificadoDireitoAutoralUrl,
    ),
    coluna('carta_exclusividade_url', ['cartaExclusividadeUrl'], (r) => r.cartaExclusividadeUrl),
    coluna('autoria', ['autoriaLivro'], (r) => juntar(itensAutoria(r))),
    coluna('equipe', ['equipeLivro'], (r) => juntar(itensEquipe(r))),
    coluna('uso_ia_estado', ['usoIa'], (r) => r.uso_ia?.estado || ''),
    coluna('uso_ia', [], (r) => juntar(itensUsoIa(r))),
    coluna('uso_ia_nota', [], (r) => r.uso_ia?.nota || ''),
    coluna('sinopse_curta', ['sinopseCurta'], (r) => r.sinopseCurta),
    coluna('sinopse', ['sinopse'], (r) => r.sinopse),
    coluna('abertura', ['abertura'], (r) => r.abertura),
    coluna('capa_descricao', ['capaDesc'], (r) => r.capaDesc),
    coluna('frase_capa', ['fraseCapa'], (r) => r.fraseCapa),
    coluna('orelha_1', ['orelha1'], (r) => r.orelha1),
    coluna('orelha_2', ['orelha2'], (r) => r.orelha2),
    coluna('contracapa', ['contracapa'], (r) => r.contracapa),
    coluna('total_partes', [], (r) => valorOuVazio(r.estrutura?.partes)),
    coluna('total_secoes', [], (r) => valorOuVazio(r.estrutura?.secoes)),
    coluna('total_poemas', [], (r) => valorOuVazio(r.estrutura?.poemas)),
    coluna('total_prosas', [], (r) => valorOuVazio(r.estrutura?.prosas)),
    coluna('total_elementos', [], (r) => valorOuVazio(r.estrutura?.elementos)),
    coluna('total_itens_ineditos', [], (r) => valorOuVazio(r.estrutura?.itens)),
];

// registros: saída de `registrosDeLivros` (cadastro + derivados).
export function gerarCsvLivros(registros) {
    return gerarCsv(COLUNAS_LIVRO, registros);
}

// ─── .csv da estrutura (uma linha por nó) ───────────────────────
// Com a opção "Incluir estrutura", o .csv do livro sai em dois arquivos: o largo
// de sempre (uma linha por livro, com os dados dele) e este, da estrutura, com
// uma linha por nó para a árvore caber numa tabela: primeiro a linha do próprio
// livro (nivel 0), depois as Partes, Seções, Elementos, Poemas e Prosas em ordem
// de leitura e, por fim, os vinculados (`vinculado` = sim). Quem baixa junta os
// dois num .zip (ver `arquivosDoDownloadLivros`).

const SEPARADOR_CAMINHO = ' › ';

export const COLUNAS_ESTRUTURA_LIVRO = [
    coluna('livro_id', [], (l) => l.livro_id),
    coluna('livro', [], (l) => l.livro),
    coluna('nivel', [], (l) => l.nivel),
    coluna('tipo', [], (l) => l.tipo),
    coluna('titulo', [], (l) => l.titulo),
    coluna('caminho', [], (l) => l.caminho),
    coluna('sequencia', [], (l) => valorOuVazio(l.sequencia)),
    coluna('vinculado', [], (l) => (l.vinculado ? 'sim' : '')),
];

// Com "Incluir fora de escopo", duas colunas a mais no fim: `fora_de_escopo`
// (migrado ou descartado) e `detalhe` (de onde saiu e, no migrado, onde está).
// Sem a opção o cabeçalho continua o de sempre.
export const COLUNAS_FORA_DE_ESCOPO_LIVRO = [
    coluna('fora_de_escopo', [], (l) => l.fora_de_escopo || ''),
    coluna('detalhe', [], (l) => l.detalhe || ''),
];

export function linhasCsvEstrutura(registros) {
    const linhas = [];
    (registros || []).forEach((r) => {
        const base = { livro_id: r.id, livro: r.titulo };
        const tituloLivro = r.titulo || '(sem título)';
        linhas.push({
            ...base,
            nivel: 0,
            tipo: r.tipo === 'Coletânea' ? 'coletânea' : 'livro',
            titulo: tituloLivro,
            caminho: tituloLivro,
            sequencia: r.sequencia,
        });
        const est = r.estrutura_arvore;
        if (!est) return;
        linhasDaEstrutura(est).forEach((l) =>
            linhas.push({
                ...base,
                nivel: l.nivel,
                tipo: l.tipo,
                titulo: l.titulo,
                caminho: [tituloLivro, ...l.caminho].join(SEPARADOR_CAMINHO),
                sequencia: l.sequencia,
            }),
        );
        est.vinculados.forEach((v) =>
            linhas.push({
                ...base,
                nivel: 1,
                tipo: v.tipo,
                titulo: v.titulo,
                caminho: [tituloLivro, v.titulo].join(SEPARADOR_CAMINHO),
                sequencia: null,
                vinculado: true,
            }),
        );
        const fora = est.fora_de_escopo;
        [...(fora?.migrados || []), ...(fora?.descartados || [])].forEach((e) =>
            linhas.push({
                ...base,
                nivel: 1,
                tipo: e.tipo,
                titulo: e.titulo,
                caminho: [tituloLivro, 'Fora de escopo', e.titulo].join(SEPARADOR_CAMINHO),
                sequencia: null,
                fora_de_escopo: e.status,
                detalhe: e.detalhe,
            }),
        );
    });
    return linhas;
}

export function gerarCsvEstruturaLivros(registros) {
    const comFora = (registros || []).some((r) => r.estrutura_arvore?.fora_de_escopo);
    const colunas = comFora
        ? [...COLUNAS_ESTRUTURA_LIVRO, ...COLUNAS_FORA_DE_ESCOPO_LIVRO]
        : COLUNAS_ESTRUTURA_LIVRO;
    return gerarCsv(colunas, linhasCsvEstrutura(registros));
}

// ─── Formato, nome do arquivo e conteúdo (comuns ao Ver e à aba) ───

// Formatos do download do Livro. `.pdf` e `.docx` entram na etapa 8.
export const FORMATOS_DOWNLOAD_LIVROS = ['json', 'md', 'csv'];

const SAIDAS_POR_FORMATO = {
    json: { mime: 'application/json', extensao: 'json' },
    md: { mime: 'text/markdown', extensao: 'md' },
    csv: { mime: 'text/csv', extensao: 'csv' },
};

// Nome de arquivo a partir do título: sem acento, minúsculo, só letras, números
// e hífen (mesmo critério do download de um texto).
export function nomeArquivoLivro(titulo) {
    const base = String(titulo || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base || 'sem-titulo';
}

// Arquivos do download, na ordem em que saem: `[{ sufixo, conteudo, mime, extensao }]`
// (`sufixo` vai entre o nome-base e a extensão). É um arquivo só, exceto no .csv
// com estrutura (registros montados com `incluirEstrutura`): aí são dois, o .csv
// largo e o `-estrutura.csv`, que a tela empacota num .zip. Lista vazia quando o
// formato não existe.
export function arquivosDoDownloadLivros(registros, formato) {
    const principal = conteudoDoDownloadLivros(registros, formato);
    if (!principal) return [];
    const arquivos = [{ sufixo: '', ...principal }];
    if (formato === 'csv' && registros.some((r) => r.estrutura_arvore)) {
        arquivos.push({
            sufixo: '-estrutura',
            conteudo: gerarCsvEstruturaLivros(registros),
            mime: principal.mime,
            extensao: principal.extensao,
        });
    }
    return arquivos;
}

// Conteúdo pronto para virar arquivo: `{ conteudo, mime, extensao }`, ou null
// quando o formato não existe (a tela cai no padrão antes de chegar aqui).
export function conteudoDoDownloadLivros(registros, formato) {
    const saida = SAIDAS_POR_FORMATO[formato];
    if (!saida) return null;
    const conteudo =
        formato === 'json'
            ? gerarJsonLivros(registros)
            : formato === 'md'
              ? gerarMarkdownLivros(registros)
              : gerarCsvLivros(registros);
    return { conteudo, ...saida };
}
