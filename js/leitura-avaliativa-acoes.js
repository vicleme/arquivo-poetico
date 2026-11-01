// Leitura avaliativa (Fase 22, entrega 2a): as ações da aba, sem DOM e sem
// `save()`. Recebem o `db` por parâmetro e devolvem o resultado; quem chama
// (a tela, na entrega 2b) decide quando salvar e redesenhar.
//
// O que uma leitura grava, e onde:
//   - a própria leitura, em `db.leituras` (sempre, com o sugerido guardado
//     ao lado do escolhido);
//   - a linha livre, no campo `autoavaliacao` do texto (o mesmo do modal,
//     sem cópia), só quando a tela manda um texto;
//   - os corações escolhidos, no campo `autoclassificacao` do texto, só
//     quando a pessoa escolheu. Terminar sem escolher nunca grava 0 por cima
//     de um valor existente, e trocar um valor existente pede confirmação.

import {
    ITENS_INCOMODOU,
    ITENS_PEGOU,
    RESPOSTAS,
    criarLeitura,
    limparLeitura,
    validarLeitura,
    sugerirCoracoes,
    coracoesValidos,
    ultimaLeitura,
    valorDoPeso,
} from './leitura-avaliativa.js';

const semAcento = (s) =>
    String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const lista = (v) => (Array.isArray(v) ? v : []);

function colecaoDoTipo(dbRef, tipo) {
    return tipo === 'prosa' ? lista(dbRef.prosas) : lista(dbRef.poemas);
}

export function acharTextoDaLeitura(dbRef, tipo, textoId) {
    return colecaoDoTipo(dbRef, tipo).find((t) => String(t.id) === String(textoId)) || null;
}

function leiturasDoTexto(dbRef, tipo, textoId) {
    return lista(dbRef.leituras).filter(
        (l) => l.tipo === tipo && String(l.textoId) === String(textoId),
    );
}

// ─── Lista de textos (o lado esquerdo da aba) ───────────────────

// O que a leitura marcou, só com itens que existem nas listas de fábrica. Em "Onde
// pegou", do peso maior para o menor e, no empate, na ordem da lista de fábrica;
// em "O que incomodou", na ordem da lista de fábrica.
function marcasDoPegou(leitura) {
    const ordem = (id) => ITENS_PEGOU.findIndex((i) => i.id === id);
    return lista(leitura?.pegou)
        .filter((m) => ordem(m?.item) >= 0)
        .map((m) => ({ item: m.item, peso: m.peso }))
        .sort((a, b) => valorDoPeso(b.peso) - valorDoPeso(a.peso) || ordem(a.item) - ordem(b.item));
}

function marcasDoIncomodou(leitura) {
    const ordem = (id) => ITENS_INCOMODOU.findIndex((i) => i.id === id);
    return lista(leitura?.incomodou)
        .filter((id) => ordem(id) >= 0)
        .sort((a, b) => ordem(a) - ordem(b));
}

// Uma linha por poema e por prosa, em ordem alfabética do título. `busca` é
// um trecho do título, sem caixa e sem acento. `filtro`: 'todos' (padrão),
// 'avaliados' (com pelo menos uma leitura nesta aba) ou 'nao-avaliados'.
export const FILTROS_LEITURA = Object.freeze([
    { id: 'todos', rotulo: 'Todos' },
    { id: 'avaliados', rotulo: 'Avaliados' },
    { id: 'nao-avaliados', rotulo: 'Não avaliados' },
]);

export const FILTROS_CLASSIFICACAO = Object.freeze([
    { id: 'todos', rotulo: 'Todos' },
    { id: 'classificados', rotulo: 'Com classificação' },
    { id: 'sem-classificacao', rotulo: 'Sem classificação' },
]);

// `tipoTexto`: 'todos' (padrão), 'poema' ou 'prosa'; também se combina com os outros.
export const FILTROS_TIPO = Object.freeze([
    { id: 'todos', rotulo: 'Todos' },
    { id: 'poema', rotulo: 'Poemas' },
    { id: 'prosa', rotulo: 'Prosas' },
]);

// `classificacao`: 'todos' (padrão), 'classificados' (corações no texto, de 0,5 a
// 5) ou 'sem-classificacao'. Independe de `filtro`: os dois se combinam.
//
// `pegou`: 'todos' (padrão) ou o id de um item de "De que maneira te pegou". Fica só o texto
// cuja leitura MAIS RECENTE marcou o item (a opinião atual, como no padrão das
// leituras), e a lista passa a vir do peso maior para o menor (central, marcante,
// pontual), depois por corações e por título. Id desconhecido vale como 'todos'.
// 'algum' fica com o texto que marcou ao menos um item (qualquer um), ordenado pelo
// maior peso entre os marcados; cada linha traz `pegouMarcas` com o que foi marcado.
//
// `incomodou`: 'todos' (padrão) ou o id de um item de "O que incomodou". Mesma regra
// de `pegou` (só a leitura mais recente de cada texto vale), mas esse bloco não tem
// peso: a lista vem por corações (do maior para o menor) e por título. Os dois filtros
// se combinam (o texto precisa ter marcado os dois itens). 'algum' fica com o texto que
// marcou ao menos um item (qualquer um), e cada linha traz `incomodouMarcas`.
export const FILTRO_ALGUM = 'algum';

// `releria` e `mostraria` (F22-D29): 'todos' (padrão), 'sim', 'talvez', 'nao' ou
// 'sem-resposta'. Valem só pela leitura MAIS RECENTE de cada texto, como `pegou` e
// `incomodou`. Texto nunca lido não entra em nenhuma opção (nem em 'sem-resposta'),
// porque não tem leitura para ter deixado a pergunta em branco. Com um deles ligado, a
// lista vem por corações (do maior para o menor) e por título, e cada linha traz
// `releriaResposta` e `mostrariaResposta`. Valor desconhecido vale como 'todos'.
export const FILTRO_SEM_RESPOSTA = 'sem-resposta';

export const FILTROS_RESPOSTA = Object.freeze([
    { id: 'todos', rotulo: 'Todos' },
    ...RESPOSTAS,
    { id: FILTRO_SEM_RESPOSTA, rotulo: 'Sem resposta' },
]);

const IDS_FILTRO_RESPOSTA = new Set(FILTROS_RESPOSTA.map((f) => f.id));

export function rotuloDaResposta(id) {
    return RESPOSTAS.find((r) => r.id === id)?.rotulo || '';
}

// A resposta da leitura mais recente passa no filtro? `ultima` é null se o texto nunca foi lido.
function respostaPassa(filtro, ultima, campo) {
    if (filtro === 'todos') return true;
    if (!ultima) return false;
    const resposta = RESPOSTAS.some((r) => r.id === ultima[campo]) ? ultima[campo] : null;
    return filtro === FILTRO_SEM_RESPOSTA ? resposta === null : resposta === filtro;
}

export function listarTextosParaLeitura(
    dbRef,
    busca = '',
    filtro = 'todos',
    classificacao = 'todos',
    tipoTexto = 'todos',
    pegou = 'todos',
    incomodou = 'todos',
    releria = 'todos',
    mostraria = 'todos',
) {
    const filtroReleria = IDS_FILTRO_RESPOSTA.has(releria) ? releria : 'todos';
    const filtroMostraria = IDS_FILTRO_RESPOSTA.has(mostraria) ? mostraria : 'todos';
    const termo = semAcento(busca).trim();
    const itemPegou =
        pegou === FILTRO_ALGUM || ITENS_PEGOU.some((i) => i.id === pegou) ? pegou : null;
    const itemIncomodou =
        incomodou === FILTRO_ALGUM || ITENS_INCOMODOU.some((i) => i.id === incomodou)
            ? incomodou
            : null;
    const linhas = [];
    for (const tipo of ['poema', 'prosa']) {
        if (tipoTexto !== 'todos' && tipoTexto !== tipo) continue;
        for (const t of colecaoDoTipo(dbRef, tipo)) {
            const titulo = String(t.titulo || '').trim() || `#${t.id}`;
            if (termo && !semAcento(titulo).includes(termo)) continue;
            const leituras = leiturasDoTexto(dbRef, tipo, t.id);
            if (filtro === 'avaliados' && !leituras.length) continue;
            if (filtro === 'nao-avaliados' && leituras.length) continue;
            const classificado = coracoesValidos(t.autoclassificacao);
            if (classificacao === 'classificados' && !classificado) continue;
            if (classificacao === 'sem-classificacao' && classificado) continue;
            const ultima = ultimaLeitura(leituras);
            let pesoPegou = 0;
            let pesoPegouId = '';
            const pegouMarcas = marcasDoPegou(ultima);
            const incomodouMarcas = marcasDoIncomodou(ultima);
            if (itemPegou === FILTRO_ALGUM) {
                if (!pegouMarcas.length) continue;
                pesoPegou = valorDoPeso(pegouMarcas[0].peso);
                pesoPegouId = pegouMarcas[0].peso;
            } else if (itemPegou) {
                const marca = pegouMarcas.find((m) => m.item === itemPegou);
                if (!marca) continue;
                pesoPegou = valorDoPeso(marca.peso);
                pesoPegouId = marca.peso;
            }
            if (itemIncomodou === FILTRO_ALGUM) {
                if (!incomodouMarcas.length) continue;
            } else if (itemIncomodou && !incomodouMarcas.includes(itemIncomodou)) continue;
            if (!respostaPassa(filtroReleria, ultima, 'releria')) continue;
            if (!respostaPassa(filtroMostraria, ultima, 'mostraria')) continue;
            linhas.push({
                tipo,
                id: t.id,
                titulo,
                leituras: leituras.length,
                ultimaData: ultima?.data || '',
                classificacao: coracoesValidos(t.autoclassificacao)
                    ? Number(t.autoclassificacao)
                    : 0,
                pesoPegou,
                pesoPegouId,
                pegouMarcas,
                incomodouMarcas,
                releriaResposta: RESPOSTAS.some((r) => r.id === ultima?.releria)
                    ? ultima.releria
                    : null,
                mostrariaResposta: RESPOSTAS.some((r) => r.id === ultima?.mostraria)
                    ? ultima.mostraria
                    : null,
            });
        }
    }
    const porTitulo = (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR');
    const filtrandoResposta = filtroReleria !== 'todos' || filtroMostraria !== 'todos';
    if (!itemPegou && !itemIncomodou && !filtrandoResposta) return linhas.sort(porTitulo);
    return linhas.sort(
        (a, b) => b.pesoPegou - a.pesoPegou || b.classificacao - a.classificacao || porTitulo(a, b),
    );
}

// A última leitura do texto, copiada, para a tela mostrar de início. null se
// o texto nunca foi lido por esta aba.
export function ultimaLeituraDoTexto(dbRef, tipo, textoId) {
    const u = ultimaLeitura(leiturasDoTexto(dbRef, tipo, textoId));
    return u ? limparLeitura(u) : null;
}

// ─── Rascunho (o formulário antes de terminar) ──────────────────
// Funções que devolvem um rascunho novo, sem mexer no recebido.

export function novoRascunho(tipo, textoId) {
    return criarLeitura({ tipo, textoId });
}

// Clicar de novo no mesmo peso desmarca o item; outro peso troca.
export function marcarPegou(rascunho, item, peso) {
    const atual = rascunho.pegou.find((m) => m.item === item);
    const outros = rascunho.pegou.filter((m) => m.item !== item);
    const pegou = atual && atual.peso === peso ? outros : [...outros, { item, peso }];
    return limparLeitura({ ...rascunho, pegou });
}

export function alternarIncomodou(rascunho, id) {
    const tem = rascunho.incomodou.includes(id);
    const incomodou = tem
        ? rascunho.incomodou.filter((i) => i !== id)
        : [...rascunho.incomodou, id];
    return limparLeitura({ ...rascunho, incomodou });
}

// campo: 'releria' ou 'mostraria'. Clicar de novo na mesma resposta limpa.
export function responder(rascunho, campo, resposta) {
    if (campo !== 'releria' && campo !== 'mostraria') return rascunho;
    const novo = rascunho[campo] === resposta ? null : resposta;
    return limparLeitura({ ...rascunho, [campo]: novo });
}

// O que a tela mostra no fim: a sugestão para o rascunho como está.
export function sugestaoDoRascunho(rascunho) {
    return sugerirCoracoes(rascunho);
}

// ─── Terminar a leitura ─────────────────────────────────────────

// opcoes:
//   escolhido  corações escolhidos (0,5 a 5) ou null/undefined para não gravar;
//   avaliacao  texto da linha livre; undefined deixa o campo do texto como está;
//   substituir true quando a pessoa já confirmou trocar a Classificação atual;
//   id, hoje   o id novo e a data (AAAA-MM-DD), dados pela tela.
//
// Devolve { ok: true, leitura, gravouClassificacao, gravouAvaliacao } ou
// { ok: false, motivo, ... }. Motivos: 'invalida' (com `erros`), 'sem-texto',
// 'confirmar-troca' (com `atual` e `novo`, para a tela perguntar e chamar de
// novo com `substituir: true`). Quando devolve ok: false, nada foi gravado.
export function concluirLeitura(dbRef, rascunho, opcoes = {}) {
    const { escolhido = null, avaliacao, substituir = false, id, hoje } = opcoes;
    const texto = acharTextoDaLeitura(dbRef, rascunho?.tipo, rascunho?.textoId);
    if (!texto) return { ok: false, motivo: 'sem-texto' };

    const sugerido = sugerirCoracoes(rascunho).coracoes;
    const escolha = coracoesValidos(escolhido) ? Number(escolhido) : null;
    const leitura = limparLeitura({
        ...rascunho,
        id,
        data: hoje,
        sugerido,
        escolhido: escolha,
    });
    const validacao = validarLeitura(leitura);
    if (!validacao.ok || leitura.id === null) {
        const erros = validacao.ok ? ['Falta o id da leitura.'] : validacao.erros;
        return { ok: false, motivo: 'invalida', erros };
    }

    const atual = coracoesValidos(texto.autoclassificacao) ? Number(texto.autoclassificacao) : 0;
    if (escolha !== null && atual > 0 && atual !== escolha && !substituir) {
        return { ok: false, motivo: 'confirmar-troca', atual, novo: escolha };
    }

    if (!Array.isArray(dbRef.leituras)) dbRef.leituras = [];
    dbRef.leituras.push(leitura);

    let gravouClassificacao = false;
    if (escolha !== null && escolha !== atual) {
        texto.autoclassificacao = escolha;
        gravouClassificacao = true;
    }
    let gravouAvaliacao = false;
    if (typeof avaliacao === 'string' && avaliacao !== (texto.autoavaliacao || '')) {
        texto.autoavaliacao = avaliacao;
        gravouAvaliacao = true;
    }
    return { ok: true, leitura, gravouClassificacao, gravouAvaliacao };
}
