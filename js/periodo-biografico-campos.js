// Bloco 3 — Período Biográfico (cadastro interno `db.epocas`): Esfera,
// Categoria, Pessoas envolvidas e Relações. Funções puras, sem DOM e sem
// save(); quem chama decide quando persistir (mesmo critério de
// periodos-historicos-hierarquia.js).
//
// Modelo (tudo mora no cadastro do período, não em cada texto):
//   esferas:            ['Afetiva', 'Acadêmica', ...]   área da vida do período inteiro
//   categorias:         ['Crise', 'Novo começo', ...]   que TIPO de momento foi
//   pessoasEnvolvidas:  [{ pessoaId }]                  quem aparece no período
//   relacoes:           [{ de, para, natureza, vinculo }]
// Cada ponta (`de`, `para`) é o autor do período (a string 'autor') ou o id de
// uma Pessoa. Quem aparece numa relação entra sozinho em pessoasEnvolvidas.
//
// Três níveis, campos independentes (decidido em 13/10/2026):
//   Esfera    área da vida do período inteiro (Afetiva, Acadêmica...);
//   Categoria que tipo de momento foi (Crise, Novo começo, Encerramento de ciclo...);
//   Natureza  a categoria da relação (Familiar, Amizade, Romance, Profissional);
//   Vínculo   o laço específico (namorados, ex-namorados, mãe, tio, amigos...),
//             com lado oposto e formas por gênero.
// A Natureza mora na relação, não no Vínculo: uma relação pode ter só a
// Natureza (vínculo vazio), só o Vínculo ou os dois, mas nunca nenhum dos dois.
// O vocabulário só SUGERE uma Natureza para cada Vínculo (namorados → Romance):
// ao escolher o vínculo a Natureza vem preenchida, e pode ser trocada.
//
// Vocabulário editável: `db.opcoesPeriodoBiografico` =
//   { esferas: [...], categorias: [...], naturezas: [...], vinculos: [...],
//     sugestoesNatureza: [{ vinculo, natureza }], rotulosVinculo: [...] }
// `rotulosVinculo` diz, para um vínculo, o nome do lado oposto (orientado) e
// as formas por gênero: { nome, inverso, feminino, masculino,
// inversoFeminino, inversoMasculino }. Vínculo sem rótulo é simétrico e sem
// gênero. Categoria tem lista própria (16 valores de fábrica, `categorias`),
// com o mesmo tratamento da Esfera: valor novo digitado entra na lista, renomear
// propaga e junta, só apaga o que ninguém usa (decidido em 15/10/2026).
//
// Formatos antigos, convertidos na migração (idempotente):
//   1. cada pessoa guardava `vinculos: [...]` (sempre em relação ao autor): vira
//      uma relação autor → pessoa;
//   2. a relação era `{ de, para, vinculo }` e o "vínculo" era uma categoria
//      (Romântico, Amizade...): relação SEM a chave `natureza` é do formato
//      antigo e passa por `converterVinculoLegado`. Com a chave (mesmo vazia),
//      nunca é convertida de novo.

export const AUTOR = 'autor';

export const ESFERAS_DE_FABRICA = [
    'Acadêmica',
    'Profissional',
    'Afetiva',
    'Familiar',
    'Social',
    'Criativa',
    'Cultural',
    'Esportiva',
    'Turística',
    'Autocuidado',
    'Saúde',
    'Espiritual',
    'Financeira',
    'Moradia/Mudança',
];

// Categoria diz QUE TIPO de momento foi; a Esfera diz em que área da vida.
// Os valores se combinam (um período pode ser "Transição ou mudança" e "Novo
// começo"). Lista fechada com o Victor em 15/10/2026; é só ponto de partida.
export const CATEGORIAS_DE_FABRICA = [
    'Adoecimento',
    'Conquista',
    'Crise',
    'Descoberta',
    'Despertar ou conscientização',
    'Encerramento de ciclo',
    'Fase estável',
    'Novo começo',
    'Perda e luto',
    'Reaproximação',
    'Recaída ou retrocesso',
    'Recomeço',
    'Rompimento',
    'Superação',
    'Suspensão ou espera',
    'Transição ou mudança',
];

export const NATUREZAS_DE_FABRICA = [
    'Familiar',
    'Amizade',
    'Romance',
    'Sexual',
    'Profissional',
    'Colega',
];

// Laços de fábrica (o que a relação É, não a categoria dela).
export const VINCULOS_DE_FABRICA = [
    'Namorados',
    'Ex-namorados',
    'Conversantes',
    'Webnamorados',
    'Situationship',
    'Amigos',
];

// Os seis "vínculos" de fábrica antigos eram categorias: hoje são Naturezas
// ("Romântico" virou "Romance", para combinar com "Amizade"). Só a migração usa.
export const VINCULOS_ANTIGOS_DE_FABRICA = [
    ['Romântico', 'Romance'],
    ['Sexual', 'Sexual'],
    ['Amizade', 'Amizade'],
    ['Familiar', 'Familiar'],
    ['Profissional', 'Profissional'],
    ['Colega', 'Colega'],
];

// Rótulos de fábrica: vínculos com lado oposto e/ou forma por gênero. O nome
// é sempre o lado "direto" (quem tem o papel é a ponta `de`).
export const ROTULOS_VINCULO_DE_FABRICA = [
    {
        nome: 'Responsável por',
        inverso: 'Filho ou filha de',
        feminino: 'Mãe de',
        masculino: 'Pai de',
        inversoFeminino: 'Filha de',
        inversoMasculino: 'Filho de',
    },
    {
        nome: 'Avô ou avó de',
        inverso: 'Neto ou neta de',
        feminino: 'Avó de',
        masculino: 'Avô de',
        inversoFeminino: 'Neta de',
        inversoMasculino: 'Neto de',
    },
    {
        nome: 'Tio ou tia de',
        inverso: 'Sobrinho ou sobrinha de',
        feminino: 'Tia de',
        masculino: 'Tio de',
        inversoFeminino: 'Sobrinha de',
        inversoMasculino: 'Sobrinho de',
    },
    {
        nome: 'Irmão ou irmã de',
        inverso: '',
        feminino: 'Irmã de',
        masculino: 'Irmão de',
        inversoFeminino: '',
        inversoMasculino: '',
    },
];

// Vínculos simétricos de fábrica com forma no plural, para "Ana e Mariana são
// amigas". Ficam à parte dos rótulos familiares acima (que a migração do
// formato antigo reconhece como Familiar).
export const ROTULOS_PLURAIS_DE_FABRICA = [
    ['Namorados', 'Namoradas', 'Namorados'],
    ['Ex-namorados', 'Ex-namoradas', 'Ex-namorados'],
    ['Conversantes', 'Conversantes', 'Conversantes'],
    ['Webnamorados', 'Webnamoradas', 'Webnamorados'],
    ['Amigos', 'Amigas', 'Amigos'],
].map(([nome, pluralFeminino, pluralMasculino]) => ({
    nome,
    inverso: '',
    feminino: '',
    masculino: '',
    inversoFeminino: '',
    inversoMasculino: '',
    pluralFeminino,
    pluralMasculino,
    pluralNeutro: '',
    nota: '',
}));

// Fábrica aplicada UMA vez a cada vocabulário (marcador em `fabricaAplicada`),
// para entrar também em quem já tinha o vocabulário. O que a pessoa apagar ou
// renomear depois não volta.
export const NATUREZA_TERAPEUTICA = 'Vínculo terapêutico';
const FABRICA_PSICOTERAPIA = {
    id: 'psicoterapia',
    natureza: NATUREZA_TERAPEUTICA,
    // Lado direto = quem conduz. "Psicoterapeuta" serve para qualquer gênero e
    // para quem faz terapia integrativa sem ser psicólogo(a), por isso não tem
    // forma feminina nem masculina. Lado oposto = quem faz a terapia; o masculino cobre
    // o neutro e o misto (por isso inversoMasculino fica vazio).
    rotulo: {
        nome: 'Psicoterapeuta de',
        inverso: 'Psicoterapeutizando de',
        feminino: '',
        masculino: '',
        inversoFeminino: 'Psicoterapeutizanda de',
        inversoMasculino: '',
        nota: 'Psicoterapeutizando: paciente, cliente ou pessoa em psicoterapia. Neologismo: corrige conotação de passividade de "paciente" e comercial de "cliente".',
    },
};
// Primeira versão desta fábrica (13/10/2026, mesmo dia), trocada por
// "Psicoterapeuta de". Quem a recebeu a perde, se ela estiver intacta e sem uso.
const FABRICA_TERAPEUTICA_V1 = {
    id: 'terapeutico',
    rotulo: {
        nome: 'Terapeutizante de',
        inverso: 'Terapeutizando ou terapeutizanda de',
        feminino: 'Psicóloga de',
        masculino: 'Psicólogo de',
        inversoFeminino: 'Terapeutizanda de',
        inversoMasculino: 'Terapeutizando de',
    },
};

// Natureza sugerida para cada Vínculo de fábrica (editável no vocabulário).
export const SUGESTOES_NATUREZA_DE_FABRICA = [
    { vinculo: 'Namorados', natureza: 'Romance' },
    { vinculo: 'Ex-namorados', natureza: 'Romance' },
    { vinculo: 'Conversantes', natureza: 'Romance' },
    { vinculo: 'Webnamorados', natureza: 'Romance' },
    { vinculo: 'Situationship', natureza: 'Romance' },
    { vinculo: 'Amigos', natureza: 'Amizade' },
    ...ROTULOS_VINCULO_DE_FABRICA.map((r) => ({ vinculo: r.nome, natureza: 'Familiar' })),
];

export const TIPOS_OPCAO_PERIODO_BIOGRAFICO = ['esferas', 'categorias', 'naturezas', 'vinculos'];

const semAcento = (s) =>
    String(s ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

// Chave de comparação: sem caixa, sem acento, espaços colapsados.
export function chaveValor(s) {
    return semAcento(s).replace(/\s+/g, ' ');
}

// Tira vazios e repetidos (sem diferenciar caixa nem acento), mantendo a
// primeira grafia e a ordem.
export function normalizarLista(lista) {
    const vistos = new Set();
    const saida = [];
    (Array.isArray(lista) ? lista : []).forEach((v) => {
        if (typeof v !== 'string') return;
        const texto = v.replace(/\s+/g, ' ').trim();
        const chave = chaveValor(texto);
        if (!chave || vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(texto);
    });
    return saida;
}

// ─── Normalização ────────────────────────────────────────────────────────

const limparTexto = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

function normalizarPonta(x) {
    if (x === AUTOR) return AUTOR;
    if (x == null || x === '' || typeof x === 'boolean') return null;
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}

// Formato antigo: o "vínculo" era a categoria da relação. Um dos seis de
// fábrica vira Natureza (vínculo vazio); um rótulo de fábrica (Responsável
// por, Avô ou avó de, Tio ou tia de, Irmão ou irmã de, e o lado oposto de
// cada um) mantém o vínculo e ganha a Natureza Familiar; qualquer outro, criado
// pela pessoa, mantém o vínculo e fica sem Natureza (ela ajusta à mão).
export function converterVinculoLegado(vinculoAntigo) {
    const texto = limparTexto(vinculoAntigo);
    const chave = chaveValor(texto);
    const categoria = VINCULOS_ANTIGOS_DE_FABRICA.find(([antigo]) => chaveValor(antigo) === chave);
    if (categoria) return { natureza: categoria[1], vinculo: '' };
    const ehRotuloDeFabrica = ROTULOS_VINCULO_DE_FABRICA.some(
        (r) => chaveValor(r.nome) === chave || (r.inverso && chaveValor(r.inverso) === chave),
    );
    return { natureza: ehRotuloDeFabrica ? 'Familiar' : '', vinculo: texto };
}

const temChaveNatureza = (r) => r !== null && typeof r === 'object' && 'natureza' in r;

// Relação válida: duas pontas diferentes e ao menos a Natureza ou o Vínculo
// com texto. Repetida (mesma ordem de pontas, Natureza e Vínculo) some. Uma
// relação sem a chave `natureza` é do formato antigo e é convertida.
export function normalizarRelacoes(lista) {
    const vistos = new Set();
    const saida = [];
    (Array.isArray(lista) ? lista : []).forEach((r) => {
        const de = normalizarPonta(r?.de);
        const para = normalizarPonta(r?.para);
        const { natureza, vinculo } = temChaveNatureza(r)
            ? { natureza: limparTexto(r.natureza), vinculo: limparTexto(r.vinculo) }
            : converterVinculoLegado(r?.vinculo);
        if (de === null || para === null || de === para || (!natureza && !vinculo)) return;
        const chave = `${de}|${para}|${chaveValor(natureza)}|${chaveValor(vinculo)}`;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        saida.push({ de, para, natureza, vinculo });
    });
    return saida;
}

// Um item por pessoa, só com `pessoaId` (o campo antigo `vinculos` sai).
// Pessoa citada numa relação entra sozinha, no fim da lista.
export function normalizarPessoasEnvolvidas(lista, relacoes = []) {
    const ids = [];
    const ver = (valor) => {
        const id = normalizarPonta(valor);
        if (id === null || id === AUTOR || ids.includes(id)) return;
        ids.push(id);
    };
    (Array.isArray(lista) ? lista : []).forEach((e) => ver(e?.pessoaId));
    (Array.isArray(relacoes) ? relacoes : []).forEach((r) => {
        ver(r?.de);
        ver(r?.para);
    });
    return ids.map((pessoaId) => ({ pessoaId }));
}

// Pessoas e relações de um período, já coerentes entre si.
export function normalizarEnvolvidosDoPeriodo({ pessoasEnvolvidas, relacoes } = {}) {
    // Formato antigo: { pessoaId, vinculos } sempre em relação ao autor.
    const antigas = [];
    (Array.isArray(pessoasEnvolvidas) ? pessoasEnvolvidas : []).forEach((e) => {
        (Array.isArray(e?.vinculos) ? e.vinculos : []).forEach((v) =>
            antigas.push({ de: AUTOR, para: e.pessoaId, vinculo: v }),
        );
    });
    const rels = normalizarRelacoes([...(Array.isArray(relacoes) ? relacoes : []), ...antigas]);
    return {
        relacoes: rels,
        pessoasEnvolvidas: normalizarPessoasEnvolvidas(pessoasEnvolvidas, rels),
    };
}

const CAMPOS_ROTULO = [
    'inverso',
    'feminino',
    'masculino',
    'inversoFeminino',
    'inversoMasculino',
    'pluralFeminino',
    'pluralMasculino',
    'pluralNeutro',
    'nota',
];

function normalizarUmRotulo(r) {
    const nome = limparTexto(r?.nome);
    if (!nome) return null;
    const saida = { nome };
    CAMPOS_ROTULO.forEach((c) => {
        saida[c] = limparTexto(r?.[c]);
    });
    // Sem lado oposto, as formas do lado oposto não fazem sentido.
    if (!saida.inverso) {
        saida.inversoFeminino = '';
        saida.inversoMasculino = '';
    }
    return saida;
}

export function normalizarRotulosVinculo(lista) {
    const vistos = new Set();
    const saida = [];
    (Array.isArray(lista) ? lista : []).forEach((r) => {
        const item = normalizarUmRotulo(r);
        if (!item) return;
        const chave = chaveValor(item.nome);
        if (vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(item);
    });
    return saida;
}

// ─── Migração ────────────────────────────────────────────────────────────

// O campo antigo "Contexto do relacionamento" (`contextoRelacao`) saiu do app
// (13/10/2026). Para não perder texto: com pessoa ligada ao período ele só é
// descartado (as pessoas e as relações o substituem); sem pessoa ligada, o
// texto vai para o fim das Notas, uma única vez, e a chave é apagada.
function absorverContextoRelacaoLegado(e) {
    if (!('contextoRelacao' in e)) return;
    const texto = String(e.contextoRelacao ?? '').trim();
    delete e.contextoRelacao;
    if (!texto || e.pessoasEnvolvidas.length > 0) return;
    const notas = String(e.notas ?? '');
    if (notas.includes(texto)) return;
    const nota = `Contexto do relacionamento (texto antigo): ${texto}`;
    e.notas = notas.trim() ? `${notas.trimEnd()}\n\n${nota}` : nota;
}

// Períodos antigos ganham listas vazias. Os `vinculos` por pessoa do formato
// anterior viram relações autor → pessoa, e o `contextoRelacao` é absorvido
// (ver acima). Idempotente.
export function migrarCamposPeriodoBiografico(epocas) {
    (epocas || []).forEach((e) => {
        e.esferas = normalizarLista(e.esferas);
        e.categorias = normalizarLista(e.categorias);
        const { pessoasEnvolvidas, relacoes } = normalizarEnvolvidosDoPeriodo(e);
        e.pessoasEnvolvidas = pessoasEnvolvidas;
        e.relacoes = relacoes;
        absorverContextoRelacaoLegado(e);
    });
}

// Sugestões válidas, um item por Vínculo: ou uma Natureza com texto, ou
// `varia: true` (o vínculo não tem uma Natureza só; decisão explícita, que não
// preenche nada, diferente de não ter sugestão).
function normalizarSugestoesNatureza(lista) {
    const vistos = new Set();
    const saida = [];
    (Array.isArray(lista) ? lista : []).forEach((s) => {
        const vinculo = limparTexto(s?.vinculo);
        const varia = s?.varia === true;
        const natureza = varia ? '' : limparTexto(s?.natureza);
        const chave = chaveValor(vinculo);
        if (!vinculo || (!natureza && !varia) || vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(varia ? { vinculo, natureza: '', varia: true } : { vinculo, natureza });
    });
    return saida;
}

// Vocabulário completo de uma instalação nova (a chave padrão de `db`). Os
// rótulos de lado oposto e gênero são semeados pela migração.
export function opcoesDeFabricaPeriodoBiografico() {
    return {
        esferas: [...ESFERAS_DE_FABRICA],
        categorias: [...CATEGORIAS_DE_FABRICA],
        naturezas: [...NATUREZAS_DE_FABRICA],
        vinculos: [...VINCULOS_DE_FABRICA],
        sugestoesNatureza: SUGESTOES_NATUREZA_DE_FABRICA.map((s) => ({ ...s })),
    };
}

// Retira a primeira versão da fábrica terapêutica quando ela está intacta (o
// rótulo igual ao de fábrica) e nenhum período usa o vínculo.
function retirarFabricaTerapeuticaV1(estado, vinculosEmUso) {
    const { rotulo } = FABRICA_TERAPEUTICA_V1;
    const atual = estado.rotulos.find((r) => chaveValor(r.nome) === chaveValor(rotulo.nome));
    if (!atual) return estado;
    const intacto = CAMPOS_ROTULO.every((c) => (atual[c] || '') === (rotulo[c] || ''));
    const emUso = [rotulo.nome, rotulo.inverso].some((v) => vinculosEmUso.has(chaveValor(v)));
    if (!intacto || emUso) return estado;
    const chave = chaveValor(rotulo.nome);
    return {
        ...estado,
        vinculos: estado.vinculos.filter((v) => chaveValor(v) !== chave),
        sugestoes: estado.sugestoes.filter((sug) => chaveValor(sug.vinculo) !== chave),
        rotulos: estado.rotulos.filter((r) => chaveValor(r.nome) !== chave),
    };
}

// Põe a Natureza "Vínculo terapêutico" e o vínculo orientado "Psicoterapeuta de"
// / "Psicoterapeutizando de" uma única vez. Se o nome do
// lado oposto já existe como outro vínculo, o rótulo não entra (para não criar
// conflito), mas a Natureza entra.
function aplicarFabricaTerapeutica(estado, vinculosEmUso) {
    if (estado.fabricaAplicada.some((id) => chaveValor(id) === FABRICA_PSICOTERAPIA.id))
        return estado;
    let atual = estado;
    if (atual.fabricaAplicada.some((id) => chaveValor(id) === FABRICA_TERAPEUTICA_V1.id))
        atual = retirarFabricaTerapeuticaV1(atual, vinculosEmUso);
    const { natureza, rotulo } = FABRICA_PSICOTERAPIA;
    const marcada = [...atual.fabricaAplicada, FABRICA_PSICOTERAPIA.id];
    const chavesVinculos = new Set(atual.vinculos.map(chaveValor));
    const conflito =
        chavesVinculos.has(chaveValor(rotulo.inverso)) ||
        atual.rotulos.some(
            (r) =>
                chaveValor(r.nome) === chaveValor(rotulo.nome) ||
                chaveValor(r.inverso) === chaveValor(rotulo.inverso),
        );
    const naturezas = normalizarLista([...atual.naturezas, natureza]);
    if (conflito) return { ...atual, naturezas, fabricaAplicada: marcada };
    return {
        fabricaAplicada: marcada,
        naturezas,
        vinculos: normalizarLista([...atual.vinculos, rotulo.nome]),
        sugestoes: normalizarSugestoesNatureza([
            ...atual.sugestoes,
            { vinculo: rotulo.nome, natureza },
        ]),
        rotulos: normalizarRotulosVinculo([...atual.rotulos, { ...rotulo }]),
    };
}

// Só na primeira semeadura da lista de Categoria: o valor que o período já
// tinha, igual a um da lista (sem caixa nem acento), passa a usar a grafia
// da lista ("crise" vira "Crise"). Os outros ficam como estão.
function alinharCategoriasComALista(epocas, lista) {
    const porChave = new Map(lista.map((v) => [chaveValor(v), v]));
    (epocas || []).forEach((e) => {
        if (!Array.isArray(e.categorias)) return;
        e.categorias = normalizarLista(
            e.categorias.map((v) => (typeof v === 'string' && porChave.get(chaveValor(v))) || v),
        );
    });
}

// Semeia a lista de fábrica uma vez (chave ausente) e garante que todo
// valor já usado num período esteja na lista (backup de outro aparelho).
//
// Natureza (13/10/2026): a chave `naturezas` ausente marca o vocabulário do
// formato anterior, em que os seis vínculos de fábrica (Romântico, Sexual,
// Amizade, Familiar, Profissional, Colega) eram categorias. Nessa única vez
// eles saem da lista de Vínculos (viraram Naturezas) e os laços de fábrica
// entram. Com a chave presente, o vocabulário só é normalizado: o que a pessoa
// apagou de propósito não volta, e um vínculo "Amizade" digitado depois não é
// tirado da lista.
export function migrarOpcoesPeriodoBiografico(dbRef) {
    const atual = dbRef.opcoesPeriodoBiografico;
    const base = atual && typeof atual === 'object' ? atual : {};
    const semearRotulos = !Array.isArray(base.rotulosVinculo);
    const formatoAnterior = !Array.isArray(base.naturezas);
    let rotulos = semearRotulos
        ? ROTULOS_VINCULO_DE_FABRICA.map((r) => ({ ...r }))
        : normalizarRotulosVinculo(base.rotulosVinculo);
    // Uma única vez (instalação nova ou formato anterior): os laços de fábrica
    // ganham o plural.
    if (formatoAnterior || semearRotulos)
        rotulos = normalizarRotulosVinculo([
            ...rotulos,
            ...ROTULOS_PLURAIS_DE_FABRICA.map((r) => ({ ...r })),
        ]);
    let vinculos = Array.isArray(base.vinculos) ? normalizarLista(base.vinculos) : [];
    if (formatoAnterior) {
        const antigos = new Set(VINCULOS_ANTIGOS_DE_FABRICA.map(([nome]) => chaveValor(nome)));
        vinculos = normalizarLista([
            ...vinculos.filter((v) => !antigos.has(chaveValor(v))),
            ...VINCULOS_DE_FABRICA,
        ]);
    }
    // Primeira vez com rótulos: os nomes de fábrica entram na lista.
    if (semearRotulos) vinculos = normalizarLista([...vinculos, ...rotulos.map((r) => r.nome)]);

    const emUso = (campo) => {
        const saida = [];
        (dbRef.epocas || []).forEach((e) =>
            (e.relacoes || []).forEach((r) => r[campo] && saida.push(r[campo])),
        );
        return saida;
    };
    const naturezas = formatoAnterior
        ? normalizarLista([...NATUREZAS_DE_FABRICA, ...emUso('natureza')])
        : normalizarLista(base.naturezas);
    let sugestoes;
    if (Array.isArray(base.sugestoesNatureza)) {
        sugestoes = normalizarSugestoesNatureza(base.sugestoesNatureza);
    } else {
        const nomes = new Set(vinculos.map(chaveValor));
        sugestoes = SUGESTOES_NATUREZA_DE_FABRICA.filter((s) => nomes.has(chaveValor(s.vinculo)));
    }
    const fabricaAplicada = normalizarLista(base.fabricaAplicada);
    const vinculosEmUso = new Set(emUso('vinculo').map(chaveValor));
    const fabrica = aplicarFabricaTerapeutica(
        { fabricaAplicada, naturezas, vinculos, sugestoes, rotulos },
        vinculosEmUso,
    );
    // Categoria ganhou lista em 15/10/2026. Chave ausente = vocabulário do formato
    // anterior (a Categoria era etiqueta livre): a fábrica entra uma única vez e
    // o que cada período já tinha escrito passa a usar a grafia da lista quando é o
    // mesmo valor (sem caixa nem acento). O que não está na fábrica entra na lista
    // (por `registrarValoresNovos`, abaixo), então nada some. Com a chave
    // presente, o que a pessoa apagou ou renomeou não volta.
    const semearCategorias = !Array.isArray(base.categorias);
    const categorias = semearCategorias
        ? [...CATEGORIAS_DE_FABRICA]
        : normalizarLista(base.categorias);
    if (semearCategorias) alinharCategoriasComALista(dbRef.epocas, categorias);
    dbRef.opcoesPeriodoBiografico = {
        fabricaAplicada: fabrica.fabricaAplicada,
        esferas: Array.isArray(base.esferas)
            ? normalizarLista(base.esferas)
            : [...ESFERAS_DE_FABRICA],
        categorias,
        naturezas: fabrica.naturezas,
        vinculos: fabrica.vinculos,
        sugestoesNatureza: fabrica.sugestoes.map((s) => ({ ...s })),
        rotulosVinculo: fabrica.rotulos,
    };
    (dbRef.epocas || []).forEach((e) => registrarValoresNovos(dbRef, e));
}

// ─── Rótulos de vínculo e gênero ─────────────────────────────────────────

// Acha o rótulo que descreve um nome de vínculo, pelo lado direto ou pelo
// oposto. Devolve { rotulo, lado: 'direto' | 'inverso' } ou null.
export function acharRotuloVinculo(dbRef, nome) {
    const chave = chaveValor(nome);
    if (!chave) return null;
    const lista = dbRef.opcoesPeriodoBiografico?.rotulosVinculo || [];
    for (const rotulo of lista) {
        if (chaveValor(rotulo.nome) === chave) return { rotulo, lado: 'direto' };
        if (rotulo.inverso && chaveValor(rotulo.inverso) === chave)
            return { rotulo, lado: 'inverso' };
    }
    return null;
}

// Chave do TIPO de vínculo: "Responsável por" e "Filho ou filha de" são o
// mesmo tipo (um é o outro visto do lado oposto). Usada em filtro e contagem.
export function chaveTipoVinculo(dbRef, nome) {
    const achado = acharRotuloVinculo(dbRef, nome);
    return achado ? chaveValor(achado.rotulo.nome) : chaveValor(nome);
}

// Gênero da Pessoa é texto livre. Só "Mulher" e "Homem" (ou Feminino e
// Masculino) escolhem uma forma; qualquer outro valor, ou vazio, usa a neutra.
export function categoriaGenero(genero) {
    const chave = chaveValor(genero);
    if (chave === 'mulher' || chave === 'feminino' || chave === 'feminina') return 'feminino';
    if (chave === 'homem' || chave === 'masculino') return 'masculino';
    return '';
}

// Nome do papel de quem ocupa um lado do vínculo, na forma do seu gênero.
export function nomeDoPapel(rotulo, lado, genero) {
    const g = categoriaGenero(genero);
    if (lado === 'direto') {
        return (
            (g === 'feminino' && rotulo.feminino) ||
            (g === 'masculino' && rotulo.masculino) ||
            rotulo.nome
        );
    }
    return (
        (g === 'feminino' && rotulo.inversoFeminino) ||
        (g === 'masculino' && rotulo.inversoMasculino) ||
        rotulo.inverso
    );
}

const minuscula = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

// Frases da relação (a regra vem do que está configurado em "Papéis", o
// texto do vínculo nunca é interpretado):
//   vínculo com papéis ........ "Carla é mãe de Davi";
//   simétrico com plural ...... "Ana e Mariana são amigas" (ver pluralDoVinculo:
//                               feminino, masculino ou neutro, que cai no masculino);
//   simétrico sem plural ...... "Carla e Davi: Mentoria";
//   só Natureza ............... "Carla e Davi têm uma relação de romance".
export function fraseDaRelacao(relacao, de, para, dbRef) {
    const vinculo = limparTexto(relacao.vinculo);
    if (!vinculo) {
        const natureza = limparTexto(relacao.natureza);
        return natureza
            ? `${de.nome} e ${para.nome} têm uma relação de ${minuscula(natureza)}`
            : `${de.nome} e ${para.nome}`;
    }
    const achado = acharRotuloVinculo(dbRef, vinculo);
    if (achado && !achado.rotulo.inverso) {
        const plural = pluralDoVinculo(achado.rotulo, de.genero, para.genero);
        if (plural) return `${de.nome} e ${para.nome} são ${minuscula(plural)}`;
    }
    const comPapel =
        achado &&
        (achado.lado === 'inverso' ||
            achado.rotulo.inverso ||
            achado.rotulo.feminino ||
            achado.rotulo.masculino);
    if (comPapel) {
        const papel = nomeDoPapel(achado.rotulo, achado.lado, de.genero);
        return `${de.nome} é ${minuscula(papel)} ${para.nome}`;
    }
    return `${de.nome} e ${para.nome}: ${vinculo}`;
}

// Plural de um vínculo simétrico conforme o gênero das duas pontas: duas
// Mulheres usam o plural feminino; dois Homens, o masculino; qualquer outra
// combinação (um de cada, outro gênero ou vazio) usa o plural neutro e, se ele
// estiver vazio, o masculino (regra padrão do português). '' quando o campo
// necessário não está preenchido (a frase volta ao formato com dois-pontos).
export function pluralDoVinculo(rotulo, generoDe, generoPara) {
    const de = categoriaGenero(generoDe);
    const para = categoriaGenero(generoPara);
    if (de === 'feminino' && para === 'feminino') return rotulo.pluralFeminino || '';
    if (de === 'masculino' && para === 'masculino') return rotulo.pluralMasculino || '';
    return rotulo.pluralNeutro || rotulo.pluralMasculino || '';
}

// Nota que explica o termo de um vínculo ('' se não há), pelo nome direto ou
// pelo lado oposto.
export function notaDoVinculo(dbRef, vinculo) {
    return acharRotuloVinculo(dbRef, vinculo)?.rotulo.nota || '';
}

// ─── Vocabulário ─────────────────────────────────────────────────────────

function valoresEmUso(dbRef, tipo, opcoes = {}) {
    const saida = [];
    periodosVisiveis(dbRef.epocas, opcoes).forEach((e) => {
        if (tipo === 'esferas') saida.push(...(e.esferas || []));
        else if (tipo === 'categorias') saida.push(...(e.categorias || []));
        else
            (e.relacoes || []).forEach((r) => {
                const valor = tipo === 'naturezas' ? r.natureza : r.vinculo;
                if (valor) saida.push(valor);
            });
    });
    return saida;
}

// Nomes do lado oposto dos rótulos: aparecem como escolha, mas não são
// vínculos "próprios" da lista.
function nomesInversos(dbRef) {
    return (dbRef.opcoesPeriodoBiografico?.rotulosVinculo || [])
        .map((r) => r.inverso)
        .filter(Boolean);
}

// Lista de fábrica/editável + o que já está em uso (nunca some uma opção
// que algum período usa). Em Vínculo, inclui o lado oposto dos rótulos.
export function opcoesDoPeriodoBiografico(dbRef, tipo) {
    const lista = dbRef.opcoesPeriodoBiografico?.[tipo] || [];
    const inversos = tipo === 'vinculos' ? nomesInversos(dbRef) : [];
    return normalizarLista([...lista, ...inversos, ...valoresEmUso(dbRef, tipo)]).sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
    );
}

// Valor digitado que não está na lista entra nela (Esfera, Categoria,
// Natureza e Vínculo). O lado oposto de um rótulo já existe e não entra como vínculo
// próprio.
export function registrarValoresNovos(dbRef, epoca) {
    if (!dbRef.opcoesPeriodoBiografico) return;
    const op = dbRef.opcoesPeriodoBiografico;
    op.esferas = normalizarLista([...(op.esferas || []), ...(epoca.esferas || [])]);
    op.categorias = normalizarLista([...(op.categorias || []), ...(epoca.categorias || [])]);
    const relacoes = epoca.relacoes || [];
    op.naturezas = normalizarLista([...(op.naturezas || []), ...relacoes.map((r) => r.natureza)]);
    const novos = relacoes
        .map((r) => r.vinculo)
        .filter((v) => v && acharRotuloVinculo(dbRef, v)?.lado !== 'inverso');
    op.vinculos = normalizarLista([...(op.vinculos || []), ...novos]);
}

// Quantos períodos usam o valor (Esfera, Categoria, Natureza ou Vínculo; em
// Vínculo, os dois lados do mesmo tipo contam juntos).
export function contarUsoOpcao(dbRef, tipo, valor) {
    const chave = chaveValor(valor);
    const chaveTipo = tipo === 'vinculos' ? chaveTipoVinculo(dbRef, valor) : '';
    return (dbRef.epocas || []).filter((e) => {
        if (tipo === 'vinculos')
            return (e.relacoes || []).some(
                (r) => r.vinculo && chaveTipoVinculo(dbRef, r.vinculo) === chaveTipo,
            );
        if (tipo === 'naturezas')
            return (e.relacoes || []).some((r) => r.natureza && chaveValor(r.natureza) === chave);
        return (e[tipo] || []).some((v) => chaveValor(v) === chave);
    }).length;
}

// Troca, nas relações, o lado oposto de um rótulo: vira o nome direto com as
// pontas trocadas (mesma relação dita do outro lado).
function virarRelacoesParaNomeDireto(dbRef, nomeInverso, nomeDireto) {
    const chave = chaveValor(nomeInverso);
    (dbRef.epocas || []).forEach((e) => {
        (e.relacoes || []).forEach((r) => {
            if (chaveValor(r.vinculo) !== chave) return;
            const de = r.de;
            r.de = r.para;
            r.para = de;
            r.vinculo = nomeDireto;
        });
        e.relacoes = normalizarRelacoes(e.relacoes);
    });
}

function trocarNomeNasRelacoes(dbRef, de, para) {
    const chave = chaveValor(de);
    (dbRef.epocas || []).forEach((e) => {
        (e.relacoes || []).forEach((r) => {
            if (chaveValor(r.vinculo) === chave) r.vinculo = para;
        });
        e.relacoes = normalizarRelacoes(e.relacoes);
    });
}

// Renomeia na lista e em todos os períodos. Se o novo nome já existe,
// os dois viram um só. Devolve { ok, motivo? }.
export function renomearOpcaoPeriodoBiografico(dbRef, tipo, de, para) {
    if (!TIPOS_OPCAO_PERIODO_BIOGRAFICO.includes(tipo)) return { ok: false, motivo: 'tipo' };
    const novo = limparTexto(para);
    if (!novo) return { ok: false, motivo: 'vazio' };
    const chaveAntiga = chaveValor(de);
    // O nome do lado oposto de um rótulo não pode virar um vínculo próprio.
    if (
        tipo === 'vinculos' &&
        chaveValor(novo) !== chaveAntiga &&
        acharRotuloVinculo(dbRef, novo)?.lado === 'inverso'
    )
        return { ok: false, motivo: 'conflito' };
    const trocar = (lista) =>
        normalizarLista((lista || []).map((v) => (chaveValor(v) === chaveAntiga ? novo : v)));
    const op = dbRef.opcoesPeriodoBiografico;
    if (tipo === 'esferas' || tipo === 'categorias') {
        if (op) op[tipo] = trocar(op[tipo]);
        (dbRef.epocas || []).forEach((e) => {
            e[tipo] = trocar(e[tipo]);
        });
        return { ok: true };
    }
    if (tipo === 'naturezas') {
        if (op) {
            op.naturezas = trocar(op.naturezas);
            op.sugestoesNatureza = normalizarSugestoesNatureza(
                (op.sugestoesNatureza || []).map((sug) =>
                    chaveValor(sug.natureza) === chaveAntiga ? { ...sug, natureza: novo } : sug,
                ),
            );
        }
        (dbRef.epocas || []).forEach((e) => {
            (e.relacoes || []).forEach((r) => {
                if (chaveValor(r.natureza) === chaveAntiga) r.natureza = novo;
            });
            e.relacoes = normalizarRelacoes(e.relacoes);
        });
        return { ok: true };
    }
    // Vínculo: o rótulo de quem foi renomeado vai junto; se o destino já tem
    // rótulo próprio, o do renomeado é descartado e as relações que usavam o
    // lado oposto dele passam para o nome direto do destino.
    const rotulos = op?.rotulosVinculo || [];
    const origem = rotulos.find((r) => chaveValor(r.nome) === chaveAntiga);
    const destinoExiste = opcoesDoPeriodoBiografico(dbRef, 'vinculos').some(
        (v) => chaveValor(v) === chaveValor(novo) && chaveValor(v) !== chaveAntiga,
    );
    if (op) {
        op.vinculos = trocar(op.vinculos);
        // A Natureza sugerida acompanha o nome; se o destino já tinha a sua, vale a dele.
        const juntando = chaveValor(novo) !== chaveAntiga;
        const destinoTemSugestao = (op.sugestoesNatureza || []).some(
            (sug) => juntando && chaveValor(sug.vinculo) === chaveValor(novo),
        );
        op.sugestoesNatureza = (op.sugestoesNatureza || [])
            .filter((sug) => !(destinoTemSugestao && chaveValor(sug.vinculo) === chaveAntiga))
            .map((sug) =>
                chaveValor(sug.vinculo) === chaveAntiga ? { ...sug, vinculo: novo } : sug,
            );
    }
    if (origem) {
        if (destinoExiste && chaveValor(novo) !== chaveAntiga) {
            op.rotulosVinculo = rotulos.filter((r) => r !== origem);
            if (origem.inverso) virarRelacoesParaNomeDireto(dbRef, origem.inverso, novo);
        } else {
            origem.nome = novo;
        }
    }
    trocarNomeNasRelacoes(dbRef, de, novo);
    return { ok: true };
}

// Só remove valor que nenhum período usa. Devolve { ok, motivo?, uso? }.
export function removerOpcaoPeriodoBiografico(dbRef, tipo, valor) {
    if (!TIPOS_OPCAO_PERIODO_BIOGRAFICO.includes(tipo)) return { ok: false, motivo: 'tipo' };
    const uso = contarUsoOpcao(dbRef, tipo, valor);
    if (uso > 0) return { ok: false, motivo: 'em-uso', uso };
    const chave = chaveValor(valor);
    const op = dbRef.opcoesPeriodoBiografico;
    if (op) {
        op[tipo] = (op[tipo] || []).filter((v) => chaveValor(v) !== chave);
        if (tipo === 'vinculos') {
            op.rotulosVinculo = (op.rotulosVinculo || []).filter(
                (r) => chaveValor(r.nome) !== chave,
            );
            op.sugestoesNatureza = (op.sugestoesNatureza || []).filter(
                (sug) => chaveValor(sug.vinculo) !== chave,
            );
        }
        // Sugestão que apontava para a Natureza apagada não faz mais sentido.
        if (tipo === 'naturezas')
            op.sugestoesNatureza = (op.sugestoesNatureza || []).filter(
                (sug) => chaveValor(sug.natureza) !== chave,
            );
    }
    return { ok: true };
}

// ─── Natureza sugerida por Vínculo ───────────────────────────────────────

// A sugestão vale para o nome direto do vínculo e para o lado oposto dele
// ("Responsável por" e "Filho ou filha de" são o mesmo tipo).
function chaveDaSugestao(dbRef, vinculo) {
    const achado = acharRotuloVinculo(dbRef, vinculo);
    return achado ? chaveValor(achado.rotulo.nome) : chaveValor(vinculo);
}

// Natureza que o vocabulário sugere para o Vínculo ('' se não há sugestão).
// É só sugestão: a relação guarda a Natureza dela e pode trocá-la.
export function naturezaSugeridaDoVinculo(dbRef, vinculo) {
    const chave = chaveDaSugestao(dbRef, vinculo);
    if (!chave) return '';
    const achada = (dbRef.opcoesPeriodoBiografico?.sugestoesNatureza || []).find(
        (sug) => chaveValor(sug.vinculo) === chave,
    );
    return achada ? achada.natureza : '';
}

// O vínculo foi marcado como "Varia" (sem Natureza única). Não preenche nada
// nas relações; só distingue "decidi que varia" de "ainda não decidi".
export function vinculoVariaDeNatureza(dbRef, vinculo) {
    const chave = chaveDaSugestao(dbRef, vinculo);
    if (!chave) return false;
    return (dbRef.opcoesPeriodoBiografico?.sugestoesNatureza || []).some(
        (sug) => sug.varia === true && chaveValor(sug.vinculo) === chave,
    );
}

// Marca o vínculo como "Varia", trocando qualquer Natureza sugerida antes.
export function definirVinculoVaria(dbRef, vinculo) {
    const op = dbRef.opcoesPeriodoBiografico;
    if (!op) return { ok: false, motivo: 'sem-opcoes' };
    const achado = acharRotuloVinculo(dbRef, vinculo);
    const nome = achado ? achado.rotulo.nome : limparTexto(vinculo);
    const chave = chaveValor(nome);
    if (!chave) return { ok: false, motivo: 'vazio' };
    const resto = (op.sugestoesNatureza || []).filter((sug) => chaveValor(sug.vinculo) !== chave);
    op.sugestoesNatureza = [...resto, { vinculo: nome, natureza: '', varia: true }];
    op.vinculos = normalizarLista([...(op.vinculos || []), nome]);
    return { ok: true };
}

// Define (ou, com Natureza vazia, apaga) a sugestão de um Vínculo. A Natureza
// nova e o Vínculo entram nas listas. Devolve { ok, motivo? }.
export function definirNaturezaSugerida(dbRef, vinculo, natureza) {
    const op = dbRef.opcoesPeriodoBiografico;
    if (!op) return { ok: false, motivo: 'sem-opcoes' };
    const achado = acharRotuloVinculo(dbRef, vinculo);
    const nome = achado ? achado.rotulo.nome : limparTexto(vinculo);
    const chave = chaveValor(nome);
    if (!chave) return { ok: false, motivo: 'vazio' };
    const resto = (op.sugestoesNatureza || []).filter((sug) => chaveValor(sug.vinculo) !== chave);
    const nova = limparTexto(natureza);
    if (!nova) {
        op.sugestoesNatureza = resto;
        return { ok: true };
    }
    op.sugestoesNatureza = [...resto, { vinculo: nome, natureza: nova }];
    op.naturezas = normalizarLista([...(op.naturezas || []), nova]);
    op.vinculos = normalizarLista([...(op.vinculos || []), nome]);
    return { ok: true };
}

// Define (ou limpa) o lado oposto e as formas por gênero de um vínculo.
// Devolve { ok, motivo? }. Mudar o lado oposto acompanha as relações que o
// usam; tirá-lo vira essas relações para o nome direto.
export function definirRotuloVinculo(dbRef, nome, detalhes) {
    const op = dbRef.opcoesPeriodoBiografico;
    if (!op) return { ok: false, motivo: 'sem-opcoes' };
    const chave = chaveValor(nome);
    const rotulos = op.rotulosVinculo || [];
    const atual = rotulos.find((r) => chaveValor(r.nome) === chave);
    const novo = normalizarUmRotulo({ ...detalhes, nome: atual?.nome || limparTexto(nome) });
    if (!novo) return { ok: false, motivo: 'vazio' };
    if (novo.inverso) {
        const chaveInverso = chaveValor(novo.inverso);
        const conflito =
            chaveInverso === chave ||
            opcoesDoPeriodoBiografico(dbRef, 'vinculos').some(
                (v) =>
                    chaveValor(v) === chaveInverso && chaveValor(v) !== chaveValor(atual?.inverso),
            ) ||
            rotulos.some((r) => r !== atual && r.inverso && chaveValor(r.inverso) === chaveInverso);
        if (conflito) return { ok: false, motivo: 'conflito' };
    }
    const inversoAntigo = atual?.inverso || '';
    if (inversoAntigo && !novo.inverso) {
        virarRelacoesParaNomeDireto(dbRef, inversoAntigo, novo.nome);
    } else if (
        inversoAntigo &&
        novo.inverso &&
        chaveValor(inversoAntigo) !== chaveValor(novo.inverso)
    ) {
        trocarNomeNasRelacoes(dbRef, inversoAntigo, novo.inverso);
    }
    const vazio = CAMPOS_ROTULO.every((c) => !novo[c]);
    const semAtual = rotulos.filter((r) => r !== atual);
    op.rotulosVinculo = vazio ? semAtual : [...semAtual, novo];
    op.vinculos = normalizarLista([...(op.vinculos || []), novo.nome]);
    return { ok: true };
}

// ─── Pessoas: mesclar e excluir ──────────────────────────────────────────

// Mesclar Pessoas: a origem vira o destino nos períodos (envolvidas e
// relações). Relação que vira uma pessoa com ela mesma some.
export function mesclarPessoaNosPeriodos(dbRef, origemId, destinoId) {
    if (origemId == destinoId) return;
    const destino = Number(destinoId);
    (dbRef.epocas || []).forEach((e) => {
        const nasRelacoes = (e.relacoes || []).some((r) => r.de == origemId || r.para == origemId);
        const nasPessoas = (e.pessoasEnvolvidas || []).some((p) => p.pessoaId == origemId);
        if (!nasRelacoes && !nasPessoas) return;
        const trocar = (ponta) => (ponta == origemId ? destino : ponta);
        const relacoes = (e.relacoes || []).map((r) => ({
            ...r,
            de: trocar(r.de),
            para: trocar(r.para),
        }));
        const pessoas = (e.pessoasEnvolvidas || []).map((p) => ({
            ...p,
            pessoaId: trocar(p.pessoaId),
        }));
        e.relacoes = normalizarRelacoes(relacoes);
        e.pessoasEnvolvidas = normalizarPessoasEnvolvidas(pessoas, e.relacoes);
    });
}

// Excluir Pessoa: tira dos períodos (envolvidas e relações) e devolve o que
// saiu, para o Desfazer.
export function removerPessoaDosPeriodos(dbRef, pessoaId) {
    const removidos = [];
    (dbRef.epocas || []).forEach((e) => {
        const indice = Array.isArray(e.pessoasEnvolvidas)
            ? e.pessoasEnvolvidas.findIndex((p) => p.pessoaId == pessoaId)
            : -1;
        const todas = Array.isArray(e.relacoes) ? e.relacoes : [];
        const saindo = todas
            .map((relacao, i) => ({ relacao, indice: i }))
            .filter(({ relacao }) => relacao.de == pessoaId || relacao.para == pessoaId);
        if (indice < 0 && saindo.length === 0) return;
        let entrada = null;
        if (indice >= 0) [entrada] = e.pessoasEnvolvidas.splice(indice, 1);
        if (saindo.length) e.relacoes = todas.filter((r) => r.de != pessoaId && r.para != pessoaId);
        removidos.push({ epocaId: e.id, entrada, indice, relacoes: saindo });
    });
    return removidos;
}

export function restaurarPessoaNosPeriodos(dbRef, removidos) {
    (removidos || []).forEach(({ epocaId, entrada, indice, relacoes }) => {
        const e = (dbRef.epocas || []).find((x) => x.id == epocaId);
        if (!e) return;
        if (entrada) {
            e.pessoasEnvolvidas ||= [];
            if (!e.pessoasEnvolvidas.some((p) => p.pessoaId == entrada.pessoaId))
                e.pessoasEnvolvidas.splice(
                    Math.min(indice, e.pessoasEnvolvidas.length),
                    0,
                    entrada,
                );
        }
        e.relacoes ||= [];
        (relacoes || []).forEach(({ relacao, indice: posicao }) => {
            e.relacoes.splice(Math.min(posicao, e.relacoes.length), 0, relacao);
        });
    });
}

// Mesclar Períodos (origem some, destino fica): une as listas; Esfera e
// Categoria somam; pessoas e relações repetidas se juntam. Se qualquer um dos
// dois estava oculto, o resultado fica oculto (na dúvida, a privacidade vence).
export function mesclarCamposDosPeriodos(destino, origem) {
    destino.oculto = !!(destino.oculto || origem.oculto);
    destino.esferas = normalizarLista([...(destino.esferas || []), ...(origem.esferas || [])]);
    destino.categorias = normalizarLista([
        ...(destino.categorias || []),
        ...(origem.categorias || []),
    ]);
    const { pessoasEnvolvidas, relacoes } = normalizarEnvolvidosDoPeriodo({
        pessoasEnvolvidas: [
            ...(destino.pessoasEnvolvidas || []),
            ...(origem.pessoasEnvolvidas || []),
        ],
        relacoes: [...(destino.relacoes || []), ...(origem.relacoes || [])],
    });
    destino.pessoasEnvolvidas = pessoasEnvolvidas;
    destino.relacoes = relacoes;
}

// ─── Privacidade: períodos ocultos ───────────────────────────────────────
// `oculto` (boolean) no próprio Período Biográfico: esconde o NOME dele (e o
// que o identifica: Esfera, Categoria, pessoas) das listas, seletores, busca
// e exportações, sem excluir nem desvincular nada. Útil quando o período é
// justamente sobre uma relação passada. O texto continua ligado ao período; na
// coluna Época Retratada ele aparece como ROTULO_PERIODO_OCULTO (utils.js).
// `incluirOcultas` segue a mesma regra das pessoas: só telas onde a pessoa
// pediu, na hora, para ver as ocultas ("Mostrar ocultas"), nunca guardado.

export function periodoVisivel(epoca, { incluirOcultas = false } = {}) {
    return !!epoca && (incluirOcultas || !epoca.oculto);
}

export function periodosVisiveis(epocas, opcoes = {}) {
    return (epocas || []).filter((e) => periodoVisivel(e, opcoes));
}

// Períodos que citam a pessoa (como envolvida ou numa ponta de relação).
export function periodosLigadosAPessoa(dbRef, pessoaId) {
    return (dbRef.epocas || []).filter(
        (e) =>
            (e.pessoasEnvolvidas || []).some((x) => x.pessoaId == pessoaId) ||
            (e.relacoes || []).some((r) => r.de == pessoaId || r.para == pessoaId),
    );
}

// Define `oculto` nos períodos indicados e devolve os ids que de fato mudaram
// (para o "Desfazer" reverter só esses).
export function definirOcultoNosPeriodos(dbRef, ids, valor) {
    const alterados = [];
    const alvo = new Set((ids || []).map(String));
    (dbRef.epocas || []).forEach((e) => {
        if (alvo.has(String(e.id)) && !!e.oculto !== !!valor) {
            e.oculto = !!valor;
            alterados.push(e.id);
        }
    });
    return alterados;
}

// ─── Privacidade: pessoas ocultas ────────────────────────────────────────

// Pessoas do período que podem aparecer na tela (cadastro existente e não
// oculta). O período em si continua aparecendo; só o nome some.
// `incluirOcultas` é só para telas onde a pessoa pediu, na hora, para ver as
// ocultas (botão "Mostrar ocultas" do modal e da Visualização). Nunca é
// guardado: o padrão de todo o app continua sendo esconder.
export function pessoasVisiveisDoPeriodo(epoca, dbRef, { incluirOcultas = false } = {}) {
    return (epoca?.pessoasEnvolvidas || [])
        .map((entrada) => (dbRef.pessoas || []).find((p) => p.id == entrada.pessoaId))
        .filter((pessoa) => pessoa && (incluirOcultas || !pessoa.oculto));
}

function resolverPonta(ponta, epoca, dbRef, incluirOcultas = false) {
    if (ponta === AUTOR) {
        const autor = (dbRef.autores || []).find((a) => a.id == epoca?.autorId);
        return { id: AUTOR, nome: autor?.nome || 'Autor', genero: autor?.genero || '' };
    }
    const pessoa = (dbRef.pessoas || []).find((p) => p.id == ponta);
    if (!pessoa || (pessoa.oculto && !incluirOcultas)) return null;
    // Só chega aqui com oculta quando a pessoa pediu para vê-las: a marca evita
    // confundir com as demais.
    const nome = pessoa.oculto ? `${pessoa.nome} (oculta)` : pessoa.nome;
    return { id: pessoa.id, nome, genero: pessoa.genero || '' };
}

// Relações que podem aparecer na tela: as duas pontas existem e nenhuma é
// pessoa oculta. Uma relação com pessoa oculta some inteira (mostrar só o
// outro lado já revelaria quem se relaciona com ela).
export function relacoesVisiveisDoPeriodo(epoca, dbRef, { incluirOcultas = false } = {}) {
    return (epoca?.relacoes || [])
        .map((relacao) => {
            const de = resolverPonta(relacao.de, epoca, dbRef, incluirOcultas);
            const para = resolverPonta(relacao.para, epoca, dbRef, incluirOcultas);
            if (!de || !para) return null;
            return { relacao, de, para, frase: fraseDaRelacao(relacao, de, para, dbRef) };
        })
        .filter(Boolean);
}

// Linhas do cartão: uma frase por relação visível, e o nome das pessoas
// visíveis que não aparecem em nenhuma relação visível.
export function linhasDoPeriodoBiografico(epoca, dbRef, opcoes = {}) {
    const relacoes = relacoesVisiveisDoPeriodo(epoca, dbRef, opcoes);
    const emRelacao = new Set();
    relacoes.forEach(({ de, para }) => {
        emRelacao.add(de.id);
        emRelacao.add(para.id);
    });
    const soltas = pessoasVisiveisDoPeriodo(epoca, dbRef, opcoes)
        .filter((p) => !emRelacao.has(p.id))
        .map((p) => (p.oculto ? `${p.nome} (oculta)` : p.nome));
    return [...relacoes.map((r) => r.frase), ...soltas];
}

// ─── Filtros da aba ──────────────────────────────────────────────────────

export const FILTRO_PERIODO_BIOGRAFICO_VAZIO = {
    esfera: '',
    categoria: '',
    pessoa: '',
    natureza: '',
    vinculo: '',
};

export function filtroPeriodoBiograficoAtivo(f) {
    return !!(f && (f.esfera || f.categoria || f.pessoa || f.natureza || f.vinculo));
}

// Todos os filtros preenchidos valem ao mesmo tempo (E). Pessoa oculta não
// filtra nem acha: o período é tratado como se ela não estivesse nele.
// Natureza e Vínculo só olham relações visíveis. Vínculo vale para os dois
// lados do tipo. Com mais de um deles ativo (Natureza, Vínculo e Pessoa), tem
// de ser a MESMA relação que atende a todos (a pessoa, em qualquer ponta).
// `opcoes.incluirOcultas` (só a tela, na hora, nunca guardado) faz as pessoas
// ocultas e as relações com elas contarem como as demais.
export function periodoBateFiltroBiografico(epoca, f, dbRef, opcoes = {}) {
    if (!filtroPeriodoBiograficoAtivo(f)) return true;
    if (f.esfera && !(epoca.esferas || []).some((v) => chaveValor(v) === chaveValor(f.esfera)))
        return false;
    if (
        f.categoria &&
        !(epoca.categorias || []).some((v) => chaveValor(v) === chaveValor(f.categoria))
    )
        return false;
    if (f.pessoa && !pessoasVisiveisDoPeriodo(epoca, dbRef, opcoes).some((p) => p.id == f.pessoa))
        return false;
    if (f.natureza || f.vinculo) {
        const natureza = chaveValor(f.natureza);
        const tipo = f.vinculo ? chaveTipoVinculo(dbRef, f.vinculo) : '';
        const bate = relacoesVisiveisDoPeriodo(epoca, dbRef, opcoes).some(
            ({ relacao, de, para }) =>
                (!f.natureza || chaveValor(relacao.natureza) === natureza) &&
                (!f.vinculo ||
                    (relacao.vinculo && chaveTipoVinculo(dbRef, relacao.vinculo) === tipo)) &&
                (!f.pessoa || de.id == f.pessoa || para.id == f.pessoa),
        );
        if (!bate) return false;
    }
    return true;
}

export function filtrarPeriodosBiograficos(epocas, f, dbRef, opcoes = {}) {
    return (epocas || []).filter((e) => periodoBateFiltroBiografico(e, f, dbRef, opcoes));
}

// Opções dos selects de filtro: só o que algum período usa (pessoa oculta e
// relação com pessoa oculta não entram). Vínculo: { valor, rotulo }, com os
// dois lados do tipo no rótulo ("Responsável por / Filho ou filha de").
export function opcoesDeFiltroBiografico(dbRef, opcoes = {}) {
    // Período oculto não alimenta os selects (o nome de uma Esfera, Categoria,
    // Pessoa ou Vínculo usada só nele entregaria o período).
    const epocas = periodosVisiveis(dbRef.epocas, opcoes);
    const pessoaIds = new Set();
    const tipos = new Map();
    const naturezasEmUso = [];
    epocas.forEach((e) => {
        pessoasVisiveisDoPeriodo(e, dbRef, opcoes).forEach((p) => pessoaIds.add(p.id));
        relacoesVisiveisDoPeriodo(e, dbRef, opcoes).forEach(({ relacao }) => {
            if (relacao.natureza) naturezasEmUso.push(relacao.natureza);
            if (!relacao.vinculo) return;
            const chave = chaveTipoVinculo(dbRef, relacao.vinculo);
            if (tipos.has(chave)) return;
            const achado = acharRotuloVinculo(dbRef, relacao.vinculo);
            const valor = achado ? achado.rotulo.nome : relacao.vinculo;
            const rotulo =
                achado && achado.rotulo.inverso ? `${valor} / ${achado.rotulo.inverso}` : valor;
            tipos.set(chave, { valor, rotulo });
        });
    });
    const pessoas = (dbRef.pessoas || [])
        .filter((p) => pessoaIds.has(p.id))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const emUso = (tipo) =>
        normalizarLista(valoresEmUso(dbRef, tipo, opcoes)).sort((a, b) =>
            a.localeCompare(b, 'pt-BR'),
        );
    return {
        esferas: emUso('esferas'),
        categorias: emUso('categorias'),
        naturezas: normalizarLista(naturezasEmUso).sort((a, b) => a.localeCompare(b, 'pt-BR')),
        vinculos: [...tipos.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')),
        pessoas,
    };
}

// ─── Busca (texto cujo período biográfico tem...) ────────────────────────

// Esfera ou Categoria de um texto = soma das dos períodos biográficos dele, sem
// repetir (o texto guarda só o `epocaId`; a coluna lê o cadastro, como a
// Esfera histórica). Quem chama passa só os períodos que valem na tela (o
// oculto não entra, igual à busca).
export function classificacaoDosPeriodosBiograficos(epocasDoTexto, tipo) {
    if (tipo !== 'esferas' && tipo !== 'categorias') return [];
    return normalizarLista((epocasDoTexto || []).flatMap((e) => e?.[tipo] || []));
}

export function textoBuscaEsferas(epoca) {
    return (epoca?.esferas || []).join(', ');
}
export function textoBuscaCategorias(epoca) {
    return (epoca?.categorias || []).join(', ');
}
// Naturezas das relações visíveis.
export function textoBuscaNaturezas(epoca, dbRef, opcoes = {}) {
    return normalizarLista(
        relacoesVisiveisDoPeriodo(epoca, dbRef, opcoes).map(({ relacao }) => relacao.natureza),
    ).join(', ');
}
// Nomes dos dois lados dos vínculos das relações visíveis (relação só com
// Natureza não tem vínculo).
export function textoBuscaVinculos(epoca, dbRef, opcoes = {}) {
    const nomes = [];
    relacoesVisiveisDoPeriodo(epoca, dbRef, opcoes).forEach(({ relacao }) => {
        if (!relacao.vinculo) return;
        nomes.push(relacao.vinculo);
        const achado = acharRotuloVinculo(dbRef, relacao.vinculo);
        if (achado) nomes.push(achado.rotulo.nome, achado.rotulo.inverso);
    });
    return normalizarLista(nomes).join(', ');
}
export function textoBuscaPessoasDoPeriodo(epoca, dbRef, opcoes = {}) {
    return pessoasVisiveisDoPeriodo(epoca, dbRef, opcoes)
        .map((p) => p.nome)
        .join(', ');
}
