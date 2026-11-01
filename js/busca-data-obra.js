// ============================================================
// busca-data-obra.js: filtros da busca de Poemas e Prosas por data da obra
// (T9, pendência fechada em 27/10/2026). Lógica pura, sem DOM e sem db; só
// importa data-da-obra.js (utils.js importa este módulo, não o contrário).
//
// Quatro prefixos, que as barras de "Obras citadas" das Estatísticas usam
// para abrir a lista de textos e que também valem digitados à mão:
//
//   dataobra:           data (ano de referência) das entradas de Intertextualidade
//                       e Hipertextualidade (a fonte "Obras" das Estatísticas)
//   datareferencia:     o mesmo, nas Referências (Marco histórico, Notícia e
//                       Pessoa pública, esta pelo nascimento)
//   distanciaobra:      anos entre a obra e o texto, nas Obras
//   distanciareferencia: o mesmo, nas Referências
//
// Mais quatro, que separam as Obras pela marca "Obra pessoal" (a entrada, não o
// texto) e que o filtro de Estatísticas › Obras citadas usa para a lista da
// barra ter os mesmos textos dela:
//
//   dataobrapublica:     como dataobra:, só nas entradas SEM a marca
//   dataobrapessoal:     como dataobra:, só nas entradas COM a marca
//   distanciaobrapublica: como distanciaobra:, só nas entradas sem a marca
//   distanciaobrapessoal: como distanciaobra:, só nas entradas com a marca
//
// O texto casa se ALGUMA das suas entradas cai no que foi pedido, a mesma regra
// das barras (um texto conta em cada barra que uma entrada alcança), então a
// lista aberta por uma barra tem o mesmo número de textos que a barra.
//
// O valor de `dataobra:` e `datareferencia:` pode ser:
//   1922                 um ano (negativo é a.C., sem ano zero: -44 é 44 a.C.)
//   1920..1935           de um ano a outro, inclusive (1920.. e ..1935 ficam abertos)
//   1920s, "década de 1920", "séc. XX", "séc. V a.C."
//                        o que `lerTextoDataObra` entende; vale o intervalo de anos
//                        que o nível cobre (década de 1920 = 1920 a 1929)
// O valor de `distanciaobra:` e `distanciareferencia:` é um número de anos
// (100) ou um intervalo (10..49, 500.., ..-1; negativo é obra datada DEPOIS do
// texto). Texto de data não vale ali.
//
// A comparação é sempre pelo ano de referência da entrada (o começo da data, ou
// o fim quando só ele existe), como nas Estatísticas: a obra "séc. XIX" está em
// 1801 e por isso `dataobra:1895` não a acha, mas `dataobra:"séc. XIX"` sim.
// Dia e mês da data pedida não restringem (a comparação é por ano).
//
// `*` e `-campo:*` (tem ou não tem) funcionam pelo campo decorado de texto.
// ============================================================

import {
    datasDaEntrada,
    formatarIntervaloDataObra,
    lerTextoDataObra,
    anoDeReferenciaDaEntrada,
    distanciaEmAnos,
} from './data-da-obra.js';

const INTEIRO = /^-?\d+$/;
// Com `decimal: true` (Autoclassificação, de 0,5 a 5) o número pode ter casa decimal,
// com vírgula ou ponto: 3,5 e 3.5.
const DECIMAL = /^-?\d+([.,]\d+)?$/;

function lerNumeroDaConsulta(texto, decimal) {
    return Number(decimal ? texto.replace(',', '.') : texto);
}

// De onde cada fonte tira as entradas (as mesmas das Estatísticas).
const CAMPOS_DA_FONTE = {
    Obra: ['intertextualidade', 'hipertextualidade'],
    Referencia: ['referenciasExternas'],
};

// Intervalo de anos `{ de, ate }` que o termo pede, ou null quando não dá para
// entender. `de` e `ate` podem ser -Infinity e Infinity (intervalo aberto).
// `aceitaData: false` (distância) só aceita número e intervalo de números.
export function intervaloDeAnosDaConsulta(termo, { aceitaData = true, decimal = false } = {}) {
    const t = String(termo ?? '').trim();
    if (!t) return null;
    const NUMERO = decimal ? DECIMAL : INTEIRO;

    if (t.includes('..')) {
        const partes = t.split('..');
        if (partes.length !== 2) return null;
        const inicio = partes[0].trim();
        const fim = partes[1].trim();
        if (!inicio && !fim) return null;
        if ((inicio && !NUMERO.test(inicio)) || (fim && !NUMERO.test(fim))) return null;
        const a = inicio ? lerNumeroDaConsulta(inicio, decimal) : -Infinity;
        const b = fim ? lerNumeroDaConsulta(fim, decimal) : Infinity;
        return a <= b ? { de: a, ate: b } : { de: b, ate: a };
    }

    if (NUMERO.test(t)) {
        const n = lerNumeroDaConsulta(t, decimal);
        return { de: n, ate: n };
    }

    if (!aceitaData) return null;
    const { data } = lerTextoDataObra(t);
    return data ? { de: data.de, ate: data.ate } : null;
}

// O intervalo de anos escrito como a busca lê: "1920..1929", "500.." (aberto no
// fim), "..-1" (aberto no começo). Um ano só vira o próprio número. Infinito
// (ou ausente) deixa o lado em branco.
export function textoDoIntervaloDeAnos(de, ate) {
    const aberto = (n) => n === undefined || n === null || !Number.isFinite(n);
    if (!aberto(de) && !aberto(ate) && de === ate) return String(de);
    return `${aberto(de) ? '' : de}..${aberto(ate) ? '' : ate}`;
}

// true/false: algum dos `numeros` (anos, ou distâncias em anos) cai no que o
// termo pede. null quando o termo não é entendido (quem chama decide o que
// fazer: `dataobra:` volta a procurar no texto da data, `distanciaobra:` não
// acha nada).
export function numerosBatemComConsulta(numeros, termo, opcoes = {}) {
    const intervalo = intervaloDeAnosDaConsulta(termo, opcoes);
    if (!intervalo) return null;
    return (Array.isArray(numeros) ? numeros : []).some(
        (n) => n >= intervalo.de && n <= intervalo.ate,
    );
}

// Os campos de busca das datas de um texto, para `decorarCamposBusca`.
// `anoDoTexto` é o ano de escrita do texto (ou null): sem ele as entradas ainda
// entram em `dataobra:` e `datareferencia:`, mas não têm distância.
//   _buscaDataObra / _buscaDataReferencia           texto das datas ("1920 até 1935 1922")
//   _anosDataObra / _anosDataReferencia             anos de referência (para o intervalo)
//   _buscaDistanciaObra / _buscaDistanciaReferencia texto das distâncias ("12 -3")
//   _distanciasObra / _distanciasReferencia         distâncias em anos
export function camposDeBuscaDeDatas(item, anoDoTexto = null) {
    const campos = {};
    const temAnoDoTexto = Number.isInteger(anoDoTexto) && anoDoTexto !== 0;
    const entradasDe = (listas) => listas.flatMap((c) => (Array.isArray(item?.[c]) ? item[c] : []));
    const ehPessoal = (e) => e?.obraPessoal === true;

    // Escreve os quatro campos de um grupo de entradas, com o sufixo do nome.
    const escrever = (entradas, fonte, sufixo = '') => {
        const textos = [];
        const anos = [];
        const distancias = [];
        entradas.forEach((entrada) => {
            const { inicio, fim } = datasDaEntrada(entrada);
            const texto = formatarIntervaloDataObra(inicio, fim);
            if (texto) textos.push(texto);
            const ano = anoDeReferenciaDaEntrada(entrada);
            if (ano === null) return;
            anos.push(ano);
            if (temAnoDoTexto) distancias.push(distanciaEmAnos(anoDoTexto, ano));
        });
        campos[`_buscaData${fonte}${sufixo}`] = textos.join(' ');
        campos[`_anosData${fonte}${sufixo}`] = anos;
        campos[`_buscaDistancia${fonte}${sufixo}`] = distancias.join(' ');
        campos[`_distancias${fonte}${sufixo}`] = distancias;
    };

    Object.entries(CAMPOS_DA_FONTE).forEach(([fonte, listas]) => {
        const entradas = entradasDe(listas);
        escrever(entradas, fonte);
        // Só as Obras têm a marca "Obra pessoal"; as Referências não se dividem.
        if (fonte === 'Obra') {
            escrever(entradas.filter(ehPessoal), fonte, 'Pessoal');
            escrever(
                entradas.filter((e) => !ehPessoal(e)),
                fonte,
                'Publica',
            );
        }
    });
    return campos;
}

// Campo de busca (o de CAMPOS_ATRIBUTO) → { lista, opcoes } do campo decorado
// com os números a comparar. Só os campos de data e distância estão aqui (os
// quatro de sempre e os quatro das Obras separadas pela marca "Obra pessoal").
export const COMPARACAO_NUMERICA_POR_CAMPO = {
    _buscaDataObra: { lista: '_anosDataObra', opcoes: { aceitaData: true }, cairNoTexto: true },
    _buscaDataReferencia: {
        lista: '_anosDataReferencia',
        opcoes: { aceitaData: true },
        cairNoTexto: true,
    },
    _buscaDistanciaObra: {
        lista: '_distanciasObra',
        opcoes: { aceitaData: false },
        cairNoTexto: false,
    },
    _buscaDistanciaReferencia: {
        lista: '_distanciasReferencia',
        opcoes: { aceitaData: false },
        cairNoTexto: false,
    },
    _buscaDataObraPublica: {
        lista: '_anosDataObraPublica',
        opcoes: { aceitaData: true },
        cairNoTexto: true,
    },
    _buscaDataObraPessoal: {
        lista: '_anosDataObraPessoal',
        opcoes: { aceitaData: true },
        cairNoTexto: true,
    },
    _buscaDistanciaObraPublica: {
        lista: '_distanciasObraPublica',
        opcoes: { aceitaData: false },
        cairNoTexto: false,
    },
    _buscaDistanciaObraPessoal: {
        lista: '_distanciasObraPessoal',
        opcoes: { aceitaData: false },
        cairNoTexto: false,
    },
    // Autoclassificação (corações): `autoclassificacao:3,5`, `4..`, `..2`, `3..4,5`.
    _buscaAutoclassificacao: {
        lista: '_numerosAutoclassificacao',
        opcoes: { aceitaData: false, decimal: true },
        cairNoTexto: false,
    },
};
