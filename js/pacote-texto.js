// ============================================================
// pacote-texto.js — Acervo Poético
//
// Do texto (Markdown simples, "# Título" por texto) ao payload no
// formato da Exportação Geral + `pacote` + `autores`. Função pura, sem
// DOM e sem `fs`: é o mesmo código que
//   - scripts/montar-pacote.js usa pra gerar os pacotes estáticos de
//     biblioteca/ (roda no computador), e
//   - a aba Biblioteca usa em "Importar de texto" (roda no navegador),
//     entregando o resultado à Importação Aditiva.
// Um parser só, pra os dois caminhos nunca divergirem.
// ============================================================

import {
    normalizarGrafia,
    ASSINATURAS_AUTORIA,
    TIPOS_NOME_LITERARIO,
    SEXOS_AUTOR,
    CORES_RACA_AUTOR,
} from './utils.js';

// `tituloPadrao` (opcional) só vale quando o texto colado não tem NENHUM
// "# Título": aí tudo vira um único texto com esse título. Com ao menos um
// título no arquivo ele é ignorado — o que vier antes do primeiro "# " nunca
// entra (ver temTextoAntesDoPrimeiroTitulo, pra a UI avisar).
export function separarTextos(md, { tituloPadrao = '' } = {}) {
    const linhasBrutas = String(md ?? '')
        .replace(/\r\n/g, '\n')
        .split('\n');
    const textos = [];
    let atual = null;
    for (const linha of linhasBrutas) {
        const m = /^#\s+(.+?)\s*$/.exec(linha);
        if (m) {
            atual = { titulo: m[1], linhas: [] };
            textos.push(atual);
        } else if (atual) {
            atual.linhas.push(linha);
        }
    }
    const titulo = String(tituloPadrao ?? '').trim();
    if (!textos.length && titulo) textos.push({ titulo, linhas: linhasBrutas });

    return textos
        .map((t) => ({ titulo: t.titulo, texto: t.linhas.join('\n').trim() + '\n' }))
        .filter((t) => t.texto.trim());
}

// true se há conteúdo antes do primeiro "# Título" (e há ao menos um título):
// separarTextos descarta esse trecho, então a UI avisa em vez de perder em
// silêncio.
export function temTextoAntesDoPrimeiroTitulo(md) {
    const linhas = String(md ?? '')
        .replace(/\r\n/g, '\n')
        .split('\n');
    const primeiro = linhas.findIndex((l) => /^#\s+\S/.test(l));
    if (primeiro <= 0) return false;
    return linhas.slice(0, primeiro).some((l) => l.trim());
}

// Tipos aceitos na importação. O schema de Poema e Prosa é o mesmo, salvo
// `descricaoVisual` (exclusivo de Poema — ver initFormProsa em forms.js).
export const TIPOS_TEXTO = ['poema', 'prosa'];

// Vazio/ausente vale 'poema' (comportamento de antes do campo existir);
// qualquer outro valor fora de TIPOS_TEXTO é recusado em vez de virar
// Poema em silêncio.
export function normalizarTipoTexto(valor) {
    const t = String(valor ?? '')
        .trim()
        .toLowerCase();
    if (!t) return 'poema';
    if (!TIPOS_TEXTO.includes(t)) {
        throw new Error(`Tipo inválido: "${valor}" (esperado "poema" ou "prosa").`);
    }
    return t;
}

// Data parcial de `meta.textos[título]` (dataEscrita/dataPublicacao):
// { dia?, mes?, ano? } com inteiros, mais `exata` (só em dataEscrita, mesmo
// padrão do formulário). Vazio/ausente vira null.
function lerDataDoMeta(valor, campo, titulo) {
    if (valor === undefined || valor === null) return null;
    const dica = `meta.textos["${titulo}"].${campo}`;
    if (typeof valor !== 'object' || Array.isArray(valor)) {
        throw new Error(`${dica} deve ser um objeto { dia?, mes?, ano? }.`);
    }
    const data = {};
    for (const parte of ['dia', 'mes', 'ano']) {
        if (valor[parte] === undefined || valor[parte] === null) continue;
        if (!Number.isInteger(valor[parte]) || valor[parte] < 1) {
            throw new Error(`${dica}.${parte} deve ser um inteiro positivo.`);
        }
        data[parte] = valor[parte];
    }
    if (!Object.keys(data).length) return null;
    if (campo === 'dataEscrita') data.exata = Boolean(valor.exata);
    return data;
}

// Vínculo de autoria do item. Sem `assinatura` no meta do texto vale
// Ortônimo (o padrão do app): o item sai só com { autorId, papel, nome }.
// Heterônimo/Pseudônimo exigem `nomeLiterario` cadastrado em
// `meta.autor.nomesLiterarios` COM o mesmo tipo — a mesma regra que o
// modal de Autoria aplica (editor.js), senão o nome seria apagado ao
// abrir o texto pra editar.
function montarAutoria(meta, sobre, titulo) {
    const base = { autorId: 1, papel: 'Autor', nome: meta.autor.nome };
    const assinatura = sobre.assinatura ?? ASSINATURAS_AUTORIA[0];
    const nomeLiterario = String(sobre.nomeLiterario ?? '').trim();
    const dica = `meta.textos["${titulo}"]`;

    if (!ASSINATURAS_AUTORIA.includes(assinatura)) {
        throw new Error(
            `${dica}.assinatura inválida: "${assinatura}" (use ${ASSINATURAS_AUTORIA.join(', ')}).`,
        );
    }
    if (assinatura === ASSINATURAS_AUTORIA[0]) {
        if (nomeLiterario) {
            throw new Error(
                `${dica}: nomeLiterario só vale com assinatura Heterônimo ou Pseudônimo.`,
            );
        }
        return base;
    }
    if (!nomeLiterario) {
        throw new Error(`${dica}: assinatura ${assinatura} exige nomeLiterario.`);
    }
    const cadastrado = (meta.autor.nomesLiterarios || []).some(
        (n) => n?.nome === nomeLiterario && n?.tipo === assinatura,
    );
    if (!cadastrado) {
        throw new Error(
            `${dica}: "${nomeLiterario}" não está em meta.autor.nomesLiterarios como ${assinatura}.`,
        );
    }
    return { ...base, assinatura, nomeLiterario };
}

// Mesmos campos que o formulário de Poema grava (forms.js,
// initFormPoema) + os denormalizados que montarRegistro
// (exportar.js) acrescenta — assim a Importação Aditiva trata o item
// como qualquer outro exportado. Com tipo 'prosa', o item sai no formato
// do formulário de Prosa (sem `descricaoVisual`).
//
// Tipo, por ordem de precedência: `meta.textos[título].tipo` (pacote
// misto, ex.: Machado de Assis), o argumento `tipo` (envio da aba
// Biblioteca), `meta.tipo` (pacote todo de um tipo) e, por fim, 'poema'.
export function montarItem(id, texto, meta, tipo) {
    const sobre = meta.textos?.[texto.titulo] || {};
    const pedido = [sobre.tipo, tipo, meta.tipo].find((v) => String(v ?? '').trim() !== '');
    const tipoFinal = normalizarTipoTexto(pedido);
    const dataEscrita = lerDataDoMeta(sobre.dataEscrita, 'dataEscrita', texto.titulo);
    const dataPublicacao = lerDataDoMeta(sobre.dataPublicacao, 'dataPublicacao', texto.titulo);
    const item = {
        id,
        tipo: tipoFinal,
        titulo: texto.titulo,
        texto: texto.texto,
        paiTipo: null,
        paiId: null,
        sequencia: null,
        idioma: 'pt-BR',
        dataEscrita,
        dataPublicacao,
        ano: dataEscrita?.ano || '',
        livrosIds: [],
        livrosResolvidos: [],
        conceitos: { elos: [], ecos: [] },
        notas: '',
        sinalizacoesTradicao: '',
        sinalizacoesEstilo: '',
        sinalizacoesTema: '',
        sinalizacoesRelacao: '',
        sinalizacoesSensibilidade: '',
        sinalizacoesTom: '',
        sinalizacoesDominioImagetico: '',
        sinalizacoesOutros: '',
        pessoas: [],
        gruposDiretos: [],
        gruposDiretosResolvidos: [],
        autoria: [montarAutoria(meta, sobre, texto.titulo)],
        envios: [],
        reconhecimentos: [],
        autoavaliacao: '',
        autoclassificacao: 0,
        status: 'publicado',
        epocaRetratada: null,
        intertextualidade: [],
        hipertextualidade: [],
        referenciasExternas: [],
        anexos: [],
        anexosNotaGeral: '',
        anotacoesMarginais: [],
        descricaoVisual: '',
        contextoHistorico: '',
        ocultacao: '',
        conteudoSensivel: '',
        vocabularioHiperacionante: '',
        cortadoDe: null,
        lancadoEm: null,
        justificativaMigracao: '',
        descarte: '',
        pendencia: '',
        fonteTexto: {
            origem: (sobre.fonte ?? meta.fonte) || '',
            edicao: (sobre.edicao ?? meta.edicao) || '',
            link: (sobre.link ?? meta.link) || '',
            conferido: Boolean(sobre.conferido ?? meta.conferido),
            // Normaliza texto livre ("original", "atualizada"...) pro enum
            // de fonteTexto.grafia — zero digitação extra no pacote além do
            // que já era escrito em `ortografia`. `sobre.grafia` permite
            // sobrescrever por texto (pacote com grafias mistas, ex.:
            // Cruz e Sousa: alguns sonetos na grafia original, outros
            // já atualizados pela fonte).
            grafia: normalizarGrafia(sobre.grafia ?? meta.ortografia),
        },
        contexto: { livro: null, parte: null, secao: null },
    };
    if (tipoFinal === 'prosa') delete item.descricaoVisual;
    return item;
}

// Cabeçalho do pacote (tudo menos `itens`), compartilhado pelos dois
// caminhos de entrada: o `.md` e a seleção exportada do app. Valida o meta.
// Campos de Autor que o pacote pode carregar além de nome/datas: `sexo` e
// `corRaca` (listas fechadas de utils.js — valor fora da lista é recusado,
// pra um erro de digitação não virar dado errado no cadastro) e
// `nomesLiterarios` ([{ nome, tipo }], tipo ∈ TIPOS_NOME_LITERARIO). Vazio
// significa "não documentado" e nunca é preenchido por dedução.
function conferirCamposDoAutor(autor) {
    if (autor.sexo && !SEXOS_AUTOR.includes(autor.sexo)) {
        throw new Error(
            `meta.autor.sexo inválido: "${autor.sexo}" (use ${SEXOS_AUTOR.join(', ')}).`,
        );
    }
    if (autor.corRaca && !CORES_RACA_AUTOR.includes(autor.corRaca)) {
        throw new Error(
            `meta.autor.corRaca inválido: "${autor.corRaca}" (use ${CORES_RACA_AUTOR.join(', ')}).`,
        );
    }
    if (autor.nomesLiterarios === undefined) return;
    if (!Array.isArray(autor.nomesLiterarios)) {
        throw new Error('meta.autor.nomesLiterarios deve ser uma lista de { nome, tipo }.');
    }
    autor.nomesLiterarios.forEach((n) => {
        if (!n?.nome || !TIPOS_NOME_LITERARIO.includes(n.tipo)) {
            throw new Error(
                `meta.autor.nomesLiterarios: cada item precisa de nome e tipo (${TIPOS_NOME_LITERARIO.join(' ou ')}); recebi ${JSON.stringify(n)}.`,
            );
        }
    });
}

export function cabecalhoPacote(meta) {
    // Erro comum: colar o formato de SAÍDA (biblioteca/<id>.json, com `id`
    // etc. aninhados sob `pacote`, e `autor` no plural `autores`) como se
    // fosse o `.meta.json` de ENTRADA (campos soltos no topo). Sem este
    // aviso, cai direto no "meta.id ausente" genérico abaixo, que não diz
    // qual é o problema de verdade.
    if (!meta?.id && meta?.pacote?.id) {
        throw new Error(
            'meta.json parece estar no formato de SAÍDA do pacote (campos aninhados em "pacote"/"autor"), não no formato de ENTRADA. Use campos soltos no topo — id, titulo, descricao, autor: { nome, nacionalidade, nascimento, obito }, fonte, edicao, link, ortografia, conferido, textos? — ver cabeçalho de scripts/montar-pacote.js.',
        );
    }
    if (!meta?.id || !/^[a-z0-9][a-z0-9-]*$/.test(meta.id)) {
        throw new Error('meta.id ausente ou inválido (use minúsculas, dígitos e hífen).');
    }
    if (!meta.autor?.nome) throw new Error('meta.autor.nome ausente.');
    // Outro erro comum: nascimento/obito como string ("1861-11-24") em vez
    // do objeto de data parcial { dia?, mes?, ano } que o cadastro de Autor
    // usa em todo o resto do app.
    for (const campo of ['nascimento', 'obito']) {
        const v = meta.autor[campo];
        if (v !== undefined && v !== null && typeof v !== 'object') {
            throw new Error(
                `meta.autor.${campo} deve ser um objeto { dia?, mes?, ano } (datas parciais), não uma string — recebi ${JSON.stringify(v)}.`,
            );
        }
    }

    conferirCamposDoAutor(meta.autor);

    return {
        export_format: 'biblioteca',
        pacote: {
            id: meta.id,
            titulo: meta.titulo || meta.id,
            descricao: meta.descricao || '',
            fonte: meta.fonte || '',
            edicao: meta.edicao || '',
            link: meta.link || '',
            ortografia: meta.ortografia || '',
            conferido: Boolean(meta.conferido),
        },
        autores: [{ id: 1, sobre: '', ...meta.autor }],
        itens: [],
    };
}

export function montarPacote(md, meta, opcoes = {}) {
    const textos = separarTextos(md, opcoes);
    if (!textos.length) throw new Error('Nenhum texto encontrado (esperado "# Título").');
    const pacote = cabecalhoPacote(meta);
    pacote.itens = textos.map((t, i) => montarItem(i + 1, t, meta, opcoes.tipo));
    return pacote;
}

// ------------------------------------------------------------
// Caminho 2: da seleção exportada do app direto ao pacote.
//
// O `.md` continua valendo pra texto colado de uma fonte externa. Quando o
// texto já está no acervo (revisado, com a Fonte preenchida por texto), o
// passo pelo `.md` só fazia perder essa proveniência e obrigava a redigitar.
// Aqui a entrada é o JSON de "Exportar seleção" (`export_format: "selecao"`,
// e também `exportacao_seletiva` / `tudo_flat`, que têm o mesmo `itens`).
//
// Só título, texto, tipo, idioma e fonteTexto atravessam. Todo o resto do
// item é reconstruído pelo molde neutro de montarItem — de propósito: a
// seleção sai do acervo pessoal e carrega notas, pessoas, livros, envios,
// pendências e avaliações que não têm o que fazer num pacote público.
// ------------------------------------------------------------

function primeiroTexto(...valores) {
    for (const v of valores) {
        const t = String(v ?? '').trim();
        if (t) return t;
    }
    return '';
}

// Aceita o objeto exportado ou o array de itens direto.
export function itensDeSelecao(selecao) {
    const itens = Array.isArray(selecao) ? selecao : selecao?.itens;
    if (!Array.isArray(itens) || !itens.length) {
        throw new Error('Seleção sem `itens` (esperado o JSON de "Exportar seleção").');
    }
    return itens;
}

export function montarItemDeSelecao(id, item, meta) {
    const titulo = String(item?.titulo ?? '').trim();
    const texto = String(item?.texto ?? '').trim();
    const base = montarItem(
        id,
        { titulo, texto: texto + '\n' },
        meta,
        item?.tipo === 'prosa' ? 'prosa' : 'poema',
    );
    const sobre = meta.textos?.[titulo] || {};
    const daFonte = item?.fonteTexto || {};
    return {
        ...base,
        idioma: primeiroTexto(item?.idioma) || 'pt-BR',
        fonteTexto: {
            origem: primeiroTexto(sobre.fonte, daFonte.origem, meta.fonte),
            edicao: primeiroTexto(sobre.edicao, daFonte.edicao, meta.edicao),
            link: primeiroTexto(sobre.link, daFonte.link, meta.link),
            conferido: Boolean(sobre.conferido ?? daFonte.conferido ?? meta.conferido),
            grafia: normalizarGrafia(primeiroTexto(sobre.grafia, daFonte.grafia, meta.ortografia)),
        },
    };
}

// Recusa o que estragaria o pacote em silêncio. O caso do autor é o que mais
// importa: a seleção pode ter saído do acervo do próprio Victor, e o pacote
// reescreve a autoria de todos os itens como `meta.autor.nome`.
function conferirSelecao(itens, meta) {
    const vazios = [];
    const vistos = new Map();
    const duplicados = new Set();
    const deOutroAutor = [];
    const alvo = meta.autor.nome.trim().toLocaleLowerCase('pt-BR');

    itens.forEach((item, i) => {
        const titulo = String(item?.titulo ?? '').trim();
        const texto = String(item?.texto ?? '').trim();
        if (!titulo || !texto) {
            vazios.push(titulo ? `"${titulo}"` : `item ${i + 1}`);
            return;
        }
        if (vistos.has(titulo)) duplicados.add(titulo);
        vistos.set(titulo, true);

        const nomes = (item.autoria || []).map((a) => String(a?.nome ?? '').trim()).filter(Boolean);
        if (nomes.length && !nomes.some((n) => n.toLocaleLowerCase('pt-BR') === alvo)) {
            deOutroAutor.push(`"${titulo}" (${nomes.join(', ')})`);
        }
    });

    if (vazios.length) {
        throw new Error(`Item sem título ou sem texto: ${vazios.join(', ')}.`);
    }
    if (duplicados.size) {
        const lista = [...duplicados].map((t) => `"${t}"`).join(', ');
        // meta.textos casa por título: com dois iguais não dá pra saber qual é qual.
        throw new Error(`Títulos repetidos na seleção: ${lista}. Renomeie um deles.`);
    }
    if (deOutroAutor.length) {
        throw new Error(
            `Autoria diferente de "${meta.autor.nome}": ${deOutroAutor.join(', ')}. ` +
                'Tire-os da seleção ou corrija meta.autor.nome.',
        );
    }
}

export function montarPacoteDeSelecao(selecao, meta) {
    const itens = itensDeSelecao(selecao);
    const pacote = cabecalhoPacote(meta);
    conferirSelecao(itens, meta);
    pacote.itens = itens.map((item, i) => montarItemDeSelecao(i + 1, item, meta));
    return pacote;
}

// Ano digitado num campo (string ou número) → inteiro, ou null se vazio.
// Ano fora de 1..9999 ou não inteiro lança — melhor recusar do que gravar
// um óbito que faria o domínio público sair errado.
function lerAno(valor, rotulo) {
    const t = String(valor ?? '').trim();
    if (!t) return null;
    if (!/^\d{1,4}$/.test(t) || Number(t) < 1) {
        throw new Error(`${rotulo}: informe só o ano (ex.: 1884).`);
    }
    return Number(t);
}

// "Importar de texto" (aba Biblioteca): monta o mesmo payload de um pacote
// a partir do que a pessoa preencheu na tela. `campos`:
//   { md, tituloPadrao, tipo, autor, nacionalidade, nascimentoAno, obitoAno,
//     fonte, edicao, link, ortografia, conferido }
// `tipo` ('poema' | 'prosa', vazio = 'poema') vale para todos os textos do
// envio.
// Lança Error com mensagem pronta pra mostrar. Nada aqui grava: o payload
// segue pra Importação Aditiva, que resolve Autor/duplicata e tira snapshot.
// `conferido` é declaração da pessoa — o app não tem como verificar a fonte.
export function montarPayloadDeTexto(campos) {
    const nome = String(campos?.autor ?? '').trim();
    if (!nome) throw new Error('Informe o nome do Autor.');

    const nascimento = lerAno(campos.nascimentoAno, 'Nascimento');
    const obito = lerAno(campos.obitoAno, 'Óbito');
    if (nascimento && obito && obito < nascimento) {
        throw new Error('O ano de óbito não pode ser anterior ao de nascimento.');
    }

    const autor = { nome };
    const nacionalidade = String(campos.nacionalidade ?? '').trim();
    if (nacionalidade) autor.nacionalidade = nacionalidade;
    if (nascimento) autor.nascimento = { ano: nascimento };
    if (obito) autor.obito = { ano: obito };

    const meta = {
        id: 'importado-de-texto',
        titulo: 'Importado de texto',
        autor,
        fonte: String(campos.fonte ?? '').trim(),
        edicao: String(campos.edicao ?? '').trim(),
        link: String(campos.link ?? '').trim(),
        ortografia: String(campos.ortografia ?? '').trim(),
        conferido: Boolean(campos.conferido),
    };
    return montarPacote(campos.md, meta, {
        tituloPadrao: campos.tituloPadrao,
        tipo: campos.tipo,
    });
}
