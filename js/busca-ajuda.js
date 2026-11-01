// ============================================================
// busca-ajuda.js: busca da Central de Ajuda (T10, entrega 2 de 3,
// lógica pura, sem tela).
//
// Recebe o texto digitado e devolve só o que casa, nas duas listas da
// Central, preservando a estrutura de grupos e categorias para a tela
// (entrega 3) poder esconder o que ficou vazio:
//
//   - "Como eu faço para...": título, descrição e `palavras` de cada
//     tarefa. O texto dos passos do mini-tour fica de fora (é redundante
//     com a descrição e faria a busca achar tarefa por causa de uma palavra
//     solta de balão).
//   - "Perguntas frequentes": a pergunta, a resposta e as `palavras`.
//
// `palavras` (T10, entrega 4) é uma lista curada de sinônimos e do jeito
// que a pessoa costuma dizer ("apagar", "zerar" para esvaziar o acervo).
// Só a busca lê esse campo; a tela nunca o mostra.
//
// Regras: acento e caixa não importam; cada palavra separada por espaço é
// um termo e todos precisam aparecer (E), em qualquer ordem e em qualquer
// dos dois campos do item; cada termo casa por trecho ("sonor" acha
// "Sonoridade"). Entre aspas vira frase exata: as palavras precisam
// aparecer juntas e nessa ordem ("novo poema"). Só isso: sem `ou`, sem
// `-termo` e sem `campo:`. Aspa sem par é tratada como texto comum.
// Texto vazio ou só com espaços não filtra nada.
//
// Duas ajudas para quem não sabe o vocabulário do app:
//   - Palavras de enchimento ("como", "meu", "para"...) são ignoradas, a
//     menos que a busca seja só isso.
//   - Se nenhum item tem TODOS os termos, mostra os que têm o maior número
//     deles (`parcial`), em vez de uma lista vazia. Só com 2 termos ou mais.
//
// Os dados entram por parâmetro (com os reais como padrão) para os testes
// não dependerem do conteúdo da Central, que cresce a cada fase.
// ============================================================

import { normalizarBusca } from './utils.js';
import { GRUPOS_COMO_FACO, TAREFAS_COMO_FACO } from './como-faco-passos.js';
import { CATEGORIAS_FAQ } from './faq-conteudo.js';

// Espaços repetidos (e quebras de linha) viram um só, para a frase casar
// mesmo que o texto do item tenha espaçamento diferente.
function limpar(texto) {
    return normalizarBusca(texto).replace(/\s+/g, ' ').trim();
}

// Palavras de enchimento, já normalizadas (sem acento). Só valem como
// termo quando a busca não tem mais nada.
const ENCHIMENTO = new Set(
    (
        'a as o os um uma uns umas de do da dos das e em no na nos nas para pra por com ' +
        'como meu minha meus minhas que eu faco fazer se ao ou qual quais onde quando ' +
        'posso pode quero preciso'
    ).split(' '),
);

// Termos da consulta, normalizados e sem repetição: primeiro as frases
// entre aspas (com par), depois as palavras soltas. Aspa sem par e aspas
// vazias ("") somem, sem erro.
export function termosBuscaAjuda(texto) {
    const frases = [];
    const resto = String(texto ?? '').replace(/"([^"]*)"/g, (_, dentro) => {
        frases.push(dentro);
        return ' ';
    });
    const palavras = resto.replace(/"/g, ' ').split(/\s+/);
    const termos = [...new Set([...frases, ...palavras].map(limpar).filter(Boolean))];
    const uteis = termos.filter((t) => !ENCHIMENTO.has(t));
    return uteis.length ? uteis : termos;
}

// Texto onde a busca procura: cada campo limpo, unidos por quebra de linha
// para uma frase nunca casar atravessando o fim de um campo e o começo do
// outro. `palavras` entra como mais um campo.
function alvoDe(...campos) {
    return campos.flat().filter(Boolean).map(limpar).join('\n');
}

// Quantos dos termos aparecem no alvo.
function acertos(termos, alvo) {
    return termos.filter((t) => alvo.includes(t)).length;
}

// `dados` opcional: { grupos, tarefas, categorias }. Padrão = Central real.
// Devolve:
//   ativa        false quando o texto não tem termo (nada foi filtrado)
//   grupos       [{ id, rotulo, tarefas }]       só os com tarefa que casa
//   categorias   [{ id, rotulo, perguntas }]     só as com pergunta que casa
//   total        quantidade de itens que casam (tarefas + perguntas)
//   vazia        true quando a busca está ativa e nada casou
//   parcial      true quando nenhum item tem todos os termos e a lista traz
//                os que têm mais deles
//   acertos      (só no parcial) quantos termos cada item mostrado tem
//   totalTermos  quantos termos a busca tem
export function buscarNaAjuda(texto, dados = {}) {
    const grupos = dados.grupos || GRUPOS_COMO_FACO;
    const tarefas = dados.tarefas || TAREFAS_COMO_FACO;
    const categorias = dados.categorias || CATEGORIAS_FAQ;
    const termos = termosBuscaAjuda(texto);
    const ativa = termos.length > 0;

    // pontuação de cada item (quantos termos tem), guardada por objeto
    const pontos = new Map();
    if (ativa) {
        for (const t of tarefas) {
            pontos.set(t, acertos(termos, alvoDe(t.titulo, t.descricao, t.palavras)));
        }
        for (const c of categorias) {
            for (const p of c.perguntas) {
                pontos.set(p, acertos(termos, alvoDe(p.pergunta, p.resposta, p.palavras)));
            }
        }
    }

    // nível de corte: todos os termos; se ninguém chega lá (e há 2 ou mais
    // termos), o maior número que alguém alcança
    let corte = termos.length;
    let parcial = false;
    if (ativa && ![...pontos.values()].some((n) => n >= corte) && termos.length > 1) {
        corte = Math.max(0, ...pontos.values());
        parcial = corte > 0;
    }
    const passa = (item) => !ativa || (pontos.get(item) >= corte && corte > 0);

    const gruposAchados = grupos
        .map((g) => ({
            id: g.id,
            rotulo: g.rotulo,
            tarefas: tarefas.filter((t) => t.grupo === g.id && passa(t)),
        }))
        .filter((g) => g.tarefas.length);

    const categoriasAchadas = categorias
        .map((c) => ({
            id: c.id,
            rotulo: c.rotulo,
            perguntas: c.perguntas.filter(passa),
        }))
        .filter((c) => c.perguntas.length);

    const total =
        gruposAchados.reduce((n, g) => n + g.tarefas.length, 0) +
        categoriasAchadas.reduce((n, c) => n + c.perguntas.length, 0);

    return {
        ativa,
        grupos: gruposAchados,
        categorias: categoriasAchadas,
        total,
        vazia: ativa && total === 0,
        parcial,
        acertos: parcial ? corte : undefined,
        totalTermos: termos.length,
    };
}
