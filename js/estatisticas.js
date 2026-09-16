// ============================================================
// estatisticas.js — Painel de estatísticas: palavras, temas,
// pessoas, distribuição por ano e por livro/coletânea.
// ============================================================

import { db } from './db.js';
import {
    escapeHtml,
    anoDeDataParcial,
    SINALIZACOES_CATEGORIAS,
    paresGrupoPessoa,
} from './utils.js';

const STOPWORDS = new Set([
    'a',
    'o',
    'as',
    'os',
    'um',
    'uma',
    'uns',
    'umas',
    'de',
    'do',
    'da',
    'dos',
    'das',
    'em',
    'no',
    'na',
    'nos',
    'nas',
    'por',
    'para',
    'pra',
    'pro',
    'pros',
    'pras',
    'com',
    'sem',
    'sob',
    'sobre',
    'entre',
    'até',
    'após',
    'ante',
    'perante',
    'desde',
    'contra',
    'e',
    'ou',
    'mas',
    'nem',
    'que',
    'se',
    'quando',
    'como',
    'porque',
    'pois',
    'porém',
    'contudo',
    'todavia',
    'eu',
    'tu',
    'ele',
    'ela',
    'nós',
    'vós',
    'eles',
    'elas',
    'me',
    'te',
    'se',
    'nos',
    'vos',
    'lhe',
    'lhes',
    'lo',
    'la',
    'meu',
    'minha',
    'meus',
    'minhas',
    'teu',
    'tua',
    'teus',
    'tuas',
    'seu',
    'sua',
    'seus',
    'suas',
    'nosso',
    'nossa',
    'nossos',
    'nossas',
    'este',
    'esta',
    'estes',
    'estas',
    'esse',
    'essa',
    'esses',
    'essas',
    'aquele',
    'aquela',
    'aqueles',
    'aquelas',
    'isto',
    'isso',
    'aquilo',
    'this',
    'that',
    'é',
    'foi',
    'ser',
    'são',
    'era',
    'eram',
    'está',
    'estão',
    'estava',
    'estavam',
    'ter',
    'tem',
    'têm',
    'tinha',
    'tinham',
    'há',
    'havia',
    'seja',
    'sejam',
    'será',
    'serão',
    'sido',
    'sendo',
    'estar',
    'estado',
    'faz',
    'fazer',
    'não',
    'sim',
    'mais',
    'menos',
    'muito',
    'muita',
    'muitos',
    'muitas',
    'pouco',
    'pouca',
    'poucos',
    'poucas',
    'já',
    'ainda',
    'também',
    'só',
    'apenas',
    'bem',
    'mal',
    'assim',
    'aqui',
    'ali',
    'lá',
    'onde',
    'aonde',
    'cá',
    'então',
    'enquanto',
    'embora',
    'caso',
    'cada',
    'todo',
    'toda',
    'todos',
    'todas',
    'outro',
    'outra',
    'outros',
    'outras',
    'algum',
    'alguma',
    'alguns',
    'algumas',
    'nenhum',
    'nenhuma',
    'qualquer',
    'quaisquer',
    'meu',
    'seu',
    'dele',
    'dela',
    'deles',
    'delas',
    'lhe',
    'consigo',
    'si',
    'vossa',
    'vosso',
    'ao',
    'aos',
    'à',
    'às',
    'pelo',
    'pela',
    'pelos',
    'pelas',
    'num',
    'numa',
    'nuns',
    'numas',
    'dum',
    'duma',
    'qual',
    'quais',
    'quem',
    'cujo',
    'cuja',
    'cujos',
    'cujas',
    'tão',
    'tal',
    'tanto',
    'tanta',
    'tantos',
    'tantas',
    'sob',
    'sobre',
    'as',
    'os',
    'um',
    'uma',
    'foi',
    'ser',
    'ter',
    'vai',
    'vou',
    'vem',
    'vir',
    'quer',
    'ver',
    'dar',
    'deu',
    'dá',
    'dão',
    'fui',
    'foi',
    'isso',
    'isto',
    'aqui',
    'lá',
    'cá',
    'aí',
    'né',
    'tá',
    'tô',
    'num',
    'numas',
    'dum',
    'duma',
    // pronomes pessoais e de tratamento
    'você',
    'voce',
    'vocês',
    'voces',
    'vc',
    'vcs',
    'te',
    'ti',
    'si',
    // indefinidos e quantificadores genéricos
    'tudo',
    'mesmo',
    'mesma',
    'mesmos',
    'mesmas',
    //!!! 'quanto','quanta','quantos','quantas',
    // advérbios genéricos de tempo
    //!!! 'agora','depois','antes','sempre','nunca','jamais','talvez','quase','logo',
    //'hoje','ontem'
]);

function limparTexto(texto) {
    if (!texto) return '';
    return texto
        .replace(/<[^>]+>/g, ' ') // remove tags HTML (divs/spans de formatação do editor)
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/g, ' ');
}

function tokenizar(texto) {
    return (
        limparTexto(texto)
            .toLowerCase()
            .normalize('NFC')
            .match(/[a-zà-úçãõâêîôû]+/g) || []
    );
}

function listaDeCampo(valor) {
    if (!valor) return [];
    return valor
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

// ─── Preferências da aba (persistidas em localStorage) ─────────
// Mesmo padrão já usado em colunas.js/acoes-coluna.js: cada escolha do
// usuário nessa aba (tipos de Etiqueta marcados, modo do gráfico de
// Pessoas, filtro de grupo, itens ocultos) fica salva no navegador pra
// não precisar reconfigurar toda vez que a aba é reaberta.
const LS_PREFIX_EST = 'arquivoPoetico_est_';

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

// Mesmas 8 categorias de SINALIZACOES_CATEGORIAS (utils.js), na mesma
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
    tema: '#10b981',
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
    renderEstatisticas();
}

// ─── Gráfico de Pessoas: modo (por pessoa / por grupo) + filtro ────

export function getModoGraficoPessoas() {
    const valor = localStorage.getItem(LS_PREFIX_EST + 'modoPessoas');
    return valor === 'grupo' ? 'grupo' : 'pessoa';
}

export function definirModoGraficoPessoas(modo) {
    localStorage.setItem(LS_PREFIX_EST + 'modoPessoas', modo === 'grupo' ? 'grupo' : 'pessoa');
    renderEstatisticas();
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
    renderEstatisticas();
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
    renderEstatisticas();
}

export function restaurarOcultosGrafico(chave) {
    localStorage.removeItem(LS_PREFIX_EST + 'ocultos_' + chave);
    renderEstatisticas();
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

// Corta { labels, data, categorias? } pros `n` primeiros — usado depois
// de filtrarOcultos, pra ocultar um item promover o próximo pro Top N em
// vez de simplesmente encolher a lista visível.
function topN({ labels, data, categorias }, n) {
    return categorias
        ? { labels: labels.slice(0, n), data: data.slice(0, n), categorias: categorias.slice(0, n) }
        : { labels: labels.slice(0, n), data: data.slice(0, n) };
}

// ─── Resolução de Livro (pra agrupar Por Livro / Por Ano) ──────

function livroIdDoItem(item) {
    if (item.paiTipo === 'livro') return item.paiId;
    if (item.paiTipo === 'parte') {
        const p = db.partes.find((x) => x.id == item.paiId);
        return p ? p.livroId : null;
    }
    if (item.paiTipo === 'secao') {
        const s = db.secoes.find((x) => x.id == item.paiId);
        if (!s) return null;
        if (s.paiTipo === 'parte') {
            const p = db.partes.find((x) => x.id == s.paiId);
            return p ? p.livroId : null;
        }
        return s.paiId;
    }
    return null;
}

function todosOsTextos() {
    return [...db.poemas, ...db.prosas];
}

// ─── Agregações ─────────────────────────────────────────────

export function contarPorAno() {
    const contagem = {};
    todosOsTextos().forEach((t) => {
        // dataEscrita é a fonte de verdade; t.ano é só um espelho legado
        // que nem sempre fica sincronizado (ver forms.js). Cai pro legado
        // apenas se não houver dataEscrita.ano de jeito nenhum.
        const ano = parseInt(anoDeDataParcial(t.dataEscrita) ?? t.ano);
        if (!ano) return;
        contagem[ano] = (contagem[ano] || 0) + 1;
    });
    const anos = Object.keys(contagem)
        .map(Number)
        .sort((a, b) => a - b);
    return { labels: anos.map(String), data: anos.map((a) => contagem[a]) };
}

export function contarPorLivro() {
    const contagem = {};
    todosOsTextos().forEach((t) => {
        const livroId = livroIdDoItem(t);
        const livro = livroId ? db.livros.find((l) => l.id == livroId) : null;
        const nome = livro ? livro.siglaOficial || livro.siglaPessoal || livro.titulo : 'Avulso';
        contagem[nome] = (contagem[nome] || 0) + 1;
    });
    (db.coletaneas || []).forEach((c) => {
        const qtd = (db.itensColetanea || []).filter(
            (i) => String(i.coletaneaId) === String(c.id),
        ).length;
        if (qtd > 0) contagem[`${c.titulo}`] = qtd;
    });
    // Coletâneas reais vivem em db.livros (tipo === 'Coletânea'); cada uma tem
    // Partes (db.partes, livroId = id da coletânea) e cada Parte tem Itens em
    // db.itensColetanea (parteId). O campo db.coletaneas acima é legado e
    // nunca é preenchido pela aba Coletâneas — mantido só por compatibilidade.
    db.livros
        .filter((l) => l.tipo === 'Coletânea')
        .forEach((col) => {
            const partesIds = db.partes.filter((p) => p.livroId == col.id).map((p) => String(p.id));
            const qtd = (db.itensColetanea || []).filter((i) =>
                partesIds.includes(String(i.parteId)),
            ).length;
            if (qtd > 0) {
                const sigla = col.siglaOficial || col.siglaPessoal || col.titulo;
                contagem[`${sigla}`] = qtd;
            }
        });
    const ordenado = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    return { labels: ordenado.map((o) => o[0]), data: ordenado.map((o) => o[1]) };
}

// Agregação completa (sem corte de Top N) por Etiqueta, só dentre os
// `tipos` informados (chaves de SINALIZACOES_CATEGORIAS — ex.: só
// 'tema' e 'tom', ou os 8 combinados como no comportamento antigo).
// `categorias[i]` é a categoria de origem de `labels[i]` (a primeira em
// que a tag aparece, se o mesmo nome de tag existir em mais de uma
// categoria selecionada — caso raro, mas possível já que cada categoria
// é um campo de texto livre independente).
export function agregarPorTema(tipos = getTiposEtiquetaSelecionados()) {
    const tiposValidos = tipos.filter((t) => TIPOS_ETIQUETA.includes(t));
    const tiposAUsar = tiposValidos.length ? tiposValidos : TIPOS_ETIQUETA;

    const contagem = {};
    const categoriaDoLabel = {};
    todosOsTextos().forEach((t) => {
        tiposAUsar.forEach((tipoKey) => {
            listaDeCampo(t[SINALIZACOES_CATEGORIAS[tipoKey]]).forEach((tag) => {
                contagem[tag] = (contagem[tag] || 0) + 1;
                if (!categoriaDoLabel[tag]) categoriaDoLabel[tag] = tipoKey;
            });
        });
    });
    const ordenado = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    return {
        labels: ordenado.map((o) => o[0]),
        data: ordenado.map((o) => o[1]),
        categorias: ordenado.map((o) => categoriaDoLabel[o[0]]),
    };
}

export function contarPorTema(top = 12, tipos = getTiposEtiquetaSelecionados()) {
    return topN(agregarPorTema(tipos), top);
}

// Agregação completa (sem corte de Top N) do gráfico de Pessoas.
// `opcoes.modo`: 'pessoa' (padrão) conta por Pessoa — cada uma das
// pessoas do item.pessoas, opcionalmente restrita às que pertencem a
// algum grupo em `opcoes.grupoIds` (vazio = sem restrição); 'grupo'
// conta por Grupo, via paresGrupoPessoa (utils.js) — mesma convenção já
// usada ali: uma pessoa em mais de um grupo gera um par por grupo, não
// uma linha combinada, então um item com 2 pessoas do mesmo grupo soma
// 2 pro grupo (uma dedicatória por pessoa envolvida).
export function agregarPorPessoa(opcoes = {}) {
    const modo =
        opcoes.modo === 'grupo' || opcoes.modo === 'pessoa' ? opcoes.modo : getModoGraficoPessoas();
    const grupoIds = opcoes.grupoIds || getGruposFiltroPessoas();

    const contagem = {};
    if (modo === 'grupo') {
        todosOsTextos().forEach((t) => {
            paresGrupoPessoa(t, db.pessoas, db.grupos).forEach(({ grupo }) => {
                contagem[grupo.nome] = (contagem[grupo.nome] || 0) + 1;
            });
        });
    } else {
        const setGrupoFiltro = new Set((grupoIds || []).map(String));
        todosOsTextos().forEach((t) => {
            if (!Array.isArray(t.pessoas)) return;
            t.pessoas.forEach((p) => {
                const pessoa = db.pessoas.find((x) => x.id === p.pessoaId);
                if (!pessoa) return;
                if (
                    setGrupoFiltro.size &&
                    !(pessoa.grupoIds || []).some((g) => setGrupoFiltro.has(String(g)))
                ) {
                    return;
                }
                contagem[pessoa.nome] = (contagem[pessoa.nome] || 0) + 1;
            });
        });
    }
    const ordenado = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    return { labels: ordenado.map((o) => o[0]), data: ordenado.map((o) => o[1]) };
}

export function contarPorPessoa(top = 12, opcoes = {}) {
    return topN(agregarPorPessoa(opcoes), top);
}

export function palavrasMaisFrequentes(livroId = '', top = 40) {
    let textos;
    if (!livroId) {
        textos = todosOsTextos();
    } else {
        const livroSel = db.livros.find((l) => String(l.id) === String(livroId));
        if (livroSel && livroSel.tipo === 'Coletânea') {
            // Coletâneas: textos estão em db.itensColetanea referenciando poemas/prosas por refId
            const partesIds = db.partes
                .filter((p) => String(p.livroId) === String(livroId))
                .map((p) => String(p.id));
            const refs = (db.itensColetanea || []).filter(
                (i) =>
                    partesIds.includes(String(i.parteId)) &&
                    (i.textoOverride || (i.refId && i.refTipo)),
            );
            textos = refs
                .map((i) => {
                    if (i.textoOverride) return { texto: i.textoOverride };
                    const col = db[i.refTipo + 's'];
                    return col?.find((x) => x.id == i.refId) || null;
                })
                .filter(Boolean);
        } else {
            textos = todosOsTextos().filter((t) => String(livroIdDoItem(t)) === String(livroId));
        }
    }

    const contagem = {};
    textos.forEach((t) => {
        tokenizar(t.texto).forEach((palavra) => {
            if (palavra.length < 3 || STOPWORDS.has(palavra)) return;
            contagem[palavra] = (contagem[palavra] || 0) + 1;
        });
    });
    return Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, top);
}

export function resumoGeral() {
    const textos = todosOsTextos();
    const totalPalavras = textos.reduce((soma, t) => soma + tokenizar(t.texto).length, 0);
    const porAno = contarPorAno();

    let anoMaisProdutivo = '—';
    if (porAno.labels.length) {
        const idxMax = porAno.data.indexOf(Math.max(...porAno.data));
        anoMaisProdutivo = porAno.labels[idxMax];
    }

    const porLivro = contarPorLivro();
    const livroComMais = porLivro.labels.length ? porLivro.labels[0] : '—';

    return {
        totalPoemas: db.poemas.length,
        totalProsas: db.prosas.length,
        totalPalavras,
        mediaPalavras: textos.length ? Math.round(totalPalavras / textos.length) : 0,
        anoMaisProdutivo,
        livroComMais,
    };
}

// ─── Renderização (cards + gráficos com Chart.js) ──────────────

const graficos = {}; // guarda instâncias do Chart.js pra poder destruir/recriar

// Filtra { labels, data } mantendo só os pares cujo valor está dentro do
// intervalo [min, max]. min/max vazios (null/'') = sem limite naquele lado.
export function filtrarPorIntervalo({ labels, data }, min, max) {
    const temMin = min !== null && min !== '' && !isNaN(min);
    const temMax = max !== null && max !== '' && !isNaN(max);
    if (!temMin && !temMax) return { labels, data };

    const minN = temMin ? Number(min) : -Infinity;
    const maxN = temMax ? Number(max) : Infinity;

    const labelsFiltrados = [];
    const dataFiltrada = [];
    labels.forEach((l, i) => {
        const v = data[i];
        if (v >= minN && v <= maxN) {
            labelsFiltrados.push(l);
            dataFiltrada.push(v);
        }
    });
    return { labels: labelsFiltrados, data: dataFiltrada };
}

function lerIntervalo(sufixo) {
    const min = document.getElementById(`est-min-${sufixo}`)?.value ?? '';
    const max = document.getElementById(`est-max-${sufixo}`)?.value ?? '';
    return [min, max];
}

function coresGrafico() {
    const escuro = document.documentElement.classList.contains('dark');
    return {
        texto: escuro ? '#94a3b8' : '#374151',
        grade: escuro ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
    };
}

function criarBarChart(canvasId, labels, data, cor) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Chart.js é carregado via CDN; pode não estar pronto no primeiro render.
    // Aguarda até 3s em intervalos de 100ms antes de desistir.
    if (typeof Chart === 'undefined') {
        let tentativas = 0;
        const espera = setInterval(() => {
            tentativas++;
            if (typeof Chart !== 'undefined') {
                clearInterval(espera);
                criarBarChart(canvasId, labels, data, cor);
            } else if (tentativas >= 30) {
                clearInterval(espera);
                console.warn('Chart.js não carregou a tempo para', canvasId);
            }
        }, 100);
        return;
    }

    if (graficos[canvasId]) graficos[canvasId].destroy();

    const cores = coresGrafico();
    graficos[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: cor, borderRadius: 4 }] },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: cores.texto }, grid: { color: cores.grade } },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: cores.texto },
                    grid: { color: cores.grade },
                },
            },
        },
    });
}

function renderResumo() {
    const container = document.getElementById('est-resumo');
    if (!container) return;
    const r = resumoGeral();

    const cartoes = [
        ['Poemas', r.totalPoemas],
        ['Prosas', r.totalProsas],
        ['Palavras (total)', r.totalPalavras.toLocaleString('pt-BR')],
        ['Média de palavras/texto', r.mediaPalavras],
        ['Ano mais produtivo', r.anoMaisProdutivo],
        ['Livro com mais textos', r.livroComMais],
    ];

    container.innerHTML = cartoes
        .map(
            ([rotulo, valor]) => `
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
            <div class="text-2xl font-black text-blue-700 dark:text-blue-300">${escapeHtml(valor)}</div>
            <div class="text-[10px] uppercase text-gray-400 dark:text-slate-500 font-bold mt-1">${rotulo}</div>
        </div>`,
        )
        .join('');
}

function popularSeletorLivroPalavras() {
    const sel = document.getElementById('est-livro-palavras');
    if (!sel) return;
    const valorAtual = sel.value;
    const livrosComuns = db.livros.filter((l) => l.tipo !== 'Coletânea');
    const coletaneas = db.livros.filter((l) => l.tipo === 'Coletânea');
    const label = (l) => escapeHtml(l.siglaOficial || l.siglaPessoal || l.titulo);
    sel.innerHTML =
        '<option value="">-- Todo o acervo --</option>' +
        (livrosComuns.length
            ? '<optgroup label="Livros">' +
              livrosComuns.map((l) => `<option value="${l.id}">${label(l)}</option>`).join('') +
              '</optgroup>'
            : '') +
        (coletaneas.length
            ? '<optgroup label="Coletâneas">' +
              coletaneas
                  .map((l) => `<option value="${l.id}">${label(l)} (col.)</option>`)
                  .join('') +
              '</optgroup>'
            : '');
    if (Array.from(sel.options).some((o) => o.value === valorAtual)) sel.value = valorAtual;
}

function renderListaPalavras() {
    const container = document.getElementById('lista-palavras');
    if (!container) return;
    const livroId = document.getElementById('est-livro-palavras')?.value || '';
    const palavras = palavrasMaisFrequentes(livroId, 40);

    container.innerHTML = palavras.length
        ? palavras
              .map(
                  ([palavra, n], i) => `
            <div class="flex justify-between items-center px-2 py-1 rounded ${i < 3 ? 'bg-blue-50 dark:bg-blue-950' : ''}">
                <span class="text-gray-700 dark:text-slate-200">${escapeHtml(palavra)}</span>
                <span class="text-gray-400 dark:text-slate-500 font-mono text-xs">${n}</span>
            </div>`,
              )
              .join('')
        : '<p class="text-gray-400 dark:text-slate-500 col-span-full">Sem texto suficiente pra analisar ainda.</p>';
}

function montarPainel(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

// Painel de checkboxes por tipo de Etiqueta (popover "🏷️ Tipos ▾" do
// gráfico de Etiquetas) — cada linha já mostra a bolinha da cor daquele
// tipo, pra reconhecer de cara qual cor vai virar cada barra.
function renderSeletorTiposEtiqueta() {
    const selecionados = new Set(getTiposEtiquetaSelecionados());
    return TIPOS_ETIQUETA.map(
        (tipo) => `
        <label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap">
            <input type="checkbox" ${selecionados.has(tipo) ? 'checked' : ''}
                onchange="toggleTipoEtiqueta('${tipo}', this.checked)">
            <span class="inline-block w-2 h-2 rounded-full" style="background:${CORES_TIPOS_ETIQUETA[tipo]}"></span>
            ${ROTULOS_TIPOS_ETIQUETA[tipo]}
        </label>`,
    ).join('');
}

// Legenda de cor abaixo do gráfico de Etiquetas — só aparece quando o
// Top N atual mistura 2+ tipos diferentes (com 1 tipo só, a cor não
// carrega informação nenhuma, é só decoração).
function renderLegendaTipos(categoriasNoGrafico) {
    const unicas = Array.from(new Set(categoriasNoGrafico)).filter(Boolean);
    if (unicas.length < 2) return '';
    return unicas
        .map(
            (cat) => `
        <span class="inline-flex items-center gap-1 mr-3">
            <span class="inline-block w-2 h-2 rounded-full" style="background:${CORES_TIPOS_ETIQUETA[cat]}"></span>
            ${ROTULOS_TIPOS_ETIQUETA[cat]}
        </span>`,
        )
        .join('');
}

// Par de botões "Por pessoa" / "Por grupo" do gráfico de Pessoas.
function renderSeletorModoPessoas() {
    const modo = getModoGraficoPessoas();
    const botao = (valor, rotulo) => `
        <button type="button" onclick="definirModoGraficoPessoas('${valor}')"
            class="px-2 py-0.5 rounded text-[11px] font-semibold ${
                modo === valor
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
            }">${rotulo}</button>`;
    return botao('pessoa', 'Por pessoa') + botao('grupo', 'Por grupo');
}

// Painel de checkboxes por Grupo (popover "👥 Grupos ▾") — restringe o
// modo "Por pessoa" às pessoas de algum dos grupos marcados. Só faz
// sentido nesse modo; renderEstatisticas() decide se mostra isso ou o
// aviso de "não se aplica" conforme o modo atual.
function renderSeletorGrupoFiltroPessoas() {
    if (!db.grupos.length) {
        return '<p class="text-[11px] text-gray-400 dark:text-slate-500 px-1">Nenhum grupo cadastrado.</p>';
    }
    const selecionados = new Set(getGruposFiltroPessoas().map(String));
    return db.grupos
        .map(
            (g) => `
        <label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap">
            <input type="checkbox" ${selecionados.has(String(g.id)) ? 'checked' : ''}
                onchange="toggleGrupoFiltroPessoas('${g.id}', this.checked)">
            ${escapeHtml(g.nome)}
        </label>`,
        )
        .join('');
}

// Painel de checkboxes "ocultar item" (popover "🚫 Ocultar ▾"), comum
// aos 4 gráficos — `labels` é a lista completa (sem corte de Top N) já
// filtrada pelo que se aplica (tipos/modo/grupo), pra ocultar algo que
// nem está no Top N atual mesmo assim funcionar quando ele entrar.
function renderSeletorOcultos(chave, labels) {
    if (!labels.length) {
        return '<p class="text-[11px] text-gray-400 dark:text-slate-500 px-1">Nada pra ocultar ainda.</p>';
    }
    const ocultos = getOcultosGrafico(chave);
    const restaurar = ocultos.size
        ? `<button type="button" onclick="restaurarOcultosGrafico('${chave}')"
            class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline block mb-1.5">
            Mostrar todos (${ocultos.size} oculto${ocultos.size > 1 ? 's' : ''})
          </button>`
        : '';
    return (
        restaurar +
        labels
            .map(
                (label) => `
        <label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap">
            <input type="checkbox" ${ocultos.has(label) ? 'checked' : ''}
                onchange="toggleOcultoItem('${chave}', '${escapeParaOnclick(label)}')">
            ${escapeHtml(label)}
        </label>`,
            )
            .join('')
    );
}

export function renderEstatisticas() {
    renderResumo();
    popularSeletorLivroPalavras();
    renderListaPalavras();

    // ── Textos por Ano ──
    const baseAno = contarPorAno();
    const [minAno, maxAno] = lerIntervalo('ano');
    const porAno = filtrarPorIntervalo(
        filtrarOcultos(baseAno, getOcultosGrafico('ano')),
        minAno,
        maxAno,
    );
    criarBarChart('grafico-ano', porAno.labels, porAno.data, '#1d4ed8');
    montarPainel('painel-ocultos-ano', renderSeletorOcultos('ano', baseAno.labels));

    // ── Textos por Livro/Coletânea ──
    const baseLivro = contarPorLivro();
    const [minLivro, maxLivro] = lerIntervalo('livro');
    const porLivro = filtrarPorIntervalo(
        filtrarOcultos(baseLivro, getOcultosGrafico('livro')),
        minLivro,
        maxLivro,
    );
    criarBarChart('grafico-livro', porLivro.labels, porLivro.data, '#4f46e5');
    montarPainel('painel-ocultos-livro', renderSeletorOcultos('livro', baseLivro.labels));

    // ── Etiquetas mais frequentes (filtro por tipo + cor por tipo) ──
    const tiposSelecionados = getTiposEtiquetaSelecionados();
    const baseTemas = agregarPorTema(tiposSelecionados);
    const categoriaPorLabelTema = new Map(
        baseTemas.labels.map((l, i) => [l, baseTemas.categorias[i]]),
    );
    const [minTemas, maxTemas] = lerIntervalo('temas');
    let porTema = topN(filtrarOcultos(baseTemas, getOcultosGrafico('temas')), 12);
    porTema = filtrarPorIntervalo(porTema, minTemas, maxTemas);
    const categoriasNoGrafico = porTema.labels.map((l) => categoriaPorLabelTema.get(l));
    const coresPorBarra = categoriasNoGrafico.map(
        (cat) => CORES_TIPOS_ETIQUETA[cat] || CORES_TIPOS_ETIQUETA.outros,
    );
    criarBarChart('grafico-temas', porTema.labels, porTema.data, coresPorBarra);
    montarPainel('legenda-temas', renderLegendaTipos(categoriasNoGrafico));
    montarPainel('painel-tipos-etiqueta', renderSeletorTiposEtiqueta());
    montarPainel('painel-ocultos-temas', renderSeletorOcultos('temas', baseTemas.labels));

    // ── Pessoas mais dedicadas (por pessoa ou por grupo) ──
    const modoPessoas = getModoGraficoPessoas();
    const chaveOcultosPessoas = 'pessoas-' + modoPessoas;
    const basePessoas = agregarPorPessoa({ modo: modoPessoas, grupoIds: getGruposFiltroPessoas() });
    const [minPessoas, maxPessoas] = lerIntervalo('pessoas');
    let porPessoa = topN(filtrarOcultos(basePessoas, getOcultosGrafico(chaveOcultosPessoas)), 12);
    porPessoa = filtrarPorIntervalo(porPessoa, minPessoas, maxPessoas);
    criarBarChart('grafico-pessoas', porPessoa.labels, porPessoa.data, '#e11d48');
    montarPainel('painel-modo-pessoas', renderSeletorModoPessoas());
    montarPainel(
        'painel-grupo-pessoas',
        modoPessoas === 'pessoa'
            ? renderSeletorGrupoFiltroPessoas()
            : '<p class="text-[11px] text-gray-400 dark:text-slate-500 px-1">Filtro de grupo só se aplica no modo "Por pessoa".</p>',
    );
    montarPainel(
        'painel-ocultos-pessoas',
        renderSeletorOcultos(chaveOcultosPessoas, basePessoas.labels),
    );
}

window.addEventListener('db:saved', () => {
    // só recalcula se a aba de Estatísticas estiver visível, pra não gastar
    // processamento toda hora que algo é salvo em outra aba
    if (document.getElementById('estatisticas')?.classList.contains('active')) {
        renderEstatisticas();
    }
});

// Troca de tema (ver theme.js) muda as cores fixas do Chart.js — não dá pra
// resolver só com CSS, então redesenha os gráficos se a aba estiver aberta.
window.addEventListener('tema:alterado', () => {
    if (document.getElementById('estatisticas')?.classList.contains('active')) {
        renderEstatisticas();
    }
});
