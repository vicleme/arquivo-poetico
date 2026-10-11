// Arquivo de "extras" do backup: o que o JSON do acervo não leva.
//
// O "Baixar JSON" salva o acervo (db) e as capas. Ficam de fora, e somem se
// o navegador for limpo: as preferências (tema, colunas, filtros, templates de
// exportação, tags etc.) e as Versões Alternativas (texto da pessoa, escrito em
// filtrar.html). Este módulo, só de lógica e sem DOM, monta um segundo arquivo com
// as duas coisas e sabe devolvê-las ao navegador depois.
//
// O formato do JSON do acervo não muda (F13-D7). As preferências são as chaves que
// o inventário classifica como `preferencia`: chave nova de uma fase futura entra
// aqui sozinha, porque o teste do inventário obriga a classificá-la.
//
// O objeto `versoes` fica na raiz do arquivo, no mesmo formato do banco que
// filtrar.html exporta, então a tela "Importar banco" dela também lê este arquivo.

import {
    CATEGORIAS,
    CHAVE_VERSOES_FILTRADAS,
    classificarChaveLocalStorage,
} from './inventario-armazenamento.js';

export const FORMATO_EXTRAS = 'arquivo_poetico_extras';
export const VERSAO_EXTRAS = 1;

const ehObjetoSimples = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function lerBancoVersoes(texto) {
    try {
        const banco = JSON.parse(texto);
        return ehObjetoSimples(banco) ? banco : {};
    } catch {
        return {};
    }
}

// Data local AAAA-MM-DD, para o nome dos arquivos do par.
export function dataParaNome(agora = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

// Os dois arquivos do "backup completo" levam a mesma data no nome.
export function nomesDoBackup(agora = new Date()) {
    const dia = dataParaNome(agora);
    return {
        acervo: `arquivo_poetico_backup_${dia}.json`,
        extras: `arquivo_poetico_extras_${dia}.json`,
    };
}

// `chaves`: chaves presentes no navegador (Object.keys(localStorage)).
// `ler(chave)`: devolve o texto guardado, ou null.
export function coletarExtras(chaves, ler, agora = new Date()) {
    const preferencias = {};
    for (const chave of [...chaves].sort()) {
        if (classificarChaveLocalStorage(chave) !== CATEGORIAS.PREFERENCIA) continue;
        const valor = ler(chave);
        if (typeof valor === 'string') preferencias[chave] = valor;
    }
    const versoes = lerBancoVersoes(ler(CHAVE_VERSOES_FILTRADAS));
    return {
        export_format: FORMATO_EXTRAS,
        versao: VERSAO_EXTRAS,
        gerado_em: agora.toISOString(),
        total_preferencias: Object.keys(preferencias).length,
        total_versoes: Object.keys(versoes).length,
        preferencias,
        versoes,
    };
}

export function extrasTemConteudo(extras) {
    return (extras?.total_preferencias || 0) + (extras?.total_versoes || 0) > 0;
}

export function validarExtras(extras) {
    if (!ehObjetoSimples(extras) || extras.export_format !== FORMATO_EXTRAS) {
        return { ok: false, motivo: 'Este arquivo não é um arquivo de extras do Arquivo Poético.' };
    }
    if (!(extras.versao >= 1) || extras.versao > VERSAO_EXTRAS) {
        return {
            ok: false,
            motivo: 'Este arquivo de extras é de uma versão mais nova do app. Atualize o app e tente de novo.',
        };
    }
    if (extras.preferencias !== undefined && !ehObjetoSimples(extras.preferencias)) {
        return { ok: false, motivo: 'O arquivo de extras está malformado (preferências).' };
    }
    if (extras.versoes !== undefined && !ehObjetoSimples(extras.versoes)) {
        return { ok: false, motivo: 'O arquivo de extras está malformado (versões alternativas).' };
    }
    return { ok: true, motivo: '' };
}

// O que a restauração faria, sem escrever nada (para a confirmação).
export function resumirExtras(extras) {
    const preferencias = Object.entries(extras?.preferencias || {}).filter(
        ([chave, valor]) =>
            classificarChaveLocalStorage(chave) === CATEGORIAS.PREFERENCIA &&
            typeof valor === 'string',
    ).length;
    const versoes = Object.values(extras?.versoes || {}).filter(ehObjetoSimples).length;
    return { preferencias, versoes };
}

// Devolve os extras ao navegador.
//  - Preferências: só chaves que o inventário conhece como preferência; cada uma
//    substitui a atual. Qualquer outra chave do arquivo é ignorada.
//  - Versões Alternativas: somam-se às que já existem. Na mesma chave, vale a mais
//    recente (`atualizadoEm`); em empate ou sem data, a do arquivo.
// `escrever(chave, valor)` pode lançar (cota cheia): conta como falha e segue.
export function aplicarExtras(extras, { ler, escrever }) {
    const validacao = validarExtras(extras);
    if (!validacao.ok) return { ok: false, motivo: validacao.motivo };

    let preferencias = 0;
    let versoes = 0;
    let ignoradas = 0;
    let falhas = 0;

    for (const [chave, valor] of Object.entries(extras.preferencias || {})) {
        if (
            classificarChaveLocalStorage(chave) !== CATEGORIAS.PREFERENCIA ||
            typeof valor !== 'string'
        ) {
            ignoradas++;
            continue;
        }
        try {
            escrever(chave, valor);
            preferencias++;
        } catch {
            falhas++;
        }
    }

    const banco = lerBancoVersoes(ler(CHAVE_VERSOES_FILTRADAS));
    let mudouBanco = false;
    for (const [chave, versao] of Object.entries(extras.versoes || {})) {
        if (!ehObjetoSimples(versao)) {
            ignoradas++;
            continue;
        }
        const atual = banco[chave];
        if (!atual || String(versao.atualizadoEm || '') >= String(atual.atualizadoEm || '')) {
            banco[chave] = versao;
            mudouBanco = true;
            versoes++;
        }
    }
    if (mudouBanco) {
        try {
            escrever(CHAVE_VERSOES_FILTRADAS, JSON.stringify(banco));
        } catch {
            falhas += versoes;
            versoes = 0;
        }
    }

    return { ok: true, preferencias, versoes, ignoradas, falhas };
}
