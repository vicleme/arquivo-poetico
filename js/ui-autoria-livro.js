// ============================================================
// ui-autoria-livro.js: tela da Autoria no modal do Livro e da
// Coletânea (Fase 19, etapa 4, entrega 2). Uma linha por Autor do
// cadastro, com os papéis dele naquele livro em caixas (a lista
// fechada) mais "Outro", para texto livre. A lógica pura mora em
// autoria-livro.js, mesma divisão de ui-sumario.js e sumario.js.
//
// A ORDEM dos papéis é a da escolha (pode indicar importância), e não
// a das caixas: cada linha guarda a sua lista em `linha._papeis`, e
// marcar uma caixa põe o papel no fim, desmarcar tira.
// ============================================================

import { db } from './db.js';
import { escapeHtml, mostrarAviso } from './utils.js';
import {
    PAPEIS_AUTORIA_LIVRO,
    ROTULO_PAPEL_OUTRO,
    chavePapel,
    normalizarPapeis,
    normalizarAutoriaLivro,
    papelDaLista,
    papeisLivresUsados,
    pendenciasDaAutoria,
} from './autoria-livro.js';

function lista() {
    return document.getElementById('l-autoria-lista');
}

function autoresOrdenados() {
    return [...(db.autores || [])].sort((a, b) =>
        String(a.nome).localeCompare(String(b.nome), 'pt-BR'),
    );
}

// Opções do select de Autor. Um id que não existe mais no cadastro (importação
// antiga) ganha uma opção própria, para o salvar não apagar o dado em silêncio.
function opcoesDeAutor(autorIdAtual) {
    const autores = autoresOrdenados();
    let html = '<option value="">-- Escolha o Autor --</option>';
    html += autores
        .map((a) => `<option value="${escapeHtml(String(a.id))}">${escapeHtml(a.nome)}</option>`)
        .join('');
    const existe = autores.some((a) => String(a.id) === String(autorIdAtual));
    if (autorIdAtual !== '' && autorIdAtual !== undefined && autorIdAtual !== null && !existe) {
        html += `<option value="${escapeHtml(String(autorIdAtual))}">(Autor não cadastrado, id ${escapeHtml(String(autorIdAtual))})</option>`;
    }
    return html;
}

function atualizarSugestoes() {
    const dl = document.getElementById('sugestoes-papel-autoria-livro');
    if (!dl) return;
    dl.innerHTML = papeisLivresUsados(db.livros)
        .map((p) => `<option value="${escapeHtml(p)}"></option>`)
        .join('');
}

function atualizarContagem() {
    const el = document.getElementById('l-autoria-contagem');
    if (!el) return;
    const n = lista()?.children.length || 0;
    el.textContent = n === 0 ? 'Nenhum autor' : n === 1 ? '1 autor' : `${n} autores`;
}

// Adicionar, remover e marcar papel mexem em coisas fora dos campos do
// formulário: avisa o rastreador de alterações do Livro.
function avisarAlteracao() {
    lista()?.dispatchEvent(new Event('input', { bubbles: true }));
}

// Redesenha o que depende da lista de papéis da linha: caixas da lista fechada
// e os papéis livres (chips com ×).
function atualizarPapeisDaLinha(linha) {
    const papeis = linha._papeis;
    linha.querySelectorAll('[data-autoria-papel]').forEach((caixa) => {
        caixa.checked = papeis.some((p) => chavePapel(p) === chavePapel(caixa.value));
    });
    const chips = linha.querySelector('[data-autoria-livres]');
    const livres = papeis.filter((p) => papelDaLista(p) === null);
    chips.replaceChildren(
        ...livres.map((p) => {
            const chip = document.createElement('span');
            chip.className =
                'inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-full pl-2 pr-1 text-[11px]';
            chip.textContent = p;
            const x = document.createElement('button');
            x.type = 'button';
            x.dataset.autoriaAcao = 'remover-papel';
            x.dataset.papel = p;
            x.title = 'Remover papel';
            x.setAttribute('aria-label', `Remover papel ${p}`);
            x.className = 'px-1 text-red-400 hover:text-red-600';
            x.textContent = '×';
            chip.appendChild(x);
            return chip;
        }),
    );
}

function criarLinha({ autorId = '', papeis = [] } = {}) {
    const linha = document.createElement('div');
    linha.className =
        'border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-900';
    linha.dataset.autoriaLinha = '1';
    linha._papeis = normalizarPapeis(papeis);
    // Id como veio do dado: o select só devolve texto, e um Autor que não está no
    // cadastro (importação antiga) precisa voltar com o mesmo tipo ao salvar.
    linha._autorIdOriginal = autorId;
    const caixas = PAPEIS_AUTORIA_LIVRO.map(
        (p) =>
            `<label class="inline-flex items-center gap-1 cursor-pointer"><input type="checkbox" data-autoria-papel value="${escapeHtml(p)}" />${escapeHtml(p)}</label>`,
    ).join('');
    linha.innerHTML = `
        <div class="flex items-center gap-1.5">
            <select data-autoria="autor" aria-label="Autor" class="flex-1 min-w-0">${opcoesDeAutor(autorId)}</select>
            <button type="button" data-autoria-acao="remover" title="Remover autor" aria-label="Remover autor" class="flex-shrink-0 px-2 py-1 rounded text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40">×</button>
        </div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs normal-case font-normal">
            ${caixas}
            <span class="inline-flex items-center gap-1">
                <input type="text" data-autoria="outro" list="sugestoes-papel-autoria-livro" aria-label="${ROTULO_PAPEL_OUTRO}: outro papel" placeholder="${ROTULO_PAPEL_OUTRO} (Enter)" class="text-xs w-36" style="margin-bottom: 0" />
            </span>
            <span data-autoria-livres class="inline-flex flex-wrap items-center gap-1"></span>
        </div>
    `;
    // O id entra pelo DOM, não pelo HTML, para o valor nunca quebrar o atributo.
    linha.querySelector('[data-autoria="autor"]').value = String(autorId ?? '');
    atualizarPapeisDaLinha(linha);
    return linha;
}

// Troca a lista do modal pelos vínculos dados.
export function renderAutoriaNoModal(autoria = []) {
    const box = lista();
    if (!box) return;
    atualizarSugestoes();
    box.replaceChildren(...normalizarAutoriaLivro(autoria).map((v) => criarLinha(v)));
    atualizarContagem();
}

export function limparAutoriaDoModal() {
    renderAutoriaNoModal([]);
}

// Papel livre digitado e ainda não confirmado com Enter entra no salvar, como
// as tags de "Conhecido(a) como".
function papeisDaLinha(linha) {
    const pendente = linha.querySelector('[data-autoria="outro"]').value;
    return normalizarPapeis([...linha._papeis, pendente]);
}

// Lê as linhas do modal: `[{ autorId, papeis }]`. Linha sem Autor e sem papel é
// descartada; linha com papel e sem Autor continua na lista (com autorId vazio)
// para `validarAutoriaDoModal` poder avisar.
export function lerAutoriaDoModal() {
    const box = lista();
    if (!box) return [];
    return Array.from(box.children)
        .map((linha) => ({
            autorId: linha.querySelector('[data-autoria="autor"]').value,
            papeis: papeisDaLinha(linha),
        }))
        .filter((v) => v.autorId !== '' || v.papeis.length > 0);
}

// Mensagem de erro do formulário, ou `null` quando está tudo certo: toda linha
// precisa de Autor e de pelo menos um papel (a lógica pura mantém vínculo sem
// papel para uma importação não apagar dado; quem exige é o formulário).
export function validarAutoriaDoModal() {
    const vinculos = lerAutoriaDoModal();
    if (vinculos.some((v) => v.autorId === '')) {
        return 'Escolha o Autor em cada linha da Autoria, ou remova a linha.';
    }
    if (pendenciasDaAutoria(vinculos).semPapel.length > 0) {
        return 'Marque pelo menos um papel para cada Autor da Autoria.';
    }
    return null;
}

// O select de Autor devolve o id como texto; o dado do livro usa o id do cadastro
// (número) ou, para um Autor que não está lá, o id como veio. Devolve a autoria
// pronta para `camposAutoriaLivro`.
export function autoriaParaGravar() {
    const box = lista();
    if (!box) return [];
    return Array.from(box.children)
        .map((linha) => {
            const escolhido = linha.querySelector('[data-autoria="autor"]').value;
            const autor = (db.autores || []).find((a) => String(a.id) === escolhido);
            const original =
                String(linha._autorIdOriginal) === escolhido ? linha._autorIdOriginal : escolhido;
            return { autorId: autor ? autor.id : original, papeis: papeisDaLinha(linha) };
        })
        .filter((v) => v.autorId !== '' || v.papeis.length > 0);
}

function adicionarLinha() {
    const box = lista();
    if (!box) return;
    if ((db.autores || []).length === 0) {
        // Sem Autor no cadastro a linha não teria o que escolher.
        mostrarAviso('Cadastre um Autor na aba Autores antes de preencher a Autoria.');
        return;
    }
    const linha = criarLinha();
    box.appendChild(linha);
    atualizarContagem();
    avisarAlteracao();
    linha.querySelector('[data-autoria="autor"]').focus();
}

function confirmarOutro(linha) {
    const campo = linha.querySelector('[data-autoria="outro"]');
    const texto = campo.value.trim();
    if (!texto) return;
    linha._papeis = normalizarPapeis([...linha._papeis, texto]);
    campo.value = '';
    atualizarPapeisDaLinha(linha);
    avisarAlteracao();
}

// Liga os botões e os campos da lista (sem handler inline, nada em `window`).
// Chamada uma vez, quando o modal do Livro é carregado.
export function ligarAutoriaLivroNoModal() {
    const modal = document.getElementById('modal-livro');
    if (!modal || modal.dataset.autoriaLigada) return;
    modal.dataset.autoriaLigada = '1';

    document.getElementById('l-autoria-adicionar')?.addEventListener('click', adicionarLinha);

    const box = lista();
    if (!box) return;

    box.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-autoria-acao]');
        if (!botao) return;
        const linha = botao.closest('[data-autoria-linha]');
        if (!linha) return;
        if (botao.dataset.autoriaAcao === 'remover') {
            linha.remove();
            atualizarContagem();
            avisarAlteracao();
        } else if (botao.dataset.autoriaAcao === 'remover-papel') {
            linha._papeis = linha._papeis.filter(
                (p) => chavePapel(p) !== chavePapel(botao.dataset.papel),
            );
            atualizarPapeisDaLinha(linha);
            avisarAlteracao();
        }
    });

    // Caixa da lista fechada: marcar põe o papel no fim, desmarcar tira.
    box.addEventListener('change', (e) => {
        const caixa = e.target.closest?.('[data-autoria-papel]');
        if (!caixa) return;
        const linha = caixa.closest('[data-autoria-linha]');
        if (!linha) return;
        linha._papeis = caixa.checked
            ? normalizarPapeis([...linha._papeis, caixa.value])
            : linha._papeis.filter((p) => chavePapel(p) !== chavePapel(caixa.value));
        atualizarPapeisDaLinha(linha);
    });

    // Enter no campo "Outro" confirma o papel e não envia o formulário.
    box.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const campo = e.target.closest?.('[data-autoria="outro"]');
        if (!campo) return;
        e.preventDefault();
        confirmarOutro(campo.closest('[data-autoria-linha]'));
    });
}
