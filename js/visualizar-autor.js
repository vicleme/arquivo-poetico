// ============================================================
// visualizar-autor.js — Modal de Visualização somente-leitura do
// Autor (botão "Ver" do card, ver renderAutores em render-listas.js).
//
// O card da lista ficou enxuto de propósito (nome, nacionalidade,
// datas, contagem de textos) — com Identidade, Saúde, Formação etc.
// ele viraria um paredão de texto miúdo. Aqui mora o resto, mostrado
// só sob demanda (também é o lugar certo pra dado sensível, como
// orientação sexual e condições clínicas: não fica à vista na lista).
//
// Seções e campos vazios NÃO aparecem (nada de "—" em toda linha) —
// a maioria dos Autores tem poucos campos preenchidos.
//
// De propósito NÃO lista os textos do Autor: com muitos textos a
// tela ficaria enorme. Só a contagem ("Aparece em N poemas e M
// prosas"), a mesma informação que o card já dá.
//
// Mesmo padrão de visualizar.js/visualizar-sonoridade.js: a parte
// pura (renderVisualizacaoAutorHtml, só monta a string) é separada da
// parte que escreve no DOM (abrirVisualizacaoAutor), pra poder ser
// testada sem abrir modal.
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { db, calcularImpactoExclusaoAutor } from './db.js';
import { editarAutor } from './forms.js';
import {
    escapeHtml,
    formatarDataParcial,
    calcularAnoDominioPublico,
    idadeAutor,
    signoDoZodiaco,
    grupoSexualGenero,
    ROTULOS_GRUPO_SEXUAL_GENERO,
} from './utils.js';

// id do Autor atualmente aberto — o botão "Editar" do próprio modal
// usa esse estado (mesmo padrão de itemAtual em visualizar.js), já que
// o modal não é recriado a cada abertura.
let autorAtualId = null;

function linhaMetaHtml(rotulo, valor) {
    if (!valor) return '';
    return `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">${escapeHtml(rotulo)}:</strong> ${escapeHtml(valor)}</p>`;
}

function secaoHtml(titulo, corpo) {
    if (!corpo) return '';
    return `<section class="mt-5"><h4 class="text-[11px] font-bold uppercase text-gray-500 dark:text-slate-400 mb-2 pb-1 border-b border-gray-100 dark:border-slate-700">${escapeHtml(titulo)}</h4>${corpo}</section>`;
}

// Lista de strings a partir de "a, b, c" (formato de Ocupações,
// Neurodivergências e Instituições) — ou de um array, por defesa.
function listaDeStrings(valor) {
    const itens = Array.isArray(valor) ? valor : String(valor || '').split(',');
    return itens.map((s) => String(s).trim()).filter(Boolean);
}

// Lista de {nome, tipo} (Nomes Literários, Condições Clínicas,
// Deficiências). Aceita também a string legada "a, b" (sem tipo).
function listaComTipo(valor) {
    if (Array.isArray(valor)) {
        return valor
            .map((i) =>
                typeof i === 'string'
                    ? { nome: i.trim(), tipo: '' }
                    : { nome: (i?.nome || '').trim(), tipo: i?.tipo || '' },
            )
            .filter((i) => i.nome);
    }
    return listaDeStrings(valor).map((nome) => ({ nome, tipo: '' }));
}

function chipHtml(nome, tipo, cor) {
    const sufixo = tipo ? ` <span class="opacity-75">· ${escapeHtml(tipo)}</span>` : '';
    return `<span class="${cor} text-white text-[11px] px-2 py-0.5 rounded-full inline-block mr-1 mb-1">${escapeHtml(nome)}${sufixo}</span>`;
}

// Bloco "Rótulo: [chip] [chip]" — vazio se não houver itens.
function linhaChipsHtml(rotulo, itens, cor) {
    if (!itens.length) return '';
    return `<div class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300 mr-1">${escapeHtml(rotulo)}:</strong>${itens.map((i) => chipHtml(i.nome, i.tipo, cor)).join('')}</div>`;
}

function pluralizar(n, singular, plural) {
    return `${n} ${n === 1 ? singular : plural}`;
}

// Parte pura: recebe o Autor e as contagens de textos, devolve HTML.
export function renderVisualizacaoAutorHtml(autor, { totalPoemas = 0, totalProsas = 0 } = {}) {
    const a = autor || {};
    let html = '';

    // ── Cabeçalho (sem título de seção)
    const nomesLiterarios = listaComTipo(a.nomesLiterarios);
    const nascObito =
        a.nascimento || a.obito
            ? `${a.nascimento ? formatarDataParcial(a.nascimento) : '?'} – ${a.obito ? formatarDataParcial(a.obito) : ''}`.trim()
            : '';
    const idade = idadeAutor(a);
    const signo = signoDoZodiaco(a.nascimento);
    const idadeSigno = [
        idade ? `${idade.aproximada ? '≈ ' : ''}${idade.anos} anos` : '',
        signo || '',
    ]
        .filter(Boolean)
        .join(' · ');
    const anoDominioPublico = calcularAnoDominioPublico(a.obito);

    html += linhaChipsHtml('Heterônimos e Pseudônimos', nomesLiterarios, 'bg-indigo-600');
    html += linhaMetaHtml('ISNI', a.isni);
    html += linhaMetaHtml('Nacionalidade', a.nacionalidade);
    html += linhaMetaHtml('Nascimento – Óbito', nascObito);
    html += linhaMetaHtml('Idade e signo', idadeSigno);
    html += linhaMetaHtml('Domínio público', anoDominioPublico ? `desde ${anoDominioPublico}` : '');

    // ── Identidade
    const grupo = grupoSexualGenero(a);
    html += secaoHtml(
        'Identidade',
        linhaMetaHtml('Sexo', a.sexo) +
            linhaMetaHtml('Cor/Raça', a.corRaca) +
            linhaMetaHtml('Gênero', a.genero) +
            linhaMetaHtml('Orientação sexual', a.orientacaoSexual) +
            linhaMetaHtml('Identidade cis/trans', a.identidadeCisTrans) +
            linhaMetaHtml('Religião', a.religiao) +
            (grupo !== 'nao-informado'
                ? linhaMetaHtml(
                      'Grupo sexual e de gênero (derivado)',
                      ROTULOS_GRUPO_SEXUAL_GENERO[grupo],
                  )
                : ''),
    );

    // ── Saúde, neurodivergência e deficiência
    html += secaoHtml(
        'Saúde, neurodivergência e deficiência',
        linhaChipsHtml(
            'Neurodivergência',
            listaDeStrings(a.neurodivergencias).map((nome) => ({ nome, tipo: '' })),
            'bg-fuchsia-600',
        ) +
            linhaChipsHtml('Condições clínicas', listaComTipo(a.condicoesClinicas), 'bg-rose-600') +
            linhaChipsHtml('Deficiências', listaComTipo(a.deficiencias), 'bg-amber-600'),
    );

    // ── Formação e trabalho
    html += secaoHtml(
        'Formação e trabalho',
        linhaMetaHtml('Classe social', a.classeSocial) +
            linhaMetaHtml('Grau acadêmico', a.grauAcademico) +
            linhaChipsHtml(
                'Instituições frequentadas',
                listaDeStrings(a.instituicoes).map((nome) => ({ nome, tipo: '' })),
                'bg-cyan-600',
            ) +
            linhaChipsHtml(
                'Ocupações',
                listaDeStrings(a.ocupacoes).map((nome) => ({ nome, tipo: '' })),
                'bg-teal-600',
            ),
    );

    // ── Sobre (nota livre — quebras de linha preservadas)
    if (a.sobre) {
        html += secaoHtml(
            'Sobre',
            `<p class="text-sm text-gray-700 dark:text-slate-200" style="white-space: pre-wrap">${escapeHtml(a.sobre)}</p>`,
        );
    }

    if (!html) {
        html =
            '<p class="text-sm text-gray-400 dark:text-slate-500">Nenhum outro dado cadastrado para este Autor.</p>';
    }

    // ── Contagem de textos (só o número, sem lista)
    const partes = [];
    if (totalPoemas) partes.push(pluralizar(totalPoemas, 'poema', 'poemas'));
    if (totalProsas) partes.push(pluralizar(totalProsas, 'prosa', 'prosas'));
    html += `<p class="text-[11px] font-mono text-gray-400 dark:text-slate-500 mt-6">${
        partes.length ? `Aparece em ${partes.join(' e ')}.` : 'Ainda não aparece em nenhum texto.'
    }</p>`;

    return html;
}

export async function abrirVisualizacaoAutor(id) {
    const autor = db.autores.find((x) => x.id == id);
    if (!autor) return;
    autorAtualId = autor.id;

    await garantirModal('modal-visualizar-autor');

    const { poemasIds, prosasIds } = calcularImpactoExclusaoAutor(db, autor.id);

    const titulo = document.getElementById('modal-visualizar-autor-titulo');
    if (titulo) titulo.innerText = autor.nome + (autor.souEu ? ' (você)' : '');

    const conteudo = document.getElementById('visualizar-autor-conteudo');
    if (conteudo) {
        conteudo.innerHTML = renderVisualizacaoAutorHtml(autor, {
            totalPoemas: poemasIds.length,
            totalProsas: prosasIds.length,
        });
    }

    await toggleModal('modal-visualizar-autor');
}

// Botão "Editar" do próprio modal: fecha a visualização e abre o
// formulário de edição do mesmo Autor.
export async function editarAutorDoVisualizador() {
    if (autorAtualId == null) return;
    const id = autorAtualId;
    await toggleModal('modal-visualizar-autor');
    await editarAutor(id);
}
