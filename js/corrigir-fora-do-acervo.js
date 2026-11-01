// ============================================================
// corrigir-fora-do-acervo.js: lógica pura (sem DOM e sem db.js) das
// correções da seção "Fora do acervo" da aba Conexões (T9, extra a pedido do
// Victor): renomear ou juntar uma obra ou um autor em todos os textos de uma
// vez. Mexe nas entradas de Intertextualidade (`obra`) e de Hipertextualidade
// (`hipotexto`) de Poemas e Prosas; o resto do texto não é tocado.
//
// Em duas etapas, como as outras ações em massa:
//
//   planejarCorrecao(entrada, pedido)   só lê; diz o que mudaria
//   aplicarPlano(plano)                 grava no lugar e devolve `desfazer()`
//
// `entrada` é `{ poemas, prosas }`. O plano guarda as próprias entradas (as
// referências), então quem confirma deve planejar de novo na hora de aplicar.
//
// Pedidos:
//   { tipo: 'obra',  alvos: [chave, ...], novo: { obra, autor, tipoObra, descricao } }
//       `alvos` são as chaves de obra (`obras[].chave`, nome mais autor, sem
//       acento nem caixa). Cada entrada que casa com uma delas passa a ter o
//       nome, o autor e o tipo de `novo`. `tipoObra` e `descricao` ausentes
//       (undefined) mantêm o que a entrada já tinha; `descricao` informada
//       (mesmo vazia) troca em todas. O plano conta em `descricoesSobrescritas`
//       quantas entradas perdem uma descrição diferente da nova. Servem para corrigir uma obra (um alvo)
//       e para juntar várias grafias ou obras (vários alvos).
//       Data da obra: `novo.dataObra` (o começo) e `novo.dataObraAte` (o fim),
//       cada uma no formato de `criarDataObra` (data-da-obra.js). Cada ponta
//       tem três jeitos: ausente (undefined) mantém o que a entrada já tinha;
//       `null` tira a data de todas; uma data troca em todas. O plano conta em
//       `datasSobrescritas` quantas entradas perdem uma data diferente da nova.
//       Origem (lugar ou cultura): `novo.origens` (lista de tags). Ausente
//       (undefined) mantém a origem de cada entrada; uma lista troca em todas
//       (a ordem e a grafia pedidas valem); lista vazia tira a origem de todas
//       (a chave sai da entrada). O plano conta em `origensSobrescritas`
//       quantas entradas perdem uma origem diferente da nova. A origem não
//       entra na identidade da obra: a correção nunca junta nem separa obras
//       por causa dela.
//       Obra pessoal: `novo.obraPessoal` (boolean). Ausente (undefined) mantém
//       a marca de cada entrada; `true` marca todas as entradas da obra;
//       `false` tira a marca de todas (a chave sai da entrada). O plano conta em
//       `marcasMudadas` quantas entradas mudam de marca.
//   { tipo: 'referencia', alvos: [chave, ...], novo: { texto, tipo, dataObra, dataObraAte } }
//       Referências (`referenciasExternas`). `alvos` são as chaves de referência
//       (`referencias[].chave`: tipo mais texto, sem acento nem caixa). Cada
//       entrada que casa passa a ter o texto de `novo`. `novo.tipo` ausente
//       (undefined) mantém o tipo de cada entrada; uma string troca em todas
//       (vazia tira o tipo). As datas seguem a regra da obra (ausente mantém,
//       null tira, uma data troca). Quando o tipo novo não é Pessoa pública, as
//       entradas que eram Pessoa pública perdem `conhecidoComo`, `genero`,
//       `orientacao` e `corRaca` (o mesmo que trocar o Tipo no formulário): o
//       plano conta em `caracterizacoesPerdidas` quantas entradas perdem algum
//       desses campos, e o Desfazer os devolve. Os campos de Pessoa pública
//       são por entrada e não entram na identidade. Se o resultado coincide com
//       outra referência (mesmo tipo e texto), `juntaCom` conta os textos.
//   { tipo: 'autor', alvos: [chave, ...], novo: { autor, origens } }
//       `alvos` são as chaves de autor (`autores[].chave`). Cada entrada com
//       esse autor passa a ter o autor de `novo`, em Intertextualidade e em
//       Hipertextualidade. `novo.origens` (lista de tags) segue a regra da
//       obra: ausente mantém a origem de cada entrada, uma lista troca em todas
//       as entradas do autor (inclusive em obras com mais de um autor), lista
//       vazia tira; `origensSobrescritas` conta quem perde uma origem diferente.
//
// Autoria em lista: `novo.autores` (lista de nomes, na ordem desejada) vale no
// pedido de obra; `novo.autor` (um nome só) continua aceito e vale como lista
// de um. A identidade da obra não depende da ordem dos autores. No pedido de
// autor, `alvos` são chaves de UM autor e a tag dele é trocada por `novo.autor`
// dentro da lista de cada entrada (no lugar, sem mexer nos outros autores; se o
// mesmo autor sobrar duas vezes, junta). A entrada antiga, com `autor` em
// texto, só muda de formato quando o resultado tem mais de um autor.
//
// Recusas (plano com `erro`, sem alteracoes): pedido sem alvo, nome da obra
// vazio, autor vazio ao corrigir um autor, data que não vale (`data-invalida`,
// com o código do problema em `erroData`) e data final antes da inicial
// (`data-fim-antes-do-inicio`, olhando a data que cada entrada teria depois). Autor vazio ao corrigir uma obra
// vale (tira o autor da obra).
// ============================================================

import { chaveDeNome } from './fora-do-acervo.js';
import { ehPessoaPublica } from './conhecido-como.js';
import { ehObraPessoal } from './intertextualidade.js';
import {
    capturarDatasDaEntrada,
    chaveDaDataObra,
    criarDataObra,
    datasDaEntrada,
    definirDatasDaEntrada,
    restaurarDatasDaEntrada,
    validarIntervaloDaData,
} from './data-da-obra.js';
import {
    capturarOrigensDaEntrada,
    definirOrigensDaEntrada,
    mesmaListaDeOrigens,
    normalizarOrigens,
    origensDaEntrada,
    restaurarOrigensDaEntrada,
    textoDasOrigens,
} from './origem-da-obra.js';
import {
    autoresDaEntrada,
    capturarAutoresDaEntrada,
    chaveDeAutor,
    chaveDosAutores,
    chavesDosAutores,
    definirAutoresDaEntrada,
    mesmaListaDeAutores,
    normalizarAutores,
    restaurarAutoresDaEntrada,
    substituirAutorNaLista,
    textoDosAutores,
} from './autores-da-obra.js';

const CAMPOS = [
    { campo: 'intertextualidade', nome: 'obra' },
    { campo: 'hipertextualidade', nome: 'hipotexto' },
];

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function ehObjeto(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function* entradasDosTextos({ poemas = [], prosas = [] } = {}) {
    for (const [tipo, lista] of [
        ['poema', poemas],
        ['prosa', prosas],
    ]) {
        for (const item of lista || []) {
            if (!ehObjeto(item)) continue;
            for (const { campo, nome } of CAMPOS) {
                if (!Array.isArray(item[campo])) continue;
                for (const entrada of item[campo]) {
                    if (!ehObjeto(entrada)) continue;
                    yield { tipo, item, campo, nome, entrada };
                }
            }
        }
    }
}

// A chave de obra de uma entrada (a mesma de `montarForaDoAcervo`), ou '' se
// a entrada não tem nome de obra.
export function chaveDaObra(entrada, nome) {
    const chaveObra = chaveDeNome(entrada[nome]);
    if (!chaveObra) return '';
    return `${chaveObra}|${chaveDosAutores(autoresDaEntrada(entrada))}`;
}

// Os autores pedidos em `novo`: a lista, ou o nome único, ou nenhum (tira os
// autores da obra).
function autoresDoPedido(novo) {
    if (Array.isArray(novo.autores)) return normalizarAutores(novo.autores);
    if (typeof novo.autor === 'string') return normalizarAutores([novo.autor]);
    return [];
}

// Os valores de uma entrada que a correção olha e muda.
function fotoDaEntrada(e) {
    const autores = autoresDaEntrada(e.entrada);
    return {
        nome: e.entrada[e.nome] ?? '',
        autores,
        autor: textoDosAutores(autores),
        tipoObra: e.entrada.tipoObra ?? '',
        descricao: e.entrada.descricao ?? '',
        origens: origensDaEntrada(e.entrada),
        obraPessoal: ehObraPessoal(e.entrada),
        ...datasDeFoto(e.entrada),
    };
}

function datasDeFoto(entrada) {
    const { inicio, fim } = datasDaEntrada(entrada);
    return { dataObra: inicio, dataObraAte: fim };
}

function vazio(erro, extra = {}) {
    return {
        erro,
        ...extra,
        alteracoes: [],
        textos: 0,
        entradas: 0,
        jaIguais: 0,
        juntaCom: 0,
        descricoesSobrescritas: 0,
        origensSobrescritas: 0,
        datasSobrescritas: 0,
        marcasMudadas: 0,
        caracterizacoesPerdidas: 0,
        tiposMudados: 0,
    };
}

function conjunto(alvos) {
    return new Set((Array.isArray(alvos) ? alvos : []).filter((a) => typeof a === 'string' && a));
}

// Quantas entradas já têm a identidade do resultado sem fazer parte dos alvos:
// é com elas que a correção vai se juntar (a obra "nova" já existia).
function contarJuntaCom(entrada, alvos, chaveFinal, extrairChave) {
    const textos = new Set();
    for (const e of entradasDosTextos(entrada)) {
        const chave = extrairChave(e);
        if (chave && chave === chaveFinal && !alvos.has(chave)) {
            textos.add(`${e.tipo}:${e.item.id}`);
        }
    }
    return textos.size;
}

export function planejarCorrecao(entrada = {}, pedido = {}) {
    const alvos = conjunto(pedido.alvos);
    if (!alvos.size) return vazio('sem-alvo');
    const novo = ehObjeto(pedido.novo) ? pedido.novo : {};

    if (pedido.tipo === 'obra') return planejarObra(entrada, alvos, novo);
    if (pedido.tipo === 'autor') return planejarAutor(entrada, alvos, novo);
    if (pedido.tipo === 'referencia') return planejarReferencia(entrada, alvos, novo);
    return vazio('tipo-invalido');
}

const CAMPO_INICIO = 'dataObra';
const CAMPO_FIM = 'dataObraAte';

// Uma ponta da data no pedido: `valor` é `undefined` (manter), `null` (tirar)
// ou a data completa; `erro` é o código de `criarDataObra` quando não vale.
function dataDoPedido(bruto) {
    if (bruto === undefined) return { valor: undefined };
    if (bruto === null) return { valor: null };
    const { data, erro } = criarDataObra(bruto);
    return erro ? { erro } : { valor: data };
}

// A ponta muda quando o valor muda, ou quando o pedido tira (`null`) uma data
// que a entrada guardava de um jeito que não se lê (a chave ainda existe).
// Pedido ausente (`undefined`) nunca muda nada.
function mudaData(entrada, chave, antes, pedido, depois) {
    if (pedido.valor === undefined) return false;
    const valorDepois = chave === CAMPO_INICIO ? depois.dataObra : depois.dataObraAte;
    if (chaveDaDataObra(antes) !== chaveDaDataObra(valorDepois)) return true;
    return pedido.valor === null && chave in entrada;
}

function planejarObra(entrada, alvos, novo) {
    const obra = texto(novo.obra);
    if (!obra) return vazio('nome-vazio');
    const autores = autoresDoPedido(novo);
    const autor = textoDosAutores(autores);
    const tipoObra = typeof novo.tipoObra === 'string' ? texto(novo.tipoObra) : undefined;
    const descricao = typeof novo.descricao === 'string' ? texto(novo.descricao) : undefined;
    const origens = Array.isArray(novo.origens) ? normalizarOrigens(novo.origens) : undefined;
    const dataInicio = dataDoPedido(novo.dataObra);
    const dataFim = dataDoPedido(novo.dataObraAte);
    const marca = typeof novo.obraPessoal === 'boolean' ? novo.obraPessoal : undefined;
    if (dataInicio.erro) return vazio('data-invalida', { erroData: dataInicio.erro });
    if (dataFim.erro) return vazio('data-invalida', { erroData: dataFim.erro });

    const alteracoes = [];
    let jaIguais = 0;
    for (const e of entradasDosTextos(entrada)) {
        if (!alvos.has(chaveDaObra(e.entrada, e.nome))) continue;
        const antes = fotoDaEntrada(e);
        const depois = {
            nome: obra,
            autores,
            autor,
            tipoObra: tipoObra === undefined ? antes.tipoObra : tipoObra,
            descricao: descricao === undefined ? antes.descricao : descricao,
            origens: origens === undefined ? antes.origens : origens,
            dataObra: dataInicio.valor === undefined ? antes.dataObra : dataInicio.valor,
            dataObraAte: dataFim.valor === undefined ? antes.dataObraAte : dataFim.valor,
            obraPessoal: marca === undefined ? antes.obraPessoal : marca,
        };
        // Só quando o pedido mexe na data: uma entrada antiga com as pontas
        // trocadas não trava uma correção que fala só do nome.
        if (
            (dataInicio.valor !== undefined || dataFim.valor !== undefined) &&
            validarIntervaloDaData(depois.dataObra, depois.dataObraAte)
        ) {
            return vazio('data-fim-antes-do-inicio');
        }
        const mudaInicio = mudaData(e.entrada, CAMPO_INICIO, antes.dataObra, dataInicio, depois);
        const mudaFim = mudaData(e.entrada, CAMPO_FIM, antes.dataObraAte, dataFim, depois);
        if (
            antes.nome === depois.nome &&
            mesmaListaDeAutores(antes.autores, depois.autores) &&
            antes.tipoObra === depois.tipoObra &&
            antes.descricao === depois.descricao &&
            mesmaListaDeOrigens(antes.origens, depois.origens) &&
            antes.obraPessoal === depois.obraPessoal &&
            !mudaInicio &&
            !mudaFim
        ) {
            jaIguais += 1;
            continue;
        }
        alteracoes.push({
            tipo: e.tipo,
            id: e.item.id,
            titulo: texto(e.item.titulo) || '(sem título)',
            campo: e.campo,
            nome: e.nome,
            entrada: e.entrada,
            tinhaDescricao: 'descricao' in e.entrada,
            formaDaOrigem: capturarOrigensDaEntrada(e.entrada),
            tinhaMarca: 'obraPessoal' in e.entrada,
            marcaBruta: e.entrada.obraPessoal,
            formaDoAutor: capturarAutoresDaEntrada(e.entrada),
            formaDasDatas: capturarDatasDaEntrada(e.entrada),
            mudaInicio,
            mudaFim,
            antes,
            depois,
        });
    }

    const chaveFinal = `${chaveDeNome(obra)}|${chaveDosAutores(autores)}`;
    return resumir(alteracoes, jaIguais, {
        juntaCom: contarJuntaCom(entrada, alvos, chaveFinal, (e) => chaveDaObra(e.entrada, e.nome)),
    });
}

// ─── Referências (referenciasExternas) ───────────────────────

// Os campos que só existem na Pessoa pública (ver caracterizacao-pessoa-publica.js
// e conhecido-como.js): saem da entrada quando o Tipo deixa de ser esse.
const CAMPOS_PESSOA_PUBLICA = ['conhecidoComo', 'genero', 'orientacao', 'corRaca'];

function temValor(valor) {
    if (Array.isArray(valor)) return valor.length > 0;
    return typeof valor === 'string' ? valor.trim() !== '' : valor != null;
}

function* referenciasDosTextos({ poemas = [], prosas = [] } = {}) {
    for (const [tipo, lista] of [
        ['poema', poemas],
        ['prosa', prosas],
    ]) {
        for (const item of lista || []) {
            if (!ehObjeto(item) || !Array.isArray(item.referenciasExternas)) continue;
            for (const entrada of item.referenciasExternas) {
                if (ehObjeto(entrada)) yield { tipo, item, entrada };
            }
        }
    }
}

// A chave de referência de uma entrada (a mesma de `montarReferencias`), ou ''
// se ela não tem texto.
export function chaveDaReferencia(entrada) {
    const chaveTexto = chaveDeNome(entrada.texto);
    return chaveTexto ? `${chaveDeNome(entrada.tipo)}|${chaveTexto}` : '';
}

// O que a entrada guarda hoje dos campos de Pessoa pública, para o Desfazer.
function capturarPessoaPublica(entrada) {
    const guardado = {};
    CAMPOS_PESSOA_PUBLICA.forEach((campo) => {
        if (campo in entrada) guardado[campo] = entrada[campo];
    });
    return guardado;
}

function planejarReferencia(entrada, alvos, novo) {
    const nome = texto(novo.texto);
    if (!nome) return vazio('referencia-vazia');
    const tipo = typeof novo.tipo === 'string' ? texto(novo.tipo) : undefined;
    const dataInicio = dataDoPedido(novo.dataObra);
    const dataFim = dataDoPedido(novo.dataObraAte);
    if (dataInicio.erro) return vazio('data-invalida', { erroData: dataInicio.erro });
    if (dataFim.erro) return vazio('data-invalida', { erroData: dataFim.erro });

    const alteracoes = [];
    let jaIguais = 0;
    for (const e of referenciasDosTextos(entrada)) {
        if (!alvos.has(chaveDaReferencia(e.entrada))) continue;
        const { inicio, fim } = datasDaEntrada(e.entrada);
        const antes = {
            nome: e.entrada.texto ?? '',
            tipoRef: e.entrada.tipo ?? '',
            dataObra: inicio,
            dataObraAte: fim,
        };
        const depois = {
            nome,
            tipoRef: tipo === undefined ? antes.tipoRef : tipo,
            dataObra: dataInicio.valor === undefined ? antes.dataObra : dataInicio.valor,
            dataObraAte: dataFim.valor === undefined ? antes.dataObraAte : dataFim.valor,
        };
        if (
            (dataInicio.valor !== undefined || dataFim.valor !== undefined) &&
            validarIntervaloDaData(depois.dataObra, depois.dataObraAte)
        ) {
            return vazio('data-fim-antes-do-inicio');
        }
        const mudaInicio = mudaData(e.entrada, CAMPO_INICIO, antes.dataObra, dataInicio, depois);
        const mudaFim = mudaData(e.entrada, CAMPO_FIM, antes.dataObraAte, dataFim, depois);
        if (
            antes.nome === depois.nome &&
            antes.tipoRef === depois.tipoRef &&
            !mudaInicio &&
            !mudaFim
        ) {
            jaIguais += 1;
            continue;
        }
        // Deixar de ser Pessoa pública apaga os campos dela, como no formulário.
        const guardado = capturarPessoaPublica(e.entrada);
        const perdeCaracterizacao =
            ehPessoaPublica(antes.tipoRef) &&
            !ehPessoaPublica(depois.tipoRef) &&
            CAMPOS_PESSOA_PUBLICA.some((campo) => temValor(guardado[campo]));
        alteracoes.push({
            tipo: e.tipo,
            id: e.item.id,
            titulo: texto(e.item.titulo) || '(sem título)',
            campo: 'referenciasExternas',
            referencia: true,
            entrada: e.entrada,
            formaDasDatas: capturarDatasDaEntrada(e.entrada),
            pessoaPublicaGuardada: guardado,
            perdeCaracterizacao,
            mudaInicio,
            mudaFim,
            antes,
            depois,
        });
    }

    const textos = new Set(alteracoes.map((a) => `${a.tipo}:${a.id}`));
    // Com que já existia: as chaves finais das entradas mudadas (o tipo de cada
    // uma, se o pedido não troca o tipo) que também aparecem em entradas fora
    // dos alvos.
    const chavesFinais = new Set(
        alteracoes.map((a) => `${chaveDeNome(a.depois.tipoRef)}|${chaveDeNome(nome)}`),
    );
    const juntam = new Set();
    for (const e of referenciasDosTextos(entrada)) {
        const chave = chaveDaReferencia(e.entrada);
        if (chave && chavesFinais.has(chave) && !alvos.has(chave)) {
            juntam.add(`${e.tipo}:${e.item.id}`);
        }
    }
    return {
        ...vazio(''),
        alteracoes,
        textos: textos.size,
        entradas: alteracoes.length,
        jaIguais,
        juntaCom: juntam.size,
        datasSobrescritas: alteracoes.filter(
            (a) => (a.mudaInicio && a.antes.dataObra) || (a.mudaFim && a.antes.dataObraAte),
        ).length,
        tiposMudados: alteracoes.filter((a) => a.antes.tipoRef !== a.depois.tipoRef).length,
        caracterizacoesPerdidas: alteracoes.filter((a) => a.perdeCaracterizacao).length,
    };
}

function planejarAutor(entrada, alvos, novo) {
    const autor = texto(novo.autor);
    if (!autor) return vazio('autor-vazio');
    // Origem: ausente mantém a de cada entrada; uma lista troca em todas as
    // entradas do autor; lista vazia tira (como no pedido de obra).
    const origens = Array.isArray(novo.origens) ? normalizarOrigens(novo.origens) : undefined;

    const alteracoes = [];
    let jaIguais = 0;
    for (const e of entradasDosTextos(entrada)) {
        const chaves = chavesDosAutores(autoresDaEntrada(e.entrada));
        if (!chaves.some((chave) => alvos.has(chave))) continue;
        const antes = fotoDaEntrada(e);
        const autores = substituirAutorNaLista(antes.autores, alvos, autor);
        const origensDepois = origens === undefined ? antes.origens : origens;
        if (
            mesmaListaDeAutores(antes.autores, autores) &&
            mesmaListaDeOrigens(antes.origens, origensDepois)
        ) {
            jaIguais += 1;
            continue;
        }
        alteracoes.push({
            tipo: e.tipo,
            id: e.item.id,
            titulo: texto(e.item.titulo) || '(sem título)',
            campo: e.campo,
            nome: e.nome,
            entrada: e.entrada,
            tinhaDescricao: 'descricao' in e.entrada,
            formaDoAutor: capturarAutoresDaEntrada(e.entrada),
            formaDaOrigem: capturarOrigensDaEntrada(e.entrada),
            antes,
            depois: { ...antes, autores, autor: textoDosAutores(autores), origens: origensDepois },
        });
    }

    // Com quem a correção se junta: textos que já tinham o autor final em
    // alguma entrada sem nenhum dos autores corrigidos.
    const chaveFinal = chaveDeAutor(autor);
    const juntaCom = new Set();
    for (const e of entradasDosTextos(entrada)) {
        const chaves = chavesDosAutores(autoresDaEntrada(e.entrada));
        if (
            !alvos.has(chaveFinal) &&
            chaves.includes(chaveFinal) &&
            !chaves.some((c) => alvos.has(c))
        ) {
            juntaCom.add(`${e.tipo}:${e.item.id}`);
        }
    }
    return resumir(alteracoes, jaIguais, { juntaCom: juntaCom.size });
}

function resumir(alteracoes, jaIguais, { juntaCom }) {
    const textos = new Set(alteracoes.map((a) => `${a.tipo}:${a.id}`));
    return {
        erro: '',
        alteracoes,
        textos: textos.size,
        entradas: alteracoes.length,
        jaIguais,
        juntaCom,
        descricoesSobrescritas: alteracoes.filter(
            (a) => a.antes.descricao && a.antes.descricao !== a.depois.descricao,
        ).length,
        origensSobrescritas: alteracoes.filter(
            (a) =>
                a.antes.origens.length > 0 &&
                !mesmaListaDeOrigens(a.antes.origens, a.depois.origens),
        ).length,
        marcasMudadas: alteracoes.filter((a) => a.antes.obraPessoal !== a.depois.obraPessoal)
            .length,
        datasSobrescritas: alteracoes.filter(
            (a) => (a.mudaInicio && a.antes.dataObra) || (a.mudaFim && a.antes.dataObraAte),
        ).length,
    };
}

// Grava uma correção de referência: texto, tipo e datas (só a ponta que muda).
// Deixar de ser Pessoa pública apaga os campos dela.
function aplicarReferencia(a) {
    a.entrada.texto = a.depois.nome;
    if (a.antes.tipoRef !== a.depois.tipoRef) a.entrada.tipo = a.depois.tipoRef;
    if (a.perdeCaracterizacao) {
        CAMPOS_PESSOA_PUBLICA.forEach((campo) => delete a.entrada[campo]);
    }
    definirDatasDaEntrada(a.entrada, {
        inicio: a.mudaInicio ? a.depois.dataObra : undefined,
        fim: a.mudaFim ? a.depois.dataObraAte : undefined,
    });
}

function desfazerReferencia(a) {
    a.entrada.texto = a.antes.nome;
    a.entrada.tipo = a.antes.tipoRef;
    if (a.perdeCaracterizacao) Object.assign(a.entrada, a.pessoaPublicaGuardada);
    if (a.formaDasDatas && (a.mudaInicio || a.mudaFim)) {
        restaurarDatasDaEntrada(a.entrada, a.formaDasDatas);
    }
}

// Grava o plano nas entradas e devolve `{ textos, entradas, desfazer }`.
// `desfazer()` devolve cada campo ao valor de antes; só mexe nos campos que o
// plano mudou. Plano com erro ou vazio não grava nada.
export function aplicarPlano(plano) {
    const alteracoes = plano && !plano.erro ? plano.alteracoes : [];
    alteracoes.forEach((a) => {
        if (a.referencia) {
            aplicarReferencia(a);
            return;
        }
        a.entrada[a.nome] = a.depois.nome;
        definirAutoresDaEntrada(a.entrada, a.depois.autores);
        a.entrada.tipoObra = a.depois.tipoObra;
        // A descrição só é tocada quando a correção a muda: entrada sem o
        // campo continua sem ele nas correções que não falam de descrição.
        if (a.antes.descricao !== a.depois.descricao) a.entrada.descricao = a.depois.descricao;
        // A origem só é tocada quando a correção a muda; lista vazia tira a
        // chave (ela só existe preenchida).
        if (!mesmaListaDeOrigens(a.antes.origens, a.depois.origens)) {
            definirOrigensDaEntrada(a.entrada, a.depois.origens);
        }
        // A marca só é tocada quando a correção a muda; desmarcada, a chave
        // sai da entrada (só existe quando marcada).
        if (a.antes.obraPessoal !== a.depois.obraPessoal) {
            if (a.depois.obraPessoal) a.entrada.obraPessoal = true;
            else delete a.entrada.obraPessoal;
        }
        // A data só é tocada na ponta que a correção muda.
        definirDatasDaEntrada(a.entrada, {
            inicio: a.mudaInicio ? a.depois.dataObra : undefined,
            fim: a.mudaFim ? a.depois.dataObraAte : undefined,
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
                if (a.referencia) {
                    desfazerReferencia(a);
                    return;
                }
                a.entrada[a.nome] = a.antes.nome;
                restaurarAutoresDaEntrada(a.entrada, a.formaDoAutor);
                a.entrada.tipoObra = a.antes.tipoObra;
                if (a.antes.descricao !== a.depois.descricao) {
                    if (a.tinhaDescricao) a.entrada.descricao = a.antes.descricao;
                    else delete a.entrada.descricao;
                }
                if (a.formaDaOrigem && !mesmaListaDeOrigens(a.antes.origens, a.depois.origens)) {
                    restaurarOrigensDaEntrada(a.entrada, a.formaDaOrigem);
                }
                if (a.antes.obraPessoal !== a.depois.obraPessoal) {
                    if (a.tinhaMarca) a.entrada.obraPessoal = a.marcaBruta;
                    else delete a.entrada.obraPessoal;
                }
                if (a.formaDasDatas && (a.mudaInicio || a.mudaFim)) {
                    restaurarDatasDaEntrada(a.entrada, a.formaDasDatas);
                }
            });
        },
    };
}

function rotuloIdentidade(nome, autor) {
    return `«${nome}» (${autor || 'sem autor'})`;
}

function rotuloReferencia(nome, tipoRef) {
    return `«${nome}» (${tipoRef || 'sem tipo'})`;
}

// Frases curtas "antes → depois", sem repetir o mesmo par, para a confirmação.
// `restantes` é quantos pares ficaram de fora do limite.
export function descreverPlano(plano, { maxExemplos = 3 } = {}) {
    const pares = new Map();
    (plano?.alteracoes || []).forEach((a) => {
        const antes = a.referencia
            ? rotuloReferencia(a.antes.nome, a.antes.tipoRef)
            : rotuloIdentidade(a.antes.nome, a.antes.autor);
        const depois = a.referencia
            ? rotuloReferencia(a.depois.nome, a.depois.tipoRef)
            : rotuloIdentidade(a.depois.nome, a.depois.autor);
        let marca = '';
        if (a.antes.obraPessoal !== a.depois.obraPessoal) {
            marca = a.depois.obraPessoal
                ? ' (passa a ser obra pessoal)'
                : ' (deixa de ser obra pessoal)';
        }
        // Correção só de origem: o nome e o autor não mudam, então a frase diria
        // "A → A"; o novo valor da origem entra na frase.
        if (!mesmaListaDeOrigens(a.antes.origens || [], a.depois.origens || [])) {
            const nova = textoDasOrigens(a.depois.origens || []);
            marca += nova ? ` (origem: ${nova})` : ' (sem origem)';
        }
        pares.set(`${antes}→${depois}${marca}`, `${antes} → ${depois}${marca}`);
    });
    const todas = [...pares.values()];
    return {
        linhas: todas.slice(0, maxExemplos),
        restantes: Math.max(0, todas.length - maxExemplos),
    };
}

export const MENSAGENS_ERRO_CORRECAO = {
    'sem-alvo': 'Nada foi escolhido para corrigir.',
    'tipo-invalido': 'Pedido de correção desconhecido.',
    'nome-vazio': 'Escreva o nome da obra.',
    'autor-vazio': 'Escreva o nome do autor.',
    'referencia-vazia': 'Escreva o nome da referência.',
    'data-invalida': 'A data da obra não é válida.',
    'data-fim-antes-do-inicio': 'A data final vem antes da inicial.',
};
