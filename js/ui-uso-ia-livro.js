// ============================================================
// ui-uso-ia-livro.js: tela do Uso de IA no modal do Livro e da
// Coletânea (Fase 19, etapa 5, entrega 2). Seletor de estado, lista
// de usos (visível só com "Usou") e nota geral. A lógica pura mora em
// uso-ia-livro.js, mesma divisão de ui-autoria-livro.js.
//
// Ordem dos campos de cada uso: Onde, Ferramenta, Modelo e versão,
// Descrição, Data, Texto do acervo (F19-D12) e, por último, Como foi usada.
// ============================================================

import { db } from './db.js';
import { escapeHtml } from './utils.js';
import {
    COMO_USO_IA,
    camposUsoIa,
    ferramentasUsadas,
    modelosUsados,
    normalizarEstado,
    ondeUsados,
    pendenciasDoUsoIa,
    usoIaDoLivro,
} from './uso-ia-livro.js';

const MESES = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];

const el = (id) => document.getElementById(id);
const lista = () => el('l-uso-ia-lista');

function preencherDatalist(id, valores) {
    const dl = el(id);
    if (dl) {
        dl.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
    }
}

function atualizarSugestoes() {
    preencherDatalist('sugestoes-uso-ia-onde', ondeUsados(db.livros));
    preencherDatalist('sugestoes-uso-ia-ferramenta', ferramentasUsadas(db.livros));
    preencherDatalist('sugestoes-uso-ia-modelo', modelosUsados(db.livros));
}

function avisarAlteracao() {
    lista()?.dispatchEvent(new Event('input', { bubbles: true }));
}

function atualizarContagem() {
    const c = el('l-uso-ia-contagem');
    if (!c) return;
    const usou = normalizarEstado(el('l-uso-ia-estado')?.value) === 'usou';
    const n = lista()?.children.length || 0;
    c.textContent = !usou ? '' : n === 0 ? 'Nenhum uso' : n === 1 ? '1 uso' : `${n} usos`;
}

function mostrarBlocoSeUsou() {
    const usou = normalizarEstado(el('l-uso-ia-estado')?.value) === 'usou';
    el('l-uso-ia-bloco')?.classList.toggle('hidden', !usou);
    atualizarContagem();
}

// Opções do select de texto do acervo. Vínculo cujo texto sumiu ganha uma
// opção própria, para o salvar não apagar o dado em silêncio.
function opcoesDeTexto(ref) {
    const ordenar = (arr) =>
        [...(arr || [])].sort((a, b) =>
            String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR'),
        );
    const opt = (tipo, t) =>
        `<option value="${tipo}:${escapeHtml(String(t.id))}">${escapeHtml(t.titulo || '(sem título)')}</option>`;
    let html = '<option value="">-- Nenhum --</option>';
    html += `<optgroup label="Poemas">${ordenar(db.poemas)
        .map((t) => opt('poema', t))
        .join('')}</optgroup>`;
    html += `<optgroup label="Prosas">${ordenar(db.prosas)
        .map((t) => opt('prosa', t))
        .join('')}</optgroup>`;
    if (ref) {
        const lista = ref.tipo === 'poema' ? db.poemas : db.prosas;
        const existe = (lista || []).some((t) => String(t.id) === String(ref.id));
        if (!existe) {
            html += `<option value="${ref.tipo}:${escapeHtml(String(ref.id))}">(texto não encontrado, id ${escapeHtml(String(ref.id))})</option>`;
        }
    }
    return html;
}

function criarLinha(uso = {}) {
    const linha = document.createElement('div');
    linha.className =
        'border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-900';
    linha.dataset.usoLinha = '1';
    // Id do texto como veio do dado (o select só devolve texto).
    linha._textoOriginal = uso.texto || null;
    linha.innerHTML = `
        <div class="flex items-start justify-between gap-2">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1 min-w-0">
                <div>
                    <label class="form-label">Onde foi usada</label>
                    <input type="text" data-uso="onde" list="sugestoes-uso-ia-onde" placeholder="Capa, Texto, Revisão..." />
                </div>
                <div>
                    <label class="form-label">Ferramenta</label>
                    <input type="text" data-uso="ferramenta" list="sugestoes-uso-ia-ferramenta" placeholder="ChatGPT, Midjourney..." />
                </div>
                <div>
                    <label class="form-label">Modelo e versão <span class="font-normal normal-case text-gray-400">(opcional)</span></label>
                    <input type="text" data-uso="modelo" list="sugestoes-uso-ia-modelo" placeholder="GPT-4o, Flux..." />
                </div>
            </div>
            <button type="button" data-uso-acao="remover" title="Remover uso" aria-label="Remover uso" class="flex-shrink-0 px-2 py-1 rounded text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40">×</button>
        </div>
        <div class="mt-2">
            <label class="form-label">Descrição</label>
            <textarea data-uso="descricao" class="h-14"></textarea>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <div>
                <label class="form-label">Data aproximada <span class="font-normal normal-case text-gray-400">(opcional)</span></label>
                <div class="flex gap-1.5">
                    <select data-uso="mes" aria-label="Mês" class="flex-1 min-w-0">
                        <option value="">Mês</option>
                        ${MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}
                    </select>
                    <input type="number" data-uso="ano" aria-label="Ano" min="1" max="2100" placeholder="Ano" class="w-24" />
                </div>
            </div>
            <div class="md:col-span-2">
                <label class="form-label">Texto do acervo <span class="font-normal normal-case text-gray-400">(opcional, para dizer que aquele texto foi feito com IA)</span></label>
                <select data-uso="texto">${opcoesDeTexto(uso.texto)}</select>
            </div>
        </div>
        <div class="mt-2">
            <label class="form-label">Como foi usada <span class="font-normal normal-case text-gray-400">(opcional)</span></label>
            <select data-uso="como" class="w-full md:w-72">
                <option value="">--</option>
                ${COMO_USO_IA.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
            </select>
        </div>
    `;
    // Valores entram pelo DOM, não pelo HTML, para nunca quebrarem o atributo.
    const campo = (n) => linha.querySelector(`[data-uso="${n}"]`);
    campo('onde').value = uso.onde || '';
    campo('ferramenta').value = uso.ferramenta || '';
    campo('modelo').value = uso.modelo || '';
    campo('descricao').value = uso.descricao || '';
    campo('mes').value = uso.data?.mes ? String(uso.data.mes) : '';
    campo('ano').value = uso.data?.ano ? String(uso.data.ano) : '';
    campo('texto').value = uso.texto ? `${uso.texto.tipo}:${uso.texto.id}` : '';
    campo('como').value = uso.como || '';
    // `dia` guardado por importação não aparece na tela; fica para o salvar.
    linha._dia = uso.data?.dia ?? null;
    return linha;
}

// Troca o conteúdo do modal pelo uso de IA do livro.
export function renderUsoIaNoModal(livro = null) {
    const uso = usoIaDoLivro(livro);
    atualizarSugestoes();
    el('l-uso-ia-estado').value = uso.estado;
    el('l-uso-ia-nota').value = uso.nota || '';
    lista()?.replaceChildren(...(uso.usos || []).map((u) => criarLinha(u)));
    mostrarBlocoSeUsou();
}

export function limparUsoIaDoModal() {
    if (!el('l-uso-ia-estado')) return;
    renderUsoIaNoModal(null);
}

function lerLinha(linha) {
    const v = (n) => linha.querySelector(`[data-uso="${n}"]`).value;
    const ano = v('ano');
    const mes = v('mes');
    const [tipo, ...resto] = v('texto').split(':');
    let texto = null;
    if (tipo) {
        const idTexto = resto.join(':');
        const lst = tipo === 'poema' ? db.poemas : db.prosas;
        const achado = (lst || []).find((t) => String(t.id) === idTexto);
        // Mantém o id com o tipo do dado (número do cadastro, ou como veio).
        const orig = linha._textoOriginal;
        const id = achado
            ? achado.id
            : orig && String(orig.id) === idTexto && orig.tipo === tipo
              ? orig.id
              : idTexto;
        texto = { tipo, id };
    }
    return {
        onde: v('onde'),
        ferramenta: v('ferramenta'),
        modelo: v('modelo'),
        descricao: v('descricao'),
        data: ano ? { ano, mes, dia: mes && linha._dia ? linha._dia : undefined } : null,
        texto,
        como: v('como'),
    };
}

// Objeto cru do formulário, pronto para `camposUsoIa`.
export function usoIaParaGravar() {
    const estado = normalizarEstado(el('l-uso-ia-estado')?.value);
    const usos = estado === 'usou' ? Array.from(lista()?.children || []).map(lerLinha) : [];
    return { estado, usos, nota: el('l-uso-ia-nota')?.value || '' };
}

export function camposUsoIaDoModal() {
    return camposUsoIa(usoIaParaGravar());
}

// Mensagem de erro do formulário, ou `null`: todo uso precisa dizer "onde".
export function validarUsoIaDoModal() {
    const bruto = usoIaParaGravar();
    // Linha totalmente vazia é ignorada pela normalização; só reclama de
    // linha com algum campo e sem "onde".
    if (pendenciasDoUsoIa(bruto).semOnde.length > 0) {
        return 'Diga onde a IA foi usada em cada uso do Uso de IA, ou remova a linha.';
    }
    return null;
}

function adicionarLinha() {
    const box = lista();
    if (!box) return;
    const linha = criarLinha();
    box.appendChild(linha);
    atualizarContagem();
    avisarAlteracao();
    linha.querySelector('[data-uso="onde"]').focus();
}

// Liga estado, botões e lista (sem handler inline, nada em `window`).
// Chamada uma vez, quando o modal do Livro é carregado.
export function ligarUsoIaLivroNoModal() {
    const modal = el('modal-livro');
    if (!modal || modal.dataset.usoIaLigado) return;
    modal.dataset.usoIaLigado = '1';

    el('l-uso-ia-estado')?.addEventListener('change', () => {
        mostrarBlocoSeUsou();
        // Escolher "Usou" numa lista vazia já abre a primeira linha.
        if (normalizarEstado(el('l-uso-ia-estado').value) === 'usou' && !lista()?.children.length) {
            adicionarLinha();
        }
    });
    el('l-uso-ia-adicionar')?.addEventListener('click', adicionarLinha);
    lista()?.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-uso-acao="remover"]');
        const linha = botao?.closest('[data-uso-linha]');
        if (!linha) return;
        linha.remove();
        atualizarContagem();
        avisarAlteracao();
    });
}
