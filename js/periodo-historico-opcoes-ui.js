// Período Histórico: modal "Esferas e categorias históricas". Gerencia as duas
// listas editáveis (db.opcoesPeriodoHistorico): renomear (e juntar quando o
// nome já existe), adicionar e apagar o que nenhum período usa.
// Só lógica de tela; as regras moram em periodos-historicos-campos.js. Segue
// o desenho do modal biográfico equivalente (periodo-biografico-opcoes-ui.js),
// sem Natureza, Vínculo e Papéis, que não existem aqui.

import { db, save } from './db.js';
import { toggleModal, garantirModal } from './ui.js';
import { abrirModalConfirmacao, mostrarAviso } from './utils.js';
import { chaveValor, normalizarLista } from './periodo-biografico-campos.js';
import {
    contarUsoOpcaoPeriodoHistorico,
    opcoesDoPeriodoHistorico,
    removerOpcaoPeriodoHistorico,
    renomearOpcaoPeriodoHistorico,
} from './periodos-historicos-campos.js';
import { renderPeriodosHistoricos } from './render-listas.js';

const TIPOS = [
    { tipo: 'esferas', singular: 'esfera' },
    { tipo: 'categorias', singular: 'categoria' },
];

function afterChange() {
    save();
    renderPeriodosHistoricos();
    renderOpcoes();
}

function linhaDoValor(tipo, singular, valor) {
    const uso = contarUsoOpcaoPeriodoHistorico(db, tipo, valor);
    const linha = document.createElement('div');
    linha.className = 'flex items-center gap-2';
    linha.dataset.valor = valor;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = valor;
    input.dataset.nomeOriginal = valor;
    input.autocomplete = 'off';
    input.style.marginBottom = '0';
    input.style.flex = '1 1 0%';
    input.style.minWidth = '0';
    input.setAttribute('aria-label', `Nome da ${singular} ${valor}`);

    const contagem = document.createElement('span');
    contagem.className = 'text-[10px] text-gray-400 dark:text-slate-500 font-mono flex-shrink-0';
    contagem.textContent = uso === 0 ? 'sem uso' : `${uso} período${uso !== 1 ? 's' : ''}`;

    const renomear = document.createElement('button');
    renomear.type = 'button';
    renomear.className = 'text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0';
    renomear.textContent = 'Renomear';
    renomear.onclick = () => renomearValor(tipo, valor, input.value);
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation(); // Enter não pode salvar o modal inteiro
            renomearValor(tipo, valor, input.value);
        }
    };

    const apagar = document.createElement('button');
    apagar.type = 'button';
    apagar.className = 'text-xs text-red-500 hover:underline flex-shrink-0';
    apagar.textContent = 'Apagar';
    if (uso > 0) {
        apagar.disabled = true;
        apagar.classList.add('opacity-40', 'cursor-not-allowed');
        apagar.title = 'Em uso: renomeie ou tire dos períodos antes de apagar';
    } else {
        apagar.onclick = () => {
            if (removerOpcaoPeriodoHistorico(db, tipo, valor).ok) afterChange();
        };
    }

    linha.append(input, contagem, renomear, apagar);
    return linha;
}

function renderOpcoes() {
    TIPOS.forEach(({ tipo, singular }) => {
        const lista = document.getElementById(`oph-${tipo}-lista`);
        if (!lista) return;
        lista.innerHTML = '';
        const valores = opcoesDoPeriodoHistorico(db, tipo);
        if (valores.length === 0) {
            const vazio = document.createElement('p');
            vazio.className = 'text-xs text-gray-400 dark:text-slate-500';
            vazio.textContent = `Nenhuma ${singular} cadastrada.`;
            lista.appendChild(vazio);
            return;
        }
        valores.forEach((v) => lista.appendChild(linhaDoValor(tipo, singular, v)));
    });
}

function renomearValor(tipo, de, para) {
    const novo = String(para ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    const singular = TIPOS.find((t) => t.tipo === tipo).singular;
    if (!novo) {
        mostrarAviso(`O nome da ${singular} não pode ficar vazio.`);
        renderOpcoes();
        return;
    }
    if (novo === de) return;
    const jaExiste =
        chaveValor(novo) !== chaveValor(de) &&
        opcoesDoPeriodoHistorico(db, tipo).some((v) => chaveValor(v) === chaveValor(novo));
    const aplicar = () => {
        renomearOpcaoPeriodoHistorico(db, tipo, de, novo);
        afterChange();
    };
    if (jaExiste) {
        abrirModalConfirmacao({
            titulo: `Juntar ${singular === 'esfera' ? 'esferas' : 'categorias'}`,
            rotulo: `"${de}" e "${novo}"`,
            mensagem: `Já existe "${novo}". Os períodos que usam "${de}" passam a usar "${novo}", e os dois viram um só.`,
            textoConfirmar: 'Juntar',
            corConfirmar: '#2563eb',
            onConfirmar: aplicar,
        });
        return;
    }
    aplicar();
}

function adicionarValor(tipo) {
    const input = document.getElementById(`oph-${tipo}-novo`);
    if (!input) return;
    const valor = input.value.replace(/\s+/g, ' ').trim();
    if (!valor) return;
    const op = db.opcoesPeriodoHistorico;
    op[tipo] = normalizarLista([...(op[tipo] || []), valor]);
    input.value = '';
    afterChange();
    input.focus();
}

// ─── Salvar tudo e aviso de alterações pendentes ─────────────
// Os botões de cada linha continuam valendo. O check do cabeçalho aplica de
// uma vez o que está digitado e ainda não foi aplicado, e o X avisa quando
// sobra algo assim.

function pendencias() {
    const modal = document.getElementById('modal-opcoes-periodo-historico');
    if (!modal) return { renomes: [], novos: [] };
    const renomes = [];
    const novos = [];
    TIPOS.forEach(({ tipo }) => {
        modal.querySelectorAll(`#oph-${tipo}-lista input[data-nome-original]`).forEach((input) => {
            const novo = input.value.replace(/\s+/g, ' ').trim();
            if (novo !== input.dataset.nomeOriginal)
                renomes.push({ tipo, de: input.dataset.nomeOriginal, para: novo });
        });
        const valor = (document.getElementById(`oph-${tipo}-novo`)?.value || '')
            .replace(/\s+/g, ' ')
            .trim();
        if (valor) novos.push({ tipo, valor });
    });
    return { renomes, novos };
}

export const rastreadorOpcoesPeriodoHistorico = {
    estaSujo() {
        const p = pendencias();
        return p.renomes.length + p.novos.length > 0;
    },
    // Chamado ao abrir e ao descartar: some o que ficou digitado nos campos de
    // "novo" (os nomes são refeitos do banco por renderOpcoes).
    marcarLimpo() {
        TIPOS.forEach(({ tipo }) => {
            const input = document.getElementById(`oph-${tipo}-novo`);
            if (input) input.value = '';
        });
    },
};

// Aplica tudo o que está pendente. Se algo não puder ser aplicado (nome vazio
// ou nome que já existe), nada muda e o modal fica aberto com o aviso. Devolve
// true quando aplicou e pode fechar.
export function salvarTudoOpcoesPeriodoHistorico() {
    const { renomes, novos } = pendencias();
    for (const { tipo, de, para } of renomes) {
        const singular = TIPOS.find((t) => t.tipo === tipo).singular;
        if (!para) {
            mostrarAviso(`O nome da ${singular} "${de}" não pode ficar vazio.`);
            return false;
        }
        const existe = opcoesDoPeriodoHistorico(db, tipo).some(
            (v) => chaveValor(v) === chaveValor(para) && chaveValor(v) !== chaveValor(de),
        );
        if (existe) {
            mostrarAviso(
                `"${para}" já existe. Para juntar com "${de}", use o botão Renomear da linha.`,
            );
            return false;
        }
    }
    for (const { tipo, de, para } of renomes) renomearOpcaoPeriodoHistorico(db, tipo, de, para);
    const op = db.opcoesPeriodoHistorico;
    novos.forEach(({ tipo, valor }) => {
        op[tipo] = normalizarLista([...(op[tipo] || []), valor]);
        const input = document.getElementById(`oph-${tipo}-novo`);
        if (input) input.value = '';
    });
    afterChange();
    return true;
}

export function initOpcoesPeriodoHistorico() {
    document.getElementById('oph-salvar-tudo')?.addEventListener('click', () => {
        if (salvarTudoOpcoesPeriodoHistorico()) toggleModal('modal-opcoes-periodo-historico');
    });
    TIPOS.forEach(({ tipo }) => {
        document
            .getElementById(`oph-${tipo}-adicionar`)
            ?.addEventListener('click', () => adicionarValor(tipo));
        document.getElementById(`oph-${tipo}-novo`)?.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation();
            adicionarValor(tipo);
        });
    });
}

export async function abrirOpcoesPeriodoHistorico() {
    await garantirModal('modal-opcoes-periodo-historico');
    renderOpcoes();
    rastreadorOpcoesPeriodoHistorico.marcarLimpo();
    toggleModal('modal-opcoes-periodo-historico');
}
