// ============================================================
// pessoas-papeis-massa.js: lógica pura (sem DOM e sem db.js) da ação em massa
// "Pessoas e papéis" de Poemas e Prosas: ligar ou desligar Pessoas, cada uma com
// os seus papéis, em vários textos de uma vez. A tela (painel, confirmação,
// Desfazer) fica em selecao-massa.js, na mesma divisão de periodos-massa.js.
//
// Forma no texto: item.pessoas = [{ pessoaId, papeis }], com `papeis` tirado de
// o registro de papéis (papeis-pessoa.js; lista de 0 ou mais valores).
//
// Entrada: uma lista de { nome, papeis }, uma entrada por Pessoa, cada uma com
// os papéis que ela deve ter (a Pessoa A pode ser Retratada e a B só
// Mencionada, na mesma operação).
//
// Aplicar é aditivo:
//   - texto sem a Pessoa: ela entra com os papéis pedidos (nenhum papel marcado
//     entra com a lista vazia, como o "+ Dedicar" antigo);
//   - texto que já tem a Pessoa: ganha só os papéis que faltam, e os que já
//     tinha ficam (união); papel não pedido nunca é tirado. Papel pedido que
//     conflita com um que o texto já tinha (regras de exclusão do registro,
//     como Mencionado(a) × Aludido(a) ou Relacionado(a) × todos) não entra: o que
//     já estava marcado vence, e o pedido que conflita com outro pedido perde
//     para o primeiro da lista;
//   - nome que não existe no cadastro vira Pessoa nova ao aplicar. Nome que casa
//     com mais de uma Pessoa (ignorando caixa e acento) é ambíguo e fica de fora.
//
// Remover:
//   - com papéis marcados: tira só esses papéis. O vínculo fica, mesmo que a
//     Pessoa termine sem nenhum papel;
//   - sem papéis marcados: tira a Pessoa do texto.
//   Nome que não existe no cadastro não tem o que remover e nunca é criado.
//
// O plano (planejar*) não toca em nada; aplicar* grava e devolve `desfazer`, que
// restaura `pessoas` de cada texto tocado e apaga as Pessoas criadas.
// ============================================================

import { chaveTema, gerarId } from './utils.js';
import { nomesPapeisPessoa, resolverConflitosMantendoOPrimeiro } from './papeis-pessoa.js';

const compactar = (v) =>
    String(v ?? '')
        .replace(/\s+/g, ' ')
        .trim();

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// Papéis válidos e sem repetição, na ordem em que vieram. A ordem do array
// `papeis` é a relevância do papel naquele texto (a pessoa pode usá-la como
// critério), então nunca é reescrita pela ordem do registro. Valor fora do
// registro é descartado.
export function normalizarPapeis(papeis) {
    const lista = Array.isArray(papeis) ? papeis : [];
    const validos = new Set(nomesPapeisPessoa());
    return lista.filter((p, i) => validos.has(p) && lista.indexOf(p) === i);
}

// Papéis que o vínculo passa a ter ao receber os pedidos: os atuais ficam, os
// pedidos entram depois, e o que conflitar com um papel anterior sai (o primeiro
// vence, então o que já estava marcado nunca perde para o pedido).
function uniaoSemConflito(atuais, pedidos) {
    const base = Array.isArray(atuais) ? atuais : [];
    const juntos = [...base, ...(pedidos || []).filter((p) => !base.includes(p))];
    return normalizarPapeis(resolverConflitosMantendoOPrimeiro(juntos).papeis);
}

// Entradas limpas: nome compactado, sem entrada vazia, e duas entradas com o
// mesmo nome (ignorando caixa e acento) viram uma só, somando os papéis.
export function normalizarEntradas(entradas) {
    const porChave = new Map();
    (Array.isArray(entradas) ? entradas : []).forEach((e) => {
        const nome = compactar(e?.nome);
        if (!nome) return;
        const chave = chaveTema(nome);
        const existente = porChave.get(chave);
        if (existente) {
            existente.papeis = normalizarPapeis([...existente.papeis, ...(e.papeis || [])]);
        } else {
            porChave.set(chave, { nome, papeis: normalizarPapeis(e.papeis) });
        }
    });
    return [...porChave.values()];
}

// Quem é o nome no cadastro. Devolve { pessoa } (achada), { nova: true } (não
// existe) ou { ambigua: true } (vários casam e nenhum tem o nome exato).
export function resolverPessoa(dbRef, nome) {
    const limpo = compactar(nome);
    const cadastro = dbRef?.pessoas || [];
    const exata = cadastro.find((p) => compactar(p.nome) === limpo);
    if (exata) return { pessoa: exata };
    const chave = chaveTema(limpo);
    const parecidas = cadastro.filter((p) => chaveTema(p.nome) === chave);
    if (parecidas.length === 1) return { pessoa: parecidas[0] };
    if (parecidas.length > 1) return { ambigua: true };
    return { nova: true };
}

function vinculoDaPessoa(item, pessoaId) {
    const lista = Array.isArray(item?.pessoas) ? item.pessoas : [];
    return lista.find((v) => mesmoId(v.pessoaId, pessoaId)) || null;
}

function copiarVinculos(lista) {
    return (Array.isArray(lista) ? lista : []).map((v) => ({
        ...v,
        papeis: Array.isArray(v.papeis) ? [...v.papeis] : [],
    }));
}

// Guarda `pessoas` de cada texto antes de mexer, para o Desfazer.
function tirarRetrato(itens) {
    return new Map(
        itens.map((item) => [
            item,
            { tinha: 'pessoas' in item, pessoas: copiarVinculos(item.pessoas) },
        ]),
    );
}

function restaurarRetrato(retrato) {
    retrato.forEach(({ tinha, pessoas }, item) => {
        if (tinha) item.pessoas = pessoas;
        else delete item.pessoas;
    });
}

// ─── Aplicar ────────────────────────────────────────────────

// O que "aplicar" faria, sem tocar em nada.
//
//   linhas[]      uma por entrada:
//     nome        o nome (o do cadastro, quando existe)
//     pessoa      a Pessoa do cadastro, ou null (nova ou ambígua)
//     nova        a Pessoa ainda não existe e será criada
//     ambigua     o nome casa com mais de uma Pessoa: a linha fica de fora
//     papeis      os papéis pedidos
//     entram      [{ item }] textos que ganham a Pessoa
//     completam   [{ item, faltam }] textos que já têm a Pessoa e ganham papéis
//     jaTinham    quantos textos já estavam como pedido
//   textos        quantos textos distintos mudam
export function planejarAplicacao(dbRef, itens, entradas) {
    const linhas = normalizarEntradas(entradas).map(({ nome, papeis }) => {
        const achada = resolverPessoa(dbRef, nome);
        const linha = {
            nome: achada.pessoa?.nome ?? nome,
            pessoa: achada.pessoa ?? null,
            nova: !!achada.nova,
            ambigua: !!achada.ambigua,
            papeis,
            entram: [],
            completam: [],
            jaTinham: 0,
        };
        if (linha.ambigua) return linha;
        itens.forEach((item) => {
            const vinculo = linha.pessoa ? vinculoDaPessoa(item, linha.pessoa.id) : null;
            if (!vinculo) {
                linha.entram.push({ item });
                return;
            }
            const atuais = Array.isArray(vinculo.papeis) ? vinculo.papeis : [];
            const faltam = uniaoSemConflito(atuais, papeis).filter((p) => !atuais.includes(p));
            if (faltam.length) linha.completam.push({ item, faltam });
            else linha.jaTinham += 1;
        });
        return linha;
    });
    const tocados = new Set();
    linhas.forEach((l) => {
        l.entram.forEach(({ item }) => tocados.add(item));
        l.completam.forEach(({ item }) => tocados.add(item));
    });
    return { linhas, textos: tocados.size };
}

// Grava o plano. Cria as Pessoas novas (uma vez cada, mesmo que a linha toque
// vários textos) e devolve { textos, pessoasCriadas, desfazer }.
export function aplicarPlanoPessoas(dbRef, plano) {
    const tocados = new Set();
    plano.linhas.forEach((l) => {
        if (l.ambigua) return;
        l.entram.forEach(({ item }) => tocados.add(item));
        l.completam.forEach(({ item }) => tocados.add(item));
    });
    const retrato = tirarRetrato([...tocados]);
    const criadas = [];

    plano.linhas.forEach((linha) => {
        if (linha.ambigua || (!linha.entram.length && !linha.completam.length)) return;
        let pessoa = linha.pessoa;
        if (!pessoa) {
            // Pessoa nova. Procura de novo antes de criar, para nunca duplicar
            // um nome que entrou no cadastro depois do plano.
            const chave = chaveTema(linha.nome);
            pessoa = (dbRef.pessoas ||= []).find((p) => chaveTema(p.nome) === chave);
            if (!pessoa) {
                pessoa = {
                    id: gerarId(),
                    nome: linha.nome,
                    grupoIds: [],
                    autorIds: [],
                    genero: '',
                    identidadeCisTrans: '',
                    corRaca: '',
                    oculto: false,
                    souEu: false,
                };
                dbRef.pessoas.push(pessoa);
                criadas.push(pessoa);
            }
        }
        linha.entram.forEach(({ item }) => {
            if (!Array.isArray(item.pessoas)) item.pessoas = [];
            const vinculo = vinculoDaPessoa(item, pessoa.id);
            if (vinculo) {
                vinculo.papeis = uniaoSemConflito(vinculo.papeis, linha.papeis);
            } else {
                item.pessoas.push({
                    pessoaId: pessoa.id,
                    papeis: uniaoSemConflito([], linha.papeis),
                });
            }
        });
        linha.completam.forEach(({ item, faltam }) => {
            const vinculo = vinculoDaPessoa(item, pessoa.id);
            if (!vinculo) return;
            vinculo.papeis = uniaoSemConflito(vinculo.papeis, faltam);
        });
    });

    return {
        textos: tocados.size,
        pessoasCriadas: criadas.map((p) => p.nome),
        desfazer() {
            restaurarRetrato(retrato);
            const ids = new Set(criadas.map((p) => String(p.id)));
            if (ids.size) dbRef.pessoas = dbRef.pessoas.filter((p) => !ids.has(String(p.id)));
        },
    };
}

// ─── Remover ────────────────────────────────────────────────

// O que "remover" faria, sem tocar em nada.
//
//   linhas[]      uma por entrada:
//     nome        o nome (o do cadastro, quando existe)
//     pessoa      a Pessoa do cadastro, ou null
//     desconhecida  o nome não existe no cadastro (nada a remover)
//     ambigua     o nome casa com mais de uma Pessoa: fica de fora
//     papeis      os papéis a tirar; vazio quer dizer "tirar a Pessoa"
//     modo        'papeis' ou 'pessoa'
//     alterar     [{ item, tirar }] textos que mudam; `tirar` são os papéis que
//                 saem (modo 'papeis') ou null (modo 'pessoa')
//     naoTinham   quantos textos não tinham o que sair
//   textos        quantos textos distintos mudam
export function planejarRemocao(dbRef, itens, entradas) {
    const linhas = normalizarEntradas(entradas).map(({ nome, papeis }) => {
        const achada = resolverPessoa(dbRef, nome);
        const linha = {
            nome: achada.pessoa?.nome ?? nome,
            pessoa: achada.pessoa ?? null,
            desconhecida: !!achada.nova,
            ambigua: !!achada.ambigua,
            papeis,
            modo: papeis.length ? 'papeis' : 'pessoa',
            alterar: [],
            naoTinham: 0,
        };
        if (!linha.pessoa) return linha;
        itens.forEach((item) => {
            const vinculo = vinculoDaPessoa(item, linha.pessoa.id);
            if (!vinculo) {
                linha.naoTinham += 1;
                return;
            }
            if (linha.modo === 'pessoa') {
                linha.alterar.push({ item, tirar: null });
                return;
            }
            const atuais = Array.isArray(vinculo.papeis) ? vinculo.papeis : [];
            const tirar = papeis.filter((p) => atuais.includes(p));
            if (tirar.length) linha.alterar.push({ item, tirar });
            else linha.naoTinham += 1;
        });
        return linha;
    });
    const tocados = new Set();
    linhas.forEach((l) => l.alterar.forEach(({ item }) => tocados.add(item)));
    return { linhas, textos: tocados.size };
}

// Grava a remoção. Devolve { textos, desfazer }. O cadastro de Pessoas nunca é
// apagado aqui.
export function aplicarRemocaoPessoas(plano) {
    const tocados = new Set();
    plano.linhas.forEach((l) => l.alterar.forEach(({ item }) => tocados.add(item)));
    const retrato = tirarRetrato([...tocados]);

    plano.linhas.forEach((linha) => {
        if (!linha.pessoa) return;
        linha.alterar.forEach(({ item, tirar }) => {
            if (!Array.isArray(item.pessoas)) return;
            if (linha.modo === 'pessoa') {
                item.pessoas = item.pessoas.filter((v) => !mesmoId(v.pessoaId, linha.pessoa.id));
                return;
            }
            const vinculo = vinculoDaPessoa(item, linha.pessoa.id);
            if (!vinculo) return;
            vinculo.papeis = (vinculo.papeis || []).filter((p) => !tirar.includes(p));
        });
    });

    return {
        textos: tocados.size,
        desfazer() {
            restaurarRetrato(retrato);
        },
    };
}

// ─── Resumos para a confirmação ─────────────────────────────

// Contagens do plano de aplicar, para a tela montar a frase da confirmação.
//   textos      quantos textos distintos mudam
//   novas       nomes de Pessoas que serão criadas
//   ambiguas    nomes que casam com mais de uma Pessoa (ficam de fora)
//   semEfeito   nomes que não mudam nenhum texto (todos já estavam assim)
//   jaTinham    soma dos textos que já estavam como pedido
//   linhas      [{ nome, papeis, nova, entram, completam, jaTinham }] das linhas
//               que valem (as ambíguas não entram)
export function resumirAplicacao(plano) {
    const validas = plano.linhas.filter((l) => !l.ambigua);
    return {
        textos: plano.textos,
        novas: validas.filter((l) => l.nova && l.entram.length).map((l) => l.nome),
        ambiguas: plano.linhas.filter((l) => l.ambigua).map((l) => l.nome),
        semEfeito: validas
            .filter((l) => !l.entram.length && !l.completam.length)
            .map((l) => l.nome),
        jaTinham: validas.reduce((t, l) => t + l.jaTinham, 0),
        linhas: validas.map((l) => ({
            nome: l.nome,
            papeis: l.papeis,
            nova: l.nova,
            entram: l.entram.length,
            completam: l.completam.length,
            jaTinham: l.jaTinham,
        })),
    };
}

// Contagens do plano de remover.
//   textos         quantos textos distintos mudam
//   desconhecidas  nomes que não estão no cadastro (nada a remover)
//   ambiguas       nomes que casam com mais de uma Pessoa
//   semEfeito      nomes que não estavam em nenhum dos textos
//   linhas         [{ nome, modo, papeis, alterar, naoTinham }] das que mudam algo
export function resumirRemocao(plano) {
    const comPessoa = plano.linhas.filter((l) => l.pessoa);
    return {
        textos: plano.textos,
        desconhecidas: plano.linhas.filter((l) => l.desconhecida).map((l) => l.nome),
        ambiguas: plano.linhas.filter((l) => l.ambigua).map((l) => l.nome),
        semEfeito: comPessoa.filter((l) => !l.alterar.length).map((l) => l.nome),
        linhas: comPessoa
            .filter((l) => l.alterar.length)
            .map((l) => ({
                nome: l.nome,
                modo: l.modo,
                papeis: l.papeis,
                alterar: l.alterar.length,
                naoTinham: l.naoTinham,
            })),
    };
}
