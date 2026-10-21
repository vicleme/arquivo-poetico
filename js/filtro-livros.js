// Filtros da aba Livros (Fase 19, etapa 3). Lógica pura, sem DOM: recebe a lista
// de livros e os filtros e devolve os que passam. A ordem da lista de entrada é
// preservada, então quem chama decide a ordenação (ver livrosEmOrdemDaAba em
// render-listas.js). A aba e o Anterior/Próximo do Ver do Livro usam o mesmo
// resultado, para nunca divergirem.

import {
    filtroDataVazio,
    itemBateFiltroData,
    normalizarBusca,
    situacaoEditorialDoLivro,
} from './utils.js';

// Valores especiais dos selects. Ficam fora do que o usuário pode digitar:
// '' já quer dizer "todos" em cada seletor.
export const FASE_SEM_FASE = '__sem-fase__';
export const SITUACAO_NAO_ESPECIFICADA = 'nao-especificada';

export const TIPOS_DE_LIVRO = ['Inéditos', 'Coletânea'];

export const PUBLICADO = 'publicado';
export const PROGRAMADO = 'programado';
export const NAO_PUBLICADO = 'nao-publicado';

export function filtrosLivrosVazios() {
    return { busca: '', tipo: '', fase: '', situacao: '', publicacao: '', data: filtroDataVazio() };
}

// Tem Data de Primeira Publicação = pelo menos dia, mês ou ano (hora sozinha não
// conta). Texto simples de livro muito antigo conta se não for vazio.
export function livroTemDataDePublicacao(livro) {
    const d = livro?.data;
    if (!d) return false;
    if (typeof d === 'string') return d.trim() !== '';
    return Boolean(d.dia || d.mes || d.ano);
}

function hojeLocal() {
    const agora = new Date();
    return { ano: agora.getFullYear(), mes: agora.getMonth() + 1, dia: agora.getDate() };
}

// Programado = a data de publicação ainda não chegou. Data parcial vale pelo
// primeiro dia possível (só o ano 2027 é 01/01/2027; mês e ano é o dia 1), então só
// é programado o que está inteiro no futuro: o ano ou o mês em curso conta como
// publicado. Sem ano, ou texto simples de livro antigo, não dá para saber: não é
// programado. `hoje` é { ano, mes, dia } (o app passa o do fuso escolhido).
export function livroEhProgramado(livro, hoje = hojeLocal()) {
    const d = livro?.data;
    if (!d || typeof d === 'string' || !d.ano) return false;
    const chave = (a, m, dia) => a * 10000 + m * 100 + dia;
    return chave(d.ano, d.mes || 1, d.dia || 1) > chave(hoje.ano, hoje.mes, hoje.dia);
}

// Três grupos que não se sobrepõem: sem data (não publicado), data futura
// (programado) e data que já chegou (publicado).
export function situacaoDePublicacao(livro, hoje) {
    if (!livroTemDataDePublicacao(livro)) return NAO_PUBLICADO;
    return livroEhProgramado(livro, hoje) ? PROGRAMADO : PUBLICADO;
}

function livroCombinaComPublicacao(livro, publicacao, hoje) {
    if (!publicacao) return true;
    return situacaoDePublicacao(livro, hoje) === publicacao;
}

// Data de Primeira Publicação num campo só: o filtro é { de, ate } com dia, mês e
// ano opcionais (ver parseFiltroDataRapido em utils.js: "2020", "03/2020",
// "15/03/2020", "2020-2023"). Vale o mesmo critério dos filtros de data de Poemas e
// Prosas: a data do livro, completa ou parcial, só precisa se sobrepor ao período
// pedido (livro de "2018" aparece em "03/2018", pois pode ser de março). Livro sem
// data, sem ano ou com texto simples antigo fica de fora quando o filtro está ligado.
export function filtroDataLivrosAtivo(filtroData) {
    const { de = {}, ate = {} } = filtroData || {};
    return Boolean(de.ano || de.mes || de.dia || ate.ano || ate.mes || ate.dia);
}

function livroCombinaComData(livro, filtroData) {
    if (!filtroDataLivrosAtivo(filtroData)) return true;
    // Sem ano não dá para situar o livro no tempo (dia e mês sozinhos casariam com tudo).
    if (!livro?.data?.ano) return false;
    return itemBateFiltroData(livro.data, filtroData);
}

// Só dois tipos existem no modal. Qualquer outro valor (livro muito antigo, sem
// o campo) conta como Inéditos, a mesma divisão que a aba Partes já faz ao
// separar Coletânea do resto.
export function tipoDoLivro(livro) {
    return livro?.tipo === 'Coletânea' ? 'Coletânea' : 'Inéditos';
}

function faseDoLivro(livro) {
    return typeof livro?.fase === 'string' ? livro.fase.trim() : '';
}

// ISBN se digita com ou sem hífen e espaço; a busca ignora os dois.
function soDigitosDoIsbn(valor) {
    return String(valor ?? '')
        .replace(/[\s-]/g, '')
        .toLowerCase();
}

// Busca em título, sigla e ISBN (13 e 10). Ignora caixa e acento, por trecho.
// Termo vazio passa todos.
export function livroCombinaComBusca(livro, termo) {
    const alvo = normalizarBusca(String(termo ?? '').trim());
    if (!alvo) return true;

    if (normalizarBusca(livro?.titulo).includes(alvo)) return true;
    if (normalizarBusca(livro?.siglaOficial).includes(alvo)) return true;

    // ISBN: só compara se o termo, sem hífen e espaço, parece ISBN (dígitos e o X
    // final do ISBN-10). Evita que a letra "x" digitada para o título case com ISBN.
    const alvoIsbn = soDigitosDoIsbn(alvo);
    if (alvoIsbn && /^[0-9]+x?$/.test(alvoIsbn)) {
        if (soDigitosDoIsbn(livro?.isbn13).includes(alvoIsbn)) return true;
        if (soDigitosDoIsbn(livro?.isbn10).includes(alvoIsbn)) return true;
    }
    return false;
}

function livroCombinaComSituacao(livro, situacao) {
    if (!situacao) return true;
    const atual = situacaoEditorialDoLivro(livro);
    if (situacao === SITUACAO_NAO_ESPECIFICADA) return atual === '';
    return atual === situacao;
}

function livroCombinaComFase(livro, fase) {
    if (!fase) return true;
    const atual = faseDoLivro(livro);
    if (fase === FASE_SEM_FASE) return atual === '';
    return atual === fase;
}

// Aplica todos os filtros (E entre eles). `filtros` pode ter só alguns campos.
// `hoje` ({ ano, mes, dia }) só importa para Programados.
export function filtrarLivros(livros, filtros = {}, hoje = hojeLocal()) {
    const { busca = '', tipo = '', fase = '', situacao = '', publicacao = '', data } = filtros;
    return (livros || []).filter(
        (l) =>
            livroCombinaComBusca(l, busca) &&
            (!tipo || tipoDoLivro(l) === tipo) &&
            livroCombinaComFase(l, fase) &&
            livroCombinaComSituacao(l, situacao) &&
            livroCombinaComPublicacao(l, publicacao, hoje) &&
            livroCombinaComData(l, data),
    );
}

// Há algum filtro ligado? (decide o botão "Limpar filtros" e a mensagem de lista vazia)
export function filtrosLivrosAtivos(filtros = {}) {
    const { busca = '', tipo = '', fase = '', situacao = '', publicacao = '', data } = filtros;
    return Boolean(
        String(busca).trim() ||
        tipo ||
        fase ||
        situacao ||
        publicacao ||
        filtroDataLivrosAtivo(data),
    );
}

// Fases já usadas, sem repetição e em ordem, para o select. A caixa e o acento
// contam (o campo é texto livre e cada grafia é um valor); o select só mostra o
// que existe, então nenhuma opção devolve lista vazia por engano.
export function fasesDosLivros(livros) {
    const fases = new Set();
    (livros || []).forEach((l) => {
        const f = faseDoLivro(l);
        if (f) fases.add(f);
    });
    return Array.from(fases).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Há livro sem fase? (decide se o select oferece "Sem fase")
export function haLivroSemFase(livros) {
    return (livros || []).some((l) => faseDoLivro(l) === '');
}
