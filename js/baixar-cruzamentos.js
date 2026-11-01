// ============================================================
// baixar-cruzamentos.js: o botão "Baixar" da aba Cruzamentos (Estatísticas).
// Lê o select de formato ao lado do botão e baixa a matriz como a tela a
// mostra agora (modo, inversão, pessoa escolhida, colunas e ordem), em .csv,
// .json, .md ou .pdf. O .pdf carrega sob demanda, para a tela não pagar o
// código do PDF à toa.
// ============================================================

import { matrizParaExportar } from './estatisticas-tela-cruzamentos.js';
import {
    FORMATOS_CRUZAMENTOS,
    nomeArquivoCruzamentos,
    gerarCsvCruzamentos,
    gerarJsonCruzamentos,
    gerarMarkdownCruzamentos,
} from './exportar-cruzamentos.js';
import { baixarCsv } from './exportar-csv.js';
import { baixarArquivo } from './exportar-conexoes.js';

const ID_FORMATO = 'cruzamentos-baixar-formato';

export function formatoEscolhidoCruzamentos() {
    const formato = document.getElementById(ID_FORMATO)?.value;
    return FORMATOS_CRUZAMENTOS.includes(formato) ? formato : 'md';
}

export async function baixarCruzamentos() {
    const formato = formatoEscolhidoCruzamentos();
    try {
        const matriz = matrizParaExportar();
        if (!matriz.linhas.length || !matriz.dados.temas.length) {
            alert('A matriz está vazia: não há o que baixar com os filtros de agora.');
            return;
        }
        const nome = nomeArquivoCruzamentos(matriz.modo, formato);
        if (formato === 'pdf') {
            const { baixarCruzamentosPdf } = await import('./exportar-cruzamentos-pdf.js');
            return baixarCruzamentosPdf(matriz);
        }
        if (formato === 'csv') return baixarCsv(gerarCsvCruzamentos(matriz), nome);
        if (formato === 'json') {
            return baixarArquivo(gerarJsonCruzamentos(matriz), 'application/json', nome);
        }
        return baixarArquivo(gerarMarkdownCruzamentos(matriz), 'text/markdown', nome);
    } catch (err) {
        console.error(err);
        alert(err?.message || 'Não foi possível gerar o arquivo dos Cruzamentos.');
    }
}
