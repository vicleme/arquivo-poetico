// ============================================================
// data-da-obra.js: lógica pura (sem DOM, sem db.js e sem imports) da "Data
// da obra ou do fato" das entradas de Fora do acervo (T9, entrega 5 de 13).
//
// Onde mora: em cada entrada de Intertextualidade, Hipertextualidade e
// Referências (`referenciasExternas`), em duas chaves opcionais:
//
//   dataObra      o começo (Obra e Notícia: "data"; Marco histórico: "início";
//                 Pessoa pública: "nascimento")
//   dataObraAte   o fim, também opcional (Obra e Notícia: "até"; Marco
//                 histórico: "fim"; Pessoa pública: "óbito", vazio para quem
//                 está viva). Os rótulos por tipo são coisa da tela.
//
// A chave só existe quando há data (como `dataAcesso`); ausente quer dizer
// "não informada". Cada ponta tem o seu nível e as suas marcas.
//
// Forma de cada data (um nível por vez):
//
//   { nivel: 'seculo', seculo: 20, aC, aprox, de, ate }
//   { nivel: 'decada', decada: 1920, aC, aprox, de, ate }
//   { nivel: 'ano',    ano: 1922, aC, aprox, de, ate }
//   { nivel: 'mes',    ano: 1922, mes: 2, aC, aprox, de, ate }
//   { nivel: 'dia',    ano: 1922, mes: 2, dia: 11, aC, aprox, de, ate }
//
//   aC      true quando a data é antes de Cristo (o número do ano, da década
//           e do século fica positivo; o sinal vai só em `de` e `ate`)
//   aprox   true quando a data é aproximada ("aprox."); só marca, não muda
//           o intervalo
//   de, ate o intervalo de anos que o nível cobre, com sinal e SEM ano zero
//           (1 a.C. é -1, 1 d.C. é 1). Quem manda são o nível e os números;
//           `de` e `ate` são sempre recalculados ao ler e ao gravar.
//
// Intervalo de anos de cada nível:
//   século N        d.C.: (N-1)*100+1 a N*100 (séc. XX: 1901 a 2000);
//                   a.C.: -N*100 a -((N-1)*100+1) (séc. V a.C.: -500 a -401)
//   década D        d.C.: D a D+9 (1920: 1920 a 1929);
//                   a.C.: -(D+9) a -D (década de 430 a.C.: -439 a -430)
//   ano, mês, dia   o próprio ano, nos dois lados
//
// Texto: `formatarDataObra` escreve a data e `lerTextoDataObra` a lê de volta
// (a célula de texto do Modo revisão, T9 entrega 7). O que um escreve o outro
// lê, e o leitor aceita também as formas de digitar mais comuns.
//
// Calendário: a conta de ano bissexto usa o calendário juliano até 1581 e o
// gregoriano depois (e o juliano em a.C.). Só serve para recusar "30/02" e
// "29/02" de ano comum; não se pretende conversão entre calendários.
// ============================================================

export const NIVEIS_DATA_OBRA = ['seculo', 'decada', 'ano', 'mes', 'dia'];

export const CAMPO_DATA_INICIO = 'dataObra';
export const CAMPO_DATA_FIM = 'dataObraAte';

export const ANO_MAXIMO_DATA_OBRA = 9999;
export const SECULO_MAXIMO_DATA_OBRA = 99;

export const MENSAGENS_ERRO_DATA_OBRA = {
    'nivel-invalido': 'Escolha o nível da data: século, década, ano, mês ou dia.',
    'seculo-invalido': 'O século precisa ser um número de 1 a 99 (ou em romanos).',
    'decada-invalida': 'A década precisa ser um ano terminado em zero, como 1920.',
    'ano-invalido': 'O ano precisa ser um número de 1 a 9999.',
    'mes-invalido': 'O mês precisa ser um número de 1 a 12.',
    'dia-invalido': 'Esse dia não existe nesse mês.',
    'fim-antes-do-inicio': 'A data final vem antes da inicial.',
    'texto-invalido':
        'Não entendi a data. Escreva, por exemplo, 1922, séc. XX, década de 1920 ou 11/02/1922.',
};

// ─── Números ─────────────────────────────────────────────────

// Inteiro vindo de número ou de texto só com dígitos. Vazio vale `null`;
// qualquer outra coisa vale `NaN` (inválido).
function inteiro(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    if (typeof valor === 'number') return Number.isInteger(valor) ? valor : NaN;
    if (typeof valor === 'string') {
        const t = valor.trim();
        if (!t) return null;
        return /^\d+$/.test(t) ? Number(t) : NaN;
    }
    return NaN;
}

const ROMANOS = [
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
];

// 1 a 99 em romanos ("XX", "XXI"); fora disso, ''.
export function numeroParaRomano(n) {
    if (!Number.isInteger(n) || n < 1 || n > SECULO_MAXIMO_DATA_OBRA) return '';
    let resto = n;
    let saida = '';
    ROMANOS.forEach(([valor, letras]) => {
        while (resto >= valor) {
            saida += letras;
            resto -= valor;
        }
    });
    return saida;
}

// "XX" (ou "xx") para 20; só aceita o que `numeroParaRomano` escreve.
function romanoParaSeculo(texto) {
    const t = texto.trim().toUpperCase();
    if (!/^[IVXLC]+$/.test(t)) return NaN;
    for (let n = 1; n <= SECULO_MAXIMO_DATA_OBRA; n++) {
        if (numeroParaRomano(n) === t) return n;
    }
    return NaN;
}

// Século dado como número, texto numérico ou romano.
function seculoDe(valor) {
    if (typeof valor === 'string' && /^[ivxlcIVXLC\s]+$/.test(valor))
        return romanoParaSeculo(valor);
    return inteiro(valor);
}

// ─── Calendário ──────────────────────────────────────────────

function bissexto(ano, aC) {
    if (aC) return (ano - 1) % 4 === 0;
    if (ano < 1582) return ano % 4 === 0;
    return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function diasNoMes(ano, mes, aC) {
    if (mes === 2) return bissexto(ano, aC) ? 29 : 28;
    return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

// ─── Criar, ler e validar ────────────────────────────────────

function intervaloDe(nivel, numero, aC) {
    if (nivel === 'seculo') {
        return aC
            ? { de: -numero * 100, ate: -((numero - 1) * 100 + 1) }
            : { de: (numero - 1) * 100 + 1, ate: numero * 100 };
    }
    if (nivel === 'decada') {
        return aC ? { de: -(numero + 9), ate: -numero } : { de: numero, ate: numero + 9 };
    }
    return aC ? { de: -numero, ate: -numero } : { de: numero, ate: numero };
}

// Monta a data a partir do que a tela (ou um backup) entrega:
// `{ nivel, seculo | decada | ano, mes, dia, aC, aprox }`. Números podem vir
// como texto; o século também em romanos. Devolve `{ data }` com a forma
// completa (só as chaves do nível, `aC` e `aprox` sempre booleanos, `de` e
// `ate` calculados) ou `{ erro }` com um código de `MENSAGENS_ERRO_DATA_OBRA`.
export function criarDataObra(entrada) {
    if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
        return { erro: 'nivel-invalido' };
    }
    const nivel = entrada.nivel;
    if (!NIVEIS_DATA_OBRA.includes(nivel)) return { erro: 'nivel-invalido' };
    const aC = entrada.aC === true;
    const aprox = entrada.aprox === true;
    const marcas = { aC, aprox };

    if (nivel === 'seculo') {
        const seculo = seculoDe(entrada.seculo);
        if (!Number.isInteger(seculo) || seculo < 1 || seculo > SECULO_MAXIMO_DATA_OBRA) {
            return { erro: 'seculo-invalido' };
        }
        return { data: { nivel, seculo, ...marcas, ...intervaloDe(nivel, seculo, aC) } };
    }

    if (nivel === 'decada') {
        const decada = inteiro(entrada.decada);
        if (
            !Number.isInteger(decada) ||
            decada < 10 ||
            decada > ANO_MAXIMO_DATA_OBRA ||
            decada % 10 !== 0
        ) {
            return { erro: 'decada-invalida' };
        }
        return { data: { nivel, decada, ...marcas, ...intervaloDe(nivel, decada, aC) } };
    }

    const ano = inteiro(entrada.ano);
    if (!Number.isInteger(ano) || ano < 1 || ano > ANO_MAXIMO_DATA_OBRA) {
        return { erro: 'ano-invalido' };
    }
    const data = { nivel, ano };
    if (nivel !== 'ano') {
        const mes = inteiro(entrada.mes);
        if (!Number.isInteger(mes) || mes < 1 || mes > 12) return { erro: 'mes-invalido' };
        data.mes = mes;
        if (nivel === 'dia') {
            const dia = inteiro(entrada.dia);
            if (!Number.isInteger(dia) || dia < 1 || dia > diasNoMes(ano, mes, aC)) {
                return { erro: 'dia-invalido' };
            }
            data.dia = dia;
        }
    }
    return { data: { ...data, ...marcas, ...intervaloDe(nivel, ano, aC) } };
}

// A data normalizada, ou `null` quando o valor é vazio ou não vale. Aceita o
// que `criarDataObra` aceita (por isso lê também uma data já gravada, e
// recalcula `de` e `ate` em vez de confiar no que veio).
export function lerDataObra(valor) {
    const { data } = criarDataObra(valor);
    return data || null;
}

// '' quando a data vale; senão o código do erro.
export function validarDataObra(valor) {
    return criarDataObra(valor).erro || '';
}

// Identidade da data (nível, números, a.C. e aprox.), para agrupar e
// comparar. '' para data vazia ou inválida.
export function chaveDaDataObra(valor) {
    const d = lerDataObra(valor);
    if (!d) return '';
    const numero = d.seculo ?? d.decada ?? d.ano;
    return [d.nivel, numero, d.mes ?? 0, d.dia ?? 0, d.aC ? 1 : 0, d.aprox ? 1 : 0].join(':');
}

export function mesmaDataObra(a, b) {
    return chaveDaDataObra(a) === chaveDaDataObra(b);
}

// ─── Intervalo entre o começo e o fim ────────────────────────

// Ano com sinal vira posição numa reta contínua (sem ano zero).
const anoAstronomico = (ano) => (ano > 0 ? ano : ano + 1);
const posicao = (ano, mes, dia) => anoAstronomico(ano) * 10000 + mes * 100 + dia;

// O primeiro e o último dia que a data pode cobrir, como número comparável.
function limites(d) {
    const ano = d.aC ? -d.ano : d.ano;
    if (d.nivel === 'dia') {
        const p = posicao(ano, d.mes, d.dia);
        return { primeiro: p, ultimo: p };
    }
    if (d.nivel === 'mes') {
        return {
            primeiro: posicao(ano, d.mes, 1),
            ultimo: posicao(ano, d.mes, diasNoMes(d.ano, d.mes, d.aC)),
        };
    }
    return { primeiro: posicao(d.de, 1, 1), ultimo: posicao(d.ate, 12, 31) };
}

// '' quando o par vale; 'fim-antes-do-inicio' quando o fim só pode cair antes
// do começo. Basta uma das pontas faltar para valer (o fim é opcional). Datas
// que se sobrepõem valem: começo "1920" com fim "séc. XX" é um par certo.
export function validarIntervaloDaData(inicio, fim) {
    const a = lerDataObra(inicio);
    const b = lerDataObra(fim);
    if (!a || !b) return '';
    return limites(b).ultimo < limites(a).primeiro ? 'fim-antes-do-inicio' : '';
}

// O intervalo de anos do par: do começo do primeiro ao fim do último. Sem
// nenhuma ponta, `null`.
export function intervaloDeAnosDoPar(inicio, fim) {
    const a = lerDataObra(inicio);
    const b = lerDataObra(fim);
    if (!a && !b) return null;
    const pontas = [a, b].filter(Boolean);
    return {
        de: Math.min(...pontas.map((d) => d.de)),
        ate: Math.max(...pontas.map((d) => d.ate)),
    };
}

// ─── Texto ───────────────────────────────────────────────────

const doisDigitos = (n) => String(n).padStart(2, '0');

// "1922", "44 a.C.", "02/1922", "11/02/1922", "séc. XX", "década de 1920",
// com "aprox. " na frente quando é aproximada. '' para data vazia ou inválida.
export function formatarDataObra(valor) {
    const d = lerDataObra(valor);
    if (!d) return '';
    const sufixo = d.aC ? ' a.C.' : '';
    let corpo;
    if (d.nivel === 'seculo') corpo = `séc. ${numeroParaRomano(d.seculo)}${sufixo}`;
    else if (d.nivel === 'decada') corpo = `década de ${d.decada}${sufixo}`;
    else if (d.nivel === 'ano') corpo = `${d.ano}${sufixo}`;
    else if (d.nivel === 'mes') corpo = `${doisDigitos(d.mes)}/${d.ano}${sufixo}`;
    else corpo = `${doisDigitos(d.dia)}/${doisDigitos(d.mes)}/${d.ano}${sufixo}`;
    return d.aprox ? `aprox. ${corpo}` : corpo;
}

// "1920 até 1935"; só o começo mostra só ele; só o fim, "até 1935".
export function formatarIntervaloDataObra(inicio, fim) {
    const a = formatarDataObra(inicio);
    const b = formatarDataObra(fim);
    if (a && b) return `${a} até ${b}`;
    if (a) return a;
    return b ? `até ${b}` : '';
}

// ─── Ler a data de um texto ──────────────────────────────────

const MESES_POR_NOME = [
    ['janeiro', 'jan'],
    ['fevereiro', 'fev'],
    ['marco', 'mar'],
    ['abril', 'abr'],
    ['maio', 'mai'],
    ['junho', 'jun'],
    ['julho', 'jul'],
    ['agosto', 'ago'],
    ['setembro', 'set'],
    ['outubro', 'out'],
    ['novembro', 'nov'],
    ['dezembro', 'dez'],
];

// 1 a 12 para "fevereiro" ou "fev" (já sem acento nem caixa); 0 se não é mês.
function mesDoNome(nome) {
    const i = MESES_POR_NOME.findIndex((nomes) => nomes.includes(nome));
    return i + 1;
}

const PREFIXO_APROX = /^(aproximadamente|aprox\.?|cerca de|circa|ca\.|c\.|~)\s*/;
const SUFIXO_APROX = /\s*\(?\s*(aproximadamente|aprox\.?)\s*\)?$/;
const SUFIXO_AC = /(?:^|(?<=[\s\d.]))(antes de cristo|a\.?\s*c\.?|a\.?\s*e\.?\s*c\.?)$/;
const SUFIXO_DC = /(?:^|(?<=[\s\d.]))(depois de cristo|d\.?\s*c\.?|d\.?\s*e\.?\s*c\.?)$/;

// Lê a data escrita à mão, a mesma que `formatarDataObra` escreve, e também as
// formas de digitar mais comuns (sem acento, sem caixa, sem ponto):
//
//   1922, ano 1922, 1922 d.C., 44 a.C.
//   séc. XX, sec XX, século XX, século 20, 20º século, séc. V a.C.
//   década de 1920, década 1920, anos 1920, 1920s, década de 430 a.C.
//   02/1922, 2/1922, 1922-02, fevereiro de 1922, fev/1922
//   11/02/1922, 11-02-1922, 1922-02-11, 11 de fevereiro de 1922
//
// "aprox." (ou aproximadamente, circa, ca., c., ~) vale na frente ou atrás.
// "anos 20" e "20s" não valem (podem ser 1920 ou 2020): é preciso o ano inteiro.
// Intervalos ("1920 a 1935") não valem: o começo e o fim têm campos separados.
//
// Devolve `{ data }` com a data completa de `criarDataObra`, `{ data: null }`
// para texto vazio (quer dizer "sem data") ou `{ erro }`: `texto-invalido`
// quando não dá para entender, ou o código de `criarDataObra` quando entendeu
// a forma mas o valor não vale ("30/02/1922", "década de 1925").
export function lerTextoDataObra(texto) {
    if (texto === null || texto === undefined) return { data: null };
    let t = String(texto)
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    if (!t) return { data: null };

    let aprox = false;
    let aC = false;
    const prefixo = t.match(PREFIXO_APROX);
    if (prefixo) {
        aprox = true;
        t = t.slice(prefixo[0].length);
    }
    if (SUFIXO_APROX.test(t)) {
        aprox = true;
        t = t.replace(SUFIXO_APROX, '');
    }
    if (SUFIXO_AC.test(t)) {
        aC = true;
        t = t.replace(SUFIXO_AC, '').trim();
    } else if (SUFIXO_DC.test(t)) {
        t = t.replace(SUFIXO_DC, '').trim();
    }
    if (!t) return { erro: 'texto-invalido' };

    const criar = (dados) => criarDataObra({ ...dados, aC, aprox });
    let m;

    // Dia: 11/02/1922, 11-02-1922, 11.02.1922, 1922-02-11, 11 de fevereiro de 1922.
    if ((m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
        return criar({ nivel: 'dia', ano: m[1], mes: m[2], dia: m[3] });
    }
    if ((m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{1,4})$/))) {
        return criar({ nivel: 'dia', ano: m[3], mes: m[2], dia: m[1] });
    }
    if ((m = t.match(/^(\d{1,2})(?: de)? ([a-z]+)\.?(?: de)? (\d{1,4})$/))) {
        const mes = mesDoNome(m[2]);
        if (!mes) return { erro: 'texto-invalido' };
        return criar({ nivel: 'dia', ano: m[3], mes, dia: m[1] });
    }

    // Mês: 02/1922, 1922-02, fevereiro de 1922, fev/1922.
    if ((m = t.match(/^(\d{4})[-/.](\d{1,2})$/))) {
        return criar({ nivel: 'mes', ano: m[1], mes: m[2] });
    }
    if ((m = t.match(/^(\d{1,2})[-/.](\d{1,4})$/))) {
        return criar({ nivel: 'mes', ano: m[2], mes: m[1] });
    }
    if ((m = t.match(/^([a-z]+)\.?(?: de | ?[-/.] ?| )(\d{1,4})$/))) {
        const mes = mesDoNome(m[1]);
        if (mes) return criar({ nivel: 'mes', ano: m[2], mes });
    }

    // Século: séc. XX, século 20, 20º século.
    if ((m = t.match(/^(?:seculo|sec\.?) ?([ivxlc]+|\d{1,2})$/))) {
        return criar({ nivel: 'seculo', seculo: m[1] });
    }
    if ((m = t.match(/^(\d{1,2}) ?[ºo°]? ?(?:seculo|sec\.?)$/))) {
        return criar({ nivel: 'seculo', seculo: m[1] });
    }

    // Década: década de 1920, anos 1920, 1920s.
    if ((m = t.match(/^decada(?: de)? ?(\d{1,4})s?$/))) {
        return criar({ nivel: 'decada', decada: m[1] });
    }
    if ((m = t.match(/^(?:anos ?(\d{1,4})|(\d{1,4})s)$/))) {
        const ano = m[1] ?? m[2];
        if (ano.length < 3) return { erro: 'decada-invalida' };
        return criar({ nivel: 'decada', decada: ano });
    }

    // Ano: 1922, ano 1922.
    if ((m = t.match(/^(?:ano )?(\d+)$/))) {
        return criar({ nivel: 'ano', ano: m[1] });
    }
    return { erro: 'texto-invalido' };
}

// O que mudou entre as datas de antes e as de agora, no formato do pedido de
// "Corrigir obra" (`novo.dataObra` e `novo.dataObraAte`): só a ponta que mudou
// ganha chave, com a data nova ou `null` quando foi apagada. Ponta que ficou
// igual (mesma `chaveDaDataObra`) não entra, e o pedido diz "mantenha" para ela.
// É o que deixa o diálogo mexer só na ponta que o usuário mexeu: numa obra com
// duas datas diferentes nos textos, quem mexe só no "Até" não apaga nem
// iguala o começo de ninguém. `antes` e `depois`: `{ inicio, fim }`.
export function pedidoDeDatas(antes = {}, depois = {}) {
    const pedido = {};
    [
        [CAMPO_DATA_INICIO, 'inicio'],
        [CAMPO_DATA_FIM, 'fim'],
    ].forEach(([campo, ponta]) => {
        if (chaveDaDataObra(antes?.[ponta]) === chaveDaDataObra(depois?.[ponta])) return;
        pedido[campo] = lerDataObra(depois?.[ponta]);
    });
    return pedido;
}

// ─── Na entrada (Inter, Hiper e Referências) ─────────────────

// O começo e o fim da entrada, normalizados; `null` quando a chave falta ou
// não vale.
export function datasDaEntrada(entrada) {
    if (entrada === null || typeof entrada !== 'object') return { inicio: null, fim: null };
    return {
        inicio: lerDataObra(entrada[CAMPO_DATA_INICIO]),
        fim: lerDataObra(entrada[CAMPO_DATA_FIM]),
    };
}

// "chave do começo>chave do fim" da entrada ('' quando não tem nenhuma).
export function chaveDasDatasDaEntrada(entrada) {
    const { inicio, fim } = datasDaEntrada(entrada);
    const a = chaveDaDataObra(inicio);
    const b = chaveDaDataObra(fim);
    return a || b ? `${a}>${b}` : '';
}

// Grava a data na entrada, no lugar. Para cada ponta: `undefined` não mexe;
// `null` (ou uma data que não vale) tira a chave; uma data válida grava a
// forma normalizada. Entrada sem data não ganha chave nenhuma.
export function definirDatasDaEntrada(entrada, { inicio, fim } = {}) {
    [
        [CAMPO_DATA_INICIO, inicio],
        [CAMPO_DATA_FIM, fim],
    ].forEach(([chave, valor]) => {
        if (valor === undefined) return;
        const data = lerDataObra(valor);
        if (data) entrada[chave] = data;
        else delete entrada[chave];
    });
}

// O que a entrada tem hoje nas duas chaves, para o Desfazer devolver tudo
// como estava (inclusive a ausência de uma chave).
export function capturarDatasDaEntrada(entrada) {
    const copia = (v) => (v && typeof v === 'object' ? { ...v } : v);
    return {
        temInicio: CAMPO_DATA_INICIO in entrada,
        inicio: copia(entrada[CAMPO_DATA_INICIO]),
        temFim: CAMPO_DATA_FIM in entrada,
        fim: copia(entrada[CAMPO_DATA_FIM]),
    };
}

export function restaurarDatasDaEntrada(entrada, captura) {
    if (captura.temInicio) entrada[CAMPO_DATA_INICIO] = captura.inicio;
    else delete entrada[CAMPO_DATA_INICIO];
    if (captura.temFim) entrada[CAMPO_DATA_FIM] = captura.fim;
    else delete entrada[CAMPO_DATA_FIM];
}

// ─── Agrupar datas repetidas (sugestão e resumo da obra) ─────

// Recebe pares `{ inicio, fim }` (cada ponta pode faltar) e devolve os pares
// diferentes, normalizados, do mais usado ao menos usado. No empate, vem
// primeiro o par com as duas pontas (resume melhor a obra ou a pessoa), depois
// o de começo mais antigo e por fim o texto. Par sem nenhuma data não entra.
export function agruparDatasDaObra(pares) {
    const grupos = new Map();
    (pares || []).forEach((par) => {
        const inicio = lerDataObra(par?.inicio);
        const fim = lerDataObra(par?.fim);
        const chave = `${chaveDaDataObra(inicio)}>${chaveDaDataObra(fim)}`;
        if (chave === '>') return;
        if (!grupos.has(chave)) grupos.set(chave, { chave, inicio, fim, usos: 0 });
        grupos.get(chave).usos += 1;
    });
    return [...grupos.values()]
        .map((g) => ({ ...g, texto: formatarIntervaloDataObra(g.inicio, g.fim) }))
        .sort((a, b) => {
            const de = (g) => (g.inicio || g.fim).de;
            const pontas = (g) => (g.inicio && g.fim ? 2 : 1);
            return (
                b.usos - a.usos ||
                pontas(b) - pontas(a) ||
                de(a) - de(b) ||
                a.texto.localeCompare(b.texto, 'pt-BR')
            );
        });
}

// ─── Ano de referência e distância (Estatísticas e busca) ────

// O ano de referência da entrada (com sinal, sem ano zero) ou null: o `de` do
// começo da data, ou o do fim quando só ele existe. Numa Pessoa pública é o
// nascimento. Data aproximada conta como a data dada. É a regra única das
// barras de "Obras citadas" (antes "Datas das obras") e dos filtros `dataobra:` e `datareferencia:`.
export function anoDeReferenciaDaEntrada(entrada) {
    const { inicio, fim } = datasDaEntrada(entrada);
    const ref = inicio || fim;
    return ref ? ref.de : null;
}

// Anos entre a obra e o texto (ano do texto menos ano da obra), sem ano zero:
// de 1 a.C. (-1) a 1 d.C. (1) passa 1 ano, e não 2. Depois do texto dá negativo.
export function distanciaEmAnos(anoDoTexto, anoDaObra) {
    const bruto = anoDoTexto - anoDaObra;
    return anoDaObra < 0 && anoDoTexto > 0 ? bruto - 1 : bruto;
}
