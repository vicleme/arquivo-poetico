// Leitura avaliativa: Ver e Baixar do texto aberto, os dois botões no canto
// da caixa em que aparecem o título e o texto.
//
// O Ver abre o mesmo modal Ver de Poemas e Prosas (visualizar.js). O Baixar
// gera um .md (ou .pdf) só com o título e o texto, que é o que a caixa mostra: usa o
// mesmo modo "só título e texto" da caixa Metadados dos downloads
// (metadados-download.js), então o cabeçalho, o corpo e a legenda de cores
// saem como nos outros .md do app.

import { reduzirParaTituloETexto } from './metadados-download.js';
import { gerarMarkdownItem } from './exportar-md.js';
import { baixarArquivo } from './exportar-conexoes.js';
import { baixarPdf } from './exportar-pdf.js';
import { mostrarAviso } from './utils.js';

// Mesmo critério do nome de arquivo dos downloads individuais (exportar.js):
// sem acento, minúsculo, só letras, números e hífen.
export function nomeArquivoDoTexto(titulo, extensao = 'md') {
    const base = String(titulo || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `${base || 'sem-titulo'}.${extensao}`;
}

// `texto` é o registro do poema ou da prosa; `tipo` é 'poema' ou 'prosa'.
export function markdownTituloETexto(tipo, texto) {
    const registro = reduzirParaTituloETexto({
        tipo: tipo === 'prosa' ? 'prosa' : 'poema',
        titulo: texto?.titulo,
        texto: texto?.texto,
    });
    return gerarMarkdownItem(registro);
}

// `formato` é 'md' (para mandar a uma IA) ou 'pdf' (para mandar a uma pessoa).
export function baixarTituloETexto(tipo, texto, formato = 'md') {
    if (formato === 'pdf') {
        const registro = reduzirParaTituloETexto({
            tipo: tipo === 'prosa' ? 'prosa' : 'poema',
            titulo: texto?.titulo,
            texto: texto?.texto,
        });
        try {
            baixarPdf([registro], nomeArquivoDoTexto(texto?.titulo, 'pdf'));
        } catch (err) {
            mostrarAviso(err.message || 'Não foi possível gerar o PDF.');
        }
        return;
    }
    baixarArquivo(
        markdownTituloETexto(tipo, texto),
        'text/markdown',
        nomeArquivoDoTexto(texto?.titulo),
    );
}
