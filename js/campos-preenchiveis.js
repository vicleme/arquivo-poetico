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

import {
    OPCOES_VALENCIA_AJUSTE,
    definirValenciaAjuste,
    valenciaAjusteDe,
} from './valencia-texto.js';
import { ehSorteavel, definirSorteavel } from './sorteavel.js';
import { ehNotaPublica, definirNotaPublica } from './comentarios-publicos.js';
import { ehAutorEmSigilo, definirAutorEmSigilo } from './autor-em-sigilo.js';
import {
    OPCOES_LEITURA_AUTONOMA,
    leituraAutonomaDe,
    definirLeituraAutonoma,
} from './leitura-autonoma.js';
import {
    extrairFontesUnicas,
    OPCOES_GRAFIA,
    formatarDataAcesso,
    autoclassificacaoValida,
    formatarAutoclassificacaoTexto,
} from './utils.js';

// Os 10 valores da Autoclassificação (0,5 a 5, passo 0,5) como opções do
// painel. O valor é o número em texto ("0.5", "3.5", "5"), o mesmo que
// `String(Number)` devolve, pra comparar com `ler` sem conversão extra.
export const OPCOES_AUTOCLASSIFICACAO = Array.from({ length: 10 }, (_, i) => {
    const n = (i + 1) / 2;
    return { valor: String(n), rotulo: formatarAutoclassificacaoTexto(n) };
});

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
    // Marca de leitura (sorteavel.js). Booleano: "Sim" marca, "Não" e "Limpar
    // campo" desmarcam (gravam `false`, não apagam o campo).
    {
        chave: 'sorteavel',
        rotulo: 'Pode ser sorteado',
        tipo: 'booleano',
        ler: (item) => ehSorteavel(item),
        gravar: (item, valor) => {
            definirSorteavel(item, !!valor);
        },
    },
    // Leitura autônoma (leitura-autonoma.js). Opções: Lê-se sozinho (o padrão,
    // vazio), Só em sequência, Só em conjunto e Só como início. "Limpar campo"
    // volta a Lê-se sozinho (grava '').
    {
        chave: 'leituraAutonoma',
        rotulo: 'Leitura autônoma',
        tipo: 'opcoes',
        opcoes: OPCOES_LEITURA_AUTONOMA,
        ler: (item) => leituraAutonomaDe(item),
        gravar: (item, valor) => {
            definirLeituraAutonoma(item, valor);
        },
    },
    // Valência do texto (valencia-texto.js): o AJUSTE do autor. "Limpar campo"
    // volta a seguir os temas (grava ''). A valência derivada não se grava.
    {
        chave: 'valenciaAjuste',
        rotulo: 'Valência do texto (ajuste)',
        tipo: 'opcoes',
        opcoes: OPCOES_VALENCIA_AJUSTE,
        ler: (item) => valenciaAjusteDe(item),
        gravar: (item, valor) => {
            definirValenciaAjuste(item, valor);
        },
    },
    // Autor em sigilo (autor-em-sigilo.js). Booleano, como `sorteavel`: "Sim"
    // liga o sigilo neste texto, "Não" e "Limpar campo" desligam (gravam `false`).
    {
        chave: 'autorEmSigilo',
        rotulo: 'Autor em sigilo',
        tipo: 'booleano',
        ler: (item) => ehAutorEmSigilo(item),
        gravar: (item, valor) => {
            definirAutorEmSigilo(item, !!valor);
        },
    },
    // Notas públicas (comentarios-publicos.js). Booleano, como `sorteavel`:
    // "Sim" marca as Notas como públicas, "Não" e "Limpar campo" desmarcam
    // (gravam `false`). Marcar não mexe no texto das Notas.
    {
        chave: 'notasPublicas',
        rotulo: 'Notas públicas',
        tipo: 'booleano',
        ler: (item) => ehNotaPublica(item),
        gravar: (item, valor) => {
            definirNotaPublica(item, !!valor);
        },
    },
    // Comentários ao leitor (comentarios-publicos.js): texto livre, o mesmo
    // do campo "Comentários ao leitor" do modal.
    {
        chave: 'comentariosPublicos',
        rotulo: 'Comentários ao leitor',
        tipo: 'texto',
        ler: (item) => item.comentariosPublicos || '',
        gravar: (item, valor) => {
            item.comentariosPublicos = String(valor ?? '').trim();
        },
        placeholder: 'Escrito para quem lê a obra',
    },
    // Autoclassificação (corações). No dado, "não avaliado" é `0`; aqui o
    // vazio é '' (como nos outros campos de opção), e `gravar('')` volta a 0,
    // o mesmo que o modal faz ao salvar sem corações.
    {
        chave: 'autoclassificacao',
        rotulo: 'Autoclassificação',
        tipo: 'opcoes',
        opcoes: OPCOES_AUTOCLASSIFICACAO,
        ler: (item) =>
            autoclassificacaoValida(item.autoclassificacao)
                ? String(Number(item.autoclassificacao))
                : '',
        gravar: (item, valor) => {
            const n = Number(valor);
            item.autoclassificacao = autoclassificacaoValida(n) ? n : 0;
        },
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
