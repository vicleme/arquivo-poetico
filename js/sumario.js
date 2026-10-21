// ============================================================
// sumario.js: lógica pura (sem DOM) do tipo de elemento "Sumário".
//
// O sumário de um elemento é uma lista de itens, cada um com três
// campos: `nivel` (número inteiro de 1 a 9, 1 é o mais alto), `item`
// (o título como aparece no sumário) e `pagina` (texto, porque pode
// ser "15" ou "xii"). Fica em `elemento.itensSumario`.
//
// O arquivo .json de modelo existe para uma IA pegar o sumário de um
// livro (foto, PDF, texto) e devolvê-lo no formato do app; a pessoa
// importa o resultado no modal do elemento. Mesmo formato de retorno
// de molde-json.js: `{ erro }` ou `{ itens, avisos }`.
//
// Filosofia dos avisos (igual à de importar-sonoridade.js): um item
// malformado não bloqueia o resto. Item sem texto é descartado; nível
// ausente ou inválido entra no nível 1; página que não é texto nem
// número vira vazia. Cada categoria gera um aviso resumido. Só vira
// erro o que impede de ler o arquivo, ou quando nada aproveitável
// sobrou. Pedido do Victor, 21/10/2026.
// ============================================================

export const TIPO_SUMARIO = 'Sumário';
export const TIPO_JSON_SUMARIO = 'sumario';
export const VERSAO_JSON_SUMARIO = 1;
export const NIVEL_MINIMO = 1;
export const NIVEL_MAXIMO = 9;
export const MAX_ITENS_SUMARIO = 2000;
export const NOME_ARQUIVO_MODELO_SUMARIO = 'modelo-sumario.json';

function plural(n, singular, pluralTxt) {
    return n === 1 ? singular : pluralTxt;
}

function textoSimples(valor) {
    if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
    if (typeof valor !== 'string') return null;
    return valor.replace(/\s+/g, ' ').trim();
}

// Aceita 2, "2" e " 2 ". Devolve o nível ou null quando ausente ou inválido.
export function lerNivel(valor) {
    let n = valor;
    if (typeof n === 'string' && n.trim() !== '') n = Number(n.trim());
    if (typeof n !== 'number' || !Number.isInteger(n)) return null;
    if (n < NIVEL_MINIMO || n > NIVEL_MAXIMO) return null;
    return n;
}

// Limpa uma lista de itens (vinda do .json ou do editor do modal).
// Devolve `{ itens, avisos }`; `itens` só tem `{ nivel, item, pagina }`.
export function normalizarItensSumario(lista) {
    const itens = [];
    let semTexto = 0;
    let nivelInvalido = 0;
    let paginaInvalida = 0;

    for (const bruto of Array.isArray(lista) ? lista : []) {
        const item = textoSimples(bruto?.item);
        if (!item) {
            semTexto += 1;
            continue;
        }
        let nivel = lerNivel(bruto.nivel);
        if (nivel === null) {
            nivelInvalido += 1;
            nivel = NIVEL_MINIMO;
        }
        let pagina = '';
        if (bruto.pagina !== undefined && bruto.pagina !== null) {
            const lida = textoSimples(bruto.pagina);
            if (lida === null) paginaInvalida += 1;
            else pagina = lida;
        }
        itens.push({ nivel, item, pagina });
    }

    const avisos = [];
    if (semTexto) {
        avisos.push(
            `${semTexto} ${plural(semTexto, 'item sem texto foi descartado', 'itens sem texto foram descartados')}.`,
        );
    }
    if (nivelInvalido) {
        avisos.push(
            `${nivelInvalido} ${plural(nivelInvalido, 'item sem nível válido entrou', 'itens sem nível válido entraram')} no nível ${NIVEL_MINIMO} (o nível vai de ${NIVEL_MINIMO} a ${NIVEL_MAXIMO}).`,
        );
    }
    if (paginaInvalida) {
        avisos.push(
            `${paginaInvalida} ${plural(paginaInvalida, 'item com página inválida ficou', 'itens com página inválida ficaram')} sem página.`,
        );
    }
    return { itens, avisos };
}

// Ponto de entrada da importação. Aceita o objeto do modelo
// ({ tipo: 'sumario', itens: [...] }) ou uma lista solta de itens.
export function validarJsonSumario(dados) {
    let lista;
    if (Array.isArray(dados)) {
        lista = dados;
    } else if (dados && typeof dados === 'object') {
        if (dados.tipo !== undefined && dados.tipo !== TIPO_JSON_SUMARIO) {
            return {
                erro: 'Este arquivo não é um JSON de Sumário. Use o arquivo baixado pelo botão "Baixar modelo .json" do elemento Sumário.',
            };
        }
        if (dados.versao !== undefined && dados.versao !== VERSAO_JSON_SUMARIO) {
            return {
                erro: `Versão de arquivo de Sumário não suportada (${dados.versao}). Este app lê a versão ${VERSAO_JSON_SUMARIO}.`,
            };
        }
        lista = dados.itens;
    } else {
        return { erro: 'Arquivo não é um JSON de Sumário válido.' };
    }

    if (!Array.isArray(lista)) {
        return { erro: 'O arquivo não tem a lista "itens" do sumário.' };
    }
    if (lista.length > MAX_ITENS_SUMARIO) {
        return {
            erro: `O sumário tem ${lista.length} itens, e o limite é ${MAX_ITENS_SUMARIO}.`,
        };
    }

    const { itens, avisos } = normalizarItensSumario(lista);
    if (itens.length === 0) {
        return { erro: 'O arquivo não trouxe nenhum item de sumário válido.' };
    }
    return { itens, avisos };
}

// Só o tipo Sumário guarda `itensSumario`, e só quando há itens.
export function camposDoSumario(tipo, lista) {
    if (tipo !== TIPO_SUMARIO) return {};
    const { itens } = normalizarItensSumario(lista);
    return itens.length ? { itensSumario: itens } : {};
}

// Conteúdo do arquivo "Baixar modelo .json". As `instrucoes` falam com
// a IA que vai preencher; o app ignora esse campo na importação.
export function gerarModeloSumario() {
    return {
        tipo: TIPO_JSON_SUMARIO,
        versao: VERSAO_JSON_SUMARIO,
        instrucoes: [
            'Este arquivo é um modelo de sumário para o Arquivo Poético. Preencha a lista "itens" com o sumário do livro e devolva só o JSON, sem texto antes ou depois.',
            'Cada item tem três campos: nivel, item e pagina.',
            `nivel: número inteiro de ${NIVEL_MINIMO} a ${NIVEL_MAXIMO}. O nível 1 é o mais alto (por exemplo, uma parte ou um capítulo), o 2 fica dentro do 1 (por exemplo, uma seção), o 3 fica dentro do 2, e assim por diante.`,
            'item: o título como aparece no sumário, sem o número da página e sem os pontinhos de preenchimento.',
            'pagina: a página como está impressa, escrita entre aspas (por exemplo "15" ou "xii"). Use "" quando o item não tiver página.',
            'Mantenha a ordem do sumário e não invente itens que não estejam nele.',
            'Apague os itens de exemplo antes de devolver o arquivo.',
        ],
        itens: [
            { nivel: 1, item: 'Parte I: Título da parte', pagina: '9' },
            { nivel: 2, item: 'Título da seção', pagina: '11' },
            { nivel: 3, item: 'Título do poema', pagina: '12' },
            { nivel: 1, item: 'Posfácio', pagina: '87' },
        ],
    };
}

export function modeloSumarioComoTexto() {
    return JSON.stringify(gerarModeloSumario(), null, 2);
}
