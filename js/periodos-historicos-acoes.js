// ============================================================
// periodos-historicos-acoes.js: seleção (checkbox por cartão) e edição em
// massa da aba Período Histórico: acrescentar ou remover Esfera, Categoria,
// Região, "Faz parte de" (período pai em comum) e Marca de evento nos
// períodos selecionados.
//
// A lógica pura (o que muda em cada período, Desfazer) fica em
// periodos-historicos-massa.js; aqui só o estado da seleção, a barra de
// ações e a confirmação. Mesmo desenho de epocas-acoes.js, inclusive o
// import circular com render-listas.js (seguro porque nenhum dos dois lados
// usa o import do outro no topo do módulo, só dentro de funções).
// ============================================================

import { db, save } from './db.js';
import { mostrarAviso, mostrarAvisoComAcao, escapeHtml } from './utils.js';
import { renderPeriodosHistoricos, getListaVisivelPeriodosHistoricos } from './render-listas.js';
import { opcoesDoPeriodoHistorico } from './periodos-historicos-campos.js';
import { ordenarPeriodosEmArvore } from './periodos-historicos-hierarquia.js';
import { lugaresUsados } from './regiao.js';
import {
    CAMPOS_MASSA_PERIODO_HISTORICO,
    aplicarMassaPeriodosHistoricos,
    restaurarMassaPeriodosHistoricos,
    validarOperacaoPeriodoHistorico,
} from './periodos-historicos-massa.js';
import {
    prepararEtiquetasMassa,
    lerEtiquetasMassa,
    limparEtiquetasMassa,
} from './campo-etiquetas-massa.js';
import { rotuloComValores } from './massa-valores.js';

export const selecaoPeriodosHistoricos = new Set();

let ultimoCheckPeriodoHistorico = null;

// ─── Seleção ─────────────────────────────────────────────────────────────

export function toggleSelecaoPeriodoHistorico(id, checked, shiftKey = false) {
    if (shiftKey && ultimoCheckPeriodoHistorico !== null && ultimoCheckPeriodoHistorico !== id) {
        const visiveis = getListaVisivelPeriodosHistoricos().map((p) => p.id);
        const iAncora = visiveis.indexOf(ultimoCheckPeriodoHistorico);
        const iAtual = visiveis.indexOf(id);
        if (iAncora !== -1 && iAtual !== -1) {
            const [ini, fim] = iAncora < iAtual ? [iAncora, iAtual] : [iAtual, iAncora];
            visiveis.slice(ini, fim + 1).forEach((pid) => {
                if (checked) selecaoPeriodosHistoricos.add(pid);
                else selecaoPeriodosHistoricos.delete(pid);
            });
            ultimoCheckPeriodoHistorico = id;
            renderPeriodosHistoricos();
            return;
        }
    }
    if (checked) selecaoPeriodosHistoricos.add(id);
    else selecaoPeriodosHistoricos.delete(id);
    ultimoCheckPeriodoHistorico = id;
    renderPeriodosHistoricos();
}

export function toggleSelecaoTodosPeriodosHistoricos(checked) {
    getListaVisivelPeriodosHistoricos().forEach((p) => {
        if (checked) selecaoPeriodosHistoricos.add(p.id);
        else selecaoPeriodosHistoricos.delete(p.id);
    });
    renderPeriodosHistoricos();
}

export function limparSelecaoPeriodosHistoricos() {
    selecaoPeriodosHistoricos.clear();
    renderPeriodosHistoricos();
}

// Só entre os períodos que a tela mostra agora; o resto não é tocado.
export function inverterSelecaoPeriodosHistoricos() {
    getListaVisivelPeriodosHistoricos().forEach(({ id }) => {
        if (selecaoPeriodosHistoricos.has(id)) selecaoPeriodosHistoricos.delete(id);
        else selecaoPeriodosHistoricos.add(id);
    });
    renderPeriodosHistoricos();
}

// Tira da seleção períodos que já não existem (apagados ou mesclados).
export function podarSelecaoPeriodosHistoricos() {
    const existentes = new Set(db.periodosHistoricos.map((p) => p.id));
    [...selecaoPeriodosHistoricos].forEach((id) => {
        if (!existentes.has(id)) selecaoPeriodosHistoricos.delete(id);
    });
}

// ─── Barra de ações ──────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);

function preencherDatalist(id, valores) {
    const lista = el(id);
    if (lista)
        lista.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
}

// Opções do seletor de pai: todos os períodos, em árvore (recuo). A regra
// completa (ciclo) é conferida período a período ao aplicar; aqui só se evita
// o que é óbvio.
function preencherSelectPai() {
    const select = el('ph-massa-pai');
    if (!select) return;
    const atual = select.value;
    const arvore = ordenarPeriodosEmArvore([...db.periodosHistoricos], (a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR'),
    );
    select.innerHTML =
        '<option value="">Escolher período pai…</option>' +
        arvore
            .map(({ m, nivel }) => {
                const recuo = '    '.repeat(nivel) + (nivel ? '↳ ' : '');
                return `<option value="${m.id}">${recuo}${escapeHtml(m.nome)}</option>`;
            })
            .join('');
    // Mantém a escolha se ela ainda existe (ex.: a barra foi redesenhada).
    select.value = db.periodosHistoricos.some((p) => String(p.id) === atual) ? atual : '';
}

function mostrarGrupoDoCampo() {
    const campo = el('ph-massa-campo')?.value;
    const texto = campo === 'esfera' || campo === 'categoria' || campo === 'regiao';
    el('ph-massa-grupo-texto')?.classList.toggle('hidden', !texto);
    el('ph-massa-grupo-pai')?.classList.toggle('hidden', campo !== 'pai');
    const entrada = el('ph-massa-valor');
    if (entrada && texto) {
        const lista =
            campo === 'esfera'
                ? 'sugestoes-ph-massa-esferas'
                : campo === 'categoria'
                  ? 'sugestoes-ph-massa-categorias'
                  : 'sugestoes-ph-massa-regioes';
        entrada.setAttribute('list', lista);
    }
    if (texto) {
        const rotulo =
            campo === 'esfera' ? 'Esfera' : campo === 'categoria' ? 'Categoria' : 'Lugar';
        prepararEtiquetasMassa({
            inputId: 'ph-massa-valor',
            chipsId: 'ph-massa-valor-chips',
            chave: campo,
            placeholder: `${rotulo}: Enter adiciona`,
        });
    }
}

function popularControles() {
    const campo = el('ph-massa-campo');
    if (campo && campo.options.length === 0) {
        campo.innerHTML = CAMPOS_MASSA_PERIODO_HISTORICO.map(
            (c) => `<option value="${c.chave}">${c.rotulo}</option>`,
        ).join('');
        campo.onchange = mostrarGrupoDoCampo;
    }
    mostrarGrupoDoCampo();
    preencherSelectPai();
    preencherDatalist('sugestoes-ph-massa-esferas', opcoesDoPeriodoHistorico(db, 'esferas'));
    preencherDatalist('sugestoes-ph-massa-categorias', opcoesDoPeriodoHistorico(db, 'categorias'));
    preencherDatalist(
        'sugestoes-ph-massa-regioes',
        lugaresUsados({ lista: db.periodosHistoricos, ler: (p) => p.regiao }),
    );
}

export function atualizarBarraSelecaoPeriodosHistoricos() {
    const barra = el('barra-acoes-periodos-historicos');
    if (!barra) return;
    const n = selecaoPeriodosHistoricos.size;
    barra.classList.toggle('hidden', n === 0);
    const contador = el('contador-selecao-periodos-historicos');
    if (contador) {
        contador.innerText = `${n} período${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}`;
    }
    if (n === 0) return;
    popularControles();
}

// ─── Aplicar ─────────────────────────────────────────────────────────────

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// "Esfera ... acrescentada" / "Esferas ... acrescentadas".
const plural_s = (op) => (op.valores?.length > 1 ? 's' : '');

function lerOperacao() {
    const valorDe = (id) => el(id)?.value ?? '';
    const campo = valorDe('ph-massa-campo');
    const acao = valorDe('ph-massa-acao');
    if (campo === 'esfera' || campo === 'categoria' || campo === 'regiao') {
        return { campo, acao, valores: lerEtiquetasMassa('ph-massa-valor') };
    }
    if (campo === 'pai') return { campo, acao, paiId: valorDe('ph-massa-pai') };
    return { campo, acao };
}

const nomeDoPeriodo = (id) => db.periodosHistoricos.find((p) => p.id == id)?.nome || 'período';

function descricaoDaOperacao(op) {
    if (op.campo === 'esfera') return rotuloComValores('Esfera', 'Esferas', op.valores);
    if (op.campo === 'categoria') return rotuloComValores('Categoria', 'Categorias', op.valores);
    if (op.campo === 'regiao') return rotuloComValores('Região', 'Regiões', op.valores);
    if (op.campo === 'pai') return `Período pai "${nomeDoPeriodo(op.paiId)}"`;
    return 'Marca de evento';
}

// Por que um período não pôde entrar no pai escolhido (ver aplicarPaiNoPeriodo
// em periodos-historicos-massa.js).
const MOTIVOS_RECUSA = {
    proprio: 'é o próprio pai',
    ciclo: 'o pai escolhido está dentro dele',
};

// Lista os primeiros recusados com o motivo de cada um; o resto vira "e mais N".
function fraseDasRecusas(recusados) {
    const itens = recusados
        .slice(0, 4)
        .map(({ id, motivo }) => `"${nomeDoPeriodo(id)}" (${MOTIVOS_RECUSA[motivo] || motivo})`);
    const resto = recusados.length - itens.length;
    return `Não entraram: ${itens.join('; ')}${resto > 0 ? ` e mais ${resto}` : ''}.`;
}

function limparCamposDigitados() {
    limparEtiquetasMassa('ph-massa-valor');
    const pai = el('ph-massa-pai');
    if (pai) pai.value = '';
}

function executar(op, ids) {
    const resultado = aplicarMassaPeriodosHistoricos(db, ids, op);
    if (resultado.erro) {
        mostrarAviso(resultado.erro, 'info');
        return;
    }
    const adicionar = op.acao === 'adicionar';
    const n = resultado.alterados.length;
    const recusados = resultado.recusados || [];
    if (n === 0) {
        if (recusados.length) {
            mostrarAviso(`Nenhum período foi alterado. ${fraseDasRecusas(recusados)}`, 'erro');
            return;
        }
        mostrarAviso(
            op.campo === 'evento'
                ? adicionar
                    ? 'Todos os períodos selecionados já eram evento.'
                    : 'Nenhum dos períodos selecionados era evento.'
                : adicionar
                  ? 'Todos os períodos selecionados já tinham isso.'
                  : 'Nenhum dos períodos selecionados tinha isso.',
            'info',
        );
        return;
    }
    limparCamposDigitados();
    save();
    renderPeriodosHistoricos();
    const ignorados = resultado.iguais;
    const verbo = adicionar ? 'já tinha' : 'não tinha';
    const resto = ignorados > 0 ? ` (${ignorados} ${verbo}${ignorados === 1 ? '' : 'm'})` : '';
    // "Período pai" é masculino; os demais campos (Esfera, Categoria, Região)
    // são femininos.
    const participio =
        op.campo === 'pai'
            ? adicionar
                ? 'acrescentado a'
                : 'removido de'
            : `${adicionar ? 'acrescentada' : 'removida'}${plural_s(op)} ${adicionar ? 'a' : 'de'}`;
    const recusa = recusados.length ? ` ${fraseDasRecusas(recusados)}` : '';
    const foraDoPai = resultado.foraDoPai?.length
        ? ` ${plural(resultado.foraDoPai.length, 'período tem', 'períodos têm')} datas fora do intervalo do pai.`
        : '';
    // A marca de evento não é "acrescentada a": diz o que aconteceu.
    const frase =
        op.campo === 'evento'
            ? adicionar
                ? `${plural(n, 'período marcado', 'períodos marcados')} como evento${resto}.`
                : `Marca de evento tirada de ${plural(n, 'período', 'períodos')}${resto}.`
            : `${descricaoDaOperacao(op)} ${participio} ${plural(n, 'período', 'períodos')}${resto}.${recusa}${foraDoPai}`;
    mostrarAvisoComAcao(
        frase,
        'Desfazer',
        () => {
            restaurarMassaPeriodosHistoricos(db, resultado.alterados);
            save();
            renderPeriodosHistoricos();
        },
        recusados.length || foraDoPai ? 8000 : 6000,
    );
}

export function aplicarMassaBarraPeriodosHistoricos() {
    if (selecaoPeriodosHistoricos.size === 0) return;
    const op = lerOperacao();
    const erro = validarOperacaoPeriodoHistorico(op);
    if (erro) {
        mostrarAviso(erro, 'info');
        return;
    }
    executar(op, [...selecaoPeriodosHistoricos]);
}
