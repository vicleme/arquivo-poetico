// Filtros da aba Livros (Fase 19, etapa 3). Lógica pura, sem DOM: recebe a lista
// de livros e os filtros e devolve os que passam. A ordem da lista de entrada é
// preservada, então quem chama decide a ordenação (ver livrosEmOrdemDaAba em
// render-listas.js). A aba e o Anterior/Próximo do Ver do Livro usam o mesmo
// resultado, para nunca divergirem.

import { filtroDataVazio, itemBateFiltroData, situacaoEditorialDoLivro } from './utils.js';
import { livroCombinaComUsoIa } from './uso-ia-livro.js';
import { livroCombinaComConsulta } from './busca-livros.js';

// Valores especiais dos selects. Ficam fora do que o usuário pode digitar:
// '' já quer dizer "todos" em cada seletor.
export const FASE_SEM_FASE = '__sem-fase__';
export const SITUACAO_NAO_ESPECIFICADA = 'nao-especificada';

export const TIPOS_DE_LIVRO = ['Inéditos', 'Coletânea'];

export const PUBLICADO = 'publicado';
export const PROGRAMADO = 'programado';
export const NAO_PUBLICADO = 'nao-publicado';

export function filtrosLivrosVazios() {
    return {
        busca: '',
        tipo: '',
        fase: '',
        situacao: '',
        publicacao: '',
        usoIa: '',
        // Botões "tem ..." de 3 estados: '' = tanto faz (não filtra), 'com' = só
        // livros que têm, 'sem' = só livros que não têm.
        temCapa: '',
        temIsbn: '',
        temLoja: '',
        data: filtroDataVazio(),
    };
}

export const TEM_COM = 'com';
export const TEM_SEM = 'sem';

// Estado de um botão "tem ...": só 'com' e 'sem' valem; `true` (forma antiga, da
// caixa de checagem) conta como 'com'; qualquer outra coisa é '' (tanto faz).
export function estadoTem(valor) {
    if (valor === true || valor === TEM_COM) return TEM_COM;
    if (valor === TEM_SEM) return TEM_SEM;
    return '';
}

// O clique gira: tanto faz, com, sem, e volta a tanto faz.
export function proximoEstadoTem(valor) {
    const atual = estadoTem(valor);
    if (atual === '') return TEM_COM;
    return atual === TEM_COM ? TEM_SEM : '';
}

// Rótulos de cada botão, por estado: [tanto faz, com, sem].
export const ROTULOS_TEM_LIVROS = {
    temCapa: ['Capa', 'Com capa', 'Sem capa'],
    temIsbn: ['ISBN', 'Com ISBN', 'Sem ISBN'],
    temLoja: ['Loja', 'Com loja', 'Sem loja'],
};

// Aplica um botão "tem ...": '' passa todos; 'com' só quem tem; 'sem' só quem não tem.
function livroCombinaComTem(livro, estado, temEsse) {
    const e = estadoTem(estado);
    if (e === '') return true;
    return e === TEM_COM ? temEsse(livro) : !temEsse(livro);
}

// Capa enviada (o id da imagem guardada). O link da imagem original não conta:
// é só de acesso. Mesma regra do `tem_capa` do download.
export function livroTemCapa(livro) {
    return livro?.capa != null && livro.capa !== '';
}

// ISBN-13 ou ISBN-10 preenchido.
export function livroTemIsbn(livro) {
    return Boolean(String(livro?.isbn13 ?? '').trim() || String(livro?.isbn10 ?? '').trim());
}

// Pelo menos uma loja com nome ou link. Mesma regra da lista de lojas do download.
export function livroTemLoja(livro) {
    return (
        Array.isArray(livro?.lojas) &&
        livro.lojas.some((l) => String(l?.nome ?? '').trim() || String(l?.url ?? '').trim())
    );
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

// Busca da aba (a mesma caixa aceita termos soltos e `campo:valor`): título, sigla,
// ISBN, autoria e equipe, mais os prefixos `autor:`, `papel:`, `equipe:` e
// `papelequipe:` (ver busca-livros.js). Termo vazio passa todos. `autoresCadastro` e
// `colaboradoresCadastro` servem a autoria e à equipe.
export function livroCombinaComBusca(
    livro,
    termo,
    autoresCadastro = [],
    colaboradoresCadastro = [],
) {
    return livroCombinaComConsulta(livro, termo, autoresCadastro, colaboradoresCadastro);
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
// `hoje` ({ ano, mes, dia }) só importa para Programados; `autoresCadastro`, para
// a busca achar o livro pelo nome do Autor; `colaboradoresCadastro`, pelo da equipe.
export function filtrarLivros(
    livros,
    filtros = {},
    hoje = hojeLocal(),
    autoresCadastro = [],
    colaboradoresCadastro = [],
) {
    const {
        busca = '',
        tipo = '',
        fase = '',
        situacao = '',
        publicacao = '',
        usoIa = '',
        temCapa = '',
        temIsbn = '',
        temLoja = '',
        data,
    } = filtros;
    return (livros || []).filter(
        (l) =>
            livroCombinaComBusca(l, busca, autoresCadastro, colaboradoresCadastro) &&
            (!tipo || tipoDoLivro(l) === tipo) &&
            livroCombinaComFase(l, fase) &&
            livroCombinaComSituacao(l, situacao) &&
            livroCombinaComPublicacao(l, publicacao, hoje) &&
            livroCombinaComUsoIa(l, usoIa) &&
            livroCombinaComTem(l, temCapa, livroTemCapa) &&
            livroCombinaComTem(l, temIsbn, livroTemIsbn) &&
            livroCombinaComTem(l, temLoja, livroTemLoja) &&
            livroCombinaComData(l, data),
    );
}

// Há algum filtro ligado? (decide o botão "Limpar filtros" e a mensagem de lista vazia)
export function filtrosLivrosAtivos(filtros = {}) {
    const {
        busca = '',
        tipo = '',
        fase = '',
        situacao = '',
        publicacao = '',
        usoIa = '',
        temCapa = '',
        temIsbn = '',
        temLoja = '',
        data,
    } = filtros;
    return Boolean(
        String(busca).trim() ||
        tipo ||
        fase ||
        situacao ||
        publicacao ||
        usoIa ||
        estadoTem(temCapa) ||
        estadoTem(temIsbn) ||
        estadoTem(temLoja) ||
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
