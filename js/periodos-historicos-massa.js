// ============================================================
// periodos-historicos-massa.js: lógica pura (sem DOM) da edição em massa
// da aba Período Histórico: acrescentar ou remover Esfera, Categoria,
// Região, "Faz parte de" (período pai) e Marca de evento em vários períodos
// de uma vez.
//
// Mesmas regras da edição em massa do Período Biográfico
// (periodo-biografico-massa.js):
//   - Só acrescentar e remover. Não existe "substituir": o que cada período
//     já tem nunca é apagado por um acrescentar.
//   - Acrescentar não duplica (quem já tem fica como está e é contado à
//     parte). Remover tira só aquele valor e ignora quem não o tem.
//   - Faz parte de: acrescentar põe o período escolhido no fim da lista de
//     pais (só vira o principal se o período não tinha pai); remover tira só
//     aquele pai. Valem as regras do modal: um período não pode ser pai de si
//     mesmo nem de quem está dentro dele (ciclo). Quem não cabe é pulado e
//     devolvido em `recusados`, com o motivo; os demais entram (nunca é tudo
//     ou nada). Datas fora do intervalo do pai NÃO recusam (o modal só avisa,
//     porque o recorte costuma ser aproximado): vêm em `foraDoPai`.
//   - Marca de evento: acrescentar marca (`evento: true`), remover apaga o
//     campo. Sem valor para escolher.
//   - Desfazer: cada período alterado guarda o estado anterior dos campos;
//     restaurar devolve exatamente isso (campo ausente volta ausente).
//     Esfera e Categoria novas que entraram no vocabulário ficam lá (apagar
//     só em "Gerenciar").
//
// A tela (barra, confirmação) fica em periodos-historicos-acoes.js.
// ============================================================

import { chaveValor, normalizarLista } from './periodo-biografico-campos.js';
import { registrarValoresNovosPeriodoHistorico } from './periodos-historicos-campos.js';
import { criaCicloPeriodo, paisQueNaoContem } from './periodos-historicos-hierarquia.js';
import { lugaresDaRegiao, normalizarRegiao } from './regiao.js';
import { aplicarCadaValor, valoresDaOperacao } from './massa-valores.js';

export const CAMPOS_MASSA_PERIODO_HISTORICO = [
    { chave: 'esfera', rotulo: 'Esfera' },
    { chave: 'categoria', rotulo: 'Categoria' },
    { chave: 'regiao', rotulo: 'Região' },
    { chave: 'pai', rotulo: 'Faz parte de' },
    { chave: 'evento', rotulo: 'Marca de evento' },
];

const CAMPOS_GUARDADOS = ['esferas', 'categorias', 'regiao', 'pertenceA', 'evento'];

// Cópia profunda que preserva `null` (o pai de uma corrente de topo é null, não []).
const copia = (valor) => JSON.parse(JSON.stringify(valor));

function estadoDe(periodo) {
    const saida = {};
    CAMPOS_GUARDADOS.forEach((campo) => {
        // Campo ausente fica ausente (undefined): restaurar não inventa `[]`.
        saida[campo] = periodo[campo] === undefined ? undefined : copia(periodo[campo]);
    });
    return saida;
}

// Devolve a mensagem do problema ou null se a operação está completa.
export function validarOperacaoPeriodoHistorico(op) {
    if (!op || !['adicionar', 'remover'].includes(op.acao))
        return 'Escolha acrescentar ou remover.';
    if (op.campo === 'esfera' || op.campo === 'categoria' || op.campo === 'regiao') {
        return valoresDaOperacao(op).length ? null : 'Digite o valor.';
    }
    if (op.campo === 'pai') return op.paiId ? null : 'Escolha o período pai.';
    if (op.campo === 'evento') return null;
    return 'Escolha o campo.';
}

// Trata um período para a operação de pai. Devolve `true` se mudou, `false`
// se nada havia a fazer (já era filho dele / não era) e `{ recusa }` quando o
// período não pode ficar dentro do pai escolhido ('proprio' ou 'ciclo').
function aplicarPaiNoPeriodo(dbRef, periodo, op) {
    const paiId = Number(op.paiId);
    const atual = Array.isArray(periodo.pertenceA) ? periodo.pertenceA : [];
    const tem = atual.some((x) => x == paiId);
    if (op.acao === 'remover') {
        if (!tem) return false;
        periodo.pertenceA = atual.filter((x) => x != paiId);
        return true;
    }
    if (tem) return false;
    if (periodo.id == paiId) return { recusa: 'proprio' };
    // Lê a hierarquia no estado de agora: se a seleção tem dois períodos que
    // se escolheriam como pai um do outro, o segundo é recusado como ciclo.
    if (criaCicloPeriodo(dbRef.periodosHistoricos, periodo.id, [paiId])) {
        return { recusa: 'ciclo' };
    }
    periodo.pertenceA = [...atual, paiId];
    return true;
}

function aplicarNoPeriodo(dbRef, periodo, op) {
    const adicionar = op.acao === 'adicionar';

    if (op.campo === 'evento') {
        const ehEventoAgora = periodo.evento === true;
        if (adicionar === ehEventoAgora) return false;
        if (adicionar) periodo.evento = true;
        else delete periodo.evento;
        return true;
    }

    if (op.campo === 'regiao') {
        const atual = lugaresDaRegiao(periodo.regiao);
        const valor = String(op.valor).replace(/\s+/g, ' ').trim();
        const chave = valor.toLocaleLowerCase('pt-BR');
        const tem = atual.some((l) => l.toLocaleLowerCase('pt-BR') === chave);
        if (adicionar) {
            if (tem) return false;
            periodo.regiao = normalizarRegiao([...atual, valor]);
        } else {
            if (!tem) return false;
            periodo.regiao = atual.filter((l) => l.toLocaleLowerCase('pt-BR') !== chave);
        }
        return true;
    }

    // Esfera ou Categoria
    const campo = op.campo === 'esfera' ? 'esferas' : 'categorias';
    const atual = normalizarLista(periodo[campo]);
    const valor = String(op.valor).replace(/\s+/g, ' ').trim();
    const chave = chaveValor(valor);
    const tem = atual.some((v) => chaveValor(v) === chave);
    if (adicionar) {
        if (tem) return false;
        periodo[campo] = normalizarLista([...atual, valor]);
    } else {
        if (!tem) return false;
        periodo[campo] = atual.filter((v) => chaveValor(v) !== chave);
    }
    return true;
}

// Aplica a operação aos períodos de `ids`. Devolve { erro } se a operação é
// inválida; senão
//   { alterados: [{ id, antes }], iguais, recusados: [{ id, motivo }],
//     foraDoPai: [id] }
// `iguais` são os períodos em que nada mudou; `recusados` (só em "Faz parte
// de") os que não podem ficar dentro do pai escolhido; `foraDoPai` os que
// entraram, mas com datas fora do intervalo do pai (só aviso).
export function aplicarMassaPeriodosHistoricos(dbRef, ids, op) {
    const erro = validarOperacaoPeriodoHistorico(op);
    if (erro) return { erro };
    const ehPai = op.campo === 'pai';
    const ehLista = ['esfera', 'categoria', 'regiao'].includes(op.campo);
    if (ehPai && !(dbRef.periodosHistoricos || []).some((p) => p.id == op.paiId)) {
        return { erro: 'O período pai escolhido não existe mais.' };
    }
    const conjunto = new Set(ids.map(String));
    const alterados = [];
    const recusados = [];
    const foraDoPai = [];
    let iguais = 0;
    (dbRef.periodosHistoricos || []).forEach((periodo) => {
        if (!conjunto.has(String(periodo.id))) return;
        const antes = estadoDe(periodo);
        const feito = ehPai
            ? aplicarPaiNoPeriodo(dbRef, periodo, op)
            : ehLista
              ? aplicarCadaValor(op, (um) => aplicarNoPeriodo(dbRef, periodo, um))
              : aplicarNoPeriodo(dbRef, periodo, op);
        if (feito && feito.recusa) {
            recusados.push({ id: periodo.id, motivo: feito.recusa });
        } else if (feito) {
            if (op.acao === 'adicionar') {
                registrarValoresNovosPeriodoHistorico(dbRef, periodo);
                if (ehPai && paisQueNaoContem(dbRef.periodosHistoricos, periodo, [op.paiId]).length)
                    foraDoPai.push(periodo.id);
            }
            alterados.push({ id: periodo.id, antes });
        } else {
            iguais++;
        }
    });
    return { alterados, iguais, recusados, foraDoPai };
}

// Devolve cada período alterado ao estado de antes (busca pelo id de novo,
// não por referência: o período pode ter sido editado ou apagado depois).
export function restaurarMassaPeriodosHistoricos(dbRef, alterados) {
    let restaurados = 0;
    alterados.forEach(({ id, antes }) => {
        const periodo = (dbRef.periodosHistoricos || []).find((p) => p.id == id);
        if (!periodo) return;
        CAMPOS_GUARDADOS.forEach((campo) => {
            if (antes[campo] === undefined) delete periodo[campo];
            else periodo[campo] = copia(antes[campo]);
        });
        restaurados++;
    });
    return restaurados;
}
