// Leitura avaliativa (Fase 22): lógica pura, sem DOM e sem db.
//
// Uma leitura registra o que pegou o autor num texto (com peso), o que o
// incomodou, se releria e se mostraria a alguém, e guarda, lado a lado, os
// corações sugeridos pela tela e os escolhidos pela pessoa. A linha livre da
// leitura NÃO mora aqui: é o campo `autoavaliacao` do texto (mostrado como
// "Avaliação"), lido e gravado no mesmo lugar, sem cópia.
//
// Forma de uma leitura (tabela `db.leituras`, uma linha por leitura):
//   { id, textoId, tipo: 'poema' | 'prosa', data: 'AAAA-MM-DD',
//     pegou: [{ item, peso }], incomodou: [id], releria, mostraria,
//     sugerido, escolhido }
// `releria` e `mostraria` são 'sim' | 'talvez' | 'nao' ou null (sem resposta).
// `sugerido` e `escolhido` são corações (0,5 a 5, passo 0,5) ou null. Nunca 0:
// 0 é "não avaliado" no campo `autoclassificacao` do texto, e terminar uma
// leitura sem escolher corações não grava nada por cima (ver F22-D6 e a
// escolha (d) do plano).

// ─── Listas de fábrica (ids estáveis: minúsculas, sem acento) ───

export const ITENS_PEGOU = Object.freeze([
    { id: 'som', rotulo: 'Som e ritmo', descricao: 'A cadência, a música, a rima que embala.' },
    { id: 'palavra', rotulo: 'Palavra', descricao: 'A escolha do vocabulário, a precisão.' },
    { id: 'imagem', rotulo: 'Imagem', descricao: 'A cena que fica na cabeça depois.' },
    { id: 'ideia', rotulo: 'Ideia', descricao: 'O raciocínio, o que o texto pensa.' },
    { id: 'voz', rotulo: 'Voz', descricao: 'O jeito de quem fala, a personalidade, a intimidade.' },
    {
        id: 'atmosfera',
        rotulo: 'Atmosfera',
        descricao: 'O clima que o texto cria (melancolia, calma, tensão).',
    },
    {
        id: 'surpresa',
        rotulo: 'Surpresa',
        descricao: 'A virada, o final, a quebra de expectativa.',
    },
    {
        id: 'graca',
        rotulo: 'Graça',
        descricao: 'Diverte ou encanta pela leveza: o humor, o gracioso, o toque delicado.',
    },
    { id: 'identificacao', rotulo: 'Identificação', descricao: 'Me vi ali.' },
    {
        id: 'comocao',
        rotulo: 'Comoção',
        descricao: 'Me mexeu, mesmo sem eu me ver ali.',
    },
    {
        id: 'construcao',
        rotulo: 'Construção',
        descricao: 'O texto bem armado, a economia, a força da composição.',
    },
    {
        id: 'engenho',
        rotulo: 'Engenho',
        descricao:
            'A formulação certeira, a compressão, o jogo bem sacado, a ligação inesperada feita na hora de dizer.',
    },
    {
        id: 'originalidade',
        rotulo: 'Originalidade',
        descricao: 'Um jeito de ver, formar ou dizer que eu não tinha visto antes.',
    },
]);

export const ITENS_INCOMODOU = Object.freeze([
    { id: 'cliche', rotulo: 'Clichê', descricao: 'Imagem ou expressão gasta.' },
    { id: 'previsivel', rotulo: 'Previsível', descricao: 'O final se vê de longe.' },
    {
        id: 'explica_demais',
        rotulo: 'Explica demais',
        descricao: 'Diz o que a imagem já disse.',
    },
    {
        id: 'obscuro_demais',
        rotulo: 'Obscuro demais',
        descricao: 'Fechado, sem porta de entrada.',
    },
    { id: 'forcado', rotulo: 'Forçado', descricao: 'Rima, emoção ou efeito empurrados.' },
    {
        id: 'impreciso',
        rotulo: 'Impreciso',
        descricao: 'Palavra vaga ou frouxa, o oposto de Palavra.',
    },
    { id: 'frouxo', rotulo: 'Frouxo', descricao: 'Composição sem tensão, com sobra.' },
    { id: 'cansativo', rotulo: 'Cansativo', descricao: 'Esgota ler.' },
    { id: 'superficial', rotulo: 'Superficial', descricao: 'Fica na superfície.' },
    {
        id: 'idealizado',
        rotulo: 'Idealizado',
        descricao: 'Embeleza ou romantiza, segue a visão esperada em vez da crítica.',
    },
    {
        id: 'problematico',
        rotulo: 'Problemático',
        descricao: 'Ofende, reproduz violência ou usa enquadramento e termos que não se sustentam.',
    },
    {
        id: 'pouco_trabalhado',
        rotulo: 'Pouco trabalhado',
        descricao: 'A ideia pedia mais desenvolvimento.',
    },
]);

// Três níveis grossos de propósito, para o formulário ser rápido. Respondem à
// pergunta "de que maneira te pegou?", então descrevem a experiência de leitura
// (me pegou de forma pontual, marcante, central), não o papel do item no texto
// (F22-D23). Os ids gravados continuam 'leve', 'forte' e 'centro'; só o rótulo
// mudou. `valor` é o peso numérico usado nas Estatísticas (entrega 4), não na
// sugestão de corações.
export const PESOS = Object.freeze([
    {
        id: 'leve',
        rotulo: 'Pontual',
        valor: 1,
        descricao: 'Pegou num momento ou num detalhe, sem tomar o texto inteiro.',
    },
    { id: 'forte', rotulo: 'Marcante', valor: 2, descricao: 'Ficou comigo depois de ler.' },
    {
        id: 'centro',
        rotulo: 'Central',
        valor: 3,
        descricao: 'Foi o que mais me pegou neste texto.',
    },
]);

export const RESPOSTAS = Object.freeze([
    { id: 'sim', rotulo: 'Sim' },
    { id: 'talvez', rotulo: 'Talvez' },
    { id: 'nao', rotulo: 'Não' },
]);

const IDS_PEGOU = new Set(ITENS_PEGOU.map((i) => i.id));
const IDS_INCOMODOU = new Set(ITENS_INCOMODOU.map((i) => i.id));
const IDS_PESOS = new Set(PESOS.map((p) => p.id));
const IDS_RESPOSTAS = new Set(RESPOSTAS.map((r) => r.id));
const TIPOS_TEXTO = new Set(['poema', 'prosa']);

export function rotuloItemPegou(id) {
    return ITENS_PEGOU.find((i) => i.id === id)?.rotulo || '';
}

export function rotuloItemIncomodou(id) {
    return ITENS_INCOMODOU.find((i) => i.id === id)?.rotulo || '';
}

// Rótulo do peso na tela ("Pontual", "Marcante", "Central"); '' se o id não existe.
export function rotuloDoPeso(id) {
    return PESOS.find((p) => p.id === id)?.rotulo || '';
}

export function valorDoPeso(id) {
    return PESOS.find((p) => p.id === id)?.valor || 0;
}

// ─── Corações ───────────────────────────────────────────────────

// 0,5 a 5, passo 0,5. O 0 ("não avaliado") não é uma escolha desta tela.
export function coracoesValidos(valor) {
    if (valor === null || valor === undefined || valor === '') return false;
    const n = Number(valor);
    return Number.isFinite(n) && n >= 0.5 && n <= 5 && Number.isInteger(n * 2);
}

function formatarNumero(n) {
    return String(n).replace('.', ',');
}

// ─── Regra da sugestão de corações (F22-D9) ─────────────────────
//
// Simples e visível: a soma de três partes, de 0 a 5, e o resultado vai
// direto para os corações (no mínimo 0,5, porque 0 é "não avaliado").
//
//   Releria?             sim 2   talvez 1    não 0
//   Mostraria a alguém?  sim 1   talvez 0,5  não 0
//   Maior peso em        central 2  marcante 1  pontual 0,5  nada marcado 0
//   "De que maneira te pegou"
//
// "O que incomodou" não entra na conta, de propósito: a sugestão só olha o
// que a pessoa já respondeu sobre querer voltar ao texto, querer mostrá-lo e
// o quanto ele a pegou. O que incomodou fica para as Estatísticas, que cruzam
// com os corações escolhidos e mostram as divergências.

export const PONTOS_RELERIA = Object.freeze({ sim: 2, talvez: 1, nao: 0 });
export const PONTOS_MOSTRARIA = Object.freeze({ sim: 1, talvez: 0.5, nao: 0 });
export const PONTOS_MAIOR_PESO = Object.freeze({ centro: 2, forte: 1, leve: 0.5 });

const NOME_RESPOSTA = { sim: 'sim', talvez: 'talvez', nao: 'não' };

// O maior peso entre os itens marcados em "De que maneira te pegou": 'centro' (Central),
// 'forte' (Marcante), 'leve' (Pontual) ou null se nada foi marcado.
export function maiorPeso(pegou) {
    let melhor = null;
    for (const marca of Array.isArray(pegou) ? pegou : []) {
        if (!IDS_PESOS.has(marca?.peso)) continue;
        if (!melhor || valorDoPeso(marca.peso) > valorDoPeso(melhor)) melhor = marca.peso;
    }
    return melhor;
}

// { coracoes, motivo, partes } ou { coracoes: null, motivo } quando falta
// responder Releria ou Mostraria. `partes` leva os pontos de cada parte, para
// a tela poder mostrar a conta.
export function sugerirCoracoes(leitura) {
    const releria = leitura?.releria;
    const mostraria = leitura?.mostraria;
    if (!IDS_RESPOSTAS.has(releria) || !IDS_RESPOSTAS.has(mostraria)) {
        return {
            coracoes: null,
            motivo: 'Responda "Releria?" e "Mostraria a alguém?" para ver a sugestão.',
        };
    }
    const peso = maiorPeso(leitura?.pegou);
    const partes = {
        releria: PONTOS_RELERIA[releria],
        mostraria: PONTOS_MOSTRARIA[mostraria],
        maiorPeso: peso ? PONTOS_MAIOR_PESO[peso] : 0,
    };
    const total = partes.releria + partes.mostraria + partes.maiorPeso;
    const coracoes = Math.max(0.5, total);
    const trechoPeso = peso
        ? `maior peso em "De que maneira te pegou": ${PESOS.find((p) => p.id === peso).rotulo.toLowerCase()} (+${formatarNumero(partes.maiorPeso)})`
        : 'nada marcado em "De que maneira te pegou" (+0)';
    const motivo =
        `Releria: ${NOME_RESPOSTA[releria]} (+${formatarNumero(partes.releria)}); ` +
        `mostraria: ${NOME_RESPOSTA[mostraria]} (+${formatarNumero(partes.mostraria)}); ` +
        `${trechoPeso}; total ${formatarNumero(total)}` +
        (total < 0.5 ? ', e o mínimo é 0,5.' : '.');
    return { coracoes, motivo, partes };
}

// Divergência: a pessoa escolheu um valor diferente do sugerido. Só existe
// quando os dois estão preenchidos.
export function temDivergencia(leitura) {
    if (!coracoesValidos(leitura?.sugerido) || !coracoesValidos(leitura?.escolhido)) return false;
    return Number(leitura.sugerido) !== Number(leitura.escolhido);
}

// ─── Criar, limpar e validar ────────────────────────────────────

export function criarLeitura({ id = null, textoId = null, tipo = 'poema', data = '' } = {}) {
    return {
        id,
        textoId,
        tipo,
        data,
        pegou: [],
        incomodou: [],
        releria: null,
        mostraria: null,
        sugerido: null,
        escolhido: null,
    };
}

function dataIsoValida(texto) {
    if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const [a, m, d] = texto.split('-').map(Number);
    const dt = new Date(Date.UTC(a, m - 1, d));
    return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Devolve uma cópia limpa: tira itens e pesos desconhecidos, repetições e
// respostas inválidas, sem mexer na leitura recebida. Não inventa nada: o que
// não é reconhecido some, e o que falta fica null ou vazio.
export function limparLeitura(bruta) {
    const l = bruta && typeof bruta === 'object' ? bruta : {};
    const vistos = new Set();
    const pegou = [];
    for (const marca of Array.isArray(l.pegou) ? l.pegou : []) {
        if (!IDS_PEGOU.has(marca?.item) || !IDS_PESOS.has(marca?.peso)) continue;
        if (vistos.has(marca.item)) continue;
        vistos.add(marca.item);
        pegou.push({ item: marca.item, peso: marca.peso });
    }
    const incomodou = [
        ...new Set(
            (Array.isArray(l.incomodou) ? l.incomodou : []).filter((i) => IDS_INCOMODOU.has(i)),
        ),
    ];
    return {
        id: l.id ?? null,
        textoId: l.textoId ?? null,
        tipo: TIPOS_TEXTO.has(l.tipo) ? l.tipo : 'poema',
        data: dataIsoValida(l.data) ? l.data : '',
        pegou,
        incomodou,
        releria: IDS_RESPOSTAS.has(l.releria) ? l.releria : null,
        mostraria: IDS_RESPOSTAS.has(l.mostraria) ? l.mostraria : null,
        sugerido: coracoesValidos(l.sugerido) ? Number(l.sugerido) : null,
        escolhido: coracoesValidos(l.escolhido) ? Number(l.escolhido) : null,
    };
}

// { ok, erros } sobre a leitura como veio (não limpa). Serve para a tela
// bloquear o "terminar" e para a importação recusar dado quebrado.
export function validarLeitura(leitura) {
    const erros = [];
    const l = leitura && typeof leitura === 'object' ? leitura : null;
    if (!l) return { ok: false, erros: ['Leitura ausente.'] };
    if (l.textoId === null || l.textoId === undefined || l.textoId === '') {
        erros.push('Falta o texto da leitura.');
    }
    if (!TIPOS_TEXTO.has(l.tipo)) erros.push('Tipo de texto inválido (poema ou prosa).');
    if (!dataIsoValida(l.data)) erros.push('Data inválida (use AAAA-MM-DD).');

    const vistos = new Set();
    for (const marca of Array.isArray(l.pegou) ? l.pegou : []) {
        if (!IDS_PEGOU.has(marca?.item))
            erros.push(`Item de "De que maneira te pegou" desconhecido: ${marca?.item}.`);
        else if (vistos.has(marca.item))
            erros.push(`Item repetido em "De que maneira te pegou": ${marca.item}.`);
        else vistos.add(marca.item);
        if (!IDS_PESOS.has(marca?.peso))
            erros.push(`Peso inválido em "${marca?.item}": ${marca?.peso}.`);
    }
    const incs = new Set();
    for (const id of Array.isArray(l.incomodou) ? l.incomodou : []) {
        if (!IDS_INCOMODOU.has(id)) erros.push(`Item de "O que incomodou" desconhecido: ${id}.`);
        else if (incs.has(id)) erros.push(`Item repetido em "O que incomodou": ${id}.`);
        else incs.add(id);
    }
    for (const campo of ['releria', 'mostraria']) {
        const v = l[campo];
        if (v !== null && v !== undefined && !IDS_RESPOSTAS.has(v)) {
            erros.push(`Resposta inválida em "${campo}": ${v}.`);
        }
    }
    for (const campo of ['sugerido', 'escolhido']) {
        const v = l[campo];
        if (v !== null && v !== undefined && !coracoesValidos(v)) {
            erros.push(`Corações inválidos em "${campo}": ${v}.`);
        }
    }
    return { ok: erros.length === 0, erros };
}

// ─── Histórico ──────────────────────────────────────────────────

// Mais recente primeiro: pela data e, na mesma data, pelo id (quem veio
// depois fica na frente). Não muda a lista recebida.
export function ordenarLeiturasRecentes(leituras) {
    return [...(Array.isArray(leituras) ? leituras : [])].sort((a, b) => {
        const porData = String(b?.data || '').localeCompare(String(a?.data || ''));
        if (porData !== 0) return porData;
        return Number(b?.id || 0) - Number(a?.id || 0);
    });
}

export function ultimaLeitura(leituras) {
    return ordenarLeiturasRecentes(leituras)[0] || null;
}
