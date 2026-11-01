// ============================================================
// ligacoes-tema-pessoa.js — análise "Tema × Pessoa" por texto.
// Sem DOM e sem imports: só funções sobre os dados.
//
// Num texto com vários Temas e várias Pessoas, o Tema muitas vezes remete só a
// uma delas. A análise (feita na aba Cruzamentos, nunca nos modais do texto)
// diz quais pares Tema × Pessoa se ligam de verdade.
//
// Campo do Poema e da Prosa:
//   ligacoesTemaPessoa: { temaIds, pessoaIds, desligados: [{ temaId, pessoaId }] }
// Campo ausente quer dizer "não analisado". Os ids são o retrato dos Temas e
// das Pessoas na hora da análise; só os pares DESLIGADOS são gravados, então
// "analisado e nada desligado" é diferente de "não analisado".
// ============================================================

export const ESTADOS_ANALISE = ['sem-ambiguidade', 'nao-analisado', 'analisado', 'revisar'];

const mesmo = (a, b) => a != null && b != null && String(a) === String(b);
const unicos = (lista) => {
    const vistos = [];
    lista.forEach((v) => {
        if (v != null && !vistos.some((x) => mesmo(x, v))) vistos.push(v);
    });
    return vistos;
};
const temId = (lista, id) => lista.some((x) => mesmo(x, id));

function chaveNome(s) {
    return String(s ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toLowerCase();
}

function todosOsTextos(dbRef) {
    return [...(dbRef?.poemas || []), ...(dbRef?.prosas || [])];
}

// Ids dos Temas e das Pessoas que o texto tem agora.
export function temasDoTexto(texto) {
    return unicos((Array.isArray(texto?.temas) ? texto.temas : []).map((t) => t?.temaId));
}

export function pessoasDoTexto(texto) {
    return unicos((Array.isArray(texto?.pessoas) ? texto.pessoas : []).map((p) => p?.pessoaId));
}

function campoValido(texto) {
    const l = texto?.ligacoesTemaPessoa;
    return l && typeof l === 'object' && !Array.isArray(l) ? l : null;
}

// 'sem-ambiguidade': menos de 2 Pessoas ou nenhum Tema (nada a desambiguar).
// 'nao-analisado': tem ambiguidade e nunca foi analisado.
// 'analisado': o retrato de Temas e Pessoas ainda cobre o texto.
// 'revisar': o texto ganhou Tema ou Pessoa depois da análise (tirar não pede revisão).
export function estadoAnaliseLigacoes(texto) {
    const temas = temasDoTexto(texto);
    const pessoas = pessoasDoTexto(texto);
    if (pessoas.length < 2 || temas.length === 0) return 'sem-ambiguidade';
    const l = campoValido(texto);
    if (!l) return 'nao-analisado';
    const temasVistos = Array.isArray(l.temaIds) ? l.temaIds : [];
    const pessoasVistas = Array.isArray(l.pessoaIds) ? l.pessoaIds : [];
    const ganhou =
        temas.some((id) => !temId(temasVistos, id)) ||
        pessoas.some((id) => !temId(pessoasVistas, id));
    return ganhou ? 'revisar' : 'analisado';
}

// Só dá false para o par desligado gravado: texto não analisado e par novo
// contam ligados, como a matriz de Cruzamentos faz hoje.
export function parLigado(texto, temaId, pessoaId) {
    const l = campoValido(texto);
    if (!l || !Array.isArray(l.desligados)) return true;
    return !l.desligados.some((d) => mesmo(d?.temaId, temaId) && mesmo(d?.pessoaId, pessoaId));
}

export function pessoasLigadasAoTema(texto, temaId) {
    return pessoasDoTexto(texto).filter((pessoaId) => parLigado(texto, temaId, pessoaId));
}

// Grade para a tela de análise: Temas nas linhas, Pessoas nas colunas, cada
// célula com o estado atual (tudo ligado, menos o que foi desligado antes).
export function grade(texto) {
    const temaIds = temasDoTexto(texto);
    const pessoaIds = pessoasDoTexto(texto);
    return {
        temaIds,
        pessoaIds,
        celulas: temaIds.map((temaId) =>
            pessoaIds.map((pessoaId) => ({
                temaId,
                pessoaId,
                ligado: parLigado(texto, temaId, pessoaId),
            })),
        ),
    };
}

// Grava a análise: o retrato dos Temas e das Pessoas de agora e só os pares
// desligados (sem repetição, e só pares que existem no texto).
export function gravarLigacoes(texto, desligados = []) {
    const temaIds = temasDoTexto(texto);
    const pessoaIds = pessoasDoTexto(texto);
    const pares = [];
    (desligados || []).forEach((d) => {
        if (!d || !temId(temaIds, d.temaId) || !temId(pessoaIds, d.pessoaId)) return;
        if (pares.some((p) => mesmo(p.temaId, d.temaId) && mesmo(p.pessoaId, d.pessoaId))) return;
        pares.push({ temaId: d.temaId, pessoaId: d.pessoaId });
    });
    texto.ligacoesTemaPessoa = { temaIds, pessoaIds, desligados: pares };
    return texto.ligacoesTemaPessoa;
}

// Volta o texto para "não analisado".
export function limparLigacoes(texto) {
    delete texto.ligacoesTemaPessoa;
}

// Fila da tela: textos com ambiguidade ainda não analisados ou a revisar.
export function filaAnaliseLigacoes(dbRef) {
    const fila = [];
    [
        ['poema', dbRef?.poemas],
        ['prosa', dbRef?.prosas],
    ].forEach(([tipo, lista]) => {
        (lista || []).forEach((texto) => {
            const estado = estadoAnaliseLigacoes(texto);
            if (estado === 'nao-analisado' || estado === 'revisar') {
                fila.push({ tipo, texto, estado });
            }
        });
    });
    return fila;
}

// Progresso "n de N": N são os textos com ambiguidade; n, os já analisados.
export function resumoAnaliseLigacoes(dbRef) {
    const r = { total: 0, analisados: 0, revisar: 0, pendentes: 0 };
    todosOsTextos(dbRef).forEach((texto) => {
        const estado = estadoAnaliseLigacoes(texto);
        if (estado === 'sem-ambiguidade') return;
        r.total += 1;
        if (estado === 'analisado') r.analisados += 1;
        else if (estado === 'revisar') r.revisar += 1;
        else r.pendentes += 1;
    });
    return r;
}

// Forma limpa no carregamento e na importação do backup: tira o que não é um
// objeto, deixa as listas sem repetição e só mantém pares desligados que cabem
// no retrato gravado.
export function migrarLigacoesTemaPessoa(dbRef) {
    todosOsTextos(dbRef).forEach((texto) => {
        if (!('ligacoesTemaPessoa' in texto)) return;
        const l = campoValido(texto);
        if (!l || (!Array.isArray(l.temaIds) && !Array.isArray(l.pessoaIds))) {
            delete texto.ligacoesTemaPessoa;
            return;
        }
        const temaIds = unicos(Array.isArray(l.temaIds) ? l.temaIds : []);
        const pessoaIds = unicos(Array.isArray(l.pessoaIds) ? l.pessoaIds : []);
        const desligados = [];
        (Array.isArray(l.desligados) ? l.desligados : []).forEach((d) => {
            if (!d || !temId(temaIds, d.temaId) || !temId(pessoaIds, d.pessoaId)) return;
            if (
                desligados.some((p) => mesmo(p.temaId, d.temaId) && mesmo(p.pessoaId, d.pessoaId))
            ) {
                return;
            }
            desligados.push({ temaId: d.temaId, pessoaId: d.pessoaId });
        });
        texto.ligacoesTemaPessoa = { temaIds, pessoaIds, desligados };
    });
}

// Mesclagem: a origem vira o destino nos pares. `tipo` é 'tema' ou 'pessoa'.
// Se o texto tinha os dois, o par só fica desligado quando TODOS os pares que se
// juntaram estavam desligados (na dúvida, liga). Devolve `desfazer`, que
// restaura a análise de cada texto mexido.
export function remapearLigacoesDosTextos(dbRef, tipo, origemId, destinoId) {
    const campoIds = tipo === 'tema' ? 'temaIds' : 'pessoaIds';
    const campoOutro = tipo === 'tema' ? 'pessoaIds' : 'temaIds';
    const antes = [];
    todosOsTextos(dbRef).forEach((texto) => {
        const l = campoValido(texto);
        if (!l || !Array.isArray(l[campoIds]) || !temId(l[campoIds], origemId)) return;
        antes.push({ texto, ligacoes: JSON.parse(JSON.stringify(l)) });
        const tinhaDestino = temId(l[campoIds], destinoId);
        const lista = Array.isArray(l.desligados) ? l.desligados : [];
        const dono = (d) => (tipo === 'tema' ? d.temaId : d.pessoaId);
        const outro = (d) => (tipo === 'tema' ? d.pessoaId : d.temaId);
        const montar = (idDono, idOutro) =>
            tipo === 'tema'
                ? { temaId: idDono, pessoaId: idOutro }
                : { temaId: idOutro, pessoaId: idDono };
        const estaDesligado = (idDono, idOutro) =>
            lista.some((d) => mesmo(dono(d), idDono) && mesmo(outro(d), idOutro));

        let novos;
        if (tinhaDestino) {
            novos = [];
            (l[campoOutro] || []).forEach((idOutro) => {
                if (estaDesligado(origemId, idOutro) && estaDesligado(destinoId, idOutro)) {
                    novos.push(montar(destinoId, idOutro));
                }
            });
            // Pares de outras linhas/colunas seguem como estavam.
            lista.forEach((d) => {
                if (!mesmo(dono(d), origemId) && !mesmo(dono(d), destinoId)) {
                    novos.push({ temaId: d.temaId, pessoaId: d.pessoaId });
                }
            });
            l[campoIds] = unicos(l[campoIds].filter((id) => !mesmo(id, origemId)));
        } else {
            novos = lista.map((d) =>
                mesmo(dono(d), origemId)
                    ? montar(destinoId, outro(d))
                    : { temaId: d.temaId, pessoaId: d.pessoaId },
            );
            l[campoIds] = unicos(l[campoIds].map((id) => (mesmo(id, origemId) ? destinoId : id)));
        }
        const unicosPares = [];
        novos.forEach((p) => {
            if (
                !unicosPares.some((q) => mesmo(q.temaId, p.temaId) && mesmo(q.pessoaId, p.pessoaId))
            ) {
                unicosPares.push(p);
            }
        });
        l.desligados = unicosPares;
    });
    return () => {
        antes.forEach(({ texto, ligacoes }) => {
            texto.ligacoesTemaPessoa = ligacoes;
        });
    };
}

// Salvar do Poema e da Prosa troca o objeto inteiro: leva a análise junto.
export function preservarLigacoesTemaPessoa(anterior, dados) {
    if (!anterior || !dados) return;
    if (dados.ligacoesTemaPessoa === undefined && anterior.ligacoesTemaPessoa !== undefined) {
        dados.ligacoesTemaPessoa = anterior.ligacoesTemaPessoa;
    }
}

// JSON seletivo: ids não valem em outro acervo, então a análise viaja em NOMES.
// `pessoaExportavel(pessoaId)` deixa de fora Pessoa oculta. Devolve null quando
// não há análise (o campo some do registro).
export function ligacoesParaExportar(dbRef, texto, pessoaExportavel = () => true) {
    const l = campoValido(texto);
    if (!l) return null;
    const nomeTema = (id) => (dbRef.temas || []).find((t) => mesmo(t.id, id))?.nome || '';
    const nomePessoa = (id) => (dbRef.pessoas || []).find((p) => mesmo(p.id, id))?.nome || '';
    const temaIds = (Array.isArray(l.temaIds) ? l.temaIds : []).filter((id) => nomeTema(id));
    const pessoaIds = (Array.isArray(l.pessoaIds) ? l.pessoaIds : []).filter(
        (id) => nomePessoa(id) && pessoaExportavel(id),
    );
    return {
        temas: temaIds.map(nomeTema),
        pessoas: pessoaIds.map(nomePessoa),
        desligados: (Array.isArray(l.desligados) ? l.desligados : [])
            .filter((d) => temId(temaIds, d?.temaId) && temId(pessoaIds, d?.pessoaId))
            .map((d) => ({ tema: nomeTema(d.temaId), pessoa: nomePessoa(d.pessoaId) })),
    };
}

// Importação Aditiva: recasa pelo nome com os Temas e as Pessoas do texto novo
// (que já tem `temas` e `pessoas` do acervo de destino). Devolve o campo ou
// null (JSON antigo ou sem nada que case = não analisado).
export function importarLigacoes(dbRef, ligacoesOrigem, novoItem) {
    if (!ligacoesOrigem || typeof ligacoesOrigem !== 'object') return null;
    const nomesTemas = Array.isArray(ligacoesOrigem.temas) ? ligacoesOrigem.temas : [];
    const nomesPessoas = Array.isArray(ligacoesOrigem.pessoas) ? ligacoesOrigem.pessoas : [];
    const temaPorNome = (nome) =>
        temasDoTexto(novoItem).find((id) =>
            (dbRef.temas || []).some(
                (t) => mesmo(t.id, id) && chaveNome(t.nome) === chaveNome(nome),
            ),
        );
    const pessoaPorNome = (nome) =>
        pessoasDoTexto(novoItem).find((id) =>
            (dbRef.pessoas || []).some(
                (p) => mesmo(p.id, id) && chaveNome(p.nome) === chaveNome(nome),
            ),
        );
    const temaIds = unicos(nomesTemas.map(temaPorNome));
    const pessoaIds = unicos(nomesPessoas.map(pessoaPorNome));
    if (!temaIds.length && !pessoaIds.length) return null;
    const desligados = [];
    (Array.isArray(ligacoesOrigem.desligados) ? ligacoesOrigem.desligados : []).forEach((d) => {
        const temaId = temaPorNome(d?.tema);
        const pessoaId = pessoaPorNome(d?.pessoa);
        if (temaId == null || pessoaId == null) return;
        if (!temId(temaIds, temaId) || !temId(pessoaIds, pessoaId)) return;
        if (desligados.some((p) => mesmo(p.temaId, temaId) && mesmo(p.pessoaId, pessoaId))) return;
        desligados.push({ temaId, pessoaId });
    });
    return { temaIds, pessoaIds, desligados };
}
