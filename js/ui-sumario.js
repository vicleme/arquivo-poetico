// ============================================================
// ui-sumario.js: tela do tipo de elemento "Sumário" no modal do
// elemento. Lista editável de itens (nível, item, página), botão
// "Baixar modelo .json" e botão "Importar .json". A lógica pura
// (validação, modelo, normalização) mora em sumario.js, mesma
// divisão de ui-molde-json.js e molde-json.js.
// Pedido do Victor, 21/10/2026.
// ============================================================

import { mostrarAviso, abrirModalConfirmacao } from './utils.js';
import {
    TIPO_SUMARIO,
    NIVEL_MINIMO,
    NIVEL_MAXIMO,
    NOME_ARQUIVO_MODELO_SUMARIO,
    modeloSumarioComoTexto,
    validarJsonSumario,
    normalizarItensSumario,
} from './sumario.js';

const RECUO_POR_NIVEL_PX = 14;

function lista() {
    return document.getElementById('el-sumario-lista');
}

function opcoesDeNivel() {
    let html = '';
    for (let n = NIVEL_MINIMO; n <= NIVEL_MAXIMO; n++) {
        html += `<option value="${n}">${n}</option>`;
    }
    return html;
}

function atualizarRecuo(linha) {
    const nivel = Number(linha.querySelector('[data-sumario="nivel"]').value) || NIVEL_MINIMO;
    linha.style.marginLeft = `${(nivel - 1) * RECUO_POR_NIVEL_PX}px`;
}

function atualizarContagem() {
    const el = document.getElementById('el-sumario-contagem');
    if (!el) return;
    const n = lista()?.children.length || 0;
    el.textContent = n === 0 ? 'Nenhum item' : n === 1 ? '1 item' : `${n} itens`;
}

function criarLinha({ nivel = NIVEL_MINIMO, item = '', pagina = '' } = {}) {
    const linha = document.createElement('div');
    linha.className = 'flex items-center gap-1.5';
    linha.dataset.sumarioLinha = '1';
    linha.innerHTML = `
        <select data-sumario="nivel" aria-label="Nível" title="Nível (1 é o mais alto)" class="w-14 flex-shrink-0">${opcoesDeNivel()}</select>
        <input type="text" data-sumario="item" aria-label="Item" placeholder="Título do item" class="flex-1 min-w-0" />
        <input type="text" data-sumario="pagina" aria-label="Página" placeholder="Pág." class="w-16 flex-shrink-0" />
        <button type="button" data-sumario-acao="remover" title="Remover item" aria-label="Remover item" class="flex-shrink-0 px-2 py-1 rounded text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40">×</button>
    `;
    // Valores entram pelo DOM, não pelo HTML, para aspas no título não quebrarem o campo.
    linha.querySelector('[data-sumario="nivel"]').value = String(nivel);
    linha.querySelector('[data-sumario="item"]').value = item;
    linha.querySelector('[data-sumario="pagina"]').value = pagina;
    atualizarRecuo(linha);
    return linha;
}

// Troca a lista do modal pelos itens dados.
export function renderSumarioNoModal(itens = []) {
    const box = lista();
    if (!box) return;
    box.replaceChildren(...itens.map((i) => criarLinha(i)));
    atualizarContagem();
}

export function limparSumarioDoModal() {
    renderSumarioNoModal([]);
}

// Lê as linhas do modal. Linha sem título é descartada por normalizarItensSumario.
export function lerSumarioDoModal() {
    const box = lista();
    if (!box) return [];
    return Array.from(box.children).map((linha) => ({
        nivel: linha.querySelector('[data-sumario="nivel"]').value,
        item: linha.querySelector('[data-sumario="item"]').value,
        pagina: linha.querySelector('[data-sumario="pagina"]').value,
    }));
}

export function toggleCamposSumario() {
    const tipo = document.getElementById('el-tipo')?.value;
    document.getElementById('campos-sumario')?.classList.toggle('hidden', tipo !== TIPO_SUMARIO);
}

// Adicionar, remover e importar itens não disparam 'input' sozinhos: avisa o
// formulário (e o rastreador de alterações dele) de que a lista mudou.
function avisarAlteracao() {
    lista()?.dispatchEvent(new Event('input', { bubbles: true }));
}

function adicionarLinha() {
    const box = lista();
    if (!box) return;
    // O novo item herda o nível do último, que é o caso mais comum.
    const ultima = box.lastElementChild;
    const nivel = ultima ? Number(ultima.querySelector('[data-sumario="nivel"]').value) : 1;
    const linha = criarLinha({ nivel });
    box.appendChild(linha);
    atualizarContagem();
    avisarAlteracao();
    linha.querySelector('[data-sumario="item"]').focus();
}

function baixarBlob(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

export function baixarModeloSumario() {
    baixarBlob(
        new Blob([modeloSumarioComoTexto()], { type: 'application/json;charset=utf-8' }),
        NOME_ARQUIVO_MODELO_SUMARIO,
    );
}

function aplicarImportacao(itens, avisos, { acrescentar }) {
    const atuais = acrescentar ? normalizarItensSumario(lerSumarioDoModal()).itens : [];
    renderSumarioNoModal([...atuais, ...itens]);
    avisarAlteracao();
    const n = itens.length;
    mostrarAviso(`${n} ${n === 1 ? 'item importado' : 'itens importados'}.`, 'sucesso');
    avisos.forEach((a) => mostrarAviso(a, 'info'));
}

// onchange do <input type="file"> do Sumário.
export function importarSumarioDeArquivo(event) {
    const input = event.target;
    const arquivo = input?.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        // Limpa o input para escolher o mesmo arquivo de novo voltar a disparar onchange.
        input.value = '';

        let dados;
        try {
            dados = JSON.parse(e.target.result);
        } catch {
            mostrarAviso('Erro ao ler o arquivo. Confira se é um .json válido.');
            return;
        }
        const resultado = validarJsonSumario(dados);
        if (resultado.erro) {
            mostrarAviso(resultado.erro);
            return;
        }
        const { itens, avisos } = resultado;

        // Lista já preenchida: a pessoa escolhe entre substituir e acrescentar.
        // O que aparece no modal só vai para o banco ao salvar o elemento.
        if (normalizarItensSumario(lerSumarioDoModal()).itens.length > 0) {
            abrirModalConfirmacao({
                titulo: 'Importar sumário',
                rotulo: 'Sumário',
                mensagem:
                    'Já há itens nesta lista. Substituir apaga os atuais, acrescentar põe os importados no fim. Nada é gravado até você salvar o elemento.',
                textoConfirmar: 'Substituir',
                corConfirmar: '#2563eb',
                acaoSecundaria: {
                    texto: 'Acrescentar ao fim',
                    onClick: () => aplicarImportacao(itens, avisos, { acrescentar: true }),
                },
                onConfirmar: () => aplicarImportacao(itens, avisos, { acrescentar: false }),
            });
            return;
        }
        aplicarImportacao(itens, avisos, { acrescentar: false });
    };
    reader.onerror = () => mostrarAviso('Não foi possível ler o arquivo.');
    reader.readAsText(arquivo);
}

// Liga os botões e os campos da lista (sem handler inline, nada em window).
// Chamada uma vez, quando o modal do elemento é carregado.
export function ligarSumarioNoModal() {
    const modal = document.getElementById('modal-elemento');
    if (!modal || modal.dataset.sumarioLigado) return;
    modal.dataset.sumarioLigado = '1';

    document.getElementById('el-sumario-adicionar')?.addEventListener('click', adicionarLinha);
    document
        .getElementById('el-sumario-baixar-modelo')
        ?.addEventListener('click', baixarModeloSumario);
    const arquivo = document.getElementById('el-sumario-arquivo');
    document
        .getElementById('el-sumario-importar')
        ?.addEventListener('click', () => arquivo?.click());
    arquivo?.addEventListener('change', importarSumarioDeArquivo);

    const box = lista();
    box?.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-sumario-acao="remover"]');
        if (!botao) return;
        botao.closest('[data-sumario-linha]')?.remove();
        atualizarContagem();
        avisarAlteracao();
    });
    box?.addEventListener('change', (e) => {
        if (e.target.matches('[data-sumario="nivel"]')) {
            atualizarRecuo(e.target.closest('[data-sumario-linha]'));
        }
    });
    // Enter num campo da lista não envia o formulário: abre uma nova linha.
    box?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || !e.target.matches('input')) return;
        e.preventDefault();
        adicionarLinha();
    });
}
