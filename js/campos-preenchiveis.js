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
// (texto, sim/não, uma opção ou um Local do cadastro). Ficam de fora:
//   - os que já têm ação própria (Pessoas, Sinalizações, Gênero, Datas);
//   - os que são listas (Territorialidade) ou de objetos, ou têm forma
//     própria (Autoria,
//     Estrutura, Envios, Reconhecimentos...): um campo genérico não
//     tem como pedir os subcampos certos;
//   - os que têm valor padrão implícito (Idioma grava 'pt-BR' quando
//     vazio, então "só onde vazio" nunca se aplicaria).
//
// Cada entrada:
//   chave       id estável do campo (vai no <option> do painel)
//   rotulo      nome mostrado na tela e nas confirmações
//   tipo        'texto' | 'booleano' | 'opcoes' | 'local'
//   ler(item)   valor atual (string, boolean ou, em 'local', o id do
//               Local ou null)
//   gravar(item, valor)   grava — pra limpar, recebe '' / false
//   soImportacao  (opcional) true: fica fora do painel "Preencher campo"
//   sugestoes(itens)      (opcional) valores pro autocompletar
//   placeholder (opcional) dica do campo de texto
// ============================================================

import { extrairFontesUnicas, OPCOES_GRAFIA, formatarDataAcesso } from './utils.js';

// `fonteTexto` é { origem, edicao, link, dataAcesso?, conferido, grafia } ou null
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
    // A data de acesso descreve o link: sem link ela não fica.
    // (e só vale uma data ISO válida; a gravação ignora o resto.)
    if (!(f.link || '').trim() || !formatarDataAcesso(f.dataAcesso)) delete f.dataAcesso;
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
    // Só pela importação de campos (`soImportacao`): preencher a data em massa
    // não tem uso claro, e sem link a data nem é gravada.
    {
        chave: 'fonteDataAcesso',
        rotulo: 'Data de acesso da fonte',
        tipo: 'texto',
        soImportacao: true,
        ler: (item) => item.fonteTexto?.dataAcesso || '',
        gravar: (item, valor) => definirSubcampoFonte(item, 'dataAcesso', valor),
        placeholder: 'aaaa-mm-dd',
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
    // Tipo 'local': o valor é o id de um Local do cadastro (um só por texto,
    // como no modal). Resolver o nome digitado em id — e criar o Local que
    // ainda não existe — exige o banco, então fica na tela (selecao-massa.js);
    // aqui o plano e a gravação só enxergam o id. `valor` null no plano
    // significa "Local ainda a criar": nenhum texto já está com ele.
    {
        chave: 'localEscrita',
        rotulo: 'Local de escrita',
        tipo: 'local',
        ler: (item) => item.localEscrita ?? null,
        gravar: (item, valor) => {
            item.localEscrita = valor == null || valor === '' ? null : valor;
        },
        placeholder: 'Local já cadastrado ou novo...',
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

// O que será gravado: booleano vira true/false, texto e opção ficam sem
// espaços nas pontas, e o Local fica como veio (o id — ou null, o "a criar" —
// sem virar string, senão o id numérico se perderia).
function valorAlvo(campo, valor) {
    if (campo.tipo === 'booleano') return !!valor;
    if (campo.tipo === 'local') return valor ?? null;
    return String(valor ?? '').trim();
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
    const alvo = valorAlvo(campo, valor);
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
            if (String(atual).trim() === String(alvo)) jaIguais++;
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
    const alvo = valorAlvo(campo, valor);
    alterar.forEach((item) => campo.gravar(item, alvo));
}

export function aplicarLimpeza(alterar, campo) {
    const vazio = campo.tipo === 'booleano' ? false : '';
    alterar.forEach((item) => campo.gravar(item, vazio));
}
