// ============================================================
// importar-sonoridade.js — Validação/sanitização de um JSON de
// Escansão (mesmo shape do baixarEscansaoJson de exportar-sonoridade.js)
// pra preencher o modal de Sonoridade sem digitar tudo manualmente.
//
// Função pura (sem DOM), só recebe/devolve dados — quem mexe no
// formulário/grade a partir do resultado é forms.js
// (importarSonoridadeDeArquivo). Assim dá pra testar a lógica de
// validação isolada (ver tests/importar-sonoridade.test.js), no mesmo
// espírito de calcularMaxSilabas/calcularLetrasRima em
// editor-sonoridade.js.
//
// Filosofia dos avisos: nada aqui bloqueia a importação por um campo
// individual malformado — cada categoria de problema (poema não
// encontrado, campo de classificação com grafia inválida, linha/tônica
// fora do range, par de rima quebrado) é descartada com um aviso
// resumido, e o resto do JSON continua sendo aplicado. Só existe UM
// erro que interrompe tudo: não foi possível identificar a qual poema
// a escansão pertence (nem por id, nem por título, nem por já haver um
// poema selecionado no formulário) — sem isso não dá pra montar a
// grade nem validar os índices de sílaba contra nada.
// ============================================================

import {
    gerarId,
    FORMAS_POEMA,
    REGULARIDADES_METRICAS,
    TAMANHOS_VERSO,
    ESQUEMA_RIMAS_PRESENCA,
    ESQUEMA_RIMAS_PADRAO,
    ORIGENS_TRADICAO_SONORIDADE,
    REGISTROS_SONORIDADE,
    TONS_SONORIDADE,
    ACENTUACOES_RIMA,
    TONALIDADES_RIMA,
    RIQUEZAS_RIMA,
} from './utils.js';
import { construirLinhasIniciais, dividirSilabas } from './editor-sonoridade.js';

// Campo do payload → { chave em `valores`, lista fechada } — usado tanto
// pra validar quanto, depois, pra popular os selects (mesma ordem dos 7
// campos de classificação do modal).
const CAMPOS_CLASSIFICACAO = [
    { chave: 'formaPoema', label: 'Forma do Poema', opcoes: FORMAS_POEMA },
    {
        chave: 'regularidadeMetrica',
        label: 'Regularidade Métrica',
        opcoes: REGULARIDADES_METRICAS,
    },
    { chave: 'tamanhoVerso', label: 'Tamanho do Verso', opcoes: TAMANHOS_VERSO },
    {
        chave: 'esquemaRimasPresenca',
        label: 'Esquema de Rimas (Presença)',
        opcoes: ESQUEMA_RIMAS_PRESENCA,
    },
    {
        chave: 'esquemaRimasPadrao',
        label: 'Esquema de Rimas (Padrão)',
        opcoes: ESQUEMA_RIMAS_PADRAO,
    },
    { chave: 'origemTradicao', label: 'Origem e Tradição', opcoes: ORIGENS_TRADICAO_SONORIDADE },
    { chave: 'registro', label: 'Registro', opcoes: REGISTROS_SONORIDADE },
    { chave: 'tom', label: 'Tom', opcoes: TONS_SONORIDADE },
];

// ─── Resolução do poema ──────────────────────────────────────────────
// Regra (confirmada com o Victor): se o JSON trouxer um poemaId válido
// (existe em db.poemas), ele manda — troca o poema selecionado no
// formulário, mesmo que outro já estivesse escolhido. Só cai pros
// fallbacks (poema já selecionado / casar por título) quando o
// poemaId está ausente ou não bate com nada do acervo — típico de um
// JSON que nunca passou pelo sistema (gerado por IA a partir do texto
// colado do poema, por exemplo, sem id nenhum ainda).
function resolverPoema(dados, poemas, poemaSelecionadoId) {
    const poemaIdJson =
        dados.poemaId !== undefined && dados.poemaId !== null ? Number(dados.poemaId) : null;
    if (poemaIdJson !== null) {
        const porId = poemas.find((p) => p.id === poemaIdJson);
        if (porId) return { poema: porId, aviso: null };
    }

    const tituloJson = typeof dados.poemaTitulo === 'string' ? dados.poemaTitulo.trim() : '';

    const poemaAtual = poemaSelecionadoId
        ? poemas.find((p) => String(p.id) === String(poemaSelecionadoId))
        : null;
    if (poemaAtual) {
        const avisoTitulo =
            tituloJson && tituloJson.toLowerCase() !== (poemaAtual.titulo || '').toLowerCase()
                ? `O JSON parece ser de outro poema ("${tituloJson}") — os dados foram aplicados ao poema já selecionado ("${poemaAtual.titulo || '(sem título)'}") mesmo assim.`
                : null;
        return { poema: poemaAtual, aviso: avisoTitulo };
    }

    if (tituloJson) {
        const porTitulo = poemas.find(
            (p) => (p.titulo || '').toLowerCase() === tituloJson.toLowerCase(),
        );
        if (porTitulo) {
            return {
                poema: porTitulo,
                aviso: `O poemaId do JSON não foi encontrado no acervo — o poema foi identificado pelo título ("${porTitulo.titulo}").`,
            };
        }
    }

    return { poema: null, aviso: null };
}

// ─── Campos de classificação (7 selects fechados) ────────────────────
function validarClassificacao(dados) {
    const valores = {};
    const camposInvalidos = [];
    CAMPOS_CLASSIFICACAO.forEach(({ chave, label, opcoes }) => {
        const valor = dados[chave];
        if (valor === undefined || valor === null || valor === '') {
            valores[chave] = null;
            return;
        }
        if (typeof valor === 'string' && opcoes.includes(valor)) {
            valores[chave] = valor;
        } else {
            valores[chave] = null;
            camposInvalidos.push(label);
        }
    });
    const aviso = camposInvalidos.length
        ? `Campo${camposInvalidos.length > 1 ? 's' : ''} com valor não reconhecido, deixado${
              camposInvalidos.length > 1 ? 's' : ''
          } em branco: ${camposInvalidos.join(', ')}.`
        : null;
    return { valores, aviso };
}

// ─── Grade silábica (escansaoLinhas) ──────────────────────────────────
// Recalcula `numero` do zero (ignora o que veio no JSON) — mesma regra
// de construirLinhasIniciais, pra nunca divergir de como a numeração é
// feita em qualquer outro lugar do sistema, mesmo que o JSON tenha
// vindo com numeração errada/faltando.
function validarLinhas(dados, poema) {
    const linhasJson = Array.isArray(dados.escansaoLinhas) ? dados.escansaoLinhas : null;
    if (!linhasJson) {
        return {
            linhas: construirLinhasIniciais(poema?.texto),
            aviso: 'O JSON não trouxe grade silábica (escansaoLinhas) — mantida a grade construída a partir do texto do poema.',
        };
    }

    let tonicasDescartadas = 0;
    let numero = 0;
    const linhas = linhasJson.map((linhaBruta) => {
        if (!linhaBruta || typeof linhaBruta !== 'object' || linhaBruta.tipo === 'vazia') {
            return { tipo: 'vazia' };
        }
        const texto = typeof linhaBruta.texto === 'string' ? linhaBruta.texto : '';
        numero += 1;
        const linha = { tipo: 'verso', numero, texto };
        if (Array.isArray(linhaBruta.tonicas)) {
            const maxIdx = dividirSilabas(texto).length - 1;
            const tonicasValidas = linhaBruta.tonicas.filter(
                (i) => Number.isInteger(i) && i >= 0 && i <= maxIdx,
            );
            tonicasDescartadas += linhaBruta.tonicas.length - tonicasValidas.length;
            if (tonicasValidas.length) linha.tonicas = tonicasValidas;
        }
        return linha;
    });

    const avisos = [];
    const versosPoema = construirLinhasIniciais(poema?.texto).filter(
        (l) => l.tipo === 'verso',
    ).length;
    const versosJson = linhas.filter((l) => l.tipo === 'verso').length;
    if (versosPoema && versosJson !== versosPoema) {
        avisos.push(
            `O JSON tem ${versosJson} verso${versosJson === 1 ? '' : 's'}, mas o poema selecionado tem ${versosPoema} — confira a grade depois de importar.`,
        );
    }
    if (tonicasDescartadas > 0) {
        avisos.push(
            `${tonicasDescartadas} marcação${tonicasDescartadas > 1 ? 'ões' : ''} de sílaba tônica fora do range foi${tonicasDescartadas > 1 ? 'ram' : ''} descartada${tonicasDescartadas > 1 ? 's' : ''}.`,
        );
    }

    return { linhas, aviso: avisos.length ? avisos.join(' ') : null };
}

// ─── Pares de rima ─────────────────────────────────────────────────
function ladoValido(lado, linhas) {
    if (!lado || typeof lado !== 'object') return null;
    const linha = Number(lado.linha);
    if (!Number.isInteger(linha) || linha < 0 || linha >= linhas.length) return null;
    const linhaAlvo = linhas[linha];
    if (linhaAlvo.tipo !== 'verso') return null;
    const maxIdx = dividirSilabas(linhaAlvo.texto).length - 1;
    const silabas = Array.isArray(lado.silabas)
        ? lado.silabas.filter((i) => Number.isInteger(i) && i >= 0 && i <= maxIdx)
        : [];
    if (!silabas.length) return null;
    return { linha, silabas };
}

function validarRimas(dados, linhas) {
    const rimasJson = Array.isArray(dados.rimas) ? dados.rimas : [];
    let descartados = 0;
    const rimas = [];
    rimasJson.forEach((parBruto) => {
        const a = ladoValido(parBruto?.a, linhas);
        const b = ladoValido(parBruto?.b, linhas);
        if (!a || !b) {
            descartados += 1;
            return;
        }
        const par = { id: Number.isInteger(parBruto.id) ? parBruto.id : gerarId(), a, b };
        if (ACENTUACOES_RIMA.includes(parBruto.acentuacao)) par.acentuacao = parBruto.acentuacao;
        if (TONALIDADES_RIMA.includes(parBruto.tonalidade)) par.tonalidade = parBruto.tonalidade;
        if (RIQUEZAS_RIMA.includes(parBruto.riqueza)) par.riqueza = parBruto.riqueza;
        rimas.push(par);
    });
    const aviso = descartados
        ? `${descartados} par${descartados > 1 ? 'es' : ''} de rima com verso/sílaba fora da grade atual foi${descartados > 1 ? 'ram' : ''} descartado${descartados > 1 ? 's' : ''}.`
        : null;
    return { rimas, aviso };
}

// ─── Ponto de entrada ────────────────────────────────────────────────
// `poemas` = db.poemas; `poemaSelecionadoId` = valor atual do <select>
// de poema no formulário (string ou número, pode ser vazio).
//
// Retorno: `{ erro }` (string) quando não dá pra identificar o poema —
// nesse caso nada mais no payload foi processado, o chamador não deve
// tocar no formulário. Caso contrário, `{ poema, valores, linhas,
// rimas, avisos }` — `avisos` é um array de strings (uma por
// categoria de problema, vazio se o JSON era redondo), pra o chamador
// decidir como exibir (um toast por aviso, mesmo padrão já usado no
// onsubmit do formulário pra monorrima atípica/divergência de
// sílabas).
export function validarJsonSonoridade(dados, poemas, poemaSelecionadoId) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
        return { erro: 'Arquivo não é um JSON de escansão válido.' };
    }

    const { poema, aviso: avisoPoema } = resolverPoema(dados, poemas || [], poemaSelecionadoId);
    if (!poema) {
        return {
            erro: 'Não foi possível identificar a qual poema este JSON pertence — selecione um poema no formulário antes de importar, ou use um JSON com poemaId/poemaTitulo de um poema já cadastrado.',
        };
    }

    const { valores, aviso: avisoClassificacao } = validarClassificacao(dados);
    const { linhas, aviso: avisoLinhas } = validarLinhas(dados, poema);
    const { rimas, aviso: avisoRimas } = validarRimas(dados, linhas);

    const avisos = [avisoPoema, avisoClassificacao, avisoLinhas, avisoRimas].filter(Boolean);

    return { poema, valores, linhas, rimas, avisos };
}
