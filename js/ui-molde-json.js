// ============================================================
// ui-molde-json.js — Botões "Baixar" (coluna Ações e modal) e
// "Importar JSON" (cabeçalho da aba Moldes) do Molde. A lógica de
// payload/validação/duplicata/aplicação mora em molde-json.js (módulo
// puro) — mesma divisão de ui-importar-aditivo.js/importar-aditivo.js.
// ============================================================

import { db, save } from './db.js';
import { tirarSnapshotSeNecessario } from './autobackup.js';
import { mostrarAviso, mostrarAvisoComAcao } from './utils.js';
import {
    moldeParaPayload,
    validarJsonMolde,
    detectarDuplicataMolde,
    aplicarImportacaoMolde,
} from './molde-json.js';

function nomeArquivoSeguro(texto) {
    const base = (texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base || 'sem-titulo';
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

// ─── Baixar ──────────────────────────────────────────────────────────
// `molde` pode ser um registro salvo de db.moldes (botão da tabela) ou
// o estado ao vivo do editor (botão de dentro do modal, ver
// baixarMoldeAoVivo em forms.js) — o payload só lê os campos de Molde.
export function baixarMolde(molde) {
    const payload = moldeParaPayload(molde);
    baixarBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
        `molde-${nomeArquivoSeguro(molde.titulo)}.json`,
    );
}

export function baixarMoldePorId(id) {
    const molde = db.moldes.find((m) => m.id == id);
    if (!molde) {
        mostrarAviso('Molde não encontrado.');
        return;
    }
    baixarMolde(molde);
}

// ─── Importar ────────────────────────────────────────────────────────
async function aplicarEAvisar(molde, avisos) {
    const resultado = await aplicarImportacaoMolde(molde, db, { tirarSnapshotSeNecessario, save });
    if (!resultado.sucesso) {
        mostrarAviso(
            'Não foi possível tirar o snapshot de segurança antes de aplicar — nada foi importado. Tente de novo.',
        );
        return;
    }
    const nome = molde.titulo ? `"${molde.titulo}"` : '(sem título)';
    mostrarAviso(`Molde ${nome} importado.`, 'sucesso');
    avisos.forEach((a) => mostrarAviso(a, 'info'));
}

// onchange do <input type="file"> da aba Moldes.
export function importarMoldeDeArquivo(event) {
    const input = event.target;
    const arquivo = input?.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        // Limpa o input já aqui, pra escolher o mesmo arquivo de novo
        // (ex.: depois de cancelar a duplicata) voltar a disparar onchange.
        input.value = '';

        let dados;
        try {
            dados = JSON.parse(e.target.result);
        } catch {
            mostrarAviso('Erro ao ler o arquivo — confira se é um .json válido.');
            return;
        }

        const resultado = validarJsonMolde(dados);
        if (resultado.erro) {
            mostrarAviso(resultado.erro);
            return;
        }
        const { molde, avisos } = resultado;

        // Duplicata de título: por padrão NÃO importa — a pessoa precisa
        // clicar em "Importar mesmo assim" (a decisão nunca é automática,
        // mesmo espírito da duplicata de título da Importação Aditiva).
        const duplicata = detectarDuplicataMolde(molde, db.moldes);
        if (duplicata) {
            const complemento = duplicata.mesmoConteudo
                ? 'mesmo conteúdo — provavelmente já importado'
                : 'conteúdo diferente';
            mostrarAvisoComAcao(
                `Já existe um Molde "${molde.titulo}" (${complemento}). Nada foi importado ainda.`,
                'Importar mesmo assim',
                () => aplicarEAvisar(molde, avisos),
                12000,
            );
            return;
        }

        aplicarEAvisar(molde, avisos);
    };
    reader.readAsText(arquivo);
}
