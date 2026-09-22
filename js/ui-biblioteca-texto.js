// ============================================================
// ui-biblioteca-texto.js — "Importar de texto" (aba Biblioteca):
// a pessoa cola (ou sobe) um .txt/.md no formato "# Título" por texto,
// diz quem é o Autor e de onde veio o texto, e o resultado segue para a
// Importação Aditiva — a mesma porta que os pacotes curados usam. Esta
// tela é só adaptador: nunca escreve em `db`; Autor, duplicata de título
// e snapshot continuam sendo decididos (e mostrados) na Importação.
//
// O parser é o mesmo do script que gera os pacotes estáticos
// (pacote-texto.js), então o formato aceito é idêntico nos dois caminhos.
// ============================================================

import { db } from './db.js';
import {
    escapeHtml,
    mostrarAviso,
    situacaoDominioPublico,
    rotuloDominioPublico,
    normalizarGrafia,
    OPCOES_GRAFIA,
} from './utils.js';
import {
    separarTextos,
    temTextoAntesDoPrimeiroTitulo,
    montarPayloadDeTexto,
} from './pacote-texto.js';
import { carregarPayloadImportacaoAditiva } from './ui-importar-aditivo.js';

const IDS_CAMPOS = [
    'texto',
    'titulo',
    'tipo',
    'autor',
    'nacionalidade',
    'nasc-ano',
    'obito-ano',
    'fonte',
    'edicao',
    'link',
    'ortografia',
];

function el(sufixo) {
    return document.getElementById(`bt-${sufixo}`);
}

function valor(sufixo) {
    return el(sufixo)?.value ?? '';
}

function lerCampos() {
    return {
        md: valor('texto'),
        tituloPadrao: valor('titulo'),
        tipo: valor('tipo'),
        autor: valor('autor'),
        nacionalidade: valor('nacionalidade'),
        nascimentoAno: valor('nasc-ano'),
        obitoAno: valor('obito-ano'),
        fonte: valor('fonte'),
        edicao: valor('edicao'),
        link: valor('link'),
        ortografia: valor('ortografia'),
        conferido: Boolean(el('conferido')?.checked),
    };
}

// Autor já cadastrado com o mesmo nome (sem diferenciar maiúsculas). Só
// pra avisar; quem decide o casamento de verdade é a Importação Aditiva.
function autorExistente(nome) {
    const alvo = String(nome ?? '')
        .trim()
        .toLowerCase();
    if (!alvo) return null;
    return (
        (db.autores || []).find(
            (a) =>
                String(a.nome ?? '')
                    .trim()
                    .toLowerCase() === alvo,
        ) || null
    );
}

// Autores do acervo como sugestão no campo Autor — digitar o nome igual ao
// cadastrado faz a Importação já casar com ele, sem pergunta.
export function prepararFormTextoBiblioteca() {
    const lista = document.getElementById('bt-autores-existentes');
    if (!lista) return;
    lista.innerHTML = (db.autores || [])
        .map((a) => a.nome)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((nome) => `<option value="${escapeHtml(nome)}">`)
        .join('');
}

function linhaPrevia(classe, html) {
    return `<p class="${classe}">${html}</p>`;
}

const CLASSE_NEUTRA = 'text-xs text-gray-500 dark:text-slate-400';
const CLASSE_ALERTA =
    'text-xs text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-md p-2';

// Prévia viva: quantos textos foram reconhecidos, avisos e a situação de
// domínio público do Autor. Nunca lança — erro de campo só aparece ao enviar.
export function atualizarPreviaTextoBiblioteca() {
    const alvo = document.getElementById('bt-previa');
    if (!alvo) return;

    const partes = [];
    const md = valor('texto');

    // Ao contrário do resto deste bloco (contagem de textos, aviso de
    // trecho ignorado), o texto em si não é pré-requisito daqui pra
    // baixo: Ortografia e Autor podem ser preenchidos fora de ordem, e
    // "sem texto colado ainda" não deveria silenciar o feedback deles.
    if (!md.trim()) {
        partes.push(
            linhaPrevia(
                CLASSE_NEUTRA,
                'Cole o texto ou escolha um arquivo. Cada texto começa com uma linha “# Título”.',
            ),
        );
    } else {
        const textos = separarTextos(md, { tituloPadrao: valor('titulo') });

        if (!textos.length) {
            partes.push(
                linhaPrevia(
                    CLASSE_ALERTA,
                    'Nenhum texto reconhecido. Comece cada texto com “# Título”, ou preencha o campo ' +
                        '“Título” abaixo se estiver colando um texto só.',
                ),
            );
        } else {
            const titulos = textos.map((t) => `<li>${escapeHtml(t.titulo)}</li>`).join('');
            const rotuloTipo = valor('tipo') === 'prosa' ? 'Prosa' : 'Poema';
            partes.push(`<details class="text-xs" open>
                <summary class="cursor-pointer font-medium">${textos.length} texto(s) reconhecido(s) como ${rotuloTipo}</summary>
                <ol class="list-decimal ml-6 mt-1 text-gray-500 dark:text-slate-400">${titulos}</ol>
            </details>`);
        }

        if (temTextoAntesDoPrimeiroTitulo(md)) {
            partes.push(
                linhaPrevia(
                    CLASSE_ALERTA,
                    'Há texto antes do primeiro “# Título”; esse trecho será ignorado.',
                ),
            );
        }
    }

    const ortografia = valor('ortografia').trim();
    if (ortografia) {
        const normalizado = normalizarGrafia(ortografia);
        const rotulo = OPCOES_GRAFIA.find((o) => o.valor === normalizado)?.rotulo;
        partes.push(
            linhaPrevia(
                CLASSE_NEUTRA,
                `Grafia inferida para os textos: <strong>${escapeHtml(rotulo)}</strong>` +
                    `<span class="text-gray-400 dark:text-slate-500"> (a partir do texto digitado ` +
                    `em Ortografia; ajustável por texto depois, no modal)</span>`,
            ),
        );
    }

    const nome = valor('autor').trim();
    if (nome) {
        const existente = autorExistente(nome);
        if (existente) {
            partes.push(
                linhaPrevia(
                    CLASSE_NEUTRA,
                    `Autor já cadastrado: o cadastro dele não é alterado (nacionalidade e datas ` +
                        `abaixo só valem para Autor novo).`,
                ),
            );
        }
        const obitoAno = parseInt(valor('obito-ano'), 10);
        const referencia = existente || (obitoAno ? { obito: { ano: obitoAno } } : null);
        if (referencia) {
            const sit = situacaoDominioPublico(referencia);
            const texto = rotuloDominioPublico(sit);
            const classe =
                sit.estado === 'livre'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400';
            partes.push(
                linhaPrevia(
                    'text-xs',
                    `${escapeHtml(nome)} — <span class="${classe}">${escapeHtml(texto)}</span>` +
                        `<span class="text-gray-400 dark:text-slate-500"> (estimativa informativa; ` +
                        `edições, traduções e notas podem ter proteção própria)</span>`,
                ),
            );
        }
    }

    alvo.innerHTML = partes.join('');
}

// Sobe um .txt/.md pro campo de texto (o conteúdo continua editável).
export function lerArquivoTextoBiblioteca(event) {
    const arquivo = event.target?.files?.[0];
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const area = el('texto');
        if (area) area.value = String(e.target.result ?? '');
        atualizarPreviaTextoBiblioteca();
    };
    reader.onerror = () => mostrarAviso('Não foi possível ler esse arquivo.');
    reader.readAsText(arquivo, 'utf-8');
}

// Monta o payload e entrega à Importação Aditiva. Devolve true se a aba de
// destino deve ser aberta (main.js faz o abrirAba), como usarPacoteBiblioteca.
export function enviarTextoParaImportacao() {
    let payload;
    try {
        payload = montarPayloadDeTexto(lerCampos());
    } catch (erro) {
        mostrarAviso(erro.message);
        return false;
    }
    if (!carregarPayloadImportacaoAditiva(payload)) {
        mostrarAviso('Nenhum texto reconhecido — confira o formato “# Título”.');
        return false;
    }
    return true;
}

export function limparFormTextoBiblioteca() {
    IDS_CAMPOS.forEach((s) => {
        const campo = el(s);
        if (campo) campo.value = s === 'tipo' ? 'poema' : '';
    });
    const arquivo = el('arquivo');
    if (arquivo) arquivo.value = '';
    const conferido = el('conferido');
    if (conferido) conferido.checked = false;
    atualizarPreviaTextoBiblioteca();
}
