// sorteio.js: a lógica do sorteio de texto para leitura (31/10/2026).
//
// Parte pura (sem DOM e sem localStorage; a tela e a lembrança dos recentes
// moram na entrega seguinte). Recebe o `db` e os critérios e devolve um texto.
//
// Quem pode ser sorteado: o texto com a marca `sorteavel` (a porta de entrada,
// ver sorteavel.js), que não esteja Descartado nem Privado, que tenha corpo e
// que se leia sozinho (Leitura autônoma, ver leitura-autonoma.js). A marca
// sozinha não basta para esses dois status: marcar um texto e depois
// descartá-lo não o deixa vazar. Um texto marcado como "Só em sequência" ou "Só
// em conjunto" fica de fora, e a tela avisa quando isso é o que esvazia o
// sorteio. "Só como início" entra, para apresentar o começo de algo, com a
// marca "só o começo" junto ao tipo.
//
// Critérios, combinados por E (todos opcionais):
//   - `universalId`: só textos com algum Tema desse Tema universal (qualquer
//     papel do Tema no texto);
//   - `favoritosAutor`: só textos que o autor avaliou com `minCoracoes` ou mais
//     (padrão 4). Autoclassificação 0 ("não avaliado") nunca conta;
//   - `extensao`: só textos da faixa de extensão escolhida (breve, curto,
//     medio, longo ou extenso; ver FAIXAS_EXTENSAO). Poema se mede em versos e
//     prosa em palavras, então "curto" é curto para o tipo do texto;
//   - `incluirSensiveis`: com `false`, os textos com Conteúdo sensível preenchido
//     ficam de fora. Qualquer outro valor (inclusive ausente) os deixa entrar,
//     com o aviso antes do texto, que é o comportamento de sempre;
//   - `valencias`: lista de pesos do texto: as faixas de valência (`leve`,
//     `neutro`, `pesado`; ver valencia-texto.js) e `sem`, o texto sem valência
//     (nenhum Tema classificado e sem ajuste). Vazia ou ausente não filtra. Com
//     um ou mais, só entram os textos cujo peso (o ajuste do autor ou a
//     derivada dos temas) está na lista, então o texto sem valência só sai
//     quando `sem` é um dos escolhidos;
//   - `reconhecidos`: com `true`, só textos com algum reconhecimento cadastrado
//     (prêmio ou menção, ver `ehReconhecido`). Qualquer outro valor não filtra;
//   - `favoritosPublico`: reservado para depois; hoje é ignorado;
//   - `ignorarLeitura`: uso interno da tela (contar os textos barrados só pela
//     Leitura autônoma); o sorteio de verdade nunca o liga.
// Sem nenhum critério o sorteio é aberto entre todos os elegíveis.
//
// Elo de tradução: o texto e a sua tradução (ou as suas traduções) são versões
// da mesma obra e contam como UM texto só, para a obra não ter duas chances. A
// regra vale depois dos critérios, entre as versões que passaram por eles, e
// por isso também nas contagens. Na hora de mostrar, o sorteio escolhe ao acaso
// uma dessas versões, e a tela oferece o link para as outras (ver
// `versoesDeTraducaoDoSorteio`).

import {
    autoclassificacaoValida,
    chaveTema,
    idiomasDoItem,
    limparTexto,
    tokenizar,
} from './utils.js';
import { ehSorteavel } from './sorteavel.js';
import {
    FAIXAS_VALENCIA_TEXTO,
    ROTULO_SEM_VALENCIA,
    faixaDeValencia,
    rotuloValenciaTexto,
} from './valencia-texto.js';
import { ehSoComoInicio, impedeSorteio } from './leitura-autonoma.js';
import { gruposDeTraducao, versoesPorTraducao } from './elo-traducao.js';

export const PISO_FAVORITO_AUTOR = 4;
// O texto sem valência como quarta opção do peso (a faixa vazia de
// `faixaDeValencia`, que não tem chave própria porque é ausência de valência).
export const PESO_SEM_VALENCIA = 'sem';
export const PESOS_SORTEIO = Object.freeze([...FAIXAS_VALENCIA_TEXTO, PESO_SEM_VALENCIA]);
export const RECENTES_MAXIMO = 10;
const STATUS_FORA = new Set(['descartado', 'privado']);

// Extensão (31/10/2026). Régua fixa, igual para todo acervo: o texto não muda
// de faixa quando se acrescentam outros, e "Breve" quer dizer a mesma coisa para
// todo mundo. Poema se mede em versos (linhas não vazias, quebras de estrofe
// não contam) e prosa em palavras (a mesma regra do `tokenizar`, que as
// Estatísticas e o .csv usam). `poemaAte` e `prosaAte` são o último valor da
// faixa; `null` é "sem teto". Âncoras: o corte de 4 versos é a quadra e o de 14
// é o soneto (teoria da versificação); 40 e 100 versos são convenção editorial
// de revistas (a própria literatura discute onde começa o poema longo); na
// prosa, 300 e 1.000 palavras são microficção e flash fiction, e 7.500 e
// 17.500 são os cortes do prêmio Nebula para conto, novelette e novela.
export const FAIXAS_EXTENSAO = Object.freeze([
    {
        id: 'breve',
        rotulo: 'Breve',
        poemaAte: 4,
        prosaAte: 300,
        ancora: 'quadra; microficção',
    },
    {
        id: 'curto',
        rotulo: 'Curto',
        poemaAte: 14,
        prosaAte: 1000,
        ancora: 'soneto; flash fiction',
    },
    {
        id: 'medio',
        rotulo: 'Médio',
        poemaAte: 40,
        prosaAte: 7500,
        ancora: 'página de revista; conto',
    },
    {
        id: 'longo',
        rotulo: 'Longo',
        poemaAte: 100,
        prosaAte: 17500,
        ancora: 'limite usual de submissão; novelette',
    },
    {
        id: 'extenso',
        rotulo: 'Extenso',
        poemaAte: null,
        prosaAte: null,
        ancora: 'poema longo; novela',
    },
]);

export const NOTA_CONVENCAO_EXTENSAO =
    'Os cortes de poema acima de 14 versos são convenção editorial de revistas, não regra da teoria literária.';

export function faixaDeExtensaoPorId(id) {
    return FAIXAS_EXTENSAO.find((f) => f.id === id) || null;
}

// Versos de um texto: linhas que sobram com algum conteúdo depois de tirar as
// marcas de formatação (o texto guardado pode ter tags e entidades HTML).
export function contarVersos(texto) {
    return String(texto ?? '')
        .split('\n')
        .filter((linha) => limparTexto(linha).trim() !== '').length;
}

export function contarPalavras(texto) {
    return tokenizar(texto).length;
}

// A medida do texto na régua do tipo dele: `{ valor, unidade }`.
export function medidaDoTexto(tipo, item) {
    return tipo === 'prosa'
        ? { valor: contarPalavras(item?.texto), unidade: 'palavras' }
        : { valor: contarVersos(item?.texto), unidade: 'versos' };
}

// A faixa de uma medida, para um tipo.
export function faixaDaMedida(tipo, valor) {
    const campo = tipo === 'prosa' ? 'prosaAte' : 'poemaAte';
    const faixa = FAIXAS_EXTENSAO.find((f) => f[campo] === null || valor <= f[campo]);
    return faixa.id;
}

// A faixa (id) de um texto. Contar palavras de uma prosa longa custa, e a tela
// pergunta muitas vezes pelo mesmo texto, então o resultado fica guardado por
// objeto, e só vale enquanto o corpo for o mesmo.
const memoFaixas = new WeakMap();
export function faixaDoTexto(tipo, item) {
    const texto = item?.texto;
    const guardado = memoFaixas.get(item);
    if (guardado && guardado.tipo === tipo && guardado.texto === texto) return guardado.faixa;
    const faixa = faixaDaMedida(tipo, medidaDoTexto(tipo, item).valor);
    if (item && typeof item === 'object') memoFaixas.set(item, { tipo, texto, faixa });
    return faixa;
}

// Ritmo para estimar o tempo de leitura da prosa. É suposição (leitura corrida
// em português), não medida: a estimativa serve para decidir se começa a ler.
export const PALAVRAS_POR_MINUTO = 200;

// O rótulo de extensão que a tela mostra junto ao tipo, antes do texto: poema
// em versos ("14 versos"), prosa em tempo estimado ("cerca de 3 min"), sempre
// arredondado para cima e com piso de 1 min. Poema não ganha minutos: verso se
// lê com pausa e releitura, e o número enganaria. Não revela nada do conteúdo.
export function rotuloDeExtensao(tipo, item) {
    const { valor } = medidaDoTexto(tipo, item);
    if (tipo === 'prosa') {
        const minutos = Math.max(1, Math.ceil(valor / PALAVRAS_POR_MINUTO));
        return `cerca de ${minutos} min`;
    }
    return valor === 1 ? '1 verso' : `${valor} versos`;
}

// A linha que a tela mostra junto ao tipo e à extensão: `Poema · 3 versos`, e,
// quando o texto está com o status Incompleto, `Poema · 3 versos · em construção`.
// O aviso vem antes da leitura, para quem lê saber que o texto ainda está sendo
// feito. O Incompleto entra no sorteio de propósito: a mesma ferramenta serve de
// vitrine e de círculo de leitura para pedir opinião, e a marca "Pode ser
// sorteado" é quem decide se ele sai.
export const ROTULO_EM_CONSTRUCAO = 'em construção';

export function textoEmConstrucao(item) {
    return item?.status === 'incompleto';
}

// Marca do texto "Só como início": avisa o leitor, antes de ler, que é só o
// começo de algo maior.
export const ROTULO_SO_COMECO = 'só o começo';

export function linhaDoTipo(tipo, item) {
    const partes = [tipo === 'prosa' ? 'Prosa' : 'Poema', rotuloDeExtensao(tipo, item)];
    if (textoEmConstrucao(item)) partes.push(ROTULO_EM_CONSTRUCAO);
    if (ehSoComoInicio(item)) partes.push(ROTULO_SO_COMECO);
    return partes.join(' · ');
}

const formatarNumero = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Os limites de uma faixa, em texto, para a legenda: `{ poema, prosa }`, por
// exemplo "5 a 14 versos" e "301 a 1.000 palavras".
export function limitesDaFaixa(id) {
    const i = FAIXAS_EXTENSAO.findIndex((f) => f.id === id);
    if (i < 0) return null;
    const faixa = FAIXAS_EXTENSAO[i];
    const anterior = FAIXAS_EXTENSAO[i - 1];
    const montar = (campo, unidade) => {
        if (i === 0) return `até ${formatarNumero(faixa[campo])} ${unidade}`;
        if (faixa[campo] === null) return `mais de ${formatarNumero(anterior[campo])} ${unidade}`;
        return `${formatarNumero(anterior[campo] + 1)} a ${formatarNumero(faixa[campo])} ${unidade}`;
    };
    return { poema: montar('poemaAte', 'versos'), prosa: montar('prosaAte', 'palavras') };
}

// A legenda que a tela mostra sob o seletor, com os limites e as âncoras.
export function legendaDaFaixa(id) {
    const faixa = faixaDeExtensaoPorId(id);
    const limites = limitesDaFaixa(id);
    if (!faixa || !limites) return '';
    return `${faixa.rotulo}: ${limites.poema} (poema) ou ${limites.prosa} (prosa). Âncoras: ${faixa.ancora}.`;
}

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// Chave estável de um texto para a lista de recentes: "poema:12".
export function chaveDoTexto(tipo, item) {
    return `${tipo}:${item?.id}`;
}

// O texto está marcado, tem status que pode sair e tem corpo: tudo o que o
// sorteio exige, menos a Leitura autônoma.
function textoMarcadoEApto(item) {
    if (!ehSorteavel(item)) return false;
    if (STATUS_FORA.has(item.status)) return false;
    return String(item.texto ?? '').trim() !== '';
}

// O texto pode entrar no sorteio, antes de qualquer critério. Com
// `ignorarLeitura`, a Leitura autônoma não conta (serve para a tela saber
// quantos textos ficam de fora só por ela).
export function textoElegivel(item, { ignorarLeitura = false } = {}) {
    if (!textoMarcadoEApto(item)) return false;
    return ignorarLeitura || !impedeSorteio(item);
}

// Todos os elegíveis, poemas e depois prosas: `[{ tipo, item }]`.
export function textosElegiveis(dbRef, opcoes = {}) {
    const saida = [];
    (dbRef.poemas || []).forEach((item) => {
        if (textoElegivel(item, opcoes)) saida.push({ tipo: 'poema', item });
    });
    (dbRef.prosas || []).forEach((item) => {
        if (textoElegivel(item, opcoes)) saida.push({ tipo: 'prosa', item });
    });
    return saida;
}

// Quantos textos passariam pelos critérios, mas ficam de fora porque não se
// leem sozinhos. Só olha os que a Leitura autônoma barra (os que passariam sem
// ela e não passam com ela).
export function contarForaPorLeitura(dbRef, criterios = {}) {
    const com = elegiveisPorCriterios(dbRef, criterios).length;
    const sem = elegiveisPorCriterios(dbRef, { ...criterios, ignorarLeitura: true }).length;
    return sem - com;
}

// A frase do aviso, para a tela. Vazia quando nenhum texto ficou de fora.
export function avisoForaPorLeitura(n) {
    const total = Math.max(0, Math.floor(Number(n) || 0));
    if (total === 0) return '';
    return total === 1
        ? '1 texto marcado como "Pode ser sorteado" fica de fora porque não se lê sozinho (Leitura autônoma).'
        : `${total} textos marcados como "Pode ser sorteado" ficam de fora porque não se leem sozinhos (Leitura autônoma).`;
}

// Quantos textos passariam pelos critérios, mas ficam de fora porque têm
// Conteúdo sensível e quem lê escolheu não recebê-los. Zero quando a escolha é
// receber (não há o que contar).
export function contarForaPorSensivel(dbRef, criterios = {}) {
    if (criterios.incluirSensiveis !== false) return 0;
    const com = elegiveisPorCriterios(dbRef, { ...criterios, incluirSensiveis: true }).length;
    const sem = elegiveisPorCriterios(dbRef, criterios).length;
    return com - sem;
}

// A frase do aviso, para a tela. Vazia quando nenhum texto ficou de fora.
export function avisoForaPorSensivel(n) {
    const total = Math.max(0, Math.floor(Number(n) || 0));
    if (total === 0) return '';
    return total === 1
        ? '1 texto com conteúdo sensível ficou de fora por sua escolha.'
        : `${total} textos com conteúdo sensível ficaram de fora por sua escolha.`;
}

// O texto é reconhecido: tem ao menos um reconhecimento (`reconhecimentos`) com
// o nome do prêmio ou a posição preenchidos ("1º lugar", "Menção honrosa").
// Prêmio e menção moram no mesmo campo; entrada vazia, só com ano ou nota, não
// conta.
export function ehReconhecido(item) {
    return (
        Array.isArray(item?.reconhecimentos) &&
        item.reconhecimentos.some(
            (r) => String(r?.premio ?? '').trim() !== '' || String(r?.posicao ?? '').trim() !== '',
        )
    );
}

// Quantos textos passariam pelos outros critérios, mas ficam de fora porque não
// têm prêmio nem menção cadastrados. Só olha com o critério ligado (desligado,
// não há o que contar).
export function contarForaPorReconhecimento(dbRef, criterios = {}) {
    if (criterios.reconhecidos !== true) return 0;
    const com = elegiveisPorCriterios(dbRef, { ...criterios, reconhecidos: false }).length;
    const sem = elegiveisPorCriterios(dbRef, criterios).length;
    return com - sem;
}

// A frase do aviso, para a tela. Vazia quando nenhum texto ficou de fora.
export function avisoForaPorReconhecimento(n) {
    const total = Math.max(0, Math.floor(Number(n) || 0));
    if (total === 0) return '';
    return total === 1
        ? '1 texto sem prêmio nem menção cadastrados ficou de fora por sua escolha.'
        : `${total} textos sem prêmio nem menção cadastrados ficaram de fora por sua escolha.`;
}

// O texto é favorito do autor: autoclassificação válida e no piso ou acima.
export function ehFavoritoDoAutor(item, minCoracoes = PISO_FAVORITO_AUTOR) {
    return (
        autoclassificacaoValida(item?.autoclassificacao) &&
        Number(item.autoclassificacao) >= minCoracoes
    );
}

function temaIdsDoUniversal(dbRef, universalId) {
    const u = (dbRef.temasUniversais || []).find((x) => mesmoId(x.id, universalId));
    return u ? new Set((u.temaIds || []).map(String)) : null;
}

function textoTemUmDosTemas(item, ids) {
    return (Array.isArray(item?.temas) ? item.temas : []).some((e) => ids.has(String(e?.temaId)));
}

// Os pesos pedidos, só os que existem (valor estranho é ignorado). Aceita lista
// ou conjunto; qualquer outra coisa vale "nenhum".
function faixasValidas(valencias) {
    const lista = Array.isArray(valencias) || valencias instanceof Set ? [...valencias] : [];
    return new Set(lista.filter((f) => PESOS_SORTEIO.includes(f)));
}

// O peso do texto para o sorteio: a faixa de valência, ou `sem` quando não tem.
export function pesoDoTexto(item, temasCadastro) {
    return faixaDeValencia(item, temasCadastro) || PESO_SEM_VALENCIA;
}

export function rotuloPeso(peso) {
    return peso === PESO_SEM_VALENCIA ? ROTULO_SEM_VALENCIA : rotuloValenciaTexto(peso);
}

// O texto tem Conteúdo sensível preenchido (a mesma regra do aviso antes da
// leitura: texto livre, vazio ou só espaços não conta).
export function ehSensivel(item) {
    return String(item?.conteudoSensivel ?? '').trim() !== '';
}

// Elegíveis que passam pelos critérios. Universal que não existe devolve lista
// vazia (nunca cai para o sorteio aberto sem avisar).
export function elegiveisPorCriterios(dbRef, criterios = {}) {
    const { universalId = null, favoritosAutor = false, extensao = null } = criterios;
    const min = Number(criterios.minCoracoes) || PISO_FAVORITO_AUTOR;
    let lista = textosElegiveis(dbRef, { ignorarLeitura: criterios.ignorarLeitura === true });
    if (criterios.incluirSensiveis === false) lista = lista.filter(({ item }) => !ehSensivel(item));
    if (criterios.reconhecidos === true) lista = lista.filter(({ item }) => ehReconhecido(item));
    const faixas = faixasValidas(criterios.valencias);
    if (faixas.size) {
        lista = lista.filter(({ item }) => faixas.has(pesoDoTexto(item, dbRef.temas)));
    }
    if (universalId != null && universalId !== '') {
        const ids = temaIdsDoUniversal(dbRef, universalId);
        if (!ids) return [];
        lista = lista.filter(({ item }) => textoTemUmDosTemas(item, ids));
    }
    if (favoritosAutor) lista = lista.filter(({ item }) => ehFavoritoDoAutor(item, min));
    // A extensão vai por último: medir um texto custa mais que os outros filtros.
    // Faixa que não existe devolve lista vazia, como o universal inexistente.
    if (extensao != null && extensao !== '') {
        if (!faixaDeExtensaoPorId(extensao)) return [];
        lista = lista.filter(({ tipo, item }) => faixaDoTexto(tipo, item) === extensao);
    }
    return juntarVersoesDeTraducao(dbRef, lista);
}

// O idioma do texto casa com o preferido? 2 = idioma Principal, 1 = só
// Secundário, 0 = não casa. Compara sem diferenciar caixa nem acento.
function afinidadeDeIdioma(item, idiomaPreferido) {
    const alvo = chaveTema(idiomaPreferido);
    if (!alvo) return 0;
    let melhor = 0;
    idiomasDoItem(item).forEach((e) => {
        if (chaveTema(e.idioma) !== alvo) return;
        melhor = Math.max(melhor, e.papel === 'principal' ? 2 : 1);
    });
    return melhor;
}

// Entre as versões de uma obra, as que o idioma preferido favorece: as de maior
// afinidade (Principal antes de Secundário). Sem preferência, ou sem nenhuma
// versão no idioma, devolve todas (o sorteio volta a escolher ao acaso).
export function versoesNoIdiomaPreferido(versoes, idiomaPreferido) {
    if (!String(idiomaPreferido ?? '').trim() || versoes.length < 2) return versoes;
    const pontos = versoes.map((v) => afinidadeDeIdioma(v.item, idiomaPreferido));
    const maximo = Math.max(...pontos);
    return maximo === 0 ? versoes : versoes.filter((_v, i) => pontos[i] === maximo);
}

// Os idiomas que a tela pode oferecer como preferência: os Principais dos
// textos que poderiam ser sorteados e têm outra versão que também poderia
// (Elo de tradução). Sem grupo, devolve `[]` e a tela esconde o campo. Sem
// repetir (caixa e acento não contam), na grafia do primeiro, em ordem
// alfabética.
export function idiomasDasVersoes(dbRef) {
    const grupos = gruposDeTraducao(dbRef);
    if (!grupos.size) return [];
    const elegiveis = new Map(
        textosElegiveis(dbRef).map(({ tipo, item }) => [chaveDoTexto(tipo, item), item]),
    );
    const achados = new Map();
    const vistos = new Set();
    grupos.forEach((grupo) => {
        if (vistos.has(grupo)) return;
        vistos.add(grupo);
        const itens = grupo.map((c) => elegiveis.get(c)).filter(Boolean);
        if (itens.length < 2) return;
        itens.forEach((item) =>
            idiomasDoItem(item).forEach((e) => {
                if (e.papel !== 'principal') return;
                const chave = chaveTema(e.idioma);
                if (!achados.has(chave)) achados.set(chave, e.idioma);
            }),
        );
    });
    return [...achados.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Uma entrada por obra: as versões ligadas por Elo de tradução que estão na
// lista viram uma entrada só, a da primeira delas (ordem de poemas e depois
// prosas), com as outras em `versoes: [{ tipo, item }]`. Texto sem Elo de
// tradução passa intacto, sem a chave `versoes`.
function juntarVersoesDeTraducao(dbRef, lista) {
    const grupos = gruposDeTraducao(dbRef);
    if (!grupos.size) return lista;
    const porGrupo = new Map();
    const saida = [];
    lista.forEach((entrada) => {
        const grupo = grupos.get(chaveDoTexto(entrada.tipo, entrada.item));
        if (!grupo) {
            saida.push(entrada);
            return;
        }
        const existente = porGrupo.get(grupo);
        if (existente) {
            existente.versoes.push({ tipo: entrada.tipo, item: entrada.item });
            return;
        }
        const nova = { ...entrada, versoes: [] };
        porGrupo.set(grupo, nova);
        saida.push(nova);
    });
    return saida;
}

// As outras versões do texto (Elo de tradução) que a página pode oferecer como
// link: só as que poderiam ser sorteadas (marcadas, com status que pode sair,
// com corpo, que se leiam sozinhas) e, com `incluirSensiveis: false`, sem
// Conteúdo sensível. `[{ tipo, item, rotulo }]`; `rotulo` é "Tradução de" ou
// "Traduzido para", visto do texto dado. Texto sem tradução devolve `[]`.
export function versoesDeTraducaoDoSorteio(dbRef, tipo, item, criterios = {}) {
    return versoesPorTraducao(dbRef, tipo, item, (_tipoOutro, outro) => {
        if (!textoElegivel(outro)) return false;
        return !(criterios.incluirSensiveis === false && ehSensivel(outro));
    });
}

// Quantos textos cada universal tem hoje, com ou sem o critério de favoritos:
// `[{ id, nome, total }]`, na ordem do cadastro. A tela esconde ou esmaece
// quem tem `total` 0.
export function contarPorUniversal(dbRef, criterios = {}) {
    return (dbRef.temasUniversais || []).map((u) => ({
        id: u.id,
        nome: u.nome,
        total: elegiveisPorCriterios(dbRef, { ...criterios, universalId: u.id }).length,
    }));
}

// Quantos textos cada peso tem hoje, com os outros critérios (Tema universal,
// favoritos, extensão e conteúdo sensível) valendo: `[{ id, rotulo, total }]`,
// do mais leve ao mais pesado e, por último, o sem valência. O critério
// `valencias` que vier em `criterios` é ignorado: a contagem de cada peso é a
// que ele teria se fosse o escolhido.
export function contarPorValencia(dbRef, criterios = {}) {
    const base = elegiveisPorCriterios(dbRef, { ...criterios, valencias: [] });
    const total = new Map(PESOS_SORTEIO.map((f) => [f, 0]));
    base.forEach(({ item }) => {
        const f = pesoDoTexto(item, dbRef.temas);
        total.set(f, total.get(f) + 1);
    });
    return PESOS_SORTEIO.map((id) => ({ id, rotulo: rotuloPeso(id), total: total.get(id) }));
}

// Quantos textos cada faixa de extensão tem hoje, com os outros critérios
// (Tema universal e favoritos) valendo: `[{ id, rotulo, total }]`, da menor para
// a maior faixa. O critério `extensao` que vier em `criterios` é ignorado: a
// contagem de cada faixa é a que ela teria se fosse a escolhida.
export function contarPorExtensao(dbRef, criterios = {}) {
    const base = elegiveisPorCriterios(dbRef, { ...criterios, extensao: null });
    const total = new Map(FAIXAS_EXTENSAO.map((f) => [f.id, 0]));
    base.forEach(({ tipo, item }) => {
        const id = faixaDoTexto(tipo, item);
        total.set(id, total.get(id) + 1);
    });
    return FAIXAS_EXTENSAO.map((f) => ({ id: f.id, rotulo: f.rotulo, total: total.get(f.id) }));
}

// O aviso que o texto traz, para mostrar ANTES de ler: `[{ rotulo, texto }]`,
// vazio quando o texto não tem. Só o conteúdo sensível entra. O vocabulário
// hiperacionante fica de fora de propósito: ele serve à IA e cita o trecho do
// texto onde o vocabulário aparece, o que entregaria o texto antes da leitura.
export function avisosDoTexto(item) {
    return ehSensivel(item)
        ? [{ rotulo: 'Conteúdo sensível', texto: String(item.conteudoSensivel).trim() }]
        : [];
}

// Acrescenta `chave` ao fim da lista de recentes (sem repetir, no máximo
// `maximo`), devolvendo uma lista nova.
export function registrarRecente(recentes, chave, maximo = RECENTES_MAXIMO) {
    const sem = (Array.isArray(recentes) ? recentes : []).filter((c) => c !== chave);
    return [...sem, chave].slice(-maximo);
}

// Histórico do sorteio: os textos das chaves de `recentes` ("poema:12"), do mais
// novo para o mais velho, como `[{ chave, tipo, item }]`. Chave de um texto que
// não existe mais no acervo (apagado) é ignorada.
export function historicoDosRecentes(dbRef, recentes) {
    const saida = [];
    const lista = Array.isArray(recentes) ? recentes : [];
    for (let i = lista.length - 1; i >= 0; i--) {
        const chave = lista[i];
        const [tipo, ...resto] = String(chave).split(':');
        const tabela = tipo === 'poema' ? dbRef?.poemas : tipo === 'prosa' ? dbRef?.prosas : null;
        const id = resto.join(':');
        const item = (tabela || []).find((t) => mesmoId(t?.id, id));
        if (item) saida.push({ chave, tipo, item });
    }
    return saida;
}

// Quantos dos últimos sorteados o sorteio evita, em função de quantos textos
// há para escolher: metade do conjunto (arredondada para baixo), no máximo
// `maximo` (10). Assim a regra nunca esvazia o sorteio: com 6 elegíveis evita
// os 3 últimos, com 1 não evita nenhum, com 40 evita os 10 últimos.
export function recentesAEvitar(totalElegiveis, maximo = RECENTES_MAXIMO) {
    const total = Math.max(0, Math.floor(Number(totalElegiveis) || 0));
    return Math.min(maximo, Math.floor(total / 2));
}

// Sorteia um texto. `recentes` é a lista de chaves já sorteadas, da mais
// antiga para a mais nova (como `registrarRecente` a mantém); o sorteio evita
// só as últimas `recentesAEvitar(total)`. `aleatorio` devolve um número em
// [0, 1) (injetável nos testes). `idiomaPreferido` (nome do idioma, opcional)
// não filtra nada: só decide qual versão de uma obra com Elo de tradução
// aparece (a de idioma Principal igual; depois a de Secundário; sem nenhuma, ao
// acaso).
//
// Devolve:
//   { ok: true, tipo, item, chave, total, evitados }: `evitados` é quantos
//     recentes foram evitados nesta rodada;
//   { ok: false, motivo: 'vazio' }, com `foraPorLeitura: n` só quando `n` > 0:
//     quantos textos passariam pelos critérios se se lessem sozinhos; e
//     `foraPorReconhecimento: n`, só quando `n` > 0: quantos passariam sem o
//     critério de reconhecidos; `foraPorSensivel: n`, também só quando `n` > 0: quantos passariam se quem
//     lê aceitasse conteúdo sensível;
//   { ok: false, motivo: 'sem-favoritos', semFavoritos: n }: com
//     `favoritosAutor`, nenhum texto passou mas há `n` elegíveis sem esse
//     critério (a tela oferece sortear entre eles).
export function sortearTexto(
    dbRef,
    criterios = {},
    { recentes = [], aleatorio = Math.random, idiomaPreferido = '' } = {},
) {
    const lista = elegiveisPorCriterios(dbRef, criterios);
    if (!lista.length) {
        if (criterios.favoritosAutor) {
            const sem = elegiveisPorCriterios(dbRef, { ...criterios, favoritosAutor: false });
            if (sem.length) return { ok: false, motivo: 'sem-favoritos', semFavoritos: sem.length };
        }
        const resultado = { ok: false, motivo: 'vazio' };
        const fora = contarForaPorLeitura(dbRef, criterios);
        if (fora > 0) resultado.foraPorLeitura = fora;
        const sensiveis = contarForaPorSensivel(dbRef, criterios);
        if (sensiveis > 0) resultado.foraPorSensivel = sensiveis;
        const semReconhecimento = contarForaPorReconhecimento(dbRef, criterios);
        if (semReconhecimento > 0) resultado.foraPorReconhecimento = semReconhecimento;
        return resultado;
    }
    const quantos = recentesAEvitar(lista.length);
    const ultimos = quantos > 0 && Array.isArray(recentes) ? recentes.slice(-quantos) : [];
    const evitar = new Set(ultimos);
    // Uma obra com versões é evitada se qualquer uma delas foi sorteada há pouco.
    const versoesDaEntrada = (entrada) => [
        { tipo: entrada.tipo, item: entrada.item },
        ...(entrada.versoes || []),
    ];
    const base = lista.filter((entrada) =>
        versoesDaEntrada(entrada).every((v) => !evitar.has(chaveDoTexto(v.tipo, v.item))),
    );
    const indice = Math.min(base.length - 1, Math.floor(aleatorio() * base.length));
    // Com versões, qual delas aparece também é sorteado (só então se gasta uma
    // segunda chamada do aleatório, para o sorteio sem tradução não mudar).
    // Com idioma de preferência, só concorrem as versões nesse idioma (se houver).
    const versoes = versoesNoIdiomaPreferido(versoesDaEntrada(base[indice]), idiomaPreferido);
    const { tipo, item } =
        versoes.length > 1
            ? versoes[Math.min(versoes.length - 1, Math.floor(aleatorio() * versoes.length))]
            : versoes[0];
    return {
        ok: true,
        tipo,
        item,
        chave: chaveDoTexto(tipo, item),
        total: lista.length,
        evitados: lista.length - base.length,
    };
}
