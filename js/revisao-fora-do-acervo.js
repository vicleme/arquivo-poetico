// ============================================================
// revisao-fora-do-acervo.js: lógica pura (sem DOM e sem db.js) do "Modo
// revisão" da seção "Fora do acervo" da aba Conexões (T9, a pedido do
// Victor): uma tabela com uma linha por entrada de Intertextualidade ou de
// Hipertextualidade, para corrigir o que ficou no campo errado, entrada por
// entrada. Corrigir uma obra ou um autor em todos os textos de uma vez
// continua sendo a ferramenta de `corrigir-fora-do-acervo.js`.
//
// Em duas etapas, como as outras ações em massa:
//
//   planejarRevisao(entrada, edicoes)   só lê; diz o que mudaria
//   aplicarRevisao(plano)               grava no lugar e devolve `desfazer()`
//
// `entrada` é `{ poemas, prosas }`. Cada edição é
// `{ chave, valores: { relacao?, nome?, autor?, tipoObra?, descricao?,
// dataObra?, dataObraAte?, obraPessoal?, personagem?, trecho?, traduzido?, link?, linkTexto?,
// dataAcesso?, nota? } }`,
// com a `chave` de uma linha de `listarLinhasRevisao`. Só os campos presentes
// em `valores` são tocados, e só os que de fato mudam entram no plano.
//
// Autor em lista: a linha traz `valores.autores` (a lista) e `valores.autor` (a
// mesma lista numa frase, "A, B e C", para a busca e as frases da confirmação).
// Na edição vale `valores.autores` (lista) ou `valores.autor` (um nome só, como
// a tela atual manda); o valor de revisão continua se chamando `autor`. A
// entrada antiga, com `autor` em texto, só muda de formato quando o resultado
// tem mais de um autor.
//
// Data da obra (T9, entrega 7): `dataObra` (o começo) e `dataObraAte` (o fim)
// são TEXTO na linha e na edição ("1922", "séc. XX", "década de 1920"), na
// forma de `formatarDataObra`. A edição é lida por `lerTextoDataObra`: o que
// não dá para entender recusa o plano (`data-obra-invalida`, com `valorComErro`
// e `erroData`), texto vazio tira a data, e o par depois da edição não pode ter
// o fim antes do começo (`data-obra-fim-antes-do-inicio`, só quando a edição
// mexe numa das duas). Digitar a mesma data de outro jeito ("sec xx" onde já
// está "séc. XX") não é mudança. Na entrada a data fica nas chaves `dataObra`
// e `dataObraAte`, como o modal grava, e o Desfazer devolve as duas chaves.
//
// Personagem, trecho e traduzido só existem na Intertextualidade (Obra pessoal vale nas duas): numa linha de
// Hipertextualidade essas edições são ignoradas (`valorAplica` diz quais valem).
// Link e data de acesso seguem a regra do modal: sem link não há data; link
// novo numa linha sem data recebe a data de hoje; apagar o link apaga a data.
//
// O "nome" é o campo `obra` na Intertextualidade e `hipotexto` na
// Hipertextualidade. O plano guarda as próprias entradas (as referências),
// então quem confirma deve planejar de novo na hora de aplicar: as linhas são
// reencontradas pela chave, que não depende de nenhum índice da tela.
//
// Recusas (plano com `erro`, sem alteracoes): nada para editar; apagar o nome
// de uma entrada que tinha nome (o plano diz qual linha em `linhaComErro`).
// Chave que não existe mais conta em `naoEncontradas` e não derruba o resto.
// ============================================================

import {
    autoresDaEntrada,
    capturarAutoresDaEntrada,
    definirAutoresDaEntrada,
    entradaTemAutorComVariosNomes,
    mesmaListaDeAutores,
    normalizarAutores,
    restaurarAutoresDaEntrada,
    textoDosAutores,
} from './autores-da-obra.js';
import {
    capturarPersonagensDaEntrada,
    definirPersonagensDaEntrada,
    mesmaListaDePersonagens,
    normalizarPersonagens,
    personagensDaEntrada,
    restaurarPersonagensDaEntrada,
    textoDosPersonagens,
} from './personagens-da-obra.js';
import {
    capturarOrigensDaEntrada,
    definirOrigensDaEntrada,
    mesmaListaDeOrigens,
    normalizarOrigens,
    origensDaEntrada,
    restaurarOrigensDaEntrada,
    textoDasOrigens,
    textoOrigemDaEntrada,
} from './origem-da-obra.js';
import {
    capturarDatasDaEntrada,
    datasDaEntrada,
    definirDatasDaEntrada,
    formatarDataObra,
    lerTextoDataObra,
    restaurarDatasDaEntrada,
    validarIntervaloDaData,
} from './data-da-obra.js';
import { chaveDeNome } from './fora-do-acervo.js';
import {
    ehObraPessoal,
    RELACOES_INTERTEXTUALIDADE_SUGERIDAS,
    TIPOS_OBRA_SUGERIDOS,
} from './intertextualidade.js';
import {
    dataAcessoDoLink,
    formatarDataAcesso,
    hojeIso,
    normalizarBusca,
    opcoesBuscaPadrao,
    parseConsultaBusca,
    valorBateTermo,
} from './utils.js';

export const CAMPOS_REVISAO = [
    { campo: 'intertextualidade', nome: 'obra', rotulo: 'Intertextualidade' },
    { campo: 'hipertextualidade', nome: 'hipotexto', rotulo: 'Hipertextualidade' },
];

// Os valores editáveis de uma linha, na ordem das colunas da tabela.
export const VALORES_REVISAO = [
    'relacao',
    'nome',
    'autor',
    'origem',
    'tipoObra',
    'descricao',
    'dataObra',
    'dataObraAte',
    'obraPessoal',
    'personagem',
    'trecho',
    'traduzido',
    'link',
    'linkTexto',
    'dataAcesso',
    'nota',
];

// Valores que são check (boolean) na linha e na edição. `obraPessoal` vale nos
// dois campos; na entrada a chave só existe quando marcada, e desmarcar a tira.
export const VALORES_BOOLEANOS_REVISAO = ['traduzido', 'obraPessoal'];

// Os dois valores de data da obra: texto na linha, data de verdade na entrada.
export const VALORES_DATA_OBRA = ['dataObra', 'dataObraAte'];
const ehValorDeData = (v) => VALORES_DATA_OBRA.includes(v);

// Valores que só a Intertextualidade tem (a Hipertextualidade não guarda).
const SO_INTERTEXTUALIDADE = ['personagem', 'trecho', 'traduzido'];

// O valor existe nesse campo (Intertextualidade ou Hipertextualidade)?
export function valorAplica(campo, valor) {
    return !(campo === 'hipertextualidade' && SO_INTERTEXTUALIDADE.includes(valor));
}

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function ehObjeto(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function ordenarPt(a, b) {
    return String(a).localeCompare(String(b), 'pt-BR');
}

// O nome do campo que guarda cada valor dentro da entrada.
function campoDoValor(info, valor) {
    return valor === 'nome' ? info.nome : valor;
}

// ─── Linhas ──────────────────────────────────────────────────

// Uma linha por entrada, com a chave estável `tipo:id:campo:indice`, na ordem
// do título do texto (depois Poema antes de Prosa, Intertextualidade antes de
// Hipertextualidade e a posição da entrada).
export function listarLinhasRevisao({ poemas = [], prosas = [] } = {}) {
    const linhas = [];
    for (const [tipo, lista] of [
        ['poema', poemas],
        ['prosa', prosas],
    ]) {
        for (const item of lista || []) {
            if (!ehObjeto(item)) continue;
            for (const info of CAMPOS_REVISAO) {
                if (!Array.isArray(item[info.campo])) continue;
                item[info.campo].forEach((entrada, indice) => {
                    if (!ehObjeto(entrada)) return;
                    const datas = datasDaEntrada(entrada);
                    linhas.push({
                        chave: `${tipo}:${item.id}:${info.campo}:${indice}`,
                        tipo,
                        id: item.id,
                        titulo: texto(item.titulo) || '(sem título)',
                        campo: info.campo,
                        rotuloCampo: info.rotulo,
                        indice,
                        entrada,
                        info,
                        valores: {
                            relacao: texto(entrada.relacao),
                            nome: texto(entrada[info.nome]),
                            autores: autoresDaEntrada(entrada),
                            autor: textoDosAutores(autoresDaEntrada(entrada)),
                            tipoObra: texto(entrada.tipoObra),
                            descricao: texto(entrada.descricao),
                            dataObra: formatarDataObra(datas.inicio),
                            dataObraAte: formatarDataObra(datas.fim),
                            origens: origensDaEntrada(entrada),
                            origem: textoOrigemDaEntrada(entrada),
                            personagens: personagensDaEntrada(entrada),
                            personagem: textoDosPersonagens(personagensDaEntrada(entrada)),
                            trecho: texto(entrada.trecho),
                            obraPessoal: ehObraPessoal(entrada),
                            traduzido: entrada.traduzido === true,
                            link: texto(entrada.link),
                            linkTexto: texto(entrada.linkTexto),
                            dataAcesso: dataAcessoDoLink(entrada.link, texto(entrada.dataAcesso)),
                            nota: texto(entrada.nota),
                        },
                    });
                });
            }
        }
    }
    const ordemCampo = (c) => CAMPOS_REVISAO.findIndex((i) => i.campo === c);
    return linhas.sort(
        (a, b) =>
            ordenarPt(a.titulo, b.titulo) ||
            ordenarPt(a.tipo, b.tipo) ||
            String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true }) ||
            ordemCampo(a.campo) - ordemCampo(b.campo) ||
            a.indice - b.indice,
    );
}

// ─── Filtro ──────────────────────────────────────────────────

// Sem pontuação na consulta: cada palavra (sem acento, caixa nem pontuação)
// precisa aparecer em algum dos textos da linha. Com pontuação (", de", "(" ou
// ")"): a consulta inteira é procurada literalmente, só sem acento nem caixa,
// dentro de um mesmo valor da linha. `opcoes.campo` limita a Intertextualidade
// ou a Hipertextualidade; `opcoes.faltando` deixa só as linhas em que aquele
// valor está vazio (qualquer um de VALORES_REVISAO; as linhas onde o valor não
// existe, como personagem na Hipertextualidade, saem), para achar o que ficou
// por preencher (`faltando: 'dataObra'` é o "Sem data da obra"). `faltando: 'autor-varios-nomes'` (FILTRO_AUTOR_VARIOS_NOMES)
// é o filtro à parte que deixa as linhas com alguma tag de autor que parece ter
// mais de um nome (" e ", " & ", " feat. ", vírgula...), para dividir em tags.
// Colunas escondidas na tela também entram na busca.
export const FILTRO_AUTOR_VARIOS_NOMES = 'autor-varios-nomes';

const TEM_PONTUACAO = /[^\p{L}\p{N}\s]/u;

// Sem acento, sem caixa e com os espaços colapsados, mas COM a pontuação: é o
// que deixa a busca achar ", de" ou "(" onde o campo errado guardou o autor.
function textoLiteral(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

// Os textos em que a busca olha, um por valor (colunas escondidas na tela
// também entram). O nome do campo (Intertextualidade ou Hipertextualidade) não
// entra: para isso existe `opcoes.campo`.
function textosDaLinha(l) {
    return [
        l.titulo,
        l.valores.relacao,
        l.valores.nome,
        // Uma tag por vez: a frase "A, B e C" teria vírgulas que o usuário não digitou.
        ...l.valores.autores,
        l.valores.tipoObra,
        // Uma etiqueta por vez, como o autor.
        ...l.valores.origens,
        l.valores.descricao,
        l.valores.dataObra,
        l.valores.dataObraAte,
        // Uma tag por vez, como o autor.
        ...l.valores.personagens,
        l.valores.trecho,
        l.valores.link,
        l.valores.linkTexto,
        formatarDataAcesso(l.valores.dataAcesso),
        l.valores.nota,
    ].filter(Boolean);
}

// ─── Busca por campo (`campo:valor`) ─────────────────────────
//
// A mesma sintaxe das abas de texto, pelo mesmo interpretador de utils.js
// (`parseConsultaBusca`): termos soltos = E; `ou`; "frase exata"; `-termo`
// exclui; `campo:*` = campo preenchido (então `-origem:*` deixa só as linhas
// sem origem); acento e caixa não importam. Sem prefixo, o termo é procurado em
// todos os textos da linha. O prefixo é o nome da coluna, sem acento.
//
// Uma consulta só vira "avançada" quando traz algum prefixo conhecido, `-`,
// `ou` ou aspas; fora isso a busca é a de antes (as palavras em qualquer ordem,
// ou a consulta literal quando tem pontuação, como ", de").
export const CAMPOS_BUSCA_REVISAO = {
    texto: 'titulo',
    titulo: 'titulo',
    relacao: 'relacao',
    nome: 'nome',
    autor: 'autor',
    origem: 'origem',
    tipo: 'tipo',
    descricao: 'descricao',
    data: 'data',
    pessoal: 'obraPessoal',
    personagem: 'personagem',
    trecho: 'trecho',
    traduzido: 'traduzido',
    link: 'link',
    acesso: 'dataAcesso',
    nota: 'nota',
};

// Prefixo canônico (um por campo), na ordem das colunas, para a ajuda.
export const PREFIXOS_BUSCA_REVISAO = [
    'texto',
    'relacao',
    'nome',
    'autor',
    'origem',
    'tipo',
    'descricao',
    'data',
    'pessoal',
    'personagem',
    'trecho',
    'traduzido',
    'link',
    'acesso',
    'nota',
];

// A coluna da tabela → o prefixo da lupa do cabeçalho. `campo` (Intertextualidade
// ou Hipertextualidade) não tem prefixo: para isso existe o filtro Campo.
export const PREFIXO_DA_COLUNA = {
    titulo: 'texto',
    relacao: 'relacao',
    nome: 'nome',
    autor: 'autor',
    origem: 'origem',
    tipoObra: 'tipo',
    descricao: 'descricao',
    dataObra: 'data',
    dataObraAte: 'data',
    obraPessoal: 'pessoal',
    personagem: 'personagem',
    trecho: 'trecho',
    traduzido: 'traduzido',
    link: 'link',
    linkTexto: 'link',
    dataAcesso: 'acesso',
    nota: 'nota',
};

// O valor de cada prefixo numa linha, como texto; vazio quando não há (ou não
// existe nesse campo). Os checks viram "sim" ou vazio, para `pessoal:*`.
function valoresDeBusca(l) {
    const v = l.valores;
    return {
        titulo: l.titulo,
        relacao: v.relacao,
        nome: v.nome,
        autor: v.autores.join(', '),
        origem: v.origens.join(', '),
        tipo: v.tipoObra,
        descricao: v.descricao,
        data: [v.dataObra, v.dataObraAte].filter(Boolean).join(' '),
        obraPessoal: v.obraPessoal ? 'sim' : '',
        personagem: v.personagens.join(', '),
        trecho: v.trecho,
        traduzido: v.traduzido ? 'sim' : '',
        link: [v.link, v.linkTexto].filter(Boolean).join(' '),
        dataAcesso: formatarDataAcesso(v.dataAcesso),
        nota: v.nota,
    };
}

// A consulta interpretada, ou `null` quando não é avançada.
export function interpretarBuscaRevisao(consulta) {
    const bruta = String(consulta ?? '');
    if (!bruta.trim()) return null;
    const parsed = parseConsultaBusca(bruta, CAMPOS_BUSCA_REVISAO);
    const usaCampo = [...parsed.gruposIncluir.flat(), ...parsed.termosExcluir].some((t) => t.campo);
    // `origem:` ainda sem valor (a pessoa está digitando, ou acabou de clicar na
    // lupa): não filtra nada, em vez de procurar a palavra "origem".
    const prefixoSemValor = bruta.split(/\s+/).some((token) => {
        const m = token.match(/^-?([a-zA-Zà-úÀ-Ú]+):$/);
        return Boolean(m && CAMPOS_BUSCA_REVISAO[normalizarBusca(m[1])]);
    });
    const avancada =
        usaCampo ||
        prefixoSemValor ||
        parsed.termosExcluir.length > 0 ||
        parsed.gruposIncluir.length > 1 ||
        bruta.includes('"');
    return avancada ? parsed : null;
}

function bateBuscaAvancada(l, { gruposIncluir, termosExcluir }) {
    const opts = opcoesBuscaPadrao();
    const geral = normalizarBusca(textosDaLinha(l).join(' '), opts);
    const porCampo = valoresDeBusca(l);
    const valorDoTermo = (t) => (t.campo ? normalizarBusca(porCampo[t.campo] ?? '', opts) : geral);
    const bate = (t) =>
        t.presenca
            ? valorDoTermo(t) !== ''
            : valorBateTermo(valorDoTermo(t), normalizarBusca(t.termo, opts), opts.palavraInteira);
    const incluida = !gruposIncluir.length || gruposIncluir.some((g) => g.every(bate));
    return incluida && !termosExcluir.some(bate);
}

export function filtrarLinhasRevisao(linhas = [], consulta = '', opcoes = {}) {
    const { campo = '', faltando = '' } = opcoes;
    const avancada = interpretarBuscaRevisao(consulta);
    const literal =
        !avancada && TEM_PONTUACAO.test(String(consulta ?? '')) ? textoLiteral(consulta) : '';
    const palavras = literal || avancada ? [] : chaveDeNome(consulta).split(' ').filter(Boolean);
    return linhas.filter((l) => {
        if (campo && l.campo !== campo) return false;
        if (faltando === FILTRO_AUTOR_VARIOS_NOMES) {
            if (!entradaTemAutorComVariosNomes({ autores: l.valores.autores })) return false;
        } else if (faltando && VALORES_REVISAO.includes(faltando)) {
            if (!valorAplica(l.campo, faltando) || l.valores[faltando]) return false;
        }
        if (avancada) return bateBuscaAvancada(l, avancada);
        if (literal) return textosDaLinha(l).some((t) => textoLiteral(t).includes(literal));
        if (!palavras.length) return true;
        const alvo = chaveDeNome(textosDaLinha(l).join(' '));
        return palavras.every((p) => alvo.includes(p));
    });
}

// ─── Sugestões para os campos da tabela ──────────────────────

function unicos(valores, fixos = []) {
    const vistos = new Map();
    [...fixos, ...valores].forEach((v) => {
        const t = texto(v);
        const chave = chaveDeNome(t);
        if (t && chave && !vistos.has(chave)) vistos.set(chave, t);
    });
    return [...vistos.values()].sort(ordenarPt);
}

// Listas para os datalists: o que a lista de fábrica sugere mais o que já foi
// usado nas entradas, sem repetir (sem acento nem caixa).
export function sugestoesDaRevisao(linhas = []) {
    const usados = (campo, valor) =>
        linhas.filter((l) => l.campo === campo).map((l) => l.valores[valor]);
    return {
        relacaoIntertextualidade: unicos(
            usados('intertextualidade', 'relacao'),
            RELACOES_INTERTEXTUALIDADE_SUGERIDAS,
        ),
        relacaoHipertextualidade: unicos(usados('hipertextualidade', 'relacao')),
        tipoObra: unicos(
            linhas.map((l) => l.valores.tipoObra),
            TIPOS_OBRA_SUGERIDOS || [],
        ),
        autor: unicos(linhas.flatMap((l) => l.valores.autores)),
        origem: unicos(linhas.flatMap((l) => l.valores.origens)),
        personagem: unicos(linhas.flatMap((l) => l.valores.personagens)),
        nome: unicos(linhas.map((l) => l.valores.nome)),
    };
}

// ─── Plano ───────────────────────────────────────────────────

function vazio(erro, extra = {}) {
    return {
        erro,
        alteracoes: [],
        textos: 0,
        entradas: 0,
        naoEncontradas: 0,
        linhaComErro: '',
        camposAlterados: {},
        ...extra,
    };
}

// Junta edições da mesma linha: a última palavra vence em cada valor.
// `traduzido` e `obraPessoal` só aceitam booleano; os demais, só texto.
function juntarEdicoes(edicoes) {
    const porChave = new Map();
    (Array.isArray(edicoes) ? edicoes : []).forEach((e) => {
        if (!ehObjeto(e) || typeof e.chave !== 'string' || !ehObjeto(e.valores)) return;
        const atual = porChave.get(e.chave) || {};
        VALORES_REVISAO.forEach((v) => {
            if (v === 'autor') {
                if (Array.isArray(e.valores.autores))
                    atual.autores = normalizarAutores(e.valores.autores);
                else if (typeof e.valores.autor === 'string')
                    atual.autores = normalizarAutores([e.valores.autor]);
            } else if (v === 'origem') {
                if (Array.isArray(e.valores.origens))
                    atual.origens = normalizarOrigens(e.valores.origens);
                else if (typeof e.valores.origem === 'string')
                    atual.origens = normalizarOrigens([e.valores.origem]);
            } else if (v === 'personagem') {
                if (Array.isArray(e.valores.personagens))
                    atual.personagens = normalizarPersonagens(e.valores.personagens);
                else if (typeof e.valores.personagem === 'string')
                    atual.personagens = normalizarPersonagens([e.valores.personagem]);
            } else if (VALORES_BOOLEANOS_REVISAO.includes(v)) {
                if (typeof e.valores[v] === 'boolean') atual[v] = e.valores[v];
            } else if (typeof e.valores[v] === 'string') {
                atual[v] = texto(e.valores[v]);
            }
        });
        porChave.set(e.chave, atual);
    });
    return porChave;
}

// Os valores finais de uma linha depois do pedido, com as regras do link: sem
// link não há data de acesso; link novo numa linha sem data recebe a de hoje
// (a menos que a data venha no próprio pedido); apagar o link apaga a data.
function valoresFinais(linha, pedido, hoje) {
    const finais = { ...linha.valores };
    VALORES_REVISAO.forEach((v) => {
        if (
            v !== 'autor' &&
            v !== 'origem' &&
            v !== 'personagem' &&
            v in pedido &&
            valorAplica(linha.campo, v)
        )
            finais[v] = pedido[v];
    });
    if ('autores' in pedido) {
        finais.autores = pedido.autores;
        finais.autor = textoDosAutores(pedido.autores);
    }
    if ('origens' in pedido) {
        finais.origens = pedido.origens;
        finais.origem = textoDasOrigens(pedido.origens);
    }
    if ('personagens' in pedido && valorAplica(linha.campo, 'personagem')) {
        finais.personagens = pedido.personagens;
        finais.personagem = textoDosPersonagens(pedido.personagens);
    }
    if ('link' in pedido && pedido.link !== linha.valores.link) {
        if (!pedido.link) finais.dataAcesso = '';
        else if (!('dataAcesso' in pedido) && !linha.valores.dataAcesso) finais.dataAcesso = hoje;
    }
    finais.dataAcesso = dataAcessoDoLink(finais.link, finais.dataAcesso);
    return finais;
}

export function planejarRevisao(entrada = {}, edicoes = [], { hoje = hojeIso() } = {}) {
    const pedidas = juntarEdicoes(edicoes);
    if (!pedidas.size) return vazio('sem-edicao');

    const porChave = new Map(listarLinhasRevisao(entrada).map((l) => [l.chave, l]));
    const alteracoes = [];
    const camposAlterados = {};
    let naoEncontradas = 0;

    for (const [chave, pedido] of pedidas) {
        const linha = porChave.get(chave);
        if (!linha) {
            naoEncontradas += 1;
            continue;
        }
        if (pedido.dataAcesso && !formatarDataAcesso(pedido.dataAcesso)) {
            return vazio('data-invalida', { linhaComErro: chave, naoEncontradas });
        }
        // Data da obra: o texto vira data aqui; a forma canônica entra no
        // lugar do que foi digitado, para "sec xx" não contar como mudança.
        const novasDatas = {};
        const pedidoLido = { ...pedido };
        for (const v of VALORES_DATA_OBRA) {
            if (!(v in pedidoLido)) continue;
            const { data, erro } = lerTextoDataObra(pedidoLido[v]);
            if (erro) {
                return vazio('data-obra-invalida', {
                    linhaComErro: chave,
                    valorComErro: v,
                    erroData: erro,
                    naoEncontradas,
                });
            }
            novasDatas[v] = data;
            pedidoLido[v] = formatarDataObra(data);
        }
        const depois = valoresFinais(linha, pedidoLido, hoje);
        const mudados = VALORES_REVISAO.filter((v) => {
            if (v === 'autor') return !mesmaListaDeAutores(depois.autores, linha.valores.autores);
            if (v === 'origem') return !mesmaListaDeOrigens(depois.origens, linha.valores.origens);
            if (v === 'personagem')
                return !mesmaListaDePersonagens(depois.personagens, linha.valores.personagens);
            return depois[v] !== linha.valores[v];
        });
        if (!mudados.length) continue;
        if (mudados.includes('nome') && !depois.nome && linha.valores.nome) {
            return vazio('nome-vazio', { linhaComErro: chave, naoEncontradas });
        }
        const datasMudadas = mudados.filter(ehValorDeData);
        if (datasMudadas.length) {
            // O par que a entrada terá: a ponta editada, ou a que já estava.
            const atuais = datasDaEntrada(linha.entrada);
            const inicio = mudados.includes('dataObra') ? novasDatas.dataObra : atuais.inicio;
            const fim = mudados.includes('dataObraAte') ? novasDatas.dataObraAte : atuais.fim;
            if (validarIntervaloDaData(inicio, fim)) {
                return vazio('data-obra-fim-antes-do-inicio', {
                    linhaComErro: chave,
                    naoEncontradas,
                });
            }
        }
        mudados.forEach((v) => {
            camposAlterados[v] = (camposAlterados[v] || 0) + 1;
        });
        alteracoes.push({
            chave,
            tipo: linha.tipo,
            id: linha.id,
            titulo: linha.titulo,
            campo: linha.campo,
            rotuloCampo: linha.rotuloCampo,
            entrada: linha.entrada,
            info: linha.info,
            mudados,
            // O formato do autor antes (`autor` ou `autores`), para o Desfazer.
            formaDoAutor: capturarAutoresDaEntrada(linha.entrada),
            // O mesmo para a origem (a chave `origemObra` pode nem existir).
            formaDaOrigem: capturarOrigensDaEntrada(linha.entrada),
            // O mesmo para o personagem (`personagem` ou `personagens`).
            formaDoPersonagem: capturarPersonagensDaEntrada(linha.entrada),
            // O que a entrada tinha antes como chave própria (e o valor cru),
            // para o Desfazer não deixar um campo vazio onde nunca houve um.
            tinha: Object.fromEntries(
                mudados
                    .filter((v) => !ehValorDeData(v))
                    .map((v) => [v, campoDoValor(linha.info, v) in linha.entrada]),
            ),
            bruto: Object.fromEntries(
                mudados
                    .filter((v) => !ehValorDeData(v))
                    .map((v) => [v, linha.entrada[campoDoValor(linha.info, v)]]),
            ),
            // As datas ficam como data de verdade (só a ponta que mudou; a
            // outra é `undefined` e não é tocada) e a captura devolve as duas
            // chaves, inclusive a ausência delas, no Desfazer.
            novasDatas: datasMudadas.length
                ? {
                      inicio: mudados.includes('dataObra') ? novasDatas.dataObra : undefined,
                      fim: mudados.includes('dataObraAte') ? novasDatas.dataObraAte : undefined,
                  }
                : null,
            capturaDatas: datasMudadas.length ? capturarDatasDaEntrada(linha.entrada) : null,
            antes: { ...linha.valores },
            depois,
        });
    }

    const textos = new Set(alteracoes.map((a) => `${a.tipo}:${a.id}`));
    return {
        erro: '',
        alteracoes,
        textos: textos.size,
        entradas: alteracoes.length,
        naoEncontradas,
        linhaComErro: '',
        camposAlterados,
    };
}

// Grava o plano nas entradas e devolve `{ textos, entradas, desfazer }`.
// `desfazer()` devolve cada valor ao de antes (e tira a chave de quem não a
// tinha). Plano com erro ou vazio não grava nada. A data de acesso vazia sai
// da entrada (o modal também não a guarda vazia).
export function aplicarRevisao(plano) {
    const alteracoes = plano && !plano.erro ? plano.alteracoes : [];
    alteracoes.forEach((a) => {
        if (a.novasDatas) definirDatasDaEntrada(a.entrada, a.novasDatas);
        a.mudados.forEach((v) => {
            if (ehValorDeData(v)) return;
            if (v === 'autor') {
                definirAutoresDaEntrada(a.entrada, a.depois.autores);
                return;
            }
            if (v === 'origem') {
                definirOrigensDaEntrada(a.entrada, a.depois.origens);
                return;
            }
            if (v === 'personagem') {
                definirPersonagensDaEntrada(a.entrada, a.depois.personagens);
                return;
            }
            const chave = campoDoValor(a.info, v);
            if ((v === 'dataAcesso' || v === 'obraPessoal') && !a.depois[v])
                delete a.entrada[chave];
            else a.entrada[chave] = a.depois[v];
        });
    });
    let desfeito = false;
    return {
        textos: plano?.textos || 0,
        entradas: alteracoes.length,
        desfazer() {
            if (desfeito) return;
            desfeito = true;
            alteracoes.forEach((a) => {
                if (a.capturaDatas) restaurarDatasDaEntrada(a.entrada, a.capturaDatas);
                a.mudados.forEach((v) => {
                    if (ehValorDeData(v)) return;
                    if (v === 'autor') {
                        restaurarAutoresDaEntrada(a.entrada, a.formaDoAutor);
                        return;
                    }
                    if (v === 'origem') {
                        restaurarOrigensDaEntrada(a.entrada, a.formaDaOrigem);
                        return;
                    }
                    if (v === 'personagem') {
                        restaurarPersonagensDaEntrada(a.entrada, a.formaDoPersonagem);
                        return;
                    }
                    const chave = campoDoValor(a.info, v);
                    if (a.tinha[v]) a.entrada[chave] = a.bruto[v];
                    else delete a.entrada[chave];
                });
            });
        },
    };
}

export const ROTULOS_VALOR_REVISAO = {
    relacao: 'relação',
    nome: 'obra',
    autor: 'autor',
    origem: 'origem',
    tipoObra: 'tipo',
    descricao: 'descrição',
    dataObra: 'data da obra',
    dataObraAte: 'até',
    obraPessoal: 'obra pessoal',
    personagem: 'personagem',
    trecho: 'trecho',
    traduzido: 'traduzido',
    link: 'link',
    linkTexto: 'texto do link',
    dataAcesso: 'data de acesso',
    nota: 'nota',
};

const TAMANHO_MAX_EXEMPLO = 60;

function mostrar(valor, v) {
    if (VALORES_BOOLEANOS_REVISAO.includes(v)) return valor ? 'sim' : 'não';
    if (!valor) return '(vazio)';
    let texto = v === 'dataAcesso' ? formatarDataAcesso(valor) || valor : valor;
    texto = texto.replace(/\s+/g, ' ');
    if (texto.length > TAMANHO_MAX_EXEMPLO) texto = `${texto.slice(0, TAMANHO_MAX_EXEMPLO - 1)}…`;
    return `«${texto}»`;
}

// Frases curtas para a confirmação: "Texto, campo: antes → depois". Devolve
// as primeiras `maxExemplos` e quantas ficaram de fora.
export function descreverRevisao(plano, { maxExemplos = 3 } = {}) {
    const todas = [];
    (plano?.alteracoes || []).forEach((a) => {
        const partes = a.mudados.map(
            (v) =>
                `${ROTULOS_VALOR_REVISAO[v]}: ${mostrar(a.antes[v], v)} → ${mostrar(a.depois[v], v)}`,
        );
        todas.push(`${a.titulo} (${a.rotuloCampo}), ${partes.join('; ')}`);
    });
    return {
        linhas: todas.slice(0, maxExemplos),
        restantes: Math.max(0, todas.length - maxExemplos),
    };
}

export const MENSAGENS_ERRO_REVISAO = {
    'sem-edicao': 'Nenhuma linha foi alterada.',
    'nome-vazio':
        'Uma obra que já tinha nome não pode ficar sem nome. Escreva o nome ou desfaça a alteração.',
    'data-invalida': 'A data de acesso precisa ser uma data completa (dia, mês e ano).',
    'data-obra-invalida':
        'Não entendi uma das datas da obra. Escreva, por exemplo, 1922, séc. XX, década de 1920 ou 11/02/1922.',
    'data-obra-fim-antes-do-inicio': 'O "Até" vem antes da data da obra. Confira as duas datas.',
};
