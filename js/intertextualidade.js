// ============================================================
// intertextualidade.js: lógica pura (sem DOM e sem db.js) do redesenho
// de Intertextualidade e Hipertextualidade.
//
// Teste que separa os dois campos: "se eu tirar a obra de origem, o
// poema ainda existe como é?". Sim, perde só uma camada: Intertextualidade.
// Não, ele é derivado dela: Hipertextualidade.
//
// Formato novo da entrada de Intertextualidade (por item, em `intertextualidade`):
//   relacao      natureza do diálogo: Citação, Menção, Alusão, Paráfrase,
//                Bricolagem (sugestões; texto livre). Vazio quer dizer
//                "nunca definido", como a Grafia.
//   tipoObra     o que é a obra (Livro, Música, Filme...). Era `tipo`.
//   obra         título da obra. Era `texto`.
//   autor        texto livre, com autocompletar.
//   personagens  lista de tags de texto livre, com autocompletar (antes um
//                `personagem` em texto, migrado para uma tag só).
//   descricao    o aposto que explica que obra é.
//   trecho       as palavras do original.
//   traduzido    check (boolean): o poema traz o trecho traduzido do
//                idioma da fonte. Vale para qualquer relação.
//   link, linkTexto, dataAcesso e nota: iguais, sem mudança.
//
// Hipertextualidade (`hipertextualidade`): `tipo` vira `tipoObra` e entram
// `autor` e `descricao`. `relacao` e `hipotexto` ficam como estão. Usar
// `relacao` nos dois campos dá o mesmo significado (a natureza da relação),
// só com listas de sugestão diferentes.
//
// Nas entradas antigas de Intertextualidade, `tipo` vira `tipoObra` e `texto`
// vira `obra`, copiados como estão, sem tentar separar o conteúdo (não dá
// para adivinhar o que é título, autor ou citação). `relacao` fica vazia.
// Referências (`referenciasExternas`) não entram: continuam com `tipo`/`texto`.
//
// As migrações rodam no carregamento do db e no `importarDB` (db.js). Pacotes
// da Biblioteca seguem no formato antigo e são convertidos na importação.
// ============================================================

import { TIPOS_INTERTEXTO_SUGERIDOS } from './utils.js';
import { autoresDaEntrada, chavesDosAutores, migrarAutoresDaEntrada } from './autores-da-obra.js';
import { agruparDatasDaObra, datasDaEntrada } from './data-da-obra.js';
import { migrarPersonagensDaEntrada, personagensDaEntrada } from './personagens-da-obra.js';
import { chaveDeOrigem, migrarOrigensDaEntrada, origensDaEntrada } from './origem-da-obra.js';

export const RELACOES_INTERTEXTUALIDADE_SUGERIDAS = [
    'Citação',
    'Menção',
    'Alusão',
    'Paráfrase',
    'Bricolagem',
];

// Mesmo papel de TIPOS_INTERTEXTO_SUGERIDOS: o tipo de obra sugerido é o
// mesmo nos dois campos (livro, música, série...). Reexportado com o nome
// novo para as telas da entrega 2 não dependerem do nome antigo.
export const TIPOS_OBRA_SUGERIDOS = TIPOS_INTERTEXTO_SUGERIDOS;

function ehObjeto(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

// ─── Obra pessoal ────────────────────────────────────────────

// `obraPessoal` (check, Intertextualidade e Hipertextualidade): a obra faz parte
// da vida particular de quem escreve (um diário, uma carta, uma conversa) e não
// é uma obra reconhecida publicamente. A chave só existe quando marcada: ausente
// vale "não marcada", e entrada antiga abre sem ela (sem migração).
export function ehObraPessoal(entrada) {
    return ehObjeto(entrada) && entrada.obraPessoal === true;
}

// Algum texto (Poema ou Prosa) tem entrada marcada como obra pessoal, em
// Intertextualidade ou Hipertextualidade? Alimenta a busca `obrapessoal:`.
export function itemTemObraPessoal(item) {
    return ['intertextualidade', 'hipertextualidade'].some(
        (lista) => Array.isArray(item?.[lista]) && item[lista].some(ehObraPessoal),
    );
}

// A parte da entrada que o formulário grava: `{ obraPessoal: true }` ou `{}`.
export function campoObraPessoal(marcada) {
    return marcada === true ? { obraPessoal: true } : {};
}

// ─── Migração ────────────────────────────────────────────────

// Devolve a entrada no formato novo. Idempotente: entrada que já tem os
// campos novos passa igual, só ganhando o que faltar. O que não é objeto
// volta como veio (a migração não decide o que fazer com lixo).
export function migrarEntradaIntertextualidade(entrada) {
    if (!ehObjeto(entrada)) return entrada;
    const { tipo, texto, ...resto } = entrada;
    const nova = {
        relacao: '',
        tipoObra: '',
        obra: '',
        descricao: '',
        trecho: '',
        traduzido: false,
        ...resto,
    };
    if (!nova.tipoObra && typeof tipo === 'string') nova.tipoObra = tipo;
    if (!nova.obra && typeof texto === 'string') nova.obra = texto;
    if (typeof nova.traduzido !== 'boolean') nova.traduzido = false;
    // `autor` (texto) vira `autores` (lista, uma tag por autor atual).
    migrarAutoresDaEntrada(nova);
    // `personagem` (texto) vira `personagens` (lista, uma tag só).
    migrarPersonagensDaEntrada(nova);
    // `origemObra` (lista de lugares) só é limpa se já existir; não é criada.
    migrarOrigensDaEntrada(nova);
    return nova;
}

export function migrarEntradaHipertextualidade(entrada) {
    if (!ehObjeto(entrada)) return entrada;
    const { tipo, ...resto } = entrada;
    const nova = {
        relacao: '',
        hipotexto: '',
        tipoObra: '',
        descricao: '',
        ...resto,
    };
    if (!nova.tipoObra && typeof tipo === 'string') nova.tipoObra = tipo;
    migrarAutoresDaEntrada(nova);
    migrarOrigensDaEntrada(nova);
    return nova;
}

function migrarCampoDosItens(itens, campo, migrarEntrada) {
    let alterados = 0;
    (itens || []).forEach((item) => {
        if (!item || !Array.isArray(item[campo])) return;
        const antes = JSON.stringify(item[campo]);
        item[campo] = item[campo].map(migrarEntrada);
        if (JSON.stringify(item[campo]) !== antes) alterados += 1;
    });
    return alterados;
}

// Migra, no lugar, a lista de cada item (Poema ou Prosa). Item cujo campo
// não é lista (o formato de objeto único é tratado pela migração antiga do
// db.js) fica como está. Devolve quantos itens mudaram.
export function migrarIntertextualidadeDosItens(itens) {
    return migrarCampoDosItens(itens, 'intertextualidade', migrarEntradaIntertextualidade);
}

export function migrarHipertextualidadeDosItens(itens) {
    return migrarCampoDosItens(itens, 'hipertextualidade', migrarEntradaHipertextualidade);
}

// Atalho para o db.js e para a importação: os dois campos de uma vez.
export function migrarTranstextualidadeDosItens(itens) {
    return {
        intertextualidade: migrarIntertextualidadeDosItens(itens),
        hipertextualidade: migrarHipertextualidadeDosItens(itens),
    };
}

// ─── Sugestões e autocompletar ───────────────────────────────

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function ordenarComOutroPorUltimo(valores) {
    const outros = valores.filter((v) => v !== 'Outro');
    outros.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return valores.includes('Outro') ? [...outros, 'Outro'] : outros;
}

function ordenar(valores) {
    return Array.from(valores).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function entradasDe(itens, campo) {
    const todas = [];
    (itens || []).forEach((item) => {
        if (item && Array.isArray(item[campo])) {
            item[campo].forEach((e) => {
                if (ehObjeto(e)) todas.push(e);
            });
        }
    });
    return todas;
}

// A entrada tem todos os autores pedidos? Compara pela chave (sem acento,
// caixa nem pontuação), em qualquer ordem. Sem autor pedido, vale tudo. `autor`
// (um nome) continua aceito e soma-se a `autores` (lista).
function entradaTemOsAutores(entrada, autores, autor) {
    const pedidos = chavesDosAutores([...(Array.isArray(autores) ? autores : []), autor]);
    if (!pedidos.length) return true;
    const tem = new Set(chavesDosAutores(autoresDaEntrada(entrada)));
    return pedidos.every((chave) => tem.has(chave));
}

// Relação da Intertextualidade: as 5 sugestões mais o que já foi digitado.
export function extrairRelacoesIntertextualidadeUnicas(itens) {
    const valores = new Set(RELACOES_INTERTEXTUALIDADE_SUGERIDAS);
    entradasDe(itens, 'intertextualidade').forEach((e) => {
        if (texto(e.relacao)) valores.add(texto(e.relacao));
    });
    return ordenarComOutroPorUltimo(Array.from(valores));
}

// Relação da Hipertextualidade: já existe em utils.js (as 8 sugestões mais o
// que foi digitado). Reexportada aqui para a entrega 2 importar tudo deste módulo.
export { extrairRelacoesHipertextualidadeUnicas } from './utils.js';

// Tipo de obra, nos dois campos: sugestões fixas mais o que já foi digitado
// em Intertextualidade ou em Hipertextualidade.
export function extrairTiposObraUnicos(itens) {
    const valores = new Set(TIPOS_OBRA_SUGERIDOS);
    ['intertextualidade', 'hipertextualidade'].forEach((campo) => {
        entradasDe(itens, campo).forEach((e) => {
            if (texto(e.tipoObra)) valores.add(texto(e.tipoObra));
        });
    });
    return ordenarComOutroPorUltimo(Array.from(valores));
}

// Obra já digitada em Intertextualidade. `tipoObra` opcional restringe às
// obras do mesmo tipo (sugestão mais focada, como no autocompletar antigo);
// `autores` (lista) ou `autor` (um nome) opcional restringe às obras que têm
// todos esses autores.
export function extrairObrasUnicas(itens, { tipoObra = null, autor = null, autores = null } = {}) {
    const valores = new Set();
    entradasDe(itens, 'intertextualidade').forEach((e) => {
        if (!texto(e.obra)) return;
        if (tipoObra && texto(e.tipoObra) !== tipoObra) return;
        if (!entradaTemOsAutores(e, autores, autor)) return;
        valores.add(texto(e.obra));
    });
    return ordenar(valores);
}

// Autor já digitado em Intertextualidade ou em Hipertextualidade (o autor
// de uma obra citada e o de um hipotexto são do mesmo universo). `tipoObra`
// e `obra` opcionais restringem; `obra` só olha a Intertextualidade, porque
// na Hipertextualidade a obra se chama `hipotexto`.
export function extrairAutoresUnicos(itens, { tipoObra = null, obra = null } = {}) {
    const valores = new Set();
    entradasDe(itens, 'intertextualidade').forEach((e) => {
        if (tipoObra && texto(e.tipoObra) !== tipoObra) return;
        if (obra && texto(e.obra) !== obra) return;
        autoresDaEntrada(e).forEach((nome) => valores.add(nome));
    });
    entradasDe(itens, 'hipertextualidade').forEach((e) => {
        if (tipoObra && texto(e.tipoObra) !== tipoObra) return;
        if (obra && texto(e.hipotexto) !== obra) return;
        autoresDaEntrada(e).forEach((nome) => valores.add(nome));
    });
    return ordenar(valores);
}

// Personagem já digitado em Intertextualidade. `obra` opcional restringe
// aos personagens daquela obra.
export function extrairPersonagensUnicos(itens, { obra = null } = {}) {
    const valores = new Set();
    entradasDe(itens, 'intertextualidade').forEach((e) => {
        if (obra && texto(e.obra) !== obra) return;
        personagensDaEntrada(e).forEach((nome) => valores.add(nome));
    });
    return ordenar(valores);
}

// Origem (lugar ou cultura da obra) já digitada em Intertextualidade e
// Hipertextualidade. `obra` e `tipoObra` opcionais restringem às origens
// daquela obra (na Hipertextualidade a obra se chama `hipotexto`).
export function extrairOrigensUnicas(itens, { tipoObra = null, obra = null } = {}) {
    const valores = new Map();
    const somar = (e) => {
        origensDaEntrada(e).forEach((nome) => {
            const chave = nome.toLocaleLowerCase('pt-BR');
            if (!valores.has(chave)) valores.set(chave, nome);
        });
    };
    entradasDe(itens, 'intertextualidade').forEach((e) => {
        if (tipoObra && texto(e.tipoObra) !== tipoObra) return;
        if (obra && texto(e.obra) !== obra) return;
        somar(e);
    });
    entradasDe(itens, 'hipertextualidade').forEach((e) => {
        if (tipoObra && texto(e.tipoObra) !== tipoObra) return;
        if (obra && texto(e.hipotexto) !== obra) return;
        somar(e);
    });
    return ordenar(valores.values());
}

// Hipotexto (obra de origem) já digitado em Hipertextualidade, no formato
// novo. Mesmo filtro opcional por tipo de obra e por autor.
export function extrairHipotextosDoFormatoNovo(
    itens,
    { tipoObra = null, autor = null, autores = null } = {},
) {
    const valores = new Set();
    entradasDe(itens, 'hipertextualidade').forEach((e) => {
        if (!texto(e.hipotexto)) return;
        if (tipoObra && texto(e.tipoObra) !== tipoObra) return;
        if (!entradaTemOsAutores(e, autores, autor)) return;
        valores.add(texto(e.hipotexto));
    });
    return ordenar(valores);
}

// ─── Descrição compartilhada pela mesma obra ─────────────────
//
// A descrição (o aposto que explica que obra é) é da obra, não da relação do
// poema com ela. Duas entradas com o mesmo tipo de obra, a mesma obra e o
// mesmo autor devem poder repetir a descrição. Vale entre Intertextualidade
// (`obra`) e Hipertextualidade (`hipotexto`), que descrevem o mesmo universo.
// Só sugere e preenche: cada entrada continua guardando a sua própria.

function mesmo(a, b) {
    return texto(a).toLocaleLowerCase('pt-BR') === texto(b).toLocaleLowerCase('pt-BR');
}

// As entradas (de Intertextualidade e de Hipertextualidade) que falam da mesma
// obra, pelo critério da Descrição: nome igual (sem caixa), e tipo de obra e
// autores só restringem quando preenchidos. `obra` vazia não casa com nada. É
// o critério único da Descrição e da Data da obra.
function entradasDaMesmaObra(itens, { tipoObra = '', obra = '', autor = '', autores = null } = {}) {
    if (!texto(obra)) return [];
    const achadas = [];
    const ler = (e, nomeObra) => {
        if (!mesmo(nomeObra, obra)) return;
        if (texto(tipoObra) && !mesmo(e.tipoObra, tipoObra)) return;
        if (!entradaTemOsAutores(e, autores, autor)) return;
        achadas.push(e);
    };
    entradasDe(itens, 'intertextualidade').forEach((e) => ler(e, e.obra));
    entradasDe(itens, 'hipertextualidade').forEach((e) => ler(e, e.hipotexto));
    return achadas;
}

// Descrições já usadas para a obra, sem repetir, em ordem alfabética.
// `tipoObra` e `autor` só restringem quando preenchidos; `obra` vazia não
// sugere nada (sem obra não há de que falar).
export function extrairDescricoesDaObra(itens, criterio = {}) {
    const valores = new Set();
    entradasDaMesmaObra(itens, criterio).forEach((e) => {
        if (texto(e.descricao)) valores.add(texto(e.descricao));
    });
    return ordenar(valores);
}

// A descrição a preencher sozinha: só quando existe exatamente uma para a
// obra. Com duas ou mais, fica a escolha do usuário (vão como sugestão).
export function descricaoUnicaDaObra(itens, criterio) {
    const todas = extrairDescricoesDaObra(itens, criterio);
    return todas.length === 1 ? todas[0] : '';
}

// ─── Origem compartilhada pela mesma obra ────────────────────
//
// A origem (lugar ou cultura) é da obra, como a descrição: o mesmo critério,
// cada entrada guarda a sua. Entrada sem origem não conta.

// As listas de origem já usadas para a obra, sem repetir (a ordem das tags e
// a grafia não contam): cada item é uma lista, da mais usada à menos.
export function extrairOrigensDaObra(itens, criterio = {}) {
    const grupos = new Map();
    entradasDaMesmaObra(itens, criterio).forEach((e) => {
        const lista = origensDaEntrada(e);
        if (!lista.length) return;
        const chave = lista.map(chaveDeOrigem).sort().join('|');
        const grupo = grupos.get(chave);
        if (grupo) grupo.usos += 1;
        else grupos.set(chave, { lista, usos: 1 });
    });
    return [...grupos.values()].sort((a, b) => b.usos - a.usos).map((g) => g.lista);
}

// A origem a preencher sozinha: só quando existe exatamente uma lista para a
// obra. Com duas ou mais (ou nenhuma), `[]`.
export function origemUnicaDaObra(itens, criterio) {
    const todas = extrairOrigensDaObra(itens, criterio);
    return todas.length === 1 ? todas[0] : [];
}

// ─── Data da obra compartilhada pela mesma obra ──────────────
//
// Mesmo critério da Descrição (a data é da obra, não da relação do poema com
// ela): o mesmo nome, e tipo de obra e autores só restringem quando
// preenchidos. Cada entrada guarda a sua própria data (`dataObra` e
// `dataObraAte`, ver data-da-obra.js); o app só sugere e, havendo uma só, a
// tela a preenche quando o campo estiver vazio.

// As datas já usadas para a obra: pares `{ inicio, fim, texto, usos }`, do
// mais usado ao menos usado (no empate, o mais antigo). Entrada sem data não
// entra.
export function extrairDatasDaObra(itens, criterio = {}) {
    return agruparDatasDaObra(entradasDaMesmaObra(itens, criterio).map(datasDaEntrada));
}

// A data a preencher sozinha: `{ inicio, fim }` só quando existe exatamente
// um par para a obra; com dois ou mais (ou nenhum), `null`.
export function dataUnicaDaObra(itens, criterio) {
    const todas = extrairDatasDaObra(itens, criterio);
    return todas.length === 1 ? { inicio: todas[0].inicio, fim: todas[0].fim } : null;
}

// ─── Data da Referência (Marco histórico, Notícia, Pessoa pública) ──

// A Referência não tem autor nem obra: a identidade é o tipo mais o texto
// (sem caixa). `tipo` só restringe quando preenchido; `texto` vazio não
// sugere nada. Vale para o nascimento e o óbito de uma Pessoa pública e para o
// início e o fim de um Marco histórico.
function entradasDaMesmaReferencia(itens, { tipo = '', texto: nome = '' } = {}) {
    if (!texto(nome)) return [];
    return entradasDe(itens, 'referenciasExternas').filter(
        (e) => mesmo(e.texto, nome) && (!texto(tipo) || mesmo(e.tipo, tipo)),
    );
}

export function extrairDatasDaReferencia(itens, criterio = {}) {
    return agruparDatasDaObra(entradasDaMesmaReferencia(itens, criterio).map(datasDaEntrada));
}

export function dataUnicaDaReferencia(itens, criterio) {
    const todas = extrairDatasDaReferencia(itens, criterio);
    return todas.length === 1 ? { inicio: todas[0].inicio, fim: todas[0].fim } : null;
}
