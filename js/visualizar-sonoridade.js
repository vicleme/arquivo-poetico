// ============================================================
// visualizar-sonoridade.js — Modal de Visualização somente-leitura da
// Sonoridade (botão "Ver" da tabela, ver render-listas.js).
//
// Espelha o papel de visualizar.js (modal genérico sem formulário, só
// o botão Fechar e os de Baixar), mas com conteúdo próprio: Sonoridade
// não tem "corpo de texto" pra reaproveitar os helpers de
// exportar-md.js (textoPessoas, textoGrupos etc.) — os 7 campos de
// classificação viram linhas de meta simples, e a grade
// silábica/tônica/rimas é a mesma renderGradeLeituraHtml() de
// editor-sonoridade.js usada por baixo dos panos aqui, sem os dois
// Modos de edição nem os botões Corrigir/Remover do painel de rimas
// (ver comentário em 'ver-sonoridade' de main.js sobre por que isso
// não existia até esta sessão: o editor de escansão é uma ferramenta
// ativa — arrastar, desfazer, alternar modo —, ruidosa pra quem só
// quer conferir o resultado).
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { db } from './db.js';
import { renderGradeLeituraHtml } from './editor-sonoridade.js';
import { exportarEscansao } from './exportar-sonoridade.js';
import { escapeHtml } from './utils.js';

// id/poemaId da escansão atualmente aberta — os botões de Baixar do
// próprio modal usam esse estado (mesmo padrão de itemAtual em
// visualizar.js), já que o modal não é recriado a cada abertura.
let escansaoAtualId = null;

function linhaMetaHtml(rotulo, valor) {
    if (!valor) return '';
    return `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">${escapeHtml(rotulo)}:</strong> ${escapeHtml(valor)}</p>`;
}

export async function abrirVisualizacaoSonoridade(id) {
    const es = db.escansoes.find((x) => x.id == id);
    if (!es) return;
    const poema = db.poemas.find((p) => p.id == es.poemaId);
    escansaoAtualId = id;

    await garantirModal('modal-visualizar-sonoridade');

    const titulo = document.getElementById('modal-visualizar-sonoridade-titulo');
    if (titulo) titulo.innerText = poema?.titulo || `Escansão #${es.id}`;

    const conteudo = document.getElementById('visualizar-sonoridade-conteudo');
    if (conteudo) {
        let html = '';
        html += linhaMetaHtml('Forma', es.formaPoema);
        html += linhaMetaHtml('Regularidade Métrica', es.regularidadeMetrica);
        html += linhaMetaHtml('Tamanho do Verso', es.tamanhoVerso);
        html += linhaMetaHtml(
            'Esquema de Rimas',
            [es.esquemaRimasPresenca, es.esquemaRimasPadrao].filter(Boolean).join(' · ') || null,
        );
        html += linhaMetaHtml('Origem/Tradição', es.origemTradicao);
        html += linhaMetaHtml('Registro', es.registro);
        html += linhaMetaHtml('Tom', es.tom);
        html += `
            <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-2">Grade Silábica</h4>
            ${renderGradeLeituraHtml(es.escansaoLinhas, es.rimas)}`;
        conteudo.innerHTML = html;
    }

    toggleModal('modal-visualizar-sonoridade');
}

// Chamado pelos botões "Baixar em .md/.pdf/.docx/.json" dentro do
// próprio modal — mesmos 4 formatos sempre visíveis ali, independente
// do formato configurado na coluna Ações (ver painel "⚙️ Ações ▾"),
// mesmo espírito de baixarDoModalVisualizacao em visualizar.js.
export function baixarDoModalVisualizacaoSonoridade(formato) {
    if (escansaoAtualId == null) return;
    exportarEscansao(escansaoAtualId, formato);
}
