// sortear-pagina.js: a tela de leitura do sorteio de texto (31/10/2026).
//
// Monta a interface dentro de `raiz` (sortear.html só chama `montarSortear`).
// É uma tela só de leitura: nunca grava no acervo. A lógica de quem pode cair
// e como se escolhe mora em sorteio.js; aqui moram só os controles, a
// mensagem de cada caso, a ficha e a exibição do texto.
//
// O acervo vem do mesmo `localStorage` do app principal (chave
// `arquivoPoetico_v3`), lido uma vez ao abrir a página.

import {
    NOTA_CONVENCAO_EXTENSAO,
    PISO_FAVORITO_AUTOR,
    RECENTES_MAXIMO,
    avisosDoTexto,
    contarPorExtensao,
    contarPorUniversal,
    avisoForaPorLeitura,
    avisoForaPorSensivel,
    avisoForaPorReconhecimento,
    contarForaPorReconhecimento,
    contarPorValencia,
    PESOS_SORTEIO,
    rotuloPeso,
    contarForaPorLeitura,
    contarForaPorSensivel,
    elegiveisPorCriterios,
    legendaDaFaixa,
    linhaDoTipo,
    registrarRecente,
    historicoDosRecentes,
    sortearTexto,
    chaveDoTexto,
    versoesDeTraducaoDoSorteio,
    idiomasDasVersoes,
} from './sorteio.js';
import { fichaDoTexto } from './ficha-do-texto.js';
import { blocosPublicosDoTexto } from './comentarios-publicos.js';
import { blocosParatextoDoTexto } from './paratexto-publico.js';
import { chavesDeAutoresSigilosos } from './autoria-publica.js';
import { idiomasDoItem, realcarEnfaseMarkdown, sanitizarTextoRico } from './utils.js';

export const CHAVE_ACERVO = 'arquivoPoetico_v3';

// Lê o acervo do navegador. Devolve `null` se não houver ou se não for um JSON
// de objeto (a página mostra o aviso de acervo ausente).
export function lerAcervoDoNavegador(armazenamento = globalThis.localStorage) {
    try {
        const bruto = armazenamento.getItem(CHAVE_ACERVO);
        if (!bruto) return null;
        const dado = JSON.parse(bruto);
        return dado && typeof dado === 'object' && !Array.isArray(dado) ? dado : null;
    } catch {
        return null;
    }
}

// Os últimos textos sorteados ficam guardados neste navegador, para o sorteio
// seguir evitando repetição depois de fechar e reabrir a página. É só uma lista
// de chaves ("poema:12"), nunca o texto. Guardar é opcional: se o navegador
// recusar (modo privado, armazenamento cheio), o sorteio segue só na memória.
export const CHAVE_RECENTES = 'arquivoPoetico_sorteioRecentes';

// Quantos textos o "Anterior" e o "Próximo" alcançam na sessão (só na memória).
export const PERCURSO_MAXIMO = 50;

// Lê a lista de recentes. Devolve `[]` para ausente, inválido ou de outro
// formato; descarta o que não for texto e mantém só os últimos `RECENTES_MAXIMO`.
export function lerRecentes(armazenamento = globalThis.localStorage) {
    try {
        const bruto = armazenamento.getItem(CHAVE_RECENTES);
        if (!bruto) return [];
        const dado = JSON.parse(bruto);
        if (!Array.isArray(dado)) return [];
        return dado.filter((c) => typeof c === 'string' && c !== '').slice(-RECENTES_MAXIMO);
    } catch {
        return [];
    }
}

// Grava a lista de recentes. Falha em silêncio (devolve `false`).
export function gravarRecentes(recentes, armazenamento = globalThis.localStorage) {
    try {
        const lista = (Array.isArray(recentes) ? recentes : []).slice(-RECENTES_MAXIMO);
        armazenamento.setItem(CHAVE_RECENTES, JSON.stringify(lista));
        return true;
    } catch {
        return false;
    }
}

// Onde a ficha do texto aparece: "depois" do texto (padrão: o texto ganha
// destaque e a ficha o situa depois) ou "antes" (quem quer saber de cara de onde
// e de quem é). É uma preferência de exibição, guardada neste navegador. Valor
// ausente, estragado ou desconhecido vale "depois". Guardar é opcional: se o
// navegador recusar, a escolha vale só até fechar a página.
export const CHAVE_POSICAO_FICHA = 'arquivoPoetico_sorteioFicha';
export const POSICOES_FICHA = Object.freeze(['depois', 'antes']);

export function lerPosicaoDaFicha(armazenamento = globalThis.localStorage) {
    try {
        const valor = armazenamento.getItem(CHAVE_POSICAO_FICHA);
        return POSICOES_FICHA.includes(valor) ? valor : 'depois';
    } catch {
        return 'depois';
    }
}

export function gravarPosicaoDaFicha(posicao, armazenamento = globalThis.localStorage) {
    try {
        if (!POSICOES_FICHA.includes(posicao)) return false;
        armazenamento.setItem(CHAVE_POSICAO_FICHA, posicao);
        return true;
    } catch {
        return false;
    }
}

// Idioma de preferência: qual versão de uma obra com Elo de tradução aparece.
// Não é critério (não tira texto do sorteio) e fica guardado neste navegador.
// Vazio = sem preferência (o padrão). Valor ausente ou estragado vale vazio.
export const CHAVE_IDIOMA = 'arquivoPoetico_sorteioIdioma';

export function lerIdiomaPreferido(armazenamento = globalThis.localStorage) {
    try {
        const valor = armazenamento.getItem(CHAVE_IDIOMA);
        return typeof valor === 'string' ? valor.trim() : '';
    } catch {
        return '';
    }
}

export function gravarIdiomaPreferido(idioma, armazenamento = globalThis.localStorage) {
    try {
        armazenamento.setItem(CHAVE_IDIOMA, String(idioma ?? '').trim());
        return true;
    } catch {
        return false;
    }
}

// Conteúdo sensível: quem lê escolhe se quer receber textos com esse aviso. O
// padrão é receber (o aviso vem antes do texto, como sempre), e a escolha fica
// guardada neste navegador, para quem desligou não ter de desligar de novo a cada
// visita. Valor ausente, estragado ou desconhecido vale "incluir". Guardar é
// opcional: se o navegador recusar, a escolha vale só até fechar a página.
export const CHAVE_SENSIVEIS = 'arquivoPoetico_sorteioSensiveis';
export const ESCOLHAS_SENSIVEIS = Object.freeze(['incluir', 'excluir']);

export function lerEscolhaSensiveis(armazenamento = globalThis.localStorage) {
    try {
        const valor = armazenamento.getItem(CHAVE_SENSIVEIS);
        return ESCOLHAS_SENSIVEIS.includes(valor) ? valor : 'incluir';
    } catch {
        return 'incluir';
    }
}

export function gravarEscolhaSensiveis(escolha, armazenamento = globalThis.localStorage) {
    try {
        if (!ESCOLHAS_SENSIVEIS.includes(escolha)) return false;
        armazenamento.setItem(CHAVE_SENSIVEIS, escolha);
        return true;
    } catch {
        return false;
    }
}

// Texto longo é o que passa de tantas linhas: ele ganha "Voltar ao início" no
// rodapé e, com a ficha depois do texto, também "Ir para a ficha". Conta as
// quebras de linha do texto guardado.
export const LINHAS_TEXTO_LONGO = 25;

export function textoEhLongo(texto) {
    return String(texto ?? '').split('\n').length > LINHAS_TEXTO_LONGO;
}

function criar(tag, classe = '', texto = '') {
    const no = document.createElement(tag);
    if (classe) no.className = classe;
    if (texto) no.textContent = texto;
    return no;
}

const CLASSE_CARTAO =
    'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-4';
// Campo com as cores do tema: sem isso o select fica branco no tema escuro, com
// o texto claro por cima, e as opções somem.
const CLASSE_SELECT =
    'w-full text-sm py-2 px-2 mb-3 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100';
const CLASSE_OPCAO = 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100';
const CLASSE_SELECT_PEQUENO =
    'text-sm py-1 px-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100';

const CLASSE_BOTAO_PRIMARIO =
    'bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed';
const CLASSE_BOTAO_SECUNDARIO =
    'border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 transition text-sm font-medium';

// O corpo do texto, do mesmo jeito que o Ver mostra: o HTML guardado passa pela
// sanitização e o negrito, o itálico e o tachado em markdown são realçados. Cor,
// fundo, fonte, tamanho e alinhamento ficam como o autor escreveu, porque
// carregam sentido no texto. O container usa pre-wrap, como no Ver, porque cada
// verso é um \n de verdade.
export function montarCorpo(textoOriginal) {
    const corpo = criar('div', 'text-lg leading-relaxed font-serif whitespace-pre-wrap');
    corpo.innerHTML = realcarEnfaseMarkdown(sanitizarTextoRico(textoOriginal));
    return corpo;
}

// Aviso de Elo de tradução: o texto e a sua tradução contam como um texto só no
// sorteio, então quem lê fica sabendo que há outra versão e pode abri-la ali
// mesmo. `versoes` vem de `versoesDeTraducaoDoSorteio`; `aoAbrir(versao)` é
// chamado no clique. Sem versões, devolve `null`.
export function montarAvisoTraducao(versoes, aoAbrir) {
    if (!Array.isArray(versoes) || !versoes.length) return null;
    const caixa = criar(
        'div',
        'border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 rounded-md p-3 mb-4 text-sm',
    );
    caixa.id = 'sortear-traducao';
    caixa.setAttribute('aria-label', 'Outra versão deste texto');
    caixa.append(
        criar(
            'p',
            'font-medium mb-1',
            versoes.length === 1
                ? 'Este texto tem uma outra versão (Elo de tradução):'
                : 'Este texto tem outras versões (Elo de tradução):',
        ),
    );
    const lista = criar('ul', 'list-none p-0 m-0');
    versoes.forEach((versao) => {
        const li = criar('li', 'mb-1');
        li.append(document.createTextNode(`${versao.rotulo}: `));
        const idiomas = idiomasDoItem(versao.item)
            .filter((e) => e.papel === 'principal')
            .map((e) => e.idioma)
            .join(', ');
        const botao = criar(
            'button',
            'text-blue-600 dark:text-blue-400 underline text-left',
            versao.item.titulo || 'Sem título',
        );
        botao.type = 'button';
        botao.dataset.versao = chaveDoTexto(versao.tipo, versao.item);
        botao.addEventListener('click', () => aoAbrir(versao));
        li.append(
            botao,
            criar(
                'span',
                'text-xs text-gray-500 dark:text-slate-400',
                idiomas ? ` (${idiomas}; ler esta)` : ' (ler esta)',
            ),
        );
        lista.append(li);
    });
    caixa.append(lista);
    return caixa;
}

// A ficha do texto sorteado (Localização, Status, Primeira publicação, Autoria),
// com os mesmos rótulos e textos do Ver. Não revela nada do texto; quem decide
// se vem antes ou depois dele é `mostrarTexto`. Sem nenhuma linha, devolve `null`.
export function montarFicha(dbRef, tipo, item) {
    const linhas = fichaDoTexto(dbRef, tipo, item);
    if (!linhas.length) return null;
    const ficha = criar('dl', 'text-sm mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1');
    ficha.id = 'sortear-ficha';
    ficha.setAttribute('aria-label', 'Ficha do texto');
    linhas.forEach(({ rotulo, valor }) => {
        ficha.append(
            criar('dt', 'font-semibold text-gray-600 dark:text-slate-300', `${rotulo}:`),
            criar('dd', '', valor),
        );
    });
    return ficha;
}

// O que o autor deixou para quem lê: Comentários públicos e, quando marcadas
// como públicas, as Notas. Texto puro (textContent), com as quebras de linha do
// que foi escrito. Notas privadas nunca entram (ver comentarios-publicos.js).
// Sem nenhum bloco, devolve `null`.
export function montarBlocosPublicos(item) {
    const blocos = blocosPublicosDoTexto(item);
    if (!blocos.length) return null;
    const secao = criar('section', 'mt-6 space-y-4');
    secao.id = 'sortear-comentarios';
    secao.setAttribute('aria-label', 'Do autor');
    blocos.forEach(({ rotulo, texto }) => {
        const bloco = criar(
            'div',
            'border-l-4 border-blue-300 dark:border-blue-700 pl-3 text-sm leading-relaxed',
        );
        bloco.append(
            criar('p', 'font-semibold text-gray-600 dark:text-slate-300 mb-1', rotulo),
            criar('p', 'whitespace-pre-wrap', texto),
        );
        secao.append(bloco);
    });
    return secao;
}

// O paratexto do texto (Descrição Visual, Anotações Marginais, Anexos, Nota sobre
// os anexos, obras citadas e Reconhecimentos), logo depois do que o autor deixou
// para quem lê. Tudo com textContent, sem HTML; só link `http` ou `https` vira
// âncora (paratexto-publico.js já descarta o resto). Sem nenhum bloco, devolve
// `null`.
// `autoresCadastro` (db.autores) diz quais nomes civis ficam fora dos créditos
// (Autor sigiloso).
export function montarParatexto(item, autoresCadastro = []) {
    const blocos = blocosParatextoDoTexto(item, chavesDeAutoresSigilosos(autoresCadastro, item));
    if (!blocos.length) return null;
    const secao = criar('section', 'mt-6 space-y-4');
    secao.id = 'sortear-paratexto';
    secao.setAttribute('aria-label', 'Paratexto');
    blocos.forEach(({ rotulo, texto, itens }) => {
        const bloco = criar(
            'div',
            'border-l-4 border-gray-300 dark:border-slate-600 pl-3 text-sm leading-relaxed',
        );
        bloco.append(criar('p', 'font-semibold text-gray-600 dark:text-slate-300 mb-1', rotulo));
        if (itens) {
            const lista = criar('ul', 'list-disc list-inside space-y-1');
            itens.forEach((segmentos) => {
                const linha = criar('li', 'whitespace-pre-wrap');
                segmentos.forEach((s) => {
                    if (s.href) {
                        const a = criar(
                            'a',
                            'text-blue-600 dark:text-blue-400 underline break-all',
                        );
                        a.href = s.href;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.textContent = s.texto;
                        linha.append(a);
                    } else if (s.estilo) {
                        linha.append(criar(s.estilo === 'forte' ? 'strong' : 'em', '', s.texto));
                    } else {
                        linha.append(document.createTextNode(s.texto));
                    }
                });
                lista.append(linha);
            });
            bloco.append(lista);
        } else {
            bloco.append(criar('p', 'whitespace-pre-wrap', texto));
        }
        secao.append(bloco);
    });
    return secao;
}

// Monta a tela. `db` é o acervo já lido; `aleatorio` e `armazenamento` (onde os
// recentes ficam guardados) são injetáveis nos testes.
// Devolve `{ sortear, atualizar }` (usados nos testes).
export function montarSortear(
    raiz,
    { db, aleatorio = Math.random, armazenamento = globalThis.localStorage } = {},
) {
    raiz.textContent = '';
    let recentes = lerRecentes(armazenamento);

    // Controles
    const cartao = criar('section', CLASSE_CARTAO);
    cartao.setAttribute('aria-label', 'Critérios do sorteio');

    const rotuloUniversal = criar(
        'label',
        'block text-sm font-medium mb-1',
        'Sobre o que você quer ler?',
    );
    rotuloUniversal.htmlFor = 'sortear-universal';
    const selecao = criar('select', CLASSE_SELECT);
    selecao.id = 'sortear-universal';

    // Extensão: poema se mede em versos e prosa em palavras (ver sorteio.js), então
    // o mesmo nome serve aos dois tipos. A legenda embaixo diz os limites.
    const rotuloExtensao = criar('label', 'block text-sm font-medium mb-1', 'Extensão');
    rotuloExtensao.htmlFor = 'sortear-extensao';
    const selecaoExtensao = criar('select', CLASSE_SELECT);
    selecaoExtensao.id = 'sortear-extensao';
    const legendaExtensao = criar('p', 'text-xs text-gray-600 dark:text-slate-300 mb-3 hidden');
    legendaExtensao.id = 'sortear-extensao-legenda';
    legendaExtensao.setAttribute('aria-live', 'polite');

    const linhaFavoritos = criar('label', 'flex items-center gap-2 text-sm mb-3 cursor-pointer');
    const caixa = criar('input');
    caixa.type = 'checkbox';
    caixa.id = 'sortear-favoritos';
    linhaFavoritos.append(
        caixa,
        criar('span', '', `Só os meus preferidos (${PISO_FAVORITO_AUTOR} corações ou mais)`),
    );

    // Só os reconhecidos: textos com prêmio ou menção cadastrados. Prêmio e menção
    // moram no mesmo campo (Reconhecimentos) do texto.
    const linhaReconhecidos = criar('label', 'flex items-center gap-2 text-sm mb-3 cursor-pointer');
    const caixaReconhecidos = criar('input');
    caixaReconhecidos.type = 'checkbox';
    caixaReconhecidos.id = 'sortear-reconhecidos';
    linhaReconhecidos.append(
        caixaReconhecidos,
        criar('span', '', 'Só os reconhecidos (com prêmio ou menção)'),
    );

    // Peso do texto: um ou mais pesos (seleção múltipla): as três faixas de
    // valência e "Sem valência". Nenhum marcado é "qualquer peso" (o padrão);
    // marcando algum, só entram os textos com um desses pesos.
    const grupoPeso = criar('fieldset', 'mb-3');
    grupoPeso.id = 'sortear-peso';
    grupoPeso.append(criar('legend', 'block text-sm font-medium mb-1', 'Peso do texto'));
    const caixasPeso = new Map();
    const rotulosPeso = new Map();
    PESOS_SORTEIO.forEach((faixa) => {
        const linha = criar('label', 'flex items-center gap-2 text-sm mb-1 cursor-pointer');
        const c = criar('input');
        c.type = 'checkbox';
        c.id = `sortear-peso-${faixa}`;
        c.value = faixa;
        const rotulo = criar('span', '', rotuloPeso(faixa));
        linha.append(c, rotulo);
        grupoPeso.append(linha);
        caixasPeso.set(faixa, c);
        rotulosPeso.set(faixa, rotulo);
    });
    const dicaPeso = criar('p', 'text-xs text-gray-600 dark:text-slate-300 mt-1');
    dicaPeso.id = 'sortear-peso-dica';
    dicaPeso.textContent =
        'O peso vem dos temas do texto, ou do juízo do autor. "Sem valência" são os textos sem nenhum tema classificado e sem ajuste. Sem nenhuma marcada, vale qualquer peso.';
    grupoPeso.append(dicaPeso);

    const linhaSensiveis = criar('label', 'flex items-start gap-2 text-sm mb-3 cursor-pointer');
    const caixaSensiveis = criar('input', 'mt-1');
    caixaSensiveis.type = 'checkbox';
    caixaSensiveis.id = 'sortear-sensiveis';
    caixaSensiveis.checked = lerEscolhaSensiveis(armazenamento) === 'incluir';
    linhaSensiveis.append(
        caixaSensiveis,
        criar(
            'span',
            '',
            'Incluir textos com conteúdo sensível (um aviso aparece antes de cada um, e você decide se lê)',
        ),
    );

    const contagem = criar('p', 'text-sm text-gray-600 dark:text-slate-300 mb-3');
    contagem.id = 'sortear-contagem';
    contagem.setAttribute('aria-live', 'polite');

    const botao = criar('button', CLASSE_BOTAO_PRIMARIO, 'Sortear');
    botao.type = 'button';
    botao.id = 'sortear-botao';
    // Ao lado do Sortear ficam também o Anterior e o Próximo (o mesmo par do
    // rodapé do texto, com ids terminados em "-topo"), para voltar sem rolar até
    // o fim de um texto longo.
    const controlesTopo = criar('div', 'flex flex-wrap items-center gap-2');
    controlesTopo.id = 'sortear-controles-topo';
    const linhaSortear = criar('div', 'flex flex-wrap items-center gap-2');
    linhaSortear.append(botao, controlesTopo);

    // Exibição (não é critério do sorteio): onde a ficha aparece.
    const linhaPosicao = criar(
        'div',
        'flex items-center gap-2 text-sm mt-4 pt-3 border-t border-gray-200 dark:border-slate-700',
    );
    const rotuloPosicao = criar('label', '', 'Ficha do texto');
    rotuloPosicao.htmlFor = 'sortear-ficha-posicao';
    const seletorPosicao = criar('select', CLASSE_SELECT_PEQUENO);
    seletorPosicao.id = 'sortear-ficha-posicao';
    [
        ['depois', 'Depois do texto'],
        ['antes', 'Antes do texto'],
    ].forEach(([valor, rotulo]) => {
        const opcao = criar('option', CLASSE_OPCAO, rotulo);
        opcao.value = valor;
        seletorPosicao.append(opcao);
    });
    let posicaoFicha = lerPosicaoDaFicha(armazenamento);
    seletorPosicao.value = posicaoFicha;
    linhaPosicao.append(rotuloPosicao, seletorPosicao);

    // Idioma de preferência: só aparece quando o acervo tem alguma obra com Elo de
    // tradução que poderia ser sorteada. Guardado, mas a escolha que não existe
    // mais no acervo vale como "sem preferência" (sem apagar o que está guardado).
    const linhaIdioma = criar('div', 'flex flex-wrap items-center gap-2 text-sm mt-3');
    const rotuloIdioma = criar('label', '', 'Idioma de preferência (obras com tradução)');
    rotuloIdioma.htmlFor = 'sortear-idioma';
    const seletorIdioma = criar('select', CLASSE_SELECT_PEQUENO);
    seletorIdioma.id = 'sortear-idioma';
    const idiomasOferecidos = idiomasDasVersoes(db);
    const semPreferencia = criar('option', CLASSE_OPCAO, 'Sem preferência');
    semPreferencia.value = '';
    seletorIdioma.append(semPreferencia);
    idiomasOferecidos.forEach((nome) => {
        const opcao = criar('option', CLASSE_OPCAO, nome);
        opcao.value = nome;
        seletorIdioma.append(opcao);
    });
    seletorIdioma.value = idiomasOferecidos.includes(lerIdiomaPreferido(armazenamento))
        ? lerIdiomaPreferido(armazenamento)
        : '';
    linhaIdioma.append(rotuloIdioma, seletorIdioma);
    linhaIdioma.hidden = idiomasOferecidos.length === 0;

    cartao.append(
        rotuloUniversal,
        selecao,
        rotuloExtensao,
        selecaoExtensao,
        legendaExtensao,
        linhaFavoritos,
        linhaReconhecidos,
        grupoPeso,
        linhaSensiveis,
        contagem,
        linhaSortear,
        linhaPosicao,
        linhaIdioma,
    );

    const resultado = criar('section', '');
    resultado.id = 'sortear-resultado';
    resultado.tabIndex = -1;
    resultado.setAttribute('aria-live', 'polite');

    // Histórico: os últimos sorteados (a lista de recentes, guardada no navegador),
    // do mais novo para o mais velho. Fica fechado e some quando não há nada.
    const historico = criar('details', CLASSE_CARTAO);
    historico.id = 'sortear-historico';
    historico.hidden = true;

    raiz.append(cartao, historico, resultado);

    const pesosMarcados = () => PESOS_SORTEIO.filter((faixa) => caixasPeso.get(faixa).checked);

    const criterios = () => ({
        universalId: selecao.value === '' ? null : selecao.value,
        favoritosAutor: caixa.checked,
        extensao: selecaoExtensao.value === '' ? null : selecaoExtensao.value,
        incluirSensiveis: caixaSensiveis.checked,
        valencias: pesosMarcados(),
        reconhecidos: caixaReconhecidos.checked,
    });

    // Refaz as opções e a contagem com o estado atual dos controles. Tema e
    // extensão se contam um com o outro, mas nenhum desabilita o outro: a
    // combinação sem texto aparece como "(0)" e o aviso de "Nenhum texto" vale,
    // em vez de a escolha de um apagar a do outro sem a pessoa ver.
    function atualizar() {
        const favoritosAutor = caixa.checked;
        const extensao = criterios().extensao;
        // A escolha de receber ou não conteúdo sensível vale para todas as
        // contagens: um Tema ou uma faixa só com textos sensíveis aparece como
        // "nenhum texto" quando quem lê os dispensou.
        const incluirSensiveis = caixaSensiveis.checked;
        const valencias = pesosMarcados();
        // Reconhecidos vale para todas as contagens, como o conteúdo sensível.
        const reconhecidos = caixaReconhecidos.checked;
        const anterior = selecao.value;
        const contados = contarPorUniversal(db, {
            favoritosAutor,
            extensao,
            incluirSensiveis,
            valencias,
            reconhecidos,
        });
        // Os mesmos Temas sem o filtro de favoritos (a extensão fica), para saber
        // se o zero vem da nota; e sem nenhum filtro, para saber se há texto algum.
        const semNota = contarPorUniversal(db, {
            extensao,
            incluirSensiveis,
            valencias,
            reconhecidos,
        });
        const semFiltro = contarPorUniversal(db, { incluirSensiveis, valencias, reconhecidos });
        const totalAberto = elegiveisPorCriterios(db, {
            favoritosAutor,
            extensao,
            incluirSensiveis,
            valencias,
            reconhecidos,
        }).length;

        selecao.textContent = '';
        const aberta = criar('option', CLASSE_OPCAO, `Qualquer tema (${totalAberto})`);
        aberta.value = '';
        selecao.append(aberta);
        const selecionaveis = new Set();
        contados.forEach((u, i) => {
            // Sem nenhum texto com o filtro de nota, mas com textos sem ele:
            // continua escolhível, e o Sortear oferece sortear entre todos do Tema.
            const temSemFiltro = semFiltro[i].total > 0;
            let rotulo = `${u.nome} (${u.total})`;
            if (u.total === 0) {
                if (semNota[i].total > 0) rotulo = `${u.nome} (nenhum com nota alta)`;
                else if (!temSemFiltro) rotulo = `${u.nome} (nenhum texto)`;
            }
            const opcao = criar('option', '', rotulo);
            opcao.value = String(u.id);
            opcao.disabled = !temSemFiltro;
            opcao.className = u.total === 0 ? `${CLASSE_OPCAO} opacity-60` : CLASSE_OPCAO;
            if (!opcao.disabled) selecionaveis.add(String(u.id));
            selecao.append(opcao);
        });
        selecao.value = selecionaveis.has(anterior) ? anterior : '';

        // Extensão: cada faixa conta com o Tema e os favoritos de agora.
        const anteriorExtensao = selecaoExtensao.value;
        const universalAgora = criterios().universalId;
        const porFaixa = contarPorExtensao(db, {
            universalId: universalAgora,
            favoritosAutor,
            incluirSensiveis,
            valencias,
            reconhecidos,
        });
        const totalFaixas = contarPorExtensao(db, { incluirSensiveis, valencias, reconhecidos });
        const totalQualquer = elegiveisPorCriterios(db, {
            universalId: universalAgora,
            favoritosAutor,
            incluirSensiveis,
            valencias,
            reconhecidos,
        }).length;
        selecaoExtensao.textContent = '';
        const qualquer = criar('option', CLASSE_OPCAO, `Qualquer tamanho (${totalQualquer})`);
        qualquer.value = '';
        selecaoExtensao.append(qualquer);
        const faixasSelecionaveis = new Set();
        porFaixa.forEach((f, i) => {
            const haTexto = totalFaixas[i].total > 0;
            const opcao = criar(
                'option',
                '',
                `${f.rotulo} (${haTexto ? f.total : 'nenhum texto'})`,
            );
            opcao.value = f.id;
            opcao.disabled = !haTexto;
            opcao.className = f.total === 0 ? `${CLASSE_OPCAO} opacity-60` : CLASSE_OPCAO;
            if (haTexto) faixasSelecionaveis.add(f.id);
            selecaoExtensao.append(opcao);
        });
        selecaoExtensao.value = faixasSelecionaveis.has(anteriorExtensao) ? anteriorExtensao : '';
        const legenda = selecaoExtensao.value ? legendaDaFaixa(selecaoExtensao.value) : '';
        legendaExtensao.textContent = legenda ? `${legenda} ${NOTA_CONVENCAO_EXTENSAO}` : '';
        legendaExtensao.classList.toggle('hidden', !legenda);

        // Peso: cada faixa conta com o Tema, a extensão, os favoritos e o conteúdo
        // sensível de agora (a escolha de peso em si não entra na própria conta).
        const baseCriterios = {
            universalId: universalAgora,
            favoritosAutor,
            extensao,
            incluirSensiveis,
            reconhecidos,
        };
        const porPeso = contarPorValencia(db, baseCriterios);
        const totalPesos = contarPorValencia(db, { incluirSensiveis, reconhecidos });
        porPeso.forEach((f, i) => {
            const caixaPeso = caixasPeso.get(f.id);
            const haTexto = totalPesos[i].total > 0;
            rotulosPeso.get(f.id).textContent =
                `${f.rotulo} (${haTexto ? f.total : 'nenhum texto'})`;
            caixaPeso.disabled = !haTexto && !caixaPeso.checked;
            rotulosPeso.get(f.id).classList.toggle('opacity-60', f.total === 0);
        });

        const n = elegiveisPorCriterios(db, criterios()).length;
        contagem.textContent =
            n === 0
                ? 'Nenhum texto pode ser sorteado com esses critérios.'
                : n === 1
                  ? '1 texto pode ser sorteado com esses critérios.'
                  : `${n} textos podem ser sorteados com esses critérios.`;
        if (n === 0) {
            const avisos = [
                avisoForaPorLeitura(contarForaPorLeitura(db, criterios())),
                avisoForaPorSensivel(contarForaPorSensivel(db, criterios())),
                avisoForaPorReconhecimento(contarForaPorReconhecimento(db, criterios())),
            ].filter(Boolean);
            if (avisos.length) contagem.textContent += ` ${avisos.join(' ')}`;
        }
        const algumSemFiltro = elegiveisPorCriterios(db, {
            ...criterios(),
            favoritosAutor: false,
        }).length;
        botao.disabled = algumSemFiltro === 0;
    }

    function mensagem(texto, botoes = []) {
        resultado.textContent = '';
        const bloco = criar('div', CLASSE_CARTAO);
        bloco.append(criar('p', 'text-sm mb-3', texto));
        botoes.forEach((b) => bloco.append(b));
        resultado.append(bloco);
        mostrarInicio(bloco);
    }

    function botaoSortearOutro() {
        const b = criar('button', CLASSE_BOTAO_SECUNDARIO, 'Sortear outro');
        b.type = 'button';
        b.addEventListener('click', sortear);
        return b;
    }

    // Percurso da sessão: os textos que passaram pela tela, na ordem, para
    // "Anterior" e "Próximo". Fica só na memória (some ao fechar a página) e não
    // mexe nos recentes: voltar a um texto não é um sorteio novo, então a regra de
    // evitar repetição segue como estava. Um sorteio novo, ou a troca de versão
    // (Elo de tradução), entra no fim e a tela vai para ele, sem apagar o que
    // havia à frente.
    let percurso = [];
    let posicao = -1;

    // Refaz a lista do histórico. Clicar num título reabre o texto (aviso sensível
    // fechado) e o põe no fim do percurso, para o "Anterior" funcionar. Não é um
    // sorteio novo: os recentes ficam como estão.
    function atualizarHistorico() {
        const entradas = historicoDosRecentes(db, recentes);
        historico.hidden = entradas.length === 0;
        historico.textContent = '';
        if (!entradas.length) return;
        historico.append(
            criar(
                'summary',
                'cursor-pointer text-sm font-medium',
                `Últimos sorteados (${entradas.length})`,
            ),
        );
        const lista = criar('ul', 'mt-3 space-y-1');
        entradas.forEach(({ chave, tipo, item }) => {
            const li = criar('li');
            const b = criar(
                'button',
                'text-left text-sm text-blue-600 dark:text-blue-400 underline',
                item.titulo || 'Sem título',
            );
            b.type = 'button';
            b.addEventListener('click', () => {
                const r = { ok: true, tipo, item, chave };
                if (percurso[posicao]?.chave !== chave) registrarNoPercurso(r);
                mostrarTexto(percurso[posicao], false, { rolar: true });
            });
            li.append(
                b,
                criar(
                    'span',
                    'ml-2 text-xs uppercase text-gray-500 dark:text-slate-400',
                    tipo === 'prosa' ? 'Prosa' : 'Poema',
                ),
            );
            lista.append(li);
        });
        historico.append(lista);
    }

    function registrarNoPercurso(r) {
        percurso.push(r);
        if (percurso.length > PERCURSO_MAXIMO) percurso = percurso.slice(-PERCURSO_MAXIMO);
        posicao = percurso.length - 1;
    }

    // Abre um texto do percurso. O aviso de conteúdo sensível volta fechado, como
    // numa abertura nova.
    function irParaNoPercurso(n) {
        if (n < 0 || n >= percurso.length) return;
        posicao = n;
        mostrarTexto(percurso[n], false, { rolar: true });
    }

    // Refaz o par de cima. Chamado a cada texto mostrado, para os dois pares
    // ficarem sempre iguais.
    function atualizarControlesTopo() {
        controlesTopo.textContent = '';
        controlesTopo.append(...controlesDoPercurso('-topo', false));
    }

    function botaoDoPercurso(id, rotulo, destino) {
        const b = criar('button', CLASSE_BOTAO_SECUNDARIO, rotulo);
        b.type = 'button';
        b.id = id;
        b.addEventListener('click', () => irParaNoPercurso(destino()));
        return b;
    }

    // "Anterior" e "Próximo" só aparecem quando há para onde ir, e "2 de 5" só
    // quando há mais de um texto no percurso. Vêm antes do "Sortear outro".
    // `sufixo` separa os ids do par de cima ("-topo") dos do rodapé; `comSortearOutro`
    // é falso no par de cima, que já tem o Sortear.
    function controlesDoPercurso(sufixo = '', comSortearOutro = true) {
        const nos = [];
        if (posicao > 0) {
            nos.push(botaoDoPercurso(`sortear-anterior${sufixo}`, 'Anterior', () => posicao - 1));
        }
        if (posicao >= 0 && posicao < percurso.length - 1) {
            nos.push(botaoDoPercurso(`sortear-proximo${sufixo}`, 'Próximo', () => posicao + 1));
        }
        if (comSortearOutro) nos.push(botaoSortearOutro());
        if (percurso.length > 1) {
            const quantos = criar(
                'span',
                'text-xs text-gray-500 dark:text-slate-400',
                `${posicao + 1} de ${percurso.length}`,
            );
            quantos.id = `sortear-posicao${sufixo}`;
            nos.push(quantos);
        }
        return nos;
    }

    // O último texto na tela, para trocar a posição da ficha sem sortear de novo.
    let ultimoMostrado = null;

    // Texto novo na tela: se o começo dele não está à vista (quem clicou em
    // "Sortear outro" no fim de um texto longo), leva a tela até ele. Sem
    // animação, porque o conteúdo acabou de ser trocado. Começo já à vista, a
    // tela não se mexe.
    function mostrarInicio(no) {
        const topo = no.getBoundingClientRect?.().top ?? 0;
        const alto = globalThis.innerHeight || 0;
        if (topo < 0 || (alto && topo >= alto)) {
            no.scrollIntoView?.({ behavior: 'auto', block: 'start' });
        }
    }

    // Rola até o nó e leva o foco para ele (leitor de tela), sem animação para
    // quem desliga o movimento no sistema.
    function irPara(no) {
        const reduzir = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        no.scrollIntoView?.({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
        no.tabIndex = -1;
        no.focus({ preventScroll: true });
    }

    function botaoIrParaFicha(ficha) {
        const b = criar(
            'button',
            'block text-sm text-blue-600 dark:text-blue-400 underline mb-4',
            'Ir para a ficha ↓',
        );
        b.type = 'button';
        b.id = 'sortear-ir-ficha';
        b.addEventListener('click', () => irPara(ficha));
        return b;
    }

    // Texto longo: de volta ao título, onde a leitura começa (não ao topo da
    // página, com os controles).
    function botaoVoltarAoInicio(titulo) {
        const b = criar(
            'button',
            'text-sm text-blue-600 dark:text-blue-400 underline',
            '↑ Voltar ao início',
        );
        b.type = 'button';
        b.id = 'sortear-voltar-inicio';
        b.addEventListener('click', () => irPara(titulo));
        return b;
    }

    // Padrão: título, texto, ficha. Com o conteúdo sensível ainda fechado, a
    // ficha espera o texto abrir (só o aviso aparece). Na escolha "antes": título,
    // ficha, texto; aí a ficha aparece também junto do aviso.
    function mostrarTexto(r, corpoVisivel, { focar = true, rolar = false } = {}) {
        ultimoMostrado = { r, corpoVisivel };
        atualizarControlesTopo();
        resultado.textContent = '';
        const bloco = criar('article', CLASSE_CARTAO);
        const titulo = criar('h2', 'text-xl font-semibold mb-3', r.item.titulo || 'Sem título');
        titulo.id = 'sortear-titulo';
        bloco.append(
            criar(
                'p',
                'text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1',
                linhaDoTipo(r.tipo, r.item),
            ),
            titulo,
        );
        // Elo de tradução: logo abaixo do título, também atrás do aviso de
        // conteúdo sensível, para quem não quiser ler esta versão poder trocar.
        const avisoTraducao = montarAvisoTraducao(
            versoesDeTraducaoDoSorteio(db, r.tipo, r.item, criterios()),
            abrirVersao,
        );
        if (avisoTraducao) bloco.append(avisoTraducao);
        const ficha = montarFicha(db, r.tipo, r.item);
        const fichaAntes = posicaoFicha === 'antes';
        if (ficha && fichaAntes) bloco.append(ficha);

        const avisos = avisosDoTexto(r.item);
        if (avisos.length && !corpoVisivel) {
            const caixaAviso = criar(
                'div',
                'border border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950 rounded-md p-3 mb-4',
            );
            caixaAviso.append(criar('p', 'text-sm font-medium mb-2', 'Antes de ler, um aviso:'));
            avisos.forEach((a) => {
                const p = criar('p', 'text-sm mb-1');
                p.append(criar('strong', '', `${a.rotulo}: `), document.createTextNode(a.texto));
                caixaAviso.append(p);
            });
            const ler = criar('button', CLASSE_BOTAO_PRIMARIO, 'Ler mesmo assim');
            ler.type = 'button';
            ler.id = 'sortear-ler-mesmo-assim';
            ler.addEventListener('click', () => mostrarTexto(r, true));
            // Linha própria com espaçamento uniforme (gap), para o "2 de 2" não
            // colar no último botão.
            const acoes = criar('div', 'mt-2 flex flex-wrap items-center gap-2');
            acoes.append(ler, ...controlesDoPercurso());
            caixaAviso.append(acoes);
            bloco.append(caixaAviso);
        } else {
            const corpo = montarCorpo(r.item.texto);
            // Do autor para quem lê: vem logo depois do texto, e só com o texto
            // aberto (atrás do aviso de conteúdo sensível, nada dele aparece).
            const doAutor = montarBlocosPublicos(r.item);
            // O paratexto vem logo depois, também só com o texto aberto.
            const paratexto = montarParatexto(r.item, db?.autores || []);
            if (ficha && !fichaAntes) {
                if (textoEhLongo(r.item.texto)) bloco.append(botaoIrParaFicha(ficha));
                ficha.classList.add(
                    'mt-6',
                    'pt-4',
                    'border-t',
                    'border-gray-200',
                    'dark:border-slate-700',
                );
                bloco.append(corpo);
                if (doAutor) bloco.append(doAutor);
                if (paratexto) bloco.append(paratexto);
                bloco.append(ficha);
            } else {
                bloco.append(corpo);
                if (doAutor) bloco.append(doAutor);
                if (paratexto) bloco.append(paratexto);
            }
            const rodape = criar('div', 'mt-6 flex flex-wrap items-center gap-4');
            rodape.append(...controlesDoPercurso());
            if (textoEhLongo(r.item.texto)) rodape.append(botaoVoltarAoInicio(titulo));
            bloco.append(rodape);
        }
        resultado.append(bloco);
        // preventScroll: quem leva a tela ao começo do texto é `mostrarInicio`.
        if (focar) resultado.focus({ preventScroll: true });
        if (rolar) mostrarInicio(bloco);
    }

    // Abre a outra versão (Elo de tradução) no lugar do texto na tela. Não é um
    // novo sorteio, mas conta como lido: entra nos recentes, para o sorteio
    // seguinte não repetir a obra.
    function abrirVersao(versao) {
        const r = {
            ok: true,
            tipo: versao.tipo,
            item: versao.item,
            chave: chaveDoTexto(versao.tipo, versao.item),
        };
        recentes = registrarRecente(recentes, r.chave);
        gravarRecentes(recentes, armazenamento);
        registrarNoPercurso(r);
        atualizarHistorico();
        mostrarTexto(r, false, { rolar: true });
    }

    function sortear() {
        const r = sortearTexto(db, criterios(), {
            recentes,
            aleatorio,
            idiomaPreferido: seletorIdioma.value,
        });
        if (r.ok) {
            recentes = registrarRecente(recentes, r.chave);
            gravarRecentes(recentes, armazenamento);
            registrarNoPercurso(r);
            atualizarHistorico();
            mostrarTexto(r, false, { rolar: true });
            return;
        }
        if (r.motivo === 'sem-favoritos') {
            const sem = criar(
                'button',
                CLASSE_BOTAO_SECUNDARIO,
                `Sortear entre os ${r.semFavoritos} sem o filtro de favoritos`,
            );
            sem.type = 'button';
            sem.id = 'sortear-sem-favoritos';
            sem.addEventListener('click', () => {
                caixa.checked = false;
                atualizar();
                sortear();
            });
            mensagem('Nenhum texto desse tema está entre os meus preferidos.', [sem]);
            return;
        }
        const avisos = [
            avisoForaPorLeitura(r.foraPorLeitura),
            avisoForaPorSensivel(r.foraPorSensivel),
            avisoForaPorReconhecimento(r.foraPorReconhecimento),
        ].filter(Boolean);
        mensagem(
            avisos.length
                ? `Nenhum texto pode ser sorteado com esses critérios. ${avisos.join(' ')}`
                : 'Nenhum texto pode ser sorteado com esses critérios. Marque textos como "Pode ser sorteado" no Arquivo Poético.',
        );
    }

    seletorPosicao.addEventListener('change', () => {
        posicaoFicha = POSICOES_FICHA.includes(seletorPosicao.value)
            ? seletorPosicao.value
            : 'depois';
        gravarPosicaoDaFicha(posicaoFicha, armazenamento);
        if (ultimoMostrado) {
            mostrarTexto(ultimoMostrado.r, ultimoMostrado.corpoVisivel, { focar: false });
        }
    });
    seletorIdioma.addEventListener('change', () => {
        gravarIdiomaPreferido(seletorIdioma.value, armazenamento);
    });
    selecao.addEventListener('change', atualizar);
    selecaoExtensao.addEventListener('change', atualizar);
    caixa.addEventListener('change', atualizar);
    caixaReconhecidos.addEventListener('change', atualizar);
    caixasPeso.forEach((c) => c.addEventListener('change', atualizar));
    caixaSensiveis.addEventListener('change', () => {
        gravarEscolhaSensiveis(caixaSensiveis.checked ? 'incluir' : 'excluir', armazenamento);
        atualizar();
    });
    botao.addEventListener('click', sortear);
    atualizar();
    atualizarHistorico();

    return { sortear, atualizar };
}
