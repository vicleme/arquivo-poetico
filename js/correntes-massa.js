// ============================================================
// correntes-massa.js: lógica pura (sem DOM) da edição em massa da aba
// Correntes literárias (`db.movimentosEscolas`).
//
// Há dois jeitos de campo, e é isso que este módulo esconde:
//
//   LISTA (Região de origem, Valores, Temas, Técnicas, Tipos de composição,
//   Lemas, Manifestos): acrescentar soma o valor sem apagar o que já está
//   (não duplica, sem diferenciar caixa nem acento); remover tira só aquele
//   valor. Quem já tinha (ou não tinha, ao remover) fica como está e é
//   contado em `iguais`.
//
//   VALOR ÚNICO (Tipo, Programa, Postura estética): "acrescentar" é DEFINIR,
//   e troca o valor que a corrente tinha; "remover" é LIMPAR e esvazia o
//   campo (não confere qual era o valor). Quem já estava como se quer fica
//   em `iguais`.
//
//   FAZ PARTE DE (pai): também de valor único. Definir põe o pai escolhido,
//   com Divisão e "Aplica-se a" opcionais (em branco mantém o que a corrente
//   já tinha). Limpar tira o pai e zera Divisão e "Aplica-se a", que só valem
//   com pai (como em sanearHierarquiaDeCorrentes). Uma corrente não pode ser
//   pai de si mesma nem de uma das suas divisões (ciclo); quem não cabe é
//   pulado e devolvido em `recusados`, com o motivo; os demais entram.
//
// Só os campos do próprio registro são lidos e gravados: o que uma divisão
// herda do pai (Tipo, Programa, Postura, Região) continua só na leitura.
//
// Desfazer: cada corrente alterada guarda o estado anterior dos campos;
// restaurar devolve exatamente isso (campo ausente volta ausente).
//
// A tela (barra, confirmação) fica em correntes-acoes.js.
// ============================================================

import { chaveValor, normalizarLista } from './periodo-biografico-campos.js';
import {
    criaCicloCorrente,
    normalizarDivisaoCorrente,
    normalizarGeneroDivisaoCorrente,
} from './correntes-hierarquia.js';
import {
    POSTURAS_ESTETICAS,
    PROGRAMAS_MOVIMENTO,
    TIPOS_MOVIMENTO_ESCOLA,
    normalizarPosturaEstetica,
    normalizarProgramaMovimento,
} from './utils.js';
import { lugaresDaRegiao, normalizarRegiao } from './regiao.js';
import { aplicarCadaValor, valoresDaOperacao } from './massa-valores.js';

// Campos de lista: chave da tela, campo gravado na corrente e rótulo.
export const CAMPOS_LISTA_CORRENTE = [
    { chave: 'regiao', campo: 'regiaoOrigem', rotulo: 'Região de origem' },
    { chave: 'valores', campo: 'valores', rotulo: 'Valores' },
    { chave: 'temas', campo: 'temas', rotulo: 'Temas' },
    { chave: 'tecnicas', campo: 'tecnicas', rotulo: 'Técnicas' },
    { chave: 'tiposComposicao', campo: 'tiposComposicao', rotulo: 'Tipos de composição' },
    { chave: 'lemas', campo: 'lemas', rotulo: 'Lemas' },
    { chave: 'manifestos', campo: 'manifestos', rotulo: 'Manifestos' },
];

// Campos de valor único e as opções válidas de cada um.
export const CAMPOS_UNICOS_CORRENTE = [
    {
        chave: 'tipo',
        campo: 'tipo',
        rotulo: 'Tipo',
        opcoes: TIPOS_MOVIMENTO_ESCOLA,
        normalizar: (v) => (TIPOS_MOVIMENTO_ESCOLA.includes(v) ? v : ''),
    },
    {
        chave: 'programa',
        campo: 'programa',
        rotulo: 'Programa',
        opcoes: PROGRAMAS_MOVIMENTO,
        normalizar: normalizarProgramaMovimento,
    },
    {
        chave: 'posturaEstetica',
        campo: 'posturaEstetica',
        rotulo: 'Postura estética',
        opcoes: POSTURAS_ESTETICAS,
        normalizar: normalizarPosturaEstetica,
    },
];

export const CAMPO_PAI_CORRENTE = { chave: 'pai', rotulo: 'Faz parte de' };

// Ordem em que os campos aparecem no seletor da barra.
export const CAMPOS_MASSA_CORRENTE = [
    ...CAMPOS_UNICOS_CORRENTE.map(({ chave, rotulo }) => ({ chave, rotulo })),
    CAMPO_PAI_CORRENTE,
    ...CAMPOS_LISTA_CORRENTE.map(({ chave, rotulo }) => ({ chave, rotulo })),
];

export const ehCampoUnicoCorrente = (chave) =>
    chave === 'pai' || CAMPOS_UNICOS_CORRENTE.some((c) => c.chave === chave);

const CAMPOS_GUARDADOS = [
    ...CAMPOS_UNICOS_CORRENTE.map((c) => c.campo),
    'paiId',
    'divisao',
    'generoDivisao',
    ...CAMPOS_LISTA_CORRENTE.map((c) => c.campo),
];

// Cópia profunda que preserva `null` (o pai de uma corrente de topo é null, não []).
const copia = (valor) => JSON.parse(JSON.stringify(valor));

function estadoDe(corrente) {
    const saida = {};
    CAMPOS_GUARDADOS.forEach((campo) => {
        // Campo ausente fica ausente (undefined): restaurar não inventa `[]`.
        saida[campo] = corrente[campo] === undefined ? undefined : copia(corrente[campo]);
    });
    return saida;
}

const limpar = (v) =>
    String(v ?? '')
        .replace(/\s+/g, ' ')
        .trim();

// Devolve a mensagem do problema ou null se a operação está completa.
export function validarOperacaoCorrente(op) {
    if (!op || !['adicionar', 'remover'].includes(op.acao)) return 'Escolha o que fazer.';
    const definir = op.acao === 'adicionar';
    const unico = CAMPOS_UNICOS_CORRENTE.find((c) => c.chave === op.campo);
    if (unico) {
        if (!definir) return null;
        return unico.normalizar(op.valor) ? null : 'Escolha o valor.';
    }
    if (op.campo === 'pai') {
        if (!definir) return null;
        return op.paiId ? null : 'Escolha a corrente pai.';
    }
    if (CAMPOS_LISTA_CORRENTE.some((c) => c.chave === op.campo)) {
        return valoresDaOperacao(op).length ? null : 'Digite o valor.';
    }
    return 'Escolha o campo.';
}

// ─── Faz parte de ────────────────────────────────────────────────────────

// Devolve `true` se mudou, `false` se nada havia a fazer e `{ recusa }`
// ('proprio' ou 'ciclo') quando a corrente não pode ficar dentro do pai.
function aplicarPaiNaCorrente(dbRef, corrente, op) {
    if (op.acao === 'remover') {
        const temAlgo =
            (corrente.paiId != null && corrente.paiId !== '') ||
            !!corrente.divisao ||
            !!corrente.generoDivisao;
        if (!temAlgo) return false;
        corrente.paiId = null;
        corrente.divisao = '';
        corrente.generoDivisao = '';
        return true;
    }
    const paiId = Number(op.paiId);
    const divisaoNova = normalizarDivisaoCorrente(op.divisao);
    const generoNovo = normalizarGeneroDivisaoCorrente(op.generoDivisao);
    const mesmoPai = corrente.paiId != null && corrente.paiId == paiId;
    // Divisão e "Aplica-se a" em branco mantêm o que a corrente já tinha (mudar
    // de pai sem dizer a Divisão não a apaga: continua sendo, por exemplo, uma
    // "Fase ou geração", só que de outro pai).
    const divisaoFinal = divisaoNova || normalizarDivisaoCorrente(corrente.divisao);
    const generoFinal = generoNovo || normalizarGeneroDivisaoCorrente(corrente.generoDivisao);
    if (
        mesmoPai &&
        divisaoFinal === normalizarDivisaoCorrente(corrente.divisao) &&
        generoFinal === normalizarGeneroDivisaoCorrente(corrente.generoDivisao)
    ) {
        return false;
    }
    if (corrente.id == paiId) return { recusa: 'proprio' };
    if (criaCicloCorrente(dbRef.movimentosEscolas, corrente.id, paiId)) {
        return { recusa: 'ciclo' };
    }
    corrente.paiId = paiId;
    corrente.divisao = divisaoFinal;
    corrente.generoDivisao = generoFinal;
    return true;
}

// ─── Aplicar em uma corrente ─────────────────────────────────────────────

function aplicarNaCorrente(corrente, op) {
    const definir = op.acao === 'adicionar';

    const unico = CAMPOS_UNICOS_CORRENTE.find((c) => c.chave === op.campo);
    if (unico) {
        const atual = unico.normalizar(corrente[unico.campo]);
        const novo = definir ? unico.normalizar(op.valor) : '';
        if (atual === novo) return false;
        corrente[unico.campo] = novo;
        return true;
    }

    // Campo de lista: cada valor das etiquetas é aplicado como se fosse sozinho.
    return aplicarCadaValor(op, (um) => aplicarUmValorDeLista(corrente, um));
}

function aplicarUmValorDeLista(corrente, op) {
    const definir = op.acao === 'adicionar';
    const lista = CAMPOS_LISTA_CORRENTE.find((c) => c.chave === op.campo);
    const valor = limpar(op.valor);
    if (lista.chave === 'regiao') {
        const atual = lugaresDaRegiao(corrente.regiaoOrigem);
        const chave = valor.toLocaleLowerCase('pt-BR');
        const tem = atual.some((l) => l.toLocaleLowerCase('pt-BR') === chave);
        if (definir) {
            if (tem) return false;
            corrente.regiaoOrigem = normalizarRegiao([...atual, valor]);
        } else {
            if (!tem) return false;
            corrente.regiaoOrigem = atual.filter((l) => l.toLocaleLowerCase('pt-BR') !== chave);
        }
        return true;
    }
    const atual = normalizarLista(corrente[lista.campo]);
    const chave = chaveValor(valor);
    const tem = atual.some((v) => chaveValor(v) === chave);
    if (definir) {
        if (tem) return false;
        corrente[lista.campo] = normalizarLista([...atual, valor]);
    } else {
        if (!tem) return false;
        corrente[lista.campo] = atual.filter((v) => chaveValor(v) !== chave);
    }
    return true;
}

// Aplica a operação às correntes de `ids`. Devolve { erro } se a operação é
// inválida; senão { alterados: [{ id, antes }], iguais, recusados:
// [{ id, motivo }] } (ver o cabeçalho para o que cada um quer dizer).
export function aplicarMassaCorrentes(dbRef, ids, op) {
    const erro = validarOperacaoCorrente(op);
    if (erro) return { erro };
    const ehPai = op.campo === 'pai';
    if (
        ehPai &&
        op.acao === 'adicionar' &&
        !(dbRef.movimentosEscolas || []).some((m) => m.id == op.paiId)
    ) {
        return { erro: 'A corrente pai escolhida não existe mais.' };
    }
    const conjunto = new Set(ids.map(String));
    const alterados = [];
    const recusados = [];
    let iguais = 0;
    (dbRef.movimentosEscolas || []).forEach((corrente) => {
        if (!conjunto.has(String(corrente.id))) return;
        const antes = estadoDe(corrente);
        const feito = ehPai
            ? aplicarPaiNaCorrente(dbRef, corrente, op)
            : aplicarNaCorrente(corrente, op);
        if (feito && feito.recusa) {
            recusados.push({ id: corrente.id, motivo: feito.recusa });
        } else if (feito) {
            alterados.push({ id: corrente.id, antes });
        } else {
            iguais++;
        }
    });
    return { alterados, iguais, recusados };
}

// Devolve cada corrente alterada ao estado de antes (busca pelo id de novo,
// não por referência: a corrente pode ter sido editada ou apagada depois).
export function restaurarMassaCorrentes(dbRef, alterados) {
    let restaurados = 0;
    alterados.forEach(({ id, antes }) => {
        const corrente = (dbRef.movimentosEscolas || []).find((m) => m.id == id);
        if (!corrente) return;
        CAMPOS_GUARDADOS.forEach((campo) => {
            if (antes[campo] === undefined) delete corrente[campo];
            else corrente[campo] = copia(antes[campo]);
        });
        restaurados++;
    });
    return restaurados;
}
