// ============================================================
// gestao-papeis-pessoa.js: gestão dos papéis de Pessoa (lógica pura)
// Sem DOM e sem db.js: cada função recebe `dbRef` (o objeto de dados) e só o
// altera quando a operação dá certo. Quem chama decide quando persistir e
// quando redesenhar a tela.
//
// Regras (decididas com o Victor, 21/10/2026):
//   - Papel de fábrica: nome e regras travados; apelido e descrição editáveis;
//     não se apaga.
//   - Papel acrescentado: nome, apelido e descrição editáveis; apaga-se só
//     sem uso. Não tem regra de exclusão (as flags ficam desligadas).
//   - O valor gravado nos textos é o NOME do papel, então renomear migra as
//     strings de `papeis` em Poemas e Prosas.
//   - Apelido é único no registro (sem caixa e sem acento).
//
// Todas as operações devolvem { ok: true, ... } ou { ok: false, erro }.
// ============================================================

import {
    apelidoDisponivel,
    apelidoSugerido,
    chavePapel,
    violacoesDeExclusao,
} from './papeis-pessoa.js';

export const LIMITE_APELIDO = 8;
export const LIMITE_NOME_PAPEL = 40;

const textos = (dbRef) => [...(dbRef?.poemas || []), ...(dbRef?.prosas || [])];
const vinculosDe = (item) => (Array.isArray(item?.pessoas) ? item.pessoas : []);

function registroDe(dbRef) {
    if (!Array.isArray(dbRef.papeisPessoa)) dbRef.papeisPessoa = [];
    return dbRef.papeisPessoa;
}

// Quantos vínculos e quantos textos usam cada papel. Devolve um Map
// nome → { vinculos, textos }; papel sem uso não aparece no Map.
export function usoDosPapeis(dbRef) {
    const uso = new Map();
    textos(dbRef).forEach((item) => {
        const vistosNoTexto = new Set();
        vinculosDe(item).forEach((v) => {
            (Array.isArray(v?.papeis) ? v.papeis : []).forEach((papel) => {
                const atual = uso.get(papel) || { vinculos: 0, textos: 0 };
                atual.vinculos += 1;
                if (!vistosNoTexto.has(papel)) {
                    atual.textos += 1;
                    vistosNoTexto.add(papel);
                }
                uso.set(papel, atual);
            });
        });
    });
    return uso;
}

export function usoDoPapel(dbRef, nome) {
    return usoDosPapeis(dbRef).get(nome) || { vinculos: 0, textos: 0 };
}

// Vínculos que hoje violam alguma regra de exclusão (dado antigo ou importado).
// Devolve { vinculos, textos }.
export function contarViolacoesDeExclusao(dbRef) {
    let vinculos = 0;
    let nTextos = 0;
    textos(dbRef).forEach((item) => {
        let neste = 0;
        vinculosDe(item).forEach((v) => {
            if (violacoesDeExclusao(v?.papeis, dbRef.papeisPessoa).length) neste += 1;
        });
        vinculos += neste;
        if (neste) nTextos += 1;
    });
    return { vinculos, textos: nTextos };
}

// ─── Validação ───────────────────────────────────────────────

export function validarApelido(dbRef, nome, apelido) {
    const a = typeof apelido === 'string' ? apelido.trim() : '';
    if (!a) return 'Escreva um apelido.';
    if (a.length > LIMITE_APELIDO) return `O apelido tem no máximo ${LIMITE_APELIDO} caracteres.`;
    if (!apelidoDisponivel(a, nome, registroDe(dbRef))) return `O apelido "${a}" já está em uso.`;
    return null;
}

export function validarNomeNovo(dbRef, nome, nomeAtual = null) {
    const n = typeof nome === 'string' ? nome.trim() : '';
    if (!n) return 'Escreva o nome do papel.';
    if (n.length > LIMITE_NOME_PAPEL)
        return `O nome tem no máximo ${LIMITE_NOME_PAPEL} caracteres.`;
    const igual = registroDe(dbRef).find(
        (p) => p.nome !== nomeAtual && chavePapel(p.nome) === chavePapel(n),
    );
    if (igual) return `Já existe o papel "${igual.nome}".`;
    return null;
}

// ─── Operações ───────────────────────────────────────────────

// Acrescenta um papel ao fim do registro. Apelido vazio vira o sugerido.
export function adicionarPapel(dbRef, { nome, apelido = '', descricao = '' } = {}) {
    const erroNome = validarNomeNovo(dbRef, nome);
    if (erroNome) return { ok: false, erro: erroNome };
    const registro = registroDe(dbRef);
    const nomeLimpo = nome.trim();
    const usados = new Set(registro.map((p) => chavePapel(p.apelido)));
    const apelidoFinal =
        typeof apelido === 'string' && apelido.trim()
            ? apelido.trim()
            : apelidoSugerido(nomeLimpo, usados);
    const erroApelido = validarApelido(dbRef, nomeLimpo, apelidoFinal);
    if (erroApelido) return { ok: false, erro: erroApelido };
    const papel = {
        nome: nomeLimpo,
        apelido: apelidoFinal,
        descricao: typeof descricao === 'string' ? descricao.trim() : '',
        grupoExclusao: '',
        exclusivoComTodos: false,
        superficie: false,
        fabrica: false,
    };
    registro.push(papel);
    return { ok: true, papel };
}

// Troca apelido e/ou descrição (vale para qualquer papel, de fábrica ou não).
export function editarPapel(dbRef, nome, { apelido, descricao } = {}) {
    const papel = registroDe(dbRef).find((p) => p.nome === nome);
    if (!papel) return { ok: false, erro: 'Papel não encontrado.' };
    if (apelido !== undefined) {
        const erro = validarApelido(dbRef, nome, apelido);
        if (erro) return { ok: false, erro };
    }
    if (apelido !== undefined) papel.apelido = apelido.trim();
    if (descricao !== undefined) {
        papel.descricao = typeof descricao === 'string' ? descricao.trim() : '';
    }
    return { ok: true, papel };
}

// Renomeia um papel acrescentado e migra os textos. Se o novo nome já é de
// outro papel, os dois se juntam (o papel renomeado some do registro e os
// vínculos passam a usar o outro); a junção é recusada se algum vínculo ficasse
// com papéis que não convivem.
export function renomearPapel(dbRef, nome, novoNome) {
    const registro = registroDe(dbRef);
    const papel = registro.find((p) => p.nome === nome);
    if (!papel) return { ok: false, erro: 'Papel não encontrado.' };
    if (papel.fabrica) return { ok: false, erro: 'O nome de um papel de fábrica não muda.' };
    const novo = typeof novoNome === 'string' ? novoNome.trim() : '';
    if (!novo) return { ok: false, erro: 'Escreva o novo nome.' };
    if (novo === nome) return { ok: true, juntou: false, alterados: 0 };

    const destino = registro.find((p) => p !== papel && chavePapel(p.nome) === chavePapel(novo));
    if (!destino) {
        const erro = validarNomeNovo(dbRef, novo, nome);
        if (erro) return { ok: false, erro };
    }
    const nomeFinal = destino ? destino.nome : novo;

    // Calcula tudo antes de gravar, para recusar sem deixar meio-feito.
    const registroDepois = destino ? registro.filter((p) => p !== papel) : registro;
    const planos = [];
    let alterados = 0;
    for (const item of textos(dbRef)) {
        for (const v of vinculosDe(item)) {
            if (!Array.isArray(v?.papeis) || !v.papeis.includes(nome)) continue;
            const novos = [];
            v.papeis.forEach((p) => {
                const final = p === nome ? nomeFinal : p;
                if (!novos.includes(final)) novos.push(final);
            });
            if (destino && violacoesDeExclusao(novos, registroDepois).length) {
                return {
                    ok: false,
                    erro: `Juntar "${nome}" a "${destino.nome}" deixaria vínculos com papéis que não convivem. Ajuste esses textos antes.`,
                };
            }
            planos.push([v, novos]);
            alterados += 1;
        }
    }
    planos.forEach(([v, novos]) => {
        v.papeis = novos;
    });
    if (destino) registro.splice(registro.indexOf(papel), 1);
    else papel.nome = nomeFinal;
    return { ok: true, juntou: !!destino, alterados };
}

// Apaga um papel acrescentado e sem uso.
export function apagarPapel(dbRef, nome) {
    const registro = registroDe(dbRef);
    const i = registro.findIndex((p) => p.nome === nome);
    if (i < 0) return { ok: false, erro: 'Papel não encontrado.' };
    if (registro[i].fabrica) return { ok: false, erro: 'Papel de fábrica não se apaga.' };
    const uso = usoDoPapel(dbRef, nome);
    if (uso.vinculos) {
        return {
            ok: false,
            erro: `"${nome}" está em ${uso.vinculos} vínculo${uso.vinculos !== 1 ? 's' : ''} (${uso.textos} texto${uso.textos !== 1 ? 's' : ''}). Renomeie para juntar a outro papel ou tire dos textos antes.`,
        };
    }
    registro.splice(i, 1);
    return { ok: true };
}
