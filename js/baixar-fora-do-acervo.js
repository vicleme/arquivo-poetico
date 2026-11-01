// ============================================================
// baixar-fora-do-acervo.js: o botão "Baixar" da seção Fora do acervo
// (T9, entrega 12 de 13). Lê os dois selects ao lado do botão (escopo e
// formato) e baixa o relatório em .md, .csv ou .pdf, com o filtro e a ordem
// que a tela mostra agora (estadoDoRelatorioForaDoAcervo).
//
// O .csv é uma tabela por vez: com ele, "Tudo" não existe e o select passa
// para "Só Obras" (atualizarBaixarForaDoAcervo, no onchange do formato).
// O .pdf carrega sob demanda, para a tela não pagar o jsPDF à toa.
// ============================================================

import { estadoDoRelatorioForaDoAcervo } from './render-fora-do-acervo.js';
import {
    ESCOPOS_FORA_DO_ACERVO,
    escopoDoCsvForaDoAcervo,
    baixarForaDoAcervoMarkdown,
    baixarForaDoAcervoCsv,
} from './exportar-fora-do-acervo.js';

const ID_ESCOPO = 'conexoes-fora-baixar-escopo';
const ID_FORMATO = 'conexoes-fora-baixar-formato';
const FORMATOS = ['md', 'csv', 'pdf'];

export function escopoEFormatoEscolhidos() {
    const escopo = document.getElementById(ID_ESCOPO)?.value;
    const formato = document.getElementById(ID_FORMATO)?.value;
    return {
        escopo: ESCOPOS_FORA_DO_ACERVO.includes(escopo) ? escopo : 'tudo',
        formato: FORMATOS.includes(formato) ? formato : 'md',
    };
}

// Com .csv, tira "Tudo" da lista (e escolhe Obras, se estava nele).
export function atualizarBaixarForaDoAcervo() {
    const escopo = document.getElementById(ID_ESCOPO);
    if (!escopo) return;
    const { formato } = escopoEFormatoEscolhidos();
    const opcaoTudo = [...escopo.options].find((o) => o.value === 'tudo');
    if (opcaoTudo) opcaoTudo.disabled = formato === 'csv';
    if (formato === 'csv' && escopo.value === 'tudo') {
        escopo.value = escopoDoCsvForaDoAcervo('tudo');
    }
}

export async function baixarForaDoAcervo() {
    const { escopo, formato } = escopoEFormatoEscolhidos();
    try {
        const { dados, opcoes } = estadoDoRelatorioForaDoAcervo();
        if (formato === 'csv') return baixarForaDoAcervoCsv(dados, escopo, opcoes);
        if (formato === 'pdf') {
            const { baixarForaDoAcervoPdf } = await import('./exportar-fora-do-acervo-pdf.js');
            return baixarForaDoAcervoPdf(dados, escopo, opcoes);
        }
        return baixarForaDoAcervoMarkdown(dados, escopo, opcoes);
    } catch (err) {
        console.error(err);
        alert(err?.message || 'Não foi possível gerar o relatório do Fora do acervo.');
    }
}
