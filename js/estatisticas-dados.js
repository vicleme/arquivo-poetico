// ============================================================
// estatisticas-dados.js — agregações e cálculos das Estatísticas.
// Sem DOM: recebe o estado compartilhado dos filtros de estatísticas.
// ============================================================

import { db, cadeiaAncestraisGrupo } from './db.js';
import {
    anoDeDataParcial,
    paresGrupoPessoa,
    tokenizar,
    SINALIZACOES_CATEGORIAS,
    textoDeEtiquetas,
    contarTextosPorAssunto,
    assuntosComPapel,
    nomesTemasPorPapel,
    temasComPapel,
    papelMaisForte,
    chaveTema,
    IDENTIDADES_CIS_TRANS,
} from './utils.js';
import {
    getTiposEtiquetaSelecionados,
    getModoGraficoPessoas,
    getPapelTemaEstatisticas,
    getPapelAssuntoEstatisticas,
    getGruposFiltroPessoas,
    textoEntraNoFiltroEstatisticas,
    TIPOS_ETIQUETA,
} from './estatisticas-filtros.js';

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

function topN({ labels, data, categorias }, n) {
    return categorias
        ? { labels: labels.slice(0, n), data: data.slice(0, n), categorias: categorias.slice(0, n) }
        : { labels: labels.slice(0, n), data: data.slice(0, n) };
}

// ─── Textos de terceiros (Biblioteca) ───────────────────────────
// Um texto é "de terceiros" quando tem ao menos um Autor vinculado e
// nenhum deles está marcado `souEu`. Coautoria e tradução sua contam como
// suas; texto sem autoria (ou só com autor excluído do cadastro) também.
// A separação só existe se algum Autor do acervo está marcado `souEu` —
// sem isso não há como saber o que é "seu", e a aba não deve mostrar
// Texto entra nas contagens? depende do modo atual.
function textoConta(texto) {
    const tipo = db.poemas.includes(texto) ? 'poemas' : db.prosas.includes(texto) ? 'prosas' : null;
    return textoEntraNoFiltroEstatisticas(texto, tipo);
}

// Item de coletânea conta se não aponta pra um texto de terceiros excluído.
// textoOverride e referência não resolvida contam sempre (sem autoria a
// checar).
function itemColetaneaConta(item) {
    if (!item.refId || !item.refTipo || item.textoOverride) return true;
    const alvo = (db[item.refTipo + 's'] || []).find((x) => x.id == item.refId);
    return alvo
        ? textoEntraNoFiltroEstatisticas(
              alvo,
              item.refTipo === 'poema' ? 'poemas' : item.refTipo === 'prosa' ? 'prosas' : null,
          )
        : true;
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

function poemasContados() {
    return db.poemas.filter(textoConta);
}

function prosasContadas() {
    return db.prosas.filter(textoConta);
}

function todosOsTextos() {
    return [...poemasContados(), ...prosasContadas()];
}

// Textos que entram nas Estatísticas agora (corpus, tipo, autor e período já
// aplicados). Os gráficos de Local e Idioma partem daqui.
export function textosDasEstatisticas() {
    return todosOsTextos();
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

const MESES_SAZONALIDADE = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];

function mesDeDataEscrita(dataObj) {
    const mes = Number(dataObj?.mes);
    return Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : null;
}

export function contarPorMesEscrita() {
    const contagem = Array(12).fill(0);
    todosOsTextos().forEach((t) => {
        const mes = mesDeDataEscrita(t.dataEscrita);
        if (mes != null) contagem[mes - 1]++;
    });
    return { labels: MESES_SAZONALIDADE, data: contagem };
}

export function sazonalidadePorAno() {
    const porAno = new Map();
    todosOsTextos().forEach((t) => {
        const ano = Number(anoDeDataParcial(t.dataEscrita) ?? t.ano);
        const mes = mesDeDataEscrita(t.dataEscrita);
        if (!ano || mes == null) return;
        if (!porAno.has(ano)) porAno.set(ano, Array(12).fill(0));
        porAno.get(ano)[mes - 1]++;
    });
    return [...porAno.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([ano, meses]) => {
            const total = meses.reduce((s, n) => s + n, 0);
            const trimestres = [0, 1, 2, 3].map((q) =>
                meses.slice(q * 3, q * 3 + 3).reduce((s, n) => s + n, 0),
            );
            return {
                ano,
                total,
                meses,
                trimestres,
                percentuais: trimestres.map((n) =>
                    total ? Math.round((n / total) * 1000) / 10 : 0,
                ),
            };
        });
}

export function distribuicaoPorTrimestre() {
    const dados = sazonalidadePorAno();
    const somas = [0, 0, 0, 0];
    dados.forEach((d) =>
        d.trimestres.forEach((n, i) => {
            somas[i] += n;
        }),
    );
    const total = somas.reduce((s, n) => s + n, 0);
    return {
        labels: ['1º trimestre', '2º trimestre', '3º trimestre', '4º trimestre'],
        data: somas,
        percentuais: somas.map((n) => (total ? Math.round((n / total) * 1000) / 10 : 0)),
        total,
    };
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
            (i) => String(i.coletaneaId) === String(c.id) && itemColetaneaConta(i),
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
            const qtd = (db.itensColetanea || []).filter(
                (i) => partesIds.includes(String(i.parteId)) && itemColetaneaConta(i),
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
            // 'tema' respeita o seletor "Papel do tema"; as demais categorias não.
            const tags =
                tipoKey === 'tema'
                    ? temasDoTexto(t)
                    : listaDeCampo(textoDeEtiquetas(t[SINALIZACOES_CATEGORIAS[tipoKey]]));
            tags.forEach((tag) => {
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

// Rótulos e chaves especiais do modo "Por gênero" (Fase 1, etapa 1c).
// "(Sem gênero definido)" agrupa quem não tem nada cadastrado em Gênero;
// "(Identidade não documentada)" agrupa quem tem `identidadeCisTrans`
// vazio — vazio é "não documentado", nunca "cisgênero" por omissão. As
// CHAVES são o que o filtro guarda (o rótulo pode mudar sem quebrar a
// preferência salva).
export const SEM_GENERO_DEFINIDO = '(Sem gênero definido)';
export const SEM_IDENTIDADE_DOCUMENTADA = '(Identidade não documentada)';
export const CHAVE_SEM_GENERO = '__sem_genero__';
export const CHAVE_SEM_IDENTIDADE = '__sem_identidade__';

// Gênero é campo livre ("mulher" e "Mulher" são dois valores literais). A
// BARRA continua literal, como era no antigo cartão de gênero; o FILTRO
// compara pela chave normalizada (sem caixa nem acento), então as
// variações viram um item só. A lista do filtro mostra a grafia mais usada.
export function chaveGeneroPessoa(pessoa) {
    const genero = (pessoa?.genero || '').trim();
    return genero ? chaveTema(genero) : CHAVE_SEM_GENERO;
}

export function chaveIdentidadePessoa(pessoa) {
    return IDENTIDADES_CIS_TRANS.includes(pessoa?.identidadeCisTrans)
        ? pessoa.identidadeCisTrans
        : CHAVE_SEM_IDENTIDADE;
}

// Rótulo da barra do modo "Por gênero": o Gênero literal; com cis/trans
// ligado, "Gênero, Identidade" (ex.: "Mulher, Transgênero").
export function rotuloGeneroPessoa(pessoa, considerarCisTrans = false) {
    const genero = (pessoa?.genero || '').trim() || SEM_GENERO_DEFINIDO;
    if (!considerarCisTrans) return genero;
    const identidade = IDENTIDADES_CIS_TRANS.includes(pessoa?.identidadeCisTrans)
        ? pessoa.identidadeCisTrans
        : SEM_IDENTIDADE_DOCUMENTADA;
    return `${genero}, ${identidade}`;
}

// Opções do filtro de Gênero: uma por chave normalizada, com a grafia mais
// usada como rótulo e a quantidade de PESSOAS cadastradas (não de
// aparições) que ela cobre. "(Sem gênero definido)" só entra se existir
// alguém assim. Ordem: mais pessoas primeiro, depois alfabética.
export function opcoesFiltroGenero(pessoas = db.pessoas) {
    const porChave = new Map();
    (pessoas || []).forEach((p) => {
        const chave = chaveGeneroPessoa(p);
        const grafia = chave === CHAVE_SEM_GENERO ? SEM_GENERO_DEFINIDO : p.genero.trim();
        const item = porChave.get(chave) || { chave, grafias: new Map(), pessoas: 0 };
        item.pessoas += 1;
        item.grafias.set(grafia, (item.grafias.get(grafia) || 0) + 1);
        porChave.set(chave, item);
    });
    return [...porChave.values()]
        .map((item) => ({
            chave: item.chave,
            rotulo: [...item.grafias.entries()].sort(
                (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'),
            )[0][0],
            pessoas: item.pessoas,
        }))
        .sort((a, b) => b.pessoas - a.pessoas || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

// Agregação completa (sem corte de Top N) do gráfico de Pessoas.
// `opcoes.modo`: 'pessoa' (padrão) conta por Pessoa — cada uma das
// pessoas do item.pessoas, opcionalmente restrita às que pertencem a
// algum grupo em `opcoes.grupoIds` (vazio = sem restrição); 'grupo'
// conta por Grupo, via paresGrupoPessoa (utils.js) — mesma convenção já
// usada ali: uma pessoa em mais de um grupo gera um par por grupo, não
// uma linha combinada, então um item com 2 pessoas do mesmo grupo soma
// 2 pro grupo (uma dedicatória por pessoa envolvida); 'genero' conta por
// Gênero da Pessoa (ver rotuloGeneroPessoa), também por aparição.
// Exclusivo das Estatísticas (pedido do Victor, 27/09/2026): um subgrupo
// também "repica" a contagem pro(s) grupo(s) acima dele na hierarquia,
// via cadeiaAncestraisGrupo (db.js) — tanto no modo 'grupo' (a barra do
// grupo maior soma quem está só no subgrupo) quanto no filtro por Grupo
// dos modos 'pessoa' e 'genero' (marcar o grupo maior já traz quem está
// só no subgrupo, sem precisar marcar os dois). Fora daqui — atribuição de
// Grupo à Pessoa, badges/exportação do poema/prosa (paresGrupoPessoa em
// utils.js) — o subgrupo continua contando só como ele mesmo, de
// propósito: ali é a Pessoa quem decide o que sinalizar.
//
// Fase 1, etapa 1c — opções novas, todas EXPLÍCITAS (sem cair no estado
// salvo, ao contrário de `modo` e `grupoIds`): a linha do tempo de Pessoa
// chama esta função sem elas e só ganha o filtro de gênero depois, com a
// 1c estável (plano da fase).
//   `generos`: chaves (chaveGeneroPessoa) — só modo 'pessoa'; vazio = todos.
//   `identidades`: valores de IDENTIDADES_CIS_TRANS ou CHAVE_SEM_IDENTIDADE —
//     só modo 'pessoa' E só com `considerarCisTrans`; vazio = todas.
//   `considerarCisTrans`: no modo 'genero' combina Gênero e identidade na barra.
// Os filtros combinam por E (grupo, gênero e identidade); dentro de cada um,
// por OU. No modo 'grupo' o filtro de gênero não se aplica.
export function agregarPorPessoa(opcoes = {}) {
    const modo = ['grupo', 'pessoa', 'genero'].includes(opcoes.modo)
        ? opcoes.modo
        : getModoGraficoPessoas();
    const grupoIds = opcoes.grupoIds || getGruposFiltroPessoas();
    const considerarCisTrans = opcoes.considerarCisTrans === true;
    const setGenero = new Set(modo === 'pessoa' ? (opcoes.generos || []).map(String) : []);
    const setIdentidade = new Set(
        modo === 'pessoa' && considerarCisTrans ? (opcoes.identidades || []).map(String) : [],
    );

    const contagem = {};
    if (modo === 'grupo') {
        todosOsTextos().forEach((t) => {
            paresGrupoPessoa(t, db.pessoas, db.grupos).forEach(({ grupo }) => {
                cadeiaAncestraisGrupo(db, grupo.id).forEach((idAncestral) => {
                    const ancestral = db.grupos.find((g) => g.id == idAncestral);
                    if (ancestral) contagem[ancestral.nome] = (contagem[ancestral.nome] || 0) + 1;
                });
            });
        });
    } else {
        const setGrupoFiltro = new Set((grupoIds || []).map(String));
        todosOsTextos().forEach((t) => {
            if (!Array.isArray(t.pessoas)) return;
            t.pessoas.forEach((p) => {
                const pessoa = db.pessoas.find((x) => x.id === p.pessoaId);
                if (!pessoa) return;
                const gruposEfetivos = (pessoa.grupoIds || []).flatMap((g) =>
                    cadeiaAncestraisGrupo(db, g),
                );
                if (
                    setGrupoFiltro.size &&
                    !gruposEfetivos.some((g) => setGrupoFiltro.has(String(g)))
                ) {
                    return;
                }
                if (setGenero.size && !setGenero.has(chaveGeneroPessoa(pessoa))) return;
                if (setIdentidade.size && !setIdentidade.has(chaveIdentidadePessoa(pessoa))) {
                    return;
                }
                const rotulo =
                    modo === 'genero'
                        ? rotuloGeneroPessoa(pessoa, considerarCisTrans)
                        : pessoa.nome;
                contagem[rotulo] = (contagem[rotulo] || 0) + 1;
            });
        });
    }
    const ordenado = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    return { labels: ordenado.map((o) => o[0]), data: ordenado.map((o) => o[1]) };
}

export function contarPorPessoa(top = 12, opcoes = {}) {
    return topN(agregarPorPessoa(opcoes), top);
}

// Assuntos agrupam Temas (db.assuntos — ver utils.js): cada texto conta
// uma vez por Assunto a que pertence (mesma convenção de
// contarTextosPorAssunto), por isso a soma das barras pode passar do
// total de textos quando um texto cai em mais de um Assunto. Sem
// Top N nem drill-down temporal (poucas categorias, mesmo padrão de
// agregarPorPessoa em modo gênero) — Assunto sem nenhum texto ainda fica
// de fora do gráfico (nada pra desenhar).
//
// `papel` recorta pelo papel efetivo do Assunto no texto (seletor "Papel do
// assunto"): 'todos' (padrão, qualquer papel, como sempre), 'principal',
// 'secundario' ou 'semPapel' (Indefinido). Nos papéis específicos o texto só
// conta no Assunto se o papel efetivo dele ali for aquele.
export function agregarPorAssunto(papel = getPapelAssuntoEstatisticas()) {
    const contagem =
        papel === 'todos'
            ? contarTextosPorAssunto(todosOsTextos(), db.assuntos, db.temas)
            : contarTextosPorAssuntoNoPapel(papel);
    const ordenado = [...contagem.entries()]
        .map(([id, n]) => [db.assuntos.find((a) => a.id === id)?.nome || '', n])
        .filter(([nome, n]) => nome && n > 0)
        .sort((a, b) => b[1] - a[1]);
    return { labels: ordenado.map((o) => o[0]), data: ordenado.map((o) => o[1]) };
}

function contarTextosPorAssuntoNoPapel(papel) {
    const alvo = papel === 'semPapel' ? '' : papel;
    const contagem = new Map((db.assuntos || []).map((a) => [a.id, 0]));
    todosOsTextos().forEach((texto) => {
        assuntosComPapel(texto, db.assuntos, db.temas).forEach((a) => {
            if (a.papel === alvo) contagem.set(a.id, (contagem.get(a.id) || 0) + 1);
        });
    });
    return contagem;
}

// ─── Temas e Assuntos por papel (Fase 1, etapa 1b) ───────────────────
// Uma barra por Tema (ou por Assunto), dividida pelo papel que ele tem no texto:
// principal, secundário e indefinido (`semPapel`). O total da barra (a soma dos
// três) é exatamente o número da antiga barra "Todos": cada texto conta uma vez
// por Tema/Assunto, no papel efetivo dele naquele texto.
//
// Lê `texto.temas` por id (temasComPapel) e os Assuntos derivados
// (assuntosComPapel), nunca o espelho `sinalizacoesTema`. Se o mesmo Tema vier
// duas vezes no texto com papéis diferentes, conta uma vez, no papel mais forte
// (papelMaisForte), a mesma regra que o Assunto já usa.
//
// `base`: 'tema' | 'assunto'. Devolve `labels` ordenados pelo total (maior
// primeiro), um vetor por papel e `data` com o total, para poder reaproveitar
// filtrarPorIntervalo e filtrarOcultos, que só conhecem `labels` e `data`.
export const PAPEIS_EMPILHADOS = ['principal', 'secundario', 'semPapel'];

export function agregarPorPapel({ base = 'tema' } = {}) {
    const contagem = new Map(); // nome -> { principal, secundario, semPapel }
    const somar = (nome, papel) => {
        if (!nome) return;
        if (!contagem.has(nome)) contagem.set(nome, { principal: 0, secundario: 0, semPapel: 0 });
        contagem.get(nome)[papel === '' ? 'semPapel' : papel] += 1;
    };
    todosOsTextos().forEach((texto) => {
        if (base === 'assunto') {
            assuntosComPapel(texto, db.assuntos, db.temas).forEach((a) => somar(a.nome, a.papel));
            return;
        }
        const papelPorNome = new Map();
        temasComPapel(texto, db.temas).forEach((e) => {
            const anterior = papelPorNome.get(e.nome);
            papelPorNome.set(
                e.nome,
                anterior === undefined ? e.papel : papelMaisForte([anterior, e.papel]),
            );
        });
        papelPorNome.forEach((papel, nome) => somar(nome, papel));
    });
    const total = (c) => c.principal + c.secundario + c.semPapel;
    const ordenado = [...contagem.entries()].sort((a, b) => total(b[1]) - total(a[1]));
    return {
        labels: ordenado.map(([nome]) => nome),
        data: ordenado.map(([, c]) => total(c)),
        principal: ordenado.map(([, c]) => c.principal),
        secundario: ordenado.map(([, c]) => c.secundario),
        semPapel: ordenado.map(([, c]) => c.semPapel),
    };
}

// Recorta o resultado de agregarPorPapel para os `labels` pedidos, na ordem
// pedida (depois de corte por mínimo, ocultos e Top N, feitos sobre `labels`/`data`).
export function recortarPorPapel(resultado, labels) {
    const indice = new Map(resultado.labels.map((l, i) => [l, i]));
    const pegar = (vetor) => labels.map((l) => vetor[indice.get(l)]);
    return {
        labels: [...labels],
        data: pegar(resultado.data),
        principal: pegar(resultado.principal),
        secundario: pegar(resultado.secundario),
        semPapel: pegar(resultado.semPapel),
    };
}

function anoDoTexto(texto) {
    const ano = parseInt(anoDeDataParcial(texto?.dataEscrita) ?? texto?.ano);
    return Number.isFinite(ano) && ano > 0 ? String(ano) : null;
}

// Temas do texto para as Estatísticas, já recortados pelo seletor "Papel
// do tema" (padrão 'todos' = o espelho inteiro, como sempre). Nos papéis
// específicos usa `texto.temas` (por id) via nomesTemasPorPapel.
function temasDoTexto(texto, papel = getPapelTemaEstatisticas()) {
    if (papel === 'todos') return listaDeCampo(texto?.sinalizacoesTema);
    return nomesTemasPorPapel(texto, db.temas, papel === 'semPapel' ? '' : papel);
}

function pessoasDoTexto(texto) {
    if (!Array.isArray(texto?.pessoas)) return [];
    return texto.pessoas
        .map((p) => db.pessoas.find((x) => x.id == p.pessoaId)?.nome)
        .filter(Boolean);
}

// Nomes dos Personagens do texto (qualquer papel), sem repetição por nome.
function personagensDoTexto(texto) {
    if (!Array.isArray(texto?.personagens)) return [];
    const vistos = new Map();
    texto.personagens.forEach((v) => {
        const nome = (db.personagens || []).find((x) => x.id == v.personagemId)?.nome;
        if (nome && !vistos.has(chaveTema(nome))) vistos.set(chaveTema(nome), nome);
    });
    return [...vistos.values()];
}

export function agregarTemaPorAno(tema = '') {
    const contagem = {};
    todosOsTextos().forEach((texto) => {
        const ano = anoDoTexto(texto);
        if (!ano) return;
        if (tema && !temasDoTexto(texto).includes(tema)) return;
        contagem[ano] = (contagem[ano] || 0) + 1;
    });
    const anos = Object.keys(contagem).sort((a, b) => Number(a) - Number(b));
    return { labels: anos, data: anos.map((ano) => contagem[ano]) };
}

export function agregarPessoaPorAno(pessoa = '', grupoIds = []) {
    const contagem = {};
    const grupos = new Set((grupoIds || []).map(String));
    const pessoasPermitidas = grupos.size
        ? new Set(
              db.pessoas
                  .filter((p) => (p.grupoIds || []).some((g) => grupos.has(String(g))))
                  .map((p) => p.nome),
          )
        : null;
    todosOsTextos().forEach((texto) => {
        const ano = anoDoTexto(texto);
        if (!ano) return;
        const pessoas = pessoasDoTexto(texto);
        if (pessoa && !pessoas.includes(pessoa)) return;
        // Se há uma pessoa escolhida e grupos selecionados, as duas
        // condições se aplicam à mesma pessoa: a série não deve contar
        // um texto só porque outra pessoa do texto pertence ao grupo.
        if (pessoa && pessoasPermitidas && !pessoasPermitidas.has(pessoa)) return;
        if (!pessoa && pessoasPermitidas && !pessoas.some((p) => pessoasPermitidas.has(p))) return;
        contagem[ano] = (contagem[ano] || 0) + 1;
    });
    const anos = Object.keys(contagem).sort((a, b) => Number(a) - Number(b));
    return { labels: anos, data: anos.map((ano) => contagem[ano]) };
}

// Une o eixo de anos de várias séries de agregarXPorAno num único eixo
// (qualquer ano em que ao menos uma delas tenha ocorrência), preenchendo
// 0 onde uma série específica não teve nada naquele ano — sem isso, duas
// séries com anos diferentes não dariam pra plotar juntas no mesmo
// gráfico de linha (Chart.js usa um eixo X só, compartilhado por todos
// os datasets).
function unirSeriesPorAno(itens, calcularSerie) {
    const porItem = itens.map((item) => ({ item, serie: calcularSerie(item) }));
    const anos = [...new Set(porItem.flatMap(({ serie }) => serie.labels))].sort(
        (a, b) => Number(a) - Number(b),
    );
    const series = porItem.map(({ item, serie }) => {
        const porAno = Object.fromEntries(serie.labels.map((ano, i) => [ano, serie.data[i]]));
        return { nome: item, data: anos.map((ano) => porAno[ano] || 0) };
    });
    return { labels: anos, series };
}

// Cruza dois ou mais temas no mesmo gráfico "ao longo do tempo" —
// mesma lógica de agregarTemaPorAno, uma vez por tema selecionado.
// Reconhece CHAVE_TOTAL_TEMPORAL como um item especial: em vez de
// tratá-lo como nome de tema, entra com a série agregada de
// agregarTotalTagsTemaPorAno (ver abaixo). A série resultante recebe
// `total: true` pra o gráfico desenhar essa linha diferente das demais
// (estatisticas-tela-comum.js).
export function agregarTemasPorAno(itens = []) {
    const lista = (itens || []).filter(Boolean);
    if (!lista.length) return { labels: [], series: [] };
    const { labels, series } = unirSeriesPorAno(lista, (item) =>
        item === CHAVE_TOTAL_TEMPORAL ? agregarTotalTagsTemaPorAno() : agregarTemaPorAno(item),
    );
    return {
        labels,
        series: series.map((s) =>
            s.nome === CHAVE_TOTAL_TEMPORAL
                ? { ...s, nome: 'Total (todos os temas)', total: true }
                : s,
        ),
    };
}

// Idem, pra pessoas — o filtro por grupo (mesmo `grupoIds` do painel
// "Filtrar por grupo") se aplica a todas as séries igualmente,
// inclusive à série Total.
export function agregarPessoasPorAno(itens = [], grupoIds = []) {
    const lista = (itens || []).filter(Boolean);
    if (!lista.length) return { labels: [], series: [] };
    const { labels, series } = unirSeriesPorAno(lista, (item) =>
        item === CHAVE_TOTAL_TEMPORAL
            ? agregarTotalDedicatoriasPessoaPorAno(grupoIds)
            : agregarPessoaPorAno(item, grupoIds),
    );
    return {
        labels,
        series: series.map((s) =>
            s.nome === CHAVE_TOTAL_TEMPORAL
                ? { ...s, nome: 'Total (todas as pessoas)', total: true }
                : s,
        ),
    };
}

// Identificador do item especial "Total" na lista de seleção dos
// gráficos "ao longo do tempo" — não é nome de tema nem de pessoa de
// verdade, então usa um valor que nunca colide com um nome cadastrado.
export const CHAVE_TOTAL_TEMPORAL = '__total__';

// Soma todas as OCORRÊNCIAS de tema por ano — um texto com 3 temas
// conta 3 vezes, diferente da contagem de produção por ano (que conta
// o texto uma vez só, não importa quantos temas tenha). Serve pra ver
// se um ano foi "muito tagueado": pode ter poucos textos naquele ano,
// mas cada um com vários temas sinalizados. Pedido do Victor,
// 27/09/2026.
export function agregarTotalTagsTemaPorAno() {
    const contagem = {};
    todosOsTextos().forEach((texto) => {
        const ano = anoDoTexto(texto);
        if (!ano) return;
        temasDoTexto(texto).forEach(() => {
            contagem[ano] = (contagem[ano] || 0) + 1;
        });
    });
    const anos = Object.keys(contagem).sort((a, b) => Number(a) - Number(b));
    return { labels: anos, data: anos.map((ano) => contagem[ano]) };
}

// Idem, pra dedicatórias: soma todas as ocorrências de pessoa por ano —
// um texto dedicado a 2 pessoas conta 2 vezes. Respeita o filtro por
// grupo, mesmo critério de agregarPessoaPorAno.
export function agregarTotalDedicatoriasPessoaPorAno(grupoIds = []) {
    const contagem = {};
    const grupos = new Set((grupoIds || []).map(String));
    const pessoasPermitidas = grupos.size
        ? new Set(
              db.pessoas
                  .filter((p) => (p.grupoIds || []).some((g) => grupos.has(String(g))))
                  .map((p) => p.nome),
          )
        : null;
    todosOsTextos().forEach((texto) => {
        const ano = anoDoTexto(texto);
        if (!ano) return;
        pessoasDoTexto(texto).forEach((pessoa) => {
            if (pessoasPermitidas && !pessoasPermitidas.has(pessoa)) return;
            contagem[ano] = (contagem[ano] || 0) + 1;
        });
    });
    const anos = Object.keys(contagem).sort((a, b) => Number(a) - Number(b));
    return { labels: anos, data: anos.map((ano) => contagem[ano]) };
}

// Quantos anos distintos cada tema/pessoa aparece — usado só pelo corte
// "mínimo de anos" do painel "ao longo do tempo": um item citado muitas
// vezes mas só num ano não mostra tendência nenhuma numa linha temporal
// (vira um gráfico de um ponto só); o que importa ali é span ao longo
// do tempo, não frequência total (esse já é o papel do corte por
// mínimo de aparições, que é outro). Passada única pelo corpus (mesmo
// espírito de agregarPorTema/agregarPorPessoa), evita chamar
// agregarTemaPorAno/agregarPessoaPorAno por item, que re-varre todos os
// textos a cada chamada — com uma lista grande de temas isso vira
// O(temas × textos) à toa. Pedido do Victor, 27/09/2026.
export function anosDistintosPorTema() {
    const porTema = {};
    todosOsTextos().forEach((texto) => {
        const ano = anoDoTexto(texto);
        if (!ano) return;
        temasDoTexto(texto).forEach((tema) => {
            (porTema[tema] ||= new Set()).add(ano);
        });
    });
    return Object.fromEntries(Object.entries(porTema).map(([tema, anos]) => [tema, anos.size]));
}

export function anosDistintosPorPessoa() {
    const porPessoa = {};
    todosOsTextos().forEach((texto) => {
        const ano = anoDoTexto(texto);
        if (!ano) return;
        pessoasDoTexto(texto).forEach((pessoa) => {
            (porPessoa[pessoa] ||= new Set()).add(ano);
        });
    });
    return Object.fromEntries(
        Object.entries(porPessoa).map(([pessoa, anos]) => [pessoa, anos.size]),
    );
}

// Filtra `labels` pelo mapa { label: nº de anos distintos } acima,
// mesmo critério de "sem limite" das outras funções de corte (0/''/null
// = sem corte).
export function filtrarPorAnosDistintos(labels, mapaAnos, minimo) {
    if (!minimo) return labels;
    return labels.filter((l) => (mapaAnos[l] || 0) >= minimo);
}

export function coocorrenciaTemasPessoas({ temas = [], pessoas = [] } = {}) {
    const matriz = [];
    // Textos DISTINTOS dentro da matriz (Fase 1, etapa 1d): contam um texto
    // uma vez só, ao contrário da soma das células, que conta pares
    // texto × tema. Só entram textos com ao menos um tema e ao menos uma
    // linha da matriz, o mesmo universo das células.
    const textosTema = {};
    const textosLinha = {};
    let totalTextos = 0;
    const temaSet = new Set(temas);
    const pessoaSet = new Set(pessoas);
    todosOsTextos().forEach((texto) => {
        const ts = temasDoTexto(texto).filter((t) => !temaSet.size || temaSet.has(t));
        const ps = pessoasDoTexto(texto).filter((p) => !pessoaSet.size || pessoaSet.has(p));
        const tsU = [...new Set(ts)];
        const psU = [...new Set(ps)];
        if (tsU.length && psU.length) {
            totalTextos += 1;
            tsU.forEach((t) => (textosTema[t] = (textosTema[t] || 0) + 1));
            psU.forEach((x) => (textosLinha[x] = (textosLinha[x] || 0) + 1));
        }
        tsU.forEach((tema) => {
            psU.forEach((pessoa) => {
                let linha = matriz.find((x) => x.pessoa === pessoa);
                if (!linha) {
                    linha = { pessoa, valores: {} };
                    matriz.push(linha);
                }
                linha.valores[tema] = (linha.valores[tema] || 0) + 1;
            });
        });
    });
    const temasPresentes = temas.length
        ? temas
        : [...new Set(matriz.flatMap((l) => Object.keys(l.valores)))];
    const ordenadas = matriz.sort(
        (a, b) =>
            Object.values(b.valores).reduce((s, v) => s + v, 0) -
            Object.values(a.valores).reduce((s, v) => s + v, 0),
    );
    return {
        pessoas: ordenadas.map((l) => l.pessoa),
        temas: temasPresentes,
        valores: ordenadas.map((l) => temasPresentes.map((t) => l.valores[t] || 0)),
        textosPorTema: temasPresentes.map((t) => textosTema[t] || 0),
        textosPorLinha: ordenadas.map((l) => textosLinha[l.pessoa] || 0),
        totalTextos,
    };
}

// Personagem × Tema: textos que têm ao mesmo tempo o Personagem (em qualquer
// papel) e o Tema. Mesmo formato de coocorrenciaTemasPessoas, com `personagens`
// no lugar de `pessoas`. O Tema segue o papel escolhido na aba (temasDoTexto).
export function coocorrenciaTemasPersonagens({ temas = [], personagens = [] } = {}) {
    const matriz = [];
    const textosTema = {};
    const textosLinha = {};
    let totalTextos = 0;
    const temaSet = new Set(temas);
    const personagemSet = new Set(personagens);
    todosOsTextos().forEach((texto) => {
        const ts = [...new Set(temasDoTexto(texto))].filter((t) => !temaSet.size || temaSet.has(t));
        const ps = personagensDoTexto(texto).filter(
            (p) => !personagemSet.size || personagemSet.has(p),
        );
        const psU = [...new Set(ps)];
        if (ts.length && psU.length) {
            totalTextos += 1;
            ts.forEach((t) => (textosTema[t] = (textosTema[t] || 0) + 1));
            psU.forEach((x) => (textosLinha[x] = (textosLinha[x] || 0) + 1));
        }
        ts.forEach((tema) => {
            ps.forEach((personagem) => {
                let linha = matriz.find((x) => x.personagem === personagem);
                if (!linha) {
                    linha = { personagem, valores: {} };
                    matriz.push(linha);
                }
                linha.valores[tema] = (linha.valores[tema] || 0) + 1;
            });
        });
    });
    const temasPresentes = temas.length
        ? temas
        : [...new Set(matriz.flatMap((l) => Object.keys(l.valores)))];
    const ordenadas = matriz.sort(
        (a, b) =>
            Object.values(b.valores).reduce((s, v) => s + v, 0) -
            Object.values(a.valores).reduce((s, v) => s + v, 0),
    );
    return {
        personagens: ordenadas.map((l) => l.personagem),
        temas: temasPresentes,
        valores: ordenadas.map((l) => temasPresentes.map((t) => l.valores[t] || 0)),
        textosPorTema: temasPresentes.map((t) => textosTema[t] || 0),
        textosPorLinha: ordenadas.map((l) => textosLinha[l.personagem] || 0),
        totalTextos,
    };
}

export function coocorrenciaTemasGrupos({ temas = [], grupos = [] } = {}) {
    // Mesmo repique de subgrupo pro(s) grupo(s) acima (cadeiaAncestraisGrupo,
    // db.js) que agregarPorPessoa usa acima — Estatísticas, não exibição.
    const matriz = [];
    const textosTema = {};
    const textosLinha = {};
    let totalTextos = 0;
    const temaSet = new Set(temas);
    const grupoSet = new Set(grupos);
    todosOsTextos().forEach((texto) => {
        const ts = [...new Set(temasDoTexto(texto))].filter((t) => !temaSet.size || temaSet.has(t));
        const gs = [
            ...new Set(
                paresGrupoPessoa(texto, db.pessoas, db.grupos).flatMap(({ grupo }) =>
                    cadeiaAncestraisGrupo(db, grupo.id)
                        .map((id) => db.grupos.find((g) => g.id == id)?.nome)
                        .filter(Boolean),
                ),
            ),
        ].filter((g) => !grupoSet.size || grupoSet.has(g));
        if (ts.length && gs.length) {
            totalTextos += 1;
            ts.forEach((t) => (textosTema[t] = (textosTema[t] || 0) + 1));
            gs.forEach((x) => (textosLinha[x] = (textosLinha[x] || 0) + 1));
        }
        ts.forEach((tema) => {
            gs.forEach((grupo) => {
                let linha = matriz.find((x) => x.grupo === grupo);
                if (!linha) {
                    linha = { grupo, valores: {} };
                    matriz.push(linha);
                }
                linha.valores[tema] = (linha.valores[tema] || 0) + 1;
            });
        });
    });
    const temasPresentes = temas.length
        ? temas
        : [...new Set(matriz.flatMap((l) => Object.keys(l.valores)))];
    const ordenadas = matriz.sort(
        (a, b) =>
            Object.values(b.valores).reduce((s, v) => s + v, 0) -
            Object.values(a.valores).reduce((s, v) => s + v, 0),
    );
    return {
        grupos: ordenadas.map((l) => l.grupo),
        temas: temasPresentes,
        valores: ordenadas.map((l) => temasPresentes.map((t) => l.valores[t] || 0)),
        textosPorTema: temasPresentes.map((t) => textosTema[t] || 0),
        textosPorLinha: ordenadas.map((l) => textosLinha[l.grupo] || 0),
        totalTextos,
    };
}

function textosParaAnaliseLinguagem(livroId = '') {
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
                    (i.textoOverride || (i.refId && i.refTipo)) &&
                    itemColetaneaConta(i),
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
    return textos;
}

export function resumoLinguagem(livroId = '') {
    const textos = textosParaAnaliseLinguagem(livroId);
    const palavras = textos.reduce((total, t) => total + tokenizar(t.texto).length, 0);
    return { textos: textos.length, palavras };
}

export function palavrasMaisFrequentes(livroId = '', top = 40) {
    const textos = textosParaAnaliseLinguagem(livroId);
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
        totalPoemas: poemasContados().length,
        totalProsas: prosasContadas().length,
        totalPalavras,
        mediaPalavras: textos.length ? Math.round(totalPalavras / textos.length) : 0,
        anoMaisProdutivo,
        livroComMais,
    };
}

export function contarTextosFiltrados() {
    const poemas = db.poemas.filter((t) => textoEntraNoFiltroEstatisticas(t, 'poemas')).length;
    const prosas = db.prosas.filter((t) => textoEntraNoFiltroEstatisticas(t, 'prosas')).length;
    return { poemas, prosas, total: poemas + prosas };
}

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
