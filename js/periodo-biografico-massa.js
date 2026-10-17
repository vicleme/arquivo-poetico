// ============================================================
// periodo-biografico-massa.js — Lógica pura (sem DOM) da edição em massa
// da aba Período Biográfico: acrescentar ou remover Esfera, Categoria,
// Pessoa envolvida e Relação em vários períodos de uma vez.
//
// Regras combinadas com o Victor (12/10/2026):
//   - Só acrescentar e remover. Não existe "substituir": o que cada período
//     já tem nunca é apagado por um acrescentar.
//   - Esfera e Categoria aceitam vários valores por operação (`valores`, as
//     etiquetas da barra; ver massa-valores.js): cada valor entra como se
//     fosse aplicado sozinho e o Desfazer devolve todos de uma vez.
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
//   - Marca de evento (F14-D3): acrescentar marca os períodos como evento
//     (`evento: true`) e remover tira a marca (apaga o campo). Sem valor para
//     escolher; quem já estava como se quer fica em `iguais`. Desfazer devolve
//     o campo como estava, ausente inclusive.
//   - Faz parte de (pai em comum): acrescentar põe o período escolhido como
//     pai (no fim da lista de pais: só vira o principal se o período não
//     tinha pai) e remover tira só aquele pai. As regras do modal valem para
//     cada período da seleção, um a um: não pode ser o próprio pai, nem pai de
//     quem está dentro dele (ciclo), tem de ser do mesmo autor e as datas
//     precisam se sobrepor. Quem não cabe é pulado e devolvido em `recusados`
//     com o motivo; os demais entram (nunca é tudo ou nada). Remover não
//     confere regra nenhuma (tirar um pai nunca invalida nada).
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
import { criaCicloPeriodo, paisInvalidosParaOFilho } from './periodos-biograficos-hierarquia.js';
import { aplicarCadaValor, valoresDaOperacao } from './massa-valores.js';

export const CAMPOS_MASSA_PERIODO_BIOGRAFICO = [
    { chave: 'esfera', rotulo: 'Esfera' },
    { chave: 'categoria', rotulo: 'Categoria' },
    { chave: 'pessoa', rotulo: 'Pessoa envolvida' },
    { chave: 'relacao', rotulo: 'Relação' },
    { chave: 'pai', rotulo: 'Faz parte de' },
    { chave: 'evento', rotulo: 'Marca de evento' },
];

const CAMPOS_GUARDADOS = [
    'esferas',
    'categorias',
    'pessoasEnvolvidas',
    'relacoes',
    'pertenceA',
    'evento',
];

const copia = (valor) => JSON.parse(JSON.stringify(valor ?? []));

function estadoDe(epoca) {
    const saida = {};
    CAMPOS_GUARDADOS.forEach((campo) => {
        // Campo ausente fica ausente (undefined): restaurar não inventa `[]`.
        saida[campo] = epoca[campo] === undefined ? undefined : copia(epoca[campo]);
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
        return valoresDaOperacao(op).length ? null : 'Digite o valor.';
    }
    if (op.campo === 'pessoa') return op.pessoaId ? null : 'Escolha a pessoa.';
    if (op.campo === 'pai') return op.paiId ? null : 'Escolha o período pai.';
    if (op.campo === 'evento') return null;
    if (op.campo === 'relacao') {
        if (!op.de || !op.para) return 'Escolha as duas pontas da relação.';
        if (String(op.de) === String(op.para)) return 'As duas pontas precisam ser diferentes.';
        if (!String(op.natureza ?? '').trim() && !String(op.vinculo ?? '').trim())
            return 'Escolha a Natureza ou digite o vínculo.';
        return null;
    }
    return 'Escolha o campo.';
}

// ─── Faz parte de ────────────────────────────────────────────────────────

// Trata um período para a operação de pai. Devolve `true` se mudou, `false`
// se nada havia a fazer (já era filho dele / não era) e `{ recusa }` quando o
// período não pode ficar dentro do pai escolhido (motivo: 'proprio', 'ciclo',
// 'autor', 'depois' ou 'antes' — os dois últimos do ponto de vista do
// período: começa depois do fim do pai / termina antes do começo dele).
function aplicarPaiNoPeriodo(dbRef, epoca, op) {
    const paiId = Number(op.paiId);
    const atual = Array.isArray(epoca.pertenceA) ? epoca.pertenceA : [];
    const tem = atual.some((x) => x == paiId);
    if (op.acao === 'remover') {
        if (!tem) return false;
        epoca.pertenceA = atual.filter((x) => x != paiId);
        return true;
    }
    if (tem) return false;
    if (epoca.id == paiId) return { recusa: 'proprio' };
    // Lê a hierarquia no estado de agora: se a seleção tem dois períodos que
    // se escolheriam como pai um do outro, o segundo é recusado como ciclo.
    if (criaCicloPeriodo(dbRef.epocas, epoca.id, [paiId])) return { recusa: 'ciclo' };
    const [problema] = paisInvalidosParaOFilho(dbRef.epocas, epoca, [paiId]);
    if (problema) return { recusa: problema.motivo };
    epoca.pertenceA = [...atual, paiId];
    return true;
}

// ─── Aplicar em um período ───────────────────────────────────────────────

function aplicarNoPeriodo(dbRef, epoca, op) {
    const adicionar = op.acao === 'adicionar';

    if (op.campo === 'evento') {
        const ehEventoAgora = epoca.evento === true;
        if (adicionar === ehEventoAgora) return false;
        if (adicionar) epoca.evento = true;
        else delete epoca.evento;
        return true;
    }

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
// { alterados: [{ id, antes }], iguais, recusados: [{ id, motivo }] } —
// `iguais` são os períodos em que nada mudou (já tinham o valor, ou não o
// tinham para remover) e `recusados` (só em "Faz parte de") os que não podem
// ficar dentro do pai escolhido, com o motivo (ver aplicarPaiNoPeriodo).
export function aplicarMassaPeriodosBiograficos(dbRef, ids, op) {
    const erro = validarOperacao(op);
    if (erro) return { erro };
    const ehPai = op.campo === 'pai';
    const ehLista = op.campo === 'esfera' || op.campo === 'categoria';
    if (ehPai && !(dbRef.epocas || []).some((e) => e.id == op.paiId)) {
        return { erro: 'O período pai escolhido não existe mais.' };
    }
    const conjunto = new Set(ids.map(String));
    const alterados = [];
    const recusados = [];
    let iguais = 0;
    (dbRef.epocas || []).forEach((epoca) => {
        if (!conjunto.has(String(epoca.id))) return;
        const antes = estadoDe(epoca);
        const feito = ehPai
            ? aplicarPaiNoPeriodo(dbRef, epoca, op)
            : ehLista
              ? aplicarCadaValor(op, (um) => aplicarNoPeriodo(dbRef, epoca, um))
              : aplicarNoPeriodo(dbRef, epoca, op);
        if (feito && feito.recusa) {
            recusados.push({ id: epoca.id, motivo: feito.recusa });
        } else if (feito) {
            if (op.acao === 'adicionar') registrarValoresNovos(dbRef, epoca);
            alterados.push({ id: epoca.id, antes });
        } else {
            iguais++;
        }
    });
    return { alterados, iguais, recusados };
}

// Devolve cada período alterado ao estado de antes (busca pelo id de novo,
// não por referência: o período pode ter sido editado ou apagado depois).
export function restaurarMassaPeriodosBiograficos(dbRef, alterados) {
    let restaurados = 0;
    alterados.forEach(({ id, antes }) => {
        const epoca = (dbRef.epocas || []).find((e) => e.id == id);
        if (!epoca) return;
        CAMPOS_GUARDADOS.forEach((campo) => {
            if (antes[campo] === undefined) delete epoca[campo];
            else epoca[campo] = copia(antes[campo]);
        });
        restaurados++;
    });
    return restaurados;
}
