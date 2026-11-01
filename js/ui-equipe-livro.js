// ============================================================
// ui-equipe-livro.js: tela da "Equipe e créditos" no modal do Livro e da
// Coletânea (Fase 19, etapa 6, entrega 3). Uma linha por Colaborador do
// cadastro, e dentro dela uma linha por papel, cada uma com o seu escopo
// opcional (Capa, Miolo...). A lógica pura mora em colaboradores-livro.js,
// mesma divisão de ui-autoria-livro.js.
//
// Diferente da Autoria, aqui cada papel tem escopo próprio, então os papéis
// não são caixas: cada um é uma linha com um seletor (a lista fechada mais
// "Outro", para texto livre) e um campo de escopo. A mesma pessoa pode repetir
// o papel com escopos diferentes (Ilustrador de capa e de miolo).
// ============================================================

import { db } from './db.js';
import { escapeHtml, mostrarAviso } from './utils.js';
import {
    PAPEIS_EQUIPE_LIVRO,
    escoposEquipeSugeridos,
    normalizarEquipeLivro,
    papelEquipeDaLista,
    papeisEquipeLivresUsados,
    pendenciasDaEquipe,
} from './colaboradores-livro.js';
import { ROTULO_PAPEL_OUTRO } from './autoria-livro.js';

// Valor do seletor para "texto livre". Não é papel gravado.
const VALOR_OUTRO = '__outro__';

function lista() {
    return document.getElementById('l-equipe-lista');
}

function colaboradoresOrdenados() {
    return [...(db.colaboradores || [])].sort((a, b) =>
        String(a.nome).localeCompare(String(b.nome), 'pt-BR'),
    );
}

// Opções do select de Colaborador. Um id que não existe mais no cadastro
// (importação antiga) ganha uma opção própria, para o salvar não apagar o dado
// em silêncio.
function opcoesDeColaborador(idAtual) {
    const todos = colaboradoresOrdenados();
    let html = '<option value="">-- Escolha o Colaborador --</option>';
    html += todos
        .map((c) => `<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.nome)}</option>`)
        .join('');
    const existe = todos.some((c) => String(c.id) === String(idAtual));
    if (idAtual !== '' && idAtual !== undefined && idAtual !== null && !existe) {
        html += `<option value="${escapeHtml(String(idAtual))}">(Colaborador não cadastrado, id ${escapeHtml(String(idAtual))})</option>`;
    }
    return html;
}

function atualizarSugestoes() {
    const papeis = document.getElementById('sugestoes-papel-equipe-livro');
    if (papeis) {
        papeis.innerHTML = papeisEquipeLivresUsados(db.livros)
            .map((p) => `<option value="${escapeHtml(p)}"></option>`)
            .join('');
    }
    const escopos = document.getElementById('sugestoes-escopo-equipe-livro');
    if (escopos) {
        escopos.innerHTML = escoposEquipeSugeridos(db.livros)
            .map((e) => `<option value="${escapeHtml(e)}"></option>`)
            .join('');
    }
}

function atualizarContagem() {
    const el = document.getElementById('l-equipe-contagem');
    if (!el) return;
    const n = lista()?.children.length || 0;
    el.textContent = n === 0 ? 'Ninguém' : n === 1 ? '1 pessoa' : `${n} pessoas`;
}

// Adicionar, remover e trocar papel mexem em coisas fora dos campos do
// formulário: avisa o rastreador de alterações do Livro.
function avisarAlteracao() {
    lista()?.dispatchEvent(new Event('input', { bubbles: true }));
}

function criarLinhaDePapel({ papel = '', escopo = '' } = {}) {
    const daLista = papelEquipeDaLista(papel);
    const linha = document.createElement('div');
    linha.className = 'flex flex-wrap items-center gap-1.5';
    linha.dataset.equipePapel = '1';
    const opcoes = PAPEIS_EQUIPE_LIVRO.map(
        (p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`,
    ).join('');
    linha.innerHTML = `
        <select data-equipe="papel" aria-label="Papel" class="text-xs" style="width: auto; margin-bottom: 0">
            <option value="">-- Papel --</option>
            ${opcoes}
            <option value="${VALOR_OUTRO}">${ROTULO_PAPEL_OUTRO}</option>
        </select>
        <input type="text" data-equipe="papel-outro" list="sugestoes-papel-equipe-livro" aria-label="Outro papel" placeholder="Qual papel?" class="text-xs w-36 hidden" style="margin-bottom: 0" />
        <input type="text" data-equipe="escopo" list="sugestoes-escopo-equipe-livro" aria-label="Escopo (opcional)" placeholder="Escopo (opcional)" class="text-xs w-40" style="margin-bottom: 0" />
        <button type="button" data-equipe-acao="remover-papel" title="Remover papel" aria-label="Remover papel" class="flex-shrink-0 px-2 py-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40">×</button>
    `;
    const select = linha.querySelector('[data-equipe="papel"]');
    const outro = linha.querySelector('[data-equipe="papel-outro"]');
    // Os valores entram pelo DOM, não pelo HTML, para nunca quebrar o atributo.
    if (daLista) {
        select.value = daLista;
    } else if (papel) {
        select.value = VALOR_OUTRO;
        outro.value = papel;
        outro.classList.remove('hidden');
    }
    linha.querySelector('[data-equipe="escopo"]').value = escopo;
    return linha;
}

function criarLinha({ colaboradorId = '', papeis = [] } = {}) {
    const linha = document.createElement('div');
    linha.className =
        'border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-900';
    linha.dataset.equipeLinha = '1';
    // Id como veio do dado: o select só devolve texto, e um Colaborador que não
    // está no cadastro (importação antiga) precisa voltar com o mesmo tipo.
    linha._colaboradorIdOriginal = colaboradorId;
    linha.innerHTML = `
        <div class="flex items-center gap-1.5">
            <select data-equipe="colaborador" aria-label="Colaborador" class="flex-1 min-w-0">${opcoesDeColaborador(colaboradorId)}</select>
            <button type="button" data-equipe-acao="remover" title="Remover colaborador" aria-label="Remover colaborador" class="flex-shrink-0 px-2 py-1 rounded text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40">×</button>
        </div>
        <div data-equipe-papeis class="space-y-1.5 mt-2 text-xs normal-case font-normal"></div>
        <button type="button" data-equipe-acao="adicionar-papel" class="mt-2 text-[11px] border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">+ Papel</button>
    `;
    linha.querySelector('[data-equipe="colaborador"]').value = String(colaboradorId ?? '');
    const caixa = linha.querySelector('[data-equipe-papeis]');
    papeis.forEach((p) => caixa.appendChild(criarLinhaDePapel(p)));
    return linha;
}

// Troca a lista do modal pela equipe dada.
export function renderEquipeNoModal(equipe = []) {
    const box = lista();
    if (!box) return;
    atualizarSugestoes();
    box.replaceChildren(...normalizarEquipeLivro(equipe).map((v) => criarLinha(v)));
    atualizarContagem();
}

export function limparEquipeDoModal() {
    renderEquipeNoModal([]);
}

// Papel e escopo digitados numa linha de papel (texto cru, sem normalizar).
function lerLinhaDePapel(linhaPapel) {
    const escolhido = linhaPapel.querySelector('[data-equipe="papel"]').value;
    const papel =
        escolhido === VALOR_OUTRO
            ? linhaPapel.querySelector('[data-equipe="papel-outro"]').value
            : escolhido;
    return { papel, escopo: linhaPapel.querySelector('[data-equipe="escopo"]').value };
}

function papeisDaLinha(linha) {
    return Array.from(linha.querySelectorAll('[data-equipe-papel]')).map(lerLinhaDePapel);
}

// Lê as linhas do modal: `[{ colaboradorId, papeis }]`, com o id como texto.
// Linha sem Colaborador e sem papel é descartada; linha com papel e sem
// Colaborador continua (com id vazio) para `validarEquipeDoModal` avisar.
export function lerEquipeDoModal() {
    const box = lista();
    if (!box) return [];
    return Array.from(box.children)
        .map((linha) => ({
            colaboradorId: linha.querySelector('[data-equipe="colaborador"]').value,
            papeis: papeisDaLinha(linha),
        }))
        .filter(
            (v) =>
                v.colaboradorId !== '' || v.papeis.some((p) => p.papel.trim() || p.escopo.trim()),
        );
}

// Mensagem de erro do formulário, ou `null` quando está tudo certo: toda linha
// precisa de Colaborador e de pelo menos um papel (a lógica pura mantém vínculo
// sem papel para uma importação não apagar dado; quem exige é o formulário).
export function validarEquipeDoModal() {
    const vinculos = lerEquipeDoModal();
    if (vinculos.some((v) => v.colaboradorId === '')) {
        return 'Escolha o Colaborador em cada linha da Equipe e créditos, ou remova a linha.';
    }
    if (pendenciasDaEquipe(vinculos).semPapel.length > 0) {
        return 'Escolha pelo menos um papel para cada Colaborador da Equipe e créditos.';
    }
    return null;
}

// O select devolve o id como texto; o dado do livro usa o id do cadastro
// (número) ou, para um Colaborador que não está lá, o id como veio. Devolve a
// equipe pronta para `camposEquipeLivro`.
export function equipeParaGravar() {
    const box = lista();
    if (!box) return [];
    return Array.from(box.children)
        .map((linha) => {
            const escolhido = linha.querySelector('[data-equipe="colaborador"]').value;
            const colaborador = (db.colaboradores || []).find((c) => String(c.id) === escolhido);
            const original =
                String(linha._colaboradorIdOriginal) === escolhido
                    ? linha._colaboradorIdOriginal
                    : escolhido;
            return {
                colaboradorId: colaborador ? colaborador.id : original,
                papeis: papeisDaLinha(linha),
            };
        })
        .filter((v) => v.colaboradorId !== '' || v.papeis.length > 0);
}

function adicionarLinha() {
    const box = lista();
    if (!box) return;
    if ((db.colaboradores || []).length === 0) {
        // Sem Colaborador no cadastro a linha não teria o que escolher.
        mostrarAviso('Cadastre um Colaborador na aba Colaboradores antes de preencher a Equipe.');
        return;
    }
    const linha = criarLinha({ papeis: [{}] });
    box.appendChild(linha);
    atualizarContagem();
    avisarAlteracao();
    linha.querySelector('[data-equipe="colaborador"]').focus();
}

// Liga os botões e os campos da lista (sem handler inline, nada em `window`).
// Chamada uma vez, quando o modal do Livro é carregado.
export function ligarEquipeLivroNoModal() {
    const modal = document.getElementById('modal-livro');
    if (!modal || modal.dataset.equipeLigada) return;
    modal.dataset.equipeLigada = '1';

    document.getElementById('l-equipe-adicionar')?.addEventListener('click', adicionarLinha);

    const box = lista();
    if (!box) return;

    box.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-equipe-acao]');
        if (!botao) return;
        const acao = botao.dataset.equipeAcao;
        if (acao === 'remover') {
            botao.closest('[data-equipe-linha]')?.remove();
            atualizarContagem();
            avisarAlteracao();
        } else if (acao === 'adicionar-papel') {
            const caixa = botao
                .closest('[data-equipe-linha]')
                ?.querySelector('[data-equipe-papeis]');
            if (!caixa) return;
            const nova = criarLinhaDePapel();
            caixa.appendChild(nova);
            avisarAlteracao();
            nova.querySelector('[data-equipe="papel"]').focus();
        } else if (acao === 'remover-papel') {
            botao.closest('[data-equipe-papel]')?.remove();
            avisarAlteracao();
        }
    });

    // "Outro" mostra o campo de texto livre; qualquer outro papel esconde.
    box.addEventListener('change', (e) => {
        const select = e.target.closest?.('[data-equipe="papel"]');
        if (!select) return;
        const outro = select
            .closest('[data-equipe-papel]')
            .querySelector('[data-equipe="papel-outro"]');
        const livre = select.value === VALOR_OUTRO;
        outro.classList.toggle('hidden', !livre);
        if (livre) outro.focus();
        else outro.value = '';
    });

    // Enter nos campos da lista não envia o formulário.
    box.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches?.('input')) e.preventDefault();
    });
}
