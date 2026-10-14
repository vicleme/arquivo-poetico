// ============================================================
// periodo-biografico-massa.js — Lógica pura (sem DOM) da edição em massa
// da aba Período Biográfico: acrescentar ou remover Esfera, Categoria,
// Pessoa envolvida e Relação em vários períodos de uma vez.
//
// Regras combinadas com o Victor (12/10/2026):
//   - Só acrescentar e remover. Não existe "substituir": o que cada período
//     já tem nunca é apagado por um acrescentar.
//   - Acrescentar não duplica (quem já tem fica como está e é contado à
//     parte). Remover tira só aquele valor e ignora quem não o tem.
//   - Relação: cada ponta é uma Pessoa do cadastro ou `AUTOR`, que vale, em
//     cada período, para o autor DELE. Por isso a tela avisa quando a
//     seleção mistura autores (ver autoresDaSelecao). A relação leva a
//     Natureza e/ou o Vínculo (pelo menos um dos dois). Duas relações são
//     iguais se têm as mesmas pontas, a mesma Natureza e o mesmo Vínculo.
//   - Acrescentar uma relação põe as pessoas dela entre as envolvidas.
//     Remover uma relação não tira ninguém das envolvidas (como no modal).
//   - Remover uma Pessoa tira também as relações dela (como no modal).
//   - "Desfazer": cada período alterado guarda o estado anterior dos quatro
//     campos; restaurar devolve exatamente isso. Esfera, Natureza e Vínculo
//     novos que entraram no vocabulário ficam lá (apagar só em "Esferas,
//     naturezas e vínculos").
//
// A tela (barra, painel, confirmação) fica em epocas-acoes.js.
// ============================================================

import {
    AUTOR,
    acharRotuloVinculo,
    chaveTipoVinculo,
    chaveValor,
    normalizarEnvolvidosDoPeriodo,
    normalizarLista,
    registrarValoresNovos,
} from './periodo-biografico-campos.js';

export const CAMPOS_MASSA_PERIODO_BIOGRAFICO = [
    { chave: 'esfera', rotulo: 'Esfera' },
    { chave: 'categoria', rotulo: 'Categoria' },
    { chave: 'pessoa', rotulo: 'Pessoa envolvida' },
    { chave: 'relacao', rotulo: 'Relação' },
];

const CAMPOS_GUARDADOS = ['esferas', 'categorias', 'pessoasEnvolvidas', 'relacoes'];

const copia = (valor) => JSON.parse(JSON.stringify(valor ?? []));

function estadoDe(epoca) {
    const saida = {};
    CAMPOS_GUARDADOS.forEach((campo) => {
        saida[campo] = copia(epoca[campo]);
    });
    return saida;
}

// Autores distintos (nome) entre os períodos da seleção. Usado para avisar
// quando "Autor do período" vale para mais de um autor.
export function autoresDaSelecao(dbRef, ids) {
    const conjunto = new Set(ids.map(String));
    const vistos = new Map();
    (dbRef.epocas || []).forEach((ep) => {
        if (!conjunto.has(String(ep.id))) return;
        const autor = (dbRef.autores || []).find((a) => a.id == ep.autorId);
        vistos.set(String(ep.autorId), autor?.nome || 'Autor sem cadastro');
    });
    return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function operacaoUsaAutor(op) {
    return op?.campo === 'relacao' && (op.de === AUTOR || op.para === AUTOR);
}

// ─── Comparar relações ───────────────────────────────────────────────────
// "Ana é mãe de Eva" e "Eva é filha de Ana" são a mesma relação dita dos dois
// lados; vínculo simétrico vale nas duas ordens.

function formaCanonica(dbRef, relacao) {
    const achado = acharRotuloVinculo(dbRef, relacao.vinculo);
    const tipo = chaveTipoVinculo(dbRef, relacao.vinculo);
    const natureza = chaveValor(relacao.natureza);
    if (achado?.rotulo.inverso) {
        const [a, b] =
            achado.lado === 'direto' ? [relacao.de, relacao.para] : [relacao.para, relacao.de];
        return `${natureza}#${tipo}|${a}>${b}`;
    }
    const [a, b] = [String(relacao.de), String(relacao.para)].sort();
    return `${natureza}#${tipo}|${a}-${b}`;
}

function mesmaRelacao(dbRef, x, y) {
    return formaCanonica(dbRef, x) === formaCanonica(dbRef, y);
}

// ─── Validação ───────────────────────────────────────────────────────────

// Devolve a mensagem do problema ou null se a operação está completa.
export function validarOperacao(op) {
    if (!op || !['adicionar', 'remover'].includes(op.acao))
        return 'Escolha acrescentar ou remover.';
    if (op.campo === 'esfera' || op.campo === 'categoria') {
        return String(op.valor ?? '').trim() ? null : 'Digite o valor.';
    }
    if (op.campo === 'pessoa') return op.pessoaId ? null : 'Escolha a pessoa.';
    if (op.campo === 'relacao') {
        if (!op.de || !op.para) return 'Escolha as duas pontas da relação.';
        if (String(op.de) === String(op.para)) return 'As duas pontas precisam ser diferentes.';
        if (!String(op.natureza ?? '').trim() && !String(op.vinculo ?? '').trim())
            return 'Escolha a Natureza ou digite o vínculo.';
        return null;
    }
    return 'Escolha o campo.';
}

// ─── Aplicar em um período ───────────────────────────────────────────────

function aplicarNoPeriodo(dbRef, epoca, op) {
    const adicionar = op.acao === 'adicionar';

    if (op.campo === 'esfera' || op.campo === 'categoria') {
        const campo = op.campo === 'esfera' ? 'esferas' : 'categorias';
        const atual = normalizarLista(epoca[campo]);
        const valor = String(op.valor).replace(/\s+/g, ' ').trim();
        const chave = chaveValor(valor);
        const tem = atual.some((v) => chaveValor(v) === chave);
        if (adicionar) {
            if (tem) return false;
            epoca[campo] = normalizarLista([...atual, valor]);
        } else {
            if (!tem) return false;
            epoca[campo] = atual.filter((v) => chaveValor(v) !== chave);
        }
        return true;
    }

    const { pessoasEnvolvidas, relacoes } = normalizarEnvolvidosDoPeriodo(epoca);

    if (op.campo === 'pessoa') {
        const id = Number(op.pessoaId);
        const tem = pessoasEnvolvidas.some((e) => e.pessoaId === id);
        if (adicionar) {
            if (tem) return false;
            epoca.pessoasEnvolvidas = [...pessoasEnvolvidas, { pessoaId: id }];
            epoca.relacoes = relacoes;
        } else {
            if (!tem) return false;
            epoca.pessoasEnvolvidas = pessoasEnvolvidas.filter((e) => e.pessoaId !== id);
            epoca.relacoes = relacoes.filter((r) => r.de !== id && r.para !== id);
        }
        return true;
    }

    // relação
    const ponta = (v) => (v === AUTOR ? AUTOR : Number(v));
    const alvo = {
        de: ponta(op.de),
        para: ponta(op.para),
        natureza: String(op.natureza ?? '').trim(),
        vinculo: String(op.vinculo ?? '').trim(),
    };
    const existe = relacoes.some((r) => mesmaRelacao(dbRef, r, alvo));
    if (adicionar) {
        if (existe) return false;
        const novas = normalizarEnvolvidosDoPeriodo({
            pessoasEnvolvidas,
            relacoes: [...relacoes, alvo],
        });
        epoca.relacoes = novas.relacoes;
        epoca.pessoasEnvolvidas = novas.pessoasEnvolvidas;
    } else {
        if (!existe) return false;
        epoca.relacoes = relacoes.filter((r) => !mesmaRelacao(dbRef, r, alvo));
        epoca.pessoasEnvolvidas = pessoasEnvolvidas;
    }
    return true;
}

// Aplica a operação aos períodos de `ids`. Devolve
// { erro } se a operação é inválida; senão
// { alterados: [{ id, antes }], iguais } — `iguais` são os períodos em que
// nada mudou (já tinham o valor, ou não o tinham para remover).
export function aplicarMassaPeriodosBiograficos(dbRef, ids, op) {
    const erro = validarOperacao(op);
    if (erro) return { erro };
    const conjunto = new Set(ids.map(String));
    const alterados = [];
    let iguais = 0;
    (dbRef.epocas || []).forEach((epoca) => {
        if (!conjunto.has(String(epoca.id))) return;
        const antes = estadoDe(epoca);
        if (aplicarNoPeriodo(dbRef, epoca, op)) {
            if (op.acao === 'adicionar') registrarValoresNovos(dbRef, epoca);
            alterados.push({ id: epoca.id, antes });
        } else {
            iguais++;
        }
    });
    return { alterados, iguais };
}

// Devolve cada período alterado ao estado de antes (busca pelo id de novo,
// não por referência: o período pode ter sido editado ou apagado depois).
export function restaurarMassaPeriodosBiograficos(dbRef, alterados) {
    let restaurados = 0;
    alterados.forEach(({ id, antes }) => {
        const epoca = (dbRef.epocas || []).find((e) => e.id == id);
        if (!epoca) return;
        CAMPOS_GUARDADOS.forEach((campo) => {
            epoca[campo] = copia(antes[campo]);
        });
        restaurados++;
    });
    return restaurados;
}
