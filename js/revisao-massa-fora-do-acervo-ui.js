// ============================================================
// revisao-massa-fora-do-acervo-ui.js: a barra de edição em massa do "Modo
// revisão" da seção "Fora do acervo" da aba Conexões. Aplica uma mudança a
// todas as linhas que o filtro mostra (por exemplo, a origem "Grécia" a todas
// as entradas de tipo "Mitologia"). A lógica fica em
// `revisao-massa-fora-do-acervo.js`; aqui ficam os controles, a confirmação, o
// backup forçado antes de gravar e o Desfazer, no mesmo fluxo do "Revisar e
// gravar" de `revisao-fora-do-acervo-ui.js`.
//
// Uma mudança por vez. A barra não mexe nas edições pendentes da tabela: com
// linhas alteradas e ainda não gravadas, ela pede para gravar ou descartar
// antes (o plano lê o que está gravado, e gravar por cima dessas edições as
// perderia em silêncio).
// ============================================================

import { db, save } from './db.js';
import { tirarSnapshotSeNecessario } from './autobackup.js';
import { abrirModalConfirmacao, mostrarAviso, mostrarAvisoComAcao, escapeHtml } from './utils.js';
import { etiquetasDoTexto } from './massa-valores.js';
import { descreverRevisao, MENSAGENS_ERRO_REVISAO } from './revisao-fora-do-acervo.js';
import {
    aplicarEdicaoEmMassa,
    descreverOperacoes,
    MENSAGENS_ERRO_MASSA,
    planejarEdicaoEmMassa,
} from './revisao-massa-fora-do-acervo.js';
import { MENSAGENS_ERRO_DATA_OBRA } from './data-da-obra.js';
import { renderForaDoAcervo } from './render-fora-do-acervo.js';

const entrada = () => ({ poemas: db.poemas, prosas: db.prosas });
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

// Os campos da barra, com o tipo da mudança e a lista de sugestões do campo.
export const CAMPOS_DA_BARRA = [
    { valor: 'origem', rotulo: 'Origem', tipo: 'lista', sugestoes: 'rev-dl-origem' },
    { valor: 'tipoObra', rotulo: 'Tipo de obra', tipo: 'texto', sugestoes: 'rev-dl-tipo' },
    { valor: 'relacao', rotulo: 'Relação', tipo: 'texto', sugestoes: '' },
    { valor: 'dataObra', rotulo: 'Data da obra', tipo: 'texto', sugestoes: '' },
    { valor: 'dataObraAte', rotulo: 'Até (fim da data da obra)', tipo: 'texto', sugestoes: '' },
    { valor: 'obraPessoal', rotulo: 'Obra pessoal', tipo: 'check', sugestoes: '' },
    {
        valor: 'personagem',
        rotulo: 'Personagem (só Intertextualidade)',
        tipo: 'lista',
        sugestoes: 'rev-dl-personagem',
    },
    {
        valor: 'traduzido',
        rotulo: 'Traduzido (só Intertextualidade)',
        tipo: 'check',
        sugestoes: '',
    },
];

const MODOS = {
    lista: [
        ['adicionar', 'Adicionar'],
        ['substituir', 'Trocar tudo por'],
        ['remover', 'Tirar'],
        ['limpar', 'Tirar todas'],
    ],
    texto: [
        ['definir', 'Definir como'],
        ['tirar', 'Tirar o valor'],
    ],
    check: [
        ['marcar', 'Marcar'],
        ['desmarcar', 'Desmarcar'],
    ],
};
// Modos sem texto para digitar.
const MODOS_SEM_VALOR = ['limpar', 'tirar', 'marcar', 'desmarcar'];

const CLASSE_CONTROLE =
    'h-9 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100';

const campoInfo = (valor) => CAMPOS_DA_BARRA.find((c) => c.valor === valor);

function opcoesDoModo(tipo, campo, atual) {
    return MODOS[tipo]
        .filter(([modo]) => !(campo === 'personagem' && modo === 'substituir'))
        .map(
            ([modo, rotulo]) =>
                `<option value="${modo}"${modo === atual ? ' selected' : ''}>${escapeHtml(rotulo)}</option>`,
        )
        .join('');
}

// O HTML da barra (fechada por padrão). Montado uma vez; a contagem e os
// controles se ajustam depois, sem apagar o que a pessoa já escolheu.
export function htmlBarraMassa() {
    const campos = CAMPOS_DA_BARRA.map(
        (c) => `<option value="${c.valor}">${escapeHtml(c.rotulo)}</option>`,
    ).join('');
    return `
    <details id="revisao-massa" class="mb-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <summary class="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Editar em massa as linhas do filtro</summary>
        <div class="px-3 pb-3">
            <p class="text-xs text-gray-500 dark:text-slate-400 mb-3">
                Aplica uma mudança às linhas marcadas na tabela (a caixinha de cada linha, ou a do
                cabeçalho para marcar todas as do filtro, em todas as páginas). Sem nenhuma
                marcada, vale para todas as linhas que a busca e os filtros mostram. Antes de
                gravar, a confirmação diz quantas entradas mudam, e dá para desfazer logo depois.
            </p>
            <div class="flex flex-wrap items-end gap-3">
                <div>
                    <label for="revisao-massa-campo" class="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Campo</label>
                    <select id="revisao-massa-campo" class="${CLASSE_CONTROLE}">${campos}</select>
                </div>
                <div>
                    <label for="revisao-massa-modo" class="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Mudança</label>
                    <select id="revisao-massa-modo" class="${CLASSE_CONTROLE}"></select>
                </div>
                <div id="revisao-massa-valor-caixa" class="w-full md:w-72">
                    <label for="revisao-massa-valor" class="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Valor</label>
                    <input id="revisao-massa-valor" type="text" autocomplete="off" class="w-full ${CLASSE_CONTROLE}" />
                </div>
                <button type="button" id="revisao-massa-aplicar" data-rev-acao="massa"
                    class="h-9 px-3 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">Aplicar</button>
            </div>
            <p id="revisao-massa-dica" class="text-[11px] text-gray-400 dark:text-slate-500 mt-2"></p>
        </div>
    </details>`;
}

// Ajusta os controles ao campo escolhido e a contagem de linhas do filtro.
export function atualizarBarraMassa(raiz, totalFiltradas, totalSelecionadas = 0) {
    const campoSel = raiz?.querySelector('#revisao-massa-campo');
    const modoSel = raiz?.querySelector('#revisao-massa-modo');
    if (!campoSel || !modoSel) return;
    const info = campoInfo(campoSel.value) || CAMPOS_DA_BARRA[0];
    const modosValidos = MODOS[info.tipo]
        .map(([m]) => m)
        .filter((m) => !(info.valor === 'personagem' && m === 'substituir'));
    const modoAtual = modosValidos.includes(modoSel.value) ? modoSel.value : modosValidos[0];
    if (modoSel.dataset.tipo !== info.tipo || modoSel.dataset.campo !== info.valor) {
        modoSel.innerHTML = opcoesDoModo(info.tipo, info.valor, modoAtual);
        modoSel.dataset.tipo = info.tipo;
        modoSel.dataset.campo = info.valor;
    }
    const semValor = MODOS_SEM_VALOR.includes(modoSel.value);
    raiz.querySelector('#revisao-massa-valor-caixa')?.classList.toggle('hidden', semValor);
    const valor = raiz.querySelector('#revisao-massa-valor');
    if (valor) {
        if (info.sugestoes) valor.setAttribute('list', info.sugestoes);
        else valor.removeAttribute('list');
    }
    const dica = raiz.querySelector('#revisao-massa-dica');
    if (dica) {
        dica.textContent =
            info.tipo === 'lista'
                ? 'Separe vários valores com vírgula ou ponto e vírgula.'
                : info.valor === 'dataObra' || info.valor === 'dataObraAte'
                  ? 'Por exemplo: 1922, séc. XX, década de 1920 ou 11/02/1922.'
                  : '';
        dica.classList.toggle('hidden', semValor || !dica.textContent);
    }
    const botao = raiz.querySelector('#revisao-massa-aplicar');
    if (botao) {
        botao.disabled = !totalFiltradas;
        if (!totalFiltradas) botao.textContent = 'Nenhuma linha no filtro';
        else if (totalSelecionadas) {
            botao.textContent =
                totalSelecionadas === 1
                    ? 'Aplicar à 1 selecionada'
                    : `Aplicar às ${totalSelecionadas} selecionadas`;
        } else {
            botao.textContent =
                totalFiltradas === 1
                    ? 'Aplicar à 1 linha do filtro'
                    : `Aplicar às ${totalFiltradas} linhas do filtro`;
        }
    }
}

// Lê a mudança escolhida na barra. Devolve `{ operacao }` ou `{ erro }`.
export function lerOperacaoDaBarra(raiz) {
    const info = campoInfo(raiz?.querySelector('#revisao-massa-campo')?.value);
    const modo = raiz?.querySelector('#revisao-massa-modo')?.value;
    const texto = raiz?.querySelector('#revisao-massa-valor')?.value ?? '';
    if (!info || !modo) return { erro: 'operacao-invalida' };
    if (info.tipo === 'lista') {
        if (modo === 'limpar') return { operacao: { valor: info.valor, modo } };
        const valores = etiquetasDoTexto(texto);
        if (!valores.length) return { erro: 'valor-vazio' };
        return { operacao: { valor: info.valor, modo, valores } };
    }
    if (info.tipo === 'check') {
        return { operacao: { valor: info.valor, marcado: modo === 'marcar' } };
    }
    if (modo === 'tirar') return { operacao: { valor: info.valor, texto: '' } };
    if (!texto.trim()) return { erro: 'valor-vazio' };
    return { operacao: { valor: info.valor, texto } };
}

export function mensagemDeErroDaMassa(plano) {
    if (plano?.erro === 'data-obra-invalida') {
        const coluna = plano.valorComErro === 'dataObraAte' ? 'Até' : 'Data da obra';
        const motivo = MENSAGENS_ERRO_DATA_OBRA[plano.erroData];
        return motivo ? `${coluna}: ${motivo}` : MENSAGENS_ERRO_REVISAO['data-obra-invalida'];
    }
    return MENSAGENS_ERRO_MASSA[plano?.erro] || 'Não foi possível gravar.';
}

function mensagemDeConfirmacao(plano, alvo = 'filtro') {
    const frases = descreverOperacoes(plano.operacoes).join('; ');
    const { linhas, restantes } = descreverRevisao(plano);
    const exemplos =
        linhas.join('; ') + (restantes ? ` e mais ${plural(restantes, 'linha', 'linhas')}` : '');
    const partes = [
        `${alvo === 'selecionadas' ? (plano.alvos === 1 ? '1 linha selecionada' : `${plano.alvos} linhas selecionadas`) : `${plural(plano.alvos, 'linha', 'linhas')} no filtro`}: ${frases}.`,
        `Mudam ${plural(plano.entradas, 'entrada', 'entradas')} em ${plural(plano.textos, 'texto', 'textos')}: ${exemplos}.`,
    ];
    if (plano.semMudanca) {
        partes.push(
            plano.semMudanca === 1
                ? '1 linha já está assim e fica como está.'
                : `${plano.semMudanca} linhas já estão assim e ficam como estão.`,
        );
    }
    if (plano.semAplicacao) {
        partes.push(
            `${plural(plano.semAplicacao, 'linha de Hipertextualidade não tem', 'linhas de Hipertextualidade não têm')} esse campo e ${plano.semAplicacao === 1 ? 'fica' : 'ficam'} de fora.`,
        );
    }
    partes.push('Um backup é guardado antes de gravar, e dá para desfazer logo depois.');
    return partes.join(' ');
}

// Planeja e pede a confirmação; ao confirmar, tira o backup, planeja de novo,
// grava e oferece o Desfazer. `deps.tirarSnapshot` existe para os testes.
export function pedirEdicaoEmMassa(
    { chaves = [], operacoes = [], pendentes = 0, alvo = 'filtro' } = {},
    deps = {},
) {
    if (pendentes) {
        mostrarAviso(
            'Há linhas alteradas e ainda não gravadas. Grave ou descarte antes de editar em massa.',
            'info',
        );
        return false;
    }
    const snapshot = deps.tirarSnapshot || tirarSnapshotSeNecessario;
    const plano = planejarEdicaoEmMassa(entrada(), chaves, operacoes);
    if (plano.erro && plano.erro !== 'sem-edicao') {
        mostrarAviso(mensagemDeErroDaMassa(plano));
        return false;
    }
    if (plano.erro === 'sem-edicao') {
        mostrarAviso(
            'Nenhuma das linhas escolhidas tem esse campo. Hipertextualidade não guarda personagem nem traduzido.',
            'info',
        );
        return false;
    }
    if (!plano.entradas) {
        mostrarAviso('Nada a gravar: as linhas escolhidas já estão assim.', 'info');
        return false;
    }
    abrirModalConfirmacao({
        titulo: 'Editar em massa',
        rotulo: 'Modo revisão',
        mensagem: mensagemDeConfirmacao(plano, alvo),
        textoConfirmar: 'Gravar',
        corConfirmar: '#2563eb',
        focarConfirmar: true,
        onConfirmar: async () => {
            const ok = await snapshot(db, true);
            if (!ok) {
                mostrarAviso('Não foi possível guardar o backup antes. Nada foi alterado.');
                return;
            }
            // Planeja de novo: os dados podem ter mudado desde a confirmação.
            const atual = planejarEdicaoEmMassa(entrada(), chaves, operacoes);
            if (atual.erro) {
                mostrarAviso(mensagemDeErroDaMassa(atual));
                return;
            }
            const feito = aplicarEdicaoEmMassa(atual);
            if (!feito.entradas) return;
            save();
            renderForaDoAcervo();
            mostrarAvisoComAcao(
                plural(feito.entradas, 'entrada atualizada', 'entradas atualizadas'),
                'Desfazer',
                () => {
                    feito.desfazer();
                    save();
                    renderForaDoAcervo();
                },
                8000,
            );
        },
    });
    return true;
}
