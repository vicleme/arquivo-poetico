// ============================================================
// ui-extras-backup.js: "Backup completo" e extras (aba Backup e recuperação)
//
// O JSON do acervo leva o acervo e as capas. Este módulo cuida do que ele não
// leva (preferências e Versões Alternativas, ver extras-backup.js): baixa o
// arquivo de extras, sozinho ou junto com o backup, e restaura depois.
// ============================================================

import { exportarJSON } from './db.js';
import { abrirModalConfirmacao, mostrarAviso } from './utils.js';
import {
    aplicarExtras,
    coletarExtras,
    extrasTemConteudo,
    nomesDoBackup,
    resumirExtras,
    validarExtras,
} from './extras-backup.js';

function chavesDoNavegador() {
    try {
        return Object.keys(localStorage);
    } catch {
        return [];
    }
}

const lerChave = (chave) => {
    try {
        return localStorage.getItem(chave);
    } catch {
        return null;
    }
};

export function coletarExtrasDoNavegador(agora = new Date()) {
    return coletarExtras(chavesDoNavegador(), lerChave, agora);
}

function baixarTexto(texto, nome) {
    const blob = new Blob([texto], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Baixa o arquivo de extras. Devolve false (e não baixa) se não houver nada a guardar.
export function baixarExtras(nomeArquivo, agora = new Date()) {
    const extras = coletarExtrasDoNavegador(agora);
    if (!extrasTemConteudo(extras)) return false;
    baixarTexto(JSON.stringify(extras, null, 2), nomeArquivo || nomesDoBackup(agora).extras);
    return true;
}

// Botão "Baixar backup completo": o JSON do acervo com capas e o arquivo de
// extras, com a mesma data no nome. O backup é o que importa e vem primeiro; se
// ele falhar, os extras nem são baixados.
export async function baixarBackupCompleto(deps = {}) {
    const d = { exportarJSON, baixarExtras, ...deps };
    const nomes = nomesDoBackup(new Date());
    try {
        await d.exportarJSON(true, nomes.acervo);
    } catch (err) {
        console.error('[ui-extras-backup.js] Falha ao baixar o backup:', err);
        mostrarAviso('Não foi possível baixar o backup do acervo. Nada mais foi baixado.');
        return { sucesso: false, motivo: 'erro' };
    }
    const extras = d.baixarExtras(nomes.extras);
    mostrarAviso(
        extras
            ? 'Backup completo baixado: o acervo (com as capas) e o arquivo de extras.'
            : 'Backup do acervo baixado. Não há preferências nem Versões Alternativas para guardar.',
        'sucesso',
    );
    return { sucesso: true, extras };
}

// Botão "Baixar só os extras".
export function baixarSoExtras(deps = {}) {
    const d = { baixarExtras, ...deps };
    const baixou = d.baixarExtras(nomesDoBackup(new Date()).extras);
    if (baixou) {
        mostrarAviso('Arquivo de extras baixado.', 'sucesso');
    } else {
        mostrarAviso('Não há preferências nem Versões Alternativas para guardar.');
    }
    return baixou;
}

// Escolha de arquivo do "Restaurar extras": valida, mostra o que será feito e só
// grava depois de confirmar. Recarrega a página no fim, para o app subir com as
// preferências restauradas.
export async function restaurarExtrasArquivo(event, deps = {}) {
    const d = {
        lerArquivo: (arquivo) => arquivo.text(),
        confirmar: abrirModalConfirmacao,
        recarregar: () => window.location.reload(),
        ler: lerChave,
        escrever: (chave, valor) => localStorage.setItem(chave, valor),
        ...deps,
    };
    const entrada = event?.target;
    const arquivo = entrada?.files?.[0];
    if (!arquivo) return { sucesso: false, motivo: 'sem-arquivo' };

    const limpar = () => {
        if (entrada) entrada.value = '';
    };

    let extras;
    try {
        extras = JSON.parse(await d.lerArquivo(arquivo));
        // Já lido: libera o campo para que escolher o mesmo arquivo de novo (por
        // exemplo depois de cancelar a confirmação) volte a disparar o evento.
        limpar();
    } catch {
        limpar();
        mostrarAviso('Este arquivo não é um JSON válido.');
        return { sucesso: false, motivo: 'json' };
    }

    const validacao = validarExtras(extras);
    if (!validacao.ok) {
        limpar();
        mostrarAviso(validacao.motivo);
        return { sucesso: false, motivo: 'formato' };
    }

    const { preferencias, versoes } = resumirExtras(extras);
    if (!preferencias && !versoes) {
        limpar();
        mostrarAviso('Este arquivo de extras não tem nada para restaurar.');
        return { sucesso: false, motivo: 'vazio' };
    }

    return new Promise((resolve) => {
        d.confirmar({
            titulo: 'Restaurar extras',
            rotulo: 'Preferências e Versões Alternativas',
            mensagem: `Vai regravar ${preferencias} preferência(s) e somar ${versoes} versão(ões) alternativa(s) às que já existem. O acervo não é tocado. A página recarrega ao terminar.`,
            textoConfirmar: 'Restaurar',
            corConfirmar: '#2563eb',
            onConfirmar: () => {
                const r = aplicarExtras(extras, d);
                if (!r.ok) {
                    mostrarAviso(r.motivo);
                    resolve({ sucesso: false, motivo: 'aplicar' });
                    return;
                }
                const resumo = `${r.preferencias} preferência(s) e ${r.versoes} versão(ões) alternativa(s) restauradas${
                    r.falhas ? `; ${r.falhas} não coube(ram) no navegador` : ''
                }.`;
                mostrarAviso(resumo, r.falhas ? 'info' : 'sucesso');
                d.recarregar();
                resolve({ sucesso: true, ...r });
            },
        });
    });
}
