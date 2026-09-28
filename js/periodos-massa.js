// ============================================================
// periodos-massa.js — Lógica pura (sem DOM) da ação em massa
// "Períodos e movimentos" de Poemas/Prosas: vincular ou desvincular
// Movimento/Escola, Período Biográfico e Período Histórico em vários
// textos de uma vez, pra etiquetar o acervo sem abrir texto por texto.
// A tela (painel, confirmação) fica em selecao-massa.js — mesma
// divisão de campos-preenchiveis.js.
//
// Os três campos têm formas diferentes no texto, e é isso que este
// módulo esconde:
//
//   movimento          item.movimentosEscolasIds — LISTA de ids.
//                      Aplicar é aditivo (empilha o id se ainda não
//                      está), remover tira só aquele id. Não existe
//                      "substituir", como em Pessoas/Sinalizações.
//   periodoHistorico   item.periodoHistoricoId — id ÚNICO, cadastro
//                      global. Quem já tem outro período é mantido,
//                      a menos que `sobrescrever` esteja ligado
//                      (mesmo critério de "Preencher campo").
//   epoca              item.epocaRetratada.epocaId — id ÚNICO, mas a
//                      Época pertence a um Autor (epoca.autorId).
//                      Só vale pra um texto se o Autor dela consta na
//                      autoria do texto; sem Época com esse nome desse
//                      Autor, cria uma pro primeiro Autor do texto
//                      (mesmo critério do modal do Poema). Texto sem
//                      Autor é pulado. Datas, recorte e "N/A" que o
//                      texto já tinha em epocaRetratada são preservados.
//
// Cadastro citado por nome que ainda não existe é criado ao APLICAR
// (mesmo caminho de aplicarPessoaEmMassa); ao REMOVER nunca cria.
// Ids órfãos (cadastro excluído) contam como campo vazio.
// ============================================================

import {
    db,
    obterOuCriarEpocaPorNome,
    obterOuCriarPeriodoHistoricoPorNome,
    obterOuCriarMovimentoEscolaPorNome,
} from './db.js';

export const TIPOS_PERIODO_MASSA = [
    { chave: 'movimento', rotulo: 'Movimento/Escola' },
    { chave: 'epoca', rotulo: 'Período Biográfico' },
    { chave: 'periodoHistorico', rotulo: 'Período Histórico' },
];

export function rotuloTipoPeriodoMassa(tipo) {
    return TIPOS_PERIODO_MASSA.find((t) => t.chave === tipo)?.rotulo || tipo;
}

const limpar = (nome) => String(nome ?? '').trim();

// Nomes do cadastro pro autocompletar do painel (sem repetição — o
// mesmo nome de Época pode existir pra Autores diferentes).
export function nomesCadastroPeriodoMassa(tipo, dbRef = db) {
    const lista =
        tipo === 'movimento'
            ? dbRef.movimentosEscolas
            : tipo === 'epoca'
              ? dbRef.epocas
              : dbRef.periodosHistoricos;
    return [...new Set((lista || []).map((x) => x.nome).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
    );
}

// Ids de Autor válidos na autoria do texto, na ordem em que aparecem
// (o primeiro é o "dono" de uma Época nova, como no modal).
function autoresDoItem(item, dbRef) {
    return (item.autoria || [])
        .map((v) => v.autorId)
        .filter((id) => id != null && (dbRef.autores || []).some((a) => a.id == id));
}

function epocaAtual(item, dbRef) {
    const id = item.epocaRetratada?.epocaId;
    return id == null ? null : (dbRef.epocas || []).find((e) => e.id == id) || null;
}

function periodoAtual(item, dbRef) {
    const id = item.periodoHistoricoId;
    return id == null ? null : (dbRef.periodosHistoricos || []).find((p) => p.id == id) || null;
}

// O que "aplicar" faria, sem tocar em nada — a tela mostra
// "N serão alterados, M mantidos" antes de confirmar.
//
//   alterar         [{ item, alvo }] — `alvo` é { id } de um cadastro que
//                   já existe ou, só pra Época, { criarParaAutorId }
//   jaIguais        já estão com esse valor (movimento: já tem o id)
//   jaPreenchidos   têm OUTRO período e serão mantidos (só Período
//                   Biográfico/Histórico, com `sobrescrever` desligado)
//   semAutor        só Período Biográfico: texto sem Autor, não dá pra
//                   escolher nem criar a Época
//   cadastroNovo    o nome ainda não existe no cadastro (o painel avisa
//                   que será criado)
//   epocasACriar    só Período Biográfico: quantas Épocas novas o
//                   lote criaria (uma por Autor que ainda não tem uma
//                   com esse nome)
export function planejarAplicacaoPeriodo(
    tipo,
    itens,
    nome,
    { sobrescrever = false } = {},
    dbRef = db,
) {
    const alvoNome = limpar(nome);
    const plano = {
        alterar: [],
        jaIguais: 0,
        jaPreenchidos: 0,
        semAutor: 0,
        cadastroNovo: false,
        epocasACriar: 0,
    };
    if (!alvoNome) return plano;

    if (tipo === 'movimento') {
        const mov = (dbRef.movimentosEscolas || []).find((m) => m.nome === alvoNome) || null;
        plano.cadastroNovo = !mov;
        itens.forEach((item) => {
            const tem = mov && (item.movimentosEscolasIds || []).some((id) => id == mov.id);
            if (tem) plano.jaIguais++;
            else plano.alterar.push({ item, alvo: mov ? { id: mov.id } : {} });
        });
        return plano;
    }

    if (tipo === 'periodoHistorico') {
        const per = (dbRef.periodosHistoricos || []).find((p) => p.nome === alvoNome) || null;
        plano.cadastroNovo = !per;
        itens.forEach((item) => {
            const atual = periodoAtual(item, dbRef);
            if (atual && per && atual.id == per.id) plano.jaIguais++;
            else if (atual && !sobrescrever) plano.jaPreenchidos++;
            else plano.alterar.push({ item, alvo: per ? { id: per.id } : {} });
        });
        return plano;
    }

    if (tipo === 'epoca') {
        const existentes = (dbRef.epocas || []).filter((e) => e.nome === alvoNome);
        plano.cadastroNovo = existentes.length === 0;
        itens.forEach((item) => {
            const autores = autoresDoItem(item, dbRef);
            if (!autores.length) {
                plano.semAutor++;
                return;
            }
            // Prefere a Época do Autor que aparece primeiro na autoria.
            let alvo = null;
            for (const autorId of autores) {
                const ep = existentes.find((e) => e.autorId == autorId);
                if (ep) {
                    alvo = { id: ep.id };
                    break;
                }
            }
            if (!alvo) alvo = { criarParaAutorId: autores[0] };

            const atual = epocaAtual(item, dbRef);
            if (atual && alvo.id != null && atual.id == alvo.id) plano.jaIguais++;
            else if (atual && !sobrescrever) plano.jaPreenchidos++;
            else plano.alterar.push({ item, alvo });
        });
        plano.epocasACriar = new Set(
            plano.alterar.map((x) => x.alvo.criarParaAutorId).filter((id) => id != null),
        ).size;
        return plano;
    }

    throw new Error(`Tipo desconhecido em periodos-massa: ${tipo}`);
}

// Grava o plano. Cria o cadastro que faltar (uma vez só, no caso de
// Movimento/Período Histórico). Devolve quantos textos mudaram.
export function aplicarPlanoPeriodo(tipo, plano, nome) {
    const alvoNome = limpar(nome);
    if (!alvoNome || !plano.alterar.length) return 0;

    if (tipo === 'movimento') {
        const mov = obterOuCriarMovimentoEscolaPorNome(alvoNome);
        plano.alterar.forEach(({ item }) => {
            const ids = Array.isArray(item.movimentosEscolasIds) ? item.movimentosEscolasIds : [];
            if (!ids.some((id) => id == mov.id)) ids.push(mov.id);
            item.movimentosEscolasIds = ids;
        });
    } else if (tipo === 'periodoHistorico') {
        const per = obterOuCriarPeriodoHistoricoPorNome(alvoNome);
        plano.alterar.forEach(({ item }) => {
            item.periodoHistoricoId = per.id;
        });
    } else if (tipo === 'epoca') {
        plano.alterar.forEach(({ item, alvo }) => {
            const epocaId =
                alvo.id != null
                    ? alvo.id
                    : obterOuCriarEpocaPorNome(alvoNome, alvo.criarParaAutorId).id;
            // Preserva datas/recorte/N/A que o texto já tinha.
            item.epocaRetratada = {
                inicio: null,
                fim: null,
                recorte: null,
                na: false,
                ...(item.epocaRetratada || {}),
                epocaId,
            };
        });
    }
    return plano.alterar.length;
}

// O que "remover" faria: só quem hoje está vinculado a esse nome.
//   alterar   [{ item }]
//   naoTinham quantos dos selecionados não tinham o vínculo
export function planejarRemocaoPeriodo(tipo, itens, nome, dbRef = db) {
    const alvoNome = limpar(nome);
    const alterar = [];
    itens.forEach((item) => {
        if (!alvoNome) return;
        if (tipo === 'movimento') {
            const mov = (dbRef.movimentosEscolas || []).find((m) => m.nome === alvoNome);
            if (mov && (item.movimentosEscolasIds || []).some((id) => id == mov.id))
                alterar.push({ item });
        } else if (tipo === 'periodoHistorico') {
            if (periodoAtual(item, dbRef)?.nome === alvoNome) alterar.push({ item });
        } else if (tipo === 'epoca') {
            if (epocaAtual(item, dbRef)?.nome === alvoNome) alterar.push({ item });
        }
    });
    return { alterar, naoTinham: itens.length - alterar.length };
}

export function aplicarRemocaoPeriodo(tipo, plano, nome, dbRef = db) {
    const alvoNome = limpar(nome);
    if (!alvoNome) return 0;
    if (tipo === 'movimento') {
        const mov = (dbRef.movimentosEscolas || []).find((m) => m.nome === alvoNome);
        if (!mov) return 0;
        plano.alterar.forEach(({ item }) => {
            item.movimentosEscolasIds = (item.movimentosEscolasIds || []).filter(
                (id) => id != mov.id,
            );
        });
    } else if (tipo === 'periodoHistorico') {
        plano.alterar.forEach(({ item }) => {
            item.periodoHistoricoId = null;
        });
    } else if (tipo === 'epoca') {
        plano.alterar.forEach(({ item }) => {
            const er = { ...item.epocaRetratada, epocaId: null };
            // Sem Época, o formulário só guarda epocaRetratada se
            // sobrar "N/A" ou alguma data — mesmo critério aqui, pra
            // não deixar um objeto vazio pendurado no texto.
            item.epocaRetratada = er.na || er.inicio || er.fim ? er : null;
        });
    }
    return plano.alterar.length;
}
