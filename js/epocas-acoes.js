// ============================================================
// epocas-acoes.js — Seleção (checkbox por cartão) e edição em massa da
// aba Período Biográfico: acrescentar ou remover Esfera, Categoria, Pessoa
// envolvida, Relação e "Faz parte de" (período pai em comum) nos períodos
// selecionados.
//
// A lógica pura (o que muda em cada período, Desfazer) fica em
// periodo-biografico-massa.js; aqui só o estado da seleção, a barra de
// ações e a confirmação. Mesmo desenho de pessoas-acoes.js, inclusive o
// import circular com render-listas.js (seguro porque nenhum dos dois lados
// usa o import do outro no topo do módulo, só dentro de funções).
//
// Privacidade: pessoa oculta não aparece nos seletores da barra, a menos
// que "Mostrar ocultas" esteja ligado. O botão vale só enquanto há seleção
// e volta a esconder quando a seleção esvazia (nunca é guardado).
// ============================================================

import { db, save } from './db.js';
import { mostrarAviso, mostrarAvisoComAcao, abrirModalConfirmacao, escapeHtml } from './utils.js';
import { renderEpocas, getListaVisivelEpocas } from './render-listas.js';
import { AUTOR, opcoesDoPeriodoBiografico, periodosVisiveis } from './periodo-biografico-campos.js';
import {
    criarComparadorDeEpocas,
    ordenarPeriodosEmArvore,
} from './periodos-biograficos-hierarquia.js';
import { exibindoOcultasDosPeriodos, opcoesOcultasDosPeriodos } from './ocultas-periodos.js';
import {
    CAMPOS_MASSA_PERIODO_BIOGRAFICO,
    aplicarMassaPeriodosBiograficos,
    restaurarMassaPeriodosBiograficos,
    autoresDaSelecao,
    operacaoUsaAutor,
    validarOperacao,
} from './periodo-biografico-massa.js';
import {
    prepararEtiquetasMassa,
    lerEtiquetasMassa,
    limparEtiquetasMassa,
} from './campo-etiquetas-massa.js';
import { rotuloComValores } from './massa-valores.js';

export const selecaoEpocas = new Set();

let ultimoCheckEpoca = null;
let mostrarOcultasNaBarra = false;

// ─── Ocultar / reexibir um período ───────────────────────────────────────
// Mesmo desenho de toggleOcultarPessoa (pessoas-acoes.js): inverte só aquele
// período, sem excluir nem desvincular nada. Ocultar oferece "Desfazer", que
// busca o período pelo id de novo (não pela referência guardada) para não
// reexibir o errado se ele foi excluído ou mesclado nesse meio-tempo.
export function toggleOcultarEpoca(id) {
    const ep = db.epocas.find((x) => x.id == id);
    if (!ep) return;
    ep.oculto = !ep.oculto;
    // Ao ocultar com a seleção em lote aberta, o cartão some da tela: tira
    // da seleção para a barra de ações não contar um período que não se vê.
    if (ep.oculto && !exibindoOcultasDosPeriodos()) selecaoEpocas.delete(ep.id);
    save();
    if (ep.oculto) {
        mostrarAvisoComAcao(`"${ep.nome}" oculto.`, 'Desfazer', () => {
            const alvo = db.epocas.find((x) => x.id == id);
            if (!alvo) return;
            alvo.oculto = false;
            save();
        });
    } else {
        mostrarAviso(`"${ep.nome}" reexibido.`, 'sucesso');
    }
}

// ─── Seleção ─────────────────────────────────────────────────────────────

export function toggleSelecaoEpoca(id, checked, shiftKey = false) {
    if (shiftKey && ultimoCheckEpoca !== null && ultimoCheckEpoca !== id) {
        const visiveis = getListaVisivelEpocas().map((e) => e.id);
        const iAncora = visiveis.indexOf(ultimoCheckEpoca);
        const iAtual = visiveis.indexOf(id);
        if (iAncora !== -1 && iAtual !== -1) {
            const [ini, fim] = iAncora < iAtual ? [iAncora, iAtual] : [iAtual, iAncora];
            visiveis.slice(ini, fim + 1).forEach((eid) => {
                if (checked) selecaoEpocas.add(eid);
                else selecaoEpocas.delete(eid);
            });
            ultimoCheckEpoca = id;
            renderEpocas();
            return;
        }
    }
    if (checked) selecaoEpocas.add(id);
    else selecaoEpocas.delete(id);
    ultimoCheckEpoca = id;
    renderEpocas();
}

export function toggleSelecaoTodosEpocas(checked) {
    getListaVisivelEpocas().forEach((e) => {
        if (checked) selecaoEpocas.add(e.id);
        else selecaoEpocas.delete(e.id);
    });
    renderEpocas();
}

export function limparSelecaoEpocas() {
    selecaoEpocas.clear();
    renderEpocas();
}

// Só entre os períodos que a tela mostra agora; o resto não é tocado.
export function inverterSelecaoEpocas() {
    getListaVisivelEpocas().forEach(({ id }) => {
        if (selecaoEpocas.has(id)) selecaoEpocas.delete(id);
        else selecaoEpocas.add(id);
    });
    renderEpocas();
}

// Tira da seleção períodos que já não existem (apagados ou mesclados).
export function podarSelecaoEpocas() {
    const existentes = new Set(db.epocas.map((e) => e.id));
    [...selecaoEpocas].forEach((id) => {
        if (!existentes.has(id)) selecaoEpocas.delete(id);
    });
}

// ─── Barra de ações ──────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);

function pessoasParaSeletor() {
    return db.pessoas
        .filter((p) => mostrarOcultasNaBarra || !p.oculto)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

const rotuloPessoa = (p) => (p.oculto ? `${p.nome} (oculta)` : p.nome);

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

function preencherDatalist(id, valores) {
    const lista = el(id);
    if (lista)
        lista.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
}

// Opções do seletor de pai: todos os períodos que a tela pode mostrar, em
// árvore (recuo) e agrupados por autor, porque um período só pode fazer parte
// de períodos do mesmo autor. A regra completa (ciclo, autor, datas) é
// conferida período a período ao aplicar; aqui só se evita o que é óbvio.
function preencherSelectPai() {
    const select = el('epocas-massa-pai');
    if (!select) return;
    const atual = select.value;
    const lista = periodosVisiveis(db.epocas, opcoesOcultasDosPeriodos());
    const porAutor = new Map();
    lista.forEach((p) => {
        const k = String(p.autorId ?? '');
        if (!porAutor.has(k)) porAutor.set(k, []);
        porAutor.get(k).push(p);
    });
    const nomeDoAutor = (k) => db.autores.find((a) => String(a.id) === k)?.nome || 'Sem autor';
    const grupos = [...porAutor.entries()]
        .map(([k, periodos]) => ({ nome: nomeDoAutor(k), periodos }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    select.innerHTML =
        '<option value="">Escolher período pai…</option>' +
        grupos
            .map(({ nome, periodos }) => {
                const itens = ordenarPeriodosEmArvore(periodos, criarComparadorDeEpocas(periodos))
                    .map(({ m, nivel }) => {
                        const recuo =
                            '\u00a0\u00a0\u00a0\u00a0'.repeat(nivel) + (nivel ? '↳ ' : '');
                        return `<option value="${m.id}">${recuo}${escapeHtml(m.nome)}</option>`;
                    })
                    .join('');
                return `<optgroup label="${escapeHtml(nome)}">${itens}</optgroup>`;
            })
            .join('');
    // Mantém a escolha se ela ainda existe (ex.: a barra foi redesenhada).
    select.value = lista.some((p) => String(p.id) === atual) ? atual : '';
}

function mostrarGrupoDoCampo() {
    const campo = el('epocas-massa-campo')?.value;
    const texto = campo === 'esfera' || campo === 'categoria';
    el('epocas-massa-grupo-texto')?.classList.toggle('hidden', !texto);
    el('epocas-massa-grupo-pessoa')?.classList.toggle('hidden', campo !== 'pessoa');
    el('epocas-massa-grupo-pai')?.classList.toggle('hidden', campo !== 'pai');
    el('epocas-massa-grupo-relacao')?.classList.toggle('hidden', campo !== 'relacao');
    const entrada = el('epocas-massa-valor');
    if (entrada && texto) {
        entrada.setAttribute(
            'list',
            campo === 'esfera'
                ? 'sugestoes-epocas-massa-esferas'
                : 'sugestoes-epocas-massa-categorias',
        );
    }
    if (texto) {
        prepararEtiquetasMassa({
            inputId: 'epocas-massa-valor',
            chipsId: 'epocas-massa-valor-chips',
            chave: campo,
            placeholder: `${campo === 'esfera' ? 'Esfera' : 'Categoria'}: Enter adiciona`,
        });
    }
}

function popularControles() {
    const campo = el('epocas-massa-campo');
    if (campo && campo.options.length === 0) {
        campo.innerHTML = CAMPOS_MASSA_PERIODO_BIOGRAFICO.map(
            (c) => `<option value="${c.chave}">${c.rotulo}</option>`,
        ).join('');
        campo.onchange = mostrarGrupoDoCampo;
    }
    mostrarGrupoDoCampo();

    const pessoas = pessoasParaSeletor().map((p) => ({
        valor: String(p.id),
        rotulo: rotuloPessoa(p),
    }));
    preencherSelect(el('epocas-massa-pessoa'), pessoas, 'Escolher pessoa…');
    preencherSelectPai();
    const pontas = [{ valor: AUTOR, rotulo: 'Autor do período' }, ...pessoas];
    preencherSelect(el('epocas-massa-de'), pontas, 'Quem…');
    preencherSelect(el('epocas-massa-para'), pontas, 'Com quem…');
    preencherSelect(
        el('epocas-massa-natureza'),
        opcoesDoPeriodoBiografico(db, 'naturezas').map((n) => ({ valor: n, rotulo: n })),
        'Natureza…',
    );

    preencherDatalist('sugestoes-epocas-massa-esferas', opcoesDoPeriodoBiografico(db, 'esferas'));
    preencherDatalist(
        'sugestoes-epocas-massa-categorias',
        opcoesDoPeriodoBiografico(db, 'categorias'),
    );
    preencherDatalist('sugestoes-epocas-massa-vinculos', opcoesDoPeriodoBiografico(db, 'vinculos'));

    const botao = el('epocas-massa-ocultas');
    if (botao) {
        // Sem nenhuma pessoa oculta no cadastro o botão não teria o que mostrar.
        botao.classList.toggle('hidden', !db.pessoas.some((p) => p.oculto));
        botao.setAttribute('aria-pressed', String(mostrarOcultasNaBarra));
        botao.textContent = mostrarOcultasNaBarra ? 'Esconder ocultas' : 'Mostrar ocultas';
    }
}

export function alternarOcultasNaBarraEpocas() {
    mostrarOcultasNaBarra = !mostrarOcultasNaBarra;
    popularControles();
}

export function atualizarBarraSelecaoEpocas() {
    const barra = el('barra-acoes-epocas');
    if (!barra) return;
    const n = selecaoEpocas.size;
    barra.classList.toggle('hidden', n === 0);
    const contador = el('contador-selecao-epocas');
    if (contador) {
        contador.innerText = `${n} período${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}`;
    }
    if (n === 0) {
        mostrarOcultasNaBarra = false;
        return;
    }
    popularControles();
}

// ─── Aplicar ─────────────────────────────────────────────────────────────

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// "Esfera ... acrescentada" / "Esferas ... acrescentadas".
const plural_s = (op) => (op.valores?.length > 1 ? 's' : '');

function lerOperacao() {
    const valorDe = (id) => el(id)?.value ?? '';
    const campo = valorDe('epocas-massa-campo');
    const acao = valorDe('epocas-massa-acao');
    if (campo === 'esfera' || campo === 'categoria') {
        return { campo, acao, valores: lerEtiquetasMassa('epocas-massa-valor') };
    }
    if (campo === 'pessoa') return { campo, acao, pessoaId: valorDe('epocas-massa-pessoa') };
    if (campo === 'pai') return { campo, acao, paiId: valorDe('epocas-massa-pai') };
    if (campo === 'evento') return { campo, acao };
    const ponta = (v) => (v === AUTOR || v === '' ? v : Number(v));
    return {
        campo,
        acao,
        de: ponta(valorDe('epocas-massa-de')),
        para: ponta(valorDe('epocas-massa-para')),
        natureza: valorDe('epocas-massa-natureza'),
        vinculo: valorDe('epocas-massa-vinculo').trim(),
    };
}

function nomeDaPonta(valor) {
    if (valor === AUTOR) return 'Autor do período';
    return db.pessoas.find((p) => p.id == valor)?.nome || 'Pessoa';
}

const nomeDoPeriodo = (id) => db.epocas.find((e) => e.id == id)?.nome || 'período';

function descricaoDaOperacao(op) {
    if (op.campo === 'esfera') return rotuloComValores('Esfera', 'Esferas', op.valores);
    if (op.campo === 'categoria') return rotuloComValores('Categoria', 'Categorias', op.valores);
    if (op.campo === 'pessoa') return `Pessoa "${nomeDaPonta(op.pessoaId)}"`;
    if (op.campo === 'pai') return `Período pai "${nomeDoPeriodo(op.paiId)}"`;
    if (op.campo === 'evento') return 'Marca de evento';
    const como = [op.natureza, op.vinculo].filter(Boolean).join(' / ');
    return `Relação "${nomeDaPonta(op.de)} → ${nomeDaPonta(op.para)}: ${como}"`;
}

// Por que um período não pôde entrar no pai escolhido (ver aplicarPaiNoPeriodo
// em periodo-biografico-massa.js).
const MOTIVOS_RECUSA = {
    proprio: 'é o próprio pai',
    ciclo: 'o pai escolhido está dentro dele',
    autor: 'é de outro autor',
    depois: 'começa depois do fim do pai',
    antes: 'termina antes do começo do pai',
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
    limparEtiquetasMassa('epocas-massa-valor');
    const vinculo = el('epocas-massa-vinculo');
    if (vinculo) vinculo.value = '';
    [
        'epocas-massa-pessoa',
        'epocas-massa-pai',
        'epocas-massa-de',
        'epocas-massa-para',
        'epocas-massa-natureza',
    ].forEach((id) => {
        const campo = el(id);
        if (campo) campo.value = '';
    });
}

function executar(op, ids) {
    const resultado = aplicarMassaPeriodosBiograficos(db, ids, op);
    if (resultado.erro) {
        mostrarAviso(resultado.erro, 'info');
        return;
    }
    const adicionar = op.acao === 'adicionar';
    const descricao = descricaoDaOperacao(op);
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
    renderEpocas();
    const ignorados = resultado.iguais;
    const verbo = adicionar ? 'já tinha' : 'não tinha';
    const resto = ignorados > 0 ? ` (${ignorados} ${verbo}${ignorados === 1 ? '' : 'm'})` : '';
    // "Período pai" é masculino; os demais campos (Esfera, Categoria, Pessoa,
    // Relação) são femininos.
    const participio =
        op.campo === 'pai'
            ? adicionar
                ? 'acrescentado a'
                : 'removido de'
            : `${adicionar ? 'acrescentada' : 'removida'}${plural_s(op)} ${adicionar ? 'a' : 'de'}`;
    const recusa = recusados.length ? ` ${fraseDasRecusas(recusados)}` : '';
    // A marca de evento não é "acrescentada a": diz o que aconteceu.
    const frase =
        op.campo === 'evento'
            ? adicionar
                ? `${plural(n, 'período marcado', 'períodos marcados')} como evento${resto}.`
                : `Marca de evento tirada de ${plural(n, 'período', 'períodos')}${resto}.`
            : `${descricao} ${participio} ${plural(n, 'período', 'períodos')}${resto}.${recusa}`;
    mostrarAvisoComAcao(
        frase,
        'Desfazer',
        () => {
            restaurarMassaPeriodosBiograficos(db, resultado.alterados);
            save();
            renderEpocas();
        },
        recusados.length ? 8000 : 6000,
    );
}

export function aplicarMassaEpocas() {
    if (selecaoEpocas.size === 0) return;
    const op = lerOperacao();
    const erro = validarOperacao(op);
    if (erro) {
        mostrarAviso(erro, 'info');
        return;
    }
    const ids = [...selecaoEpocas];

    // "Autor do período" vale para o autor de cada período: com mais de um
    // autor na seleção, cada período recebe a relação com o autor dele.
    if (operacaoUsaAutor(op)) {
        const autores = autoresDaSelecao(db, ids);
        if (autores.length > 1) {
            abrirModalConfirmacao({
                titulo: 'A seleção tem períodos de mais de um autor',
                rotulo: 'Autor do período',
                mensagem: `Os ${ids.length} períodos selecionados são de ${autores.length} autores (${autores.join(', ')}). "Autor do período" vale, em cada período, para o autor dele: cada um vai ficar com a relação ligada ao próprio autor, não a um autor só.`,
                textoConfirmar: 'Aplicar mesmo assim',
                corConfirmar: '#4f46e5',
                onConfirmar: () => executar(op, ids),
            });
            return;
        }
    }
    executar(op, ids);
}
