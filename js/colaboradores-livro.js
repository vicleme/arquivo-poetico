// ============================================================
// colaboradores-livro.js: Colaboradores e a equipe do Livro e da
// Coletânea (Fase 19, etapa 6, entrega 1). Só lógica pura, sem DOM e
// sem `db.js`: os dados vêm por parâmetro (`dbRef`), como em
// `autoria-livro.js` e `uso-ia-livro.js`.
//
// Dois dados, ligados por id:
//
//   db.colaboradores = [{
//     id: 7,
//     nome: 'Ana Souza',
//     papeisHabituais: ['Capista', 'Ilustrador'], // opcional, só ajuda
//     contato: 'https://exemplo.com',             // site ou contato, opcional
//     autorId: 1,                                 // opcional (F19-D13)
//   }]
//
//   livro.equipeLivro = [{
//     colaboradorId: 7,
//     papeis: [{ papel: 'Ilustrador', escopo: 'Capa' }, { papel: 'Revisor' }],
//   }]
//
// Cadastro separado de `db.autores` e de `db.pessoas` (F19-D6): quem produz
// o conteúdo da obra vai em Autoria, quem produz o objeto livro vai aqui
// (F19-D7). O papel vale por livro, não é da pessoa: ela pode ser Capista
// num livro e Revisora em outro. Cada papel aceita um escopo em texto livre
// (F19-D8), e a mesma pessoa pode repetir o papel com escopos diferentes
// (Ilustrador de capa e Ilustrador de miolo).
//
// `autorId` liga o Colaborador ao Autor quando é a mesma pessoa (F19-D13).
// Não há ligação direta com Pessoa: Pessoa já liga ao Autor, e o Autor é a
// ponte. Sem a chave, vale "sem vínculo".
//
// Livro antigo, sem `equipeLivro`, vale lista vazia: "ninguém registrado".
// Não precisa de migração.
// ============================================================

import { chavePapel, ROTULO_PAPEL_OUTRO } from './autoria-livro.js';

export const PAPEIS_EQUIPE_LIVRO = [
    'Capista',
    'Ilustrador',
    'Diagramador',
    'Revisor',
    'Preparador de texto',
    'Editor',
    'Fotógrafo',
];

// Sugestões de escopo (o que o papel cobre). É texto livre: não filtra com
// precisão, e isso foi aceito (F19-D8).
export const ESCOPOS_EQUIPE_SUGERIDOS = ['Capa', 'Miolo', 'Capa e miolo', 'Capitulares', 'Encarte'];

const PAPEL_POR_CHAVE = new Map(PAPEIS_EQUIPE_LIVRO.map((p) => [chavePapel(p), p]));

// Papel da lista fechada, com a grafia dela, ou `null` se for texto livre.
export function papelEquipeDaLista(texto) {
    return PAPEL_POR_CHAVE.get(chavePapel(texto)) || null;
}

export function papelEquipeEhOutro(texto) {
    return papelEquipeDaLista(texto) === null;
}

const arrumar = (texto) =>
    String(texto ?? '')
        .replace(/\s+/g, ' ')
        .trim();

const semId = (valor) => valor === undefined || valor === null || valor === '';

// ---------- Papéis de um vínculo ----------

// Um papel limpo: `{ papel }` ou `{ papel, escopo }`. Aceita texto puro
// ("Revisor") ou objeto. Sem papel (ou só o rótulo "Outro") devolve `null`.
// Papel que casa com a lista fechada usa a grafia dela; texto livre fica
// como foi digitado, com os espaços arrumados. A chave `escopo` só existe
// quando há escopo.
export function normalizarPapelEquipe(bruto) {
    const origem = typeof bruto === 'string' ? { papel: bruto } : bruto;
    if (!origem || typeof origem !== 'object') return null;
    const texto = arrumar(origem.papel);
    if (!texto || chavePapel(texto) === chavePapel(ROTULO_PAPEL_OUTRO)) return null;
    const papel = papelEquipeDaLista(texto) || texto;
    const escopo = arrumar(origem.escopo);
    return escopo ? { papel, escopo } : { papel };
}

// Lista de papéis limpa, na ordem em que veio. Repetido some, e o que conta
// como repetido é o mesmo papel com o mesmo escopo (ignorando caixa e
// acento): "Ilustrador, Capa" e "Ilustrador, Miolo" convivem.
export function normalizarPapeisEquipe(lista) {
    if (!Array.isArray(lista)) return [];
    const vistos = new Set();
    const saida = [];
    lista.forEach((bruto) => {
        const p = normalizarPapelEquipe(bruto);
        if (!p) return;
        const chave = `${chavePapel(p.papel)}|${chavePapel(p.escopo)}`;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(p);
    });
    return saida;
}

// "Ilustrador: Capa" ou só "Revisor".
export function textoPapelEquipe(p) {
    return p.escopo ? `${p.papel}: ${p.escopo}` : p.papel;
}

// ---------- Equipe do livro ----------

// Equipe limpa: `[{ colaboradorId, papeis }]`. Vínculo sem `colaboradorId`
// sai. O mesmo Colaborador em dois vínculos vira um só (papéis somados, sem
// repetir, na ordem de chegada; o vínculo fica onde apareceu primeiro).
// Vínculo com a lista de papéis vazia é mantido: o formulário é quem exige
// pelo menos um papel, e descartar aqui apagaria em silêncio o que veio de
// uma importação.
export function normalizarEquipeLivro(lista) {
    if (!Array.isArray(lista)) return [];
    const porId = new Map();
    const ordem = [];
    lista.forEach((v) => {
        if (!v || semId(v.colaboradorId)) return;
        const chave = String(v.colaboradorId);
        if (!porId.has(chave)) {
            porId.set(chave, { colaboradorId: v.colaboradorId, papeis: [] });
            ordem.push(chave);
        }
        const alvo = porId.get(chave);
        alvo.papeis = normalizarPapeisEquipe([
            ...alvo.papeis,
            ...(Array.isArray(v.papeis) ? v.papeis : []),
        ]);
    });
    return ordem.map((c) => porId.get(c));
}

// A equipe de um livro, em qualquer estado do dado (campo ausente, não lista).
export function equipeDoLivro(livro) {
    return normalizarEquipeLivro(livro?.equipeLivro);
}

// Campos para gravar no livro: só existe a chave quando há pelo menos um
// vínculo, então "nada registrado" e "registrado e depois apagado" são o
// mesmo estado.
export function camposEquipeLivro(lista) {
    const equipe = normalizarEquipeLivro(lista);
    return equipe.length ? { equipeLivro: equipe } : {};
}

// Vínculos que o formulário não pode gravar: Colaborador sem nenhum papel.
// Devolve `{ semPapel: [colaboradorId...] }`, vazio quando está tudo certo.
export function pendenciasDaEquipe(lista) {
    const semPapel = [];
    (Array.isArray(lista) ? lista : []).forEach((v) => {
        if (!v || semId(v.colaboradorId)) return;
        if (normalizarPapeisEquipe(v.papeis).length === 0) semPapel.push(v.colaboradorId);
    });
    return { semPapel };
}

// Papéis livres já digitados em algum livro (fora da lista fechada), sem
// repetir e em ordem alfabética, para a sugestão do campo "Outro".
export function papeisEquipeLivresUsados(livros) {
    const vistos = new Map();
    (livros || []).forEach((l) =>
        equipeDoLivro(l).forEach((v) =>
            v.papeis.forEach(({ papel }) => {
                if (papelEquipeEhOutro(papel) && !vistos.has(chavePapel(papel)))
                    vistos.set(chavePapel(papel), papel);
            }),
        ),
    );
    return Array.from(vistos.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Sugestões de escopo: as fixas primeiro, na ordem delas, e depois o que já
// foi digitado em algum livro, sem repetir e em ordem alfabética.
export function escoposEquipeSugeridos(livros) {
    const vistos = new Set(ESCOPOS_EQUIPE_SUGERIDOS.map(chavePapel));
    const novos = new Map();
    (livros || []).forEach((l) =>
        equipeDoLivro(l).forEach((v) =>
            v.papeis.forEach(({ escopo }) => {
                if (!escopo) return;
                const chave = chavePapel(escopo);
                if (!vistos.has(chave) && !novos.has(chave)) novos.set(chave, escopo);
            }),
        ),
    );
    return [
        ...ESCOPOS_EQUIPE_SUGERIDOS,
        ...Array.from(novos.values()).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    ];
}

// ---------- Cadastro de Colaboradores ----------

// Papéis habituais: só texto, sem vazio, sem repetir, na ordem em que veio.
// Sem escopo (o escopo é do livro, não da pessoa).
export function normalizarPapeisHabituais(lista) {
    if (!Array.isArray(lista)) return [];
    const vistos = new Set();
    const saida = [];
    lista.forEach((bruto) => {
        const texto = arrumar(typeof bruto === 'string' ? bruto : bruto?.papel);
        if (!texto || chavePapel(texto) === chavePapel(ROTULO_PAPEL_OUTRO)) return;
        const chave = chavePapel(texto);
        if (vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(papelEquipeDaLista(texto) || texto);
    });
    return saida;
}

// Colaborador limpo para gravar. `papeisHabituais` é sempre lista; `contato`
// é sempre texto; `autorId` só existe quando há vínculo com Autor.
export function normalizarColaborador(dados) {
    const base = dados && typeof dados === 'object' ? dados : {};
    const colaborador = {
        id: base.id,
        nome: arrumar(base.nome),
        papeisHabituais: normalizarPapeisHabituais(base.papeisHabituais),
        contato: String(base.contato ?? '').trim(),
    };
    if (!semId(base.autorId)) colaborador.autorId = base.autorId;
    return colaborador;
}

// Já existe outro Colaborador com este nome (ignorando caixa, acento e
// espaços)? `ignorarId` serve para a edição não bater em si mesma. Devolve o
// Colaborador achado ou `null`. Nome vazio nunca conta como repetido.
export function colaboradorComNome(colaboradores, nome, ignorarId = null) {
    const chave = chavePapel(nome);
    if (!chave) return null;
    return (
        (colaboradores || []).find(
            (c) =>
                chavePapel(c.nome) === chave &&
                (semId(ignorarId) || String(c.id) !== String(ignorarId)),
        ) || null
    );
}

export function colaboradorPorId(colaboradores, id) {
    if (semId(id)) return null;
    return (colaboradores || []).find((c) => String(c.id) === String(id)) || null;
}

// Colaboradores em ordem alfabética, para select e lista.
export function colaboradoresOrdenados(colaboradores) {
    return [...(colaboradores || [])].sort((a, b) =>
        String(a.nome).localeCompare(String(b.nome), 'pt-BR'),
    );
}

// ---------- Leitura ----------

// Pares `{ colaborador, papeis }` com o Colaborador do cadastro. Colaborador
// que não existe mais é ignorado (mesmo critério de `paresAutoriaLivro`).
export function paresEquipeLivro(livro, colaboradoresCadastro = []) {
    const porId = new Map((colaboradoresCadastro || []).map((c) => [String(c.id), c]));
    const pares = [];
    equipeDoLivro(livro).forEach((v) => {
        const colaborador = porId.get(String(v.colaboradorId));
        if (colaborador) pares.push({ colaborador, papeis: v.papeis });
    });
    return pares;
}

// "Ana Souza (Capista: Capa, Revisor); Bia (Diagramador)": uma linha de texto
// para busca, `.md`, `.csv` e cards. Vínculo sem papel mostra só o nome.
export function textoEquipeLivro(livro, colaboradoresCadastro = []) {
    return paresEquipeLivro(livro, colaboradoresCadastro)
        .map(({ colaborador, papeis }) =>
            papeis.length
                ? `${colaborador.nome} (${papeis.map(textoPapelEquipe).join(', ')})`
                : colaborador.nome,
        )
        .join('; ');
}

// Equipe para sair em arquivo: `[{ colaborador: 'Nome', papeis: [{ papel,
// escopo? }] }]`, só com nomes, porque o id não vale fora deste acervo.
// Mantém a ordem dos vínculos e a dos papéis. Colaborador que não existe mais
// no cadastro é ignorado.
export function equipeLivroPorNome(livro, colaboradoresCadastro = []) {
    return paresEquipeLivro(livro, colaboradoresCadastro).map(({ colaborador, papeis }) => ({
        colaborador: colaborador.nome,
        papeis: papeis.map((p) => ({ ...p })),
    }));
}

// Livros em que o Colaborador consta na equipe.
export function livrosDoColaborador(livros, colaboradorId) {
    return (livros || []).filter((l) =>
        equipeDoLivro(l).some((v) => String(v.colaboradorId) === String(colaboradorId)),
    );
}

// O livro tem este Colaborador (qualquer papel) na equipe? `papel` opcional:
// só vale se ele tem aquele papel (ignora caixa e acento; o escopo não conta).
export function livroTemColaborador(livro, colaboradorId, papel = '') {
    const chaveDoPapel = chavePapel(papel);
    return equipeDoLivro(livro).some(
        (v) =>
            String(v.colaboradorId) === String(colaboradorId) &&
            (!chaveDoPapel || v.papeis.some((p) => chavePapel(p.papel) === chaveDoPapel)),
    );
}

// Colaboradores que aparecem na equipe de algum livro, para o select do
// filtro: só quem existe no cadastro, em ordem alfabética, sem repetir.
export function colaboradoresDosLivros(livros, colaboradoresCadastro = []) {
    const ids = new Set();
    (livros || []).forEach((l) =>
        equipeDoLivro(l).forEach((v) => ids.add(String(v.colaboradorId))),
    );
    return colaboradoresOrdenados(
        (colaboradoresCadastro || []).filter((c) => ids.has(String(c.id))),
    );
}

// Papéis que aparecem na equipe de algum livro, para o select do filtro:
// os da lista fechada na ordem dela e depois os livres em ordem alfabética.
export function papeisEquipeNosLivros(livros) {
    const usados = new Set();
    (livros || []).forEach((l) =>
        equipeDoLivro(l).forEach((v) => v.papeis.forEach((p) => usados.add(chavePapel(p.papel)))),
    );
    const daLista = PAPEIS_EQUIPE_LIVRO.filter((p) => usados.has(chavePapel(p)));
    return [...daLista, ...papeisEquipeLivresUsados(livros)];
}

// "Tudo o que fulano fez": um item por livro em que consta, com os papéis
// que teve nele, na ordem em que os livros estão no acervo.
export function trabalhosDoColaborador(livros, colaboradorId) {
    const trabalhos = [];
    (livros || []).forEach((livro) => {
        const vinculo = equipeDoLivro(livro).find(
            (v) => String(v.colaboradorId) === String(colaboradorId),
        );
        if (vinculo) trabalhos.push({ livro, papeis: vinculo.papeis });
    });
    return trabalhos;
}

// ---------- Exclusão de Colaborador ----------

// Livros que perdem este Colaborador se ele for excluído (só desvincula: o
// livro continua existindo). F19-D14: aviso com a contagem e Desfazer.
export function impactoExclusaoColaboradorNosLivros(dbRef, colaboradorId) {
    return { livrosIds: livrosDoColaborador(dbRef.livros, colaboradorId).map((l) => l.id) };
}

// Tira o Colaborador da equipe de todo livro e devolve o que saiu, para o
// Desfazer: `[{ livroId, entrada, indice }]` (a entrada inteira, com os papéis
// e escopos, e a posição original na lista).
export function removerColaboradorDosLivros(dbRef, colaboradorId) {
    const removidos = [];
    (dbRef.livros || []).forEach((livro) => {
        if (!Array.isArray(livro.equipeLivro)) return;
        for (let i = livro.equipeLivro.length - 1; i >= 0; i--) {
            if (String(livro.equipeLivro[i].colaboradorId) === String(colaboradorId)) {
                removidos.push({ livroId: livro.id, entrada: livro.equipeLivro[i], indice: i });
                livro.equipeLivro.splice(i, 1);
            }
        }
        if (livro.equipeLivro.length === 0) delete livro.equipeLivro;
    });
    return removidos;
}

// Desfaz `removerColaboradorDosLivros`: devolve cada entrada ao livro, na
// posição de antes. Livro que já não existe é ignorado. Repetido não duplica.
export function restaurarColaboradorNosLivros(dbRef, removidos) {
    // Do menor índice para o maior, para cada entrada voltar ao lugar dela.
    [...(removidos || [])]
        .sort((a, b) => a.indice - b.indice)
        .forEach(({ livroId, entrada, indice }) => {
            const livro = (dbRef.livros || []).find((l) => String(l.id) === String(livroId));
            if (!livro) return;
            livro.equipeLivro ||= [];
            if (
                livro.equipeLivro.some(
                    (v) => String(v.colaboradorId) === String(entrada.colaboradorId),
                )
            )
                return;
            livro.equipeLivro.splice(Math.min(indice, livro.equipeLivro.length), 0, entrada);
        });
}

// ---------- Ligação com o Autor (F19-D13) ----------

// Colaboradores ligados a este Autor.
export function colaboradoresDoAutor(colaboradores, autorId) {
    if (semId(autorId)) return [];
    return (colaboradores || []).filter(
        (c) => !semId(c.autorId) && String(c.autorId) === String(autorId),
    );
}

// Excluir o Autor: os Colaboradores ligados a ele ficam, só perdem o vínculo.
// Devolve os ids que perderam, para o Desfazer.
export function desligarAutorDosColaboradores(dbRef, autorId) {
    const desligados = [];
    colaboradoresDoAutor(dbRef.colaboradores, autorId).forEach((c) => {
        desligados.push({ colaboradorId: c.id, autorId: c.autorId });
        delete c.autorId;
    });
    return desligados;
}

// Desfaz `desligarAutorDosColaboradores`. Colaborador que já não existe, ou que
// ganhou outro vínculo nesse meio tempo, é deixado como está.
export function religarAutorAosColaboradores(dbRef, desligados) {
    (desligados || []).forEach(({ colaboradorId, autorId }) => {
        const c = colaboradorPorId(dbRef.colaboradores, colaboradorId);
        if (c && semId(c.autorId)) c.autorId = autorId;
    });
}
