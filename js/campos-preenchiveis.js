// ============================================================
// campos-preenchiveis.js — Lista de campos que a ação em massa
// "Preencher campo" (barra de seleção de Poemas/Prosas) sabe
// preencher, e a lógica pura de planejar/aplicar o preenchimento.
// Sem DOM — a tela fica em selecao-massa.js (mesma divisão de
// molde-json.js/ui-molde-json.js).
//
// Por que uma lista em vez de um botão por campo: a barra de ações
// em massa já mistura vários botões, e cada ação nova custava dois
// blocos de HTML (Poemas e Prosas). Aqui um campo novo é uma entrada
// nesta lista — a tela monta o painel a partir dela.
//
// A lista é curada de propósito, só com campos de VALOR ÚNICO
// (texto ou sim/não). Ficam de fora:
//   - os que já têm ação própria (Pessoas, Sinalizações, Gênero, Datas);
//   - os que são listas de objetos ou têm forma própria (Autoria,
//     Estrutura, Envios, Reconhecimentos...): um campo genérico não
//     tem como pedir os subcampos certos;
//   - os que têm valor padrão implícito (Idioma grava 'pt-BR' quando
//     vazio, então "só onde vazio" nunca se aplicaria).
//
// Cada entrada:
//   chave       id estável do campo (vai no <option> do painel)
//   rotulo      nome mostrado na tela e nas confirmações
//   tipo        'texto' | 'booleano'
//   ler(item)   valor atual (string ou boolean)
//   gravar(item, valor)   grava — pra limpar, recebe '' / false
//   sugestoes(itens)      (opcional) valores pro autocompletar
//   placeholder (opcional) dica do campo de texto
// ============================================================

import { extrairFontesUnicas, OPCOES_GRAFIA } from './utils.js';

// `fonteTexto` é { origem, edicao, link, conferido, grafia } ou null
// (ver lerFonteTexto em forms.js): grava um subcampo preservando os
// outros e volta a null quando tudo fica vazio, "conferido" desmarcado
// e grafia nunca definida (`''` — não GRAFIA_ATUAL, que é uma escolha
// explícita e por isso mantém o objeto), pra texto sem Fonte não
// carregar um objeto vazio.
export function definirSubcampoFonte(item, sub, valor) {
    const f = {
        origem: '',
        edicao: '',
        link: '',
        conferido: false,
        grafia: '',
        ...(item.fonteTexto || {}),
    };
    f[sub] = valor;
    const vazio = !(f.origem || '').trim() && !(f.edicao || '').trim() && !(f.link || '').trim();
    item.fonteTexto = vazio && !f.conferido && !f.grafia ? null : f;
}

export const CAMPOS_PREENCHIVEIS = [
    {
        chave: 'fonteOrigem',
        rotulo: 'Fonte',
        tipo: 'texto',
        ler: (item) => item.fonteTexto?.origem || '',
        gravar: (item, valor) => definirSubcampoFonte(item, 'origem', valor),
        sugestoes: (itens) => extrairFontesUnicas(itens, 'origem'),
        placeholder: 'Ex.: Obra própria, Wikisource',
    },
    {
        chave: 'fonteEdicao',
        rotulo: 'Edição da fonte',
        tipo: 'texto',
        ler: (item) => item.fonteTexto?.edicao || '',
        gravar: (item, valor) => definirSubcampoFonte(item, 'edicao', valor),
        sugestoes: (itens) => extrairFontesUnicas(itens, 'edicao'),
        placeholder: 'Ex.: Eu e Outras Poesias, 1920',
    },
    {
        chave: 'fonteLink',
        rotulo: 'Link da fonte',
        tipo: 'texto',
        ler: (item) => item.fonteTexto?.link || '',
        gravar: (item, valor) => definirSubcampoFonte(item, 'link', valor),
        placeholder: 'https://...',
    },
    {
        chave: 'fonteConferido',
        rotulo: 'Texto conferido',
        tipo: 'booleano',
        ler: (item) => !!item.fonteTexto?.conferido,
        gravar: (item, valor) => definirSubcampoFonte(item, 'conferido', !!valor),
    },
    {
        chave: 'fonteGrafia',
        rotulo: 'Grafia',
        tipo: 'opcoes',
        opcoes: OPCOES_GRAFIA,
        ler: (item) => item.fonteTexto?.grafia || '',
        gravar: (item, valor) => definirSubcampoFonte(item, 'grafia', valor),
    },
    {
        chave: 'pendencia',
        rotulo: 'Pendência',
        tipo: 'texto',
        ler: (item) => item.pendencia || '',
        gravar: (item, valor) => {
            item.pendencia = valor;
        },
        placeholder: 'Ex.: revisar métrica',
    },
];

export function obterCampoPreenchivel(chave) {
    return CAMPOS_PREENCHIVEIS.find((c) => c.chave === chave) || null;
}

function estaVazio(campo, item) {
    const v = campo.ler(item);
    return campo.tipo === 'booleano' ? !v : !String(v ?? '').trim();
}

// Decide o que o preenchimento faria, sem tocar em nada — a tela usa
// isso pra mostrar "N serão alterados, M mantidos" antes de confirmar.
//
//   alterar          itens que vão mudar
//   jaPreenchidos    texto: pulados por já terem valor (só quando
//                    `sobrescrever` é false)
//   jaIguais         pulados por já estarem exatamente com o valor pedido
//
// Booleano ignora `sobrescrever`: "Sim"/"Não" define o valor em todos
// os selecionados, e só pula quem já está assim.
export function planejarPreenchimento(itens, campo, valor, { sobrescrever = false } = {}) {
    const alvo = campo.tipo === 'booleano' ? !!valor : String(valor ?? '').trim();
    const alterar = [];
    let jaPreenchidos = 0;
    let jaIguais = 0;

    itens.forEach((item) => {
        const atual = campo.ler(item);
        if (campo.tipo === 'booleano') {
            if (!!atual === alvo) jaIguais++;
            else alterar.push(item);
            return;
        }
        if (!estaVazio(campo, item)) {
            if (String(atual).trim() === alvo) jaIguais++;
            else if (!sobrescrever) jaPreenchidos++;
            else alterar.push(item);
            return;
        }
        alterar.push(item);
    });

    return { alterar, jaPreenchidos, jaIguais };
}

// Itens que o "Limpar campo" esvaziaria (os que já estão vazios ficam
// de fora, e a contagem deles vira `jaVazios`).
export function planejarLimpeza(itens, campo) {
    const alterar = itens.filter((item) => !estaVazio(campo, item));
    return { alterar, jaVazios: itens.length - alterar.length };
}

export function aplicarPreenchimento(alterar, campo, valor) {
    const alvo = campo.tipo === 'booleano' ? !!valor : String(valor ?? '').trim();
    alterar.forEach((item) => campo.gravar(item, alvo));
}

export function aplicarLimpeza(alterar, campo) {
    const vazio = campo.tipo === 'booleano' ? false : '';
    alterar.forEach((item) => campo.gravar(item, vazio));
}
