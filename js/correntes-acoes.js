// ============================================================
// correntes-acoes.js: seleção (checkbox por cartão) e edição em massa da
// aba Correntes literárias: definir ou limpar Tipo, Programa, Postura
// estética e "Faz parte de" (com Divisão e "Aplica-se a"), e acrescentar ou
// remover Região de origem, Valores, Temas, Técnicas, Tipos de composição,
// Lemas e Manifestos nas correntes selecionadas.
//
// A lógica pura (o que muda em cada corrente, Desfazer) fica em
// correntes-massa.js; aqui só o estado da seleção, a barra de ações e o
// aviso com Desfazer. Mesmo desenho de epocas-acoes.js, inclusive o import
// circular com render-listas.js (seguro porque nenhum dos dois lados usa o
// import do outro no topo do módulo, só dentro de funções).
// ============================================================

import { db, save } from './db.js';
import { mostrarAviso, mostrarAvisoComAcao, escapeHtml } from './utils.js';
import { renderMovimentosEscolas, getListaVisivelCorrentes } from './render-listas.js';
import {
    DIVISOES_CORRENTE,
    GENEROS_DIVISAO_CORRENTE,
    ordenarCorrentesEmArvore,
} from './correntes-hierarquia.js';
import { lugaresUsados } from './regiao.js';
import {
    CAMPOS_LISTA_CORRENTE,
    CAMPOS_MASSA_CORRENTE,
    CAMPOS_UNICOS_CORRENTE,
    aplicarMassaCorrentes,
    ehCampoUnicoCorrente,
    restaurarMassaCorrentes,
    validarOperacaoCorrente,
} from './correntes-massa.js';
import {
    prepararEtiquetasMassa,
    lerEtiquetasMassa,
    limparEtiquetasMassa,
} from './campo-etiquetas-massa.js';
import { fraseValores } from './massa-valores.js';

export const selecaoCorrentes = new Set();

let ultimoCheckCorrente = null;

// ─── Seleção ─────────────────────────────────────────────────────────────

export function toggleSelecaoCorrente(id, checked, shiftKey = false) {
    if (shiftKey && ultimoCheckCorrente !== null && ultimoCheckCorrente !== id) {
        const visiveis = getListaVisivelCorrentes().map((m) => m.id);
        const iAncora = visiveis.indexOf(ultimoCheckCorrente);
        const iAtual = visiveis.indexOf(id);
        if (iAncora !== -1 && iAtual !== -1) {
            const [ini, fim] = iAncora < iAtual ? [iAncora, iAtual] : [iAtual, iAncora];
            visiveis.slice(ini, fim + 1).forEach((mid) => {
                if (checked) selecaoCorrentes.add(mid);
                else selecaoCorrentes.delete(mid);
            });
            ultimoCheckCorrente = id;
            renderMovimentosEscolas();
            return;
        }
    }
    if (checked) selecaoCorrentes.add(id);
    else selecaoCorrentes.delete(id);
    ultimoCheckCorrente = id;
    renderMovimentosEscolas();
}

export function toggleSelecaoTodasCorrentes(checked) {
    getListaVisivelCorrentes().forEach((m) => {
        if (checked) selecaoCorrentes.add(m.id);
        else selecaoCorrentes.delete(m.id);
    });
    renderMovimentosEscolas();
}

export function limparSelecaoCorrentes() {
    selecaoCorrentes.clear();
    renderMovimentosEscolas();
}

// Só entre as correntes que a tela mostra agora; o resto não é tocado.
export function inverterSelecaoCorrentes() {
    getListaVisivelCorrentes().forEach(({ id }) => {
        if (selecaoCorrentes.has(id)) selecaoCorrentes.delete(id);
        else selecaoCorrentes.add(id);
    });
    renderMovimentosEscolas();
}

// Tira da seleção correntes que já não existem (apagadas ou mescladas).
export function podarSelecaoCorrentes() {
    const existentes = new Set(db.movimentosEscolas.map((m) => m.id));
    [...selecaoCorrentes].forEach((id) => {
        if (!existentes.has(id)) selecaoCorrentes.delete(id);
    });
}

// ─── Barra de ações ──────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);

function preencherSelect(select, opcoes, vazio) {
    if (!select) return;
    const atual = select.value;
    select.innerHTML =
        `<option value="">${escapeHtml(vazio)}</option>` +
        opcoes
            .map((o) => `<option value="${escapeHtml(o.valor)}">${escapeHtml(o.rotulo)}</option>`)
            .join('');
    // Mantém a escolha se ela ainda existe (ex.: a barra foi redesenhada).
    select.value = opcoes.some((o) => String(o.valor) === atual) ? atual : '';
}

// Opções do seletor de pai: todas as correntes, em árvore (recuo). A regra
// completa (ciclo) é conferida corrente a corrente ao aplicar.
function preencherSelectPai() {
    const select = el('cor-massa-pai');
    if (!select) return;
    const arvore = ordenarCorrentesEmArvore([...db.movimentosEscolas], (a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR'),
    );
    const opcoes = arvore.map(({ m, nivel }) => ({
        valor: String(m.id),
        rotulo: '    '.repeat(nivel) + (nivel ? '↳ ' : '') + m.nome,
    }));
    preencherSelect(select, opcoes, 'Escolher corrente pai…');
}

// Sugestões de um campo de lista: o que já foi digitado nas correntes.
function sugestoesDoCampo(chave) {
    if (chave === 'regiao') {
        return lugaresUsados({ lista: db.movimentosEscolas, ler: (m) => m.regiaoOrigem });
    }
    const campo = CAMPOS_LISTA_CORRENTE.find((c) => c.chave === chave)?.campo;
    if (!campo) return [];
    const vistos = new Map();
    db.movimentosEscolas.forEach((m) =>
        (m[campo] || []).forEach((v) => {
            const chaveV = String(v).toLocaleLowerCase('pt-BR');
            if (!vistos.has(chaveV)) vistos.set(chaveV, v);
        }),
    );
    return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Rótulos da Ação mudam com o campo: valor único e "Faz parte de" são
// "Definir"/"Limpar"; os campos de lista são "Acrescentar"/"Remover".
function preencherAcoes(unico) {
    const acao = el('cor-massa-acao');
    if (!acao) return;
    const rotulos = unico ? ['Definir', 'Limpar'] : ['Acrescentar', 'Remover'];
    const atual = acao.value || 'adicionar';
    acao.innerHTML = `<option value="adicionar">${rotulos[0]}</option><option value="remover">${rotulos[1]}</option>`;
    acao.value = atual;
}

function mostrarGrupoDoCampo() {
    const campo = el('cor-massa-campo')?.value;
    const unico = ehCampoUnicoCorrente(campo);
    preencherAcoes(unico);
    const limpando = unico && el('cor-massa-acao')?.value === 'remover';

    const ehValorUnico = CAMPOS_UNICOS_CORRENTE.some((c) => c.chave === campo);
    el('cor-massa-grupo-unico')?.classList.toggle('hidden', !ehValorUnico || limpando);
    el('cor-massa-grupo-pai')?.classList.toggle('hidden', campo !== 'pai' || limpando);
    el('cor-massa-grupo-texto')?.classList.toggle('hidden', unico);

    if (ehValorUnico) {
        const def = CAMPOS_UNICOS_CORRENTE.find((c) => c.chave === campo);
        preencherSelect(
            el('cor-massa-unico'),
            def.opcoes.map((o) => ({ valor: o, rotulo: o })),
            `${def.rotulo}…`,
        );
    }
    if (!unico) {
        const def = CAMPOS_LISTA_CORRENTE.find((c) => c.chave === campo);
        prepararEtiquetasMassa({
            inputId: 'cor-massa-valor',
            chipsId: 'cor-massa-valor-chips',
            chave: campo,
            placeholder: `${def?.rotulo ?? ''}: Enter adiciona`,
        });
        const lista = el('sugestoes-cor-massa');
        if (lista) {
            lista.innerHTML = sugestoesDoCampo(campo)
                .map((v) => `<option value="${escapeHtml(v)}"></option>`)
                .join('');
        }
    }
}

function popularControles() {
    const campo = el('cor-massa-campo');
    if (campo && campo.options.length === 0) {
        campo.innerHTML = CAMPOS_MASSA_CORRENTE.map(
            (c) => `<option value="${c.chave}">${c.rotulo}</option>`,
        ).join('');
        campo.onchange = mostrarGrupoDoCampo;
        const acao = el('cor-massa-acao');
        if (acao) acao.onchange = mostrarGrupoDoCampo;
    }
    mostrarGrupoDoCampo();
    preencherSelectPai();
    preencherSelect(
        el('cor-massa-divisao'),
        DIVISOES_CORRENTE.map((d) => ({ valor: d, rotulo: d })),
        'Divisão (manter)',
    );
    preencherSelect(
        el('cor-massa-genero'),
        GENEROS_DIVISAO_CORRENTE.map((g) => ({ valor: g, rotulo: g })),
        'Aplica-se a (manter)',
    );
}

export function atualizarBarraSelecaoCorrentes() {
    const barra = el('barra-acoes-correntes');
    if (!barra) return;
    const n = selecaoCorrentes.size;
    barra.classList.toggle('hidden', n === 0);
    const contador = el('contador-selecao-correntes');
    if (contador) {
        contador.innerText = `${n} corrente${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}`;
    }
    if (n === 0) return;
    popularControles();
}

// ─── Aplicar ─────────────────────────────────────────────────────────────

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function lerOperacao() {
    const valorDe = (id) => el(id)?.value ?? '';
    const campo = valorDe('cor-massa-campo');
    const acao = valorDe('cor-massa-acao');
    if (campo === 'pai') {
        return {
            campo,
            acao,
            paiId: valorDe('cor-massa-pai'),
            divisao: valorDe('cor-massa-divisao'),
            generoDivisao: valorDe('cor-massa-genero'),
        };
    }
    if (CAMPOS_UNICOS_CORRENTE.some((c) => c.chave === campo)) {
        return { campo, acao, valor: valorDe('cor-massa-unico') };
    }
    return { campo, acao, valores: lerEtiquetasMassa('cor-massa-valor') };
}

const nomeDaCorrente = (id) => db.movimentosEscolas.find((m) => m.id == id)?.nome || 'corrente';

const rotuloDoCampo = (chave) => CAMPOS_MASSA_CORRENTE.find((c) => c.chave === chave)?.rotulo || '';

// Por que uma corrente não pôde entrar no pai escolhido (ver aplicarPaiNaCorrente
// em correntes-massa.js).
const MOTIVOS_RECUSA = {
    proprio: 'é a própria corrente pai',
    ciclo: 'a corrente pai escolhida está dentro dela',
};

// Lista as primeiras recusadas com o motivo de cada uma; o resto vira "e mais N".
function fraseDasRecusas(recusados) {
    const itens = recusados
        .slice(0, 4)
        .map(({ id, motivo }) => `"${nomeDaCorrente(id)}" (${MOTIVOS_RECUSA[motivo] || motivo})`);
    const resto = recusados.length - itens.length;
    return `Não entraram: ${itens.join('; ')}${resto > 0 ? ` e mais ${resto}` : ''}.`;
}

function limparCamposDigitados() {
    limparEtiquetasMassa('cor-massa-valor');
    ['cor-massa-unico', 'cor-massa-pai', 'cor-massa-divisao', 'cor-massa-genero'].forEach((id) => {
        const campo = el(id);
        if (campo) campo.value = '';
    });
}

function fraseSemMudanca(op) {
    const definir = op.acao === 'adicionar';
    if (ehCampoUnicoCorrente(op.campo)) {
        return definir
            ? 'Nenhuma corrente mudou: todas as selecionadas já estavam assim.'
            : 'Nenhuma corrente mudou: todas as selecionadas já estavam vazias nesse campo.';
    }
    return definir
        ? 'Todas as correntes selecionadas já tinham isso.'
        : 'Nenhuma das correntes selecionadas tinha isso.';
}

function fraseDoResultado(op, n, ignorados) {
    const definir = op.acao === 'adicionar';
    const campo = rotuloDoCampo(op.campo);
    const correntes = plural(n, 'corrente', 'correntes');
    if (ehCampoUnicoCorrente(op.campo)) {
        const resto = ignorados > 0 ? ` (${ignorados} sem mudança)` : '';
        if (!definir) return `${campo} limpo em ${correntes}${resto}.`;
        const valor = op.campo === 'pai' ? nomeDaCorrente(op.paiId) : op.valor;
        return `${campo} definido como "${valor}" em ${correntes}${resto}.`;
    }
    const verbo = definir ? 'já tinha' : 'não tinha';
    const resto = ignorados > 0 ? ` (${ignorados} ${verbo}${ignorados === 1 ? '' : 'm'})` : '';
    const valores = fraseValores(op.valores);
    const s = op.valores.length > 1 ? 's' : '';
    return definir
        ? `${valores} acrescentado${s} em ${campo} de ${correntes}${resto}.`
        : `${valores} removido${s} de ${campo} em ${correntes}${resto}.`;
}

function executar(op, ids) {
    const resultado = aplicarMassaCorrentes(db, ids, op);
    if (resultado.erro) {
        mostrarAviso(resultado.erro, 'info');
        return;
    }
    const n = resultado.alterados.length;
    const recusados = resultado.recusados || [];
    if (n === 0) {
        if (recusados.length) {
            mostrarAviso(`Nenhuma corrente foi alterada. ${fraseDasRecusas(recusados)}`, 'erro');
            return;
        }
        mostrarAviso(fraseSemMudanca(op), 'info');
        return;
    }
    limparCamposDigitados();
    save();
    renderMovimentosEscolas();
    const recusa = recusados.length ? ` ${fraseDasRecusas(recusados)}` : '';
    mostrarAvisoComAcao(
        `${fraseDoResultado(op, n, resultado.iguais)}${recusa}`,
        'Desfazer',
        () => {
            restaurarMassaCorrentes(db, resultado.alterados);
            save();
            renderMovimentosEscolas();
        },
        recusados.length ? 8000 : 6000,
    );
}

export function aplicarMassaBarraCorrentes() {
    if (selecaoCorrentes.size === 0) return;
    const op = lerOperacao();
    const erro = validarOperacaoCorrente(op);
    if (erro) {
        mostrarAviso(erro, 'info');
        return;
    }
    executar(op, [...selecaoCorrentes]);
}
