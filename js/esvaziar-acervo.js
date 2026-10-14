// Lógica pura de "Esvaziar o acervo" (Fase 13, etapa 13a).
//
// Sem DOM, sem localStorage, sem IndexedDB: recebe o `db` e as caixas marcadas,
// devolve o resumo (contagens) e aplica o apagar sobre o próprio `db`. Quem
// grava no navegador, baixa o backup e recarrega a página são as etapas 13b e 13c.
//
// Caixas (F13-D1):
//   dados        tudo que é da pessoa: textos, livros, cadastros criados por ela,
//                capas e Versões Alternativas (F13-D7)
//   preferencias chaves do localStorage com o prefixo do app que são preferência
//   preProntos   Períodos históricos, Movimentos/Escolas e Templates de estrutura
//                de fábrica (F13-D8)
//
// Por que apagar pré-prontos não é só limpar o array: os de fábrica e os criados
// pela pessoa moram no mesmo array, separados pelo campo `embutido`, e a migração
// aditiva (`migrar*Embutidos`, em db.js) recoloca no próximo carregamento tudo o que
// faltar e não estiver na lista de ocultos. Por isso:
//   - apagar de fábrica = tirar do array E registrar o nome em `*Ocultos`;
//   - apagar Dados mantendo os pré-prontos = tirar só os criados pela pessoa, zerar
//     os ocultos e deixar a migração completar o que faltar (resultado de
//     instalação nova, F13 "Regras que o desenho precisa respeitar").

import {
    CATEGORIAS,
    chavesDbDe,
    chavesLocalStorageDe,
    classificarChaveLocalStorage,
    BANCOS_INDEXEDDB,
    CHAVE_ACERVO,
} from './inventario-armazenamento.js';
import {
    migrarPeriodosHistoricosEmbutidos,
    migrarMovimentosEscolasEmbutidos,
    migrarTemplatesEstruturaEmbutidos,
} from './db.js';
import { periodosHistoricosIdsDoItem } from './utils.js';

// Os três cadastros de fábrica: coleção no db, lista de ocultos e a função que
// recoloca o que faltar (a mesma que roda no carregamento).
const PRE_PRONTOS = Object.freeze([
    {
        colecao: 'periodosHistoricos',
        ocultos: 'periodosHistoricosOcultos',
        migrar: migrarPeriodosHistoricosEmbutidos,
        rotulo: 'períodos históricos',
    },
    {
        colecao: 'movimentosEscolas',
        ocultos: 'movimentosEscolasOcultos',
        migrar: migrarMovimentosEscolasEmbutidos,
        rotulo: 'movimentos e escolas',
    },
    {
        colecao: 'templatesEstrutura',
        ocultos: 'templatesEstruturaOcultos',
        migrar: migrarTemplatesEstruturaEmbutidos,
        rotulo: 'templates de estrutura',
    },
]);

export const ROTULOS_DADOS = Object.freeze({
    livros: 'livros',
    partes: 'partes',
    secoes: 'seções',
    poemas: 'poemas',
    prosas: 'prosas',
    elementos: 'elementos',
    coletaneas: 'coletâneas (formato antigo)',
    itensColetanea: 'itens de coletânea',
    pessoas: 'pessoas',
    grupos: 'grupos',
    autores: 'autores',
    epocas: 'períodos biográficos',
    opcoesPeriodoBiografico: 'opções de esfera e vínculo',
    assuntos: 'assuntos',
    temas: 'temas',
    locais: 'locais',
    personagens: 'personagens',
    ecosIgnorados: 'pares de ecos ignorados',
    escansoes: 'escansões',
    estruturasTextuais: 'estruturas textuais',
    moldes: 'moldes',
    padroesColunas: 'padrões de colunas',
});

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);
const lista = (valor) => (Array.isArray(valor) ? valor : []);

export function normalizarCaixas(caixas) {
    return {
        dados: caixas?.dados === true,
        preferencias: caixas?.preferencias === true,
        preProntos: caixas?.preProntos === true,
    };
}

// Nomes de fábrica de cada cadastro, obtidos pela própria migração aplicada a uma
// lista vazia: assim nunca divergem do seed real de db.js.
let _nomesDeFabrica = null;
function nomesDeFabrica() {
    if (_nomesDeFabrica) return _nomesDeFabrica;
    _nomesDeFabrica = {};
    for (const { colecao, migrar } of PRE_PRONTOS) {
        const vazia = [];
        migrar(vazia, []);
        _nomesDeFabrica[colecao] = vazia.map((item) => item.nome);
    }
    return _nomesDeFabrica;
}

const ehDeFabrica = (item) => item?.embutido === true;

// Decide, para cada cadastro pré-pronto, o que sai e o que fica. É a única fonte
// da decisão: o resumo e o apagar leem este mesmo plano, então nunca divergem.
//
// Regras (F13-D2):
//   - Dados e Pré-prontos juntos: sai tudo.
//   - Só Dados: saem os criados pela pessoa; os de fábrica ficam.
//   - Só Pré-prontos: saem os de fábrica que nenhum texto usa. Fica o de fábrica
//     usado por texto (e, em Movimento/Escola, por autor), e o de fábrica que é pai
//     de um movimento que fica, para não soltar a hierarquia.
function planejarPreProntos(db, c) {
    const textos = [...lista(db.poemas), ...lista(db.prosas)];
    const plano = {};

    for (const { colecao } of PRE_PRONTOS) {
        const itens = lista(db[colecao]);
        const remover = new Set();
        const info = {
            remover,
            propriosRemovidos: 0,
            fabricaRemovidos: 0,
            mantidosPorUso: 0,
            mantidosPorHierarquia: 0,
        };

        if (c.dados) {
            for (const item of itens) {
                if (!ehDeFabrica(item)) {
                    remover.add(item);
                    info.propriosRemovidos++;
                }
            }
        }

        if (c.preProntos) {
            const fabrica = itens.filter(ehDeFabrica);
            if (c.dados) {
                fabrica.forEach((item) => remover.add(item));
                info.fabricaRemovidos = fabrica.length;
            } else {
                const emUso = new Set();
                if (colecao === 'periodosHistoricos') {
                    for (const f of fabrica) {
                        if (
                            textos.some((t) =>
                                periodosHistoricosIdsDoItem(t).some((x) => mesmoId(x, f.id)),
                            )
                        )
                            emUso.add(f);
                    }
                } else if (colecao === 'movimentosEscolas') {
                    const referenciantes = [...textos, ...lista(db.autores)];
                    for (const f of fabrica) {
                        const usado = referenciantes.some((r) =>
                            lista(r.movimentosEscolasIds).some((id) => mesmoId(id, f.id)),
                        );
                        if (usado) emUso.add(f);
                    }
                }
                // Templates: nenhum registro aponta para template (aplicar template só
                // instancia cópias), então nenhum fica por uso.

                const porHierarquia = new Set();
                if (colecao === 'movimentosEscolas') {
                    let mudou = true;
                    while (mudou) {
                        mudou = false;
                        for (const m of itens) {
                            const fica = !ehDeFabrica(m) || emUso.has(m) || porHierarquia.has(m);
                            if (!fica || m.paiId == null) continue;
                            const pai = itens.find((x) => mesmoId(x.id, m.paiId));
                            if (
                                pai &&
                                ehDeFabrica(pai) &&
                                !emUso.has(pai) &&
                                !porHierarquia.has(pai)
                            ) {
                                porHierarquia.add(pai);
                                mudou = true;
                            }
                        }
                    }
                }

                for (const f of fabrica) {
                    if (!emUso.has(f) && !porHierarquia.has(f)) remover.add(f);
                }
                info.fabricaRemovidos = fabrica.length - emUso.size - porHierarquia.size;
                info.mantidosPorUso = emUso.size;
                info.mantidosPorHierarquia = porHierarquia.size;
            }
        }

        plano[colecao] = info;
    }
    return plano;
}

function contarDado(db, chave) {
    const valor = db[chave];
    if (Array.isArray(valor)) return valor.length;
    if (valor && typeof valor === 'object') return Object.keys(valor).length;
    return 0;
}

// Resumo do que o apagar fará, para o modal (13b). `externos` traz o que o `db`
// não enxerga: `capas` (quantidade no IndexedDB), `versoesFiltradas` (quantidade
// no localStorage, ver contarVersoesFiltradas) e `preferencias` (quantidade de chaves
// de preferência no navegador).
export function resumirEsvaziamento(db, caixas, externos = {}) {
    const c = normalizarCaixas(caixas);
    const plano = planejarPreProntos(db, c);
    const capas = Number(externos.capas) || 0;
    const versoesFiltradas = Number(externos.versoesFiltradas) || 0;
    const preferencias = Number(externos.preferencias) || 0;

    const resumo = {
        caixas: c,
        vazio: !c.dados && !c.preferencias && !c.preProntos,
        dados: null,
        preferencias: c.preferencias ? { apaga: true } : null,
        preProntos: null,
        // F13-D6: backup obrigatório quando Dados for apagado.
        // `acervo`: o JSON do acervo só faz sentido quando o db muda.
        // `incluiExtras`: o arquivo de extras (Versões Alternativas e preferências, que
        // o JSON do acervo não leva) entra quando o apagar levaria algo que ele guarda:
        // versões, com Dados, ou preferências, com Preferências.
        backup: {
            obrigatorio: c.dados,
            acervo: c.dados || c.preProntos,
            incluiExtras: (c.dados && versoesFiltradas > 0) || (c.preferencias && preferencias > 0),
        },
        // F13-D5: os retratos automáticos nunca são apagados.
        retratosFicam: true,
    };

    if (c.dados) {
        const itens = chavesDbDe(CATEGORIAS.DADO)
            .map((chave) => ({
                chave,
                rotulo: ROTULOS_DADOS[chave] || chave,
                quantidade: contarDado(db, chave),
            }))
            .filter((i) => i.quantidade > 0);
        resumo.dados = {
            itens,
            cadastrosProprios: {
                periodosHistoricos: plano.periodosHistoricos.propriosRemovidos,
                movimentosEscolas: plano.movimentosEscolas.propriosRemovidos,
                templatesEstrutura: plano.templatesEstrutura.propriosRemovidos,
            },
            capas,
            versoesFiltradas,
            total:
                itens.reduce((soma, i) => soma + i.quantidade, 0) +
                plano.periodosHistoricos.propriosRemovidos +
                plano.movimentosEscolas.propriosRemovidos +
                plano.templatesEstrutura.propriosRemovidos +
                capas +
                versoesFiltradas,
        };
    }

    if (c.preProntos) {
        const cadastros = {};
        for (const { colecao, rotulo } of PRE_PRONTOS) {
            const p = plano[colecao];
            cadastros[colecao] = {
                rotulo,
                apagar: p.fabricaRemovidos,
                mantidosPorUso: p.mantidosPorUso,
                mantidosPorHierarquia: p.mantidosPorHierarquia,
            };
        }
        resumo.preProntos = {
            cadastros,
            mantidos: Object.values(cadastros).reduce(
                (soma, x) => soma + x.mantidosPorUso + x.mantidosPorHierarquia,
                0,
            ),
        };
    }

    return resumo;
}

function esvaziarEmLugar(valor) {
    if (Array.isArray(valor)) valor.length = 0;
    else if (valor && typeof valor === 'object') {
        for (const k of Object.keys(valor)) delete valor[k];
    }
}

function removerEmLugar(arr, aRemover) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (aRemover.has(arr[i])) arr.splice(i, 1);
    }
}

// Aplica o apagar sobre o próprio `db` (arrays e objetos são esvaziados no lugar,
// então quem guardou uma referência vê o resultado). Não toca no navegador: a
// gravação do `db`, o IndexedDB e o localStorage são da 13c (ver planoArmazenamento).
// Devolve o resumo calculado ANTES de apagar.
export function aplicarEsvaziamento(db, caixas, externos = {}) {
    const c = normalizarCaixas(caixas);
    const resumo = resumirEsvaziamento(db, c, externos);
    const plano = planejarPreProntos(db, c);

    if (c.dados) {
        for (const chave of chavesDbDe(CATEGORIAS.DADO)) esvaziarEmLugar(db[chave]);
    }

    for (const { colecao, ocultos, migrar } of PRE_PRONTOS) {
        if (!c.dados && !c.preProntos) continue;
        if (!Array.isArray(db[colecao])) db[colecao] = [];
        if (!Array.isArray(db[ocultos])) db[ocultos] = [];

        removerEmLugar(db[colecao], plano[colecao].remover);

        if (c.preProntos) {
            // Os de fábrica que não ficaram vão para os ocultos: sem isso a migração
            // os recolocaria no próximo carregamento.
            const presentes = new Set(db[colecao].filter(ehDeFabrica).map((i) => i.nome));
            for (const nome of nomesDeFabrica()[colecao]) {
                if (!presentes.has(nome) && !db[ocultos].includes(nome)) db[ocultos].push(nome);
            }
        } else {
            // Só Dados: de fábrica ficam e voltam os que a pessoa tinha excluído
            // (acervo igual ao de uma instalação nova).
            db[ocultos].length = 0;
            migrar(db[colecao], db[ocultos]);
        }
    }

    // Movimento de fábrica que ficou mas cujo pai saiu (um pai criado pela pessoa,
    // apagado com Dados) vira corrente de topo, como na exclusão comum.
    if (Array.isArray(db.movimentosEscolas)) {
        for (const m of db.movimentosEscolas) {
            if (m.paiId != null && !db.movimentosEscolas.some((x) => mesmoId(x.id, m.paiId))) {
                m.paiId = null;
                m.divisao = '';
                m.generoDivisao = '';
            }
        }
    }

    return resumo;
}

// O que remover fora do `db`, por caixa. `chavesLocalStorage` é a lista de chaves
// presentes no navegador (Object.keys(localStorage)). Chave sem classificação no
// inventário nunca entra: o que ninguém classificou não se apaga.
//
// A chave do acervo (`arquivoPoetico_v3`) não aparece em `localStorageRemover`:
// apagar a chave faria o app se ver como instalação nova no próximo carregamento e
// semear de novo os Assuntos e Temas de exemplo. A 13c regrava o `db` já esvaziado
// (`regravarAcervo`). Ver F13-D9.
export function planoArmazenamento(caixas, chavesLocalStorage = []) {
    const c = normalizarCaixas(caixas);
    const presentes = lista(chavesLocalStorage);
    const remover = new Set();

    if (c.dados) {
        for (const chave of chavesLocalStorageDe(CATEGORIAS.DADO)) {
            if (chave !== CHAVE_ACERVO && presentes.includes(chave)) remover.add(chave);
        }
        // F13-D5: o registro do último backup só muda se Dados for apagado.
        for (const chave of chavesLocalStorageDe(CATEGORIAS.ESTADO)) {
            if (presentes.includes(chave)) remover.add(chave);
        }
    }
    if (c.preferencias) {
        for (const chave of presentes) {
            if (classificarChaveLocalStorage(chave) === CATEGORIAS.PREFERENCIA) remover.add(chave);
        }
    }

    return {
        localStorageRemover: [...remover].sort(),
        regravarAcervo: c.dados || c.preProntos,
        indexedDBLimpar: c.dados
            ? BANCOS_INDEXEDDB.filter((b) => b.categoria === CATEGORIAS.DADO).map((b) => b.nome)
            : [],
    };
}

// Versões Alternativas (F13-D7). O banco é um objeto { "tipo:id" -> versão }; quem
// as guarda para o backup é o arquivo de extras (extras-backup.js).
export function contarVersoesFiltradas(texto) {
    try {
        const banco = JSON.parse(texto);
        if (!banco || typeof banco !== 'object' || Array.isArray(banco)) return 0;
        return Object.keys(banco).length;
    } catch {
        return 0;
    }
}
