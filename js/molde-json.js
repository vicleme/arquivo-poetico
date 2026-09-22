// ============================================================
// molde-json.js — Exportar/importar UM Molde como JSON (aba
// Criação → Moldes). Separado de propósito da Importação Aditiva de
// Poema/Prosa (aba Dados → Importação, importar-aditivo.js): Molde não
// referencia nenhum cadastro central (Pessoas/Grupos/Autores/Épocas/
// Livros) — só título + classificação + moldeLinhas/paresRima — então
// não há resolução de referência nem relatório em fases aqui. Um
// arquivo = um Molde, validado e somado ao acervo com id novo.
//
// Módulo puro (sem DOM): recebe/devolve dados, no mesmo espírito de
// importar-sonoridade.js/importar-aditivo.js. Quem lê arquivo, baixa
// blob e mostra toast é ui-molde-json.js.
//
// Decisões fechadas (ver manutencao/criacao-molde.md):
//  - Id novo sempre (gerarId) — o id de origem nem viaja no arquivo.
//  - `poemaId`/`status` de origem NÃO são preservados: todo Molde
//    importado entra 'em andamento', poemaId nulo, mesmo que no arquivo
//    estivesse 'promovido' (o Poema apontado não existe — ou é outro
//    item — no acervo de destino; link quebrado é pior que perder o
//    rótulo). Quando o arquivo dizia 'promovido', devolve um aviso.
//  - Duplicata de título é checada (detectarDuplicataMolde) e quem
//    decide é a pessoa — nunca sobrescreve nem decide sozinho.
//  - Snapshot forçado antes de escrever, mesmo padrão da Importação
//    Aditiva (tirarSnapshotSeNecessario(db, true)).
// ============================================================

import { gerarId } from './utils.js';
import { dividirSilabas } from './editor-sonoridade.js';
import { CAMPOS_CLASSIFICACAO, validarClassificacao, ladoValido } from './importar-sonoridade.js';

export const TIPO_JSON_MOLDE = 'molde';
export const VERSAO_JSON_MOLDE = 1;

// ─── Exportação ──────────────────────────────────────────────────────
// Sem `id` (não tem significado em outro acervo) e sem `poemaId`
// (idem). `status` viaja só pra o importador poder avisar que o Molde
// estava promovido na origem — nunca é aplicado. Os pares de rima
// perdem o `id` (interno ao Molde, regerado na importação).
export function moldeParaPayload(molde) {
    const payload = {
        tipo: TIPO_JSON_MOLDE,
        versao: VERSAO_JSON_MOLDE,
        titulo: molde.titulo || '',
    };
    CAMPOS_CLASSIFICACAO.forEach(({ chave }) => {
        payload[chave] = molde[chave] ?? null;
    });
    payload.moldeLinhas = (molde.moldeLinhas || []).map((l) =>
        l.tipo === 'verso'
            ? { tipo: 'verso', numero: l.numero, texto: l.texto || '', tonicas: l.tonicas }
            : { tipo: 'vazia' },
    );
    payload.paresRima = (molde.paresRima || []).map(({ a, b }) => ({ a, b }));
    payload.status = molde.status || 'em andamento';
    return payload;
}

// ─── Validação ───────────────────────────────────────────────────────
// Recalcula `numero` do zero (ignora o do arquivo) e descarta tônicas
// fora do range da linha — mesma regra de validarLinhas em
// importar-sonoridade.js. Sem `moldeLinhas` no arquivo não é problema:
// um Molde recém-criado (Bloco 1) ainda não tem grade.
function validarLinhasMolde(dados) {
    if (!Array.isArray(dados.moldeLinhas)) return { linhas: [], aviso: null };

    let tonicasDescartadas = 0;
    let numero = 0;
    const linhas = dados.moldeLinhas.map((bruta) => {
        if (!bruta || typeof bruta !== 'object' || bruta.tipo === 'vazia') {
            return { tipo: 'vazia' };
        }
        const texto = typeof bruta.texto === 'string' ? bruta.texto : '';
        numero += 1;
        const linha = { tipo: 'verso', numero, texto };
        if (Array.isArray(bruta.tonicas)) {
            const maxIdx = dividirSilabas(texto).length - 1;
            const validas = bruta.tonicas.filter(
                (i) => Number.isInteger(i) && i >= 0 && i <= maxIdx,
            );
            tonicasDescartadas += bruta.tonicas.length - validas.length;
            if (validas.length) linha.tonicas = validas;
        }
        return linha;
    });

    const aviso =
        tonicasDescartadas > 0
            ? `${tonicasDescartadas} marcação${tonicasDescartadas > 1 ? 'ões' : ''} de sílaba tônica fora do range foi${tonicasDescartadas > 1 ? 'ram' : ''} descartada${tonicasDescartadas > 1 ? 's' : ''}.`
            : null;
    return { linhas, aviso };
}

// Pares de Molde só registram QUE dois versos foram pareados (sem
// acentuação/tonalidade/riqueza — isso é da Escansão, depois da
// promoção; ver criacao-molde.md, Bloco 3).
function validarParesRimaMolde(dados, linhas) {
    const brutos = Array.isArray(dados.paresRima) ? dados.paresRima : [];
    let descartados = 0;
    const pares = [];
    brutos.forEach((par) => {
        const a = ladoValido(par?.a, linhas);
        const b = ladoValido(par?.b, linhas);
        if (!a || !b) {
            descartados += 1;
            return;
        }
        pares.push({ id: gerarId(), a, b });
    });
    const aviso = descartados
        ? `${descartados} par${descartados > 1 ? 'es' : ''} de rima com verso/sílaba fora da grade foi${descartados > 1 ? 'ram' : ''} descartado${descartados > 1 ? 's' : ''}.`
        : null;
    return { pares, aviso };
}

// Ponto de entrada da validação. Retorna `{ erro }` (nada foi
// processado) ou `{ molde, avisos }` — `molde` ainda SEM id (quem dá o
// id é aplicarImportacaoMolde) e sempre 'em andamento'/poemaId nulo.
// Filosofia dos avisos igual à de importar-sonoridade.js: campo
// individual malformado é descartado com aviso, não bloqueia o resto.
export function validarJsonMolde(dados) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
        return { erro: 'Arquivo não é um JSON de Molde válido.' };
    }
    if (dados.tipo !== TIPO_JSON_MOLDE) {
        return {
            erro: 'Este arquivo não é um JSON de Molde — use um arquivo baixado pelo botão "Baixar" da aba Moldes.',
        };
    }
    if (dados.versao !== undefined && dados.versao !== VERSAO_JSON_MOLDE) {
        return {
            erro: `Versão de arquivo de Molde não suportada (${dados.versao}) — este app lê a versão ${VERSAO_JSON_MOLDE}.`,
        };
    }

    const { valores, aviso: avisoClassificacao } = validarClassificacao(dados);
    const { linhas, aviso: avisoLinhas } = validarLinhasMolde(dados);
    const { pares, aviso: avisoPares } = validarParesRimaMolde(dados, linhas);

    const avisos = [avisoClassificacao, avisoLinhas, avisoPares].filter(Boolean);
    if (dados.status === 'promovido') {
        avisos.push(
            'No arquivo, este Molde estava "promovido" a Poema — entrou como "em andamento", sem vínculo com nenhum Poema deste acervo.',
        );
    }

    const molde = {
        titulo: typeof dados.titulo === 'string' ? dados.titulo.trim() : '',
        ...valores,
        moldeLinhas: linhas,
        paresRima: pares,
        status: 'em andamento',
        poemaId: null,
    };
    return { molde, avisos };
}

// ─── Duplicata de título ─────────────────────────────────────────────
// Mesmo critério de título da Importação Aditiva (exato, sem diferenciar
// maiúscula/minúscula, com trim). Título vazio nunca conta como
// duplicata — "Sem título ainda" é um estado normal de rascunho.
// `mesmoConteudo` separa "provável reimportação do mesmo arquivo" de
// "mesmo título, mas é outro Molde" — só muda a mensagem pra pessoa
// decidir, a decisão continua sendo dela.
function assinaturaConteudo(m) {
    return JSON.stringify({
        c: CAMPOS_CLASSIFICACAO.map(({ chave }) => m[chave] ?? null),
        l: (m.moldeLinhas || []).map((l) =>
            l.tipo === 'verso' ? [l.texto || '', l.tonicas || []] : null,
        ),
        p: (m.paresRima || []).map(({ a, b }) => [a.linha, a.silabas, b.linha, b.silabas]),
    });
}

export function detectarDuplicataMolde(molde, moldesExistentes) {
    const alvo = (molde.titulo || '').trim().toLowerCase();
    if (!alvo) return null;
    const mesmoTitulo = (moldesExistentes || []).filter(
        (m) => (m.titulo || '').trim().toLowerCase() === alvo,
    );
    if (!mesmoTitulo.length) return null;
    const assinatura = assinaturaConteudo(molde);
    return {
        existentes: mesmoTitulo,
        mesmoConteudo: mesmoTitulo.some((m) => assinaturaConteudo(m) === assinatura),
    };
}

// ─── Aplicação ───────────────────────────────────────────────────────
// `deps.tirarSnapshotSeNecessario`/`deps.save` injetados (mesmo padrão
// de aplicarImportacaoAditiva) pra testar sem IndexedDB/localStorage.
export async function aplicarImportacaoMolde(molde, dbRef, deps) {
    const snapshotOk = await deps.tirarSnapshotSeNecessario(dbRef, true);
    if (!snapshotOk) return { sucesso: false, motivo: 'snapshot' };

    const novo = { ...molde, id: gerarId(), status: 'em andamento', poemaId: null };
    dbRef.moldes.push(novo);
    deps.save();
    return { sucesso: true, molde: novo };
}
