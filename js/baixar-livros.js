// ============================================================
// baixar-livros.js: download das informações do Livro (Fase 19, etapa 7).
// A parte com DOM: o formato lembrado e o arquivo que o navegador baixa. O
// registro e os três formatos moram em exportar-livros.js (lógica pura).
//
// Usado pelo Baixar do Ver do livro, pelo botão do card e pela barra da aba
// Livros: os três compartilham o mesmo formato lembrado.
//
// .json, .md e .csv baixam na hora. .pdf e .docx precisam carregar as capas
// (IndexedDB) e, no .docx, empacotar: `baixarLivros` devolve uma Promise nesses
// dois casos e avisa na tela se a biblioteca não carregou.
//
// "Incluir estrutura" (T3): a estrutura só com títulos entra no arquivo. A
// escolha fica lembrada (desligada na primeira vez) e vale para o Baixar do Ver,
// do card, da barra da aba Livros e da aba Coletâneas. No .csv a estrutura sai
// num segundo arquivo, e os dois vão juntos num .zip.
// ============================================================

import { db } from './db.js';
import { mostrarAviso } from './utils.js';
import { carregarCapasParaExportar } from './capas-para-exportar.js';
import { baixarPdfLivros } from './exportar-livros-pdf.js';
import { baixarDocxLivros } from './exportar-livros-docx.js';
import {
    FORMATOS_DOWNLOAD_LIVROS,
    arquivosDoDownloadLivros,
    nomeArquivoLivro,
    registrosDeLivros,
} from './exportar-livros.js';

// Mesma família de chaves do formato da seleção das outras abas (já classificada
// como preferência no inventário de armazenamento): uma chave por tabela.
const CHAVE_FORMATO = 'arquivoPoetico_formatoSelecao_livros';
export const FORMATO_PADRAO_LIVROS = 'json';

// Todos os formatos que o Baixar oferece: os três de texto (exportar-livros.js)
// e os dois documentos.
export const FORMATOS_BAIXAR_LIVROS = [...FORMATOS_DOWNLOAD_LIVROS, 'pdf', 'docx'];

export function getFormatoBaixarLivros() {
    try {
        const salvo = localStorage.getItem(CHAVE_FORMATO);
        if (salvo && FORMATOS_BAIXAR_LIVROS.includes(salvo)) return salvo;
    } catch {
        // localStorage indisponível: cai no padrão
    }
    return FORMATO_PADRAO_LIVROS;
}

export function salvarFormatoBaixarLivros(formato) {
    if (!FORMATOS_BAIXAR_LIVROS.includes(formato)) return;
    try {
        localStorage.setItem(CHAVE_FORMATO, formato);
    } catch {
        // sem espaço ou bloqueado: a escolha vale só nesta sessão
    }
}

// Caixa "Incluir estrutura": guardada à parte do formato, como "1" ou "0".
const CHAVE_ESTRUTURA = 'arquivoPoetico_incluirEstrutura_livros';

export function getIncluirEstruturaBaixarLivros() {
    try {
        return localStorage.getItem(CHAVE_ESTRUTURA) === '1';
    } catch {
        return false;
    }
}

export function salvarIncluirEstruturaBaixarLivros(ligada) {
    try {
        localStorage.setItem(CHAVE_ESTRUTURA, ligada ? '1' : '0');
    } catch {
        // sem espaço ou bloqueado: a escolha vale só nesta sessão
    }
}

// A estrutura entra em todos os formatos do Baixar de Livros.
export function formatoAceitaEstruturaLivros(formato) {
    return FORMATOS_BAIXAR_LIVROS.includes(formato);
}

// Caixa "Incluir Fora de escopo": guardada à parte, como "1" ou "0". Só vale
// junto com a estrutura (o Fora de escopo é uma seção dela).
const CHAVE_FORA_DE_ESCOPO = 'arquivoPoetico_incluirForaDeEscopo_livros';

export function getIncluirForaDeEscopoBaixarLivros() {
    try {
        return localStorage.getItem(CHAVE_FORA_DE_ESCOPO) === '1';
    } catch {
        return false;
    }
}

export function salvarIncluirForaDeEscopoBaixarLivros(ligada) {
    try {
        localStorage.setItem(CHAVE_FORA_DE_ESCOPO, ligada ? '1' : '0');
    } catch {
        // sem espaço ou bloqueado: a escolha vale só nesta sessão
    }
}

// Põe as caixas "Incluir estrutura" (`input[data-incluir-estrutura]`) e
// "Incluir Fora de escopo" (`input[data-incluir-fora-de-escopo]`) de dentro de
// `raiz` em dia com a escolha lembrada e com o formato mostrado ao lado. A do
// Fora de escopo só fica habilitada com a estrutura marcada (a aba Coletâneas
// não tem essa caixa: Coletânea não tem Fora de escopo).
export function sincronizarCaixaEstruturaLivros(raiz, formato) {
    const caixaForaDeEscopo = raiz?.querySelector('input[data-incluir-fora-de-escopo]');
    const aceita = formatoAceitaEstruturaLivros(formato);

    const atualizarForaDeEscopo = (estruturaLigada) => {
        if (!caixaForaDeEscopo) return;
        caixaForaDeEscopo.checked = getIncluirForaDeEscopoBaixarLivros();
        caixaForaDeEscopo.disabled = !(aceita && estruturaLigada);
        caixaForaDeEscopo.title = estruturaLigada
            ? 'Inclui, dentro da estrutura, a seção Fora de escopo: os textos migrados para outro livro e os descartados, com o lugar onde estariam.'
            : 'Marque "Incluir estrutura" para poder incluir o Fora de escopo.';
        caixaForaDeEscopo.onchange = () =>
            salvarIncluirForaDeEscopoBaixarLivros(caixaForaDeEscopo.checked);
    };

    raiz?.querySelectorAll('input[data-incluir-estrutura]').forEach((caixa) => {
        caixa.checked = getIncluirEstruturaBaixarLivros();
        caixa.disabled = !aceita;
        caixa.title =
            'Inclui a estrutura do livro só com os títulos (Partes, Seções, Elementos, poemas e prosas). No .csv sai um segundo arquivo, e os dois vão num .zip.';
        caixa.onchange = () => {
            salvarIncluirEstruturaBaixarLivros(caixa.checked);
            atualizarForaDeEscopo(caixa.checked);
        };
        atualizarForaDeEscopo(caixa.checked);
    });
}

export function baixarArquivo(conteudo, mime, nomeArquivo) {
    const blob = new Blob([conteudo], { type: `${mime};charset=utf-8` });
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

// Baixa a lista de livros recebida, na ordem recebida, no formato pedido
// (o lembrado, se não vier). `nomeBase` é o nome do arquivo sem a extensão.
// `opcoes.incluirEstrutura` vale no lugar da escolha lembrada (os testes usam).
// `opcoes.incluirForaDeEscopo` (ou a escolha lembrada, se não vier) acrescenta o
// Fora de escopo à estrutura.
// Devolve uma Promise em .pdf, .docx e no .csv com estrutura (que vira .zip).
export function baixarLivros(livros, formato, nomeBase, opcoes = {}) {
    const lista = livros || [];
    if (lista.length === 0) return mostrarAviso('Nenhum livro para baixar.');
    const escolhido = FORMATOS_BAIXAR_LIVROS.includes(formato) ? formato : getFormatoBaixarLivros();
    const incluirEstrutura =
        formatoAceitaEstruturaLivros(escolhido) &&
        (opcoes.incluirEstrutura ?? getIncluirEstruturaBaixarLivros());
    const registros = registrosDeLivros(lista, db, {
        incluirEstrutura,
        incluirForaDeEscopo:
            incluirEstrutura &&
            Boolean(opcoes.incluirForaDeEscopo ?? getIncluirForaDeEscopoBaixarLivros()),
    });
    if (escolhido === 'pdf' || escolhido === 'docx') {
        return baixarDocumentoLivros(lista, registros, escolhido, nomeBase);
    }
    const arquivos = arquivosDoDownloadLivros(registros, escolhido);
    if (arquivos.length > 1) return baixarVariosArquivos(arquivos, nomeBase);
    const [saida] = arquivos;
    baixarArquivo(saida.conteudo, saida.mime, `${nomeBase}${saida.sufixo}.${saida.extensao}`);
}

// Mais de um arquivo (o .csv com estrutura): um .zip com os dois. Se a
// biblioteca de .zip não carregou, baixa um depois do outro.
async function baixarVariosArquivos(arquivos, nomeBase) {
    const nome = (a) => `${nomeBase}${a.sufixo}.${a.extensao}`;
    const JSZip = globalThis.JSZip;
    if (!JSZip) {
        for (let i = 0; i < arquivos.length; i++) {
            baixarArquivo(arquivos[i].conteudo, arquivos[i].mime, nome(arquivos[i]));
            if (i < arquivos.length - 1) await new Promise((r) => setTimeout(r, 400));
        }
        return mostrarAviso(
            'A biblioteca de .zip não carregou: os arquivos foram baixados separados.',
        );
    }
    try {
        const zip = new JSZip();
        arquivos.forEach((a) => zip.file(nome(a), a.conteudo));
        const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
        baixarBlobLivros(blob, `${nomeBase}.zip`);
    } catch (err) {
        mostrarAviso(err?.message || 'Não foi possível gerar o .zip.');
    }
}

function baixarBlobLivros(blob, nomeArquivo) {
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

async function baixarDocumentoLivros(lista, registros, formato, nomeBase) {
    try {
        const capas = await carregarCapasParaExportar(lista);
        if (formato === 'pdf') baixarPdfLivros(registros, nomeBase, { capas });
        else await baixarDocxLivros(registros, nomeBase, { capas });
    } catch (err) {
        mostrarAviso(
            err?.message || `Não foi possível gerar o ${formato === 'pdf' ? 'PDF' : '.docx'}.`,
        );
    }
}

// Um livro só, com o título no nome do arquivo.
export function baixarLivro(id, formato, opcoes = {}) {
    const livro = (db.livros || []).find((l) => String(l.id) === String(id));
    if (!livro) return mostrarAviso('Livro não encontrado.');
    return baixarLivros([livro], formato, nomeArquivoLivro(livro.titulo), opcoes);
}
