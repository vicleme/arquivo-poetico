// ============================================================
// estatisticas-filtros.js — estado compartilhado das Estatísticas.
// ============================================================

import { db } from './db.js';
import { anoDeDataParcial, escapeHtml, SINALIZACOES_CATEGORIAS, paresAutoria } from './utils.js';

const LS_PREFIX_EST = 'arquivoPoetico_est_';

function notificarMudanca() {
    window.dispatchEvent(new CustomEvent('estatisticas:filtros-alterados'));
}

function lerJSON(chave, padrao) {
    try {
        const raw = localStorage.getItem(LS_PREFIX_EST + chave);
        if (raw === null) return padrao;
        const valor = JSON.parse(raw);
        return valor === null || valor === undefined ? padrao : valor;
    } catch {
        return padrao; // JSON inválido — cai pro padrão, igual a lerEstado() em colunas.js
    }
}

function salvarJSON(chave, valor) {
    localStorage.setItem(LS_PREFIX_EST + chave, JSON.stringify(valor));
}

// Escapa um valor pra uso dentro de onclick/onchange="...('valor')": precisa
// escapar primeiro pro contexto JS (aspas simples do argumento, já que o
// atributo em si usa aspas duplas) e SÓ DEPOIS pro contexto HTML do
// atributo — na ordem inversa, a entidade de aspas simples (&#39;) volta a
// virar aspas simples de verdade antes do handler rodar (o navegador
// decodifica entidades HTML antes de interpretar o atributo como JS) e
// fecha a string do argumento cedo demais.
function escapeParaOnclick(valor) {
    const jsEscapado = String(valor ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
    return escapeHtml(jsEscapado);
}

// Mesmas 9 categorias de SINALIZACOES_CATEGORIAS (utils.js), na mesma
// ordem de definição (Object.keys preserva ordem de inserção pra chaves
// string) — é essa ordem que aparece no seletor de tipos do gráfico
// "Etiquetas mais frequentes".
const TIPOS_ETIQUETA = Object.keys(SINALIZACOES_CATEGORIAS);

// Rótulos por extenso — espelha ROTULOS_SINALIZACOES (utils.js, não
// exportado) e CORES_CATEGORIA_SINALIZACAO (celulas-tabela.js), mas
// redefinido aqui pra não criar dependência entre módulos que não se
// conhecem hoje; se um rótulo mudar num lugar, muda no outro também
// (mesmo espírito do comentário sobre ROTULOS_SINALIZACOES em utils.js).
const ROTULOS_TIPOS_ETIQUETA = {
    tradicao: 'Tradição',
    estilo: 'Estilo',
    tema: 'Tema',
    territorialidade: 'Territorialidade',
    relacao: 'Relação',
    sensibilidade: 'Sensibilidade',
    tom: 'Tom',
    dominioImagetico: 'Domínio Imagético',
    outros: 'Outros',
};

// Mesma família de cor (por matiz) usada nos badges de
// badgesEtiquetasPorCategoria (celulas-tabela.js — ex.: Tradição em
// violeta, Tema em verde-esmeralda), só que em hex: Chart.js não lê
// classe Tailwind, precisa da cor concreta pro backgroundColor da barra.
const CORES_TIPOS_ETIQUETA = {
    tradicao: '#8b5cf6',
    estilo: '#6366f1',
    tema: '#f97316',
    territorialidade: '#10b981',
    relacao: '#ec4899',
    sensibilidade: '#ef4444',
    tom: '#0ea5e9',
    dominioImagetico: '#06b6d4',
    outros: '#9ca3af',
};

export function getTiposEtiquetaSelecionados() {
    const salvo = lerJSON('tiposEtiqueta', null);
    if (Array.isArray(salvo)) {
        const validos = salvo.filter((t) => TIPOS_ETIQUETA.includes(t));
        if (validos.length) return validos;
    }
    // padrão: todos os tipos combinados — igual ao comportamento de antes
    // dessa feature, quando não existia filtro por tipo nenhum.
    return [...TIPOS_ETIQUETA];
}

export function toggleTipoEtiqueta(tipo, ativo) {
    if (!TIPOS_ETIQUETA.includes(tipo)) return;
    const atuais = new Set(getTiposEtiquetaSelecionados());
    if (ativo) atuais.add(tipo);
    else atuais.delete(tipo);
    // nunca salva a lista vazia — sem nenhum tipo marcado não sobra o que
    // mostrar; volta pro padrão (todos) em vez de deixar o gráfico mudo
    // sem nenhum aviso do que aconteceu.
    salvarJSON('tiposEtiqueta', atuais.size ? Array.from(atuais) : [...TIPOS_ETIQUETA]);
    notificarMudanca();
}

// ─── Gráficos "ao longo do tempo": seleção múltipla de Tema/Pessoa ──
// Substitui o antigo <select> de item único — cada `chave` ('tema' |
// 'pessoa') guarda a lista de itens marcados pra cruzar no mesmo
// gráfico de linha. Vazio = nada selecionado (painel mostra o convite
// pra escolher, sem linha nenhuma — ao contrário do <select> antigo,
// que em branco mostrava a produção total; aqui a seleção é sempre
// explícita, já que o objetivo agora é comparar itens escolhidos, não
// ver um agregado). Pedido do Victor, 27/09/2026.
export function getSelecaoTemporal(chave) {
    const salvo = lerJSON('temporal_' + chave, []);
    return Array.isArray(salvo) ? salvo.map(String) : [];
}

export function toggleSelecaoTemporal(chave, valor, ativo) {
    const atuais = new Set(getSelecaoTemporal(chave));
    if (ativo) atuais.add(String(valor));
    else atuais.delete(String(valor));
    salvarJSON('temporal_' + chave, Array.from(atuais));
    notificarMudanca();
}

export function selecionarTodosTemporal(chave, itens) {
    salvarJSON('temporal_' + chave, [...new Set((itens || []).map(String))]);
    notificarMudanca();
}

export function limparSelecaoTemporal(chave) {
    salvarJSON('temporal_' + chave, []);
    notificarMudanca();
}

// Ordem do seletor de checkboxes dos gráficos "ao longo do tempo" —
// mesma ideia (e mesmos dois valores) de getOrdemOcultos, só que numa
// lista separada: trocar a ordem de exibição não deve mexer na ordem
// do painel de ocultar, e vice-versa, mesmo quando é a mesma chave
// ('tema' ou 'pessoa') nos dois. Pedido do Victor, 27/09/2026.
export function getOrdemTemporal(chave) {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'ordemTemporal_' + chave);
    return valor === 'alfabetica' ? 'alfabetica' : 'frequencia';
}

export function definirOrdemTemporal(chave, ordem) {
    localStorage.setItem(
        LS_PREFIX_EST + 'ordemTemporal_' + chave,
        ordem === 'alfabetica' ? 'alfabetica' : 'frequencia',
    );
    notificarMudanca();
}

// ─── Papel do Tema (aba Temas e pessoas) ───────────────────────────
// Recorta os Temas contados nas Estatísticas por papel no texto: 'todos'
// (padrão: qualquer papel, comportamento de sempre), 'principal',
// 'secundario' ou 'semPapel'. A escolha persiste no navegador; por isso a
// tela mostra sempre qual papel está ativo (um "só principais" esquecido
// continuaria valendo na próxima visita).
export const PAPEIS_TEMA_ESTATISTICAS = ['todos', 'principal', 'secundario', 'semPapel'];
export const ROTULOS_PAPEL_TEMA_ESTATISTICAS = {
    todos: 'Todos',
    principal: 'Principal',
    secundario: 'Secundário',
    semPapel: 'Indefinido',
};

export function getPapelTemaEstatisticas() {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'papelTema');
    return PAPEIS_TEMA_ESTATISTICAS.includes(valor) ? valor : 'todos';
}

export function definirPapelTemaEstatisticas(papel) {
    localStorage.setItem(
        LS_PREFIX_EST + 'papelTema',
        PAPEIS_TEMA_ESTATISTICAS.includes(papel) ? papel : 'todos',
    );
    notificarMudanca();
}

// ─── Papel do Assunto (aba Temas e pessoas) ────────────────────────
// Mesmo recorte do Tema, mas para o gráfico de Assuntos, com o papel
// efetivo do Assunto no texto (herdado do Tema, ou fixado na mão). Valores
// iguais aos do Tema; a escolha persiste no navegador em chave própria,
// então mexer no papel do Tema não muda o do Assunto e vice-versa.
export const PAPEIS_ASSUNTO_ESTATISTICAS = PAPEIS_TEMA_ESTATISTICAS;
export const ROTULOS_PAPEL_ASSUNTO_ESTATISTICAS = ROTULOS_PAPEL_TEMA_ESTATISTICAS;

export function getPapelAssuntoEstatisticas() {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'papelAssunto');
    return PAPEIS_ASSUNTO_ESTATISTICAS.includes(valor) ? valor : 'todos';
}

export function definirPapelAssuntoEstatisticas(papel) {
    localStorage.setItem(
        LS_PREFIX_EST + 'papelAssunto',
        PAPEIS_ASSUNTO_ESTATISTICAS.includes(papel) ? papel : 'todos',
    );
    notificarMudanca();
}

// ─── Local e idioma (aba Local e idioma) ───────────────────────────
// Dois gráficos de Local (o que o texto CITA, a Territorialidade, e onde foi
// ESCRITO) com o mesmo par de controles, guardados por campo: o modo
// ('direto' conta só o Local marcado; 'agregado' conta também quem está
// dentro dele, cada texto uma vez) e o tipo ('' = todos; ou um tipo como
// Cidade, País). As escolhas persistem no navegador, por isso a tela diz
// sempre o que está ativo.
export const CAMPOS_LOCAL_ESTATISTICAS = ['territorialidade', 'escrita'];
export const TIPO_LOCAL_SEM_TIPO = '__sem_tipo__';

function campoLocalValido(campo) {
    return CAMPOS_LOCAL_ESTATISTICAS.includes(campo) ? campo : 'territorialidade';
}

export function getModoLocalEstatisticas(campo) {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'modoLocal_' + campoLocalValido(campo));
    return valor === 'agregado' ? 'agregado' : 'direto';
}

export function definirModoLocalEstatisticas(campo, modo) {
    localStorage.setItem(
        LS_PREFIX_EST + 'modoLocal_' + campoLocalValido(campo),
        modo === 'agregado' ? 'agregado' : 'direto',
    );
    notificarMudanca();
}

export function getTipoLocalEstatisticas(campo) {
    return localStorage.getItem(LS_PREFIX_EST + 'tipoLocal_' + campoLocalValido(campo)) || '';
}

export function definirTipoLocalEstatisticas(campo, tipo) {
    const chave = LS_PREFIX_EST + 'tipoLocal_' + campoLocalValido(campo);
    if (tipo) localStorage.setItem(chave, String(tipo));
    else localStorage.removeItem(chave);
    notificarMudanca();
}

// Assuntos dos textos escritos num Local: '' = todos os textos que têm local
// de escrita; senão, o id do Local (conta também os escritos dentro dele).
export function getLocalAssuntosEscrita() {
    return localStorage.getItem(LS_PREFIX_EST + 'localAssuntosEscrita') || '';
}

export function definirLocalAssuntosEscrita(id) {
    const chave = LS_PREFIX_EST + 'localAssuntosEscrita';
    if (id) localStorage.setItem(chave, String(id));
    else localStorage.removeItem(chave);
    notificarMudanca();
}

// Papel do idioma no gráfico de Idiomas: 'todos' (qualquer papel),
// 'principal' ou 'secundario'. Um texto com dois idiomas, ou com dois
// Principais, conta uma vez em cada um; a soma das barras pode passar do
// total de textos (o gráfico avisa).
export const PAPEIS_IDIOMA_ESTATISTICAS = ['todos', 'principal', 'secundario'];
export const ROTULOS_PAPEL_IDIOMA_ESTATISTICAS = {
    todos: 'Todos',
    principal: 'Principal',
    secundario: 'Secundário',
};

export function getPapelIdiomaEstatisticas() {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'papelIdioma');
    return PAPEIS_IDIOMA_ESTATISTICAS.includes(valor) ? valor : 'todos';
}

export function definirPapelIdiomaEstatisticas(papel) {
    localStorage.setItem(
        LS_PREFIX_EST + 'papelIdioma',
        PAPEIS_IDIOMA_ESTATISTICAS.includes(papel) ? papel : 'todos',
    );
    notificarMudanca();
}

// ─── Gráfico de Pessoas: modo (por pessoa / por grupo) + filtro ────

export function getModoGraficoPessoas() {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'modoPessoas');
    return valor === 'grupo' ? 'grupo' : 'pessoa';
}

export function definirModoGraficoPessoas(modo) {
    localStorage.setItem(LS_PREFIX_EST + 'modoPessoas', modo === 'grupo' ? 'grupo' : 'pessoa');
    notificarMudanca();
}

// Filtro por Grupo só se aplica no modo "por pessoa" (restringe às
// pessoas que pertencem a algum dos grupos marcados); vazio = sem
// filtro, mostra todo mundo — mesmo critério de "sem limite" já usado
// em filtrarPorIntervalo (min/max vazios = sem limite naquele lado).
export function getGruposFiltroPessoas() {
    const salvo = lerJSON('gruposFiltroPessoas', []);
    return Array.isArray(salvo) ? salvo : [];
}

export function toggleGrupoFiltroPessoas(grupoId, ativo) {
    const atuais = new Set(getGruposFiltroPessoas().map(String));
    if (ativo) atuais.add(String(grupoId));
    else atuais.delete(String(grupoId));
    salvarJSON('gruposFiltroPessoas', Array.from(atuais));
    notificarMudanca();
}

export function selecionarTodosGruposFiltro(grupoIds) {
    salvarJSON('gruposFiltroPessoas', [...new Set((grupoIds || []).map(String))]);
    notificarMudanca();
}

export function limparGruposFiltroPessoas() {
    salvarJSON('gruposFiltroPessoas', []);
    notificarMudanca();
}

// ─── Colunas da matriz de coocorrência ─────────────────────────
// A seleção de colunas é apenas visual: não altera o corpus nem o N da análise.
export function getModoColunasCoocorrencia() {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'modoColunasCoocorrencia');
    return valor === 'selecionar' ? 'selecionar' : 'todos';
}

export function definirModoColunasCoocorrencia(modo) {
    localStorage.setItem(
        LS_PREFIX_EST + 'modoColunasCoocorrencia',
        modo === 'selecionar' ? 'selecionar' : 'todos',
    );
    notificarMudanca();
}

export function getTemasColunasSelecionados() {
    const salvo = lerJSON('temasColunasCoocorrencia', []);
    return Array.isArray(salvo) ? salvo.map(String) : [];
}

export function toggleTemaColunaCoocorrencia(tema, ativo) {
    const atuais = new Set(getTemasColunasSelecionados());
    if (ativo) atuais.add(String(tema));
    else atuais.delete(String(tema));
    salvarJSON('temasColunasCoocorrencia', Array.from(atuais));
    notificarMudanca();
}

export function selecionarTodosTemasColunas(temas) {
    salvarJSON('temasColunasCoocorrencia', [...new Set((temas || []).map(String))]);
    notificarMudanca();
}

export function limparTemasColunas() {
    salvarJSON('temasColunasCoocorrencia', []);
    notificarMudanca();
}

// Ordem da lista de colunas do painel "Relações" (Temas × Pessoas/Grupos)
// — mesmos dois valores e mesma ideia de getOrdemOcultos/getOrdemTemporal,
// numa chave própria (não compartilha estado com os outros painéis de
// Tema, já que aqui a lista é de colunas da matriz, não de itens do
// gráfico). Pedido do Victor, 27/09/2026.
export function getOrdemColunasCoocorrencia() {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'ordemColunasCoocorrencia');
    return valor === 'alfabetica' ? 'alfabetica' : 'frequencia';
}

export function definirOrdemColunasCoocorrencia(ordem) {
    localStorage.setItem(
        LS_PREFIX_EST + 'ordemColunasCoocorrencia',
        ordem === 'alfabetica' ? 'alfabetica' : 'frequencia',
    );
    notificarMudanca();
}

// ─── Ocultar itens: vale pros 4 gráficos (Ano, Livro, Etiquetas, ───
// Pessoas), cada um com sua própria lista salva — ocultar "Pedro" no
// gráfico de Pessoas não tem nada a ver com ocultar "2020" no de Ano,
// mas o mecanismo (checkbox por item, persistido, sem reconfigurar
// toda vez que a aba reabre) é o mesmo nos quatro. `chave` é uma de
// 'ano' | 'livro' | 'temas' | 'pessoas-pessoa' | 'pessoas-grupo' —
// Pessoas usa uma lista por modo, já que os rótulos mudam de nome de
// pessoa pra nome de grupo entre um modo e outro.

export function getOcultosGrafico(chave) {
    const salvo = lerJSON('ocultos_' + chave, []);
    return new Set(Array.isArray(salvo) ? salvo : []);
}

export function toggleOcultoItem(chave, label) {
    const atuais = getOcultosGrafico(chave);
    if (atuais.has(label)) atuais.delete(label);
    else atuais.add(label);
    salvarJSON('ocultos_' + chave, Array.from(atuais));
    notificarMudanca();
}

export function restaurarOcultosGrafico(chave) {
    localStorage.removeItem(LS_PREFIX_EST + 'ocultos_' + chave);
    notificarMudanca();
}

// Ordem de exibição da lista de checkboxes do painel de ocultar:
// 'frequencia' (padrão — mais citado primeiro, já vem assim de
// agregarPorTema/agregarPorPessoa) ou 'alfabetica'. Uma lista por
// chave, mesmo espírito de getOcultosGrafico — trocar a ordem em
// Temas não deve mexer na ordem de Pessoas. Pedido do Victor,
// 27/09/2026: conforme a lista cresce, achar um item específico numa
// ordem só por frequência fica difícil.
export function getOrdemOcultos(chave) {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'ordemOcultos_' + chave);
    return valor === 'alfabetica' ? 'alfabetica' : 'frequencia';
}

export function definirOrdemOcultos(chave, ordem) {
    localStorage.setItem(
        LS_PREFIX_EST + 'ordemOcultos_' + chave,
        ordem === 'alfabetica' ? 'alfabetica' : 'frequencia',
    );
    notificarMudanca();
}

// Corte automático por valor mínimo de aparições: itens com contagem
// abaixo do valor configurado saem do gráfico e também da própria lista
// de ocultar (não faz sentido oferecer pra ocultar manualmente algo que
// já foi cortado pelo mínimo) — quem aplica de fato o corte é
// filtrarPorIntervalo (estatisticas-dados.js), esta função só guarda o
// valor. Uma chave por gráfico, mesmo espírito de getOcultosGrafico —
// os 4 gráficos (Ano, Livro, Temas, Pessoas) e a lista de colunas do
// painel Relações (que reaproveita a chave 'temas', já que é o mesmo
// conjunto de temas) têm cada um seu próprio corte. 0 = sem corte.
// Pedido do Victor, 27/09/2026.
export function getMinimoAparicoes(chave) {
    const valor = Number(localStorage.getItem(LS_PREFIX_EST + 'minimoAparicoes_' + chave));
    return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

export function definirMinimoAparicoes(chave, valor) {
    const n = Math.floor(Number(valor));
    if (!Number.isFinite(n) || n <= 0) {
        localStorage.removeItem(LS_PREFIX_EST + 'minimoAparicoes_' + chave);
    } else {
        localStorage.setItem(LS_PREFIX_EST + 'minimoAparicoes_' + chave, String(n));
    }
    notificarMudanca();
}

// Corte por mínimo de anos distintos — só o painel "ao longo do tempo"
// (Tema/Pessoa). Critério diferente do de minimoAparicoes: lá o que
// importa é volume total (barra pequena = ruído visual); aqui é span
// temporal (um item citado muitas vezes num único ano não mostra
// tendência nenhuma numa linha — vira um gráfico de um ponto só). Os
// dois cortes convivem: minimoAparicoes já reduz a lista de itens
// disponíveis pra esse painel (mesma chave 'tema'/'pessoa' usada nos
// gráficos de barra), e este aqui filtra por cima, só aqui, usando
// anosDistintosPorTema/anosDistintosPorPessoa (estatisticas-dados.js).
// Estado próprio por chave, independente do minimoAparicoes. 0 = sem
// corte. Pedido do Victor, 27/09/2026.
export function getMinimoAnos(chave) {
    const valor = Number(localStorage.getItem(LS_PREFIX_EST + 'minimoAnos_' + chave));
    return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

export function definirMinimoAnos(chave, valor) {
    const n = Math.floor(Number(valor));
    if (!Number.isFinite(n) || n <= 0) {
        localStorage.removeItem(LS_PREFIX_EST + 'minimoAnos_' + chave);
    } else {
        localStorage.setItem(LS_PREFIX_EST + 'minimoAnos_' + chave, String(n));
    }
    notificarMudanca();
}

// Remove de { labels, data, categorias? } as entradas cujo label está no
// conjunto de ocultos — mesmo espírito de filtrarPorIntervalo (função já
// existente logo abaixo), só que filtrando por identidade do item em vez
// de faixa de valor. Preserva `categorias` quando presente (gráfico de
// Etiquetas), pra não perder a cor de cada barra remanescente.
export function filtrarOcultos({ labels, data, categorias }, ocultos) {
    if (!ocultos || ocultos.size === 0)
        return categorias ? { labels, data, categorias } : { labels, data };

    const labelsF = [];
    const dataF = [];
    const catF = categorias ? [] : undefined;
    labels.forEach((l, i) => {
        if (ocultos.has(l)) return;
        labelsF.push(l);
        dataF.push(data[i]);
        if (catF) catF.push(categorias[i]);
    });
    return catF
        ? { labels: labelsF, data: dataF, categorias: catF }
        : { labels: labelsF, data: dataF };
}

// ─── Textos de terceiros (Biblioteca) ───────────────────────────
// Um texto é "de terceiros" quando tem ao menos um Autor vinculado e
// nenhum deles está marcado `souEu`. Coautoria e tradução sua contam como
// suas; texto sem autoria (ou só com autor excluído do cadastro) também.
// A separação só existe se algum Autor do acervo está marcado `souEu` —
// sem isso não há como saber o que é "seu", e a aba não deve mostrar
// zeros pra quem só carregou um pacote (demonstração, estudioso).
// Só as Estatísticas usam a regra: backups e exportações não mudam.

export function separacaoTerceirosAtiva() {
    return (db.autores || []).some((a) => a.souEu);
}

export function ehTextoDeTerceiros(texto) {
    if (!separacaoTerceirosAtiva()) return false;
    const pares = paresAutoria(texto, db.autores || []);
    return pares.length > 0 && !pares.some(({ autor }) => autor.souEu);
}

// Modo de exibição em relação a textos de terceiros:
// 'excluir'  — só os seus (padrão)
// 'incluir'  — seus + terceiros, misturados
// 'somente'  — só os de terceiros
export function getModoTerceiros() {
    const valor = lerJSON('modoTerceiros', null);
    if (valor === 'excluir' || valor === 'incluir' || valor === 'somente') return valor;
    // migração do formato antigo (checkbox booleano "incluirTerceiros")
    return lerJSON('incluirTerceiros', false) === true ? 'incluir' : 'excluir';
}

export function definirModoTerceiros(modo) {
    salvarJSON('modoTerceiros', modo);
    notificarMudanca();
}

// Mantidos por compatibilidade (código/testes que ainda tratam isso como
// um booleano): "incluir" == true, "excluir"/"somente" == false.
export function getIncluirTerceiros() {
    return getModoTerceiros() === 'incluir';
}

export function definirIncluirTerceiros(incluir) {
    definirModoTerceiros(incluir ? 'incluir' : 'excluir');
}

// Quantos textos de terceiros existem, e quantos textos ficam fora das
// contagens agora — de terceiros nos modos 'excluir', próprios no modo
// 'somente', nenhum no modo 'incluir'.
export function contarTerceiros() {
    const todos = [...db.poemas, ...db.prosas];
    const total = todos.filter(ehTextoDeTerceiros).length;
    const modo = getModoTerceiros();
    const excluidos = modo === 'incluir' ? 0 : modo === 'somente' ? todos.length - total : total;
    return { total, excluidos };
}

// ─── Filtros compartilhados: corpus, tipo e período ─────────────
const CHAVE_FILTRO_COMPARTILHADO = 'filtrosCompartilhados';

export function getFiltrosCompartilhados() {
    const salvo = lerJSON(CHAVE_FILTRO_COMPARTILHADO, null);
    if (!salvo) {
        const legado = getModoTerceiros();
        return {
            corpus: legado === 'incluir' ? 'tudo' : legado === 'somente' ? 'importadas' : 'meus',
            tipo: 'todos',
            autorId: '',
            anoDe: '',
            anoAte: '',
        };
    }
    // autorId cai pra '' (Todos os autores) tanto quando nunca foi
    // definido quanto quando o Autor salvo foi excluído do cadastro
    // depois — sem essa checagem, o filtro ficaria "preso" mostrando
    // sempre zero texto, sem pista visível do motivo.
    const autorSalvoExiste = (db.autores || []).some((a) => String(a.id) === String(salvo.autorId));
    return {
        corpus: ['meus', 'importadas', 'tudo'].includes(salvo.corpus) ? salvo.corpus : 'meus',
        tipo: ['todos', 'poemas', 'prosas'].includes(salvo.tipo) ? salvo.tipo : 'todos',
        autorId: autorSalvoExiste ? String(salvo.autorId) : '',
        anoDe: salvo.anoDe === '' || salvo.anoDe == null ? '' : String(salvo.anoDe),
        anoAte: salvo.anoAte === '' || salvo.anoAte == null ? '' : String(salvo.anoAte),
    };
}

export function definirFiltrosCompartilhados(parcial = {}) {
    const atual = getFiltrosCompartilhados();
    const proximo = { ...atual, ...parcial };
    if (!['meus', 'importadas', 'tudo'].includes(proximo.corpus)) proximo.corpus = atual.corpus;
    if (!['todos', 'poemas', 'prosas'].includes(proximo.tipo)) proximo.tipo = atual.tipo;
    proximo.autorId = proximo.autorId ? String(proximo.autorId) : '';
    salvarJSON(CHAVE_FILTRO_COMPARTILHADO, proximo);
    notificarMudanca();
}

export function textoEntraNoFiltroEstatisticas(texto, tipo = null) {
    const filtro = getFiltrosCompartilhados();
    if (filtro.corpus === 'importadas' && !ehTextoDeTerceiros(texto)) return false;
    if (filtro.corpus === 'meus' && ehTextoDeTerceiros(texto)) return false;
    if (filtro.autorId) {
        const pares = paresAutoria(texto, db.autores || []);
        if (!pares.some(({ autor }) => String(autor.id) === filtro.autorId)) return false;
    }
    if (tipo && filtro.tipo !== 'todos' && filtro.tipo !== tipo) return false;
    const ano = parseInt(anoDeDataParcial(texto.dataEscrita) ?? texto.ano);
    if (filtro.anoDe !== '' && (!ano || ano < Number(filtro.anoDe))) return false;
    if (filtro.anoAte !== '' && (!ano || ano > Number(filtro.anoAte))) return false;
    return true;
}

export function getCorpusEstatisticas() {
    return getFiltrosCompartilhados().corpus;
}
export function getTipoEstatisticas() {
    return getFiltrosCompartilhados().tipo;
}
// Autor selecionado no filtro compartilhado ('' = Todos os autores) —
// gap notado pelo Victor (27/09/2026): até aqui só existia a separação
// binária meus/importadas/tudo (via `souEu`), sem como recortar por um
// Autor específico entre vários de terceiros (ex. Fernando Pessoa vs.
// Machado de Assis, uma vez que a Biblioteca de domínio público
// crescer). Motivado originalmente pelo gráfico de Gênero das pessoas
// retratadas (ver agregarPorGenero em estatisticas-dados.js), mas vale
// pra aba inteira, como os outros filtros compartilhados.
export function getAutorEstatisticas() {
    return getFiltrosCompartilhados().autorId;
}
export function getPeriodoEstatisticas() {
    const { anoDe, anoAte } = getFiltrosCompartilhados();
    return { anoDe, anoAte };
}
export function limparFiltrosCompartilhados() {
    salvarJSON(CHAVE_FILTRO_COMPARTILHADO, {
        corpus: 'meus',
        tipo: 'todos',
        autorId: '',
        anoDe: '',
        anoAte: '',
    });
    notificarMudanca();
}

export { TIPOS_ETIQUETA, ROTULOS_TIPOS_ETIQUETA, CORES_TIPOS_ETIQUETA, escapeParaOnclick };
