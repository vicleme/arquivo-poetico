// ============================================================
// aparicoes-do-texto.js: onde um Poema ou uma Prosa aparece (Fase 21, 21-1a).
// Só lógica pura, sem DOM e sem importar o `db`: os dados vêm por parâmetro
// (`dbRef`), como em `estrutura-livro.js` e `coletaneas-do-texto.js`.
//
// Hoje o texto tem três mecanismos que não conversam: o Destino (`paiTipo`,
// `paiId`, `sequencia`: um lugar com posição), `livrosIds` (livros sem posição)
// e `itensColetanea` (Coletâneas, guardadas fora do texto). Este módulo lê os
// três e devolve UMA lista de "aparições", sem mudar nenhum dado. É a base da
// 21-1b (formato novo e migração): quando o texto passar a guardar a lista, só
// este arquivo muda, e quem chama continua chamando as mesmas funções.
//
// Uma aparição é:
//   { origem, livroId, parteId, secaoId, sequencia, itemColetaneaId }
//   - `origem`: 'destino' (o Destino do texto), 'vinculo' (livro de `livrosIds`,
//     sem posição) ou 'coletanea' (item de Coletânea).
//   - `parteId` e `secaoId`: o caminho dentro do livro, ou null.
//   - `sequencia`: a posição entre os irmãos do lugar, ou null (sem posição).
//   - `itemColetaneaId`: só em 'coletanea'; null nas outras.
//
// `tipo` é sempre 'poema' ou 'prosa' (o item de Coletânea aponta o texto por
// `refTipo` + `refId`, e o id sozinho não diz qual das duas coleções). Sem
// `tipo`, as Coletâneas ficam de fora.
// ============================================================

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

const lista = (dbRef, nome) => (Array.isArray(dbRef?.[nome]) ? dbRef[nome] : []);

const seqOuNull = (v) => {
    const n = parseInt(v);
    return Number.isNaN(n) ? null : n;
};

// ─── Destino: o caminho Livro, Parte, Seção ────────────────────

// Caminho de um item que tem Destino (Poema, Prosa, Seção ou Elemento):
// `{ livroId, parteId, secaoId }`, ou null quando não há Destino ou ele aponta
// para algo que não existe. Não confere se o Livro existe (isso é da
// `aparicoesDoTexto`): só segue os elos Parte e Seção, que são o que o resolvedor
// copiado em dez lugares sempre fez.
export function caminhoDoDestino(item, dbRef) {
    if (!item || item.paiId == null || !item.paiTipo) return null;
    if (item.paiTipo === 'livro') {
        return { livroId: item.paiId, parteId: null, secaoId: null };
    }
    if (item.paiTipo === 'parte') {
        const parte = lista(dbRef, 'partes').find((p) => mesmoId(p.id, item.paiId));
        return parte ? { livroId: parte.livroId, parteId: parte.id, secaoId: null } : null;
    }
    if (item.paiTipo === 'secao') {
        const secao = lista(dbRef, 'secoes').find((s) => mesmoId(s.id, item.paiId));
        if (!secao) return null;
        if (secao.paiTipo === 'parte') {
            const parte = lista(dbRef, 'partes').find((p) => mesmoId(p.id, secao.paiId));
            return parte ? { livroId: parte.livroId, parteId: parte.id, secaoId: secao.id } : null;
        }
        return { livroId: secao.paiId, parteId: null, secaoId: secao.id };
    }
    return null;
}

// Id do Livro do Destino, ou null. Substitui `livroDoPoema`, `livroDoElemento`
// (render-listas), `livroIdDoItem` (exportar e estatísticas-dados) e cópias
// parecidas. Serve também para Seção e Elemento.
export function livroIdDoDestino(item, dbRef) {
    const caminho = caminhoDoDestino(item, dbRef);
    return caminho && caminho.livroId != null ? caminho.livroId : null;
}

// ─── A lista de aparições ──────────────────────────────────────

// As aparições do texto em Coletâneas (`itensColetanea`, F21-D3: a Coletânea
// continua guardada fora do texto). Sem `tipo`, nenhuma.
function aparicoesDeColetanea(dbRef, tipo, item) {
    const achadas = [];
    if (tipo && item?.id != null) {
        const livros = lista(dbRef, 'livros');
        const partes = lista(dbRef, 'partes');
        lista(dbRef, 'itensColetanea')
            .filter((i) => i.refTipo === tipo && mesmoId(i.refId, item.id))
            .forEach((i) => {
                const parte = partes.find((p) => mesmoId(p.id, i.parteId));
                const col = parte
                    ? livros.find((l) => mesmoId(l.id, parte.livroId) && l.tipo === 'Coletânea')
                    : null;
                if (!col) return;
                achadas.push({
                    origem: 'coletanea',
                    livroId: col.id,
                    parteId: parte.id,
                    secaoId: null,
                    sequencia: seqOuNull(i.sequencia),
                    itemColetaneaId: i.id ?? null,
                });
            });
    }
    return achadas;
}

// Todas as aparições do texto, nesta ordem: o Destino (se houver), os livros de
// `livrosIds` que não são o do Destino (cada um uma vez) e as Coletâneas.
// Aparição cujo Livro não existe mais fica de fora (o texto "não está" ali),
// desde que o acervo tenha a lista de livros.
export function aparicoesDoTexto(dbRef, tipo, item) {
    if (!item) return [];
    const livros = lista(dbRef, 'livros');
    const verifica = Array.isArray(dbRef?.livros);
    const livroExiste = (id) => !verifica || livros.some((l) => mesmoId(l.id, id));
    const achadas = [];

    const caminho = caminhoDoDestino(item, dbRef);
    if (caminho && caminho.livroId != null && livroExiste(caminho.livroId)) {
        achadas.push({
            origem: 'destino',
            livroId: caminho.livroId,
            parteId: caminho.parteId,
            secaoId: caminho.secaoId,
            sequencia: seqOuNull(item.sequencia),
            itemColetaneaId: null,
        });
    }

    const jaTem = (id) => achadas.some((a) => a.origem !== 'coletanea' && mesmoId(a.livroId, id));
    (Array.isArray(item.livrosIds) ? item.livrosIds : []).forEach((id) => {
        if (id == null || jaTem(id) || !livroExiste(id)) return;
        achadas.push({
            origem: 'vinculo',
            livroId: id,
            parteId: null,
            secaoId: null,
            sequencia: null,
            itemColetaneaId: null,
        });
    });

    achadas.push(...aparicoesDeColetanea(dbRef, tipo, item));
    return achadas;
}

// As aparições que valem AGORA (Fase 21, 21-3b): quando o texto já tem a lista
// `aparicoes` (a verdade desde a 21-2), lê dela, com as duas aparições em
// lugares diferentes, as duas no mesmo livro e o "só consta"; sem a lista (dado
// que só tem o formato antigo), cai em `aparicoesDoTexto`. As Coletâneas vêm de
// `itensColetanea` nos dois casos. `origem` da lista é 'lista'. Livro que não
// existe fica de fora, como em `aparicoesDoTexto`.
export function aparicoesVigentes(dbRef, tipo, item) {
    if (!item) return [];
    if (!Array.isArray(item.aparicoes)) return aparicoesDoTexto(dbRef, tipo, item);
    const livros = lista(dbRef, 'livros');
    const verifica = Array.isArray(dbRef?.livros);
    const daLista = item.aparicoes
        .filter((a) => a && a.livroId != null)
        .filter((a) => !verifica || livros.some((l) => mesmoId(l.id, a.livroId)))
        .map((a) => ({
            origem: 'lista',
            livroId: a.livroId,
            parteId: a.parteId ?? null,
            secaoId: a.secaoId ?? null,
            sequencia: seqOuNull(a.sequencia),
            itemColetaneaId: null,
        }));
    return [...daLista, ...aparicoesDeColetanea(dbRef, tipo, item)];
}

// Ids dos livros (e Coletâneas) onde o texto aparece, sem repetir, na ordem das
// aparições.
export function livroIdsDoTexto(dbRef, tipo, item) {
    const ids = [];
    aparicoesVigentes(dbRef, tipo, item).forEach((a) => {
        if (!ids.some((id) => mesmoId(id, a.livroId))) ids.push(a.livroId);
    });
    return ids;
}

// As aparições do texto num livro só (pode haver mais de uma: duas Partes de
// uma Coletânea, por exemplo).
export function aparicoesNoLivro(dbRef, tipo, item, livroId) {
    return aparicoesVigentes(dbRef, tipo, item).filter((a) => mesmoId(a.livroId, livroId));
}

export function textoApareceNoLivro(dbRef, tipo, item, livroId) {
    return aparicoesNoLivro(dbRef, tipo, item, livroId).length > 0;
}

// ─── Aparição principal (F21-D2) ───────────────────────────────

// Chave comparável da data de publicação do livro (`livro.data`, parcial):
// ano, mês e dia, com mês e dia ausentes valendo 1. Sem ano, null.
function chaveDePublicacao(livro) {
    const d = livro?.data;
    if (!d || d.ano == null || Number.isNaN(Number(d.ano))) return null;
    return Number(d.ano) * 10000 + (Number(d.mes) || 1) * 100 + (Number(d.dia) || 1);
}

// A aparição principal: a do livro com a publicação mais antiga. Empate, ou
// livro sem data, fica com a primeira da lista (o Destino vem primeiro); quem
// tem data ganha de quem não tem. Coletânea só é principal quando o texto não
// está em nenhum livro comum (escolha do Claude a confirmar). Serve para
// ordenar e rotular, não para preencher a data do texto. Sem aparições, null.
export function aparicaoPrincipal(dbRef, aparicoes) {
    if (!aparicoes || !aparicoes.length) return null;
    const livros = lista(dbRef, 'livros');
    const livroDe = (a) => livros.find((l) => mesmoId(l.id, a.livroId));
    const comuns = aparicoes.filter((a) => livroDe(a)?.tipo !== 'Coletânea');
    const candidatas = comuns.length ? comuns : aparicoes;
    let melhor = candidatas[0];
    let melhorChave = chaveDePublicacao(livroDe(melhor));
    for (const a of candidatas.slice(1)) {
        const chave = chaveDePublicacao(livroDe(a));
        if (chave != null && (melhorChave == null || chave < melhorChave)) {
            melhor = a;
            melhorChave = chave;
        }
    }
    return melhor;
}

export function livroPrincipalDoTexto(dbRef, tipo, item) {
    const principal = aparicaoPrincipal(dbRef, aparicoesVigentes(dbRef, tipo, item));
    return principal ? principal.livroId : null;
}

// ─── Busca e filtros (Fase 21, 21-4a) ──────────────────────────

// O texto não aparece em nenhum livro comum (Coletânea não conta, F21-D3: ela
// segue guardada fora do texto). É o "Avulso" do filtro de livro da aba e o
// mesmo critério do tudo aninhado. Texto que só "consta" num livro, sem
// posição, não é avulso.
export function textoEhAvulso(dbRef, tipo, item) {
    return !aparicoesVigentes(dbRef, tipo, item).some((a) => a.origem !== 'coletanea');
}

// Textos para os prefixos de busca `livro:`, `parte:`, `secao:` e
// `coletanea:`: os títulos de TODAS as aparições do texto (F21-D6), sem
// repetir. `livro` inclui os livros e as Coletâneas; `coletanea` só as
// Coletâneas. Sem `tipo`, as Coletâneas ficam de fora (ver `aparicoesDoTexto`).
export function camposDeBuscaDasAparicoes(dbRef, tipo, item) {
    const livros = lista(dbRef, 'livros');
    const partes = lista(dbRef, 'partes');
    const secoes = lista(dbRef, 'secoes');
    const tituloDe = (colecao, id) =>
        id == null ? '' : colecao.find((x) => mesmoId(x.id, id))?.titulo || '';
    const campos = { livro: [], parte: [], secao: [], coletanea: [] };
    const poe = (chave, titulo) => {
        if (titulo && !campos[chave].includes(titulo)) campos[chave].push(titulo);
    };
    aparicoesVigentes(dbRef, tipo, item).forEach((a) => {
        const titulo = tituloDe(livros, a.livroId);
        poe('livro', titulo);
        if (a.origem === 'coletanea') poe('coletanea', titulo);
        poe('parte', tituloDe(partes, a.parteId));
        poe('secao', tituloDe(secoes, a.secaoId));
    });
    return {
        livro: campos.livro.join(' '),
        parte: campos.parte.join(' '),
        secao: campos.secao.join(' '),
        coletanea: campos.coletanea.join(' '),
    };
}

// ─── Saídas: o campo "Aparece em" (Fase 21, 21-4b) ─────────────

// Uma entrada por aparição do texto, para o `contexto.aparece_em` das
// exportações: `{ livro, parte, secao, posicao, coletanea, principal }` (títulos
// já resolvidos; `posicao` null quando "só consta"; `coletanea` true quando o
// livro é uma Coletânea; `principal` marca a da F21-D2). Mesma ordem de
// `aparicoesVigentes`. Sem tipo, as Coletâneas ficam de fora.
export function apareceEmDoTexto(dbRef, tipo, item) {
    const aparicoes = aparicoesVigentes(dbRef, tipo, item);
    const principal = aparicaoPrincipal(dbRef, aparicoes);
    const livros = lista(dbRef, 'livros');
    const partes = lista(dbRef, 'partes');
    const secoes = lista(dbRef, 'secoes');
    const tituloDe = (colecao, id) =>
        id == null ? null : colecao.find((x) => mesmoId(x.id, id))?.titulo || null;
    return aparicoes.map((a) => ({
        livro: tituloDe(livros, a.livroId),
        parte: tituloDe(partes, a.parteId),
        secao: tituloDe(secoes, a.secaoId),
        posicao: a.sequencia,
        coletanea: a.origem === 'coletanea',
        principal: a === principal,
    }));
}

// Texto de uma entrada de `apareceEmDoTexto`: "Livro › Parte › Seção · posição N"
// (ou "· sem posição" quando só consta no livro).
export function textoDeUmaAparicao(e) {
    const caminho = [e.livro, e.parte, e.secao].filter(Boolean).join(' › ');
    if (!caminho) return '';
    return `${caminho} · ${e.posicao == null ? 'sem posição' : `posição ${e.posicao}`}`;
}

// As aparições em livros comuns de um item já exportado (`item.contexto.aparece_em`),
// como lista de textos, para o `.md`, o Ver e o `.csv`. A linha só vale a pena
// com duas ou mais (com uma só, a "Localização" já diz tudo); texto descartado
// já saiu dos livros; as Coletâneas têm linha própria.
export function textosApareceEm(item) {
    if (!item || item.status === 'descartado') return [];
    const entradas = (item.contexto?.aparece_em || []).filter((e) => !e.coletanea);
    if (entradas.length < 2) return [];
    return entradas.map(textoDeUmaAparicao).filter(Boolean);
}

// ─── Ordem e coluna Estrutura da tabela (Fase 21, 21-4d, F21-D9) ──────────

// A aparição principal do texto (F21-D2), lida das aparições vigentes.
export function aparicaoPrincipalDoTexto(dbRef, tipo, item) {
    return aparicaoPrincipal(dbRef, aparicoesVigentes(dbRef, tipo, item));
}

// Chave de ordem do texto na tabela: Livro, Parte, Seção e a posição, todos da
// aparição PRINCIPAL (F21-D9). Os três primeiros são índices nas listas já
// ordenadas (`livros`, `partes`, `secoes`): -1 quer dizer "nenhum" (direto no
// Livro ou na Parte, que vêm antes das Partes e Seções) e 999 "sem lugar". Sem
// aparição em livro comum (avulso, ou só em Coletânea, que não ordena), tudo
// 999. "Só consta" (sem posição) fica no fim do próprio nível.
export function chaveDeOrdemDoTexto(dbRef, tipo, item) {
    const principal = aparicaoPrincipalDoTexto(dbRef, tipo, item);
    if (!principal || principal.origem === 'coletanea') {
        return { livro: 999, parte: 999, secao: 999, sequencia: 9999 };
    }
    const indice = (nome, id) => {
        const i = lista(dbRef, nome).findIndex((x) => mesmoId(x.id, id));
        return i < 0 ? 999 : i;
    };
    const livro = indice('livros', principal.livroId);
    let parte = -1;
    let secao = -1;
    if (principal.secaoId != null) {
        secao = indice('secoes', principal.secaoId);
        parte = principal.parteId != null ? indice('partes', principal.parteId) : 999;
    } else if (principal.parteId != null) {
        parte = indice('partes', principal.parteId);
    }
    return { livro, parte, secao, sequencia: principal.sequencia || 9999 };
}

// O que a coluna Estrutura (Poemas) e Vínculo (Prosas) mostra: uma linha por
// texto, com o lugar da aparição principal e, no tooltip, as outras
// (Coletâneas inclusive). `lugar` é `{ titulo, rotulo }` (rotulo 'SEC', 'PART'
// ou 'LIVRO') ou null quando o texto não tem aparição principal em livro
// comum; `outras` são textos prontos para o tooltip, e `extras` o seu número.
export function estruturaDoTextoNaTabela(dbRef, tipo, item) {
    const aparicoes = aparicoesVigentes(dbRef, tipo, item);
    const principal = aparicaoPrincipal(dbRef, aparicoes);
    const entradas = apareceEmDoTexto(dbRef, tipo, item);
    const principalEhLivro = !!principal && principal.origem !== 'coletanea';
    const tituloDe = (nome, id) =>
        lista(dbRef, nome).find((x) => mesmoId(x.id, id))?.titulo || null;
    let lugar = null;
    if (principalEhLivro) {
        const secaoTitulo =
            principal.secaoId != null ? tituloDe('secoes', principal.secaoId) : null;
        const parteTitulo =
            principal.parteId != null ? tituloDe('partes', principal.parteId) : null;
        if (secaoTitulo) lugar = { titulo: secaoTitulo, rotulo: 'SEC' };
        else if (principal.secaoId == null && parteTitulo) {
            lugar = { titulo: parteTitulo, rotulo: 'PART' };
        } else {
            const livroTitulo = tituloDe('livros', principal.livroId);
            if (livroTitulo) lugar = { titulo: livroTitulo, rotulo: 'LIVRO' };
        }
    }
    const outras = entradas
        .filter((e) => !e.principal || !principalEhLivro)
        .map((e) => {
            const texto = textoDeUmaAparicao(e);
            return texto && e.coletanea ? `${texto} (Coletânea)` : texto;
        })
        .filter(Boolean);
    return { lugar, outras, extras: outras.length };
}
