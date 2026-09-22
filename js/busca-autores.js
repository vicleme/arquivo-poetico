// ============================================================
// busca-autores.js — Busca por campo (`campo:valor`) na aba Autores.
//
// Mesma sintaxe de Poemas/Prosas (termos soltos = E; `ou`; "frase
// exata"; `-termo` exclui; `campo:*` = campo preenchido; acento e
// caixa não importam), reaproveitando o interpretador de utils.js
// (parseConsultaBusca). O que muda é só a tabela de prefixos: a de
// Poemas/Prosas fala de título, etiqueta, livro...; a daqui fala de
// nacionalidade, ocupação, religião etc. — por isso é um mapa à parte
// (CAMPOS_ATRIBUTO_AUTOR), e não uma extensão do de lá.
//
// Módulo puro (sem DOM): recebe a lista de Autores e devolve a lista
// filtrada, pra poder ser testado sem abrir a tela.
//
// Busca sem prefixo: procura só em campos "públicos" do cadastro (nome,
// nomes literários, nacionalidade, ocupações, instituições, religião,
// sobre). Orientação sexual, condições clínicas, deficiências e
// neurodivergências ficam de fora da busca solta DE PROPÓSITO — mesmo
// motivo do card enxuto (ver visualizar-autor.js): dado sensível não
// deve aparecer por acaso. Só se acha por prefixo explícito
// (`deficiencia:cegueira`), ou seja, quando a pessoa foi atrás.
// ============================================================

import {
    parseConsultaBusca,
    normalizarBusca,
    opcoesBuscaPadrao,
    valorBateTermo,
    formatarDataParcial,
    situacaoDominioPublico,
} from './utils.js';

// Prefixo digitado (sem acento, minúsculo) → chave no objeto "decorado"
// devolvido por decorarAutorParaBusca abaixo.
export const CAMPOS_ATRIBUTO_AUTOR = {
    nome: 'nome',
    literario: 'nomesLiterarios',
    heteronimo: 'heteronimos',
    pseudonimo: 'pseudonimos',
    isni: 'isni',
    nacionalidade: 'nacionalidade',
    nascimento: 'nascimento',
    obito: 'obito',
    sexo: 'sexo',
    raca: 'corRaca',
    cor: 'corRaca',
    genero: 'genero',
    orientacao: 'orientacaoSexual',
    identidade: 'identidadeCisTrans',
    religiao: 'religiao',
    classe: 'classeSocial',
    neurodivergencia: 'neurodivergencias',
    condicao: 'condicoesClinicas',
    deficiencia: 'deficiencias',
    grau: 'grauAcademico',
    instituicao: 'instituicoes',
    ocupacao: 'ocupacoes',
    sobre: 'sobre',
    dominio: 'dominioPublico',
    // Só existe (e só faz sentido) como presença: `voce:*` = autores
    // marcados "este autor sou eu".
    voce: 'souEu',
    id: 'id',
};

// Forma canônica de cada campo (um nome por campo), pra legenda de ajuda.
export const PREFIXOS_CANONICOS_AUTOR = [
    'nome',
    'literario',
    'heteronimo',
    'pseudonimo',
    'isni',
    'nacionalidade',
    'nascimento',
    'obito',
    'sexo',
    'raca',
    'genero',
    'orientacao',
    'identidade',
    'religiao',
    'classe',
    'neurodivergencia',
    'condicao',
    'deficiencia',
    'grau',
    'instituicao',
    'ocupacao',
    'sobre',
    'dominio',
    'voce',
    'id',
];

// Campos consultados pela busca sem prefixo (ver nota no topo).
const CAMPOS_BUSCA_GERAL = [
    'nome',
    'nomesLiterarios',
    'nacionalidade',
    'religiao',
    'ocupacoes',
    'instituicoes',
    'sobre',
];

// Lista de nomes a partir de: string "a, b", array de strings ou array
// de {nome, tipo} (formatos que os campos do Autor já assumiram).
function nomesDe(valor, { comTipo = false } = {}) {
    if (!valor) return [];
    const lista = Array.isArray(valor) ? valor : String(valor).split(',');
    return lista
        .map((i) => {
            if (typeof i === 'string') return { nome: i.trim(), tipo: '' };
            return { nome: (i?.nome || '').trim(), tipo: i?.tipo || '' };
        })
        .filter((i) => i.nome)
        .map((i) => (comTipo && i.tipo ? `${i.nome} ${i.tipo}` : i.nome));
}

// Data parcial → texto pesquisável: "1861", "10/11/1861" e o ano solto,
// pra `nascimento:1861` e `nascimento:10/11` funcionarem.
function textoDeData(d) {
    if (!d || !(d.dia || d.mes || d.ano)) return '';
    const formatada = formatarDataParcial(d);
    return d.ano ? `${formatada} ${d.ano}` : formatada;
}

// Devolve o Autor com campos de busca "achatados" em strings simples.
// Não altera o Autor original.
export function decorarAutorParaBusca(autor) {
    const literarios = (autor.nomesLiterarios || []).map((n) =>
        typeof n === 'string' ? { nome: n, tipo: '' } : n,
    );
    const doTipo = (tipo) =>
        literarios
            .filter((n) => n?.tipo === tipo)
            .map((n) => n.nome)
            .join(', ');
    const dominio = situacaoDominioPublico(autor);

    return {
        id: autor.id,
        nome: autor.nome || '',
        nomesLiterarios: nomesDe(autor.nomesLiterarios).join(', '),
        heteronimos: doTipo('Heterônimo'),
        pseudonimos: doTipo('Pseudônimo'),
        isni: autor.isni || '',
        nacionalidade: autor.nacionalidade || '',
        nascimento: textoDeData(autor.nascimento),
        obito: textoDeData(autor.obito),
        sexo: autor.sexo || '',
        corRaca: autor.corRaca || '',
        genero: autor.genero || '',
        orientacaoSexual: autor.orientacaoSexual || '',
        identidadeCisTrans: autor.identidadeCisTrans || '',
        religiao: autor.religiao || '',
        classeSocial: autor.classeSocial || '',
        neurodivergencias: nomesDe(autor.neurodivergencias).join(', '),
        // Nome + tipo (Física/Mental...), pra `condicao:mental` funcionar.
        condicoesClinicas: nomesDe(autor.condicoesClinicas, { comTipo: true }).join(', '),
        deficiencias: nomesDe(autor.deficiencias, { comTipo: true }).join(', '),
        grauAcademico: autor.grauAcademico || '',
        instituicoes: nomesDe(autor.instituicoes).join(', '),
        ocupacoes: nomesDe(autor.ocupacoes).join(', '),
        sobre: autor.sobre || '',
        // "livre"/"protegido" (só existe se há óbito) — `dominio:livre`
        dominioPublico: dominio.estado === 'sem-obito' ? '' : dominio.estado,
        souEu: autor.souEu ? 'sim' : '',
    };
}

// Filtra a lista de Autores. `opts` são os mesmos 3 interruptores de
// Poemas/Prosas (ver opcoesBuscaPadrao em utils.js).
export function filtrarAutores(lista, query, opts = opcoesBuscaPadrao()) {
    if (!query || !query.trim()) return lista;
    const { gruposIncluir, termosExcluir } = parseConsultaBusca(query, CAMPOS_ATRIBUTO_AUTOR);

    return lista.filter((autor) => {
        const d = decorarAutorParaBusca(autor);
        const camposGerais = normalizarBusca(
            CAMPOS_BUSCA_GERAL.map((c) => d[c])
                .filter(Boolean)
                .join(' '),
            opts,
        );

        const valorDoTermo = (t) => {
            if (!t.campo) return camposGerais;
            const v = d[t.campo];
            return v == null ? '' : normalizarBusca(String(v), opts);
        };

        const bateTermo = (t) =>
            t.presenca
                ? valorDoTermo(t) !== ''
                : valorBateTermo(
                      valorDoTermo(t),
                      normalizarBusca(t.termo, opts),
                      opts.palavraInteira,
                  );

        const combinaInclusao =
            gruposIncluir.length === 0 || gruposIncluir.some((grupo) => grupo.every(bateTermo));
        const combinaExclusao = termosExcluir.some(bateTermo);
        return combinaInclusao && !combinaExclusao;
    });
}
